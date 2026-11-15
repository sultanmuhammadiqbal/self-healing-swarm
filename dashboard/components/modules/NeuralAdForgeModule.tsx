"use client";

import React, { useEffect, useRef, useState } from "react";
import { CloserProduct } from "../../types/closer";
import { soundEngine } from "../../lib/soundEffects";
import { formatRupiah } from "../../lib/closerGuard";
import {
  Activity,
  CheckCircle2,
  Download,
  Eye,
  Flame,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

interface NeuralAdForgeModuleProps {
  activeProduct: CloserProduct;
  allProducts: CloserProduct[];
  onSelectProduct: (prod: CloserProduct) => void;
}

export type AdLayoutId = "v1-cluttered" | "v2-center" | "v3-neuro";

interface FixationPoint {
  step: string;
  time: string;
  x: number; // 0-600 canvas space
  y: number; // 0-600 canvas space
  radius: number;
  intensity: number; // 0.4 - 1.0
  label: string;
}

interface LayoutMetrics {
  id: AdLayoutId;
  name: string;
  badge: string;
  overallScore: number;
  productFocusPct: number;
  ctaVisibilityPct: number;
  clutterIndexPct: number;
  clutterVerdict: string;
  fixations: FixationPoint[];
  diagnosis: string;
}

const LAYOUT_CONFIGS: Record<AdLayoutId, LayoutMetrics> = {
  "v1-cluttered": {
    id: "v1-cluttered",
    name: "Layout v1: Cluttered / Unoptimized (Low Score)",
    badge: "UNOPTIMIZED • LEAKING ATTENTION",
    overallScore: 52,
    productFocusPct: 44,
    ctaVisibilityPct: 38,
    clutterIndexPct: 71,
    clutterVerdict: "HIGH COGNITIVE NOISE",
    diagnosis:
      "Perhatian visual bocor ke teks sudut kiri atas dan badge dekoratif. Produk terlalu kecil di pinggir dan tombol CTA tenggelam karena kontras rendah.",
    fixations: [
      {
        step: "①",
        time: "0.2s",
        x: 115,
        y: 85,
        radius: 68,
        intensity: 0.95,
        label: "Distractor Corner Badge",
      },
      {
        step: "②",
        time: "0.8s",
        x: 490,
        y: 120,
        radius: 58,
        intensity: 0.78,
        label: "Secondary Noise Stamp",
      },
      {
        step: "③",
        time: "1.5s",
        x: 410,
        y: 350,
        radius: 62,
        intensity: 0.65,
        label: "Off-Center Product",
      },
      {
        step: "④",
        time: "2.3s",
        x: 160,
        y: 520,
        radius: 45,
        intensity: 0.5,
        label: "Low-Contrast CTA",
      },
    ],
  },
  "v2-center": {
    id: "v2-center",
    name: "Layout v2: Center Hero Split",
    badge: "BALANCED • STANDARD COMMERCIAL",
    overallScore: 79,
    productFocusPct: 78,
    ctaVisibilityPct: 74,
    clutterIndexPct: 28,
    clutterVerdict: "MODERATE CLUTTER",
    diagnosis:
      "Visual produk sudah di tengah, namun kontras rim-light dan hirarki Golden Ratio antara Harga & tombol CTA masih bisa ditingkatkan.",
    fixations: [
      {
        step: "①",
        time: "0.2s",
        x: 300,
        y: 110,
        radius: 72,
        intensity: 0.88,
        label: "Top Headline",
      },
      {
        step: "②",
        time: "0.8s",
        x: 300,
        y: 295,
        radius: 95,
        intensity: 0.96,
        label: "Center Sneaker Hero",
      },
      {
        step: "③",
        time: "1.5s",
        x: 190,
        y: 485,
        radius: 64,
        intensity: 0.78,
        label: "Price Tag Box",
      },
      {
        step: "④",
        time: "2.3s",
        x: 420,
        y: 485,
        radius: 68,
        intensity: 0.82,
        label: "CTA Button",
      },
    ],
  },
  "v3-neuro": {
    id: "v3-neuro",
    name: "Layout v3: Neuro-Optimized Golden Ratio",
    badge: "GOLDEN RATIO • 97/100 NEURO-LOCKED",
    overallScore: 97,
    productFocusPct: 96,
    ctaVisibilityPct: 95,
    clutterIndexPct: 9,
    clutterVerdict: "ULTRA-CLEAN FOCAL LOCK",
    diagnosis:
      "Golden Ratio (1.618) terkunci sempurna! Mata manusia langsung tertuju ke siluet utama produk dalam 0.2 detik, mengalir ke Headline, Harga Diskon, dan mengunci tombol CTA!",
    fixations: [
      {
        step: "①",
        time: "0.2s",
        x: 300,
        y: 265,
        radius: 118,
        intensity: 1.0,
        label: "Primary Hero Sneaker Lock",
      },
      {
        step: "②",
        time: "0.8s",
        x: 300,
        y: 92,
        radius: 82,
        intensity: 0.9,
        label: "High-Contrast Hook",
      },
      {
        step: "③",
        time: "1.5s",
        x: 300,
        y: 425,
        radius: 78,
        intensity: 0.92,
        label: "Golden-Ratio Price Anchor",
      },
      {
        step: "④",
        time: "2.3s",
        x: 300,
        y: 518,
        radius: 92,
        intensity: 0.98,
        label: "High-Luminance Conversion CTA",
      },
    ],
  },
};

export const NeuralAdForgeModule: React.FC<NeuralAdForgeModuleProps> = ({
  activeProduct,
  allProducts,
  onSelectProduct,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedLayout, setSelectedLayout] =
    useState<AdLayoutId>("v1-cluttered");
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showSaccadePath, setShowSaccadePath] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.68);
  const [isHealing, setIsHealing] = useState<boolean>(false);

  const metrics = LAYOUT_CONFIGS[selectedLayout];

  // Programmatic Ad Poster + Pixel Saliency Thermal Heatmap + Gaze Fixation Saccade Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const primaryHex = activeProduct.dominantColors[0]?.hex || "#0F172A";
    const accentHex = activeProduct.dominantColors[1]?.hex || "#06B6D4";
    const highlightHex = activeProduct.dominantColors[2]?.hex || "#F97316";

    ctx.clearRect(0, 0, W, H);

    // 1. Background Layer
    const bgGrad = ctx.createRadialGradient(
      W / 2,
      H * 0.45,
      30,
      W / 2,
      H / 2,
      W * 0.75
    );
    if (selectedLayout === "v3-neuro") {
      bgGrad.addColorStop(0, "#0F172A");
      bgGrad.addColorStop(0.55, "#020617");
      bgGrad.addColorStop(1, "#000000");
    } else if (selectedLayout === "v2-center") {
      bgGrad.addColorStop(0, "#1E293B");
      bgGrad.addColorStop(1, "#020617");
    } else {
      bgGrad.addColorStop(0, "#1E1B4B");
      bgGrad.addColorStop(1, "#090D16");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Cyber Perspective Grid
    ctx.strokeStyle =
      selectedLayout === "v1-cluttered"
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(6, 182, 212, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Render Layout-Specific Poster Elements
    if (selectedLayout === "v1-cluttered") {
      // Distracting Clutter Elements in Corners
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(28, 35, 195, 72);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 18px sans-serif";
      ctx.fillText("PROMO HEBOH!!", 42, 68);
      ctx.font = "bold 12px monospace";
      ctx.fillText("CEK SYARAT & KETENTUAN", 42, 92);

      // Second Distractor Top-Right
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(495, 110, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0F172A";
      ctx.font = "900 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LIMITED", 495, 106);
      ctx.fillText("STOCK!!", 495, 124);

      // Off-center smaller sneaker
      ctx.save();
      ctx.translate(230, 230);
      ctx.scale(0.68, 0.68);
      drawProgrammaticSneaker(ctx, primaryHex, accentHex, highlightHex);
      ctx.restore();

      // Overlapping low-contrast headline
      ctx.textAlign = "left";
      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(activeProduct.name, 42, 260);
      ctx.font = "14px sans-serif";
      ctx.fillText(activeProduct.tagline, 42, 288);
      ctx.fillText(`Harga: ${activeProduct.priceFormatted}`, 42, 315);

      // Weak low-contrast CTA button
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(55, 490, 210, 52, 10);
      ctx.fill();
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Klik Beli Disini", 95, 522);
    } else if (selectedLayout === "v2-center") {
      // Headline Top Center
      ctx.textAlign = "center";
      ctx.fillStyle = accentHex;
      ctx.font = "bold 14px monospace";
      ctx.fillText(activeProduct.category.toUpperCase(), W / 2, 72);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 30px sans-serif";
      ctx.fillText(activeProduct.name, W / 2, 112);

      // Center Product Hero
      ctx.save();
      ctx.translate(95, 175);
      ctx.scale(0.88, 0.88);
      drawProgrammaticSneaker(ctx, primaryHex, accentHex, highlightHex);
      ctx.restore();

      // Split Bottom Price & CTA
      ctx.fillStyle = "#1E293B";
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(70, 452, 210, 68, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(activeProduct.priceFormatted, 175, 494);

      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.roundRect(310, 452, 220, 68, 14);
      ctx.fill();
      ctx.fillStyle = "#020617";
      ctx.font = "900 18px sans-serif";
      ctx.fillText("BELI SEKARANG", 420, 493);
    } else {
      // Layout v3: NEURO-OPTIMIZED GOLDEN RATIO (97/100)
      // Golden Ratio Rim-Light Spotlight behind Sneaker
      const rimGrad = ctx.createRadialGradient(
        W / 2,
        265,
        15,
        W / 2,
        265,
        210
      );
      rimGrad.addColorStop(0, "rgba(6, 182, 212, 0.52)");
      rimGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.24)");
      rimGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(W / 2, 265, 210, 0, Math.PI * 2);
      ctx.fill();

      // High-Contrast Hook Headline
      ctx.textAlign = "center";
      ctx.fillStyle = highlightHex;
      ctx.font = "900 13px monospace";
      ctx.fillText(
        `⚡ EXCLUSIVE DROP • ${activeProduct.soleTech.toUpperCase()}`,
        W / 2,
        62
      );
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 34px sans-serif";
      ctx.fillText(activeProduct.name, W / 2, 102);

      // Hero Sneaker at Golden Focal Center
      ctx.save();
      ctx.translate(75, 145);
      ctx.scale(0.96, 0.96);
      drawProgrammaticSneaker(ctx, primaryHex, accentHex, highlightHex);
      ctx.restore();

      // Golden-Ratio Price Anchor Pill
      const promoPrice = formatRupiah(activeProduct.priceNumeric * 0.85);
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(155, 396, 290, 56, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#10B981";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(`${promoPrice} (SAVE 15%)`, W / 2, 432);

      // High-Luminance Conversion CTA Button
      const ctaGrad = ctx.createLinearGradient(130, 480, 470, 555);
      ctaGrad.addColorStop(0, "#F97316");
      ctaGrad.addColorStop(0.5, "#F59E0B");
      ctaGrad.addColorStop(1, "#10B981");
      ctx.fillStyle = ctaGrad;
      ctx.beginPath();
      ctx.roundRect(130, 482, 340, 68, 20);
      ctx.fill();

      ctx.fillStyle = "#020617";
      ctx.font = "900 21px sans-serif";
      ctx.fillText("🔥 SIKAT FLASH DEAL SEKARANG", W / 2, 524);
    }

    // 3. Predictive Eye-Tracking Thermal Heatmap Layer
    if (showHeatmap) {
      ctx.save();
      ctx.globalAlpha = heatmapOpacity;
      metrics.fixations.forEach((fp) => {
        const heatGrad = ctx.createRadialGradient(
          fp.x,
          fp.y,
          4,
          fp.x,
          fp.y,
          fp.radius
        );
        heatGrad.addColorStop(0, `rgba(239, 68, 68, ${fp.intensity})`); // Hot Red Core
        heatGrad.addColorStop(0.35, `rgba(245, 158, 11, ${fp.intensity * 0.85})`); // Thermal Orange/Yellow
        heatGrad.addColorStop(0.68, `rgba(16, 185, 129, ${fp.intensity * 0.55})`); // Mid Green
        heatGrad.addColorStop(0.9, `rgba(6, 182, 212, ${fp.intensity * 0.25})`); // Cool Blue Rim
        heatGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 4. Gaze Fixation Saccade Path (① -> ② -> ③ -> ④)
    if (showSaccadePath) {
      ctx.save();
      const pts = metrics.fixations;

      // Connect Fixation Nodes with Vector Lines
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Fixation Nodes & Timestamps
      pts.forEach((pt) => {
        // Node Circle
        ctx.fillStyle = "#020617";
        ctx.strokeStyle = "#F43F5E";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Number Label
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.font = "bold 14px monospace";
        ctx.fillText(pt.step, pt.x, pt.y + 5);

        // Timestamp Tag
        ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(pt.x + 24, pt.y - 14, 54, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 11px monospace";
        ctx.fillText(pt.time, pt.x + 51, pt.y + 1);
      });

      ctx.restore();
    }
  }, [
    activeProduct,
    selectedLayout,
    showHeatmap,
    showSaccadePath,
    heatmapOpacity,
    metrics,
  ]);

  // Self-Heal & Auto-Optimize Ad Layout Action
  const handleAutoOptimizeNeuroHeal = () => {
    setIsHealing(true);
    soundEngine.playNeuralHealSound();
    setTimeout(() => {
      setSelectedLayout("v3-neuro");
      setShowHeatmap(true);
      setShowSaccadePath(true);
      setIsHealing(false);
    }, 550);
  };

  // Download Rendered Poster PNG
  const handleDownloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${activeProduct.id}-${selectedLayout}-poster.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Top 1-Product Lock & Score Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-4 h-4" />
            1-Product Lock:
          </span>
          {allProducts.map((prod) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => onSelectProduct(prod)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                prod.id === activeProduct.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              {prod.name}
            </button>
          ))}
        </div>

        <div className="lg:col-span-6 flex flex-wrap items-center justify-end gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
            PRESET: <span className="text-amber-400">{metrics.badge}</span>
          </span>
          <div
            className={`px-3 py-1 rounded-lg border text-xs font-mono font-extrabold flex items-center gap-1.5 ${
              metrics.overallScore >= 90
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : metrics.overallScore >= 70
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-rose-500/20 border-rose-400 text-rose-300"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            ATTENTION SCORE: {metrics.overallScore}/100
          </div>
        </div>
      </div>

      {/* Main 12-Col Grid: Left 6 Cols = Canvas Poster & Heatmap | Right 6 Cols = Neuro Scorecard & Auto-Heal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Programmatic Ad Poster & Thermal Eye-Tracking Viewport */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[540px] rounded-2xl bg-slate-900 border-2 border-slate-800 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                PROGRAMMATIC AD COMPOSITOR (600x600px)
              </span>
              <button
                type="button"
                onClick={handleDownloadPoster}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 flex items-center gap-1 transition"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                Export PNG
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800">
              <canvas
                ref={canvasRef}
                width={600}
                height={600}
                className="w-full h-auto block bg-slate-950"
              />
              {isHealing && (
                <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-cyan-300 animate-spin" />
                  <p className="mt-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
                    ⚡ ALIGNING GOLDEN RATIO &amp; BOOSTING SALIENCY...
                  </p>
                </div>
              )}
            </div>

            {/* Heatmap & Saccade Overlay Toggles */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHeatmap((h) => !h)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    showHeatmap
                      ? "bg-rose-500/20 border-rose-400 text-rose-200"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  🔥 Thermal Heatmap: {showHeatmap ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaccadePath((s) => !s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    showSaccadePath
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  👁️ Gaze Path (①-④): {showSaccadePath ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Opacity:</span>
                <input
                  type="range"
                  min={0.25}
                  max={0.9}
                  step={0.05}
                  value={heatmapOpacity}
                  onChange={(e) =>
                    setHeatmapOpacity(parseFloat(e.target.value))
                  }
                  className="w-20 accent-rose-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Layout Selector, Neuro-Attention Scorecard & Self-Heal Optimizer */}
        <div className="lg:col-span-6 space-y-4">
          {/* Layout Preset Switcher + Self-Heal Button */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Ad Layout Presets &amp; Autonomous Neuro-Healer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Uji perbandingan distribusi perhatian mata antara layout yang berantakan vs layout Golden Ratio.
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(LAYOUT_CONFIGS) as AdLayoutId[]).map((id) => {
                const cfg = LAYOUT_CONFIGS[id];
                const isSelected = selectedLayout === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedLayout(id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-400 text-white shadow-md"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{cfg.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Product Focus: {cfg.productFocusPct}% • CTA:{" "}
                        {cfg.ctaVisibilityPct}%
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-extrabold ${
                        cfg.overallScore >= 90
                          ? "bg-emerald-500/20 text-emerald-300"
                          : cfg.overallScore >= 70
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {cfg.overallScore}/100
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Self-Heal & Auto-Optimize Ad Layout CTA */}
            <button
              type="button"
              onClick={handleAutoOptimizeNeuroHeal}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:brightness-110 transition"
            >
              <Zap className="w-4 h-4" />
              ⚡ Auto-Optimize Layout (Neuro-Heal &rarr; 97/100 Golden Ratio)
            </button>
          </div>

          {/* Neuro-Attention Scorecard Metrics */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Neuro-Attention Scorecard (First 3.0s Gaze Analysis)
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {metrics.clutterVerdict}
              </span>
            </div>

            <div className="space-y-3">
              {/* Metric 1: Product Focus % */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-200">
                    🎯 Product Hero Focus (Visual Attention Share)
                  </span>
                  <span className="font-mono text-cyan-300">
                    {metrics.productFocusPct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${metrics.productFocusPct}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Price & CTA Visibility % */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-200">
                    💸 Price &amp; CTA Conversion Visibility
                  </span>
                  <span className="font-mono text-amber-300">
                    {metrics.ctaVisibilityPct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                    style={{ width: `${metrics.ctaVisibilityPct}%` }}
                  />
                </div>
              </div>

              {/* Metric 3: Cognitive Clutter Index */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-200">
                    🧠 Cognitive Clutter Index (Lower is Better)
                  </span>
                  <span
                    className={`font-mono ${
                      metrics.clutterIndexPct <= 15
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {metrics.clutterIndexPct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics.clutterIndexPct <= 15
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${metrics.clutterIndexPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Saccade Fixation Sequence Breakdown */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                {metrics.diagnosis}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {metrics.fixations.map((fp, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs"
                  >
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {fp.step}
                    </span>
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-white truncate">
                        {fp.label}
                      </p>
                      <p className="text-[10px] font-mono text-cyan-400">
                        Fixation @ {fp.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function drawProgrammaticSneaker(
  ctx: CanvasRenderingContext2D,
  primaryHex: string,
  accentHex: string,
  highlightHex: string
) {
  // Sneaker Drop Shadow
  ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
  ctx.beginPath();
  ctx.ellipse(235, 220, 195, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Upper Silhouette
  const upGrad = ctx.createLinearGradient(50, 40, 420, 200);
  upGrad.addColorStop(0, primaryHex);
  upGrad.addColorStop(0.6, "#1E293B");
  upGrad.addColorStop(1, accentHex);

  ctx.fillStyle = upGrad;
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, 165);
  ctx.bezierCurveTo(60, 105, 105, 50, 175, 42);
  ctx.lineTo(245, 75);
  ctx.bezierCurveTo(295, 95, 360, 112, 435, 130);
  ctx.bezierCurveTo(465, 138, 472, 162, 462, 178);
  ctx.lineTo(60, 178);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dynamic Speed Vector Stripe
  ctx.strokeStyle = highlightHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(105, 140);
  ctx.quadraticCurveTo(245, 95, 405, 152);
  ctx.stroke();

  // Sculpted Nitro Midsole
  const soleGrad = ctx.createLinearGradient(45, 175, 475, 175);
  soleGrad.addColorStop(0, highlightHex);
  soleGrad.addColorStop(0.5, accentHex);
  soleGrad.addColorStop(1, "#FFFFFF");

  ctx.fillStyle = soleGrad;
  ctx.beginPath();
  ctx.roundRect(48, 172, 422, 42, 20);
  ctx.fill();
}
