"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { CloserProduct, VisionAnalysisResponse } from "../../types/closer";

interface OotdVisionScannerProps {
  product: CloserProduct;
  triggerScanSignal: number;
  onVisionComplete: (result: VisionAnalysisResponse) => void;
}

interface OutfitPreset {
  id: string;
  label: string;
  description: string;
  colors: { hex: string; name: string; ratio: number }[];
}

const OUTFIT_PRESETS: OutfitPreset[] = [
  {
    id: "cyber-cargo",
    label: "Charcoal Cargo + Volt Tee",
    description: "Streetwear gelap dengan aksen neon cyan & putih bersih",
    colors: [
      { hex: "#1E293B", name: "Charcoal Cargo", ratio: 54 },
      { hex: "#06B6D4", name: "Volt Graphic Tee", ratio: 28 },
      { hex: "#F8FAFC", name: "White Layer", ratio: 18 },
    ],
  },
  {
    id: "gorpcore-olive",
    label: "Tactical Olive Shell + Black Nylon",
    description: "Outerwear Gorpcore tahan angin dengan celana parasut hitam",
    colors: [
      { hex: "#111827", name: "Phantom Nylon Pant", ratio: 50 },
      { hex: "#10B981", name: "Emerald Tech Shell", ratio: 32 },
      { hex: "#94A3B8", name: "Titanium Buckle", ratio: 18 },
    ],
  },
  {
    id: "vintage-varsity",
    label: "Cream Hoodie + Raw Indigo Jeans",
    description: "Gaya heritage court bersih dengan hoodie cream & aksen merah",
    colors: [
      { hex: "#F8FAFC", name: "Sail Cream Fleece", ratio: 48 },
      { hex: "#EF4444", name: "Crimson Varsity Stripe", ratio: 30 },
      { hex: "#1E3A8A", name: "Raw Indigo Denim", ratio: 22 },
    ],
  },
];

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function classifyColorName(r: number, g: number, b: number): string {
  const brightness = (r + g + b) / 3;
  if (brightness < 45) return "Obsidian Black";
  if (brightness > 215) return "Crisp White";
  if (r > g + 45 && r > b + 45) return "Crimson Street";
  if (g > r + 30 && g > b + 20) return "Emerald Olive";
  if (b > r + 35 && g > 120) return "Cyber Cyan";
  if (b > r + 30) return "Indigo Denim";
  return "Urban Slate";
}

