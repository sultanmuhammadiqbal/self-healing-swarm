// Pure Web Audio API Synthesizer for 808 Bass Punch, Cash Register & Jarvis HUD Telemetry

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * 808 Sub-Bass Drop + Cash Register Metallic Ka-Ching for FLASH_CHECKOUT
   */
  public play808CheckoutPunch() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. 808 Bass Punch (Pitch envelope 150Hz -> 38Hz)
    const osc808 = ctx.createOscillator();
    const gain808 = ctx.createGain();
    osc808.type = "sine";
    osc808.frequency.setValueAtTime(155, now);
    osc808.frequency.exponentialRampToValueAtTime(38, now + 0.14);
    osc808.frequency.exponentialRampToValueAtTime(28, now + 0.55);

    gain808.gain.setValueAtTime(0.85, now);
    gain808.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc808.connect(gain808);
    gain808.connect(ctx.destination);
    osc808.start(now);
    osc808.stop(now + 0.62);

    // 2. Cash Register "Ka-Ching" dual high bell harmonics
    const bellFreqs = [1760, 2637, 3520];
    bellFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startOffset = now + 0.08 + idx * 0.055;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startOffset);

      gain.gain.setValueAtTime(0.22, startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, startOffset + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startOffset);
      osc.stop(startOffset + 0.4);
    });
  }

  /**
   * Futuristic HUD Telemetry Lock Chime for MACRO_INSPECT / SWITCH_ANGLE
   */
  public playHudLockSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(1360, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Shopping Bell Chime for Module 4 Live-Stream Priority Chat Interrupt
   */
  public playLiveBellSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [1318.5, 1567.98, 2093.0]; // E6, G6, C7 crisp shopping bell
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.06;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  /**
   * Harmonic Neural Heal Chord for Module 5 Auto-Optimize Layout
   */
  public playNeuralHealSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 Major 7th synth sweep
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.05;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq * 0.9, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.15);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.47);
    });
  }
}

export const soundEngine = new SoundEngine();
