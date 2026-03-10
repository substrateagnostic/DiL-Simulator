import * as THREE from 'three';
import { Engine } from '../core/Engine.js';
import { InputManager } from '../core/InputManager.js';

// ============================================================
// STAGECOACH STAMPEDE — A retro side-scrolling minigame
// ============================================================
// Ride the Wells Fargo stagecoach through the Old West.
// Jump over regulations, dodge auditors, collect trust documents.
// Score is measured in Fiduciary Points.
// ============================================================

const GROUND_Y = -2.5;
const COACH_X = -5;
const GRAVITY = -28;
const JUMP_VELOCITY = 14;
const DUCK_HEIGHT = 0.5;
const NORMAL_HEIGHT = 1.2;
const SPAWN_X = 14;
const DESPAWN_X = -16;

const OBSTACLE_TYPES = [
  { id: 'regulation_scroll', height: 1.6, width: 0.4, action: 'jump', color: 0xcc2222 },
  { id: 'compliance_auditor', height: 1.5, width: 0.6, action: 'jump', color: 0x333366 },
  { id: 'falling_memo', height: 0.3, width: 0.8, action: 'duck', color: 0xffeecc, falling: true },
  { id: 'filing_cabinet', height: 0.8, width: 0.9, action: 'jump', color: 0x888888 },
];

const COLLECTIBLE_TYPES = [
  { id: 'trust_document', points: 10, color: 0xffd700, size: 0.4 },
  { id: 'coffee_cup', points: 5, color: 0x8b4513, size: 0.3, speedBoost: true },
  { id: 'charter_fragment', points: 50, color: 0xffaa00, size: 0.5, rare: true, glow: true },
];

