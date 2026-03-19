import * as THREE from 'three';
import { buildCharacter } from './CharacterBuilder.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { PLAYER } from '../utils/constants.js';
import { distance2D } from '../utils/math.js';

// Movement pattern types
const MOVE_SPEED = 1.8; // tiles per second (slower than player)
const IDLE_PAUSE_MIN = 2.0; // seconds
const IDLE_PAUSE_MAX = 5.0; // seconds
const WANDER_STEP_MIN = 1.5;
const WANDER_STEP_MAX = 3.0;

export class NPC {
  constructor(id, x, z, options = {}) {
    this.id = id;
    this.config = CHARACTER_CONFIGS[id];
    this.mesh = buildCharacter(this.config);
    this.animator = new CharacterAnimator(this.mesh);
    this.position = { x, z };
    this.homePosition = { x, z }; // remember spawn point
    this.mesh.position.set(x, 0, z);
    this.facingAngle = options.facing || 0;
    this.animator.setFacing(this.facingAngle);
    this.dialogId = options.dialogId || id;
    this.visible = options.visible !== false;
    this.interactable = options.interactable !== false;
    this.sitting = options.sitting || false;
    this.interactRange = options.interactRange || PLAYER.INTERACT_RANGE;
    this.name = this.config?.name || id;

    // Movement pattern config
    this.movement = options.movement || null; // { type, ... }
    this._moveState = 'idle'; // 'idle' | 'walking' | 'paused'
    this._moveTarget = null; // { x, z }
    this._idleTimer = _randomRange(IDLE_PAUSE_MIN, IDLE_PAUSE_MAX);
    this._patrolIndex = 0;
    this._patrolDirection = 1; // 1 = forward, -1 = backward (for ping-pong)
    this._frozen = false; // true during dialog/combat

    // Optional callback overrides
    this.onInteract = options.onInteract || null;
    this.conditionFn = options.conditionFn || null;

    // Reference to tileMap for collision (set externally)
    this.tileMap = null;

    if (!this.visible) {
      this.mesh.visible = false;
    }
    if (this.sitting) {
      this.animator.setSitting(true);
    }
  }

  isInRange(playerX, playerZ) {
    return distance2D(this.position.x, this.position.z, playerX, playerZ) < this.interactRange;
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

  freeze() {
    this._frozen = true;
    this._moveState = 'idle';
    this.animator.setWalking(false);
  }

  unfreeze() {
    this._frozen = false;
    this._idleTimer = _randomRange(IDLE_PAUSE_MIN, IDLE_PAUSE_MAX);
  }

  // Rebuild the mesh with a new config (e.g. when a procedural client is generated)
  rebuild(config) {
    const parent = this.mesh.parent;
    if (parent) parent.remove(this.mesh);

    this.name = config.name || this.id;
    this.mesh = buildCharacter(config);
    this.mesh.position.set(this.position.x, 0, this.position.z);
    this.animator = new CharacterAnimator(this.mesh);
    this.animator.setFacing(this.facingAngle);
    if (!this.visible) this.mesh.visible = false;

    if (parent) parent.add(this.mesh);
    if (this.sitting) this.animator.setSitting(true);
  }

  update(dt) {
    // Movement logic (only if has pattern and not sitting/frozen)
    if (this.movement && !this.sitting && !this._frozen) {
      this._updateMovement(dt);
    }

    this.animator.update(dt);
  }

  _updateMovement(dt) {
    switch (this._moveState) {
      case 'idle':
        this._idleTimer -= dt;
        if (this._idleTimer <= 0) {
          this._pickNextTarget();
        }
        break;

      case 'walking':
        this._walkToTarget(dt);
        break;
    }
  }

  _pickNextTarget() {
    if (!this.movement) return;

    const type = this.movement.type;
    let target = null;

    switch (type) {
      case 'wander': {
        // Pick a random point within radius of home
        const radius = this.movement.radius || 3;
        const angle = Math.random() * Math.PI * 2;
        const dist = _randomRange(WANDER_STEP_MIN, Math.min(WANDER_STEP_MAX, radius));
        target = {
          x: this.homePosition.x + Math.cos(angle) * dist,
          z: this.homePosition.z + Math.sin(angle) * dist,
        };
        break;
      }

      case 'patrol': {
        // Walk between waypoints in sequence
        const waypoints = this.movement.waypoints;
        if (!waypoints || waypoints.length === 0) return;

        if (this.movement.pingPong) {
          // Ping-pong: reverse direction at ends
          this._patrolIndex += this._patrolDirection;
          if (this._patrolIndex >= waypoints.length) {
            this._patrolDirection = -1;
            this._patrolIndex = waypoints.length - 2;
          } else if (this._patrolIndex < 0) {
            this._patrolDirection = 1;
            this._patrolIndex = 1;
          }
        } else {
          // Loop
          this._patrolIndex = (this._patrolIndex + 1) % waypoints.length;
        }

        const wp = waypoints[this._patrolIndex];
        target = { x: wp.x, z: wp.z };
        break;
      }

      case 'pace': {
        // Walk back and forth on a line
        const dist = this.movement.distance || 2;
        const axis = this.movement.axis || 'x'; // 'x' or 'z'
        const offset = this._patrolDirection * dist;
        if (axis === 'x') {
          target = { x: this.homePosition.x + offset, z: this.homePosition.z };
        } else {
          target = { x: this.homePosition.x, z: this.homePosition.z + offset };
        }
        this._patrolDirection *= -1;
        break;
      }

      default:
        return;
    }

    if (target) {
      // Clamp to walkable area if we have a tileMap
      if (this.tileMap) {
        target.x = Math.max(1, Math.min(this.tileMap.width - 1, target.x));
        target.z = Math.max(1, Math.min(this.tileMap.height - 1, target.z));
      }
      this._moveTarget = target;
      this._moveState = 'walking';
      this.animator.setWalking(true);
      this.faceTowards(target.x, target.z);
    }
  }

  _walkToTarget(dt) {
    if (!this._moveTarget) {
      this._arriveAtTarget();
      return;
    }

    const tx = this._moveTarget.x;
    const tz = this._moveTarget.z;
    const dx = tx - this.position.x;
    const dz = tz - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
      this._arriveAtTarget();
      return;
    }

    const speed = (this.movement.speed || MOVE_SPEED) * dt;
    const step = Math.min(speed, dist);
    const nx = this.position.x + (dx / dist) * step;
    const nz = this.position.z + (dz / dist) * step;

    // Collision check
    if (this.tileMap && !this.tileMap.canMove(nx, nz, 0.25)) {
      // Can't move there — try sliding along one axis
      const canX = !this.tileMap || this.tileMap.canMove(nx, this.position.z, 0.25);
      const canZ = !this.tileMap || this.tileMap.canMove(this.position.x, nz, 0.25);

      if (canX) {
        this.position.x = nx;
      } else if (canZ) {
        this.position.z = nz;
      } else {
        // Completely blocked, give up on this target
        this._arriveAtTarget();
        return;
      }
    } else {
      this.position.x = nx;
      this.position.z = nz;
    }

    this.mesh.position.set(this.position.x, 0, this.position.z);
    this.faceTowards(tx, tz);
  }

  _arriveAtTarget() {
    this._moveTarget = null;
    this._moveState = 'idle';
    this._idleTimer = _randomRange(IDLE_PAUSE_MIN, IDLE_PAUSE_MAX);
    this.animator.setWalking(false);
  }
}

function _randomRange(min, max) {
  return min + Math.random() * (max - min);
}
