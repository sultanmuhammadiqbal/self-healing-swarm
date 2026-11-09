import json
import os
from typing import Dict, Any, Tuple
import httpx
from bs4 import BeautifulSoup
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from src.state import SwarmState, DiagnosticResult

# Simulasi halaman live untuk domain demo tokofurnitur.id agar analisa on-page realistis
DEMO_PAGES_SNAPSHOT: Dict[str, Dict[str, Any]] = {
    "https://tokofurnitur.id/products/ergonomic-standing-desk-pro": {
        "raw_title": "Beli Meja Kantor Online Termurah Paling Bagus No. 1 Se-Indonesia",
        "raw_h1": "Meja Kantor Keren Banget",
        "raw_description": "Meja kerja bagus dan murah meriah untuk kamu yang butuh meja.",
        "schema_json_ld": None,
        "markdown": (
            "# H1: Meja Kantor Keren Banget\n"
            "**Title Tag:** Beli Meja Kantor Online Termurah Paling Bagus No. 1 Se-Indonesia (64 chars)\n"
            "**Meta Description:** Meja kerja bagus dan murah meriah untuk kamu yang butuh meja. (61 chars)\n"
            "**Schema JSON-LD:** TIDAK DITEMUKAN (Missing Product Schema)\n\n"
            "## Informasi Produk di Halaman:\n"
            "- Nama Produk: Ergonomic Electric Standing Desk Pro\n"
            "- Harga Promo: Rp 3.299.000 (Harga Normal: Rp 4.500.000)\n"
            "- Spesifikasi di Body: Dual Motor Silent (<45dB), Kapasitas Beban 120kg, "
            "Memory Preset 4 Ketinggian (72cm - 120cm), Garansi Resmi Motor 5 Tahun, Free Ongkir Jabodetabek.\n"
            "- Masalah Halaman Saat Ini: Title tag memakai klaim clickbait 'Termurah Paling Bagus No. 1' dan "
            "tidak memuat keyword 'meja kerja berdiri ergonomis dual motor'. Meta description hanya 61 karakter "
            "dan tidak menyebut fitur Dual Motor, Garansi 5 Tahun, maupun Harga Promo. Tidak ada JSON-LD Product Schema."
        ),
    },
    "https://tokofurnitur.id/products/smart-monitor-arm": {
        "raw_title": "Jual Bracket Monitor Murah Terbaik",
        "raw_h1": "Stand Monitor Meja",
        "raw_description": "Jual bracket monitor murah untuk meja kantor anda.",
        "schema_json_ld": None,
        "markdown": (
            "# H1: Stand Monitor Meja\n"
            "**Title Tag:** Jual Bracket Monitor Murah Terbaik (34 chars)\n"
            "**Meta Description:** Jual bracket monitor murah untuk meja kantor anda. (50 chars)\n"
            "**Schema JSON-LD:** TIDAK DITEMUKAN\n\n"
            "## Informasi Produk di Halaman:\n"
            "- Nama Produk: Smart Monitor Arm Heavy Duty Gas Spring\n"
            "- Harga Promo: Rp 489.000\n"
            "- Spesifikasi: Gas Spring Mechanical, Support 17-34 inch (beban 12kg), VESA 75x75 & 100x100, "
            "Full Motion 360 derajat, Garansi 3 Tahun."
        ),
    },
    "https://tokofurnitur.id/products/standing-mat": {
        "raw_title": "Karpet Lantai Paling Murah Dijamin Sembuh Pegal 100% Ampuh!",
        "raw_h1": "Karpet Ajaib Anti Pegal",
        "raw_description": "Beli karpet anti pegal paling murah dijamin sembuh sakit kaki dan pinggang.",
        "schema_json_ld": None,
        "markdown": (
            "# H1: Karpet Ajaib Anti Pegal\n"
            "**Title Tag:** Karpet Lantai Paling Murah Dijamin Sembuh Pegal 100% Ampuh! (59 chars)\n"
            "**Meta Description:** Beli karpet anti pegal paling murah dijamin sembuh sakit kaki dan pinggang. (75 chars)\n"
            "**Schema JSON-LD:** TIDAK DITEMUKAN\n\n"
            "## Informasi Produk di Halaman:\n"
            "- Nama Produk: Anti-Fatigue Standing Mat High Density Polyurethane\n"
            "- Harga: Rp 349.000\n"
            "- Spesifikasi: Ketebalan 20mm High-Density Ergonomic Foam, Beveled Edge anti tersandung, "
            "Non-slip bottom, garansi 2 tahun.\n"
            "- Catatan Iklan: Disapproved di Merchant Center karena klaim medis berlebihan ('Dijamin Sembuh 100%')."
        ),
    },
}


