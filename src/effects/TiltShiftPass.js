import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GRADE_GLSL, makeGradeUniforms, applyGradeUniforms } from './GradePass.js';

// The display-case signature: tilt-shift miniature blur — and, when
// constructed with `grade: true`, the chain's FINAL GRADE + OUTPUT TRANSFORM
// folded into the same draw.
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
// ── Why the grade lives here (pass budget) ───────────────────────────────
// COMP_CARD budgets ≤4 full-screen passes. Counted physically — which is
// what the GPU charges for — the shipped chain was FIVE rasterizations of
// the full frame: N8AO, bloom, tilt-H, tilt-V, grade. Grading inside the
// vertical step removes one full-screen render-target round trip (one write
// plus one read of a 16-bit-float buffer) at zero visual cost: the blur has
// always run in linear HDR and the grade has always been the next thing to
// touch the result, so `grade(blur(x))` in one draw is the same arithmetic
// as `grade(x)` after `blur(x)`, just without the trip through VRAM.
// Measured on an RTX 4050, cubicle_farm, GPU timer query: the separate grade
// pass cost 0.21ms at 1920×1080 and 0.38ms at 3840×2160.
//
// Because this pass now owns the output transform it must stay ENABLED for
// every frame. The blur is gated by `blurEnabled` instead — combat's
// perspective camera gets grade-only (a single draw, no blur, no internal
// target), which is also one pass fewer than before in combat.
//
// Uniforms (shared by all internal materials — set once, drives all):
//   focusCenter  0..1 screen Y of the sharp band's center (0.5 = middle)
//   bandWidth    height of the fully-sharp band in screen fractions
//   maxBlur      blur radius in device pixels at the screen edge
//   strength     0..1 master fade for the BLUR
// Grade uniforms are separate (see GradePass.makeGradeUniforms) and are set
// through setGrade(key), which is API-compatible with GradePass.

const VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// `BLUR` and `GRADE` are compile-time switches so each material carries only
// the code it needs: the horizontal step never pays for the grade ALU, and the
// grade-only step never pays for the 13-tap loop.
const fragment = ({ blur, grade }) => /* glsl */`
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  ${blur ? /* glsl */`
  uniform vec2 resolution;
  uniform vec2 direction;
  uniform float focusCenter;
  uniform float bandWidth;
  uniform float maxBlur;
  uniform float strength;

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
  ` : ''}
  ${grade ? GRADE_GLSL : ''}

  void main() {
    vec4 src = texture2D(tDiffuse, vUv);
    vec3 c = src.rgb;
    ${blur ? /* glsl */`
    float radius = blurRadius(vUv.y);
    // Inside the band the ramp has eased to zero, so skipping the taps is
    // invisible — and it keeps the sharp band bit-exact rather than
    // re-summing 13 identical samples.
    if (radius >= 0.05) {
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
      c = acc / wsum;
    }
    ` : ''}
    ${grade ? 'c = gradeApply(c);' : ''}
    gl_FragColor = vec4(c, src.a);
  }
`;

export class TiltShiftPass extends Pass {
  constructor(width, height, options = {}) {
    super();

    // Public uniform objects, shared by reference between the blur materials
    this.uniforms = {
      focusCenter: { value: options.focusCenter ?? 0.5 },
      bandWidth:   { value: options.bandWidth ?? 0.30 },
      maxBlur:     { value: options.maxBlur ?? 7.0 },
      strength:    { value: options.strength ?? 1.0 },
    };
    this._resolution = new THREE.Vector2(width, height);

    // Grade ownership. When on, this pass is the chain's output transform and
    // must never be disabled — gate the blur with `blurEnabled` instead.
    this.carriesGrade = options.grade === true;
    this.gradeUniforms = this.carriesGrade ? makeGradeUniforms() : null;
    this.gradeKey = null;
    this.blurEnabled = true;

    const makeMaterial = (dir, grade) => new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        ...(dir ? {
          resolution: { value: this._resolution },
          direction: { value: dir },
          // same objects, not clones — tuning one set tunes both steps
          focusCenter: this.uniforms.focusCenter,
          bandWidth: this.uniforms.bandWidth,
          maxBlur: this.uniforms.maxBlur,
          strength: this.uniforms.strength,
        } : {}),
        ...(grade ? this.gradeUniforms : {}),
      },
      vertexShader: VERTEX,
      fragmentShader: fragment({ blur: !!dir, grade: !!grade }),
      depthTest: false,
      depthWrite: false,
      // Never let the renderer inject tone-mapping helper code (it does
      // for toneMapped materials on screen targets, and injected helper
      // names can collide with hand-written shader functions)
      toneMapped: false,
    });
    // Horizontal step: blur only, stays in linear HDR (it writes to _rt).
    this._matH = makeMaterial(new THREE.Vector2(1, 0), false);
    // Vertical step: blur + (optionally) the grade/output transform.
    this._matV = makeMaterial(new THREE.Vector2(0, 1), this.carriesGrade);
    // Grade-only step for frames with the blur off (combat's perspective
    // camera, or the tilt-shift settings toggle). Built lazily.
    this._matG = null;
    this._makeMaterial = makeMaterial;

    // Intermediate target for the horizontal step. HalfFloat matches the
    // composer's buffers so the gradient never quantizes into bands.
    this._rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
    this._rt.texture.name = 'TiltShiftPass.horizontal';

    this._fsQuad = new FullScreenQuad(this._matH);
    if (this.carriesGrade) this.setGrade(options.gradeKey || 'afternoon');
  }

  // API-compatible with GradePass.setGrade — Engine calls this per frame and
  // same-key calls return immediately.
  setGrade(key) {
    if (!this.carriesGrade) return;
    const resolved = applyGradeUniforms(this.gradeUniforms, key, this.gradeKey);
    if (resolved) this.gradeKey = resolved;
  }

  setSize(width, height) {
    this._rt.setSize(width, height);
    this._resolution.set(width, height);
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    const out = this.renderToScreen ? null : writeBuffer;

    // Blur off (combat / settings toggle): one draw. When this pass does not
    // carry the grade there is nothing left to do at all.
    if (!this.blurEnabled) {
      if (!this.carriesGrade) return;
      if (!this._matG) this._matG = this._makeMaterial(null, true);
      this._matG.uniforms.tDiffuse.value = readBuffer.texture;
      this._fsQuad.material = this._matG;
      renderer.setRenderTarget(out);
      if (this.clear) renderer.clear();
      this._fsQuad.render(renderer);
      return;
    }

    // Step 1 — horizontal, into the internal target (still linear HDR)
    this._matH.uniforms.tDiffuse.value = readBuffer.texture;
    this._fsQuad.material = this._matH;
    renderer.setRenderTarget(this._rt);
    this._fsQuad.render(renderer);

    // Step 2 — vertical + grade + output transform, out
    this._matV.uniforms.tDiffuse.value = this._rt.texture;
    this._fsQuad.material = this._matV;
    renderer.setRenderTarget(out);
    if (this.clear) renderer.clear();
    this._fsQuad.render(renderer);
  }

  dispose() {
    this._rt.dispose();
    this._matH.dispose();
    this._matV.dispose();
    this._matG?.dispose();
    this._fsQuad.dispose();
  }
}
