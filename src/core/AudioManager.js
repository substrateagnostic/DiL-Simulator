// Lightweight audio manager using Web Audio API
// Generates simple synth sounds - no external audio files needed
class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicVolume = 0.3;
    this.sfxVolume = 0.5;

    // Music state
    this.currentTrack = null;
    this._musicNodes = [];       // active oscillators/sources for current track
    this._musicTimer = null;     // loop scheduling timer
    this._musicStartTime = 0;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Simple synth SFX
  playSfx(type) {
    if (!this.ctx || this.muted) return;
    this.resume();

    switch (type) {
      case 'confirm': this._playTone([440, 660], 0.1, 'square', 0.3); break;
      case 'cancel': this._playTone([330, 220], 0.1, 'square', 0.3); break;
      case 'cursor': this._playTone([500], 0.05, 'square', 0.2); break;
      case 'hit': this._playNoise(0.15, 0.5); break;
      case 'critical': this._playTone([200, 400, 800], 0.08, 'sawtooth', 0.4); break;
      case 'heal': this._playTone([330, 440, 550, 660], 0.12, 'sine', 0.3); break;
      case 'levelup': this._playTone([440, 550, 660, 880], 0.15, 'square', 0.3); break;
      case 'text': this._playTone([600], 0.02, 'square', 0.1); break;
      case 'step': this._playNoise(0.04, 0.1); break;
      case 'door': this._playTone([220, 180], 0.15, 'sine', 0.3); break;
      case 'victory': this._playMelody([523, 659, 784, 1047], 0.15, 'square', 0.3); break;
      case 'defeat': this._playMelody([440, 370, 330, 220], 0.2, 'sawtooth', 0.3); break;
    }
  }

  _playTone(freqs, duration, type, volume) {
    const now = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, now + i * duration);
      gain.gain.linearRampToValueAtTime(volume, now + i * duration + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * duration);
      osc.stop(now + (i + 1) * duration + 0.05);
    });
  }

  _playMelody(freqs, noteLen, type, volume) {
    const now = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, now + i * noteLen);
      gain.gain.linearRampToValueAtTime(volume, now + i * noteLen + 0.01);
      gain.gain.setValueAtTime(volume, now + (i + 0.8) * noteLen);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * noteLen);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * noteLen);
      osc.stop(now + (i + 1) * noteLen + 0.05);
    });
  }

  _playNoise(duration, volume) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  // ---------------------------------------------------------------------------
  // Procedural Music System
  // ---------------------------------------------------------------------------

  /**
   * Music track definitions. Each track is a function that schedules one full
   * loop of oscillator notes into the Web Audio graph and returns the loop
   * duration in seconds. All oscillators route through `this.musicGain`.
   */
  _getMusicTracks() {
    return {
      // ---- EXPLORATION: lo-fi office ambient, ~80 BPM, 8-bar loop ----------
      exploration: () => {
        const bpm = 80;
        const beat = 60 / bpm;            // 0.75 s per beat
        const bar = beat * 4;             // 3 s per bar
        const loopBars = 8;
        const loopDuration = bar * loopBars; // 24 s
        const now = this.ctx.currentTime;

        // Chord progression: C - Am - F - G  (repeat twice for 8 bars)
        // Frequencies for root + third + fifth of each chord
        const chords = [
          // C major:  C4, E4, G4
          [261.63, 329.63, 392.00],
          // A minor:  A3, C4, E4
          [220.00, 261.63, 329.63],
          // F major:  F3, A3, C4
          [174.61, 220.00, 261.63],
          // G major:  G3, B3, D4
          [196.00, 246.94, 293.66],
        ];

        const nodes = [];

        // --- Pad layer: soft sine wave chords ---
        for (let rep = 0; rep < 2; rep++) {
          chords.forEach((chord, ci) => {
            const barStart = now + (rep * 4 + ci) * bar;
            chord.forEach((freq) => {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;

              // Gentle fade in / out over the bar
              gain.gain.setValueAtTime(0, barStart);
              gain.gain.linearRampToValueAtTime(0.10, barStart + beat * 0.5);
              gain.gain.setValueAtTime(0.10, barStart + bar - beat * 0.5);
              gain.gain.linearRampToValueAtTime(0, barStart + bar);

              osc.connect(gain);
              gain.connect(this.musicGain);
              osc.start(barStart);
              osc.stop(barStart + bar + 0.05);
              nodes.push(osc);
            });
          });
        }

        // --- Sub-bass: root notes, one per bar, sine an octave below ---
        const bassRoots = [130.81, 110.00, 87.31, 98.00]; // C3, A2, F2, G2
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((freq, ci) => {
            const barStart = now + (rep * 4 + ci) * bar;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, barStart);
            gain.gain.linearRampToValueAtTime(0.08, barStart + beat * 0.3);
            gain.gain.setValueAtTime(0.08, barStart + bar - beat);
            gain.gain.linearRampToValueAtTime(0, barStart + bar);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(barStart);
            osc.stop(barStart + bar + 0.05);
            nodes.push(osc);
          });
        }

        // --- Gentle high arpeggiated notes (triangle wave, sparse) ---
        // Play a slow arpeggio on beats 2 and 4 of every other bar
        const arpNotes = [523.25, 659.25, 587.33, 523.25, 493.88, 440.00, 523.25, 587.33];
        for (let i = 0; i < loopBars; i++) {
          const barStart = now + i * bar;
          const freq = arpNotes[i % arpNotes.length];
          const noteStart = barStart + beat * 1.5; // off-beat

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.04, noteStart + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + beat * 2);

          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(noteStart);
          osc.stop(noteStart + beat * 2 + 0.05);
          nodes.push(osc);
        }

        return { nodes, loopDuration };
      },

      // ---- COMBAT: chiptune battle theme, ~140 BPM, 4-bar loop ------------
      combat: () => {
        const bpm = 140;
        const beat = 60 / bpm;                // ~0.4286 s
        const bar = beat * 4;                  // ~1.714 s
        const loopBars = 4;
        const loopDuration = bar * loopBars;   // ~6.857 s
        const now = this.ctx.currentTime;

        const nodes = [];

        // Helper: schedule a note
        const note = (freq, start, dur, type, vol) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.005);
          gain.gain.setValueAtTime(vol, start + dur * 0.75);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // --- Driving bass line (sawtooth) ---
        // Pattern per bar: root 8th notes with octave jumps
        const bassPatterns = [
          // Bar 1: E minor feel  (E2, E3)
          [82.41, 82.41, 164.81, 82.41, 82.41, 164.81, 82.41, 164.81],
          // Bar 2: C major feel  (C2, C3)
          [65.41, 65.41, 130.81, 65.41, 65.41, 130.81, 65.41, 130.81],
          // Bar 3: D major feel  (D2, D3)
          [73.42, 73.42, 146.83, 73.42, 73.42, 146.83, 73.42, 146.83],
          // Bar 4: B minor feel  (B1, B2)
          [61.74, 61.74, 123.47, 61.74, 61.74, 123.47, 123.47, 61.74],
        ];

        for (let b = 0; b < loopBars; b++) {
          const barStart = now + b * bar;
          const pattern = bassPatterns[b];
          const eighth = beat / 2;
          pattern.forEach((freq, i) => {
            note(freq, barStart + i * eighth, eighth * 0.9, 'sawtooth', 0.12);
          });
        }

        // --- Melody (square wave, Earthbound-style) ---
        // E minor pentatonic: E4, G4, A4, B4, D5, E5
        const melodyBars = [
          // Bar 1
          [
            { f: 329.63, t: 0,           d: beat },         // E4
            { f: 392.00, t: beat,         d: beat * 0.5 },   // G4
            { f: 440.00, t: beat * 1.5,   d: beat * 0.5 },   // A4
            { f: 493.88, t: beat * 2,     d: beat },         // B4
            { f: 440.00, t: beat * 3,     d: beat * 0.5 },   // A4
            { f: 392.00, t: beat * 3.5,   d: beat * 0.5 },   // G4
          ],
          // Bar 2
          [
            { f: 523.25, t: 0,           d: beat * 0.5 },   // C5
            { f: 493.88, t: beat * 0.5,   d: beat * 0.5 },   // B4
            { f: 440.00, t: beat,         d: beat },         // A4
            { f: 329.63, t: beat * 2,     d: beat * 1.5 },   // E4
            { f: 392.00, t: beat * 3.5,   d: beat * 0.5 },   // G4
          ],
          // Bar 3
          [
            { f: 587.33, t: 0,           d: beat },         // D5
            { f: 523.25, t: beat,         d: beat * 0.5 },   // C5
            { f: 493.88, t: beat * 1.5,   d: beat * 0.5 },   // B4
            { f: 440.00, t: beat * 2,     d: beat * 0.5 },   // A4
            { f: 493.88, t: beat * 2.5,   d: beat * 0.5 },   // B4
            { f: 523.25, t: beat * 3,     d: beat },         // C5
          ],
          // Bar 4
          [
            { f: 659.25, t: 0,           d: beat * 0.5 },   // E5
            { f: 587.33, t: beat * 0.5,   d: beat * 0.5 },   // D5
            { f: 493.88, t: beat,         d: beat },         // B4
            { f: 392.00, t: beat * 2,     d: beat * 0.5 },   // G4
            { f: 440.00, t: beat * 2.5,   d: beat * 0.5 },   // A4
            { f: 329.63, t: beat * 3,     d: beat },         // E4 (resolve)
          ],
        ];

        for (let b = 0; b < loopBars; b++) {
          const barStart = now + b * bar;
          melodyBars[b].forEach(({ f, t, d }) => {
            note(f, barStart + t, d * 0.9, 'square', 0.09);
          });
        }

        // --- Percussion: noise hits on every beat, accented on 1 and 3 ---
        for (let b = 0; b < loopBars; b++) {
          for (let i = 0; i < 4; i++) {
            const hitTime = now + b * bar + i * beat;
            const accent = (i === 0 || i === 2) ? 0.15 : 0.07;
            const dur = (i === 0 || i === 2) ? 0.06 : 0.03;

            const bufferSize = Math.floor(this.ctx.sampleRate * dur);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let s = 0; s < bufferSize; s++) {
              data[s] = (Math.random() * 2 - 1);
            }
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(accent, hitTime);
            gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
            src.connect(gain);
            gain.connect(this.musicGain);
            src.start(hitTime);
            src.stop(hitTime + dur + 0.01);
            nodes.push(src);
          }
        }

        // --- Harmony layer: sustained square wave chord stabs on beat 1 ---
        const harmChords = [
          [329.63, 392.00, 493.88],  // Em:  E4, G4, B4
          [261.63, 329.63, 392.00],  // C:   C4, E4, G4
          [293.66, 369.99, 440.00],  // D:   D4, F#4, A4
          [246.94, 329.63, 392.00],  // Em/B: B3, E4, G4
        ];

        for (let b = 0; b < loopBars; b++) {
          const barStart = now + b * bar;
          harmChords[b].forEach((freq) => {
            note(freq, barStart, beat * 1.5, 'square', 0.04);
          });
        }

        return { nodes, loopDuration };
      },
    };
  }

  /**
   * Start playing a music track. If the same track is already playing, this
   * is a no-op. If a different track is playing, cross-fade into the new one.
   */
  playMusic(trackId) {
    if (!this.ctx) return;
    this.resume();

    // Already playing this track — no-op
    if (this.currentTrack === trackId) return;

    const tracks = this._getMusicTracks();
    if (!tracks[trackId]) {
      console.warn(`AudioManager: unknown music track "${trackId}"`);
      return;
    }

    // If something is already playing, cross-fade out then start new
    if (this.currentTrack) {
      this._stopMusicImmediate(0.5);
    }

    this.currentTrack = trackId;

    // Short fade-in
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      this.musicVolume,
      this.ctx.currentTime + 0.5
    );

    this._scheduleLoop(trackId);
  }

  /**
   * Internal: schedules one iteration of the loop and sets a timer to
   * schedule the next iteration slightly before the current one ends.
   */
  _scheduleLoop(trackId) {
    // Guard: if the track changed while we were waiting, bail out
    if (this.currentTrack !== trackId) return;

    const tracks = this._getMusicTracks();
    const generator = tracks[trackId];
    if (!generator) return;

    const { nodes, loopDuration } = generator();
    this._musicNodes = nodes;

    // Schedule the next loop slightly before this one ends to avoid gaps.
    // The overlap is handled by the gain envelopes in each generator.
    const scheduleAhead = 0.1; // seconds before end to schedule next loop
    const delay = (loopDuration - scheduleAhead) * 1000;

    this._musicTimer = setTimeout(() => {
      this._scheduleLoop(trackId);
    }, Math.max(delay, 100));
  }

  /**
   * Fade out and stop the current music track.
   * @param {number} fadeTime - seconds to fade out (default 1)
   */
  stopMusic(fadeTime = 1) {
    if (!this.ctx || !this.currentTrack) return;
    this._stopMusicImmediate(fadeTime);
  }

  /**
   * Internal: stops all music nodes with a gain ramp.
   */
  _stopMusicImmediate(fadeTime) {
    // Clear scheduling timer
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }

    const now = this.ctx.currentTime;

    // Ramp the music gain down to avoid clicks
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0, now + fadeTime);

    // Schedule cleanup: stop and disconnect nodes after fade
    const nodesToClean = [...this._musicNodes];
    setTimeout(() => {
      nodesToClean.forEach((node) => {
        try { node.stop(); } catch (_) { /* already stopped */ }
        try { node.disconnect(); } catch (_) { /* already disconnected */ }
      });
    }, fadeTime * 1000 + 100);

    this._musicNodes = [];
    this.currentTrack = null;
  }

  /**
   * Set the music volume (0 to 1). Takes effect immediately with a short ramp.
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, now + 0.1);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }
}

export const AudioManager = new AudioManagerClass();
