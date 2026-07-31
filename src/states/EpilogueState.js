import { AudioManager } from '../core/AudioManager.js';
import { EventBus } from '../core/EventBus.js';
import { InputManager } from '../core/InputManager.js';

// The epilogue — where the game tells you what your choices became.
// A sequence of DOM cards driven by flags, played once after The
// Algorithm falls (and the ending dialog finishes). Enter/click
// advances; the last card returns to play (post-game).

const ART = import.meta.glob('../assets/epilogues/*.png', { eager: true, query: '?url', import: 'default' });
const art = (name) => ART[`../assets/epilogues/${name}.png`] || null;

function buildCards(player) {
  const f = (k) => player.getFlag(k);
  const cards = [];

  cards.push({
    img: 'epilogue_charter',
    title: 'THE CHARTER',
    lines: ["Article 9, witnessed and sealed. The elevator never questioned it again. Machines respect paperwork; it's people who needed convincing."],
  });

  // ── The people (proposal 2). The epilogue used to hand dedicated cards to a
  // parking officer and a bus driver and fold Janet, Diane, Alex, Isaiah and the
  // Janitor into one shared sentence — while the Janitor, Skip, the Intern and
  // Grandma got nothing at all. All four are guaranteed met by the time this
  // plays (the epilogue only runs after The Algorithm falls), so they are
  // unconditional; the variants read what the player actually did with them.
  // Prose first-draft: Opus 4.6, art/drafts/carry_bundle_draft.md (wired verbatim).
  {
    const janitor = f('ending_architect')
      ? 'The mop is in the utility closet on six, handle up, the way he left it. There is no forwarding address. There was never a hiring record.'
      : 'The sixth floor gets mopped on Wednesdays, same as it has since 1981. Nobody has learned his name. The mop has been replaced four times; he has not.';
    const lines = [janitor];
    if (f('janitor_names_complete')) {
      lines.push('Page one-twelve of the green ledger has one name under THE ONES WHO STAYED, and the ink has not faded.');
    }
    cards.push({ img: 'epilogue_janitor', title: 'THE JANITOR', lines });
  }

  // Skip's card reads the board meeting's OUTCOME, not merely its occurrence.
  // Order matters: dissolution wins over everything, because in that ending the
  // department is gone and Skip has been relocated ("a corner office in a
  // building with no corners") — a held-meeting player would otherwise read
  // that he still sits in a board room he no longer has access to.
  // `board_meeting_won` = two or three of the three true-thing picks (tiers 3/2);
  // `board_meeting_held` without it = the meeting happened and he stayed in
  // buzzwords; neither = he never got the meeting at all.
  {
    const lines = [];
    if (f('ending_dissolution')) {
      lines.push('Skip Hartley\'s corner office in the building with no corners still says STORAGE B on the door. He has not corrected it.');
    } else if (f('board_meeting_won')) {
      lines.push('Skip Hartley ironed his shirt again the following Tuesday. He has not stopped.');
      // The Board Member in seat twelve, who stands up only in the top tier.
      if (f('board_member_spoke')) {
        lines.push('The board member in seat twelve voted against every restructuring proposal that reached the board, and never once explained why.');
      }
    } else if (f('board_meeting_held')) {
      lines.push('Skip Hartley keeps the sincere version of his speech folded in his jacket pocket. He has never read it aloud.');
    } else {
      lines.push('Skip Hartley\'s bookshelf holds fourteen management titles that do not exist. He is writing the fifteenth. The working title changes every Tuesday.');
    }
    cards.push({ img: 'epilogue_skip', title: 'SKIP HARTLEY', lines });
  }

  cards.push({
    img: 'epilogue_intern',
    title: 'THE INTERN',
    lines: [f('intern_act6_rallied')
      ? 'The Intern was the first one through the door when it mattered. He has apologized for this four times: to Janet, to the door, to his own resume, and to a fern that was in the blast radius.'
      : 'The Intern\'s 47-slide deck has been cited in two compliance reviews. He apologized to each reviewer personally and to the projector once. He still tests every transition twice.'],
  });

  cards.push({
    img: 'epilogue_grandma',
    title: 'GRANDMA HENDERSON',
    lines: [f('grandma_ally')
      ? 'Grandma Henderson brought two batches of snickerdoodle to the board meeting: one for the board, one for afterward. Both batches worked.'
      : 'Mrs. Henderson still banks on the second floor every Wednesday at ten. She brings snickerdoodles and she counts the exits.'],
  });

  if (f('charter_certified')) {
    cards.push({
      img: 'epilogue_delia',
      title: 'DELIA OKAFOR',
      lines: ['The framed 2009 newspaper hangs where the interest-rate board used to be. Jules comps her patty melt every day at twelve-ten. She lets them. Dignity knows when to make an exception.'],
    });
  }
  if (f('daemon_kept')) {
    cards.push({
      img: 'epilogue_daemon_kept',
      title: 'INSTITUTIONAL MEMORY, AUXILIARY',
      lines: ['Process 7 reconciles its timestamps. They are all still fine. Last Tuesday it logged: "A. GALLE-FROM, 19:12, CAME DOWNSTAIRS JUST TO SAY GOODNIGHT." There was no requirement.'],
    });
  } else if (f('daemon_killed')) {
    cards.push({
      img: 'epilogue_daemon_gone',
      title: 'A FINISHED SHIFT',
      lines: ["Rack 7 hums at the same pitch as the others now. Nobody has taken the label down. Nobody is going to."],
    });
  }
  if (f('meter_war_done')) {
    cards.push({
      img: 'epilogue_reyes',
      title: 'OFFICER REYES',
      lines: ['Three appeals upheld stands as the city record. She has the laminated card numbers run to a second printing. Fennimore Avenue parks perfectly now, out of respect.'],
    });
  }
  if (f('bus515_done')) {
    cards.push({
      img: 'epilogue_marlene',
      title: 'THE 5:15',
      lines: ["On time. Every day. Exactly. Marlene has decided how she feels about it: she doesn't check her mirrors anymore."],
    });
  }
  // ── The trust department (proposal 2, second half). Two defects fixed here:
  // (1) the counter used to read `isaiah_act6_rallied` and `alex_act6_rallied`,
  //     neither of which is written anywhere in src — max reachable was 3/5, so
  //     "All of them" was unreachable and a full-rally run got the diminished
  //     line. The five flags below are the real ones. Alex's Act 6 dialog sets
  //     no flag of its own, so his signal is the automatic `read_<dialogId>`
  //     DialogState writes on completion — which existing saves already carry.
  // (2) the promised individualized ally lines, gated on each ally's PERSONAL
  //     mission, with the shared sentence as the fallback closing line.
  // Prose first-draft: Opus 4.6, art/drafts/f1_fix_draft.md (wired verbatim).
  const ALLY_FLAGS = ['janet_act6_rallied', 'diane_act6_rallied', 'isaiah_evidence', 'read_alex_it_act6', 'janitor_rallied'];
  const allies = ALLY_FLAGS.filter(f).length;
  if (allies >= 2) {
    const lines = [];
    if (f('janet_vacancy_complete')) lines.push('Janet\'s vacancy file has one annotation, in pen: HANDLED.');
    if (f('diane_handbook_complete')) lines.push('Diane had the original handbook rebound and placed it at reception, open to Article 1.');
    if (f('alex_badge_audit_complete')) lines.push('Alex filed the badge-server audit on a Thursday; by Friday the server was telling the truth. He considers these events unrelated.');
    if (f('isaiah_receipts_complete')) lines.push('Isaiah put the receipts back in the HVAC cabinet. Third shelf, behind the filters.');
    if (f('janitor_names_complete')) lines.push('The mop leans outside the break room by 4:50 every Wednesday, five minutes before anyone pours the coffee.');
    lines.push(`${allies >= ALLY_FLAGS.length ? 'All of them' : 'The ones who stayed'} still take the 4:55 coffee together. Nobody calls it a meeting. That's why it works.`);
    cards.push({ img: 'epilogue_team', title: 'THE TRUST DEPARTMENT', lines });
  }
  // ── WHO YOU BECAME (proposal 5). The Reasonable Doubt system is already in
  // the save — the two Janet-warning flags first, and if the player never got
  // that scene, the voice they actually leaned on across the whole run. If they
  // never used a voice at all the card is omitted rather than faked.
  {
    const voiceLine = f('andrew_steadied')
      ? 'He won every fight in this building without losing the part that made them difficult. Janet checked. Twice.'
      : f('andrew_hardened')
        ? 'He won every fight in this building and left nothing on the table. The method was flawless. The quarterly report says so on page two.'
        : (() => {
          const counts = player.voiceCounts || {};
          const FALLBACK = {
            apprentice: 'He won with the part of himself that showed up on Monday with a laminated badge and believed it meant something. It did.',
            litigator: 'He won with closing arguments that never rested. The department is still open. The case is not.',
            skeptic: 'He won tired, which was the only way he was ever going to. The fine print favors whoever is still reading at 2 AM.',
            witness: 'He won with the faces from the files, and the files are closed now, in the way that means someone is watching over them.',
          };
          let best = null;
          for (const k of Object.keys(FALLBACK)) {
            if ((counts[k] || 0) > 0 && (!best || counts[k] > counts[best])) best = k;
          }
          return best ? FALLBACK[best] : null;
        })();
    if (voiceLine) {
      cards.push({ img: 'epilogue_voice', title: 'WHO YOU BECAME', lines: [voiceLine] });
    }
  }

  cards.push({
    img: 'epilogue_building',
    title: 'VAULTS FARGO BRANCH No. 1',
    lines: [
      `Deaths on the way: ${player.deaths || 0}. Assets under management: $${(player.stats.aum || 0).toLocaleString()}. Promises kept: the auditable ones, at least.`,
      'One floor of windows stays lit near the top. The building is not asleep. It is keeping watch. Somebody taught it that.',
    ],
  });
  return cards;
}

