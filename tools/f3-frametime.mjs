// F3 frame-time histogram, vsync ON (what the player actually feels), at
// CPU throttle 1 and 4 (COMP_CARD's "mid laptop" / "mobile floor" proxies).
//   node tools/f3-frametime.mjs --label=after
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LABEL = process.argv.find(a => a.startsWith('--label='))?.slice(8) || 'run';
const ROOMS = (process.argv.find(a => a.startsWith('--rooms='))?.slice(8) || 'cubicle_farm,parking_garage').split(',');
const THROTTLES = (process.argv.find(a => a.startsWith('--throttle='))?.slice(11) || '1,4').split(',').map(Number);
const SECONDS = Number(process.argv.find(a => a.startsWith('--seconds='))?.slice(10) || 20);
const DSF = Number(process.argv.find(a => a.startsWith('--dsf='))?.slice(6) || 1);
const OUT = path.resolve('screenshots/f3');
fs.mkdirSync(OUT, { recursive: true });

const PROBE = `
window.__ft = { on:false, i:0, dt:new Float32Array(8192), started:false,
  start(){ if(!this.started){ let last=performance.now(); const t=()=>{ const n=performance.now();
      if(this.on){ this.dt[this.i & 8191]=n-last; this.i++; } last=n; requestAnimationFrame(t); };
      requestAnimationFrame(t); this.started=true; }
    this.i=0; this.on=true; },
  stop(){ this.on=false;
    const n=Math.min(this.i,8192);
    const d=Array.from(this.dt.slice(0,n)).filter(v=>v>0).sort((a,b)=>a-b);
    const q=(p)=>d.length? +d[Math.min(d.length-1,Math.floor(d.length*p))].toFixed(2):null;
    const p50=q(0.5);
    const edges=[8,12,16.7,20,25,33,50,100]; const buckets=new Array(edges.length+1).fill(0);
    for(const v of d){ let k=edges.findIndex(e=>v<=e); if(k<0)k=edges.length; buckets[k]++; }
    const hitch=d.filter(v=>v>2*p50).length; const secs=d.reduce((a,b)=>a+b,0)/1000;
    let run=0,best=0; for(const v of d){ if(v>2*p50){run++;best=Math.max(best,run);} else run=0; }
    return { frames:d.length, seconds:+secs.toFixed(1), p50, p95:q(0.95), p99:q(0.99),
      max: d.length? +d[d.length-1].toFixed(2):null, fps_p50: p50? +(1000/p50).toFixed(1):null,
      hitchCount:hitch, hitchesPerSecond:+(hitch/secs).toFixed(3), longestHitchRun:best,
      histogram:{ edges:[...edges,'inf'], buckets },
      passes: window.__engine.composer.passes.filter(p=>p.enabled).length,
      pixelRatio: window.__engine.renderer.getPixelRatio(),
      buffer: [window.__engine.renderer.domElement.width, window.__engine.renderer.domElement.height] }; } };
`;

const browser = await chromium.launch({ headless: false, args: [
  '--window-position=-2400,0', '--window-size=1940,1180',
  '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
  '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force_high_performance_gpu',
  '--autoplay-policy=no-user-gesture-required',
]});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DSF });
await ctx.addInitScript(PROBE);
const results = [];
for (const room of ROOMS) {
  for (const rate of THROTTLES) {
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:5173/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
    const gpu = await page.evaluate(() => {
      const c = document.querySelector('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      const r = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'unknown';
      return { renderer: r, software: /swiftshader|software|llvmpipe|basic render/i.test(r), dpr: devicePixelRatio };
    });
    await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__ft.start());
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.down(k); await page.waitForTimeout((SECONDS * 1000) / 5); await page.keyboard.up(k);
    }
    await page.waitForTimeout((SECONDS * 1000) / 5);
    const m = await page.evaluate(() => window.__ft.stop());
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    results.push({ room, throttle: rate, dsf: DSF, gpu, ...m, errs });
    console.log(`[${room}] throttle=${rate} dsf=${DSF} buf=${m.buffer.join('x')} pr=${m.pixelRatio} composerPasses=${m.passes}`);
    console.log(`   p50 ${m.p50}  p95 ${m.p95}  p99 ${m.p99}  max ${m.max}  fps_p50 ${m.fps_p50}  hitches/s ${m.hitchesPerSecond} (longest run ${m.longestHitchRun})`);
    console.log(`   hist ${JSON.stringify(m.histogram.edges)} -> ${JSON.stringify(m.histogram.buckets)}`);
    if (errs.length) console.log('   ERRORS', errs.slice(0, 3));
    await page.close();
  }
}
fs.writeFileSync(path.join(OUT, `frametime-${LABEL}.json`), JSON.stringify(results, null, 1));
console.log('\nGPU', results[0]?.gpu.renderer, results[0]?.gpu.software ? '** SOFTWARE — RELATIVE ONLY **' : '(hardware)');
await browser.close();
