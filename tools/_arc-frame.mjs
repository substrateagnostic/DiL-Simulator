import { chromium } from 'playwright';
import fs from 'node:fs';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const OUT='screenshots/g-run/arcade/_frames';
fs.mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ headless:false, args:['--use-gl=angle','--enable-gpu'] });
const c = await b.newContext({ viewport:{width:1280,height:720} });
const p = await c.newPage();
p.on('pageerror', e=>console.log('PAGEERROR', e.message));
await p.goto('http://localhost:4180/?dev&arcade=1&hud=0');
await p.waitForFunction(()=>window.__shotReady===true,{timeout:30000});
await p.waitForFunction(()=>!!window.__arcade,{timeout:20000});
await sleep(800);
await p.keyboard.down('Space'); await sleep(200); await p.keyboard.up('Space');
await sleep(300);
await p.keyboard.down('ArrowRight');
// Jump on a cadence so the camera script plays roughly like a person and
// the captured frames are representative rather than a stall study.
const jumper = setInterval(async () => {
  try { await p.keyboard.down('Space'); await sleep(140); await p.keyboard.up('Space'); } catch {}
}, 900);
const marks=[2,5,9,14,20,27];
let i=0;
for(const m of marks){
  await sleep(m*1000 - (i? marks[i-1]*1000:0));
  const s = await p.evaluate(()=>{const a=window.__arcade,r=a.runner;return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),gsp:+r.gsp.toFixed(1),ang:+(r.angle*57.3).toFixed(1),gr:r.grounded,roll:r.rolling,inv:+r.invuln.toFixed(2),lock:+r.controlLock.toFixed(2),over:a.over,cause:a.overCause,score:a.score,clips:a.clips,dread:+a._dread().toFixed(2)};});
  await p.screenshot({path:`${OUT}/t${String(m).padStart(2,'0')}.png`});
  console.log(m, JSON.stringify(s));
  i++;
}
clearInterval(jumper);
await p.keyboard.up('ArrowRight');
await b.close();
