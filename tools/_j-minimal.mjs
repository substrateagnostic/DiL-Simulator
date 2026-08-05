// _j-minimal.mjs — THROWAWAY harness for the J-run CONSERVATIVE lane (D4).
//
// Question: is "spam the enemy weakness" actually dominant today, and can the
// SMALLEST possible specials-only rework (re-tag / re-cost / re-power the
// existing PLAYER_ABILITIES + one momentum reprice + ONE new ability) open two
// viable NON-WEAKNESS playstyles?
//
// Wraps tools/combat-sim.mjs — same engine, same data, same fight loop. The
// only things this file adds are:
//   (1) BUILDS   — an upgrade-point purchase order per lane, so each lane is
//                  measured with the abilities that lane would actually own
//                  at that level (points = level - 1, `requires` respected).
//   (2) LANES    — one parametric policy with the fundamentals held constant
//                  (heal / brace / retaliate / power move / loop in) and only
//                  the MAIN SWING selector swapped, so what is measured is the
//                  build, not the policy's cleverness.
//   (3) RIDERS   — the proposed engine riders, emulated read-only by wrapping
//                  engine methods. Nothing in src/ is touched.
//
//   node tools/_j-minimal.mjs --ab            # baseline vs proposed, all lanes
//   node tools/_j-minimal.mjs --builds        # baseline arm only
//   node tools/_j-minimal.mjs --proposed      # proposed arm only
//   node tools/_j-minimal.mjs --strict        # lanes that NEVER swing weakness
//   node tools/_j-minimal.mjs --pip           # CASUAL/PIP floor, both arms
//   node tools/_j-minimal.mjs --trade         # breaks + objections per lane
//   node tools/_j-minimal.mjs --ng            # NG+ carry-vs-fresh correctness
//   node tools/_j-minimal.mjs --dpr           # damage/MP/turn accounting
//   node tools/_j-minimal.mjs --runs 400

import {
  runFight, enc, competentTurn, casualTurn,
  buildPartyOverrides, rollBraceQuality, NO_RELIC,
} from './combat-sim.mjs';
import { PLAYER_ABILITIES, ENEMY_ABILITIES } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);

// ════════════════════════════════════════════════════════════════════════
// 1. THE PROPOSAL, AS DATA
// ════════════════════════════════════════════════════════════════════════
// Every row below is either an edit to an existing PLAYER_ABILITIES entry or
// the single new ability. `lockTags` and `debuffAmount`-on-an-attack are the
// two fields the engine does not read today; both are emulated in §3.

// Every piece is independently switchable so the conservative case can be
// argued piece by piece: anything that does not earn its cost gets cut.
//
//   D* = pure data (stats.js / balance.json). Free.
//   R* = engine rider. Each one is a scoring penalty and must pay for itself.
export const PIECES = {
  // ── D1 — unstack the legal ladder (pure data, one word + three numbers) ─
  d1: {
    label: 'D1 whistleblower legal→audit, 45→40 power, stripBuffs, requires forensic_audit',
    data: { whistleblower: { tag: 'audit', power: 40, stripBuffs: true, requires: 'forensic_audit' } },
  },
  // ── D2 — the legal workhorse becomes a workhorse (pure data) ───────────
  d2: {
    label: 'D2 cite_precedent 30→28 power, 25→22 MP',
    data: { cite_precedent: { power: 28, cost: 22 } },
  },
  // ── D3 — the pure debuff turn is worth taking (pure data) ──────────────
  d3: {
    label: 'D3 due_diligence def -5 → def -6 / spd -3',
    data: { due_diligence: { debuffAmount: { def: -6, spd: -3 } } },
  },
  // ── R1 + the new ability — LITIGATION's identity piece ─────────────────
  r1: {
    label: 'R1 lockTags[] + NEW Omnibus Motion (1 pt, 30 MP, 20 power, strikes 3 tags)',
    engine: 'lockTags',
    add: {
      omnibus_motion: {
        name: 'Omnibus Motion',
        description: 'One filing that objects to everything. Almost no force. Total coverage.',
        cost: 30, power: 20, type: 'attack', tag: 'legal',
        lockTags: ['legal', 'social', 'audit'],
        tier: 2, requires: 'cite_precedent', upgradePointCost: 1,
      },
    },
  },
  // ── R2 — ADVISORY's riders: a debuff arrives on the same swing ─────────
  r2: {
    label: 'R2 debuffAmount honoured on type:attack / attack_aoe + the two rider edits',
    engine: 'attackDebuff',
    data: {
      cc_all: { cost: 35, debuffAmount: { def: -4 }, debuffDuration: 2 },
      per_my_last_email: { power: 46, cost: 45, debuffAmount: { atk: -6 }, debuffDuration: 3 },
    },
  },
  // ── D4 — spread the riders off `social` (data; needs R2's engine) ─────
  // Without this every Advisory rider is social-tagged, so against a
  // SOCIAL-weak boss (Chad) a strict non-weakness build has no rider at all.
  d4: {
    label: 'D4 forensic_audit gains def -5 / 2 rider (audit-tagged), 40→36 power',
    data: { forensic_audit: { power: 36, debuffAmount: { def: -5 }, debuffDuration: 2 } },
  },
  // ── N1 — ADVISORY's early-game entry (needs R2 to matter) ─────────────
  n1: {
    label: 'N1 NEW Calendar Invite (1 pt, 14 MP, 18 power, social, def -4 / spd -3 for 3)',
    add: {
      calendar_invite: {
        name: 'Calendar Invite',
        description: 'A recurring meeting with no agenda. They will be slower about everything now.',
        cost: 14, power: 18, type: 'attack', tag: 'social',
        debuffAmount: { def: -4, spd: -3 }, debuffDuration: 3,
        tier: 1, requires: 'raise_concerns', upgradePointCost: 1,
      },
    },
  },
  // ── R3 — the momentum reprice ──────────────────────────────────────────
  r3: {
    label: 'R3 Press Advantage costs 15 less against an already-debuffed target (floor 15)',
    engine: 'paDiscount',
  },
  // ── R3b — R3, but Press Advantage's OWN debuff does not count ─────────
  // Without this, the first PA applies def -5 and every later PA is discounted
  // for free, which turns a lane reward into a global tempo buff.
  r3b: {
    label: 'R3b as R3, but the discount ignores the debuff Press Advantage itself applied',
    engine: 'paDiscountStrict',
  },
  // ── R4 — the exclusivity: Follow Through scales with debuff COUNT ──────
  r4: {
    label: 'R4 Follow Through 1.25 / 1.40 / 1.55 for 1 / 2 / 3+ distinct debuffs',
    engine: 'followThrough',
  },
};

