// THROWAWAY prep script — writes the final menu/catalog_audit.json from the
// judgments made while eyeballing the strip sheets in
// tools/_menu-audit.mjs output (art/char_refs/meshy_pilot/_clips/menu/_audit,
// scratch copies reviewed by hand, not committed). One row per catalog id
// actually screened by preview. `verdict` is PASS / CAVEAT / REJECT /
// INCONCLUSIVE — INCONCLUSIVE means the 6-frame 220ms-interval GIF sample
// didn't resolve the motion (fast gesture, or the exact "sampling gap" risk
// the wave's own docs already caught once on a12/a599); it is not a pass.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CATALOG = 'art/char_refs/meshy_pilot/_clips/catalog.json';
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).result.list;
const byId = new Map(catalog.map(c => [c.id, c]));

// [id, role, verdict, note]
const ROWS = [
  // ── IDLE (calm-idle / alert-idle) — 46 screened ──────────────────────
  [0, 'calm-idle', 'CAVEAT', 'Static arms-at-side hold, reads calm. But rigType style_01 — the only other style_01 clip in the whole 680-entry catalog is id 1. Every one of the 7 clips already shipped in the shared reaction layer (a336/338/138/178/391/59/191) is style_02. Untested whether a style_01-sourced clip retargets as cleanly through the new Andrew-donor armature-only pipeline. Recommend a 1-clip test spend before relying on it.'],
  [11, 'calm-idle', 'CAVEAT', "Loose fists, slight elbow bend — reads boxer-ready, not arms-down business-calm. Also rigType style_03 (only 5 style_03 entries in the catalog: 11,12,17,18,19). This is diane's currently-SHIPPED Pass-One idle per MESHY_WAVE.md despite the rig-type mismatch — it apparently works via the old per-character animate-task path, but was never run through the new shared-armature retarget. Worth a spot-check on diane specifically."],
  [12, 'calm-idle', 'REJECT', 'Documented in MESHY_WAVE.md Pass One as a full-body overhead STRETCH, confirmed on a real character at full duration. My 6-frame/220ms GIF sample did NOT catch the stretch (looked static) — textbook illustration of why a coarse preview sample is a filter, not a verdict. Trusting the prior full-duration finding over my own coarse sample.'],
  [32, 'calm-idle', 'REJECT', 'Seated (Chair Sit Idle Female) — wrong for a standing combat idle.'],
  [33, 'calm-idle', 'REJECT', 'Seated (Chair Sit Idle Male).'],
  [36, 'calm-idle', 'CAVEAT', 'Static/calm across all 6 samples; the "scratch" beat is presumably a quick undersampled gesture. Plausible backup, unverified motion.'],
  [38, 'calm-idle', 'REJECT', 'Hunched/seated posture (Dozing Elderly) — reads as sitting on nothing.'],
  [48, 'calm-idle', 'PASS', 'Calm standing hold, minimal drift. Self-checking/vain flavor — good fit for a vanity-coded character (Chad, brand_consultant).'],
  [243, 'calm-idle', 'PASS', "SHIPPING — Andrew's current idle. Static standing, arms at side."],
  [244, 'calm-idle', 'PASS', "SHIPPING — Janet's current idle. Static standing."],
  [245, 'calm-idle', 'CAVEAT', "SHIPPING — Alex from IT's current idle. MESHY_WAVE Pass Two already flagged subtle stage-facing turning during long holds on this exact clip; my sample shows a weight-shifted, slightly stepping pose consistent with that. Keep, but don't be surprised if it reads a little busier than the others."],
  [246, 'calm-idle', 'PASS', "SHIPPING — Isaiah's current idle. Static standing, slight forward lean."],
  [247, 'calm-idle', 'PASS', "SHIPPING — Karen's current idle, documented as the calmest hold in the pool. Confirmed."],
  [248, 'calm-idle', 'REJECT', 'Documented Pass One reject: crouch-sway gesture. My sample shows a bouncing side-to-side stance, consistent.'],
  [249, 'calm-idle', 'PASS', 'SHIPPING — in the current shared enemy pool ({249,251,252}). Static standing, confirmed calm.'],
  [250, 'calm-idle', 'REJECT', 'Documented Pass One reject: boxing guard. My sample shows a forward-weighted athletic bounce, consistent.'],
  [251, 'calm-idle', 'PASS', 'SHIPPING — in the current shared enemy pool. Static standing, confirmed calm.'],
  [252, 'calm-idle', 'PASS', 'SHIPPING — in the current shared enemy pool. Static standing, confirmed calm.'],
  [253, 'calm-idle', 'REJECT', 'Documented + confirmed: reach-lunge, fist raised, weight thrown forward.'],
  [254, 'calm-idle', 'REJECT', 'Documented: presenting-push ending in a kick. Sample shows the same forward-leaning fist-raised wind-up.'],
  [255, 'calm-idle', 'REJECT', 'Angry Ground Stomp — hunched aggressive profile, wrong register entirely.'],
  [256, 'calm-idle', 'REJECT', 'Angry Ground Stomp 1 — same family as 255.'],
  [257, 'calm-idle', 'REJECT', 'Angry Ground Stomp 2 — same family, front view.'],
  [258, 'calm-idle', 'REJECT', 'Crouchlookaroundbow — crouched/sneaking, not standing.'],
  [599, 'calm-idle', 'REJECT', 'Documented Pass One reject: greeting wave. My sample did not catch the wave (looked static) — same sampling-gap caveat as id 12; trusting the documented finding.'],
  [2, 'calm-idle', 'REJECT', 'Alert — fists up, wide fighting stance. Exactly the "fighter bouncing on their toes" register the brief says to avoid.'],
  [3, 'calm-idle', 'REJECT', "Arise — despite the calm-sounding name, this is a floor-to-standing GET-UP transition (body horizontal in early frames). Another name trap."],
  [333, 'calm-idle', 'PASS', 'Look Around Dumbfounded — calm static standing. Reads stunned/confused; good for a shocked reception client or a befuddled boss (Ross).'],
  [334, 'calm-idle', 'REJECT', 'Lower Weapon, Look, Raise — bent-arm gripping pose implies holding an object. Violates the no-weapon-holding-pose rule even though no mesh is attached.'],
  [335, 'calm-idle', 'REJECT', 'Axe Breathe and Look Around — same gripping-pose problem, implies an axe.'],
  [336, 'calm-idle', 'PASS', 'SHIPPING — current stance A for the whole cast. Static standing, natural arm hang. Confirmed.'],
  [337, 'calm-idle', 'REJECT', 'Torch Look Around — hand held near chest as if gripping a torch.'],
  [338, 'calm-idle', 'PASS', 'SHIPPING — current stance B for the whole cast, documented as the calmest hold in the catalog. Confirmed.'],
  [339, 'calm-idle', 'CAVEAT', "Walking Scan with Sudden Look Back — looked static in the 6-frame sample, but the name strongly implies a walk cycle. Same out-of-frame risk the wave already hit once on a31 'Catching Breath'. Needs a full-duration check before use."],
  [340, 'calm-idle', 'REJECT', 'Crawl and Look Back — on all fours. Wrong register entirely, not a naming-trap case (visually obvious).'],
  [341, 'calm-idle', 'CAVEAT', 'Walk Slowly and Look Around — same walk-cycle out-of-frame risk as 339.'],
  [47, 'calm-idle', 'PASS', "Listening Gesture — attentive, arms loosely engaged. Good 'waiting to respond' read."],
  [56, 'calm-idle', 'PASS', 'Stand and Chat — casual conversational stance, calm.'],
  [297, 'calm-idle', 'PASS', 'Personalized Gesture — calm standing, vague name but the motion itself reads fine.'],
  [310, 'calm-idle', 'PASS', 'Talk with Left Hand Raised — hand-on-hip-adjacent silhouette. Near-duplicate of 315; pick one or the other per character, not both, if they could ever share a stage.'],
  [311, 'calm-idle', 'PASS', 'Stand Talking Angry — annoyed-executive register, good for a boss mid-complaint.'],
  [313, 'calm-idle', 'PASS', 'Talk with Hands Open — both palms open, presenting/persuading. Distinct silhouette from 314 (one-hand version).'],
  [314, 'calm-idle', 'PASS', 'Talk with Right Hand Open — one-arm presenting gesture, distinct from 313.'],
  [315, 'calm-idle', 'PASS', 'Hand on Hip Gesture — impatient-professional read, strong Karen-type fit, very distinct silhouette (one bent arm to hip).'],
  [317, 'calm-idle', 'CAVEAT', 'Shrug — base hold looks calm; the actual shrug beat is presumably quick and undersampled. Plausible, unverified motion.'],
  [25, 'calm-idle', 'PASS', 'Agree Gesture — calm, nodding-adjacent, unremarkable in a good way.'],
  [377, 'calm-idle', 'PASS', "Relax Arms, Then Strike Battle Pose (screened under guard/block) — the 'relax arms' hold reads as confident crossed arms, a strong distinct idle silhouette. Reclassified here from its catalog category; the tail end of the clip (the 'strike' part) was not verified and may need trimming."],

  // ── GUARD / BLOCK — 19 screened ──────────────────────────────────────
  [138, 'guard-block', 'PASS', 'SHIPPING — current Brace clip. Wide boxer crouch, fists near face.'],
  [139, 'guard-block', 'PASS', 'Block2 — near-identical boxer crouch to 138. Visually redundant, safe alt.'],
  [140, 'guard-block', 'PASS', 'Block3 — same family as 138/139.'],
  [141, 'guard-block', 'PASS', 'Block4 — same family.'],
  [142, 'guard-block', 'PASS', 'Block5 — same family, arms slightly tighter to body.'],
  [143, 'guard-block', 'PASS', 'Block6 — same family.'],
  [144, 'guard-block', 'PASS', 'Block8 — narrower, less crouched stance, fists at chest height. Best non-boxer-crouch alt in the batch.'],
  [145, 'guard-block', 'PASS', 'Block9 — similar to 144, defensive fists up, feminine reference body.'],
  [146, 'guard-block', 'PASS', 'Block10 — narrow standing guard, hands near chest. Reads least "fighter" of the family.'],
  [147, 'guard-block', 'PASS', 'Sword Parry — open hands raised near the face, shielding. Reads as flinch-guard rather than boxer guard; arguably the best office-plausible block.'],
  [148, 'guard-block', 'PASS', 'Sword Parry Backward — similar open-hand shield read to 147.'],
  [149, 'guard-block', 'PASS', 'Two-handed Parry — crossed forearms shielding the face, dynamic lean. Strong distinct alt.'],
  [150, 'guard-block', 'PASS', 'Hit Reaction with Bow — wide stance, hands up defensively. Usable, generic.'],
  [151, 'guard-block', 'PASS', 'Sword Parry Backward 1 — crouched combat stance, more videogame-athletic than office, lower priority.'],
  [152, 'guard-block', 'PASS', 'Sword Parry Backward 2 — same family as 151.'],
  [153, 'guard-block', 'PASS', 'Sword Parry Backward 3 — same family, more hunched.'],
  [154, 'guard-block', 'PASS', 'Sword Parry Backward 4 — same family.'],
  [155, 'guard-block', 'PASS', 'Sword Parry Backward 5 — same family, boxer-adjacent finish.'],

  // ── HIT-REACTION — 11 screened ────────────────────────────────────────
  [7, 'hit-reaction', 'REJECT', 'BeHit FlyUp — documented in Pass Two as leaving the ground. Confirmed: legs curl up mid-air in the sample.'],
  [172, 'hit-reaction', 'PASS', 'Electrocution Reaction — profile flinch, single arm raised. Decent alt, register-neutral despite the name (no visible shock effect on the body alone).'],
  [173, 'hit-reaction', 'CAVEAT', 'Slap Reaction — looked static in sample; the head-snap is presumably fast and undersampled.'],
  [174, 'hit-reaction', 'PASS', 'Face Punch Reaction — hands drawn to face, recoiling. Good alt.'],
  [175, 'hit-reaction', 'PASS', 'Face Punch Reaction 1 — similar to 174.'],
  [176, 'hit-reaction', 'PASS', 'Face Punch Reaction 2 — profile, hand to stomach, hunched. Distinct "gut hit" alt.'],
  [177, 'hit-reaction', 'CAVEAT', 'Gunshot Reaction — arms-up defensive motion works, but the name (and likely a companion fall) skews toward a violent register this satire avoids everywhere else.'],
  [178, 'hit-reaction', 'PASS', 'SHIPPING — current hit reaction. Torso recoil + arm fling per MESHY_WAVE.'],
  [179, 'hit-reaction', 'PASS', 'Hit Reaction 1 — hands near chin, doubling slightly. Good alt.'],
  [180, 'hit-reaction', 'REJECT', 'Shot in the Back and Fall — walking-hunched into a fall. Violent register, leads into a knockdown.'],
  [608, 'hit-reaction', 'REJECT', 'BeHit FlyUp (duplicate id of 7) — same leaves-the-ground problem, confirmed.'],

  // ── STAGGER / DAZE — 5 screened (+ 36/38 cross-referenced from idle) ──
  [391, 'stagger-daze', 'PASS', 'SHIPPING — current Break/stagger clip. Hands to head, doubling over.'],
  [316, 'stagger-daze', 'PASS', 'Headache Relief — hands to temples, standing straighter than 391 (less theatrical). Excellent distinct alt; arguably a better fit for a milder character.'],
  [113, 'stagger-daze', 'PASS', 'Mummy Stagger — arms out in front, forward shamble. Distinct, but the raised zombie-arms read borderline silly on a suited office character; usable as a flavor pick.'],
  [650, 'stagger-daze', 'PASS', 'Mummy Stagger (duplicate content of 113 under a second catalog id).'],
  [386, 'stagger-daze', 'INCONCLUSIVE', 'Zombie Scream — body reads static across the sample; the "scream" is presumably a face/head beat not visible in a torso-level silhouette check. Needs a longer look.'],

  // ── VICTORY — 12 screened ──────────────────────────────────────────
  [59, 'victory', 'PASS', 'SHIPPING — current victory clip. Arm up, overhead pump per MESHY_WAVE.'],
  [412, 'victory', 'INCONCLUSIVE', 'Victory — static-looking in sample; the pose difference from a neutral idle was not resolved at this sample rate.'],
  [403, 'victory', 'REJECT', 'Victory Fist Pump — documented reject: reads as a small bounce.'],
  [405, 'victory', 'REJECT', 'Joyful Dance with Hand Sway — dance register, too theatrical/silly for a corporate-satire victory beat.'],
  [408, 'victory', 'PASS', 'Jazz Hands — arms overhead, one knee raised, hands splayed. Clearly dynamic and clearly theatrical; usable as an optional comedic flavor pick, not a universal default.'],
  [639, 'victory', 'PASS', 'Jazz Hands (duplicate content of 408 under a second id).'],
  [44, 'victory', 'CAVEAT', 'Happy Jump Female — static-looking in sample but the name implies airborne motion, same leaves-ground risk as BeHit FlyUp. Needs a full-duration check.'],
  [61, 'victory', 'CAVEAT', 'Happy Jump Male — same jump risk as 44.'],
  [298, 'victory', 'PASS', 'Cheer with Both Hands Up — mild double-arm raise. Good subtle alt.'],
  [303, 'victory', 'PASS', 'Cheer with Both Hands — clean, big, both arms straight overhead. Strong clear-victory alt without reading silly.'],
  [306, 'victory', 'PASS', 'Cheer with One Hand Up — subtle single-arm cheer, understated alt.'],
  [49, 'victory', 'PASS', 'Motivational Cheer — rallying forward-arm pose, good subtle alt.'],

  // ── CAST / SCHEME — 15 screened ──────────────────────────────────────
  [125, 'cast-scheme', 'PASS', 'Charged Spell Cast — wide stance, palms raised. Empty-handed (no visible weapon), but reads more "fantasy spellcaster" than "office schemer" — usable as a higher-energy alt for a theatrical villain (regional_director, the_firm).'],
  [126, 'cast-scheme', 'PASS', 'Charged Spell Cast 1 — same family as 125.'],
  [127, 'cast-scheme', 'PASS', 'Charged Ground Slam — wide low stance, hands forward. Same family, more grounded.'],
  [129, 'cast-scheme', 'PASS', 'Mage Spell Cast — same fantasy-gesture family as 125.'],
  [130, 'cast-scheme', 'PASS', 'Mage Spell Cast 1 — same family, narrower stance.'],
  [131, 'cast-scheme', 'PASS', 'Mage Spell Cast 2 — same family.'],
  [132, 'cast-scheme', 'PASS', 'Mage Spell Cast 3 — same family.'],
  [133, 'cast-scheme', 'PASS', 'Mage Spell Cast 4 — same family.'],
  [134, 'cast-scheme', 'PASS', 'Mage Spell Cast 5 — same family.'],
  [135, 'cast-scheme', 'PASS', 'Mage Spell Cast 6 — same family.'],
  [136, 'cast-scheme', 'PASS', 'Mage Spell Cast 7 — same family, boxer-guard-adjacent hand position.'],
  [137, 'cast-scheme', 'PASS', 'Mage Spell Cast 8 — lunging sideways cast, most dynamic of the family.'],
  [318, 'cast-scheme', 'PASS', 'Scheming Hand Rub — TOP PICK. Hands together near chest, classic "rubbing hands together, plotting" gesture. Business-plausible, empty-handed, exactly fills the gap MESHY_WAVE flagged (cast currently just reuses the attack accent).'],
  [17, 'cast-scheme', 'CAVEAT', "Skill 1 — rigType style_03 (same caveat family as ids 0/11/12/18/19). Wide two-handed martial-ready crouch; doesn't read as 'scheming'. Already downloaded and discarded once per MESHY_WAVE Pass Two."],
  [18, 'cast-scheme', 'CAVEAT', "Skill 2 — rigType style_03. Charging/running stance; doesn't read as 'scheming' either. Already downloaded and discarded once per MESHY_WAVE Pass Two."],

  // ── ATTACK-MELEE — 17 screened ────────────────────────────────────────
  [191, 'attack-melee', 'PASS', 'SHIPPING — current attack accent. Left Jab from Guard.'],
  [192, 'attack-melee', 'PASS', 'Right Jab from Guard — same boxer family as 191, mirrored.'],
  [193, 'attack-melee', 'PASS', 'Left Hook from Guard — same family.'],
  [194, 'attack-melee', 'PASS', 'Right Uppercut from Guard — same family.'],
  [195, 'attack-melee', 'PASS', 'Right Upper Hook from Guard — same family.'],
  [196, 'attack-melee', 'PASS', 'Left Uppercut from Guard — same family.'],
  [197, 'attack-melee', 'PASS', 'Left Short Hook from Guard — same family.'],
  [198, 'attack-melee', 'PASS', 'Punch Combo — same family, multi-hit implied.'],
  [200, 'attack-melee', 'PASS', 'Punch Combo 1 — same family.'],
  [201, 'attack-melee', 'PASS', 'Punch Combo 2 — same family.'],
  [203, 'attack-melee', 'PASS', 'Punch Combo 3 — same family.'],
  [204, 'attack-melee', 'PASS', 'Punch Combo 4 — more committed forward lean/lunge than the rest of the family; distinct.'],
  [205, 'attack-melee', 'PASS', 'Punch Combo 5 — boxer-guard family.'],
  [214, 'attack-melee', 'PASS', "Punch Forward with Both Fists — both fists driving forward together. Reads like a desk-slam. Good distinct pick, doesn't need the boxer-guard silhouette."],
  [212, 'attack-melee', 'PASS', 'Elbow Strike — boxer-adjacent stance, close-range read.'],
  [259, 'attack-melee', 'PASS', 'Step Forward and Push — clean single forward shove. Good non-violent "push back" read for the corporate register.'],
  [260, 'attack-melee', 'PASS', 'Push Forward and Stop — more committed lunging push/tackle than 259.'],

  // ── ATTACK-PROP-SWING — 12 screened ───────────────────────────────────
  [97, 'attack-prop-swing', 'CAVEAT', "Left Slash — CRITICAL: the CDN preview shows the reference actor visibly holding a sword AND a shield. Our shared clips are bone-rotation-only (no meshes travel), so on our cast this becomes an EMPTY-HANDED arm swing — do not judge quality from the armed preview. The arm arc itself is a good diagonal one-hand swing shape for a bone-socketed prop (same attachment technique as grandma's cane) — Karen's purse is exactly this kind of use case, but it needs the prop-socket work, not just the clip."],
  [219, 'attack-prop-swing', 'CAVEAT', 'Right-hand Sword Slash — empty-handed wide stance in preview (no visible weapon despite the name); the actual slash arc was undersampled.'],
  [240, 'attack-prop-swing', 'CAVEAT', 'Thrust Slash — empty-handed ready stance; thrust motion undersampled.'],
  [242, 'attack-prop-swing', 'CAVEAT', 'Charged Slash — empty-handed wind-up stance; undersampled.'],
  [237, 'attack-prop-swing', 'PASS', 'Charged Axe Chop — crouched, both-arms-low recovery shape, reads as the follow-through of a big committed overhead chop. Best-shaped candidate in the batch for a heavy two-handed prop smash (briefcase/folder slam).'],
  [238, 'attack-prop-swing', 'CAVEAT', 'Axe Spin Attack — wide spin-ready stance, no visible weapon; spin motion undersampled.'],
  [128, 'attack-prop-swing', 'PASS', 'Heavy Hammer Swing — profile, one arm raised diagonally overhead in a wind-up. Empty-handed in view. Good big-swing shape for an overhead purse/cane/briefcase arc.'],
  [221, 'attack-prop-swing', 'CAVEAT', 'Charged Upward Slash — wide stance, fists cocked; upward-arc motion undersampled.'],
  [389, 'attack-prop-swing', 'CAVEAT', 'Grip and Throw Down — reads as a casual walking gesture with the arm extended down-forward, not a clear swing. Weak fit.'],
  [421, 'attack-prop-swing', 'INCONCLUSIVE', 'Over Shoulder Throw — static boxer-ish ready stance in sample; the throw itself was not resolved.'],
  [43, 'attack-prop-swing', 'REJECT', "Handbag Walk — the closest name-match to the producer's own example (Karen's purse), and the preview genuinely shows one arm crooked as if a bag hangs from the forearm, swinging with the gait. But it IS a walking-forward animation — same out-of-frame risk as the documented a31 case. Valuable as a MOTION REFERENCE for a future custom purse-swing, not directly usable as a static combat beat."],
  [635, 'attack-prop-swing', 'REJECT', 'Handbag Walk (duplicate content of 43 under a second catalog id). Same verdict.'],

  // ── DEFEAT (catalog-audit only; not a required shortlist) — 6 screened ─
  [8, 'defeat', 'REJECT', "Dead — kneeling/crouched static hold, the closest-to-usable silhouette in the batch, but there is currently NO call site anywhere in CombatState/MeshyAnimator that plays a defeat/death pose (the wiring table only covers hurt/attack/cast/stagger/victory/guard). Building this role at all should wait for a design decision, and if it happens, it should be sourced from an office metaphor (packing up a box, sitting down defeated), not the violent-coded Dying category."],
  [181, 'defeat', 'REJECT', 'Electrocuted Fall — dramatic arms-flailing, explicitly violent-coded via electrocution.'],
  [182, 'defeat', 'REJECT', 'Shot and Blown Back — gunshot-coded, violent register this satire avoids everywhere else.'],
  [187, 'defeat', 'INCONCLUSIVE', 'Knock Down — static in sample; category and name both point toward a fall, likely wrong register regardless.'],
  [188, 'defeat', 'REJECT', 'Fall Dead from Abdominal Injury — explicitly violent by name.'],
  [189, 'defeat', 'REJECT', 'Dying Backwards — explicitly violent by name/category.'],

  // ── TAUNT (bonus classification, not a required shortlist) — 4 screened ─
  [411, 'taunt', 'CAVEAT', 'Neck Slashing Gesture — even if the actual motion reads as more of a dismissive mocking gesture than literal violence, the name alone is a tone risk for a satire that stays non-violent everywhere else. Would need a very careful look before use.'],
  [388, 'taunt', 'INCONCLUSIVE', 'Show Both Arm Muscles — static in sample; the flex beat was undersampled.'],
  [409, 'taunt', 'INCONCLUSIVE', 'Finger Wag No — static in sample; the wag beat was undersampled.'],
  [51, 'taunt', 'INCONCLUSIVE', "Shouting Angrily — 'shouting' is mostly a face/voice cue; a torso-level silhouette check can't resolve it either way."],
];

