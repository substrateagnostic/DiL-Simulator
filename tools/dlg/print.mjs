function valueText(value) {
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

function pointText(value) {
  return Array.isArray(value) ? `${String(value[0])},${String(value[1])}` : String(value);
}

function commentsFor(comments, emitted, kind, target, predicate = () => true) {
  const found = [];
  for (const comment of comments) {
    if (emitted.has(comment)) continue;
    const anchor = comment._anchor;
    if (anchor?.kind === kind && anchor.target === target && predicate(anchor)) {
      emitted.add(comment);
      found.push(comment.text);
    }
  }
  return found;
}

function printAction(stmt) {
  if (stmt.action === 'set_flag') {
    return stmt.value === true ? `set ${stmt.flag}` : `set ${stmt.flag} = ${valueText(stmt.value)}`;
  }
  if (stmt.action === 'start_combat') return `fight ${stmt.encounter}`;
  if (stmt.action === 'give_item') {
    return `give ${stmt.item}${Object.hasOwn(stmt, 'quantity') ? ` x${stmt.quantity}` : ''}`;
  }
  if (stmt.action === 'give_xp') return `xp ${stmt.xp}`;
  if (stmt.action === 'modify_stat') {
    const amount = stmt.amount > 0 ? `+${stmt.amount}` : String(stmt.amount);
    return `stat ${stmt.stat} ${amount}`;
  }
  if (stmt.action === 'heal') return 'heal';
  if (stmt.action === 'quest_update') {
    if (Object.hasOwn(stmt, 'stage')) return `quest ${stmt.quest} stage ${stmt.stage}`;
    const status = Object.hasOwn(stmt, 'status') ? ` status ${stmt.status}` : '';
    return `quest ${stmt.quest} objective ${stmt.objective}${status}`;
  }
  if (stmt.action === 'recruit_ally') return `recruit ${stmt.ally}`;
  if (stmt.action === 'unlock_ally_ability') return `teach ${stmt.ally} ${stmt.ability}`;
  throw new Error(`Cannot print unknown action ${stmt.action}.`);
}

function printCondition(stmt) {
  if (stmt.ifTrue && stmt.ifFalse) return `if ${stmt.flag} -> ${stmt.ifTrue} else -> ${stmt.ifFalse}`;
  if (stmt.ifTrue) return `if ${stmt.flag} -> ${stmt.ifTrue}`;
  if (stmt.ifFalse) return `if ${stmt.flag} else -> ${stmt.ifFalse}`;
  return `if ${stmt.flag}`;
}

function printBeat(beat) {
  const parts = [];
  if (beat.labels?.length) parts.push(`@${beat.labels[0]}`);
  parts.push(beat.actor);
  for (const { verb, value } of beat.ops) {
    if (verb === 'nowait') parts.push('nowait');
    else if (['sit', 'stand', 'spawn', 'show'].includes(verb)) parts.push(verb);
    else parts.push(verb, pointText(value));
  }
  return parts.join(' ');
}

export function printScenes(scenes, comments = []) {
  const lines = [];
  const emittedComments = new Set();
  const ensureBlank = () => {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
  };

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    if (sceneIndex > 0) lines.push('');
    lines.push(...commentsFor(comments, emittedComments, 'scene', scene));
    lines.push(`scene ${scene.id}`);

    for (let modeIndex = 0; modeIndex < scene.modes.length; modeIndex += 1) {
      for (const comment of comments) {
        if (emittedComments.has(comment)) continue;
        const anchor = comment._anchor;
        if (anchor?.kind === 'mode'
          && anchor.target.scene === scene
          && anchor.target.modeIndex === modeIndex) {
          emittedComments.add(comment);
          lines.push(comment.text);
        }
      }
      lines.push(`  mode ${scene.modes[modeIndex]}`);
    }

    for (let stmtIndex = 0; stmtIndex < scene.stmts.length; stmtIndex += 1) {
      const stmt = scene.stmts[stmtIndex];
      for (let labelPosition = 0; labelPosition <= stmt.labels.length; labelPosition += 1) {
        lines.push(...commentsFor(
          comments,
          emittedComments,
          'stmt',
          stmt,
          (anchor) => anchor.labelPosition === labelPosition,
        ));
        if (labelPosition < stmt.labels.length) {
          const firstThingInScene = stmtIndex === 0 && labelPosition === 0;
          const previousIsLabel = /^  @[A-Za-z0-9_]+$/.test(lines[lines.length - 1] ?? '');
          if (!firstThingInScene && !previousIsLabel) ensureBlank();
          lines.push(`  @${stmt.labels[labelPosition]}`);
        }
      }

      if (stmt.kind === 'text') {
        const mood = Object.hasOwn(stmt, 'mood') ? ` mood=${stmt.mood}` : '';
        lines.push(`  ${stmt.speaker}${mood}: ${stmt.text}`);
      } else if (stmt.kind === 'choice') {
        const speaker = Object.hasOwn(stmt, 'speaker') ? ` ${stmt.speaker}` : '';
        lines.push(`  ask${speaker}: ${stmt.prompt}`);
        for (const arm of stmt.arms) {
          lines.push(...commentsFor(comments, emittedComments, 'arm', arm));
          const mods = [];
          if (Object.hasOwn(arm, 'flag')) {
            mods.push(Object.hasOwn(arm, 'flagValue')
              ? `sets ${arm.flag}=${valueText(arm.flagValue)}`
              : `sets ${arm.flag}`);
          }
          if (Object.hasOwn(arm, 'requires')) mods.push(`requires ${arm.requires}`);
          if (Object.hasOwn(arm, 'requiresNot')) mods.push(`unless ${arm.requiresNot}`);
          if (Object.hasOwn(arm, 'check')) mods.push(`check ${arm.check}`);
          const suffix = mods.length ? ` ${mods.join(' ')}` : '';
          lines.push(`    -> ${arm.next}${suffix}: ${arm.text}`);
          if (Object.hasOwn(arm, 'failText')) {
            lines.push(...commentsFor(comments, emittedComments, 'fail', arm));
            lines.push(`    fail -> ${arm.failNext}: ${arm.failText}`);
          }
        }
      } else if (stmt.kind === 'condition') {
        lines.push(`  ${printCondition(stmt)}`);
      } else if (stmt.kind === 'action') {
        lines.push(`  ${printAction(stmt)}`);
      } else if (stmt.kind === 'stage') {
        ensureBlank();
        lines.push(`  stage${stmt.concurrent ? ' concurrent' : ''}`);
        for (const beat of stmt.beats) {
          lines.push(...commentsFor(comments, emittedComments, 'beat', beat));
          lines.push(`    ${printBeat(beat)}`);
        }
      } else if (stmt.kind === 'end') {
        lines.push('  end');
      } else {
        throw new Error(`Cannot print unknown statement kind ${stmt.kind}.`);
      }

      if (stmt.next) {
        lines.push(...commentsFor(comments, emittedComments, 'goto', stmt));
        lines.push(`  goto ${stmt.next}`);
      }
    }

    lines.push(...commentsFor(comments, emittedComments, 'scene-end', scene));
  }

  for (const comment of comments) {
    if (emittedComments.has(comment)) continue;
    emittedComments.add(comment);
    lines.push(comment.text);
  }
  return `${lines.join('\n')}\n`;
}
