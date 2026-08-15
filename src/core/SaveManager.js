const SAVE_KEY_PREFIX = 'trust_issues_save_';
const LEGACY_KEY = 'trust_issues_save';
const NUM_SLOTS = 3;

// Current on-disk save format. Bump this ONLY together with a migration step.
export const SAVE_VERSION = 1;

// Forward migrations, keyed by the version you are migrating FROM. Each step
// mutates (or returns) the save object and moves it exactly one version up;
// load() runs them in order until the save reaches SAVE_VERSION.
//
// Adding a v2 (worked example — do not delete this note):
//   1. export const SAVE_VERSION = 2;
//   2. add `1: (d) => { d.stats.grit = d.stats.grit ?? 0; return d; },`
//   3. leave the 0 step alone — old saves must still climb the whole ladder.
//
// Rules: steps must be pure-ish, total (never throw on a partial save), and
// idempotent-safe. Never delete player data in a migration — unknown fields
// ride along untouched, which is what makes a downgrade survivable.
const MIGRATIONS = {
  // Pre-versioned saves (shipped before `version` was written) are structurally
  // identical to v1 — Player.deserialize() already defaults every field — so
  // this step only stamps the version.
  0: (data) => data,
};

// ── THE CARRY CONTRACT (F-8) ────────────────────────────────────────────────
//
// WHY THIS EXISTS. `RELEASE.md` documents that itch-browser, itch-desktop and
// Vercel are three separate localStorage pools a player cannot move a save
// between — a completionist who plays the web build and then buys the desktop
// build starts over. That is the near-term job.
//
// The FAR-term job is Chapter 2. `.claude/plans/ch2/SEASON_SHEET.md` (producer
// round 6, co-signed): C2 opens from a card the player saved out of C1, and S3
// opens from C2's moral band. "Design the export schema with a version field
// and room to grow." So the envelope below is deliberately NOT the save blob:
//
//   ENVELOPE  (this file's contract, versioned by CARRY_VERSION)
//     └─ carry  the small, stable, hand-readable block a LATER CHAPTER reads
//     └─ save   the raw C1 blob, verbatim, for same-chapter pool transfer
//
// A future chapter reads `carry` and never has to understand a C1 save. A
// future C1 patch changes `save` and never has to touch `carry`. That split is
// the whole design.
//
// THREE RULES for anyone editing `carry`:
//   1. ADDITIVE ONLY. Never rename, never remove, never repurpose a key. A
//      reader that does not recognise a key must ignore it — so every reader
//      must be written to ignore unknown keys.
//   2. NO WHOLE-BLOB FLAGS. `carry.flags` is a WHITELIST (FLAGS_OF_RECORD), not
//      `player.flags`. `A1-ux-audit.md` C6 measured that every dialog choice
//      writes a permanent `_chose_…` flag, so a completionist blob is thousands
//      of keys of noise. A carry block a human can read in a text editor is the
//      point; it is also what keeps the CODE short enough to paste.
//   3. NO SAVE-FORMAT CHANGE. `A3-board-gating-design.md` rules export/import
//      is a read/write of the EXISTING blob. `save` is passed through untouched
//      and re-enters the game through the same `migrate()` ladder as any slot.
export const CARRY_VERSION = 1;
export const EXPORT_MAGIC = 'TRUSTISSUES';
const CODE_PREFIX = 'TI1-';

// The four C1 endings, in the order EpilogueState resolves them.
const ENDING_FLAGS = ['ending_architect', 'ending_dissolution', 'ending_compromise', 'ending_cooperative'];

