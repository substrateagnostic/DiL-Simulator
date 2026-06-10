# Act 6½ — The Countersignature (Design Doc)

**Premise.** The 1947 charter Andrew recovered is legally inert: Article 9 requires it be
"witnessed and sealed by the Recorder or their living deputy." The only living deputy is
**Delia Okafor** — Deputy Recorder 1981–2009, and the name Andrew already read in the Janitor's
ledger ("good elbows, fixed the ice machine once, REMEMBERED"). Rachel's outside counsel files a
charter challenge at 5:00 PM. Andrew has one afternoon, one city, and no idea where Delia is.

**Slot.** Mandatory, between `act6_complete` (Rolex) and the penthouse. The penthouse gate
changes from `act6_complete` → `charter_certified`. Trigger: first penthouse attempt after the
Rolex → blocked toast → Ross panic dialog → Janitor names Delia → `city_unlocked` set →
new exit opens from the **parking garage** (the garage door becomes the threshold to outside).

**Tone.** The building's bureaucratic dread, scaled to a city that *works* — the city is what the
building forgot how to be. Daylight. Strangers who help. Specificity everywhere (bus routes,
form numbers, diner booth numbers).

## Locations (new rooms)

| Room id | Name | Size | Notes |
|---|---|---|---|
| `city_street` | Fennimore Avenue | 26×12 | Outdoor hub. Sidewalk/asphalt floors, building facades as north wall, parked cars, hydrant, lamppost, newspaper boxes, bus stop. Exits: garage (S), records hall (N), diner (E), bus stop → transit. Parking Enforcer patrols. |
| `transit_bus` | The 5:15 Crosstown | 12×5 | Interior, narrow aisle, seated NPC strangers. The 5:15 is always late — except today (it's early, which everyone agrees is worse). Optional sidequest: the driver's lost transfer ledger. |
| `records_hall` | Hall of Records | 18×14 | Borges room. Towering shelf rows, a single clerk desk, queue ropes. The Clerk speaks in form numbers; getting Delia's last-known address = the **Form 11-C chain** (riddle-gate in dialog, no combat). Optional: deep-stacks side area with lore files about the building's 1947 founding. |
| `luckys_diner` | Lucky's | 12×8 | Warm. Booths, counter, pie case. Delia holds court in booth 4. She won't be rushed: Andrew must *sit down and listen* (dialog-driven; she tests him on why the charter matters before she'll move). |
| `old_branch` | The Roastery (née Vaults Fargo No. 1) | 14×10 | Espresso machines over marble. 1947 teller windows now a pastry case. Exit DOWN → `old_vault`. |
| `old_vault` | The First Vault | 8×8 | Delia's seal is here, in deposit box 0001 — she kept the key on her keyring for seventeen years. Boss arena: **The Firm** ambush as the seal comes out. |

## Encounters

| Encounter | Where | Notes |
|---|---|---|
| `parking_enforcer` | street | Optional repeatable-ish; tutorialises outdoor combat. Weak to `legal`. |
| `networking_guy` | street/diner | Optional. "Quick coffee?" Drains Coffee each turn. Weak to `social`. |
| `records_clerk` | records_hall | NOT a fight — dialog riddle chain (wrong form → back of the queue, janitor-riddle retry pattern). |
| `the_firm` | old_vault | **Boss, 3v1** (multi-combatant: `firm_partner`, `firm_associate`, `firm_paralegal`). They speak in relay. Delia assists from the sidelines via dialog beats between phases (not an engine ally — scope control). |

XP budget: street fights ~90 each, The Firm ~400 total. Designed for level 8–10 arrival.

## Spine vs. sides

**Mandatory spine:** garage exit → street → records hall (Form 11-C chain) → diner (Delia, booth 4)
→ old branch → vault → The Firm → `charter_certified` → penthouse opens.

**Optional sides** (the lengthen-the-game lever; all soft-gated, none block the spine):
- *The 5:15* — transit mystery (the bus that's never early was early; the driver knows why).
- *Deep Stacks* — records hall lore run; rewards a permanent +DEF and the 1947 founding file.
- *Meter Maid War* — three parking enforcer wins → the Enforcer respects you; cosmetic reward (Ticket Stub badge).

## Key flags

`city_unlocked`, `read_ross_charter_panic`, `form_11c_done`, `met_delia`, `delia_moved` (she heads
to the old branch), `has_recorder_seal`, `defeated_the_firm` (auto), `charter_certified`
(set by Delia's post-boss certification dialog — THE flag the penthouse gate reads),
plus side flags `bus515_done`, `deep_stacks_done`, `meter_war_done`.

## Wiring changes

- `_changeRoom` gate: `penthouse: { flag: 'charter_certified', message: "Corporate counsel has challenged the charter. It needs the Recorder's seal — find Delia Okafor." }` (replaces `act6_complete` gate).
- Parking garage gains a south exit → `city_street`, condition-gated on `city_unlocked`
  (exit tiles are unconditional in room data — gate in `_changeRoom` like other rooms).
- `_getStoryObjective()` entries for each spine stage; `_updateLocationDisplay()` names for all six rooms.
- Outdoor lighting: bright ambient + warm dir (no flicker); street uses `windows`-style skyline
  on facades? No — street IS outside; use the P4 city backdrop + open-air lighting.
- Delia portrait (P6 art batch); Firm portraits optional (shared one for the chorus).
- All dialog written to WRITING.md anchors. Delia = Gwendolyn Brooks; Clerk = Borges; Firm = chorus.

## Beats that must land

1. The ledger callback: Andrew recognizes Delia's name *before* the Janitor says it. Let the
   player feel smart.
2. Delia's test in booth 4: she asks Andrew the question every survivor asks — "Why didn't anyone
   come when it was us?" — and the honest answer ("I didn't know. I know now.") is the pass.
3. The seal comes out of box 0001 oiled and wrapped in a 2009 newspaper. She maintained it for
   seventeen years for a day she didn't believe would come.
4. The Firm serves Andrew *mid-cutscene* — interrupting dialog with combat is the joke.
5. Certification is one stamp. After everything, it takes two seconds. Bureaucracy's final joke
   is that the right stamp was always this easy with the right person holding it.