// FINAL SET after leave-one-out (see --loo evidence in the design doc):
//   R1 (lockTags + Omnibus Motion) CUT — it measurably HARMS its own lane on
//      rachel_boss@8 (DENY 93.3% -> 83.3%, +10.7 rounds). The denial tax is
//      already the deny lane's ceiling; deepening denial walks into the seal.
//   R4 (Follow Through ladder)     CUT — worth +0.4pp on top of R2+R3, i.e.
//      inside sampling noise, for 5 call sites of engine change.
export const FULL = ['d1', 'd2', 'd3', 'd4', 'n1', 'r2', 'r3b'];
export const CUT_PIECES = ['r1', 'r3', 'r4'];

const TOUCHED = [...new Set(Object.values(PIECES).flatMap(p => Object.keys(p.data || {})))];
const ADDED = [...new Set(Object.values(PIECES).flatMap(p => Object.keys(p.add || {})))];

function snapshot(ids) {
  const out = {};
  for (const id of ids) out[id] = { ...PLAYER_ABILITIES[id] };
  return out;
}
const SNAP = snapshot(TOUCHED);

let ACTIVE = new Set();
export function applyPieces(keys) {
  ACTIVE = new Set(keys);
  for (const k of keys) {
    const p = PIECES[k]; if (!p) continue;
    for (const [id, patch] of Object.entries(p.data || {})) Object.assign(PLAYER_ABILITIES[id], patch);
    for (const [id, a] of Object.entries(p.add || {})) PLAYER_ABILITIES[id] = { ...a };
  }
}
export function clearPieces() {
  ACTIVE = new Set();
  for (const [id, v] of Object.entries(SNAP)) {
    for (const k of Object.keys(PLAYER_ABILITIES[id])) delete PLAYER_ABILITIES[id][k];
    Object.assign(PLAYER_ABILITIES[id], v);
  }
  for (const id of ADDED) delete PLAYER_ABILITIES[id];
}
export function engineOpts() {
  const on = (name) => [...ACTIVE].some(k => PIECES[k]?.engine === name);
  return {
    lockTags: on('lockTags'),
    attackDebuff: on('attackDebuff'),
    paDiscount: on('paDiscount'),
    paDiscountStrict: on('paDiscountStrict'),
    followThrough: on('followThrough'),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 2. BUILDS — upgrade points are the scarce resource, so spend them
// ════════════════════════════════════════════════════════════════════════
const STARTERS = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];
const QUEST_AT_9 = ['notarized_strike', 'root_access'];   // matches combat-sim's model

// Two spending habits, because a fixed greedy order silently penalises any
// build whose good node costs 2 points: `fill` buys whatever it can afford and
// moves on, `save` stops at the first thing it cannot afford yet. Both arms are
// measured under both habits and reported at the better of the two, so a
// purchase-order artefact can never masquerade as a design result.
function buyOrder(order, level, mode = 'fill') {
  const owned = new Set(STARTERS);
  let pts = Math.max(0, level - 1);
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const id of order) {
      const a = PLAYER_ABILITIES[id];
      if (!a || owned.has(id)) continue;
      if (a.requires && !owned.has(a.requires)) { if (mode === 'save') break; continue; }
      const c = a.upgradePointCost || 1;
      if (pts < c) { if (mode === 'save') break; continue; }
      pts -= c; owned.add(id); changed = true;
    }
    if (!changed) break;
  }
  if (level >= 9) for (const q of QUEST_AT_9) owned.add(q);
  return owned;
}

// Purchase orders. Each is "what a player committed to this identity buys
// first". They are deliberately NOT the same list reordered — a lane that
// cannot articulate a different shopping list is not a lane.
export const BUILD_ORDERS = {
  // The producer's named failure mode: buy the biggest tagged hit in every
  // damage type, look at COMPOSURE — LEGAL ONLY, press that button.
  spam:    ['cite_precedent', 'per_my_last_email', 'due_diligence', 'forensic_audit',
            'whistleblower', 'cc_all', 'fiduciary_shield', 'billable_hours', 'power_of_attorney'],
  // LITIGATION: cheap breadth, then the objection piece.
  deny:    ['cite_precedent', 'omnibus_motion', 'cc_all', 'due_diligence',
            'fiduciary_shield', 'billable_hours', 'forensic_audit', 'per_my_last_email',
            'whistleblower', 'power_of_attorney'],
  // ADVISORY: debuff uptime, then the buff, then the rider attacks.
  expose:  ['calendar_invite', 'due_diligence', 'forensic_audit', 'cc_all', 'cite_precedent',
            'per_my_last_email', 'billable_hours', 'fiduciary_shield', 'whistleblower',
            'power_of_attorney'],
  // The control: combat-sim's own documented spend order, roughly.
  control: ['cite_precedent', 'due_diligence', 'cc_all', 'forensic_audit',
            'per_my_last_email', 'whistleblower', 'fiduciary_shield', 'billable_hours',
            'power_of_attorney'],
};

