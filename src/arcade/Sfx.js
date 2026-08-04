import { AudioManager } from '../core/AudioManager.js';

// ============================================================
// SFX — chiptune, synthesised, zero assets
// ============================================================
// Routed through AudioManager's own sfxGain so the game's mute and
// volume settings apply. If the context has not been built yet (no user
// gesture), every call is a silent no-op rather than a throw.
// ============================================================

export class ArcadeSfx {
  constructor() {
    this.ctx = null;
    this.out = null;
    this._clipAlt = 0;
    this._lastClip = 0;
    this._drone = null;
    this._droneGain = null;
  }

  _ready() {
    if (AudioManager.muted) return false;
    if (!this.ctx) {
      AudioManager.resume();
      if (!AudioManager.ctx) return false;
      this.ctx = AudioManager.ctx;
      this.out = AudioManager.sfxGain || AudioManager.masterGain || this.ctx.destination;
    }
    return true;
  }

  _tone(f0, f1, dur, wave, vol, delay = 0) {
    if (!this._ready()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, hp = 400, delay = 0) {
    if (!this._ready()) return;
    const t = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, Math.max(1, n), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + dur);
  }

  // Genesis rings alternate two pitches; the alternation is most of why
  // a ring run sounds like a ring run.
  clip() {
    this._clipAlt ^= 1;
    const f = this._clipAlt ? 1318.5 : 1567.98;   // E6 / G6
    this._tone(f, f, 0.06, 'square', 0.11);
    this._tone(f * 2, f * 2, 0.05, 'sine', 0.045, 0.03);
  }

  jump()      { this._tone(320, 760, 0.13, 'square', 0.10); }
  land(i)     { this._noise(0.07, Math.min(0.16, 0.02 + i * 0.006), 900); }
  skid()      { this._noise(0.13, 0.09, 2200); }
  roll()      { this._noise(0.14, 0.07, 700); }
  spring()    { this._tone(300, 1150, 0.20, 'sine', 0.16); this._tone(600, 2300, 0.16, 'triangle', 0.05); }
  boost()     { this._noise(0.28, 0.11, 500); this._tone(220, 900, 0.26, 'sawtooth', 0.06); }
  smash()     { this._noise(0.16, 0.20, 300); this._tone(180, 60, 0.16, 'square', 0.12); }
  hurt()      { this._tone(400, 120, 0.30, 'sawtooth', 0.16); this._noise(0.2, 0.1, 200); }
  shoes()     { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, f, 0.09, 'triangle', 0.10, i * 0.055)); }
  stapler()   { [784, 988, 1175, 1568].forEach((f, i) => this._tone(f, f, 0.11, 'square', 0.10, i * 0.05)); }
  checkpoint(){ this._tone(659, 659, 0.11, 'square', 0.12); this._tone(988, 988, 0.16, 'square', 0.12, 0.1); }
  spindashRev(charge) { this._tone(180 + charge * 46, 320 + charge * 70, 0.11, 'sawtooth', 0.09); }
  spindashGo() { this._noise(0.3, 0.15, 400); this._tone(160, 1400, 0.24, 'sawtooth', 0.10); }
  launch()    { this._noise(0.12, 0.06, 1600); }
  die()       { [660, 560, 440, 330, 220].forEach((f, i) => this._tone(f, f, 0.16, 'square', 0.13, i * 0.13)); }
  start()     { [392, 523, 659, 1047].forEach((f, i) => this._tone(f, f, 0.13, 'square', 0.12, i * 0.09)); }

  /** Low pulsing drone whose level tracks how close the deadline is (0..1). */
  setDread(level) {
    if (!this._ready()) return;
    if (level <= 0.01) {
      if (this._drone) {
        try { this._drone.stop(); } catch { /* already stopped */ }
        this._drone = null; this._droneGain = null;
      }
      return;
    }
    if (!this._drone) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 58;
      lfo.frequency.value = 3.2;
      lfoGain.gain.value = 6;
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      g.gain.value = 0;
      o.connect(g); g.connect(this.out);
      o.start(); lfo.start();
      this._drone = o; this._droneGain = g; this._droneLfo = lfo;
    }
    const target = Math.min(0.10, level * level * 0.12);
    this._droneGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
  }

  stop() {
    if (this._drone) {
      try { this._drone.stop(); this._droneLfo.stop(); } catch { /* already stopped */ }
      this._drone = null; this._droneGain = null; this._droneLfo = null;
    }
  }
}
