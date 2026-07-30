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
import { TouchControls } from './ui/TouchControls.js';
import { installErrorBoundary } from './core/ErrorBoundary.js';
import { DEV_MODE } from './utils/constants.js';

class Game {
  constructor() {
    this.stateManager = new GameStateManager();
    this.postProcessing = new PostProcessing();
    this.touchControls = new TouchControls();
    this.explorationState = null;
  }

  init() {
    // Crash net first, so anything that throws during init is caught too
    installErrorBoundary();

    // Initialize core systems
    Engine.init();
    InputManager.init();
    AudioManager.init();
    this.postProcessing.init();
    this.touchControls.init();

    // Player settings (volumes, retro filter, text speed, shake)
    import('./core/Settings.js').then(({ loadSettings }) => loadSettings());

    // Screenshot-pipeline fixtures (?dev&fixture=act5&shot=server_room&hud=0
    // or &fight=karen) boot straight into a deterministic game state.
    const params = new URLSearchParams(window.location.search);
    if (DEV_MODE && (params.has('fixture') || params.has('shot') || params.has('fight') || params.has('portrait'))) {
      this._startFixture(params);
    } else {
      // Start with title screen
      this._showTitle();
    }

    // Listen for quit to title (use once-style by removing previous)
    this._quitHandler = () => {
      this.stateManager.clear();
      Engine.scene.children.length = 0;
      Engine._setupLighting();
      this._showTitle();
    };
    EventBus.on('quit-to-title', this._quitHandler);

    // Initialize audio on first user interaction.
    //
    // The listeners are removed FIRST so a fast second key press cannot re-enter
    // this, and the only work left in the handler is resume() — measured at 0ms
    // once the context already exists. The expensive part (`new AudioContext()`,
    // 385ms synchronous device open) is pulled forward into warmUp() below, so
    // the player's first key press no longer freezes the game for a third of a
    // second. Long Animation Frames attributed a 398ms blocking frame to this
    // handler on every run in the perf baseline.
    const initAudio = () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
      AudioManager.resume();
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
    window.addEventListener('touchstart', initAudio);

    // Open the audio device while the title screen is still settling, where a
    // stall is invisible — never on the first input. requestIdleCallback waits
    // for a genuinely idle main thread; the timeout stops it being starved
    // forever by the render loop, and setTimeout covers Safari.
    const warmAudio = () => AudioManager.warmUp();
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warmAudio, { timeout: 1500 });
    else setTimeout(warmAudio, 600);

    // Main game loop
    Engine.onUpdate((dt) => this._update(dt));
    Engine.start();

    console.log('%c TRUST ISSUES: A Trust Officer Simulator', 'background: #e94560; color: white; font-size: 16px; font-weight: bold; padding: 4px 8px;');
    console.log('%c "Handle their assets carefully." ', 'color: #53a8b6; font-style: italic;');
  }

  _showTitle() {
    const titleState = new TitleState(this.stateManager, (mode, slot) => {
      this.stateManager.pop(); // Remove title
      this._startGame(mode, slot);
    });
    this.stateManager.push(titleState);
  }

  // Deterministic boot for tools/shoot.mjs. Dev-only; never reachable in
  // normal play (DEV_MODE gate). Uses save slot 3 as scratch space.
  async _startFixture(params) {
    const { DEV_PRESETS } = await import('./ui/DevPanel.js');
    SaveManager.setActiveSlot(3);
    this.explorationState = new ExplorationState(this.stateManager);
    this.stateManager.push(this.explorationState);
    const ex = this.explorationState;

    const fixtureKey = params.get('fixture');
    const preset = DEV_PRESETS.find(p => p.key === fixtureKey);
    if (preset) {
      Object.assign(ex.player.flags, preset.flags);
      if (fixtureKey === 'act7') ex.player.gainXP(5000); // arrive at a sane level
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
    }

    const shot = params.get('shot');
    if (shot) {
      ex._loadRoom(shot);
      ex._updateLocationDisplay(shot);
    }
    if (params.get('hud') === '0' && ex.hudElement) {
      ex.hudElement.style.display = 'none';
    }
    const fight = params.get('fight');
    if (fight) {
      setTimeout(() => ex._startCombat(fight), 700);
    }

    // Portrait mode (?dev&portrait=andrew) — a combat-framed close-up of a
    // single character with no combat engine, so the shoot suite can VERIFY the
    // player (Andrew) at the real combat camera (addendum: "Andrew is
    // unverifiable — add a player-side combat close-up; no character pass
    // without it"). Renders one CharacterBuilder build on the combat stage,
    // holding an 'angry' beat so the face emotes.
    const portrait = params.get('portrait');
    if (portrait) {
      const [{ CombatScene }] = await Promise.all([import('./combat/CombatScene.js')]);
      const scene = new CombatScene();
      scene.setCombatants([portrait], [], ex.player);
      let held = false;
      const portraitState = {
        enter() {}, exit() {}, pause() {}, resume() {},
        update(dt) {
          scene.update(dt);
          const e = scene.enemyGroups[0];
          if (e && e.animator && !held && scene._introT >= 1) {
            e.animator.setExpression('angry');   // prove the six-expression set on camera
            held = true;
          }
          Engine.renderScene(scene.scene, scene.camera);
          Engine.skipDefaultRender();
        },
      };
      this.stateManager.push(portraitState);
    }

    // Ready signal for the shoot harness (after the scene settles)
    setTimeout(() => { window.__shotReady = true; }, (fight || portrait) ? 3500 : 1200);
  }

  _startGame(mode, slot = 1) {
    SaveManager.setActiveSlot(slot);

    this.explorationState = new ExplorationState(this.stateManager);
    this.stateManager.push(this.explorationState);

    if (mode === 'continue') {
      const saveData = SaveManager.load(slot);
      if (saveData) {
        this.explorationState.player.deserialize(saveData);
        // Reload the room the player was in
        const position = saveData.position || this.explorationState.player.position;
        this.explorationState._loadRoom(
          saveData.currentRoom || this.explorationState.player.currentRoom,
          position.x,
          position.z
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
