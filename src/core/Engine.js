import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TiltShiftPass } from '../effects/TiltShiftPass.js';
import { createVoidBackdrop, createDayBackdrop, DAY_SKY_KEYS, RECOMMENDED_FOG } from '../effects/VoidBackdrop.js';
import { installFastTransparency } from '../effects/N8AOFastTransparency.js';
import { Furniture } from '../world/Furniture.js';
import { batchStatics } from '../world/Room.js';
// Default interior light colors — Severance clinical white-green.
// Deliberately COOLER than COLORS.FLUORESCENT (warm cream): the wall and
// floor materials are warm beige, and cool light over warm surfaces
// lands on clinical white instead of khaki. Room `lighting` blocks still
// override both per room.
const ENGINE_FLUORESCENT = 0xf1f7ef;
const ENGINE_AMBIENT = 0xe9f1ec;


// ── Composer pixel-ratio cap ─────────────────────────────────────────────
// The whole post chain is fill-rate work, so its cost scales with the square
// of this number. Measured on an RTX 4050, cubicle_farm, GPU timer query:
// the frame cost 15.0ms at a 1920x1080 drawing buffer and 23.5ms at
// 3840x2160 — i.e. a HiDPI laptop pays ~57% more for pixels no one can
// resolve at arm's length on a 14" panel. 1.5 keeps the supersampling that
// makes the lacquered-miniature edges read while cutting a devicePixelRatio-2
// buffer to 56% of its pixels.
// This is the cheapest single lever for the "60fps mid laptop" budget, and it
// is a one-number revert if Alex wants the extra sharpness back.
const MAX_PIXEL_RATIO = 1.5;
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