// ════════════════════════════════════════════════════════════════════════
// 3. RIDERS — the proposed engine work, emulated read-only
// ════════════════════════════════════════════════════════════════════════
// R1  `lockTags: [...]`   an attack strikes one chip of EACH listed tag.
// R2  `debuffAmount` on a `type:'attack'` / `'attack_aoe'` applies AFTER the
//     damage (so it can never combo with its own hit).
// R3  Press Advantage costs 15 less against a target that already carries a
//     debuff (floor 15). One function, `getPressAdvantageCost`.
/** Distinct debuff entries on an enemy — the value R4 reads. */
function debuffCount(e) {
  return (e.buffs || []).filter(b => Object.values(b.stats).some(v => v < 0)).length;
}
/** R4's ladder. 1 debuff = today's shipped 1.25, so R4 is a pure add-on. */
export function followThroughMult(n) {
  if (n >= 3) return 1.55;
  if (n === 2) return 1.40;
  if (n === 1) return 1.25;
  return 1;
}

export function installRiders(engine, opts) {
  const o = opts || {};
  const realAb = engine.playerAbility.bind(engine);
  const realAtk = engine.playerAttack.bind(engine);
  const realPA = engine.playerPressAdvantage.bind(engine);

  // R4 is applied post-hoc: the engine already multiplied by 1.25 when
  // `combo` is true, so the top-up is (newMult / 1.25 - 1) x the reported
  // damage. Andrew's actions only — ALLY hits are NOT topped up here, which
  // makes every R4 number below a FLOOR for the real implementation.
  const topUp = (r, pre) => {
    if (!o.followThrough || !r) return r;
    const apply = (dmg, tIdx, hadCombo) => {
      if (!hadCombo || !dmg) return;
      const n = pre[tIdx] ?? 0;
      const m = followThroughMult(n);
      if (m <= 1.25) return;
      const extra = Math.floor(dmg * (m / 1.25)) - dmg;
      if (extra <= 0) return;
      const t = engine.enemies[tIdx];
      if (!t || t.hp <= 0) return;
      t.hp = Math.max(0, t.hp - extra);
    };
    if (Array.isArray(r.hits)) for (const h of r.hits) apply(h.damage, h.targetIndex, h.combo);
    else apply(r.damage, r.targetIndex ?? engine.targetEnemyIndex, r.combo);
    engine._checkVictory();
    return r;
  };
  const preCounts = () => engine.enemies.map(debuffCount);

  engine.playerAbility = (id, ti) => {
    const a = PLAYER_ABILITIES[id];
    const pre = preCounts();
    const r = realAb(id, ti);
    if (!r || !a) return r;
    topUp(r, pre);
    const idx = r.targetIndex ?? engine.targetEnemyIndex;
    const target = engine.enemies[idx];
    // R1 — one chip per extra tag, same rule as the primary tag.
    if (o.lockTags && Array.isArray(a.lockTags) && target && target.hp > 0) {
      for (const tg of a.lockTags) {
        if (tg === a.tag) continue;
        r.locksCleared = (r.locksCleared || 0) + engine._clearLocks(target, tg);
      }
    }
    // R2 — the rider lands AFTER the damage, so it never combos with its own hit.
    if (o.attackDebuff && a.debuffAmount && a.type === 'attack' && target && target.hp > 0) {
      target.buffs.push({ stats: a.debuffAmount, duration: a.debuffDuration ?? 2, name: a.name });
    }
    if (o.attackDebuff && a.debuffAmount && a.type === 'attack_aoe') {
      for (const t of engine.aliveEnemies()) {
        t.buffs.push({ stats: a.debuffAmount, duration: a.debuffDuration ?? 2, name: a.name });
      }
    }
    return r;
  };
  engine.playerAttack = (ti) => { const pre = preCounts(); return topUp(realAtk(ti), pre); };
  engine.playerPressAdvantage = (ti) => { const pre = preCounts(); return topUp(realPA(ti), pre); };

  // R3 / R3b
  if (o.paDiscount || o.paDiscountStrict) {
    const strict = !!o.paDiscountStrict;
    const realCost = engine.getPressAdvantageCost.bind(engine);
    engine.getPressAdvantageCost = () => {
      const base = realCost();
      const t = engine.enemies[engine.targetEnemyIndex];
      if (!t || t.hp <= 0) return base;
      const has = (t.buffs || []).some(b =>
        (!strict || b.name !== 'Press Advantage') && Object.values(b.stats).some(v => v < 0));
      return has ? Math.max(15, base - 15) : base;
    };
  }
}

// ════════════════════════════════════════════════════════════════════════
// 4. INSTRUMENTS
// ════════════════════════════════════════════════════════════════════════
function instrument(engine) {
  const st = {
    breaks: 0, locksSeen: 0, locksCleared: 0, fizzles: 0, brokenTurns: 0,
    supers: 0, weaknessSwings: 0, offTagSwings: 0, actions: 0,
    presses: 0, powerMoves: 0, mpSpent: 0, damage: 0, comboHits: 0, hits: 0,
  };
  engine.__st = st;
  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => { const r = realRC(t, amt); if (r.broke) st.breaks++; return r; };
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    st.locksSeen += locks.length;
    st.locksCleared += locks.filter(l => l.cleared).length;
    const r = realET(i);
    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    return r;
  };
  const realPA = engine.playerPressAdvantage.bind(engine);
  engine.playerPressAdvantage = (...a) => { const r = realPA(...a); if (r) st.presses++; return r; };
  const realPM = engine.playerPowerMove.bind(engine);
  engine.playerPowerMove = (...a) => { const r = realPM(...a); if (r) st.powerMoves++; return r; };
  for (const m of ['playerAttack', 'playerAbility']) {
    const real = engine[m].bind(engine);
    engine[m] = (...args) => {
      const mp = engine.player.mp;
      const r = real(...args);
      if (r) {
        st.actions++;
        st.mpSpent += Math.max(0, mp - engine.player.mp);
        const sup = r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super');
        if (sup) st.supers++;
        if (typeof r.damage === 'number' && r.damage > 0) {
          st.damage += r.damage; st.hits++;
          if (r.combo || (r.hits || []).some(h => h.combo)) st.comboHits++;
          if (m === 'playerAbility') {
            const a = PLAYER_ABILITIES[args[0]];
            if (a && a.tag) { if (sup) st.weaknessSwings++; else st.offTagSwings++; }
          }
        }
      }
      return r;
    };
  }
  return st;
}

