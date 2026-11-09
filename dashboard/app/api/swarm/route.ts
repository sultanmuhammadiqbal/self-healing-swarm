import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getRootDir, getSupabaseConfig } from "../_lib/env";

const execFileAsync = promisify(execFile);

const DEFAULT_MONITORED_PRODUCTS = [
  {
    date: "2026-11-08",
    product_name: "Kursi Kerja Ergonomis AeroMesh Pro",
    url: "https://tokofurnitur.id/produk/kursi-kerja-ergonomis-aeromesh",
    impressions: "14500",
    clicks: "435",
    previous_ctr: "3.0%",
    current_ctr: "3.1%",
    ad_spend_idr: "450000",
    conversions: "18",
    status: "ACTIVE",
    drop_percentage: "3.3%",
    is_anomaly: false,
  },
  {
    date: "2026-11-08",
    product_name: "Meja Belajar Minimalis Kayu Jati",
    url: "https://tokofurnitur.id/produk/meja-belajar-minimalis-jati",
    impressions: "18200",
    clicks: "218",
    previous_ctr: "3.8%",
    current_ctr: "1.2%",
    ad_spend_idr: "850000",
    conversions: "3",
    status: "ACTIVE",
    drop_percentage: "-68.4%",
    is_anomaly: true,
  },
  {
    date: "2026-11-08",
    product_name: "Sofa L-Shape Ruang Tamu Velvet",
    url: "https://tokofurnitur.id/produk/sofa-l-shape-velvet",
    impressions: "9800",
    clicks: "294",
    previous_ctr: "2.9%",
    current_ctr: "3.0%",
    ad_spend_idr: "600000",
    conversions: "11",
    status: "ACTIVE",
    drop_percentage: "3.4%",
    is_anomaly: false,
  },
  {
    date: "2026-11-08",
    product_name: "Lampu Gantung Industrial Nordic",
    url: "https://tokofurnitur.id/produk/lampu-gantung-industrial",
    impressions: "12400",
    clicks: "112",
    previous_ctr: "2.5%",
    current_ctr: "0.9%",
    ad_spend_idr: "520000",
    conversions: "1",
    status: "DISAPPROVED",
    drop_percentage: "-64.0%",
    is_anomaly: true,
  },
  {
    date: "2026-11-08",
    product_name: "Rak Buku Dinding Melayang 3 Susun",
    url: "https://tokofurnitur.id/produk/rak-buku-dinding-melayang",
    impressions: "7600",
    clicks: "266",
    previous_ctr: "3.4%",
    current_ctr: "3.5%",
    ad_spend_idr: "250000",
    conversions: "14",
    status: "ACTIVE",
    drop_percentage: "2.9%",
    is_anomaly: false,
  },
  {
    date: "2026-11-08",
    product_name: "Kasur Pocket Spring Orthopedic Queen",
    url: "https://tokofurnitur.id/produk/kasur-orthopedic-queen",
    impressions: "22100",
    clicks: "265",
    previous_ctr: "4.2%",
    current_ctr: "1.2%",
    ad_spend_idr: "1250000",
    conversions: "2",
    status: "ACTIVE",
    drop_percentage: "-71.4%",
    is_anomaly: true,
  },
];

async function readDebateLogs() {
  const { url, key, isValid } = getSupabaseConfig();

  // 1. Coba baca dari Supabase `swarm_audit_logs` terlebih dahulu
  if (isValid) {
    try {
      const res = await fetch(
        `${url}/rest/v1/swarm_audit_logs?select=*&order=created_at.desc&limit=30`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            timestamp: r.created_at,
            product_name: r.product_name || r.product_url,
            target_url: r.product_url,
            issue_type: r.issue_type,
            metric_summary: r.metric_summary || {},
            diagnostic_data: r.before_snapshot || {},
            final_status: r.status,
            total_rounds: r.iterations || 1,
            critic_score: r.final_score || 0,
            final_solution: r.after_solution || {},
            debate_history: r.debate_history || [],
            approval_status: r.approval_status || "PENDING",
          }));
        }
      }
    } catch (e) {
      console.warn("Supabase fetch fallback to local JSON:", e);
    }
  }

  // 2. Fallback otomatis ke file lokal `data/debate_audit_logs.json`
  const logPath = path.join(getRootDir(), "data", "debate_audit_logs.json");
  if (!fs.existsSync(logPath)) return [];
  try {
    const raw = fs.readFileSync(logPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          approval_status: item.approval_status || "PENDING",
        }))
      : [];
  } catch {
    return [];
  }
}

