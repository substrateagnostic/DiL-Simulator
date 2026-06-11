// s5-balance-sim.mjs — headless balance simulation for TRUST ISSUES combat.
// REPORT-ONLY tooling. Run from repo root:  node .claude/plans/s5-balance-sim.mjs
// Imports the real CombatEngine + data files; nothing in src/ is modified.

import { CombatEngine } from '../../src/combat/CombatEngine.js';
import {
  PLAYER_BASE_STATS, LEVEL_GROWTH, PLAYER_ABILITIES, ENEMY_STATS, ENEMY_ABILITIES, ITEMS,
} from '../../src/data/stats.js';
import { ALLY_STATS } from '../../src/data/allies.js';
import { ENCOUNTERS } from '../../src/data/encounters/index.js';

const RUNS_PER_CONFIG = 300;
const MAX_ROUNDS = 300;

// ── Player build ────────────────────────────────────────────────────────
function buildPlayerStats(level) {
  const lv = level - 1;
  const maxHP = PLAYER_BASE_STATS.maxHP + LEVEL_GROWTH.maxHP * lv;
  const maxMP = PLAYER_BASE_STATS.maxMP + LEVEL_GROWTH.maxMP * lv;
  return {
    maxHP, maxMP, hp: maxHP, mp: maxMP,
    atk: PLAYER_BASE_STATS.atk + LEVEL_GROWTH.atk * lv,
    def: PLAYER_BASE_STATS.def + LEVEL_GROWTH.def * lv,
    spd: PLAYER_BASE_STATS.spd + LEVEL_GROWTH.spd * lv,
    level, name: 'Andrew',
  };
}

// Upgrade-point spend order (1 point per level-up, tier prereqs respected):
// L2 cite_precedent(1), L3 due_diligence(1), L4 cc_all(1), L6 forensic_audit(2),
// L8 per_my_last_email(2), L10 whistleblower(2), L12 power_of_attorney(2).
// Side-quest abilities (notarized_strike, root_access) assumed earned by L9.
function unlockedAbilities(level) {
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
function buildPartyOverrides(partyIds, level) {
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
  // Focus fire: lowest current HP among alive; tie → highest atk
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
  // Largest telegraphed attack/summon power among alive enemies (null if none).
  // (In-game the hint only shows the type; this models a player who has learned the patterns.)
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
  // Rough damage estimate of the biggest telegraphed hit — what an experienced
  // player eyeballs when deciding "can I survive the next round without healing?"
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

function rollBraceQuality() {
  const r = Math.random();
  if (r < 0.15) return 'perfect';
  if (r < 0.85) return 'good';
  return 'miss';
}

function rollRetaliateMultiplier() {
  // Player picks the 4-key QTE (base 1.0×); 90% per-key accuracy.
  let correct = 0;
  for (let i = 0; i < 4; i++) if (Math.random() < 0.9) correct++;
  return 1.0 * (correct / 4);
}

function bestWeaknessAbility(engine, target, unlocked) {
  // attack_aoe abilities (cc_all) are valid single-target nukes too — engine hits all alive
  let best = null;
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (a.tag !== target.weakness) continue;
    if (engine.player.mp < a.cost) continue;
    if (!best) { best = id; continue; }
    const b = PLAYER_ABILITIES[best];
    if (a.power > b.power || (a.power === b.power && a.cost < b.cost)) best = id;
  }
  return best;
}

// ── One player (Andrew) turn ────────────────────────────────────────────
function playerTurn(engine, sim, unlocked) {
  // CombatState calls telegraph() for all enemies at the start of Andrew's turn
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced;
  sim.justBraced = false;

  // 1. Second Wind: HP < 40% with 50+ momentum
  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }

  // 2. Heal — below 35% HP, or when the telegraphed hit could near-kill us.
  //    Coffee Break (free starter heal, 50 HP); Power of Attorney when unlocked & worth it.
  const estHit = estimateBiggestIncomingDamage(engine);
  const healNeeded = hpRatio < 0.35 || p.hp < estHit * 1.1 + 10;
  if (healNeeded && !p.silencedThisTurn) {
    if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost
        && p.maxHP - p.hp > 90) { engine.playerAbility('power_of_attorney'); return; }
    engine.playerAbility('coffee_break'); return;
  }

  // 3. Power Move at 100 momentum
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }

  // Counter stance up → basic attack breaks it safely
  if (engine.counterActive) { engine.playerAttack(ti); return; }

  // 4. Brace when a genuinely big telegraphed hit is incoming:
  //    power >= 30 always, power >= 20 only when already hurt (<50% HP).
  //    Never brace twice in a row (anti-turtle: retaliate/attack between braces).
  const biggest = biggestIncomingPower(engine);
  if (!p.bracing && !wasBrace && biggest !== null
      && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.50))) {
    engine.playerBrace(rollBraceQuality());
    sim.justBraced = true;
    return;
  }

  // 5. Weakness-tagged ability vs Retaliate: retaliate (free, ~20 effective power)
  //    only when no strong weakness ability is affordable.
  const target = engine.enemies[ti];
  const ab = p.silencedThisTurn ? null : bestWeaknessAbility(engine, target, unlocked);
  const abEffective = ab ? PLAYER_ABILITIES[ab].power * 1.5 : 0;
  if (p.retaliateReady && abEffective < 30) { engine.playerRetaliate(rollRetaliateMultiplier(), ti); return; }

  // 6. Press Advantage when momentum >= cost (but bank momentum for Second Wind when hurt)
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost && hpRatio >= 0.55) { engine.playerPressAdvantage(ti); return; }

  // 6.5 AoE when 3+ enemies alive
  if (!p.silencedThisTurn && engine.aliveEnemies().length >= 3 && unlocked.has('cc_all')
      && p.mp >= PLAYER_ABILITIES.cc_all.cost) { engine.playerAbility('cc_all'); return; }

  // 7. Weakness-tagged ability (highest power affordable)
  if (ab) { engine.playerAbility(ab, ti); return; }

  // 8. Large Coffee (restore_mp 30 per ITEMS) when out of Coffee for abilities
  if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }

  // 9. Desperate Gamble (safe = guaranteed power-15 hit) below 25% HP, else basic attack
  if (hpRatio < 0.25) { engine.playerDesperateGamble('safe', ti); return; }
  engine.playerAttack(ti);
}

