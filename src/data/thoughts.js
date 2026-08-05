// Andrew's inner monologue — room-specific thoughts that fire on first visit
// or during key story moments. These make Andrew feel like a person.

export const ROOM_THOUGHTS = {
  cubicle_farm: [
    "Forty cubicles. Forty people who chose beige as a lifestyle.",
    "My desk is somewhere in here. It has a plant. The plant is dying. We have that in common.",
  ],
  break_room: [
    "The microwave still has someone's fish from last Tuesday. The smell has evolved sentience.",
    "There's a motivational poster about teamwork. The frame is crooked. Nobody has fixed it in three years.",
  ],
  conference_room: [
    "This room has seen more broken promises than a Las Vegas chapel.",
    "The whiteboard still has someone's Q2 projections. They were wildly optimistic.",
  ],
  reception: [
    "The waiting area smells like anxiety and old magazines. Home sweet home.",
    "Every client who walks through that door is someone's retirement, someone's future, someone's trust.",
  ],
  skip_office: [
    "Seven leadership books. A motivational calendar. A stress ball shaped like a dollar sign. This explains everything.",
    "There's a family photo on his desk. He looks... happy. Human, even.",
  ],
  // The renovated corner office loads as its own room id (_resolveRoomId), so it
  // needs its own key — otherwise buying the renovation silently deletes the
  // room's inner monologue.
  skip_office_large: [
    "The office got bigger. Same man, more square footage. The stress ball has a globe now.",
    "Real paintings on the wall. He kept the motivational posters too — moved them behind the door where clients won't see them.",
    "There's a family photo on his desk. Bigger frame. Same photo.",
  ],
  server_room: [
    "The hum of a thousand transactions. Each one a promise kept or broken.",
    "It's cold in here. The servers don't care about comfort. Neither does the building.",
  ],
  executive_floor: [
    "The carpet up here is nicer. The lies are too.",
    "You can see the whole city from these windows. Makes you wonder who's watching us.",
  ],
  parking_garage: [
    "Concrete and fluorescent lights. The building's subconscious.",
    "Someone left a Vaults Fargo bumper sticker on a Porsche. Peak irony.",
  ],
  stairwell: [
    "The graffiti changes every time I look. Or maybe I'm just paying attention now.",
    "These stairs have heard every whispered complaint this building has ever produced.",
  ],
  archive: [
    "Dust motes float in the light like tiny ghosts of documents past.",
    "Every cabinet in here is a promise someone made to someone else. Some of them were even kept.",
  ],
  hr_department: [
    "HR: where good intentions go to be filed in triplicate.",
    "There's a suggestion box. It's padlocked. That's either ironic or strategic.",
  ],
  vault: [
    "The air is different down here. Heavier. Like the weight of every trust ever placed in these walls.",
    "Safe deposit boxes, each one holding someone's definition of 'important.'",
  ],
  board_room: [
    "The chairs are leather. The table is mahogany. The decisions made here are neither.",
    "This is where they decide who matters. I'm going to change the criteria.",
  ],
  penthouse: [
    "The top floor. Where numbers replace names and efficiency replaces empathy.",
    "The Algorithm lives here. It's watching. Calculating. Missing the point entirely.",
  ],
  penthouse_expanded: [
    "I used to watch this floor from the lobby. Now I own the coffee machine up here.",
    "The view hasn't changed. I have.",
  ],
  penthouse_aquarium: [
    "An aquarium and a movie screen. Someone had very specific needs and I respect that.",
    "The fish don't know what a trust officer is. Lucky them.",
  ],
  penthouse_analytics: [
    "Five screens. Zero ambiguity. This is what accountability looks like when you can afford the electricity.",
    "The data doesn't lie. Neither do I. We'll get along fine.",
  ],
  penthouse_bar: [
    "Somewhere, a compliance manual is spinning in its binder.",
    "This is either a reward or a liability. Possibly both.",
  ],

  // ── Act 6½ — the city chapter. Andrew leaves the building for the first
  // time in the game. These six rooms shipped with no ROOM_THOUGHTS key at
  // all, so the only chapter that happens outdoors was also the only chapter
  // Andrew never thought a word in (F-3a). `floor_13` stays deliberately
  // silent — the quiet floor is quiet.
  city_street: [
    "Unfiltered sunlight. I'd forgotten it came without a ceiling.",
    "A man in a quarter-zip is making eye contact from the bus stop. He has a podcast. I'm certain of it.",
  ],
  transit_bus: [
    "Bench seats worn smooth by ten thousand commutes. The driver hasn't looked surprised since 1994.",
    "Someone has corrected the route map in marker four times. Better version control than our trust amendments.",
  ],
  records_hall: [
    "Filing cabinets in ranks from floor to ceiling. This is what the archive wants to be when it grows up.",
    "I need Form 11-C. The sign says to first file a 7-B requesting the 11-C request form.",
  ],
  luckys_diner: [
    "Six pies in the case and a gap where a seventh used to be. Somebody got here first.",
    "Coffee in actual ceramic mugs. No branding. No lid. I'd forgotten this was an option.",
  ],
  old_branch: [
    "They put the espresso machine where the teller line was. The 1947 marble is doing its best not to judge.",
    "Cafe tables where the deposit slips used to be. The vault downstairs probably holds oat milk now.",
  ],
  old_vault: [
    "Deposit box 0001 is six feet from a popcorn popper. The twentieth century did not plan for this.",
    "One warm bulb and seventy-odd years of deposit boxes. Nobody comes down here on purpose anymore.",
  ],
};

