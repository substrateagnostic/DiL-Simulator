import * as THREE from 'three';
import { TileMap } from '../world/TileMap.js';
import { Furniture } from '../world/Furniture.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { TILE_SIZE } from '../utils/constants.js';
import _roomOverrides from '../data/room-overrides.json' with { type: 'json' };

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
//
// Entries WITH ox/oz are anchored differently (S5-COLL): the anchor tile is
// Math.floor(coord + 0.5 - eps) + offset — i.e. the tile nearest the
// placement point, shifted by the offset. This matches CENTER-origin meshes
// (conferenceTable, couch, pokerTable...) whose visuals extend symmetrically
// from the placement point, and survives the half-tile placements room data
// actually uses. Quarter-turn rotations swap (w,h) and (ox,oz) for these
// entries automatically. Legacy entries (no ox/oz) keep corner anchoring at
// Math.floor(coord) and are NOT rotation-aware (cubicleWall excepted).
const FURNITURE_FOOTPRINTS = {
  desk:               { w: 1, h: 1 },
  grandDesk:          { w: 3, h: 1, ox: -1, oz: 0 },   // mesh is 2.55x1.1 centered — old 3x2 ghost-blocked a full empty row
  cubicleWall:        { w: 2, h: 1 },
  vendingMachine:     { w: 1, h: 1 },
  supplyShop:         { w: 1, h: 1 },
  boardroomTable:     { w: 9, h: 3, ox: 0, oz: 0 },    // mesh spans 0..8 x 0..2 (half-tile past the old 8x2 on +x/+z)
  conferenceTable:    { w: 3, h: 1, ox: -1, oz: 0 },   // center-origin: old corner-anchored 3x1 left a ghost tile + a walk-through tile
  serverRack:         { w: 1, h: 1 },
  receptionDesk:       { w: 3, h: 1, ox: -1, oz: 0 },  // 2.56 wide, center-origin
  receptionDeskMarble: { w: 3, h: 1, ox: -1, oz: 0 },
  elevatorDoors:      { w: 2, h: 1 },
  fridge:             { w: 1, h: 1 },
  fileCabinet:        { w: 1, h: 1, ox: 0, oz: 0 },    // nearest-tile anchor: the old_vault cabinets sit at z .8 fractions
  fileCabinetLow:     { w: 1, h: 1, ox: 0, oz: 0 },
  fileCabinetLateral: { w: 1, h: 1, ox: 0, oz: 0 },
  car:                { w: 1, h: 3, ox: 0, oz: -1 },   // ~1.9 long, center-origin; every placement is rotated 90° —
  carSUV:             { w: 1, h: 3, ox: 0, oz: -1 },   // the old 1x2 corner block left invisible walls in the garage aisles
  carSports:          { w: 1, h: 3, ox: 0, oz: -1 },
  andrewsCar:         { w: 1, h: 3, ox: 0, oz: -1 },
  staircase:          { w: 2, h: 2 },
  safeDepositBox:     { w: 1, h: 1 },
  sculpture:          { w: 1, h: 1 },
  credenza:           { w: 1, h: 3 },
  credenzaEast:       { w: 1, h: 3 },
  cornerBar:          { w: 2, h: 1 },
  chargingBull:       { w: 2, h: 1 },
  puttingGreen:       { w: 3, h: 2 },
  luxuryFridge:       { w: 2, h: 1, ox: -1, oz: 0 },   // 1.6 wide, center-origin
  kitchenIsland:      { w: 3, h: 1, ox: -1, oz: 0 },   // 2.1 wide, center-origin
  kitchenCounter:     { w: 1, h: 1 },
  wineFridge:         { w: 1, h: 1 },
  // Previously unlisted (default 1x1) or NO_BLOCK items that read solid —
  // players walked through them (S5-COLL, Alex playtest):
  couch:              { w: 3, h: 1, ox: -1, oz: 0 },   // 2.32 wide
  loungeBar:          { w: 5, h: 1, ox: -2, oz: 0 },   // 4.1 wide
  leatherArmchair:    { w: 1, h: 1, ox: 0, oz: 0 },
  coffeeTable:        { w: 1, h: 1, ox: 0, oz: 0 },
  pokerTable:         { w: 3, h: 3, ox: -1, oz: -1 },  // 2.93x2.79 centered
  poolTable:          { w: 3, h: 1, ox: -1, oz: 0 },   // 2.22x1.1 centered
  dinerBooth:         { w: 1, h: 1, ox: 0, oz: 0 },    // mesh narrowed to keep the door aisle between the south booths open
  bench:              { w: 1, h: 1, ox: 0, oz: 0 },    // transit benches sit at z .8 fractions
  missionControlDesk: { w: 1, h: 1, ox: 0, oz: 0 },    // analytics desks sit at z .2-.8 fractions
  lockbox:            { w: 1, h: 1, ox: 0, oz: 0 },    // vault boxes sit at .875 fractions
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
  // (couch, loungeBar, coffeeTable, leatherArmchair moved OUT of this set —
  // they are waist-high-or-taller solid lounge pieces players walked through;
  // they now block via FURNITURE_FOOTPRINTS. S5-COLL.)
  'aquariumWall', 'movieScreen', 'dataVizPanel', 'megaAnalyticsScreen',
  'popcornPopper', 'neonSign', 'operatorChair',
  'cableTray', 'monitorWall', 'aisleGlow',
  'lamppost', 'hydrant', 'busStopSign', 'newspaperBox', 'curb', 'elevatorDoors',
  'sodiumPool', 'severanceRunner', 'garagePendant',
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

    // 1. Floor — multi-level rooms define floorZones (terraced boxes +
    // per-tile heights); everyone else gets the classic flat plane
    if (this.data.floorZones) {
      this._buildFloorZones(this.data.floorZones, floorColor);
    } else {
      this._buildFloor(width, height, floorColor, floorPattern);
    }

    // 2. Perimeter walls (open-air rooms still get exit markers)
    if (walls) {
      this._buildPerimeterWalls(width, height);
    } else if (exits && exits.length > 0) {
      this._addExitMarkers();
    }

    // 3. Furniture
    if (furniture && furniture.length > 0) {
      const _roomOv = _roomOverrides[this.data.id];
      const furnitureToPlace = _roomOv?.furniture
        ? furniture.map((item, i) => {
            const ov = _roomOv.furniture[String(i)];
            return ov ? { ...item, ...ov } : item;
          })
        : furniture;
      this._placeFurniture(furnitureToPlace, flags);
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

    // 7. Cache NPC data (apply position overrides)
    const _npcOv = _roomOverrides[this.data.id]?.npcs;
    this._builtNPCData = (this.data.npcs || []).map((npc, i) => {
      const ov = _npcOv?.[String(i)];
      return ov ? { ...npc, ...ov } : { ...npc };
    });

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
    // Plain floors (no floorPattern in data) used to route to Materials.custom
    // — a FLAT TOON plane with no specular/normal/clearcoat. That was the wiring
    // bug behind "ZERO GLOSS ANYWHERE": three rounds of floor materials never
    // reached these rooms. Reception now gets clinical VCT tile, the garage a
    // troweled concrete slab, and everything else a waxed satin PBR floor —
    // all real material response the office key and neon can actually catch.
    const id = this.data.id;
    const mat = floorPattern === 'carpet'   ? Materials.carpetPattern(w, h, color)
              : floorPattern === 'hardwood' ? Materials.hardwoodPattern(w, h, color)
              : id === 'reception'          ? Materials.tilePattern(w, h, color)
              : id === 'parking_garage'     ? Materials.concretePattern(w, h, color)
              : Materials.satinFloor(color);
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
   * Terraced floors for multi-level rooms. Each zone is a solid box whose
   * top sits at zone.y — adjacent lower zones expose the box side, which
   * gives free riser faces. Registers per-tile heights on the TileMap.
   * Zone rect: { x, z, w, h, y } in tile coords.
   */
  _buildFloorZones(zones, color) {
    const mat = Materials.custom(color);
    const minY = Math.min(0, ...zones.map(zn => zn.y));
    this.floorMinY = minY;
    // Thin slabs, not solid masses: a step's visible side is exactly its
    // riser (drops between zones are ≤0.25), and beneath the staircase
    // the blueprint void shows through — matching the floating-room
    // aesthetic instead of a building-sized concrete block.
    const THICK = 0.26;
    for (const zn of zones) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(zn.w * TILE_SIZE, THICK, zn.h * TILE_SIZE),
        mat
      );
      box.position.set(
        zn.x + (zn.w * TILE_SIZE) / 2 - TILE_SIZE / 2,
        zn.y - THICK / 2,
        zn.z + (zn.h * TILE_SIZE) / 2 - TILE_SIZE / 2,
      );
      box.receiveShadow = true;
      box.castShadow = true;
      this.scene.add(box);
      this.tileMap.setHeightRect(zn.x, zn.z, zn.w, zn.h, zn.y);
    }

    // Contact shadows at the foot of each riser — cheap, deterministic
    // depth cue (real shadow casting at this scale is mush in iso)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false,
    });
    for (const hi of zones) {
      for (const lo of zones) {
        if (lo.y >= hi.y) continue;
        // lo directly north of hi (steps descend northward)
        if (lo.z + lo.h === hi.z && lo.x < hi.x + hi.w && hi.x < lo.x + lo.w) {
          const w = Math.min(hi.x + hi.w, lo.x + lo.w) - Math.max(hi.x, lo.x);
          const strip = new THREE.Mesh(new THREE.PlaneGeometry(w * TILE_SIZE, 0.34), shadowMat);
          strip.rotation.x = -Math.PI / 2;
          strip.position.set(
            Math.max(hi.x, lo.x) + (w * TILE_SIZE) / 2 - TILE_SIZE / 2,
            lo.y + 0.012,
            hi.z - TILE_SIZE / 2 - 0.17,
          );
          this.scene.add(strip);
        }
      }
    }
  }

  /**
   * Build perimeter walls (with gaps at exits) and block those tiles.
   * Walls are built as segments between exit tiles so doors are visible.
   * Green glowing floor markers are placed at each exit tile.
   */
  _buildPerimeterWalls(w, h) {
    // Multi-level rooms drop the walls down to the lowest terrace so the
    // shaft has no floating gaps
    const wallDrop = this.floorMinY ? -this.floorMinY : 0;
    const wallHeight = 2.5 + wallDrop;
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
            meshes.push(...this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, x - 1, zPos, 'h'));
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = x;
        }
      }
      if (segStart !== null) {
        meshes.push(...this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, w - 1, zPos, 'h'));
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
            meshes.push(...this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, z - 1, xPos, 'v'));
            segStart = null;
          }
        } else {
          if (segStart === null) segStart = z;
        }
      }
      if (segStart !== null) {
        meshes.push(...this._addWallSegment(wallMat, wallHeight, wallThickness, segStart, h - 1, xPos, 'v'));
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

    // Add glowing floor markers and door frames at exit tiles.
    // Doors are people-sized (2.5) even when walls extend down to a
    // lower terrace — wallHeight here includes the drop.
    this._addExitMarkers();
    this._addDoorFrames(w, h, 2.5);

    // Windows with skyline views (data-driven: room.windows)
    this._addWindows(w, h, wallThickness);

    // Interior wall fill — lift the camera-facing interior wall faces out of
    // near-black in dim rooms (round-3 note).
    this._addInteriorWallFill(w, h, exitsByWall);

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
    const baseMat = Materials.custom(0x9a9078);   // baseboard — darker than wall
    const crownMat = Materials.custom(0xf4eee0);  // crown — lighter than wall
    const railMat = Materials.custom(0xbfb6a4);   // chair-rail / two-tone reveal band
    const meshes = [];
    // Chair-rail sits at y=0.82 — a slim architectural reveal that splits
    // the wall into a subtle two-tone (Severance trim, not wainscot cosplay).
    // Kept below the y≈1.25 walk-behind fade window so it never gets picked
    // as the wall mesh by the exterior-sleeve detector.
    const RAIL_Y = 0.82;
    let mesh, base, crown, rail;
    if (orientation === 'h') {
      const segWidth = count * TILE_SIZE;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(segWidth, wallHeight, wallThickness), wallMat);
      const centerX = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(centerX, wallHeight / 2 + (this.floorMinY || 0), fixedPos);
      base = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.16, wallThickness + 0.06), baseMat);
      base.position.set(centerX, 0.08, fixedPos);
      crown = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.07, wallThickness + 0.04), crownMat);
      crown.position.set(centerX, wallHeight - 0.035, fixedPos);
      rail = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.05, wallThickness + 0.045), railMat);
      rail.position.set(centerX, RAIL_Y, fixedPos);
    } else {
      const segHeight = count * TILE_SIZE;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, segHeight), wallMat);
      const centerZ = ((from + to) / 2) * TILE_SIZE;
      mesh.position.set(fixedPos, wallHeight / 2 + (this.floorMinY || 0), centerZ);
      base = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.06, 0.16, segHeight), baseMat);
      base.position.set(fixedPos, 0.08, centerZ);
      crown = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.04, 0.07, segHeight), crownMat);
      crown.position.set(fixedPos, wallHeight - 0.035, centerZ);
      rail = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.045, 0.05, segHeight), railMat);
      rail.position.set(fixedPos, RAIL_Y, centerZ);
    }
    for (const m of [mesh, base, crown, rail]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      meshes.push(m);
    }
    return meshes;
  }

  /**
   * Windows with a skyline view. Data-driven via room.windows:
   *   { wall: 'north'|'west'|'east', from, to, sky: 'day'|'dusk'|'night' }
   * from/to are tile indices along the wall. Keep ranges clear of exits.
   */
  _addWindows(w, h, wallThickness) {
    if (!this.data.windows) return;
    const frameMat = Materials.custom(0x4a4438);
    const sillMat = Materials.custom(0xf4eee0);

    for (const win of this.data.windows) {
      const span = (win.to - win.from + 1) * TILE_SIZE;
      const winW = span - 0.35;
      const winH = 1.15;
      const centerY = 1.5;
      const center = ((win.from + win.to) / 2) * TILE_SIZE;
      const viewTex = Materials.skyline(win.sky || 'day');

      const group = new THREE.Group();
      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.07), frameMat);
      group.add(frame);
      // Sill
      const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.2, 0.05, 0.16), sillMat);
      sill.position.set(0, -(winH / 2 + 0.06), 0.04);
      group.add(sill);
      // Mullions (vertical divider per ~1.2 units)
      const mullCount = Math.max(0, Math.round(winW / 1.2) - 1);
      for (let m = 1; m <= mullCount; m++) {
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH, 0.05), frameMat);
        mull.position.set(-winW / 2 + (m * winW) / (mullCount + 1), 0, 0.015);
        group.add(mull);
      }
      // The view itself (in front of every frame face — no z-fighting)
      const view = new THREE.Mesh(
        new THREE.PlaneGeometry(winW, winH),
        new THREE.MeshBasicMaterial({ map: viewTex })
      );
      view.position.z = 0.045;
      group.add(view);

      // Position against the wall's inner face
      if (win.wall === 'north') {
        group.position.set(center, centerY, -TILE_SIZE / 2 + wallThickness / 2 + 0.05);
      } else if (win.wall === 'west') {
        group.position.set(-TILE_SIZE / 2 + wallThickness / 2 + 0.05, centerY, center);
        group.rotation.y = Math.PI / 2;
      } else if (win.wall === 'east') {
        group.position.set((w - 1) * TILE_SIZE + TILE_SIZE / 2 - wallThickness / 2 - 0.05, centerY, center);
        group.rotation.y = -Math.PI / 2;
      } else if (win.wall === 'south') {
        group.position.set(center, centerY, (h - 1) * TILE_SIZE + TILE_SIZE / 2 - wallThickness / 2 - 0.05);
        group.rotation.y = Math.PI;
      }
      group.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
      this.scene.add(group);
    }
  }

  /**
   * Interior wall fill — a faint cool additive wash on the camera-facing NORTH
   * and WEST interior wall faces so dim rooms lift out of near-black and read as
   * enclosed lit sets, not hollow greyboxes (round-3 note: reception + server
   * room interior faces near-black). In the iso rig the camera sits at +x/+z, so
   * the interior faces it actually sees are north (+z) and west (+x); the near
   * south/east walls only ever show their exterior (void) side, which this must
   * NOT touch. The fill sits on the interior side only and its meshes live at
   * north/west positions, so the Engine night-sleeve detector (which matches
   * transparent meshes at the south/east wall positions) never picks them up —
   * the walk-behind fade sleeve is left intact. Skipped in deliberately moody
   * rooms (low dirIntensity) so lounges keep their dark walls.
   */
  _addInteriorWallFill(w, h, exitsByWall) {
    const dir = this.data.lighting?.dirIntensity ?? 1.15;
    if (dir < 0.6) return;
    const opacity = Math.max(0.05, Math.min(0.13, 0.20 - dir * 0.10));
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9fb0c4, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const FILL_H = 2.24, FILL_CY = 1.18, eps = 0.03;
    // Build fill planes over contiguous runs of NON-exit tiles (so doorways stay
    // clear), one run at a time.
    const addRuns = (n, exitTiles, makePlane) => {
      let start = null;
      for (let i = 0; i < n; i++) {
        if (exitTiles.has(i)) {
          if (start !== null) { makePlane(start, i - 1); start = null; }
        } else if (start === null) {
          start = i;
        }
      }
      if (start !== null) makePlane(start, n - 1);
    };
    // NORTH interior face (+z), facing the camera
    addRuns(w, exitsByWall.north, (a, b) => {
      const len = (b - a + 1) * TILE_SIZE - 0.04;
      const cx = ((a + b) / 2) * TILE_SIZE;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, FILL_H), mat);
      p.position.set(cx, FILL_CY, -TILE_SIZE / 2 + eps);
      p.renderOrder = 1;
      this.scene.add(p);
    });
    // WEST interior face (+x), facing the camera
    addRuns(h, exitsByWall.west, (a, b) => {
      const len = (b - a + 1) * TILE_SIZE - 0.04;
      const cz = ((a + b) / 2) * TILE_SIZE;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, FILL_H), mat);
      p.rotation.y = Math.PI / 2;
      p.position.set(-TILE_SIZE / 2 + eps, FILL_CY, cz);
      p.renderOrder = 1;
      this.scene.add(p);
    });
  }

  /**
   * Add glowing green floor markers at each exit tile.
   */
  _addExitMarkers() {
    if (!this.data.exits) return;
    // Wave-2 R2: the old 0x44ff88 exit tiles read as saturated gameplay-UI
    // stickers fighting the institutional Lumon green (0x3f7d57) of the walkway
    // runners — two greens, one room (critic). Pulled toward the walkway green
    // and dimmed so the accent has ONE owner, while staying bright enough to
    // still read as a "leave here" affordance.
    const markerMat = new THREE.MeshToonMaterial({
      color: 0x4fa877,
      emissive: 0x4fa877,
      emissiveIntensity: 0.26,
      transparent: true,
      opacity: 0.55,
    });
    const markerGeo = new THREE.PlaneGeometry(0.8 * TILE_SIZE, 0.8 * TILE_SIZE);
    for (const exit of this.data.exits) {
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      // Multi-level rooms: marker sits on the terrace the exit lives on
      const ey = this.tileMap ? this.tileMap.heightAt(exit.x, exit.z) : 0;
      marker.position.set(exit.x * TILE_SIZE, ey + 0.01, exit.z * TILE_SIZE);
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

    // Group exits by wall to merge adjacent exits into wider doors.
    // Exits marked doorStyle:'none' bring their own door furniture
    // (e.g. the elevator) — no mahogany.
    const exitsByKey = {};
    for (const exit of this.data.exits) {
      if (exit.doorStyle === 'none') continue;
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
          const dyN = this.tileMap ? this.tileMap.heightAt(midCoord, wall === 'north' ? 0 : h - 1) : 0;
          doorGroup.position.set(midCoord * TILE_SIZE, dyN, zPos);
          if (wall === 'south') doorGroup.rotation.y = Math.PI;
        } else {
          const xPos = wall === 'west'
            ? -TILE_SIZE / 2
            : (w - 1) * TILE_SIZE + TILE_SIZE / 2;
          const dyW = this.tileMap ? this.tileMap.heightAt(wall === 'west' ? 0 : w - 1, midCoord) : 0;
          doorGroup.position.set(xPos, dyW, midCoord * TILE_SIZE);
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
      // Tag for Engine.applyRoomFX (contact-shadow blobs under furniture)
      obj.userData.furnitureType = type;
      this.scene.add(obj);

      // Block tiles based on footprint
      const tileX = Math.floor(x);
      const tileZ = Math.floor(z);

      // Skip blocking for small/decorative items — allows slight clipping
      // for much smoother pathing through office environments
      if (NO_BLOCK.has(type)) {
        continue;
      }

      // Facade strips block their full variant-defined width
      if (type === 'facadeStrip') {
        this.tileMap.blockRect(tileX, tileZ, Math.round(variant || 6), 1);
        continue;
      }

      const footprint = FURNITURE_FOOTPRINTS[type] || { w: 1, h: 1 };
      let fw = footprint.w, fh = footprint.h;
      // Offset entries (center-origin meshes): anchor on the tile nearest
      // the placement point, apply the declared offsets, and swap both the
      // rect and the offsets on quarter-turn rotations (S5-COLL).
      if ('ox' in footprint) {
        let ox = footprint.ox || 0, oz = footprint.oz || 0;
        if (rotation && Math.abs(Math.abs(rotation) % Math.PI - Math.PI / 2) < 0.1) {
          [fw, fh] = [fh, fw];
          [ox, oz] = [oz, ox];
        }
        const ax = Math.floor(x + 0.5 - 1e-6) + ox;
        const az = Math.floor(z + 0.5 - 1e-6) + oz;
        this.tileMap.blockRect(ax, az, fw, fh);
        continue;
      }
      // Legacy corner-anchored entries. Cubicle walls are the only legacy
      // type whose footprint (2x1) accounts for rotation — swap w/h when
      // they're placed as side dividers (90°).
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