// ════════════════════════════════════════════════════════════════════════
// 5. LANES — one policy, one swapped selector
// ════════════════════════════════════════════════════════════════════════
function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity, bestAtk = -1;
  engine.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    if (e.hp < bestHp || (e.hp === bestHp && e.atk > bestAtk)) { best = i; bestHp = e.hp; bestAtk = e.atk; }
  });
  return best;
}
function attackIds(unlocked, mp, strict, target) {
  const out = [];
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (mp < a.cost) continue;
    if (strict && target && a.tag && a.tag === target.weakness) continue;   // strict lanes never swing weakness
    out.push(id);
  }
  return out;
}
function bestTagged(engine, unlocked, tag, strict, target) {
  let best = null;
  for (const id of attackIds(unlocked, engine.player.mp, strict, target)) {
    const a = PLAYER_ABILITIES[id];
    if (a.tag !== tag) continue;
    if (!best || a.power > PLAYER_ABILITIES[best].power) best = id;
  }
  return best;
}
/** Expected damage-ish score for a swing, honest about weakness/resist. */
function swingScore(engine, id, target) {
  const a = PLAYER_ABILITIES[id];
  let s = a.power;
  if (a.tag && target) {
    if (target.weakness === a.tag) s *= 1.5;
    else if (target.resistance === a.tag) s *= 0.7;
  }
  if (a.type === 'attack_aoe') s *= Math.max(1, engine.aliveEnemies().length) * 0.85;
  return s;
}
function bestDamage(engine, unlocked, target, strict) {
  let best = null, bs = -1;
  for (const id of attackIds(unlocked, engine.player.mp, strict, target)) {
    const s = swingScore(engine, id, target);
    if (s > bs) { bs = s; best = id; }
  }
  return best;
}
/** How many uncleared chips this ability would strike on the current telegraph. */
function chipsCleared(id, target) {
  if (!target || target.sealed || !Array.isArray(target.locks)) return 0;
  const a = PLAYER_ABILITIES[id];
  const tags = new Set([a.tag, ...(a.lockTags || [])].filter(Boolean));
  const open = target.locks.filter(l => !l.cleared);
  let n = 0;
  for (const t of tags) if (open.some(l => l.tag === t && !open.slice(0, n).length)) { /* counted below */ }
  // count at most one chip per distinct tag
  const seen = new Set();
  for (const l of open) {
    if (tags.has(l.tag) && !seen.has(l.tag)) { seen.add(l.tag); n++; }
  }
  return n;
}
function bestLockSwing(engine, unlocked, target, strict) {
  let best = null, bn = 0, bs = -1;
  for (const id of attackIds(unlocked, engine.player.mp, strict, target)) {
    const n = chipsCleared(id, target);
    if (n === 0) continue;
    const s = swingScore(engine, id, target);
    if (n > bn || (n === bn && s > bs)) { best = id; bn = n; bs = s; }
  }
  return best ? { id: best, chips: bn } : null;
}
function openChips(target) {
  if (!target || target.sealed || !Array.isArray(target.locks)) return 0;
  return target.locks.filter(l => !l.cleared).length;
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
function estimateBiggestIncoming(engine) {
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
function debuffSources(unlocked, mp) {
  const out = [];
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || !a.debuffAmount || mp < a.cost) continue;
    out.push(id);
  }
  return out;
}

/**
 * The lane policy. Fundamentals are identical across lanes; only the block
 * marked MAIN SWING differs. `strict` forbids ever swinging the weakness tag.
 */
