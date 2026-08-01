// Procedural client generation for the Reception roguelite system

import { COLORS } from '../utils/constants.js';
import { DAY_BALANCE, rollDayMutators, partyEscalationScale } from './billableDay.js';

const MALE_NAMES = [
  'Robert', 'James', 'William', 'Richard', 'Charles', 'Thomas',
  'Harold', 'George', 'Edward', 'Michael', 'Raymond', 'Frank',
  'Steven', 'Gregory', 'Dennis', 'Gerald', 'Walter', 'Arthur',
];

const FEMALE_NAMES = [
  'Patricia', 'Margaret', 'Dorothy', 'Susan', 'Barbara', 'Linda',
  'Nancy', 'Sandra', 'Carol', 'Elizabeth', 'Sharon', 'Helen',
  'Cheryl', 'Ruth', 'Deborah', 'Kathleen', 'Virginia', 'Beverly',
];

const FIRST_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];
const MALE_NAME_SET = new Set(MALE_NAMES);

const LAST_NAMES = [
  'Thompson', 'Chen', 'Williams', 'Mueller', 'Kowalski', 'Shapiro',
  'Anderson', 'Johnson', 'Davis', 'Wilson', 'Martinez', 'Taylor',
  'Brown', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Adams',
  'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
  'Yamamoto', 'Okonkwo', 'Bernstein', 'Petrov', 'MacLeod', 'Ferraro',
];

const CLIENT_TYPES = [
  {
    type: 'Retiree',
    visualId: 'grandma',
    assetMin: 400_000,
    assetMax: 3_000_000,
    abilities: ['portfolio_panic', 'demand_guarantees'],
  },
  {
    type: 'Entrepreneur',
    visualId: 'chad',
    assetMin: 1_000_000,
    assetMax: 8_000_000,
    abilities: ['client_bro_down', 'portfolio_panic'],
  },
  {
    type: 'Divorcee',
    visualId: 'karen',
    assetMin: 600_000,
    assetMax: 5_000_000,
    abilities: ['speak_to_manager', 'call_the_other_advisor'],
  },
  {
    type: 'Trust Fund Heir',
    visualId: 'intern',
    assetMin: 2_000_000,
    assetMax: 10_000_000,
    abilities: ['demand_guarantees', 'trust_fund_tantrum'],
  },
  {
    type: 'Small Business Owner',
    visualId: 'intern',
    assetMin: 300_000,
    assetMax: 2_000_000,
    abilities: ['portfolio_panic', 'call_the_other_advisor'],
  },
  // ── Phase 7: New client types ─────────────────────────────────────────────
  {
    type: 'Widow/Widower',
    visualId: 'grandma',
    assetMin: 500_000,
    assetMax: 4_000_000,
    abilities: ['portfolio_panic', 'demand_guarantees'],
    chainEligible: true, // can appear in beneficiary chains
  },
  {
    type: 'Crypto Enthusiast',
    visualId: 'chad',
    assetMin: 200_000,
    assetMax: 12_000_000,
    abilities: ['client_bro_down', 'portfolio_panic', 'trust_fund_tantrum'],
    volatileAssets: true, // wider asset variance
  },
  {
    type: 'Family Dynasty',
    visualId: 'karen',
    assetMin: 5_000_000,
    assetMax: 25_000_000,
    abilities: ['speak_to_manager', 'demand_guarantees', 'call_the_other_advisor'],
    chainEligible: true,
  },
  {
    type: 'Charitable Foundation',
    visualId: 'grandma',
    assetMin: 2_000_000,
    assetMax: 15_000_000,
    abilities: ['demand_guarantees', 'portfolio_panic'],
  },
  {
    type: 'Professional Athlete',
    visualId: 'chad',
    assetMin: 3_000_000,
    assetMax: 20_000_000,
    abilities: ['client_bro_down', 'trust_fund_tantrum', 'call_the_other_advisor'],
  },
];

