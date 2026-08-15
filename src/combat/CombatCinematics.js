// CombatCinematics — a data-driven cinematic sequencer for turn-based combat.
//
// Clair Obscur's principle, verbatim from Sandfall's CTO: "every single move in
// the game, during battle in particular, is a level sequence." Turn-based combat
// is a bounded scene — authored camera, scripted timing, predictable actors — so
// every point of polish lands. This module is the authoring layer.
//
// A TIMELINE is a plain array of { t, ...actions } steps, where `t` is seconds
// from the start of the move. The runner schedules each step and drives:
//   • camera offset moves (scene.cineCam / cineReset — dolly, snap, orbit)
//   • hit-stop (scene.hitStop) and punch-in (scene.punchIn)
//   • rim-light beats + backdrop darken (scene.rimBeat / backdropDarken)
//   • technical glitch jitter (scene.glitch)
//   • particle accents (burst / ring / stream / rise) and screen flashes
//   • DOM FX overlays (hud.pulseOverlay: vignette / grid / scanline)
//   • named callbacks (opts.on[...]) so the caller can sync HUD / damage beats
//
// CAMERA GRAMMAR (COMP_CARD §3): dolly toward the ACTOR on wind-up, snap toward
// the TARGET on impact, settle back with ease-out. Punch-in is reserved for
// crits / weakness hits. Never nauseating — offsets are small (<~14° equivalent
// at the 5-unit base distance) and every timeline ends by returning to rest.
//
// This layer is ADDITIVE: it owns the camera + cinematic flourishes and lets the
// existing CombatState hit-choreography keep ownership of damage numbers and the
// core impact particles, so wiring it in cannot regress the shipped feel.

