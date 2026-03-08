import * as THREE from 'three';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';

// Separate Three.js scene for combat with psychedelic Earthbound-style background
export class CombatScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.enemyGroup = null;
    this.enemyAnimator = null;
    this.bgMesh = null;
    this.time = 0;
    this.shakeAmount = 0;
    this.flashTimer = 0;
    this.flashColor = null;
    this._basePos = { x: 0, y: 1.5, z: 5 };

    this._setup();
  }

  _setup() {
    // Camera position
    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0.8, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 3);
    this.scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    backLight.position.set(-2, 3, -3);
    this.scene.add(backLight);

    // Psychedelic scrolling background (shader plane)
    this._createBackground();

    // Ground plane (subtle grid)
    const groundGeo = new THREE.PlaneGeometry(10, 6);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x111122,
      transparent: true,
      opacity: 0.3,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
  }

  _createBackground() {
    // Psychedelic shader background inspired by Earthbound
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

          // Scrolling pattern
          float t = uTime * 0.3;

          // Wavy distortion
          float wave1 = sin(uv.x * 6.0 + t * 2.0) * 0.1;
          float wave2 = sin(uv.y * 4.0 + t * 1.5) * 0.1;
          float wave3 = sin((uv.x + uv.y) * 8.0 + t * 3.0) * 0.05;
          vec2 distorted = uv + vec2(wave1 + wave3, wave2 + wave3);

          // Diamond/checker pattern
          float pattern = sin(distorted.x * 12.0 + t) * sin(distorted.y * 12.0 - t * 0.7);

          // Spiral overlay
          vec2 center = distorted - 0.5;
          float angle = atan(center.y, center.x);
          float dist = length(center);
          float spiral = sin(angle * 3.0 + dist * 10.0 - t * 4.0);

          // Color mixing
          float blend1 = smoothstep(-0.3, 0.3, pattern);
          float blend2 = smoothstep(-0.2, 0.2, spiral);

          vec3 color = mix(
            mix(uColor1, uColor2, blend1),
            mix(uColor3, uColor4, blend1),
            blend2
          );

          // Pulsing brightness
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

  setEnemy(enemyId) {
    // Remove old enemy
    if (this.enemyGroup) {
      this.scene.remove(this.enemyGroup);
    }

    const config = CHARACTER_CONFIGS[enemyId];
    if (!config) return;

    this.enemyGroup = buildCharacter(config);
    this.enemyAnimator = new CharacterAnimator(this.enemyGroup);
    this.enemyGroup.position.set(0, 0, 0);
    this.enemyGroup.scale.set(1.8, 1.8, 1.8); // Enemies are big in combat
    this.enemyGroup.rotation.y = Math.PI; // Face player
    this.scene.add(this.enemyGroup);
  }

  setBackgroundColors(c1, c2, c3, c4) {
    if (!this.bgMesh) return;
    const u = this.bgMesh.material.uniforms;
    u.uColor1.value.set(c1);
    u.uColor2.value.set(c2);
    u.uColor3.value.set(c3);
    u.uColor4.value.set(c4);
  }

  shake(intensity = 0.5) {
    this.shakeAmount = intensity;
  }

  flash(color = 0xffffff, duration = 0.15) {
    this.flashColor = new THREE.Color(color);
    this.flashTimer = duration;
  }

  // Flash the enemy model white (hit effect)
  flashEnemy(duration = 0.15) {
    if (!this.enemyGroup) return;
    const originalMaterials = [];
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.enemyGroup.traverse(child => {
      if (child.isMesh) {
        originalMaterials.push({ mesh: child, material: child.material });
        child.material = whiteMat;
      }
    });

    setTimeout(() => {
      for (const { mesh, material } of originalMaterials) {
        mesh.material = material;
      }
    }, duration * 1000);
  }

  // Player attack animation — camera punch-in + sprite slash streaks
  // Uses THREE.Sprite so slashes always face the camera (guaranteed visible).
  playerAttackAnim() {
    // Zoom camera toward enemy (via _basePos so the shake system respects it)
    const origZ = this._basePos.z;
    this._basePos.z = origZ - 1.0;
    setTimeout(() => { this._basePos.z = origZ; }, 200);

    // Brief white flash for instant visual punch
    this.flash(0xffffff, 0.06);

    // Helper: create a sprite slash at a given position/size/rotation
    const makeSlash = (x, y, z, color, scaleX, scaleY, rotation) => {
      const mat = new THREE.SpriteMaterial({
        color,
        transparent: true,
        opacity: 1.0,
        rotation,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(scaleX, scaleY, 1);
      this.scene.add(sprite);
      return { sprite, mat };
    };

    // Primary slash (bright white, wide)
    const s1 = makeSlash(0.1,  1.0, 2.5, 0xffffff, 4.0, 0.18,  0.35);
    // Secondary slash (warm yellow, narrower, slightly offset)
    const s2 = makeSlash(-0.1, 1.2, 2.2, 0xffee88, 3.0, 0.12, -0.25);

    const DURATION = 0.25; // seconds
    let elapsed = 0;
    const tick = () => {
      elapsed += 0.016;
      const t = Math.min(elapsed / DURATION, 1);
      const ease = 1 - t * t; // ease-out
      s1.mat.opacity = ease;
      s2.mat.opacity = ease * 0.75;
      s1.sprite.position.z = 2.5 - t * 2.8;
      s2.sprite.position.z = 2.2 - t * 2.5;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.scene.remove(s1.sprite);
        this.scene.remove(s2.sprite);
        s1.mat.dispose();
        s2.mat.dispose();
      }
    };
    requestAnimationFrame(tick);
  }

  // Enemy attack animation (lunge forward)
  enemyAttackAnim() {
    if (!this.enemyGroup) return;
    const startZ = this.enemyGroup.position.z;
    this.enemyGroup.position.z = startZ + 1.5;
    setTimeout(() => {
      if (this.enemyGroup) this.enemyGroup.position.z = startZ;
    }, 200);
  }

  // Enemy hurt animation (recoil)
  enemyHurtAnim() {
    if (!this.enemyGroup) return;
    this.flashEnemy(0.15);
    const startX = this.enemyGroup.position.x;
    this.enemyGroup.position.x = startX + 0.2;
    setTimeout(() => {
      if (this.enemyGroup) this.enemyGroup.position.x = startX - 0.15;
      setTimeout(() => {
        if (this.enemyGroup) this.enemyGroup.position.x = startX;
      }, 100);
    }, 100);
  }

  // Enemy defeat animation
  enemyDefeatAnim() {
    if (!this.enemyGroup) return;
    const startY = this.enemyGroup.position.y;
    const startRot = this.enemyGroup.rotation.z;
    let t = 0;
    const animate = () => {
      t += 0.02;
      if (t > 1 || !this.enemyGroup) return;
      this.enemyGroup.position.y = startY - t * 2;
      this.enemyGroup.rotation.z = startRot + t * 1.5;
      this.enemyGroup.scale.setScalar(1.8 * (1 - t * 0.5));
      requestAnimationFrame(animate);
    };
    animate();
  }

  update(dt) {
    this.time += dt;

    // Update background shader
    if (this.bgMesh && this.bgMesh.material.uniforms) {
      this.bgMesh.material.uniforms.uTime.value = this.time;
    }

    // Update enemy idle animation
    if (this.enemyAnimator) {
      this.enemyAnimator.update(dt);
    }

    // Camera shake
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

    // Flash overlay
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
    if (this.enemyGroup) {
      this.scene.remove(this.enemyGroup);
      this.enemyGroup = null;
    }
  }
}
