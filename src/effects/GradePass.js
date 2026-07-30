import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Filmic color grade — the final look pass before the (optional) 1998
// retro pass. Exposure / contrast / saturation plus lift-gamma-gain,
// driven by a per-time-of-day GRADES table. This table REPLACES
// RetroPass's RETRO_GRADES as the grade carrier, so grades survive 1998
// mode being off (its new default). Engine.setTimeOfDay routes here.
//
// This pass ALSO owns the chain's output transform (ACES tone map +
// linear->sRGB) — see the shader comment. It must never be disabled or
// removed from the composer; to neutralize the grade, set strength 0.
//
// Grade philosophy (art bible / comp card):
//   - Interiors stay Severance-sterile: cool fluorescent neutrality.
//     NO orange wash, ever — restraint is the luxury signal. Whites in
//     the rooms must stay white; time of day is felt mostly in the void
//     and the city, and only whispered indoors.
//   - Night leans Refn/Drive: deep true blacks (lift crushed slightly
//     below zero), cool gain, a small saturation push so the sodium and
//     magenta accents pop against the dark.

export const GRADES = {
  //             exposure contrast saturation  lift (RGB)                gamma (RGB)            gain (RGB)
  morning:    { exposure: 1.02, contrast: 1.02, saturation: 1.00, lift: [0.010, 0.012, 0.018], gamma: [1.00, 1.00, 1.00], gain: [1.000, 1.005, 1.020] },
  afternoon:  { exposure: 1.00, contrast: 1.03, saturation: 1.01, lift: [0.006, 0.008, 0.010], gamma: [1.00, 1.00, 1.00], gain: [1.000, 1.000, 1.005] },
  goldenhour: { exposure: 1.00, contrast: 1.04, saturation: 1.04, lift: [0.008, 0.004, 0.000], gamma: [1.00, 1.00, 1.02], gain: [1.035, 0.995, 0.945] },
  dusk:       { exposure: 0.99, contrast: 1.05, saturation: 1.02, lift: [0.000, 0.004, 0.014], gamma: [1.00, 1.00, 0.99], gain: [0.965, 0.985, 1.045] },
  night:      { exposure: 0.96, contrast: 1.09, saturation: 1.06, lift: [-0.012, -0.010, -0.004], gamma: [1.00, 1.00, 0.985], gain: [0.942, 0.982, 1.048] },
  predawn:    { exposure: 0.98, contrast: 1.05, saturation: 0.94, lift: [0.002, 0.006, 0.016], gamma: [1.00, 1.00, 0.995], gain: [0.955, 0.980, 1.045] },
  // Combat (perspective camera) — Refn blacks under the ribbon backdrop:
  // exposure trimmed, shadows crushed only slightly, green gain cut so
  // magenta stays THE accent against deep black instead of an all-over
  // wash. Round-2 lift: the old crush ate the whole lower stage into a
  // dead black band (critic: "the post stack is doing nothing here") —
  // the floor glow and stage gradient must survive the grade.
  combat:     { exposure: 0.90, contrast: 1.12, saturation: 1.05, lift: [-0.018, -0.024, -0.012], gamma: [1.03, 1.04, 1.01], gain: [0.992, 0.912, 1.030] },
};