// ── Camera poses ───────────────────────────────────────────────────────────
// Each pose is an OFFSET (pos + lookAt) relative to the rest camera. Kept small.
const POSES = {
  rest:       { pos: { x: 0,     y: 0,     z: 0    }, look: { x: 0,    y: 0,     z: 0    } },
  // Anticipation: a brief settle-BACK coil before the strike, so the strip opens
  // on a wind-up (ANTICIPATION → IMPACT) instead of mid-swing (IMPACT → IMPACT).
  windup:     { pos: { x: 0.12,  y: 0.07,  z: 0.30  }, look: { x: 0.14, y: 0.00,  z: 0.12  } },
  // Wind-up: drift toward Andrew's front-right corner and tip the aim his way.
  actor:      { pos: { x: 0.45,  y: -0.04, z: -0.10 }, look: { x: 0.55, y: -0.05, z: 1.10 } },
  actorLat:   { pos: { x: 0.85,  y: 0.00,  z: -0.05 }, look: { x: 0.40, y: 0.00,  z: 0.35 } },
  // Impact: push in on the enemy (center-back) and aim down the barrel. The
  // standard push is modest (the basic-attack anim already dollies the base
  // pose); targetHard is reserved for crits / weakness / power beats.
  target:     { pos: { x: 0,     y: 0.05,  z: -0.34 }, look: { x: 0,    y: 0.05,  z: -0.22 } },
  targetHard: { pos: { x: 0,     y: 0.10,  z: -0.70 }, look: { x: 0,    y: 0.06,  z: -0.32 } },
  // Power move: drop low and aim UP at the enemy for a dominance angle.
  low:        { pos: { x: -0.10, y: -0.55, z: -0.85 }, look: { x: 0,    y: 0.42,  z: -0.30 } },
  // Recoil: pull back toward the viewer (we just got hit).
  recoil:     { pos: { x: 0,     y: -0.08, z: 0.42  }, look: { x: 0,    y: 0.00,  z: 0.22  } },
  recoilHard: { pos: { x: 0,     y: -0.12, z: 0.58  }, look: { x: 0,    y: 0.00,  z: 0.28  } },
  // Victim cut: swing to ANDREW's front-LEFT and look back at his face (shot/
  // reverse-shot grammar). The allies are blocked back-3/4 facing the enemy, so
  // a near/front camera only saw the back of his skull. Because the block holds a
  // quarter shy of dead-on, his face is angled to the SIDE — this pose reaches it
  // from stage-left at MODERATE depth (camPos ≈ (0.05, 1.95, 2.55)) without
  // crossing down to the enemy mark (which clipped the lens into the enemy's body
  // — verified on the burst). Andrew's staggering face + the damage number own
  // the frame; aimed at his head (~2.05, 1.5, 3.40).
  // V8.1: the two victim poses are the only ones authored in near-ABSOLUTE terms
  // (they aim at Andrew's head on the front stage, not at a small delta from the
  // rest aim), so the 0.55 stage lift added to _basePos.y/_baseLook.y in
  // CombatScene would have carried them 0.55 above his crown. Both y values are
  // rebased by −0.55 here, which puts the camera and the aim back at the exact
  // world position and world target they shipped at — the victim cut is
  // unchanged. Every other pose is a small delta on the rest aim and simply
  // translates with the stage, which is what the lift is for.
  // H-run G15: at −2.72/−2.88 the ride-out clipped the lens into Andrew's
  // shoulder — a pink blur occupying the right third of the frame at +1737ms of
  // the enemy beat. Pulled back to −2.30/−2.45; re-verify with
  // `node tools/meshy-framing-gate.mjs --all` after any further change here.
  victim:     { pos: { x: -0.55, y: -0.11, z: -2.30 }, look: { x: 2.05, y: 0.35,  z: 3.40  } },
  victimHard: { pos: { x: -0.45, y: -0.17, z: -2.45 }, look: { x: 2.08, y: 0.33,  z: 3.42  } },
  // Enemy coil: lean gently toward them as they wind up.
  lean:       { pos: { x: 0,     y: 0.05,  z: -0.30 }, look: { x: 0,    y: 0.05,  z: -0.18 } },
  leanHeavy:  { pos: { x: 0,     y: 0.11,  z: -0.46 }, look: { x: 0,    y: 0.05,  z: -0.26 } },
  // Self-buff framing: hold Andrew and lift a touch.
  hero:       { pos: { x: 0.52,  y: 0.24,  z: 0.48  }, look: { x: 0.40, y: 0.10,  z: 0.48  } },
  // Overhead (legal slam): rise before the downward strike.
  overhead:   { pos: { x: 0.18,  y: 0.52,  z: -0.18 }, look: { x: 0,    y: -0.12, z: 0.00  } },
  // Intro orbit anchors.
  introWide:  { pos: { x: -1.30, y: 0.60,  z: 0.30  }, look: { x: 0.40, y: 0.05,  z: -0.20 } },
  introMid:   { pos: { x: -0.42, y: 0.20,  z: -0.14 }, look: { x: 0.10, y: 0.03,  z: -0.10 } },
};

// ── Timelines ──────────────────────────────────────────────────────────────
// Standard moves 0.6–1.1s; power moves ~1.6s. Impact beats are tuned to land on
// the same frame the existing CombatState choreography spawns damage numbers.

// CONTACT ANCHORING. The step carrying `impact: true` is the frame the blow
// lands. When play() is handed a measured `contactMs` the WHOLE timeline slides
// so that step sits on it — so a camera beat can never again go home 155ms
// before the fist arrives. Timelines with no impact step are unaffected.
//
// CUTS, NOT LERPS (Persona §2.1.1): the impact move eases at 26-30, which at
// this rig's exponential smoothing is a cut in one to two frames. Easing reads
// as hesitation; cutting reads as confidence, and it is free.
const DEFAULT_ATTACK = [
  { t: 0.00, cam: 'windup', ease: 3.4 },                 // anticipation coil
  { t: 0.10, cam: 'actor',  ease: 12 },                  // dolly onto the actor
  { t: 0.26, cam: 'target', ease: 26, impact: true },    // CUT to target — impact
  { t: 0.66, cam: 'rest',   ease: 3.2 },                 // impact + 0.40 — the camera stays for the hold
];