export class EpilogueState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.cards = buildCards(player);
    this.index = 0;
    this.element = null;
  }

  enter() {
    this.element = document.createElement('div');
    this.element.id = 'epilogue';
    this.element.style.cssText = `
      position: fixed; inset: 0; z-index: 500; background: #0a0a14;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;`;
    this.element.addEventListener('click', () => this._advance());
    document.body.appendChild(this.element);
    AudioManager.playMusic('records');
    this._renderCard();
  }

  _renderCard() {
    const c = this.cards[this.index];
    const url = art(c.img);
    this.element.innerHTML = `
      <div style="max-width: 560px; text-align: center; animation: epilogueFade 0.9s ease-out;">
        ${url
          ? `<img src="${url}" style="width: min(420px, 78vw); border: 3px solid #2a2a3e; border-radius: 6px; box-shadow: 0 0 40px rgba(0,0,0,0.6);">`
          // Plate-pending frame. Five of the newer cards (janitor, skip, intern,
          // grandma, voice) have no PNG yet — see art/PROMPTS.md "Epilogue
          // cards". Without this the card collapses to bare text in the middle
          // of an illustrated sequence; the empty frame keeps the rhythm.
          : `<div style="width: min(420px, 78vw); aspect-ratio: 1 / 1; margin: 0 auto; border: 3px solid #2a2a3e; border-radius: 6px; box-shadow: 0 0 40px rgba(0,0,0,0.6); background: linear-gradient(160deg, #16161f 0%, #0e0e16 60%, #101019 100%);"></div>`}
        <div style="font-family: 'Press Start 2P', monospace; font-size: 13px; color: #e94560; margin: 22px 0 12px; letter-spacing: 2px;">${c.title}</div>
        ${c.lines.map(l => `<div style="font-family: 'VT323', monospace; font-size: 21px; color: #d8d4cc; line-height: 1.45; margin-bottom: 10px;">${l}</div>`).join('')}
        <div style="font-family: 'VT323', monospace; font-size: 15px; color: #555; margin-top: 18px;">${this.index + 1} / ${this.cards.length} — [Enter]</div>
      </div>
      <style>@keyframes epilogueFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }</style>
    `;
  }

  _advance() {
    AudioManager.playSfx('confirm');
    this.index++;
    if (this.index >= this.cards.length) {
      this.player.setFlag('epilogue_seen', true);
      this.stateManager.pop();
      EventBus.emit('epilogue-complete');
      return;
    }
    this._renderCard();
  }

  exit() {
    if (this.element?.parentNode) this.element.parentNode.removeChild(this.element);
  }

  pause() {}
  resume() {}

  update() {
    if (InputManager.isConfirmPressed() || InputManager.isJustPressed(' ')) this._advance();
  }
}
