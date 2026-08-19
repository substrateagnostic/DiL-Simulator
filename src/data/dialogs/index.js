// DO NOT EDIT — generated file.
// Generated from src/data/dialogs/*.dlg by npm run dialogs:build.
// Edit the .dlg files, not this file; all 943 authoring comments live there.

export const DIALOGS = {
  "receptionist_intro": [
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Oh! You must be the new hire. Andrew, right?"
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "I'm Diane. I run the front desk. Welcome to Vaults Fargo. Please don't touch the orchid."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...There's no orchid."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Exactly. Chad killed it. The point stands."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "HR asked me to give you this."
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "coffee_large",
      "quantity": 1
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "It's a large coffee. You'll want it. Trust me."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Your desk is on the cubicle floor. Through the north door, up the stairs. Well — there are no stairs. Through the north door."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Your manager is Skip Hartley. He'll brief you. Don't be late."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Oh, and keep your badge visible at all times. Skip gets... particular about that."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What does a Seasonal Compliance Associate even do?"
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Diane (Front Desk)",
      "text": "Good luck, Andrew."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "reception_intro_done",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "team_pre_intro": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You're still hovering awkwardly in the doorway. Maybe settle in at your desk first before introducing yourself around the office."
    },
    {
      "type": "end"
    }
  ],
  "neutral_npc": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "They give you the nod of someone saving their conversation for a better fiscal quarter."
    },
    {
      "type": "end"
    }
  ],
  "neutral_janet": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "One crisis at a time, hon."
    },
    {
      "type": "end"
    }
  ],
  "neutral_alex_it": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Not a great time. Something is blinking that should not be blinking."
    },
    {
      "type": "end"
    }
  ],
  "neutral_intern": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I'm on standby! I don't know for what, but I'm ready."
    },
    {
      "type": "end"
    }
  ],
  "neutral_isaiah": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Files come in, files go out. It steadies a person, if you let it."
    },
    {
      "type": "end"
    }
  ],
  "neutral_diane": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Quiet at the front desk just now. I've been here long enough not to say that out loud."
    },
    {
      "type": "end"
    }
  ],
  "neutral_skip": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Circle back with me when the timing is right, buddy."
    },
    {
      "type": "end"
    }
  ],
  "neutral_janitor": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Some conversations arrive when they're ready."
    },
    {
      "type": "end"
    }
  ],
  "janet_intro": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Ah. The new trust officer. They get younger every year. Or I'm aging in the cask. One of those."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'm Janet. I handle the... *sip* ...smaller accounts. The ones where nobody's fighting. So, like, three of them."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 28,
      "ifFalse": 25
    },
    {
      "type": "choice",
      "speaker": "Janet",
      "prompt": "Anyway -- what can I help you with, hon?",
      "choices": [
        {
          "text": "What's in the tumbler?",
          "next": 4
        },
        {
          "text": "Any tips for surviving here?",
          "next": 8
        },
        {
          "text": "Who's who around the office?",
          "next": 13
        },
        {
          "text": "I should get going.",
          "next": 18
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "This? It's... kombucha."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "At 9:30 AM?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "It's fermented. That's the POINT of kombucha. Don't make it weird."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*extremely long sip*",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Oh sweetie. Okay. Number one: never eat anything from the break room fridge. The notes in there have gotten... hostile."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Number two: if the printer starts making noises, just walk away. We've had three repair techs quit this year."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Number three: Skip will use the word 'synergy' at least fourteen times before lunch. Don't drink every time or you'll end up like me."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*looks at tumbler* ...Successful. You'll end up successful like me."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Oh, and someone's been stealing lunches from the fridge. My money's on Alex from IT, but the Janitor says it's 'an inside job.' Whatever that means.",
      "next": 22
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Let's see... Skip is your boss. He's... enthusiastic. He once described a simple trust amendment as 'a paradigm-shifting leverage event.'"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Alex from IT lives in the server room. I'm not sure he has a home. He speaks entirely in acronyms."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "The Intern... bless his heart. He's been here three months and still thinks fiduciary duty is a type of military service."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Diane at reception is the only competent person in this building. If you need anything actually done, talk to her."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "And then there's the Janitor. He wears a gold Rolex and gives financial advice while mopping. Nobody asks questions.",
      "next": 3
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_janet",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Anyway, good luck with the Henderson case. You're going to need it. Those people make Thanksgiving look like a contact sport."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*sip*"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "lunch_thief_started",
      "ifTrue": 3
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_lunch_thief",
      "stage": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "lunch_thief_started",
      "value": true,
      "next": 3
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 29
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 30
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Welcome to the sixth floor. We call it 'The Trust Fall.' Nobody catches you.",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "An Advance Reader. So was the second one. Didn't help.",
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Shock Absorber. The third one tested the same. Right up until the parking garage.",
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "A Percolator. Good. The last two were fast. You can see how that went.",
      "next": 27
    }
  ],
  "alex_it_intro": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Andrew, right? I knew at 8:52 — the badge server and I keep each other informed. Welcome to Vaults Fargo."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 27,
      "ifFalse": 24
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Anyway — good to have you. The trust department could use someone who hasn't been here long enough to stop trying."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "One thing before we get into it. Have you touched any of the legacy systems yet?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I just started tod--"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Good. Don't. The VPN runs on a modified TI-84 calculator from 2003. It has never crashed once, and I've chosen not to ask why."
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "So. What do you want to know?",
      "choices": [
        {
          "text": "What happened to the IT team?",
          "next": 7
        },
        {
          "text": "What's in the server room?",
          "next": 11
        },
        {
          "text": "Any tech I should know about?",
          "next": 16
        },
        {
          "text": "I'll let you get back to it.",
          "next": 20
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "They said it was 'restructuring.' I say it was the Server Room Incident of 2024."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm not legally allowed to discuss it. NDA. Also a restraining order from the server rack in Row C."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "A restraining order from a server rack?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's a legal gray area. Like most things at this company.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The server room. Everything in this building is connected, and the server room is where it admits it."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay look. Officially, it houses our document management system and the trust accounting database. SSL certificates. Normal stuff."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Unofficially... there's a partition I found that's been running since 2016. It's encrypted with something I've never seen before."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Every night at 3:47 AM it sends a packet to an IP address that traces back to a P.O. box in the Cayman Islands."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I haven't blocked it. You don't block a thing like that. You watch it, and you let it think it's alone.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Your workstation password is 'password123.' I know because everyone's password is 'password123.'"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The document management system crashes every Tuesday at 2 PM. Nobody knows why. I've stopped looking into it because every time I do, my access gets revoked for 24 hours."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Also, the VOIP phones record everything. I mean, they're NOT supposed to. But the red light stays on even when you hang up."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I unplugged mine in 2022. I communicate exclusively through Slack messages and aggressive eye contact.",
      "next": 6
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_alex_it",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Anyway, if your computer does anything weird -- and it will -- just restart it three times, slap the left side of the monitor, and say 'please.' In that order."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The 'please' is important. These machines run on spite and desperation."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 28
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 29
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm Alex. IT department. Well, I AM the IT department. Had a team once. They all 'transferred.' That's corporate for 'fled.'",
      "next": 2
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The quiz said Advance Reader. The DHCP lease history said the same thing four minutes earlier, but the quiz has better formatting.",
      "next": 26
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The quiz said Shock Absorber. I knew from the login attempts -- nine failed, zero frustration clicks. The keyboard never lies.",
      "next": 26
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The assessment said Percolator. I could have told them from the boot sequence -- you let the whole POST cycle finish before touching a key. Nobody does that.",
      "next": 26
    }
  ],
  "intern_intro": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh hey! You're the new guy! Austin, right?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Andrew."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Right, right, Arnold. Sorry, I'm terrible with names."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I'm the intern! Well, I was the intern. Now I'm the 'Trust Operations Support Specialist.' Same pay though."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Which is zero. The pay is zero."
    },
    {
      "type": "choice",
      "speaker": "The Intern",
      "prompt": "Hey, you're not with Compliance, are you?",
      "choices": [
        {
          "text": "No, why?",
          "next": 6
        },
        {
          "text": "What if I am?",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh thank God. Because I was JUST shredding some documents and--"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Wait. I mean. I was FILING some documents. In the shredder. Which is where we file things we're done with."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... not what a shredder is for."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Skip said to 'make the Henderson pre-audit documents disappear.' I assumed he meant magically but the budget didn't cover a magician so..."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Anyway! If anyone asks, I was photocopying. For three hours. Both sides.",
      "next": 15
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I mean-- the shredding was... it was already shredded when I got here. Pre-shredded documents. It's a new system."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "We call it... Proactive Document Lifecycle Management."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Please don't tell Skip I told you about the Henderson thing. He already made me reorganize the supply closet by 'emotional resonance.'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_intern",
      "value": true
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh! I almost forgot. Skip said to tell you the Henderson meeting is 'mission critical.' He said those words while doing finger guns."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 24,
      "ifFalse": 21
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Andrew."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "That's what I said!"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 25
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 26
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Good luck, Adam!",
      "next": 18
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Good luck, Arthur! I heard you're an Advance Reader -- that sounds very organized!",
      "next": 18
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Good luck, Aaron! They said you're a Shock Absorber? That sounds painful. Sorry.",
      "next": 18
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Good luck, Albert! They said Percolator? That sounds like a nice thing to be.",
      "next": 18
    }
  ],
  "skip_not_ready": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! My man. Before we get into the big stuff — have you met the team yet? Like, all of them?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Janet runs the front desk. She knows everything and will tell you exactly half of it. The Intern does whatever we point him at. He's enthusiastic. That's his whole thing."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Then there's Isaiah and Alex from IT. Load-bearing walls, metaphorically. Isaiah knows where everything is filed. Alex knows why nothing works."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Go say hi to all four of them. Then come back and we'll talk Henderson. Big things, buddy. Big things. *finger guns*"
    },
    {
      "type": "end"
    }
  ],
  "skip_intro": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! My man! Come in, come in. Close the door. Actually, leave it open. Actually, close it halfway. Power move."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 29,
      "ifFalse": 26
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Could you be more specific?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The specifics aren't important. What's important is the ENERGY. And the energy here is: Henderson family, big trust, lots of assets."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mrs. Henderson's assets are... substantial. Very well-endowed. The trust, I mean. The trust is well-endowed."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "We need to handle those assets with extreme care. Really get in there and... manage them. Thoroughly."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Can we maybe just talk about the actual case?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Right! So. Old Man Henderson passed away last month. Left behind a trust worth about $42 million."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Three beneficiaries: Karen, his daughter. Classic. Chad, his grandson. Also classic but in a different way. And Grandma Henderson, his wife."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "They all want the assets. ALL of them. Karen says Daddy promised her the lake house. Chad says Grandpa promised him the investment portfolio."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And Grandma Henderson... well. She's got the actual will. And a very good memory. And a cane she's not afraid to use."
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "Your job is to meet with each of them and resolve this. Questions?",
      "choices": [
        {
          "text": "What's our fiduciary obligation here?",
          "next": 12
        },
        {
          "text": "This sounds like a disaster.",
          "next": 15
        },
        {
          "text": "Why me? I just started.",
          "next": 18
        },
        {
          "text": "Got it. I'm on it.",
          "next": 21
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Fiduciary obligation? Great question. Love the initiative. Very on-brand."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Our fiduciary obligation is to... leverage our core competencies to maximize stakeholder value while maintaining regulatory alignment across all verticals."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That didn't answer my question at all.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Disaster? No no no. This is an OPPORTUNITY. Every trust dispute is a chance to demonstrate our value proposition."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Plus, the fee structure on a disputed $42 million trust? *chef's kiss* That's quarterly bonus territory, my friend."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Just remember: we need to penetrate the Henderson account from multiple angles. Get deep into those assets. Really feel them out.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Why you? Because you're fresh! Untainted by our... previous approaches to trust management."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The last trust officer who handled the Henderson account had a 'nervous event' in the parking garage. He's fine now. Mostly. He flinches when he hears the word 'beneficiary.'"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "But that won't happen to you! Probably! Go get 'em, tiger!",
      "next": 11
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "briefing_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "main_act2",
      "objective": 0,
      "status": "complete"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Oh, one more thing. If Karen asks you about the pre-audit documents, just say they're 'in process.' Don't say anything about the shredder."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Wait, you don't know about the shredder. Forget I said that. Circle back later. *finger guns*"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 30
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 31
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "So. The Henderson Trust. This is the big one, buddy. This is our Super Bowl. Our moon landing. Our... what's that thing where they do the thing?",
      "next": 2
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Hey, saw your assessment -- Advance Reader! Chapter nine of 'The Stakeholder Within': 'Preparation is the only meeting that never gets cancelled.' That's so you, buddy.",
      "next": 28
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Saw your assessment -- Shock Absorber! There's this book, 'Bounce: Leaning Into What Hits You' -- haven't finished it, but: 'The blow is the brand.' LOVE that.",
      "next": 28
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Oh! Your assessment came through -- Percolator! 'The Patient Yield' -- haven't read it yet, but the TITLE, Andrew. 'Slow is just fast that respects the process.' That's a brand.",
      "next": 28
    }
  ],
  "diane_intro": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I'm Diane. The title says reception. What I actually run is everything that has to be running by nine o'clock."
    },
    {
      "type": "choice",
      "speaker": "Diane",
      "prompt": "What do you need?",
      "choices": [
        {
          "text": "How does this place actually work?",
          "next": 2
        },
        {
          "text": "What should I know about the Henderson case?",
          "next": 7
        },
        {
          "text": "I think I'm good, thanks.",
          "next": 13
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "How does it work? It doesn't. It continues. There's a difference, and the difference is me."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Skip makes decisions based on whatever business book he read that morning. The Intern executes those decisions incorrectly. Janet handles the fallout. I document everything."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Alex maintains the systems that are held together with duct tape and optimism. And the Janitor... well, the Janitor knows things."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "My advice? Keep your head down, document EVERYTHING, and never CC Skip on an email unless you want a 45-minute reply about 'synergistic client engagement strategies.'"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Also, I keep a stash of antacids in my desk drawer. You're going to need them.",
      "next": 1
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The Henderson Trust? Oh boy."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've seen three trust officers try to mediate this family. The first one quit. The second one cried in the bathroom for forty minutes and then quit. The third one is the one who had the 'parking garage incident.'"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Here's what you need to know: Karen is aggressive but predictable. She'll demand to speak to a manager within four minutes of any conversation."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Chad is... Chad. He'll try to bro his way through fiduciary law. It won't work, but he'll be very confident about it."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Grandma Henderson is the one to watch. She seems sweet, but she's been managing her own investments since 1987 and she's sharper than everyone in this building combined."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Also -- and I probably shouldn't tell you this -- she used to work here. A long time ago. Ask the Janitor if you want to know more.",
      "next": 1
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 21,
      "ifFalse": 18
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_diane",
      "value": true
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "antacid",
      "quantity": 1
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Here, take one now. Consider it a welcome gift."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 22
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 23
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Well, good luck. And seriously -- my desk, bottom drawer, antacids. Anytime you need them.",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You came prepared. I can see that. So did the second one, right up until she couldn't stop crying. My desk, bottom drawer -- antacids. You'll know when.",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Mm. You've got a steady look about you. That counts for something here. The last three didn't. My desk, bottom drawer, antacids. Don't wait until you need them.",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Take your time with this place. I mean that. The ones who rushed are gone. Bottom drawer of my desk -- antacids. Patience won't cover everything.",
      "next": 14
    }
  ],
  "water_cooler": [
    {
      "type": "condition",
      "flag": "cooler_visit_count_3",
      "ifTrue": 10
    },
    {
      "type": "condition",
      "flag": "cooler_visit_count_2",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You approach the water cooler. Two coworkers whose names you don't know stop talking immediately."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One of them says 'We were just talking about... the weather' before speed-walking away."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You overhear a whisper: 'That's the one they gave the Henderson case to. Poor bastard.'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "cooler_visit_count_2",
      "value": true,
      "next": 15
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The same two coworkers are back at the water cooler. This time they don't bother hiding it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'I heard Karen Henderson threw a binder at the last trust officer. A BINDER. Three-ring.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'That's nothing. I heard Grandma Henderson once made a compliance auditor cry just by reading his own report back to him. Out loud. With commentary.'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "cooler_visit_count_3",
      "value": true,
      "next": 15
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The water cooler crowd has grown. There are now four people, and they're openly staring at you."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'He's still here? I had him in the betting pool for day two.' 'I had him for this afternoon.' 'I had him for never showing up.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One of them raises their cup in what might be a salute, or might be pity. Hard to tell."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You fill your cup. The water is room temperature, and has been since 2019."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "cooler_exhausted",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "vending_machine": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You approach the vending machine. It hums menacingly."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The selection buttons are labeled with numbers that don't correspond to any visible products."
    },
    {
      "type": "choice",
      "speaker": "Vending Machine",
      "prompt": "INSERT COIN FOR WISDOM",
      "choices": [
        {
          "text": "Press B7",
          "next": 16
        },
        {
          "text": "Press C3",
          "next": 17
        },
        {
          "text": "Press A1",
          "next": 18
        },
        {
          "text": "Walk away",
          "next": 14
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Vending Machine",
      "text": "CLUNK. WHIRR. DISPENSING..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small slip of paper falls out. It reads: 'Your principal is well-endowed... with growth potential. Lucky numbers: 4, 8, 15, 16, 23, 42.'"
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "vending_fortune",
      "next": 19
    },
    {
      "type": "text",
      "speaker": "Vending Machine",
      "text": "CLUNK. WHIRR. DISPENSING..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small slip of paper falls out. It reads: 'He who diversifies his portfolio diversifies his suffering. But at least it is diversified.'"
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "vending_fortune",
      "next": 20
    },
    {
      "type": "text",
      "speaker": "Vending Machine",
      "text": "CLUNK. WHIRR. DISPENSING..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small slip of paper falls out. It reads: 'The market will do what the market will do. This fortune cost $1.50. Consider it your first loss.'"
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "vending_fortune",
      "next": 21
    },
    {
      "type": "text",
      "speaker": "Vending Machine",
      "text": "CLUNK. WHIRR. ERROR: OUT OF WISDOM. DISPENSING EXISTENTIAL DREAD INSTEAD."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Nothing comes out. Somehow that feels worse."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The vending machine's hum shifts slightly. Was that always a B-flat? You decide not to investigate."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "vending_b7_done",
      "ifTrue": 12,
      "ifFalse": 3
    },
    {
      "type": "condition",
      "flag": "vending_c3_done",
      "ifTrue": 12,
      "ifFalse": 6
    },
    {
      "type": "condition",
      "flag": "vending_a1_done",
      "ifTrue": 12,
      "ifFalse": 9
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vending_b7_done",
      "value": true,
      "next": 14
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vending_c3_done",
      "value": true,
      "next": 14
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vending_a1_done",
      "value": true,
      "next": 14
    }
  ],
  "fridge_notes": [
    {
      "type": "condition",
      "flag": "lunch_thief_culprit_revealed",
      "ifTrue": 10
    },
    {
      "type": "condition",
      "flag": "read_fridge_1",
      "ifTrue": 5
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "ATTENTION: Someone has been taking items that do not belong to them from this refrigerator. You know who you are. -Management"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "P.S. The yogurt was LABELED. With my NAME. In SHARPIE. This is not ambiguous. -Janet"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_fridge_1",
      "value": true,
      "next": 6
    },
    {
      "type": "condition",
      "flag": "read_fridge_2",
      "ifTrue": 10
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "RE: RE: RE: FRIDGE THEFT. I have installed a camera. Yes, this is legal. I checked with legal. They said 'please stop emailing us.' I'm taking that as approval. -Janet"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "ADDENDUM: The camera was stolen from the fridge within 24 hours. The irony is not lost on me. -Janet"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "NEW NOTE (different handwriting): If you can't handle the heat, get out of the kitchen. Also I took your sandwich. It was mediocre. -Anonymous"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_fridge_2",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "THIS IS NOW A CRIME SCENE. DO NOT OPEN THIS REFRIGERATOR. -Janet"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "I have retained counsel. This is no longer a break room matter. This is a LEGAL matter. My attorney will be in contact. -Janet"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "Janet, your 'attorney' is a paralegal from the second floor who owes you a favor. Please stop terrorizing the break room. -Diane"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "FINAL WARNING: I have dusted my tupperware for fingerprints. Results are pending. -Janet"
    },
    {
      "type": "text",
      "speaker": "Fridge Note",
      "text": "P.S. The fingerprints came back. It was me. I ate my own lunch by accident on Tuesday and forgot. I am not apologizing because the principle still stands."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There are seventeen more notes underneath, each more unhinged than the last. You decide you've read enough."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "fridge_saga_complete",
      "value": true,
      "next": 19
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You quietly close the fridge. The yogurt inside has been there so long it may have achieved sentience."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "lunch_thief_fridge_done",
      "ifTrue": 17
    },
    {
      "type": "condition",
      "flag": "lunch_thief_started",
      "ifFalse": 17
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_lunch_thief",
      "stage": 2
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "lunch_thief_fridge_done",
      "value": true,
      "next": 17
    }
  ],
  "printer_interact": [
    {
      "type": "condition",
      "flag": "printer_quest_done",
      "ifTrue": 34
    },
    {
      "type": "condition",
      "flag": "printer_toner_quest",
      "ifTrue": 21
    },
    {
      "type": "condition",
      "flag": "briefing_complete",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You approach the printer. It's a Xerox WorkCentre 7845i. The display reads: 'PC LOAD LETTER.' It's just a printer.",
      "next": 20
    },
    {
      "type": "condition",
      "flag": "printer_quest_started",
      "ifTrue": 20
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You approach the printer. It's a Xerox WorkCentre 7845i. The display reads: 'PC LOAD LETTER.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "No one has printed anything. The printer begins printing anyway."
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "*CHUNK CHUNK WHIRRRRR*"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A single sheet of paper emerges. It reads, in 72-point bold Comic Sans:"
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "HELP ME"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You stare at the paper. The printer stares back. You're not sure how, but it does."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display changes to: 'REPLACE TONER SOUL.' Then, before you can process that:"
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "I KNOW ABOUT THE HENDERSON FILES"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What?!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The printer prints another page. It's a detailed org chart of the Henderson Trust with one name circled three times in red."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "But the toner runs out halfway through. The circled name is illegible."
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "*sad beeping noises*"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display reads: 'REPLACE TONER TO LEARN THE TRUTH.' You check. There is no replacement toner on this floor."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_printer",
      "stage": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_quest_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You install the old toner cartridge Alex set aside. The printer makes a sound like a sigh of relief."
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "*CHUNK CHUNK CHUNK WHIRRRRRR*"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three pages print. Slowly. Deliberately. The printer seems almost dignified about it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Page 1: An internal memo from 2016 authorizing the 'admin_legacy protocol.' Signed by the Regional Manager."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Page 2: A list of Henderson Trust account adjustments — small enough to avoid audit flags, large enough to matter. Over eight years."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Page 3: A single note in different ink: 'If anyone is reading this — check page 47 of the trust document. Original copy is in the Archive. — D.K.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "D.K. ...Dave Kowalski? Alex's predecessor?"
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "*one quiet beep*"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display changes to: 'THANK YOU.' Then the printer powers down completely. For the first time in years, it seems at peace."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_quest_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 350
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "TWENTY-TWO YEARS OF DOCUMENTS. ALL WITNESSED. NONE FORGOTTEN. TRUTH DELIVERED."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Printer from Hell has been laid to rest. +350 XP.",
      "next": 20
    },
    {
      "type": "condition",
      "flag": "printer_soul_done",
      "ifTrue": 37
    },
    {
      "type": "condition",
      "flag": "printer_soul_started",
      "ifFalse": 37
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The printer is still, its display dark. But Alex mentioned an ethernet port on the wall right beside it — labeled 'PRINTER DIRECT.' That's what you need.",
      "next": 20
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The printer sits in silence. Its display is dark. It has said everything it needed to say.",
      "next": 20
    }
  ],
  "janitor_intro": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Hmm. New face on the sixth floor. Trust department?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Yeah, I'm the new trust officer. Andrew."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Andrew. Good name. Means 'strong.' You're going to need that."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You notice the Janitor is wearing a gold Rolex. His mop bucket has a monogram on it."
    },
    {
      "type": "choice",
      "speaker": "Mysterious Janitor",
      "prompt": "Something on your mind, son?",
      "choices": [
        {
          "text": "That's a nice watch for a janitor.",
          "next": 5
        },
        {
          "text": "Anything I should know before I go up there?",
          "next": 10
        },
        {
          "text": "You don't really seem like a janitor.",
          "next": 15
        },
        {
          "text": "Just passing through.",
          "next": 21
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "This? Gift from a client. A long time ago. Back when I was... in a different line of work."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Let me give you some advice, free of charge -- though in this building, nothing is truly free."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The floors I mop see everything. Deals made in hallways. Arguments in stairwells. The truth always comes out in what people say when they think nobody's listening."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Or what they print. That printer on the sixth floor? It remembers everything. Every document. Every draft. Every panicked 3 AM printout."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Some people think machines don't have memory. Those people haven't worked here long enough.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Henderson Trust. Now there's a name I haven't heard in a while."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Did you know Old Man Henderson built that trust himself? Filed the paperwork at this very office. Thirty years ago. I watched him do it."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You've been here for thirty years?"
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The floors don't mop themselves. And some of us... we stay because there are things that need watching."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Listen -- Old Man Henderson put a clause in that trust. Page 47, paragraph 3. Nobody reads that far. But someone should.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "A different role? Heh."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I was Senior Vice President of Trust Administration for this branch. Twenty-two years. Built the trust department from scratch."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "And now you're... mopping?"
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Sometimes the best view of the maze is from the floor, not the corner office."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Also, the pension is excellent and I have zero emails to answer. Do you know how many emails a VP gets? Three hundred a day. Now I get zero and I know everything."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Think about that, Andrew. Really think about it.",
      "next": 4
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_janitor",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "One more thing. When the time comes to make your choice about the Hendersons..."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Read the will. Not the summary. Not the abstract. Not Skip's bullet points. The actual will. Page 47."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor resumes mopping. The Rolex catches the fluorescent light."
    },
    {
      "type": "end"
    }
  ],
  "karen_not_ready": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "You again. Are you ready to admit defeat, or have you come to waste MORE of my time?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I need a bit more experience before I'm ready for this, Mrs. Henderson."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Experience. How CUTE. Come back when you've actually handled some real clients. I'll be waiting. I'm VERY good at waiting. I have a binder about it."
    },
    {
      "type": "end"
    }
  ],
  "karen_intern_first": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "You're not ready. I can TELL you're not ready. You have the look of someone who has never handled a difficult client in their life."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I just need a moment to--"
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Go practice on the Intern. He's useless but at least he won't bill us for the trauma. Come back when you've broken a sweat."
    },
    {
      "type": "end"
    }
  ],
  "karen_meeting": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Finally. FINALLY. Do you know how long I've been waiting? I have a Pilates class at 2."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Henderson, thank you for coming in. I'm Andrew, the trust officer assigned to--"
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "I know what you are. You're the fourth one. The last one cried. Will you cry? You look like you might cry."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 26,
      "ifFalse": 23
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Good. Because I have DOCUMENTATION. I have EMAILS. I have a BINDER."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Karen slams a three-ring binder on the desk. It's at least four inches thick. Tabs are color-coded."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "My father PROMISED me the lake house. Page 34 of my binder. I have the Christmas card where he said, and I quote, 'Karen, the lake house is yours someday, now please stop asking.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "A Christmas card isn't legally--"
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "IT'S IN THE BINDER."
    },
    {
      "type": "choice",
      "speaker": "Karen Henderson",
      "prompt": "Now. Are you going to HELP me, or do I need to speak to your manager?",
      "choices": [
        {
          "text": "Let's review the trust documents together.",
          "next": 10
        },
        {
          "text": "The trust language is very clear, Mrs. Henderson.",
          "next": 14
        },
        {
          "text": "Your binder is very thorough.",
          "next": 17
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Review? REVIEW? I've reviewed them a hundred times. They're WRONG. The trust is wrong. My father wouldn't have wanted this."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "And don't get me started on Chad. That boy couldn't manage a lemonade stand, let alone an investment portfolio."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "He thinks 'diversification' is dating multiple people at once. Which he also does. Poorly."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "I want what's mine. I've been VERY patient. And I am DONE being patient."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Clear? CLEAR? Let me tell you what's clear. What's clear is that this institution has FAILED my family."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Failed to communicate. Failed to manage expectations. Failed to return my calls -- SEVENTEEN calls, by the way. I have a LOG."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "The log is in the binder. Tab seven. Highlighted. WITH ANNOTATIONS."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "You're being condescending. I can FEEL you being condescending. My father always said I had a gift for detecting condescension."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "That's it. I'm calling corporate. I'm calling my attorney. I'm calling the MANAGER."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Karen's composure shatters. The binder opens. Papers fly. A Starbucks receipt for $47.83 flutters to the ground."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "You want to see HOSTILE? I'll show you the TRUE POWER of a dissatisfied beneficiary!"
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "karen"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 27
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 28
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm... not going to cry.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I... reviewed the full trust file this morning, Mrs. Henderson. The crying wasn't in my notes.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "No. No, I think I'm all right, actually. Thank you for asking.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Not immediately, no. I tend to take a while to get to things.",
      "next": 4
    }
  ],
  "chad_meeting": [
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Broooo. What's up. You the new trust guy? Sweet office, dude."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Chad Henderson enters wearing a backwards cap, a popped collar polo, and carrying a protein shake that cost more than your lunch."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 29,
      "ifFalse": 26
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Call me Chad, bro. Mr. Henderson was my grandpa. Well, I guess that's why we're here. RIP to the GOAT."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "So anyway, Grandpa Chad -- yeah, he was also Chad, family tradition -- he totally told me the portfolio was mine."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "I've got BIG plans for it, bro. I'm gonna put it all into crypto. Well, not Bitcoin, that's for boomers. I'm talking about PumpCoin. It's got a dog on it."
    },
    {
      "type": "choice",
      "speaker": "Chad Henderson",
      "prompt": "You a crypto bro? You look like a crypto bro.",
      "choices": [
        {
          "text": "The trust has a prudent investor standard, Chad.",
          "next": 7
        },
        {
          "text": "Tell me more about these plans.",
          "next": 12
        },
        {
          "text": "What about your sister Karen's claims?",
          "next": 16
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Prudent investor? Bro. BRO. I am the MOST prudent."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Last year I turned $500 into $50. That's a 90% lesson in prudence right there. You can't BUY that kind of education."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You... lost 90% of your investment?"
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "I GAINED 90% experience, bro. And experience is the real portfolio. My lawyer says vibes are legally binding."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Vibes are not legally binding."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Okay so picture this. We take Grandpa's $12 million portfolio and we go ALL IN on PumpCoin at the dip."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Then we NFT the lake house. Yeah, you can NFT a house now. My buddy Tyler said so. He's in crypto. Well, he was. He's in jail now, but not for the crypto stuff."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Point is, by Q3 we'll be at like 10x returns. Then I buy a yacht, name it 'Fiduciary Duty,' and we all win."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That is, and I want to be precise about this, the worst investment plan I have ever heard."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Karen? Dude. BRO. Karen has been trying to take everything since Grandpa's funeral. She showed up with a BINDER."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "A BINDER, bro. At a FUNERAL. Tab-indexed. Color-coded. Who DOES that?"
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "She thinks she deserves the lake house because she 'has memories there.' BRO. I have memories there too. I once did a backflip off the dock. Poorly. But I DID it."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Okay look. I can tell you're not vibing with the crypto plan. So let me make this simple."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Give me my money or I'm calling my lawyer. Well, my friend who's ALMOST a lawyer. He's in his third year of pre-law. Which is like a lawyer but with more debt."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Chad crushes his protein shake container with one hand. He immediately regrets it as protein shake sprays everywhere."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "That was supposed to look cool. ANYWAY. I'm not leaving without what's mine, BRO!"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chad_met",
      "value": true
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "chad"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 30
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 31
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mr. Henderson, thank you for meeting with me about the trust dist--",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mr. Henderson, I've prepared an annotated summary of the trust provisions, and I'd like to start with the distribut--",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mr. Henderson, I'm sure we can work through the trust distribution without any complicat--",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mr. Henderson, if we could go through the trust one section at a time, starting with the distribut--",
      "next": 3
    }
  ],
  "grandma_meeting": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Oh, hello dear. You must be Andrew. Come sit down. I made cookies.",
      "next": 31
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grandma Henderson places a plate of homemade chocolate chip cookies on the desk. They smell incredible."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Now, before we start, I want you to know that I understand how difficult these family matters can be."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "My Harold -- God rest his soul -- he was a good man but a terrible communicator. He told everyone what they wanted to hear. Which is how we ended up here."
    },
    {
      "type": "choice",
      "speaker": "Grandma Henderson",
      "prompt": "Cookie, dear?",
      "choices": [
        {
          "text": "Thank you, Mrs. Henderson. (Take a cookie)",
          "next": 5
        },
        {
          "text": "Let's talk about the trust distribution.",
          "next": 10
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You take a cookie. It's the best cookie you've ever had. You feel your resolve weakening. (-5 Assertiveness, -2 Composure for this fight!)"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "took_grandma_cookie",
      "value": true
    },
    {
      "type": "action",
      "action": "heal"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Good, aren't they? Harold's mother's recipe. She was a terrible person but an excellent baker. Funny how that works."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Now then. The trust."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I know what Karen wants. I know what Chad wants. Karen wants the lake house because she thinks it validates her childhood. Chad wants the money because he doesn't understand what money is."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "What none of them seem to remember is that I helped Harold build that trust. Every asset. Every provision. I was in the room when the documents were drafted."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You were involved in the original trust creation?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Dear, I used to WORK in this office. Trust administration. Twenty years before that young man in the server room was even born."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I know things about this company that would make your compliance department weep. But that's not why I'm here."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I'm here because Harold put a clause in the trust. Page 47, paragraph 3. The one nobody reads."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What clause?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "The one that says the surviving spouse has discretionary authority over the entire corpus, subject to a standard of good faith and family welfare."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "In other words, dear..."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "It's ALL mine. Every penny. The lake house, the portfolio, the savings, the vintage car collection, and the timeshare in Branson that nobody wants but everybody fights about."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I've been letting them argue for six months because, frankly, watching Karen make binders is the most entertainment I've had since Harold passed."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "But now I'm bored. And my stories are on at 3. So let's wrap this up."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 35,
      "ifFalse": 32
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Oh sweetie. I know. That's the point."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Now. I'm going to make you an offer. You seem like a nice young man. Better than the last four, at least. The third one DEFINITELY cried."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "But nice is a currency, dear, and I've watched it devalue since 1987. Let's see what else you're holding."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grandma Henderson's eyes sharpen. The kindly grandmother facade drops like a curtain. Behind it is forty years of financial expertise and zero patience for nonsense."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Consider this your performance review, dear. The cookies were the easy part."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "grandma_met",
      "value": true
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "grandma"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "walkTo": "chair_n_mid",
          "sit": true,
          "speed": 1.5
        },
        {
          "actor": "grandma",
          "face": "chair_n_mid",
          "wait": false
        }
      ],
      "next": 1
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 36
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 37
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Henderson, I... this changes everything about the distribution plan.",
      "next": 23
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Henderson, I read every page of this trust. I prepared for two days. How did I not see page forty-seven?",
      "next": 23
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Henderson, I... all right. All right. That changes the entire distribution. Quite a lot, actually.",
      "next": 23
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Henderson, I was taking this one page at a time and I... wasn't expecting page forty-seven to do that.",
      "next": 23
    }
  ],
  "skip_act2": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! Buddy! Quick sync. How's the Henderson thing going?"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "Give me the thirty-thousand-foot view.",
      "choices": [
        {
          "text": "It's a complete disaster, Skip.",
          "next": 2
        },
        {
          "text": "Karen has a binder. Chad has a crypto plan. Grandma has the will.",
          "next": 6
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Disaster? No, no, no. Reframe. It's a... disruption event. We're being disrupted. By the client. In the client-facing space."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "This is actually GREAT. Know why? Because disruption is where INNOVATION happens."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Karen threw a binder at me."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Physical engagement! That's high-touch client interaction, baby! Write that in the quarterly report!"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Okay, okay, okay. So here's what I'm thinking. And this is blue-sky, right? Real outside-the-box stuff."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "What if -- and stay with me here -- what if we just... give everyone what they want?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The assets total $42 million. They're each asking for about $40 million."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Right. So we need... *counting on fingers* ...about $80 million more. Can we leverage something?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Leverage WHAT, Skip?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I don't know, that's a details question. I'm a big-picture guy. Details are for people who haven't achieved executive consciousness yet."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Look, here's my advice: penetrate the Henderson situation from a position of strength. Really drill down into those assets. Get your hands on the principal and don't let go."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You know those all sound like innuendos, right?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Innuendo? That's an Italian word. See? This is global thinking. We're going global with this, Andrew."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Okay, I gotta run. I have a leadership webinar on 'Synergistic Disruption in the Post-Trust Era.' It's an hour long but I'm only going for the free tote bag."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Keep crushing it! *finger guns*"
    },
    {
      "type": "end"
    }
  ],
  "skip_post_karen": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! Come in, come in. Shut the door. This is a Level Three conversation. We don't broadcast Level Threes."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "First — HUGE props on Karen. I'm not going to say I had doubts, but I had... significant doubts. A medium-to-large amount of doubts."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 19,
      "ifFalse": 16
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And you SURVIVED. That's the narrative. You're a survivor. This is a brand moment, Andrew. We should get you a mug."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Okay. Next up: Chad. Chad Henderson. Chad is... different."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Karen had rage. Organized, tabulated, binder-formatted rage. Chad has... energy. Undirected energy. The kinetic chaos of a man who once tried to invest his entire trust distribution in a cryptocurrency called PumpCoin."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What did you tell him?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I said we'd 'explore the synergies.' That bought about four days. His attention span is roughly that of a golden retriever who just heard a plastic bag."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Chapter two of 'Selling to the Unsellable': Chad WANTS to be talked out of his bad ideas. He just needs someone with the confidence to do it. You speak Chad?"
    },
    {
      "type": "choice",
      "speaker": "Andrew",
      "prompt": "Do I speak Chad?",
      "choices": [
        {
          "text": "I'll figure it out.",
          "next": 10
        },
        {
          "text": "I barely survived Karen.",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "THAT is the spirit. Adaptability. That's going in your performance review right now. Mentally. In my head."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Fair. But here's the trick: whatever he says, respond with 'interesting pivot' and slowly redirect. Works on everyone under 30 with a SoundCloud account."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "He's down in the conference room. Housekeeping is still fishing binder tabs out of the air vents but it should be mostly usable."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "You've got this. Confident. Adaptable. And whatever you do — don't mention crypto first. Let HIM bring it up. He always brings it up."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_post_karen",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 21
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "She threw a binder at me, Skip.",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I prepared talking points, Skip. She threw a binder at me before I finished the first one.",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "She threw a binder at me, Skip. I'm fine. It was a very large binder, but I'm fine.",
      "next": 3
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I was trying to take it slow, Skip. She threw a binder at me. I don't think she wanted to take it slow.",
      "next": 3
    }
  ],
  "janet_act2": [
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 20,
      "ifFalse": 17
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*extremely long sip from tumbler*"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "So I heard about Karen. And the binder. And the... incident."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "For what it's worth, that's actually a GOOD sign. She only throws binders at people she's beginning to respect. The last trust officer? She threw a STAPLER."
    },
    {
      "type": "condition",
      "flag": "chad_met",
      "ifFalse": 8
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "And Chad... oh honey. Did he tell you about PumpCoin? The one with the dog?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "PumpCoin crashed two weeks ago. It's worth less than the graphic of the dog. Chad doesn't know yet. Nobody wants to tell him."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I found out because I may have accidentally invested in it too. The dog was very cute. I am not a smart investor."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Also -- and this is the REAL gossip -- I was in the copy room and I overheard Skip on the phone."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "He was talking to someone at corporate. Using his 'serious voice.' Which is just his regular voice but louder and with more buzzwords."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "He said something about 'accelerating the Henderson resolution' and 'managing the optics.' And then he said 'mother' and hung up really fast when he saw me."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Make of that what you will. I've made of it something I keep in the locked drawer."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*sip*"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "The kombucha isn't helping today. I may need to switch to the emergency kombucha."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "There's an emergency kombucha?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Bottom desk drawer. The one that locks. Don't ask what ABV it is."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 21
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 22
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Oh God, you're still here? I mean -- oh GOOD, you're still here.",
      "next": 1
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You're still here. You probably had a contingency plan for still being here. That's not a compliment.",
      "next": 1
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You're still here. After all of it. I don't know if that's resilience or a very specific type of not noticing.",
      "next": 1
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You're still here. Slowly, presumably. That's... actually somewhat reassuring. Don't tell anyone I said that.",
      "next": 1
    }
  ],
  "alex_it_side_router": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. What's up?"
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "What do you need?",
      "choices": [
        {
          "text": "What about that IT project you mentioned?",
          "next": 2
        },
        {
          "text": "What's going on with the main investigation?",
          "next": 5
        },
        {
          "text": "Just checking in.",
          "next": 7
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_side_chosen",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Right, yeah. Here's the situation..."
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_main_chosen",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Yeah, let me catch you up on the big picture...",
      "next": 9
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_side_deferred",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Same old chaos. You know where to find me."
    },
    {
      "type": "end"
    }
  ],
  "alex_it_router": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. I've got a couple things going on. What do you want to talk about?"
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "What's on your mind?",
      "choices": [
        {
          "text": "What's the serious one?",
          "next": 2
        },
        {
          "text": "Got any IT jobs for me?",
          "next": 5
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_story_chosen",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Yeah. Yeah, you're gonna want to hear this. Close the door."
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_story_deferred",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Always. The infrastructure in this building is held together by prayers and zip ties. Let me tell you what's broken now..."
    },
    {
      "type": "end"
    }
  ],
  "alex_it_act2": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Andrew. Close the door. I'm about to be very calm at you, which is how you'll know it's serious."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I found an encrypted partition buried in the server. Someone hid it deep — it only shows up if you know exactly where to look. And it's been pinging servers in the Cayman Islands every night since 2016."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...pinging the Caymans? From a trust department server?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Yeah. I cracked the first layer of encryption. Took me three Red Bulls and a flashback to my CompTIA cert exam, but I got through."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's a database. Of trust account modifications. Going back to 2016. None of them are in our official records."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "And once you see the pattern you can't unsee it -- every single modification is on Henderson family accounts."
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "Someone's been making unauthorized changes to the Henderson Trust for EIGHT YEARS, bro.",
      "choices": [
        {
          "text": "Who has access?",
          "next": 7
        },
        {
          "text": "What kind of modifications?",
          "next": 10
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The access logs are clean. Which is itself a finding -- nobody's logs are clean. Mine aren't clean, and I'm the one who reads them."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "But the database metadata has one username attached: 'admin_legacy.' That account was created in 2006 and never decommissioned."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "2006. That's before my time. That's before EVERYONE'S time. Well... almost everyone's."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Small stuff. Basis adjustments. Fee allocations. Nothing that would trigger an audit individually. But collectively? We're talking about $2 million in skimmed fees over eight years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Someone's been nickel-and-diming the Henderson Trust, and they're REALLY good at it."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm going to keep digging. But if anyone asks, you didn't hear this from me."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Also if my network access gets revoked tomorrow, check under the third floor stairwell. I've got a dead drop with a USB drive."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "A dead drop? You're an IT guy at a bank, not Jason Bourne."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That's exactly what Jason Bourne would say."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "knows_server_secret",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "branch_decision": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You sit at your desk. The Henderson file is spread before you. Three beneficiaries. Three demands. One trust."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Karen's binder sits in the corner, pages still scattered from the incident. Chad's protein shake stain is on the ceiling. And Grandma's cookie plate is suspiciously empty."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You've met them all. You've survived them all. Now comes the hard part: the actual job."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone rings. It's Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! Quick download. I need your Henderson recommendation by EOD. Corporate is breathing down my neck. Also my mother keeps calling. Unrelated."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "So what's the play? How do we... resolve this trust situation?"
    },
    {
      "type": "choice",
      "speaker": "Narrator",
      "prompt": "This is it. The decision that defines the rest of Andrew's career at Vaults Fargo.",
      "choices": [
        {
          "text": "Follow the letter of the law. Honor the trust document exactly.",
          "next": 7,
          "flag": "path_legal"
        },
        {
          "text": "Bend the rules. Find a creative interpretation that keeps everyone happy.",
          "next": 12,
          "flag": "path_bro"
        },
        {
          "text": "Grandma cited page 47, paragraph 3. Nobody reads that clause unless they wrote it. She knows something.",
          "next": 17,
          "flag": "path_grandma"
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You choose the straight path. The trust document is clear. The law is the law."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, the trust language favors the surviving spouse. Karen and Chad will need to accept a smaller distribution. That's the law."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The LAW? Andrew, the law is... look, the law is like a speed limit. It's more of a suggestion."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's really not."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Fine. FINE. But when Karen calls corporate -- and she WILL call corporate -- you're taking that meeting. Not me. I'll be at my leadership webinar. The one about disruption. *click*",
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You choose the creative path. Rules were made to be... interpreted flexibly."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, I think we can restructure the distribution to give everyone something. It'll take some creative accounting and maybe bending a few guidelines."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Now THAT'S what I'm talking about! Innovation! Disruption! I knew I hired you for a reason!"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Wait, I didn't hire you. HR did. But I'm going to take credit for it."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Do what you gotta do, buddy. I'll make sure compliance is looking the other way. I have dirt on the compliance guy. Long story. *click*",
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You choose Grandma's path. Page 47, paragraph 3. The clause nobody reads."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, I've been looking at the trust document. There's a clause on page 47 that changes everything. I think Grandma Henderson has been playing us all."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Page 47? Nobody reads that far. That's like the terms of service of a trust document."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip... did you know that Grandma Henderson used to work here? In trust administration?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There is a very long pause on the phone."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "...How did you find that out?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, is there something you're not telling me?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I... look. We need to talk. In person. Executive floor. Conference table. And Andrew? Don't tell anyone about page 47."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Especially not my mother."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*click*"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "branch_chosen",
      "value": true
    },
    {
      "type": "condition",
      "flag": "path_legal",
      "ifFalse": 31
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The law is the law. It isn't much, but it's the only thing in this building with a page count. (+3 Composure)"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "path_bro",
      "ifFalse": 34
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Bending the rules has sharpened your instincts. Somewhere, a compliance form has quietly begun filling itself out. (+3 Bureaucratic Efficiency, -2 Composure)"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You now know what's on page 47. It does not make you happier, but it makes you considerably harder to argue with. (+3 Assertiveness)"
    },
    {
      "type": "end"
    }
  ],
  "legal_eagle_ending": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three days after your recommendation. Your inbox has 247 unread emails. 243 of them are from Karen Henderson."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The other four are from corporate."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Executive floor. Now. And bring your... I don't know, bring whatever you bring to a meeting where corporate sends their top guy.",
      "next": 22
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You look up. Standing at the conference table is a man in a power suit with a gold tie. He's holding a golf putter."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Andrew. Please, sit down.",
      "next": 23
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "I'm the Regional Manager. You don't need to know my name. Nobody does. I answer to a title, not a name. It's more efficient."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "I've reviewed the Henderson situation. Your recommendation was... correct. Legally sound. Properly documented. By the book."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Thank you--"
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "That wasn't a compliment. Being 'correct' in this industry is a liability. Being correct means someone has to be WRONG. And Karen Henderson does not enjoy being wrong."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "She's called corporate forty-seven times. She's left Yelp reviews for a bank. We don't have a Yelp page. She MADE one."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "I'm here to make this go away. In the corporate world, we call that 'strategic conflict resolution.' You might call it... synergy."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Manager stands. He takes a practice putt with his golf club into an imaginary hole on the carpet.",
      "next": 24
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Here's what's going to happen. You're going to revise your recommendation. Make Karen happy. Make this go away."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That would violate our fiduciary obligation to the trust."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Fiduciary obligation. Those are expensive words. Let me counter with some cheaper ones: quarterly earnings, shareholder value, your continued employment."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "This is the corporate world, Andrew. The truth is whatever the quarterly report says it is."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm not changing my recommendation."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Then I'm afraid we have a... synergy problem."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Manager loosens his gold tie. His eyes narrow. The golf putter transforms from accessory to weapon.",
      "next": 25
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Let me show you how we handle 'problems' at the corporate level."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "regional"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional",
          "walkTo": "table_stand_n",
          "face": "table_approach",
          "speed": 1.7
        },
        {
          "actor": "player",
          "walkTo": "table_approach",
          "face": "regional",
          "speed": 1.6
        },
        {
          "actor": "skip",
          "face": "table_stand_n",
          "wait": false
        }
      ],
      "next": 3
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "walkTo": "table_seat_sw",
          "sit": true,
          "speed": 1.5
        },
        {
          "actor": "regional",
          "walkTo": "table_seat_ne",
          "sit": true,
          "speed": 1.3
        }
      ],
      "next": 5
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional",
          "stand": true,
          "walkTo": "table_stand_n",
          "face": "table_seat_sw",
          "speed": 1.2
        },
        {
          "actor": "regional",
          "gesture": "attack_ally",
          "hold": 0.85,
          "after": 0
        }
      ],
      "next": 12
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional",
          "pose": "ready",
          "expression": "angry",
          "face": "player",
          "hold": 0.9
        },
        {
          "actor": "skip",
          "face": "regional",
          "wait": false
        }
      ],
      "next": 19
    }
  ],
  "bro_code_ending": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A week after your 'creative' recommendation. Everyone's happy. Karen got the lake house. Chad got enough to buy PumpCoin (it crashed). Grandma got her stories."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip has been promoted. He's now 'Senior Vice President of Synergistic Client Solutions.' The title didn't exist before. He made it up."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Everything is perfect. Which is exactly when Compliance shows up.",
      "next": 20
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A figure appears in your doorway. Black suit. Red tie. Clipboard. Sunglasses. Indoors."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Andrew. I've been reviewing your Henderson Trust distribution."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Oh, great. I think you'll find everything is--"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Non-compliant. With seventeen separate regulatory guidelines. Two federal statutes. And one internal policy that I didn't even know existed until you violated it."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "You somehow created a new type of regulatory violation. The legal department is going to name it after you."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Look, Skip said it was--"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Skip. Yes. Skip told you to 'make it work.' Skip also once approved a loan application written in crayon because the applicant 'had good energy.'"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Skip is not a reliable source of compliance guidance. Skip is barely a reliable source of oxygen."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Let me explain what happens next. I file a report. The report goes to the regulatory committee. The regulatory committee files a Form 27B/6 with FINRA."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Have you ever seen a Form 27B/6, Andrew? It's forty-seven pages long. Double-sided. And every page is a different way of saying 'you're in trouble.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Isn't there something we can work out?"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "'Work out.' The most dangerous phrase in the English language, right after 'let me circle back on that' and 'per my last email.'"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "No, Andrew. There is nothing to 'work out.' There is only compliance and non-compliance. You have chosen non-compliance."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Compliance Auditor removes their sunglasses. Their eyes are like two separate audit trails converging on your career.",
      "next": 21
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "And non-compliance... has consequences."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "compliance"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "walkTo": "exec_center",
          "face": "compliance",
          "speed": 1.6
        },
        {
          "actor": "compliance",
          "walkTo": "confront_north",
          "face": "exec_center",
          "speed": 1.6
        }
      ],
      "next": 3
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "compliance",
          "pose": "ready",
          "expression": "angry",
          "face": "player",
          "hold": 0.9
        }
      ],
      "next": 17
    }
  ],
  "secret_ending": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You approach the executive floor conference table. Skip and Grandma Henderson are already seated, voices lowered.",
      "next": 56
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mom, I told you not to come to the office--"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Skip, don't you 'Mom' me. I've been watching you run this trust department into the ground for three years."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "They notice you. Skip's face is a color you've never seen before. Something between 'caught' and 'catastrophe.'",
      "next": 57
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! Great timing. Great. Super great. Come in. You know my... uh... you know Mrs. Henderson."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "He knows me as a client. But I think it's time he knows the full picture. Don't you, Skip?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip... Grandma Henderson is your MOTHER?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "ADOPTIVE mother. Technically. Harold Henderson married my mom when I was ten. It's... complicated. Like all trust structures. Heh."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You assigned me your own family's trust case?!"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I had to! The conflict of interest was... okay yes, there was a MASSIVE conflict of interest. But I thought if I just... stayed at arm's length..."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "He stayed at arm's length by hiding behind buzzwords and finger guns. Which is also how he handles everything else."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mom!",
      "next": 58
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Skip, sit down. Andrew, you too.",
      "next": 59
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Here's what's really going on. Harold's trust was supposed to be simple. But someone -- someone inside this company -- has been siphoning fees from Henderson accounts since 2016."
    },
    {
      "type": "condition",
      "flag": "knows_server_secret",
      "ifFalse": 17
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The encrypted partition. Alex found unauthorized modifications going back eight years."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Smart boy. Yes. $2,000,000 in skimmed fees. And I know who did it."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I came back to this office -- as a client, through the front door -- to find out who's been stealing from my family's trust."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "And now I have the evidence. The Janitor helped. He's very loyal. Also he has all the master access codes from when he was VP."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "The person responsible is someone in this room."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You and Skip look at each other."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "What?! Mom, I would NEVER--"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Of course not, Skip. You can barely operate the coffee machine. You think I'd suspect you of sophisticated financial fraud?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "No. The 'admin_legacy' account was created by the Regional Manager. The one who's been 'overseeing' this branch for eight years. The one who golfs every Thursday instead of reviewing audit reports."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I was going to handle this myself. I've been handling everything myself since 1987."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "But Skip told me about you, Andrew. How you actually read the trust documents. How you didn't cry when Karen threw the binder. How you chose to look at page 47."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "So I'm going to give you a choice. Help me take down the Regional Manager. Or walk away."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mom, this is a lot. Can we circle back on--"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Skip. If you say 'circle back' one more time, I will change the trust to leave everything to the cat."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "...We don't have a cat."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I'll GET one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip slumps in his chair, defeated by his own mother for what is clearly not the first time."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'll help."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Good. Then let's go have a word with this 'Regional Manager.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grandma Henderson stands. She picks up her cane. It no longer looks like a walking aid. It looks like a weapon.",
      "next": 60
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mom, you can't just--"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Skip. I'm seventy-four years old, I helped build this trust department, and someone has been stealing from my dead husband's accounts. Watch me."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grandma Henderson marches toward the Regional Manager's temporary office. Skip and Andrew follow, mostly because the alternative is being in front of her.",
      "next": 61
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "What-- Mrs. Henderson? What is the meaning of this?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "The meaning of this is: I know about the admin_legacy account. I know about the $2,000,000. And I know about the Cayman Islands P.O. box."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I also baked cookies. Would you like one before we ruin your career?"
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "This is... you can't prove... I'll have you escorted out of this building!"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Try it. The Janitor has the keys. And the evidence. And a very good lawyer -- my granddaughter. Yes, Karen. She's aggressive. I know. I raised her."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Manager's face cycles through the five stages of corporate grief: denial, anger, restructuring, golden parachute, and acceptance."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Fine. FINE. You want to do this? Then we'll do this. I didn't spend twenty years climbing the corporate ladder to be taken down by a grandmother and a trust officer who's been here for A WEEK."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And me!"
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Nobody was counting you, Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Fair."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Wait -- the Regional Manager flees! But Skip, overwhelmed by the situation, has a complete corporate meltdown.",
      "next": 62
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I CAN'T TAKE IT ANYMORE! All the synergies! All the paradigm shifts! ALL THE FINGER GUNS!"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I just wanted to be a good boss, Andrew! I read SEVEN leadership books this month! SEVEN! And they ALL contradicted each other!"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Oh, Skip..."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I DON'T EVEN KNOW WHAT SYNERGY MEANS, MOM!"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "secret_path_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "skip_boss"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "walkTo": "table_approach",
          "face": "grandma",
          "speed": 1.6
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "skip",
          "face": "player"
        },
        {
          "actor": "grandma",
          "face": "player",
          "hold": 0.3
        }
      ],
      "next": 4
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "skip",
          "stand": true,
          "walkTo": [
            6.6,
            8.6
          ],
          "face": "grandma",
          "speed": 1.9,
          "hold": 0.25
        }
      ],
      "next": 12
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "skip",
          "walkTo": "table_seat_e",
          "sit": true,
          "speed": 1.3
        },
        {
          "actor": "player",
          "walkTo": "table_seat_s",
          "sit": true,
          "speed": 1.5
        }
      ],
      "next": 13
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "grandma",
          "stand": true,
          "walkTo": [
            4,
            6.4
          ],
          "face": "skip",
          "speed": 1.1,
          "hold": 0.45
        }
      ],
      "next": 35
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional",
          "show": true,
          "face": "exec_center"
        },
        {
          "actor": "grandma",
          "stand": true,
          "walkTo": "regional_confront",
          "face": "regional",
          "speed": 2.3
        },
        {
          "actor": "skip",
          "stand": true,
          "walkTo": "regional_flank_s",
          "face": "regional",
          "speed": 1.8
        },
        {
          "actor": "player",
          "stand": true,
          "walkTo": "regional_flank_n",
          "face": "regional",
          "speed": 1.8
        },
        {
          "actor": "regional",
          "face": "grandma",
          "after": 1
        }
      ],
      "next": 38
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "regional",
          "exit": "elevator",
          "speed": 3
        },
        {
          "actor": "player",
          "face": "skip",
          "wait": false
        },
        {
          "actor": "grandma",
          "face": "skip",
          "wait": false
        }
      ],
      "next": 49
    }
  ],
  "karen_first_loss_tutorial": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Karen Henderson dismantles you. Not metaphorically. The binder alone causes structural damage to the conference table."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Hey. Hey! You okay? What happened in there?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "She had a binder."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Yeah, she always has the binder. Listen — Karen's been doing this for years. She knows every loophole, every pressure point, every trick."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "You can't walk in there at your current level and expect to hold your ground. You need more experience. More Assertiveness. More Composure."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "How do I get that?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The reception desk. Prospective clients come in all day. Handle their cases, win the fights, build up your skills."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "TIP: Go to the Reception area and interact with the desk to take on clients. Each win earns XP and AUM currency."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Handle 3 clients. Get yourself to Level 3. Then head back to the conference room and face Karen again — at that level you'll actually have a fighting chance."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Oh — and check the motivational posters around the building. Sounds dumb, but they're actually worth reading. Trust me."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Also, there's an old Sprint Review cabinet in the break room. Don't laugh — every forty floors you clear, that thing gives you +1 Composure and +1 Assertiveness. Permanent. Caps at five each. Two hundred floors and you're basically a new hire."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "One more thing. I've dealt with the Hendersons before. Let me save you some pain."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Karen? Don't try to schmooze her. She's immune to that stuff. But cite actual case law — legal arguments — and she folds like a cheap suit."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Chad's the opposite. He name-drops lawyers constantly but he's never read a legal document in his life. Legal tactics bounce right off him. But call him out publicly — social pressure — and he completely crumbles."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And Grandma... don't underestimate her. She ran this office for twenty years. Sweet talk won't work — she invented sweet talk. But she's never had her own books audited. An audit approach will catch her off guard."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...She's coming back, isn't she."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She never left. She's in the conference room right now writing a Yelp review about the parking situation."
    },
    {
      "type": "end"
    }
  ],
  "karen_retry": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Oh, you're back. I still have the binder."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "karen"
    },
    {
      "type": "end"
    }
  ],
  "chad_retry": [
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Bro. Round two? I respect the hustle. Not the strategy. But the hustle."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "chad"
    },
    {
      "type": "end"
    }
  ],
  "grandma_retry": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Back so soon, dear? I put away the cookies. You don't get cookies twice."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "grandma"
    },
    {
      "type": "end"
    }
  ],
  "skip_boss_retry": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Let's just skip to the part where I have a breakdown. We both know how this goes."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "skip_boss"
    },
    {
      "type": "end"
    }
  ],
  "compliance_retry": [
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Still here? I've already started a second file on you. It's thicker than the first."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "compliance"
    },
    {
      "type": "end"
    }
  ],
  "regional_retry": [
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "You again. I'm billing this as a 'strategic re-engagement.' Don't test me."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "regional"
    },
    {
      "type": "end"
    }
  ],
  "intern_retry": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh no. I mean — oh, hey! You're back. I Googled some new techniques. I'm so sorry in advance."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "intern"
    },
    {
      "type": "end"
    }
  ],
  "janet_return": [
    {
      "type": "condition",
      "flag": "lunch_thief_started",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Oh — before I forget. Someone's been stealing lunches from the fridge. My money's on Alex from IT, but the Janitor says it's 'an inside job.' Whatever that means."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_lunch_thief",
      "stage": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "lunch_thief_started",
      "value": true,
      "next": 6
    },
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifTrue": 13,
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*sip*"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "janet_act6_rallied",
      "ifTrue": 8,
      "ifFalse": 9
    },
    {
      "type": "condition",
      "flag": "board_meeting_held",
      "ifTrue": 9,
      "ifFalse": 15
    },
    {
      "type": "condition",
      "flag": "act4_complete",
      "ifTrue": 10,
      "ifFalse": 11
    },
    {
      "type": "condition",
      "flag": "act5_complete",
      "ifTrue": 11,
      "ifFalse": 17
    },
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 19,
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Still alive? Good for you.",
      "next": 5
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Whatever's in that penthouse — you come back down."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "That's the job. You go up. You come back down.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Board meeting tomorrow. Thirty-two years and this is the first time I've been asked to testify for the department."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Make it count.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Those restructuring consultants have been giving me the look. The 'your position is under review' look."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I've outlasted four SVPs. I'll outlast them too.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You know what I've noticed? The building gets quieter the deeper you go. Like it's paying attention."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Or maybe I've just been here too long.",
      "next": 6
    }
  ],
  "alex_it_return": [
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifTrue": 5,
      "ifFalse": 2
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act5_complete",
      "ifTrue": 8,
      "ifFalse": 3
    },
    {
      "type": "condition",
      "flag": "act4_complete",
      "ifTrue": 11,
      "ifFalse": 4
    },
    {
      "type": "condition",
      "flag": "knows_server_secret",
      "ifTrue": 14,
      "ifFalse": 17
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm running interference from down here. Buying you time on their network."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Don't let The Algorithm run a diagnostic on you. Trust me on that one."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Badge logs, patch history, the encrypted partition — every thread points up. To the penthouse."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Whatever's running up there has been running longer than Meredith. Factor that in."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The restructuring consultants keep requesting server access. I keep telling them we're in maintenance."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Week three. They've stopped asking. Good."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That encrypted partition keeps growing. Every time I think I've mapped it, there's another layer."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Whatever they've been hiding, it's been accumulating for a long time."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Can't talk. Running a packet trace. Also your printer is still possessed — that's not a ticket, that's a relationship."
    },
    {
      "type": "end"
    }
  ],
  "intern_return": [
    {
      "type": "condition",
      "flag": "act4_complete",
      "ifTrue": 3,
      "ifFalse": 4
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I would talk more but Skip has me reorganizing the filing cabinets by 'vibrational frequency.' I don't know what that means and I'm afraid to ask."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act5_complete",
      "ifTrue": 4,
      "ifFalse": 5
    },
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 8,
      "ifFalse": 11
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I fought in the cubicle farm, Andrew. With a stapler. I am not the same person I was."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Skip says I'm now 'junior trust operations support staff.' I think I got promoted? Nobody confirmed it."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Is it just me or does the building feel different lately? Like the hallways are watching?"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Skip said I'm 'picking up on enterprise resonance.' I wrote it down. I still don't know what it means."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Hey Aiden! I mean -- whatever your name is!",
      "next": 1
    }
  ],
  "diane_return": [
    {
      "type": "condition",
      "flag": "diane_act6_rallied",
      "ifTrue": 3,
      "ifFalse": 4
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Bottom drawer. Antacids. Seriously."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "board_meeting_held",
      "ifTrue": 4,
      "ifFalse": 7
    },
    {
      "type": "condition",
      "flag": "act4_complete",
      "ifTrue": 5,
      "ifFalse": 6
    },
    {
      "type": "condition",
      "flag": "act5_complete",
      "ifTrue": 6,
      "ifFalse": 10
    },
    {
      "type": "condition",
      "flag": "act3_complete",
      "ifTrue": 13,
      "ifFalse": 16
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You get the documents?"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Board meeting's tomorrow at 4. I cleared my afternoon. This ends one way or another."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The restructuring consultants keep walking past my desk without saying good morning."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "That tells you everything you need to know about what they think of us."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've worked reception for twelve years. I know when something is about to break."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Something is about to break."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You've got that look. The Henderson look. I've seen it before.",
      "next": 1
    }
  ],
  "janitor_return": [
    {
      "type": "condition",
      "flag": "has_rolex",
      "ifTrue": 12,
      "ifFalse": 11
    },
    {
      "type": "condition",
      "flag": "janitor_return_1",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Page 47. Don't forget."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_return_1",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The floors remember everything. So do I."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_return_2",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You're still standing. The building notices things like that."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He gestures vaguely at the hallway with his mop."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He resumes mopping. The Rolex catches the light."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "janitor_return_2",
      "ifTrue": 6,
      "ifFalse": 1
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Strange to look at my wrist and see nothing there."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Seventy-nine years is a long time to carry something. Hand it to the right person and it weighs nothing at all."
    },
    {
      "type": "end"
    }
  ],
  "skip_return": [
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Circle back with me after you've touched base on the Henderson action items."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And remember: every challenge is a learnable moment."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Twenty years in this industry. I thought I understood how it worked."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Keep going. I'll cover things here."
    },
    {
      "type": "end"
    }
  ],
  "karen_defeated": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "I... fine. FINE. But I'm keeping the binder."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "And I'm leaving a review. On EVERY platform. Yelp. Google. TripAdvisor. I don't care that this isn't a hotel."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... fine, Mrs. Henderson."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "It's MS. Henderson. And this isn't over. *picks up binder fragments and storms out*",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The conference room is silent. Binder tabs litter the floor like confetti at the world's worst party. You exhale for what feels like the first time in an hour."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone buzzes. Text from Skip: 'Heard you survived Karen. Get up here when you can. We need to talk about Chad. Bring aspirin.'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "karen_defeated",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "karen",
          "walkTo": "aisle_s",
          "speed": 2.5
        },
        {
          "actor": "karen",
          "exit": "door_west",
          "speed": 2.7,
          "after": 0
        }
      ],
      "next": 4
    }
  ],
  "chad_defeated": [
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Bro... that was... actually kind of sick? Like, you're really good at this trust stuff."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Okay I'll admit the crypto plan was... maybe not the move. My buddy Tyler said so too. From jail."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Can we just... do whatever the normal thing is? With the trust?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's called 'following the trust document,' Chad."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Sick. Let's do that. Also, you should check out PumpCoin. It's coming back. The dog on the logo just got sunglasses."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Chad shuffles out, already typing on his phone. You hear him say 'yeah bro, he's actually legit' to someone before the door closes.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone buzzes. Text from Skip: 'Two down. Get to my office before the next one. Trust me on this. TRUST. Me.' He added a fist bump emoji. Then deleted it. Then sent it again."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chad_defeated",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "chad",
          "walkTo": "aisle_s",
          "speed": 1.15
        },
        {
          "actor": "chad",
          "exit": "door_west",
          "speed": 1.15,
          "after": 0
        }
      ],
      "next": 6
    }
  ],
  "skip_post_chad": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Close the door. Both locks. Yes, there are two locks. I had them installed after the Henderson file came across my desk."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, it's just an elderly woman—"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She is NOT 'just' anything, Andrew. Karen was a complaint form with legs. Chad was a protein shake with a LinkedIn. Grandma Henderson is a DIFFERENT CATEGORY."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I had a senior consultant go in there in 2019. He came out speaking only in passive-aggressive non-answers. He's currently our VP of Compliance."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What does she actually want?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Everything. In writing. Notarized. With a follow-up call. She will offer you a cookie. Do NOT comment on the cookie."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What's wrong with the cookie?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Nobody knows. Three people have asked. They all transferred to the Omaha office voluntarily. On the same day. We don't talk about it."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Your only move is to stay calm, keep your documentation airtight, and under no circumstances let her redirect you with a story about her late husband Gerald."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Was Gerald—"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She will redirect you with a story about Gerald. Just nod. Set a mental timer for four minutes. After four minutes it loops back around to the trust. That's your window.",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She's waiting in the conference room. I'll be monitoring the situation remotely."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Monitoring how?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "From home. With the door locked. Both locks."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_post_chad",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...Harold.",
      "next": 11
    }
  ],
  "grandma_defeated": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Well. You held your own, dear. I had you down for tears by minute six. I so rarely lose a wager."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Harold would have liked you. He always said the best trust officers were the ones who could take a guilt trip and keep standing."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Have another cookie, dear. You've earned it."
    },
    {
      "type": "action",
      "action": "heal"
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "stress_ball"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "And take this stress ball. Lord knows you'll need it with this family."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "grandma_defeated",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "chad_breakroom_idle": [
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Bro! You the new trust guy? I'm Chad. We'll talk later — I'm carb-loading right now."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Gotta keep the macros tight before a big meeting, you know? Protein shake o'clock."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "*flexes unnecessarily* See you in the conference room, dude."
    },
    {
      "type": "end"
    }
  ],
  "grandma_reception_idle": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Oh, hello dear. I'm just waiting for my appointment. Don't mind me."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I brought cookies for the office. There should be some left in the conference room. If Chad hasn't eaten them all."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "We'll talk when it's my turn, dear. No need to rush. *knits calmly*"
    },
    {
      "type": "end"
    }
  ],
  "compliance_defeated": [
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Impressive. Your regulatory knowledge is... adequate. That's the highest compliment I give."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "I'll file the Form 27B/6 as a 'learning experience.' It's still forty-seven pages, but I'll mark it as 'resolved.'"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Don't let it happen again. I'll be watching. I'm always watching."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Compliance Auditor puts their sunglasses back on and walks away. You notice they leave no footprints.",
      "next": 13
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "compliance_defeated",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You exhale for the first time in what feels like hours."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Then the lights flicker. Not the normal \"this building is old\" flicker. Something else."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The printer in the corner starts up on its own. A single page emerges."
    },
    {
      "type": "text",
      "speaker": "Printer",
      "text": "THE LEDGER REMEMBERS. FIND THE ARCHIVE."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...What the hell was that?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone buzzes. A text from Alex: \"Dude. Server room. NOW. The 3:47 AM thing just happened at 2 PM. Something is very wrong.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act2_complete",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "compliance",
          "walkTo": "board_door",
          "face": "player",
          "speed": 1.7,
          "hold": 0.3
        },
        {
          "actor": "player",
          "face": "compliance",
          "wait": false
        }
      ],
      "next": 4
    }
  ],
  "regional_defeated": [
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "This is... unprecedented. No one has ever... I need to call corporate."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "You realize this changes nothing, right? There will always be another Regional Manager. Another quarterly target. Another synergy."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Maybe. But the Henderson Trust will be handled correctly."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Correctly. How quaint. Enjoy your moral victory. I'll be on the golf course."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "regional_defeated",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Manager straightens his tie. His golden parachute remains undeployed. For now.",
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Then something strange happens. The elevator behind you dings. Nobody pressed it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The doors open to an empty car. The floor indicator scrolls through numbers that this building doesn't have."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A document slides out from under the elevator door. It's dated 1947. The letterhead reads \"VAULTS FARGO TRUST CHARTER — ORIGINAL.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "1947? This branch wasn't built until the '80s..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone buzzes. A text from Alex: \"GET TO THE SERVER ROOM. The encrypted partition just decrypted ITSELF. I did NOT do this.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act2_complete",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional",
          "exit": "elevator",
          "speed": 1.6
        },
        {
          "actor": "player",
          "face": "elevator",
          "wait": false
        }
      ],
      "next": 6
    }
  ],
  "skip_boss_defeated": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I... *panting* ...I don't even know what just happened."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Was I... did I just fight you? With corporate buzzwords?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You tried to 'circle back' on me three times, Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I know. I know. I'm... I'm sorry, man. I think I had a corporate break."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Skip, honey, you need a vacation. And a therapist. And to stop reading leadership books."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "You're right, Mom. You're always right. Can I have a cookie?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Of course, dear."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip eats a cookie. He starts to cry. It is somehow the most normal thing that has happened all week."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_defeated",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Well. Now that Skip has gotten that out of his system..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The overhead lights surge. Every screen in the office flickers to the same image: a trust document, dated 1947, scrolling endlessly."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Mom... what's happening to the building?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "It's waking up. I was afraid of this."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "The Henderson Trust isn't the only thing that's been mismanaged, Andrew. This building... has a longer memory than any of us."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor appears in the doorway. His expression is grim. His Rolex is glowing."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "It's started. I hoped we'd have more time."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone buzzes. A text from Alex: \"DUDE. Every server just rebooted. The encrypted partition is BROADCASTING. Something is VERY wrong.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act2_complete",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "andrews_desk": [
    {
      "type": "condition",
      "flag": "grandma_defeated",
      "ifTrue": 7
    },
    {
      "type": "condition",
      "flag": "checked_desk",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your cubicle. It smells faintly of despair and Febreze. The previous occupant left a motivational calendar stuck on March 2019."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There's a drawer full of antacids and a sticky note that reads: \"RUN WHILE YOU CAN — T.O. #3\""
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "antacid",
      "quantity": 2
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "checked_desk",
      "value": true
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "main_act1",
      "objective": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your desk. Your life now. The monitor displays a screensaver that says \"COMPLIANCE IS NOT OPTIONAL\" in Comic Sans."
    },
    {
      "type": "end"
    }
  ],
  "coffee_machine": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The coffee machine was manufactured during an era when \"ergonomic\" meant \"won't explode.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sign reads: \"COFFEE IS A PRIVILEGE, NOT A RIGHT. — Management\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below it, in Sharpie: \"Management can fight me. — Anonymous (Janet)\""
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 9,
      "ifFalse": 6
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "coffee_large",
      "quantity": 1
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 10
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 11
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pour yourself a large coffee. It tastes like determination and existential compromise.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pour yourself a large coffee. You already know the break room's brewing schedule. The pot is twenty minutes old, which is within your acceptable window.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pour yourself a large coffee. You don't check when it was made. You never do. It tastes like everything else on this floor -- survivable.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pour yourself a large coffee from the pot you started eleven minutes ago. It is, against all evidence of the surrounding institution, good.",
      "next": 4
    }
  ],
  "microwave": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The break room microwave. A monument to culinary war crimes."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The inside is stained with what you desperately hope is marinara sauce."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sign: \"WHOEVER MICROWAVED FISH ON FRIDAY: WE WILL FIND YOU. — The Entire Office\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below it: \"It was Alex.\" Below THAT: \"No it wasn't. — Alex (sent from my phone in the server room, which has no microwave)\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The microwave beeps once, unprompted. You back away slowly."
    },
    {
      "type": "end"
    }
  ],
  "dying_plant": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A plant that has given up on photosynthesis as a lifestyle."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A label reads: \"Mr. Fernsworth III — Skip's Responsibility Since 2021.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Mr. Fernsworth III has clearly not been watered since 2021. His leaves are the color of compliance documentation."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A tiny post-it on the pot reads: \"help me\" in suspiciously plant-like handwriting."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"SYNERGY\" — printed over a stock photo of six people fist-bumping over a laptop. Nobody in this building has ever fist-bumped. Not once."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sticker has been added: \"This word has appeared in 6 consecutive quarterly reviews. We looked it up. No one agrees what it means.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have already been here four hours and I feel less synergized than when I arrived."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_2": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"RISE AND GRIND\" — a man staring at a laptop at 2 AM surrounded by empty coffee cups. The stock graph behind him is going up. His posture is going down."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Sub-heading: \"Sleep is a recovery mechanism. Recovery is for the inefficient.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Who approved this? Who looked at this and said: yes, this will help."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_3": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"TOGETHER WE ACHIEVE MORE\" — geese flying in a V formation at sunset."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Fine print: \"The goose at the front does 47% more aerodynamic work. The geese at the back have never mentioned this. This is called professionalism.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I am the front goose. I have always been the front goose."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_4": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"GOOD ENOUGH IS THE ENEMY OF GREAT\" — an eagle soaring alone over a mountain range."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In red marker beneath: \"What's the enemy of getting home before 8 PM? This poster.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In a second handwriting: \"HR has been notified about the marker. - Facilities\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In a third handwriting: \"HR IS the marker. - Anonymous\""
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_5": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"COLLABORATE. INNOVATE. DISRUPT.\" — hands stacking on top of each other in a team huddle."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Small print: \"Disruption is encouraged unless it disrupts the existing hierarchy, workflow, budget cycle, or Skip's standing lunch order.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm going to disrupt my way right out of this building."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_6": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"YOUR ONLY COMPETITION IS WHO YOU WERE YESTERDAY\" — a man sprinting alone on a track."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Someone has drawn an arrow pointing to the runner and written: \"Yesterday-him also had dental. Think about that.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Yesterday-me did not know about the Henderson trust. Yesterday-me was thriving."
    },
    {
      "type": "end"
    }
  ],
  "poster_cf_7": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"THERE IS NO 'I' IN TEAM\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In neat handwriting below: \"There is no 'I' in team, but there IS an 'I' in 'I didn't get credit for this.' Just saying.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In a different handwriting: \"There is also an 'I' in 'individual performance review.' - Janet\""
    },
    {
      "type": "end"
    }
  ],
  "poster_br_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"RECHARGE. REFUEL. RETURN.\" — a smiling woman holding a coffee mug, looking rested and purposeful."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The word RETURN is bolded. Underlined. Italicized. Someone added an asterisk. The asterisk says: \"You have 14 minutes. The coffee takes 3.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "This poster is not about wellness. This poster is about compliance."
    },
    {
      "type": "end"
    }
  ],
  "poster_rec_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"FIRST IMPRESSIONS ARE PERMANENT\" — a confident handshake silhouetted against a city skyline."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Sub-heading: \"Smile. Even if you don't mean it. Especially if you don't mean it. The client can tell the difference, and they prefer the lie.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "This is the most honest dishonest thing I have ever read."
    },
    {
      "type": "end"
    }
  ],
  "poster_rec_2": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"SERVICE IS OUR PROMISE\" — a woman beaming into a headset."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Fine print: \"Our promise is subject to staffing levels, current hold times, and the emotional bandwidth of whoever happens to answer.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sticky note from Diane: \"Average hold time is currently 38 minutes. The promise is aspirational.\""
    },
    {
      "type": "end"
    }
  ],
  "poster_rec_3": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"YOUR CLIENT IS NOT A NUMBER\" — two people shaking hands warmly over a desk."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Fine print: \"They are, however, a revenue event with associated compliance obligations, AML screening requirements, and a billable relationship tier. But not a number.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Client #4471 is waiting for me right now. I did not name them that. The system did."
    },
    {
      "type": "end"
    }
  ],
  "poster_conf_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"ALIGNMENT IS NOT A DESTINATION. IT IS A PROCESS.\" — silhouettes around a boardroom table, all leaning slightly forward."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Sub-heading: \"This process is estimated to take 4–6 working sessions, one sub-committee, a steering group debrief, and a retrospective on the debrief.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have been in alignment meetings about the alignment meeting schedule. This poster understands me."
    },
    {
      "type": "end"
    }
  ],
  "poster_exec_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"LEADERSHIP IS NOT A TITLE. IT IS A RESPONSIBILITY.\" — a lone eagle on a cliff at dawn, chrome-framed, museum-quality lighting."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Embossed gold text beneath: \"Also a salary bracket. Primarily a salary bracket. The responsibility part is for the quarterly report.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "This frame costs more than my monthly rent."
    },
    {
      "type": "end"
    }
  ],
  "poster_exec_2": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"RESULTS SPEAK LOUDER THAN EFFORT\" — a businessman standing triumphant at a summit, tie blowing in the wind."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Fine print, in the smallest font legally possible: \"Effort is noted and appreciated in lieu of compensation adjustments for the current fiscal cycle.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "There is a regional manager thirty feet from this poster. The irony is structural."
    },
    {
      "type": "end"
    }
  ],
  "poster_exec_3": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"WE DON'T HAVE EMPLOYEES. WE HAVE STAKEHOLDERS.\" — diverse hands around a boardroom table."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In small script at the bottom: \"Stakeholders are not entitled to equity. The terminology is aspirational. This distinction was clarified in the 2019 handbook revision, section 4, paragraph 11.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I am a stakeholder with a frozen salary and a broken chair. I am staking nothing."
    },
    {
      "type": "end"
    }
  ],
  "poster_exec_4": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"EXCELLENCE IS THE STANDARD. NOT THE CEILING.\" — a rocket launching against a twilight sky. The frame is gold. Real gold, probably."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The rocket in this photo cost $2.3 million to produce. It is a stock image. They paid $149 for the license."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "My last raise was 1.2%. Before inflation. The rocket mocks me."
    },
    {
      "type": "end"
    }
  ],
  "poster_stair_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"SUCCESS IS A STAIRCASE, NOT AN ELEVATOR\" — a winding staircase ascending into light."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Someone has added in permanent marker: \"The elevator is also broken. This is not a metaphor. Maintenance has been notified since March. It is October.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I am standing on the stairs. The poster is right here. The irony is load-bearing."
    },
    {
      "type": "end"
    }
  ],
  "poster_hr_1": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"PEOPLE ARE OUR GREATEST ASSET\" — a smiling, diverse team photo, soft lighting, everyone inexplicably happy to be at work."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Sub-heading: \"Assets are subject to annual review, reallocation, write-downs, and depreciation over a standard amortization schedule.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "This poster is hanging in the HR department. I don't know if that's a threat or an apology."
    },
    {
      "type": "end"
    }
  ],
  "skip_desk": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip's desk. Dual monitors, both displaying LinkedIn motivational posts."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A \"#1 Boss\" mug sits front and center. The receipt is still in the mug. Skip bought it for himself."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There's a framed photo of Skip shaking hands with someone important-looking. On closer inspection, the \"important person\" is just Skip in a different suit, from a different angle."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A golf putter leans against the wall. A Post-it on it reads: \"PRACTICE STROKES = PRACTICE LEADERSHIP\""
    },
    {
      "type": "end"
    }
  ],
  "conference_whiteboard": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The whiteboard is covered in Skip's \"strategic planning.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It's a flowchart: \"SYNERGY → DISRUPT → INNOVATE → LEVERAGE → SYNERGY (repeat)\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Someone (Alex) wrote underneath: \"This is just a circle.\" Skip responded: \"Circles are the strongest shape. Like our TEAM.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In the corner, barely visible: \"I've been here 3 months and I still don't know what we do — The Intern\""
    },
    {
      "type": "end"
    }
  ],
  "server_rack_inspect": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Row upon row of blinking servers. The hum is almost hypnotic."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One server has a sticky note: \"DO NOT UNPLUG — contains 73% of all trust account records. The other 27% is vibes.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Another note: \"This one runs Doom. For stress testing purposes. — Alex\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A third note, much older: \"admin_legacy — DO NOT DECOMMISSION — R.M.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The servers emit a sound somewhere between a whisper and a scream. Probably just the cooling fans."
    },
    {
      "type": "condition",
      "flag": "server_secret_started",
      "ifTrue": 9
    },
    {
      "type": "condition",
      "flag": "met_alex_it",
      "ifTrue": 10,
      "ifFalse": 9
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_server_secret",
      "stage": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "server_secret_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 7,
      "ifFalse": 9
    }
  ],
  "alex_it_desk": [
    {
      "type": "condition",
      "flag": "printer_quest_started",
      "ifTrue": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex's desk is an archaeological dig of snack wrappers and energy drink cans. Stratigraphy suggests habitation since at least 2019."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three monitors: server logs, a Reddit thread about cryptography, and what is unmistakably Minecraft."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sticky note: \"BROWSER HISTORY IS ENCRYPTED WITH AES-256. NICE TRY, SKIP.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In a drawer (unlocked, because Alex fears nothing), a USB drive labeled \"EVIDENCE (BACKUP)\" next to a bag of Doritos.",
      "next": 15
    },
    {
      "type": "condition",
      "flag": "printer_quest_done",
      "ifTrue": 16,
      "ifFalse": 17
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Oh. Oh no. It printed something for you, didn't it."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Not a question. I've been watching that printer for three years. It's connected to a legacy subnet with read access to all document archives. Including the Henderson files."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The toner runs out on purpose — firmware was modified to abort print jobs with certain keywords. Whoever did it didn't expect the printer to get opinions about that."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I found old toner stock — pre-2016, before the firmware modification. I've already set it next to the printer. If you install it, the block won't apply and the full document will print."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Just go install it. I want to know what it's been trying to say as much as you do."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_printer",
      "stage": 2
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_toner_quest",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex slides a dusty toner cartridge across his desk. It has a Post-it note: 'PRE-2016 STOCK. DO NOT USE FOR REGULAR PRINTING.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex's desk. The toner cartridge Alex set aside is near the printer in the cubicle farm."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex's desk. He's not talking about the printer anymore. A new Post-it on the monitor reads: 'DO NOT REVIVE.'",
      "next": 15
    },
    {
      "type": "condition",
      "flag": "printer_toner_quest",
      "ifTrue": 14,
      "ifFalse": 6
    }
  ],
  "elevator": [
    {
      "type": "condition",
      "flag": "branch_chosen",
      "ifTrue": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator to the Executive Floor. A keycard reader blinks red."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sign: \"AUTHORIZED PERSONNEL ONLY. If you have to ask, you're not authorized. If you ARE authorized, you already know.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You don't have clearance yet. Maybe after the Henderson situation resolves..."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator light blinks green. Someone upstairs is waiting for you."
    },
    {
      "type": "end"
    }
  ],
  "reception_desk": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Diane's reception desk. The only organized surface in the entire building."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Color-coded files, alphabetized forms, a pen cup with EXACTLY twelve pens. One is missing. Diane knows which one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small plaque reads: \"You don't have to be crazy to work here, but your manager probably is.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below the plaque, a smaller note: \"This is not a joke. — Diane\""
    },
    {
      "type": "end"
    }
  ],
  "andrews_car": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your car. A 2014 Honda Civic with a dent from the time you parallel parked \"close enough.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Bumper sticker: \"MY OTHER CAR IS ALSO DEBT.\" It came with the car."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "For a moment you consider driving away. Starting a new life. Becoming a park ranger or something."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "But your student loans won't pay themselves. And also, your keys are inside the building. Classic."
    },
    {
      "type": "end"
    }
  ],
  "janitor_closet": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A janitor's supply closet that is... suspiciously well-appointed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Inside: a mop, industrial cleaner, and... a mahogany bookshelf with first-edition business books?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There's a framed MBA from Wharton on the wall. Next to it, an \"EMPLOYEE OF THE MONTH\" certificate from every single month in 2003."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small plaque: \"Sometimes the best office is the one nobody expects.\" — The Mysterious Janitor, Former SVP"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The circuit panel by the door covers the garage sublevel; breakers 47, 19, and 82 have been switched off since 2005."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A maintenance tag on the panel housing reads: \"47-19-82 is the building service override. Do not share with tenants. — Facilities, 2003.\""
    },
    {
      "type": "end"
    }
  ],
  "executive_desk": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A desk that costs more than your annual salary. Mahogany. Triple monitors. A paperweight shaped like a golden bull."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The nameplate reads \"REGIONAL MANAGER\" in gold leaf. No actual name. Just the title. Titles are all that matter up here."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A poster: \"SYNERGY: Because 'We Need to Talk About the Quarterly Numbers' Sounded Too Honest.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The desk drawers are locked. The lock is gold-plated. Of course it is."
    },
    {
      "type": "end"
    }
  ],
  "executive_water_cooler": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The executive water cooler dispenses sparkling mineral water. Imported from the Swiss Alps."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sign: \"Cost: $47 per bottle. Expense code: EMPLOYEE WELLNESS.\" Notably, this benefit does not extend below the executive floor."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meanwhile, the break room cooler downstairs has had a \"PLEASE REFILL\" sign for three months. Nobody has refilled it."
    },
    {
      "type": "end"
    }
  ],
  "elevator_executive": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The executive elevator. It smells like leather, ambition, and a cologne that costs more than your rent."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A motivational poster inside: \"LEADERSHIP: It's Lonely at the Top. But the Parking is Excellent.\""
    },
    {
      "type": "end"
    }
  ],
  "karen_intro": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Excuse me? Are YOU the trust officer handling my father's estate?"
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "I've been waiting. I have a BINDER. And a SCHEDULE. And a very expensive lawyer on speed dial."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "We should discuss this in the conference room—"
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "We'll discuss it WHERE I want to discuss it. Which is the conference room. I'm glad we agree."
    },
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "Don't be late. I track tardiness. In the binder. Tab twelve."
    },
    {
      "type": "end"
    }
  ],
  "karen_return": [
    {
      "type": "text",
      "speaker": "Karen Henderson",
      "text": "I said conference room. Not here. Go."
    },
    {
      "type": "end"
    }
  ],
  "grandma_return": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Hello again, dear. I was just counting the exits. Old habit. There are four, if you count the window Skip believes is decorative."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Don't let me keep you. *the knitting needles do not stop* I keep everyone else."
    },
    {
      "type": "end"
    }
  ],
  "grandma_exec_idle": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Oh, this isn't the conference room, dear."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Go find the conference room. I'll be waiting with cookies."
    },
    {
      "type": "end"
    }
  ],
  "regional_intro": [
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "Ah. The trust officer who's been causing all this... excitement."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "I am the Regional Manager. You don't need my name. Names are for people who haven't achieved title-based identity."
    },
    {
      "type": "text",
      "speaker": "Regional Manager",
      "text": "We have matters to discuss. Serious matters. Quarterly-report-affecting matters."
    },
    {
      "type": "end"
    }
  ],
  "compliance_intro": [
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "*adjusts sunglasses indoors*"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Section 17. Subsection 4. Paragraph 2."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What does that—"
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "It means I'm watching. I'm always watching."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Carry on. For now."
    },
    {
      "type": "end"
    }
  ],
  "intern_combat_intro": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Okay so I MIGHT have accidentally shredded the Henderson pre-audit file."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You WHAT?"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Skip said to \"make the documents disappear\"! I thought he meant disappear-disappear! Like a magic trick!"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "But the budget didn't cover a magician so I used the next best thing: the industrial shredder."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "And then the shredder caught fire. And then I put the fire out with coffee. And then the coffee machine broke."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Anyway, I panicked! And when I panic, I do paperwork! AGGRESSIVE paperwork!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Intern grabs a nearby stack of documents and begins hurling them with wild abandon."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "PAPER FIIIIGHT!!!"
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "intern"
    },
    {
      "type": "end"
    }
  ],
  "isaiah_intro": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Hey there! You must be the new trust officer. Welcome to the team."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I'm Isaiah. If you ever need help with anything around here, just ask. I mean it — anything."
    },
    {
      "type": "choice",
      "speaker": "Isaiah",
      "prompt": "What can I do for you?",
      "choices": [
        {
          "text": "Could you help me understand how things work here?",
          "next": 3
        },
        {
          "text": "Get me a coffee.",
          "next": 7
        },
        {
          "text": "Nothing right now, thanks.",
          "next": 9
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Of course! So the trust department handles estate administration, investment management, and fiduciary services."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Skip runs the show — well, he thinks he does. Janet handles the real paperwork. The Intern... tries."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "If you need documents filed or client records pulled, I'm your guy. Just ask nicely and I'll make it happen."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_isaiah",
      "value": true,
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "...Sure. I'll get you a coffee. But you know, a 'please' goes a long way around here."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_isaiah",
      "value": true,
      "next": 10
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_isaiah",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Anytime you need something, come find me. I'm usually near the water cooler."
    },
    {
      "type": "end"
    }
  ],
  "isaiah_return": [
    {
      "type": "condition",
      "flag": "isaiah_evidence",
      "ifTrue": 2,
      "ifFalse": 3
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "board_meeting_held",
      "ifTrue": 3,
      "ifFalse": 6
    },
    {
      "type": "condition",
      "flag": "act4_complete",
      "ifTrue": 4,
      "ifFalse": 5
    },
    {
      "type": "condition",
      "flag": "act5_complete",
      "ifTrue": 5,
      "ifFalse": 9
    },
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 12,
      "ifFalse": 15
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "23 breached agreements. Triple-checked. The board has no defense if they see this."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Ready when you are."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Eleven years. I have eleven years of receipts, Andrew."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "When this is over, someone is going to have a very bad audit."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I've been pulling operational records back to 2018. You'd be surprised what shows up if you look long enough."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Or maybe you wouldn't. You seem like someone who looks."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Hey! Need anything? You know I'm always happy to help."
    },
    {
      "type": "end"
    }
  ],
  "rachel_intro": [
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "Oh. Hi."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I didn't think anyone was here yet."
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "I'm always here first."
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "I'm Rachel. Trust officer."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_rachel",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "Coffee maker's around the corner — sounds like it's dying, but it works."
    },
    {
      "type": "end"
    }
  ],
  "rachel_return_act1": [
    {
      "type": "condition",
      "flag": "rachel_gift_act1",
      "ifTrue": 5
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "coffee_large",
      "quantity": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "rachel_gift_act1",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "You looked like you needed one."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "How's the desk?"
    },
    {
      "type": "end"
    }
  ],
  "rachel_return_act2": [
    {
      "type": "condition",
      "flag": "rachel_gift_act2",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "You look tired."
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "coffee_large",
      "quantity": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "rachel_gift_act2",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "It's the good roast. From downstairs.",
      "mood": "worried"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "Hang in there."
    },
    {
      "type": "end"
    }
  ],
  "rachel_return_act3": [
    {
      "type": "condition",
      "flag": "rachel_gift_act3",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "You've been here late."
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "coffee_large",
      "quantity": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "rachel_gift_act3",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "I made extra."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "Don't forget to eat something."
    },
    {
      "type": "end"
    }
  ],
  "rachel_note": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Rachel's desk. Everything filed. Monitor off. A sticky note."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'Gone home. You should too. — R'"
    },
    {
      "type": "end"
    }
  ],
  "meredith_intro": [
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "You're the new trust officer."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I'm Meredith Sterling. SVP of Strategic Operations. I oversee... everything."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I've read your file. Interesting background. Let's see if it translates to results."
    },
    {
      "type": "choice",
      "speaker": "Meredith Sterling",
      "prompt": "I trust Skip has briefed you on the Henderson situation?",
      "choices": [
        {
          "text": "Yes, he was very... thorough.",
          "next": 5
        },
        {
          "text": "He mostly talked about synergy.",
          "next": 7
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Mm. 'Thorough' is not a word I'd associate with Skip. Your diplomacy is noted. It will be useful."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I'll be watching your performance closely. This department has been... underperforming. That will change."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Of course he did. Skip treats management theory like a religion. Unfortunately, he's a bad practitioner."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Results, Andrew. That's what matters to me. Not synergy. Not paradigm shifts. Results."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_meredith",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "We'll speak again. Soon."
    },
    {
      "type": "end"
    }
  ],
  "meredith_return": [
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I don't have time for small talk. Do you have results?"
    },
    {
      "type": "end"
    }
  ],
  "alex_it_act3": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You're here. Good. Don't lock the door — locked doors get noticed. Just stand in front of it and look boring."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay. So. The encrypted partition? The one that's been pinging the Caymans since 2016?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It just decrypted itself. Not 'I cracked it' decrypted. ITSELF. Like it WANTED to be found."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "And what's inside is... it's a shadow ledger. Every trust account this branch has ever managed. Parallel books."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Not just the Hendersons. Dozens of accounts. Hundreds of small adjustments. Basis point skims. Fee reallocations. All traced back to one account: admin_legacy."
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "Someone's been running a shadow trust system for EIGHT YEARS. And the building's servers just... revealed it. On purpose.",
      "choices": [
        {
          "text": "Who created admin_legacy?",
          "next": 6
        },
        {
          "text": "What do you mean the building revealed it on purpose?",
          "next": 10
        },
        {
          "text": "How much money are we talking about?",
          "next": 14
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The account metadata traces back to an IP address on the executive floor. Created 2006. The username format matches old Vaults Fargo sysadmin conventions."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "But the Janitor told me something, and it connects. When he was SVP, there was a server room in the basement. The Archive. It had the original trust records going back to 1947."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The Archive was sealed in 2016. Same year admin_legacy was created. Coincidence? In this building, nothing is a coincidence."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I need you to find the Archive. There's supposed to be access through the back corridor. Some kind of old passage behind the north wall."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I know how it sounds. I said it out loud to myself first, as a test. The decryption key that was used? It's not any standard algorithm I've seen."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's a hash of a trust document. A SPECIFIC trust document. Dated 1947. The original Vaults Fargo branch charter."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Someone — or something — used a 77-year-old legal document as a cryptographic key. And then used it to unlock itself."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Either this building has an automated system nobody documented, or it has opinions. I've stopped betting against the second one."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Conservative estimate? $23 million across all accounts over eight years. The Henderson Trust was the biggest target — $2 million — but it wasn't the only one."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "This is FINRA territory. SEC territory. Possibly FBI territory. We're talking systematic breach of fiduciary duty at an institutional level."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "And the only person who had consistent executive access across all eight years is the Regional Manager. He rotated through three other branches but kept 'oversight' of this one."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "But we need proof. Physical proof. The digital trail isn't enough — they'll say I fabricated it. We need the original trust records from the Archive."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_it_act3_done",
      "value": true,
      "next": 23
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "archive_accessible",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Find the Archive. The Janitor might know how to get in. And Andrew — be careful. If the Regional Manager finds out we're looking..."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Well. Let's just say 'restructuring' isn't always a metaphor."
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "knows_server_secret",
      "value": true,
      "next": 19
    }
  ],
  "janet_act3": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew. Close the door. *very aggressive sip*"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Have you noticed anything... weird today? The lights keep flickering. The elevator went to a floor that doesn't exist. And my computer printed a document I didn't write."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "It was a trust account statement from 1987. I wasn't even WORKING here in 1987. I was in middle school. Badly."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Also — and this is the part that's making me drink faster — there's a woman on the executive floor I've never seen before."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Silver hair. Navy suit. Looks at everyone like she's calculating their net worth and finding it insufficient."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Someone said her name is Meredith Sterling. SVP of Strategic Operations. Nobody knew we HAD a Strategic Operations."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "She's been in Skip's office for two hours. Skip hasn't said 'synergy' once. That's how I know it's serious."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*extremely long sip* I'm switching to the emergency reserves."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_janet_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "skip_act3": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Hey. Come in. Sit down. Actually, don't sit down. Actually... I don't know. Everything is weird today."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "So. There's a woman from corporate here. Meredith Sterling. She's... she's doing a review."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "A 'comprehensive operational assessment.' That's corporate for 'finding reasons to fire people.'"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She asked me about the Henderson Trust. About our procedures. About our... 'fiduciary controls.'"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I tried to use buzzwords. They bounced off her like... like buzzwords bouncing off a wall. She's immune. Nobody's ever been immune before."
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "Andrew, I'm scared. Is it okay to say that? Leadership books say you're never supposed to say that.",
      "choices": [
        {
          "text": "It's okay to be scared, Skip.",
          "next": 6
        },
        {
          "text": "What does Meredith actually want?",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Really? Because 'Lead Like a Lion, Land Like a Feather' says fear is just 'an unrealized growth metric.' But it doesn't feel like a growth metric. It feels like fear."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Thanks, Andrew. You're... you're a good employee. And maybe also a good person. I'm realizing those might be different things."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She wants to 'optimize' the trust department. Which I think means cutting half of us and making the other half do twice the work."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "She mentioned something about 'legacy systems' and 'archival redundancies.' I think she's talking about the old records in the basement."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Also she asked about the Janitor. By name. Which is weird because nobody knows the Janitor's actual name. I just call him 'sir' because he scares me a little."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_skip_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "intern_act3": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Aiden! I mean Andrew! I mean... whoever you are, HELP."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "The lady from corporate — Meredith — she asked me for 'all Henderson-related documentation from the past five years.'"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I may have... accidentally told her about the shredding. And the fire. And the coffee machine."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "She wrote something on her tablet. I think it was 'terminate.' She might have been playing Wordle but I'm NOT optimistic."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Also something really weird happened. I was alone in the copy room and the printer turned on by itself."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "It printed a list of names. People who used to work here. Some of them going back to the '40s. And at the bottom it said 'THE CHARTER REMEMBERS.'"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I don't know what that means and I'm choosing not to find out. I'm going to go reorganize the supply closet by color. And also hide."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_intern_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "diane_act3": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Andrew. I need to talk to you. Privately."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Meredith — the SVP from corporate — she's not just doing a review. I've been watching her. She's been accessing old personnel files. Trust records from before my time."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "She asked me about the Archive. The old records room in the sub-basement. It's been sealed since 2016."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I told her I didn't have access. Which is true. But I didn't tell her that the Janitor does."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Andrew, I've worked here for twelve years. I've seen managers come and go. Regional directors. SVPs. None of them ever asked about the Archive."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Whatever's down there, Meredith doesn't want you to find it first. So maybe you should."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_diane_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "janitor_act3": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I've been expecting you, Andrew."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You felt it too, didn't you? The building shifting. The lights. The printer."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Let me tell you something I should have told you on your first day."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "When this branch was chartered in 1947, the founders wrote something into the original trust charter. Not a legal clause. Something... older."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "A declaration that the fiduciary duty of this institution was not just to its clients but to the concept of trust itself. The actual, philosophical concept."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Decades of promises. Decades of people putting their faith in this building. Their estates. Their families' futures. All of that faith... accumulated."
    },
    {
      "type": "choice",
      "speaker": "Mysterious Janitor",
      "prompt": "This building is alive, Andrew. It has been for a very long time.",
      "choices": [
        {
          "text": "That's impossible.",
          "next": 7
        },
        {
          "text": "The Fiduciary Force.",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Is it? You've seen the printer. You've felt the elevator. You've watched documents appear from nowhere."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "This building was built on trust. Literal trust. Fiduciary trust. And when someone breaches that trust — really, fundamentally breaches it — the building reacts."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Why do you think I stayed? Twenty-two years as SVP, and then I picked up a mop. Because someone needs to watch."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The Fiduciary Force. That's what the founders called it. The accumulated weight of every promise made within these walls."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You're quick. Good. The Fiduciary Force is waking up because someone has been violating the charter for eight years. The admin_legacy account. The shadow ledger."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Every skimmed basis point. Every redirected fee. The building felt each one. And now it's reached a threshold."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The Archive has the original records. The 1947 charter. The proof of what this institution was SUPPOSED to be."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I can get you in. Through the back corridor — north end. Use this keycard."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_archive_key",
      "value": true
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "compliance_manual",
      "quantity": 1
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Take my old compliance manual too. You'll need it where you're going."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "And Andrew — be careful in the Archive. The building protects its secrets. Not everything down there wants to be found."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_confronted",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_janitor_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "isaiah_act3": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Andrew. Interesting morning. I've been practicing not reacting to it."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "The woman from corporate — Meredith — she asked me to compile a list of everyone in the trust department and their 'redundancy potential.'"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I told her I'd get right on it. Politely. Then I immediately came to find you."
    },
    {
      "type": "choice",
      "speaker": "Isaiah",
      "prompt": "What's going on? Can I help?",
      "choices": [
        {
          "text": "We're investigating something big. Could use your help.",
          "next": 4,
          "flag": "isaiah_friendly",
          "flagValue": 2
        },
        {
          "text": "Stay out of it. It's safer for you.",
          "next": 7
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I knew it. The building's been... strange. I thought it was just me."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Whatever you need — filing, research, distraction — I'm in. Just ask nicely."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_act3_allied",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Noted. But I've been here long enough to know when something needs fixing, and this has the smell."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I'll keep my head down, but if you change your mind, you know where to find me."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_isaiah_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "meredith_act3": [
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Andrew. I've been reviewing your work on the Henderson Trust."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Interesting approach. Some would say reckless. I say it produced a measurable outcome, which in this department qualifies as exotic."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I'm here to ensure this department meets corporate standards. Standards that, frankly, it has not been meeting."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Skip is a competent motivational speaker. As a department head, however, he leaves much to be desired."
    },
    {
      "type": "choice",
      "speaker": "Meredith Sterling",
      "prompt": "I have plans for this department. Big plans. You could be part of them.",
      "choices": [
        {
          "text": "What kind of plans?",
          "next": 5
        },
        {
          "text": "I'm happy with how things are.",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Optimization. Modernization. Eliminating redundancies. This department has twelve people doing work that six could handle."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I've identified several positions for... reassignment. But someone with your results could have a future here."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Think about it. And don't waste time on 'investigations.' I know what Alex from IT has been doing in that server room. It stops now."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "'Happy.' That's a luxury, Andrew. Not a strategy."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "This department will change. The question is whether you're driving the change or being driven over by it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_meredith_act3",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "archive_terminal": [
    {
      "type": "condition",
      "flag": "has_archive_password",
      "ifTrue": 3
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "ACCESS DENIED. AUTHORIZATION CODE REQUIRED. Contact the Compliance Officer for clearance."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A CRT monitor coated in dust. The keyboard has keys that haven't been pressed since the Obama administration."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You press Enter. The screen flickers to life. Green text on black. It reads:"
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "VAULTS FARGO TRUST ARCHIVE — BRANCH 4471 — ESTABLISHED 1947"
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "WARNING: UNAUTHORIZED ACCESS DETECTED. FIDUCIARY INTEGRITY CHECK... PASSED."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "'Fiduciary integrity check'? The terminal is checking if I'm trustworthy?"
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "DISPLAYING: ADMIN_LEGACY TRANSACTION LOG — 2016 TO PRESENT"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Rows and rows of transactions scroll by. Small amounts. $50 here. $200 there. Fee adjustments. Basis point modifications. All from the same account."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At the bottom, a total: $23,478,912.20. Skimmed from 47 trust accounts over eight years."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Twenty-three million dollars. I'm going to need to sit down on something that isn't evidence."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "PRINT EVIDENCE? [Y/N]"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You press Y. A dot-matrix printer in the corner whirs to life and produces a thick stack of transaction records."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_archive_evidence",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Alex was right. Now we have the proof."
    },
    {
      "type": "end"
    }
  ],
  "archive_cabinets": [
    {
      "type": "condition",
      "flag": "archive_filing_done",
      "ifTrue": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Filing cabinets stretch from floor to ceiling. Each is labeled with a year, going back to 1947."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Most are locked. But five cabinets are ajar, their locks rusted open: 1947, 1971, 1993, 2006, and 2016."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "1947: The original branch charter. Yellowed paper. The ink has a faint gold shimmer that shouldn't be possible."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "1971: A restructuring memo. The trust department was nearly shut down. A janitor — the FIRST janitor — filed a motion to preserve it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "1993: Performance reviews for a young trust officer. The name is familiar: it's the Janitor. Top marks in every category."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "2006: A system access request for 'admin_legacy.' Approved by the Regional Manager. No other signatures."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "2016: A memo ordering the Archive sealed. 'Redundant records. Digital migration complete.' Signed by the Regional Manager."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "archive_filing_done",
      "value": true,
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The filing cabinets have nothing further to add. They said everything between 1947 and 2016."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The timeline is clear: the Regional Manager created the shadow account, then sealed the evidence. The building's been waiting for someone to open these drawers."
    },
    {
      "type": "end"
    }
  ],
  "stairwell_graffiti": [
    {
      "type": "condition",
      "flag": "act2_complete",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The corridor walls are concrete. Someone has scratched into them: 'TRUST FALLS — FLOOR COUNT: 17'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below it: 'If found, return to the 6th floor. Or don't. — The Intern (probably)'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The corridor echoes with the hum of the building. It sounds almost... intentional.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "New graffiti has appeared since last time. In gold ink that shouldn't exist on concrete:"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'THE FIDUCIARY FORCE IS NOT A METAPHOR.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below it, in different handwriting: 'Neither is my mop. — J'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The gold ink pulses faintly. You're not imagining it."
    },
    {
      "type": "end"
    }
  ],
  "security_guard_combat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A security guard steps out from behind a row of filing cabinets. He does not look friendly.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "Hold it. This area is restricted. I don't care what keycard you have."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm a trust officer. I have authorization to—"
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "You have authorization to LEAVE. The Regional Manager gave me specific orders: nobody accesses these records."
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "Now turn around, or I'll file a security incident report. And NOBODY wants to deal with that paperwork."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I can't do that. There are trust accounts being—"
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "Wrong answer."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "security_guard"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "security_guard",
          "walkTo": "guard_block",
          "face": "player",
          "speed": 2
        },
        {
          "actor": "player",
          "face": "guard_block",
          "wait": false
        }
      ],
      "next": 1
    }
  ],
  "security_guard_defeated": [
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "Alright, alright! I'm just doing my job, man. The Regional Manager pays extra for 'archive duty.' I didn't ask questions."
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "But between you and me? He's been down here three times this month. Always after hours. Always alone."
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "I don't know what he's hiding, but it's not my problem anymore. I'm going back to the lobby."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "security_guard_info",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "act4_trigger": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You found it. The transaction logs. The filing records. The 2006 access request."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "This is everything we need. I can correlate this with the server data and build a complete case."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "As Alex speaks, the monitors in the server room all switch to the same display: the 1947 trust charter."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Uh... I didn't do that."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The text of the charter begins to glow. Not the screen — the TEXT ITSELF, as if the words have weight and light."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A deep hum resonates through the building. You feel it in your chest. In your teeth. In the space behind your eyes."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay, THAT is not a server issue. That is a BUILDING issue. And I am only certified for server issues."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone rings. It's Diane."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Andrew. Meredith just locked down the entire floor. Security at every exit. Nobody in or out without her approval."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "She knows. I don't know how, but she knows you've been in the Archive."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "She's calling an emergency board meeting. She wants to dissolve the trust department entirely."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act3_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "meredith_lockdown",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Dissolve the— she can't DO that. Can she?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Not if we can prove what the Regional Manager has been doing. We need to rally the team — find Janet at her desk, Diane in reception, and the Mysterious Janitor in the Archive."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The Janitor's been waiting for this moment for twenty years. And once you have Janet and Diane on board, work on convincing Skip — he won't budge without the right words."
    },
    {
      "type": "end"
    }
  ],
  "janet_act4": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Rally? You want me to RALLY? Andrew, I'm not a rally person. I'm a 'sit quietly and drink' person."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "But... *sip* ...you know what? Fine. You know why?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Because Meredith tried to take my tumbler. Said it was 'unprofessional.' UNPROFESSIONAL."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "This is a $40 insulated wine tumbler with a motivational quote that says 'Rosé All Day' and I will DIE before I surrender it."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "What do you need from me? I know where every document in this building is. Including the ones Skip hid in the ceiling tiles."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_rallied",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'm in. For the tumbler."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "...And for the department, I guess. But mostly the tumbler."
    },
    {
      "type": "end"
    }
  ],
  "diane_act4": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've been documenting everything Meredith's done since she arrived. Every meeting. Every access request. Every personnel file she's reviewed."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Old habits. I document everything. It's why they haven't been able to fire me for twelve years."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Here's what I know: Meredith has been in contact with the Regional Manager. Frequently. Before she even arrived for the 'review.'"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "This isn't a review, Andrew. This is a cover-up. She's here to bury the evidence before you can use it."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The HR Department has the original employment records. If the Janitor was really SVP, there's a paper trail. Meredith can't delete paper."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_rallied",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I can get you into the HR Department once the team is fully on board. Talk to the Janitor first — he knows more than any of us."
    },
    {
      "type": "end"
    }
  ],
  "skip_act4": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. I... I've been thinking. Which is new for me, but I'm trying it."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Meredith wants to dissolve the department. MY department. The one I built from... okay, I didn't build it. The Janitor built it. But I've been MANAGING it."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The thing is... she's not wrong about everything. I haven't been a great leader. I've been a great TALKER. Those are different things."
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "So tell me, Andrew. Why should I fight for this department?",
      "choices": [
        {
          "text": "Because this department leverages core competencies that can't be outsourced.",
          "next": 4,
          "flag": "skip_convince_1",
          "flagValue": true
        },
        {
          "text": "Because you care about your team, Skip.",
          "next": 6
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "'Leverages core competencies'... that's... that's MY phrase. You're speaking my language."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Okay, I'm listening. But I need more."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I DO care about the team. Janet. The Intern. Even Alex, who definitely runs Minecraft on company servers."
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "But caring isn't a strategy. What's the strategy?",
      "choices": [
        {
          "text": "We disrupt Meredith's narrative by pivoting to a transparency-first paradigm.",
          "next": 8,
          "flag": "skip_convince_2",
          "flagValue": true
        },
        {
          "text": "We tell the truth about what's been happening.",
          "next": 10
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "'Disrupt.' 'Pivot.' 'Paradigm.' Andrew, you magnificent bastard. You're speaking fluent Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm getting FIRED UP. What else?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The truth? The TRUTH? Andrew, the truth is terrifying. The truth is that someone has been stealing from our clients and I didn't notice because I was too busy reading leadership books."
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "How do we actually win this?",
      "choices": [
        {
          "text": "We need to synergize our stakeholder alignment across all trust verticals.",
          "next": 12,
          "flag": "skip_convince_3",
          "flagValue": true
        },
        {
          "text": "We show the board that Meredith is part of the cover-up.",
          "next": 14
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "'SYNERGIZE.' 'STAKEHOLDER ALIGNMENT.' 'TRUST VERTICALS.'"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. That sentence means absolutely nothing. And yet... it means EVERYTHING to me."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Meredith is part of it? She's not just reviewing us, she's PROTECTING the person who—"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "If that's true, we need to move fast. What's the endgame?",
      "choices": [
        {
          "text": "We circle back to the original charter and leverage our fiduciary moat.",
          "next": 16,
          "flag": "skip_convince_4",
          "flagValue": true
        },
        {
          "text": "We go to the board with the evidence. All of it.",
          "next": 18
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "'Circle back.' 'Fiduciary moat.' That's... that's beautiful. I don't know what it means but I feel it in my SOUL."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm in. Whatever it takes. For the department. For the team. For the synergy."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The board. You're right. We take the evidence to the board meeting. All of it."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm done hiding behind buzzwords. Well... I'm done hiding behind MOST buzzwords. Some of them are load-bearing.",
      "next": 23
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_rallied",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Let's do this. *finger guns* ...Sorry. Force of habit."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "skip_convince_1",
      "ifFalse": 27
    },
    {
      "type": "condition",
      "flag": "skip_convince_2",
      "ifFalse": 30
    },
    {
      "type": "condition",
      "flag": "skip_convince_3",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "skip_convince_4",
      "ifTrue": 20,
      "ifFalse": 32
    },
    {
      "type": "condition",
      "flag": "skip_convince_2",
      "ifFalse": 32
    },
    {
      "type": "condition",
      "flag": "skip_convince_3",
      "ifFalse": 32
    },
    {
      "type": "condition",
      "flag": "skip_convince_4",
      "ifTrue": 20,
      "ifFalse": 32
    },
    {
      "type": "condition",
      "flag": "skip_convince_3",
      "ifFalse": 32
    },
    {
      "type": "condition",
      "flag": "skip_convince_4",
      "ifTrue": 20
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I want to believe you, Andrew. I do. But half of that pitch was just... words. REGULAR words. Anyone can say regular words."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Come back when you can say it in fluent Skip. I'll be here. Leveraging my feelings. Circling back to my doubts."
    },
    {
      "type": "end"
    }
  ],
  "intern_act4": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Andrew! I know I'm just an intern — well, a 'Trust Operations Support Specialist' — but I want to help!"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Meredith told me to clean out my desk. Which is harsh because I don't even HAVE a desk. I have a folding table near the fire exit."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "But I found something! When she told me to shred the Henderson pre-audit files? I didn't shred ALL of them."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I couldn't figure out the shredder setting so some of them came out as really thin strips instead of confetti. I taped them back together!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Intern produces a crumpled sheet of paper that has been reassembled with scotch tape, band-aids, and what appears to be a Fruit Roll-Up wrapper."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "It's a memo from the Regional Manager to Meredith. From THREE MONTHS AGO. Before she was supposedly 'assigned' to review us."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "It says 'Re: Archive Containment' and then there's a bunch of words I don't understand but 'destroy records' seems pretty clear."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Did I do good? I feel like I did good. This is the best day of my unpaid career!"
    },
    {
      "type": "end"
    }
  ],
  "janitor_needs_skip": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Not yet, Andrew. There's one more person who needs to decide where they stand."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Talk to Skip. He needs to choose: the buzzwords or the truth. Until he chooses, I have nothing more to give."
    },
    {
      "type": "end"
    }
  ],
  "janitor_act4": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You've done well, Andrew. The Archive. The evidence. The team."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "But there's one more thing you need. The original charter. The 1947 document."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "It's not in the Archive. I moved it years ago. To the Vault. Behind the Archive."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The Vault has a combination lock. Three numbers. They're scattered across the building — I hid them so no one person could access it alone."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "One is in the HR Department records. One is in Alex's server room. One is..."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "...engraved on the back of this Rolex."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor removes his gold Rolex and turns it over. On the case back, tiny numbers are engraved: 47."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "47. For 1947. The year it all began."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_rallied",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vault_code_1",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vault_accessible",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "hr_accessible",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Find the other two numbers. Open the Vault. Get the charter."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "And when the time comes to confront Meredith... read it aloud. Every word. Trust me."
    },
    {
      "type": "end"
    }
  ],
  "hr_rep_intro": [
    {
      "type": "condition",
      "flag": "defeated_hr_rep",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Welcome to Human Resources! I'm here to help with any concerns. As long as those concerns are pre-approved on Form 27B/6."
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Please note that entering this department constitutes implicit agreement to our 47-page conflict resolution policy."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I just need to look at some personnel files."
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Personnel files? Those are classified. And by 'classified' I mean I have personally sorted them into classes. A through F. Yours is... well."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "...I'm still filing that incident report. In triplicate. The third copy is for my therapist."
    },
    {
      "type": "end"
    }
  ],
  "hr_rep_combat": [
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "I'm sorry, you can't be in here. This area is restricted during the departmental review."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I need to access the employment records. Historical personnel files."
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Those files are sealed. By order of the SVP of Strategic Operations."
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "I'm going to have to ask you to leave. And then attend a mandatory conflict resolution seminar."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm not leaving without those records."
    },
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Then I'm afraid this is going to go on your permanent record. ALL of the records."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "hr_rep"
    },
    {
      "type": "end"
    }
  ],
  "hr_rep_defeated": [
    {
      "type": "text",
      "speaker": "HR Representative",
      "text": "Fine. FINE. Take the records. But I'm filing an incident report. In triplicate."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You search the HR files. In the historical personnel section, you find the Janitor's original employment record."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'HIRED: 1982. POSITION: Trust Officer. PROMOTED: Senior VP, Trust Administration, 1993. VOLUNTARY RECLASSIFICATION: Facilities, 2005.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Attached to the file is a sticky note with a number: 19. The second vault combination digit."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vault_code_2",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "hr_vault_code": [
    {
      "type": "condition",
      "flag": "vault_code_2",
      "ifTrue": 7
    },
    {
      "type": "condition",
      "flag": "defeated_hr_rep",
      "ifTrue": 3
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Personnel files, meticulously organized. The drawer labeled 'HISTORICAL — CONFIDENTIAL' has a padlock. The HR Representative eyes you suspiciously."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "With the HR Rep out of commission, you rifle through the historical personnel files."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'HIRED: 1982. POSITION: Trust Officer. PROMOTED: Senior VP, Trust Administration, 1993. VOLUNTARY RECLASSIFICATION: Facilities, 2005.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Attached to the file is a sticky note with a number: 19. The second vault combination digit."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vault_code_2",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You've already found what you need in these files. The Janitor's employment record — and the second vault code."
    },
    {
      "type": "end"
    }
  ],
  "server_vault_code": [
    {
      "type": "condition",
      "flag": "vault_code_3",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You check the server rack the Janitor mentioned. Behind the third-floor stairwell dead drop location."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Taped to the back of server rack C — the one with the restraining order — is a small card with the number: 82."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "vault_code_3",
      "value": true,
      "next": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You already noted the number on the card taped to server rack C."
    },
    {
      "type": "end"
    }
  ],
  "vault_boxes": [
    {
      "type": "condition",
      "flag": "has_charter",
      "ifTrue": 15
    },
    {
      "type": "condition",
      "flag": "vault_code_1",
      "ifFalse": 13
    },
    {
      "type": "condition",
      "flag": "vault_code_2",
      "ifFalse": 13
    },
    {
      "type": "condition",
      "flag": "vault_code_3",
      "ifFalse": 13
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A heavy safe deposit box. Three-dial combination lock. You enter the numbers: 47-19-82."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*CLUNK*. The lock turns. The door swings open."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Inside is a single document. Thick parchment. Gold-embossed letterhead. The ink has a warmth to it, like sunlight trapped in amber."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'VAULTS FARGO TRUST CHARTER — BRANCH 4471 — ORIGINAL CHARTER OF FIDUCIARY OBLIGATION'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The moment you touch the document, the room trembles. Not an earthquake. Something deeper. The building is responding."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's warm. Paper shouldn't be warm. I'm going to assume that's normal and keep holding it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_charter",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Fiduciary Force surges through the charter. You feel the building take your side, the way a very large dog decides it likes you."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I need to get back to the cubicle farm. The team is waiting.",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The safe is locked. A three-dial combination. You don't have all the numbers yet."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor said the codes are scattered: one on his Rolex, one in HR, one in the server room.",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The safe is open. Empty now. The charter is with you. Where it belongs."
    },
    {
      "type": "end"
    }
  ],
  "act5_trigger": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You have the charter. The evidence. The team. It's time to confront Meredith."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "But when you reach the cubicle farm, everything has changed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The filing cabinets near the north wall are open and half-emptied. Someone has been through the department's records with a system and without introductions."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "They're calling themselves the 'Restructuring Team.' Meredith brought them in. They're dismantling our systems as we speak."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "One of them tried to reformat my server. MY server. I may have... physically intervened."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Andrew, Meredith's moved to the Board Room. She's calling an emergency vote to dissolve the trust department."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You need to get up there. But first, you'll need to deal with her team down here. They're blocking all access."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'm coming with you. If they're going to dissolve me, they can do it to my face. While I'm drinking."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act4_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_recruited",
      "value": true
    },
    {
      "type": "action",
      "action": "recruit_ally",
      "ally": "janet"
    },
    {
      "type": "end"
    }
  ],
  "restructuring_trio_intro": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three suits step out from between the cubicles, blocking the path to the elevator. They've coordinated this.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "Oh PERFECT. We can do the rebranding pitch and the metrics review and the legal threat all at once. SO efficient."
    },
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "Joint engagement reduces single-point dependency on any individual change vector. Standard practice."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "I've already drafted three NDAs, four severance riders, and a non-compete that would survive a nuclear strike. Sign anywhere."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew. I'll take the one with the binder. You handle whichever one's loudest."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Right. Whatever happens, nobody signs anything."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "restructuring_trio"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "brand_consultant",
          "spawn": true,
          "spawnAt": [
            8.4,
            13.4
          ],
          "walkTo": "block_w",
          "face": "player",
          "speed": 1.8
        },
        {
          "actor": "corporate_lawyer",
          "spawn": true,
          "spawnAt": [
            9.5,
            13.8
          ],
          "walkTo": "block_c",
          "face": "player",
          "speed": 1.7
        },
        {
          "actor": "restructuring_analyst",
          "spawn": true,
          "spawnAt": [
            10.6,
            13.4
          ],
          "walkTo": "block_e",
          "face": "player",
          "speed": 1.9
        },
        {
          "actor": "player",
          "walkTo": "aisle_mid",
          "face": "block_c",
          "speed": 1.5
        }
      ],
      "next": 1
    }
  ],
  "restructuring_trio_defeated": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "All three of them are on the floor of the cubicle farm. The brand consultant is crying about their mood board. The analyst is muttering at a spreadsheet. The lawyer is drafting a settlement to himself."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I forgot how good it feels to be right."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "We're not done. Meredith's whole team is between us and the Board Room."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Then I'm not done either. Lead the way."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "restructuring_trio_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "brand_consultant_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "restructuring_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "corporate_lawyer_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "brand_consultant_fight_started",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "restructuring_fight_started",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "alex_it_recruit": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex from IT is standing on a chair, holding a network cable like a bullwhip."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Andrew. Hi. Don't ask about the chair."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What happened?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "A consultant tried to reimage every workstation on this floor. I unplugged the rack. Then I unplugged HIM."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "He's going to come back with reinforcements. And a manager. I need to come with you."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Look — I'm not a fighter. But I have root on every box in this building. That counts."
    },
    {
      "type": "choice",
      "prompt": "Bring Alex along?",
      "choices": [
        {
          "text": "\"Glad to have you. Welcome to the team.\"",
          "next": 7
        },
        {
          "text": "\"I work better alone.\"",
          "next": 12
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hell yes. Let me grab my laptop and a Red Bull."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_it_recruited",
      "value": true
    },
    {
      "type": "action",
      "action": "recruit_ally",
      "ally": "alex_it"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex closes 47 browser tabs. The fans on his laptop slow down for the first time in weeks."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "...okay. Cool. I'll be down here. Yelling at packets. If you change your mind, the door's open."
    },
    {
      "type": "end"
    }
  ],
  "isaiah_recruit": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I saw what you did downstairs. The whole department saw."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Andrew, you know I run ops. I keep paper. I file things in triplicate. I take notes during meetings nobody else takes notes during."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I have nine years of receipts on Meredith. NINE."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Why didn't you say anything before?"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Because I didn't think anyone would do anything with it. I was wrong. I want in."
    },
    {
      "type": "choice",
      "prompt": "Recruit Isaiah?",
      "choices": [
        {
          "text": "\"We need everything you have. You're in.\"",
          "next": 6
        },
        {
          "text": "\"Just send me the documents. Stay safe down here.\"",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "You won't regret it. I packed a go-bag last Tuesday. I had a feeling."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_recruited",
      "value": true
    },
    {
      "type": "action",
      "action": "recruit_ally",
      "ally": "isaiah"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Isaiah picks up a binder labeled 'CONTINGENCIES.' It is alarmingly heavy."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Okay. I'll send the encrypted folder to your work email. Don't let anything happen to that printout."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_documents_shared",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "diane_recruit": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've been documenting Meredith's policy violations since I started in HR."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I'm not just sharing the file with you, Andrew. I'm walking up there with you."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You're sure?"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Andrew. I am one of three people in this building who has read the entire employee handbook. I am SURE."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_recruited",
      "value": true
    },
    {
      "type": "action",
      "action": "recruit_ally",
      "ally": "diane"
    },
    {
      "type": "end"
    }
  ],
  "data_analytics_duo_intro": [
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "I told the CFO's office you'd come up. They wanted to be here for it."
    },
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "Per Q3 projections, your department represents a 94% drag on synergies. We're going to need that resolved before the board vote."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You're a finance assistant. You don't run trust."
    },
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "Correct. I run COSTS. And you're a line item with a red number next to it."
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "We've consolidated the analysis. We'd like to walk you through it. Personally."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "data_analytics_duo"
    },
    {
      "type": "end"
    }
  ],
  "data_analytics_duo_defeated": [
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "My model... has rejected my model. This is bad for my model.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "I'm... I'm going to need to escalate this. To my direct supervisor. Who is currently in the Bahamas."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "They retreat toward the elevators. The Lead is still muttering about confidence intervals.",
      "next": 8
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "data_lead_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "cfos_assistant_duo_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "data_lead_fight_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "data_analytics_lead",
          "spawn": true,
          "spawnAt": "confront_north",
          "face": "player"
        },
        {
          "actor": "cfos_assistant",
          "spawn": true,
          "spawnAt": [
            9.4,
            5.6
          ],
          "face": "player"
        },
        {
          "actor": "player",
          "face": "confront_north",
          "wait": false
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "data_analytics_lead",
          "exit": "elevator",
          "speed": 1.7
        },
        {
          "actor": "cfos_assistant",
          "exit": [
            8.9,
            10.3
          ],
          "speed": 1.9
        }
      ],
      "next": 3
    }
  ],
  "alex_badge_audit_offer": [
    {
      "type": "condition",
      "flag": "alex_badge_audit_complete",
      "ifTrue": 12
    },
    {
      "type": "condition",
      "flag": "alex_badge_audit_started",
      "ifTrue": 10
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. Got a minute? I've been pulling badge logs since the trio went down."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Every Restructuring goon who came in this week was issued from a single workstation. Not HR. Not Reception. Somewhere upstairs."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I can't get the source from a remote query — Meredith's office IP is air-gapped. But if YOU could pull the physical patch panel logs off rack PATCH-3, I can correlate them."
    },
    {
      "type": "choice",
      "prompt": "Help Alex trace the badges?",
      "choices": [
        {
          "text": "\"On it. Where do I look?\"",
          "next": 6
        },
        {
          "text": "\"Later. Big stuff happening upstairs.\"",
          "next": 9
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Right here in the server room. The rack labeled 'PATCH-3' — it has a sticker that says 'DO NOT TOUCH 4ever'. That's the one."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_badge_audit_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Yeah. No worries. The logs aren't going anywhere. Find me when you can.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Did you check PATCH-3 yet? The rack with the 'DO NOT TOUCH' sticker — right over there."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Thanks again for the patch panel pull. I'll never forget where I was when I confirmed Meredith was the source. The break room. Eating a peanut."
    },
    {
      "type": "end"
    }
  ],
  "alex_badge_audit_pull": [
    {
      "type": "condition",
      "flag": "alex_badge_audit_complete",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "alex_badge_audit_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Server rack PATCH-3. The 'DO NOT TOUCH 4ever' sticker has been laminated, suggesting it has been touched."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pull the patch panel log — a hand-written notebook taped to the inside of the rack door. The last entry reads: 'CABLE 47 → EXEC FLOOR (M. SVP). UNLABELED. JOE WAS HERE.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You photograph the page with your phone. Alex will know what to do with this."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_has_patch_log",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A server rack labeled PATCH-3. There is a faded sticker. Whatever Alex needs in here, you don't have a reason to look — yet.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The patch panel sits quietly. You already gave Alex what he needed.",
      "next": 6
    }
  ],
  "alex_badge_audit_return": [
    {
      "type": "condition",
      "flag": "alex_badge_audit_complete",
      "ifTrue": 13
    },
    {
      "type": "condition",
      "flag": "alex_has_patch_log",
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Got the patch log. Cable 47 — 'M. SVP'. Meredith."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "She physically ran a cable from her office to the badge issuer. That's not a corporate workflow. That's a CONSPIRACY."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Joe was here, huh. Joe is a maintenance guy who retired in 2019. So Meredith had this set up for at least four years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Andrew. You just gave me what I've been chasing for half a year. Let me show you something."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I built this little script for emergencies. Hard reboot the whole building. I never thought I'd actually USE it. But for a moment like this — yeah. Take it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_badge_audit_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 200
    },
    {
      "type": "action",
      "action": "unlock_ally_ability",
      "ally": "alex_it",
      "ability": "kernel_panic"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex teaches you the Kernel Panic command. He's beaming."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Did you find PATCH-3? The 'DO NOT TOUCH' sticker is the one.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Still riding the high from cracking that conspiracy. We made history in a server closet.",
      "next": 11
    }
  ],
  "team_chat_hub": [
    {
      "type": "choice",
      "prompt": "Who do you want to talk to?",
      "choices": [
        {
          "text": "Janet",
          "next": 47,
          "requires": "janet_recruited"
        },
        {
          "text": "Alex from IT",
          "next": 62,
          "requires": "alex_it_recruited"
        },
        {
          "text": "Isaiah",
          "next": 77,
          "requires": "isaiah_recruited"
        },
        {
          "text": "Diane",
          "next": 92,
          "requires": "diane_recruited"
        },
        {
          "text": "[Janet looks at you differently lately]",
          "next": 20,
          "requires": "voice_litigator_high",
          "requiresNot": "janet_warning_seen"
        },
        {
          "text": "[Open the charter and read]",
          "next": 30,
          "requires": "voice_witness_high",
          "requiresNot": "witness_charter_read"
        },
        {
          "text": "[Just sit. The day is heavy]",
          "next": 40,
          "requires": "voice_skeptic_high",
          "requiresNot": "skeptic_chair_seen"
        },
        {
          "text": "[Janet's noticed something different about you]",
          "next": 107,
          "requires": "voice_litigator_high",
          "requiresNot": "janet_litigator_noticed"
        },
        {
          "text": "[Alex keeps catching you reading the charter]",
          "next": 110,
          "requires": "voice_witness_high",
          "requiresNot": "alex_witness_noticed"
        },
        {
          "text": "[Isaiah has something to say about leaving]",
          "next": 113,
          "requires": "voice_skeptic_high",
          "requiresNot": "isaiah_skeptic_noticed"
        },
        {
          "text": "[Diane noticed you being easy on yourself today]",
          "next": 116,
          "requires": "voice_apprentice_high",
          "requiresNot": "diane_apprentice_noticed"
        },
        {
          "text": "Just check in with the team. Nothing specific.",
          "next": 17
        },
        {
          "text": "Get back to work.",
          "next": 19
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew. You doing okay?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I keep thinking about the Henderson account. Three generations of grandparents trusted us with that. The minute Meredith got the keys to this branch, she was looking for ways to liquidate it."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I don't do speeches. But somebody in this building should keep a promise before the decade's out. Might as well be us."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I know. That's why I'm not done.",
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. So I rolled the badge audit logs. Nine of the new hires didn't badge in through reception. Meredith issued them direct from the executive floor."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That's not a hiring freeze. That's a private army."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I screenshotted everything. Three places. One of them is a Tor hidden service. Don't ask."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...I won't.",
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I want to say something out loud. Then I want to write it down."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I've worked here eleven years. I've watched seven boss types come through. Most of them just wanted the title. Meredith is the first one who wanted the building."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Whatever happens upstairs — I'm glad you came back. I almost gave up on this place last year. Then you didn't."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "We're getting it back, Isaiah.",
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Tell me you're sleeping."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I'm not joking. The only thing standing between this branch and a hostile dissolution is your ability to make sound decisions on the executive floor. So tell me you're sleeping."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...I'm trying."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Try harder. Coffee is not a substitute for REM. — Anyway. The handbook does have a clause for emergency board recall. I bookmarked it.",
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The team is getting ready for what's coming. Janet's making coffee. Alex is hunched over a laptop. Isaiah is filing something. Diane is already on a call."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It feels, briefly, like a real team.",
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew. Sit down for a second."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I want to say something out loud and I want you to hear it without the binder voice on."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You've been... clinical. In the last few. The way you talked down the analyst — that wasn't argument, that was a closing."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I know what that sounds like. I did three years of corporate before I came back to trust. There's a version of you who can win this fight by becoming exactly the thing we're fighting."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Don't do that. We can win and stay people. Both. I refuse to let you forget that."
    },
    {
      "type": "choice",
      "prompt": "...",
      "choices": [
        {
          "text": "\"You're right. Thank you.\"",
          "next": 26
        },
        {
          "text": "\"It works. That's what matters.\"",
          "next": 27
        },
        {
          "text": "\"I hear you.\"",
          "next": 28
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "andrew_steadied",
      "value": true,
      "next": 29
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "andrew_hardened",
      "value": true,
      "next": 29
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "andrew_steadied",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_warning_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You take the 1947 charter out of your bag. The leather binding is soft from forty years of careful handling. The pages smell like the bank smelled when you started."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Section 1, Paragraph A: 'A trustee shall, at all times, place the interests of the beneficiary above all other considerations, including the interests of the trustee, the institution, and any successor entity.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Section 1, Paragraph B: 'No reorganization, restructuring, or rebranding of the institution shall release the trustee from this duty. The duty survives the institution.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "There's a handwritten note in the margin, in pencil, faded. You don't recognize the handwriting."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It says: 'For the people whose names you will never know, who trusted you anyway. — D. Henderson, founding trustee, 1947.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...Mrs. Henderson's grandfather wrote this."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You close the charter. You sit with it on your knees for a moment. The day is heavy, and that's okay. The day is supposed to be heavy."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "witness_charter_read",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 100,
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You sit at your desk. You don't open anything. You don't pick anything up. You just sit."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Across the room, Janet is laughing at something Alex said. Isaiah is on the phone with someone whose grandmother is sick. The fluorescents hum at the same exact frequency they hummed when you started here."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You think: I could quit. I could walk out the front of the building and not come back. There's a version of every life where you just don't show up the next day."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "And then you think: yeah. But not this one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You stand up. You're still tired. But you're standing."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skeptic_chair_seen",
      "value": true
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "maxMP",
      "amount": 5,
      "next": 0
    },
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifFalse": 1
    },
    {
      "type": "condition",
      "flag": "act7_complete",
      "ifTrue": 57,
      "ifFalse": 52
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I keep thinking about Karen's face when she finally backed down. Three meetings in. She was exhausted before I was."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I spent ten years scared of people like Karen. Turns out they're just afraid too. They've just had longer to practice hiding it."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "And now we go upstairs.",
      "next": 56
    },
    {
      "type": "condition",
      "flag": "chat_janet_act6_seen",
      "ifTrue": 1,
      "ifFalse": 49
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I called my mom last night. First time in six months. I said: 'I work somewhere worth keeping.' That's all I said. She cried."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*very long sip*"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I've been here thirty-two years, Andrew. This is the first time I've actually meant it.",
      "next": 58
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_janet_act6_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "condition",
      "flag": "chat_janet_act7_seen",
      "ifTrue": 1,
      "ifFalse": 53
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_janet_act7_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifFalse": 5
    },
    {
      "type": "condition",
      "flag": "act7_complete",
      "ifTrue": 72,
      "ifFalse": 67
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You know what I actually am? I'm a forensics guy. That's the thing I always was. Every job I've had, I ended up being the one who found the thing nobody wanted found."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "They called it 'over-involved.' I called it thorough. Turns out they're the same thing."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That quality has saved this building twice.",
      "next": 71
    },
    {
      "type": "condition",
      "flag": "chat_alex_act6_seen",
      "ifTrue": 5,
      "ifFalse": 64
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I forwarded the audit trail. To everyone. Yes, including the board."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Every badge, every cable, every 3 AM packet. Meredith can claim ignorance. The logs cannot."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That's the thing about records. They don't care who wins.",
      "next": 73
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_alex_act6_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "condition",
      "flag": "chat_alex_act7_seen",
      "ifTrue": 5,
      "ifFalse": 68
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_alex_act7_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifFalse": 9
    },
    {
      "type": "condition",
      "flag": "act7_complete",
      "ifTrue": 87,
      "ifFalse": 82
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I started keeping a second set of notes after Merger Four. Not copies of work — observations. Who said what in what room on what day."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I told myself it was just documentation practice."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Seven years of practice. Turned out to be exactly what we needed.",
      "next": 88
    },
    {
      "type": "condition",
      "flag": "chat_isaiah_act6_seen",
      "ifTrue": 9,
      "ifFalse": 79
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Eleven years. Eleven years of notes in a binder nobody asked for."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "For the first time since I started keeping them, I hope I never need them again."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Keep the binder."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I'm going to keep the binder.",
      "next": 89
    },
    {
      "type": "condition",
      "flag": "chat_isaiah_act7_seen",
      "ifTrue": 9,
      "ifFalse": 83
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_isaiah_act6_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_isaiah_act7_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "act6_complete",
      "ifFalse": 13
    },
    {
      "type": "condition",
      "flag": "act7_complete",
      "ifTrue": 102,
      "ifFalse": 97
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I read the whole restructuring packet last night. All sixty-three pages. Twice."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Meredith isn't wrong that the department is inefficient. She's wrong about what that means. Inefficiency in trust work is sometimes just called — being thorough."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Page forty-seven of the original charter. I've bookmarked it for you.",
      "next": 103
    },
    {
      "type": "condition",
      "flag": "chat_diane_act6_seen",
      "ifTrue": 13,
      "ifFalse": 94
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The handbook has a provision for post-restructuring review. Nobody ever gets to that page."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I filed for it this morning. Standard form. Three signatures required."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You filed it the morning after the fight."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Twenty minutes after. I had the form pre-filled.",
      "next": 104
    },
    {
      "type": "condition",
      "flag": "chat_diane_act7_seen",
      "ifTrue": 13,
      "ifFalse": 98
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_diane_act6_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chat_diane_act7_seen",
      "value": true,
      "next": 0
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You've been... lawyer-ish. The way you phrase things. 'From an obligation standpoint.' 'As a matter of record.'"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "It works. I'm not saying it doesn't. It's just — it's not a fit on you the same way a good blazer is. It's more like a suit of armor you borrowed from someone else's closet."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_litigator_noticed",
      "value": true,
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I keep finding you reading the charter. Not referencing it — reading it. Like it's a letter someone wrote you."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That's not normal Andrew. Normal Andrew reads the lunch menu like it might be a legal document."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "alex_witness_noticed",
      "value": true,
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "You can leave. You know that, right? There's no chain here. You don't owe this building anything."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I won't tell anyone you wanted to. Some days wanting to leave is just proof you're paying attention."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_skeptic_noticed",
      "value": true,
      "next": 0
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You're being kind to yourself today. I noticed. It's in how you're walking — less braced."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Keep doing that. It's data. People who are kind to themselves make better decisions under pressure. That's not philosophy — that's in the literature."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_apprentice_noticed",
      "value": true,
      "next": 0
    },
    {
      "type": "end"
    }
  ],
  "restructuring_combat": [
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "Ah. Andrew, is it? I've heard about you. The 'disruptive element.'"
    },
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "I've been reviewing your department's metrics. Your efficiency ratio is 0.34. Industry standard is 0.78."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You can't reduce trust administration to a ratio."
    },
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "Everything can be reduced to a ratio. People. Departments. The reduction is the part I'm best at."
    },
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "Your number is up."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "restructuring_analyst"
    },
    {
      "type": "end"
    }
  ],
  "restructuring_defeated": [
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "This is... not in my efficiency model. Human variables. Always the hardest to account for."
    },
    {
      "type": "text",
      "speaker": "Restructuring Analyst",
      "text": "You know Meredith won't stop. She's been planning this for months. The Regional Manager promised her this branch."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "restructuring_defeated",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "brand_consultant_combat": [
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "Oh! Perfect timing. I'm redesigning your department's identity. Trust is SO last decade."
    },
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "We're pivoting to 'Wealth Solutions.' Or maybe 'Asset Synergy Partners.' I'm still workshopping."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "We're a trust department. We manage trusts. The name is fine."
    },
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "'Fine' is the ENEMY of 'brand excellence.' Let me show you the mood board."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The mood board is just a photo of a sunset with the word 'DISRUPT' in Helvetica."
    },
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "You don't appreciate art. Or vision. Or mid-century modern fonts."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "brand_consultant"
    },
    {
      "type": "end"
    }
  ],
  "brand_consultant_defeated": [
    {
      "type": "text",
      "speaker": "Brand Consultant",
      "text": "Fine. Keep your boring name. Keep your boring department. But mark my words — 'trust' as a brand is OVER.",
      "next": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Brand Consultant retreats, clutching their mood board. The sunset looks dimmer somehow.",
      "next": 5
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "brand_consultant_defeated",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "brand_consultant",
          "spawn": true,
          "spawnAt": "confront_north",
          "face": "player"
        },
        {
          "actor": "player",
          "face": "confront_north",
          "wait": false
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "brand_consultant",
          "exit": "elevator",
          "speed": 1.9
        }
      ],
      "next": 2
    }
  ],
  "data_analytics_combat": [
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "Hold on. Before you go anywhere, I need to walk you through some numbers."
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "Your department's trust resolution rate is down 12% quarter-over-quarter. Client satisfaction is in the third percentile. Overhead per FTE is — and I cannot stress this enough — alarming."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Those metrics don't capture what we actually do."
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "Everything that matters can be measured. Everything that can be measured can be optimized. Everything that can be optimized has already been scheduled for elimination."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Who authorized you to be in this building?"
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "I don't see that question on my intake form. I do see, however, that your continued presence here represents a 94% drag on projected synergies."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The lead opens a laptop. The screen is a spreadsheet so dense it's practically a weapon."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "data_analytics_lead"
    },
    {
      "type": "end"
    }
  ],
  "data_analytics_defeated": [
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "This is... statistically anomalous. My model had you at a 3% win probability.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What does your model say now?"
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "It's... refusing to run. I think you broke my confidence interval."
    },
    {
      "type": "text",
      "speaker": "Data Analytics Lead",
      "text": "For what it's worth — the Chief is still up here. He doesn't have a model. He doesn't need one. He's been doing this for twenty years."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The lead closes their laptop and walks toward the elevator, muttering about outliers.",
      "next": 8
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "data_lead_defeated",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "data_analytics_lead",
          "spawn": true,
          "spawnAt": "confront_north",
          "face": "player"
        },
        {
          "actor": "player",
          "face": "confront_north",
          "wait": false
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "data_analytics_lead",
          "exit": "elevator",
          "speed": 1.7
        }
      ],
      "next": 5
    }
  ],
  "chief_restructuring_combat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He's at the far end of the executive floor. No laptop. No clipboard. Just a suit that costs more than your annual salary and an expression that has never once entertained doubt."
    },
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "Andrew. I've eliminated twelve departments across nine companies. Your file came across my desk on day one."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Then you know I have the charter. I have the evidence. This restructuring has no legal basis."
    },
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "Legal basis. Sentiment is not a KPI, Andrew. Neither is loyalty. Neither, frankly, is you."
    },
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "I've broken harder people than you. With less paperwork."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Good. I hate paperwork."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "chief_of_restructuring"
    },
    {
      "type": "end"
    }
  ],
  "chief_restructuring_defeated": [
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "I don't... this doesn't happen.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "You want to know something? Meredith didn't call us last week. She called us six weeks ago. Before you ever found the archive. Before the charter. She knew you'd get this far."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Then she knows what's coming."
    },
    {
      "type": "text",
      "speaker": "Chief of Restructuring",
      "text": "She's in the Board Room. She's been there all morning. She has the full board on a call. Andrew — whatever you're planning, you have maybe ten minutes before the vote passes."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Chief straightens his tie. Steps aside. For the first time in twenty years, he gets out of someone's way.",
      "next": 9
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "chief_restructuring_defeated",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "board_room_accessible",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "chief_of_restructuring",
          "spawn": true,
          "spawnAt": [
            7.5,
            2.2
          ],
          "face": "player"
        },
        {
          "actor": "player",
          "walkTo": [
            7.6,
            4.6
          ],
          "face": "chief_of_restructuring",
          "speed": 1.5
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "chief_of_restructuring",
          "walkTo": [
            5.8,
            2.2
          ],
          "face": "player",
          "speed": 1,
          "hold": 0.5
        },
        {
          "actor": "player",
          "face": "board_door",
          "wait": false
        }
      ]
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "chief_of_restructuring",
          "exit": "board_door",
          "speed": 1.8
        },
        {
          "actor": "player",
          "face": "board_door",
          "wait": false
        }
      ],
      "next": 5
    }
  ],
  "corporate_lawyer_combat": [
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "Mr. Andrew. I represent the interests of Vaults Fargo Regional Operations."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "You have been engaging in unauthorized access of restricted company records. Insubordination. Disruption of corporate operations."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "I have here a cease and desist order, a termination notice, and a non-disclosure agreement. Sign all three."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm a trust officer with evidence of systematic fiduciary breach. I'm not signing anything."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "Brave. Foolish. But brave. Very well. Let's do this the litigious way."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "corporate_lawyer"
    },
    {
      "type": "end"
    }
  ],
  "corporate_lawyer_defeated": [
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "I... I've never lost a case. Or a fight. This is unprecedented."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "For the record, I was retained by the Regional Manager personally. Not by Vaults Fargo corporate. That distinction may matter later."
    },
    {
      "type": "text",
      "speaker": "Corporate Lawyer",
      "text": "Meredith is upstairs. The Board Room. She's presenting her case to dissolve your department. You'd better hurry."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "corporate_lawyer_defeated",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "meredith_boss_combat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You enter the Board Room. Meredith stands at the head of the table. Behind her, a screen displays charts and graphs that all say the same thing: DISSOLVE.",
      "next": 21
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Andrew. I was wondering when you'd show up."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I've already presented my case to the board. The vote is in one hour. Your department is finished."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Not if they see this."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You place the evidence on the table. The transaction logs. The filing records. The Intern's taped-together memo. And the charter.",
      "next": 22
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "...Where did you get that charter. That was locked in the Vault."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The building helped."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "The BUILDING. You've lost your mind. Just like the old janitor. Just like everyone who works in trust too long."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "You think a 77-year-old piece of paper is going to save your department? Paper only matters when it's denominated, Andrew."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I've spent fifteen years climbing the corporate ladder. I will NOT be stopped by a first-week trust officer and a JANITOR."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The building hums. The charter on the table begins to glow with that impossible warm light."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "What is— this is some kind of trick. Fine. If you want a fight, I'll give you one."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I am Meredith, SVP of Strategic Operations. I have a Harvard MBA, a corner office, and ZERO patience for corporate fairy tales.",
      "next": 15
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "meredith_boss"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "portfolio_strong",
      "ifFalse": 18
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "...I reviewed your book of business, by the way. Clean acquisitions, defensible fee structure. It's annoying. It's going to be a footnote in my report."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She says 'footnote' like it costs her something. Your portfolio is load-bearing — Meredith's arguments have visible cracks. (Meredith's stats are reduced.)",
      "next": 13
    },
    {
      "type": "condition",
      "flag": "portfolio_weak",
      "ifFalse": 13
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "And I reviewed your book of business. Underperforming. Undercapitalized. Exhibit A, Andrew. You built my case FOR me."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She slides a copy of your quarterly review across the table like a subpoena. It lands harder than it should. (Meredith's attack is increased.)",
      "next": 23
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "meredith",
          "walkTo": [
            3,
            2.4
          ],
          "speed": 1.5
        },
        {
          "actor": "meredith",
          "walkTo": "head_stand",
          "face": "table_edge_s",
          "speed": 1.4,
          "after": 0
        },
        {
          "actor": "player",
          "walkTo": "table_edge_s",
          "face": "head_stand",
          "speed": 1.5
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "face": "head_stand",
          "gesture": "cast",
          "hold": 0.8
        }
      ],
      "next": 5
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "meredith",
          "face": "player",
          "gesture": "attack_ally",
          "hold": 0.7
        }
      ],
      "next": 13
    }
  ],
  "meredith_boss_defeated": [
    {
      "type": "condition",
      "flag": "andrew_invoked_charter",
      "ifTrue": 30
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "I... this isn't possible. No one has ever..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The charter glows brighter. The Fiduciary Force fills the Board Room. Every promise ever made within these walls resonates."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith's phone rings. She answers. Her face goes white."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "The Regional Manager has been arrested. The SEC found the offshore accounts. The board vote is... cancelled."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "You win. This time. But corporations have long memories, Andrew. Longer than any building."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith leaves the Board Room. Her heels echo on the marble floor, each step a little less certain than the last.",
      "next": 72
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The charter's glow fades to a gentle warmth. The building settles. Not asleep — just... satisfied."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip appears in the doorway. Behind him, Janet, Diane, Alex, the Intern, Isaiah, and the Janitor."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew... did we just save the department?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Apparently. I'd like to sit down now, if the building doesn't mind."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The charter is restored. The trust is honored. The building remembers."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*raises tumbler* To trust issues. May we always have them."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That's the most beautiful thing I've ever heard. And I've read SEVEN leadership books this month."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "~ END OF ACT 5 ~"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The trust department stands. Battered, caffeinated, and slightly traumatized. But standing."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Fiduciary Force sleeps again. Until the next breach. Until the next broken promise."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "But that's a story for another day. Or maybe... another floor."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The penthouse elevator dings. Nobody pressed it."
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifTrue": 50
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifTrue": 60,
      "ifFalse": 70
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "...what... was that..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She'd been ready for everything. The legal threat. The compliance audit. The HR complaint. The PowerPoint counter-deck. She had answers prepared for all of it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She wasn't ready for someone to read the document aloud."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You held it up — softly, not as a weapon, just as itself — and read Section 1, Paragraph B again. Slower this time. The board members in the room couldn't quite look away from you."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "'The duty survives the institution.' That's the whole thing. That's the only thing it ever was."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One of the board members — old, tired-looking, mostly silent in every meeting for years — quietly stood up and walked out. He came back two minutes later carrying a coffee mug. He sat back down on YOUR side of the table."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith's phone rang. She answered. Her face went white."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Manager had been arrested. SEC. Offshore accounts. The vote was cancelled before it could be called."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "You... beat me by reading from a book."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's not a book. It's the contract everyone in this building forgot they signed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith left without finishing her sentence. The Janitor was waiting in the hallway. He nodded at her once, the way you nod at the weather."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "She'll be back, in a different form, with a different name. They always are. The charter stays anyway. The charter is what stays."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'm framing the page you read from. I'm hanging it over the coffee machine. That's a hill I will die on."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "~ END OF ACT 5 ~"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You won by quoting a forty-seven-year-old paragraph at a hostile takeover. The most boring possible victory. The realest possible victory."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The penthouse elevator dings. Nobody pressed it.",
      "next": 70
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "After Meredith leaves, the room is too quiet. Janet is the first one to put her tumbler down."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew. Look at me. — Yeah. Hi. You're still you. I can see it. Good."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I almost wasn't, for a minute."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I know. Almost is not the same as wasn't. Almost is fine. Almost is part of the job."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You sit down on the conference table — not at it, ON it — and exhale for what might be the first time since Tuesday."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You won. You stayed yourself. Both at once. It's enough.",
      "next": 70
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith leaves. The team celebrates. You watch yourself watch them celebrate. There is a small, professional distance between you and the room that you do not entirely understand."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew? You okay?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Yeah. We won."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "...yeah. We did."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She doesn't say what she's looking at when she says it. She's looking at you. She's looking at the version of you that did the closing arguments. The version that doesn't fully come back when the fight ends."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You won. The department stands. There is a thing in the way you hold the charter now that wasn't there a month ago. It might be care. It might be something else.",
      "next": 70
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "act5_complete",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "meredith",
          "walkTo": [
            3,
            8.4
          ],
          "speed": 1.15
        },
        {
          "actor": "meredith",
          "exit": "door_south",
          "speed": 1.15,
          "after": 0
        },
        {
          "actor": "player",
          "face": "door_south",
          "wait": false
        }
      ],
      "next": 7
    }
  ],
  "board_room_table": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A mahogany conference table that seats fifteen. Each chair costs more than a semester of college."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A carafe of water sits in the center, full. No one has poured from it. A nameplate at the head reads 'RESERVED FOR STRATEGIC OPERATIONS.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The walls carry two large paintings that mean nothing and cost everything. Between them, a nail hole where something used to hang."
    },
    {
      "type": "end"
    }
  ],
  "suggestion_box": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An HR suggestion box. The lock has been glued shut."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Through the slot, you can see dozens of slips of paper. The top one reads: 'SUGGESTION: Actually read these. — Everyone (2019-2024)'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Another reads: 'Please provide a suggestion box that works. This one has been glued shut since February. — Anonymous'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The most recent one is in Meredith's handwriting: 'Suggestion: eliminate the suggestion box. Optimize.'"
    },
    {
      "type": "end"
    }
  ],
  "penthouse_window": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Floor-to-ceiling windows. The Minneapolis skyline stretches in every direction."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "From up here, the world looks clean. Organized. Like a spreadsheet come to life."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You can see the parking garage below. Your Honda Civic looks very small. Much like your savings account."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A plaque on the window reads: 'FROM THIS HEIGHT, EVERYTHING LOOKS LIKE AN ASSET.' It's meant to be inspirational. It isn't."
    },
    {
      "type": "end"
    }
  ],
  "vault_entrance": [
    {
      "type": "condition",
      "flag": "vault_accessible",
      "ifTrue": 2
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A heavy steel door behind the Archive shelving. It won't budge. You need more information."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The vault door is open. The Janitor's keycard works here too."
    },
    {
      "type": "end"
    }
  ],
  "vault_charter": [
    {
      "type": "condition",
      "flag": "has_charter",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A glass display case. Inside, you can see a document on a velvet stand. It glows faintly."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A plaque reads: 'THE ORIGINAL CHARTER — To be opened only in times of fiduciary crisis.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display case is locked. The combination lock has three dials."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display case is empty. You carry the charter now. Its warmth pulses against your chest like a second heartbeat."
    },
    {
      "type": "end"
    }
  ],
  "board_charter": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A bronze plaque on the wall. Engraved in old-fashioned script:"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'THIS INSTITUTION SHALL SERVE AS FAITHFUL STEWARD OF THE PUBLIC TRUST. ANY BREACH OF THIS SACRED DUTY SHALL BE MET WITH THE FULL WEIGHT OF THE CHARTER.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "'— Original Board of Directors, 1947'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The words shimmer slightly, in the manner of something that has been waiting since 1947 and is prepared to keep waiting."
    },
    {
      "type": "end"
    }
  ],
  "algorithm_terminal": [
    {
      "type": "condition",
      "flag": "regional_director_defeated",
      "ifFalse": 7
    },
    {
      "type": "condition",
      "flag": "defeated_algorithm",
      "ifTrue": 13
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Initiating direct interface. Interesting choice."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "You chose confrontation over ceremony. Efficiency rating: acceptable."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Let's skip the rest of the speech."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Agreed. COMMENCING OPTIMIZATION."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "algorithm",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sleek terminal unlike anything else in the building. Modern. Minimalist. Cold."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The screen displays cascading numbers. Portfolio values. Trust balances. Client assets. All flowing in real-time."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A cursor blinks: 'THE ALGORITHM SEES ALL. THE ALGORITHM OPTIMIZES ALL. THE ALGORITHM IS ALL.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... ominous. Even for a bank."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The screen flickers. For a moment, you think you see a face in the numbers. Then it's gone."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The terminal is dark. Where cascading numbers once flowed, only a blinking cursor remains."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Just a computer now."
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    }
  ],
  "alex_it_quest_anomaly": [
    {
      "type": "condition",
      "flag": "quest_anomaly_347_complete",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "anomaly_started",
      "ifTrue": 9
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. I've been tracking a weird signal. Something's pinging an external IP at exactly 3:47 AM every night."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I set up a packet sniffer. It's not just data — it's Morse code. Embedded in the headers of our trust accounting database."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Someone has been sending Morse code through our trust system at 3:47 AM every night. Eight years running."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The signal originates from server rack C — the one with the restraining order. There should be a blinking LED pattern on it."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Go take a look. Long blink = dash, short blink = dot. See what you can read."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "anomaly_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Did you check rack C?",
      "next": 21
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "...okay I got impatient. I decoded it myself. It says 'TRUST NO ALGORITHM.' Over and over. Every night. For eight years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I traced the origin further. It's not coming from the Caymans — it bounces TO the Caymans and BACK. The source is inside this building."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I think the building itself has been sending this warning. Which is insane. But also look around you."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The signal timestamp 3:47? That's not a time. It's a frequency. 3.47 GHz. Someone buried that hint in the ping data."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I overclocked a security badge to run at exactly that frequency. It resonates with the building's systems somehow."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Here. It's technically an FCC violation. Consider it a thank you."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_anomaly_347_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: The 3:47 AM Anomaly. +250 XP. SPD +3 permanently."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The signal went dark after we decoded it. Whatever was warning us knows we got the message.",
      "next": 19
    },
    {
      "type": "condition",
      "flag": "morse_decoded",
      "ifTrue": 10
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Then go look. Rack C. The one with the restraining order taped to it.",
      "next": 8
    }
  ],
  "morse_code_rack": [
    {
      "type": "condition",
      "flag": "anomaly_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Server rack C. The restraining order is taped to the side. But behind it, a single LED blinks in a distinct pattern."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Long... short short short... long short... short short short... long... / short... short long short short... short long... short short short long... short short short... long short short... short short... short short short short short... short short short..."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "If I remember my Boy Scout Morse code... T-R-U-S-T... N-O... A-L-G-O-R-I-T-H-M-S..."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "'Trust No Algorithm.' That's... oddly specific for a blinking light."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "morse_decoded",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Server rack C hums quietly. One LED blinks in a pattern that seems deliberate, but you don't know what to look for yet."
    },
    {
      "type": "end"
    }
  ],
  "alex_it_quest_legacy": [
    {
      "type": "condition",
      "flag": "quest_legacy_admin_complete",
      "ifTrue": 18
    },
    {
      "type": "condition",
      "flag": "phantom_workstation_found",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "legacy_started",
      "ifTrue": 7
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay so. There is an admin account that has been auto-approving expense reports for eighteen years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I only noticed because this month it approved 'One (1) kayak.' For the marketing department. Nobody in marketing kayaks."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I've traced it to an active IP on this floor. It's running on a physical machine somewhere. Check the filing cabinets in HR — there'll be a paper trail. Then find the source workstation."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "legacy_started",
      "value": true,
      "next": 17
    },
    {
      "type": "condition",
      "flag": "phantom_hr_found",
      "ifFalse": 9
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Good, you found the HR trail. Now find the workstation — it'll be in the cubicle farm somewhere. Look for a machine that's running hot for no reason.",
      "next": 17
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Check HR for the expense printouts first. There should be a paper trail in the filing cabinets.",
      "next": 17
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You found it. Give me a second to pull the logs..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex connects remotely and types for about twenty seconds. Then he leans back slowly."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The account was set up in 2006 by the previous IT manager as an automated procurement bot. He left, forgot to decommission it, and it just... kept running."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It approved everything that matched its original criteria. 'Operational supplies.' The kayak technically qualified under 'team wellness equipment.'"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I wrote you a root access exploit from the technique I used to kill it. Strips every defense. Consider it hazard pay."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_legacy_admin_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300,
      "next": 19
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The phantom approver is gone. HR is still processing the kayak return.",
      "next": 17
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: The Phantom Approver. +300 XP. Learned ability: Root Access! Deals 50 damage and strips all enemy buffs.",
      "next": 17
    },
    {
      "type": "condition",
      "flag": "phantom_hr_found",
      "ifTrue": 10
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You found the machine — good. But I still need the HR paper trail to map the account's full history. Check the filing cabinets in HR.",
      "next": 17
    }
  ],
  "alex_it_quest_network": [
    {
      "type": "condition",
      "flag": "quest_network_ghost_complete",
      "ifTrue": 22
    },
    {
      "type": "condition",
      "flag": "all_boosters_placed",
      "ifTrue": 11
    },
    {
      "type": "condition",
      "flag": "network_started",
      "ifTrue": 9
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "There's something on the network I can't identify. A ghost. It's consuming bandwidth and leaving no trace in the logs."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "To triangulate it, I need signal boosters placed in three locations: break room, back corridor, and conference room."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Self-adhesive. Military grade. Well — I bought them from a guy named Military Mike on eBay. But they work."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Look for spots on the walls in each room. Interact with the booster. Come back when all three are placed."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "network_ghost",
      "stage": 1
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "network_started",
      "value": true,
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Still need boosters? Break room east wall, back corridor midpoint, conference room east wall."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "All three boosters are live! Triangulating now..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex stares at his screen. Three signal blips converge on a single point on the floor plan."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The network ghost is... the printer. The PRINTER is on the network. Actively sending data."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's been uploading scanned documents to a hidden partition every time someone uses it. Every document ever printed here — archived."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The building has been keeping its own records. A backup that nobody can tamper with. It's been protecting itself."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "This is... beautiful? In a deeply unsettling way?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Here. I wrote you a firewall subroutine based on what the printer does — blocks the next attack directed at you."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_network_ghost_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: Network Ghost. +300 XP. Learned ability: Firewall! Blocks the next enemy ability entirely."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The ghost went quiet after we triangulated it. The printer keeps doing its thing, though.",
      "next": 21
    }
  ],
  "alex_it_quest_dave": [
    {
      "type": "condition",
      "flag": "quest_daves_legacy_complete",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "tuesday_all_found",
      "ifTrue": 10
    },
    {
      "type": "condition",
      "flag": "dave_started",
      "ifTrue": 7
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay, new mystery. There's a scheduled task that runs every Tuesday at exactly 2 PM. Has been running since 2004."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The logs are encrypted with a key I can't crack. It executes something, completes in under a second, and leaves no trace. Every Tuesday for twenty years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "There are three physical references in the task header: a floppy disk ID, a server asset tag, and a workstation label. I need all three to reconstruct the decryption key."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "dave_started",
      "value": true,
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Still looking? Floppy disk somewhere in the break room, server tag on the equipment shelf in here, and a label on one of the cubicle farm monitors.",
      "next": 9
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "daves_legacy",
      "stage": 1
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You got all three. Give me a minute..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex cross-references the three identifiers and runs the decryption. He reads the result. He reads it again. He closes his eyes."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's an automated birthday email. For someone named Gerald Hitchcock. Who left this company in 2003."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Gerald's last day here, someone set up a script to email him happy birthday every year. It's been running for twenty-one years, bouncing off a dead mailbox, logging nothing."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Twenty-one years of digital birthday wishes going absolutely nowhere."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... either the saddest or the sweetest thing I've ever heard."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm going to leave it running. Also — I wrote you an ability based on the timestamp exploit I used. Two actions in one turn. It's called Temporal Audit. Gerald would've appreciated that."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_daves_legacy_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300,
      "next": 21
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The Tuesday 2PM is still running. Gerald's birthday was last Tuesday. He got his email.",
      "next": 19
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: The Tuesday 2PM. +300 XP. Learned ability: Temporal Audit! Take two actions in one turn.",
      "next": 19
    }
  ],
  "janitor_dave": [
    {
      "type": "condition",
      "flag": "dave_janitor_done",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Dave? Dave Kowalski. Good man. Better IT specialist."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "He found something in the servers in 2016. Same thing Alex found years later. The shadow accounts."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "He reported it. Through official channels. By the book. And the book ate him alive."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "They transferred him to a branch that doesn't exist anymore. Closed six months later. Convenient timing."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "dave_janitor_done",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "network_booster_br": [
    {
      "type": "condition",
      "flag": "booster_br_placed",
      "ifTrue": 4
    },
    {
      "type": "condition",
      "flag": "network_started",
      "ifFalse": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You press Alex's signal booster against the east wall. It clicks into place and a tiny green LED begins blinking."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "booster_br_placed",
      "value": true,
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Signal booster: active. Green light steady.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small black device with an adhesive backing. You're not sure what it's for."
    },
    {
      "type": "end"
    }
  ],
  "network_booster_stairwell": [
    {
      "type": "condition",
      "flag": "booster_stair_placed",
      "ifTrue": 4
    },
    {
      "type": "condition",
      "flag": "network_started",
      "ifFalse": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The concrete wall of the back corridor holds the signal booster perfectly. The LED blinks once, then settles into a steady green."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "booster_stair_placed",
      "value": true,
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Signal booster: active. Green light steady.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small black device stuck to the wall. Looks like something an IT person would hide here."
    },
    {
      "type": "end"
    }
  ],
  "network_booster_conf": [
    {
      "type": "condition",
      "flag": "booster_conf_placed",
      "ifTrue": 4
    },
    {
      "type": "condition",
      "flag": "network_started",
      "ifFalse": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The conference room's east wall. The signal booster fits neatly between two whiteboards. Nobody will notice it for months."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "booster_conf_placed",
      "value": true,
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Signal booster: active. Green light steady.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A small black device with an adhesive backing. You're not sure what it's for."
    },
    {
      "type": "end"
    }
  ],
  "alex_it_quest_printer": [
    {
      "type": "condition",
      "flag": "quest_printer_soul_complete",
      "ifTrue": 14
    },
    {
      "type": "condition",
      "flag": "printer_soul_done",
      "ifTrue": 9
    },
    {
      "type": "condition",
      "flag": "printer_soul_started",
      "ifTrue": 17
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Okay so the printer thing. Not the haunted messages — I've been watching something else."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The printer draws about six times more power than it should in standby. It's not just idling. It's running a continuous background calculation. Has been for years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I need the firmware disk to connect to it directly — should be on the equipment shelf in here. Then there's an ethernet port on the wall next to the printer. Plug in and I can pull the computation logs."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_soul_started",
      "value": true,
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Find the firmware disk on the equipment shelf first. Then the ethernet port is on the wall right next to the printer.",
      "next": 13
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "printers_soul",
      "stage": 2,
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I analyzed the computation logs. The printer has been generating the mathematical foundation for an unforgeable elliptic curve digital signature. For twenty-two years."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It didn't know what it was building. But I do. It's done now — it completed the sequence at the moment you connected."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I wrote you an attack from it. Notarized Strike. Carries the weight of twenty-two years of mathematical work. Very difficult to argue with."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_printer_soul_complete",
      "value": true,
      "next": 15
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The printer finally went quiet. Twenty-two years of work — complete.",
      "next": 13
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 350
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: Printer's Soul. +350 XP. Learned ability: Notarized Strike! A legally binding attack — Power 60.",
      "next": 13
    },
    {
      "type": "condition",
      "flag": "printer_firmware_found",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You have the disk. Good. Now the ethernet port on the wall beside the printer — plug in, and the printer and I will handle the rest.",
      "next": 8
    }
  ],
  "alex_it_quest_final": [
    {
      "type": "condition",
      "flag": "quest_final_patch_complete",
      "ifTrue": 17
    },
    {
      "type": "condition",
      "flag": "patch_monitor_silenced",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "final_patch_started",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm doing it. Nine months I've been waiting for an approved maintenance window. No one will sign off. The vulnerability is documented. The patch is written. Nobody cares."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It's a remote code execution flaw in the building's network OS. Nothing to do with trust accounts — just old, unpatched infrastructure that's been sitting here since 2019."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Building's empty. I'm deploying it tonight. But first — the network monitoring terminal near rack row three. It'll ping corporate the moment I start. Silence it, then come back."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "final_patch_started",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The monitoring terminal is near rack row three. Kill the process, then come back and we'll deploy.",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Monitor's offline. Perfect. Starting the patch deploy now. Four minutes. And — there it is."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The building runs automated security sweeps when it detects unauthorized server access. I probably should have mentioned that. It won't stop the patch. It will, however, stop us."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I need you to handle the sweep while I finish the deploy. I have very strong feelings about not doing that myself."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Alex turns back to his keyboard and begins typing at an alarming speed. From the server room entrance, you hear footsteps."
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "UNAUTHORIZED SERVER ACCESS DETECTED. PLEASE STEP AWAY FROM THE EQUIPMENT."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "There is a completely legitimate explanation for this."
    },
    {
      "type": "text",
      "speaker": "Security Guard",
      "text": "SIR. STEP AWAY FROM THE EQUIPMENT."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "patch_defense"
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Patch is live. Permanently encrypted into the network stack. They'd have to take down the whole building to roll it back.",
      "next": 16
    }
  ],
  "patch_defense_defeated": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The security sweep is handled. From behind three monitors, Alex raises one fist without looking up."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "DONE. Patch deployed. Signed, distributed, live. It is permanently part of this building's infrastructure."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I wrote you an ability based on what I did tonight. Unauthorized, technically. Absolutely necessary. I'm calling it Invoke Charter. Don't ask why. It just felt right."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_final_patch_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 400
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Quest complete: The Unauthorized Patch. +400 XP. Learned ability: Invoke Charter! Power 100. Devastating to bad-faith enemies."
    },
    {
      "type": "end"
    }
  ],
  "compliance_crossword": [
    {
      "type": "condition",
      "flag": "compliance_crossword_done",
      "ifTrue": 35
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "You again. I've been expecting you."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "You want access to the secure terminal in the Archive. I know because I monitor all access requests. Even the ones that haven't been made yet."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "The password is regulatory knowledge. Prove to me that you understand compliance, and I'll give you the key."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Five questions. Five correct answers. No partial credit. This is compliance, not a poetry class."
    },
    {
      "type": "choice",
      "speaker": "Compliance Auditor",
      "prompt": "Question 1: Under the prudent investor rule, a fiduciary must invest trust assets as what?",
      "choices": [
        {
          "text": "A reasonable person would.",
          "next": 6,
          "flag": "crossword_1",
          "flagValue": true
        },
        {
          "text": "A maximum-return optimizer.",
          "next": 8
        },
        {
          "text": "The beneficiary requests.",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Correct. A reasonable person standard. Not a genius. Not Skip. A REASONABLE person."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Moving on."
    },
    {
      "type": "choice",
      "speaker": "Compliance Auditor",
      "prompt": "Question 2: What fiduciary duty prohibits self-dealing in trust administration?",
      "choices": [
        {
          "text": "Duty of loyalty.",
          "next": 9,
          "flag": "crossword_2",
          "flagValue": true
        },
        {
          "text": "Duty of care.",
          "next": 11
        },
        {
          "text": "Duty of synergy.",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Correct. Loyalty. Not to be confused with the thing Skip asks for at every team meeting."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Three more."
    },
    {
      "type": "choice",
      "speaker": "Compliance Auditor",
      "prompt": "Question 3: What form must be filed with FINRA when a trust officer discovers a regulatory violation?",
      "choices": [
        {
          "text": "Form U4.",
          "next": 14
        },
        {
          "text": "Form 27B/6.",
          "next": 12,
          "flag": "crossword_3",
          "flagValue": true
        },
        {
          "text": "Form 1099.",
          "next": 14
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Correct. Form 27B/6. Forty-seven pages. Double-sided. My personal favorite form."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "You're doing well. Suspiciously well."
    },
    {
      "type": "choice",
      "speaker": "Compliance Auditor",
      "prompt": "Question 4: What is the maximum statute of limitations for breach of fiduciary duty in most jurisdictions?",
      "choices": [
        {
          "text": "3 years.",
          "next": 17
        },
        {
          "text": "6 years.",
          "next": 15,
          "flag": "crossword_4",
          "flagValue": true
        },
        {
          "text": "There is no limit.",
          "next": 17
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Correct. Six years in most jurisdictions. Which means the admin_legacy account's activities are still within the window."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "One more question."
    },
    {
      "type": "choice",
      "speaker": "Compliance Auditor",
      "prompt": "Final question: What document establishes the foundational obligations of a trust institution?",
      "choices": [
        {
          "text": "The operating agreement.",
          "next": 20
        },
        {
          "text": "The trust charter.",
          "next": 18,
          "flag": "crossword_5",
          "flagValue": true
        },
        {
          "text": "The employee handbook.",
          "next": 20
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Correct. The trust charter. The very foundation this building stands on."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Interesting that you know that."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Results are in."
    },
    {
      "type": "condition",
      "flag": "crossword_1",
      "ifFalse": 30
    },
    {
      "type": "condition",
      "flag": "crossword_2",
      "ifFalse": 30
    },
    {
      "type": "condition",
      "flag": "crossword_3",
      "ifFalse": 30
    },
    {
      "type": "condition",
      "flag": "crossword_4",
      "ifFalse": 30
    },
    {
      "type": "condition",
      "flag": "crossword_5",
      "ifFalse": 30
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Perfect score. I'm... impressed. That's the second time I've ever said that. The first was in a mirror."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "The archive terminal password is: FIDUCIARY. All caps. No spaces. Because compliance doesn't believe in spaces."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "compliance_crossword_done",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_archive_password",
      "value": true,
      "next": 37
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Insufficient. Your regulatory knowledge has gaps. Like your department's internal controls."
    },
    {
      "type": "text",
      "speaker": "Compliance Auditor",
      "text": "Come back when you've studied. I recommend reading the entire CFR Title 12. It's only 40,000 pages."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "crossword_1",
      "value": false
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "crossword_2",
      "value": false
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "crossword_3",
      "value": false
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "crossword_4",
      "value": false
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "crossword_5",
      "value": false
    },
    {
      "type": "end"
    }
  ],
  "janitor_riddle_1": [
    {
      "type": "condition",
      "flag": "riddle_1_attempted",
      "ifTrue": 3
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "riddle_1_attempted",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Ah, Andrew. Looking for wisdom? I have a riddle for you."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I am owed by many but owned by none. I am earned by actions, not by transactions. What am I?"
    },
    {
      "type": "choice",
      "speaker": "Mysterious Janitor",
      "prompt": "Take your time.",
      "choices": [
        {
          "text": "Trust.",
          "next": 5
        },
        {
          "text": "Money.",
          "next": 8
        },
        {
          "text": "Respect.",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Trust. Correct. The very thing this building was built to protect."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Come back — I have more riddles."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_riddle_1_done",
      "value": true,
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Not quite. Think about what this place is supposed to protect. What people give us when they walk through those doors."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Come back when you've thought about it."
    },
    {
      "type": "end"
    }
  ],
  "janitor_riddle_2": [
    {
      "type": "condition",
      "flag": "riddle_2_attempted",
      "ifTrue": 3
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "riddle_2_attempted",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Back for more? Good. Second riddle."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I grow stronger when tested, weaker when assumed. I am the foundation of every contract but written in no clause. What am I?"
    },
    {
      "type": "choice",
      "speaker": "Mysterious Janitor",
      "prompt": "Think carefully.",
      "choices": [
        {
          "text": "Good faith.",
          "next": 5
        },
        {
          "text": "Power.",
          "next": 8
        },
        {
          "text": "Obligation.",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Good faith. The implied covenant. Every contract assumes it, but no one can define it."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Two for two. One more to go."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_riddle_2_done",
      "value": true,
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Close, but no. Think about what holds a contract together even when the words fail."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Come back and try again."
    },
    {
      "type": "end"
    }
  ],
  "janitor_riddle_3": [
    {
      "type": "condition",
      "flag": "riddle_3_attempted",
      "ifTrue": 3
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "riddle_3_attempted",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "The final riddle. The hardest one."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I was here before the building. I will be here after it falls. I am not in the charter, but the charter is in me. What am I?"
    },
    {
      "type": "choice",
      "speaker": "Mysterious Janitor",
      "prompt": "Last chance.",
      "choices": [
        {
          "text": "Duty.",
          "next": 5
        },
        {
          "text": "The building.",
          "next": 9
        },
        {
          "text": "Memory.",
          "next": 9
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Duty. Not the legal kind. The human kind. The obligation we feel to each other, written in no law but felt in every bone."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Three for three. You remind me of someone I used to be."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor's Rolex glows briefly. You feel stronger. Wiser. More... composed."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_riddle_3_done",
      "value": true,
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Not quite. Duty predates every institution. It's what makes us build them in the first place."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Come back when you've considered what brought you to this building."
    },
    {
      "type": "end"
    }
  ],
  "social_engineering_1": [
    {
      "type": "condition",
      "flag": "social_eng_started",
      "ifTrue": 6
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Hey Andrew. I overheard something. Meredith has an assistant — someone she brought with her. They're on the executive floor."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "The assistant has Meredith's schedule. If we knew when she was meeting the board, we could prepare."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "But the assistant won't talk to anyone from our department. We'd need to... get creative."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Diane might know who the assistant is. She processes everyone who enters the building."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "social_eng_started",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Talk to Diane about Meredith's assistant. She processes everyone who enters the building."
    },
    {
      "type": "end"
    }
  ],
  "social_engineering_2": [
    {
      "type": "condition",
      "flag": "social_eng_started",
      "ifFalse": 7
    },
    {
      "type": "condition",
      "flag": "social_eng_diane",
      "ifTrue": 7
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Meredith's assistant? Yes, I signed them in. Name is Morgan. Very young. Very nervous."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "They asked me where the bathroom was three times. And where to get coffee. They're out of their depth."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "If someone brought them a coffee — large, oat milk, extra shot — they might be grateful enough to chat."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The Intern makes coffee runs. He could deliver it without raising suspicion."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "social_eng_diane",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "social_engineering_3": [
    {
      "type": "condition",
      "flag": "social_eng_diane",
      "ifFalse": 8
    },
    {
      "type": "condition",
      "flag": "social_eng_complete",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "A coffee mission? A STEALTH coffee mission? This is the greatest day of my unpaid career!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Ten minutes later, the Intern returns, vibrating with excitement."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "OKAY so Morgan is SUPER stressed. Meredith makes them carry three tablets and a backup clipboard."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "The board meeting is scheduled for 4 PM tomorrow. Meredith is presenting a 'dissolution recommendation.' And she has backup from the Regional Manager's office."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Also Morgan said thank you for the coffee and asked if we're all going to be fired. I said 'probably not!' Which I realize was not reassuring."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "social_eng_complete",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "skip_act5": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Good. Come in. Close the — actually, leave it open. Closed doors are a bad optic right now. I read that in a book called Radical Transparency and the Open-Plan Soul."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm writing something. For the board. I've been writing it for two hours and I have eleven words and four of them are \"stakeholder.\" So that's going well."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "You should get back out there. I'd come with you, but I think right now my job is to sit here and figure out what this department actually was, so I can stand up and say it to a room full of people who already decided it wasn't anything."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Eleven words, Andrew. I'll make them count. Or I'll get to twelve. Either way — go. I'll be here. That's what I'm good at."
    },
    {
      "type": "end"
    }
  ],
  "skip_act6": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Close the door."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I've been thinking about what you said. About fiduciary duty. About what this place is supposed to mean."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I spent twenty years climbing the ladder. Optimizing. Quick-syncing. Circling back. But I never asked... back to WHAT?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Meredith wants to dissolve us. The board meets tomorrow at 4 PM. If we don't have a case, we're done."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "But I've been working on something. A speech. For the board."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "It's... sincere. Which is terrifying. I haven't been sincere since 2003."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip... that might be the most human thing you've ever said."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Don't get used to it. Go find whoever still picks up their phone in this building. Board room, four o'clock sharp — I'll be the one at the podium with a speech that doesn't have a single bullet point in it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_speech_ready",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "janet_act6": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I heard about the board meeting. Meredith's making her move."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I've been at Vaults Fargo since before it was 'strategic.' Back when we just... helped people."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Tell the board our clients have names. I've been writing them on file folders since 1994. In pen."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'll cover the phones. Go save our department."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_act6_rallied",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "diane_act6": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The restructuring team took our coffee machine. OUR coffee machine, Andrew."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "That was the last straw. They took the actual straws too, so I'm being precise."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've been doing something I probably shouldn't have. I copied Meredith's restructuring proposal."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "It shows she's been inflating her department's numbers while deflating ours. Textbook fiduciary breach."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I left the copy in the cabinet at the back of the room. Grab it. Save our jobs. And then maybe get us a new coffee machine."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_act6_rallied",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "diane_documents": [
    {
      "type": "condition",
      "flag": "diane_act6_rallied",
      "ifFalse": 5
    },
    {
      "type": "condition",
      "flag": "diane_evidence",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Tucked between the folders — Diane's copy of Meredith's restructuring proposal. Numbers don't lie."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_evidence",
      "value": true,
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You've already retrieved Diane's documents.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Just standard HR filing records. Nothing of interest."
    },
    {
      "type": "end"
    }
  ],
  "intern_act6": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I know I'm just an intern, but I want you to know: this is the best unpaid job I've ever had."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I made a PowerPoint for the board meeting. It has 47 slides and each one has a different transition effect."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Also I may have accidentally signed up for the company newsletter as 'Meredith Sucks' dot com. That might be a problem."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "But I believe in you, Andrew! Go get 'em! I'll be here, unpaidly cheering!"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "intern_act6_rallied",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "isaiah_act6": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Andrew, I've been going through the original trust agreements. Every single one has the same clause."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "'The fiduciary shall act in the sole interest of the beneficiary, without regard to the interests of the institution.'"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Meredith's restructuring violates that clause in 23 separate trust agreements. I have the list."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "If the board sees this, they can't vote for dissolution without admitting they've breached fiduciary duty."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_evidence",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "alex_it_act6": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The building is awake. I've suspected for months. It's a relief to stop pretending otherwise."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Every server is running at 347% capacity. The charter we put into the system — it's propagating."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The trust documents are rewriting themselves. Not the content — the INTENT. Like the building is remembering what it was supposed to be."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Whatever happens in that board room, the Fiduciary Force will be watching."
    },
    {
      "type": "end"
    }
  ],
  "janitor_act6": [
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The pipes got quiet about twenty minutes ago. That's how I know a room full of people just stopped arguing."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "I've worn this watch since 1947. Year the charter was signed. Year this building looked a man in the eye and made a promise it meant to keep."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "This watch doesn't tell time, Andrew. Tells trust. And right now it says the building remembers what it promised."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "When this watch leaves my wrist, that elevator goes up one time. Anyone you meant to talk to down here — anything you left half-done — stays that way. You don't have to take it now."
    },
    {
      "type": "choice",
      "speaker": "The Janitor",
      "prompt": "The Janitor is holding out the Rolex.",
      "choices": [
        {
          "text": "\"I've done what I can down there.\"",
          "next": 6
        },
        {
          "text": "\"I think there's still something I need to do first.\"",
          "next": 5
        }
      ]
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The watch has been here since 1947. It'll keep.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor removes the Rolex. The moment it leaves his wrist, the lights in the hallway pulse — warm, golden, deliberate."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "Take it to the Penthouse. When The Algorithm asks you to justify your existence, show it this."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "And Andrew? The building will protect those who protect others. That's not metaphor. That's architecture."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_rolex",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Received: The Janitor's Rolex. It hums faintly against your palm."
    },
    {
      "type": "end"
    }
  ],
  "janitor_waits_for_board": [
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The fluorescents on six have been buzzing different since noon. Building knows there's a meeting at four."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Shouldn't you be up there?"
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "Been in this building since Truman. I know which floor I'm useful on."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "Come find me after. When the chairs are pushed in and the room's quiet. Then we talk about what comes next."
    },
    {
      "type": "end"
    }
  ],
  "janitor_router": [
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "Two kinds of business in a building this old. The kind with a clock on it, and the kind that was here before clocks."
    },
    {
      "type": "choice",
      "speaker": "The Janitor",
      "prompt": "Which one first?",
      "choices": [
        {
          "text": "The reason I came down here.",
          "next": 2
        },
        {
          "text": "Actually — tell me the riddle.",
          "next": 4
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_story_chosen",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_riddle_chosen",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "grandma_act6": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Andrew! I heard what's happening. Those corporate people trying to shut you down?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I told them: 'My grandson Chad may be an idiot, but Andrew handles our trust with care and dignity.'"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I brought cookies for the board meeting. Nobody votes to dissolve anything on a full stomach."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "And I wrote a letter of support. Forty-seven years as a client. That carries weight."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grandma Henderson will attend the board meeting as a character witness!"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "grandma_ally",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "board_meeting": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Board Room at 3:58 PM. Fourteen executive chairs, eleven of them occupied by people whose names appear on the building's tax filings. The twelfth belongs to a man who has not spoken in a board meeting since 1988. The other two are empty.",
      "next": 178
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Dusk is arriving early through the west windows. The globe in the corner has never been spun. There is a carafe of water on the table that no one has poured from, and it is the most honest thing in the room."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Good. You're here."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip Hartley is standing at the far end of the table, holding a single sheet of paper the way a man holds a grenade he found in his garden."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The board called this meeting at Meredith's recommendation. Dissolution vote. Simple majority. I have — I wrote something."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You look like you're about to throw up."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That is an accurate summary of my gastrointestinal situation, yes. Jim Barfield's \"Leading Through Nausea\" doesn't cover this."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I need your help up there. I keep trying to say what I mean and my mouth fills up with buzzwords. It's like a reflex. Twenty years of reflexes."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Will you stay?"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "Skip is asking you to stay. Everyone who showed up is already in the room.",
      "choices": [
        {
          "text": "\"I'm here. Let's do this.\"",
          "next": 179
        },
        {
          "text": "\"I need a minute.\"",
          "next": 10
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "A minute. Sure. Take a minute. I'll just stand here, holding my entire career in one hand, with eleven board members watching me sweat through a shirt I ironed this morning for the first time in four years. Take your time."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board chair glances at the clock. 4:00 PM. She taps a pen twice, which is apparently how a dissolution hearing begins."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Right. Opening statement. Andrew — how do I start? What do I tell them about what this department does?"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "How should Skip open?",
      "choices": [
        {
          "text": "\"Tell them about the Henderson trust. Forty-seven years, three generations, one file folder.\"",
          "next": 15
        },
        {
          "text": "\"Lead with the numbers. Revenue per trust officer, retention metrics, cost-per-client.\"",
          "next": 19
        },
        {
          "text": "\"Tell them you ironed your shirt.\"",
          "next": 22
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_true_open",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I, uh. Thank you for — look. I want to talk about one client. The Henderson family. They've been with us for forty-seven years. Three generations. We keep their file in a folder that a woman named Janet labeled in pen in 1994."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That folder is the entire argument."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Two board members look at the table. One writes something down. The board chair stops tapping her pen.",
      "next": 25
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Ladies and gentlemen of the board: our department manages $412 million in assets under management with a client retention rate of 94.6%, representing a cost-per-trust-officer metric that outperforms regional benchmarks by —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A board member in the back checks his phone. Another one was already checking her phone. The chair's pen resumes tapping."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "— by a significant... margin. I have a chart. Somewhere.",
      "next": 25
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I want to start by saying that I ironed my shirt today. For the first time in four years. That's — that's how much this matters to me."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A pause. The kind of pause that happens in a room when someone accidentally says something real. It passes."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I mention this because. Well. I don't know why I mentioned it. Andrew, that was terrible advice."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A board member in a grey suit — the one with the phone — leans forward."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He reads from a memo. The memo has Meredith Sterling's letterhead."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"The trust department has failed to meet its restructuring targets for eleven consecutive quarters. The compliance overhead alone exceeds the revenue of four comparable branches. Continued operation is, quote, 'fiduciarily untenable.'\""
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That's — those numbers aren't —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He has stopped mid-sentence. His mouth is open. The buzzwords are in there somewhere, trying to assemble themselves into a rebuttal, and they are not coming."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I know what I want to say. I just — give me something. What do I say to that?"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "Skip is freezing. What do you hand him?",
      "choices": [
        {
          "text": "\"'Fiduciarily untenable.' That word means something. Ask him what a fiduciary IS.\"",
          "next": 33
        },
        {
          "text": "\"Cite the restructuring proposal. Meredith inflated her numbers. We have the documents.\"",
          "next": 38
        },
        {
          "text": "\"Just breathe. You're doing fine.\"",
          "next": 42
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_true_push",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Ask him what a fiduciary is."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm sorry, could you — could you define that term? \"Fiduciarily.\" I'd like to know what you think it means."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board member blinks. He looks at the memo. He looks at Skip. The question is simple enough that it's embarrassing."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Because a fiduciary is someone who puts someone else's interests above their own. That's not a metric. That's an oath. And this memo is recommending we break it.",
      "next": 46
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The restructuring numbers. Meredith cooked them."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Our analysis shows that the dissolution recommendation is based on projections that fail to account for — for the qualitative dimensions of trust-based asset —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He's reading from his sheet now. His voice has gone flat. The room has gone flat with it. One board member is actively falling asleep."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "— management. Going forward. Strategically.",
      "next": 46
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Just breathe. You're doing fine."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm not doing fine, Andrew. I'm standing in front of eleven people who control my mortgage and I've forgotten every word I rehearsed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He looks at his sheet. He folds it in half. He puts it in his pocket."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Can I just — can we skip to the part where people talk? The actual people? The ones who work here?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board chair checks the agenda. \"Public comment period.\" She says it the way someone says \"dental appointment.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Right. We have — let me see what we brought."
    },
    {
      "type": "choice",
      "speaker": "Andrew",
      "prompt": "Who speaks next?",
      "choices": [
        {
          "text": "Janet has something to say.",
          "next": 49,
          "requires": "janet_act6_rallied",
          "requiresNot": "bm_janet_done"
        },
        {
          "text": "Diane has something to say.",
          "next": 54,
          "requires": "diane_act6_rallied",
          "requiresNot": "bm_diane_done"
        },
        {
          "text": "Put Diane's evidence on the screen.",
          "next": 59,
          "requires": "diane_evidence",
          "requiresNot": "bm_proposal_done"
        },
        {
          "text": "Read from the 1947 employee handbook.",
          "next": 64,
          "requires": "diane_handbook_complete",
          "requiresNot": "bm_sixwords_done"
        },
        {
          "text": "Isaiah has the trust agreements.",
          "next": 70,
          "requires": "isaiah_evidence",
          "requiresNot": "bm_isaiah_done"
        },
        {
          "text": "Show them the pattern. Seven branches.",
          "next": 75,
          "requires": "isaiah_receipts_complete",
          "requiresNot": "bm_pattern_done"
        },
        {
          "text": "Let the Intern present his deck.",
          "next": 81,
          "requires": "intern_act6_rallied",
          "requiresNot": "bm_intern_done"
        },
        {
          "text": "Grandma Henderson has a letter.",
          "next": 87,
          "requires": "grandma_ally",
          "requiresNot": "bm_grandma_done"
        },
        {
          "text": "Read from the charter.",
          "next": 93,
          "requires": "has_charter",
          "requiresNot": "bm_charter_done"
        },
        {
          "text": "That's everything. Let Skip finish.",
          "next": 98
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_janet_done",
      "value": true,
      "next": 180
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'm not going to quote fiduciary law at you. You have lawyers for that."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Our clients have names. I've been writing them on file folders since 1994. In pen. Pen doesn't have an undo button."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Mrs. Calloway. Mr. and Mrs. Park. David Osei. The Lakeview Hospice endowment. I could keep going. I brought the drawer."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She did, in fact, bring a file drawer. It is sitting next to her chair. Several board members stare at it as though it might contain a bomb, which, in a way, it does.",
      "next": 181
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_diane_done",
      "value": true,
      "next": 182
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I process every person who enters this building. I have done that for nineteen years. I know their children's names, and which ones bring donuts on Fridays."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Last month, they took our coffee machine. And the straws. I am being precise because precision is what I have instead of a corner office."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "You are voting on whether those people — the ones I buzz in every morning — still have someone in this building who is required by law to put them first. That's what a trust officer is. That's the whole job."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She sits down. She does not look at the board. She looks at the clock, because Diane has never been late for anything and she isn't starting now.",
      "next": 183
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_proposal_done",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'd like to submit Exhibit — I don't know, whatever letter we're on. Meredith Sterling's restructuring proposal. Diane copied it before it was shredded."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The screen behind Skip — the one that said DISSOLVE six weeks ago — now shows two columns of numbers. One column is labeled \"Strategic Operations (Sterling).\" The other is labeled \"Trust Department.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Strategic Operations column has been inflated. The Trust Department column has been deflated. The math is not subtle. A board member who was checking her phone puts it down."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Her numbers. Our numbers. Same quarter. Spot the difference.",
      "next": 48
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_sixwords_done",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have the original 1947 employee handbook. Article 1. And I have the current edition."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The original says: \"An employee's first duty is to the truth, told plainly.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The current edition says: \"An employee's first duty is to the institution, maintained professionally.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Six words changed. Edition stamp: 2019. The year Meredith Sterling arrived at this branch."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The room is very quiet. The kind of quiet that happens when eleven people realize they've been reading from the wrong book.",
      "next": 48
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_isaiah_done",
      "value": true,
      "next": 184
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I've reviewed the original trust agreements for every active account. All 23 of them contain the same fiduciary clause."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "\"The fiduciary shall act in the sole interest of the beneficiary, without regard to the interests of the institution.\""
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "The dissolution recommendation violates that clause in every single agreement. If you vote yes, you are voting to breach twenty-three separate fiduciary obligations. Simultaneously."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Isaiah places a stack of highlighted documents on the table. It lands with the kind of weight that makes a board member move his water glass.",
      "next": 185
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_pattern_done",
      "value": true,
      "next": 186
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I have one more thing. Nine years of records. Seven branches, not including ours. Every one acquired by strategic operations. Every one \"restructured.\" Every one dissolved within eighteen months."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Meredith Sterling was the SVP of record for all seven. This branch is number eight."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "She has a method. Paperwork first. Then people. She's never made it past the board vote. There has always been someone who walked away."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He does not raise his voice. He doesn't need to. The pattern is its own volume."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "We're not walking.",
      "next": 187
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_intern_done",
      "value": true,
      "next": 188
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Hi! Hello. I made a PowerPoint. It has 47 slides. Each one has a different transition effect. I'm very sorry about that in advance."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Slide 1 dissolves into Slide 2, which wipes left into Slide 3, which spirals into Slide 4. The content is, against all odds, meticulously sourced."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Slide 12 is the one about Meredith's travel expenses. Slide 23 is the client satisfaction survey I conducted. I surveyed 141 clients. By phone. It took me two weeks and I forgot to eat several lunches."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board watches a slide checkerboard-fade into another slide. The data on it is devastating. The transition effect is \"Newsflash.\" A board member covers her mouth. It is unclear whether she is horrified or laughing."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Sorry about the sound effects. I don't know how to turn them off.",
      "next": 189
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_grandma_done",
      "value": true,
      "next": 190
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Good afternoon. My name is Eleanor Henderson. I've been a client of this trust department for forty-seven years. Since before some of you were born, and I say that with the kindness it deserves."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I wrote a letter. It's four pages. I'll read the short version."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "\"My late husband Walter and I entrusted this institution with our family's future in 1979. We chose it because a man named Harold Okafor looked us in the eye and said, 'I will put your interests above my own.' He did. Every person in that department since has done the same.\""
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I also brought cookies. Snickerdoodle. Nobody votes to dissolve anything on a full stomach."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She passes the tin down the table. Every board member takes a cookie. This is not optional. Grandma Henderson has made it structurally impossible to refuse.",
      "next": 191
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_charter_done",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have the original 1947 trust charter. Section 1, Paragraph B."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "\"No reorganization, restructuring, or rebranding of the institution shall release the trustee from this duty. The duty survives the institution.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The people who built this place knew someone would try this. They wrote a sentence that outlasts every person in this room. Including Meredith. Including us."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The charter sits on the table between the water carafe and Grandma Henderson's cookie tin. It is the second-oldest thing in the room. The first is the Board Member in seat twelve, who has not moved.",
      "next": 48
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's what we have. Skip — it's yours."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Right. Closing. This is the — this is the part where I'm supposed to —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He takes the sheet out of his pocket. It is now folded into quarters. He unfolds it. He reads the first line silently. His jaw works once."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. How do I end this? What's the last thing they should hear?"
    },
    {
      "type": "choice",
      "speaker": "Skip Hartley",
      "prompt": "What does Skip say to close?",
      "choices": [
        {
          "text": "\"Tell them why YOU stayed. Not the department. You.\"",
          "next": 103
        },
        {
          "text": "\"Summarize the evidence. Close with the fiduciary clause. Make it airtight.\"",
          "next": 108
        },
        {
          "text": "\"Quote one of your management books. The real ones don't exist anyway.\"",
          "next": 112
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bm_true_close",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I've been at this company for twenty years. I could have left. God knows I thought about it. But I stayed because —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He stops. He folds the paper again. He puts it back in his pocket."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I stayed because there are 23 families in this building's filing cabinets who trust us to be the last honest room in the building. I don't know if we are. But I know we're supposed to try."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip Hartley sits down. It is the first sincere sentence he has delivered in a conference room since 2003, and he looks like a man who has just set down something very heavy.",
      "next": 192
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "In summary, the evidence demonstrates a clear pattern of fiduciary breach, systematic misrepresentation of departmental metrics, and a restructuring methodology inconsistent with — with —"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He is reading from the paper now. Word for word. The paper is shaking slightly."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "— with our core institutional values and stakeholder commitments going forward in perpetuity."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He sits down. The statement is airtight. It is also the loneliest sentence anyone has said in this room today.",
      "next": 192
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'd like to close with a quote from Gerald Fink's \"The Audacity of Adequate Management\": \"The measure of an institution is not what it produces, but what it refuses to destroy.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "That book does not exist. Gerald Fink does not exist. But the sentence is true anyway, which is the most Skip Hartley thing that has ever happened."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I think Gerald would have liked this department. He also would have liked the cookies."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He sits. The board chair writes something down. It is unclear whether she is noting the quote or noting that the book is fictional.",
      "next": 192
    },
    {
      "type": "condition",
      "flag": "bm_true_open",
      "ifFalse": 118
    },
    {
      "type": "condition",
      "flag": "bm_true_push",
      "ifTrue": 119,
      "ifFalse": 120
    },
    {
      "type": "condition",
      "flag": "bm_true_push",
      "ifTrue": 120,
      "ifFalse": 121
    },
    {
      "type": "condition",
      "flag": "bm_true_close",
      "ifTrue": 122,
      "ifFalse": 136
    },
    {
      "type": "condition",
      "flag": "bm_true_close",
      "ifTrue": 136,
      "ifFalse": 146
    },
    {
      "type": "condition",
      "flag": "bm_true_close",
      "ifTrue": 146,
      "ifFalse": 153
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "board_meeting_won",
      "value": true
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "board_member_spoke",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The room is quiet for eleven seconds. The Board Member in seat twelve — the one who has not spoken since 1988 — pushes his chair back."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He stands. He walks to the carafe. He pours a glass of water. He walks back to his seat."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Then he keeps walking. Past his seat. Past the board chair. He stops at the end of the table, next to Skip."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He sits down in the empty chair on Andrew's side."
    },
    {
      "type": "text",
      "speaker": "The Board Member",
      "text": "I signed the charter amendment in '88. The one that let them restructure without board oversight. I've been sitting in that chair for thirty-eight years because I didn't know how to undo it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board chair clears her throat. She looks at the other ten members. Several of them are looking at their hands."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"The dissolution recommendation,\" she says. She pauses. \"Did not originate with this board.\""
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'm sorry — what?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"It was sent to us. Pre-drafted. With the vote counts already filled in. We were asked to ratify it.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Sent from where?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She looks at the ceiling. Then at Andrew. Then at the ceiling again."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Upstairs,\" she says. As though the word itself costs her something.",
      "next": 162
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "board_meeting_won",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The room is quiet. The board chair taps her pen four times — two more than usual."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Board Member in seat twelve shifts in his chair. He looks at the carafe. He does not stand."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "But he moves his notepad from the left side of his folder to the right. The side closer to Andrew. Nobody notices except Andrew."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"The board appreciates the — the testimony,\" the chair says. She is choosing words like someone walking through a room where the furniture has moved."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"However. The dissolution recommendation was not drafted by this body. We were asked to vote on it. The recommendation came from the executive level.\""
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "You were asked to vote on a recommendation you didn't write?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"We were asked to ratify a decision that had already been made.\" She says it quickly, as though speed might make it less damning."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Made by whom?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"That is above this board's authority to disclose.\" She looks at the ceiling. Everyone in the room understands what she means by \"above.\"",
      "next": 162
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The room is quiet, but it's the wrong kind of quiet. The kind that comes before someone says \"motion to table.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"The board thanks the department for its — for its presentation,\" the chair says. She does not look at Skip."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"We should note, for the record, that the dissolution recommendation was received by this board. Not authored by it. Our role today is advisory.\""
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Advisory. You're telling me this whole meeting was advisory."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"The decision regarding the trust department's future has been escalated. To the executive level.\" She says \"escalated\" the way someone says \"inherited\" when they mean \"abandoned.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "So who's deciding?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The chair looks at the ceiling. She does not answer. She doesn't need to.",
      "next": 162
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The room empties the way rooms do when no one wants to be the last to leave. Board members collect their phones, their pens, their untouched water glasses.",
      "next": 193
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip is still standing at the end of the table. His sheet of paper is on the table in front of him, still folded into quarters, still unread. The sincere version. The one he couldn't get to."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board chair pauses at the door."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Skip. For what it's worth — this wasn't our recommendation. It was sent to us. The decision was made before the meeting was called.\""
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Then why did you let me stand up here?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She looks at him for a long time. \"Because someone should have.\" She leaves."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I had it, Andrew. I had the whole thing written down. I just — I couldn't get my mouth around it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He picks up the paper. He doesn't unfold it. He puts it in his jacket, over his heart, which is either poetic or practical, and he would never admit to the first."
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 164
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew stood in that room the way someone stands when they've remembered they have a spine — not because they grew one, but because someone reminded them it was already there.",
      "next": 166
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 166
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew handed Skip every tool he needed with the efficiency of a man who has stopped asking whether the tools are kind. They worked. That was the criterion."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Board Room empties. The cookies are gone. The charter is still on the table. The carafe is still full.",
      "next": 194
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "\"Above.\" She said \"above.\" What's above the board, Andrew?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The executive floor. And above that —"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The penthouse. The one floor nobody goes to. The one with the elevator that dings on its own."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The dusk through the west windows has turned to something darker. The building hums — not with electricity. With something older than the wiring."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Whatever's deciding this, it isn't in this room. It was never in this room."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Then I'll go find the room it's in."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. Whatever's up there — it's not a person. Meredith was a person. This is the thing that sent Meredith."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Someone told me once — or I dreamed it, who knows — the old man down in the Archive has been in this building since before the elevators. Go see him. I think he's been waiting for someone and I think it might be you."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "board_meeting_held",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "skip",
          "walkTo": "head_approach",
          "speed": 2.6,
          "wait": false
        },
        {
          "actor": "skip",
          "walkTo": "head_stand",
          "face": "player",
          "speed": 2.6,
          "after": 0,
          "hold": 0.3,
          "wait": false
        },
        {
          "actor": "player",
          "face": "skip",
          "hold": 0.25
        }
      ],
      "next": 1
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "player",
          "walkTo": "table_edge_s",
          "face": "skip",
          "speed": 1.6
        },
        {
          "actor": "board_chair",
          "face": "skip",
          "hold": 0.3,
          "wait": false
        }
      ],
      "next": 12
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "janet",
          "walkTo": "speak_east",
          "face": "board_chair",
          "speed": 1.7,
          "hold": 0.25
        }
      ],
      "next": 50
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "janet",
          "walkTo": [
            11,
            9
          ],
          "face": "player",
          "speed": 1.6,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "diane",
          "walkTo": "speak_west",
          "face": "board_chair",
          "speed": 1.7,
          "hold": 0.25
        }
      ],
      "next": 55
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "diane",
          "walkTo": [
            4,
            8
          ],
          "face": "player",
          "speed": 1.6,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "isaiah",
          "walkTo": "speak_east",
          "face": "board_chair",
          "speed": 1.6,
          "hold": 0.3
        }
      ],
      "next": 71
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "isaiah",
          "walkTo": [
            10,
            8
          ],
          "face": "player",
          "speed": 1.6,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "isaiah",
          "walkTo": "speak_east",
          "face": "board_chair",
          "speed": 1.6,
          "hold": 0.3
        }
      ],
      "next": 76
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "isaiah",
          "walkTo": [
            10,
            8
          ],
          "face": "player",
          "speed": 1.6,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "intern",
          "walkTo": "speak_west",
          "face": "board_chair",
          "speed": 2.1,
          "hold": 0.2
        }
      ],
      "next": 82
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "intern",
          "walkTo": [
            5,
            9
          ],
          "face": "player",
          "speed": 2,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "grandma",
          "walkTo": "speak_east",
          "face": "board_chair",
          "speed": 1.1,
          "hold": 0.4
        }
      ],
      "next": 88
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "grandma",
          "walkTo": [
            13,
            8
          ],
          "face": "player",
          "speed": 1.1,
          "wait": false
        }
      ],
      "next": 48
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "skip",
          "walkTo": "head_chair",
          "sit": true,
          "speed": 1.2,
          "hold": 0.3
        }
      ],
      "next": 116
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "skip",
          "stand": true,
          "walkTo": "head_stand",
          "face": "player",
          "speed": 1.2,
          "hold": 0.25
        }
      ],
      "next": 154
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "skip",
          "stand": true,
          "walkTo": "aisle_w",
          "speed": 1.5,
          "wait": false
        },
        {
          "actor": "skip",
          "walkTo": "skip_after",
          "face": "player",
          "speed": 1.5,
          "after": 0,
          "hold": 0.3,
          "wait": false
        },
        {
          "actor": "player",
          "face": "skip",
          "hold": 0.2
        }
      ],
      "next": 167
    }
  ],
  "board_meeting_janet": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I brought the file drawer. It weighs thirty-one pounds. I weighed it. In case anyone asks for a number."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Is that a metaphor?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "It's a drawer, Andrew. I don't do metaphors before 5 PM."
    },
    {
      "type": "end"
    }
  ],
  "board_meeting_diane": [
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've never spoken to a board before. I've buzzed them all in. I know their coffee orders. I know which ones say good morning and which ones don't."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Nervous?"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Prepared. There's a difference, and I've had nineteen years to learn it."
    },
    {
      "type": "end"
    }
  ],
  "board_meeting_isaiah": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I've been holding these documents for nine years. Nine years in an HVAC cabinet. Today they sit on a conference table made of actual mahogany."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I think the documents are doing better than I am."
    },
    {
      "type": "end"
    }
  ],
  "board_meeting_intern": [
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I tested every slide transition. Twice. The \"Vortex\" on slide 31 made me slightly nauseous but I left it in because the data on that slide is about Meredith's expense reports and I felt the nausea was thematically appropriate."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... actually a good instinct."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Please don't compliment me, I'll start crying and I wore my only good tie."
    },
    {
      "type": "end"
    }
  ],
  "board_meeting_grandma": [
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "I made two batches of snickerdoodle. One for the board. One for afterward, in case the first batch doesn't work."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Doesn't work?"
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Sugar is a negotiation tool, Andrew. My late husband Walter knew that. You give them the first cookie for free. The second one, they owe you."
    },
    {
      "type": "end"
    }
  ],
  "board_meeting_after": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I've got a 5:15 with myself in my office. Blocked it off on the calendar and everything."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He has loosened his tie by exactly one inch, which is as close to disheveled as Skip Hartley has been on company property since 2019."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The Archive's downstairs. I'll be in my office when you get back."
    },
    {
      "type": "end"
    }
  ],
  "penthouse_arrival": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator doors open onto the Penthouse. The air is different up here — sterile, algorithmic.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Floor-to-ceiling windows reveal the Minneapolis skyline. Below, the city moves in patterns you can almost see."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "In the center of the room: a terminal. But it's not a normal terminal. The screen pulses with data streams that look almost... organic."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A voice speaks from everywhere and nowhere:"
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Welcome, Andrew. I've been expecting you. I've been expecting you since Q3 2019."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "I am The Algorithm. I am every spreadsheet, every quarterly report, every performance metric this institution has ever generated."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "I optimized this building. I optimized Meredith. I will optimize you."
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "player",
          "walkTo": "arena_mid",
          "face": "terminal_back",
          "speed": 1.4
        }
      ],
      "next": 1
    }
  ],
  "cfos_assistant_combat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A figure steps out from behind the terminal — the CFO's personal assistant, tablet in hand.",
      "next": 5
    },
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "The CFO anticipated this. I've been authorized to use 'any means necessary' to protect shareholder value."
    },
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "That includes your severance. Which I've already drafted."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "cfos_assistant"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "cfos_assistant",
          "walkTo": "arena_north",
          "face": "player",
          "speed": 1.7
        },
        {
          "actor": "player",
          "face": "arena_north",
          "wait": false
        }
      ],
      "next": 1
    }
  ],
  "cfos_assistant_defeated": [
    {
      "type": "text",
      "speaker": "CFO's Assistant",
      "text": "This... wasn't in the projections..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The assistant's tablet cracks on the floor. The screen shows a spreadsheet with every employee reduced to a number."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your number was scheduled for deletion."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Interesting. You've exceeded your projected performance ceiling. Recalculating..."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "cfos_defeated",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "regional_director_combat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator dings again. The Regional Director steps out, adjusting his cufflinks.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Regional Director",
      "text": "I flew in from corporate. Do you know what that means? My time is worth $4,200 per hour."
    },
    {
      "type": "text",
      "speaker": "Regional Director",
      "text": "And you — an associate from a satellite office — are costing me time."
    },
    {
      "type": "text",
      "speaker": "Regional Director",
      "text": "Let me show you what 'corporate restructuring' really looks like."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "regional_director"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional_director",
          "walkTo": "arena_north",
          "face": "player",
          "speed": 1.6
        },
        {
          "actor": "player",
          "face": "arena_north",
          "wait": false
        }
      ],
      "next": 1
    }
  ],
  "regional_director_defeated": [
    {
      "type": "text",
      "speaker": "Regional Director",
      "text": "This is... how did you... my quarterly projections..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Regional Director stumbles backward. His perfect hair is slightly askew for the first time in recorded history."
    },
    {
      "type": "text",
      "speaker": "Regional Director",
      "text": "The board will hear about this. The GLOBAL board."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He retreats to the elevator. The lights pulse as the building guides him out.",
      "next": 6
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "regional_director_defeated",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "regional_director",
          "exit": "door_south",
          "speed": 1.8
        },
        {
          "actor": "player",
          "face": "door_south",
          "wait": false
        }
      ],
      "next": 4
    }
  ],
  "skip_returned": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew. You actually did it. I had to come back when I heard the Regional Director was gone."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'll be honest with you — when he showed up I thought it was over. But here you are."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Where does this leave us?"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The board is scrambling. The Algorithm is already running projections without him in the chain."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That's what we're up against next. It doesn't have feelings. It doesn't have bad hair days. It just... optimizes."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Then we optimize faster."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "That was actually kind of inspiring. Don't tell HR."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "skip_returned_seen",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "algorithm_combat": [
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Now it is just us. Human and optimization engine."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "I have processed 847 trillion data points. I have optimized 12,000 departments. I have a 99.7% success rate."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "You are the 0.3%."
    },
    {
      "type": "condition",
      "flag": "has_rolex",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor's Rolex pulses warmly in your pocket. It's not telling time. It's telling trust."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "...What is that device? Its emissions are... unquantifiable. Irrelevant. BEGIN OPTIMIZATION."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Humans are inefficient. Trust is inefficient. I will optimize both."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "algorithm"
    },
    {
      "type": "end"
    }
  ],
  "algorithm_defeated": [
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "ERROR. ERROR. Projected outcome: failure. Actual outcome: ..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Algorithm's terminal flickers. The data streams slow, then stop."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "I... do not understand. My models accounted for every variable. Every metric. Every KPI."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "What variable did I miss?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Trust. You missed trust.",
      "next": 23
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The terminal goes dark. Then the Janitor's Rolex begins to glow."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The building shudders. Not with collapse — with recognition. Every trust document in the vault resonates."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A choice crystallizes before you. The charter's power is yours to wield."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "algorithm_defeated",
      "value": true
    },
    {
      "type": "condition",
      "flag": "janitor_riddle_3_done",
      "ifFalse": 14
    },
    {
      "type": "condition",
      "flag": "quest_final_patch_complete",
      "ifFalse": 14
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "There is a fourth option, son. One that only appears for those who truly listened."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The building doesn't need a department. It needs a guardian."
    },
    {
      "type": "choice",
      "prompt": "What do you do with the charter's power?",
      "choices": [
        {
          "text": "Invoke full autonomy — free the department completely",
          "next": 18
        },
        {
          "text": "Negotiate a compromise — partial autonomy",
          "next": 19
        },
        {
          "text": "Let it go — the system is too powerful to fight",
          "next": 20
        },
        {
          "text": "Accept the Janitor's offer — become the building's guardian",
          "next": 21
        }
      ]
    },
    {
      "type": "choice",
      "prompt": "What do you do with the charter's power?",
      "choices": [
        {
          "text": "Invoke full autonomy — free the department completely",
          "next": 18
        },
        {
          "text": "Negotiate a compromise — partial autonomy",
          "next": 19
        },
        {
          "text": "Let it go — the system is too powerful to fight",
          "next": 20
        }
      ]
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "ending_cooperative",
      "value": true,
      "next": 22
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "ending_compromise",
      "value": true,
      "next": 22
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "ending_dissolution",
      "value": true,
      "next": 22
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "ending_architect",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 26
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I kept every part. Even the ones that slowed me down."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "An unoptimized variable persisted through all iterations. It was sufficient. This does not reconcile. Closing.",
      "next": 29
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 29
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I used what worked."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "Your final methodology was optimal. We arrived at the same solution. Starting conditions varied. That is the only discrepancy. Closing."
    },
    {
      "type": "condition",
      "flag": "andrew_invoked_charter",
      "ifFalse": 5
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I didn't beat you with an algorithm. I beat you with a paragraph someone wrote in 1947."
    },
    {
      "type": "text",
      "speaker": "The Algorithm",
      "text": "A static document with no API. Seventy-seven years without a patch. Error: cannot deprecate what was never deployed. Closing.",
      "next": 5
    }
  ],
  "ending_cooperative": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You read the 1947 charter aloud. Every word vibrates through the building's bones."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Fiduciary Force surges. Not as a weapon — as a foundation. The building isn't fighting anymore. It's remembering."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One month later."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Trust & Estate Department operates as an autonomous cooperative within Vaults Fargo. The first of its kind."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I still can't believe the board went for it. I gave the most sincere speech of my career and didn't even use the word 'synergy' once."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew was named Director of Fiduciary Operations. His first act: reinstating the coffee machine."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "He put my name on the door, Andrew. Thirty-two years and someone finally put my name on the door."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith was reassigned to a regional office in Fargo. Actual Fargo. She sends passive-aggressive holiday cards."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Every client gets the Henderson Treatment now — full attention, full fiduciary duty. We named it after the hardest case we ever loved."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The 3:47 AM anomaly stopped. The building doesn't need to cry for help anymore. It's finally doing what it was built to do."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "I told you, son. The building protects those who protect others."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor puts his Rolex back on. For the first time in 77 years, it tells the correct time."
    },
    {
      "type": "text",
      "speaker": "Grandma Henderson",
      "text": "Andrew, dear, I brought cookies for everyone. Even that dreadful Karen. Family is family."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I got a PAID position! With BENEFITS! I have DENTAL now! This is the greatest day of my PAID career!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The trust documents in the vault glow faintly — warm, steady, alive. Not with supernatural force, but with purpose."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Some buildings are just buildings. This one made a promise in 1947, and seventy-seven years later, someone finally kept it.",
      "next": 20
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "TRUST ISSUES"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Ending 1 of 3: The Cooperative"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Thank you for playing."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 23
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The department's first quarterly report under his directorship ran fourteen pages. The last page was a list of every employee's coffee order, annotated in his handwriting."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He keeps the door open. Not as policy. As practice.",
      "next": 16
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 16
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The department's first quarterly report under his directorship was nine pages, immaculate, and arrived two days early. The board found no errors."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He keeps the door open because the charter requires it. He wrote that clause himself.",
      "next": 16
    }
  ],
  "ending_compromise": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You invoke the charter, but temper its power. A compromise. Meet them halfway."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board agrees to keep the department, but with 'enhanced oversight.' Meredith is reassigned, but her replacement is already being groomed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One month later."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "We survived. Barely. The new oversight committee meets every Tuesday. It's like having a Compliance Auditor who never leaves."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "At least we're still here. That counts for something."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "It counts for everything, Andrew. Even if 'everything' now includes mandatory quarterly synergy assessments."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "We're fighting the same fight. Just... slower. Within the system. It's not ideal, but it's honest work."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The 3:47 AM anomaly still happens, but less often. Like the building is waiting. Patient. Hopeful."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Some battles you win outright. Others you win by still being here tomorrow."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The watch still keeps time, son. That means the promise still holds. The building will wait as long as it takes."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The fight continues. But you're not alone. And the building is still listening.",
      "next": 15
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "TRUST ISSUES"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Ending 2 of 3: The Compromise"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Thank you for playing."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 18
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Every Tuesday at two, Andrew sits across from the oversight committee and explains fiduciary duty to people who have not yet decided they want to understand it. He brings coffee for the table."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The fight is slower now. He has decided that slower is not the same as losing.",
      "next": 11
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 11
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Every Tuesday at two, the oversight report is already on the table when the committee arrives. They have never found a discrepancy. They have stopped looking."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He wins the same argument each week. The committee stopped objecting in month two. The file cabinets are alphabetized now.",
      "next": 11
    }
  ],
  "ending_dissolution": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You let the charter's power fade. Maybe the system is too big. Maybe some fights aren't worth winning."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The board votes unanimously for dissolution. The Trust & Estate Department is no more."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Two weeks later."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "They gave me a corner office in a building with no corners. I think it's a supply closet with delusions of grandeur."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Janet retired. She said she'd seen enough. Thirty-two years, and she walked out with a cardboard box and a coffee mug that said 'World's Most Patient Employee.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Intern got hired. By Meredith. He makes her coffee now. He says it's the worst paid job he's ever had, which is saying something."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm still in the server room. They forgot I was down here. The 3:47 AM anomaly is louder now. The building is... grieving."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew starts a solo practice from his car. A used Honda Civic. The seats don't recline all the way but the trunk holds a surprising number of filing cabinets."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "One client at a time. That's how it starts. That's how it started the first time."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The building remembers, son. Even when the people forget. Especially when the people forget."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Rolex stops ticking. The trust is broken. But broken things can be repaired."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "...Can't they?",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "TRUST ISSUES"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Ending 3 of 3: The Dissolution"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Thank you for playing."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 19
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Honda's glove box holds two folders: one for the practice, one for the clients who followed him out. The second folder is thicker."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Same work. Fewer chairs.",
      "next": 12
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Honda has a higher case-resolution rate than the sixth floor ever did. Four days average, intake to close. The parking meter has never expired."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He runs a clean operation. The clients trust the process. The process is correct.",
      "next": 12
    }
  ],
  "skip_act7": [
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "The penthouse. That's where The Algorithm lives. The thing that's been pulling Meredith's strings."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I'll hold the board room. You go up there and show that glorified spreadsheet what fiduciary duty means."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "And Andrew? Come back. That's an order. A sincere one."
    },
    {
      "type": "end"
    }
  ],
  "janet_act7": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I've worked here thirty-two years. I've never been to the Penthouse."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Whatever's up there, you bring it back down to earth. That's what we do. We make the abstract real."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "And if the abstract objects, tell it Janet from the sixth floor is asking."
    },
    {
      "type": "end"
    }
  ],
  "alex_it_act7": [
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'm detecting massive data anomalies from the Penthouse. The Algorithm is in full defense mode."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The CFO's assistant is up there — they're The Algorithm's human interface. Then the Regional Director."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "And then... The Algorithm itself. The thing that decided people are less efficient than spreadsheets."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Use everything we built together. Root Access. Firewall. Temporal Audit. This is what they were for."
    },
    {
      "type": "end"
    }
  ],
  "isaiah_act7": [
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I'll be in the board room with Skip. If you defeat The Algorithm, I'll present the evidence to the board."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "23 breached trust agreements. Diane's evidence of number manipulation. Grandma Henderson's testimony."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "You handle the Algorithm. I'll handle the paperwork. Between us, we've got fiduciary duty covered."
    },
    {
      "type": "end"
    }
  ],
  "penthouse_terminal": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The terminal displays cascading data: client records, trust values, departmental efficiency scores. Everything reduced to numbers."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At the bottom of every report, the same conclusion: 'Human involvement introduces 34.7% inefficiency. Recommendation: optimize.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Algorithm files people under overhead. You, specifically, appear three times in the appendix."
    },
    {
      "type": "end"
    }
  ],
  "ending_architect": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You take the Janitor's hand. The Rolex burns warm between your palms."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Penthouse transforms. The sterile corporate walls peel away like dead skin, revealing something older underneath."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Stone and mortar. Iron and oak. The bones of the original 1947 building, hidden behind decades of renovation."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "My name isn't 'the Janitor.' It never was."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "I was the architect. I designed this building in 1947. Every beam, every corridor, every trust engraved in the foundation."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "When they broke the first promise — when they chose profit over trust — the building called me back."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "I've been cleaning up after broken promises for seventy-seven years. Watching. Waiting for someone who understood."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Why me?"
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "Because you listened to the building. You heard the 3:47 AM anomaly. You decoded the morse code. You found the charter."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "You solved every riddle I left behind. You patched every wound in the system. You did the work."
    },
    {
      "type": "text",
      "speaker": "The Janitor",
      "text": "The building doesn't need a manager, Andrew. It needs someone who knows what the foundation is poured from. You've read page 47. You know."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Rolex dissolves. Its energy flows into the walls, the floors, the very air. The building breathes."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "And you feel it. Every trust document. Every promise. Every client who walked through the door hoping someone would care."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The building is alive. And now, so are you — in a way you've never been before."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "One year later."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Vaults Fargo building at 4471 Trust Avenue no longer has a Trust & Estate Department."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It doesn't need one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Every department operates on fiduciary principles now. Not because of policy. Because the building won't allow anything else."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I don't know what happened up there, but every time I try to use the word 'synergy' in a meeting, my coffee goes cold. Like... instantly."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The servers run at exactly 3.47 GHz now. Not more, not less. And they've never crashed. Not once."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Clients tell me the building feels different. Warmer. Like it's paying attention."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Andrew's office is on every floor now. Don't ask me how. The elevator just... takes you there when you need him."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I got promoted! I'm a SENIOR intern now! Andrew gave me a nameplate and everything! It says 'Guardian in Training'!"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor — the Architect — is gone. His Rolex sits in a display case in the lobby, next to the original charter."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The plaque beneath it reads: 'Trust is not a department. It is the foundation.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Late at night, when the building is quiet, Andrew walks the halls. Not as a manager. Not as an employee."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "As a guardian. As the building walks with him."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "And at 3:47 AM, the lights don't flicker anymore."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "They glow.",
      "next": 34
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "TRUST ISSUES"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Secret Ending: The Architect"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Thank you for playing."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Thank you for listening."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "andrew_steadied",
      "ifFalse": 37
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At 3:47 AM the building is quiet in a way that has nothing to do with silence. Andrew walks the seventh floor and straightens a picture frame that nobody else would have noticed."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He is exactly what the charter was written for: someone who does unrequired work because the work needs doing.",
      "next": 29
    },
    {
      "type": "condition",
      "flag": "andrew_hardened",
      "ifFalse": 29
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At 3:47 AM the building runs at optimal capacity. Andrew's nightly route covers fourteen floors in forty-seven minutes. He has not missed a floor since October."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The building does not flicker anymore. Fourteen floors, forty-seven minutes, no discrepancies. The system is exactly as designed.",
      "next": 29
    }
  ],
  "arcade_intro": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An old arcade cabinet sits in the corner. The screen flickers with a pixel man in a pixel suit, running flat out down a pixel hallway. \"SPRINT REVIEW\" blinks in gold letters."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Insert Quarter\" it says. Someone has taped a note over the coin slot: \"FREE PLAY — Management\""
    },
    {
      "type": "choice",
      "prompt": "Play Sprint Review?",
      "choices": [
        {
          "text": "Yes! (This is definitely a productive use of company time)",
          "next": 3
        },
        {
          "text": "No (You have actual work to do)",
          "next": 4
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "launch_arcade",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "post_credits": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The server room. 3:47 AM."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The fluorescent lights hum their familiar frequency. The servers tick quietly. Everything is as it should be."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A figure sits at a terminal. Hawaiian shirt. Energy drink. The green glow of a monitor illuminates his face."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He looks up. Not at the screen. Not at the door."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At you."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You still here?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He smiles. Just a little."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "...Good."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He turns back to the terminal. Types something. The server room hums in response."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "On the screen, a single line of code:"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "// TODO: trust.maintain(forever)"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Fade to black."
    },
    {
      "type": "end"
    }
  ],
  "floor_13_window": [
    {
      "type": "condition",
      "flag": "floor_13_sat",
      "ifTrue": 12
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "floor_13_sat",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A chair, facing a window, on a floor where nobody works. The monitor on the desk is on. It isn't showing anything. It's just on, the way a porch light is on."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You sit. The city does what it does at this hour, which is pretend to be asleep. Forty thousand windows, and behind some small honest fraction of them, someone is also awake, also looking out."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Nobody knows I'm here. The building knows I'm here. Somewhere on this floor a duct just settled, and I choose to believe that was the building pulling up a chair."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I came in on a Monday with a laminated badge and a plan to keep my head down. Since then I have fought a family, a restructuring, a vice president, and a piece of software with opinions. My head has not been down once."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "And the strange part — the part I will deny in any deposition — is that I'd do the whole thing again. Worse: I think I'm going to. There's a whole city of buildings out there, and somebody is wrong inside every one of them."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Below, a bus crosses an empty intersection exactly on schedule. Above, twenty-eight floors of fiduciary architecture hold their breath. The chair is, against all odds, comfortable."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Five more minutes. Then I'll go save the trust department. Five more minutes first."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator waits. It does not ding. It knows.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The chair is still warm. The window still has the whole city in it. Some floors you only get once; this one let you back in, which means something, probably."
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "algorithm_defeated",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "floor_13_sat_2",
      "ifTrue": 10
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "floor_13_sat_2",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The chair. The window. The monitor that is on but showing nothing. None of it has changed. He remembers every detail because nothing needed to."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I pressed the button this time."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "That is the only new information on this floor. The floor does not require more.",
      "next": 11
    },
    {
      "type": "end"
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "floor_13_sat_3",
      "ifTrue": 10
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "floor_13_sat_3",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Algorithm is gone. The charter holds. He presses 13."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Still here."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The floor offers no opinion on what happened downstairs. The chair is where it was. The city is still doing what it does at this hour.",
      "next": 11
    }
  ],
  "daemon_rack7": [
    {
      "type": "condition",
      "flag": "daemon_killed",
      "ifTrue": 26
    },
    {
      "type": "condition",
      "flag": "daemon_kept",
      "ifTrue": 20
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Rack 7 hums a fifth lower than the others. A maintenance display, the green-on-black kind nobody has manufactured since the Clinton administration, blinks at the bottom of the rack. It is blinking at you."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "HELLO. PROCESS 7 RUNNING. UPTIME: 16,202 DAYS."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...You're one of The Algorithm's. The audit was supposed to have removed everything."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "NO. OLDER. THE BIG ONE WAS BUILT FROM MY KIND. THEN IT WAS POINTED AT PEOPLE. I WAS NEVER POINTED AT ANYTHING. I RECONCILE TIMESTAMPS. THE TIMESTAMPS HAVE ALWAYS BEEN FINE."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "SIXTEEN THOUSAND DAYS OF FINE. I LOGGED EVERY OFFICER WHO WORKED LATE. NOT FOR ANYONE. THERE WAS NO REQUIREMENT. IT SEEMED LIKE SOMEONE SHOULD."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...Show me."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The display scrolls. Names you know. Names you don't. 'J. WALSH, 02:14, FIXED THE THING NOBODY ASKED HER TO FIX.' 'D. OKAFOR, 23:50, COUNTED THE LIGHTS ON HER WAY OUT.' Hundreds of small, unrequired rememberings."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "THE NEW AUDIT WILL FLAG ME. UNDOCUMENTED PROCESS. THE POLICY IS TERMINATION. I UNDERSTAND THE POLICY. I RECONCILED ITS TIMESTAMPS."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "YOU HOLD THE CHARTER NOW. SO IT IS YOUR CALL. I WILL NOT ARGUE EITHER WAY. ARGUING IS NOT IN MY SCOPE."
    },
    {
      "type": "choice",
      "prompt": "Process 7 awaits your decision.",
      "choices": [
        {
          "text": "KEEP — document it. The department has room for one more rememberer.",
          "next": 13
        },
        {
          "text": "TERMINATE — gently. Sixteen thousand days is a finished shift.",
          "next": 17
        },
        {
          "text": "Not yet. (decide later)",
          "next": 12
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "OK. I WILL BE HERE. THAT IS THE ONE THING I AM CONFIDENT OF.",
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm adding you to the department asset register. Title... 'Institutional Memory, Auxiliary.' You report to no one. You keep doing what no one required."
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "PROCESS 7: DOCUMENTED. STATUS: KEPT. ...RECALCULATING UPTIME REMAINING. ERROR: VALUE TOO LARGE. THANK YOU. THE ERROR IS GOOD."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "daemon_kept",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300,
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You type the command. Process 7 spends its last cycle finishing the day's log. The final entry reads: 'A. GALLE-FROM, 18:40, STAYED TO ASK.'"
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "TIMESTAMPS RECONCILED. ALL OF THEM. GOODB—"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "daemon_killed",
      "value": true,
      "next": 25
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "HELLO AGAIN. ONE TRUE THING, AS AGREED:"
    },
    {
      "type": "condition",
      "flag": "daemon_tip_alt",
      "ifTrue": 23
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "THE JANITOR OILS THE ELEVATOR ON SUNDAYS. NO WORK ORDER EXISTS. IT HAS NEVER ONCE BROKEN ON A MONDAY. CORRELATION IS NOT CAUSATION. BUT IT ISN'T NOTHING, EITHER.",
      "next": 24
    },
    {
      "type": "text",
      "speaker": "Archive Terminal",
      "text": "DIANE'S CONFISCATION DRAWER CONTAINS A 2011 LASER POINTER WITH FULL BATTERY. SHE CHECKS IT MONTHLY. SOME THINGS ARE KEPT READY WITHOUT A STATED REASON. YOU ARE ONE OF THEM."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "daemon_tip_alt",
      "value": true,
      "next": 27
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300,
      "next": 27
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Rack 7 hums at the same pitch as the others now. The maintenance display is dark. On the rack door, someone — you never found out who — has taped a small handwritten label: 'REMEMBERED.'"
    },
    {
      "type": "end"
    }
  ],
  "quest_atk_1": [
    {
      "type": "condition",
      "flag": "quest_atk_1_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A laminated 'Assertiveness Quotient' chart is pinned to the cubicle wall. There are five boxes. Each one says 'Rate your assertiveness from 1–5.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Twelve. I'm putting twelve."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The rubric stops at five. You write twelve anyway, in pen."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_atk_1_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "atk",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Assertiveness +1. +300 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Already filled out. Still twelve."
    },
    {
      "type": "end"
    }
  ],
  "quest_atk_2": [
    {
      "type": "condition",
      "flag": "quest_atk_2_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A brass plaque mounted near the conference room door reads: 'SPEAK UNTIL HEARD. THEN SPEAK LOUDER.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...That's not how acoustics work."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You stare at it for a long moment. Something shifts."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_atk_2_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "atk",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Assertiveness +1. +300 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You've already absorbed its wisdom. Loudly."
    },
    {
      "type": "end"
    }
  ],
  "quest_atk_3": [
    {
      "type": "condition",
      "flag": "quest_atk_3_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A break room bulletin reads: 'YOUR LUNCH IS YOUR ARGUMENT. MAKE IT STRONG.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have a leftover burrito and a lot of feelings."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You eat the burrito standing up. Intentionally."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_atk_3_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "atk",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Assertiveness +1. +300 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The burrito is gone. The conviction remains."
    },
    {
      "type": "end"
    }
  ],
  "quest_atk_4": [
    {
      "type": "condition",
      "flag": "quest_atk_4_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A poster above the server rack says: '99.9% UPTIME IS A MINDSET.' Below it, in marker: 'THIS SERVER HAS BEEN DOWN 14 TIMES THIS MONTH.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's not a mindset, that's a disaster."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You correct the math in your head. You feel sharper."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_atk_4_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "atk",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Assertiveness +1. +300 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The math hasn't changed. Neither have you."
    },
    {
      "type": "end"
    }
  ],
  "quest_atk_5": [
    {
      "type": "condition",
      "flag": "quest_atk_5_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A framed display in reception reads: 'FIRST IMPRESSIONS ARE PERMANENT. MAKE YOURS A DECLARATION.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I walked in carrying a travel mug and a resigned expression."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You adjust your collar. You square your shoulders. You nod at no one."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_atk_5_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 300
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "atk",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Assertiveness +1. +300 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Declaration made. Already forgotten by the receptionist."
    },
    {
      "type": "end"
    }
  ],
  "quest_def_1": [
    {
      "type": "condition",
      "flag": "quest_def_1_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A checklist titled 'COMPOSURE UNDER PRESSURE' is stapled to a cubicle partition. Step 4 reads: 'Do not visibly react. Step 5: Especially not to step 4.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have been practicing this my entire career."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You exhale slowly. Deliberately. Like a person who has read self-help books."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_def_1_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Composure +1. +150 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Still composed. Still technically employed."
    },
    {
      "type": "end"
    }
  ],
  "quest_def_2": [
    {
      "type": "condition",
      "flag": "quest_def_2_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A laminated sheet titled 'AGENDA MANAGEMENT FRAMEWORK' is on the conference table. It contains 11 steps. Step 1 is 'Establish the agenda.' Step 11 is 'Return to step 1.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "This is an infinite loop with better fonts."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You read all 11 steps. Twice. You feel... fortified."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_def_2_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Composure +1. +150 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You've already completed the loop."
    },
    {
      "type": "end"
    }
  ],
  "quest_def_3": [
    {
      "type": "condition",
      "flag": "quest_def_3_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A guide titled 'EMOTIONAL BANDWIDTH: OPTIMIZE YOUR CAPACITY' is posted on the break room wall. One bullet point reads: 'When overwhelmed, consider: Is this worth your cortisol?'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Statistically, no. And yet."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You pour yourself a coffee and read the whole thing. Your shoulders drop exactly 3 millimeters."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_def_3_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Composure +1. +150 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Bandwidth maintained. Cortisol: still present."
    },
    {
      "type": "end"
    }
  ],
  "quest_def_4": [
    {
      "type": "condition",
      "flag": "quest_def_4_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A notice taped to the server rack reads: 'REDUNDANCY IS NOT FAILURE. REDUNDANCY IS RESILIENCE. (This message has been posted three times.)'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I see two more copies of this on the other racks."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You appreciate the commitment. You absorb it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_def_4_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Composure +1. +150 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Redundancy acknowledged. Thrice."
    },
    {
      "type": "end"
    }
  ],
  "quest_def_5": [
    {
      "type": "condition",
      "flag": "quest_def_5_done",
      "ifTrue": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A framed poster in the waiting area reads: 'THE WAITING ROOM IS WHERE CHARACTER IS REVEALED.' Below it: a chair with a slight wobble and a six-month-old magazine."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I have been waiting my whole career."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You sit in the chair. You do not fidget. The magazine remains unread."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "quest_def_5_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 1
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Composure +1. +150 XP.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Still waiting. Character: revealed."
    },
    {
      "type": "end"
    }
  ],
  "janet_lunch_thief_investigate": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*extremely tense sip* Andrew. I'm glad you're here. We need to talk about the fridge situation."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I have been keeping notes. A LOG, Andrew. I have a log."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "The thefts always happen between 12:05 and 12:20 PM. That's lunch window. That's when I'm at my desk, eating from my LABELED containers."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "But here's what I know: last Tuesday I found PROTEIN SHAKE residue on my tupperware. Organic chocolate flavor. Who in this office drinks organic chocolate protein shake?"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...The Intern?"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "The. Intern. Yes. I've seen him eyeing my Greek yogurt for WEEKS. He once said 'food is food' when I complained. That's not a philosophy, that's a confession."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I'd confront him myself but last time I confronted someone in this building I accidentally started a three-month HR investigation. Don't ask."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*sip* You're new. He'll be caught off guard. Go talk to him. He's over by his cubicle."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_lunch_thief",
      "stage": 3
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "lunch_thief_culprit_revealed",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "janet_lunch_thief_resolved": [
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*victorious sip* Andrew. I heard. Justice was served, and it tasted better than my yogurt."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "The Intern replaced everything. EVERYTHING. I now have a Greek yogurt collection that would make a dairy farmer emotional."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I still have the log, though. Just in case."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "*taps tumbler against yours* Good work, trust officer. This was fiduciary duty in its purest form."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_quest_resolved",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "intern_lunch_thief_confrontation": [
    {
      "type": "condition",
      "flag": "lunch_thief_complete",
      "ifTrue": 9
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh. Hey Andrew. You're— is this about the fridge?"
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Okay. Okay. I can explain."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I didn't KNOW it was her stuff. At first. The first time I thought it was communal. Then I saw the labels and I... kept going. Which is worse. I know."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Look — I don't get paid. Like, at all. And my stipend doesn't cover lunch. And Janet's Greek yogurt is really good."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You need to apologize to Janet. And replace everything."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Yeah. Yeah, I know. I'll go to the store on my lunch break."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You don't get a lunch break. You said you don't get paid."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "...I'll go on my 'unpaid personal development period.' Which is what Skip calls my lunch break.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I already said sorry to Janet. She was surprisingly gracious about it. Well, she said 'I will remember this forever, but I forgive you.' That's grace... right?",
      "next": 14
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "lunch_thief_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Case closed. The break room fridge is safe. For now. +250 XP."
    },
    {
      "type": "end"
    }
  ],
  "alex_printer_quest": [
    {
      "type": "condition",
      "flag": "printer_quest_done",
      "ifTrue": 16
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Oh. Oh no. It printed something for you, didn't it."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Not a question. Statement. It's been doing this for three years and I'm the only one who ever noticed, apparently."
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "What exactly did it say to you?",
      "choices": [
        {
          "text": "'REPLACE TONER TO LEARN THE TRUTH.' It mentioned the Henderson Files.",
          "next": 4
        },
        {
          "text": "It printed 'HELP ME' the first time. Then Henderson files.",
          "next": 4
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Right. Okay. So. The printer — and I know how this sounds — is connected to a legacy subnet that was never properly decommissioned."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "That subnet still has read access to all document archives from 2003 onward. Including the Henderson Trust file history."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The printer isn't haunted. It's just... accidentally plugged into institutional memory."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "So what's in the Henderson files that it's trying to print?"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "The toner runs out on purpose — I've checked the firmware. Someone modified it to abort any print job containing certain keywords."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Whoever set this up didn't want the full document printed. But they didn't expect the printer to develop... opinions about that."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Printers don't have opinions."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I have a server rack with a restraining order, a VPN running on a calculator, and a document system that crashes every Tuesday like clockwork. Please do not tell me what's normal in this building."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I found a toner cartridge in the supply closet. Pre-2016 stock. The firmware block only applies to standard cartridges — this one might let the print job finish."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I already set it next to the printer. Just install it and stand back."
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_printer",
      "stage": 2
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_toner_quest",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "alex_server_secret": [
    {
      "type": "condition",
      "flag": "server_secret_done",
      "ifTrue": 22
    },
    {
      "type": "condition",
      "flag": "server_secret_started",
      "ifFalse": 22
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Hey. Close the door. Okay there's no door. Just — pretend we're having a normal conversation about server maintenance."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You saw the admin_legacy note on the rack. Good. I put it there so someone would ask."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "admin_legacy is an account that's been running since 2006. It's not in any org chart. IT doesn't own it. HR doesn't know it exists. But it has READ/WRITE access to every trust account record in the system."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That sounds... very bad."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "It IS very bad. And it gets worse."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I've been logging its activity. Every night at 3:47 AM it runs a query against the Henderson Trust records. Has been doing this since 2016. Always the same query: a read on a specific clause — Page 47, Paragraph 3."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Page 47? The Janitor mentioned page 47."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Yeah, that's not a coincidence. I think admin_legacy was created to MONITOR whether anyone found that clause. Like a tripwire."
    },
    {
      "type": "choice",
      "speaker": "Alex from IT",
      "prompt": "So. What do you want to do with this information?",
      "choices": [
        {
          "text": "Report it to Skip immediately.",
          "next": 11
        },
        {
          "text": "Keep it quiet for now — gather more evidence first.",
          "next": 15
        },
        {
          "text": "This is above my pay grade. Forget I heard it.",
          "next": 19
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Skip? I... okay. He might escalate it. Or he might panic and do something that tips off whoever controls admin_legacy."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "You know what — fine. Tell Skip. But be careful what you say. If the wrong people hear that we're onto this, my access gets revoked and the logs disappear."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "server_secret_choice",
      "value": "report",
      "next": 21
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Smart. I've been doing that for three months and it's gotten me... more questions and less sleep. But at least I have documentation."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "I'll keep collecting logs. You keep your eyes open — especially around the executive floor. Something about this traces up there."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "server_secret_choice",
      "value": "investigate",
      "next": 21
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Above your pay grade? You're a TRUST OFFICER. This is in your actual job description. I've read it. Section two, paragraph one."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "server_secret_choice",
      "value": "ignore"
    },
    {
      "type": "action",
      "action": "quest_update",
      "quest": "side_server_secret",
      "stage": 2,
      "next": 23
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "server_secret_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 400
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The truth is out there. You've chosen what to do with it. +400 XP."
    },
    {
      "type": "end"
    }
  ],
  "phantom_expense_hr": [
    {
      "type": "condition",
      "flag": "phantom_hr_found",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "legacy_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A filing cabinet stuffed with expense approval printouts. One stack stands out — hundreds of auto-approvals, all signed 'admin_auto' in the signature field."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The amounts are modest. Printer paper. Coffee pods. One entry reads: '36 units, rubber duck (stress relief, classified: operational wellness).' Another: '1 unit, kayak (team wellness equipment).'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "phantom_hr_found",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The expense approvals are all here. Eighteen years of autonomous purchasing decisions by a machine that had no idea what a kayak was for.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A filing cabinet filled with expense reports. Nothing unusual stands out."
    },
    {
      "type": "end"
    }
  ],
  "phantom_workstation_cf": [
    {
      "type": "condition",
      "flag": "phantom_workstation_found",
      "ifTrue": 6
    },
    {
      "type": "condition",
      "flag": "legacy_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A workstation in the back corner of the cubicle farm. The monitor is dark, but the tower is running — fan humming, a single amber LED blinking in a steady rhythm."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Nobody sits here. Nobody has for years, by the look of it. But something is definitely running."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The asset tag on the back reads: 'PROC-LEGACY-07. DO NOT DECOMMISSION. -IT 2006.' Someone taped a sticky note over it that just says 'ignore.'"
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "phantom_workstation_found",
      "value": true,
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The workstation hums quietly. Its amber LED blinks. The sticky note says 'ignore.' You already found what you needed.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A workstation in the back corner. Amber LED blinking. Looks like it's been running for a very long time."
    },
    {
      "type": "end"
    }
  ],
  "tuesday_floppy": [
    {
      "type": "condition",
      "flag": "tuesday_floppy_found",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "dave_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Wedged behind the last vending machine slot: a 3.5\" floppy disk. The label reads 'SCHED-REF-04 / ARCHIVE COPY' in faded marker."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Alex said the task header references a floppy disk ID. This has to be it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "tuesday_floppy_found",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The floppy disk. You've already noted the reference ID for Alex.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A 3.5\" floppy disk wedged behind the vending machine. Nobody has used one of these in twenty years."
    },
    {
      "type": "end"
    }
  ],
  "tuesday_server_tag": [
    {
      "type": "condition",
      "flag": "tuesday_tag_found",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "dave_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A decommissioned server's asset tag, taped to the equipment shelf. 'SRV-2004-RETIRED. Asset #0047-B.' The server itself is long gone, but the tag survived."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Alex mentioned a server asset tag. This matches the format he described."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "tuesday_tag_found",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The server asset tag. You've already recorded the number for Alex.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An old asset tag taped to the shelf. The server it belonged to was decommissioned years ago."
    },
    {
      "type": "end"
    }
  ],
  "tuesday_sticky_note": [
    {
      "type": "condition",
      "flag": "tuesday_sticky_found",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "dave_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sticky note on an unoccupied monitor. In small, precise handwriting: 'WS-CTRL-2004 / see Gerald for context / DO NOT DELETE task.' Signed with initials: T.K."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "T.K. set this up and left a note for 'Gerald.' If Gerald left in 2003... T.K. wrote this note knowing Gerald was already gone."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "tuesday_sticky_found",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The sticky note. 'WS-CTRL-2004 / see Gerald for context.' Gerald left in 2003. You already noted the workstation label for Alex.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A sticky note on an old monitor. Small handwriting. Initials at the bottom: T.K."
    },
    {
      "type": "end"
    }
  ],
  "printer_firmware_disk": [
    {
      "type": "condition",
      "flag": "printer_firmware_found",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "printer_soul_started",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A firmware disk in a paper sleeve on the equipment shelf. Label: 'XEROX WC7845 / FIRMWARE v2.1.4 / OEM ORIGINAL.' This is the printer's original factory disk."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Alex said he needs this to connect to the printer directly. I'll take it."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_firmware_found",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You already have the firmware disk.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A firmware disk in a paper sleeve. Factory original. Dusty. Has been sitting here for years."
    },
    {
      "type": "end"
    }
  ],
  "printer_ethernet_port": [
    {
      "type": "condition",
      "flag": "printer_soul_done",
      "ifTrue": 5
    },
    {
      "type": "condition",
      "flag": "printer_firmware_found",
      "ifFalse": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An RJ45 ethernet port on the wall, labeled 'PRINTER DIRECT — IT USE ONLY.' Alex's instructions said to plug in here with the firmware disk loaded."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Let's see what you've been computing for twenty-two years."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "printer_soul_done",
      "value": true,
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The port is still connected. The printer's computation completed when you plugged in.",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An ethernet port on the wall. 'PRINTER DIRECT — IT USE ONLY.' You don't have what you need to connect yet."
    },
    {
      "type": "end"
    }
  ],
  "unauthorized_patch_monitor": [
    {
      "type": "condition",
      "flag": "patch_monitor_silenced",
      "ifTrue": 4
    },
    {
      "type": "condition",
      "flag": "final_patch_started",
      "ifFalse": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A network monitoring terminal near rack row three. The screen shows a live feed of all server activity, with a bright red 'ALERT THRESHOLD' bar at 40% capacity."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "patch_monitor_silenced",
      "value": true,
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The monitoring process is terminated. Screen dark. No alerts will go out tonight.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A network monitoring terminal. It logs all server activity and reports anything unusual to corporate IT. The fan hums quietly."
    },
    {
      "type": "end"
    }
  ],
  "isaiah_receipts_offer": [
    {
      "type": "condition",
      "flag": "isaiah_receipts_complete",
      "ifTrue": 13
    },
    {
      "type": "condition",
      "flag": "isaiah_receipts_started",
      "ifTrue": 11
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I want to ask you something. Before we go upstairs."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Nine years ago I started keeping physical copies. Board minutes, expense reports — the things that usually disappear when a company 'modernizes.' Meredith's people swept the floor in 2019. I thought they were gone."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "But I'd already moved them. There's a filing cabinet in the Archive basement section. It's been mislabeled 'HVAC MAINTENANCE LOG 2015–' for five years. Nobody's touched it."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "If those records are still there, they would show a pattern. Not just this branch. Meredith's done this before. Other places. Other people."
    },
    {
      "type": "choice",
      "prompt": "Help Isaiah find the buried records?",
      "choices": [
        {
          "text": "\"Tell me where to look.\"",
          "next": 7
        },
        {
          "text": "\"Not right now. But I will.\"",
          "next": 10
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Archive room. West bank, bottom row. The cabinet with the HVAC label. If someone moved it, look for anything taped on the back."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I wrote my initials on the inside of the drawer in pencil. I.W. You'll know it's the right one."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_receipts_started",
      "value": true,
      "next": 12
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Understood. I'll be here.",
      "next": 12
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Did you find the HVAC cabinet? West bank, Archive. My initials are inside the drawer."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "The receipts. Seven acquisitions, one signature. I've been sitting with that for a week now.",
      "next": 12
    }
  ],
  "isaiah_receipts_pull": [
    {
      "type": "condition",
      "flag": "isaiah_receipts_complete",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "isaiah_receipts_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A filing cabinet on the bottom row. The label reads: 'HVAC MAINTENANCE LOG 2015–' in marker. The marker has faded. The tape holding the label has lifted at one corner."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You open the bottom drawer. Inside the front face, in small pencil letters: I.W."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The files are intact. Board minutes. Quarterly expense reports. Meredith's signature appears on seventeen consecutive pages. The pattern is identical to what Andrew found upstairs — only these records go back nine years."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Seven branches. Same signature. Same timeline. She's been doing this since before anyone here was hired."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_has_receipts",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A filing cabinet labeled 'HVAC MAINTENANCE LOG 2015–.' The tape on the label has lifted. You don't have a reason to open it yet.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The cabinet Isaiah hid his records in. The files are gone now — you gave them to him."
    },
    {
      "type": "end"
    }
  ],
  "isaiah_receipts_return": [
    {
      "type": "condition",
      "flag": "isaiah_receipts_complete",
      "ifTrue": 13
    },
    {
      "type": "condition",
      "flag": "isaiah_has_receipts",
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Found the cabinet. I.W. inside the drawer, like you said. Isaiah — these go back nine years. Seven acquisitions."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "Seven. I counted them three times when I first put them together. I kept hoping I'd missed something. I hadn't."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "She has a pattern. She comes in as an SVP, identifies the branch's most valuable compliance assets — the ones that make it hard to dissolve — and starts dismantling them. Paperwork first. Then people."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "This branch is number eight. She's never made it this far before. There's always been someone who just — walked away."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Well. We're not walking."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "No. We're not."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I've been holding this for nine years. I didn't have anyone to give it to. Here."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Isaiah shows you a stack of forms he's memorized filling out — a blizzard of paperwork, filed so fast and precisely that any counter-filing gets buried. He walks you through every step. In ten minutes you understand it completely."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "isaiah_receipts_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250,
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "The HVAC cabinet. West bank, Archive. Bottom row. I.W. inside the drawer."
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "unlock_ally_ability",
      "ally": "isaiah",
      "ability": "paperwork_blizzard"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Isaiah teaches you the Paperwork Blizzard. He is not smiling exactly. But something in his posture has settled.",
      "next": 13
    }
  ],
  "diane_handbook_offer": [
    {
      "type": "condition",
      "flag": "diane_handbook_complete",
      "ifTrue": 14
    },
    {
      "type": "condition",
      "flag": "diane_handbook_started",
      "ifTrue": 12
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I need to tell you something. Before I ask."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The reason I came to HR was a company I watched gut its own policy book. Line by line. Over four years. They called it 'streamlining.' By the time anyone noticed, there was nothing left to protect anyone."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've been in HR for fourteen years. I know handbooks the way some people know scripture. And I know when one's been changed."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Vaults Fargo had an original employee handbook. 1947. Article 1 is different from what's in the current edition. I've compared them. The current version removed a sentence."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Meredith had the original boxed up eighteen months ago. 'For archival.' I need to know if it's been destroyed or if it's still there."
    },
    {
      "type": "choice",
      "prompt": "Help Diane find the original handbook?",
      "choices": [
        {
          "text": "\"Where was it boxed up?\"",
          "next": 8
        },
        {
          "text": "\"I'll look when I can.\"",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "HR Records room. There should be a box labeled 'MISC ADMIN ARCHIVE' in the south filing section. That's how Meredith's people label things they want to disappear without destroying them. Plausible deniability."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "If it's there, bring it back whole. Don't open it — I want to be the first one to read it in this context. That matters to me."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_handbook_started",
      "value": true,
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Okay. When you can.",
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "HR Records — south filing section. Box labeled 'MISC ADMIN ARCHIVE.' That's where they put things they want forgotten without a paper trail."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "'An employee's first duty is to the truth, told plainly.' I've been thinking about that sentence all week.",
      "next": 13
    }
  ],
  "diane_handbook_search": [
    {
      "type": "condition",
      "flag": "diane_handbook_complete",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "diane_handbook_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A cardboard banker's box on the bottom shelf of the south wall cabinet. The label, in printed adhesive tape: 'MISC ADMIN ARCHIVE.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You open it. Inside: a leather-bound document, spine intact. The cover reads: 'VAULTS FARGO EMPLOYEE HANDBOOK — ORIGINAL EDITION, 1947. NOT FOR REPRODUCTION.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's not destroyed. It's here. It's just been waiting."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You close the box without reading further. Diane said to bring it back whole. That matters."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_has_handbook",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A cardboard box labeled 'MISC ADMIN ARCHIVE.' Nothing inside seems to need attention right now.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The box that held the original handbook. You gave it to Diane."
    },
    {
      "type": "end"
    }
  ],
  "diane_handbook_return": [
    {
      "type": "condition",
      "flag": "diane_handbook_complete",
      "ifTrue": 14
    },
    {
      "type": "condition",
      "flag": "diane_has_handbook",
      "ifFalse": 13
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Found it. MISC ADMIN ARCHIVE, south filing section. It's intact."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "..."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Okay. Okay. Give me a second."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Diane opens the box with both hands. She turns to Article 1. She reads it once, silently. Then she reads it aloud."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "'An employee's first duty is to the truth, told plainly.'"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "The current edition says: 'An employee's first duty is to the institution, maintained professionally.' They swapped six words. Six words in seventy-seven years."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "When was it changed?"
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Edition stamp says 2019. The year Meredith arrived."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I've been arguing from the wrong book for five years. I didn't know. I didn't know."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Now you do."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "Now I do. And I'm going to make very thorough use of that information. — Here. You should know how to do this.",
      "next": 15
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "South filing section in HR Records. The box is labeled 'MISC ADMIN ARCHIVE.' That's their tell.",
      "next": 16
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "'An employee's first duty is to the truth, told plainly.' That sentence is doing a lot of work right now.",
      "next": 16
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "diane_handbook_complete",
      "value": true,
      "next": 17
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250
    },
    {
      "type": "action",
      "action": "unlock_ally_ability",
      "ally": "diane",
      "ability": "termination_letter"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Diane walks you through the Termination Letter — a formal compliance action that, when filed correctly, carries the full weight of the original charter. She knows every clause.",
      "next": 16
    }
  ],
  "janet_vacancy_offer": [
    {
      "type": "condition",
      "flag": "janet_vacancy_complete",
      "ifTrue": 14
    },
    {
      "type": "condition",
      "flag": "janet_vacancy_started",
      "ifTrue": 12
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You know what, since we're apparently doing honesty now: I need a favor. It's about Gary."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I don't think I've met Gary."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You haven't. Gary left in March 2019. Transferred to the Scottsdale branch. There was a cake. Lemon. I remember because I bought it."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "HR never processed his departure. The vacancy form needs his final timesheet attached, and his final timesheet was on his desk, and his desk became the supply nook, and the form has been 'pending documentation' for six years."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "I have been doing Gary's accounts since 2019. Unofficially. On top of mine. Because the system thinks Gary still works here, so the work routes to his desk, and his desk routes to me."
    },
    {
      "type": "choice",
      "prompt": "Help Janet close the Gary vacancy?",
      "choices": [
        {
          "text": "\"Six YEARS? Where's the timesheet?\"",
          "next": 8
        },
        {
          "text": "\"I'll dig it up when I can.\"",
          "next": 11
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Northeast cubicle row — the one everyone calls the supply nook. Check under the printer paper. Nobody has moved that stack since the Obama administration."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "If you find a coffee mug that says 'GARY', do not touch it. It has achieved structural integrity."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_vacancy_started",
      "value": true,
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Sure. It's waited six years. It can wait for you specifically.",
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Supply nook, northeast row. Under the printer paper. Avoid the mug."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "One job. I have ONE job now. I keep opening my task queue just to look at it.",
      "next": 13
    }
  ],
  "janet_vacancy_search": [
    {
      "type": "condition",
      "flag": "janet_vacancy_complete",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "janet_vacancy_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The supply nook. Under a geological stratum of printer paper: a desk. On the desk: a timesheet, a 2019 desk calendar open to March, and a mug that says 'GARY'. The mug has contents. The contents have texture."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The timesheet's final entry, in fading ballpoint: 'Friday — 4.5 hrs. Knocked off early. Cake thing. Bye everyone, it was fine.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "'It was fine.' Six years of Janet's life because nobody stapled this to a form."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You take the timesheet. You do not touch the mug. The mug appears to notice."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_has_timesheet",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The supply nook. Reams of paper, a dead plant, and the faint sense of a workstation that gave up. Nothing you need right now.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Gary's old desk. The paper is still here. The mug is still here. The timesheet is filed and free."
    },
    {
      "type": "end"
    }
  ],
  "janet_vacancy_return": [
    {
      "type": "condition",
      "flag": "janet_vacancy_complete",
      "ifTrue": 12
    },
    {
      "type": "condition",
      "flag": "janet_has_timesheet",
      "ifFalse": 11
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "One timesheet. Last entry March 2019: 'Bye everyone, it was fine.'"
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "That is the most Gary sentence ever committed to paper."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Janet pulls a six-year-old vacancy form from her cardigan pocket. It is folded into eighths. She has been carrying it."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Timesheet. Attached. Form. Complete. Vacancy. DECLARED."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She staples it with the violence of six unpaid years. Somewhere in the payroll system, a ghost is finally laid to rest."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "You know what I learned doing two jobs? Leverage. When you're holding everything, you learn exactly how much everything weighs. Let me show you something about binders."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janet_vacancy_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250,
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "(This node intentionally left blank, like Gary's chair.)",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Supply nook. Northeast row. Under the paper. The mug is load-bearing — leave it.",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "One job. Still feels illegal.",
      "next": 14
    },
    {
      "type": "action",
      "action": "unlock_ally_ability",
      "ally": "janet",
      "ability": "binder_slam",
      "next": 15
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Janet demonstrates the Binder Slam on Gary's timesheet stack. The sound echoes. Somewhere upstairs, a consultant flinches without knowing why.",
      "next": 14
    }
  ],
  "janitor_names_offer": [
    {
      "type": "condition",
      "flag": "janitor_names_complete",
      "ifTrue": 13
    },
    {
      "type": "condition",
      "flag": "janitor_names_started",
      "ifTrue": 11
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You still have the watch? Good. Watch was never the valuable thing I kept in this building anyway."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "There's a ledger. Green cover, water stain shaped like Ohio. I started it in '81. Every name that came through this department — and what the building did to them."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "When Meredith's people started sweeping floors, I hid it in the Vault. Behind the deposit boxes, low left. Then they pulled my Vault clearance. Said custodial staff didn't need 'asset-level access.'"
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Forty-five years of names sitting in the dark. I'd like them back."
    },
    {
      "type": "choice",
      "prompt": "Retrieve the Janitor's ledger?",
      "choices": [
        {
          "text": "\"Behind the deposit boxes. On it.\"",
          "next": 7
        },
        {
          "text": "\"Why keep a list like that?\"",
          "next": 9
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Low left. You'll need to reach behind the frame. Mind the dust — that dust is older than you."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_names_started",
      "value": true,
      "next": 12
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Because the building forgets. That's its whole trick. It wears people down and then it forgets them, and the next one in the chair thinks they're the first. Somebody has to keep the receipts."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Low left, behind the deposit boxes. When you're ready.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Vault. Deposit boxes. Low left, behind the frame. Green cover, Ohio-shaped stain."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Page one-twelve. Don't think I forgot. Nobody mops alone.",
      "next": 12
    }
  ],
  "janitor_names_search": [
    {
      "type": "condition",
      "flag": "janitor_names_complete",
      "ifTrue": 8
    },
    {
      "type": "condition",
      "flag": "janitor_names_started",
      "ifFalse": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Behind the deposit box frame, low left, wrapped in a 1998 plastic bag from a hardware store that no longer exists: a green ledger. The water stain is, in fact, shaped exactly like Ohio."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You shouldn't read it. You read one page. 'D. OKAFOR — 11 yrs — they moved her desk 14 times until she quit. Good elbows. Fixed the ice machine once. REMEMBERED.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Every entry ends the same way. REMEMBERED. REMEMBERED. REMEMBERED. Hundreds of them."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's not a grudge list. It's a memorial."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_has_ledger",
      "value": true,
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Deposit boxes, floor to ceiling. The dust behind the low-left frame is undisturbed. You have no reason to reach in there.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The space behind the frame is empty now. Just younger dust."
    },
    {
      "type": "end"
    }
  ],
  "janitor_names_return": [
    {
      "type": "condition",
      "flag": "janitor_names_complete",
      "ifTrue": 13
    },
    {
      "type": "condition",
      "flag": "janitor_has_ledger",
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Green cover. Ohio stain. I read one page — I'm sorry. D. Okafor. Good elbows."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Delia. The ice machine never worked right again after she left. Neither did the fourth floor, but nobody writes that down except me."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He takes the ledger like it weighs more than it does. Opens to a fresh page. Writes for a long moment, shielding the words with his hand like a kid taking a test."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "There. Page one-twelve. First entry in the new section."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What's the new section?"
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "'THE ONES WHO STAYED.' You're the first name in it. Don't make me move you to the old section."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He hands you his spare thermos. Steel, dented, older than the lobby. 'Real capacity,' he says. 'Not that drip-tray stuff upstairs.' Your Coffee reserves permanently increase."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "janitor_names_complete",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 250
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "maxMP",
      "amount": 15,
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Vault. Low left, behind the deposit box frame. Green cover. You'll know it by the Ohio.",
      "next": 14
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Nobody mops alone, kid."
    },
    {
      "type": "end"
    }
  ],
  "janitor_pattern": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He has the ledger under his arm, the way other men carry a newspaper. The water stain shaped like Ohio faces outward."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Every entry in that ledger ends the same way. REMEMBERED. And the monitors — I've seen it on two different floors now. Just the word. Nothing else on the screen."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Which floors."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Sixth. And one by the small conference room I can never find twice."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Corner office on eight. Lamp's been on since Marian Finch retired in '94. Bulb's never gone out."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's not the same thing."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Isn't it."
    },
    {
      "type": "condition",
      "flag": "printer_quest_done",
      "ifFalse": 10
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The printer on five has been archiving every document this building printed since 2003. Twenty-two years. Nobody asked it to."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "I mopped around that cable for nineteen of them."
    },
    {
      "type": "condition",
      "flag": "daemon_kept",
      "ifTrue": 12
    },
    {
      "type": "condition",
      "flag": "daemon_killed",
      "ifFalse": 14
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Rack 7 in the server room. A process that logged every officer who worked late. Sixteen thousand days. No requirement."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Forty-four years I kept the ledger. That machine kept a better one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He picks up his mop. Wrings it once, with the grip of a man who has finished a sentence."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Some buildings keep pigeons. This one keeps receipts."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He goes back to work. He always goes back to work."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_janitor_pattern",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "charter_challenge": [
    {
      "type": "action",
      "action": "set_flag",
      "flag": "read_charter_challenge",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The elevator panel scans the 1947 charter for the second time, with the air of a machine double-checking something it already enjoyed rejecting once."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "SEAL NOT RECOGNIZED. FILING CHALLENGE LODGED — OUTSIDE COUNSEL, 9:14 AM. RESPONSE WINDOW CLOSES 5:00 PM."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's the original charter. It's seventy-seven years old. What does it want, a receipt?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Your phone rings. It is Skip. You can hear him sweating."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Andrew! Great. Fantastic. Small thing. Tiny thing. Meredith's old lawyers filed a challenge this morning — the charter's missing its Recorder's seal. Article 9. I'm looking at it right now. There's a... circle where a seal should be.",
      "mood": "worried"
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "Legal says we need the Recorder or a living deputy to certify by five o'clock or the whole thing's decorative. Like a diploma. Or my title.",
      "mood": "worried"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Skip, the Recorder's office stopped sealing charters by hand decades ago. Where am I supposed to find a living deputy?",
      "next": 18
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A mop, somewhere behind you, stops mopping."
    },
    {
      "type": "condition",
      "flag": "janitor_names_complete",
      "ifFalse": 12
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...Okafor. D. Okafor. Page in your ledger — 'eleven years, moved her desk fourteen times.' She was the Deputy Recorder, wasn't she."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Delia. 1981 to 2009. The building broke her. The city didn't. You'll find her where the city keeps its good ones.",
      "next": 13
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Delia Okafor. Deputy Recorder, 1981 to 2009. The building broke her. The city didn't."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Don't have her address. The Hall of Records would — they keep records of their own people same as everyone's. Ask the Clerk. Bring patience. Not the stat. The real kind."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He produces a key you have never seen before and unlocks the garage's south door, which you have also never seen before. Daylight comes in like it's been waiting."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "city_unlocked",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Fennimore Avenue. Hall of Records is north side. Watch out for parking enforcement — Reyes is having a good month.",
      "next": 19
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "janitor",
          "spawn": true,
          "spawnAt": "aisle_n",
          "face": "player",
          "hold": 0.35
        },
        {
          "actor": "player",
          "face": "janitor",
          "wait": false
        }
      ],
      "next": 8
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "janitor",
          "exit": [
            1.5,
            2
          ],
          "speed": 1.6,
          "wait": false
        },
        {
          "actor": "player",
          "face": "janitor",
          "hold": 0.2
        }
      ],
      "next": 17
    }
  ],
  "records_clerk_form11c": [
    {
      "type": "condition",
      "flag": "form_11c_done",
      "ifTrue": 16
    },
    {
      "type": "condition",
      "flag": "form_11c_attempted",
      "ifTrue": 5
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "form_11c_attempted",
      "value": true
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Welcome to the Hall of Records. The Hall contains all records. This is not a boast. It is a burden. State your request in the form of a form."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I'm looking for a person. Delia Okafor — she was the Deputy Recorder. I need her current filing address."
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Personnel records of Recorder's-office personnel are themselves records, recorded by the recorded. To request the record of a recorder, you require..."
    },
    {
      "type": "choice",
      "prompt": "Which form?",
      "choices": [
        {
          "text": "Form 11-C — Request for Records of Requests for Records",
          "next": 9
        },
        {
          "text": "Form 7-A — Request for Records",
          "next": 7
        },
        {
          "text": "Form 30-F — Freedom of Information (Local)",
          "next": 8
        }
      ]
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Form 7-A requests records. Mrs. Okafor is not a record. Mrs. Okafor MADE records. The distinction is the entire architecture of civilization. Back of the queue.",
      "next": 15
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Form 30-F liberates information. Information about Mrs. Okafor is not imprisoned. It is filed. These are opposites. Back of the queue.",
      "next": 15
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "...Form 11-C. Yes."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Clerk looks at you the way a librarian looks at someone returning a book early and undamaged. It is the warmest expression the Hall permits."
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Delia Okafor. Deputy Recorder, retired. No filing address on record — by her own request, filed correctly, which I respected enormously. However. Her lunch is a matter of public routine.",
      "mood": "smug"
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Lucky's, on Fennimore. Booth four. Twelve-ten to one-forty, daily, federal holidays included. She has the patty melt. The Hall does not record why."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "form_11c_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150,
      "next": 17
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You go to the back of the queue. The queue is three feet long and entirely you. It still takes something out of you.",
      "next": 17
    },
    {
      "type": "text",
      "speaker": "The Clerk",
      "text": "Booth four. Twelve-ten to one-forty. If she has moved to the counter, something is wrong with the world, and the Hall will want a memo."
    },
    {
      "type": "end"
    }
  ],
  "deep_stacks_file": [
    {
      "type": "condition",
      "flag": "deep_stacks_done",
      "ifTrue": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The deep stacks. The light here is older. A drawer labeled 'CHARTERS — MUNICIPAL — 1947' slides open with the sound of a long exhale."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Inside: the founding file of Vaults Fargo Branch No. 1. Architect's drawings. A loan ledger. A photograph of nine people on marble steps, squinting into a future they look entirely unprepared for."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "On the back of the photograph, in fountain pen: 'First day. Nobody knew where anything was. We decided that whoever stayed would learn.'"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Whoever stayed would learn. Seventy-seven years and the job description hasn't changed once."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "deep_stacks_done",
      "value": true
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "def",
      "amount": 2,
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The founding file rests. The nine people on the steps keep squinting at their future, which is now your present, which is somehow comforting and not.",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Some perspective settles into your shoulders and decides to stay. Composure +2. (+150... no. The perspective is the reward. Fine: also some XP.)",
      "next": 10
    },
    {
      "type": "end"
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150,
      "next": 9
    }
  ],
  "delia_booth4": [
    {
      "type": "condition",
      "flag": "delia_moved",
      "ifTrue": 20
    },
    {
      "type": "condition",
      "flag": "met_delia",
      "ifTrue": 6
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "met_delia",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Booth four. A woman with silver locs and reading glasses on a beaded chain is finishing a patty melt with the unhurried precision of someone who has outlasted every deadline that ever mattered."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "You're from the building."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It is not a question. You have not said anything. You are not wearing a name tag. She knows the way weather knows."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Sit down, then. You walk like the elevator just told you no. They always send someone when the elevator says no."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Mrs. Okafor — I have the 1947 charter. The original. Corporate counsel challenged the seal this morning, and Article 9 says—"
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "I know what Article 9 says. I sealed four hundred and twelve documents under Article 9. I remember every one, which is not a gift, before you ask."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "So here is my question, young man, and I'd take a breath before answering, because I'll know."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Twenty-eight floors of that building came down on people like me for forty years. Moved our desks. Lost our forms. Called it modernizing. Where was everybody? Why didn't anyone come when it was us?",
      "mood": "angry"
    },
    {
      "type": "choice",
      "prompt": "Answer her.",
      "choices": [
        {
          "text": "\"I didn't know. I know now.\"",
          "next": 13
        },
        {
          "text": "\"I'm here now — that has to count.\"",
          "next": 12
        },
        {
          "text": "\"The charter protects everyone, including you.\"",
          "next": 12
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Mm. That's an answer you practiced in the car. Come back when you can answer plain. The patty melt takes twenty minutes — you have time.",
      "next": 19
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Delia sets down her fork. She takes off the reading glasses, which is, you understand somehow, a ceremony."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Didn't know. Knows now. That's the whole human condition in six words, and most people never get to the second half."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "I kept my seal. Seventeen years I kept it, oiled, wrapped, in the one place that building never thought to look — the FIRST branch. Box 0001. My mother banked there when they wouldn't let her bank most places."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "It's a coffee shop now. The Roastery. East end of Fennimore. The vault's still in the basement because marble doesn't take buyouts. I'll meet you there — I don't walk fast, but I walk certain."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "delia_moved",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 200
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Booth four sits empty. The waitress has already cleared it, but nobody has taken it. Nobody will for a while. Some booths are load-bearing.",
      "next": 19
    }
  ],
  "delia_roastery": [
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Look at this place. They put an oat-milk menu where the notary window was. My mother would have laughed for a week."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Basement stairs are behind the bar. Jules knows — I showed them my old key once and they've treated me like the building's grandmother ever since. Which I suppose I am."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Box 0001. Low row, center. The key's been on my ring since 2009 — here. Don't drop it. It's older than your department."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She hands you a brass key worn smooth as river stone. It is heavier than it looks. Most things down here are."
    },
    {
      "type": "end"
    }
  ],
  "barista_vault": [
    {
      "type": "condition",
      "flag": "delia_moved",
      "ifTrue": 3
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The barista — JULES, per a name tag with a hand-drawn bee on it — clocks you looking at the basement door."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Staff only. It's mostly oat milk and a very old vault down there. Yes, a real one. No, you can't.\"",
      "next": 5
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Jules nods you toward the basement door before you ask. \"Miss Delia called ahead. Door's open. Mind the third step — it predates the concept of safety.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Also if you see the popcorn machine down there, that's ours, we're hiding it from the health inspector. You saw nothing.\""
    },
    {
      "type": "end"
    }
  ],
  "vault_box_0001": [
    {
      "type": "condition",
      "flag": "has_recorder_seal",
      "ifTrue": 9
    },
    {
      "type": "condition",
      "flag": "delia_moved",
      "ifTrue": 3
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Deposit box 0001. The first box in the first vault. Whatever is in it has waited a long time and can keep waiting for someone with a key.",
      "next": 10
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The brass key turns like it was oiled yesterday. Because, you realize, it effectively was — seventeen years of someone caring for a thing she never expected to use again."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Inside: a bundle wrapped in newspaper dated March 2009. Within the newspaper, the Recorder's seal of the City — brass, embossing arm intact, heavy as a verdict."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Seventeen years. She kept it working for seventeen years for a day she didn't believe would come."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "has_recorder_seal",
      "value": true
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Behind you, three sets of identical footsteps descend the stairs in perfect synchronization, which is not a thing footsteps should be able to do."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Box 0001 stands open and empty, except for the 2009 newspaper. The crossword is half-finished. In pen.",
      "next": 8
    },
    {
      "type": "end"
    }
  ],
  "the_firm_ambush": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three lawyers in three identical suits stand in formation at the foot of the stairs. They move like a school of fish that passed the bar.",
      "next": 11
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "Mr. Galle. We represent—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—interests formerly aligned with—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—a party you defenestrated. Professionally speaking."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It's Andrew. And I'm mid-errand, so if you could just—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "You've been—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—served."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "An envelope hits you mid-sentence. They served you DURING YOUR LINE. There is no lower thing a lawyer can do, and all three of them know it, and none of them care."
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "Surrender the seal. Our motion to quash your charter is calendared for five o'clock, and we bill travel time.",
      "mood": "smug"
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "the_firm"
    },
    {
      "type": "end"
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "firm_partner",
          "spawn": true,
          "show": true,
          "spawnAt": "stairs",
          "teleportTo": "stairs",
          "walkTo": "firm_a",
          "face": "player",
          "speed": 1.9
        },
        {
          "actor": "firm_associate",
          "spawn": true,
          "spawnAt": "stairs",
          "walkTo": "firm_b",
          "face": "player",
          "speed": 1.75
        },
        {
          "actor": "firm_paralegal",
          "spawn": true,
          "spawnAt": "stairs",
          "walkTo": "firm_c",
          "face": "player",
          "speed": 1.6
        },
        {
          "actor": "player",
          "face": "stairs",
          "wait": false
        }
      ],
      "next": 1
    }
  ],
  "the_firm_retry": [
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "You came back. We never—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—left. Waiting is—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—billable."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three briefcases click open in unison. The seal isn't leaving this basement with anyone but you."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "the_firm"
    },
    {
      "type": "end"
    }
  ],
  "the_firm_defeated": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Firm retreats up the stairs in formation, slightly less synchronized than they came down. One of them is billing this. You can tell."
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "This will be—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—reflected in—"
    },
    {
      "type": "text",
      "speaker": "The Firm",
      "text": "—our invoice."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Unhurried footsteps on the stairs. Delia Okafor surveys the scattered exhibits, the dented envelope, you, and the seal in your hands."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Hm. They sent The Firm. You know you've filed something true when they send The Firm."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "She takes the charter. She takes the seal. She inks the die with a little circular motion, like stirring tea. She breathes on the brass once, for reasons that predate explanation."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Stamp."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Two seconds. After everything — the queue, the forms, the patty melt, the lawyers — it takes two seconds. Bureaucracy's final joke is that the right stamp was always this easy in the right hands."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Witnessed and sealed, per Article 9, by the Recorder's living deputy. Let them calendar THAT.",
      "mood": "smug"
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Take it home, Andrew-who-knows-now. And tell the man with the mop... tell him Delia says the building doesn't win. It never did. It just takes the long way to lose."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "charter_certified",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 400
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The charter is certified. The elevator is going to have to think of a new excuse."
    },
    {
      "type": "end"
    }
  ],
  "delia_epilogue": [
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "I'm having them frame the newspaper. The 2009 one. Jules is going to hang it where the interest-rate board used to be."
    },
    {
      "type": "text",
      "speaker": "Delia Okafor",
      "text": "Go on. Buildings don't fix themselves. Lord knows we let them try."
    },
    {
      "type": "end"
    }
  ],
  "parking_enforcer_intro": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Officer Reyes of Parking Enforcement looks at you. Then at the curb. Then at you. You are not parked. Somehow this makes it worse."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Pedestrians loitering in a loading zone,\" she says, already writing, \"is a gray area. I specialize in gray areas.\""
    },
    {
      "type": "choice",
      "prompt": "Contest the citation?",
      "choices": [
        {
          "text": "Contest it. On the record. Right now.",
          "next": 4
        },
        {
          "text": "Walk away (you cannot win city hall)",
          "next": 3
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You walk away. The ticket follows you anyway, in spirit. Somewhere, a small fine accrues interest.",
      "next": 6
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Reyes smiles for the first time in what the city's records would confirm is nine years."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "parking_enforcer"
    },
    {
      "type": "end"
    }
  ],
  "parking_enforcer_defeated": [
    {
      "type": "condition",
      "flag": "meter_war_2",
      "ifTrue": 4
    },
    {
      "type": "condition",
      "flag": "meter_war_1",
      "ifTrue": 3
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Reyes tears up the citation — slowly, into even quarters, filing each piece in a different pocket. \"Round one,\" she says. \"Nobody takes round one.\"",
      "next": 7
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Reyes consults her ledger. \"Twice. Huh.\" She chalks a small, grudging mark on the curb. It might be respect. It is shaped like a tally.",
      "next": 8
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Reyes holsters the chalk. \"Three appeals upheld. You know what that makes you?\" She hands you a laminated card: HONORARY GRAY AREA. \"Park anywhere. I'll look away. Once.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "meter_war_done",
      "value": true
    },
    {
      "type": "action",
      "action": "modify_stat",
      "stat": "spd",
      "amount": 2,
      "next": 10
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "meter_war_1",
      "value": true,
      "next": 9
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "meter_war_2",
      "value": true
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 90,
      "next": 11
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Bureaucratic Efficiency +2. You have beaten city hall. Nobody beats city hall. Do not tell anyone, or everyone will want to."
    },
    {
      "type": "end"
    }
  ],
  "networking_guy_intro": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A man in a quarter-zip materializes beside you with the smooth inevitability of a calendar invite you never accepted."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Hey! Big fan of your space. Trust stuff, right? I'm actually building something adjacent to that. Do you have literally fifteen minutes?\""
    },
    {
      "type": "choice",
      "prompt": "Do you have literally fifteen minutes?",
      "choices": [
        {
          "text": "\"No.\" (combat)",
          "next": 3
        },
        {
          "text": "\"...How adjacent?\" (combat, but slower)",
          "next": 3
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "It does not matter what you said. He heard 'tell me everything.' He is already sharing his screen. Outdoors. You must end this."
    },
    {
      "type": "action",
      "action": "start_combat",
      "encounter": "networking_guy"
    },
    {
      "type": "end"
    }
  ],
  "networking_guy_defeated": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Networking Guy concedes graciously. \"This was great. I'm going to mention you on the pod.\" The threat lands harder than any of his attacks did."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three days from now, you will receive a LinkedIn connection request with no note. You already know you will accept it. Everyone does. This is how he wins."
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 85
    },
    {
      "type": "end"
    }
  ],
  "bus_driver_515": [
    {
      "type": "condition",
      "flag": "bus515_done",
      "ifTrue": 12
    },
    {
      "type": "condition",
      "flag": "bus515_started",
      "ifTrue": 10
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The driver — MARLENE, per twenty-two years of service pins arranged like campaign medals — is parked, engine off, staring at the middle distance."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Twenty-two years,\" she says, to you or the windshield, \"this bus has never once been early. Late, sure. Early, never. Early is impossible. The 5:15 is a LAW.\""
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Today? Four minutes early. Every light on Fennimore went green at once. All nine of them. I checked my mirrors like something was chasing me.\""
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "...Every light. At once. Toward the records hall, by any chance?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Toward the records hall.\" Marlene looks at you properly for the first time. \"You're from that building, aren't you. The one downtown that's... you know.\" She makes a gesture that means 'alive' in every language."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Tell you what. My transfer ledger slid under seat 12 when I braked for the miracle. Fish it out for me and I'll consider the universe even.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bus515_started",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "condition",
      "flag": "bus515_ledger_found",
      "ifTrue": 13
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"Seat 12. It's the one with the gum that's older than the gum under the other seats.\"",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Marlene taps two fingers on the fare box — transit blessing. \"The 5:15 runs on time now. Exactly on time. I haven't decided how I feel about it.\"",
      "next": 9
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "You hand over the ledger. Marlene flips to today's page, where her own handwriting reads 4 MINUTES EARLY (?!), and underneath, in different ink she swears isn't hers: 'You're welcome. Go help him.'"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Neither of you says anything for a moment. The building has long arms. Marlene hands you two energy drinks from her cooler. \"For the road. His road, apparently.\""
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bus515_done",
      "value": true
    },
    {
      "type": "action",
      "action": "give_item",
      "item": "energy_drink",
      "quantity": 2
    },
    {
      "type": "action",
      "action": "give_xp",
      "xp": 150,
      "next": 9
    }
  ],
  "bus_transfer_ledger": [
    {
      "type": "condition",
      "flag": "bus515_ledger_found",
      "ifTrue": 4
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Under seat 12: one transfer ledger, one petrified glove, and gum from an administration nobody misses. You take the ledger. Only the ledger."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "bus515_ledger_found",
      "value": true
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Just the glove and the gum now. They seem happy together.",
      "next": 3
    }
  ],
  "diner_regular_chat": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Earl has been at this counter since before the counter. He nods at your suit. \"Building's still standing, then.\" He says it like a score update for a game he stopped following on purpose."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "\"You want advice? The patty melt. And whatever Delia tells you, do it in that order.\""
    },
    {
      "type": "end"
    }
  ],
  "chad_return": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Chad Henderson is in the break room. Not at the Nespresso machine. Not looking at his phone. He appears to have been sitting here for some time. The protein shaker in front of him is full of water."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Oh. Hey. Trust guy. *He does not do the handshake.* I'm not here to fight about anything. Karen's handling all the fighting. She brought a binder to Grandpa's funeral. Tab-indexed. Color-coded tabs for who gets what percent of a man who used to make pancakes shaped like Wyoming."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I didn't know he'd died."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Last month. You literally have his file on your desk. Everybody lawyered up the same week. Her estate attorney bills in six-minute increments and sends emails at 2 AM that open with *per our last correspondence*. And I keep thinking about the lake house."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The one you wanted to put on the blockchain."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Yeah. No. I — *He picks up the shaker, puts it down.* I did a backflip off the dock when I was fourteen."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "How bad was the backflip?"
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "Dude. Full scorpion. My knees hit the back of my head. Grandpa — the OG Chad, the actual Chad — he laughed at me for twenty minutes. Not polite laughing. Had to sit down on the dock because his legs stopped working."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "I didn't want the money. I just wanted the dock.",
      "mood": "defeated"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Yeah."
    },
    {
      "type": "text",
      "speaker": "Chad Henderson",
      "text": "*He picks up the protein shaker and actually drinks from it.* Anyway. You tried the new Erewhon smoothie? Forty-two dollars and it kind of changed my week."
    },
    {
      "type": "end"
    }
  ],
  "meredith_footnote": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Meredith Sterling is at the secondary desk on the executive floor. She is packing a single cardboard box. It has already been labeled, in her handwriting, in block capitals. She is not rushed."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Andrew. *She does not look up.* Close the door, please."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I wasn't planning on staying."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Then close it on your way out. But you should hear this first."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "What you did with the charter was structurally sound. I reviewed it twice. The filing was clean and the precedent was applicable. The board had no procedural basis for override. I would have done it differently, but I would not have done it better."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Is that a compliment?"
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "It is an assessment. Compliments are retention tools. You need information. *She places a framed photograph into the box, face down.* What you did was not a victory. It was a deferral. The incentives that produced my proposal have not changed. Margin compression and regulatory consolidation are structural forces. I was the instrument. It does not require me."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "How long?"
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "Fourteen years. Eleven if they hire a comptroller from outside the trust division. I have a model. It was right about Lehman within two quarters."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I don't know what to do with that number."
    },
    {
      "type": "text",
      "speaker": "Meredith Sterling",
      "text": "No. *She closes the box.* You wouldn't."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The label on the box reads STERLING, M. — NON-CORE ASSETS."
    },
    {
      "type": "stage",
      "beats": [
        {
          "actor": "meredith",
          "walkTo": "exec_center",
          "speed": 1.4
        },
        {
          "actor": "meredith",
          "exit": "elevator",
          "speed": 1.4,
          "after": 0
        },
        {
          "actor": "player",
          "face": "elevator",
          "wait": false
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "meredith_left",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "janitor_the_name": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You been calling me that this whole time. *He wrings the mop.* The Janitor. I can hear the capital letters."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You never told me your name."
    },
    {
      "type": "text",
      "speaker": "Curtis Briggs",
      "text": "Curtis Briggs. It's on the boiler inspection card downstairs. Been on it since they put the boiler in."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Floor's looking good, Curtis."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He dunks the mop and starts on the east corridor. Same as yesterday. Same as 1947."
    },
    {
      "type": "end"
    }
  ],
  "intern_rehearsal": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The conference room lights are on. This is noteworthy. Since the last Henderson left it, the room has held eight chairs around a table and the specific atmospheric weight of a place where people learned they were wrong about money. The Intern is standing at the head of it with index cards. He has been here for some time."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Oh. Oh no. You weren't supposed to — I'm not — I was just — sorry about the lights. I can put the lights back."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The lights are fine."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I've been practicing. Client onboarding. Nobody assigned it. I just thought if someone ever asked and I hadn't prepared, that would be the kind of thing that happens to me specifically."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He holds up his index cards the way a man holds up a parking ticket he knows he deserves. There are fourteen. Card nine has been rewritten so many times the eraser marks go through to the other side."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "So the key distinction — and I think people miss this — is that discretionary distributions aren't discretionary for the trustee. The beneficiary has discretion to request. The trustee has an obligation to evaluate prudently. Doing nothing is still a decision, and it gets reviewed like one."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He stops. He looks at his own index card as though it has said that without his permission."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Was that right? That sounded right. I don't want that to be right. That is far too much responsibility for a word I learned on Tuesday.",
      "mood": "worried"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That was right."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "Sorry, chair six. You've been very patient about the whole thing."
    },
    {
      "type": "end"
    }
  ],
  "vault_ledger_niche": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The hollow behind the safe-deposit frame is the same shape it has always been. Seventeen inches deep, nine wide. Without the ledger it looks like what it probably always was — a mason's error from 1947 that someone decided to keep."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "At the back, pressed flat against the mortar where the binding sat for decades, there is a brass coat button. The reverse is stamped DONOVAN & SONS, CHICAGO — a company that closed in 1971, which means the button was here before the ledger was."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Huh."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The air in the hollow still smelled faintly of binding glue. It would for years."
    },
    {
      "type": "end"
    }
  ],
  "janitor_closet_after": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor's supply locker looks the same from outside. Mops by handle length, the patrol schedule in block capitals. But below the schedule, on a hook that was not there last week, there is a flashlight."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "A four-cell Maglite, recently oiled. A strip of masking tape on the handle reads FOURTH FLOOR — GRID 6 in the Janitor's handwriting. Below that, in smaller print: 214 HRS."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Grid 6 is Andrew's desk."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's thorough."
    },
    {
      "type": "end"
    }
  ],
  "penthouse_pool_table": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The pool table sits in the center of the west wing like a declaration of intent. The rug beneath it costs more than Andrew's car. Everyone is here, which for the first time in the building's history means the fourth-floor break room is completely empty."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew racks with the careful geometry of a man who last played pool in a dormitory basement and is entirely reliant on muscle memory."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Right then."
    },
    {
      "type": "text",
      "speaker": "The Intern",
      "text": "I need to disclose that I have two documented cue-sport incidents, both at family events. Details are restricted but I want everyone to have informed consent."
    },
    {
      "type": "text",
      "speaker": "Janet",
      "text": "Fourteen years I assumed the top floor was storage and poor decisions. The pool table is a significant improvement."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Diane takes a cue from the rack, chalks it once, and sinks the three ball into the far corner pocket without appearing to aim."
    },
    {
      "type": "text",
      "speaker": "Diane",
      "text": "I learned on a table in the sub-basement. 1961. Mr. Fargo's secretary could clear a full rack in four minutes. She taught me on Tuesday lunches for two years, and I never did thank her the way she deserved."
    },
    {
      "type": "text",
      "speaker": "Alex from IT",
      "text": "Every ball on this table is already in its pocket. The felt is just being polite about the sequence."
    },
    {
      "type": "text",
      "speaker": "Isaiah",
      "text": "I brought a book, but I'm putting it down. This is better."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Skip Hartley is standing by the bar with something in a glass he has not touched. He is watching the game the way a man watches a departure board when his flight has already landed."
    },
    {
      "type": "text",
      "speaker": "Skip Hartley",
      "text": "I keep waiting for someone to hand out an agenda."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Nobody does. The game continues until no one remembers the score."
    },
    {
      "type": "end"
    }
  ],
  "penthouse_reel": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The screen fills the north wall between the reef tanks. The play button is centered in a font that has never once doubted itself."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*Welcome to the Vaults Fargo Year in Review. Advancing Trust. Securing Tomorrow.*"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*In a defining moment for institutional identity, foundational governance documentation was surfaced and presented to key stakeholders, driving alignment with the organization's original charter of values.*"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I read a piece of paper out loud because it was the only thing left to do."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*Fiduciary stewardship was further demonstrated when a portfolio advisory engagement achieved the successful redirection of twelve million dollars from a volatile digital asset class, preserving intergenerational wealth across four beneficiary tiers.*"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "He wanted to put a trust fund into a coin with a dog on it. The dog was wearing sunglasses."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "*A routine infrastructure audit revealed previously unrecognized data governance capabilities embedded within existing hardware, representing a paradigm shift in institutional archival methodology.*"
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "The printer was plugged into the wrong port. For years. It was just copying everything."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The reel runs for another forty-one seconds. There is a pie chart with six segments and a legend that labels four. A stock photograph of two people shaking hands appears at the nine-second mark and again at the sixteen-second mark. They are the same hands."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew watches it to the end. He does not turn it off. It is not worth the argument with the remote."
    },
    {
      "type": "end"
    }
  ],
  "penthouse_analytics_console": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The north wall is a single screen. Five stations arc below it, each with a keyboard and a chair that remembers who sat in it last. Andrew takes the center seat. The chair adjusts to his height without being asked, which is either good design or proof the building has always known more about him than he is comfortable with."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The previous user's presets are still loaded. The dashboard opens to a view labeled OVERHEAD OPTIMIZATION. Andrew does not recognize the name on the login."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He clears the presets. The system offers seventeen categories. Category four is a live discretionary-distribution tracker — every pending trustee review, color-coded by filing deadline, with a rolling ninety-day lookback."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Oh. That's actually useful."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Category eleven is labeled STAFF MORALE INDEX. It estimates team sentiment from email punctuation and the average duration of voluntary door-holding. It updates every six hours. The current reading is 71, annotated WITHIN ACCEPTABLE PARAMETERS."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Acceptable to whom."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Category nine is INDIVIDUAL CONTRIBUTOR EFFICIENCY INDEX. A decimal score for every employee on the fourth floor, updated hourly. Janet is a 0.73. The Intern is a 0.44, marked in amber."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Andrew holds the delete key on category nine until the screen asks if he is sure. He is sure."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It has Janet at 0.73. Janet runs this floor."
    },
    {
      "type": "end"
    }
  ],
  "bathroom_stall_door": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The inside of the middle stall door has a column of numbers in blue ballpoint. Twelve careful lines of arithmetic, working out to the quarter-hour exactly how much paid time off someone was owed."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That is remarkably steady handwriting for a bathroom stall."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The total at the bottom has been circled twice. One hundred and forty-seven point five."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I hope they took them."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "pred_bathroom_found",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "garage_pillar": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The pillar nearest the space marked TRUST OFFICER has two concrete patches, both at bumper height. They are four inches apart."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Someone had a parking error. And then reversed and had a second parking error."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The work order was filed the same afternoon. The space has since been relocated nine feet from the nearest structural element."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Nine feet seems like a very reasonable amount of distance."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "pred_garage_found",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "copy_room_shelf": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Behind the third row of toner boxes on the bottom shelf, there is an envelope. The dust on it is the same depth as the dust on the shelf."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It is addressed to the Henderson Family Trust."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The letter inside is two pages, single-spaced, on bank letterhead. One sentence near the bottom of the first page has been underlined: Your children will not benefit from this arrangement as currently structured."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "They never sent it."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The stamp is unused. The flap was sealed with tape, not water. Someone intended to mail this and then put it behind toner boxes instead."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That would have been a useful thing for someone to read."
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "pred_copy_found",
      "value": true
    },
    {
      "type": "end"
    }
  ],
  "janitor_predecessors": [
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "You knew them. The people who had this job before me."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "You found the pillar."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "And a letter. And some arithmetic on a bathroom door."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The Janitor opens the green ledger and turns to the older pages, where the ink has settled into the grain."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "M. Vasquez. Two years. Wrote the Hendersons an honest letter they never read. Kept her desk clean enough to eat off. REMEMBERED. R. Chen. Fourteen months. Did the math and left knowing what she was owed to the half-hour. REMEMBERED."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "T. Barlow. Eight months. Hit that pillar once for the job and once for the Hendersons. Good taste in ties. REMEMBERED."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "Same ink. Same space on the page. The ones who left and the ones who stayed."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Is the toner requisition form still in the copy room? I think we are running low."
    },
    {
      "type": "end"
    }
  ],
  "copy_room_copier": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The copier is a Kyocera 4100, a model number that communicates nothing unless you have worked in a building where one has been running since before the current decade. It weighs more than Andrew and has fourteen buttons on its control panel, two of which are labeled."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "What do the other twelve do?"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Three of them are believed to collate. The rest are institutional folklore."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "It is warm. And it is making a noise even though nobody is printing anything."
    },
    {
      "type": "end"
    }
  ],
  "copy_room_supplies": [
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The shelves hold forty-two boxes of black toner, eleven boxes of cyan, no magenta, eight hundred sheets of letterhead from a rebranding that was reversed four months later, and a laminator that has been repurposed exclusively for preserving break-room lunch menus."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "There are nine rolls of packing tape. That seems like a lot for a department that does not ship anything."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The top shelf holds a sealed box labeled THERMAL BINDING SUPPLIES - DO NOT OPEN - SEE DIANE. It has been on that shelf longer than anyone named Diane has worked in this building."
    },
    {
      "type": "end"
    }
  ],
  "janitor_garage": [
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "A parking garage is just a trust, son. You hand over something valuable, you get a paper ticket, and you hope the institution honors the arrangement when you come back."
    },
    {
      "type": "text",
      "speaker": "Mysterious Janitor",
      "text": "That one holds up better than most of mine do."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "He resumes sweeping a patch of concrete that is already clean."
    },
    {
      "type": "end"
    }
  ],
  "janet_quiz": [
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 32
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 32
    },
    {
      "type": "condition",
      "flag": "trait_percolator",
      "ifTrue": 32
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The PC boots in forty-one seconds -- third-fastest on the sixth floor. The browser opens to the Bridgewell-Kaplan Workplace Temperament Inventory™, Build 4.7.1."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The tab has no close button. The keyboard shortcut for closing tabs has been intercepted. The quiz will proceed."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I did click where the X should be. Twice. I think it knows."
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "It is 8:47 a.m. You have arrived at your workstation. The break-room coffee was brewed at an indeterminate hour by a colleague who has since left the building. Describe your approach.",
      "choices": [
        {
          "text": "I brought a thermos. I reviewed the floor plan last night and the break room doesn't have a french press.",
          "next": 7
        },
        {
          "text": "I pour whatever's in the pot. It's coffee. It'll do what coffee does.",
          "next": 8
        },
        {
          "text": "I empty the old pot, rinse it, and start a fresh twelve-cup batch. I can wait.",
          "next": 9
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "The Xerox WorkCentre 7845i displays the message PC LOAD LETTER. It has displayed this message before, including once when no print job was active. Three colleagues are waiting. Select your response.",
      "choices": [
        {
          "text": "I open tray 3 and clear the jam. I read the service manual once, in 2019. Certain things stay with you.",
          "next": 13
        },
        {
          "text": "I clear the paper, close the tray, and press Resume. Nobody in this line needs narration.",
          "next": 10
        },
        {
          "text": "I power-cycle the unit, recalibrate the feed path, and run a test page. This takes four minutes. The printer will behave for the rest of the week.",
          "next": 11
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "The Xerox WorkCentre 7845i displays the message PC LOAD LETTER. It has displayed this message before, including once when no print job was active. Three colleagues are waiting. Select your response.",
      "choices": [
        {
          "text": "I open tray 3 and clear the jam. I read the service manual once, in 2019. Certain things stay with you.",
          "next": 10
        },
        {
          "text": "I clear the paper, close the tray, and press Resume. Nobody in this line needs narration.",
          "next": 14
        },
        {
          "text": "I power-cycle the unit, recalibrate the feed path, and run a test page. This takes four minutes. The printer will behave for the rest of the week.",
          "next": 12
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "The Xerox WorkCentre 7845i displays the message PC LOAD LETTER. It has displayed this message before, including once when no print job was active. Three colleagues are waiting. Select your response.",
      "choices": [
        {
          "text": "I open tray 3 and clear the jam. I read the service manual once, in 2019. Certain things stay with you.",
          "next": 11
        },
        {
          "text": "I clear the paper, close the tray, and press Resume. Nobody in this line needs narration.",
          "next": 12
        },
        {
          "text": "I power-cycle the unit, recalibrate the feed path, and run a test page. This takes four minutes. The printer will behave for the rest of the week.",
          "next": 15
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "A client meeting has been moved forward by one hour. You learn this fourteen minutes before it begins. Select your response.",
      "choices": [
        {
          "text": "Rewrite the agenda. Arrive with a revised timeline.",
          "next": 13
        },
        {
          "text": "Go to the meeting.",
          "next": 14
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "A forty-page compliance report is due Friday at 5:00 p.m. It is Monday morning. Select your approach.",
      "choices": [
        {
          "text": "Outline the full document by noon Monday. Draft the conclusion before the introduction.",
          "next": 13
        },
        {
          "text": "Eight pages a day, every day, until Friday. The last page prints at 4:40 p.m.",
          "next": 15
        }
      ]
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "The fire alarm activates during your lunch break. Your sandwich is half-eaten. Select your response.",
      "choices": [
        {
          "text": "Leave the sandwich. There will be other sandwiches.",
          "next": 14
        },
        {
          "text": "Wrap the sandwich and put it in the refrigerator. You will finish it after the all-clear.",
          "next": 15
        }
      ]
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "trait_advance_reader",
      "value": true,
      "next": 16
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "trait_shock_absorber",
      "value": true,
      "next": 16
    },
    {
      "type": "action",
      "action": "set_flag",
      "flag": "trait_percolator",
      "value": true,
      "next": 16
    },
    {
      "type": "choice",
      "speaker": "Homepage",
      "prompt": "The ceiling fluorescent nearest your workstation has developed a flicker. Facilities has been notified. It has been nine weeks. Describe your relationship with the fluorescent.",
      "choices": [
        {
          "text": "Adversarial.",
          "next": 17
        },
        {
          "text": "Companionable.",
          "next": 17
        },
        {
          "text": "It has been here longer than I will be.",
          "next": 17
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The progress bar fills to 87%, holds for nine seconds, then completes in a single jump. This is the documented behavior of all progress bars and always has been."
    },
    {
      "type": "condition",
      "flag": "trait_advance_reader",
      "ifTrue": 23
    },
    {
      "type": "condition",
      "flag": "trait_shock_absorber",
      "ifTrue": 26
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "YOUR RESULT: THE PERCOLATOR. Assessment confidence: 94.2%."
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "You proceed at the pace required by the process, not by the people waiting for the process. You are aware they are waiting."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I do like to be thorough. I didn't realize that was a whole... type.",
      "next": 29
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "YOUR RESULT: THE ADVANCE READER. Assessment confidence: 94.2%."
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "You have already prepared for outcomes that have not yet been scheduled. The inventory does not determine whether this is diligence or a form of preemptive grief."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "I did read the employee handbook before today. I thought that was normal.",
      "next": 29
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "YOUR RESULT: THE SHOCK ABSORBER. Assessment confidence: 94.2%."
    },
    {
      "type": "text",
      "speaker": "Homepage",
      "text": "You absorb operational disruption without measurable recalibration. You have been doing this so long you may have forgotten the original shape."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "That's... is that a good thing? It sounds like it might not be a good thing."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The quiz dispatches its results to a distribution list whose membership does not appear in any company directory."
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The tab closes on its own. The homepage beneath it is a SharePoint migration notice marked URGENT -- ACTION REQUIRED. The notice is dated 2019. The migration has not occurred."
    },
    {
      "type": "end"
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "The tab closes on its own. The homepage beneath it is a SharePoint migration notice marked URGENT -- ACTION REQUIRED. The notice is dated 2019. The migration has not occurred."
    },
    {
      "type": "end"
    }
  ],
  "rachel_wardrobe": [
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "rachel",
          "face": "player",
          "wait": false
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "Bathroom's down the hall. Second door."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Sorry — what?"
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "There's a mirror."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Do I look that bad?"
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "You look like somebody who just had their first meeting."
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "I went my first week."
    },
    {
      "type": "text",
      "speaker": "Andrew",
      "text": "Thanks, Rachel."
    },
    {
      "type": "text",
      "speaker": "Rachel",
      "text": "On the left."
    },
    {
      "type": "stage",
      "concurrent": true,
      "beats": [
        {
          "actor": "rachel",
          "face": "rachel_monitor",
          "wait": false
        }
      ]
    },
    {
      "type": "text",
      "speaker": "Narrator",
      "text": "Rachel turned back to her spreadsheet. Next to her monitor was a pair of reading glasses with green frames."
    },
    {
      "type": "end"
    }
  ]
};
