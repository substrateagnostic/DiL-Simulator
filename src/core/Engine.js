import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { COLORS } from '../utils/constants.js';

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
  }

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene — the void around rooms is a faint blueprint of the building
    this.scene = new THREE.Scene();
    this.scene.background = this._createVoidBackdrop();
    // Distance fog fades the city backdrop without touching the room
    // (rooms sit ~20-35 units from camera; buildings 40-80)
    this.scene.fog = new THREE.Fog(0x14142a, 42, 88);

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

    // Post-processing: render pass + subtle bloom (emissives glow).
    // The render pass scene/camera are swapped per frame so combat's own
    // scene gets the same treatment via renderScene().
    this._renderPass = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.addPass(this._renderPass);
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.38,   // strength — subtle
      0.5,    // radius
      0.8     // threshold — only emissive/bright pixels bloom
    );
    this.composer.addPass(this._bloomPass);

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    // Lighting
    this._setupLighting();

    // The city outside (lazy import avoids a cycle; fire-and-forget)
    import('../effects/CityBackdrop.js').then(({ CityBackdrop }) => {
      this.cityBackdrop = new CityBackdrop(this.scene);
      if (this._pendingTimeOfDay) this.cityBackdrop.setTimeOfDay(this._pendingTimeOfDay);
    });

    // The ghost of the building around the current room
    import('../effects/BuildingShell.js').then(({ BuildingShell }) => {
      this.buildingShell = new BuildingShell(this.scene);
      if (this._pendingShellRoom) this.buildingShell.buildFor(this._pendingShellRoom);
    });
  }

  // Story-driven time of day — drives the city backdrop palette + fog.
  // Room interior rigs stay authoritative (applyRoomLighting).
  setTimeOfDay(key) {
    if (this.cityBackdrop) this.cityBackdrop.setTimeOfDay(key);
    else this._pendingTimeOfDay = key;
  }

  _createVoidBackdrop() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Radial navy gradient, lifted at center
    const grad = ctx.createRadialGradient(size / 2, size * 0.44, 80, size / 2, size / 2, size * 0.74);
    grad.addColorStop(0, '#20203c');
    grad.addColorStop(0.55, '#171728');
    grad.addColorStop(1, '#0c0c16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Blueprint grid
    ctx.strokeStyle = 'rgba(83,168,182,0.045)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(83,168,182,0.075)';
    for (let i = 0; i <= size; i += 256) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

    // Faint floor-plan fragments — the building dreaming about itself
    ctx.strokeStyle = 'rgba(83,168,182,0.06)';
    ctx.lineWidth = 1.5;
    const plans = [
      [96, 128, 200, 140], [704, 96, 220, 170], [128, 720, 180, 160],
      [736, 680, 190, 200], [448, 64, 130, 90],
    ];
    for (const [x, y, w, h] of plans) {
      ctx.strokeRect(x, y, w, h);
      ctx.strokeRect(x + w * 0.55, y, w * 0.45, h * 0.4); // inner room
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.6); ctx.lineTo(x + w * 0.35, y + h * 0.6); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _setupLighting() {
    // Ambient light (soft fill)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    this._ambient = ambient;
    this._flicker = false;
    this._baseDirIntensity = 0.8;

    // Main directional light (fluorescent ceiling)
    const dirLight = new THREE.DirectionalLight(COLORS.FLUORESCENT, 0.8);
    dirLight.position.set(5, 15, 5);
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
    this.scene.add(dirLight);
    this._dirLight = dirLight;

    // Subtle fill from other side
    const fillLight = new THREE.DirectionalLight(0xb0c0d0, 0.3);
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
      this._ambient.color.set(c.ambient ?? 0xffffff);
      this._ambient.intensity = c.ambientIntensity ?? 0.6;
    }
    if (this._dirLight) {
      this._dirLight.color.set(c.dir ?? COLORS.FLUORESCENT);
      this._dirLight.intensity = c.dirIntensity ?? 0.8;
      this._baseDirIntensity = this._dirLight.intensity;
    }
    this._flicker = !!c.flicker;
  }

  // Viewport-aware ortho zoom. Desktop: the classic 12. Portrait phones:
  // scale up so ~14 world units stay visible horizontally. Short landscape
  // viewports: shrink so rooms don't dwindle.
  _zoomForViewport() {
    const aspect = this.width / this.height;
    if (aspect < 1) return Math.min(16, 7 / aspect);
    return this.height < 540 ? 8 : 12;
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

    if (this._updateCallback) {
      this._updateCallback(dt);
    }
    // States handle their own rendering via renderScene().
    // Default render for states that don't explicitly render (title, menu).
    if (!this._skipDefaultRender) {
      this._renderPass.scene = this.scene;
      this._renderPass.camera = this.camera;
      this.composer.render();
    }
    this._skipDefaultRender = false;
  }

  // Call this in update() to skip the default render for this frame
  skipDefaultRender() {
    this._skipDefaultRender = true;
  }

  // Render a different scene/camera (for combat) — same bloom pipeline
  renderScene(scene, camera) {
    this._renderPass.scene = scene;
    this._renderPass.camera = camera;
    this.composer.render();
  }
}

export const Engine = new EngineClass();
