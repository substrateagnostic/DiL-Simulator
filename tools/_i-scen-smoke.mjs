// smoke: just wander so room transitions / thoughts / autosave fire naturally
export default async function ({ page, walk, wait, shot }) {
  await wait(1500);
  await shot('t0');
  for (const [k, ms] of [['ArrowUp', 900], ['ArrowRight', 900], ['ArrowDown', 900], ['ArrowLeft', 900]]) {
    await walk(k, ms);
    await wait(700);
  }
  await shot('t1');
  await wait(3000);
}