// Crit / weakness — punch-in + a rim spike are reserved for these.
const CRIT = [
  { t: 0.00, cam: 'windup',     ease: 3.6 },
  { t: 0.10, cam: 'actor',      ease: 12 },
  { t: 0.26, cam: 'targetHard', ease: 30, impact: true },
  { t: 0.72, cam: 'rest',       ease: 3.0 },
];

// Ability flavor by tag. legal = paper-flurry + overhead slam; social = lateral
// dolly + speech-bubble shockwave; audit = cold zoom + grid flash; technical =
// glitch jitter + scanline pulse. Particle/overlay accents here are NEW layers
// that read on top of the per-ability VFX already in CombatState.
const ABILITY_BY_TAG = {
  legal: [
    { t: 0.00, cam: 'overhead',   ease: 6 },
    { t: 0.30, burst: { at: 'enemy', y: 2.3, count: 24, color: 0xfff2cc, speed: 1.5, lifetime: 1.0 } }, // paper flurry (low speed + gravity = fluttering fall)
    { t: 0.32, cam: 'targetHard', ease: 24, hitstop: 0.09, punch: 0.4, impact: true },
    { t: 0.72, cam: 'rest',       ease: 3.0 },
  ],
  social: [
    { t: 0.00, cam: 'actorLat', ease: 5 },
    { t: 0.28, cam: 'target',   ease: 22, hitstop: 0.06, impact: true },
    { t: 0.28, ring: { at: 'enemy', y: 1.4, count: 26, color: 0x66bbff, speed: 4.6, lifetime: 0.7 } }, // speech-bubble shockwave
    { t: 0.68, cam: 'rest',     ease: 3.2 },
  ],
  audit: [
    { t: 0.00, cam: { pos: { x: 0, y: 0.14, z: -0.34 }, look: { x: 0, y: 0.05, z: -0.20 } }, ease: 4 }, // slow cold zoom
    { t: 0.30, cam: 'targetHard', ease: 22, hitstop: 0.07, flash: { color: 0x66ff99, dur: 0.10 }, impact: true },
    { t: 0.30, overlay: { kind: 'grid', color: '#66ff99', ms: 340 } },
    { t: 0.70, cam: 'rest',       ease: 3.2 },
  ],
  technical: [
    { t: 0.00, cam: 'actor',  ease: 7, glitch: { amount: 0.05, seconds: 0.5 } },
    { t: 0.08, overlay: { kind: 'scanline', color: '#cc88ff', ms: 520 } },
    { t: 0.26, cam: 'target', ease: 24, hitstop: 0.06, glitch: { amount: 0.08, seconds: 0.3 }, impact: true },
    { t: 0.66, cam: 'rest',   ease: 3.2 },
  ],
};

// Self-buff / self-heal ability framing (no target snap).
const SELF_ABILITY = [
  { t: 0.00, cam: 'hero', ease: 3.2, rim: 0.35 },
  { t: 0.70, cam: 'rest', ease: 2.8 },
];

const POWER_MOVE = [
  { t: 0.00, cam: 'low',        ease: 2.2, darken: { amount: 0.30, hold: 1200 } }, // slow low push-in, world darkens
  { t: 0.34, rim: 0.4 },
  { t: 0.42, cam: 'low',        ease: 2.0 },                                        // re-assert the push
  { t: 0.68, cam: 'targetHard', ease: 26, impact: true },
  { t: 0.68, burst: { at: 'enemy', y: 1.2, count: 40, color: 0xffd700, speed: 5, lifetime: 1.2 } },
  // THE CARD. Slams on the contact beat, in the same frame as the flash, the
  // hit-stop and the damage number — never before it. It replaces the old
  // showBanner('ASSERT DOMINANCE') title; showBanner itself still serves
  // COMPOSURE BROKEN / MOTION VOID / the Loop-In line.
  //
  // 900 ms, not 1300. The card and the damage number are spawned on the SAME
  // frame, and FloatingText's life is 820 ms — so a 1300 ms card held ~480 ms
  // of plate with nothing under it, which reads as the beat having already
  // ended while the art is still up. 900 lets the card outlive its number by
  // 80 ms and land last. The boss-kill card keeps 1300 because it deliberately
  // fires AFTER the final number has resolved, not on top of it.
  { t: 0.68, splash: { card: 'assert_dominance', ms: 900 } },
  { t: 1.60, cam: 'rest',       ease: 2.4 },
];

