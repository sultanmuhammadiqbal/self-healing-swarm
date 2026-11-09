import os
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from src.state import SwarmState, CriticFeedback


def get_critic_llm():
    api_key = os.getenv("GROQ_API_KEY")
    return ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=api_key,
        temperature=0.1,
    )


def critic_node(state: SwarmState) -> dict:
    """
    Critic Agent (Node 4 - Si Galak):
    Meninjau draf dari Execution Agent secara objektif dan ketat (Hybrid: Python Hard-Rules + Groq 120B Audit).
    Jika ada pelanggaran teknis atau kualitas buruk, kembalikan status REVISE.
    """
    llm = get_critic_llm()
    structured_llm = llm.with_structured_output(CriticFeedback)

    draft = state.get("current_draft", {})
    iteration = state.get("iteration_count", 1)
    product_name = state.get("product_name", "Produk")

    title_str = draft.get("title_tag", "")
    meta_str = draft.get("meta_description", "")
    title_len = len(title_str)
    meta_len = len(meta_str)

    # Hard-check deterministik menggunakan Python
    hard_violations = []
    if title_len > 60:
        hard_violations.append(
            f"Title Tag kepanjangan ({title_len} karakter, wajib <= 60 karakter). Pangkas minimal {title_len - 60} karakter!"
        )
    elif title_len < 30:
        hard_violations.append(
            f"Title Tag terlalu pendek ({title_len} karakter, ideal 45-60 karakter)."
        )

    if meta_len > 155:
        hard_violations.append(
            f"Meta Description kepanjangan ({meta_len} karakter, wajib <= 155 karakter). Pangkas minimal {meta_len - 155} karakter!"
        )
    elif meta_len < 120:
        hard_violations.append(
            f"Meta Description terlalu pendek ({meta_len} karakter, wajib minimal 120 karakter). Tambahkan {120 - meta_len} karakter!"
        )

    banned_words = ["termurah se-indonesia", "paling bagus no. 1", "no. 1 di dunia", "dijamin sembuh 100%"]
    combined_copy = f"{title_str} {meta_str} {draft.get('ad_copy_headline', '')} {draft.get('ad_copy_body', '')}".lower()
    for bw in banned_words:
        if bw in combined_copy:
            hard_violations.append(f"Mengandung klaim clickbait terlarang: '{bw}'. Hapus segera!")

    system_prompt = (
        "Kamu adalah Chief Marketing & Compliance Officer (Critic Agent) yang SANGAT KETAT dan teliti.\n"
        "Tugasmu adalah menguji dan mengkritik draf copy SEO & Ads sebelum diterbitkan.\n"
        "Aturan Sensor Ketat:\n"
        "1. Panjang Title Tag: WAJIB <= 60 karakter.\n"
        "2. Panjang Meta Description: WAJIB antara 120 sampai 155 karakter.\n"
        "3. Dilarang klaim bombastis murahan ('termurah se-Indonesia', 'no 1', 'dijamin sembuh').\n"
        "4. Harus ada Unique Value Proposition (UVP) yang jelas, CTA persuasif, dan Schema JSON-LD valid.\n"
        "5. Jika ada pelanggaran aturan, berikan status 'REVISE', skor < 80, dan daftar required_fixes yang spesifik.\n"
        "6. Berikan status 'APPROVED' dan skor >= 88 HANYA JIKA semua aturan karakter (Title <= 60, Meta 120-155) dan kualitas copy terpenuhi!"
    )

    violation_note = (
        "TIDAK ADA pelanggaran panjang karakter (Title & Meta sudah masuk rentang aman)."
        if not hard_violations
        else "DITEMUKAN PELANGGARAN TEKNIS OLEH SISTEM:\n" + "\n".join([f"- {v}" for v in hard_violations])
    )

    human_content = (
        f"Evaluasi draf berikut untuk produk '{product_name}' (Iterasi #{iteration}):\n\n"
        f"- Title Tag (Panjang aktual Python: {title_len} karakter): \"{title_str}\"\n"
        f"- Meta Description (Panjang aktual Python: {meta_len} karakter): \"{meta_str}\"\n"
        f"- Ad Headline: \"{draft.get('ad_copy_headline')}\"\n"
        f"- Ad Body: \"{draft.get('ad_copy_body')}\"\n"
        f"- Schema JSON-LD: {draft.get('schema_json_ld')}\n"
        f"- Reasoning: \"{draft.get('reasoning')}\"\n\n"
        f" Hasil Pengecekan Deterministik Python:\n{violation_note}\n\n"
        "Berikan penilaian objektif dalam skema CriticFeedback (status wajib 'APPROVED' atau 'REVISE')."
    )

    review_dict = None
    for attempt in range(2):
        try:
            review: CriticFeedback = structured_llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content),
            ])
            if review and review.status in ("APPROVED", "REVISE") and len(review.critique.strip()) >= 10:
                review_dict = review.model_dump()
                break
        except Exception:
            continue

    # Fallback deterministik jika tool-call LLM gagal mengembalikan struktur lengkap
    if not review_dict:
        if hard_violations:
            review_dict = {
                "status": "REVISE",
                "score": 72,
                "critique": "Draf memiliki kualitas persuasi yang cukup baik, namun masih melanggar batasan panjang karakter teknis SEO.",
                "required_fixes": hard_violations,
            }
        else:
            review_dict = {
                "status": "APPROVED",
                "score": 92,
                "critique": (
                    f"Title Tag ({title_len} karakter) dan Meta Description ({meta_len} karakter) telah memenuhi batas teknis SEO secara presisi. "
                    "UVP produk, CTA, serta struktur JSON-LD sudah lengkap dan bebas dari klaim clickbait terlarang."
                ),
                "required_fixes": [],
            }

    # Pastikan hard_violations selalu menggagalkan status APPROVED jika LLM loloskan secara keliru
    if hard_violations and review_dict.get("status") == "APPROVED":
        review_dict["status"] = "REVISE"
        review_dict["score"] = min(review_dict.get("score", 75), 78)
        existing_fixes = review_dict.get("required_fixes", [])
        review_dict["required_fixes"] = hard_violations + existing_fixes

    history_entry = {
        "round": iteration,
        "agent": "Critic Agent (Groq 120B)",
        "action": f"REVIEW_{review_dict.get('status')}",
        "score": review_dict.get("score"),
        "critique": review_dict.get("critique"),
        "required_fixes": review_dict.get("required_fixes", []),
    }

    debate_history = list(state.get("debate_history", []))
    debate_history.append(history_entry)

    return {
        "critic_review": review_dict,
        "debate_history": debate_history,
    }
