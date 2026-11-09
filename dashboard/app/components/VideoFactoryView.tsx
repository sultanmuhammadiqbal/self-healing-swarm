"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Sparkles,
  Zap,
  Globe,
  Tag,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react";
import LiveInteractivePlayer, { VideoManifest } from "./LiveInteractivePlayer";
import StudioVaultPlayer from "./StudioVaultPlayer";

interface VideoFactoryViewProps {
  initialProduct?: {
    product_name?: string;
    url?: string;
    price?: string;
    features?: string;
    copywriting?: string;
  };
}

export default function VideoFactoryView({ initialProduct }: VideoFactoryViewProps) {
  const [activePlayerTab, setActivePlayerTab] = useState<"live_engine" | "studio_vault">("live_engine");
  const [productName, setProductName] = useState<string>(
    initialProduct?.product_name || "AeroStreet Vulcan X-Pro"
  );
  const [productUrl, setProductUrl] = useState<string>(
    initialProduct?.url || "https://aerostreet.id/products/vulcan-xpro"
  );
  const [productPrice, setProductPrice] = useState<string>(
    initialProduct?.price || "Rp 249.000"
  );
  const [productFeatures, setProductFeatures] = useState<string>(
    initialProduct?.features || "Sol Nitro-Bounce ultra empuk, breathable carbon mesh, anti-slip grip"
  );
  const [selectedAngle, setSelectedAngle] = useState<"comfort" | "style" | "price_drop">("comfort");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Video Manifest State
  const [manifest, setManifest] = useState<VideoManifest | null>(null);

  // Update fields if initialProduct changes (e.g. from Swarm bridge)
  useEffect(() => {
    if (initialProduct?.product_name) {
      setProductName(initialProduct.product_name);
    }
    if (initialProduct?.url) {
      setProductUrl(initialProduct.url);
    }
    if (initialProduct?.price) {
      setProductPrice(initialProduct.price);
    }
    if (initialProduct?.features) {
      setProductFeatures(initialProduct.features);
    }
  }, [initialProduct]);

  // Generate / Regenerate Pipeline
  const handleGenerate = async (angleOverride?: "comfort" | "style" | "price_drop") => {
    const angleToUse = angleOverride || selectedAngle;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/factory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          url: productUrl,
          price: productPrice,
          features: productFeatures,
          angle: angleToUse,
        }),
      });
      const data = await res.json();
      if (data.manifest) {
        setManifest(data.manifest);
      }
    } catch (e) {
      console.error("Failed to generate factory manifest:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleAngleSelect = (angle: "comfort" | "style" | "price_drop") => {
    setSelectedAngle(angle);
    handleGenerate(angle);
  };

  const wordCount = manifest?.script?.word_count || 20;
  const charCount = manifest?.script?.char_count || 145;
  const isWordValid = wordCount <= 22;
  const isCharValid = charCount <= 145;

  return (
    <div className="space-y-6">
      {/* FACTORY STUDIO BANNER & MODE SELECTOR */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#080d1a]/95 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Film className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Zero-Touch 60fps Video Factory Studio
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Programmatic Audio-Visual Engine: Otomatisasi script VO, multi-angle vision, dynamic HUD, dan rendering MP4 1080x1920 @ 60fps.
          </p>
        </div>

        {/* DUAL-MODE TAB SELECTOR */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActivePlayerTab("live_engine")}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activePlayerTab === "live_engine"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,245,212,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ LIVE 60FPS ENGINE (BROWSER)</span>
          </button>
          <button
            onClick={() => setActivePlayerTab("studio_vault")}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activePlayerTab === "studio_vault"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>💿 STUDIO MASTERED MP4 VAULT</span>
          </button>
        </div>
      </div>

      {/* QUICK INGESTION FORM & VOICE OVER CONTROLS */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#080d1a]/90 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>ZERO-TOUCH PRODUCT INGESTOR & ANGLE MULTIPLIER</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              VO HARD-GUARD: LOCKED
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">NAMA PRODUK</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-400 outline-none"
              placeholder="Contoh: AeroStreet Vulcan X-Pro"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">HARGA RESMI / PROMO</label>
            <input
              type="text"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-400 outline-none"
              placeholder="Contoh: Rp 249.000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-slate-400 block mb-1">FITUR UTAMA / UVP</label>
            <input
              type="text"
              value={productFeatures}
              onChange={(e) => setProductFeatures(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-cyan-400 outline-none"
              placeholder="Contoh: Sol Nitro-Bounce ultra empuk, breathable carbon mesh"
            />
          </div>
        </div>

        {/* ANGLE BUTTONS & REGENERATE TRIGGER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-mono">ANGLE HOOK:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: "comfort", label: "Comfort & Tech" },
                { id: "style", label: "Street Style" },
                { id: "price_drop", label: "Price Slam" },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAngleSelect(a.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    selectedAngle === a.id
                      ? "bg-slate-800 text-cyan-300 border border-cyan-400"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Menghitung Frame 60fps & Subtitle...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black text-black" />
                <span>REGENERATE 60FPS PIPELINE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DUAL-MODE VIDEO PLAYER VIEW */}
      {activePlayerTab === "live_engine" ? (
        manifest ? (
          <LiveInteractivePlayer
            manifest={manifest}
            onAngleChange={handleAngleSelect}
          />
        ) : (
          <div className="p-12 text-center text-slate-400 font-mono">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading 60fps Interactive Engine...
          </div>
        )
      ) : (
        <StudioVaultPlayer />
      )}

      {/* MULTI-ANGLE ASSET VAULT & AI VISION HUD TELEMETRY */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#080d1a]/90 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>AUTONOMOUS MULTI-ANGLE VISION & HUD COORDINATE INSPECT</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300">
            Detected Target: X=582, Y=580 (58.2% • 58.0%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* ANGLE 1 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center gap-3 text-center">
            <span className="text-cyan-300 font-bold text-[11px]">
              ANGLE 1: HERO PROFILE (0% - 30%)
            </span>
            <div className="w-44 h-28 flex items-center justify-center bg-black/40 rounded-lg p-2 border border-slate-800">
              <img
                src="/assets/product_1.png"
                alt="Angle 1"
                className="max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/product.png";
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Full-shot profil samping sepatu dengan floating spring oscillation.
            </p>
          </div>

          {/* ANGLE 2 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center gap-3 text-center">
            <span className="text-purple-300 font-bold text-[11px]">
              ANGLE 2: MACRO ZOOM + HUD (30% - 70%)
            </span>
            <div className="relative w-44 h-28 flex items-center justify-center bg-black/40 rounded-lg p-2 border border-slate-800">
              <img
                src="/assets/product_2.png"
                alt="Angle 2"
                className="max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/product.png";
                }}
              />
              <div className="absolute w-3 h-3 rounded-full border border-cyan-400 bg-cyan-400/40 right-10 bottom-6 animate-ping" />
            </div>
            <p className="text-[10px] text-slate-400">
              Macro zoom 1.55x dengan HUD dynamic reticle menunjuk persis ke sol empuk.
            </p>
          </div>

          {/* ANGLE 3 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center gap-3 text-center">
            <span className="text-emerald-300 font-bold text-[11px]">
              ANGLE 3: PRICE SLAM CTA (70% - 100%)
            </span>
            <div className="w-44 h-28 flex items-center justify-center bg-black/40 rounded-lg p-2 border border-slate-800">
              <img
                src="/assets/product_3.png"
                alt="Angle 3"
                className="max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/product.png";
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Sudut aksi dramatis saat harga dibanting dengan efek getar dan tombol CTA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
