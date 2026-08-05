// THROWAWAY: assembles clip_gender_table.json for the gender-of-performance study.
// Classification is a hand read of the Meshy CDN preview GIFs (deterministic
// ffmpeg frame extraction, viewed at 240px and again at 480px for anything
// ambiguous). Where a clip was also bound to a real cast body and measured in
// skeleton space, the measured numbers are attached.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const OUT = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender');
const catalog = JSON.parse(readFileSync(join(REPO, 'art/char_refs/meshy_pilot/_clips/catalog.json'), 'utf8')).result.list;
const bone = existsSync(join(OUT, 'bone_metrics.json')) ? JSON.parse(readFileSync(join(OUT, 'bone_metrics.json'), 'utf8')) : [];

// preview-avatar read: M = broad-shouldered mannequin, F = narrow-shouldered
// defined-waist mannequin. Both mannequins appear under the same /biped/ preview
// path, so this cannot be derived from metadata — it is a pixel read.
const M = 'male', F = 'female';
const CLS = {
  // ── DailyActions/Idle + LookingAround + Interacting (all 81 screened) ──
  0: M, 2: M, 3: M, 11: M, 12: M, 25: M, 26: F, 28: M, 32: F, 33: M, 34: M, 36: F, 37: F, 38: M,
  41: M, 42: M, 47: M, 48: F, 49: M, 50: F, 56: M,
  243: F, 244: F, 245: F, 246: F, 247: F, 248: F, 249: F, 250: M, 251: M, 252: F, 253: F, 254: F,
  255: M, 256: F, 257: F, 258: M,
  285: F, 286: F, 287: F, 288: F, 289: M, 290: F, 291: F, 292: M, 293: F, 294: F, 295: F, 296: F,
  297: F, 298: F, 299: F, 300: F, 301: F, 302: F, 303: F, 304: F, 305: F, 306: F, 307: F, 308: F,
  309: F, 310: F, 311: F, 312: M, 313: M, 314: M, 315: F, 316: F, 317: F, 318: F,
  333: M, 334: M, 335: M, 336: M, 337: M, 338: M, 339: F, 340: F, 341: F, 599: F,
  // ── BodyMovements/Acting (all 68 screened) ──
  17: M, 18: M, 19: M, 27: M, 29: M, 31: F, 35: F, 39: F, 40: M, 43: F, 44: F, 45: M, 46: F,
  51: M, 59: F, 61: M, 62: F, 101: M, 109: M, 113: F,
  375: F, 376: F, 377: F, 378: F, 379: M, 381: F, 382: F, 384: F, 385: F, 386: F, 387: F, 388: M,
  389: F, 390: F, 391: F, 392: F, 393: F, 394: F, 395: F, 396: F, 397: F, 398: F, 399: F, 401: F,
  402: F, 403: F, 404: F, 405: F, 406: F, 407: F, 408: F, 409: F, 410: F, 411: F, 412: F, 413: F,
  414: F, 415: F, 416: F, 417: F, 419: F, 420: F, 421: F, 422: F, 635: F, 639: F, 650: M, 656: F,
  // ── Fighting/Blocking + GettingHit + Dying + Transitioning (all 66 screened) ──
  7: F, 8: M, 9: M, 10: M, 85: M, 88: M, 99: M, 100: M,
  138: M, 139: M, 140: M, 141: M, 142: M, 143: M, 144: M, 145: M, 146: M,
  147: M, 148: M, 149: M, 150: M, 151: M, 152: M, 153: M, 154: M, 155: M,
  156: M, 157: M, 158: M, 159: M, 160: M, 161: M, 162: M, 163: M, 164: M,
  165: M, 166: F, 167: F, 168: M, 169: F, 170: F, 171: F, 172: M, 173: M, 174: M, 175: M, 176: M,
  177: M, 178: F, 179: F, 180: M, 181: M, 182: M, 183: M, 184: M, 185: M, 186: M, 187: F, 188: F,
  189: F, 190: M, 608: F, 630: M, 631: M, 666: F, 670: F,
  // ── Fighting/Punching (the three the cast uses / considered) ──
  191: M, 193: M, 214: M,
};

// Clips inspected at 480px zoom or measured on a real body -> high confidence.
const HIGH = new Set([
  336, 338, 243, 244, 246, 247, 249, 251, 252, 245, 333, 48, 47, 56, 297, 315, 313, 314, 311, 25,
  138, 178, 391, 59, 191, 17, 18, 318, 310, 12, 31, 51, 88, 143, 173, 174, 193, 214, 386, 403,
  409, 415, 417, 388, 49, 27, 29, 34, 250, 2, 312, 309, 317,
]);

