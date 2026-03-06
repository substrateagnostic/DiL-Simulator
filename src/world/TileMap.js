import { TILE_SIZE } from '../utils/constants.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // 0 = walkable, 1 = blocked, 2 = interactable, 3 = exit
    this.grid = new Uint8Array(width * height);
    this.exitData = {}; // "x,z" -> { targetRoom, spawnX, spawnZ }
    this.interactData = {}; // "x,z" -> { type, id, ... }
  }

  _idx(x, z) {
    const gx = Math.floor(x);
    const gz = Math.floor(z);
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return -1;
    return gz * this.width + gx;
  }

  set(x, z, value) {
    const idx = this._idx(x, z);
    if (idx >= 0) this.grid[idx] = value;
  }

  get(x, z) {
    const idx = this._idx(x, z);
    if (idx < 0) return 1; // Out of bounds = blocked
    return this.grid[idx];
  }

  isWalkable(x, z) {
    const v = this.get(Math.floor(x), Math.floor(z));
    return v === 0 || v === 2 || v === 3;
  }

  blockRect(x, z, w, h) {
    for (let dz = 0; dz < h; dz++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, z + dz, 1);
      }
    }
  }

  setExit(x, z, targetRoom, spawnX, spawnZ) {
    this.set(x, z, 3);
    this.exitData[`${x},${z}`] = { targetRoom, spawnX, spawnZ };
  }

  getExit(x, z) {
    return this.exitData[`${Math.floor(x)},${Math.floor(z)}`] || null;
  }

  setInteractable(x, z, data) {
    this.set(x, z, 2);
    this.interactData[`${x},${z}`] = data;
  }

  getInteractable(x, z) {
    return this.interactData[`${Math.floor(x)},${Math.floor(z)}`] || null;
  }

  // Check if player can move to position (with sub-tile precision)
  canMove(x, z, radius = 0.2) {
    // Check all four corners of the bounding circle approximation
    return this.isWalkable(x - radius, z - radius) &&
           this.isWalkable(x + radius, z - radius) &&
           this.isWalkable(x - radius, z + radius) &&
           this.isWalkable(x + radius, z + radius);
  }
}
