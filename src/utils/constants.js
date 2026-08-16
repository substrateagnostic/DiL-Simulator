// Color palette
export const COLORS = {
  // UI
  PRIMARY: 0xe94560,
  SECONDARY: 0x0f3460,
  ACCENT: 0x53a8b6,
  BG_DARK: 0x1a1a2e,
  BG_DARKER: 0x0a0a14,

  // Environment
  FLOOR: 0xc8bfa9,
  WALL: 0xe8e0d0,
  CEILING: 0xf5f0e8,
  CARPET: 0x4a6741,
  CUBICLE_WALL: 0xb0a890,
  DESK: 0x8b7355,
  DESK_DARK: 0x6b5335,

  // Character
  SKIN: 0xf5c6a0,
  SKIN_DARK: 0xd4a574,
  HAIR_BROWN: 0x4a3728,
  HAIR_DARK: 0x2a1f14,
  HAIR_BLONDE: 0xc4a862,
  HAIR_GRAY: 0x999999,
  HAIR_WHITE: 0xe0ddd0,
  SUIT_BLUE: 0x2c3e6b,
  SUIT_BLACK: 0x222222,
  SHIRT_WHITE: 0xf0ede8,
  KHAKI: 0xc4b078,
  POLO_GREEN: 0x4a7c59,
  HAWAIIAN: 0xe07040,
  CARDIGAN: 0x8b6e8b,
  BLAZER: 0x2d2d4e,
  RED_TIE: 0xcc2222,
  BLUE_TIE: 0x2244aa,
  COFFEE_MUG: 0xf5f0e0,
  COFFEE: 0x3a1f0f,

  // Effects
  MONITOR_GLOW: 0x88ccff,
  FLUORESCENT: 0xf8f4e8,
};

// Tile size
export const TILE_SIZE = 1;

// Camera settings
export const CAMERA = {
  ZOOM: 12,
  ANGLE_X: Math.PI / 6,  // 30 degrees
  ANGLE_Y: Math.PI / 4,  // 45 degrees
  FOLLOW_SPEED: 0.08,
  DEAD_ZONE: 0.5,
};

// Player
export const PLAYER = {
  SPEED: 5,
  INTERACT_RANGE: 1.8,
  // Hard perimeter clamp applied in Player.move: the player can never stand
  // outside [EDGE_CLAMP, dim - 1.4] on either axis. Exported because
  // Room._registerWallProp has to reason about the player's REACHABLE band to
  // decide whether a walk-behind fade is a conditional affordance or a
  // permanent deletion — see the wall-fade block in Room.js.
  EDGE_CLAMP: 0.4,
  EDGE_CLAMP_FAR: 1.4,
};

// Character dimensions
export const CHAR = {
  BODY_WIDTH: 0.37,
  BODY_HEIGHT: 0.58,
  BODY_DEPTH: 0.26,
  HEAD_RADIUS: 0.225,
  LEG_WIDTH: 0.13,
  LEG_HEIGHT: 0.35,
  ARM_WIDTH: 0.1,
  ARM_HEIGHT: 0.45,
  TOTAL_HEIGHT: 1.35,

  // v7 body proportions — heroic-natural 6.5–7-head stylized adult (CHARACTER
  // BIBLE LAW 1). legLength is the hip-pivot height; the animator seats on it
  // (SEAT_Y = 0.44, unchanged).
  //
  // ── THE V7 HEAD RE-BASE (the "football head" fix) ────────────────────────
  // v6 ran the skull as a sphere of radius R eased 1.05× above the equator and
  // COMPRESSED 0.80× below it. Measured, that is 2.00R wide × 1.85R tall —
  // width/height 1.081, i.e. the head was literally WIDER THAN TALL. A human
  // head is ~0.72–0.75. That single number is the producer's "faces are
  // vertically squished — football heads."
  //
  // v7 re-bases the dial: V7_HEAD_R is the skull HALF-WIDTH (x), and the skull
  // is an ellipsoid V7_SKULL_UP/DOWN tall, so
  //     head height = R × (UP + DOWN) = 2.70R      width/height = 2/2.70 = 0.741
  // and, because UP === DOWN, the equator IS the 50% line — the eye line lands
  // at 50% of skull height BY CONSTRUCTION instead of being re-solved each round.
  //
  // Head count falls out of it: crown = legLength + torsoH + neckH + 2.70R, so
  //     6.93 heads = (1.37 + 0.2309) / 0.2309   with R = 0.0855.
  // (v6 measured 8.18 heads on Andrew — a tiny head on a long body.)
  V7_HEAD_R: 0.0855,       // skull HALF-WIDTH. head vert = 2.70R ≈ 0.231
  V7_SKULL_UP: 1.35,       // crown  = +1.35R
  V7_SKULL_DOWN: 1.35,     // chin   = −1.35R
  V7_SKULL_FRONT: 1.02,    // brow-plane front z
  V7_SKULL_BACK: 1.14,     // occiput
  V5_HEAD_R: 0.0855,       // legacy alias — same number, read by CharacterBuilder
  V5_LEG_LENGTH: 0.78,
  V5_TORSO_H: 0.50,
  // v7 — 0.090 left 0.94R of bare column above the garment (0.35 head-heights).
  // Measured against a human (chin→collar ≈ 0.25 head-heights) that is ~1.4×, and
  // it is what makes the arena close-ups read stalk-necked. 0.072 is 0.30
  // head-heights: still plainly VISIBLE (the v6 note stands), no longer a stalk.
  V5_NECK_H: 0.072,
};

// Animation
export const ANIM = {
  WALK_SPEED: 8,
  WALK_BOUNCE: 0.06,
  IDLE_SPEED: 2,
  IDLE_BOUNCE: 0.02,
};

// Combat
export const COMBAT = {
  BASE_DAMAGE_MULTIPLIER: 1.5,
  DEFENSE_FACTOR: 0.5,
  CRITICAL_CHANCE: 0.1,
  CRITICAL_MULTIPLIER: 2.0,
  FLEE_BASE_CHANCE: 0.4,
};

// Text speeds (ms per character)
export const TEXT_SPEED = {
  SLOW: 50,
  NORMAL: 30,
  FAST: 15,
};

// Z-ordering
export const LAYERS = {
  FLOOR: 0,
  FURNITURE: 0.01,
  CHARACTERS: 0.02,
  EFFECTS: 0.03,
};

// Dev mode — append ?dev to the URL to enable (e.g. localhost:5173/?dev)
export const DEV_MODE = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).has('dev')
  : false;

// One-release A/B escape hatch for the P7 routing-table extraction.
// Append ?routes=legacy to use ExplorationState._getDialogIdLegacy.
export const LEGACY_DIALOG_ROUTES = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('routes') === 'legacy'
  : false;

// Meshy combat cast — ON BY DEFAULT (producer ruling, 08-01): the rigged
// Meshy GLBs in public/meshy/ replace the procedural builds ON THE COMBAT
// STAGE ONLY. Exploration is 100% procedural and is not affected by this flag.
// Append ?nomeshy to force the procedural combat cast back (A/B escape hatch,
// same URLSearchParams pattern as DEV_MODE). ?meshy is still accepted as a
// no-op alias so old bookmarked comp links keep working.
export const MESHY_MODE = typeof window !== 'undefined'
  ? !new URLSearchParams(window.location.search).has('nomeshy')
  : true;
