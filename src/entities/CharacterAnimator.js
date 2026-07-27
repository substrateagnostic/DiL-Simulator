import { ANIM, CHAR } from '../utils/constants.js';

// Chair seat height matches Furniture.chair() seat position
const SEAT_Y = 0.44;

// ── Combat pose vocabulary ──────────────────────────────────────────────────
// A POSE is a set of limb-rotation targets layered on top of idle. Channels:
//   la/ra  = left/right ARM  { x: fwd swing (+ = reach toward the target/camera),
//                              z: raise outward (+/- = away from body) }
//   ll/rl  = left/right LEG  { x: step swing }
//   lean   = whole-body pitch add (+ = lean forward into the strike)
//   tilt   = head pitch add  (+ = chin down, - = chin up)
// Missing channels default to 0. This is what makes the enemy ACT with its
// body — wind-up, lunge, recoil, follow-through — instead of holding a statue
// pose while the camera and particles do all the work (Clair Obscur / P5 sell
// the beat with the BODY first).
const P = (o = {}) => ({
  laX: o.laX || 0, laZ: o.laZ || 0, raX: o.raX || 0, raZ: o.raZ || 0,
  llX: o.llX || 0, rlX: o.rlX || 0, lean: o.lean || 0, tilt: o.tilt || 0,
});

// Held SIGNATURE poses — a silhouette that says who the boss is before the text
// does (P5 intro grammar). Enemies snap to these on entry and relax back to them
// between gestures, so the cast keeps its character through the whole fight.
const SIGNATURE_POSES = {
  // Karen: phone up at eye line, purse hand steady — "I'm calling corporate."
  karen:   P({ raX: 1.15, raZ: 0.18, tilt: 0.12, lean: 0.02 }),
  // Chad: double-flex, chest thrown out, wide — the finance bro cornering you.
  chad:    P({ laX: 0.2, laZ: -0.72, raX: 0.2, raZ: 0.72, lean: -0.05 }),
  // Grandma: both hands forward on the cane, hunched low over it.
  grandma: P({ raX: 0.4, raZ: -0.16, laX: 0.34, laZ: 0.16, lean: 0.14, tilt: 0.16 }),
  // Generic heavy: a coiled, arms-out menace stance.
  ready:   P({ laX: -0.12, laZ: -0.28, raX: -0.12, raZ: 0.28, lean: 0.06 }),
};

