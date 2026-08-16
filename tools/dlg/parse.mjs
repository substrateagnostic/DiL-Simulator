import { diagnostic, nearestNames } from './diagnostics.mjs';
import { lexFile } from './lex.mjs';

export const DIRECTIVES = Object.freeze([
  'ask', 'if', 'goto', 'end', 'set', 'fight', 'give', 'xp', 'stat', 'heal', 'quest',
  'recruit', 'teach',
]);

const DIRECTIVE_SET = new Set(DIRECTIVES);
const ID = '[A-Za-z0-9_]+';
const NUMBER = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const INTEGER = '[+-]?\\d+';
const NO_ARG_BEATS = new Set(['sit', 'stand', 'spawn', 'show', 'nowait']);
const ID_ARG_BEATS = new Set(['face', 'teleportTo', 'gesture', 'pose', 'expression', 'after']);
const POINT_ARG_BEATS = new Set(['walkTo', 'spawnAt', 'exit']);
const NUMBER_ARG_BEATS = new Set(['speed', 'hold']);
const BEAT_VERBS = new Set([
  ...NO_ARG_BEATS, ...ID_ARG_BEATS, ...POINT_ARG_BEATS, ...NUMBER_ARG_BEATS,
]);

function toNumber(source) {
  const value = Number(source);
  return Object.is(value, -0) ? 0 : value;
}

function defineHidden(object, key, value) {
  Object.defineProperty(object, key, { value, writable: true, enumerable: false });
}

function parseValue(source) {
  const value = source.trim();
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  if (new RegExp(`^${NUMBER}$`).test(value)) return { ok: true, value: toNumber(value) };
  if (/^"[^"]*"$/.test(value)) return { ok: true, value: value.slice(1, -1) };
  if (value.startsWith('"')) {
    return { ok: false, reason: 'This value starts with a double quote but does not have a closing double quote.' };
  }
  return {
    ok: false,
    reason: 'A value must be true, false, a number, or text enclosed in double quotes.',
  };
}

function proseParts(line) {
  const content = line.raw.slice(line.indent);
  const colon = content.indexOf(':');
  if (colon < 0) return null;
  const head = content.slice(0, colon).trimEnd();
  let prose = content.slice(colon + 1);
  if (prose.startsWith(' ')) prose = prose.slice(1);
  return { head, prose };
}

function idFromStart(source) {
  const match = source.match(new RegExp(`^(${ID})(?=\\s|$)`));
  return match ? { value: match[1], rest: source.slice(match[0].length) } : null;
}

function valueFromStart(source) {
  const trimmed = source.trimStart();
  if (trimmed.startsWith('"')) {
    const close = trimmed.indexOf('"', 1);
    if (close < 0) return { error: 'This value starts with a double quote but does not have a closing double quote.' };
    return { source: trimmed.slice(0, close + 1), rest: trimmed.slice(close + 1) };
  }
  const match = trimmed.match(new RegExp(`^(true|false|${NUMBER})(?=\\s|$)`));
  return match ? { source: match[1], rest: trimmed.slice(match[0].length) } : null;
}

function parseArmHead(head) {
  let rest = head.replace(/^->\s*/, '');
  const target = idFromStart(rest);
  if (!target) return { error: 'A choice arm needs a destination label after ->.' };
  rest = target.rest;
  const arm = { next: target.value };
  const seen = new Set();

  while (rest.trim() !== '') {
    rest = rest.trimStart();
    const modMatch = rest.match(/^(sets|requires|unless)(?=\s|$)/);
    if (!modMatch) {
      return { error: 'A choice arm expects only sets, requires, or unless modifiers before its colon.' };
    }
    const mod = modMatch[1];
    rest = rest.slice(modMatch[0].length).trimStart();
    const flag = mod === 'sets'
      ? (() => {
        const match = rest.match(new RegExp(`^(${ID})(?=\\s|=|$)`));
        return match ? { value: match[1], rest: rest.slice(match[0].length) } : null;
      })()
      : idFromStart(rest);
    if (!flag) return { error: `The ${mod} modifier needs a flag name.` };
    rest = flag.rest;
    if (seen.has(mod)) return { error: `A choice arm may use ${mod} only once.` };
    seen.add(mod);

    if (mod === 'sets') {
      arm.flag = flag.value;
      const afterFlag = rest.trimStart();
      if (afterFlag.startsWith('=')) {
        const parsedSource = valueFromStart(afterFlag.slice(1));
        if (!parsedSource) return { error: 'The sets modifier needs a value after =.' };
        if (parsedSource.error) return { error: parsedSource.error };
        const parsedValue = parseValue(parsedSource.source);
        if (!parsedValue.ok) return { error: parsedValue.reason };
        arm.flagValue = parsedValue.value;
        rest = parsedSource.rest;
      }
    } else if (mod === 'requires') {
      arm.requires = flag.value;
    } else {
      arm.requiresNot = flag.value;
    }
  }
  return { arm };
}

