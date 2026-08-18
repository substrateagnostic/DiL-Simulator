// THROWAWAY harness for the wardrobe-mirror lane (WardrobeState).
//
// Drives: bathroom -> stand at the basins -> E opens the mirror -> browse,
// equip a hat + glasses + accessory -> stats delta visible -> Esc closes ->
// PROGRESS teach toast lands -> re-enter shows WORN state -> unequip works.
// Writes stills to screenshots/w-run/.
//
// Usage: node tools/_w-mirror.mjs [--port=5299]
// HEADED per HANDOFF_PACKAGE 4.7.

import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5299';
const OUT = 'screenshots/w-run';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
// The fixture boot uses save slot 3 as scratch and a previous harness run's
// autosave would carry wardrobe_* flags into this one. Every run starts clean.
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
const tap = async (key = 'Enter', hold = 70) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=bathroom&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);

  // 1. Stand beside the basins; the interact prompt should read the mirror.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(1.5, 3.6, ex.tileMap);
    ex.camera.snapTo(1.5, 3.6, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(700);
  const prompt = await page.evaluate(() => {
    const ex = window.__explore;
    const { exit, interactable } = ex._getNearbyTargets();
    return interactable ? ex._getInteractPrompt(interactable, exit) : null;
  });
  check('mirror prompt', prompt === 'Check the mirror', String(prompt));
  await page.screenshot({ path: `${OUT}/00-bathroom-prompt.png` });

  // 2. E opens the wardrobe.
  await tap('e');
  await page.waitForTimeout(900);
  check('WardrobeState pushed', (await top()) === 'WardrobeState', await top());
  const flagUsed = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_mirror_used'));
  check('wardrobe_mirror_used set on open', flagUsed);
  await page.screenshot({ path: `${OUT}/01-mirror-open.png` });

  // 3. The rail lists exactly the unlocked pool (act1 defaults = 4).
  const railInfo = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.wd-card .wd-card-name')].map(e => e.textContent),
    heads: [...document.querySelectorAll('.wd-slot-head')].map(e => e.textContent),
  }));
  console.log('  rail:', JSON.stringify(railInfo));
  check('rail shows 4 unlocked defaults', railInfo.cards.length === 4);

  // 4. Equip the visor (selected index 0).
  const beforeStats = await page.evaluate(() => ({ ...window.__explore.player.getCombatStats() }));
  await tap('Enter');
  await page.waitForTimeout(500);
  let equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('visor equipped', equipped.hat === 'visor_green', JSON.stringify(equipped));
  await page.screenshot({ path: `${OUT}/02-visor-equipped.png` });

  // 5. Down to glasses, equip; down twice to an accessory, equip.
  await tap('ArrowDown'); await page.waitForTimeout(150);
  await tap('Enter'); await page.waitForTimeout(400);
  await tap('ArrowDown'); await page.waitForTimeout(150);
  await tap('Enter'); await page.waitForTimeout(400);
  equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('glasses equipped', equipped.glasses === 'reading_glasses', JSON.stringify(equipped));
  check('accessory equipped', !!equipped.accessory, JSON.stringify(equipped));
  const afterStats = await page.evaluate(() => ({ ...window.__explore.player.getCombatStats() }));
  check('stat bonus applied (def +1 atk +1)',
    afterStats.def === beforeStats.def + 1 && afterStats.atk === beforeStats.atk + 1,
    `def ${beforeStats.def}->${afterStats.def} atk ${beforeStats.atk}->${afterStats.atk}`);
  const statStrip = await page.evaluate(() =>
    [...document.querySelectorAll('.wd-stat')].map(e => e.textContent.trim()).join(' | '));
  console.log('  stats strip:', statStrip);
  check('stat strip shows a delta', /\+\d/.test(statStrip));
  await page.screenshot({ path: `${OUT}/03-three-equipped.png` });

  // 6. Turn the model (held right arrow) — yaw must move.
  const yaw0 = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]._previewYaw;
  });
  await tap('ArrowRight', 400);
  const yaw1 = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]._previewYaw;
  });
  check('preview turns', Math.abs(yaw1 - yaw0) > 0.3, `${yaw0} -> ${yaw1}`);
  await page.screenshot({ path: `${OUT}/04-turned.png` });
  await tap('ArrowLeft', 400);

  // 7. Escape closes; teach toast lands after scope resume.
  await tap('Escape');
  await page.waitForTimeout(900);
  check('back to exploration', (await top()) === 'ExplorationState', await top());
  const tipShown = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_tip_shown'));
  check('wardrobe_tip_shown set on first exit', tipShown);
  // The teach is PROGRESS class and correctly DEFERS behind the bathroom's
  // first-visit VOICE monologue (the claim ladder working, not a bug), so
  // poll for it rather than sampling one instant.
  let teachSeen = false;
  for (let i = 0; i < 60 && !teachSeen; i++) {
    teachSeen = await page.evaluate(() => document.body.textContent.includes('Pause Menu'));
    if (!teachSeen) await page.waitForTimeout(250);
  }
  check('PROGRESS teach visible (may defer behind VOICE)', teachSeen);
  await page.screenshot({ path: `${OUT}/05-exit-toast.png` });

  // 8. Re-enter: WORN badges persist; Enter on selected unequips.
  await tap('e');
  await page.waitForTimeout(700);
  check('re-entered', (await top()) === 'WardrobeState', await top());
  const wornCount = await page.evaluate(() => document.querySelectorAll('.wd-card.wd-equipped').length);
  check('3 WORN cards on re-entry', wornCount === 3, String(wornCount));
  await tap('Enter'); // toggle off the visor
  await page.waitForTimeout(400);
  equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('unequip works', equipped.hat === null, JSON.stringify(equipped));
  await tap('Enter'); // put it back on
  await page.waitForTimeout(300);
  await tap('Escape');
  await page.waitForTimeout(600);
  const secondToast = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_tip_shown'));
  check('no second teach needed (flag already set)', secondToast);

  // 9. PRODUCER 08-18 (a): the caption is gone. It was a line of italic across
  //    the bottom of the glass; "the moment doesn't need a snarky comment".
  check('no mirror caption element anywhere',
    (await page.evaluate(() => document.querySelectorAll('.wd-caption').length)) === 0);

  // 10. PRODUCER 08-18 (b): the half-lit fluorescent, MEASURED. The reflected
  //     wall lights the model's left and leaves his right in mood, so the two
  //     halves of the glass must not read the same. Measured off the FILE —
  //     the renderer has no preserveDrawingBuffer, so an in-page probe is 0
  //     (CLAUDE.md harness law). Two assertions, and the second is the
  //     producer's guardrail: asymmetric, AND the lit half still legible.
  //     Re-open the glass to measure it, and wait past the strike-and-settle
  //     beat (STRIKE_MS 720) so the reading is of the SETTLED rig, not of a
  //     tube mid-flicker.
  await tap('e');
  await page.waitForTimeout(1500);
  check('mirror re-opened for the light reading', (await top()) === 'WardrobeState', await top());
  const lum = await page.evaluate(async () => {
    const el = document.querySelector('.wd-mirror');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const shotPath = `${OUT}/06-half-lit.png`;
  await page.screenshot({ path: shotPath });
  const halves = await page.evaluate(async ({ src, box }) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    // Inset 12 px so the frame bead is not sampled as "the wall".
    const x0 = Math.round(box.x + 12), x1 = Math.round(box.x + box.w - 12);
    const y0 = Math.round(box.y + 12), y1 = Math.round(box.y + box.h * 0.55);
    const mid = Math.round((x0 + x1) / 2);
    const mean = (ax, ay, bx, by) => {
      const d = g.getImageData(ax, ay, bx - ax, by - ay).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
      return s / n;
    };
    // Two different questions, two different boxes. The ASYMMETRY is a fact
    // about the whole glass (wall + model), so it samples both halves of the
    // upper pane. LEGIBILITY is a fact about the THING BEING JUDGED, so it
    // samples the model's own head-and-shoulders box — the backdrop is a
    // MeshBasicMaterial and takes no lighting at all, so a whole-pane mean
    // barely moves when the rig changes and would be a lie about the model.
    const bx0 = Math.round(box.x + box.w * 0.30), bx1 = Math.round(box.x + box.w * 0.70);
    const by0 = Math.round(box.y + box.h * 0.14), by1 = Math.round(box.y + box.h * 0.42);
    return {
      left: +mean(x0, y0, mid, y1).toFixed(1),
      right: +mean(mid, y0, x1, y1).toFixed(1),
      model: +mean(bx0, by0, bx1, by1).toFixed(1),
    };
  }, { src: `data:image/png;base64,${(await import('node:fs')).readFileSync(shotPath).toString('base64')}`, box: lum });
  check('the glass is lit on ONE side (asymmetric fluorescent)',
    halves.left > halves.right * 1.15, `left ${halves.left} vs right ${halves.right}`);
  check('and the model stays legible for judging a cosmetic',
    halves.model > 55, `model box ${halves.model}`);

  // 11. PRODUCER 08-18 (c): the SAME screen from the pause menu, anywhere,
  //     with no teleport and no flags. Fresh boot so the mirror has never been
  //     opened in this save — that is the only way to prove the menu path
  //     writes nothing.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);
  const roomBefore = await page.evaluate(() => window.__explore.player.currentRoom);
  await tap('Escape', 120);
  await page.waitForTimeout(700);
  check('pause menu open from the cubicle farm', (await top()) === 'MenuState', await top());
  // Walk the menu to Cosmetics and open it.
  const openedCos = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    const menu = st[st.length - 1];
    menu._showCosmetics?.();
    return !!menu.cosmeticsOverlay;
  });
  check('cosmetics tab open', openedCos);
  const entry = await page.evaluate(() =>
    document.querySelector('.wd-fitting-entry .ability-name')?.textContent || null);
  check('the tab offers a Fitting Room row', entry === 'Fitting Room', String(entry));
  await tap('Enter', 120);
  await page.waitForTimeout(900);
  check('fitting room pushed from the menu', (await top()) === 'WardrobeState', await top());
  const stage = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    const w = st[st.length - 1];
    return {
      dressing: w.dressing,
      title: document.querySelector('.wd-rail-title')?.textContent,
      gleam: getComputedStyle(document.querySelector('.wd-mirror-gleam')).display,
      room: window.__explore.player.currentRoom,
    };
  });
  check('it is the stage dressing, not the mirror', stage.dressing === 'stage', JSON.stringify(stage));
  check('titled FITTING ROOM', stage.title === 'FITTING ROOM', String(stage.title));
  check('no mirror gleam in the menu dressing', stage.gleam === 'none', String(stage.gleam));
  check('and it did NOT move the player', stage.room === roomBefore, `${roomBefore} -> ${stage.room}`);
  await tap('Enter', 120);   // equip the first row
  await page.waitForTimeout(500);
  const menuEquip = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('equipping works from the menu path', !!menuEquip.hat, JSON.stringify(menuEquip));
  const noFlags = await page.evaluate(() => ({
    used: !!window.__explore.player.getFlag('wardrobe_mirror_used'),
    tip: !!window.__explore.player.getFlag('wardrobe_tip_shown'),
  }));
  check('the menu path writes NO wardrobe flags', !noFlags.used && !noFlags.tip, JSON.stringify(noFlags));
  await page.screenshot({ path: `${OUT}/07-menu-fitting-room.png` });
  await tap('Escape', 120);
  await page.waitForTimeout(700);
  check('back to the menu, not the world', (await top()) === 'MenuState', await top());
  const panelFresh = await page.evaluate(() =>
    [...document.querySelectorAll('.cosmetics-slot-value')].map(e => e.textContent).join('|'));
  check('the tab under it re-rendered with the new equip',
    !/^— empty —\|/.test(panelFresh), panelFresh);

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
} catch (err) {
  console.error('HARNESS ERROR:', err.message);
  fails++;
} finally {
  await browser.close();
  process.exit(fails ? 1 : 0);
}
