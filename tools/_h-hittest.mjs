// Throwaway: is the na-root actually swallowing clicks on the combat buttons in
// the SHIPPING build, or is Playwright's actionability check seeing something
// the browser would not? Reads document.elementFromPoint at the Attack button's
// own centre and prints the computed pointer-events of every ancestor.
import { chromium } from 'playwright';
const PORT = process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '5174';
const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=karen`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 45000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 45000 });
await page.waitForTimeout(1200);
console.log(JSON.stringify(await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.combat-action-btn')].find(b => b.textContent.trim() === 'Attack');
  if (!btn) return { error: 'no Attack button' };
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const chain = [];
  for (let e = hit; e && e !== document.documentElement; e = e.parentElement) {
    chain.push({ cls: e.className, pe: getComputedStyle(e).pointerEvents, z: getComputedStyle(e).zIndex });
  }
  const naRoot = document.querySelector('.na-root');
  return {
    btnRect: { x: Math.round(cx), y: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height) },
    hitIsButton: hit === btn,
    hitClass: hit?.className,
    chain,
    naRootPE: naRoot ? getComputedStyle(naRoot).pointerEvents : 'absent',
    naRootRect: naRoot ? naRoot.getBoundingClientRect().toJSON() : null,
    naZones: [...document.querySelectorAll('.na-zone')].map(z => ({ cls: z.className, pe: getComputedStyle(z).pointerEvents })),
  };
}), null, 1));
await browser.close();
