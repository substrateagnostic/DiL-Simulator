import * as THREE from 'three';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { MESHY_MODE } from '../utils/constants.js';
import * as MeshyCast from './MeshyCast.js';
import { MeshyAnimator } from './MeshyAnimator.js';
import * as MeshyProps from './MeshyProps.js';
import { groundOffsets } from './MeshyRetarget.js';
import { Tween } from '../utils/tween.js';

// FOOT PLANT, measured once per (model, clip set) per session. The shared clips
// are authored on andrew's hips, so without this every character stands on
// andrew's hip height instead of its own — the whole cast hovered 0.06–0.39 m
// over the arena floor while its contact shadow stayed planted.
//
// The key carries the stance clip, not just the model id: two character ids can
// stage the SAME GLB (the roguelite client pool resolves six bodies out of seven
// ids) while hashing to different calm stances, and a336 and a338 do not sit at
// the same height.
const GROUND_OFFSETS = new Map();

function getGroundOffsets(modelId, model, clips, restPose) {
  const key = `${modelId}|${clips.idle?.uuid ?? 'none'}`;
  if (!GROUND_OFFSETS.has(key)) {
    GROUND_OFFSETS.set(key, groundOffsets(model, clips, { restore: restPose }));
  }
  return GROUND_OFFSETS.get(key);
}

// Per-boss authorship: which held silhouette + attack gesture each character
// uses. Named bosses get bespoke choreography; everyone else gets a generic
// coiled "ready" stance and a committed shove so no enemy is a limp mannequin.
const SIGNATURE_BY_CHAR = { karen: 'karen', chad: 'chad', grandma: 'grandma' };
const ATTACK_VARIANT_BY_CHAR = { karen: 'attack_karen', chad: 'attack_chad', grandma: 'attack_grandma' };

// Multi-combatant combat scene.
// Renders 1+ enemies on the left/center stage and 1+ allies on the right.
// Per-target animations: enemyHurtAnim(idx), enemyAttackAnim(idx), enemyDefeatAnim(idx).
// Backward-compat: methods without an index default to the primary enemy / Andrew.

