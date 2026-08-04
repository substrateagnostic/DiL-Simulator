// THROWAWAY instrumentation for the notification audit (i-run).
//
// OBSERVATION ONLY — never patches a game function, so every measurement comes
// off the real shipping call path (§4.3 verify-the-call-path). Element identity
// is held in a WeakMap so no DOM attribute is written either.
//
// Installs a rAF sampler that snapshots every VISIBLE text surface in the UI
// overlay each frame. From that timeline we derive empirically:
//   * exact on-screen duration of each surface (ms)
//   * which surfaces are co-visible
//   * whether their rects INTERSECT, by how many px, and who wins on z
// Auto-screenshots whenever >=2 TRANSIENT surfaces are co-visible.
//
// Usage: node tools/_i-notify-probe.mjs --scenario=<name> [--url=...]
// Requires `npm run dev` on :5173. HEADED per §4.7.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:5173';
// DEFAULT CHANGED. `screenshots/i-run/` is the AUDIT's raw evidence directory,
// cited throughout .claude/plans/i-run/notification-audit.md — re-running this
// tool with the old default overwrote it in place, so the doc's own citations
// started pointing at post-fix images. It now writes to a run-specific dir.
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6) || 'screenshots/i-run-after';
const scenario = process.argv.find(a => a.startsWith('--scenario='))?.slice(11) || 'smoke';
const url = process.argv.find(a => a.startsWith('--url='))?.slice(6)
  || `${BASE}/?dev&fixture=act3&shot=cubicle_farm`;

// Surfaces that are ALWAYS up during play — they are the backdrop a transient
// collides WITH, not a collision in themselves.
const PERSISTENT = /hud-location|hud-mini-stats|hud-quest-tracker|hud-day-chip|hud-portfolio|combat-hud|enemy-info|interact-prompt/;
// Wrapper nodes whose children we track individually.
const WRAPPER = /hud-toast-container|dialog-container$|^ui-overlay/;

const PROBE = () => {
  const W = window;
  W.__probe = { samples: [], t0: performance.now(), peak: 0 };
  const ids = new WeakMap();
  let next = 1;
  const idOf = (el) => { let i = ids.get(el); if (!i) { i = next++; ids.set(el, i); } return i; };

  const SEL = [
    '.hud-toast', '.hud-notification', '.inner-monologue', '.hud-quest-tracker',
    '.hud-location', '.hud-mini-stats', '.hud-day-chip', '.hud-upgrade-tooltip',
    '.interact-prompt', '.hud-portfolio', '.day-toast',
    '.dialog-box', '.dialog-speaker', '.dialog-text', '.dialog-choices', '.dialog-choice',
    '.combat-taunt', '.taunt-bubble', '.combat-message', '.phase-message',
    '.floating-damage', '.telegraph', '.combat-telegraph', '.locks-row',
    '.achievement-toast', '.combat-banner', '.combat-result',
  ].join(',');

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    // an ancestor may be hidden/faded
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pcs = getComputedStyle(p);
      if (pcs.display === 'none' || pcs.visibility === 'hidden' || parseFloat(pcs.opacity) < 0.05) return false;
      p = p.parentElement;
    }
    return true;
  };

  const sample = () => {
    const t = performance.now() - W.__probe.t0;
    const found = [];
    const overlay = document.getElementById('ui-overlay') || document.body;
    const nodes = new Set([
      ...overlay.querySelectorAll(SEL),
      ...document.body.querySelectorAll(SEL),
      // achievement toasts + ad-hoc banners are inline-styled, no class
      ...[...document.body.querySelectorAll('div[style]')].filter(d => {
        const s = d.getAttribute('style') || '';
        return /position:\s*absolute/.test(s) && /z-index:\s*\d/.test(s);
      }),
    ]);
    for (const el of nodes) {
      if (!vis(el)) continue;
      const txt = (el.innerText || '').trim();
      if (!txt) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > innerWidth * innerHeight * 0.55) continue;
      const cls = String(el.className || '') || el.tagName;
      if (/hud-toast-container/.test(cls)) continue;   // wrapper; children tracked
      const cs = getComputedStyle(el);
      found.push({
        id: idOf(el),
        cls,
        txt: txt.slice(0, 160),
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        z: cs.zIndex === 'auto' ? 0 : Number(cs.zIndex),
      });
    }
    W.__probe.samples.push({ t: Math.round(t), items: found });
    // Cap retention — an uncapped array plus three.js plus screenshot traffic
    // crashed the renderer on the first achbomb run.
    if (W.__probe.samples.length > 2400) W.__probe.samples.splice(0, 400);
    W.__probe.peak = found.filter(f => !/hud-location|hud-mini-stats|hud-quest-tracker|hud-day-chip|interact-prompt|combat-hud|enemy-info/.test(f.cls)).length;
    W.__probe.peakList = found.filter(f => !/hud-location|hud-mini-stats|hud-quest-tracker|hud-day-chip|interact-prompt|combat-hud|enemy-info/.test(f.cls))
      .map(f => f.cls.slice(0, 24) + ' :: ' + f.txt.replace(/\n/g, ' / ').slice(0, 40));
    setTimeout(sample, 40);   // ~25 Hz is plenty and far cheaper than rAF
  };
  setTimeout(sample, 40);
};

