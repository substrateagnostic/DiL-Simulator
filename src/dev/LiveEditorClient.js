// LIVE EDITOR PREVIEW — dev-only SSE client (harvest of Andrew's bb552da,
// re-implemented for the batched-statics era).
//
// The Rooms-tab editor (npm run editor, :3747) broadcasts drag/rotate events
// over /api/live; this module applies them to the RUNNING game so furniture
// moves land without the save → Vite-full-reload → walk-out-walk-back-in
// loop that CLAUDE.md documents.
//
// HOW IT APPLIES A MOVE, and why it is a rebuild and not a mesh nudge:
// Andrew's original set `mesh.position` directly, which worked in April.
// Current `Room.build()` ends with `_mergeStatics()` — furniture groups are
// EMPTIED into per-material static batches, so there is no per-piece mesh
// left to nudge, and a nudge would also leave collision, interactables,
// seats, contact shadows and wall-art snapping stale. Instead this module
// mutates the same imported `room-overrides.json` module object that
// `Room.build()` reads, then re-runs `ExplorationState._loadRoom()` in
// place (the DevPanel Save-Scum load path) with the player kept where they
// stand. Everything re-derives through the shipping build path by
// construction. Rebuilds are debounced ~220 ms behind the last event, so a
// continuous drag settles into position the moment it rests.
//
// LOADED ONLY in dev: the sole importer is a dynamic import in
// ExplorationState.enter() behind `import.meta.env.DEV && DEV_MODE`, which
// Vite folds to `false` in `vite build` — the module is not emitted to
// dist/ at all (verified by grepping the bundle for api/live).
import roomOverrides from '../data/room-overrides.json' with { type: 'json' };

const EDITOR_SSE_URL = 'http://localhost:3747/api/live';
const REBUILD_DEBOUNCE_MS = 220;

export function connectLiveEditor(explorationState) {
  const ex = explorationState;
  let source = null;
  let rebuildTimer = null;
  let disposed = false;

  const scheduleRebuild = () => {
    if (disposed) return;
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (disposed) return;
      // Never rebuild the world under a combat/menu/dialog that owns the
      // screen — retry until exploration is live again.
      if (ex.paused) { scheduleRebuild(); return; }
      const p = ex.player;
      ex._loadRoom(p.currentRoom, p.position.x, p.position.z);
      console.info('[LiveEditor] room rebuilt with editor overrides');
    }, REBUILD_DEBOUNCE_MS);
  };

  const matchesCurrentRoom = (roomId) => {
    const canonical = ex.player.currentRoom;
    const resolved = ex._resolveRoomId ? ex._resolveRoomId(canonical) : canonical;
    return roomId === canonical || roomId === resolved;
  };

  const onMessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (!msg || !msg.roomId || !matchesCurrentRoom(msg.roomId)) return;

    if (msg.type === 'move') {
      const roomOv = (roomOverrides[msg.roomId] ||= {});
      const catOv = (roomOv[msg.category] ||= {});
      const entry = (catOv[String(msg.index)] ||= {});
      if (typeof msg.x === 'number') entry.x = msg.x;
      if (typeof msg.z === 'number') entry.z = msg.z;
      const rotKey = msg.category === 'npcs' ? 'facing' : 'rotation';
      if (typeof msg[rotKey] === 'number') entry[rotKey] = msg[rotKey];
      scheduleRebuild();
    } else if (msg.type === 'sync') {
      // Undo/redo/reset in the editor replaces the room's staged overrides
      // wholesale; mirror that here so the preview can also move BACK.
      const roomOv = (roomOverrides[msg.roomId] ||= {});
      for (const key of Object.keys(roomOv)) delete roomOv[key];
      Object.assign(roomOv, msg.overrides || {});
      scheduleRebuild();
    }
  };

  try {
    source = new EventSource(EDITOR_SSE_URL);
    source.onmessage = onMessage;
    // Silent when the editor server is not running; EventSource retries on
    // its own schedule and the game never notices.
    source.onerror = () => {};
  } catch {
    return () => {};
  }

  return function dispose() {
    disposed = true;
    clearTimeout(rebuildTimer);
    if (source) { source.close(); source = null; }
  };
}
