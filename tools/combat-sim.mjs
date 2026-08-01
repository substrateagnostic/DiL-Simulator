// combat-sim.mjs — the headless combat harness for TRUST ISSUES.
//
// This file is the evidence behind the balance numbers quoted in
// src/combat/CombatEngine.js comments and in Gameplay.md. It imports the REAL
// CombatEngine and the REAL data files; nothing in src/ is modified, and no
// output is ever written back into the game. Report-only tooling.
//
//   node tools/combat-sim.mjs                 # encounter ladder, competent policy
//   node tools/combat-sim.mjs --naive         # same ladder, median-player policy
//   node tools/combat-sim.mjs --tax-ab        # A/B the pre-Break damage band
//   node tools/combat-sim.mjs --gamble        # Desperate Gamble EV table
//   node tools/combat-sim.mjs --pip           # CASUAL floor against the PIP ladder
//   node tools/combat-sim.mjs --pip 0,5,10,20,30 --runs 300
//   node tools/combat-sim.mjs --relic         # Ergonomic Wrist Support A/B
//   node tools/combat-sim.mjs --lock-audit    # per-enemy Lock coverage
//   node tools/combat-sim.mjs --denial-ab     # the Denial tax, on vs off
//   node tools/combat-sim.mjs --denial-ab 1.0,1.35,1.6   # ...sweeping the seal premium
//   node tools/combat-sim.mjs --trade         # Objections vs Composure: is the trade total?
//   node tools/combat-sim.mjs --dps           # per-hit damage under each band
//   node tools/combat-sim.mjs --enc karen --levels 6,7,8 --runs 400
//
// It also exports its pieces so tools/ng-sim.mjs and tools/day-sim.mjs run the
// same policy against the same engine — one player model, three questions.

import { CombatEngine, COMBAT_DEPTH } from '../src/combat/CombatEngine.js';
import {
  PLAYER_BASE_STATS, LEVEL_GROWTH, PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS,
} from '../src/data/stats.js';
import { ALLY_STATS } from '../src/data/allies.js';
import { ENCOUNTERS } from '../src/data/encounters/index.js';

export const MAX_ROUNDS = 300;

// ── Player build ────────────────────────────────────────────────────────
export function buildPlayerStats(level, extra = {}) {
  const lv = level - 1;
  const maxHP = PLAYER_BASE_STATS.maxHP + LEVEL_GROWTH.maxHP * lv;
  const maxMP = PLAYER_BASE_STATS.maxMP + LEVEL_GROWTH.maxMP * lv;
  return {
    maxHP, maxMP, hp: maxHP, mp: maxMP,
    atk: PLAYER_BASE_STATS.atk + LEVEL_GROWTH.atk * lv,
    def: PLAYER_BASE_STATS.def + LEVEL_GROWTH.def * lv,
    spd: PLAYER_BASE_STATS.spd + LEVEL_GROWTH.spd * lv,
    level, name: 'Andrew',
    ...extra,
  };
}

// Upgrade-point spend order (1 point per level-up, tier prereqs respected).
// Side-quest abilities (notarized_strike, root_access) assumed earned by L9.
export function unlockedAbilities(level) {
  const s = new Set(['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check']);
  if (level >= 2) s.add('cite_precedent');
  if (level >= 3) s.add('due_diligence');
  if (level >= 4) s.add('cc_all');
  if (level >= 6) s.add('forensic_audit');
  if (level >= 8) s.add('per_my_last_email');
  if (level >= 9) { s.add('notarized_strike'); s.add('root_access'); }
  if (level >= 10) s.add('whistleblower');
  if (level >= 12) s.add('power_of_attorney');
  return s;
}

// Ally level scaling — mirrors Player.getAllyEffectiveStats()
export function buildPartyOverrides(partyIds, level) {
  const out = {};
  const lv = Math.max(0, level - 1);
  for (const id of partyIds) {
    const cfg = ALLY_STATS[id];
    if (!cfg) continue;
    const f = cfg.growthFactor || 0.8;
    const maxHP = cfg.maxHP + Math.floor(LEVEL_GROWTH.maxHP * f * lv);
    const maxMP = cfg.maxMP + Math.floor(LEVEL_GROWTH.maxMP * f * lv);
    out[id] = {
      maxHP, maxMP, hp: maxHP, mp: maxMP,
      atk: cfg.atk + Math.floor(LEVEL_GROWTH.atk * f * lv),
      def: cfg.def + Math.floor(LEVEL_GROWTH.def * f * lv),
      spd: cfg.spd + Math.floor(LEVEL_GROWTH.spd * f * lv),
      unlockedAbilities: [...(cfg.starterAbilities || cfg.abilities)],
    };
  }
  return out;
}

