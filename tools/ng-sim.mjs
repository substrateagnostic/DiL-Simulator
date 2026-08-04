// ng-sim.mjs — the New Game+ ladder harness.
//
// This is the evidence behind NG_PLUS_ENTRY / NG_PLUS_SCALING in
// src/combat/CombatEngine.js and behind the NG+ table in Gameplay.md.
//
//   node tools/ng-sim.mjs                    # the shipped ladder
//   node tools/ng-sim.mjs --runs 400
//   node tools/ng-sim.mjs --sweep 1.4,1.55,1.7,1.85    # entry-rung sweep on maxHP
//   node tools/ng-sim.mjs --lapdecay 0,0.35,0.6,1.0    # top-rung (NG+3) softening
//
// The question this answers is NOT "are NG+ enemies bigger" — that is a
// multiplication. It is the one the report (P4.1 / G3) actually poses: is the
// second lap HARDER than the first, given that New Game+ hands the player back
// every ability, every upgrade point and all their AUM?
//
// Two loadouts are therefore simulated at every rung:
//   FRESH   — the level's honest kit: abilities per the upgrade curve, no shop
//   CARRIED — what MenuState._startNewGamePlus actually gives you: every
//             ability unlocked from turn one, plus the permanent shop stat
//             upgrades rebought with the AUM that carried across
//             (3x Assertiveness Training, 3x Composure Workshop,
//              3x Mindfulness Retreat, 3x Efficiency Seminar — the maxStack
//              of each, ~6M AUM, which a post-game player has many times over)
//
// A ladder is correct when CARRIED at NG+1 is NOT easier than FRESH at NG.

import {
  buildPartyOverrides, unlockedAbilities, batch, enc, competentTurn,
} from './combat-sim.mjs';
import { PLAYER_ABILITIES } from '../src/data/stats.js';
import {
  NG_PLUS_ENTRY, NG_PLUS_SCALING, NG_PLUS_CAP, NG_PLUS_LAP, ngLapExponent,
} from '../src/combat/CombatEngine.js';

const pct = (x) => (x * 100).toFixed(1) + '%';

// Every ability the tree can hold — what NG+ actually carries.
const ALL_ABILITIES = new Set(Object.keys(PLAYER_ABILITIES));

// Maxed permanent shop upgrades (SHOP_ITEMS category 'upgrade', maxStack 3).
const MAXED_SHOP = { atk: 9, def: 9, maxHP: 60, spd: 6 };

const LADDER = [
  { id: 'karen',   level: 4 },
  { id: 'chad',    level: 6 },
  { id: 'grandma', level: 8 },
  { id: 'meredith_boss', level: 9 },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];

function cfgFor(row, carried, laps) {
  const cfg = enc(row.id);
  if (row.party) cfg.party = row.party;
  cfg.partyOverrides = buildPartyOverrides(cfg.party, row.level);
  if (carried) {
    cfg.unlocked = new Set(ALL_ABILITIES);
    cfg.atkBonus = MAXED_SHOP.atk;
    cfg.defBonus = MAXED_SHOP.def;
    cfg.playerExtra = {
      maxHP: undefined,   // filled below so hp tracks maxHP
    };
  } else {
    cfg.unlocked = unlockedAbilities(row.level);
  }
  if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
  return cfg;
}

// maxHP/spd have to be injected as absolute values, which means knowing the
// level build. buildPlayerStats is re-derived here rather than exported twice.
import { buildPlayerStats } from './combat-sim.mjs';
function withShopStats(cfg, level) {
  const base = buildPlayerStats(level);
  cfg.playerExtra = {
    maxHP: base.maxHP + MAXED_SHOP.maxHP,
    hp: base.maxHP + MAXED_SHOP.maxHP,
    spd: base.spd + MAXED_SHOP.spd,
  };
  return cfg;
}

function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out.opts[a.slice(2)] = next; i++; }
    else out.flags.add(a.slice(2));
  }
  return out;
}

const { flags, opts } = parseArgs(process.argv.slice(2));
const runs = parseInt(opts.runs || '300', 10);

function rung(key, laps) {
  if (laps <= 0) return 1;
  const l = Math.min(NG_PLUS_CAP, laps);
  return NG_PLUS_ENTRY[key] * Math.pow(NG_PLUS_SCALING[key], ngLapExponent(l));
}

