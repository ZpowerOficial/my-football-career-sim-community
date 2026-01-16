import type { Player, Trait, TraitName, CareerEvent } from '../types';

/**
 * Sistema melhorado de aquisição dinâmica de traits durante a carreira
 * Traits agora são MUITO mais difíceis de conseguir e exigem condições específicas
 */

interface TraitCondition {
  check: (player: Player, seasonStats: any) => boolean;
  probability: number;
  message: string;
}

/**
 * Condições muito mais rígidas para aquisição de traits
 */
const TRAIT_ACQUISITION_CONDITIONS: Record<string, TraitCondition> = {
  // ==================== TRAITS ESPECIAIS (MUITO RAROS) ====================

  'One-Club Man': {
    check: (player) => {
      // One-Club Man: jogador que passou TODA a carreira no mesmo clube
      // 8+ anos = alta probabilidade, 12+ anos = garantido, 15+ anos = sempre
      const yearsAtClub = player.yearsAtClub || 0;
      const matchesRequired = 150; // Mínimo de jogos para mostrar compromisso

      // Não exige personalidade específica - lealdade é demonstrada pela permanência
      return yearsAtClub >= 8 &&
        player.totalMatches >= matchesRequired &&
        !player.traits.some(t => t.name === 'One-Club Man');
    },
    probability: 1.0, // GARANTIDO se passar no check - a verificação já é rigorosa
    message: 'events.trait.oneClubMan'
  },

  'Two-Footed': {
    check: (player) => {
      // Mais flexível - pode acontecer com 4 ou 5 estrelas
      const weakFootRequired = Math.random() < 0.3 ? 4 : 5; // 30% aceita 4 estrelas
      const ageRequired = 23 + Math.floor(Math.random() * 4); // 23-26 anos

      return player.stats.weakFoot >= weakFootRequired &&
        player.age >= ageRequired &&
        player.totalMatches >= 120 + Math.floor(Math.random() * 80) && // 120-200 jogos
        !player.traits.some(t => t.name === 'Two-Footed');
    },
    probability: 0.15 + Math.random() * 0.20, // 15-35% - bem mais variável
    message: 'events.trait.twoFooted'
  },

  'Leadership': {
    check: (player) => {
      // Variável baseado em contexto
      const ageRequired = player.personality === 'Professional' ? 27 : 29;
      const leadershipRequired = 82 + Math.floor(Math.random() * 6); // 82-87
      const matchesRequired = 250 + Math.floor(Math.random() * 100); // 250-350

      return player.age >= ageRequired &&
        player.stats.leadership >= leadershipRequired &&
        player.squadStatus === 'Key Player' &&
        player.totalMatches >= matchesRequired &&
        player.yearsAtClub >= 2 + Math.floor(Math.random() * 2) && // 2-3 anos
        !player.traits.some(t => t.name === 'Leadership');
    },
    probability: 0.10 + Math.random() * 0.15, // 10-25% - bem variável
    message: 'events.trait.leadership'
  },

  'Clinical Finisher': {
    check: (player, seasonStats) => {
      const positionType = ['ST', 'CF', 'LW', 'RW'].includes(player.position.toUpperCase());
      const goalsPerMatch = seasonStats.matchesPlayed > 0 ? seasonStats.goals / seasonStats.matchesPlayed : 0;

      // Threshold variável entre 0.60-0.70 gols/jogo
      const goalsRequired = 0.60 + Math.random() * 0.10;
      const finishingRequired = 82 + Math.floor(Math.random() * 6); // 82-87
      const minMatches = 25 + Math.floor(Math.random() * 10); // 25-34 jogos

      return positionType &&
        goalsPerMatch >= goalsRequired &&
        player.stats.finishing >= finishingRequired &&
        player.stats.shooting >= 82 &&
        seasonStats.matchesPlayed >= minMatches &&
        !player.traits.some(t => t.name === 'Clinical Finisher');
    },
    probability: 0.08 + Math.random() * 0.12, // 8-20% - muito variável
    message: 'events.trait.clinicalFinisher'
  },

  'Set-piece Specialist': {
    check: (player, seasonStats) => {
      const positionType = ['CAM', 'CM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'].includes(player.position.toUpperCase());
      const assistsPerMatch = seasonStats.matchesPlayed > 0 ? seasonStats.assists / seasonStats.matchesPlayed : 0;

      // Thresholds variáveis
      const assistsRequired = 0.40 + Math.random() * 0.15; // 0.40-0.55
      const passingRequired = 83 + Math.floor(Math.random() * 5); // 83-87
      const curveRequired = 81 + Math.floor(Math.random() * 5); // 81-85

      return positionType &&
        assistsPerMatch >= assistsRequired &&
        player.stats.passing >= passingRequired &&
        player.stats.curve >= curveRequired &&
        seasonStats.matchesPlayed >= 25 + Math.floor(Math.random() * 10) &&
        !player.traits.some(t => t.name === 'Set-piece Specialist');
    },
    probability: 0.07 + Math.random() * 0.10, // 7-17%
    message: 'events.trait.setpieceSpecialist'
  },

  'Big Game Player': {
    check: (player) => {
      const totalTrophies = Object.values(player.trophies).reduce((a: number, b: number) => a + b, 0);
      // Requisitos variáveis
      const trophiesRequired = 4 + Math.floor(Math.random() * 3); // 4-6 troféus
      const ageRequired = 25 + Math.floor(Math.random() * 3); // 25-27 anos
      const reputationRequired = 80 + Math.floor(Math.random() * 10); // 80-89

      // Nem sempre precisa de prêmio individual - 40% de chance de não precisar
      const needsAward = Math.random() > 0.40;
      const hasAward = player.awards.worldPlayerAward + player.awards.worldPlayerAward + player.awards.continentalPlayerAward >= 1;

      return totalTrophies >= trophiesRequired &&
        player.age >= ageRequired &&
        player.reputation >= reputationRequired &&
        (!needsAward || hasAward) &&
        !player.traits.some(t => t.name === 'Big Game Player');
    },
    probability: 0.10 + Math.random() * 0.15, // 10-25%
    message: 'events.trait.bigGamePlayer'
  },

  'Injury Prone': {
    check: (player) => {
      // Sistema mais orgânico e menos determinístico
      const fitnessThreshold = 35 + Math.floor(Math.random() * 15); // 35-49
      const ageThreshold = 24 + Math.floor(Math.random() * 4); // 24-27

      // Múltiplos fatores aumentam chance
      let riskFactors = 0;
      if (player.stats.fitness <= fitnessThreshold) riskFactors++;
      if (player.personality === 'Inconsistent') riskFactors++;
      if (player.personality === 'Lazy') riskFactors++;
      if (player.age >= ageThreshold && player.stats.fitness < 55) riskFactors++;

      return riskFactors >= 2 && // Pelo menos 2 fatores de risco
        !player.traits.some(t => t.name === 'Injury Prone');
    },
    probability: 0.03 + Math.random() * 0.05, // 3-8% - MUITO raro e imprevisível
    message: 'events.trait.injuryProne'
  },

  'Versatile': {
    check: (player) => {
      // Mais orgânico - vários caminhos para conseguir
      const pathA = player.age >= 26 && player.stats.overall >= 78 && player.yearsAtClub >= 4;
      const pathB = player.age >= 24 && player.stats.overall >= 82 && player.totalMatches >= 180;
      const pathC = player.personality === 'Professional' && player.age >= 25 && player.totalMatches >= 150;

      return (pathA || pathB || pathC) &&
        !player.traits.some(t => t.name === 'Versatile');
    },
    probability: 0.06 + Math.random() * 0.08, // 6-14% - imprevisível
    message: 'events.trait.versatile'
  },

  'Power Header': {
    check: (player, seasonStats) => {
      const relevantPosition = ['ST', 'CF', 'CB', 'LB', 'RB'].includes(player.position.toUpperCase());

      // Stats variáveis
      const headingRequired = 83 + Math.floor(Math.random() * 6); // 83-88
      const jumpingRequired = 79 + Math.floor(Math.random() * 6); // 79-84
      const physicalRequired = 77 + Math.floor(Math.random() * 6); // 77-82

      return relevantPosition &&
        player.stats.heading >= headingRequired &&
        player.stats.jumping >= jumpingRequired &&
        player.stats.physical >= physicalRequired &&
        seasonStats.matchesPlayed >= 20 + Math.floor(Math.random() * 10) &&
        !player.traits.some(t => t.name === 'Power Header');
    },
    probability: 0.09 + Math.random() * 0.12, // 9-21%
    message: 'events.trait.powerHeader'
  },

  'Playmaker': {
    check: (player, seasonStats) => {
      const relevantPosition = ['CAM', 'CM', 'CDM', 'LW', 'RW'].includes(player.position.toUpperCase());
      const assistsPerMatch = seasonStats.matchesPlayed > 0 ? seasonStats.assists / seasonStats.matchesPlayed : 0;

      // Múltiplos caminhos
      const highAssists = assistsPerMatch >= 0.40 + Math.random() * 0.10; // 0.40-0.50
      const goodStats = player.stats.passing >= 84 && player.stats.vision >= 82;
      const excellentStats = player.stats.passing >= 88 || player.stats.vision >= 88;

      return relevantPosition &&
        (highAssists || excellentStats) &&
        goodStats &&
        seasonStats.matchesPlayed >= 25 + Math.floor(Math.random() * 10) &&
        !player.traits.some(t => t.name === 'Playmaker');
    },
    probability: 0.11 + Math.random() * 0.12, // 11-23%
    message: 'events.trait.playmaker'
  },

  'Speed Merchant': {
    check: (player) => {
      // Variável - pode acontecer com diferentes combinações
      const superFast = player.stats.pace >= 92 && player.stats.acceleration >= 88;
      const veryFast = player.stats.pace >= 90 && player.stats.acceleration >= 92;
      const fastAndYoung = player.stats.pace >= 89 && player.age <= 25;

      return (superFast || veryFast || fastAndYoung) &&
        player.age <= 28 + Math.floor(Math.random() * 3) && // 28-30 anos
        !player.traits.some(t => t.name === 'Speed Merchant');
    },
    probability: 0.15 + Math.random() * 0.15, // 15-30%
    message: 'events.trait.speedMerchant'
  },

  'Engine': {
    check: (player, seasonStats) => {
      // Variável baseado em contexto
      const staminaRequired = 87 + Math.floor(Math.random() * 6); // 87-92
      const workRateRequired = 85 + Math.floor(Math.random() * 5); // 85-89
      const matchesRequired = 30 + Math.floor(Math.random() * 10); // 30-39

      return player.stats.stamina >= staminaRequired &&
        player.stats.workRate >= workRateRequired &&
        seasonStats.matchesPlayed >= matchesRequired &&
        ['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(player.position.toUpperCase()) &&
        !player.traits.some(t => t.name === 'Engine');
    },
    probability: 0.12 + Math.random() * 0.12, // 12-24%
    message: 'events.trait.engine'
  },

  'Dribbling Wizard': {
    check: (player, seasonStats) => {
      // Diferentes combinações de stats
      const excellentDribbler = player.stats.dribbling >= 88 && player.stats.agility >= 83;
      const technicalMaster = player.stats.dribbling >= 86 && player.stats.ballControl >= 87;
      const agileMagician = player.stats.dribbling >= 85 && player.stats.agility >= 87;

      return (excellentDribbler || technicalMaster || agileMagician) &&
        seasonStats.matchesPlayed >= 20 + Math.floor(Math.random() * 10) &&
        ['LW', 'RW', 'CAM', 'ST', 'CF'].includes(player.position.toUpperCase()) &&
        !player.traits.some(t => t.name === 'Dribbling Wizard');
    },
    probability: 0.09 + Math.random() * 0.11, // 9-20%
    message: 'events.trait.dribblingWizard'
  },

  'Composure': {
    check: (player) => {
      // Múltiplos caminhos para obter
      const pathExperience = player.stats.composure >= 86 && player.age >= 27 && player.totalMatches >= 200;
      const pathTalent = player.stats.composure >= 90 && player.age >= 24;
      const pathPersonality = player.stats.composure >= 84 &&
        (player.personality === 'Professional' || player.personality === 'Determined') &&
        player.totalMatches >= 150;

      return (pathExperience || pathTalent || pathPersonality) &&
        !player.traits.some(t => t.name === 'Composure');
    },
    probability: 0.14 + Math.random() * 0.14, // 14-28%
    message: 'events.trait.composure'
  },

  'Discipline': {
    check: (player, seasonStats) => {
      const yellowCards = seasonStats.matchStats?.yellowCards || 0;
      const redCards = seasonStats.matchStats?.redCards || 0;

      // Thresholds variáveis
      const maxYellows = Math.floor(2 + Math.random() * 3); // 2-4 cartões amarelos
      const composureRequired = 75 + Math.floor(Math.random() * 6); // 75-80

      return (player.personality === 'Professional' || player.stats.aggression <= 50) &&
        player.stats.composure >= composureRequired &&
        seasonStats.matchesPlayed >= 25 + Math.floor(Math.random() * 10) &&
        yellowCards <= maxYellows &&
        redCards === 0 &&
        !player.traits.some(t => t.name === 'Discipline');
    },
    probability: 0.08 + Math.random() * 0.10, // 8-18%
    message: 'events.trait.discipline'
  }
};

/**
 * Verifica e adiciona traits adquiridos durante uma temporada
 * Retorna traits adquiridos e eventos gerados
 */
export const checkTraitAcquisition = (
  player: Player,
  seasonStats: any
): { newTraits: Trait[]; events: CareerEvent[] } => {
  const newTraits: Trait[] = [];
  const events: CareerEvent[] = [];

  // Iterar por todas as condições
  for (const [traitName, condition] of Object.entries(TRAIT_ACQUISITION_CONDITIONS)) {
    // Verificar se passa nas condições
    if (condition.check(player, seasonStats)) {
      // Rolar probabilidade
      if (Math.random() < condition.probability) {
        // Criar o trait com nível baseado em stats
        const trait: Trait = {
          name: traitName as TraitName,
          level: determineTraitLevel(player, traitName),
          description: getTraitDescription(traitName)
        };

        newTraits.push(trait);

        events.push({
          type: 'trait_acquired',
          description: condition.message
        });
      }
    }
  }

  return { newTraits, events };
};

/**
 * Determina o nível do trait baseado nos atributos do jogador
 */
const determineTraitLevel = (player: Player, traitName: string): 'Bronze' | 'Silver' | 'Gold' | 'Diamond' => {
  const overall = player.stats.overall;

  // Traits especiais sempre são Gold ou Diamond
  if (['One-Club Man', 'Two-Footed', 'Leadership', 'Big Game Player'].includes(traitName)) {
    return overall >= 85 ? 'Diamond' : 'Gold';
  }

  // Baseado no overall do jogador
  if (overall >= 88) return 'Diamond';
  if (overall >= 83) return 'Gold';
  if (overall >= 78) return 'Silver';
  return 'Bronze';
};

/**
 * Retorna descrição genérica para traits
 */
const getTraitDescription = (traitName: string): string => {
  // Idealmente deveria buscar de um arquivo de traduções
  // Por enquanto, retorna descrição básica
  return `${traitName} - Acquired through outstanding performance and dedication.`;
};

/**
 * Verifica se um jogador já possui determinado trait
 */
export const hasTrait = (player: Player, traitName: TraitName): boolean => {
  return player.traits.some(t => t.name === traitName);
};

/**
 * Remove traits negativos sob certas condições
 * (Ex: Injury Prone pode ser removido com fitness muito alto)
 */
export const checkTraitRemoval = (player: Player): { removedTraits: TraitName[]; events: CareerEvent[] } => {
  const removedTraits: TraitName[] = [];
  const events: CareerEvent[] = [];

  // Injury Prone pode ser removido com condicionamento excepcional
  if (hasTrait(player, 'Injury Prone') && player.stats.fitness >= 88 && player.age <= 28) {
    if (Math.random() < 0.08) { // 8% de chance
      removedTraits.push('Injury Prone');
      events.push({
        type: 'trait_lost',
        description: 'events.trait.injuryProneLost'
      });
    }
  }

  // Weak Foot pode ser removido com pé fraco melhorado
  if (hasTrait(player, 'Weak Foot') && player.stats.weakFoot >= 4) {
    if (Math.random() < 0.05) {
      removedTraits.push('Weak Foot');
      events.push({
        type: 'trait_lost',
        description: 'events.trait.weakFootLost'
      });
    }
  }

  return { removedTraits, events };
};