// ── Fight loop (mirrors CombatState._startRound / _processNextTurn) ─────
function runFight(cfg, level) {
  const playerStats = buildPlayerStats(level);
  const unlocked = unlockedAbilities(level);
  const party = cfg.party || [];
  const partyOverrides = buildPartyOverrides(party, level);
  const ov = cfg.overrides || {};
  const engine = new CombatEngine(playerStats, cfg.primary, ov[cfg.primary] || {}, {
    enemyIds: cfg.enemyIds, partyIds: party, partyOverrides, enemyOverrides: ov,
  });
  const sim = { coffees: 2, justBraced: false };
  let rounds = 0;

  while (!engine.isOver && rounds < MAX_ROUNDS) {
    rounds++;
    // Build SPD-sorted initiative queue: alive allies + enemies, allies first on tie
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
      if (ent.hp <= 0) continue; // died to DoT at turn start
      if (entry.kind === 'ally') {
        if (ent.stunnedThisTurn) continue; // stunned actors skip their turn
        if (entry.index === 0) playerTurn(engine, sim, unlocked);
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
    hpLeft: engine.player.hp,
    hpPct: engine.player.hp / engine.player.maxHP,
  };
}

// ── Config table ────────────────────────────────────────────────────────
function enc(id) {
  const e = ENCOUNTERS[id] || {};
  return {
    primary: (e.enemyIds && e.enemyIds[0]) || e.enemyId || id,
    enemyIds: (e.enemyIds && [...e.enemyIds]) || [e.enemyId || id],
    party: e.partyIds ? [...e.partyIds] : [],
  };
}

// ── Proposed balance deltas (validated via --validate; NEVER written to game files) ──
const PROPOSED_ENEMY_OVERRIDES = {
  compliance:             { maxHP: 310, atk: 10 },
  regional:               { maxHP: 350, atk: 11 },
  ross_boss:              { maxHP: 440, atk: 12 },
  chad:                   { maxHP: 300, atk: 8, spd: 13 },
  grandma:                { maxHP: 750, atk: 27, spd: 15 },
  brand_consultant:       { maxHP: 300, atk: 6 },
  restructuring_analyst:  { maxHP: 180, atk: 7 },
  corporate_lawyer:       { maxHP: 400, atk: 12 },
  rachel_boss:            { maxHP: 900, atk: 21 },
  chief_of_restructuring: { maxHP: 850, atk: 26 },
  regional_director:      { maxHP: 1150, atk: 24 },  // pair with boss silence-resist fix
  algorithm:              { maxHP: 1500, atk: 30 },  // pair with boss silence-resist fix
  networking_guy:         { maxHP: 550, atk: 18 },
};
// Enemy-ability tweaks (require stats.js edits — balance.json only covers player abilities)
const PROPOSED_ABILITY_PATCHES = {
  billable_assault:    { power: 22 },     // corporate_lawyer
  golden_parachute:    { healAmount: 35 },// regional
  form_27b_stroke_6:   { power: 28 },     // compliance
  trust_fund_tantrum:  { power: 24 },     // chad
  alpha_mode:          { buff: { atk: 4, spd: 4 } }, // chad phase 2
  rage_quit_attack:    { power: 28 },     // chad phase 3
};

// Mirror maxHP into hp — matches how stats.js applies balance.json overrides
function normalizeOverrides(map) {
  for (const o of Object.values(map)) {
    if (o.maxHP !== undefined && o.hp === undefined) o.hp = o.maxHP;
  }
  return map;
}
normalizeOverrides(PROPOSED_ENEMY_OVERRIDES);

// ── Tuning experiments (--tune): per-row override candidates ────────────
const TUNE_F_PATCH = { trust_fund_tantrum: { power: 24 }, alpha_mode: { buff: { atk: 4, spd: 4 } }, rage_quit_attack: { power: 28 } };
const TUNE_SIMS = [
  { id: 'chad', levels: [5, 6], label: 'F 300hp/8atk + soft abilities', overrides: { chad: { maxHP: 300, atk: 8, spd: 13 } }, abilityPatch: TUNE_F_PATCH },
  { id: 'chad', levels: [8], label: 'proposed stats @L8 (PME)', overrides: { chad: { maxHP: 320, atk: 10, spd: 13 } } },
  { id: 'restructuring_trio', levels: [7, 8], label: 'v2 deeper', overrides: {
    brand_consultant: { maxHP: 300, atk: 6 },
    restructuring_analyst: { maxHP: 180, atk: 7 },
    corporate_lawyer: { maxHP: 400, atk: 12 },
  } },
  { id: 'regional_director', levels: [10], party: ['janet', 'isaiah'], label: 'no-silence 1150/24', overrides: { regional_director: { maxHP: 1150, atk: 24 } } },
  { id: 'regional_director', levels: [10], party: ['janet', 'alex_it'], label: 'alex comp 1150/24', overrides: { regional_director: { maxHP: 1150, atk: 24 } } },
  { id: 'algorithm', levels: [10], party: ['janet', 'isaiah'], label: 'no-silence 1500/30', overrides: { algorithm: { maxHP: 1500, atk: 30 } } },
  { id: 'algorithm', levels: [10], party: ['janet', 'alex_it'], label: 'alex comp 1500/30', overrides: { algorithm: { maxHP: 1500, atk: 30 } } },
];

const VALIDATION_SIMS = [
  { id: 'karen', levels: [3, 4] },                       // control — unchanged
  { id: 'compliance', levels: [4] },
  { id: 'regional', levels: [4] },
  { id: 'ross_boss', levels: [4] },
  { id: 'chad', levels: [5, 6] },
  { id: 'grandma', levels: [7, 8] },
  { id: 'restructuring_trio', levels: [7, 8] },
  { id: 'brand_consultant', levels: [7] },               // regression: solo uses of trio enemies
  { id: 'restructuring_analyst', levels: [7] },
  { id: 'corporate_lawyer', levels: [8] },
  { id: 'corporate_lawyer', levels: [8], party: ['janet'], label: '+janet' },
  { id: 'chief_of_restructuring', levels: [8], party: ['janet'], label: '+janet' },
  { id: 'rachel_boss', levels: [8], },
  { id: 'rachel_boss', levels: [8, 9], party: ['janet'], label: '+janet' },
  { id: 'networking_guy', levels: [9] },
  { id: 'regional_director', levels: [10], party: ['janet', 'alex_it'], label: '+2 allies' },
  { id: 'algorithm', levels: [10, 12], party: ['janet', 'alex_it'], label: '+2 allies' },
  { id: 'algorithm', levels: [10], party: ['janet', 'isaiah'], label: '+janet+isaiah (no silence)' },
];

const SIMS = [
  { id: 'karen', levels: [3, 4] },
  { id: 'compliance', levels: [4] },
  { id: 'regional', levels: [4] },
  { id: 'ross_boss', levels: [4] },
  { id: 'chad', levels: [5, 6] },
  { id: 'grandma', levels: [7, 8] },
  { id: 'restructuring_trio', levels: [7, 8] },                                    // forced party: janet
  { id: 'corporate_lawyer', levels: [8] },
  { id: 'corporate_lawyer', levels: [8], party: ['janet'], label: '+janet' },
  { id: 'chief_of_restructuring', levels: [8] },
  { id: 'chief_of_restructuring', levels: [8], party: ['janet'], label: '+janet' },
  { id: 'rachel_boss', levels: [8, 9] },
  { id: 'rachel_boss', levels: [8, 9], party: ['janet'], label: '+janet' },
  { id: 'the_firm', levels: [9, 10], party: ['janet', 'alex_it'], label: '+janet+alex' },
  { id: 'the_firm', levels: [9, 10], party: [], label: 'solo' },
  { id: 'parking_enforcer', levels: [9] },
  { id: 'networking_guy', levels: [9] },
  { id: 'regional_director', levels: [10] },
  { id: 'regional_director', levels: [10], party: ['janet', 'alex_it'], label: '+2 allies' },
  { id: 'algorithm', levels: [10, 12] },
  { id: 'algorithm', levels: [10, 12], party: ['janet', 'alex_it'], label: '+2 allies' },
  { id: 'algorithm', levels: [10], party: ['janet', 'isaiah'], label: '+janet+isaiah (no silence)' },
];

function median(arr) {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── Trace mode: node s5-balance-sim.mjs --trace <encounterId> <level> [allyId,...] [ov]
if (process.argv[2] === '--trace') {
  const id = process.argv[3];
  const level = Number(process.argv[4]);
  const base = enc(id);
  if (process.argv[5] !== undefined) {
    base.party = (process.argv[5] && process.argv[5] !== '-') ? process.argv[5].split(',') : [];
  }
  if (process.argv[6] === 'ov') {
    base.overrides = PROPOSED_ENEMY_OVERRIDES;
    for (const [aid, patch] of Object.entries(PROPOSED_ABILITY_PATCHES)) {
      if (ENEMY_ABILITIES[aid]) Object.assign(ENEMY_ABILITIES[aid], patch);
    }
    console.log('(proposed overrides applied)');
  }
  traceFight(base, level);
  process.exit(0);
}

function traceFight(cfg, level) {
  const playerStats = buildPlayerStats(level);
  const unlocked = unlockedAbilities(level);
  const party = cfg.party || [];
  const ov = cfg.overrides || {};
  const engine = new CombatEngine(playerStats, cfg.primary, ov[cfg.primary] || {}, {
    enemyIds: cfg.enemyIds, partyIds: party, partyOverrides: buildPartyOverrides(party, level), enemyOverrides: ov,
  });
  const sim = { coffees: 2, justBraced: false };
  const fmt = () => `[A ${engine.player.hp}/${engine.player.maxHP}hp ${engine.player.mp}mp m${engine.player.momentum}] ` +
    engine.enemies.map(e => `[${e.enemyId} ${e.hp}/${e.maxHP}]`).join(' ');
  console.log(`TRACE ${cfg.enemyIds.join('+')} @ L${level} party=[${party.join(',')}]`);
  let rounds = 0;
  while (!engine.isOver && rounds < 60) {
    rounds++;
    console.log(`── round ${rounds} ${fmt()}`);
    const queue = [];
    engine.allies.forEach((a, i) => { if (a.hp > 0) queue.push({ kind: 'ally', index: i, spd: engine._getEffective(a).spd }); });
    engine.enemies.forEach((e, i) => { if (e.hp > 0) queue.push({ kind: 'enemy', index: i, spd: engine._getEffective(e).spd }); });
    queue.sort((x, y) => (y.spd - x.spd) || (x.kind === y.kind ? 0 : (x.kind === 'ally' ? -1 : 1)));
    for (const entry of queue) {
      if (engine.isOver) break;
      const ent = entry.kind === 'ally' ? engine.allies[entry.index] : engine.enemies[entry.index];
      if (!ent || ent.hp <= 0) continue;
      const fx = engine.processTurnStart(ent);
      for (const f of fx) if (f.type === 'dot') console.log(`   (dot) ${ent.name} takes ${f.damage}`);
      if (engine.isOver) break;
      if (ent.hp <= 0) continue;
      if (entry.kind === 'ally') {
        if (ent.stunnedThisTurn) { console.log(`   ${ent.name}: STUNNED`); continue; }
        if (entry.index === 0) {
          const before = { hp: engine.player.hp, mp: engine.player.mp };
          playerTurn(engine, sim, unlocked);
          console.log(`   Andrew acts (hp ${before.hp}->${engine.player.hp}, mp ${before.mp}->${engine.player.mp}, brace=${engine.player.bracing}, mom=${engine.player.momentum}) → ${engine.enemies.map(e => e.hp).join('/')}`);
        } else {
          const r = engine.allyTurn(entry.index);
          console.log(`   ${ent.name}: ${r?.abilityName || r?.type}`);
        }
      } else {
        const r = engine.enemyTurn(entry.index);
        console.log(`   ${ent.name}: ${r?.abilityName || r?.type}${r?.damage ? ` (${r.damage} dmg to ${r.targetAllyName}${r.braced ? ', BRACED' : ''})` : ''}`);
      }
    }
  }
  console.log(`RESULT: ${engine.result} after ${rounds} rounds ${fmt()}`);
}

// ── Main ────────────────────────────────────────────────────────────────
const validate = process.argv.includes('--validate');
const tune = process.argv.includes('--tune');
if (validate || tune) {
  for (const [id, patch] of Object.entries(PROPOSED_ABILITY_PATCHES)) {
    if (ENEMY_ABILITIES[id]) Object.assign(ENEMY_ABILITIES[id], patch); // runtime only
  }
  console.log(`${tune ? 'TUNE' : 'VALIDATION'} RUN — overrides applied (in-memory only)\n`);
}
const activeSims = tune ? TUNE_SIMS : (validate ? VALIDATION_SIMS : SIMS);

const rows = [];
for (const simCfg of activeSims) {
  const base = enc(simCfg.id);
  if (simCfg.party !== undefined) base.party = simCfg.party;
  if (tune) base.overrides = normalizeOverrides(simCfg.overrides || {});
  else if (validate) base.overrides = PROPOSED_ENEMY_OVERRIDES;
  // Per-row enemy-ability patches (tune mode): applied for this row, restored after
  let restoreAbilities = null;
  if (simCfg.abilityPatch) {
    const saved = {};
    for (const [aid, patch] of Object.entries(simCfg.abilityPatch)) {
      if (!ENEMY_ABILITIES[aid]) continue;
      saved[aid] = {};
      for (const k of Object.keys(patch)) saved[aid][k] = ENEMY_ABILITIES[aid][k];
      Object.assign(ENEMY_ABILITIES[aid], patch);
    }
    restoreAbilities = () => {
      for (const [aid, vals] of Object.entries(saved)) Object.assign(ENEMY_ABILITIES[aid], vals);
    };
  }
  for (const level of simCfg.levels) {
    const results = [];
    for (let i = 0; i < RUNS_PER_CONFIG; i++) results.push(runFight(base, level));
    const wins = results.filter(r => r.win);
    const timeouts = results.filter(r => r.timeout).length;
    const row = {
      encounter: simCfg.id + (simCfg.label ? ` (${simCfg.label})` : ''),
      level,
      winPct: (wins.length / results.length * 100),
      medRounds: median(results.map(r => r.rounds)),
      medRoundsWin: median(wins.map(r => r.rounds)),
      medHpLeft: median(wins.map(r => r.hpLeft)),
      medHpPct: median(wins.map(r => r.hpPct * 100)),
      timeouts,
    };
    rows.push(row);
    console.log(
      `${row.encounter.padEnd(36)} L${String(level).padEnd(3)} ` +
      `win ${row.winPct.toFixed(1).padStart(5)}%  ` +
      `medRounds(win) ${String(row.medRoundsWin ?? '-').padStart(4)}  ` +
      `medHP ${String(row.medHpLeft ?? '-').padStart(4)} (${(row.medHpPct ?? 0).toFixed(0)}%)` +
      (timeouts ? `  [${timeouts} timeouts]` : '')
    );
  }
  if (restoreAbilities) restoreAbilities();
}

console.log('\nJSON:');
console.log(JSON.stringify(rows, null, 1));
