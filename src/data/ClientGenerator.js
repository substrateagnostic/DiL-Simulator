// Procedural client generation for the Reception roguelite system

const FIRST_NAMES = [
  'Robert', 'Patricia', 'James', 'Margaret', 'William', 'Dorothy',
  'Richard', 'Susan', 'Charles', 'Barbara', 'Thomas', 'Linda',
  'Harold', 'Nancy', 'George', 'Sandra', 'Edward', 'Carol',
  'Michael', 'Elizabeth', 'Raymond', 'Sharon', 'Frank', 'Helen',
  'Steven', 'Cheryl', 'Gregory', 'Ruth', 'Dennis', 'Deborah',
  'Gerald', 'Kathleen', 'Walter', 'Virginia', 'Arthur', 'Beverly',
];

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

function scaleEnemyStats(assets) {
  const MAX_ASSET = 10_000_000;
  const t = Math.min(1, assets / MAX_ASSET);
  return {
    maxHP: Math.round(45 + t * 115),  // 45–160
    atk:   Math.round(6  + t * 16),   // 6–22
    def:   Math.round(3  + t * 15),   // 3–18
    spd:   Math.round(4  + t * 10),   // 4–14
    xpReward: Math.round(15 + t * 135), // 15–150
  };
}

export function generateClient() {
  const typeDef = pick(CLIENT_TYPES);
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

  const assets  = randomInt(typeDef.assetMin, typeDef.assetMax);
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

  const scaled = scaleEnemyStats(assets);
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

  return {
    name,
    type: typeDef.type,
    visualId: typeDef.visualId,
    assets,
    feeRate,
    annualFees,
    riskProfile,
    attributes,
    netAngerDelta,
    enemyStats,
  };
}
