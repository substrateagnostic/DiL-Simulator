import { ACTS, ALL_RENOVATION_FLAGS, DERIVE } from './graph.js';
import { PREDICATES } from './predicates.js';

const DEFAULT_SETS = Object.freeze({
  RENOVATION_FLAGS: ALL_RENOVATION_FLAGS,
});

function flagValue(flags, id) {
  if (flags instanceof Map) return flags.get(id);
  return flags?.[id];
}

export function evalExpr(expr, ctx) {
  if (typeof expr === 'string') return Boolean(flagValue(ctx.flags, expr));
  if (!Array.isArray(expr) || expr.length === 0) {
    throw new TypeError(`Invalid story expression: ${JSON.stringify(expr)}`);
  }

  const [op, ...args] = expr;
  switch (op) {
    case 'not':
      return !evalExpr(args[0], ctx);
    case 'all':
      return args.every(term => evalExpr(term, ctx));
    case 'any':
      return args.some(term => evalExpr(term, ctx));
    case 'room':
      return ctx.room === args[0];
    case 'set': {
      const members = ctx.sets?.[args[0]];
      if (!Array.isArray(members)) throw new Error(`Unknown story flag set: ${args[0]}`);
      return members.every(id => Boolean(flagValue(ctx.flags, id)));
    }
    case 'pred': {
      const predicate = PREDICATES[args[0]];
      if (!predicate) throw new Error(`Unknown story predicate: ${args[0]}`);
      return Boolean(predicate.test(ctx));
    }
    default:
      throw new Error(`Unknown story expression operator: ${op}`);
  }
}

export function deriveFlags(player, opts = {}) {
  const sets = { ...DEFAULT_SETS, ...(opts.sets || {}) };
  const ctx = {
    flags: player.flags,
    room: player.currentRoom,
    act: player.actIndex,
    sets,
  };
  const changed = [];
  const deferred = [];

  // Deliberately one ordered pass. Do not repeat until stable: rules later in
  // the array see earlier writes, but earlier rules do not see later writes.
  for (const rule of DERIVE) {
    const previous = Boolean(player.getFlag(rule.id));
    if (rule.mode === 'latch' && previous) continue;

    const value = evalExpr(rule.when, ctx);
    if (rule.mode === 'latch' && !value) continue;
    if (rule.deferWhile && !opts.ignoreDefers && evalExpr(rule.deferWhile, ctx)) {
      deferred.push(rule.id);
      continue;
    }

    player.setFlag(rule.id, value);
    if (previous !== value) changed.push({ id: rule.id, previous, value });
  }

  return { changed, deferred };
}

export function actIndexFor(flags) {
  let index = 0;
  const ctx = { flags, room: null, act: 0, sets: DEFAULT_SETS };
  for (const act of ACTS) {
    if (evalExpr(act.when, ctx)) index = act.index;
  }
  return index;
}

export function questIdFor(flags) {
  let questId = 'main_act1';
  const ctx = { flags, room: null, act: 0, sets: DEFAULT_SETS };
  for (const act of ACTS) {
    if (evalExpr(act.when, ctx)) questId = act.quest;
  }
  return questId;
}
