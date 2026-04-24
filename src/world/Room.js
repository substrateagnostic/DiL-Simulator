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
  grandDesk:          { w: 3, h: 2 },
  cubicleWall:        { w: 2, h: 1 },
  vendingMachine:     { w: 1, h: 1 },
  supplyShop:         { w: 1, h: 1 },
  boardroomTable:     { w: 8, h: 2 },
  conferenceTable:    { w: 3, h: 1 },
  serverRack:         { w: 1, h: 1 },
  receptionDesk:       { w: 2, h: 1 },
  receptionDeskMarble: { w: 2, h: 1 },
  elevatorDoors:      { w: 2, h: 1 },
  fridge:             { w: 1, h: 1 },
  fileCabinet:        { w: 1, h: 1 },
  fileCabinetLow:     { w: 1, h: 1 },
  fileCabinetLateral: { w: 1, h: 1 },
  car:                { w: 1, h: 2 },
  carSUV:             { w: 1, h: 2 },
  carSports:          { w: 1, h: 2 },
  andrewsCar:         { w: 1, h: 2 },
  staircase:          { w: 2, h: 2 },
  safeDepositBox:     { w: 1, h: 1 },
  sculpture:          { w: 1, h: 1 },
  credenza:           { w: 1, h: 3 },
  credenzaEast:       { w: 1, h: 3 },
  cornerBar:          { w: 2, h: 1 },
  chargingBull:       { w: 2, h: 1 },
  puttingGreen:       { w: 3, h: 2 },
  luxuryFridge:       { w: 2, h: 1 },
  kitchenIsland:      { w: 2, h: 1 },
  kitchenCounter:     { w: 1, h: 1 },
  wineFridge:         { w: 1, h: 1 },
};

