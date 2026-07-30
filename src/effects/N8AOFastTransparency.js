import * as THREE from 'three';
import { DepthType } from 'n8ao';

// ── N8AO transparency pass, same pixels, a third of the CPU ──────────────
//
// WHY THIS FILE EXISTS
//
// n8ao's `N8AOPass` is transparency-aware, and in this scene that is not
// optional: `detectTransparency()` walks the scene every frame, finds the room
// FX blobs / city backdrop / glass, and switches `transparencyAware` on. The
// stock `renderTransparency()` (node_modules/n8ao/src/N8AOPass.js:382) then runs,
// every frame, for the whole session.
//
// What it costs, measured on this machine (RTX 4050, cubicle_farm, 967-node
// scene, tools/f6-n8ao-ab.mjs):
//
//   transparencyAware ON  →  CPU 4x: p50 47.5ms  p95 60.3ms  ·  412 draw calls
//   transparencyAware OFF →  CPU 4x: p50 31.1ms  p95 38.5ms  ·  299 draw calls
//
// i.e. 16ms of main-thread time per frame at the mobile-floor proxy. It is also
// invisible to the draw-call metric's usual reading — the extra renders draw
// only transparent objects — which is why the round-2 report attributed the
// CPU-throttled budget rows to draw-call submission alone. The CPU profile
// (tools/f6-cpuprofile.mjs, screenshots/perf/f6/cpuprofile.json) says otherwise:
// `updateMatrixWorld` 8.3ms/frame, `traverse` 4.4ms/frame, `projectObject`
// 3.1ms/frame at CPU 4x — scene-graph work, which scales with the NODE count,
// not the draw-call count.
//
// Turning the feature off is NOT available to a perf patch: it moves 15.84% of
// the frame at up to Δ100/255 (same tool). That is a look decision. So instead
// this file makes the stock implementation cheaper WITHOUT changing what it
// draws. Three things, all of them bookkeeping:
//
//   1. FOUR `scene.traverse()` walks become ONE. Stock walks the whole graph to
//      snapshot visibility, again to set the depthWrite:false mask, again for the
//      depthWrite:true mask, and again to restore. One walk collects everything
//      into flat reusable arrays.
//   2. The per-frame `Map` of one entry per Object3D is gone. It was ~1000
//      entries allocated and thrown away 60 times a second — pure GC pressure on
//      a frame budget that has none to spare.
//   3. Subtrees that cannot draw anything in a given sub-pass are hidden at their
//      ROOT, so `projectObject` skips them instead of walking into them. This is
//      exactly equivalent: stock had already set every mesh under them invisible.
//
// EXACTNESS — the rules this reproduces, and the one place it deviates
//
// Stock semantics, per sub-pass:
//   • an object WITH a material gets `visible = wasVisible && qualifies`
//     (so a non-qualifying mesh also hides its own children — reproduced, not
//     "fixed": changing it would change the image)
//   • an object WITHOUT a material keeps `wasVisible`
//
// The deviation: a material-less node is hidden when nothing beneath it can
// draw. That cannot change a pixel — every descendant mesh was already invisible
// — but it does change what three walks.
//
// The one trap, and it is a real one: **lights are material-less nodes.**
// `projectObject` skips an invisible object entirely, so hiding a light (or a
// group containing one) removes it from the transparency render's light list and
// the transparent surfaces come out unlit. `isLight` therefore counts as
// "something draws here" and keeps its ancestors visible. Same for cameras, on
// the same principle.
//
// The claim "same pixels" is measured, not argued: tools/f6-fasttrans-ab.mjs
// diffs a frozen frame rendered through this path against the same frame
// rendered through the stock method (kept live on the pass as
// `__n8aoStockRenderTransparency`) with `gl.readPixels`, and the harness's
// frozen-frame gate re-runs it in three rooms.
//
// Toggle at runtime with `window.__n8aoFast = false` (pre-boot) or
// `Engine.setFastTransparency(false)` — that switch is what the A/B drives.

// Persistent scratch — `getClearColor(target)` fills and returns `target`, so a
// module-level Color keeps this whole file allocation-free per frame.
const _oldClear = new THREE.Color();

export const fastTransparencyEnabled = () =>
  typeof window === 'undefined' || window.__n8aoFast !== false;

// Flat, reusable scene census. Rebuilt once per frame by ONE traverse.
class SceneCensus {
  constructor() {
    this.nodes = [];
    this.parent = [];      // index of parent in `nodes`, -1 for the root
    this.wasVisible = [];
    this.hasMat = [];      // material-bearing: stock hides its children with it
    this.qA = [];          // qualifies for the depthWrite:false sub-pass
    this.qB = [];          // qualifies for the depthWrite:true sub-pass
    this.drawA = [];       // anything at/below draws in sub-pass A
    this.drawB = [];
    this.n = 0;
    this.anyTransparent = false;
  }

