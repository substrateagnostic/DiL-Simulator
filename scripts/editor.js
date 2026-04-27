// Balance + Room editor server — run with: npm run editor
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BALANCE_PATH          = path.join(ROOT, 'src', 'data', 'balance.json');
const ROOM_OVERRIDES_PATH   = path.join(ROOT, 'src', 'data', 'room-overrides.json');
const CHAR_OVERRIDES_PATH   = path.join(ROOT, 'src', 'data', 'character-overrides.json');
const EDITOR_HTML           = path.join(ROOT, 'editor', 'index.html');
const PORT = 3747;

// ── Module cache ──────────────────────────────────────────────────
let _rooms = null, _encounters = null, _characters = null, _dialogs = null;

// ── Live preview (SSE) ────────────────────────────────────────────
let sseClients = [];
function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter(c => !c.destroyed);
  sseClients.forEach(c => { try { c.write(msg); } catch {} });
}

async function imp(relPath) {
  const url = pathToFileURL(path.join(ROOT, relPath)).href;
  return import(url);
}

async function getRooms()      { if (!_rooms)      { _rooms      = (await imp('src/data/rooms/index.js')).ROOMS;             } return _rooms; }
async function getEncounters() { if (!_encounters) { _encounters = (await imp('src/data/encounters/index.js')).ENCOUNTERS;   } return _encounters; }
async function getCharacters() { if (!_characters) { _characters = (await imp('src/data/characters.js')).CHARACTER_CONFIGS; } return _characters; }
async function getDialogs()    { if (!_dialogs)    { _dialogs    = (await imp('src/data/dialogs/index.js')).DIALOGS;         } return _dialogs; }

// ── File helpers ──────────────────────────────────────────────────
const readJson  = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8');

function writeBalance(d) {
  const note = 'Edit via `npm run editor`. Do not edit manually.';
  writeJson(BALANCE_PATH, { _note: note, player: d.player, enemies: d.enemies, abilities: d.abilities, shop: d.shop });
}

function runGit(args) {
  return new Promise((resolve, reject) =>
    execFile('git', args, { cwd: ROOT }, (err, out, err2) => err ? reject(err2 || err.message) : resolve(out + err2)));
}

function runNpm(args) {
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolve, reject) =>
    execFile(cmd, args, { cwd: ROOT }, (err, out, err2) => err ? reject(err2 || err.message) : resolve(out + err2)));
}