// ── Post-Game Tier 5 Client Types ────────────────────────────────────────────
// Unlocked after defeating The Algorithm. Assets 20M–100M, XP 200–350.
const POST_GAME_CLIENT_TYPES = [
  {
    type: 'UHNWI',
    visualId: 'karen',
    assetMin: 30_000_000,
    assetMax: 100_000_000,
    abilities: ['speak_to_manager', 'demand_guarantees', 'call_the_other_advisor'],
  },
  {
    type: 'Sovereign Wealth Consultant',
    visualId: 'chad',
    assetMin: 50_000_000,
    assetMax: 100_000_000,
    abilities: ['demand_guarantees', 'portfolio_panic', 'trust_fund_tantrum'],
  },
  {
    type: 'Offshore Dynasty',
    visualId: 'grandma',
    assetMin: 25_000_000,
    assetMax: 80_000_000,
    abilities: ['call_the_other_advisor', 'speak_to_manager', 'demand_guarantees'],
  },
  {
    type: 'Corporate Pension Fund',
    visualId: 'intern',
    assetMin: 40_000_000,
    assetMax: 100_000_000,
    abilities: ['portfolio_panic', 'demand_guarantees', 'speak_to_manager'],
  },
  {
    type: 'Tech Billionaire Exit',
    visualId: 'chad',
    assetMin: 20_000_000,
    assetMax: 75_000_000,
    abilities: ['client_bro_down', 'trust_fund_tantrum', 'call_the_other_advisor'],
  },
];

const RISK_PROFILES = [
  'Very Conservative',
  'Conservative',
  'Moderate',
  'Aggressive',
  'Very Aggressive',
];

export const POSITIVE_ATTRIBUTES = [
  {
    id: 'referral',
    label: 'Referral Client',
    desc: 'Referred by existing client — easy to onboard',
    buff: { atk: 2 },
    angerDelta: -1,
  },
  {
    id: 'long_term',
    label: 'Long-Term Investor',
    desc: 'Patient, no panic selling at the first dip',
    buff: { def: 2 },
    angerDelta: -1,
  },
  {
    id: 'high_growth',
    label: 'High Growth Potential',
    desc: 'Strong earning prospects, great for metrics',
    buff: { atk: 1, spd: 1 },
    angerDelta: -1,
  },
  {
    id: 'low_maintenance',
    label: 'Low Maintenance',
    desc: 'Monthly check-ins only — respects your time',
    buff: { spd: 2 },
    angerDelta: -1,
  },
  {
    id: 'large_estate',
    label: 'Large Estate',
    desc: 'Significant AUM boosts your book of business',
    buff: { atk: 3 },
    angerDelta: -1,
  },
  // ── Phase 7: New positive attributes ────────────────────────────────────
  {
    id: 'philanthropic',
    label: 'Philanthropic',
    desc: 'Donates generously — great PR for the department',
    buff: { def: 1, atk: 1 },
    angerDelta: -2,
  },
  {
    id: 'long_horizon',
    label: 'Long Horizon',
    desc: '30+ year time horizon — no quarterly panic',
    buff: { def: 3 },
    angerDelta: -1,
  },
  {
    id: 'simple_estate',
    label: 'Simple Estate',
    desc: 'One account, no trusts, no complications. Bliss.',
    buff: { spd: 3 },
    angerDelta: -1,
  },
  {
    id: 'pre_documented',
    label: 'Pre-Documented',
    desc: 'Arrives with all paperwork already filled out perfectly',
    buff: { spd: 2, def: 1 },
    angerDelta: -2,
  },
  {
    id: 'returning_client',
    label: 'Returning Client',
    desc: 'Used to be with Vaults Fargo — knows the drill',
    buff: { atk: 2, def: 1 },
    angerDelta: -1,
  },
];

