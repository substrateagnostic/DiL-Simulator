// Frame-time census for SPRINT REVIEW at the RTX 4050 dev target.
// No video recording (it caps the page at ~15fps and would measure the
// recorder, not the game). Headed chromium, real GPU.
import { chromium } from 'playwright';
import fs from 'node:fs';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ headless:false, args:['--use-gl=angle','--enable-gpu'] });
const c = await b.newContext({ viewport:{width:1280,height:720} });
const p = await c.newPage();
await p.goto('http://localhost:4180/?dev&arcade=1&hud=0');
await p.waitForFunction(()=>!!window.__arcade,{timeout:30000});
await sleep(800);
await p.keyboard.down('Space'); await sleep(160); await p.keyboard.up('Space'); await sleep(300);
await p.keyboard.down('ArrowRight');
// warm up, then sample
await sleep(4000);
await p.evaluate(()=>{ window.__ft=[]; let last=performance.now();
  const tick=(t)=>{ window.__ft.push(t-last); last=t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick); });
const jumper=setInterval(async()=>{ try{ await p.keyboard.down('Space'); await sleep(140); await p.keyboard.up('Space'); }catch{} },1000);
await sleep(30000);
clearInterval(jumper);
await p.keyboard.up('ArrowRight');
const r = await p.evaluate(()=>{
  const f = window.__ft.slice(5).filter(v=>v>0 && v<500);
  f.sort((a,b)=>a-b);
  const q=(x)=>f[Math.min(f.length-1,Math.floor(f.length*x))];
  const mean=f.reduce((a,b)=>a+b,0)/f.length;
  return { frames:f.length, meanMs:+mean.toFixed(2), meanFps:+(1000/mean).toFixed(1),
           p50:+q(0.5).toFixed(2), p95:+q(0.95).toFixed(2), p99:+q(0.99).toFixed(2),
           worst:+f[f.length-1].toFixed(2),
           over16_7pct:+(100*f.filter(v=>v>16.7).length/f.length).toFixed(1),
           props: window.__arcade.active.length, floors: window.__arcade.floors };
});
console.log(JSON.stringify(r,null,1));
fs.mkdirSync('screenshots/g-run/arcade',{recursive:true});
fs.writeFileSync('screenshots/g-run/arcade/fps.json', JSON.stringify(r,null,1));
await b.close();