const rows = ROWS.map(([id, role, verdict, note]) => {
  const c = byId.get(id);
  return {
    id,
    name: c?.name ?? '(not found in catalog)',
    category: c ? `${c.category}/${c.subCategory}` : null,
    rigType: c?.rigType ?? null,
    previewUrl: c?.previewUrl ?? null,
    role,
    verdict,
    note,
  };
});

const summary = {};
for (const r of rows) {
  summary[r.role] = summary[r.role] || { PASS: 0, CAVEAT: 0, REJECT: 0, INCONCLUSIVE: 0 };
  summary[r.role][r.verdict]++;
}

const out = {
  _method: 'Preview-GIF audit: tools/_menu-audit.mjs samples the Meshy CDN preview at fixed intervals (same technique as the shipped tools/meshy-clip-audit.mjs) and stitches a labelled strip; every strip was viewed and judged by hand. This is a FILTER pass, not a final verdict — the project convention (MESHY_WAVE.md Pass Two) is to re-judge PASS/CAVEAT survivors on a real bound character (tools/meshy-clip-strip.mjs) before shipping, which costs no credits itself but was not run in this prep pass to keep this lane at zero Meshy spend.',
  _catalogTotal: 680,
  _screenedTotal: rows.length,
  _screenedCandidateIds: rows.length,
  _summaryByRole: summary,
  clips: rows,
};

mkdirSync('art/char_refs/meshy_pilot/_clips/menu', { recursive: true });
writeFileSync('art/char_refs/meshy_pilot/_clips/menu/catalog_audit.json', JSON.stringify(out, null, 2));
console.log(`wrote ${rows.length} rows`);
console.log(JSON.stringify(summary, null, 2));
