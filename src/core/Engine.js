import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TiltShiftPass } from '../effects/TiltShiftPass.js';
import { GradePass } from '../effects/GradePass.js';
import { createVoidBackdrop, RECOMMENDED_FOG } from '../effects/VoidBackdrop.js';
// Default interior light colors — Severance clinical white-green.
// Deliberately COOLER than COLORS.FLUORESCENT (warm cream): the wall and
// floor materials are warm beige, and cool light over warm surfaces
// lands on clinical white instead of khaki. Room `lighting` blocks still
// override both per room.
const ENGINE_FLUORESCENT = 0xf1f7ef;
const ENGINE_AMBIENT = 0xe9f1ec;

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
      antialias: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    const pr = Math.min(window.devicePixelRatio, 2);
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

    // The display-case signature: tilt-shift miniature blur. Ortho
    // cameras only (exploration/title) — gated per frame; combat's
    // perspective camera never receives it.
    this._tiltShiftPass = new TiltShiftPass(this.width * pr, this.height * pr, {
      focusCenter: 0.5,
      bandWidth: 0.26,
      maxBlur: 9.5,
      strength: 1.0,
    });
    this.composer.addPass(this._tiltShiftPass);

    // Filmic grade — the time-of-day carrier (replaces RETRO_GRADES).
    // Always on, for every scene; final look pass before retro.
    this._gradePass = new GradePass(this._pendingGradeKey || 'afternoon');
    this._pendingGradeKey = null;
    this.composer.addPass(this._gradePass);

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
      this._n8aoPass = pass;
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
      if (this._pendingTimeOfDay) this.cityBackdrop.setTimeOfDay(this._pendingTimeOfDay);
      if (this._pendingStreetLevel !== undefined) this.cityBackdrop.setStreetLevel(this._pendingStreetLevel);
    });

    // The ghost of the building around the current room
    import('../effects/BuildingShell.js').then(({ BuildingShell }) => {
      this.buildingShell = new BuildingShell(this.scene);
      if (this._pendingShellRoom) this.buildingShell.buildFor(this._pendingShellRoom);
    });
  }

  // Story-driven time of day — drives the city backdrop palette + fog
  // and the filmic color grade (GradePass owns grades now; RetroPass's
  // grade uniform stays neutral). Room interior rigs stay authoritative
  // (applyRoomLighting).
  setTimeOfDay(key) {
    this._todKey = key;
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

  // Degrade/settings switches for the display-case stack
  setAmbientOcclusion(on) {
    this._aoOn = !!on;
  }

  setTiltShift(on) {
    this._tiltShiftOn = !!on;
  }

  // Re-gate the post chain for whatever scene/camera this frame renders.
  // Tilt-shift: orthographic cameras only (exploration/title/arcade) —
  // combat's perspective camera gets none. AO: only the exploration
  // scene through the main ortho camera (N8AOPass bakes those refs; see
  // the construction-site comment).
  _configurePostFor(scene, camera) {
    const ortho = camera.isOrthographicCamera === true;
    if (this._tiltShiftPass) {
      this._tiltShiftPass.enabled = ortho && this._tiltShiftOn;
      if (this._tiltShiftPass.enabled) this._keyTiltShiftToRoom(scene, camera);
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
    this._flicker = !!c.flicker;
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
    if (amb >= 0.4) {
      const poolMat = new THREE.MeshBasicMaterial({
        map: this._fxRadialTexture(), color: 0xdfeee2, transparent: true,
        opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false,
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
      // The fixtures: long continuous fluorescent RUNS at wall-top
      // height, one per ceiling row — Severance's linear top-light,
      // architectural rather than per-panel confetti (short floating
      // bars read as litter on the floor from the iso camera; long
      // strips crossing over partitions read unmistakably as ceiling).
      // OFFICE RIG ONLY: mood-lit rooms (garage, dim concrete) keep
      // their pools but get no office fixtures — there, partial
      // occlusion chops the runs into floating white fragments.
      const officeRig = (roomData.lighting?.dirIntensity ?? 1.15) >= 0.9;
      const runLen = Math.max(2.5, w - 3.2);
      const housingGeo = new THREE.BoxGeometry(runLen + 0.14, 0.05, 0.44);
      const housingMat = new THREE.MeshBasicMaterial({ color: 0x3a403d });
      const stripGeo = new THREE.BoxGeometry(runLen, 0.055, 0.20);
      // Diffuser just past 1.0 linear: ACES rolls it to clean glare-white
      // and it GRAZES the bloom threshold — lit, but the room stays the
      // subject (1.55+ turned the fixtures into light sabers)
      const stripMat = new THREE.MeshBasicMaterial();
      stripMat.color.setRGB(0.98, 1.06, 0.99);
      const cxm = (w - 1) / 2;
      for (let j = 0; officeRig && j < nz; j++) {
        const pz = 1.0 + (h - 2) * ((j + 0.5) / nz) - 0.5;
        // Housing UNDER the diffuser: the iso camera looks down on the
        // fixture, so the hot surface must be the top face; the wider
        // dark housing beneath rims it so the glow reads mounted.
        const housing = new THREE.Mesh(housingGeo, housingMat);
        housing.position.set(cxm, 2.42, pz);
        g.add(housing);
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(cxm, 2.465, pz);
        g.add(strip);
      }
    }

    // 3. Lacquer gloss ramp — one soft diagonal sheen across the floor;
    // hardwood floors get the stronger lacquered response
    const gloss = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this._fxGlossTexture(), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: roomData.floorPattern === 'hardwood' ? 0.10 : 0.045,
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
        'elevatorDoors', 'cobweb', 'cableTray',
      ]);
      const box = new THREE.Box3();
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      for (const child of roomGroup.children) {
        const type = child.userData?.furnitureType;
        if (!type || SKIP.has(type)) continue;
        box.setFromObject(child);
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

    // 5. Neon reflection smears — saturated signage catching in the
    // lacquer (data-driven off furniture type, no room special-casing)
    for (const item of (roomData.furniture || [])) {
      if (item.type !== 'neonSign') continue;
      const south = item.rotation && Math.abs(item.rotation - Math.PI) < 0.1;
      const dir = south ? -1 : 1;
      const smear = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 3.6),
        new THREE.MeshBasicMaterial({
          map: this._fxSmearTexture(), color: 0xe94560, transparent: true,
          opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      smear.rotation.x = -Math.PI / 2;
      if (south) smear.rotation.z = Math.PI;
      smear.position.set(item.x, 0.018, item.z + dir * 2.0);
      smear.renderOrder = 3;
      g.add(smear);
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

    this.scene.add(g);
    this._roomFX = g;
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

    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
  }

  onUpdate(callback) {
    this._updateCallback = callback;
  }

  start() {
    this.running = true;
    this._lastFrameTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const dt = Math.min((now - this._lastFrameTime) / 1000, 0.05); // Cap delta at 50ms
    this._lastFrameTime = now;

    // Fluorescent flicker — barely-perceptible hum with the odd buzz-dip
    if (this._flicker && this._dirLight) {
      const t = now * 0.001;
      let f = 1 + Math.sin(t * 47.0) * 0.012 + Math.sin(t * 13.7) * 0.008;
      if (Math.random() < 0.0015) f *= 0.72;
      this._dirLight.intensity = this._baseDirIntensity * f;
    }

    this.cityBackdrop?.update(dt);
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
    this._renderPass.scene = scene;
    this._renderPass.camera = camera;
    this._configurePostFor(scene, camera);
    this.composer.render();
  }
}

export const Engine = new EngineClass();