const intersect = (a, b) => {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 }).catch(() => {});

  const shots = [];
  const shot = async (name) => {
    const f = join(OUT, `${scenario}-${name}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    shots.push(f);
    console.log(`    shot: ${f}`);
    return f;
  };

  // Auto-capture the moment 2+ transients are co-visible.
  let watching = true, autoN = 0, lastAuto = 0;
  const watcher = (async () => {
    while (watching) {
      try {
        const st = await page.evaluate(() => ({ p: window.__probe?.peak || 0, l: window.__probe?.peakList || [] }));
        const now = Date.now();
        if (st.p >= 2 && now - lastAuto > 900 && autoN < 8) {
          lastAuto = now; autoN++;
          console.log(`  [peak x${st.p}] ${st.l.join(' | ')}`);
          await shot(`auto${autoN}-x${st.p}`);
        }
      } catch { /* page busy */ }
      await new Promise(r => setTimeout(r, 120));
    }
  })();

  const key = async (k, hold = 90) => {
    await page.keyboard.down(k); await page.waitForTimeout(hold);
    await page.keyboard.up(k); await page.waitForTimeout(160);
  };
  const walk = async (k, ms) => {
    await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k);
  };
  const api = { page, key, shot, walk, wait: (ms) => page.waitForTimeout(ms) };

  const mod = await import(`./_i-scen-${scenario}.mjs`).catch(() => null);
  if (mod?.default) await mod.default(api);
  else await page.waitForTimeout(15000);

  watching = false; await watcher;
  const samples = await page.evaluate(() => window.__probe.samples);
  // AFTER-run addition: the arbiter's own ring buffer. Lets a measured duration
  // be attributed to a class + status (shown / deferred / coalesced / dropped)
  // instead of guessed at from a rect.
  const arbiterLog = await page.evaluate(() => window.__arbiter ? window.__arbiter.getLog() : []).catch(() => []);
  await browser.close();

  // spans keyed on stable element id
  const spans = [];
  const openBy = new Map();
  for (const s of samples) {
    const seen = new Set();
    for (const it of s.items) {
      seen.add(it.id);
      let sp = openBy.get(it.id);
      if (!sp || s.t - sp.last > 350) {
        sp = { id: it.id, cls: it.cls, txt: it.txt, z: it.z, start: s.t, last: s.t, rect: it };
        spans.push(sp); openBy.set(it.id, sp);
      }
      sp.last = s.t; sp.rect = it; sp.z = it.z;
      if (it.txt.length > sp.txt.length) sp.txt = it.txt;
      if (it.cls.length > sp.cls.length) sp.cls = it.cls;
    }
  }
  const total = samples.length ? samples[samples.length - 1].t : 1;
  for (const sp of spans) {
    sp.dur = sp.last - sp.start;
    sp.persistent = PERSISTENT.test(sp.cls) || sp.dur > total * 0.7;
  }

  const transients = spans.filter(s => !s.persistent && s.dur > 0);
  const collisions = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i], b = spans[j];
      if (a.persistent && b.persistent) continue;      // backdrop vs backdrop
      const ov = Math.min(a.last, b.last) - Math.max(a.start, b.start);
      if (ov <= 50) continue;
      const area = intersect(a.rect, b.rect);
      const smaller = Math.min(a.rect.w * a.rect.h, b.rect.w * b.rect.h);
      collisions.push({
        a: a.cls, aTxt: a.txt.replace(/\n/g, ' / ').slice(0, 62), az: a.z, aPersist: a.persistent,
        b: b.cls, bTxt: b.txt.replace(/\n/g, ' / ').slice(0, 62), bz: b.z, bPersist: b.persistent,
        coMs: Math.round(ov), px: area, pct: smaller ? Math.round(100 * area / smaller) : 0,
        winner: area ? (a.z === b.z ? 'DOM order (both z=' + a.z + ')' : (a.z > b.z ? 'A' : 'B')) : '-',
      });
    }
  }
  collisions.sort((x, y) => y.pct - x.pct || y.coMs - x.coMs);

  const report = {
    scenario, url,
    spans: spans.map(s => ({ cls: s.cls, txt: s.txt, start: s.start, dur: s.dur, rect: { x: s.rect.x, y: s.rect.y, w: s.rect.w, h: s.rect.h }, z: s.z, persistent: s.persistent })),
    collisions, shots, arbiterLog,
  };
  writeFileSync(join(OUT, `${scenario}-probe.json`), JSON.stringify(report, null, 2));

  console.log(`\n================ SCENARIO: ${scenario} ================`);
  console.log(`transient surfaces observed: ${transients.length}`);
  console.log('\n--- TRANSIENT durations (measured ms on screen) ---');
  for (const s of transients.sort((a, b) => a.start - b.start)) {
    console.log(`  t=${String(s.start).padStart(6)} dur=${String(s.dur).padStart(5)}ms z=${String(s.z).padStart(4)} @(${s.rect.x},${s.rect.y} ${s.rect.w}x${s.rect.h}) [${s.cls.slice(0, 26).padEnd(26)}] ${s.txt.replace(/\n/g, ' / ').slice(0, 62)}`);
  }
  const real = collisions.filter(c => c.pct > 0);
  console.log(`\n--- GEOMETRIC OVERLAPS (${real.length}) ---`);
  for (const c of real.slice(0, 24)) {
    console.log(`  ${String(c.pct).padStart(3)}% (${c.px}px2) for ${c.coMs}ms | winner: ${c.winner}`);
    console.log(`      A z${c.az}${c.aPersist ? ' [persist]' : ''} ${c.a.slice(0, 28)} :: ${c.aTxt}`);
    console.log(`      B z${c.bz}${c.bPersist ? ' [persist]' : ''} ${c.b.slice(0, 28)} :: ${c.bTxt}`);
  }
  const covis = collisions.filter(c => c.pct === 0 && !c.aPersist && !c.bPersist);
  console.log(`\n--- CO-VISIBLE transient pairs, no px overlap (${covis.length}) ---`);
  for (const c of covis.slice(0, 12)) {
    console.log(`  ${c.coMs}ms | ${c.a.slice(0, 24)} :: ${c.aTxt.slice(0, 40)}  ||  ${c.b.slice(0, 24)} :: ${c.bTxt.slice(0, 40)}`);
  }
  if (arbiterLog.length) {
    console.log(`\n--- ARBITER LOG (${arbiterLog.length}, newest first) ---`);
    for (const e of arbiterLog) {
      console.log(`  ${String(e.cls).padEnd(13)} ${String(e.status).padEnd(17)} x${e.count} ${String(e.text).replace(/\n/g, ' ').slice(0, 74)}`);
    }
  }
  console.log(`\nwrote ${join(OUT, scenario + '-probe.json')}  (${shots.length} shots)`);
};

run().catch(e => { console.error(e); process.exit(1); });
