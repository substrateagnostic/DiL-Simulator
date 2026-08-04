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
    // Wave-2 cohesion: pinned to reception's clinical-white rig so the two
    // office rooms agree on what "white" is (cool key over the warm palette
    // lands institutional white, not khaki).
    lighting: { flicker: true, ambient: 0xeaf1f4, ambientIntensity: 0.58, dir: 0xf2f6ff, dirIntensity: 1.22 },
    // No windows: floor 6 is fully interior on the building plate —
    // ross_office/conference sit beyond the north wall (S5-P6). The
    // department's only daylight is the break room's west exposure.
    furniture: [
      // Wave-2: institutional-green carpet runners forming a cross through the
      // open aisles — the Lumon "green surface against clinical white" identity
      // (Severance comp). Vertical runner in the central x=8-11 corridor; a
      // shorter horizontal band across the mid aisle.
      { type: 'severanceRunner', x: 9.5, z: 8, variant: 14, rotation: Math.PI / 2 },
      { type: 'severanceRunner', x: 9.5, z: 7.5, variant: 8 },

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
      { type: 'monitor', x: 2,    z: 2.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 1.75, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 2.25, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'deskPlantSucculent', x: 1.6, z: 2.9 },
      { type: 'keyboard', x: 2, z: 3.2 },
      { type: 'chair',         x: 2, z: 3.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 2, z: 3.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 2.5, z: 4 },

      { type: 'desk', x: 4, z: 3, rotation: 0 },
      { type: 'monitor', x: 4,    z: 2.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 3.75, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 4.25, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'deskPlant', x: 4.4, z: 2.9 },
      { type: 'keyboard', x: 4, z: 3.2 },
      { type: 'chair',         x: 4, z: 3.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 4, z: 3.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 4.5, z: 4 },

      { type: 'desk', x: 6, z: 3, rotation: 0 },
      { type: 'monitor', x: 6,    z: 2.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 5.75, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 6.25, z: 2.7, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'deskPlantSucculent', x: 5.6, z: 2.9 },
      { type: 'keyboard', x: 6, z: 3.2 },
      { type: 'chair',         x: 6, z: 3.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 6, z: 3.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 6.5, z: 4 },

      // --- NE pod — 2 cubicles (x=13, 15) --- shifted west to clear HR door at (19,2-3)
      // Phantom Approver workstation — tucked in northeast corner, running hot
      { type: 'desk', x: 17, z: 5, rotation: 0 },
      { type: 'monitor', x: 17,    z: 4.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 16.75, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 17.25, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'chair',         x: 17, z: 5.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 17, z: 5.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      // Back walls
      { type: 'cubicleWall', x: 12, z: 4, rotation: 0 },
      { type: 'cubicleWall', x: 14, z: 4, rotation: 0 },
      // Side dividers
      { type: 'cubicleWall', x: 12, z: 4.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 14, z: 4.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 16, z: 4.5, rotation: Math.PI / 2 },
      // Cubicle desks
      { type: 'desk', x: 13, z: 5, rotation: 0 },
      { type: 'monitor', x: 13,    z: 4.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 12.75, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 13.25, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'deskPlant', x: 13.4, z: 4.9 },
      { type: 'keyboard', x: 13, z: 5.2 },
      { type: 'chair',         x: 13, z: 5.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 13, z: 5.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 13.5, z: 6 },

      { type: 'desk', x: 15, z: 5, rotation: 0 },
      { type: 'monitor', x: 15,    z: 4.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 14.75, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 15.25, z: 4.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'deskPlantSucculent', x: 14.6, z: 4.9 },
      { type: 'keyboard', x: 15, z: 5.2 },
      { type: 'chair',         x: 15, z: 5.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 15, z: 5.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
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
      { type: 'monitor', x: 3,    z: 9.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 2.75, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 3.25, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'deskPlantSucculent', x: 2.6, z: 9.9 },
      { type: 'keyboard', x: 3, z: 10.2 },
      { type: 'chair',         x: 3, z: 10.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 3, z: 10.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 3.5, z: 11 },
      // Neighbor cubicle
      { type: 'desk', x: 6, z: 10, rotation: 0 },
      { type: 'monitor', x: 6,    z: 9.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 5.75, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 6.25, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'deskPlant', x: 6.4, z: 9.9 },
      { type: 'keyboard', x: 6, z: 10.2 },
      { type: 'chair',         x: 6, z: 10.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 6, z: 10.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
      { type: 'trashCan', x: 6.5, z: 11 },

      // --- SE pod — 1 cubicle (x=13) + open water-cooler alcove ---
      // Back wall
      { type: 'cubicleWall', x: 12, z: 9, rotation: 0 },
      // Side dividers
      { type: 'cubicleWall', x: 12, z: 9.5, rotation: Math.PI / 2 },
      { type: 'cubicleWall', x: 14, z: 9.5, rotation: Math.PI / 2 },
      // Cubicle desk
      { type: 'desk', x: 13, z: 10, rotation: 0 },
      { type: 'monitor', x: 13,    z: 9.7, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 12.75, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'monitor', x: 13.25, z: 9.7, condition: { flag: 'renovation_ergonomic_workstations' } },
      { type: 'deskPlantSucculent', x: 12.6, z: 9.9 },
      { type: 'keyboard', x: 13, z: 10.2 },
      { type: 'chair',         x: 13, z: 10.8, rotation: Math.PI, condition: { notFlag: 'renovation_ergonomic_workstations' } },
      { type: 'executiveChair', x: 13, z: 10.8, rotation: Math.PI, condition: { flag:    'renovation_ergonomic_workstations' } },
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

      // Gary's desk, NE supply nook. `janet_vacancy_search` (16,3) is the
      // quest tile and the nearest desk was two tiles away in the pod, so the
      // dialog's "Gary's buried desk" was an empty patch of carpet
      // (CLAUDE.md "Quest interactable visibility").
      { type: 'desk',    x: 16, z: 3, rotation: 0 },
      { type: 'monitor', x: 16, z: 2.7 },

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
      // Where the fake windows used to be — more corporate wall comfort.
      // DELIBERATELY NOT posters: every `motivationalPoster` in the game is
      // readable (there is a `poster` interactable on its tile), and these two
      // never had one. Two identical props with different rules is a lie the
      // player pays for by walking over and pressing E at nothing — it is the
      // "posters that do nothing" the producer hit. Steel-framed abstracts read
      // as decoration at a glance: 1.2 x 0.95 at y 1.78 vs the poster's
      // 0.62 x 0.52 dark-wood frame at y 1.5.
      { type: 'abstractPainting', x: 3.5,  z: 0.1, rotation: 0 },
      { type: 'abstractPainting', x: 14.5, z: 0.1, rotation: 0 },
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
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { notFlag: 'lunch_thief_fridge_done' } },
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'lunch_thief_fridge_done', notFlag: 'lunch_thief_culprit_revealed' }, dialogId: 'janet_lunch_thief_investigate' },
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'lunch_thief_culprit_revealed', notFlag: 'lunch_thief_complete' }, dialogId: 'janet_lunch_thief_investigate' },
      { id: 'janet', x: 6, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'lunch_thief_complete', notFlag: 'janet_quest_resolved' }, dialogId: 'janet_lunch_thief_resolved' },
      // FACING LAW (see CLAUDE.md "Furniture rotation convention"): theta -> forward
      // (sin, 0, cos), so 0 = SOUTH and Math.PI = NORTH. A seated NPC must carry its
      // CHAIR'S rotation. Every seated entry in the game was one half-turn out.
      { id: 'janet', x: 6, z: 3.8, facing: Math.PI, sitting: true, condition: { flag: 'janet_quest_resolved' } },  // settles at her desk (chair 6,3.8 r=PI, desk at z=3 north of her)
      // Intern — conditional entries covering lunch thief confrontation
      { id: 'intern', x: 13, z: 7, facing: Math.PI, movement: { type: 'wander', radius: 3 }, condition: { notFlag: 'lunch_thief_culprit_revealed' } },
      { id: 'intern', x: 13, z: 7, facing: Math.PI, movement: { type: 'wander', radius: 3 }, condition: { flag: 'lunch_thief_culprit_revealed', notFlag: 'lunch_thief_complete' }, dialogId: 'intern_lunch_thief_confrontation' },
      { id: 'intern', x: 13, z: 5.8, facing: Math.PI, sitting: true, condition: { flag: 'lunch_thief_complete' } },  // seated at his workstation (chair 13,5.8 r=PI)
      { id: 'karen', x: 15, z: 12, facing: -Math.PI / 2, movement: { type: 'pace', distance: 1, axis: 'z' }, condition: { notFlag: 'briefing_complete' } }, // water cooler, paces — hidden once briefing starts
      { id: 'isaiah', x: 16, z: 12, facing: Math.PI, movement: { type: 'wander', radius: 2 } }, // near water cooler, wanders
      // Rachel (trust officer, `rachel_to`) — SW pod, the cubicle two bays over
      // from Andrew's (desk 6,10 / chair 6,10.8), seated facing her monitor.
      // Present Acts 1-3; gone from act3_complete on, when the sticky note on
      // her monitor takes over. The three entries are mutually exclusive; her
      // first-meeting intro is routed in ExplorationState._getDialogId() so an
      // unmet Rachel can still introduce herself in Act 2 or 3 without a second
      // NPC instance appearing on the same tile.
      { id: 'rachel_to', x: 6, z: 10.8, facing: Math.PI, sitting: true,
        condition: { notFlag: 'briefing_complete' }, dialogId: 'rachel_return_act1' },
      { id: 'rachel_to', x: 6, z: 10.8, facing: Math.PI, sitting: true,
        condition: { flag: 'briefing_complete', notFlag: 'act2_complete' }, dialogId: 'rachel_return_act2' },
      { id: 'rachel_to', x: 6, z: 10.8, facing: Math.PI, sitting: true,
        condition: { flag: 'act2_complete', notFlag: 'act3_complete' }, dialogId: 'rachel_return_act3' },
    ],
    exits: [
      // NORTH exits -> Alex's Office
      { x: 9, z: 0, targetRoom: 'ross_office', spawnX: 4, spawnZ: 6 },
      { x: 10, z: 0, targetRoom: 'ross_office', spawnX: 4, spawnZ: 6 },
      // WEST exit -> Break Room
      { x: 0, z: 7, targetRoom: 'break_room', spawnX: 12, spawnZ: 5 },
      { x: 0, z: 8, targetRoom: 'break_room', spawnX: 12, spawnZ: 5 },
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
      // Janet — The Vacancy: Gary's buried desk in the NE "supply nook"
      // (staging marks for this room live in `marks` at the end of the entry)
      { x: 16, z: 3, type: 'gary_desk', dialogId: 'janet_vacancy_search', condition: { flag: 'janet_vacancy_started' } },
      // Motivational posters
      { x: 7,  z: 0,  type: 'poster', dialogId: 'poster_cf_1' },
      { x: 6,  z: 15, type: 'poster', dialogId: 'poster_cf_2' },
      { x: 11, z: 15, type: 'poster', dialogId: 'poster_cf_3' },
      { x: 0,  z: 5,  type: 'poster', dialogId: 'poster_cf_4' },
      { x: 0,  z: 10, type: 'poster', dialogId: 'poster_cf_5' },
      { x: 19, z: 5,  type: 'poster', dialogId: 'poster_cf_6' },
      { x: 19, z: 10, type: 'poster', dialogId: 'poster_cf_7' },
      // Side quest interactables
      { x: 19, z: 12, type: 'poster', dialogId: 'quest_atk_1', condition: { flag: 'retry_karen' } },
      { x: 0,  z: 3,  type: 'poster', dialogId: 'quest_def_1', condition: { flag: 'retry_karen' } },
      // Phantom Approver: source workstation — on the desk tile, same pattern as andrews_desk
      { x: 17, z: 5,  type: 'monitor', dialogId: 'phantom_workstation_cf' },
      // Tuesday 2PM: sticky note on a monitor — the unoccupied SE-pod
      // desk (monitor at 13,9.7), not a bare aisle tile (S5-P6)
      { x: 13, z: 10, type: 'poster', dialogId: 'tuesday_sticky_note' },
      // Printer's Soul: ethernet port on the wall near the printer
      { x: 13, z: 2,  type: 'poster', dialogId: 'printer_ethernet_port' },
      // Rachel's empty desk — sticky note on her monitor once she's gone (Act 4+)
      { x: 6,  z: 10, type: 'monitor', dialogId: 'rachel_note', condition: { flag: 'act3_complete' } },
    ],
    // Staging marks. The central corridor is x 8-11; the south exits to
    // Reception are at (9,15)/(10,15), which is "the path to the elevator" the
    // Restructuring trio blocks.
    marks: {
      aisle_mid:    [9.5, 10.4],
      aisle_south:  [9.5, 13],
      block_w:      [8.4, 12],   // the three suits, abreast across the corridor
      block_c:      [9.5, 12],
      block_e:      [10.6, 12],
      andrews_desk: [3.6, 10.6],
      exit_south:   [9.5, 14.2],
    },
    playerSpawn: { x: 5, z: 12 },
  },

  // ----------------------------------------------------------
  // 2. BREAK ROOM — 16x12
  // ----------------------------------------------------------
  break_room: {
    id: 'break_room',
    name: 'Break Room',
    width: 16,
    height: 12,
    floorColor: 0xd8d0c0,
    walls: true,
    lighting: { ambient: 0xfff2e2, ambientIntensity: 0.58, dir: 0xffeecc, dirIntensity: 0.72 },
    windows: [{ wall: 'west', from: 2, to: 4, sky: 'day' }],
    furniture: [
      // === Kitchen counter along north wall ===
      { type: 'fridge',       x: 1, z: 0.5, rotation: 0, condition: { notFlag: 'renovation_catering_fridge' } },
      { type: 'luxuryFridge', x: 1, z: 0.5, rotation: 0, condition: { flag:    'renovation_catering_fridge' } },
      { type: 'waterCooler', x: 2.5, z: 1.5 },
      { type: 'desk', x: 5, z: 1, rotation: 0 },
      { type: 'coffeeMachine', x: 4, z: 1,                condition: { notFlag: 'renovation_espresso_bar' } },
      { type: 'espressoMachine', x: 4.3, z: 1,             condition: { flag: 'renovation_espresso_bar' } },
      { type: 'desk', x: 7, z: 1, rotation: 0 },
      { type: 'microwave', x: 8, z: 1 },
      { type: 'trashCan', x: 6.5, z: 1 },

      // === Vending machine + supply shop counter (northeast corner) ===
      { type: 'vendingMachine', x: 14, z: 1, rotation: 0 },
      { type: 'supplyShop',     x: 10, z: 1, rotation: 0 },

      // === Table 1 (west center) ===
      { type: 'desk', x: 4, z: 6, rotation: 0 },
      { type: 'chair', x: 3, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 5, z: 6, rotation: -Math.PI / 2 },
      { type: 'chair', x: 4, z: 5, rotation: 0 },
      { type: 'chair', x: 4, z: 7, rotation: Math.PI },

      // === Table 2 (center) ===
      { type: 'desk', x: 9, z: 6, rotation: 0 },
      { type: 'chair', x: 8, z: 6, rotation: Math.PI / 2 },
      { type: 'chair', x: 10, z: 6, rotation: -Math.PI / 2 },
      { type: 'chair', x: 9, z: 5, rotation: 0 },
      { type: 'chair', x: 9, z: 7, rotation: Math.PI },

      // === Table 3 (south center) ===
      { type: 'desk', x: 6, z: 10, rotation: 0 },
      { type: 'chair', x: 5, z: 10, rotation: Math.PI / 2 },
      { type: 'chair', x: 7, z: 10, rotation: -Math.PI / 2 },
      { type: 'chair', x: 6, z: 9, rotation: 0 },
      { type: 'chair', x: 6, z: 11, rotation: Math.PI },

      // === Motivational poster on north wall ===
      { type: 'motivationalPoster', x: 10, z: 0.1, rotation: 0 },

      // === Arcade cabinet (southeast) ===
      { type: 'arcadeCabinet', x: 13, z: 10, rotation: Math.PI },

      // Side quest posters
      { type: 'motivationalPoster', x: 0.1, z: 7,   rotation: Math.PI / 2 },
      { type: 'motivationalPoster', x: 2,   z: 10.9, rotation: Math.PI },

      // Network Ghost signal booster mount (east wall)
      { type: 'boosterMount', x: 14.9, z: 8, rotation: -Math.PI / 2, condition: { notFlag: 'quest_network_ghost_complete' } },

    ],
    npcs: [
      // Chad's home tile was (4,6) — dead centre of table 1's desk. He wanders
      // (and `wander` validates its targets against canMove), so he walked out
      // of the table and never back in, which made it read as intermittent.
      // Home is now the open floor south of the table.
      { id: 'chad', x: 4, z: 8, facing: 0, movement: { type: 'wander', radius: 3 }, condition: { notFlag: 'karen_defeated' }, dialogId: 'chad_breakroom_idle' },
      // Grandma stood at (9,6) — ON TOP of table 2's desk, with no `sitting`,
      // so from Act 5 on she rendered as a grey head embedded in the tabletop.
      // Seated in the south chair of that table, facing the table (-z = NORTH
      // = Math.PI; the chair at (9,7) is r=PI and an occupant carries its
      // chair's rotation). The old `facing: 0` pointed her at the south wall.
      { id: 'grandma', x: 9, z: 7, facing: Math.PI, sitting: true, condition: { flag: 'act5_complete' } },
    ],
    exits: [
      // EAST exit -> Cubicle Farm
      { x: 15, z: 5, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
      { x: 15, z: 6, targetRoom: 'cubicle_farm', spawnX: 2, spawnZ: 6 },
    ],
    interactables: [
      { x: 4,  z: 1,  type: 'coffee_machine',  dialogId: 'coffee_machine' },
      { x: 1,  z: 0,  type: 'fridge',           dialogId: 'fridge_notes' },
      { x: 14, z: 1,  type: 'vending_machine',  dialogId: 'vending_machine' },
      { x: 10, z: 1,  type: 'supply_shop' },
      { x: 8,  z: 1,  type: 'microwave',        dialogId: 'microwave' },
      { x: 10, z: 0,  type: 'poster',           dialogId: 'poster_br_1' },
      { x: 13, z: 10, type: 'arcade_cabinet',   dialogId: 'arcade_intro' },
      // Side quest interactables
      { x: 0,  z: 7,  type: 'poster', dialogId: 'quest_atk_3', condition: { flag: 'retry_karen' } },
      { x: 2,  z: 11, type: 'poster', dialogId: 'quest_def_3', condition: { flag: 'retry_karen' } },
      // Network Ghost signal booster (east wall)
      { x: 14, z: 8,  type: 'poster', dialogId: 'network_booster_br', condition: { notFlag: 'quest_network_ghost_complete' } },
      // Tuesday 2PM: old floppy disk on westmost table
      { x: 4, z: 6, type: 'poster', dialogId: 'tuesday_floppy' },
    ],
    playerSpawn: { x: 12, z: 5 },
  },

  // ----------------------------------------------------------
  // 3. ROSS'S OFFICE — 8x8, boss room
  // ----------------------------------------------------------
  ross_office: {
    id: 'ross_office',
    name: "Skip's Office",
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
      // ross_returned is an Act-7 beat ("the Regional Director was gone…
      // The Algorithm is already running projections") — it only fires
      // once the Regional Director is actually defeated, never at Act 3
      // (logic-sweep MAJORs #9/#15). Acts 3-6 use generic act routing.
      // Split across the Board Meeting window: once Skip has written the
      // speech (`ross_speech_ready`) he waits in the Board Room, and returns
      // to this office when `board_meeting_closed` derives (meeting held, or
      // act6_complete). Two entries instead of one so he is never in two
      // rooms at the same time.
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act2_complete', notFlag: 'ross_speech_ready' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'board_meeting_closed', notFlag: 'regional_director_defeated' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, dialogId: 'ross_returned', condition: { flag: 'regional_director_defeated', notFlag: 'ross_returned_seen' } },
      { id: 'ross', x: 4, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ross_returned_seen' } },
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

  // Loaded automatically instead of ross_office when renovation_corner_office flag is set
  ross_office_large: {
    id: 'ross_office_large',
    name: "Skip's Office",
    width: 12,
    height: 10,
    floorColor: 0x2e4a28,
    walls: true,
    furniture: [
      // === Executive desk (center-north) ===
      { type: 'desk', x: 5, z: 2, rotation: Math.PI },
      { type: 'monitor', x: 5,   z: 2.0, rotation: Math.PI },
      { type: 'monitor', x: 4.5, z: 2.0, rotation: Math.PI },
      { type: 'deskPlantSucculent', x: 5.5, z: 2.0 },
      { type: 'keyboard', x: 5, z: 1.8 },
      { type: 'executiveChair', x: 5, z: 1, rotation: 0 },

      // === Visitor executive chairs ===
      { type: 'executiveChair', x: 3, z: 4, rotation: Math.PI },
      { type: 'executiveChair', x: 7, z: 4, rotation: Math.PI },

      // === North wall — paintings ===
      { type: 'oilPainting',      x: 2,   z: 0.1,  rotation: 0 },
      { type: 'grandPainting',    x: 5,   z: 0.08, rotation: 0 },
      { type: 'portraitPainting', x: 8.5, z: 0.1,  rotation: 0 },

      // === West wall — credenza + file cabinets behind desk ===
      { type: 'credenza',    x: 0.5, z: 4 },
      { type: 'fileCabinet', x: 1,   z: 1 },
      { type: 'fileCabinet', x: 2,   z: 1 },

      // === Globe stand (east of desk) ===
      { type: 'globeStand', x: 7.5, z: 1.5 },

      // === East wall — abstract painting + corner bar ===
      { type: 'abstractPainting', x: 10.9, z: 2, rotation: -Math.PI / 2 },
      { type: 'cornerBar',        x: 9,    z: 6 },

      // === North wall — the three motivational posters, kept ===
      // The renovation buys Skip real art, but he never throws anything away,
      // so the posters squeeze in between the paintings. These carry
      // poster_rec_1/2/3 across the room swap; without them the corner-office
      // renovation DELETED three readable interactables.
      // Placement rules: north wall (z 0.1, rotation 0) is the camera-facing
      // wall, so they're actually visible; x sits in the gaps left by the
      // paintings (oil 1.65–2.35, grand 4.3–5.7, portrait 8.03–8.98) and within
      // 0.9 of an interactable tile whose z=1 neighbour is walkable.
      { type: 'motivationalPoster', x: 3.2, z: 0.1, rotation: 0 },   // "FIRST IMPRESSIONS ARE PERMANENT"
      { type: 'motivationalPoster', x: 6.4, z: 0.1, rotation: 0 },   // "SERVICE IS OUR PROMISE"
      { type: 'motivationalPoster', x: 9.8, z: 0.1, rotation: 0 },   // "YOUR CLIENT IS NOT A NUMBER"
    ],
    npcs: [
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, dialogId: 'ross_not_ready', condition: { notFlag: 'ready_for_ross' } },
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ready_for_ross', notFlag: 'branch_chosen' } },
      // Mirrors ross_office: ross_returned is gated on the Regional
      // Director's defeat (Act 7), not act2_complete (MAJORs #9/#15)
      // Mirrors ross_office: split across the Board Meeting window so Skip
      // is never in this office and the Board Room simultaneously.
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act2_complete', notFlag: 'ross_speech_ready' } },
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'board_meeting_closed', notFlag: 'regional_director_defeated' } },
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, dialogId: 'ross_returned', condition: { flag: 'regional_director_defeated', notFlag: 'ross_returned_seen' } },
      { id: 'ross', x: 5, z: 1.5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ross_returned_seen' } },
    ],
    exits: [
      { x: 4, z: 9, targetRoom: 'cubicle_farm',    spawnX: 9, spawnZ: 4 },
      { x: 5, z: 9, targetRoom: 'cubicle_farm',    spawnX: 10, spawnZ: 4 },
      { x: 11, z: 3, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
      { x: 11, z: 4, targetRoom: 'conference_room', spawnX: 1, spawnZ: 4 },
    ],
    interactables: [
      { x: 5, z: 2, type: 'ross_desk', dialogId: 'ross_desk' },
      // Motivational posters — same three dialogs as the un-renovated office,
      // each on the wall tile in front of its motivationalPoster mesh above.
      { x: 3,  z: 0, type: 'poster', dialogId: 'poster_rec_1' },
      { x: 6,  z: 0, type: 'poster', dialogId: 'poster_rec_2' },
      { x: 10, z: 0, type: 'poster', dialogId: 'poster_rec_3' },
    ],
    playerSpawn: { x: 5, z: 7 },
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
    // East wall is exterior too (offsetX 16 + width 12 = plate edge) and,
    // unlike the north span, is never covered by the projection-wall
    // renovation smartBoards (S5-P6).
    windows: [{ wall: 'east', from: 1, to: 2, sky: 'day' }],
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
      { type: 'whiteboard', x: 6, z: 0.2, rotation: 0, condition: { notFlag: 'renovation_projection_wall' } },

      // === Second whiteboard on east wall ===
      { type: 'whiteboard', x: 11, z: 4, rotation: -Math.PI / 2 },

      // === Projector screen area — just a motivational poster placeholder ===
      { type: 'motivationalPoster', x: 3, z: 0.1, rotation: 0, condition: { notFlag: 'renovation_projection_wall' } },
      // Side quest posters
      { type: 'motivationalPoster', x: 10.9, z: 6, rotation: -Math.PI / 2 },
      { type: 'motivationalPoster', x: 5,    z: 6.9, rotation: Math.PI },

      // Network Ghost signal booster mount (east wall)
      { type: 'boosterMount', x: 10.9, z: 2, rotation: -Math.PI / 2, condition: { notFlag: 'quest_network_ghost_complete' } },

      // ── Renovation: Smart Projection Wall (full north wall coverage) ────────
      { type: 'smartBoard', x: 1, z: 0.1, rotation: 0, condition: { flag: 'renovation_projection_wall' } },
      { type: 'smartBoard', x: 3, z: 0.1, rotation: 0, condition: { flag: 'renovation_projection_wall' } },
      { type: 'smartBoard', x: 5, z: 0.1, rotation: 0, condition: { flag: 'renovation_projection_wall' } },
      { type: 'smartBoard', x: 7, z: 0.1, rotation: 0, condition: { flag: 'renovation_projection_wall' } },
      { type: 'smartBoard', x: 9, z: 0.1, rotation: 0, condition: { flag: 'renovation_projection_wall' } },
    ],
    npcs: [
      // Henderson beneficiaries appear based on quest progress
      { id: 'karen', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'karen_meeting', condition: { flag: 'briefing_complete', notFlag: 'retry_karen' } },
      { id: 'karen', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'karen_not_ready', condition: { flag: 'retry_karen', notFlag: 'karen_retry_ready' } },
      { id: 'karen', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'karen_meeting', condition: { flag: 'karen_retry_ready', notFlag: 'karen_defeated' } },
      { id: 'chad', x: 8.0, z: 4, facing: -Math.PI / 2, dialogId: 'chad_meeting', condition: { flag: 'ross_post_karen', notFlag: 'chad_defeated' } },
      // She opens with "Come sit down. I made cookies." and then offers Andrew
      // the chair opposite — so she is SEATED. Chair (6,5) is r=PI (seats north
      // at the table), which is the facing she already carried.
      { id: 'grandma', x: 6, z: 5.0, facing: Math.PI, sitting: true, dialogId: 'grandma_meeting', condition: { flag: 'ross_post_chad', notFlag: 'grandma_defeated' } },
    ],
    exits: [
      // WEST exit -> Alex's Office
      { x: 0, z: 3, targetRoom: 'ross_office', spawnX: 6, spawnZ: 3 },
      { x: 0, z: 4, targetRoom: 'ross_office', spawnX: 6, spawnZ: 4 },
    ],
    interactables: [
      { x: 6, z: 0, type: 'whiteboard', dialogId: 'conference_whiteboard', condition: { notFlag: 'renovation_projection_wall' } },
      { x: 3, z: 0, type: 'poster', dialogId: 'poster_conf_1', condition: { notFlag: 'renovation_projection_wall' } },
      // Side quest interactables
      { x: 11, z: 6, type: 'poster', dialogId: 'quest_atk_2', condition: { flag: 'retry_karen' } },
      { x: 5,  z: 7, type: 'poster', dialogId: 'quest_def_2', condition: { flag: 'retry_karen' } },
      // Network Ghost signal booster (east wall)
      { x: 10, z: 2, type: 'poster', dialogId: 'network_booster_conf', condition: { notFlag: 'quest_network_ghost_complete' } },
    ],
    // Staging marks (see src/world/StageDirector.js). The conference table
    // blocks x 5-7 at z=4, so anything crossing the room routes via `aisle_s`
    // — the walker is a straight line with an axis slide, not a pathfinder.
    marks: {
      chair_west:  [4, 4],
      chair_east:  [8, 4],
      chair_n_mid: [6, 3],
      chair_s_mid: [6, 5],
      aisle_s:     [7.6, 5.9],
      door_west:   [0.7, 3.5],
    },
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
    // Darker-but-READABLE data centre (round-3 fix b/e): fill lifted a stop
    // out of the black pit, staying cooler than the office. The racks' cyan
    // data-spines are the saturated source; point lights are cyan-dominant
    // with one restrained warm counter, not the old green/blue/orange confetti.
    // Wave-2: base clinical fill lifted ~a stop out of the black pit (Severance
    // dread is even light, not darkness) — racks/floor/character read as objects.
    // dir stays < 0.9 so the office troffers don't intrude on the data centre.
    lighting: { ambient: 0x9db2c8, ambientIntensity: 0.92, dir: 0xb6cfe6, dirIntensity: 0.86 },
    lights: [
      { type: 'point', color: 0x0bd7ff, intensity: 0.9, x: 2, y: 1.5, z: 3, distance: 7 },  // cold aisle — cyan spine wash
      { type: 'point', color: 0x0bd7ff, intensity: 0.7, x: 4, y: 1.5, z: 3, distance: 7 },  // second cyan aisle
      { type: 'point', color: 0xffffff, intensity: 0.5, x: 3, y: 2.3, z: 3, distance: 8 },  // neutral fill (readability)
      { type: 'point', color: 0x2ea6d6, intensity: 0.7, x: 6, y: 2,   z: 7, distance: 8 },  // Alex's corner — teal
      // Wave-2 R2: the west aisle + the whole south play space was a black void
      // slab (critic). Two cool neutral fills lift the empty floor/walls out of
      // the murk so the room reads as a lit set, not a dark pit around the racks.
      { type: 'point', color: 0x9fc0d8, intensity: 0.62, x: 2, y: 2.4, z: 7, distance: 9 },  // SW play-space fill
      { type: 'point', color: 0x9fc0d8, intensity: 0.5,  x: 2, y: 2.4, z: 5, distance: 8 },  // west aisle / exit fill
    ],
    furniture: [
      // === Hot/cold aisle treatment + overhead cable trays ===
      { type: 'aisleGlow', x: 2, z: 3, variant: 0x0bd7ff },  // cyan cold aisle (round-3 e — restrained seam colour)
      { type: 'aisleGlow', x: 4, z: 3, variant: 0x18a6cc },  // teal second aisle
      { type: 'cableTray', x: 2, z: 3, rotation: Math.PI / 2 },
      { type: 'cableTray', x: 4, z: 3, rotation: Math.PI / 2 },
      // Alex's den monitor wall, arm-mounted above the desk, facing him
      { type: 'monitorWall', x: 6, z: 6.3, rotation: Math.PI },

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
      { type: 'fileCabinet', x: 7, z: 3 },  // shelf for tuesday_server_tag interactable
      { type: 'fileCabinet', x: 7, z: 4 },
      // Unauthorized Patch: standalone network monitoring terminal in the aisle
      { type: 'monitor', x: 5, z: 6 },
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
      { x: 3, z: 3, type: 'server_rack', dialogId: 'morse_code_rack' },
      { x: 5, z: 3, type: 'server_rack', dialogId: 'server_vault_code', condition: { flag: 'vault_accessible' } },
      // Alex from IT — Badge Audit personal mission: PATCH-3 server rack ("DO NOT TOUCH 4ever")
      { x: 5, z: 5, type: 'server_rack', dialogId: 'alex_badge_audit_pull', condition: { flag: 'alex_badge_audit_started' } },
      { x: 6, z: 7, type: 'alex_it_desk', dialogId: 'alex_it_desk' },
      // The Daemon at Rack 7 — post-game. It reconciles timestamps. The
      // timestamps have always been fine.
      { x: 3, z: 4, type: 'daemon_terminal', dialogId: 'daemon_rack7', condition: { flag: 'algorithm_defeated' } },
      // Side quest interactables
      { x: 3, z: 0, type: 'poster', dialogId: 'quest_atk_4', condition: { flag: 'retry_karen' } },
      { x: 0, z: 7, type: 'poster', dialogId: 'quest_def_4', condition: { flag: 'retry_karen' } },
      // Tuesday 2PM: decommissioned server tag on equipment shelf
      { x: 7, z: 3, type: 'poster', dialogId: 'tuesday_server_tag' },
      // Printer's Soul: firmware disk on equipment shelf
      { x: 7, z: 4, type: 'poster', dialogId: 'printer_firmware_disk' },
      // Unauthorized Patch: network monitoring terminal
      { x: 5, z: 6, type: 'poster', dialogId: 'unauthorized_patch_monitor' },
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
    // Clinical Severance white, pulled up to match cubicle_farm (round-3
    // fix b: reception was reading grey-murk). Cool key keeps the warm
    // beige palette landing on institutional white, not khaki.
    lighting: { ambient: 0xeaf1f4, ambientIntensity: 0.6, dir: 0xf2f6ff, dirIntensity: 1.28 },
    furniture: [
      // === Reception desk (center, facing south toward entrance) ===
      { type: 'receptionDesk',       x: 7, z: 3, rotation: 0, condition: { notFlag: 'renovation_marble_counter' } },
      { type: 'receptionDeskMarble', x: 7, z: 3, rotation: 0, condition: { flag:    'renovation_marble_counter' } },
      // The elevator down to the garage (south exit tiles 6-7)
      { type: 'elevatorDoors', x: 6.5, z: 7.45, rotation: Math.PI, variant: '1' },
      { type: 'monitor', x: 6.5, z: 2.8, rotation: Math.PI },
      { type: 'monitor', x: 7.5, z: 2.8, rotation: Math.PI },
      { type: 'deskPlant', x: 8.0, z: 2.9 },
      { type: 'keyboard', x: 7, z: 3.3 },
      // Behind the desk, seating SOUTH toward the lobby. The desk (7,3 r=0) and
      // both monitors (z 2.8 r=PI, screens facing north into the seat) were
      // already built for a receptionist looking south; the chair and Diane
      // were the two things pointing at the back wall.
      { type: 'chair', x: 7, z: 2, rotation: 0 },

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
      // Green EXIT lightbox on the north wall by the door — the clinical white
      // lobby's one saturated pop (round-3 note). Glows toward the iso camera.
      { type: 'exitSign', x: 4.5, z: 0.13, y: 2.05 },
      // === Elevator on east wall ===
      { type: 'elevatorDoors', x: 13, z: 3, rotation: -Math.PI / 2 },

      // === File cabinet next to reception desk (east side) ===
      { type: 'fileCabinet', x: 9, z: 3, rotation: Math.PI },
      // Side quest posters
      { type: 'motivationalPoster', x: 11,  z: 0.1, rotation: 0 },
      { type: 'motivationalPoster', x: 0.1, z: 5,   rotation: Math.PI / 2 },

      // ── Renovation: Marble Reception Counter ────────────────────────────
      { type: 'marblePlanter', x: 5,  z: 4, condition: { flag: 'renovation_marble_counter' } },
      { type: 'marblePlanter', x: 9,  z: 4, condition: { flag: 'renovation_marble_counter' } },

      // ── Renovation: Lobby Sculptures (north corners) ──────────────────
      { type: 'marbleStatue', x: 1.5,  z: 1.5, condition: { flag: 'renovation_lobby_sculpture' } },
      { type: 'marbleStatue', x: 11.5, z: 1.5, condition: { flag: 'renovation_lobby_sculpture' } },
    ],
    npcs: [
      { id: 'diane', x: 7, z: 2, facing: 0, sitting: true, interactRange: 1.2 },  // ON the chair at (7,2), facing south at the lobby
      // Hidden once ross_post_chad is set — at that point she is seated in the
      // conference room, and two Grandmas at once was a continuity bug, not a
      // Christie twist. grandma_defeated implies ross_post_chad (#14).
      { id: 'grandma', x: 2, z: 5, facing: Math.PI / 2, condition: { flag: 'chad_defeated', notFlag: 'ross_post_chad' }, dialogId: 'grandma_reception_idle' },
      // Waiting-area chair (10,5) is r=PI/2 (seats EAST, across the side table
      // at 11,5.5); the client was the only thing reversed.
      { id: 'reception_client', x: 10, z: 5, facing: Math.PI / 2, interactable: true, sitting: true },
      // INTENTIONALLY VESTIGIAL (#27): the trio post-dialog sets
      // restructuring_defeated and corporate_lawyer_defeated in the same
      // frame, so this solo-gauntlet lawyer can never spawn today. Kept (with
      // the matching exec-floor gate and objective line in ExplorationState)
      // in case the Act 5 gauntlet is ever re-split into solo fights.
      { id: 'corporate_lawyer', x: 11, z: 4, facing: -Math.PI / 2, condition: { flag: 'restructuring_defeated', notFlag: 'corporate_lawyer_defeated' }, dialogId: 'corporate_lawyer_combat' },
    ],
    exits: [
      // NORTH exits -> Cubicle Farm
      { x: 6, z: 0, targetRoom: 'cubicle_farm', spawnX: 9, spawnZ: 13 },
      { x: 7, z: 0, targetRoom: 'cubicle_farm', spawnX: 10, spawnZ: 13 },
      // SOUTH exits -> Parking Garage (the elevator brings its own doors)
      { x: 6, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1, doorStyle: 'none' },
      { x: 7, z: 7, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1, doorStyle: 'none' },
      // EAST elevator -> Executive Floor (Act 3 only, gated by game logic)
      { x: 13, z: 3, targetRoom: 'executive_floor', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 13, z: 3, type: 'elevator', dialogId: 'elevator' },
      { x: 7, z: 2, type: 'reception_desk', dialogId: 'reception_desk' },
      // Side quest interactables
      { x: 11, z: 0, type: 'poster', dialogId: 'quest_atk_5', condition: { flag: 'retry_karen' } },
      { x: 0,  z: 5, type: 'poster', dialogId: 'quest_def_5', condition: { flag: 'retry_karen' } },
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
    lighting: { ambient: 0xb8c0cc, ambientIntensity: 0.42, dir: 0xcfd8e2, dirIntensity: 0.6, flicker: true },
    // Wave-2: interior sodium. Warm point lights hang over the drive aisles so
    // the parked-car concrete catches warm sodium pools (Drive night) instead
    // of the cool fluorescent-only wash it had — matched by sodiumPool decals.
    lights: [
      { type: 'point', color: 0xffa23c, intensity: 0.85, x: 2.5, y: 1.7, z: 4, distance: 6 },
      { type: 'point', color: 0xffa23c, intensity: 0.8,  x: 7,   y: 1.7, z: 5, distance: 6 },
      { type: 'point', color: 0xffa23c, intensity: 0.85, x: 10.5, y: 1.7, z: 4, distance: 6 },
    ],
    furniture: [
      // Sodium light pools on the concrete beneath the aisle lamps
      { type: 'sodiumPool', x: 2.5, z: 4 },
      { type: 'sodiumPool', x: 7,   z: 5 },
      { type: 'sodiumPool', x: 10.5, z: 4 },
      // S2.5: warm pendant tubes hung directly over each sodium pool so the
      // interior floor pools among the cars trace to a visible source instead
      // of glowing from nowhere (garage critic).
      { type: 'garagePendant', x: 2.5,  z: 4, y: 2.12 },
      { type: 'garagePendant', x: 7,    z: 5, y: 2.12 },
      { type: 'garagePendant', x: 10.5, z: 4, y: 2.12 },
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

      // The elevator up into the building (north exit tiles 6-7)
      { type: 'elevatorDoors', x: 6.5, z: -0.45, variant: 'G' },
      // The janitor's supply locker. The `janitor_closet` interactable sits on
      // this tile and had nothing to aim at — bare concrete (CLAUDE.md "Quest
      // interactable visibility"). Industrial grey-green metal, on his patrol.
      { type: 'fileCabinet', variant: 0x55605a, x: 12, z: 8, rotation: Math.PI },
    ],
    npcs: [
      { id: 'janitor', x: 12, z: 9, facing: Math.PI, movement: { type: 'patrol', waypoints: [{ x: 12, z: 9 }, { x: 12, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 9 }] } },  // sweeps the garage
    ],
    exits: [
      // NORTH exits -> Reception (the elevator brings its own doors)
      { x: 6, z: 0, targetRoom: 'reception', spawnX: 6, spawnZ: 6, doorStyle: 'none' },
      { x: 7, z: 0, targetRoom: 'reception', spawnX: 7, spawnZ: 6, doorStyle: 'none' },
      // SOUTH — the garage door to the street (Act 6½, gated on city_unlocked)
      { x: 6, z: 9, targetRoom: 'city_street', spawnX: 12, spawnZ: 10 },
      { x: 7, z: 9, targetRoom: 'city_street', spawnX: 13, spawnZ: 10 },
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
    lighting: { ambient: 0xe8eeff, ambientIntensity: 0.52, dir: 0xdde6ff, dirIntensity: 0.85 },
    // North wall is exterior (floor 21 sits at the plate's north edge).
    // Spans trimmed so the windows, the four ironic posters (x 5/6/9/10)
    // and the board-room door (x 7-8) each get their own wall (S5-P6).
    windows: [
      { wall: 'north', from: 2, to: 4, sky: 'dusk' },
      { wall: 'north', from: 11, to: 13, sky: 'dusk' },
    ],
    furniture: [
      // === Grand executive desk (north-center, imposing) ===
      { type: 'grandDesk', x: 8, z: 3, rotation: Math.PI },
      { type: 'monitor', x: 8, z: 3.3, y: 0.1, rotation: Math.PI },
      { type: 'monitor', x: 7.2, z: 3.3, y: 0.1, rotation: Math.PI },
      { type: 'monitor', x: 8.8, z: 3.3, y: 0.1, rotation: Math.PI },  // triple monitors, face boss
      { type: 'keyboard', x: 8, z: 2.85, y: 0.06 },
      { type: 'executiveChair', x: 8, z: 2, rotation: 0 },  // big boss chair

      // === Power seating area (visitor chairs, facing desk) ===
      { type: 'chair', x: 6.8, z: 4.3, rotation: Math.PI },
      { type: 'chair', x: 7.6, z: 4.3, rotation: Math.PI },
      { type: 'chair', x: 8.4, z: 4.3, rotation: Math.PI },
      { type: 'chair', x: 9.2, z: 4.3, rotation: Math.PI },

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

      // === Power decor: the executive gallery (WEST wall) ===
      // Was FOUR cubicle-grade 0.62x0.52 dark-wood frames at y 1.5, crammed
      // into the two 2-tile slivers between the north window spans and the
      // board-room door casing at exactly 1.00 tile apart. Measured across all
      // 11 poster-bearing rooms (31 posters), that was the ONLY room in the
      // building with any two posters closer than 1.6 tiles — and it had two
      // such pairs.
      //
      // WHICH WALL — the load-bearing part. The iso camera sits at +x/+z, so it
      // reads the inner faces of the NORTH (z=0) and WEST (x=0) walls; the east
      // and south walls are between the camera and the room and render as
      // near-transparent glass seen from BEHIND. Art on them is a grey smear.
      // The A2 audit's "move them to the east wall" recommendation was shot and
      // rejected on that render (screenshots/g-run/cutscenes/posters/). The west
      // wall is the room's only long camera-facing surface with nothing on it.
      // Three `executivePoster`s, 3 and 4 tiles apart, clear of the file cabinet
      // at (1,1) and the water cooler at (1,8). Keep in sync with the
      // interactables below.
      { type: 'executivePoster', x: 0.1, z: 3,  rotation: Math.PI / 2 },
      { type: 'executivePoster', x: 0.1, z: 6,  rotation: Math.PI / 2 },
      { type: 'executivePoster', x: 0.1, z: 10, rotation: Math.PI / 2 },


      // === Printer / fax near east wall ===
      { type: 'printer', x: 15, z: 4 },

      // === Elevator doors (south wall) ===
      { type: 'elevatorDoors', x: 8, z: 11, rotation: Math.PI },

      // === Water cooler (executive-grade sparkling, obviously) ===
      { type: 'waterCooler', x: 1, z: 8 },
    ],
    npcs: [
      // Regional Manager — only for legal/bro paths, not grandma path. Moved off desk.
      { id: 'regional', x: 10, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'path_legal', notFlag: 'defeated_regional' } },
      // path_bro never fights the Regional Manager, so defeated_regional is
      // never set on that path — gate on act5_complete instead (Act 5's
      // narration announces his SEC arrest) (#16).
      { id: 'regional', x: 10, z: 5, facing: Math.PI, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'path_bro', notFlag: 'act5_complete' } },
      { id: 'compliance', x: 13, z: 6, facing: Math.PI / 2, movement: { type: 'pace', distance: 1, axis: 'x' }, condition: { notFlag: 'compliance_defeated' } },
      // Re-appears in Act 3+ for bro-path players who defeated him — needed to issue archive crossword password
      { id: 'compliance', x: 13, z: 6, facing: Math.PI / 2, movement: { type: 'pace', distance: 1, axis: 'x' }, condition: { flag: 'compliance_defeated', notFlag: 'compliance_crossword_done' } },
      // Skip appears at the conference table after the Henderson decision. ON
      // the east-end chair (6.1,8) r=-PI/2, facing WEST down the table — he was
      // crouched in mid-air 1.00 tiles off the nearest seat, looking at the wall.
      { id: 'ross', x: 6.1, z: 8, facing: -Math.PI / 2, sitting: true, condition: { flag: 'branch_chosen', notFlag: 'act2_complete' } },
      // Grandma appears on the executive floor for the secret path — ON the
      // north-side chair (4,7) r=0, facing SOUTH across the table at Skip. She
      // was half a tile behind the chair row with her back to both.
      { id: 'grandma', x: 4, z: 7, facing: 0, sitting: true, dialogId: 'grandma_exec_idle', condition: { flag: 'path_grandma', notFlag: 'ross_defeated' } },
      // Rachel surveys her future territory during Acts 3-4. Her intro/act3/
      // return dialogs were unreachable before — no Rachel NPC existed
      // anywhere until the board room (#20). Routing in _getDialogId serves
      // rachel_intro first, then rachel_act3, then rachel_return.
      { id: 'rachel', x: 12, z: 8, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { flag: 'act2_complete', notFlag: 'act4_complete' } },
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
      { x: 8, z: 3, type: 'executive_desk', dialogId: 'executive_desk' },
      { x: 1, z: 8, type: 'water_cooler', dialogId: 'executive_water_cooler' },
      { x: 8, z: 11, type: 'elevator', dialogId: 'elevator_executive' },
      // Executive gallery — kept in sync with the furniture entries above
      { x: 0, z: 3,  type: 'poster', dialogId: 'poster_exec_1' },
      { x: 0, z: 6,  type: 'poster', dialogId: 'poster_exec_2' },
      { x: 0, z: 10, type: 'poster', dialogId: 'poster_exec_3' },
    ],
    // Named staging marks — see the `stage` dialog node in CLAUDE.md and
    // src/world/StageDirector.js. Keeping the coordinates HERE (rather than in
    // dialogs/index.js) means a Rooms-tab furniture drag can be followed by a
    // mark edit in the same file instead of silently invalidating a cutscene.
    marks: {
      table_approach:  [5.4, 9.7],   // where Andrew stops at the conference table
      table_seat_s:    [5, 9],       // south-side chair Andrew takes
      table_seat_sw:   [4, 9],
      table_seat_e:    [6.1, 8],     // Skip's east-end chair
      table_seat_n:    [4, 7],       // Grandma's north-side chair
      table_seat_ne:   [5, 7],
      table_stand_n:   [5, 6.3],     // standing at the table on the north side
      regional_post:     [10, 5],    // where the Regional Manager stands (his NPC home)
      regional_confront: [9, 5],     // one tile short of him, face to face
      regional_flank_s:  [8.8, 6.2],
      regional_flank_n:  [8.6, 4.3],
      confront_north:  [8, 5.6],     // face-off tile north of the floor's centre
      exec_center:     [8, 7.6],
      elevator:        [8, 10.3],
      board_door:      [7.5, 1],
    },
    playerSpawn: { x: 8, z: 10 },
  },

  // ----------------------------------------------------------
  // 9. STAIRWELL — 4x20, vertical corridor
  // ----------------------------------------------------------
  stairwell: {
    id: 'stairwell',
    name: 'Back Corridor',
    width: 4,
    height: 20,
    floorColor: 0xc0b8a8,
    walls: true,
    lighting: { ambient: 0xaab4c0, ambientIntensity: 0.42, dir: 0xc8d2dc, dirIntensity: 0.55, flicker: true },
    // A TRUE stairwell: three landings connected by two full-width flights.
    // You enter at department level and physically descend two storeys to the
    // archive door. A storey in this game is 2.5 m (Room._buildPerimeterWalls,
    // wallHeight = 2.5), so two storeys is 5.0 m.
    //
    // GEOMETRY LAW for this room — these four numbers are load-bearing:
    //   rise per step  0.42 m   (TileMap.canMove refuses a jump > 0.55, so the
    //                            ceiling on a walkable step is 0.55; 0.42 keeps
    //                            headroom and still reads as a riser at the iso
    //                            camera, where 0.225 did not)
    //   tread          1.00 m   (one tile — the grid cannot do less)
    //   pitch          22.8°    (atan 0.42/1.00). The previous build was 0.225
    //                            over 1.00 = 12.7°, i.e. a wheelchair ramp, and
    //                            delivered 1.80 m total — 36 % of its own claim.
    //   total descent  5.04 m   = 12 steps x 0.42 = 2.02 storeys. Claim is true.
    // `Furniture.stairRail` hardcodes the same 0.42/1.00 pair. Change one, change
    // both, or the handrail floats off the nosings.
    floorZones: [
      { x: 0, z: 16, w: 4, h: 4, y: 0 },       // TOP LANDING (cubicle farm level)
      { x: 0, z: 15, w: 4, h: 1, y: -0.42 },   // flight A — 6 steps
      { x: 0, z: 14, w: 4, h: 1, y: -0.84 },
      { x: 0, z: 13, w: 4, h: 1, y: -1.26 },
      { x: 0, z: 12, w: 4, h: 1, y: -1.68 },
      { x: 0, z: 11, w: 4, h: 1, y: -2.10 },
      { x: 0, z: 10, w: 4, h: 1, y: -2.52 },
      { x: 0, z: 8,  w: 4, h: 2, y: -2.52 },   // MID LANDING (one storey down)
      { x: 0, z: 7,  w: 4, h: 1, y: -2.94 },   // flight B — 6 steps
      { x: 0, z: 6,  w: 4, h: 1, y: -3.36 },
      { x: 0, z: 5,  w: 4, h: 1, y: -3.78 },
      { x: 0, z: 4,  w: 4, h: 1, y: -4.20 },
      { x: 0, z: 3,  w: 4, h: 1, y: -4.62 },
      { x: 0, z: 2,  w: 4, h: 1, y: -5.04 },
      { x: 0, z: 0,  w: 4, h: 2, y: -5.04 },   // BOTTOM LANDING (archive level)
    ],
    furniture: [
      // Handrails. The terraces already give treads and risers; the rail is the
      // cue that makes the flight read as a STAIRCASE rather than a slope at
      // the shipping iso camera. Two per flight, flanking the walkable band
      // (Player.move clamps x to 0.4-2.6 in a 4-wide room).
      { type: 'stairRail', x: -0.3, z: 16, y: 0,     variant: 6 },
      { type: 'stairRail', x: 3.3,  z: 16, y: 0,     variant: 6 },
      { type: 'stairRail', x: -0.3, z: 8,  y: -2.52, variant: 6 },
      { type: 'stairRail', x: 3.3,  z: 8,  y: -2.52, variant: 6 },
      // Motivational poster on west wall (top landing)
      { type: 'motivationalPoster', x: 0.1, z: 17, rotation: Math.PI / 2 },
      // Network Ghost signal booster mount (east wall, upper section)
      { type: 'boosterMount', x: 3.9, z: 17, rotation: -Math.PI / 2, condition: { notFlag: 'quest_network_ghost_complete' } },
    ],
    exits: [
      // EAST exits -> Cubicle Farm (the farm's stairwell door is on ITS
      // west wall at z12-13, so this door faces it from the top landing)
      { x: 3, z: 17, targetRoom: 'cubicle_farm', spawnX: 1, spawnZ: 12 },
      { x: 3, z: 18, targetRoom: 'cubicle_farm', spawnX: 1, spawnZ: 13 },
      // NORTH exit -> Archive (Act 3+), two storeys down
      { x: 1, z: 0, targetRoom: 'archive', spawnX: 6, spawnZ: 8 },
      { x: 2, z: 0, targetRoom: 'archive', spawnX: 6, spawnZ: 8 },
    ],
    interactables: [
      // Poster + booster tiles moved with their props when the top landing was
      // re-terraced from z14-19 to z16-19 (CLAUDE.md poster-placement law:
      // the `motivationalPoster` furniture entry and the `poster` interactable
      // must always move together, and both must sit on a LANDING — a prop on
      // a step row would float above its own tread).
      { x: 3, z: 16, type: 'graffiti', dialogId: 'stairwell_graffiti' },
      { x: 0, z: 17, type: 'poster', dialogId: 'poster_stair_1' },
      // Network Ghost signal booster (east wall, top landing)
      { x: 3, z: 17, type: 'poster', dialogId: 'network_booster_stairwell', condition: { notFlag: 'quest_network_ghost_complete' } },
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
    lighting: { ambient: 0xb89a78, ambientIntensity: 0.4, dir: 0xd8c290, dirIntensity: 0.5 },
    lights: [
      // One hanging bulb over the center aisle — the rest is dust and memory
      { type: 'point', color: 0xffcc77, intensity: 1.4, x: 5.5, y: 2.4, z: 4, distance: 9 },
    ],
    furniture: [
      // Rows of file cabinets — all facing south (toward player)
      // West bank
      { type: 'fileCabinet', variant: 0x3a2e20, x: 1, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 2, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 3, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 4, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 1, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 2, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 3, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 4, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 1, z: 5, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 2, z: 5, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 3, z: 5, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 4, z: 5, rotation: 0 },
      // East bank
      { type: 'fileCabinet', variant: 0x3a2e20, x: 7, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 8, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 9, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 10, z: 1, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 7, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 8, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 9, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 10, z: 3, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 7, z: 5, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 8, z: 5, rotation: 0 },
      // West cluster — south extension (NPC paces x:3-7, so x:1-2 safe)
      { type: 'fileCabinet', variant: 0x3a2e20, x: 1, z: 7, rotation: 0 },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 2, z: 7, rotation: 0 },
      // South wall — west side (facing north into room)
      { type: 'fileCabinet', variant: 0x3a2e20, x: 1, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 2, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 3, z: 8, rotation: Math.PI },
      { type: 'fileCabinet', variant: 0x3a2e20, x: 4, z: 8, rotation: Math.PI },
      // Desk with terminal in far corner
      { type: 'desk', x: 10, z: 7, rotation: -Math.PI / 2 },
      { type: 'monitor', x: 10.3, z: 7, rotation: -Math.PI / 2 },
      { type: 'keyboard', x: 9.8, z: 7 },
      { type: 'chair', x: 9, z: 7, rotation: Math.PI / 2 },
      // Vault door on east wall
      { type: 'vaultDoor', x: 11.5, z: 5, rotation: Math.PI / 2 },
      // Cobwebs
      { type: 'cobweb', x: 0.2, z: 0.2 },
      { type: 'cobweb', x: 11.8, z: 0.2 },
      { type: 'cobweb', x: 0.2, z: 9.8 },
      { type: 'cobweb', x: 11.8, z: 9.8 },

    ],
    npcs: [
      // He is described as stepping out FROM BEHIND a row of filing cabinets,
      // so he waits in the east bank's z=6 gap rather than in the open aisle
      // the player spawns into. The `security_guard_combat` stage node walks
      // him out to block the stairs.
      { id: 'security_guard', x: 8, z: 6, facing: 0, dialogId: 'security_guard_combat', movement: { type: 'pace', distance: 1.5, axis: 'x' }, condition: { notFlag: 'security_guard_info' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_act3', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'security_guard_info', notFlag: 'read_janitor_act3' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_return', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'read_janitor_act3', notFlag: 'act3_complete' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_needs_ross', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act3_complete', notFlag: 'ross_rallied' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_act4', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'ross_rallied', notFlag: 'janitor_rallied' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_return', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'janitor_rallied', notFlag: 'act5_complete' } },
      // Act 6 rally phase: he sweeps and waits — no Rolex until the BOARD HAS
      // MET. `rolex_available` derives in _refreshStoryProgress as
      // `act5_complete && (board_meeting_held || has_rolex)`. It replaced
      // `act6_ready` (5 allies + 2 evidence) as the gate here because the old
      // order let the watch delete the board-meeting set-piece unplayed, and
      // with it the Act 6 → 7 narrative bridge. `janitor_waits_for_board` is
      // the signpost from his side; it is repeatable and writes nothing.
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_waits_for_board', movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'act5_complete', notFlag: 'rolex_available' } },
      { id: 'janitor', x: 5, z: 7, facing: 0, dialogId: 'janitor_act6',  movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'rolex_available', notFlag: 'has_rolex' } },
      // He does not leave when the watch does. Handing over the Rolex used to
      // delete him from the Archive — the room's occupant vanishing exactly as
      // the story peaks, and his ledger mission stranded on the garage NPC
      // alone. No dialogId: routing gives him the riddles, the ledger mission,
      // Dave, the pattern, and small talk, in that order (proposal 2).
      { id: 'janitor', x: 5, z: 7, facing: 0, movement: { type: 'pace', distance: 2, axis: 'x' }, condition: { flag: 'has_rolex' } },
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
      // Isaiah's buried receipts — mislabeled HVAC cabinet, only visible once quest started
      { x: 1, z: 5, type: 'filing_cabinets', dialogId: 'isaiah_receipts_pull', condition: { flag: 'isaiah_receipts_started' } },
    ],
    marks: {
      guard_hide:  [8, 6],
      guard_block: [6.4, 7.7],
      aisle_mid:   [5.6, 7],
    },
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

      // === South-wall filing cabinets (all HR records) ===
      { type: 'fileCabinet', x: 2,  z: 9, rotation: Math.PI },
      { type: 'fileCabinet', x: 6,  z: 9, rotation: Math.PI },
      { type: 'fileCabinet', x: 11, z: 9, rotation: Math.PI },
      { type: 'fileCabinet', x: 14, z: 9, rotation: Math.PI },

      // === Suggestion box on desk (south area) ===
      { type: 'desk', x: 9, z: 9, rotation: Math.PI },
      { type: 'fileCabinetLow', x: 9, z: 9, y: 0.72, rotation: Math.PI },

      // === Motivational posters ===
      { type: 'motivationalPoster', x: 8, z: 0.1, rotation: 0 },
    ],
    npcs: [
      { id: 'hr_rep', x: 10, z: 6, facing: Math.PI, dialogId: 'hr_rep_combat', movement: { type: 'wander', radius: 2.5 }, condition: { notFlag: 'defeated_hr_rep' } },
      // hr_rep_intro's own condition node routes defeated_hr_rep to a short
      // return line — pointing here at hr_rep_defeated replayed the full
      // "you search the files" narration forever (#21)
      { id: 'hr_rep', x: 10, z: 6, facing: Math.PI, dialogId: 'hr_rep_intro', condition: { flag: 'defeated_hr_rep' } },
    ],
    exits: [
      // WEST exit -> Cubicle Farm (single door, centered on west wall)
      { x: 0, z: 4, targetRoom: 'cubicle_farm', spawnX: 18, spawnZ: 2 },
      { x: 0, z: 5, targetRoom: 'cubicle_farm', spawnX: 18, spawnZ: 3 },
    ],
    interactables: [
      { x: 9, z: 9, type: 'suggestion_box', dialogId: 'suggestion_box' },
      { x: 2,  z: 9, type: 'filing_cabinets', dialogId: 'hr_vault_code' },
      { x: 14, z: 9, type: 'filing_cabinets', dialogId: 'diane_documents' },
      { x: 8,  z: 0, type: 'poster',          dialogId: 'poster_hr_1' },
      { x: 11, z: 9, type: 'filing_cabinets', dialogId: 'phantom_expense_hr' },
      // Diane's original handbook — MISC ADMIN ARCHIVE box, only visible once quest started
      { x: 6,  z: 9, type: 'filing_cabinets', dialogId: 'diane_handbook_search', condition: { flag: 'diane_handbook_started' } },
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
    lighting: { ambient: 0x9aa4c0, ambientIntensity: 0.5, dir: 0xb4c0dd, dirIntensity: 0.62 },
    lights: [
      { type: 'point', color: 0x8888ff, intensity: 0.5, x: 4, y: 2, z: 4, distance: 8 },
    ],
    furniture: [
      // North wall — 4 units × W=1.75 spanning x=0–7, face south
      { type: 'lockbox', x: 0.875, z: 0.2, rotation: 0,            variant: 1.75 },
      { type: 'lockbox', x: 2.625, z: 0.2, rotation: 0,            variant: 1.75 },
      { type: 'lockbox', x: 4.375, z: 0.2, rotation: 0,            variant: 1.75 },
      { type: 'lockbox', x: 6.125, z: 0.2, rotation: 0,            variant: 1.75 },
      // East wall — 4 units × W=1.75 spanning z=0–7, face west
      { type: 'lockbox', x: 7.36, z: 0.875, rotation: -Math.PI / 2, variant: 1.75 },
      { type: 'lockbox', x: 7.36, z: 2.625, rotation: -Math.PI / 2, variant: 1.75 },
      { type: 'lockbox', x: 7.36, z: 4.375, rotation: -Math.PI / 2, variant: 1.75 },
      { type: 'lockbox', x: 7.36, z: 6.125, rotation: -Math.PI / 2, variant: 1.75 },
      // South wall — 4 units × W=1.75 spanning x=0–7, face north
      { type: 'lockbox', x: 0.875, z: 7.36, rotation: Math.PI,     variant: 1.75 },
      { type: 'lockbox', x: 2.625, z: 7.36, rotation: Math.PI,     variant: 1.75 },
      { type: 'lockbox', x: 4.375, z: 7.36, rotation: Math.PI,     variant: 1.75 },
      { type: 'lockbox', x: 6.125, z: 7.36, rotation: Math.PI,     variant: 1.75 },
      // West wall, south of the archive doorway (exits at z 3-4). The
      // `janitor_names_search` interactable at (1,6) is described as "behind
      // the low-left deposit box frame" and there was no box on that wall at
      // all — nothing to walk up to (CLAUDE.md "Quest interactable visibility").
      { type: 'lockbox', x: 0.64, z: 6.125, rotation: Math.PI / 2, variant: 1.75 },
    ],
    npcs: [],
    exits: [
      // WEST exit -> Archive
      { x: 0, z: 3, targetRoom: 'archive', spawnX: 10, spawnZ: 5 },
      { x: 0, z: 4, targetRoom: 'archive', spawnX: 10, spawnZ: 5 },
    ],
    interactables: [
      { x: 4, z: 1, type: 'safe_deposit_boxes', dialogId: 'vault_boxes' },
      // Janitor — The Names: ledger hidden behind the low-left deposit box frame
      { x: 1, z: 6, type: 'ledger_hiding_spot', dialogId: 'janitor_names_search', condition: { flag: 'janitor_names_started' } },
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
    lighting: { ambient: 0xffe9c4, ambientIntensity: 0.48, dir: 0xffddaa, dirIntensity: 0.7 },
    windows: [
      { wall: 'west', from: 3, to: 5, sky: 'dusk' },
      { wall: 'west', from: 7, to: 9, sky: 'dusk' },
    ],
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

      // ── Credenzas — butted against west and east walls, drawers face inward ──
      { type: 'credenza',     x: 0,  z: 4 },   // west wall, front faces east (+x)
      { type: 'credenzaEast', x: 14, z: 4 },   // east wall, front faces west (-x)

      // ── Executive globe — NE corner ──
      { type: 'globeStand', x: 14, z: 2 },

      // ── The fourth executive poster ("The frame is gold. Real gold,
      //    probably.") — rehoused here off the executive floor's overcrowded
      //    north wall. The Board Room had zero posters and two grand paintings.
      //    North wall, 2 tiles clear of the grand painting at x=3 (see the
      //    which-wall note on the executive floor: north and west are the only
      //    camera-facing surfaces).
      { type: 'executivePoster', x: 1, z: 0.1, rotation: 0 },

      // ── Corner bar — behind globe in NE corner ──
      { type: 'cornerBar', x: 13, z: 0 },

      // ── Whiteboard on east wall — hidden after trophy wall renovation ──
      { type: 'whiteboard', x: 15, z: 5, rotation: -Math.PI / 2, condition: { notFlag: 'renovation_trophy_wall' } },

      // ── Renovation: Victory Trophy Wall ─────────────────────────────────────────
      // West wall trophy cases (north of credenza: z:1–3, south of credenza: z:7.5–9.5)
      { type: 'trophyCase', x: 0.1, z: 1,   rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      { type: 'trophyCase', x: 0.1, z: 2,   rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      { type: 'trophyCase', x: 0.1, z: 3,   rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      { type: 'trophyCase', x: 0.1, z: 7.5, rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      { type: 'trophyCase', x: 0.1, z: 8.5, rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      { type: 'trophyCase', x: 0.1, z: 9.5, rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      // Smart board — west wall, raised above credenza (facing east into room)
      { type: 'smartBoard', x: 0.1, z: 5, y: 0.65, rotation: Math.PI / 2, condition: { flag: 'renovation_trophy_wall' } },
      // Stock ticker display — north wall, left of penthouse door (facing south into room)
      { type: 'stockTicker', x: 5.5, z: 0.1, y: 0.5, condition: { flag: 'renovation_trophy_wall' } },
      // Backlit whiskey wall — north wall, right of penthouse door (facing south into room)
      { type: 'whiskeyWall', x: 10, z: 0.1, condition: { flag: 'renovation_trophy_wall' } },
    ],
    npcs: [
      { id: 'rachel', x: 8, z: 2, facing: Math.PI, movement: { type: 'pace', distance: 3, axis: 'x', speed: 1.2 }, condition: { flag: 'act4_complete', notFlag: 'act5_complete' } },

      // ── THE BOARD MEETING (Act 6, optional set-piece) ──────────────────────
      // Skip is the entry point: talking to him convenes the meeting
      // (`board_meeting`). The allies stand with him ONLY if the player
      // rallied them — the scene's spine runs with zero of them present.
      // Every entry clears on `board_meeting_closed`, a derived flag set in
      // ExplorationState._refreshStoryProgress() when the meeting is held OR
      // when act6_complete fires, so nobody is left standing in here during
      // the penthouse ascent. Skip's office entries are split on the same
      // flag pair so he is never in two rooms at once.
      // FACING: all six stood at z 8-9 with `facing: 0` = SOUTH, i.e. six
      // rallied allies lined up with their BACKS to the table they came to
      // face. theta -> (sin, cos), so north is Math.PI. (CLAUDE.md's rotation
      // bullet said the opposite until this commit; that is where these came
      // from.)
      { id: 'ross',    x: 7,  z: 9, facing: Math.PI, movement: { type: 'pace', distance: 1.5, axis: 'x' }, dialogId: 'board_meeting',         condition: { flag: 'ross_speech_ready',   notFlag: 'board_meeting_closed' } },
      { id: 'diane',   x: 4,  z: 8, facing: Math.PI,                                                      dialogId: 'board_meeting_diane',   condition: { flag: 'diane_act6_rallied',  notFlag: 'board_meeting_closed' } },
      { id: 'intern',  x: 5,  z: 9, facing: Math.PI, movement: { type: 'wander', radius: 1 },             dialogId: 'board_meeting_intern',  condition: { flag: 'intern_act6_rallied', notFlag: 'board_meeting_closed' } },
      { id: 'isaiah',  x: 10, z: 8, facing: Math.PI,                                                      dialogId: 'board_meeting_isaiah',  condition: { flag: 'isaiah_evidence',     notFlag: 'board_meeting_closed' } },
      { id: 'janet',   x: 11, z: 9, facing: Math.PI,                                                      dialogId: 'board_meeting_janet',   condition: { flag: 'janet_act6_rallied',  notFlag: 'board_meeting_closed' } },
      { id: 'grandma', x: 13, z: 8, facing: Math.PI,                                                      dialogId: 'board_meeting_grandma', condition: { flag: 'grandma_ally',        notFlag: 'board_meeting_closed' } },
    ],
    exits: [
      // SOUTH exit -> Executive Floor
      { x: 7, z: 11, targetRoom: 'executive_floor', spawnX: 7, spawnZ: 6 },
      { x: 8, z: 11, targetRoom: 'executive_floor', spawnX: 8, spawnZ: 6 },
      // NORTH exit -> Penthouse (Act 7)
      { x: 7, z: 0, targetRoom: 'penthouse', spawnX: 8, spawnZ: 10 },
      { x: 8, z: 0, targetRoom: 'penthouse', spawnX: 8, spawnZ: 10 },
    ],
    interactables: [
      { x: 8, z: 1, type: 'charter_plaque', dialogId: 'board_charter' },
      { x: 1, z: 0, type: 'poster', dialogId: 'poster_exec_4' },
    ],
    // Staging marks. The boardroom table blocks x 4-12 at z 4-6, so every
    // crossing routes around it through z=8 (south) or z=2 (north).
    marks: {
      head_chair:    [3, 5],      // the chairman's seat, west end
      head_stand:    [2.4, 5],    // standing at the head of the table
      table_s_mid:   [8, 7],      // south-side chair, Andrew's side
      table_s_east:  [9, 7],
      table_n_mid:   [8, 3],      // north-side chair
      table_edge_s:  [8, 8],      // standing at the table, south side
      carafe:        [13.4, 4],   // the credenza the twelfth member crosses to
      aisle_s:       [8, 9],
      aisle_n:       [8, 2],
      door_south:    [7.5, 10.4],
      door_north:    [7.5, 1],
    },
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
    lighting: { ambient: 0xe0c0e8, ambientIntensity: 0.45, dir: 0xcc99dd, dirIntensity: 0.6 },
    windows: [
      { wall: 'north', from: 3, to: 6, sky: 'night' },
      { wall: 'north', from: 9, to: 12, sky: 'night' },
    ],
    lights: [
      // Signature purple-blue wash
      { type: 'point', color: 0x4444ff, intensity: 0.7, x: 4,  y: 2.5, z: 4, distance: 9  },
      { type: 'point', color: 0x8844ff, intensity: 0.6, x: 12, y: 2.5, z: 4, distance: 9  },
      { type: 'point', color: 0x4444ff, intensity: 0.6, x: 4,  y: 2.5, z: 8, distance: 9  },
      { type: 'point', color: 0x8844ff, intensity: 0.7, x: 12, y: 2.5, z: 8, distance: 9  },
      // Warm gold accents — wealth, power
      { type: 'point', color: 0xffaa22, intensity: 0.5, x: 8,  y: 3,   z: 6, distance: 14 },
      { type: 'point', color: 0xffd700, intensity: 0.1, x: 2,  y: 2,   z: 2, distance: 6  },
      { type: 'point', color: 0xffd700, intensity: 0.1, x: 14, y: 2,   z: 2, distance: 6  },
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
      // Both ambushers stood in open floor with `facing: Math.PI` = NORTH, i.e.
      // backs to the door Andrew walks in through at (8,10). The Assistant is
      // now tucked at the terminal he is described as stepping out from
      // behind (the desk run blocks z=2, so z=3 is the tile behind it), and
      // both face SOUTH at the arrival.
      { id: 'cfos_assistant', x: 8, z: 3, facing: 0, condition: { notFlag: 'cfos_defeated' }, dialogId: 'cfos_assistant_combat' },
      { id: 'regional_director', x: 8, z: 4, facing: 0, condition: { flag: 'cfos_defeated', notFlag: 'regional_director_defeated' }, dialogId: 'regional_director_combat' },
    ],
    exits: [
      // SOUTH exit -> Board Room
      { x: 7, z: 11, targetRoom: 'board_room', spawnX: 8, spawnZ: 2 },
      { x: 8, z: 11, targetRoom: 'board_room', spawnX: 8, spawnZ: 2 },
    ],
    interactables: [
      { x: 8, z: 2, type: 'algorithm_terminal', dialogId: 'algorithm_terminal' },
    ],
    marks: {
      terminal_back: [8, 3],     // behind the desk run — where the Assistant waits
      arena_north:   [8, 5.4],   // where an ambusher steps out to
      arena_mid:     [8, 7.4],   // where Andrew stops
      door_south:    [7.6, 10.4],
    },
    playerSpawn: { x: 8, z: 10 },
  },

  // ----------------------------------------------------------
  // 15. PENTHOUSE EXPANDED — post-renovation hub (16×12)
  //     Identical to penthouse but adds wing exits.
  //     Loaded via _resolveRoomId when renovation_penthouse is set.
  // ----------------------------------------------------------
  penthouse_expanded: {
    id: 'penthouse_expanded',
    name: 'The Penthouse',
    width: 22,
    height: 16,
    floorColor: 0x1a0a2e,
    floorPattern: 'hardwood',
    walls: true,
    lighting: { ambient: 0xe0c0e8, ambientIntensity: 0.45, dir: 0xcc99dd, dirIntensity: 0.6 },
    lights: [
      // Purple-blue wash across larger space
      { type: 'point', color: 0x4444ff, intensity: 0.7, x: 4,  y: 2.5, z: 4,  distance: 10 },
      { type: 'point', color: 0x8844ff, intensity: 0.6, x: 18, y: 2.5, z: 4,  distance: 10 },
      { type: 'point', color: 0x4444ff, intensity: 0.6, x: 4,  y: 2.5, z: 11, distance: 10 },
      { type: 'point', color: 0x8844ff, intensity: 0.7, x: 18, y: 2.5, z: 11, distance: 10 },
      { type: 'point', color: 0x6633ff, intensity: 0.5, x: 11, y: 2.5, z: 7,  distance: 14 },
      // Gold accents
      { type: 'point', color: 0xffaa22, intensity: 0.4, x: 11, y: 3,   z: 4,  distance: 10 },
      { type: 'point', color: 0xffd700, intensity: 0.1, x: 2,  y: 2,   z: 2,  distance: 6  },
      { type: 'point', color: 0xffd700, intensity: 0.1, x: 20, y: 2,   z: 2,  distance: 6  },
      // Kitchen pendant
      { type: 'point', color: 0xffeedd, intensity: 0.6, x: 3,  y: 2,   z: 5,  distance: 5  },
    ],
    furniture: [
      // ── Kitchen — NW corner ───────────────────────────────────────
      { type: 'luxuryFridge',   x: 0.8, z: 1 },
      { type: 'kitchenCounter', x: 2,   z: 1, variant: 'cooktop' },
      { type: 'rangeHood',      x: 2,   z: 1 },
      { type: 'kitchenCounter', x: 3,   z: 1 },
      { type: 'kitchenCounter', x: 4,   z: 1, variant: 'sink' },
      { type: 'kitchenCounter', x: 5,   z: 1 },
      { type: 'wineFridge',     x: 6,   z: 1 },
      { type: 'kitchenIsland',  x: 3,   z: 3 },
      { type: 'chair', x: 2.5, z: 4.2, rotation: Math.PI },
      { type: 'chair', x: 3.5, z: 4.2, rotation: Math.PI },
      { type: 'chair', x: 4.6, z: 3,   rotation: Math.PI / 2 },

      // ── Executive desk — near server racks ───────────────────────
      { type: 'desk',     x: 13, z: 2, rotation: Math.PI },
      { type: 'desk',     x: 14, z: 2, rotation: Math.PI },
      { type: 'desk',     x: 15, z: 2, rotation: Math.PI },
      { type: 'monitor',  x: 13.3, z: 2.3, rotation: Math.PI },
      { type: 'monitor',  x: 14,   z: 2.3, rotation: Math.PI },
      { type: 'monitor',  x: 14.7, z: 2.3, rotation: Math.PI },
      { type: 'keyboard', x: 14,   z: 1.8 },
      { type: 'chair',    x: 14,   z: 1, rotation: 0 },

      // ── Server rack cluster — NE corner ─────────────────────────
      { type: 'serverRack', x: 16, z: 1 },
      { type: 'serverRack', x: 17, z: 1 },
      { type: 'serverRack', x: 18, z: 1 },


      // ── Conference area — SE area ────────────────────────────────
      { type: 'conferenceTable', x: 17, z: 9, rotation: Math.PI / 2 },
      { type: 'chair', x: 16, z: 8,  rotation:  Math.PI / 2 },
      { type: 'chair', x: 16, z: 9,  rotation:  Math.PI / 2 },
      { type: 'chair', x: 16, z: 10, rotation:  Math.PI / 2 },
      { type: 'chair', x: 18, z: 8,  rotation: -Math.PI / 2 },
      { type: 'chair', x: 18, z: 9,  rotation: -Math.PI / 2 },
      { type: 'chair', x: 18, z: 10, rotation: -Math.PI / 2 },
    ],
    npcs: [
      { id: 'cfos_assistant',   x: 11, z: 10, facing: Math.PI, condition: { notFlag: 'cfos_defeated' },                                    dialogId: 'cfos_assistant_combat'   },
      { id: 'regional_director', x: 11, z: 6,  facing: Math.PI, condition: { flag: 'cfos_defeated', notFlag: 'regional_director_defeated' }, dialogId: 'regional_director_combat' },
    ],
    exits: [
      // SOUTH → Board Room
      { x: 10, z: 15, targetRoom: 'board_room',         spawnX: 8,  spawnZ: 2  },
      { x: 11, z: 15, targetRoom: 'board_room',         spawnX: 8,  spawnZ: 2  },
      // NORTH → Analytics Suite (gap between kitchen x:2-6 and desk x:9-11)
      { x: 8,  z: 0,  targetRoom: 'penthouse_analytics', spawnX: 6,  spawnZ: 6  },
      { x: 9,  z: 0,  targetRoom: 'penthouse_analytics', spawnX: 7,  spawnZ: 6  },
      // EAST → Aquarium Suite
      { x: 21, z: 7,  targetRoom: 'penthouse_aquarium',  spawnX: 1,  spawnZ: 4  },
      { x: 21, z: 8,  targetRoom: 'penthouse_aquarium',  spawnX: 1,  spawnZ: 5  },
      // WEST → Private Lounge
      { x: 0,  z: 10, targetRoom: 'penthouse_bar',       spawnX: 16, spawnZ: 5  },
      { x: 0,  z: 11, targetRoom: 'penthouse_bar',       spawnX: 16, spawnZ: 6  },
    ],
    interactables: [
      { x: 14, z: 2, type: 'algorithm_terminal', dialogId: 'algorithm_terminal' },
    ],
    playerSpawn: { x: 11, z: 13 },
  },

  // ----------------------------------------------------------
  // 16. PENTHOUSE — AQUARIUM SUITE (14×8, east wing)
  // ----------------------------------------------------------
  penthouse_aquarium: {
    id: 'penthouse_aquarium',
    name: 'The Reef & Reel',
    width: 16,
    height: 8,
    floorColor: 0x04081a,
    floorPattern: 'hardwood',
    walls: true,
    lights: [
      { type: 'point', color: 0x0055cc, intensity: 0.9, x: 2,  y: 2.5, z: 4, distance: 8 },
      { type: 'point', color: 0xffeedd, intensity: 0.5, x: 8,  y: 2.5, z: 4, distance: 8 },
      { type: 'point', color: 0x0055cc, intensity: 0.9, x: 13, y: 2.5, z: 4, distance: 8 },
      { type: 'point', color: 0x002266, intensity: 0.4, x: 8,  y: 1.5, z: 6, distance: 10 },
      { type: 'point', color: 0xffcc44, intensity: 0.3, x: 14, y: 1.5, z: 6, distance: 5  },
    ],
    furniture: [
      // Three aquarium panels spanning the north wall (fit in 16-wide room)
      { type: 'aquariumWall', x: 2,  z: 0.1 },
      { type: 'movieScreen',  x: 7,  z: 0.1 },
      { type: 'aquariumWall', x: 12, z: 0.1 },
      // Two couches facing the aquarium (back toward south, seat faces north)
      { type: 'couch', x: 5,  z: 5 },
      { type: 'couch', x: 11, z: 5 },
      // Popcorn popper — back right corner (SE)
      { type: 'popcornPopper', x: 14.5, z: 6.5 },
    ],
    npcs: [],
    exits: [
      // WEST → back to Penthouse
      { x: 0, z: 3, targetRoom: 'penthouse_expanded', spawnX: 20, spawnZ: 7 },
      { x: 0, z: 4, targetRoom: 'penthouse_expanded', spawnX: 20, spawnZ: 8 },
    ],
    interactables: [],
    playerSpawn: { x: 8, z: 6 },
  },

  // ----------------------------------------------------------
  // 17. PENTHOUSE — ANALYTICS SUITE (14×8, north wing)
  // ----------------------------------------------------------
  penthouse_analytics: {
    id: 'penthouse_analytics',
    name: 'Analytics Suite',
    width: 14,
    height: 8,
    floorColor: 0x080510,
    floorPattern: 'hardwood',
    walls: true,
    lights: [
      { type: 'point', color: 0x6622ff, intensity: 0.6, x: 3,  y: 2.5, z: 4, distance: 8 },
      { type: 'point', color: 0x1133aa, intensity: 0.7, x: 7,  y: 3.0, z: 4, distance: 10 },
      { type: 'point', color: 0x6622ff, intensity: 0.6, x: 11, y: 2.5, z: 4, distance: 8 },
      { type: 'point', color: 0x00ff88, intensity: 0.2, x: 7,  y: 1.5, z: 2, distance: 7 },
      { type: 'point', color: 0x002244, intensity: 0.5, x: 7,  y: 2.0, z: 3.5, distance: 6 },
    ],
    furniture: [
      // Mega screen spanning the north wall
      { type: 'megaAnalyticsScreen', x: 7, z: 0.1 },

      // ── Mission Control Arc — 5 stations ─────────────────────────
      // Even 2-unit x-spacing, gentle z-curve, all face north (rotation 0)
      { type: 'missionControlDesk', x:  3.0, z: 3.2 },
      { type: 'missionControlDesk', x:  5.0, z: 3.6 },
      { type: 'missionControlDesk', x:  7.0, z: 3.8 },
      { type: 'missionControlDesk', x:  9.0, z: 3.6 },
      { type: 'missionControlDesk', x: 11.0, z: 3.2 },

      // ── Operator chairs — directly behind each station ────────────
      { type: 'operatorChair', x:  3.0, z: 4.4 },
      { type: 'operatorChair', x:  5.0, z: 4.8 },
      { type: 'operatorChair', x:  7.0, z: 5.0 },
      { type: 'operatorChair', x:  9.0, z: 4.8 },
      { type: 'operatorChair', x: 11.0, z: 4.4 },
    ],
    npcs: [],
    exits: [
      // SOUTH → back to Penthouse
      { x: 6, z: 7, targetRoom: 'penthouse_expanded', spawnX: 8,  spawnZ: 1 },
      { x: 7, z: 7, targetRoom: 'penthouse_expanded', spawnX: 9,  spawnZ: 1 },
    ],
    interactables: [],
    playerSpawn: { x: 7, z: 6 },
  },

  // ----------------------------------------------------------
  // THE QUIET FLOOR — floor 13. The elevator isn't supposed to
  // stop here. Late in the story, at night, it sometimes does.
  // Nothing is wrong. That's what takes getting used to.
  // ----------------------------------------------------------
  floor_13: {
    id: 'floor_13',
    name: 'Floor 13',
    width: 16,
    height: 10,
    floorColor: 0x2e2a33,
    floorPattern: 'carpet',
    walls: true,
    lighting: { ambient: 0x4a4658, ambientIntensity: 0.22, dir: 0x6a6680, dirIntensity: 0.18 },
    lights: [
      // One desk lamp, left on by no one
      { type: 'point', color: 0xffd890, intensity: 0.9, x: 8, y: 1.4, z: 2, distance: 6 },
    ],
    windows: [
      { wall: 'north', x: 8, variant: 'night' },
    ],
    furniture: [
      // Empty desks, sheeted in dust — a floor the org chart forgot
      { type: 'desk', x: 3,  z: 3 }, { type: 'desk', x: 5,  z: 3 },
      { type: 'desk', x: 11, z: 3 }, { type: 'desk', x: 13, z: 3 },
      { type: 'desk', x: 3,  z: 6 }, { type: 'desk', x: 5,  z: 6 },
      { type: 'desk', x: 11, z: 6 }, { type: 'desk', x: 13, z: 6 },
      { type: 'cobweb', x: 0.6, z: 0.6 },
      { type: 'cobweb', x: 15.4, z: 0.6 },
      // The one desk that's awake: a chair facing the window, a monitor on
      { type: 'desk', x: 8, z: 2 },
      { type: 'monitor', x: 8, z: 1.8 },
      { type: 'chair', x: 8, z: 2.9, rotation: 0 },
      // The way back
      { type: 'elevatorDoors', x: 7.5, z: 9.45, rotation: Math.PI, variant: '13' },
    ],
    npcs: [],
    exits: [
      { x: 7, z: 9, targetRoom: 'reception', spawnX: 7, spawnZ: 6, doorStyle: 'none' },
      { x: 8, z: 9, targetRoom: 'reception', spawnX: 7, spawnZ: 6, doorStyle: 'none' },
    ],
    interactables: [
      { x: 8, z: 2, type: 'poster', dialogId: 'floor_13_window' },
    ],
    playerSpawn: { x: 8, z: 8 },
  },

  // ----------------------------------------------------------
  // 18. PENTHOUSE — PRIVATE LOUNGE (18×12, west wing)
  // ----------------------------------------------------------
  penthouse_bar: {
    id: 'penthouse_bar',
    name: 'Private Lounge',
    width: 18,
    height: 12,
    floorColor: 0x0c0610,
    floorPattern: 'hardwood',
    walls: true,
    // Dusk-gold lounge: low warm key so the point-light washes and the neon
    // carry the room. dirIntensity < 0.9 also suppresses the clinical office
    // troffers that were slicing white laser bars across the lounge.
    // S2.5: ambient floor wash dropped ~40% (0.34 -> 0.20) so the hardwood
    // falls toward black BETWEEN the lamp pools — the lounge lamps and neon now
    // carry the light instead of a lifted grey wash filling the whole floor.
    // W / final residuals: dropped again (0.20 -> 0.13 ambient, 0.42 -> 0.32
    // dir) — the mid-floor still read as a "flat milky-grey plateau between the
    // lamp pools." The point-light practicals keep their pools; the uniform lift
    // between them now falls toward black. (Paired with a killed floor-gloss
    // sheen for this room in Engine.applyRoomFX — the gloss band was the milk.)
    lighting: { ambient: 0x4a3630, ambientIntensity: 0.13, dir: 0x8a6446, dirIntensity: 0.32 },
    lights: [
      // Deep purple wash over bar. Tightened (distance 9->5, z 2->1.4) so it
      // hugs the bar instead of throwing a lone violet specular hotspot onto the
      // open mid-floor (the "stray purple glow-dot" round-3 note).
      { type: 'point', color: 0x7700cc, intensity: 0.9, x: 9,  y: 2.5, z: 1.4, distance: 5 },
      // Neon halos (dimmed — the sign's own spill decal now kisses the wall)
      { type: 'point', color: 0xff0088, intensity: 0.5, x: 3,  y: 2.4, z: 1.5, distance: 5 },
      { type: 'point', color: 0xff2a9e, intensity: 0.4, x: 15, y: 2.4, z: 1.5, distance: 5 },
      // Pool table green fill
      { type: 'point', color: 0x33bb44, intensity: 0.4, x: 9,  y: 3,   z: 6,  distance: 6  },
      // Cigar lounge — warm amber glow
      { type: 'point', color: 0xff8833, intensity: 0.6, x: 2.0, y: 2.2, z: 2.2, distance: 5 },
      // Poker table — cool overhead
      { type: 'point', color: 0x99ddaa, intensity: 0.5, x: 15,  y: 2.8, z: 1.8, distance: 6 },
      // West VIP booth — warm amber
      { type: 'point', color: 0xff7722, intensity: 0.55, x: 3, y: 2,   z: 10, distance: 6  },
      // East VIP booth — warm amber
      { type: 'point', color: 0xff7722, intensity: 0.55, x: 15, y: 2,  z: 10, distance: 6  },
      // General dark fill — tightened (dist 18->11, int 0.4->0.26) so the open
      // mid-floor between the pool and poker tables falls toward black instead
      // of holding a lifted flat-grey wash (rider: "flat grey ambient wash").
      { type: 'point', color: 0x180022, intensity: 0.26, x: 9,  y: 1.5, z: 4,  distance: 11 },
    ],
    furniture: [
      // ── Bar — north wall, centered ──────────────────────────
      { type: 'loungeBar', x: 9, z: 0.6 },
      // Warm practical on the bar counter — a low lamp pool so the near-black
      // counter box carries a warm source instead of reading dead (round-3 note).
      { type: 'loungeLamp', x: 11, z: 0.66, y: 1.08 },

      // ── Neon flanking bar ───────────────────────────────────
      // ONE readable "TRUST ISSUES" sign; the second is an abstract magenta
      // seam so readable-text neon is never doubled (round-3 fix c).
      { type: 'neonSign', x: 3,  z: 0.05 },
      { type: 'neonSign', x: 15, z: 0.05, variant: 'seam' },

      // ── Cigar lounge — NW corner ────────────────────────────
      { type: 'humidor',          x: 0.6, z: 2.2, rotation:  Math.PI / 2 },
      { type: 'leatherArmchair',  x: 2.5, z: 1.2, rotation: Math.PI },
      { type: 'leatherArmchair',  x: 2.5, z: 3.2, rotation: 0       },
      { type: 'coffeeTable',      x: 2.0, z: 2.2 },

      // ── Poker table — NE corner ──────────────────────────────
      { type: 'pokerTable', x: 15, z: 1.8 },
      // Warm practical over the poker felt — a low lamp pool so the black poker
      // box in the room's dead middle reads as a lit table (round-3 note).
      { type: 'loungeLamp', x: 15, z: 2.3, y: 0.735 },

      // ── Pool table — centre room ────────────────────────────
      { type: 'poolTable', x: 9, z: 6 },
      // Warm practical on the pool felt — the dead-centre black box was the
      // room's darkest middle mass; a low lamp pool lifts it (round-3 note).
      { type: 'loungeLamp', x: 9, z: 5.55, y: 0.74 },

      // ── West VIP booth — L-shape in SW corner ───────────────
      { type: 'couch', x: 1,   z: 9,    rotation: -Math.PI / 2 }, // west wall, faces east
      { type: 'couch', x: 3,   z: 11                            }, // south wall, faces north
      { type: 'coffeeTable', x: 3,   z: 9.2  },

      // ── East VIP booth — L-shape in SE corner ───────────────
      { type: 'couch', x: 15,  z: 9,    rotation:  Math.PI / 2 }, // east wall, faces west
      { type: 'couch', x: 13,  z: 11                            }, // south wall, faces north
      { type: 'coffeeTable', x: 13,   z: 9.2  },
    ],
    npcs: [],
    exits: [
      // EAST → back to Penthouse
      { x: 17, z: 5, targetRoom: 'penthouse_expanded', spawnX: 1, spawnZ: 10 },
      { x: 17, z: 6, targetRoom: 'penthouse_expanded', spawnX: 1, spawnZ: 11 },
    ],
    interactables: [],
    playerSpawn: { x: 15, z: 6 },
  },

  // ==========================================================
  // ACT 6½ — THE COUNTERSIGNATURE (the city outside)
  // ==========================================================

  // ----------------------------------------------------------
  // C1. FENNIMORE AVENUE — 26x12 outdoor street hub
  // ----------------------------------------------------------
  city_street: {
    id: 'city_street',
    name: 'Fennimore Avenue',
    width: 26,
    height: 12,
    floorColor: 0x6a6e74,  // sidewalk concrete
    walls: false,          // open air — bounded by buildings, not drywall
    lighting: { ambient: 0xffe8c8, ambientIntensity: 0.72, dir: 0xffd8a0, dirIntensity: 0.95 },
    furniture: [
      // Building fronts along the north side (gaps at the records hall
      // door x:5 and Lucky's door x:18)
      { type: 'facadeStrip', x: 0,  z: 0, variant: 5 },
      { type: 'facadeStrip', x: 6,  z: 0, variant: 12 },
      { type: 'facadeStrip', x: 19, z: 0, variant: 7 },
      // Sidewalk curb where the parking lane starts
      { type: 'curb', x: 0, z: 9.4, variant: 26 },
      // Street dressing along the north building line
      { type: 'lamppost', x: 3,  z: 1 },
      { type: 'lamppost', x: 9,  z: 1 },
      { type: 'lamppost', x: 15, z: 1 },
      { type: 'lamppost', x: 21, z: 1 },
      { type: 'hydrant',  x: 6,  z: 1.4 },
      { type: 'newspaperBox', x: 11.6, z: 1.3, variant: 0x2255aa },
      { type: 'newspaperBox', x: 12.2, z: 1.3, variant: 0xcc8822 },
      { type: 'newspaperBox', x: 12.8, z: 1.3, variant: 0xbb2233 },
      { type: 'bench', x: 17, z: 1.4 },
      { type: 'bench', x: 19, z: 1.4 },
      { type: 'busStopSign', x: 20.4, z: 1.3 },
      { type: 'trashCan', x: 16.2, z: 1.4 },
      // Parked cars along the south curb
      { type: 'car', x: 3,  z: 10, rotation: Math.PI / 2 },
      { type: 'car', x: 8,  z: 10, rotation: Math.PI / 2 },
      { type: 'car', x: 13, z: 10, rotation: Math.PI / 2 },
      { type: 'car', x: 18, z: 10, rotation: Math.PI / 2 },
      { type: 'car', x: 23, z: 10, rotation: Math.PI / 2 },
      // A planter or two of civic optimism
      { type: 'plant', x: 7.5, z: 1.4 },
      { type: 'plant', x: 14.2, z: 1.4 },
    ],
    npcs: [
      // Parking Enforcement Officer Reyes — patrols the curb (optional fight)
      { id: 'parking_enforcer', x: 10, z: 8, facing: Math.PI / 2, movement: { type: 'patrol', waypoints: [{ x: 4, z: 8 }, { x: 22, z: 8 }] }, dialogId: 'parking_enforcer_intro', condition: { notFlag: 'meter_war_done' } },
      // The Networking Guy — has a podcast (optional fight)
      { id: 'networking_guy', x: 18, z: 4, facing: Math.PI, movement: { type: 'wander', radius: 2 }, dialogId: 'networking_guy_intro', condition: { notFlag: 'defeated_networking_guy' } },
    ],
    exits: [
      // SOUTH → back into the parking garage
      { x: 12, z: 11, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      { x: 13, z: 11, targetRoom: 'parking_garage', spawnX: 7, spawnZ: 1 },
      // NORTH (west end) → Hall of Records
      { x: 5, z: 0, targetRoom: 'records_hall', spawnX: 9, spawnZ: 12 },
      // NORTH (east end) → Lucky's Diner
      { x: 18, z: 0, targetRoom: 'luckys_diner', spawnX: 6, spawnZ: 7 },
      // EAST → the old branch (The Roastery)
      { x: 25, z: 5, targetRoom: 'old_branch', spawnX: 1, spawnZ: 5 },
      // WEST → the 5:15 crosstown (optional)
      { x: 0, z: 5, targetRoom: 'transit_bus', spawnX: 1, spawnZ: 2 },
    ],
    interactables: [],
    playerSpawn: { x: 12, z: 9 },
  },

  // ----------------------------------------------------------
  // C2. THE 5:15 CROSSTOWN — 12x5 bus interior (optional)
  // ----------------------------------------------------------
  transit_bus: {
    id: 'transit_bus',
    name: 'The 5:15 Crosstown',
    width: 12,
    height: 5,
    floorColor: 0x3a3e44,
    walls: true,
    lighting: { ambient: 0xd8e0e8, ambientIntensity: 0.6, dir: 0xc8d4e0, dirIntensity: 0.6, flicker: true },
    furniture: [
      // Bench seating along both walls
      { type: 'bench', x: 2, z: 0.8 },
      { type: 'bench', x: 4, z: 0.8 },
      { type: 'bench', x: 6, z: 0.8 },
      { type: 'bench', x: 8, z: 0.8 },
      { type: 'bench', x: 2, z: 4.2, rotation: Math.PI },
      { type: 'bench', x: 4, z: 4.2, rotation: Math.PI },
      // Seat 12. The `bus_transfer_ledger` interactable is wedged under it at
      // (6,4) and this bench was missing, so the quest step was an invisible
      // press-E-at-carpet (CLAUDE.md "Quest interactable visibility").
      { type: 'bench', x: 6, z: 4.2, rotation: Math.PI },
      { type: 'bench', x: 8, z: 4.2, rotation: Math.PI },
      // Driver's seat up front
      { type: 'chair', x: 10.5, z: 1, rotation: -Math.PI / 2 },
      { type: 'monitor', x: 11.2, z: 1, rotation: -Math.PI / 2 },
    ],
    npcs: [
      { id: 'bus_driver', x: 10.5, z: 2.2, facing: -Math.PI / 2, dialogId: 'bus_driver_515', interactRange: 1.6 },
    ],
    exits: [
      { x: 0, z: 2, targetRoom: 'city_street', spawnX: 2, spawnZ: 5 },
    ],
    interactables: [
      // The transfer ledger wedged under seat 12 (side quest)
      { x: 6, z: 4, type: 'transfer_ledger', dialogId: 'bus_transfer_ledger', condition: { flag: 'bus515_started' } },
    ],
    playerSpawn: { x: 1, z: 2 },
  },

  // ----------------------------------------------------------
  // C3. HALL OF RECORDS — 18x14, Borges with a queue rope
  // ----------------------------------------------------------
  records_hall: {
    id: 'records_hall',
    name: 'Hall of Records',
    width: 18,
    height: 14,
    floorColor: 0x9a9284,
    floorPattern: 'hardwood',
    walls: true,
    lighting: { ambient: 0xd8cfb8, ambientIntensity: 0.5, dir: 0xe8dfc0, dirIntensity: 0.62 },
    lights: [
      { type: 'point', color: 0xffe8b8, intensity: 1.1, x: 9, y: 3, z: 7, distance: 14 },
    ],
    windows: [
      { wall: 'north', from: 13, to: 16, sky: 'day' },
    ],
    furniture: [
      // The stacks — towering ranks of records (dark wood cabinets)
      { type: 'fileCabinet', variant: 0x4a3a28, x: 1, z: 1 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 2, z: 1 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 3, z: 1 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 4, z: 1 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 5, z: 1 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 1, z: 3 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 2, z: 3 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 3, z: 3 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 4, z: 3 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 5, z: 3 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 1, z: 5 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 2, z: 5 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 3, z: 5 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 4, z: 5 },
      { type: 'fileCabinet', variant: 0x4a3a28, x: 5, z: 5 },
      // Deep stacks (west rear) — optional lore run
      { type: 'fileCabinet', variant: 0x3a2c1e, x: 1, z: 8 },
      { type: 'fileCabinet', variant: 0x3a2c1e, x: 2, z: 8 },
      { type: 'fileCabinet', variant: 0x3a2c1e, x: 1, z: 10 },
      { type: 'fileCabinet', variant: 0x3a2c1e, x: 2, z: 10 },
      { type: 'fileCabinet', variant: 0x3a2c1e, x: 1, z: 12 },
      // The Clerk's desk — center, unavoidable, eternal
      { type: 'receptionDesk', x: 9, z: 6, rotation: Math.PI },
      { type: 'chair', x: 9, z: 5, rotation: 0 },
      { type: 'monitor', x: 9.5, z: 5.7 },
      { type: 'deskPlantSucculent', x: 10.2, z: 5.8 },
      // Queue posts (trash cans standing in as stanchions of bureaucracy)
      { type: 'trashCan', x: 7, z: 9 },
      { type: 'trashCan', x: 9, z: 9 },
      { type: 'trashCan', x: 11, z: 9 },
      // East reading tables
      { type: 'desk', x: 14, z: 4, rotation: 0 },
      { type: 'chair', x: 14, z: 5, rotation: Math.PI },
      { type: 'desk', x: 14, z: 9, rotation: 0 },
      { type: 'chair', x: 14, z: 10, rotation: Math.PI },
      // Clear of the north window (13-16) and the stacks (S5-P6).
      // Decoration, NOT a poster — it never had a `poster` interactable, and a
      // motivationalPoster the player cannot read is a false affordance. Same
      // ruling as the two cubicle-farm north-wall pieces.
      { type: 'abstractPainting', x: 11, z: 0.1 },
    ],
    npcs: [
      // Chair (9,5) r=0 seats SOUTH — over the desk at z=6 and down the queue
      // that enters at z=13. The clerk was the one turned away from both.
      { id: 'records_clerk', x: 9, z: 5, facing: 0, sitting: true, dialogId: 'records_clerk_form11c', interactRange: 2.0 },
    ],
    exits: [
      { x: 9, z: 13, targetRoom: 'city_street', spawnX: 5, spawnZ: 1 },
      { x: 10, z: 13, targetRoom: 'city_street', spawnX: 5, spawnZ: 1 },
    ],
    interactables: [
      // Deep stacks: the 1947 founding file (optional, after Form 11-C)
      { x: 1, z: 11, type: 'deep_stacks', dialogId: 'deep_stacks_file', condition: { flag: 'form_11c_done' } },
    ],
    playerSpawn: { x: 9, z: 12 },
  },

  // ----------------------------------------------------------
  // C4. LUCKY'S DINER — 12x8, warm, booth 4 is the important one
  // ----------------------------------------------------------
  luckys_diner: {
    id: 'luckys_diner',
    name: "Lucky's",
    width: 12,
    height: 8,
    floorColor: 0xc8b89a,
    walls: true,
    lighting: { ambient: 0xffe2b8, ambientIntensity: 0.66, dir: 0xffd8a8, dirIntensity: 0.72 },
    windows: [
      { wall: 'north', from: 1, to: 3, sky: 'day' },
    ],
    furniture: [
      // Counter along the north wall with stools (lounge bar repurposed)
      { type: 'loungeBar', x: 7.5, z: 0.8, rotation: 0 },
      // Booths along the west wall
      { type: 'dinerBooth', x: 1.4, z: 2, rotation: Math.PI / 2 },
      { type: 'dinerBooth', x: 1.4, z: 4, rotation: Math.PI / 2 },
      { type: 'dinerBooth', x: 1.4, z: 6, rotation: Math.PI / 2 },  // booth 4. yes, the third one. ask Delia.
      // South booths
      { type: 'dinerBooth', x: 5, z: 6.4 },
      { type: 'dinerBooth', x: 8, z: 6.4 },
      // Pie case (fridge standing in, proudly)
      { type: 'fridge', x: 11, z: 1 },
      { type: 'coffeeMachine', x: 10, z: 0.8 },
    ],
    npcs: [
      // Delia Okafor, booth 4, holding court. ON the north bench: the booth at
      // (1.4,6) r=PI/2 puts its two benches at local x +/-0.61, i.e. world
      // (1.4, 5.39) and (1.4, 6.61), and an occupant faces ACROSS the table,
      // not along the booth. She was 1.0 tiles out in the aisle facing down it.
      { id: 'delia', x: 1.4, z: 5.39, facing: 0, sitting: true, dialogId: 'delia_booth4', interactRange: 2.2, condition: { notFlag: 'delia_moved' } },
      // The counter regular. Was at (6, 1.8) — tile (6,1), inside the
      // loungeBar's own 5x1 blocked footprint, i.e. standing on the STAFF side
      // of the counter. Moved to the customer side, lined up with the stool at
      // local x -1.4 (world 6.1). NOT `sitting`: CharacterAnimator's SEAT_Y is
      // 0.44 (a chair) and this bar's stool seats are at 0.745, so seating him
      // would bury his hips 0.3 m inside the stool.
      { id: 'diner_regular', x: 6.1, z: 2.0, facing: 0, dialogId: 'diner_regular_chat' },
    ],
    exits: [
      { x: 6, z: 7, targetRoom: 'city_street', spawnX: 18, spawnZ: 1 },
    ],
    interactables: [],
    playerSpawn: { x: 6, z: 6 },
  },

  // ----------------------------------------------------------
  // C5. THE ROASTERY (née VAULTS FARGO No. 1) — 14x10
  // ----------------------------------------------------------
  old_branch: {
    id: 'old_branch',
    name: 'The Roastery',
    width: 14,
    height: 10,
    floorColor: 0xb8a488,
    floorPattern: 'hardwood',
    walls: true,
    lighting: { ambient: 0xffd8b0, ambientIntensity: 0.6, dir: 0xffc898, dirIntensity: 0.68 },
    windows: [
      { wall: 'north', from: 8, to: 11, sky: 'day' },
    ],
    furniture: [
      // Espresso bar where the teller line used to be
      { type: 'loungeBar', x: 4, z: 1, rotation: 0 },
      { type: 'coffeeMachine', x: 2, z: 0.8 },
      { type: 'coffeeMachine', x: 6, z: 0.8 },
      // 1947 marble: grand painting + the old teller window frames
      { type: 'grandPainting', x: 12.5, z: 0.4 },
      // Cafe tables (desks + chairs in casual arrangement)
      { type: 'coffeeTable', x: 3, z: 5 },
      { type: 'chair', x: 3, z: 6, rotation: Math.PI },
      { type: 'chair', x: 3, z: 4, rotation: 0 },
      { type: 'coffeeTable', x: 7, z: 5.5 },
      { type: 'chair', x: 7, z: 6.5, rotation: Math.PI },
      { type: 'coffeeTable', x: 10, z: 4 },
      { type: 'chair', x: 10, z: 5, rotation: Math.PI },
      { type: 'leatherArmchair', x: 11.5, z: 7, rotation: -Math.PI / 2 },
      { type: 'plant', x: 0.8, z: 8.8 },
      { type: 'plant', x: 13, z: 8.8 },
    ],
    npcs: [
      // The barista who knows about the basement
      { id: 'barista', x: 4, z: 2.2, facing: Math.PI, dialogId: 'barista_vault', interactRange: 1.8 },
      // Delia relocates here once she decides to get the seal
      { id: 'delia', x: 11.5, z: 6, facing: -Math.PI / 2, dialogId: 'delia_roastery', condition: { flag: 'delia_moved', notFlag: 'has_recorder_seal' } },
      // ...and returns for the epilogue once the charter is certified —
      // delia_epilogue was orphaned without this entry (#20)
      { id: 'delia', x: 11.5, z: 6, facing: -Math.PI / 2, dialogId: 'delia_epilogue', condition: { flag: 'charter_certified' } },
    ],
    exits: [
      { x: 0, z: 5, targetRoom: 'city_street', spawnX: 24, spawnZ: 5 },
      // Basement stairs (behind the bar, gated by the barista dialog)
      { x: 13, z: 9, targetRoom: 'old_vault', spawnX: 1, spawnZ: 1 },
    ],
    interactables: [],
    playerSpawn: { x: 1, z: 5 },
  },

  // ----------------------------------------------------------
  // C6. THE FIRST VAULT — 8x8, 1947 marble, box 0001
  // ----------------------------------------------------------
  old_vault: {
    id: 'old_vault',
    name: 'The First Vault',
    width: 8,
    height: 8,
    floorColor: 0x8a8278,
    walls: true,
    lighting: { ambient: 0xc8b89a, ambientIntensity: 0.42, dir: 0xd8c8a8, dirIntensity: 0.5 },
    lights: [
      { type: 'point', color: 0xffd890, intensity: 1.2, x: 4, y: 2.4, z: 4, distance: 9 },
    ],
    furniture: [
      // The original deposit boxes — 1947 ironwork
      { type: 'lockbox', x: 0.875, z: 0.2, rotation: 0, variant: 1.75 },
      { type: 'lockbox', x: 2.625, z: 0.2, rotation: 0, variant: 1.75 },
      { type: 'lockbox', x: 4.375, z: 0.2, rotation: 0, variant: 1.75 },
      { type: 'lockbox', x: 6.125, z: 0.2, rotation: 0, variant: 1.75 },
      { type: 'lockbox', x: 7.36, z: 0.875, rotation: -Math.PI / 2, variant: 1.75 },
      { type: 'lockbox', x: 7.36, z: 2.625, rotation: -Math.PI / 2, variant: 1.75 },
      // Roastery storage creeping in — the present invading the past
      { type: 'fileCabinet', variant: 0x6a5238, x: 1, z: 6.8 },
      { type: 'fileCabinet', variant: 0x6a5238, x: 2, z: 6.8 },
      { type: 'popcornPopper', x: 6.5, z: 6.5 },
      { type: 'cobweb', x: 7.4, z: 0.6 },
    ],
    npcs: [
      // The Firm waits at the foot of the stairs until beaten — without
      // this, losing the ambush (or aborting it) would seal the charter
      // chain forever
      { id: 'firm_partner', x: 2, z: 4, facing: Math.PI, dialogId: 'the_firm_retry', condition: { flag: 'has_recorder_seal', notFlag: 'defeated_the_firm' } },
    ],
    exits: [
      { x: 0, z: 1, targetRoom: 'old_branch', spawnX: 12, spawnZ: 8 },
    ],
    interactables: [
      // Box 0001 — Delia's seal, oiled and waiting since 2009
      { x: 4, z: 1, type: 'box_0001', dialogId: 'vault_box_0001' },
    ],
    marks: {
      stairs: [0.8, 1.4],   // the foot of the stairs (the room's only door)
      firm_a: [1.7, 2.5],   // formation, three abreast facing the boxes
      firm_b: [2.7, 3.3],
      firm_c: [1.7, 4.1],
      boxes:  [4, 1.7],
    },
    playerSpawn: { x: 1, z: 1 },
  },
};

// Quick-access helpers
export const ROOM_IDS = Object.keys(ROOMS);
export const getRoomData = (id) => ROOMS[id] || null;
