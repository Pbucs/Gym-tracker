/**
 * IronTrack Audio & Haptics Engine
 * Generates dynamic audio cues using the Web Audio API (zero external assets needed).
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCheck() {
    try {
      const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true, vibrateEnabled: true };
      if (settings.vibrateEnabled && navigator.vibrate) {
        navigator.vibrate(35);
      }
      if (!settings.soundEnabled) return;

      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  }

  playTimerEnd() {
    try {
      const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true, vibrateEnabled: true };
      if (settings.vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([150, 100, 150, 100, 300]);
      }
      if (!settings.soundEnabled) return;

      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const beeps = [
        { freq: 880, time: 0 },
        { freq: 880, time: 0.18 },
        { freq: 1174.66, time: 0.36 }
      ];

      beeps.forEach(b => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(b.freq, now + b.time);

        gain.gain.setValueAtTime(0.2, now + b.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + b.time + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + b.time);
        osc.stop(now + b.time + 0.14);
      });
    } catch (e) {
      // Audio ignored
    }
  }

  playVictory() {
    try {
      const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true, vibrateEnabled: true };
      if (settings.vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      if (!settings.soundEnabled) return;

      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { f: 523.25, d: 0.12, t: 0 },    // C5
        { f: 659.25, d: 0.12, t: 0.12 }, // E5
        { f: 783.99, d: 0.12, t: 0.24 }, // G5
        { f: 1046.50, d: 0.35, t: 0.36 } // C6
      ];

      const now = ctx.currentTime;
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.25, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch (e) {
      // Audio ignored
    }
  }
}

window.soundEngine = new SoundEngine();
