import { assertDiagnosticShape, formatDiagnostic } from './diagnostics.mjs';
import { parseDlg } from './parse.mjs';

const cases = [
  ['unknown directive', 'scene unknown_directive\n  dance now\n  end\n', 'directive I do not know'],
  ['lowercase speaker', "scene lowercase_speaker\n  andrew: I'm here.\n  end\n", 'speaker name must start with a capital'],
  ['arm without ask', 'scene orphan_arm\n  -> done: No owner.\n  @done\n  end\n', 'must immediately follow an ask'],
  ['goto with nothing', 'scene empty_goto\n  goto done\n  @done\n  end\n', 'needs a text, action, stage, or ask'],
  ['two gotos', 'scene double_goto\n  Narrator: Go.\n  goto done\n  goto done\n  @done\n  end\n', 'two goto lines'],
  ['goto after if', 'scene goto_if\n  if ready\n  goto done\n  @done\n  end\n', 'not legal after condition'],
  ['goto after end', 'scene goto_end\n  end\n  goto done\n  @done\n  end\n', 'not legal after end'],
  ['label before goto', 'scene label_goto\n  Narrator: Go.\n  @later\n  goto done\n  Narrator: Later.\n  @done\n  end\n', 'A label here would attach'],
  ['unresolved goto', 'scene unresolved_goto\n  Narrator: Go.\n  goto alpa\n  @alpha\n  end\n  @beta\n  end\n  @gamma\n  end\n', 'Nearest labels: @alpha, @beta, @gamma'],
  ['unresolved arm', 'scene unresolved_arm\n  ask: Pick.\n    -> alpa: Alpha.\n  @alpha\n  end\n  @beta\n  end\n  @gamma\n  end\n', 'which this scene does not define'],
  ['unresolved if', 'scene unresolved_if\n  if ready -> alpa\n  @alpha\n  end\n  @beta\n  end\n  @gamma\n  end\n', 'This condition jumps to @alpa'],
  ['duplicate label', 'scene duplicate_label\n  @same\n  Narrator: One.\n  @same\n  end\n', 'already defined in this scene'],
  ['duplicate scene', 'scene duplicate_scene\n  end\n\nscene duplicate_scene\n  end\n', 'scene id duplicate_scene is already used'],
  ['bad after', 'scene bad_after\n  stage\n    @cross player stand\n    @crest regional stand\n    @gross janet stand\n    player face regional after crass\n  end\n', 'no beat in this stage block is called that'],
  ['directive beat actor', 'scene directive_beat\n  stage\n    ask stand\n  end\n', 'beat actor is the directive keyword `ask`'],
  ['stage without beats', 'scene empty_stage\n  stage\n  end\n', 'needs at least one indented beat'],
  ['ask without arms', 'scene empty_ask\n  ask: Empty.\n  end\n', 'needs at least one -> choice arm'],
  ['tab outside prose', 'scene tabbed\n\tNarrator: Bad indent.\n  end\n', 'Tabs are illegal outside prose'],
  ['give non-integer', 'scene bad_give\n  give coffee x many\n  end\n', 'optional integer quantity'],
  ['stat missing amount', 'scene bad_stat\n  stat atk\n  end\n', 'signed or bare integer amount'],
  ['quest bad keyword', 'scene bad_quest\n  quest audit banana 2\n  end\n', 'expects stage <integer> or objective <integer>'],
  ['set empty value', 'scene bad_set\n  set route =\n  end\n', 'needs a value after ='],
  ['unterminated value', 'scene bad_quote\n  set route = "report\n  end\n', 'does not have a closing double quote'],
  ['no reachable end', 'scene endless\n  Narrator: This falls off the scene.\n', 'needs an end statement that can be reached'],
  ['late mode', 'scene late_mode\n  Narrator: Started.\n  mode quiz\n  end\n', 'must appear before the scene\'s first statement'],
  ['bad mode value', 'scene bad_mode\n  mode arcade\n  end\n', 'mode quiz or mode evergreen-hub'],
  ['bad stage modifier', 'scene bad_stage_form\n  stage parallel\n    player stand\n  end\n', 'must say stage or stage concurrent'],
  ['bad ask with arms', 'scene bad_ask_form\n  ask lowercase: Pick.\n    -> done: Continue.\n  @done\n  end\n', 'speaker name beginning with a capital letter'],
  ['bad if form', 'scene bad_if\n  if ready then yes\n  end\n', 'optional -> <label> and else -> <label>'],
  ['bad arm modifier', 'scene bad_arm_mod\n  ask: Pick.\n    -> done when ready: Yes.\n  @done\n  end\n', 'only sets, requires, unless, or check'],
  ['exit without argument', 'scene exit_no_arg\n  stage\n    player exit\n  end\n', 'exit beat verb needs a mark name or x,y coordinate pair'],
  ['beat without verb', 'scene beat_no_verb\n  stage\n    player\n  end\n', 'needs at least one beat verb'],
  ['duplicate beat label', 'scene duplicate_beat\n  stage\n    @same player stand\n    @same regional stand\n  end\n', 'beat label @same is already used'],
  ['dangling label', 'scene dangling_label\n  end\n  @orphan\n', 'at the end of the file and needs a following statement'],
];

