// Global crash net.
//
// An uncaught exception inside the render loop used to leave the player staring
// at a frozen canvas with no idea whether their save survived (it always does —
// autosave writes on every room transition and every story victory). This shows
// one friendly full-screen panel instead, and offers a reload.
//
// Hard rules:
//   1. NEVER touch localStorage. A crash is not a reason to lose a save, and
//      "clear the save to fix it" is exactly the advice that loses playthroughs.
//   2. Always console.error the original error, with its stack, so a player can
//      paste it into a bug report.
//   3. Show at most one panel per page load; later errors only log.
//
// Styling is inline for the same reason the boot screen's is: if a stylesheet
// failed to load, the panel still has to render.

import { Engine } from './Engine.js';

const PANEL_ID = 'crash-panel';

// Noise that must never take the screen: benign browser chatter, audio
// autoplay rejections, and cross-origin "Script error." with no detail.
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /play\(\) request was interrupted/i,
  /The request is not allowed by the user agent/i,
  /NotAllowedError/i,
  /AbortError/i,
];

let installed = false;
let shown = false;

function isIgnorable(message) {
  const text = String(message || '');
  return IGNORED.some((re) => re.test(text));
}

function describe(err, fallback) {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object') {
    try { return JSON.stringify(err).slice(0, 300); } catch { /* fallthrough */ }
  }
  return String(fallback || 'Unknown error');
}

function showPanel(detail) {
  if (shown) return;
  shown = true;

  // Stop the render loop — a throwing frame throws every frame, and the panel
  // has to be readable. Never let this throw on the way out.
  try { Engine.stop(); } catch { /* ignore */ }

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; padding: 32px; text-align: center;
    background: #1a1a2e; color: #f0ead6;
    font-family: 'VT323', 'Courier New', monospace;
  `;

  const title = document.createElement('div');
  title.style.cssText = `font-size: 34px; letter-spacing: 2px; color: #e94560;`;
  title.textContent = 'THE BUILDING SHUDDERED.';

  const reassure = document.createElement('div');
  reassure.style.cssText = `font-size: 22px; color: #f0ead6; max-width: 560px; line-height: 1.4;`;
  reassure.textContent = 'Your progress is safe. Nothing was deleted — your save is exactly where you left it. Facilities has been notified. Facilities is you.';

  const button = document.createElement('button');
  button.textContent = 'RELOAD THE OFFICE';
  button.style.cssText = `
    margin-top: 6px; padding: 12px 26px;
    font-family: inherit; font-size: 22px; letter-spacing: 1px;
    color: #1a1a2e; background: #e94560;
    border: 3px solid #f0ead6; border-radius: 4px; cursor: pointer;
  `;
  button.addEventListener('click', () => window.location.reload());

  const detailEl = document.createElement('div');
  detailEl.style.cssText = `
    margin-top: 10px; max-width: 720px;
    font-size: 15px; line-height: 1.35; color: #7a8296;
    word-break: break-word;
  `;
  detailEl.textContent = `${detail}  —  full stack is in the browser console (F12) if you're filing a report.`;

  panel.appendChild(title);
  panel.appendChild(reassure);
  panel.appendChild(button);
  panel.appendChild(detailEl);
  (document.body || document.documentElement).appendChild(panel);

  // Boot screen may still be up if the crash happened during init
  const boot = document.getElementById('boot-screen');
  if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
}

export function installErrorBoundary() {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    // Resource load failures (img/audio/script) fire 'error' on the element,
    // not on window, and are not crashes.
    if (event.target && event.target !== window && !event.error && !event.message) return;
    const detail = describe(event.error, event.message);
    if (isIgnorable(detail) || isIgnorable(event.message)) {
      console.warn('[ErrorBoundary] ignored:', detail);
      return;
    }
    console.error('[ErrorBoundary] uncaught error:', event.error || event.message, event.error?.stack || '');
    showPanel(detail);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const detail = describe(event.reason, 'Unhandled promise rejection');
    if (isIgnorable(detail)) {
      console.warn('[ErrorBoundary] ignored rejection:', detail);
      return;
    }
    console.error('[ErrorBoundary] unhandled rejection:', event.reason, event.reason?.stack || '');
    showPanel(detail);
  });
}