const SECOND_WIND = [
  { t: 0.00, cam: 'hero', ease: 3.0, rim: 0.4 },
  { t: 0.70, cam: 'rest', ease: 2.8 },
];

const RETALIATE = [
  { t: 0.00, cam: 'actorLat',   ease: 8 },
  { t: 0.18, cam: 'targetHard', ease: 24, hitstop: 0.08, punch: 0.4, rim: 0.6, impact: true },
  { t: 0.58, cam: 'rest',       ease: 3.2 },
];

// Desperate Gamble — risk-tiered drama.
const DESPERATE_GAMBLE = {
  safe: [
    { t: 0.00, cam: 'actor',  ease: 6 },
    { t: 0.20, cam: 'target', ease: 22, hitstop: 0.05, impact: true },
    { t: 0.60, cam: 'rest',   ease: 3.2 },
  ],
  risky: [
    { t: 0.00, cam: 'actorLat',   ease: 3.6 }, // a beat of hesitation…
    { t: 0.22, cam: 'targetHard', ease: 24, hitstop: 0.08, punch: 0.4, rim: 0.5, impact: true }, // …then commit
    { t: 0.62, cam: 'rest',       ease: 3.0 },
  ],
  all_in: [
    { t: 0.00, cam: 'low',        ease: 2.6, darken: { amount: 0.4, hold: 800 } },
    { t: 0.08, overlay: { kind: 'vignette', color: '#ff4466', ms: 620 } },
    { t: 0.22, cam: 'targetHard', ease: 26, hitstop: 0.14, punch: 0.95, rim: 1.0, flash: { color: 0xff4466, dur: 0.10 }, impact: true },
    // The All-In card fires only when the 40% lands — CombatState passes
    // `splash: false` on a miss, because a splash card on a whiffed gamble
    // reads as a reward for losing.
    // 900 for the same reason as the Assert Dominance card above: it fires on
    // the impact step, so it shares a frame with an 820 ms damage number.
    { t: 0.22, splash: { card: 'all_in', ms: 900, gated: true } },
    { t: 0.90, cam: 'rest',       ease: 2.6 },
  ],
};

// Enemy attack — lean toward them on the coil, then CUT to the victim (Andrew)
// as the blow crosses into him. A held recoil-only beat left Andrew off-frame as
// a corner HP number; framing him lets the stagger + hurt-anim read.
const ENEMY_ATTACK = [
  { t: 0.00, cam: 'lean',   ease: 4 },                               // coil toward the winding-up enemy
  // THE PLAYER MUST SEE THE BLOW. The shipped timeline cut to the victim AT
  // t 0.30 — measured 786ms before the attacker's committed shove — so at the
  // real contact frame the attacker was entirely off camera. `lean` now HOLDS
  // through contact and the reverse cut lands 60ms after it.
  { t: 0.30, impact: true, shake: 0.5 },
  // B21 — 60 ms WAS NOT ENOUGH. Playtest note: "enemy attacks too fast to
  // read." The combat hunt closed A1 (the real regression was a Meshy warm-up
  // ceiling staging an A-pose body) but measured a genuine residual underneath
  // it: with the cut at contact+60 ms the attacker is on camera for only 293 ms
  // on the female attack clip and 426 ms on the male, which is less than half a
  // second to see who hit you and with what. The cut is now contact+180 ms, the
  // top of the 150-200 ms band the hunt recommended. That is the ONE LINE fix;
  // the alternative was widening the a214 clip trim, which would have made the
  // meshy-spine-gate re-run mandatory and is a bigger, riskier change for the
  // same 120 ms.
  // FIX ROUND 2 — MEASURED AFTER, not asserted. `node tools/_fr2-b21.mjs`
  // steps this timeline deterministically off the live animators' contactMs
  // and reports attacker-on-camera at the cut: female (a214, karen) 293 ->
  // 413 ms, male (a191, chad) 426 -> 546 ms. Replayed on the pre-fix cut the
  // instrument returns 293 / 426 bit-exact, which is what makes it the hunt's
  // method rather than a new one. Taking the body's last in-frame projection
  // instead of the cut frame reads 417 -> 550 and 567 -> 683.
  { t: 0.48, cam: 'victim', ease: 18, hitstop: 0.06 },               // hard CUT/reverse to Andrew, 180ms after the blow
  // Impact ACCENT — a hit-spark burst ON the victim's chest + a punch-in, timed so
  // it is still FRESH on the post-cut impact frame (~0.46) instead of firing at the
  // cut and being gone by the time the frame is grabbed (critic #2: "f2 carries no
  // flash, no particles, no shake smear — signified entirely by UI"). No full-screen
  // colour flash here — it fought the stage geometry into an ugly asymmetric wash;
  // the bright spark burst reads as the flash-pop and the real game still flashes
  // via CombatState's own enemy-hit beat.
  // (moved with the cut: the accent is timed to be FRESH on the post-cut frame,
  // so it has to stay 100 ms behind it, not at a fixed absolute time.)
  { t: 0.58, punch: 0.5,
    burst: { at: 'player', y: 1.6, count: 22, color: 0xff5566, speed: 3.4, lifetime: 0.6 } },
  { t: 0.64, cam: 'victim', ease: 6 },                               // ride the victim through the follow-through
  { t: 1.02, cam: 'rest',   ease: 2.8 },
];