def fetch_page_content(url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Scrape live URL menggunakan Jina Reader (r.jina.ai) dengan fallback direct HTTP request
    dan snapshot simulasi untuk domain demo.
    Mengembalikan (konten_teks_markdown, metadata_mentah).
    """
    raw_metadata = {
        "url": url,
        "scraped_via": "unknown",
        "status_code": 0,
        "raw_title": "",
        "raw_description": "",
        "schema_found": False,
    }

    # 0. Cek apakah URL adalah domain demo simulasi
    if url in DEMO_PAGES_SNAPSHOT:
        snap = DEMO_PAGES_SNAPSHOT[url]
        raw_metadata["scraped_via"] = "live_snapshot_simulator"
        raw_metadata["status_code"] = 200
        raw_metadata["raw_title"] = snap["raw_title"]
        raw_metadata["raw_description"] = snap["raw_description"]
        raw_metadata["schema_found"] = bool(snap["schema_json_ld"])
        return snap["markdown"], raw_metadata

    if not url.startswith("http://") and not url.startswith("https://"):
        return (
            f"# Mock Product Content for {url}\n"
            "Produk: Meja Kantor Biasa Tanpa Merk\n"
            "Harga: Rp 3.299.000\n"
            "Deskripsi: Meja kerja bagus dan murah meriah.",
            raw_metadata,
        )

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }

    direct_html_header = ""
    # 1. Ekstrak eksak H1, Title, Meta Description, & JSON-LD langsung dari HTML DOM (BeautifulSoup)
    try:
        with httpx.Client(timeout=12.0, follow_redirects=True, headers=headers) as client:
            resp = client.get(url)
            raw_metadata["status_code"] = resp.status_code
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                meta_desc = ""
                meta_tag = (
                    soup.find("meta", attrs={"name": "description"})
                    or soup.find("meta", attrs={"property": "og:description"})
                )
                if meta_tag and meta_tag.get("content"):
                    meta_desc = str(meta_tag["content"]).strip()

                h1_text = ""
                h1_tag = soup.find("h1")
                if h1_tag:
                    h1_text = h1_tag.get_text(" ", strip=True)

                schema_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
                raw_metadata["schema_found"] = len(schema_scripts) > 0
                raw_metadata["raw_title"] = title
                raw_metadata["raw_h1"] = h1_text
                raw_metadata["raw_description"] = meta_desc
                raw_metadata["scraped_via"] = "direct_html_dom"

                direct_html_header = (
                    f"=== DOM ON-PAGE SEO TAGS (LIVE HTML) ===\n"
                    f"- Exact <title> ({len(title)} chars): {title or '[KOSONG]'}\n"
                    f"- Exact <h1>: {h1_text or '[TIDAK ADA H1]'}\n"
                    f"- Exact <meta description> ({len(meta_desc)} chars): {meta_desc or '[KOSONG]'}\n"
                    f"- Schema JSON-LD Terdeteksi: {'YA (' + str(len(schema_scripts)) + ' block)' if schema_scripts else 'TIDAK DITEMUKAN'}\n"
                    f"========================================\n\n"
                )
    except Exception as e:
        raw_metadata["direct_error"] = str(e)

    # 2. Ambil bersih Markdown konten halaman via Jina Reader API (r.jina.ai)
    jina_url = f"https://r.jina.ai/{url}"
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(jina_url, headers={"Accept": "application/json", **headers})
            if resp.status_code == 200:
                data = resp.json()
                page_data = data.get("data", {})
                content = page_data.get("content", "")
                raw_metadata["scraped_via"] = (
                    "jina_reader + html_dom" if direct_html_header else "jina_reader"
                )
                raw_metadata["status_code"] = 200
                if not raw_metadata["raw_title"]:
                    raw_metadata["raw_title"] = page_data.get("title", "")
                if not raw_metadata["raw_description"]:
                    raw_metadata["raw_description"] = page_data.get("description", "")
                if content:
                    return f"{direct_html_header}{content[:7500]}", raw_metadata
    except Exception as e:
        raw_metadata["jina_error"] = str(e)

    # 3. Jika Jina Reader gagal tapi direct HTML berhasil, gunakan teks body dari BeautifulSoup
    if direct_html_header:
        try:
            with httpx.Client(timeout=10.0, follow_redirects=True, headers=headers) as client:
                resp = client.get(url)
                soup = BeautifulSoup(resp.text, "html.parser")
                body_text = soup.get_text(separator=" ", strip=True)
                return f"{direct_html_header}{body_text[:6000]}", raw_metadata
        except Exception:
            return direct_html_header, raw_metadata

    return (
        f"# Halaman ({url}) - Konten Ekstraksi Fallback\n"
        "Produk mengalami penurunan performa karena ketidaksesuaian search intent dan minimnya UVP pada metadata.",
        raw_metadata,
    )


def invoke_diagnostic_with_failover(messages) -> Tuple[DiagnosticResult, str]:
    """
    Multi-LLM Self-Healing Router:
    Mencoba Gemini 2.5 Flash terlebih dahulu. Jika terkena limit kuota harian (429 Free Tier),
    otomatis failover ke Gemini 2.0 Flash atau Groq 120B LPU tanpa henti!
    """
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    candidates = [
        ("Gemini 2.5 Flash", lambda: ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_key, api_version="v1beta", temperature=0.2, max_retries=1)),
        ("Gemini 2.0 Flash", lambda: ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key, api_version="v1beta", temperature=0.2, max_retries=1)),
        ("Groq 120B Failover", lambda: ChatGroq(model="openai/gpt-oss-120b", api_key=groq_key, temperature=0.2)),
    ]

    last_err = None
    for label, factory in candidates:
        try:
            llm = factory()
            structured_llm = llm.with_structured_output(DiagnosticResult)
            res = structured_llm.invoke(messages)
            if res:
                return res, label
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"All Diagnostic LLM providers failed: {last_err}")


def diagnostic_node(state: SwarmState) -> dict:
    """
    Diagnostic Agent (Node 2):
    Membuka URL live produk, mengambil data HTML/Markdown, dan menganalisa
    kelemahan on-page SEO yang menyebabkan CTR anjlok atau disapproved.
    """
    target_url = state.get("target_url", "")
    product_name = state.get("product_name", "Produk")
    issue_type = state.get("issue_type", "CTR_DROP")
    metric_summary = state.get("metric_summary", {})

    # 1. Scrape live data
    content, metadata = fetch_page_content(target_url)

    system_prompt = (
        "Kamu adalah Senior Technical SEO & Conversion Auditor (Diagnostic Agent).\n"
        "Tugasmu adalah menganalisa hasil scraping halaman live dan mendeteksi akar masalah (root cause)\n"
        "mengapa CTR halaman ini anjlok atau iklan ditolak (disapproved).\n"
        "Temukan:\n"
        "1. Apa Title tag dan H1 yang terbaca di live web.\n"
        "2. Apa Meta Description saat ini dan apakah panjangnya memenuhi standar (120-155 karakter).\n"
        "3. Informasi harga promo, fitur utama (key_features), dan apakah Schema JSON-LD terdeteksi.\n"
        "4. Kelemahan on-page spesifik (detected_flaws) seperti kata clickbait terlarang, kurangnya UVP, dll.\n"
        "5. Gap search intent dengan target keyword."
    )

    human_content = (
        f"Analisa Halaman Produk Ini:\n"
        f"- Nama Produk: {product_name}\n"
        f"- Target URL: {target_url}\n"
        f"- Isu: {issue_type}\n"
        f"- Data Metrik: {json.dumps(metric_summary, ensure_ascii=False)}\n"
        f"- Metadata Scraper: {json.dumps(metadata, ensure_ascii=False)}\n\n"
        f"--- ISI KONTEN TERKIKIS DARI HALAMAN ---\n"
        f"{content}\n"
        f"----------------------------------------\n\n"
        "Buat laporan diagnosa komprehensif dalam format JSON terstruktur."
    )

    result, model_used = invoke_diagnostic_with_failover([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ])

    diagnostic_dict = result.model_dump()

    history_entry = {
        "round": 0,
        "agent": f"Diagnostic Agent ({metadata.get('scraped_via', 'web')} + {model_used})",
        "action": "DIAGNOSIS_COMPLETE",
        "scraped_title": diagnostic_dict.get("scraped_title"),
        "scraped_h1": diagnostic_dict.get("scraped_h1"),
        "detected_price": diagnostic_dict.get("detected_price"),
        "flaws_detected": diagnostic_dict.get("detected_flaws", []),
        "search_intent_gap": diagnostic_dict.get("search_intent_gap", ""),
    }

    debate_history = list(state.get("debate_history", []))
    debate_history.append(history_entry)

    return {
        "diagnostic_data": diagnostic_dict,
        "debate_history": debate_history,
    }
