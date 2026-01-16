/**
 * Sistema de Rivalidades Pessoais
 * Rastreia rivalidades entre jogadores e gera narrativas
 */

import { Player, Rivalry, RivalryEvent } from '../types';
import { rand, randFloat, chance, clamp, randomPick } from '../utils/random';
import { logger } from '../utils/logger';

// ==================== CRIA�?�fO DE RIVALIDADES ====================

/**
 * Detecta potenciais rivalidades baseadas em contexto
 */
export const detectPotentialRivalry = (
  player: Player,
  opponent: Player,
  context: {
    samePosition?: boolean;
    sameNationality?: boolean;
    sameLeague?: boolean;
    competingForAward?: boolean;
    transferHistory?: boolean; // Ex: um substituiu o outro no clube
    mediaClash?: boolean;
  }
): number => {
  let rivalryPotential = 0;

  // Mesma posição = competição direta
  if (context.samePosition) {
    rivalryPotential += 30;

    // Se OVRs similares, competição maior
    const overallDiff = Math.abs(player.stats.overall - opponent.stats.overall);
    if (overallDiff <= 3) rivalryPotential += 20;
  }

  // Mesma nacionalidade competindo por seleção
  if (context.sameNationality) {
    rivalryPotential += 25;
  }

  // Mesma liga = confrontos frequentes
  if (context.sameLeague) {
    rivalryPotential += 15;
  }

  // Competindo por prêmios
  if (context.competingForAward) {
    rivalryPotential += 40;
  }

  // Histórico de transferência (um substituiu o outro)
  if (context.transferHistory) {
    rivalryPotential += 35;
  }

  // Clash na mídia
  if (context.mediaClash) {
    rivalryPotential += 30;
  }

  // Personalidades que tendem a criar rivalidades
  if (player.personality === 'Temperamental' || player.personality === 'Ambitious') {
    rivalryPotential += 15;
  }

  return clamp(rivalryPotential, 0, 100);
};

/**
 * Cria uma nova rivalidade
 */
export const createRivalry = (
  playerName: string,
  opponentName: string,
  reason: Rivalry['reason'],
  initialIntensity: number = 50
): Rivalry => {
  logger.info(`New rivalry formed: ${playerName} vs ${opponentName} (${reason})`, 'rivalry');

  return {
    opponent: opponentName,
    intensity: clamp(initialIntensity, 0, 100),
    reason,
    events: []
  };
};

// ==================== EVENTOS DE RIVALIDADE ====================

/**
 * Registra um evento de rivalidade
 */
export const recordRivalryEvent = (
  rivalry: Rivalry,
  type: RivalryEvent['type'],
  outcome: RivalryEvent['outcome']
): Rivalry => {
  // Calcular impacto na intensidade
  let impact = 0;

  switch (type) {
    case 'HeadToHead':
      if (outcome === 'Win') impact = rand(5, 15);
      else if (outcome === 'Loss') impact = rand(-15, -5);
      else impact = rand(-3, 3);
      break;

    case 'MediaClash':
      impact = rand(10, 25); // Sempre aumenta tensão
      break;

    case 'AwardCompetition':
      if (outcome === 'Win') impact = rand(15, 30);
      else if (outcome === 'Loss') impact = rand(-30, -15);
      else impact = 0;
      break;
  }

  const event: RivalryEvent = { type, outcome, impact };

  return {
    ...rivalry,
    intensity: clamp(rivalry.intensity + impact, 0, 100),
    events: [...rivalry.events, event]
  };
};

/**
 * Processa confronto direto entre rivais
 */
export const processHeadToHead = (
  rivalry: Rivalry,
  playerRating: number,
  opponentRating: number,
  playerGoals: number,
  opponentGoals: number
): {
  updatedRivalry: Rivalry;
  narrative: string;
} => {
  // Determinar resultado
  let outcome: RivalryEvent['outcome'];

  if (playerRating > opponentRating + 1) {
    outcome = 'Win';
  } else if (opponentRating > playerRating + 1) {
    outcome = 'Loss';
  } else {
    outcome = 'Draw';
  }

  // Registrar evento
  const updatedRivalry = recordRivalryEvent(rivalry, 'HeadToHead', outcome);

  // Gerar narrativa
  const narratives = generateHeadToHeadNarrative(
    rivalry.opponent,
    outcome,
    playerRating,
    opponentRating,
    playerGoals,
    opponentGoals,
    updatedRivalry.intensity
  );

  logger.debug(
    `Head-to-head: vs ${rivalry.opponent} - ${outcome} (Intensity: ${updatedRivalry.intensity})`,
    'rivalry'
  );

  return {
    updatedRivalry,
    narrative: narratives
  };
};

/**
 * Gera narrativas para confronto direto
 */
