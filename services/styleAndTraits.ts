import type { Player, PlayerProfile, PlayerStyle, Trait, TraitLevel, TraitName, PositionDetail } from '../types';

/**
 * Classify player style based on profile and position
 * Returns the primary playing style that best describes the player
 */
export const classifyPlayerStyle = (player: Player): PlayerStyle => {
  const { position, stats, profile } = player;
  const pos = position.toUpperCase() as Uppercase<PositionDetail>;

  // Goalkeeper
  if (pos === 'GK') {
    if (stats.positioning && stats.positioning >= 80) return 'Sweeper Keeper';
    return 'Shot Stopper';
  }

  // Defenders
  if (['CB', 'LB', 'RB'].includes(pos)) {
    if (pos === 'CB') {
      if (stats.passing >= 80 && stats.vision >= 75) return 'Ball-Playing Defender';
      if (stats.physical >= 85 && stats.heading >= 80) return 'Stopper';
      return 'Sweeper';
    }
    // Fullbacks
    if (stats.pace >= 80 && stats.crossing >= 75) return 'Wing-Back';
    if (stats.passing >= 75) return 'Ball-Playing Defender';
    return 'Stopper';
  }

  // Wing-backs
  if (['LWB', 'RWB'].includes(pos)) {
    return 'Wing-Back';
  }

  // Defensive midfielders
  if (pos === 'CDM') {
    if (stats.passing >= 85 && stats.vision >= 80) return 'Deep-Lying Playmaker';
    if (stats.passing >= 80 && profile?.creativity && profile.creativity >= 70) return 'Regista';
    return 'Ball-Winning Midfielder';
  }

  // Central midfielders
  if (pos === 'CM') {
    if (profile?.goalScoring && profile?.workRate && profile.goalScoring >= 65 && profile.workRate >= 75) return 'Box-to-Box';
    if (profile?.playmaking && profile?.creativity && profile.playmaking >= 80 && profile.creativity >= 75) return 'Mezzala';
    if (stats.passing >= 80 && stats.vision >= 75) return 'Deep-Lying Playmaker';
    return 'Box-to-Box';
  }

  // Attacking midfielders
  if (pos === 'CAM') {
    if (profile?.playmaking && profile?.creativity && profile.playmaking >= 85 && profile.creativity >= 80) return 'Advanced Playmaker';
    if (profile?.goalScoring && profile.goalScoring >= 70 && stats.dribbling >= 80) return 'False 9';
    return 'Advanced Playmaker';
  }

  // Wingers
  if (['LW', 'RW', 'LM', 'RM'].includes(pos)) {
    if (profile?.goalScoring && profile.goalScoring >= 75 && stats.shooting >= 80) return 'Inverted Winger';
    if (stats.crossing >= 80 && profile?.playmaking && profile.playmaking >= 70) return 'Traditional Winger';
    if (stats.passing >= 80 && stats.vision >= 75) return 'Wide Playmaker';
    return 'Traditional Winger';
  }

  // Strikers / Center forwards
  if (['ST', 'CF'].includes(pos)) {
    // Speed Demon: pace merchant (check first for young pacey players)
    if (stats.pace >= 85 && stats.acceleration >= 83 && profile?.goalScoring && profile.goalScoring >= 65) {
      return 'Speed Demon';
    }
    // Target Man: physical presence
    if (stats.physical >= 78 && stats.heading >= 80 && stats.strength >= 78) {
      return 'Target Man';
    }
    // Complete Forward: balanced attacker
    if (profile?.goalScoring && profile?.playmaking && profile.goalScoring >= 75 && profile.playmaking >= 65 && stats.dribbling >= 70) {
      return 'Complete Forward';
    }
    // False 9: drops deep, creates
    if (profile?.playmaking && profile.playmaking >= 75 && stats.vision >= 75 && stats.passing >= 75) {
      return 'False 9';
    }
    // Inside Forward: cuts in, technical finisher
    if (stats.shooting >= 75 && stats.dribbling >= 75 && stats.pace >= 75) {
      return 'Inside Forward';
    }
    // Poacher: pure finisher, great positioning
    if (stats.positioning >= 80 && profile?.goalScoring && profile.goalScoring >= 75) {
      return 'Poacher';
    }

    // Fallback logic based on strongest attribute
    const hasSpeed = stats.pace >= 75;
    const hasPhysical = stats.physical >= 75 || stats.strength >= 75;
    const hasTechnique = stats.dribbling >= 70 && stats.ballControl >= 70;
    const hasVision = stats.vision >= 70 && stats.passing >= 70;

    if (hasSpeed && hasTechnique) return 'Inside Forward';
    if (hasPhysical) return 'Target Man';
    if (hasVision) return 'False 9';
    if (hasSpeed) return 'Speed Demon';

    // Final fallback - balanced striker
    return 'Complete Forward';
  }

  // Fallback for young/undefined players
  if (player.age <= 20 && stats.overall < 75) return 'Emerging Talent';
  return 'Versatile Player';
};

