import _encounterOverrides from '../encounter-overrides.json' with { type: 'json' };

// Combat encounter configurations
// Maps encounter IDs to enemy + pre/post dialog
export const ENCOUNTERS = {
  intern: {
    enemyId: 'intern',
    preDialogId: 'intern_combat_intro',
    postDialogId: null,
    canFlee: true,
  },
  karen: {
    enemyId: 'karen',
    preDialogId: 'karen_meeting',
    postDialogId: 'karen_defeated',
    canFlee: false,
  },
  chad: {
    enemyId: 'chad',
    preDialogId: 'chad_meeting',
    postDialogId: 'chad_defeated',
    canFlee: false,
  },
  grandma: {
    enemyId: 'grandma',
    preDialogId: 'grandma_meeting',
    postDialogId: 'grandma_defeated',
    canFlee: false,
  },
  compliance: {
    enemyId: 'compliance',
    preDialogId: 'bro_code_ending',
    postDialogId: 'compliance_defeated',
    canFlee: false,
  },
  regional: {
    enemyId: 'regional',
    preDialogId: 'legal_eagle_ending',
    postDialogId: 'regional_defeated',
    canFlee: false,
  },
  ross_boss: {
    enemyId: 'ross_boss',
    preDialogId: 'secret_ending',
    postDialogId: 'ross_boss_defeated',
    canFlee: false,
  },
  reception_client: {
    enemyId: 'reception_client',
    preDialogId: null,
    postDialogId: null,
    canFlee: false,
  },
  security_guard: {
    enemyId: 'security_guard',
    preDialogId: 'security_guard_combat',
    postDialogId: 'security_guard_defeated',
    canFlee: true,
  },
  hr_rep: {
    enemyId: 'hr_rep',
    preDialogId: 'hr_rep_combat',
    postDialogId: 'hr_rep_defeated',
    canFlee: true,
  },
  restructuring_analyst: {
    enemyId: 'restructuring_analyst',
    preDialogId: 'restructuring_combat',
    postDialogId: 'restructuring_defeated',
    canFlee: false,
  },
  brand_consultant: {
    enemyId: 'brand_consultant',
    preDialogId: 'brand_consultant_combat',
    postDialogId: 'brand_consultant_defeated',
    canFlee: true,
  },
  // Act 5 — Restructuring Trio: 3v2 multi-combatant fight with Janet as ally.
  // The whole "they sent a restructuring TEAM" line pays off here: all three
  // analysts come at once, Janet (fellow trust officer) joins Andrew.
  restructuring_trio: {
    enemyIds: ['brand_consultant', 'restructuring_analyst', 'corporate_lawyer'],
    partyIds: ['janet'],
    preDialogId: 'restructuring_trio_intro',
    postDialogId: 'restructuring_trio_defeated',
    canFlee: false,
  },
  data_analytics_lead: {
    enemyId: 'data_analytics_lead',
    preDialogId: 'data_analytics_combat',
    postDialogId: 'data_analytics_defeated',
    canFlee: false,
  },
  // Act 5 — Executive Floor pair fight (Data Analytics Lead + CFO's Assistant).
  // Pulls from player.party (so any allies recruited up to this point come along).
  data_analytics_duo: {
    enemyIds: ['data_analytics_lead', 'cfos_assistant'],
    preDialogId: 'data_analytics_duo_intro',
    postDialogId: 'data_analytics_duo_defeated',
    canFlee: false,
  },
  chief_of_restructuring: {
    enemyId: 'chief_of_restructuring',
    preDialogId: 'chief_restructuring_combat',
    postDialogId: 'chief_restructuring_defeated',
    canFlee: false,
  },
  corporate_lawyer: {
    enemyId: 'corporate_lawyer',
    preDialogId: 'corporate_lawyer_combat',
    postDialogId: 'corporate_lawyer_defeated',
    canFlee: false,
  },
  rachel_boss: {
    enemyId: 'rachel_boss',
    preDialogId: 'rachel_boss_combat',
    postDialogId: 'rachel_boss_defeated',
    canFlee: false,
  },
  cfos_assistant: {
    enemyId: 'cfos_assistant',
    preDialogId: 'cfos_assistant_combat',
    postDialogId: 'cfos_assistant_defeated',
    canFlee: false,
  },
  regional_director: {
    enemyId: 'regional_director',
    preDialogId: 'regional_director_combat',
    postDialogId: 'regional_director_defeated',
    canFlee: false,
  },
  algorithm: {
    enemyId: 'algorithm',
    preDialogId: 'algorithm_combat',
    postDialogId: 'algorithm_defeated',
    canFlee: false,
  },
  patch_defense: {
    enemyId: 'security_guard',
    preDialogId: null,
    postDialogId: 'patch_defense_defeated',
    canFlee: false,
  },
};

// Apply encounter-overrides.json (set via `npm run editor`).
// Skip the `_note` metadata key. Values are merged onto the base entry.
for (const [id, o] of Object.entries(_encounterOverrides || {})) {
  if (id.startsWith('_') || !o || typeof o !== 'object') continue;
  if (ENCOUNTERS[id]) Object.assign(ENCOUNTERS[id], o);
  else ENCOUNTERS[id] = { ...o };
}
