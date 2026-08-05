// Screenshot harness — deterministic full-res captures of every room and fight.
//
//   npm run shoot                  -> everything, into screenshots/contact/
//   npm run shoot -- --only=server_room   (substring match on shot names)
//   npm run shoot -- --fixture=act5       (override the default act7 fixture)
//
// Requires the dev server running (npm run dev). Uses the ?dev fixture loader
// in main.js (window.__shotReady signal). Writes an index.html contact sheet.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/contact';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const fixture = process.argv.find(a => a.startsWith('--fixture='))?.slice(10) || 'act7';

const ROOMS = [
  'parking_garage', 'reception', 'cubicle_farm', 'break_room', 'skip_office',
  'conference_room', 'server_room', 'executive_floor', 'stairwell', 'archive',
  'hr_department', 'vault', 'board_room', 'penthouse', 'penthouse_expanded',
  'penthouse_aquarium', 'penthouse_analytics', 'penthouse_bar',
  // Act 6½ city rooms (no-op until they exist)
  'city_street', 'transit_bus', 'records_hall', 'luckys_diner', 'old_branch', 'old_vault',
  'floor_13',
];
const FIGHTS = ['intern', 'karen', 'chad', 'grandma', 'compliance', 'meredith_boss', 'algorithm', 'the_firm', 'parking_enforcer'];
// Combat-framed close-ups of characters that never appear as enemies — the
// player (Andrew) chief among them, so the jaw-patch-seam "kill by construction"
// is verifiable on the contact sheet (addendum: no character pass without it).
const PORTRAITS = ['andrew'];

const shots = [
  ...ROOMS.map(r => ({ name: `room-${r}`, url: `${BASE}/?dev&fixture=${fixture}&shot=${r}&hud=0`, wait: 1500 })),
  ...FIGHTS.map(f => ({ name: `fight-${f}`, url: `${BASE}/?dev&fixture=${fixture}&fight=${f}`, wait: 4500 })),
  ...PORTRAITS.map(p => ({ name: `fight-${p}`, url: `${BASE}/?dev&portrait=${p}`, wait: 4500 })),
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const results = [];

  for (const shot of shots) {
    // `--only` takes a COMMA-SEPARATED list of substrings. It used to be a
    // single substring, so re-shooting a named subset (a lighting pass over
    // eleven rooms, say) meant eleven browser launches or a full 34-shot run.
    if (only && !only.split(',').some(t => shot.name.includes(t.trim()))) continue;
    const page = await context.newPage();
    try {
      await page.goto(shot.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 20000 });
      // Clear any auto-fired dialogs before capturing (room shots only —
      // fights need their input loop untouched). Enter advances dialogs and
      // selects Resume if a menu is somehow open; held ~90ms so
      // InputManager's per-frame isJustPressed sees it.
      const clearPopups = async () => {
        for (let i = 0; i < 12; i++) {
          const busy = await page.evaluate(() => {
            // Structural check — do NOT match on hint text, the label changes
            const dlg = document.querySelector('.dialog-container');
            const dlgOpen = !!dlg && dlg.style.display !== 'none' && dlg.offsetParent !== null;
            return dlgOpen || document.body.innerText.includes('EMPLOYEE PORTAL');
          });
          if (!busy) break;
          await page.keyboard.down('Enter');
          await page.waitForTimeout(90);
          await page.keyboard.up('Enter');
          await page.waitForTimeout(300);
        }
      };
      if (!shot.url.includes('fight=')) await clearPopups();
      await page.waitForTimeout(shot.wait);
      // Some room dialogs auto-fire on a delay — clear again before capture
      if (!shot.url.includes('fight=')) await clearPopups();
      const file = join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file });
      results.push({ name: shot.name, ok: true });
      console.log(`  ✓ ${shot.name}`);
    } catch (err) {
      results.push({ name: shot.name, ok: false, err: String(err).split('\n')[0] });
      console.log(`  ✗ ${shot.name} — ${String(err).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  // Contact sheet — built from EVERYTHING on disk, not just this run,
  // so --only spot-checks refresh single tiles without clobbering the
  // rest of the gallery. Tiles updated this run get a marker.
  const updated = new Set(results.filter(r => r.ok).map(r => `${r.name}.png`));
  const allShots = readdirSync(OUT)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b));
  const cells = allShots.map(f => {
    const fresh = updated.has(f);
    const when = new Date(statSync(join(OUT, f)).mtimeMs).toLocaleString();
    return `<figure${fresh ? ' class="fresh"' : ''}>
      <img src="${f}" loading="lazy">
      <figcaption>${f.replace('.png', '')}${fresh ? ' <b>● updated</b>' : ''}<small> — ${when}</small></figcaption>
    </figure>`;
  }).join('\n');
  const failures = results.filter(r => !r.ok).map(r =>
    `<figure class="fail"><figcaption>✗ ${r.name}<br><small>${r.err}</small></figcaption></figure>`
  ).join('\n');
  writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>TRUST ISSUES contact sheet</title>
<style>
  body{background:#0a0a14;color:#ddd;font-family:monospace;margin:16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px}
  figure{margin:0;border:1px solid #333;padding:6px;background:#11111e}
  figure.fresh{border-color:#53a8b6}
  img{width:100%;display:block}
  figcaption{padding:6px 2px;font-size:13px;color:#53a8b6}
  figcaption small{color:#556;display:block}
  figcaption b{color:#7be0a0}
  .fail{border-color:#e94560;color:#e94560;min-height:80px}
</style>
<h1>Contact sheet — ${allShots.length} shots — ${new Date().toISOString()}</h1>
${failures ? `<h2 style="color:#e94560">Failures this run</h2><div class="grid">${failures}</div>` : ''}
<div class="grid">${cells}</div>`);

  await browser.close();
  const okCount = results.filter(r => r.ok).length;
  console.log(`\n${okCount}/${results.length} shots → ${OUT}/index.html`);
  process.exit(okCount === 0 ? 1 : 0);
};

run();
