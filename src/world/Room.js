import * as THREE from 'three';
import { TileMap } from '../world/TileMap.js';
import { Furniture } from '../world/Furniture.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { TILE_SIZE } from '../utils/constants.js';

// ============================================================
// Room — builds a Three.js scene from room data
// ============================================================
// Consumes a room definition from src/data/rooms/index.js and
// produces a renderable THREE.Group, a populated TileMap, and
// NPC placement data ready for EntityManager.
// ============================================================

// Maps furniture types to the tile footprint they block.
// { w, h } in tile units (x, z). Defaults to 1x1.
// Items not listed here or in NO_BLOCK get default 1x1 blocking.
const FURNITURE_FOOTPRINTS = {
  desk:               { w: 1, h: 1 },
  cubicleWall:        { w: 2, h: 1 },
  vendingMachine:     { w: 1, h: 1 },
  conferenceTable:    { w: 3, h: 1 },
  serverRack:         { w: 1, h: 1 },
  receptionDesk:      { w: 2, h: 1 },
  elevatorDoors:      { w: 2, h: 1 },
  fridge:             { w: 1, h: 1 },
  fileCabinet:        { w: 1, h: 1 },
};

// Small/decorative items that should NOT block movement.
// Players can clip through these slightly for smoother pathing.
const NO_BLOCK = new Set([
  'monitor', 'keyboard', 'chair', 'plant', 'trashCan',
  'coffeeMachine', 'microwave', 'waterCooler', 'printer',
  'whiteboard', 'motivationalPoster',
]);

export class Room {
  /**
   * @param {object} roomData — a single room entry from ROOMS
   */
  constructor(roomData) {
    this.data = roomData;
    this.scene = null;
    this.group = null; // Alias for scene, used by RoomManager
    this.tileMap = null;
    this._builtNPCData = null;
  }

  // ----------------------------------------------------------
  // Primary build — call once, returns THREE.Group
  // ----------------------------------------------------------
  build() {
    const { width, height, floorColor, walls, furniture, exits, interactables } = this.data;

    this.scene = new THREE.Group();
    this.scene.name = `room_${this.data.id}`;

    // Create the TileMap
    this.tileMap = new TileMap(width, height);

    // 1. Floor
    this._buildFloor(width, height, floorColor);

    // 2. Perimeter walls
    if (walls) {
      this._buildPerimeterWalls(width, height);
    }

    // 3. Furniture
    if (furniture && furniture.length > 0) {
      this._placeFurniture(furniture);
    }

    // 4. Register exits on the TileMap
    if (exits && exits.length > 0) {
      for (const exit of exits) {
        this.tileMap.setExit(exit.x, exit.z, exit.targetRoom, exit.spawnX, exit.spawnZ);
      }
    }

    // 5. Register interactables on the TileMap
    if (interactables && interactables.length > 0) {
      for (const ia of interactables) {
        this.tileMap.setInteractable(ia.x, ia.z, {
          type: ia.type,
          dialogId: ia.dialogId,
        });
      }
    }

    // 6. Custom lights (e.g. server room accents)
    if (this.data.lights) {
      for (const l of this.data.lights) {
        const light = new THREE.PointLight(l.color, l.intensity, l.distance || 10);
        light.position.set(l.x * TILE_SIZE, l.y || 2, l.z * TILE_SIZE);
        this.scene.add(light);
      }
    }

    // 7. Cache NPC data
    this._builtNPCData = (this.data.npcs || []).map(npc => ({ ...npc }));

    this.group = this.scene; // Alias for RoomManager
    return this.scene;
  }

  // ----------------------------------------------------------
  // Accessors
  // ----------------------------------------------------------
  getTileMap() {
    return this.tileMap;
  }

  getNPCData() {
    return this._builtNPCData || [];
  }

  getPlayerSpawn() {
    return this.data.playerSpawn || { x: 1, z: 1 };
  }

  getExits() {
    return this.data.exits || [];
  }

  // ----------------------------------------------------------
  // Internals
  // ----------------------------------------------------------

  /**
   * Build a flat floor plane.
   */
  _buildFloor(w, h, color) {
    const geo = new THREE.PlaneGeometry(w * TILE_SIZE, h * TILE_SIZE);
    const mat = Materials.custom(color);
    const floor = new THREE.Mesh(geo, mat);

    // PlaneGeometry faces +Y by default; rotate to be horizontal
    floor.rotation.x = -Math.PI / 2;

    // Center the floor so tile (0,0) is at the corner, matching TileMap coords.
    // Each tile is 1 unit; the plane is centered at origin, so offset by half.
    floor.position.set(
      (w * TILE_SIZE) / 2 - TILE_SIZE / 2,
      0,
      (h * TILE_SIZE) / 2 - TILE_SIZE / 2,
    );
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.scene.add(floor);
  }

