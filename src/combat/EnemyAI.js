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
    sequence: ['speak_to_manager', 'yelp_review', 'father_wanted'],
    randomAfter: true,
  },
  chad: {
    // Chad is aggressive - prefers bro_down, uses confuse occasionally
    pattern: 'aggressive',
    preferAttack: 0.7,
  },
  grandma: {
    // Grandma alternates between guilt and cookies
    pattern: 'tactical',
    healThreshold: 0.5, // heals at 50% instead of 30%
    debuffChance: 0.3,
  },
  compliance: {
    // Methodical - rotates through abilities
    pattern: 'rotation',
  },
  regional: {
    // Strategic - debuffs first, then heavy attacks
    pattern: 'strategic',
    phase1: ['corporate_restructure'],
    phase2: ['synergy_blast', 'synergy_blast', 'golden_parachute'],
  },
  alex_boss: {
    // Unpredictable - quick_sync to stun, circle_back to repeat, great_catch to counter
    pattern: 'chaotic',
  },
};