// Small/decorative items that should NOT block movement.
// Players can clip through these slightly for smoother pathing.
const NO_BLOCK = new Set([
  'monitor', 'keyboard', 'chair', 'executiveChair', 'plant', 'plantTall', 'plantSucculent', 'plantFern', 'trashCan', 'marblePlanter', 'marbleStatue', 'trophyCase',
  'coffeeMachine', 'espressoMachine', 'microwave', 'waterCooler', 'printer',
  'whiteboard', 'smartBoard', 'motivationalPoster', 'parkingSpot',
  'deskPlant', 'deskPlantSucculent', 'speakerphone',
  'cobweb', 'oilPainting', 'grandPainting', 'abstractPainting', 'portraitPainting', 'staircase', 'stairFlight', 'globeStand', 'vaultDoor',
  'rangeHood', 'boosterMount',
  'stockTicker', 'scaledModel', 'whiskeyWall',
  'aquariumWall', 'movieScreen', 'dataVizPanel', 'megaAnalyticsScreen', 'loungeBar',
  'couch', 'popcornPopper', 'neonSign', 'coffeeTable', 'leatherArmchair', 'operatorChair',
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
  build(flags = {}) {
    const { width, height, floorColor, floorPattern, walls, furniture, exits, interactables } = this.data;

    this.scene = new THREE.Group();
    this.scene.name = `room_${this.data.id}`;

    // Create the TileMap
    this.tileMap = new TileMap(width, height);

    // 1. Floor
    this._buildFloor(width, height, floorColor, floorPattern);

    // 2. Perimeter walls
    if (walls) {
      this._buildPerimeterWalls(width, height);
    }

    // 3. Furniture
    if (furniture && furniture.length > 0) {
      this._placeFurniture(furniture, flags);
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
        if (ia.condition) {
          const c = ia.condition;
          if (c.flag && !flags[c.flag]) continue;
          if (c.notFlag && flags[c.notFlag]) continue;
        }
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

    // 8. Apply room slope (e.g. stairwell descends north)
    if (this.data.slope) {
      const angle = this.data.slope;
      const spawnZ = this.data.playerSpawn?.z ?? 0;
      this.scene.rotation.x = angle;
      this.scene.position.y = -spawnZ * Math.sin(angle);
    }

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

  getSouthWallMeshes() {
    return this._southWallMeshes || [];
  }

  getEastWallMeshes() {
    return this._eastWallMeshes || [];
  }

  // ----------------------------------------------------------
  // Internals
  // ----------------------------------------------------------

  /**
   * Build a flat floor plane.
   */
  _buildFloor(w, h, color, floorPattern) {
    const geo = new THREE.PlaneGeometry(w * TILE_SIZE, h * TILE_SIZE);
    const mat = floorPattern === 'carpet'   ? Materials.carpetPattern(w, h, color)
              : floorPattern === 'hardwood' ? Materials.hardwoodPattern(w, h)
              : Materials.custom(color);
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
      const meshes = [];
      let segStart = null;
      for (let x = 0; x < w; x++) {
        if (exitTiles.has(x)) {
          if (segStart !== null) {
            meshes.push(this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, x - 1, zPos, 'h'));
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = x;
        }
      }
      if (segStart !== null) {
        meshes.push(this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, w - 1, zPos, 'h'));
      }
      return meshes;
    };

    // Helper: build wall segments along a vertical wall (west or east).
    const buildVWall = (exitTiles, xPos) => {
      const meshes = [];
      let segStart = null;
      for (let z = 0; z < h; z++) {
        if (exitTiles.has(z)) {
          if (segStart !== null) {
            meshes.push(this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, z - 1, xPos, 'v'));
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = z;
        }
      }
      if (segStart !== null) {
        meshes.push(this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, h - 1, xPos, 'v'));
      }
      return meshes;
    };

    // North wall (z = -0.5 in world)
    buildHWall(exitsByWall.north, -TILE_SIZE / 2 - wallThickness / 2);
    // South wall — capture meshes and clone material for transparency support
    this._southWallMeshes = buildHWall(exitsByWall.south, (h - 1) * TILE_SIZE + TILE_SIZE / 2 + wallThickness / 2);
    for (const mesh of this._southWallMeshes) {
      const mat = mesh.material.clone();
      mat.transparent = true;
      mat.opacity = 1.0;
      mesh.material = mat;
    }

    // West wall (x = -0.5 in world)
    buildVWall(exitsByWall.west, -TILE_SIZE / 2 - wallThickness / 2);
    // East wall — capture meshes and clone material for transparency support
    this._eastWallMeshes = buildVWall(exitsByWall.east, (w - 1) * TILE_SIZE + TILE_SIZE / 2 + wallThickness / 2);
    for (const mesh of this._eastWallMeshes) {
      const mat = mesh.material.clone();
      mat.transparent = true;
      mat.opacity = 1.0;
      mesh.material = mat;
    }

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
    let mesh;
    if (orientation === 'h') {
      const segWidth = count * TILE_SIZE;
      const geo = new THREE.BoxGeometry(segWidth, wallHeight, wallThickness);
      mesh = new THREE.Mesh(geo, wallMat);
      const centerX = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(centerX, wallHeight / 2, fixedPos);
    } else {
      const segHeight = count * TILE_SIZE;
      const geo = new THREE.BoxGeometry(wallThickness, wallHeight, segHeight);
      mesh = new THREE.Mesh(geo, wallMat);
      const centerZ = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(fixedPos, wallHeight / 2, centerZ);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
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
   * Add luxury door geometry at each exit tile.
   * Solid mahogany doors with raised panels, gold molding, brass rose plate, and spherical gold knob.
   */
  _addDoorFrames(w, h, wallHeight) {
    if (!this.data.exits) return;

    // Group exits by wall to merge adjacent exits into wider doors
    const exitsByKey = {};
    for (const exit of this.data.exits) {
      let wall, coord;
      if (exit.z === 0)         { wall = 'north'; coord = exit.x; }
      else if (exit.z === h - 1){ wall = 'south'; coord = exit.x; }
      else if (exit.x === 0)    { wall = 'west';  coord = exit.z; }
      else if (exit.x === w - 1){ wall = 'east';  coord = exit.z; }
      else continue;
      if (!exitsByKey[wall]) exitsByKey[wall] = [];
      exitsByKey[wall].push(coord);
    }

    for (const [wall, coords] of Object.entries(exitsByKey)) {
      coords.sort((a, b) => a - b);

      // Find contiguous runs
      const runs = [];
      let start = coords[0], end = coords[0];
      for (let i = 1; i < coords.length; i++) {
        if (coords[i] === end + 1) { end = coords[i]; }
        else { runs.push({ start, end }); start = coords[i]; end = coords[i]; }
      }
      runs.push({ start, end });

      for (const run of runs) {
        const midCoord = (run.start + run.end) / 2;
        const span = run.end - run.start + 1;
        const doorGroup = this._buildLuxuryDoorGroup(span, wallHeight);

        if (wall === 'north' || wall === 'south') {
          const zPos = wall === 'north'
            ? -TILE_SIZE / 2
            : (h - 1) * TILE_SIZE + TILE_SIZE / 2;
          doorGroup.position.set(midCoord * TILE_SIZE, 0, zPos);
          if (wall === 'south') doorGroup.rotation.y = Math.PI;
        } else {
          const xPos = wall === 'west'
            ? -TILE_SIZE / 2
            : (w - 1) * TILE_SIZE + TILE_SIZE / 2;
          doorGroup.position.set(xPos, 0, midCoord * TILE_SIZE);
          doorGroup.rotation.y = wall === 'west' ? Math.PI / 2 : -Math.PI / 2;
        }

        this.scene.add(doorGroup);
      }
    }
  }

  /**
   * Build a single luxury door group (mahogany, raised panels, gold trim, knob).
   * The group's local +Z faces into the room; position and rotate as needed.
   */
  _buildLuxuryDoorGroup(spanTiles, wallHeight) {
    const group = new THREE.Group();

    const doorWidth    = spanTiles * TILE_SIZE * 0.82;
    const doorHeight   = wallHeight * 0.88;
    const doorThick    = 0.07;

    // Materials
    const mahoganyMat = new THREE.MeshStandardMaterial({ color: 0x7a3018, roughness: 0.5,  metalness: 0.0 });
    const panelMat    = new THREE.MeshStandardMaterial({ color: 0x5a2010, roughness: 0.6,  metalness: 0.0 });
    const goldMat     = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1,  metalness: 0.98 });
    const brassMat    = new THREE.MeshStandardMaterial({ color: 0xe0a830, roughness: 0.2,  metalness: 0.92 });
    const frameMat    = new THREE.MeshStandardMaterial({ color: 0x4a1e0a, roughness: 0.5,  metalness: 0.0  });

    // --- Solid mahogany door body ---
    const doorBody = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, doorHeight, doorThick),
      mahoganyMat
    );
    doorBody.position.set(0, doorHeight / 2, 0);
    group.add(doorBody);

    // --- Raised door panels (recessed darker boxes on the front face) ---
    const panelInsetX = doorWidth * 0.08;
    const panelDepth  = 0.014;
    const panelZ      = doorThick / 2 + panelDepth / 2;

    // Upper panel (~top 35% of door)
    const upperPanel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - panelInsetX * 2, doorHeight * 0.35, panelDepth),
      panelMat
    );
    upperPanel.position.set(0, doorHeight * 0.625, panelZ);
    group.add(upperPanel);

    // Lower panel (~bottom 40% of door)
    const lowerPanel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - panelInsetX * 2, doorHeight * 0.40, panelDepth),
      panelMat
    );
    lowerPanel.position.set(0, doorHeight * 0.215, panelZ);
    group.add(lowerPanel);

    // --- Gold molding strips (horizontal dividers & border) ---
    const stripDepth = 0.022;
    const stripZ     = doorThick / 2 + stripDepth / 2;
    for (const sy of [doorHeight * 0.055, doorHeight * 0.44, doorHeight * 0.79, doorHeight * 0.875]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth * 0.93, 0.022, stripDepth),
        goldMat
      );
      strip.position.set(0, sy, stripZ);
      group.add(strip);
    }

    // Gold vertical side trim strips
    for (const sx of [-(doorWidth * 0.42), doorWidth * 0.42]) {
      const vStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, doorHeight * 0.93, stripDepth),
        goldMat
      );
      vStrip.position.set(sx, doorHeight / 2, stripZ);
      group.add(vStrip);
    }

    // --- Door knob: brass rose plate + gold sphere ---
    const knobX = doorWidth / 2 - 0.13;
    const knobY = 1.02;

    // Brass backplate (rose)
    const rose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.062, 0.014, 20),
      brassMat
    );
    rose.rotation.x = Math.PI / 2;
    rose.position.set(knobX, knobY, doorThick / 2 + 0.007);
    group.add(rose);

    // Gold spherical knob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 20, 16),
      goldMat
    );
    knob.position.set(knobX, knobY, doorThick / 2 + 0.072);
    group.add(knob);

    // --- Ornate frame: dark mahogany posts + lintel with gold edge trim ---
    const frameW     = 0.11;
    const frameDepth = 0.14;
    const lintelH    = 0.12;

    // Left post
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(frameW, wallHeight, frameDepth), frameMat);
    leftPost.position.set(-(doorWidth / 2 + frameW / 2), wallHeight / 2, 0);
    group.add(leftPost);

    // Right post
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(frameW, wallHeight, frameDepth), frameMat);
    rightPost.position.set(doorWidth / 2 + frameW / 2, wallHeight / 2, 0);
    group.add(rightPost);

    // Lintel
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + frameW * 2, lintelH, frameDepth),
      frameMat
    );
    lintel.position.set(0, doorHeight + lintelH / 2, 0);
    group.add(lintel);

    // Gold trim strips on front edges of frame posts
    for (const sx of [-(doorWidth / 2), doorWidth / 2]) {
      const postTrim = new THREE.Mesh(new THREE.BoxGeometry(0.016, wallHeight, 0.016), goldMat);
      postTrim.position.set(sx, wallHeight / 2, frameDepth / 2);
      group.add(postTrim);
    }

    // Gold trim strip along lintel bottom edge
    const lintelTrim = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + frameW * 2 + 0.02, 0.016, 0.016),
      goldMat
    );
    lintelTrim.position.set(0, doorHeight + lintelH, frameDepth / 2);
    group.add(lintelTrim);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  }

  /**
   * Instantiate all furniture pieces and block their tiles.
   */
  _placeFurniture(furnitureList, flags = {}) {
    for (const item of furnitureList) {
      if (item.condition) {
        const c = item.condition;
        if (c.flag && !flags[c.flag]) continue;
        if (c.notFlag && flags[c.notFlag]) continue;
      }
      const { type, x, z, rotation, variant } = item;

      // Look up factory method
      const factoryFn = Furniture[type];
      if (!factoryFn) {
        console.warn(`[Room] Unknown furniture type: "${type}" — skipping.`);
        continue;
      }

      // Create the Three.js object (pass optional variant for multi-variant furniture)
      const obj = factoryFn(variant);
      obj.position.set(x * TILE_SIZE, item.y || 0, z * TILE_SIZE);

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
      // Cubicle walls are the only type whose footprint (2x1) doesn't account
      // for rotation — swap w/h when they're placed as side dividers (90°).
      let fw = footprint.w, fh = footprint.h;
      if (type === 'cubicleWall' && rotation && Math.abs(rotation % Math.PI - Math.PI / 2) < 0.1) {
        fw = footprint.h;
        fh = footprint.w;
      }
      this.tileMap.blockRect(tileX, tileZ, fw, fh);
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
