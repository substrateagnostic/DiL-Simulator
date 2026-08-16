const DEFAULT_SCENE = '(before any scene)';
const DEFAULT_LABEL = '(start)';

export function levenshtein(left, right) {
  const a = [...String(left)];
  const b = [...String(right)];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export function nearestNames(name, candidates, limit = 3) {
  return [...new Set(candidates)]
    .map((candidate, order) => ({
      candidate,
      distance: levenshtein(name, candidate),
      order,
    }))
    .sort((a, b) => a.distance - b.distance
      || a.candidate.localeCompare(b.candidate)
      || a.order - b.order)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function diagnostic({
  file,
  line,
  sceneId = DEFAULT_SCENE,
  nearestLabel = DEFAULT_LABEL,
  message,
  suggestions = [],
}) {
  return {
    file: file || '<input>',
    line: Number.isInteger(line) && line > 0 ? line : 1,
    sceneId: sceneId || DEFAULT_SCENE,
    nearestLabel: nearestLabel || DEFAULT_LABEL,
    message: String(message),
    suggestions: [...suggestions],
  };
}

export function formatDiagnostic(item) {
  const where = item.nearestLabel === DEFAULT_LABEL
    ? 'at the start of the scene'
    : `after @${item.nearestLabel}`;
  const lines = String(item.message).split('\n').map((line) => `  ${line}`);
  return `${item.file}:${item.line}  scene ${item.sceneId}, ${where}\n${lines.join('\n')}`;
}

export function assertDiagnosticShape(item) {
  const fields = ['file', 'line', 'sceneId', 'nearestLabel', 'message', 'suggestions'];
  for (const field of fields) {
    if (!(field in item)) throw new Error(`A diagnostic is missing its ${field} field.`);
  }
  if (!Array.isArray(item.suggestions)) {
    throw new Error('A diagnostic suggestions field must be an array.');
  }
  const rendered = formatDiagnostic(item).toLowerCase();
  if (rendered.includes('unexpected token')) {
    throw new Error('A diagnostic used the forbidden phrase unexpected token.');
  }
  if (/\n\s+at\s|\berror:\s+at\b|\bat file:\/\//i.test(rendered)) {
    throw new Error('A diagnostic contains a stack trace.');
  }
  if (/\bnode\s+\d+\b/i.test(rendered)) {
    throw new Error('A diagnostic contains a bare node index.');
  }
  return true;
}

export const DIAGNOSTIC_DEFAULTS = Object.freeze({
  sceneId: DEFAULT_SCENE,
  nearestLabel: DEFAULT_LABEL,
});