  // One depth-first walk. Written as an explicit stack rather than
  // Object3D.traverse() so the parent index is available without a closure per
  // node, and so nothing is allocated per frame after the first.
  collect(root) {
    const { nodes, parent, wasVisible, hasMat, qA, qB } = this;
    let n = 0;
    let anyTransparent = false;
    const stack = this._stack || (this._stack = []);
    const pstack = this._pstack || (this._pstack = []);
    stack.length = 0; pstack.length = 0;
    stack.push(root); pstack.push(-1);
    while (stack.length) {
      const o = stack.pop();
      const p = pstack.pop();
      const i = n++;
      nodes[i] = o;
      parent[i] = p;
      wasVisible[i] = o.visible;
      const m = o.material;
      hasMat[i] = !!m;
      if (m) {
        // Array materials: any transparent submaterial makes the whole object
        // transparent for three's sort, and n8ao reads `obj.material.transparent`
        // — on an array that is `undefined`, i.e. falsy. Reproduce that.
        const transparent = m.transparent === true;
        const depthWrite = m.depthWrite === true;
        const treatAsOpaque = o.userData.treatAsOpaque;
        qA[i] = (transparent && !depthWrite && !treatAsOpaque) || !!o.userData.cannotReceiveAO;
        qB[i] = transparent && depthWrite && !treatAsOpaque;
        if (transparent) anyTransparent = true;
      } else {
        // No material: not drawable itself. Lights and cameras are the exception
        // that must never be pruned — see the header note.
        qA[i] = qB[i] = (o.isLight === true || o.isCamera === true);
      }
      const kids = o.children;
      for (let k = kids.length - 1; k >= 0; k--) { stack.push(kids[k]); pstack.push(i); }
    }
    this.n = n;
    this.anyTransparent = anyTransparent;
    nodes.length = n; parent.length = n; wasVisible.length = n; hasMat.length = n;
    qA.length = n; qB.length = n;
    return this;
  }

  // Propagate "something draws here" up the tree. The walk above is pre-order,
  // so a parent always has a lower index than its children — one backwards sweep
  // is a complete propagation.
  //
  // The `!hasMat[p]` guard is the exactness condition, not an optimisation.
  // Stock sets a material-bearing object's visibility from ITS OWN
  // qualification alone, which also hides its children. So a qualifying child
  // under a non-qualifying mesh does not draw in stock, and must not be allowed
  // to un-hide its parent here. Propagation therefore stops at every mesh and
  // only flows through material-less nodes (groups, bones, the scene itself).
  propagate() {
    const { parent, wasVisible, hasMat, qA, qB, drawA, drawB, n } = this;
    for (let i = 0; i < n; i++) {
      drawA[i] = wasVisible[i] && qA[i];
      drawB[i] = wasVisible[i] && qB[i];
    }
    for (let i = n - 1; i > 0; i--) {
      const p = parent[i];
      if (hasMat[p] || !wasVisible[p]) continue;
      if (drawA[i]) drawA[p] = true;
      if (drawB[i]) drawB[p] = true;
    }
    drawA.length = n; drawB.length = n;
    return this;
  }

  applyA() { const { nodes, drawA, n } = this; for (let i = 0; i < n; i++) nodes[i].visible = drawA[i]; }
  applyB() { const { nodes, drawB, n } = this; for (let i = 0; i < n; i++) nodes[i].visible = drawB[i]; }
  restore() { const { nodes, wasVisible, n } = this; for (let i = 0; i < n; i++) nodes[i].visible = wasVisible[i]; }
}

// Install on a live N8AOPass. Idempotent; keeps the stock methods reachable so
// the A/B tool can switch back at runtime without a reload.
export function installFastTransparency(pass) {
  if (!pass || pass.__n8aoFastInstalled) return pass;
  pass.__n8aoFastInstalled = true;
  pass.__n8aoStockRenderTransparency = pass.renderTransparency;
  pass.__n8aoStockDetectTransparency = pass.detectTransparency;

  const census = new SceneCensus();
  pass.__n8aoCensus = census;

  // detectTransparency: stock runs a whole extra `scene.traverse()` every frame
  // to answer a question the census below already answers as a by-product. Reuse
  // last frame's answer — but only while it is TRUE, because a false answer stops
  // renderTransparency running and would freeze the cache. A false answer
  // therefore costs a real detect, which is the cheap case and the safe one.
  pass.detectTransparency = function detectTransparency() {
    if (!this.autoDetectTransparency) return;
    if (!fastTransparencyEnabled()) return this.__n8aoStockDetectTransparency.call(this);
    if (census.n > 0 && census.anyTransparent) { this.configuration.transparencyAware = true; return; }
    return this.__n8aoStockDetectTransparency.call(this);
  };

  pass.renderTransparency = function renderTransparency(renderer) {
    if (!fastTransparencyEnabled()) return this.__n8aoStockRenderTransparency.call(this, renderer);

    const scene = this.scene;
    const oldBackground = scene.background;
    renderer.getClearColor(_oldClear);
    const oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClearDepth = renderer.autoClearDepth;

    census.collect(scene).propagate();

    scene.background = null;
    renderer.autoClearDepth = false;
    renderer.setClearColor(0x000000, 0);

    this.depthCopyPass.material.uniforms.depthTexture.value = this.beautyRenderTarget.depthTexture;
    this.depthCopyPass.material.uniforms.reverseDepthBuffer.value =
      this.configuration.depthBufferType === DepthType.Reverse;

    // Transparent, depthWrite:false (plus anything flagged cannotReceiveAO)
    renderer.setRenderTarget(this.transparencyRenderTargetDWFalse);
    census.applyA();
    renderer.clear(true, true, true);
    this.depthCopyPass.render(renderer);
    renderer.render(scene, this.camera);

    // Transparent, depthWrite:true
    renderer.setRenderTarget(this.transparencyRenderTargetDWTrue);
    census.applyB();
    renderer.clear(true, true, true);
    this.depthCopyPass.render(renderer);
    renderer.render(scene, this.camera);

    census.restore();
    renderer.setClearColor(_oldClear, oldClearAlpha);
    scene.background = oldBackground;
    renderer.autoClearDepth = oldAutoClearDepth;
  };

  return pass;
}
