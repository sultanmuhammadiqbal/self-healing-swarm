"use client";

import React, { useState } from "react";
import { CloserProduct } from "../../types/closer";
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Mic,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

interface SwarmModuleProps {
  products: CloserProduct[];
  activeProduct: CloserProduct;
  onSelectProduct: (prod: CloserProduct) => void;
  onLaunchCloser: (prod: CloserProduct) => void;
}

export const SwarmModule: React.FC<SwarmModuleProps> = ({
  products,
  activeProduct,
  onSelectProduct,
  onLaunchCloser,
}) => {
  const [healingSimulated, setHealingSimulated] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-2">
            <Activity className="w-3.5 h-3.5" />
            MODULE 1 • AUTONOMOUS SELF-HEALING SWARM
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Product Intelligence &amp; Self-Healing DOM Extractor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mengekstrak spesifikasi produk, harga live, dan 3 angle visual secara otonom untuk diteruskan ke Video Factory &amp; Live AI Closer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onLaunchCloser(activeProduct)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:brightness-110 transition"
        >
          <Mic className="w-4 h-4" />
          🎙️ Launch Live AI Closer for This Product
        </button>
      </div>

      {/* Product Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((prod) => {
          const isSelected = prod.id === activeProduct.id;
          return (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-900/95 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.2)]"
                  : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {prod.sku}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {prod.priceFormatted}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white mt-2.5">
                  {prod.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{prod.tagline}</p>

                <ul className="mt-3 space-y-1.5">
                  {prod.specs.map((sp, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{sp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>3 Angle Assets Ready</span>
                  <span className="text-cyan-400">{prod.weightGrams}g</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct(prod);
                    onLaunchCloser(prod);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-400/50 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Mic className="w-3.5 h-3.5" />
                  🎙️ Launch Live AI Closer for This Product
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Swarm Self-Healing Telemetry Console */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-white uppercase">
              Swarm Node Telemetry &amp; Cross-Module Pipeline Sync
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHealingSimulated((v) => !v)}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Trigger Self-Healing Audit
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              ACTIVE PAYLOAD
            </div>
            <p className="text-white font-bold mt-1">{activeProduct.name}</p>
            <p className="text-emerald-400 text-[11px] mt-0.5">
              3 Angles + Sole Spec Synced
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              DOM DRIFT HEALER
            </div>
            <p className="text-white font-bold mt-1">
              {healingSimulated
                ? "RE-ANCHORED IN 38ms (100%)"
                : "ZERO SELECTOR DRIFT"}
            </p>
            <p className="text-cyan-400 text-[11px] mt-0.5">
              Semantic Graph Guard Active
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              MODULE 3 BRIDGE
            </div>
            <p className="text-white font-bold mt-1">
              READY FOR VOICE CLOSER
            </p>
            <p className="text-purple-300 text-[11px] mt-0.5">
              1-Product Lock &amp; &le;22w Guard Armed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
