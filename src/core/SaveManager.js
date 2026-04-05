const SAVE_KEY_PREFIX = 'trust_issues_save_';
const LEGACY_KEY = 'trust_issues_save';
const NUM_SLOTS = 3;

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
        version: 1,
      };
      localStorage.setItem(this._key(slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  load(slot = this._activeSlot) {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) {
        // Legacy migration: old single-save format → slot 1
        if (slot === 1) {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
            localStorage.setItem(this._key(1), legacy);
            localStorage.removeItem(LEGACY_KEY);
            return JSON.parse(legacy);
          }
        }
        return null;
      }
      return JSON.parse(raw);
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
