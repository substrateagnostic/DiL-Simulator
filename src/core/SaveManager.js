const SAVE_KEY_PREFIX = 'trust_issues_save_';
const LEGACY_KEY = 'trust_issues_save';
const NUM_SLOTS = 3;

// Current on-disk save format. Bump this ONLY together with a migration step.
export const SAVE_VERSION = 1;

// Forward migrations, keyed by the version you are migrating FROM. Each step
// mutates (or returns) the save object and moves it exactly one version up;
// load() runs them in order until the save reaches SAVE_VERSION.
//
// Adding a v2 (worked example — do not delete this note):
//   1. export const SAVE_VERSION = 2;
//   2. add `1: (d) => { d.stats.grit = d.stats.grit ?? 0; return d; },`
//   3. leave the 0 step alone — old saves must still climb the whole ladder.
//
// Rules: steps must be pure-ish, total (never throw on a partial save), and
// idempotent-safe. Never delete player data in a migration — unknown fields
// ride along untouched, which is what makes a downgrade survivable.
const MIGRATIONS = {
  // Pre-versioned saves (shipped before `version` was written) are structurally
  // identical to v1 — Player.deserialize() already defaults every field — so
  // this step only stamps the version.
  0: (data) => data,
};

class SaveManagerClass {
  constructor() {
    this._activeSlot = 1;
  }

  setActiveSlot(slot) {
    this._activeSlot = slot;
  }

  getActiveSlot() {
    return this._activeSlot;
  }

  _key(slot) {
    return `${SAVE_KEY_PREFIX}${slot}`;
  }

  save(gameData, slot = this._activeSlot) {
    try {
      const data = {
        ...gameData,
        timestamp: Date.now(),
        version: SAVE_VERSION,
      };
      localStorage.setItem(this._key(slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  /**
   * Bring a parsed save up to SAVE_VERSION. Never throws and never discards a
   * save: an unmigratable or future-version save is handed back as-is so the
   * player still gets their playthrough (Player.deserialize defaults anything
   * missing) rather than a wiped slot.
   */
  migrate(data) {
    if (!data || typeof data !== 'object') return data;

    let version = Number.isFinite(data.version) ? data.version : 0;

    // Save written by a NEWER build (player rolled back / opened an older
    // deploy). Load it optimistically — do not rewrite, do not delete.
    if (version > SAVE_VERSION) {
      console.warn(`Save is from a newer version (v${version} > v${SAVE_VERSION}); loading as-is.`);
      return data;
    }

    while (version < SAVE_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) {
        console.warn(`No save migration from v${version}; loading as-is.`);
        return data;
      }
      try {
        data = step(data) || data;
      } catch (e) {
        console.error(`Save migration v${version} → v${version + 1} failed; loading as-is.`, e);
        return data;
      }
      version += 1;
      data.version = version;
    }
    // Not written back here on purpose — the next autosave persists the new
    // version, so a failed session can't corrupt a slot on mere inspection.
    return data;
  }

  load(slot = this._activeSlot) {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) {
        // Legacy key migration: old single-save format → slot 1
        if (slot === 1) {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
            localStorage.setItem(this._key(1), legacy);
            localStorage.removeItem(LEGACY_KEY);
            return this.migrate(JSON.parse(legacy));
          }
        }
        return null;
      }
      return this.migrate(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load save:', e);
      return null;
    }
  }

  hasSave(slot) {
    if (slot === undefined) {
      for (let i = 1; i <= NUM_SLOTS; i++) {
        if (this.hasSave(i)) return true;
      }
      return false;
    }
    const hasNew = localStorage.getItem(this._key(slot)) !== null;
    if (!hasNew && slot === 1) {
      return localStorage.getItem(LEGACY_KEY) !== null;
    }
    return hasNew;
  }

  deleteSave(slot) {
    localStorage.removeItem(this._key(slot));
  }

  getSaveInfo(slot) {
    try {
      let raw = localStorage.getItem(this._key(slot));
      if (!raw && slot === 1) raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        level: parsed.stats?.level ?? 1,
        currentRoom: parsed.currentRoom ?? 'cubicle_farm',
        timestamp: parsed.timestamp ?? 0,
        version: Number.isFinite(parsed.version) ? parsed.version : 0,
      };
    } catch {
      return null;
    }
  }

  getSlotCount() {
    return NUM_SLOTS;
  }
}

export const SaveManager = new SaveManagerClass();
