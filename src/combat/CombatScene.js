import * as THREE from 'three';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';

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
    this._setup();
  }

  _setup() {
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0.95, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 3);
    this.scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    backLight.position.set(-2, 3, -3);
    this.scene.add(backLight);
    const rimLight = new THREE.DirectionalLight(0xe94560, 0.4);
    rimLight.position.set(-3, 2, 1);
    this.scene.add(rimLight);

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
          float vig = smoothstep(1.45, 0.10, length(center) * 1.28);
          color *= vig;
          // Dissolve the bottom of the backdrop into TRUE black right at the
          // stage-floor line (uv.y ~0.3 in world), so the swirl fades into
          // the floor instead of terminating in a razor-straight seam
          // (critic: "a visible stage seam"). Fully black below the floor,
          // ramping back to full a little above it.
          color *= smoothstep(0.27, 0.52, uv.y);
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
      group.rotation.y = Math.PI;
      this._addContactBounce(group, scale);
      this.scene.add(group);
      this.enemyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: Math.PI, baseScale: scale, characterId: id, introDelay: i * 0.12 });
    }
    // Enemies slide in from stage right over ~half a second
    this._introT = 0;

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
      group.rotation.y = -Math.PI * 0.6;
      this._addContactBounce(group, 1.8);
      this.scene.add(group);
      this.allyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: -Math.PI * 0.6, baseScale: 1.8, characterId: id });
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
        map: CombatScene._bounceTex, color: 0xe94560, transparent: true,
        opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    bounce.rotation.x = -Math.PI / 2;
    // Local units — parent scale (scale) turns these into a ~1.7×1.15 world
    // footprint sitting just above the black stage floor.
    const s = 1.0 / Math.max(scale, 0.001);
    bounce.scale.set(1.7 * s, 1.15 * s, 1);
    bounce.position.set(0, 0.03 * s, 0.08 * s);
    bounce.renderOrder = 3;
    bounce.userData.noFlash = true;
    group.add(bounce);
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

  enemyAttackAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('angry', 1.4);
    const startZ = entry.baseZ;
    const startX = entry.baseX;
    const startRotY = entry.baseRotY;
    const s = entry.baseScale;
    // Anticipation: rear back and coil for 220ms...
    entry.group.position.z = startZ - 0.55;
    entry.group.rotation.x = -0.12;
    entry.group.scale.set(s * 1.04, s * 0.94, s * 1.04);
    setTimeout(() => {
      if (!entry.group.parent) return;
      // ...then lunge hard into the player's space
      entry.group.position.z = startZ + 1.7;
      entry.group.position.x = startX + 0.15;
      entry.group.rotation.y = startRotY + 0.08;
      entry.group.rotation.x = 0.1;
      entry.group.scale.set(s * 0.97, s * 1.05, s * 0.97);
      setTimeout(() => {
        if (!entry.group.parent) return;
        entry.group.position.z = startZ;
        entry.group.position.x = startX;
        entry.group.rotation.y = startRotY;
        entry.group.rotation.x = 0;
        entry.group.scale.setScalar(s);
      }, 190);
    }, 220);
  }

  enemyHurtAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    entry.animator?.setExpression('hurt', 0.9);
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

    setTimeout(() => this.flash(0xffffff, 0.06), 80);

    const makeSlash = (x, y, z, color, scaleX, scaleY, rotation) => {
      const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: 1.0, rotation, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(scaleX, scaleY, 1);
      this.scene.add(sprite);
      return { sprite, mat };
    };

    setTimeout(() => {
      const s1 = makeSlash( 0.1, 1.2, 0.3, 0xffffff, 0.6, 0.6,  0.35);
      const s2 = makeSlash(-0.2, 0.9, 0.2, 0xffee88, 0.5, 0.5, -0.25);
      const s3 = makeSlash( 0.3, 1.5, 0.4, 0xffffff, 0.35, 0.35, 0.9);
      const s4 = makeSlash(-0.1, 1.3, 0.1, 0xe94560, 0.3, 0.3,  0.6);

      const DURATION = 0.35;
      let elapsed = 0;
      const tick = () => {
        elapsed += 0.016;
        const t = Math.min(elapsed / DURATION, 1);
        const ease = 1 - t * t;
        const grow = 1 + t * 3;
        s1.mat.opacity = ease;
        s2.mat.opacity = ease * 0.85;
        s3.mat.opacity = ease * 0.7;
        s4.mat.opacity = ease * 0.6;
        s1.sprite.scale.set(0.6 * grow, 0.6 * grow, 1);
        s2.sprite.scale.set(0.5 * grow, 0.5 * grow, 1);
        s3.sprite.scale.set(0.35 * grow, 0.35 * grow, 1);
        s4.sprite.scale.set(0.3 * grow, 0.3 * grow, 1);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          [s1, s2, s3, s4].forEach(s => {
            this.scene.remove(s.sprite);
            s.mat.dispose();
          });
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

    // Camera punch-in: snap toward the stage, ease back out
    let punchZ = 0;
    if (this._punchT < 1) {
      this._punchT = Math.min(this._punchT + dt / 0.35, 1);
      punchZ = this._punchAmount * (1 - this._punchT) * (1 - this._punchT);
    }

    if (this.shakeAmount > 0.01) {
      this.camera.position.set(
        this._basePos.x + (Math.random() - 0.5) * this.shakeAmount,
        this._basePos.y + (Math.random() - 0.5) * this.shakeAmount * 0.5,
        this._basePos.z - punchZ
      );
      this.shakeAmount *= 0.88;
    } else {
      this.shakeAmount = 0;
      this.camera.position.set(this._basePos.x, this._basePos.y, this._basePos.z - punchZ);
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
    this._clearGroups();
    if (this.targetMarker) {
      this.scene.remove(this.targetMarker);
      this.targetMarker.geometry.dispose();
      this.targetMarker.material.dispose();
      this.targetMarker = null;
    }
  }
}
