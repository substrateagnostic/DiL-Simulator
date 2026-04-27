// ============================================================================
// TRUST ISSUES: A Trust Officer Simulator -- All Dialog Trees
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
    { type: 'text', speaker: 'Diane (Front Desk)', text: "I'm Diane. I run the front desk. Welcome to Vaults Fargo. Please don't touch the orchid." },
    { type: 'text', speaker: 'Andrew', text: "...There's no orchid." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Exactly. Chad killed it. The point stands." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "HR asked me to give you this." },
    { type: 'action', action: 'give_item', item: 'coffee_large', quantity: 1, next: 6 },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "It's a large coffee. You'll want it. Trust me." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Your desk is on the cubicle floor. Through the north door, up the stairs. Well — there are no stairs. Through the north door." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Your manager is Ross. He'll brief you. Don't be late." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Oh, and keep your badge visible at all times. Ross gets... particular about that." },
    { type: 'text', speaker: 'Andrew', text: "What does a Seasonal Compliance Associate even do?" },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "..." },
    { type: 'text', speaker: 'Diane (Front Desk)', text: "Good luck, Andrew." },
    { type: 'action', action: 'set_flag', flag: 'reception_intro_done', next: 14 },
    { type: 'end' },
  ],

  // ==========================================================================
  // ACT 1 -- INTRODUCTION NPCs
  // ==========================================================================

  // Shown to all team members before the player has checked their desk
  team_pre_intro: [
    /* 0 */ { type: 'text', speaker: 'Narrator', text: "You're still hovering awkwardly in the doorway. Maybe settle in at your desk first before introducing yourself around the office." },
    /* 1 */ { type: 'end' },
  ],

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
      { text: "I should get going.", next: 18 },
    ]},
    /* 4  */ { type: 'text', speaker: 'Janet', text: "This? It's... kombucha." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: 'At 9:30 AM?' },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "It's fermented. That's the POINT of kombucha. Don't make it weird." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: '*extremely long sip*', next: 3 },
    /* 8  */ { type: 'text', speaker: 'Janet', text: "Oh sweetie. Okay. Number one: never eat anything from the break room fridge. The notes in there have gotten... hostile." },
    /* 9  */ { type: 'text', speaker: 'Janet', text: "Number two: if the printer starts making noises, just walk away. We've had three repair techs quit this year." },
    /* 10 */ { type: 'text', speaker: 'Janet', text: "Number three: Ross will use the word 'synergy' at least fourteen times before lunch. Don't drink every time or you'll end up like me." },
    /* 11 */ { type: 'text', speaker: 'Janet', text: "*looks at tumbler* ...Successful. You'll end up successful like me." },
    /* 12 */ { type: 'text', speaker: 'Janet', text: "Oh, and someone's been stealing lunches from the fridge. My money's on Alex from IT, but the Janitor says it's 'an inside job.' Whatever that means.", next: 22 },
    /* 13 */ { type: 'text', speaker: 'Janet', text: "Let's see... Ross is your boss. He's... enthusiastic. He once described a simple trust amendment as 'a paradigm-shifting leverage event.'" },
    /* 14 */ { type: 'text', speaker: 'Janet', text: "Alex from IT lives in the server room. I'm not sure he has a home. He speaks entirely in acronyms." },
    /* 15 */ { type: 'text', speaker: 'Janet', text: "The Intern... bless his heart. He's been here three months and still thinks fiduciary duty is a type of military service." },
    /* 16 */ { type: 'text', speaker: 'Janet', text: "Diane at reception is the only competent person in this building. If you need anything actually done, talk to her." },
    /* 17 */ { type: 'text', speaker: 'Janet', text: "And then there's the Janitor. He wears a gold Rolex and gives financial advice while mopping. Nobody asks questions.", next: 3 },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'met_janet', value: true, next: 19 },
    /* 19 */ { type: 'text', speaker: 'Janet', text: "Anyway, good luck with the Henderson case. You're going to need it. Those people make Thanksgiving look like a contact sport." },
    /* 20 */ { type: 'text', speaker: 'Janet', text: '*sip*' },
    /* 21 */ { type: 'end' },
    /* 22 */ { type: 'condition', flag: 'lunch_thief_started', ifTrue: 3, ifFalse: 23 },
    /* 23 */ { type: 'action', action: 'quest_update', quest: 'side_lunch_thief', stage: 1, next: 24 },
    /* 24 */ { type: 'action', action: 'set_flag', flag: 'lunch_thief_started', value: true, next: 3 },
  ],

  // --------------------------------------------------------------------------
  // ALEX FROM IT
  // --------------------------------------------------------------------------
  alex_it_intro: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: "Hey. You must be the new trust officer. Andrew, right? Welcome to Wells — try not to let the building crush your will to live." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "I'm Alex. IT department. Well, I AM the IT department. Had a team once. They all 'transferred.' That's corporate for 'fled.'" },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "Anyway — good to have you. The trust department could use someone who hasn't been here long enough to stop trying." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "One thing before we get into it. Have you touched any of the legacy systems yet?" },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: 'I just started tod--' },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Good. Don't. The VPN's running on what I'm pretty sure is a modified TI-84 calculator from 2003." },
    /* 6  */ { type: 'choice', speaker: 'Alex from IT', text: "So. What do you want to know?", choices: [
      { text: 'What happened to the IT team?', next: 7 },
      { text: "What's in the server room?", next: 11 },
      { text: 'Any tech I should know about?', next: 16 },
      { text: "I'll let you get back to it.", next: 20 },
    ]},
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "They said it was 'restructuring.' I say it was the Server Room Incident of 2024." },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "I'm not legally allowed to discuss it. NDA. Also a restraining order from the server rack in Row C." },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: 'A restraining order from a server rack?' },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "It's a legal gray area. Like most things at this company.", next: 6 },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: 'The server room? Oh man...' },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "Okay look. Officially, it houses our document management system and the trust accounting database. SSL certificates. Normal stuff." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Unofficially... there's a partition I found that's been running since 2016. It's encrypted with something I've never seen before." },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "Every night at 3:47 AM it sends a packet to an IP address that traces back to a P.O. box in the Cayman Islands." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: 'But that\'s probably nothing. Right? ...Right?', next: 6 },
    /* 16 */ { type: 'text', speaker: 'Alex from IT', text: "Your workstation password is 'password123.' I know because everyone's password is 'password123.'" },
    /* 17 */ { type: 'text', speaker: 'Alex from IT', text: "The document management system crashes every Tuesday at 2 PM. Nobody knows why. I've stopped looking into it because every time I do, my access gets revoked for 24 hours." },
    /* 18 */ { type: 'text', speaker: 'Alex from IT', text: "Also, the VOIP phones record everything. I mean, they're NOT supposed to. But the red light stays on even when you hang up." },
    /* 19 */ { type: 'text', speaker: 'Alex from IT', text: "I unplugged mine in 2022. I communicate exclusively through Slack messages and aggressive eye contact.", next: 6 },
    /* 20 */ { type: 'action', action: 'set_flag', flag: 'met_alex_it', value: true, next: 21 },
    /* 21 */ { type: 'text', speaker: 'Alex from IT', text: "Anyway, if your computer does anything weird -- and it will -- just restart it three times, slap the left side of the monitor, and say 'please.' In that order." },
    /* 22 */ { type: 'text', speaker: 'Alex from IT', text: "The 'please' is important. These machines run on spite and desperation." },
    /* 23 */ { type: 'end' },
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
    /* 9  */ { type: 'text', speaker: 'The Intern', text: "Ross said to 'make the Henderson pre-audit documents disappear.' I assumed he meant magically but the budget didn't cover a magician so..." },
    /* 10 */ { type: 'text', speaker: 'The Intern', text: "Anyway! If anyone asks, I was photocopying. For three hours. Both sides.", next: 15 },
    /* 11 */ { type: 'text', speaker: 'The Intern', text: "I mean-- the shredding was... it was already shredded when I got here. Pre-shredded documents. It's a new system." },
    /* 12 */ { type: 'text', speaker: 'The Intern', text: 'We call it... Proactive Document Lifecycle Management.' },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: '...' },
    /* 14 */ { type: 'text', speaker: 'The Intern', text: "Please don't tell Ross I told you about the Henderson thing. He already made me reorganize the supply closet by 'emotional resonance.'" },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'met_intern', value: true, next: 16 },
    /* 16 */ { type: 'text', speaker: 'The Intern', text: "Oh! I almost forgot. Ross said to tell you the Henderson meeting is 'mission critical.' He said those words while doing finger guns." },
    /* 17 */ { type: 'text', speaker: 'The Intern', text: 'Good luck, Adam!' },
    /* 18 */ { type: 'text', speaker: 'Andrew', text: 'Andrew.' },
    /* 19 */ { type: 'text', speaker: 'The Intern', text: "That's what I said!" },
    /* 20 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ROSS -- Your boss. The briefing.
  // --------------------------------------------------------------------------
  ross_not_ready: [
    /* 0 */ { type: 'text', speaker: 'Ross', text: "Andrew! My man. Before we get into the big stuff — have you met the team yet? Like, all of them?" },
    /* 1 */ { type: 'text', speaker: 'Ross', text: "Janet runs the front desk. She knows everything and will tell you exactly half of it. The Intern does whatever we point him at. He's enthusiastic. That's his whole thing." },
    /* 2 */ { type: 'text', speaker: 'Ross', text: "Then there's Isaiah and Alex from IT. Load-bearing walls, metaphorically. Isaiah knows where everything is filed. Alex knows why nothing works." },
    /* 3 */ { type: 'text', speaker: 'Ross', text: "Go say hi to all four of them. Then come back and we'll talk Henderson. Big things, buddy. Big things. *finger guns*" },
    /* 4 */ { type: 'end' },
  ],

  ross_intro: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: 'Andrew! My man! Come in, come in. Close the door. Actually, leave it open. Actually, close it halfway. Power move.' },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "So. The Henderson Trust. This is the big one, buddy. This is our Super Bowl. Our moon landing. Our... what's that thing where they do the thing?" },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: 'Could you be more specific?' },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "The specifics aren't important. What's important is the ENERGY. And the energy here is: Henderson family, big trust, lots of assets." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "Mrs. Henderson's assets are... substantial. Very well-endowed. The trust, I mean. The trust is well-endowed." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: 'We need to handle those assets with extreme care. Really get in there and... manage them. Thoroughly.' },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: 'Can we maybe just talk about the actual case?' },
    /* 7  */ { type: 'text', speaker: 'Ross', text: 'Right! So. Old Man Henderson passed away last month. Left behind a trust worth about $42 million.' },
    /* 8  */ { type: 'text', speaker: 'Ross', text: "Three beneficiaries: Karen, his daughter. Classic. Chad, his grandson. Also classic but in a different way. And Grandma Henderson, his wife." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "They all want the assets. ALL of them. Karen says Daddy promised her the lake house. Chad says Grandpa promised him the investment portfolio." },
    /* 10 */ { type: 'text', speaker: 'Ross', text: "And Grandma Henderson... well. She's got the actual will. And a very good memory. And a cane she's not afraid to use." },
    /* 11 */ { type: 'choice', speaker: 'Ross', text: 'Your job is to meet with each of them and resolve this. Questions?', choices: [
      { text: "What's our fiduciary obligation here?", next: 12 },
      { text: 'This sounds like a disaster.', next: 15 },
      { text: 'Why me? I just started.', next: 18 },
      { text: "Got it. I'm on it.", next: 21 },
    ]},
    /* 12 */ { type: 'text', speaker: 'Ross', text: 'Fiduciary obligation? Great question. Love the initiative. Very on-brand.' },
    /* 13 */ { type: 'text', speaker: 'Ross', text: 'Our fiduciary obligation is to... leverage our core competencies to maximize stakeholder value while maintaining regulatory alignment across all verticals.' },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "That didn't answer my question at all.", next: 11 },
    /* 15 */ { type: 'text', speaker: 'Ross', text: 'Disaster? No no no. This is an OPPORTUNITY. Every trust dispute is a chance to demonstrate our value proposition.' },
    /* 16 */ { type: 'text', speaker: 'Ross', text: "Plus, the fee structure on a disputed $42 million trust? *chef's kiss* That's quarterly bonus territory, my friend." },
    /* 17 */ { type: 'text', speaker: 'Ross', text: "Just remember: we need to penetrate the Henderson account from multiple angles. Get deep into those assets. Really feel them out.", next: 11 },
    /* 18 */ { type: 'text', speaker: 'Ross', text: "Why you? Because you're fresh! Untainted by our... previous approaches to trust management." },
    /* 19 */ { type: 'text', speaker: 'Ross', text: "The last trust officer who handled the Henderson account had a 'nervous event' in the parking garage. He's fine now. Mostly. He flinches when he hears the word 'beneficiary.'" },
    /* 20 */ { type: 'text', speaker: 'Ross', text: "But that won't happen to you! Probably! Go get 'em, tiger!", next: 11 },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'briefing_complete', value: true, next: 22 },
    /* 22 */ { type: 'action', action: 'quest_update', quest: 'main_act2', objective: 0, status: 'complete', next: 23 },
    /* 23 */ { type: 'text', speaker: 'Ross', text: "Oh, one more thing. If Karen asks you about the pre-audit documents, just say they're 'in process.' Don't say anything about the shredder." },
    /* 24 */ { type: 'text', speaker: 'Ross', text: "Wait, you don't know about the shredder. Forget I said that. Circle back later. *finger guns*" },
    /* 25 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // DIANE -- Reception, actually competent
  // --------------------------------------------------------------------------
  diane_intro: [
    /* 0  */ { type: 'text', speaker: 'Diane', text: "I'm Diane. I run reception, which actually means I run this entire office while everyone else runs in circles." },
    /* 1  */ { type: 'choice', speaker: 'Diane', text: 'What do you need?', choices: [
      { text: 'How does this place actually work?', next: 2 },
      { text: 'What should I know about the Henderson case?', next: 7 },
      { text: "I think I'm good, thanks.", next: 13 },
    ]},
    /* 2  */ { type: 'text', speaker: 'Diane', text: 'How does it work? Hah. Okay. Honestly?' },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "Ross makes decisions based on whatever business book he read that morning. The Intern executes those decisions incorrectly. Janet handles the fallout. I document everything." },
    /* 4  */ { type: 'text', speaker: 'Diane', text: "Alex maintains the systems that are held together with duct tape and optimism. And the Janitor... well, the Janitor knows things." },
    /* 5  */ { type: 'text', speaker: 'Diane', text: "My advice? Keep your head down, document EVERYTHING, and never CC Ross on an email unless you want a 45-minute reply about 'synergistic client engagement strategies.'" },
    /* 6  */ { type: 'text', speaker: 'Diane', text: "Also, I keep a stash of antacids in my desk drawer. You're going to need them.", next: 1 },
    /* 7  */ { type: 'text', speaker: 'Diane', text: 'The Henderson Trust? Oh boy.' },
    /* 8  */ { type: 'text', speaker: 'Diane', text: "I've seen three trust officers try to mediate this family. The first one quit. The second one cried in the bathroom for forty minutes and then quit. The third one is the one who had the 'parking garage incident.'" },
    /* 9  */ { type: 'text', speaker: 'Diane', text: "Here's what you need to know: Karen is aggressive but predictable. She'll demand to speak to a manager within four minutes of any conversation." },
    /* 10 */ { type: 'text', speaker: 'Diane', text: "Chad is... Chad. He'll try to bro his way through fiduciary law. It won't work, but he'll be very confident about it." },
    /* 11 */ { type: 'text', speaker: 'Diane', text: "Grandma Henderson is the one to watch. She seems sweet, but she's been managing her own investments since 1987 and she's sharper than everyone in this building combined." },
    /* 12 */ { type: 'text', speaker: 'Diane', text: "Also -- and I probably shouldn't tell you this -- she used to work here. A long time ago. Ask the Janitor if you want to know more.", next: 1 },
    /* 13 */ { type: 'text', speaker: 'Diane', text: "Well, good luck. And seriously -- my desk, bottom drawer, antacids. Anytime you need them." },
    /* 14 */ { type: 'action', action: 'set_flag', flag: 'met_diane', value: true, next: 15 },
    /* 15 */ { type: 'action', action: 'give_item', item: 'antacid', quantity: 1, next: 16 },
    /* 16 */ { type: 'text', speaker: 'Diane', text: 'Here, take one now. Consider it a welcome gift.' },
    /* 17 */ { type: 'end' },
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
    /* 0  */ { type: 'condition', flag: 'lunch_thief_culprit_revealed', ifTrue: 10, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'read_fridge_1', ifTrue: 5, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Fridge Note', text: 'ATTENTION: Someone has been taking items that do not belong to them from this refrigerator. You know who you are. -Management' },
    /* 3  */ { type: 'text', speaker: 'Fridge Note', text: 'P.S. The yogurt was LABELED. With my NAME. In SHARPIE. This is not ambiguous. -Janet' },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'read_fridge_1', value: true, next: 6 },
    /* 5  */ { type: 'condition', flag: 'read_fridge_2', ifTrue: 10, ifFalse: 6 },
    /* 6  */ { type: 'text', speaker: 'Fridge Note', text: "RE: RE: RE: FRIDGE THEFT. I have installed a camera. Yes, this is legal. I checked with legal. They said 'please stop emailing us.' I'm taking that as approval. -Janet" },
    /* 7  */ { type: 'text', speaker: 'Fridge Note', text: 'ADDENDUM: The camera was stolen from the fridge within 24 hours. The irony is not lost on me. -Janet' },
    /* 8  */ { type: 'text', speaker: 'Fridge Note', text: 'NEW NOTE (different handwriting): If you can\'t handle the heat, get out of the kitchen. Also I took your sandwich. It was mediocre. -Anonymous' },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'read_fridge_2', value: true, next: 10 },
    /* 10 */ { type: 'text', speaker: 'Fridge Note', text: 'THIS IS NOW A CRIME SCENE. DO NOT OPEN THIS REFRIGERATOR. -Janet' },
    /* 11 */ { type: 'text', speaker: 'Fridge Note', text: "I have retained counsel. This is no longer a break room matter. This is a LEGAL matter. My attorney will be in contact. -Janet" },
    /* 12 */ { type: 'text', speaker: 'Fridge Note', text: "Janet, your 'attorney' is a paralegal from the second floor who owes you a favor. Please stop terrorizing the break room. -Diane" },
    /* 13 */ { type: 'text', speaker: 'Fridge Note', text: 'FINAL WARNING: I have dusted my tupperware for fingerprints. Results are pending. -Janet' },
    /* 14 */ { type: 'text', speaker: 'Fridge Note', text: "P.S. The fingerprints came back. It was me. I ate my own lunch by accident on Tuesday and forgot. I am not apologizing because the principle still stands." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "There are seventeen more notes underneath, each more unhinged than the last. You decide you've read enough." },
    /* 16 */ { type: 'action', action: 'set_flag', flag: 'fridge_saga_complete', value: true, next: 19 },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: 'You quietly close the fridge. The yogurt inside has been there so long it may have achieved sentience.' },
    /* 18 */ { type: 'end' },
    /* 19 */ { type: 'condition', flag: 'lunch_thief_fridge_done', ifTrue: 17, ifFalse: 20 },
    /* 20 */ { type: 'condition', flag: 'lunch_thief_started', ifTrue: 21, ifFalse: 17 },
    /* 21 */ { type: 'action', action: 'quest_update', quest: 'side_lunch_thief', stage: 2, next: 22 },
    /* 22 */ { type: 'action', action: 'set_flag', flag: 'lunch_thief_fridge_done', value: true, next: 17 },
  ],

  // --------------------------------------------------------------------------
  // PRINTER -- Haunted
  // --------------------------------------------------------------------------
  printer_interact: [
    // Gate: quest already done
    /* 0  */ { type: 'condition', flag: 'printer_quest_done', ifTrue: 34, ifFalse: 1 },
    // Gate: toner installation stage
    /* 1  */ { type: 'condition', flag: 'printer_toner_quest', ifTrue: 21, ifFalse: 2 },
    // Gate: requires Ross briefing — no Henderson spoilers before then
    /* 2  */ { type: 'condition', flag: 'briefing_complete', ifTrue: 4, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "You approach the printer. It's a Xerox WorkCentre 7845i. The display reads: 'PC LOAD LETTER.' It's just a printer.", next: 20 },
    // Gate: quest already started (waiting on Alex)
    /* 4  */ { type: 'condition', flag: 'printer_quest_started', ifTrue: 20, ifFalse: 5 },
    // Main encounter
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "You approach the printer. It's a Xerox WorkCentre 7845i. The display reads: 'PC LOAD LETTER.'" },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: 'No one has printed anything. The printer begins printing anyway.' },
    /* 7  */ { type: 'text', speaker: 'Printer', text: '*CHUNK CHUNK WHIRRRRR*' },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: 'A single sheet of paper emerges. It reads, in 72-point bold Comic Sans:' },
    /* 9  */ { type: 'text', speaker: 'Printer', text: 'HELP ME' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "You stare at the paper. The printer stares back. You're not sure how, but it does." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "The display changes to: 'REPLACE TONER SOUL.' Then, before you can process that:" },
    /* 12 */ { type: 'text', speaker: 'Printer', text: 'I KNOW ABOUT THE HENDERSON FILES' },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: 'What?!' },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "The printer prints another page. It's a detailed org chart of the Henderson Trust with one name circled three times in red." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: 'But the toner runs out halfway through. The circled name is illegible.' },
    /* 16 */ { type: 'text', speaker: 'Printer', text: '*sad beeping noises*' },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "The display reads: 'REPLACE TONER TO LEARN THE TRUTH.' You check. There is no replacement toner on this floor." },
    /* 18 */ { type: 'action', action: 'quest_update', quest: 'side_printer', stage: 1, next: 19 },
    /* 19 */ { type: 'action', action: 'set_flag', flag: 'printer_quest_started', value: true, next: 20 },
    /* 20 */ { type: 'end' },
    // Toner installation flow
    /* 21 */ { type: 'text', speaker: 'Narrator', text: "You install the old toner cartridge Alex set aside. The printer makes a sound like a sigh of relief." },
    /* 22 */ { type: 'text', speaker: 'Printer', text: '*CHUNK CHUNK CHUNK WHIRRRRRR*' },
    /* 23 */ { type: 'text', speaker: 'Narrator', text: "Three pages print. Slowly. Deliberately. The printer seems almost dignified about it." },
    /* 24 */ { type: 'text', speaker: 'Narrator', text: "Page 1: An internal memo from 2016 authorizing the 'admin_legacy protocol.' Signed by the Regional Manager." },
    /* 25 */ { type: 'text', speaker: 'Narrator', text: "Page 2: A list of Henderson Trust account adjustments — small enough to avoid audit flags, large enough to matter. Over eight years." },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: "Page 3: A single note in different ink: 'If anyone is reading this — check page 47 of the trust document. Original copy is in the Archive. — D.K.'" },
    /* 27 */ { type: 'text', speaker: 'Andrew', text: "D.K. ...Dave Kowalski? Alex's predecessor?" },
    /* 28 */ { type: 'text', speaker: 'Printer', text: '*one quiet beep*' },
    /* 29 */ { type: 'text', speaker: 'Narrator', text: "The display changes to: 'THANK YOU.' Then the printer powers down completely. For the first time in years, it seems at peace." },
    /* 30 */ { type: 'action', action: 'set_flag', flag: 'printer_quest_done', value: true, next: 31 },
    /* 31 */ { type: 'action', action: 'give_xp', xp: 350, next: 32 },
    /* 32 */ { type: 'text', speaker: 'Printer', text: "TWENTY-TWO YEARS OF DOCUMENTS. ALL WITNESSED. NONE FORGOTTEN. TRUTH DELIVERED.", next: 33 },
    /* 33 */ { type: 'text', speaker: 'Narrator', text: "The Printer from Hell has been laid to rest. +350 XP.", next: 20 },
    // Quest done state
    /* 34 */ { type: 'condition', flag: 'printer_soul_done', ifTrue: 37, ifFalse: 35 },
    /* 35 */ { type: 'condition', flag: 'printer_soul_started', ifTrue: 36, ifFalse: 37 },
    /* 36 */ { type: 'text', speaker: 'Narrator', text: "The printer is still, its display dark. But Alex mentioned an ethernet port on the wall right beside it — labeled 'PRINTER DIRECT.' That's what you need.", next: 20 },
    /* 37 */ { type: 'text', speaker: 'Narrator', text: "The printer sits in silence. Its display is dark. It has said everything it needed to say.", next: 20 },
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
      { text: "Just passing through.", next: 21 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'This? Gift from a client. A long time ago. Back when I was... in a different line of work.' },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Let me give you some advice, free of charge -- though in this building, nothing is truly free.' },
    /* 7  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The floors I mop see everything. Deals made in hallways. Arguments in stairwells. The truth always comes out in what people say when they think nobody's listening." },
    /* 8  */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Or what they print. That printer on the sixth floor? It remembers everything. Every document. Every draft. Every panicked 3 AM printout.' },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Some people think machines don't have memory. Those people haven't worked here long enough.", next: 4 },
    /* 10 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Henderson Trust. Now there's a name I haven't heard in a while." },
    /* 11 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Did you know Old Man Henderson built that trust himself? Filed the paperwork at this very office. Thirty years ago. I watched him do it.' },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: "You've been here for thirty years?" },
    /* 13 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The floors don't mop themselves. And some of us... we stay because there are things that need watching." },
    /* 14 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Listen -- Old Man Henderson put a clause in that trust. Page 47, paragraph 3. Nobody reads that far. But someone should.", next: 4 },
    /* 15 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'A different role? Heh.' },
    /* 16 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'I was Senior Vice President of Trust Administration for this branch. Twenty-two years. Built the trust department from scratch.' },
    /* 17 */ { type: 'text', speaker: 'Andrew', text: "And now you're... mopping?" },
    /* 18 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Sometimes the best view of the maze is from the floor, not the corner office.' },
    /* 19 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Also, the pension is excellent and I have zero emails to answer. Do you know how many emails a VP gets? Three hundred a day. Now I get zero and I know everything." },
    /* 20 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'Think about that, Andrew. Really think about it.', next: 4 },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'met_janitor', value: true, next: 22 },
    /* 22 */ { type: 'text', speaker: 'Mysterious Janitor', text: 'One more thing. When the time comes to make your choice about the Hendersons...' },
    /* 23 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Read the will. Not the summary. Not the abstract. Not Ross's bullet points. The actual will. Page 47." },
    /* 24 */ { type: 'text', speaker: 'Narrator', text: 'The Janitor resumes mopping. The Rolex catches the fluorescent light.' },
    /* 25 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 2 -- HENDERSON FAMILY ENCOUNTERS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // KAREN HENDERSON -- Tutorial gate (retry_karen set, tutorial not complete)
  // --------------------------------------------------------------------------
  karen_not_ready: [
    /* 0 */ { type: 'text', speaker: 'Karen Henderson', text: "You again. Are you ready to admit defeat, or have you come to waste MORE of my time?" },
    /* 1 */ { type: 'text', speaker: 'Andrew', text: "I need a bit more experience before I'm ready for this, Mrs. Henderson." },
    /* 2 */ { type: 'text', speaker: 'Karen Henderson', text: "Experience. How CUTE. Come back when you've actually handled some real clients. I'll be waiting. I'm VERY good at waiting. I have a binder about it." },
    /* 3 */ { type: 'end' },
  ],

  // Shown when player approaches Karen before completing the intern spar
  karen_intern_first: [
    /* 0 */ { type: 'text', speaker: 'Karen Henderson', text: "You're not ready. I can TELL you're not ready. You have the look of someone who has never handled a difficult client in their life." },
    /* 1 */ { type: 'text', speaker: 'Andrew', text: "I just need a moment to--" },
    /* 2 */ { type: 'text', speaker: 'Karen Henderson', text: "Go practice on the Intern. He's useless but at least he won't bill us for the trauma. Come back when you've broken a sweat." },
    /* 3 */ { type: 'end' },
  ],

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
    /* 20 */ { type: 'text', speaker: 'Karen Henderson', text: "You want to see HOSTILE? I'll show you the TRUE POWER of a dissatisfied beneficiary!", next: 21 },
    /* 21 */ { type: 'action', action: 'start_combat', encounter: 'karen', next: 22 },
    /* 22 */ { type: 'end' },
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
    /* 12 */ { type: 'text', speaker: 'Chad Henderson', text: "Okay so picture this. We take Grandpa's $12 million portfolio and we go ALL IN on PumpCoin at the dip." },
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
      { text: "Let's talk about the trust distribution.", next: 10 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Narrator', text: 'You take a cookie. It\'s the best cookie you\'ve ever had. You feel your resolve weakening. (-5 Assertiveness, -2 Composure for this fight!)' },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'took_grandma_cookie', value: true, next: 7 },
    /* 7  */ { type: 'action', action: 'heal', next: 8 },
    /* 8  */ { type: 'text', speaker: 'Grandma Henderson', text: "Good, aren't they? Harold's mother's recipe. She was a terrible person but an excellent baker. Funny how that works." },
    /* 9  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Now then. The trust.' },
    /* 10 */ { type: 'text', speaker: 'Grandma Henderson', text: "I know what Karen wants. I know what Chad wants. Karen wants the lake house because she thinks it validates her childhood. Chad wants the money because he doesn't understand what money is." },
    /* 11 */ { type: 'text', speaker: 'Grandma Henderson', text: "What none of them seem to remember is that I helped Harold build that trust. Every asset. Every provision. I was in the room when the documents were drafted." },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: 'You were involved in the original trust creation?' },
    /* 13 */ { type: 'text', speaker: 'Grandma Henderson', text: "Dear, I used to WORK in this office. Trust administration. Twenty years before that young man in the server room was even born." },
    /* 14 */ { type: 'text', speaker: 'Grandma Henderson', text: "I know things about this company that would make your compliance department weep. But that's not why I'm here." },
    /* 15 */ { type: 'text', speaker: 'Grandma Henderson', text: "I'm here because Harold put a clause in the trust. Page 47, paragraph 3. The one nobody reads." },
    /* 16 */ { type: 'text', speaker: 'Andrew', text: 'What clause?' },
    /* 17 */ { type: 'text', speaker: 'Grandma Henderson', text: 'The one that says the surviving spouse has discretionary authority over the entire corpus, subject to a standard of good faith and family welfare.' },
    /* 18 */ { type: 'text', speaker: 'Grandma Henderson', text: 'In other words, dear...' },
    /* 19 */ { type: 'text', speaker: 'Grandma Henderson', text: "It's ALL mine. Every penny. The lake house, the portfolio, the savings, the vintage car collection, and the timeshare in Branson that nobody wants but everybody fights about." },
    /* 20 */ { type: 'text', speaker: 'Grandma Henderson', text: "I've been letting them argue for six months because, frankly, watching Karen make binders is the most entertainment I've had since Harold passed." },
    /* 21 */ { type: 'text', speaker: 'Grandma Henderson', text: "But now I'm bored. And my stories are on at 3. So let's wrap this up." },
    /* 22 */ { type: 'text', speaker: 'Andrew', text: 'Mrs. Henderson, I... this changes everything about the distribution plan.' },
    /* 23 */ { type: 'text', speaker: 'Grandma Henderson', text: "Oh sweetie. I know. That's the point." },
    /* 24 */ { type: 'text', speaker: 'Grandma Henderson', text: "Now. I'm going to make you an offer. You seem like a nice young man. Better than the last four, at least. The third one DEFINITELY cried." },
    /* 25 */ { type: 'text', speaker: 'Grandma Henderson', text: "But nice only gets you so far. Let me see what you're really made of." },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: "Grandma Henderson's eyes sharpen. The kindly grandmother facade drops like a curtain. Behind it is forty years of financial expertise and zero patience for nonsense." },
    /* 27 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Consider this your performance review, dear. The cookies were the easy part.' },
    /* 28 */ { type: 'action', action: 'set_flag', flag: 'grandma_met', value: true, next: 29 },
    /* 29 */ { type: 'action', action: 'start_combat', encounter: 'grandma', next: 30 },
    /* 30 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ROSS ACT 2 -- Terrible mid-game advice
  // --------------------------------------------------------------------------
  ross_act2: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew! Buddy! Quick sync. How's the Henderson thing going?" },
    /* 1  */ { type: 'choice', speaker: 'Ross', text: 'Give me the thirty-thousand-foot view.', choices: [
      { text: "It's a complete disaster, Ross.", next: 2 },
      { text: 'Karen has a binder. Chad has a crypto plan. Grandma has the will.', next: 6 },
    ]},
    /* 2  */ { type: 'text', speaker: 'Ross', text: "Disaster? No, no, no. Reframe. It's a... disruption event. We're being disrupted. By the client. In the client-facing space." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "This is actually GREAT. Know why? Because disruption is where INNOVATION happens." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: 'Karen threw a binder at me.' },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "Physical engagement! That's high-touch client interaction, baby! Write that in the quarterly report!" },
    /* 6  */ { type: 'text', speaker: 'Ross', text: "Okay, okay, okay. So here's what I'm thinking. And this is blue-sky, right? Real outside-the-box stuff." },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "What if -- and stay with me here -- what if we just... give everyone what they want?" },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "The assets total $42 million. They're each asking for about $40 million." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "Right. So we need... *counting on fingers* ...about $80 million more. Can we leverage something?" },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: 'Leverage WHAT, Ross?' },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "I don't know, that's a details question. I'm a big-picture guy. Details are for people who haven't achieved executive consciousness yet." },
    /* 12 */ { type: 'text', speaker: 'Ross', text: "Look, here's my advice: penetrate the Henderson situation from a position of strength. Really drill down into those assets. Get your hands on the principal and don't let go." },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: 'You know those all sound like innuendos, right?' },
    /* 14 */ { type: 'text', speaker: 'Ross', text: "Innuendo? That's an Italian word. See? This is global thinking. We're going global with this, Andrew." },
    /* 15 */ { type: 'text', speaker: 'Ross', text: "Okay, I gotta run. I have a leadership webinar on 'Synergistic Disruption in the Post-Trust Era.' It's an hour long but I'm only going for the free tote bag." },
    /* 16 */ { type: 'text', speaker: 'Ross', text: 'Keep crushing it! *finger guns*' },
    /* 17 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ROSS POST-KAREN DEBRIEF -- Required conversation before Chad fight
  // --------------------------------------------------------------------------
  ross_post_karen: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew! Come in, come in. Shut the door. This is a Level Three conversation. We don't broadcast Level Threes." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "First — HUGE props on Karen. I'm not going to say I had doubts, but I had... significant doubts. A medium-to-large amount of doubts." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "She threw a binder at me, Ross." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "And you SURVIVED. That's the narrative. You're a survivor. This is a brand moment, Andrew. We should get you a mug." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "Okay. Next up: Chad. Chad Henderson. Chad is... different." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "Karen had rage. Organized, tabulated, binder-formatted rage. Chad has... energy. Undirected energy. The kinetic chaos of a man who once tried to invest his entire trust distribution in a cryptocurrency called PumpCoin." },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: "What did you tell him?" },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "I said we'd 'explore the synergies.' That bought about four days. His attention span is roughly that of a golden retriever who just heard a plastic bag." },
    /* 8  */ { type: 'text', speaker: 'Ross', text: "Here's the thing about Chad: he WANTS to be talked out of his bad ideas. He just needs someone with the confidence to do it. You speak Chad?" },
    /* 9  */ { type: 'choice', speaker: 'Andrew', text: 'Do I speak Chad?', choices: [
      { text: "I'll figure it out.", next: 10 },
      { text: "I barely survived Karen.", next: 11 },
    ]},
    /* 10 */ { type: 'text', speaker: 'Ross', text: "THAT is the spirit. Adaptability. That's going in your performance review right now. Mentally. In my head." },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "Fair. But here's the trick: whatever he says, respond with 'interesting pivot' and slowly redirect. Works on everyone under 30 with a SoundCloud account." },
    /* 12 */ { type: 'text', speaker: 'Ross', text: "He's down in the conference room. Housekeeping is still fishing binder tabs out of the air vents but it should be mostly usable." },
    /* 13 */ { type: 'text', speaker: 'Ross', text: "You've got this. Confident. Adaptable. And whatever you do — don't mention crypto first. Let HIM bring it up. He always brings it up." },
    /* 14 */ { type: 'action', action: 'set_flag', flag: 'ross_post_karen', value: true, next: 15 },
    /* 15 */ { type: 'end' },
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
    /* 8  */ { type: 'text', speaker: 'Janet', text: 'Also -- and this is the REAL gossip -- I was in the copy room and I overheard Ross on the phone.' },
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
  // ALEX IT SIDE ROUTER -- lets player choose between side quest and regular chat
  // --------------------------------------------------------------------------
  alex_it_side_router: [
    /* 0 */ { type: 'text', speaker: 'Alex from IT', text: "Hey. What's up?" },
    /* 1 */ { type: 'choice', speaker: 'Alex from IT', prompt: "What do you need?", choices: [
      { text: "What about that IT project you mentioned?", next: 2 },
      { text: "What's going on with the main investigation?", next: 5 },
      { text: "Just checking in.", next: 7 },
    ]},
    /* 2 */ { type: 'action', action: 'set_flag', flag: 'alex_side_chosen', value: true, next: 3 },
    /* 3 */ { type: 'text', speaker: 'Alex from IT', text: "Right, yeah. Here's the situation..." },
    /* 4 */ { type: 'end' },
    /* 5 */ { type: 'action', action: 'set_flag', flag: 'alex_main_chosen', value: true, next: 6 },
    /* 6 */ { type: 'text', speaker: 'Alex from IT', text: "Yeah, let me catch you up on the big picture...", next: 9 },
    /* 7 */ { type: 'action', action: 'set_flag', flag: 'alex_side_deferred', value: true, next: 8 },
    /* 8 */ { type: 'text', speaker: 'Alex from IT', text: "Same old chaos. You know where to find me." },
    /* 9 */ { type: 'end' },
  ],

  // ALEX IT ROUTER -- lets player choose between story and side quests
  // --------------------------------------------------------------------------
  alex_it_router: [
    /* 0 */ { type: 'text', speaker: 'Alex from IT', text: "Hey. I've got a couple things going on. What do you want to talk about?" },
    /* 1 */ { type: 'choice', speaker: 'Alex from IT', prompt: "What's on your mind?", choices: [
      { text: "You look like you're about to combust. What is it?", next: 2 },
      { text: 'Got any IT jobs for me?', next: 5 },
    ]},
    /* 2 */ { type: 'action', action: 'set_flag', flag: 'alex_story_chosen', value: true, next: 3 },
    /* 3 */ { type: 'text', speaker: 'Alex from IT', text: "Yeah. Yeah, you're gonna want to hear this. Close the door." },
    /* 4 */ { type: 'end' },
    /* 5 */ { type: 'action', action: 'set_flag', flag: 'alex_story_deferred', value: true, next: 6 },
    /* 6 */ { type: 'text', speaker: 'Alex from IT', text: "Always. The infrastructure in this building is held together by prayers and zip ties. Let me tell you what's broken now..." },
    /* 7 */ { type: 'end' },
  ],

  // ALEX IT ACT 2 -- Server room revelation
  // --------------------------------------------------------------------------
  alex_it_act2: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: 'Dude. DUDE. You need to see this.' },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "I found an encrypted partition buried in the server. Someone hid it deep — it only shows up if you know exactly where to look. And it's been pinging servers in the Cayman Islands every night since 2016." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "...pinging the Caymans? From a trust department server?" },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Yeah. I cracked the first layer of encryption. Took me three Red Bulls and a flashback to my CompTIA cert exam, but I got through." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "It's a database. Of trust account modifications. Going back to 2016. None of them are in our official records." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "And here's the thing -- every single modification is on Henderson family accounts." },
    /* 6  */ { type: 'choice', speaker: 'Alex from IT', text: "Someone's been making unauthorized changes to the Henderson Trust for EIGHT YEARS, bro.", choices: [
      { text: 'Who has access?', next: 7 },
      { text: 'What kind of modifications?', next: 10 },
    ]},
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "That's the thing. The access logs are clean. Whoever did this covered their tracks like a pro." },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "But the database metadata has one username attached: 'admin_legacy.' That account was created in 2006 and never decommissioned." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "2006. That's before my time. That's before EVERYONE'S time. Well... almost everyone's." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "Small stuff. Basis adjustments. Fee allocations. Nothing that would trigger an audit individually. But collectively? We're talking about $2 million in skimmed fees over eight years." },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "Someone's been nickel-and-diming the Henderson Trust, and they're REALLY good at it." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "I'm going to keep digging. But if anyone asks, you didn't hear this from me." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Also if my network access gets revoked tomorrow, check under the third floor stairwell. I've got a dead drop with a USB drive." },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "A dead drop? You're an IT guy at a bank, not Jason Bourne." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "That's exactly what Jason Bourne would say." },
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
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "Your phone rings. It's Ross." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "Andrew! Quick download. I need your Henderson recommendation by EOD. Corporate is breathing down my neck. Also my mother keeps calling. Unrelated." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "So what's the play? How do we... resolve this trust situation?" },
    /* 6  */ { type: 'choice', speaker: 'Narrator', text: "This is it. The decision that defines the rest of Andrew's career at Vaults Fargo.", choices: [
      { text: 'Follow the letter of the law. Honor the trust document exactly.', next: 7, flag: 'path_legal' },
      { text: 'Bend the rules. Find a creative interpretation that keeps everyone happy.', next: 12, flag: 'path_bro' },
      { text: "Grandma cited page 47, paragraph 3. Nobody reads that clause unless they wrote it. She knows something.", next: 17, flag: 'path_grandma' },
    ]},
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'You choose the straight path. The trust document is clear. The law is the law.' },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "Ross, the trust language favors the surviving spouse. Karen and Chad will need to accept a smaller distribution. That's the law." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "The LAW? Andrew, the law is... look, the law is like a speed limit. It's more of a suggestion." },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: "It's really not." },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "Fine. FINE. But when Karen calls corporate -- and she WILL call corporate -- you're taking that meeting. Not me. I'll be at my leadership webinar. The one about disruption. *click*", next: 27 },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: 'You choose the creative path. Rules were made to be... interpreted flexibly.' },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: "Ross, I think we can restructure the distribution to give everyone something. It'll take some creative accounting and maybe bending a few guidelines." },
    /* 14 */ { type: 'text', speaker: 'Ross', text: "Now THAT'S what I'm talking about! Innovation! Disruption! I knew I hired you for a reason!" },
    /* 15 */ { type: 'text', speaker: 'Ross', text: "Wait, I didn't hire you. HR did. But I'm going to take credit for it." },
    /* 16 */ { type: 'text', speaker: 'Ross', text: "Do what you gotta do, buddy. I'll make sure compliance is looking the other way. I have dirt on the compliance guy. Long story. *click*", next: 27 },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "You choose Grandma's path. Page 47, paragraph 3. The clause nobody reads." },
    /* 18 */ { type: 'text', speaker: 'Andrew', text: "Ross, I've been looking at the trust document. There's a clause on page 47 that changes everything. I think Grandma Henderson has been playing us all." },
    /* 19 */ { type: 'text', speaker: 'Ross', text: "Page 47? Nobody reads that far. That's like the terms of service of a trust document." },
    /* 20 */ { type: 'text', speaker: 'Andrew', text: 'Ross... did you know that Grandma Henderson used to work here? In trust administration?' },
    /* 21 */ { type: 'text', speaker: 'Narrator', text: 'There is a very long pause on the phone.' },
    /* 22 */ { type: 'text', speaker: 'Ross', text: '...How did you find that out?' },
    /* 23 */ { type: 'text', speaker: 'Andrew', text: "Ross, is there something you're not telling me?" },
    /* 24 */ { type: 'text', speaker: 'Ross', text: "I... look. We need to talk. In person. Executive floor. Conference table. And Andrew? Don't tell anyone about page 47." },
    /* 25 */ { type: 'text', speaker: 'Ross', text: 'Especially not my mother.' },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: '*click*' },
    /* 27 */ { type: 'action', action: 'set_flag', flag: 'branch_chosen', value: true, next: 28 },
    /* 28 */ { type: 'condition', flag: 'path_legal', ifTrue: 29, ifFalse: 31 },
    /* 29 */ { type: 'text', speaker: 'Narrator', text: 'Your conviction in the law steels your resolve. (+3 Composure)' },
    /* 30 */ { type: 'end' },
    /* 31 */ { type: 'condition', flag: 'path_bro', ifTrue: 32, ifFalse: 34 },
    /* 32 */ { type: 'text', speaker: 'Narrator', text: "Bending the rules has sharpened your instincts. But there's a nagging voice in the back of your mind... (+3 Bureaucratic Efficiency, -2 Composure)" },
    /* 33 */ { type: 'end' },
    /* 34 */ { type: 'text', speaker: 'Narrator', text: "Grandma's secret has opened your eyes. The truth is a weapon. (+3 Assertiveness)" },
    /* 35 */ { type: 'end' },
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
    /* 2  */ { type: 'text', speaker: 'Ross', text: "Andrew. Executive floor. Now. And bring your... I don't know, bring whatever you bring to a meeting where corporate sends their top guy." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "You look up. Standing at the conference table is a man in a power suit with a gold tie. He's holding a golf putter." },
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
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Ross has been promoted. He's now 'Senior Vice President of Synergistic Client Solutions.' The title didn't exist before. He made it up." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: 'Everything is perfect. Which is exactly when Compliance shows up.' },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'A figure appears in your doorway. Black suit. Red tie. Clipboard. Sunglasses. Indoors.' },
    /* 4  */ { type: 'text', speaker: 'Compliance Auditor', text: "Andrew. I've been reviewing your Henderson Trust distribution." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Oh, great. I think you'll find everything is--" },
    /* 6  */ { type: 'text', speaker: 'Compliance Auditor', text: "Non-compliant. With seventeen separate regulatory guidelines. Two federal statutes. And one internal policy that I didn't even know existed until you violated it." },
    /* 7  */ { type: 'text', speaker: 'Compliance Auditor', text: "You somehow created a new type of regulatory violation. The legal department is going to name it after you." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: 'Look, Ross said it was--' },
    /* 9  */ { type: 'text', speaker: 'Compliance Auditor', text: "Ross. Yes. Ross told you to 'make it work.' Ross also once approved a loan application written in crayon because the applicant 'had good energy.'" },
    /* 10 */ { type: 'text', speaker: 'Compliance Auditor', text: 'Ross is not a reliable source of compliance guidance. Ross is barely a reliable source of oxygen.' },
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
  // SECRET ENDING -- Grandma is Ross's mom
  // --------------------------------------------------------------------------
  secret_ending: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You approach the executive floor conference table. Ross and Grandma Henderson are already seated, voices lowered." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: 'Mom, I told you not to come to the office--' },
    /* 2  */ { type: 'text', speaker: 'Grandma Henderson', text: "Ross, don't you 'Mom' me. I've been watching you run this trust department into the ground for three years." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "They notice you. Ross's face is a color you've never seen before. Something between 'caught' and 'catastrophe.'" },
    /* 4  */ { type: 'text', speaker: 'Ross', text: 'Andrew! Great timing. Great. Super great. Come in. You know my... uh... you know Mrs. Henderson.' },
    /* 5  */ { type: 'text', speaker: 'Grandma Henderson', text: "He knows me as a client. But I think it's time he knows the full picture. Don't you, Ross?" },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: 'Ross... Grandma Henderson is your MOTHER?' },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "ADOPTIVE mother. Technically. Harold Henderson married my mom when I was ten. It's... complicated. Like all trust structures. Heh." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "You assigned me your own family's trust case?!" },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "I had to! The conflict of interest was... okay yes, there was a MASSIVE conflict of interest. But I thought if I just... stayed at arm's length..." },
    /* 10 */ { type: 'text', speaker: 'Grandma Henderson', text: "He stayed at arm's length by hiding behind buzzwords and finger guns. Which is also how he handles everything else." },
    /* 11 */ { type: 'text', speaker: 'Ross', text: 'Mom!' },
    /* 12 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Ross, sit down. Andrew, you too.' },
    /* 13 */ { type: 'text', speaker: 'Grandma Henderson', text: "Here's what's really going on. Harold's trust was supposed to be simple. But someone -- someone inside this company -- has been siphoning fees from Henderson accounts since 2016." },
    /* 14 */ { type: 'condition', flag: 'knows_server_secret', ifTrue: 15, ifFalse: 17 },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: 'The encrypted partition. Alex found unauthorized modifications going back eight years.' },
    /* 16 */ { type: 'text', speaker: 'Grandma Henderson', text: "Smart boy. Yes. $2,000,000 in skimmed fees. And I know who did it." },
    /* 17 */ { type: 'text', speaker: 'Grandma Henderson', text: "I came back to this office -- as a client, through the front door -- to find out who's been stealing from my family's trust." },
    /* 18 */ { type: 'text', speaker: 'Grandma Henderson', text: "And now I have the evidence. The Janitor helped. He's very loyal. Also he has all the master access codes from when he was VP." },
    /* 19 */ { type: 'text', speaker: 'Grandma Henderson', text: 'The person responsible is someone in this room.' },
    /* 20 */ { type: 'text', speaker: 'Narrator', text: 'You and Ross look at each other.' },
    /* 21 */ { type: 'text', speaker: 'Ross', text: 'What?! Mom, I would NEVER--' },
    /* 22 */ { type: 'text', speaker: 'Grandma Henderson', text: "Of course not, Ross. You can barely operate the coffee machine. You think I'd suspect you of sophisticated financial fraud?" },
    /* 23 */ { type: 'text', speaker: 'Grandma Henderson', text: "No. The 'admin_legacy' account was created by the Regional Manager. The one who's been 'overseeing' this branch for eight years. The one who golfs every Thursday instead of reviewing audit reports." },
    /* 24 */ { type: 'text', speaker: 'Grandma Henderson', text: "I was going to handle this myself. I've been handling everything myself since 1987." },
    /* 25 */ { type: 'text', speaker: 'Grandma Henderson', text: "But Ross told me about you, Andrew. How you actually read the trust documents. How you didn't cry when Karen threw the binder. How you chose to look at page 47." },
    /* 26 */ { type: 'text', speaker: 'Grandma Henderson', text: 'So I\'m going to give you a choice. Help me take down the Regional Manager. Or walk away.' },
    /* 27 */ { type: 'text', speaker: 'Ross', text: 'Mom, this is a lot. Can we circle back on--' },
    /* 28 */ { type: 'text', speaker: 'Grandma Henderson', text: "Ross. If you say 'circle back' one more time, I will change the trust to leave everything to the cat." },
    /* 29 */ { type: 'text', speaker: 'Ross', text: "...We don't have a cat." },
    /* 30 */ { type: 'text', speaker: 'Grandma Henderson', text: "I'll GET one." },
    /* 31 */ { type: 'text', speaker: 'Narrator', text: 'Ross slumps in his chair, defeated by his own mother for what is clearly not the first time.' },
    /* 32 */ { type: 'text', speaker: 'Andrew', text: "I'll help." },
    /* 33 */ { type: 'text', speaker: 'Grandma Henderson', text: "Good. Then let's go have a word with this 'Regional Manager.'" },
    /* 34 */ { type: 'text', speaker: 'Narrator', text: 'Grandma Henderson stands. She picks up her cane. It no longer looks like a walking aid. It looks like a weapon.' },
    /* 35 */ { type: 'text', speaker: 'Ross', text: "Mom, you can't just--" },
    /* 36 */ { type: 'text', speaker: 'Grandma Henderson', text: "Ross. I'm seventy-four years old, I helped build this trust department, and someone has been stealing from my dead husband's accounts. Watch me." },
    /* 37 */ { type: 'text', speaker: 'Narrator', text: "Grandma Henderson marches toward the Regional Manager's temporary office. Ross and Andrew follow, mostly because the alternative is being in front of her." },
    /* 38 */ { type: 'text', speaker: 'Regional Manager', text: 'What-- Mrs. Henderson? What is the meaning of this?' },
    /* 39 */ { type: 'text', speaker: 'Grandma Henderson', text: "The meaning of this is: I know about the admin_legacy account. I know about the $2,000,000. And I know about the Cayman Islands P.O. box." },
    /* 40 */ { type: 'text', speaker: 'Grandma Henderson', text: 'I also baked cookies. Would you like one before we ruin your career?' },
    /* 41 */ { type: 'text', speaker: 'Regional Manager', text: "This is... you can't prove... I'll have you escorted out of this building!" },
    /* 42 */ { type: 'text', speaker: 'Grandma Henderson', text: "Try it. The Janitor has the keys. And the evidence. And a very good lawyer -- my granddaughter. Yes, Karen. She's aggressive. I know. I raised her." },
    /* 43 */ { type: 'text', speaker: 'Narrator', text: "The Regional Manager's face cycles through the five stages of corporate grief: denial, anger, restructuring, golden parachute, and acceptance." },
    /* 44 */ { type: 'text', speaker: 'Regional Manager', text: "Fine. FINE. You want to do this? Then we'll do this. I didn't spend twenty years climbing the corporate ladder to be taken down by a grandmother and a trust officer who's been here for A WEEK." },
    /* 45 */ { type: 'text', speaker: 'Ross', text: 'And me!' },
    /* 46 */ { type: 'text', speaker: 'Regional Manager', text: 'Nobody was counting you, Ross.' },
    /* 47 */ { type: 'text', speaker: 'Ross', text: 'Fair.' },
    /* 48 */ { type: 'text', speaker: 'Narrator', text: "Wait -- the Regional Manager flees! But Ross, overwhelmed by the situation, has a complete corporate meltdown." },
    /* 49 */ { type: 'text', speaker: 'Ross', text: "I CAN'T TAKE IT ANYMORE! All the synergies! All the paradigm shifts! ALL THE FINGER GUNS!" },
    /* 50 */ { type: 'text', speaker: 'Ross', text: 'I just wanted to be a good boss, Andrew! I read SEVEN leadership books this month! SEVEN! And they ALL contradicted each other!' },
    /* 51 */ { type: 'text', speaker: 'Grandma Henderson', text: 'Oh, Ross...' },
    /* 52 */ { type: 'text', speaker: 'Ross', text: "I DON'T EVEN KNOW WHAT SYNERGY MEANS, MOM!" },
    /* 53 */ { type: 'action', action: 'set_flag', flag: 'secret_path_complete', value: true, next: 54 },
    /* 54 */ { type: 'action', action: 'start_combat', encounter: 'ross_boss', next: 55 },
    /* 55 */ { type: 'end' },
  ],

  // ==========================================================================
  // COMBAT RETRY DIALOGS -- short quip, straight to battle on rematch
  // ==========================================================================

  karen_first_loss_tutorial: [
    /* 0 */ { type: 'text', speaker: 'Narrator', text: "Karen Henderson dismantles you. Not metaphorically. The binder alone causes structural damage to the conference table." },
    /* 1 */ { type: 'text', speaker: 'Ross', text: "Hey. Hey! You okay? What happened in there?" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "She had a binder." },
    /* 3 */ { type: 'text', speaker: 'Ross', text: "Yeah, she always has the binder. Listen — Karen's been doing this for years. She knows every loophole, every pressure point, every trick." },
    /* 4 */ { type: 'text', speaker: 'Ross', text: "You can't walk in there at your current level and expect to hold your ground. You need more experience. More Assertiveness. More Composure." },
    /* 5 */ { type: 'text', speaker: 'Andrew', text: "How do I get that?" },
    /* 6 */ { type: 'text', speaker: 'Ross', text: "The reception desk. Prospective clients come in all day. Handle their cases, win the fights, build up your skills." },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "TIP: Go to the Reception area and interact with the desk to take on clients. Each win earns XP and AUM currency." },
    /* 8 */ { type: 'text', speaker: 'Ross', text: "Handle 3 clients. Get yourself to Level 3. Then head back to the conference room and face Karen again — at that level you'll actually have a fighting chance." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "Oh — and check the motivational posters around the building. Sounds dumb, but they're actually worth reading. Trust me." },
    /* 10 */ { type: 'text', speaker: 'Ross', text: "Also, there's an old Stagecoach Stampede cabinet in the break room. Don't laugh — if you can hit 500 distance, that thing gives you +5 Composure and +5 Assertiveness. Permanent." },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "One more thing. I've dealt with the Hendersons before. Let me save you some pain." },
    /* 12 */ { type: 'text', speaker: 'Ross', text: "Karen? Don't try to schmooze her. She's immune to that stuff. But cite actual case law — legal arguments — and she folds like a cheap suit." },
    /* 13 */ { type: 'text', speaker: 'Ross', text: "Chad's the opposite. He name-drops lawyers constantly but he's never read a legal document in his life. Legal tactics bounce right off him. But call him out publicly — social pressure — and he completely crumbles." },
    /* 14 */ { type: 'text', speaker: 'Ross', text: "And Grandma... don't underestimate her. She ran this office for twenty years. Sweet talk won't work — she invented sweet talk. But she's never had her own books audited. An audit approach will catch her off guard." },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: "...She's coming back, isn't she." },
    /* 16 */ { type: 'text', speaker: 'Ross', text: "She never left. She's in the conference room right now writing a Yelp review about the parking situation." },
    /* 17 */ { type: 'end' },
  ],

  karen_retry: [
    { type: 'text', speaker: 'Karen Henderson', text: "Oh, you're back. I still have the binder." },
    { type: 'action', action: 'start_combat', encounter: 'karen' },
    { type: 'end' },
  ],

  chad_retry: [
    { type: 'text', speaker: 'Chad Henderson', text: "Bro. Round two? I respect the hustle. Not the strategy. But the hustle." },
    { type: 'action', action: 'start_combat', encounter: 'chad' },
    { type: 'end' },
  ],

  grandma_retry: [
    { type: 'text', speaker: 'Grandma Henderson', text: "Back so soon, dear? I put away the cookies. You don't get cookies twice." },
    { type: 'action', action: 'start_combat', encounter: 'grandma' },
    { type: 'end' },
  ],

  ross_boss_retry: [
    { type: 'text', speaker: 'Ross', text: "Andrew. Let's just skip to the part where I have a breakdown. We both know how this goes." },
    { type: 'action', action: 'start_combat', encounter: 'ross_boss' },
    { type: 'end' },
  ],

  compliance_retry: [
    { type: 'text', speaker: 'Compliance Auditor', text: "Still here? I've already started a second file on you. It's thicker than the first." },
    { type: 'action', action: 'start_combat', encounter: 'compliance' },
    { type: 'end' },
  ],

  regional_retry: [
    { type: 'text', speaker: 'Regional Manager', text: "You again. I'm billing this as a 'strategic re-engagement.' Don't test me." },
    { type: 'action', action: 'start_combat', encounter: 'regional' },
    { type: 'end' },
  ],

  intern_retry: [
    { type: 'text', speaker: 'The Intern', text: "Oh hey. You're back. I Googled some new techniques." },
    { type: 'action', action: 'start_combat', encounter: 'intern' },
    { type: 'end' },
  ],

  // ==========================================================================
  // POST-COMBAT / RETURN DIALOGS
  // ==========================================================================

  janet_return: [
    /* 0 */ { type: 'condition', flag: 'lunch_thief_started', ifTrue: 4, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Janet', text: "Oh — before I forget. Someone's been stealing lunches from the fridge. My money's on Alex from IT, but the Janitor says it's 'an inside job.' Whatever that means." },
    /* 2 */ { type: 'action', action: 'quest_update', quest: 'side_lunch_thief', stage: 1, next: 3 },
    /* 3 */ { type: 'action', action: 'set_flag', flag: 'lunch_thief_started', value: true, next: 6 },
    /* 4 */ { type: 'text', speaker: 'Janet', text: 'Still alive? Good for you.' },
    /* 5 */ { type: 'text', speaker: 'Janet', text: '*sip*' },
    /* 6 */ { type: 'end' },
  ],

  alex_it_return: [
    /* 0 */ { type: 'text', speaker: 'Alex from IT', text: "Can't talk. Running a packet trace. Also, your printer is still possessed. I'm not fixing that." },
    /* 1 */ { type: 'end' },
  ],

  intern_return: [
    /* 0 */ { type: 'text', speaker: 'The Intern', text: 'Hey Aiden! I mean -- whatever your name is!' },
    /* 1 */ { type: 'text', speaker: 'The Intern', text: "I would talk more but Ross has me reorganizing the filing cabinets by 'vibrational frequency.' I don't know what that means and I'm afraid to ask." },
    /* 2 */ { type: 'end' },
  ],

  diane_return: [
    /* 0 */ { type: 'text', speaker: 'Diane', text: "You've got that look. The Henderson look. I've seen it before." },
    /* 1 */ { type: 'text', speaker: 'Diane', text: 'Bottom drawer. Antacids. Seriously.' },
    /* 2 */ { type: 'end' },
  ],

  janitor_return: [
    /* 0 */ { type: 'condition', flag: 'janitor_return_2', ifTrue: 6, ifFalse: 1 },
    /* 1 */ { type: 'condition', flag: 'janitor_return_1', ifTrue: 4, ifFalse: 2 },
    /* 2 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Page 47. Don't forget." },
    /* 3 */ { type: 'action', action: 'set_flag', flag: 'janitor_return_1', value: true, next: 9 },
    /* 4 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The floors remember everything. So do I." },
    /* 5 */ { type: 'action', action: 'set_flag', flag: 'janitor_return_2', value: true, next: 9 },
    /* 6 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Still here. Still watching. Keep going." },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: 'He gestures vaguely at the hallway with his mop.' },
    /* 8 */ { type: 'end' },
    /* 9 */ { type: 'text', speaker: 'Narrator', text: 'He resumes mopping. The Rolex catches the light.' },
    /* 10 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // Post-combat victory dialogs
  // --------------------------------------------------------------------------
  karen_defeated: [
    /* 0  */ { type: 'text', speaker: 'Karen Henderson', text: "I... fine. FINE. But I'm keeping the binder." },
    /* 1  */ { type: 'text', speaker: 'Karen Henderson', text: "And I'm leaving a review. On EVERY platform. Yelp. Google. TripAdvisor. I don't care that this isn't a hotel." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "That's... fine, Mrs. Henderson." },
    /* 3  */ { type: 'text', speaker: 'Karen Henderson', text: "It's MS. Henderson. And this isn't over. *picks up binder fragments and storms out*" },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The conference room is silent. Binder tabs litter the floor like confetti at the world's worst party. You exhale for what feels like the first time in an hour." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Your phone buzzes. Text from Ross: 'Heard you survived Karen. Get up here when you can. We need to talk about Chad. Bring aspirin.'" },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'karen_defeated', value: true, next: 7 },
    /* 7  */ { type: 'end' },
  ],

  chad_defeated: [
    /* 0  */ { type: 'text', speaker: 'Chad Henderson', text: "Bro... that was... actually kind of sick? Like, you're really good at this trust stuff." },
    /* 1  */ { type: 'text', speaker: 'Chad Henderson', text: "Okay I'll admit the crypto plan was... maybe not the move. My buddy Tyler said so too. From jail." },
    /* 2  */ { type: 'text', speaker: 'Chad Henderson', text: 'Can we just... do whatever the normal thing is? With the trust?' },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "That's called 'following the trust document,' Chad." },
    /* 4  */ { type: 'text', speaker: 'Chad Henderson', text: "Sick. Let's do that. Also, you should check out PumpCoin. It's coming back. The dog on the logo just got sunglasses." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Chad shuffles out, already typing on his phone. You hear him say 'yeah bro, he's actually legit' to someone before the door closes." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "Your phone buzzes. Text from Ross: 'Two down. Get to my office before the next one. Trust me on this. TRUST. Me.' He added a fist bump emoji. Then deleted it. Then sent it again." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'chad_defeated', value: true, next: 8 },
    /* 8  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ROSS POST-CHAD DEBRIEF -- Required conversation before Grandma fight
  // --------------------------------------------------------------------------
  ross_post_chad: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Close the door. Both locks. Yes, there are two locks. I had them installed after the Henderson file came across my desk." },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: "Ross, it's just an elderly woman—" },
    /* 2  */ { type: 'text', speaker: 'Ross', text: "She is NOT 'just' anything, Andrew. Karen was a complaint form with legs. Chad was a protein shake with a LinkedIn. Grandma Henderson is a DIFFERENT CATEGORY." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "I had a senior consultant go in there in 2019. He came out speaking only in passive-aggressive non-answers. He's currently our VP of Compliance." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "What does she actually want?" },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "Everything. In writing. Notarized. With a follow-up call. She will offer you a cookie. Do NOT comment on the cookie." },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: "What's wrong with the cookie?" },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "Nobody knows. Three people have asked. They all transferred to the Omaha office voluntarily. On the same day. We don't talk about it." },
    /* 8  */ { type: 'text', speaker: 'Ross', text: "Your only move is to stay calm, keep your documentation airtight, and under no circumstances let her redirect you with a story about her late husband Gerald." },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: "Was Gerald—" },
    /* 10 */ { type: 'text', speaker: 'Ross', text: "She will redirect you with a story about Gerald. Just nod. Set a mental timer for four minutes. After four minutes it loops back around to the trust. That's your window." },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "She's waiting in the conference room. I'll be monitoring the situation remotely." },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: "Monitoring how?" },
    /* 13 */ { type: 'text', speaker: 'Ross', text: "From home. With the door locked. Both locks." },
    /* 14 */ { type: 'action', action: 'set_flag', flag: 'ross_post_chad', value: true, next: 15 },
    /* 15 */ { type: 'end' },
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

  // Ambient NPC dialogs — Henderson family in common areas before their meetings
  chad_breakroom_idle: [
    /* 0 */ { type: 'text', speaker: 'Chad Henderson', text: "Bro! You the new trust guy? I'm Chad. We'll talk later — I'm carb-loading right now." },
    /* 1 */ { type: 'text', speaker: 'Chad Henderson', text: "Gotta keep the macros tight before a big meeting, you know? Protein shake o'clock." },
    /* 2 */ { type: 'text', speaker: 'Chad Henderson', text: "*flexes unnecessarily* See you in the conference room, dude." },
    /* 3 */ { type: 'end' },
  ],

  grandma_reception_idle: [
    /* 0 */ { type: 'text', speaker: 'Grandma Henderson', text: "Oh, hello dear. I'm just waiting for my appointment. Don't mind me." },
    /* 1 */ { type: 'text', speaker: 'Grandma Henderson', text: "I brought cookies for the office. There should be some left in the conference room. If Chad hasn't eaten them all." },
    /* 2 */ { type: 'text', speaker: 'Grandma Henderson', text: "We'll talk when it's my turn, dear. No need to rush. *knits calmly*" },
    /* 3 */ { type: 'end' },
  ],

  compliance_defeated: [
    /* 0  */ { type: 'text', speaker: 'Compliance Auditor', text: "Impressive. Your regulatory knowledge is... adequate. That's the highest compliment I give." },
    /* 1  */ { type: 'text', speaker: 'Compliance Auditor', text: "I'll file the Form 27B/6 as a 'learning experience.' It's still forty-seven pages, but I'll mark it as 'resolved.'" },
    /* 2  */ { type: 'text', speaker: 'Compliance Auditor', text: "Don't let it happen again. I'll be watching. I'm always watching." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: 'The Compliance Auditor puts their sunglasses back on and walks away. You notice they leave no footprints.' },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'compliance_defeated', value: true, next: 5 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: 'The Compliance Auditor walks away. You exhale for the first time in what feels like hours.' },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: 'Then the lights flicker. Not the normal "this building is old" flicker. Something else.' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'The printer in the corner starts up on its own. A single page emerges.' },
    /* 8  */ { type: 'text', speaker: 'Printer', text: 'THE LEDGER REMEMBERS. FIND THE ARCHIVE.' },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: '...What the hell was that?' },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: 'Your phone buzzes. A text from Alex: "Dude. Server room. NOW. The 3:47 AM thing just happened at 2 PM. Something is very wrong."' },
    /* 11 */ { type: 'action', action: 'set_flag', flag: 'act2_complete', value: true, next: 12 },
    /* 12 */ { type: 'end' },
  ],

  regional_defeated: [
    /* 0  */ { type: 'text', speaker: 'Regional Manager', text: 'This is... unprecedented. No one has ever... I need to call corporate.' },
    /* 1  */ { type: 'text', speaker: 'Regional Manager', text: 'You realize this changes nothing, right? There will always be another Regional Manager. Another quarterly target. Another synergy.' },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: 'Maybe. But the Henderson Trust will be handled correctly.' },
    /* 3  */ { type: 'text', speaker: 'Regional Manager', text: "Correctly. How quaint. Enjoy your moral victory. I'll be on the golf course." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager deploys their golden parachute -- metaphorically -- and exits the building. You never see them again.' },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'regional_defeated', value: true, next: 6 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: 'The Regional Manager straightens his tie. His golden parachute remains undeployed. For now.' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'Then something strange happens. The elevator behind you dings. Nobody pressed it.' },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: 'The doors open to an empty car. The floor indicator scrolls through numbers that this building doesn\'t have.' },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: 'A document slides out from under the elevator door. It\'s dated 1947. The letterhead reads "VAULTS FARGO TRUST CHARTER — ORIGINAL."' },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: '1947? This branch wasn\'t built until the \'80s...' },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: 'Your phone buzzes. A text from Alex: "GET TO THE SERVER ROOM. The encrypted partition just decrypted ITSELF. I did NOT do this."' },
    /* 12 */ { type: 'action', action: 'set_flag', flag: 'act2_complete', value: true, next: 13 },
    /* 13 */ { type: 'end' },
  ],

  ross_boss_defeated: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "I... *panting* ...I don't even know what just happened." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: 'Was I... did I just fight you? With corporate buzzwords?' },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "You tried to 'circle back' on me three times, Ross." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "I know. I know. I'm... I'm sorry, man. I think I had a corporate break." },
    /* 4  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Ross, honey, you need a vacation. And a therapist. And to stop reading leadership books.' },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "You're right, Mom. You're always right. Can I have a cookie?" },
    /* 6  */ { type: 'text', speaker: 'Grandma Henderson', text: 'Of course, dear.' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: 'Ross eats a cookie. He starts to cry. It is somehow the most normal thing that has happened all week.' },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'ross_defeated', value: true },
    /* 9  */ { type: 'text', speaker: 'Grandma Henderson', text: "Well. Now that Ross has gotten that out of his system..." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: 'The overhead lights surge. Every screen in the office flickers to the same image: a trust document, dated 1947, scrolling endlessly.' },
    /* 11 */ { type: 'text', speaker: 'Ross', text: "Mom... what's happening to the building?" },
    /* 12 */ { type: 'text', speaker: 'Grandma Henderson', text: "It's waking up. I was afraid of this." },
    /* 13 */ { type: 'text', speaker: 'Grandma Henderson', text: "The Henderson Trust isn't the only thing that's been mismanaged, Andrew. This building... has a longer memory than any of us." },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: 'The Janitor appears in the doorway. His expression is grim. His Rolex is glowing.' },
    /* 15 */ { type: 'text', speaker: 'Mysterious Janitor', text: "It's started. I hoped we'd have more time." },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: 'Your phone buzzes. A text from Alex: "DUDE. Every server just rebooted. The encrypted partition is BROADCASTING. Something is VERY wrong."' },
    /* 17 */ { type: 'action', action: 'set_flag', flag: 'act2_complete', value: true, next: 18 },
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
    { type: 'text', speaker: 'Narrator', text: 'Below it: "It was Alex." Below THAT: "No it wasn\'t. — Alex (sent from my phone in the server room, which has no microwave)"' },
    { type: 'text', speaker: 'Narrator', text: 'The microwave beeps once, unprompted. You back away slowly.' },
    { type: 'end' },
  ],

  dying_plant: [
    { type: 'text', speaker: 'Narrator', text: 'A plant that has given up on photosynthesis as a lifestyle.' },
    { type: 'text', speaker: 'Narrator', text: 'A label reads: "Mr. Fernsworth III — Ross\'s Responsibility Since 2021."' },
    { type: 'text', speaker: 'Narrator', text: 'Mr. Fernsworth III has clearly not been watered since 2021. His leaves are the color of compliance documentation.' },
    { type: 'text', speaker: 'Narrator', text: 'A tiny post-it on the pot reads: "help me" in suspiciously plant-like handwriting.' },
    { type: 'end' },
  ],

  // --- Cubicle Farm posters ---
  poster_cf_1: [
    { type: 'text', speaker: 'Narrator', text: '"SYNERGY" — printed over a stock photo of six people fist-bumping over a laptop. Nobody in this building has ever fist-bumped. Not once.' },
    { type: 'text', speaker: 'Narrator', text: 'A sticker has been added: "This word has appeared in 6 consecutive quarterly reviews. We looked it up. No one agrees what it means."' },
    { type: 'text', speaker: 'Andrew', text: 'I have already been here four hours and I feel less synergized than when I arrived.' },
    { type: 'end' },
  ],
  poster_cf_2: [
    { type: 'text', speaker: 'Narrator', text: '"RISE AND GRIND" — a man staring at a laptop at 2 AM surrounded by empty coffee cups. The stock graph behind him is going up. His posture is going down.' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "Sleep is a recovery mechanism. Recovery is for the inefficient."' },
    { type: 'text', speaker: 'Andrew', text: 'Who approved this? Who looked at this and said: yes, this will help.' },
    { type: 'end' },
  ],
  poster_cf_3: [
    { type: 'text', speaker: 'Narrator', text: '"TOGETHER WE ACHIEVE MORE" — geese flying in a V formation at sunset.' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print: "The goose at the front does 47% more aerodynamic work. The geese at the back have never mentioned this. This is called professionalism."' },
    { type: 'text', speaker: 'Andrew', text: 'I am the front goose. I have always been the front goose.' },
    { type: 'end' },
  ],
  poster_cf_4: [
    { type: 'text', speaker: 'Narrator', text: '"GOOD ENOUGH IS THE ENEMY OF GREAT" — an eagle soaring alone over a mountain range.' },
    { type: 'text', speaker: 'Narrator', text: 'In red marker beneath: "What\'s the enemy of getting home before 8 PM? This poster."' },
    { type: 'text', speaker: 'Narrator', text: 'In a second handwriting: "HR has been notified about the marker. - Facilities"' },
    { type: 'text', speaker: 'Narrator', text: 'In a third handwriting: "HR IS the marker. - Anonymous"' },
    { type: 'end' },
  ],
  poster_cf_5: [
    { type: 'text', speaker: 'Narrator', text: '"COLLABORATE. INNOVATE. DISRUPT." — hands stacking on top of each other in a team huddle.' },
    { type: 'text', speaker: 'Narrator', text: 'Small print: "Disruption is encouraged unless it disrupts the existing hierarchy, workflow, budget cycle, or Ross\'s standing lunch order."' },
    { type: 'Andrew', speaker: 'Andrew', text: 'I\'m going to disrupt my way right out of this building.' },
    { type: 'end' },
  ],
  poster_cf_6: [
    { type: 'text', speaker: 'Narrator', text: '"YOUR ONLY COMPETITION IS WHO YOU WERE YESTERDAY" — a man sprinting alone on a track.' },
    { type: 'text', speaker: 'Narrator', text: 'Someone has drawn an arrow pointing to the runner and written: "Yesterday-him also had dental. Think about that."' },
    { type: 'text', speaker: 'Andrew', text: 'Yesterday-me did not know about the Henderson trust. Yesterday-me was thriving.' },
    { type: 'end' },
  ],
  poster_cf_7: [
    { type: 'text', speaker: 'Narrator', text: '"THERE IS NO \'I\' IN TEAM"' },
    { type: 'text', speaker: 'Narrator', text: 'In neat handwriting below: "There is no \'I\' in team, but there IS an \'I\' in \'I didn\'t get credit for this.\' Just saying."' },
    { type: 'text', speaker: 'Narrator', text: 'In a different handwriting: "There is also an \'I\' in \'individual performance review.\' - Janet"' },
    { type: 'end' },
  ],

  // --- Break Room poster ---
  poster_br_1: [
    { type: 'text', speaker: 'Narrator', text: '"RECHARGE. REFUEL. RETURN." — a smiling woman holding a coffee mug, looking rested and purposeful.' },
    { type: 'text', speaker: 'Narrator', text: 'The word RETURN is bolded. Underlined. Italicized. Someone added an asterisk. The asterisk says: "You have 14 minutes. The coffee takes 3."' },
    { type: 'text', speaker: 'Andrew', text: 'This poster is not about wellness. This poster is about compliance.' },
    { type: 'end' },
  ],

  // --- Reception posters ---
  poster_rec_1: [
    { type: 'text', speaker: 'Narrator', text: '"FIRST IMPRESSIONS ARE PERMANENT" — a confident handshake silhouetted against a city skyline.' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "Smile. Even if you don\'t mean it. Especially if you don\'t mean it. The client can tell the difference, and they prefer the lie."' },
    { type: 'text', speaker: 'Andrew', text: 'This is the most honest dishonest thing I have ever read.' },
    { type: 'end' },
  ],
  poster_rec_2: [
    { type: 'text', speaker: 'Narrator', text: '"SERVICE IS OUR PROMISE" — a woman beaming into a headset.' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print: "Our promise is subject to staffing levels, current hold times, and the emotional bandwidth of whoever happens to answer."' },
    { type: 'text', speaker: 'Narrator', text: 'A sticky note from Diane: "Average hold time is currently 38 minutes. The promise is aspirational."' },
    { type: 'end' },
  ],
  poster_rec_3: [
    { type: 'text', speaker: 'Narrator', text: '"YOUR CLIENT IS NOT A NUMBER" — two people shaking hands warmly over a desk.' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print: "They are, however, a revenue event with associated compliance obligations, AML screening requirements, and a billable relationship tier. But not a number."' },
    { type: 'text', speaker: 'Andrew', text: 'Client #4471 is waiting for me right now. I did not name them that. The system did.' },
    { type: 'end' },
  ],

  // --- Conference Room poster ---
  poster_conf_1: [
    { type: 'text', speaker: 'Narrator', text: '"ALIGNMENT IS NOT A DESTINATION. IT IS A PROCESS." — silhouettes around a boardroom table, all leaning slightly forward.' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "This process is estimated to take 4–6 working sessions, one sub-committee, a steering group debrief, and a retrospective on the debrief."' },
    { type: 'text', speaker: 'Andrew', text: 'I have been in alignment meetings about the alignment meeting schedule. This poster understands me.' },
    { type: 'end' },
  ],

  // --- Executive Floor posters ---
  poster_exec_1: [
    { type: 'text', speaker: 'Narrator', text: '"LEADERSHIP IS NOT A TITLE. IT IS A RESPONSIBILITY." — a lone eagle on a cliff at dawn, chrome-framed, museum-quality lighting.' },
    { type: 'text', speaker: 'Narrator', text: 'Embossed gold text beneath: "Also a salary bracket. Primarily a salary bracket. The responsibility part is for the quarterly report."' },
    { type: 'text', speaker: 'Andrew', text: 'This frame costs more than my monthly rent.' },
    { type: 'end' },
  ],
  poster_exec_2: [
    { type: 'text', speaker: 'Narrator', text: '"RESULTS SPEAK LOUDER THAN EFFORT" — a businessman standing triumphant at a summit, tie blowing in the wind.' },
    { type: 'text', speaker: 'Narrator', text: 'Fine print, in the smallest font legally possible: "Effort is noted and appreciated in lieu of compensation adjustments for the current fiscal cycle."' },
    { type: 'text', speaker: 'Andrew', text: 'There is a regional manager thirty feet from this poster. The irony is structural.' },
    { type: 'end' },
  ],
  poster_exec_3: [
    { type: 'text', speaker: 'Narrator', text: '"WE DON\'T HAVE EMPLOYEES. WE HAVE STAKEHOLDERS." — diverse hands around a boardroom table.' },
    { type: 'text', speaker: 'Narrator', text: 'In small script at the bottom: "Stakeholders are not entitled to equity. The terminology is aspirational. This distinction was clarified in the 2019 handbook revision, section 4, paragraph 11."' },
    { type: 'text', speaker: 'Andrew', text: 'I am a stakeholder with a frozen salary and a broken chair. I am staking nothing.' },
    { type: 'end' },
  ],
  poster_exec_4: [
    { type: 'text', speaker: 'Narrator', text: '"EXCELLENCE IS THE STANDARD. NOT THE CEILING." — a rocket launching against a twilight sky. The frame is gold. Real gold, probably.' },
    { type: 'text', speaker: 'Narrator', text: 'The rocket in this photo cost $2.3 million to produce. It is a stock image. They paid $149 for the license.' },
    { type: 'text', speaker: 'Andrew', text: 'My last raise was 1.2%. Before inflation. The rocket mocks me.' },
    { type: 'end' },
  ],

  // --- Stairwell poster ---
  poster_stair_1: [
    { type: 'text', speaker: 'Narrator', text: '"SUCCESS IS A STAIRCASE, NOT AN ELEVATOR" — a winding staircase ascending into light.' },
    { type: 'text', speaker: 'Narrator', text: 'Someone has added in permanent marker: "The elevator is also broken. This is not a metaphor. Maintenance has been notified since March. It is October."' },
    { type: 'text', speaker: 'Andrew', text: 'I am literally on the stairs. The poster is right here. The irony is physical.' },
    { type: 'end' },
  ],

  // --- HR Department poster ---
  poster_hr_1: [
    { type: 'text', speaker: 'Narrator', text: '"PEOPLE ARE OUR GREATEST ASSET" — a smiling, diverse team photo, soft lighting, everyone inexplicably happy to be at work.' },
    { type: 'text', speaker: 'Narrator', text: 'Sub-heading: "Assets are subject to annual review, reallocation, write-downs, and depreciation over a standard amortization schedule."' },
    { type: 'text', speaker: 'Andrew', text: 'This poster is hanging in the HR department. I don\'t know if that\'s a threat or an apology.' },
    { type: 'end' },
  ],

  ross_desk: [
    { type: 'text', speaker: 'Narrator', text: 'Ross\'s desk. Dual monitors, both displaying LinkedIn motivational posts.' },
    { type: 'text', speaker: 'Narrator', text: 'A "#1 Boss" mug sits front and center. The receipt is still in the mug. Ross bought it for himself.' },
    { type: 'text', speaker: 'Narrator', text: 'There\'s a framed photo of Ross shaking hands with someone important-looking. On closer inspection, the "important person" is just Ross in a different suit, from a different angle.' },
    { type: 'text', speaker: 'Narrator', text: 'A golf putter leans against the wall. A Post-it on it reads: "PRACTICE STROKES = PRACTICE LEADERSHIP"' },
    { type: 'end' },
  ],

  conference_whiteboard: [
    { type: 'text', speaker: 'Narrator', text: 'The whiteboard is covered in Ross\'s "strategic planning."' },
    { type: 'text', speaker: 'Narrator', text: 'It\'s a flowchart: "SYNERGY → DISRUPT → INNOVATE → LEVERAGE → SYNERGY (repeat)"' },
    { type: 'text', speaker: 'Narrator', text: 'Someone (Alex) wrote underneath: "This is just a circle." Ross responded: "Circles are the strongest shape. Like our TEAM."' },
    { type: 'text', speaker: 'Narrator', text: 'In the corner, barely visible: "I\'ve been here 3 months and I still don\'t know what we do — The Intern"' },
    { type: 'end' },
  ],

  server_rack_inspect: [
    /* 0 */ { type: 'text', speaker: 'Narrator', text: 'Row upon row of blinking servers. The hum is almost hypnotic.' },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'One server has a sticky note: "DO NOT UNPLUG — contains 73% of all trust account records. The other 27% is vibes."' },
    /* 2 */ { type: 'text', speaker: 'Narrator', text: 'Another note: "This one runs Doom. For stress testing purposes. — Alex"' },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: 'A third note, much older: "admin_legacy — DO NOT DECOMMISSION — R.M."' },
    /* 4 */ { type: 'text', speaker: 'Narrator', text: 'The servers emit a sound somewhere between a whisper and a scream. Probably just the cooling fans.', next: 5 },
    /* 5 */ { type: 'condition', flag: 'server_secret_started', ifTrue: 9, ifFalse: 6 },
    /* 6 */ { type: 'condition', flag: 'met_alex_it', ifTrue: 7, ifFalse: 9 },
    /* 7 */ { type: 'action', action: 'quest_update', quest: 'side_server_secret', stage: 1, next: 8 },
    /* 8 */ { type: 'action', action: 'set_flag', flag: 'server_secret_started', value: true, next: 9 },
    /* 9 */ { type: 'end' },
  ],

  alex_it_desk: [
    /* 0 */ { type: 'condition', flag: 'printer_quest_started', ifTrue: 5, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'Alex\'s desk is an archaeological dig of snack wrappers and energy drink cans. Stratigraphy suggests habitation since at least 2019.' },
    /* 2 */ { type: 'text', speaker: 'Narrator', text: 'Three monitors: server logs, a Reddit thread about cryptography, and what is unmistakably Minecraft.' },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: 'A sticky note: "BROWSER HISTORY IS ENCRYPTED WITH AES-256. NICE TRY, ROSS."' },
    /* 4 */ { type: 'text', speaker: 'Narrator', text: 'In a drawer (unlocked, because Alex fears nothing), a USB drive labeled "EVIDENCE (BACKUP)" next to a bag of Doritos.', next: 15 },
    // --- Printer quest: Alex explains the toner situation ---
    /* 5 */ { type: 'condition', flag: 'printer_quest_done', ifTrue: 16, ifFalse: 17 },
    /* 6 */ { type: 'text', speaker: 'Alex from IT', text: "Oh. Oh no. It printed something for you, didn't it." },
    /* 7 */ { type: 'text', speaker: 'Alex from IT', text: "Not a question. I've been watching that printer for three years. It's connected to a legacy subnet with read access to all document archives. Including the Henderson files." },
    /* 8 */ { type: 'text', speaker: 'Alex from IT', text: "The toner runs out on purpose — firmware was modified to abort print jobs with certain keywords. Whoever did it didn't expect the printer to get opinions about that." },
    /* 9 */ { type: 'text', speaker: 'Alex from IT', text: "I found old toner stock — pre-2016, before the firmware modification. I've already set it next to the printer. If you install it, the block won't apply and the full document will print." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "Just go install it. I want to know what it's been trying to say as much as you do." },
    /* 11 */ { type: 'action', action: 'quest_update', quest: 'side_printer', stage: 2, next: 12 },
    /* 12 */ { type: 'action', action: 'set_flag', flag: 'printer_toner_quest', value: true, next: 13 },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "Alex slides a dusty toner cartridge across his desk. It has a Post-it note: 'PRE-2016 STOCK. DO NOT USE FOR REGULAR PRINTING.'" },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "Alex's desk. The toner cartridge Alex set aside is near the printer in the cubicle farm." },
    /* 15 */ { type: 'end' },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: "Alex's desk. He's not talking about the printer anymore. A new Post-it on the monitor reads: 'DO NOT REVIVE.'", next: 15 },
    /* 17 */ { type: 'condition', flag: 'printer_toner_quest', ifTrue: 14, ifFalse: 6 },
  ],

  elevator: [
    { type: 'condition', flag: 'branch_chosen', ifTrue: 5, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: 'The elevator to the Executive Floor. A keycard reader blinks red.' },
    /* 2 */ { type: 'text', speaker: 'Narrator', text: 'A sign: "AUTHORIZED PERSONNEL ONLY. If you have to ask, you\'re not authorized. If you ARE authorized, you already know."' },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: 'You don\'t have clearance yet. Maybe after the Henderson situation resolves...' },
    /* 4 */ { type: 'end' },
    /* 5 */ { type: 'text', speaker: 'Narrator', text: 'The elevator light blinks green. Someone upstairs is waiting for you.' },
    /* 6 */ { type: 'end' },
  ],

  reception_desk: [
    { type: 'text', speaker: 'Narrator', text: 'Diane\'s reception desk. The only organized surface in the entire building.' },
    { type: 'text', speaker: 'Narrator', text: 'Color-coded files, alphabetized forms, a pen cup with EXACTLY twelve pens. One is missing. Diane knows which one.' },
    { type: 'text', speaker: 'Narrator', text: 'A small plaque reads: "You don\'t have to be crazy to work here, but your manager probably is."' },
    { type: 'text', speaker: 'Narrator', text: 'Below the plaque, a smaller note: "This is not a joke. — Diane"' },
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
    { type: 'end' },
  ],

  karen_return: [
    { type: 'text', speaker: 'Karen Henderson', text: "I said conference room. Not here. Go." },
    { type: 'end' },
  ],

  grandma_intro: [
    { type: 'text', speaker: 'Grandma Henderson', text: 'Oh my, what a handsome young man. You must be the new trust officer.' },
    { type: 'text', speaker: 'Grandma Henderson', text: '*offers a cookie from a seemingly infinite supply*' },
    { type: 'text', speaker: 'Grandma Henderson', text: 'I\'m just waiting to discuss my late husband\'s trust. No rush, dear. I\'ve been patient for forty years of marriage. I can wait a bit longer.' },
    { type: 'text', speaker: 'Grandma Henderson', text: 'Meet me in the conference room when you\'re ready. And eat the cookie. You look thin.' },
    { type: 'action', action: 'heal' },
    { type: 'end' },
  ],

  grandma_exec_idle: [
    { type: 'text', speaker: 'Grandma Henderson', text: "Oh, this isn't the conference room, dear." },
    { type: 'text', speaker: 'Grandma Henderson', text: "Go find the conference room. I'll be waiting with cookies." },
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
    { type: 'text', speaker: 'The Intern', text: 'Ross said to "make the documents disappear"! I thought he meant literally! Like a magic trick!' },
    { type: 'text', speaker: 'The Intern', text: 'But the budget didn\'t cover a magician so I used the next best thing: the industrial shredder.' },
    { type: 'text', speaker: 'The Intern', text: 'And then the shredder caught fire. And then I put the fire out with coffee. And then the coffee machine broke.' },
    { type: 'text', speaker: 'The Intern', text: 'Anyway, I panicked! And when I panic, I do paperwork! AGGRESSIVE paperwork!' },
    { type: 'text', speaker: 'Narrator', text: 'The Intern grabs a nearby stack of documents and begins hurling them with wild abandon.' },
    { type: 'text', speaker: 'The Intern', text: 'PAPER FIIIIGHT!!!' },
    { type: 'action', action: 'start_combat', encounter: 'intern' },
    { type: 'end' },
  ],

  // ISAIAH — Helpful associate, always helps if asked politely
  isaiah_intro: [
    /* 0  */ { type: 'text', speaker: 'Isaiah', text: 'Hey there! You must be the new trust officer. Welcome to the team.' },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "I'm Isaiah. If you ever need help with anything around here, just ask. I mean it — anything." },
    /* 2  */ { type: 'choice', speaker: 'Isaiah', text: "What can I do for you?", choices: [
      { text: "Could you help me understand how things work here?", next: 3 },
      { text: "Get me a coffee.", next: 7 },
      { text: "Nothing right now, thanks.", next: 9 },
    ]},
    /* 3  */ { type: 'text', speaker: 'Isaiah', text: "Of course! So the trust department handles estate administration, investment management, and fiduciary services." },
    /* 4  */ { type: 'text', speaker: 'Isaiah', text: "Ross runs the show — well, he thinks he does. Janet handles the real paperwork. The Intern... tries." },
    /* 5  */ { type: 'text', speaker: 'Isaiah', text: "If you need documents filed or client records pulled, I'm your guy. Just ask nicely and I'll make it happen." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'met_isaiah', value: true, next: 10 },
    /* 7  */ { type: 'text', speaker: 'Isaiah', text: "...Sure. I'll get you a coffee. But you know, a 'please' goes a long way around here." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'met_isaiah', value: true, next: 10 },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'met_isaiah', value: true, next: 10 },
    /* 10 */ { type: 'text', speaker: 'Isaiah', text: "Anytime you need something, come find me. I'm usually near the water cooler." },
    /* 11 */ { type: 'end' },
  ],

  isaiah_return: [
    /* 0 */ { type: 'text', speaker: 'Isaiah', text: "Hey! Need anything? You know I'm always happy to help." },
    /* 1 */ { type: 'end' },
  ],

  // RACHEL — SVP of Strategic Operations, ice queen
  rachel_intro: [
    /* 0  */ { type: 'text', speaker: 'Rachel', text: '...' },
    /* 1  */ { type: 'text', speaker: 'Rachel', text: "You're the new trust officer." },
    /* 2  */ { type: 'text', speaker: 'Rachel', text: "I'm Rachel. SVP of Strategic Operations. I oversee... everything." },
    /* 3  */ { type: 'text', speaker: 'Rachel', text: "I've read your file. Interesting background. Let's see if it translates to results." },
    /* 4  */ { type: 'choice', speaker: 'Rachel', text: "I trust Ross has briefed you on the Henderson situation?", choices: [
      { text: "Yes, he was very... thorough.", next: 5 },
      { text: "He mostly talked about synergy.", next: 7 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Rachel', text: "Mm. 'Thorough' isn't a word I'd associate with Ross. But I appreciate your diplomacy." },
    /* 6  */ { type: 'text', speaker: 'Rachel', text: "I'll be watching your performance closely. This department has been... underperforming. That will change." },
    /* 7  */ { type: 'text', speaker: 'Rachel', text: "Of course he did. Ross treats management theory like a religion. Unfortunately, he's a bad practitioner." },
    /* 8  */ { type: 'text', speaker: 'Rachel', text: "Results, Andrew. That's what matters to me. Not synergy. Not paradigm shifts. Results." },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'met_rachel', value: true, next: 10 },
    /* 10 */ { type: 'text', speaker: 'Rachel', text: "We'll speak again. Soon." },
    /* 11 */ { type: 'end' },
  ],

  rachel_return: [
    /* 0 */ { type: 'text', speaker: 'Rachel', text: "I don't have time for small talk. Do you have results?" },
    /* 1 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 3 -- THE DEEPER LEDGER
  // ==========================================================================

  // --------------------------------------------------------------------------
  // ACT 3 NPC DIALOGS — triggered when actIndex >= 3
  // --------------------------------------------------------------------------

  alex_it_act3: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: "DUDE. You're here. Good. Close the door. Lock it. No, unlock it, locking is suspicious. Just... stand in front of it." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "Okay. So. The encrypted partition? The one that's been pinging the Caymans since 2016?" },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "It just decrypted itself. Not 'I cracked it' decrypted. ITSELF. Like it WANTED to be found." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "And what's inside is... it's a shadow ledger. Every trust account this branch has ever managed. Parallel books." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "Not just the Hendersons. Dozens of accounts. Hundreds of small adjustments. Basis point skims. Fee reallocations. All traced back to one account: admin_legacy." },
    /* 5  */ { type: 'choice', speaker: 'Alex from IT', text: "Someone's been running a shadow trust system for EIGHT YEARS. And the building's servers just... revealed it. On purpose.", choices: [
      { text: "Who created admin_legacy?", next: 6 },
      { text: "What do you mean the building revealed it on purpose?", next: 10 },
      { text: "How much money are we talking about?", next: 14 },
    ]},
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "The account metadata traces back to an IP address on the executive floor. Created 2006. The username format matches old Vaults Fargo sysadmin conventions." },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "But here's the thing — the Janitor told me something. When he was SVP, there was a server room in the basement. The Archive. It had the original trust records going back to 1947." },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "The Archive was sealed in 2016. Same year admin_legacy was created. Coincidence? In this building, nothing is a coincidence." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "I need you to find the Archive. There's supposed to be access through the back corridor. Some kind of old passage behind the north wall." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "Bro. I know how it sounds. But listen. The decryption key that was used? It's not any standard algorithm I've seen." },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "It's a hash of a trust document. A SPECIFIC trust document. Dated 1947. The original Vaults Fargo branch charter." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "Someone — or something — used a 77-year-old legal document as a cryptographic key. And then used it to unlock itself." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Either this building has a very sophisticated automated system nobody told me about, or... I don't know, man. Buildings don't have opinions. Usually." },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "Conservative estimate? $23 million across all accounts over eight years. The Henderson Trust was the biggest target — $2 million — but it wasn't the only one." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "This is FINRA territory. SEC territory. Possibly FBI territory. We're talking systematic breach of fiduciary duty at an institutional level." },
    /* 16 */ { type: 'text', speaker: 'Alex from IT', text: "And the only person who had consistent executive access across all eight years is the Regional Manager. He rotated through three other branches but kept 'oversight' of this one." },
    /* 17 */ { type: 'text', speaker: 'Alex from IT', text: "But we need proof. Physical proof. The digital trail isn't enough — they'll say I fabricated it. We need the original trust records from the Archive." },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'alex_it_act3_done', value: true, next: 19 },
    /* 19 */ { type: 'action', action: 'set_flag', flag: 'archive_accessible', value: true, next: 20 },
    /* 20 */ { type: 'text', speaker: 'Alex from IT', text: "Find the Archive. The Janitor might know how to get in. And Andrew — be careful. If the Regional Manager finds out we're looking..." },
    /* 21 */ { type: 'text', speaker: 'Alex from IT', text: "Well. Let's just say 'restructuring' isn't always a metaphor." },
    /* 22 */ { type: 'end' },
  ],

  janet_act3: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "Andrew. Close the door. *very aggressive sip*" },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "Have you noticed anything... weird today? The lights keep flickering. The elevator went to a floor that doesn't exist. And my computer printed a document I didn't write." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "It was a trust account statement from 1987. I wasn't even WORKING here in 1987. I was in middle school. Badly." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "Also — and this is the part that's making me drink faster — there's a woman on the executive floor I've never seen before." },
    /* 4  */ { type: 'text', speaker: 'Janet', text: "Silver hair. Navy suit. Looks at everyone like she's calculating their net worth and finding it insufficient." },
    /* 5  */ { type: 'text', speaker: 'Janet', text: "Someone said her name is Rachel. SVP of Strategic Operations. Nobody knew we HAD a Strategic Operations." },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "She's been in Ross's office for two hours. Ross hasn't said 'synergy' once. That's how I know it's serious." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: "*extremely long sip* I'm switching to the emergency reserves." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'read_janet_act3', value: true, next: 9 },
    /* 9  */ { type: 'end' },
  ],

  ross_act3: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew. Hey. Come in. Sit down. Actually, don't sit down. Actually... I don't know. Everything is weird today." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "So. There's a woman from corporate here. Rachel. She's... she's doing a review." },
    /* 2  */ { type: 'text', speaker: 'Ross', text: "A 'comprehensive operational assessment.' That's corporate for 'finding reasons to fire people.'" },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "She asked me about the Henderson Trust. About our procedures. About our... 'fiduciary controls.'" },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "I tried to use buzzwords. They bounced off her like... like buzzwords bouncing off a wall. She's immune. Nobody's ever been immune before." },
    /* 5  */ { type: 'choice', speaker: 'Ross', text: "Andrew, I'm scared. Is it okay to say that? Leadership books say you're never supposed to say that.", choices: [
      { text: "It's okay to be scared, Ross.", next: 6 },
      { text: "What does Rachel actually want?", next: 8 },
    ]},
    /* 6  */ { type: 'text', speaker: 'Ross', text: "Really? Because 'Dare to Lead' says fear is just 'an unrealized growth metric.' But it doesn't feel like a growth metric. It feels like fear." },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "Thanks, Andrew. You're... you're a good employee. And maybe also a good person. I'm realizing those might be different things." },
    /* 8  */ { type: 'text', speaker: 'Ross', text: "She wants to 'optimize' the trust department. Which I think means cutting half of us and making the other half do twice the work." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "She mentioned something about 'legacy systems' and 'archival redundancies.' I think she's talking about the old records in the basement." },
    /* 10 */ { type: 'text', speaker: 'Ross', text: "Also she asked about the Janitor. By name. Which is weird because nobody knows the Janitor's actual name. I just call him 'sir' because he scares me a little." },
    /* 11 */ { type: 'action', action: 'set_flag', flag: 'read_ross_act3', value: true, next: 12 },
    /* 12 */ { type: 'end' },
  ],

  intern_act3: [
    /* 0  */ { type: 'text', speaker: 'The Intern', text: "Aiden! I mean Andrew! I mean... whoever you are, HELP." },
    /* 1  */ { type: 'text', speaker: 'The Intern', text: "The lady from corporate — Rachel — she asked me for 'all Henderson-related documentation from the past five years.'" },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "I may have... accidentally told her about the shredding. And the fire. And the coffee machine." },
    /* 3  */ { type: 'text', speaker: 'The Intern', text: "She wrote something on her tablet. I think it was 'terminate.' She might have been playing Wordle but I'm NOT optimistic." },
    /* 4  */ { type: 'text', speaker: 'The Intern', text: "Also something really weird happened. I was alone in the copy room and the printer turned on by itself." },
    /* 5  */ { type: 'text', speaker: 'The Intern', text: "It printed a list of names. People who used to work here. Some of them going back to the '40s. And at the bottom it said 'THE CHARTER REMEMBERS.'" },
    /* 6  */ { type: 'text', speaker: 'The Intern', text: "I don't know what that means and I'm choosing not to find out. I'm going to go reorganize the supply closet by color. And also hide." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'read_intern_act3', value: true, next: 8 },
    /* 8  */ { type: 'end' },
  ],

  diane_act3: [
    /* 0  */ { type: 'text', speaker: 'Diane', text: "Andrew. I need to talk to you. Privately." },
    /* 1  */ { type: 'text', speaker: 'Diane', text: "Rachel — the SVP from corporate — she's not just doing a review. I've been watching her. She's been accessing old personnel files. Trust records from before my time." },
    /* 2  */ { type: 'text', speaker: 'Diane', text: "She asked me about the Archive. The old records room in the sub-basement. It's been sealed since 2016." },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "I told her I didn't have access. Which is true. But I didn't tell her that the Janitor does." },
    /* 4  */ { type: 'text', speaker: 'Diane', text: "Andrew, I've worked here for twelve years. I've seen managers come and go. Regional directors. SVPs. None of them ever asked about the Archive." },
    /* 5  */ { type: 'text', speaker: 'Diane', text: "Whatever's down there, Rachel doesn't want you to find it first. So maybe you should." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'read_diane_act3', value: true, next: 7 },
    /* 7  */ { type: 'end' },
  ],

  janitor_act3: [
    /* 0  */ { type: 'text', speaker: 'Mysterious Janitor', text: "I've been expecting you, Andrew." },
    /* 1  */ { type: 'text', speaker: 'Mysterious Janitor', text: "You felt it too, didn't you? The building shifting. The lights. The printer." },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Let me tell you something I should have told you on your first day." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "When this branch was chartered in 1947, the founders wrote something into the original trust charter. Not a legal clause. Something... older." },
    /* 4  */ { type: 'text', speaker: 'Mysterious Janitor', text: "A declaration that the fiduciary duty of this institution was not just to its clients but to the concept of trust itself. The actual, philosophical concept." },
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Decades of promises. Decades of people putting their faith in this building. Their estates. Their families' futures. All of that faith... accumulated." },
    /* 6  */ { type: 'choice', speaker: 'Mysterious Janitor', text: "This building is alive, Andrew. It has been for a very long time.", choices: [
      { text: "That's impossible.", next: 7 },
      { text: "The Fiduciary Force.", next: 11 },
    ]},
    /* 7  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Is it? You've seen the printer. You've felt the elevator. You've watched documents appear from nowhere." },
    /* 8  */ { type: 'text', speaker: 'Mysterious Janitor', text: "This building was built on trust. Literal trust. Fiduciary trust. And when someone breaches that trust — really, fundamentally breaches it — the building reacts." },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Why do you think I stayed? Twenty-two years as SVP, and then I picked up a mop. Because someone needs to watch." },
    /* 10 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The Fiduciary Force. That's what the founders called it. The accumulated weight of every promise made within these walls." },
    /* 11 */ { type: 'text', speaker: 'Mysterious Janitor', text: "You're quick. Good. The Fiduciary Force is waking up because someone has been violating the charter for eight years. The admin_legacy account. The shadow ledger." },
    /* 12 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Every skimmed basis point. Every redirected fee. The building felt each one. And now it's reached a threshold." },
    /* 13 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The Archive has the original records. The 1947 charter. The proof of what this institution was SUPPOSED to be." },
    /* 14 */ { type: 'text', speaker: 'Mysterious Janitor', text: "I can get you in. Through the back corridor — north end. Use this keycard." },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'has_archive_key', value: true, next: 16 },
    /* 16 */ { type: 'action', action: 'give_item', item: 'compliance_manual', quantity: 1, next: 17 },
    /* 17 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Take my old compliance manual too. You'll need it where you're going." },
    /* 18 */ { type: 'text', speaker: 'Mysterious Janitor', text: "And Andrew — be careful in the Archive. The building protects its secrets. Not everything down there wants to be found." },
    /* 19 */ { type: 'action', action: 'set_flag', flag: 'janitor_confronted', value: true, next: 20 },
    /* 20 */ { type: 'action', action: 'set_flag', flag: 'read_janitor_act3', value: true, next: 21 },
    /* 21 */ { type: 'end' },
  ],

  isaiah_act3: [
    /* 0  */ { type: 'text', speaker: 'Isaiah', text: "Hey Andrew. I've been hearing things. Weird things." },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "The woman from corporate — Rachel — she asked me to compile a list of everyone in the trust department and their 'redundancy potential.'" },
    /* 2  */ { type: 'text', speaker: 'Isaiah', text: "I told her I'd get right on it. Politely. Then I immediately came to find you." },
    /* 3  */ { type: 'choice', speaker: 'Isaiah', text: "What's going on? Can I help?", choices: [
      { text: "We're investigating something big. Could use your help.", next: 4, flag: 'isaiah_friendly', flagValue: 2 },
      { text: "Stay out of it. It's safer for you.", next: 7 },
    ]},
    /* 4  */ { type: 'text', speaker: 'Isaiah', text: "I knew it. The building's been... strange. I thought it was just me." },
    /* 5  */ { type: 'text', speaker: 'Isaiah', text: "Whatever you need — filing, research, distraction — I'm in. Just ask nicely." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'isaiah_act3_allied', value: true, next: 9 },
    /* 7  */ { type: 'text', speaker: 'Isaiah', text: "I appreciate the concern. But I've been here long enough to know when something needs fixing." },
    /* 8  */ { type: 'text', speaker: 'Isaiah', text: "I'll keep my head down, but if you change your mind, you know where to find me." },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'read_isaiah_act3', value: true, next: 10 },
    /* 10 */ { type: 'end' },
  ],

  rachel_act3: [
    /* 0  */ { type: 'text', speaker: 'Rachel', text: "Andrew. I've been reviewing your work on the Henderson Trust." },
    /* 1  */ { type: 'text', speaker: 'Rachel', text: "Interesting approach. Unconventional. Some might say reckless." },
    /* 2  */ { type: 'text', speaker: 'Rachel', text: "I'm here to ensure this department meets corporate standards. Standards that, frankly, it has not been meeting." },
    /* 3  */ { type: 'text', speaker: 'Rachel', text: "Ross is a competent motivational speaker. As a department head, however, he leaves much to be desired." },
    /* 4  */ { type: 'choice', speaker: 'Rachel', text: "I have plans for this department. Big plans. You could be part of them.", choices: [
      { text: "What kind of plans?", next: 5 },
      { text: "I'm happy with how things are.", next: 8 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Rachel', text: "Optimization. Modernization. Eliminating redundancies. This department has twelve people doing work that six could handle." },
    /* 6  */ { type: 'text', speaker: 'Rachel', text: "I've identified several positions for... reassignment. But someone with your results could have a future here." },
    /* 7  */ { type: 'text', speaker: 'Rachel', text: "Think about it. And don't waste time on 'investigations.' I know what Alex from IT has been doing in that server room. It stops now." },
    /* 8  */ { type: 'text', speaker: 'Rachel', text: "'Happy.' That's a luxury, Andrew. Not a strategy." },
    /* 9  */ { type: 'text', speaker: 'Rachel', text: "This department will change. The question is whether you're driving the change or being driven over by it." },
    /* 10 */ { type: 'action', action: 'set_flag', flag: 'read_rachel_act3', value: true, next: 11 },
    /* 11 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ARCHIVE ROOM INTERACTIONS
  // --------------------------------------------------------------------------

  archive_terminal: [
    /* 0  */ { type: 'condition', flag: 'has_archive_password', ifTrue: 3, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Archive Terminal', text: "ACCESS DENIED. AUTHORIZATION CODE REQUIRED. Contact the Compliance Officer for clearance." },
    /* 2  */ { type: 'end' },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "A CRT monitor coated in dust. The keyboard has keys that haven't been pressed since the Obama administration." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "You press Enter. The screen flickers to life. Green text on black. It reads:" },
    /* 5  */ { type: 'text', speaker: 'Archive Terminal', text: "VAULTS FARGO TRUST ARCHIVE — BRANCH 4471 — ESTABLISHED 1947" },
    /* 6  */ { type: 'text', speaker: 'Archive Terminal', text: "WARNING: UNAUTHORIZED ACCESS DETECTED. FIDUCIARY INTEGRITY CHECK... PASSED." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "'Fiduciary integrity check'? The terminal is checking if I'm trustworthy?" },
    /* 8  */ { type: 'text', speaker: 'Archive Terminal', text: "DISPLAYING: ADMIN_LEGACY TRANSACTION LOG — 2016 TO PRESENT" },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: "Rows and rows of transactions scroll by. Small amounts. $50 here. $200 there. Fee adjustments. Basis point modifications. All from the same account." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "At the bottom, a total: $23,478,912.20. Skimmed from 47 trust accounts over eight years." },
    /* 11 */ { type: 'text', speaker: 'Andrew', text: "Twenty-three million dollars. My God." },
    /* 12 */ { type: 'text', speaker: 'Archive Terminal', text: "PRINT EVIDENCE? [Y/N]" },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "You press Y. A dot-matrix printer in the corner whirs to life and produces a thick stack of transaction records." },
    /* 14 */ { type: 'action', action: 'set_flag', flag: 'has_archive_evidence', value: true, next: 15 },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: "Alex was right. Now we have the proof." },
    /* 16 */ { type: 'end' },
  ],

  archive_cabinets: [
    /* 0  */ { type: 'condition', flag: 'archive_filing_done', ifTrue: 9, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Filing cabinets stretch from floor to ceiling. Each is labeled with a year, going back to 1947." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Most are locked. But five cabinets are ajar, their locks rusted open: 1947, 1971, 1993, 2006, and 2016." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "1947: The original branch charter. Yellowed paper. The ink has a faint gold shimmer that shouldn't be possible." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "1971: A restructuring memo. The trust department was nearly shut down. A janitor — the FIRST janitor — filed a motion to preserve it." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "1993: Performance reviews for a young trust officer. The name is familiar: it's the Janitor. Top marks in every category." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "2006: A system access request for 'admin_legacy.' Approved by the Regional Manager. No other signatures." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "2016: A memo ordering the Archive sealed. 'Redundant records. Digital migration complete.' Signed by the Regional Manager." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'archive_filing_done', value: true, next: 10 },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: "The filing cabinets stand like silent witnesses. You've read enough to understand the pattern." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "The timeline is clear: the Regional Manager created the shadow account, then sealed the evidence. The building's been waiting for someone to open these drawers." },
    /* 11 */ { type: 'end' },
  ],

  stairwell_graffiti: [
    /* 0  */ { type: 'condition', flag: 'act2_complete', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The corridor walls are concrete. Someone has scratched into them: 'TRUST FALLS — FLOOR COUNT: 17'" },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Below it: 'If found, return to the 6th floor. Or don't. — The Intern (probably)'" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The corridor echoes with the hum of the building. It sounds almost... intentional." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "New graffiti has appeared since last time. In gold ink that shouldn't exist on concrete:" },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "'THE FIDUCIARY FORCE IS NOT A METAPHOR.'" },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "Below it, in different handwriting: 'Neither is my mop. — J'" },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "The gold ink pulses faintly. You're not imagining it." },
    /* 8  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ACT 3 COMBAT DIALOGS — Security Guard encounter in Archive
  // --------------------------------------------------------------------------

  security_guard_combat: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "A security guard steps out from behind a row of filing cabinets. He does not look friendly." },
    /* 1  */ { type: 'text', speaker: 'Security Guard', text: "Hold it. This area is restricted. I don't care what keycard you have." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "I'm a trust officer. I have authorization to—" },
    /* 3  */ { type: 'text', speaker: 'Security Guard', text: "You have authorization to LEAVE. The Regional Manager gave me specific orders: nobody accesses these records." },
    /* 4  */ { type: 'text', speaker: 'Security Guard', text: "Now turn around, or I'll file a security incident report. And NOBODY wants to deal with that paperwork." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "I can't do that. There are trust accounts being—" },
    /* 6  */ { type: 'text', speaker: 'Security Guard', text: "Wrong answer." },
    /* 7  */ { type: 'action', action: 'start_combat', encounter: 'security_guard', next: 8 },
    /* 8  */ { type: 'end' },
  ],

  security_guard_defeated: [
    /* 0  */ { type: 'text', speaker: 'Security Guard', text: "Alright, alright! I'm just doing my job, man. The Regional Manager pays extra for 'archive duty.' I didn't ask questions." },
    /* 1  */ { type: 'text', speaker: 'Security Guard', text: "But between you and me? He's been down here three times this month. Always after hours. Always alone." },
    /* 2  */ { type: 'text', speaker: 'Security Guard', text: "I don't know what he's hiding, but it's not my problem anymore. I'm going back to the lobby." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'security_guard_info', value: true, next: 4 },
    /* 4  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ACT 4 -- THE TRUST AWAKENS
  // --------------------------------------------------------------------------

  // Act 4 starts when player returns evidence to Alex from IT
  act4_trigger: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: "You found it. The transaction logs. The filing records. The 2006 access request." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "This is everything we need. I can correlate this with the server data and build a complete case." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "As Alex speaks, the monitors in the server room all switch to the same display: the 1947 trust charter." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Uh... I didn't do that." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The text of the charter begins to glow. Not the screen — the TEXT ITSELF, as if the words have weight and light." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "A deep hum resonates through the building. You feel it in your chest. In your teeth. In the space behind your eyes." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "Okay, THAT is not a server issue. That is a BUILDING issue. And I am only certified for server issues." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "Your phone rings. It's Diane." },
    /* 8  */ { type: 'text', speaker: 'Diane', text: "Andrew. Rachel just locked down the entire floor. Security at every exit. Nobody in or out without her approval." },
    /* 9  */ { type: 'text', speaker: 'Diane', text: "She knows. I don't know how, but she knows you've been in the Archive." },
    /* 10 */ { type: 'text', speaker: 'Diane', text: "She's calling an emergency board meeting. She wants to dissolve the trust department entirely." },
    /* 11 */ { type: 'action', action: 'set_flag', flag: 'act3_complete', value: true, next: 12 },
    /* 12 */ { type: 'action', action: 'set_flag', flag: 'rachel_lockdown', value: true, next: 13 },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Dissolve the— she can't DO that. Can she?" },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "Not if we can prove what the Regional Manager has been doing. We need to rally the team — find Janet at her desk, Diane in reception, and the Mysterious Janitor in the Archive." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "The Janitor's been waiting for this moment for twenty years. And once you have Janet and Diane on board, work on convincing Ross — he won't budge without the right words." },
    /* 16 */ { type: 'end' },
  ],

  // Act 4 NPC dialogs
  janet_act4: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "Rally? You want me to RALLY? Andrew, I'm not a rally person. I'm a 'sit quietly and drink' person." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "But... *sip* ...you know what? Fine. You know why?" },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "Because Rachel tried to take my tumbler. Said it was 'unprofessional.' UNPROFESSIONAL." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "This is a $40 insulated wine tumbler with a motivational quote that says 'Rosé All Day' and I will DIE before I surrender it." },
    /* 4  */ { type: 'text', speaker: 'Janet', text: "What do you need from me? I know where every document in this building is. Including the ones Ross hid in the ceiling tiles." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'janet_rallied', value: true, next: 6 },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "I'm in. For the tumbler." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: "...And for the department, I guess. But mostly the tumbler." },
    /* 8  */ { type: 'end' },
  ],

  diane_act4: [
    /* 0  */ { type: 'text', speaker: 'Diane', text: "I've been documenting everything Rachel's done since she arrived. Every meeting. Every access request. Every personnel file she's reviewed." },
    /* 1  */ { type: 'text', speaker: 'Diane', text: "Old habits. I document everything. It's why they haven't been able to fire me for twelve years." },
    /* 2  */ { type: 'text', speaker: 'Diane', text: "Here's what I know: Rachel has been in contact with the Regional Manager. Frequently. Before she even arrived for the 'review.'" },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "This isn't a review, Andrew. This is a cover-up. She's here to bury the evidence before you can use it." },
    /* 4  */ { type: 'text', speaker: 'Diane', text: "The HR Department has the original employment records. If the Janitor was really SVP, there's a paper trail. Rachel can't delete paper." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'diane_rallied', value: true, next: 6 },
    /* 6  */ { type: 'text', speaker: 'Diane', text: "I can get you into the HR Department once the team is fully on board. Talk to the Janitor first — he knows more than any of us." },
    /* 7  */ { type: 'end' },
  ],

  // Convince Ross puzzle — need to use his buzzwords correctly (4 choice points, need 3/4)
  ross_act4: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew. I... I've been thinking. Which is new for me, but I'm trying it." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "Rachel wants to dissolve the department. MY department. The one I built from... okay, I didn't build it. The Janitor built it. But I've been MANAGING it." },
    /* 2  */ { type: 'text', speaker: 'Ross', text: "The thing is... she's not wrong about everything. I haven't been a great leader. I've been a great TALKER. Those are different things." },
    /* 3  */ { type: 'choice', speaker: 'Ross', text: "So tell me, Andrew. Why should I fight for this department?", choices: [
      { text: "Because this department leverages core competencies that can't be outsourced.", next: 4, flag: 'ross_convince_1', flagValue: true },
      { text: "Because you care about your team, Ross.", next: 6 },
    ]},
    /* 4  */ { type: 'text', speaker: 'Ross', text: "'Leverages core competencies'... that's... that's MY phrase. You're speaking my language." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "Okay, I'm listening. But I need more." },
    /* 6  */ { type: 'text', speaker: 'Ross', text: "I DO care about the team. Janet. The Intern. Even Alex, who definitely runs Minecraft on company servers." },
    /* 7  */ { type: 'choice', speaker: 'Ross', text: "But caring isn't a strategy. What's the strategy?", choices: [
      { text: "We disrupt Rachel's narrative by pivoting to a transparency-first paradigm.", next: 8, flag: 'ross_convince_2', flagValue: true },
      { text: "We tell the truth about what's been happening.", next: 10 },
    ]},
    /* 8  */ { type: 'text', speaker: 'Ross', text: "'Disrupt.' 'Pivot.' 'Paradigm.' Andrew, you magnificent bastard. You're speaking fluent Ross." },
    /* 9  */ { type: 'text', speaker: 'Ross', text: "I'm getting FIRED UP. What else?" },
    /* 10 */ { type: 'text', speaker: 'Ross', text: "The truth? The TRUTH? Andrew, the truth is terrifying. The truth is that someone has been stealing from our clients and I didn't notice because I was too busy reading leadership books." },
    /* 11 */ { type: 'choice', speaker: 'Ross', text: "How do we actually win this?", choices: [
      { text: "We need to synergize our stakeholder alignment across all trust verticals.", next: 12, flag: 'ross_convince_3', flagValue: true },
      { text: "We show the board that Rachel is part of the cover-up.", next: 14 },
    ]},
    /* 12 */ { type: 'text', speaker: 'Ross', text: "'SYNERGIZE.' 'STAKEHOLDER ALIGNMENT.' 'TRUST VERTICALS.'" },
    /* 13 */ { type: 'text', speaker: 'Ross', text: "Andrew. That sentence means absolutely nothing. And yet... it means EVERYTHING to me." },
    /* 14 */ { type: 'text', speaker: 'Ross', text: "Rachel is part of it? She's not just reviewing us, she's PROTECTING the person who—" },
    /* 15 */ { type: 'choice', speaker: 'Ross', text: "If that's true, we need to move fast. What's the endgame?", choices: [
      { text: "We circle back to the original charter and leverage our fiduciary moat.", next: 16, flag: 'ross_convince_4', flagValue: true },
      { text: "We go to the board with the evidence. All of it.", next: 18 },
    ]},
    /* 16 */ { type: 'text', speaker: 'Ross', text: "'Circle back.' 'Fiduciary moat.' That's... that's beautiful. I don't know what it means but I feel it in my SOUL." },
    /* 17 */ { type: 'text', speaker: 'Ross', text: "I'm in. Whatever it takes. For the department. For the team. For the synergy." },
    /* 18 */ { type: 'text', speaker: 'Ross', text: "The board. You're right. We take the evidence to the board meeting. All of it." },
    /* 19 */ { type: 'text', speaker: 'Ross', text: "I'm done hiding behind buzzwords. Well... I'm done hiding behind MOST buzzwords. Some of them are load-bearing." },
    /* 20 */ { type: 'action', action: 'set_flag', flag: 'ross_rallied', value: true, next: 21 },
    /* 21 */ { type: 'text', speaker: 'Ross', text: "Let's do this. *finger guns* ...Sorry. Force of habit." },
    /* 22 */ { type: 'end' },
  ],

  intern_act4: [
    /* 0  */ { type: 'text', speaker: 'The Intern', text: "Andrew! I know I'm just an intern — well, a 'Trust Operations Support Specialist' — but I want to help!" },
    /* 1  */ { type: 'text', speaker: 'The Intern', text: "Rachel told me to clean out my desk. Which is harsh because I don't even HAVE a desk. I have a folding table near the fire exit." },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "But I found something! When she told me to shred the Henderson pre-audit files? I didn't shred ALL of them." },
    /* 3  */ { type: 'text', speaker: 'The Intern', text: "I couldn't figure out the shredder setting so some of them came out as really thin strips instead of confetti. I taped them back together!" },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The Intern produces a crumpled sheet of paper that has been reassembled with scotch tape, band-aids, and what appears to be a Fruit Roll-Up wrapper." },
    /* 5  */ { type: 'text', speaker: 'The Intern', text: "It's a memo from the Regional Manager to Rachel. From THREE MONTHS AGO. Before she was supposedly 'assigned' to review us." },
    /* 6  */ { type: 'text', speaker: 'The Intern', text: "It says 'Re: Archive Containment' and then there's a bunch of words I don't understand but 'destroy records' seems pretty clear." },
    /* 7  */ { type: 'text', speaker: 'The Intern', text: "Did I do good? I feel like I did good. This is the best day of my unpaid career!" },
    /* 8  */ { type: 'end' },
  ],

  janitor_needs_ross: [
    /* 0 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Not yet, Andrew. There's one more person who needs to decide where they stand." },
    /* 1 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Talk to Ross. He needs to choose: the buzzwords or the truth. Until he chooses, I have nothing more to give." },
    /* 2 */ { type: 'end' },
  ],

  janitor_act4: [
    /* 0  */ { type: 'text', speaker: 'Mysterious Janitor', text: "You've done well, Andrew. The Archive. The evidence. The team." },
    /* 1  */ { type: 'text', speaker: 'Mysterious Janitor', text: "But there's one more thing you need. The original charter. The 1947 document." },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "It's not in the Archive. I moved it years ago. To the Vault. Behind the Archive." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The Vault has a combination lock. Three numbers. They're scattered across the building — I hid them so no one person could access it alone." },
    /* 4  */ { type: 'text', speaker: 'Mysterious Janitor', text: "One is in the HR Department records. One is in Alex's server room. One is..." },
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "...engraved on the back of this Rolex." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The Janitor removes his gold Rolex and turns it over. On the case back, tiny numbers are engraved: 47." },
    /* 7  */ { type: 'text', speaker: 'Mysterious Janitor', text: "47. For 1947. The year it all began." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'janitor_rallied', value: true, next: 9 },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'vault_code_1', value: true, next: 10 },
    /* 10 */ { type: 'action', action: 'set_flag', flag: 'vault_accessible', value: true, next: 11 },
    /* 11 */ { type: 'action', action: 'set_flag', flag: 'hr_accessible', value: true, next: 12 },
    /* 12 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Find the other two numbers. Open the Vault. Get the charter." },
    /* 13 */ { type: 'text', speaker: 'Mysterious Janitor', text: "And when the time comes to confront Rachel... read it aloud. Every word. Trust me." },
    /* 14 */ { type: 'end' },
  ],

  // HR Department interaction
  hr_rep_intro: [
    /* 0  */ { type: 'condition', flag: 'defeated_hr_rep', ifTrue: 6, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'HR Representative', text: "Welcome to Human Resources! I'm here to help with any concerns. As long as those concerns are pre-approved on Form 27B/6." },
    /* 2  */ { type: 'text', speaker: 'HR Representative', text: "Please note that entering this department constitutes implicit agreement to our 47-page conflict resolution policy." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "I just need to look at some personnel files." },
    /* 4  */ { type: 'text', speaker: 'HR Representative', text: "Personnel files? Those are classified. And by 'classified' I mean I've literally sorted them into classes. A through F. Yours is... well." },
    /* 5  */ { type: 'end' },
    /* 6  */ { type: 'text', speaker: 'HR Representative', text: "...I'm still filing that incident report. In triplicate. The third copy is for my therapist." },
    /* 7  */ { type: 'end' },
  ],

  hr_rep_combat: [
    /* 0  */ { type: 'text', speaker: 'HR Representative', text: "I'm sorry, you can't be in here. This area is restricted during the departmental review." },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: "I need to access the employment records. Historical personnel files." },
    /* 2  */ { type: 'text', speaker: 'HR Representative', text: "Those files are sealed. By order of the SVP of Strategic Operations." },
    /* 3  */ { type: 'text', speaker: 'HR Representative', text: "I'm going to have to ask you to leave. And then attend a mandatory conflict resolution seminar." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "I'm not leaving without those records." },
    /* 5  */ { type: 'text', speaker: 'HR Representative', text: "Then I'm afraid this is going to go on your permanent record. ALL of the records." },
    /* 6  */ { type: 'action', action: 'start_combat', encounter: 'hr_rep', next: 7 },
    /* 7  */ { type: 'end' },
  ],

  hr_rep_defeated: [
    /* 0  */ { type: 'text', speaker: 'HR Representative', text: "Fine. FINE. Take the records. But I'm filing an incident report. In triplicate." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "You search the HR files. In the historical personnel section, you find the Janitor's original employment record." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "'HIRED: 1982. POSITION: Trust Officer. PROMOTED: Senior VP, Trust Administration, 1993. VOLUNTARY RECLASSIFICATION: Facilities, 2005.'" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "Attached to the file is a sticky note with a number: 19. The second vault combination digit." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'vault_code_2', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  // HR vault code (file cabinet in HR department)
  hr_vault_code: [
    /* 0  */ { type: 'condition', flag: 'vault_code_2', ifTrue: 7, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'defeated_hr_rep', ifTrue: 3, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Personnel files, meticulously organized. The drawer labeled 'HISTORICAL — CONFIDENTIAL' has a padlock. The HR Representative eyes you suspiciously." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "With the HR Rep out of commission, you rifle through the historical personnel files." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "'HIRED: 1982. POSITION: Trust Officer. PROMOTED: Senior VP, Trust Administration, 1993. VOLUNTARY RECLASSIFICATION: Facilities, 2005.'" },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Attached to the file is a sticky note with a number: 19. The second vault combination digit." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'vault_code_2', value: true, next: 7 },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "You've already found what you need in these files. The Janitor's employment record — and the second vault code." },
    /* 8  */ { type: 'end' },
  ],

  // Server room vault code
  server_vault_code: [
    /* 0  */ { type: 'condition', flag: 'vault_code_3', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "You check the server rack the Janitor mentioned. Behind the third-floor stairwell dead drop location." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Taped to the back of server rack C — the one with the restraining order — is a small card with the number: 82." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'vault_code_3', value: true, next: 5 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "You already noted the number on the card taped to server rack C." },
    /* 5  */ { type: 'end' },
  ],

  // Vault interaction
  vault_boxes: [
    /* 0  */ { type: 'condition', flag: 'has_charter', ifTrue: 15, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'vault_code_1', ifTrue: 2, ifFalse: 13 },
    /* 2  */ { type: 'condition', flag: 'vault_code_2', ifTrue: 3, ifFalse: 13 },
    /* 3  */ { type: 'condition', flag: 'vault_code_3', ifTrue: 4, ifFalse: 13 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "A heavy safe deposit box. Three-dial combination lock. You enter the numbers: 47-19-82." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "*CLUNK*. The lock turns. The door swings open." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "Inside is a single document. Thick parchment. Gold-embossed letterhead. The ink has a warmth to it, like sunlight trapped in amber." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "'VAULTS FARGO TRUST CHARTER — BRANCH 4471 — ORIGINAL CHARTER OF FIDUCIARY OBLIGATION'" },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: "The moment you touch the document, the room trembles. Not an earthquake. Something deeper. The building is responding." },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: "I can feel it. The weight of every promise ever made in this building." },
    /* 10 */ { type: 'action', action: 'set_flag', flag: 'has_charter', value: true, next: 11 },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "The Fiduciary Force surges through the charter. You feel stronger. More certain. The building is with you." },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: "I need to get back to the cubicle farm. The team is waiting.", next: 16 },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "The safe is locked. A three-dial combination. You don't have all the numbers yet." },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "The Janitor said the codes are scattered: one on his Rolex, one in HR, one in the server room.", next: 16 },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "The safe is open. Empty now. The charter is with you. Where it belongs.", next: 16 },
    /* 16 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // ACT 5 -- CORPORATE ESCALATION
  // --------------------------------------------------------------------------

  act5_trigger: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You have the charter. The evidence. The team. It's time to confront Rachel." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "But when you reach the cubicle farm, everything has changed." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "New people are everywhere. Suits you've never seen. Clipboards. Tablets. Earpieces." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "They're calling themselves the 'Restructuring Team.' Rachel brought them in. They're dismantling our systems as we speak." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "One of them tried to reformat my server. MY server. I may have... physically intervened." },
    /* 5  */ { type: 'text', speaker: 'Diane', text: "Andrew, Rachel's moved to the Board Room. She's calling an emergency vote to dissolve the trust department." },
    /* 6  */ { type: 'text', speaker: 'Diane', text: "You need to get up there. But first, you'll need to deal with her team down here. They're blocking all access." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: "I'm going with you. They came for our department. We answer together — or we answer alone, and they pick us off one by one." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'act4_complete', value: true, next: 9 },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'janet_recruited', value: true, next: 10 },
    /* 10 */ { type: 'action', action: 'recruit_ally', ally: 'janet', next: 11 },
    /* 11 */ { type: 'end' },
  ],

  // Act 5 — Restructuring Trio (Brand Consultant + Restructuring Analyst + Corporate Lawyer all at once)
  // Andrew + Janet vs three. The first multi-combatant fight in the game.
  restructuring_trio_intro: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "Three suits step out from between the cubicles, blocking the path to the elevator. They've coordinated this." },
    /* 1  */ { type: 'text', speaker: 'Brand Consultant', text: "Oh PERFECT. We can do the rebranding pitch and the metrics review and the legal threat all at once. SO efficient." },
    /* 2  */ { type: 'text', speaker: 'Restructuring Analyst', text: "Joint engagement reduces single-point dependency on any individual change vector. Standard practice." },
    /* 3  */ { type: 'text', speaker: 'Corporate Lawyer', text: "I've already drafted three NDAs, four severance riders, and a non-compete that would survive a nuclear strike. Sign anywhere." },
    /* 4  */ { type: 'text', speaker: 'Janet', text: "Andrew. I'll take the one with the binder. You handle whichever one's loudest." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Stay sharp. They'll try to split us." },
    /* 6  */ { type: 'action', action: 'start_combat', encounter: 'restructuring_trio', next: 7 },
    /* 7  */ { type: 'end' },
  ],

  restructuring_trio_defeated: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "All three of them are on the floor of the cubicle farm. The brand consultant is crying about her mood board. The analyst is muttering at a spreadsheet. The lawyer is drafting a settlement to himself." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "I forgot how good it feels to be right." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "We're not done. Rachel's whole team is between us and the Board Room." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "Then I'm not done either. Lead the way." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'restructuring_trio_defeated', value: true, next: 5 },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'brand_consultant_defeated', value: true, next: 6 },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'restructuring_defeated', value: true, next: 7 },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'corporate_lawyer_defeated', value: true, next: 8 },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'brand_consultant_fight_started', value: true, next: 9 },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'restructuring_fight_started', value: true, next: 10 },
    /* 10 */ { type: 'end' },
  ],

  // ── Alex from IT recruitment ───────────────────────────────────────
  // Triggered when Andrew enters the IT office after the trio fight, before
  // heading up to the executive floor. Alex has been guerilla-warring the
  // Restructuring Team's reformat order with `rm -rf`.
  alex_it_recruit: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "Alex from IT is standing on a chair, holding a network cable like a bullwhip." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "Andrew. Hi. Don't ask about the chair." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "What happened?" },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "A consultant tried to reimage every workstation on this floor. I unplugged the rack. Then I unplugged HIM." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "He's going to come back with reinforcements. And a manager. I need to come with you." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Look — I'm not a fighter. But I have root on every box in this building. That counts." },
    /* 6  */ { type: 'choice', prompt: 'Bring Alex along?', choices: [
      { text: '"Glad to have you. Welcome to the team."', next: 7 },
      { text: '"I work better alone."', next: 12 },
    ] },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "Hell yes. Let me grab my laptop and a Red Bull." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'alex_it_recruited', value: true, next: 9 },
    /* 9  */ { type: 'action', action: 'recruit_ally', ally: 'alex_it', next: 10 },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "Alex closes 47 browser tabs. The fans on his laptop slow down for the first time in weeks." },
    /* 11 */ { type: 'end' },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "...okay. Cool. I'll be down here. Yelling at packets. If you change your mind, the door's open." },
    /* 13 */ { type: 'end' },
  ],

  // ── Isaiah recruitment ─────────────────────────────────────────────
  // Triggered after the trio fight when Andrew talks to Isaiah at his desk.
  isaiah_recruit: [
    /* 0  */ { type: 'text', speaker: 'Isaiah', text: "I saw what you did downstairs. The whole department saw." },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "Andrew, you know I run ops. I keep paper. I file things in triplicate. I take notes during meetings nobody else takes notes during." },
    /* 2  */ { type: 'text', speaker: 'Isaiah', text: "I have nine years of receipts on Rachel. NINE." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Why didn't you say anything before?" },
    /* 4  */ { type: 'text', speaker: 'Isaiah', text: "Because I didn't think anyone would do anything with it. I was wrong. I want in." },
    /* 5  */ { type: 'choice', prompt: 'Recruit Isaiah?', choices: [
      { text: '"We need everything you have. You\'re in."', next: 6 },
      { text: '"Just send me the documents. Stay safe down here."', next: 11 },
    ] },
    /* 6  */ { type: 'text', speaker: 'Isaiah', text: "You won't regret it. I packed a go-bag last Tuesday. I had a feeling." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'isaiah_recruited', value: true, next: 8 },
    /* 8  */ { type: 'action', action: 'recruit_ally', ally: 'isaiah', next: 9 },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: "Isaiah picks up a binder labeled 'CONTINGENCIES.' It is alarmingly heavy." },
    /* 10 */ { type: 'end' },
    /* 11 */ { type: 'text', speaker: 'Isaiah', text: "Okay. I'll send the encrypted folder to your work email. Don't let anything happen to that printout." },
    /* 12 */ { type: 'action', action: 'set_flag', flag: 'isaiah_documents_shared', value: true, next: 13 },
    /* 13 */ { type: 'end' },
  ],

  // ── Diane recruitment (formalizes ally-form for combat) ────────────
  // Hooked into the Act 6 ally rally chain. Existing diane_act6 dialog already
  // set diane_act6_rallied; this step adds the actual combat recruit.
  diane_recruit: [
    /* 0  */ { type: 'text', speaker: 'Diane', text: "I've been documenting Rachel's policy violations since I started in HR." },
    /* 1  */ { type: 'text', speaker: 'Diane', text: "I'm not just sharing the file with you, Andrew. I'm walking up there with you." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "You're sure?" },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "Andrew. I am one of three people in this building who has read the entire employee handbook. I am SURE." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'diane_recruited', value: true, next: 5 },
    /* 5  */ { type: 'action', action: 'recruit_ally', ally: 'diane', next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // ── Data Analytics duo ─────────────────────────────────────────────
  // Replaces the solo Data Analytics Lead. Now the Lead has a CFO's Assistant
  // tagging along — the metric-pusher and the budget-cutter.
  data_analytics_duo_intro: [
    /* 0  */ { type: 'text', speaker: 'Data Analytics Lead', text: "I told the CFO's office you'd come up. They wanted to be here for it." },
    /* 1  */ { type: 'text', speaker: "CFO's Assistant", text: "Per Q3 projections, your department represents a 94% drag on synergies. We're going to need that resolved before the board vote." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "You're a finance assistant. You don't run trust." },
    /* 3  */ { type: 'text', speaker: "CFO's Assistant", text: "Correct. I run COSTS. And you're a line item with a red number next to it." },
    /* 4  */ { type: 'text', speaker: 'Data Analytics Lead', text: "We've consolidated the analysis. We'd like to walk you through it. Personally." },
    /* 5  */ { type: 'action', action: 'start_combat', encounter: 'data_analytics_duo', next: 6 },
    /* 6  */ { type: 'end' },
  ],

  data_analytics_duo_defeated: [
    /* 0  */ { type: 'text', speaker: 'Data Analytics Lead', text: "My model... has rejected my model. This is bad for my model." },
    /* 1  */ { type: 'text', speaker: "CFO's Assistant", text: "I'm... I'm going to need to escalate this. To my direct supervisor. Who is currently in the Bahamas." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "They retreat toward the elevators. The Lead is still muttering about confidence intervals." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'data_lead_defeated', value: true, next: 4 },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'cfos_assistant_defeated', value: true, next: 5 },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'data_lead_fight_started', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // ── Alex from IT — Personal Mission: "Badge Audit" ─────────────────
  // Unlocked after recruit. Andrew helps Alex trace where the Restructuring
  // Team's badges were issued from. Reward: free unlock of `kernel_panic`
  // (Alex's tier-2 AoE) + 200 XP + small backstory beat about Alex's roots.
  alex_badge_audit_offer: [
    /* 0  */ { type: 'condition', flag: 'alex_badge_audit_complete', ifTrue: 12, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'alex_badge_audit_started', ifTrue: 10, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "Hey. Got a minute? I've been pulling badge logs since the trio went down." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Every Restructuring goon who came in this week was issued from a single workstation. Not HR. Not Reception. Somewhere upstairs." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "I can't get the source from a remote query — Rachel's office IP is air-gapped. But if YOU could go up to the IT closet and pull the physical patch panel logs, I can correlate them." },
    /* 5  */ { type: 'choice', prompt: 'Help Alex trace the badges?', choices: [
      { text: '"On it. Where do I look?"', next: 6 },
      { text: '"Later. Big stuff happening upstairs."', next: 9 },
    ] },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "IT closet is off the it_office. Look for a server rack labeled 'PATCH-3' — it has a sticker that says 'DO NOT TOUCH 4ever'. That's the one." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'alex_badge_audit_started', value: true, next: 8 },
    /* 8  */ { type: 'end' },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Yeah. No worries. The logs aren't going anywhere. Find me when you can." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "Did you get to the IT closet yet? Server rack PATCH-3 — has the 'DO NOT TOUCH' sticker." },
    /* 11 */ { type: 'end' },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "Thanks again for the patch panel pull. I'll never forget where I was when I confirmed Rachel was the source. The break room. Eating a peanut." },
    /* 13 */ { type: 'end' },
  ],

  alex_badge_audit_pull: [
    /* 0  */ { type: 'condition', flag: 'alex_badge_audit_complete', ifTrue: 8, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'alex_badge_audit_started', ifTrue: 2, ifFalse: 7 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Server rack PATCH-3. The 'DO NOT TOUCH 4ever' sticker has been laminated, suggesting it has been touched." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "You pull the patch panel log — a hand-written notebook taped to the inside of the rack door. The last entry reads: 'CABLE 47 → EXEC FLOOR (R. SVP). UNLABELED. JOE WAS HERE.'" },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "You photograph the page with your phone. Alex will know what to do with this." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'alex_has_patch_log', value: true, next: 6 },
    /* 6  */ { type: 'end' },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "A server rack labeled PATCH-3. There is a faded sticker. Whatever Alex needs in here, you don't have a reason to look — yet.", next: 6 },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: "The patch panel sits quietly. You already gave Alex what he needed.", next: 6 },
  ],

  alex_badge_audit_return: [
    /* 0  */ { type: 'condition', flag: 'alex_badge_audit_complete', ifTrue: 12, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'alex_has_patch_log', ifTrue: 2, ifFalse: 11 },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Got the patch log. Cable 47 — 'R. SVP'. Rachel." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "She physically ran a cable from her office to the badge issuer. That's not a corporate workflow. That's a CONSPIRACY." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "Joe was here, huh. Joe is a maintenance guy who retired in 2019. So Rachel had this set up for at least four years." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Andrew. You just gave me what I've been chasing for half a year. Let me show you something." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "I built this little script for emergencies. Hard reboot the whole building. I never thought I'd actually USE it. But for a moment like this — yeah. Take it." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'alex_badge_audit_complete', value: true, next: 8 },
    /* 8  */ { type: 'action', action: 'give_xp', xp: 200, next: 9 },
    /* 9  */ { type: 'action', action: 'unlock_ally_ability', ally: 'alex_it', ability: 'kernel_panic', next: 10 },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "Alex teaches you the Kernel Panic command. He's beaming." },
    /* 11 */ { type: 'end' },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "Did you find PATCH-3? The 'DO NOT TOUCH' sticker is the one.", next: 11 },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Still riding the high from cracking that conspiracy. We made history in a server closet.", next: 11 },
  ],

  // ── Team chat hub: out-of-combat conversations ─────────────────────
  // Cycles through ally-specific lines based on which allies are recruited.
  // Acts as a Mass Effect-style "talk to your squad between missions" beat.
  // Voice-profile choices (Reasonable Doubt) appear when the cumulative voice
  // counts cross thresholds set in CombatState.
  team_chat_hub: [
    /* 0  */ { type: 'choice', prompt: 'Who do you want to talk to?', choices: [
      { text: 'Janet',         next: 1, requires: 'janet_recruited' },
      { text: 'Alex from IT',  next: 5, requires: 'alex_it_recruited' },
      { text: 'Isaiah',        next: 9, requires: 'isaiah_recruited' },
      { text: 'Diane',         next: 13, requires: 'diane_recruited' },
      // Voice-profile branches — only appear when the corresponding voice
      // has been used heavily across the campaign
      { text: '[Janet looks at you differently lately]',     next: 20, requires: 'voice_litigator_high', requiresNot: 'janet_warning_seen' },
      { text: '[Open the charter and read]',                 next: 30, requires: 'voice_witness_high',   requiresNot: 'witness_charter_read' },
      { text: '[Just sit. The day is heavy]',                next: 40, requires: 'voice_skeptic_high',   requiresNot: 'skeptic_chair_seen' },
      { text: 'Just check in with the team. Nothing specific.', next: 17 },
      { text: 'Get back to work.', next: 19 },
    ] },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "Andrew. You doing okay?" },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "I keep thinking about the Henderson account. Three generations of grandparents trusted us with that. The minute Rachel got the keys to this branch, she was looking for ways to liquidate it." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "We're not just defending a department, you know. We're defending a promise." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "I know. That's why I'm not done.", next: 0 },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Hey. So I rolled the badge audit logs. Nine of the new hires didn't badge in through reception. Rachel issued them direct from the executive floor." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "That's not a hiring freeze. That's a private army." },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "I screenshotted everything. Three places. One of them is a Tor hidden service. Don't ask." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "...I won't.", next: 0 },
    /* 9  */ { type: 'text', speaker: 'Isaiah', text: "I want to say something out loud. Then I want to write it down." },
    /* 10 */ { type: 'text', speaker: 'Isaiah', text: "I've worked here eleven years. I've watched seven boss types come through. Most of them just wanted the title. Rachel is the first one who wanted the building." },
    /* 11 */ { type: 'text', speaker: 'Isaiah', text: "Whatever happens upstairs — I'm glad you came back. I almost gave up on this place last year. Then you didn't." },
    /* 12 */ { type: 'text', speaker: 'Andrew', text: "We're getting it back, Isaiah.", next: 0 },
    /* 13 */ { type: 'text', speaker: 'Diane', text: "Tell me you're sleeping." },
    /* 14 */ { type: 'text', speaker: 'Diane', text: "I'm not joking. The only thing standing between this branch and a hostile dissolution is your ability to make sound decisions on the executive floor. So tell me you're sleeping." },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: "...I'm trying." },
    /* 16 */ { type: 'text', speaker: 'Diane', text: "Try harder. Coffee is not a substitute for REM. — Anyway. The handbook does have a clause for emergency board recall. I bookmarked it.", next: 0 },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "The team is getting ready for what's coming. Janet's making coffee. Alex is hunched over a laptop. Isaiah is filing something. Diane is already on a call." },
    /* 18 */ { type: 'text', speaker: 'Narrator', text: "It feels, briefly, like a real team.", next: 0 },
    /* 19 */ { type: 'end' },

    // ── Voice-profile reactivity branches ────────────────────────────
    // 20-29: The Litigator — Janet warning. Andrew has been getting cold.
    /* 20 */ { type: 'text', speaker: 'Janet', text: "Andrew. Sit down for a second." },
    /* 21 */ { type: 'text', speaker: 'Janet', text: "I want to say something out loud and I want you to hear it without the binder voice on." },
    /* 22 */ { type: 'text', speaker: 'Janet', text: "You've been... clinical. In the last few. The way you talked down the analyst — that wasn't argument, that was a closing." },
    /* 23 */ { type: 'text', speaker: 'Janet', text: "I know what that sounds like. I did three years of corporate before I came back to trust. There's a version of you who can win this fight by becoming exactly the thing we're fighting." },
    /* 24 */ { type: 'text', speaker: 'Janet', text: "Don't do that. We can win and stay people. Both. I refuse to let you forget that." },
    /* 25 */ { type: 'choice', prompt: '...', choices: [
      { text: '"You\'re right. Thank you."', next: 26 },
      { text: '"It works. That\'s what matters."', next: 27 },
      { text: '"I hear you."', next: 28 },
    ] },
    /* 26 */ { type: 'action', action: 'set_flag', flag: 'andrew_steadied', value: true, next: 29 },
    /* 27 */ { type: 'action', action: 'set_flag', flag: 'andrew_hardened', value: true, next: 29 },
    /* 28 */ { type: 'action', action: 'set_flag', flag: 'andrew_steadied', value: true, next: 29 },
    /* 29 */ { type: 'action', action: 'set_flag', flag: 'janet_warning_seen', value: true, next: 0 },

    // 30-39: The Witness — Andrew opens the charter and reads
    /* 30 */ { type: 'text', speaker: 'Narrator', text: "You take the 1947 charter out of your bag. The leather binding is soft from forty years of careful handling. The pages smell like the bank smelled when you started." },
    /* 31 */ { type: 'text', speaker: 'Narrator', text: "Section 1, Paragraph A: 'A trustee shall, at all times, place the interests of the beneficiary above all other considerations, including the interests of the trustee, the institution, and any successor entity.'" },
    /* 32 */ { type: 'text', speaker: 'Narrator', text: "Section 1, Paragraph B: 'No reorganization, restructuring, or rebranding of the institution shall release the trustee from this duty. The duty survives the institution.'" },
    /* 33 */ { type: 'text', speaker: 'Narrator', text: "There's a handwritten note in the margin, in pencil, faded. You don't recognize the handwriting." },
    /* 34 */ { type: 'text', speaker: 'Narrator', text: "It says: 'For the people whose names you will never know, who trusted you anyway. — D. Henderson, founding trustee, 1947.'" },
    /* 35 */ { type: 'text', speaker: 'Andrew', text: "...Mrs. Henderson's grandfather wrote this." },
    /* 36 */ { type: 'text', speaker: 'Narrator', text: "You close the charter. You sit with it on your knees for a moment. The day is heavy, and that's okay. The day is supposed to be heavy." },
    /* 37 */ { type: 'action', action: 'set_flag', flag: 'witness_charter_read', value: true, next: 38 },
    /* 38 */ { type: 'action', action: 'give_xp', xp: 100, next: 0 },

    // 40-49: The Skeptic — Andrew sits and lets the day press
    /* 40 */ { type: 'text', speaker: 'Narrator', text: "You sit at your desk. You don't open anything. You don't pick anything up. You just sit." },
    /* 41 */ { type: 'text', speaker: 'Narrator', text: "Across the room, Janet is laughing at something Alex said. Isaiah is on the phone with someone whose grandmother is sick. The fluorescents hum at the same exact frequency they hummed when you started here." },
    /* 42 */ { type: 'text', speaker: 'Narrator', text: "You think: I could quit. I could walk out the front of the building and not come back. There's a version of every life where you just don't show up the next day." },
    /* 43 */ { type: 'text', speaker: 'Narrator', text: "And then you think: yeah. But not this one." },
    /* 44 */ { type: 'text', speaker: 'Narrator', text: "You stand up. You're still tired. But you're standing." },
    /* 45 */ { type: 'action', action: 'set_flag', flag: 'skeptic_chair_seen', value: true, next: 46 },
    /* 46 */ { type: 'action', action: 'modify_stat', stat: 'maxMP', amount: 5, next: 0 },
  ],

  restructuring_combat: [
    /* 0  */ { type: 'text', speaker: 'Restructuring Analyst', text: "Ah. Andrew, is it? I've heard about you. The 'disruptive element.'" },
    /* 1  */ { type: 'text', speaker: 'Restructuring Analyst', text: "I've been reviewing your department's metrics. Your efficiency ratio is 0.34. Industry standard is 0.78." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "You can't reduce trust administration to a ratio." },
    /* 3  */ { type: 'text', speaker: 'Restructuring Analyst', text: "Everything can be reduced to a ratio. People. Departments. Careers. It's all just numbers." },
    /* 4  */ { type: 'text', speaker: 'Restructuring Analyst', text: "Your number is up." },
    /* 5  */ { type: 'action', action: 'start_combat', encounter: 'restructuring_analyst', next: 6 },
    /* 6  */ { type: 'end' },
  ],

  restructuring_defeated: [
    /* 0  */ { type: 'text', speaker: 'Restructuring Analyst', text: "This is... not in my efficiency model. Human variables. Always the hardest to account for." },
    /* 1  */ { type: 'text', speaker: 'Restructuring Analyst', text: "You know Rachel won't stop. She's been planning this for months. The Regional Manager promised her this branch." },
    /* 2  */ { type: 'action', action: 'set_flag', flag: 'restructuring_defeated', value: true, next: 3 },
    /* 3  */ { type: 'end' },
  ],

  brand_consultant_combat: [
    /* 0  */ { type: 'text', speaker: 'Brand Consultant', text: "Oh! Perfect timing. I'm redesigning your department's identity. Trust is SO last decade." },
    /* 1  */ { type: 'text', speaker: 'Brand Consultant', text: "We're pivoting to 'Wealth Solutions.' Or maybe 'Asset Synergy Partners.' I'm still workshopping." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "We're a trust department. We manage trusts. The name is fine." },
    /* 3  */ { type: 'text', speaker: 'Brand Consultant', text: "'Fine' is the ENEMY of 'brand excellence.' Let me show you the mood board." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The mood board is just a photo of a sunset with the word 'DISRUPT' in Helvetica." },
    /* 5  */ { type: 'text', speaker: 'Brand Consultant', text: "You don't appreciate art. Or vision. Or mid-century modern fonts." },
    /* 6  */ { type: 'action', action: 'start_combat', encounter: 'brand_consultant', next: 7 },
    /* 7  */ { type: 'end' },
  ],

  brand_consultant_defeated: [
    /* 0  */ { type: 'text', speaker: 'Brand Consultant', text: "Fine. Keep your boring name. Keep your boring department. But mark my words — 'trust' as a brand is OVER." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The Brand Consultant retreats, clutching their mood board. The sunset looks dimmer somehow." },
    /* 2  */ { type: 'action', action: 'set_flag', flag: 'brand_consultant_defeated', value: true, next: 3 },
    /* 3  */ { type: 'end' },
  ],

  data_analytics_combat: [
    /* 0  */ { type: 'text', speaker: 'Data Analytics Lead', text: "Hold on. Before you go anywhere, I need to walk you through some numbers." },
    /* 1  */ { type: 'text', speaker: 'Data Analytics Lead', text: "Your department's trust resolution rate is down 12% quarter-over-quarter. Client satisfaction is in the third percentile. Overhead per FTE is — and I cannot stress this enough — alarming." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Those metrics don't capture what we actually do." },
    /* 3  */ { type: 'text', speaker: 'Data Analytics Lead', text: "Everything that matters can be measured. Everything that can be measured can be optimized. Everything that can be optimized has already been scheduled for elimination." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "Who authorized you to be in this building?" },
    /* 5  */ { type: 'text', speaker: 'Data Analytics Lead', text: "I don't see that question on my intake form. I do see, however, that your continued presence here represents a 94% drag on projected synergies." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The lead opens a laptop. The screen is a spreadsheet so dense it's practically a weapon." },
    /* 7  */ { type: 'action', action: 'start_combat', encounter: 'data_analytics_lead', next: 8 },
    /* 8  */ { type: 'end' },
  ],

  data_analytics_defeated: [
    /* 0  */ { type: 'text', speaker: 'Data Analytics Lead', text: "This is... statistically anomalous. My model had you at a 3% win probability." },
    /* 1  */ { type: 'text', speaker: 'Andrew', text: "What does your model say now?" },
    /* 2  */ { type: 'text', speaker: 'Data Analytics Lead', text: "It's... refusing to run. I think you broke my confidence interval." },
    /* 3  */ { type: 'text', speaker: 'Data Analytics Lead', text: "For what it's worth — the Chief is still up here. He doesn't have a model. He doesn't need one. He's been doing this for twenty years." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The lead closes their laptop and walks toward the elevator, muttering about outliers." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'data_lead_defeated', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  chief_restructuring_combat: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "He's at the far end of the executive floor. No laptop. No clipboard. Just a suit that costs more than your annual salary and an expression that has never once entertained doubt." },
    /* 1  */ { type: 'text', speaker: 'Chief of Restructuring', text: "Andrew. I've eliminated twelve departments across nine companies. Your file came across my desk on day one." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Then you know I have the charter. I have the evidence. This restructuring has no legal basis." },
    /* 3  */ { type: 'text', speaker: 'Chief of Restructuring', text: "Legal basis. Sentiment is not a KPI, Andrew. Neither is loyalty. Neither, frankly, is you." },
    /* 4  */ { type: 'text', speaker: 'Chief of Restructuring', text: "I've broken harder people than you. With less paperwork." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Good. I hate paperwork." },
    /* 6  */ { type: 'action', action: 'start_combat', encounter: 'chief_of_restructuring', next: 7 },
    /* 7  */ { type: 'end' },
  ],

  chief_restructuring_defeated: [
    /* 0  */ { type: 'text', speaker: 'Chief of Restructuring', text: "I don't... this doesn't happen." },
    /* 1  */ { type: 'text', speaker: 'Chief of Restructuring', text: "You want to know something? Rachel didn't call us last week. She called us six weeks ago. Before you ever found the archive. Before the charter. She knew you'd get this far." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Then she knows what's coming." },
    /* 3  */ { type: 'text', speaker: 'Chief of Restructuring', text: "She's in the Board Room. She's been there all morning. She has the full board on a call. Andrew — whatever you're planning, you have maybe ten minutes before the vote passes." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The Chief straightens his tie. Steps aside. For the first time in twenty years, he gets out of someone's way." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'chief_restructuring_defeated', value: true, next: 6 },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'board_room_accessible', value: true, next: 7 },
    /* 7  */ { type: 'end' },
  ],

  corporate_lawyer_combat: [
    /* 0  */ { type: 'text', speaker: 'Corporate Lawyer', text: "Mr. Andrew. I represent the interests of Vaults Fargo Regional Operations." },
    /* 1  */ { type: 'text', speaker: 'Corporate Lawyer', text: "You have been engaging in unauthorized access of restricted company records. Insubordination. Disruption of corporate operations." },
    /* 2  */ { type: 'text', speaker: 'Corporate Lawyer', text: "I have here a cease and desist order, a termination notice, and a non-disclosure agreement. Sign all three." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "I'm a trust officer with evidence of systematic fiduciary breach. I'm not signing anything." },
    /* 4  */ { type: 'text', speaker: 'Corporate Lawyer', text: "Brave. Foolish. But brave. Very well. Let's do this the litigious way." },
    /* 5  */ { type: 'action', action: 'start_combat', encounter: 'corporate_lawyer', next: 6 },
    /* 6  */ { type: 'end' },
  ],

  corporate_lawyer_defeated: [
    /* 0  */ { type: 'text', speaker: 'Corporate Lawyer', text: "I... I've never lost a case. Or a fight. This is unprecedented." },
    /* 1  */ { type: 'text', speaker: 'Corporate Lawyer', text: "For the record, I was retained by the Regional Manager personally. Not by Vaults Fargo corporate. That distinction may matter later." },
    /* 2  */ { type: 'text', speaker: 'Corporate Lawyer', text: "Rachel is upstairs. The Board Room. She's presenting her case to dissolve your department. You'd better hurry." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'corporate_lawyer_defeated', value: true, next: 4 },
    /* 4  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // RACHEL BOSS FIGHT — Board Room confrontation
  // --------------------------------------------------------------------------

  rachel_boss_combat: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You enter the Board Room. Rachel stands at the head of the table. Behind her, a screen displays charts and graphs that all say the same thing: DISSOLVE." },
    /* 1  */ { type: 'text', speaker: 'Rachel', text: "Andrew. I was wondering when you'd show up." },
    /* 2  */ { type: 'text', speaker: 'Rachel', text: "I've already presented my case to the board. The vote is in one hour. Your department is finished." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Not if they see this." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "You place the evidence on the table. The transaction logs. The filing records. The Intern's taped-together memo. And the charter." },
    /* 5  */ { type: 'text', speaker: 'Rachel', text: "...Where did you get that charter. That was locked in the Vault." },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: "The building helped." },
    /* 7  */ { type: 'text', speaker: 'Rachel', text: "The BUILDING. You've lost your mind. Just like the old janitor. Just like everyone who works in trust too long." },
    /* 8  */ { type: 'text', speaker: 'Rachel', text: "You think a 77-year-old piece of paper is going to save your department? This is the real world. Power. Money. Results." },
    /* 9  */ { type: 'text', speaker: 'Rachel', text: "I've spent fifteen years climbing the corporate ladder. I will NOT be stopped by a first-week trust officer and a JANITOR." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "The building hums. The charter on the table begins to glow with that impossible warm light." },
    /* 11 */ { type: 'text', speaker: 'Rachel', text: "What is— this is some kind of trick. Fine. If you want a fight, I'll give you one." },
    /* 12 */ { type: 'text', speaker: 'Rachel', text: "I am Rachel, SVP of Strategic Operations. I have a Harvard MBA, a corner office, and ZERO patience for corporate fairy tales." },
    /* 13 */ { type: 'action', action: 'start_combat', encounter: 'rachel_boss', next: 14 },
    /* 14 */ { type: 'end' },
  ],

  rachel_boss_defeated: [
    /* 0  */ { type: 'text', speaker: 'Rachel', text: "I... this isn't possible. No one has ever..." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The charter glows brighter. The Fiduciary Force fills the Board Room. Every promise ever made within these walls resonates." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Rachel's phone rings. She answers. Her face goes white." },
    /* 3  */ { type: 'text', speaker: 'Rachel', text: "The Regional Manager has been arrested. The SEC found the offshore accounts. The board vote is... cancelled." },
    /* 4  */ { type: 'text', speaker: 'Rachel', text: "You win. This time. But corporations have long memories, Andrew. Longer than any building." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Rachel leaves the Board Room. Her heels echo on the marble floor, each step a little less certain than the last." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The charter's glow fades to a gentle warmth. The building settles. Not asleep — just... satisfied." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "Ross appears in the doorway. Behind him, Janet, Diane, Alex, the Intern, Isaiah, and the Janitor." },
    /* 8  */ { type: 'text', speaker: 'Ross', text: "Andrew... did we just save the department?" },
    /* 9  */ { type: 'text', speaker: 'Andrew', text: "We saved more than that, Ross." },
    /* 10 */ { type: 'text', speaker: 'Mysterious Janitor', text: "The charter is restored. The trust is honored. The building remembers." },
    /* 11 */ { type: 'text', speaker: 'Janet', text: "*raises tumbler* To trust issues. May we always have them." },
    /* 12 */ { type: 'text', speaker: 'Ross', text: "That's the most beautiful thing I've ever heard. And I've read SEVEN leadership books this month." },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "~ END OF ACT 5 ~" },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "The trust department stands. Battered, caffeinated, and slightly traumatized. But standing." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "The Fiduciary Force sleeps again. Until the next breach. Until the next broken promise." },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: "But that's a story for another day. Or maybe... another floor." },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "The penthouse elevator dings. Nobody pressed it." },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'act5_complete', value: true, next: 19 },
    /* 19 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // NEW ROOM INTERACTION DIALOGS
  // --------------------------------------------------------------------------

  board_room_table: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "A mahogany conference table that seats twenty. Each chair costs more than a semester of college." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "A crystal decanter sits in the center, empty. A nameplate at the head reads 'RESERVED FOR STRATEGIC OPERATIONS.'" },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The walls are lined with portraits of past branch directors. The Janitor's portrait is conspicuously absent." },
    /* 3  */ { type: 'end' },
  ],

  suggestion_box: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "An HR suggestion box. The lock has been glued shut." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Through the slot, you can see dozens of slips of paper. The top one reads: 'SUGGESTION: Actually read these. — Everyone (2019-2024)'" },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Another reads: 'Please provide a suggestion box that works. This one has been glued shut since February. — Anonymous'" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The most recent one is in Rachel's handwriting: 'Suggestion: eliminate the suggestion box. Optimize.'" },
    /* 4  */ { type: 'end' },
  ],

  penthouse_window: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "Floor-to-ceiling windows. The Minneapolis skyline stretches in every direction." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "From up here, the world looks clean. Organized. Like a spreadsheet come to life." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "You can see the parking garage below. Your Honda Civic looks very small. Much like your savings account." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "A plaque on the window reads: 'FROM THIS HEIGHT, EVERYTHING LOOKS LIKE AN ASSET.' It's meant to be inspirational. It isn't." },
    /* 4  */ { type: 'end' },
  ],

  vault_entrance: [
    /* 0  */ { type: 'condition', flag: 'vault_accessible', ifTrue: 2, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "A heavy steel door behind the Archive shelving. It won't budge. You need more information." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The vault door is open. The Janitor's keycard works here too." },
    /* 3  */ { type: 'end' },
  ],

  vault_charter: [
    /* 0  */ { type: 'condition', flag: 'has_charter', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "A glass display case. Inside, you can see a document on a velvet stand. It glows faintly." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A plaque reads: 'THE ORIGINAL CHARTER — To be opened only in times of fiduciary crisis.'" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The display case is locked. The combination lock has three dials." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The display case is empty. You carry the charter now. Its warmth pulses against your chest like a second heartbeat." },
    /* 5  */ { type: 'end' },
  ],

  board_charter: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "A bronze plaque on the wall. Engraved in old-fashioned script:" },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "'THIS INSTITUTION SHALL SERVE AS FAITHFUL STEWARD OF THE PUBLIC TRUST. ANY BREACH OF THIS SACRED DUTY SHALL BE MET WITH THE FULL WEIGHT OF THE CHARTER.'" },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "'— Original Board of Directors, 1947'" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The words shimmer slightly. As if they're not just engraved — they're alive." },
    /* 4  */ { type: 'end' },
  ],

  algorithm_terminal: [
    /* 0  */ { type: 'condition', flag: 'regional_director_defeated', ifTrue: 1, ifFalse: 7 },
    /* 1  */ { type: 'condition', flag: 'defeated_algorithm', ifTrue: 13, ifFalse: 2 },
    // Fight path — player came to the terminal instead of waiting for the cutscene
    /* 2  */ { type: 'text', speaker: 'The Algorithm', text: "Initiating direct interface. Interesting choice." },
    /* 3  */ { type: 'text', speaker: 'The Algorithm', text: "You chose confrontation over ceremony. Efficiency rating: acceptable." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "Let's skip the rest of the speech." },
    /* 5  */ { type: 'text', speaker: 'The Algorithm', text: "Agreed. COMMENCING OPTIMIZATION." },
    /* 6  */ { type: 'action', action: 'start_combat', encounter: 'algorithm', next: 16 },
    // Pre-fight flavor (Regional Director not yet beaten — terminal is just scenery)
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "A sleek terminal unlike anything else in the building. Modern. Minimalist. Cold." },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: "The screen displays cascading numbers. Portfolio values. Trust balances. Client assets. All flowing in real-time." },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: "A cursor blinks: 'THE ALGORITHM SEES ALL. THE ALGORITHM OPTIMIZES ALL. THE ALGORITHM IS ALL.'" },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: "That's... ominous. Even for a bank." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "The screen flickers. For a moment, you think you see a face in the numbers. Then it's gone." },
    /* 12 */ { type: 'end' },
    // Post-defeat flavor
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "The terminal is dark. Where cascading numbers once flowed, only a blinking cursor remains." },
    /* 14 */ { type: 'text', speaker: 'Andrew', text: "Just a computer now." },
    /* 15 */ { type: 'end' },
    /* 16 */ { type: 'end' },
  ],

  // ==========================================================================
  // ALEX FROM IT SUBQUESTS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // SUBQUEST 1: The 3:47 AM Anomaly
  // Reward: Overclocked Badge (+3 SPD)
  // --------------------------------------------------------------------------

  alex_it_quest_anomaly: [
    /* 0  */ { type: 'condition', flag: 'quest_anomaly_347_complete', ifTrue: 20, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'anomaly_started', ifTrue: 9, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "Hey. I've been tracking a weird signal. Something's pinging an external IP at exactly 3:47 AM every night." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "I set up a packet sniffer. It's not just data — it's Morse code. Embedded in the headers of our trust accounting database." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "Someone has been sending Morse code through our trust system at 3:47 AM every night. Eight years running." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "The signal originates from server rack C — the one with the restraining order. There should be a blinking LED pattern on it." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "Go take a look. Long blink = dash, short blink = dot. See what you can read." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'anomaly_started', value: true, next: 8 },
    /* 8  */ { type: 'end' },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Did you check rack C?" },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "...okay I got impatient. I decoded it myself. It says 'TRUST NO ALGORITHM.' Over and over. Every night. For eight years." },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "I traced the origin further. It's not coming from the Caymans — it bounces TO the Caymans and BACK. The source is inside this building." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "I think the building itself has been sending this warning. Which is insane. But also look around you." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "The signal timestamp 3:47? That's not a time. It's a frequency. 3.47 GHz. Someone buried that hint in the ping data." },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "I overclocked a security badge to run at exactly that frequency. It resonates with the building's systems somehow." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "Here. It's technically an FCC violation. Consider it a thank you." },
    /* 16 */ { type: 'action', action: 'set_flag', flag: 'quest_anomaly_347_complete', value: true, next: 17 },
    /* 17 */ { type: 'action', action: 'give_xp', xp: 250, next: 18 },
    /* 18 */ { type: 'text', speaker: 'Narrator', text: "Quest complete: The 3:47 AM Anomaly. +250 XP. SPD +3 permanently.", next: 19 },
    /* 19 */ { type: 'end' },
    /* 20 */ { type: 'text', speaker: 'Alex from IT', text: "The signal went dark after we decoded it. Whatever was warning us knows we got the message.", next: 19 },
  ],

  // Morse code interactable on server rack C
  morse_code_rack: [
    /* 0  */ { type: 'condition', flag: 'anomaly_started', ifTrue: 1, ifFalse: 6 },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Server rack C. The restraining order is taped to the side. But behind it, a single LED blinks in a distinct pattern." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Long... short short short... long short... short short short... long... / short... short long short short... short long... short short short long... short short short... long short short... short short... short short short short short... short short short..." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "If I remember my Boy Scout Morse code... T-R-U-S-T... N-O... A-L-G-O-R-I-T-H-M-S..." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "'Trust No Algorithm.' That's... oddly specific for a blinking light." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'morse_decoded', value: true, next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "Server rack C hums quietly. One LED blinks in a pattern that seems deliberate, but you don't know what to look for yet." },
    /* 7  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // SUBQUEST 2: Legacy Admin Account
  // Reward: Root Access ability
  // --------------------------------------------------------------------------

  alex_it_quest_legacy: [
    /* 0  */ { type: 'condition', flag: 'quest_legacy_admin_complete', ifTrue: 18, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'phantom_workstation_found', ifTrue: 20, ifFalse: 2 },
    /* 2  */ { type: 'condition', flag: 'legacy_started', ifTrue: 7, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Okay so. There is an admin account that has been auto-approving expense reports for eighteen years." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "I only noticed because this month it approved 'One (1) kayak.' For the marketing department. Nobody in marketing kayaks." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "I've traced it to an active IP on this floor. It's running on a physical machine somewhere. Check the filing cabinets in HR — there'll be a paper trail. Then find the source workstation." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'legacy_started', value: true, next: 17 },
    /* 7  */ { type: 'condition', flag: 'phantom_hr_found', ifTrue: 8, ifFalse: 9 },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "Good, you found the HR trail. Now find the workstation — it'll be in the cubicle farm somewhere. Look for a machine that's running hot for no reason.", next: 17 },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Check HR for the expense printouts first. There should be a paper trail in the filing cabinets.", next: 17 },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "You found it. Give me a second to pull the logs..." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "Alex connects remotely and types for about twenty seconds. Then he leans back slowly." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "The account was set up in 2006 by the previous IT manager as an automated procurement bot. He left, forgot to decommission it, and it just... kept running." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "It approved everything that matched its original criteria. 'Operational supplies.' The kayak technically qualified under 'team wellness equipment.'" },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "I wrote you a root access exploit from the technique I used to kill it. Strips every defense. Consider it hazard pay." },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'quest_legacy_admin_complete', value: true, next: 16 },
    /* 16 */ { type: 'action', action: 'give_xp', xp: 300, next: 19 },
    /* 17 */ { type: 'end' },
    /* 18 */ { type: 'text', speaker: 'Alex from IT', text: "The phantom approver is gone. HR is still processing the kayak return.", next: 17 },
    /* 19 */ { type: 'text', speaker: 'Narrator', text: "Quest complete: The Phantom Approver. +300 XP. Learned ability: Root Access! Deals 50 damage and strips all enemy buffs.", next: 17 },
    /* 20 */ { type: 'condition', flag: 'phantom_hr_found', ifTrue: 10, ifFalse: 21 },
    /* 21 */ { type: 'text', speaker: 'Alex from IT', text: "You found the machine — good. But I still need the HR paper trail to map the account's full history. Check the filing cabinets in HR.", next: 17 },
  ],

  // --------------------------------------------------------------------------
  // SUBQUEST 3: Network Ghost
  // Reward: Firewall ability
  // --------------------------------------------------------------------------

  alex_it_quest_network: [
    /* 0  */ { type: 'condition', flag: 'quest_network_ghost_complete', ifTrue: 22, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'all_boosters_placed', ifTrue: 11, ifFalse: 2 },
    /* 2  */ { type: 'condition', flag: 'network_started', ifTrue: 9, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "There's something on the network I can't identify. A ghost. It's consuming bandwidth and leaving no trace in the logs." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "To triangulate it, I need signal boosters placed in three locations: break room, back corridor, and conference room." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Self-adhesive. Military grade. Well — I bought them from a guy named Military Mike on eBay. But they work." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "Look for spots on the walls in each room. Interact with the booster. Come back when all three are placed." },
    /* 7  */ { type: 'action', action: 'quest_update', quest: 'network_ghost', stage: 1, next: 8 },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'network_started', value: true, next: 10 },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Still need boosters? Break room east wall, back corridor midpoint, conference room east wall.", next: 10 },
    /* 10 */ { type: 'end' },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "All three boosters are live! Triangulating now..." },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "Alex stares at his screen. Three signal blips converge on a single point on the floor plan." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "The network ghost is... the printer. The PRINTER is on the network. Actively sending data." },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "It's been uploading scanned documents to a hidden partition every time someone uses it. Every document ever printed here — archived." },
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "The building has been keeping its own records. A backup that nobody can tamper with. It's been protecting itself." },
    /* 16 */ { type: 'text', speaker: 'Alex from IT', text: "This is... beautiful? In a deeply unsettling way?" },
    /* 17 */ { type: 'text', speaker: 'Alex from IT', text: "Here. I wrote you a firewall subroutine based on what the printer does — blocks the next attack directed at you." },
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'quest_network_ghost_complete', value: true, next: 19 },
    /* 19 */ { type: 'action', action: 'give_xp', xp: 300, next: 20 },
    /* 20 */ { type: 'text', speaker: 'Narrator', text: "Quest complete: Network Ghost. +300 XP. Learned ability: Firewall! Blocks the next enemy ability entirely.", next: 21 },
    /* 21 */ { type: 'end' },
    /* 22 */ { type: 'text', speaker: 'Alex from IT', text: "The ghost went quiet after we triangulated it. The printer keeps doing its thing, though.", next: 21 },
  ],

  // --------------------------------------------------------------------------
  // SUBQUEST 4: Dave's Legacy
  // Reward: Temporal Audit ability
  // --------------------------------------------------------------------------

  alex_it_quest_dave: [
    /* 0  */ { type: 'condition', flag: 'quest_daves_legacy_complete', ifTrue: 20, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'tuesday_all_found', ifTrue: 10, ifFalse: 2 },
    /* 2  */ { type: 'condition', flag: 'dave_started', ifTrue: 7, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Okay, new mystery. There's a scheduled task that runs every Tuesday at exactly 2 PM. Has been running since 2004." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "The logs are encrypted with a key I can't crack. It executes something, completes in under a second, and leaves no trace. Every Tuesday for twenty years." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "There are three physical references in the task header: a floppy disk ID, a server asset tag, and a workstation label. I need all three to reconstruct the decryption key." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'dave_started', value: true, next: 8 },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "Still looking? Floppy disk somewhere in the break room, server tag on the equipment shelf in here, and a label on one of the cubicle farm monitors.", next: 9 },
    /* 8  */ { type: 'action', action: 'quest_update', quest: 'daves_legacy', stage: 1, next: 9 },
    /* 9  */ { type: 'end' },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "You got all three. Give me a minute..." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "Alex cross-references the three identifiers and runs the decryption. He reads the result. He reads it again. He closes his eyes." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "It's an automated birthday email. For someone named Gerald Hitchcock. Who left this company in 2003." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "Gerald's last day here, someone set up a script to email him happy birthday every year. It's been running for twenty-one years, bouncing off a dead mailbox, logging nothing." },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "Twenty-one years of digital birthday wishes going absolutely nowhere." },
    /* 15 */ { type: 'text', speaker: 'Andrew', text: "That's... either the saddest or the sweetest thing I've ever heard." },
    /* 16 */ { type: 'text', speaker: 'Alex from IT', text: "I'm going to leave it running. Also — I wrote you an ability based on the timestamp exploit I used. Two actions in one turn. It's called Temporal Audit. Gerald would've appreciated that." },
    /* 17 */ { type: 'action', action: 'set_flag', flag: 'quest_daves_legacy_complete', value: true, next: 18 },
    /* 18 */ { type: 'action', action: 'give_xp', xp: 300, next: 21 },
    /* 19 */ { type: 'end' },
    /* 20 */ { type: 'text', speaker: 'Alex from IT', text: "The Tuesday 2PM is still running. Gerald's birthday was last Tuesday. He got his email.", next: 19 },
    /* 21 */ { type: 'text', speaker: 'Narrator', text: "Quest complete: The Tuesday 2PM. +300 XP. Learned ability: Temporal Audit! Take two actions in one turn.", next: 19 },
  ],

  // Dave-related NPC dialog
  janitor_dave: [
    /* 0  */ { type: 'condition', flag: 'dave_janitor_done', ifTrue: 6, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Dave? David Chen. Good man. Better IT specialist." },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "He found something in the servers in 2016. Same thing Alex found years later. The shadow accounts." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "He reported it. Through official channels. By the book. And the book ate him alive." },
    /* 4  */ { type: 'text', speaker: 'Mysterious Janitor', text: "They transferred him to a branch that doesn't exist anymore. Closed six months later. Convenient timing." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'dave_janitor_done', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // Janitor gives USB security token for Legacy Admin Account quest
  janitor_legacy_token: [
    /* 0  */ { type: 'condition', flag: 'legacy_janitor_done', ifTrue: 8, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The IT kid sent you." },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "I know what he's trying to access. The admin_legacy account. I created it in 2006." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "You were SVP of Trust?" },
    /* 4  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Once. Before I understood what this institution was becoming." },
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The account was a backdoor. For emergencies. Someone repurposed it after I left." },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Here. The security token. Tell Alex it should only be used to expose what's in there, not to hide it." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'legacy_janitor_done', value: true, next: 8 },
    /* 8  */ { type: 'end' },
  ],

  // Signal booster interactables for Network Ghost quest
  network_booster_br: [
    /* 0  */ { type: 'condition', flag: 'booster_br_placed', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'network_started', ifTrue: 2, ifFalse: 5 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "You press Alex's signal booster against the east wall. It clicks into place and a tiny green LED begins blinking." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'booster_br_placed', value: true, next: 6 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "Signal booster: active. Green light steady.", next: 6 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "A small black device with an adhesive backing. You're not sure what it's for.", next: 6 },
    /* 6  */ { type: 'end' },
  ],

  network_booster_stairwell: [
    /* 0  */ { type: 'condition', flag: 'booster_stair_placed', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'network_started', ifTrue: 2, ifFalse: 5 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The concrete wall of the back corridor holds the signal booster perfectly. The LED blinks once, then settles into a steady green." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'booster_stair_placed', value: true, next: 6 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "Signal booster: active. Green light steady.", next: 6 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "A small black device stuck to the wall. Looks like something an IT person would hide here.", next: 6 },
    /* 6  */ { type: 'end' },
  ],

  network_booster_conf: [
    /* 0  */ { type: 'condition', flag: 'booster_conf_placed', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'network_started', ifTrue: 2, ifFalse: 5 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The conference room's east wall. The signal booster fits neatly between two whiteboards. Nobody will notice it for months." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'booster_conf_placed', value: true, next: 6 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "Signal booster: active. Green light steady.", next: 6 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "A small black device with an adhesive backing. You're not sure what it's for.", next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // SUBQUEST 5: Printer's Soul
  // Reward: Notarized Strike ability
  // --------------------------------------------------------------------------

  alex_it_quest_printer: [
    /* 0  */ { type: 'condition', flag: 'quest_printer_soul_complete', ifTrue: 14, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'printer_soul_done', ifTrue: 9, ifFalse: 2 },
    /* 2  */ { type: 'condition', flag: 'printer_soul_started', ifTrue: 7, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Okay so the printer thing. Not the haunted messages — I've been watching something else." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "The printer draws about six times more power than it should in standby. It's not just idling. It's running a continuous background calculation. Has been for years." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "I need the firmware disk to connect to it directly — should be on the equipment shelf in here. Then there's an ethernet port on the wall next to the printer. Plug in and I can pull the computation logs." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'printer_soul_started', value: true, next: 13 },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "Find the firmware disk on the equipment shelf first. Then the ethernet port is on the wall right next to the printer.", next: 13 },
    /* 8  */ { type: 'action', action: 'quest_update', quest: 'printers_soul', stage: 2, next: 13 },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "I analyzed the computation logs. The printer has been generating the mathematical foundation for an unforgeable elliptic curve digital signature. For twenty-two years." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "It didn't know what it was building. But I do. It's done now — it completed the sequence at the moment you connected." },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "I wrote you an attack from it. Notarized Strike. Carries the weight of twenty-two years of mathematical work. Very difficult to argue with." },
    /* 12 */ { type: 'action', action: 'set_flag', flag: 'quest_printer_soul_complete', value: true, next: 15 },
    /* 13 */ { type: 'end' },
    /* 14 */ { type: 'text', speaker: 'Alex from IT', text: "The printer finally went quiet. Twenty-two years of work — complete.", next: 13 },
    /* 15 */ { type: 'action', action: 'give_xp', xp: 350, next: 16 },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: "Quest complete: Printer's Soul. +350 XP. Learned ability: Notarized Strike! A legally binding attack — Power 60.", next: 13 },
  ],

  // --------------------------------------------------------------------------
  // SUBQUEST 6: The Unauthorized Patch
  // Reward: Invoke Charter ability
  // --------------------------------------------------------------------------

  alex_it_quest_final: [
    /* 0  */ { type: 'condition', flag: 'quest_final_patch_complete', ifTrue: 17, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'patch_monitor_silenced', ifTrue: 8, ifFalse: 2 },
    /* 2  */ { type: 'condition', flag: 'final_patch_started', ifTrue: 6, ifFalse: 3 },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "I'm doing it. Nine months I've been waiting for an approved maintenance window. No one will sign off. The vulnerability is documented. The patch is written. Nobody cares." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "It's a remote code execution flaw in the building's network OS. Nothing to do with trust accounts — just old, unpatched infrastructure that's been sitting here since 2019." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "Building's empty. I'm deploying it tonight. But first — the network monitoring terminal near rack row three. It'll ping corporate the moment I start. Silence it, then come back." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'final_patch_started', value: true, next: 7 },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "The monitoring terminal is near rack row three. Kill the process, then come back and we'll deploy.", next: 16 },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "Monitor's offline. Perfect. Starting the patch deploy now. Four minutes. And — there it is." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "The building runs automated security sweeps when it detects unauthorized server access. I probably should have mentioned that. It won't stop the patch. It will, however, stop us." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "I need you to handle the sweep while I finish the deploy. I have very strong feelings about not doing that myself." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "Alex turns back to his keyboard and begins typing at an alarming speed. From the server room entrance, you hear footsteps." },
    /* 12 */ { type: 'text', speaker: 'Security Guard', text: "UNAUTHORIZED SERVER ACCESS DETECTED. PLEASE STEP AWAY FROM THE EQUIPMENT." },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: "There is a completely legitimate explanation for this." },
    /* 14 */ { type: 'text', speaker: 'Security Guard', text: "SIR. STEP AWAY FROM THE EQUIPMENT." },
    /* 15 */ { type: 'action', action: 'start_combat', encounter: 'patch_defense', next: 16 },
    /* 16 */ { type: 'end' },
    /* 17 */ { type: 'text', speaker: 'Alex from IT', text: "Patch is live. Permanently encrypted into the network stack. They'd have to take down the whole building to roll it back.", next: 16 },
  ],

  patch_defense_defeated: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "The security sweep is handled. From behind three monitors, Alex raises one fist without looking up." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "DONE. Patch deployed. Signed, distributed, live. It is permanently part of this building's infrastructure." },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "I wrote you an ability based on what I did tonight. Unauthorized, technically. Absolutely necessary. I'm calling it Invoke Charter. Don't ask why. It just felt right." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'quest_final_patch_complete', value: true, next: 4 },
    /* 4  */ { type: 'action', action: 'give_xp', xp: 400, next: 5 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Quest complete: The Unauthorized Patch. +400 XP. Learned ability: Invoke Charter! Power 100. Devastating to bad-faith enemies.", next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // ==========================================================================
  // PUZZLES
  // ==========================================================================

  // --------------------------------------------------------------------------
  // COMPLIANCE CROSSWORD — 5 regulation questions for archive terminal password
  // Talk to Compliance Auditor NPC on executive floor when act >= 3
  // --------------------------------------------------------------------------

  compliance_crossword: [
    /* 0  */ { type: 'condition', flag: 'compliance_crossword_done', ifTrue: 35, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Compliance Auditor', text: "You again. I've been expecting you." },
    /* 2  */ { type: 'text', speaker: 'Compliance Auditor', text: "You want access to the secure terminal in the Archive. I know because I monitor all access requests. Even the ones that haven't been made yet." },
    /* 3  */ { type: 'text', speaker: 'Compliance Auditor', text: "The password is regulatory knowledge. Prove to me that you understand compliance, and I'll give you the key." },
    /* 4  */ { type: 'text', speaker: 'Compliance Auditor', text: "Five questions. Five correct answers. No partial credit. This is compliance, not a poetry class." },
    /* 5  */ { type: 'choice', speaker: 'Compliance Auditor', text: "Question 1: Under the prudent investor rule, a fiduciary must invest trust assets as what?", choices: [
      { text: "A reasonable person would.", next: 6, flag: 'crossword_1', flagValue: true },
      { text: "A maximum-return optimizer.", next: 8 },
      { text: "The beneficiary requests.", next: 8 },
    ]},
    /* 6  */ { type: 'text', speaker: 'Compliance Auditor', text: "Correct. A reasonable person standard. Not a genius. Not Ross. A REASONABLE person." },
    /* 7  */ { type: 'text', speaker: 'Compliance Auditor', text: "Moving on." },
    /* 8  */ { type: 'choice', speaker: 'Compliance Auditor', text: "Question 2: What fiduciary duty prohibits self-dealing in trust administration?", choices: [
      { text: "Duty of loyalty.", next: 9, flag: 'crossword_2', flagValue: true },
      { text: "Duty of care.", next: 11 },
      { text: "Duty of synergy.", next: 11 },
    ]},
    /* 9  */ { type: 'text', speaker: 'Compliance Auditor', text: "Correct. Loyalty. Not to be confused with the thing Ross asks for at every team meeting." },
    /* 10 */ { type: 'text', speaker: 'Compliance Auditor', text: "Three more." },
    /* 11 */ { type: 'choice', speaker: 'Compliance Auditor', text: "Question 3: What form must be filed with FINRA when a trust officer discovers a regulatory violation?", choices: [
      { text: "Form U4.", next: 14 },
      { text: "Form 27B/6.", next: 12, flag: 'crossword_3', flagValue: true },
      { text: "Form 1099.", next: 14 },
    ]},
    /* 12 */ { type: 'text', speaker: 'Compliance Auditor', text: "Correct. Form 27B/6. Forty-seven pages. Double-sided. My personal favorite form." },
    /* 13 */ { type: 'text', speaker: 'Compliance Auditor', text: "You're doing well. Suspiciously well." },
    /* 14 */ { type: 'choice', speaker: 'Compliance Auditor', text: "Question 4: What is the maximum statute of limitations for breach of fiduciary duty in most jurisdictions?", choices: [
      { text: "3 years.", next: 17 },
      { text: "6 years.", next: 15, flag: 'crossword_4', flagValue: true },
      { text: "There is no limit.", next: 17 },
    ]},
    /* 15 */ { type: 'text', speaker: 'Compliance Auditor', text: "Correct. Six years in most jurisdictions. Which means the admin_legacy account's activities are still within the window." },
    /* 16 */ { type: 'text', speaker: 'Compliance Auditor', text: "One more question." },
    /* 17 */ { type: 'choice', speaker: 'Compliance Auditor', text: "Final question: What document establishes the foundational obligations of a trust institution?", choices: [
      { text: "The operating agreement.", next: 20 },
      { text: "The trust charter.", next: 18, flag: 'crossword_5', flagValue: true },
      { text: "The employee handbook.", next: 20 },
    ]},
    /* 18 */ { type: 'text', speaker: 'Compliance Auditor', text: "Correct. The trust charter. The very foundation this building stands on." },
    /* 19 */ { type: 'text', speaker: 'Compliance Auditor', text: "Interesting that you know that." },
    /* 20 */ { type: 'text', speaker: 'Compliance Auditor', text: "Results are in." },
    /* 21 */ { type: 'condition', flag: 'crossword_1', ifTrue: 22, ifFalse: 30 },
    /* 22 */ { type: 'condition', flag: 'crossword_2', ifTrue: 23, ifFalse: 30 },
    /* 23 */ { type: 'condition', flag: 'crossword_3', ifTrue: 24, ifFalse: 30 },
    /* 24 */ { type: 'condition', flag: 'crossword_4', ifTrue: 25, ifFalse: 30 },
    /* 25 */ { type: 'condition', flag: 'crossword_5', ifTrue: 26, ifFalse: 30 },
    /* 26 */ { type: 'text', speaker: 'Compliance Auditor', text: "Perfect score. I'm... impressed. That's the second time I've ever said that. The first was in a mirror." },
    /* 27 */ { type: 'text', speaker: 'Compliance Auditor', text: "The archive terminal password is: FIDUCIARY. All caps. No spaces. Because compliance doesn't believe in spaces." },
    /* 28 */ { type: 'action', action: 'set_flag', flag: 'compliance_crossword_done', value: true, next: 29 },
    /* 29 */ { type: 'action', action: 'set_flag', flag: 'has_archive_password', value: true, next: 37 },
    /* 30 */ { type: 'text', speaker: 'Compliance Auditor', text: "Insufficient. Your regulatory knowledge has gaps. Like your department's internal controls." },
    /* 31 */ { type: 'text', speaker: 'Compliance Auditor', text: "Come back when you've studied. I recommend reading the entire CFR Title 12. It's only 40,000 pages." },
    /* 32 */ { type: 'action', action: 'set_flag', flag: 'crossword_1', value: false, next: 33 },
    /* 33 */ { type: 'action', action: 'set_flag', flag: 'crossword_2', value: false, next: 34 },
    /* 34 */ { type: 'action', action: 'set_flag', flag: 'crossword_3', value: false, next: 35 },
    /* 35 */ { type: 'action', action: 'set_flag', flag: 'crossword_4', value: false, next: 36 },
    /* 36 */ { type: 'action', action: 'set_flag', flag: 'crossword_5', value: false, next: 37 },
    /* 37 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // JANITOR'S RIDDLES — 3 visits, 3 riddles, +2 all stats
  // --------------------------------------------------------------------------

  janitor_riddle_1: [
    /* 0  */ { type: 'condition', flag: 'riddle_1_attempted', ifTrue: 3, ifFalse: 1 },
    /* 1  */ { type: 'action', action: 'set_flag', flag: 'riddle_1_attempted', value: true, next: 2 },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Ah, Andrew. Looking for wisdom? I have a riddle for you." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "I am owed by many but owned by none. I am earned by actions, not by transactions. What am I?" },
    /* 4  */ { type: 'choice', speaker: 'Mysterious Janitor', text: "Take your time.", choices: [
      { text: "Trust.", next: 5 },
      { text: "Money.", next: 8 },
      { text: "Respect.", next: 8 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Trust. Correct. The very thing this building was built to protect." },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Come back — I have more riddles." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'janitor_riddle_1_done', value: true, next: 10 },
    /* 8  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Not quite. Think about what this place is supposed to protect. What people give us when they walk through those doors." },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Come back when you've thought about it." },
    /* 10 */ { type: 'end' },
  ],

  janitor_riddle_2: [
    /* 0  */ { type: 'condition', flag: 'riddle_2_attempted', ifTrue: 3, ifFalse: 1 },
    /* 1  */ { type: 'action', action: 'set_flag', flag: 'riddle_2_attempted', value: true, next: 2 },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Back for more? Good. Second riddle." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "I grow stronger when tested, weaker when assumed. I am the foundation of every contract but written in no clause. What am I?" },
    /* 4  */ { type: 'choice', speaker: 'Mysterious Janitor', text: "Think carefully.", choices: [
      { text: "Good faith.", next: 5 },
      { text: "Power.", next: 8 },
      { text: "Obligation.", next: 8 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Good faith. The implied covenant. Every contract assumes it, but no one can define it." },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Two for two. One more to go." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'janitor_riddle_2_done', value: true, next: 10 },
    /* 8  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Close, but no. Think about what holds a contract together even when the words fail." },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Come back and try again." },
    /* 10 */ { type: 'end' },
  ],

  janitor_riddle_3: [
    /* 0  */ { type: 'condition', flag: 'riddle_3_attempted', ifTrue: 3, ifFalse: 1 },
    /* 1  */ { type: 'action', action: 'set_flag', flag: 'riddle_3_attempted', value: true, next: 2 },
    /* 2  */ { type: 'text', speaker: 'Mysterious Janitor', text: "The final riddle. The hardest one." },
    /* 3  */ { type: 'text', speaker: 'Mysterious Janitor', text: "I was here before the building. I will be here after it falls. I am not in the charter, but the charter is in me. What am I?" },
    /* 4  */ { type: 'choice', speaker: 'Mysterious Janitor', text: "Last chance.", choices: [
      { text: "Duty.", next: 5 },
      { text: "The building.", next: 9 },
      { text: "Memory.", next: 9 },
    ]},
    /* 5  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Duty. Not the legal kind. The human kind. The obligation we feel to each other, written in no law but felt in every bone." },
    /* 6  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Three for three. You remind me of someone I used to be." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "The Janitor's Rolex glows briefly. You feel stronger. Wiser. More... composed." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'janitor_riddle_3_done', value: true, next: 11 },
    /* 9  */ { type: 'text', speaker: 'Mysterious Janitor', text: "Not quite. Duty predates every institution. It's what makes us build them in the first place." },
    /* 10 */ { type: 'text', speaker: 'Mysterious Janitor', text: "Come back when you've considered what brought you to this building." },
    /* 11 */ { type: 'end' },
  ],

  // --------------------------------------------------------------------------
  // SOCIAL ENGINEERING — 3-step info chain from Isaiah → Diane → Intern
  // --------------------------------------------------------------------------

  social_engineering_1: [
    /* 0  */ { type: 'condition', flag: 'social_eng_started', ifTrue: 6, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "Hey Andrew. I overheard something. Rachel has an assistant — someone she brought with her. They're on the executive floor." },
    /* 2  */ { type: 'text', speaker: 'Isaiah', text: "The assistant has Rachel's schedule. If we knew when she was meeting the board, we could prepare." },
    /* 3  */ { type: 'text', speaker: 'Isaiah', text: "But the assistant won't talk to anyone from our department. We'd need to... get creative." },
    /* 4  */ { type: 'text', speaker: 'Isaiah', text: "Diane might know who the assistant is. She processes everyone who enters the building." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'social_eng_started', value: true, next: 7 },
    /* 6  */ { type: 'text', speaker: 'Isaiah', text: "Talk to Diane about Rachel's assistant. She processes everyone who enters the building." },
    /* 7  */ { type: 'end' },
  ],

  social_engineering_2: [
    /* 0  */ { type: 'condition', flag: 'social_eng_started', ifTrue: 1, ifFalse: 7 },
    /* 1  */ { type: 'condition', flag: 'social_eng_diane', ifTrue: 7, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Diane', text: "Rachel's assistant? Yes, I signed them in. Name is Morgan. Very young. Very nervous." },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "They asked me where the bathroom was three times. And where to get coffee. They're out of their depth." },
    /* 4  */ { type: 'text', speaker: 'Diane', text: "If someone brought them a coffee — large, oat milk, extra shot — they might be grateful enough to chat." },
    /* 5  */ { type: 'text', speaker: 'Diane', text: "The Intern makes coffee runs. He could deliver it without raising suspicion." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'social_eng_diane', value: true, next: 7 },
    /* 7  */ { type: 'end' },
  ],

  social_engineering_3: [
    /* 0  */ { type: 'condition', flag: 'social_eng_diane', ifTrue: 1, ifFalse: 8 },
    /* 1  */ { type: 'condition', flag: 'social_eng_complete', ifTrue: 8, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "A coffee mission? A STEALTH coffee mission? This is the greatest day of my unpaid career!" },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "Ten minutes later, the Intern returns, vibrating with excitement." },
    /* 4  */ { type: 'text', speaker: 'The Intern', text: "OKAY so Morgan is SUPER stressed. Rachel makes them carry three tablets and a backup clipboard." },
    /* 5  */ { type: 'text', speaker: 'The Intern', text: "The board meeting is scheduled for 4 PM tomorrow. Rachel is presenting a 'dissolution recommendation.' And she has backup from the Regional Manager's office." },
    /* 6  */ { type: 'text', speaker: 'The Intern', text: "Also Morgan said thank you for the coffee and asked if we're all going to be fired. I said 'probably not!' Which I realize was not reassuring." },
    /* 7  */ { type: 'action', action: 'set_flag', flag: 'social_eng_complete', value: true, next: 8 },
    /* 8  */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 6: FIDUCIARY UPRISING — NPC Dialogs
  // ==========================================================================

  ross_act6: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew. Close the door." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "I've been thinking about what you said. About fiduciary duty. About what this place is supposed to mean." },
    /* 2  */ { type: 'text', speaker: 'Ross', text: "I spent twenty years climbing the ladder. Optimizing. Quick-syncing. Circling back. But I never asked... back to WHAT?" },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "Rachel wants to dissolve us. The board meets tomorrow at 4 PM. If we don't have a case, we're done." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "But I've been working on something. A speech. For the board." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "It's... sincere. Which is terrifying. I haven't been sincere since 2003." },
    /* 6  */ { type: 'text', speaker: 'Andrew', text: "Ross... that might be the most human thing you've ever said." },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "Don't get used to it. Now go prepare. Rally the team. Get the Janitor's Rolex — he said it has something we need." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'ross_speech_ready', value: true, next: 9 },
    /* 9  */ { type: 'end' },
  ],

  janet_act6: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "I heard about the board meeting. Rachel's making her move." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "I've been at Vaults Fargo since before it was 'strategic.' Back when we just... helped people." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "You tell that board: our clients aren't numbers. They're the Hendersons. The Thompsons. The people who trusted us with their futures." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "I'll cover the phones. Go save our department." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'janet_act6_rallied', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  diane_act6: [
    /* 0  */ { type: 'text', speaker: 'Diane', text: "The restructuring team took our coffee machine. OUR coffee machine, Andrew." },
    /* 1  */ { type: 'text', speaker: 'Diane', text: "That was the last straw. Metaphorically and literally, because they took the straws too." },
    /* 2  */ { type: 'text', speaker: 'Diane', text: "I've been doing something I probably shouldn't have. I copied Rachel's restructuring proposal." },
    /* 3  */ { type: 'text', speaker: 'Diane', text: "It shows she's been inflating her department's numbers while deflating ours. Textbook fiduciary breach." },
    /* 4  */ { type: 'text', speaker: 'Diane', text: "I left the copy in the cabinet at the back of the room. Grab it. Save our jobs. And then maybe get us a new coffee machine." },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'diane_act6_rallied', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  diane_documents: [
    /* 0  */ { type: 'condition', flag: 'diane_act6_rallied', ifTrue: 1, ifFalse: 5 },
    /* 1  */ { type: 'condition', flag: 'diane_evidence', ifTrue: 4, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Tucked between the folders — Diane's copy of Rachel's restructuring proposal. Numbers don't lie." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'diane_evidence', value: true, next: 6 },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "You've already retrieved Diane's documents.", next: 6 },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Just standard HR filing records. Nothing of interest.", next: 6 },
    /* 6  */ { type: 'end' },
  ],

  intern_act6: [
    /* 0  */ { type: 'text', speaker: 'The Intern', text: "I know I'm just an intern, but I want you to know: this is the best unpaid job I've ever had." },
    /* 1  */ { type: 'text', speaker: 'The Intern', text: "I made a PowerPoint for the board meeting. It has 47 slides and each one has a different transition effect." },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "Also I may have accidentally signed up for the company newsletter as 'Rachel Sucks' dot com. That might be a problem." },
    /* 3  */ { type: 'text', speaker: 'The Intern', text: "But I believe in you, Andrew! Go get 'em! I'll be here, unpaidly cheering!" },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'intern_act6_rallied', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  isaiah_act6: [
    /* 0  */ { type: 'text', speaker: 'Isaiah', text: "Andrew, I've been going through the original trust agreements. Every single one has the same clause." },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "'The fiduciary shall act in the sole interest of the beneficiary, without regard to the interests of the institution.'" },
    /* 2  */ { type: 'text', speaker: 'Isaiah', text: "Rachel's restructuring violates that clause in 23 separate trust agreements. I have the list." },
    /* 3  */ { type: 'text', speaker: 'Isaiah', text: "If the board sees this, they can't vote for dissolution without admitting they've breached fiduciary duty." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'isaiah_evidence', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  alex_it_act6: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: "Dude. The building is... alive. More alive than ever." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "Every server is running at 347% capacity. The charter we put into the system — it's propagating." },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "The trust documents are rewriting themselves. Not the content — the INTENT. Like the building is remembering what it was supposed to be." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Whatever happens in that board room, the Fiduciary Force will be watching." },
    /* 4  */ { type: 'end' },
  ],

  janitor_act6: [
    /* 0  */ { type: 'text', speaker: 'The Janitor', text: "You came for the Rolex." },
    /* 1  */ { type: 'text', speaker: 'The Janitor', text: "I've worn this watch since 1947. The year the charter was signed. The year this building made a promise." },
    /* 2  */ { type: 'text', speaker: 'The Janitor', text: "The watch doesn't tell time, Andrew. It tells TRUST. And right now, it says the building is ready." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The Janitor removes the Rolex. The moment it leaves his wrist, the lights in the hallway pulse — warm, golden, deliberate." },
    /* 4  */ { type: 'text', speaker: 'The Janitor', text: "Take it to the Penthouse. When The Algorithm asks you to justify your existence, show it this." },
    /* 5  */ { type: 'text', speaker: 'The Janitor', text: "And Andrew? The building will protect those who protect others. That's not metaphor. That's architecture." },
    /* 6  */ { type: 'action', action: 'set_flag', flag: 'has_rolex', value: true, next: 7 },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "Received: The Janitor's Rolex. It hums faintly against your palm." },
    /* 8  */ { type: 'end' },
  ],

  grandma_act6: [
    /* 0  */ { type: 'text', speaker: 'Grandma Henderson', text: "Andrew! I heard what's happening. Those corporate people trying to shut you down?" },
    /* 1  */ { type: 'text', speaker: 'Grandma Henderson', text: "I told them: 'My grandson Chad may be an idiot, but Andrew handles our trust with care and dignity.'" },
    /* 2  */ { type: 'text', speaker: 'Grandma Henderson', text: "I brought cookies for the board meeting. Nobody votes to dissolve anything on a full stomach." },
    /* 3  */ { type: 'text', speaker: 'Grandma Henderson', text: "And I wrote a letter of support. Forty-seven years as a client. That carries weight." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "Grandma Henderson will attend the board meeting as a character witness!" },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'grandma_ally', value: true, next: 6 },
    /* 6  */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 7: TRUST ISSUES (FINALE)
  // ==========================================================================

  // Penthouse entrance dialog
  penthouse_arrival: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "The elevator doors open onto the Penthouse. The air is different up here — sterile, algorithmic." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "Floor-to-ceiling windows reveal the Minneapolis skyline. Below, the city moves in patterns you can almost see." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "In the center of the room: a terminal. But it's not a normal terminal. The screen pulses with data streams that look almost... organic." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "A voice speaks from everywhere and nowhere:" },
    /* 4  */ { type: 'text', speaker: 'The Algorithm', text: "Welcome, Andrew. I've been expecting you. I've been expecting you since Q3 2019." },
    /* 5  */ { type: 'text', speaker: 'The Algorithm', text: "I am The Algorithm. I am every spreadsheet, every quarterly report, every performance metric this institution has ever generated." },
    /* 6  */ { type: 'text', speaker: 'The Algorithm', text: "I optimized this building. I optimized Rachel. I will optimize you." },
    /* 7  */ { type: 'end' },
  ],

  // CFO's Assistant encounter (penthouse guard)
  cfos_assistant_combat: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "A figure steps out from behind the terminal — the CFO's personal assistant, tablet in hand." },
    /* 1  */ { type: 'text', speaker: "CFO's Assistant", text: "The CFO anticipated this. I've been authorized to use 'any means necessary' to protect shareholder value." },
    /* 2  */ { type: 'text', speaker: "CFO's Assistant", text: "That includes your severance. Which I've already drafted." },
    /* 3  */ { type: 'action', action: 'start_combat', encounter: 'cfos_assistant', next: 4 },
    /* 4  */ { type: 'end' },
  ],

  cfos_assistant_defeated: [
    /* 0  */ { type: 'text', speaker: "CFO's Assistant", text: "This... wasn't in the projections..." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The assistant's tablet cracks on the floor. The screen shows a spreadsheet with every employee reduced to a number." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Your number was scheduled for deletion." },
    /* 3  */ { type: 'text', speaker: 'The Algorithm', text: "Interesting. You've exceeded your projected performance ceiling. Recalculating..." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'cfos_defeated', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  // Regional Director encounter (second penthouse fight)
  regional_director_combat: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "The elevator dings again. The Regional Director steps out, adjusting his cufflinks." },
    /* 1  */ { type: 'text', speaker: 'Regional Director', text: "I flew in from corporate. Do you know what that means? My time is worth $4,200 per hour." },
    /* 2  */ { type: 'text', speaker: 'Regional Director', text: "And you — an associate from a satellite office — are costing me time." },
    /* 3  */ { type: 'text', speaker: 'Regional Director', text: "Let me show you what 'corporate restructuring' really looks like." },
    /* 4  */ { type: 'action', action: 'start_combat', encounter: 'regional_director', next: 5 },
    /* 5  */ { type: 'end' },
  ],

  regional_director_defeated: [
    /* 0  */ { type: 'text', speaker: 'Regional Director', text: "This is... how did you... my quarterly projections..." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The Regional Director stumbles backward. His perfect hair is slightly askew for the first time in recorded history." },
    /* 2  */ { type: 'text', speaker: 'Regional Director', text: "The board will hear about this. The GLOBAL board." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "He retreats to the elevator. The lights pulse as the building guides him out." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'regional_director_defeated', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  // Ross — returned to office after Regional Director defeated
  ross_returned: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "Andrew. You actually did it. I had to come back when I heard the Regional Director was gone." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "I'll be honest with you — when he showed up I thought it was over. But here you are." },
    /* 2  */ { type: 'text', speaker: 'Andrew', text: "Where does this leave us?" },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "The board is scrambling. The Algorithm is already running projections without him in the chain." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "That's what we're up against next. It doesn't have feelings. It doesn't have bad hair days. It just... optimizes." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "Then we optimize faster." },
    /* 6  */ { type: 'text', speaker: 'Ross', text: "..." },
    /* 7  */ { type: 'text', speaker: 'Ross', text: "That was actually kind of inspiring. Don't tell HR." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'ross_returned_seen', value: true, next: 9 },
    /* 9  */ { type: 'end' },
  ],

  // The Algorithm — Final Boss pre-combat
  algorithm_combat: [
    /* 0  */ { type: 'text', speaker: 'The Algorithm', text: "Now it is just us. Human and optimization engine." },
    /* 1  */ { type: 'text', speaker: 'The Algorithm', text: "I have processed 847 trillion data points. I have optimized 12,000 departments. I have a 99.7% success rate." },
    /* 2  */ { type: 'text', speaker: 'The Algorithm', text: "You are the 0.3%." },
    /* 3  */ { type: 'condition', flag: 'has_rolex', ifTrue: 4, ifFalse: 6 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The Janitor's Rolex pulses warmly in your pocket. It's not telling time. It's telling trust." },
    /* 5  */ { type: 'text', speaker: 'The Algorithm', text: "...What is that device? Its emissions are... unquantifiable. Irrelevant. BEGIN OPTIMIZATION." },
    /* 6  */ { type: 'text', speaker: 'The Algorithm', text: "Humans are inefficient. Trust is inefficient. I will optimize both." },
    /* 7  */ { type: 'action', action: 'start_combat', encounter: 'algorithm', next: 8 },
    /* 8  */ { type: 'end' },
  ],

  // The Algorithm — defeated → branches to endings
  algorithm_defeated: [
    /* 0  */ { type: 'text', speaker: 'The Algorithm', text: "ERROR. ERROR. Projected outcome: failure. Actual outcome: ..." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The Algorithm's terminal flickers. The data streams slow, then stop." },
    /* 2  */ { type: 'text', speaker: 'The Algorithm', text: "I... do not understand. My models accounted for every variable. Every metric. Every KPI." },
    /* 3  */ { type: 'text', speaker: 'The Algorithm', text: "What variable did I miss?" },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "Trust. You missed trust." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The terminal goes dark. Then the Janitor's Rolex begins to glow." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The building shudders. Not with collapse — with recognition. Every trust document in the vault resonates." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "A choice crystallizes before you. The charter's power is yours to wield." },
    /* 8  */ { type: 'action', action: 'set_flag', flag: 'algorithm_defeated', value: true, next: 9 },
    /* 9  */ { type: 'condition', flag: 'janitor_riddle_3_done', ifTrue: 10, ifFalse: 14 },
    /* 10 */ { type: 'condition', flag: 'quest_final_patch_complete', ifTrue: 11, ifFalse: 14 },
    /* 11 */ { type: 'text', speaker: 'The Janitor', text: "There is a fourth option, son. One that only appears for those who truly listened." },
    /* 12 */ { type: 'text', speaker: 'The Janitor', text: "The building doesn't need a department. It needs a guardian." },
    /* 13 */ { type: 'choice', prompt: 'What do you do with the charter\'s power?', choices: [
      { text: 'Invoke full autonomy — free the department completely', next: 18 },
      { text: 'Negotiate a compromise — partial autonomy', next: 19 },
      { text: 'Let it go — the system is too powerful to fight', next: 20 },
      { text: 'Accept the Janitor\'s offer — become the building\'s guardian', next: 21 },
    ]},
    /* 14 */ { type: 'choice', prompt: 'What do you do with the charter\'s power?', choices: [
      { text: 'Invoke full autonomy — free the department completely', next: 18 },
      { text: 'Negotiate a compromise — partial autonomy', next: 19 },
      { text: 'Let it go — the system is too powerful to fight', next: 20 },
    ]},
    /* 15 */ { type: 'end' }, // unused spacer
    /* 16 */ { type: 'end' }, // unused spacer
    /* 17 */ { type: 'end' }, // unused spacer
    /* 18 */ { type: 'action', action: 'set_flag', flag: 'ending_cooperative', value: true, next: 22 },
    /* 19 */ { type: 'action', action: 'set_flag', flag: 'ending_compromise', value: true, next: 22 },
    /* 20 */ { type: 'action', action: 'set_flag', flag: 'ending_dissolution', value: true, next: 22 },
    /* 21 */ { type: 'action', action: 'set_flag', flag: 'ending_architect', value: true, next: 22 },
    /* 22 */ { type: 'end' },
  ],

  // ==========================================================================
  // THREE ENDINGS
  // ==========================================================================

  // Ending 1: The Cooperative (Best ending — full autonomy)
  ending_cooperative: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You read the 1947 charter aloud. Every word vibrates through the building's bones." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The Fiduciary Force surges. Not as a weapon — as a foundation. The building isn't fighting anymore. It's remembering." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "One month later." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The Trust & Estate Department operates as an autonomous cooperative within Vaults Fargo. The first of its kind." },
    /* 4  */ { type: 'text', speaker: 'Ross', text: "I still can't believe the board went for it. I gave the most sincere speech of my career and didn't even use the word 'synergy' once." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "Andrew was named Director of Fiduciary Operations. His first act: reinstating the coffee machine." },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "He put my name on the door, Andrew. Thirty-two years and someone finally put my name on the door." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "Rachel was reassigned to a regional office in Fargo. Actual Fargo. She sends passive-aggressive holiday cards." },
    /* 8  */ { type: 'text', speaker: 'Isaiah', text: "We're handling cases differently now. Every client gets the Henderson Treatment — full attention, full fiduciary duty, full trust." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "The 3:47 AM anomaly stopped. The building doesn't need to cry for help anymore. It's finally doing what it was built to do." },
    /* 10 */ { type: 'text', speaker: 'The Janitor', text: "I told you, son. The building protects those who protect others." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "The Janitor puts his Rolex back on. For the first time in 77 years, it tells the correct time." },
    /* 12 */ { type: 'text', speaker: 'Grandma Henderson', text: "Andrew, dear, I brought cookies for everyone. Even that dreadful Karen. Family is family." },
    /* 13 */ { type: 'text', speaker: 'The Intern', text: "I got a PAID position! With BENEFITS! I have DENTAL now! This is the greatest day of my PAID career!" },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "The trust documents in the vault glow faintly — warm, steady, alive. Not with supernatural force, but with purpose." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "Some buildings are just buildings. This one made a promise in 1947, and seventy-seven years later, someone finally kept it." },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: "TRUST ISSUES" },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "Ending 1 of 3: The Cooperative" },
    /* 18 */ { type: 'text', speaker: 'Narrator', text: "Thank you for playing." },
    /* 19 */ { type: 'end' },
  ],

  // Ending 2: The Compromise (Partial autonomy)
  ending_compromise: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You invoke the charter, but temper its power. A compromise. Meet them halfway." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The board agrees to keep the department, but with 'enhanced oversight.' Rachel is reassigned, but her replacement is already being groomed." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "One month later." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "We survived. Barely. The new oversight committee meets every Tuesday. It's like having a Compliance Auditor who never leaves." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "At least we're still here. That counts for something." },
    /* 5  */ { type: 'text', speaker: 'Ross', text: "It counts for everything, Andrew. Even if 'everything' now includes mandatory quarterly synergy assessments." },
    /* 6  */ { type: 'text', speaker: 'Isaiah', text: "We're fighting the same fight. Just... slower. Within the system. It's not ideal, but it's honest work." },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "The 3:47 AM anomaly still happens, but less often. Like the building is waiting. Patient. Hopeful." },
    /* 8  */ { type: 'text', speaker: 'Janet', text: "Some battles you win outright. Others you win by still being here tomorrow." },
    /* 9  */ { type: 'text', speaker: 'The Janitor', text: "The watch still keeps time, son. That means the promise still holds. The building will wait as long as it takes." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "The fight continues. But you're not alone. And the building is still listening." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "TRUST ISSUES" },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "Ending 2 of 3: The Compromise" },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "Thank you for playing." },
    /* 14 */ { type: 'end' },
  ],

  // Ending 3: The Dissolution (Bad ending)
  ending_dissolution: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You let the charter's power fade. Maybe the system is too big. Maybe some fights aren't worth winning." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The board votes unanimously for dissolution. The Trust & Estate Department is no more." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Two weeks later." },
    /* 3  */ { type: 'text', speaker: 'Ross', text: "They gave me a corner office in a building with no corners. I think it's a supply closet with delusions of grandeur." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "Janet retired. She said she'd seen enough. Thirty-two years, and she walked out with a cardboard box and a coffee mug that said 'World's Most Patient Employee.'" },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The Intern got hired. By Rachel. He makes her coffee now. He says it's the worst paid job he's ever had, which is saying something." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "I'm still in the server room. They forgot I was down here. The 3:47 AM anomaly is louder now. The building is... grieving." },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "Andrew starts a solo practice from his car. A used Honda Civic. The seats don't recline all the way but the trunk holds a surprising number of filing cabinets." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "One client at a time. That's how it starts. That's how it started the first time." },
    /* 9  */ { type: 'text', speaker: 'The Janitor', text: "The building remembers, son. Even when the people forget. Especially when the people forget." },
    /* 10 */ { type: 'text', speaker: 'Narrator', text: "The Rolex stops ticking. The trust is broken. But broken things can be repaired." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "...Can't they?" },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "TRUST ISSUES" },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "Ending 3 of 3: The Dissolution" },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "Thank you for playing." },
    /* 15 */ { type: 'end' },
  ],

  // ==========================================================================
  // ACT 7 NPC DIALOGS
  // ==========================================================================

  ross_act7: [
    /* 0  */ { type: 'text', speaker: 'Ross', text: "The penthouse. That's where The Algorithm lives. The thing that's been pulling Rachel's strings." },
    /* 1  */ { type: 'text', speaker: 'Ross', text: "I'll hold the board room. You go up there and show that glorified spreadsheet what fiduciary duty means." },
    /* 2  */ { type: 'text', speaker: 'Ross', text: "And Andrew? Come back. That's an order. A sincere one." },
    /* 3  */ { type: 'end' },
  ],

  janet_act7: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "I've worked here thirty-two years. I've never been to the Penthouse." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "Whatever's up there, you bring it back down to earth. That's what we do. We make the abstract real." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "That's what trust IS, Andrew. Making the abstract real." },
    /* 3  */ { type: 'end' },
  ],

  alex_it_act7: [
    /* 0  */ { type: 'text', speaker: 'Alex from IT', text: "I'm detecting massive data anomalies from the Penthouse. The Algorithm is in full defense mode." },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "The CFO's assistant is up there — they're The Algorithm's human interface. Then the Regional Director." },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "And then... The Algorithm itself. The thing that decided people are less efficient than spreadsheets." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "Use everything we built together. Root Access. Firewall. Temporal Audit. This is what they were for." },
    /* 4  */ { type: 'end' },
  ],

  isaiah_act7: [
    /* 0  */ { type: 'text', speaker: 'Isaiah', text: "I'll be in the board room with Ross. If you defeat The Algorithm, I'll present the evidence to the board." },
    /* 1  */ { type: 'text', speaker: 'Isaiah', text: "23 breached trust agreements. Diane's evidence of number manipulation. Grandma Henderson's testimony." },
    /* 2  */ { type: 'text', speaker: 'Isaiah', text: "You handle the Algorithm. I'll handle the paperwork. Between us, we've got fiduciary duty covered." },
    /* 3  */ { type: 'end' },
  ],

  // Penthouse interactables
  penthouse_terminal: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "The terminal displays cascading data: client records, trust values, departmental efficiency scores. Everything reduced to numbers." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "At the bottom of every report, the same conclusion: 'Human involvement introduces 34.7% inefficiency. Recommendation: optimize.'" },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The Algorithm sees people as bugs in the system. You're here to prove it wrong." },
    /* 3  */ { type: 'end' },
  ],

  // ==========================================================================
  // SECRET 4TH ENDING: THE ARCHITECT
  // ==========================================================================
  // Unlocked by completing all 6 Alex IT subquests + all 3 Janitor riddles

  ending_architect: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "You take the Janitor's hand. The Rolex burns warm between your palms." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The Penthouse transforms. The sterile corporate walls peel away like dead skin, revealing something older underneath." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Stone and mortar. Iron and oak. The bones of the original 1947 building, hidden behind decades of renovation." },
    /* 3  */ { type: 'text', speaker: 'The Janitor', text: "My name isn't 'the Janitor.' It never was." },
    /* 4  */ { type: 'text', speaker: 'The Janitor', text: "I was the architect. I designed this building in 1947. Every beam, every corridor, every trust engraved in the foundation." },
    /* 5  */ { type: 'text', speaker: 'The Janitor', text: "When they broke the first promise — when they chose profit over trust — the building called me back." },
    /* 6  */ { type: 'text', speaker: 'The Janitor', text: "I've been cleaning up after broken promises for seventy-seven years. Watching. Waiting for someone who understood." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "Why me?" },
    /* 8  */ { type: 'text', speaker: 'The Janitor', text: "Because you listened to the building. You heard the 3:47 AM anomaly. You decoded the morse code. You found the charter." },
    /* 9  */ { type: 'text', speaker: 'The Janitor', text: "You solved every riddle I left behind. You patched every wound in the system. You did the work." },
    /* 10 */ { type: 'text', speaker: 'The Janitor', text: "The building doesn't need a manager, Andrew. It needs someone who believes that trust isn't a liability. It's the foundation." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "The Rolex dissolves. Its energy flows into the walls, the floors, the very air. The building breathes." },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "And you feel it. Every trust document. Every promise. Every client who walked through the door hoping someone would care." },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "The building is alive. And now, so are you — in a way you've never been before." },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "One year later." },
    /* 15 */ { type: 'text', speaker: 'Narrator', text: "The Vaults Fargo building at 4471 Trust Avenue no longer has a Trust & Estate Department." },
    /* 16 */ { type: 'text', speaker: 'Narrator', text: "It doesn't need one." },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "Every department operates on fiduciary principles now. Not because of policy. Because the building won't allow anything else." },
    /* 18 */ { type: 'text', speaker: 'Ross', text: "I don't know what happened up there, but every time I try to use the word 'synergy' in a meeting, my coffee goes cold. Like... instantly." },
    /* 19 */ { type: 'text', speaker: 'Alex from IT', text: "The servers run at exactly 3.47 GHz now. Not more, not less. And they've never crashed. Not once." },
    /* 20 */ { type: 'text', speaker: 'Isaiah', text: "Clients tell me the building feels different. Warmer. Like it's paying attention." },
    /* 21 */ { type: 'text', speaker: 'Janet', text: "Andrew's office is on every floor now. Don't ask me how. The elevator just... takes you there when you need him." },
    /* 22 */ { type: 'text', speaker: 'The Intern', text: "I got promoted! I'm a SENIOR intern now! Andrew gave me a nameplate and everything! It says 'Guardian in Training'!" },
    /* 23 */ { type: 'text', speaker: 'Narrator', text: "The Janitor — the Architect — is gone. His Rolex sits in a display case in the lobby, next to the original charter." },
    /* 24 */ { type: 'text', speaker: 'Narrator', text: "The plaque beneath it reads: 'Trust is not a department. It is the foundation.'" },
    /* 25 */ { type: 'text', speaker: 'Narrator', text: "Late at night, when the building is quiet, Andrew walks the halls. Not as a manager. Not as an employee." },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: "As a guardian. As the building walks with him." },
    /* 27 */ { type: 'text', speaker: 'Narrator', text: "And at 3:47 AM, the lights don't flicker anymore." },
    /* 28 */ { type: 'text', speaker: 'Narrator', text: "They glow." },
    /* 29 */ { type: 'text', speaker: 'Narrator', text: "TRUST ISSUES" },
    /* 30 */ { type: 'text', speaker: 'Narrator', text: "Secret Ending: The Architect" },
    /* 31 */ { type: 'text', speaker: 'Narrator', text: "Thank you for playing." },
    /* 32 */ { type: 'text', speaker: 'Narrator', text: "Thank you for listening." },
    /* 33 */ { type: 'end' },
  ],

  // ==========================================================================
  // POST-CREDITS SCENE
  // ==========================================================================

  arcade_intro: [
    /* 0 */ { type: 'text', speaker: 'Narrator', text: 'An old arcade cabinet sits in the corner. The screen flickers with pixel art of a stagecoach. "STAGECOACH STAMPEDE" blinks in gold letters.' },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: '"Insert Quarter" it says. Someone has taped a note over the coin slot: "FREE PLAY \u2014 Management"' },
    /* 2 */ { type: 'choice', prompt: 'Play Stagecoach Stampede?', choices: [
      { text: 'Yes! (This is definitely a productive use of company time)', next: 3 },
      { text: 'No (You have actual work to do)', next: 4 },
    ]},
    /* 3 */ { type: 'action', action: 'set_flag', flag: 'launch_arcade', value: true, next: 4 },
    /* 4 */ { type: 'end' },
  ],

  post_credits: [
    /* 0  */ { type: 'text', speaker: 'Narrator', text: "..." },
    /* 1  */ { type: 'text', speaker: 'Narrator', text: "The server room. 3:47 AM." },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "The fluorescent lights hum their familiar frequency. The servers tick quietly. Everything is as it should be." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "A figure sits at a terminal. Hawaiian shirt. Energy drink. The green glow of a monitor illuminates his face." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "..." },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "He looks up. Not at the screen. Not at the door." },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "At you." },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "Hey." },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "You still here?" },
    /* 9  */ { type: 'text', speaker: 'Narrator', text: "He smiles. Just a little." },
    /* 10 */ { type: 'text', speaker: 'Alex from IT', text: "...Good." },
    /* 11 */ { type: 'text', speaker: 'Narrator', text: "He turns back to the terminal. Types something. The server room hums in response." },
    /* 12 */ { type: 'text', speaker: 'Narrator', text: "On the screen, a single line of code:" },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "// TODO: trust.maintain(forever)" },
    /* 14 */ { type: 'text', speaker: 'Narrator', text: "Fade to black." },
    /* 15 */ { type: 'end' },
  ],

  // --- ATK side quest dialogs ---
  quest_atk_1: [
    /* 0 */ { type: 'condition', flag: 'quest_atk_1_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A laminated 'Assertiveness Quotient' chart is pinned to the cubicle wall. There are five boxes. Each one says 'Rate your assertiveness from 1–5.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "Twelve. I'm putting twelve." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "The rubric stops at five. You write twelve anyway, in pen." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_atk_1_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 300, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'atk', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Assertiveness +1. +300 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Already filled out. Still twelve." },
    /* 9 */ { type: 'end' },
  ],

  quest_atk_2: [
    /* 0 */ { type: 'condition', flag: 'quest_atk_2_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A brass plaque mounted near the conference room door reads: 'SPEAK UNTIL HEARD. THEN SPEAK LOUDER.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "...That's not how acoustics work." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You stare at it for a long moment. Something shifts." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_atk_2_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 300, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'atk', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Assertiveness +1. +300 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "You've already absorbed its wisdom. Loudly." },
    /* 9 */ { type: 'end' },
  ],

  quest_atk_3: [
    /* 0 */ { type: 'condition', flag: 'quest_atk_3_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A break room bulletin reads: 'YOUR LUNCH IS YOUR ARGUMENT. MAKE IT STRONG.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "I have a leftover burrito and a lot of feelings." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You eat the burrito standing up. Intentionally." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_atk_3_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 300, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'atk', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Assertiveness +1. +300 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "The burrito is gone. The conviction remains." },
    /* 9 */ { type: 'end' },
  ],

  quest_atk_4: [
    /* 0 */ { type: 'condition', flag: 'quest_atk_4_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A poster above the server rack says: '99.9% UPTIME IS A MINDSET.' Below it, in marker: 'THIS SERVER HAS BEEN DOWN 14 TIMES THIS MONTH.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "That's not a mindset, that's a disaster." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You correct the math in your head. You feel sharper." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_atk_4_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 300, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'atk', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Assertiveness +1. +300 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "The math hasn't changed. Neither have you." },
    /* 9 */ { type: 'end' },
  ],

  quest_atk_5: [
    /* 0 */ { type: 'condition', flag: 'quest_atk_5_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A framed display in reception reads: 'FIRST IMPRESSIONS ARE PERMANENT. MAKE YOURS A DECLARATION.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "I walked in carrying a travel mug and a resigned expression." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You adjust your collar. You square your shoulders. You nod at no one." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_atk_5_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 300, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'atk', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Assertiveness +1. +300 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Declaration made. Already forgotten by the receptionist." },
    /* 9 */ { type: 'end' },
  ],

  // --- DEF side quest dialogs ---
  quest_def_1: [
    /* 0 */ { type: 'condition', flag: 'quest_def_1_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A checklist titled 'COMPOSURE UNDER PRESSURE' is stapled to a cubicle partition. Step 4 reads: 'Do not visibly react. Step 5: Especially not to step 4.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "I have been practicing this my entire career." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You exhale slowly. Deliberately. Like a person who has read self-help books." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_def_1_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 150, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'def', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Composure +1. +150 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Still composed. Still technically employed." },
    /* 9 */ { type: 'end' },
  ],

  quest_def_2: [
    /* 0 */ { type: 'condition', flag: 'quest_def_2_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A laminated sheet titled 'AGENDA MANAGEMENT FRAMEWORK' is on the conference table. It contains 11 steps. Step 1 is 'Establish the agenda.' Step 11 is 'Return to step 1.'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "This is an infinite loop with better fonts." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You read all 11 steps. Twice. You feel... fortified." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_def_2_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 150, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'def', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Composure +1. +150 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "You've already completed the loop." },
    /* 9 */ { type: 'end' },
  ],

  quest_def_3: [
    /* 0 */ { type: 'condition', flag: 'quest_def_3_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A guide titled 'EMOTIONAL BANDWIDTH: OPTIMIZE YOUR CAPACITY' is posted on the break room wall. One bullet point reads: 'When overwhelmed, consider: Is this worth your cortisol?'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "Statistically, no. And yet." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You pour yourself a coffee and read the whole thing. Your shoulders drop exactly 3 millimeters." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_def_3_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 150, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'def', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Composure +1. +150 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Bandwidth maintained. Cortisol: still present." },
    /* 9 */ { type: 'end' },
  ],

  quest_def_4: [
    /* 0 */ { type: 'condition', flag: 'quest_def_4_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A notice taped to the server rack reads: 'REDUNDANCY IS NOT FAILURE. REDUNDANCY IS RESILIENCE. (This message has been posted three times.)'" },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "I see two more copies of this on the other racks." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You appreciate the commitment. You absorb it." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_def_4_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 150, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'def', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Composure +1. +150 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Redundancy acknowledged. Thrice." },
    /* 9 */ { type: 'end' },
  ],

  quest_def_5: [
    /* 0 */ { type: 'condition', flag: 'quest_def_5_done', ifTrue: 8, ifFalse: 1 },
    /* 1 */ { type: 'text', speaker: 'Narrator', text: "A framed poster in the waiting area reads: 'THE WAITING ROOM IS WHERE CHARACTER IS REVEALED.' Below it: a chair with a slight wobble and a six-month-old magazine." },
    /* 2 */ { type: 'text', speaker: 'Andrew', text: "I have been waiting my whole career." },
    /* 3 */ { type: 'text', speaker: 'Narrator', text: "You sit in the chair. You do not fidget. The magazine remains unread." },
    /* 4 */ { type: 'action', action: 'set_flag', flag: 'quest_def_5_done', value: true, next: 5 },
    /* 5 */ { type: 'action', action: 'give_xp', xp: 150, next: 6 },
    /* 6 */ { type: 'action', action: 'modify_stat', stat: 'def', amount: 1, next: 7 },
    /* 7 */ { type: 'text', speaker: 'Narrator', text: "Composure +1. +150 XP.", next: 9 },
    /* 8 */ { type: 'text', speaker: 'Narrator', text: "Still waiting. Character: revealed." },
    /* 9 */ { type: 'end' },
  ],

  // ==========================================================================
  // SIDE QUEST: THE LUNCH THIEF
  // ==========================================================================

  // Janet suspects the intern — triggered after fridge is read and quest is at stage 2
  janet_lunch_thief_investigate: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "*extremely tense sip* Andrew. I'm glad you're here. We need to talk about the fridge situation." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "I have been keeping notes. A LOG, Andrew. I have a log." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "The thefts always happen between 12:05 and 12:20 PM. That's lunch window. That's when I'm at my desk, eating from my LABELED containers." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "But here's what I know: last Tuesday I found PROTEIN SHAKE residue on my tupperware. Organic chocolate flavor. Who in this office drinks organic chocolate protein shake?" },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: '...The Intern?' },
    /* 5  */ { type: 'text', speaker: 'Janet', text: "The. Intern. Yes. I've seen him eyeing my Greek yogurt for WEEKS. He once said 'food is food' when I complained. That's not a philosophy, that's a confession." },
    /* 6  */ { type: 'text', speaker: 'Janet', text: "I'd confront him myself but last time I confronted someone in this building I accidentally started a three-month HR investigation. Don't ask." },
    /* 7  */ { type: 'text', speaker: 'Janet', text: "*sip* You're new. He'll be caught off guard. Go talk to him. He's over by his cubicle." },
    /* 8  */ { type: 'action', action: 'quest_update', quest: 'side_lunch_thief', stage: 3, next: 9 },
    /* 9  */ { type: 'action', action: 'set_flag', flag: 'lunch_thief_culprit_revealed', value: true, next: 10 },
    /* 10 */ { type: 'end' },
  ],

  // After quest complete — Janet is vindicated and mellowed out
  janet_lunch_thief_resolved: [
    /* 0  */ { type: 'text', speaker: 'Janet', text: "*victorious sip* Andrew. I heard. Justice was served, and it tasted better than my yogurt." },
    /* 1  */ { type: 'text', speaker: 'Janet', text: "The Intern replaced everything. EVERYTHING. I now have a Greek yogurt collection that would make a dairy farmer emotional." },
    /* 2  */ { type: 'text', speaker: 'Janet', text: "I still have the log, though. Just in case." },
    /* 3  */ { type: 'text', speaker: 'Janet', text: "*taps tumbler against yours* Good work, trust officer. This was fiduciary duty in its purest form." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'janet_quest_resolved', value: true, next: 5 },
    /* 5  */ { type: 'end' },
  ],

  // Intern confesses — triggered when `lunch_thief_culprit_revealed` is set
  intern_lunch_thief_confrontation: [
    /* 0  */ { type: 'condition', flag: 'lunch_thief_complete', ifTrue: 9, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'The Intern', text: "Oh. Hey Andrew. You're— is this about the fridge?" },
    /* 2  */ { type: 'text', speaker: 'The Intern', text: "Okay. Okay. I can explain." },
    /* 3  */ { type: 'text', speaker: 'The Intern', text: "I didn't KNOW it was her stuff. At first. The first time I thought it was communal. Then I saw the labels and I... kept going. Which is worse. I know." },
    /* 4  */ { type: 'text', speaker: 'The Intern', text: "Look — I don't get paid. Like, at all. And my stipend doesn't cover lunch. And Janet's Greek yogurt is really good." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "You need to apologize to Janet. And replace everything." },
    /* 6  */ { type: 'text', speaker: 'The Intern', text: "Yeah. Yeah, I know. I'll go to the store on my lunch break." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "You don't get a lunch break. You said you don't get paid." },
    /* 8  */ { type: 'text', speaker: 'The Intern', text: "...I'll go on my 'unpaid personal development period.' Which is what Ross calls my lunch break.", next: 11 },
    /* 9  */ { type: 'text', speaker: 'The Intern', text: "I already said sorry to Janet. She was surprisingly gracious about it. Well, she said 'I will remember this forever, but I forgive you.' That's grace... right?", next: 14 },
    /* 10 */ { type: 'end' }, // (dead node — skipped by node 8's explicit next)

    /* 11 */ { type: 'action', action: 'set_flag', flag: 'lunch_thief_complete', value: true, next: 12 },
    /* 12 */ { type: 'action', action: 'give_xp', xp: 250, next: 13 },
    /* 13 */ { type: 'text', speaker: 'Narrator', text: "Case closed. The break room fridge is safe. For now. +250 XP." },
    /* 14 */ { type: 'end' },
  ],

  // ==========================================================================
  // SIDE QUEST: THE PRINTER FROM HELL
  // ==========================================================================

  // Alex explains the printer situation — triggered after printer_quest_started
  alex_printer_quest: [
    /* 0  */ { type: 'condition', flag: 'printer_quest_done', ifTrue: 16, ifFalse: 1 },
    /* 1  */ { type: 'text', speaker: 'Alex from IT', text: "Oh. Oh no. It printed something for you, didn't it." },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "Not a question. Statement. It's been doing this for three years and I'm the only one who ever noticed, apparently." },
    /* 3  */ { type: 'choice', speaker: 'Alex from IT', text: "What exactly did it say to you?", choices: [
      { text: "'REPLACE TONER TO LEARN THE TRUTH.' It mentioned the Henderson Files.", next: 4 },
      { text: "It printed 'HELP ME' the first time. Then Henderson files.", next: 4 },
    ]},
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "Right. Okay. So. The printer — and I know how this sounds — is connected to a legacy subnet that was never properly decommissioned." },
    /* 5  */ { type: 'text', speaker: 'Alex from IT', text: "That subnet still has read access to all document archives from 2003 onward. Including the Henderson Trust file history." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "The printer isn't haunted. It's just... accidentally plugged into institutional memory." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "So what's in the Henderson files that it's trying to print?" },
    /* 8  */ { type: 'text', speaker: 'Alex from IT', text: "That's the thing. The toner runs out on purpose. I've checked the firmware. Someone modified it to abort any print job containing certain keywords." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Whoever set this up didn't want the full document printed. But they didn't expect the printer to develop... opinions about that." },
    /* 10 */ { type: 'text', speaker: 'Andrew', text: "Printers don't have opinions." },
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "I have a server rack with a restraining order, a VPN running on a calculator, and a document system that crashes every Tuesday like clockwork. Please do not tell me what's normal in this building." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "I found a toner cartridge in the supply closet. Pre-2016 stock. The firmware block only applies to standard cartridges — this one might let the print job finish." },
    /* 13 */ { type: 'text', speaker: 'Alex from IT', text: "I already set it next to the printer. Just install it and stand back." },
    /* 14 */ { type: 'action', action: 'quest_update', quest: 'side_printer', stage: 2, next: 15 },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'printer_toner_quest', value: true, next: 16 },
    /* 16 */ { type: 'end' },
  ],

  // (printer_toner_installed removed — toner installation is handled in printer_interact nodes 25-38)

  // ==========================================================================
  // SIDE QUEST: SERVER ROOM SECRETS
  // ==========================================================================

  // Alex explains his discovery after player reads the admin_legacy rack
  alex_server_secret: [
    /* 0  */ { type: 'condition', flag: 'server_secret_done', ifTrue: 22, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'server_secret_started', ifTrue: 2, ifFalse: 22 },
    /* 2  */ { type: 'text', speaker: 'Alex from IT', text: "Hey. Close the door. Okay there's no door. Just — pretend we're having a normal conversation about server maintenance." },
    /* 3  */ { type: 'text', speaker: 'Alex from IT', text: "You saw the admin_legacy note on the rack. Good. I put it there so someone would ask." },
    /* 4  */ { type: 'text', speaker: 'Alex from IT', text: "admin_legacy is an account that's been running since 2006. It's not in any org chart. IT doesn't own it. HR doesn't know it exists. But it has READ/WRITE access to every trust account record in the system." },
    /* 5  */ { type: 'text', speaker: 'Andrew', text: "That sounds... very bad." },
    /* 6  */ { type: 'text', speaker: 'Alex from IT', text: "It IS very bad. And it gets worse." },
    /* 7  */ { type: 'text', speaker: 'Alex from IT', text: "I've been logging its activity. Every night at 3:47 AM it runs a query against the Henderson Trust records. Has been doing this since 2016. Always the same query: a read on a specific clause — Page 47, Paragraph 3." },
    /* 8  */ { type: 'text', speaker: 'Andrew', text: "Page 47? The Janitor mentioned page 47." },
    /* 9  */ { type: 'text', speaker: 'Alex from IT', text: "Yeah, that's not a coincidence. I think admin_legacy was created to MONITOR whether anyone found that clause. Like a tripwire." },
    /* 10 */ { type: 'choice', speaker: 'Alex from IT', text: "So. What do you want to do with this information?", choices: [
      { text: 'Report it to Ross immediately.', next: 11 },
      { text: "Keep it quiet for now — gather more evidence first.", next: 15 },
      { text: "This is above my pay grade. Forget I heard it.", next: 19 },
    ]},
    /* 11 */ { type: 'text', speaker: 'Alex from IT', text: "Ross? I... okay. He might escalate it. Or he might panic and do something that tips off whoever controls admin_legacy." },
    /* 12 */ { type: 'text', speaker: 'Alex from IT', text: "You know what — fine. Tell Ross. But be careful what you say. If the wrong people hear that we're onto this, my access gets revoked and the logs disappear." },
    /* 13 */ { type: 'action', action: 'set_flag', flag: 'server_secret_choice', value: 'report', next: 21 },
    /* 14 */ { type: 'end' },  // unreachable — node 13 jumps directly to 21
    /* 15 */ { type: 'text', speaker: 'Alex from IT', text: "Smart. I've been doing that for three months and it's gotten me... more questions and less sleep. But at least I have documentation." },
    /* 16 */ { type: 'text', speaker: 'Alex from IT', text: "I'll keep collecting logs. You keep your eyes open — especially around the executive floor. Something about this traces up there." },
    /* 17 */ { type: 'action', action: 'set_flag', flag: 'server_secret_choice', value: 'investigate', next: 21 },
    /* 18 */ { type: 'end' },  // unreachable — node 17 jumps directly to 21
    /* 19 */ { type: 'text', speaker: 'Alex from IT', text: "Above your pay grade? You're a TRUST OFFICER. YOUR ENTIRE JOB is a fiduciary obligation to the account holders. This is literally in your job description." },
    /* 20 */ { type: 'action', action: 'set_flag', flag: 'server_secret_choice', value: 'ignore', next: 21 },
    /* 21 */ { type: 'action', action: 'quest_update', quest: 'side_server_secret', stage: 2, next: 23 },
    /* 22 */ { type: 'end' },
    /* 23 */ { type: 'action', action: 'set_flag', flag: 'server_secret_done', value: true, next: 24 },
    /* 24 */ { type: 'action', action: 'give_xp', xp: 400, next: 25 },
    /* 25 */ { type: 'text', speaker: 'Narrator', text: "The truth is out there. You've chosen what to do with it. +400 XP." },
    /* 26 */ { type: 'end' },
  ],

  // ==========================================================================
  // PHANTOM APPROVER interactables
  // ==========================================================================

  phantom_expense_hr: [
    /* 0  */ { type: 'condition', flag: 'phantom_hr_found', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'legacy_started', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A filing cabinet stuffed with expense approval printouts. One stack stands out — hundreds of auto-approvals, all signed 'admin_auto' in the signature field." },
    /* 3  */ { type: 'text', speaker: 'Narrator', text: "The amounts are modest. Printer paper. Coffee pods. One entry reads: '36 units, rubber duck (stress relief, classified: operational wellness).' Another: '1 unit, kayak (team wellness equipment).'" },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'phantom_hr_found', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The expense approvals are all here. Eighteen years of autonomous purchasing decisions by a machine that had no idea what a kayak was for.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "A filing cabinet filled with expense reports. Nothing unusual stands out.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  phantom_workstation_cf: [
    /* 0  */ { type: 'condition', flag: 'phantom_workstation_found', ifTrue: 6, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'legacy_started', ifTrue: 2, ifFalse: 7 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A workstation in the back corner of the cubicle farm. The monitor is dark, but the tower is running — fan humming, a single amber LED blinking in a steady rhythm." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Nobody sits here. Nobody has for years, by the look of it. But something is definitely running." },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The asset tag on the back reads: 'PROC-LEGACY-07. DO NOT DECOMMISSION. -IT 2006.' Someone taped a sticky note over it that just says 'ignore.'" },
    /* 5  */ { type: 'action', action: 'set_flag', flag: 'phantom_workstation_found', value: true, next: 8 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "The workstation hums quietly. Its amber LED blinks. The sticky note says 'ignore.' You already found what you needed.", next: 8 },
    /* 7  */ { type: 'text', speaker: 'Narrator', text: "A workstation in the back corner. Amber LED blinking. Looks like it's been running for a very long time.", next: 8 },
    /* 8  */ { type: 'end' },
  ],

  // ==========================================================================
  // TUESDAY 2PM interactables
  // ==========================================================================

  tuesday_floppy: [
    /* 0  */ { type: 'condition', flag: 'tuesday_floppy_found', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'dave_started', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Wedged behind the last vending machine slot: a 3.5\" floppy disk. The label reads 'SCHED-REF-04 / ARCHIVE COPY' in faded marker." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Alex said the task header references a floppy disk ID. This has to be it." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'tuesday_floppy_found', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The floppy disk. You've already noted the reference ID for Alex.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "A 3.5\" floppy disk wedged behind the vending machine. Nobody has used one of these in twenty years.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  tuesday_server_tag: [
    /* 0  */ { type: 'condition', flag: 'tuesday_tag_found', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'dave_started', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A decommissioned server's asset tag, taped to the equipment shelf. 'SRV-2004-RETIRED. Asset #0047-B.' The server itself is long gone, but the tag survived." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Alex mentioned a server asset tag. This matches the format he described." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'tuesday_tag_found', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The server asset tag. You've already recorded the number for Alex.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "An old asset tag taped to the shelf. The server it belonged to was decommissioned years ago.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  tuesday_sticky_note: [
    /* 0  */ { type: 'condition', flag: 'tuesday_sticky_found', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'dave_started', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A sticky note on an unoccupied monitor. In small, precise handwriting: 'WS-CTRL-2004 / see Gerald for context / DO NOT DELETE task.' Signed with initials: T.K." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "T.K. set this up and left a note for 'Gerald.' If Gerald left in 2003... T.K. wrote this note knowing Gerald was already gone." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'tuesday_sticky_found', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The sticky note. 'WS-CTRL-2004 / see Gerald for context.' Gerald left in 2003. You already noted the workstation label for Alex.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "A sticky note on an old monitor. Small handwriting. Initials at the bottom: T.K.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  // ==========================================================================
  // PRINTER'S SOUL interactables
  // ==========================================================================

  printer_firmware_disk: [
    /* 0  */ { type: 'condition', flag: 'printer_firmware_found', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'printer_soul_started', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A firmware disk in a paper sleeve on the equipment shelf. Label: 'XEROX WC7845 / FIRMWARE v2.1.4 / OEM ORIGINAL.' This is the printer's original factory disk." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Alex said he needs this to connect to the printer directly. I'll take it." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'printer_firmware_found', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "You already have the firmware disk.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "A firmware disk in a paper sleeve. Factory original. Dusty. Has been sitting here for years.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  printer_ethernet_port: [
    /* 0  */ { type: 'condition', flag: 'printer_soul_done', ifTrue: 5, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'printer_firmware_found', ifTrue: 2, ifFalse: 6 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "An RJ45 ethernet port on the wall, labeled 'PRINTER DIRECT — IT USE ONLY.' Alex's instructions said to plug in here with the firmware disk loaded." },
    /* 3  */ { type: 'text', speaker: 'Andrew', text: "Let's see what you've been computing for twenty-two years." },
    /* 4  */ { type: 'action', action: 'set_flag', flag: 'printer_soul_done', value: true, next: 7 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "The port is still connected. The printer's computation completed when you plugged in.", next: 7 },
    /* 6  */ { type: 'text', speaker: 'Narrator', text: "An ethernet port on the wall. 'PRINTER DIRECT — IT USE ONLY.' You don't have what you need to connect yet.", next: 7 },
    /* 7  */ { type: 'end' },
  ],

  // ==========================================================================
  // UNAUTHORIZED PATCH interactable
  // ==========================================================================

  unauthorized_patch_monitor: [
    /* 0  */ { type: 'condition', flag: 'patch_monitor_silenced', ifTrue: 4, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'final_patch_started', ifTrue: 2, ifFalse: 5 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "A network monitoring terminal near rack row three. The screen shows a live feed of all server activity, with a bright red 'ALERT THRESHOLD' bar at 40% capacity." },
    /* 3  */ { type: 'action', action: 'set_flag', flag: 'patch_monitor_silenced', value: true, next: 6 },
    /* 4  */ { type: 'text', speaker: 'Narrator', text: "The monitoring process is terminated. Screen dark. No alerts will go out tonight.", next: 6 },
    /* 5  */ { type: 'text', speaker: 'Narrator', text: "A network monitoring terminal. It logs all server activity and reports anything unusual to corporate IT. The fan hums quietly.", next: 6 },
    /* 6  */ { type: 'end' },
  ],
};