function consumeIdArg(rest) {
  const parsed = idFromStart(rest.trimStart());
  return parsed ? { value: parsed.value, rest: parsed.rest } : null;
}

function consumeNumberArg(rest) {
  const trimmed = rest.trimStart();
  const match = trimmed.match(new RegExp(`^(${NUMBER})(?=\\s|$)`));
  return match ? { value: toNumber(match[1]), rest: trimmed.slice(match[0].length) } : null;
}

function consumePointOrId(rest) {
  const trimmed = rest.trimStart();
  const point = trimmed.match(new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})(?=\\s|$)`));
  if (point) {
    return {
      value: [toNumber(point[1]), toNumber(point[2])],
      rest: trimmed.slice(point[0].length),
    };
  }
  return consumeIdArg(trimmed);
}

function parseBeatBody(body) {
  let rest = body;
  const labels = [];
  const inlineLabel = rest.match(new RegExp(`^@(${ID})\\s+`));
  if (inlineLabel) {
    labels.push(inlineLabel[1]);
    rest = rest.slice(inlineLabel[0].length);
  }
  const actor = idFromStart(rest);
  if (!actor) return { error: 'A stage beat needs an actor name followed by at least one beat verb.' };
  if (DIRECTIVE_SET.has(actor.value)) {
    return {
      error: `The beat actor is the directive keyword \`${actor.value}\`. This usually means the line should be de-indented to end the stage block.`,
    };
  }
  rest = actor.rest;
  const ops = [];
  const seen = new Set();
  while (rest.trim() !== '') {
    rest = rest.trimStart();
    const verbMatch = rest.match(/^([A-Za-z][A-Za-z0-9]*)(?=\s|$)/);
    if (!verbMatch || !BEAT_VERBS.has(verbMatch[1])) {
      const shown = verbMatch?.[1] ?? rest.split(/\s/, 1)[0];
      return { error: `A stage beat expected a known beat verb, but found \`${shown}\`.` };
    }
    const verb = verbMatch[1];
    if (seen.has(verb)) return { error: `A stage beat may use ${verb} only once.` };
    seen.add(verb);
    rest = rest.slice(verbMatch[0].length);
    if (NO_ARG_BEATS.has(verb)) {
      ops.push({ verb, value: verb === 'nowait' ? false : true });
      continue;
    }
    let parsed;
    if (ID_ARG_BEATS.has(verb)) parsed = consumeIdArg(rest);
    else if (POINT_ARG_BEATS.has(verb)) parsed = consumePointOrId(rest);
    else parsed = consumeNumberArg(rest);
    if (!parsed) {
      const expected = NUMBER_ARG_BEATS.has(verb)
        ? 'a number'
        : POINT_ARG_BEATS.has(verb)
          ? 'a mark name or x,y coordinate pair'
          : 'an id';
      return { error: `The ${verb} beat verb needs ${expected}.` };
    }
    ops.push({ verb, value: parsed.value });
    rest = parsed.rest;
  }
  if (ops.length === 0) return { error: 'A stage beat needs at least one beat verb after its actor.' };
  return { beat: { labels, actor: actor.value, ops } };
}

