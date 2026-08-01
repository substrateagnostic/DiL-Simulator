// Meshy comp video driver — records the SAME Karen-fight beat sequence in
// procedural mode and (with --meshy) Meshy-GLB mode, at 1920x1080.
//
//   node tools/meshy-comp-video.mjs            -> fight-karen-procedural.webm
//   node tools/meshy-comp-video.mjs --meshy    -> fight-karen-meshy.webm
//   node tools/meshy-comp-video.mjs --meshy --tag=slate  -> fight-karen-slate.webm
//
// Beat sequence (absolute marks from fight-ready, so every run cuts the same):
//   0-5s    idle on the stage (both idles visible)
//   ~5s     basic Attack -> Karen's turn resolves
//   ~13s    Brace QTE (marker stopped after ~600ms) -> Karen's turn
//   ~21s    Special -> first ability -> Karen's turn
//   ~29s    Attack -> exchange
//   ~36s    Attack -> exchange
//   ~43s    settle on idle
//   ~45s    Karen Composure Break   (female stagger)
//   ~50s    Andrew Composure Break  (male stagger — the gender pair, back to back)
//   ~55s    Andrew victory          (male cheer)
//   ~60s    cut
//
// The first 43 seconds are unchanged from the wave-1 comps, so this is still an
// A/B against them. The tail exists because a comp that never fires a Break or
// a victory cannot show two of the roles the casting slate splits by build; the
// two staggers land back to back on purpose, since the normalized beat length
// is only judgeable against the other build's version of the same beat. Those
// three beats go through the SAME CombatScene entry points CombatState fires,
// not a mock — if a clip is not wired to the beat, the video shows the stance.
//
// Karen's HP is pinned high (identically in both runs) so no roll can end the
// fight mid-sequence; Andrew's SPD is pinned so he acts first in both runs.
// Requires npm run dev on :5173. Headed chromium so the real GPU renders.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const MESHY = process.argv.includes('--meshy');
const TAG = (process.argv.find(a => a.startsWith('--tag=')) || '').split('=')[1];
const OUT_DIR = 'art/char_refs/meshy_pilot/comp_videos';
const NAME = `fight-karen-${TAG || (MESHY ? 'meshy' : 'procedural')}.webm`;

const run = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));

  const url = `${BASE}/?dev&fixture=act7&fight=karen${MESHY ? '&meshy' : ''}`;
  console.log('goto', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Fixture-artifact achievement toasts (act7 injects XP) — strip identically
  // in both runs so the video judges the stage, not the harness.
  await page.evaluate(() => {
    const kill = (root) => {
      for (const el of Array.from(root.querySelectorAll('#ui-overlay > div'))) {
        if (el.textContent && el.textContent.includes('Achievement!')) el.remove();
      }
    };
    kill(document);
    new MutationObserver(() => kill(document))
      .observe(document.getElementById('ui-overlay') || document.body, { childList: true });
  });

  await page.waitForFunction(() => !!window.__combat, { timeout: 30000 });
  // Pin the comp invariants (identical in both runs): Andrew acts first, the
  // fight cannot end mid-sequence.
  await page.evaluate(() => {
    const c = window.__combat;
    if (c?.engine?.player) c.engine.player.spd = 999;
    for (const e of c?.engine?.enemies || []) { e.maxHP = 99999; e.hp = 99999; }
  });

  const playerTurn = () => page.waitForFunction(() => {
    const c = window.__combat;
    return !!c && c.inputEnabled === true && c.phase === 'ally_turn' && c._activeAllyIndex === 0;
  }, { timeout: 30000 });

  await playerTurn();
  const t0 = Date.now();
  const atMark = async (ms) => {
    const wait = t0 + ms - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
  };
  const clickAction = async (label) => {
    await playerTurn();
    await page.click(`.combat-action-btn:text-is("${label}")`);
  };

  // ── the beat sequence ──────────────────────────────────────────────────
  await atMark(5000);
  console.log('beat: Attack');
  await clickAction('Attack');

  await atMark(13000);
  console.log('beat: Brace QTE');
  await clickAction('Brace');
  await page.waitForSelector('.minigame-overlay', { timeout: 8000 });
  await page.waitForTimeout(620);          // marker mid-flight; any quality is fine
  await page.keyboard.down('Space');
  await page.waitForTimeout(90);
  await page.keyboard.up('Space');

  await atMark(21000);
  console.log('beat: Special');
  await clickAction('Special');
  await page.waitForSelector('.combat-submenu-item', { timeout: 8000 });
  await page.waitForTimeout(700);
  await page.click('.combat-submenu-item:not(.disabled)');

  await atMark(29000);
  console.log('beat: Attack');
  await clickAction('Attack');

  await atMark(36000);
  console.log('beat: Attack');
  await clickAction('Attack');

  await atMark(43000);
  await playerTurn().catch(() => {});

  // ── the reaction tail. Real call paths: CombatState fires setExpression
  // ('defeated') on a Composure Break and setExpression('victory') on a win.
  await atMark(45000);
  console.log('beat: Karen Composure Break (stagger, female)');
  await page.evaluate(() => window.__combat?.scene?.enemyGroups?.[0]?.animator?.setExpression('defeated'));

  await atMark(50000);
  console.log('beat: Andrew Composure Break (stagger, male)');
  await page.evaluate(() => window.__combat?.scene?.allyGroups?.[0]?.animator?.setExpression('defeated'));

  await atMark(55000);
  console.log('beat: Andrew victory (male cheer)');
  await page.evaluate(() => window.__combat?.scene?.allyGroups?.[0]?.animator?.setExpression('victory', 3.5));

  await atMark(60000);
  console.log('cut.');

  await page.close();
  const video = page.video();
  await video.saveAs(join(OUT_DIR, NAME));
  await video.delete();                    // drop the random-named original
  await context.close();
  await browser.close();
  console.log('saved', join(OUT_DIR, NAME));
};

run().catch(e => { console.error(e); process.exit(1); });
