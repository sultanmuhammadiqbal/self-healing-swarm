"use client";

import React from "react";
import { CloserProduct, UIActionPayload } from "../../types/closer";
import {
  CheckCircle2,
  Eye,
  Flame,
  Layers,
  Percent,
  ShoppingBag,
  Sparkles,
  ZoomIn,
} from "lucide-react";

interface ProductInteractiveCanvasProps {
  product: CloserProduct;
  activeAngle: 0 | 1 | 2;
  onSelectAngle: (angle: 0 | 1 | 2) => void;
  activeAction: UIActionPayload;
  customAngleImages?: (string | null)[];
}

export const ProductInteractiveCanvas: React.FC<ProductInteractiveCanvasProps> = ({
  product,
  activeAngle,
  onSelectAngle,
  activeAction,
  customAngleImages,
}) => {
  const angleSpec = product.angles[activeAngle];
  const isMacroZoom =
    activeAction.action === "MACRO_INSPECT" && (activeAction.zoom || 1) > 1.1;
  const zoomScale = isMacroZoom ? activeAction.zoom || 1.65 : 1;

  const primaryHex = product.dominantColors[0]?.hex || "#0F172A";
  const accentHex = product.dominantColors[1]?.hex || "#06B6D4";
  const highlightHex = product.dominantColors[2]?.hex || "#F97316";

  const customImg = customAngleImages?.[activeAngle];

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Cyber HUD Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-semibold">
            {angleSpec.badge}
          </span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {product.name}
            </h3>
            <p className="text-[11px] text-slate-400">{angleSpec.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
            {product.priceFormatted}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px]">
            UI CMD: {activeAction.action}
          </span>
        </div>
      </div>

      {/* Main Interactive Sneaker Viewport */}
      <div className="relative h-[330px] sm:h-[370px] w-full flex items-center justify-center overflow-hidden select-none">
        {/* Background Cyber Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.25), transparent 70%), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
            backgroundSize: "100% 100%, 28px 28px, 28px 28px",
          }}
        />

        {/* Transformable Product Stage (Auto-Rotates & Auto-Zooms 1.65x via Hands-Free AI Tool-Calling) */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out"
          style={{
            transform: isMacroZoom
              ? `scale(${zoomScale}) translate(${
                  (50 - angleSpec.hotspotX) * 0.28
                }%, ${(50 - angleSpec.hotspotY) * 0.28}%)`
              : "scale(1) translate(0%, 0%)",
          }}
        >
          {customImg ? (
            <img
              src={customImg}
              alt={angleSpec.title}
              className="max-h-[260px] max-w-[85%] object-contain drop-shadow-[0_20px_35px_rgba(6,182,212,0.3)]"
            />
          ) : (
            /* High-Precision Procedural Multi-Angle Sneaker Vector Blueprint */
            <svg
              viewBox="0 0 600 340"
              className="w-[92%] max-w-[520px] h-auto drop-shadow-[0_25px_35px_rgba(0,0,0,0.75)] transition-all duration-500"
            >
              <defs>
                <linearGradient id="upperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={primaryHex} />
                  <stop offset="65%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor={accentHex} />
                </linearGradient>
                <linearGradient id="soleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={highlightHex} />
                  <stop offset="50%" stopColor={accentHex} />
                  <stop offset="100%" stopColor="#F8FAFC" />
                </linearGradient>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {activeAngle === 0 && (
                /* ANGLE 1: LATERAL SIDE PROFILE */
                <g>
                  {/* Ground Shadow */}
                  <ellipse
                    cx="300"
                    cy="285"
                    rx="220"
                    ry="14"
                    fill="rgba(6, 182, 212, 0.18)"
                  />
                  {/* Upper Body Silhouette */}
                  <path
                    d="M95,215 C95,155 135,95 205,85 L275,115 C325,135 390,150 475,168 C508,175 520,198 512,222 L95,222 Z"
                    fill="url(#upperGrad)"
                    stroke={accentHex}
                    strokeWidth="2.5"
                  />
                  {/* Breathable AeroWeave Mesh Window */}
                  <path
                    d="M175,140 C225,135 315,155 395,180 L375,206 L160,202 Z"
                    fill="rgba(15,23,42,0.7)"
                    stroke={highlightHex}
                    strokeWidth="1.8"
                    strokeDasharray="6 3"
                  />
                  {/* Dynamic Speed Stripe */}
                  <path
                    d="M140,185 Q280,140 445,195"
                    fill="none"
                    stroke={accentHex}
                    strokeWidth="7"
                    strokeLinecap="round"
                    filter="url(#neonGlow)"
                  />
                  {/* Nitro-Bounce 42mm Sculpted Midsole */}
                  <path
                    d="M80,220 L522,220 C535,238 525,264 492,268 L102,268 C72,266 68,238 80,220 Z"
                    fill="url(#soleGrad)"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  {/* Visible Nitrogen Air Pods */}
                  <rect
                    x="125"
                    y="235"
                    width="85"
                    height="18"
                    rx="9"
                    fill="#0F172A"
                    stroke={highlightHex}
                    strokeWidth="2"
                  />
                  <rect
                    x="230"
                    y="237"
                    width="70"
                    height="15"
                    rx="7"
                    fill="#0F172A"
                    stroke={accentHex}
                    strokeWidth="2"
                  />
                </g>
              )}

              {activeAngle === 1 && (
                /* ANGLE 2: INVERTED OUTSOLE & NITRO-BOUNCE CARBON CORE */
                <g>
                  <ellipse
                    cx="300"
                    cy="290"
                    rx="230"
                    ry="16"
                    fill="rgba(249, 115, 22, 0.22)"
                  />
                  {/* Inverted Shoe Upper Hints */}
                  <path
                    d="M105,155 C140,95 430,105 495,155 L485,195 L115,195 Z"
                    fill="url(#upperGrad)"
                    opacity="0.75"
                  />
                  {/* Massive 42mm Nitro-Bounce Sole Cross-Section */}
                  <rect
                    x="85"
                    y="165"
                    width="430"
                    height="88"
                    rx="42"
                    fill="url(#soleGrad)"
                    stroke={highlightHex}
                    strokeWidth="3"
                    filter="url(#neonGlow)"
                  />
                  {/* Full-Length Carbon Fiber Torq-Blade */}
                  <path
                    d="M125,209 L475,209"
                    stroke="#0F172A"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  <path
                    d="M130,209 L470,209"
                    stroke={accentHex}
                    strokeWidth="4"
                    strokeDasharray="12 8"
                    strokeLinecap="round"
                  />
                  {/* Outsole Megagrip Lugs */}
                  {Array.from({ length: 11 }).map((_, idx) => (
                    <rect
                      key={idx}
                      x={115 + idx * 35}
                      y={248}
                      width="20"
                      height="14"
                      rx="4"
                      fill={idx % 2 === 0 ? highlightHex : "#0F172A"}
                      stroke="#FFFFFF"
                      strokeWidth="1"
                    />
                  ))}
                  <text
                    x="300"
                    y="196"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    NITRO-BOUNCE FOAM + CARBON TORQ-BLADE
                  </text>
                </g>
              )}

              {activeAngle === 2 && (
                /* ANGLE 3: ON-FEET STREETWEAR & TOP-DOWN FIT */
                <g>
                  {/* Streetwear Cargo Pant Cuff Silhouette */}
                  <path
                    d="M165,35 L315,35 L300,145 L150,145 Z"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="2"
                  />
                  {/* Ankle Sock Highlight */}
                  <rect
                    x="185"
                    y="135"
                    width="95"
                    height="35"
                    rx="8"
                    fill="#F8FAFC"
                  />
                  {/* On-Feet Sneaker Silhouette */}
                  <path
                    d="M135,165 C155,140 260,135 310,155 L495,205 C525,215 530,248 495,260 L130,260 C105,252 110,195 135,165 Z"
                    fill="url(#upperGrad)"
                    stroke={accentHex}
                    strokeWidth="3"
                  />
                  {/* Quick-Lace Matrix */}
                  <line
                    x1="285"
                    y1="160"
                    x2="310"
                    y2="195"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <line
                    x1="315"
                    y1="168"
                    x2="340"
                    y2="202"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  <line
                    x1="345"
                    y1="176"
                    x2="370"
                    y2="210"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  {/* Outsole Rim */}
                  <path
                    d="M115,248 L512,248 C520,265 505,278 485,278 L125,278 C105,275 105,258 115,248 Z"
                    fill="url(#soleGrad)"
                  />
                </g>
              )}
            </svg>
          )}

          {/* Vector HUD Callout Reticle (Lights up on MACRO_INSPECT or active angle) */}
          <div
            className="absolute pointer-events-none transition-all duration-500"
            style={{
              left: `${angleSpec.hotspotX}%`,
              top: `${angleSpec.hotspotY}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Pulsing Target Rings */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-10 h-10 rounded-full border-2 ${
                  isMacroZoom
                    ? "border-orange-400 scale-125 animate-ping"
                    : "border-cyan-400/70 animate-pulse"
                }`}
              />
              <div className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_15px_#06b6d4]" />

              {/* HUD Vector Callout Line + Floating Feature Box */}
              <div
                className={`absolute left-7 -top-14 min-w-[210px] sm:min-w-[250px] px-3 py-2 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 ${
                  isMacroZoom
                    ? "bg-slate-950/95 border-orange-400 text-orange-200 scale-95"
                    : "bg-slate-950/85 border-cyan-500/60 text-cyan-100"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  <ZoomIn className="w-3 h-3" />
                  {isMacroZoom
                    ? `MACRO HUD LOCK (${zoomScale}x)`
                    : "LIVE FEATURE TELEMETRY"}
                </div>
                <p className="text-xs font-semibold text-white mt-0.5 leading-snug">
                  {activeAction.calloutText || angleSpec.calloutLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Deal Card Overlay when CALCULATE_BUNDLE is triggered */}
        {activeAction.action === "CALCULATE_BUNDLE" && (
          <div className="absolute right-4 bottom-4 z-30 w-72 sm:w-80 p-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-400/90 shadow-[0_0_35px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold">
                <Percent className="w-3 h-3" /> LIVE BUNDLE CALCULATOR
              </span>
              <span className="text-xs font-bold text-emerald-400">
                DISKON {activeAction.discountPct || 18}%
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Paket Bundling ({activeAction.qty || 2} Pasang)
                </p>
                <p className="text-xl font-extrabold text-white">
                  {activeAction.finalPrice}
                </p>
              </div>
              {activeAction.unitPriceSaved && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase">Hemat Langsung</p>
                  <p className="text-xs font-bold text-emerald-400">
                    -{activeAction.unitPriceSaved}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Flash Checkout Overlay when FLASH_CHECKOUT is triggered */}
        {activeAction.action === "FLASH_CHECKOUT" && (
          <div className="absolute inset-x-4 bottom-4 z-30 p-4 rounded-2xl bg-gradient-to-r from-orange-950/95 via-slate-950/95 to-purple-950/95 border-2 border-orange-400 shadow-[0_0_40px_rgba(249,115,22,0.45)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-400/50 text-orange-300">
                  <Flame className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-orange-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                      808 FLASH DEAL UNLOCKED
                    </span>
                    <span className="text-xs font-mono text-orange-300">
                      VOUCHER: {activeAction.voucherCode || "FLASH15-VIP"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {product.name} • Harga Spesial {activeAction.finalPrice}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg hover:brightness-110 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                CHECKOUT SEKARANG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom 3-Angle Selector Strip */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/95 border-t border-slate-800">
        {product.angles.map((ang) => {
          const isSelected = activeAngle === ang.index;
          return (
            <button
              key={ang.index}
              type="button"
              onClick={() => onSelectAngle(ang.index)}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  {ang.badge}
                </span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <span className="text-xs font-semibold text-white mt-1 line-clamp-1">
                {ang.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