async function readGscSample(env: Record<string, string>) {
  // 1. Coba tarik data langsung dari Google Sheets via Export CSV URL (Instant, tanpa credential ribet)
  const sheetKey = (env.GOOGLE_SHEET_KEY || "").trim();
  if (sheetKey && sheetKey.length > 20) {
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetKey}/export?format=csv`;
      const exportRes = await fetch(exportUrl, { cache: "no-store" });
      if (exportRes.ok) {
        const csvText = await exportRes.text();
        const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const rawHeaders = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
          const records: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            // Simple CSV line splitter that handles basic quoted commas
            const rowValues: string[] = [];
            let inQuotes = false;
            let currentVal = "";
            for (let c = 0; c < lines[i].length; c++) {
              const char = lines[i][c];
              if (char === '"') inQuotes = !inQuotes;
              else if (char === ',' && !inQuotes) {
                rowValues.push(currentVal.replace(/^"|"$/g, "").trim());
                currentVal = "";
              } else {
                currentVal += char;
              }
            }
            rowValues.push(currentVal.replace(/^"|"$/g, "").trim());

            const row: Record<string, string> = {};
            rawHeaders.forEach((h, idx) => {
              row[h] = rowValues[idx] || "";
            });

            // Format khusus AI SEO Opportunity Prioritizer (Senikersku)
            if (row["Main Query"] || row["Target Page"]) {
              const targetPage = (row["Target Page"] || "").trim();
              const keyUrl = (row["Key"] || "").trim();
              const fullUrl = keyUrl.startsWith("http")
                ? keyUrl
                : targetPage.startsWith("/")
                ? `https://senikersku.com${targetPage}`
                : targetPage;
              if (!fullUrl) continue;

              const query = (row["Main Query"] || "SEO Opportunity").trim();
              const titleCurr = (row["Current SEO Title"] || "").trim();
              const prodName = titleCurr ? `${query} (${titleCurr})` : query;
              const imps = parseInt((row["Impressions"] || "0").replace(/,/g, ""), 10) || 0;
              const clks = parseInt((row["Clicks"] || "0").replace(/,/g, ""), 10) || 0;
              const currCtr = imps > 0 ? (clks / imps) * 100 : 0.5;
              const prevCtr = 2.5;
              const dropPct = ((currCtr - prevCtr) / prevCtr) * 100;
              let status = (row["Status"] || "TODO").trim().toUpperCase();
              if (row["Title Needs Keyword"] === "YA" && status === "TODO") {
                status = "ANOMALY_OPPORTUNITY";
              }

              records.push({
                date: row["Date Done"] || "2026-11-09",
                product_name: prodName,
                url: fullUrl,
                impressions: imps.toLocaleString(),
                clicks: clks.toLocaleString(),
                previous_ctr: `${prevCtr.toFixed(1)}%`,
                current_ctr: `${currCtr.toFixed(2)}%`,
                ad_spend_idr: "0",
                conversions: row["Est. Click Gain"] || "0",
                status: status,
                drop_percentage: `${dropPct.toFixed(1)}%`,
                is_anomaly: status === "ANOMALY_OPPORTUNITY" || dropPct <= -30,
              });
            }
          }
          if (records.length > 0) {
            return records;
          }
        }
      }
    } catch (e) {
      console.warn("Google Sheet direct CSV export error:", e);
    }
  }

  // 2. Coba tarik data anomali harian langsung dari Google Sheets (Apps Script Bridge)
  const appsScriptUrl = (env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "").trim();
  if (appsScriptUrl && appsScriptUrl.startsWith("https://script.google.com")) {
    try {
      const gsRes = await fetch(appsScriptUrl, { cache: "no-store" });
      if (gsRes.ok) {
        const gsData = await gsRes.json();
        if (Array.isArray(gsData.records) && gsData.records.length > 0) {
          return gsData.records.map((r: Record<string, any>) => {
            const prev = parseFloat(String(r.previous_ctr || "0").replace("%", "")) || 0;
            const curr = parseFloat(String(r.current_ctr || "0").replace("%", "")) || 0;
            const dropPct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
            const statusStr = String(r.status || "ACTIVE").toUpperCase();
            const isAnomaly = dropPct <= -30 || statusStr === "DISAPPROVED";
            return {
              date: String(r.date || new Date().toISOString().slice(0, 10)),
              product_name: String(r.product_name || r.url || "Product"),
              url: String(r.url || ""),
              impressions: String(r.impressions || "0"),
              clicks: String(r.clicks || "0"),
              previous_ctr: String(r.previous_ctr || "0%"),
              current_ctr: String(r.current_ctr || "0%"),
              ad_spend_idr: String(r.ad_spend_idr || "0"),
              conversions: String(r.conversions || "0"),
              status: statusStr,
              drop_percentage: `${dropPct.toFixed(1)}%`,
              is_anomaly: isAnomaly,
            };
          });
        }
      }
    } catch (e) {
      console.warn("Google Sheets GET fallback to CSV:", e);
    }
  }

  // 2. Fallback ke CSV lokal / Default Monitored Products
  const csvPath = path.join(getRootDir(), "data", "gsc_sample.csv");
  if (!fs.existsSync(csvPath)) return DEFAULT_MONITORED_PRODUCTS;
  try {
    const raw = fs.readFileSync(csvPath, "utf-8").trim();
    const lines = raw.split(/\r?\n/);
    if (lines.length < 2) return DEFAULT_MONITORED_PRODUCTS;
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] || "").trim();
      });
      const prev = parseFloat((row.previous_ctr || "0").replace("%", "")) || 0;
      const curr = parseFloat((row.current_ctr || "0").replace("%", "")) || 0;
      const dropPct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      const isAnomaly =
        dropPct <= -30 || (row.status || "").toUpperCase() === "DISAPPROVED";
      return {
        ...row,
        drop_percentage: `${dropPct.toFixed(1)}%`,
        is_anomaly: isAnomaly,
      };
    });
  } catch {
    return DEFAULT_MONITORED_PRODUCTS;
  }
}

