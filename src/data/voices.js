// "Reasonable Doubt" — Andrew's internal voices as combat participants.
//
// Four facets of Andrew interject during combat. Each is unlocked by a contextual
// trigger and offers ONE free action per fight (no MP cost, doesn't consume a turn
// for healing voices, can interrupt the action menu).
//
// The cumulative count across all combats is persisted on Player.voiceCounts and
// shapes late-game dialogue: Janet calls out Andrew getting cold; the Charter-
// reading at Rachel only unlocks if the Witness has been heard enough; etc.
//
// Triggers fire each player turn; once a voice has fired in a fight it can't fire
// again that fight. The "Thoughts" combat menu only appears when at least one
// voice is currently available.

export const VOICES = {
  apprentice: {
    id: 'apprentice',
    name: 'The Apprentice',
    description: 'The version of you who started this job believing in it.',
    color: '#88ccff',
    // Trigger: HP drops below 50% AND not yet fired this fight
    trigger: (engine) => engine.player.hp / engine.player.maxHP < 0.5,
    actionId: 'apprentice_steel',
  },
  litigator: {
    id: 'litigator',
    name: 'The Litigator',
    description: 'The version of you who learned to feel nothing during depositions.',
    color: '#cc6644',
    // Trigger: after the player critted OR after an enemy healed
    trigger: (engine) => engine.voiceState?.sawCrit || engine.voiceState?.sawEnemyHeal,
    actionId: 'litigator_sever',
  },
  skeptic: {
    id: 'skeptic',
    name: 'The Skeptic',
    description: 'The version of you who is so, so tired.',
    color: '#888888',
    // Trigger: round 4+ AND took damage from the most recent enemy turn
    trigger: (engine) => engine.turnCount >= 7 && engine.voiceState?.tookDamageRecently,
    actionId: 'skeptic_walk',
  },
  witness: {
    id: 'witness',
    name: 'The Witness',
    description: 'The version of you who has seen the actual faces in the actual files.',
    color: '#ddccaa',
    // Trigger: HP below 25% AND fighting one of Rachel's named lieutenants
    trigger: (engine) => {
      const ratio = engine.player.hp / engine.player.maxHP;
      if (ratio >= 0.25) return false;
      const id = engine.enemy?.enemyId;
      const RACHEL_ALIGNED = new Set([
        'rachel_boss', 'chief_of_restructuring', 'regional_director',
        'algorithm', 'data_analytics_lead', 'corporate_lawyer',
      ]);
      // Also fire if any enemy in a multi-fight is Rachel-aligned
      if (engine.enemies?.some(e => RACHEL_ALIGNED.has(e.enemyId))) return true;
      return RACHEL_ALIGNED.has(id);
    },
    actionId: 'witness_invoke',
  },
};

// Voice actions — all FREE, all single-use per fight.
// `effect(engine, targetIndex)` mutates the engine state and returns a result
// descriptor used by CombatState for animation.
export const VOICE_ACTIONS = {
  apprentice_steel: {
    voice: 'apprentice',
    name: 'Remember Why You\'re Here',
    description: 'Heal 30% max HP, clear one debuff/status, +10 confidence.',
    quote: 'Mrs. Henderson is counting on someone.',
    needsTarget: false,
    effect: (engine) => {
      const heal = Math.floor(engine.player.maxHP * 0.3);
      engine.player.hp = Math.min(engine.player.maxHP, engine.player.hp + heal);
      // Clear one negative status / debuff
      let cleared = null;
      if (engine.player.confused > 0)      { engine.player.confused = 0; cleared = 'confusion'; }
      else if (engine.player.stunned > 0)  { engine.player.stunned = 0; cleared = 'stun'; }
      else if (engine.player.silenced > 0) { engine.player.silenced = 0; cleared = 'silence'; }
      else {
        // Remove the first negative buff (debuff) if any
        const idx = engine.player.buffs.findIndex(b => Object.values(b.stats).some(v => v < 0));
        if (idx >= 0) {
          cleared = engine.player.buffs[idx].name;
          engine.player.buffs.splice(idx, 1);
        }
      }
      engine._gainMomentum(10);
      return { type: 'voice_heal', healAmount: heal, cleared, momentumGain: 10 };
    },
  },
  litigator_sever: {
    voice: 'litigator',
    name: 'Sever',
    description: '30-power legal attack. Ignores 50% of target DEF. No emotion attached.',
    quote: 'This is just contract law.',
    needsTarget: true,
    effect: (engine, targetIndex) => {
      const target = engine._resolveTarget(targetIndex);
      if (!target) return null;
      const pStats = engine._getEffective(engine.player);
      const eStats = engine._getEffective(target);
      // Custom calc: ignore half of DEF
      const baseDmg = (pStats.atk + 30) * 1.5;
      const defense = (eStats.def * 0.4) * 0.5; // 50% of DEFENSE_FACTOR
      let damage = Math.max(1, Math.floor(baseDmg - defense));
      // Tagged legal — apply weakness/resistance
      if (target.weakness === 'legal') damage = Math.floor(damage * 1.5);
      else if (target.resistance === 'legal') damage = Math.floor(damage * 0.7);
      target.hp = Math.max(0, target.hp - damage);
      engine._gainMomentum(15);
      engine._checkVictory();
      return { type: 'voice_attack', damage, targetIndex: engine.targetEnemyIndex, momentumGain: 15 };
    },
  },
  skeptic_walk: {
    voice: 'skeptic',
    name: 'Just... Walk',
    description: 'If you can flee, flee. Otherwise: +30 confidence, skip turn.',
    quote: 'Are you sure this is your problem?',
    needsTarget: false,
    effect: (engine) => {
      // If the encounter is fleeable, attempt flee with high success
      // CombatState reads result.attemptFlee to handle properly
      engine._gainMomentum(30);
      return { type: 'voice_skip', momentumGain: 30, attemptFlee: true };
    },
  },
  witness_invoke: {
    voice: 'witness',
    name: 'For Mrs. Henderson',
    description: '50-power devastating attack. +25 confidence. Locks the Skeptic this fight.',
    quote: 'They were saving for grandkids that aren\'t born yet.',
    needsTarget: true,
    effect: (engine, targetIndex) => {
      const target = engine._resolveTarget(targetIndex);
      if (!target) return null;
      const pStats = engine._getEffective(engine.player);
      const eStats = engine._getEffective(target);
      const baseDmg = (pStats.atk + 50) * 1.5;
      const defense = eStats.def * 0.4;
      let damage = Math.max(10, Math.floor(baseDmg - defense));
      // Witness deals +30% to Rachel-aligned enemies
      const RACHEL_ALIGNED = new Set([
        'rachel_boss', 'chief_of_restructuring', 'regional_director',
        'algorithm', 'data_analytics_lead', 'corporate_lawyer',
      ]);
      if (RACHEL_ALIGNED.has(target.enemyId)) damage = Math.floor(damage * 1.3);
      target.hp = Math.max(0, target.hp - damage);
      engine._gainMomentum(25);
      // Lock the Skeptic for the rest of the fight
      if (engine.voiceState) engine.voiceState.skepticLocked = true;
      engine._checkVictory();
      return { type: 'voice_attack', damage, targetIndex: engine.targetEnemyIndex, momentumGain: 25, skepticLocked: true };
    },
  },
};
