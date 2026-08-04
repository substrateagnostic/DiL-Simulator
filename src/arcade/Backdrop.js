import * as THREE from 'three';
import { PAL } from './constants.js';

// ============================================================
// BACKDROP — three parallax layers, wrapped, nothing allocated per frame
// ============================================================
// Layer speeds are the Genesis ratios: sky ~0, far mezzanine 0.09,
// cubicle sea 0.26, near partitions 0.55.
//
// TWO RULES, BOTH EARNED ON CAMERA:
//
//  1. Every layer is authored with y = 0 AT THE FLOOR LINE and glued to
//     the camera vertically (Genesis backgrounds barely parallax in Y).
//     The first build authored them in absolute world Y at -11, which put
//     the entire cubicle sea below the bottom of the frame — the office
//     read as a city skyline at night and nothing else.
//
//  2. NO LAYER MAY HAVE A VISIBLE BOTTOM EDGE. Every element extends down
//     to y = -40. When the runner is thrown up by a spring the ground
//     falls away underneath him, and anything with a bottom edge suddenly
//     shows it hanging in mid-air. The floor ribbon occludes all of this
//     whenever the runner is on the ground, so the extra fill is free.
// ============================================================

const FLOOR_DROP = 1.9;   // how far below camera centre the floor line sits
const DEEP = -40;         // every layer element extends to here

