import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.graph import create_swarm_graph
from src.state import SwarmState
from src.agents.watcher import load_monitoring_records, parse_percentage
from src.agents.writer import (
    fetch_all_audit_logs,
    approve_and_push_run,
    get_supabase_headers,
)

load_dotenv()

app = FastAPI(
    title="The Self-Healing Ad & SEO Swarm API",
    description="Production Cloud Backend (LangGraph DAG + Groq 120B + Gemini 2.5 + Supabase + Sheets)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunSwarmRequest(BaseModel):
    target_url: Optional[str] = ""
    product_name: Optional[str] = ""
    max_iterations: Optional[int] = 3


class ApproveRunRequest(BaseModel):
    run_id: str


def format_monitored_products():
    raw_records = load_monitoring_records()
    formatted = []
    for r in raw_records:
        prev = parse_percentage(r.get("previous_ctr", 0))
        curr = parse_percentage(r.get("current_ctr", 0))
        drop_pct = ((curr - prev) / prev) * 100 if prev > 0 else 0.0
        status = str(r.get("status", "ACTIVE")).upper()
        is_anomaly = drop_pct <= -30.0 or status == "DISAPPROVED"
        formatted.append({
            "product_name": str(r.get("product_name", "")),
            "url": str(r.get("url", "")),
            "previous_ctr": f"{prev}%",
            "current_ctr": f"{curr}%",
            "impressions": str(r.get("impressions", "0")),
            "status": status,
            "target_keyword": str(r.get("target_keyword", "")),
            "drop_percentage": f"{drop_pct:.1f}%",
            "is_anomaly": is_anomaly,
        })
    return formatted


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "self-healing-swarm-api",
        "version": "2.0.0",
        "integrations": {
            "supabase_cloud": get_supabase_headers() is not None,
            "google_apps_script_webhook": bool(os.getenv("GOOGLE_APPS_SCRIPT_WEBHOOK_URL")),
            "google_service_account": os.path.exists(
                os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
            ),
            "discord_webhook": bool(os.getenv("DISCORD_WEBHOOK_URL")),
            "telegram_bot": bool(os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID")),
        },
    }


@app.get("/logs")
def get_swarm_logs():
    logs = fetch_all_audit_logs()
    monitored = format_monitored_products()
    return {
        "logs": logs,
        "monitoredProducts": monitored,
        "engine": {
            "orchestrator": "LangGraph StateGraph v2.0 (Cloud Ready)",
            "watcherModel": "Groq openai/gpt-oss-120b",
            "diagnosticModel": "Jina Reader + HTML DOM + Gemini 2.5 Flash",
            "executionModel": "Gemini 2.5 Flash (Multi-LLM Failover)",
            "criticModel": "Groq openai/gpt-oss-120b + Python Hard-Guard",
        },
    }


@app.post("/run-swarm")
def execute_swarm(req: RunSwarmRequest):
    try:
        initial_state: SwarmState = {
            "product_name": req.product_name or "",
            "target_url": (req.target_url or "").strip(),
            "issue_type": "",
            "metric_summary": {},
            "diagnostic_data": None,
            "current_draft": None,
            "critic_review": None,
            "iteration_count": 0,
            "max_iterations": req.max_iterations or 3,
            "debate_history": [],
            "workflow_status": "STARTING",
        }

        graph = create_swarm_graph()
        final_state = graph.invoke(initial_state)

        logs = fetch_all_audit_logs()
        monitored = format_monitored_products()

        return {
            "success": True,
            "workflow_status": final_state.get("workflow_status"),
            "latestRun": logs[0] if logs else None,
            "logs": logs,
            "monitoredProducts": monitored,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/approve")
def approve_run(req: ApproveRunRequest):
    if not req.run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    result = approve_and_push_run(req.run_id)
    logs = fetch_all_audit_logs()
    return {
        **result,
        "logs": logs,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)