// ── Policy helpers ──────────────────────────────────────────────────────
function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity, bestAtk = -1;
  engine.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    if (e.hp < bestHp || (e.hp === bestHp && e.atk > bestAtk)) {
      best = i; bestHp = e.hp; bestAtk = e.atk;
    }
  });
  return best;
}

function biggestIncomingPower(engine) {
  let biggest = null;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (a && (a.type === 'attack' || a.type === 'summon')) {
      const pw = a.power ?? 0;
      if (biggest === null || pw > biggest) biggest = pw;
    }
  }
  return biggest;
}

function estimateBiggestIncomingDamage(engine) {
  let worst = 0;
  const pDef = engine._getEffective(engine.player).def;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (!a || (a.type !== 'attack' && a.type !== 'summon')) continue;
    const eAtk = engine._getEffective(e).atk;
    const est = Math.max(1, Math.floor((eAtk + (a.power ?? 0)) * 1.5 - pDef * 0.5));
    if (est > worst) worst = est;
  }
  return worst;
}

// Brace QTE. The shipped bands are pct <= 0.10 perfect, <= 0.35 good, else
// miss (CombatState._showBraceMiniGame), and this harness has always modelled a
// competent player landing 15% / 70% / 15% on them. To price a relic that
// WIDENS the window (cosmetics.js `qte.braceWindow`) against the same player
// rather than against a guess, that split is expressed as a piecewise-linear
// CDF over the press error and re-sampled at the widened band edges. widen = 1
// reproduces 15/70/15 exactly, so every existing number is unchanged.
// Two aim models, because a window-widening relic is worth different amounts to
// different hands and reporting only one of them would be the whole trick.
export const AIM_STEADY = [[0, 0], [0.10, 0.15], [0.35, 0.85], [1, 1]];  // 15/70/15 — the shipped model
export const AIM_SHAKY  = [[0, 0], [0.10, 0.05], [0.35, 0.45], [1, 1]];  //  5/40/55 — the player the relic is for
function braceCdf(x, knots = AIM_STEADY) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1];
    const [x1, y1] = knots[i];
    if (x <= x1) return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
  }
  return 1;
}
export function rollBraceQuality(widen = 1, knots = AIM_STEADY) {
  const pPerfect = braceCdf(0.10 * widen, knots);
  const pGood = braceCdf(0.35 * widen, knots);
  const r = Math.random();
  if (r < pPerfect) return 'perfect';
  if (r < pGood) return 'good';
  return 'miss';
}

/** Identity relic — what a player with nothing equipped carries. */
export const NO_RELIC = { braceWindow: 1, retaliateDamage: 1, aim: AIM_STEADY };

function rollRetaliateMultiplier() {
  let correct = 0;
  for (let i = 0; i < 4; i++) if (Math.random() < 0.9) correct++;
  return 1.0 * (correct / 4);
}

function attackAbilities(unlocked, mp) {
  const out = [];
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (mp < a.cost) continue;
    out.push(id);
  }
  return out;
}

function bestTaggedAbility(engine, unlocked, tag) {
  let best = null;
  for (const id of attackAbilities(unlocked, engine.player.mp)) {
    const a = PLAYER_ABILITIES[id];
    if (a.tag !== tag) continue;
    if (!best) { best = id; continue; }
    const b = PLAYER_ABILITIES[best];
    if (a.power > b.power || (a.power === b.power && a.cost < b.cost)) best = id;
  }
  return best;
}

function bestWeaknessAbility(engine, target, unlocked) {
  return bestTaggedAbility(engine, unlocked, target.weakness);
}

// Which unbroken lock on the current telegraph can this loadout actually clear?
function openLockTag(engine, target, unlocked) {
  if (!target || target.sealed) return null;
  const locks = (target.locks || []).filter(l => !l.cleared);
  if (locks.length === 0) return null;
  // Prefer the tag the enemy is also weak to (double dips into Composure).
  const sorted = [...locks].sort((a, b) =>
    (b.tag === target.weakness ? 1 : 0) - (a.tag === target.weakness ? 1 : 0));
  for (const l of sorted) {
    if (bestTaggedAbility(engine, unlocked, l.tag)) return l.tag;
  }
  return null;
}

