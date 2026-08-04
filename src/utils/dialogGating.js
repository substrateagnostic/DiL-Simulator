// Story-stage gates for NPC dialogue. Values are coarse quest-stage bands:
// 0-99 intro, 100-299 Henderson arc, 300+ later main acts.

const MAIN_INTRO_DIALOGS = new Set([
  'janet_intro',
  'alex_it_intro',
  'intern_intro',
  'isaiah_intro',
  'diane_intro',
  'skip_intro',
  // janitor_intro deliberately NOT listed: the Janitor is optional and
  // timeless — met_janitor gates the riddle chain and the Architect
  // ending, so the intro must stay reachable at any quest stage
  // (logic-sweep MAJOR #5).
]);

const ACT_STAGE_RANGES = {
  2: { min: 100, max: 299 },
  3: { min: 300, max: 399 },
  4: { min: 400, max: 499 },
  5: { min: 500, max: 599 },
  6: { min: 600, max: 699 },
  7: { min: 700, max: 799 },
};

const QUEST_CRITICAL_DIALOGS = new Set([
  'skip_intro',
  'karen_meeting',
  'chad_meeting',
  'grandma_meeting',
  'branch_decision',
  'alex_it_act2',
  'alex_it_act3',
  'janitor_act3',
  'act4_trigger',
  'janet_act4',
  'diane_act4',
  'skip_act4',
  'janitor_act4',
  'act5_trigger',
  'skip_act6',
  'janet_act6',
  'diane_act6',
  'intern_act6',
  'isaiah_act6',
  'janitor_act6',
  'grandma_act6',
  'penthouse_arrival',
  'cfos_assistant_combat',
  'regional_director_combat',
  'algorithm_combat',
]);

export function getQuestStage(player) {
  if (!player) return 0;
  const f = (flag) => !!player.getFlag?.(flag);

  if (f('algorithm_defeated')) return 800;
  if (f('act6_complete')) return 700;
  if (f('act5_complete')) return 600;
  if (f('act4_complete')) return 500;
  if (f('act3_complete')) return 400;
  if (f('act2_complete')) return 300;
  if (f('branch_chosen')) return 200;
  if (f('briefing_complete')) return 100;
  if (f('ready_for_skip')) return 2;
  if (f('checked_desk')) return 1;
  return 0;
}

export function isQuestStageValid(player, minQuestStage = 0, maxQuestStage = Infinity) {
  return isStageInRange(getQuestStage(player), minQuestStage, maxQuestStage);
}

export function isStageInRange(stage, minQuestStage = 0, maxQuestStage = Infinity) {
  return stage >= minQuestStage && stage <= maxQuestStage;
}

export function getDialogQuestGate(dialogId) {
  if (!dialogId) return null;

  if (MAIN_INTRO_DIALOGS.has(dialogId)) {
    return {
      min: 0,
      max: 99,
      kind: QUEST_CRITICAL_DIALOGS.has(dialogId) ? 'quest-critical' : 'flavor',
    };
  }

  const actMatch = dialogId.match(/_act([2-7])$/);
  if (actMatch) {
    const act = Number(actMatch[1]);
    return {
      ...ACT_STAGE_RANGES[act],
      kind: QUEST_CRITICAL_DIALOGS.has(dialogId) ? 'quest-critical' : 'flavor',
    };
  }

  return null;
}

export function isDialogValidForQuestStage(player, dialogId) {
  const gate = getDialogQuestGate(dialogId);
  if (!gate) return true;
  return isQuestStageValid(player, gate.min, gate.max);
}
