// _z-enemy-turns — what does an enemy actually DO with its turns?
//
// Report-only. Wraps engine.enemyTurn on the real CombatEngine through the
// combat-sim policy and buckets every enemy turn by outcome, plus the mean
// damage an enemy lands per ROUND. The playtest complaint is "GMA Henderson
// doesn't really do too much / Security Guard did not fight back", which is a
// claim about this distribution.
//
//   node tools/_z-enemy-turns.mjs [--runs=200] [--encs=grandma,regional,...]
import { runFight, enc, unlockedAbilities } from './combat-sim.mjs';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const RUNS = Number(arg('runs', '200'));

// encounter id : level the player is expected to meet it at
const LADDER = (arg('encs', '') ? arg('encs', '').split(',').map(s => {
  const [id, lv] = s.split('@');
  return { id, level: Number(lv || 6) };
}) : [
  { id: 'karen', level: 3 },
  { id: 'chad', level: 5 },
  { id: 'grandma', level: 7 },
  { id: 'compliance', level: 5 },
  { id: 'regional', level: 5 },
  { id: 'skip_boss', level: 5 },
  { id: 'security_guard', level: 6 },
  { id: 'hr_rep', level: 6 },
  { id: 'meredith_boss', level: 9 },
  { id: 'regional_director', level: 11 },
]);

const KINDS = ['attack', 'dot', 'heal', 'buff', 'debuff', 'stun', 'silence', 'confuse', 'counter', 'summon', 'repeat'];
const DENIED = ['broken', 'fizzle', 'silenced', 'blocked', 'null'];

const head = 'encounter          lv  win%  rnds |  turns/fight  acted%  denied%  |  broken  fizzle  silncd blockd  null | dmg/turn dmg/fight';
console.log(head);
console.log('-'.repeat(head.length));

for (const { id, level } of LADDER) {
  const cfg = enc(id);
  const tally = {};
  let turns = 0, damage = 0, wins = 0, rounds = 0, fights = 0;
  for (let i = 0; i < RUNS; i++) {
    fights++;
    const r = runFight(cfg, level, {
      onEngine: (engine) => {
        const orig = engine.enemyTurn.bind(engine);
        engine.enemyTurn = (idx) => {
          const res = orig(idx);
          turns++;
          const k = res ? (res.type || 'other') : 'null';
          tally[k] = (tally[k] || 0) + 1;
          if (res && res.damage) damage += res.damage;
          return res;
        };
      },
    });
    if (r.win) wins++;
    rounds += r.rounds;
  }
  const denied = DENIED.reduce((s, k) => s + (tally[k] || 0), 0);
  const acted = turns - denied;
  const p = (n) => ((n / Math.max(1, turns)) * 100).toFixed(1).padStart(6);
  console.log(
    `${id.padEnd(18)} ${String(level).padStart(2)} ${((wins / fights) * 100).toFixed(0).padStart(4)} `
    + `${(rounds / fights).toFixed(1).padStart(5)} | ${(turns / fights).toFixed(1).padStart(11)} `
    + `${p(acted)} ${p(denied)}  | `
    + `${String(tally.broken || 0).padStart(7)} ${String(tally.fizzle || 0).padStart(7)} `
    + `${String(tally.silenced || 0).padStart(7)} ${String(tally.blocked || 0).padStart(6)} ${String(tally.null || 0).padStart(5)} | `
    + `${(damage / Math.max(1, turns)).toFixed(1).padStart(8)} ${(damage / fights).toFixed(0).padStart(9)}`,
  );
  const others = Object.keys(tally).filter(k => !DENIED.includes(k) && !KINDS.includes(k));
  if (others.length) console.log('    other outcome types:', others.map(k => `${k}=${tally[k]}`).join(' '));
}
void unlockedAbilities;
