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
      // ---- EXPLORATION: lo-fi office ambient, ~80 BPM, 16-bar loop ---------
      // A section (bars 1-8):  sustained pads + sub-bass + sparse arpeggios
      // B section (bars 9-16): walking bass + counter-melody over same chords
      exploration: () => {
        const bpm = 80;
        const beat = 60 / bpm;              // 0.75 s per beat
        const bar  = beat * 4;              // 3 s per bar
        const loopDuration = bar * 16;      // 48 s
        const now  = this.ctx.currentTime;

        // Chord progression: C - Am - F - G  (used throughout)
        const chords = [
          [261.63, 329.63, 392.00],  // C major:  C4, E4, G4
          [220.00, 261.63, 329.63],  // A minor:  A3, C4, E4
          [174.61, 220.00, 261.63],  // F major:  F3, A3, C4
          [196.00, 246.94, 293.66],  // G major:  G3, B3, D4
        ];
        const bassRoots = [130.81, 110.00, 87.31, 98.00]; // C3, A2, F2, G2

        const nodes = [];

        // Helper: schedule one oscillator note
        const schedNote = (freq, start, dur, type, vol, attack = 0.05) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + attack);
          gain.gain.setValueAtTime(vol, start + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // === A SECTION: bars 1-8 ===

        // Pad layer: soft sine chords, one per bar
        for (let rep = 0; rep < 2; rep++) {
          chords.forEach((chord, ci) => {
            const barStart = now + (rep * 4 + ci) * bar;
            chord.forEach((freq) => {
              const osc  = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;
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

        // Sub-bass: one root note per bar, sine
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((freq, ci) => {
            const barStart = now + (rep * 4 + ci) * bar;
            const osc  = this.ctx.createOscillator();
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

        // Sparse arpeggios: one triangle note per bar, off-beat
        const arpA = [523.25, 659.25, 587.33, 523.25, 493.88, 440.00, 523.25, 587.33];
        for (let i = 0; i < 8; i++) {
          const noteStart = now + i * bar + beat * 1.5;
          schedNote(arpA[i], noteStart, beat * 2, 'triangle', 0.04, 0.05);
        }

        // === B SECTION: bars 9-16 ===

        // Pads continue at slightly lower volume to make room for melody
        for (let rep = 0; rep < 2; rep++) {
          chords.forEach((chord, ci) => {
            const barStart = now + (8 + rep * 4 + ci) * bar;
            chord.forEach((freq) => {
              const osc  = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0, barStart);
              gain.gain.linearRampToValueAtTime(0.07, barStart + beat * 0.5);
              gain.gain.setValueAtTime(0.07, barStart + bar - beat * 0.5);
              gain.gain.linearRampToValueAtTime(0, barStart + bar);
              osc.connect(gain);
              gain.connect(this.musicGain);
              osc.start(barStart);
              osc.stop(barStart + bar + 0.05);
              nodes.push(osc);
            });
          });
        }

        // Walking bass: 8th-note lines (triangle) instead of sustained roots
        const walkBass = [
          [130.81, 164.81, 196.00, 220.00, 130.81, 164.81, 196.00, 220.00], // C walk
          [110.00, 130.81, 164.81, 196.00, 110.00, 130.81, 164.81, 130.81], // Am walk
          [87.31,  110.00, 130.81, 164.81, 87.31,  110.00, 130.81, 110.00], // F walk
          [98.00,  123.47, 146.83, 174.61, 98.00,  123.47, 146.83, 123.47], // G walk
        ];
        const eighth = beat / 2;
        for (let rep = 0; rep < 2; rep++) {
          walkBass.forEach((pattern, ci) => {
            const barStart = now + (8 + rep * 4 + ci) * bar;
            pattern.forEach((freq, i) => {
              schedNote(freq, barStart + i * eighth, eighth * 0.85, 'triangle', 0.07, 0.02);
            });
          });
        }

        // Counter-melody A (bars 9-12): ascending questioning phrases
        const counterA = [
          // Bar 9  (C): stepwise ascent, hold on top
          [{ f: 523.25, t: 0,         d: beat },
           { f: 587.33, t: beat,       d: beat * 0.5 },
           { f: 659.25, t: beat * 1.5, d: beat * 2.5 }],
          // Bar 10 (Am): inner movement, resolve to A4
          [{ f: 440.00, t: 0,         d: beat * 0.5 },
           { f: 523.25, t: beat * 0.5, d: beat * 0.5 },
           { f: 493.88, t: beat,       d: beat * 3 }],
          // Bar 11 (F): warm descent
          [{ f: 523.25, t: 0,         d: beat * 0.5 },
           { f: 440.00, t: beat * 0.5, d: beat * 0.5 },
           { f: 349.23, t: beat,       d: beat * 3 }],
          // Bar 12 (G): rising tension
          [{ f: 392.00, t: 0,         d: beat * 0.5 },
           { f: 493.88, t: beat * 0.5, d: beat * 0.5 },
           { f: 587.33, t: beat,       d: beat },
           { f: 659.25, t: beat * 2,   d: beat * 2 }],
        ];
        counterA.forEach((barMelody, ci) => {
          const barStart = now + (8 + ci) * bar;
          barMelody.forEach(({ f, t, d }) => {
            schedNote(f, barStart + t, d, 'triangle', 0.05, 0.04);
          });
        });

        // Counter-melody B (bars 13-16): descending resolution + final flourish
        const counterB = [
          // Bar 13 (C): high start, drift down
          [{ f: 784.00, t: 0,         d: beat * 0.5 },
           { f: 659.25, t: beat * 0.5, d: beat * 0.5 },
           { f: 587.33, t: beat,       d: beat * 0.5 },
           { f: 523.25, t: beat * 1.5, d: beat * 2.5 }],
          // Bar 14 (Am): lyrical answer
          [{ f: 493.88, t: 0,         d: beat },
           { f: 440.00, t: beat,       d: beat * 0.5 },
           { f: 392.00, t: beat * 1.5, d: beat * 0.5 },
           { f: 440.00, t: beat * 2,   d: beat * 2 }],
          // Bar 15 (F): ascending build
          [{ f: 349.23, t: 0,         d: beat * 0.5 },
           { f: 440.00, t: beat * 0.5, d: beat * 0.5 },
           { f: 523.25, t: beat,       d: beat * 0.5 },
           { f: 587.33, t: beat * 1.5, d: beat * 0.5 },
           { f: 659.25, t: beat * 2,   d: beat * 2 }],
          // Bar 16 (G): flourish → leads back into A section
          [{ f: 784.00, t: 0,         d: beat * 0.5 },
           { f: 659.25, t: beat * 0.5, d: beat * 0.5 },
           { f: 587.33, t: beat,       d: beat },
           { f: 523.25, t: beat * 2,   d: beat },
           { f: 392.00, t: beat * 3,   d: beat }],
        ];
        counterB.forEach((barMelody, ci) => {
          const barStart = now + (12 + ci) * bar;
          barMelody.forEach(({ f, t, d }) => {
            schedNote(f, barStart + t, d, 'triangle', 0.05, 0.04);
          });
        });

        // Denser arpeggios for B section: two hits per bar (beats 1.5 and 3.5)
        const arpB = [523.25, 440.00, 349.23, 392.00, 659.25, 523.25, 440.00, 587.33];
        for (let i = 0; i < 8; i++) {
          const barStart = now + (8 + i) * bar;
          const freq = arpB[i];
          schedNote(freq,            barStart + beat * 0.5, beat * 1.5, 'triangle', 0.03, 0.04);
          schedNote(freq * 1.498307, barStart + beat * 2.5, beat * 1.5, 'triangle', 0.03, 0.04); // up a fifth
        }

        return { nodes, loopDuration };
      },

      // ---- COMBAT: chiptune battle theme, ~140 BPM, 8-bar loop ------------
      // A section (bars 1-4): Em-C-D-Bm, original driving theme
      // B section (bars 5-8): Am-F-C-G, raised register + 16th hi-hats
      combat: () => {
        const bpm = 140;
        const beat = 60 / bpm;              // ~0.4286 s
        const bar  = beat * 4;              // ~1.714 s
        const loopDuration = bar * 8;       // ~13.714 s
        const now  = this.ctx.currentTime;

        const nodes = [];

        // Helper: schedule a melodic note
        const note = (freq, start, dur, type, vol) => {
          const osc  = this.ctx.createOscillator();
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

        // Helper: noise percussion hit
        const noiseHit = (hitTime, dur, vol) => {
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data   = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) data[s] = Math.random() * 2 - 1;
          const src  = this.ctx.createBufferSource();
          src.buffer = buffer;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(vol, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
          src.connect(gain);
          gain.connect(this.musicGain);
          src.start(hitTime);
          src.stop(hitTime + dur + 0.01);
          nodes.push(src);
        };

        // === A SECTION: bars 1-4 (Em-C-D-Bm) ===

        // Driving sawtooth bass: root 8th-notes with octave jumps
        const bassA = [
          [82.41, 82.41, 164.81, 82.41, 82.41, 164.81, 82.41, 164.81],  // Em
          [65.41, 65.41, 130.81, 65.41, 65.41, 130.81, 65.41, 130.81],  // C
          [73.42, 73.42, 146.83, 73.42, 73.42, 146.83, 73.42, 146.83],  // D
          [61.74, 61.74, 123.47, 61.74, 61.74, 123.47, 123.47, 61.74],  // Bm
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + b * bar;
          const eighth   = beat / 2;
          bassA[b].forEach((freq, i) => {
            note(freq, barStart + i * eighth, eighth * 0.9, 'sawtooth', 0.12);
          });
        }

        // Melody A: E minor pentatonic, Earthbound-style square wave
        const melodyA = [
          [{ f: 329.63, t: 0,         d: beat },
           { f: 392.00, t: beat,       d: beat * 0.5 },
           { f: 440.00, t: beat * 1.5, d: beat * 0.5 },
           { f: 493.88, t: beat * 2,   d: beat },
           { f: 440.00, t: beat * 3,   d: beat * 0.5 },
           { f: 392.00, t: beat * 3.5, d: beat * 0.5 }],
          [{ f: 523.25, t: 0,         d: beat * 0.5 },
           { f: 493.88, t: beat * 0.5, d: beat * 0.5 },
           { f: 440.00, t: beat,       d: beat },
           { f: 329.63, t: beat * 2,   d: beat * 1.5 },
           { f: 392.00, t: beat * 3.5, d: beat * 0.5 }],
          [{ f: 587.33, t: 0,         d: beat },
           { f: 523.25, t: beat,       d: beat * 0.5 },
           { f: 493.88, t: beat * 1.5, d: beat * 0.5 },
           { f: 440.00, t: beat * 2,   d: beat * 0.5 },
           { f: 493.88, t: beat * 2.5, d: beat * 0.5 },
           { f: 523.25, t: beat * 3,   d: beat }],
          [{ f: 659.25, t: 0,         d: beat * 0.5 },
           { f: 587.33, t: beat * 0.5, d: beat * 0.5 },
           { f: 493.88, t: beat,       d: beat },
           { f: 392.00, t: beat * 2,   d: beat * 0.5 },
           { f: 440.00, t: beat * 2.5, d: beat * 0.5 },
           { f: 329.63, t: beat * 3,   d: beat }],
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + b * bar;
          melodyA[b].forEach(({ f, t, d }) => note(f, barStart + t, d * 0.9, 'square', 0.09));
        }

        // Percussion A: beat hits accented on 1 & 3
        for (let b = 0; b < 4; b++) {
          for (let i = 0; i < 4; i++) {
            const accent = (i === 0 || i === 2);
            noiseHit(now + b * bar + i * beat, accent ? 0.06 : 0.03, accent ? 0.15 : 0.07);
          }
        }

        // Harmony A: chord stabs on beat 1
        const harmA = [
          [329.63, 392.00, 493.88],  // Em
          [261.63, 329.63, 392.00],  // C
          [293.66, 369.99, 440.00],  // D
          [246.94, 329.63, 392.00],  // Em/B
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + b * bar;
          harmA[b].forEach((freq) => note(freq, barStart, beat * 1.5, 'square', 0.04));
        }

        // === B SECTION: bars 5-8 (Am-F-C-G) — raised register, more intense ===

        // Bass B: Am-F-C-G, same sawtooth pattern
        const bassB = [
          [110.00, 110.00, 220.00, 110.00, 110.00, 220.00, 110.00, 220.00], // Am
          [87.31,  87.31,  174.61, 87.31,  87.31,  174.61, 87.31,  174.61], // F
          [65.41,  65.41,  130.81, 65.41,  98.00,  65.41,  130.81, 98.00],  // C (with G passing)
          [98.00,  98.00,  196.00, 98.00,  98.00,  196.00, 82.41,  98.00],  // G (lead back to Em)
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + (4 + b) * bar;
          const eighth   = beat / 2;
          bassB[b].forEach((freq, i) => {
            note(freq, barStart + i * eighth, eighth * 0.9, 'sawtooth', 0.12);
          });
        }

        // Melody B: higher register, urgent — Am pentatonic an octave up
        const melodyB = [
          // Bar 5 (Am): urgent ascending run
          [{ f: 880.00, t: 0,         d: beat * 0.5 },
           { f: 783.99, t: beat * 0.5, d: beat * 0.5 },
           { f: 659.25, t: beat,       d: beat * 0.5 },
           { f: 783.99, t: beat * 1.5, d: beat * 0.5 },
           { f: 880.00, t: beat * 2,   d: beat * 0.5 },
           { f: 987.77, t: beat * 2.5, d: beat * 0.5 },
           { f: 880.00, t: beat * 3,   d: beat }],
          // Bar 6 (F): drop then soar
          [{ f: 523.25, t: 0,         d: beat * 0.5 },
           { f: 587.33, t: beat * 0.5, d: beat * 0.5 },
           { f: 659.25, t: beat,       d: beat },
           { f: 783.99, t: beat * 2,   d: beat * 0.5 },
           { f: 880.00, t: beat * 2.5, d: beat * 1.5 }],
          // Bar 7 (C): triumphant cascade down
          [{ f: 1046.50, t: 0,         d: beat * 0.5 },
           { f: 987.77,  t: beat * 0.5, d: beat * 0.5 },
           { f: 880.00,  t: beat,       d: beat * 0.5 },
           { f: 783.99,  t: beat * 1.5, d: beat * 0.5 },
           { f: 659.25,  t: beat * 2,   d: beat * 0.5 },
           { f: 523.25,  t: beat * 2.5, d: beat * 0.5 },
           { f: 659.25,  t: beat * 3,   d: beat }],
          // Bar 8 (G): dramatic descent, resolve to loop start
          [{ f: 783.99, t: 0,         d: beat * 0.5 },
           { f: 659.25, t: beat * 0.5, d: beat * 0.5 },
           { f: 587.33, t: beat,       d: beat * 0.5 },
           { f: 493.88, t: beat * 1.5, d: beat * 0.5 },
           { f: 440.00, t: beat * 2,   d: beat * 0.5 },
           { f: 392.00, t: beat * 2.5, d: beat * 0.5 },
           { f: 329.63, t: beat * 3,   d: beat }],
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + (4 + b) * bar;
          melodyB[b].forEach(({ f, t, d }) => note(f, barStart + t, d * 0.85, 'square', 0.09));
        }

        // Percussion B: slightly louder beats + 16th off-beat hi-hats
        for (let b = 0; b < 4; b++) {
          for (let i = 0; i < 4; i++) {
            const accent = (i === 0 || i === 2);
            noiseHit(now + (4 + b) * bar + i * beat, accent ? 0.06 : 0.03, accent ? 0.18 : 0.09);
          }
          // 16th-note hi-hats on the off-sixteenths (between each 8th)
          for (let i = 0; i < 8; i++) {
            if (i % 2 === 1) {
              noiseHit(now + (4 + b) * bar + i * (beat / 2), 0.02, 0.05);
            }
          }
        }

        // Harmony B: Am-F-C-G stabs on beats 1 and 3
        const harmB = [
          [220.00, 261.63, 329.63, 440.00],  // Am: A3, C4, E4, A4
          [174.61, 220.00, 261.63, 349.23],  // F:  F3, A3, C4, F4
          [130.81, 196.00, 261.63, 329.63],  // C:  C3, G3, C4, E4
          [196.00, 246.94, 293.66, 392.00],  // G:  G3, B3, D4, G4
        ];
        for (let b = 0; b < 4; b++) {
          const barStart = now + (4 + b) * bar;
          harmB[b].forEach((freq) => {
            note(freq, barStart,            beat * 1.5,  'square', 0.04); // beat 1
            note(freq, barStart + beat * 2, beat * 0.75, 'square', 0.03); // beat 3
          });
        }

        return { nodes, loopDuration };
      },

      // ---- SERVER ROOM: dark electronic, 126 BPM, 8-bar loop ---------------
      server: () => {
        const bpm = 126;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const nodes = [];

        const n = (freq, start, dur, type, vol) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.005);
          gain.gain.setValueAtTime(vol, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // Dm-Gm-Bb-A (x2), pulsing sawtooth bass with octave jumps
        const bassRoots = [73.41, 98.00, 116.54, 110.00];
        const eighth = beat / 2;
        for (let rep = 0; rep < 2; rep++) {
          for (let b = 0; b < 4; b++) {
            const bs = now + (rep * 4 + b) * bar;
            const r  = bassRoots[b];
            [r, r, r*2, r, r*2, r, r, r*2].forEach((f, i) => {
              n(f, bs + i * eighth, eighth * 0.85, 'sawtooth', 0.11);
            });
          }
        }

        // Quiet sine tension pad (root an octave up)
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((r, b) => {
            n(r * 4, now + (rep * 4 + b) * bar, bar * 0.92, 'sine', 0.04);
          });
        }

        // Electronic blips (square, high register, irregular pattern)
        [
          { b: 0, t: beat*0.5,  f: 587.33 }, { b: 0, t: beat*2.5,  f: 880.00 },
          { b: 1, t: beat*1.0,  f: 659.25 }, { b: 1, t: beat*3.0,  f: 783.99 },
          { b: 2, t: beat*0.5,  f: 587.33 }, { b: 2, t: beat*1.5,  f: 783.99 },
          { b: 2, t: beat*3.0,  f: 659.25 },
          { b: 3, t: beat*2.0,  f: 880.00 }, { b: 3, t: beat*2.5,  f: 1174.66 },
          { b: 3, t: beat*3.0,  f: 987.77 },
          { b: 4, t: beat*0.5,  f: 659.25 }, { b: 4, t: beat*2.0,  f: 783.99 },
          { b: 5, t: beat*1.0,  f: 587.33 }, { b: 5, t: beat*3.0,  f: 880.00 },
          { b: 6, t: beat*0.5,  f: 783.99 }, { b: 6, t: beat*1.5,  f: 659.25 },
          { b: 6, t: beat*2.5,  f: 783.99 },
          { b: 7, t: beat*1.0,  f: 1174.66 }, { b: 7, t: beat*2.0, f: 987.77 },
          { b: 7, t: beat*3.0,  f: 880.00 },  { b: 7, t: beat*3.5, f: 783.99 },
        ].forEach(({ b, t, f }) => n(f, now + b * bar + t, beat * 0.18, 'square', 0.06));

        return { nodes, loopDuration };
      },

      // ---- EXECUTIVE FLOOR: pompous slow, 68 BPM, 8-bar loop ---------------
      executive: () => {
        const bpm = 68;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.06) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + attack);
          gain.gain.setValueAtTime(vol, start + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Bb-Eb-F-Cm (x2) — rich sine pads
        const chords = [
          [116.54, 146.83, 174.61],  // Bb maj
          [155.56, 196.00, 233.08],  // Eb maj
          [174.61, 220.00, 261.63],  // F maj
          [130.81, 155.56, 196.00],  // Cm
        ];
        for (let rep = 0; rep < 2; rep++) {
          chords.forEach((chord, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            chord.forEach(f => n(f, bs, bar, 'sine', 0.09, 0.3));
          });
        }

        // Walking bass (triangle, quarter notes)
        const walkLines = [
          [116.54, 130.81, 146.83, 174.61],
          [155.56, 174.61, 196.00, 174.61],
          [174.61, 196.00, 220.00, 246.94],
          [130.81, 146.83, 155.56, 130.81],
        ];
        for (let rep = 0; rep < 2; rep++) {
          walkLines.forEach((line, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            line.forEach((f, i) => n(f, bs + i * beat, beat * 0.85, 'triangle', 0.08, 0.03));
          });
        }

        // Stately melody (triangle, slow and deliberate)
        [
          [{ f: 466.16, t: 0 },       { f: 523.25, t: beat*2 }],
          [{ f: 587.33, t: 0 },       { f: 622.25, t: beat }],
          [{ f: 698.46, t: 0 },       { f: 659.25, t: beat*1.5 }, { f: 587.33, t: beat*2.5 }],
          [{ f: 523.25, t: 0 },       { f: 493.88, t: beat*1.5 }, { f: 466.16, t: beat*2.5 }],
          [{ f: 523.25, t: 0 },       { f: 587.33, t: beat },     { f: 622.25, t: beat*2 }],
          [{ f: 698.46, t: 0 },       { f: 622.25, t: beat*2 }],
          [{ f: 783.99, t: 0 },       { f: 698.46, t: beat*1.5 }, { f: 622.25, t: beat*2.5 }],
          [{ f: 466.16, t: 0 }],
        ].forEach((barMel, b) => {
          const bs = now + b * bar;
          const durations = [beat * 2, beat * 3, beat * 1.5, beat * 1.5, beat * 2, beat * 4];
          barMel.forEach(({ f, t }, i) => {
            const dur = barMel[i + 1] ? (barMel[i + 1].t - t) : beat * (4 - t / beat);
            n(f, bs + t, Math.max(dur * 0.88, beat * 0.5), 'triangle', 0.07, 0.1);
          });
        });

        return { nodes, loopDuration };
      },

      // ---- PARKING GARAGE: lonely lo-fi, 78 BPM, 8-bar loop ----------------
      parking: () => {
        const bpm = 78;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.05) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + attack);
          gain.gain.setValueAtTime(vol, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Am7-Dm7-G7-Cmaj7 (x2), sparse bass
        const bassRoots = [110.00, 146.83, 98.00, 130.81];
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((f, b) => {
            const bs = now + (rep * 4 + b) * bar;
            n(f, bs, beat * 1.5, 'sine', 0.09, 0.08);
            n(f * 2, bs + beat * 2.5, beat, 'sine', 0.06, 0.06);
          });
        }

        // Quiet jazz chord pads (sine, delayed entry)
        const jazzChords = [
          [220.00, 261.63, 329.63, 392.00],
          [146.83, 174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66, 349.23],
          [261.63, 329.63, 392.00, 493.88],
        ];
        for (let rep = 0; rep < 2; rep++) {
          jazzChords.forEach((chord, b) => {
            const bs = now + (rep * 4 + b) * bar;
            chord.forEach(f => n(f, bs + beat * 0.5, bar * 0.6, 'sine', 0.04, 0.15));
          });
        }

        // Lonely melody (triangle, very sparse)
        [
          { b: 0, t: beat*1.0, f: 440.00 }, { b: 0, t: beat*2.5, f: 523.25 },
          { b: 1, t: beat*3.0, f: 493.88 },
          { b: 2, t: beat*1.0, f: 392.00 }, { b: 2, t: beat*3.0, f: 440.00 },
          { b: 3, t: beat*1.5, f: 523.25 }, { b: 3, t: beat*3.5, f: 493.88 },
          { b: 4, t: beat*0.5, f: 440.00 }, { b: 4, t: beat*2.0, f: 392.00 },
          { b: 5, t: beat*1.0, f: 329.63 }, { b: 5, t: beat*3.0, f: 392.00 },
          { b: 6, t: beat*2.0, f: 440.00 }, { b: 6, t: beat*3.0, f: 493.88 },
          { b: 7, t: beat*1.0, f: 523.25 }, { b: 7, t: beat*2.5, f: 440.00 },
          { b: 7, t: beat*3.5, f: 392.00 },
        ].forEach(({ b, t, f }) => n(f, now + b * bar + t, beat * 0.9, 'triangle', 0.06, 0.05));

        return { nodes, loopDuration };
      },

      // ---- BREAK ROOM: light upbeat, 100 BPM, 8-bar loop -------------------
      break_room: () => {
        const bpm = 100;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.03) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + attack);
          gain.gain.setValueAtTime(vol, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // C-G-Am-F (x2)
        const chords = [
          [261.63, 329.63, 392.00],
          [196.00, 246.94, 293.66],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
        ];
        const bassRoots = [130.81, 98.00, 110.00, 87.31];
        const eighth = beat / 2;

        // Bouncy bass (triangle)
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((f, b) => {
            const bs = now + (rep * 4 + b) * bar;
            [f, 0, f*1.5, 0, f, 0, f*1.5, f].forEach((freq, i) => {
              if (freq > 0) n(freq, bs + i * eighth, eighth * 0.85, 'triangle', 0.08, 0.02);
            });
          });
        }

        // Bright chord arpeggios (triangle, 8th notes, one octave up)
        for (let rep = 0; rep < 2; rep++) {
          chords.forEach((chord, b) => {
            const bs = now + (rep * 4 + b) * bar;
            [chord[0], chord[1], chord[2], chord[2], chord[1], chord[0], chord[1], chord[2]].forEach((f, i) => {
              n(f * 2, bs + i * eighth, eighth * 0.8, 'triangle', 0.05, 0.02);
            });
          });
        }

        // Light sine melody
        [
          [{ f: 784.00, t: 0 }, { f: 880.00, t: beat }, { f: 987.77, t: beat*1.5 }],
          [{ f: 880.00, t: 0 }, { f: 783.99, t: beat*0.5 }, { f: 698.46, t: beat }],
          [{ f: 880.00, t: 0 }, { f: 987.77, t: beat }, { f: 880.00, t: beat*1.5 }, { f: 783.99, t: beat*2 }],
          [{ f: 698.46, t: 0 }, { f: 784.00, t: beat*0.5 }, { f: 880.00, t: beat }],
          [{ f: 784.00, t: 0 }, { f: 880.00, t: beat }, { f: 987.77, t: beat*1.5 }],
          [{ f: 880.00, t: 0 }, { f: 783.99, t: beat*0.5 }, { f: 698.46, t: beat }],
          [{ f: 1046.50, t: 0 }, { f: 987.77, t: beat*0.5 }, { f: 880.00, t: beat }, { f: 783.99, t: beat*2 }],
          [{ f: 784.00, t: 0 }],
        ].forEach((barMel, b) => {
          const bs = now + b * bar;
          barMel.forEach(({ f, t }, i) => {
            const next = barMel[i + 1];
            const dur = next ? (next.t - t) * 0.88 : beat * (4 - t / beat) * 0.88;
            n(f, bs + t, Math.max(dur, beat * 0.4), 'sine', 0.055, 0.04);
          });
        });

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

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
      this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, now + 0.05);
    }
  }

  setMusicEnabled(enabled) {
    if (enabled && !this.currentTrack) return; // nothing to resume
    if (!enabled) {
      this._stopMusicImmediate(0.4);
    }
    // re-enabling is handled by the caller invoking playMusic()
  }

  toggleMute() {
    this.muted = !this.muted;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }
}

export const AudioManager = new AudioManagerClass();
