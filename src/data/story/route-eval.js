import { DIALOG_ROUTES } from './routes.js';
function flagValue(flags, id) { return flags instanceof Map ? flags.get(id) : flags?.[id]; }
function matchesFilter(filter, value) {
  return filter === undefined
    || (Array.isArray(filter) ? filter.includes(value) : filter === value);
}
function evalWhen(expr, ctx) {
  if (typeof expr === 'string') return Boolean(flagValue(ctx.flags, expr));
  if (!Array.isArray(expr) || expr.length === 0) throw new TypeError(`Invalid route expression: ${JSON.stringify(expr)}`);
  const [op, ...args] = expr;
  switch (op) {
    case 'not': return !evalWhen(args[0], ctx);
    case 'all': return args.every(term => evalWhen(term, ctx));
    case 'any': return args.some(term => evalWhen(term, ctx));
    case 'room': return ctx.room === args[0];
    case 'set': {
      const members = ctx.sets?.[args[0]];
      if (!Array.isArray(members)) throw new Error(`Unknown route flag set: ${args[0]}`);
      return members.every(id => Boolean(flagValue(ctx.flags, id)));
    }
    case 'npc': return ctx.npc.id === args[0];
    case 'npcDialogId': return ctx.npc.dialogId === args[0];
    case 'dialogExists': return Boolean(ctx.dialogs[args[0]]);
    case 'act': {
      const value = Number(ctx.act || 0);
      if (args[0] === '>=') return value >= args[1];
      if (args[0] === '==') return value === args[1];
      if (args[0] === '<') return value < args[1];
      throw new Error(`Unknown route act comparator: ${args[0]}`);
    }
    case 'pred': {
      const predicate = ctx.predicates?.[args[0]];
      if (predicate === undefined) throw new Error(`Unknown route predicate: ${args[0]}`);
      return Boolean(typeof predicate === 'function' ? predicate(ctx) : predicate);
    }
    default: throw new Error(`Unknown route expression operator: ${op}`);
  }
}
function applyEffects(effect, ctx) {
  if (!ctx.commit || !effect) return;
  const effects = Array.isArray(effect) ? effect : [effect];
  for (const item of effects) {
    if (!item.when || evalWhen(item.when, ctx)) ctx.setFlag(item.flag, item.value);
  }
}
function resolveThen(then, ctx) {
  if (typeof then === 'string') return then;
  if (then[0] === 'npcDialogId') return ctx.npc.dialogId;
  if (then[0] === 'ladder') return ctx.ladder();
  if (then[0] === 'first') return then.slice(1).find(id => ctx.dialogs[id]);
  throw new Error(`Unknown route result: ${JSON.stringify(then)}`);
}
export function resolveRoute(ctx) {
  for (const rule of DIALOG_ROUTES) {
    if (!matchesFilter(rule.npc, ctx.npc.id) || !matchesFilter(rule.room, ctx.room)) continue;
    if (!evalWhen(rule.when, ctx)) continue;
    ctx.onMatch?.(rule);
    applyEffects(rule.effect, ctx);
    return resolveThen(rule.then, ctx);
  }
  return ctx.npc.id;
}
