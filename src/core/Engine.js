import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';

class EngineClass {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.running = false;
    this._updateCallback = null;
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BG_DARK);

    // Orthographic camera for isometric view
    const aspect = this.width / this.height;
    const zoom = 12;
    this.camera = new THREE.OrthographicCamera(
      -zoom * aspect, zoom * aspect,
      zoom, -zoom,
      0.1, 1000
    );

    // Clock
    this.clock = new THREE.Clock();

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    // Lighting
    this._setupLighting();
  }

  _setupLighting() {
    // Ambient light (soft fill)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

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

    // Subtle fill from other side
    const fillLight = new THREE.DirectionalLight(0xb0c0d0, 0.3);
    fillLight.position.set(-5, 8, -3);
    this.scene.add(fillLight);
  }

  _onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const aspect = this.width / this.height;
    const zoom = 12;

    this.camera.left = -zoom * aspect;
    this.camera.right = zoom * aspect;
    this.camera.top = zoom;
    this.camera.bottom = -zoom;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  onUpdate(callback) {
    this._updateCallback = callback;
  }

  start() {
    this.running = true;
    this.clock.start();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta at 50ms
    if (this._updateCallback) {
      this._updateCallback(dt);
    }
    // States handle their own rendering via renderScene().
    // Default render for states that don't explicitly render (title, menu).
    if (!this._skipDefaultRender) {
      this.renderer.render(this.scene, this.camera);
    }
    this._skipDefaultRender = false;
  }

  // Call this in update() to skip the default render for this frame
  skipDefaultRender() {
    this._skipDefaultRender = true;
  }

  // Render a different scene/camera (for combat)
  renderScene(scene, camera) {
    this.renderer.render(scene, camera);
  }
}

export const Engine = new EngineClass();
