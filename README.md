# ⚡ The Self-Healing Ad & SEO Swarm

Autonomous Multi-Agent Organization menggunakan arsitektur **Directed Acyclic Graph (DAG)** dengan **LangGraph**, **Groq (`openai/gpt-oss-120b`)**, **Google Gemini (`gemini-2.5-flash`)**, **Jina Reader Scraper**, dan **Next.js Visual Command Center**.

---

## 🗺️ Arsitektur 5-Node Autonomous State Machine

```text
[Google Sheets / data/gsc_sample.csv]
       │
       ▼
🟢 Node 1: WATCHER AGENT (Groq 120B Sentinel)
   "Deteksi URL/Produk yang CTR turun > 30% atau Disapproved"
   (Jika semua sehat -> STOP hemat token. Jika bocor -> Lanjut)
       │
       ▼
🔍 Node 2: DIAGNOSTIC AGENT (Jina Reader API + BeautifulSoup + Gemini 2.5 Flash)
   "Buka URL live produk, cek H1, Meta Title, Meta Desc, Schema JSON-LD, & Harga"
       │
       ▼
✍️ Node 3: EXECUTION AGENT (Gemini 2.5 Flash) ◄────────────────────────┐
   "Bikin draf perbaikan (Meta baru, Copywriting Ads, JSON-LD Schema)" │
       │                                                               │ (DITOLAK!
       ▼                                                               │  Revisi ulang,
⚖️ Node 4: CRITIC AGENT (Groq 120B + Python Hard-Guard) ───────────────┘  Maks 3x Loop)
   "Audit ketat: Title <= 60 chars, Meta 120-155 chars, bebas clickbait!
    Jika melanggar -> paksa Node 3 revisi!"
       │
       │ (LOLOS SENSOR / APPROVED!)
       ▼
💾 Node 5: WRITER AGENT (Supabase + Google Sheets + Local Audit Trail)
   "Simpan histori debat ke JSON/Supabase & tulis hasil final ke Approval Queue"
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Engine Python (CLI Terminal Mode)
```powershell
.\.venv\Scripts\python.exe main.py
```
Untuk menargetkan URL spesifik:
```powershell
.\.venv\Scripts\python.exe main.py --url https://tokofurnitur.id/products/standing-mat
```

### 2. Jalankan NASA Command Center Dashboard (Next.js)
```powershell
cd dashboard
npm run dev
```
Buka **`http://localhost:3000`** di browser untuk melihat visualisasi DAG, putaran debat antar Agent, perbandingan *Before vs. After*, serta tombol **Trigger Live Swarm** langsung dari UI.