// Flags a later chapter is allowed to know about. Story-defining only —
// anything a C2 cold open, a returning character, or an S3 opening state could
// plausibly need. Add rows freely; never delete one.
const FLAGS_OF_RECORD = [
  // Act spine
  'briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete',
  'act4_complete', 'act5_complete', 'act6_complete', 'algorithm_defeated',
  // Which Henderson branch the player took
  'path_legal', 'path_bro', 'path_grandma',
  // The voice profile — how Andrew won, which C2 reads as who he is now
  'andrew_invoked_charter', 'andrew_steadied', 'andrew_hardened',
  // The board meeting and its outcome tiers
  'board_meeting_held', 'board_meeting_won', 'board_member_spoke',
  // Act 6½, the city chapter
  'charter_certified', 'defeated_the_firm', 'meter_war_done', 'bus515_done',
  'has_recorder_seal', 'delia_moved',
  // Objects and people who could return
  'has_rolex', 'has_charter', 'janitor_names_complete', 'janitor_riddle_3_done',
  'read_janitor_pattern', 'floor_13_found', 'whisper_monitor_seen',
  'daemon_kept', 'daemon_killed', 'knows_server_secret',
  // Allies, by their recruit flags
  'janet_rallied', 'diane_rallied', 'isaiah_rallied', 'alex_rallied',
  'janitor_rallied', 'skip_speech_ready',
  // ADDITIVE (rule 1): `alex_rallied` and `isaiah_rallied` above are written by
  // NOTHING — repo-wide, their only occurrence is this list — so every carry
  // card ever exported has reported Alex and Isaiah as never-rallied. These are
  // the flags their recruitment actually writes. The two dead keys stay,
  // because removing a key is the one thing this contract forbids.
  'alex_it_recruited', 'isaiah_recruited',
  // Renovations — the building's physical state at handoff
  'renovation_espresso_bar', 'renovation_catering_fridge',
  'renovation_ergonomic_workstations', 'renovation_projection_wall',
  'renovation_corner_office', 'renovation_penthouse',
];

class SaveManagerClass {
  constructor() {
    this._activeSlot = 1;
  }

  setActiveSlot(slot) {
    this._activeSlot = slot;
  }

  getActiveSlot() {
    return this._activeSlot;
  }

  _key(slot) {
    return `${SAVE_KEY_PREFIX}${slot}`;
  }

  save(gameData, slot = this._activeSlot) {
    try {
      const data = {
        ...gameData,
        timestamp: Date.now(),
        version: SAVE_VERSION,
      };
      localStorage.setItem(this._key(slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  /**
   * Bring a parsed save up to SAVE_VERSION. Never throws and never discards a
   * save: an unmigratable or future-version save is handed back as-is so the
   * player still gets their playthrough (Player.deserialize defaults anything
   * missing) rather than a wiped slot.
   */
  migrate(data) {
    if (!data || typeof data !== 'object') return data;

    let version = Number.isFinite(data.version) ? data.version : 0;

    // Save written by a NEWER build (player rolled back / opened an older
    // deploy). Load it optimistically — do not rewrite, do not delete.
    if (version > SAVE_VERSION) {
      console.warn(`Save is from a newer version (v${version} > v${SAVE_VERSION}); loading as-is.`);
      return data;
    }

    while (version < SAVE_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) {
        console.warn(`No save migration from v${version}; loading as-is.`);
        return data;
      }
      try {
        data = step(data) || data;
      } catch (e) {
        console.error(`Save migration v${version} → v${version + 1} failed; loading as-is.`, e);
        return data;
      }
      version += 1;
      data.version = version;
    }
    // Not written back here on purpose — the next autosave persists the new
    // version, so a failed session can't corrupt a slot on mere inspection.
    return data;
  }

  load(slot = this._activeSlot) {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) {
        // Legacy key migration: old single-save format → slot 1
        if (slot === 1) {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
            localStorage.setItem(this._key(1), legacy);
            localStorage.removeItem(LEGACY_KEY);
            return this.migrate(JSON.parse(legacy));
          }
        }
        return null;
      }
      return this.migrate(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load save:', e);
      return null;
    }
  }

  hasSave(slot) {
    if (slot === undefined) {
      for (let i = 1; i <= NUM_SLOTS; i++) {
        if (this.hasSave(i)) return true;
      }
      return false;
    }
    const hasNew = localStorage.getItem(this._key(slot)) !== null;
    if (!hasNew && slot === 1) {
      return localStorage.getItem(LEGACY_KEY) !== null;
    }
    return hasNew;
  }

  deleteSave(slot) {
    localStorage.removeItem(this._key(slot));
  }

  getSaveInfo(slot) {
    try {
      let raw = localStorage.getItem(this._key(slot));
      if (!raw && slot === 1) raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        level: parsed.stats?.level ?? 1,
        currentRoom: parsed.currentRoom ?? 'cubicle_farm',
        timestamp: parsed.timestamp ?? 0,
        version: Number.isFinite(parsed.version) ? parsed.version : 0,
      };
    } catch {
      return null;
    }
  }

