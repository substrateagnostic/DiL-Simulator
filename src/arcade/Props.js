import * as THREE from 'three';

// ============================================================
// PROPS — office detritus in Genesis roles
// ============================================================
// Every prop maps onto a job the Genesis games already solved:
//
//   filing box / rolling chair  -> badnik: smashable while curled,
//                                  wipeout if you run into it upright
//   compliance binder tower     -> hard block: jump it, spin does not help
//   water cooler                -> hard block, taller
//   ceiling pipe                -> low ceiling: you MUST be rolling
//   coffee puddle               -> momentum tax, never lethal
//   paperclip                   -> ring
//   gym ball                    -> red spring
//   priority lane decal         -> boost pad
//   hot coffee                  -> speed shoes
//   gold stapler                -> 50-ring monitor
//   checkpoint desk             -> lamppost (pushes the deadline back)
//
// Geometry and materials are created ONCE and shared by every instance;
// only Mesh/Group wrappers churn. dispose() at state exit frees the lot.
// ============================================================

export const PROP_KIND = {
  BOX: 'box',
  CHAIR: 'chair',
  BINDERS: 'binders',
  COOLER: 'cooler',
  PIPE: 'pipe',
  PUDDLE: 'puddle',
  CLIP: 'clip',
  SPRING: 'spring',
  BOOSTPAD: 'boostpad',
  COFFEE: 'coffee',
  STAPLER: 'stapler',
  CHECKPOINT: 'checkpoint',
};

// hitbox: half-width, bottom offset from ground, top offset from ground
export const PROP_DEF = {
  [PROP_KIND.BOX]:     { hw: 0.46, y0: 0.0,  y1: 0.86, smashable: true,  hard: false },
  [PROP_KIND.CHAIR]:   { hw: 0.42, y0: 0.0,  y1: 1.02, smashable: true,  hard: false },
  [PROP_KIND.BINDERS]: { hw: 0.36, y0: 0.0,  y1: 1.62, smashable: false, hard: true },
  [PROP_KIND.COOLER]:  { hw: 0.38, y0: 0.0,  y1: 1.80, smashable: false, hard: true },
  // Clearance 1.15 > ball height (1.04) and < standing height (1.8):
  // rolling is the only way through, by construction.
  [PROP_KIND.PIPE]:    { hw: 1.5,  y0: 1.15, y1: 3.10, smashable: false, hard: true },
  [PROP_KIND.PUDDLE]:  { hw: 1.1,  y0: 0.0,  y1: 0.30, smashable: false, hard: false, slick: true },
  [PROP_KIND.CLIP]:    { hw: 0.42, y0: -0.42, y1: 0.42, pickup: true },
  [PROP_KIND.SPRING]:  { hw: 0.55, y0: 0.0,  y1: 1.00, spring: 27 },
  [PROP_KIND.BOOSTPAD]:{ hw: 1.3,  y0: 0.0,  y1: 0.32, boost: 26 },
  [PROP_KIND.COFFEE]:  { hw: 0.45, y0: -0.45, y1: 0.45, pickup: true, shoes: 7.0 },
  [PROP_KIND.STAPLER]: { hw: 0.5,  y0: -0.45, y1: 0.45, pickup: true, clips: 25 },
  [PROP_KIND.CHECKPOINT]: { hw: 0.6, y0: 0.0, y1: 2.2, checkpoint: true },
};

const C = (hex) => new THREE.MeshBasicMaterial({ color: hex });

export class PropFactory {
  constructor() {
    this.geos = [];
    this.mats = [];
    this._cache = {};
  }

  _g(g) { this.geos.push(g); return g; }
  _m(m) { this.mats.push(m); return m; }

  _shared(key, build) {
    if (!this._cache[key]) this._cache[key] = build();
    return this._cache[key];
  }

