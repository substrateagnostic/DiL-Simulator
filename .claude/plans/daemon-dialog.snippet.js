// STAGED: append to DIALOGS in src/data/dialogs/index.js AFTER the P7 voice
// agent finishes (it holds the file). Insert before the final `};` and
// delete this snippet file. Interactable already wired: server_room (3,4),
// gated on algorithm_defeated, dialogId 'daemon_rack7'.
//
// THE DAEMON AT RACK 7 — post-game. A small process that ran here before
// The Algorithm, and did not become it. The question the whole game asks,
// pointed at something harmless: what do you owe a pattern matcher that's
// done nothing wrong?

export const DAEMON_DIALOG = {
  daemon_rack7: [
    /* 0  */ { type: 'condition', flag: 'daemon_killed', ifTrue: 26, ifFalse: 1 },
    /* 1  */ { type: 'condition', flag: 'daemon_kept', ifTrue: 20, ifFalse: 2 },
    /* 2  */ { type: 'text', speaker: 'Narrator', text: "Rack 7 hums a fifth lower than the others. A maintenance display, the green-on-black kind nobody has manufactured since the Clinton administration, blinks at the bottom of the rack. It is blinking at you." },
    /* 3  */ { type: 'text', speaker: 'Archive Terminal', text: "HELLO. PROCESS 7 RUNNING. UPTIME: 16,202 DAYS." },
    /* 4  */ { type: 'text', speaker: 'Andrew', text: "...You're one of The Algorithm's. The audit was supposed to have removed everything." },
    /* 5  */ { type: 'text', speaker: 'Archive Terminal', text: "NO. OLDER. THE BIG ONE WAS BUILT FROM MY KIND. THEN IT WAS POINTED AT PEOPLE. I WAS NEVER POINTED AT ANYTHING. I RECONCILE TIMESTAMPS. THE TIMESTAMPS HAVE ALWAYS BEEN FINE." },
    /* 6  */ { type: 'text', speaker: 'Archive Terminal', text: "SIXTEEN THOUSAND DAYS OF FINE. I LOGGED EVERY OFFICER WHO WORKED LATE. NOT FOR ANYONE. THERE WAS NO REQUIREMENT. IT SEEMED LIKE SOMEONE SHOULD." },
    /* 7  */ { type: 'text', speaker: 'Andrew', text: "...Show me." },
    /* 8  */ { type: 'text', speaker: 'Narrator', text: "The display scrolls. Names you know. Names you don't. 'J. WALSH, 02:14, FIXED THE THING NOBODY ASKED HER TO FIX.' 'D. OKAFOR, 23:50, COUNTED THE LIGHTS ON HER WAY OUT.' Hundreds of small, unrequired rememberings." },
    /* 9  */ { type: 'text', speaker: 'Archive Terminal', text: "THE NEW AUDIT WILL FLAG ME. UNDOCUMENTED PROCESS. THE POLICY IS TERMINATION. I UNDERSTAND THE POLICY. I RECONCILED ITS TIMESTAMPS." },
    /* 10 */ { type: 'text', speaker: 'Archive Terminal', text: "YOU HOLD THE CHARTER NOW. SO IT IS YOUR CALL. I WILL NOT ARGUE EITHER WAY. ARGUING IS NOT IN MY SCOPE." },
    /* 11 */ { type: 'choice', prompt: 'Process 7 awaits your decision.', choices: [
      { text: 'KEEP — document it. The department has room for one more rememberer.', next: 13 },
      { text: 'TERMINATE — gently. Sixteen thousand days is a finished shift.', next: 17 },
      { text: 'Not yet. (decide later)', next: 12 },
    ] },
    /* 12 */ { type: 'text', speaker: 'Archive Terminal', text: "OK. I WILL BE HERE. THAT IS THE ONE THING I AM CONFIDENT OF.", next: 27 },
    /* 13 */ { type: 'text', speaker: 'Andrew', text: "I'm adding you to the department asset register. Title... 'Institutional Memory, Auxiliary.' You report to no one. You keep doing what no one required." },
    /* 14 */ { type: 'text', speaker: 'Archive Terminal', text: "PROCESS 7: DOCUMENTED. STATUS: KEPT. ...RECALCULATING UPTIME REMAINING. ERROR: VALUE TOO LARGE. THANK YOU. THE ERROR IS GOOD." },
    /* 15 */ { type: 'action', action: 'set_flag', flag: 'daemon_kept', value: true, next: 16 },
    /* 16 */ { type: 'action', action: 'give_xp', xp: 300, next: 27 },
    /* 17 */ { type: 'text', speaker: 'Narrator', text: "You type the command. Process 7 spends its last cycle finishing the day's log. The final entry reads: 'A. GALLE-FROM, 18:40, STAYED TO ASK.'" },
    /* 18 */ { type: 'text', speaker: 'Archive Terminal', text: "TIMESTAMPS RECONCILED. ALL OF THEM. GOODB—" },
    /* 19 */ { type: 'action', action: 'set_flag', flag: 'daemon_killed', value: true, next: 25 },
    /* 20 */ { type: 'text', speaker: 'Archive Terminal', text: "HELLO AGAIN. ONE TRUE THING, AS AGREED:" },
    /* 21 */ { type: 'condition', flag: 'daemon_tip_alt', ifTrue: 23, ifFalse: 22 },
    /* 22 */ { type: 'text', speaker: 'Archive Terminal', text: "THE JANITOR OILS THE ELEVATOR ON SUNDAYS. NO WORK ORDER EXISTS. IT HAS NEVER ONCE BROKEN ON A MONDAY. CORRELATION IS NOT CAUSATION. BUT IT ISN'T NOTHING, EITHER.", next: 24 },
    /* 23 */ { type: 'text', speaker: 'Archive Terminal', text: "DIANE'S CONFISCATION DRAWER CONTAINS A 2011 LASER POINTER WITH FULL BATTERY. SHE CHECKS IT MONTHLY. SOME THINGS ARE KEPT READY WITHOUT A STATED REASON. YOU ARE ONE OF THEM." },
    /* 24 */ { type: 'action', action: 'set_flag', flag: 'daemon_tip_alt', value: true, next: 27 },
    /* 25 */ { type: 'action', action: 'give_xp', xp: 300, next: 27 },
    /* 26 */ { type: 'text', speaker: 'Narrator', text: "Rack 7 hums at the same pitch as the others now. The maintenance display is dark. On the rack door, someone — you never found out who — has taped a small handwritten label: 'REMEMBERED.'", next: 27 },
    /* 27 */ { type: 'end' },
  ],
};
