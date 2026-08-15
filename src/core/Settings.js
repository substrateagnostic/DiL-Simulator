import { AudioManager } from './AudioManager.js';
import { Engine } from './Engine.js';

// Player-facing settings, persisted to localStorage. apply() pushes
// values into the systems that consume them; modules that need a live
// read (DialogBox text speed, CombatScene shake) import SETTINGS.

const KEY = 'trust_issues_settings';

export const SETTINGS = {
  _v: 2,             // settings schema version (migrations in loadSettings)
  musicVol: 0.3,
  sfxVol: 0.5,
  retro: false,      // '1998 MODE' — PS1 dither/grain pass, opt-in cosmetic
                     // since the Display Case rebuild (on = also more flicker)
  shake: true,       // combat screen shake
  textSpeed: 1.0,    // multiplier: 1.5 slow, 1.0 normal, 0.5 fast
  // B9 — FLUORESCENT FLICKER. Four rooms carry `lighting.flicker` and the
  // buzz-dip (x0.72, p 0.0015/frame, so about once every 11 seconds at 60 fps)
  // is AUTHORED subliminal dread, not a bug: an earlier perf round halved the
  // amplitude and QA correctly rejected that as an unsigned look change, and
  // that ruling stands — the default here is ON and the shipped look is
  // untouched for every player who does not go looking.
  // What was missing is that the playtester read it as a defect and had no way
  // to answer that. This is the answer, and it is additive: a switch, not a
  // re-tune. It also does real accessibility work — a repeating luminance dip
  // is exactly the thing photosensitive players need to be able to turn off.
  flicker: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // v2 migration: 1998 MODE (retro) became opt-in. Pre-v2 saves
      // carried retro:true as the old *default*, not a player choice —
      // reset it once. Toggling it back on persists as v2 and sticks.
      if (!saved._v || saved._v < 2) saved.retro = false;
      Object.assign(SETTINGS, saved, { _v: 2 });
    }
  } catch (e) { /* fresh defaults */ }
  applySettings();
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) { /* private mode */ }
}

export function applySettings() {
  AudioManager.setMusicVolume(SETTINGS.musicVol);
  AudioManager.setSfxVolume(SETTINGS.sfxVol);
  Engine.setRetroPass(SETTINGS.retro);
  Engine.setFlickerEnabled(SETTINGS.flicker !== false);
}
