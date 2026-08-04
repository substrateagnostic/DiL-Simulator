// ============================================================
// HUD — DOM overlay, CSS injected by this module
// ============================================================
// Self-contained on purpose: everything the arcade needs to look like an
// arcade lives under src/arcade/. All class names are `sr-` prefixed so
// nothing here can collide with the game's own HUD stylesheets.
// ============================================================

const CSS = `
#sr-root{position:fixed;inset:0;z-index:1000;pointer-events:none;
  font-family:'VT323',monospace;color:#8ff5d8;
  text-shadow:0 0 8px rgba(80,240,200,.45)}
#sr-root .sr-scan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px)}
#sr-root .sr-vig{position:absolute;inset:0;pointer-events:none;
  box-shadow:inset 0 0 220px rgba(0,0,0,.85);opacity:0;transition:opacity .18s linear}

.sr-top{position:absolute;top:10px;left:0;right:0;display:flex;
  justify-content:center;gap:38px;align-items:flex-start}
.sr-cell{display:flex;flex-direction:column;align-items:center;line-height:1}
.sr-k{font-size:13px;letter-spacing:3px;color:#4fbfa2;margin-bottom:2px}
.sr-v{font-size:34px;color:#c9ffef;text-shadow:0 0 12px rgba(120,255,220,.7)}
.sr-v.sr-gold{color:#ffd76a;text-shadow:0 0 14px rgba(255,200,80,.8)}
.sr-v.sr-punch{animation:sr-punch .18s ease-out}
@keyframes sr-punch{0%{transform:scale(1.45)}100%{transform:scale(1)}}

.sr-meters{position:absolute;left:18px;bottom:52px;width:238px}
.sr-meter{margin-bottom:9px}
.sr-meter .sr-k{text-align:left;letter-spacing:2px}
.sr-bar{height:11px;border:1px solid rgba(120,220,195,.5);background:rgba(0,20,18,.55);
  position:relative;overflow:hidden}
.sr-fill{position:absolute;inset:0;width:0%;transform-origin:left center;
  background:linear-gradient(90deg,#2fbf95,#8ff5d8);transition:width .06s linear}
.sr-fill.sr-over{background:linear-gradient(90deg,#ffb02e,#ffe89a)}
.sr-fill.sr-dead{background:linear-gradient(90deg,#7a1f1f,#ff4d4d)}
.sr-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.32)}

.sr-ctrl{position:absolute;bottom:12px;left:0;right:0;text-align:center;
  font-size:15px;letter-spacing:1px;color:#3f9d85;opacity:.85}

.sr-pop{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);
  font-size:40px;letter-spacing:4px;color:#ffd76a;
  text-shadow:0 0 16px rgba(255,190,70,.9);animation:sr-rise .8s ease-out forwards}
@keyframes sr-rise{
  0%{transform:translate(-50%,-40%) scale(.5);opacity:1}
  55%{transform:translate(-50%,-78%) scale(1.15);opacity:1}
  100%{transform:translate(-50%,-118%) scale(1);opacity:0}}

.sr-warn{position:absolute;left:50%;top:16%;transform:translateX(-50%);
  font-size:30px;letter-spacing:6px;color:#ff5b5b;
  text-shadow:0 0 18px rgba(255,60,60,.9);animation:sr-flash .55s steps(2) infinite}
@keyframes sr-flash{0%{opacity:1}50%{opacity:.15}100%{opacity:1}}

#sr-card{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;background:rgba(2,10,12,.9);
  text-align:center;pointer-events:none}
#sr-card .sr-title{font-size:74px;letter-spacing:12px;color:#ffd76a;
  text-shadow:0 0 26px rgba(255,190,70,.75),0 0 60px rgba(255,140,0,.35);line-height:1}
#sr-card .sr-sub{font-size:22px;letter-spacing:5px;color:#6fd8bb;margin-top:6px}
#sr-card .sr-rows{font-size:26px;line-height:1.75;margin:26px 0 14px}
#sr-card .sr-unlock{font-size:21px;color:#ffd76a;margin:3px 0;
  animation:sr-pulse 1.4s ease-in-out infinite}
#sr-card .sr-prompt{font-size:21px;line-height:1.9;animation:sr-pulse 1.4s ease-in-out infinite}
#sr-card .sr-dead{font-size:64px;letter-spacing:10px;color:#ff4d4d;
  text-shadow:0 0 24px rgba(255,60,60,.8)}
@keyframes sr-pulse{0%,100%{opacity:1}50%{opacity:.45}}
`;