export class CombatScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    // Multi-combatant state
    this.enemyGroups = [];     // [{ group, animator, baseX, baseZ, baseRotY, baseScale, characterId }]
    this.allyGroups = [];      // same shape as enemyGroups but on player side
    this.targetMarker = null;  // ring under selected target enemy
    this.bgMesh = null;
    this.time = 0;
    this.shakeAmount = 0;
    this.flashTimer = 0;
    this.flashColor = null;
    // CAMERA LIFT (V8.1). The rig used to sit at y 1.5 looking at y 0.95, which
    // put the ground line at 565 px of an 810 px frame — 245 px of empty floor
    // under the enemy's shoes and not enough sky for anyone taller than about
    // 2.3 world-units. Camera and look target are raised BY THE SAME 0.55, so
    // the pitch is unchanged and this is a pure vertical reframe, not a new
    // downward angle: the shot translates, the perspective does not. Sized off
    // the framing law's ceiling (STAGE.HI = 2.70) so the tallest figure the
    // stage can ever produce crowns at ~193 px — 48 px clear of the enemy
    // nameplate panel, which occupies y 15..145.
    this._basePos = { x: 0, y: 2.05, z: 5 };
    // Hit feel
    this.freezeTimer = 0;     // hit-stop: freezes all animation briefly on big hits
    this._punchT = 1;         // camera punch-in progress (1 = idle)
    this._punchAmount = 0;
    this._introT = 1;         // enemy slide-in progress (1 = done)

    // ── Cinematic camera rig (driven by CombatCinematics) ────────────────
    // Every authored camera move is an OFFSET layered on _basePos / _baseLook
    // and always eases back toward zero, so the camera is GUARANTEED to
    // return to _basePos when a timeline zeroes its targets ("always return
    // to _basePos"). The rig also owns lookAt so pans/orbits are possible.
    this._baseLook = { x: 0, y: 1.50, z: 0 };  // +0.55 with _basePos.y — see the lift note above
    this._cinePos = { x: 0, y: 0, z: 0 };
    this._cinePosTarget = { x: 0, y: 0, z: 0 };
    this._cineLook = { x: 0, y: 0, z: 0 };
    this._cineLookTarget = { x: 0, y: 0, z: 0 };
    this._camEase = 6;
    // Light-beat modulation: rim spike + backdrop darken for power beats.
    this._dim = 1; this._dimTarget = 1; this._dimTimer = null;
    this._rimBeatV = 0;
    // Technical-tag camera glitch (high-freq decaying jitter)
    this._glitchAmt = 0; this._glitchT = 0;

    this._setup();
  }

  _setup() {
    this.camera.position.set(this._basePos.x, this._basePos.y, this._basePos.z);
    this.camera.lookAt(this._baseLook.x, this._baseLook.y, this._baseLook.z);

    // ARENA RELIGHT — combat was authored against the broken output transform
    // and now renders brighter. Key/fill are pulled DOWN so combatants sit in
    // Refn dark; the two back RIMS stay strong so the silhouette separation
    // survives the darker key (Clair-Obscur close-up grammar). Base intensities
    // are stored so the cinematic rig can darken the key + spike the rim for
    // power beats and always restore them.
    const BI = { ambient: 0.30, dir: 0.60, fill: 0.52, eye: 0.30, faceKey: 0.62, rimCyan: 0.62, rimMagenta: 0.56, rimLow: 0.55, hero: 0.40 };
    this._baseIntensity = BI;

    const ambient = new THREE.AmbientLight(0xffffff, BI.ambient);
    this.scene.add(ambient);
    this.ambient = ambient;
    const dirLight = new THREE.DirectionalLight(0xffffff, BI.dir);
    dirLight.position.set(2, 5, 3);
    this.scene.add(dirLight);
    this.dirLight = dirLight;
    // Cool FRONT FILL at face height on the camera axis — lifts the faces out
    // of the venue-wash mud (addendum: "zero front fill … faces fall into
    // mud"). Kept cool-white and near-frontal so it reads the down-nodded face
    // features straight-on without flattening the Clair-Obscur key/rim drama.
    const fillLight = new THREE.DirectionalLight(0xc6d4f2, BI.fill);
    fillLight.position.set(0.3, 1.7, 7.5);
    this.scene.add(fillLight);
    this.fillLight = fillLight;
    // A second, tighter warm-neutral fill from slightly below sells the eyes on
    // the up-looking combat cam — a soft "eye light" so sockets don't read as
    // dark hollows under the brows.
    const eyeLight = new THREE.DirectionalLight(0xffe8d8, BI.eye);
    eyeLight.position.set(0, 0.4, 6);
    this.scene.add(eyeLight);
    this.eyeLight = eyeLight;
    // FACE-KEY — a soft WARM fill from front-ABOVE, raked down onto the faces.
    // The eyeLight sits BELOW the chin (y 0.4) which, alone, is textbook horror
    // under-lighting; this counter-key comes from high and slightly camera-side
    // so it lands on foreheads/cheekbones and the victim's up-tilted face,
    // killing the ghoul shadows without washing out the Refn key/rim contrast
    // (kept low + steeply raked so the backdrop and back-stage stay dark). It's
    // a first-class rig light (base intensity in BI, dimmed in update) so the
    // power-beat darken still owns it and setArenaLighting never clobbers it.
    const faceKey = new THREE.DirectionalLight(0xffdcbe, BI.faceKey);
    faceKey.position.set(0.6, 3.9, 5.6);
    faceKey.target.position.set(0.4, 1.35, 0.6);
    this.scene.add(faceKey);
    this.scene.add(faceKey.target);
    this.faceKey = faceKey;
    // Two BACK RIMS for Clair-Obscur silhouette separation on the close-ups
    // (addendum: "one cool rim/backlight per combatant"). Both sit BEHIND the
    // actors so they edge-light the outline instead of muddying the face — the
    // magenta one carries the Refn accent, the cyan one the cold key. Colors
    // are re-tinted per venue by setArenaLighting().
    const rimCyan = new THREE.DirectionalLight(0x6ea8ff, BI.rimCyan);
    rimCyan.position.set(-3.5, 3, -3.5);
    this.scene.add(rimCyan);
    this.rimCyan = rimCyan;
    const rimMagenta = new THREE.DirectionalLight(0xe94560, BI.rimMagenta);
    rimMagenta.position.set(3.5, 2.6, -3.2);
    this.scene.add(rimMagenta);
    this.rimMagenta = rimMagenta;
    // LOW back rim — the two main rims sit high (y≈3) and edge only the upper
    // body, so dark trousers (Intern's navy suit, Karen's slacks) merged into
    // the black stage below the knee ("weakest rim separation in the lineup").
    // A low, cool rim grazing from behind lifts the leg silhouette off the void.
    const rimLow = new THREE.DirectionalLight(0x7fb0ff, BI.rimLow);
    rimLow.position.set(2.2, 0.55, -3.0);
    this.scene.add(rimLow);
    this.rimLow = rimLow;
    // HERO spot — a tight warm key aimed at Andrew's mark on the front stage.
    // Power moves darken the whole venue (backdropDarken), which sank Andrew's
    // foreground body to an unlit near-black mass ("zero rim on the hero"). This
    // spot lights ONLY the ally area (cone-limited, so it never flattens the
    // back-stage enemy) and BRIGHTENS as the world dims, so the hero stays lit.
    const heroSpot = new THREE.SpotLight(0xfff0e0, BI.hero, 14, Math.PI * 0.20, 0.6, 1.0);
    heroSpot.position.set(2.9, 4.2, 5.4);
    heroSpot.target.position.set(1.62, 1.0, 2.62);
    this.scene.add(heroSpot);
    this.scene.add(heroSpot.target);
    this.heroSpot = heroSpot;

    this._createBackground();

    // Near-opaque true-black stage floor — the frame's bottom anchor
    // (Refn blacks; the ribbon backdrop must never flood the floor)
    const groundGeo = new THREE.PlaneGeometry(14, 7);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x050508, transparent: true, opacity: 0.88 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    // Faint magenta stage pool — separates the actors' feet from the
    // black floor (Refn black needs one wet-reflection accent, and the
    // combatants are what it should catch)
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = poolCanvas.height = 128;
    const pctx = poolCanvas.getContext('2d');
    const pg = pctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    pg.addColorStop(0, 'rgba(255,255,255,0.75)');
    pg.addColorStop(0.45, 'rgba(255,255,255,0.25)');
    pg.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = pg;
    pctx.fillRect(0, 0, 128, 128);
    // W / final residuals: this 128px alpha ramp is stretched across an 11×5.5
    // world plane, so its 8-bit steps read as concentric rings in the magenta
    // stage-pool (rider: "steps in the magenta stage-pool gradient"). Dither the
    // alpha channel by ~±2% per pixel to dissolve the rings before upload.
    const pimg = pctx.getImageData(0, 0, 128, 128);
    const pdata = pimg.data;
    for (let i = 3; i < pdata.length; i += 4) {
      pdata[i] = Math.max(0, Math.min(255, pdata[i] + (Math.random() - 0.5) * 6));
    }
    pctx.putImageData(pimg, 0, 0);
    const poolTex = new THREE.CanvasTexture(poolCanvas);
    poolTex.colorSpace = THREE.SRGBColorSpace;
    poolTex.minFilter = THREE.LinearFilter;
    poolTex.generateMipmaps = false;
    const stagePool = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 5.5),
      new THREE.MeshBasicMaterial({
        map: poolTex, color: 0xe94560, transparent: true, opacity: 0.10,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    stagePool.rotation.x = -Math.PI / 2;
    stagePool.position.set(0, 0.004, 0.4);
    stagePool.renderOrder = 1;
    this.scene.add(stagePool);
    this.stagePool = stagePool;
    this._bounceMats = [];   // contact-glow mats, retinted per arena

    // Target selector ring (invisible until used)
    const ringGeo = new THREE.RingGeometry(0.6, 0.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4466, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.targetMarker = new THREE.Mesh(ringGeo, ringMat);
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.position.y = 0.02;
    this.targetMarker.visible = false;
    this.scene.add(this.targetMarker);
  }

  _createBackground() {
    const bgGeo = new THREE.PlaneGeometry(30, 20);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // Deep-Refn-black base palette: three near-black voids so the
        // single magenta accent (uColor4) reads as controlled edge light,
        // not an all-over red wash — matches the night-city stills
        uColor1: { value: new THREE.Color(0x050309) },
        uColor2: { value: new THREE.Color(0x080a16) },
        uColor3: { value: new THREE.Color(0x1c0b1e) },
        uColor4: { value: new THREE.Color(0xe94560) },
        // Global dim (1 = full). The cinematic rig drives this toward ~0.3 for
        // the power-move "backdrop darkens" beat, then eases it back to 1.
        uDim: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform float uDim;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          float t = uTime * 0.3;
          float wave1 = sin(uv.x * 6.0 + t * 2.0) * 0.1;
          float wave2 = sin(uv.y * 4.0 + t * 1.5) * 0.1;
          float wave3 = sin((uv.x + uv.y) * 8.0 + t * 3.0) * 0.05;
          vec2 distorted = uv + vec2(wave1 + wave3, wave2 + wave3);
          float pattern = sin(distorted.x * 12.0 + t) * sin(distorted.y * 12.0 - t * 0.7);
          vec2 center = distorted - 0.5;
          float angle = atan(center.y, center.x);
          float dist = length(center);
          float spiral = sin(angle * 3.0 + dist * 10.0 - t * 4.0);
          // Wave-2: WIDER blend ramps so the colour lobes cross-dissolve
          // instead of terminating in a readable arc edge (the fight-karen
          // "blue lobe seam against the red field" note).
          float blend1 = smoothstep(-0.6, 0.6, pattern);
          float blend2 = smoothstep(-0.5, 0.5, spiral);
          // Near-black ribbon field...
          vec3 color = mix(
            mix(uColor1, uColor2, blend1),
            mix(uColor3, uColor3 * 1.7, blend1),
            blend2
          );
          // ...with magenta as a controlled accent on a few ribbon
          // edges only — never an all-over wash. Wave-2 R2: much WIDER accent
          // ramps so the red arcs cross-dissolve over a long gradient instead
          // of terminating in a readable curved cyc edge (the fight-karen
          // "hard arc framing the enemy" note).
          float accent = smoothstep(0.20, 1.05, pattern) * smoothstep(-0.15, 0.95, spiral);
          color += uColor4 * accent * 0.72;
          color *= 0.8 + 0.2 * sin(t * 1.5);
          // Continuous radial falloff to black at the frame edges — the lobes
          // dissolve into the void instead of one lobe ending in a hard arc
          // against its neighbour. Wave-2 R2: the fade band is widened (starts
          // brighter near center, reaches black much later) so the cyc edge is
          // unfindable at contact-sheet zoom.
          // Round-3: falloff pushed ~20% further (1.28 -> 1.55) so the colour
          // lobes reach black EARLIER — the upper-left arc seam now dies well
          // before the frame edge instead of terminating against it.
          float vig = smoothstep(1.45, 0.10, length(center) * 1.55);
          color *= vig;
          // Dissolve the bottom of the backdrop into TRUE black right at the
          // stage-floor line (uv.y ~0.3 in world), so the swirl fades into
          // the floor instead of terminating in a razor-straight seam
          // (critic: "a visible stage seam"). Fully black below the floor,
          // ramping back to full a little above it.
          color *= smoothstep(0.27, 0.52, uv.y);
          // Cinematic backdrop-darken beat (power moves): pull the whole field
          // toward black so the single rim beat + gold burst own the frame.
          color *= uDim;
          // S2.5: screen-space hash dither (~1.6% span) breaks the 8-bit
          // banding in the near-black navy field — the smooth ramps quantised
          // into visible arcs on the deep blue lobes.
          // Wave-3: dither lifted (4→7 /255) — the amber (Chad) and green
          // (Intern) washes are brighter low-saturation ramps that still showed
          // concentric 8-bit banding through the radial vignette at the old span.
          // W / final residuals: switched to a TRIANGULAR-PDF dither (sum of two
          // decorrelated hashes, remapped to [-1,1]). A flat single-hash dither
          // left faint concentric rings in fight-chad's warm vignette and a
          // trace in the karen blue/red field — the tone-map crushed the uniform
          // noise in the mid-tones where the banding lived. TPDF puts more of its
          // energy where quantisation steps occur, so the rings dissolve at the
          // same ~peak span without adding visible grain to the flat blacks.
          float d1 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float d2 = fract(sin(dot(gl_FragCoord.xy, vec2(39.346, 11.135))) * 26742.1234);
          color += (d1 + d2 - 1.0) * (7.5 / 255.0);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.bgMesh.position.set(0, 4, -8);
    this.scene.add(this.bgMesh);
  }

  // Build one combatant. The Meshy cast is the DEFAULT on the combat stage
  // (producer ruling 08-01); `?nomeshy` or any per-character load failure falls
  // this slot back to the procedural v7 build. Returns { group, animator }
  // shaped exactly like the procedural pair either way, so nothing downstream
  // knows which cast it got.
  // Returns { group, animator, figureH } where figureH is the combatant's height
  // in MODEL units at scale 1 — the number the stage-framing law measures from.
  _buildCombatant(config, id) {
    if (MESHY_MODE) {
      const built = this._buildMeshyCombatant(config, id);
      if (built) return built;
    }
    const group = buildCharacter(config, { detailed: true });
    const animator = new CharacterAnimator(group);
    // max.y, not getSize().y — same reason the Meshy ruler strips accessories:
    // a prop below the floor plane would inflate the reading.
    const figureH = new THREE.Box3().setFromObject(group).max.y;
    return { group, animator, figureH };
  }

  // ── STAGE FRAMING LAW ────────────────────────────────────────────────────
  // The stage scale used to be a flat 1.9 with no reference to how tall the
  // figure actually is. The cast spans 1.21 m (grandma) to 1.79 m (the Chief of
  // Restructuring) — a 48% spread — so a constant multiplier put the Chief at
  // 3.40 world-units on a stage whose frame holds about 2.8, and SEVEN of the
  // nine story enemies had their scalp off the top edge of the combat camera
  // (measured, 1440x810: chief −74 px, regional_director −58, meredith_boss −58,
  // regional −56, security_guard −36, chad −35, skip_boss −28, karen +7).
  //
  // The law: on-stage height is a COMPRESSED remap of true height. Everyone
  // lands between STAGE_LO and STAGE_HI world-units, so the tallest figure the
  // frame ever has to hold is STAGE_HI — a bound that holds for any future
  // character, however tall — while the ordering survives: the Chief still
  // stands visibly taller than grandma (2.69 vs 2.29), just not by half again.
  //
  // Straight `budget / height` was the other candidate and was rejected: it
  // collapses everyone at or above ~1.45 m onto exactly one height, which reads
  // as a cast of identical mannequins. The camera lift (see _basePos) is sized
  // for STAGE_HI, so the two halves are one solve.
  static STAGE = {
    H_LO: 1.20, H_HI: 1.80,   // the cast's true height band
    LO: 2.28, HI: 2.70,       // the on-stage band it maps onto (world units)
    // SCALE_MIN only ever binds on the Algorithm, the one non-human body on the
    // stage (procedural monolith, 2.17 units tall at scale 1). At the old flat
    // 1.9 it stood 4.12 units and was off the top of the frame entirely; 1.15
    // is the value that finally puts its crown clear of the nameplate row.
    SCALE_MIN: 1.15, SCALE_MAX: 1.95,
    // Group fights used to take an extra 1.6/1.9 trim purely to keep three heads
    // in frame. The law already bounds height, and setCombatants dollies the rig
    // to z 5.9 for a crowd, so a second trim just shrank the trio into the floor
    // (measured crowns at 297–323 px against a 130 px nameplate row — a third of
    // the frame empty above them). One law for everyone.
    GROUP: 1.0,
  };

  _stageScale(figureH, count) {
    const S = CombatScene.STAGE;
    if (!(figureH > 0.2)) return count > 1 ? 1.6 : 1.9;   // ruler broke — old constants
    const t = Math.max(0, Math.min(1, (figureH - S.H_LO) / (S.H_HI - S.H_LO)));
    const worldH = S.LO + (S.HI - S.LO) * t;
    const scale = Math.max(S.SCALE_MIN, Math.min(S.SCALE_MAX, worldH / figureH));
    return count > 1 ? scale * S.GROUP : scale;
  }

  // Meshy path. The model comes from MeshyCast's session cache, which
  // ExplorationState warmed during the combat fade — so this is SYNCHRONOUS and
  // the stage is never built empty. A cache miss (not preloaded, 404, parse
  // failure) returns null and the caller builds procedurally for that slot only.
  //
  // Scale is MEASURED, not assumed: a throwaway procedural build provides the
  // target world height, the GLB's own Box3 provides the native height, and the
  // ratio goes on an inner wrapper so CombatScene keeps driving the OUTER
  // group's transform exactly as it does for procedural characters (hurt
  // knockback, defeat spin, baseScale resets).
  _buildMeshyCombatant(config, id) {
    const modelId = MeshyCast.resolveId(id, config);
    const inst = MeshyCast.instance(modelId);
    if (!inst) return null;

    // THE RULER IS BUILT WITHOUT ACCESSORIES. getSize().y is max MINUS min, and
    // a held prop can hang BELOW the floor plane: the golf putter
    // (CharacterBuilder 'golf_putter' — shaft at y −0.35, head at y −0.70)
    // drives the probe's min.y to −0.084 on skip_boss and −0.065 on regional, so
    // the ruler over-read their height by 5.3% and 3.9% and the Meshy body was
    // scaled up by that margin — a boss rendered materially bigger than the cast
    // for no authored reason. Stripping accessories is the intention-revealing
    // form (a body ruler measures the body) and is immune to the next prop
    // someone hangs off a hand. Measured effect: skip_boss 1.680 → 1.596,
    // regional 1.724 → 1.660, grandma 1.214 → 1.211 (cane ferrule, 4 mm),
    // chad 1.708 → 1.707 (cap, 1 mm); the other 34 configs do not move.
    const probe = buildCharacter({ ...config, accessories: [] }, { detailed: false });
    const probeH = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3()).y;
    probe.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); }); // materials are cached — never dispose

    const group = new THREE.Group();
    // Dummy named refs (CharacterBuilder contract) so any consumer that pokes
    // group.body / group.head / limbs finds an inert node instead of throwing.
    for (const ref of ['body', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
      const dummy = new THREE.Group();
      group.add(dummy);
      group[ref] = dummy;
    }

    const model = inst.scene;
    // Bone-socketed props go on BEFORE the scaled wrapper, so every measurement
    // inside attachProps is in the model's own units (grandma's cane).
    const propTicks = inst.def.props ? MeshyProps.attachProps(model, inst.def.props) : [];
    // Measured at parse time on the un-cloned model (MeshyCast.load) — see the
    // note there; measuring the clone here reports zero.
    const glbH = inst.nativeHeight || new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
    const inner = new THREE.Group();
    // The procedural probe is only a RULER, and a ruler can lie: a cosmetic
    // accessory that projects a stray vertex puts the probe's AABB in the
    // thousands, and the ratio then scales the Meshy model off the planet
    // (measured: Andrew came out at 853725x with a cosmetic equipped, an
    // invisible ally on the front stage). Clamp to a sane human band and fall
    // back to the character's own height when the ruler is clearly broken.
    let fit = glbH > 0 ? probeH / glbH : 1;
    if (!(fit > 0.2 && fit < 5)) {
      console.warn(`[meshy] ${id}: implausible fit ${fit.toFixed(3)} (probeH=${probeH.toFixed(3)} glbH=${glbH.toFixed(3)}) — using 1:1`);
      fit = 1;
    }
    inner.scale.setScalar(fit);
    inner.rotation.y = inst.def.yaw || 0;
    inner.add(model);
    group.add(inner);

    MeshyCast.applyTint(model, id, config);

    const clips = MeshyCast.clipsFor(inst, id, modelId);
    group.updateMatrixWorld(true);
    const ground = getGroundOffsets(modelId, model, clips, inst.restPose);
    const animator = new MeshyAnimator(model, clips, {
      timeScale: inst.def.timeScale,
      // The reaction layer is cast for each body's BUILD, and the two
      // performances of a beat are not the same length. Without this the same
      // punch reads as 2.3s on one enemy and 4.4s on the next.
      timeScales: MeshyCast.beatTimeScales(clips),
      // Some characters share a calm stance (the slate's reuse rows), so a
      // group fight would breathe in unison without a per-character phase.
      phase: MeshyCast.phaseFor(id),
      props: propTicks,
      ground: { node: inner, offsets: ground },
    });
    group.userData.meshy = true;
    // The GLB is fitted to the probe by `fit`, so this IS the on-stage height at
    // scale 1 — including the clamped-ruler fallback, where fit is 1.
    return { group, animator, figureH: glbH * fit };
  }

  // Set up the combat stage. enemyIds/partyIds are CHARACTER_CONFIGS keys.
  // partyIds defaults to ['andrew']. player is the Player entity (for cosmetic equipment merge).
  setCombatants(enemyIds, partyIds, player) {
    this._clearGroups();

    // Multi-enemy fights pull the camera back so nobody's head crops out
    this._basePos.z = enemyIds.length > 1 ? 5.9 : 5;

    // Place enemies on the back stage
    const positions = this._enemyPositions(enemyIds.length);
    for (let i = 0; i < enemyIds.length; i++) {
      const id = enemyIds[i];
      const config = CHARACTER_CONFIGS[id];
      if (!config) continue;
      const { group, animator, figureH } = this._buildCombatant(config, id);
      animator.setCombatMode(true);   // quiet idle: no body-shell morph at close range
      const pos = positions[i];
      // MEASURED, not constant — see _stageScale. A flat 1.9 decapitated seven
      // of the nine story enemies in the shipping combat view.
      const scale = this._stageScale(figureH, enemyIds.length);
      group.position.set(pos.x + 5.0, 0, pos.z);
      group.scale.setScalar(scale);
      // Face the camera from the start. Enemies used to build at Math.PI and let
      // the facing-lerp swing them 180° to camera-front — but the intro banner is
      // captured mid-swing, so the boss debuted as a limp back-view (critic #8).
      // The slide-in already provides the entrance; the reveal is the SILHOUETTE.
      group.rotation.y = 0;
      animator.setFacing(0);
      this._addContactBounce(group, scale);
      this.scene.add(group);
      // Snap to a signature silhouette so the intro reads as a character, not a
      // limp A-stand (critic: "a P5 intro gives the boss a silhouette pose").
      animator.setSignaturePose(SIGNATURE_BY_CHAR[id] || 'ready');
      const attackGesture = ATTACK_VARIANT_BY_CHAR[id] || 'attack_shove';
      this.enemyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: 0, baseScale: scale, characterId: id, introDelay: i * 0.12, attackGesture });
    }
    // Enemies slide in from stage right over ~half a second
    this._introT = 0;

    // Allies face TOWARD the enemy (back-3/4 to camera — classic JRPG blocking).
    // Compute the enemy centroid so each ally turns to actually confront the
    // threat instead of the old hardcoded partial-camera angle. With forward =
    // (sinθ, cosθ) (enemy at rot 0 faces +z / the camera), θ = atan2(dx, dz)
    // aims the ally's front at the enemy — a strong −z component puts the back
    // to the lens, an −x component turns them onto the boss.
    let ecx = 0, ecz = 0;
    if (this.enemyGroups.length) {
      for (const e of this.enemyGroups) { ecx += e.baseX; ecz += e.baseZ; }
      ecx /= this.enemyGroups.length; ecz /= this.enemyGroups.length;
    }

    // Place party on the front stage
    const partyPositions = this._allyPositions(partyIds.length);
    for (let i = 0; i < partyIds.length; i++) {
      const id = partyIds[i];
      const config = CHARACTER_CONFIGS[id];
      if (!config) continue;
      // Andrew gets cosmetic merge; other allies use base config
      let combatConfig = { ...config };
      if (id === 'andrew' && player && player.equipped) {
        const extraAccessories = [...(combatConfig.accessories || [])];
        for (const slot of Object.keys(player.equipped)) {
          const cosId = player.equipped[slot];
          if (cosId) extraAccessories.push('cosmetic_' + cosId);
        }
        combatConfig.accessories = extraAccessories;
      }
      const { group, animator } = this._buildCombatant(combatConfig, id);
      animator.setCombatMode(true);
      const pos = partyPositions[i];
      group.position.set(pos.x, 0, pos.z);
      // Scale trimmed with the move forward (1.8→1.45): at ~2.4 units from the
      // lens a 1.8-scale figure is ~2.9 world-units tall and crops its own head.
      group.scale.setScalar(1.45);
      // Turn to face the enemy centroid, but hold ~30% shy of dead-on (blended
      // toward the stage-left profile). A dead-on turn buries the face toward the
      // BACK stage where the enemy stands, so the reaction-cut camera can only
      // recover it by crossing down beside the enemy — where it clips into the
      // enemy's body. Holding a quarter shy keeps a clear back-3/4 "confronting
      // the boss" read in the wide/rest frames while angling the face enough to
      // the SIDE that a safe front-left victim camera catches it (verified on the
      // enemy-attack burst). setFacing() locks the angle into the animator so
      // CharacterAnimator._updateFacing (which eases rotation.y toward facingAngle
      // every frame) HOLDS the block instead of drifting the ally to camera-front
      // over the fight (facingAngle used to default to 0, silently un-blocking).
      const enemyAngle = Math.atan2(ecx - pos.x, ecz - pos.z);
      const faceRotY = enemyAngle + (-Math.PI / 2 - enemyAngle) * 0.30;
      group.rotation.y = faceRotY;
      animator.setFacing(faceRotY);
      this._addContactBounce(group, 1.45);
      this.scene.add(group);
      this.allyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: faceRotY, baseScale: 1.45, characterId: id });
    }
  }

  // Red bounce contact pool parented to a combatant so it tracks them. On the
  // true-black stage a black contact shadow is invisible (fight-karen: "her
  // black slacks dissolve into the black stage, legless torso hovering"), so
  // the grounding here is a warm ADDITIVE kiss — a red rim glow that lands on
  // the floor AND catches the bottom of the legs/shoes, planting the figure.
  _addContactBounce(group, scale) {
    if (typeof document === 'undefined') return;
    if (!CombatScene._bounceTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      CombatScene._bounceTex = new THREE.CanvasTexture(c);
      CombatScene._bounceTex.colorSpace = THREE.SRGBColorSpace;
      CombatScene._bounceTex.minFilter = THREE.LinearFilter;
      CombatScene._bounceTex.generateMipmaps = false;
    }
    const bounce = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: CombatScene._bounceTex, color: this._arenaPool ?? 0xe94560, transparent: true,
        opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    if (this._bounceMats) this._bounceMats.push(bounce.material);
    bounce.rotation.x = -Math.PI / 2;
    // Local units — parent scale (scale) turns these into a ~1.7×1.15 world
    // footprint sitting just above the black stage floor.
    const s = 1.0 / Math.max(scale, 0.001);
    bounce.scale.set(1.7 * s, 1.15 * s, 1);
    bounce.position.set(0, 0.03 * s, 0.08 * s);
    bounce.renderOrder = 3;
    bounce.userData.noFlash = true;
    group.add(bounce);

    // Dark AO contact ellipse — a tight soft shadow directly under the feet,
    // drawn OVER the red kiss (normal blend, black) so it darkens the center of
    // the spotlight pool into a grounded contact shadow. On the pure-black stage
    // outside the pool it's invisibly black-on-black; inside the red pool it
    // reads as the shadow the figure casts, planting the feet (round-3 note:
    // "her legs float above the red pool"). Same reused radial texture.
    const ao = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: CombatScene._bounceTex, color: 0x000000, transparent: true,
        opacity: 0.97, depthWrite: false,
      })
    );
    ao.rotation.x = -Math.PI / 2;
    // A DARK contact ellipse pushed forward under the shoes. Opacity is now high
    // enough that the shadow WINS at the contact line — the figure plants
    // instead of floating on the spotlight (rider: "light running under the
    // toe … she floats on the pool").
    // W / final residuals: enlarged (0.82×0.46 → 1.12×0.66) and darkened
    // (0.92 → 0.97), and pulled back closer under the soles (z 0.13 → 0.09). On
    // Karen the small tight ellipse was swamped by her especially bright red
    // wash — the bright red spilled under the toe and she hovered. The bigger,
    // blacker ellipse reaches across the hot pool so the soles get a committing
    // contact shadow that survives the spotlight.
    ao.scale.set(1.12 * s, 0.66 * s, 1);
    ao.position.set(0, 0.045 * s, 0.09 * s);
    ao.renderOrder = 4;   // after the red kiss so it darkens the pool center
    ao.userData.noFlash = true;
    group.add(ao);
  }

  // Legacy single-enemy entry point — kept for backward compatibility
  setEnemy(enemyId, player) {
    this.setCombatants([enemyId], ['andrew'], player);
  }

  _enemyPositions(count) {
    if (count <= 1) return [{ x: 0, z: 0 }];
    if (count === 2) return [{ x: -1.4, z: -0.2 }, { x: 1.4, z: -0.2 }];
    if (count === 3) return [{ x: -2.0, z: 0.0 }, { x: 0, z: -0.5 }, { x: 2.0, z: 0.0 }];
    // Fallback for 4+
    const out = [];
    const span = 2.2 * (count - 1);
    for (let i = 0; i < count; i++) {
      out.push({ x: -span / 2 + i * 2.2, z: i % 2 === 0 ? 0 : -0.4 });
    }
    return out;
  }

  // LAW 6 — the ally must be ON CAMERA, back-3/4, with the lens looking over his
  // shoulder at the foe. At x 2.2 / z 3.5 he sat ~55° off the 36° half-FOV: every
  // contact still and rest frame showed the enemy ALONE, first-person, and the
  // over-the-shoulder composition existed nowhere. Pulled inboard and forward-
  // right so he occupies the lower-right foreground and reads as the camera's
  // shoulder. x/(5−z) must stay under ~0.70 or he leaves frame again.
  _allyPositions(count) {
    if (count <= 1) return [{ x: 1.62, z: 2.62 }];
    if (count === 2) return [{ x: 1.34, z: 2.50 }, { x: 2.10, z: 3.20 }];
    if (count === 3) return [{ x: 1.06, z: 2.42 }, { x: 1.86, z: 3.06 }, { x: 2.50, z: 2.60 }];
    const out = [];
    for (let i = 0; i < count; i++) out.push({ x: 1.06 + i * 0.74, z: 2.42 + (i % 2) * 0.62 });
    return out;
  }

  _clearGroups() {
    // Meshy combatants own an AnimationMixer bound to a cloned skeleton. The
    // clone is throwaway but the mixer holds cached bindings against it, so it
    // has to be released or every fight leaks one mixer's worth of tracks.
    // Geometry/materials/textures are SHARED with the MeshyCast session cache
    // and must never be disposed here.
    // Travel tweens outlive the group they drive — a fight that ends mid-lunge
    // would otherwise keep a Tween in the global list writing into a detached
    // Object3D for the rest of the session.
    for (const e of this.enemyGroups) { e._travel?.stop(); e.animator?.dispose?.(); }
    for (const a of this.allyGroups)  { a._travel?.stop(); a.animator?.dispose?.(); }
    for (const e of this.enemyGroups) this.scene.remove(e.group);
    for (const a of this.allyGroups) this.scene.remove(a.group);
    this.enemyGroups = [];
    this.allyGroups = [];
    this._bounceMats = [];
    if (this.targetMarker) this.targetMarker.visible = false;
  }

  setBackgroundColors(c1, c2, c3, c4) {
    if (!this.bgMesh) return;
    const u = this.bgMesh.material.uniforms;
    u.uColor1.value.set(c1);
    u.uColor2.value.set(c2);
    u.uColor3.value.set(c3);
    u.uColor4.value.set(c4);
  }

  // Shake doubles as the central "hit feel" dispatcher: big hits also get
  // hit-stop and a camera punch-in, so every existing call site gains juice.
  //
  // `opts.raw` suppresses that inference. It exists for impactBeat(), which is
  // the one caller that has already decided all four channels from the beat
  // class — without it a 'power' beat would fire its own 180ms stop and then
  // shake()'s inferred 110ms on top of it.
  shake(intensity = 0.5, opts = {}) {
    if (this._settings === undefined) {
      import('../core/Settings.js').then(({ SETTINGS }) => { this._settings = SETTINGS; });
      this._settings = null;
    }
    if (this._settings && !this._settings.shake) intensity = 0;
    this.shakeAmount = intensity;
    if (opts.raw) return;
    if (intensity >= 1.0) {
      this.hitStop(0.11);
      this.punchIn(0.7);
    } else if (intensity >= 0.6) {
      this.hitStop(0.07);
      this.punchIn(0.4);
    }
  }

  // ── BEAT CLASSES ─────────────────────────────────────────────────────
  // ONE source of truth for the four impact channels, replacing the ad-hoc
  // thresholds shake() used to infer them from. The class drives hit-stop,
  // punch-in, shake and flash together, so "what a crit feels like" is a row in
  // a table instead of an intensity number guessed at 24 call sites.
  //
  // Hit-stop values are the Persona read: 3-5 frames on a normal hit, long
  // enough to register as weight, short enough that the fight does not stutter.
  static BEAT_CLASSES = {
    normal: { stop: 0.060, punch: 0.25, shake: 0.32, flash: 0.04 },
    crit:   { stop: 0.105, punch: 0.55, shake: 0.55, flash: 0.07 },
    weak:   { stop: 0.130, punch: 0.65, shake: 0.60, flash: 0.05, rim: 0.85 },
    power:  { stop: 0.180, punch: 0.90, shake: 1.10, flash: 0.12, rim: 1.30 },
    light:  { stop: 0.040, punch: 0.15, shake: 0.22, flash: 0.03 },
  };

  impactBeat(cls = 'normal', color = 0xffffff) {
    const b = CombatScene.BEAT_CLASSES[cls] || CombatScene.BEAT_CLASSES.normal;
    this.hitStop(b.stop);
    this.punchIn(b.punch);
    this.shake(b.shake, { raw: true });
    if (b.flash) this.flash(color, b.flash);
    if (b.rim) this.rimBeat(b.rim);
  }

  // ── CONTACT FRAME QUERIES ────────────────────────────────────────────
  // "When does this body's fist actually land?" in ms from the gesture call.
  // Falls back to the caller's own shipped constant when the clip carries no
  // measured contact (procedural cast, un-tabled clip, failed load), so no
  // call site can be broken by an absent row.
  allyContactMs(allyIndex = 0, role = 'attack', fallback = 220) {
    const v = this.allyGroups[allyIndex]?.animator?.contactMs?.(role);
    return (v == null || !Number.isFinite(v)) ? fallback : Math.round(v);
  }

  enemyContactMs(enemyIndex = 0, role = 'attack', fallback = 200) {
    const v = this.enemyGroups[enemyIndex]?.animator?.contactMs?.(role);
    return (v == null || !Number.isFinite(v)) ? fallback : Math.round(v);
  }

  holdAllyPose(allyIndex = 0, ms = 140) {
    this.allyGroups[allyIndex]?.animator?.holdPose?.(ms);
  }

  holdEnemyPose(enemyIndex = 0, ms = 140) {
    this.enemyGroups[enemyIndex]?.animator?.holdPose?.(ms);
  }

  // Freeze all combat animation for `seconds` — reads as impact weight
  hitStop(seconds = 0.08) { this.freezeTimer = Math.max(this.freezeTimer, seconds); }

  // Quick camera dolly toward the stage, easing back out over ~0.35s
  punchIn(amount = 0.5) {
    this._punchAmount = amount;
    this._punchT = 0;
  }

  flash(color = 0xffffff, duration = 0.15) {
    this.flashColor = new THREE.Color(color);
    this.flashTimer = duration;
  }

  // ── Cinematic camera rig API (called by CombatCinematics) ─────────────
  // Move the camera to an OFFSET pose relative to rest. pos/look are additive
  // offsets on _basePos / _baseLook. Higher ease = snappier settle. Passing
  // nulls leaves that channel where it is. Kept subtle (<~14° equivalent).
  cineCam(pos = null, look = null, ease = 6) {
    if (pos)  { this._cinePosTarget.x = pos.x || 0;  this._cinePosTarget.y = pos.y || 0;  this._cinePosTarget.z = pos.z || 0; }
    if (look) { this._cineLookTarget.x = look.x || 0; this._cineLookTarget.y = look.y || 0; this._cineLookTarget.z = look.z || 0; }
    this._camEase = ease;
  }

  // Return the camera to rest (offsets → 0). Ends every timeline.
  cineReset(ease = 3.4) {
    this._cinePosTarget.x = this._cinePosTarget.y = this._cinePosTarget.z = 0;
    this._cineLookTarget.x = this._cineLookTarget.y = this._cineLookTarget.z = 0;
    this._camEase = ease;
  }

  // A single hard rim-light spike (power-move / crit beat). Decays in update().
  rimBeat(amount = 1) { this._rimBeatV = Math.max(this._rimBeatV, amount); }

  // Dim the backdrop + key toward `amount` for `hold` ms, then release to 1.
  backdropDarken(amount = 0.32, hold = 700) {
    this._dimTarget = amount;
    clearTimeout(this._dimTimer);
    this._dimTimer = setTimeout(() => { this._dimTarget = 1; }, hold);
  }

  // High-frequency camera jitter (technical-tag glitch). Decays over `seconds`.
  glitch(amount = 0.06, seconds = 0.4) {
    this._glitchAmt = amount;
    this._glitchT = Math.max(this._glitchT, seconds);
  }

  // Apply a venue palette: backdrop swirl colors + re-tinted rim lights, so
  // the silhouette separation matches the room the fight happens in.
  setArenaLighting(palette) {
    if (!palette) return;
    if (palette.bg) this.setBackgroundColors(...palette.bg);
    if (palette.rimHot  && this.rimMagenta) this.rimMagenta.color.set(palette.rimHot);
    if (palette.rimCool && this.rimCyan)    this.rimCyan.color.set(palette.rimCool);
    if (palette.rimCool && this.rimLow)     this.rimLow.color.set(palette.rimCool);
    // Re-tint the FLOOR to the venue: the stage pool + every actor's contact
    // glow were a hardcoded red, so all arenas read as the same red-void no
    // matter the backdrop (critic: venues not distinct). Now the floor carries
    // the room's accent — navy reception, green server, purple penthouse.
    const pool = palette.pool ?? palette.rimHot;
    if (pool != null) {
      this._arenaPool = pool;
      if (this.stagePool) this.stagePool.material.color.set(pool);
      for (const m of this._bounceMats || []) m.color.set(pool);
    }
  }

  // Show/move the target reticle under enemy at the given index
  setTargetMarker(enemyIndex, visible = true) {
    if (!this.targetMarker) return;
    const e = this.enemyGroups[enemyIndex];
    if (!e || !visible) {
      this.targetMarker.visible = false;
      return;
    }
    this.targetMarker.position.set(e.baseX, 0.02, e.baseZ);
    this.targetMarker.visible = true;
  }

  hideTargetMarker() { if (this.targetMarker) this.targetMarker.visible = false; }

  // ── Per-target animations ────────────────────────────────────────────
  // Backward-compat: idx default = 0 (the primary enemy).
  // WHITE-OUT FLASH, RE-ENTRANT. Two flashes that overlap used to restore each
  // other's WHITE and leave the boss painted for the rest of the fight: flash B
  // captured `child.material` while flash A's white was still on the mesh, so
  // B's restore re-applied white, permanently. Measured on a Composure Break
  // (the Break beat fires enemyHurtAnim on top of the ability's own hit): one
  // contiguous white run from +1155 ms to +10106 ms, i.e. the enemy's own
  // materials never came back.
  //
  // Two guards, both required:
  //   1. capture the pre-flash material ONCE per mesh (`_preFlashMat`), so a
  //      second flash inside the window cannot record white as the original;
  //   2. a per-entry token, so a stale timeout cannot re-apply anything after a
  //      newer flash has taken ownership of the swap.
  // The white material is one shared static instead of an allocation per call.
  flashEnemy(duration = 0.15, idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    const token = (entry._flashToken = (entry._flashToken || 0) + 1);
    if (!CombatScene._whiteMat) CombatScene._whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    entry.group.traverse(ch => {
      if (!ch.isMesh || ch.userData.noFlash) return;
      if (!ch.userData._preFlashMat) ch.userData._preFlashMat = ch.material;   // capture ONCE
      ch.material = CombatScene._whiteMat;
    });
    setTimeout(() => {
      if (entry._flashToken !== token) return;        // a newer flash owns the swap
      entry.group.traverse(ch => {
        if (!ch.userData._preFlashMat) return;
        ch.material = ch.userData._preFlashMat;
        ch.userData._preFlashMat = null;
      });
    }, duration * 1000);
  }

  enemyAttackAnim(idx = 0, opts = {}) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('angry', 1.4);
    // BODY first: the authored per-boss limb gesture (wind-up → strike →
    // follow-through) carries the attack — the group translate below is just the
    // travel underneath it. Statue no more (critic: "the attack is camera +
    // particles + UI around a mannequin").
    entry.animator?.playGesture(opts.variant || entry.attackGesture || 'attack_shove');
    const startZ = entry.baseZ;
    const startX = entry.baseX;
    const startRotY = entry.baseRotY;
    const s = entry.baseScale;
    const contact = this.enemyContactMs(idx, 'attack', 200);
    // Anticipation: rear back and coil on frame 0 so the wind-up reads.
    entry.group.position.z = startZ - 0.6;
    entry.group.scale.set(s * 1.04, s * 0.93, s * 1.05);
    // …then drive into the player's space, ARRIVING on the contact frame rather
    // than teleporting there at a flat +160ms. Measured on the shipped build,
    // the committed two-fist shove peaked 1072-1898ms after this call while the
    // travel was over at 350ms and the camera had already cut away.
    const tw = { z: startZ - 0.6, x: startX, r: startRotY, sx: s * 1.04, sy: s * 0.93, sz: s * 1.05 };
    const apply = () => {
      if (!entry.group.parent) return;
      entry.group.position.z = tw.z;
      entry.group.position.x = tw.x;
      entry.group.rotation.y = tw.r;
      entry.group.scale.set(tw.sx, tw.sy, tw.sz);
    };
    entry._travel?.stop();
    entry._travel = new Tween(tw)
      .to({ z: startZ + 1.1, x: startX + 0.12, r: startRotY + 0.06, sx: s * 0.98, sy: s * 1.05, sz: s * 0.97 },
          Math.max(0.12, contact / 1000), 'inQuad')
      .delay(0.14)
      .to({ z: startZ, x: startX, r: startRotY, sx: s, sy: s, sz: s }, 0.22, 'outQuad')
      .onUpdate(apply)
      .onComplete(apply)
      .start();
  }

  // Scheming beat (heal / buff / debuff / confuse) — a gathering cast pose so the
  // enemy still ACTS on its non-attack turns instead of holding a dead idle.
  enemyCastAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('smug', 1.2);
    entry.animator?.playGesture('cast');
  }

  enemyHurtAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('hurt', 0.9);
    entry.animator?.playGesture('hurt');   // limb flinch — arms fly up, torso snaps back
    this.flashEnemy(0.15, idx);
    const startX = entry.baseX;
    const s = entry.baseScale;
    // Knockback + squash flinch
    entry.group.position.x = startX + 0.25;
    entry.group.rotation.z = -0.07;
    entry.group.scale.set(s * 1.07, s * 0.9, s * 1.07);
    setTimeout(() => {
      if (!entry.group.parent) return;
      entry.group.position.x = startX - 0.15;
      entry.group.rotation.z = 0.04;
      entry.group.scale.set(s * 0.97, s * 1.04, s * 0.97);
      setTimeout(() => {
        if (!entry.group.parent) return;
        entry.group.position.x = startX;
        entry.group.rotation.z = 0;
        entry.group.scale.setScalar(s);
      }, 110);
    }, 100);
  }

  enemyDefeatAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('hurt', 999);
    // If that was the last one standing, the party celebrates
    for (const a of this.allyGroups) a.animator?.setExpression('victory', 3.5);
    const startY = entry.group.position.y;
    const startRot = entry.group.rotation.z;
    const startScale = entry.baseScale;
    let t = 0;
    const animate = () => {
      t += 0.02;
      if (t > 1 || !entry.group.parent) return;
      entry.group.position.y = startY - t * 2;
      entry.group.rotation.z = startRot + t * 1.5;
      entry.group.scale.setScalar(startScale * (1 - t * 0.5));
      requestAnimationFrame(animate);
    };
    animate();
  }

  // BRACE. The QTE resolves into a held defensive stance — on the Meshy cast a
  // real guard clip, on the procedural cast the existing 'brace' gesture if one
  // is authored (the procedural rig has no guard pose today, so it is a no-op
  // there and the DEF buff still reads through the HUD as it always did).
  playerBraceAnim(allyIndex = 0, quality = 'good') {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return;
    entry.animator?.playGesture('guard');
    if (quality === 'perfect') this.flash(0xffd700, 0.05);
  }

  // ── Player / ally animations ─────────────────────────────────────────
  // allyIndex 0 = Andrew. Defaults preserved for legacy callers.
  playerAttackAnim(allyIndex = 0) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) {
      this.flash(0xffffff, 0.06);
      return;
    }
    entry.animator?.setExpression('angry', 0.8);
    entry.animator?.playGesture('attack_ally');   // Andrew sells his own swing (body, not just travel)
    const startX = entry.baseX;
    const startZ = entry.baseZ;
    const startRotY = entry.baseRotY;
    // The frame this body's fist actually lands. Everything below is scheduled
    // against it rather than against a hand-tuned constant.
    const contact = this.allyContactMs(allyIndex, 'attack', 220);

    // Anticipation: settle back and coil on frame 0.
    entry.group.position.x = startX + 0.3;
    entry.group.position.z = startZ + 0.2;
    entry.group.rotation.y = startRotY + 0.15;

    // TRAVEL AND WIND-UP ARE ONE MOTION. The shipped version *set* the group to
    // the strike mark at +80ms and set it back at +240ms — a teleport whose
    // whole window closed 500ms before the arm moved (measured: travel
    // 80-240ms, contact 741-812ms; the two never overlapped at all). It now
    // crosses on the clip's own rise, ARRIVES on the contact frame, holds
    // through the follow-through, and eases back.
    const tw = { x: startX + 0.3, z: startZ + 0.2, r: startRotY + 0.15 };
    const apply = () => {
      if (!entry.group.parent) return;
      entry.group.position.x = tw.x;
      entry.group.position.z = tw.z;
      entry.group.rotation.y = tw.r;
    };
    entry._travel?.stop();
    entry._travel = new Tween(tw)
      .to({ x: startX - 1.4, z: startZ - 1.8, r: startRotY - 0.1 }, Math.max(0.12, contact / 1000), 'inQuad')
      .delay(0.14)
      .to({ x: startX, z: startZ, r: startRotY }, 0.20, 'outQuad')
      .onUpdate(apply)
      .onComplete(apply)
      .start();

    // Camera dolly stays on a deterministic timer pair (never a tween): if the
    // fight tears down mid-move a leaked tween would strand _basePos.z off its
    // rest value for the whole next encounter.
    const origZ = this._basePos.z;
    setTimeout(() => { this._basePos.z = origZ - 0.6; }, Math.max(40, contact - 120));
    setTimeout(() => { this._basePos.z = origZ; }, contact + 340);

    // The slash accent + its flash used to be scheduled here on a wall-clock
    // timer, which measured 107ms late against the clip's own contact frame.
    // They are now `strikeAccent()`, fired by CombatState's contact scheduler
    // on the same frame as the hit-stop and the number.

    // Slash accent — a DIRECTIONAL streak that reads as a cut crossing the
    // target, not a textureless white quad. The prior version was square white
    // sprites grown to ~2.4× that bloom-nuked into a shapeless slab covering a
    // third of the frame (critic: "impact reads as a lens flare with confetti").
    // A slash is now a thin, elongated, additive streak that SWEEPS across the
    // enemy's chest (aspect ~6:1) and fades in 1–2 frames — a point of contact
    // with a direction. Reused static texture: a lens-shaped bright core.
    if (!CombatScene._slashTex) {
      const sc = document.createElement('canvas');
      sc.width = 128; sc.height = 128;
      const sctx = sc.getContext('2d');
      const sg = sctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      sg.addColorStop(0, 'rgba(255,255,255,1)');
      sg.addColorStop(0.35, 'rgba(255,255,255,0.85)');
      sg.addColorStop(0.7, 'rgba(255,255,255,0.18)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 128, 128);
      CombatScene._slashTex = new THREE.CanvasTexture(sc);
      CombatScene._slashTex.colorSpace = THREE.SRGBColorSpace;
      CombatScene._slashTex.minFilter = THREE.LinearFilter;
      CombatScene._slashTex.generateMipmaps = false;
    }
    const makeSlash = (x, y, z, color, rotation) => {
      const mat = new THREE.SpriteMaterial({
        map: CombatScene._slashTex, color, transparent: true, opacity: 1.0,
        rotation, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.center.set(0.5, 0.5);
      this.scene.add(sprite);
      return { sprite, mat, x, y };
    };

    this._slashFn = () => {
      // Two crossing streaks (the cut) + a tight impact spark. The streaks are
      // long+thin and drawn near the enemy's centre of mass so they read as a
      // blade crossing the body toward stage-left (the direction Andrew lunges).
      const s1 = makeSlash(0.0, 1.15, 0.35, 0xffffff, -0.55);   // primary diagonal
      const s2 = makeSlash(0.05, 1.3, 0.3, 0xffe08a, -0.5);     // warm trailing edge
      const spark = makeSlash(-0.15, 1.05, 0.4, 0xffd0d8, 0.0); // contact spark
      const slashes = [
        { s: s1, lenX: 2.6, lenY: 0.42, sweep: -0.7, peak: 1.0 },
        { s: s2, lenX: 2.2, lenY: 0.30, sweep: -0.6, peak: 0.8 },
        { s: spark, lenX: 0.6, lenY: 0.6, sweep: 0.0, peak: 0.9, spark: true },
      ];
      const DURATION = 0.26;
      let elapsed = 0;
      const tick = () => {
        elapsed += 0.016;
        const t = Math.min(elapsed / DURATION, 1);
        // Streaks snap to full length fast, then fade — a 1–2 frame accent.
        const grow = Math.min(1, t * 3.5);
        const fade = 1 - t * t;
        for (const sl of slashes) {
          if (sl.spark) {
            const g = 0.4 + grow * 0.7;
            sl.s.sprite.scale.set(sl.lenX * g, sl.lenY * g, 1);
            sl.s.mat.opacity = fade * sl.peak;
          } else {
            sl.s.sprite.scale.set(sl.lenX * grow, sl.lenY, 1);
            sl.s.mat.opacity = fade * sl.peak;
            sl.s.sprite.position.x = sl.s.x + sl.sweep * t; // sweep across the body
          }
        }
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          for (const sl of slashes) { this.scene.remove(sl.s.sprite); sl.s.mat.dispose(); }
        }
      };
      requestAnimationFrame(tick);
    };
  }

  // THE CONTACT ACCENT — the white pop and the directional slash streaks.
  // Split out of playerAttackAnim so it fires on the scheduler's contact frame
  // rather than on its own timer.
  strikeAccent(allyIndex = 0) {
    this.flash(0xffffff, 0.05);
    if (this._slashFn) { const f = this._slashFn; this._slashFn = null; f(); }
  }

  // ── ABILITY / CAST BODIES ────────────────────────────────────────────
  // Until now the ONLY actions that played a body clip were the basic attack,
  // the ally attack, the break-counter, Retaliate and Desperate Gamble. Every
  // ability, Press Advantage and the signature Power Move called
  // playerAbilityLunge() — a group translate — so Andrew slid across the stage
  // in his calm stance while the screen did all the work. Returns the contact
  // frame so the caller can schedule its impact against the same clock.
  playerAbilityAnim(allyIndex = 0, { distance = 0.6 } = {}) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return 220;
    entry.animator?.setExpression('angry', 0.8);
    entry.animator?.playGesture('attack_ally');
    const contact = this.allyContactMs(allyIndex, 'attack', 220);
    if (distance > 0) this.playerAbilityLunge(distance, allyIndex, contact);
    return contact;
  }

  // The scheming beat for a non-damaging ability (heal / buff / debuff). Its own
  // clip since the cast split — it used to be an alias of the punch, so filing a
  // motion and drinking a coffee were the same swing.
  playerCastAnim(allyIndex = 0) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return 300;
    entry.animator?.setExpression('smug', 1.0);
    entry.animator?.playGesture('cast');
    return this.allyContactMs(allyIndex, 'cast', 300);
  }

  // Ability travel. `contactMs` lets an ability that plays a body clip arrive on
  // ITS contact frame instead of teleporting on a flat 200ms window; callers
  // that pass nothing keep the shipped timing exactly.
  playerAbilityLunge(distance = 0.6, allyIndex = 0, contactMs = null) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return;
    const startX = entry.baseX;
    const startZ = entry.baseZ;
    if (contactMs == null) {
      entry.group.position.x = startX - distance;
      entry.group.position.z = startZ - distance * 1.2;
      setTimeout(() => {
        if (entry.group.parent) {
          entry.group.position.x = startX;
          entry.group.position.z = startZ;
        }
      }, 200);
      return;
    }
    const tw = { x: startX, z: startZ };
    const apply = () => {
      if (!entry.group.parent) return;
      entry.group.position.x = tw.x;
      entry.group.position.z = tw.z;
    };
    entry._travel?.stop();
    entry._travel = new Tween(tw)
      .to({ x: startX - distance, z: startZ - distance * 1.2 }, Math.max(0.10, contactMs / 1000), 'inQuad')
      .delay(0.14)
      .to({ x: startX, z: startZ }, 0.20, 'outQuad')
      .onUpdate(apply)
      .onComplete(apply)
      .start();
  }

  // Ally-side hurt animation (when an enemy hits an ally specifically — falls back to ally 0)
  allyHurtAnim(allyIndex = 0) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return;
    entry.animator?.setExpression('hurt', 0.9);
    entry.animator?.playGesture('hurt');   // body flinch so the victim reads even from behind
    const startX = entry.baseX;
    entry.group.position.x = startX - 0.2;
    setTimeout(() => {
      if (entry.group.parent) entry.group.position.x = startX + 0.15;
      setTimeout(() => {
        if (entry.group.parent) entry.group.position.x = startX;
      }, 100);
    }, 100);
  }

  update(dt) {
    // Hit-stop: freeze everything briefly so big hits land with weight
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    this.time += dt;

    if (this.bgMesh && this.bgMesh.material.uniforms) {
      this.bgMesh.material.uniforms.uTime.value = this.time;
    }

    // Enemy intro slide-in from stage right (staggered). Each enemy stops
    // being driven the moment it lands so combat anims can take over.
    if (this._introT < 1.5) {
      this._introT += dt;
      for (const e of this.enemyGroups) {
        const t = (this._introT - e.introDelay) / 0.5;
        if (t >= 1 || t < 0) {
          if (t >= 1 && !e._landed) {
            e._landed = true;
            e.group.position.x = e.baseX;
          }
          continue;
        }
        const ease = 1 - Math.pow(1 - t, 3);
        e.group.position.x = e.baseX + (1 - ease) * 5.0;
      }
    }

    for (const e of this.enemyGroups) e.animator?.update(dt);
    for (const a of this.allyGroups) a.animator?.update(dt);

    // The Algorithm hovers and slowly sways
    for (let i = 0; i < this.enemyGroups.length; i++) {
      const e = this.enemyGroups[i];
      if (e.group.isMonolith) {
        // Hover only — rotation belongs to CharacterAnimator's facing lerp
        e.group.position.y = 0.2 + Math.sin(this.time * 1.8 + i) * 0.12;
        if (e.group.screenFace) {
          // Eye pulse via subtle scale breathing on the screen
          const p = 1 + Math.sin(this.time * 3.2) * 0.012;
          e.group.screenFace.scale.set(p, p, 1);
        }
      }
    }

    // Pulse the target marker
    if (this.targetMarker && this.targetMarker.visible) {
      const pulse = 0.85 + 0.15 * Math.sin(this.time * 6);
      this.targetMarker.material.opacity = pulse;
      this.targetMarker.rotation.z += dt * 1.2;
    }

    // ── Cinematic camera rig ────────────────────────────────────────────
    // Ease cine offsets toward their targets (exponential smoothing). This is
    // what gives "dolly on wind-up → snap on impact → settle to rest" for free,
    // and guarantees a return to _basePos when the timeline zeroes its targets.
    const k = Math.min(1, dt * this._camEase);
    this._cinePos.x  += (this._cinePosTarget.x  - this._cinePos.x)  * k;
    this._cinePos.y  += (this._cinePosTarget.y  - this._cinePos.y)  * k;
    this._cinePos.z  += (this._cinePosTarget.z  - this._cinePos.z)  * k;
    this._cineLook.x += (this._cineLookTarget.x - this._cineLook.x) * k;
    this._cineLook.y += (this._cineLookTarget.y - this._cineLook.y) * k;
    this._cineLook.z += (this._cineLookTarget.z - this._cineLook.z) * k;

    // Camera punch-in: snap toward the stage, ease back out (crit/weakness)
    let punchZ = 0;
    if (this._punchT < 1) {
      this._punchT = Math.min(this._punchT + dt / 0.35, 1);
      punchZ = this._punchAmount * (1 - this._punchT) * (1 - this._punchT);
    }

    // Technical-tag glitch — high-frequency decaying jitter
    let gx = 0, gy = 0;
    if (this._glitchT > 0) {
      this._glitchT -= dt;
      const g = this._glitchAmt * Math.max(0, this._glitchT) * 6;
      gx = (Math.random() - 0.5) * g;
      gy = (Math.random() - 0.5) * g;
    }

    // Translational shake
    let sx = 0, sy = 0;
    if (this.shakeAmount > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeAmount;
      sy = (Math.random() - 0.5) * this.shakeAmount * 0.5;
      this.shakeAmount *= 0.88;
    } else {
      this.shakeAmount = 0;
    }

    this.camera.position.set(
      this._basePos.x + this._cinePos.x + sx + gx,
      this._basePos.y + this._cinePos.y + sy + gy,
      this._basePos.z + this._cinePos.z - punchZ
    );
    this.camera.lookAt(
      this._baseLook.x + this._cineLook.x,
      this._baseLook.y + this._cineLook.y,
      this._baseLook.z + this._cineLook.z
    );

    // ── Light-beat modulation ───────────────────────────────────────────
    this._dim += (this._dimTarget - this._dim) * Math.min(1, dt * 9);
    this._rimBeatV = this._rimBeatV > 0.002 ? this._rimBeatV * 0.90 : 0;
    const bi = this._baseIntensity;
    if (bi) {
      // Key + fill follow the darken; rims mostly survive it (Refn separation)
      // and take the beat spike so the silhouette stays readable in the dark.
      const keyDim = this._dim;
      const rimDim = 0.6 + 0.4 * this._dim;
      if (this.ambient)    this.ambient.intensity    = bi.ambient * keyDim;
      if (this.dirLight)   this.dirLight.intensity   = bi.dir     * keyDim;
      if (this.fillLight)  this.fillLight.intensity  = bi.fill    * keyDim;
      if (this.eyeLight)   this.eyeLight.intensity   = bi.eye     * keyDim;
      if (this.faceKey)    this.faceKey.intensity    = bi.faceKey * keyDim;
      if (this.rimCyan)    this.rimCyan.intensity    = bi.rimCyan    * rimDim + this._rimBeatV * 0.5;
      if (this.rimMagenta) this.rimMagenta.intensity = bi.rimMagenta * rimDim + this._rimBeatV * 1.5;
      if (this.rimLow)     this.rimLow.intensity     = bi.rimLow     * rimDim + this._rimBeatV * 0.4;
      // Hero spot INVERTS the dim: brightest exactly when the venue darkens for a
      // power beat, so Andrew keeps a warm rim while the world drops to black.
      if (this.heroSpot)   this.heroSpot.intensity   = bi.hero * (1 + (1 - this._dim) * 2.2) + this._rimBeatV * 0.6;
    }
    if (this.bgMesh && this.bgMesh.material.uniforms && this.bgMesh.material.uniforms.uDim) {
      this.bgMesh.material.uniforms.uDim.value = this._dim;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.scene.background = null;
      } else {
        this.scene.background = this.flashColor;
      }
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    clearTimeout(this._dimTimer);
    this._clearGroups();
    if (this.targetMarker) {
      this.scene.remove(this.targetMarker);
      this.targetMarker.geometry.dispose();
      this.targetMarker.material.dispose();
      this.targetMarker = null;
    }
  }
}
