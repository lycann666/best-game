// All sound is synthesised with WebAudio: no audio files, no network, nothing to
// load. Every call is guarded, so a browser without audio (or a muted tab) simply
// stays silent instead of throwing.

function tone(ctx, freq, when, dur, type, vol, slideTo) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  play(fn) {
    if (this.muted || !this.ctx) return;
    try {
      fn(this.ctx, this.ctx.currentTime);
    } catch {
      // Silence is always acceptable; never let sound break the game.
    }
  }

  click() {
    this.play((ctx, t) => tone(ctx, 660, t, 0.07, 'sine', 0.12));
  }

  splash() {
    this.play((ctx, t) => {
      tone(ctx, 520, t, 0.22, 'sine', 0.14, 140);
      tone(ctx, 880, t + 0.05, 0.14, 'triangle', 0.07, 320);
    });
  }

  bite() {
    this.play((ctx, t) => tone(ctx, 300, t, 0.12, 'square', 0.1, 620));
  }

  // The pluck climbs with the fish's value, so a King Koi sounds like a prize.
  catch(value) {
    this.play((ctx, t) => {
      const base = 420 + Math.min(420, value * 4);
      tone(ctx, base, t, 0.12, 'triangle', 0.16);
      tone(ctx, base * 1.5, t + 0.09, 0.16, 'triangle', 0.14);
      tone(ctx, base * 2, t + 0.18, 0.2, 'sine', 0.1);
    });
  }

  reelTick() {
    this.play((ctx, t) => tone(ctx, 980, t, 0.03, 'square', 0.04));
  }

  snap() {
    this.play((ctx, t) => {
      tone(ctx, 180, t, 0.3, 'sawtooth', 0.16, 60);
      tone(ctx, 90, t + 0.05, 0.25, 'square', 0.1, 50);
    });
  }

  shark() {
    this.play((ctx, t) => {
      tone(ctx, 140, t, 0.4, 'sawtooth', 0.16, 70);
      tone(ctx, 210, t + 0.12, 0.3, 'sawtooth', 0.1, 90);
    });
  }

  dayClear() {
    this.play((ctx, t) => {
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.11, 0.22, 'triangle', 0.14));
    });
  }

  gameOver() {
    this.play((ctx, t) => {
      [392, 330, 262, 196].forEach((f, i) => tone(ctx, f, t + i * 0.16, 0.26, 'sine', 0.13));
    });
  }

  victory() {
    this.play((ctx, t) => {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(ctx, f, t + i * 0.12, 0.3, 'triangle', 0.13));
    });
  }
}
