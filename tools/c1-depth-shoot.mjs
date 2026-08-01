// COMBAT DEPTH verification harness — drives the four new mechanics in a REAL
// fight and captures the HUD/beat frames so each can be judged on a contact sheet.
//
//   node tools/c1-depth-shoot.mjs                    default set (karen, rachel_boss)
//   node tools/c1-depth-shoot.mjs --only=karen
//
// Requires the dev server running (npm run dev). Uses the ?dev fixture loader
// (window.__shotReady) and the dev-only window.__combat handle from CombatState.
//
// Shots captured per subject:
//   locks_row     — the telegraph carrying its OBJECTIONS chip row
//   locks_cleared — a chip struck through after a matching-tag hit
//   locks_fizzle  — MOTION VOID on the enemy turn after a full clear
//   composure     — the enemy Composure bar under the HP bar
//   break         — COMPOSURE BROKEN banner the instant the bar empties
//   press_free    — the action menu STILL up after Press Advantage resolved
//   loop_in       — the Loop In baton-pass prompt

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/c1-depth';
const fixture = process.argv.find(a => a.startsWith('--fixture='))?.slice(10) || 'act7';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
// NOTE: the FIRST Karen fight is a scripted one-shot loss (atk 999), so it is
// not a usable subject — a driven enemy turn ends the fight mid-harness.
const SUBJECTS = ['grandma', 'rachel_boss', 'algorithm'];

const shot = (page, label, name) => page.screenshot({ path: join(OUT, `${label}_${name}.png`) });

const suppressAchievementToasts = async (page) => {
  await page.evaluate(() => {
    const kill = () => {
      for (const el of Array.from(document.querySelectorAll('#ui-overlay > div'))) {
        if (el.textContent && el.textContent.includes('Achievement!')) el.remove();
      }
    };
    kill();
    new MutationObserver(kill).observe(document.getElementById('ui-overlay') || document.body, { childList: true });
  });
};

const primeCombat = async (page) => {
  await page.waitForFunction(() => !!window.__combat, { timeout: 25000 });
  await page.evaluate(() => {
    const c = window.__combat;
    if (c?.engine?.player) c.engine.player.spd = 999;
    if (c?.phase === 'intro') c.animTimer = 0;
    for (const el of Array.from(document.querySelectorAll('.combat-enemy-intro'))) el.remove();
  });
};

const waitForPlayerTurn = (page) => page.waitForFunction(() => {
  const c = window.__combat;
  return !!c && c.inputEnabled === true && c.phase === 'ally_turn' && c._activeAllyIndex === 0;
}, { timeout: 60000 });

