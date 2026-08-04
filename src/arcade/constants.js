// ============================================================
// SPRINT REVIEW — physics + tuning constants
// ============================================================
// Every movement number below is a direct conversion of the Genesis
// Sonic constants (Sonic Physics Guide, S1/S2/S3&K shared table) out of
// px/frame @60fps and into units/second, at a world scale of
// 20 px = 1 unit. That scale is not arbitrary: Sonic is 40 px tall, so
// one Sonic = 2.0 units, and every ratio the Genesis game-feel depends on
// (top speed in body-lengths/sec, jump apex in body-heights, screen
// height in body-heights) survives the conversion exactly.
//
//   px/frame   -> u/s    : v * 60 / 20   = v * 3
//   px/frame^2 -> u/s^2  : a * 3600 / 20 = a * 180
//
// DO NOT "tune" these by feel without re-deriving them. The whole point
// of the rebuild is that the momentum is honest; the fun knobs are the
// level generator and the props, not the integrator.
// ============================================================

// ---- Genesis constants, converted -------------------------------------
export const ACC = 0.046875 * 180;   //   8.44  ground acceleration
export const FRC = 0.046875 * 180;   //   8.44  friction (no input)
export const DEC = 0.5 * 180;        //  90.0   braking / skid
export const TOP = 6 * 3;            //  18.0   nominal top speed
export const AIR_ACC = 0.09375 * 180; //  16.9  air acceleration (2x ground)
export const GRAVITY = 0.21875 * 180; //  39.375
export const JUMP = 6.5 * 3;         //  19.5   jump impulse (along surface normal)
export const JUMP_CUT = 4 * 3;       //  12.0   velocity cap on early release
export const SLOPE = 0.125 * 180;    //  22.5   running slope factor
export const SLOPE_ROLL_UP = 0.078125 * 180;  // 14.06 rolling uphill
export const SLOPE_ROLL_DOWN = 0.3125 * 180;  // 56.25 rolling downhill
export const ROLL_FRC = 0.0234375 * 180;      //  4.22 rolling friction (half)
export const ROLL_DEC = 0.125 * 180;          // 22.5  rolling brake

// ---- Derived / house rules --------------------------------------------
export const MAX_SPEED = 46;         // hard clamp so a chain of valleys can't NaN us
export const ROLL_MIN = 1.6;         // uncurl below this ground speed
export const ROLL_START = 3.2;       // need this much to curl in the first place
export const SLIP_ANGLE = 0.62;      // ~35 deg: below this speed on this slope you slide
export const SLIP_SPEED = 3.4;
export const CONTROL_LOCK = 0.4;     // seconds of no-steer after a slip / wipeout

// Spindash: Genesis is gsp = 8 + floor(charge)/2 px/frame.
export const SPINDASH_BASE = 8 * 3;     // 24.0
export const SPINDASH_PER = 0.5 * 3;    //  1.5 per charge unit
export const SPINDASH_MAX_CHARGE = 8;
export const SPINDASH_DECAY = 4.0;      // charge units/sec bled off while held

// ---- Body ---------------------------------------------------------------
export const RUNNER_H = 1.8;         // standing height (0.9 Sonics — reads adult)
export const RUNNER_W = 0.66;
export const BALL_R = 0.52;          // curled radius; 1.04 tall < any low pipe

// ---- Camera -------------------------------------------------------------
// 10 units tall / 1.8 unit runner = 5.56 body-heights. Genesis is
// 224px / 40px = 5.60. Matching it is the difference between the runner
// reading as a character and reading as a speck.
export const CAM_HALF_H = 5.0;
export const CAM_DEADZONE_Y = 1.1;
export const CAM_FOLLOW_Y_GROUND = 15;
export const CAM_FOLLOW_Y_AIR = 42;
export const CAM_LOOKAHEAD = 0.30;   // seconds of travel to lead by
export const CAM_LOOKAHEAD_MAX = 5.5;

// ---- The Deadline (the chase) ------------------------------------------
// Tuned off tools/arcade-play.mjs runs, not by feel: at these numbers a
// scripted mediocre policy dies at 40-70s and a clean line runs 3-5 min,
// which brackets the 2-4 minute session target from both sides.
export const DEADLINE_START_SPEED = 5.0;
export const DEADLINE_END_SPEED = 14.5;
export const DEADLINE_RAMP_TIME = 165;  // seconds to reach END_SPEED
export const DEADLINE_LATE_RAMP = 1.1;  // extra u/s per 30s after that
export const DEADLINE_MAX_GAP = 62;     // it never lags further behind than this
export const DEADLINE_HEADSTART = 42;   // units behind you at t=0

// ---- Scoring ------------------------------------------------------------
export const UNITS_PER_FLOOR = 25;   // display distance = floors cleared
export const CLIP_POINTS = 10;
export const SMASH_POINTS = 25;

// Cosmetic ladder. Flag keys are LOAD-BEARING — they are carried across
// New Game+ by MenuState's `arcade_` CARRY_PREFIX and read out of old
// saves. The labels changed with the rebuild; the keys must not.
export const COSMETIC_MILESTONES = [
  { floors: 30,  flag: 'arcade_gold_wheels', label: 'GOLD LOAFERS UNLOCKED' },
  { floors: 75,  flag: 'arcade_fancy_roof',  label: 'POWER TIE UNLOCKED' },
  { floors: 130, flag: 'arcade_armored',     label: 'PINSTRIPE ARMOUR UNLOCKED' },
  { floors: 200, flag: 'arcade_fire_horses', label: 'BLAZING WINGTIPS UNLOCKED' },
];

// Palette — Severance teal-and-carpet, arcade-saturated. Green Hill's
// checkered ground becomes alternating carpet tiles; its brown dirt
// strata become subfloor and cable trays.
// Green Hill's ground is a THIN lit surface strip over a hard-checkered
// band over a flat dark mass. Ours is the same three-part structure in
// carpet tile, skirting and subfloor. The tile contrast is deliberately
// high: it is the only thing on screen that tells you how fast you are
// actually moving.
export const PAL = {
  carpetA: 0x6fa2b3,
  carpetB: 0x33505f,
  carpetEdge: 0xc4f5e6,
  skirting: 0x2d4d5c,
  subfloor: 0x182a34,
  strata: 0x080d11,
  skyTop: 0x0d1b2c,
  skyBot: 0x336e80,
};

export const CARPET_TILE = 1.6;      // world units per carpet tile