const generateHeadToHeadNarrative = (
  opponent: string,
  outcome: RivalryEvent['outcome'],
  playerRating: number,
  opponentRating: number,
  playerGoals: number,
  opponentGoals: number,
  intensity: number
): string => {
  const isHighIntensity = intensity >= 70;
  const isGoalScorer = playerGoals > opponentGoals;
  const ratingDiff = playerRating - opponentRating;

  if (outcome === 'Win') {
    if (isGoalScorer && playerGoals >= 2) {
      return isHighIntensity
        ? `�Y"� STATEMENT MADE! Dominant display against arch-rival ${opponent}, scoring ${playerGoals} goals. The rivalry intensifies!`
        : `�Y'� Outshone ${opponent} with ${playerGoals} goals in head-to-head battle.`;
    } else if (ratingDiff >= 2) {
      return isHighIntensity
        ? `⭐ Masterclass performance (${playerRating.toFixed(1)}) completely overshadowed ${opponent} (${opponentRating.toFixed(1)}). Rivalry reaching boiling point!`
        : `�Y"^ Superior display against ${opponent} - clear winner on the day.`;
    } else {
      return `�o. Edged out ${opponent} in tight contest (${playerRating.toFixed(1)} vs ${opponentRating.toFixed(1)}).`;
    }
  } else if (outcome === 'Loss') {
    if (opponentGoals >= 2 && playerGoals === 0) {
      return isHighIntensity
        ? `�Y~� HUMILIATION! ${opponent} scored ${opponentGoals}, completely dominated. This rivalry just got personal!`
        : `�Y~z Comprehensively beaten by ${opponent} who scored ${opponentGoals} goals.`;
    } else if (ratingDiff <= -2) {
      return isHighIntensity
        ? `�Y'" Outclassed by ${opponent} (${opponentRating.toFixed(1)}) - will be desperate for revenge in next encounter!`
        : `�Y"? ${opponent} was clearly the better player today (${opponentRating.toFixed(1)} vs ${playerRating.toFixed(1)}).`;
    } else {
      return `�s�️ Narrowly beaten by ${opponent} - scores close but they came out on top.`;
    }
  } else {
    return isHighIntensity
      ? `�s"️ Intense battle with ${opponent} ends level - both gave everything in heated rivalry clash!`
      : `�Y�� Evenly matched with ${opponent} - neither could gain upper hand.`;
  }
};

// ==================== GERENCIAMENTO DE RIVALIDADES ====================

/**
 * Atualiza todas as rivalidades de um jogador
 */
export const updateRivalries = (
  rivalries: Rivalry[]
): Rivalry[] => {
  // Decay natural da intensidade ao longo do tempo
  return rivalries.map(rivalry => ({
    ...rivalry,
    intensity: Math.max(rivalry.intensity - 2, 0) // -2 por temporada sem eventos
  })).filter(rivalry => rivalry.intensity > 10); // Remove rivalries fracas
};

/**
 * Obtém a rivalidade mais intensa
 */
export const getTopRivalry = (rivalries: Rivalry[]): Rivalry | null => {
  if (rivalries.length === 0) return null;

  return rivalries.reduce((top, current) =>
    current.intensity > top.intensity ? current : top
  );
};

/**
 * Verifica se há rivalidade com um jogador específico
 */
export const hasRivalryWith = (
  rivalries: Rivalry[],
  opponentName: string
): boolean => {
  return rivalries.some(r => r.opponent === opponentName);
};

/**
 * Obtém ou cria rivalidade
 */
export const getOrCreateRivalry = (
  rivalries: Rivalry[],
  opponentName: string,
  reason: Rivalry['reason'],
  initialIntensity: number = 50
): { rivalries: Rivalry[]; rivalry: Rivalry; isNew: boolean } => {
  const existing = rivalries.find(r => r.opponent === opponentName);

  if (existing) {
    return { rivalries, rivalry: existing, isNew: false };
  }

  const newRivalry = createRivalry('', opponentName, reason, initialIntensity);

  return {
    rivalries: [...rivalries, newRivalry],
    rivalry: newRivalry,
    isNew: true
  };
};

// ==================== NARRATIVAS E EFEITOS ====================

/**
 * Gera impactos de rivalidade no desempenho
 */
export interface RivalryImpact {
  motivationBonus: number; // Bônus de motivação ao jogar contra rival
  pressureMultiplier: number; // Multiplier de pressão
  mediaAttention: number; // Atenção extra da mídia
  narrative: string;
}

export const calculateRivalryImpact = (
  rivalry: Rivalry
): RivalryImpact => {
  const intensity = rivalry.intensity;

  // Alta intensidade = alta motivação mas também alta pressão
  const motivationBonus = intensity >= 80 ? 15 :
                         intensity >= 60 ? 10 :
                         intensity >= 40 ? 5 : 0;

  const pressureMultiplier = 1 + (intensity / 200); // Até 1.5x
  const mediaAttention = intensity * 0.8; // Até 80 pontos de atenção

  const narratives = [
    `�YZ� Extra motivated to prove superiority over ${rivalry.opponent}`,
    `�s� Rivalry with ${rivalry.opponent} fuels competitive fire`,
    `�Y"� Personal battle with ${rivalry.opponent} adds edge to performance`,
    `�Y'� Determined to outshine rival ${rivalry.opponent}`
  ];

  return {
    motivationBonus,
    pressureMultiplier,
    mediaAttention,
    narrative: randomPick(narratives)
  };
};