// ── Policies ────────────────────────────────────────────────────────────
// COMPETENT: reads the telegraph, chases Locks and Composure, spends momentum
// on tempo, braces the haymakers, hands the baton to allies on a weakness hit.
export function competentTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced;
  sim.justBraced = false;

  // Press Advantage is a free action now — take it first when it is affordable
  // and we are not saving momentum for a heal.
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }

  const act = () => {
    // 1. Second Wind
    if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }

    // 2. Heal
    const estHit = estimateBiggestIncomingDamage(engine);
    const healNeeded = hpRatio < 0.35 || p.hp < estHit * 1.1 + 10;
    if (healNeeded && !p.silencedThisTurn) {
      if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost
          && p.maxHP - p.hp > 90) { engine.playerAbility('power_of_attorney'); return; }
      engine.playerAbility('coffee_break'); return;
    }

    // 3. Power Move at 100 momentum
    if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }

    if (engine.counterActive) { engine.playerAttack(ti); return; }

    const target = engine.enemies[ti];

    // 4. LOCKS: a clearable objection on an incoming move outranks raw damage —
    //    voiding the move takes the enemy's whole turn.
    //    `sim.ignoreLocks` is the BREAK-FIRST arm of the --trade A/B: the enemy
    //    still telegraphs objections and they still fizzle if something clears
    //    them, the policy just refuses to spend its one tagged hit on them.
    const lockTag = (p.silencedThisTurn || sim.ignoreLocks)
      ? null : openLockTag(engine, target, unlocked);
    if (lockTag) { engine.playerAbility(bestTaggedAbility(engine, unlocked, lockTag), ti); return; }

    // 5. Brace the haymakers we cannot void.
    const biggest = biggestIncomingPower(engine);
    if (!p.bracing && !wasBrace && biggest !== null
        && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.50))) {
      engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
      sim.justBraced = true;
      return;
    }

    // 6. Weakness ability vs Retaliate
    const ab = p.silencedThisTurn ? null : bestWeaknessAbility(engine, target, unlocked);
    const abEffective = ab ? PLAYER_ABILITIES[ab].power * 1.5 : 0;
    if (p.retaliateReady && abEffective < 30) {
      engine.playerRetaliate(rollRetaliateMultiplier() * sim.relic.retaliateDamage, ti); return;
    }

    // 7. AoE at 3+
    if (!p.silencedThisTurn && engine.aliveEnemies().length >= 3 && unlocked.has('cc_all')
        && p.mp >= PLAYER_ABILITIES.cc_all.cost) { engine.playerAbility('cc_all', ti); return; }

    // 8. Weakness ability (fills Composure)
    if (ab) { engine.playerAbility(ab, ti); return; }

    // 9. Coffee when dry
    if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }

    // 10. Desperate Gamble below 25%
    if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
    engine.playerAttack(ti);
  };

  act();

  // Loop In: a weakness hit armed the baton and an ally is on the bench.
  const cands = engine.getLoopInCandidates();
  if (cands.length > 0) engine.playerLoopIn(cands[0]);
}

// NAIVE — the pure damage race. Basic attack, every turn, forever. No heals,
// no items, no Brace, no tags, no Locks, no Composure. This is the floor of
// the skill curve and it is the policy the pre-Break damage tax was accused of
// quietly nerfing: it is maximally sensitive to player damage output and
// completely insensitive to any of the new agency.
export function naiveTurn(engine, sim, unlocked) {
  engine.telegraph();
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  engine.playerAttack(ti);
}

// CASUAL — the realistic median player: basic attacks plus the free starter
// heal when hurt, and Assert Dominance when the bar fills on its own. Still
// never touches Locks, Composure, Brace or Retaliate. Reported alongside NAIVE
// because sustain damps the damage-output signal a long way.
export function casualTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  if (hpRatio < 0.40 && !p.silencedThisTurn && p.mp >= PLAYER_ABILITIES.coffee_break.cost) {
    engine.playerAbility('coffee_break'); return;
  }
  if (sim.coffees > 0 && p.mp < PLAYER_ABILITIES.coffee_break.cost && hpRatio < 0.40) {
    sim.coffees--; engine.playerItem('coffee_large'); return;
  }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  engine.playerAttack(ti);
}

