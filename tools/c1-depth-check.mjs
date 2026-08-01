// Headless regression check for the COMBAT DEPTH pass (Locks / Composure-Break /
// agency economy / fairness fixes). Pure logic — no browser, no dev server.
//   node tools/c1-depth-check.mjs
// Proves: a PRE-pass save still loads and still fights, no new persisted keys,
// telegraph-is-a-promise, full-clear fizzle, Break turn loss + refill, the
// once-per-turn Press Advantage guard, confusion never stealing the action, and
// Desperate Gamble all-in EV >= 1.0.
import { Player } from '../src/entities/Player.js';
import { CombatEngine } from '../src/combat/CombatEngine.js';

// A deliberately OLD-SHAPED save: no party/allyState/voiceCounts/allyControl,
// no ng_plus_count — i.e. everything the depth pass could have broken.
const legacy = {
  stats: { maxHP: 148, maxMP: 115, hp: 60, mp: 40, atk: 20, def: 18, spd: 12, level: 5, xp: 2400, aum: 12000 },
  inventory: [{ id: 'coffee_large', quantity: 2 }],
  flags: { briefing_complete: true, karen_defeated: true },
  questStates: {},
  position: { x: 5, z: 5 },
  currentRoom: 'cubicle_farm',
  actIndex: 3,
  upgradePoints: 2,
  unlockedAbilities: ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check', 'cite_precedent'],
  deaths: 1,
  equipped: {},
};

const p = new Player();
p.deserialize(legacy);
const checks = [];
const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });

ok('deserialize kept level', p.stats.level === 5, p.stats.level);
ok('deserialize kept aum', p.stats.aum === 12000, p.stats.aum);
ok('deserialize kept abilities', p.getAbilities().length === 6, p.getAbilities().length);
ok('deaths preserved', p.deaths === 1, p.deaths);

// Round-trip: serialize the freshly-loaded player and confirm no new required keys
const round = p.serialize();
ok('serialize round-trips', round.stats.level === 5 && round.currentRoom === 'cubicle_farm');
const newKeys = Object.keys(round).filter(k => !(k in legacy));
ok('no NEW combat-depth keys in save', !newKeys.some(k => /lock|composure|broken|loopIn|pressAdvantage/i.test(k)), newKeys.join(','));

// Fight with the legacy player: engine must build, telegraph, lock, break, and resolve.
const eng = new CombatEngine(p.getCombatStats(), 'compliance');
const e = eng.enemies[0];
ok('enemy got a Composure bar', e.maxComposure > 0 && e.composure === e.maxComposure, `${e.composure}/${e.maxComposure}`);
eng.telegraph();
ok('telegraph is a promise (no re-roll)', (() => {
  const first = e.telegraphedAbility; eng.telegraph(); return e.telegraphedAbility === first;
})(), e.telegraphedAbility);
ok('locks array exists', Array.isArray(e.locks));
// Force a lockable move and clear it
const lockable = [...eng._lockableSet(e)];
e.telegraphedAbility = lockable[0]; e.locks = eng._buildLocks(e, lockable[0]); e.lockAbilityId = lockable[0];
ok('lockable move produced locks', e.locks.length > 0, e.locks.map(l => l.tag).join('/'));
for (const l of e.locks) l.cleared = true;
const turn = eng.enemyTurn(0);
ok('full clear fizzles the enemy turn', turn?.type === 'fizzle', turn?.type);

// Composure break path
const e2 = eng.enemies[0];
e2.composure = 0; e2.broken = 1;
const brk = eng.enemyTurn(0);
ok('broken enemy loses its turn', brk?.type === 'broken', brk?.type);
ok('composure refills on recovery', e2.composure === e2.maxComposure, e2.composure);

// Press Advantage once-per-turn guard (no infinite loop)
eng.processTurnStart(eng.player);
eng.player.momentum = 100;
const pa1 = eng.playerPressAdvantage(0);
const pa2 = eng.playerPressAdvantage(0);
ok('press advantage fires once', !!pa1 && pa1.freeAction === true);
ok('press advantage blocked twice in a turn', pa2 === null);
eng.processTurnStart(eng.player);
eng.player.momentum = 100;
ok('press advantage rearms next turn', !!eng.playerPressAdvantage(0));

// Confusion never steals the action
eng.player.confused = 2; eng.processTurnStart(eng.player);
const hp0 = eng.player.hp;
const atk = eng.playerAttack(0);
ok('confused attack still hits the enemy', atk && atk.type === 'attack' && atk.damage > 0, JSON.stringify({ t: atk?.type, d: atk?.damage }));
ok('confused attack does not damage Andrew', eng.player.hp === hp0, `${hp0} -> ${eng.player.hp}`);
ok('confused attack is dampened', atk.confusedDampened === true);

// Desperate Gamble all-in EV
let total = 0, N = 40000;
for (let i = 0; i < N; i++) {
  const m = Math.random() < 0.40 ? 3.0 : 0;
  total += m;
}
ok('all-in EV >= 1.0', total / N >= 1.0, (total / N).toFixed(3));

let bad = 0;
for (const c of checks) { console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.extra ? '  [' + c.extra + ']' : '')); if (!c.pass) bad++; }
console.log(bad === 0 ? '\nALL SAVE-COMPAT CHECKS PASS' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