// Enemy HEAVY (telegraphed) — leaning anticipation + screen-edge vignette pulse
// BEFORE the impact, then a hard cut to the victim with punch + heavier shake.
const ENEMY_HEAVY = [
  { t: 0.00, cam: 'leanHeavy',  ease: 2.8 },
  { t: 0.02, overlay: { kind: 'vignette', color: '#e94560', ms: 700 } },
  { t: 0.12, rim: 0.4 },
  { t: 0.30, impact: true, shake: 0.75 },                        // the blow lands, still on the attacker
  // B21, same band as ENEMY_ATTACK. The heavy was cutting at contact+40 ms —
  // TIGHTER than the light attack, on the move the player is meant to have
  // read a telegraph for and to be watching most closely. contact+180 ms.
  { t: 0.48, cam: 'victimHard', ease: 18, hitstop: 0.13 },       // reverse cut 180ms after contact
  // Impact ACCENT — a bigger hit-spark burst ON the victim + a hard punch-in,
  // timed to land fresh on the post-cut impact frame (critic #2).
  { t: 0.62, punch: 0.7,
    burst: { at: 'player', y: 1.6, count: 32, color: 0xff4455, speed: 4.4, lifetime: 0.7 } },
  { t: 0.68, cam: 'victimHard', ease: 6 },
  { t: 1.08, cam: 'rest',       ease: 2.6 },
];

// Enemy intro — a camera orbit-settle onto the enemy, choreographed with the
// slide-in already running in CombatScene and the DOM name banner.
const ENEMY_INTRO = [
  { t: 0.00, cam: 'introWide', ease: 22 },  // snap out to the wide vantage as the enemy slides in
  { t: 0.45, cam: 'introMid',  ease: 2.0 },  // slow arc toward a ¾ framing
  { t: 1.05, cam: 'rest',      ease: 2.2 },  // settle to the fighting rest pose
];

const TIMELINES = {
  DEFAULT_ATTACK, CRIT, SELF_ABILITY, POWER_MOVE, SECOND_WIND,
  RETALIATE, ENEMY_ATTACK, ENEMY_HEAVY, ENEMY_INTRO,
};

