import * as THREE from 'three';
import { TileMap } from '../world/TileMap.js';
import { Furniture } from '../world/Furniture.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { TILE_SIZE } from '../utils/constants.js';
import { BUILDING_MAP, floorLabel } from '../data/buildingMap.js';
import { ProceduralNormals } from '../effects/ProceduralNormals.js';
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

// ── Doors ─────────────────────────────────────────────────────────────────
// One construction, three dresses (see Room._buildDoorGroup). Every door in
// the building is the same joinery — cased frame, stop bead, stile-and-rail
// leaf, hardware on a backplate, threshold — so the tiers read as one
// millwork shop working to three budgets rather than three unrelated props.
// Previously EVERY opening in the game, garage service door included, got
// mahogany with pure-gold (0xffd700, metalness 0.98) trim.
//
//   office  — the building's standard: pale ash leaf, painted institutional
//             frame, brushed-nickel lever. Severance-sterile, well made.
//   exec    — the same door in mahogany with aged-brass beading, a knob on a
//             rose, and a shallow crown. Aged brass, NOT pure gold: with no
//             env map a 0.98-metalness gold blows out to a flat white blob.
//   service — obsidian steel slab, wired vision lite, kick plate, push bar,
//             and a warm line of light under the leaf (COMP_CARD §6).
const DOOR_STYLES = {
  office:  { hardware: 'lever', beading: true,  crown: false, kickPlate: false, visionLite: false, underGlow: false },
  exec:    { hardware: 'knob',  beading: true,  crown: true,  kickPlate: false, visionLite: false, underGlow: false },
  service: { hardware: 'bar',   beading: false, crown: false, kickPlate: true,  visionLite: true,  underGlow: true  },
};

// Which dress each room's openings wear. Anything unlisted is 'office'.
// A single exit can override with `doorStyle: 'exec'` etc. in room data
// ('none' still means "this opening brings its own door furniture").
const ROOM_DOOR_STYLE = {
  ross_office: 'exec', ross_office_large: 'exec', conference_room: 'exec',
  executive_floor: 'exec', board_room: 'exec',
  penthouse: 'exec', penthouse_expanded: 'exec', penthouse_aquarium: 'exec',
  penthouse_analytics: 'exec', penthouse_bar: 'exec',
  parking_garage: 'service', stairwell: 'service', archive: 'service',
  vault: 'service', server_room: 'service', floor_13: 'service',
  old_branch: 'service', old_vault: 'service', transit_bus: 'service',
};

