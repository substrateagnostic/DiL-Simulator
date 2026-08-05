// prose: the three-prose collision after a combat defeat.
// Instead of a fixed loop, WAIT for the post-defeat dialog box to exist, then
// shoot immediately — the PIP toast + room thought + Rachel's line share the
// screen for ~4.2s and a fixed-delay loop misses the window.
export default async function ({ page, shot, wait }) {
  await wait(5000);
  // attack until the exploration dialog box appears (i.e. we lost and are back)
  for (let i = 0; i < 40; i++) {
    const up = await page.evaluate(() => {
      const d = document.querySelector('.dialog-box');
      return !!d && d.offsetParent !== null;
    }).catch(() => false);
    if (up) break;
    await page.keyboard.down('Enter'); await wait(80); await page.keyboard.up('Enter');
    await wait(500);
  }
  // we are in the aftermath — sample it hard and fast
  for (let i = 1; i <= 12; i++) {
    await shot(`w${i}`);
    await wait(350);
  }
}
