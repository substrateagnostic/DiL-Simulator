import { SaveManager } from '../core/SaveManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { ROOMS } from '../data/rooms/index.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { ENEMY_STATS } from '../data/stats.js';
import { ITEMS } from '../data/items.js';

// Dev-only panel (F2 in exploration with ?dev). Never reachable in normal play.
// Tabs: SAVES (save scum) | SKIP (act presets) | TELEPORT | FIGHT | FLAGS | CHEATS.
// All actions operate on the live ExplorationState instance passed in.

// PRESET LAW, learned the hard way:
//   1. The LABEL must match the act `_syncActFromFlags()` actually derives.
//      `branch_chosen` alone lifts you to act 2, so the old "Act 1" preset
//      landed in Act 2 and there was no way to reach the real Act 1 at all.
//   2. Every preset must leave the NPC conditions MUTUALLY EXCLUSIVE. Room
//      entries share an id and gate on one flag/notFlag pair, so a half-set
//      state spawns two of the same character standing inside each other.
//      Verify with `node tools/_ux-dev.mjs` — it counts duplicate visible NPCs
//      across all 26 rooms for every preset, and must report 0.
export const DEV_PRESETS = [
  {
    key: 'act1',
    label: 'Act 1 — Briefing Complete (Karen is waiting)',
    flags: {
      // No `branch_chosen`: this is the REAL Act 1 — Karen live in the
      // conference room, the roguelite tutorial ahead of you.
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true,
    },
  },
  {
    key: 'act2',
    label: 'Act 2 — Branch Chosen (finale)',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
    },
  },
  {
    key: 'act3',
    label: 'Act 3 — Hendersons Defeated',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
      defeated_compliance: true, defeated_regional: true, defeated_ross_boss: true,
      act2_complete: true,
    },
  },
  {
    key: 'act4',
    label: 'Act 4 — Archive Evidence Found',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
      defeated_compliance: true, defeated_regional: true, defeated_ross_boss: true,
      act2_complete: true,
      knows_server_secret: true, alex_it_act3_done: true,
      has_archive_password: true, has_archive_evidence: true,
      act3_complete: true,
    },
  },
  {
    key: 'act5',
    label: 'Act 5 — Charter Recovered',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
      defeated_compliance: true, defeated_regional: true, defeated_ross_boss: true,
      act2_complete: true,
      knows_server_secret: true, alex_it_act3_done: true,
      has_archive_password: true, has_archive_evidence: true,
      act3_complete: true,
      met_janitor: true, janitor_rallied: true, ross_rallied: true, vault_accessible: true, hr_accessible: true, vault_code_1: true,
      has_charter: true, act4_complete: true,
    },
  },
  {
    key: 'act6',
    label: 'Act 6 — Meredith Defeated',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
      defeated_compliance: true, defeated_regional: true, defeated_ross_boss: true,
      act2_complete: true,
      knows_server_secret: true, alex_it_act3_done: true,
      has_archive_password: true, has_archive_evidence: true,
      act3_complete: true,
      met_janitor: true, janitor_rallied: true, ross_rallied: true, vault_accessible: true, hr_accessible: true, vault_code_1: true,
      has_charter: true, act4_complete: true,
      act5_triggered: true, janet_recruited: true,
      restructuring_trio_started: true, restructuring_trio_defeated: true,
      brand_consultant_fight_started: true, brand_consultant_defeated: true,
      restructuring_fight_started: true, restructuring_analyst_defeated: true, restructuring_defeated: true,
      data_lead_fight_started: true, data_lead_defeated: true,
      chief_fight_started: true, chief_restructuring_defeated: true,
      corporate_lawyer_defeated: true, board_room_accessible: true,
      rachel_fight_started: true, act5_complete: true,
    },
  },
  {
    key: 'act7',
    label: 'Act 7 — Penthouse Unlocked',
    flags: {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true, branch_chosen: true,
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      ross_post_karen: true, chad_defeated: true, defeated_chad: true,
      grandma_defeated: true, defeated_grandma: true,
      defeated_compliance: true, defeated_regional: true, defeated_ross_boss: true,
      act2_complete: true,
      knows_server_secret: true, alex_it_act3_done: true,
      has_archive_password: true, has_archive_evidence: true,
      act3_complete: true,
      met_janitor: true, janitor_rallied: true, ross_rallied: true, vault_accessible: true, hr_accessible: true, vault_code_1: true,
      has_charter: true, act4_complete: true,
      act5_triggered: true, janet_recruited: true,
      restructuring_trio_started: true, restructuring_trio_defeated: true,
      brand_consultant_fight_started: true, brand_consultant_defeated: true,
      restructuring_fight_started: true, restructuring_analyst_defeated: true, restructuring_defeated: true,
      data_lead_fight_started: true, data_lead_defeated: true,
      chief_fight_started: true, chief_restructuring_defeated: true,
      corporate_lawyer_defeated: true, board_room_accessible: true,
      rachel_fight_started: true, act5_complete: true,
      janet_rallied: true, diane_rallied: true, ross_rallied: true,
      janet_act6_rallied: true, diane_act6_rallied: true, diane_evidence: true,
      read_janitor_act3: true,
      // `act6_ready` and `ross_speech_ready` are DERIVED in normal play and the
      // preset skips the beats that derive them, so without them two Act-6 NPC
      // entries stay live alongside their Act-7 replacements: the archive
      // Janitor (`act5_complete && !act6_ready` vs `has_rolex`) and Skip in his
      // office (`act2_complete && !ross_speech_ready` vs `board_meeting_closed
      // && !regional_director_defeated`) each spawned twice on the same tile.
      ross_speech_ready: true, act6_ready: true,
      has_rolex: true, act6_complete: true,
    },
  },
];

