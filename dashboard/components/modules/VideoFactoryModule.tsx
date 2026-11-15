"use client";

import React from "react";
import { CloserProduct } from "../../types/closer";
import {
  Camera,
  CheckCircle2,
  Film,
  Layers,
  Mic,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";

interface VideoFactoryModuleProps {
  products: CloserProduct[];
  activeProduct: CloserProduct;
  onSelectProduct: (prod: CloserProduct) => void;
  customAngleImages: (string | null)[];
  onUploadAngleImage: (angleIndex: 0 | 1 | 2, dataUrl: string | null) => void;
  onLaunchCloser: (prod: CloserProduct) => void;
}

export const VideoFactoryModule: React.FC<VideoFactoryModuleProps> = ({
  products,
  activeProduct,
  onSelectProduct,
  customAngleImages,
  onUploadAngleImage,
  onLaunchCloser,
}) => {
  const handleFileChange = (
    angleIdx: 0 | 1 | 2,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadAngleImage(angleIdx, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono mb-2">
            <Film className="w-3.5 h-3.5" />
            MODULE 2 • MULTI-ANGLE AI VIDEO FACTORY
          </div>
          <h2 className="text-xl font-extrabold text-white">
            3-Angle Product Studio &amp; Commercial Asset Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Siapkan 3 Angle Foto Produk (Samping, Sol/Material, On-Feet) lalu luncurkan langsung ke ruang interaktif Modul 3: Live Voice &amp; Vision Closer!
          </p>
        </div>

        <button
          type="button"
          onClick={() => onLaunchCloser(activeProduct)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center gap-2 shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:brightness-110 transition"
        >
          <Mic className="w-4 h-4" />
          🎙️ Launch Live AI Closer for This Product
        </button>
      </div>

      {/* Product Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {products.map((prod) => (
          <button
            key={prod.id}
            type="button"
            onClick={() => onSelectProduct(prod)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              prod.id === activeProduct.id
                ? "bg-purple-500/20 border-purple-400 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {prod.name} ({prod.priceFormatted})
          </button>
        ))}
      </div>

      {/* 3 Angle Cards with Custom Photo Upload Support */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeProduct.angles.map((ang) => {
          const customImg = customAngleImages[ang.index];
          return (
            <div
              key={ang.index}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[10px] font-bold">
                    {ang.badge}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synced to Mod 3
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-2">
                  {ang.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{ang.subtitle}</p>

                <div className="mt-3 h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-3">
                  {customImg ? (
                    <img
                      src={customImg}
                      alt={ang.title}
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1">
                      <Layers className="w-7 h-7 text-cyan-400 mx-auto" />
                      <p className="text-[11px] font-mono text-slate-300">
                        Vector Blueprint Active
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Hotspot: ({ang.hotspotX}%, {ang.hotspotY}%)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <label className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  Upload Angle {ang.index + 1}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(ang.index, e)}
                    className="hidden"
                  />
                </label>
                {customImg && (
                  <button
                    type="button"
                    onClick={() => onUploadAngleImage(ang.index, null)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