// GESTURES — time-normalised keyframe strips (t in [0,1] across the duration).
// Each enemy's attack is authored differently so the per-move authorship reads
// on camera (critic: "chad_f0 is the identical asset as karen_f0"). Wind-up →
// strike → follow-through are distinct beats, never a single snap.
// Attack gestures are authored so — on the enemy-attack contact sheet, where the
// camera holds on the attacker for the first two frames (cine 'lean', ~0.05s and
// ~0.22s) then cuts to the victim — the DEEP wind-up lands on frame 0 and the
// STRIKE lands on frame 1. Durations are short (~0.46–0.52s) so the whole coil→
// stab reads inside the pre-cut window (critic: "the attacker never raises an arm,
// zero wind-up pose change across the burst — only the tripod moves"). The wind-up
// peak is early (frac ~0.15) and BIG: rear arm cocks up-and-back, torso coils back,
// knees crouch. The strike then sweeps the arm forward and lunges the body.
const GESTURES = {
  // Karen — a phone JAB: cock the arm up-and-back + coil, then stab it forward.
  attack_karen: { dur: 0.46, keys: [
    { t: 0.00, p: SIGNATURE_POSES.karen },
    { t: 0.16, p: P({ raX: -0.95, raZ: 0.82, lean: -0.24, tilt: -0.13, llX: 0.28, rlX: 0.16 }) }, // DEEP wind-up (cock back + coil + crouch)
    { t: 0.50, p: P({ raX: 1.95, raZ: 0.10, lean: 0.32, tilt: 0.09, rlX: -0.52, llX: 0.42 }) }, // JAB (arm stabs forward, body lunges)
    { t: 0.70, p: P({ raX: 1.4, raZ: 0.14, lean: 0.16, rlX: -0.22, llX: 0.2 }) }, // follow-through
    { t: 1.00, p: SIGNATURE_POSES.karen },
  ]},
  // Chad — a two-handed SHOVE off the flex: pull the flex tighter + coil, then shove.
  attack_chad: { dur: 0.48, keys: [
    { t: 0.00, p: SIGNATURE_POSES.chad },
    { t: 0.16, p: P({ laX: -0.6, laZ: -1.0, raX: -0.6, raZ: 1.0, lean: -0.26, tilt: -0.1, llX: 0.2, rlX: 0.2 }) }, // load + coil + crouch
    { t: 0.50, p: P({ laX: 1.7, laZ: -0.1, raX: 1.7, raZ: 0.1, lean: 0.34, rlX: -0.55, llX: 0.44 }) }, // SHOVE (both arms punch out, body lunges)
    { t: 0.70, p: P({ laX: 1.15, laZ: -0.1, raX: 1.15, raZ: 0.1, lean: 0.16 }) },
    { t: 1.00, p: SIGNATURE_POSES.chad },
  ]},
  // Grandma — a CANE SWIPE: raise the cane high (big overhead cock), then down across.
  attack_grandma: { dur: 0.52, keys: [
    { t: 0.00, p: SIGNATURE_POSES.grandma },
    { t: 0.18, p: P({ raX: -1.25, raZ: 0.4, laX: 0.14, lean: -0.16, tilt: -0.08, rlX: 0.14 }) }, // raise cane high + coil
    { t: 0.52, p: P({ raX: 1.35, raZ: -0.3, laX: 0.2, lean: 0.24, rlX: -0.4, tilt: 0.12 }) }, // swipe down + lunge
    { t: 0.72, p: P({ raX: 0.9, raZ: -0.2, lean: 0.1, tilt: 0.14 }) },
    { t: 1.00, p: SIGNATURE_POSES.grandma },
  ]},
  // Generic strike — a committed one-arm shove for the unauthored roster.
  attack_shove: { dur: 0.46, keys: [
    { t: 0.00, p: P() },
    { t: 0.16, p: P({ raX: -0.95, raZ: 0.4, lean: -0.2, llX: 0.2, rlX: 0.16 }) }, // deep wind-up + coil + crouch
    { t: 0.50, p: P({ raX: 1.85, raZ: 0.16, lean: 0.3, rlX: -0.5, llX: 0.4 }) }, // strike + lunge
    { t: 0.70, p: P({ raX: 1.3, raZ: 0.12, lean: 0.12 }) },
    { t: 1.00, p: P() },
  ]},
  // HURT — a fast recoil flinch: throw the arms up, snap the torso back.
  hurt: { dur: 0.42, keys: [
    { t: 0.00, p: P() },
    { t: 0.28, p: P({ laX: -0.5, laZ: -0.35, raX: -0.5, raZ: 0.35, lean: -0.26, tilt: -0.18 }) },
    { t: 0.62, p: P({ laX: -0.2, raX: -0.2, lean: -0.1 }) },
    { t: 1.00, p: P() },
  ]},
  // CAST — scheming/heal/buff: raise both hands, hold, gather.
  cast: { dur: 0.72, keys: [
    { t: 0.00, p: P() },
    { t: 0.30, p: P({ laX: -0.7, laZ: -0.5, raX: -0.7, raZ: 0.5, lean: -0.04, tilt: -0.08 }) },
    { t: 0.66, p: P({ laX: -0.5, laZ: -0.35, raX: -0.5, raZ: 0.35 }) },
    { t: 1.00, p: P() },
  ]},
  // Ally strike — Andrew/party sell their own swing (usually seen from behind).
  // Wind-up cocks the arm back and coils the torso before the forward swing so
  // the swing reads as an ACT, not a positional slide (critic: note 1, player too).
  attack_ally: { dur: 0.50, keys: [
    { t: 0.00, p: P() },
    { t: 0.18, p: P({ raX: -0.8, raZ: 0.3, lean: -0.16, rlX: 0.14 }) }, // cock back + coil
    { t: 0.46, p: P({ raX: 1.7, raZ: 0.14, lean: 0.24, rlX: -0.36, llX: 0.3 }) }, // swing forward + lunge
    { t: 0.66, p: P({ raX: 1.2, raZ: 0.12, lean: 0.12 }) },
    { t: 1.00, p: P() },
  ]},
};

