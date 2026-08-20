const ACTION_WORDS = new Set([
  'set', 'fight', 'give', 'xp', 'stat', 'heal', 'quest', 'recruit', 'teach',
]);

function leadingSpaces(raw) {
  let count = 0;
  while (raw[count] === ' ') count += 1;
  return count;
}

function firstWord(body) {
  return body.match(/^[^\s:]+/)?.[0] ?? '';
}

function proseColon(body) {
  const colon = body.indexOf(':');
  if (colon < 0) return -1;
  const head = body.slice(0, colon);
  return /^(?:ask(?:\s|$)|->(?:\s|$)|fail(?:\s|$)|[A-Z])/.test(head) ? colon : -1;
}

function classify(body) {
  if (/^scene(?:\s|$)/.test(body)) return 'scene';
  if (/^mode(?:\s|$)/.test(body)) return 'mode';
  if (/^@/.test(body)) return 'label';
  if (/^ask(?=:|\s|$)/.test(body)) return 'ask';
  if (/^->(?:\s|$)/.test(body)) return 'arm';
  // The working-style check's fail variant: `fail -> label: prose`, legal only
  // immediately after a choice arm carrying a `check` modifier (parse.mjs).
  if (/^fail(?:\s|$)/.test(body)) return 'fail';
  if (/^if(?:\s|$)/.test(body)) return 'if';
  if (/^goto(?:\s|$)/.test(body)) return 'goto';
  if (/^end(?:\s|$)/.test(body)) return 'end';
  if (/^stage(?:\s|$)/.test(body)) return 'stage';
  if (ACTION_WORDS.has(firstWord(body))) return 'action';
  if (/^[A-Z][^:]*:/.test(body)) return 'say';
  return 'unknown';
}

export function lexFile(text, filename = '<input>') {
  const source = String(text);
  const raws = source.split('\n');
  const lines = [];
  let stageIndent = null;

  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const n = index + 1;
    const indent = leadingSpaces(raw);
    const body = raw.trim();
    const base = { n, raw, indent, body, kind: 'unknown' };

    if (raw.includes('\r')) {
      lines.push({ ...base, reason: 'Dialog files use LF line endings; remove this carriage return.' });
      continue;
    }
    if (index === 0 && raw.startsWith('\uFEFF')) {
      lines.push({ ...base, reason: 'Dialog files must not begin with a UTF-8 byte-order mark.' });
      continue;
    }
    if (body === '') {
      if (raw.includes('\t')) {
        lines.push({ ...base, reason: 'Tabs are illegal outside prose; use space characters for indentation and token grammar.' });
      } else {
        lines.push({ ...base, kind: 'blank' });
      }
      continue;
    }
    const colon = proseColon(body);
    const rawColon = colon < 0 ? -1 : indent + colon;
    const tab = raw.indexOf('\t');
    if (tab >= 0 && (rawColon < 0 || tab <= rawColon)) {
      lines.push({ ...base, reason: 'Tabs are illegal outside prose; use space characters for indentation and token grammar.' });
      continue;
    }
    if (body.startsWith('#')) {
      lines.push({ ...base, kind: 'comment', text: raw });
      continue;
    }

    if (stageIndent !== null && indent > stageIndent) {
      lines.push({ ...base, kind: 'beat' });
      continue;
    }
    if (stageIndent !== null && indent <= stageIndent) stageIndent = null;

    const kind = classify(body);
    if (kind === 'stage') stageIndent = indent;
    if (kind === 'unknown') {
      const head = body.slice(0, body.indexOf(':') >= 0 ? body.indexOf(':') : body.length);
      const reason = /^[a-z]/.test(head)
        ? 'A speaker name must start with a capital letter, or this is a directive I do not know.'
        : 'This line does not match any dialog statement.';
      lines.push({ ...base, kind, reason });
    } else {
      lines.push({ ...base, kind });
    }
  }

  Object.defineProperty(lines, 'filename', { value: filename, enumerable: false });
  return lines;
}
