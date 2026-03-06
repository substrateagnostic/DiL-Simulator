const SAVE_KEY = 'trust_issues_save';

class SaveManagerClass {
  save(gameData) {
    try {
      const data = {
        ...gameData,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load save:', e);
      return null;
    }
  }

  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}

export const SaveManager = new SaveManagerClass();