// Uniform names the grade shader chunk below expects. Exported so a host pass
// that INLINES the grade (see TiltShiftPass's merged vertical+grade material)
// declares exactly the same set — the merge exists to keep the chain inside
// COMP_CARD's ≤4 full-screen pass budget by removing one round trip through a
// full-screen render target.
export function makeGradeUniforms() {
  return {
    exposure: { value: 1.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    lift: { value: [0, 0, 0] },
    gamma: { value: [1, 1, 1] },
    gain: { value: [1, 1, 1] },
    // Named gradeStrength, not strength: the host pass that inlines this chunk
    // (TiltShiftPass) already has a `strength` uniform for the BLUR fade, and
    // two `uniform float strength` declarations in one shader is a compile
    // error, not a shadow.
    gradeStrength: { value: 1.0 },
  };
}

// Write a GRADES entry into a uniform set built by makeGradeUniforms().
// Returns the resolved key, or null when the key was already applied.
export function applyGradeUniforms(u, key, currentKey) {
  const resolved = GRADES[key] ? key : 'afternoon';
  if (resolved === currentKey) return null;
  const g = GRADES[resolved];
  u.exposure.value = g.exposure;
  u.contrast.value = g.contrast;
  u.saturation.value = g.saturation;
  // ShaderPass clones uniforms; array values arrive as plain arrays
  u.lift.value = [...g.lift];
  u.gamma.value = [...g.gamma];
  u.gain.value = [...g.gain];
  return resolved;
}

// The grade + OUTPUT TRANSFORM as a reusable GLSL chunk. Declares the grade
// uniforms and a `vec3 gradeApply(vec3 linearHDR)` entry point. Any pass that
// includes this becomes the chain's output transform, so exactly ONE pass may
// use it per frame.
export const GRADE_GLSL = /* glsl */`
  uniform float exposure;
  uniform float contrast;
  uniform float saturation;
  uniform vec3 lift;
  uniform vec3 gamma;
  uniform vec3 gain;
  uniform float gradeStrength;

  // OUTPUT TRANSFORM — ACES tone mapping and the linear->sRGB encode for
  // the whole composer chain. three only applies
  // renderer.toneMapping/outputColorSpace when rendering to the screen
  // framebuffer, so scene renders into the composer's targets arrive here
  // as linear HDR. The carrying pass is always enabled; 'strength' fades
  // the GRADE only, never the output transform.

  // NOTE: names must not collide with three's injected
  // tonemapping_pars_fragment (RRTAndODTFit, ACESFilmicToneMapping...)
  // — the renderer prepends those helpers to any toneMapped material
  // that renders to screen, and a duplicate body kills the compile.
  // Carrying materials also set toneMapped = false, but stay defensive.
  vec3 gradeRRTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }

  // three.js ACESFilmicToneMapping (Stephen Hill fit), exposure 1.0
  vec3 gradeAcesFilmic(vec3 color) {
    const mat3 ACESInputMat = mat3(
      vec3(0.59719, 0.07600, 0.02840),
      vec3(0.35458, 0.90834, 0.13383),
      vec3(0.04823, 0.01566, 0.83777)
    );
    const mat3 ACESOutputMat = mat3(
      vec3(1.60475, -0.10208, -0.00327),
      vec3(-0.53108, 1.10813, -0.07276),
      vec3(-0.07367, -0.00605, 1.07602)
    );
    color *= 1.0 / 0.6;
    color = ACESInputMat * color;
    color = gradeRRTFit(color);
    color = ACESOutputMat * color;
    return clamp(color, 0.0, 1.0);
  }

  vec3 gradeLinearToSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
               step(vec3(0.0031308), c));
  }

  vec3 gradeApply(vec3 srcLinear) {
    // Ungraded reference: straight output transform
    vec3 base = gradeLinearToSRGB(gradeAcesFilmic(srcLinear));
    // Graded: exposure in linear, transform, then display-space grade
    vec3 c = gradeLinearToSRGB(gradeAcesFilmic(srcLinear * exposure));
    // lift-gamma-gain (shadows / midtones / highlights)
    c = gain * (c + lift * (1.0 - c));
    c = pow(max(c, vec3(0.0)), vec3(1.0) / gamma);
    // pivot contrast around mid-grey
    c = (c - 0.5) * contrast + 0.5;
    // saturation around luminance
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, saturation);
    c = clamp(c, 0.0, 1.0);
    return mix(base, c, gradeStrength);
  }
`;

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    exposure: { value: 1.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    lift: { value: [0, 0, 0] },
    gamma: { value: [1, 1, 1] },
    gain: { value: [1, 1, 1] },
    strength: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float exposure;
    uniform float contrast;
    uniform float saturation;
    uniform vec3 lift;
    uniform vec3 gamma;
    uniform vec3 gain;
    uniform float strength;
    varying vec2 vUv;

    // OUTPUT TRANSFORM — this pass also owns ACES tone mapping and the
    // linear->sRGB encode for the whole composer chain. three only
    // applies renderer.toneMapping/outputColorSpace when rendering to
    // the screen framebuffer, so scene renders into the composer's
    // targets arrive here as linear HDR. GradePass is always enabled;
    // 'strength' fades the GRADE only, never the output transform.

    // NOTE: names must not collide with three's injected
    // tonemapping_pars_fragment (RRTAndODTFit, ACESFilmicToneMapping...)
    // — the renderer prepends those helpers to any toneMapped material
    // that renders to screen, and a duplicate body kills the compile.
    // We also set material.toneMapped = false, but stay defensive.
    vec3 gradeRRTFit(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }

    // three.js ACESFilmicToneMapping (Stephen Hill fit), exposure 1.0
    vec3 gradeAcesFilmic(vec3 color) {
      const mat3 ACESInputMat = mat3(
        vec3(0.59719, 0.07600, 0.02840),
        vec3(0.35458, 0.90834, 0.13383),
        vec3(0.04823, 0.01566, 0.83777)
      );
      const mat3 ACESOutputMat = mat3(
        vec3(1.60475, -0.10208, -0.00327),
        vec3(-0.53108, 1.10813, -0.07276),
        vec3(-0.07367, -0.00605, 1.07602)
      );
      color *= 1.0 / 0.6;
      color = ACESInputMat * color;
      color = gradeRRTFit(color);
      color = ACESOutputMat * color;
      return clamp(color, 0.0, 1.0);
    }

    vec3 linearToSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
                 step(vec3(0.0031308), c));
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);

      // Ungraded reference: straight output transform
      vec3 base = linearToSRGB(gradeAcesFilmic(src.rgb));

      // Graded: exposure in linear, transform, then display-space grade
      vec3 c = linearToSRGB(gradeAcesFilmic(src.rgb * exposure));
      // lift-gamma-gain (shadows / midtones / highlights)
      c = gain * (c + lift * (1.0 - c));
      c = pow(max(c, vec3(0.0)), vec3(1.0) / gamma);
      // pivot contrast around mid-grey
      c = (c - 0.5) * contrast + 0.5;
      // saturation around luminance
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = clamp(c, 0.0, 1.0);

      gl_FragColor = vec4(mix(base, c, strength), src.a);
    }
  `,
};

export class GradePass extends ShaderPass {
  constructor(key = 'afternoon') {
    super(GradeShader);
    this.name = 'grade';
    // Stop the renderer injecting its tone-mapping helpers (function-name
    // collisions) — this pass does its own transform in the shader.
    this.material.toneMapped = false;
    this.gradeKey = null;
    this.setGrade(key);
  }

  // Apply a time-of-day grade from the GRADES table. Unknown keys fall
  // back to the neutral 'afternoon' grade rather than throwing.
  // Cheap to call per frame — same-key calls return immediately (Engine
  // re-asserts the grade in _configurePostFor for ortho/combat routing).
  setGrade(key) {
    const resolved = applyGradeUniforms(this.uniforms, key, this.gradeKey);
    if (resolved) this.gradeKey = resolved;
  }
}
