// package-itch.mjs — build + zip for itch.io. No dependencies.
//
//   npm run package:itch
//
// 1. Runs `vite build --base=./` (itch.io serves HTML5 games from a CDN
//    subdirectory, so asset URLs must be relative — the Vercel deploy keeps
//    the default absolute base via the normal `npm run build`).
// 2. Strips *.map files from dist/ (sourcemap: true in vite.config.js is for
//    the live site; maps roughly double the zip for no player benefit).
// 3. Zips dist/ CONTENTS into trust-issues-itch.zip at the repo root, so
//    index.html sits at the zip root — itch.io requires that.
//
// Zipping uses PowerShell Compress-Archive on Windows and `zip -r` elsewhere.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const zipName = 'trust-issues-itch.zip';
const zipPath = join(root, zipName);

function fail(msg) {
  console.error(`\n✗ package:itch failed — ${msg}`);
  process.exit(1);
}

// ── 1. Build ──────────────────────────────────────────────────────────────
console.log('› vite build --base=./');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) fail('vite not found — run npm install first');
const build = spawnSync(process.execPath, [viteBin, 'build', '--base=./'], {
  cwd: root,
  stdio: 'inherit',
});
if (build.status !== 0) fail(`vite build exited with ${build.status}`);
if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html missing after build');

// ── 2. Strip sourcemaps ───────────────────────────────────────────────────
let mapsRemoved = 0;
(function stripMaps(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) stripMaps(p);
    else if (entry.name.endsWith('.map')) { unlinkSync(p); mapsRemoved++; }
  }
})(dist);
console.log(`› stripped ${mapsRemoved} sourcemap file(s) from dist/`);

// ── 3. Zip ────────────────────────────────────────────────────────────────
if (existsSync(zipPath)) rmSync(zipPath); // zip(1) appends to existing archives
let zip;
if (process.platform === 'win32') {
  zip = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path 'dist/*' -DestinationPath '${zipName}' -Force`,
  ], { cwd: root, stdio: 'inherit' });
} else {
  zip = spawnSync('zip', ['-r', '-q', zipPath, '.'], { cwd: dist, stdio: 'inherit' });
}
if (!zip || zip.status !== 0) fail(`zip step exited with ${zip ? zip.status : 'spawn error'}`);
if (!existsSync(zipPath)) fail('zip file was not created');

const mb = (statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log(`\n✓ ${zipName} (${mb} MB) — index.html at zip root, ready for itch.io`);
