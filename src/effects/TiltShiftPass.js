import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// The display-case signature: tilt-shift miniature blur.
//
// A separable two-step gradient blur — horizontal into an internal target,
// then vertical out — with a sharp focus band across the middle of the
// screen and blur ramping smoothly toward the top and bottom edges. This
// is the screen-space, orthographic-friendly version of the Link's
// Awakening remake look ("looking into a miniature diorama"); a real
// depth-driven DoF is meaningless under an ortho camera, but a vertical
// gradient reads identically because the isometric camera maps world
// depth to screen Y.
//
// Engine gates this pass per frame on camera.isOrthographicCamera —
// combat's perspective camera must never receive it.
//
// Uniforms (shared by both internal materials — set once, drives both):
//   focusCenter  0..1 screen Y of the sharp band's center (0.5 = middle)
//   bandWidth    height of the fully-sharp band in screen fractions
//   maxBlur      blur radius in device pixels at the screen edge
//   strength     0..1 master fade for the whole effect

const VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform vec2 direction;
  uniform float focusCenter;
  uniform float bandWidth;
  uniform float maxBlur;
  uniform float strength;
  varying vec2 vUv;

  // Blur radius (pixels) as a function of screen Y. Zero inside the focus
  // band, then a smoothstep-eased ramp to maxBlur at the screen edge —
  // continuous everywhere, so there is no visible band boundary.
  float blurRadius(float y) {
    float d = abs(y - focusCenter);
    float hb = bandWidth * 0.5;
    float t = clamp((d - hb) / max(0.5 - hb, 1e-3), 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    return maxBlur * strength * t;
  }

  void main() {
    vec4 base = texture2D(tDiffuse, vUv);
    float radius = blurRadius(vUv.y);
    if (radius < 0.05) {           // inside the band: passthrough (ramp
      gl_FragColor = base;         // makes this cut invisible)
      return;
    }
    // 13-tap gaussian, taps spread across the radius (max tap spacing
    // radius/6 px keeps large radii smooth — no banding, no soup)
    vec2 stride = (direction / resolution) * (radius / 6.0);
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = -6; i <= 6; i++) {
      float w = exp(-float(i * i) / 11.52);   // sigma = 2.4 taps
      acc += texture2D(tDiffuse, vUv + stride * float(i)).rgb * w;
      wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, base.a);
  }
`;

export class TiltShiftPass extends Pass {
  constructor(width, height, options = {}) {
    super();

    // Public uniform objects, shared by reference between both materials
    this.uniforms = {
      focusCenter: { value: options.focusCenter ?? 0.5 },
      bandWidth:   { value: options.bandWidth ?? 0.30 },
      maxBlur:     { value: options.maxBlur ?? 7.0 },
      strength:    { value: options.strength ?? 1.0 },
    };
    this._resolution = new THREE.Vector2(width, height);

    const makeMaterial = (dir) => new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: this._resolution },
        direction: { value: dir },
        // same objects, not clones — tuning one set tunes both steps
        focusCenter: this.uniforms.focusCenter,
        bandWidth: this.uniforms.bandWidth,
        maxBlur: this.uniforms.maxBlur,
        strength: this.uniforms.strength,
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      // Never let the renderer inject tone-mapping helper code (it does
      // for toneMapped materials on screen targets, and injected helper
      // names can collide with hand-written shader functions)
      toneMapped: false,
    });
    this._matH = makeMaterial(new THREE.Vector2(1, 0));
    this._matV = makeMaterial(new THREE.Vector2(0, 1));

    // Intermediate target for the horizontal step. HalfFloat matches the
    // composer's buffers so the gradient never quantizes into bands.
    this._rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
    this._rt.texture.name = 'TiltShiftPass.horizontal';

    this._fsQuad = new FullScreenQuad(this._matH);
  }

  setSize(width, height) {
    this._rt.setSize(width, height);
    this._resolution.set(width, height);
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    // Step 1 — horizontal, into the internal target
    this._matH.uniforms.tDiffuse.value = readBuffer.texture;
    this._fsQuad.material = this._matH;
    renderer.setRenderTarget(this._rt);
    this._fsQuad.render(renderer);

    // Step 2 — vertical, out
    this._matV.uniforms.tDiffuse.value = this._rt.texture;
    this._fsQuad.material = this._matV;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this._fsQuad.render(renderer);
  }

  dispose() {
    this._rt.dispose();
    this._matH.dispose();
    this._matV.dispose();
    this._fsQuad.dispose();
  }
}
