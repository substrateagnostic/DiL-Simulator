import { TILE_SIZE } from '../utils/constants.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // 0 = walkable, 1 = blocked, 2 = interactable, 3 = exit
    this.grid = new Uint8Array(width * height);
    this.exitData = {}; // "x,z" -> { targetRoom, spawnX, spawnZ }
    this.interactData = {}; // "x,z" -> { type, id, ... }
    // Per-tile floor elevation (multi-level rooms). Flat rooms never
    // allocate it; heightAt() returns 0 everywhere for them.
    this.heights = null;
  }

  // Set floor elevation for a rect of tiles (from room data floorZones)
  setHeightRect(x, z, w, h, y) {
    if (!this.heights) this.heights = new Float32Array(this.width * this.height);
    for (let dz = 0; dz < h; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const idx = this._idx(x + dx, z + dz);
        if (idx >= 0) this.heights[idx] = y;
      }
    }
  }

  heightAt(x, z) {
    if (!this.heights) return 0;
    const idx = this._idx(x, z);
    return idx >= 0 ? this.heights[idx] : 0;
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

  // Registering an interactable must NOT change what the tile is made of.
  // `Room.build()` runs furniture blocking (step 3) BEFORE interactables
  // (step 5), so a bare `set(x, z, 2)` here used to overwrite a 1 and punch a
  // walk-through hole in the furniture the interactable is attached to —
  // measured at 33 props across 12 rooms (Andrew's desk, five server racks,
  // five HR filing cabinets, the executive grandDesk, the vending machine, and
  // the player's own car). Grid value 2 exists only to keep a tile walkable;
  // nothing reads it to FIND an interactable — `_getNearbyTargets` goes
  // straight to `interactData` via `getInteractable()`. So preserve 1
  // (furniture) and 3 (exit) and only claim a plain walkable 0.
  setInteractable(x, z, data) {
    if (this.get(Math.floor(x), Math.floor(z)) === 0) this.set(x, z, 2);
    this.interactData[`${x},${z}`] = data;
  }

  getInteractable(x, z) {
    return this.interactData[`${Math.floor(x)},${Math.floor(z)}`] || null;
  }

  // Check if player can move to position (with sub-tile precision)
  canMove(x, z, radius = 0.2, fromX = null, fromZ = null) {
    // EMBED ESCAPE: a body standing INSIDE blocked geometry must always be
    // allowed to walk out. Destination-only corner checks reject every
    // sub-tile step whose target is still inside the tile the body starts
    // in, which jails the player permanently — measured live 08-05 when the
    // ending scene's staged sit-down parked Andrew on the exec conference
    // chair's own collision tile. Normal collision resumes the moment the
    // body stands on walkable ground again.
    // The test must use the same four-corner footprint as the destination
    // check: a center-tile-only test missed the pocket case (standing on a
    // walkable tile with the RADIUS overlapping chair/table blocks — every
    // direction's corner test fails and the center test never fires).
    if (fromX !== null) {
      const fromClear = this.isWalkable(fromX - radius, fromZ - radius) &&
        this.isWalkable(fromX + radius, fromZ - radius) &&
        this.isWalkable(fromX - radius, fromZ + radius) &&
        this.isWalkable(fromX + radius, fromZ + radius);
      if (!fromClear) return true;
    }
    // Check all four corners of the bounding circle approximation
    const walkable = this.isWalkable(x - radius, z - radius) &&
           this.isWalkable(x + radius, z - radius) &&
           this.isWalkable(x - radius, z + radius) &&
           this.isWalkable(x + radius, z + radius);
    if (!walkable) return false;
    // Multi-level rooms: a big elevation jump between adjacent tiles is
    // a ledge, not a path — stairs are zones of small per-tile rises
    if (this.heights && fromX !== null) {
      const dh = Math.abs(this.heightAt(x, z) - this.heightAt(fromX, fromZ));
      if (dh > 0.55) return false;
    }
    return true;
  }
}
