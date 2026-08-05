// postfight: win a STORY fight (one with a postDialogId). The victory path
// fires flag toasts + achievements + autosave, then auto-plays the post-dialog.
// Question under test: do the toasts land ON TOP OF the game's own writing?
export default async function ({ page, shot, wait }) {
  await wait(4500);
  await page.keyboard.down('Backquote'); await wait(120); await page.keyboard.up('Backquote');
  for (let i = 1; i <= 14; i++) {
    await wait(700);
    await shot(`t${String(i * 700).padStart(5, '0')}`);
  }
  await wait(2000);
}