// ── Fight loop (mirrors CombatState._startRound / _processNextTurn) ─────
export function runFight(cfg, level, opts = {}) {
  const playerStats = buildPlayerStats(level, cfg.playerExtra || {});
  // Day-scoped stat boons (Firm Handshake / Deep Breath) land on player.stats
  // in the real game, so they are additive on top of the level build here too.
  if (cfg.atkBonus) playerStats.atk += cfg.atkBonus;
  if (cfg.defBonus) playerStats.def += cfg.defBonus;
  if (cfg.playerHpPct) playerStats.hp = Math.max(1, Math.round(playerStats.maxHP * cfg.playerHpPct));
  if (cfg.playerMpPct) playerStats.mp = Math.max(0, Math.round(playerStats.maxMP * cfg.playerMpPct));
  const unlocked = cfg.unlocked || unlockedAbilities(level);
  const party = cfg.party || [];
  const partyOverrides = cfg.partyOverrides || buildPartyOverrides(party, level);
  const ov = cfg.overrides || {};
  const engine = new CombatEngine(playerStats, cfg.primary, ov[cfg.primary] || {}, {
    enemyIds: cfg.enemyIds, partyIds: party, partyOverrides, enemyOverrides: ov,
    ngPlus: !!cfg.ngPlus, ngPlusCount: cfg.ngPlusCount || 0, overtime: !!cfg.overtime,
    stretch: cfg.stretch || [],
    // Performance Improvement Plan (src/data/review.js). Passed as a resistance
    // fraction so the harness never has to know about flags or localStorage.
    pipResist: cfg.pipResist || 0,
  });
  if (opts.onEngine) opts.onEngine(engine);
  const policy = opts.policy || competentTurn;
  const sim = {
    coffees: cfg.coffees ?? 2, justBraced: false, gambleRisk: cfg.gambleRisk,
    relic: cfg.relic || NO_RELIC,
  };
  let rounds = 0;
  let itemsUsed = 0;
  const origItem = engine.playerItem.bind(engine);
  engine.playerItem = (id) => { itemsUsed++; return origItem(id); };

  while (!engine.isOver && rounds < MAX_ROUNDS) {
    rounds++;
    const queue = [];
    engine.allies.forEach((a, i) => { if (a.hp > 0) queue.push({ kind: 'ally', index: i, spd: engine._getEffective(a).spd }); });
    engine.enemies.forEach((e, i) => { if (e.hp > 0) queue.push({ kind: 'enemy', index: i, spd: engine._getEffective(e).spd }); });
    queue.sort((x, y) => {
      if (y.spd !== x.spd) return y.spd - x.spd;
      if (x.kind !== y.kind) return x.kind === 'ally' ? -1 : 1;
      return 0;
    });

    for (const entry of queue) {
      if (engine.isOver) break;
      const ent = entry.kind === 'ally' ? engine.allies[entry.index] : engine.enemies[entry.index];
      if (!ent || ent.hp <= 0) continue;
      engine.processTurnStart(ent);
      if (engine.isOver) break;
      if (ent.hp <= 0) continue;
      if (entry.kind === 'ally') {
        if (ent.stunnedThisTurn) continue;
        if (entry.index === 0) policy(engine, sim, unlocked);
        else engine.allyTurn(entry.index);
      } else {
        engine.enemyTurn(entry.index);
      }
    }
  }

  return {
    win: engine.result === 'victory',
    timeout: !engine.isOver,
    rounds,
    itemsUsed,
    hpLeft: engine.player.hp,
    mpLeft: engine.player.mp,
    hpPct: engine.player.hp / engine.player.maxHP,
    mpPct: engine.player.mp / Math.max(1, engine.player.maxMP),
    xp: engine.getXPReward(),
    enemyHpPct: engine.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0)
      / Math.max(1, engine.enemies.reduce((s, e) => s + e.maxHP, 0)),
  };
}

export function enc(id) {
  const e = ENCOUNTERS[id] || {};
  return {
    primary: (e.enemyIds && e.enemyIds[0]) || e.enemyId || id,
    enemyIds: (e.enemyIds && [...e.enemyIds]) || [e.enemyId || id],
    party: e.partyIds ? [...e.partyIds] : [],
  };
}

export function batch(cfg, level, runs, opts = {}) {
  let wins = 0, rounds = 0, hp = 0, enemyHp = 0, timeouts = 0;
  for (let i = 0; i < runs; i++) {
    const r = runFight(cfg, level, opts);
    if (r.win) { wins++; rounds += r.rounds; hp += r.hpPct; }
    if (r.timeout) timeouts++;
    enemyHp += r.enemyHpPct;
  }
  return {
    runs,
    winRate: wins / runs,
    avgRounds: wins ? rounds / wins : 0,
    avgHpLeft: wins ? hp / wins : 0,
    avgEnemyHpLeft: enemyHp / runs,
    timeouts,
  };
}

const pct = (x) => (x * 100).toFixed(1) + '%';

// ── CLI ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out.opts[key] = next; i++; }
      else out.flags.add(key);
    }
  }
  return out;
}

const LADDER = [
  { id: 'karen', levels: [3, 4, 5] },
  { id: 'chad', levels: [5, 6] },
  { id: 'grandma', levels: [7, 8] },
  { id: 'restructuring_trio', levels: [7, 8] },
  { id: 'rachel_boss', levels: [8, 9] },
  { id: 'regional_director', levels: [10], party: ['janet', 'isaiah'] },
  { id: 'algorithm', levels: [10], party: ['janet', 'isaiah'] },
];