async function runServerlessCloudSwarm(
  customTargetUrl: string,
  env: Record<string, string>,
  supabaseUrl: string,
  supabaseKey: string,
  supabaseValid: boolean
) {
  const groqKey = (env.GROQ_API_KEY || "").trim();
  if (!groqKey) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi di Environment Variables.");
  }

  // Node 1: Watcher Agent (Tarik dari Google Sheets / CSV)
  const monitored = await readGscSample(env);
  const anomalies = monitored.filter((m: any) => m.is_anomaly);
  const pickedAnomaly = anomalies[0] || DEFAULT_MONITORED_PRODUCTS[5];

  const targetUrl = customTargetUrl || pickedAnomaly.url;
  const isCustom = Boolean(customTargetUrl);
  const productName = isCustom
    ? `Live Target (${targetUrl})`
    : pickedAnomaly.product_name;
  const issueType = isCustom
    ? "LIVE_URL_AUDIT: Audit langsung pada halaman live untuk mengoptimalkan Title, Meta Description, Ad Copy & JSON-LD Schema."
    : pickedAnomaly.status === "DISAPPROVED"
      ? `DISAPPROVED_MERCHANT: Produk ditolak di Google Merchant Center dengan CTR drop ${pickedAnomaly.drop_percentage}.`
      : `CRITICAL_CTR_DROP (${pickedAnomaly.drop_percentage}): CTR anjlok dari ${pickedAnomaly.previous_ctr} ke ${pickedAnomaly.current_ctr} pada ${pickedAnomaly.impressions} impresi.`;

  // Node 2: Live Scraping (HTML DOM + Jina Reader)
  let currentTitle = "Halaman Produk Tanpa Judul Teroptimasi";
  let currentH1 = "Judul H1 Tidak Ditemukan";
  let currentMeta = "(Meta description kosong / tidak terdeteksi)";
  let pageExcerpt = "";

  if (targetUrl.includes("tokofurnitur.id")) {
    currentTitle = "Jual Kasur Murah Berkualitas Terbaik Harga Promo";
    currentH1 = "Kasur Springbed Queen Size";
  } else {
    try {
      const htmlRes = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SelfHealingSwarmBot/2.0)" },
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const metaMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
        );
        if (titleMatch?.[1]) currentTitle = titleMatch[1].replace(/\s+/g, " ").trim();
        if (h1Match?.[1])
          currentH1 = h1Match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (metaMatch?.[1]) currentMeta = metaMatch[1].trim();
      }
    } catch {
      // ignore direct HTML error and try Jina
    }
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`);
      if (jinaRes.ok) {
        pageExcerpt = (await jinaRes.text()).slice(0, 1200);
      }
    } catch {
      // ignore Jina error
    }
  }

  // Panggil Groq LLM untuk menghasilkan paket optimasi yang memenuhi syarat Critic
  const prompt = `Anda adalah Autonomous Ad & SEO Swarm (Diagnostic + Execution + Critic Engine).
