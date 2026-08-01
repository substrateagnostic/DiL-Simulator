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
// the shared reaction clips (guard / hurt / stagger / victory / attack / cast)
// are loaded separately by MeshyClips and bound per character. Any role with no
// clip silently resolves to `idle`, so a partial clip set degrades to the
// wave-1 behaviour instead of freezing a character mid-pose.
import * as THREE from 'three';

const FADE = 0.25;          // crossfade seconds — reads as a weight shift, not a cut
const FADE_BACK = 0.30;     // return to stance is slightly softer than the strike

export class MeshyAnimator {
  // root: the THREE.Object3D the mixer drives (the cloned GLB scene)
  // clips: { idle: AnimationClip, [role]: AnimationClip }
  constructor(root, clips, opts = {}) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    // Producer note: Meshy stock idles run hot for a held combat stance —
    // 0.8x reads as breathing rather than fidgeting.
    this.mixer.timeScale = opts.timeScale ?? 0.8;
    this.actions = {};
    this._current = null;
    this._returnTimer = 0;
    this._oneShot = null;
    this._propTicks = opts.props || [];
    this._groundNode = opts.ground?.node || null;
    this._groundOffsets = opts.ground?.offsets || {};
    this._groundCur = this._groundOffsets.idle ?? 0;
    this._groundTarget = this._groundCur;
    if (this._groundNode) this._groundNode.position.y = -this._groundCur;

    for (const [role, clip] of Object.entries(clips || {})) {
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.clampWhenFinished = true;
      this.actions[role] = action;
    }
    if (this.actions.idle) {
      this.actions.idle.reset().setLoop(THREE.LoopRepeat, Infinity).play();
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
    this._oneShot = null;
    const idle = this.actions.idle;
    if (!idle) return;
    idle.reset().setEffectiveTimeScale(1).setEffectiveWeight(1)
      .setLoop(THREE.LoopRepeat, Infinity).fadeIn(FADE_BACK).play();
    this._current = 'idle';
    this._groundTarget = this._groundOffsets.idle ?? 0;
  }

  // Play a role once and fall back to the stance. Held roles (guard) stay up
  // until something else is played or `release()` is called.
  play(role, { hold = false, timeScale = 1 } = {}) {
    const action = this.actions[role];
    if (!action || role === this._current) {
      if (!action) return false;
    }
    const prev = this._oneShot || this.actions[this._current];
    action.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1);
    if (hold) action.setLoop(THREE.LoopRepeat, Infinity);
    else action.setLoop(THREE.LoopOnce, 1);
    action.fadeIn(FADE).play();
    if (prev && prev !== action) prev.fadeOut(FADE);
    this._current = role;
    this._groundTarget = this._groundOffsets[role] ?? this._groundOffsets.idle ?? 0;
    this._oneShot = hold ? null : action;
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
    // A defeat call comes in as setExpression('hurt', 999) — the group-level
    // topple in enemyDefeatAnim is the real beat; a looping flinch under it
    // fights the spin, so the stance simply holds.
    if (name === 'hurt' && duration !== undefined && duration > 10) return false;
    if (name === 'hurt') return this.play('hurt');
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
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
