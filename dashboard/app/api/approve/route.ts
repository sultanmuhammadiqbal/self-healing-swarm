import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getRootDir, getSupabaseConfig } from "../_lib/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const runId = (body.runId || "").trim();
    if (!runId) {
      return NextResponse.json(
        { success: false, error: "runId is required" },
        { status: 400 }
      );
    }

    const { url, key, isValid, env } = getSupabaseConfig();
    const nowIso = new Date().toISOString();
    let targetLog: Record<string, any> | null = null;
    let supabaseUpdated = false;
    let sheetsPushed = false;

    // 1. Update di file lokal `data/debate_audit_logs.json` (Fallback & Local Sync)
    const logPath = path.join(getRootDir(), "data", "debate_audit_logs.json");
    if (fs.existsSync(logPath)) {
      try {
        const raw = fs.readFileSync(logPath, "utf-8");
        const logs = JSON.parse(raw);
        if (Array.isArray(logs)) {
          for (const item of logs) {
            if (item.id === runId) {
              item.approval_status = "APPROVED";
              item.approved_at = nowIso;
              targetLog = item;
              break;
            }
          }
          fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), "utf-8");
        }
      } catch (e) {
        console.warn("Failed updating local JSON:", e);
      }
    }

    // 2. Update `approval_status = 'APPROVED'` di Supabase `swarm_audit_logs`
    if (isValid) {
      try {
        const sbRes = await fetch(
          `${url}/rest/v1/swarm_audit_logs?id=eq.${encodeURIComponent(runId)}`,
          {
            method: "PATCH",
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              approval_status: "APPROVED",
              approved_at: nowIso,
            }),
          }
        );
        if (sbRes.ok) {
          supabaseUpdated = true;
          const rows = await sbRes.json();
          if (Array.isArray(rows) && rows.length > 0 && !targetLog) {
            const r = rows[0];
            targetLog = {
              id: r.id,
              timestamp: r.created_at,
              product_name: r.product_name || r.product_url,
              target_url: r.product_url,
              critic_score: r.final_score,
              total_rounds: r.iterations,
              final_solution: r.after_solution || {},
            };
          }
        }
      } catch (e) {
        console.warn("Supabase approve update error:", e);
      }
    }

    // 3. Tembak payload hasil optimasi ke Google Sheets Webhook (Apps Script URL)
    const appsScriptUrl = (env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "").trim();
    if (
      appsScriptUrl &&
      appsScriptUrl.startsWith("https://script.google.com") &&
      targetLog
    ) {
      try {
        const sol = targetLog.final_solution || {};
        const sheetPayload = {
          id: targetLog.id,
          timestamp: nowIso,
          product_name: targetLog.product_name || "",
          product_url: targetLog.target_url || "",
          approval_status: "APPROVED",
          final_score: targetLog.critic_score || 0,
          iterations: targetLog.total_rounds || 1,
          approved_title: sol.title_tag || "",
          approved_meta_description: sol.meta_description || "",
          approved_ad_headline: sol.ad_copy_headline || "",
          approved_ad_body: sol.ad_copy_body || "",
          schema_json_ld: sol.schema_json_ld || "",
        };

        const gsRes = await fetch(appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sheetPayload),
        });
        if (gsRes.ok) {
          sheetsPushed = true;
        }
      } catch (e) {
        console.warn("Google Apps Script webhook error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      runId,
      approval_status: "APPROVED",
      approved_at: nowIso,
      supabaseUpdated,
      sheetsPushed,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to approve run";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
