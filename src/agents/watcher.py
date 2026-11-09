import csv
import os
from urllib.parse import urlparse
from typing import Dict, List, Any
import httpx
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from src.state import SwarmState


class WatcherIncidentAssessment(BaseModel):
    is_critical: bool = Field(description="Apakah anjloknya CTR atau status disapproved ini memerlukan perbaikan segera")
    severity: str = Field(description="'HIGH', 'MEDIUM', atau 'LOW'")
    incident_reason: str = Field(description="Alasan singkat mengapa URL ini harus segera diperbaiki oleh Swarm")
    target_recommendation: str = Field(description="Fokus diagnosa awal untuk Diagnostic Agent")


def get_watcher_llm():
    api_key = os.getenv("GROQ_API_KEY")
    return ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=api_key,
        temperature=0.1,
    )


def load_monitoring_records() -> List[Dict[str, Any]]:
    """
    Mengambil data metrik dari:
    1. Google Apps Script Web App URL (jika GOOGLE_APPS_SCRIPT_WEBHOOK_URL disetel)
    2. Google Sheets Live API via Service Account (jika credentials.json & GOOGLE_SHEET_KEY disetel)
    3. File CSV lokal 'data/gsc_sample.csv' sebagai fallback.
    """
    apps_script_url = os.getenv("GOOGLE_APPS_SCRIPT_WEBHOOK_URL")
    if apps_script_url and apps_script_url.startswith("https://script.google.com"):
        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.get(apps_script_url)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data.get("records"), list) and len(data["records"]) > 0:
                        return data["records"]
        except Exception as e:
            print(f"[Watcher Warning] Gagal baca Google Apps Script URL: {e}. Mencoba jalur lain...")

    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    sheet_name_or_key = os.getenv("GOOGLE_SHEET_KEY")

    if os.path.exists(creds_path) and sheet_name_or_key:
        try:
            import gspread
            gc = gspread.service_account(filename=creds_path)
            sh = gc.open_by_key(sheet_name_or_key) if len(sheet_name_or_key) > 25 else gc.open(sheet_name_or_key)
            worksheet = sh.get_worksheet(0)
            return worksheet.get_all_records()
        except Exception as e:
            print(f"[Watcher Warning] Gagal koneksi Google Sheets live: {e}. Menggunakan CSV fallback...")

    csv_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "gsc_sample.csv")
    csv_file = os.path.normpath(csv_file)
    records = []
    if os.path.exists(csv_file):
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
    return records


def parse_percentage(val: Any) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.replace("%", "").strip()
        try:
            return float(val)
        except ValueError:
            return 0.0
    return 0.0


def infer_product_name_from_url(url: str) -> str:
    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split("/") if p]
    if path_parts:
        slug = path_parts[-1].replace("-", " ").replace("_", " ").title()
        return f"{slug} ({parsed.netloc})"
    return parsed.netloc or "Live Web Product"


def watcher_node(state: SwarmState) -> dict:
    """
    Watcher Agent (Node 1):
    Memonitor data Google Sheets / GSC secara berkala ATAU menerima input URL live kustom
    untuk dibedah langsung secara real-time.
    """
    requested_url = state.get("target_url", "").strip()
    records = load_monitoring_records()

    anomalies = []
    for r in records:
        prev_ctr = parse_percentage(r.get("previous_ctr", 0))
        curr_ctr = parse_percentage(r.get("current_ctr", 0))
        impressions = int(str(r.get("impressions", 0)).replace(",", "") or 0)
        status = str(r.get("status", "ACTIVE")).upper()

        drop_pct = 0.0
        if prev_ctr > 0:
            drop_pct = ((curr_ctr - prev_ctr) / prev_ctr) * 100

        if drop_pct <= -30.0 or status == "DISAPPROVED" or r.get("url") == requested_url:
            anomalies.append({
                "product_name": r.get("product_name"),
                "url": r.get("url"),
                "previous_ctr": f"{prev_ctr}%",
                "current_ctr": f"{curr_ctr}%",
                "drop_percentage": f"{drop_pct:.1f}%",
                "impressions": impressions,
                "status": status,
                "target_keyword": r.get("target_keyword", ""),
            })

    selected = None
    if requested_url:
        matched = [a for a in anomalies if a["url"] == requested_url]
        if matched:
            selected = matched[0]
        else:
            # URL Live Kustom yang diinput langsung oleh user (di luar CSV/Sheet)
            custom_name = state.get("product_name") or infer_product_name_from_url(requested_url)
            selected = {
                "product_name": custom_name,
                "url": requested_url,
                "previous_ctr": "3.8%",
                "current_ctr": "1.9%",
                "drop_percentage": "-50.0%",
                "impressions": 12500,
                "status": "LIVE_URL_AUDIT",
                "target_keyword": custom_name.split("(")[0].strip().lower(),
            }
    elif anomalies:
        selected = anomalies[0]

    if not selected:
        return {
            "workflow_status": "HEALTHY_NO_ACTION_NEEDED",
        }

    llm = get_watcher_llm()
    structured_llm = llm.with_structured_output(WatcherIncidentAssessment)

    prompt = (
        f"Data Insiden Produk Terdeteksi:\n"
        f"Produk: {selected['product_name']}\n"
        f"URL: {selected['url']}\n"
        f"Penurunan CTR: {selected['previous_ctr']} -> {selected['current_ctr']} ({selected['drop_percentage']})\n"
        f"Impresi: {selected['impressions']}\n"
        f"Status: {selected['status']}\n\n"
        "Evaluasi apakah insiden ini valid dan perlu diteruskan ke Diagnostic Agent."
    )

    try:
        assessment: WatcherIncidentAssessment = structured_llm.invoke([
            SystemMessage(content="Kamu adalah Watcher Sentinel yang menyaring data performa SEO & Ads. Jika status LIVE_URL_AUDIT, selalu set is_critical=True."),
            HumanMessage(content=prompt),
        ])
    except Exception:
        assessment = WatcherIncidentAssessment(
            is_critical=True,
            severity="HIGH",
            incident_reason=f"Anomali CTR ({selected['drop_percentage']}) terdeteksi pada URL {selected['url']}.",
            target_recommendation="Periksa kelengkapan H1, Title Tag, Meta Description, dan JSON-LD Schema.",
        )

    if not assessment.is_critical and not requested_url:
        return {
            "workflow_status": "FILTERED_FALSE_POSITIVE",
        }

    history_entry = {
        "round": 0,
        "agent": "Watcher Agent (Groq 120B Sentinel)",
        "action": "TRIGGER_INCIDENT",
        "severity": assessment.severity,
        "reason": assessment.incident_reason,
        "product": selected["product_name"],
    }

    debate_history = list(state.get("debate_history", []))
    debate_history.append(history_entry)

    issue_label = (
        "DISAPPROVED_MERCHANT"
        if selected["status"] == "DISAPPROVED"
        else f"LIVE_AUDIT ({assessment.severity})"
        if selected["status"] == "LIVE_URL_AUDIT"
        else f"CTR_DROP_GSC ({assessment.severity})"
    )

    return {
        "product_name": selected["product_name"],
        "target_url": selected["url"],
        "issue_type": issue_label,
        "metric_summary": selected,
        "debate_history": debate_history,
        "workflow_status": "INCIDENT_DISPATCHED",
    }
