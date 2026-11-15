"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloserProduct } from "../../types/closer";
import {
  LiveStageOverlay,
  LiveStreamRespondPayload,
} from "../../app/api/livestream/respond/route";
import { soundEngine } from "../../lib/soundEffects";
import { formatRupiah } from "../../lib/closerGuard";
import {
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  MessageSquare,
  Pin,
  Play,
  Pause,
  Radio,
  Ruler,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

interface LiveStreamHostModuleProps {
  activeProduct: CloserProduct;
  allProducts: CloserProduct[];
  onSelectProduct: (prod: CloserProduct) => void;
  customAngleImages?: (string | null)[];
}

interface ChatCommentItem {
  id: string;
  username: string;
  comment: string;
  isPriority: boolean;
  answered: boolean;
  timestamp: string;
}

interface FloatingReaction {
  id: number;
  x: number;
  y: number;
  speed: number;
  symbol: string;
}

const BARRAGE_PRESETS = [
  {
    username: "@rizky_sneaker99",
    comment: "Kak ukuran 42 panjangnya berapa cm? Buat kaki lebar aman gak?",
  },
  {
    username: "@dinda_streetwear",
    comment: "Coba spill detail sol bawahnya kak, empuk & anti licin gak?",
  },
  {
    username: "@kevin_hypebeast",
    comment: "Spill tampilan on-feet pas dipakai jalan dong kak!",
  },
  {
    username: "@budi_checkout",
    comment: "Ada kode voucher diskon Flash Sale gak kak kalau checkout sekarang?",
  },
];

export const LiveStreamHostModule: React.FC<LiveStreamHostModuleProps> = ({
  activeProduct,
  allProducts,
  onSelectProduct,
  customAngleImages,
}) => {
  const [angleIndex, setAngleIndex] = useState<0 | 1 | 2>(0);
  const [stageOverlay, setStageOverlay] = useState<LiveStageOverlay>("NONE");
  const [overlayBadge, setOverlayBadge] = useState<string>(
    "🔄 AUTO-HOST: LATERAL AERO PROFILE"
  );
  const [pinnedChat, setPinnedChat] = useState<{
    username: string;
    comment: string;
  } | null>(null);

  const [hostSpeech, setHostSpeech] = useState<string>(
    `Selamat datang di Live 24/7! ${activeProduct.name} warna ${activeProduct.colorwayName} ini cuma ${activeProduct.weightGrams} gram, enteng parah!`
  );
  const [guardMetrics, setGuardMetrics] = useState({
    wordCount: 18,
    charCount: 118,
    passed: true,
    latencyMs: 32,
  });

  const [autoLoopActive, setAutoLoopActive] = useState<boolean>(true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [viewerCount, setViewerCount] = useState<number>(1428);
  const [stockLeft, setStockLeft] = useState<number>(4);
  const [flashSeconds, setFlashSeconds] = useState<number>(59);

  const [priorityQueue, setPriorityQueue] = useState<ChatCommentItem[]>([]);
  const [chatFeed, setChatFeed] = useState<ChatCommentItem[]>([
    {
      id: "init-1",
      username: "@aldi_jakarta",
      comment: "Wah warnanya cakep banget kak 🔥",
      isPriority: false,
      answered: true,
      timestamp: "Baru saja",
    },
    {
      id: "init-2",
      username: "@sinta_runner",
      comment: "Udah masukin keranjang kuning!",
      isPriority: false,
      answered: true,
      timestamp: "Baru saja",
    },
  ]);

  const [customUsername, setCustomUsername] = useState<string>("@andi_vip");
  const [customComment, setCustomComment] = useState<string>("");

  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reactionsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reactionsRef = useRef<FloatingReaction[]>([]);
  const autoStepRef = useRef<number>(0);
  const processingInterruptRef = useRef<boolean>(false);

  // Reset host greeting when activeProduct changes (1-Product Lock)
  useEffect(() => {
    setAngleIndex(0);
    setStageOverlay("NONE");
    setPinnedChat(null);
    const initialText = `Selamat datang di Live 24/7! ${activeProduct.name} warna ${activeProduct.colorwayName} ini cuma ${activeProduct.weightGrams} gram, enteng parah!`;
    setHostSpeech(initialText);
    const words = initialText.split(/\s+/).filter(Boolean).length;
    setGuardMetrics({
      wordCount: words,
      charCount: initialText.length,
      passed: words <= 22 && initialText.length <= 145,
      latencyMs: 24,
    });
  }, [activeProduct]);

  // 60fps Cyber-Host Avatar Waveform + Floating Heart/Fire Reactions
  useEffect(() => {
    reactionsRef.current = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 20 + (i % 4) * 14,
      y: 260 + i * 22,
      speed: 0.9 + (i % 3) * 0.45,
      symbol: ["❤️", "🔥", "⚡", "👟", "💎"][i % 5],
    }));

    let animId: number;
    let phase = 0;

    const renderLoop = () => {
      phase += 0.08;

      // 1. Render Cyber-Host Avatar Waveform
      const avCanvas = avatarCanvasRef.current;
      if (avCanvas) {
        const ctx = avCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, avCanvas.width, avCanvas.height);
          const bars = 18;
          const barW = 4;
          const gap = 3;
          for (let i = 0; i < bars; i++) {
            const amp = isSpeaking
              ? 8 + Math.abs(Math.sin(phase * 1.8 + i * 0.5)) * 22
              : 4 + Math.abs(Math.sin(phase * 0.5 + i * 0.4)) * 5;
            const x = 8 + i * (barW + gap);
            const y = (avCanvas.height - amp) / 2;
            ctx.fillStyle = i % 2 === 0 ? "#F43F5E" : "#06B6D4";
            ctx.beginPath();
            ctx.roundRect(x, y, barW, amp, 2);
            ctx.fill();
          }
        }
      }

      // 2. Render 60fps Floating Hearts & Reactions
      const rcCanvas = reactionsCanvasRef.current;
      if (rcCanvas) {
        const ctx = rcCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, rcCanvas.width, rcCanvas.height);
          ctx.font = "16px sans-serif";
          reactionsRef.current.forEach((r) => {
            r.y -= r.speed;
            const sway = Math.sin(phase * 0.6 + r.id) * 6;
            if (r.y < 10) {
              r.y = rcCanvas.height - 10;
            }
            const alpha = Math.max(0.15, Math.min(1, r.y / 180));
            ctx.globalAlpha = alpha;
            ctx.fillText(r.symbol, r.x + sway, r.y);
          });
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isSpeaking]);

  // Countdown Timer & Live Viewer Fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSeconds((prev) => (prev <= 1 ? 59 : prev - 1));
      setViewerCount((prev) => prev + Math.floor(Math.random() * 7) - 2);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Speak AI Host utterance via Web Speech API
  const speakHostLine = useCallback(
    (text: string) => {
      if (
        !ttsEnabled ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2600);
        return;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.rate = 1.1;
      utter.pitch = 1.05;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [ttsEnabled]
  );

  // Trigger Priority Interrupt on the Live Broadcast Stage
  const executePriorityInterrupt = useCallback(
    async (item: ChatCommentItem) => {
      processingInterruptRef.current = true;
      soundEngine.playLiveBellSound();

      setPinnedChat({
        username: item.username,
        comment: item.comment,
      });

      try {
        const res = await fetch("/api/livestream/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "interrupt",
            username: item.username,
            comment: item.comment,
            product: activeProduct,
          }),
        });
        const data = (await res.json()) as LiveStreamRespondPayload;

        setAngleIndex(data.angleIndex);
        setStageOverlay(data.stageOverlay);
        setOverlayBadge(data.overlayBadge);
        setHostSpeech(data.reply);
        setGuardMetrics({
          wordCount: data.wordCount,
          charCount: data.charCount,
          passed: data.hardGuardPassed,
          latencyMs: data.latencyMs,
        });

        if (data.stageOverlay === "FLASH_DROP_VOUCHER") {
          setFlashSeconds(59);
          soundEngine.play808CheckoutPunch();
        }

        speakHostLine(data.reply);
      } finally {
        setTimeout(() => {
          processingInterruptRef.current = false;
        }, 3200);
      }
    },
    [activeProduct, speakHostLine]
  );

  // Drain High-Priority Viewer Queue automatically
  useEffect(() => {
    if (priorityQueue.length === 0 || processingInterruptRef.current) return;
    const nextItem = priorityQueue[0];
    setPriorityQueue((prev) => prev.slice(1));
    setChatFeed((prev) =>
      prev.map((c) => (c.id === nextItem.id ? { ...c, answered: true } : c))
    );
    executePriorityInterrupt(nextItem);
  }, [priorityQueue, executePriorityInterrupt]);

  // Auto-Script Loop when no priority chat is interrupting
  useEffect(() => {
    if (!autoLoopActive) return;
    const interval = setInterval(async () => {
      if (priorityQueue.length > 0 || processingInterruptRef.current) return;

      autoStepRef.current = (autoStepRef.current + 1) % 4;
      try {
        const res = await fetch("/api/livestream/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "auto_loop",
            stepIndex: autoStepRef.current,
            product: activeProduct,
          }),
        });
        const data = (await res.json()) as LiveStreamRespondPayload;
        setPinnedChat(null);
        setAngleIndex(data.angleIndex);
        setStageOverlay(data.stageOverlay);
        setOverlayBadge(data.overlayBadge);
        setHostSpeech(data.reply);
        setGuardMetrics({
          wordCount: data.wordCount,
          charCount: data.charCount,
          passed: data.hardGuardPassed,
          latencyMs: data.latencyMs,
        });
        speakHostLine(data.reply);
      } catch {}
    }, 8500);

    return () => clearInterval(interval);
  }, [autoLoopActive, priorityQueue.length, activeProduct, speakHostLine]);

  // Enqueue a single viewer question (Immediate Priority Interrupt)
  const handleSendViewerQuestion = (username: string, comment: string) => {
    const cleanComment = comment.trim();
    if (!cleanComment) return;
    const newItem: ChatCommentItem = {
      id: "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      username: username.startsWith("@") ? username : `@${username}`,
      comment: cleanComment,
      isPriority: true,
      answered: false,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    setChatFeed((prev) => [newItem, ...prev.slice(0, 14)]);
    setPriorityQueue((prev) => [...prev, newItem]);
  };

  // Trigger Viewer Chat Barrage (Simulates surge of high-priority live questions)
  const handleTriggerChatBarrage = () => {
    const now = Date.now();
    const newItems: ChatCommentItem[] = BARRAGE_PRESETS.map((preset, idx) => ({
      id: `barrage-${now}-${idx}`,
      username: preset.username,
      comment: preset.comment,
      isPriority: true,
      answered: false,
      timestamp: "LIVE BARRAGE",
    }));

    setChatFeed((prev) => [...newItems, ...prev.slice(0, 12)]);
    // Immediately answer the first barrage question & queue the rest
    executePriorityInterrupt(newItems[0]);
    setPriorityQueue((prev) => [...prev, ...newItems.slice(1)]);
  };

  const primaryHex = activeProduct.dominantColors[0]?.hex || "#0F172A";
  const accentHex = activeProduct.dominantColors[1]?.hex || "#06B6D4";
  const highlightHex = activeProduct.dominantColors[2]?.hex || "#F97316";
  const customImg = customAngleImages?.[angleIndex];

  return (
    <div className="space-y-5">
      {/* Top 1-Product Lock & Hard-Guard Voice Telemetry Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1 font-bold">
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
                  ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              {prod.name}
            </button>
          ))}
        </div>

        <div className="lg:col-span-6 flex flex-wrap items-center justify-end gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            QUEUE: {priorityQueue.length} PRIORITY CHATS
          </span>
          <div
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1.5 ${
              guardMetrics.passed
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/40 text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            HOST GUARD: {guardMetrics.wordCount}/22 kata •{" "}
            {guardMetrics.charCount}/145 kar
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left 5 Cols = 9:16 Virtual Broadcast Stage | Right 7 Cols = Priority Chat & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Virtual 9:16 Vertical Broadcast Canvas (TikTok / Shopee Live Studio) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-[32px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-4 border-slate-800 shadow-[0_0_50px_rgba(244,63,94,0.2)] overflow-hidden flex flex-col justify-between p-4 select-none">
            {/* Top Live Broadcast Bar */}
            <div className="z-20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black tracking-wider animate-pulse">
                    🔴 LIVE 24/7
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[115px]">
                    AI Sneaker Host
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs font-mono text-slate-200">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {viewerCount.toLocaleString("id-ID")}
                </div>
              </div>

              {/* Animated Cyber-Host Avatar + Live Stock Scarcity Bar */}
              <div className="flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow">
                    AI
                  </div>
                  <canvas
                    ref={avatarCanvasRef}
                    width={140}
                    height={32}
                    className="w-[125px] h-[28px]"
                  />
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-extrabold">
                    🔥 Sisa {stockLeft} Pasang!
                  </span>
                </div>
              </div>

              {/* Pinned High-Priority Viewer Comment Overlay */}
              {pinnedChat && (
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-950/95 via-slate-900/95 to-purple-950/95 border-2 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 font-bold">
                    <span className="flex items-center gap-1">
                      <Pin className="w-3 h-3 text-rose-400" />
                      PINNED PRIORITY QUESTION
                    </span>
                    <span>{pinnedChat.username}</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-0.5">
                    &ldquo;{pinnedChat.comment}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Center 9:16 Product Stage + Dynamic Context Overlays */}
            <div className="relative my-auto flex flex-col items-center justify-center py-2">
              <div className="mb-2 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
                {overlayBadge}
              </div>

              <div
                className={`relative w-full flex items-center justify-center transition-transform duration-500 ${
                  stageOverlay === "SOLE_MACRO" ? "scale-125" : "scale-100"
                }`}
              >
                {customImg ? (
                  <img
                    src={customImg}
                    alt={activeProduct.name}
                    className="max-h-40 object-contain drop-shadow-[0_15px_25px_rgba(6,182,212,0.4)]"
                  />
                ) : (
                  <svg
                    viewBox="0 0 500 260"
                    className="w-full max-w-[300px] h-auto drop-shadow-[0_20px_25px_rgba(0,0,0,0.85)]"
                  >
                    <defs>
                      <linearGradient
                        id="liveUpper"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={primaryHex} />
                        <stop offset="60%" stopColor="#1E293B" />
                        <stop offset="100%" stopColor={accentHex} />
                      </linearGradient>
                      <linearGradient
                        id="liveSole"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor={highlightHex} />
                        <stop offset="50%" stopColor={accentHex} />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                    </defs>
                    <ellipse
                      cx="250"
                      cy="225"
                      rx="180"
                      ry="12"
                      fill="rgba(6,182,212,0.22)"
                    />
                    {angleIndex === 1 ? (
                      /* Angle 2: Sole & Tech View */
                      <g>
                        <rect
                          x="65"
                          y="110"
                          width="370"
                          height="78"
                          rx="38"
                          fill="url(#liveSole)"
                          stroke={highlightHex}
                          strokeWidth="3"
                        />
                        <line
                          x1="100"
                          y1="149"
                          x2="400"
                          y2="149"
                          stroke="#0F172A"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <text
                          x="250"
                          y="153"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {activeProduct.soleTech}
                        </text>
                      </g>
                    ) : (
                      /* Angle 1 & 3 Silhouette */
                      <g>
                        <path
                          d="M75,170 C75,120 115,70 175,65 L235,92 C280,110 340,122 410,138 C438,144 445,162 438,178 L75,178 Z"
                          fill="url(#liveUpper)"
                          stroke={accentHex}
                          strokeWidth="2.5"
                        />
                        <path
                          d="M65,175 L445,175 C455,192 448,212 420,215 L85,215 C60,212 55,190 65,175 Z"
                          fill="url(#liveSole)"
                        />
                      </g>
                    )}
                  </svg>
                )}
              </div>

              {/* Contextual Interactive Size Chart Overlay */}
              {stageOverlay === "SIZE_CHART" && (
                <div className="mt-2 w-full p-2.5 rounded-2xl bg-slate-950/95 border border-cyan-400 shadow-xl z-20 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold mb-1.5">
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> SIZE CHART ({activeProduct.name})
                    </span>
                    <span className="text-emerald-400">Wide-Foot Friendly</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                    {[
                      { eu: "40", cm: "25.0cm" },
                      { eu: "41", cm: "26.0cm" },
                      { eu: "42", cm: "26.5cm" },
                      { eu: "43", cm: "27.5cm" },
                      { eu: "44", cm: "28.0cm" },
                    ].map((s) => (
                      <div
                        key={s.eu}
                        className={`p-1 rounded border ${
                          s.eu === "42"
                            ? "bg-cyan-500/30 border-cyan-300 text-white font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        <div>EU {s.eu}</div>
                        <div className="text-[9px] text-cyan-300">{s.cm}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual 60-Second Flash Drop Voucher Overlay */}
              {stageOverlay === "FLASH_DROP_VOUCHER" && (
                <div className="mt-2 w-full p-2.5 rounded-2xl bg-gradient-to-r from-orange-600/95 to-rose-600/95 border border-amber-300 text-white shadow-xl z-20 animate-bounce">
                  <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                    <span>⚡ FLASH VOUCHER: LIVE20-HOST</span>
                    <span>00:{String(flashSeconds).padStart(2, "0")}</span>
                  </div>
                  <p className="text-xs font-black mt-0.5">
                    Diskon 20% &rarr;{" "}
                    {formatRupiah(activeProduct.priceNumeric * 0.8)} + Free
                    Ongkir!
                  </p>
                </div>
              )}

              {/* Floating 60fps Heart/Gift Reactions Canvas on Right Edge */}
              <canvas
                ref={reactionsCanvasRef}
                width={75}
                height={260}
                className="absolute right-0 bottom-0 pointer-events-none"
              />
            </div>

            {/* Bottom Subtitles + Yellow Shopping Bag Card */}
            <div className="z-20 space-y-2.5">
              {/* Live AI Host Voice Caption Box */}
              <div className="p-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-slate-700/80">
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 mb-0.5">
                  <span>🎙️ AI LIVE HOST VOICE</span>
                  <span className="text-emerald-400">
                    {guardMetrics.wordCount}/22w • {guardMetrics.charCount}/145c
                  </span>
                </div>
                <p className="text-xs font-semibold text-white leading-snug">
                  &ldquo;{hostSpeech}&rdquo;
                </p>
              </div>

              {/* TikTok/Shopee Style Pinned Product Bag Card */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-950 text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black leading-tight">
                      {activeProduct.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold">
                        {formatRupiah(activeProduct.priceNumeric * 0.8)}
                      </span>
                      <span className="text-[10px] line-through opacity-75">
                        {activeProduct.priceFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play808CheckoutPunch();
                    setStockLeft((s) => (s > 1 ? s - 1 : 4));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-extrabold text-[11px] hover:bg-slate-900 transition"
                >
                  BELI LIVE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Priority Chat Interrupt Engine, Barrage Trigger & Live Queue Console */}
        <div className="lg:col-span-7 space-y-4">
          {/* Broadcast Controls & Barrage Simulator */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-rose-400" />
                  Priority Chat Interrupt &amp; 24/7 Auto-Script Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Saat komentar masuk, AI Host langsung menyematkan komentar, mengubah panggung 9:16, dan menjawab &le;22 kata!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoLoopActive((a) => !a)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    autoLoopActive
                      ? "bg-emerald-500/15 border-emerald-400 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {autoLoopActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Auto-Script: ON
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Auto-Script: PAUSED
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (ttsEnabled && typeof window !== "undefined") {
                      window.speechSynthesis?.cancel();
                    }
                    setTtsEnabled((t) => !t);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  {ttsEnabled ? (
                    <Volume2 className="w-4 h-4 text-rose-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Trigger Viewer Chat Barrage Button */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTriggerChatBarrage}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-slate-950 font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:brightness-110 transition"
              >
                <Flame className="w-4 h-4" />
                🔥 Trigger Viewer Chat Barrage (Simulasi Serbuan Penonton)
              </button>
            </div>

            {/* 1-Click Individual Priority Interrupt Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BARRAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleSendViewerQuestion(preset.username, preset.comment)
                  }
                  className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-400/50 text-left transition group"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-400">
                    <span>{preset.username}</span>
                    <span className="group-hover:translate-x-0.5 transition">
                      INTERRUPT &rarr;
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-0.5 line-clamp-1">
                    &ldquo;{preset.comment}&rdquo;
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Live Viewer Chat Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customComment.trim()) return;
                handleSendViewerQuestion(customUsername, customComment);
                setCustomComment("");
              }}
              className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="text"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="@username"
                className="sm:w-36 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-rose-400"
              />
              <input
                type="text"
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                placeholder={`Tanya apa saja soal ${activeProduct.name} di live chat...`}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim Chat
              </button>
            </form>
          </div>

          {/* Live Viewer Chat Stream & Priority Queue Feed */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-bold">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                Real-Time Viewer Chat Stream &amp; Priority Interrupt Log
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                100% Single-Product Guard
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {chatFeed.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    item.isPriority
                      ? "bg-rose-950/25 border-rose-500/40 text-white"
                      : "bg-slate-950/70 border-slate-800 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300">
                        {item.username}
                      </span>
                      {item.isPriority && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold">
                          HIGH PRIORITY
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="mt-0.5">{item.comment}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => executePriorityInterrupt(item)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-[10px] font-mono text-slate-300 transition"
                  >
                    Pin &amp; Jawab
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