  /**
   * Build perimeter walls (with gaps at exits) and block those tiles.
   * Walls are built as segments between exit tiles so doors are visible.
   * Green glowing floor markers are placed at each exit tile.
   */
  _buildPerimeterWalls(w, h) {
    const wallHeight = 2.5;
    const wallThickness = 0.15;
    const wallMat = Materials.wall();

    // Collect exit positions keyed by wall side
    const exitSet = new Set();
    const exitsByWall = { north: new Set(), south: new Set(), west: new Set(), east: new Set() };
    if (this.data.exits) {
      for (const e of this.data.exits) {
        exitSet.add(`${e.x},${e.z}`);
        if (e.z === 0)       exitsByWall.north.add(e.x);
        if (e.z === h - 1)   exitsByWall.south.add(e.x);
        if (e.x === 0)       exitsByWall.west.add(e.z);
        if (e.x === w - 1)   exitsByWall.east.add(e.z);
      }
    }

    // Helper: build wall segments along a horizontal wall (north or south).
    // Iterates x from 0..w-1, skipping exit tiles, producing segments for runs of non-exit tiles.
    const buildHWall = (exitTiles, zPos) => {
      let segStart = null;
      for (let x = 0; x < w; x++) {
        if (exitTiles.has(x)) {
          if (segStart !== null) {
            this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, x - 1, zPos, 'h');
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = x;
        }
      }
      if (segStart !== null) {
        this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, w - 1, zPos, 'h');
      }
    };