/**
 * Assign multiple traits to a player based on their stats and profile
 * Returns an array of traits with levels (Bronze â†’ Diamond)
 */
export const assignPlayerTraits = (player: Player): Trait[] => {
  const traits: Trait[] = [];
  const { stats, profile, position, age, personality } = player;

  // Helper to add trait with level based on stat value + probability
  const addTrait = (name: TraitName, statValue: number, baseThreshold: number, description?: string) => {
    // NOVO: Probabilidades MUITO mais restritivas
    // Calculate probability based on how close stat is to threshold
    const diff = statValue - baseThreshold;
    let probability = 0;

    if (diff >= 20) probability = 1.0; // Diamond level - aumentado de 15
    else if (diff >= 15) probability = 0.85; // Gold - aumentado de 10, reduzida de 0.95
    else if (diff >= 10) probability = 0.60; // Silver - aumentado de 5, reduzida de 0.80
    else if (diff >= 5) probability = 0.35; // Bronze - aumentado de 0, reduzida de 0.60
    else if (diff >= 0) probability = 0.15; // Muito abaixo, reduzida de 0.25
    else return; // Too far below threshold

    // Roll the dice
    if (Math.random() > probability) return;

    let level: TraitLevel;
    if (statValue >= baseThreshold + 20) level = 'Diamond'; // Aumentado de 15
    else if (statValue >= baseThreshold + 15) level = 'Gold'; // Aumentado de 10
    else if (statValue >= baseThreshold + 10) level = 'Silver'; // Aumentado de 5
    else level = 'Bronze';

    traits.push({
      name,
      level,
      description: description || getTraitDescription(name, level)
    });
  };

  // ========== ATTACKING TRAITS ==========
  if (['ST', 'CF', 'LW', 'RW'].includes(position.toUpperCase())) {
    addTrait('Clinical Finisher', stats.finishing, 85); // Aumentado de 80
    addTrait('Power Header', stats.heading, 84); // Aumentado de 80
    addTrait('Long Shots', stats.longShots, 84); // Aumentado de 80

    if (profile?.goalScoring && profile.goalScoring >= 88 && stats.positioning >= 88) { // Aumentado de 85
      addTrait('Poacher', stats.positioning, 86); // Aumentado de 82
    }
    if (stats.physical >= 84 && stats.heading >= 85 && stats.strength >= 84) { // Aumentado
      addTrait('Target Man', stats.physical, 82); // Aumentado de 78
    }
    if (stats.pace >= 92) { // Aumentado de 88
      addTrait('Speed Merchant', stats.pace, 89); // Aumentado de 85
    }
    if (stats.dribbling >= 86 && stats.agility >= 84) { // Aumentado de 82 e 80
      addTrait('Dribbling Wizard', stats.dribbling, 84); // Aumentado de 80
    }
    if (stats.flair >= 84 && stats.dribbling >= 82) { // Aumentado de 80 e 78
      addTrait('Flair Player', stats.flair, 82); // Aumentado de 78
    }
  }

  // ========== PLAYMAKING TRAITS ==========
  if (['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(position.toUpperCase()) || (profile?.playmaking && profile.playmaking >= 78)) { // Aumentado de 75
    if (stats.passing >= 86 && stats.vision >= 84) { // Aumentado de 82 e 80
      addTrait('Playmaker', stats.vision, 82); // Aumentado de 78
    }
    if (stats.curve >= 86) { // Aumentado de 82
      addTrait('Set-piece Specialist', stats.curve, 84); // Aumentado de 80
    }
    if (stats.vision >= 88) { // Aumentado de 85
      addTrait('Vision', stats.vision, 86); // Aumentado de 83
    }
    if (stats.crossing >= 84 && ['LM', 'RM', 'LW', 'RW'].includes(position.toUpperCase())) { // Aumentado de 80
      addTrait('Crossing Specialist', stats.crossing, 82); // Aumentado de 78
    }
  }

  // ========== MIDFIELD WORK RATE TRAITS ==========
  if (['CM', 'CDM', 'CAM'].includes(position.toUpperCase())) {
    if (profile?.workRate && profile?.goalScoring && profile.workRate >= 84 && profile.goalScoring >= 68) { // Aumentado de 80 e 65
      addTrait('Box to Box', stats.stamina, 82); // Aumentado de 78
    }
    if (position.toUpperCase() === 'CDM' && stats.passing >= 84) { // Aumentado de 80
      addTrait('Deep Lying Playmaker', stats.passing, 82); // Aumentado de 78
    }
    if (stats.stamina >= 88 && profile?.workRate && profile.workRate >= 88) { // Aumentado de 85
      addTrait('Engine', stats.stamina, 86); // Aumentado de 83
    }
    if (stats.workRate >= 88) { // Aumentado de 85
      addTrait('Tireless Runner', stats.workRate, 86); // Aumentado de 83
    }
    if (stats.defending >= 84 && stats.interceptions >= 79) { // Aumentado de 80 e 75
      addTrait('Ball Winner', stats.defending, 82); // Aumentado de 78
    }
    if (stats.interceptions >= 86) { // Aumentado de 82
      addTrait('Interceptor', stats.interceptions, 84); // Aumentado de 80
    }
  }

  // ========== DEFENSIVE TRAITS ==========
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position.toUpperCase())) {
    if (stats.passing >= 82 && stats.vision >= 74) { // Aumentado de 78 e 70
      addTrait('Ball Playing Defender', stats.passing, 80); // Aumentado de 76
    }
    if (stats.physical >= 86 && stats.aggression >= 79) { // Aumentado de 82 e 75
      addTrait('No Nonsense Defender', stats.physical, 84); // Aumentado de 80
    }
    if (stats.heading >= 88 && stats.jumping >= 84) { // Aumentado de 85 e 80
      addTrait('Aerial Dominance', stats.heading, 86); // Aumentado de 83
    }
    if (stats.positioning >= 88 && stats.interceptions >= 84) { // Aumentado de 85 e 80
      addTrait('Last Man', stats.positioning, 86); // Aumentado de 83
    }
  }

  // ========== GOALKEEPER TRAITS ==========
  if (position.toUpperCase() === 'GK') {
    if (stats.positioning && stats.positioning >= 84) { // Aumentado de 80
      addTrait('Sweeper Keeper', stats.positioning, 82); // Aumentado de 78
    }
    if (stats.reflexes && stats.reflexes >= 86) { // Aumentado de 82
      addTrait('Shot Stopper', stats.reflexes, 84); // Aumentado de 80
    }
    if (stats.diving && stats.diving >= 84) { // Aumentado de 80
      addTrait('Penalty Saver', stats.diving, 82); // Aumentado de 78
    }
    if (stats.handling && stats.handling >= 86) { // Aumentado de 82
      addTrait('Command of Area', stats.handling, 84); // Aumentado de 80
    }
  }

  // ========== MENTAL/PHYSICAL TRAITS ==========
  if (stats.leadership >= 88) { // Aumentado de 85
    addTrait('Leadership', stats.leadership, 86); // Aumentado de 83
  }
  if (stats.composure >= 88) { // Aumentado de 85
    addTrait('Composure', stats.composure, 86); // Aumentado de 83
  }
  if (personality === 'Determined' && stats.composure >= 84) { // Aumentado de 80
    addTrait('Big Game Player', stats.composure, 82); // Aumentado de 78
  }
  if (stats.stamina >= 91) { // Aumentado de 88
    addTrait('Second Wind', stats.stamina, 89); // Aumentado de 86
  }
  if (stats.fitness >= 88) { // Aumentado de 85
    addTrait('Natural Fitness', stats.fitness, 86); // Aumentado de 83
  }
  // Injury Prone (negative trait) - MUITO mais raro agora
  if (stats.fitness <= 40 && personality === 'Inconsistent' && Math.random() < 0.15) { // Antes era <= 50 e sem check adicional
    traits.push({ name: 'Injury Prone', level: 'Bronze', description: 'traits.injuryProne' });
  }

  // ========== UTILITY TRAITS ==========
  // Two-Footed é extremamente raro - apenas os melhores ambidestros
  if (stats.weakFoot >= 5) { // Deve ser perfeito (5 estrelas)
    traits.push({ name: 'Two-Footed', level: 'Diamond', description: 'traits.twoFooted' }); // Sempre Diamond se tiver
  } else if (stats.weakFoot >= 4 && Math.random() < 0.15) { // Apenas 15% de chance mesmo com 4 estrelas
    traits.push({ name: 'Two-Footed', level: 'Gold', description: 'traits.twoFootedGold' });
  }

  if (stats.preferredFoot === 'Left' && stats.passing >= 82 && stats.dribbling >= 82) { // Aumentado de 78
    addTrait('Left-Footed Maestro', (stats.passing + stats.dribbling) / 2, 82); // Aumentado
  }
  if (stats.preferredFoot === 'Right' && stats.shooting >= 88) { // Aumentado de 85
    addTrait('Right-Footed Sniper', stats.shooting, 86); // Aumentado de 83
  }

  // One-Club Man REMOVIDO da criação inicial - apenas pode ser adquirido durante a carreira
  // Comentado para não dar no início
  // if (personality === 'Loyal' || player.yearsAtClub >= 8) {
  //   traits.push({ name: 'One-Club Man', level: 'Gold', description: 'Loyal and committed to the club' });
  // }

  if (personality === 'Professional' && stats.composure >= 78) { // Adicionado check de composure
    addTrait('Consistency', stats.composure, 78); // Aumentado de 75
  }

  // Versatile - MUITO mais raro e com mais requisitos
  if (age >= 27 && stats.overall >= 80 && player.yearsAtClub >= 5 && player.totalMatches >= 250) { // Muito mais requisitos
    // Apenas 5% de chance mesmo cumprindo todos os requisitos
    if (Math.random() < 0.05) { // Reduzido de 0.15
      traits.push({ name: 'Versatile', level: 'Silver', description: 'traits.versatile' });
    }
  }

  if ((personality === 'Professional' || stats.aggression <= 40) && stats.composure >= 76) { // Aumentado
    addTrait('Discipline', stats.composure, 78); // Aumentado de 75
  }

  // Remove duplicates (keep highest level)
  const uniqueTraits = new Map<TraitName, Trait>();
  traits.forEach(trait => {
    const existing = uniqueTraits.get(trait.name);
    if (!existing || getLevelValue(trait.level) > getLevelValue(existing.level)) {
      uniqueTraits.set(trait.name, trait);
    }
  });

  return Array.from(uniqueTraits.values());
};