  // ---- materials --------------------------------------------------------
  get M() {
    if (!this._M) {
      this._M = {
        cardboard: this._m(C(0xc79a5e)),
        cardboardDark: this._m(C(0x9c7643)),
        tape: this._m(C(0xe8dcc0)),
        // B16 — CONTRAST PASS. Every one of the eight rows below is a
        // GAMEPLAY-CRITICAL object (badnik, hard block, spring, checkpoint) and
        // every one of them measured within 10 luma of a backdrop layer:
        // binderB 0.4, chair 2.6, cardboardDark 5.0, deskTop 6.3, binderA 8.2,
        // desk 9.5. They are lifted while KEEPING their chroma — scaling toward
        // white would have hit the same luma target and turned them grey, which
        // loses an object a different way. With the two backdrop accents pulled
        // down as well, the worst prop-to-backdrop luma gap in the whole set
        // goes 0.4 -> 27.3.
        chair: this._m(C(0x5a7fa8)),
        chairSeat: this._m(C(0x7d97b5)),
        chrome: this._m(C(0xb9c6d2)),
        binderA: this._m(C(0xd05252)),
        binderB: this._m(C(0x4f7fc0)),
        binderC: this._m(C(0x3fa672)),
        cooler: this._m(C(0xdff0f5)),
        coolerBase: this._m(C(0x6f8390)),
        pipe: this._m(C(0x8c98a4)),
        pipeBand: this._m(C(0xd8a63a)),
        clip: this._m(C(0xd8dee6)),
        clipHot: this._m(C(0xffe27a)),
        ball: this._m(C(0xd9484f)),
        ballHi: this._m(C(0xff8a8a)),
        pad: this._m(C(0xffc23d)),
        padDark: this._m(C(0x8a6413)),
        cup: this._m(C(0xf3ece0)),
        cupBand: this._m(C(0x6b3d1f)),
        stapler: this._m(C(0xf0c419)),
        staplerDark: this._m(C(0xb08d0a)),
        desk: this._m(C(0x8a6a45)),
        deskTop: this._m(C(0xb08a5c)),
        lamp: this._m(C(0x51d6a4)),
        lampOff: this._m(C(0xc44c4c)),
      };
    }
    return this._M;
  }

  create(kind) {
    switch (kind) {
      case PROP_KIND.BOX: return this._box();
      case PROP_KIND.CHAIR: return this._chair();
      case PROP_KIND.BINDERS: return this._binders();
      case PROP_KIND.COOLER: return this._cooler();
      case PROP_KIND.PIPE: return this._pipe();
      case PROP_KIND.PUDDLE: return this._puddle();
      case PROP_KIND.CLIP: return this._clip();
      case PROP_KIND.SPRING: return this._spring();
      case PROP_KIND.BOOSTPAD: return this._boostpad();
      case PROP_KIND.COFFEE: return this._coffee();
      case PROP_KIND.STAPLER: return this._stapler();
      case PROP_KIND.CHECKPOINT: return this._checkpoint();
      default: return new THREE.Group();
    }
  }

  // ---- builders ---------------------------------------------------------

  _box() {
    const g = new THREE.Group();
    const body = this._shared('boxBody', () => this._g(new THREE.BoxGeometry(0.86, 0.72, 0.7)));
    const lid = this._shared('boxLid', () => this._g(new THREE.BoxGeometry(0.92, 0.12, 0.76)));
    const strip = this._shared('boxStrip', () => this._g(new THREE.BoxGeometry(0.14, 0.72, 0.72)));
    const b = new THREE.Mesh(body, this.M.cardboard); b.position.y = 0.38; g.add(b);
    const l = new THREE.Mesh(lid, this.M.cardboardDark); l.position.y = 0.80; g.add(l);
    const s = new THREE.Mesh(strip, this.M.tape); s.position.y = 0.38; g.add(s);
    return g;
  }

