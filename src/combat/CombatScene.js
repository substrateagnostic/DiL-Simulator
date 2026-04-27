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
    this._setup();
  }

  _setup() {
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0.8, 0);

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

    const groundGeo = new THREE.PlaneGeometry(14, 7);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x111122, transparent: true, opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

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
        uColor1: { value: new THREE.Color(0x1a0533) },
        uColor2: { value: new THREE.Color(0x0a2463) },
        uColor3: { value: new THREE.Color(0x3e1f47) },
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
          float blend1 = smoothstep(-0.3, 0.3, pattern);
          float blend2 = smoothstep(-0.2, 0.2, spiral);
          vec3 color = mix(
            mix(uColor1, uColor2, blend1),
            mix(uColor3, uColor4, blend1),
            blend2
          );
          color *= 0.8 + 0.2 * sin(t * 1.5);
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

    // Place enemies on the back stage
    const positions = this._enemyPositions(enemyIds.length);
    for (let i = 0; i < enemyIds.length; i++) {
      const id = enemyIds[i];
      const config = CHARACTER_CONFIGS[id];
      if (!config) continue;
      const group = buildCharacter(config, { detailed: true });
      const animator = new CharacterAnimator(group);
      const pos = positions[i];
      const scale = enemyIds.length === 1 ? 2.2 : 1.85;
      group.position.set(pos.x, 0, pos.z);
      group.scale.setScalar(scale);
      group.rotation.y = Math.PI;
      this.scene.add(group);
      this.enemyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: Math.PI, baseScale: scale, characterId: id });
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
      group.rotation.y = -Math.PI * 0.6;
      this.scene.add(group);
      this.allyGroups.push({ group, animator, baseX: pos.x, baseZ: pos.z, baseRotY: -Math.PI * 0.6, baseScale: 1.8, characterId: id });
    }
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

  shake(intensity = 0.5) { this.shakeAmount = intensity; }

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
      if (child.isMesh) {
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
    const startZ = entry.baseZ;
    const startX = entry.baseX;
    const startRotY = entry.baseRotY;
    entry.group.position.z = startZ - 0.3;
    setTimeout(() => {
      if (!entry.group.parent) return;
      entry.group.position.z = startZ + 1.5;
      entry.group.position.x = startX + 0.15;
      entry.group.rotation.y = startRotY + 0.08;
      setTimeout(() => {
        entry.group.position.z = startZ;
        entry.group.position.x = startX;
        entry.group.rotation.y = startRotY;
      }, 180);
    }, 60);
  }

  enemyHurtAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
    this.flashEnemy(0.15, idx);
    const startX = entry.baseX;
    entry.group.position.x = startX + 0.2;
    setTimeout(() => {
      if (entry.group.parent) entry.group.position.x = startX - 0.15;
      setTimeout(() => {
        if (entry.group.parent) entry.group.position.x = startX;
      }, 100);
    }, 100);
  }

  enemyDefeatAnim(idx = 0) {
    const entry = this.enemyGroups[idx];
    if (!entry) return;
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
    this.time += dt;

    if (this.bgMesh && this.bgMesh.material.uniforms) {
      this.bgMesh.material.uniforms.uTime.value = this.time;
    }

    for (const e of this.enemyGroups) e.animator?.update(dt);
    for (const a of this.allyGroups) a.animator?.update(dt);

    // Pulse the target marker
    if (this.targetMarker && this.targetMarker.visible) {
      const pulse = 0.85 + 0.15 * Math.sin(this.time * 6);
      this.targetMarker.material.opacity = pulse;
      this.targetMarker.rotation.z += dt * 1.2;
    }

    if (this.shakeAmount > 0.01) {
      this.camera.position.set(
        this._basePos.x + (Math.random() - 0.5) * this.shakeAmount,
        this._basePos.y + (Math.random() - 0.5) * this.shakeAmount * 0.5,
        this._basePos.z
      );
      this.shakeAmount *= 0.88;
    } else {
      this.shakeAmount = 0;
      this.camera.position.set(this._basePos.x, this._basePos.y, this._basePos.z);
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
