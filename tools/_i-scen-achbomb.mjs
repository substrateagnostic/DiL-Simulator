// achbomb: fresh localStorage + a late-act fixture means the FIRST
// AchievementManager.check() of the session retro-unlocks every flag-gated
// achievement at once. Fires on combat victory (backtick dev instakill),
// alongside XP / level-up / autosave / post-dialog.
export default async function ({ page, shot, wait }) {
  await wait(4000);
  await shot('pre-kill');
  await page.keyboard.down('Backquote'); await wait(120); await page.keyboard.up('Backquote');
  for (const t of [600, 1400, 2400, 3600, 5200, 7000]) {
    await wait(t === 600 ? 600 : 900);
    await shot(`kill+${t}ms`);
  }
  await wait(3000);
}
