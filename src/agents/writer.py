import csv
from datetime import datetime, timezone
import json
import os
from typing import Dict, Any, List, Optional
import httpx

from src.state import SwarmState


def get_supabase_headers() -> Optional[Dict[str, str]]:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_KEY", "").strip()
    )
    if not supabase_url or not supabase_key or "your-project-id" in supabase_url:
        return None
    return {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }


def append_to_local_csv(record: Dict[str, Any]):
    """
    Menyimpan hasil rekomendasi yang sudah selesai ke antrean lokal data/approval_queue.csv.
    """
    queue_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "approval_queue.csv")
    queue_file = os.path.normpath(queue_file)
    os.makedirs(os.path.dirname(queue_file), exist_ok=True)

    file_exists = os.path.exists(queue_file)
    fieldnames = [
        "timestamp",
        "id",
        "product_name",
        "target_url",
        "workflow_status",
        "approval_status",
        "critic_score",
        "total_rounds",
        "approved_title",
        "approved_meta_description",
        "approved_ad_headline",
        "approved_ad_body",
        "schema_json_ld",
        "reasoning",
    ]

    with open(queue_file, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerow(record)


def save_debate_audit_log_local(log_entry: Dict[str, Any]):
    """
    Menyimpan audit trail lengkap ke file lokal data/debate_audit_logs.json (Fallback & Local Cache).
    """
    log_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "debate_audit_logs.json")
    log_file = os.path.normpath(log_file)
    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    existing_logs = []
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing_logs = json.load(f)
        except Exception:
            existing_logs = []

    existing_logs.insert(0, log_entry)

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(existing_logs, f, indent=2, ensure_ascii=False)


def save_to_supabase_audit_logs(log_entry: Dict[str, Any]) -> bool:
    """
    TAHAP A: Menyimpan seluruh riwayat perdebatan ke tabel `swarm_audit_logs` di Supabase.
    """
    headers = get_supabase_headers()
    if not headers:
        return False

    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    row_payload = {
        "id": log_entry["id"],
        "created_at": log_entry["timestamp"],
        "product_name": log_entry.get("product_name", ""),
        "product_url": log_entry.get("target_url", ""),
        "issue_type": log_entry.get("issue_type", ""),
        "status": log_entry.get("final_status", "APPROVED"),
        "final_score": log_entry.get("critic_score", 0),
        "iterations": log_entry.get("total_rounds", 1),
        "metric_summary": log_entry.get("metric_summary", {}),
        "before_snapshot": log_entry.get("diagnostic_data", {}),
        "after_solution": log_entry.get("final_solution", {}),
        "debate_history": log_entry.get("debate_history", []),
        "approval_status": log_entry.get("approval_status", "PENDING"),
    }

    try:
        endpoint = f"{supabase_url}/rest/v1/swarm_audit_logs"
        with httpx.Client(timeout=12.0) as client:
            resp = client.post(
                endpoint,
                json=row_payload,
                headers={**headers, "Prefer": "return=minimal"},
            )
            return resp.status_code in (200, 201)
    except Exception as e:
        print(f"[Writer Warning] Gagal simpan ke Supabase swarm_audit_logs: {e}")
        return False


def fetch_all_audit_logs() -> List[Dict[str, Any]]:
    """
    Membaca riwayat perdebatan dari Supabase `swarm_audit_logs` (jika aktif),
    dengan fallback otomatis ke `data/debate_audit_logs.json`.
    """
    headers = get_supabase_headers()
    if headers:
        supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        try:
            endpoint = f"{supabase_url}/rest/v1/swarm_audit_logs?select=*&order=created_at.desc&limit=30"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    rows = resp.json()
                    if isinstance(rows, list) and len(rows) > 0:
                        return [
                            {
                                "id": r.get("id"),
                                "timestamp": r.get("created_at"),
                                "product_name": r.get("product_name") or r.get("product_url"),
                                "target_url": r.get("product_url"),
                                "issue_type": r.get("issue_type"),
                                "metric_summary": r.get("metric_summary") or {},
                                "diagnostic_data": r.get("before_snapshot") or {},
                                "final_status": r.get("status"),
                                "total_rounds": r.get("iterations", 1),
                                "critic_score": r.get("final_score", 0),
                                "final_solution": r.get("after_solution") or {},
                                "debate_history": r.get("debate_history") or [],
                                "approval_status": r.get("approval_status", "PENDING"),
                            }
                            for r in rows
                        ]
        except Exception as e:
            print(f"[Reader Warning] Gagal baca Supabase, fallback ke JSON lokal: {e}")

    log_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "debate_audit_logs.json")
    log_file = os.path.normpath(log_file)
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                logs = json.load(f)
                for item in logs:
                    if "approval_status" not in item:
                        item["approval_status"] = "PENDING"
                return logs
        except Exception:
            return []
    return []