let lastTab = 'SAVES';

export function showDevPanel(ex) {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  Object.assign(panel.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#0a0a14', border: '2px solid #e94560',
    padding: '16px', zIndex: '9999',
    fontFamily: 'monospace', color: '#e94560',
    width: '620px', maxHeight: '82vh',
    display: 'flex', flexDirection: 'column',
  });
  panel.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:13px;letter-spacing:2px">[DEV] PANEL</span>
      <span style="font-size:9px;color:#444">ESC / F2 to close</span>
    </div>
    <div id="dev-status" style="font-size:9px;color:#6a8aaa;margin-bottom:10px;letter-spacing:0.5px"></div>
    <div id="dev-tabs" style="display:flex;gap:4px;margin-bottom:10px"></div>
    <div id="dev-tab-content" style="overflow-y:auto;flex:1;min-height:280px;max-height:52vh"></div>
  `;
  document.body.appendChild(panel);

  const statusEl = panel.querySelector('#dev-status');
  const updateStatus = () => {
    const p = ex.player;
    statusEl.textContent =
      `${p.currentRoom} (${p.position.x.toFixed(1)}, ${p.position.z.toFixed(1)})`
      + ` · Lv ${p.stats.level} · HP ${p.stats.hp}/${p.stats.maxHP} · MP ${p.stats.mp}/${p.stats.maxMP}`
      + ` · AUM $${(p.stats.aum || 0).toLocaleString()} · Act ${p.actIndex} · UP ${p.upgradePoints}`;
  };
  updateStatus();
  const statusTimer = setInterval(updateStatus, 250);

  const close = () => {
    clearInterval(statusTimer);
    panel.remove();
    document.removeEventListener('keydown', closeHandler);
  };
  panel._devClose = close;
  const closeHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', closeHandler);

  const _fmtTime = (ts) => {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const _btn = (label, accent, onClick) => {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      background: '#1a1a2e', border: `1px solid ${accent || '#333'}`,
      color: accent ? '#fff' : '#bbb', padding: '5px 10px',
      fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer',
    });
    b.addEventListener('mouseover', () => { b.style.borderColor = '#e94560'; b.style.color = '#fff'; });
    b.addEventListener('mouseout', () => { b.style.borderColor = accent || '#333'; b.style.color = accent ? '#fff' : '#bbb'; });
    b.addEventListener('click', onClick);
    return b;
  };

  const content = panel.querySelector('#dev-tab-content');

  // ── Tab renderers ──────────────────────────────────────────────────

  const renderSaves = () => {
    content.innerHTML = '';
    for (let slot = 1; slot <= SaveManager.getSlotCount(); slot++) {
      const info = SaveManager.getSaveInfo(slot);
      const active = SaveManager.getActiveSlot() === slot;
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '6px',
        margin: '3px 0', padding: '6px 8px',
        background: active ? '#1a1a3a' : '#111',
        border: `1px solid ${active ? '#e94560' : '#222'}`,
      });
      const label = document.createElement('span');
      label.style.cssText = 'flex:1;font-size:10px;color:#bbb';
      label.textContent = info
        ? `Slot ${slot}${active ? ' ★' : ''}  |  Lv ${info.level}  |  ${info.currentRoom}  |  ${_fmtTime(info.timestamp)}`
        : `Slot ${slot}${active ? ' ★' : ''}  —  empty`;
      row.appendChild(label);
      row.appendChild(_btn('Save', '#4488ff', () => {
        SaveManager.setActiveSlot(slot);
        SaveManager.save(ex.player.serialize(), slot);
        renderSaves();
        ex._showToast(`[DEV] Saved to slot ${slot}`, 'objective');
      }));
      const loadBtn = _btn('Load', info ? '#44ff88' : null, () => {
        if (!info) return;
        const saveData = SaveManager.load(slot);
        if (!saveData) return;
        SaveManager.setActiveSlot(slot);
        ex.player.deserialize(saveData);
        ex._loadRoom(saveData.currentRoom, saveData.position?.x, saveData.position?.z);
        ex.syncFromPlayerState();
        ex.paused = false;
        close();
        ex._showToast(`[DEV] Loaded slot ${slot}`, 'objective');
      });
      if (!info) { loadBtn.disabled = true; loadBtn.style.opacity = '0.3'; }
      row.appendChild(loadBtn);
      content.appendChild(row);
    }
  };

  const renderSkip = () => {
    content.innerHTML = '';
    const note = document.createElement('div');
    note.style.cssText = 'font-size:9px;color:#666;margin-bottom:6px';
    note.textContent = 'Presets are cumulative. Some narrative read-flags are not included — a few dialogs may replay.';
    content.appendChild(note);
    DEV_PRESETS.forEach(preset => {
      const b = _btn(preset.label, null, () => {
        Object.assign(ex.player.flags, preset.flags);
        ex._syncActFromFlags();
        ex._refreshStoryProgress(true);
        close();
        ex._showToast(`[DEV] ${preset.label}`, 'objective');
      });
      Object.assign(b.style, { display: 'block', width: '100%', margin: '3px 0', textAlign: 'left', padding: '7px 10px', fontSize: '11px' });
      content.appendChild(b);
    });
  };

  const renderTeleport = () => {
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px';
    Object.keys(ROOMS).forEach(roomId => {
      const name = ROOMS[roomId].name || roomId;
      const b = _btn(`${name}  ·  ${roomId}`, null, () => {
        close();
        ex._loadRoom(roomId);
        AudioManager.playMusic(ex._getMusicForRoom(roomId));
        ex._updateLocationDisplay(roomId);
        ex.paused = false;
        ex._showToast(`[DEV] Teleported to ${roomId}`, 'objective');
      });
      Object.assign(b.style, { textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      grid.appendChild(b);
    });
    content.appendChild(grid);
  };

  const renderFight = () => {
    content.innerHTML = '';
    const note = document.createElement('div');
    note.style.cssText = 'font-size:9px;color:#666;margin-bottom:6px';
    note.textContent = 'Starts the encounter immediately (skips pre-dialog). Victory flags & post-dialogs fire normally.';
    content.appendChild(note);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px';
    Object.keys(ENCOUNTERS).forEach(encId => {
      const enc = ENCOUNTERS[encId];
      const enemy = ENEMY_STATS[enc.enemyId];
      const label = enemy ? `${enemy.name} (${enemy.maxHP} HP)` : encId;
      const b = _btn(`${label}  ·  ${encId}`, enc.boss ? '#aa66ff' : null, () => {
        close();
        ex._startCombat(encId);
      });
      Object.assign(b.style, { textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
      grid.appendChild(b);
    });
    content.appendChild(grid);
  };

  const renderFlags = () => {
    content.innerHTML = '';
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:6px;margin-bottom:8px';
    const inputStyle = 'flex:1;background:#111;border:1px solid #333;color:#ddd;font-family:monospace;font-size:10px;padding:5px 8px;outline:none';
    const addInput = document.createElement('input');
    addInput.placeholder = 'flag_name — Enter to set';
    addInput.style.cssText = inputStyle;
    addInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && addInput.value.trim()) {
        ex.player.setFlag(addInput.value.trim());
        ex._syncActFromFlags();
        ex._refreshStoryProgress(true);
        addInput.value = '';
        renderFlags();
      }
    });
    const filterInput = document.createElement('input');
    filterInput.placeholder = 'filter…';
    filterInput.style.cssText = inputStyle;
    filterInput.addEventListener('keydown', (e) => e.stopPropagation());
    controls.appendChild(addInput);
    controls.appendChild(filterInput);
    content.appendChild(controls);

    const list = document.createElement('div');
    content.appendChild(list);
    const renderList = () => {
      list.innerHTML = '';
      const filter = filterInput.value.trim().toLowerCase();
      const keys = Object.keys(ex.player.flags)
        .filter(k => ex.player.flags[k])
        .filter(k => !filter || k.toLowerCase().includes(filter))
        .sort();
      const count = document.createElement('div');
      count.style.cssText = 'font-size:9px;color:#666;margin-bottom:4px';
      count.textContent = `${keys.length} active flag${keys.length === 1 ? '' : 's'} — click ✕ to clear`;
      list.appendChild(count);
      keys.forEach(key => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 4px;border-bottom:1px solid #16162a';
        const name = document.createElement('span');
        name.style.cssText = 'flex:1;font-size:10px;color:#aaa';
        name.textContent = key;
        row.appendChild(name);
        const x = _btn('✕', null, () => {
          delete ex.player.flags[key];
          ex._syncActFromFlags();
          ex._refreshStoryProgress(true);
          renderList();
        });
        Object.assign(x.style, { padding: '1px 7px', fontSize: '9px' });
        row.appendChild(x);
        list.appendChild(row);
      });
    };
    filterInput.addEventListener('input', renderList);
    renderList();
  };

  const renderCheats = () => {
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px';
    const cheat = (label, fn) => grid.appendChild(_btn(label, '#ffaa44', () => {
      fn();
      updateStatus();
      ex._showToast(`[DEV] ${label}`, 'objective');
    }));
    cheat('+1,000 XP', () => ex.player.gainXP(1000));
    cheat('+10,000 XP', () => ex.player.gainXP(10000));
    cheat('Max Level', () => ex.player.gainXP(10_000_000));
    cheat('+100K AUM', () => { ex.player.stats.aum = (ex.player.stats.aum || 0) + 100_000; });
    cheat('+1M AUM', () => { ex.player.stats.aum = (ex.player.stats.aum || 0) + 1_000_000; });
    cheat('+10M AUM', () => { ex.player.stats.aum = (ex.player.stats.aum || 0) + 10_000_000; });
    cheat('Full Heal', () => ex.player.rest());
    cheat('All Items ×3', () => Object.keys(ITEMS).forEach(id => ex.player.addItem(id, 3)));
    cheat('+3 Upgrade Pts', () => { ex.player.upgradePoints += 3; });
    content.appendChild(grid);
  };

  // ── Tab bar ────────────────────────────────────────────────────────

  const TABS = {
    SAVES: renderSaves,
    SKIP: renderSkip,
    TELEPORT: renderTeleport,
    FIGHT: renderFight,
    FLAGS: renderFlags,
    CHEATS: renderCheats,
  };
  const tabsEl = panel.querySelector('#dev-tabs');
  const tabButtons = {};
  const selectTab = (name) => {
    lastTab = name;
    for (const [n, b] of Object.entries(tabButtons)) {
      b.style.background = n === name ? '#e94560' : '#1a1a2e';
      b.style.color = n === name ? '#0a0a14' : '#bbb';
      b.style.fontWeight = n === name ? 'bold' : 'normal';
    }
    TABS[name]();
  };
  Object.keys(TABS).forEach(name => {
    const b = _btn(name, null, () => selectTab(name));
    Object.assign(b.style, { flex: '1', padding: '6px 0', letterSpacing: '1px' });
    tabButtons[name] = b;
    tabsEl.appendChild(b);
  });
  selectTab(TABS[lastTab] ? lastTab : 'SAVES');
}