class EngineClass {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.running = false;
    this._updateCallback = null;
    this._lastFrameTime = 0;
    // Post-stack switches (may be poked before init() — e.g. Settings
    // boot applies the 1998-mode preference before the canvas exists)
    this._retroOn = false;      // 1998 MODE — cosmetic, opt-in
    this._tiltShiftOn = true;   // display-case miniature blur
    this._aoOn = true;          // n8ao ambient occlusion
    // Shadow-map cadence (see init()). 1 = three's default every-frame
    // behaviour, 2 = 30Hz, 0 = only when invalidateShadows() is called.
    this._shadowInterval = 2;
    this._shadowFrames = 0;
    this._shadowDirty = true;
    // The single in-flight requestAnimationFrame handle. `null` means "no loop
    // is scheduled" and is what start() checks so two loops can never stack.
    this._raf = null;
    // 'high' | 'medium' | 'low' — see setQualityTier() and the governor below.
    this.qualityTier = 'high';
    // ── Adaptive quality governor state (see _updateAdaptiveQuality) ────────
    // ON by default. On hardware that holds 60fps it never fires and the tier
    // stays 'high' forever; on hardware that cannot, it walks COMP_CARD's
    // degrade ladder down until the frame fits. Any explicit setQualityTier()
    // call from a settings menu turns it off (the player's choice wins).
    this._adaptiveQuality = true;
    this._qWin = new Float64Array(30);   // rolling frame-time window, ms
    this._qWinI = 0;
    this._qFilled = 0;
    this._qCooldown = 0;                 // frames to wait before the next move
    this._qUpHold = 5;                   // consecutive good windows needed to step UP
    this._qUpGood = 0;
    this._qDownBad = 0;
    this._qCeil = 0;        // lowest tier index we may probe UP to (0 = 'high')
    this._qLastUpAt = 0;    // when the last promotion happened, for failed-probe detection
    this._qScratch = new Float64Array(30);
  }

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Dev-only inspection hook (screenshot harness / live tuning).
    // Same gate as DEV_MODE; no reference is exposed in normal play.
    try {
      if (new URLSearchParams(window.location.search).has('dev')) {
        window.__engine = this;
      }
    } catch (e) { /* non-browser context */ }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      // NO MSAA. antialias:true allocates a multisampled DEFAULT framebuffer,
      // and the scene is never rendered into it — every frame goes through the
      // EffectComposer, which owns its own (non-multisampled) render targets
      // and only blits a full-screen quad to the screen at the end. A quad has
      // no geometry edges to antialias, so the MSAA buffer was pure allocated
      // memory + resolve bandwidth for zero pixels of benefit.
      antialias: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(pixelRatio());
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Manual shadow-map cadence. three re-renders the ENTIRE shadow map on
    // every renderer.render() by default: for the one static light in this
    // game (dirLight, below — it never moves, and neither does any furniture)
    // that redraws every caster in the room a second time, every frame.
    // Measured on cubicle_farm: 688 of 2008 draw calls and ~4.7ms per frame.
    // So we take control — the map refreshes when invalidateShadows() says the
    // caster set changed (room build, room lighting, NPC show/hide), and
    // otherwise every _shadowInterval-th frame so the casters that DO move
    // (the player, wandering NPCs, combat actors) never freeze mid-stride.
    // radius-4 PCF soft edges hide the lower cadence; a frozen map would not
    // hide a ghost silhouette left behind by a walking character.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    // GradePass owns the chain's OUTPUT TRANSFORM (ACES + linear->sRGB).
    // Renderer-side tone mapping stays OFF: three only applies it on
    // direct-to-screen renders (three.module: toneMapping gated on
    // currentRenderTarget === null), never into the composer's targets —
    // so ACES here could only ever double-transform a stray raw render
    // and inject collision-prone tone-mapping GLSL into screen-pass
    // materials. Every render routes through renderScene(); the composer
    // is the single path to the screen.
    this.renderer.toneMapping = THREE.NoToneMapping;

    // Scene — the void around rooms is a deep obsidian blueprint dream
    // (VoidBackdrop.js — Display Case v2)
    this.scene = new THREE.Scene();
    this.scene.background = createVoidBackdrop();
    // Distance fog fades the city backdrop without touching the room
    // (rooms sit ~20-35 units from camera; buildings 40-80).
    // RECOMMENDED_FOG is the boot value; CityBackdrop.setTimeOfDay()
    // retints fog.color per palette at runtime.
    this.scene.fog = new THREE.Fog(RECOMMENDED_FOG.color, RECOMMENDED_FOG.near, RECOMMENDED_FOG.far);

    // Orthographic camera for isometric view (zoom adapts to viewport —
    // phones in portrait need a wider world view, landscape phones a
    // tighter one, or rooms render postage-stamp sized)
    const aspect = this.width / this.height;
    const zoom = this._zoomForViewport();
    this.camera = new THREE.OrthographicCamera(
      -zoom * aspect, zoom * aspect,
      zoom, -zoom,
      0.1, 1000
    );

    this._lastFrameTime = 0;

    // Post-processing chain (the Display Case stack), in order:
    //   [AO | RenderPass] -> bloom -> tilt-shift -> grade -> retro(1998)
    // The render pass scene/camera are swapped per frame so combat's own
    // scene gets the same treatment via renderScene(). Pass enables are
    // re-gated every render in _configurePostFor().
    const pr = pixelRatio();
    this._renderPass = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pr);
    this.composer.addPass(this._renderPass);
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.46,   // strength — subtle (raised with the sRGB fix: saturated
              // seams/LEDs now carry correct, lower luminance)
      0.5,    // radius
      0.8     // threshold — only emissive/bright pixels bloom
    );
    this.composer.addPass(this._bloomPass);

    // The display-case signature: tilt-shift miniature blur, WITH the filmic
    // grade + output transform folded into its vertical step (grade: true).
    // That fold is what brings the chain inside COMP_CARD's ≤4 full-screen
    // pass budget: physically it was N8AO + bloom + tilt-H + tilt-V + grade =
    // 5 rasterizations of the full frame; it is now 4. Same arithmetic, one
    // fewer round trip through a half-float render target. See TiltShiftPass.
    //
    // The blur is ortho-only (exploration/title) — but this pass now carries
    // the output transform, so it must stay ENABLED every frame and the blur
    // is gated by `blurEnabled` in _configurePostFor(). Combat's perspective
    // camera therefore takes a single grade-only draw.
    this._tiltShiftPass = new TiltShiftPass(this.width * pr, this.height * pr, {
      focusCenter: 0.5,
      bandWidth: 0.26,
      maxBlur: 9.5,
      strength: 1.0,
      grade: true,
      gradeKey: this._pendingGradeKey || 'afternoon',
    });
    this._pendingGradeKey = null;
    this.composer.addPass(this._tiltShiftPass);
    // Everything that used to talk to the standalone GradePass keeps working:
    // setGrade() is API-compatible. (GradePass itself is still exported and
    // still owns the GRADES table + the grade GLSL this pass inlines.)
    this._gradePass = this._tiltShiftPass;

    // 1998 MODE: Bayer dither + 6-bit quantize + grain. A preserved
    // cosmetic now, not the default finish — strength 0 unless the
    // settings toggle turns it on. (Lazy import keeps boot lean; it is
    // appended after grade, which is its correct slot.)
    import('../effects/RetroPass.js').then(({ createRetroPass }) => {
      this._retroPass = createRetroPass();
      this._retroPass.uniforms.strength.value = this._retroOn ? 1 : 0;
      // Disabled entirely when off — saves the full-screen draw; the
      // composer auto-promotes the grade pass to renderToScreen.
      this._retroPass.enabled = this._retroOn;
      this.composer.addPass(this._retroPass);
    });

    // Ambient occlusion (n8ao) — the 'clay vs miniature' fix: soft
    // contact darkening grounds furniture and characters in the rooms.
    // CONSTRAINT: N8AOPass bakes scene+camera refs at construction and
    // replaces the RenderPass (it renders the scene itself), but
    // renderScene() swaps arbitrary scene/camera pairs through this same
    // composer (combat, arcade). AO is therefore enabled ONLY when the
    // frame renders exactly Engine.scene through Engine.camera — every
    // other pair falls back to the plain RenderPass. See _configurePostFor.
    import('n8ao').then(({ N8AOPass }) => {
      const pass = new N8AOPass(this.scene, this.camera, this.width * pr, this.height * pr);
      const c = pass.configuration;
      c.gammaCorrection = false;   // passes follow this one in the chain
      c.aoRadius = 1.5;            // wide enough to pool under furniture
      c.distanceFalloff = 1.0;     // (wall-floor seams, furniture feet)
      // LOOK KNOB — DO NOT MOVE INSIDE A PERF PATCH. Round 1 of this pass
      // lowered it to 3.5 (AO is applied as pow(ao, intensity), so the exponent
      // amplifies the 8-sample half-res buffer's noise as hard as it amplifies
      // the effect). QA correctly rejected that as an unsigned look change: it
      // is a visible lightening of the deepest contact cores and only the art
      // owner can sign it. Measured cost of KEEPING 7.5, cubicle_farm, RTX 4050:
      // 0.00ms — `intensity` is a shader exponent, it is free. So the committed
      // value stands, and the AO-look question is decoupled from this patch.
      // (Round-1 measurement kept for whoever picks the look question up:
      // AO's total visible footprint is 6.79% of the frame; 7.5 -> 5.0 moves
      // 0.01% of pixels, 7.5 -> 3.5 moves 0.54%, 7.5 -> 2.5 moves 2.37%.)
      c.intensity = 7.5;           // critics read 5.0/r1.0 as "not firing"
                                   // — contact grounding must be VISIBLE
      c.aoSamples = 8;
      c.denoiseSamples = 8;
      c.denoiseRadius = 12;
      c.color = new THREE.Color(0x000000);
      c.halfRes = true;            // A/B'd vs full res: visually identical
                                   // at this subtlety, big perf win (budget:
                                   // 60fps mid laptop). Full res is the
                                   // upgrade path if AO ever gets heavier.
      // neuralDenoise stays OFF, and this is a MEASUREMENT, not an oversight:
      // n8ao 2.0.0 refuses to run it unless aoSamples === 16 AND
      // denoiseIterations === 2 AND halfRes === false (it logs
      // "neuralDenoise is enabled but cannot run: halfRes is enabled" and
      // silently falls back). Forcing that full-res 16-sample config measured
      // +0.8ms p50 and +3.3ms p95 on cubicle_farm across 3 interleaved A/B
      // pairs on an RTX 4050 — the wrong direction for a room already sitting
      // at 60fps, and COMP_CARD's degrade ladder drops AO first. Revisit only
      // if the AO pass gets cheaper elsewhere.
      // accumulate stays OFF by design: it self-disables the moment the camera
      // moves, so on a follow camera it would make the game clean while still
      // and noisy while walking — the opposite of what is wanted.
      this._n8aoPass = pass;
      // Same pixels, a third of the CPU: n8ao's transparency-aware path walks
      // the whole scene four times and re-renders it twice EVERY FRAME. See
      // N8AOFastTransparency.js for the measurement and for why turning the
      // feature off instead is a look decision, not a perf one.
      installFastTransparency(pass);
      // Slot 1: directly after (as alternative to) the RenderPass
      this.composer.insertPass(pass, 1);
    });

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    // Lighting
    this._setupLighting();

    // The city outside (lazy import avoids a cycle; fire-and-forget)
    import('../effects/CityBackdrop.js').then(({ CityBackdrop }) => {
      this.cityBackdrop = new CityBackdrop(this.scene);
      // Lazy import: a tier change can land before this resolves.
      if (this._atmosVisible === false) this.cityBackdrop.group.visible = false;
      if (this._pendingTimeOfDay) this.cityBackdrop.setTimeOfDay(this._pendingTimeOfDay);
      if (this._pendingStreetLevel !== undefined) this.cityBackdrop.setStreetLevel(this._pendingStreetLevel);
    });

    // The ghost of the building around the current room
    import('../effects/BuildingShell.js').then(({ BuildingShell }) => {
      this.buildingShell = new BuildingShell(this.scene);
      if (this._pendingShellRoom) this.buildingShell.buildFor(this._pendingShellRoom);
      if (this._pendingShellHold) this.buildingShell.setHold(true);
    });
  }

  // ── Building shell pulse ────────────────────────────────────────────────
  // The shell is an event, not a backdrop: it fades in / holds / fades out
  // on room entry (BuildingShell.buildFor fires that automatically). These
  // are for the cases that want it on demand — the elevator ride holds it
  // glowing for the duration of the trip, and a future pause-map can pin it
  // open. Safe to call before the lazy import lands.
  pulseBuildingShell() {
    this.buildingShell?.pulse();
  }

  holdBuildingShell(on) {
    this._pendingShellHold = !!on;
    this.buildingShell?.setHold(!!on);
  }

  // Story-driven time of day — drives the city backdrop palette + fog
  // and the filmic color grade (GradePass owns grades now; RetroPass's
  // grade uniform stays neutral). Room interior rigs stay authoritative
  // (applyRoomLighting).
  setTimeOfDay(key) {
    this._todKey = key;
    // B20 — the sky is part of the time of day. It never used to be: the
    // obsidian void was installed once at init and every act stood under it,
    // which is why acts 3-4 read as night no matter what the tower palette
    // said. Built lazily and cached, so a save that never leaves the night
    // acts never pays for the day canvas.
    const wantsDay = DAY_SKY_KEYS.has(key);
    if (this.scene && wantsDay !== this._daySkyOn) {
      if (wantsDay && !this._daySkyTex) this._daySkyTex = createDayBackdrop();
      if (!this._nightSkyTex) this._nightSkyTex = this.scene.background;
      this.scene.background = wantsDay ? this._daySkyTex : this._nightSkyTex;
      this._daySkyOn = wantsDay;
    }
    if (this.cityBackdrop) this.cityBackdrop.setTimeOfDay(key);
    else this._pendingTimeOfDay = key;
    if (this._gradePass) this._gradePass.setGrade(key);
    else this._pendingGradeKey = key;
  }

  // '1998 MODE' settings toggle (also reduce-flicker accessibility).
  // Off by default — the dither/grain finish is a preserved cosmetic.
  setRetroPass(on) {
    this._retroOn = !!on;
    if (this._retroPass) {
      this._retroPass.uniforms.strength.value = on ? 1 : 0;
      this._retroPass.enabled = !!on;   // skip the draw entirely when off
    }
  }

  // ── Shadow-map invalidation ──────────────────────────────────────────
  // Force a full shadow-map refresh on the next rendered frame. Call this
  // whenever the SET of shadow casters or the light rig changes, i.e. any
  // change the periodic cadence would otherwise show a stale shadow for:
  //   • room build / teardown        (RoomManager.loadRoom)
  //   • per-room light rig           (applyRoomLighting)
  //   • room FX overlay rebuild      (applyRoomFX)
  //   • NPC show/hide, furniture flag swaps, character spawn
  // At _shadowInterval = 2 the periodic refresh already catches everything
  // within one frame; these calls exist so raising the interval (or dropping
  // it to 0 for a static scene) can never strand a frozen shadow.
  invalidateShadows() {
    this._shadowDirty = true;
    if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
  }

  // 1 = refresh every frame (three's default cost), 2 = 30Hz, 3 = 20Hz,
  // 0 = only on invalidateShadows(). Exposed for a future quality tier and
  // for the perf harness's cost ladder.
  setShadowInterval(n) {
    this._shadowInterval = Math.max(0, n | 0);
    this._shadowFrames = 0;
    this.invalidateShadows();
  }

  // ── Room warm-up: compile shaders and upload textures behind the wipe ──
  //
  // A shader program that first appears mid-play is a guaranteed multi-frame
  // freeze, and three compiles lazily — the first frame that draws a new
  // material/light/defines combination pays for it. Measured on the round-1
  // patch (tools/perf-harness.mjs --mode=transition): entering `server_room`
  // for the first time took `renderer.info.programs` from 38 to 54 and produced
  // a 307ms frame, i.e. sixteen programs compiled inside the first rendered
  // frame of the room. That frame is mid-play — the wipe has already finished.
  //
  // So compile them while the wipe still covers the screen. Textures get the same
  // treatment: a CanvasTexture's first upload is a synchronous stall on the frame
  // that draws it, and `initTexture` moves it here.
  //
  // SYNCHRONOUS `compile()`, NOT `compileAsync()`, and that is a measured
  // decision, not a preference. `compileAsync` builds the programs and then polls
  // `materialProperties.currentProgram.isReady()` from its own internal
  // requestAnimationFrame loop — and in this scene at least one material comes
  // back with no `currentProgram`, so that poll throws
  // `TypeError: Cannot read properties of undefined (reading 'isReady')`
  // *inside three's own callback*, where a caller's try/catch cannot reach it.
  // Reproduced on every room: it took down the whole page (the "THE BUILDING
  // SHUDDERED" error boundary, screenshots/f4/room_*_after.png in the round-2
  // working history). The synchronous path has no such loop, and blocking here is
  // exactly what is wanted — the screen is covered by the wipe and the point is
  // to be finished before it lifts.
  //
  // Awaited by ExplorationState._changeRoom() between loadRoom() and the
  // transition-in. Never allowed to throw — a warm-up failure must degrade to
  // "compiles late", never to "the door does not open". Still declared `async` so
  // callers can await it and the implementation stays free to change.
  async warmScene(scene = this.scene, camera = this.camera) {
    if (!this.renderer || !scene || !camera) return { programs: 0, textures: 0, ms: 0 };
    const t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
    const before = this.renderer.info.programs?.length ?? 0;
    let textures = 0;
    try {
      // Upload first: compile() only needs the programs, but a texture that is
      // still on the CPU when the room's first real frame draws is the other half
      // of the same hitch.
      const seen = new Set();
      scene.traverse((o) => {
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
        if (!mats) return;
        for (const m of mats) {
          for (const k in m) {
            const v = m[k];
            // 2D only. initTexture() routes through setTexture2D, so a cube or
            // array texture would be uploaded to the wrong binding point.
            if (v && v.isTexture && !v.isCubeTexture && !v.isDataArrayTexture
              && !v.isData3DTexture && !seen.has(v)) {
              seen.add(v);
              try { this.renderer.initTexture(v); textures++; } catch { /* keep going */ }
            }
          }
        }
      });
    } catch { /* warm-up is best-effort */ }
    try {
      this.renderer.compile(scene, camera);
    } catch { /* warm-up is best-effort */ }
    const after = this.renderer.info.programs?.length ?? 0;
    const ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    this._lastWarm = { programs: after - before, textures, ms };
    // A room build is a discontinuity: the frames either side of it are not
    // comparable, and the build frame itself would demote a healthy machine.
    this.resetAdaptiveWindow();
    return this._lastWarm;
  }

  // A/B switch for the N8AO transparency fast path (see
  // effects/N8AOFastTransparency.js). Off = n8ao's stock implementation, which
  // draws the same pixels for ~16ms more per frame at the CPU-4x proxy. Exposed
  // so the harness can price it, and so a bug there can be bisected in one line.
  setFastTransparency(on) {
    if (typeof window !== 'undefined') window.__n8aoFast = !!on;
  }

  // Degrade/settings switches for the display-case stack
  setAmbientOcclusion(on) {
    this._aoOn = !!on;
  }

  setTiltShift(on) {
    this._tiltShiftOn = !!on;
  }

  // ── Quality tiers — COMP_CARD's degrade ladder, as a shipped feature ──
  //
  // COMP_CARD sets two frame budgets ("60fps on mid-range laptop WebGL2, 30fps
  // floor on recent mobile") AND the order to give things up in to meet them:
  // "Degrade gracefully: AO off → tilt-shift half-res → bloom half-res, in that
  // order." Until now only the first half of that was implemented. The perf
  // harness therefore measured the mobile floor with the full display-case
  // chain running, which is the top tier being asked to hit the bottom tier's
  // number — and it failed, correctly and uninformatively.
  //
  // Measured on this machine (RTX 4050, cubicle_farm, tools/f6-tier-ladder.mjs,
  // screenshots/perf/f6/tier-ladder.json) — p50 / p95 / fps@p50 / draw calls:
  //
  //   CPU 2x (mid laptop)      high  19.4 / 25.1 / 51.6 / 514
  //                            +AO off 16.8 / 22.4 / 59.5 / 379   <- budget met
  //   CPU 4x (mobile floor)    high  49.3 / 62.1 / 20.3 / 485
  //                            +AO off 37.1 / 52.6 / 27.0 / 379
  //                            +tilt 36.0 / 47.1 / 27.8 / 289
  //                            +bloom 34.2 / 45.3 / 29.2 / 360
  //                            +shadow 32.1 / 43.0 / 31.2 / 273  <- 30fps floor met
  //
  // So the ladder does what the document says it will: `medium` clears the
  // mid-laptop budget and `low` clears the 30fps mobile floor. This is not a
  // re-baselining of anything — the top tier's numbers are unchanged and still
  // reported.
  //
  // Bloom degrades by resolution rather than by removal, per the document
  // ("bloom half-res"): UnrealBloomPass's own mip chain already halves, so the
  // knob here is its resolution, and `low` drops it entirely only because the
  // measurement above shows it is worth 13 draw calls and ~2ms at 4x.
  //
  // AUTOMATIC, via the governor in _updateAdaptiveQuality(). Guessing a device
  // class from a user-agent string is how a 4090 ends up running the mobile
  // tier, so nothing guesses — the governor watches the frame time this machine
  // actually produces and moves only on evidence. Calling this method directly
  // (settings menu, harness) pins the tier and turns the governor off; pass
  // `{ adaptive: true }` to move without surrendering automatic control.
  // `Engine.qualityTier` always reports what is in force.
  setQualityTier(tier, { adaptive = false } = {}) {
    const t = ['high', 'medium', 'low'].includes(tier) ? tier : 'high';
    if (!adaptive) this._adaptiveQuality = false;
    const changed = t !== this.qualityTier;
    this.qualityTier = t;
    this.setAmbientOcclusion(t === 'high');
    this.setTiltShift(t !== 'low');
    if (this._bloomPass) {
      this._bloomPass.enabled = t !== 'low';
      // 'medium' keeps bloom but at half strength-of-cost: the pass's own
      // resolution is what it charges for.
      if (t === 'medium') this._bloomPass.setSize(this.width * 0.5, this.height * 0.5);
      else if (t === 'high') this._bloomPass.setSize(this.width, this.height);
    }
    // Shadow cadence is the second axis of the ladder. 'high' refreshes the map
    // at 30Hz (interval 2), 'medium' at 15Hz (4) — with radius-4 PCF soft edges
    // a 15Hz character shadow is not readable as lag — and 'low' turns the map
    // off entirely below.
    this.setShadowInterval(t === 'medium' ? 4 : 2);
    if (this.renderer) {
      // Shadows are not in COMP_CARD's ladder because they were not a post
      // pass. They belong at the bottom of it anyway: the cost ladder prices
      // the shadow-map re-render at ~100-130 draw calls for 0.0ms of GPU on
      // this machine, i.e. it is pure main-thread submission — the exact
      // currency a CPU-bound floor is short of.
      this.renderer.shadowMap.enabled = t !== 'low';
      this.invalidateShadows();
    }
    // ── 'low' also drops the two pure-atmosphere scene branches ────────────
    // These are NOT in COMP_CARD's written ladder (it stops at bloom) and this
    // is a deliberate, signed extension of it, measured rather than guessed.
    // Draw-call attribution on a frozen frame (screenshots/perf/AFTER.md):
    // city_backdrop is 48 calls in cubicle_farm, 36 in reception and **95 in
    // parking_garage**; room_fx is 87 / 31 / 12. Together they are a third of
    // the mobile-floor frame and neither is load-bearing for readability — the
    // city is seen through windows, room_fx is the authored light-pool overlay.
    // They come back the instant the governor steps back up. An art owner who
    // disagrees should change THIS branch, not the 'high' tier.
    //
    // KNOWN RISK, stated rather than hidden: rooms whose composition is the view
    // out of the window — penthouse and its three wings, executive_floor — lose
    // the city entirely at 'low', and that may read as broken rather than as
    // degraded. The side-by-side stills for the decision are
    // `screenshots/perf/f7/tier-look.html` (tools/f7-tier-look-sheet.mjs). If the
    // verdict is "keep something", the cheap version is a reduced city (towers
    // only, no beacons/streaks/mist) rather than none.
    const atmos = t !== 'low';
    if (this.cityBackdrop?.group) this.cityBackdrop.group.visible = atmos;
    if (this._roomFX) this._roomFX.visible = atmos;
    this._atmosVisible = atmos;
    if (changed) this._qCooldown = Math.max(this._qCooldown, 45);
    return t;
  }

  // ── Adaptive quality governor ─────────────────────────────────────────────
  //
  // The problem it solves, stated as QA stated it: the perf harness measured
  // COMP_CARD's *mobile floor* (30fps) with COMP_CARD's *top tier* running, and
  // it failed — correctly, and uninformatively, because no shipping game asks a
  // phone to run the desktop preset. The ladder existed but nothing walked it.
  // This walks it, from measured frame time, with no device sniffing.
  //
  // Design constraints that shape the numbers below:
  //  - vsync pins a healthy frame at 16.67ms, so "is there headroom" cannot be
  //    read off p50 directly. Stepping DOWN is evidence-driven (p50 above the
  //    down threshold means frames are genuinely being missed); stepping UP is
  //    a probe — try it, and if the probe fails, wait exponentially longer
  //    before probing again. That is what _qUpHold doubling implements, and it
  //    is what stops a machine sitting exactly on the boundary from oscillating
  //    (which would be far more visible than either tier).
  //  - Room transitions produce a legitimately huge frame (the build, ~230ms,
  //    hidden behind the wipe). Feeding that to the governor would demote a
  //    machine that is perfectly healthy, so samples above _qIgnoreMs are
  //    dropped and warmScene() resets the window.
  _updateAdaptiveQuality(rawMs) {
    if (!this._adaptiveQuality) return;
    if (rawMs > 100) return;              // transition / tab-switch, not steady state
    const w = this._qWin;
    w[this._qWinI++ % w.length] = rawMs;
    if (this._qFilled < w.length) this._qFilled++;
    if (this._qCooldown > 0) { this._qCooldown--; return; }
    if (this._qFilled < w.length || this._qWinI % w.length !== 0) return;

    const s = this._qScratch;
    s.set(w);
    s.sort();
    const p50 = s[w.length >> 1];
    // p90 of the window, and it carries the whole step-UP decision. p50 CANNOT:
    // vsync pins a healthy frame at 16.67ms, so every tier that is keeping up at
    // all reports p50 ≈ 16.7 and the median is blind to how much headroom is
    // behind it. p90 is not — a tier with real room to spare lands its slow
    // frames on vsync too, while a tier that is only just holding on shows its
    // strain in the tail. Measured: reception at CPU 4x on 'low' reported p50
    // 16.8ms (looks like plenty of headroom) with p95 23.8ms (there is none),
    // and promoting on the p50 reading produced the exact oscillation this
    // guards against — low@4471ms → medium@15709ms → low@17590ms.
    const p90 = s[Math.min(w.length - 1, Math.floor(w.length * 0.9))];

    const TIERS = ['high', 'medium', 'low'];
    const i = TIERS.indexOf(this.qualityTier);
    // Two demotion triggers, because "how bad is it" and "how sure am I" are
    // different questions and a single threshold cannot answer both:
    //
    //   p50 > 28ms (< 36fps) — SEVERE. Move on the first window. A machine this
    //     far under is not going to be rescued by more evidence, and every extra
    //     window is another second of a player watching it stutter.
    //   p50 > 20ms (< 50fps) — MARGINAL. Require two consecutive windows. That
    //     is not belt-and-braces, it is a measured fix: with a single-window
    //     trigger, CPU 2x demoted cubicle_farm all the way to 'low' (60.6fps)
    //     when 'medium' was holding 57.8fps — one heavy stretch of the patrol
    //     pushed a 17.3ms-p50 tier over 20ms for one window. Over-demotion costs
    //     AO, tilt-shift, bloom, shadows and the whole city on hardware that did
    //     not need to give up any of it. (tools/f7-tier-governor.mjs.)
    //
    // Window is 30 frames, not 60, for the same reason: at the throttled frame
    // rates where this fires, a 60-frame window is ~1.5-2s, and two of those
    // plus a 90-frame cooldown put the second demotion 13.9s after launch —
    // measured. 30 frames + a 45-frame cooldown puts the settled tier inside
    // ~4s, which is the difference between "it adjusted" and "it was broken for
    // a while".
    if (p50 > 20 && i < TIERS.length - 1) {
      this._qUpGood = 0;
      if (p50 <= 28 && ++this._qDownBad < 2) return;
      this._qDownBad = 0;
      this._qUpHold = Math.min(80, this._qUpHold * 2);   // probing up got it wrong
      // A demotion that lands within 5s of a promotion IS a failed probe: the
      // tier above is measurably not sustainable in this room. Nail the ceiling
      // shut so we never oscillate back into it. resetAdaptiveWindow() (room
      // build, combat entry) lifts it again, because a different room is a
      // different question.
      const t = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (t - this._qLastUpAt < 5000) this._qCeil = i + 1;
      this.setQualityTier(TIERS[i + 1], { adaptive: true });
      return;
    }
    this._qDownBad = 0;
    if (p90 < 18.5 && i > 0 && i - 1 >= this._qCeil) {
      // Real headroom (see p90 above), the tier above has not already failed a
      // probe in this room, and _qUpHold consecutive good windows have passed —
      // 5 windows = 150 frames = ~2.5s at first, doubling after every failed
      // probe, capped at 80 windows / ~40s so a boundary machine probes rarely
      // rather than never.
      if (++this._qUpGood >= this._qUpHold) {
        this._qUpGood = 0;
        this._qLastUpAt = (typeof performance !== 'undefined' ? performance.now() : 0);
        this.setQualityTier(TIERS[i - 1], { adaptive: true });
      }
      return;
    }
    this._qUpGood = 0;
  }

  // Re-arm the governor after a discontinuity (room build, combat entry). The
  // frames either side of one of those are not comparable.
  resetAdaptiveWindow() {
    this._qFilled = 0;
    this._qWinI = 0;
    this._qUpGood = 0;
    this._qDownBad = 0;
    this._qCeil = 0;        // a new room is a new question — probing up is allowed again
    this._qUpHold = 5;
    this._qCooldown = 30;
  }

  // Hard off-switch (harness pins the tier; a settings menu that exposes tiers
  // should call setQualityTier() instead, which turns this off implicitly).
  setAdaptiveQuality(on) {
    this._adaptiveQuality = !!on;
    if (on) this.resetAdaptiveWindow();
    return this._adaptiveQuality;
  }

  // Re-gate the post chain for whatever scene/camera this frame renders.
  // Tilt-shift: orthographic cameras only (exploration/title/arcade) —
  // combat's perspective camera gets none. AO: only the exploration
  // scene through the main ortho camera (N8AOPass bakes those refs; see
  // the construction-site comment).
  _configurePostFor(scene, camera) {
    const ortho = camera.isOrthographicCamera === true;
    if (this._tiltShiftPass) {
      // The pass carries the chain's output transform, so it is always on; only
      // its BLUR is gated. Disabling the pass would drop ACES + linear->sRGB
      // for the whole frame.
      this._tiltShiftPass.enabled = true;
      this._tiltShiftPass.blurEnabled = ortho && this._tiltShiftOn;
      if (this._tiltShiftPass.blurEnabled) this._keyTiltShiftToRoom(scene, camera);
    }
    // Combat's perspective camera gets the dedicated Refn-black combat
    // grade; everything orthographic follows time of day. setGrade is a
    // same-key no-op, so re-asserting per frame is free.
    if (this._gradePass) {
      this._gradePass.setGrade(ortho ? (this._todKey || 'afternoon') : 'combat');
    }
    const ao = !!this._n8aoPass && this._aoOn &&
      scene === this.scene && camera === this.camera;
    if (this._n8aoPass) this._n8aoPass.enabled = ao;
    this._renderPass.enabled = !ao;
  }

  // Key the tilt-shift focus band to the ROOM's screen-space extent —
  // and make the band deliberately TIGHTER than the room. A band that
  // covers the whole specimen does zero work selling the miniature
  // (critic round 2): the sharp zone brackets the room's mid-line while
  // the near wall corner and far crown drift soft, the way Link's
  // Awakening blurs both its top buildings and bottom flower row.
  // Falls back to the classic centered band when no room is loaded
  // (title) or for non-main scenes (arcade).
  _keyTiltShiftToRoom(scene, camera) {
    const u = this._tiltShiftPass.uniforms;
    const rect = this._roomRect;
    if (!rect || scene !== this.scene) {
      u.focusCenter.value = 0.5;
      u.bandWidth.value = 0.26;
      return;
    }
    const v = this._tsVec || (this._tsVec = new THREE.Vector3());
    let minY = Infinity, maxY = -Infinity;
    const xs = [-0.5, rect.w - 0.5];
    const zs = [-0.5, rect.h - 0.5];
    for (const x of xs) {
      for (const z of zs) {
        for (const y of [0, 2.6]) {   // floor corners + wall tops
          v.set(x, y, z).project(camera);
          const uvY = (v.y + 1) * 0.5;
          if (uvY < minY) minY = uvY;
          if (uvY > maxY) maxY = uvY;
        }
      }
    }
    const center = (minY + maxY) * 0.5;
    u.focusCenter.value = Math.min(0.85, Math.max(0.15, center));
    // ~half the room's screen extent stays fully sharp; the smoothstep
    // ramp then eases the room's own near/far edges into gentle blur and
    // the void/city beyond into full blur.
    u.bandWidth.value = Math.min(0.42, Math.max(0.16, (maxY - minY) * 0.52));
  }

  // Street-level mode: tower bases at the ground plane (city chapter,
  // parking garage) instead of rooftops far below
  setStreetLevel(on) {
    if (this.cityBackdrop) this.cityBackdrop.setStreetLevel(on);
    else this._pendingStreetLevel = on;
  }

  _setupLighting() {
    // Severance clinical: the default rig runs COOL white-green, never
    // warm cream — the wall/floor palette is warm beige, so warm light
    // on it drifted every interior toward khaki (critic round 2). Cool
    // fluorescent light over warm surfaces cancels to clinical white.
    const ambient = new THREE.AmbientLight(ENGINE_AMBIENT, 0.52);
    this.scene.add(ambient);
    this._ambient = ambient;
    this._flicker = false;
    this._roomWantsFlicker = false;   // B9 — the room's authored property
    this._flickerEnabled = true;      // B9 — the player's switch
    this._baseDirIntensity = 1.15;

    // Main directional light (fluorescent ceiling) — steep, near-vertical:
    // pools light on the floor center and tucks shadow under furniture.
    // Brighter than v2: interiors read OVERLIT-sterile, not murky.
    const dirLight = new THREE.DirectionalLight(ENGINE_FLUORESCENT, 1.15);
    dirLight.position.set(3, 17, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.radius = 4;   // soft-edged contact shadows (PCF)
    this.scene.add(dirLight);
    this._dirLight = dirLight;

    // Subtle fill from other side — cool, and quieter than v2 so the
    // key's shadows keep their weight (grounding)
    const fillLight = new THREE.DirectionalLight(0xb0c0d0, 0.22);
    fillLight.position.set(-5, 8, -3);
    this.scene.add(fillLight);
  }

  // Per-room mood lighting. Room data may carry a `lighting` block:
  //   { ambient, ambientIntensity, dir, dirIntensity, flicker }
  // Missing fields (or no block at all) fall back to the default office rig.
  // Point lights stay in room data's existing `lights` array (built by Room).
  applyRoomLighting(cfg) {
    const c = cfg || {};
    if (this._ambient) {
      this._ambient.color.set(c.ambient ?? ENGINE_AMBIENT);
      // Default rebalanced toward top-light: less ambient, more key
      this._ambient.intensity = c.ambientIntensity ?? 0.52;
    }
    if (this._dirLight) {
      this._dirLight.color.set(c.dir ?? ENGINE_FLUORESCENT);
      this._dirLight.intensity = c.dirIntensity ?? 1.15;
      this._baseDirIntensity = this._dirLight.intensity;
    }
    this._roomWantsFlicker = !!c.flicker;
    this._flicker = this._roomWantsFlicker && this._flickerEnabled !== false;
    this.invalidateShadows();
  }

  /**
   * B9 — the player-facing flicker switch (Settings > Light Flicker).
   *
   * Two flags, deliberately: `_roomWantsFlicker` is the ROOM's authored
   * property and is never overwritten, `_flicker` is what the frame loop reads.
   * Collapsing them into one would make the setting destructive — turning the
   * switch off and back on inside a flickering room would leave that room
   * permanently steady until the player walked out and back in.
   *
   * Turning it off also restores the base intensity immediately, so the room
   * does not stay parked on whatever fraction of a buzz-dip the last frame
   * happened to land on.
   */
  setFlickerEnabled(on) {
    this._flickerEnabled = !!on;
    this._flicker = !!this._roomWantsFlicker && this._flickerEnabled;
    if (!this._flicker && this._dirLight && this._baseDirIntensity) {
      this._dirLight.intensity = this._baseDirIntensity;
    }
  }

  // ── Room FX — the interior lighting design layer ─────────────────────
  // Built per room load (RoomManager calls this right after
  // applyRoomLighting). Adds what the flat ambient rig can't:
  //   1. Emissive ceiling-panel light POOLS on the floor (Severance
  //      top-light hierarchy: bright center, shadowed corners) with the
  //      institutional-green whisper from the comp card.
  //   2. A wall-seam AO frame — soft darkening at every floor-wall
  //      seam so rooms read as lit sets, not hollow greyboxes.
  //   3. Baked contact blobs under each furniture footprint (the same
  //      grounding trick combat uses under Karen).
  //   4. A lacquer gloss ramp across the floor (Zelda: LA material
  //      response) + neon reflection smears under neonSign furniture.
  // All quads are transparent, depthWrite:false, and total a few dozen
  // draws — nothing here threatens the 60fps budget.
  applyRoomFX(roomData, roomGroup) {
    if (this._roomFX) {
      this.scene.remove(this._roomFX);
      this._roomFX.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        // Materials are per-room; their maps are shared engine textures
        // (material.dispose() never touches textures)
        if (o.material) o.material.dispose();
      });
      this._roomFX = null;
    }
    this._roomRect = roomData ? { w: roomData.width, h: roomData.height } : null;
    // The overlay group is removed/rebuilt here — before every early return
    // below, so the shadow map is invalidated on all paths.
    this.invalidateShadows();
    if (!roomData) return;
    // Terraced / sloped rooms have no single floor plane — skip overlays
    if (roomData.floorZones || roomData.slope) return;

    const w = roomData.width, h = roomData.height;
    const g = new THREE.Group();
    g.name = 'room_fx';
    const cx = w / 2 - 0.5, cz = h / 2 - 0.5;

    // 1. Wall-seam AO frame (per-size cached canvas: clear center, dark
    // gradient edges, heavier corners)
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this._fxFrameTexture(w, h), transparent: true, depthWrite: false,
      })
    );
    frame.rotation.x = -Math.PI / 2;
    frame.position.set(cx, 0.012, cz);
    frame.renderOrder = 1;
    g.add(frame);

    // 2. Ceiling-panel fixtures + light pools — skipped in mood-lit dark
    // rooms (server room, vault...) where point lights own the scene.
    // The fixtures are the missing SOURCE (critic round 2: "no visible
    // ceiling light sources anywhere, so the sterile-institutional read
    // never lands"): emissive fluorescent bars at wall-top height, each
    // with a soft underglow, each throwing its green-white pool on the
    // floor below. Bright enough to graze the bloom threshold.
    const amb = roomData.lighting?.ambientIntensity ?? 0.52;

    // FIXTURE PROFILE (F-10 rider i)
    // Wave 2 built the Severance top-light rig and then reached exactly FOUR
    // rooms with it (cubicle_farm, reception, server_room, penthouse_bar).
    // Every other interior fell through a single derived boolean --
    // `dirIntensity >= 0.9` -- into one of two states, neither of which is the
    // ruled standard:
    //
    //   * a GRID of sourceless radial pools (the "floor that is somehow lit
    //     anyway" the round-1 critics named), or
    //   * nothing at all.
    //
    // The boolean is now a named PROFILE that room data can set, and the old
    // derivation is its default -- so a room that says nothing behaves exactly
    // as it did before this change. Profiles differ only in fixture COUNT,
    // TINT and pool weight; all of them run the same `Furniture.ceilingFixture`
    // geometry and the same pool + light-shaft + specular-streak triple, which
    // is what makes "conforms to the standard" true by construction instead of
    // by eye.
    //
    //   office   the full Severance troffer run -- 2-3 short bars per row,
    //            warm diffuser, strong anchored pool. Working floors.
    //   utility  ONE cool strip per row, dimmer, cooler pool. Concrete and
    //            back-of-house: garage, stairwell, archive, vault, records.
    //            (This is server_room's hand-written fixture generalised: that
    //            block used to live in this file as an `id ===` special case
    //            and is now just a room that asks for `utility`.)
    //   warm     one amber pendant per row, soft pool. Rooms lit by lamps
    //            rather than ceiling grids: break room, board room, diner.
    //   none     no ceiling fixtures and no grid pools. The room's own point
    //            lights own the floor -- the penthouse wings, floor 13, the
    //            lounge. Silence, chosen.
    const FIXTURE_PROFILES = {
      office:  { tint: 0xefe9db, pool: 0xffefce, poolOpacity: 0.34, shaft: 0xffe9c8, shaftOpacity: 0.11, streak: 0.42, perRow: 3, poolW: 1.0, poolD: 2.9 },
      utility: { tint: 0xccdcf0, pool: 0x9fc4e6, poolOpacity: 0.26, shaft: 0x9fc4e6, shaftOpacity: 0.08, streak: 0.18, perRow: 1, poolW: 2.2, poolD: 4.4 },
      warm:    { tint: 0xffb264, pool: 0xffd9a0, poolOpacity: 0.28, shaft: 0xffc98a, shaftOpacity: 0.09, streak: 0.22, perRow: 2, poolW: 1.4, poolD: 3.2 },
    };
    const profile = roomData.fx?.fixtures
      || ((roomData.lighting?.dirIntensity ?? 1.15) >= 0.9 ? 'office' : (amb >= 0.4 ? 'grid' : 'none'));
    const rig = FIXTURE_PROFILES[profile] || null;

    // Generic grid light pools — a ceiling wash for BRIGHT rooms that do NOT run
    // the office fixture rig (they'd read flat otherwise). Office rooms skip
    // these: their troffers own the floor now, and stacking the grid pools on
    // top of the fixture pools was exactly the SOURCELESS hot spot the critics
    // flagged ("a floor that is somehow lit anyway"). One pool system per room.
    if (profile === 'grid') {
      const poolMat = new THREE.MeshBasicMaterial({
        map: this._fxRadialTexture(), color: 0xdfeee2, transparent: true,
        opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const nx = Math.max(1, Math.round((w - 3) / 4.5));
      const nz = Math.max(1, Math.round((h - 3) / 4.5));
      const poolGeo = new THREE.PlaneGeometry(4.6, 4.6);
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const px = 1.0 + (w - 2) * ((i + 0.5) / nx) - 0.5;
          const pz = 1.0 + (h - 2) * ((j + 0.5) / nz) - 0.5;
          const pool = new THREE.Mesh(poolGeo, poolMat);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(px, 0.016, pz);
          pool.renderOrder = 2;
          g.add(pool);
        }
      }
    }

    // Office fixture rig: Severance linear top-light, rebuilt for iso by Surgeon
    // 1. Each ceiling row breaks into 2-3 short SELF-LIT troffers (their warm
    // glowing top panel + rim lip is now visible from the god's-eye camera), and
    // each fixture SOURCES its light through three cooperating cues so the floor
    // never reads "lit anyway": a warm pool anchored DIRECTLY beneath it, a faint
    // additive light-shaft joining housing to pool, and a slim specular streak.
    // Pool width is kept close to the fixture and opacity capped so neighbouring
    // washes don't additively stack into blown paper BETWEEN the fixtures.
    if (rig) {
      const nz = Math.max(1, Math.round((h - 3) / 4.5));
      const nSeg = rig.perRow <= 1 ? 1
        : Math.min(rig.perRow, Math.max(2, Math.round((w - 2) / 6)));
      const gap = 0.9;                                  // dark gap between troffers
      const span = w - 3.0;                             // total run width, inset from walls
      const segLen = Math.max(1.6, span / nSeg - gap);
      const cxm = (w - 1) / 2;
      // S2.5 polish: one stop more floor presence so light traces fixture->floor
      // at a glance — pool 0.24->0.34, specular streak 0.30->0.42.
      const fxPoolMat = new THREE.MeshBasicMaterial({
        map: this._fxRadialTexture(), color: rig.pool, transparent: true,
        opacity: rig.poolOpacity, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const fxStreakMat = new THREE.MeshBasicMaterial({
        map: this._fxGlossStreakTexture(), color: 0xe9f1ff, transparent: true,
        opacity: rig.streak, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const fxPoolGeo = new THREE.PlaneGeometry(1, 1);
      for (let j = 0; j < nz; j++) {
        const pz = 1.0 + (h - 2) * ((j + 0.5) / nz) - 0.5;
        for (let s = 0; s < nSeg; s++) {
          const sx = cxm + (s - (nSeg - 1) / 2) * (segLen + gap);
          const fixture = Furniture.ceilingFixture(segLen, rig.tint);
          fixture.position.set(sx, 2.44, pz);
          g.add(fixture);
          // Warm pool on the floor directly beneath the troffer — width held
          // near the fixture so adjacent pools kiss but don't stack hot.
          const pool = new THREE.Mesh(fxPoolGeo, fxPoolMat);
          pool.rotation.x = -Math.PI / 2;
          pool.scale.set(segLen + rig.poolW, rig.poolD, 1);
          pool.position.set(sx, 0.017, pz);
          pool.renderOrder = 2;
          g.add(pool);
          // Light-shaft: the SOURCE connective tissue joining housing to pool
          // (0.07->0.11 so the fixture->floor trace reads at a glance).
          g.add(this._fxLightShaft(sx, pz, 2.36, rig.shaft, segLen * 0.7, 0.7, rig.shaftOpacity));
          // Lacquer specular streak. S2.5: pulled back under the bar (+0.35 ->
          // +0.16) so the sheen anchors to its fixture instead of floating a
          // half-tile out in the aisle (cubicle_farm critic).
          const streak = new THREE.Mesh(fxPoolGeo, fxStreakMat);
          streak.rotation.x = -Math.PI / 2;
          streak.scale.set(segLen + 0.5, 1.1, 1);
          streak.position.set(sx, 0.018, pz + 0.16);
          streak.renderOrder = 3;
          g.add(streak);
        }
      }
    }

    // Extra hand-placed fixtures, from room data (`fx.extra`). The server
    // room's east-half cool troffer used to live HERE as a
    // `roomData.id === 'server_room'` special case -- the exact shape that
    // stops a lighting rig being extensible. It is room data now, and any room
    // can hang one.
    //
    // `housing: false` emits only the SOURCING half -- shaft and pool, no
    // troffer. Use it when the room's own furniture already IS the fixture: a
    // `lamppost` carries an emissive head at y 2.5 and a ceilingFixture hung
    // beside it would read as a fluorescent bar floating over a sidewalk.
    // `shaftW`/`shaftH` size the shaft independently of `len`, because a street
    // lamp's cone is narrow and tall where a troffer's is wide and short.
    for (const ex of (roomData.fx?.extra || [])) {
      const tint = ex.tint ?? 0xccdcf0;
      const len = ex.len ?? 3.0;
      const y = ex.y ?? 2.44;
      if (ex.housing !== false) {
        const fixture = Furniture.ceilingFixture(len, tint);
        fixture.position.set(ex.x, y, ex.z);
        g.add(fixture);
      }
      g.add(this._fxLightShaft(ex.x, ex.z, y - 0.08, tint,
        ex.shaftW ?? len * 0.7, ex.shaftH ?? 0.7, ex.shaft ?? 0.08));
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this._fxRadialTexture(), color: ex.pool ?? tint, transparent: true,
          opacity: ex.opacity ?? 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
      pool.rotation.x = -Math.PI / 2;
      pool.scale.set(ex.poolW ?? 5.0, ex.poolD ?? 5.2, 1);
      pool.position.set(ex.x, 0.019, ex.z);
      pool.renderOrder = 2;
      g.add(pool);
    }

    // 3. Lacquer gloss ramp — one soft diagonal sheen across the floor;
    // hardwood floors get the stronger lacquered response.
    // W / final residuals: penthouse_bar is a near-black mood lounge, and the
    // additive white gloss band (up to ~0.75 alpha in its core stop) was
    // landing across the open mid-floor as the "flat milky-grey plateau between
    // lamp pools" the rider flagged. Cut it hard for this room so the floor
    // falls toward black between the practicals; the point-light pools carry
    // the sheen. Other hardwood rooms keep the full lacquer response.
    const glossOpacity = roomData.id === 'penthouse_bar' ? 0.035
      : (roomData.floorPattern === 'hardwood' ? 0.12 : 0.085);
    const gloss = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this._fxGlossTexture(), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: glossOpacity,
      })
    );
    gloss.rotation.x = -Math.PI / 2;
    gloss.position.set(cx, 0.014, cz);
    gloss.renderOrder = 2;
    g.add(gloss);

    // 4. Contact blobs under furniture (grounding: pieces sit, not float)
    if (roomGroup) {
      const blobMat = new THREE.MeshBasicMaterial({
        map: this._fxBlobTexture(), transparent: true, depthWrite: false,
        opacity: 0.56,   // firm Zelda-style contact grounding, not a hint
      });
      const blobGeo = new THREE.PlaneGeometry(1, 1);
      const SKIP = new Set([
        'parkingSpot', 'curb', 'aisleGlow', 'staircase', 'stairFlight',
        'stairFlightWall', 'stairRail',
        'elevatorDoors', 'cobweb', 'cableTray',
      ]);
      const box = new THREE.Box3();
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      for (const child of roomGroup.children) {
        const type = child.userData?.furnitureType;
        if (!type || SKIP.has(type)) continue;
        // Room._mergeStatics() bakes the static opaque meshes out of these
        // groups into per-material batches, so the group's own box is empty
        // by the time we get here. It stashes the pre-merge box in userData;
        // the live setFromObject() is the fallback for unmerged rooms.
        if (child.userData.fxBox) box.copy(child.userData.fxBox);
        else box.setFromObject(child);
        box.getSize(size);
        if (box.min.y > 0.25) continue;          // wall-mounted / elevated
        if (size.y < 0.25) continue;             // flat markers
        if (size.x > 8 || size.z > 8) continue;  // room-scale structures
        box.getCenter(center);
        const blob = new THREE.Mesh(blobGeo, blobMat);
        blob.rotation.x = -Math.PI / 2;
        blob.scale.set(size.x + 0.55, size.z + 0.55, 1);
        blob.position.set(center.x, 0.02, center.z);
        blob.renderOrder = 3;
        g.add(blob);
      }
    }

    // 5. Neon reflection smears — saturated signage doubling itself in the
    // lacquered floor (the "one floor catches one light" note). Data-driven
    // off furniture type. Wave-2: a WIDE soft wash + a BRIGHT narrow core
    // streak stretching from the sign toward the camera, so a magenta neon
    // over a near-black hardwood floor (penthouse_bar) reads as a mirrored
    // streak, not a sign floating on a dead surface.
    for (const item of (roomData.furniture || [])) {
      if (item.type !== 'neonSign') continue;
      const south = item.rotation && Math.abs(item.rotation - Math.PI) < 0.1;
      const dir = south ? -1 : 1;
      // A broad soft reflected GLOW pushed a few tiles off the wall so it lands
      // on OPEN floor (the corner signs' smears were dying behind the bar/poker
      // furniture — "the grey floor refuses to answer"). Radial, not a wall-
      // hugging streak, so the reflection reads even where furniture crowds the
      // wall line.
      const wash = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this._fxRadialTexture(), color: 0xff2a8e, transparent: true,
          opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      wash.rotation.x = -Math.PI / 2;
      wash.scale.set(5.4, 6.6, 1);
      wash.position.set(item.x, 0.017, item.z + dir * 3.1);
      wash.renderOrder = 3;
      g.add(wash);
      // The stretched mirrored CORE — bright narrow streak from the sign
      // reaching toward the camera, the Drive "neon on wet reflection" tell.
      const core = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 5.2),
        new THREE.MeshBasicMaterial({
          map: this._fxSmearTexture(), color: 0xff58b0, transparent: true,
          opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      core.rotation.x = -Math.PI / 2;
      if (south) core.rotation.z = Math.PI;
      core.position.set(item.x, 0.019, item.z + dir * 2.5);
      core.renderOrder = 4;
      g.add(core);

      // CAST-BUGS item 6 — a real point light for the magenta reflection pool.
      // The wash + core above are emissive floor decals (they light nothing), and
      // every practical in the lounge is tightened to hug furniture, so a character
      // standing IN the visually-lit pool caught no light and rendered as a
      // pure-black cutout. The light is pushed a few tiles toward the camera (+z)
      // from the pool centre so it fills the character's CAMERA-FACING side (a
      // light left at the wall/pool centre only rimmed their far side). Cheap (no
      // shadow map); short range + decay so it lifts the pool zone, not the whole
      // deliberately-black mid-floor.
      const poolLight = new THREE.PointLight(0xff2a8e, 3.6, 8, 2);
      poolLight.position.set(item.x, 2.3, item.z + dir * 3.1 + 3.4);
      poolLight.userData.noFlash = true;
      g.add(poolLight);
    }

    // 5b. Server-rack cyan underglow — the "drop a cyan pool on the floor
    // beneath each rack column so the saturated hum actually hums" note. Each
    // serverRack furniture entry gets a tight cool pool at its foot so the
    // obsidian chassis separates from the dark floor instead of black-on-black.
    let rackGlowMat = null;
    for (const item of (roomData.furniture || [])) {
      if (item.type !== 'serverRack') continue;
      if (!rackGlowMat) rackGlowMat = new THREE.MeshBasicMaterial({
        map: this._fxRadialTexture(), color: 0x1fb6e0, transparent: true,
        opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rackGlowMat);
      pool.rotation.x = -Math.PI / 2;
      pool.scale.set(1.7, 2.0, 1);
      pool.position.set(item.x, 0.021, item.z);
      // renderOrder 4: draw AFTER the black furniture contact blobs (order 3) so
      // the additive cyan lands on the darkened floor instead of being buried.
      pool.renderOrder = 4;
      g.add(pool);
    }

    // 6. Exterior night sleeve — the display-case shell. The room's
    // outer wall faces catch the full interior rig and read as a
    // full-bright putty-grey box pasted onto the void (critic: "model
    // viewer, not a diorama parked in a Refn night"). Near-black panels
    // hug the south/east exteriors (the two faces the camera sees),
    // pulling the shell down to night ambient; the pale crown along the
    // wall top stays exposed as the rim light that defines the
    // silhouette, and a whisper of warm seam is baked into the sleeve's
    // top edge. Panels skip exit doorways so doors stay readable, and
    // _loop mirrors each panel's opacity onto the walk-behind wall fade
    // so the shell goes glassy exactly when the wall does.
    const sleeves = [];
    if (roomData.walls && roomGroup) {
      // One faded-wall material per side (Room clones the south/east
      // wall materials transparent for the walk-behind fade). Wall
      // segment meshes sit at y = wallHeight/2 = 1.25 on flat rooms.
      let southWallMat = null, eastWallMat = null;
      for (const child of roomGroup.children) {
        if (!child.isMesh || !child.material?.transparent) continue;
        if (Math.abs(child.position.y - 1.25) > 0.35) continue;
        if (!southWallMat && Math.abs(child.position.z - (h - 0.425)) < 0.12) {
          southWallMat = child.material;
        } else if (!eastWallMat && Math.abs(child.position.x - (w - 0.425)) < 0.12) {
          eastWallMat = child.material;
        }
      }
      const sleeveTex = this._fxSleeveTexture();
      const SLV_H = 2.56, SLV_Y = 1.22;   // spans -0.06 .. 2.50
      // Contiguous exit tiles -> merged gap intervals along the wall
      const gapRuns = (coords) => {
        const xs = [...coords].sort((p, q) => p - q);
        const runs = [];
        for (const x of xs) {
          const last = runs[runs.length - 1];
          if (last && x <= last[1] + 1.01) last[1] = x;
          else runs.push([x, x]);
        }
        return runs.map(([s, e]) => [s - 0.85, e + 0.85]);
      };
      const segments = (a, b, gaps) => {
        const out = [];
        let cur = a;
        for (const [gs, ge] of gaps) {
          if (ge < a || gs > b) continue;
          if (gs - cur > 0.2) out.push([cur, Math.min(gs, b)]);
          cur = Math.max(cur, ge);
        }
        if (b - cur > 0.2) out.push([cur, b]);
        return out;
      };
      const exits = roomData.exits || [];
      const buildSide = (side, wallMat) => {
        if (!wallMat) return;   // no fadeable wall found — never risk
                                // an unfading panel blinding the player
        const south = side === 'south';
        const coords = exits
          .filter(e => (south ? e.z === h - 1 : e.x === w - 1))
          .map(e => (south ? e.x : e.z));
        const mat = new THREE.MeshBasicMaterial({
          map: sleeveTex, transparent: true, depthWrite: false,
        });
        let added = false;
        for (const [a, b] of segments(-0.65, (south ? w : h) - 0.31, gapRuns(coords))) {
          const quad = new THREE.Mesh(new THREE.PlaneGeometry(b - a, SLV_H), mat);
          if (south) {
            quad.position.set((a + b) / 2, SLV_Y, h - 0.31);
          } else {
            quad.rotation.y = Math.PI / 2;
            quad.position.set(w - 0.31, SLV_Y, (a + b) / 2);
          }
          quad.renderOrder = 4;
          g.add(quad);
          added = true;
        }
        if (added) sleeves.push({ mat, wall: wallMat });
      };
      buildSide('south', southWallMat);
      buildSide('east', eastWallMat);
    }
    g.userData.sleeves = sleeves;

    // Batch the overlay. cubicle_farm's contact-shadow blobs alone are 136
    // meshes sharing one material and one PlaneGeometry — 136 draw calls per
    // frame for a decal layer. batchStatics() keys on material identity and
    // renderOrder, so the blend order that matters is preserved; the sleeve
    // materials it merges are still the same instances the wall-fade mutates
    // through `userData.sleeves`.
    g.userData.batch = batchStatics(g, { transparent: true });

    this.scene.add(g);
    this._roomFX = g;
    // The group is rebuilt per room load, so the tier's atmosphere decision has
    // to be re-applied to the NEW group or 'low' silently regains 12-87 draw
    // calls on the first door the player walks through.
    if (this._atmosVisible === false) g.visible = false;
  }

  // Exterior sleeve gradient: obsidian night shell, slightly lifted at
  // the crown, with a quiet warm seam along the very top edge
  _fxSleeveTexture() {
    if (this._fxSleeve) return this._fxSleeve;
    const c = document.createElement('canvas');
    c.width = 8; c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 128, 0, 0);
    grad.addColorStop(0, '#08090d');
    grad.addColorStop(0.75, '#0e1015');
    grad.addColorStop(1, '#181b22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 128);
    // Warm seam under the crown — sodium catching the shell's top edge
    ctx.fillStyle = 'rgba(196,146,84,0.55)';
    ctx.fillRect(0, 0, 8, 2);
    ctx.fillStyle = 'rgba(196,146,84,0.20)';
    ctx.fillRect(0, 2, 8, 2);
    this._fxSleeve = new THREE.CanvasTexture(c);
    this._fxSleeve.colorSpace = THREE.SRGBColorSpace;
    this._fxSleeve.minFilter = THREE.LinearFilter;
    this._fxSleeve.generateMipmaps = false;
    return this._fxSleeve;
  }

  // Shared FX textures (built once, never disposed with the room)
  _fxRadialTexture() {
    if (this._fxRadial) return this._fxRadial;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.30)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this._fxRadial = new THREE.CanvasTexture(c);
    this._fxRadial.colorSpace = THREE.SRGBColorSpace;
    this._fxRadial.minFilter = THREE.LinearFilter;
    this._fxRadial.generateMipmaps = false;
    return this._fxRadial;
  }

  _fxBlobTexture() {
    if (this._fxBlob) return this._fxBlob;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this._fxBlob = new THREE.CanvasTexture(c);
    this._fxBlob.minFilter = THREE.LinearFilter;
    this._fxBlob.generateMipmaps = false;
    return this._fxBlob;
  }

  _fxGlossTexture() {
    if (this._fxGloss) return this._fxGloss;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 40, 256, 216);
    grad.addColorStop(0.18, 'rgba(255,255,255,0)');
    grad.addColorStop(0.42, 'rgba(235,242,250,0.55)');
    grad.addColorStop(0.52, 'rgba(235,242,250,0.75)');
    grad.addColorStop(0.62, 'rgba(235,242,250,0.55)');
    grad.addColorStop(0.86, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    this._fxGloss = new THREE.CanvasTexture(c);
    this._fxGloss.colorSpace = THREE.SRGBColorSpace;
    this._fxGloss.minFilter = THREE.LinearFilter;
    this._fxGloss.generateMipmaps = false;
    return this._fxGloss;
  }

  // Horizontal lacquer-reflection streak: bright core along the middle, soft
  // feather to transparent at both ends and both long edges. Scaled per fixture
  // into a stretched highlight (the "specular streak under each ceiling bar").
  _fxGlossStreakTexture() {
    if (this._fxGlossStreak) return this._fxGlossStreak;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    const ctx = c.getContext('2d');
    const gh = ctx.createLinearGradient(0, 0, 128, 0);
    gh.addColorStop(0.0, 'rgba(255,255,255,0)');
    gh.addColorStop(0.5, 'rgba(255,255,255,1)');
    gh.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, 128, 32);
    const gv = ctx.createLinearGradient(0, 0, 0, 32);
    gv.addColorStop(0.0, 'rgba(0,0,0,1)');
    gv.addColorStop(0.5, 'rgba(0,0,0,0)');
    gv.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, 128, 32);
    this._fxGlossStreak = new THREE.CanvasTexture(c);
    this._fxGlossStreak.colorSpace = THREE.SRGBColorSpace;
    this._fxGlossStreak.minFilter = THREE.LinearFilter;
    this._fxGlossStreak.generateMipmaps = false;
    return this._fxGlossStreak;
  }

  _fxSmearTexture() {
    if (this._fxSmear) return this._fxSmear;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const ctx = c.getContext('2d');
    const gv = ctx.createLinearGradient(0, 0, 0, 128);
    gv.addColorStop(0, 'rgba(255,255,255,0.8)');
    gv.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gv.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, 64, 128);
    const gh = ctx.createLinearGradient(0, 0, 64, 0);
    gh.addColorStop(0, 'rgba(255,255,255,0)');
    gh.addColorStop(0.5, 'rgba(255,255,255,1)');
    gh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, 64, 128);
    this._fxSmear = new THREE.CanvasTexture(c);
    this._fxSmear.colorSpace = THREE.SRGBColorSpace;
    this._fxSmear.minFilter = THREE.LinearFilter;
    this._fxSmear.generateMipmaps = false;
    return this._fxSmear;
  }

  // A faint additive light-shaft from a ceiling fixture down toward its floor
  // pool — the SOURCE connective tissue that makes the pool trace to a fixture
  // instead of reading "lit anyway." Two crossed vertical quads so the fixed
  // iso camera always catches one at a readable angle. Deliberately subtle
  // (low opacity) — it sources light, it is not fog. The per-call material is
  // disposed with the room; the shaft texture is shared and never disposed.
  _fxLightShaft(x, z, topY, color, wx, wz, opacity) {
    const grp = new THREE.Group();
    const H = topY - 0.08;
    const mat = new THREE.MeshBasicMaterial({
      map: this._fxShaftTexture(), color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(wx, H), mat);
    a.position.set(x, 0.08 + H / 2, z);
    a.renderOrder = 2;
    grp.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(wz, H), mat);
    b.rotation.y = Math.PI / 2;
    b.position.set(x, 0.08 + H / 2, z);
    b.renderOrder = 2;
    grp.add(b);
    return grp;
  }

  // Vertical shaft gradient: bright at the top (the fixture) feathering to
  // nothing before the floor, and soft on the left/right edges.
  _fxShaftTexture() {
    if (this._fxShaft) return this._fxShaft;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const ctx = c.getContext('2d');
    const gv = ctx.createLinearGradient(0, 0, 0, 128);
    gv.addColorStop(0.0, 'rgba(255,255,255,0.85)');   // top — at the fixture
    gv.addColorStop(0.45, 'rgba(255,255,255,0.30)');
    gv.addColorStop(1.0, 'rgba(255,255,255,0)');       // fades before the floor
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, 64, 128);
    const gh = ctx.createLinearGradient(0, 0, 64, 0);
    gh.addColorStop(0.0, 'rgba(0,0,0,0)');
    gh.addColorStop(0.5, 'rgba(0,0,0,1)');
    gh.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, 64, 128);
    ctx.globalCompositeOperation = 'source-over';
    this._fxShaft = new THREE.CanvasTexture(c);
    this._fxShaft.colorSpace = THREE.SRGBColorSpace;
    this._fxShaft.minFilter = THREE.LinearFilter;
    this._fxShaft.generateMipmaps = false;
    return this._fxShaft;
  }

  // Per-size cached wall-seam AO frame: transparent center, soft dark
  // borders (~0.9 tile deep), corner-weighted like real bounced-light AO
  _fxFrameTexture(w, h) {
    this._fxFrames = this._fxFrames || {};
    const key = `${w}x${h}`;
    if (this._fxFrames[key]) return this._fxFrames[key];
    const cw = Math.min(512, w * 24), ch = Math.min(512, h * 24);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    const bx = (0.95 / w) * cw;   // border ≈ 0.95 tile
    const bz = (0.95 / h) * ch;
    const edge = (x0, y0, x1, y1) => {
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, 'rgba(0,0,0,0.44)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.16)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    };
    edge(0, 0, bx, 0);           // west
    edge(cw, 0, cw - bx, 0);     // east
    edge(0, 0, 0, bz);           // north
    edge(0, ch, 0, ch - bz);     // south
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this._fxFrames[key] = tex;
    return tex;
  }

  // Viewport-aware ortho zoom. Desktop: the classic 12. Portrait phones:
  // scale up so ~14 world units stay visible horizontally. Short landscape
  // viewports: shrink so rooms don't dwindle.
  _zoomForViewport() {
    const aspect = this.width / this.height;
    if (aspect < 1) return Math.min(16, 7 / aspect);
    // Desktop pulled in from 12 → 10.5 (Alex: rooms should fill more
    // of the frame); short landscape viewports stay tighter still
    return this.height < 540 ? 8 : 10.5;
  }

  _onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const aspect = this.width / this.height;
    const zoom = this._zoomForViewport();

    this.camera.left = -zoom * aspect;
    this.camera.right = zoom * aspect;
    this.camera.top = zoom;
    this.camera.bottom = -zoom;
    this.camera.updateProjectionMatrix();

    // devicePixelRatio changes when the window moves to a monitor with
    // different scaling, so the cap has to be re-applied, not just set at boot.
    const pr = pixelRatio();
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height);
    // composer.setSize forwards the pixel-ratio-multiplied size to every pass,
    // so the tilt-shift internal target resizes with it — no extra call needed.
    this.composer.setSize(this.width, this.height);
  }

  onUpdate(callback) {
    this._updateCallback = callback;
  }

  // ── One rAF loop. Exactly one. ────────────────────────────────────────
  // The old pair was `running = true; this._loop()` / `running = false`, with
  // no handle and no guard, and that stacks loops: stop() flips the flag but
  // the rAF callback it already scheduled is still queued, so a later start()
  // finds `running` true again inside that stale callback, which schedules its
  // own successor — and now two independent chains drive the frame forever.
  //
  // Measured: after a single stop()/start() cycle, cubicle_farm went from 409
  // draw calls per composed frame to 883, p50 16.5 -> 18.0ms, and every
  // subsequent number in that page was taken on a double-driven loop
  // (tools/f6-render-breakdown.mjs found it; the composed frame itself was
  // unchanged at 409, which is what proved the doubling was in the DRIVER).
  //
  // In shipped play only ErrorBoundary stops the engine and it never restarts
  // it, so this never bit a player — but every diagnostic that freezes a scene
  // and hands control back (cine-shoot, f3/f4/f5 A/B tools) was one stop/start
  // away from measuring twice the work and calling it a regression.
  start() {
    if (this._raf !== null && this._raf !== undefined) return;  // already driving
    this.running = true;
    this._lastFrameTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._raf !== null && this._raf !== undefined) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _loop() {
    this._raf = null;
    if (!this.running) return;
    this._raf = requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const rawMs = now - this._lastFrameTime;
    const dt = Math.min(rawMs / 1000, 0.05); // Cap delta at 50ms
    this._lastFrameTime = now;

    // Frame-time governor. Reads the RAW delta (not the 50ms-clamped one) so a
    // machine that is genuinely missing frames is seen missing them. The very
    // first frame has _lastFrameTime = 0 and therefore a nonsense delta; it is
    // dropped by the >100ms filter inside, along with room builds and tab
    // switches.
    if (rawMs > 0) this._updateAdaptiveQuality(rawMs);

    // Fluorescent flicker — barely-perceptible hum with the odd buzz-dip.
    // DESIGN FEATURE (subliminal dread), not a bug: the four rooms carrying
    // `lighting.flicker` are meant to breathe, and the amplitude is a LOOK
    // value, so it is left exactly as committed. Round 1 of the perf pass
    // halved it to keep a global key-intensity wobble from sitting on top of
    // the temporal-stability instruments; QA correctly rejected that as an
    // unsigned look change. The instrument problem is solved on the INSTRUMENT
    // side instead — the harness pins `_flicker = false` and restores
    // `_dirLight.intensity = _baseDirIntensity` before any A/B capture, which
    // is strictly better because it removes the variable rather than shrinking
    // it. See tools/perf-harness.mjs (FREEZE_LOOK).
    if (this._flicker && this._dirLight) {
      const t = now * 0.001;
      let f = 1 + Math.sin(t * 47.0) * 0.012 + Math.sin(t * 13.7) * 0.008;
      if (Math.random() < 0.0015) f *= 0.72;
      this._dirLight.intensity = this._baseDirIntensity * f;
    }

    // Shadow-map cadence (see init()). Set needsUpdate BEFORE the update
    // callback, because states render from inside it via renderScene().
    if (this._shadowDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this._shadowDirty = false;
      this._shadowFrames = 0;
    } else if (this._shadowInterval > 0 && ++this._shadowFrames >= this._shadowInterval) {
      this.renderer.shadowMap.needsUpdate = true;
      this._shadowFrames = 0;
    }

    this.cityBackdrop?.update(dt);
    this.buildingShell?.update(dt);
    if (this._retroPass) this._retroPass.uniforms.time.value += dt;

    // Exterior sleeve mirrors the walk-behind wall fade — the shell
    // goes glassy exactly when its wall does, never blocking the player
    const sleeves = this._roomFX?.userData.sleeves;
    if (sleeves) {
      for (const s of sleeves) {
        if (s.mat.opacity !== s.wall.opacity) s.mat.opacity = s.wall.opacity;
      }
    }

    if (this._updateCallback) {
      this._updateCallback(dt);
    }
    // States handle their own rendering via renderScene().
    // Default render for states that don't explicitly render (title, menu).
    if (!this._skipDefaultRender) {
      this.renderScene(this.scene, this.camera);
    }
    this._skipDefaultRender = false;
  }

  // Call this in update() to skip the default render for this frame
  skipDefaultRender() {
    this._skipDefaultRender = true;
  }

  // Render any scene/camera (combat, arcade, default) through the full
  // post stack. Pass gating happens here — this is the one choke point;
  // every state MUST render via this method (never renderer.render
  // directly) or it silently bypasses AO/bloom/tilt-shift/grade AND the
  // output transform that lives in GradePass.
  renderScene(scene, camera) {
    // When the loop is NOT driving the frame, the shadow cadence in _loop()
    // never runs — tools/cine-shoot.mjs stops the engine, hand-steps the sim
    // and calls this directly, and a stale shadow map would bake a lagging
    // character shadow into a cinematic still. Off the loop, correctness wins.
    if (!this.running) this.renderer.shadowMap.needsUpdate = true;
    this._renderPass.scene = scene;
    this._renderPass.camera = camera;
    this._configurePostFor(scene, camera);

    // ── ONE world-matrix update per FRAME, not one per RENDER ──────────────
    // `WebGLRenderer.render()` starts with
    //     if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    // and a composer frame calls render() several times over the SAME scene:
    // the N8AO beauty pass, then its two transparency sub-passes. Nothing moves
    // between them — the game loop has already finished — so the 2nd and 3rd
    // full traversals of a ~1000-node graph recompute matrices that are already
    // correct.
    //
    // Measured (CPU profile, cubicle_farm, CPU 4x, screenshots/perf/f6/
    // cpuprofile.json): `updateMatrixWorld` 8.3ms/frame + `multiplyMatrices`
    // 2.4ms/frame — the single largest non-idle entry in the profile, and larger
    // than any draw-submission entry.
    //
    // So: update once, here, then tell three it is already done. Exactly
    // equivalent by construction (this is the same call three would make, made
    // once instead of three times), and the flag is restored in a `finally` so a
    // throwing pass cannot leave the scene with matrices pinned — which would
    // freeze every animation in the game.
    // `window.__frameMatrix = false` restores three's per-render behaviour, so
    // the harness can price this in one interleaved session instead of across
    // two runs separated by a thermal drift the report measures at ~24%.
    const autoMatrix = scene.matrixWorldAutoUpdate;
    const oncePerFrame = typeof window === 'undefined' || window.__frameMatrix !== false;
    if (oncePerFrame && autoMatrix !== false) {
      scene.updateMatrixWorld();
      scene.matrixWorldAutoUpdate = false;
    }
    try {
      this.composer.render();
    } finally {
      scene.matrixWorldAutoUpdate = autoMatrix;
    }
  }
}

export const Engine = new EngineClass();