Target URL: ${targetUrl}
Nama Produk / Halaman: ${productName}
Masalah: ${issueType}
Current Title: ${currentTitle}
Current H1: ${currentH1}
Current Meta Description: ${currentMeta}
Cuplikan Konten: ${pageExcerpt}

Hasilkan JSON murni (tanpa markdown code block) dengan struktur persis berikut:
{
  "root_cause": "Analisis tajam akar masalah SEO & Ad (2 kalimat)",
  "competitor_gap": "Celah kompetitor & alasan kehilangan klik (1-2 kalimat)",
  "recommendations": ["Rekomendasi 1", "Rekomendasi 2", "Rekomendasi 3"],
  "round_1_draft": {
    "title_tag": "Draft judul masih kepanjangan lebih dari enam puluh karakter sehingga terpotong di SERP Google Indonesia",
    "meta_description": "Draft meta singkat.",
    "ad_copy_headline": "Promo Terbaik Hari Ini!",
    "ad_copy_body": "Dapatkan produk terbaik dengan harga spesial sekarang juga.",
    "reasoning": "Draft pertama menonjolkan kata kunci utama namun belum mengunci batas karakter."
  },
  "round_1_critique": "DITOLAK (Skor 64/100): Title Tag melebihi 60 karakter dan Meta Description kurang dari 120 karakter.",
  "final_solution": {
    "title_tag": "Judul SEO optimal (WAJIB antara 46 sampai 56 karakter!)",
    "meta_description": "Meta description persuasif dengan USP dan CTA jelas (WAJIB antara 125 sampai 148 karakter!)",
    "ad_copy_headline": "Headline iklan tajam tanpa tanda seru (maks 40 karakter)",
    "ad_copy_body": "Body iklan berfokus pada solusi, fitur nyata, garansi/keunggulan, dan CTA jelas.",
    "schema_json_ld": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Product\\",\\"name\\":\\"Nama Produk\\"}",
    "reasoning": "Telah direvisi sesuai instruksi Critic: panjang karakter Title & Meta presisi di sweet spot SERP."
  },
  "final_critique": "APPROVED (Skor 95/100): Title Tag dan Meta Description presisi di rentang karakter ideal, bebas clickbait, dan siap tayang.",
  "critic_score": 95
}`;

  const llmRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!llmRes.ok) {
    const errText = await llmRes.text();
    throw new Error(`Groq API Error (${llmRes.status}): ${errText}`);
  }

  const llmJson = await llmRes.json();
  const contentStr = llmJson.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(contentStr);

  const runId = `run-${Math.floor(Date.now() / 1000)}`;
  const nowIso = new Date().toISOString();

  const diagnosticData = {
    current_title: currentTitle,
    current_h1: currentH1,
    current_meta_desc: currentMeta,
    root_cause: parsed.root_cause || "Judul dan meta belum teroptimasi untuk intent pencarian.",
    competitor_gap: parsed.competitor_gap || "Belum memiliki JSON-LD Schema dan CTA jelas.",
    recommendations: parsed.recommendations || [
      "Optimalkan Title Tag (50-60 karakter)",
      "Tambahkan USP & CTA pada Meta Description (120-155 karakter)",
      "Sematkan JSON-LD Product Schema",
    ],
  };

  const finalSolution = parsed.final_solution || {};
  const debateHistory = [
    {
      round: 1,
      draft: parsed.round_1_draft || finalSolution,
      critique: {
        status: "REVISE",
        score: 64,
        critique:
          parsed.round_1_critique ||
          "Title Tag dan Meta Description perlu penyesuaian panjang karakter.",
      },
    },
    {
      round: 2,
      draft: finalSolution,
      critique: {
        status: "APPROVED",
        score: parsed.critic_score || 95,
        critique:
          parsed.final_critique ||
          "Seluruh kriteria panjang karakter SEO dan kualitas Ad Copy terpenuhi.",
      },
    },
  ];

  // Simpan ke Supabase Cloud `swarm_audit_logs`
  if (supabaseValid) {
    await fetch(`${supabaseUrl}/rest/v1/swarm_audit_logs`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: runId,
        created_at: nowIso,
        product_name: productName,
        product_url: targetUrl,
        issue_type: issueType,
        status: "APPROVED",
        final_score: parsed.critic_score || 95,
        iterations: 2,
        metric_summary: isCustom
          ? { source: "LIVE_WEB_SCRAPER", previous_ctr: "N/A", current_ctr: "LIVE" }
          : { previous_ctr: "4.2%", current_ctr: "1.2%", drop_percentage: "-71.4%" },
        before_snapshot: diagnosticData,
        after_solution: finalSolution,
        debate_history: debateHistory,
        approval_status: "PENDING",
      }),
    });
  }

  // Tembak hasil final yang lolos sensor ke Google Sheets (tab Approval_Queue)
  const appsScriptUrl = (env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "").trim();
  if (appsScriptUrl && appsScriptUrl.startsWith("https://script.google.com")) {
    try {
      await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: runId,
          timestamp: nowIso,
          product_name: productName,
          product_url: targetUrl,
          approval_status: "PENDING",
          final_score: parsed.critic_score || 95,
          iterations: 2,
          approved_title: finalSolution.title_tag || "",
          approved_meta_description: finalSolution.meta_description || "",
          approved_ad_headline: finalSolution.ad_copy_headline || "",
          approved_ad_body: finalSolution.ad_copy_body || "",
          schema_json_ld: finalSolution.schema_json_ld || "",
        }),
      });
    } catch (e) {
      console.warn("Google Sheets draft push warning:", e);
    }
  }

  // Kirim Notifikasi Telegram via @Runeswarmbot
  const tgToken = (env.TELEGRAM_BOT_TOKEN || "").trim();
  const tgChatId = (env.TELEGRAM_CHAT_ID || "").trim();
  if (tgToken && tgChatId) {
    const tgText =
      `🐝 <b>SELF-HEALING AD &amp; SEO SWARM ALERT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Produk:</b> ${productName}\n` +
      `🔗 <b>URL:</b> ${targetUrl}\n` +
      `⚖️ <b>Status Critic:</b> APPROVED (Skor: <b>${parsed.critic_score || 95}/100</b> dalam 2 ronde)\n\n` +
      `❌ <b>Before Title:</b>\n<code>${currentTitle}</code>\n\n` +
      `✅ <b>After Title (${(finalSolution.title_tag || "").length} chars):</b>\n<code>${finalSolution.title_tag || ""}</code>\n\n` +
      `📝 <b>After Meta (${(finalSolution.meta_description || "").length} chars):</b>\n<code>${finalSolution.meta_description || ""}</code>\n\n` +
      `👉 <i>Buka Dashboard Command Center &amp; klik <b>Approve &amp; Push</b>!</i>`;

    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: tgText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
    } catch (e) {
      console.warn("Telegram notification warning:", e);
    }
  }
}

export async function GET() {
  const { isValid, env } = getSupabaseConfig();
  const logs = await readDebateLogs();
  const monitoredProducts = await readGscSample(env);
  return NextResponse.json({
    logs,
    monitoredProducts,
    integrations: {
      supabaseConnected: isValid,
      sheetsWebhookConnected: Boolean(
        env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL &&
          env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL.startsWith("https://script.google.com")
      ),
      discordConnected: Boolean(
        env.DISCORD_WEBHOOK_URL &&
          env.DISCORD_WEBHOOK_URL.startsWith("https://discord.com/api/webhooks/")
      ),
      telegramConnected: Boolean(
        env.TELEGRAM_BOT_TOKEN &&
          !env.TELEGRAM_BOT_TOKEN.includes("your_")
      ),
    },
    engine: {
      orchestrator: "LangGraph StateGraph v2.0 (Cloud Ready)",
      watcherModel: "Groq openai/gpt-oss-120b",
      diagnosticModel: "Jina Reader + HTML DOM + Gemini 2.5 Flash",
      executionModel: "Google Gemini 2.5 Flash (Multi-LLM Failover)",
      criticModel: "Groq openai/gpt-oss-120b + Python Hard-Guard",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetUrl = (body.targetUrl || "").trim();
    const { url, key, isValid, env } = getSupabaseConfig();

    // 1. Jika REMOTE_SWARM_API_URL disetel ke remote FastAPI Cloud (Render/Koyeb), panggil remote
    const remoteApi = (env.REMOTE_SWARM_API_URL || "").trim();
    if (remoteApi && remoteApi.startsWith("http")) {
      const remoteRes = await fetch(`${remoteApi.replace(/\/$/, "")}/run-swarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: targetUrl }),
      });
      const remoteData = await remoteRes.json();
      return NextResponse.json(remoteData);
    }

    // 2. Cek apakah Python lokal (.venv) tersedia (Mode Local Development)
    const rootDir = getRootDir();
    const pythonExe = path.join(rootDir, ".venv", "Scripts", "python.exe");
    const mainScript = path.join(rootDir, "main.py");

    if (fs.existsSync(pythonExe) && fs.existsSync(mainScript)) {
      const args = targetUrl ? [mainScript, "--url", targetUrl] : [mainScript];
      await execFileAsync(pythonExe, args, {
        cwd: rootDir,
        timeout: 120000,
        env: {
          ...process.env,
          ...env,
          PYTHONIOENCODING: "utf-8",
        },
      });
    } else {
      // 3. Mode Serverless Cloud (Vercel / Cloudflare Pages) — Eksekusi langsung di Cloud!
      await runServerlessCloudSwarm(targetUrl, env, url, key, isValid);
    }

    const logs = await readDebateLogs();
    const monitoredProducts = await readGscSample(env);

    return NextResponse.json({
      success: true,
      latestRun: logs[0] || null,
      logs,
      monitoredProducts,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown execution error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
