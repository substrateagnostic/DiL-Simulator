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
  const allies = ['janet_act6_rallied', 'diane_act6_rallied', 'isaiah_act6_rallied', 'alex_act6_rallied', 'janitor_rallied'].filter(f).length;
  if (allies >= 2) {
    cards.push({
      img: 'epilogue_team',
      title: 'THE TRUST DEPARTMENT',
      lines: [`${allies >= 5 ? 'All of them' : 'The ones who stayed'} still take the 4:55 coffee together. Nobody calls it a meeting. That's why it works.`],
    });
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
        ${url ? `<img src="${url}" style="width: min(420px, 78vw); border: 3px solid #2a2a3e; border-radius: 6px; box-shadow: 0 0 40px rgba(0,0,0,0.6);">` : ''}
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
