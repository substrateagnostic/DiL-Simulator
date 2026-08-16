// _l-apply.mjs — apply / revert the balance proposal (P8) as a whole.
//
// The proposal is DARK: nothing in `src/` carries it at rest. This script is
// the only thing that writes it, it is idempotent in both directions, and it
// is what generates `.claude/plans/l-run/PROPOSAL.diff`:
//
//   node tools/_l-apply.mjs --on          # write P8 into the tree
//   git --no-pager diff > .claude/plans/l-run/PROPOSAL.diff
//   node tools/_l-apply.mjs --off         # put the tree back
//   node tools/_l-apply.mjs --check       # report which state the tree is in
//
// It is also the A/B rig for `tools/_l-fight-ab.mjs`: apply, shoot, revert,
// shoot. Every number in `BALANCE-PROPOSAL.md` was measured through
// `tools/_l-balance.mjs --cand P8`, which applies the SAME four component
// definitions to the SAME live objects — so the capture and the table cannot
// describe different builds.
import { readFileSync, writeFileSync } from 'fs';

const ON = process.argv.includes('--on');
const OFF = process.argv.includes('--off');
const CHECK = process.argv.includes('--check') || (!ON && !OFF);

const BAL = 'src/data/balance.json';
const AI = 'src/combat/EnemyAI.js';
const ENG = 'src/combat/CombatEngine.js';

// ── THE PROPOSAL, as four named components ──────────────────────────────
// It is `tools/_l-balance.mjs --cand P8`. A fifth component, B2 (two-tag
// haymakers), was measured, worked, and was CUT: it bought ~5pp of HP-left on
// Grandma and cost ~11pp of monotony there, because a haymaker demanding two
// tags is unclearable by a solo Andrew, so the policy stops spending tagged
// hits on Objections and just presses the printed weakness. That is the number
// the J-run's Pivot exists to lower.
//
// C1 (B24)  player.maxMP 75 -> 60
const MP_ON = 60, MP_OFF = 75;
const LOCK2_CLEANUP = ['guilt_trip', 'hostile_takeover', 'market_correction',
  'rage_quit_attack', 'algorithmic_trading'];   // B2, CUT — see above. Listed
  // only so `--off` still removes an older application rather than stranding it.
// E3  THE ESCALATION RESPONSE. Every enemy that already HAS an AI pattern row
//     gets it, MINUS two exemptions; the four enemies with no row
//     (chief_of_restructuring, data_analytics_lead, reception_client,
//     networking_guy) deliberately do NOT, because that is exactly the set the
//     sim measured. `reception_client` being outside it is why the roguelite
//     loop is untouched by this component.
//     EXEMPT: `intern` (scripted tutorial, 4-power jabs, in no measured cell)
//     and `algorithm` — the only encounter where the CASUAL policy denies an
//     enemy turn at all (6.1%, because that fight stages Janet and Isaiah and
//     the ALLIES clear locks on the casual player's behalf). With it in, that
//     encounter's PIP 0% cell moved -6.0 pp against a null arm whose own worst
//     cell is -2.8; with it out, -1.6 pp. It is the one row of fifteen the
//     floor could feel, and the fiction already exempts the Algorithm from
//     THE PIVOT for the same reason.
const ESCALATE = 0.85;
const AI_EXEMPT = ['intern', 'algorithm'];
// B3  DENIAL_LIMIT 2 -> 1 ; F1  PRESS_ADVANTAGE_BASE 40 -> 52
const DENIAL_ON = 1, DENIAL_OFF = 2;
const PA_ON = 52, PA_OFF = 40;

const readNL = (p) => {
  const s = readFileSync(p, 'utf8');
  return { s, nl: s.includes('\r\n') ? '\r\n' : '\n' };
};

