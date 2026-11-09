import json
import os
from typing import Tuple
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from src.state import SwarmState, ProposedSolution


def invoke_execution_with_failover(messages) -> Tuple[ProposedSolution, str]:
    """
    Multi-LLM Self-Healing Router untuk Execution Agent:
    1. Gemini 2.5 Flash (Primary)
    2. Gemini 2.0 Flash (Secondary)
    3. Groq GPT-OSS 120B / 20B (Always-On LPU Failover jika kuota harian Gemini 20 RPD habis)
    """
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    candidates = [
        ("Gemini 2.5 Flash", lambda: ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_key, api_version="v1beta", temperature=0.5, max_retries=1)),
        ("Gemini 2.0 Flash", lambda: ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key, api_version="v1beta", temperature=0.5, max_retries=1)),
        ("Groq 120B Failover", lambda: ChatGroq(model="openai/gpt-oss-120b", api_key=groq_key, temperature=0.4)),
        ("Groq 20B Failover", lambda: ChatGroq(model="openai/gpt-oss-20b", api_key=groq_key, temperature=0.4)),
    ]

    last_err = None
    for label, factory in candidates:
        try:
            llm = factory()
            structured_llm = llm.with_structured_output(ProposedSolution)
            res = structured_llm.invoke(messages)
            if res and res.title_tag and res.meta_description:
                return res, label
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"All Execution LLM providers failed: {last_err}")


def execution_node(state: SwarmState) -> dict:
    """
    Execution Agent (Node 3):
    Membuat draf perbaikan SEO, Copywriting Ads, & JSON-LD Schema berdasarkan diagnosa
    atau revisi tajam dari Critic Agent.
    """
    iteration = state.get("iteration_count", 0) + 1
    previous_draft = state.get("current_draft")
    critic_review = state.get("critic_review")
    issue_type = state.get("issue_type", "CTR_DROP")
    product_name = state.get("product_name", "Produk")
    diagnostic_data = state.get("diagnostic_data", {})

    system_prompt = (
        "Kamu adalah Senior SEO & Performance Marketing Copywriter (Execution Agent).\n"
        "Tugasmu adalah merancang Title Tag, Meta Description, Ad Copy, dan JSON-LD Schema yang memaksimalkan CTR & konversi.\n"
        "ATURAN TEKNIS MUTLAK (JANGAN DILANGGAR):\n"
        "1. Title Tag: WAJIB antara 45 - 57 karakter (Batas keras maksimal 60 karakter termasuk spasi!).\n"
        "2. Meta Description: WAJIB antara 125 - 148 karakter (Batas keras 120 - 155 karakter termasuk spasi!).\n"
        "   - PENTING: Hitung karakter dengan teliti! Jangan lebih dari 150 karakter agar tidak terpotong!\n"
        "3. Hindari klaim bombastis terlarang ('termurah se-Indonesia', 'no. 1', 'dijamin 100% sembuh').\n"
        "4. Cantumkan Unique Value Proposition (UVP) nyata dari produk (seperti Dual Motor, Garansi, Harga Promo) dan CTA jelas.\n"
        "5. Buat snippet JSON-LD Product Schema yang valid."
    )

    if previous_draft is not None and critic_review is not None:
        prev_title = previous_draft.get("title_tag", "")
        prev_meta = previous_draft.get("meta_description", "")
        fixes = critic_review.get("required_fixes", [])
        fixes_text = "\n".join([f"- {fix}" for fix in fixes]) if fixes else "- Pastikan panjang karakter sesuai standar (Title <= 60, Meta 120-155)."

        human_content = (
            f"MODE REVISI (Putaran #{iteration}) — Draf sebelumnya DITOLAK oleh Critic Agent (Skor: {critic_review.get('score')}/100).\n\n"
            f"Fakta Pengukuran Karakter Draf Sebelumnya (Dihitung oleh Python `len()`):\n"
            f"- Title Tag sebelumnya ({len(prev_title)} karakter, batas <= 60): \"{prev_title}\"\n"
            f"- Meta Description sebelumnya ({len(prev_meta)} karakter, batas wajib 120-155): \"{prev_meta}\"\n\n"
            f"Kritik Evaluator:\n{critic_review.get('critique')}\n\n"
            f"Instruksi Perbaikan Wajib:\n{fixes_text}\n\n"
            f"Draf lengkap sebelumnya:\n{json.dumps(previous_draft, indent=2, ensure_ascii=False)}\n\n"
            "Perbaiki sekarang! Jika Meta Description sebelumnya > 155 karakter, PANGKAS kalimatnya agar tepat di kisaran 130-145 karakter!"
        )
    else:
        human_content = (
            f"Produk: {product_name}\n"
            f"Target URL: {state.get('target_url')}\n"
            f"Masalah: {issue_type}\n"
            f"Metric: {json.dumps(state.get('metric_summary', {}), ensure_ascii=False)}\n"
            f"Hasil Diagnosa Halaman Live:\n{json.dumps(diagnostic_data, indent=2, ensure_ascii=False)}\n\n"
            "Buat draf solusi pertama yang presisi (Title 45-57 karakter, Meta Description 128-145 karakter, Ad Copy persuasif, & JSON-LD Schema)."
        )

    response, model_used = invoke_execution_with_failover([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ])

    solution_dict = response.model_dump()
    history_entry = {
        "round": iteration,
        "agent": f"Execution Agent ({model_used})",
        "action": "SUBMIT_DRAFT",
        "draft": solution_dict,
        "title_length": len(solution_dict.get("title_tag", "")),
        "meta_length": len(solution_dict.get("meta_description", "")),
    }

    debate_history = list(state.get("debate_history", []))
    debate_history.append(history_entry)

    return {
        "current_draft": solution_dict,
        "iteration_count": iteration,
        "debate_history": debate_history,
        "workflow_status": "IN_PROGRESS",
    }