export class Hud {
  constructor() {
    this.style = document.createElement('style');
    this.style.id = 'sr-style';
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.id = 'sr-root';
    this.root.innerHTML = `
      <div class="sr-top">
        <div class="sr-cell"><span class="sr-k">STORY POINTS</span><span class="sr-v" id="sr-score">0</span></div>
        <div class="sr-cell"><span class="sr-k">PAPERCLIPS</span><span class="sr-v sr-gold" id="sr-clips">0</span></div>
        <div class="sr-cell"><span class="sr-k">FLOORS</span><span class="sr-v" id="sr-floors">0</span></div>
        <div class="sr-cell"><span class="sr-k">BEST</span><span class="sr-v" id="sr-best">0</span></div>
      </div>
      <div class="sr-meters">
        <div class="sr-meter">
          <div class="sr-k">VELOCITY</div>
          <div class="sr-bar"><div class="sr-fill" id="sr-vel"></div><div class="sr-tick" style="left:66%"></div></div>
        </div>
        <div class="sr-meter">
          <div class="sr-k">DEADLINE</div>
          <div class="sr-bar"><div class="sr-fill sr-dead" id="sr-dl"></div></div>
        </div>
      </div>
      <div class="sr-ctrl" id="sr-ctrl"></div>
      <div class="sr-scan"></div>
      <div class="sr-vig" id="sr-vig"></div>
    `;
    document.body.appendChild(this.root);

    this.$score = this.root.querySelector('#sr-score');
    this.$clips = this.root.querySelector('#sr-clips');
    this.$floors = this.root.querySelector('#sr-floors');
    this.$best = this.root.querySelector('#sr-best');
    this.$vel = this.root.querySelector('#sr-vel');
    this.$dl = this.root.querySelector('#sr-dl');
    this.$vig = this.root.querySelector('#sr-vig');
    this.$ctrl = this.root.querySelector('#sr-ctrl');
    this.$ctrl.innerHTML =
      '&#9654;&#9664; RUN / BRAKE &nbsp;&nbsp; SPACE JUMP &nbsp;&nbsp; &#9660; ROLL &nbsp;&nbsp; ' +
      '&#9660;+SPACE SPIN DASH &nbsp;&nbsp; ESC QUIT';

    this.card = null;
    this.warn = null;
    this._lastClips = -1;
  }

  update(s) {
    if (this.$score.textContent !== String(s.score)) this.$score.textContent = s.score;
    if (this._lastClips !== s.clips) {
      this.$clips.textContent = s.clips;
      this.$clips.classList.remove('sr-punch');
      // reflow so the animation restarts on every pickup
      void this.$clips.offsetWidth;
      this.$clips.classList.add('sr-punch');
      this._lastClips = s.clips;
    }
    this.$floors.textContent = s.floors;
    this.$best.textContent = s.best;

    const v = Math.min(1, s.speed / (s.topSpeed * 1.5));
    this.$vel.style.width = (v * 100).toFixed(1) + '%';
    this.$vel.classList.toggle('sr-over', s.speed > s.topSpeed * 1.02);

    this.$dl.style.width = (Math.min(1, s.dread) * 100).toFixed(1) + '%';
    this.$vig.style.opacity = String(Math.max(0, (s.dread - 0.55) / 0.45) * 0.9);

    const warnOn = s.dread > 0.72 && !s.over;
    if (warnOn && !this.warn) {
      this.warn = document.createElement('div');
      this.warn.className = 'sr-warn';
      this.warn.textContent = 'DEADLINE';
      this.root.appendChild(this.warn);
    } else if (!warnOn && this.warn) {
      this.warn.remove();
      this.warn = null;
    }
  }

  pop(text) {
    const el = document.createElement('div');
    el.className = 'sr-pop';
    el.textContent = text;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 820);
  }

  showTitleCard() {
    this.showCard(`
      <div class="sr-title">SPRINT&nbsp;REVIEW</div>
      <div class="sr-sub">A TRUST OFFICER RUNS THE FLOOR</div>
      <div class="sr-rows" style="font-size:20px;color:#6fd8bb;line-height:2">
        HOLD &#9654; TO BUILD SPEED &nbsp;&middot;&nbsp; SPEED IS LIFE<br>
        ROLL DOWNHILL &nbsp;&middot;&nbsp; JUMP AT THE CREST<br>
        DO NOT LET THE QUARTER CLOSE ON YOU
      </div>
      <div class="sr-prompt">PRESS SPACE OR ENTER TO CLOCK IN<br>ESCAPE &mdash; BACK TO WORK</div>
    `);
  }

  showGameOver(o) {
    const unlocks = o.unlocks.map(u => `<div class="sr-unlock">&#9733; ${u}</div>`).join('');
    const bonus = o.tiers > 0
      ? `<div class="sr-unlock">&#9889; NEW RECORD &mdash; +${o.tiers} Assertiveness, +${o.tiers} Composure</div>`
      : '';
    this.showCard(`
      <div class="sr-dead">${o.cause}</div>
      <div class="sr-sub">${o.record ? '*** NEW HIGH SCORE ***' : o.flavour}</div>
      ${unlocks}${bonus}
      <div class="sr-rows">
        STORY POINTS: <span style="color:#ffd76a">${o.score}</span><br>
        PAPERCLIPS: <span style="color:#ffd76a">${o.clips}</span><br>
        FLOORS CLEARED: <span style="color:#ffd76a">${o.floors}</span><br>
        TOP VELOCITY: <span style="color:#ffd76a">${o.topSpeed}</span><br>
        HIGH SCORE: <span style="color:#ffd76a">${o.best}</span>
      </div>
      <div class="sr-prompt">ENTER &mdash; RUN IT BACK<br>ESCAPE &mdash; BACK TO WORK</div>
    `);
  }

  showCard(html) {
    this.hideCard();
    this.card = document.createElement('div');
    this.card.id = 'sr-card';
    this.card.innerHTML = html;
    this.root.appendChild(this.card);
  }

  hideCard() {
    if (this.card) { this.card.remove(); this.card = null; }
  }

  destroy() {
    if (this.root) this.root.remove();
    if (this.style) this.style.remove();
    this.root = null;
    this.style = null;
  }
}
