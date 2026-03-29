// ============================================================
// Room Definitions — all 14 rooms for the DiL Simulator
// ============================================================
// Each room is pure data consumed by Room.js builder.
// Furniture types must match Furniture factory methods.
// Connection map:
//   cubicle_farm (hub)
//     NORTH  -> ross_office
//     WEST   -> break_room / stairwell
//     EAST   -> server_room
//     SOUTH  -> reception
//     NE     -> hr_department (Act 4+)
//   ross_office EAST -> conference_room
//   reception SOUTH  -> parking_garage
//   reception ELEVATOR -> executive_floor (Act 3)
//   stairwell SOUTH -> cubicle_farm, NORTH -> archive (Act 3+)
//   archive SOUTH -> stairwell, EAST -> vault (Act 4+)
//   hr_department SOUTH -> cubicle_farm
//   vault WEST -> archive
//   executive_floor NORTH -> board_room (Act 5+)
//   board_room SOUTH -> executive_floor, NORTH -> penthouse (Act 7)
//   penthouse SOUTH -> board_room
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
    floorPattern: 'carpet',
    walls: true,
    furniture: [
      // ============================================================
      // NORTH CUBICLE ROW  (back walls at z=2, desks at z=3)
      // Two pods: NW (x=1-7) and NE (x=14-18), open aisle between
      // ============================================================

      // --- NW pod — 3 cubicles (x=2, 4, 6) ---
      // Continuous back wall across all three
      { type: 'cubicleWall', x: 1, z: 2, rotation: 0 },
      { type: 'cubicleWall', x: 3, z: 2, rotation: 0 },
      { type: 'cubicleWall', x: 5, z: 2, rotation: 0 },
      // Side dividers (outer walls + shared dividers between bays)
      { type: 'cubicleWall', x: 1, z: 2.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 3, z: 2.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 5, z: 2.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 7, z: 2.5, rotation: Math.PI / 2 },
      // Cubicle desks
      { type: 'desk', x: 2, z: 3, rotation: 0 },
      { type: 'monitor', x: 2, z: 2.7 },
      { type: 'deskPlantSucculent', x: 1.6, z: 2.9 },
      { type: 'keyboard', x: 2, z: 3.2 },
      { type: 'chair', x: 2, z: 3.8, rotation: Math.PI },
      { type: 'trashCan', x: 2.5, z: 4 },

      { type: 'desk', x: 4, z: 3, rotation: 0 },
      { type: 'monitor', x: 4, z: 2.7 },
      { type: 'deskPlant', x: 4.4, z: 2.9 },
      { type: 'keyboard', x: 4, z: 3.2 },
      { type: 'chair', x: 4, z: 3.8, rotation: Math.PI },
      { type: 'trashCan', x: 4.5, z: 4 },

      { type: 'desk', x: 6, z: 3, rotation: 0 },
      { type: 'monitor', x: 6, z: 2.7 },
      { type: 'deskPlantSucculent', x: 5.6, z: 2.9 },
      { type: 'keyboard', x: 6, z: 3.2 },
      { type: 'chair', x: 6, z: 3.8, rotation: Math.PI },
      { type: 'trashCan', x: 6.5, z: 4 },

      // --- NE pod — 2 cubicles (x=13, 15) --- shifted west to clear HR door at (19,2-3)
      // Back walls
      { type: 'cubicleWall', x: 12, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 14, z: 4, rotation: 0 },
      // Side dividers
      { type: 'cubicleWall', x: 12, z: 4.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 14, z: 4.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 16, z: 4.5, rotation: Math.PI / 2 },
      // Cubicle desks
      { type: 'desk', x: 13, z: 5, rotation: 0 },
      { type: 'monitor', x: 13, z: 4.7 },
      { type: 'deskPlant', x: 13.4, z: 4.9 },
      { type: 'keyboard', x: 13, z: 5.2 },
      { type: 'chair', x: 13, z: 5.8, rotation: Math.PI },
      { type: 'trashCan', x: 13.5, z: 6 },

      { type: 'desk', x: 15, z: 5, rotation: 0 },
      { type: 'monitor', x: 15, z: 4.7 },
      { type: 'deskPlantSucculent', x: 14.6, z: 4.9 },
      { type: 'keyboard', x: 15, z: 5.2 },
      { type: 'chair', x: 15, z: 5.8, rotation: Math.PI },
      { type: 'trashCan', x: 15.5, z: 6 },

      // ============================================================
      // SOUTH CUBICLE ROW  (back walls at z=9, desks at z=10)
      // Two pods: SW (Andrew's area, x=1-7) and SE (x=12-16)
      // ============================================================

      // --- SW pod — Andrew (x=3) + 1 neighbor (x=6) ---
      // Back walls
      { type: 'cubicleWall', x: 2, z: 9, rotation: 0 },
      { type: 'cubicleWall', x: 5, z: 9, rotation: 0 },
      // Side dividers
      { type: 'cubicleWall', x: 2, z: 9.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 4, z: 9.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 5, z: 9.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 7, z: 9.5, rotation: Math.PI / 2 },
      // Andrew's desk — keep at (3,10) for the interactable
      { type: 'desk', x: 3, z: 10, rotation: 0 },
      { type: 'monitor', x: 3, z: 9.7 },
      { type: 'deskPlantSucculent', x: 2.6, z: 9.9 },
      { type: 'keyboard', x: 3, z: 10.2 },
      { type: 'chair', x: 3, z: 10.8, rotation: Math.PI },
      { type: 'trashCan', x: 3.5, z: 11 },
      // Neighbor cubicle
      { type: 'desk', x: 6, z: 10, rotation: 0 },
      { type: 'monitor', x: 6, z: 9.7 },
      { type: 'deskPlant', x: 6.4, z: 9.9 },
      { type: 'keyboard', x: 6, z: 10.2 },
      { type: 'chair', x: 6, z: 10.8, rotation: Math.PI },
      { type: 'trashCan', x: 6.5, z: 11 },

      // --- SE pod — 1 cubicle (x=13) + open water-cooler alcove ---
      // Back wall
      { type: 'cubicleWall', x: 12, z: 9, rotation: 0 },
      // Side dividers
      { type: 'cubicleWall', x: 12, z: 9.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 14, z: 9.5, rotation: Math.PI / 2 },
      // Cubicle desk
      { type: 'desk', x: 13, z: 10, rotation: 0 },
      { type: 'monitor', x: 13, z: 9.7 },
      { type: 'deskPlantSucculent', x: 12.6, z: 9.9 },
      { type: 'keyboard', x: 13, z: 10.2 },
      { type: 'chair', x: 13, z: 10.8, rotation: Math.PI },
      { type: 'trashCan', x: 13.5, z: 11 },

      // ============================================================
      // WATER COOLER ALCOVE  (open area, x=14-17, z=11-13)
      // ============================================================
      { type: 'waterCooler', x: 15, z: 12 },

      // ============================================================
      // SHARED RESOURCE STATION — north-center (x=11-13, z=2)
      // Printer flanked symmetrically by file cabinets
      // ============================================================
      { type: 'fileCabinet', x: 11, z: 2 },
      { type: 'printer', x: 12, z: 2 },
      { type: 'fileCabinet', x: 13, z: 2 },

      // ============================================================
      // STORAGE — file cabinet rows along north wall (handles face south/center)
      // Left bank (behind NW pod) and right bank (behind NE pod)
      // ============================================================
      { type: 'fileCabinet',        x: 2,  z: 0.5 },
      { type: 'fileCabinetLateral', x: 3,  z: 0.5 },
      { type: 'fileCabinetLow',     x: 4,  z: 0.5 },
      { type: 'fileCabinetLow',     x: 14, z: 0.5 },
      { type: 'fileCabinetLateral', x: 15, z: 0.5 },
      { type: 'fileCabinet',        x: 16, z: 0.5 },

      // ============================================================
      // STORAGE — file cabinet rows along south wall (handles face north/center)
      // Left bank (SW) and right bank (SE), flanking the south exit
      // ============================================================
      { type: 'fileCabinet',        x: 2,  z: 14.5, rotation: Math.PI },
      { type: 'fileCabinetLow',     x: 3,  z: 14.5, rotation: Math.PI },
      { type: 'fileCabinetLateral', x: 4,  z: 14.5, rotation: Math.PI },
      { type: 'fileCabinetLateral', x: 15, z: 14.5, rotation: Math.PI },
      { type: 'fileCabinetLow',     x: 16, z: 14.5, rotation: Math.PI },
      { type: 'fileCabinet',        x: 17, z: 14.5, rotation: Math.PI },

      // ============================================================
      // MOTIVATIONAL POSTERS — scattered around all four walls
      // ============================================================
      // North wall
      { type: 'motivationalPoster', x: 7,  z: 0.1, rotation: 0 },
      // South wall (face inward)
      { type: 'motivationalPoster', x: 6,  z: 14.9, rotation: Math.PI },
      { type: 'motivationalPoster', x: 11, z: 14.9, rotation: Math.PI },
      // West wall (face inward)
      { type: 'motivationalPoster', x: 0.1, z: 5,  rotation: Math.PI / 2 },
      { type: 'motivationalPoster', x: 0.1, z: 10, rotation: Math.PI / 2 },
      // East wall (face inward)
      { type: 'motivationalPoster', x: 18.9, z: 5,  rotation: -Math.PI / 2 },
      { type: 'motivationalPoster', x: 18.9, z: 10, rotation: -Math.PI / 2 },
      // Side quest posters
      { type: 'motivationalPoster', x: 18.9, z: 12, rotation: -Math.PI / 2 },
      { type: 'motivationalPoster', x: 0.1,  z: 3,  rotation: Math.PI / 2 },


    ],
    npcs: [
      // Janet — conditional entries covering lunch thief quest states
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { notFlag: 'lunch_thief_culprit_revealed' } },
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'lunch_thief_culprit_revealed', notFlag: 'lunch_thief_complete' }, dialogId: 'janet_lunch_thief_investigate' },
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'lunch_thief_complete' }, dialogId: 'janet_lunch_thief_resolved' },
      // Intern — conditional entries covering lunch thief confrontation
      { id: 'intern', x: 13, z: 7, facing: Math.PI, movement: { type: 'wander', radius: 3 }, condition: { notFlag: 'lunch_thief_culprit_revealed' } },
      { id: 'intern', x: 13, z: 7, facing: Math.PI, movement: { type: 'wander', radius: 3 }, condition: { flag: 'lunch_thief_culprit_revealed' }, dialogId: 'intern_lunch_thief_confrontation' },
      { id: 'karen', x: 15, z: 12, facing: -Math.PI / 2, movement: { type: 'pace', distance: 1, axis: 'z' }, condition: { notFlag: 'karen_defeated' } }, // water cooler, paces
      { id: 'isaiah', x: 16, z: 12, facing: Math.PI, movement: { type: 'wander', radius: 2 } }, // near water cooler, wanders
    ],
    exits: [
      // NORTH exits -> Alex's Office
      { x: 9, z: 0, targetRoom: 'ross_office', spawnX: 4, spawnZ: 6 },
      { x: 10, z: 0, targetRoom: 'ross_office', spawnX: 4, spawnZ: 6 },
      // WEST exit -> Break Room
      { x: 0, z: 7, targetRoom: 'break_room', spawnX: 7, spawnZ: 3 },
      { x: 0, z: 8, targetRoom: 'break_room', spawnX: 7, spawnZ: 3 },
      // EAST exit -> Server Room
      { x: 19, z: 7, targetRoom: 'server_room', spawnX: 2, spawnZ: 7 },
      { x: 19, z: 8, targetRoom: 'server_room', spawnX: 2, spawnZ: 7 },
      // SOUTH exits -> Reception
      { x: 9, z: 15, targetRoom: 'reception', spawnX: 7, spawnZ: 2 },
      { x: 10, z: 15, targetRoom: 'reception', spawnX: 7, spawnZ: 2 },
      // WEST stairwell exit (west wall, z=12-13)
      { x: 0, z: 12, targetRoom: 'stairwell', spawnX: 2, spawnZ: 18 },
      { x: 0, z: 13, targetRoom: 'stairwell', spawnX: 2, spawnZ: 18 },
      // NE exit -> HR Department (x=19, z=2-3)
      { x: 19, z: 2, targetRoom: 'hr_department', spawnX: 2, spawnZ: 4 },
      { x: 19, z: 3, targetRoom: 'hr_department', spawnX: 2, spawnZ: 4 },
    ],
    interactables: [
      { x: 15, z: 12, type: 'water_cooler', dialogId: 'water_cooler' },
      { x: 12, z: 2, type: 'printer', dialogId: 'printer_interact' },
      { x: 3, z: 10, type: 'andrews_desk', dialogId: 'andrews_desk' },
      // Motivational posters
      { x: 7,  z: 0,  type: 'poster', dialogId: 'poster_cf_1' },
      { x: 6,  z: 15, type: 'poster', dialogId: 'poster_cf_2' },
      { x: 11, z: 15, type: 'poster', dialogId: 'poster_cf_3' },
      { x: 0,  z: 5,  type: 'poster', dialogId: 'poster_cf_4' },
      { x: 0,  z: 10, type: 'poster', dialogId: 'poster_cf_5' },
      { x: 19, z: 5,  type: 'poster', dialogId: 'poster_cf_6' },
      { x: 19, z: 10, type: 'poster', dialogId: 'poster_cf_7' },
      // Side quest interactables
      { x: 19, z: 12, type: 'poster', dialogId: 'quest_atk_1' },
      { x: 0,  z: 3,  type: 'poster', dialogId: 'quest_def_1' },
    ],
    playerSpawn: { x: 5, z: 12 },
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
      { type: 'desk', x: 3, z: 1, rotation: 0 },   // counter surface
      { type: 'coffeeMachine', x: 2, z: 1 },
      { type: 'microwave', x: 4, z: 1 },

      // === Fridge in NW corner ===
      { type: 'fridge', x: 1, z: 0.5, rotation: 0 },

      // === Vending machine along east wall ===
      { type: 'vendingMachine', x: 6, z: 0.5, rotation: 0 },

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
      { type: 'trashCan', x: 4.5, z: 1 },

      // === Motivational poster ===
      { type: 'motivationalPoster', x: 5, z: 0.1, rotation: 0 },

      // === Water cooler ===
      { type: 'waterCooler', x: 0.5, z: 1.5 },

      // === Arcade cabinet ===
      { type: 'arcadeCabinet', x: 8, z: 6, rotation: Math.PI },
      // Side quest posters
      { type: 'motivationalPoster', x: 0.1, z: 5, rotation: Math.PI / 2 },
      { type: 'motivationalPoster', x: 3, z: 6.9, rotation: Math.PI },
    ],
    npcs: [
      { id: 'chad', x: 4, z: 4, facing: -Math.PI / 2, movement: { type: 'wander', radius: 2 }, condition: { notFlag: 'karen_defeated' } },
      { id: 'grandma', x: 6, z: 5, facing: Math.PI, condition: { flag: 'act5_complete' } },
    ],
    exits: [
      // EAST exit -> Cubicle Farm
      { x: 9, z: 3, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
      { x: 9, z: 4, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
    ],
    interactables: [
      { x: 2, z: 1, type: 'coffee_machine', dialogId: 'coffee_machine' },
      { x: 1, z: 0, type: 'fridge', dialogId: 'fridge_notes' },
      { x: 6, z: 1, type: 'vending_machine', dialogId: 'vending_machine' },
      { x: 7, z: 1, type: 'supply_shop' },
      { x: 4, z: 1, type: 'microwave', dialogId: 'microwave' },
      { x: 5, z: 0, type: 'poster', dialogId: 'poster_br_1' },
      { x: 8, z: 6, type: 'arcade_cabinet', dialogId: 'arcade_intro' },
      // Side quest interactables
      { x: 0, z: 5, type: 'poster', dialogId: 'quest_atk_3' },
      { x: 3, z: 7, type: 'poster', dialogId: 'quest_def_3' },
    ],
    playerSpawn: { x: 7, z: 2 },
  },

  // ----------------------------------------------------------
  // 3. ROSS'S OFFICE — 8x8, boss room
  // ----------------------------------------------------------
  ross_office: {
    id: 'ross_office',
    name: "Ross's Office",
    width: 8,
    height: 8,
    floorColor: 0x4a6741,  // nicer carpet for the boss
    walls: true,
    furniture: [
      // === Boss desk (commanding position, north-center) ===
      { type: 'desk', x: 4, z: 2, rotation: Math.PI },
      { type: 'monitor', x: 4, z: 2.0, rotation: Math.PI },
      { type: 'monitor', x: 3.5, z: 2.0, rotation: Math.PI },  // dual monitors, of course
      { type: 'deskPlantSucculent', x: 4.5, z: 2.0 },
      { type: 'keyboard', x: 4, z: 1.8 },
      { type: 'chair', x: 4, z: 1, rotation: 0 },  // behind desk facing south

      // === Visitor chairs ===
      { type: 'chair', x: 3, z: 4, rotation: Math.PI },
      { type: 'chair', x: 5, z: 4, rotation: Math.PI },

      // === Motivational posters along walls ===
      { type: 'motivationalPoster', x: 1, z: 0.1, rotation: 0 },   // "SYNERGY"
      { type: 'motivationalPoster', x: 3, z: 0.1, rotation: 0 },   // "HUSTLE"
      { type: 'motivationalPoster', x: 6, z: 0.1, rotation: 0 },   // "TEAMWORK"

      // === File cabinet behind desk ===
      { type: 'fileCabinet', x: 1, z: 1 },
      { type: 'fileCabinet', x: 2, z: 1 },

      // === Golf putter leaning against wall ===

      // === Bookshelf / credenza area (west wall) ===
      { type: 'fileCabinet', x: 0.5, z: 3 },
      { type: 'fileCabinet', x: 0.5, z: 4 },
      { type: 'fileCabinet', x: 0.5, z: 5 },

    ],
    npcs: [
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, dialogId: 'ross_not_ready', condition: { notFlag: 'ready_for_ross' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ready_for_ross', notFlag: 'branch_chosen' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, dialogId: 'ross_returned', condition: { flag: 'defeated_regional', notFlag: 'act5_complete' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act5_complete' } },
    ],
    exits: [
      // SOUTH exits -> Cubicle Farm
      { x: 3, z: 7, targetRoom: 'cubicle_farm', spawnX: 9, spawnZ: 4 },
      { x: 4, z: 7, targetRoom: 'cubicle_farm', spawnX: 10, spawnZ: 4 },
      // EAST exit -> Conference Room
      { x: 7, z: 3, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
      { x: 7, z: 4, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
    ],
    interactables: [
      { x: 4, z: 2, type: 'ross_desk', dialogId: 'ross_desk' },
      // Motivational posters
      { x: 1, z: 0, type: 'poster', dialogId: 'poster_rec_1' },
      { x: 3, z: 0, type: 'poster', dialogId: 'poster_rec_2' },
      { x: 6, z: 0, type: 'poster', dialogId: 'poster_rec_3' },
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
      // North side — face south (toward table)
      { type: 'chair', x: 5, z: 3.0, rotation: 0 },
      { type: 'chair', x: 6, z: 3.0, rotation: 0 },
      { type: 'chair', x: 7, z: 3.0, rotation: 0 },
      // South side — face north (toward table)
      { type: 'chair', x: 5, z: 5.0, rotation: Math.PI },
      { type: 'chair', x: 6, z: 5.0, rotation: Math.PI },
      { type: 'chair', x: 7, z: 5.0, rotation: Math.PI },
      // West end — face east
      { type: 'chair', x: 4.0, z: 4, rotation: Math.PI / 2 },
      // East end — face west
      { type: 'chair', x: 8.0, z: 4, rotation: -Math.PI / 2 },

      // === Teleconference equipment ===
      { type: 'speakerphone', x: 6, z: 4 },

      // === Whiteboard on north wall ===
      { type: 'whiteboard', x: 6, z: 0.2, rotation: 0 },

      // === Second whiteboard on east wall ===
      { type: 'whiteboard', x: 11, z: 4, rotation: -Math.PI / 2 },

      // === Projector screen area — just a motivational poster placeholder ===
      { type: 'motivationalPoster', x: 3, z: 0.1, rotation: 0 },
      // Side quest posters
      { type: 'motivationalPoster', x: 10.9, z: 6, rotation: -Math.PI / 2 },
      { type: 'motivationalPoster', x: 5,    z: 6.9, rotation: Math.PI },


    ],
    npcs: [
      // Henderson beneficiaries appear based on quest progress
      { id: 'karen', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'karen_meeting', condition: { flag: 'briefing_complete', notFlag: 'karen_defeated' } },
      { id: 'chad', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'chad_meeting', condition: { flag: 'karen_defeated', notFlag: 'chad_defeated' } },
      { id: 'grandma', x: 6, z: 5.0, facing: Math.PI, dialogId: 'grandma_meeting', condition: { flag: 'chad_defeated', notFlag: 'grandma_defeated' } },
    ],
    exits: [
      // WEST exit -> Alex's Office
      { x: 0, z: 3, targetRoom: 'ross_office', spawnX: 6, spawnZ: 3 },
      { x: 0, z: 4, targetRoom: 'ross_office', spawnX: 6, spawnZ: 4 },
    ],
    interactables: [
      { x: 6, z: 0, type: 'whiteboard', dialogId: 'conference_whiteboard' },
      { x: 3, z: 0, type: 'poster', dialogId: 'poster_conf_1' },
      // Side quest interactables
      { x: 11, z: 6, type: 'poster', dialogId: 'quest_atk_2' },
      { x: 5,  z: 7, type: 'poster', dialogId: 'quest_def_2' },
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

      // === Alex IT's corner (southeast) — his desk among the racks ===
      { type: 'desk', x: 6, z: 7, rotation: 0 },
      { type: 'monitor', x: 6, z: 6.7 },
      { type: 'monitor', x: 6.5, z: 6.7 },
      { type: 'monitor', x: 5.5, z: 6.7 },  // triple-monitor setup
      { type: 'deskPlantSucculent', x: 7.0, z: 6.9 },
      { type: 'keyboard', x: 6, z: 7.2 },
      { type: 'chair', x: 6, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', x: 7, z: 7 },
      { type: 'trashCan', x: 7, z: 8 },

      // === Misc server room equipment ===
      { type: 'serverRack', x: 5, z: 5, rotation: 0 },

      // === Cable management / fire extinguisher feel ===
      { type: 'fileCabinet', x: 7, z: 1 },  // equipment shelf
      { type: 'fileCabinet', x: 7, z: 2 },
      // Side quest posters
      { type: 'motivationalPoster', x: 3,   z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 0.1, z: 7,   rotation: Math.PI / 2 },
    ],
    npcs: [
      // Default Alex (no server secret quest)
      { id: 'alex_it', x: 6, z: 8, facing: 0, movement: { type: 'wander', radius: 3 }, condition: { notFlag: 'server_secret_started' } },
      // Server Room Secrets: Alex has info about admin_legacy
      { id: 'alex_it', x: 6, z: 8, facing: 0, movement: { type: 'wander', radius: 3 }, condition: { flag: 'server_secret_started', notFlag: 'server_secret_done' }, dialogId: 'alex_server_secret' },
      // Server Room Secrets: done
      { id: 'alex_it', x: 6, z: 8, facing: 0, movement: { type: 'wander', radius: 3 }, condition: { flag: 'server_secret_done' } },
    ],
    exits: [
      // WEST exit -> Cubicle Farm
      { x: 0, z: 4, targetRoom: 'cubicle_farm', spawnX: 17, spawnZ: 10 },
      { x: 0, z: 5, targetRoom: 'cubicle_farm', spawnX: 17, spawnZ: 10 },
    ],
    interactables: [
      { x: 1, z: 3, type: 'server_rack', dialogId: 'server_rack_inspect' },
      { x: 5, z: 3, type: 'server_rack', dialogId: 'server_vault_code' },
      { x: 6, z: 7, type: 'alex_it_desk', dialogId: 'alex_it_desk' },
      // Side quest interactables
      { x: 3, z: 0, type: 'poster', dialogId: 'quest_atk_4' },
      { x: 0, z: 7, type: 'poster', dialogId: 'quest_def_4' },
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
      { type: 'monitor', x: 6.5, z: 2.8, rotation: Math.PI },
      { type: 'monitor', x: 7.5, z: 2.8, rotation: Math.PI },
      { type: 'deskPlant', x: 8.0, z: 2.9 },
      { type: 'keyboard', x: 7, z: 3.3 },
      { type: 'chair', x: 7, z: 2, rotation: Math.PI },  // behind desk, facing south

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


      // === Company sign area (north wall, above reception desk) ===
      // === Elevator on east wall ===
      { type: 'elevatorDoors', x: 13, z: 3, rotation: -Math.PI / 2 },

      // === File cabinet next to reception desk (east side) ===
      { type: 'fileCabinet', x: 9, z: 3, rotation: Math.PI },
      // Side quest posters
      { type: 'motivationalPoster', x: 11,  z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 0.1, z: 5,   rotation: Math.PI / 2 },
    ],
    npcs: [
      { id: 'diane', x: 7, z: 1.5, facing: Math.PI, sitting: true, interactRange: 1.2 },  // behind desk, facing south
      { id: 'grandma', x: 2, z: 5, facing: Math.PI / 2, condition: { notFlag: 'grandma_defeated' } },
      { id: 'reception_client', x: 10, z: 5, facing: -Math.PI / 2, interactable: true, sitting: true },
    ],
    exits: [
      // NORTH exits -> Cubicle Farm
      { x: 6, z: 0, targetRoom: 'cubicle_farm', spawnX: 9, spawnZ: 13 },
      { x: 7, z: 0, targetRoom: 'cubicle_farm', spawnX: 10, spawnZ: 13 },
      // SOUTH exits -> Parking Garage (front entrance)
      { x: 6, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      { x: 7, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      // EAST elevator -> Executive Floor (Act 3 only, gated by game logic)
      { x: 13, z: 3, targetRoom: 'executive_floor', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 13, z: 3, type: 'elevator', dialogId: 'elevator' },
      { x: 7, z: 2, type: 'reception_desk', dialogId: 'reception_desk' },
      // Side quest interactables
      { x: 11, z: 0, type: 'poster', dialogId: 'quest_atk_5' },
      { x: 0,  z: 5, type: 'poster', dialogId: 'quest_def_5' },
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
      // === Parking spots (floor markings) ===
      { type: 'parkingSpot', x: 1,  z: 2, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 1,  z: 4, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 1,  z: 6, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 4,  z: 2, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 4,  z: 4, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 4,  z: 6, rotation: Math.PI / 2 }, // Andrew's empty spot
      { type: 'parkingSpot', x: 9,  z: 2, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 9,  z: 4, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 9,  z: 6, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 12, z: 2, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 12, z: 4, rotation: Math.PI / 2 },
      { type: 'parkingSpot', x: 12, z: 6, rotation: Math.PI / 2 },

      // === Parked cars ===
      { type: 'carSUV',    x: 1,  z: 2, rotation: Math.PI / 2 },
      { type: 'car',       x: 1,  z: 4, rotation: Math.PI / 2 },
      { type: 'carSports', x: 1,  z: 6, rotation: Math.PI / 2 },
      { type: 'carSUV',    x: 4,  z: 2, rotation: Math.PI / 2 },
      { type: 'car',       x: 4,  z: 4, rotation: Math.PI / 2 },
      { type: 'andrewsCar',x: 4,  z: 6, rotation: Math.PI / 2 }, // Andrew's beat-up hatchback
      { type: 'car',       x: 9,  z: 2, rotation: Math.PI / 2 },
      { type: 'carSports', x: 9,  z: 4, rotation: Math.PI / 2 },
      { type: 'carSUV',    x: 9,  z: 6, rotation: Math.PI / 2 },
      { type: 'car',       x: 12, z: 2, rotation: Math.PI / 2 },
      { type: 'carSUV',    x: 12, z: 4, rotation: Math.PI / 2 },
      { type: 'carSports', x: 12, z: 6, rotation: Math.PI / 2 },
    ],
    npcs: [
      { id: 'janitor', x: 12, z: 9, facing: Math.PI, movement: { type: 'patrol', waypoints: [{ x: 12, z: 9 }, { x: 12, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 9 }] } },  // sweeps the garage
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
      { type: 'grandDesk', x: 8, z: 2, rotation: Math.PI },
      { type: 'monitor', x: 8, z: 2.3, y: 0.06, rotation: Math.PI },
      { type: 'monitor', x: 7.2, z: 2.3, y: 0.06, rotation: Math.PI },
      { type: 'monitor', x: 8.8, z: 2.3, y: 0.06, rotation: Math.PI },  // triple monitors, face boss
      { type: 'keyboard', x: 8, z: 1.85, y: 0.06 },
      { type: 'executiveChair', x: 8, z: 1, rotation: 0 },  // big boss chair

      // === Power seating area (visitor chairs, facing desk) ===
      { type: 'chair', x: 6.8, z: 3.3, rotation: Math.PI },
      { type: 'chair', x: 7.6, z: 3.3, rotation: Math.PI },
      { type: 'chair', x: 8.4, z: 3.3, rotation: Math.PI },
      { type: 'chair', x: 9.2, z: 3.3, rotation: Math.PI },

      // === Secondary executive desk (west side, faces east) ===
      { type: 'desk', x: 3, z: 3, rotation: Math.PI / 2 },
      { type: 'monitor', x: 2.7, z: 3, rotation: -Math.PI / 2 },
      { type: 'keyboard', x: 3.2, z: 3 },
      { type: 'chair', x: 2, z: 3, rotation: Math.PI / 2 },

      // === Secondary executive desk (east side, faces west) ===
      { type: 'desk', x: 13, z: 3, rotation: -Math.PI / 2 },
      { type: 'monitor', x: 13.3, z: 3, rotation: -Math.PI / 2 },
      { type: 'keyboard', x: 12.8, z: 3 },
      { type: 'chair', x: 14, z: 3, rotation: -Math.PI / 2 },

      // === Credenza / power decor along north wall ===
      { type: 'fileCabinet', x: 1, z: 1 },
      { type: 'fileCabinet', x: 2, z: 1 },
      { type: 'fileCabinet', x: 14, z: 1 },
      { type: 'fileCabinet', x: 15, z: 1 },

      // === Conference area (west half, near water cooler) ===
      { type: 'conferenceTable', x: 4, z: 8, rotation: 0 },
      // North side chairs (face south toward table)
      { type: 'chair', x: 3, z: 7.0, rotation: 0 },
      { type: 'chair', x: 4, z: 7.0, rotation: 0 },
      { type: 'chair', x: 5, z: 7.0, rotation: 0 },
      // South side chairs (face north toward table)
      { type: 'chair', x: 3, z: 9.0, rotation: Math.PI },
      { type: 'chair', x: 4, z: 9.0, rotation: Math.PI },
      { type: 'chair', x: 5, z: 9.0, rotation: Math.PI },
      // West end chair (face east toward table)
      { type: 'chair', x: 1.9, z: 8, rotation: Math.PI / 2 },
      // East end chair (face west toward table)
      { type: 'chair', x: 6.1, z: 8, rotation: -Math.PI / 2 },

      // === Whiteboard ===
      { type: 'whiteboard', x: 15, z: 6, rotation: -Math.PI / 2 },

      // === Power decor: motivational posters (ironic executive versions) ===
      { type: 'motivationalPoster', x: 4, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 6, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 10, z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 12, z: 0.1, rotation: 0 },


      // === Printer / fax near east wall ===
      { type: 'printer', x: 15, z: 4 },

      // === Elevator doors (south wall) ===
      { type: 'elevatorDoors', x: 8, z: 11, rotation: Math.PI },

      // === Water cooler (executive-grade sparkling, obviously) ===
      { type: 'waterCooler', x: 1, z: 8 },
    ],
    npcs: [
      { id: 'regional', x: 8, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { notFlag: 'defeated_regional' } },
      { id: 'compliance', x: 13, z: 4, facing: Math.PI / 2, movement: { type: 'pace', distance: 1.5, axis: 'z' }, condition: { notFlag: 'compliance_defeated' } },
      // Ross appears at conference table after Henderson decision
      { id: 'ross', x: 6, z: 7, facing: Math.PI / 2, sitting: true, condition: { flag: 'branch_chosen', notFlag: 'defeated_regional' } },
    ],
    exits: [
      // SOUTH elevator -> Reception
      { x: 7, z: 11, targetRoom: 'reception', spawnX: 12, spawnZ: 4 },
      { x: 8, z: 11, targetRoom: 'reception', spawnX: 12, spawnZ: 4 },
      // NORTH exit -> Board Room (Act 5+)
      { x: 7, z: 0, targetRoom: 'board_room', spawnX: 8, spawnZ: 10 },
      { x: 8, z: 0, targetRoom: 'board_room', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 8, z: 2, type: 'executive_desk', dialogId: 'executive_desk' },
      { x: 1, z: 8, type: 'water_cooler', dialogId: 'executive_water_cooler' },
      { x: 8, z: 11, type: 'elevator', dialogId: 'elevator_executive' },
      // Motivational posters
      { x: 4,  z: 0, type: 'poster', dialogId: 'poster_exec_1' },
      { x: 6,  z: 0, type: 'poster', dialogId: 'poster_exec_2' },
      { x: 10, z: 0, type: 'poster', dialogId: 'poster_exec_3' },
      { x: 12, z: 0, type: 'poster', dialogId: 'poster_exec_4' },
    ],
    playerSpawn: { x: 8, z: 10 },
  },

  // ----------------------------------------------------------
  // 9. STAIRWELL — 4x20, vertical corridor
  // ----------------------------------------------------------
  stairwell: {
    id: 'stairwell',
    name: 'The Stairwell',
    width: 4,
    height: 20,
    floorColor: 0x555555,
    walls: true,
    slope: 0.04,  // radians — tilts the whole room so north end (archive) is lower
    furniture: [
      // Full descending staircase spanning the corridor
      { type: 'stairFlight', x: 2, z: 17 },
      // Cobwebs in corners — stairwells are neglected
      { type: 'cobweb', x: 0.2, z: 0.2 },
      { type: 'cobweb', x: 3.8, z: 0.2 },
      { type: 'cobweb', x: 0.2, z: 19.8 },
      { type: 'cobweb', x: 3.8, z: 19.8 },
      { type: 'cobweb', x: 0.2, z: 10 },
      { type: 'cobweb', x: 3.8, z: 10 },
      // Motivational poster on wall
      { type: 'motivationalPoster', x: 0.1, z: 10, rotation: Math.PI / 2 },
    ],
    exits: [
      // SOUTH exit -> Cubicle Farm
      { x: 1, z: 19, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 12 },
      { x: 2, z: 19, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 13 },
      // NORTH exit -> Archive (Act 3+)
      { x: 1, z: 0, targetRoom: 'archive', spawnX: 6, spawnZ: 8 },
      { x: 2, z: 0, targetRoom: 'archive', spawnX: 6, spawnZ: 8 },
    ],
    interactables: [
      { x: 3, z: 10, type: 'graffiti', dialogId: 'stairwell_graffiti' },
      { x: 0, z: 10, type: 'poster', dialogId: 'poster_stair_1' },
    ],
    playerSpawn: { x: 2, z: 18 },
  },

  // ----------------------------------------------------------
  // 10. THE ARCHIVE — 12x10, dusty file storage (Act 3+)
  // ----------------------------------------------------------
  archive: {
    id: 'archive',
    name: 'The Archive',
    width: 12,
    height: 10,
    floorColor: 0x8a7a6a,
    walls: true,
    furniture: [
      // Rows of file cabinets — all facing south (toward player)
      // West bank
      { type: 'fileCabinet', x: 1, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 2, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 3, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 4, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 1, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 2, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 3, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 4, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 1, z: 5, rotation: 0 },
      { type: 'fileCabinet', x: 2, z: 5, rotation: 0 },
      { type: 'fileCabinet', x: 3, z: 5, rotation: 0 },
      { type: 'fileCabinet', x: 4, z: 5, rotation: 0 },
      // East bank
      { type: 'fileCabinet', x: 7, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 8, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 9, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 10, z: 1, rotation: 0 },
      { type: 'fileCabinet', x: 7, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 8, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 9, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 10, z: 3, rotation: 0 },
      { type: 'fileCabinet', x: 7, z: 5, rotation: 0 },
      { type: 'fileCabinet', x: 8, z: 5, rotation: 0 },
      // Desk with terminal in far corner
      { type: 'desk', x: 10, z: 7, rotation: -Math.PI / 2 },
      { type: 'monitor', x: 10.3, z: 7 },
      { type: 'keyboard', x: 9.8, z: 7 },
      { type: 'chair', x: 9, z: 7, rotation: Math.PI / 2 },
      // Cobwebs
      { type: 'cobweb', x: 0.2, z: 0.2 },
      { type: 'cobweb', x: 11.8, z: 0.2 },
      { type: 'cobweb', x: 0.2, z: 9.8 },
      { type: 'cobweb', x: 11.8, z: 9.8 },
    ],
    npcs: [
      { id: 'security_guard', x: 5, z: 7, facing: 0, dialogId: 'security_guard_combat', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { notFlag: 'security_guard_info' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_intro', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'security_guard_info', notFlag: 'act3_complete' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_intro', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act3_complete', notFlag: 'ross_rallied' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_act4', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ross_rallied', notFlag: 'janitor_rallied' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_intro', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'janitor_rallied', notFlag: 'act5_complete' } },
    ],
    exits: [
      // SOUTH exit -> Stairwell
      { x: 5, z: 9, targetRoom: 'stairwell', spawnX: 1, spawnZ: 2 },
      { x: 6, z: 9, targetRoom: 'stairwell', spawnX: 2, spawnZ: 2 },
      // EAST exit -> Vault (Act 4+, gated by game logic)
      { x: 11, z: 5, targetRoom: 'vault', spawnX: 1, spawnZ: 4 },
    ],
    interactables: [
      { x: 10, z: 7, type: 'archive_terminal', dialogId: 'archive_terminal' },
      { x: 2, z: 3, type: 'filing_cabinets', dialogId: 'archive_cabinets' },
    ],
    playerSpawn: { x: 6, z: 8 },
  },

  // ----------------------------------------------------------
  // 11. HR DEPARTMENT — 16x10, open-plan office (Act 4+)
  // ----------------------------------------------------------
  hr_department: {
    id: 'hr_department',
    name: 'HR Department',
    width: 16,
    height: 10,
    floorColor: 0xc8bfa9,
    floorPattern: 'carpet',
    walls: true,
    furniture: [
      // === North-wall file cabinets (HR records) ===
      { type: 'fileCabinet', x: 1, z: 0.5 },
      { type: 'fileCabinet', x: 14, z: 0.5 },

      // === North cubicle row — 3 pods with wide aisles between them ===
      // Pod A (west, x:2-4)
      { type: 'cubicleWall', x: 2, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 4, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 2, z: 1.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 5, z: 1.5, rotation: Math.PI / 2 },
      { type: 'desk', x: 3, z: 2, rotation: 0 },
      { type: 'monitor', x: 3, z: 1.7 },
      { type: 'chair', x: 3, z: 2.8, rotation: Math.PI },

      // Pod B (center, x:7-9)
      { type: 'cubicleWall', x: 7, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 9, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 7, z: 1.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 10, z: 1.5, rotation: Math.PI / 2 },
      { type: 'desk', x: 8, z: 2, rotation: 0 },
      { type: 'monitor', x: 8, z: 1.7 },
      { type: 'chair', x: 8, z: 2.8, rotation: Math.PI },

      // Pod C (east, x:11-13)
      { type: 'cubicleWall', x: 11, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 13, z: 1, rotation: 0 },
      { type: 'cubicleWall', x: 11, z: 1.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 14, z: 1.5, rotation: Math.PI / 2 },
      { type: 'desk', x: 12, z: 2, rotation: 0 },
      { type: 'monitor', x: 12, z: 1.7 },
      { type: 'chair', x: 12, z: 2.8, rotation: Math.PI },

      // === South filing cabinets ===
      { type: 'fileCabinet', x: 3, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', x: 14, z: 8, rotation: Math.PI },

      // === Suggestion box on desk (south area) ===
      { type: 'desk', x: 10, z: 8, rotation: Math.PI },
      { type: 'fileCabinetLow', x: 10, z: 8, rotation: Math.PI },

      // === Motivational posters ===
      { type: 'motivationalPoster', x: 8, z: 0.1, rotation: 0 },
    ],
    npcs: [
      { id: 'hr_rep', x: 10, z: 6, facing: Math.PI, dialogId: 'hr_rep_combat', movement: { type: 'wander', radius: 2.5 }, condition: { notFlag: 'defeated_hr_rep' } },
      { id: 'hr_rep', x: 10, z: 6, facing: Math.PI, dialogId: 'hr_rep_defeated', condition: { flag: 'defeated_hr_rep' } },
    ],
    exits: [
      // WEST exit -> Cubicle Farm (single door, centered on west wall)
      { x: 0, z: 4, targetRoom: 'cubicle_farm', spawnX: 18, spawnZ: 2 },
      { x: 0, z: 5, targetRoom: 'cubicle_farm', spawnX: 18, spawnZ: 3 },
    ],
    interactables: [
      { x: 10, z: 8, type: 'suggestion_box', dialogId: 'suggestion_box' },
      { x: 1, z: 0.5, type: 'filing_cabinets', dialogId: 'hr_vault_code' },
      { x: 14, z: 8, type: 'filing_cabinets', dialogId: 'diane_documents' },
      { x: 8, z: 0, type: 'poster', dialogId: 'poster_hr_1' },
    ],
    playerSpawn: { x: 2, z: 4 },
  },

  // ----------------------------------------------------------
  // 12. THE VAULT — 8x8, secure room (Act 4+)
  // ----------------------------------------------------------
  vault: {
    id: 'vault',
    name: 'The Vault',
    width: 8,
    height: 8,
    floorColor: 0x3a3a4a,
    walls: true,
    lights: [
      { type: 'point', color: 0x8888ff, intensity: 0.5, x: 4, y: 2, z: 4, distance: 8 },
    ],
    furniture: [
      // 3x3 grid of safe deposit boxes
      { type: 'safeDepositBox', x: 2, z: 2 },
      { type: 'safeDepositBox', x: 4, z: 2 },
      { type: 'safeDepositBox', x: 6, z: 2 },
      { type: 'safeDepositBox', x: 2, z: 4 },
      { type: 'safeDepositBox', x: 4, z: 4 },
      { type: 'safeDepositBox', x: 6, z: 4 },
      { type: 'safeDepositBox', x: 2, z: 6 },
      { type: 'safeDepositBox', x: 4, z: 6 },
      { type: 'safeDepositBox', x: 6, z: 6 },
      // Desk for examining contents
      { type: 'desk', x: 1, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 1, z: 7, rotation: Math.PI },
    ],
    npcs: [],
    exits: [
      // WEST exit -> Archive
      { x: 0, z: 3, targetRoom: 'archive', spawnX: 10, spawnZ: 5 },
      { x: 0, z: 4, targetRoom: 'archive', spawnX: 10, spawnZ: 5 },
    ],
    interactables: [
      { x: 4, z: 4, type: 'safe_deposit_boxes', dialogId: 'vault_boxes' },
      { x: 6, z: 2, type: 'charter_display', dialogId: 'vault_charter' },
    ],
    playerSpawn: { x: 1, z: 4 },
  },

  // ----------------------------------------------------------
  // 13. THE BOARD ROOM — 16x12, Rachel's domain (Act 5+)
  // ----------------------------------------------------------
  board_room: {
    id: 'board_room',
    name: 'The Board Room',
    width: 16,
    height: 12,
    floorPattern: 'hardwood',
    walls: true,
    furniture: [
      // ── Grand boardroom table (left-edge at x:4, z:4 — spans x:4–12, z:4–6) ──
      { type: 'boardroomTable', x: 4, z: 4 },

      // Head chair — west end (chairman position)
      { type: 'executiveChair', x: 3, z: 5, rotation: Math.PI / 2 },

      // North-side chairs (z:3, facing south toward table)
      { type: 'executiveChair', x: 5,  z: 3, rotation: 0 },
      { type: 'executiveChair', x: 6,  z: 3, rotation: 0 },
      { type: 'executiveChair', x: 7,  z: 3, rotation: 0 },
      { type: 'executiveChair', x: 8,  z: 3, rotation: 0 },
      { type: 'executiveChair', x: 9,  z: 3, rotation: 0 },
      { type: 'executiveChair', x: 10, z: 3, rotation: 0 },
      { type: 'executiveChair', x: 11, z: 3, rotation: 0 },

      // South-side chairs (z:7, facing north toward table)
      { type: 'executiveChair', x: 5,  z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 6,  z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 7,  z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 8,  z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 9,  z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 10, z: 7, rotation: Math.PI },
      { type: 'executiveChair', x: 11, z: 7, rotation: Math.PI },

      // ── Grand paintings — north wall (flanking the penthouse door at x:7–8) ──
      { type: 'grandPainting', x: 3,  z: 0.08 },
      { type: 'grandPainting', x: 12, z: 0.08 },


      // ── Whiteboard on east wall (for presentations) ──
      { type: 'whiteboard', x: 15, z: 5, rotation: -Math.PI / 2 },
    ],
    npcs: [
      { id: 'rachel', x: 8, z: 2, facing: Math.PI, movement: { type: 'pace', distance: 3, axis: 'x', speed: 1.2 }, condition: { flag: 'act4_complete', notFlag: 'act5_complete' } },
    ],
    exits: [
      // SOUTH exit -> Executive Floor
      { x: 7, z: 11, targetRoom: 'executive_floor', spawnX: 7, spawnZ: 2 },
      { x: 8, z: 11, targetRoom: 'executive_floor', spawnX: 8, spawnZ: 2 },
      // NORTH exit -> Penthouse (Act 7)
      { x: 7, z: 0, targetRoom: 'penthouse', spawnX: 8, spawnZ: 10 },
      { x: 8, z: 0, targetRoom: 'penthouse', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 8, z: 1, type: 'charter_plaque', dialogId: 'board_charter' },
    ],
    playerSpawn: { x: 8, z: 10 },
  },

  // ----------------------------------------------------------
  // 14. THE PENTHOUSE — 16x12, final boss arena (Act 7)
  // ----------------------------------------------------------
  penthouse: {
    id: 'penthouse',
    name: 'The Penthouse',
    width: 16,
    height: 12,
    floorColor: 0x1a0a2e,
    floorPattern: 'hardwood',
    walls: true,
    lights: [
      // Signature purple-blue wash
      { type: 'point', color: 0x4444ff, intensity: 0.7, x: 4,  y: 2.5, z: 4, distance: 9  },
      { type: 'point', color: 0x8844ff, intensity: 0.6, x: 12, y: 2.5, z: 4, distance: 9  },
      { type: 'point', color: 0x4444ff, intensity: 0.6, x: 4,  y: 2.5, z: 8, distance: 9  },
      { type: 'point', color: 0x8844ff, intensity: 0.7, x: 12, y: 2.5, z: 8, distance: 9  },
      // Warm gold accents — wealth, power
      { type: 'point', color: 0xffaa22, intensity: 0.5, x: 8,  y: 3,   z: 6, distance: 14 },
      { type: 'point', color: 0xffd700, intensity: 0.4, x: 2,  y: 2,   z: 2, distance: 6  },
      { type: 'point', color: 0xffd700, intensity: 0.4, x: 14, y: 2,   z: 2, distance: 6  },
      // Warm pendant over kitchen island
      { type: 'point', color: 0xffeedd, intensity: 0.6, x: 3,  y: 2,   z: 5, distance: 5  },
    ],
    furniture: [
      // ── Executive desk — north centre ─────────────────────────
      { type: 'desk',     x: 7, z: 2, rotation: Math.PI },
      { type: 'desk',     x: 8, z: 2, rotation: Math.PI },
      { type: 'desk',     x: 9, z: 2, rotation: Math.PI },
      { type: 'monitor',  x: 7.3, z: 2.3, rotation: Math.PI },
      { type: 'monitor',  x: 8,   z: 2.3, rotation: Math.PI },
      { type: 'monitor',  x: 8.7, z: 2.3, rotation: Math.PI },
      { type: 'keyboard', x: 8,   z: 1.8 },
      { type: 'chair',    x: 8,   z: 1, rotation: 0 },

      // ── The Algorithm's server rack cluster — NE corner ───────
      { type: 'serverRack', x: 11, z: 1 },
      { type: 'serverRack', x: 12, z: 1 },
      { type: 'serverRack', x: 13, z: 1 },

      // ── Oil paintings — north wall ─────────────────────────────
      { type: 'oilPainting', x: 3,  z: 0.1, rotation: 0 },
      { type: 'oilPainting', x: 6,  z: 0.1, rotation: 0 },
      { type: 'oilPainting', x: 11, z: 0.1, rotation: 0 },

      // ── Oil paintings — east wall ──────────────────────────────
      { type: 'oilPainting', x: 15.5, z: 3, rotation:  Math.PI / 2 },
      { type: 'oilPainting', x: 15.5, z: 6, rotation:  Math.PI / 2 },
      { type: 'oilPainting', x: 15.5, z: 9, rotation:  Math.PI / 2 },

      // ── Oil paintings — west wall (above kitchen appliances) ──
      { type: 'oilPainting', x: 0.5, z: 9, rotation: -Math.PI / 2 },

      // ── Sculptures ────────────────────────────────────────────
      { type: 'sculpture', x: 14, z: 1  },
      { type: 'sculpture', x: 1,  z: 10 },
      { type: 'sculpture', x: 14, z: 10 },


      // ── Luxury Kitchen — NW corner, L-shaped ─────────────────
      // North wall run: cooktop → prep → sink → prep (z:1, x:2–5)
      { type: 'kitchenCounter', x: 2, z: 1, variant: 'cooktop' },
      { type: 'rangeHood',      x: 2, z: 1 },
      { type: 'kitchenCounter', x: 3, z: 1 },
      { type: 'kitchenCounter', x: 4, z: 1, variant: 'sink' },
      { type: 'kitchenCounter', x: 5, z: 1 },
      // West wall run: fridge → wine fridge (x:1, z:3 and z:5)
      { type: 'luxuryFridge',   x: 0.8, z: 1 },
      { type: 'wineFridge',     x: 6, z: 1 },
      // Island — centred in the L, open to south and east
      { type: 'kitchenIsland',  x: 3, z: 3 },
      // Bar stools on the open faces only (south + east)
      { type: 'chair', x: 2.5, z: 4.2, rotation: Math.PI },
      { type: 'chair', x: 3.5, z: 4.2, rotation: Math.PI },
      { type: 'chair', x: 4.6, z: 3,   rotation: Math.PI / 2 },

      // ── Vault wall — safe deposit boxes (east) ────────────────
      { type: 'safeDepositBox', x: 14, z: 3 },
      { type: 'safeDepositBox', x: 14, z: 4 },
      { type: 'safeDepositBox', x: 14, z: 5 },

      // ── Putting green ─────────────────────────────────────────
      { type: 'puttingGreen', x: 2, z: 7, rotation: 0 },

      // ── Conference area ───────────────────────────────────────
      { type: 'conferenceTable', x: 12, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 11, z: 5, rotation:  Math.PI / 2 },
      { type: 'chair', x: 11, z: 6, rotation:  Math.PI / 2 },
      { type: 'chair', x: 11, z: 7, rotation:  Math.PI / 2 },
      { type: 'chair', x: 13, z: 5, rotation: -Math.PI / 2 },
      { type: 'chair', x: 13, z: 6, rotation: -Math.PI / 2 },
      { type: 'chair', x: 13, z: 7, rotation: -Math.PI / 2 },
    ],
    npcs: [
      { id: 'cfos_assistant', x: 8, z: 7, facing: Math.PI, condition: { notFlag: 'cfos_defeated' }, dialogId: 'cfos_assistant_combat' },
      { id: 'regional_director', x: 8, z: 4, facing: Math.PI, condition: { flag: 'cfos_defeated', notFlag: 'regional_director_defeated' }, dialogId: 'regional_director_combat' },
    ],
    exits: [
      // SOUTH exit -> Board Room
      { x: 7, z: 11, targetRoom: 'board_room', spawnX: 8, spawnZ: 2 },
      { x: 8, z: 11, targetRoom: 'board_room', spawnX: 8, spawnZ: 2 },
    ],
    interactables: [
      { x: 8, z: 2, type: 'algorithm_terminal', dialogId: 'algorithm_terminal' },
    ],
    playerSpawn: { x: 8, z: 10 },
  },
};

// Quick-access helpers
export const ROOM_IDS = Object.keys(ROOMS);
export const getRoomData = (id) => ROOMS[id] || null;