// Helper to get numeric value of trait level
const getLevelValue = (level: TraitLevel): number => {
  switch (level) {
    case 'Diamond': return 4;
    case 'Gold': return 3;
    case 'Silver': return 2;
    case 'Bronze': return 1;
    default: return 0;
  }
};

// Helper to get trait description - returns translation key
const getTraitDescription = (name: TraitName, _level: TraitLevel): string => {
  // Map trait names to translation keys
  const traitKeyMap: Partial<Record<TraitName, string>> = {
    'Clinical Finisher': 'traitStyles.clinicalFinisher',
    'Power Header': 'traitStyles.powerHeader',
    'Long Shots': 'traitStyles.longShots',
    'Poacher': 'traitStyles.poacher',
    'Target Man': 'traitStyles.targetMan',
    'Speed Merchant': 'traitStyles.speedMerchant',
    'Dribbling Wizard': 'traitStyles.dribblingWizard',
    'Flair Player': 'traitStyles.flairPlayer',
    'Playmaker': 'traitStyles.playmaker',
    'Set-piece Specialist': 'traitStyles.setpieceSpecialist',
    'Vision': 'traitStyles.vision',
    'Crossing Specialist': 'traitStyles.crossingSpecialist',
    'Box to Box': 'traitStyles.boxToBox',
    'Deep Lying Playmaker': 'traitStyles.deepLyingPlaymaker',
    'Engine': 'traitStyles.engine',
    'Tireless Runner': 'traitStyles.tirelessRunner',
    'Ball Winner': 'traitStyles.ballWinner',
    'Interceptor': 'traitStyles.interceptor',
    'Ball Playing Defender': 'traitStyles.ballPlayingDefender',
    'No Nonsense Defender': 'traitStyles.noNonsenseDefender',
    'Aerial Dominance': 'traitStyles.aerialDominance',
    'Last Man': 'traitStyles.lastMan',
    'Sweeper Keeper': 'traitStyles.sweeperKeeper',
    'Shot Stopper': 'traitStyles.shotStopper',
    'Penalty Saver': 'traitStyles.penaltySaver',
    'Command of Area': 'traitStyles.commandOfArea',
    'Leadership': 'traitStyles.leadership',
    'Composure': 'traitStyles.composure',
    'Big Game Player': 'traitStyles.bigGamePlayer',
    'Second Wind': 'traitStyles.secondWind',
    'Natural Fitness': 'traitStyles.naturalFitness',
    'Versatile': 'traitStyles.versatile',
    'Discipline': 'traitStyles.quietProfessional',
    'Consistency': 'traitStyles.everPresent',
  };

  // Return translation key (to be translated by frontend)
  return traitKeyMap[name] || `traitStyles.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
};
