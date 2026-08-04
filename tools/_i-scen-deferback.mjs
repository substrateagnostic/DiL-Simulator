// deferback: the DEFER-DON'T-DESTROY regression, end to end.
//
// Boots straight into a story fight, so the objective toast posted during room
// load is on screen when combat entry suspends the world scope (the audit's
// offender 6: measured at 234 ms of an intended 2600 ms, 91 % of the message
// destroyed, never re-shown). Then wins the fight, which fires the achievement
// burst + autosave into a post-dialog that immediately claims VOICE (offenders
// 1 and 2), then advances the dialog to its end and waits.
//
// PASS looks like: nothing co-visible with the dialog, and every deferred card
// present on screen AFTER the dialog closes.
export default async function ({ page, shot, wait }) {
  await wait(4500);
  await shot('a-in-combat');
  await page.keyboard.down('Backquote'); await wait(140); await page.keyboard.up('Backquote');
  await wait(2600);
  await shot('b-victory-burst');
  await wait(1800);
  await shot('c-dialog-open');          // deferred cards must NOT be here

  // Advance the post-dialog to its end.
  for (let i = 0; i < 26; i++) {
    const up = await page.evaluate(() => {
      const d = document.querySelector('.dialog-box');
      return !!d && d.offsetParent !== null && getComputedStyle(d).display !== 'none';
    }).catch(() => false);
    if (!up) break;
    await page.keyboard.down('Enter'); await wait(110); await page.keyboard.up('Enter');
    await wait(520);
  }
  await wait(700);
  await shot('d-after-dialog');         // deferred cards must BE here
  await wait(1400);
  await shot('e-settled');
  await wait(2500);
}
