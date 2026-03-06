// ============================================================
// Room Definitions — all 8 rooms for the DiL Simulator
// ============================================================
// Each room is pure data consumed by Room.js builder.
// Furniture types must match Furniture factory methods.
// Connection map:
//   cubicle_farm (hub)
//     NORTH  -> alex_office
//     WEST   -> break_room
//     EAST   -> server_room
//     SOUTH  -> reception
//   alex_office EAST -> conference_room
//   reception SOUTH  -> parking_garage
//   reception ELEVATOR -> executive_floor (Act 3)
// ============================================================

export const ROOMS = {

  // ----------------------------------------------------------
  // 1. CUBICLE FARM — the hub, 20x16
  // ----------------------------------------------------------
  cubicle_farm: {
    id: 'cubicle_farm',
    name: 'Cubicle Farm',
    width: 20,
    height: 16,
    floorColor: 0xc8bfa9,
    walls: true,
    furniture: [
      // === Andrew's cubicle cluster (column 3, row 8) ===
      { type: 'desk', x: 3, z: 8, rotation: 0 },
      { type: 'monitor', x: 3, z: 7.7 },
      { type: 'keyboard', x: 3, z: 8.2 },
      { type: 'chair', x: 3, z: 8.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 2, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 4, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 2, z: 7.5, rotation: Math.PI / 2 },
      { type: 'fileCabinet', x: 2, z: 9 },
      { type: 'trashCan', x: 4, z: 9 },

      // === Janet's cubicle (column 5, row 8) ===
      { type: 'desk', x: 6, z: 8, rotation: 0 },
      { type: 'monitor', x: 6, z: 7.7 },
      { type: 'keyboard', x: 6, z: 8.2 },
      { type: 'chair', x: 6, z: 8.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 5, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 7, z: 7, rotation: 0 },
      { type: 'plant', x: 7, z: 9 },

      // === Cubicle row 2 (column 3, row 5) ===
      { type: 'desk', x: 3, z: 5, rotation: 0 },
      { type: 'monitor', x: 3, z: 4.7 },
      { type: 'keyboard', x: 3, z: 5.2 },
      { type: 'chair', x: 3, z: 5.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 2, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 4, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 2, z: 4.5, rotation: Math.PI / 2 },

      // === Cubicle row 2 (column 6, row 5) ===
      { type: 'desk', x: 6, z: 5, rotation: 0 },
      { type: 'monitor', x: 6, z: 4.7 },
      { type: 'keyboard', x: 6, z: 5.2 },
      { type: 'chair', x: 6, z: 5.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 5, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 7, z: 4, rotation: 0 },
      { type: 'fileCabinet', x: 7, z: 5 },

      // === Cubicle row 3 (column 10, row 5) ===
      { type: 'desk', x: 10, z: 5, rotation: 0 },
      { type: 'monitor', x: 10, z: 4.7 },
      { type: 'keyboard', x: 10, z: 5.2 },
      { type: 'chair', x: 10, z: 5.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 9, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 11, z: 4, rotation: 0 },
      { type: 'trashCan', x: 11, z: 5 },

      // === Cubicle row 3 (column 10, row 8) ===
      { type: 'desk', x: 10, z: 8, rotation: 0 },
      { type: 'monitor', x: 10, z: 7.7 },
      { type: 'keyboard', x: 10, z: 8.2 },
      { type: 'chair', x: 10, z: 8.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 9, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 11, z: 7, rotation: 0 },
      { type: 'fileCabinet', x: 11, z: 9 },

      // === Cubicle row 4 (column 14, row 5) ===
      { type: 'desk', x: 14, z: 5, rotation: 0 },
      { type: 'monitor', x: 14, z: 4.7 },
      { type: 'keyboard', x: 14, z: 5.2 },
      { type: 'chair', x: 14, z: 5.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 13, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 15, z: 4, rotation: 0 },
      { type: 'plant', x: 15, z: 6 },

      // === Cubicle row 4 (column 14, row 8) ===
      { type: 'desk', x: 14, z: 8, rotation: 0 },
      { type: 'monitor', x: 14, z: 7.7 },
      { type: 'keyboard', x: 14, z: 8.2 },
      { type: 'chair', x: 14, z: 8.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 13, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 15, z: 7, rotation: 0 },
      { type: 'fileCabinet', x: 15, z: 9 },

      // === Cubicle row 5 (column 17, row 5) ===
      { type: 'desk', x: 17, z: 5, rotation: 0 },
      { type: 'monitor', x: 17, z: 4.7 },
      { type: 'keyboard', x: 17, z: 5.2 },
      { type: 'chair', x: 17, z: 5.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 16, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 18, z: 4, rotation: 0 },

      // === Cubicle row 5 (column 17, row 8) ===
      { type: 'desk', x: 17, z: 8, rotation: 0 },
      { type: 'monitor', x: 17, z: 7.7 },
      { type: 'keyboard', x: 17, z: 8.2 },
      { type: 'chair', x: 17, z: 8.8, rotation: Math.PI },
      { type: 'cubicleWall', x: 16, z: 7, rotation: 0 },
      { type: 'cubicleWall', x: 18, z: 7, rotation: 0 },

      // === Shared resources area (central) ===
      { type: 'printer', x: 12, z: 2 },
      { type: 'fileCabinet', x: 13, z: 2 },
      { type: 'fileCabinet', x: 14, z: 2 },
      { type: 'trashCan', x: 11, z: 2 },

      // === Water cooler alcove ===
      { type: 'waterCooler', x: 15, z: 12 },
      { type: 'plant', x: 16, z: 12 },
      { type: 'trashCan', x: 14, z: 12 },

      // === Southern lounge area near reception exit ===
      { type: 'plant', x: 7, z: 13 },
      { type: 'plant', x: 12, z: 13 },
      { type: 'trashCan', x: 5, z: 14 },

      // === File cabinets along north wall ===
      { type: 'fileCabinet', x: 2, z: 1 },
      { type: 'fileCabinet', x: 3, z: 1 },
      { type: 'fileCabinet', x: 4, z: 1 },
      { type: 'fileCabinet', x: 5, z: 1 },
      { type: 'fileCabinet', x: 16, z: 1 },
      { type: 'fileCabinet', x: 17, z: 1 },
      { type: 'fileCabinet', x: 18, z: 1 },

      // === Plants along edges ===
      { type: 'plant', x: 1, z: 1 },
      { type: 'plant', x: 1, z: 14 },
      { type: 'plant', x: 18, z: 1 },
      { type: 'plant', x: 18, z: 14 },

      // === Extra cubicle walls for maze feel ===
      { type: 'cubicleWall', x: 9, z: 10, rotation: 0 },
      { type: 'cubicleWall', x: 10, z: 10, rotation: 0 },
      { type: 'cubicleWall', x: 8, z: 11, rotation: Math.PI / 2 },
    ],
    npcs: [
      { id: 'janet', x: 5, z: 8, facing: Math.PI },
      { id: 'intern', x: 10, z: 6, facing: 0 },
      { id: 'monica', x: 14, z: 6, facing: Math.PI / 2 },
      { id: 'karen', x: 15, z: 12, facing: -Math.PI / 2 },
    ],
    exits: [
      // NORTH exits -> Alex's Office
      { x: 9, z: 0, targetRoom: 'alex_office', spawnX: 4, spawnZ: 6 },
      { x: 10, z: 0, targetRoom: 'alex_office', spawnX: 4, spawnZ: 6 },
      // WEST exit -> Break Room
      { x: 0, z: 7, targetRoom: 'break_room', spawnX: 7, spawnZ: 3 },
      { x: 0, z: 8, targetRoom: 'break_room', spawnX: 7, spawnZ: 3 },
      // EAST exit -> Server Room
      { x: 19, z: 7, targetRoom: 'server_room', spawnX: 2, spawnZ: 7 },
      { x: 19, z: 8, targetRoom: 'server_room', spawnX: 2, spawnZ: 7 },
      // SOUTH exits -> Reception
      { x: 9, z: 15, targetRoom: 'reception', spawnX: 7, spawnZ: 1 },
      { x: 10, z: 15, targetRoom: 'reception', spawnX: 7, spawnZ: 1 },
    ],
    interactables: [
      { x: 15, z: 12, type: 'water_cooler', dialogId: 'water_cooler' },
      { x: 12, z: 2, type: 'printer', dialogId: 'printer_interact' },
      { x: 3, z: 10, type: 'andrews_desk', dialogId: 'andrews_desk' },
    ],
    playerSpawn: { x: 3, z: 11 },
  },

  // ----------------------------------------------------------
  // 2. BREAK ROOM — 10x8
  // ----------------------------------------------------------
  break_room: {
    id: 'break_room',
    name: 'Break Room',
    width: 10,
    height: 8,
    floorColor: 0xd8d0c0,
    walls: true,
    furniture: [
      // === Kitchen counter along north wall ===
      { type: 'desk', x: 1, z: 1, rotation: 0 },   // counter surface
      { type: 'desk', x: 3, z: 1, rotation: 0 },   // counter surface continued
      { type: 'coffeeMachine', x: 2, z: 1 },
      { type: 'microwave', x: 4, z: 1 },

      // === Fridge in NW corner ===
      { type: 'fridge', x: 1, z: 0.5, rotation: 0 },

      // === Vending machines along east wall ===
      { type: 'vendingMachine', x: 8, z: 2, rotation: -Math.PI / 2 },
      { type: 'vendingMachine', x: 8, z: 4, rotation: -Math.PI / 2 },

      // === Table 1 (center-left) ===
      { type: 'desk', x: 3, z: 4, rotation: 0 },  // break table
      { type: 'chair', x: 2, z: 4, rotation: Math.PI / 2 },
      { type: 'chair', x: 4, z: 4, rotation: -Math.PI / 2 },
      { type: 'chair', x: 3, z: 3, rotation: 0 },
      { type: 'chair', x: 3, z: 5, rotation: Math.PI },

      // === Table 2 (center-right) ===
      { type: 'desk', x: 6, z: 4, rotation: 0 },  // break table
      { type: 'chair', x: 5, z: 4, rotation: Math.PI / 2 },
      { type: 'chair', x: 7, z: 4, rotation: -Math.PI / 2 },
      { type: 'chair', x: 6, z: 3, rotation: 0 },
      { type: 'chair', x: 6, z: 5, rotation: Math.PI },

      // === Trash and misc ===
      { type: 'trashCan', x: 5, z: 1 },
      { type: 'trashCan', x: 8, z: 6 },
      { type: 'plant', x: 1, z: 6 },

      // === Motivational poster ===
      { type: 'motivationalPoster', x: 5, z: 0.1, rotation: 0 },

      // === Water cooler ===
      { type: 'waterCooler', x: 8, z: 0.5 },
    ],
    npcs: [
      { id: 'chad', x: 4, z: 4, facing: -Math.PI / 2 },
    ],
    exits: [
      // EAST exit -> Cubicle Farm
      { x: 9, z: 3, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
      { x: 9, z: 4, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
    ],
    interactables: [
      { x: 2, z: 1, type: 'coffee_machine', dialogId: 'coffee_machine' },
      { x: 1, z: 0, type: 'fridge', dialogId: 'fridge_notes' },
      { x: 8, z: 2, type: 'vending_machine', dialogId: 'vending_machine' },
      { x: 8, z: 4, type: 'vending_machine', dialogId: 'vending_machine' },
      { x: 4, z: 1, type: 'microwave', dialogId: 'microwave' },
    ],
    playerSpawn: { x: 7, z: 2 },
  },

  // ----------------------------------------------------------
  // 3. ALEX'S OFFICE — 8x8, boss room
  // ----------------------------------------------------------
  alex_office: {
    id: 'alex_office',
    name: "Alex's Office",
    width: 8,
    height: 8,
    floorColor: 0x4a6741,  // nicer carpet for the boss
    walls: true,
    furniture: [
      // === Boss desk (commanding position, north-center) ===
      { type: 'desk', x: 4, z: 2, rotation: Math.PI },
      { type: 'monitor', x: 4, z: 2.3 },
      { type: 'monitor', x: 3.3, z: 2.3 },  // dual monitors, of course
      { type: 'keyboard', x: 4, z: 1.8 },
      { type: 'chair', x: 4, z: 1, rotation: 0 },  // behind desk facing south

      // === Visitor chairs ===
      { type: 'chair', x: 3, z: 4, rotation: 0 },
      { type: 'chair', x: 5, z: 4, rotation: 0 },

      // === Motivational posters along walls ===
      { type: 'motivationalPoster', x: 1, z: 0.1, rotation: 0 },   // "SYNERGY"
      { type: 'motivationalPoster', x: 3, z: 0.1, rotation: 0 },   // "HUSTLE"
      { type: 'motivationalPoster', x: 6, z: 0.1, rotation: 0 },   // "TEAMWORK"

      // === File cabinet behind desk ===
      { type: 'fileCabinet', x: 1, z: 1 },
      { type: 'fileCabinet', x: 2, z: 1 },

      // === Golf putter leaning against wall ===
      { type: 'plant', x: 6, z: 1 },  // the "dying" plant

      // === Bookshelf / credenza area (west wall) ===
      { type: 'fileCabinet', x: 0.5, z: 3 },
      { type: 'fileCabinet', x: 0.5, z: 4 },
      { type: 'fileCabinet', x: 0.5, z: 5 },

      // === Small meeting table ===
      { type: 'plant', x: 7, z: 6 },
      { type: 'trashCan', x: 7, z: 1 },
    ],
    npcs: [
      { id: 'alex', x: 4, z: 1.5, facing: Math.PI },
    ],
    exits: [
      // SOUTH exits -> Cubicle Farm
      { x: 3, z: 7, targetRoom: 'cubicle_farm', spawnX: 9, spawnZ: 2 },
      { x: 4, z: 7, targetRoom: 'cubicle_farm', spawnX: 10, spawnZ: 1 },
      // EAST exit -> Conference Room
      { x: 7, z: 3, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
      { x: 7, z: 4, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
    ],
    interactables: [
      { x: 6, z: 1, type: 'dying_plant', dialogId: 'dying_plant' },
      { x: 4, z: 2, type: 'alex_desk', dialogId: 'alex_desk' },
    ],
    playerSpawn: { x: 4, z: 6 },
  },

  // ----------------------------------------------------------
  // 4. CONFERENCE ROOM — 12x8
  // ----------------------------------------------------------
  conference_room: {
    id: 'conference_room',
    name: 'Conference Room',
    width: 12,
    height: 8,
    floorColor: 0x4a6741,  // same carpet as boss office
    walls: true,
    furniture: [
      // === Conference table (big, central) ===
      { type: 'conferenceTable', x: 6, z: 4, rotation: 0 },

      // === Chairs around the table ===
      { type: 'chair', x: 4, z: 3, rotation: Math.PI / 2 },
      { type: 'chair', x: 4, z: 5, rotation: Math.PI / 2 },
      { type: 'chair', x: 5, z: 3, rotation: Math.PI / 2 },
      { type: 'chair', x: 5, z: 5, rotation: Math.PI / 2 },
      { type: 'chair', x: 7, z: 3, rotation: -Math.PI / 2 },
      { type: 'chair', x: 7, z: 5, rotation: -Math.PI / 2 },
      { type: 'chair', x: 8, z: 3, rotation: -Math.PI / 2 },
      { type: 'chair', x: 8, z: 5, rotation: -Math.PI / 2 },
      { type: 'chair', x: 6, z: 2, rotation: 0 },       // head of table
      { type: 'chair', x: 6, z: 6, rotation: Math.PI },  // foot of table

      // === Whiteboard on north wall ===
      { type: 'whiteboard', x: 6, z: 0.2, rotation: 0 },

      // === Second whiteboard on east wall ===
      { type: 'whiteboard', x: 11, z: 4, rotation: -Math.PI / 2 },

      // === Projector screen area — just a motivational poster placeholder ===
      { type: 'motivationalPoster', x: 3, z: 0.1, rotation: 0 },

      // === Plants in corners ===
      { type: 'plant', x: 1, z: 1 },
      { type: 'plant', x: 10, z: 1 },
      { type: 'plant', x: 1, z: 6 },
      { type: 'plant', x: 10, z: 6 },

      // === Trash can ===
      { type: 'trashCan', x: 11, z: 1 },
      { type: 'trashCan', x: 11, z: 6 },
    ],
    npcs: [
      // Henderson beneficiaries appear based on quest progress
      { id: 'karen', x: 8, z: 5, facing: -Math.PI / 2, dialogId: 'karen_meeting', condition: { flag: 'briefing_complete', notFlag: 'karen_defeated' } },
      { id: 'chad', x: 8, z: 5, facing: -Math.PI / 2, dialogId: 'chad_meeting', condition: { flag: 'karen_defeated', notFlag: 'chad_defeated' } },
      { id: 'grandma', x: 6, z: 6, facing: 0, dialogId: 'grandma_meeting', condition: { flag: 'chad_defeated', notFlag: 'grandma_defeated' } },
    ],
    exits: [
      // WEST exit -> Alex's Office
      { x: 0, z: 3, targetRoom: 'alex_office', spawnX: 6, spawnZ: 3 },
      { x: 0, z: 4, targetRoom: 'alex_office', spawnX: 6, spawnZ: 4 },
    ],
    interactables: [
      { x: 6, z: 0, type: 'whiteboard', dialogId: 'conference_whiteboard' },
    ],
    playerSpawn: { x: 1, z: 4 },
  },

  // ----------------------------------------------------------
  // 5. SERVER ROOM — 8x10, dark & cool
  // ----------------------------------------------------------
  server_room: {
    id: 'server_room',
    name: 'Server Room',
    width: 8,
    height: 10,
    floorColor: 0x2a2a3a,  // dark floor
    walls: true,
    lights: [
      { type: 'point', color: 0x00ff44, intensity: 0.6, x: 1, y: 2, z: 3, distance: 6 },
      { type: 'point', color: 0x00ff44, intensity: 0.6, x: 3, y: 2, z: 3, distance: 6 },
      { type: 'point', color: 0x00ff44, intensity: 0.6, x: 5, y: 2, z: 3, distance: 6 },
      { type: 'point', color: 0x4488ff, intensity: 0.8, x: 6, y: 2, z: 7, distance: 8 },
    ],
    furniture: [
      // === Row 1 of server racks (west side) ===
      { type: 'serverRack', x: 1, z: 1, rotation: 0 },
      { type: 'serverRack', x: 1, z: 2, rotation: 0 },
      { type: 'serverRack', x: 1, z: 3, rotation: 0 },
      { type: 'serverRack', x: 1, z: 4, rotation: 0 },
      { type: 'serverRack', x: 1, z: 5, rotation: 0 },

      // === Row 2 of server racks ===
      { type: 'serverRack', x: 3, z: 1, rotation: Math.PI },
      { type: 'serverRack', x: 3, z: 2, rotation: Math.PI },
      { type: 'serverRack', x: 3, z: 3, rotation: Math.PI },
      { type: 'serverRack', x: 3, z: 4, rotation: Math.PI },
      { type: 'serverRack', x: 3, z: 5, rotation: Math.PI },

      // === Row 3 of server racks (east side) ===
      { type: 'serverRack', x: 5, z: 1, rotation: 0 },
      { type: 'serverRack', x: 5, z: 2, rotation: 0 },
      { type: 'serverRack', x: 5, z: 3, rotation: 0 },
      { type: 'serverRack', x: 5, z: 4, rotation: 0 },

      // === Dave's corner (southeast) — his desk among the racks ===
      { type: 'desk', x: 6, z: 7, rotation: 0 },
      { type: 'monitor', x: 6, z: 6.7 },
      { type: 'monitor', x: 6.5, z: 6.7 },
      { type: 'monitor', x: 5.5, z: 6.7 },  // triple-monitor setup
      { type: 'keyboard', x: 6, z: 7.2 },
      { type: 'chair', x: 6, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', x: 7, z: 7 },
      { type: 'trashCan', x: 7, z: 8 },

      // === Misc server room equipment ===
      { type: 'serverRack', x: 5, z: 5, rotation: 0 },

      // === Cable management / fire extinguisher feel ===
      { type: 'fileCabinet', x: 7, z: 1 },  // equipment shelf
      { type: 'fileCabinet', x: 7, z: 2 },
    ],
    npcs: [
      { id: 'dave', x: 6, z: 8, facing: 0 },
    ],
    exits: [
      // WEST exit -> Cubicle Farm
      { x: 0, z: 4, targetRoom: 'cubicle_farm', spawnX: 17, spawnZ: 10 },
      { x: 0, z: 5, targetRoom: 'cubicle_farm', spawnX: 17, spawnZ: 10 },
    ],
    interactables: [
      { x: 1, z: 3, type: 'server_rack', dialogId: 'server_rack_inspect' },
      { x: 6, z: 7, type: 'daves_desk', dialogId: 'daves_desk' },
    ],
    playerSpawn: { x: 2, z: 7 },
  },

  // ----------------------------------------------------------
  // 6. RECEPTION — 14x8
  // ----------------------------------------------------------
  reception: {
    id: 'reception',
    name: 'Reception',
    width: 14,
    height: 8,
    floorColor: 0xd8d0c0,
    walls: true,
    furniture: [
      // === Reception desk (center, facing south toward entrance) ===
      { type: 'receptionDesk', x: 7, z: 3, rotation: 0 },
      { type: 'monitor', x: 6.5, z: 3 },
      { type: 'monitor', x: 7.5, z: 3 },
      { type: 'keyboard', x: 7, z: 3.3 },
      { type: 'chair', x: 7, z: 4, rotation: Math.PI },

      // === Waiting area (southwest) ===
      { type: 'chair', x: 2, z: 5, rotation: Math.PI / 2 },
      { type: 'chair', x: 2, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 4, z: 5, rotation: -Math.PI / 2 },
      { type: 'chair', x: 4, z: 6, rotation: -Math.PI / 2 },
      { type: 'desk', x: 3, z: 5.5, rotation: 0 },  // side table

      // === Waiting area (southeast) ===
      { type: 'chair', x: 10, z: 5, rotation: Math.PI / 2 },
      { type: 'chair', x: 10, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 12, z: 5, rotation: -Math.PI / 2 },
      { type: 'chair', x: 12, z: 6, rotation: -Math.PI / 2 },
      { type: 'desk', x: 11, z: 5.5, rotation: 0 },  // side table

      // === Decorative plants ===
      { type: 'plant', x: 1, z: 1 },
      { type: 'plant', x: 13, z: 1 },
      { type: 'plant', x: 1, z: 6 },
      { type: 'plant', x: 13, z: 6 },
      { type: 'plant', x: 5, z: 1 },
      { type: 'plant', x: 9, z: 1 },

      // === Company sign area (north wall, above reception desk) ===
      { type: 'motivationalPoster', x: 7, z: 0.1, rotation: 0 },

      // === Elevator on east wall ===
      { type: 'elevatorDoors', x: 13, z: 3, rotation: -Math.PI / 2 },

      // === Trash cans ===
      { type: 'trashCan', x: 5, z: 7 },
      { type: 'trashCan', x: 9, z: 7 },

      // === Magazine rack / file cabinet near entrance ===
      { type: 'fileCabinet', x: 1, z: 3 },
    ],
    npcs: [
      { id: 'grandma', x: 2, z: 5, facing: Math.PI / 2 },
    ],
    exits: [
      // NORTH exits -> Cubicle Farm
      { x: 6, z: 0, targetRoom: 'cubicle_farm', spawnX: 9, spawnZ: 14 },
      { x: 7, z: 0, targetRoom: 'cubicle_farm', spawnX: 10, spawnZ: 14 },
      // SOUTH exits -> Parking Garage (front entrance)
      { x: 6, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      { x: 7, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      // EAST elevator -> Executive Floor (Act 3 only, gated by game logic)
      { x: 13, z: 3, targetRoom: 'executive_floor', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 13, z: 3, type: 'elevator', dialogId: 'elevator' },
      { x: 7, z: 3, type: 'reception_desk', dialogId: 'reception_desk' },
    ],
    playerSpawn: { x: 7, z: 1 },
  },

  // ----------------------------------------------------------
  // 7. PARKING GARAGE — 14x10, sparse concrete
  // ----------------------------------------------------------
  parking_garage: {
    id: 'parking_garage',
    name: 'Parking Garage',
    width: 14,
    height: 10,
    floorColor: 0x888888,  // concrete gray
    walls: true,
    furniture: [
      // === Parked cars (represented as large desk-sized boxes) ===
      // Row 1 (west side)
      { type: 'desk', x: 1, z: 2, rotation: Math.PI / 2 },  // car 1
      { type: 'desk', x: 1, z: 4, rotation: Math.PI / 2 },  // car 2
      { type: 'desk', x: 1, z: 6, rotation: Math.PI / 2 },  // car 3

      // Row 2 (center-west)
      { type: 'desk', x: 4, z: 2, rotation: Math.PI / 2 },  // car 4
      { type: 'desk', x: 4, z: 4, rotation: Math.PI / 2 },  // car 5
      // empty spot at 4,6 - Andrew's parking space

      // Row 3 (center-east)
      { type: 'desk', x: 9, z: 2, rotation: Math.PI / 2 },  // car 6
      { type: 'desk', x: 9, z: 4, rotation: Math.PI / 2 },  // car 7
      { type: 'desk', x: 9, z: 6, rotation: Math.PI / 2 },  // car 8

      // Row 4 (east side)
      { type: 'desk', x: 12, z: 2, rotation: Math.PI / 2 }, // car 9
      { type: 'desk', x: 12, z: 4, rotation: Math.PI / 2 }, // car 10
      { type: 'desk', x: 12, z: 6, rotation: Math.PI / 2 }, // car 11

      // === Janitor's corner (southeast) ===
      { type: 'fileCabinet', x: 12, z: 8, rotation: 0 },  // janitor's supply shelf
      { type: 'trashCan', x: 13, z: 8 },
      { type: 'trashCan', x: 11, z: 8 },

      // === Structural pillars (plants as placeholders) ===
      { type: 'plant', x: 3, z: 1 },   // pillar
      { type: 'plant', x: 7, z: 1 },   // pillar
      { type: 'plant', x: 10, z: 1 },  // pillar
      { type: 'plant', x: 3, z: 8 },   // pillar
      { type: 'plant', x: 7, z: 8 },   // pillar
      { type: 'plant', x: 10, z: 8 },  // pillar
    ],
    npcs: [
      { id: 'janitor', x: 12, z: 9, facing: Math.PI },
    ],
    exits: [
      // NORTH exits -> Reception
      { x: 6, z: 0, targetRoom: 'reception', spawnX: 6, spawnZ: 6 },
      { x: 7, z: 0, targetRoom: 'reception', spawnX: 7, spawnZ: 6 },
    ],
    interactables: [
      { x: 4, z: 6, type: 'andrews_car', dialogId: 'andrews_car' },
      { x: 12, z: 8, type: 'janitor_closet', dialogId: 'janitor_closet' },
    ],
    playerSpawn: { x: 7, z: 1 },
  },

  // ----------------------------------------------------------
  // 8. EXECUTIVE FLOOR — 16x12, lavish (Act 3 only)
  // ----------------------------------------------------------
  executive_floor: {
    id: 'executive_floor',
    name: 'Executive Floor',
    width: 16,
    height: 12,
    floorColor: 0x6b5335,  // dark hardwood
    walls: true,
    furniture: [
      // === Grand executive desk (north-center, imposing) ===
      { type: 'desk', x: 8, z: 2, rotation: Math.PI },
      { type: 'desk', x: 9, z: 2, rotation: Math.PI },  // L-shaped extension
      { type: 'monitor', x: 8, z: 2.3 },
      { type: 'monitor', x: 7.3, z: 2.3 },
      { type: 'monitor', x: 8.7, z: 2.3 },  // triple monitors
      { type: 'keyboard', x: 8, z: 1.8 },
      { type: 'chair', x: 8, z: 1, rotation: 0 },  // big boss chair

      // === Power seating area (visitor chairs) ===
      { type: 'chair', x: 6, z: 4, rotation: 0 },
      { type: 'chair', x: 7, z: 4, rotation: 0 },
      { type: 'chair', x: 9, z: 4, rotation: 0 },
      { type: 'chair', x: 10, z: 4, rotation: 0 },

      // === Secondary executive desk (west side) ===
      { type: 'desk', x: 3, z: 3, rotation: Math.PI / 2 },
      { type: 'monitor', x: 2.7, z: 3 },
      { type: 'keyboard', x: 3.2, z: 3 },
      { type: 'chair', x: 3, z: 4, rotation: Math.PI },

      // === Secondary executive desk (east side) ===
      { type: 'desk', x: 13, z: 3, rotation: -Math.PI / 2 },
      { type: 'monitor', x: 13.3, z: 3 },
      { type: 'keyboard', x: 12.8, z: 3 },
      { type: 'chair', x: 13, z: 4, rotation: Math.PI },

      // === Credenza / power decor along north wall ===
      { type: 'fileCabinet', x: 1, z: 1 },
      { type: 'fileCabinet', x: 2, z: 1 },
      { type: 'fileCabinet', x: 14, z: 1 },
      { type: 'fileCabinet', x: 15, z: 1 },

      // === Conference area (south half) ===
      { type: 'conferenceTable', x: 8, z: 8, rotation: 0 },
      { type: 'chair', x: 6, z: 7, rotation: Math.PI / 2 },
      { type: 'chair', x: 6, z: 9, rotation: Math.PI / 2 },
      { type: 'chair', x: 7, z: 7, rotation: Math.PI / 2 },
      { type: 'chair', x: 10, z: 7, rotation: -Math.PI / 2 },
      { type: 'chair', x: 10, z: 9, rotation: -Math.PI / 2 },
      { type: 'chair', x: 9, z: 7, rotation: -Math.PI / 2 },
      { type: 'chair', x: 8, z: 6, rotation: 0 },
      { type: 'chair', x: 8, z: 10, rotation: Math.PI },

      // === Whiteboard ===
      { type: 'whiteboard', x: 15, z: 6, rotation: -Math.PI / 2 },

      // === Power decor: motivational posters (ironic executive versions) ===
      { type: 'motivationalPoster', x: 4, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 6, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 10, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 12, z: 0.1, rotation: 0 },

      // === Lavish plants ===
      { type: 'plant', x: 1, z: 1 },
      { type: 'plant', x: 15, z: 1 },
      { type: 'plant', x: 1, z: 10 },
      { type: 'plant', x: 15, z: 10 },
      { type: 'plant', x: 5, z: 6 },
      { type: 'plant', x: 11, z: 6 },

      // === Printer / fax near east wall ===
      { type: 'printer', x: 15, z: 4 },

      // === Trash cans ===
      { type: 'trashCan', x: 1, z: 5 },
      { type: 'trashCan', x: 15, z: 8 },

      // === Elevator doors (south wall) ===
      { type: 'elevatorDoors', x: 8, z: 11, rotation: Math.PI },

      // === Water cooler (executive-grade sparkling, obviously) ===
      { type: 'waterCooler', x: 1, z: 8 },
    ],
    npcs: [
      { id: 'regional', x: 8, z: 1.5, facing: Math.PI },
      { id: 'compliance', x: 13, z: 4, facing: Math.PI / 2 },
    ],
    exits: [
      // SOUTH elevator -> Reception
      { x: 7, z: 11, targetRoom: 'reception', spawnX: 12, spawnZ: 4 },
      { x: 8, z: 11, targetRoom: 'reception', spawnX: 12, spawnZ: 4 },
    ],
    interactables: [
      { x: 8, z: 2, type: 'executive_desk', dialogId: 'executive_desk' },
      { x: 1, z: 8, type: 'water_cooler', dialogId: 'executive_water_cooler' },
      { x: 8, z: 11, type: 'elevator', dialogId: 'elevator_executive' },
    ],
    playerSpawn: { x: 8, z: 10 },
  },
};

// Quick-access helpers
export const ROOM_IDS = Object.keys(ROOMS);
export const getRoomData = (id) => ROOMS[id] || null;