// ── The relic slot ──────────────────────────────────────────────────────
// Ergonomic Wrist Support: +40% Brace window, -20% Retaliate damage
// (src/data/cosmetics.js, report P1.6). A trade only pays if it is measured in
// both directions, so this A/Bs the COMPETENT policy — the only one that
// touches either verb — with and without it equipped.
function runRelicAB(runs) {
  const AIMS = [['steady', AIM_STEADY], ['shaky', AIM_SHAKY]];
  console.log(`
=== RELIC A/B — Ergonomic Wrist Support, COMPETENT policy, ${runs} runs/cell ===`);
  console.log('+40% Brace window, -20% Retaliate damage. Two aim models, because a');
  console.log('window-widening relic is worth different amounts to different hands.');
  for (const [aimName, aim] of AIMS) {
    const off = { braceWindow: 1, retaliateDamage: 1, aim };
    const on = { braceWindow: 1.4, retaliateDamage: 0.8, aim };
    const q = (r) => {
      const p = braceCdf(0.10 * r.braceWindow, aim);
      const g = braceCdf(0.35 * r.braceWindow, aim);
      return `perfect ${(p * 100).toFixed(0)}% / good ${((g - p) * 100).toFixed(0)}% / miss ${((1 - g) * 100).toFixed(0)}%`;
    };
    console.log(`
-- ${aimName} hands --   off: ${q(off)}   |   on: ${q(on)}`);
    console.log('encounter          lvl        off        on      delta   hp left off/on');
    for (const row of PIP_LADDER) {
      const base = enc(row.id);
      if (row.party) base.party = row.party;
      base.partyOverrides = buildPartyOverrides(base.party, row.level);
      const a = batch({ ...base, relic: off }, row.level, runs, { policy: competentTurn });
      const b = batch({ ...base, relic: on }, row.level, runs, { policy: competentTurn });
      const d = (b.winRate - a.winRate) * 100;
      console.log(
        `${row.id.padEnd(18)} ${String(row.level).padStart(2)}  ${pct(a.winRate).padStart(9)}` +
        `${pct(b.winRate).padStart(10)}  ${((d >= 0 ? '+' : '') + d.toFixed(1) + 'pp').padStart(8)}` +
        `   ${pct(a.avgHpLeft)} / ${pct(b.avgHpLeft)}`
      );
    }
  }
}

// ── The Performance Improvement Plan ladder ─────────────────────────────
// The 40-85% band mandate has two ends, and only the ceiling was ever
// defended. This is the floor: the CASUAL policy (basic attacks, the starter
// heal, Assert Dominance when the bar fills on its own — no Locks, no
// Composure, no Brace, no Retaliate) measured against the story bosses at the
// levels CLAUDE.md documents as intended, with the PIP's damage resistance
// dialled by recorded defeats. Hades' God Mode numbers: 20% floor,
// +2% per death, 80% cap.
// Both ends of every documented intent band: CLAUDE.md says Karen 3-4,
// Chad 5-6, Grandma 7-8, so the LOW rung of each is in the table too. It is the
// low rung that failed the mandate, and a table that only lists the high rung
// is the same omission in a different place.
const PIP_LADDER = [
  { id: 'karen', level: 3 },
  { id: 'karen', level: 4 },
  { id: 'chad', level: 5 },
  { id: 'chad', level: 6 },
  { id: 'grandma', level: 7 },
  { id: 'grandma', level: 8 },
  { id: 'restructuring_trio', level: 8 },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];

function pipResistFor(deaths) {
  return Math.min(0.80, 0.20 + 0.02 * Math.max(0, deaths));
}

function runPipLadder(runs, deathCounts) {
  console.log(`\n=== PIP LADDER — CASUAL policy, ${runs} runs/cell ===`);
  console.log('Band mandate: 40-85%. "off" is the PIP unfiled (the shipped default).');
  const header = ['off', ...deathCounts.map(d => `${d}d/${Math.round(pipResistFor(d) * 100)}%`)];
  console.log('encounter          lvl  ' + header.map(h => h.padStart(10)).join(''));
  for (const row of PIP_LADDER) {
    const cfg = enc(row.id);
    if (row.party) cfg.party = row.party;
    cfg.partyOverrides = buildPartyOverrides(cfg.party, row.level);
    const cells = [0, ...deathCounts.map(d => pipResistFor(d))].map((resist, i) => {
      const c = { ...cfg, pipResist: i === 0 ? 0 : resist };
      return pct(batch(c, row.level, runs, { policy: casualTurn }).winRate).padStart(10);
    });
    console.log(`${row.id.padEnd(18)} ${String(row.level).padStart(2)}  ` + cells.join(''));
  }
}