def push_to_google_sheets(record: Dict[str, Any]) -> bool:
    """
    Menulis hasil yang di-approve ke Google Sheets melalui:
    1. Google Apps Script Webhook URL (Jalur Cepat Tanpa Cloud Console)
    2. Google Service Account (`credentials.json` + `GOOGLE_SHEET_KEY`)
    """
    pushed = False

    # Jalur 1: Google Apps Script Webhook URL
    apps_script_url = os.getenv("GOOGLE_APPS_SCRIPT_WEBHOOK_URL", "").strip()
    if apps_script_url and apps_script_url.startswith("https://script.google.com"):
        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.post(apps_script_url, json=record)
                if resp.status_code in (200, 201):
                    pushed = True
        except Exception as e:
            print(f"[Sheets Webhook Warning] Gagal kirim ke Apps Script URL: {e}")

    # Jalur 2: Google Service Account
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    sheet_key = os.getenv("GOOGLE_SHEET_KEY", "").strip()

    if os.path.exists(creds_path) and sheet_key and "your_" not in sheet_key:
        try:
            import gspread
            gc = gspread.service_account(filename=creds_path)
            sh = gc.open_by_key(sheet_key) if len(sheet_key) > 25 else gc.open(sheet_key)

            try:
                ws = sh.worksheet("Approval_Queue")
            except gspread.WorksheetNotFound:
                ws = sh.add_worksheet(title="Approval_Queue", rows=100, cols=13)
                ws.append_row([
                    "Timestamp", "Product Name", "URL", "Status", "Score",
                    "Rounds", "Title Tag", "Meta Description", "Ad Headline", "Ad Body", "Schema JSON-LD", "Reasoning"
                ])

            ws.append_row([
                record.get("timestamp", ""),
                record.get("product_name", ""),
                record.get("target_url", ""),
                record.get("approval_status", "APPROVED"),
                record.get("critic_score", 0),
                record.get("total_rounds", 1),
                record.get("approved_title", ""),
                record.get("approved_meta_description", ""),
                record.get("approved_ad_headline", ""),
                record.get("approved_ad_body", ""),
                record.get("schema_json_ld", ""),
                record.get("reasoning", ""),
            ])
            pushed = True
        except Exception as e:
            print(f"[Writer Warning] Gagal menulis ke Google Sheets: {e}")

    return pushed


