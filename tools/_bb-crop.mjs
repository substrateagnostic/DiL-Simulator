// BODY-BOB closeup crops. Runs tools/_bb-stage.js `bob()` at NECK and WAIST
// framing (a true closeup — the producer's camera) and prints the three
// frame-diff numbers per band:
//   raw       what the eye sees at a fixed frame
//   footReg   registered on the planted feet  (removes whole-figure travel)
//   headReg   registered on the head          (removes UPPER-BODY travel;
//             a rigid slide reads ~0 here, a real warp does not)
//
//   node tools/_bb-crop.mjs --tag=before [--port=5311] [--id=andrew]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const arg = (k,d)=>{const a=process.argv.find(s=>s.startsWith(`--${k}=`));return a?a.slice(k.length+3):d;};
const PORT=arg('port','5311'), tag=arg('tag','before'), id=arg('id','andrew');
const LEGACY=process.argv.includes('--legacy');
const OUT=join('screenshots','bb',tag,'closeup'); mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({headless:false});
const p=await (await b.newContext({viewport:{width:900,height:900}})).newPage();
p.on('pageerror',e=>console.log('!',String(e).split('\n')[0]));
await p.goto(`http://localhost:${PORT}/?dev`,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(3000);
const ensureStage = async () => { if (!(await p.evaluate(() => !!window.__bb))) await p.evaluate(async()=>{await import('/tools/_bb-stage.js');}); };
await ensureStage();
const all={};
for (const f of ['neck','waist']) for (const mode of ['idle','walk','sit']) {
  await ensureStage();
  const res = await p.evaluate(async a=>await window.__bb.bob(a.id,a.o),{id,o:{mode,frame:f,samples:16,w:420,h:420,legacy:LEGACY}});
  for(const [k,u] of Object.entries(res.shots||{})) writeFileSync(join(OUT,`${id}-${f}-${k}.png`),Buffer.from(String(u).split(',')[1],'base64'));
  const m=res.metrics; const band=m.px[f];
  all[`${f}/${mode}`]=m;
  console.log(`${(f+'/'+mode).padEnd(12)} hemThroughHip=${String(m.hemThroughHipM).padEnd(8)} silTop±${String(m.silTopRangePx).padEnd(3)} silBot±${String(m.silBotRangePx).padEnd(3)} | ${f} raw=${String(band.rawWorstAbsL).padEnd(7)} footReg=${String(band.footRegWorstAbsL).padEnd(7)} headReg=${band.headRegWorstAbsL}`);
}
writeFileSync(join(OUT,`_closeup-${tag}.json`),JSON.stringify(all,null,2));
await b.close();