  getSlotCount() {
    return NUM_SLOTS;
  }

  // ── EXPORT / IMPORT ──────────────────────────────────────────────────────

  /**
   * Derive the carry block from a raw save blob. Pure — no DOM, no storage —
   * so it is unit-testable and so C2 can reuse the shape verbatim.
   *
   * `moralBand` and `breaches` are written as null / 0 by C1 ON PURPOSE. The
   * breach mechanic is a C2 system (SEASON_SHEET producer round 5); the keys
   * exist here so a C1 export made TODAY still parses in a C2 reader without a
   * second envelope version. Room to grow means reserving the room.
   */
  buildCarry(data) {
    const flags = data?.flags || {};
    const stats = data?.stats || {};
    const carriedFlags = {};
    for (const k of FLAGS_OF_RECORD) if (flags[k]) carriedFlags[k] = true;

    const ending = ENDING_FLAGS.find(f => flags[f]) || null;

    return {
      carryVersion: CARRY_VERSION,
      chapter: 1,
      // Where the story actually got to. `finished` is the honest signal for a
      // C2 cold open; a mid-run export is still a legal export.
      finished: !!flags.algorithm_defeated,
      ending: ending ? ending.replace('ending_', '') : null,
      act: data?.actIndex ?? 0,
      // C2 systems, reserved. See the note above — do not delete, do not rename.
      moralBand: null,
      breaches: 0,
      // Numbers a later chapter can dramatise without needing the blob.
      ngPlus: flags.ng_plus_count || 0,
      level: stats.level || 1,
      aum: stats.aum || 0,
      deaths: data?.deaths || 0,
      party: Array.isArray(data?.party) ? [...data.party] : [],
      voiceCounts: { ...(data?.voiceCounts || {}) },
      flags: carriedFlags,
    };
  }

  /** The full export envelope for a slot (or for a live blob). */
  buildExportPayload(slotOrData = this._activeSlot) {
    const data = (typeof slotOrData === 'object' && slotOrData)
      ? slotOrData
      : this.load(slotOrData);
    if (!data) return null;
    return {
      fmt: EXPORT_MAGIC,
      fmtVersion: CARRY_VERSION,
      saveVersion: Number.isFinite(data.version) ? data.version : SAVE_VERSION,
      exportedAt: Date.now(),
      carry: this.buildCarry(data),
      save: data,
    };
  }

