// Per-enemy AI behavior patterns
// This is used by CombatEngine._pickEnemyAbility for smarter behavior

export const ENEMY_AI_PATTERNS = {
  intern: {
    // Intern is simple - just random
    pattern: 'random',
  },
  karen: {
    // Karen escalates - starts with speak_to_manager, then father_wanted
    pattern: 'escalating',
    escalateAfterDenial: 0.85,
    sequence: ['speak_to_manager', 'yelp_review', 'father_wanted'],
    randomAfter: true,
  },
  chad: {
    // Chad is aggressive - prefers bro_down, uses confuse occasionally
    pattern: 'aggressive',
    escalateAfterDenial: 0.85,
    preferAttack: 0.7,
  },
  grandma: {
    // Grandma alternates between guilt and cookies
    pattern: 'tactical',
    escalateAfterDenial: 0.85,
    healThreshold: 0.35, // only starts actively healing at 35% HP
    healChance: 0.35,    // reduced from 0.6 so she doesn't heal every turn
    debuffChance: 0.3,
  },
  compliance: {
    // Methodical - rotates through abilities
    pattern: 'rotation',
    escalateAfterDenial: 0.85,
  },
  regional: {
    // Strategic - debuffs first, then heavy attacks
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['corporate_restructure'],
    phase2: ['synergy_blast', 'synergy_blast', 'golden_parachute'],
  },
  skip_boss: {
    // Unpredictable - quick_sync to stun, circle_back to repeat, great_catch to counter
    pattern: 'chaotic',
    escalateAfterDenial: 0.85,
  },
  security_guard: {
    // Straightforward - tackles, then calls backup
    pattern: 'escalating',
    escalateAfterDenial: 0.85,
    sequence: ['badge_check', 'tackle', 'radio_backup'],
    randomAfter: true,
  },
  hr_rep: {
    // Methodical HR process
    pattern: 'rotation',
    escalateAfterDenial: 0.85,
  },
  restructuring_analyst: {
    // Debuffs first, then attacks
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['efficiency_report'],
    phase2: ['downsize', 'outsource_threat', 'outsource_threat'],
  },
  brand_consultant: {
    // Random with self-heal tendency
    pattern: 'tactical',
    escalateAfterDenial: 0.85,
    healThreshold: 0.6,
    debuffChance: 0.2,
  },
  corporate_lawyer: {
    // Opens with one stun, then cycles mostly attacks with occasional confuse
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['cease_desist'],
    phase2: ['billable_assault', 'billable_assault', 'legal_jargon'],
  },
  meredith_boss: {
    // 3-phase boss - handled by phase system in CombatEngine
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['performance_review'],
    phase2: ['strategic_pivot', 'hostile_takeover', 'board_resolution'],
  },
  cfos_assistant: {
    // Debuffs first, then calls CFO for backup
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['budget_slash'],
    phase2: ['expense_review', 'cfo_call', 'expense_review'],
  },
  regional_director: {
    // 3-phase boss - handled by phase system in CombatEngine
    pattern: 'strategic',
    escalateAfterDenial: 0.85,
    phase1: ['corporate_mandate'],
    phase2: ['market_correction', 'quarterly_target', 'corporate_mandate'],
  },
  algorithm: {
    // 3-phase final boss - unpredictable
    pattern: 'chaotic',
  },
};