export class Backdrop {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this._geos = [];
    this._mats = [];
    this._build();
  }

  _g(g) { this._geos.push(g); return g; }
  _m(c, opts = {}) {
    const m = new THREE.MeshBasicMaterial({ color: c, ...opts });
    this._mats.push(m);
    return m;
  }

  /** A unit box scaled to span [bottom, top] in y, centred at x. */
  _slab(group, geo, mat, x, top, w, z, bottom = DEEP) {
    const m = new THREE.Mesh(geo, mat);
    const h = top - bottom;
    m.scale.set(w, h, 1);
    m.position.set(x, bottom + h / 2, z);
    group.add(m);
    return m;
  }

  _build() {
    // ---- sky --------------------------------------------------------------
    const skyGeo = this._g(new THREE.PlaneGeometry(2, 2));
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(PAL.skyTop) },
        bot: { value: new THREE.Color(PAL.skyBot) },
      },
      vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bot; varying vec2 v;
        void main(){
          vec3 c = mix(bot, top, pow(v.y, 0.85));
          // faint horizontal banding — CRT phosphor rows on the backdrop
          c *= 1.0 - 0.035 * step(0.5, fract(v.y * 160.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthWrite: false,
      depthTest: false,
    });
    this._mats.push(skyMat);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.scene.add(sky);

    const box = this._g(new THREE.BoxGeometry(1, 1, 1));
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    // ---- far layer: the mezzanine across the atrium (0.09) -----------------
    // Content is authored over [-SPAN, +SPAN] — twice the wrap span — so
    // that after wrapping the offset into [-SPAN/2, +SPAN/2] the layer
    // still covers the whole viewport on both sides of the camera.
    const far = new THREE.Group();
    const towerA = this._m(0x18262f);
    const towerB = this._m(0x1e2f3a);
    const winMat = this._m(0x4d7f8d, { transparent: true, opacity: 0.5 });
    const SPAN_FAR = 120;
    for (let i = 0; i < 52; i++) {
      const w = 3.0 + rnd() * 5.0;
      const top = 3.5 + rnd() * 11;
      const x = -SPAN_FAR + (i / 52) * SPAN_FAR * 2 + rnd() * 2;
      this._slab(far, box, rnd() > 0.5 ? towerA : towerB, x, top, w, -30);
      // A few lit windows — Severance-at-night, kept sparse so the play
      // area is always the brightest thing on screen.
      const cols = Math.max(1, Math.floor(w / 1.3));
      const rows = Math.max(1, Math.floor((top + 2) / 2.1));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          if (rnd() > 0.16) continue;
          const win = new THREE.Mesh(box, winMat);
          win.scale.set(0.5, 0.58, 1);
          win.position.set(x - w / 2 + 0.65 + cx * 1.3, -1.4 + ry * 2.1, -29.5);
          far.add(win);
        }
      }
    }
    this.scene.add(far);
    this.layers.push({ group: far, speed: 0.09, span: SPAN_FAR });

    // ---- mid layer: the cubicle sea (0.26) ---------------------------------
    const mid = new THREE.Group();
    const panelMat = this._m(0x23343f);
    const panelCap = this._m(0x33505f);
    const monMat = this._m(0x3f9a86, { transparent: true, opacity: 0.55 });
    const SPAN_MID = 96;
    for (let i = 0; i < 68; i++) {
      const x = -SPAN_MID + (i / 68) * SPAN_MID * 2;
      const top = 1.9 + rnd() * 1.3;
      this._slab(mid, box, panelMat, x, top, 3.0, -18);
      const cap = new THREE.Mesh(box, panelCap);
      cap.scale.set(3.16, 0.15, 1);
      cap.position.set(x, top, -17.9);
      mid.add(cap);
      if (rnd() > 0.5) {
        const m = new THREE.Mesh(box, monMat);
        m.scale.set(0.85, 0.6, 1);
        m.position.set(x + (rnd() - 0.5) * 1.4, top + 0.42, -17.8);
        mid.add(m);
      }
    }
    this.scene.add(mid);
    this.layers.push({ group: mid, speed: 0.26, span: SPAN_MID });

    // ---- near layer: low partitions with the odd plant on top (0.55) --------
    // Kept LOW on purpose. The first pass put 1.7-unit conifers here at
    // 0.62 parallax; at speed they read as a forest sliding past the play
    // line and fought the props for attention.
    const near = new THREE.Group();
    const nearMat = this._m(0x18242e);
    const nearCap = this._m(0x24404d);
    const potMat = this._m(0x4a2e20);
    const leafMat = this._m(0x27543c);
    const SPAN_NEAR = 78;
    for (let i = 0; i < 30; i++) {
      const x = -SPAN_NEAR + (i / 30) * SPAN_NEAR * 2 + rnd() * 2;
      const top = 0.5 + rnd() * 0.7;
      this._slab(near, box, nearMat, x, top, 4.2 + rnd() * 2, -9);
      const cap = new THREE.Mesh(box, nearCap);
      cap.scale.set(4.4, 0.12, 1);
      cap.position.set(x, top, -8.9);
      near.add(cap);
      if (rnd() > 0.55) {
        const pot = new THREE.Mesh(box, potMat);
        pot.scale.set(0.42, 0.34, 1);
        pot.position.set(x + (rnd() - 0.5) * 2.4, top + 0.17, -8.8);
        near.add(pot);
        const leaf = new THREE.Mesh(this._g(new THREE.ConeGeometry(0.3, 0.8, 5)), leafMat);
        leaf.position.set(pot.position.x, top + 0.72, -8.8);
        near.add(leaf);
      }
    }
    this.scene.add(near);
    this.layers.push({ group: near, speed: 0.55, span: SPAN_NEAR });

    this.sky = sky;
    this.skyMat = skyMat;
  }

  /**
   * A static object at world x appears on screen at (x - camX). For a
   * layer that should APPEAR to move at `speed` x the world, we want its
   * screen position to be (-camX * speed), i.e. world x = camX*(1-speed).
   * That grows without bound, so wrap the screen-space offset into
   * [-span/2, span/2] — the content is authored two spans wide, so the
   * viewport is covered at every wrap phase.
   */
  update(camX, camY) {
    for (const l of this.layers) {
      const half = l.span * 0.5;
      let o = (-camX * l.speed) % l.span;
      if (o > half) o -= l.span;
      else if (o < -half) o += l.span;
      l.group.position.x = camX + o;
      l.group.position.y = camY - FLOOR_DROP;
    }
  }

  dispose() {
    for (const g of this._geos) g.dispose();
    for (const m of this._mats) m.dispose();
    this._geos.length = 0;
    this._mats.length = 0;
  }
}