// Blend two poses (linear).
function lerpPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

// Sample a keyframe strip at normalised time frac ∈ [0,1].
function sampleStrip(keys, frac) {
  if (frac <= keys[0].t) return keys[0].p;
  for (let i = 1; i < keys.length; i++) {
    if (frac <= keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      const span = b.t - a.t || 1;
      return lerpPose(a.p, b.p, (frac - a.t) / span);
    }
  }
  return keys[keys.length - 1].p;
}

export class CharacterAnimator {
  constructor(characterGroup) {
    this.group = characterGroup;
    this.time = 0;
    this.isWalking = false;
    this.isSitting = false;
    this.facingAngle = 0; // radians
    // Blink state
    this._blinkIn = 1.5 + Math.random() * 3.5;
    this._blinkDur = 0;
    // Our additive contribution to group.rotation.x (walk lean) —
    // tracked separately so combat animations can own rotation.x too.
    this._appliedLean = 0;
    // Expression hold timer (setExpression with hold auto-reverts)
    this._exprHold = 0;

    // ── Combat pose / gesture layer ───────────────────────────────────────
    // _signature: a held silhouette pose (or null). _gesture: a one-shot
    // keyframed strip that overrides the signature while it plays. _cp: the
    // currently-applied pose, eased toward the target so limbs never snap.
    this._signature = null;
    this._gesture = null;          // { strip, t }
    this._cp = P();                // applied pose this frame
    this._cpActive = false;        // are we currently overriding idle limbs?
    this._appliedPoseLean = 0;     // our additive share of group.rotation.x
    this._baseArmZ = null;         // build-time arm.rotation.z (left/right)
  }

  // Snap this character to a held signature pose (intro silhouette / boss idle).
  // The applied pose is seeded to the target immediately so the silhouette is
  // fully struck on the FIRST rendered frame — the intro banner is captured very
  // early, and under a slow frame rate an eased-in pose would still read as a
  // limp A-stand at capture time (critic #8).
  setSignaturePose(name) {
    this._signature = SIGNATURE_POSES[name] || null;
    if (this._signature) {
      this._cp = { ...this._signature };
      this._cpActive = true;
    }
  }

  clearSignaturePose() { this._signature = null; }

  // Fire a one-shot gesture (attack / hurt / cast). Overrides the signature for
  // its duration, then eases back to the signature (or idle if none).
  playGesture(name) {
    const strip = GESTURES[name];
    if (!strip) return;
    this._gesture = { strip, t: 0 };
  }

  // Swap the painted face texture (PS1 style — expressions are textures).
  // hold > 0 reverts to neutral after that many seconds. No-ops on
  // faceless builds (monolith).
  setExpression(name, hold = 0) {
    const tex = this.group.faceTextures?.[name] || this.group.faceTextures?.neutral;
    if (!tex || !this.group.faceMesh) return;
    this.group.faceMesh.material.map = tex;
    this.group.faceMesh.material.needsUpdate = true;
    this._exprHold = hold > 0 ? hold : 0;
  }

  setWalking(walking) {
    this.isWalking = walking;
  }

  setSitting(sitting) {
    this.isSitting = sitting;
    if (!sitting) {
      this.group.position.y = 0;
      // Straighten the knees again (they fold for the seated pose).
      if (this.group.leftLeg?.knee)  this.group.leftLeg.knee.rotation.x  = 0;
      if (this.group.rightLeg?.knee) this.group.rightLeg.knee.rotation.x = 0;
    }
  }