function readBody(req) {
  return new Promise((res, rej) => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => res(b));
    req.on('error', rej);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function text(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(data);
}

// ── Server ────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  // Editor HTML
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(EDITOR_HTML, 'utf8'));
  }

  // ── Balance ───────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/balance') return json(res, readJson(BALANCE_PATH));
  if (req.method === 'POST' && pathname === '/api/balance') {
    try { writeBalance(JSON.parse(await readBody(req))); json(res, { ok: true }); }
    catch (e) { json(res, { error: String(e) }, 400); }
    return;
  }

  // ── Rooms ─────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/rooms') {
    try {
      const rooms = await getRooms();
      json(res, Object.values(rooms).map(r => ({ id: r.id, name: r.name, width: r.width, height: r.height })));
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/(.+)$/);
  if (req.method === 'GET' && roomMatch) {
    try {
      const rooms = await getRooms();
      const room = rooms[roomMatch[1]];
      if (!room) return json(res, { error: 'Not found' }, 404);
      json(res, {
        id: room.id, name: room.name, width: room.width, height: room.height,
        furniture: (room.furniture || []).map(f => ({ type: f.type, x: f.x, z: f.z, rotation: f.rotation ?? null, y: f.y ?? null })),
        npcs: (room.npcs || []).map(n => ({ id: n.id, x: n.x, z: n.z, facing: n.facing ?? null, condition: n.condition ?? null })),
        exits: (room.exits || []).map(e => ({ x: e.x, z: e.z, targetRoom: e.targetRoom ?? null })),
      });
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  if (req.method === 'GET'  && pathname === '/api/room-overrides') return json(res, readJson(ROOM_OVERRIDES_PATH));
  if (req.method === 'POST' && pathname === '/api/room-overrides') {
    try { writeJson(ROOM_OVERRIDES_PATH, JSON.parse(await readBody(req))); json(res, { ok: true }); }
    catch (e) { json(res, { error: String(e) }, 400); }
    return;
  }

  // ── Live preview ──────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
    return;
  }
  if (req.method === 'POST' && pathname === '/api/live-move') {
    try { broadcast({ type: 'move', ...JSON.parse(await readBody(req)) }); json(res, { ok: true }); }
    catch (e) { json(res, { error: String(e) }, 400); }
    return;
  }

  // ── Encounters ────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/encounters') {
    try {
      const enc = await getEncounters();
      json(res, Object.entries(enc).map(([id, e]) => ({
        id, enemyId: e.enemyId, canFlee: e.canFlee,
        preDialogId: e.preDialogId, postDialogId: e.postDialogId,
      })));
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  // ── Characters ────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/characters') {
    try {
      const chars = await getCharacters();
      const COLOR_FIELDS = ['bodyColor', 'pantsColor', 'shirtColor', 'tieColor', 'skinColor', 'hairColor'];
      const result = {};
      for (const [id, cfg] of Object.entries(chars)) {
        result[id] = { name: cfg.name, hairStyle: cfg.hairStyle, accessories: cfg.accessories || [] };
        for (const f of COLOR_FIELDS) result[id][f] = cfg[f] ?? null;
      }
      json(res, result);
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  if (req.method === 'GET'  && pathname === '/api/character-overrides') return json(res, readJson(CHAR_OVERRIDES_PATH));
  if (req.method === 'POST' && pathname === '/api/character-overrides') {
    try { writeJson(CHAR_OVERRIDES_PATH, JSON.parse(await readBody(req))); json(res, { ok: true }); }
    catch (e) { json(res, { error: String(e) }, 400); }
    return;
  }

  // ── Dialogs ───────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/dialogs') {
    try {
      const dialogs = await getDialogs();
      const summary = {};
      for (const [id, nodes] of Object.entries(dialogs)) {
        const speakers = [...new Set(nodes.filter(n => n.speaker).map(n => n.speaker))];
        const firstText = nodes.find(n => n.type === 'text' || n.type === 'choice');
        const text = firstText?.text || firstText?.prompt || '';
        summary[id] = {
          nodeCount: nodes.length,
          speakers,
          firstText: text.slice(0, 80),
        };
      }
      json(res, summary);
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  const dialogMatch = pathname.match(/^\/api\/dialogs\/(.+)$/);
  if (req.method === 'GET' && dialogMatch) {
    try {
      const dialogs = await getDialogs();
      const dialog = dialogs[dialogMatch[1]];
      if (!dialog) return json(res, { error: 'Not found' }, 404);
      json(res, dialog);
    } catch (e) { json(res, { error: String(e) }, 500); }
    return;
  }

  // ── Diff ──────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/diff') {
    try {
      const out = await runGit(['diff', 'HEAD', '--',
        'src/data/balance.json', 'src/data/room-overrides.json', 'src/data/character-overrides.json']);
      text(res, out || '(no uncommitted changes)');
    } catch (e) { text(res, 'git diff failed: ' + e, 500); }
    return;
  }

  // ── Build / Publish ───────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/build') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('Running npm run build...\n');
    try { res.end('BUILD SUCCESS\n' + await runNpm(['run', 'build'])); }
    catch (e) { res.end('BUILD FAILED\n' + e); }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/publish') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    const send = s => res.write(s + '\n');
    try {
      send('> git add src/data/balance.json src/data/room-overrides.json src/data/character-overrides.json');
      send(await runGit(['add', 'src/data/balance.json', 'src/data/room-overrides.json', 'src/data/character-overrides.json']));
      send('> git commit -m "editor: update balance, rooms, and character overrides"');
      send(await runGit(['commit', '-m', 'editor: update balance, rooms, and character overrides']));
      send('> git push');
      send(await runGit(['push']));
      send('PUBLISH COMPLETE');
      res.end();
    } catch (e) { send('ERROR: ' + e); res.end(); }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log(`Editor running at http://localhost:${PORT}`));