export class ArcadeState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;

    // Three.js scene
    this.scene = null;
    this.camera = null;

    // Game objects
    this.coach = null;
    this.coachVelocityY = 0;
    this.coachY = 0;
    this.isDucking = false;
    this.isJumping = false;

    // Scrolling
    this.scrollSpeed = 5;
    this.maxSpeed = 15;
    this.speedBoostTimer = 0;
    this.distance = 0;

    // Spawning
    this.obstacles = [];
    this.collectibles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.collectibleTimer = 0;

    // Background
    this.groundTiles = [];
    this.mountains = [];
    this.cacti = [];
    this.sun = null;

    // Wheels for rotation
    this.wheels = [];

    // Score
    this.score = 0;
    this.highScore = this.player.getFlag('arcade_highscore') || 0;

    // State
    this.gameOver = false;
    this.started = false;

    // DOM
    this.hudEl = null;
    this.gameOverEl = null;

    // Cleanup tracking
    this._geometries = [];
    this._materials = [];
    this._resizeHandler = null;
  }

  enter() {
    this._buildScene();
    this._buildHUD();
    this._buildCoach();
    this._buildBackground();
    this._buildGround();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
    this._onResize();

    this.started = true;
  }

  exit() {
    // Remove DOM
    if (this.hudEl) { this.hudEl.remove(); this.hudEl = null; }
    if (this.gameOverEl) { this.gameOverEl.remove(); this.gameOverEl = null; }

    // Dispose Three.js
    this._geometries.forEach(g => g.dispose());
    this._materials.forEach(m => m.dispose());
    if (this.scene) {
      this.scene.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }

    window.removeEventListener('resize', this._resizeHandler);
  }

  pause() {}
  resume() {}

  // ---- SCENE SETUP ----

  _buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue

    // Gradient sky — add a big plane behind everything
    const skyGeo = new THREE.PlaneGeometry(60, 30);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4488cc) },
        bottomColor: { value: new THREE.Color(0xffcc88) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._materials.push(skyMat);
    this._geometries.push(skyGeo);
    const skyPlane = new THREE.Mesh(skyGeo, skyMat);
    skyPlane.position.set(0, 2, -15);
    this.scene.add(skyPlane);

    // Orthographic camera — side view
    const aspect = window.innerWidth / window.innerHeight;
    const zoom = 7;
    this.camera = new THREE.OrthographicCamera(
      -zoom * aspect, zoom * aspect,
      zoom, -zoom,
      0.1, 100
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(5, 8, 5);
    this.scene.add(dirLight);
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const zoom = 7;
    this.camera.left = -zoom * aspect;
    this.camera.right = zoom * aspect;
    this.camera.top = zoom;
    this.camera.bottom = -zoom;
    this.camera.updateProjectionMatrix();
  }

  // ---- STAGECOACH ----

  _buildCoach() {
    this.coach = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.0, 0.8);
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x8b5a2b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    this.coach.add(body);
    this._geometries.push(bodyGeo);
    this._materials.push(bodyMat);

    // Roof
    const roofGeo = new THREE.BoxGeometry(2.0, 0.15, 0.9);
    const roofMat = new THREE.MeshToonMaterial({ color: 0x6b3a1b });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.38;
    this.coach.add(roof);
    this._geometries.push(roofGeo);
    this._materials.push(roofMat);

    // Windows
    const windowGeo = new THREE.BoxGeometry(0.35, 0.3, 0.02);
    const windowMat = new THREE.MeshToonMaterial({ color: 0xaaddff });
    [-0.4, 0.4].forEach(xOff => {
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.set(xOff, 0.9, 0.42);
      this.coach.add(win);
    });
    this._geometries.push(windowGeo);
    this._materials.push(windowMat);

    // Wheels (2)
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12);
    const wheelMat = new THREE.MeshToonMaterial({ color: 0x3b1a0b });
    this._geometries.push(wheelGeo);
    this._materials.push(wheelMat);
    this.wheels = [];
    [-0.55, 0.55].forEach(xOff => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(xOff, 0.15, 0.5);
      this.coach.add(wheel);
      this.wheels.push(wheel);
    });

    // Spoke details on wheels
    const spokeGeo = new THREE.BoxGeometry(0.05, 0.55, 0.03);
    const spokeMat = new THREE.MeshToonMaterial({ color: 0x5a3010 });
    this._geometries.push(spokeGeo);
    this._materials.push(spokeMat);
    this.spokes = [];
    this.wheels.forEach(wheel => {
      const spokeGroup = [];
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(spokeGeo, spokeMat);
        spoke.rotation.z = (i / 4) * Math.PI;
        wheel.add(spoke);
        spokeGroup.push(spoke);
      }
      this.spokes.push(spokeGroup);
    });

    // Horses (simple box creatures)
    const horseGroup = new THREE.Group();
    const horseBodyGeo = new THREE.BoxGeometry(0.7, 0.4, 0.35);
    const horseMat = new THREE.MeshToonMaterial({ color: 0x8b6914 });
    this._geometries.push(horseBodyGeo);
    this._materials.push(horseMat);

    // Two horses side by side
    [-0.2, 0.2].forEach(zOff => {
      const horseBody = new THREE.Mesh(horseBodyGeo, horseMat);
      horseBody.position.set(-1.7, 0.55, zOff);
      horseGroup.add(horseBody);

      // Head
      const headGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
      const head = new THREE.Mesh(headGeo, horseMat);
      head.position.set(-2.15, 0.7, zOff);
      horseGroup.add(head);
      this._geometries.push(headGeo);

      // Legs (4 per horse)
      const legGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
      const legMat = new THREE.MeshToonMaterial({ color: 0x6b4914 });
      this._geometries.push(legGeo);
      this._materials.push(legMat);
      [[-1.9, zOff - 0.1], [-1.9, zOff + 0.1], [-1.5, zOff - 0.1], [-1.5, zOff + 0.1]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, 0.17, lz);
        horseGroup.add(leg);
      });
    });

    // Hitch bar connecting horses to coach
    const hitchGeo = new THREE.BoxGeometry(0.8, 0.05, 0.05);
    const hitchMat = new THREE.MeshToonMaterial({ color: 0x5a3010 });
    const hitch = new THREE.Mesh(hitchGeo, hitchMat);
    hitch.position.set(-1.25, 0.45, 0);
    horseGroup.add(hitch);
    this._geometries.push(hitchGeo);
    this._materials.push(hitchMat);

    this.coach.add(horseGroup);
    this.horses = horseGroup;

    this.coach.position.set(COACH_X, GROUND_Y + 0.15, 0);
    this.scene.add(this.coach);
  }

  // ---- BACKGROUND ----

  _buildBackground() {
    // Sun
    const sunGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(8, 5, -12);
    this.scene.add(this.sun);
    this._geometries.push(sunGeo);
    this._materials.push(sunMat);

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(this.sun.position);
    this.scene.add(glow);
    this._geometries.push(glowGeo);
    this._materials.push(glowMat);

    // Mountains (distant parallax layer)
    const mtGeo = new THREE.ConeGeometry(3, 4, 4);
    const mtMat = new THREE.MeshToonMaterial({ color: 0x6b5b4b });
    const mtMat2 = new THREE.MeshToonMaterial({ color: 0x7b6b5b });
    this._geometries.push(mtGeo);
    this._materials.push(mtMat, mtMat2);

    for (let i = 0; i < 8; i++) {
      const mt = new THREE.Mesh(mtGeo, i % 2 === 0 ? mtMat : mtMat2);
      const scale = 0.6 + Math.random() * 0.8;
      mt.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale);
      mt.position.set(-20 + i * 6 + Math.random() * 3, GROUND_Y + scale * 1.5, -10);
      this.mountains.push(mt);
      this.scene.add(mt);
    }

    // Cacti (mid-ground parallax layer)
    const cactusBodyGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8);
    const cactusArmGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 6);
    const cactusMat = new THREE.MeshToonMaterial({ color: 0x2d7a2d });
    this._geometries.push(cactusBodyGeo, cactusArmGeo);
    this._materials.push(cactusMat);

    for (let i = 0; i < 6; i++) {
      const cactus = new THREE.Group();
      const body = new THREE.Mesh(cactusBodyGeo, cactusMat);
      body.position.y = 0.5;
      cactus.add(body);

      // Arms
      if (Math.random() > 0.3) {
        const arm = new THREE.Mesh(cactusArmGeo, cactusMat);
        arm.rotation.z = Math.PI / 3;
        arm.position.set(0.15, 0.6 + Math.random() * 0.2, 0);
        cactus.add(arm);
      }
      if (Math.random() > 0.5) {
        const arm2 = new THREE.Mesh(cactusArmGeo, cactusMat);
        arm2.rotation.z = -Math.PI / 3;
        arm2.position.set(-0.15, 0.5 + Math.random() * 0.2, 0);
        cactus.add(arm2);
      }

      cactus.position.set(-15 + i * 7 + Math.random() * 4, GROUND_Y, -5);
      this.cacti.push(cactus);
      this.scene.add(cactus);
    }
  }

  _buildGround() {
    // Wide scrolling ground plane
    const groundGeo = new THREE.PlaneGeometry(60, 4);
    const groundMat = new THREE.MeshToonMaterial({ color: 0xd2b48c }); // sandy tan
    this._geometries.push(groundGeo);
    this._materials.push(groundMat);

    for (let i = 0; i < 2; i++) {
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(i * 60, GROUND_Y, 0);
      this.scene.add(ground);
      this.groundTiles.push(ground);
    }

    // Ground line (darker strip at the top of the ground)
    const lineGeo = new THREE.PlaneGeometry(60, 0.08);
    const lineMat = new THREE.MeshToonMaterial({ color: 0xaa8855 });
    this._geometries.push(lineGeo);
    this._materials.push(lineMat);
    for (let i = 0; i < 2; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * 60, GROUND_Y + 0.01, -1.95);
      this.scene.add(line);
      this.groundTiles.push(line);
    }
  }

  // ---- HUD ----

  _buildHUD() {
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'arcade-hud';
    this.hudEl.innerHTML = `
      <div class="arcade-scanlines"></div>
      <div class="arcade-header">STAGECOACH STAMPEDE</div>
      <div class="arcade-stats">
        <div class="arcade-stat">
          <span class="arcade-label">FIDUCIARY PTS</span>
          <span class="arcade-value" id="arcade-score">0</span>
        </div>
        <div class="arcade-stat">
          <span class="arcade-label">DISTANCE</span>
          <span class="arcade-value" id="arcade-distance">0</span>
        </div>
        <div class="arcade-stat">
          <span class="arcade-label">HIGH SCORE</span>
          <span class="arcade-value" id="arcade-highscore">${this.highScore}</span>
        </div>
      </div>
      <div class="arcade-controls">SPACE/UP: Jump &nbsp; DOWN: Duck &nbsp; ESC: Quit</div>
    `;
    document.body.appendChild(this.hudEl);
  }

  _showGameOver() {
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      this.player.setFlag('arcade_highscore', this.score);
    }

    this.gameOverEl = document.createElement('div');
    this.gameOverEl.id = 'arcade-gameover';
    this.gameOverEl.innerHTML = `
      <div class="arcade-scanlines"></div>
      <div class="arcade-gameover-title">GAME OVER</div>
      <div class="arcade-gameover-subtitle">${isNewRecord ? '*** NEW HIGH SCORE! ***' : 'Better luck next time, partner.'}</div>
      <div class="arcade-gameover-stats">
        <div>FIDUCIARY POINTS: <span class="arcade-gold">${this.score}</span></div>
        <div>DISTANCE: <span class="arcade-gold">${Math.floor(this.distance)}</span></div>
        <div>HIGH SCORE: <span class="arcade-gold">${this.highScore}</span></div>
      </div>
      <div class="arcade-gameover-prompt">
        <div>ENTER — Ride Again</div>
        <div>ESCAPE — Return to Office</div>
      </div>
    `;
    document.body.appendChild(this.gameOverEl);
  }

  _updateHUD() {
    const scoreEl = document.getElementById('arcade-score');
    const distEl = document.getElementById('arcade-distance');
    const hiEl = document.getElementById('arcade-highscore');
    if (scoreEl) scoreEl.textContent = this.score;
    if (distEl) distEl.textContent = Math.floor(this.distance);
    if (hiEl) hiEl.textContent = Math.max(this.highScore, this.score);
  }

  // ---- OBSTACLE / COLLECTIBLE BUILDING ----

  _createObstacle(typeDef) {
    const group = new THREE.Group();

    if (typeDef.id === 'regulation_scroll') {
      // Tall red scroll/cylinder
      const geo = new THREE.CylinderGeometry(0.2, 0.2, typeDef.height, 8);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = typeDef.height / 2;
      group.add(mesh);
      // Seal on top
      const sealGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const sealMat = new THREE.MeshToonMaterial({ color: 0xffd700 });
      const seal = new THREE.Mesh(sealGeo, sealMat);
      seal.position.y = typeDef.height + 0.1;
      group.add(seal);

    } else if (typeDef.id === 'compliance_auditor') {
      // Little suited figure
      // Body (suit)
      const bodyGeo = new THREE.BoxGeometry(0.4, 0.7, 0.3);
      const bodyMat = new THREE.MeshToonMaterial({ color: 0x222244 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      group.add(body);
      // Head
      const headGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const headMat = new THREE.MeshToonMaterial({ color: 0xffcc99 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.2;
      group.add(head);
      // Clipboard
      const clipGeo = new THREE.BoxGeometry(0.15, 0.25, 0.03);
      const clipMat = new THREE.MeshToonMaterial({ color: 0xdddddd });
      const clip = new THREE.Mesh(clipGeo, clipMat);
      clip.position.set(0.3, 0.8, 0);
      group.add(clip);
      // Legs
      const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
      const legMat = new THREE.MeshToonMaterial({ color: 0x222244 });
      [-0.1, 0.1].forEach(x => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.17, 0);
        group.add(leg);
      });

    } else if (typeDef.id === 'falling_memo') {
      // Flat paper
      const geo = new THREE.BoxGeometry(typeDef.width, 0.05, 0.5);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      // Red "URGENT" stamp visual
      const stampGeo = new THREE.BoxGeometry(0.3, 0.02, 0.15);
      const stampMat = new THREE.MeshToonMaterial({ color: 0xcc0000 });
      const stamp = new THREE.Mesh(stampGeo, stampMat);
      stamp.position.y = 0.035;
      group.add(stamp);

    } else if (typeDef.id === 'filing_cabinet') {
      // Wide, short cabinet
      const geo = new THREE.BoxGeometry(typeDef.width, typeDef.height, 0.5);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = typeDef.height / 2;
      group.add(mesh);
      // Drawer handles
      const handleGeo = new THREE.BoxGeometry(0.2, 0.03, 0.06);
      const handleMat = new THREE.MeshToonMaterial({ color: 0xaaaaaa });
      [0.15, 0.45].forEach(y => {
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, y, 0.28);
        group.add(handle);
      });
    }

    return group;
  }

  _createCollectible(typeDef) {
    const group = new THREE.Group();

    if (typeDef.id === 'trust_document') {
      const geo = new THREE.BoxGeometry(typeDef.size, typeDef.size * 1.3, 0.04);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color, emissive: 0x443300, emissiveIntensity: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      // Seal
      const sealGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const sealMat = new THREE.MeshToonMaterial({ color: 0xff4444 });
      const seal = new THREE.Mesh(sealGeo, sealMat);
      seal.position.set(0, -0.15, 0.03);
      group.add(seal);

    } else if (typeDef.id === 'coffee_cup') {
      const geo = new THREE.CylinderGeometry(0.1, 0.13, typeDef.size, 8);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      // Steam (small white sphere)
      const steamGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const steamMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
      const steam = new THREE.Mesh(steamGeo, steamMat);
      steam.position.y = 0.2;
      group.add(steam);

    } else if (typeDef.id === 'charter_fragment') {
      const geo = new THREE.BoxGeometry(typeDef.size, typeDef.size, typeDef.size * 0.3);
      const mat = new THREE.MeshToonMaterial({ color: typeDef.color, emissive: 0xffaa00, emissiveIntensity: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      // Outer glow
      const glowGeo = new THREE.BoxGeometry(typeDef.size * 1.4, typeDef.size * 1.4, typeDef.size * 0.1);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.25 });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      group.add(glowMesh);
    }

    return group;
  }

  // ---- SPAWNING ----

  _spawnObstacle() {
    // Pick a type, weighted so falling memos become more common at higher speeds
    const pool = [...OBSTACLE_TYPES];
    // Add extra falling memos at higher speeds
    if (this.scrollSpeed > 8) pool.push(OBSTACLE_TYPES[2]);
    if (this.scrollSpeed > 12) pool.push(OBSTACLE_TYPES[2]);

    const typeDef = pool[Math.floor(Math.random() * pool.length)];
    const mesh = this._createObstacle(typeDef);

    let y = GROUND_Y;
    if (typeDef.falling) {
      // Falling memos start high and need to be ducked
      y = GROUND_Y + 2.0 + Math.random() * 0.5;
    }

    mesh.position.set(SPAWN_X, y, 0);
    this.scene.add(mesh);

    this.obstacles.push({
      mesh,
      typeDef,
      x: SPAWN_X,
      y,
      width: typeDef.width,
      height: typeDef.height,
      falling: typeDef.falling || false,
      fallSpeed: typeDef.falling ? 0 : 0, // Memos float at fixed height
    });
  }

  _spawnCollectible() {
    // Decide type
    let typeDef;
    const roll = Math.random();
    if (roll < 0.05) {
      typeDef = COLLECTIBLE_TYPES[2]; // charter fragment (rare)
    } else if (roll < 0.35) {
      typeDef = COLLECTIBLE_TYPES[1]; // coffee cup
    } else {
      typeDef = COLLECTIBLE_TYPES[0]; // trust document
    }

    const mesh = this._createCollectible(typeDef);
    const y = GROUND_Y + 0.5 + Math.random() * 2.0;
    mesh.position.set(SPAWN_X + 2, y, 0);
    this.scene.add(mesh);

    this.collectibles.push({
      mesh,
      typeDef,
      x: SPAWN_X + 2,
      y,
      size: typeDef.size,
      collected: false,
    });
  }

  // ---- COLLISION ----

  _checkCollisions() {
    // Coach bounding box
    const coachLeft = COACH_X - 1.2;
    const coachRight = COACH_X + 0.9;
    const coachBottom = this.coachY + GROUND_Y;
    const coachTop = coachBottom + (this.isDucking ? DUCK_HEIGHT : NORMAL_HEIGHT);

    // Obstacles
    for (const obs of this.obstacles) {
      const obsLeft = obs.x - obs.width / 2;
      const obsRight = obs.x + obs.width / 2;
      let obsBottom, obsTop;

      if (obs.falling) {
        // Falling memo — narrow vertical hitbox at its height
        obsBottom = obs.y - 0.15;
        obsTop = obs.y + 0.15;
      } else {
        obsBottom = GROUND_Y;
        obsTop = GROUND_Y + obs.height;
      }

      // AABB check
      if (coachRight > obsLeft && coachLeft < obsRight &&
          coachTop > obsBottom && coachBottom < obsTop) {
        this.gameOver = true;
        this._showGameOver();
        return;
      }
    }

    // Collectibles
    for (const col of this.collectibles) {
      if (col.collected) continue;

      const colLeft = col.x - col.size / 2;
      const colRight = col.x + col.size / 2;
      const colBottom = col.y - col.size / 2;
      const colTop = col.y + col.size / 2;

      if (coachRight > colLeft && coachLeft < colRight &&
          coachTop > colBottom && coachBottom < colTop) {
        col.collected = true;
        col.mesh.visible = false;
        this.score += col.typeDef.points;

        if (col.typeDef.speedBoost) {
          this.speedBoostTimer = 2.0;
        }

        // Flash effect
        this._flashCollect();
      }
    }
  }

  _flashCollect() {
    // Brief green tint on the scene background
    const origColor = this.scene.background.clone();
    this.scene.background = new THREE.Color(0x88ffaa);
    setTimeout(() => {
      if (this.scene) this.scene.background = origColor;
    }, 80);
  }

  // ---- RESTART ----

  _restart() {
    // Remove old obstacles/collectibles from scene
    for (const obs of this.obstacles) {
      this.scene.remove(obs.mesh);
    }
    for (const col of this.collectibles) {
      this.scene.remove(col.mesh);
    }
    this.obstacles = [];
    this.collectibles = [];

    // Reset state
    this.score = 0;
    this.distance = 0;
    this.scrollSpeed = 5;
    this.speedBoostTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.collectibleTimer = 0;
    this.coachY = 0;
    this.coachVelocityY = 0;
    this.isDucking = false;
    this.isJumping = false;
    this.gameOver = false;

    // Reset coach
    this.coach.position.y = GROUND_Y + 0.15;
    this.coach.scale.set(1, 1, 1);

    // Remove game over screen
    if (this.gameOverEl) {
      this.gameOverEl.remove();
      this.gameOverEl = null;
    }

    // Reset background color
    this.scene.background = new THREE.Color(0x87ceeb);

    this._updateHUD();
  }

  // ---- UPDATE ----

  update(dt) {
    Engine.renderScene(this.scene, this.camera);
    Engine.skipDefaultRender();

    if (this.gameOver) {
      // Only listen for restart or exit
      if (InputManager.isJustPressed('enter')) {
        this._restart();
      }
      if (InputManager.isJustPressed('escape')) {
        this.stateManager.pop();
      }
      return;
    }

    if (!this.started) return;

    // ---- INPUT ----
    const wantsJump = InputManager.isJustPressed(' ') || InputManager.isJustPressed('arrowup')
      || InputManager.isJustPressed('w');
    const wantsDuck = InputManager.isDown('arrowdown') || InputManager.isDown('s');

    if (wantsJump && !this.isJumping) {
      this.isJumping = true;
      this.coachVelocityY = JUMP_VELOCITY;
      this.isDucking = false;
    }

    if (!this.isJumping) {
      this.isDucking = wantsDuck;
    }

    // Exit
    if (InputManager.isJustPressed('escape')) {
      this.stateManager.pop();
      return;
    }

    // ---- PHYSICS ----
    if (this.isJumping) {
      this.coachVelocityY += GRAVITY * dt;
      this.coachY += this.coachVelocityY * dt;

      if (this.coachY <= 0) {
        this.coachY = 0;
        this.coachVelocityY = 0;
        this.isJumping = false;
      }
    }

    // Coach position
    this.coach.position.y = GROUND_Y + 0.15 + this.coachY;

    // Duck visual — squash the coach
    if (this.isDucking) {
      this.coach.scale.y = 0.5;
      this.coach.position.y = GROUND_Y + 0.05;
    } else if (!this.isJumping) {
      this.coach.scale.y = 1.0;
    }

    // ---- SCROLLING ----
    const effectiveSpeed = this.speedBoostTimer > 0 ? this.scrollSpeed * 1.5 : this.scrollSpeed;

    // Speed ramp
    this.scrollSpeed = Math.min(this.maxSpeed, 5 + this.distance * 0.008);

    // Speed boost timer
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
    }

    this.distance += effectiveSpeed * dt;

    // Scroll ground tiles
    for (const tile of this.groundTiles) {
      tile.position.x -= effectiveSpeed * dt;
      if (tile.position.x < -60) {
        tile.position.x += 120;
      }
    }

    // Parallax mountains (slow)
    for (const mt of this.mountains) {
      mt.position.x -= effectiveSpeed * dt * 0.15;
      if (mt.position.x < -25) {
        mt.position.x += 50;
      }
    }

    // Parallax cacti (medium)
    for (const cactus of this.cacti) {
      cactus.position.x -= effectiveSpeed * dt * 0.4;
      if (cactus.position.x < -20) {
        cactus.position.x += 40;
      }
    }

    // ---- WHEEL ROTATION ----
    const wheelRotSpeed = effectiveSpeed * 3;
    for (const wheel of this.wheels) {
      wheel.rotation.z -= wheelRotSpeed * dt;
    }

    // ---- HORSE BOBBING ----
    if (this.horses) {
      this.horses.position.y = Math.sin(Date.now() * 0.012) * 0.06;
    }

    // ---- OBSTACLE SPAWNING ----
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawnObstacle();
      // Decrease spawn interval as speed increases (min 0.6s)
      this.spawnInterval = Math.max(0.6, 1.8 - (this.scrollSpeed - 5) * 0.1);
      // Add some randomness
      this.spawnTimer = this.spawnInterval * (0.7 + Math.random() * 0.6);
    }

    // Collectible spawning (separate timer)
    this.collectibleTimer -= dt;
    if (this.collectibleTimer <= 0) {
      this._spawnCollectible();
      this.collectibleTimer = 1.5 + Math.random() * 2.0;
    }

    // ---- MOVE OBSTACLES ----
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= effectiveSpeed * dt;
      obs.mesh.position.x = obs.x;

      // Auditor walk animation
      if (obs.typeDef.id === 'compliance_auditor') {
        obs.mesh.position.y = GROUND_Y + Math.abs(Math.sin(Date.now() * 0.01)) * 0.08;
      }

      // Remove if off screen
      if (obs.x < DESPAWN_X) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // ---- MOVE COLLECTIBLES ----
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= effectiveSpeed * dt;
      col.mesh.position.x = col.x;

      // Spin and bob
      if (!col.collected) {
        col.mesh.rotation.y += dt * 3;
        col.mesh.position.y = col.y + Math.sin(Date.now() * 0.005 + col.x) * 0.15;
      }

      if (col.x < DESPAWN_X) {
        this.scene.remove(col.mesh);
        this.collectibles.splice(i, 1);
      }
    }

    // ---- COLLISION ----
    this._checkCollisions();

    // ---- HUD ----
    this._updateHUD();
  }
}
