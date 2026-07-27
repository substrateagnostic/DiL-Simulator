import * as THREE from 'three';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';

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
    this._basePos = { x: 0, y: 1.5, z: 5 };
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
    this._baseLook = { x: 0, y: 0.95, z: 0 };
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
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0.95, 0);

    // ARENA RELIGHT — combat was authored against the broken output transform
    // and now renders brighter. Key/fill are pulled DOWN so combatants sit in
    // Refn dark; the two back RIMS stay strong so the silhouette separation
    // survives the darker key (Clair-Obscur close-up grammar). Base intensities
    // are stored so the cinematic rig can darken the key + spike the rim for
    // power beats and always restore them.
    const BI = { ambient: 0.30, dir: 0.60, fill: 0.46, eye: 0.27, faceKey: 0.32, rimCyan: 0.66, rimMagenta: 0.60, rimLow: 0.58, hero: 0.34 };
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
    faceKey.position.set(0.8, 4.6, 5.2);
    faceKey.target.position.set(0.8, 1.5, 1.2);
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
    heroSpot.position.set(3.4, 4.2, 5.6);
    heroSpot.target.position.set(2.2, 1.1, 3.4);
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
      const group = buildCharacter(config, { detailed: true });
      const animator = new CharacterAnimator(group);
      const pos = positions[i];
      // Caricature heads run bigger — slightly smaller stage scale keeps
      // faces in frame
      const scale = enemyIds.length === 1 ? 1.9 : 1.6;
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
      const group = buildCharacter(combatConfig, { detailed: true });
      const animator = new CharacterAnimator(group);
      const pos = partyPositions[i];
      group.position.set(pos.x, 0, pos.z);
      group.scale.setScalar(1.8);
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
      this._addContactBounce(group, 1.8);
      this.scene.add(group);
      this.allyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: faceRotY, baseScale: 1.8, characterId: id });
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

  _allyPositions(count) {
    if (count <= 1) return [{ x: 2.2, z: 3.5 }];
    if (count === 2) return [{ x: 1.8, z: 3.4 }, { x: 3.0, z: 4.2 }];
    if (count === 3) return [{ x: 1.4, z: 3.3 }, { x: 2.6, z: 4.1 }, { x: 3.6, z: 3.5 }];
    const out = [];
    for (let i = 0; i < count; i++) out.push({ x: 1.4 + i * 1.0, z: 3.3 + (i % 2) * 0.8 });
    return out;
  }

  _clearGroups() {
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
  shake(intensity = 0.5) {
    if (this._settings === undefined) {
      import('../core/Settings.js').then(({ SETTINGS }) => { this._settings = SETTINGS; });
      this._settings = null;
    }
    if (this._settings && !this._settings.shake) intensity = 0;
    this.shakeAmount = intensity;
    if (intensity >= 1.0) {
      this.hitStop(0.11);
      this.punchIn(0.7);
    } else if (intensity >= 0.6) {
      this.hitStop(0.07);
      this.punchIn(0.4);
    }
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
  flashEnemy(duration = 0.15, idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    const originalMaterials = [];
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    entry.group.traverse(child => {
      if (child.isMesh && !child.userData.noFlash) {
        originalMaterials.push({ mesh: child, material: child.material });
        child.material = whiteMat;
      }
    });
    setTimeout(() => {
      for (const { mesh, material } of originalMaterials) mesh.material = material;
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
    // Anticipation: rear back and coil (synced to the gesture wind-up ~0.16s)…
    // the coil is a touch deeper now so the whole-body recoil-back reads as a
    // clear preparation before the strike (critic: note 1, wind-up must read).
    entry.group.position.z = startZ - 0.6;
    entry.group.scale.set(s * 1.04, s * 0.93, s * 1.05);
    setTimeout(() => {
      if (!entry.group.parent) return;
      // …then drive into the player's space as the striking arm lands (synced to
      // the gesture strike at ~0.23s). Kept to ~1.1 so the enemy lunges toward the
      // victim without swallowing the reaction-cut framing that now frames Andrew.
      entry.group.position.z = startZ + 1.1;
      entry.group.position.x = startX + 0.12;
      entry.group.rotation.y = startRotY + 0.06;
      entry.group.scale.set(s * 0.98, s * 1.05, s * 0.97);
      setTimeout(() => {
        if (!entry.group.parent) return;
        entry.group.position.z = startZ;
        entry.group.position.x = startX;
        entry.group.rotation.y = startRotY;
        entry.group.scale.setScalar(s);
      }, 190);
    }, 160);
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

    entry.group.position.x = startX + 0.3;
    entry.group.position.z = startZ + 0.2;
    entry.group.rotation.y = startRotY + 0.15;

    setTimeout(() => {
      if (!entry.group.parent) return;
      entry.group.position.x = startX - 1.4;
      entry.group.position.z = startZ - 1.8;
      entry.group.rotation.y = startRotY - 0.1;
      const origZ = this._basePos.z;
      this._basePos.z = origZ - 0.6;

      setTimeout(() => {
        if (entry.group.parent) {
          entry.group.position.x = startX;
          entry.group.position.z = startZ;
          entry.group.rotation.y = startRotY;
        }
        this._basePos.z = origZ;
      }, 160);
    }, 80);

    setTimeout(() => this.flash(0xffffff, 0.05), 80);

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

    setTimeout(() => {
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
    }, 80);
  }

  playerAbilityLunge(distance = 0.6, allyIndex = 0) {
    const entry = this.allyGroups[allyIndex];
    if (!entry) return;
    const startX = entry.baseX;
    const startZ = entry.baseZ;
    entry.group.position.x = startX - distance;
    entry.group.position.z = startZ - distance * 1.2;
    setTimeout(() => {
      if (entry.group.parent) {
        entry.group.position.x = startX;
        entry.group.position.z = startZ;
      }
    }, 200);
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