export function lanePolicy(lane, strict = false) {
  return (engine, sim, unlocked) => {
    engine.telegraph();
    const p = engine.player;
    const ti = pickTargetIndex(engine);
    if (ti < 0) return;
    const target = engine.enemies[ti];
    const hpRatio = p.hp / p.maxHP;
    const wasBrace = sim.justBraced;
    sim.justBraced = false;

    // Press Advantage — free action, same rule for every lane.
    const paCost = engine.getPressAdvantageCost();
    if (p.momentum >= paCost && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
      engine.playerPressAdvantage(ti);
      if (engine.isOver) return;
    }

    const act = () => {
      if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }

      const estHit = estimateBiggestIncoming(engine);
      const healNeeded = hpRatio < 0.35 || p.hp < estHit * 1.1 + 10;
      if (healNeeded && !p.silencedThisTurn) {
        if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost
            && p.maxHP - p.hp > 90) { engine.playerAbility('power_of_attorney'); return; }
        engine.playerAbility('coffee_break'); return;
      }
      if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
      if (engine.counterActive) { engine.playerAttack(ti); return; }

      // ── MAIN SWING, part 1: denial outranks everything ────────────────
      // Voiding a telegraph takes the enemy's whole turn, so it outranks even
      // Brace. This is the shipped competentTurn ordering (step 4 before 5).
      if (!p.silencedThisTurn && (lane === 'deny' || lane === 'control')) {
        const ls = bestLockSwing(engine, unlocked, target, strict);
        // control = shipped policy: take any clearable chip.
        // deny    = same, but prefers the swing that voids the move outright.
        if (ls) { engine.playerAbility(ls.id, ti); return; }
      }

      // Brace the haymakers. A debuff can wait a turn; a haymaker cannot.
      const biggest = biggestIncomingPower(engine);
      if (!p.bracing && !wasBrace && biggest !== null
          && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.50))) {
        engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
        sim.justBraced = true;
        return;
      }

      // ── MAIN SWING, part 2: the expose lane's upkeep ──────────────────
      if (!p.silencedThisTurn && lane === 'expose' && !engine._enemyHasDebuff(target)) {
        const srcs = debuffSources(unlocked, p.mp);
        // Prefer a rider attack (damage AND the debuff) over a pure debuff turn.
        const rider = srcs.find(id => {
          const a = PLAYER_ABILITIES[id];
          return (a.type === 'attack' || a.type === 'attack_aoe') && !(strict && a.tag === target.weakness);
        });
        if (rider) { engine.playerAbility(rider, ti); return; }
        const pure = srcs.find(id => PLAYER_ABILITIES[id].type === 'debuff');
        if (pure) { engine.playerAbility(pure, ti); return; }
      }

      // Top up before the tank is dry — every lane, same rule.
      if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }

      const weak = p.silencedThisTurn ? null : bestTagged(engine, unlocked, target.weakness, strict, target);
      const raw = p.silencedThisTurn ? null : bestDamage(engine, unlocked, target, strict);
      const pick = (lane === 'spam') ? (weak || raw) : (raw || weak);
      const abEff = pick ? swingScore(engine, pick, target) : 0;
      if (p.retaliateReady && abEff < 30) {
        let correct = 0; for (let i = 0; i < 4; i++) if (Math.random() < 0.9) correct++;
        engine.playerRetaliate(correct / 4 * sim.relic.retaliateDamage, ti); return;
      }
      if (pick) { engine.playerAbility(pick, ti); return; }
      if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
      engine.playerAttack(ti);
    };

    act();
    const cands = engine.getLoopInCandidates();
    if (cands.length > 0) engine.playerLoopIn(cands[0]);
  };
}

// ════════════════════════════════════════════════════════════════════════
// 6. BATCH
// ════════════════════════════════════════════════════════════════════════
export const LADDER = [
  { id: 'karen', level: 3 },
  { id: 'karen', level: 4 },
  { id: 'chad', level: 5 },
  { id: 'chad', level: 6 },
  { id: 'grandma', level: 7 },
  { id: 'grandma', level: 8 },
  { id: 'restructuring_trio', level: 7, party: ['janet'] },
  { id: 'restructuring_trio', level: 8, party: ['janet'] },
  { id: 'rachel_boss', level: 8 },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];

function cfgFor(row, unlocked) {
  const c = enc(row.id);
  if (row.party) c.party = row.party;
  c.partyOverrides = buildPartyOverrides(c.party, row.level);
  if (unlocked) c.unlocked = unlocked;
  return c;
}

export function batchLane(row, laneKey, runs, opts = {}) {
  const a = batchLaneOne(row, laneKey, runs, opts, 'fill');
  const b = batchLaneOne(row, laneKey, runs, opts, 'save');
  return (b.win > a.win || (b.win === a.win && b.hpLeft > a.hpLeft)) ? b : a;
}

