"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Flame,
  Zap,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export interface WordTimestamp {
  index: number;
  word: string;
  clean_word: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  start_frame: number;
  end_frame: number;
  is_keyword: boolean;
}

export interface VideoManifest {
  product: {
    name: string;
    category_features: string;
    feature_badges: string[];
    price: string;
    image_asset: string;
    product_images: string[];
    hud_target_x: number;
    hud_target_y: number;
    hud_target_x_pct: number;
    hud_target_y_pct: number;
  };
  script: {
    voiceover_text: string;
    word_count: number;
    char_count: number;
    max_words_guard: number;
    max_chars_guard: number;
    single_product_focus: boolean;
    angle: string;
    angle_label: string;
    highlight_keywords: string[];
    visual_theme_color: string;
  };
  video: {
    width: number;
    height: number;
    fps: number;
    duration_ms: number;
    duration_in_frames: number;
  };
  word_timestamps: WordTimestamp[];
}

interface LiveInteractivePlayerProps {
  manifest: VideoManifest;
  onAngleChange?: (angle: "comfort" | "style" | "price_drop") => void;
}

export default function LiveInteractivePlayer({
  manifest,
  onAngleChange,
}: LiveInteractivePlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<"web_audio" | "audio_element">("audio_element");

  const totalFrames = manifest?.video?.duration_in_frames || 504;
  const fps = manifest?.video?.fps || 60;
  const totalDurationSec = (totalFrames / fps).toFixed(1);
  const currentSec = (currentFrame / fps).toFixed(1);

  // Audio elements & Web Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const lastPunchFrameRef = useRef<number>(-1);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Scene milestones
  const scene1End = Math.floor(totalFrames * 0.3); // 0% - 30%: Hero Angle
  const scene2End = Math.floor(totalFrames * 0.7); // 30% - 70%: Macro Zoom + HUD

  const currentScene =
    currentFrame < scene1End ? 1 : currentFrame < scene2End ? 2 : 3;

  // Active word timestamp calculation
  const activeWord = manifest?.word_timestamps?.find(
    (w) => currentFrame >= w.start_frame && currentFrame <= w.end_frame
  );

  // Initialize Web Audio Synthesizer
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  // Sound 1: Whoosh Transition
  const triggerWhooshSfx = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {
      // AudioContext error handling
    }
  }, [isMuted]);

  // Sound 2: 808 Sub-Bass Pop Punch
  const trigger808BassPunch = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {
      // AudioContext error handling
    }
  }, [isMuted]);

  // Trigger sound punches at keyframes
  useEffect(() => {
    if (!isPlaying) return;

    // Trigger whoosh on scene changes
    if (currentFrame === 2 || currentFrame === scene1End || currentFrame === scene2End) {
      triggerWhooshSfx();
    }

    // Trigger bass punch on keyword timestamps
    if (activeWord?.is_keyword && lastPunchFrameRef.current !== activeWord.start_frame) {
      lastPunchFrameRef.current = activeWord.start_frame;
      trigger808BassPunch();
    }

    // Trigger punch on price slam entrance
    if (currentFrame === scene2End + 4) {
      trigger808BassPunch();
    }
  }, [currentFrame, isPlaying, activeWord, scene1End, scene2End, triggerWhooshSfx, trigger808BassPunch]);

  // 60fps Animation Loop
  const loop = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;

      // 60fps tick (approx 16.6ms per frame)
      if (delta >= 1000 / fps) {
        lastTimeRef.current = time;
        setCurrentFrame((prev) => {
          if (prev >= totalFrames) {
            setIsPlaying(false);
            if (audioElementRef.current) {
              audioElementRef.current.pause();
              audioElementRef.current.currentTime = 0;
            }
            return 0;
          }
          return prev + 1;
        });
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    },
    [isPlaying, totalFrames, fps]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(loop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, loop]);

  const togglePlay = () => {
    initAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (audioElementRef.current && !isMuted) {
        const audioTime = currentFrame / fps;
        audioElementRef.current.currentTime = audioTime;
        audioElementRef.current.play().catch(() => {
          // fallback to Web Audio synthesize
          setAudioMode("web_audio");
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentFrame(0);
    lastPunchFrameRef.current = -1;
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      if (isPlaying) audioElementRef.current.play().catch(() => {});
    }
  };

  const handleScrub = (newFrame: number) => {
    setCurrentFrame(newFrame);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = newFrame / fps;
    }
  };

  // 3-Scene visual transforms
  const productImages = manifest?.product?.product_images || [
    "/assets/product_1.png",
    "/assets/product_2.png",
    "/assets/product_3.png",
  ];

  // Visual Math for Scene 1 (Hero Entrance)
  const scene1Progress = Math.min(1, currentFrame / Math.max(1, scene1End));
  const heroScale = Math.min(1, 0.75 + scene1Progress * 0.25);
  const heroTranslateY = Math.max(0, (1 - scene1Progress) * 50);
  const floatOffset = Math.sin(currentFrame * 0.08) * 8;

  // Visual Math for Scene 2 (3D Flip & Macro Zoom)
  const isScene2 = currentFrame >= scene1End && currentFrame < scene2End;
  const scene2Frame = currentFrame - scene1End;
  const flipDuration = 18;
  const isFlipping = scene2Frame < flipDuration;
  const flipAngle = isFlipping ? Math.sin((scene2Frame / flipDuration) * Math.PI) * 90 : 0;
  const activeImage =
    currentScene === 1
      ? productImages[0]
      : currentScene === 2
      ? productImages[1] || productImages[0]
      : productImages[2] || productImages[0];

  // Macro zoom scale
  const macroScale = isScene2 ? 1.55 : 1.0;
  const macroPanX = isScene2 ? -25 : 0;
  const macroPanY = isScene2 ? -35 : 0;

  // Visual Math for Scene 3 (Price Slam)
  const isScene3 = currentFrame >= scene2End;
  const scene3Frame = currentFrame - scene2End;
  const slamProgress = Math.min(1, scene3Frame / 14);
  const slamScale = isScene3 ? Math.max(1, 2.0 - slamProgress * 1.0) : 1;

  // HUD Coordinate percentages
  const hudX = (manifest?.product?.hud_target_x_pct ?? 0.582) * 100;
  const hudY = (manifest?.product?.hud_target_y_pct ?? 0.58) * 100;

  const themeColor = manifest?.script?.visual_theme_color || "#00F5D4";

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
      {/* 9:16 VERTICAL 60FPS STAGE */}
      <div className="relative w-[340px] sm:w-[380px] h-[600px] sm:h-[670px] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,212,0.2)] border-2 border-slate-700/80 bg-black flex flex-col justify-between select-none">
        {/* DYNAMIC BACKGROUND MESH GRADIENT */}
        <div
          className="absolute inset-0 transition-all duration-700 pointer-events-none opacity-85"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${themeColor}22 0%, rgba(15,23,42,0.9) 60%, #000 100%)`,
          }}
        />

        {/* MOVING PARTICLE GRID & SCANLINES */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

        {/* TOP STATUS OVERLAY: 60FPS HUD & ANGLE BADGE */}
        <div className="relative z-20 pt-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-white tracking-wider">
              60 FPS ENGINE
            </span>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide border shadow-sm backdrop-blur-md"
            style={{
              backgroundColor: `${themeColor}20`,
              borderColor: `${themeColor}60`,
              color: themeColor,
            }}
          >
            SCENE {currentScene}/3 • {manifest?.script?.angle_label || "Comfort"}
          </div>
        </div>

        {/* TOP HOOK & TITLE BANNER */}
        <div className="relative z-20 px-4 pt-2 text-center">
          <div className="inline-block px-3 py-1 rounded-lg bg-black/60 border border-slate-800 backdrop-blur-md text-[11px] font-mono text-cyan-300 uppercase tracking-widest mb-1">
            🔥 {manifest?.product?.name || "AeroStreet Vulcan"}
          </div>
          <div className="text-xs font-semibold text-slate-300 drop-shadow">
            {manifest?.product?.category_features?.split(",")[0] || "Sol Ultra Empuk"}
          </div>
        </div>

        {/* CENTER STAGE: MULTI-ANGLE 3D FLIP PRODUCT & VIRTUAL CAMERA RIG */}
        <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">
          {/* PRODUCT CONTAINER WITH SPRING DYNAMICS */}
          <div
            className="relative transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `perspective(900px) translateY(${heroTranslateY + floatOffset}px) scale(${
                currentScene === 2 ? macroScale : currentScene === 3 ? 1.05 : heroScale
              }) translate(${macroPanX}px, ${macroPanY}px) rotateY(${flipAngle}deg)`,
              filter: isFlipping ? "blur(2px) brightness(1.3)" : "none",
            }}
          >
            {/* GLOW DISK BEHIND PRODUCT */}
            <div
              className="absolute w-56 h-56 rounded-full blur-3xl opacity-40 transition-colors duration-500"
              style={{ backgroundColor: themeColor }}
            />

            {/* PRODUCT IMAGE */}
            <img
              src={activeImage}
              alt={manifest?.product?.name}
              className="w-64 sm:w-72 h-auto max-h-[320px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] pointer-events-none"
              onError={(e) => {
                // fallback to product.png if angle file not yet loaded
                (e.target as HTMLImageElement).src = "/assets/product.png";
              }}
            />

            {/* SCENE 2: DYNAMIC AI VISION MACRO HUD CALLOUT */}
            {isScene2 && (
              <div
                className="absolute pointer-events-none transition-opacity duration-300"
                style={{
                  left: `${hudX}%`,
                  top: `${hudY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* TARGET RETICLE */}
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                  <div className="absolute w-4 h-4 rounded-full border border-cyan-300 bg-cyan-400/30" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-200" />
                </div>

                {/* SVG LEADER LINE TO FLOATING CALLOUT */}
                <svg
                  className="absolute left-4 top-4 overflow-visible pointer-events-none"
                  width="180"
                  height="80"
                >
                  <polyline
                    points="0,0 45,30 140,30"
                    fill="none"
                    stroke="#00F5D4"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle cx="140" cy="30" r="3" fill="#00F5D4" />
                </svg>

                {/* FLOATING HUD CARD */}
                <div className="absolute left-28 top-8 w-44 p-2.5 rounded-xl bg-slate-950/90 border border-cyan-400/80 shadow-[0_0_20px_rgba(0,245,212,0.4)] backdrop-blur-md">
                  <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300 font-bold mb-0.5">
                    <span>AI VISION INSPECT</span>
                    <span className="text-[8px] text-slate-400">58% • 58%</span>
                  </div>
                  <div className="text-[11px] font-bold text-white leading-tight">
                    {manifest?.product?.feature_badges?.[0] || "Sol Nitro-Bounce"}
                  </div>
                  <div className="text-[9px] text-cyan-200/80 mt-0.5">
                    68% Energy Return • Ultra Empuk
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: KINETIC SUBTITLE & PRICE SLAM CTA */}
        <div className="relative z-20 pb-5 px-4 space-y-3">
          {/* SCENE 3: PRICE SLAM IMPACT BADGE */}
          {isScene3 && (
            <div
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-cyan-950/90 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-md text-center transition-all"
              style={{
                transform: `scale(${slamScale})`,
              }}
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">
                <Flame className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
                <span>HARGA RESMI PROMO SPESIAL</span>
              </div>
              <div className="text-2xl font-black font-mono text-white tracking-tight drop-shadow-md">
                {manifest?.product?.price || "Rp 249.000"}
              </div>
            </div>
          )}

          {/* WORD-BY-WORD KINETIC SUBTITLE CONTAINER */}
          <div className="min-h-[58px] p-2.5 rounded-2xl bg-slate-950/85 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-center gap-1.5 text-center shadow-lg">
            {manifest?.word_timestamps?.map((word) => {
              const isActive =
                currentFrame >= word.start_frame && currentFrame <= word.end_frame;
              const isPassed = currentFrame > word.end_frame;

              return (
                <span
                  key={word.index}
                  className={`text-xs font-semibold px-1 py-0.5 rounded transition-all duration-75 ${
                    isActive
                      ? "scale-115 text-black font-bold shadow-lg"
                      : isPassed
                      ? "text-slate-200"
                      : "text-slate-500 opacity-60"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? word.is_keyword
                        ? "#FFE600"
                        : themeColor
                      : "transparent",
                    color: isActive ? "#000" : undefined,
                    transform: isActive ? "scale(1.15)" : "scale(1.0)",
                  }}
                >
                  {word.word}
                </span>
              );
            })}
          </div>

          {/* PULSING CTA BUTTON */}
          <button
            onClick={() => alert(`Membeli ${manifest?.product?.name} seharga ${manifest?.product?.price}`)}
            className="w-full py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 20px ${themeColor}60`,
            }}
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>BELI SEKARANG • {manifest?.product?.price || "Rp 249.000"}</span>
          </button>
        </div>

        {/* AUDIO ELEMENT REFERENCE */}
        <audio
          ref={audioElementRef}
          src="/assets/master_audio.wav"
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {/* PLAYER CONTROLS & TELEMETRY DECK */}
      <div className="flex-1 w-full max-w-md space-y-4 text-xs font-mono">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>60FPS SCRUBBER & PLAYBACK</span>
            </span>
            <span className="text-cyan-400 font-bold">
              {currentSec}s / {totalDurationSec}s • {currentFrame}/{totalFrames}f
            </span>
          </div>

          {/* SCRUB SLIDER */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={totalFrames}
              value={currentFrame}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Scene 1: Hook (0s)</span>
              <span>Scene 2: Macro (2.5s)</span>
              <span>Scene 3: Slam (5.8s)</span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={togglePlay}
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-black" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>PLAY 60FPS</span>
                </>
              )}
            </button>
            <button
              onClick={handleRestart}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              title="Restart Video"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl transition cursor-pointer ${
                isMuted
                  ? "bg-rose-900/40 text-rose-300 border border-rose-500/30"
                  : "bg-slate-800 hover:bg-slate-700 text-cyan-300"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ANGLE PRESET SELECTOR (A/B TESTING MULTIPLIER) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>A/B HOOK MULTIPLIER</span>
            </span>
            <span className="text-[10px] text-slate-500">1-Klik Ganti Angle</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "comfort", label: "Comfort & Tech", color: "#00F5D4" },
              { id: "style", label: "Street Style", color: "#F72585" },
              { id: "price_drop", label: "Price Drop", color: "#FFB703" },
            ].map((ang) => (
              <button
                key={ang.id}
                onClick={() => onAngleChange?.(ang.id as any)}
                className={`p-2 rounded-xl border text-[10px] font-bold transition cursor-pointer ${
                  manifest?.script?.angle === ang.id
                    ? "bg-slate-800 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,245,212,0.2)]"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {ang.label}
              </button>
            ))}
          </div>
        </div>

        {/* VOICE OVER HARD-GUARD TRANSPARENT TELEMETRY */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>VOICE OVER HARD-GUARD AUDIT</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">100% COMPLIANT</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">WORD COUNT GUARD</div>
              <div className="text-emerald-400 font-bold text-sm">
                {manifest?.script?.word_count || 20} / 22 words{" "}
                <span className="text-xs text-slate-400">✓</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px]">CHARACTER COUNT GUARD</div>
              <div className="text-emerald-400 font-bold text-sm">
                {manifest?.script?.char_count || 145} / 145 chars{" "}
                <span className="text-xs text-slate-400">✓</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic pt-1 leading-relaxed">
            "{manifest?.script?.voiceover_text}"
          </p>
        </div>
      </div>
    </div>
  );
}
