# B24 / C4 — starting Coffee (MP): a priced proposal

**Nothing is shipped by this document.** The producer signs the number.
Reproduce every figure with `node tools/_fr1-coffee.mjs --runs 250` (real
`CombatEngine`, real `PLAYER_ABILITIES`, real `balance.json`, the same
COMPETENT / CASUAL policies every previous balance ruling on this project used).

Shipped today: `PLAYER_BASE_STATS.maxMP = 75`, `LEVEL_GROWTH.maxMP = +10/level`.

---

## 1. The complaint restated as arithmetic

Andrew's note was "too much starting coffee — special-spam". That is not a
difficulty complaint, it is a **rhythm** complaint: if the pool pays for more
specials than the fight has turns, the basic attack is decoration.

At the shipped 75, level 1, the cheapest ability costs 10 — so the pool buys
**7 casts**. A level-1 fight lasts **2.79 rounds**. The player can spend two and
a half fights' worth of turns on specials before running dry, in the fight the
game uses to teach them what a turn is.

| base | L1 pool | casts of the cheapest | casts of the median |
|---|---|---|---|
| **75 (shipped)** | 75 | **7** | **7** |
| 60 | 60 | 6 | 6 |
| 50 | 50 | 5 | 5 |
| 40 | 40 | 4 | 4 |

By late game the median ability costs 30–35 and the pool buys 4–5 casts at every
candidate, so **this number only bites in the early game** — which is exactly
where the note came from.

## 2. What each candidate costs, measured

250 runs per cell, eight-encounter story ladder at its expected level.

| candidate | competent win | casual win | fight length |
|---|---|---|---|
| 60 | **−2.75 pp** | **+0.15 pp** | +2.15 rounds |
| 50 | −3.15 pp | −2.10 pp | +1.97 rounds |
| 40 | −5.40 pp | −1.90 pp | +3.14 rounds |

Per-encounter competent win rate, the two that move most:

| encounter | mp 75 | mp 60 | mp 50 | mp 40 |
|---|---|---|---|---|
| karen @3 | 96.8 % / 4.45r | 92.8 % / 4.87r | 89.6 % / 5.06r | **76.8 % / 6.23r** |
| algorithm @12 | 74.4 % / 20.18r | 65.6 % / 23.40r | 68.0 % / 23.68r | 61.6 % / 26.66r |

## 3. Recommendation: **60**

It is the only candidate that does the job without a bill.

- It removes **exactly one cast of headroom at every level** — the smallest
  change that is a change at all, and the one that makes an early fight a
  choice rather than a menu.
- It costs competent play 2.75 pp of win rate and adds 2.15 rounds, so fights
  get longer without getting lost.
- **It costs the casual floor nothing: +0.15 pp**, inside noise at 250 runs.
  That is the veto condition and 60 is the only candidate that clears it. 50 and
  40 both tax the floor by ~2 pp, and Run C's named failure mode is taxing the
  player the Performance Improvement Plan exists for.
- 40 additionally takes Karen from 96.8 % to 76.8 %, which is a difficulty
  re-tune of the tutorial boss smuggled in under a resource change.

If the producer wants the rhythm change to be felt harder, the honest lever is
**ability COST, not pool size** — raising the cheapest tier from 10 to 15 hits
the early game specifically and leaves the late-game pool alone. That is a
separate proposal and would need its own sim.

## 4. Two things that would mislead you if I did not say them

1. **`regional_director` reads 26.4 % competent win at every candidate**, and
   `algorithm` 74.4 %. That contradicts the combat hunt's "98–100 % win across
   the ladder", and the contradiction is almost certainly in how this harness
   builds those two encounters (party/ally composition and stretch config), not
   in the game. Treat their absolute win rates as unreliable; the **deltas
   between candidates** on the same harness are still valid, which is all this
   proposal rests on.
2. **The casual-floor rows are noisy at 250 runs** — chad moves +6 pp at base 60
   and −4.8 pp at base 50, which is not a real ordering. The aggregate deltas in
   §2 average eight encounters and are the number to read; a per-encounter
   casual cell is not.
