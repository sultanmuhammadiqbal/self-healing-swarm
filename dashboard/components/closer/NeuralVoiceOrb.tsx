"use client";

import React, { useEffect, useRef } from "react";

export type OrbVoiceState = "idle" | "user-speaking" | "ai-speaking" | "processing";

interface NeuralVoiceOrbProps {
  state: OrbVoiceState;
  analyserNode: AnalyserNode | null;
  rmsVolume: number;
  bargeInTriggered: boolean;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  orbitOffset: number;
}

export const NeuralVoiceOrb: React.FC<NeuralVoiceOrbProps> = ({
  state,
  analyserNode,
  rmsVolume,
  bargeInTriggered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize 42 orbital plasma particles
    particlesRef.current = Array.from({ length: 42 }, (_, i) => ({
      angle: (i / 42) * Math.PI * 2,
      radius: 56 + (i % 5) * 9,
      speed: 0.008 + (i % 4) * 0.004,
      size: 1.5 + (i % 3) * 1.1,
      orbitOffset: i * 0.4,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const freqBuffer = new Uint8Array(64);

    const render = () => {
      phase += 0.045;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Read live FFT spectrum if analyserNode is connected, otherwise synthesize reactive spectrum
      let avgEnergy = rmsVolume * 220;
      if (analyserNode && state === "user-speaking") {
        analyserNode.getByteFrequencyData(freqBuffer);
        let sum = 0;
        for (let i = 0; i < freqBuffer.length; i++) {
          sum += freqBuffer[i];
        }
        avgEnergy = Math.max(avgEnergy, sum / freqBuffer.length);
      } else if (state === "ai-speaking") {
        // Simulated 60fps TTS harmonic envelope
        for (let i = 0; i < freqBuffer.length; i++) {
          freqBuffer[i] = Math.floor(
            75 +
              55 * Math.sin(phase * 2.4 + i * 0.35) +
              35 * Math.cos(phase * 4.1 - i * 0.2)
          );
        }
        avgEnergy = 98 + 30 * Math.sin(phase * 3.2);
      } else if (state === "processing") {
        avgEnergy = 65 + 25 * Math.sin(phase * 5);
      } else {
        for (let i = 0; i < freqBuffer.length; i++) {
          freqBuffer[i] = Math.floor(14 + 8 * Math.sin(phase + i * 0.2));
        }
        avgEnergy = 18 + 6 * Math.sin(phase * 1.5);
      }

      const normalizedEnergy = Math.min(1.4, avgEnergy / 110);

      // Select palette based on state (Cyan/Emerald for user, Neon Orange/Purple for AI)
      let primaryColor = "rgba(6, 182, 212, 0.9)"; // Cyan
      let secondaryColor = "rgba(16, 185, 129, 0.85)"; // Emerald
      let glowColor = "rgba(6, 182, 212, 0.28)";

      if (state === "ai-speaking") {
        primaryColor = "rgba(249, 115, 22, 0.95)"; // Neon Orange
        secondaryColor = "rgba(168, 85, 247, 0.9)"; // Neon Purple
        glowColor = "rgba(249, 115, 22, 0.32)";
      } else if (state === "processing") {
        primaryColor = "rgba(168, 85, 247, 0.95)";
        secondaryColor = "rgba(6, 182, 212, 0.9)";
        glowColor = "rgba(168, 85, 247, 0.3)";
      } else if (state === "idle") {
        primaryColor = "rgba(56, 189, 248, 0.65)";
        secondaryColor = "rgba(99, 102, 241, 0.55)";
        glowColor = "rgba(56, 189, 248, 0.14)";
      }

      // 1. Outer ambient radial glow
      const baseRadius = 46 + normalizedEnergy * 18;
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        8,
        cx,
        cy,
        baseRadius * 1.95
      );
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(0.45, secondaryColor);
      grad.addColorStop(0.78, glowColor);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.95, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-layered FFT Harmonic Rings (Jarvis/Siri style)
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        const points = 64;
        for (let i = 0; i <= points; i++) {
          const idx = i % points;
          const angle = (idx / points) * Math.PI * 2;
          const fftVal = freqBuffer[idx] / 255;
          const wave =
            Math.sin(angle * (4 + ring * 2) + phase * (1.8 + ring * 0.6)) *
            (5 + normalizedEnergy * 14);
          const r =
            baseRadius * (0.78 + ring * 0.16) +
            fftVal * (22 + ring * 6) +
            wave;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = ring % 2 === 0 ? primaryColor : secondaryColor;
        ctx.lineWidth = ring === 0 ? 2.4 : 1.4;
        ctx.stroke();
      }

      // 3. Reactive Orbiting Plasma Particles
      particlesRef.current.forEach((p, idx) => {
        p.angle += p.speed * (1 + normalizedEnergy * 1.8);
        const dynamicR =
          p.radius +
          normalizedEnergy * 20 +
          Math.sin(phase * 2 + p.orbitOffset) * 6;
        const px = cx + Math.cos(p.angle) * dynamicR;
        const py = cy + Math.sin(p.angle) * dynamicR;

        ctx.beginPath();
        ctx.arc(
          px,
          py,
          p.size * (0.9 + normalizedEnergy * 0.5),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = idx % 2 === 0 ? primaryColor : secondaryColor;
        ctx.fill();
      });

      // 4. Inner Core Sphere
      const coreGrad = ctx.createRadialGradient(
        cx - 6,
        cy - 6,
        2,
        cx,
        cy,
        baseRadius * 0.65
      );
      coreGrad.addColorStop(0, "#FFFFFF");
      coreGrad.addColorStop(0.4, primaryColor);
      coreGrad.addColorStop(1, "rgba(15, 23, 42, 0.9)");

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state, analyserNode, rmsVolume]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={220}
          height={220}
          className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] drop-shadow-[0_0_25px_rgba(6,182,212,0.35)]"
        />
        {bargeInTriggered && (
          <div className="absolute -top-2 px-2.5 py-0.5 rounded-full bg-rose-500/90 text-[10px] font-bold tracking-wider text-white uppercase animate-bounce shadow-lg">
            ⚡ BARGE-IN INTERRUPT (&lt;50ms)
          </div>
        )}
      </div>

      {/* Live Status Pill */}
      <div className="mt-1 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            state === "user-speaking"
              ? "bg-emerald-400 animate-ping"
              : state === "ai-speaking"
              ? "bg-orange-400 animate-pulse"
              : state === "processing"
              ? "bg-purple-400 animate-spin"
              : "bg-cyan-400"
          }`}
        />
        <span className="font-mono text-[11px] text-slate-200">
          {state === "user-speaking"
            ? "🎙️ USER SPEAKING (CYAN/EMERALD FFT)"
            : state === "ai-speaking"
            ? "🔊 AI CLOSER SPEAKING (ORANGE/PURPLE FFT)"
            : state === "processing"
            ? "⚡ GROQ NEURAL TOOL-CALLING..."
            : "🟢 LIVE VAD ARMED (60FPS ORB)"}
        </span>
      </div>
    </div>
  );
};
