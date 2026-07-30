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
    this._pendingTrack = null;

    // Variation engine state
    this._passState = {};                // trackId -> { pass, lastPick } (see _trackState)
    this._sfxState = { lastPick: {} };   // rotating SFX timbre variant memory
  }

  init() {
    // Web Audio contexts should be created after a user gesture. Keep init()
    // side-effect-light so page load does not trigger autoplay warnings.
  }

  // Build the AudioContext AHEAD of the first input, during a moment where a
  // hitch is already covered (boot / title screen).
  //
  // Why this exists: `new AudioContext()` opens the audio device SYNCHRONOUSLY
  // and measured 385.5ms on this machine (Long Animation Frames attributed a
  // 398ms blocking frame to main.js's initAudio; splitting it showed
  // _ensureContext 385.5ms, ctx.resume() 0ms, playMusic 7.5ms). Doing that
  // inside the keydown handler means the player's VERY FIRST key press freezes
  // the game for a third of a second. It cannot be made cheaper — it can only
  // be moved somewhere a stall is invisible.
  //
  // Autoplay policy is satisfied either way: a pre-gesture context is created
  // in the 'suspended' state and resume() after any gesture starts it. The only
  // cost of creating early is a console autoplay notice, which is a much better
  // trade than 385ms on first input. Safe to call repeatedly.
  warmUp() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      this._ensureContext();
    } catch {
      // Some browsers refuse a pre-gesture context. Fall back to the old
      // behaviour: resume() will build it on the first gesture.
      this.ctx = null;
    }
  }

  _ensureContext() {
    if (this.ctx || typeof window === 'undefined') return !!this.ctx;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
    return true;
  }

  resume() {
    this._ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this._pendingTrack) {
      const track = this._pendingTrack;
      this._pendingTrack = null;
      this.playMusic(track);
    }
  }

  // ---------------------------------------------------------------------------
  // Variation engine helpers
  // ---------------------------------------------------------------------------

  /** Per-track pass state: pass counter + memory of last variant picks. */
  _trackState(id) {
    if (!this._passState[id]) this._passState[id] = { pass: 0, lastPick: {} };
    return this._passState[id];
  }

  /**
   * Pick an index in [0, count) pseudo-randomly while avoiding the index
   * picked last time under the same key — so phrase pools never repeat
   * back-to-back.
   */
  _pickVariant(state, key, count) {
    if (count <= 1) return 0;
    const last = state.lastPick[key];
    let idx = Math.floor(Math.random() * count);
    if (idx === last) idx = (idx + 1 + Math.floor(Math.random() * (count - 1))) % count;
    state.lastPick[key] = idx;
    return idx;
  }

  /** Humanize a gain value by ±spread (default ±15%). */
  _hVol(vol, spread = 0.15) {
    return vol * (1 + (Math.random() * 2 - 1) * spread);
  }

  /** True with probability p — drives occasional rests, octave doublings, ghost hits. */
  _chance(p) {
    return Math.random() < p;
  }

  // ---------------------------------------------------------------------------
  // SFX — every play is lightly randomized (pitch / duration / gain jitter,
  // plus rotating timbre variants for the most frequently heard sounds) so
  // repeated effects never sound machine-identical.
  // ---------------------------------------------------------------------------
  playSfx(type) {
    if (!this._ensureContext() || this.muted) return;
    this.resume();

    // Per-play randomization helpers:
    // j(v, pct)  — linear jitter of ±pct
    // semis(r)   — multiplicative pitch factor within ±r semitones (musical)
    const j = (v, pct) => v * (1 + (Math.random() * 2 - 1) * pct);
    const semis = (r) => Math.pow(2, ((Math.random() * 2 - 1) * r) / 12);

    switch (type) {
      case 'confirm': {
        // 3 timbre variants, rotated randomly (never the same twice in a row)
        const variants = [
          { freqs: [440, 660], wave: 'square' },
          { freqs: [493.88, 740.0], wave: 'square' },
          { freqs: [440, 660], wave: 'triangle' },
        ];
        const v = variants[this._pickVariant(this._sfxState, 'confirm', variants.length)];
        const p = semis(0.5);
        this._playTone(v.freqs.map((f) => f * p), j(0.1, 0.1), v.wave, j(0.3, 0.12));
        break;
      }
      case 'cancel': {
        const wave = this._chance(0.3) ? 'triangle' : 'square';
        const p = semis(0.7);
        this._playTone([330 * p, 220 * p], j(0.1, 0.1), wave, j(0.3, 0.12));
        break;
      }
      case 'cursor': {
        const variants = [
          { freq: 500, wave: 'square' },
          { freq: 560, wave: 'square' },
          { freq: 500, wave: 'triangle' },
        ];
        const v = variants[this._pickVariant(this._sfxState, 'cursor', variants.length)];
        this._playTone([j(v.freq, 0.04)], j(0.05, 0.15), v.wave, j(0.2, 0.15));
        break;
      }
      case 'hit': this._playNoise(j(0.15, 0.25), j(0.5, 0.18)); break;
      case 'critical': {
        const p = semis(1);
        this._playTone([200, 400, 800].map((f) => f * p), j(0.08, 0.12), 'sawtooth', j(0.4, 0.12));
        break;
      }
      case 'heal': {
        const p = semis(0.5);
        this._playTone([330, 440, 550, 660].map((f) => f * p), j(0.12, 0.1), 'sine', j(0.3, 0.12));
        break;
      }
      case 'levelup': {
        const p = semis(0.3);
        this._playTone([440, 550, 660, 880].map((f) => f * p), j(0.15, 0.08), 'square', j(0.3, 0.1));
        break;
      }
      case 'text': {
        const variants = [
          { freq: 600, wave: 'square' },
          { freq: 660, wave: 'square' },
          { freq: 540, wave: 'triangle' },
        ];
        const v = variants[this._pickVariant(this._sfxState, 'text', variants.length)];
        this._playTone([j(v.freq, 0.05)], 0.02, v.wave, j(0.1, 0.2));
        break;
      }
      case 'step': this._playNoise(j(0.04, 0.3), j(0.1, 0.25)); break;
      case 'door': {
        const p = semis(0.8);
        this._playTone([220 * p, 180 * p], j(0.15, 0.12), 'sine', j(0.3, 0.12));
        break;
      }
      case 'victory': {
        const p = semis(0.4);
        this._playMelody([523, 659, 784, 1047].map((f) => f * p), j(0.15, 0.08), 'square', j(0.3, 0.1));
        break;
      }
      case 'defeat': {
        const p = semis(0.4);
        this._playMelody([440, 370, 330, 220].map((f) => f * p), j(0.2, 0.08), 'sawtooth', j(0.3, 0.1));
        break;
      }
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
   * Music track definitions. Each track is a function that schedules ONE PASS
   * (one section) of oscillator notes into the Web Audio graph and returns
   * the pass duration in seconds. All oscillators route through `this.musicGain`.
   *
   * Variation engine: _scheduleLoop() calls the generator once per pass and
   * advances this._trackState(id).pass afterwards. Generators use that state to:
   *   - walk an A/A/B/A section form (`pass % 4`) for long-form structure,
   *     so a full cycle is 2-4x longer than any single pass
   *   - rotate between 2+ chord progressions (`pass % progs.length`)
   *   - pick melodic phrases from pools via _pickVariant() (never repeating
   *     the immediately previous pick)
   * plus per-note humanization (gain jitter via _hVol, occasional rests,
   * octave doublings, ghost percussion hits) so no two passes are identical.
   */
  _getMusicTracks() {
    return {
      // ---- EXPLORATION: lo-fi office ambient, ~80 BPM, 8-bar sections ------
      // Form A: sustained pads + sub-bass + sparse arpeggios
      // Form B: walking bass + counter-melody phrases over the same pads
      exploration: () => {
        const st  = this._trackState('exploration');
        const bpm = 80;
        const beat = 60 / bpm;              // 0.75 s per beat
        const bar  = beat * 4;              // 3 s per bar
        const loopDuration = bar * 8;       // 24 s per pass; full A/A/B/A cycle = 96 s
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];

        // Rotating progressions — both diatonic to C major so every phrase
        // pool below fits either one.
        const progs = [
          { // C - Am - F - G
            chords: [[261.63, 329.63, 392.00], [220.00, 261.63, 329.63],
                     [174.61, 220.00, 261.63], [196.00, 246.94, 293.66]],
            roots:  [130.81, 110.00, 87.31, 98.00],          // C3, A2, F2, G2
            walks:  [
              [130.81, 164.81, 196.00, 220.00],              // C: 1-3-5-6
              [110.00, 130.81, 164.81, 196.00],              // Am: 1-b3-5-b7
              [87.31,  110.00, 130.81, 164.81],              // F
              [98.00,  123.47, 146.83, 174.61],              // G
            ],
          },
          { // Am - F - C - G
            chords: [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63],
                     [261.63, 329.63, 392.00], [196.00, 246.94, 293.66]],
            roots:  [110.00, 87.31, 130.81, 98.00],          // A2, F2, C3, G2
            walks:  [
              [110.00, 130.81, 164.81, 196.00],
              [87.31,  110.00, 130.81, 164.81],
              [130.81, 164.81, 196.00, 220.00],
              [98.00,  123.47, 146.83, 174.61],
            ],
          },
        ];
        const prog = progs[st.pass % progs.length];

        const nodes = [];

        // Helper: schedule one oscillator note (gain lightly humanized)
        const schedNote = (freq, start, dur, type, vol, attack = 0.05) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.12);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Helper: bar-long pad note
        const schedPad = (freq, barStart, vol) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.1);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, barStart);
          gain.gain.linearRampToValueAtTime(v, barStart + beat * 0.5);
          gain.gain.setValueAtTime(v, barStart + bar - beat * 0.5);
          gain.gain.linearRampToValueAtTime(0, barStart + bar);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(barStart);
          osc.stop(barStart + bar + 0.05);
          nodes.push(osc);
        };

        // Pad layer: soft sine chords, one per bar (quieter under the B melody)
        const padVol = form === 'B' ? 0.07 : 0.10;
        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, ci) => {
            const barStart = now + (rep * 4 + ci) * bar;
            chord.forEach((freq, ni) => {
              schedPad(freq, barStart, padVol);
              // Occasional octave doubling of the chord's top note (shimmer)
              if (ni === chord.length - 1 && this._chance(0.2)) {
                schedPad(freq * 2, barStart, padVol * 0.35);
              }
            });
          });
        }

        if (form === 'A') {
          // Sub-bass: one sustained root per bar, sine
          for (let rep = 0; rep < 2; rep++) {
            prog.roots.forEach((freq, ci) => {
              const barStart = now + (rep * 4 + ci) * bar;
              const osc  = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              const v = this._hVol(0.08, 0.1);
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0, barStart);
              gain.gain.linearRampToValueAtTime(v, barStart + beat * 0.3);
              gain.gain.setValueAtTime(v, barStart + bar - beat);
              gain.gain.linearRampToValueAtTime(0, barStart + bar);
              osc.connect(gain);
              gain.connect(this.musicGain);
              osc.start(barStart);
              osc.stop(barStart + bar + 0.05);
              nodes.push(osc);
            });
          }
        } else {
          // Walking bass: 8th-note lines (triangle) instead of sustained roots
          const eighth = beat / 2;
          for (let rep = 0; rep < 2; rep++) {
            prog.walks.forEach((walk, ci) => {
              const barStart = now + (rep * 4 + ci) * bar;
              [walk[0], walk[1], walk[2], walk[3], walk[0], walk[1], walk[2], walk[1]].forEach((freq, i) => {
                schedNote(freq, barStart + i * eighth, eighth * 0.85, 'triangle', 0.07, 0.02);
              });
            });
          }
        }

        // Arpeggios — line picked from a pool (never the same twice running).
        const arpPool = [
          [523.25, 659.25, 587.33, 523.25, 493.88, 440.00, 523.25, 587.33], // C5 E5 D5 C5 B4 A4 C5 D5
          [659.25, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99], // E5 G5 E5 D5 C5 D5 E5 G5
          [392.00, 440.00, 523.25, 659.25, 587.33, 523.25, 440.00, 392.00], // G4 A4 C5 E5 D5 C5 A4 G4
        ];
        const arp = arpPool[this._pickVariant(st, 'arp', arpPool.length)];
        for (let i = 0; i < 8; i++) {
          if (this._chance(0.12)) continue;              // occasional rest
          const barStart = now + i * bar;
          if (form === 'A') {
            schedNote(arp[i], barStart + beat * 1.5, beat * 2, 'triangle', 0.04, 0.05);
            if (this._chance(0.15)) {
              schedNote(arp[i] * 2, barStart + beat * 1.5, beat * 2, 'triangle', 0.02, 0.05);
            }
          } else {
            // Denser in B: two hits per bar, second a fifth up
            schedNote(arp[i],            barStart + beat * 0.5, beat * 1.5, 'triangle', 0.03, 0.04);
            schedNote(arp[i] * 1.498307, barStart + beat * 2.5, beat * 1.5, 'triangle', 0.03, 0.04);
          }
        }

        // Counter-melody (B sections only): two 4-bar phrases drawn from a
        // pool of three, never the same phrase twice in one pass.
        // Phrase format: 4 bars of { f, t, d } with t/d in beats.
        if (form === 'B') {
          const phrases = [
            [ // "questioning ascent" (original counter A)
              [{ f: 523.25, t: 0, d: 1 }, { f: 587.33, t: 1, d: 0.5 }, { f: 659.25, t: 1.5, d: 2.5 }],
              [{ f: 440.00, t: 0, d: 0.5 }, { f: 523.25, t: 0.5, d: 0.5 }, { f: 493.88, t: 1, d: 3 }],
              [{ f: 523.25, t: 0, d: 0.5 }, { f: 440.00, t: 0.5, d: 0.5 }, { f: 349.23, t: 1, d: 3 }],
              [{ f: 392.00, t: 0, d: 0.5 }, { f: 493.88, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 1 }, { f: 659.25, t: 2, d: 2 }],
            ],
            [ // "descending resolution" (original counter B)
              [{ f: 784.00, t: 0, d: 0.5 }, { f: 659.25, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 0.5 }, { f: 523.25, t: 1.5, d: 2.5 }],
              [{ f: 493.88, t: 0, d: 1 }, { f: 440.00, t: 1, d: 0.5 }, { f: 392.00, t: 1.5, d: 0.5 }, { f: 440.00, t: 2, d: 2 }],
              [{ f: 349.23, t: 0, d: 0.5 }, { f: 440.00, t: 0.5, d: 0.5 }, { f: 523.25, t: 1, d: 0.5 }, { f: 587.33, t: 1.5, d: 0.5 }, { f: 659.25, t: 2, d: 2 }],
              [{ f: 784.00, t: 0, d: 0.5 }, { f: 659.25, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 1 }, { f: 523.25, t: 2, d: 1 }, { f: 392.00, t: 3, d: 1 }],
            ],
            [ // "high afternoon" (new)
              [{ f: 659.25, t: 0, d: 1.5 }, { f: 783.99, t: 1.5, d: 0.5 }, { f: 880.00, t: 2, d: 2 }],
              [{ f: 783.99, t: 0, d: 1 }, { f: 659.25, t: 1, d: 1 }, { f: 587.33, t: 2, d: 2 }],
              [{ f: 523.25, t: 0, d: 0.5 }, { f: 587.33, t: 0.5, d: 0.5 }, { f: 659.25, t: 1, d: 1.5 }, { f: 783.99, t: 2.5, d: 1.5 }],
              [{ f: 880.00, t: 0, d: 1 }, { f: 783.99, t: 1, d: 1 }, { f: 659.25, t: 2, d: 1 }, { f: 587.33, t: 3, d: 1 }],
            ],
          ];
          const p1 = this._pickVariant(st, 'counterFirst', phrases.length);
          let p2 = this._pickVariant(st, 'counterSecond', phrases.length);
          if (p2 === p1) p2 = (p2 + 1) % phrases.length;
          [phrases[p1], phrases[p2]].forEach((phrase, half) => {
            phrase.forEach((barMelody, ci) => {
              const barStart = now + (half * 4 + ci) * bar;
              barMelody.forEach(({ f, t, d }) => {
                if (this._chance(0.06)) return;          // rare breath
                schedNote(f, barStart + t * beat, d * beat, 'triangle', 0.05, 0.04);
                if (this._chance(0.12)) {
                  schedNote(f * 2, barStart + t * beat, d * beat, 'triangle', 0.02, 0.04);
                }
              });
            });
          });
        }

        return { nodes, loopDuration };
      },

      // ---- COMBAT: chiptune battle theme, ~140 BPM, 8-bar passes -----------
      // Form A: low driving riff (bars 1-4) + raised-register answer (5-8)
      // Form B: percussion/bass breakdown building back into the high climax
      combat: () => {
        const st  = this._trackState('combat');
        const bpm = 140;
        const beat = 60 / bpm;              // ~0.4286 s
        const bar  = beat * 4;              // ~1.714 s
        const loopDuration = bar * 8;       // ~13.7 s per pass; full cycle ~55 s
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];

        const nodes = [];

        // Helper: schedule a melodic note (gain lightly humanized)
        const note = (freq, start, dur, type, vol) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.1);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + 0.005);
          gain.gain.setValueAtTime(v, start + dur * 0.75);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // Helper: noise percussion hit (velocity jitter built in)
        const noiseHit = (hitTime, dur, vol) => {
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data   = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) data[s] = Math.random() * 2 - 1;
          const src  = this.ctx.createBufferSource();
          src.buffer = buffer;
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.15);
          gain.gain.setValueAtTime(v, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
          src.connect(gain);
          gain.connect(this.musicGain);
          src.start(hitTime);
          src.stop(hitTime + dur + 0.01);
          nodes.push(src);
        };

        // Rotating progressions. Low half = driving minor riff; high half =
        // raised-register answer. Both melodic pools fit either variant.
        const progLow = [
          { roots: [82.41, 65.41, 73.42, 61.74],            // Em - C - D - Bm
            harm:  [[329.63, 392.00, 493.88], [261.63, 329.63, 392.00],
                    [293.66, 369.99, 440.00], [246.94, 329.63, 392.00]] },
          { roots: [82.41, 73.42, 65.41, 73.42],            // Em - D - C - D (modal drive)
            harm:  [[329.63, 392.00, 493.88], [293.66, 369.99, 440.00],
                    [261.63, 329.63, 392.00], [293.66, 369.99, 440.00]] },
        ];
        const progHigh = [
          { roots: [110.00, 87.31, 65.41, 98.00],           // Am - F - C - G
            harm:  [[220.00, 261.63, 329.63, 440.00], [174.61, 220.00, 261.63, 349.23],
                    [130.81, 196.00, 261.63, 329.63], [196.00, 246.94, 293.66, 392.00]] },
          { roots: [65.41, 110.00, 87.31, 98.00],           // C - Am - F - G
            harm:  [[130.81, 196.00, 261.63, 329.63], [220.00, 261.63, 329.63, 440.00],
                    [174.61, 220.00, 261.63, 349.23], [196.00, 246.94, 293.66, 392.00]] },
        ];
        const low  = progLow[st.pass % progLow.length];
        const high = progHigh[st.pass % progHigh.length];

        // Bass pattern pool: octave-jump shapes applied to each bar's root
        const bassPatterns = [
          [1, 1, 2, 1, 1, 2, 1, 2],
          [1, 2, 1, 1, 2, 1, 2, 2],
          [1, 1, 2, 2, 1, 1, 2, 1],
        ];
        const bassPat = bassPatterns[this._pickVariant(st, 'bassPat', bassPatterns.length)];
        const eighth = beat / 2;
        const schedBassBar = (root, barStart) => {
          bassPat.forEach((mult, i) => {
            note(root * mult, barStart + i * eighth, eighth * 0.9, 'sawtooth', 0.12);
          });
        };

        // Melody pools — phrase format: 4 bars of { f, t, d }, t/d in beats.
        const melLowPool = [
          [ // original E-minor pentatonic theme
            [{ f: 329.63, t: 0, d: 1 }, { f: 392.00, t: 1, d: 0.5 }, { f: 440.00, t: 1.5, d: 0.5 },
             { f: 493.88, t: 2, d: 1 }, { f: 440.00, t: 3, d: 0.5 }, { f: 392.00, t: 3.5, d: 0.5 }],
            [{ f: 523.25, t: 0, d: 0.5 }, { f: 493.88, t: 0.5, d: 0.5 }, { f: 440.00, t: 1, d: 1 },
             { f: 329.63, t: 2, d: 1.5 }, { f: 392.00, t: 3.5, d: 0.5 }],
            [{ f: 587.33, t: 0, d: 1 }, { f: 523.25, t: 1, d: 0.5 }, { f: 493.88, t: 1.5, d: 0.5 },
             { f: 440.00, t: 2, d: 0.5 }, { f: 493.88, t: 2.5, d: 0.5 }, { f: 523.25, t: 3, d: 1 }],
            [{ f: 659.25, t: 0, d: 0.5 }, { f: 587.33, t: 0.5, d: 0.5 }, { f: 493.88, t: 1, d: 1 },
             { f: 392.00, t: 2, d: 0.5 }, { f: 440.00, t: 2.5, d: 0.5 }, { f: 329.63, t: 3, d: 1 }],
          ],
          [ // new variant — tighter circling figure
            [{ f: 493.88, t: 0, d: 1 }, { f: 440.00, t: 1, d: 0.5 }, { f: 392.00, t: 1.5, d: 0.5 },
             { f: 329.63, t: 2, d: 1 }, { f: 392.00, t: 3, d: 0.5 }, { f: 440.00, t: 3.5, d: 0.5 }],
            [{ f: 493.88, t: 0, d: 0.5 }, { f: 587.33, t: 0.5, d: 0.5 }, { f: 659.25, t: 1, d: 1.5 },
             { f: 587.33, t: 2.5, d: 0.5 }, { f: 493.88, t: 3, d: 1 }],
            [{ f: 392.00, t: 0, d: 0.5 }, { f: 440.00, t: 0.5, d: 0.5 }, { f: 493.88, t: 1, d: 1 },
             { f: 587.33, t: 2, d: 0.5 }, { f: 659.25, t: 2.5, d: 0.5 }, { f: 587.33, t: 3, d: 1 }],
            [{ f: 493.88, t: 0, d: 1 }, { f: 392.00, t: 1, d: 0.5 }, { f: 440.00, t: 1.5, d: 0.5 },
             { f: 329.63, t: 2, d: 2 }],
          ],
        ];
        const melHighPool = [
          [ // original urgent high answer
            [{ f: 880.00, t: 0, d: 0.5 }, { f: 783.99, t: 0.5, d: 0.5 }, { f: 659.25, t: 1, d: 0.5 },
             { f: 783.99, t: 1.5, d: 0.5 }, { f: 880.00, t: 2, d: 0.5 }, { f: 987.77, t: 2.5, d: 0.5 },
             { f: 880.00, t: 3, d: 1 }],
            [{ f: 523.25, t: 0, d: 0.5 }, { f: 587.33, t: 0.5, d: 0.5 }, { f: 659.25, t: 1, d: 1 },
             { f: 783.99, t: 2, d: 0.5 }, { f: 880.00, t: 2.5, d: 1.5 }],
            [{ f: 1046.50, t: 0, d: 0.5 }, { f: 987.77, t: 0.5, d: 0.5 }, { f: 880.00, t: 1, d: 0.5 },
             { f: 783.99, t: 1.5, d: 0.5 }, { f: 659.25, t: 2, d: 0.5 }, { f: 523.25, t: 2.5, d: 0.5 },
             { f: 659.25, t: 3, d: 1 }],
            [{ f: 783.99, t: 0, d: 0.5 }, { f: 659.25, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 0.5 },
             { f: 493.88, t: 1.5, d: 0.5 }, { f: 440.00, t: 2, d: 0.5 }, { f: 392.00, t: 2.5, d: 0.5 },
             { f: 329.63, t: 3, d: 1 }],
          ],
          [ // new variant — wider leaps, later peak
            [{ f: 659.25, t: 0, d: 0.5 }, { f: 880.00, t: 0.5, d: 0.5 }, { f: 1046.50, t: 1, d: 1 },
             { f: 987.77, t: 2, d: 0.5 }, { f: 880.00, t: 2.5, d: 0.5 }, { f: 659.25, t: 3, d: 1 }],
            [{ f: 698.46, t: 0, d: 0.5 }, { f: 880.00, t: 0.5, d: 0.5 }, { f: 1046.50, t: 1, d: 1.5 },
             { f: 880.00, t: 2.5, d: 0.5 }, { f: 783.99, t: 3, d: 1 }],
            [{ f: 783.99, t: 0, d: 0.5 }, { f: 659.25, t: 0.5, d: 0.5 }, { f: 523.25, t: 1, d: 1 },
             { f: 659.25, t: 2, d: 0.5 }, { f: 783.99, t: 2.5, d: 0.5 }, { f: 880.00, t: 3, d: 1 }],
            [{ f: 987.77, t: 0, d: 0.5 }, { f: 783.99, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 1 },
             { f: 493.88, t: 2, d: 0.5 }, { f: 440.00, t: 2.5, d: 0.5 }, { f: 392.00, t: 3, d: 1 }],
          ],
        ];

        if (form === 'A') {
          // === Bars 1-4: low riff ===
          const melLow = melLowPool[this._pickVariant(st, 'melLow', melLowPool.length)];
          for (let b = 0; b < 4; b++) {
            const barStart = now + b * bar;
            schedBassBar(low.roots[b], barStart);
            low.harm[b].forEach((freq) => note(freq, barStart, beat * 1.5, 'square', 0.04));
            melLow[b].forEach(({ f, t, d }) => {
              if (this._chance(0.05)) return;            // occasional dropped note
              note(f, barStart + t * beat, d * beat * 0.9, 'square', 0.09);
            });
            for (let i = 0; i < 4; i++) {
              const accent = (i === 0 || i === 2);
              noiseHit(barStart + i * beat, accent ? 0.06 : 0.03, accent ? 0.15 : 0.07);
            }
            if (this._chance(0.2)) noiseHit(barStart + beat * 3.5, 0.02, 0.05); // ghost hit
          }
          // === Bars 5-8: raised-register answer ===
          const melHigh = melHighPool[this._pickVariant(st, 'melHigh', melHighPool.length)];
          for (let b = 0; b < 4; b++) {
            const barStart = now + (4 + b) * bar;
            schedBassBar(high.roots[b], barStart);
            high.harm[b].forEach((freq) => {
              note(freq, barStart,            beat * 1.5,  'square', 0.04);
              note(freq, barStart + beat * 2, beat * 0.75, 'square', 0.03);
            });
            melHigh[b].forEach(({ f, t, d }) => {
              if (this._chance(0.05)) return;
              note(f, barStart + t * beat, d * beat * 0.85, 'square', 0.09);
              if (this._chance(0.15)) note(f / 2, barStart + t * beat, d * beat * 0.85, 'square', 0.035);
            });
            for (let i = 0; i < 4; i++) {
              const accent = (i === 0 || i === 2);
              noiseHit(barStart + i * beat, accent ? 0.06 : 0.03, accent ? 0.18 : 0.09);
            }
            for (let i = 1; i < 8; i += 2) {
              noiseHit(barStart + i * eighth, 0.02, 0.05);
            }
          }
        } else {
          // === BRIDGE pass: breakdown then climb back to the climax ===
          // Bars 1-2: bass + four-on-the-floor only
          for (let b = 0; b < 2; b++) {
            const barStart = now + b * bar;
            schedBassBar(low.roots[b], barStart);
            for (let i = 0; i < 4; i++) noiseHit(barStart + i * beat, 0.05, 0.13);
          }
          // Bars 3-4: chord stabs every beat — rising tension
          for (let b = 2; b < 4; b++) {
            const barStart = now + b * bar;
            schedBassBar(low.roots[b], barStart);
            for (let i = 0; i < 4; i++) {
              noiseHit(barStart + i * beat, 0.05, 0.15);
              low.harm[b].forEach((freq) => note(freq, barStart + i * beat, beat * 0.4, 'square', 0.035));
            }
          }
          // Bars 5-8: high melody climax, octave-doubled, full hats
          const melHigh = melHighPool[this._pickVariant(st, 'melHigh', melHighPool.length)];
          for (let b = 0; b < 4; b++) {
            const barStart = now + (4 + b) * bar;
            schedBassBar(high.roots[b], barStart);
            high.harm[b].forEach((freq) => note(freq, barStart, beat * 1.5, 'square', 0.04));
            melHigh[b].forEach(({ f, t, d }) => {
              note(f, barStart + t * beat, d * beat * 0.85, 'square', 0.09);
              note(f / 2, barStart + t * beat, d * beat * 0.85, 'square', 0.04);
            });
            for (let i = 0; i < 4; i++) {
              const accent = (i === 0 || i === 2);
              noiseHit(barStart + i * beat, accent ? 0.06 : 0.03, accent ? 0.18 : 0.09);
            }
            for (let i = 1; i < 8; i += 2) noiseHit(barStart + i * eighth, 0.02, 0.06);
          }
        }

        return { nodes, loopDuration };
      },

      // ---- SERVER ROOM: dark electronic, 126 BPM, 8-bar passes -------------
      server: () => {
        const st  = this._trackState('server');
        const bpm = 126;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.005) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.1);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // Rotating progressions
        const progs = [
          [73.41, 98.00, 116.54, 110.00],   // Dm - Gm - Bb - A
          [73.41, 116.54, 98.00, 110.00],   // Dm - Bb - Gm - A
        ];
        const bassRoots = progs[st.pass % progs.length];

        // Bass pulse pattern pool (octave-jump shapes)
        const pulsePool = [
          [1, 1, 2, 1, 2, 1, 1, 2],
          [1, 2, 1, 2, 1, 1, 2, 1],
          [1, 1, 2, 1, 1, 2, 2, 1],
        ];
        const pulse = pulsePool[this._pickVariant(st, 'pulse', pulsePool.length)];
        const eighth = beat / 2;
        for (let rep = 0; rep < 2; rep++) {
          for (let b = 0; b < 4; b++) {
            const bs = now + (rep * 4 + b) * bar;
            const r  = bassRoots[b];
            pulse.forEach((mult, i) => {
              n(r * mult, bs + i * eighth, eighth * 0.85, 'sawtooth', 0.11);
            });
          }
        }

        // Quiet sine tension pad (root an octave up; B adds a fifth drone)
        for (let rep = 0; rep < 2; rep++) {
          bassRoots.forEach((r, b) => {
            const bs = now + (rep * 4 + b) * bar;
            n(r * 4, bs, bar * 0.92, 'sine', 0.04, 0.05);
            if (form === 'B') n(r * 6, bs, bar * 0.92, 'sine', 0.022, 0.1);
          });
        }

        // Electronic blips — pattern picked from a pool, with per-blip rests
        // and occasional sub-octave doubling.
        const blipPool = [
          [
            { b: 0, t: 0.5, f: 587.33 }, { b: 0, t: 2.5, f: 880.00 },
            { b: 1, t: 1.0, f: 659.25 }, { b: 1, t: 3.0, f: 783.99 },
            { b: 2, t: 0.5, f: 587.33 }, { b: 2, t: 1.5, f: 783.99 },
            { b: 2, t: 3.0, f: 659.25 },
            { b: 3, t: 2.0, f: 880.00 }, { b: 3, t: 2.5, f: 1174.66 },
            { b: 3, t: 3.0, f: 987.77 },
            { b: 4, t: 0.5, f: 659.25 }, { b: 4, t: 2.0, f: 783.99 },
            { b: 5, t: 1.0, f: 587.33 }, { b: 5, t: 3.0, f: 880.00 },
            { b: 6, t: 0.5, f: 783.99 }, { b: 6, t: 1.5, f: 659.25 },
            { b: 6, t: 2.5, f: 783.99 },
            { b: 7, t: 1.0, f: 1174.66 }, { b: 7, t: 2.0, f: 987.77 },
            { b: 7, t: 3.0, f: 880.00 },  { b: 7, t: 3.5, f: 783.99 },
          ],
          [
            { b: 0, t: 1.5, f: 698.46 }, { b: 0, t: 3.0, f: 880.00 },
            { b: 1, t: 0.5, f: 587.33 }, { b: 1, t: 2.5, f: 932.33 },
            { b: 2, t: 1.0, f: 783.99 }, { b: 2, t: 3.5, f: 698.46 },
            { b: 3, t: 0.5, f: 587.33 }, { b: 3, t: 2.0, f: 880.00 },
            { b: 4, t: 1.5, f: 1046.50 }, { b: 4, t: 3.0, f: 932.33 },
            { b: 5, t: 0.5, f: 698.46 }, { b: 5, t: 2.0, f: 587.33 },
            { b: 6, t: 1.0, f: 880.00 }, { b: 6, t: 2.5, f: 783.99 },
            { b: 6, t: 3.5, f: 932.33 },
            { b: 7, t: 0.5, f: 1174.66 }, { b: 7, t: 2.0, f: 1046.50 },
            { b: 7, t: 3.0, f: 880.00 },
          ],
          [
            { b: 0, t: 2.0, f: 587.33 },
            { b: 1, t: 0.5, f: 659.25 }, { b: 1, t: 3.0, f: 698.46 },
            { b: 2, t: 1.5, f: 587.33 },
            { b: 3, t: 0.5, f: 783.99 }, { b: 3, t: 2.5, f: 659.25 },
            { b: 4, t: 1.0, f: 587.33 }, { b: 4, t: 3.5, f: 880.00 },
            { b: 5, t: 2.0, f: 698.46 },
            { b: 6, t: 0.5, f: 932.33 }, { b: 6, t: 3.0, f: 783.99 },
            { b: 7, t: 1.0, f: 659.25 }, { b: 7, t: 2.5, f: 587.33 },
            { b: 7, t: 3.5, f: 698.46 },
          ],
        ];
        const blips = blipPool[this._pickVariant(st, 'blips', blipPool.length)];
        blips.forEach(({ b, t, f }) => {
          if (this._chance(0.1)) return;                 // dropped packet
          n(f, now + b * bar + t * beat, beat * 0.18, 'square', 0.06);
          if (this._chance(0.15)) n(f / 2, now + b * bar + t * beat, beat * 0.18, 'square', 0.025);
        });

        // B sections: slow descending tension lead over the machinery
        if (form === 'B') {
          [
            { b: 0, f: 587.33, len: 2 },                 // D5
            { b: 2, f: 523.25, len: 1 },                 // C5
            { b: 3, f: 466.16, len: 1 },                 // Bb4
            { b: 4, f: 440.00, len: 2 },                 // A4
            { b: 6, f: 392.00, len: 1 },                 // G4
            { b: 7, f: 440.00, len: 1 },                 // A4
          ].forEach(({ b, f, len }) => {
            n(f, now + b * bar, bar * len * 0.92, 'sine', 0.05, 0.4);
          });
        }

        return { nodes, loopDuration };
      },

      // ---- EXECUTIVE FLOOR: pompous slow, 68 BPM, 8-bar passes -------------
      executive: () => {
        const st  = this._trackState('executive');
        const bpm = 68;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.06) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.1);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Rotating progressions — rich sine pads with matched walking lines
        const progs = [
          { // Bb - Eb - F - Cm
            chords: [[116.54, 146.83, 174.61], [155.56, 196.00, 233.08],
                     [174.61, 220.00, 261.63], [130.81, 155.56, 196.00]],
            walks:  [
              [116.54, 130.81, 146.83, 174.61],
              [155.56, 174.61, 196.00, 174.61],
              [174.61, 196.00, 220.00, 246.94],
              [130.81, 146.83, 155.56, 130.81],
            ],
          },
          { // Eb - F - Cm - Bb
            chords: [[155.56, 196.00, 233.08], [174.61, 220.00, 261.63],
                     [130.81, 155.56, 196.00], [116.54, 146.83, 174.61]],
            walks:  [
              [155.56, 174.61, 196.00, 174.61],
              [174.61, 196.00, 220.00, 196.00],
              [130.81, 155.56, 174.61, 155.56],
              [116.54, 130.81, 146.83, 164.81],
            ],
          },
        ];
        const prog = progs[st.pass % progs.length];

        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            chord.forEach((f, ni) => {
              n(f, bs, bar, 'sine', 0.09, 0.3);
              // Occasional high shimmer doubling of the top chord tone
              if (ni === chord.length - 1 && this._chance(form === 'B' ? 0.4 : 0.15)) {
                n(f * 2, bs, bar, 'sine', 0.03, 0.4);
              }
            });
          });
        }

        // Walking bass (triangle, quarter notes)
        for (let rep = 0; rep < 2; rep++) {
          prog.walks.forEach((line, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            line.forEach((f, i) => n(f, bs + i * beat, beat * 0.85, 'triangle', 0.08, 0.03));
          });
        }

        // Stately melody — two 4-bar phrases per pass, drawn from a pool of
        // three. Phrase format: 4 bars of { f, t, d } with t/d in beats.
        const phrases = [
          [ // "the long view" (original bars 1-4)
            [{ f: 466.16, t: 0, d: 2 }, { f: 523.25, t: 2, d: 2 }],
            [{ f: 587.33, t: 0, d: 1 }, { f: 622.25, t: 1, d: 3 }],
            [{ f: 698.46, t: 0, d: 1.5 }, { f: 659.25, t: 1.5, d: 1 }, { f: 587.33, t: 2.5, d: 1.5 }],
            [{ f: 523.25, t: 0, d: 1.5 }, { f: 493.88, t: 1.5, d: 1 }, { f: 466.16, t: 2.5, d: 1.5 }],
          ],
          [ // "the corner office" (original bars 5-8)
            [{ f: 523.25, t: 0, d: 1 }, { f: 587.33, t: 1, d: 1 }, { f: 622.25, t: 2, d: 2 }],
            [{ f: 698.46, t: 0, d: 2 }, { f: 622.25, t: 2, d: 2 }],
            [{ f: 783.99, t: 0, d: 1.5 }, { f: 698.46, t: 1.5, d: 1 }, { f: 622.25, t: 2.5, d: 1.5 }],
            [{ f: 466.16, t: 0, d: 4 }],
          ],
          [ // "quarterly results" (new)
            [{ f: 587.33, t: 0, d: 2 }, { f: 622.25, t: 2, d: 1 }, { f: 698.46, t: 3, d: 1 }],
            [{ f: 783.99, t: 0, d: 1.5 }, { f: 698.46, t: 1.5, d: 1.5 }, { f: 622.25, t: 3, d: 1 }],
            [{ f: 587.33, t: 0, d: 2 }, { f: 523.25, t: 2, d: 2 }],
            [{ f: 466.16, t: 0, d: 3 }, { f: 523.25, t: 3, d: 1 }],
          ],
        ];
        const p1 = this._pickVariant(st, 'melFirst', phrases.length);
        let p2 = this._pickVariant(st, 'melSecond', phrases.length);
        if (p2 === p1) p2 = (p2 + 1) % phrases.length;
        const lift = form === 'B' ? 2 : 1;               // B: airy octave-up reprise
        const melVol = form === 'B' ? 0.05 : 0.07;
        [phrases[p1], phrases[p2]].forEach((phrase, half) => {
          phrase.forEach((barMel, ci) => {
            const bs = now + (half * 4 + ci) * bar;
            barMel.forEach(({ f, t, d }) => {
              if (this._chance(0.05)) return;
              n(f * lift, bs + t * beat, Math.max(d * beat * 0.88, beat * 0.5), 'triangle', melVol, 0.1);
            });
          });
        });

        return { nodes, loopDuration };
      },

      // ---- PARKING GARAGE: lonely lo-fi, 78 BPM, 8-bar passes --------------
      parking: () => {
        const st  = this._trackState('parking');
        const bpm = 78;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.05) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.12);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Rotating progressions — the ii-V-I-vi cycle entered at two points
        const jazz = [
          [220.00, 261.63, 329.63, 392.00],              // Am7
          [146.83, 174.61, 220.00, 261.63],              // Dm7
          [196.00, 246.94, 293.66, 349.23],              // G7
          [261.63, 329.63, 392.00, 493.88],              // Cmaj7
        ];
        const progs = [
          { roots: [110.00, 146.83, 98.00, 130.81], chords: [jazz[0], jazz[1], jazz[2], jazz[3]] },
          { roots: [146.83, 98.00, 130.81, 110.00], chords: [jazz[1], jazz[2], jazz[3], jazz[0]] },
        ];
        const prog = progs[st.pass % progs.length];

        // Sparse bass
        for (let rep = 0; rep < 2; rep++) {
          prog.roots.forEach((f, b) => {
            const bs = now + (rep * 4 + b) * bar;
            n(f, bs, beat * 1.5, 'sine', 0.09, 0.08);
            n(f * 2, bs + beat * 2.5, beat, 'sine', 0.06, 0.06);
          });
        }

        // Quiet jazz chord pads (sine, delayed entry)
        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, b) => {
            const bs = now + (rep * 4 + b) * bar;
            chord.forEach(f => n(f, bs + beat * 0.5, bar * 0.6, 'sine', 0.04, 0.15));
          });
        }

        // Lonely melody — pattern picked from a pool; every note may rest,
        // and some notes leave a faint echo 1.5 beats later (lo-fi delay).
        const melPool = [
          [
            { b: 0, t: 1.0, f: 440.00 }, { b: 0, t: 2.5, f: 523.25 },
            { b: 1, t: 3.0, f: 493.88 },
            { b: 2, t: 1.0, f: 392.00 }, { b: 2, t: 3.0, f: 440.00 },
            { b: 3, t: 1.5, f: 523.25 }, { b: 3, t: 3.5, f: 493.88 },
            { b: 4, t: 0.5, f: 440.00 }, { b: 4, t: 2.0, f: 392.00 },
            { b: 5, t: 1.0, f: 329.63 }, { b: 5, t: 3.0, f: 392.00 },
            { b: 6, t: 2.0, f: 440.00 }, { b: 6, t: 3.0, f: 493.88 },
            { b: 7, t: 1.0, f: 523.25 }, { b: 7, t: 2.5, f: 440.00 },
            { b: 7, t: 3.5, f: 392.00 },
          ],
          [
            { b: 0, t: 2.0, f: 523.25 },
            { b: 1, t: 0.5, f: 440.00 }, { b: 1, t: 2.5, f: 392.00 },
            { b: 2, t: 1.5, f: 329.63 },
            { b: 3, t: 1.0, f: 440.00 }, { b: 3, t: 3.0, f: 523.25 },
            { b: 4, t: 1.5, f: 493.88 },
            { b: 5, t: 0.5, f: 440.00 }, { b: 5, t: 2.5, f: 523.25 },
            { b: 6, t: 1.0, f: 587.33 }, { b: 6, t: 3.0, f: 523.25 },
            { b: 7, t: 2.0, f: 440.00 },
          ],
          [
            { b: 0, t: 1.0, f: 392.00 }, { b: 0, t: 3.0, f: 440.00 },
            { b: 1, t: 1.5, f: 523.25 },
            { b: 2, t: 0.5, f: 587.33 }, { b: 2, t: 2.5, f: 523.25 },
            { b: 3, t: 1.0, f: 493.88 },
            { b: 4, t: 2.0, f: 440.00 },
            { b: 5, t: 1.5, f: 392.00 }, { b: 5, t: 3.5, f: 329.63 },
            { b: 6, t: 1.5, f: 440.00 },
            { b: 7, t: 0.5, f: 523.25 }, { b: 7, t: 3.0, f: 493.88 },
          ],
        ];
        const mel = melPool[this._pickVariant(st, 'mel', melPool.length)];
        const lift = form === 'B' ? 2 : 1;               // B: an octave further away
        const melVol = form === 'B' ? 0.05 : 0.06;
        const restChance = form === 'B' ? 0.3 : 0.15;
        mel.forEach(({ b, t, f }) => {
          if (this._chance(restChance)) return;
          const start = now + b * bar + t * beat;
          n(f * lift, start, beat * 0.9, 'triangle', melVol, 0.05);
          if (this._chance(0.25)) n(f * lift, start + beat * 1.5, beat * 0.7, 'triangle', melVol * 0.4, 0.06);
        });

        return { nodes, loopDuration };
      },

      // ---- BREAK ROOM: light upbeat, 100 BPM, 8-bar passes -----------------
      break_room: () => {
        const st  = this._trackState('break_room');
        const bpm = 100;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.03) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.12);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        // Rotating progressions
        const progs = [
          { // C - G - Am - F
            chords: [[261.63, 329.63, 392.00], [196.00, 246.94, 293.66],
                     [220.00, 261.63, 329.63], [174.61, 220.00, 261.63]],
            roots:  [130.81, 98.00, 110.00, 87.31],
          },
          { // Am - F - C - G
            chords: [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63],
                     [261.63, 329.63, 392.00], [196.00, 246.94, 293.66]],
            roots:  [110.00, 87.31, 130.81, 98.00],
          },
        ];
        const prog = progs[st.pass % progs.length];
        const eighth = beat / 2;

        // Bouncy bass (triangle) — rhythm shape picked from a pool (0 = rest)
        const bassShapes = [
          [1, 0, 1.5, 0, 1, 0, 1.5, 1],
          [1, 0, 1, 1.5, 0, 1, 1.5, 0],
          [1, 1.5, 0, 1, 0, 1.5, 1, 0],
        ];
        const shape = bassShapes[this._pickVariant(st, 'bass', bassShapes.length)];
        for (let rep = 0; rep < 2; rep++) {
          prog.roots.forEach((f, b) => {
            const bs = now + (rep * 4 + b) * bar;
            shape.forEach((mult, i) => {
              if (mult > 0) n(f * mult, bs + i * eighth, eighth * 0.85, 'triangle', 0.08, 0.02);
            });
          });
        }

        // Bright chord arpeggios — index pattern from a pool; B sections
        // sparkle an extra octave up.
        const arpPatterns = [
          [0, 1, 2, 2, 1, 0, 1, 2],
          [0, 2, 1, 2, 0, 1, 2, 1],
          [2, 1, 0, 1, 2, 2, 1, 0],
        ];
        const arpPat = arpPatterns[this._pickVariant(st, 'arp', arpPatterns.length)];
        const arpLift = form === 'B' ? 4 : 2;
        const arpVol  = form === 'B' ? 0.035 : 0.05;
        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, b) => {
            const bs = now + (rep * 4 + b) * bar;
            arpPat.forEach((idx, i) => {
              if (this._chance(0.1)) return;             // skipped pluck
              n(chord[idx] * arpLift, bs + i * eighth, eighth * 0.8, 'triangle', arpVol, 0.02);
            });
          });
        }

        // Light sine melody — two 4-bar phrases per pass from a pool of three.
        // Phrase format: 4 bars of { f, t, d } with t/d in beats.
        const phrases = [
          [ // original opening
            [{ f: 784.00, t: 0, d: 1 }, { f: 880.00, t: 1, d: 0.5 }, { f: 987.77, t: 1.5, d: 2.5 }],
            [{ f: 880.00, t: 0, d: 0.5 }, { f: 783.99, t: 0.5, d: 0.5 }, { f: 698.46, t: 1, d: 3 }],
            [{ f: 880.00, t: 0, d: 1 }, { f: 987.77, t: 1, d: 0.5 }, { f: 880.00, t: 1.5, d: 0.5 }, { f: 783.99, t: 2, d: 2 }],
            [{ f: 698.46, t: 0, d: 0.5 }, { f: 784.00, t: 0.5, d: 0.5 }, { f: 880.00, t: 1, d: 3 }],
          ],
          [ // mid-register stroll (new)
            [{ f: 659.25, t: 0, d: 1 }, { f: 783.99, t: 1, d: 0.5 }, { f: 880.00, t: 1.5, d: 1.5 }, { f: 783.99, t: 3, d: 1 }],
            [{ f: 698.46, t: 0, d: 1 }, { f: 659.25, t: 1, d: 0.5 }, { f: 587.33, t: 1.5, d: 1.5 }, { f: 523.25, t: 3, d: 1 }],
            [{ f: 587.33, t: 0, d: 0.5 }, { f: 659.25, t: 0.5, d: 0.5 }, { f: 783.99, t: 1, d: 1 }, { f: 880.00, t: 2, d: 2 }],
            [{ f: 783.99, t: 0, d: 2 }, { f: 659.25, t: 2, d: 2 }],
          ],
          [ // closing cascade (original bars 7-8, extended)
            [{ f: 1046.50, t: 0, d: 0.5 }, { f: 987.77, t: 0.5, d: 0.5 }, { f: 880.00, t: 1, d: 1 }, { f: 783.99, t: 2, d: 2 }],
            [{ f: 880.00, t: 0, d: 1 }, { f: 987.77, t: 1, d: 1 }, { f: 1046.50, t: 2, d: 2 }],
            [{ f: 987.77, t: 0, d: 0.5 }, { f: 880.00, t: 0.5, d: 0.5 }, { f: 783.99, t: 1, d: 1 }, { f: 698.46, t: 2, d: 2 }],
            [{ f: 784.00, t: 0, d: 4 }],
          ],
        ];
        const p1 = this._pickVariant(st, 'melFirst', phrases.length);
        let p2 = this._pickVariant(st, 'melSecond', phrases.length);
        if (p2 === p1) p2 = (p2 + 1) % phrases.length;
        [phrases[p1], phrases[p2]].forEach((phrase, half) => {
          phrase.forEach((barMel, ci) => {
            const bs = now + (half * 4 + ci) * bar;
            barMel.forEach(({ f, t, d }) => {
              if (this._chance(0.05)) return;
              n(f, bs + t * beat, Math.max(d * beat * 0.88, beat * 0.4), 'sine', 0.055, 0.04);
              if (this._chance(0.25)) {
                n(f / 2, bs + t * beat, Math.max(d * beat * 0.88, beat * 0.4), 'sine', 0.02, 0.04);
              }
            });
          });
        });

        return { nodes, loopDuration };
      },

      // ---- CITY: golden-hour street, 92 BPM, 8-bar passes ------------------
      // Warm and open — maj7 pads, ambling bass, soft brushes on 2 & 4.
      city: () => {
        const st  = this._trackState('city');
        const bpm = 92;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.04) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.12);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        const brush = (hitTime, dur, vol) => {
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data   = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) data[s] = Math.random() * 2 - 1;
          const src  = this.ctx.createBufferSource();
          src.buffer = buffer;
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.2);
          gain.gain.setValueAtTime(v, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
          src.connect(gain);
          gain.connect(this.musicGain);
          src.start(hitTime);
          src.stop(hitTime + dur + 0.01);
          nodes.push(src);
        };

        // Rotating progressions — both diatonic C major, maj7 warmth
        const progs = [
          { // Cmaj7 - Am7 - Fmaj7 - G
            chords: [[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00],
                     [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 392.00]],
            roots:  [130.81, 110.00, 87.31, 98.00],
            walks:  [
              [130.81, 164.81, 196.00, 220.00],
              [110.00, 130.81, 164.81, 196.00],
              [87.31,  110.00, 130.81, 164.81],
              [98.00,  123.47, 146.83, 174.61],
            ],
          },
          { // Fmaj7 - G - Em7 - Am7
            chords: [[174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 392.00],
                     [164.81, 196.00, 246.94, 293.66], [220.00, 261.63, 329.63, 392.00]],
            roots:  [87.31, 98.00, 82.41, 110.00],
            walks:  [
              [87.31,  110.00, 130.81, 164.81],
              [98.00,  123.47, 146.83, 174.61],
              [82.41,  98.00,  123.47, 146.83],
              [110.00, 130.81, 164.81, 196.00],
            ],
          },
        ];
        const prog = progs[st.pass % progs.length];

        // Warm pads
        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            chord.forEach((f, ni) => {
              n(f, bs, bar * 0.95, 'sine', 0.06, beat * 0.4);
              if (ni === chord.length - 1 && this._chance(0.25)) {
                n(f * 2, bs, bar * 0.95, 'sine', 0.02, beat * 0.5);
              }
            });
          });
        }

        // Bass: ambling root-fifth-octave in A; walking quarters in B
        if (form === 'B') {
          for (let rep = 0; rep < 2; rep++) {
            prog.walks.forEach((walk, ci) => {
              const bs = now + (rep * 4 + ci) * bar;
              walk.forEach((f, i) => n(f, bs + i * beat, beat * 0.85, 'triangle', 0.08, 0.02));
            });
          }
        } else {
          for (let rep = 0; rep < 2; rep++) {
            prog.roots.forEach((r, ci) => {
              const bs = now + (rep * 4 + ci) * bar;
              n(r, bs, beat * 1.8, 'triangle', 0.08, 0.03);
              n(r * 1.498307, bs + beat * 2, beat * 0.9, 'triangle', 0.07, 0.02);
              n(r * 2, bs + beat * 3, beat * 0.9, 'triangle', 0.06, 0.02);
            });
          }
        }

        // Soft street brushes on 2 & 4
        for (let b = 0; b < 8; b++) {
          brush(now + b * bar + beat, 0.05, 0.035);
          brush(now + b * bar + beat * 3, 0.05, 0.035);
          if (form === 'B' && this._chance(0.5)) brush(now + b * bar + beat * 3.5, 0.03, 0.02);
        }

        // Lead — two 4-bar phrases per pass from a pool of three.
        // Phrase format: 4 bars of { f, t, d } with t/d in beats.
        const phrases = [
          [ // "crossing the street"
            [{ f: 392.00, t: 0, d: 1 }, { f: 440.00, t: 1, d: 1 }, { f: 523.25, t: 2, d: 2 }],
            [{ f: 659.25, t: 0, d: 1.5 }, { f: 587.33, t: 1.5, d: 0.5 }, { f: 523.25, t: 2, d: 1 }, { f: 440.00, t: 3, d: 1 }],
            [{ f: 392.00, t: 0, d: 1 }, { f: 523.25, t: 1, d: 1 }, { f: 587.33, t: 2, d: 2 }],
            [{ f: 659.25, t: 0, d: 1.5 }, { f: 587.33, t: 1.5, d: 0.5 }, { f: 493.88, t: 2, d: 2 }],
          ],
          [ // "sun on the windows"
            [{ f: 659.25, t: 0, d: 1 }, { f: 783.99, t: 1, d: 1 }, { f: 880.00, t: 2, d: 2 }],
            [{ f: 783.99, t: 0, d: 1.5 }, { f: 659.25, t: 1.5, d: 0.5 }, { f: 587.33, t: 2, d: 2 }],
            [{ f: 523.25, t: 0, d: 1 }, { f: 587.33, t: 1, d: 0.5 }, { f: 659.25, t: 1.5, d: 1.5 }, { f: 783.99, t: 3, d: 1 }],
            [{ f: 880.00, t: 0, d: 1 }, { f: 783.99, t: 1, d: 1 }, { f: 659.25, t: 2, d: 2 }],
          ],
          [ // "golden hour"
            [{ f: 523.25, t: 0, d: 2 }, { f: 587.33, t: 2, d: 1 }, { f: 659.25, t: 3, d: 1 }],
            [{ f: 783.99, t: 0, d: 2 }, { f: 880.00, t: 2, d: 2 }],
            [{ f: 783.99, t: 0, d: 1 }, { f: 659.25, t: 1, d: 1 }, { f: 587.33, t: 2, d: 1 }, { f: 523.25, t: 3, d: 1 }],
            [{ f: 440.00, t: 0, d: 1.5 }, { f: 523.25, t: 1.5, d: 0.5 }, { f: 392.00, t: 2, d: 2 }],
          ],
        ];
        const p1 = this._pickVariant(st, 'leadFirst', phrases.length);
        let p2 = this._pickVariant(st, 'leadSecond', phrases.length);
        if (p2 === p1) p2 = (p2 + 1) % phrases.length;
        const lift = form === 'B' ? 2 : 1;
        const leadVol = form === 'B' ? 0.045 : 0.055;
        [phrases[p1], phrases[p2]].forEach((phrase, half) => {
          phrase.forEach((barMel, ci) => {
            const bs = now + (half * 4 + ci) * bar;
            barMel.forEach(({ f, t, d }) => {
              if (this._chance(0.08)) return;
              n(f * lift, bs + t * beat, d * beat * 0.9, 'triangle', leadVol, 0.03);
              if (this._chance(0.2)) n(f * lift * 2, bs + t * beat, d * beat * 0.9, 'sine', leadVol * 0.4, 0.03);
            });
          });
        });

        return { nodes, loopDuration };
      },

      // ---- DINER: warm, lazy, brushed, 72 BPM swing, 8-bar passes ----------
      diner: () => {
        const st  = this._trackState('diner');
        const bpm = 72;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        // Swing: off-beat eighths land late (x.5 → x.67)
        const sw = (t) => Math.floor(t) + ((t % 1) === 0.5 ? 0.67 : (t % 1));

        const n = (freq, start, dur, type, vol, attack = 0.04) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.15);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        const brush = (hitTime, dur, vol) => {
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data   = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) data[s] = Math.random() * 2 - 1;
          const src  = this.ctx.createBufferSource();
          src.buffer = buffer;
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.25);
          gain.gain.setValueAtTime(v, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
          src.connect(gain);
          gain.connect(this.musicGain);
          src.start(hitTime);
          src.stop(hitTime + dur + 0.01);
          nodes.push(src);
        };

        // Rotating progressions — classic turnarounds
        const progs = [
          { // Cmaj7 - Am7 - Dm7 - G7
            chords: [[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00],
                     [220.00, 261.63, 293.66, 349.23], [246.94, 293.66, 349.23, 392.00]],
            roots:  [130.81, 110.00, 146.83, 98.00],
          },
          { // Fmaj7 - Em7 - Dm7 - G7
            chords: [[174.61, 220.00, 261.63, 329.63], [164.81, 196.00, 246.94, 293.66],
                     [220.00, 261.63, 293.66, 349.23], [246.94, 293.66, 349.23, 392.00]],
            roots:  [87.31, 82.41, 73.42, 98.00],
          },
        ];
        const prog = progs[st.pass % progs.length];

        // Lazy bass: root then fifth, with an occasional octave nudge
        for (let rep = 0; rep < 2; rep++) {
          prog.roots.forEach((r, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            n(r, bs, beat * 1.5, 'sine', 0.09, 0.05);
            n(r * 1.498307, bs + beat * 2, beat * 1.2, 'sine', 0.07, 0.04);
            if (this._chance(0.3)) n(r * 2, bs + beat * 3, beat * 0.8, 'sine', 0.05, 0.03);
          });
        }

        // Late-entry chord pads
        for (let rep = 0; rep < 2; rep++) {
          prog.chords.forEach((chord, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            chord.forEach(f => n(f, bs + beat * 0.5, bar * 0.65, 'sine', 0.04, 0.18));
          });
        }

        // Brushed percussion: ticks on 1 & 3, long brushes on 2 & 4,
        // swung extra brush after beat 3 sometimes.
        for (let b = 0; b < 8; b++) {
          const bs = now + b * bar;
          brush(bs, 0.03, 0.02);
          brush(bs + beat, 0.09, 0.045);
          brush(bs + beat * 2, 0.03, 0.02);
          brush(bs + beat * 3, 0.09, 0.045);
          if (this._chance(form === 'B' ? 0.6 : 0.4)) brush(bs + sw(2.5) * beat, 0.04, 0.02);
        }

        // Lazy melody — two 4-bar phrases per pass from a pool of three,
        // swung. Phrase format: 4 bars of { f, t, d } with t/d in beats.
        const phrases = [
          [ // "counter seat"
            [{ f: 261.63, t: 0, d: 1 }, { f: 329.63, t: 1.5, d: 1 }, { f: 392.00, t: 2.5, d: 1.5 }],
            [{ f: 440.00, t: 0, d: 2 }, { f: 392.00, t: 2.5, d: 1.5 }],
            [{ f: 329.63, t: 0, d: 1 }, { f: 392.00, t: 1.5, d: 0.5 }, { f: 440.00, t: 2, d: 2 }],
            [{ f: 392.00, t: 0, d: 1.5 }, { f: 329.63, t: 2, d: 1 }, { f: 293.66, t: 3, d: 1 }],
          ],
          [ // "refill, hon?"
            [{ f: 392.00, t: 0.5, d: 1 }, { f: 440.00, t: 1.5, d: 1 }, { f: 523.25, t: 2.5, d: 1.5 }],
            [{ f: 493.88, t: 0, d: 1 }, { f: 440.00, t: 1.5, d: 0.5 }, { f: 392.00, t: 2, d: 2 }],
            [{ f: 349.23, t: 0, d: 1 }, { f: 440.00, t: 1.5, d: 1 }, { f: 523.25, t: 2.5, d: 1.5 }],
            [{ f: 493.88, t: 0, d: 1 }, { f: 392.00, t: 1.5, d: 1 }, { f: 349.23, t: 2.5, d: 0.5 }, { f: 293.66, t: 3, d: 1 }],
          ],
          [ // "blue plate special" (bluesy)
            [{ f: 329.63, t: 0, d: 0.5 }, { f: 392.00, t: 0.5, d: 0.5 }, { f: 440.00, t: 1, d: 1 }, { f: 523.25, t: 2, d: 1 }, { f: 440.00, t: 3, d: 1 }],
            [{ f: 392.00, t: 0, d: 1.5 }, { f: 329.63, t: 1.5, d: 0.5 }, { f: 311.13, t: 2, d: 0.5 }, { f: 293.66, t: 2.5, d: 0.5 }, { f: 261.63, t: 3, d: 1 }],
            [{ f: 440.00, t: 0, d: 1 }, { f: 523.25, t: 1.5, d: 1 }, { f: 587.33, t: 2.5, d: 1.5 }],
            [{ f: 523.25, t: 0, d: 1 }, { f: 440.00, t: 1.5, d: 0.5 }, { f: 392.00, t: 2, d: 2 }],
          ],
        ];
        const p1 = this._pickVariant(st, 'melFirst', phrases.length);
        let p2 = this._pickVariant(st, 'melSecond', phrases.length);
        if (p2 === p1) p2 = (p2 + 1) % phrases.length;
        const lift = form === 'B' ? 2 : 1;
        const melVol = form === 'B' ? 0.045 : 0.055;
        [phrases[p1], phrases[p2]].forEach((phrase, half) => {
          phrase.forEach((barMel, ci) => {
            const bs = now + (half * 4 + ci) * bar;
            barMel.forEach(({ f, t, d }) => {
              if (this._chance(0.1)) return;             // lazy player skips notes
              n(f * lift, bs + sw(t) * beat, d * beat * 0.85, 'triangle', melVol, 0.04);
            });
          });
        });

        return { nodes, loopDuration };
      },

      // ---- RECORDS: sparse, patient, near-ambient, 58 BPM, 8-bar passes ----
      // Long two-bar chords, slow arpeggios, the occasional dust-mote note.
      records: () => {
        const st  = this._trackState('records');
        const bpm = 58;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;       // ~33 s per pass
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.3) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.12);
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.8);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.05);
          nodes.push(osc);
        };

        // Rotating progressions — one chord per two bars
        const progs = [
          { // Am(add9) - Fmaj7 - Cmaj7 - G
            chords: [[220.00, 246.94, 261.63, 329.63], [174.61, 220.00, 261.63, 329.63],
                     [130.81, 196.00, 246.94, 329.63], [196.00, 246.94, 293.66]],
            roots:  [110.00, 87.31, 65.41, 98.00],
          },
          { // Am - Em - Fmaj7 - G
            chords: [[220.00, 261.63, 329.63], [164.81, 196.00, 246.94],
                     [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66]],
            roots:  [110.00, 82.41, 87.31, 98.00],
          },
        ];
        const prog = progs[st.pass % progs.length];
        const chordDur = bar * 2;

        const arpPatterns = [[0, 1, 2, 3], [2, 1, 0, 1], [0, 2, 1, 3], [3, 2, 1, 0]];

        prog.chords.forEach((chord, ci) => {
          const cs = now + ci * chordDur;

          // Deep pad — very slow attack
          chord.forEach((f) => n(f, cs, chordDur * 0.96, 'sine', 0.06, 1.2));

          // Sub bass (+ fifth drone in B sections)
          n(prog.roots[ci], cs, chordDur * 0.9, 'sine', 0.07, 0.5);
          if (form === 'B') n(prog.roots[ci] * 3, cs, chordDur * 0.9, 'sine', 0.025, 1.0);

          // Slow arpeggio — one note per half-bar, pattern per chord
          const pat = arpPatterns[this._pickVariant(st, 'arp' + ci, arpPatterns.length)];
          const lift = form === 'B' ? 4 : 2;
          pat.forEach((idx, i) => {
            if (this._chance(0.15)) return;              // patience
            const f = chord[idx % chord.length] * lift;
            n(f, cs + i * bar * 0.5, bar * 0.45, 'triangle', 0.035, 0.3);
            if (this._chance(0.12)) n(f * 2, cs + i * bar * 0.5, bar * 0.45, 'sine', 0.015, 0.3);
          });

          // Dust mote — a single distant high note, sometimes
          if (this._chance(0.35)) {
            const f = chord[Math.floor(Math.random() * chord.length)] * 4;
            n(f, cs + Math.random() * chordDur * 0.6, beat * 1.5, 'sine', 0.02, 0.4);
          }
        });

        return { nodes, loopDuration };
      },

      // ---- FIRM BATTLE: tense, precise, metronomic menace, 122 BPM ---------
      // The opposite of the chiptune brawl: cold ticks on every beat,
      // staccato chromatic bass, clipped stabs. Optional per-encounter
      // combat variant (see encounters/index.js `music` field).
      firm_battle: () => {
        const st  = this._trackState('firm_battle');
        const bpm = 122;
        const beat = 60 / bpm;
        const bar  = beat * 4;
        const loopDuration = bar * 8;
        const now  = this.ctx.currentTime;
        const form = ['A', 'A', 'B', 'A'][st.pass % 4];
        const nodes = [];

        const n = (freq, start, dur, type, vol, attack = 0.004) => {
          const osc  = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.08);   // tight — the precision is the menace
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(v, start + attack);
          gain.gain.setValueAtTime(v, start + dur * 0.7);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(start);
          osc.stop(start + dur + 0.02);
          nodes.push(osc);
        };

        const tick = (hitTime, dur, vol) => {
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data   = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) data[s] = Math.random() * 2 - 1;
          const src  = this.ctx.createBufferSource();
          src.buffer = buffer;
          const gain = this.ctx.createGain();
          const v = this._hVol(vol, 0.06);
          gain.gain.setValueAtTime(v, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + dur);
          src.connect(gain);
          gain.connect(this.musicGain);
          src.start(hitTime);
          src.stop(hitTime + dur + 0.01);
          nodes.push(src);
        };

        // Rotating progressions — Neapolitan menace
        const progs = [
          { roots: [65.41, 65.41, 69.30, 98.00],         // Cm - Cm - Db - G
            harm:  [[261.63, 311.13, 392.00], [261.63, 311.13, 392.00],
                    [277.18, 349.23, 415.30], [246.94, 293.66, 392.00]] },
          { roots: [65.41, 87.31, 69.30, 98.00],         // Cm - Fm - Db - G
            harm:  [[261.63, 311.13, 392.00], [349.23, 415.30, 523.25],
                    [277.18, 349.23, 415.30], [246.94, 293.66, 392.00]] },
        ];
        const prog = progs[st.pass % progs.length];

        // Metronomic tick — every beat, near-identical level (B adds 16ths)
        for (let b = 0; b < 8; b++) {
          const bs = now + b * bar;
          for (let i = 0; i < 4; i++) {
            tick(bs + i * beat, 0.025, i === 0 ? 0.14 : 0.10);
          }
          if (form === 'B') {
            for (let i = 0; i < 16; i++) {
              if (i % 4 !== 0) tick(bs + i * (beat / 4), 0.012, 0.03);
            }
          }
        }

        // Staccato bass ostinato: 8ths with chromatic-neighbor shapes
        const ostPool = [
          [0, 0, 0, 1, 0, 0, 1, 0],
          [0, 0, 1, 0, 0, 1, 0, 0],
          [0, 1, 0, 0, 0, 0, 1, 1],
        ];
        const ost = ostPool[this._pickVariant(st, 'ost', ostPool.length)];
        const eighth = beat / 2;
        for (let rep = 0; rep < 2; rep++) {
          prog.roots.forEach((root, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            ost.forEach((semi, i) => {
              n(root * Math.pow(2, semi / 12), bs + i * eighth, eighth * 0.55, 'sawtooth', 0.11);
            });
          });
        }

        // Cold chord stabs on beat 1 (and beat 3 in B passes)
        for (let rep = 0; rep < 2; rep++) {
          prog.harm.forEach((chord, ci) => {
            const bs = now + (rep * 4 + ci) * bar;
            chord.forEach((f) => {
              n(f, bs, beat * 0.5, 'square', 0.035);
              if (form === 'B') n(f, bs + beat * 2, beat * 0.35, 'square', 0.03);
            });
          });
        }

        // Clipped stab melody — two 4-bar phrases per pass from a pool of
        // three. Phrase format: 4 bars of { f, t, d } with t/d in beats.
        const phrases = [
          [ // "the deposition"
            [{ f: 392.00, t: 0, d: 0.5 }, { f: 523.25, t: 2, d: 0.5 }],
            [{ f: 493.88, t: 1, d: 0.5 }, { f: 523.25, t: 1.5, d: 0.5 }, { f: 392.00, t: 3, d: 0.5 }],
            [{ f: 622.25, t: 0, d: 0.5 }, { f: 587.33, t: 2, d: 0.5 }, { f: 523.25, t: 2.5, d: 0.5 }],
            [{ f: 493.88, t: 0, d: 0.5 }, { f: 392.00, t: 2, d: 1 }],
          ],
          [ // "per our last letter"
            [{ f: 523.25, t: 1, d: 0.5 }, { f: 622.25, t: 1.5, d: 0.5 }, { f: 587.33, t: 2, d: 1 }],
            [{ f: 392.00, t: 0, d: 0.5 }, { f: 415.30, t: 2, d: 0.5 }, { f: 392.00, t: 2.5, d: 0.5 }],
            [{ f: 523.25, t: 0, d: 0.5 }, { f: 493.88, t: 0.5, d: 0.5 }, { f: 523.25, t: 1, d: 1 }, { f: 392.00, t: 3, d: 0.5 }],
            [{ f: 698.46, t: 0, d: 0.5 }, { f: 622.25, t: 0.5, d: 0.5 }, { f: 587.33, t: 1, d: 0.5 }, { f: 493.88, t: 2, d: 1 }],
          ],
          [ // "billable hours"
            [{ f: 523.25, t: 0, d: 1 }, { f: 392.00, t: 2, d: 0.5 }, { f: 415.30, t: 2.5, d: 0.5 }],
            [{ f: 493.88, t: 0, d: 1 }, { f: 587.33, t: 2, d: 0.5 }],
            [{ f: 622.25, t: 0.5, d: 0.5 }, { f: 523.25, t: 1, d: 0.5 }, { f: 415.30, t: 2, d: 0.5 }, { f: 392.00, t: 3, d: 0.5 }],
            [{ f: 493.88, t: 0, d: 0.5 }, { f: 523.25, t: 1, d: 2 }],
          ],
        ];
        const p1 = this._pickVariant(st, 'melFirst', phrases.length);
        let p2 = this._pickVariant(st, 'melSecond', phrases.length);
        if (p2 === p1) p2 = (p2 + 1) % phrases.length;
        const lift = form === 'B' ? 2 : 1;
        [phrases[p1], phrases[p2]].forEach((phrase, half) => {
          phrase.forEach((barMel, ci) => {
            const bs = now + (half * 4 + ci) * bar;
            barMel.forEach(({ f, t, d }) => {
              if (this._chance(0.06)) return;
              n(f * lift, bs + t * beat, d * beat * 0.8, 'square', 0.07);
              if (form === 'B') n(f * lift / 2, bs + t * beat, d * beat * 0.8, 'square', 0.03);
            });
          });
        });

        // Minor-9 cluster drone underneath B passes — something is wrong
        if (form === 'B') {
          n(130.81, now, bar * 8 * 0.98, 'sine', 0.03, 1.5);   // C3
          n(123.47, now, bar * 8 * 0.98, 'sine', 0.02, 2.0);   // B2 — half-step cluster
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
    if (!this.ctx) {
      this._pendingTrack = trackId;
      return;
    }
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
    // Restart the section form so the track always opens on its A section
    this._passState[trackId] = { pass: 0, lastPick: {} };

    // Short fade-in
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      this.musicVolume,
      this.ctx.currentTime + 0.5
    );

    this._scheduleLoop(trackId);
  }

  /**
   * Internal: schedules one pass of the track and sets a timer to schedule
   * the next pass slightly before the current one ends. The pass counter
   * advances each time so generators can vary sections/progressions/phrases.
   */
  _scheduleLoop(trackId) {
    // Guard: if the track changed while we were waiting, bail out
    if (this.currentTrack !== trackId) return;

    const tracks = this._getMusicTracks();
    const generator = tracks[trackId];
    if (!generator) return;

    const { nodes, loopDuration } = generator();
    this._musicNodes = nodes;
    this._trackState(trackId).pass++;   // advance the A/A/B/A form for next pass

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