function patchBalance(on) {
  const { s, nl } = readNL(BAL);
  const j = JSON.parse(s);
  j.player.maxMP = on ? MP_ON : MP_OFF;
  if (j.enemyAbilities) {
    for (const id of LOCK2_CLEANUP) {
      if (!j.enemyAbilities[id]) continue;
      delete j.enemyAbilities[id].lockCount;
      if (Object.keys(j.enemyAbilities[id]).length === 0) delete j.enemyAbilities[id];
    }
    // The shipped file has no `enemyAbilities` key at all. Leaving an empty
    // object behind would make `--off` a non-identity, and a revert that does
    // not revert is how a "dark" change quietly ships.
    if (Object.keys(j.enemyAbilities).length === 0) delete j.enemyAbilities;
  }
  const out = JSON.stringify(j, null, 2).replace(/\n/g, nl) + nl;
  writeFileSync(BAL, out);
}

function patchAI(on) {
  const { s } = readNL(AI);
  let out = s;
  if (on) {
    // Match each row's `pattern:` line INCLUDING its terminator and re-emit it
    // with the new field on the next line, carrying the SAME terminator. A
    // regex that stops at `$` cannot see whether the file is LF or CRLF — in
    // JS multiline mode `$` matches before `\r` too — and the first version of
    // this inserted a blank line into every row on a CRLF checkout.
    // Insert on every row, then take it back off the exempt ones. The removal
    // is anchored to the row's OWN block — `\{[^{}]*?` cannot run past the
    // closing brace, so it can never strip the next row's field if an exempt
    // row is moved, renamed or loses its own copy. (The first version used a
    // lazy `[\s\S]*?`, which could.)
    out = out.replace(/^([ \t]*)pattern: '[a-z]+',[ \t]*(\r?\n)/gm,
      (m, ind, eol) => `${m}${ind}escalateAfterDenial: ${ESCALATE},${eol}`);
    for (const id of AI_EXEMPT) {
      const re = new RegExp(`(\\b${id}:\\s*\\{[^{}]*?)^[ \\t]*escalateAfterDenial: [0-9.]+,[ \\t]*\\r?\\n`, 'm');
      const before = out;
      out = out.replace(re, '$1');
      if (out === before) {
        console.error(`WARNING: could not exempt '${id}' — its row did not match. `
          + 'The proposal must not ship with that row carrying escalateAfterDenial.');
        process.exitCode = 1;
      }
    }
  } else {
    out = out.replace(/^[ \t]*escalateAfterDenial: [0-9.]+,[ \t]*\r?\n/gm, '');
  }
  writeFileSync(AI, out);
}

function patchEngine(on) {
  const { s } = readNL(ENG);
  let out = s;
  out = out.replace(/DENIAL_LIMIT: \d+,/, `DENIAL_LIMIT: ${on ? DENIAL_ON : DENIAL_OFF},`);
  out = out.replace(/PRESS_ADVANTAGE_BASE: \d+,/, `PRESS_ADVANTAGE_BASE: ${on ? PA_ON : PA_OFF},`);
  writeFileSync(ENG, out);
}

function state() {
  const bal = JSON.parse(readFileSync(BAL, 'utf8'));
  const ai = readFileSync(AI, 'utf8');
  const eng = readFileSync(ENG, 'utf8');
  return {
    'C1 player.maxMP': bal.player.maxMP,
    'E3 escalateAfterDenial rows': (ai.match(/escalateAfterDenial/g) || []).length,
    'B3 DENIAL_LIMIT': (eng.match(/DENIAL_LIMIT: (\d+),/) || [])[1],
    'F1 PRESS_ADVANTAGE_BASE': (eng.match(/PRESS_ADVANTAGE_BASE: (\d+),/) || [])[1],
  };
}

if (ON || OFF) {
  patchBalance(ON);
  patchAI(ON);
  patchEngine(ON);
  console.log(ON ? 'PROPOSAL APPLIED' : 'PROPOSAL REVERTED');
}
console.log(JSON.stringify(state(), null, 1));
if (CHECK && !ON && !OFF) {
  const st = state();
  const isOn = st['C1 player.maxMP'] === MP_ON && st['B3 DENIAL_LIMIT'] === String(DENIAL_ON);
  console.log(isOn ? '=> tree is ON (proposal applied)' : '=> tree is OFF (shipped baseline)');
}