def send_webhook_notification(log_entry: Dict[str, Any]) -> Dict[str, bool]:
    """
    TAHAP B: Mengirim notifikasi real-time otomatis ke Discord Webhook dan/atau Telegram Bot API
    begitu Swarm selesai berdebat.
    """
    results = {"discord": False, "telegram": False}

    product = log_entry.get("product_name", "Unknown Product")
    url = log_entry.get("target_url", "")
    score = log_entry.get("critic_score", 0)
    rounds = log_entry.get("total_rounds", 1)
    status = log_entry.get("final_status", "APPROVED")
    before_title = (log_entry.get("diagnostic_data") or {}).get("scraped_title", "-")
    after_sol = log_entry.get("final_solution") or {}
    after_title = after_sol.get("title_tag", "-")
    after_meta = after_sol.get("meta_description", "-")

    # 1. Discord Webhook Notification
    discord_url = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    if discord_url and discord_url.startswith("https://discord.com/api/webhooks/"):
        embed_payload = {
            "username": "NASA Swarm Sentinel",
            "embeds": [
                {
                    "title": f"⚡ Self-Healing Swarm Report: {product}",
                    "url": url if url.startswith("http") else None,
                    "color": 3066993 if status == "APPROVED" else 15158332,
                    "fields": [
                        {"name": "🎯 Status & Critic Score", "value": f"**{status}** ({score}/100 dalam {rounds} putaran)", "inline": True},
                        {"name": "🔗 Target URL", "value": url or "-", "inline": True},
                        {"name": "❌ Before (Title Lama)", "value": f"`{before_title}`", "inline": False},
                        {"name": "✅ After (Title Baru)", "value": f"**{after_title}** ({len(after_title)} chars)", "inline": False},
                        {"name": "📝 Meta Description Baru", "value": f"{after_meta} ({len(after_meta)} chars)", "inline": False},
                    ],
                    "footer": {"text": "The Self-Healing Ad & SEO Swarm • Klik Approve di Command Center Dashboard"},
                }
            ],
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.post(discord_url, json=embed_payload)
                results["discord"] = r.status_code in (200, 204)
        except Exception as e:
            print(f"[Webhook Warning] Gagal kirim Discord notification: {e}")

    # 2. Telegram Bot Notification (Dengan IPv4 Transport & Auto-Discovery CHAT_ID)
    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    tg_chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if tg_token and "your_" not in tg_token:
        transport = httpx.HTTPTransport(local_address="0.0.0.0")
        if not tg_chat_id:
            try:
                with httpx.Client(transport=transport, timeout=12.0) as client:
                    upd_res = client.get(f"https://api.telegram.org/bot{tg_token}/getUpdates")
                    if upd_res.status_code == 200:
                        upd_data = upd_res.json()
                        items = upd_data.get("result") or []
                        for item in reversed(items):
                            msg = item.get("message") or item.get("my_chat_member") or {}
                            chat_obj = msg.get("chat") or {}
                            if chat_obj.get("id"):
                                tg_chat_id = str(chat_obj["id"])
                                os.environ["TELEGRAM_CHAT_ID"] = tg_chat_id
                                break
            except Exception as e:
                print(f"[Telegram Auto-ID Warning] Gagal ambil getUpdates: {e}")

        if tg_chat_id:
            import html
            safe_prod = html.escape(str(product))
            safe_url = html.escape(str(url))
            safe_before = html.escape(str(before_title))
            safe_after_title = html.escape(str(after_title))
            safe_after_meta = html.escape(str(after_meta))

            tg_text = (
                f"⚡ <b>SELF-HEALING SWARM COMPLETED</b>\n\n"
                f"📦 <b>Produk:</b> {safe_prod}\n"
                f"🔗 <b>URL:</b> {safe_url}\n"
                f"⚖️ <b>Critic Score:</b> {score}/100 ({status} - {rounds} Putaran)\n\n"
                f"❌ <b>Before Title:</b>\n<code>{safe_before}</code>\n\n"
                f"✅ <b>After Title ({len(after_title)} chars):</b>\n<b>{safe_after_title}</b>\n\n"
                f"📝 <b>After Meta ({len(after_meta)} chars):</b>\n{safe_after_meta}\n\n"
                f"👉 <i>Klik Approve di Dashboard untuk push ke Google Sheets!</i>"
            )
            try:
                tg_endpoint = f"https://api.telegram.org/bot{tg_token}/sendMessage"
                with httpx.Client(transport=transport, timeout=12.0) as client:
                    r = client.post(
                        tg_endpoint,
                        json={"chat_id": tg_chat_id, "text": tg_text, "parse_mode": "HTML"},
                    )
                    results["telegram"] = r.status_code == 200
            except Exception as e:
                print(f"[Webhook Warning] Gagal kirim Telegram notification: {e}")

    return results


def approve_and_push_run(run_id: str) -> Dict[str, Any]:
    """
    TAHAP B: Mengubah `approval_status` menjadi 'APPROVED' di Supabase + JSON lokal,
    dan menembak payload hasil optimasi ke Google Sheets (Apps Script Webhook / Service Account).
    """
    target_log = None

    # 1. Update di JSON lokal
    log_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "debate_audit_logs.json")
    log_file = os.path.normpath(log_file)
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                logs = json.load(f)
            for item in logs:
                if item.get("id") == run_id or (not run_id and target_log is None):
                    item["approval_status"] = "APPROVED"
                    item["approved_at"] = datetime.now(timezone.utc).isoformat()
                    target_log = item
                    break
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(logs, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Approve Warning] Gagal update JSON lokal: {e}")

    # 2. Update di Supabase `swarm_audit_logs`
    supabase_updated = False
    headers = get_supabase_headers()
    if headers and run_id:
        supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        try:
            endpoint = f"{supabase_url}/rest/v1/swarm_audit_logs?id=eq.{run_id}"
            with httpx.Client(timeout=10.0) as client:
                resp = client.patch(
                    endpoint,
                    json={
                        "approval_status": "APPROVED",
                        "approved_at": datetime.now(timezone.utc).isoformat(),
                    },
                    headers={**headers, "Prefer": "return=representation"},
                )
                if resp.status_code in (200, 204):
                    supabase_updated = True
                    data = resp.json() if resp.text else []
                    if isinstance(data, list) and len(data) > 0 and not target_log:
                        row = data[0]
                        target_log = {
                            "id": row.get("id"),
                            "timestamp": row.get("created_at"),
                            "product_name": row.get("product_name"),
                            "target_url": row.get("product_url"),
                            "critic_score": row.get("final_score"),
                            "total_rounds": row.get("iterations"),
                            "final_solution": row.get("after_solution") or {},
                        }
        except Exception as e:
            print(f"[Approve Warning] Gagal update Supabase: {e}")

    # 3. Push ke Google Sheets Webhook / API
    sheets_pushed = False
    if target_log:
        sol = target_log.get("final_solution") or {}
        sheet_record = {
            "id": target_log.get("id", run_id),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "product_name": target_log.get("product_name", ""),
            "product_url": target_log.get("target_url", ""),
            "target_url": target_log.get("target_url", ""),
            "approval_status": "APPROVED",
            "final_score": target_log.get("critic_score", 0),
            "critic_score": target_log.get("critic_score", 0),
            "iterations": target_log.get("total_rounds", 1),
            "total_rounds": target_log.get("total_rounds", 1),
            "approved_title": sol.get("title_tag", ""),
            "approved_meta_description": sol.get("meta_description", ""),
            "approved_ad_headline": sol.get("ad_copy_headline", ""),
            "approved_ad_body": sol.get("ad_copy_body", ""),
            "schema_json_ld": sol.get("schema_json_ld", ""),
            "reasoning": sol.get("reasoning", ""),
        }
        sheets_pushed = push_to_google_sheets(sheet_record)

    return {
        "success": True,
        "run_id": run_id,
        "approval_status": "APPROVED",
        "supabase_updated": supabase_updated,
        "sheets_pushed": sheets_pushed,
        "log": target_log,
    }


