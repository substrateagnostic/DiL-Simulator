# RELEASE.md — TRUST ISSUES shipping notes

Two channels: **itch.io** (zip upload, relative-base build) and **Vercel**
(trustissues.alexgallefrom.io, auto-deploy from `main`, default absolute base).
They use different builds — see below. Do not upload the Vercel build to itch.

---

## itch.io upload checklist

1. `npm run package:itch`
   - Runs `vite build --base=./` (itch serves HTML5 games from a CDN
     subdirectory, so asset URLs must be relative), strips sourcemaps, and
     zips `dist/` contents into **`trust-issues-itch.zip`** at the repo root
     with `index.html` at the zip root (itch requires this).
2. itch.io → project → **Kind of project: HTML**.
3. Upload `trust-issues-itch.zip`, check **"This file will be played in the browser."**
4. Embed options:
   - **Viewport: 1280 × 720** (the game fills whatever container it gets;
     16:9 keeps the isometric framing and the combat HUD comfortable).
   - **Enable the Fullscreen button** — the game has no in-game fullscreen
     toggle yet (ROADMAP R2), so itch's button is the only way to go big.
   - Leave **"Automatically start on page load" OFF** — the first click also
     unlocks the Web Audio context, so a deliberate click-to-run is free UX.
   - **Mobile friendly**: touch controls exist, but combat QTE verification on
     touch is still open (ROADMAP R4). Leave unchecked until that's done.
   - **SharedArrayBuffer support**: not needed, leave off.
5. Classification: Games → Role Playing. Suggested tags: `satire`, `office`,
   `rpg`, `turn-based`, `comedy`, `singleplayer`, `pixel-art`.
6. Cover image / screenshots: pull from `screenshots/contact/` (1920×1080,
   regenerate with `npm run shoot`). **TODO: og.png / cover art (1200×630).**
7. Paste the page description below. Set visibility to Restricted/Draft for
   the friends-first round (ROADMAP R1).
8. Smoke-test the uploaded build in an incognito window: title → New Game →
   slot 1 → first room loads, music starts after a click, ESC opens the menu.

Optional later: butler push for one-command updates
(`butler push trust-issues-itch.zip <user>/trust-issues:html5`).

---

## Vercel notes

- Auto-deploys from `main`; framework preset **Vite**, build `npm run build`,
  output `dist/`. No `vercel.json` needed — static SPA-less single page.
- The Vercel build keeps the default absolute base (`/`) and sourcemaps —
  that's the debuggable build. Only the itch zip uses `--base=./`.
- The Rollup chunk-size warning during build is expected, not an error.
- `index.html` OG/Twitter tags point at `https://trustissues.alexgallefrom.io/og.png`
  — **that file does not exist yet** (TODO below). Drop a 1200×630 PNG in
  `public/og.png` and the tags light up with no further changes.

---

## Draft itch.io page description

> TRUST ISSUES is a satirical office RPG about wealth management, which is the
> practice of standing between other people's money and other people's relatives.
>
> You are Andrew, a trust officer. Your patience is your hit points. Your coffee
> is your mana. This morning the Henderson family arrived to contest an estate,
> all three of them, and the receptionist has stopped making eye contact, which
> historically precedes a quarter in which somebody cries in the supply closet.
> Combat is turn-based, in the sense that the Hendersons take turns and you take
> whatever is left. Survive the meeting and there are six more acts, each of
> which is somebody else's fault, and most of which lead upward — past Compliance,
> past the Archive, past an executive floor where something has been making
> recommendations. It does not threaten anyone. It has never needed to.
>
> Between catastrophes you can take walk-in clients at reception, decide whether
> their money is worth what comes attached to it, and spend the proceeds on
> coffee, composure training, and office décor your colleagues will have
> opinions about. The printer says HELP ME. This is probably fine.
>
> **Features**
> - Seven acts of corporate conspiracy, beginning with one contested estate and
>   ending considerably higher up the building
> - Turn-based combat with telegraphed attacks, brace and retaliate timing
>   minigames, a Confidence meter, and bosses with multiple phases
> - A repeatable client-intake roguelite — fight the paperwork, then choose
>   whether to accept the client (the assets) or decline (the dignity)
> - An AUM-funded supply shop: consumables, permanent stat upgrades, décor,
>   and post-game office renovations
> - 15 levels, 3 save slots, achievements, an enemy Journal, unlockable
>   cosmetics, and one fully playable arcade cabinet
> - Runs in the browser. Saves locally. Asks for nothing except your patience,
>   which it will take.

---

## Pre-release QA checklist

- [ ] **Cross-browser**: Chrome, Firefox, Edge, Safari (macOS + iOS). The
      WebGL guard in `index.html` shows a styled "OFFICE CLOSED" message when
      WebGL is unavailable — verify it by toggling hardware acceleration off.
- [ ] **Save compatibility (localStorage)**: saves are origin-scoped.
      - itch.io serves HTML5 builds from a shared origin
        (`html-classic.itch.zone`); keys are prefixed `trust_issues_save_`
        so collisions with other games are unlikely, and saves persist across
        re-uploads (new upload = new path, same origin).
      - itch.io browser saves, the itch desktop app, and the Vercel site are
        **three separate save pools** — players cannot move saves between them.
        Note this on the itch page if it comes up.
      - Incognito mode and "clear site data" wipe saves; no export feature yet
        (candidate for ROADMAP R2 alongside save versioning).
- [ ] **Loading/boot**: throttle network to Slow 3G — "LOADING THE OFFICE..."
      shows until the engine boots, then fades. Confirm `?dev` fixture pipeline
      still screenshots clean (`npm run shoot -- --only=room-cubicle_farm`).
- [ ] **Audio**: music/SFX start only after first click/keypress (autoplay
      policy) — confirmed pattern in `main.js`, re-verify inside the itch iframe.
- [ ] **Fresh-save playthrough** per act (ROADMAP R4) + `npm run check` green.
- [ ] **TODO og.png** (1200×630) in `public/` — used by OG/Twitter tags and
      reusable as the itch cover image.
- [ ] **TODO favicon at higher res** — current icon is an inline SVG data URI;
      fine for browsers, but itch and social embeds prefer a real PNG.
- [ ] **Touch**: QTEs (Brace/Retaliate) on a real phone before flipping the
      "Mobile friendly" switch on itch.
