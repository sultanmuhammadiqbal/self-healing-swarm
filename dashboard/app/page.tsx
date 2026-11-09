"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  Code2,
  Cpu,
  Database,
  Eye,
  FileCheck2,
  Film,
  Flame,
  GitCompare,
  Globe,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Send,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import VideoFactoryView from "./components/VideoFactoryView";

interface DraftSolution {
  title_tag: string;
  meta_description: string;
  ad_copy_headline: string;
  ad_copy_body: string;
  schema_json_ld?: string;
  reasoning: string;
}

interface DebateEntry {
  round: number;
  agent: string;
  action: string;
  severity?: string;
  reason?: string;
  product?: string;
  scraped_title?: string;
  scraped_h1?: string;
  detected_price?: string;
  flaws_detected?: string[];
  search_intent_gap?: string;
  draft?: DraftSolution;
  title_length?: number;
  meta_length?: number;
  score?: number;
  critique?: string;
  required_fixes?: string[];
  final_status?: string;
}

interface DiagnosticData {
  scraped_title?: string;
  scraped_h1?: string;
  scraped_meta_desc?: string;
  detected_price?: string;
  schema_detected?: boolean;
  detected_flaws?: string[];
  key_features?: string[];
  search_intent_gap?: string;
}

interface SwarmRunLog {
  id?: string;
  timestamp: string;
  product_name: string;
  target_url: string;
  issue_type: string;
  metric_summary?: Record<string, string | number>;
  diagnostic_data?: DiagnosticData;
  final_status: string;
  total_rounds: number;
  critic_score: number;
  final_solution: DraftSolution;
  debate_history: DebateEntry[];
  approval_status?: string;
  approved_at?: string;
}

interface MonitoredProduct {
  product_name: string;
  url: string;
  previous_ctr: string;
  current_ctr: string;
  impressions: string;
  status: string;
  target_keyword: string;
  drop_percentage: string;
  is_anomaly: boolean;
}

interface IntegrationsStatus {
  supabaseConnected: boolean;
  sheetsWebhookConnected: boolean;
  discordConnected: boolean;
  telegramConnected: boolean;
}