// Force the target enemy to telegraph a move that actually carries locks, so
// the row is guaranteed on-frame rather than depending on the AI roll.
const forceLockedTelegraph = (page) => page.evaluate(() => {
  const c = window.__combat;
  const e = c.engine.enemies[0];
  const lockable = [...c.engine._lockableSet(e)];
  if (lockable.length === 0) return null;
  e.telegraphedAbility = lockable[0];
  e.locks = c.engine._buildLocks(e, lockable[0]);
  e.lockAbilityId = lockable[0];
  c._refreshDepthHUD();
  c.hud.updateTelegraphAll(c.engine.enemies.map(en => en.hp > 0 ? c._getTelegraphHint(en.telegraphedAbility, en) : null));
  return { ability: lockable[0], tags: e.locks.map(l => l.tag) };
});

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const results = [];
  const findings = [];

  for (const enemy of SUBJECTS.filter(s => !only || s.includes(only))) {
    const page = await context.newPage();
    const label = enemy;
    const log = [];
    page.on('pageerror', e => log.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') log.push('CONSOLE: ' + m.text()); });
    try {
      await page.goto(`${BASE}/?dev&fixture=${fixture}&fight=${enemy}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 25000 });
      await suppressAchievementToasts(page);
      await primeCombat(page);
      await waitForPlayerTurn(page);

      // ── 1. LOCKS row + Composure bar on the telegraph ────────────────
      const forced = await forceLockedTelegraph(page);
      await page.waitForTimeout(350);
      await shot(page, label, 'locks_row');
      const rowInfo = await page.evaluate(() => {
        const chips = [...document.querySelectorAll('.combat-lock-chip')].map(c => c.textContent.trim());
        const comp = document.querySelector('.combat-composure');
        const bar = document.querySelector('.combat-composure-fill');
        return {
          chips,
          labelShown: !!document.querySelector('.combat-locks-label'),
          composureVisible: !!comp && comp.style.display !== 'none',
          composureWidth: bar ? bar.style.width : null,
          telegraph: document.querySelector('.combat-telegraph')?.textContent || '',
        };
      });
      findings.push({ subject: label, step: 'locks_row', forced, ...rowInfo });

      // ── 2. Clear ONE lock with a matching-tag ability ────────────────
      const cleared = await page.evaluate(() => {
        const c = window.__combat;
        const e = c.engine.enemies[0];
        const need = (e.locks || []).find(l => !l.cleared);
        if (!need) return { ok: false, why: 'no locks' };
        // Find the player ability with that tag (grant MP so it always fires).
        const abil = c.player.getAbilities().find(a => a.tag === need.tag && (a.type === 'attack' || a.type === 'attack_aoe'));
        if (!abil) return { ok: false, why: 'no ability with tag ' + need.tag };
        c.engine.player.mp = c.engine.player.maxMP;
        c.inputEnabled = false;
        const res = c.engine.playerAbility(abil.id, 0);
        c._playLockFeedback(res, abil.tag);
        c._playBreakFeedback(res);
        c._refreshHUD();
        return { ok: true, tag: need.tag, ability: abil.id, locksCleared: res?.locksCleared, effective: res?.effective };
      });
      await page.waitForTimeout(180);
      // Sample the chip DOM at the shatter peak, THEN shoot (the screenshot
      // itself costs a few hundred ms and the shatter is a 450ms animation).
      const chipState = await page.evaluate(() => [...document.querySelectorAll('.combat-lock-chip')]
        .map(c => ({ text: c.textContent.trim(), cleared: c.classList.contains('cleared'), shatter: c.classList.contains('shatter') })));
      const clearBanner = await page.evaluate(() => [...document.querySelectorAll('.combat-message')].map(m => m.textContent).join(' | '));
      await page.waitForTimeout(260);
      await shot(page, label, 'locks_cleared');
      findings.push({ subject: label, step: 'locks_cleared', ...cleared, chips: chipState, banner: clearBanner });

      // ── 3. Full clear → FIZZLE on the enemy turn ─────────────────────
      const fizzle = await page.evaluate(() => {
        const c = window.__combat;
        const e = c.engine.enemies[0];
        for (const l of (e.locks || [])) l.cleared = true;
        c._refreshDepthHUD();
        // Top Andrew up so a driven enemy turn can never end the fight mid-run.
        c.engine.player.hp = c.engine.player.maxHP;
        const res = c.engine.enemyTurn(0);
        c.engine.player.hp = c.engine.player.maxHP;
        return { type: res?.type, message: res?.message, locksTotal: res?.locksTotal };
      });
      await page.evaluate(() => {
        const c = window.__combat;
        c.hud.showBanner('MOTION VOID', 6000);
        c.hud.showMessage('The motion was voided. They reach for it — nothing’s there.');
        c.hud.pulseOverlay('grid', '#ffd700', 3000);
      });
      await page.waitForTimeout(300);
      await shot(page, label, 'locks_fizzle');
      findings.push({ subject: label, step: 'fizzle', ...fizzle });

      // ── 4. COMPOSURE BREAK ───────────────────────────────────────────
      const broke = await page.evaluate(() => {
        const c = window.__combat;
        // Drop the harness's long-hold MOTION VOID card so the next banner
        // sampled is unambiguously the Break one.
        for (const el of Array.from(document.querySelectorAll('.combat-power-banner'))) el.remove();
        c.hud._powerBanner = null;
        const e = c.engine.enemies[0];
        const before = { composure: e.composure, max: e.maxComposure, broken: e.broken };
        const res = c.engine._reduceComposure(e, e.composure);
        c._playBreakFeedback({ brokeComposure: res.broke, targetIndex: 0 });
        c._refreshDepthHUD();
        return { before, after: { composure: e.composure, broken: e.broken }, broke: res.broke };
      });
      await page.waitForTimeout(760);
      const breakUi = await page.evaluate(() => ({
        banner: document.querySelector('.combat-power-banner')?.textContent || null,
        barLabel: document.querySelector('.combat-composure-label')?.textContent || null,
        barBroken: !!document.querySelector('.combat-composure.broken'),
        barWidth: document.querySelector('.combat-composure-fill')?.style.width || null,
      }));
      await shot(page, label, 'break');
      findings.push({ subject: label, step: 'break', ...broke, ...breakUi });

      // Take the break state back off so the rest of the run is clean
      await page.evaluate(() => {
        const c = window.__combat;
        const e = c.engine.enemies[0];
        e.broken = 0; e.composure = e.maxComposure;
        c._refreshDepthHUD();
      });

      // ── 5. PRESS ADVANTAGE is a free action ─────────────────────────
      await page.evaluate(() => {
        const c = window.__combat;
        c.engine.player.momentum = 100;
        c.engine.player.pressAdvantageUsedThisTurn = false;
        c.inputEnabled = false;
        c._executePressAdvantage(0);
      });
      // The engine re-enables input at +1400ms if the turn did NOT end.
      await page.waitForTimeout(1900);
      const pressState = await page.evaluate(() => {
        const c = window.__combat;
        return {
          inputEnabled: c.inputEnabled,
          phase: c.phase,
          activeAlly: c._activeAllyIndex,
          pressUsed: c.engine.player.pressAdvantageUsedThisTurn,
          menuLabels: [...document.querySelectorAll('.combat-action-btn')].map(b => b.textContent.trim()),
        };
      });
      await shot(page, label, 'press_free');
      findings.push({ subject: label, step: 'press_free', ...pressState,
        stillPlayersTurn: pressState.inputEnabled === true && pressState.activeAlly === 0,
        buttonGone: !pressState.menuLabels.some(l => l.includes('Press Advantage')) });

      // ── 6. LOOP IN prompt ───────────────────────────────────────────
      const loop = await page.evaluate(() => {
        const c = window.__combat;
        if (c.engine.allies.length < 2) {
          // The scripted encounters run solo. Bench an ally by hand so the
          // baton-pass prompt is exercised against the real code path.
          const ally = c.engine._buildAlly('janet', {});
          if (!ally) return { ok: false, why: 'could not build bench ally' };
          c.engine.allies.push(ally);
          c.hud.refreshPartyRow(c._buildPartyView());
        }
        c.engine.player.loopInUsedThisTurn = false;
        c.engine.loopInReady = true;
        const shown = c._maybeOfferLoopIn(() => {});
        return { ok: shown, candidates: c.engine.getLoopInCandidates() };
      });
      await page.waitForTimeout(300);
      if (loop.ok) await shot(page, label, 'loop_in');
      findings.push({ subject: label, step: 'loop_in', ...loop,
        title: await page.evaluate(() => document.querySelector('.loop-in-overlay .minigame-title')?.textContent || null),
        options: await page.evaluate(() => [...document.querySelectorAll('.loop-in-overlay .gamble-option-name')].map(o => o.textContent.trim())) });

      results.push({ name: label, ok: true, errors: log });
      console.log(`  ✓ ${label}`);
    } catch (err) {
      results.push({ name: label, ok: false, err: String(err).split('\n')[0], errors: log });
      console.log(`  ✗ ${label} — ${String(err).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  const shots = readdirSync(OUT).filter(f => f.endsWith('.png'));
  const groups = {};
  for (const f of shots) { const k = f.split('_')[0] === 'rachel' ? 'rachel_boss' : f.split('_')[0]; (groups[k] ||= []).push(f); }
  writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>TRUST ISSUES — combat depth verification</title>
<style>
 body{background:#08080f;color:#ddd;font-family:monospace;margin:16px}
 h1{color:#e94560} h2{color:#53a8b6;font-size:15px;margin:18px 0 6px}
 .strip{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
 figure{margin:0} img{width:100%;display:block;border:1px solid #222}
 figcaption{font-size:11px;color:#53a8b6;padding:2px}
 pre{background:#101018;padding:10px;overflow:auto;font-size:11px;color:#9fd}
</style>
<h1>Combat depth — ${new Date().toISOString()}</h1>
${Object.keys(groups).sort().map(k => `<section><h2>${k}</h2><div class="strip">${groups[k].sort().map(f => `<figure><img src="${f}"><figcaption>${f.replace(/\.png$/, '')}</figcaption></figure>`).join('')}</div></section>`).join('')}
<h2>assertions</h2><pre>${JSON.stringify(findings, null, 2).replace(/</g, '&lt;')}</pre>`);
  writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ results, findings }, null, 2));

  await browser.close();
  console.log(JSON.stringify(findings, null, 1));
  console.log(`\n${results.filter(r => r.ok).length}/${results.length} → ${OUT}/index.html`);
  process.exit(results.every(r => r.ok) ? 0 : 1);
};

run();
