import * as THREE from 'three';
import { buildCharacter } from './CharacterBuilder.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { PLAYER } from '../utils/constants.js';
import { distance2D } from '../utils/math.js';

export class NPC {
  constructor(id, x, z, options = {}) {
    this.id = id;
    this.config = CHARACTER_CONFIGS[id];
    this.mesh = buildCharacter(this.config);
    this.animator = new CharacterAnimator(this.mesh);
    this.position = { x, z };
    this.mesh.position.set(x, 0, z);
    this.facingAngle = options.facing || 0;
    this.animator.setFacing(this.facingAngle);
    this.dialogId = options.dialogId || id;
    this.visible = options.visible !== false;
    this.interactable = options.interactable !== false;
    this.wanderRadius = options.wanderRadius || 0;
    this.name = this.config?.name || id;

    // Optional callback overrides
    this.onInteract = options.onInteract || null;
    this.conditionFn = options.conditionFn || null; // Return false to hide NPC

    if (!this.visible) {
      this.mesh.visible = false;
    }
  }

  isInRange(playerX, playerZ) {
    return distance2D(this.position.x, this.position.z, playerX, playerZ) < PLAYER.INTERACT_RANGE;
  }

  faceTowards(x, z) {
    this.facingAngle = Math.atan2(x - this.position.x, z - this.position.z);
    this.animator.setFacing(this.facingAngle);
  }

  show() {
    this.visible = true;
    this.mesh.visible = true;
  }

  hide() {
    this.visible = false;
    this.mesh.visible = false;
  }

  update(dt) {
    this.animator.update(dt);
  }
}
