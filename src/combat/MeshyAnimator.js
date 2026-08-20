// MESHY ANIMATOR — the CharacterAnimator-shaped driver for a Meshy GLB.
//
// CombatState and CombatScene never learn which cast is on stage. Every beat
// they already fire at the procedural CharacterAnimator (playGesture /
// setExpression / setFacing / setSignaturePose / setCombatMode) lands here
// instead, and this class turns it into an AnimationMixer crossfade. That is
// the whole integration: one class implementing the same surface, so the event
// wiring in CombatState is untouched.
//
// ROLES are the clip slots. A GLB always ships its own baked stance as `idle`;
// the shared clips (the slate stance plus guard / hurt / stagger / victory /
// attack / cast) are loaded separately by MeshyClips and bound per character.
// Any role with no clip silently resolves to `idle`, so a partial clip set
// degrades to the wave-1 behaviour instead of freezing a character mid-pose.
//
// BEAT LENGTH is a per-role playback multiplier supplied by the caller
// (MeshyClips.beatTimeScales). The cast's reaction clips are cast for the
// PERFORMER'S BUILD, and different performances of the same beat are different
// lengths; played one-for-one that turns into enemies feeling arbitrarily
// heavier or lighter. The multiplier lands every build's beat in one window.
import * as THREE from 'three';

const FADE = 0.25;          // crossfade seconds — reads as a weight shift, not a cut
const FADE_BACK = 0.30;     // return to stance is slightly softer than the strike

export class MeshyAnimator {
  // root: the THREE.Object3D the mixer drives (the cloned GLB scene)
  // clips: { idle: AnimationClip, [role]: AnimationClip }
  constructor(root, clips, opts = {}) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    // THE TIMESCALE LEAK. Producer note: Meshy stock idles run hot for a held
    // combat stance — 0.8x reads as breathing rather than fidgeting. That note
    // is about the IDLE, and it was applied to the whole MIXER, so every
    // reaction on all 33 characters played 25% long as well: the male jab's
    // 1.800s clip took 2250ms of wall clock and the female shove 2587ms,
    // against a 0.9-1.3s comp target. The 0.8 now lands on the idle ACTION,
    // which is where it was always meant to go. Reactions run at 1.000x and
    // their length is owned by the trim table + beatTimeScales.
    this.mixer.timeScale = 1;
    this._idleScale = opts.timeScale ?? 0.8;
    this._holdTimer = null;
    this._held = null;
    this.actions = {};
    this._current = null;
    this._returnTimer = 0;
    this._oneShot = null;
    this._down = false;          // set by play(role, { stay: true }); see below
    this._propTicks = opts.props || [];
    this._groundNode = opts.ground?.node || null;
    this._groundOffsets = opts.ground?.offsets || {};
    this._groundCur = this._groundOffsets.idle ?? 0;
    this._groundTarget = this._groundCur;
    // role -> playback multiplier. Absent role = 1, so a caller that supplies
    // nothing gets exactly the old one-for-one behaviour.
    this._beats = opts.timeScales || {};
    if (this._groundNode) this._groundNode.position.y = -this._groundCur;