function runLadder(runs, policy, label) {
  console.log(`\n=== ENCOUNTER LADDER — ${label} policy, ${runs} runs/config ===`);
  console.log('encounter                lvl  party            win     rounds  hp left');
  for (const row of LADDER) {
    for (const lv of row.levels) {
      const cfg = enc(row.id);
      if (row.party) cfg.party = row.party;
      const r = batch(cfg, lv, runs, { policy });
      console.log(
        `${row.id.padEnd(24)} ${String(lv).padStart(2)}  ${(cfg.party.join('+') || '-').padEnd(16)} ` +
        `${pct(r.winRate).padStart(6)}  ${r.avgRounds.toFixed(1).padStart(6)}  ${pct(r.avgHpLeft).padStart(6)}`
      );
    }
  }
}

// A/B the pre-Break damage band. The report (P1.2) is explicit: the 0.9x
// pre-Break tax may only ship alongside a base-damage raise, or it is a flat
// nerf to everyone who does not engage with Break.
function runTaxAB(runs, encId, levels) {
  const saveTax = COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX;
  const saveComp = COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION;
  const saveBroken = COMBAT_DEPTH.BROKEN_DAMAGE_BONUS;
  const configs = [
    { label: 'pre-pass baseline (no band)', tax: 1.00, comp: 1.00 },
    { label: 'tax only  (0.90 / no comp)',  tax: 0.90, comp: 1.00 },
    { label: 'shipped   (0.90 x 1.13 comp)', tax: saveTax, comp: saveComp },
  ];
  const NAMES = new Map([[naiveTurn, 'NAIVE'], [casualTurn, 'CASUAL'], [competentTurn, 'COMPETENT']]);
  for (const policy of [naiveTurn, casualTurn, competentTurn]) {
    const pl = NAMES.get(policy);
    console.log(`\n=== PRE-BREAK BAND A/B — ${encId}, ${pl} policy, ${runs} runs/cell ===`);
    console.log('config                          ' + levels.map(l => `L${l}`.padStart(8)).join(''));
    for (const c of configs) {
      COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX = c.tax;
      COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION = c.comp;
      COMBAT_DEPTH.BROKEN_DAMAGE_BONUS = saveBroken;
      const cells = levels.map(lv => pct(batch(enc(encId), lv, runs, { policy }).winRate).padStart(8));
      console.log(c.label.padEnd(32) + cells.join(''));
    }
  }
  COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX = saveTax;
  COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION = saveComp;
  COMBAT_DEPTH.BROKEN_DAMAGE_BONUS = saveBroken;
}

// The decisive, noise-free version of the same question: what does one basic
// attack actually do to an enemy under each band config? Win rates through a
// full fight are confounded (momentum accrues per HIT, not per point of damage,
// so a slower fight buys extra Assert Dominances). Per-hit damage is not.
function runDps(samples, encId, level) {
  const saveTax = COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX;
  const saveComp = COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION;
  const configs = [
    { label: 'pre-pass baseline (no band)',  tax: 1.00, comp: 1.00 },
    { label: 'tax only  (0.90 / no comp)',   tax: 0.90, comp: 1.00 },
    { label: 'shipped   (0.90 x 1.13 comp)', tax: saveTax, comp: saveComp },
  ];
  console.log(`\n=== PER-HIT DAMAGE — basic attack, ${encId} @L${level}, ${samples} samples/cell ===`);
  console.log('config                            unbroken   vs base    BROKEN   vs base');
  let base = 0;
  for (const c of configs) {
    COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX = c.tax;
    COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION = c.comp;
    const stats = buildPlayerStats(level);
    let un = 0, br = 0;
    for (let i = 0; i < samples; i++) {
      const e = new CombatEngine(stats, encId);
      un += e.playerAttack(0).damage;
      const e2 = new CombatEngine(stats, encId);
      e2.enemies[0].brokenBonus = 2;
      br += e2.playerAttack(0).damage;
    }
    const u = un / samples, b = br / samples;
    if (!base) base = u;
    console.log(
      c.label.padEnd(32) + `${u.toFixed(2).padStart(9)} ${(u / base).toFixed(3).padStart(9)}` +
      `${b.toFixed(2).padStart(10)} ${(b / base).toFixed(3).padStart(9)}`
    );
  }
  COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX = saveTax;
  COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION = saveComp;
}

