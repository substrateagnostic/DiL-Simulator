# WHITE-RUN TABLE — flashEnemy re-entrancy

sampler 20 Hz, window 10 s past a real Composure Break, headed, qtier=high.
PASS = longest contiguous white run <= 200 ms AND last sample white 0.

| fight | stagger | weakness hit | meshes | white runs | longest run | last sample | verdict |
|---|---|---|---|---|---|---|---|
| karen | a391 (f) | file_motion (legal) | 3 | 2 | **9402 ms** | 1 | FAIL |
| grandma | a391 (f) | spot_check (audit) | 6 | 2 | **146 ms** | 0 | PASS |
| chad | a176 (m) | raise_concerns (social) | 3 | 2 | **150 ms** | 0 | PASS |

## run detail

**karen** — composure 5 -> 0, broke=true, 209 samples, 0 page errors
  - 971 .. 1005 ms  (84 ms)
  - 1150 .. 10503 ms  (9402 ms)

**grandma** — composure 5 -> 0, broke=true, 208 samples, 0 page errors
  - 648 .. 648 ms  (50 ms)
  - 1008 .. 1104 ms  (146 ms)

**chad** — composure 5 -> 0, broke=true, 210 samples, 0 page errors
  - 638 .. 658 ms  (70 ms)
  - 1003 .. 1103 ms  (150 ms)