function batchLaneOne(row, laneKey, runs, { proposed = false, strict = false, policy = null, buildKey = null } = {}, mode = 'fill') {
  const bk = buildKey || laneKey;
  const unlocked = buyOrder(BUILD_ORDERS[bk] || BUILD_ORDERS.control, row.level, mode);
  const cfg = cfgFor(row, unlocked);
  const pol = policy || lanePolicy(laneKey, strict);
  const agg = {
    wins: 0, rounds: 0, hp: 0, timeouts: 0, breaks: 0, locksSeen: 0, locksCleared: 0,
    fizzles: 0, brokenTurns: 0, supers: 0, weak: 0, offTag: 0, presses: 0,
    powerMoves: 0, mpSpent: 0, damage: 0, comboHits: 0, hits: 0, actions: 0,
  };
  for (let i = 0; i < runs; i++) {
    let st = null;
    const r = runFight(cfg, row.level, {
      policy: pol,
      onEngine: (e) => { if (proposed) installRiders(e, engineOpts()); st = instrument(e); },
    });
    if (r.win) { agg.wins++; agg.rounds += r.rounds; agg.hp += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    if (st) {
      agg.breaks += st.breaks; agg.locksSeen += st.locksSeen; agg.locksCleared += st.locksCleared;
      agg.fizzles += st.fizzles; agg.brokenTurns += st.brokenTurns; agg.supers += st.supers;
      agg.weak += st.weaknessSwings; agg.offTag += st.offTagSwings; agg.presses += st.presses;
      agg.powerMoves += st.powerMoves; agg.mpSpent += st.mpSpent; agg.damage += st.damage;
      agg.comboHits += st.comboHits; agg.hits += st.hits; agg.actions += st.actions;
    }
  }
  const w = Math.max(1, agg.wins);
  return {
    win: agg.wins / runs,
    rounds: agg.rounds / w,
    hpLeft: agg.hp / w,
    breaks: agg.breaks / runs,
    lockClear: agg.locksSeen ? agg.locksCleared / agg.locksSeen : 0,
    fizzles: agg.fizzles / runs,
    brokenTurns: agg.brokenTurns / runs,
    supers: agg.supers / runs,
    weakShare: (agg.weak + agg.offTag) ? agg.weak / (agg.weak + agg.offTag) : 0,
    presses: agg.presses / runs,
    powerMoves: agg.powerMoves / runs,
    comboShare: agg.hits ? agg.comboHits / agg.hits : 0,
    dpr: agg.hits ? agg.damage / agg.hits : 0,
    effTurns: (agg.rounds / w) - (agg.fizzles / runs) - (agg.brokenTurns / runs),
    points: Math.max(0, row.level - 1),
    owned: [...unlocked].filter(id => !STARTERS.includes(id)).length,
    timeouts: agg.timeouts,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 7. REPORTS
// ════════════════════════════════════════════════════════════════════════
const LANES = ['spam', 'deny', 'expose', 'control'];

// A lane COUNTS as viable on a rung when it wins within 5pp of the best lane
// AND finishes within 12pp of the best lane's HP-left. Win rate alone saturates
// at 100% on 5 of 12 rungs, so it cannot be the headline on its own.
function viable(r, bestWin, bestHp) {
  return (r.win >= bestWin - 0.05) && (r.hpLeft >= bestHp - 0.12);
}

function laneTable(runs, proposed, strict, title) {
  console.log(`\n=== ${title} — ${runs} runs/cell ===`);
  console.log('cells are  win% / rounds / HP-left.  A lane is VIABLE on a rung when it is within');
  console.log('5pp of the best win rate AND within 12pp of the best HP-left. "viable" counts lanes');
  console.log('other than SPAM that clear that bar. "SPAM best" = weakness spam alone tops the rung.');
  console.log(
    'encounter'.padEnd(19) + 'lvl'.padStart(4) +
    LANES.map(l => l.toUpperCase().padStart(21)).join('') + '  viable');
  const rows = [];
  let viableTotal = 0, spamBest = 0;
  for (const row of LADDER) {
    const res = {};
    for (const l of LANES) res[l] = batchLane(row, l, runs, { proposed, strict });
    const bestWin = Math.max(...LANES.map(l => res[l].win));
    const bestHp = Math.max(...LANES.map(l => res[l].hpLeft));
    const alt = LANES.filter(l => l !== 'spam' && l !== 'control' && viable(res[l], bestWin, bestHp));
    const spamOnly = viable(res.spam, bestWin, bestHp) && alt.length === 0;
    if (spamOnly) spamBest++;
    viableTotal += alt.length;
    rows.push({ row, res, alt });
    console.log(
      row.id.padEnd(19) + String(row.level).padStart(4) +
      LANES.map(l => `${pct(res[l].win)}/${n2(res[l].rounds)}/${pct(res[l].hpLeft)}`.padStart(21)).join('') +
      '  ' + (alt.length ? alt.join(',') : '—'));
  }
  console.log(`\nalt-lane viability: ${viableTotal}/${LADDER.length * 2} lane-rungs · SPAM-only rungs: ${spamBest}/${LADDER.length}`);
  return rows;
}

function detailTable(runs, proposed, title) {
  console.log(`\n=== ${title} — detail, ${runs} runs/cell ===`);
  console.log(
    'encounter'.padEnd(18) + 'lvl'.padStart(4) + 'lane'.padStart(9) + 'win'.padStart(8) +
    'rounds'.padStart(8) + 'HPleft'.padStart(8) + 'effTurn'.padStart(9) + 'brk/f'.padStart(7) +
    'lockClr'.padStart(9) + 'fizz'.padStart(7) + 'weak%'.padStart(7) + 'combo%'.padStart(8) +
    'PA/f'.padStart(7) + 'pts'.padStart(5) + 'own'.padStart(5));
  for (const row of LADDER) {
    for (const l of LANES) {
      const r = batchLane(row, l, runs, { proposed });
      console.log(
        row.id.padEnd(18) + String(row.level).padStart(4) + l.padStart(9) +
        pct(r.win).padStart(8) + n2(r.rounds).padStart(8) + pct(r.hpLeft).padStart(8) +
        n2(r.effTurns).padStart(9) + n2(r.breaks).padStart(7) + pct(r.lockClear).padStart(9) +
        n2(r.fizzles).padStart(7) + pct(r.weakShare).padStart(7) + pct(r.comboShare).padStart(8) +
        n2(r.presses).padStart(7) + String(r.points).padStart(5) + String(r.owned).padStart(5));
    }
  }
}

function pipTable(runs) {
  const PIP = [0, 0.10, 0.20];
  console.log(`\n=== CASUAL / PIP FLOOR — ${runs} runs/cell ===`);
  console.log('CASUAL never casts a tagged ability, so no data edit in this proposal is reachable for it.');
  console.log('encounter'.padEnd(20) + 'lvl'.padStart(4) +
    PIP.map(p => (`base@${p * 100}%`).padStart(12)).join('') +
    PIP.map(p => (`prop@${p * 100}%`).padStart(12)).join(''));
  for (const row of LADDER) {
    const base = [], prop = [];
    for (const pipResist of PIP) {
      for (const arm of ['base', 'prop']) {
        if (arm === 'prop') applyPieces(PIECESET);
        const unlocked = buyOrder(BUILD_ORDERS.control, row.level);
        const cfg = cfgFor(row, unlocked);
        cfg.pipResist = pipResist;
        let wins = 0;
        for (let i = 0; i < runs; i++) {
          const r = runFight(cfg, row.level, {
            policy: casualTurn,
            onEngine: (e) => { if (arm === 'prop') installRiders(e, engineOpts()); },
          });
          if (r.win) wins++;
        }
        if (arm === 'prop') clearPieces();
        (arm === 'base' ? base : prop).push(wins / runs);
      }
    }
    console.log(row.id.padEnd(20) + String(row.level).padStart(4) +
      base.map(x => pct(x).padStart(12)).join('') + prop.map(x => pct(x).padStart(12)).join(''));
  }
}

function tradeTable(runs) {
  console.log(`\n=== THE TRADE — breaks/fight vs objections cleared, per lane ===`);
  console.log('Run C law: these two must not BOTH rise. A lane may specialise in one.');
  console.log('encounter'.padEnd(18) + 'lvl'.padStart(4) + 'arm'.padStart(6) + 'lane'.padStart(9) +
    'brk/f'.padStart(8) + 'lockClr'.padStart(9) + 'effTurn'.padStart(9) + 'win'.padStart(8));
  for (const row of LADDER.filter(r => ['karen', 'grandma', 'rachel_boss', 'algorithm'].includes(r.id))) {
    for (const arm of ['base', 'prop']) {
      if (arm === 'prop') applyPieces(PIECESET);
      for (const l of LANES) {
        const r = batchLane(row, l, runs, { proposed: arm === 'prop' });
        console.log(row.id.padEnd(18) + String(row.level).padStart(4) + arm.padStart(6) + l.padStart(9) +
          n2(r.breaks).padStart(8) + pct(r.lockClear).padStart(9) + n2(r.effTurns).padStart(9) + pct(r.win).padStart(8));
      }
      if (arm === 'prop') clearPieces();
    }
  }
}

function ngTable(runs) {
  console.log(`\n=== NEW GAME+ — CARRY@NG+1 must not be easier than FRESH@NG ===`);
  console.log('encounter'.padEnd(18) + 'lvl'.padStart(4) + 'arm'.padStart(6) + 'lane'.padStart(9) +
    'FRESH@NG win/rnd'.padStart(20) + 'CARRY@NG+1 win/rnd'.padStart(22) + 'CARRY@NG+3 win'.padStart(17));
  const CARRY = new Set([...STARTERS, ...Object.keys(PLAYER_ABILITIES)]);
  for (const row of [{ id: 'karen', level: 4 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 }]) {
    for (const arm of ['base', 'prop']) {
      if (arm === 'prop') applyPieces(PIECESET);
      for (const l of ['spam', 'deny', 'expose']) {
        const mk = (unlocked, lap) => {
          const c = cfgFor(row, unlocked);
          c.ngPlus = lap > 0; c.ngPlusCount = lap;
          let wins = 0, rounds = 0;
          for (let i = 0; i < runs; i++) {
            const r = runFight(c, row.level, {
              policy: lanePolicy(l), onEngine: (e) => { if (arm === 'prop') installRiders(e, engineOpts()); },
            });
            if (r.win) { wins++; rounds += r.rounds; }
          }
          return { win: wins / runs, rounds: rounds / Math.max(1, wins) };
        };
        const fresh = mk(buyOrder(BUILD_ORDERS[l], row.level), 1);
        const carry1 = mk(new Set(Object.keys(PLAYER_ABILITIES)), 1);
        const carry3 = mk(new Set(Object.keys(PLAYER_ABILITIES)), 3);
        console.log(row.id.padEnd(18) + String(row.level).padStart(4) + arm.padStart(6) + l.padStart(9) +
          `${pct(fresh.win)} / ${n2(fresh.rounds)}`.padStart(20) +
          `${pct(carry1.win)} / ${n2(carry1.rounds)}`.padStart(22) +
          pct(carry3.win).padStart(17));
      }
      if (arm === 'prop') clearPieces();
    }
  }
}

function strictTable(runs) {
  console.log(`\n=== STRICT NON-WEAKNESS — the lane NEVER swings the enemy's weak tag ===`);
  console.log('This is the honest test of "a viable non-weakness playstyle".');
  console.log('encounter'.padEnd(18) + 'lvl'.padStart(4) + 'arm'.padStart(6) +
    'SPAM(ref)'.padStart(11) + 'deny-strict'.padStart(13) + 'expose-strict'.padStart(15) +
    'best-strict Δ'.padStart(15));
  const SB = [], SP = [];
  for (const row of LADDER) {
    for (const arm of ['base', 'prop']) {
      if (arm === 'prop') applyPieces(PIECESET);
      const ref = batchLane(row, 'spam', runs, { proposed: arm === 'prop' });
      const d = batchLane(row, 'deny', runs, { proposed: arm === 'prop', strict: true });
      const e = batchLane(row, 'expose', runs, { proposed: arm === 'prop', strict: true });
      const best = Math.max(d.win, e.win);
      console.log(row.id.padEnd(18) + String(row.level).padStart(4) + arm.padStart(6) +
        pct(ref.win).padStart(11) + pct(d.win).padStart(13) + pct(e.win).padStart(15) +
        (((best - ref.win) >= 0 ? '+' : '') + ((best - ref.win) * 100).toFixed(1) + 'pp').padStart(15));
      if (arm === 'prop') clearPieces();
      (arm === 'base' ? SB : SP).push(best - ref.win);
    }
  }
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const ok = (a) => a.filter(x => x >= -0.03).length;
  console.log(`
mean best-strict Δ:  base ${(m(SB) * 100).toFixed(1)}pp   prop ${(m(SP) * 100).toFixed(1)}pp`);
  console.log(`rungs where a STRICT non-weakness lane is within 3pp of SPAM:  base ${ok(SB)}/${SB.length}   prop ${ok(SP)}/${SP.length}`);
}

function dprTable(runs) {
  console.log(`\n=== ACCOUNTING — where each lane's damage comes from ===`);
  console.log('encounter'.padEnd(18) + 'lvl'.padStart(4) + 'arm'.padStart(6) + 'lane'.padStart(9) +
    'dmg/hit'.padStart(9) + 'weak%'.padStart(8) + 'combo%'.padStart(8) + 'PA/f'.padStart(7) +
    'AD/f'.padStart(7) + 'supers'.padStart(8));
  for (const row of [{ id: 'karen', level: 4 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }]) {
    for (const arm of ['base', 'prop']) {
      if (arm === 'prop') applyPieces(PIECESET);
      for (const l of LANES) {
        const r = batchLane(row, l, runs, { proposed: arm === 'prop' });
        console.log(row.id.padEnd(18) + String(row.level).padStart(4) + arm.padStart(6) + l.padStart(9) +
          n2(r.dpr).padStart(9) + pct(r.weakShare).padStart(8) + pct(r.comboShare).padStart(8) +
          n2(r.presses).padStart(7) + n2(r.powerMoves).padStart(7) + n2(r.supers).padStart(8));
      }
      if (arm === 'prop') clearPieces();
    }
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2), next = argv[i + 1];
    if (next && !next.startsWith('--')) { out.opts[key] = next; i++; } else out.flags.add(key);
  }
  return out;
}
// ── ABLATION — every piece has to earn its own line ─────────────────────
// Reports, per cumulative piece set, the DENY and EXPOSE lanes' win / rounds /
// HP-left on the four discriminating rungs, plus SPAM as the reference. A
// piece that does not move its own lane gets cut from the design.
const ABL_ROWS = [
  { id: 'karen', level: 4 }, { id: 'chad', level: 5 },
  { id: 'grandma', level: 7 }, { id: 'rachel_boss', level: 8 },
  { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];
function ablationTable(runs, sets) {
  console.log(`\n=== ABLATION — ${runs} runs/cell ===`);
  console.log('Each row is one cumulative piece set. Cells: win% / rounds / HP-left.');
  for (const [label, keys] of sets) {
    if (keys.length) applyPieces(keys);
    const parts = [];
    for (const row of ABL_ROWS) {
      const d = batchLane(row, 'deny', runs, { proposed: keys.length > 0 });
      const e = batchLane(row, 'expose', runs, { proposed: keys.length > 0 });
      parts.push(`${row.id.slice(0, 6)}@${row.level} D ${pct(d.win)}/${n2(d.rounds)}/${pct(d.hpLeft)}  E ${pct(e.win)}/${n2(e.rounds)}/${pct(e.hpLeft)}`);
    }
    if (keys.length) clearPieces();
    console.log(`\n-- ${label}`);
    for (const p of parts) console.log('   ' + p);
  }
}
function pieceSoloTable(runs) {
  console.log(`\n=== PIECE-BY-PIECE, EACH ALONE vs BASELINE — ${runs} runs/cell ===`);
  console.log('Δ is (piece − baseline) on the named lane. HP-left in pp, rounds absolute.');
  const base = {};
  for (const row of ABL_ROWS) {
    base[row.id + row.level] = {
      deny: batchLane(row, 'deny', runs, {}), expose: batchLane(row, 'expose', runs, {}),
      spam: batchLane(row, 'spam', runs, {}),
    };
  }
  console.log('piece'.padEnd(6) + 'rung'.padEnd(16) +
    'DENY Δwin/Δrnd/ΔHP'.padStart(24) + 'EXPOSE Δwin/Δrnd/ΔHP'.padStart(26) + 'SPAM Δwin/ΔHP'.padStart(18));
  for (const k of [...FULL, ...CUT_PIECES]) {
    applyPieces([k]);
    for (const row of ABL_ROWS) {
      const b = base[row.id + row.level];
      const d = batchLane(row, 'deny', runs, { proposed: true });
      const e = batchLane(row, 'expose', runs, { proposed: true });
      const s = batchLane(row, 'spam', runs, { proposed: true });
      const f = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1);
      console.log(k.padEnd(6) + `${row.id.slice(0, 10)}@${row.level}`.padEnd(16) +
        `${f(d.win - b.deny.win)}/${(d.rounds - b.deny.rounds).toFixed(2)}/${f(d.hpLeft - b.deny.hpLeft)}`.padStart(24) +
        `${f(e.win - b.expose.win)}/${(e.rounds - b.expose.rounds).toFixed(2)}/${f(e.hpLeft - b.expose.hpLeft)}`.padStart(26) +
        `${f(s.win - b.spam.win)}/${f(s.hpLeft - b.spam.hpLeft)}`.padStart(18));
    }
    clearPieces();
  }
}

const args = parseArgs(process.argv.slice(2));
const RUNS = parseInt(args.opts.runs || '300', 10);
const F = args.flags;
const PIECESET = args.opts.pieces ? args.opts.pieces.split(',') : FULL;
const any = F.size > 0;

if (!any || F.has('builds') || F.has('ab')) {
  laneTable(RUNS, false, false, 'ARM A — SHIPPED DATA (baseline)');
}
if (!any || F.has('proposed') || F.has('ab')) {
  applyPieces(PIECESET);
  laneTable(RUNS, true, false, `ARM B — PROPOSED [${PIECESET.join(',')}]`);
  clearPieces();
}
if (F.has('ablate')) {
  ablationTable(RUNS, [
    ['baseline (shipped)', []],
    ['+D1 (retag whistleblower)', ['d1']],
    ['+D2 (cite_precedent reprice)', ['d1', 'd2']],
    ['+D3 (due_diligence deepened)', ['d1', 'd2', 'd3']],
    ['+N1 (Calendar Invite)', ['d1', 'd2', 'd3', 'n1']],
    ['+R2 (attack debuff riders)', ['d1', 'd2', 'd3', 'n1', 'r2']],
    ['+R3b (PA discount, strict) = FULL', FULL],
    ['variant: R3 (loose) instead of R3b', ['d1', 'd2', 'd3', 'n1', 'r2', 'r3']],
    ['FULL + R1 (cut: Omnibus)', [...FULL, 'r1']],
    ['FULL + R4 (cut: FT ladder)', [...FULL, 'r4']],
  ]);
}
if (F.has('solo')) pieceSoloTable(RUNS);
if (F.has('detail')) {
  detailTable(RUNS, false, 'ARM A — SHIPPED');
  applyPieces(PIECESET); detailTable(RUNS, true, 'ARM B — PROPOSED'); clearPieces();
}
if (F.has('strict')) strictTable(RUNS);
if (F.has('pip')) pipTable(RUNS);
if (F.has('trade')) tradeTable(RUNS);
if (F.has('ng')) ngTable(RUNS);
if (F.has('dpr')) dprTable(RUNS);