// Door materials, built once per style and cached. Kept local rather than in
// MaterialLibrary because nothing else in the game wears them.
const _doorMatCache = {};
function doorMaterials(styleKey) {
  if (_doorMatCache[styleKey]) return _doorMatCache[styleKey];
  const wood  = ProceduralNormals.get('wood',  { repeat: [1, 3] });
  const steel = ProceduralNormals.get('metal', { repeat: [2, 4] });
  // Both helpers carry a small emissive floor. MaterialLibrary is env-map
  // free, so a PBR prop in a night-graded room falls to black while the
  // MeshToon walls beside it hold a mid-tone off their gradient ramp — the
  // first pass of these doors was a black rectangle in every dim room.
  // The lift stands in for the ambient bounce, nothing more.
  const lacquer = (color, nrm, scale, lift = 0x2a2622) => {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.42, metalness: 0.0,
      emissive: new THREE.Color(lift), emissiveIntensity: 0.8,
    });
    m.clearcoat = 0.62; m.clearcoatRoughness = 0.16;
    m.normalMap = nrm; m.normalScale = new THREE.Vector2(scale, scale);
    return m;
  };
  const metal = (color, rough, metalness, lift = 0x2b2f33) => {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: rough, metalness,
      emissive: new THREE.Color(lift), emissiveIntensity: 0.8,
    });
    m.clearcoat = 0.3; m.clearcoatRoughness = 0.28;
    m.normalMap = steel; m.normalScale = new THREE.Vector2(0.3, 0.3);
    return m;
  };
  let M;
  if (styleKey === 'exec') {
    M = {
      face:      lacquer(0x8a3b1e, wood, 0.6, 0x30201a),
      panel:     lacquer(0x6b2712, wood, 0.7, 0x281812),
      frame:     lacquer(0x3f2015, wood, 0.5, 0x1f1410),
      frameBead: metal(0x9c7f3a, 0.34, 0.5, 0x2e2716),
      trim:      metal(0xc39c46, 0.3, 0.5, 0x3a2f18),
      hardware:  metal(0xd0a94e, 0.26, 0.55, 0x40331a),
      glass:     new THREE.MeshPhysicalMaterial({ color: 0x2a3038, roughness: 0.3, metalness: 0.1 }),
    };
  } else if (styleKey === 'service') {
    M = {
      face:      metal(0x545c64, 0.46, 0.22, 0x22262a),
      panel:     metal(0x3f464d, 0.5, 0.2, 0x1b1f23),
      frame:     metal(0x24282c, 0.55, 0.18, 0x121517),
      frameBead: metal(0x767d84, 0.4, 0.22, 0x2b3035),
      trim:      metal(0x8f969d, 0.36, 0.25, 0x33383d),
      hardware:  metal(0xb2b9c0, 0.32, 0.28, 0x3d4247),
      glass:     new THREE.MeshPhysicalMaterial({ color: 0x1c2a2a, roughness: 0.42, metalness: 0.05 }),
    };
  } else {
    M = {
      face:      lacquer(0xb4a992, wood, 0.5, 0x2d2a25),
      panel:     lacquer(0x9c917a, wood, 0.6, 0x272420),
      frame:     lacquer(0x74796a, wood, 0.3, 0x1e211c),   // institutional green-grey
      frameBead: lacquer(0x878d7c, wood, 0.25, 0x232620),
      trim:      metal(0xb9c0c6, 0.34, 0.28, 0x3f4348),
      hardware:  metal(0xc3cad0, 0.3, 0.3, 0x44484d),
      glass:     new THREE.MeshPhysicalMaterial({ color: 0x263038, roughness: 0.35, metalness: 0.08 }),
    };
  }
  _doorMatCache[styleKey] = M;
  return M;
}

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
   * Add door geometry at each exit tile.
   * One construction (cased frame + stile-and-rail leaf + hardware +
   * threshold), three dresses — see DOOR_STYLES / doorStyleFor().
   */
  _addDoorFrames(w, h, wallHeight) {
    if (!this.data.exits) return;

    // Group exits by wall to merge adjacent exits into wider doors.
    // Exits marked doorStyle:'none' bring their own door furniture
    // (e.g. the elevator) — no leaf here.
    // Any other doorStyle value ('office'|'exec'|'service') overrides the
    // per-room default for that opening.
    const roomStyle = this._doorStyleFor();
    // Openings that already carry an `elevatorDoors` prop are the elevator's
    // to dress — never stack a joinery leaf on top of one. Six of the eleven
    // elevator exits said `doorStyle: 'none'` in room data and the rest did
    // not, so reception's executive shaft and the executive floor's own
    // shaft each shipped a wooden office door layered over the steel car
    // doors. Deriving it from the furniture means new elevators can't
    // reintroduce the bug by forgetting the flag.
    const elevatorTiles = (this.data.furniture || [])
      .filter(f => f.type === 'elevatorDoors')
      .map(f => ({ x: f.x, z: f.z }));
    const hasElevator = (x, z) => elevatorTiles.some(
      e => Math.abs(e.x - x) <= 1.2 && Math.abs(e.z - z) <= 1.2
    );

    const exitsByKey = {};
    for (const exit of this.data.exits) {
      if (exit.doorStyle === 'none') continue;
      if (hasElevator(exit.x, exit.z)) continue;
      let wall, coord;
      if (exit.z === 0)         { wall = 'north'; coord = exit.x; }
      else if (exit.z === h - 1){ wall = 'south'; coord = exit.x; }
      else if (exit.x === 0)    { wall = 'west';  coord = exit.z; }
      else if (exit.x === w - 1){ wall = 'east';  coord = exit.z; }
      else continue;
      const style = DOOR_STYLES[exit.doorStyle] ? exit.doorStyle : roomStyle;
      const key = `${wall}|${style}`;
      if (!exitsByKey[key]) exitsByKey[key] = [];
      exitsByKey[key].push(coord);
    }

    for (const [key, coords] of Object.entries(exitsByKey)) {
      const [wall, style] = key.split('|');
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
        const doorGroup = this._buildDoorGroup(span, wallHeight, style);

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

        doorGroup.name = `door_${style}_${wall}_${run.start}`;
        this.scene.add(doorGroup);
      }
    }
  }

  /**
   * Which dress this room's doors wear. Room data can override per-opening
   * with `doorStyle` on the exit.
   */
  _doorStyleFor() {
    return ROOM_DOOR_STYLE[this.data.id] || 'office';
  }

  /**
   * Build one door group. The group's local +Z faces into the room;
   * position and rotate as needed.
   *
   * ONE construction for every door in the building — cased frame with a
   * stop bead, stile-and-rail leaf with two recessed panels, hardware on a
   * backplate, threshold plate. Only the materials and a couple of grace
   * notes change per style, so the garage service door and the board-room
   * door read as the same millwork shop at two budgets. Openings 2+ tiles
   * wide become a real pair of leaves meeting on a centre astragal instead
   * of one absurdly wide slab wearing a single knob.
   */
  _buildDoorGroup(spanTiles, wallHeight, styleKey = 'office') {
    const S = DOOR_STYLES[styleKey] || DOOR_STYLES.office;
    const M = doorMaterials(styleKey);
    const group = new THREE.Group();

    const openW      = spanTiles * TILE_SIZE * 0.82;
    const doorHeight = wallHeight * 0.88;
    const thick      = 0.07;
    const isPair     = spanTiles >= 2;
    const leafW      = isPair ? openW / 2 - 0.004 : openW;

    // -- Leaves ---------------------------------------------------------
    // Each leaf: core slab, then stiles/rails raised PROUD of the core so
    // the panel fields sit in genuine relief (the old version floated two
    // darker boxes on a flat slab — no shadow line, no read).
    const leafCentres = isPair ? [-(leafW / 2 + 0.004), leafW / 2 + 0.004] : [0];
    const railD  = 0.018;                  // how far the frame stands proud
    const railZ  = thick / 2 + railD / 2;
    const stileW = Math.min(0.13, leafW * 0.16);
    for (const cx of leafCentres) {
      const core = new THREE.Mesh(new THREE.BoxGeometry(leafW, doorHeight, thick), M.panel);
      core.position.set(cx, doorHeight / 2, 0);
      group.add(core);

      // Vertical stiles
      for (const sx of [-(leafW / 2 - stileW / 2), leafW / 2 - stileW / 2]) {
        const stile = new THREE.Mesh(new THREE.BoxGeometry(stileW, doorHeight, railD), M.face);
        stile.position.set(cx + sx, doorHeight / 2, railZ);
        group.add(stile);
      }
      // Top rail, lock rail, bottom rail
      for (const [ry, rh] of [
        [doorHeight - 0.075, 0.15],
        [doorHeight * 0.44,  0.19],
        [0.115,              0.23],
      ]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(leafW, rh, railD), M.face);
        rail.position.set(cx, ry, railZ);
        group.add(rail);
      }

      if (S.beading) {
        // A thin bead outlining each panel field — brass on exec, nickel on
        // office. Four sticks, not a printed stripe.
        for (const [py, ph] of [[doorHeight * 0.715, doorHeight * 0.37], [doorHeight * 0.28, doorHeight * 0.28]]) {
          const bw = leafW - stileW * 2 + 0.014;
          for (const [bx, by, w2, h2] of [
            [0, py + ph / 2, bw, 0.013], [0, py - ph / 2, bw, 0.013],
            [-(bw / 2), py, 0.013, ph], [bw / 2, py, 0.013, ph],
          ]) {
            const bead = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.011), M.trim);
            bead.position.set(cx + bx, by, thick / 2 + 0.006);
            group.add(bead);
          }
        }
      }
      if (S.kickPlate) {
        // Service doors get a scuffed steel kick plate, not joinery
        const kick = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.03, 0.3, 0.012), M.hardware);
        kick.position.set(cx, 0.19, thick / 2 + 0.021);
        group.add(kick);
      }
      if (S.visionLite) {
        // Wired-glass vision lite, dark — you never quite see through it
        const liteW = Math.max(0.16, Math.min(0.42, leafW - stileW * 2.4));
        const liteFrame = new THREE.Mesh(
          new THREE.BoxGeometry(liteW + 0.05, 0.55, 0.012), M.hardware
        );
        liteFrame.position.set(cx, doorHeight * 0.72, thick / 2 + 0.004);
        group.add(liteFrame);
        const lite = new THREE.Mesh(new THREE.BoxGeometry(liteW, 0.5, 0.014), M.glass);
        lite.position.set(cx, doorHeight * 0.72, thick / 2 + 0.012);
        group.add(lite);
      }
    }

    // Centre astragal on a pair
    if (isPair) {
      const astragal = new THREE.Mesh(new THREE.BoxGeometry(0.03, doorHeight, thick + 0.03), M.face);
      astragal.position.set(0, doorHeight / 2, 0.008);
      group.add(astragal);
    }

    // -- Hardware -------------------------------------------------------
    // Handles on the leading edge of each leaf, at a real 1.02m.
    const knobY = 1.02;
    for (const cx of leafCentres) {
      const inward = isPair ? (cx < 0 ? 1 : -1) : 1;    // pair handles meet at the centre
      const hx = cx + inward * (leafW / 2 - 0.13);
      if (S.hardware === 'knob') {
        const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20), M.hardware);
        rose.rotation.x = Math.PI / 2;
        rose.position.set(hx, knobY, thick / 2 + 0.026);
        group.add(rose);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 14), M.hardware);
        knob.position.set(hx, knobY, thick / 2 + 0.086);
        group.add(knob);
      } else if (S.hardware === 'lever') {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.014), M.hardware);
        plate.position.set(hx, knobY, thick / 2 + 0.026);
        group.add(plate);
        const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.05, 10), M.hardware);
        spindle.rotation.x = Math.PI / 2;
        spindle.position.set(hx, knobY, thick / 2 + 0.05);
        group.add(spindle);
        // The lever arm, angled down toward the leaf edge
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.028, 0.032), M.hardware);
        lever.position.set(hx - inward * 0.06, knobY - 0.018, thick / 2 + 0.07);
        lever.rotation.z = inward * 0.22;
        group.add(lever);
      } else {
        // 'bar' — service doors get a horizontal push bar
        const bar = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.26, 0.045, 0.045), M.hardware);
        bar.position.set(cx, knobY, thick / 2 + 0.058);
        group.add(bar);
        for (const bx of [-(leafW / 2 - 0.13), leafW / 2 - 0.13]) {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.038, 0.055), M.hardware);
          bracket.position.set(cx + bx, knobY, thick / 2 + 0.028);
          group.add(bracket);
        }
      }
    }

    // -- Cased frame: posts + head, with a stop bead standing proud ------
    const frameW = 0.11, frameD = 0.14, headH = 0.12, beadD = 0.03;
    for (const sx of [-(openW / 2 + frameW / 2), openW / 2 + frameW / 2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(frameW, wallHeight, frameD), M.frame);
      post.position.set(sx, wallHeight / 2, 0);
      group.add(post);
      // Stop bead — the proud strip the leaf shuts against. This is what
      // gives a door a shadow line instead of a printed-on look.
      const bead = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, doorHeight + headH, beadD), M.frameBead
      );
      bead.position.set(
        sx - Math.sign(sx) * (frameW / 2 - 0.02),
        (doorHeight + headH) / 2,
        frameD / 2 + beadD / 2
      );
      group.add(bead);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(openW + frameW * 2, headH, frameD), M.frame);
    head.position.set(0, doorHeight + headH / 2, 0);
    group.add(head);
    const headBead = new THREE.Mesh(
      new THREE.BoxGeometry(openW + frameW * 2, 0.026, beadD), M.frameBead
    );
    headBead.position.set(0, doorHeight + 0.013, frameD / 2 + beadD / 2);
    group.add(headBead);

    if (S.crown) {
      // Exec openings get a shallow cornice over the head — the only
      // ornament, and it earns its keep by catching the ceiling wash.
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(openW + frameW * 2 + 0.09, 0.055, frameD + 0.05), M.trim
      );
      crown.position.set(0, doorHeight + headH + 0.028, 0.025);
      group.add(crown);
    }

    // -- Threshold plate ------------------------------------------------
    const sill = new THREE.Mesh(new THREE.BoxGeometry(openW + frameW, 0.022, 0.16), M.hardware);
    sill.position.set(0, 0.014, 0);
    group.add(sill);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

    if (S.underGlow) {
      // Light in the seam: a service door with something lit behind it, read
      // as the thin bright line at the leaf's foot. Must sit on the ROOM
      // side of the leaf — behind it (the first pass) it is occluded by the
      // door it is supposed to be leaking around.
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(openW - 0.09, 0.014, 0.016),
        new THREE.MeshStandardMaterial({
          color: 0xffc98a, emissive: 0xff9a2a, emissiveIntensity: 1.1, roughness: 0.7,
        })
      );
      glow.position.set(0, 0.032, thick / 2 + 0.014);
      glow.castShadow = false;
      group.add(glow);
    }

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
      const { type, x, z, rotation } = item;
      let variant = item.variant;

      // Look up factory method
      const factoryFn = Furniture[type];
      if (!factoryFn) {
        console.warn(`[Room] Unknown furniture type: "${type}" — skipping.`);
        continue;
      }

      // Elevator indicators read the floor you are STANDING ON. Rather than
      // hand-labelling every shaft in room data (and getting two of them
      // wrong, which is what happened), derive the label from the canonical
      // building map. Explicit `variant` in room data still wins.
      if (type === 'elevatorDoors' && variant === undefined) {
        variant = floorLabel(BUILDING_MAP[this.data.id]?.floor);
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
