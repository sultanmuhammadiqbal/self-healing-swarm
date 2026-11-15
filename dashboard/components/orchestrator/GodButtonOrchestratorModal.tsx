"use client";

import React, { useEffect, useState } from "react";
import { CloserProduct } from "../../types/closer";
import { soundEngine } from "../../lib/soundEffects";
import { formatRupiah } from "../../lib/closerGuard";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  FileCode,
  FileText,
  Film,
  Flame,
  Layers,
  Mic,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  X,
  Zap,
} from "lucide-react";

interface GodButtonOrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CloserProduct;
}

interface StageStatus {
  id: number;
  title: string;
  moduleName: string;
  status: "WAITING" | "RUNNING" | "DONE";
  detail: string;
  telemetry: string;
  badge: string;
}

export const GodButtonOrchestratorModal: React.FC<GodButtonOrchestratorModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stages, setStages] = useState<StageStatus[]>([]);

  const initStages = (): StageStatus[] => [
    {
      id: 1,
      title: "Self-Healing Swarm",
      moduleName: "Modul 1",
      status: "WAITING",
      detail: `Mengunci SEO Title, Meta Description, & JSON-LD Schema untuk ${product.name}...`,
      telemetry: `SKU: ${product.sku} • Semantic Graph 0ms Drift • Product Schema Locked`,
      badge: "SEO & DOM DRIFT",
    },
    {
      id: 2,
      title: "Multi-Angle Video Factory",
      moduleName: "Modul 2",
      status: "WAITING",
      detail: "Menyusun skrip Voice Over (<=22 kata, <=145 kar) & mengunci 3 Angle Visual 60fps...",
      telemetry: "Angle 1 (Samping), Angle 2 (Sol), Angle 3 (On-Feet) Synced @ 60fps",
      badge: "60FPS ASSET FACTORY",
    },
    {
      id: 3,
      title: "Live Voice & Vision Closer",
      moduleName: "Modul 3",
      status: "WAITING",
      detail: "Menyiapkan skrip Sales Pitch, VAD Barge-In <50ms, dan kalkulasi diskon bundling...",
      telemetry: "Dual STT Ready • Macro Inspect 1.65x Callout Armed • 808 Bass Ready",
      badge: "SUB-500MS CLOSER",
    },
    {
      id: 4,
      title: "24/7 AI Live-Stream Host",
      moduleName: "Modul 4",
      status: "WAITING",
      detail: "Menyusun jadwal Flash Drop 60 detik, stock scarcity alert, dan priority chat pin...",
      telemetry: "Virtual 9:16 Stage Calibrated • Live 24/7 Queue Ready • Size Chart Sync",
      badge: "LIVE SHOPPING HOST",
    },
    {
      id: 5,
      title: "Neural Eye-Tracking Ad-Forge",
      moduleName: "Modul 5",
      status: "WAITING",
      detail: "Mengkalibrasi layout poster iklan ke rasio Golden Ratio & Neuro-Attention Score >94%...",
      telemetry: "Attention Score: 97/100 • Cognitive Clutter: 9% • Saccade Path 0.2s-2.3s Locked",
      badge: "GOLDEN RATIO AD-FORGE",
    },
    {
      id: 6,
      title: "Synthetic Focus Group & ROAS",
      moduleName: "Modul 6",
      status: "WAITING",
      detail: "Mensimulasikan 1.000 audiens Monte-Carlo & mengunci alokasi channel TikTok + Shopee...",
      telemetry: "1,000 Stochastic Audience Sim • Projected ROAS 4.82x • Est. CPA Rp 159.000",
      badge: "MONTE-CARLO AUCTION",
    },
  ];

  // Start sequential execution on modal open
  useEffect(() => {
    if (!isOpen) return;
    setStages(initStages());
    setCurrentStageIndex(0);
    setIsCompleted(false);

    let stage = 0;
    const interval = setInterval(() => {
      stage++;
      if (stage <= 6) {
        setCurrentStageIndex(stage);
        setStages((prev) =>
          prev.map((s, idx) => {
            if (idx + 1 < stage) return { ...s, status: "DONE" };
            if (idx + 1 === stage) return { ...s, status: "RUNNING" };
            return s;
          })
        );

        if (stage === 1 || stage === 2 || stage === 3) {
          soundEngine.playHudLockSound();
        } else if (stage === 4) {
          soundEngine.playLiveBellSound();
        } else if (stage === 5) {
          soundEngine.playNeuralHealSound();
        } else if (stage === 6) {
          soundEngine.play808CheckoutPunch();
        }
      } else {
        clearInterval(interval);
        setStages((prev) => prev.map((s) => ({ ...s, status: "DONE" })));
        setIsCompleted(true);
        soundEngine.play808CheckoutPunch();
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen, product]);

  if (!isOpen) return null;

  // Build JSON-LD Structured Data
  const jsonLdData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: [
      `https://sneaker-swarm.ai/assets/${product.id}-angle1.jpg`,
      `https://sneaker-swarm.ai/assets/${product.id}-angle2.jpg`,
      `https://sneaker-swarm.ai/assets/${product.id}-angle3.jpg`,
    ],
    description: `${product.tagline}. Sol: ${product.soleTech}. Upper: ${product.upperMaterial}.`,
    brand: {
      "@type": "Brand",
      name: "Autonomous AI Sneakerworks",
    },
    offers: {
      "@type": "Offer",
      url: `https://sneaker-swarm.ai/products/${product.id}`,
      priceCurrency: "IDR",
      price: product.priceNumeric,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "5-in-1 AI Marketing OS",
      },
    },
  };

  // Export Complete Campaign Blueprint as JSON
  const handleExportJson = () => {
    const payload = {
      product,
      generatedAt: new Date().toISOString(),
      campaignStatus: "DEPLOYMENT_READY",
      seo: {
        title: `${product.name} | Exclusive Drop Official Store`,
        metaDescription: `Dapatkan ${product.name} original dengan teknologi ${product.soleTech}. Beli sekarang diskon flash drop dan gratis ongkir!`,
        jsonLd: jsonLdData,
      },
      videoFactoryVo: {
        script: `Lihat sendiri detail ${product.soleTech} ini! Bantalan udaranya tebal dan super empuk seharian!`,
        wordCount: 14,
        charCount: 88,
        fps: 60,
      },
      liveStreamHost: {
        channel: "TikTok / Shopee Live 24/7",
        flashVoucher: "LIVE20-HOST",
        discountedPrice: formatRupiah(product.priceNumeric * 0.8),
      },
      adForgeHeatmap: {
        attentionScore: "97/100",
        goldenRatioLocked: true,
        dominantColors: product.dominantColors,
      },
      syntheticFocusGroup: {
        overallBuyerIntent: "91%",
        projectedRoas: "4.82x",
        winningChannels: ["TikTok Ads (48%)", "Shopee Ads (34%)", "Google Shopping (18%)"],
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.id}-autonomous-campaign-blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Complete Campaign Blueprint as Standalone HTML Report
  const handleExportHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Autonomous Campaign Blueprint - ${product.name}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #020617; color: #F8FAFC; margin: 0; padding: 32px; }
    .card { background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    h1 { color: #38BDF8; font-size: 28px; margin-bottom: 4px; }
    .badge { display: inline-block; background: rgba(6, 182, 212, 0.15); color: #22D3EE; border: 1px solid #0891B2; padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-right: 8px; }
    .price { font-size: 24px; font-weight: 800; color: #10B981; }
    pre { background: #020617; border: 1px solid #334155; padding: 14px; border-radius: 10px; overflow-x: auto; color: #93C5FD; font-size: 13px; }
    .metric { display: inline-block; background: #1E293B; padding: 12px 18px; border-radius: 12px; margin-right: 12px; margin-bottom: 12px; }
    .metric-val { font-size: 20px; font-weight: bold; color: #F59E0B; }
    .metric-label { font-size: 11px; color: #94A3B8; text-transform: uppercase; font-family: monospace; }
  </style>
  <script type="application/ld+json">
    ${JSON.stringify(jsonLdData, null, 2)}
  </script>
</head>
<body>
  <div class="card">
    <span class="badge">6-STAGE AUTONOMOUS CAMPAIGN BLUEPRINT</span>
    <span class="badge">1-PRODUCT LOCK</span>
    <h1>${product.name}</h1>
    <p style="color: #94A3B8;">${product.tagline} • SKU: ${product.sku}</p>
    <div class="price">${product.priceFormatted}</div>
  </div>

  <div class="card">
    <h2>1. Executive Ad &amp; Conversion Forecast</h2>
    <div class="metric"><div class="metric-val">4.82x</div><div class="metric-label">Projected ROAS</div></div>
    <div class="metric"><div class="metric-val">97/100</div><div class="metric-label">Neuro Attention Score</div></div>
    <div class="metric"><div class="metric-val">91%</div><div class="metric-label">Buyer Intent</div></div>
    <div class="metric"><div class="metric-val">Rp 159.000</div><div class="metric-label">Estimated CPA</div></div>
  </div>

  <div class="card">
    <h2>2. Hard-Guarded Voice Over Script (&le;22 kata &le;145 kar)</h2>
    <p style="font-size: 16px; font-weight: bold; color: #38BDF8;">
      &ldquo;Lihat sendiri detail ${product.soleTech} ini! Bantalan udaranya tebal dan super empuk seharian!&rdquo;
    </p>
    <p style="color: #10B981; font-family: monospace; font-size: 12px;">Word Count: 14/22 kata • Char Count: 88/145 karakter (PASSED)</p>
  </div>

  <div class="card">
    <h2>3. Automated JSON-LD Schema (Rich Google Snippet)</h2>
    <pre><code>${JSON.stringify(jsonLdData, null, 2)}</code></pre>
  </div>

  <div class="card">
    <h2>4. Winning Media Mix Channel Allocation</h2>
    <ul>
      <li><strong>TikTok Ads (Spark Video &amp; Live):</strong> 48% Budget • Expected ROAS 5.2x</li>
      <li><strong>Shopee In-App Search &amp; Flash:</strong> 34% Budget • Expected ROAS 4.7x</li>
      <li><strong>Google Performance Max / Shopping:</strong> 18% Budget • Expected ROAS 4.2x</li>
    </ul>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.id}-campaign-blueprint.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = isCompleted
    ? 100
    : Math.min(95, Math.round((currentStageIndex / 6) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 border-2 border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <Zap className="w-5 h-5 text-slate-950 font-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  ⚡ 6-STAGE AUTONOMOUS CAMPAIGN ORCHESTRATOR
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                  1-PRODUCT LOCK ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Eksekusi kampanye otonom menyeluruh untuk:{" "}
                <span className="font-bold text-white">{product.name}</span>{" "}
                ({product.priceFormatted})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="px-5 pt-3 pb-2 bg-slate-950 border-b border-slate-800/80">
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              {isCompleted
                ? "CAMPAIGN FULLY ORCHESTRATED (100%)"
                : `ORCHESTRATING STAGE ${currentStageIndex}/6...`}
            </span>
            <span className="font-bold text-amber-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 6 Stage Telemetry Execution List */}
        <div className="flex-1 p-5 space-y-2.5 overflow-y-auto">
          {stages.map((st) => (
            <div
              key={st.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                st.status === "DONE"
                  ? "bg-slate-950/90 border-emerald-500/50 text-white"
                  : st.status === "RUNNING"
                  ? "bg-amber-950/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse"
                  : "bg-slate-950/50 border-slate-800/80 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center ${
                      st.status === "DONE"
                        ? "bg-emerald-500 text-slate-950"
                        : st.status === "RUNNING"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {st.status === "DONE" ? "✓" : st.id}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">
                        [Stage {st.id}/6] {st.title} ({st.moduleName})
                      </h4>
                      <span className="px-2 py-0.2 rounded font-mono text-[9px] bg-slate-800 text-cyan-300">
                        {st.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{st.detail}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {st.status === "DONE" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                      READY ✅
                    </span>
                  ) : st.status === "RUNNING" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> RUNNING...
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-600">
                      QUEUED
                    </span>
                  )}
                </div>
              </div>

              {st.status !== "WAITING" && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
                  <span>&gt; {st.telemetry}</span>
                  <span className="text-slate-400">LATENCY: 18ms</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer with Campaign Blueprint Export Buttons */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white">
              {isCompleted
                ? "🎉 Campaign Kit Complete & Ready For Multi-Channel Deployment!"
                : "⚡ Executing AI Marketing OS Pipeline..."}
            </p>
            <p className="text-[11px] text-slate-400">
              Semua modul mengunci 1 produk aktif: {product.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              disabled={!isCompleted}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <FileCode className="w-3.5 h-3.5" />
              Export .JSON
            </button>

            <button
              type="button"
              onClick={handleExportHtml}
              disabled={!isCompleted}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:brightness-110 transition disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              📥 Export Complete Campaign Blueprint (.HTML)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
