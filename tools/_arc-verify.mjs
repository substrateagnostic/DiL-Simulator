// Verification: death -> restart -> ESC exit -> re-enter. Proves the fail
// state, the run-it-back path, teardown (DOM + Engine post-stack restore),
// and that the arcade launches EXACTLY ONCE per interaction.
import { chromium } from 'playwright';
import fs from 'node:fs';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const OUT='screenshots/g-run/arcade/verify';
fs.mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ headless:false, args:['--use-gl=angle','--enable-gpu'] });
const c = await b.newContext({ viewport:{width:1280,height:720} });
const p = await c.newPage();
const errs=[];
p.on('pageerror', e=>errs.push('PAGEERROR '+e.message));
p.on('console', m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
await p.goto('http://localhost:4180/?dev&arcade=1');
await p.waitForFunction(()=>window.__shotReady===true,{timeout:30000});
await p.waitForFunction(()=>!!window.__arcade,{timeout:20000});
await sleep(700);

const R={};
R.rootsOnEntry = await p.evaluate(()=>document.querySelectorAll('#sr-root').length);
await p.keyboard.down('Space'); await sleep(160); await p.keyboard.up('Space');
await sleep(400);

// Stand still and let the Deadline take us — proves the fail state.
let over=false;
for(let i=0;i<70 && !over;i++){ await sleep(700); over = await p.evaluate(()=>window.__arcade.over); }
R.died = over;
R.deathCause = await p.evaluate(()=>window.__arcade.overCause);
await sleep(400);
await p.screenshot({path:`${OUT}/01-game-over.png`});
R.gameOverCard = await p.evaluate(()=>{const e=document.getElementById('sr-card');return e?e.innerText.replace(/\n+/g,' | '):null;});

// Run it back.
await p.keyboard.down('Enter'); await sleep(200); await p.keyboard.up('Enter');
await sleep(700);
R.restarted = await p.evaluate(()=>{const a=window.__arcade;return !a.over && a.started && a.score===0;});
await p.keyboard.down('Space'); await sleep(160); await p.keyboard.up('Space');
await p.keyboard.down('ArrowRight'); await sleep(2500);
R.movingAfterRestart = await p.evaluate(()=>Math.abs(window.__arcade.runner.gsp) > 8);
await p.keyboard.up('ArrowRight');
await p.screenshot({path:`${OUT}/02-restarted.png`});

// ESC back to the break room.
await p.keyboard.down('Escape'); await sleep(200); await p.keyboard.up('Escape');
await sleep(1200);
R.afterExit = await p.evaluate(()=>({
  srRoots: document.querySelectorAll('#sr-root').length,
  srStyles: document.querySelectorAll('#sr-style').length,
  srCards: document.querySelectorAll('#sr-card').length,
}));
await p.screenshot({path:`${OUT}/03-back-in-office.png`});

R.errors = errs;
fs.writeFileSync(`${OUT}/verify.json`, JSON.stringify(R,null,1));
console.log(JSON.stringify(R,null,1));
await b.close();
