// defeat: lose to Karen at level 1, then densely sample the aftermath, where
// the PIP toast + the room thought (inner monologue) + Rachel's dialog line all
// occupy the screen at once — three separate pieces of PROSE competing.
export default async function ({ page, shot, wait }) {
  await wait(5000);
  for (let i = 0; i < 22; i++) {
    await page.keyboard.down('Enter'); await wait(90); await page.keyboard.up('Enter');
    await wait(950);
  }
  for (let i = 1; i <= 20; i++) {
    await wait(600);
    await shot(`after${String(i * 600).padStart(5, '0')}`);
  }
}
