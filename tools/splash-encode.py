# SPLASH CARD ENCODER — masters -> shipped WebP.
#
# The producer-locked slate lives in art/splash_cards/PICKS.md; this table is
# that slate as paths. Masters stay in art/ (re-deriving one is a regeneration
# with a different seed, playbook section 6); only the downscale ships.
#
# Format ruling from splash-card-spec.md sections 5 and 14, measured across all
# 21 candidates: 1600x900 WebP q80. Every candidate clears the 300 KB per-card
# target with margin; JPEG runs close enough to the ceiling on the busiest
# cards (grandma_B at 273 KB) that it is not used.
#
#   python tools/splash-encode.py            # encode + report measured sizes
#   python tools/splash-encode.py --check    # report only, write nothing
import os, sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, 'art', 'splash_cards')
OUT = os.path.join(REPO, 'src', 'assets', 'splash_cards')
W, H, Q = 1600, 900, 80
BUDGET_KB = 300

# card id  ->  master, relative to art/splash_cards/
SLATE = {
    # ── ANDREW, reward class (slam-left, navy field, crimson slash) ──────
    'assert_dominance':   'raw/C_deadpan_raw.png',
    'boss_kill':          'raw/D_walkaway_raw.png',
    'all_in':             'all_in/raw/all_in_A_raw.png',
    # ── BOSSES, threat class (slam-right, crimson wash, no damage number) ─
    'boss_karen':         'karen/raw/karen_A_raw.png',
    'boss_chad':          'chad/raw/chad_C_raw.png',
    'boss_grandma':       'grandma/raw/grandma_B_raw.png',
    # the naming sweep renamed rachel_boss -> meredith_boss in code; the art
    # directory keeps its generation-time name.
    'boss_meredith':      'rachel_boss/raw/rachel_boss_B_raw.png',
    'boss_director':      'regional_director/regen/raw/regional_director_G_raw.png',
    'boss_algorithm':     'algorithm/raw/algorithm_B_raw.png',
    # ── the one-off scripted-loss finisher ──────────────────────────────
    'karen_finisher':     'karen/raw/karen_C_raw.png',
}

check = '--check' in sys.argv
if not check:
    os.makedirs(OUT, exist_ok=True)

total = 0
fail = []
print(f'{"card":<20}{"master px":<14}{"webp":<12}budget {BUDGET_KB} KB')
for cid, rel in SLATE.items():
    src = os.path.join(SRC, rel)
    if not os.path.exists(src):
        fail.append(f'{cid}: master missing at {rel}')
        continue
    im = Image.open(src).convert('RGB')
    master = f'{im.width}x{im.height}'
    im = im.resize((W, H), Image.LANCZOS)
    dst = os.path.join(OUT, f'{cid}.webp')
    if check:
        import io
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=Q, method=6)
        n = buf.tell()
    else:
        im.save(dst, 'WEBP', quality=Q, method=6)
        n = os.path.getsize(dst)
    total += n
    kb = n / 1024
    flag = '' if kb <= BUDGET_KB else '  << OVER BUDGET'
    if kb > BUDGET_KB:
        fail.append(f'{cid}: {kb:.0f} KB over {BUDGET_KB} KB')
    print(f'{cid:<20}{master:<14}{kb:>7.0f} KB{flag}')

print(f'{"TOTAL":<20}{"":<14}{total/1024:>7.0f} KB  ({len(SLATE)} cards)')
if fail:
    print('\nFAIL:')
    for f in fail:
        print('  ' + f)
    sys.exit(1)
print('\nPASS — every card inside the per-card budget.')
