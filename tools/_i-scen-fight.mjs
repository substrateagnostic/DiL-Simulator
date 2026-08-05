// fight: play a real fight with basic attacks so combat messages, taunts,
// floating damage, telegraph and composure/lock feedback all fire naturally.
export default async function ({ page, shot, wait }) {
  await wait(5000);
  await shot('start');
  for (let i = 0; i < 26; i++) {
    await page.keyboard.down('Enter'); await wait(90); await page.keyboard.up('Enter');
    await wait(950);
  }
  await shot('end');
  await wait(2000);
}
