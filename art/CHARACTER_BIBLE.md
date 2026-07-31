# CHARACTER BIBLE — v6 art direction

*2026-07-27. Ruled by the director. Supersedes the v5 build in
`src/entities/CharacterBuilder.js` + `FacePainter.js`. Companion to
`art/COMP_CARD.md` and the `.claude/plans/display-case-rebuild.md` L2 addendum.*

> **PRODUCER AMENDMENTS (Alex, 2026-07-29 ~23:30 — LAW, supersedes where
> in tension):**
> 1. **HAIR CONTAINMENT:** hair masses must NEVER wrap forward past the
>    ear line at or below jaw level — "Andrew's hair turns into a beard."
>    Occiput mass ends ABOVE the collar. Verify from 3/4 AND side views.
> 2. **NECKS ARE TOO WIDE:** tighten — neck radius ≤ ~0.55 of head radius
>    at the top, subtle taper; a neck is a column, not a plinth.
> 3. **FACE TOPOLOGY, not paint-on-egg:** faces are still vertically
>    squished — "football heads." Faces need actual topology: proper
>    vertical face proportion (brow/eye/nose/mouth zones per human
>    thirds), sculpted brow ridge, cheek planes, jaw — geometry carrying
>    the face, texture carrying the detail.
> 4. **BODY TOPOLOGY:** lumpiness improved; next bar is real surface
>    topology on bodies (garment/anatomy planes), not just clean lofts.
> 5. **img2threejs reference-model pilot: BANKED for Alex's morning
>    review — do NOT run without his go.** Idea: generate reference
>    models (at minimum) to guide topology work.

**THE VERDICT (why v6 exists).** Producer's colleagues, cold-read: faces
*scrunched / scary*, bodies *lumpy*, reads *caricature*. That is the bug.
**Target = a stylized HUMAN — a Dungeons-of-Hinterberg-band adult in miniature.
Never a caricature.** Attitude comes from silhouette, costume, and the expression
SET; the neutral is a pleasant, relaxed, ordinary person. Numbers are law.

## LAW 1 — PROPORTIONS (heroic-natural, not chibi)

v5 ran ~5.8 heads with a big head (R=0.122); that is the "lumpy toddler" read.
v6 lengthens the figure and **shrinks the head**.

| Dial | v5 | **v6 target** | note |
|---|---|---|---|
| Head radius `V5_HEAD_R` | 0.122 | **0.104** (−15%) | head vert ≈ 2.2R ≈ 0.23 |
| Head count (crown ÷ head-vert) | ~5.8 | **6.5–7.0** | raise legs+torso, shrink head |
| Leg length (hip pivot) `V5_LEG_LENGTH` | 0.70 | **0.78** | ⚠ recheck `SEAT_Y` vs `Furniture.chair()` |
| Torso height `V5_TORSO_H` | 0.47 | **0.50** | |
| Neck height `V5_NECK_H` | 0.075 | **0.090** | neck is VISIBLE — never sunk in collar |
| Standing crown height | ~1.53 | **≈1.62** | ÷ 0.23 ≈ 7 heads |

- **Shoulders (full width):** male = **2.0 × head-width = 4.0R ≈ 0.42**
  (`shoulderR ≈ 2.0R ≈ 0.208`); female = **1.6 × head-width ≈ 0.33**
  (`shoulderR ≈ 1.6R ≈ 0.166`). Rounded slope off the neck, never a coat-hanger shelf.
- **Arm span ≈ standing height (±5%).** From shoulder: upper arm **≈0.30**,
  forearm **≈0.27**, hand **≈0.05**. Reach from shoulder ≈ 0.62.
- **Hands reach mid-thigh.** Shoulder sits at world-Y ≈ 1.20; fingertips land
  **≈0.52–0.55** (thigh spans 0.78→0.39, mid ≈ 0.55). If hands stop at the hip, arms are too short.
- **Neck** is a real lit column between jaw and collar: taper R×0.60 (top) → R×0.74 (base).

## LAW 2 — SLEEK LAW (one loft per part; kill the joint bulges)

The lumpiness is **added joint geometry**. v5 builds capsule segments then hides
the seams with a `kneecap` sphere, an `elbow` sphere, and shoulder-`pad` spheres.
**Delete all three.** A limb is ONE continuous tapered surface whose profile
already carries the knee/elbow swell.

- **Each limb = one `LatheGeometry` loft** (or a single tapered
  `CylinderGeometry` with hemispherical caps merged in). The knee/elbow is a
  gentle mid-profile widening in the lathe points, **not** a pasted ball.
- **Torso, sleeve, trouser = single clothing shells.** No lapel/pad boxes
  floating proud; tailoring is low-relief on the shell (≤0.008 proud) or a paint pass.
- **≤3 silhouette inflections per body edge** (e.g. shoulder→elbow→wrist→hand).
  If an outline has more than 3 bumps, it's lumpy — re-loft it.
- **Smooth normals everywhere** (`computeVertexNormals` after every deform).
- **Segment counts high enough that NOTHING facets or latitude-bands at 4×:**
  lathe radial ≥ 48 (combat) / 36 (room); lathe/sphere vertical ≥ 40; limb
  radial ≥ 20. No concentric "hose rings," no onion-ring cheeks.

## LAW 3 — PLEASANT NEUTRAL FACE (relaxed, open, human)

The scrunch comes from heavy lids + hard socket shadow + a default frown. Strip it.

