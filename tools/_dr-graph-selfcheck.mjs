import assert from 'node:assert/strict';

import { ACTS, ALL_RENOVATION_FLAGS, DERIVE, GATES } from '../src/data/story/graph.js';
import { actIndexFor, deriveFlags, questIdFor } from '../src/data/story/evaluator.js';

assert.equal(ACTS.length, 7);
assert.equal(DERIVE.length, 13);
assert.equal(DERIVE.filter(rule => rule.mode === 'live').length, 5);
assert.equal(GATES.length, 13);
assert.ok(DERIVE.every(rule => typeof rule.note === 'string' && rule.note.length > 0));
console.log('shape', JSON.stringify({
  acts: ACTS.length,
  derive: DERIVE.length,
  live: DERIVE.filter(rule => rule.mode === 'live').length,
  gates: GATES.length,
}));

function playerWith(flags = {}, room = 'cubicle_farm') {
  return {
    flags: { ...flags },
    currentRoom: room,
    actIndex: 0,
    getFlag(id) { return this.flags[id] || false; },
    setFlag(id, value = true) { this.flags[id] = value; },
  };
}

const coworkers = playerWith({
  met_janet: true,
  met_intern: true,
  met_isaiah: true,
  met_alex_it: true,
  met_rachel: true,
});
const coworkerResult = deriveFlags(coworkers);
assert.equal(coworkers.flags.ready_for_skip, true);
console.log('coworkers', JSON.stringify(coworkerResult));

const ordered = playerWith({ act5_complete: true, board_meeting_held: true });
deriveFlags(ordered);
assert.equal(ordered.flags.board_meeting_closed, true);
assert.equal(ordered.flags.intern_at_desk, false);
console.log('ordered-pass-1', JSON.stringify({
  intern_at_desk: ordered.flags.intern_at_desk,
  board_meeting_closed: ordered.flags.board_meeting_closed,
}));
deriveFlags(ordered);
assert.equal(ordered.flags.intern_at_desk, true);
console.log('ordered-pass-2', JSON.stringify({
  intern_at_desk: ordered.flags.intern_at_desk,
  board_meeting_closed: ordered.flags.board_meeting_closed,
}));

const deferred = playerWith({ board_meeting_held: true }, 'board_room');
const deferredResult = deriveFlags(deferred);
assert.equal(deferred.getFlag('board_meeting_closed'), false);
assert.deepEqual(deferredResult.deferred, ['board_meeting_closed']);
console.log('deferred', JSON.stringify(deferredResult));
const bypassResult = deriveFlags(deferred, { ignoreDefers: true });
assert.equal(deferred.flags.board_meeting_closed, true);
console.log('defer-bypass', JSON.stringify(bypassResult));

const renovated = playerWith(Object.fromEntries(
  ALL_RENOVATION_FLAGS.map(flag => [flag, true]),
));
deriveFlags(renovated);
assert.equal(renovated.flags.renovations_all, true);
console.log('renovations', JSON.stringify({
  count: ALL_RENOVATION_FLAGS.length,
  renovations_all: renovated.flags.renovations_all,
}));

const ladder = { briefing_complete: true, act2_complete: true, act5_complete: true };
assert.equal(actIndexFor(ladder), 6);
assert.equal(questIdFor(ladder), 'main_act6');
console.log('ladder', JSON.stringify({
  actIndex: actIndexFor(ladder),
  questId: questIdFor(ladder),
}));

console.log('graph self-check PASS');
