// Named predicate escape hatch. P5's extracted ACTS and DERIVE rows do not use
// one, so the whitelist is intentionally empty rather than inventing opaque
// reachability dependencies. Future entries must provide { test, doc, reads }.
export const PREDICATES = Object.freeze({});