    for (const [role, clip] of Object.entries(clips || {})) {
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.clampWhenFinished = true;
      this.actions[role] = action;
    }
    if (this.actions.idle) {
      this.actions.idle.reset().setEffectiveTimeScale(this._idleScale)
        .setLoop(THREE.LoopRepeat, Infinity).play();
      // Two shared calm stances cover the whole cast, so without a per-character
      // phase offset a trio fight breathes in lockstep and reads as one puppet
      // rig. opts.phase is a stable 0..1 hash of the character id.
      const clip = this.actions.idle.getClip();
      this.actions.idle.time = (opts.phase || 0) * (clip?.duration || 0);
      this._current = 'idle';
    }
    this.mixer.addEventListener('finished', (e) => {
      if (this._oneShot && e.action === this._oneShot) this._toIdle();
    });
  }

  _toIdle() {
    // THE STUCK-LAYER BUG (H2 re-judge, 2026-08-20). `clampWhenFinished` keeps
    // a finished one-shot in the mixer's ACTIVE list — paused on its final
    // frame, still accumulating at FULL WEIGHT every frame (verified against
    // three's AnimationAction._update: a paused, enabled action evaluates
    // `_updateWeight` and accumulates). This return-to-stance used to fade the
    // idle IN without fading the finished action OUT, and play()'s own
    // `prev.fadeOut` never reaches it either (by then `_current` is 'idle'),
    // so every role that had EVER played kept blending its clamped last frame
    // into every subsequent frame of the fight. Measured on karen after one
    // exchange: attack (a214) paused at t=0.867 w=1.00 and cast (a318) paused
    // at t=1.033 w=1.00 under the running idle — the rendered "stance" was
    // avg(idle, shove-final, scheme-final), which is the arms-out pseudo
    // A-pose, the floating hips ("Karen hovering"), and the weak flinches
    // (a new reaction fades to 1.0 against N stuck layers, so it reads at
    // 1/(N+1) amplitude) the producer's note named. One fadeOut retires the
    // layer; the weight fade runs on mixer time, which a paused action still
    // honors.
    const finished = this._oneShot
      || (this._current && this._current !== 'idle' ? this.actions[this._current] : null);
    this._oneShot = null;
    if (this._down) return;      // a body on the floor does not go back to breathing
    this._releaseHold();
    const idle = this.actions.idle;
    if (!idle) return;
    idle.reset().setEffectiveTimeScale(this._idleScale).setEffectiveWeight(1)
      .setLoop(THREE.LoopRepeat, Infinity).fadeIn(FADE_BACK).play();
    // `globalThis.__stuckLayerLegacy` reproduces the pre-fix blend so the gate
    // (tools/_h2-stuck-layers.mjs --legacy) can be SHOWN to fail on the defect
    // it exists to catch. Same shape as __floorSitOff: one read, no cost,
    // never set by the game.
    if (finished && finished !== idle && !globalThis.__stuckLayerLegacy) finished.fadeOut(FADE_BACK);
    this._current = 'idle';
    this._groundTarget = this._groundOffsets.idle ?? 0;
  }

  // ── CONTACT FRAME ────────────────────────────────────────────────────
  // Milliseconds from play(role) to the frame the strike actually lands, for
  // the clip THIS body is going to play — derived from the trim table's
  // measured contact offset and the live playback rate, never hardcoded.
  // Returns null when the clip carries no measured contact, and every call
  // site falls back to its old constant, so a partially-filled table degrades
  // to the shipped behaviour instead of breaking.
  contactMs(role = 'attack') {
    const action = this.actions[role];
    if (!action) return null;
    const contact = action.getClip()?.userData?.contact;
    if (contact == null) return null;
    const rate = (this._beats[role] ?? 1) * (this.mixer.timeScale || 1);
    if (!(rate > 0)) return null;
    return (contact / rate) * 1000;
  }

  // FOLLOW-THROUGH HOLD. After contact, freeze the strike pose for a beat
  // before letting the clip run out — the single cheapest "that was committed"
  // cue there is. Pausing the ACTION (not the mixer) so only the attacker
  // holds; everything else on stage keeps moving.
  holdPose(ms = 140) {
    const action = this._oneShot || this.actions[this._current];
    if (!action) return;
    this._releaseHold();
    action.paused = true;
    this._held = action;
    this._holdTimer = setTimeout(() => {
      this._holdTimer = null;
      if (this._held) { this._held.paused = false; this._held = null; }
    }, ms);
  }

  _releaseHold() {
    if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
    if (this._held) { this._held.paused = false; this._held = null; }
  }

  // Play a role once and fall back to the stance. Held roles (guard) stay up
  // until something else is played or `release()` is called.
  //
  // `timeScale` defaults to the role's beat multiplier so every call site fires
  // the normalized length without knowing the clip; pass an explicit number
  // only to deliberately override the beat window.
  // `hold`  loop the role forever (guard).
  // `stay`  play ONCE and stop on the final frame — no return to the stance.
  //         `clampWhenFinished` is already true on every action, so the pose
  //         freezes; what `stay` actually does is keep the action OUT of
  //         `_oneShot`, because the mixer's `finished` listener calls
  //         `_toIdle()` on whatever is in there. A defeated body that goes back
  //         to its breathing stance has stood up again.
  play(role, { hold = false, stay = false, timeScale } = {}) {
    if (this._down && !stay) return false;
    const action = this.actions[role];
    if (!action || role === this._current) {
      if (!action) return false;
    }
    const rate = timeScale ?? this._beats[role] ?? 1;
    // A new beat always cancels a held one — otherwise a hurt landing inside a
    // follow-through hold would crossfade into a paused action.
    this._releaseHold();
    const prev = this._oneShot || this.actions[this._current];
    action.reset().setEffectiveTimeScale(rate).setEffectiveWeight(1);
    if (hold) action.setLoop(THREE.LoopRepeat, Infinity);
    else action.setLoop(THREE.LoopOnce, 1);
    action.fadeIn(FADE).play();
    if (prev && prev !== action) prev.fadeOut(FADE);
    this._current = role;
    this._groundTarget = this._groundOffsets[role] ?? this._groundOffsets.idle ?? 0;
    this._oneShot = (hold || stay) ? null : action;
    // A body on the floor must not be interrupted back onto its feet by a
    // late-arriving hurt/taunt beat, and CombatState fires several in the
    // ~620 ms after the killing blow. This latch is one-way for the life of
    // the animator, which is the life of the fight.
    if (stay) this._down = true;
    return true;
  }

  release() { if (this._current !== 'idle') this._toIdle(); }

  // ── CharacterAnimator surface (what CombatScene/CombatState actually call) ──

  // Gesture names authored for the procedural rig, mapped onto clip roles.
  // Unknown names fall through to `attack` so a new gesture never freezes a
  // character on the stance.
  playGesture(name) {
    switch (name) {
      case 'hurt': return this.play('hurt');
      case 'cast': return this.play('cast');
      case 'guard': case 'brace': return this.play('guard', { hold: true });
      case 'stagger': case 'break': return this.play('stagger');
      case 'victory': case 'cheer': return this.play('victory');
      // The collapse. `stay` is what makes it a defeat rather than a stumble:
      // the body goes down and the fight ends with it still there.
      case 'defeat': case 'collapse': return this.play('defeat', { stay: true });
      default: return this.play('attack');
    }
  }

  // The procedural rig sells reactions on the FACE; the Meshy cast sells them
  // with the BODY (producer's call — physical reactions read better at fight
  // distance). Only the beats with a body answer are mapped; 'angry'/'smug'
  // are deliberate no-ops because the attack/cast gesture that accompanies
  // them is already the body statement.
  setExpression(name, duration) {
    if (name === 'victory') return this.play('victory');
    // COMPOSURE BREAK. CombatState already fires setExpression('defeated') on
    // the broken enemy (CombatState.js, result.type === 'broken'), so the
    // stagger needs no new call site — hands to the head, doubling over.
    if (name === 'defeated') return this.play('stagger');
    // A defeat call comes in as setExpression('hurt', 999). The real beat is
    // now the `defeat` clip enemyDefeatAnim plays through playGesture, and a
    // looping flinch on top of it would fight the collapse — so this stays a
    // no-op. (`_down` already refuses it; this is the older, narrower guard and
    // is kept because it also covers the procedural-degrade path.)
    if (name === 'hurt' && duration !== undefined && duration > 10) return false;
    // 'hurt' is a NO-OP on this path, deliberately. Every site in CombatScene
    // that calls setExpression('hurt', 0.9) — enemyHurtAnim:941, allyHurtAnim:
    // 1203 — calls playGesture('hurt') on the very next line, and playGesture
    // routes to the same play('hurt'). Playing it here too fired the clip TWICE
    // per impact 0–1 ms apart (visible as two identical CLIP_play lines in
    // screenshots/h-run/trace-after/report.txt at +360 ms): the second call
    // reset() the action that had just started, restarting its 250 ms fade-in
    // from weight 0 and swallowing the first frames of the flinch. The face is
    // what setExpression means on the PROCEDURAL rig; on the Meshy cast the
    // gesture on the next line IS the reaction.
    void duration;
    return false;
  }

  // Facing/pose/mode are owned by the group transform on the Meshy path (the
  // clips are authored stage-front and CombatScene rotates the outer group), so
  // these are accepted and ignored rather than missing.
  setCombatMode() {}
  setFacing() {}
  setSignaturePose() {}
  setWalking() {}
  setSitting() {}

  update(dt) {
    this.mixer.update(dt);
    if (this._groundNode) {
      const k = Math.min(1, dt / FADE);
      this._groundCur += (this._groundTarget - this._groundCur) * k;
      this._groundNode.position.y = -this._groundCur;
    }
    // Bone-socketed props are constrained AFTER the skeleton has been posed for
    // this frame, or the constraint reads one frame stale (a visible cane
    // wobble at 60fps).
    for (const t of this._propTicks) t();
  }

  dispose() {
    this._releaseHold();
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