// The Denial tax ("Escalated to Committee"). Locks + Break both take an enemy
// turn away and give nothing back, and stacked they let a reading player win
// without being touched. This measures the thing the tax exists to price:
// how much HP the boss has left when it dies, with and without the seal.
function runDenialAB(runs, sealSweep) {
  const save = COMBAT_DEPTH.DENIAL_LIMIT;
  const saveSeal = COMBAT_DEPTH.SEALED_DAMAGE_BONUS;
  const rows = [
    { id: 'rachel_boss', level: 9, party: [] },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
    { id: 'grandma', level: 8, party: [] },
  ];
  // Two dials, reported together, because the seal is only a counterweight if
  // it costs something: DENIAL_LIMIT decides WHETHER the enemy gets a turn back
  // and SEALED_DAMAGE_BONUS decides what that turn is WORTH. `off` is the
  // no-denial-tax control; every other row is the tax on at the given premium.
  const seals = sealSweep && sealSweep.length ? sealSweep : [1.0, saveSeal];
  console.log(`\n=== DENIAL TAX A/B — ${runs} runs/cell, competent policy ===`);
  console.log('encounter      lvl   denial   sealed x   win     rounds   Andrew HP left');
  for (const row of rows) {
    const cells = [{ limit: 99, seal: 1.0 }, ...seals.map(s => ({ limit: save, seal: s }))];
    for (const cell of cells) {
      COMBAT_DEPTH.DENIAL_LIMIT = cell.limit;
      COMBAT_DEPTH.SEALED_DAMAGE_BONUS = cell.seal;
      const cfg = enc(row.id);
      if (row.party.length) cfg.party = row.party;
      const r = batch(cfg, row.level, runs, { policy: competentTurn });
      console.log(
        `${row.id.padEnd(14)} ${String(row.level).padStart(2)}   ` +
        `${(cell.limit === 99 ? 'off' : String(cell.limit)).padStart(6)}   ` +
        `${(cell.limit === 99 ? '-' : cell.seal.toFixed(2)).padStart(8)}   ` +
        `${pct(r.winRate).padStart(6)}  ${r.avgRounds.toFixed(1).padStart(6)}   ${pct(r.avgHpLeft).padStart(6)}`
      );
    }
  }
  COMBAT_DEPTH.DENIAL_LIMIT = save;
  COMBAT_DEPTH.SEALED_DAMAGE_BONUS = saveSeal;
}

// ── THE TRADE: Objections vs Composure ──────────────────────────────────
// A single-lock move deliberately never demands the tag the enemy is weak to
// (see CombatEngine._buildLocks). Andrew gets ONE tagged hit per turn, so
// clearing objections and filling the Composure bar are two budgets competing
// for the same swing. The design claim is that the trade is close to TOTAL, not
// marginal — which is a measurable claim, so measure it rather than assert it.
//
// Two policies, identical except for one line: LOCK-FIRST is the shipped
// competent policy; BREAK-FIRST removes step 4 (chase objections) so the
// weakness ability is always taken. Reported per fight:
//   breaks/fight   how many times the enemy's Composure was emptied
//   lock clear %   share of telegraphed objections that got struck through
function breakFirstTurn(engine, sim, unlocked) {
  sim.ignoreLocks = true;
  competentTurn(engine, sim, unlocked);
}

function instrumentTrade(engine) {
  const stats = { breaks: 0, locksSeen: 0, locksCleared: 0 };
  const realReduce = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => {
    const r = realReduce(t, amt);
    if (r.broke) stats.breaks++;
    return r;
  };
  const realEnemyTurn = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    stats.locksSeen += locks.length;
    stats.locksCleared += locks.filter(l => l.cleared).length;
    return realEnemyTurn(i);
  };
  return stats;
}