let failures = 0;
process.stdout.write('Case                            Count  Match  Rules\n');
process.stdout.write('---------------------------------------------------\n');
for (const [name, source, expected] of cases) {
  const result = parseDlg(source, `malformed/${name.replaceAll(' ', '-')}.dlg`);
  const count = result.diagnostics.length === 1;
  const match = result.diagnostics.some((item) => item.message.includes(expected));
  let rules = true;
  try {
    for (const item of result.diagnostics) {
      assertDiagnosticShape(item);
      const rendered = formatDiagnostic(item);
      if (!rendered.includes(item.file) || !rendered.includes(`:${item.line}`)
        || !rendered.includes(`scene ${item.sceneId}`)) rules = false;
      if (!/[.!?]$/.test(item.message)) rules = false;
    }
  } catch {
    rules = false;
  }
  if (!(count && match && rules)) failures += 1;
  process.stdout.write(`${name.padEnd(31)} ${count ? 'PASS ' : 'FAIL '}  ${match ? 'PASS ' : 'FAIL '} ${rules ? 'PASS' : 'FAIL'}\n`);
  if (!count || !match || !rules) {
    for (const item of result.diagnostics) process.stdout.write(`  ${formatDiagnostic(item)}\n`);
  }
}

for (const name of ['unresolved goto', 'unresolved arm', 'unresolved if', 'bad after']) {
  const [, source] = cases.find(([caseName]) => caseName === name);
  const [item] = parseDlg(source, `malformed/${name}.dlg`).diagnostics;
  const expected = name === 'bad after' ? 3 : 3;
  if (item.suggestions.length !== expected) {
    process.stdout.write(`FAIL ${name} suggestion count: ${item.suggestions.length}\n`);
    failures += 1;
  }
}

const cascade = parseDlg(
  'scene noncascade\n  dance now\n  andrew: Lowercase.\n  give coffee x many\n  stat atk\n  quest q banana 1\n  end\n',
  'malformed/noncascade.dlg',
);
const noncascade = cascade.diagnostics.length === 5 && cascade.scenes[0].stmts.some((stmt) => stmt.kind === 'end');
process.stdout.write(`${'five independent defects'.padEnd(31)} ${noncascade ? 'PASS ' : 'FAIL '}  PASS  PASS\n`);
if (!noncascade) failures += 1;
process.stdout.write(`${failures ? 'FAIL' : 'PASS'} total: ${cases.length + 1 - failures}/${cases.length + 1} diagnostic cases\n`);
if (failures) process.exitCode = 1;