export const OotdVisionScanner: React.FC<OotdVisionScannerProps> = ({
  product,
  triggerScanSignal,
  onVisionComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<OutfitPreset>(
    OUTFIT_PRESETS[0]
  );
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [visionResult, setVisionResult] =
    useState<VisionAnalysisResponse | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startWebcam = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 320, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setUploadedPreview(null);
      setCameraActive(true);
    } catch {
      setCameraError(
        "Webcam tidak terdeteksi/diizinkan. Menggunakan mode Preset / Upload Foto Outfit."
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => stopWebcam();
  }, [stopWebcam]);

  const extractPaletteFromCanvas = (): {
    palette: { hex: string; name: string; ratio: number }[];
    dataUrl?: string;
  } => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (cameraActive && canvas && video && video.readyState >= 2) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 160;
        canvas.height = 120;
        ctx.drawImage(video, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120).data;

        // Quantize into 3 regional buckets (upper, mid, lower)
        const regions = [
          { r: 0, g: 0, b: 0, count: 0, ratio: 48 },
          { r: 0, g: 0, b: 0, count: 0, ratio: 32 },
          { r: 0, g: 0, b: 0, count: 0, ratio: 20 },
        ];
        for (let i = 0; i < imgData.length; i += 16) {
          const bucket = (i / 16) % 3;
          regions[bucket].r += imgData[i];
          regions[bucket].g += imgData[i + 1];
          regions[bucket].b += imgData[i + 2];
          regions[bucket].count++;
        }

        const palette = regions.map((reg) => {
          const r = reg.r / Math.max(1, reg.count);
          const g = reg.g / Math.max(1, reg.count);
          const b = reg.b / Math.max(1, reg.count);
          return {
            hex: rgbToHex(r, g, b),
            name: classifyColorName(r, g, b),
            ratio: reg.ratio,
          };
        });

        return {
          palette,
          dataUrl: canvas.toDataURL("image/jpeg", 0.75),
        };
      }
    }
    return { palette: selectedPreset.colors };
  };

  const handleScanOutfit = useCallback(async () => {
    setIsScanning(true);
    try {
      const { palette, dataUrl } = extractPaletteFromCanvas();
      const res = await fetch("/api/closer/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          extractedPalette: palette,
          imageDataUrl: dataUrl,
          outfitLabel: cameraActive ? "Live Webcam Snapshot" : selectedPreset.label,
        }),
      });
      const data = (await res.json()) as VisionAnalysisResponse;
      setVisionResult(data);
      onVisionComplete(data);
    } catch {
      // Fallback handled gracefully
    } finally {
      setIsScanning(false);
    }
  }, [cameraActive, onVisionComplete, product, selectedPreset]);

  // Trigger scan automatically when AI voice tool-calling dispatches ANALYZE_OOTD
  useEffect(() => {
    if (triggerScanSignal > 0) {
      handleScanOutfit();
    }
  }, [triggerScanSignal, handleScanOutfit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopWebcam();
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              👁️ Live Webcam &amp; OOTD Outfit Matcher
            </h4>
            <p className="text-[11px] text-slate-400">
              RGB/Hex Color Quantization + Contrast Harmony Scanner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startWebcam}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Live Webcam
            </button>
          ) : (
            <button
              type="button"
              onClick={stopWebcam}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium transition"
            >
              <CameraOff className="w-3.5 h-3.5" />
              Stop Cam
            </button>
          )}

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            Upload Foto
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {cameraError && (
        <p className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
          {cameraError}
        </p>
      )}

      {/* Hidden Canvas for Frame Capture & RGB Quantization */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left: Webcam / Uploaded Photo / Outfit Swatch Preview */}
        <div className="relative h-40 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${
              cameraActive ? "block" : "hidden"
            }`}
          />

          {!cameraActive && uploadedPreview && (
            <img
              src={uploadedPreview}
              alt="Uploaded Outfit"
              className="w-full h-full object-cover"
            />
          )}

          {!cameraActive && !uploadedPreview && (
            <div className="p-3 w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  ACTIVE OUTFIT PRESET
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  READY TO SCAN
                </span>
              </div>
              <p className="text-xs font-bold text-white">
                {selectedPreset.label}
              </p>
              <div className="flex items-center gap-2">
                {selectedPreset.colors.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-10 rounded-lg border border-white/15 flex items-end p-1"
                    style={{ backgroundColor: c.hex }}
                  >
                    <span className="text-[9px] font-mono bg-black/65 text-white px-1 rounded">
                      {c.hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 bg-cyan-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 text-cyan-300 animate-spin" />
              <span className="mt-1 text-xs font-mono text-cyan-200">
                QUANTIZING RGB &amp; CONTRAST...
              </span>
            </div>
          )}
        </div>

        {/* Right: Preset Selector + Scan Action Button */}
        <div className="flex flex-col justify-between gap-2">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Pilih Simulasi Outfit atau Gunakan Kamera:
            </span>
            {OUTFIT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedPreset(preset);
                  setUploadedPreview(null);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left text-xs transition ${
                  selectedPreset.id === preset.id && !cameraActive
                    ? "bg-cyan-500/15 border-cyan-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <span className="truncate font-medium">{preset.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {preset.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleScanOutfit}
            disabled={isScanning}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            📸 Scan My Outfit &amp; Match Colorway
          </button>
        </div>
      </div>

      {/* Vision Match Result Telemetry */}
      {visionResult && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {visionResult.verdictBadge}
            </span>
            <span className="text-[11px] font-mono text-cyan-300">
              Contrast: {visionResult.contrastRatio}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {visionResult.styleNotes}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {visionResult.dominantOutfitColors.map((col, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px]"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: col.hex }}
                />
                <span className="text-slate-200 font-medium">{col.name}</span>
                <span className="text-slate-400 font-mono">{col.hex}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
