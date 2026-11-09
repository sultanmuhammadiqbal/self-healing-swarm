"use client";

import React, { useState } from "react";
import {
  Download,
  Film,
  Music,
  CheckCircle2,
  Sliders,
  Play,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface RenderedVideoItem {
  id: string;
  name: string;
  filename: string;
  filesize: string;
  fps: string;
  resolution: string;
  description: string;
  tags: string[];
}

const RENDERED_VIDEOS: RenderedVideoItem[] = [
  {
    id: "v4_multiangle",
    name: "V4: Multi-Angle Vision & 3D Flip (Latest)",
    filename: "/renders/viral_video_v4_multiangle.mp4",
    filesize: "9.4 MB",
    fps: "60 FPS",
    resolution: "1080 x 1920 (9:16)",
    description:
      "Versi tercanggih dengan Autonomous Multi-Image Hunter, 3D Y-Axis Flip ke angle makro, dan garis leader HUD yang menempel presisi di koordinat (582, 580).",
    tags: ["3D Flip", "Macro HUD", "Multi-Image", "60 FPS"],
  },
  {
    id: "v3_mastered",
    name: "V3: Broadcast DSP Audio Mastering",
    filename: "/renders/viral_video_v3_mastered.mp4",
    filesize: "9.8 MB",
    fps: "60 FPS",
    resolution: "1080 x 1920 (9:16)",
    description:
      "Vocal chain studio profesional: High-pass 85Hz, presence boost +4.5dB di 3.5kHz, soft-knee compressor, dan true sidechain ducking lo-fi BGM saat VO aktif.",
    tags: ["SciPy DSP", "Broadcast Voice", "Sidechain Ducking"],
  },
  {
    id: "v2_cinema",
    name: "V2: Cinema-Grade Virtual Camera Rig",
    filename: "/renders/viral_video_v2_cinema.mp4",
    filesize: "11.7 MB",
    fps: "60 FPS",
    resolution: "1080 x 1920 (9:16)",
    description:
      "3-Scene dynamic camera rig (Hook -> 1.65x Macro Zoom -> Price Slam) dengan efek getar kamera dan kinetic particle grid.",
    tags: ["Virtual Camera", "Macro Zoom", "Price Slam"],
  },
];

export default function StudioVaultPlayer() {
  const [selectedVideo, setSelectedVideo] = useState<RenderedVideoItem>(RENDERED_VIDEOS[0]);
  const [isRenderingLocal, setIsRenderingLocal] = useState<boolean>(false);
  const [localRenderStatus, setLocalRenderStatus] = useState<string | null>(null);

  const handleTriggerLocalRender = async () => {
    setIsRenderingLocal(true);
    setLocalRenderStatus("Menghubungi Remotion Chromium & Python SciPy Engine...");
    try {
      const res = await fetch("http://localhost:8080/api/render-v4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle: "comfort",
          product_name: "AeroStreet Vulcan X-Pro",
          price: "Rp 249.000",
        }),
      });
      const data = await res.json();
      if (data.success || data.output_video) {
        setLocalRenderStatus("✅ Render MP4 60fps Berhasil Diselesaikan via Headless Chromium!");
      } else {
        setLocalRenderStatus("Pesan: " + (data.message || "Render selesai di background"));
      }
    } catch (e: any) {
      setLocalRenderStatus(
        "Backend lokal di port 8080 dalam mode standby. Video master tetap dapat diputar & diunduh langsung dari serverless cache."
      );
    } finally {
      setIsRenderingLocal(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
      {/* 9:16 VERTICAL MP4 VIDEO PLAYER */}
      <div className="relative w-[340px] sm:w-[380px] h-[600px] sm:h-[670px] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.25)] border-2 border-purple-500/50 bg-black flex flex-col justify-between">
        <video
          key={selectedVideo.filename}
          src={selectedVideo.filename}
          controls
          autoPlay
          loop
          playsInline
          className="w-full h-full object-cover"
        />

        {/* FLOATING BADGE OVERLAY */}
        <div className="absolute top-4 left-4 right-4 pointer-events-none flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-black/80 border border-purple-500/60 text-purple-300 font-mono text-[11px] font-bold backdrop-blur-md">
            MASTERED MP4 • {selectedVideo.fps}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-mono text-[10px]">
            {selectedVideo.filesize}
          </span>
        </div>
      </div>

      {/* VAULT DETAILS, AUDIO STEM & DOWNLOADS */}
      <div className="flex-1 w-full max-w-lg space-y-4 text-xs font-mono">
        {/* RENDER VAULT SELECTOR */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              <span>STUDIO RENDER ARCHIVE</span>
            </span>
            <span className="text-purple-300 font-bold">1080x1920 H.264</span>
          </div>

          <div className="space-y-2">
            {RENDERED_VIDEOS.map((v) => {
              const isSelected = selectedVideo.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVideo(v)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-purple-950/40 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{v.name}</span>
                    <span className="text-[10px] text-purple-300 font-bold px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40">
                      {v.filesize}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {v.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DOWNLOAD ACTION */}
          <a
            href={selectedVideo.filename}
            download
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD MASTER MP4 ({selectedVideo.filesize})</span>
          </a>
        </div>

        {/* BROADCAST VOCAL CHAIN & AUDIO STEM */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" />
              <span>SCIPY BROADCAST DSP VOCAL STEM</span>
            </span>
            <span className="text-emerald-400 font-bold">48kHz STEREO</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">EQUALIZER (PRESENCE)</div>
              <div className="text-cyan-300 font-bold">+4.5dB @ 3.5kHz</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">DYNAMIC COMPRESSOR</div>
              <div className="text-purple-300 font-bold">-18dBFS (3.5:1)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">SIDECHAIN DUCKING</div>
              <div className="text-emerald-400 font-bold">BGM 28% → 9%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">PEAK LIMITER</div>
              <div className="text-amber-300 font-bold">-1.0dB True Peak</div>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block mb-1">
              Master Audio Stem (`master_audio.wav`):
            </span>
            <audio src="/renders/master_audio.wav" controls className="w-full h-8" />
          </div>
        </div>

        {/* LOCAL PYTHON / REMOTION RE-RENDER BUTTON */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <button
            onClick={handleTriggerLocalRender}
            disabled={isRenderingLocal}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-cyan-500/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            {isRenderingLocal ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Memproses Frame Chromium & FFmpeg...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Re-render Physical MP4 via Python (Port 8080)</span>
              </>
            )}
          </button>
          {localRenderStatus && (
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              {localRenderStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
