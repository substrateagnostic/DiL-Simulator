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
  // Chad: a relaxed gym-bro stance — arms down and a touch forward, chest thrown
  // back. The old double-flex (raZ ±0.72) rendered as a stiff palms-back A-POSE
  // ("no human stands like this — an unposed rig"); with no elbow channel a true
  // flex can't read, so a confident loose stance beats a failed flex.
  chad:    P({ laX: 0.14, laZ: -0.14, raX: 0.16, raZ: 0.14, lean: -0.06 }),
  // Grandma: hands forward on the cane, a GENTLE lean (the deep bow self-occluded
  // her face and read as an ominous wraith — cap the intro pitch).
  grandma: P({ raX: 0.4, raZ: -0.16, laX: 0.34, laZ: 0.16, lean: 0.06, tilt: 0.05 }),
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

// ── THE WHOLE-BODY SETTLE (the idle/walk bob) ───────────────────────────────
// A character group has FAR more direct children than the four the old
// `_breathe` list knew about. `buildCharacter` adds, all at the same level as
// the torso: the two legs, a dowager HUMP, a PELVIS, a SKIRT and a RISE, the
// blob shadow, any group-level cosmetic prop — and the STATIC DRESSING NODE,
// which owns the NECK COLUMN, the collar, the shirt V, the tie and the belt.
// `CombatScene` adds a bounce card and an AO ellipse on top of that.
//
// v7 round-4b (52eace4) correctly killed the squash & stretch and moved the
// breath to ONE offset — applied to torso + head + arms. That is four of
// eleven. Measured on the shipping EXPLORATION path (tools/_bb-probe.mjs, the
// per-child shear table):
//     idle   body/head/arms travel  39.99 mm  ·  every other child 0.00 mm
//     walk   body/head/arms travel 119.49 mm  ·  every other child 0.00 mm
// i.e. the jacket shell, the head and the arms slid up and down off a neck
// column and a collar that stayed bolted to the pelvis — up to 23.9 % of torso
// height, twice a second, once per step. That is the producer's "full body bob
// that distorts the neck/clothing" (2026-08-15), and it is a CLASS of bug, not
// an instance: any node the builder adds tomorrow is one more to forget.
//
// So the offset is applied to EVERY child. That is whole-group motion and it
// cannot shear by construction. It is done child-by-child rather than on
// `group.position.y` DELIBERATELY: that field is owned by `Player.move`'s
// terrain lerp — which reads its own previous output — and by NPC patrol,
// StageDirector and CombatScene's entry slide. A bob written there feeds back
// into the lerp, and the walking player sinks to the -0.06 SINK_TOLERANCE
// floor and stays there.
//
// SINK-ONLY, never a rise: the offset runs 0 → -A, so a planted foot can never
// leave the floor. The travel hides inside the sole; a rise of the same size
// reads as hovering at the closest camera in the game (the New Game desk
// vignette). `ANIM.IDLE_BOUNCE` / `ANIM.WALK_BOUNCE` are the OLD shear
// amplitudes and are no longer read by anything — this is a different quantity
// (whole-body ground clearance, not torso-against-pelvis shear), so its dials
// live here.
const ROOT_SETTLE_IDLE = 0.014;   // m — one quiet breath, whole body
const ROOT_SETTLE_WALK = 0.034;   // m — centre-of-mass dip at full stride