// ── Arena palettes ─────────────────────────────────────────────────────────
// Per-venue backdrop swirl colors + rim tints. bg = [uColor1..4]; rimHot/rimCool
// re-tint the two back rims so silhouette separation matches the room.
// `pool` re-tints the stage-floor pool + the actors' contact-glow so the FLOOR
// carries the venue too — without it every arena shared the shipped red pool and
// read as the same "red-void" regardless of backdrop/rim (critic: venues not
// distinct). Defaults to rimHot when omitted.
export const ARENA_PALETTES = {
  // conference — corporate fluorescent crimson (cool office rim, pink accent)
  conference: { bg: [0x240409, 0x090610, 0x1e0a20, 0xe83a5c], rimHot: 0xff4d6a, rimCool: 0x6aa8d8, pool: 0xff4d70 },
  // Karen — hot magenta entitlement: the loudest, pinkest room (distinct from
  // Chad's amber and Grandma's violet so the three Henderson stills are NOT
  // interchangeable rooms — critic: "venues not distinct across the boss roster").
  karen:      { bg: [0x2a0410, 0x0c0410, 0x220820, 0xff2d6f], rimHot: 0xff4d8a, rimCool: 0x6a9cd8, pool: 0xff3d7a },
  // Chad — finance-bro amber/gold, warm and smug.
  chad:       { bg: [0x1e1204, 0x120a04, 0x1a1006, 0xe0902a], rimHot: 0xffb030, rimCool: 0x6a8cc0, pool: 0xffa838 },
  // Grandma — sweet-but-lethal cold lavender/violet (doily lace over a knife).
  grandma:    { bg: [0x140a20, 0x0a0818, 0x1a1030, 0x8a6ad0], rimHot: 0xb48ae0, rimCool: 0x7fa0e8, pool: 0xa87ae0 },
  // parking garage — dirty sodium orange-red on concrete (distinct from office)
  garage:     { bg: [0x1a0c04, 0x0a0806, 0x160a05, 0xc85028], rimHot: 0xff5a28, rimCool: 0x4a6a90, pool: 0xff6a30 },
  // server — terminal green-cyan
  server:     { bg: [0x02100c, 0x03110f, 0x041a15, 0x1fd6a0], rimHot: 0x22e0b0, rimCool: 0x30c8ff, pool: 0x28e0a8 },
  // board room — cold gold
  board:      { bg: [0x0c0a04, 0x141008, 0x0a0a0a, 0xd0a840], rimHot: 0xe0b850, rimCool: 0x7fa8d8, pool: 0xe0c060 },
  // penthouse — void purple
  penthouse:  { bg: [0x0c0518, 0x120a22, 0x08040f, 0x8a44cc], rimHot: 0x9a52e0, rimCool: 0x5a6cff, pool: 0x9a5ae0 },
  // reception roguelite — neutral navy
  reception:  { bg: [0x05101e, 0x0a1830, 0x060a16, 0x3a6fae], rimHot: 0x4a80c0, rimCool: 0x6ea8ff, pool: 0x4a86d0 },
};

// enemy/encounter id → venue. Anything unmapped falls back to conference.
const ARENA_BY_ID = {
  // Henderson bosses — each its own venue so the fights aren't the same room
  karen: 'karen', chad: 'chad', grandma: 'grandma',
  // conference room family
  compliance: 'conference', regional: 'conference', skip_boss: 'conference',
  hr_rep: 'conference',
  // parking garage / street toughs
  parking_enforcer: 'garage', networking_guy: 'garage', security_guard: 'garage',
  // server room / machine
  algorithm: 'server', cfos_assistant: 'server', data_analytics_lead: 'server',
  data_analytics_duo: 'server',
  // board room / restructuring suits
  corporate_lawyer: 'board', restructuring_analyst: 'board', brand_consultant: 'board',
  chief_of_restructuring: 'board', restructuring_trio: 'board', restructuring: 'board',
  // penthouse / final bosses
  meredith_boss: 'penthouse', regional_director: 'penthouse', the_firm: 'penthouse',
  // reception roguelite / early
  reception_client: 'reception', intern: 'reception',
};

// Resolve a venue for a fight. Encounter `arena` field wins (editor-tunable in
// encounters/index.js), then the id map, then a conference-room default.
export function resolveArena(encounterConfig = {}, enemyId = '') {
  if (encounterConfig && encounterConfig.arena && ARENA_PALETTES[encounterConfig.arena]) {
    return encounterConfig.arena;
  }
  return ARENA_BY_ID[enemyId] || 'conference';
}

