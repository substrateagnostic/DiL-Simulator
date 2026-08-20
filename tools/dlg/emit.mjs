function labelIndex(scene, indexOf) {
  const labels = new Map();
  for (const stmt of scene.stmts) {
    const index = indexOf.get(stmt);
    for (const label of stmt.labels) labels.set(label, index);
  }
  return labels;
}

function resolve(labels, name, context) {
  if (name === null || name === undefined) return undefined;
  if (!labels.has(name)) throw new Error(`${context} refers to undefined label @${name}.`);
  return labels.get(name);
}

function emitAction(stmt) {
  const node = { type: 'action', action: stmt.action };
  const fields = {
    set_flag: ['flag', 'value'],
    give_xp: ['xp'],
    start_combat: ['encounter'],
    quest_update: ['quest', 'stage', 'objective', 'status'],
    modify_stat: ['stat', 'amount'],
    give_item: ['item', 'quantity'],
    recruit_ally: ['ally'],
    unlock_ally_ability: ['ally', 'ability'],
    heal: [],
  }[stmt.action];
  if (!fields) throw new Error(`Cannot emit unknown action ${stmt.action}.`);
  for (const field of fields) if (Object.hasOwn(stmt, field)) node[field] = stmt[field];
  return node;
}

export function emitNodes(scene, indexOf, length, pads = []) {
  const labels = labelIndex(scene, indexOf);
  const nodes = Array.from({ length }, () => undefined);
  for (const index of pads) nodes[index] = { type: 'end' };

  for (const stmt of scene.stmts) {
    const index = indexOf.get(stmt);
    if (!Number.isInteger(index)) throw new Error('Every statement needs an allocated integer index before emission.');
    let node;
    if (stmt.kind === 'text') {
      node = { type: 'text', speaker: stmt.speaker, text: stmt.text };
      if (Object.hasOwn(stmt, 'mood')) node.mood = stmt.mood;
    } else if (stmt.kind === 'choice') {
      node = { type: 'choice' };
      if (Object.hasOwn(stmt, 'speaker')) node.speaker = stmt.speaker;
      node.prompt = stmt.prompt;
      node.choices = stmt.arms.map((arm) => {
        const choice = {
          text: arm.text,
          next: resolve(labels, arm.next, `Choice ${JSON.stringify(arm.text)}`),
        };
        for (const field of ['flag', 'flagValue', 'requires', 'requiresNot']) {
          if (Object.hasOwn(arm, field)) choice[field] = arm[field];
        }
        // The working-style check: one arm, two renderings, ONE choice index.
        // `check` is the trait flag; holders read `text` and take `next`,
        // everyone else reads `failText` and takes `failNext` (DialogState).
        if (Object.hasOwn(arm, 'check')) {
          choice.check = arm.check;
          choice.failText = arm.failText;
          choice.failNext = resolve(labels, arm.failNext, `Fail branch of choice ${JSON.stringify(arm.text)}`);
        }
        return choice;
      });
    } else if (stmt.kind === 'condition') {
      node = { type: 'condition', flag: stmt.flag };
      if (stmt.ifTrue) node.ifTrue = resolve(labels, stmt.ifTrue, 'Condition true branch');
      if (stmt.ifFalse) node.ifFalse = resolve(labels, stmt.ifFalse, 'Condition false branch');
    } else if (stmt.kind === 'action') {
      node = emitAction(stmt);
    } else if (stmt.kind === 'stage') {
      node = { type: 'stage' };
      if (stmt.concurrent) node.concurrent = true;
      const beatLabels = new Map();
      stmt.beats.forEach((beat, beatIndex) => {
        for (const label of beat.labels) beatLabels.set(label, beatIndex);
      });
      node.beats = stmt.beats.map((beat) => {
        const emitted = { actor: beat.actor };
        for (const { verb, value } of beat.ops) {
          if (verb === 'nowait') emitted.wait = false;
          else if (verb === 'after') emitted.after = resolve(beatLabels, value, 'Stage beat after reference');
          else emitted[verb] = value;
        }
        return emitted;
      });
    } else if (stmt.kind === 'end') {
      node = { type: 'end' };
    } else {
      throw new Error(`Cannot emit unknown statement kind ${stmt.kind}.`);
    }
    if (stmt.next) node.next = resolve(labels, stmt.next, `${stmt.kind} goto`);
    if (nodes[index] !== undefined) throw new Error(`Two statements were allocated to index ${index}.`);
    nodes[index] = node;
  }

  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index] === undefined) nodes[index] = { type: 'end' };
  }
  return nodes;
}