    // Helper: build wall segments along a vertical wall (west or east).
    const buildVWall = (exitTiles, xPos) => {
      let segStart = null;
      for (let z = 0; z < h; z++) {
        if (exitTiles.has(z)) {
          if (segStart !== null) {
            this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, z - 1, xPos, 'v');
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = z;
        }
      }
      if (segStart !== null) {
        this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, h - 1, xPos, 'v');
      }
    };

    // North wall (z = -0.5 in world)
    buildHWall(exitsByWall.north, -TILE_SIZE / 2 - wallThickness / 2);
    // South wall
    buildHWall(exitsByWall.south, (h - 1) * TILE_SIZE + TILE_SIZE / 2 + wallThickness / 2);
    // West wall (x = -0.5 in world)
    buildVWall(exitsByWall.west, -TILE_SIZE / 2 - wallThickness / 2);
    // East wall
    buildVWall(exitsByWall.east, (w - 1) * TILE_SIZE + TILE_SIZE / 2 + wallThickness / 2);

    // Add glowing floor markers and door frames at exit tiles
    this._addExitMarkers();
    this._addDoorFrames(w, h, wallHeight);

    // Perimeter tiles are NOT blocked — out-of-bounds checks in
    // TileMap.canMove() already prevent the player from leaving the grid,
    // so blocking the perimeter row/column just creates an invisible
    // extra tile of collision in front of the wall.
  }

  /**
   * Add a single wall segment mesh.
   * @param {'h'|'v'} orientation - horizontal (x-axis) or vertical (z-axis)
   * For 'h': from/to are x tile indices, fixedPos is the z world position
   * For 'v': from/to are z tile indices, fixedPos is the x world position
   */
  _addWallSegment(wallMat, wallHeight, wallThickness, from, to, fixedPos, orientation) {
    const count = to - from + 1;
    if (orientation === 'h') {
      const segWidth = count * TILE_SIZE;
      const geo = new THREE.BoxGeometry(segWidth, wallHeight, wallThickness);
      const mesh = new THREE.Mesh(geo, wallMat);
      const centerX = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(centerX, wallHeight / 2, fixedPos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    } else {
      const segHeight = count * TILE_SIZE;
      const geo = new THREE.BoxGeometry(wallThickness, wallHeight, segHeight);
      const mesh = new THREE.Mesh(geo, wallMat);
      const centerZ = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(fixedPos, wallHeight / 2, centerZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  /**
   * Add glowing green floor markers at each exit tile.
   */
  _addExitMarkers() {
    if (!this.data.exits) return;
    const markerMat = new THREE.MeshToonMaterial({
      color: 0x44ff88,
      emissive: 0x44ff88,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7,
    });
    const markerGeo = new THREE.PlaneGeometry(0.8 * TILE_SIZE, 0.8 * TILE_SIZE);
    for (const exit of this.data.exits) {
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(exit.x * TILE_SIZE, 0.01, exit.z * TILE_SIZE);
      marker.name = `exit_marker_${exit.x}_${exit.z}`;
      this.scene.add(marker);
    }
  }

  /**
   * Add door frame geometry at each exit tile.
   * Two vertical posts (frame) flanking the gap, plus a door panel.
   */
  _addDoorFrames(w, h, wallHeight) {
    if (!this.data.exits) return;

    const frameMat = Materials.custom(0x6b5335); // dark wood
    const doorMat = new THREE.MeshToonMaterial({
      color: 0x8b7355,
      transparent: true,
      opacity: 0.6,
    });
    const postGeo = new THREE.BoxGeometry(0.08, wallHeight, 0.08);
    const doorWidth = TILE_SIZE * 0.7;
    const doorHeight = wallHeight * 0.85;
    const doorGeo = new THREE.PlaneGeometry(doorWidth, doorHeight);

    // Group exits by wall to merge adjacent exits into wider doors
    const exitsByKey = {};
    for (const exit of this.data.exits) {
      let wall, coord;
      if (exit.z === 0) { wall = 'north'; coord = exit.x; }
      else if (exit.z === h - 1) { wall = 'south'; coord = exit.x; }
      else if (exit.x === 0) { wall = 'west'; coord = exit.z; }
      else if (exit.x === w - 1) { wall = 'east'; coord = exit.z; }
      else continue;
      if (!exitsByKey[wall]) exitsByKey[wall] = [];
      exitsByKey[wall].push(coord);
    }

    for (const [wall, coords] of Object.entries(exitsByKey)) {
      coords.sort((a, b) => a - b);

      // Find contiguous runs
      const runs = [];
      let start = coords[0];
      let end = coords[0];
      for (let i = 1; i < coords.length; i++) {
        if (coords[i] === end + 1) {
          end = coords[i];
        } else {
          runs.push({ start, end });
          start = coords[i];
          end = coords[i];
        }
      }
      runs.push({ start, end });

      for (const run of runs) {
        const midCoord = (run.start + run.end) / 2;
        const span = (run.end - run.start + 1);
        const widerDoorGeo = new THREE.PlaneGeometry(span * TILE_SIZE * 0.85, doorHeight);

        if (wall === 'north' || wall === 'south') {
          const zPos = wall === 'north'
            ? -TILE_SIZE / 2
            : (h - 1) * TILE_SIZE + TILE_SIZE / 2;

          // Left post
          const lp = new THREE.Mesh(postGeo, frameMat);
          lp.position.set((run.start - 0.45) * TILE_SIZE, wallHeight / 2, zPos);
          this.scene.add(lp);
          // Right post
          const rp = new THREE.Mesh(postGeo, frameMat);
          rp.position.set((run.end + 0.45) * TILE_SIZE, wallHeight / 2, zPos);
          this.scene.add(rp);
          // Door panel
          const door = new THREE.Mesh(widerDoorGeo, doorMat);
          door.position.set(midCoord * TILE_SIZE, doorHeight / 2, zPos);
          this.scene.add(door);
        } else {
          const xPos = wall === 'west'
            ? -TILE_SIZE / 2
            : (w - 1) * TILE_SIZE + TILE_SIZE / 2;

          // Top post
          const tp = new THREE.Mesh(postGeo, frameMat);
          tp.position.set(xPos, wallHeight / 2, (run.start - 0.45) * TILE_SIZE);
          this.scene.add(tp);
          // Bottom post
          const bp = new THREE.Mesh(postGeo, frameMat);
          bp.position.set(xPos, wallHeight / 2, (run.end + 0.45) * TILE_SIZE);
          this.scene.add(bp);
          // Door panel (rotated 90° for side walls)
          const door = new THREE.Mesh(widerDoorGeo, doorMat);
          door.rotation.y = Math.PI / 2;
          door.position.set(xPos, doorHeight / 2, midCoord * TILE_SIZE);
          this.scene.add(door);
        }
      }
    }
  }

  /**
   * Instantiate all furniture pieces and block their tiles.
   */
  _placeFurniture(furnitureList) {
    for (const item of furnitureList) {
      const { type, x, z, rotation } = item;

      // Look up factory method
      const factoryFn = Furniture[type];
      if (!factoryFn) {
        console.warn(`[Room] Unknown furniture type: "${type}" — skipping.`);
        continue;
      }

      // Create the Three.js object
      const obj = factoryFn();
      obj.position.set(x * TILE_SIZE, 0, z * TILE_SIZE);

      if (rotation !== undefined && rotation !== 0) {
        obj.rotation.y = rotation;
      }

      obj.name = `${type}_${x}_${z}`;
      this.scene.add(obj);

      // Block tiles based on footprint
      const tileX = Math.floor(x);
      const tileZ = Math.floor(z);

      // Skip blocking for small/decorative items — allows slight clipping
      // for much smoother pathing through office environments
      if (NO_BLOCK.has(type)) {
        continue;
      }

      const footprint = FURNITURE_FOOTPRINTS[type] || { w: 1, h: 1 };
      this.tileMap.blockRect(tileX, tileZ, footprint.w, footprint.h);
    }
  }

  // ----------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------
  dispose() {
    if (!this.scene) return;

    this.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        // Materials are cached/shared in MaterialLibrary — don't dispose them here
      }
    });

    // Remove all children
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.scene = null;
    this.tileMap = null;
    this._builtNPCData = null;
  }
}
