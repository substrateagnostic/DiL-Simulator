import { CAMERA } from '../utils/constants.js';
import { lerp, clamp } from '../utils/math.js';
import { Engine } from '../core/Engine.js';

export class IsometricCamera {
  constructor() {
    this.target = { x: 0, y: 0, z: 0 };
    this.current = { x: 0, y: 0, z: 0 };
    this.shakeAmount = 0;
    this.shakeDecay = 0.9;
    this.bounds = null; // { minX, maxX, minZ, maxZ }
    this._setupPosition();
  }

  _setupPosition() {
    const cam = Engine.camera;
    const dist = 20;
    cam.position.set(
      dist * Math.sin(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X),
      dist * Math.sin(CAMERA.ANGLE_X),
      dist * Math.cos(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X)
    );
    cam.lookAt(0, 0, 0);
  }

  follow(x, z, y = 0) {
    this.target.x = x;
    this.target.y = y;
    this.target.z = z;
  }

  setBounds(minX, maxX, minZ, maxZ) {
    this.bounds = { minX, maxX, minZ, maxZ };
  }

  clearBounds() {
    this.bounds = null;
  }

  shake(intensity = 0.3) {
    this.shakeAmount = intensity;
  }

  update(dt) {
    const cam = Engine.camera;

    // Deadzone check
    const dx = this.target.x - this.current.x;
    const dz = this.target.z - this.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > CAMERA.DEAD_ZONE) {
      this.current.x = lerp(this.current.x, this.target.x, CAMERA.FOLLOW_SPEED);
      this.current.z = lerp(this.current.z, this.target.z, CAMERA.FOLLOW_SPEED);
    }
    this.current.y = lerp(this.current.y, this.target.y, CAMERA.FOLLOW_SPEED);

    // Clamp to bounds
    let cx = this.current.x;
    let cz = this.current.z;
    if (this.bounds) {
      cx = clamp(cx, this.bounds.minX, this.bounds.maxX);
      cz = clamp(cz, this.bounds.minZ, this.bounds.maxZ);
    }

    // Apply shake
    let shakeX = 0, shakeY = 0;
    if (this.shakeAmount > 0.01) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= this.shakeDecay;
    } else {
      this.shakeAmount = 0;
    }

    // Position camera relative to follow point
    const dist2 = 20;
    const cy = this.current.y;
    cam.position.set(
      cx + dist2 * Math.sin(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X) + shakeX,
      dist2 * Math.sin(CAMERA.ANGLE_X) + cy + shakeY,
      cz + dist2 * Math.cos(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X)
    );
    cam.lookAt(cx + shakeX, cy, cz);
  }

  snapTo(x, z, y = 0) {
    this.target.x = x;
    this.target.y = y;
    this.target.z = z;
    this.current.x = x;
    this.current.y = y;
    this.current.z = z;
    this.update(0);
  }
}
