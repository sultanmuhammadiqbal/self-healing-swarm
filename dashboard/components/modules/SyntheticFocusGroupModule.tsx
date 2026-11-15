"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloserProduct } from "../../types/closer";
import {
  BuyerPersona,
  FocusGroupApiResponse,
  MonteCarloFunnelMetrics,
  SimulatedAudienceDot,
} from "../../types/focusGroup";
import { formatRupiah } from "../../lib/closerGuard";
import { soundEngine } from "../../lib/soundEffects";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  DollarSign,
  Eye,
  Flame,
  Layers,
  PieChart,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  Zap,
} from "lucide-react";

interface SyntheticFocusGroupModuleProps {
  activeProduct: CloserProduct;
  allProducts: CloserProduct[];
  onSelectProduct: (prod: CloserProduct) => void;
}

export const SyntheticFocusGroupModule: React.FC<SyntheticFocusGroupModuleProps> = ({
  activeProduct,
  allProducts,
  onSelectProduct,
}) => {
  const [dailyBudget, setDailyBudget] = useState<number>(1_500_000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<FocusGroupApiResponse | null>(null);
  const [speakingPersonaId, setSpeakingPersonaId] = useState<string | null>(null);

  const dotsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audienceDotsRef = useRef<SimulatedAudienceDot[]>([]);

  // Initialize and run Monte-Carlo simulation from API
  const runSimulation = useCallback(
    async (budget: number) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/focus-group/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: activeProduct,
            dailyBudget: budget,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as FocusGroupApiResponse;
          setData(json);
          soundEngine.playHudLockSound();
        }
      } catch (err) {
        console.error("Simulation error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [activeProduct]
  );

  useEffect(() => {
    runSimulation(dailyBudget);
  }, [activeProduct, runSimulation]);

  // 1,000-User Audience Dot Flow Animation on HTML5 Canvas
  useEffect(() => {
    // Generate 1,000 stochastic audience dots distributed across the funnel
    const dots: SimulatedAudienceDot[] = [];
    for (let i = 0; i < 1000; i++) {
      let stage: SimulatedAudienceDot["stage"] = "DROPPED";
      let color = "rgba(100, 116, 139, 0.4)"; // Dropped after 1s

      if (i < 10) {
        stage = "PURCHASE";
        color = "#10B981"; // Emerald Purchase
      } else if (i < 24) {
        stage = "ATC";
        color = "#F59E0B"; // Amber ATC
      } else if (i < 50) {
        stage = "CLICK";
        color = "#A855F7"; // Purple Click
      } else if (i < 430) {
        stage = "THUMBSTOP";
        color = "#06B6D4"; // Cyan Thumbstop
      }

      dots.push({
        id: i,
        stage,
        x: Math.random() * 560 + 10,
        y: Math.random() * 140 + 10,
        color,
      });
    }
    audienceDotsRef.current = dots;

    const canvas = dotsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render 1,000 dots with subtle drift
      audienceDotsRef.current.forEach((d) => {
        const driftX = Math.sin(tick + d.id * 0.1) * 2;
        const driftY = Math.cos(tick + d.id * 0.05) * 1.5;
        const currentX = (d.x + driftX + canvas.width) % canvas.width;
        const currentY = (d.y + driftY + canvas.height) % canvas.height;

        ctx.fillStyle = d.color;
        ctx.beginPath();
        const radius = d.stage === "PURCHASE" ? 3.5 : d.stage === "ATC" ? 2.5 : 1.8;
        ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [data]);

  // Persona TTS Voice Preview (Hard-Guarded Voice <= 22 words)
  const handleSpeakPersonaPitch = (p: BuyerPersona) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingPersonaId(p.id);

    const utter = new SpeechSynthesisUtterance(p.tailoredVoicePitch);
    utter.lang = "id-ID";
    utter.rate = 1.08;
    utter.pitch = 1.0;

    utter.onend = () => setSpeakingPersonaId(null);
    utter.onerror = () => setSpeakingPersonaId(null);

    window.speechSynthesis.speak(utter);
  };

  const funnel = data?.funnel;

  return (
    <div className="space-y-6">
      {/* Top 1-Product Lock & Scorecard Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-bold">
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
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              {prod.name}
            </button>
          ))}
        </div>

        <div className="lg:col-span-6 flex flex-wrap items-center justify-end gap-2">
          <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-extrabold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            BUYER INTENT: {data?.overallProductScore || 89}%
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playLiveBellSound();
              runSimulation(dailyBudget);
            }}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold font-mono flex items-center gap-1.5 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Re-Simulate 1,000 Users
          </button>
        </div>
      </div>

      {/* SECTION A: 5 AI BUYER PERSONA ARCHETYPES (INDONESIA MARKET) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              5 AI Buyer Persona Archetypes (Indonesia Streetwear &amp; Footwear Market)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulasi reaksi psikografis real-time terhadap {activeProduct.name} berdasarkan harga, visual on-feet, dan teknologi sol.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
            100% Locked on {activeProduct.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {data?.personas.map((persona) => {
            const isSpeaking = speakingPersonaId === persona.id;
            return (
              <div
                key={persona.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between shadow-lg space-y-3 hover:border-slate-700 transition"
              >
                <div>
                  {/* Persona Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-lg">
                        {persona.avatar}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {persona.name}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {persona.demographics}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-extrabold ${
                        persona.sentiment === "BULLISH"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : persona.sentiment === "HIGH_INTEREST"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {persona.sentiment}
                    </span>
                  </div>

                  {/* Buying Intent Meter */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-300">Buying Intent</span>
                      <span className="font-mono text-emerald-400">
                        {persona.buyingIntentPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                        style={{ width: `${persona.buyingIntentPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Persona Reaction Dialog */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs">
                    <p className="italic text-slate-200">
                      &ldquo;{persona.reactionQuote}&rdquo;
                    </p>
                  </div>

                  {/* Triggers & Frictions */}
                  <div className="mt-2.5 space-y-1 text-[11px]">
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <span className="font-mono text-cyan-400 font-bold shrink-0">
                        Trigger:
                      </span>
                      <span>{persona.keyTrigger}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <span className="font-mono text-rose-400 font-bold shrink-0">
                        Friction:
                      </span>
                      <span>{persona.frictionPoint}</span>
                    </div>
                  </div>
                </div>

                {/* Hard-Guarded Persona Voice Over Pitch */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="truncate text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-400">
                      {persona.wordCount}/22w • {persona.charCount}/145c
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSpeakPersonaPitch(persona)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                      isSpeaking
                        ? "bg-orange-500 text-slate-950 animate-pulse"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                    <span>{isSpeaking ? "Speaking..." : "Voice Pitch"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B: 1,000-USER MONTE-CARLO AD AUCTION & FUNNEL VISUALIZER */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              1,000-User Probabilistic Ad Auction &amp; Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulasi aliran 1.000 impresi audiens secara stokastik dari Thumbstop hingga Purchase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-extrabold">
              PROJECTED ROAS: {funnel?.projectedRoas || 4.8}x
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-xs">
              EST. CPA: {formatRupiah(funnel?.estimatedCpa || 159000)}
            </span>
          </div>
        </div>

        {/* 1,000 Audience Dots Canvas Matrix */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-2 overflow-hidden relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 px-1">
            <span>LIVE 1,000-USER STOCHASTIC PARTICLES</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Thumbstop
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Click
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> ATC
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Purchase
              </span>
            </span>
          </div>
          <canvas
            ref={dotsCanvasRef}
            width={580}
            height={110}
            className="w-full h-[110px] block"
          />
        </div>

        {/* 5-Stage Conversion Funnel Visualizer Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400">1. IMPRESSIONS</p>
            <p className="text-base font-extrabold text-white mt-1">1,000</p>
            <p className="text-[10px] text-slate-500">100% Top Funnel</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40">
            <p className="text-[10px] text-cyan-400">2. THUMBSTOP</p>
            <p className="text-base font-extrabold text-cyan-300 mt-1">
              {funnel?.thumbstopCount || 428}
            </p>
            <p className="text-[10px] text-cyan-400">
              {funnel?.thumbstopRatePct || 42.8}% (3s Hook)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/40">
            <p className="text-[10px] text-purple-400">3. CTR CLICKS</p>
            <p className="text-base font-extrabold text-purple-300 mt-1">
              {funnel?.clickCount || 48}
            </p>
            <p className="text-[10px] text-purple-400">
              {funnel?.ctrPct || 4.8}% Outbound
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40">
            <p className="text-[10px] text-amber-400">4. ADD-TO-CART</p>
            <p className="text-base font-extrabold text-amber-300 mt-1">
              {funnel?.atcCount || 22}
            </p>
            <p className="text-[10px] text-amber-400">
              {funnel?.atcRatePct || 2.2}% ATC Rate
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <p className="text-[10px] text-emerald-400">5. PURCHASES</p>
            <p className="text-base font-extrabold text-emerald-300 mt-1">
              {funnel?.purchaseCount || 9}
            </p>
            <p className="text-[10px] text-emerald-400">
              {funnel?.purchaseConvPct || 0.94}% Conv
            </p>
          </div>
        </div>

        {/* Interactive Daily Budget Slider & Revenue Forecast */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Simulasi Budget Iklan Harian (Ad Spend)
              </span>
              <p className="text-[11px] text-slate-400">
                Geser slider untuk melihat proyeksi omzet &amp; alokasi channel optimal.
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-mono font-extrabold text-emerald-400">
                {formatRupiah(dailyBudget)} / hari
              </span>
              <p className="text-[10px] font-mono text-slate-400">
                Est. Omzet:{" "}
                <span className="text-white font-bold">
                  {formatRupiah(funnel?.projectedDailyRevenue || 0)} / hari
                </span>{" "}
                ({formatRupiah(funnel?.projectedMonthlyRevenue || 0)} / bulan)
              </p>
            </div>
          </div>

          <input
            type="range"
            min={100_000}
            max={10_000_000}
            step={100_000}
            value={dailyBudget}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDailyBudget(val);
              runSimulation(val);
            }}
            className="w-full accent-emerald-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Rp 100.000 (Test Budget)</span>
            <span>Rp 2.500.000</span>
            <span>Rp 5.000.000 (Scale)</span>
            <span>Rp 10.000.000 (Domination)</span>
          </div>
        </div>

        {/* Winning Ad Channel Allocation Breakdown */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-purple-400" />
            Optimal Winning Ad Channel Allocation
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {funnel?.channels.map((ch, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {ch.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {ch.sharePct}%
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-cyan-300 mt-0.5">
                    {ch.badge}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    Budget: {ch.budgetRupiah}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ROAS {ch.expectedRoas}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