  _chair() {
    const g = new THREE.Group();
    const seat = this._shared('chSeat', () => this._g(new THREE.BoxGeometry(0.74, 0.16, 0.64)));
    const back = this._shared('chBack', () => this._g(new THREE.BoxGeometry(0.16, 0.62, 0.6)));
    const post = this._shared('chPost', () => this._g(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 8)));
    const star = this._shared('chStar', () => this._g(new THREE.BoxGeometry(0.78, 0.08, 0.16)));
    const cast = this._shared('chCast', () => this._g(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8)));
    const s = new THREE.Mesh(seat, this.M.chairSeat); s.position.y = 0.52; g.add(s);
    const b = new THREE.Mesh(back, this.M.chair); b.position.set(0.30, 0.88, 0); g.add(b);
    const p = new THREE.Mesh(post, this.M.chrome); p.position.y = 0.30; g.add(p);
    const st = new THREE.Mesh(star, this.M.chair); st.position.y = 0.14; g.add(st);
    for (const x of [-0.34, 0.34]) {
      const w = new THREE.Mesh(cast, this.M.chrome);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.09, 0); g.add(w);
      g.userData.wheels = g.userData.wheels || [];
      g.userData.wheels.push(w);
    }
    return g;
  }

  _binders() {
    const g = new THREE.Group();
    const slab = this._shared('bndSlab', () => this._g(new THREE.BoxGeometry(0.66, 0.26, 0.56)));
    const spine = this._shared('bndSpine', () => this._g(new THREE.BoxGeometry(0.08, 0.2, 0.58)));
    const cols = [this.M.binderA, this.M.binderB, this.M.binderC];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(slab, cols[i % 3]);
      m.position.set((i % 2 ? 0.05 : -0.05), 0.14 + i * 0.26, 0);
      g.add(m);
      const sp = new THREE.Mesh(spine, this.M.tape);
      sp.position.set((i % 2 ? 0.05 : -0.05) - 0.3, 0.14 + i * 0.26, 0.01);
      g.add(sp);
    }
    return g;
  }

  _cooler() {
    const g = new THREE.Group();
    const base = this._shared('clBase', () => this._g(new THREE.BoxGeometry(0.62, 1.05, 0.6)));
    const jug = this._shared('clJug', () => this._g(new THREE.CylinderGeometry(0.3, 0.34, 0.72, 10)));
    const cap = this._shared('clCap', () => this._g(new THREE.CylinderGeometry(0.12, 0.16, 0.14, 8)));
    const b = new THREE.Mesh(base, this.M.coolerBase); b.position.y = 0.53; g.add(b);
    const j = new THREE.Mesh(jug, this.M.cooler); j.position.y = 1.42; g.add(j);
    const c = new THREE.Mesh(cap, this.M.coolerBase); c.position.y = 1.85; g.add(c);
    return g;
  }

  _pipe() {
    const g = new THREE.Group();
    const tube = this._shared('pipeTube', () => this._g(new THREE.CylinderGeometry(0.3, 0.3, 3.4, 10)));
    const band = this._shared('pipeBand', () => this._g(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10)));
    const hang = this._shared('pipeHang', () => this._g(new THREE.BoxGeometry(0.08, 1.4, 0.08)));
    const t = new THREE.Mesh(tube, this.M.pipe);
    t.rotation.z = Math.PI / 2; t.position.y = 1.48; g.add(t);
    for (const x of [-1.0, 1.0]) {
      const bd = new THREE.Mesh(band, this.M.pipeBand);
      bd.rotation.z = Math.PI / 2; bd.position.set(x, 1.48, 0); g.add(bd);
      const h = new THREE.Mesh(hang, this.M.pipe);
      h.position.set(x, 2.5, 0); g.add(h);
    }
    return g;
  }

  _puddle() {
    const g = new THREE.Group();
    const disc = this._shared('pudDisc', () => this._g(new THREE.CircleGeometry(1.05, 14)));
    const mat = this._m(new THREE.MeshBasicMaterial({ color: 0x50351f, transparent: true, opacity: 0.82 }));
    const d = new THREE.Mesh(disc, mat);
    d.scale.set(1, 0.34, 1);
    d.position.y = 0.05;
    g.add(d);
    const sheen = this._m(new THREE.MeshBasicMaterial({ color: 0x9a7b4a, transparent: true, opacity: 0.6 }));
    const s = new THREE.Mesh(disc, sheen);
    s.scale.set(0.5, 0.15, 1); s.position.set(-0.25, 0.09, 0.01); g.add(s);
    return g;
  }

  _clip() {
    const g = new THREE.Group();
    // A paperclip read as a flat torus reads as a ring at 6px on screen —
    // which is exactly the job. The inner bar sells "paperclip".
    const ring = this._shared('clipRing', () => this._g(new THREE.TorusGeometry(0.26, 0.062, 6, 14)));
    const bar = this._shared('clipBar', () => this._g(new THREE.BoxGeometry(0.09, 0.30, 0.06)));
    const r = new THREE.Mesh(ring, this.M.clip); g.add(r);
    const b = new THREE.Mesh(bar, this.M.clip); b.position.x = -0.02; g.add(b);
    g.userData.spin = r;
    return g;
  }

  _spring() {
    const g = new THREE.Group();
    const ball = this._shared('sprBall', () => this._g(new THREE.SphereGeometry(0.5, 14, 10)));
    const plate = this._shared('sprPlate', () => this._g(new THREE.BoxGeometry(1.1, 0.1, 0.8)));
    const b = new THREE.Mesh(ball, this.M.ball); b.position.y = 0.5; g.add(b);
    const hi = new THREE.Mesh(ball, this.M.ballHi);
    hi.scale.setScalar(0.42); hi.position.set(-0.16, 0.66, 0.32); g.add(hi);
    const p = new THREE.Mesh(plate, this.M.chrome); p.position.y = 0.05; g.add(p);
    g.userData.ball = b;
    return g;
  }

  _boostpad() {
    const g = new THREE.Group();
    const slab = this._shared('bpSlab', () => this._g(new THREE.BoxGeometry(2.6, 0.08, 0.9)));
    const chev = this._shared('bpChev', () => this._g(new THREE.BoxGeometry(0.34, 0.05, 0.72)));
    const s = new THREE.Mesh(slab, this.M.padDark); s.position.y = 0.05; g.add(s);
    g.userData.chevrons = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(chev, this.M.pad);
      c.position.set(-0.95 + i * 0.64, 0.10, 0);
      c.rotation.y = 0.5;
      g.add(c);
      g.userData.chevrons.push(c);
    }
    return g;
  }

  _coffee() {
    const g = new THREE.Group();
    const cup = this._shared('cfCup', () => this._g(new THREE.CylinderGeometry(0.21, 0.16, 0.5, 10)));
    const band = this._shared('cfBand', () => this._g(new THREE.CylinderGeometry(0.225, 0.20, 0.17, 10)));
    const lid = this._shared('cfLid', () => this._g(new THREE.CylinderGeometry(0.235, 0.235, 0.07, 10)));
    const c = new THREE.Mesh(cup, this.M.cup); g.add(c);
    const b = new THREE.Mesh(band, this.M.cupBand); b.position.y = -0.02; g.add(b);
    const l = new THREE.Mesh(lid, this.M.cupBand); l.position.y = 0.27; g.add(l);
    return g;
  }

  _stapler() {
    const g = new THREE.Group();
    const base = this._shared('stBase', () => this._g(new THREE.BoxGeometry(0.72, 0.14, 0.26)));
    const arm = this._shared('stArm', () => this._g(new THREE.BoxGeometry(0.66, 0.18, 0.22)));
    const b = new THREE.Mesh(base, this.M.staplerDark); g.add(b);
    const a = new THREE.Mesh(arm, this.M.stapler);
    a.position.set(0.03, 0.17, 0); a.rotation.z = 0.09; g.add(a);
    return g;
  }

  _checkpoint() {
    const g = new THREE.Group();
    const leg = this._shared('cpLeg', () => this._g(new THREE.BoxGeometry(0.16, 1.3, 0.16)));
    const top = this._shared('cpTop', () => this._g(new THREE.BoxGeometry(1.5, 0.12, 0.8)));
    const mon = this._shared('cpMon', () => this._g(new THREE.BoxGeometry(0.7, 0.5, 0.08)));
    for (const x of [-0.55, 0.55]) {
      const l = new THREE.Mesh(leg, this.M.desk); l.position.set(x, 0.65, 0); g.add(l);
    }
    const t = new THREE.Mesh(top, this.M.deskTop); t.position.y = 1.36; g.add(t);
    const m = new THREE.Mesh(mon, this.M.lampOff); m.position.set(0, 1.72, 0); g.add(m);
    g.userData.screen = m;
    return g;
  }

  dispose() {
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    this.geos.length = 0;
    this.mats.length = 0;
    this._cache = {};
    this._M = null;
  }
}
