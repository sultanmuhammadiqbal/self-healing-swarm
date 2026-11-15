"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CloserChatResponse,
  CloserProduct,
  UIActionPayload,
  VisionAnalysisResponse,
} from "../../types/closer";
import { NeuralVoiceOrb, OrbVoiceState } from "./NeuralVoiceOrb";
import { ProductInteractiveCanvas } from "./ProductInteractiveCanvas";
import { OotdVisionScanner } from "./OotdVisionScanner";
import { soundEngine } from "../../lib/soundEffects";
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Mic,
  MicOff,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

interface LiveCloserModuleProps {
  activeProduct: CloserProduct;
  allProducts: CloserProduct[];
  onSelectProduct: (product: CloserProduct) => void;
  customAngleImages?: (string | null)[];
}

interface TranscriptTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  wordCount?: number;
  charCount?: number;
  uiAction?: string;
  latencyMs?: number;
  timestamp: string;
}

const QUICK_SIMULATION_CHIPS = [
  {
    label: "🔍 Coba zoom bagian sol bawahnya!",
    prompt: "Bro, coba liat sol bawahnya dong, empuk beneran gak?",
    badge: "MACRO_INSPECT (1.65x)",
  },
  {
    label: "💸 Kalau ambil 2 pasang dapet harga berapa?",
    prompt: "Oke, kalau beli 2 pasang dapet harga diskon berapa?",
    badge: "CALCULATE_BUNDLE",
  },
  {
    label: "📸 Cocok gak sama warna outfit gua?",
    prompt: "Cek dong sepatu ini cocok gak sama warna baju outfit gua?",
    badge: "ANALYZE_OOTD",
  },
  {
    label: "🔥 Sikat! Kasih gua promo checkout!",
    prompt: "Sikat bro! Kasih gua kode voucher promo checkout sekarang!",
    badge: "FLASH_CHECKOUT (808)",
  },
  {
    label: "👟 Lihat tampilan on-feet pas dipakai!",
    prompt: "Coba putar lihat tampilan on-feet dari atas pas dipakai jalan!",
    badge: "SWITCH_ANGLE (3)",
  },
];