def writer_node(state: SwarmState) -> dict:
    """
    Node 5: Output, Cloud Persistence & Webhook Dispatcher
    1. Menyimpan ke Supabase `swarm_audit_logs` (dengan fallback `data/debate_audit_logs.json`)
    2. Menyimpan ke `data/approval_queue.csv`
    3. Mengirim notifikasi real-time ke Discord / Telegram Webhook
    """
    draft = state.get("current_draft") or {}
    review = state.get("critic_review") or {}
    status = state.get("workflow_status", "APPROVED")
    run_id = f"run-{int(datetime.now().timestamp())}"
    now_iso = datetime.now(timezone.utc).isoformat()

    history_entry = {
        "round": state.get("iteration_count", 1),
        "agent": "Writer Agent (Supabase & Webhook Dispatcher)",
        "action": "PERSISTED_TO_STORAGE",
        "final_status": status,
    }
    debate_history = list(state.get("debate_history", []))
    debate_history.append(history_entry)

    log_entry = {
        "id": run_id,
        "timestamp": now_iso,
        "product_name": state.get("product_name", ""),
        "target_url": state.get("target_url", ""),
        "issue_type": state.get("issue_type", ""),
        "metric_summary": state.get("metric_summary", {}),
        "diagnostic_data": state.get("diagnostic_data", {}),
        "final_status": status,
        "total_rounds": state.get("iteration_count", 1),
        "critic_score": review.get("score", 0),
        "final_solution": draft,
        "debate_history": debate_history,
        "approval_status": "PENDING",
    }

    csv_record = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "id": run_id,
        "product_name": state.get("product_name", ""),
        "target_url": state.get("target_url", ""),
        "workflow_status": status,
        "approval_status": "PENDING",
        "critic_score": review.get("score", 0),
        "total_rounds": state.get("iteration_count", 1),
        "approved_title": draft.get("title_tag", ""),
        "approved_meta_description": draft.get("meta_description", ""),
        "approved_ad_headline": draft.get("ad_copy_headline", ""),
        "approved_ad_body": draft.get("ad_copy_body", ""),
        "schema_json_ld": draft.get("schema_json_ld", ""),
        "reasoning": draft.get("reasoning", ""),
    }

    # 1. Simpan ke local CSV & JSON Audit Log
    append_to_local_csv(csv_record)
    save_debate_audit_log_local(log_entry)

    # 2. Simpan ke Supabase Cloud DB (`swarm_audit_logs`)
    save_to_supabase_audit_logs(log_entry)

    # 3. Tembak hasil final yang lolos sensor ke Google Sheets (Draft / Queue)
    push_to_google_sheets(csv_record)

    # 4. Kirim notifikasi Webhook otomatis (Discord / Telegram)
    send_webhook_notification(log_entry)

    return {
        "workflow_status": status,
        "debate_history": debate_history,
    }
