// VaultKeypad — the knowledge gate.
//
// Every other lock in this building is a flag check: the game asks whether a
// boolean was set, never whether the player knows anything. This one asks the
// player. It accepts 47-19-82 regardless of story state, and the numbers
// genuinely exist in the world from minute one (the Janitor's supply closet in
// the parking garage, first room of the game).
//
// TWO DOORS USE IT, and that is the whole point. The Vault door is inside the
// Archive, and the Archive is behind `archive_accessible`, which the story does
// not set until Act 3 — so "you can open the Vault in Act 1" was a promise the
// MAP could not keep, no matter what the keypad accepted. The steel service
// door at the bottom of the stairwell now takes the same code, because a bank
// that runs one override sequence for every restricted door in the building is
// both the joke and the fix. With it, an attentive first-timer really can walk
// from the supply closet to the charter in Act 1, which is the Tunic payoff this
// feature exists for: "most of Tunic's 'unlocks' are actually the acquisition of
// knowledge."
//
// Pure DOM. Owns its own element, its own keydown listener, and nothing else.
// Callers get onSuccess/onCancel and are responsible for pausing themselves.

import { AudioManager } from '../core/AudioManager.js';

// The combination, canonical. `vault_boxes` in dialogs/index.js narrates the
// same three numbers when the story hands them over, and `janitor_closet`
// documents them as the building service override; keep all three in sync.
export const VAULT_COMBINATION = ['47', '19', '82'];

// ── Player-facing copy (drafted by Opus 4.6, wired verbatim) ────────────
// One entry per panel. `vault` is the Mosler on the vault door; `service` is
// the panel on the steel fire door at the bottom landing of the stairwell.
//
// It used to say "freight elevator" and describe a ride. The map disagrees:
// BUILDING_MAP puts the stairwell shaft at floor 2 spanning down to B2, the
// room's own landings walk the player down to Archive level, and
// ElevatorRide's LINKS table explicitly excludes stairwell>archive because
// "the stairwell↔archive run is stairs and keeps its vertical wipe". A door on
// a landing, not a vehicle — every line here is true to that now.
export const KEYPAD_COPY = {
  vault: {
    header: 'MOSLER SEQUENTIAL ACCESS TERMINAL',
    subhead: 'Twelve rubber keys in a 4x3 grid. The 7 sticks slightly on the way back up.',
    wrong: [
      'The tumblers do not move. The door remains exactly where it was.',
      "Nothing engages. The door's indifference is mechanical.",
      'The keypad clears itself with a click. The door does not comment.',
    ],
    empty: 'The keypad waits. It has done this before.',
  },
  service: {
    header: 'CORBIN RESTRICTED ACCESS OVERRIDE',
    subhead: 'The keypad is mounted on a steel fire door at the bottom of four concrete landings, its instruction label yellowed past the point of instruction.',
    wrong: [
      "The lock mechanism considers the combination briefly, then doesn't.",
      "A red LED blinks once — the door's way of not saying anything.",
      'Nothing happens, which the door appears to regard as the correct outcome.',
    ],
    empty: 'The combination requires three numbers. This was fewer.',
  },
};

const HINT = 'ENTER to submit. ESC to step away.';

export class VaultKeypad {
  /**
   * @param {(digits: string[]) => void} onSuccess fired with the entered code
   * @param {() => void} onCancel
   * @param {'vault'|'service'} panel which door is asking
   */
  constructor(onSuccess, onCancel, panel = 'vault') {
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.copy = KEYPAD_COPY[panel] || KEYPAD_COPY.vault;
    this.root = null;
    this._onKey = null;
    this._attempts = 0;
  }

  open() {
    if (this.root) return;
    const ui = document.getElementById('ui-overlay');
    if (!ui) return;

    this.root = document.createElement('div');
    this.root.id = 'vault-keypad';
    this.root.style.cssText = `
      position:absolute; inset:0; z-index:140;
      background:rgba(4,4,10,0.88);
      display:flex; align-items:center; justify-content:center;
      font-family:'VT323', monospace; color:#d8d4cc;`;

    this.root.innerHTML = `
      <div style="
        min-width:340px; max-width:92vw; padding:22px 26px 18px;
        background:linear-gradient(160deg,#14141c 0%,#0d0d15 100%);
        border:2px solid #e94560; border-radius:6px;
        box-shadow:0 0 34px rgba(233,69,96,0.22), inset 0 0 60px rgba(0,0,0,0.6);
        text-align:center;">
        <div style="font-family:'Press Start 2P',cursive; font-size:11px; color:#e94560;
                    letter-spacing:2px; margin-bottom:12px;">${this.copy.header}</div>
        <div style="font-size:18px; color:#8f8a80; line-height:1.35; margin-bottom:18px;">${this.copy.subhead}</div>
        <div id="vk-fields" style="display:flex; gap:12px; justify-content:center; margin-bottom:14px;"></div>
        <div id="vk-msg" style="min-height:24px; font-size:18px; color:#e9a045;"></div>
        <div style="font-size:15px; color:#555; margin-top:10px;">${HINT}</div>
      </div>`;

    const fields = this.root.querySelector('#vk-fields');
    this.inputs = [];
    for (let i = 0; i < 3; i++) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.maxLength = 2;
      inp.autocomplete = 'off';
      inp.style.cssText = `
        width:62px; padding:8px 0; text-align:center;
        font-family:'VT323', monospace; font-size:34px; color:#ffd700;
        background:#07070c; border:2px solid #3a3a52; border-radius:4px;
        outline:none; caret-color:#e94560;`;
      inp.addEventListener('focus', () => { inp.style.borderColor = '#e94560'; });
      inp.addEventListener('blur', () => { inp.style.borderColor = '#3a3a52'; });
      // Digits only, auto-advance on the second character.
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
        if (inp.value.length === 2 && i < 2) this.inputs[i + 1].focus();
      });
      fields.appendChild(inp);
      this.inputs.push(inp);
    }

    // The keypad owns the keyboard while it is up. InputManager keeps
    // tracking keys underneath, so the caller must pause its own state;
    // stopPropagation here keeps stray Enters out of dialog/menu handlers.
    this._onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        this.close();
        this.onCancel?.();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        this._submit();
        return;
      }
      if (e.key === 'Backspace') {
        const idx = this.inputs.indexOf(document.activeElement);
        if (idx > 0 && this.inputs[idx].value === '') {
          e.preventDefault();
          this.inputs[idx - 1].focus();
        }
      }
      // Everything else stays local to the field.
      e.stopPropagation();
    };
    document.addEventListener('keydown', this._onKey, true);

    ui.appendChild(this.root);
    this.inputs[0].focus();
  }

  _submit() {
    const digits = this.inputs.map(i => i.value.padStart(i.value.length ? 2 : 0, '0'));
    const msg = this.root.querySelector('#vk-msg');
    if (digits.some(d => d.length !== 2)) {
      msg.textContent = this.copy.empty;
      AudioManager.playSfx('cancel');
      return;
    }
    const ok = digits.every((d, i) => parseInt(d, 10) === parseInt(VAULT_COMBINATION[i], 10));
    if (!ok) {
      msg.textContent = this.copy.wrong[this._attempts % this.copy.wrong.length];
      this._attempts++;
      AudioManager.playSfx('cancel');
      for (const inp of this.inputs) inp.value = '';
      this.inputs[0].focus();
      return;
    }
    AudioManager.playSfx('confirm');
    this.close();
    this.onSuccess?.(digits);
  }

  close() {
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey, true);
      this._onKey = null;
    }
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.inputs = null;
  }
}
