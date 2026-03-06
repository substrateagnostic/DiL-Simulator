// Master UI controller for exploration HUD elements.
// All elements are created inside #ui-overlay and use styles from hud.css.

export class UIManager {
  constructor() {
    this.overlay = document.getElementById('ui-overlay');

    // HUD root
    this.hud = null;

    // Individual HUD elements
    this.locationEl = null;
    this.questTracker = null;
    this.miniStats = null;
    this.interactPrompt = null;
    this.notificationEl = null;

    // Notification timer
    this._notifyTimeout = null;

    this._createElements();
  }

  _createElements() {
    // HUD wrapper -- pointer-events: none so it doesn't block the canvas
    this.hud = document.createElement('div');
    this.hud.className = 'exploration-hud';
    this.hud.style.display = 'none';

    // Location indicator (top-left)
    this.locationEl = document.createElement('div');
    this.locationEl.className = 'hud-location';
    this.locationEl.textContent = '';

    // Quest tracker (top-right)
    this.questTracker = document.createElement('div');
    this.questTracker.className = 'hud-quest-tracker';
    this.questTracker.style.display = 'none';

    // Mini stats (below location)
    this.miniStats = document.createElement('div');
    this.miniStats.className = 'hud-mini-stats';

    // Interaction prompt (bottom center)
    this.interactPrompt = document.createElement('div');
    this.interactPrompt.className = 'interact-prompt';
    this.interactPrompt.style.display = 'none';

    // Notification toast
    this.notificationEl = document.createElement('div');
    this.notificationEl.className = 'hud-notification';
    this.notificationEl.style.cssText = `
      position: absolute;
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'VT323', monospace;
      font-size: 22px;
      color: #fff;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px 24px;
      border-radius: 8px;
      border: 2px solid #e94560;
      pointer-events: none;
      z-index: 25;
      display: none;
      animation: promptBob 2s ease-in-out infinite;
    `;

    // Assemble
    this.hud.appendChild(this.locationEl);
    this.hud.appendChild(this.questTracker);
    this.hud.appendChild(this.miniStats);
    this.hud.appendChild(this.interactPrompt);
    this.overlay.appendChild(this.hud);
    this.overlay.appendChild(this.notificationEl);
  }

  /**
   * Show the exploration HUD.
   */
  showHUD() {
    this.hud.style.display = '';
  }

  /**
   * Hide the exploration HUD.
   */
  hideHUD() {
    this.hud.style.display = 'none';
  }

  /**
   * Show "Press E to interact" style prompt.
   * @param {string} text - Prompt text (can contain <kbd> tags)
   */
  showInteractPrompt(text = '<kbd>E</kbd> Interact') {
    this.interactPrompt.innerHTML = text;
    this.interactPrompt.style.display = '';
  }

  /**
   * Hide the interaction prompt.
   */
  hideInteractPrompt() {
    this.interactPrompt.style.display = 'none';
  }

  /**
   * Update the current location display.
   * @param {string} name - Location name to display
   */
  updateLocation(name) {
    this.locationEl.textContent = name;
  }

  /**
   * Update the quest tracker panel.
   * @param {Array} quests - Array of { title, objectives: [{ text, completed }] }
   */
  updateQuestTracker(quests) {
    if (!quests || quests.length === 0) {
      this.questTracker.style.display = 'none';
      return;
    }

    this.questTracker.innerHTML = '';
    this.questTracker.style.display = '';

    for (const quest of quests) {
      const titleEl = document.createElement('div');
      titleEl.className = 'hud-quest-title';
      titleEl.textContent = quest.title;
      this.questTracker.appendChild(titleEl);

      for (const obj of quest.objectives) {
        const objEl = document.createElement('div');
        objEl.className = 'hud-quest-objective';
        if (obj.completed) objEl.classList.add('completed');
        objEl.textContent = obj.text;
        this.questTracker.appendChild(objEl);
      }
    }
  }

  /**
   * Update the mini stat badges below the location name.
   * @param {object} stats - { hp, maxHP, mp, maxMP, level }
   */
  updateMiniStats(stats) {
    this.miniStats.innerHTML = '';

    if (!stats) return;

    // HP (Patience)
    const hpEl = document.createElement('div');
    hpEl.className = 'hud-mini-stat';
    hpEl.innerHTML = `<span class="label">PAT</span><span class="value hp">${stats.hp}/${stats.maxHP}</span>`;
    this.miniStats.appendChild(hpEl);

    // MP (Coffee)
    const mpEl = document.createElement('div');
    mpEl.className = 'hud-mini-stat';
    mpEl.innerHTML = `<span class="label">COF</span><span class="value mp">${stats.mp}/${stats.maxMP}</span>`;
    this.miniStats.appendChild(mpEl);

    // Level
    const lvEl = document.createElement('div');
    lvEl.className = 'hud-mini-stat';
    lvEl.innerHTML = `<span class="label">LV</span><span class="value">${stats.level}</span>`;
    this.miniStats.appendChild(lvEl);
  }

  /**
   * Show a notification toast that auto-hides.
   * @param {string} text - Notification text
   * @param {number} duration - Display duration in ms (default 3000)
   */
  showNotification(text, duration = 3000) {
    if (this._notifyTimeout) {
      clearTimeout(this._notifyTimeout);
    }

    this.notificationEl.textContent = text;
    this.notificationEl.style.display = '';

    this._notifyTimeout = setTimeout(() => {
      this.notificationEl.style.display = 'none';
      this._notifyTimeout = null;
    }, duration);
  }

  /**
   * Hide all HUD elements and notifications.
   */
  hideAll() {
    this.hideHUD();
    this.hideInteractPrompt();
    this.notificationEl.style.display = 'none';
    if (this._notifyTimeout) {
      clearTimeout(this._notifyTimeout);
      this._notifyTimeout = null;
    }
  }

  /**
   * Clean up all DOM elements.
   */
  destroy() {
    if (this.hud && this.hud.parentNode) {
      this.hud.parentNode.removeChild(this.hud);
    }
    if (this.notificationEl && this.notificationEl.parentNode) {
      this.notificationEl.parentNode.removeChild(this.notificationEl);
    }
  }
}