- **Eye line at 50% of skull height.** Inter-eye gap = **one eye width** (pupils
  ≈ 2 eye-widths apart). Eyes are **open almonds**: white sclera, colored iris,
  dark pupil, **one bright catchlight** bead. Eye must never collapse to a dark slit.
- **Brows relaxed, ~0.5 eye-heights above the eye**, soft, level. No default furrow.
- **Nose:** a small 3D geometric wedge (subtle real relief), width < eye gap.
- **Ears:** simple 3D forms at eye→nose height, tucked to the skull at 3/4.
- **Mouth:** soft, slightly **wider than the nose**, corners **neutral** (flat, not down).
- **Shading:** soft PAINTED ambient occlusion ONLY. **NO heavy upper lids, NO
  harsh eye-socket shadow, NO scowl, NO deep naso-labial gouges** on the neutral.
- **Menace/attitude lives ONLY in the expression set** (angry, smug, worried,
  hurt, victory). Neutral / room-idle face is always relaxed and friendly.

## LAW 4 — ANTI-CARICATURE

- **Every facial feature stays within ±15% of human-average** proportion. Eyes,
  nose, mouth, jaw, chin all sit inside that band. `jaw`/`chin` dials clamp
  **0.85–1.15**; audit the outliers (Chad `chin:1.2`→1.15, Meredith/id-rachel `jaw:0.78`→0.85).
  No bug-eyes, no tiny mouth, no lantern jaw.
- **Archetype is expressed by SILHOUETTE + COSTUME + POSTURE + PALETTE**, never
  by warping the face into a cartoon. A "formidable" character is formidable in
  cut and stance; her face is still a real, pleasant human face at rest.

## LAW 5 — MATERIAL

- **Skin: matte.** NO clearcoat / NO sheen on faces (they ring specular bands
  and read plastic-horror). Diffuse gradient carries the form; roughness ≥ 0.7.
- **Cloth: satin** — low sheen, soft. **Gloss only on shoes and a single hair accent.**
- **Combat FACE-KEY (non-negotiable):** a soft warm fill from **front-and-above**
  on every face in the arena, so the dark venue never under-lights a person into
  a horror mask. Faces are always the best-lit surface on stage.

## LAW 6 — STAGING

- In combat, **allies face the ENEMY** — presented **back-3/4 to camera**, so we
  read shoulders/posture and the camera looks over their shoulder at the foe.
  Enemies face the party (and thus the camera). No ally stares blankly outward.

## LAW 7 — THE CAST (silhouette · palette hex · one signature; fields per `characters.js`, identities per WRITING.md)

1. **andrew** (player, mid-30s everyman) — trim, even 2.0-shoulder, upright; navy
   suit `0x2c3e6b` / white shirt / blue tie `0x2244aa`; dark short bob + glasses, coffee mug, light stubble.
2. **karen** (~50 office manager, polished/formidable) — erect, 1.6-shoulder,
   structured blazer; pink blazer `0xcc6688` / cream blouse `0xf2e8dc`; de-helmeted blonde bob, calm level face, purse.
3. **chad** (late-20s gym-bro) — **sleek athletic V**, broad shoulder tapering to
   waist in ONE loft (no slab, no pads); red polo `0xcc4444` / khaki `0x6f6042` / tan `0xd99a70`; blonde quiff `0x8a6a38`, protein shake.
4. **grandma** (~80, petite, warm) — short (~0.76 height), gentle lean, 1.6-shoulder;
   periwinkle shawl `0x8888aa` / silver-white hair; reading glasses + cane, face soft and genuinely kind.
5. **ross** (~55 soft middle-manager) — rounded, faintly weak chin (0.98), relaxed;
   green polo `0x4a7c59` / khaki `0xc4b078`; comb-over energy, bluetooth earpiece, boss mug.
6. **janet** (~45, dry, tired-smart) — slim, slight slump, narrow jaw (0.81); mauve
   cardigan `0x8b6e8b` / worn lip `0x9a5a54`; dark bun, wine tumbler, deadpan level brow.
7. **rachel (display: Meredith Sterling)** (~45 severe exec, cold poise) — **tall, narrow, sharp** (1.08 ht, 0.86
   width), erect; navy suit `0x1a1a3a` / silver bob `0xc0c0c0` / pearls; steel eyes `0x6a7078`, poise in the cut — face still human.
8. **intern** (~19, timid, slight) — small, oversized suit swallowing the frame,
   hunched-in; gray-blue suit `0x4a4a6a` / brown tie `0x884422`; clear glasses + name tag, face open and young.
9. **janitor** (~70 Black elder, dignified) — tall, slight dignified lean; slate-blue
   jumpsuit `0x4a5a6a` / deep skin `0xd4a574`; white hair + beard, mop + secret gold Rolex, a griot's calm.
10. **diane** (~50 composed Black woman, HR) — upright, steady, 1.6-shoulder blazer
    `0x2d2d4e`; deep skin `0xd4a574` / dark bun; clipboard, deep-brown eyes `0x2e1d12`, warm and unhurried.
11. **alex_it** (late-30s IT) — relaxed casual stance; orange Hawaiian `0xe07040` over
    plaid `0x8a6a4a` / ash-blond hair 0x8a7c62 with grey flecks; taupe grey-brown beard 0x6e6152, Dirk-Gently hazel eyes, friendly and rumpled.
