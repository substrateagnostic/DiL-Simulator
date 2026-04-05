// Procedural client generation for the Reception roguelite system

import { COLORS } from '../utils/constants.js';

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
    angerDelta: 0,
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
    angerDelta: 0,
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
    angerDelta: 3,
  },
  {
    id: 'demanding',
    label: 'High Maintenance',
    desc: 'Calls 4x daily, CC\'s Alex on every email',
    debuff: { spd: -2 },
    angerDelta: 2,
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
    angerDelta: 1,
  },
  {
    id: 'fomo',
    label: 'FOMO Trader',
    desc: 'Constantly demands exposure to meme stocks',
    debuff: { atk: -1, spd: -1 },
    angerDelta: 2,
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
    angerDelta: 3,
  },
  {
    id: 'social_media',
    label: 'Social Media Complainant',
    desc: 'Live-tweets every meeting, 200K followers',
    debuff: { def: -3 },
    angerDelta: 3,
  },
  {
    id: 'day_trader',
    label: 'Day Trader',
    desc: 'Calls at market open demanding 47 trades before lunch',
    debuff: { spd: -3 },
    angerDelta: 2,
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

  return { bodyColor, pantsColor, shirtColor, tieColor, skinColor, hairColor, hairStyle, accessories };
}

function scaleEnemyStats(assets, playerLevel = 1) {
  const MAX_ASSET = 25_000_000; // raised for new high-AUM types
  const t = Math.min(1, assets / MAX_ASSET);
  // Level scaling: each player level adds ~8% to base stats
  const lvlScale = 1 + (playerLevel - 1) * 0.08;
  return {
    maxHP: Math.round((100 + t * 160) * lvlScale),
    atk:   Math.round((6  + t * 16)  * lvlScale),
    def:   Math.round((3  + t * 15)  * lvlScale),
    spd:   Math.round((4  + t * 10)  * lvlScale),
    xpReward: Math.round(60 + t * 60),
  };
}

export function generateClient(overrideLastName, playerLevel = 1) {
  const typeDef = pick(CLIENT_TYPES);
  const lastName = overrideLastName || pick(LAST_NAMES);
  const firstName = pick(FIRST_NAMES);
  const name = `${firstName} ${lastName}`;

  let assets = randomInt(typeDef.assetMin, typeDef.assetMax);
  // Crypto clients get wider variance — could moon or crash
  if (typeDef.volatileAssets) {
    const swing = Math.random();
    if (swing > 0.85) assets = Math.round(assets * 2.5); // to the moon
    else if (swing < 0.15) assets = Math.round(assets * 0.3); // rug pull
  }

  const feeRate = randomInt(100, 250) / 10000; // 1.0%–2.5%
  const annualFees = Math.round(assets * feeRate);
  const riskProfile = pick(RISK_PROFILES);

  // 0–2 positive, 0–2 negative; guarantee at least one attribute
  const numPos = randomInt(0, 2);
  const numNeg = randomInt(0, 2);
  const posAttrs = shuffle(POSITIVE_ATTRIBUTES).slice(0, numPos).map(a => ({ ...a, positive: true }));
  const negAttrs = shuffle(NEGATIVE_ATTRIBUTES).slice(0, numNeg).map(a => ({ ...a, positive: false }));

  if (posAttrs.length === 0 && negAttrs.length === 0) {
    if (Math.random() < 0.5) posAttrs.push({ ...pick(POSITIVE_ATTRIBUTES), positive: true });
    else negAttrs.push({ ...pick(NEGATIVE_ATTRIBUTES), positive: false });
  }

  const attributes = [...posAttrs, ...negAttrs];
  const netAngerDelta = attributes.reduce((sum, a) => sum + a.angerDelta, 0);

  const scaled = scaleEnemyStats(assets, playerLevel);
  const enemyStats = {
    name,
    maxHP: scaled.maxHP,
    hp: scaled.maxHP,
    atk: scaled.atk,
    def: scaled.def,
    spd: scaled.spd,
    xpReward: scaled.xpReward,
    abilities: [...typeDef.abilities],
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
    chainEligible: !!typeDef.chainEligible,
  };
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
    client.chainId = `chain_${lastName.toLowerCase()}_${Date.now()}`;
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
