import { ANIM, CHAR } from '../utils/constants.js';

// Chair seat height matches Furniture.chair() seat position
const SEAT_Y = 0.44;

export class CharacterAnimator {
  constructor(characterGroup) {
    this.group = characterGroup;
    this.time = 0;
    this.isWalking = false;
    this.isSitting = false;
    this.facingAngle = 0; // radians
  }

  setWalking(walking) {
    this.isWalking = walking;
  }

  setSitting(sitting) {
    this.isSitting = sitting;
    if (!sitting) {
      this.group.position.y = 0;
    }
  }

  setFacing(angle) {
    this.facingAngle = angle;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;

    if (this.isSitting) {
      // Raise hips to seat height
      this.group.position.y = SEAT_Y - CHAR.LEG_HEIGHT;
      // Bend legs forward (horizontal)
      if (this.group.leftLeg)  this.group.leftLeg.rotation.x  = Math.PI / 2;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x = Math.PI / 2;
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

    // Body bob
    if (this.group.body) {
      const baseY = this.group.body.userData.baseY || this.group.body.position.y;
      if (!this.group.body.userData.baseY) this.group.body.userData.baseY = baseY;
      this.group.body.position.y = baseY + Math.sin(ta) * bounce;
    }

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

    this._updateFacing();
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
