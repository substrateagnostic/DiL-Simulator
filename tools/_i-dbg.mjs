import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', e => console.log('PAGEERR>', e.message));
await p.goto('http://localhost:5173/?dev&fixture=act3&fight=karen', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__shotReady === true, { timeout: 40000 }).catch(()=>{});
await p.waitForTimeout(4200);
console.log('pre', JSON.stringify(await p.evaluate(() => ({
  combat: !!window.__combat, hudClosed: window.__combat?.hud?._closed,
  root: !!document.querySelector('.na-root'),
  zoneEl: !!document.querySelector('.na-zone-taunt-left'),
  st: window.__arbiter.debugState(),
})), null, 1));
await p.evaluate(() => { window.__combat.hud.showTaunt('AAA', 'player'); window.__combat.hud.showTaunt('BBB', 'player'); });
await p.waitForTimeout(600);
console.log('post', JSON.stringify(await p.evaluate(() => ({
  left: document.querySelectorAll('.na-zone-taunt-left .combat-taunt').length,
  innerHTML: document.querySelector('.na-zone-taunt-left')?.innerHTML?.slice(0,200),
  st: window.__arbiter.debugState().zones,
  log: window.__arbiter.getLog().slice(0,4),
})), null, 1));
await b.close();