// Clips actually bound to shipped cast GLBs and measured in skeleton space.
const MEASURED = new Set(bone.map(b => b.clip.replace(/^andrew_a/, '').replace(/^a/, '')).map(Number));

const NOTES = {
  336: 'SHIPPING as stance_a for the entire 33-character cast (MeshyClips.CLIP_IDS).',
  338: 'SHIPPING as stance_b for the entire cast.',
  138: 'SHIPPING as guard (Brace).',
  178: 'SHIPPING as hurt for the ENTIRE cast — female-performed, so every male character currently takes a hit like a woman.',
  391: 'SHIPPING as stagger (Composure Break) — female-performed, same problem as 178.',
  59: 'SHIPPING as victory — female-performed, same problem as 178.',
  191: 'SHIPPING as attack (and reused as cast).',
  17: 'style_03 rig. Unwired. Male-performed.',
  18: 'style_03 rig. Unwired. Male-performed.',
  318: 'Recommended cast-gap fill in ROLE_SHORTLISTS. Female-performed — only cast a woman in it.',
  0: 'style_01 rig — the only other style_01 clip is id 1. Untested through the retarget path.',
  11: 'style_03 rig. Listed in ROSTER_TIERS as Diane\'s current idle; Diane is female and a11 is male-performed.',
  12: 'style_03 rig.',
  88: 'Holds a SWORD AND SHIELD in the preview — disqualified for an office game regardless of gender.',
  85: 'Weapon prop (axe).', 99: 'Weapon prop (sword).', 101: 'Weapon prop (sword).',
  292: 'Weapon prop (gun).', 334: 'Weapon prop.', 335: 'Weapon prop (axe).', 337: 'Prop (torch).',
  47: 'Male-performed but unusually NARROW-based for a male clip — the one male calm idle whose foot spread lands in the female band. Its pelvic carriage is still firmly male.',
  388: 'Male-performed double-bicep flex from a neutral stand. Large motion, so its mean hip height sits low; it is a signature-pose candidate, not a calm hold.',
};

const rows = [];
for (const [idStr, avatar] of Object.entries(CLS)) {
  const id = Number(idStr);
  const e = catalog.find(c => c.id === id);
  if (!e) continue;
  const b = bone.filter(x => x.clip === `andrew_a${id}` || x.clip === `a${id}`);
  const row = {
    id,
    action_id: id,
    name: e.name,
    key: e.key,
    category: `${e.category}/${e.subCategory}`,
    rigType: e.rigType,
    previewAvatar: avatar,
    // Every clip we bound to a real body and measured agreed with its preview
    // avatar, so the avatar is treated as the performer identity unless measured
    // otherwise. Nothing measured so far contradicts it.
    motionSignature: avatar,
    confidence: HIGH.has(id) ? 'high' : 'medium',
    verifiedOnRealBody: MEASURED.has(id),
  };
  if (b.length) {
    row.measured = {
      bodies: [...new Set(b.map(x => x.ch))],
      footSpread_mean: +(b.reduce((a, x) => a + x.footSpread, 0) / b.length).toFixed(4),
      hipsY_mean: +(b.reduce((a, x) => a + x.hipsY, 0) / b.length).toFixed(4),
      note: 'normalised to each body\'s own standing height; see bone_metrics.json for per-body rows',
    };
  }
  if (NOTES[id]) row.notes = NOTES[id];
  rows.push(row);
}
rows.sort((a, b2) => a.id - b2.id);

const summary = {
  generated: new Date().toISOString(),
  method: 'Preview GIFs pulled from the Meshy CDN and decoded to exact frames with ffmpeg (no timing-dependent sampling). Every clip classified by which of Meshy\'s TWO preview mannequins renders it: a broad-shouldered flat-chested one (male) and a narrow-shouldered defined-waist one (female). 215 clips screened across DailyActions/Idle+LookingAround+Interacting (81), BodyMovements/Acting (68), Fighting/Blocking+GettingHit+Dying+Transitioning (66), plus the three Fighting/Punching clips the cast uses. 20 of them were then bound to shipped cast GLBs through the shipping retarget path and measured in skeleton space.',
  caveat: 'The preview avatar is not exposed in any API field — every previewUrl in the 680-entry catalog points at the same /preview/biped/ path. This is a pixel read, not metadata.',
  totals: {
    screened: rows.length,
    male: rows.filter(r => r.previewAvatar === 'male').length,
    female: rows.filter(r => r.previewAvatar === 'female').length,
    high_confidence: rows.filter(r => r.confidence === 'high').length,
    verified_on_real_body: rows.filter(r => r.verifiedOnRealBody).length,
  },
  clips: rows,
};
writeFileSync(join(OUT, 'clip_gender_table.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.totals, null, 2));