function runTradeAB(runs) {
  const rows = [
    { id: 'karen', level: 4, party: [] },
    { id: 'grandma', level: 8, party: [] },
    { id: 'rachel_boss', level: 9, party: [] },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== OBJECTIONS vs COMPOSURE — ${runs} runs/cell ===`);
  console.log('Two budgets, one tagged hit per turn. A total trade shows as an inverted pair.');
  console.log('encounter      lvl   policy        win     breaks/fight   lock clear %');
  for (const row of rows) {
    for (const [name, policy] of [['LOCK-FIRST', competentTurn], ['BREAK-FIRST', breakFirstTurn]]) {
      let wins = 0, breaks = 0, seen = 0, cleared = 0;
      const cfg = enc(row.id);
      if (row.party.length) cfg.party = row.party;
      for (let i = 0; i < runs; i++) {
        // batch() cannot carry the instrumentation, so inline the fight here.
        const probe = { stats: null };
        const r = runFight(cfg, row.level, {
          policy,
          onEngine: (e) => { probe.stats = instrumentTrade(e); },
        });
        if (r.win) wins++;
        if (probe.stats) {
          breaks += probe.stats.breaks;
          seen += probe.stats.locksSeen;
          cleared += probe.stats.locksCleared;
        }
      }
      console.log(
        `${row.id.padEnd(14)} ${String(row.level).padStart(2)}   ${name.padEnd(11)}   ` +
        `${pct(wins / runs).padStart(6)}   ${(breaks / runs).toFixed(2).padStart(12)}   ` +
        `${(seen ? pct(cleared / seen) : '-').padStart(12)}`
      );
    }
  }
}

// Lock coverage audit. The claim the lock floor rests on is "every enemy in
// the game has at least one locked move" — a claim that is either true or not,
// and is cheap to check. Run this before touching _lockCountFor's power bands.
function runLockAudit() {
  console.log('\n=== LOCK COVERAGE — enemies with no lockable move are invisible to the mechanic ===');
  console.log('enemy                      abilities  locked  tags demanded');
  let uncovered = 0;
  for (const id of Object.keys(ENEMY_STATS)) {
    const e = new CombatEngine(buildPlayerStats(8), id);
    const enemy = e.enemies[0];
    if (!enemy) continue;
    const abilities = enemy.abilities || [];
    const lockable = e._lockableSet(enemy);
    const tags = new Set();
    for (const aid of lockable) for (const l of e._buildLocks(enemy, aid)) tags.add(l.tag);
    if (lockable.size === 0) uncovered++;
    console.log(
      `${id.padEnd(26)} ${String(abilities.length).padStart(9)}  ${String(lockable.size).padStart(6)}  ` +
      `${[...tags].join(',') || '—'}${lockable.size === 0 ? '   <-- NO LOCKS' : ''}`
    );
  }
  console.log(`\n${uncovered} enemies carry no locked move.`);
}

// Desperate Gamble EV. Measured, not asserted: the menu must not have a row
// that strictly dominates (report P1.7 / G9).
function runGamble(samples) {
  console.log(`\n=== DESPERATE GAMBLE — measured EV over ${samples} samples/row ===`);
  const stats = buildPlayerStats(8);
  console.log('risk      mean dmg   x baseline  momentum banked on whiff');
  let baseline = 0;
  for (const risk of ['safe', 'risky', 'all_in']) {
    let total = 0, mom = 0;
    for (let i = 0; i < samples; i++) {
      const e = new CombatEngine({ ...stats, hp: Math.round(stats.maxHP * 0.2) }, 'karen');
      const r = e.playerDesperateGamble(risk, 0);
      total += r ? r.damage : 0;
      mom += r ? (r.consolationMomentum || 0) : 0;
    }
    const mean = total / samples;
    if (risk === 'safe') baseline = mean;
    console.log(
      `${risk.padEnd(9)} ${mean.toFixed(1).padStart(8)}  ${(mean / baseline).toFixed(3).padStart(10)}  ` +
      `${(mom / samples).toFixed(1).padStart(8)}`
    );
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  const runs = parseInt(opts.runs || '300', 10);
  if (flags.has('tax-ab')) {
    runDps(parseInt(opts.samples || '20000', 10), opts.enc || 'karen', parseInt(opts.dpsLevel || '7', 10));
    runTaxAB(runs, opts.enc || 'karen', (opts.levels || '6,7,8').split(',').map(Number));
  } else if (flags.has('dps')) {
    runDps(parseInt(opts.samples || '20000', 10), opts.enc || 'karen', parseInt(opts.dpsLevel || '7', 10));
  } else if (flags.has('denial-ab') || opts['denial-ab']) {
    runDenialAB(runs, (opts['denial-ab'] || '').split(',').filter(Boolean).map(Number));
  } else if (flags.has('trade')) {
    runTradeAB(runs);
  } else if (flags.has('lock-audit')) {
    runLockAudit();
  } else if (flags.has('gamble')) {
    runGamble(parseInt(opts.samples || '20000', 10));
  } else if (flags.has('relic')) {
    runRelicAB(runs);
  } else if (flags.has('pip') || opts.pip) {
    runPipLadder(runs, (opts.pip || '0,5,10,20,30').split(',').map(Number));
  } else if (opts.enc) {
    const cfg = enc(opts.enc);
    if (opts.party) cfg.party = opts.party.split(',');
    const policy = flags.has('naive') ? naiveTurn : flags.has('casual') ? casualTurn : competentTurn;
    for (const lv of (opts.levels || '5').split(',').map(Number)) {
      const r = batch(cfg, lv, runs, { policy });
      console.log(`${opts.enc} L${lv} party=[${cfg.party.join(',')}] win=${pct(r.winRate)} rounds=${r.avgRounds.toFixed(1)} hpLeft=${pct(r.avgHpLeft)}`);
    }
  } else {
    runLadder(runs, flags.has('naive') ? naiveTurn : flags.has('casual') ? casualTurn : competentTurn, flags.has('naive') ? 'NAIVE' : flags.has('casual') ? 'CASUAL' : 'COMPETENT');
  }
}
