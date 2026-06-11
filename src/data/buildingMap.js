// The canonical Vaults Fargo tower — every interior room's floor number
// and position on the shared 28×20 floor plate. This is what makes the
// ghost shell read as ONE building you move through, not a new tower
// imagined around each room.
//
// offsetX/offsetZ: where the room's tile (0,0) sits on the plate.
// Rooms absent from this map (the Act 6½ city, which is other buildings)
// get no shell — they use street-level mode instead.
//
// Floor logic: garage at ground, reception above it, the department on 6
// (Janet's "welcome to the sixth floor"), HR mid-tower, executives near
// the top, penthouse at 23. The archive and vault are BELOW GROUND —
// the building keeps its memory in the basement, which tracks.

export const PLATE = { w: 28, d: 20 };
export const TOP_FLOOR = 23;

export const BUILDING_MAP = {
  parking_garage:      { floor: 0,  offsetX: 7,  offsetZ: 5 },
  reception:           { floor: 1,  offsetX: 7,  offsetZ: 6 },

  // Floor 6 — the Trust Department
  cubicle_farm:        { floor: 6,  offsetX: 4,  offsetZ: 2 },
  break_room:          { floor: 6,  offsetX: 0,  offsetZ: 4 },
  server_room:         { floor: 6,  offsetX: 20, offsetZ: 5 },
  ross_office:         { floor: 6,  offsetX: 10, offsetZ: 0 },
  ross_office_large:   { floor: 6,  offsetX: 9,  offsetZ: 0 },
  conference_room:     { floor: 6,  offsetX: 16, offsetZ: 0 },

  hr_department:       { floor: 9,  offsetX: 6,  offsetZ: 5 },
  floor_13:            { floor: 13, offsetX: 6,  offsetZ: 5 },

  // The connector shaft (spans B2–6; rendered mid-shaft)
  stairwell:           { floor: 2,  offsetX: 0,  offsetZ: 0 },

  // The top of the building. Exec floor and board room each own their
  // whole storey and sit AGAINST the plate edge — their dusk windows
  // (north / west respectively) face real sky, not interior partitions
  // (S5-P6 fixtures pass).
  executive_floor:     { floor: 21, offsetX: 6,  offsetZ: 0 },
  board_room:          { floor: 22, offsetX: 0,  offsetZ: 4 },
  penthouse:           { floor: 23, offsetX: 6,  offsetZ: 4 },
  penthouse_expanded:  { floor: 23, offsetX: 3,  offsetZ: 2 },
  penthouse_aquarium:  { floor: 23, offsetX: 10, offsetZ: 0 },
  penthouse_analytics: { floor: 23, offsetX: 7,  offsetZ: 0 },
  penthouse_bar:       { floor: 23, offsetX: 0,  offsetZ: 2 },

  // Below ground — where the building keeps what it doesn't discuss
  archive:             { floor: -2, offsetX: 8,  offsetZ: 5 },
  vault:               { floor: -3, offsetX: 20, offsetZ: 6 },
};
