import { ANIM } from '../utils/constants.js';

export class CharacterAnimator {
  constructor(characterGroup) {
    this.group = characterGroup;
    this.time = 0;
    this.isWalking = false;
    this.facingAngle = 0; // radians
  }

  setWalking(walking) {
    this.isWalking = walking;
  }

  setFacing(angle) {
    this.facingAngle = angle;
  }

  update(dt) {
    this.time += dt;

    const speed = this.isWalking ? ANIM.WALK_SPEED : ANIM.IDLE_SPEED;
    const bounce = this.isWalking ? ANIM.WALK_BOUNCE : ANIM.IDLE_BOUNCE;
    const t = this.time * speed;

    // Body bob
    if (this.group.body) {
      const baseY = this.group.body.userData.baseY || this.group.body.position.y;
      if (!this.group.body.userData.baseY) this.group.body.userData.baseY = baseY;
      this.group.body.position.y = baseY + Math.sin(t) * bounce;
    }

    // Head bob (slight)
    if (this.group.head) {
      const baseY = this.group.head.userData.baseY || this.group.head.position.y;
      if (!this.group.head.userData.baseY) this.group.head.userData.baseY = baseY;
      this.group.head.position.y = baseY + Math.sin(t + 0.5) * bounce * 0.7;
    }

    // Leg swing
    if (this.isWalking) {
      const legSwing = Math.sin(t) * 0.4;
      if (this.group.leftLeg) this.group.leftLeg.rotation.x = legSwing;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x = -legSwing;

      // Arm swing (opposite to legs)
      const armSwing = Math.sin(t) * 0.3;
      if (this.group.leftArm) this.group.leftArm.rotation.x = -armSwing;
      if (this.group.rightArm) this.group.rightArm.rotation.x = armSwing;
    } else {
      // Return to idle
      if (this.group.leftLeg) this.group.leftLeg.rotation.x *= 0.9;
      if (this.group.rightLeg) this.group.rightLeg.rotation.x *= 0.9;
      if (this.group.leftArm) this.group.leftArm.rotation.x *= 0.9;
      if (this.group.rightArm) this.group.rightArm.rotation.x *= 0.9;
    }

    // Face direction (smooth rotation)
    const targetY = this.facingAngle;
    const currentY = this.group.rotation.y;
    let diff = targetY - currentY;
    // Normalize angle
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * 0.15;
  }
}