// ── The sequencer ──────────────────────────────────────────────────────────
export class CombatCinematics {
  constructor(scene, hud = null, particles = null) {
    this.scene = scene;
    this.hud = hud;
    this.particles = particles;
    // THE CONTACT CLOCK. Set by CombatState. Fired on the step marked
    // `impact: true`, i.e. on the frame the fist lands. This is a GAME-clock
    // callback (update(dt)), which is why the impact chain hangs off it rather
    // than off setTimeout: measured under capture load, a wall-clock timer
    // scheduled for the contact frame fired 51ms late, while the timeline step
    // landed within 5ms of its authored time.
    this.onImpact = null;
    // The active timeline is advanced on the GAME CLOCK via update(dt) — NOT
    // wall-clock setTimeout. Camera moves therefore stay locked to the
    // character gestures + hit-stop (which are also game-clock), so the impact
    // beat never races ahead of the body under a low/variable frame rate
    // (headless capture, in-game hitches). This is what let the old burst catch
    // the camera at "rest" while the strike was still mid-swing.
    this._active = null; // { steps, opts, t, i }
  }

  // Resolve a semantic name (+ opts) to a concrete timeline.
  _resolve(name, opts) {
    switch (name) {
      case 'attack':       return opts.crit ? CRIT : DEFAULT_ATTACK;
      case 'ability':      return ABILITY_BY_TAG[opts.tag] || (opts.crit ? CRIT : DEFAULT_ATTACK);
      case 'self_ability': return SELF_ABILITY;
      case 'power':        return POWER_MOVE;
      case 'second_wind':  return SECOND_WIND;
      case 'retaliate':    return RETALIATE;
      case 'gamble':       return DESPERATE_GAMBLE[opts.risk] || DESPERATE_GAMBLE.safe;
      case 'enemy_attack': return opts.heavy ? ENEMY_HEAVY : ENEMY_ATTACK;
      case 'intro':        return ENEMY_INTRO;
      default:             return TIMELINES[name] || null;
    }
  }

  // Play a named timeline. Cancels any in-flight timeline first so a fresh move
  // never fights leftover camera targets from the previous one. Steps then fire
  // from update(dt) as the game clock passes each step's `t`.
  play(name, opts = {}) {
    const tl = this._resolve(name, opts);
    if (!tl || !this.scene) return 0;
    this.cancel();
    // ── CONTACT ANCHOR ──────────────────────────────────────────────────
    // Slide the timeline so the step marked `impact: true` lands on the
    // measured contact frame of the body clip that is actually playing. The
    // wind-up section [0, anchor] is STRETCHED (so the coil still starts on
    // frame 0 and reads as anticipation) and everything after the impact is
    // shifted RIGIDLY (so the hold and the ride-out keep their authored
    // spacing). With no contactMs the map is the identity and every timeline
    // plays exactly as authored.
    const anchor = tl.find(s => s.impact);
    const contact = Number.isFinite(opts.contactMs) ? opts.contactMs / 1000 : null;
    const at = anchor ? (anchor.t || 0) : 0;
    const remap = (contact != null && anchor && at > 0)
      ? (t) => (t <= at ? t * (contact / at) : t + (contact - at))
      : (t) => t;
    let maxT = 0;
    const steps = tl.map(s => { const t = remap(s.t || 0); maxT = Math.max(maxT, t); return { ...s, t }; })
                    .sort((a, b) => a.t - b.t);
    this._active = { steps, opts, t: 0, i: 0 };
    return maxT;
  }

  // Advance the active timeline on the game clock. Called every frame by
  // CombatState.update. Fires each step once its scheduled time has elapsed.
  update(dt) {
    const a = this._active;
    if (!a || !this.scene) return;
    a.t += dt;
    while (a.i < a.steps.length && a.steps[a.i].t <= a.t) {
      this._exec(a.steps[a.i], a.opts);
      a.i++;
    }
    if (a.i >= a.steps.length) this._active = null;
  }