export const NEGATIVE_ATTRIBUTES = [
  {
    id: 'litigious',
    label: 'Litigious History',
    desc: 'Has sued 3 previous advisors for "bad advice"',
    debuff: { def: -3 },
    angerDelta: 2,
  },
  {
    id: 'demanding',
    label: 'High Maintenance',
    desc: 'Calls 4x daily, CC\'s Alex on every email',
    debuff: { spd: -2 },
    angerDelta: 1,
  },
  {
    id: 'unrealistic',
    label: 'Unrealistic Expectations',
    desc: 'Expects guaranteed 25% annual returns',
    debuff: { atk: -2 },
    angerDelta: 2,
  },
  {
    id: 'complex_tax',
    label: 'Nightmare Tax Situation',
    desc: '7 states, 2 offshore accounts, 3 shell LLCs',
    debuff: { def: -2 },
    angerDelta: 2,
  },
  {
    id: 'fomo',
    label: 'FOMO Trader',
    desc: 'Constantly demands exposure to meme stocks',
    debuff: { atk: -1, spd: -1 },
    angerDelta: 1,
  },
  // ── Phase 7: New negative attributes ────────────────────────────────────
  {
    id: 'multi_jurisdiction',
    label: 'Multi-Jurisdiction',
    desc: 'Assets in 4 countries with conflicting tax treaties',
    debuff: { spd: -3 },
    angerDelta: 2,
  },
  {
    id: 'family_feud',
    label: 'Family Feud',
    desc: 'Three siblings, three lawyers, zero agreement',
    debuff: { def: -2, atk: -1 },
    angerDelta: 2,
  },
  {
    id: 'social_media',
    label: 'Social Media Complainant',
    desc: 'Live-tweets every meeting, 200K followers',
    debuff: { def: -3 },
    angerDelta: 2,
  },
  {
    id: 'day_trader',
    label: 'Day Trader',
    desc: 'Calls at market open demanding 47 trades before lunch',
    debuff: { spd: -3 },
    angerDelta: 1,
  },
  {
    id: 'conspiracy',
    label: 'Conspiracy Theorist',
    desc: '"I want all my assets in physical gold buried in my yard"',
    debuff: { atk: -2, def: -1 },
    angerDelta: 2,
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateVisualConfig(firstName, clientType) {
  const isMale = MALE_NAME_SET.has(firstName);
  const isRetiree = clientType === 'Retiree';

  const skinColor = pick([COLORS.SKIN, COLORS.SKIN_DARK, 0xc68642, 0xe8b88a]);
  const hairColor = isRetiree
    ? pick([COLORS.HAIR_GRAY, COLORS.HAIR_WHITE])
    : pick([COLORS.HAIR_BROWN, COLORS.HAIR_DARK, COLORS.HAIR_BLONDE, COLORS.HAIR_GRAY]);

  let hairStyle, bodyColor, pantsColor, shirtColor, tieColor, accessories;

  if (isMale) {
    const isYoung = clientType === 'Trust Fund Heir' || clientType === 'Entrepreneur';
    hairStyle = isYoung ? pick(['short', 'backwards_cap']) : 'short';
    bodyColor = pick([COLORS.SUIT_BLUE, COLORS.SUIT_BLACK, 0x3a5a3a, 0x3a3a6a, COLORS.POLO_GREEN]);
    pantsColor = pick([0x2a2a3a, COLORS.KHAKI, 0x333333]);
    shirtColor = Math.random() > 0.35 ? COLORS.SHIRT_WHITE : null;
    tieColor = shirtColor && Math.random() > 0.4
      ? pick([COLORS.BLUE_TIE, COLORS.RED_TIE, 0x224422, 0xdaa520])
      : null;
    if (isRetiree)                            accessories = ['cane'];
    else if (clientType === 'Entrepreneur')   accessories = [pick(['protein_shake', 'coffee_mug'])];
    else if (clientType === 'Trust Fund Heir') accessories = ['sunglasses'];
    else                                      accessories = Math.random() > 0.5 ? ['coffee_mug'] : [];
  } else {
    hairStyle = isRetiree ? pick(['shawl', 'bun']) : pick(['bun', 'karen', 'short']);
    bodyColor = pick([COLORS.CARDIGAN, COLORS.BLAZER, 0xcc6688, 0x8866aa, 0x4a6a8a]);
    pantsColor = pick([0x2a2a3a, 0x3a3a4a, 0x4a3a3a]);
    shirtColor = Math.random() > 0.5 ? COLORS.SHIRT_WHITE : null;
    tieColor = null;
    if (isRetiree)                             accessories = pick([['cane'], ['cane', 'purse']]);
    else if (clientType === 'Divorcee')        accessories = pick([['purse'], ['purse', 'wine_tumbler']]);
    else if (clientType === 'Trust Fund Heir') accessories = ['purse', 'sunglasses'];
    else if (clientType === 'Entrepreneur')    accessories = [pick(['clipboard', 'coffee_mug'])];
    else                                       accessories = Math.random() > 0.5 ? ['purse'] : [];
  }

  return {
    bodyColor, pantsColor, shirtColor, tieColor, skinColor, hairColor, hairStyle, accessories,
    meshyBody: pickMeshyBody(isMale, isRetiree, clientType),
  };
}

// Which of the six Meshy client bodies stands on the combat stage for this
// client (src/combat/MeshyCast.js). The bodies are neutral grey and get tinted
// at runtime from bodyColor/pantsColor, so this only has to choose a SILHOUETTE.
// The female pool is two bodies, so every non-elder woman uses the pro body.
function pickMeshyBody(isMale, isRetiree, clientType) {
  if (!isMale) return isRetiree || clientType === 'Widow/Widower' ? 'client_f_elder' : 'client_f_pro';
  if (isRetiree || clientType === 'Widow/Widower') return 'client_m_elder';
  if (clientType === 'Professional Athlete' || clientType === 'Entrepreneur') return 'client_m_athletic';
  if (clientType === 'Small Business Owner' || clientType === 'Corporate Pension Fund') return 'client_m_heavy';
  return 'client_m_young';
}

function scaleEnemyStats(assets, playerLevel = 1, postGame = false) {
  const MAX_ASSET = postGame ? 100_000_000 : 25_000_000;
  const t = Math.min(1, assets / MAX_ASSET);
  // Level scaling: each player level adds ~8% to base stats
  const lvlScale = 1 + (playerLevel - 1) * 0.08;
  const xpReward = postGame
    ? Math.round(200 + t * 150)   // 200–350 post-game
    : Math.round(60 + t * 60);    // 60–120 normal
  // HP variance: ±30% so clients at similar wealth tiers still feel distinct
  const hpVariance = 0.70 + Math.random() * 0.60; // 0.70–1.30
  return {
    maxHP: Math.round((100 + t * 160) * lvlScale * hpVariance),
    atk:   Math.round((6  + t * 16)  * lvlScale),
    def:   Math.round((3  + t * 15)  * lvlScale),
    spd:   Math.round((4  + t * 10)  * lvlScale),
    xpReward,
  };
}

export function generateClient(
  overrideLastName, playerLevel = 1, postGame = false, forceWhale = false, suppressWhale = false,
) {
  let pool = postGame ? POST_GAME_CLIENT_TYPES : CLIENT_TYPES;
  let typeDef = pick(pool);
  const lastName = overrideLastName || pick(LAST_NAMES);
  const firstName = pick(FIRST_NAMES);
  const name = `${firstName} ${lastName}`;

  // 5% chance of a pre-algorithm whale client (100M+ AUM) — rare big fish.
  // forceWhale: a signed whale referred a friend (whale_referral_pending flag).
  // suppressWhale: the CALLER already rolled for the whale and it missed. This
  // exists for generateDayClient, whose asset-floor rejection sampling re-rolls
  // this function up to 12 times per slot: an unsuppressed 5% roll inside the
  // loop compounds to ~12% on the late slots (measured 4.08% walk-in vs 12.35%
  // on day slot 4), and because a whale always clears the floor it also breaks
  // the loop, so the distortion is one-directional. See generateDayClient.
  let isWhale = forceWhale;
  if (!postGame && !isWhale && !suppressWhale && Math.random() < 0.05) {
    isWhale = true;
    typeDef = pick(POST_GAME_CLIENT_TYPES);
  } else if (forceWhale) {
    typeDef = pick(POST_GAME_CLIENT_TYPES);
  }

  let assets = isWhale
    ? randomInt(100_000_000, 250_000_000)
    : randomInt(typeDef.assetMin, typeDef.assetMax);
  // Crypto clients get wider variance — could moon or crash
  if (!isWhale && typeDef.volatileAssets) {
    const swing = Math.random();
    if (swing > 0.85) assets = Math.round(assets * 2.5); // to the moon
    else if (swing < 0.15) assets = Math.round(assets * 0.3); // rug pull
  }

  const feeRate = randomInt(100, 250) / 10000; // 1.0%–2.5%
  const annualFees = Math.round(assets * feeRate);
  const riskProfile = pick(RISK_PROFILES);

  // 1–3 positive, 0–1 negative — guarantee at least one positive per client
  // Expected anger delta: ~-0.7 per client so anger trends down over time with room for bad streaks
  const numPos = randomInt(1, 3);
  const numNeg = randomInt(0, 1);
  const posAttrs = shuffle(POSITIVE_ATTRIBUTES).slice(0, numPos).map(a => ({ ...a, positive: true }));
  const negAttrs = shuffle(NEGATIVE_ATTRIBUTES).slice(0, numNeg).map(a => ({ ...a, positive: false }));

  const attributes = [...posAttrs, ...negAttrs];
  const netAngerDelta = attributes.reduce((sum, a) => sum + a.angerDelta, 0);

  // Combat mutators — some attributes change how the fight itself plays.
  // Always set (even empty) — ENEMY_STATS.reception_client is mutated in
  // place between fights and stale mutators must not leak.
  const mutators = [];
  if (attributes.some(a => a.id === 'litigious')) {
    mutators.push({ id: 'thorns', label: 'Billable Hours', desc: 'Every hit you land costs 4 Patience in legal fees' });
  }
  if (attributes.some(a => a.id === 'day_trader' || a.id === 'fomo')) {
    mutators.push({ id: 'volatile', label: 'Market Mood', desc: 'Their Assertiveness swings wildly every turn' });
  }
  if (assets >= 5_000_000) {
    mutators.push({ id: 'compound', label: 'Compound Interest', desc: 'Recovers 2% Patience every turn' });
  }

  const scaled = scaleEnemyStats(assets, playerLevel, postGame || isWhale);
  const enemyStats = {
    name,
    maxHP: scaled.maxHP,
    hp: scaled.maxHP,
    atk: scaled.atk,
    def: scaled.def,
    spd: scaled.spd,
    xpReward: scaled.xpReward,
    abilities: [...typeDef.abilities],
    mutators,
    // Always present (even null) — ENEMY_STATS.reception_client is mutated in
    // place between fights, so an Escalation Clause day client must not leave
    // its phases behind for the next walk-in. Same reasoning as `mutators`.
    phases: null,
    phaseMessages: null,
  };

  const visualConfig = generateVisualConfig(firstName, typeDef.type);

  return {
    name,
    lastName,
    type: typeDef.type,
    visualConfig,
    assets,
    feeRate,
    annualFees,
    riskProfile,
    attributes,
    netAngerDelta,
    enemyStats,
    mutators,
    chainEligible: !!typeDef.chainEligible,
    isPostGame: postGame || isWhale,
    isWhale,
  };
}

// ── The Billable Day: day-slot client generation ──────────────────────────────
// A day is 3-5 clients on one board. Slot 0 is the walk-in the player already
// knows how to fight; every slot after it is scaled up and can carry a
// subtractive mutator. The last slot (Close of Business) gets an extra bump
// and always carries one. See src/data/billableDay.js for the tunables and
// .claude/plans/research-gameplay-comps.md P2.2/P2.4 for why.

/**
 * Scale an already-generated client into a day slot and attach its mutators.
 * Mutates and returns the client.
 */
export function applyDayEscalation(client, index = 0, total = 3, partySize = 0) {
  const B = DAY_BALANCE;
  const step = Math.max(0, index);
  const closing = index >= total - 1;
  // One dial for both ends of the fairness band — see DAY_BALANCE.partyEscalationScale.
  const pScale = partyEscalationScale(partySize);

  // A whale (100M-250M assets) is already pinned to the top of the wealth
  // curve and scaled as post-game. Stacking slot escalation on top of that
  // produced an unwinnable outlier, so whales keep their slot stamp and the
  // closer's mutator but skip the stat multipliers. The XP bump still applies.
  const stats = !client.isWhale;
  const hpMult  = stats ? 1 + (step * B.hpPerStep  + (closing ? B.closingHpBonus  : 0)) * pScale : 1;
  const atkMult = stats ? 1 + (step * B.atkPerStep + (closing ? B.closingAtkBonus : 0)) * pScale : 1;
  const defMult = stats ? 1 + step * B.defPerStep * pScale : 1;
  const spdMult = stats ? 1 + step * B.spdPerStep * pScale : 1;
  // XP is NOT party-scaled: the day pays for the slot you cleared, not for how
  // many people helped. Scaling it would make going alone pay less as well as
  // hurt more, which is a punishment, not a trade.
  const xpMult  = 1 + step * B.xpPerStep;

  const es = client.enemyStats;
  es.maxHP = Math.max(1, Math.round(es.maxHP * hpMult));
  es.hp = es.maxHP;
  es.atk = Math.max(1, Math.round(es.atk * atkMult));
  es.def = Math.max(0, Math.round(es.def * defMult));
  es.spd = Math.max(1, Math.round(es.spd * spdMult));
  es.xpReward = Math.max(1, Math.round(es.xpReward * xpMult));

  // Subtractive mutators ride alongside the additive ones the generator
  // already produced (thorns / volatile / compound).
  const dayMutators = rollDayMutators(index, total);
  if (dayMutators.length > 0) {
    client.mutators = [...(client.mutators || []), ...dayMutators];
    es.mutators = [...(es.mutators || []), ...dayMutators];
  }

  // Escalation Clause used to bolt a second phase with a heavier ability pool
  // onto the client at 50% HP. That shipped `subtractive: true` while being a
  // straight stat check — it took nothing from Andrew, which is exactly the
  // shape P2.4 says does NOT produce the "I know why I lost" clarity. It is
  // now the report's named version: momentum decays 10 per turn, enforced in
  // CombatEngine.processTurnStart. No enemy data to write, so nothing happens
  // here any more — the rule lives entirely in the engine.

  client.daySlot = index;
  client.dayTotal = total;
  client.isClosing = closing;
  return client;
}

/** Minimum assets a client must carry to belong in slot `index` of a day. */
export function dayAssetFloor(index, postGame = false) {
  const MAX_ASSET = postGame ? 100_000_000 : 25_000_000;
  const pct = Math.min(DAY_BALANCE.assetFloorMax, Math.max(0, index) * DAY_BALANCE.assetFloorPerStep);
  return Math.round(pct * MAX_ASSET);
}

/**
 * Generate a client for a given slot in a Billable Day.
 * Wraps generateClient so the walk-in path is untouched.
 *
 * The slot's asset floor is met by rejection sampling rather than by rewriting
 * the type tables: a handful of rolls is cheap, the wealth mix stays organic,
 * and if the pool simply cannot reach the floor (early game, thin types) the
 * richest candidate is kept instead of hanging.
 *
 * THE WHALE IS ROLLED ONCE, HERE, BEFORE THE LOOP. Leaving the 5% roll inside
 * generateClient made it fire on every retry, and since a whale (100M-250M)
 * always clears the floor and breaks the loop, the effective rate climbed with
 * the floor: measured 4.08% walk-in against 4.70 / 6.45 / 7.95 / 10.17 / 12.35%
 * on day slots 0-4, i.e. ~0.42 whales per five-slot day against ~0.20 per five
 * walk-ins. A whale's 1M-2.5M fee also collects the closing premium, so that
 * was quietly the dominant AUM term in the mode whose whole justification is a
 * MEASURED risk premium (report P2.1). One roll per slot, same 5% as a walk-in.
 */
export function generateDayClient({
  index = 0,
  total = 3,
  playerLevel = 1,
  postGame = false,
  forceWhale = false,
  lastName = null,
  partySize = 0,
} = {}) {
  const floor = dayAssetFloor(index, postGame);
  // One roll per SLOT, not one per retry. postGame days draw from the elite
  // pool already and never rolled a whale in the first place.
  const isWhale = forceWhale || (!postGame && Math.random() < 0.05);
  let best = null;
  const tries = Math.max(1, DAY_BALANCE.assetFloorTries);
  for (let i = 0; i < tries; i++) {
    const c = generateClient(lastName, playerLevel, postGame, isWhale, true);
    if (c.assets >= floor) { best = c; break; }
    if (!best || c.assets > best.assets) best = c;
  }
  return applyDayEscalation(best, index, total, partySize);
}

// ── Beneficiary Chain Generation ──────────────────────────────────────────────
// Generate a 3-client family chain sharing a last name.
// Accept one → others follow with better stats.
// Reject one → others arrive angrier.

export function generateBeneficiaryChain(playerLevel = 1) {
  const lastName = pick(LAST_NAMES);
  const chainTypes = CLIENT_TYPES.filter(t => t.chainEligible);
  // If no chain-eligible types, fall back to any type
  const pool = chainTypes.length >= 3 ? chainTypes : CLIENT_TYPES;

  // One id for the whole family — computed ONCE. Computing it inside the loop
  // let Date.now() drift between members, which would hand each member its own
  // chain_* flag key and break the accepted/rejected bookkeeping the modifiers
  // read (_updateChainState / applyChainModifiers in ExplorationState).
  const chainId = `chain_${lastName.toLowerCase()}_${Date.now()}`;

  const members = [];
  for (let i = 0; i < 3; i++) {
    const client = generateClient(lastName, playerLevel);
    // Force chain-eligible type if available
    if (chainTypes.length > 0) {
      const typeDef = chainTypes[i % chainTypes.length];
      client.type = typeDef.type;
      client.visualId = typeDef.visualId;
      client.enemyStats.abilities = [...typeDef.abilities];
    }
    client.chainId = chainId;
    client.chainIndex = i;
    client.chainSize = 3;
    members.push(client);
  }

  // First member is the "lead" — if accepted, others are friendlier
  members[0].chainRole = 'lead';
  members[1].chainRole = 'follower';
  members[2].chainRole = 'follower';

  return {
    id: members[0].chainId,
    lastName,
    members,
    acceptedCount: 0,
    rejectedCount: 0,
  };
}

// Modify a chain follower based on what happened with previous members
export function applyChainModifiers(client, chain) {
  if (chain.acceptedCount > 0) {
    // Family members heard good things — easier to deal with
    client.netAngerDelta = Math.max(-3, client.netAngerDelta - chain.acceptedCount);
    client.attributes.push({
      id: 'family_referral',
      label: 'Family Referral',
      desc: `The ${chain.lastName} family speaks highly of you`,
      buff: { atk: 1, def: 1 },
      positive: true,
      angerDelta: -1,
    });
  }
  if (chain.rejectedCount > 0) {
    // Family members are upset you rejected their kin
    client.netAngerDelta += chain.rejectedCount * 2;
    client.attributes.push({
      id: 'family_grudge',
      label: 'Family Grudge',
      desc: `You rejected their ${chain.rejectedCount === 1 ? 'relative' : 'relatives'}. They remember.`,
      debuff: { def: -2 },
      positive: false,
      angerDelta: 2,
    });
    // Angrier clients hit harder
    client.enemyStats.atk += chain.rejectedCount * 2;
  }
  return client;
}

// ── Portfolio Health Calculator ───────────────────────────────────────────────
// Returns a rating based on current portfolio metrics

export function calculatePortfolioHealth(portfolioClients, portfolioAUM, portfolioFees) {
  if (portfolioClients === 0) return { rating: 'Empty', score: 0, grade: 'F' };

  const avgAUM = portfolioAUM / portfolioClients;
  const feeYield = portfolioFees / portfolioAUM;

  let score = 0;

  // Client count (0-25 points)
  if (portfolioClients >= 8) score += 25;
  else if (portfolioClients >= 5) score += 20;
  else if (portfolioClients >= 3) score += 15;
  else score += 5;

  // AUM per client (0-25 points)
  if (avgAUM >= 5_000_000) score += 25;
  else if (avgAUM >= 2_000_000) score += 20;
  else if (avgAUM >= 1_000_000) score += 15;
  else if (avgAUM >= 500_000) score += 10;
  else score += 5;

  // Total AUM (0-25 points)
  if (portfolioAUM >= 30_000_000) score += 25;
  else if (portfolioAUM >= 15_000_000) score += 20;
  else if (portfolioAUM >= 5_000_000) score += 15;
  else if (portfolioAUM >= 1_000_000) score += 10;
  else score += 5;

  // Fee yield (0-25 points) — higher yield means more revenue
  if (feeYield >= 0.02) score += 25;
  else if (feeYield >= 0.015) score += 20;
  else if (feeYield >= 0.012) score += 15;
  else score += 10;

  let grade, rating;
  if (score >= 90) { grade = 'A+'; rating = 'Outstanding'; }
  else if (score >= 80) { grade = 'A'; rating = 'Excellent'; }
  else if (score >= 70) { grade = 'B'; rating = 'Good'; }
  else if (score >= 55) { grade = 'C'; rating = 'Acceptable'; }
  else if (score >= 40) { grade = 'D'; rating = 'Needs Improvement'; }
  else { grade = 'F'; rating = 'Underperforming'; }

  return { rating, score, grade, avgAUM, feeYield };
}
