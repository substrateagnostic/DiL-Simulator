import { Engine } from './core/Engine.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { SaveManager } from './core/SaveManager.js';
import { EventBus } from './core/EventBus.js';
import { GameStateManager } from './core/GameStateManager.js';
import { TitleState } from './states/TitleState.js';
import { ExplorationState } from './states/ExplorationState.js';
import { PostProcessing } from './effects/PostProcessing.js';
import { updateTweens } from './utils/tween.js';

class Game {
  constructor() {
    this.stateManager = new GameStateManager();
    this.postProcessing = new PostProcessing();
    this.explorationState = null;
  }

  init() {
    // Initialize core systems
    Engine.init();
    InputManager.init();
    AudioManager.init();
    this.postProcessing.init();

    // Start with title screen
    this._showTitle();

    // Listen for quit to title (use once-style by removing previous)
    this._quitHandler = () => {
      this.stateManager.clear();
      Engine.scene.children.length = 0;
      Engine._setupLighting();
      this._showTitle();
    };
    EventBus.on('quit-to-title', this._quitHandler);

    // Initialize audio on first user interaction
    const initAudio = () => {
      AudioManager.resume();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);

    // Main game loop
    Engine.onUpdate((dt) => this._update(dt));
    Engine.start();

    console.log('%c TRUST ISSUES: A Trust Officer Simulator', 'background: #e94560; color: white; font-size: 16px; font-weight: bold; padding: 4px 8px;');
    console.log('%c "Handle their assets carefully." ', 'color: #53a8b6; font-style: italic;');
  }

  _showTitle() {
    const titleState = new TitleState(this.stateManager, (mode) => {
      this.stateManager.pop(); // Remove title
      this._startGame(mode);
    });
    this.stateManager.push(titleState);
  }

  _startGame(mode) {
    this.explorationState = new ExplorationState(this.stateManager);
    this.stateManager.push(this.explorationState);

    if (mode === 'continue') {
      const saveData = SaveManager.load();
      if (saveData) {
        this.explorationState.player.deserialize(saveData);
        // Reload the room the player was in
        this.explorationState._loadRoom(
          saveData.currentRoom,
          saveData.position.x,
          saveData.position.z
        );
        this.explorationState.syncFromPlayerState();
      }
    }
  }

  _update(dt) {
    InputManager.update();
    updateTweens(dt);
    this.stateManager.update(dt);
  }
}

// Boot
const game = new Game();
game.init();