function parseAction(body) {
  let match;
  if ((match = body.match(new RegExp(`^set\\s+(${ID})(?:\\s*=\\s*(.*))?$`)))) {
    if (match[2] === undefined) return { action: 'set_flag', flag: match[1], value: true };
    if (match[2] === '') return { error: 'The set action needs a value after =.' };
    const value = parseValue(match[2]);
    return value.ok
      ? { action: 'set_flag', flag: match[1], value: value.value }
      : { error: value.reason };
  }
  if ((match = body.match(new RegExp(`^fight\\s+(${ID})$`)))) {
    return { action: 'start_combat', encounter: match[1] };
  }
  if ((match = body.match(new RegExp(`^give\\s+(${ID})(?:\\s+x\\s*(${INTEGER}))?$`)))) {
    const result = { action: 'give_item', item: match[1] };
    if (match[2] !== undefined) result.quantity = toNumber(match[2]);
    return result;
  }
  if (body.startsWith('give ')) {
    return { error: 'The give action expects an item id and an optional integer quantity such as x2 or x 2.' };
  }
  if ((match = body.match(new RegExp(`^xp\\s+(${INTEGER})$`)))) {
    return { action: 'give_xp', xp: toNumber(match[1]) };
  }
  if (body.startsWith('xp')) return { error: 'The xp action needs an integer amount.' };
  if ((match = body.match(new RegExp(`^stat\\s+(${ID})\\s+(${INTEGER})$`)))) {
    return { action: 'modify_stat', stat: match[1], amount: toNumber(match[2]) };
  }
  if (body.startsWith('stat')) return { error: 'The stat action needs a stat id and a signed or bare integer amount.' };
  if (body === 'heal') return { action: 'heal' };
  if ((match = body.match(new RegExp(`^quest\\s+(${ID})\\s+stage\\s+(${INTEGER})$`)))) {
    return { action: 'quest_update', quest: match[1], stage: toNumber(match[2]) };
  }
  if ((match = body.match(new RegExp(`^quest\\s+(${ID})\\s+objective\\s+(${INTEGER})(?:\\s+status\\s+(${ID}))?$`)))) {
    const result = { action: 'quest_update', quest: match[1], objective: toNumber(match[2]) };
    if (match[3] !== undefined) result.status = match[3];
    return result;
  }
  if (body.startsWith('quest')) {
    return { error: 'The quest action expects stage <integer> or objective <integer> with an optional status <id>.' };
  }
  if ((match = body.match(new RegExp(`^recruit\\s+(${ID})$`)))) {
    return { action: 'recruit_ally', ally: match[1] };
  }
  if (body.startsWith('recruit')) return { error: 'The recruit action needs an ally id.' };
  if ((match = body.match(new RegExp(`^teach\\s+(${ID})\\s+(${ID})$`)))) {
    return { action: 'unlock_ally_ability', ally: match[1], ability: match[2] };
  }
  if (body.startsWith('teach')) return { error: 'The teach action needs an ally id and an ability id.' };
  return { error: 'This action line does not match a known action form.' };
}

function unresolvedMessage(kind, target, names, context = '') {
  const nearest = nearestNames(target, names);
  const listed = nearest.length ? nearest.map((name) => `@${name}`).join(', ') : '(none)';
  const prefix = context ? `${context} ` : '';
  return {
    message: `${prefix}jumps to @${target}, which this scene does not define. Nearest labels: ${listed}.`,
    suggestions: nearest,
  };
}