// ── Act-keyed room lines (F-3c) ──────────────────────────────────────────────
// `ROOM_THOUGHTS` above is a FIRST-VISIT latch: once `thought_<roomId>` is set
// the room never speaks again, which is why the hub the player crosses four
// hundred times has exactly two lines in it. This table is the other axis.
//
// Shape: `{ roomId: { <actIndex>: [lines] } }`. A line fires once per
// (room, act) on ANY visit — including the four-hundredth — under its own flag
// namespace `thought_<roomId>_a<act>`. Never reuse `thought_<roomId>`; that is
// the first-visit latch and overloading it would silence one of the two.
//
// Acts are the DERIVED act index (`player.actIndex`), not a flag. Act 3 is the
// window where Andrew knows the restructuring is coming and nobody else does;
// act 6 is after the charter has been read aloud and the department has
// survived. Those are the two acts where the same room means something new.
// A line may be a bare string, or `{ text, flag }` / `{ text, notFlag }` when it
// asserts something the player might not have seen yet. (The stairwell's act-6
// graffiti names Floor 13; a player who never took the elevator detour would be
// read a punchline about a room they have not been in.)
export const ROOM_THOUGHTS_BY_ACT = {
  cubicle_farm: {
    3: ["Forty people typing trust amendments for a department someone on fourteen has already reclassified as overhead."],
    6: ["My plant has a new leaf. Nobody's mentioned what happened and I think that's how we're handling it."],
  },
  break_room: {
    3: ["The poster is still crooked and the fish is still in the microwave. Upstairs there's a charter from 1947 nobody's read, and down here we can't straighten a poster."],
    6: ["Someone finally cleaned the microwave. The poster is still crooked, which at this point counts as structural integrity."],
  },
  reception: {
    3: ["Same magazines on the table. Diane is watering the fern like it's any other Tuesday, and from where she's standing it is."],
    6: ["Diane rearranged the lobby chairs. Fourth time. Same magazines, though — she's not a miracle worker."],
  },
  conference_room: {
    3: ["Same Q2 projections on the whiteboard. They were wrong in April. They're considerably more wrong now, for reasons nobody in this room had clearance to imagine."],
    6: ["Someone erased the whiteboard. First time since April. Room seats eight and I've been ambushed from at least half of them."],
  },
  executive_floor: {
    3: ["The carpet up here costs more per square foot than my dental plan. Four motivational posters about integrity. On this floor."],
    6: ["Same expensive carpet. The motivational posters are still up. Meredith Sterling is not. Net improvement."],
  },
  stairwell: {
    3: ["New graffiti on the landing. The stairwell has more to say about this company than the quarterly report."],
    6: [{
      // Only for a player who actually rode down to 13 — the joke is the tense.
      text: "Someone wrote FLOOR 13 DOESN'T EXIST on the wall. They weren't wrong at the time.",
      flag: 'floor_13_found',
    }],
  },
};

// Story-triggered thoughts (fire based on flags, not rooms)
export const STORY_THOUGHTS = {
  act2_complete: "The lights flickered. The building noticed. I noticed the building noticing.",
  has_charter: "This piece of paper is seventy-seven years old and it has more integrity than the entire C-suite.",
  has_rolex: "The Janitor's watch hums against my palm. It's not telling time. It's telling me something else entirely.",
  act5_complete: "Meredith is gone but the building is still humming. There's something upstairs. Something that thinks trust is a bug, not a feature.",
  skip_speech_ready: "Skip is going to be sincere. In public. The apocalypse has officially begun.",
  grandma_ally: "Grandma Henderson brought cookies to a corporate restructuring. This is either the bravest or the most Midwestern thing I've ever seen.",
  algorithm_defeated: "I told a computer that trust matters. And I meant it. And it broke.",
  // Name the Pattern (proposal 3). The 4% whisper monitor stops being noise the
  // first time Andrew stands next to one — set by ExplorationState._checkWhisperMonitor.
  whisper_monitor_seen: "A monitor is showing nothing but the word REMEMBERED. Probably a screensaver. Almost certainly a screensaver.",
  // The printer's real payoff: the building has been keeping its own archive.
  // Keyed to Network Ghost completion (the archive reveal, dialogs `alex_printer_quest`),
  // NOT `printer_quest_done` — that is the Act-1/2 toner fetch, which fires acts
  // before Andrew has heard of a port or an archive.
  quest_network_ghost_complete: "The most reliable employee in this building was plugged into the wrong port the entire time.",

  // ── Renovation acknowledgements (F-6) ──────────────────────────────────
  // `grep renovation_ src/data/thoughts.js src/data/dialogs/index.js` returned
  // ZERO hits across all nine renovations: the player spent up to 10,000,000
  // AUM, the room silently changed, and nobody in the game said a word. These
  // fire off the purchase flag ShopState already sets, through the same
  // STORY_THOUGHTS path every other flag thought uses — no new plumbing.
  // Andrew paid for these himself, client by client, in a building that spent
  // seven acts calling people overhead.
  renovation_espresso_bar: "The drip maker is gone. I don't know what a cortado is, but I'm apparently buying forty of them a day now.",
  renovation_catering_fridge: "Commercial glass-door fridge. The old one is gone, and with it whatever was evolving behind Diane's yogurt.",
  renovation_ergonomic_workstations: "Second monitor and a real chair for every desk. The old chairs were from 2003. Some of them remembered having upholstery.",
  renovation_projection_wall: "Five smart boards where the whiteboard was. Those Q2 projections lasted longer than most of the people who wrote them.",
  renovation_corner_office: "Skip's corner office. Twice the square footage, same volume of Skip Hartley.",
  renovation_penthouse: "Ten million dollars. Two reef tanks taller than I am, a pool table, a cinema wall, and five analytics stations. I signed the purchase order with a ballpoint from a compliance seminar.",
};
