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
};