  setFacing(angle) {
    this.facingAngle = angle;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;

    // Auto-revert held expressions
    if (this._exprHold > 0) {
      this._exprHold -= dt;
      if (this._exprHold <= 0) this.setExpression('neutral');
    }

    if (this.isSitting) {
      // Drop the hips onto the seat: hip pivot lands at SEAT_Y in world.
      // v5 legs are long (legLength ~0.70), so this is negative — the thigh
      // folds forward and the shin bends back down to the floor via the
      // per-leg knee pivot, instead of the whole body floating above the
      // chair (the old Math.max(0.02, …) clamp only worked for v4's 0.35 legs).
      const legLen = this.group.legLength ?? CHAR.LEG_HEIGHT;
      const hasKnee = !!(this.group.leftLeg && this.group.leftLeg.knee);
      this.group.position.y = hasKnee ? (SEAT_Y - legLen) : Math.max(0.02, SEAT_Y - legLen);
      // Thighs go horizontal at the hip; knees fold the shins back down.
      if (this.group.leftLeg)  this.group.leftLeg.rotation.x  = Math.PI / 2;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x = Math.PI / 2;
      if (hasKnee) {
        this.group.leftLeg.knee.rotation.x  = -Math.PI / 2;
        this.group.rightLeg.knee.rotation.x = -Math.PI / 2;
      }
      // Arms rest slightly forward
      if (this.group.leftArm)  this.group.leftArm.rotation.x  = 0.2;
      if (this.group.rightArm) this.group.rightArm.rotation.x = 0.2;
      // Subtle seated idle bob
      if (this.group.body) {
        const baseY = this.group.body.userData.baseY || this.group.body.position.y;
        if (!this.group.body.userData.baseY) this.group.body.userData.baseY = baseY;
        this.group.body.position.y = baseY + Math.sin(t * ANIM.IDLE_SPEED) * ANIM.IDLE_BOUNCE;
      }
      if (this.group.head) {
        const baseY = this.group.head.userData.baseY || this.group.head.position.y;
        if (!this.group.head.userData.baseY) this.group.head.userData.baseY = baseY;
        this.group.head.position.y = baseY + Math.sin(t * ANIM.IDLE_SPEED + 0.5) * ANIM.IDLE_BOUNCE * 0.7;
      }
      this._updateFacing();
      return;
    }

    const speed = this.isWalking ? ANIM.WALK_SPEED : ANIM.IDLE_SPEED;
    const bounce = this.isWalking ? ANIM.WALK_BOUNCE : ANIM.IDLE_BOUNCE;
    const ta = t * speed;

    // Body bob with squash & stretch (breathing at idle, springy on walk)
    if (this.group.body) {
      const baseY = this.group.body.userData.baseY || this.group.body.position.y;
      if (!this.group.body.userData.baseY) this.group.body.userData.baseY = baseY;
      const phase = Math.sin(ta);
      this.group.body.position.y = baseY + phase * bounce;
      const squash = phase * bounce * 1.8;
      this.group.body.scale.y = 1 + squash;
      this.group.body.scale.x = 1 - squash * 0.5;
      this.group.body.scale.z = 1 - squash * 0.5;
    }

    // Blink — eyes squeeze shut for ~0.12s every few seconds
    if (this.group.leftEye && this.group.rightEye) {
      if (this._blinkDur > 0) {
        this._blinkDur -= dt;
        const s = this._blinkDur > 0 ? 0.12 : 1;
        this.group.leftEye.scale.y = s;
        this.group.rightEye.scale.y = s;
        if (this._blinkDur <= 0) this._blinkIn = 1.5 + Math.random() * 3.5;
      } else {
        this._blinkIn -= dt;
        if (this._blinkIn <= 0) this._blinkDur = 0.12;
      }
    }

    // Walk lean — additive so combat anims can also drive rotation.x
    const leanTarget = this.isWalking ? 0.07 : 0;
    const newLean = this._appliedLean + (leanTarget - this._appliedLean) * Math.min(dt * 10, 1);
    this.group.rotation.x += newLean - this._appliedLean;
    this._appliedLean = newLean;

    // Head bob (slight)
    if (this.group.head) {
      const baseY = this.group.head.userData.baseY || this.group.head.position.y;
      if (!this.group.head.userData.baseY) this.group.head.userData.baseY = baseY;
      this.group.head.position.y = baseY + Math.sin(ta + 0.5) * bounce * 0.7;
    }

    // Leg swing
    if (this.isWalking) {
      const legSwing = Math.sin(ta) * 0.4;
      if (this.group.leftLeg) this.group.leftLeg.rotation.x = legSwing;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x = -legSwing;

      // Arm swing (opposite to legs)
      const armSwing = Math.sin(ta) * 0.3;
      if (this.group.leftArm) this.group.leftArm.rotation.x = -armSwing;
      if (this.group.rightArm) this.group.rightArm.rotation.x = armSwing;
    } else {
      // Return to idle
      if (this.group.leftLeg) this.group.leftLeg.rotation.x *= 0.9;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x *= 0.9;
      if (this.group.leftArm) this.group.leftArm.rotation.x *= 0.9;
      if (this.group.rightArm) this.group.rightArm.rotation.x *= 0.9;
    }

    // Combat pose/gesture layer — overrides idle limbs when a boss is striking,
    // flinching, or holding a signature stance.
    this._applyCombatPose(dt);

    this._updateFacing();
  }