if (opts.hpscale) {
  // Sweep NG_PLUS_SCALING.maxHP across laps 1-3. maxHP is the constant the two
  // finale rows are most sensitive to: they are damage races against a fixed
  // carried kit, so HP compounding is what turns the ladder into a cliff.
  const sweep = opts.hpscale.split(',').map(Number);
  const save = NG_PLUS_SCALING.maxHP;
  console.log(`\n=== PER-LAP maxHP SCALING SWEEP — carried loadout, ${runs} runs/cell ===`);
  console.log('encounter          lvl  scale     NG+1      NG+2      NG+3');
  for (const row of LADDER) {
    for (const s of sweep) {
      NG_PLUS_SCALING.maxHP = s;
      const cells = [1, 2, 3].map(laps => {
        const cfg = withShopStats(cfgFor(row, true, laps), row.level);
        return pct(batch(cfg, row.level, runs, { policy: competentTurn }).winRate).padStart(10);
      });
      console.log(`${row.id.padEnd(18)} ${String(row.level).padStart(2)}  ${s.toFixed(2)}` + cells.join(''));
    }
  }
  NG_PLUS_SCALING.maxHP = save;
} else if (opts.lapdecay) {
  // Sweep NG_PLUS_LAP.decay. Only the TOP rung moves — laps 1 and 2 have
  // exponents 0 and 1 at every decay value — so this table is the honest test
  // of "does the ladder end somewhere a human can stand".
  const sweep = opts.lapdecay.split(',').map(Number);
  const save = NG_PLUS_LAP.decay;
  console.log(`\n=== LAP-DECAY SWEEP — carried loadout at NG+3, ${runs} runs/cell ===`);
  console.log('encounter          lvl   ' + sweep.map(d => `d=${d.toFixed(2)}`.padStart(10)).join(''));
  for (const row of LADDER) {
    const cells = sweep.map(d => {
      NG_PLUS_LAP.decay = d;
      const cfg = withShopStats(cfgFor(row, true, 3), row.level);
      return pct(batch(cfg, row.level, runs, { policy: competentTurn }).winRate).padStart(10);
    });
    console.log(`${row.id.padEnd(18)} ${String(row.level).padStart(2)}   ` + cells.join(''));
  }
  NG_PLUS_LAP.decay = save;
  console.log('\nmaxHP multiplier at NG+3 per decay:');
  for (const d of sweep) {
    NG_PLUS_LAP.decay = d;
    console.log(`  d=${d.toFixed(2)}  maxHP x${rung('maxHP', 3).toFixed(2)}  atk x${rung('atk', 3).toFixed(2)}  def x${rung('def', 3).toFixed(2)}`);
  }
  NG_PLUS_LAP.decay = save;
} else if (opts.sweep) {
  const entries = opts.sweep.split(',').map(Number);
  const saveHP = NG_PLUS_ENTRY.maxHP;
  console.log(`\n=== ENTRY-RUNG SWEEP (maxHP) — carried loadout at NG+1, ${runs} runs/cell ===`);
  console.log('encounter          lvl   ' + entries.map(e => `x${e.toFixed(2)}`.padStart(9)).join(''));
  for (const row of LADDER) {
    const cells = entries.map(e => {
      NG_PLUS_ENTRY.maxHP = e;
      const cfg = withShopStats(cfgFor(row, true, 1), row.level);
      return pct(batch(cfg, row.level, runs, { policy: competentTurn }).winRate).padStart(9);
    });
    console.log(`${row.id.padEnd(18)} ${String(row.level).padStart(2)}   ` + cells.join(''));
  }
  NG_PLUS_ENTRY.maxHP = saveHP;
} else {
  console.log(`\n=== NG+ LADDER — ${runs} runs/cell, competent policy ===`);
  console.log('Entry rung  ' + JSON.stringify(NG_PLUS_ENTRY));
  console.log('Per-lap     ' + JSON.stringify(NG_PLUS_SCALING) + `  (cap ${NG_PLUS_CAP} laps, decay ${NG_PLUS_LAP.decay})`);
  console.log('\nEffective enemy multipliers:');
  console.log('lap    maxHP    atk    def     xp');
  for (let l = 0; l <= NG_PLUS_CAP; l++) {
    console.log(
      `${l === 0 ? 'NG ' : 'NG+' + l}  ` +
      `${rung('maxHP', l).toFixed(2).padStart(7)}  ${rung('atk', l).toFixed(2).padStart(5)}  ` +
      `${rung('def', l).toFixed(2).padStart(5)}  ${rung('xpReward', l).toFixed(2).padStart(5)}`
    );
  }

  console.log('\nWin rates — FRESH kit vs CARRIED kit (all abilities + maxed shop):');
  console.log('encounter          lvl   FRESH@NG   CARRY@NG  CARRY@NG+1  CARRY@NG+2  CARRY@NG+3');
  for (const row of LADDER) {
    const cells = [];
    cells.push(pct(batch(cfgFor(row, false, 0), row.level, runs, { policy: competentTurn }).winRate).padStart(9));
    for (const laps of [0, 1, 2, 3]) {
      const cfg = withShopStats(cfgFor(row, true, laps), row.level);
      cells.push(pct(batch(cfg, row.level, runs, { policy: competentTurn }).winRate).padStart(laps === 0 ? 10 : 12));
    }
    console.log(`${row.id.padEnd(18)} ${String(row.level).padStart(2)}   ` + cells.join(''));
  }
  console.log('\nLadder is correct when CARRY@NG+1 <= FRESH@NG (a second lap must not be easier).');
}