  // Resolve a particle anchor keyword to a world position. 'player' resolves to
  // the ACTUAL victim (ally 0) stage position so impact sparks land ON Andrew,
  // not at a hardcoded center-stage guess (Andrew stands front-right at ~2.2,3.5).
  _anchor(at, y) {
    if (at && typeof at === 'object') return at;
    if (at === 'player') {
      const a = this.scene && this.scene.allyGroups && this.scene.allyGroups[0];
      if (a) return { x: a.baseX, y: y ?? 1.3, z: a.baseZ };
      return { x: 0, y: y ?? 1.2, z: 4 };
    }
    return { x: 0, y: y ?? 1.2, z: 0 }; // 'enemy' / default = back-center stage
  }

  _exec(step, opts) {
    const s = this.scene;
    if (!s) return;

    // CONTACT. Fires before anything else on this step so the impact chain owns
    // the frame the camera cuts on.
    if (step.impact && this.onImpact) this.onImpact();

    // Camera move
    if (step.cam !== undefined) {
      const ease = step.ease ?? 6;
      if (step.cam === 'rest') {
        s.cineReset(ease);
      } else if (typeof step.cam === 'string') {
        const p = POSES[step.cam];
        if (p) {
          // Bias the impact aim toward the actual target enemy if we have one.
          let look = p.look;
          if (opts.targetIndex != null && s.enemyGroups && s.enemyGroups[opts.targetIndex]) {
            const bx = s.enemyGroups[opts.targetIndex].baseX || 0;
            look = { x: (p.look.x || 0) + bx * 0.28, y: p.look.y, z: p.look.z };
          }
          s.cineCam(p.pos, look, ease);
        }
      } else {
        s.cineCam(step.cam.pos || null, step.cam.look || null, ease);
      }
    }

    if (step.hitstop) s.hitStop(step.hitstop);
    if (step.punch)   s.punchIn(step.punch);
    if (step.shake)   s.shake(step.shake);
    if (step.rim)     s.rimBeat(step.rim);
    if (step.glitch)  s.glitch(step.glitch.amount, step.glitch.seconds);
    if (step.darken)  s.backdropDarken(step.darken.amount, step.darken.hold);
    if (step.flash)   s.flash(step.flash.color, step.flash.dur);

    // Particle accents
    if (this.particles) {
      if (step.burst)  { const a = this._anchor(step.burst.at,  step.burst.y);  this.particles.burst(a, step.burst.count, step.burst.color, step.burst.speed, step.burst.lifetime); }
      if (step.ring)   { const a = this._anchor(step.ring.at,   step.ring.y);   this.particles.ring(a,  step.ring.count,  step.ring.color,  step.ring.speed,  step.ring.lifetime); }
      if (step.stream) { this.particles.stream(step.stream.from, step.stream.to, step.stream.count, step.stream.color, step.stream.lifetime); }
      if (step.rise)   { const a = this._anchor(step.rise.at,   step.rise.y);   this.particles.rise(a,  step.rise.count,  step.rise.color,  step.rise.lifetime); }
    }

    // DOM FX overlay (vignette / grid / scanline)
    if (step.overlay && this.hud && this.hud.pulseOverlay) {
      this.hud.pulseOverlay(step.overlay.kind, step.overlay.color, step.overlay.ms);
    }

    // SPLASH CARD — its own channel, not a widened `pulseOverlay` colour slot:
    // a full-frame illustration has nothing in common with a colour pulse.
    // `gated: true` means the caller decides per-result (the All-In card must
    // not fire on the 60% miss), via opts.splash === false.
    if (step.splash && this.hud && this.hud.showSplashCard) {
      if (!(step.splash.gated && opts.splash === false)) {
        this.hud.showSplashCard(step.splash.card, step.splash.ms);
      }
    }

    // Named callback hook (lets the caller sync a HUD/damage beat to a step)
    if (step.call && opts.on && typeof opts.on[step.call] === 'function') {
      opts.on[step.call]();
    }
  }

  // Cancel the active timeline (does not force the camera home; the caller's next
  // play() or the natural ease handles that).
  cancel() {
    this._active = null;
  }

  dispose() {
    this.cancel();
    this.scene = null;
    this.hud = null;
    this.particles = null;
    this.onImpact = null;
  }
}