// Ground décor is pinned to the FLOOR, not to the body: `CharacterBuilder`'s
// `blobShadow` and `CombatScene`'s bounce card + AO contact ellipse. A contact
// shadow that lifts with the figure is exactly what makes body motion read as
// hovering. The test is GEOMETRIC — a flat plane lying in the floor plane — so
// a fourth one needs no new list to be written.
function isGroundDecor(o) {
  return (o.userData && o.userData.blobShadow === true)
    || (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
      && Math.abs(o.rotation.x + Math.PI / 2) < 0.01);
}

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
    this.bobScale = 1;    // 0.35 in combat (setCombatMode)
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
  // v7 PRODUCER-NOTES round-2 — THE HYBRID. Expressions were texture-only, and
  // once the skull became genuinely sculpted the two channels disagreed: painted
  // angry brows over a neutral geometric brow ridge. The producer's ruling was
  // to keep the swap and ADD geometry. Both channels are driven from this one
  // call, off the same name, so they cannot drift apart.
  //
  // The geometry channel is combat-tier only (faceMorphIndex is null on room
  // builds), and a name with no morph simply relaxes the face to neutral
  // geometry — so this is a no-op on faceless builds and on the exploration
  // tier, exactly as the texture path already was.
  setExpression(name, hold = 0) {
    const tex = this.group.faceTextures?.[name] || this.group.faceTextures?.neutral;
    if (!tex || !this.group.faceMesh) return;
    this.group.faceMesh.material.map = tex;
    this.group.faceMesh.material.needsUpdate = true;
    const idx = this.group.faceMorphIndex;
    const inf = this.group.faceMesh.morphTargetInfluences;
    if (idx && inf) {
      inf.fill(0);
      const i = idx[name];
      if (i != null) inf[i] = 1;
    }
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

  // Combat framing is a close-up, so the idle has to be quieter there than it is
  // at exploration distance. 0.35 keeps a readable breath without the figure
  // visibly rising off its own light pool between beats.
  setCombatMode(on) {
    this.bobScale = on ? 0.35 : 1;
    if (!on) return;
    this._settleBody(0);
  }

  // ONE offset, applied to EVERY child of the character group except the
  // ground décor — see THE WHOLE-BODY SETTLE above. Nothing that shares a seam
  // can move relative to anything else, because nothing moves relative to
  // anything else at all.
  _settleBody(dy) {
    for (const n of this.group.children) {
      if (isGroundDecor(n)) continue;
      if (n.userData.bobBaseY == null) n.userData.bobBaseY = n.position.y;
      n.position.y = n.userData.bobBaseY + dy;
    }
    // belt-and-braces: no scale-based squash may ever come back on the shell.
    // On a v7 build `group.body` IS the whole merged torso and the arms, neck
    // and head are its SIBLINGS, so scaling it 3.6 % in y pulled the shell out
    // from under the shoulder and the collar every cycle.
    if (this.group.body && this.group.body.scale.y !== 1) this.group.body.scale.set(1, 1, 1);
  }

  // The settle curve. Sink-only (0 → A) so a foot never leaves the floor.
  //   idle: one dip per breath — 2π/IDLE_SPEED ≈ 3.1 s ≈ 19 breaths/min.
  //   walk: TWO dips per stride, deepest at full stride and level at the pass,
  //         which is where a walking body actually puts its centre of mass.
  //         The old bob ran at ONE dip per stride and in phase with the leg
  //         swing, i.e. it lifted the body exactly when a real one drops.
  _settleAmount(ta) {
    return this.isWalking
      ? ROOT_SETTLE_WALK * (1 - Math.cos(2 * ta)) / 2
      : ROOT_SETTLE_IDLE * (1 - Math.cos(ta)) / 2;
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
      // B6 — THE THIGHS POINTED BACKWARDS. Playtest note: "sitting NPCs,
      // broken legs pose."
      //
      // The leg's own down-axis is local -Y and `rotation.x` swings it in the
      // YZ plane: Rx(a) sends (0,-1,0) to (0, -cos a, -sin a). At +PI/2 that is
      // (0, 0, -1) — straight BACKWARD, because CharacterBuilder puts the nose
      // at local +z. So every seated body in the game folded its thighs into
      // the chair back and its shins down behind the seat. Measured on the live
      // rig, dot(thigh direction, body forward) = -1.000, i.e. exactly
      // opposite, on every sitting NPC.
      //
      // -PI/2 sends the thigh to (0, 0, +1) — forward, over the seat — and the
      // knee's +PI/2 then returns the shin to straight down, so the ankle lands
      // where it already did (0.066 m above the floor, which is the shoe). One
      // sign each; nothing about seat height, hip drop or the +-40 deg shoulder
      // clamp moves.
      if (this.group.leftLeg)  this.group.leftLeg.rotation.x  = -Math.PI / 2;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x = -Math.PI / 2;
      if (hasKnee) {
        this.group.leftLeg.knee.rotation.x  = Math.PI / 2;
        this.group.rightLeg.knee.rotation.x = Math.PI / 2;
      }
      // Arms rest slightly forward
      if (this.group.leftArm)  this.group.leftArm.rotation.x  = 0.2;
      if (this.group.rightArm) this.group.rightArm.rotation.x = 0.2;
      // Subtle seated breath — the WHOLE body settles into the chair by one
      // offset (see _settleBody). The seated hip drop above is an absolute
      // write to `group.position.y`; the settle rides the children, so the two
      // never fight.
      this._settleBody(-this._settleAmount(t * ANIM.IDLE_SPEED) * this.bobScale);
      this._updateFacing(dt);
      return;
    }

    const speed = this.isWalking ? ANIM.WALK_SPEED : ANIM.IDLE_SPEED;
    const ta = t * speed;

    // The bob — see THE WHOLE-BODY SETTLE. NO squash & stretch and NO partial
    // upper-body offset: on a v7 build `group.body` is the ENTIRE merged torso
    // shell and the arms, the head AND the neck/collar/tie node are its
    // SIBLINGS, so moving a subset of them shears the figure at whatever seam
    // the subset stops at. Every child moves or none does.
    this._settleBody(-this._settleAmount(ta) * this.bobScale);

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

    // (the head rides the same offset as everything else — a phase-shifted head
    //  bob tore the neck open on every cycle now that the neck is a lit column,
    //  and a head that moves while the neck node does NOT is the same bug with
    //  the phase set to 1)

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

    this._updateFacing(dt);
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

  // Producer frame-data note (2026-08-02): "his rotation when changing walk
  // direction is too slow — he visibly lags his movement vector." The old
  // per-frame `diff * 0.15` was both frame-rate dependent and far too soft
  // (~9.7/s → the heading took ~7 frames to close 90%). This is now a
  // dt-correct exponential ease at TURN_RATE ≈ 2.6× the old responsiveness, so
  // the body aligns with the movement vector inside ~2–3 frames at 60fps while
  // keeping a whisper of smoothing (no instant snap).
  _updateFacing(dt = 1 / 60) {
    const TURN_RATE = 26.0;                     // 1/s (was ≈9.75 equivalent)
    const targetY = this.facingAngle;
    const currentY = this.group.rotation.y;
    let diff = targetY - currentY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const k = 1 - Math.exp(-Math.max(0, dt) * TURN_RATE);
    this.group.rotation.y += diff * Math.min(1, k);
  }
}