  /**
   * Encode an envelope as a paste-able code.
   *
   * Compressed when the platform has CompressionStream (every browser this
   * game ships to), plain otherwise — the prefix says which, so a code made on
   * one platform always decodes on another. A completionist blob is ~40-90 KB
   * of JSON and gzip takes it to roughly a tenth of that; without the squeeze
   * the "code" is a wall of text nobody will move between two machines.
   */
  async encodeExport(payload) {
    const json = JSON.stringify(payload);              // never pretty-printed
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream === 'function') {
      try {
        const cs = new CompressionStream('gzip');
        const packed = new Response(
          new Blob([bytes]).stream().pipeThrough(cs)
        );
        const buf = new Uint8Array(await packed.arrayBuffer());
        return CODE_PREFIX + 'Z' + _b64(buf);
      } catch { /* fall through to the plain path */ }
    }
    return CODE_PREFIX + 'P' + _b64(bytes);
  }

  /** Decode a code back to an envelope. Never throws; returns null on garbage. */
  async decodeExport(code) {
    if (typeof code !== 'string') return null;
    // Players paste with newlines, spaces and stray quotes. Strip all of it.
    const clean = code.trim().replace(/\s+/g, '').replace(/^["']|["']$/g, '');
    if (!clean.startsWith(CODE_PREFIX)) return null;
    const mode = clean[CODE_PREFIX.length];
    const body = clean.slice(CODE_PREFIX.length + 1);
    try {
      let bytes = _unb64(body);
      if (mode === 'Z') {
        if (typeof DecompressionStream !== 'function') return null;
        const ds = new DecompressionStream('gzip');
        const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
        bytes = new Uint8Array(await out.arrayBuffer());
      } else if (mode !== 'P') {
        return null;
      }
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      return this.validateExport(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Structural gate for anything claiming to be an envelope — a pasted code, a
   * dropped file, or a C2 reader's input. Returns the envelope or null.
   * Deliberately permissive about UNKNOWN keys (rule 1) and strict about the
   * three that decide whether this is our data at all.
   */
  validateExport(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.fmt !== EXPORT_MAGIC) return null;
    if (!Number.isFinite(obj.fmtVersion)) return null;
    if (!obj.save || typeof obj.save !== 'object') return null;
    // A future-version envelope is READ, not rejected: the same forward
    // tolerance migrate() already gives a future save. The carry block is
    // additive by contract, so the keys we know are still where we left them.
    if (obj.fmtVersion > CARRY_VERSION) {
      console.warn(`Save export is from a newer format (v${obj.fmtVersion} > v${CARRY_VERSION}); reading what we recognise.`);
    }
    if (!obj.carry || typeof obj.carry !== 'object') obj.carry = this.buildCarry(obj.save);
    return obj;
  }

  /** Write an imported envelope's save blob into a slot. Returns true on write. */
  applyImport(payload, slot = this._activeSlot) {
    const env = this.validateExport(payload);
    if (!env) return false;
    const migrated = this.migrate(env.save) || env.save;
    try {
      localStorage.setItem(this._key(slot), JSON.stringify({
        ...migrated,
        // A transferred save is not a fresh one; keep its own timestamp out of
        // the future by re-stamping at import so slot ordering stays sane.
        timestamp: Date.now(),
        version: Number.isFinite(migrated.version) ? migrated.version : SAVE_VERSION,
      }));
      return true;
    } catch (e) {
      console.error('Failed to apply imported save:', e);
      return false;
    }
  }

  /**
   * A human-readable summary of a carry block — the "card" half of the
   * producer's title-card instinct. Used by the Transfer panel before export
   * and, later, by C2's opening card after import.
   */
  describeCarry(carry) {
    if (!carry) return [];
    const ENDING_NAMES = {
      cooperative: 'The Cooperative Ending',
      compromise: 'The Compromise',
      dissolution: 'Dissolution',
      architect: 'The Architect',
    };
    const rows = [
      ['Chapter', `${carry.chapter} — TRUST ISSUES`],
      ['Standing', carry.finished ? (ENDING_NAMES[carry.ending] || 'Complete') : `Act ${carry.act} — in progress`],
      ['Andrew', `Level ${carry.level}`],
      ['Under management', `$${(carry.aum || 0).toLocaleString()}`],
    ];
    if (carry.party?.length) rows.push(['Team', `${carry.party.length} at his back`]);
    if (carry.ngPlus) rows.push(['Laps', `${carry.ngPlus + 1}`]);
    if (carry.deaths) rows.push(['Performance improvement plans', `${carry.deaths}`]);
    // The voice profile — how he won, which is what C2 actually inherits.
    const f = carry.flags || {};
    const voice = f.andrew_invoked_charter ? 'read the charter aloud'
      : f.andrew_steadied ? 'stayed himself'
      : f.andrew_hardened ? 'did not fully come back'
      : null;
    if (voice) rows.push(['On the record', voice]);
    return rows;
  }
}

// ── base64 helpers ──────────────────────────────────────────────────────────
// btoa/atob are byte-oriented, so the bytes must be chunked (a spread of a
// 90 KB array into String.fromCharCode blows the argument limit).
function _b64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(s);
}
function _unb64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const SaveManager = new SaveManagerClass();