export default function NasaSwarmCommandCenter() {
  const [logs, setLogs] = useState<SwarmRunLog[]>([]);
  const [monitoredProducts, setMonitoredProducts] = useState<MonitoredProduct[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsStatus>({
    supabaseConnected: false,
    sheetsWebhookConnected: false,
    discordConnected: false,
    telegramConnected: false,
  });
  const [selectedRunIdx, setSelectedRunIdx] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<number>(4);
  const [selectedTargetUrl, setSelectedTargetUrl] = useState<string>("");
  const [customLiveUrl, setCustomLiveUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [activeReplayNode, setActiveReplayNode] = useState<number | null>(null);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/swarm");
      const data = await res.json();
      setLogs(data.logs || []);
      setMonitoredProducts(data.monitoredProducts || []);
      if (data.integrations) {
        setIntegrations(data.integrations);
      }
      if (!selectedTargetUrl && data.monitoredProducts?.length > 0) {
        const firstAnomaly = data.monitoredProducts.find(
          (p: MonitoredProduct) => p.is_anomaly
        );
        setSelectedTargetUrl(
          firstAnomaly ? firstAnomaly.url : data.monitoredProducts[0].url
        );
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const triggerLiveSwarm = async (overrideUrl?: string) => {
    const urlToRun = (overrideUrl ?? (customLiveUrl.trim() || selectedTargetUrl)).trim();
    setIsTriggering(true);
    setActiveReplayNode(1);

    const pulseTimer = setInterval(() => {
      setActiveReplayNode((prev) => {
        if (prev === null || prev >= 5) return 1;
        return prev + 1;
      });
    }, 2200);

    try {
      let data: any = null;
      try {
        const res = await fetch("/api/swarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: urlToRun }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        // fallback to live-heal
      }

      if (!data || !data.logs || data.logs.length === 0) {
        const healRes = await fetch("/api/swarm/live-heal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: urlToRun }),
        });
        data = await healRes.json();
      }

      if (data?.logs && data.logs.length > 0) {
        setLogs(data.logs);
        setSelectedRunIdx(0);
      }
      if (data?.monitoredProducts) {
        setMonitoredProducts(data.monitoredProducts);
      }
      if (customLiveUrl.trim()) {
        setCustomLiveUrl("");
      }
    } catch (err) {
      console.error("Error running swarm:", err);
    } finally {
      clearInterval(pulseTimer);
      setActiveReplayNode(null);
      setIsTriggering(false);
    }
  };

  const handleApproveRun = async (runId?: string) => {
    if (!runId) return;
    setIsApprovingId(runId);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs((prev) =>
          prev.map((item) =>
            item.id === runId
              ? {
                  ...item,
                  approval_status: "APPROVED",
                  approved_at: data.approved_at,
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Error approving run:", err);
    } finally {
      setIsApprovingId(null);
    }
  };

  const [activeModule, setActiveModule] = useState<"swarm" | "factory">("swarm");
  const [factoryProduct, setFactoryProduct] = useState<{
    product_name?: string;
    url?: string;
    price?: string;
    features?: string;
    copywriting?: string;
  }>({
    product_name: "AeroStreet Vulcan X-Pro",
    url: "https://aerostreet.id/products/vulcan-xpro",
    price: "Rp 249.000",
    features: "Sol Nitro-Bounce ultra empuk, breathable carbon mesh, anti-slip grip",
    copywriting: "Kaki anti-pegal pakai AeroStreet Vulcan X-Pro! Sol Nitro-Bounce ultra empuk seharian.",
  });

  const handleTriggerVideoFactory = (run?: SwarmRunLog) => {
    if (!run) return;
    const name = run.product_name || "Produk Pilihan";
    const url = run.target_url || "";
    const price = run.diagnostic_data?.detected_price || "Rp 249.000";
    const features =
      run.diagnostic_data?.key_features?.join(", ") ||
      run.final_solution?.ad_copy_headline ||
      "Bahan Premium Berkualitas, Tahan Lama, Garansi Resmi";
    const copywriting =
      run.final_solution?.ad_copy_headline ||
      run.final_solution?.title_tag ||
      "";

    setFactoryProduct({
      product_name: name,
      url,
      price,
      features,
      copywriting,
    });
    setActiveModule("factory");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const replayDagAnimation = () => {
    if (activeReplayNode !== null) return;
    const sequence = [1, 2, 3, 4, 3, 4, 5];
    let i = 0;
    setActiveReplayNode(sequence[0]);
    setSelectedNode(sequence[0]);
    const interval = setInterval(() => {
      i += 1;
      if (i < sequence.length) {
        setActiveReplayNode(sequence[i]);
        setSelectedNode(sequence[i]);
      } else {
        clearInterval(interval);
        setActiveReplayNode(null);
      }
    }, 950);
  };

  const currentRun = logs[selectedRunIdx] || null;
  const debateHistory = currentRun?.debate_history || [];

  const roundsMap = new Map<
    number,
    { draft?: DebateEntry; review?: DebateEntry }
  >();
  debateHistory.forEach((item) => {
    if (item.round >= 1) {
      const existing = roundsMap.get(item.round) || {};
      if (item.action === "SUBMIT_DRAFT") {
        existing.draft = item;
      } else if (item.action.startsWith("REVIEW_")) {
        existing.review = item;
      }
      roundsMap.set(item.round, existing);
    }
  });
  const roundsList = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);

  const watcherEntry = debateHistory.find((d) => d.action === "TRIGGER_INCIDENT");
  const diagEntry = debateHistory.find((d) => d.action === "DIAGNOSIS_COMPLETE");
  const diagData = currentRun?.diagnostic_data || {
    scraped_title:
      diagEntry?.scraped_title ||
      "Beli Meja Kantor Online Termurah Paling Bagus No. 1",
    scraped_h1: diagEntry?.scraped_h1 || "Meja Kantor Keren Banget",
    detected_price: diagEntry?.detected_price || "Rp 3.299.000",
    detected_flaws: diagEntry?.flaws_detected || [],
    search_intent_gap: diagEntry?.search_intent_gap || "",
  };

  const anomaliesCount = monitoredProducts.filter((p) => p.is_anomaly).length;
  const currentApprovalStatus = currentRun?.approval_status || "PENDING";

  const nodesConfig = [
    {
      id: 1,
      code: "NODE 01",
      title: "WATCHER AGENT",
      subtitle: "Groq GPT-OSS-120B Sentinel",
      role: "Deteksi CTR Drop > 30% & Live URL Audit",
      icon: Eye,
      color: "emerald",
      status: watcherEntry ? `INCIDENT (${watcherEntry.severity})` : "STANDBY",
    },
    {
      id: 2,
      code: "NODE 02",
      title: "DIAGNOSTIC AGENT",
      subtitle: "Jina Reader + HTML DOM + Gemini 2.5",
      role: "Live URL Scraper & Root Cause Auditor",
      icon: Search,
      color: "amber",
      status: `${(diagData.detected_flaws || []).length} FLAWS FOUND`,
    },
    {
      id: 3,
      code: "NODE 03",
      title: "EXECUTION AGENT",
      subtitle: "Gemini 2.5 (Multi-LLM Failover)",
      role: "Drafting Meta, Ad Copy & JSON-LD",
      icon: Sparkles,
      color: "cyan",
      status: `${currentRun?.total_rounds || 0} DRAFTS BUILT`,
    },
    {
      id: 4,
      code: "NODE 04",
      title: "CRITIC AGENT",
      subtitle: "Groq 120B + Python Hard-Guard",
      role: "Strict SEO & Brand Compliance Sensor",
      icon: Scale,
      color: "purple",
      status: `SCORE: ${currentRun?.critic_score || 0}/100`,
    },
    {
      id: 5,
      code: "NODE 05",
      title: "WRITER & WEBHOOK",
      subtitle: "Supabase + Sheets + Discord/TG",
      role: "Cloud Persistence & 1-Click Approval",
      icon: Database,
      color: "blue",
      status: `APPROVAL: ${currentApprovalStatus}`,
    },
  ];

  const copySchemaToClipboard = () => {
    const schemaText = currentRun?.final_solution?.schema_json_ld || "";
    if (!schemaText) return;
    navigator.clipboard.writeText(schemaText);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 pb-16">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#050811] to-[#050811] z-0" />

      {/* 🚀 AUTONOMOUS AI MARKETING OS — MASTER UNIFIED NAVBAR */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#060a16]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider text-white font-mono">
                  AUTONOMOUS AI MARKETING OS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  UNIFIED v3.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Self-Healing SEO & Ad Swarm ⟷ Zero-Touch 60fps Video Factory
              </p>
            </div>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveModule("swarm")}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer ${
                activeModule === "swarm"
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>MODUL 1: 🛡️ SEO & AD SWARM</span>
            </button>
            <button
              onClick={() => setActiveModule("factory")}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer ${
                activeModule === "factory"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Film className="h-4 w-4" />
              <span>MODUL 2: 🎬 60FPS VIDEO FACTORY</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 font-mono text-[10px]">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Swarm DAG: ONLINE
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              Remotion 60fps: READY
            </span>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Bridge Link: ACTIVE
            </span>
          </div>
        </div>
      </nav>

      {activeModule === "factory" ? (
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <VideoFactoryView initialProduct={factoryProduct} />
        </main>
      ) : (
        <>
          {/* NASA COMMAND HEADER */}
          <header className="sticky top-[61px] z-30 border-b border-slate-800/80 bg-[#070b17]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Cpu className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  DAG v2.0 Cloud Ready
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/90 text-slate-300 border border-slate-700">
                  <Cloud className="h-3 w-3 text-cyan-400" />
                  {integrations.supabaseConnected ? "Supabase Cloud DB" : "Local JSON Fallback"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                THE SELF-HEALING AD & SEO SWARM
              </h1>
            </div>
          </div>

          {/* Live Action & Custom URL Input Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTargetUrl}
              onChange={(e) => setSelectedTargetUrl(e.target.value)}
              disabled={isTriggering}
              className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {monitoredProducts.map((p) => (
                <option key={p.url} value={p.url}>
                  {p.is_anomaly ? "🚨 " : "🟢 "}
                  {p.product_name} ({p.drop_percentage})
                </option>
              ))}
            </select>

            <div className="relative flex items-center">
              <Globe className="h-3.5 w-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="url"
                value={customLiveUrl}
                onChange={(e) => setCustomLiveUrl(e.target.value)}
                placeholder="Atau paste URL produk live (https://...)"
                disabled={isTriggering}
                className="bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 font-mono w-64 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={replayDagAnimation}
              disabled={isTriggering || activeReplayNode !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 text-cyan-400" />
              Simulasi DAG
            </button>

            <button
              onClick={() => triggerLiveSwarm()}
              disabled={isTriggering}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition cursor-pointer disabled:opacity-60"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Swarm Sedang Berdebat...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  Trigger Live Swarm
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* TOP KPI TELEMETRY CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>MONITORED URL FLEET</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {monitoredProducts.length} Produk
              </span>
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                {anomaliesCount} Bocor / Disapproved
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Sumber: Google Sheets API / GSC Telemetry
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>TARGET INCIDENT DROP</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-400">
                {currentRun?.metric_summary?.drop_percentage || "-42.9%"}
              </span>
              <span className="text-xs font-mono text-slate-300">
                {currentRun?.metric_summary?.previous_ctr || "4.2%"} ➜{" "}
                {currentRun?.metric_summary?.current_ctr || "2.4%"}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 truncate">
              {currentRun?.product_name || "Ergonomic Electric Standing Desk Pro"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>DEBATE CONSENSUS LOOP</span>
              <RotateCcw className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {currentRun?.total_rounds || 1} Putaran
              </span>
              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                Max 3x Circuit Breaker
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Gemini 2.5 Flash ⚔️ Groq GPT-OSS 120B
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>CRITIC SCORE & APPROVAL</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400">
                {currentRun?.critic_score || 92}/100
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  currentApprovalStatus === "APPROVED"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}
              >
                {currentApprovalStatus === "APPROVED"
                  ? "PUSHED TO SHEETS"
                  : "PENDING APPROVAL"}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Title &lt;= 60 chars • Meta 120-155 chars • JSON-LD
            </p>
          </div>
        </section>

        {/* NASA VISUAL NODE GRAPH (DAG TOPOLOGY) */}
        <section className="rounded-2xl border border-slate-800 bg-[#080d1a]/90 p-5 sm:p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400">
                  Directed Acyclic Graph (DAG) — Autonomous State Machine Topology
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik pada salah satu Node di bawah untuk membedah memori State & payload input/output secara real-time.
              </p>
            </div>

            {/* Run Selector Pills */}
            {logs.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs font-mono text-slate-400 mr-1">
                  Audit Run History:
                </span>
                {logs.map((log, idx) => (
                  <button
                    key={log.id || idx}
                    onClick={() => setSelectedRunIdx(idx)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      selectedRunIdx === idx
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-800/70 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>#{logs.length - idx}</span>
                    <span className="truncate max-w-[110px]">
                      {log.product_name}
                    </span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        log.approval_status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {log.approval_status === "APPROVED" ? "APPROVED" : "PENDING"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5 NODES PIPELINE */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
            {nodesConfig.map((node, idx) => {
              const IconComponent = node.icon;
              const isSelected = selectedNode === node.id;
              const isReplaying = activeReplayNode === node.id;

              return (
                <div key={node.id} className="relative flex flex-col">
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    className={`w-full text-left rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden ${
                      isReplaying
                        ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-[1.02]"
                        : isSelected
                        ? "border-cyan-500/70 bg-slate-900/95 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {node.code}
                      </span>
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                          isSelected || isReplaying
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                            : "bg-slate-800/80 border-slate-700 text-slate-400"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {node.title}
                    </h3>
                    <p className="text-[11px] font-mono text-cyan-400/90 mt-0.5">
                      {node.subtitle}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {node.role}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        TELEMETRY
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-emerald-400">
                        {node.status}
                      </span>
                    </div>
                  </button>

                  {idx < nodesConfig.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                      <div className="h-6 w-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cyclic Debate Loop Banner */}
          <div className="mt-4 rounded-xl bg-purple-950/20 border border-purple-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-mono">
              <RotateCcw
                className="h-4 w-4 text-purple-400 animate-spin"
                style={{ animationDuration: "8s" }}
              />
              <span>
                FEEDBACK LOOP CIRCUIT (NODE 04 ➜ NODE 03): Critic Agent menolak draf yang melanggar batas karakter & memaksa revisi otomatis (Maks 3x Loop).
              </span>
            </div>
            <span className="font-mono text-[11px] bg-purple-500/20 text-purple-200 px-2.5 py-0.5 rounded border border-purple-500/40">
              Run ini menempuh {currentRun?.total_rounds || 1} iterasi debat
            </span>
          </div>

          {/* LIVE NODE INSPECTOR DRAWER */}
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  INSPECTING {nodesConfig[selectedNode - 1]?.code}:{" "}
                  {nodesConfig[selectedNode - 1]?.title}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Engine: {nodesConfig[selectedNode - 1]?.subtitle}
              </span>
            </div>

            {selectedNode === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 rounded-lg bg-slate-900/70 p-3.5 border border-slate-800">
                  <div className="font-mono text-emerald-400 font-semibold">
                    🟢 SENTINEL TRIGGER PAYLOAD
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {watcherEntry?.reason ||
                      "Penurunan CTR melampaui ambang batas -30% pada produk utama dengan impresi tinggi."}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 font-mono text-[11px]">
                    <span className="px-2 py-1 rounded bg-slate-800 text-cyan-300">
                      Severity: {watcherEntry?.severity || "HIGH"}
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800 text-rose-300">
                      CTR: {currentRun?.metric_summary?.previous_ctr || "4.2%"} ➜{" "}
                      {currentRun?.metric_summary?.current_ctr || "2.4%"}
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                      Impressions:{" "}
                      {currentRun?.metric_summary?.impressions || "18,450"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg bg-slate-900/70 p-3.5 border border-slate-800">
                  <div className="font-mono text-slate-400 font-semibold">
                    TARGET KEYWORD & URL DISPATCHED
                  </div>
                  <div className="font-mono text-white text-sm">
                    &ldquo;
                    {currentRun?.metric_summary?.target_keyword ||
                      "meja kerja berdiri ergonomis dual motor"}
                    &rdquo;
                  </div>
                  <div className="text-slate-400 font-mono break-all">
                    URL: {currentRun?.target_url}
                  </div>
                </div>
              </div>
            )}

            {selectedNode === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 rounded-lg bg-slate-900/70 p-3.5 border border-slate-800">
                  <div className="font-mono text-amber-400 font-semibold">
                    🔍 ON-PAGE SCRAPED METADATA (BEFORE HEALING)
                  </div>
                  <div className="space-y-1.5 text-slate-300">
                    <div>
                      <span className="text-slate-400 font-mono">
                        Scraped Title:{" "}
                      </span>
                      <span className="text-rose-300 font-medium">
                        {diagData.scraped_title}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono">
                        Scraped H1:{" "}
                      </span>
                      <span className="text-amber-200">
                        {diagData.scraped_h1}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono">
                        Detected Price:{" "}
                      </span>
                      <span className="text-emerald-300 font-mono">
                        {diagData.detected_price}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono">
                        Search Intent Gap:{" "}
                      </span>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        {diagData.search_intent_gap}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg bg-slate-900/70 p-3.5 border border-slate-800">
                  <div className="font-mono text-rose-400 font-semibold">
                    🚨 DETECTED SEO & CONVERSION FLAWS
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {(diagData.detected_flaws || []).map((flaw, i) => (
                      <li key={i} className="leading-relaxed">
                        {flaw}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {selectedNode === 3 && (
              <div className="space-y-3 text-xs">
                <div className="font-mono text-cyan-400 font-semibold">
                  ✍️ EXECUTION AGENT FINAL APPROVED PAYLOAD
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-mono block mb-1">
                      Optimized Title Tag (
                      {currentRun?.final_solution?.title_tag?.length || 0}/60
                      chars):
                    </span>
                    <p className="text-white font-semibold text-sm">
                      {currentRun?.final_solution?.title_tag}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 font-mono block mb-1">
                      Optimized Meta Description (
                      {currentRun?.final_solution?.meta_description?.length || 0}
                      /155 chars):
                    </span>
                    <p className="text-slate-200">
                      {currentRun?.final_solution?.meta_description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedNode === 4 && (
              <div className="space-y-2 text-xs">
                <div className="font-mono text-purple-400 font-semibold">
                  ⚖️ CRITIC AGENT FINAL VERDICT (GROQ 120B + PYTHON HARD-GUARD)
                </div>
                <p className="text-slate-200 leading-relaxed bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                  {roundsList[roundsList.length - 1]?.[1]?.review?.critique ||
                    "Semua elemen memenuhi standar ketat SEO & compliance."}
                </p>
              </div>
            )}

            {selectedNode === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-mono text-cyan-400 font-semibold mb-1">
                    ☁️ Supabase `swarm_audit_logs`
                  </div>
                  <p className="text-slate-400">
                    Status:{" "}
                    {integrations.supabaseConnected
                      ? "Connected (Cloud Sync Active)"
                      : "Fallback Local JSON Active (`supabase_schema.sql` Ready)"}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-mono text-emerald-400 font-semibold mb-1">
                    📊 Google Sheets Approval Queue
                  </div>
                  <p className="text-slate-400">
                    Status:{" "}
                    {integrations.sheetsWebhookConnected
                      ? "Apps Script Webhook Connected"
                      : "Local CSV + Ready for Apps Script URL"}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-mono text-purple-400 font-semibold mb-1">
                    🔔 Instant Webhook Alerts
                  </div>
                  <p className="text-slate-400">
                    Discord:{" "}
                    {integrations.discordConnected ? "Active" : "Standby"} •
                    Telegram:{" "}
                    {integrations.telegramConnected ? "Active" : "Standby"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MULTI-AGENT DEBATE ARENA & BEFORE/AFTER COMPARISON */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: ROUND-BY-ROUND DEBATE LOGS */}
          <section className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#080d1a]/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Flame className="h-5 w-5 text-orange-400" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Multi-Agent Debate Arena (Execution ⚔️ Critic)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Rekaman bagaimana Critic Agent menolak draf yang kepanjangan sampai mencapai konsensus
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {roundsList.length} Iterasi
              </span>
            </div>

            <div className="space-y-5">
              {roundsList.map(([roundNum, pair]) => {
                const draft = pair.draft?.draft;
                const review = pair.review;
                const titleLen = draft?.title_tag?.length || 0;
                const metaLen = draft?.meta_description?.length || 0;
                const isApproved = review?.action === "REVIEW_APPROVED";

                return (
                  <div
                    key={roundNum}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
                  >
                    <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        PUTARAN DEBAT #{roundNum}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                          isApproved
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {isApproved
                          ? `✅ LOLOS SENSOR (SKOR: ${review?.score}/100)`
                          : `❌ DITOLAK / REVISE (SKOR: ${review?.score}/100)`}
                      </span>
                    </div>

                    <div className="p-4 space-y-4 text-xs">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-cyan-400 font-mono font-semibold">
                          <Bot className="h-4 w-4" />
                          <span>
                            {pair.draft?.agent || "Execution Agent"} — Mengajukan Draf #{roundNum}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90">
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                              <span>TITLE TAG</span>
                              <span
                                className={
                                  titleLen <= 60
                                    ? "text-emerald-400"
                                    : "text-rose-400 font-bold"
                                }
                              >
                                {titleLen}/60 chars{" "}
                                {titleLen <= 60 ? "✓" : "⚠️ OVERFLOW"}
                              </span>
                            </div>
                            <p className="text-white font-medium">
                              {draft?.title_tag}
                            </p>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90">
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                              <span>META DESCRIPTION</span>
                              <span
                                className={
                                  metaLen >= 120 && metaLen <= 155
                                    ? "text-emerald-400"
                                    : "text-rose-400 font-bold"
                                }
                              >
                                {metaLen}/155 chars{" "}
                                {metaLen >= 120 && metaLen <= 155
                                  ? "✓"
                                  : "⚠️ OUT OF RANGE"}
                              </span>
                            </div>
                            <p className="text-slate-300">
                              {draft?.meta_description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {review && (
                        <div
                          className={`p-3.5 rounded-lg border ${
                            isApproved
                              ? "bg-emerald-950/15 border-emerald-500/30"
                              : "bg-rose-950/15 border-rose-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-mono font-semibold mb-1.5">
                            <Scale
                              className={`h-4 w-4 ${
                                isApproved ? "text-emerald-400" : "text-rose-400"
                              }`}
                            />
                            <span
                              className={
                                isApproved ? "text-emerald-300" : "text-rose-300"
                              }
                            >
                              Critic Agent (Groq 120B) — Putusan Audit:
                            </span>
                          </div>
                          <p className="text-slate-200 leading-relaxed">
                            {review.critique}
                          </p>

                          {review.required_fixes &&
                            review.required_fixes.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-rose-500/20">
                                <span className="text-[11px] font-mono font-semibold text-amber-300 block mb-1">
                                  Perbaikan Wajib Sebelum Boleh Publish:
                                </span>
                                <ul className="space-y-1 text-amber-200/90 list-disc list-inside">
                                  {review.required_fixes.map((fix, idx) => (
                                    <li key={idx}>{fix}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* RIGHT 5 COLS: BEFORE VS AFTER, 1-CLICK APPROVE & JSON-LD SCHEMA */}
          <section className="lg:col-span-5 space-y-6">
            {/* Before vs After + 1-Click Approve Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#080d1a]/90 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <GitCompare className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Before vs. After Self-Healing
                    </h2>
                    <p className="text-xs text-slate-400">
                      Review hasil akhir & push ke Production / Google Sheets
                    </p>
                  </div>
                </div>
              </div>

              {/* BEFORE */}
              <div className="p-3.5 rounded-xl bg-rose-950/15 border border-rose-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-rose-400">
                    ❌ BEFORE (LIVE PAGE LAMA)
                  </span>
                  <span className="font-mono text-[11px] text-rose-300">
                    CTR Drop{" "}
                    {currentRun?.metric_summary?.drop_percentage || "-42.9%"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">
                    Title Tag Lama:
                  </span>
                  <p className="text-rose-200 line-through">
                    {diagData.scraped_title ||
                      "Beli Meja Kantor Online Termurah Paling Bagus No. 1"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">
                    H1 / Meta Lama:
                  </span>
                  <p className="text-slate-400">
                    {diagData.scraped_h1} — Tanpa UVP, klaim clickbait, & tidak ada JSON-LD Schema.
                  </p>
                </div>
              </div>

              {/* AFTER */}
              <div className="p-3.5 rounded-xl bg-emerald-950/15 border border-emerald-500/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400">
                    ✅ AFTER (SWARM OPTIMIZED SOLUTION)
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300">
                    Skor Sensor: {currentRun?.critic_score || 92}/100
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">
                    Title Tag Baru:
                  </span>
                  <p className="text-white font-semibold text-sm">
                    {currentRun?.final_solution?.title_tag}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">
                    Meta Description Baru:
                  </span>
                  <p className="text-emerald-100 leading-relaxed">
                    {currentRun?.final_solution?.meta_description}
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-500/20">
                  <span className="text-slate-400 font-mono block">
                    Google / Meta Ad Copy:
                  </span>
                  <p className="text-cyan-300 font-semibold mt-0.5">
                    {currentRun?.final_solution?.ad_copy_headline}
                  </p>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {currentRun?.final_solution?.ad_copy_body}
                  </p>
                </div>
              </div>

              {/* TAHAP B: 1-CLICK APPROVE & PUSH TO PRODUCTION / SHEETS BUTTON */}
              {currentRun && (
                <div className="pt-2">
                  {currentApprovalStatus === "APPROVED" ? (
                    <div className="space-y-2">
                      <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>
                          APPROVED & PUSHED TO PRODUCTION / SHEETS
                        </span>
                      </div>
                      <button
                        onClick={() => handleTriggerVideoFactory(currentRun)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-mono text-xs font-bold shadow-[0_0_25px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                        <span>🎬 Generate 60fps Promo Video from Approved SEO</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApproveRun(currentRun.id)}
                      disabled={isApprovingId === currentRun.id}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                    >
                      {isApprovingId === currentRun.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Pushing to Supabase & Google Sheets...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          ⚡ Approve & Push to Production/Sheets
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Generated JSON-LD Schema Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#080d1a]/90 p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Auto-Generated JSON-LD Product Schema
                  </h3>
                </div>
                <button
                  onClick={copySchemaToClipboard}
                  className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                >
                  {copiedSchema ? "✓ Copied!" : "Copy JSON-LD"}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56">
                {currentRun?.final_solution?.schema_json_ld ||
                  '{\n  "@context": "https://schema.org/",\n  "@type": "Product"\n}'}
              </pre>
            </div>
          </section>
        </div>

        {/* MONITORED FLEET TABLE */}
        <section className="rounded-2xl border border-slate-800 bg-[#080d1a]/90 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Live GSC & Ads Telemetry Feed (`data/gsc_sample.csv` / Google Sheets)
                </h2>
                <p className="text-xs text-slate-400">
                  Watcher Agent memindai tabel ini setiap pagi. Klik &ldquo;Heal URL&rdquo; untuk langsung menerjunkan Swarm pada produk mana pun.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-3">Produk</th>
                  <th className="py-3 px-3">Target Keyword</th>
                  <th className="py-3 px-3">CTR Sebelumnya</th>
                  <th className="py-3 px-3">CTR Sekarang</th>
                  <th className="py-3 px-3">Delta Drop</th>
                  <th className="py-3 px-3">Impresi</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi Otonom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {monitoredProducts.map((prod) => (
                  <tr
                    key={prod.url}
                    className="hover:bg-slate-900/50 transition"
                  >
                    <td className="py-3 px-3 font-medium text-white">
                      <div>{prod.product_name}</div>
                      <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                        {prod.url}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {prod.target_keyword}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {prod.previous_ctr}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200 font-semibold">
                      {prod.current_ctr}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          prod.is_anomaly
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {prod.drop_percentage}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {Number(prod.impressions).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          prod.status === "DISAPPROVED"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {prod.is_anomaly ? (
                        <button
                          onClick={() => {
                            setSelectedTargetUrl(prod.url);
                            triggerLiveSwarm(prod.url);
                          }}
                          disabled={isTriggering}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="h-3 w-3" />
                          Heal URL
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-400">
                          ✓ Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
        </>
      )}
    </div>
  );
}
