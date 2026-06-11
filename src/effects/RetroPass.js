import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// The PS1 finish. Three things real 1998 output had that raw WebGL
// doesn't: ordered dithering (Bayer 4x4), color quantization (5 bits
// per channel), and the soft noise of a consumer screen. Plus a per-
// story-hour color grade so every act has a palette, not just a sky.
//
// strength 0..1 lerps the whole treatment (settings toggle / reduce-
// flicker accessibility). Engine owns the instance.

const RetroShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    strength: { value: 1.0 },
    grade: { value: new THREE.Color(1, 1, 1) },
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
    uniform float time;
    uniform float strength;
    uniform vec3 grade;
    varying vec2 vUv;

    float bayer4(vec2 p) {
      // 4x4 ordered dither matrix, normalized 0..1
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int i = y * 4 + x;
      float m[16];
      m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
      m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
      m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
      m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
      return m[i] / 16.0;
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb * grade;

      // Film grain — gentle, time-seeded
      float g = (hash(gl_FragCoord.xy * 0.37 + fract(time) * 17.0) - 0.5) * 0.028;
      c += g;

      // 6-bit quantization with softened Bayer dithering. (5-bit made
      // the quantize boundary crawl visibly across large flat floors
      // while the camera panned — jarring shimmer when walking.)
      float d = (bayer4(gl_FragCoord.xy) - 0.5) * 0.6;
      vec3 q = floor(c * 63.0 + 0.5 + d) / 63.0;

      gl_FragColor = vec4(mix(src.rgb, q, strength), src.a);
    }
  `,
};

export function createRetroPass() {
  const pass = new ShaderPass(RetroShader);
  pass.name = 'retro';
  return pass;
}

// Per-story-hour grades (multiplied into the frame before quantizing)
export const RETRO_GRADES = {
  morning:    [1.02, 1.00, 0.96],
  afternoon:  [1.00, 1.00, 1.00],
  goldenhour: [1.07, 0.99, 0.90],
  dusk:       [0.99, 0.95, 1.05],
  night:      [0.92, 0.96, 1.09],
  predawn:    [0.95, 0.98, 1.06],
};
