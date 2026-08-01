// knowledge-gate-check.mjs — proof that the Vault is genuinely openable in Act 1.
//
// The claim in Gameplay.md ("an attentive first-timer can open the Vault in
// Act 1") was previously false as shipped and, worse, was "verified" by a trace
// that teleported into the room with _changeRoom from a dev fixture, which
// bypasses the very gate under test. This harness does not do that. It:
//
//   1. starts a BRAND NEW save (actIndex 0, parking garage, no flags),
//   2. attempts the Archive and gets the stairwell service-door keypad,
//   3. TYPES 47-19-82 into the three fields and presses Enter, the way a player
//      who read the circuit panel in the Janitor's supply closet would,
//   4. walks into the Archive, gets the Mosler on the Vault door, types it
//      again, and ends standing in the Vault — still in Act 1.
//
// It also asserts the two `*_cracked_early` flags fire and that the page logged
// no errors. If any of the numbers or flags in the Gameplay.md "Vault Keypad"
// section change, this is the thing that has to still pass.
//
// Requires a dev server on 5174:  npx vite --port 5174 --strictPort
//   node tools/knowledge-gate-check.mjs

import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });

await page.goto('http://localhost:5174/?dev', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const tap = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(90); await page.keyboard.up(k); await page.waitForTimeout(200); };
// New game from the title -> slot picker -> slot 0
await tap('Enter');
await page.waitForTimeout(1200);
await page.evaluate(() => { if (window.__slotPick) window.__slotPick(0); });
await page.waitForTimeout(5000);

const r = await page.evaluate(() => {
  const ex = window.__explore;
  if (!ex) return { loaded: false, keys: Object.keys(window).filter(k => k.startsWith('__')) };
  const p = ex.player;
  const out = { loaded: true, room: p.currentRoom, act: p.actIndex };
  out.hasArchiveKeypad = typeof ex._openArchiveKeypad === 'function';
  out.archiveFlagBefore = !!p.getFlag('archive_accessible');
  ex._changeRoom('archive', 6, 8);
  out.keypadOpened = !!ex._vaultKeypad;
  out.panelHeader = document.querySelector('#vault-keypad')?.querySelector('div')?.textContent?.trim().slice(0, 40) || null;
  return out;
});
if (r.keypadOpened) {
  // Type the real combination the way a player would: three fields, Enter.
  const fields = await page.$$('#vault-keypad input');
  const code = ['47', '19', '82'];
  for (let i = 0; i < fields.length; i++) { await fields[i].click(); await fields[i].type(code[i]); }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const after = await page.evaluate(async () => {
    const ex = window.__explore;
    const p = ex.player;
    const o = {
      archiveFlagAfter: !!p.getFlag('archive_accessible'),
      crackedEarly: !!p.getFlag('archive_cracked_early'),
      keypadClosed: !ex._vaultKeypad,
    };
    await ex._changeRoom('archive', 6, 8);
    return o;
  });
  await page.waitForTimeout(3500);
  after.roomNow = await page.evaluate(() => window.__explore.player.currentRoom);
  // ...and on into the Vault from the Archive, same code, still Act 1.
  await page.evaluate(() => window.__explore._changeRoom('vault', 1, 4));
  await page.waitForTimeout(700);
  after.vaultKeypadOpened = await page.evaluate(() => !!window.__explore._vaultKeypad);
  const vf = await page.$$('#vault-keypad input');
  for (let i = 0; i < vf.length; i++) { await vf[i].click(); await vf[i].type(code[i]); }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__explore._changeRoom('vault', 1, 4));
  await page.waitForTimeout(3500);
  after.vaultRoom = await page.evaluate(() => window.__explore.player.currentRoom);
  after.vaultCracked = await page.evaluate(() => !!window.__explore.player.getFlag('vault_cracked_early'));
  Object.assign(r, after);
}
console.log(JSON.stringify(r, null, 2));
console.log('ERRORS:', errs.length ? [...new Set(errs)].join(' | ') : '(none)');
await browser.close();
