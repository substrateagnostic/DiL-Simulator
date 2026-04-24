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
  ross_office: [
    "Seven leadership books. A motivational calendar. A stress ball shaped like a dollar sign. This explains everything.",
    "There's a family photo on his desk. He looks... happy. Human, even.",
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
};

// Story-triggered thoughts (fire based on flags, not rooms)
export const STORY_THOUGHTS = {
  act2_complete: "The lights flickered. The building noticed. I noticed the building noticing.",
  has_charter: "This piece of paper is seventy-seven years old and it has more integrity than the entire C-suite.",
  has_rolex: "The Janitor's watch hums against my palm. It's not telling time. It's telling me something else entirely.",
  act5_complete: "Rachel is gone but the building is still humming. There's something upstairs. Something that thinks trust is a bug, not a feature.",
  ross_speech_ready: "Ross is going to be sincere. In public. The apocalypse has officially begun.",
  grandma_ally: "Grandma Henderson brought cookies to a corporate restructuring. This is either the bravest or the most Midwestern thing I've ever seen.",
  algorithm_defeated: "I told a computer that trust matters. And I meant it. And it broke.",
};
