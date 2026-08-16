// Named predicate escape hatch for the DERIVE/ACTS evaluator. P5's extracted
// rows do not use one, so the whitelist is intentionally empty rather than
// inventing opaque reachability dependencies. Future entries must provide
// { test, doc, reads }.
//
// DOCUMENTED DEVIATION FROM DESIGN 4.2, so nobody discovers it by surprise:
// the ROUTING table's `['pred', X]` does NOT resolve here. `route-eval.js`
// reads `ctx.predicates`, which `ExplorationState._getDialogRouteContext`
// builds inline — nine closures (npcHasDialogId, stashJanitorRoutes,
// alexMainPathPending, sideQuestInProgress, alexBadgeMissionWindow and the six
// alexSide* selectors). The design said every predicate would live in this
// whitelist with a `reads: [...flags]` array so the simulator could see through
// it; the routing ones do not, with two consequences, both UNDER-reporting and
// neither able to raise a false alarm:
//   * `flagsReadByExpr` returns nothing for a routing `pred`, so check B is
//     blind through them. Harmless today only because the same flags are
//     recovered by regex from the legacy source — which is scheduled for
//     deletion with `?routes=legacy`, and THAT is when this must be closed.
//   * `satAtoms` models each `@pred:` as a free boolean, so check G can prove a
//     dead row alive on an assignment the real predicate could not produce.
// Closing it means moving those nine here with `reads` arrays. Do it before the
// legacy router is deleted, not after.
export const PREDICATES = Object.freeze({});