export function parseDlg(text, filename = '<input>') {
  const lines = lexFile(text, filename);
  const scenes = [];
  const comments = [];
  const diagnostics = [];
  const sceneIds = new Map();
  let scene = null;
  let pendingLabels = [];
  let pendingComments = [];
  let lastLabel = '(start)';
  let lastStatement = null;
  let lastWasGoto = false;
  let currentAsk = null;
  let currentStage = null;

  const addDiagnostic = (line, message, suggestions = [], contextScene = scene, label = lastLabel) => {
    diagnostics.push(diagnostic({
      file: filename,
      line: line?.n ?? line?.line ?? 1,
      sceneId: contextScene?.id ?? '(before any scene)',
      nearestLabel: label,
      message,
      suggestions,
    }));
    if (contextScene) contextScene._errorCount += 1;
  };

  const attachComments = (anchorKind, target, owner = null) => {
    for (const entry of pendingComments) {
      const { comment, labelPosition } = entry;
      if (anchorKind === 'scene') comment.attachedTo = 'scene';
      else if (anchorKind === 'eof') comment.attachedTo = 'eof';
      else comment.attachedTo = owner ?? target;
      defineHidden(comment, '_anchor', { kind: anchorKind, target, labelPosition });
      if (owner?.comments) owner.comments.push({ text: comment.text });
    }
    pendingComments = [];
  };

  const requireScene = (line) => {
    if (scene) return true;
    addDiagnostic(line, 'A dialog statement must appear after a scene <id> line.');
    return false;
  };

  const addStatement = (stmt, line) => {
    stmt.labels = pendingLabels.map(({ name }) => name);
    stmt.line = line.n;
    stmt.comments = [];
    if ('next' in stmt === false && ['text', 'choice', 'action', 'stage'].includes(stmt.kind)) stmt.next = null;
    defineHidden(stmt, '_nearestLabel', lastLabel);
    defineHidden(stmt, '_source', line);
    scene.stmts.push(stmt);
    attachComments('stmt', stmt, stmt);
    pendingLabels = [];
    lastStatement = stmt;
    lastWasGoto = false;
    scene._hasStatement = true;
    return stmt;
  };

  for (const line of lines) {
    if (line.kind === 'blank') continue;
    if (line.kind === 'comment') {
      const comment = { text: line.raw, attachedTo: null };
      defineHidden(comment, '_line', line.n);
      comments.push(comment);
      pendingComments.push({ comment, labelPosition: pendingLabels.length });
      continue;
    }

    if (line.kind !== 'arm') currentAsk = null;
    if (line.kind !== 'beat') currentStage = null;

    if (line.kind === 'scene') {
      const match = line.body.match(new RegExp(`^scene\\s+(${ID})$`));
      if (!match) {
        addDiagnostic(line, 'A scene line must be written as scene <id>.');
        continue;
      }
      if (pendingLabels.length) {
        addDiagnostic(line, 'A label at the end of a scene needs a statement to attach to.');
        pendingLabels = [];
      }
      const nextScene = { id: match[1], modes: [], line: line.n, stmts: [] };
      defineHidden(nextScene, '_labels', new Map());
      defineHidden(nextScene, '_errorCount', 0);
      defineHidden(nextScene, '_hasStatement', false);
      if (sceneIds.has(nextScene.id)) {
        addDiagnostic(
          line,
          `The scene id ${nextScene.id} is already used on line ${sceneIds.get(nextScene.id)}; every scene id must be unique.`,
          [],
          nextScene,
          '(start)',
        );
      } else {
        sceneIds.set(nextScene.id, line.n);
      }
      scenes.push(nextScene);
      scene = nextScene;
      attachComments('scene', scene);
      pendingLabels = [];
      lastLabel = '(start)';
      lastStatement = null;
      lastWasGoto = false;
      continue;
    }

    if (line.kind === 'mode') {
      if (!requireScene(line)) continue;
      const match = line.body.match(/^mode\s+(quiz|evergreen-hub)$/);
      if (!match) {
        addDiagnostic(line, 'A mode line must say mode quiz or mode evergreen-hub.');
      } else if (scene._hasStatement) {
        addDiagnostic(line, 'A mode declaration must appear before the scene\'s first statement.');
      } else {
        attachComments('mode', { scene, modeIndex: scene.modes.length }, scene);
        scene.modes.push(match[1]);
      }
      continue;
    }

    if (line.kind === 'label') {
      if (!requireScene(line)) continue;
      const match = line.body.match(new RegExp(`^@(${ID})$`));
      if (!match) {
        addDiagnostic(line, 'A label must be written as @ followed by an id.');
        continue;
      }
      const name = match[1];
      if (scene._labels.has(name)) {
        addDiagnostic(line, `The label @${name} is already defined in this scene; each label may be defined only once.`);
        continue;
      }
      scene._labels.set(name, { stmt: null, line: line.n });
      pendingLabels.push({ name, line: line.n });
      lastLabel = name;
      continue;
    }

    if (line.kind === 'arm') {
      if (!requireScene(line)) continue;
      if (!currentAsk) {
        addDiagnostic(line, 'A choice arm must immediately follow an ask statement or another arm from that ask.');
        continue;
      }
      currentAsk._sawArmLine = true;
      const parts = proseParts(line);
      if (!parts) {
        addDiagnostic(line, 'A choice arm needs a colon followed by its prose.');
        continue;
      }
      const parsed = parseArmHead(parts.head);
      if (parsed.error) {
        addDiagnostic(line, parsed.error);
        continue;
      }
      const arm = { text: parts.prose, next: parsed.arm.next, line: line.n, comments: [] };
      for (const key of ['flag', 'flagValue', 'requires', 'requiresNot']) {
        if (key in parsed.arm) arm[key] = parsed.arm[key];
      }
      defineHidden(arm, '_nearestLabel', lastLabel);
      if (currentAsk._recovery) {
        attachComments('arm', arm, currentAsk);
        lastWasGoto = false;
        continue;
      }
      currentAsk.arms.push(arm);
      attachComments('arm', arm, currentAsk);
      lastWasGoto = false;
      continue;
    }

    if (line.kind === 'beat') {
      if (!requireScene(line)) continue;
      if (!currentStage) {
        addDiagnostic(line, 'A beat line must be indented strictly deeper than the stage statement it belongs to.');
        continue;
      }
      currentStage._sawBeatLine = true;
      const parsed = parseBeatBody(line.body);
      if (parsed.error) {
        addDiagnostic(line, parsed.error);
        continue;
      }
      const beat = { ...parsed.beat, line: line.n, comments: [] };
      defineHidden(beat, '_nearestLabel', lastLabel);
      if (currentStage._recovery) {
        attachComments('beat', beat, currentStage);
        lastWasGoto = false;
        continue;
      }
      for (const beatLabel of beat.labels) {
        if (currentStage._beatLabels.has(beatLabel)) {
          addDiagnostic(line, `The beat label @${beatLabel} is already used in this stage block.`);
          continue;
        }
        currentStage._beatLabels.set(beatLabel, currentStage.beats.length);
      }
      currentStage.beats.push(beat);
      attachComments('beat', beat, currentStage);
      lastWasGoto = false;
      continue;
    }

    if (line.kind === 'goto') {
      if (!requireScene(line)) continue;
      if (pendingLabels.length) {
        addDiagnostic(
          line,
          'A label here would attach to the statement after the goto; move it before that statement instead.',
        );
        continue;
      }
      const match = line.body.match(new RegExp(`^goto\\s+(${ID})$`));
      if (!match) {
        addDiagnostic(line, 'A goto modifier must be written as goto <label>.');
        continue;
      }
      if (lastWasGoto) {
        addDiagnostic(line, 'A statement may have only one goto modifier; two goto lines in a row are not allowed.');
        continue;
      }
      if (!lastStatement) {
        addDiagnostic(line, 'A goto modifier needs a text, action, stage, or ask statement immediately above it.');
        continue;
      }
      if (!['text', 'action', 'stage', 'choice'].includes(lastStatement.kind)) {
        addDiagnostic(line, `A goto modifier is not legal after ${lastStatement.kind}; use that statement's own control-flow form.`);
        continue;
      }
      attachComments('goto', lastStatement, lastStatement);
      lastStatement.next = match[1];
      defineHidden(lastStatement, '_nextLine', line.n);
      lastWasGoto = true;
      continue;
    }

    if (!requireScene(line)) continue;

    if (line.kind === 'say') {
      const parts = proseParts(line);
      if (!parts) {
        addDiagnostic(line, 'A spoken line needs a colon followed by prose.');
        continue;
      }
      const match = parts.head.match(new RegExp(`^([A-Z][^:]*?)(?:\\s+mood=(${ID}))?$`));
      if (!match) {
        addDiagnostic(line, 'A speaker name must start with a capital letter, with an optional mood=<id> before the colon.');
        continue;
      }
      const stmt = { kind: 'text', speaker: match[1], text: parts.prose };
      if (match[2] !== undefined) stmt.mood = match[2];
      addStatement(stmt, line);
      continue;
    }

    if (line.kind === 'ask') {
      const parts = proseParts(line);
      if (!parts) {
        addDiagnostic(line, 'An ask statement needs a colon followed by its prompt.');
        currentAsk = { _recovery: true, _sawArmLine: false, comments: [] };
        attachComments('stmt', currentAsk, currentAsk);
        continue;
      }
      let speaker;
      if (parts.head === 'ask') speaker = undefined;
      else {
        const match = parts.head.match(/^ask\s+([A-Z][^:]*)$/);
        if (!match) {
          addDiagnostic(line, 'An ask statement expects no speaker or a speaker name beginning with a capital letter.');
          currentAsk = { _recovery: true, _sawArmLine: false, comments: [] };
          attachComments('stmt', currentAsk, currentAsk);
          continue;
        }
        speaker = match[1];
      }
      const stmt = { kind: 'choice', prompt: parts.prose, arms: [] };
      if (speaker !== undefined) stmt.speaker = speaker;
      defineHidden(stmt, '_sawArmLine', false);
      addStatement(stmt, line);
      currentAsk = stmt;
      continue;
    }

    if (line.kind === 'if') {
      const match = line.body.match(new RegExp(`^if\\s+(${ID})(?:\\s+->\\s+(${ID}))?(?:\\s+else\\s+->\\s+(${ID}))?$`));
      if (!match) {
        addDiagnostic(line, 'An if statement expects a flag and optional -> <label> and else -> <label> branches.');
        continue;
      }
      const stmt = { kind: 'condition', flag: match[1], ifTrue: match[2] ?? null, ifFalse: match[3] ?? null };
      addStatement(stmt, line);
      continue;
    }

    if (line.kind === 'end') {
      if (line.body !== 'end') {
        addDiagnostic(line, 'An end statement is written as the single word end.');
        continue;
      }
      addStatement({ kind: 'end' }, line);
      continue;
    }

    if (line.kind === 'action') {
      const parsed = parseAction(line.body);
      if (parsed.error) {
        addDiagnostic(line, parsed.error);
        continue;
      }
      addStatement({ kind: 'action', ...parsed }, line);
      continue;
    }

    if (line.kind === 'stage') {
      const match = line.body.match(/^stage(?:\s+(concurrent))?$/);
      if (!match) {
        addDiagnostic(line, 'A stage statement must say stage or stage concurrent.');
        currentStage = { _recovery: true, _sawBeatLine: false, comments: [] };
        attachComments('stmt', currentStage, currentStage);
        continue;
      }
      const stmt = { kind: 'stage', concurrent: match[1] === 'concurrent', beats: [] };
      defineHidden(stmt, '_beatLabels', new Map());
      defineHidden(stmt, '_sawBeatLine', false);
      addStatement(stmt, line);
      currentStage = stmt;
      continue;
    }

    const known = DIRECTIVES.join(', ');
    const message = line.reason?.startsWith('Tabs') || line.reason?.includes('byte-order') || line.reason?.includes('carriage')
      ? line.reason
      : /^[a-z]/.test(line.body)
        ? `${line.reason} Known directives: ${known}.`
        : `${line.reason} A statement was expected here.`;
    addDiagnostic(line, message);
  }

  if (pendingLabels.length) {
    const label = pendingLabels[pendingLabels.length - 1];
    addDiagnostic(
      { n: label.line },
      `The label @${label.name} is at the end of the file and needs a following statement.`,
    );
  }
  attachComments('eof', null);

  for (const current of scenes) {
    for (const stmt of current.stmts) {
      for (const name of stmt.labels) {
        const entry = current._labels.get(name);
        if (entry) entry.stmt = stmt;
      }
    }

    for (const stmt of current.stmts) {
      if (stmt.kind === 'choice' && !stmt._sawArmLine) {
        addDiagnostic(
          stmt._source,
          'An ask statement needs at least one -> choice arm.',
          [],
          current,
          stmt._nearestLabel,
        );
      }
      if (stmt.kind === 'stage' && !stmt._sawBeatLine) {
        addDiagnostic(
          stmt._source,
          'A stage statement needs at least one indented beat line.',
          [],
          current,
          stmt._nearestLabel,
        );
      }
      if (stmt.kind === 'stage') {
        const beatNames = [...stmt._beatLabels.keys()];
        for (const beat of stmt.beats) {
          const bad = beat.ops.find(({ verb, value }) => verb === 'after' && !stmt._beatLabels.has(value));
          if (!bad) continue;
          const nearest = nearestNames(bad.value, beatNames);
          const available = beatNames.length ? beatNames.map((name) => `@${name}`).join(', ') : '(none)';
          const hint = nearest.length ? ` Did you mean ${nearest.map((name) => `@${name}`).join(', ')}?` : '';
          addDiagnostic(
            { n: beat.line },
            `This beat says \`after ${bad.value}\`, but no beat in this stage block is called that. Beats here: ${available}.${hint}`,
            nearest,
            current,
            beat._nearestLabel,
          );
        }
      }
    }

    const labelNames = [...current._labels.keys()];
    for (const stmt of current.stmts) {
      const refs = [];
      if (stmt.next && !current._labels.has(stmt.next)) refs.push({ target: stmt.next, kind: 'goto', line: stmt._nextLine ?? stmt.line });
      if (stmt.kind === 'condition') {
        if (stmt.ifTrue && !current._labels.has(stmt.ifTrue)) refs.push({ target: stmt.ifTrue, kind: 'if', line: stmt.line });
        if (stmt.ifFalse && !current._labels.has(stmt.ifFalse)) refs.push({ target: stmt.ifFalse, kind: 'if', line: stmt.line });
      }
      if (stmt.kind === 'choice') {
        for (const arm of stmt.arms) {
          if (!current._labels.has(arm.next)) refs.push({ target: arm.next, kind: 'arm', line: arm.line, arm });
        }
      }
      const byLine = new Map();
      for (const ref of refs) {
        if (!byLine.has(ref.line)) byLine.set(ref.line, []);
        byLine.get(ref.line).push(ref);
      }
      for (const [lineNumber, badRefs] of byLine) {
        const first = badRefs[0];
        const context = first.kind === 'arm'
          ? `The choice ${JSON.stringify(first.arm.text)}`
          : first.kind === 'if'
            ? 'This condition'
            : 'This goto';
        const detail = unresolvedMessage(first.kind, first.target, labelNames, context);
        if (badRefs.length > 1) {
          const targets = badRefs.map(({ target }) => `@${target}`).join(', ');
          detail.message = `This line refers to undefined labels ${targets}. ${detail.message}`;
        }
        addDiagnostic(
          { n: lineNumber },
          detail.message,
          detail.suggestions,
          current,
          stmt._nearestLabel,
        );
      }
    }

    if (current._errorCount === 0) {
      const indexOf = new Map(current.stmts.map((stmt, index) => [stmt, index]));
      const labelIndex = new Map();
      for (const stmt of current.stmts) for (const name of stmt.labels) labelIndex.set(name, indexOf.get(stmt));
      const pending = current.stmts.length ? [0] : [];
      const visited = new Set();
      let reachesEnd = false;
      while (pending.length) {
        const index = pending.pop();
        if (index < 0 || index >= current.stmts.length || visited.has(index)) continue;
        visited.add(index);
        const stmt = current.stmts[index];
        if (stmt.kind === 'end') {
          reachesEnd = true;
          break;
        }
        const fallthrough = index + 1;
        if (stmt.kind === 'choice') {
          for (const arm of stmt.arms) pending.push(labelIndex.get(arm.next));
          if (stmt.next) pending.push(labelIndex.get(stmt.next));
        } else if (stmt.kind === 'condition') {
          pending.push(stmt.ifTrue ? labelIndex.get(stmt.ifTrue) : fallthrough);
          pending.push(stmt.ifFalse ? labelIndex.get(stmt.ifFalse) : fallthrough);
        } else if (stmt.next) {
          pending.push(labelIndex.get(stmt.next));
        } else {
          pending.push(fallthrough);
        }
      }
      if (!reachesEnd) {
        addDiagnostic(
          { n: current.line },
          'This scene needs an end statement that can be reached from its first statement.',
          [],
          current,
          '(start)',
        );
      }
    }
  }

  return { scenes, comments, diagnostics };
}
