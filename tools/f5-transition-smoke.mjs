// F5 smoke: does a REAL doorway transition still complete?
//
// The harness's transition section drives `__explore._loadRoom()`, which skips
// `_changeRoom()` entirely — so it cannot catch a regression in the wipe path.
// `_changeRoom()` now `await`s `Engine.warmScene()` between the load and the
// wipe-in, and an unhandled rejection there would leave `paused = true` and the
// overlay up forever: the door would simply never open. That is the single worst
// failure this patch could introduce, so it gets its own check.
//
// Asserts, per hop: the promise resolves, `paused` comes back false, the
// transition overlay is gone, the room actually changed, and no page error fired.
//
//   node tools/f5-transition-smoke.mjs
import { chromium } from 'playwright';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const HOPS = ['reception', 'break_room', 'conference_room', 'cubicle_farm', 'server_room', 'executive_floor', 'cubicle_farm'];

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

await page.goto(`${BASE}/?dev&fixture=act7&shot=cubicle_farm&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2500);

let fails = 0;
for (const room of HOPS) {
  const t0 = Date.now();
  const r = await page.evaluate(async (target) => {
    const E = window.__explore;
    const before = E.player.currentRoom;
    let threw = null;
    try { await E._changeRoom(target, undefined, undefined); } catch (e) { threw = String(e); }
    // Give the wipe-in a beat to tear its overlay down.
    await new Promise((res) => setTimeout(res, 500));
    const overlay = document.querySelector('.transition-overlay, #transition-overlay');
    const visible = !!overlay && getComputedStyle(overlay).opacity !== '0'
      && getComputedStyle(overlay).display !== 'none';
    // `paused` is legitimately true when a scripted arrival dialog opens on top of
    // exploration — reception does exactly that on first entry. Report it so the
    // assertion can tell that apart from a transition that never finished.
    const dialogOpen = !!document.querySelector('.dialog-box, #dialog-box, .dialog-container');
    return {
      before, after: E.player.currentRoom, paused: E.paused, threw, dialogOpen,
      overlayBlocking: visible,
      calls: window.__engine.renderer.info.render.calls,
      programs: window.__engine.renderer.info.programs.length,
      warm: window.__engine._lastWarm || null,
    };
  }, room).catch((e) => ({ threw: String(e) }));
  const ms = Date.now() - t0;
  const ok = r && !r.threw && (r.paused === false || r.dialogOpen) && !r.overlayBlocking && r.after === room;
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${String(r?.before ?? '?').padEnd(16)} → ${room.padEnd(16)} ${String(ms).padStart(5)}ms · paused=${r?.paused}${r?.dialogOpen ? '(dialog)' : ''} overlay=${r?.overlayBlocking} landed=${r?.after} · warm ${r?.warm ? `${r.warm.programs}p/${r.warm.textures}t/${Math.round(r.warm.ms)}ms` : '—'} · calls ${r?.calls} programs ${r?.programs}${r?.threw ? ` · THREW ${r.threw}` : ''}`);
}
await browser.close();
console.log(errs.length ? `\nPAGE ERRORS (${errs.length}):\n  ${errs.slice(0, 8).join('\n  ')}` : '\nNo page errors.');
process.exit(fails || errs.length ? 1 : 0);
