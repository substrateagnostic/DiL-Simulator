// _h-clip-keyframe — THROWAWAY. For each clip, the STRIKE CURVE: where inside
// the clip the committed action actually lives, so a trim window can be
// specified in seconds instead of guessed.
//
// Runs through the SHIPPING call path (HANDOFF §4.3): MeshyCast.instance(),
// MeshyRetarget.captureRest/retargetClip, a real AnimationMixer stepped with
// setTime. The sampled quantity is the striking hand's position in the HIPS'
// OWN frame — rotation-invariant, so it is a property of the clip.
//
//   node tools/_h-clip-keyframe.mjs --port=5174 --ids=191,214,178,174,176,391,138,420,49,59
//   node tools/_h-clip-keyframe.mjs --port=5174 --research=205,210,318,88,543,409,127,123,175,173
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5174');
const SHIP = arg('ids', '').split(',').filter(Boolean);
const RESEARCH = arg('research', '').split(',').filter(Boolean);

const run = async () => {
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1000,700'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  page.on('console', m => { if (/\[kf\]/.test(m.text())) console.log('  ', m.text()); });
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=karen`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 45000 });
  await page.waitForTimeout(2500);

  const rows = await page.evaluate(async ({ ship, research }) => {
    // THREE constructors are lifted off LIVE objects rather than re-imported:
    // page.evaluate has no Vite module graph, so a bare 'three' specifier will
    // not resolve, and a second copy of three would be a different class anyway.
    const live = window.__combat.scene;
    const Vec3 = live.camera.position.constructor;
    const Mixer = live.allyGroups[0].animator.mixer.constructor;
    const LoopOnce = 2200;
    const MC = await import('/src/combat/MeshyCast.js');
    const R = await import('/src/combat/MeshyRetarget.js');
    // CLIP_LOADER is the SHIPPING loader (meshopt-aware). BASE is '/meshy/', so a
    // '../' prefix reaches the gitignored research tree that Vite dev serves from
    // the project root — read-only, nothing is copied into public/.
    const loadUrl = (url) => MC.CLIP_LOADER(url);

    const inst = MC.instance('andrew');
    if (!inst) return [{ error: 'andrew not cached' }];
    const root = inst.scene;
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);
    const bone = (re) => { let h = null; root.traverse(o => { if (!h && o.isBone && re.test(o.name)) h = o; }); return h; };
    const hips = bone(/^Hips$/), hL = bone(/^LeftHand$/), hR = bone(/^RightHand$/), head = bone(/^Head$/);
    const mixer = new Mixer(root);

    const sample = (clip) => {
      const act = mixer.clipAction(clip);
      mixer.stopAllAction();
      act.reset().setEffectiveWeight(1).setLoop(LoopOnce, 1).play();
      const N = Math.max(12, Math.round(clip.duration * 60));
      const out = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * clip.duration;
        mixer.setTime(t);
        root.updateMatrixWorld(true);
        const local = (b) => { const p = b.getWorldPosition(new Vec3()); hips.worldToLocal(p); return p; };
        const l = local(hL), r = local(hR), h = local(head);
        out.push({ t: +t.toFixed(4), l: +l.length().toFixed(3), r: +r.length().toFixed(3), hy: +h.y.toFixed(3) });
      }
      mixer.uncacheAction(clip);
      return out;
    };

    const results = [];
    for (const spec of [...ship.map(id => ({ id, url: `clips/a${id}.glb` })),
                        ...research.map(id => ({ id, url: `../art/char_refs/meshy_pilot/_clips/gender/clips/andrew_a${id}.glb`, research: true }))]) {
      try {
        const gltf = await loadUrl(spec.url);
        const raw = gltf.animations?.[0];
        if (!raw) { results.push({ id: spec.id, error: 'no animation' }); continue; }
        const donor = R.captureRest(gltf.scene);
        const clip = R.retargetClip(raw, donor, inst.restPose);
        const s = sample(clip);
        const lSpan = Math.max(...s.map(x => x.l)) - Math.min(...s.map(x => x.l));
        const rSpan = Math.max(...s.map(x => x.r)) - Math.min(...s.map(x => x.r));
        const key = lSpan >= rSpan ? 'l' : 'r';
        const lo = Math.min(...s.map(x => x[key])), hi = Math.max(...s.map(x => x[key]));
        const peak = s.reduce((a, b) => (b[key] > a[key] ? b : a));
        // committed window = contiguous span around the peak above 80% of range
        const thr = lo + (hi - lo) * 0.80;
        let i0 = s.indexOf(peak), i1 = i0;
        while (i0 > 0 && s[i0 - 1][key] >= thr) i0--;
        while (i1 < s.length - 1 && s[i1 + 1][key] >= thr) i1++;
        // rise = from the last frame under 25% of range before the peak
        const thrLo = lo + (hi - lo) * 0.25;
        let iRise = i0;
        while (iRise > 0 && s[iRise - 1][key] > thrLo) iRise--;
        results.push({
          id: spec.id, research: !!spec.research, duration: +clip.duration.toFixed(3), hand: key === 'l' ? 'LeftHand' : 'RightHand',
          span: +(hi - lo).toFixed(3), peakT: peak.t, peakFrac: +(peak.t / clip.duration).toFixed(3),
          committedFrom: s[i0].t, committedTo: s[i1].t,
          riseFrom: s[iRise].t, riseMs: Math.round((peak.t - s[iRise].t) * 1000),
          series: s.filter((_, i) => i % Math.max(1, Math.round(s.length / 40)) === 0).map(x => [x.t, x[key]]),
        });
        console.log(`[kf] a${spec.id} ok`);
      } catch (e) { results.push({ id: spec.id, error: String(e).slice(0, 120) }); }
    }
    return results;
  }, { ship: SHIP, research: RESEARCH });

  mkdirSync(join('screenshots', 'h-run'), { recursive: true });
  writeFileSync(join('screenshots', 'h-run', 'clip-keyframes.json'), JSON.stringify(rows, null, 1));
  console.log('\nid    dur    hand        span   peak(s)  peak%   committed window   rise(ms)');
  for (const r of rows) {
    if (r.error) { console.log(`a${r.id}  ERROR ${r.error}`); continue; }
    console.log(`a${String(r.id).padEnd(4)} ${String(r.duration).padStart(5)}  ${r.hand.padEnd(10)} ${String(r.span).padStart(6)} ${String(r.peakT).padStart(7)}  ${(r.peakFrac * 100).toFixed(1).padStart(5)}%  ${String(r.committedFrom).padStart(6)}..${String(r.committedTo).padEnd(6)} ${String(r.riseMs).padStart(6)}${r.research ? '  (research-tree)' : ''}`);
  }
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