export const LiveCloserModule: React.FC<LiveCloserModuleProps> = ({
  activeProduct,
  allProducts,
  onSelectProduct,
  customAngleImages,
}) => {
  const [activeAngle, setActiveAngle] = useState<0 | 1 | 2>(0);
  const [activeAction, setActiveAction] = useState<UIActionPayload>({
    action: "SWITCH_ANGLE",
    angleIndex: 0,
    calloutText: activeProduct.angles[0].calloutLabel,
  });

  const [orbState, setOrbState] = useState<OrbVoiceState>("idle");
  const [micListening, setMicListening] = useState(false);
  const [vadEnabled, setVadEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [rmsVolume, setRmsVolume] = useState(0);
  const [bargeInTriggered, setBargeInTriggered] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [sttModeBadge, setSttModeBadge] = useState<string>(
    "Groq Whisper-v3-Turbo + WebSpeech Stream"
  );
  const [triggerVisionSignal, setTriggerVisionSignal] = useState(0);

  const [lastGuardMetrics, setLastGuardMetrics] = useState<{
    wordCount: number;
    charCount: number;
    passed: boolean;
    latencyMs: number;
    provider: string;
  }>({
    wordCount: 16,
    charCount: 109,
    passed: true,
    latencyMs: 142,
    provider: "hybrid-neural-sneakerhead-engine",
  });

  const [turns, setTurns] = useState<TranscriptTurn[]>([
    {
      id: "welcome-turn",
      role: "assistant",
      text: `Halo bro! ${activeProduct.name} siap kita bedah live. Mau cek bantalan sol, scan outfit, atau hitung diskon?`,
      wordCount: 17,
      charCount: 104,
      uiAction: "SWITCH_ANGLE",
      latencyMs: 85,
      timestamp: "LIVE",
    },
  ]);

  // Refs for Web Audio VAD, MediaRecorder, and SpeechRecognition
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const vadRafRef = useRef<number | null>(null);
  const orbStateRef = useRef<OrbVoiceState>("idle");

  useEffect(() => {
    orbStateRef.current = orbState;
  }, [orbState]);

  // Sync product switch with angle reset
  useEffect(() => {
    setActiveAngle(0);
    setActiveAction({
      action: "SWITCH_ANGLE",
      angleIndex: 0,
      calloutText: activeProduct.angles[0].calloutLabel,
    });
  }, [activeProduct]);

  /**
   * BARGE-IN INTERRUPT (<50ms): Immediately halts AI TTS voice output when user speaks or interrupts
   */
  const executeBargeInInterrupt = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (
        window.speechSynthesis.speaking ||
        orbStateRef.current === "ai-speaking"
      ) {
        window.speechSynthesis.cancel();
        setBargeInTriggered(true);
        setOrbState("user-speaking");
        setTimeout(() => setBargeInTriggered(false), 1600);
      }
    }
  }, []);

  /**
   * Speaks AI response with reactive Orb state & Barge-In readiness
   */
  const speakAiReply = useCallback(
    (text: string) => {
      if (
        !ttsEnabled ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setOrbState("idle");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.08;
      utterance.pitch = 1.02;

      utterance.onstart = () => {
        setOrbState("ai-speaking");
      };
      utterance.onend = () => {
        setOrbState((prev) => (prev === "ai-speaking" ? "idle" : prev));
      };
      utterance.onerror = () => {
        setOrbState("idle");
      };

      setOrbState("ai-speaking");
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  /**
   * Dispatches JSON UI Action returned by AI Tool-Calling onto the Product Canvas hands-free
   */
  const dispatchHandsFreeUiAction = useCallback(
    (uiAction: UIActionPayload) => {
      setActiveAction(uiAction);

      if (typeof uiAction.angleIndex === "number") {
        setActiveAngle(uiAction.angleIndex);
      }

      if (uiAction.action === "FLASH_CHECKOUT") {
        soundEngine.play808CheckoutPunch();
      } else if (
        uiAction.action === "MACRO_INSPECT" ||
        uiAction.action === "SWITCH_ANGLE" ||
        uiAction.action === "CALCULATE_BUNDLE"
      ) {
        soundEngine.playHudLockSound();
      } else if (uiAction.action === "ANALYZE_OOTD") {
        soundEngine.playHudLockSound();
        setTriggerVisionSignal((prev) => prev + 1);
      }
    },
    []
  );

  /**
   * Sends user voice transcript or simulation command to /api/closer/chat
   */
  const sendToCloserBrain = useCallback(
    async (userText: string) => {
      const cleaned = userText.trim();
      if (!cleaned) return;

      executeBargeInInterrupt();
      setInterimTranscript("");
      setOrbState("processing");

      const userTurn: TranscriptTurn = {
        id: "u-" + Date.now(),
        role: "user",
        text: cleaned,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setTurns((prev) => [userTurn, ...prev.slice(0, 9)]);

      try {
        const res = await fetch("/api/closer/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: cleaned,
            product: activeProduct,
            currentAngle: activeAngle,
          }),
        });

        const data = (await res.json()) as CloserChatResponse;

        setLastGuardMetrics({
          wordCount: data.wordCount,
          charCount: data.charCount,
          passed: data.hardGuardPassed,
          latencyMs: data.latencyMs,
          provider: data.provider,
        });

        // 1. Hands-Free UI Tool-Calling
        dispatchHandsFreeUiAction(data.ui_action);

        // 2. Append Assistant Turn
        const aiTurn: TranscriptTurn = {
          id: "a-" + Date.now(),
          role: "assistant",
          text: data.reply,
          wordCount: data.wordCount,
          charCount: data.charCount,
          uiAction: data.ui_action.action,
          latencyMs: data.latencyMs,
          timestamp: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        setTurns((prev) => [aiTurn, ...prev.slice(0, 9)]);

        // 3. Speak AI Voice Over (unless ANALYZE_OOTD will speak its vision verdict right after)
        if (data.ui_action.action !== "ANALYZE_OOTD") {
          speakAiReply(data.reply);
        }
      } catch {
        setOrbState("idle");
      }
    },
    [
      activeAngle,
      activeProduct,
      dispatchHandsFreeUiAction,
      executeBargeInInterrupt,
      speakAiReply,
    ]
  );

  /**
   * Callback when Vision OOTD Scanner completes RGB quantization + harmony match
   */
  const handleVisionComplete = useCallback(
    (result: VisionAnalysisResponse) => {
      setActiveAngle(2);
      setActiveAction(result.ui_action);
      soundEngine.playHudLockSound();

      setLastGuardMetrics((prev) => ({
        ...prev,
        wordCount: result.wordCount,
        charCount: result.charCount,
        passed: result.wordCount <= 22 && result.charCount <= 145,
      }));

      const visionTurn: TranscriptTurn = {
        id: "v-" + Date.now(),
        role: "assistant",
        text: result.salesPitch,
        wordCount: result.wordCount,
        charCount: result.charCount,
        uiAction: "ANALYZE_OOTD",
        latencyMs: 118,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setTurns((prev) => [visionTurn, ...prev.slice(0, 9)]);
      speakAiReply(result.salesPitch);
    },
    [speakAiReply]
  );

  /**
   * Stops live microphone, VAD loop, MediaRecorder, and Web Speech API
   */
  const stopLiveVoiceSession = useCallback(() => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicListening(false);
    setRmsVolume(0);
    setOrbState("idle");
  }, []);

  /**
   * Starts Dual-Mode STT (Groq Whisper-Large-v3-Turbo chunk recorder + Web Speech API live stream)
   * + Web Audio AnalyserNode VAD & <50ms Barge-In detector
   */
  const startLiveVoiceSession = async () => {
    executeBargeInInterrupt();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Mode A: MediaRecorder chunk capture for POST /api/closer/transcribe
      audioChunksRef.current = [];
      if (typeof MediaRecorder !== "undefined") {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        recorder.start(1000);
      }

      // Mode B: Browser Web Speech API for simultaneous zero-latency interim transcript
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition;

      if (SpeechRec) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRec as any)();
        recognition.lang = "id-ID";
        recognition.continuous = true;
        recognition.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = async (event: any) => {
          let interim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interim += transcriptPiece;
            }
          }

          if (interim) {
            executeBargeInInterrupt();
            setInterimTranscript(interim);
            setOrbState("user-speaking");
          }

          if (finalTranscript.trim()) {
            const spokenText = finalTranscript.trim();
            setInterimTranscript("");

            // Synchronize with Mode A (/api/closer/transcribe) if audio chunks exist
            if (audioChunksRef.current.length > 0) {
              const blob = new Blob(audioChunksRef.current, {
                type: "audio/webm",
              });
              audioChunksRef.current = [];
              const formData = new FormData();
              formData.append("audio", blob, "utterance.webm");
              formData.append("fallbackText", spokenText);

              try {
                const sttRes = await fetch("/api/closer/transcribe", {
                  method: "POST",
                  body: formData,
                });
                const sttData = await sttRes.json();
                setSttModeBadge(
                  `${sttData.engine} (${sttData.latencyMs || 110}ms)`
                );
                await sendToCloserBrain(sttData.transcript || spokenText);
                return;
              } catch {
                // Fallback directly to spokenText
              }
            }

            await sendToCloserBrain(spokenText);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      // 60fps RMS Volume & Barge-In Threshold Loop
      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      const monitorVad = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(pcmData);
        let sumSquares = 0;
        for (let i = 0; i < pcmData.length; i++) {
          const normalized = (pcmData[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / pcmData.length);
        setRmsVolume(rms);

        // Real-Time Barge-In: If user speaks loudly (rms > 0.085) while AI is speaking, cut AI immediately!
        if (vadEnabled && rms > 0.085) {
          if (orbStateRef.current === "ai-speaking") {
            executeBargeInInterrupt();
          } else if (orbStateRef.current === "idle") {
            setOrbState("user-speaking");
          }
        } else if (
          orbStateRef.current === "user-speaking" &&
          rms < 0.03 &&
          !interimTranscript
        ) {
          setOrbState("idle");
        }

        vadRafRef.current = requestAnimationFrame(monitorVad);
      };

      setMicListening(true);
      setOrbState("user-speaking");
      vadRafRef.current = requestAnimationFrame(monitorVad);
    } catch {
      setSttModeBadge("Simulasi Suara & Quick-Chips Aktif (Mic Off)");
    }
  };

  useEffect(() => {
    return () => stopLiveVoiceSession();
  }, [stopLiveVoiceSession]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput;
    setManualInput("");
    sendToCloserBrain(text);
  };

  return (
    <div className="space-y-5">
      {/* Top Product Switcher & Hard-Guard Verification Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        {/* Active Product Selector (Single-Product Lock) */}
        <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            1-Product Lock:
          </span>
          {allProducts.map((prod) => {
            const active = prod.id === activeProduct.id;
            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => onSelectProduct(prod)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {prod.name}
              </button>
            );
          })}
        </div>

        {/* Deterministic Hard-Guard Live Counters (<= 22 Words & <= 145 Chars) */}
        <div className="lg:col-span-6 flex flex-wrap items-center justify-end gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
            STT: <span className="text-cyan-400">{sttModeBadge}</span>
          </div>
          <div
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1.5 ${
              lastGuardMetrics.passed
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/40 text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            GUARD: {lastGuardMetrics.wordCount}/22 kata •{" "}
            {lastGuardMetrics.charCount}/145 kar ({lastGuardMetrics.latencyMs}ms)
          </div>
        </div>
      </div>

      {/* Main 12-Column Co-Browsing Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Columns: Hands-Free Product Canvas + Live OOTD Vision Scanner */}
        <div className="lg:col-span-7 space-y-5">
          <ProductInteractiveCanvas
            product={activeProduct}
            activeAngle={activeAngle}
            onSelectAngle={(angle) => {
              setActiveAngle(angle);
              setActiveAction({
                action: "SWITCH_ANGLE",
                angleIndex: angle,
                calloutText: activeProduct.angles[angle].calloutLabel,
              });
            }}
            activeAction={activeAction}
            customAngleImages={customAngleImages}
          />

          <OotdVisionScanner
            product={activeProduct}
            triggerScanSignal={triggerVisionSignal}
            onVisionComplete={handleVisionComplete}
          />
        </div>

        {/* Right 5 Columns: 60fps Jarvis Audio Orb + VAD/Barge-In Controls + Live Neural Transcript */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Jarvis Orb & Voice Control Cockpit */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-4 shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                ZERO-LATENCY VOICE &amp; VAD ENGINE
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVadEnabled((v) => !v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    vadEnabled
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  BARGE-IN: {vadEnabled ? "ON (<50ms)" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (ttsEnabled && typeof window !== "undefined") {
                      window.speechSynthesis?.cancel();
                    }
                    setTtsEnabled((t) => !t);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Toggle AI Voice Over"
                >
                  {ttsEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* 60fps FFT Jarvis/Siri Orb */}
            <NeuralVoiceOrb
              state={orbState}
              analyserNode={analyserRef.current}
              rmsVolume={rmsVolume}
              bargeInTriggered={bargeInTriggered}
            />

            {/* Interim Live Speech Stream Display */}
            {interimTranscript && (
              <div className="mt-2 w-full px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200 font-mono animate-pulse">
                🎙️ Live Stream: &ldquo;{interimTranscript}&rdquo;
              </div>
            )}

            {/* Primary Mic / Barge-In Action Bar */}
            <div className="mt-3 w-full flex items-center gap-2">
              {!micListening ? (
                <button
                  type="button"
                  onClick={startLiveVoiceSession}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:brightness-110 transition"
                >
                  <Mic className="w-4 h-4" />
                  🎙️ Aktifkan Live Mic &amp; Auto Barge-In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopLiveVoiceSession}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/30 transition"
                >
                  <MicOff className="w-4 h-4" />
                  Matikan Mic (RMS: {(rmsVolume * 100).toFixed(0)}%)
                </button>
              )}

              {orbState === "ai-speaking" && (
                <button
                  type="button"
                  onClick={executeBargeInInterrupt}
                  className="px-3 py-2.5 rounded-xl bg-orange-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-lg animate-pulse"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Sela AI (Barge-In)
                </button>
              )}
            </div>

            {/* Text/Voice Prompt Input Bar */}
            <form
              onSubmit={handleManualSubmit}
              className="mt-2.5 w-full flex items-center gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => {
                  if (orbState === "ai-speaking") executeBargeInInterrupt();
                  setManualInput(e.target.value);
                }}
                placeholder="Ketik / sela omongan AI Salesman di sini..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 1-Click Quick Voice Simulation Chips (For Instant Hands-Free Testing Without Mic) */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                1-Click Voice Simulation Chips (Tanpa Mic)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Hands-Free UI Trigger
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {QUICK_SIMULATION_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendToCloserBrain(chip.prompt)}
                  className="group w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-400/60 text-left transition-all"
                >
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                    {chip.label}
                  </span>
                  <span className="shrink-0 ml-2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300 group-hover:border-cyan-400">
                    {chip.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Conversational Log with Hard-Guard Verification */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-xl flex-1 flex flex-col max-h-[260px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Real-Time Sales Closer Transcript
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                &le;22 Words • &le;145 Chars
              </span>
            </div>

            <div className="mt-2 space-y-2 overflow-y-auto pr-1 flex-1">
              {turns.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    t.role === "assistant"
                      ? "bg-slate-950/90 border-orange-500/30 text-slate-100"
                      : "bg-cyan-950/30 border-cyan-500/30 text-cyan-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-bold">
                      {t.role === "assistant" ? (
                        <>
                          <Bot className="w-3 h-3 text-orange-400" />
                          <span className="text-orange-300">
                            AI CLOSER ({t.uiAction})
                          </span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-300">USER VOICE</span>
                        </>
                      )}
                    </span>
                    {t.role === "assistant" && (
                      <span className="text-emerald-400">
                        {t.wordCount}w / {t.charCount}c
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed font-medium">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
