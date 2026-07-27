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

  // v6 body proportions — heroic-natural 6.5–7-head stylized adult (CHARACTER
  // BIBLE LAW 1). The head SHRINKS and the figure lengthens vs v5's lumpy-toddler
  // ~5.8 heads. legLength is the hip-pivot height; the animator seats on it
  // (SEAT_Y). Standing crown ≈ 1.62; ÷ head-vert (≈2.2R≈0.23) ≈ 7 heads.
  V5_HEAD_R: 0.104,   // v5 0.122 → −15% (head vert ≈ 2.2R ≈ 0.23)
  V5_LEG_LENGTH: 0.78, // v5 0.70 → longer legs raise the figure
  V5_TORSO_H: 0.50,   // v5 0.47
  V5_NECK_H: 0.090,   // v5 0.075 → neck is VISIBLE, never sunk in the collar
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
