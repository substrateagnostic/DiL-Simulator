# WHITE-RUN TABLE — flashEnemy re-entrancy

sampler 20 Hz, window 10 s past a real Composure Break, headed, qtier=high.
PASS = longest contiguous white run <= 200 ms AND last sample white 0.

| fight | stagger | weakness hit | meshes | white runs | longest run | last sample | verdict |
|---|---|---|---|---|---|---|---|
| karen | a391 (f) | file_motion (legal) | 3 | 1 | **200 ms** | 0 | PASS |
| grandma | a391 (f) | spot_check (audit) | 6 | 2 | **147 ms** | 0 | PASS |
| chad | a176 (m) | raise_concerns (social) | 3 | 2 | **190 ms** | 0 | PASS |

## run detail

**karen** — composure 5 -> 0, broke=true, 209 samples, 0 page errors
  - 953 .. 1103 ms  (200 ms)

**grandma** — composure 5 -> 0, broke=true, 209 samples, 0 page errors
  - 623 .. 652 ms  (78 ms)
  - 955 .. 1052 ms  (147 ms)

**chad** — composure 5 -> 0, broke=true, 209 samples, 0 page errors
  - 625 .. 653 ms  (78 ms)
  - 960 .. 1101 ms  (190 ms)
