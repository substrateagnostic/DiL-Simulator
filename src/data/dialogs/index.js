// ============================================================================
// TRUST ISSUES: A Wells Fargo Simulator -- All Dialog Trees
// ============================================================================
// Node types:
//   { type: 'text', speaker, text }
//   { type: 'choice', speaker, text, choices: [{ text, next, flag?, flagValue? }] }
//   { type: 'condition', flag, ifTrue, ifFalse }
//   { type: 'action', action, ...params, next }
//   { type: 'end' }
//
// Nodes auto-advance to next index unless a 'next' field redirects.
// Choice 'next' values are absolute indices within the dialog array.
// ============================================================================

export const DIALOGS = {

  // --------------------------------------------------------------------------
  // RECEPTIONIST INTRO — plays once on first entry to reception
  // --------------------------------------------------------------------------
  receptionist_intro: [
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Oh! You must be the new hire. Andrew, right?" },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "I'm Diane. I run the front desk. Welcome to Wells Fargo. Please don't touch the orchid." },
    { type: 'text', speaker: 'Andrew', text: "...There's no orchid." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Exactly. Chad killed it. The point stands." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "HR asked me to give you this." },
    { type: 'action', action: 'give_item', itemId: 'coffee_large', quantity: 1, next: 6 },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "It's a large coffee. You'll want it. Trust me." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Your desk is on the cubicle floor. Through the north door, up the stairs. Well — there are no stairs. Through the north door." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Your manager is Alex. He'll brief you. Don't be late." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Oh, and keep your badge visible at all times. Alex gets... particular about that." },
    { type: 'text', speaker: 'Andrew', text: "What does a Seasonal Compliance Associate even do?" },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "..." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Good luck, Andrew." },
    { type: 'action', action: 'set_flag', flag: 'reception_intro_done', next: 14 },
    { type: 'end' },
  ],

  // ==========================================================================
  // ACT 1 -- INTRODUCTION NPCs
  // ==========================================================================

  // --------------------------------------------------------------------------
  // JANET -- The wine-tumbler-wielding trust officer
  // --------------------------------------------------------------------------
  janet_intro: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: 'Oh! You must be the new trust officer.' },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "I'm Janet. I handle the... *sip* ...smaller accounts. The ones where nobody's fighting. So, like, three of them." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "Welcome to the sixth floor. We call it 'The Trust Fall.' Because everyone here is one bad meeting away from falling apart." },
    /* 3  */ { type: 'choice', speaker: 'Janet', text: 'Anyway -- what can I help you with, hon?', choices: [
      { text: "What's in the tumbler?", next: 4 },
      { text: 'Any tips for surviving here?', next: 8 },
      { text: "Who's who around the office?", next: 13 },
    ]},
    /* 4  */ { type: 'text', speaker: 'Janet', text: "This? It's... kombucha." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: 'At 9:30 AM?' },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "It's fermented. That's the POINT of kombucha. Don't make it weird." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: '*extremely long sip*' },
    /* 8  */ { type: 'text', speaker: 'Janet', text: "Oh sweetie. Okay. Number one: never eat anything from the break room fridge. The notes in there have gotten... hostile." },
    /* 9  */ { type: 'text', speaker: 'Janet', text: "Number two: if the printer starts making noises, just walk away. We've had three repair techs quit this year." },
    /* 10 */ { type: 'text', speaker: 'Janet', text: "Number three: Alex will use the word 'synergy' at least fourteen times before lunch. Don't drink every time or you'll end up like me." },
    /* 11 */ { type: 'text', speaker: 'Janet', text: "*looks at tumbler* ...Successful. You'll end up successful like me." },
    /* 12 */ { type: 'text', speaker: 'Janet', text: "Oh, and someone's been stealing lunches from the fridge. My money's on Dave, but the Janitor says it's 'an inside job.' Whatever that means." },
    /* 13 */ { type: 'text', speaker: 'Janet', text: "Let's see... Alex is your boss. He's... enthusiastic. He once described a simple trust amendment as 'a paradigm-shifting leverage event.'" },
    /* 14 */ { type: 'text', speaker: 'Janet', text: "Dave from IT lives in the server room. I'm not sure he has a home. He speaks entirely in acronyms." },
    /* 15 */ { type: 'text', speaker: 'Janet', text: "The Intern... bless his heart. He's been here three months and still thinks fiduciary duty is a type of military service." },
    /* 16 */ { type: 'text', speaker: 'Janet', text: "Monica at reception is the only competent person in this building. If you need anything actually done, talk to her." },
    /* 17 */ { type: 'text', speaker: 'Janet', text: "And then there's the Janitor. He wears a gold Rolex and gives financial advice while mopping. Nobody asks questions." },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'met_janet', value: true, next: 19 },
    /* 19 */ { type: 'text', speaker: 'Janet', text: "Anyway, good luck with the Henderson case. You're going to need it. Those people make Thanksgiving look like a contact sport." },
    /* 20 */ { type: 'text', speaker: 'Janet', text: '*sip*' },
    /* 21 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // DAVE FROM IT
  // --------------------------------------------------------------------------
  dave_intro: [
    /* 0  */ { type: 'text', speaker: 'Dave from IT', text: 'Yo. New guy. You touch any of the legacy systems yet?' },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: 'I just started tod--' },
    /* 2  */ { type: 'text', speaker: 'Dave from IT', text: "Good. Don't. The VPN's running on what I'm pretty sure is a modified TI-84 calculator from 2003." },
    /* 3  */ { type: 'text', speaker: 'Dave from IT', text: "I'm Dave. IT department. Well, I AM the IT department. Had a team once. They all 'transferred.' That's corporate for 'fled.'" },
    /* 4  */ { type: 'choice', speaker: 'Dave from IT', text: "So what's your deal? Trust officer? That's rough, man.", choices: [
      { text: 'What happened to the IT team?', next: 5 },
      { text: "What's in the server room?", next: 9 },
      { text: 'Any tech I should know about?', next: 14 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Dave from IT', text: "They said it was 'restructuring.' I say it was the Server Room Incident of 2024." },
    /* 6  */ { type: 'text', speaker: 'Dave from IT', text: "I'm not legally allowed to discuss it. NDA. Also a restraining order from the server rack in Row C." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: 'A restraining order from a server rack?' },
    /* 8  */ { type: 'text', speaker: 'Dave from IT', text: "It's a legal gray area. Like most things at this company." },
    /* 9  */ { type: 'text', speaker: 'Dave from IT', text: 'The server room? Oh man...' },
    /* 10 */ { type: 'text', speaker: 'Dave from IT', text: "Okay look. Officially, it houses our document management system and the trust accounting database. SSL certificates. Normal stuff." },
    /* 11 */ { type: 'text', speaker: 'Dave from IT', text: "Unofficially... there's a partition I found that's been running since 2016. It's encrypted with something I've never seen before." },
    /* 12 */ { type: 'text', speaker: 'Dave from IT', text: "Every night at 3:47 AM it sends a packet to an IP address that traces back to a P.O. box in the Cayman Islands." },
    /* 13 */ { type: 'text', speaker: 'Dave from IT', text: 'But that\'s probably nothing. Right? ...Right?' },
    /* 14 */ { type: 'text', speaker: 'Dave from IT', text: "Your workstation password is 'password123.' I know because everyone's password is 'password123.'" },
    /* 15 */ { type: 'text', speaker: 'Dave from IT', text: "The document management system crashes every Tuesday at 2 PM. Nobody knows why. I've stopped looking into it because every time I do, my access gets revoked for 24 hours." },
    /* 16 */ { type: 'text', speaker: 'Dave from IT', text: "Also, the VOIP phones record everything. I mean, they're NOT supposed to. But the red light stays on even when you hang up." },
    /* 17 */ { type: 'text', speaker: 'Dave from IT', text: "I unplugged mine in 2022. I communicate exclusively through Slack messages and aggressive eye contact." },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'met_dave', value: true, next: 19 },
    /* 19 */ { type: 'text', speaker: 'Dave from IT', text: "Anyway, if your computer does anything weird -- and it will -- just restart it three times, slap the left side of the monitor, and say 'please.' In that order." },
    /* 20 */ { type: 'text', speaker: 'Dave from IT', text: "The 'please' is important. These machines run on spite and desperation." },
    /* 21 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // THE INTERN
  // --------------------------------------------------------------------------
  intern_intro: [
    /* 0  */ { type: 'text', speaker: 'The Intern', text: "Oh hey! You're the new guy! Austin, right?" },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: 'Andrew.' },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "Right, right, Arnold. Sorry, I'm terrible with names." },
    /* 3  */ { type: 'text', speaker: 'The Intern', text: "I'm the intern! Well, I was the intern. Now I'm the 'Trust Operations Support Specialist.' Same pay though." },
    /* 4  */ { type: 'text', speaker: 'The Intern', text: 'Which is zero. The pay is zero.' },
    /* 5  */ { type: 'choice', speaker: 'The Intern', text: "Hey, you're not with Compliance, are you?", choices: [
      { text: 'No, why?', next: 6 },
      { text: 'What if I am?', next: 11 },
    ]},
    /* 6  */ { type: 'text', speaker: 'The Intern', text: 'Oh thank God. Because I was JUST shredding some documents and--' },
    /* 7  */ { type: 'text', speaker: 'The Intern', text: "Wait. I mean. I was FILING some documents. In the shredder. Which is where we file things we're done with." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "That's... not what a shredder is for." },
    /* 9  */ { type: 'text', speaker: 'The Intern', text: "Alex said to 'make the Henderson pre-audit documents disappear.' I assumed he meant magically but the budget didn't cover a magician so..." },
    /* 10 */ { type: 'text', speaker: 'The Intern', text: "Anyway! If anyone asks, I was photocopying. For three hours. Both sides." },
    /* 11 */ { type: 'text', speaker: 'The Intern', text: "I mean-- the shredding was... it was already shredded when I got here. Pre-shredded documents. It's a new system." },
    /* 12 */ { type: 'text', speaker: 'The Intern', text: 'We call it... Proactive Document Lifecycle Management.' },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: '...' },
    /* 14 */ { type: 'text', speaker: 'The Intern', text: "Please don't tell Alex I told you about the Henderson thing. He already made me reorganize the supply closet by 'emotional resonance.'" },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'met_intern', value: true, next: 16 },
    /* 16 */ { type: 'action', action: 'set_flag', flag: 'knows_shredding', value: true, next: 17 },
    /* 17 */ { type: 'text', speaker: 'The Intern', text: "Oh! I almost forgot. Alex said to tell you the Henderson meeting is 'mission critical.' He said those words while doing finger guns." },
    /* 18 */ { type: 'text', speaker: 'The Intern', text: 'Good luck, Adam!' },
    /* 19 */ { type: 'text', speaker: 'Andrew', text: 'Andrew.' },
    /* 20 */ { type: 'text', speaker: 'The Intern', text: "That's what I said!" },
    /* 21 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ALEX -- Your boss. The briefing.
  // --------------------------------------------------------------------------
  alex_intro: [
    /* 0  */ { type: 'text', speaker: 'Alex', text: 'Andrew! My man! Come in, come in. Close the door. Actually, leave it open. Actually, close it halfway. Power move.' },
    /* 1  */ { type: 'text', speaker: 'Alex', text: "So. The Henderson Trust. This is the big one, buddy. This is our Super Bowl. Our moon landing. Our... what's that thing where they do the thing?" },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: 'Could you be more specific?' },
    /* 3  */ { type: 'text', speaker: 'Alex', text: "The specifics aren't important. What's important is the ENERGY. And the energy here is: Henderson family, big trust, lots of assets." },
    /* 4  */ { type: 'text', speaker: 'Alex', text: "Mrs. Henderson's assets are... substantial. Very well-endowed. The trust, I mean. The trust is well-endowed." },
    /* 5  */ { type: 'text', speaker: 'Alex', text: 'We need to handle those assets with extreme care. Really get in there and... manage them. Thoroughly.' },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: 'Can we maybe just talk about the actual case?' },
    /* 7  */ { type: 'text', speaker: 'Alex', text: 'Right! So. Old Man Henderson passed away last month. Left behind a trust worth about $4.2 million.' },
    /* 8  */ { type: 'text', speaker: 'Alex', text: "Three beneficiaries: Karen, his daughter. Classic. Chad, his grandson. Also classic but in a different way. And Grandma Henderson, his wife." },
    /* 9  */ { type: 'text', speaker: 'Alex', text: "They all want the assets. ALL of them. Karen says Daddy promised her the lake house. Chad says Grandpa promised him the investment portfolio." },
    /* 10 */ { type: 'text', speaker: 'Alex', text: "And Grandma Henderson... well. She's got the actual will. And a very good memory. And a cane she's not afraid to use." },
    /* 11 */ { type: 'choice', speaker: 'Alex', text: 'Your job is to meet with each of them and resolve this. Questions?', choices: [
      { text: "What's our fiduciary obligation here?", next: 12 },
      { text: 'This sounds like a disaster.', next: 15 },
      { text: 'Why me? I just started.', next: 18 },
    ]},
    /* 12 */ { type: 'text', speaker: 'Alex', text: 'Fiduciary obligation? Great question. Love the initiative. Very on-brand.' },
    /* 13 */ { type: 'text', speaker: 'Alex', text: 'Our fiduciary obligation is to... leverage our core competencies to maximize stakeholder value while maintaining regulatory alignment across all verticals.' },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "That didn't answer my question at all." },
    /* 15 */ { type: 'text', speaker: 'Alex', text: 'Disaster? No no no. This is an OPPORTUNITY. Every trust dispute is a chance to demonstrate our value proposition.' },
    /* 16 */ { type: 'text', speaker: 'Alex', text: "Plus, the fee structure on a disputed $4.2 million trust? *chef's kiss* That's quarterly bonus territory, my friend." },
    /* 17 */ { type: 'text', speaker: 'Alex', text: "Just remember: we need to penetrate the Henderson account from multiple angles. Get deep into those assets. Really feel them out." },
    /* 18 */ { type: 'text', speaker: 'Alex', text: "Why you? Because you're fresh! Untainted by our... previous approaches to trust management." },
    /* 19 */ { type: 'text', speaker: 'Alex', text: "The last trust officer who handled the Henderson account had a 'nervous event' in the parking garage. He's fine now. Mostly. He flinches when he hears the word 'beneficiary.'" },
    /* 20 */ { type: 'text', speaker: 'Alex', text: "But that won't happen to you! Probably! Go get 'em, tiger!" },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'briefing_complete', value: true, next: 22 },
    /* 22 */ { type: 'action', action: 'quest_update', quest: 'main_act2', objective: 0, status: 'complete', next: 23 },
    /* 23 */ { type: 'text', speaker: 'Alex', text: "Oh, one more thing. If Karen asks you about the pre-audit documents, just say they're 'in process.' Don't say anything about the shredder." },
    /* 24 */ { type: 'text', speaker: 'Alex', text: "Wait, you don't know about the shredder. Forget I said that. Circle back later. *finger guns*" },
    /* 25 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // MONICA -- Reception, actually competent
  // --------------------------------------------------------------------------
  monica_intro: [
    /* 0  */ { type: 'text', speaker: 'Monica', text: "New trust officer? I saw your onboarding paperwork. Well, what was left of it after the Intern got to it." },
    /* 1  */ { type: 'text', speaker: 'Monica', text: "I'm Monica. I run reception, which actually means I run this entire office while everyone else runs in circles." },
    /* 2  */ { type: 'choice', speaker: 'Monica', text: 'What do you need?', choices: [
      { text: 'How does this place actually work?', next: 3 },
      { text: 'What should I know about the Henderson case?', next: 8 },
      { text: "I think I'm good, thanks.", next: 14 },
    ]},
    /* 3  */ { type: 'text', speaker: 'Monica', text: 'How does it work? Hah. Okay. Honestly?' },
    /* 4  */ { type: 'text', speaker: 'Monica', text: "Alex makes decisions based on whatever business book he read that morning. The Intern executes those decisions incorrectly. Janet handles the fallout. I document everything." },
    /* 5  */ { type: 'text', speaker: 'Monica', text: "Dave maintains the systems that are held together with duct tape and optimism. And the Janitor... well, the Janitor knows things." },
    /* 6  */ { type: 'text', speaker: 'Monica', text: "My advice? Keep your head down, document EVERYTHING, and never CC Alex on an email unless you want a 45-minute reply about 'synergistic client engagement strategies.'" },
    /* 7  */ { type: 'text', speaker: 'Monica', text: "Also, I keep a stash of antacids in my desk drawer. You're going to need them." },
    /* 8  */ { type: 'text', speaker: 'Monica', text: 'The Henderson Trust? Oh boy.' },
    /* 9  */ { type: 'text', speaker: 'Monica', text: "I've seen three trust officers try to mediate this family. The first one quit. The second one cried in the bathroom for forty minutes and then quit. The third one is the one who had the 'parking garage incident.'" },
    /* 10 */ { type: 'text', speaker: 'Monica', text: "Here's what you need to know: Karen is aggressive but predictable. She'll demand to speak to a manager within four minutes of any conversation." },
    /* 11 */ { type: 'text', speaker: 'Monica', text: "Chad is... Chad. He'll try to bro his way through fiduciary law. It won't work, but he'll be very confident about it." },
    /* 12 */ { type: 'text', speaker: 'Monica', text: "Grandma Henderson is the one to watch. She seems sweet, but she's been managing her own investments since 1987 and she's sharper than everyone in this building combined." },
    /* 13 */ { type: 'text', speaker: 'Monica', text: "Also -- and I probably shouldn't tell you this -- she used to work here. A long time ago. Ask the Janitor if you want to know more." },
    /* 14 */ { type: 'text', speaker: 'Monica', text: "Well, good luck. And seriously -- my desk, bottom drawer, antacids. Anytime you need them." },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'met_monica', value: true, next: 16 },
    /* 16 */ { type: 'action', action: 'give_item', item: 'antacid', quantity: 1, next: 17 },
    /* 17 */ { type: 'text', speaker: 'Monica', text: 'Here, take one now. Consider it a welcome gift.' },
    /* 18 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // WATER COOLER -- Random gossip
  // --------------------------------------------------------------------------
  water_cooler: [
    /* 0  */ { type: 'condition', flag: 'cooler_visit_count_3', ifTrue: 10, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'cooler_visit_count_2', ifTrue: 6, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "You approach the water cooler. Two coworkers whose names you don't know stop talking immediately." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "One of them says 'We were just talking about... the weather' before speed-walking away." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "You overhear a whisper: 'That's the one they gave the Henderson case to. Poor bastard.'" },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'cooler_visit_count_2', value: true, next: 15 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The same two coworkers are back at the water cooler. This time they don't bother hiding it." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "'I heard Karen Henderson threw a binder at the last trust officer. A BINDER. Three-ring.'" },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: "'That's nothing. I heard Grandma Henderson once made a compliance auditor cry just by reading his own report back to him. Out loud. With commentary.'" },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'cooler_visit_count_3', value: true, next: 15 },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "The water cooler crowd has grown. There are now four people, and they're openly staring at you." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "'He's still here? I had him in the betting pool for day two.' 'I had him for this afternoon.' 'I had him for never showing up.'" },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'One of them raises their cup in what might be a salute, or might be pity. Hard to tell.' },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: 'You fill your cup. The water is room temperature. Somehow, this feels like a metaphor.' },
    /* 14 */ { type: 'action', action: 'set_flag', flag: 'cooler_exhausted', value: true, next: 15 },
    /* 15 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // VENDING MACHINE -- Fortunes
  // --------------------------------------------------------------------------
  vending_machine: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: 'You approach the vending machine. It hums menacingly.' },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The selection buttons are labeled with numbers that don't correspond to any visible products." },
    /* 2  */ { type: 'choice', speaker: 'Vending Machine', text: 'INSERT COIN FOR WISDOM', choices: [
      { text: 'Press B7', next: 3 },
      { text: 'Press C3', next: 6 },
      { text: 'Press A1', next: 9 },
      { text: 'Walk away', next: 14 },
    ]},
    /* 3  */ { type: 'text', speaker: 'Vending Machine', text: 'CLUNK. WHIRR. DISPENSING...' },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "A small slip of paper falls out. It reads: 'Your principal is well-endowed... with growth potential. Lucky numbers: 4, 8, 15, 16, 23, 42.'" },
    /* 5  */ { type: 'action', action: 'give_item', item: 'vending_fortune', next: 14 },
    /* 6  */ { type: 'text', speaker: 'Vending Machine', text: 'CLUNK. WHIRR. DISPENSING...' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "A small slip of paper falls out. It reads: 'He who diversifies his portfolio diversifies his suffering. But at least it is diversified.'" },
    /* 8  */ { type: 'action', action: 'give_item', item: 'vending_fortune', next: 14 },
    /* 9  */ { type: 'text', speaker: 'Vending Machine', text: 'CLUNK. WHIRR. DISPENSING...' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "A small slip of paper falls out. It reads: 'The market will do what the market will do. This fortune cost $1.50. Consider it your first loss.'" },
    /* 11 */ { type: 'action', action: 'give_item', item: 'vending_fortune', next: 14 },
    /* 12 */ { type: 'text', speaker: 'Vending Machine', text: 'CLUNK. WHIRR. ERROR: OUT OF WISDOM. DISPENSING EXISTENTIAL DREAD INSTEAD.' },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: 'Nothing comes out. Somehow that feels worse.' },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "The vending machine's hum shifts slightly. Was that always a B-flat? You decide not to investigate." },
    /* 15 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // FRIDGE NOTES -- Escalating passive-aggression
  // --------------------------------------------------------------------------
  fridge_notes: [
    /* 0  */ { type: 'condition', flag: 'act_index_2', ifTrue: 10, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'read_fridge_1', ifTrue: 5, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Fridge Note', text: 'ATTENTION: Someone has been taking items that do not belong to them from this refrigerator. You know who you are. -Management' },
    /* 3  */ { type: 'text', speaker: 'Fridge Note', text: 'P.S. The yogurt was LABELED. With my NAME. In SHARPIE. This is not ambiguous. -Janet' },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'read_fridge_1', value: true, next: 18 },
    /* 5  */ { type: 'condition', flag: 'read_fridge_2', ifTrue: 10, ifFalse: 6 },
    /* 6  */ { type: 'text', speaker: 'Fridge Note', text: "RE: RE: RE: FRIDGE THEFT. I have installed a camera. Yes, this is legal. I checked with legal. They said 'please stop emailing us.' I'm taking that as approval. -Janet" },
    /* 7  */ { type: 'text', speaker: 'Fridge Note', text: 'ADDENDUM: The camera was stolen from the fridge within 24 hours. The irony is not lost on me. -Janet' },
    /* 8  */ { type: 'text', speaker: 'Fridge Note', text: 'NEW NOTE (different handwriting): If you can\'t handle the heat, get out of the kitchen. Also I took your sandwich. It was mediocre. -Anonymous' },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'read_fridge_2', value: true, next: 18 },
    /* 10 */ { type: 'text', speaker: 'Fridge Note', text: 'THIS IS NOW A CRIME SCENE. DO NOT OPEN THIS REFRIGERATOR. -Janet' },
    /* 11 */ { type: 'text', speaker: 'Fridge Note', text: "I have retained counsel. This is no longer a break room matter. This is a LEGAL matter. My attorney will be in contact. -Janet" },
    /* 12 */ { type: 'text', speaker: 'Fridge Note', text: "Janet, your 'attorney' is a paralegal from the second floor who owes you a favor. Please stop terrorizing the break room. -Monica" },
    /* 13 */ { type: 'text', speaker: 'Fridge Note', text: 'FINAL WARNING: I have dusted my tupperware for fingerprints. Results are pending. -Janet' },
    /* 14 */ { type: 'text', speaker: 'Fridge Note', text: "P.S. The fingerprints came back. It was me. I ate my own lunch by accident on Tuesday and forgot. I am not apologizing because the principle still stands." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "There are seventeen more notes underneath, each more unhinged than the last. You decide you've read enough." },
    /* 16 */ { type: 'action', action: 'set_flag', flag: 'fridge_saga_complete', value: true, next: 17 },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: 'You quietly close the fridge. The yogurt inside has been there so long it may have achieved sentience.' },
    /* 18 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // PRINTER -- Haunted
  // --------------------------------------------------------------------------
  printer_interact: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You approach the printer. It's a Xerox WorkCentre 7845i. The display reads: 'PC LOAD LETTER.'" },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: 'No one has printed anything. The printer begins printing anyway.' },
    /* 2  */ { type: 'text', speaker: 'Printer', text: '*CHUNK CHUNK WHIRRRRR*' },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'A single sheet of paper emerges. It reads, in 72-point bold Comic Sans:' },
    /* 4  */ { type: 'condition', flag: 'printer_visit_2', ifTrue: 10, ifFalse: 5 },
    /* 5  */ { type: 'text', speaker: 'Printer', text: 'HELP ME' },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "You stare at the paper. The printer stares back. You're not sure how, but it does." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "The display changes to: 'REPLACE TONER SOUL.'" },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "I'm going to pretend I didn't see that." },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'printer_visit_2', value: true, next: 16 },
    /* 10 */ { type: 'text', speaker: 'Printer', text: 'I KNOW ABOUT THE HENDERSON FILES' },
    /* 11 */ { type: 'text', speaker: 'Andrew', text: 'What?!' },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "The printer prints another page. It's a detailed org chart of the Henderson Trust with one name circled three times in red." },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: 'But the toner runs out halfway through. The circled name is illegible.' },
    /* 14 */ { type: 'text', speaker: 'Printer', text: '*sad beeping noises*' },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "The display reads: 'REPLACE TONER TO LEARN THE TRUTH.' You check. There is no replacement toner on this floor." },
    /* 16 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // MYSTERIOUS JANITOR
  // --------------------------------------------------------------------------
  janitor_intro: [
    /* 0  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Hmm. New face on the sixth floor. Trust department?' },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: "Yeah, I'm the new trust officer. Andrew." },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Andrew. Good name. Means 'strong.' You're going to need that." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'You notice the Janitor is wearing a gold Rolex. His mop bucket has a monogram on it.' },
    /* 4  */ { type: 'choice', speaker: 'Mysterious Janitor', text: "Something on your mind, son?", choices: [
      { text: "That's a nice watch for a janitor.", next: 5 },
      { text: 'Do you know anything about the Henderson Trust?', next: 10 },
      { text: 'People say you used to work here. In a different role.', next: 15 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'This? Gift from a client. A long time ago. Back when I was... in a different line of work.' },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Let me give you some advice, free of charge -- though in this building, nothing is truly free.' },
    /* 7  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The floors I mop see everything. Deals made in hallways. Arguments in stairwells. The truth always comes out in what people say when they think nobody's listening." },
    /* 8  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Or what they print. That printer on the sixth floor? It remembers everything. Every document. Every draft. Every panicked 3 AM printout.' },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Some people think machines don't have memory. Those people haven't worked here long enough." },
    /* 10 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Henderson Trust. Now there's a name I haven't heard in a while." },
    /* 11 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Did you know Old Man Henderson built that trust himself? Filed the paperwork at this very office. Thirty years ago. I watched him do it.' },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: "You've been here for thirty years?" },
    /* 13 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The floors don't mop themselves. And some of us... we stay because there are things that need watching." },
    /* 14 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Listen -- Old Man Henderson put a clause in that trust. Page 47, paragraph 3. Nobody reads that far. But someone should." },
    /* 15 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'A different role? Heh.' },
    /* 16 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'I was Senior Vice President of Trust Administration for this branch. Twenty-two years. Built the trust department from scratch.' },
    /* 17 */ { type: 'text', speaker: 'Andrew', text: "And now you're... mopping?" },
    /* 18 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Sometimes the best view of the maze is from the floor, not the corner office.' },
    /* 19 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Also, the pension is excellent and I have zero emails to answer. Do you know how many emails a VP gets? Three hundred a day. Now I get zero and I know everything." },
    /* 20 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Think about that, Andrew. Really think about it.' },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'met_janitor', value: true, next: 22 },
    /* 22 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'One more thing. When the time comes to make your choice about the Hendersons...' },
    /* 23 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Read the will. Not the summary. Not the abstract. Not Alex's bullet points. The actual will. Page 47." },
    /* 24 */ { type: 'text', speaker: 'Narrator', text: 'The Janitor resumes mopping. The Rolex catches the fluorescent light.' },
    /* 25 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 2 -- HENDERSON FAMILY ENCOUNTERS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // KAREN HENDERSON -- Pre-combat
  // --------------------------------------------------------------------------
  karen_meeting: [
    /* 0  */ { type: 'text', speaker: 'Karen Henderson', text: "Finally. FINALLY. Do you know how long I've been waiting? I have a Pilates class at 2." },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: "Mrs. Henderson, thank you for coming in. I'm Andrew, the trust officer assigned to--" },
    /* 2  */ { type: 'text', speaker: 'Karen Henderson', text: "I know what you are. You're the fourth one. The last one cried. Will you cry? You look like you might cry." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "I'm... not going to cry." },
    /* 4  */ { type: 'text', speaker: 'Karen Henderson', text: 'Good. Because I have DOCUMENTATION. I have EMAILS. I have a BINDER.' },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Karen slams a three-ring binder on the desk. It's at least four inches thick. Tabs are color-coded." },
    /* 6  */ { type: 'text', speaker: 'Karen Henderson', text: "My father PROMISED me the lake house. Page 34 of my binder. I have the Christmas card where he said, and I quote, 'Karen, the lake house is yours someday, now please stop asking.'" },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "A Christmas card isn't legally--" },
    /* 8  */ { type: 'text', speaker: 'Karen Henderson', text: "IT'S IN THE BINDER." },
    /* 9  */ { type: 'choice', speaker: 'Karen Henderson', text: 'Now. Are you going to HELP me, or do I need to speak to your manager?', choices: [
      { text: "Let's review the trust documents together.", next: 10 },
      { text: 'The trust language is very clear, Mrs. Henderson.', next: 14 },
      { text: 'Your binder is very thorough.', next: 17 },
    ]},
    /* 10 */ { type: 'text', speaker: 'Karen Henderson', text: "Review? REVIEW? I've reviewed them a hundred times. They're WRONG. The trust is wrong. My father wouldn't have wanted this." },
    /* 11 */ { type: 'text', speaker: 'Karen Henderson', text: "And don't get me started on Chad. That boy couldn't manage a lemonade stand, let alone an investment portfolio." },
    /* 12 */ { type: 'text', speaker: 'Karen Henderson', text: "He thinks 'diversification' is dating multiple people at once. Which he also does. Poorly." },
    /* 13 */ { type: 'text', speaker: 'Karen Henderson', text: "I want what's mine. I've been VERY patient. And I am DONE being patient." },
    /* 14 */ { type: 'text', speaker: 'Karen Henderson', text: "Clear? CLEAR? Let me tell you what's clear. What's clear is that this institution has FAILED my family." },
    /* 15 */ { type: 'text', speaker: 'Karen Henderson', text: 'Failed to communicate. Failed to manage expectations. Failed to return my calls -- SEVENTEEN calls, by the way. I have a LOG.' },
    /* 16 */ { type: 'text', speaker: 'Karen Henderson', text: 'The log is in the binder. Tab seven. Highlighted. WITH ANNOTATIONS.' },
    /* 17 */ { type: 'text', speaker: 'Karen Henderson', text: "You're being condescending. I can FEEL you being condescending. My father always said I had a gift for detecting condescension." },
    /* 18 */ { type: 'text', speaker: 'Karen Henderson', text: "That's it. I'm calling corporate. I'm calling my attorney. I'm calling the MANAGER." },
    /* 19 */ { type: 'text', speaker: 'Narrator', text: "Karen's composure shatters. The binder opens. Papers fly. A Starbucks receipt for $47.83 flutters to the ground." },
    /* 20 */ { type: 'text', speaker: 'Karen Henderson', text: "You want to see HOSTILE? I'll show you the TRUE POWER of a dissatisfied beneficiary!" },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'karen_met', value: true, next: 22 },
    /* 22 */ { type: 'action', action: 'start_combat', encounter: 'karen', next: 23 },
    /* 23 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // CHAD HENDERSON -- Pre-combat
  // --------------------------------------------------------------------------
  chad_meeting: [
    /* 0  */ { type: 'text', speaker: 'Chad Henderson', text: "Broooo. What's up. You the new trust guy? Sweet office, dude." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: 'Chad Henderson enters wearing a backwards cap, a popped collar polo, and carrying a protein shake that cost more than your lunch.' },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: 'Mr. Henderson, thank you for meeting with me about the trust dist--' },
    /* 3  */ { type: 'text', speaker: 'Chad Henderson', text: "Call me Chad, bro. Mr. Henderson was my grandpa. Well, I guess that's why we're here. RIP to the GOAT." },
    /* 4  */ { type: 'text', speaker: 'Chad Henderson', text: "So anyway, Grandpa Chad -- yeah, he was also Chad, family tradition -- he totally told me the portfolio was mine." },
    /* 5  */ { type: 'text', speaker: 'Chad Henderson', text: "I've got BIG plans for it, bro. I'm gonna put it all into crypto. Well, not Bitcoin, that's for boomers. I'm talking about PumpCoin. It's got a dog on it." },
    /* 6  */ { type: 'choice', speaker: 'Chad Henderson', text: 'You a crypto bro? You look like a crypto bro.', choices: [
      { text: 'The trust has a prudent investor standard, Chad.', next: 7 },
      { text: 'Tell me more about these plans.', next: 12 },
      { text: "What about your sister Karen's claims?", next: 16 },
    ]},
    /* 7  */ { type: 'text', speaker: 'Chad Henderson', text: 'Prudent investor? Bro. BRO. I am the MOST prudent.' },
    /* 8  */ { type: 'text', speaker: 'Chad Henderson', text: "Last year I turned $500 into $50. That's a 90% lesson in prudence right there. You can't BUY that kind of education." },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: 'You... lost 90% of your investment?' },
    /* 10 */ { type: 'text', speaker: 'Chad Henderson', text: "I GAINED 90% experience, bro. And experience is the real portfolio. My lawyer says vibes are legally binding." },
    /* 11 */ { type: 'text', speaker: 'Andrew', text: 'Vibes are not legally binding.' },
    /* 12 */ { type: 'text', speaker: 'Chad Henderson', text: "Okay so picture this. We take Grandpa's $1.2 million portfolio and we go ALL IN on PumpCoin at the dip." },
    /* 13 */ { type: 'text', speaker: 'Chad Henderson', text: "Then we NFT the lake house. Yeah, you can NFT a house now. My buddy Tyler said so. He's in crypto. Well, he was. He's in jail now, but not for the crypto stuff." },
    /* 14 */ { type: 'text', speaker: 'Chad Henderson', text: "Point is, by Q3 we'll be at like 10x returns. Then I buy a yacht, name it 'Fiduciary Duty,' and we all win." },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: 'That is literally the worst investment plan I have ever heard.' },
    /* 16 */ { type: 'text', speaker: 'Chad Henderson', text: 'Karen? Dude. BRO. Karen has been trying to take everything since Grandpa\'s funeral. She showed up with a BINDER.' },
    /* 17 */ { type: 'text', speaker: 'Chad Henderson', text: 'A BINDER, bro. At a FUNERAL. Tab-indexed. Color-coded. Who DOES that?' },
    /* 18 */ { type: 'text', speaker: 'Chad Henderson', text: "She thinks she deserves the lake house because she 'has memories there.' BRO. I have memories there too. I once did a backflip off the dock. Poorly. But I DID it." },
    /* 19 */ { type: 'text', speaker: 'Chad Henderson', text: "Okay look. I can tell you're not vibing with the crypto plan. So let me make this simple." },
    /* 20 */ { type: 'text', speaker: 'Chad Henderson', text: "Give me my money or I'm calling my lawyer. Well, my friend who's ALMOST a lawyer. He's in his third year of pre-law. Which is like a lawyer but with more debt." },
    /* 21 */ { type: 'text', speaker: 'Narrator', text: 'Chad crushes his protein shake container with one hand. He immediately regrets it as protein shake sprays everywhere.' },
    /* 22 */ { type: 'text', speaker: 'Chad Henderson', text: "That was supposed to look cool. ANYWAY. I'm not leaving without what's mine, BRO!" },
    /* 23 */ { type: 'action', action: 'set_flag', flag: 'chad_met', value: true, next: 24 },
    /* 24 */ { type: 'action', action: 'start_combat', encounter: 'chad', next: 25 },
    /* 25 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // GRANDMA HENDERSON -- Pre-combat
  // --------------------------------------------------------------------------
  grandma_meeting: [
    /* 0  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Oh, hello dear. You must be Andrew. Come sit down. I made cookies.' },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson places a plate of homemade chocolate chip cookies on the desk. They smell incredible.' },
    /* 2  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Now, before we start, I want you to know that I understand how difficult these family matters can be.' },
    /* 3  */ { type: 'text', speaker: 'Grandma Henderson', text: "My Harold -- God rest his soul -- he was a good man but a terrible communicator. He told everyone what they wanted to hear. Which is how we ended up here." },
    /* 4  */ { type: 'choice', speaker: 'Grandma Henderson', text: 'Cookie, dear?', choices: [
      { text: 'Thank you, Mrs. Henderson. (Take a cookie)', next: 5 },
      { text: "Let's talk about the trust distribution.", next: 9 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Narrator', text: 'You take a cookie. It\'s the best cookie you\'ve ever had. You feel your resolve weakening.' },
    /* 6  */ { type: 'action', action: 'heal', next: 7 },
    /* 7  */ { type: 'text', speaker: 'Grandma Henderson', text: "Good, aren't they? Harold's mother's recipe. She was a terrible person but an excellent baker. Funny how that works." },
    /* 8  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Now then. The trust.' },
    /* 9  */ { type: 'text', speaker: 'Grandma Henderson', text: "I know what Karen wants. I know what Chad wants. Karen wants the lake house because she thinks it validates her childhood. Chad wants the money because he doesn't understand what money is." },
    /* 10 */ { type: 'text', speaker: 'Grandma Henderson', text: "What none of them seem to remember is that I helped Harold build that trust. Every asset. Every provision. I was in the room when the documents were drafted." },
    /* 11 */ { type: 'text', speaker: 'Andrew', text: 'You were involved in the original trust creation?' },
    /* 12 */ { type: 'text', speaker: 'Grandma Henderson', text: "Dear, I used to WORK in this office. Trust administration. Twenty years before that young man in the server room was even born." },
    /* 13 */ { type: 'text', speaker: 'Grandma Henderson', text: "I know things about this company that would make your compliance department weep. But that's not why I'm here." },
    /* 14 */ { type: 'text', speaker: 'Grandma Henderson', text: "I'm here because Harold put a clause in the trust. Page 47, paragraph 3. The one nobody reads." },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: 'What clause?' },
    /* 16 */ { type: 'text', speaker: 'Grandma Henderson', text: 'The one that says the surviving spouse has discretionary authority over the entire corpus, subject to a standard of good faith and family welfare.' },
    /* 17 */ { type: 'text', speaker: 'Grandma Henderson', text: 'In other words, dear...' },
    /* 18 */ { type: 'text', speaker: 'Grandma Henderson', text: "It's ALL mine. Every penny. The lake house, the portfolio, the savings, the vintage car collection, and the timeshare in Branson that nobody wants but everybody fights about." },
    /* 19 */ { type: 'text', speaker: 'Grandma Henderson', text: "I've been letting them argue for six months because, frankly, watching Karen make binders is the most entertainment I've had since Harold passed." },
    /* 20 */ { type: 'text', speaker: 'Grandma Henderson', text: "But now I'm bored. And my stories are on at 3. So let's wrap this up." },
    /* 21 */ { type: 'text', speaker: 'Andrew', text: 'Mrs. Henderson, I... this changes everything about the distribution plan.' },
    /* 22 */ { type: 'text', speaker: 'Grandma Henderson', text: "Oh sweetie. I know. That's the point." },
    /* 23 */ { type: 'text', speaker: 'Grandma Henderson', text: "Now. I'm going to make you an offer. You seem like a nice young man. Better than the last four, at least. The third one DEFINITELY cried." },
    /* 24 */ { type: 'text', speaker: 'Grandma Henderson', text: "But nice only gets you so far. Let me see what you're really made of." },
    /* 25 */ { type: 'text', speaker: 'Narrator', text: "Grandma Henderson's eyes sharpen. The kindly grandmother facade drops like a curtain. Behind it is forty years of financial expertise and zero patience for nonsense." },
    /* 26 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Consider this your performance review, dear. The cookies were the easy part.' },
    /* 27 */ { type: 'action', action: 'set_flag', flag: 'grandma_met', value: true, next: 28 },
    /* 28 */ { type: 'action', action: 'start_combat', encounter: 'grandma', next: 29 },
    /* 29 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ALEX ACT 2 -- Terrible mid-game advice
  // --------------------------------------------------------------------------
  alex_act2: [
    /* 0  */ { type: 'text', speaker: 'Alex', text: "Andrew! Buddy! Quick sync. How's the Henderson thing going?" },
    /* 1  */ { type: 'choice', speaker: 'Alex', text: 'Give me the thirty-thousand-foot view.', choices: [
      { text: "It's a complete disaster, Alex.", next: 2 },
      { text: 'Karen has a binder. Chad has a crypto plan. Grandma has the will.', next: 6 },
    ]},
    /* 2  */ { type: 'text', speaker: 'Alex', text: "Disaster? No, no, no. Reframe. It's a... disruption event. We're being disrupted. By the client. In the client-facing space." },
    /* 3  */ { type: 'text', speaker: 'Alex', text: "This is actually GREAT. Know why? Because disruption is where INNOVATION happens." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: 'Karen threw a binder at me.' },
    /* 5  */ { type: 'text', speaker: 'Alex', text: "Physical engagement! That's high-touch client interaction, baby! Write that in the quarterly report!" },
    /* 6  */ { type: 'text', speaker: 'Alex', text: "Okay, okay, okay. So here's what I'm thinking. And this is blue-sky, right? Real outside-the-box stuff." },
    /* 7  */ { type: 'text', speaker: 'Alex', text: "What if -- and stay with me here -- what if we just... give everyone what they want?" },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "The assets total $4.2 million. They're each asking for about $4 million." },
    /* 9  */ { type: 'text', speaker: 'Alex', text: "Right. So we need... *counting on fingers* ...about $8 million more. Can we leverage something?" },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: 'Leverage WHAT, Alex?' },
    /* 11 */ { type: 'text', speaker: 'Alex', text: "I don't know, that's a details question. I'm a big-picture guy. Details are for people who haven't achieved executive consciousness yet." },
    /* 12 */ { type: 'text', speaker: 'Alex', text: "Look, here's my advice: penetrate the Henderson situation from a position of strength. Really drill down into those assets. Get your hands on the principal and don't let go." },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: 'You know those all sound like innuendos, right?' },
    /* 14 */ { type: 'text', speaker: 'Alex', text: "Innuendo? That's an Italian word. See? This is global thinking. We're going global with this, Andrew." },
    /* 15 */ { type: 'text', speaker: 'Alex', text: "Okay, I gotta run. I have a leadership webinar on 'Synergistic Disruption in the Post-Trust Era.' It's an hour long but I'm only going for the free tote bag." },
    /* 16 */ { type: 'text', speaker: 'Alex', text: 'Keep crushing it! *finger guns*' },
    /* 17 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // JANET ACT 2 -- Updated gossip
  // --------------------------------------------------------------------------
  janet_act2: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "Oh God, you're still here? I mean -- oh GOOD, you're still here." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: '*extremely long sip from tumbler*' },
    /* 2  */ { type: 'text', speaker: 'Janet', text: 'So I heard about Karen. And the binder. And the... incident.' },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "For what it's worth, that's actually a GOOD sign. She only throws binders at people she's beginning to respect. The last trust officer? She threw a STAPLER." },
    /* 4  */ { type: 'condition', flag: 'chad_met', ifTrue: 5, ifFalse: 8 },
    /* 5  */ { type: 'text', speaker: 'Janet', text: 'And Chad... oh honey. Did he tell you about PumpCoin? The one with the dog?' },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "PumpCoin crashed two weeks ago. It's worth less than the graphic of the dog. Chad doesn't know yet. Nobody wants to tell him." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: 'I found out because I may have accidentally invested in it too. The dog was very cute. I am not a smart investor.' },
    /* 8  */ { type: 'text', speaker: 'Janet', text: 'Also -- and this is the REAL gossip -- I was in the copy room and I overheard Alex on the phone.' },
    /* 9  */ { type: 'text', speaker: 'Janet', text: "He was talking to someone at corporate. Using his 'serious voice.' Which is just his regular voice but louder and with more buzzwords." },
    /* 10 */ { type: 'text', speaker: 'Janet', text: "He said something about 'accelerating the Henderson resolution' and 'managing the optics.' And then he said 'mother' and hung up really fast when he saw me." },
    /* 11 */ { type: 'text', speaker: 'Janet', text: 'Weird, right? ...Anyway.' },
    /* 12 */ { type: 'text', speaker: 'Janet', text: '*sip*' },
    /* 13 */ { type: 'text', speaker: 'Janet', text: "The kombucha isn't helping today. I may need to switch to the emergency kombucha." },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "There's an emergency kombucha?" },
    /* 15 */ { type: 'text', speaker: 'Janet', text: "Bottom desk drawer. The one that locks. Don't ask what ABV it is." },
    /* 16 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // DAVE ACT 2 -- Server room revelation
  // --------------------------------------------------------------------------
  dave_act2: [
    /* 0  */ { type: 'text', speaker: 'Dave from IT', text: 'Dude. DUDE. You need to see this.' },
    /* 1  */ { type: 'text', speaker: 'Dave from IT', text: "Remember that encrypted partition I told you about? The one pinging the Caymans?" },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "The one that was 'probably nothing'?" },
    /* 3  */ { type: 'text', speaker: 'Dave from IT', text: "Yeah. It's not nothing. I got past the first layer of encryption. Took me three Red Bulls and a flashback to my CompTIA cert exam, but I did it." },
    /* 4  */ { type: 'text', speaker: 'Dave from IT', text: "It's a database. Of trust account modifications. Going back to 2016. None of them are in our official records." },
    /* 5  */ { type: 'text', speaker: 'Dave from IT', text: "And here's the thing -- every single modification is on Henderson family accounts." },
    /* 6  */ { type: 'choice', speaker: 'Dave from IT', text: "Someone's been making unauthorized changes to the Henderson Trust for EIGHT YEARS, bro.", choices: [
      { text: 'Who has access?', next: 7 },
      { text: 'What kind of modifications?', next: 10 },
    ]},
    /* 7  */ { type: 'text', speaker: 'Dave from IT', text: "That's the thing. The access logs are clean. Whoever did this covered their tracks like a pro." },
    /* 8  */ { type: 'text', speaker: 'Dave from IT', text: "But the database metadata has one username attached: 'admin_legacy.' That account was created in 2006 and never decommissioned." },
    /* 9  */ { type: 'text', speaker: 'Dave from IT', text: "2006. That's before my time. That's before EVERYONE'S time. Well... almost everyone's." },
    /* 10 */ { type: 'text', speaker: 'Dave from IT', text: "Small stuff. Basis adjustments. Fee allocations. Nothing that would trigger an audit individually. But collectively? We're talking about $200K in skimmed fees over eight years." },
    /* 11 */ { type: 'text', speaker: 'Dave from IT', text: "Someone's been nickel-and-diming the Henderson Trust, and they're REALLY good at it." },
    /* 12 */ { type: 'text', speaker: 'Dave from IT', text: "I'm going to keep digging. But if anyone asks, you didn't hear this from me." },
    /* 13 */ { type: 'text', speaker: 'Dave from IT', text: "Also if my network access gets revoked tomorrow, check under the third floor stairwell. I've got a dead drop with a USB drive." },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "A dead drop? You're an IT guy at a bank, not Jason Bourne." },
    /* 15 */ { type: 'text', speaker: 'Dave from IT', text: "That's exactly what Jason Bourne would say." },
    /* 16 */ { type: 'action', action: 'set_flag', flag: 'knows_server_secret', value: true, next: 17 },
    /* 17 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 2 BRANCH POINT
  // ==========================================================================

  branch_decision: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: 'You sit at your desk. The Henderson file is spread before you. Three beneficiaries. Three demands. One trust.' },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Karen's binder sits in the corner, pages still scattered from the incident. Chad's protein shake stain is on the ceiling. And Grandma's cookie plate is suspiciously empty." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "You've met them all. You've survived them all. Now comes the hard part: the actual job." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "Your phone rings. It's Alex." },
    /* 4  */ { type: 'text', speaker: 'Alex', text: "Andrew! Quick download. I need your Henderson recommendation by EOD. Corporate is breathing down my neck. Also my mother keeps calling. Unrelated." },
    /* 5  */ { type: 'text', speaker: 'Alex', text: "So what's the play? How do we... resolve this trust situation?" },
    /* 6  */ { type: 'choice', speaker: 'Narrator', text: "This is it. The decision that defines the rest of Andrew's career at Wells Fargo.", choices: [
      { text: 'Follow the letter of the law. Honor the trust document exactly.', next: 7, flag: 'path_legal' },
      { text: 'Bend the rules. Find a creative interpretation that keeps everyone happy.', next: 12, flag: 'path_bro' },
      { text: "Follow Grandma Henderson's lead. She knows something we don't.", next: 17, flag: 'path_grandma' },
    ]},
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'You choose the straight path. The trust document is clear. The law is the law.' },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "Alex, the trust language favors the surviving spouse. Karen and Chad will need to accept a smaller distribution. That's the law." },
    /* 9  */ { type: 'text', speaker: 'Alex', text: "The LAW? Andrew, the law is... look, the law is like a speed limit. It's more of a suggestion." },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: "It's really not." },
    /* 11 */ { type: 'text', speaker: 'Alex', text: "Fine. FINE. But when Karen calls corporate -- and she WILL call corporate -- you're taking that meeting. Not me. I'll be at my leadership webinar. The one about disruption. *click*" },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'You choose the creative path. Rules were made to be... interpreted flexibly.' },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: "Alex, I think we can restructure the distribution to give everyone something. It'll take some creative accounting and maybe bending a few guidelines." },
    /* 14 */ { type: 'text', speaker: 'Alex', text: "Now THAT'S what I'm talking about! Innovation! Disruption! I knew I hired you for a reason!" },
    /* 15 */ { type: 'text', speaker: 'Alex', text: "Wait, I didn't hire you. HR did. But I'm going to take credit for it." },
    /* 16 */ { type: 'text', speaker: 'Alex', text: "Do what you gotta do, buddy. I'll make sure compliance is looking the other way. I have dirt on the compliance guy. Long story. *click*" },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "You choose Grandma's path. Page 47, paragraph 3. The clause nobody reads." },
    /* 18 */ { type: 'text', speaker: 'Andrew', text: "Alex, I've been looking at the trust document. There's a clause on page 47 that changes everything. I think Grandma Henderson has been playing us all." },
    /* 19 */ { type: 'text', speaker: 'Alex', text: "Page 47? Nobody reads that far. That's like the terms of service of a trust document." },
    /* 20 */ { type: 'text', speaker: 'Andrew', text: 'Alex... did you know that Grandma Henderson used to work here? In trust administration?' },
    /* 21 */ { type: 'text', speaker: 'Narrator', text: 'There is a very long pause on the phone.' },
    /* 22 */ { type: 'text', speaker: 'Alex', text: '...How did you find that out?' },
    /* 23 */ { type: 'text', speaker: 'Andrew', text: "Alex, is there something you're not telling me?" },
    /* 24 */ { type: 'text', speaker: 'Alex', text: "I... look. We need to talk. In person. My office. And Andrew? Don't tell anyone about page 47." },
    /* 25 */ { type: 'text', speaker: 'Alex', text: 'Especially not my mother.' },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: '*click*' },
    /* 27 */ { type: 'action', action: 'set_flag', flag: 'branch_chosen', value: true, next: 28 },
    /* 28 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 3 ENDINGS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // LEGAL EAGLE ENDING -- Karen called corporate, Regional Manager appears
  // --------------------------------------------------------------------------
  legal_eagle_ending: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: 'Three days after your recommendation. Your inbox has 247 unread emails. 243 of them are from Karen Henderson.' },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: 'The other four are from corporate.' },
    /* 2  */ { type: 'text', speaker: 'Alex', text: "Andrew. My office. Now. And bring your... I don't know, bring whatever you bring to a meeting where corporate sends their top guy." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "You enter Alex's office. Sitting in the guest chair is a man in a power suit with a gold tie. He's holding a golf putter." },
    /* 4  */ { type: 'text', speaker: 'Regional Manager', text: 'Andrew. Please, sit down.' },
    /* 5  */ { type: 'text', speaker: 'Regional Manager', text: "I'm the Regional Manager. You don't need to know my name. Nobody does. I answer to a title, not a name. It's more efficient." },
    /* 6  */ { type: 'text', speaker: 'Regional Manager', text: "I've reviewed the Henderson situation. Your recommendation was... correct. Legally sound. Properly documented. By the book." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: 'Thank you--' },
    /* 8  */ { type: 'text', speaker: 'Regional Manager', text: "That wasn't a compliment. Being 'correct' in this industry is a liability. Being correct means someone has to be WRONG. And Karen Henderson does not enjoy being wrong." },
    /* 9  */ { type: 'text', speaker: 'Regional Manager', text: "She's called corporate forty-seven times. She's left Yelp reviews for a bank. We don't have a Yelp page. She MADE one." },
    /* 10 */ { type: 'text', speaker: 'Regional Manager', text: "I'm here to make this go away. In the corporate world, we call that 'strategic conflict resolution.' You might call it... synergy." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager stands. He takes a practice putt with his golf club into an imaginary hole on the carpet.' },
    /* 12 */ { type: 'text', speaker: 'Regional Manager', text: "Here's what's going to happen. You're going to revise your recommendation. Make Karen happy. Make this go away." },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: 'That would violate our fiduciary obligation to the trust.' },
    /* 14 */ { type: 'text', speaker: 'Regional Manager', text: "Fiduciary obligation. Those are expensive words. Let me counter with some cheaper ones: quarterly earnings, shareholder value, your continued employment." },
    /* 15 */ { type: 'text', speaker: 'Regional Manager', text: 'This is the corporate world, Andrew. The truth is whatever the quarterly report says it is.' },
    /* 16 */ { type: 'text', speaker: 'Andrew', text: "I'm not changing my recommendation." },
    /* 17 */ { type: 'text', speaker: 'Regional Manager', text: "Then I'm afraid we have a... synergy problem." },
    /* 18 */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager loosens his gold tie. His eyes narrow. The golf putter transforms from accessory to weapon.' },
    /* 19 */ { type: 'text', speaker: 'Regional Manager', text: "Let me show you how we handle 'problems' at the corporate level." },
    /* 20 */ { type: 'action', action: 'start_combat', encounter: 'regional', next: 21 },
    /* 21 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // BRO CODE ENDING -- Bent the rules, Compliance Auditor appears
  // --------------------------------------------------------------------------
  bro_code_ending: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "A week after your 'creative' recommendation. Everyone's happy. Karen got the lake house. Chad got enough to buy PumpCoin (it crashed). Grandma got her stories." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Alex has been promoted. He's now 'Senior Vice President of Synergistic Client Solutions.' The title didn't exist before. He made it up." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: 'Everything is perfect. Which is exactly when Compliance shows up.' },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'A figure appears in your doorway. Black suit. Red tie. Clipboard. Sunglasses. Indoors.' },
    /* 4  */ { type: 'text', speaker: 'Compliance Auditor', text: "Andrew. I've been reviewing your Henderson Trust distribution." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Oh, great. I think you'll find everything is--" },
    /* 6  */ { type: 'text', speaker: 'Compliance Auditor', text: "Non-compliant. With seventeen separate regulatory guidelines. Two federal statutes. And one internal policy that I didn't even know existed until you violated it." },
    /* 7  */ { type: 'text', speaker: 'Compliance Auditor', text: "You somehow created a new type of regulatory violation. The legal department is going to name it after you." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: 'Look, Alex said it was--' },
    /* 9  */ { type: 'text', speaker: 'Compliance Auditor', text: "Alex. Yes. Alex told you to 'make it work.' Alex also once approved a loan application written in crayon because the applicant 'had good energy.'" },
    /* 10 */ { type: 'text', speaker: 'Compliance Auditor', text: 'Alex is not a reliable source of compliance guidance. Alex is barely a reliable source of oxygen.' },
    /* 11 */ { type: 'text', speaker: 'Compliance Auditor', text: "Let me explain what happens next. I file a report. The report goes to the regulatory committee. The regulatory committee files a Form 27B/6 with FINRA." },
    /* 12 */ { type: 'text', speaker: 'Compliance Auditor', text: "Have you ever seen a Form 27B/6, Andrew? It's forty-seven pages long. Double-sided. And every page is a different way of saying 'you're in trouble.'" },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: "Isn't there something we can work out?" },
    /* 14 */ { type: 'text', speaker: 'Compliance Auditor', text: "'Work out.' The most dangerous phrase in the English language, right after 'let me circle back on that' and 'per my last email.'" },
    /* 15 */ { type: 'text', speaker: 'Compliance Auditor', text: 'No, Andrew. There is nothing to \'work out.\' There is only compliance and non-compliance. You have chosen non-compliance.' },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: 'The Compliance Auditor removes their sunglasses. Their eyes are like two separate audit trails converging on your career.' },
    /* 17 */ { type: 'text', speaker: 'Compliance Auditor', text: 'And non-compliance... has consequences.' },
    /* 18 */ { type: 'action', action: 'start_combat', encounter: 'compliance', next: 19 },
    /* 19 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // SECRET ENDING -- Grandma is Alex's mom
  // --------------------------------------------------------------------------
  secret_ending: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You go to Alex's office as instructed. The door is closed. You can hear voices inside." },
    /* 1  */ { type: 'text', speaker: 'Alex', text: 'Mom, I told you not to come to the office--' },
    /* 2  */ { type: 'text', speaker: 'Grandma Henderson', text: "Alexander Joseph, don't you 'Mom' me. I've been watching you run this trust department into the ground for three years." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "You knock. The voices go silent. Alex opens the door. His face is a color you've never seen before. Something between 'caught' and 'catastrophe.'" },
    /* 4  */ { type: 'text', speaker: 'Alex', text: 'Andrew! Great timing. Great. Super great. Come in. You know my... uh... you know Mrs. Henderson.' },
    /* 5  */ { type: 'text', speaker: 'Grandma Henderson', text: "He knows me as a client. But I think it's time he knows the full picture. Don't you, Alexander?" },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: 'Alex... Grandma Henderson is your MOTHER?' },
    /* 7  */ { type: 'text', speaker: 'Alex', text: "ADOPTIVE mother. Technically. Harold Henderson married my mom when I was ten. It's... complicated. Like all trust structures. Heh." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "You assigned me your own family's trust case?!" },
    /* 9  */ { type: 'text', speaker: 'Alex', text: "I had to! The conflict of interest was... okay yes, there was a MASSIVE conflict of interest. But I thought if I just... stayed at arm's length..." },
    /* 10 */ { type: 'text', speaker: 'Grandma Henderson', text: "He stayed at arm's length by hiding behind buzzwords and finger guns. Which is also how he handles everything else." },
    /* 11 */ { type: 'text', speaker: 'Alex', text: 'Mom!' },
    /* 12 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Alexander, sit down. Andrew, you too.' },
    /* 13 */ { type: 'text', speaker: 'Grandma Henderson', text: "Here's what's really going on. Harold's trust was supposed to be simple. But someone -- someone inside this company -- has been siphoning fees from Henderson accounts since 2016." },
    /* 14 */ { type: 'condition', flag: 'knows_server_secret', ifTrue: 15, ifFalse: 17 },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: 'The encrypted partition. Dave found unauthorized modifications going back eight years.' },
    /* 16 */ { type: 'text', speaker: 'Grandma Henderson', text: "Smart boy. Yes. $200,000 in skimmed fees. And I know who did it." },
    /* 17 */ { type: 'text', speaker: 'Grandma Henderson', text: "I came back to this office -- as a client, through the front door -- to find out who's been stealing from my family's trust." },
    /* 18 */ { type: 'text', speaker: 'Grandma Henderson', text: "And now I have the evidence. The Janitor helped. He's very loyal. Also he has all the master access codes from when he was VP." },
    /* 19 */ { type: 'text', speaker: 'Grandma Henderson', text: 'The person responsible is someone in this room.' },
    /* 20 */ { type: 'text', speaker: 'Narrator', text: 'You and Alex look at each other.' },
    /* 21 */ { type: 'text', speaker: 'Alex', text: 'What?! Mom, I would NEVER--' },
    /* 22 */ { type: 'text', speaker: 'Grandma Henderson', text: "Of course not, Alexander. You can barely operate the coffee machine. You think I'd suspect you of sophisticated financial fraud?" },
    /* 23 */ { type: 'text', speaker: 'Grandma Henderson', text: "No. The 'admin_legacy' account was created by the Regional Manager. The one who's been 'overseeing' this branch for eight years. The one who golfs every Thursday instead of reviewing audit reports." },
    /* 24 */ { type: 'text', speaker: 'Grandma Henderson', text: "I was going to handle this myself. I've been handling everything myself since 1987." },
    /* 25 */ { type: 'text', speaker: 'Grandma Henderson', text: "But Alexander told me about you, Andrew. How you actually read the trust documents. How you didn't cry when Karen threw the binder. How you chose to look at page 47." },
    /* 26 */ { type: 'text', speaker: 'Grandma Henderson', text: 'So I\'m going to give you a choice. Help me take down the Regional Manager. Or walk away.' },
    /* 27 */ { type: 'text', speaker: 'Alex', text: 'Mom, this is a lot. Can we circle back on--' },
    /* 28 */ { type: 'text', speaker: 'Grandma Henderson', text: "Alexander. If you say 'circle back' one more time, I will change the trust to leave everything to the cat." },
    /* 29 */ { type: 'text', speaker: 'Alex', text: "...We don't have a cat." },
    /* 30 */ { type: 'text', speaker: 'Grandma Henderson', text: "I'll GET one." },
    /* 31 */ { type: 'text', speaker: 'Narrator', text: 'Alex slumps in his chair, defeated by his own mother for what is clearly not the first time.' },
    /* 32 */ { type: 'text', speaker: 'Andrew', text: "I'll help." },
    /* 33 */ { type: 'text', speaker: 'Grandma Henderson', text: "Good. Then let's go have a word with this 'Regional Manager.'" },
    /* 34 */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson stands. She picks up her cane. It no longer looks like a walking aid. It looks like a weapon.' },
    /* 35 */ { type: 'text', speaker: 'Alex', text: "Mom, you can't just--" },
    /* 36 */ { type: 'text', speaker: 'Grandma Henderson', text: "Alexander. I'm seventy-four years old, I helped build this trust department, and someone has been stealing from my dead husband's accounts. Watch me." },
    /* 37 */ { type: 'text', speaker: 'Narrator', text: "Grandma Henderson marches toward the Regional Manager's temporary office. Alex and Andrew follow, mostly because the alternative is being in front of her." },
    /* 38 */ { type: 'text', speaker: 'Regional Manager', text: 'What-- Mrs. Henderson? What is the meaning of this?' },
    /* 39 */ { type: 'text', speaker: 'Grandma Henderson', text: "The meaning of this is: I know about the admin_legacy account. I know about the $200,000. And I know about the Cayman Islands P.O. box." },
    /* 40 */ { type: 'text', speaker: 'Grandma Henderson', text: 'I also baked cookies. Would you like one before we ruin your career?' },
    /* 41 */ { type: 'text', speaker: 'Regional Manager', text: "This is... you can't prove... I'll have you escorted out of this building!" },
    /* 42 */ { type: 'text', speaker: 'Grandma Henderson', text: "Try it. The Janitor has the keys. And the evidence. And a very good lawyer -- my granddaughter. Yes, Karen. She's aggressive. I know. I raised her." },
    /* 43 */ { type: 'text', speaker: 'Narrator', text: "The Regional Manager's face cycles through the five stages of corporate grief: denial, anger, restructuring, golden parachute, and acceptance." },
    /* 44 */ { type: 'text', speaker: 'Regional Manager', text: "Fine. FINE. You want to do this? Then we'll do this. I didn't spend twenty years climbing the corporate ladder to be taken down by a grandmother and a trust officer who's been here for A WEEK." },
    /* 45 */ { type: 'text', speaker: 'Alex', text: 'And me!' },
    /* 46 */ { type: 'text', speaker: 'Regional Manager', text: 'Nobody was counting you, Alex.' },
    /* 47 */ { type: 'text', speaker: 'Alex', text: 'Fair.' },
    /* 48 */ { type: 'text', speaker: 'Narrator', text: "Wait -- the Regional Manager flees! But Alex, overwhelmed by the situation, has a complete corporate meltdown." },
    /* 49 */ { type: 'text', speaker: 'Alex', text: "I CAN'T TAKE IT ANYMORE! All the synergies! All the paradigm shifts! ALL THE FINGER GUNS!" },
    /* 50 */ { type: 'text', speaker: 'Alex', text: 'I just wanted to be a good boss, Andrew! I read SEVEN leadership books this month! SEVEN! And they ALL contradicted each other!' },
    /* 51 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Oh, Alexander...' },
    /* 52 */ { type: 'text', speaker: 'Alex', text: "I DON'T EVEN KNOW WHAT SYNERGY MEANS, MOM!" },
    /* 53 */ { type: 'action', action: 'set_flag', flag: 'secret_path_complete', value: true, next: 54 },
    /* 54 */ { type: 'action', action: 'start_combat', encounter: 'alex_boss', next: 55 },
    /* 55 */ { type: 'end' },
  ],

  // ==========================================================================
  // POST-COMBAT / RETURN DIALOGS
  // ==========================================================================

  janet_return: [
    /* 0 */ { type: 'text', speaker: 'Janet', text: 'Still alive? Good for you.' },
    /* 1 */ { type: 'text', speaker: 'Janet', text: '*sip*' },
    /* 2 */ { type: 'end' },
  ],

  dave_return: [
    /* 0 */ { type: 'text', speaker: 'Dave from IT', text: "Can't talk. Running a packet trace. Also, your printer is still possessed. I'm not fixing that." },
    /* 1 */ { type: 'end' },
  ],

  intern_return: [
    /* 0 */ { type: 'text', speaker: 'The Intern', text: 'Hey Aiden! I mean -- whatever your name is!' },
    /* 1 */ { type: 'text', speaker: 'The Intern', text: "I would talk more but Alex has me reorganizing the filing cabinets by 'vibrational frequency.' I don't know what that means and I'm afraid to ask." },
    /* 2 */ { type: 'end' },
  ],

  monica_return: [
    /* 0 */ { type: 'text', speaker: 'Monica', text: "You've got that look. The Henderson look. I've seen it before." },
    /* 1 */ { type: 'text', speaker: 'Monica', text: 'Bottom drawer. Antacids. Seriously.' },
    /* 2 */ { type: 'end' },
  ],

  janitor_return: [
    /* 0 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Page 47. Don't forget." },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'He resumes mopping in a way that suggests the conversation is over.' },
    /* 2 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // Post-combat victory dialogs
  // --------------------------------------------------------------------------
  karen_defeated: [
    /* 0  */ { type: 'text', speaker: 'Karen Henderson', text: "I... fine. FINE. But I'm keeping the binder." },
    /* 1  */ { type: 'text', speaker: 'Karen Henderson', text: "And I'm leaving a review. On EVERY platform. Yelp. Google. TripAdvisor. I don't care that this isn't a hotel." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "That's... fine, Mrs. Henderson." },
    /* 3  */ { type: 'text', speaker: 'Karen Henderson', text: "It's MS. Henderson. And this isn't over. *picks up binder fragments and storms out*" },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'karen_defeated', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  chad_defeated: [
    /* 0  */ { type: 'text', speaker: 'Chad Henderson', text: "Bro... that was... actually kind of sick? Like, you're really good at this trust stuff." },
    /* 1  */ { type: 'text', speaker: 'Chad Henderson', text: "Okay I'll admit the crypto plan was... maybe not the move. My buddy Tyler said so too. From jail." },
    /* 2  */ { type: 'text', speaker: 'Chad Henderson', text: 'Can we just... do whatever the normal thing is? With the trust?' },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "That's called 'following the trust document,' Chad." },
    /* 4  */ { type: 'text', speaker: 'Chad Henderson', text: "Sick. Let's do that. Also, you should check out PumpCoin. It's coming back. The dog on the logo just got sunglasses." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'chad_defeated', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  grandma_defeated: [
    /* 0  */ { type: 'text', speaker: 'Grandma Henderson', text: "Well, well, well. You held your own. I'm impressed." },
    /* 1  */ { type: 'text', speaker: 'Grandma Henderson', text: "Harold would have liked you. He always said the best trust officers were the ones who could take a guilt trip and keep standing." },
    /* 2  */ { type: 'text', speaker: 'Grandma Henderson', text: "Have another cookie, dear. You've earned it." },
    /* 3  */ { type: 'action', action: 'heal', next: 4 },
    /* 4  */ { type: 'action', action: 'give_item', item: 'stress_ball', next: 5 },
    /* 5  */ { type: 'text', speaker: 'Grandma Henderson', text: "And take this stress ball. Lord knows you'll need it with this family." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'grandma_defeated', value: true, next: 7 },
    /* 7  */ { type: 'end' },
  ],

  compliance_defeated: [
    /* 0  */ { type: 'text', speaker: 'Compliance Auditor', text: "Impressive. Your regulatory knowledge is... adequate. That's the highest compliment I give." },
    /* 1  */ { type: 'text', speaker: 'Compliance Auditor', text: "I'll file the Form 27B/6 as a 'learning experience.' It's still forty-seven pages, but I'll mark it as 'resolved.'" },
    /* 2  */ { type: 'text', speaker: 'Compliance Auditor', text: "Don't let it happen again. I'll be watching. I'm always watching." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'The Compliance Auditor puts their sunglasses back on and walks away. You notice they leave no footprints.' },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'compliance_defeated', value: true },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: '~ THE BRO CODE ENDING ~' },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: 'You chose flexibility over formality. Compliance had feelings about that.' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'The Henderson Trust was distributed with a "creative" approach. Everyone got something. Nobody got what they actually wanted. Classic trust law.' },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: 'Chad immediately tried to convert his share to PumpCoin. The transaction was declined seventeen times. The dog on the logo looked disappointed.' },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: 'Karen filed a complaint. Then another complaint about the first complaint. She now has a complaint about complaints.' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson doubled her portion through careful index fund investing. She was always the smart one.' },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: 'Alex took full credit for the "innovative resolution strategy." He got a corner office. It has two windows and zero self-awareness.' },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'You became known as "The Cool Trust Officer." This reputation exists only in your mind and Chad\'s Instagram story (12 views, 11 of them bots).' },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: '~ TRUST ISSUES: A Wells Fargo Simulator ~' },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: 'Thanks for playing! Remember: vibes are NOT legally binding. Probably.' },
    /* 15 */ { type: 'end' },
  ],

  regional_defeated: [
    /* 0  */ { type: 'text', speaker: 'Regional Manager', text: 'This is... unprecedented. No one has ever... I need to call corporate.' },
    /* 1  */ { type: 'text', speaker: 'Regional Manager', text: 'You realize this changes nothing, right? There will always be another Regional Manager. Another quarterly target. Another synergy.' },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: 'Maybe. But the Henderson Trust will be handled correctly.' },
    /* 3  */ { type: 'text', speaker: 'Regional Manager', text: "Correctly. How quaint. Enjoy your moral victory. I'll be on the golf course." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager deploys their golden parachute -- metaphorically -- and exits the building. You never see them again.' },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'regional_defeated', value: true },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: '~ THE LEGAL EAGLE ENDING ~' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'You chose the law. The law chose you back.' },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: 'The Henderson Trust was distributed according to strict legal interpretation. Karen got most of it and immediately sued everyone anyway, because some people just enjoy litigation.' },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: 'Chad started a podcast about "trust fund trauma." It has 12 listeners. All of them are Grandma on different devices.' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson sent you a card: "You chose well, dear. Not wisely, but well."' },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: 'Alex was promoted to a title that doesn\'t mean anything. He has never been happier.' },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'You got promoted to Senior Trust Officer. The raise was $3,000/year before taxes. You bought a nicer coffee mug.' },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: 'Mr. Fernsworth III the plant finally died. Janet gave the eulogy. It was suspiciously coherent for a Tuesday afternoon.' },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: '~ TRUST ISSUES: A Wells Fargo Simulator ~' },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: 'Thanks for playing! This has been a production of questionable taste and excessive corporate satire.' },
    /* 16 */ { type: 'end' },
  ],

  alex_boss_defeated: [
    /* 0  */ { type: 'text', speaker: 'Alex', text: "I... *panting* ...I don't even know what just happened." },
    /* 1  */ { type: 'text', speaker: 'Alex', text: 'Was I... did I just fight you? With corporate buzzwords?' },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "You tried to 'circle back' on me three times, Alex." },
    /* 3  */ { type: 'text', speaker: 'Alex', text: "I know. I know. I'm... I'm sorry, man. I think I had a corporate break." },
    /* 4  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Alexander, honey, you need a vacation. And a therapist. And to stop reading leadership books.' },
    /* 5  */ { type: 'text', speaker: 'Alex', text: "You're right, Mom. You're always right. Can I have a cookie?" },
    /* 6  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Of course, dear.' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'Alex eats a cookie. He starts to cry. It is somehow the most normal thing that has happened all week.' },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'alex_defeated', value: true },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: '~ THE SECRET ENDING ~' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: 'You uncovered the truth: Alex assigned you the Henderson case because he couldn\'t handle his own family\'s trust. Conflict of interest? More like conflict of EVERYTHING.' },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson used the discretionary provision to restructure everything. Karen got therapy (and a smaller binder). Chad got a financial advisor (and the advisor got a stress ball).' },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager was quietly investigated for the admin_legacy account. He\'s now a "consultant," which is corporate for "we can\'t prove anything but please leave."' },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: 'Alex was reassigned to a branch in Fargo. Actual Fargo, North Dakota. He sends postcards that just say "SYNERGY" in increasingly desperate handwriting.' },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: 'You were promoted to Trust Department Manager. Your first act was to water Mr. Fernsworth III. The plant survived. Against all odds, so did you.' },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: 'The Mysterious Janitor nodded approvingly from the parking garage. His Rolex caught the light one last time.' },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: '~ TRUST ISSUES: A Wells Fargo Simulator ~' },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: 'Thanks for playing! The real trust was the $4.2 million we litigated along the way.' },
    /* 18 */ { type: 'end' },
  ],

  // ==========================================================================
  // MISSING INTERACTABLE DIALOGS
  // ==========================================================================

  andrews_desk: [
    /* 0 */ { type: 'condition', flag: 'grandma_defeated', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'condition', flag: 'checked_desk', ifTrue: 6, ifFalse: 2 },
    /* 2 */ { type: 'text', speaker: 'Narrator', text: 'Your cubicle. It smells faintly of despair and Febreze. The previous occupant left a motivational calendar stuck on March 2019.' },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: 'There\'s a drawer full of antacids and a sticky note that reads: "RUN WHILE YOU CAN — T.O. #3"' },
    /* 4 */ { type: 'action', action: 'give_item', item: 'antacid', quantity: 2 },
    /* 5 */ { type: 'action', action: 'set_flag', flag: 'checked_desk', value: true },
    /* 6 */ { type: 'action', action: 'quest_update', quest: 'main_act1', objective: 1 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: 'Your desk. Your life now. The monitor displays a screensaver that says "COMPLIANCE IS NOT OPTIONAL" in Comic Sans.' },
    /* 8 */ { type: 'end' },
  ],

  // Triggered when all Henderson meetings are done — redirect to branch decision
  andrews_desk_branch: [
    { type: 'condition', flag: 'branch_chosen', ifTrue: 2, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'The Henderson file sits on your desk. All three meetings are done. It\'s time to make your recommendation.' },
    /* 2 */ { type: 'end' },
  ],

  coffee_machine: [
    { type: 'text', speaker: 'Narrator', text: 'The coffee machine was manufactured during an era when "ergonomic" meant "won\'t explode."' },
    { type: 'text', speaker: 'Narrator', text: 'A sign reads: "COFFEE IS A PRIVILEGE, NOT A RIGHT. — Management"' },
    { type: 'text', speaker: 'Narrator', text: 'Below it, in Sharpie: "Management can fight me. — Anonymous (Janet)"' },
    { type: 'text', speaker: 'Narrator', text: 'You pour yourself a large coffee. It tastes like determination and existential compromise.' },
    { type: 'action', action: 'give_item', item: 'coffee_large', quantity: 1 },
    { type: 'end' },
  ],

  microwave: [
    { type: 'text', speaker: 'Narrator', text: 'The break room microwave. A monument to culinary war crimes.' },
    { type: 'text', speaker: 'Narrator', text: 'The inside is stained with what you desperately hope is marinara sauce.' },
    { type: 'text', speaker: 'Narrator', text: 'A sign: "WHOEVER MICROWAVED FISH ON FRIDAY: WE WILL FIND YOU. — The Entire Office"' },
    { type: 'text', speaker: 'Narrator', text: 'Below it: "It was Dave." Below THAT: "No it wasn\'t. — Dave (sent from my phone in the server room, which has no microwave)"' },
    { type: 'text', speaker: 'Narrator', text: 'The microwave beeps once, unprompted. You back away slowly.' },
    { type: 'end' },
  ],

  dying_plant: [
    { type: 'text', speaker: 'Narrator', text: 'A plant that has given up on photosynthesis as a lifestyle.' },
    { type: 'text', speaker: 'Narrator', text: 'A label reads: "Mr. Fernsworth III — Alex\'s Responsibility Since 2021."' },
    { type: 'text', speaker: 'Narrator', text: 'Mr. Fernsworth III has clearly not been watered since 2021. His leaves are the color of compliance documentation.' },
    { type: 'text', speaker: 'Narrator', text: 'A tiny post-it on the pot reads: "help me" in suspiciously plant-like handwriting.' },
    { type: 'end' },
  ],

  poster_synergy: [
    { type: 'text', speaker: 'Narrator', text: '"SYNERGY" — printed over a stock photo of six people enthusiastically fist-bumping over a laptop.' },
    { type: 'text', speaker: 'Narrator', text: 'A small sticker has been added: "This word has appeared in 6 consecutive quarterly reviews. We looked it up. No one agrees what it means."' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print at the bottom: "Wells Fargo is not responsible for any morale improvement, career advancement, or wellness that does or does not result from viewing this poster."' },
    { type: 'text', speaker: 'Narrator', text: 'You feel 0% more synergized. Impressive.' },
    { type: 'end' },
  ],

  poster_hustle: [
    { type: 'text', speaker: 'Narrator', text: '"HUSTLE" — above a blurred photo of someone sprinting. It is unclear if they are running toward success or away from HR.' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "Hours are not capped. Neither is coffee. One of those is reimbursable."' },
    { type: 'text', speaker: 'Narrator', text: 'A sticky note in familiar handwriting: "Does hustle cover doing HR\'s job for them? Asking for a friend. — A. Walker"' },
    { type: 'text', speaker: 'Narrator', text: 'Below that, in different handwriting: "Please remove personal notes from company property. — Facilities"' },
    { type: 'text', speaker: 'Narrator', text: 'Below THAT: "Facilities doesn\'t own me. — A. Walker"' },
    { type: 'end' },
  ],

  poster_teamwork: [
    { type: 'text', speaker: 'Narrator', text: '"TEAMWORK MAKES THE DREAM WORK"' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print: "Individual contributors are reminded that credit for team achievements belongs to the team, unless the team underperforms, in which case accountability is individual."' },
    { type: 'text', speaker: 'Narrator', text: 'A sticky note signed "Janet": "I read the policy. This is actually just policy."' },
    { type: 'end' },
  ],

  poster_excellence: [
    { type: 'text', speaker: 'Narrator', text: '"EXCELLENCE IS NOT A DESTINATION. IT\'S A JOURNEY."' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "So is the commute. Neither is compensated."' },
    { type: 'text', speaker: 'Narrator', text: 'An HR approval stamp reads: "APPROVED — Annual Morale Initiative. Budget: $14.50 (includes frame)."' },
    { type: 'text', speaker: 'Narrator', text: 'The frame is visibly from a dollar store. The glass is slightly crooked. It has been this way since 2019. No one has fixed it. No one will.' },
    { type: 'end' },
  ],

  alex_desk: [
    { type: 'text', speaker: 'Narrator', text: 'Alex\'s desk. Dual monitors, both displaying LinkedIn motivational posts.' },
    { type: 'text', speaker: 'Narrator', text: 'A "#1 Boss" mug sits front and center. The receipt is still in the mug. Alex bought it for himself.' },
    { type: 'text', speaker: 'Narrator', text: 'There\'s a framed photo of Alex shaking hands with someone important-looking. On closer inspection, the "important person" is just Alex in a different suit, from a different angle.' },
    { type: 'text', speaker: 'Narrator', text: 'A golf putter leans against the wall. A Post-it on it reads: "PRACTICE STROKES = PRACTICE LEADERSHIP"' },
    { type: 'end' },
  ],

  conference_whiteboard: [
    { type: 'text', speaker: 'Narrator', text: 'The whiteboard is covered in Alex\'s "strategic planning."' },
    { type: 'text', speaker: 'Narrator', text: 'It\'s a flowchart: "SYNERGY → DISRUPT → INNOVATE → LEVERAGE → SYNERGY (repeat)"' },
    { type: 'text', speaker: 'Narrator', text: 'Someone (Dave) wrote underneath: "This is just a circle." Alex responded: "Circles are the strongest shape. Like our TEAM."' },
    { type: 'text', speaker: 'Narrator', text: 'In the corner, barely visible: "I\'ve been here 3 months and I still don\'t know what we do — The Intern"' },
    { type: 'end' },
  ],

  server_rack_inspect: [
    { type: 'text', speaker: 'Narrator', text: 'Row upon row of blinking servers. The hum is almost hypnotic.' },
    { type: 'text', speaker: 'Narrator', text: 'One server has a sticky note: "DO NOT UNPLUG — contains 73% of all trust account records. The other 27% is vibes."' },
    { type: 'text', speaker: 'Narrator', text: 'Another note: "This one runs Doom. For stress testing purposes. — Dave"' },
    { type: 'text', speaker: 'Narrator', text: 'A third note, much older: "admin_legacy — DO NOT DECOMMISSION — R.M."' },
    { type: 'text', speaker: 'Narrator', text: 'The servers emit a sound somewhere between a whisper and a scream. Probably just the cooling fans.' },
    { type: 'end' },
  ],

  daves_desk: [
    { type: 'text', speaker: 'Narrator', text: 'Dave\'s desk is an archaeological dig of snack wrappers and energy drink cans. Stratigraphy suggests habitation since at least 2019.' },
    { type: 'text', speaker: 'Narrator', text: 'Three monitors: server logs, a Reddit thread about cryptography, and what is unmistakably Minecraft.' },
    { type: 'text', speaker: 'Narrator', text: 'A sticky note: "BROWSER HISTORY IS ENCRYPTED WITH AES-256. NICE TRY, ALEX."' },
    { type: 'text', speaker: 'Narrator', text: 'In a drawer (unlocked, because Dave fears nothing), a USB drive labeled "EVIDENCE (BACKUP)" next to a bag of Doritos.' },
    { type: 'end' },
  ],

  elevator: [
    { type: 'condition', flag: 'branch_chosen', ifTrue: 4, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'The elevator to the Executive Floor. A keycard reader blinks red.' },
    /* 2 */ { type: 'text', speaker: 'Narrator', text: 'A sign: "AUTHORIZED PERSONNEL ONLY. If you have to ask, you\'re not authorized. If you ARE authorized, you already know."' },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: 'You don\'t have clearance yet. Maybe after the Henderson situation resolves...' },
    /* 4 */ { type: 'text', speaker: 'Narrator', text: 'The elevator light blinks green. Someone upstairs is waiting for you.' },
    /* 5 */ { type: 'end' },
  ],

  reception_desk: [
    { type: 'text', speaker: 'Narrator', text: 'Monica\'s reception desk. The only organized surface in the entire building.' },
    { type: 'text', speaker: 'Narrator', text: 'Color-coded files, alphabetized forms, a pen cup with EXACTLY twelve pens. One is missing. Monica knows which one.' },
    { type: 'text', speaker: 'Narrator', text: 'A small plaque reads: "You don\'t have to be crazy to work here, but your manager probably is."' },
    { type: 'text', speaker: 'Narrator', text: 'Below the plaque, a smaller note: "This is not a joke. — Monica"' },
    { type: 'end' },
  ],

  andrews_car: [
    { type: 'text', speaker: 'Narrator', text: 'Your car. A 2014 Honda Civic with a dent from the time you parallel parked "close enough."' },
    { type: 'text', speaker: 'Narrator', text: 'Bumper sticker: "MY OTHER CAR IS ALSO DEBT." It came with the car.' },
    { type: 'text', speaker: 'Narrator', text: 'For a moment you consider driving away. Starting a new life. Becoming a park ranger or something.' },
    { type: 'text', speaker: 'Narrator', text: 'But your student loans won\'t pay themselves. And also, your keys are inside the building. Classic.' },
    { type: 'end' },
  ],

  janitor_closet: [
    { type: 'text', speaker: 'Narrator', text: 'A janitor\'s supply closet that is... suspiciously well-appointed.' },
    { type: 'text', speaker: 'Narrator', text: 'Inside: a mop, industrial cleaner, and... a mahogany bookshelf with first-edition business books?' },
    { type: 'text', speaker: 'Narrator', text: 'There\'s a framed MBA from Wharton on the wall. Next to it, an "EMPLOYEE OF THE MONTH" certificate from every single month in 2003.' },
    { type: 'text', speaker: 'Narrator', text: 'A small plaque: "Sometimes the best office is the one nobody expects." — The Mysterious Janitor, Former SVP' },
    { type: 'end' },
  ],

  executive_desk: [
    { type: 'text', speaker: 'Narrator', text: 'A desk that costs more than your annual salary. Mahogany. Triple monitors. A paperweight shaped like a golden bull.' },
    { type: 'text', speaker: 'Narrator', text: 'The nameplate reads "REGIONAL MANAGER" in gold leaf. No actual name. Just the title. Titles are all that matter up here.' },
    { type: 'text', speaker: 'Narrator', text: 'A poster: "SYNERGY: Because \'We Need to Talk About the Quarterly Numbers\' Sounded Too Honest."' },
    { type: 'text', speaker: 'Narrator', text: 'The desk drawers are locked. The lock is gold-plated. Of course it is.' },
    { type: 'end' },
  ],

  executive_water_cooler: [
    { type: 'text', speaker: 'Narrator', text: 'The executive water cooler dispenses sparkling mineral water. Imported from the Swiss Alps.' },
    { type: 'text', speaker: 'Narrator', text: 'A sign: "Cost: $47 per bottle. Expense code: EMPLOYEE WELLNESS." Notably, this benefit does not extend below the executive floor.' },
    { type: 'text', speaker: 'Narrator', text: 'Meanwhile, the break room cooler downstairs has had a "PLEASE REFILL" sign for three months. Nobody has refilled it.' },
    { type: 'end' },
  ],

  elevator_executive: [
    { type: 'text', speaker: 'Narrator', text: 'The executive elevator. It smells like leather, ambition, and a cologne that costs more than your rent.' },
    { type: 'text', speaker: 'Narrator', text: 'A motivational poster inside: "LEADERSHIP: It\'s Lonely at the Top. But the Parking is Excellent."' },
    { type: 'end' },
  ],

  // ==========================================================================
  // MISSING NPC INTRO DIALOGS
  // ==========================================================================

  karen_intro: [
    { type: 'text', speaker: 'Karen Henderson', text: 'Excuse me? Are YOU the trust officer handling my father\'s estate?' },
    { type: 'text', speaker: 'Karen Henderson', text: 'I\'ve been waiting. I have a BINDER. And a SCHEDULE. And a very expensive lawyer on speed dial.' },
    { type: 'text', speaker: 'Andrew', text: 'We should discuss this in the conference room—' },
    { type: 'text', speaker: 'Karen Henderson', text: 'We\'ll discuss it WHERE I want to discuss it. Which is the conference room. I\'m glad we agree.' },
    { type: 'text', speaker: 'Karen Henderson', text: 'Don\'t be late. I track tardiness. In the binder. Tab twelve.' },
    { type: 'action', action: 'set_flag', flag: 'met_karen' },
    { type: 'end' },
  ],

  chad_intro: [
    { type: 'text', speaker: 'Chad Henderson', text: 'Yoooo! Trust dude! *aggressive fist bump that you did not consent to*' },
    { type: 'text', speaker: 'Chad Henderson', text: 'I\'m Chad. You\'re handling Grandpa\'s money, right? Sweet. I\'ve got BIG plans, bro.' },
    { type: 'text', speaker: 'Chad Henderson', text: 'Two words: Pump. Coin. It\'s got a DOG on it, bro.' },
    { type: 'text', speaker: 'Andrew', text: 'That\'s... we should talk about this in the conference room.' },
    { type: 'text', speaker: 'Chad Henderson', text: 'For sure, for sure. I\'ll be there. Gonna finish this protein shake first. Gotta stay FUELED for financial planning.' },
    { type: 'action', action: 'set_flag', flag: 'met_chad' },
    { type: 'end' },
  ],

  grandma_intro: [
    { type: 'text', speaker: 'Grandma Henderson', text: 'Oh my, what a handsome young man. You must be the new trust officer.' },
    { type: 'text', speaker: 'Grandma Henderson', text: '*offers a cookie from a seemingly infinite supply*' },
    { type: 'text', speaker: 'Grandma Henderson', text: 'I\'m just waiting to discuss my late husband\'s trust. No rush, dear. I\'ve been patient for forty years of marriage. I can wait a bit longer.' },
    { type: 'text', speaker: 'Grandma Henderson', text: 'Meet me in the conference room when you\'re ready. And eat the cookie. You look thin.' },
    { type: 'action', action: 'set_flag', flag: 'met_grandma' },
    { type: 'action', action: 'heal' },
    { type: 'end' },
  ],

  regional_intro: [
    { type: 'text', speaker: 'Regional Manager', text: 'Ah. The trust officer who\'s been causing all this... excitement.' },
    { type: 'text', speaker: 'Regional Manager', text: 'I am the Regional Manager. You don\'t need my name. Names are for people who haven\'t achieved title-based identity.' },
    { type: 'text', speaker: 'Regional Manager', text: 'We have matters to discuss. Serious matters. Quarterly-report-affecting matters.' },
    { type: 'end' },
  ],

  compliance_intro: [
    { type: 'text', speaker: 'Compliance Auditor', text: '*adjusts sunglasses indoors*' },
    { type: 'text', speaker: 'Compliance Auditor', text: 'Section 17. Subsection 4. Paragraph 2.' },
    { type: 'text', speaker: 'Andrew', text: 'What does that—' },
    { type: 'text', speaker: 'Compliance Auditor', text: 'It means I\'m watching. I\'m always watching.' },
    { type: 'text', speaker: 'Compliance Auditor', text: 'Carry on. For now.' },
    { type: 'end' },
  ],

  // ==========================================================================
  // MISSING COMBAT PRE-DIALOG
  // ==========================================================================

  intern_combat_intro: [
    { type: 'text', speaker: 'The Intern', text: 'Okay so I MIGHT have accidentally shredded the Henderson pre-audit file.' },
    { type: 'text', speaker: 'Andrew', text: 'You WHAT?' },
    { type: 'text', speaker: 'The Intern', text: 'Alex said to "make the documents disappear"! I thought he meant literally! Like a magic trick!' },
    { type: 'text', speaker: 'The Intern', text: 'But the budget didn\'t cover a magician so I used the next best thing: the industrial shredder.' },
    { type: 'text', speaker: 'The Intern', text: 'And then the shredder caught fire. And then I put the fire out with coffee. And then the coffee machine broke.' },
    { type: 'text', speaker: 'The Intern', text: 'Anyway, I panicked! And when I panic, I do paperwork! AGGRESSIVE paperwork!' },
    { type: 'text', speaker: 'Narrator', text: 'The Intern grabs a nearby stack of documents and begins hurling them with wild abandon.' },
    { type: 'text', speaker: 'The Intern', text: 'PAPER FIIIIGHT!!!' },
    { type: 'action', action: 'start_combat', encounter: 'intern' },
    { type: 'end' },
  ],
};