  // Drive the arms / legs / lean / head from the active gesture or held
  // signature pose. Eases so limbs never pop, and cleanly hands control back to
  // idle once everything has relaxed to neutral.
  _applyCombatPose(dt) {
    let target = null;
    if (this._gesture) {
      const g = this._gesture;
      g.t += dt;
      const frac = g.t / g.strip.dur;
      if (frac >= 1) this._gesture = null;
      else target = sampleStrip(g.strip.keys, frac);
    }
    if (!target) target = this._signature; // may be null

    if (!target && !this._cpActive) return; // idle owns the limbs

    const goal = target || P();
    const k = Math.min(1, dt * (this._gesture ? 18 : 10));
    this._cp = lerpPose(this._cp, goal, k);
    const cp = this._cp;

    const g2 = this.group;
    if (this._baseArmZ === null) {
      this._baseArmZ = {
        l: g2.leftArm ? g2.leftArm.rotation.z : 0,
        r: g2.rightArm ? g2.rightArm.rotation.z : 0,
      };
    }
    if (g2.leftArm)  { g2.leftArm.rotation.x  = cp.laX; g2.leftArm.rotation.z  = this._baseArmZ.l + cp.laZ; }
    if (g2.rightArm) { g2.rightArm.rotation.x = cp.raX; g2.rightArm.rotation.z = this._baseArmZ.r + cp.raZ; }
    if (g2.leftLeg)  g2.leftLeg.rotation.x  = cp.llX;
    if (g2.rightLeg) g2.rightLeg.rotation.x = cp.rlX;
    if (g2.head)     g2.head.rotation.x     = cp.tilt;
    g2.rotation.x += cp.lean - this._appliedPoseLean;
    this._appliedPoseLean = cp.lean;

    const mag = Math.abs(cp.laX) + Math.abs(cp.raX) + Math.abs(cp.llX) + Math.abs(cp.rlX)
      + Math.abs(cp.lean) + Math.abs(cp.laZ) + Math.abs(cp.raZ) + Math.abs(cp.tilt);
    if (!target && mag <= 0.02) {
      // Fully released — cleanly return our lean share so it can't accumulate.
      g2.rotation.x -= this._appliedPoseLean;
      this._appliedPoseLean = 0;
      if (g2.head) g2.head.rotation.x = 0;
      this._cp = P();
      this._cpActive = false;
    } else {
      this._cpActive = true;
    }
  }

  _updateFacing() {
    const targetY = this.facingAngle;
    const currentY = this.group.rotation.y;
    let diff = targetY - currentY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * 0.15;
  }
}
