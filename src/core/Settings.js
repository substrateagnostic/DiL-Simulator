import { AudioManager } from './AudioManager.js';
import { Engine } from './Engine.js';

// Player-facing settings, persisted to localStorage. apply() pushes
// values into the systems that consume them; modules that need a live
// read (DialogBox text speed, CombatScene shake) import SETTINGS.

const KEY = 'trust_issues_settings';

export const SETTINGS = {
  musicVol: 0.3,
  sfxVol: 0.5,
  retro: true,       // PS1 dither/grain pass (off = also reduces flicker)
  shake: true,       // combat screen shake
  textSpeed: 1.0,    // multiplier: 1.5 slow, 1.0 normal, 0.5 fast
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(SETTINGS, JSON.parse(raw));
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
}