/**
 * Gera manchetes de mídia sobre rivalidade
 */
export const generateRivalryHeadline = (
  playerName: string,
  rivalry: Rivalry,
  recentEvent?: RivalryEvent
): string => {
  const opponent = rivalry.opponent;
  const intensity = rivalry.intensity;

  if (!recentEvent) {
    // Headline geral sobre a rivalidade
    if (intensity >= 80) {
      return `�Y"� The Feud: ${playerName} vs ${opponent} rivalry reaching fever pitch!`;
    } else if (intensity >= 60) {
      return `�s"️ Battle Lines Drawn: ${playerName} and ${opponent} rivalry intensifies`;
    } else {
      return `�Y'? Growing Tension: ${playerName} vs ${opponent} developing rivalry`;
    }
  }

  // Headline sobre evento específico
  switch (recentEvent.type) {
    case 'HeadToHead':
      if (recentEvent.outcome === 'Win') {
        return intensity >= 70
          ? `�Y�? ${playerName} DOMINATES ${opponent} in Epic Rivalry Clash!`
          : `�o. ${playerName} Edges Out ${opponent} in Head-to-Head`;
      } else if (recentEvent.outcome === 'Loss') {
        return intensity >= 70
          ? `�Y'" HEARTBREAK: ${opponent} Crushes ${playerName} in Bitter Rivalry!`
          : `�Y"? ${opponent} Gets Better of ${playerName} This Time`;
      } else {
        return `�s-️ ${playerName} and ${opponent} Battle to Stalemate in Rivalry Match`;
      }

    case 'MediaClash':
      return `�Y'� WAR OF WORDS: ${playerName} and ${opponent} Exchange Barbs in Media`;

    case 'AwardCompetition':
      if (recentEvent.outcome === 'Win') {
        return `�Y�. ${playerName} Beats ${opponent} to Major Award - Rivalry Hits New Level!`;
      } else {
        return `�Y~� ${opponent} Pips ${playerName} to Award - Revenge Brewing?`;
      }

    default:
      return `�Y"� ${playerName} vs ${opponent}: Rivalry Continues`;
  }
};

/**
 * Processa competição por prêmio
 */
export const processAwardCompetition = (
  rivalries: Rivalry[],
  opponentName: string,
  playerWon: boolean
): {
  updatedRivalries: Rivalry[];
  narrative: string;
} => {
  const outcome: RivalryEvent['outcome'] = playerWon ? 'Win' : 'Loss';

  const { rivalries: updated, rivalry, isNew } = getOrCreateRivalry(
    rivalries,
    opponentName,
    'Trophy',
    60 // Alta intensidade inicial para competição de prêmio
  );

  const updatedRivalry = recordRivalryEvent(rivalry, 'AwardCompetition', outcome);

  const finalRivalries = updated.map(r =>
    r.opponent === opponentName ? updatedRivalry : r
  );

  const narrative = playerWon
    ? `�Y�? Beat ${opponentName} to major award! ${isNew ? 'A new rivalry is born.' : 'Rivalry intensifies.'}`
    : `�Y~� Lost out to ${opponentName} for major award. ${isNew ? 'This could be the start of something...' : 'The rivalry deepens.'}`;

  logger.info(
    `Award competition with ${opponentName}: ${outcome} (Intensity: ${updatedRivalry.intensity})`,
    'rivalry'
  );

  return {
    updatedRivalries: finalRivalries,
    narrative
  };
};

/**
 * Simula clash na mídia
 */
export const simulateMediaClash = (
  rivalries: Rivalry[],
  opponentName: string,
  reason: string
): {
  updatedRivalries: Rivalry[];
  narrative: string;
} => {
  const { rivalries: updated, rivalry, isNew } = getOrCreateRivalry(
    rivalries,
    opponentName,
    'Media',
    40
  );

  const updatedRivalry = recordRivalryEvent(rivalry, 'MediaClash', 'Draw');

  const finalRivalries = updated.map(r =>
    r.opponent === opponentName ? updatedRivalry : r
  );

  const narratives = [
    `�Y'� Heated exchange with ${opponentName} in press conference over ${reason}`,
    `�Y"� Social media battle erupts with ${opponentName} after ${reason}`,
    `�Y"� Public spat with ${opponentName}: "${reason}" - tensions rising!`
  ];

  const narrative = randomPick(narratives);

  logger.info(`Media clash with ${opponentName}: ${reason}`, 'rivalry');

  return {
    updatedRivalries: finalRivalries,
    narrative
  };
};
