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
import { updateStageDirectors } from './world/StageDirector.js';
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
    if (DEV_MODE && (params.has('fixture') || params.has('shot') || params.has('fight')
      || params.has('portrait') || params.has('arcade'))) {
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
    // ?fxevery=N / ?fxhousing=x,y,z -- CEILING-HARDWARE A/B for the shot room.
    // These write the two per-room `fx` keys Engine.applyRoomFX already reads
    // (see cubicle_farm in rooms/index.js) into the ROOM DATA, before the room
    // is built. The capture therefore goes through the shipping fixture path
    // with nothing patched in the scene graph afterwards -- which is the whole
    // point: an overlay applied to a built room is a picture of the overlay,
    // not of the option. Dev-only, and only ever touches the shot room.
    // The gate is a PREFIX test, not a list. An explicit list of six keys
    // silently dropped every override on any URL that happened to carry only
    // the key missing from it (`?fxpool=` alone did nothing, and the A/B
    // reported two different options as identical).
    if (shot && [...params.keys()].some(k => k.startsWith('fx'))) {
      const { ROOMS } = await import('./data/rooms/index.js');
      const room = ROOMS[shot];
      if (room) {
        room.fx = { ...(room.fx || {}) };
        if (params.has('fxevery')) room.fx.fixtureEvery = Number(params.get('fxevery'));
        if (params.has('fxperrow')) room.fx.perRow = Number(params.get('fxperrow'));
        if (params.has('fxpool')) {
          const [pw, pd] = String(params.get('fxpool')).split(',').map(Number);
          if (Number.isFinite(pw)) room.fx.poolW = pw;
          if (Number.isFinite(pd)) room.fx.poolD = pd;
        }
        // ?fxextra=off drops the room's hand-placed fixtures; ?fxextra=W,D
        // resizes their floor pools; ?fxextraadd=x,z,len,poolW,poolD appends
        // one. All three are things a room's own `fx` block can already say --
        // exercised here so an A/B needs no source edit per option, and so a
        // rig that has been REPLACED stays reproducible from a URL after the
        // room data moved on (which is what a before/after pair needs to remain
        // honest once the after has shipped).
        const ex2 = params.get('fxextra');
        if (ex2 === 'off') room.fx.extra = [];
        else if (ex2) {
          const [pw, pd] = String(ex2).split(',').map(Number);
          if (Number.isFinite(pw) && Number.isFinite(pd)) {
            room.fx.extra = (room.fx.extra || []).map(e => ({ ...e, poolW: pw, poolD: pd }));
          }
        }
        const add = params.get('fxextraadd');
        if (add) {
          const [x, z, len, pw, pd] = String(add).split(',').map(Number);
          if ([x, z, len].every(Number.isFinite)) {
            room.fx.extra = [...(room.fx.extra || []), {
              x, z, len, tint: 0xccdcf0, pool: 0x9fc4e6, opacity: 0.32,
              poolW: Number.isFinite(pw) ? pw : 5.0, poolD: Number.isFinite(pd) ? pd : 5.2,
            }];
          }
        }
        if (params.has('fxhousing')) {
          const v = String(params.get('fxhousing')).split(',').map(Number);
          room.fx.housingScale = v.length === 3 && v.every(Number.isFinite) ? v : null;
        }
      }
    }
    if (shot) {
      ex._loadRoom(shot);
      ex._updateLocationDisplay(shot);
    }
    if (params.get('hud') === '0' && ex.hudElement) {
      ex.hudElement.style.display = 'none';
    }

    // ?qtier=high|medium|low — PIN the quality tier for a capture.
    //
    // The adaptive governor (Engine._updateAdaptiveQuality) is on by default and
    // moves on measured frame time, which is correct for players and wrong for a
    // harness: Playwright's video recorder costs 40-60ms/frame on its own, so a
    // long take demotes itself to 'low' MID-CAPTURE. At 'low' the city backdrop
    // and the room-FX light-pool group are set `visible = false` and AO, bloom,
    // tilt-shift and shadows all go off — i.e. the capture stops being a picture
    // of the shipping game and becomes a picture of the mobile floor. That is
    // exactly how a two-minute board-meeting video was delivered to the producer
    // starting on the display-case look and ending on a black void.
    // setQualityTier() with no `adaptive` flag also switches the governor off, so
    // this pin holds for the whole take.
    const qtier = params.get('qtier');
    if (qtier) Engine.setQualityTier(qtier);
    const fight = params.get('fight');
    if (fight) {
      setTimeout(() => ex._startCombat(fight), 700);
    }

    // ?dev&arcade=1 — boot straight into SPRINT REVIEW through the REAL
    // launch path (the `launch_arcade` flag-set listener in
    // ExplorationState), so the playtest harness exercises the shipping
    // call chain rather than a convenience constructor.
    if (params.get('arcade')) {
      setTimeout(() => ex.player.setFlag('launch_arcade', true), 500);
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
    // Cutscene staging runs OUTSIDE the state stack, beside the tweens.
    // GameStateManager ticks only the top state, so a StageDirector driven
    // from ExplorationState.update() would be frozen for the entire dialog it
    // exists to stage. See src/world/StageDirector.js.
    updateStageDirectors(dt);
    this.stateManager.update(dt);
  }
}

// Boot
const game = new Game();
game.init();
