import { Player, CareerEvent, Personality, Morale } from '../types';
import { rand, clamp, MORALE_LEVELS, gaussianRandom, randFloat } from './utils';

// ==================== SISTEMA DE QUÃMICA COM MOMENTUM E PROBABILIDADE ====================

/**
 * Sistema de momentum - química tende a se manter em níveis estáveis
 * Mudanças grandes são raras
 */
const calculateChemistryMomentum = (currentChemistry: number): number => {
  // Quanto mais extremo o valor, mais difícil de mudar
  if (currentChemistry >= 85) {
    return gaussianRandom(0.85, 0.10); // Mais difícil melhorar quando já está alto
  } else if (currentChemistry >= 70) {
    return gaussianRandom(1.00, 0.08);
  } else if (currentChemistry >= 50) {
    return gaussianRandom(1.10, 0.10);
  } else if (currentChemistry >= 30) {
    return gaussianRandom(1.05, 0.12);
  } else {
    return gaussianRandom(0.90, 0.15); // Mais difícil piorar quando já está muito baixo
  }
};

/**
 * Fase "lua de mel" para novos jogadores
 */
const getHoneymoonBonus = (yearsAtClub: number): number => {
  if (yearsAtClub === 0) {
    return gaussianRandom(8, 3); // Primeiro ano tem boost significativo
  } else if (yearsAtClub === 1) {
    return gaussianRandom(5, 2); // Segundo ano ainda tem boost
  } else if (yearsAtClub === 2) {
    return gaussianRandom(2, 1.5); // Terceiro ano tem boost pequeno
  }
  return 0;
};

/**
 * Bônus de conforto para veteranos do clube
 */
const getVeteranComfortBonus = (yearsAtClub: number, currentChemistry: number): number => {
  if (yearsAtClub >= 10 && currentChemistry >= 60) {
    return gaussianRandom(12, 4); // Ãcones do clube têm química estável e alta
  } else if (yearsAtClub >= 7 && currentChemistry >= 55) {
    return gaussianRandom(8, 3); // Veteranos têm boa química
  } else if (yearsAtClub >= 5 && currentChemistry >= 50) {
    return gaussianRandom(5, 2); // Jogadores estabelecidos têm química decente
  }
  return 0;
};

/**
 * Modificador por personalidade (alguns se adaptam melhor que outros)
 */
const getPersonalityChemistryModifier = (personality: Personality): number => {
  const modifiers: Record<Personality, [number, number]> = {
    'Professional': [1.15, 0.08], // Profissionais se adaptam bem
    'Loyal': [1.20, 0.10], // Leais têm química excelente
    'Determined': [1.10, 0.08], // Determinados se esforçam para se integrar
    'Ambitious': [0.95, 0.10], // Ambiciosos podem causar atrito
    'Temperamental': [0.80, 0.15], // Temperamentais têm química instável
    'Inconsistent': [0.85, 0.20], // Inconsistentes variam muito
    'Lazy': [0.75, 0.12], // Preguiçosos não se esforçam
    'Reserved': [0.90, 0.10], // Reservados demoram mais para se integrar
    'Media Darling': [1.05, 0.08], // Populares tendem a ter boa química
    'Leader': [1.12, 0.09]
  };

  const [mean, stdDev] = modifiers[personality] || [1.0, 0.08];
  return gaussianRandom(mean, stdDev);
};

/**
 * Correlação entre moral e química (são interdependentes)
 */
const getMoraleChemistryCorrelation = (morale: Morale): number => {
  const moraleIndex = MORALE_LEVELS.indexOf(morale);

  // Moral muito alta ou muito baixa afeta fortemente a química
  const correlations: Record<number, [number, number]> = {
    4: [12, 4],   // Very High - grande boost
    3: [6, 3],    // High - bom boost
    2: [0, 2],    // Normal - neutro
    1: [-8, 4],   // Low - penalidade
    0: [-15, 5]   // Very Low - grande penalidade
  };

  const [mean, stdDev] = correlations[moraleIndex] || [0, 2];
  return gaussianRandom(mean, stdDev);
};

/**
 * Impacto de performance na química
 */
const getPerformanceChemistryImpact = (
  performanceRating: number,
  matchesPlayed: number,
  squadStatus: string
): number => {
  // Performance consistentemente boa melhora química
  if (performanceRating > 1.0) {
    return gaussianRandom(8, 3);
  } else if (performanceRating > 0.8) {
    return gaussianRandom(4, 2);
  } else if (performanceRating > 0.6) {
    return gaussianRandom(1, 1.5);
  } else if (performanceRating > 0.4) {
    return gaussianRandom(-2, 2);
  } else if (performanceRating > 0.2) {
    // Performance ruim com muitos jogos é problemático
    if (matchesPlayed > 20) {
      return gaussianRandom(-8, 4);
    }
    return gaussianRandom(-4, 3);
  } else {
    // Performance muito ruim
    if (matchesPlayed > 15) {
      return gaussianRandom(-12, 5);
    }
    return gaussianRandom(-6, 3);
  }
};

/**
 * Impacto de tempo de jogo inadequado
 */
const getPlayingTimeImpact = (
  matchesPlayed: number,
  availableMatches: number,
  squadStatus: string
): number => {
  const playingTimeRatio = matchesPlayed / Math.max(1, availableMatches);

  // Jogadores chave que não jogam ficam insatisfeitos
  if (squadStatus === 'Key Player' && playingTimeRatio < 0.6) {
    return gaussianRandom(-12, 4);
  } else if (squadStatus === 'Rotation' && playingTimeRatio < 0.4) {
    return gaussianRandom(-8, 3);
  } else if (squadStatus === 'Prospect' && playingTimeRatio < 0.2) {
    return gaussianRandom(-5, 2);
  }

  // Reservas que mal jogam perdem química
  if (squadStatus === 'Surplus' && matchesPlayed < 5) {
    return gaussianRandom(-10, 4);
  }

  // Jogadores que jogam muito têm boa química
  if (playingTimeRatio > 0.8 && squadStatus !== 'Surplus') {
    return gaussianRandom(5, 2);
  }

  return 0;
};

/**
 * Impacto de eventos especiais da temporada
 */
const getEventChemistryImpact = (seasonEvents: CareerEvent[]): { change: number; events: CareerEvent[] } => {
  const newEvents: CareerEvent[] = [];
  let totalChange = 0;

  // Troféus aumentam MUITO a química
  const trophyCount = seasonEvents.filter(e => e.type === 'trophy').length;
  if (trophyCount > 0) {
    const trophyBonus = gaussianRandom(trophyCount * 8, 4);
    totalChange += trophyBonus;

    if (trophyCount >= 3) {
      newEvents.push({
        type: 'chemistry_boost',
        description: 'events.chemistry.multipleTrophies'
      });
    } else if (trophyCount >= 2) {
      newEvents.push({
        type: 'chemistry_boost',
        description: 'events.chemistry.trophyWin'
      });
    }
  }

  // Promoção
  if (seasonEvents.some(e => e.type === 'promotion')) {
    const promotionBonus = gaussianRandom(10, 3);
    totalChange += promotionBonus;
    newEvents.push({
      type: 'chemistry_boost',
      description: 'events.chemistry.promotion'
    });
  }

  // Rebaixamento (desastroso para química)
  if (seasonEvents.some(e => e.type === 'demotion')) {
    const relegationPenalty = gaussianRandom(-18, 5);
    totalChange += relegationPenalty;
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.relegation'
    });
  }

  // Confusões no vestiário
  if (seasonEvents.some(e => e.type === 'training_bustup')) {
    const bustupPenalty = gaussianRandom(-12, 4);
    totalChange += bustupPenalty;
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.trainingIncident'
    });
  }

  // Problemas com o treinador
  if (seasonEvents.some(e => e.type === 'manager_fallout')) {
    const falloutPenalty = gaussianRandom(-10, 3);
    totalChange += falloutPenalty;
  }

  // Forma excepcional
  if (seasonEvents.some(e => e.type === 'on_fire')) {
    const formBonus = gaussianRandom(6, 2);
    totalChange += formBonus;
    newEvents.push({
      type: 'chemistry_boost',
      description: 'events.chemistry.excellentForm'
    });
  }

  // Fase ruim
  if (seasonEvents.some(e => e.type === 'form_slump')) {
    const slumpPenalty = gaussianRandom(-5, 2);
    totalChange += slumpPenalty;
  }

  // Lesões graves
  if (seasonEvents.some(e => e.type === 'injury' && e.description.includes('Severe'))) {
    const injuryPenalty = gaussianRandom(-8, 3);
    totalChange += injuryPenalty;
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.injuryAbsence'
    });
  }

  // Agitação por transferência
  if (seasonEvents.some(e => e.type === 'agitate_transfer' || e.type === 'public_transfer_request')) {
    const transferPenalty = gaussianRandom(-15, 4);
    totalChange += transferPenalty;
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.transferSaga'
    });
  }

  return { change: totalChange, events: newEvents };
};

/**
 * Traits que afetam química
 */
const getTraitChemistryModifiers = (player: Player): number => {
  let modifier = 1.0;

  if (player.traits.some(t => t.name === 'Leadership')) {
    modifier *= gaussianRandom(1.15, 0.08); // Líderes têm química melhor
  }

  if (player.traits.some(t => t.name === 'One-Club Man')) {
    modifier *= gaussianRandom(1.20, 0.10); // Ãcones do clube têm química excelente
  }

  if (player.traits.some(t => t.name === 'Versatile')) {
    modifier *= gaussianRandom(1.08, 0.06); // Versáteis se adaptam bem
  }

  if (player.traits.some(t => t.name === 'Injury Prone')) {
    modifier *= gaussianRandom(0.92, 0.08); // Lesões constantes atrapalham
  }

  return modifier;
};

/**
 * Sistema de eventos raros (química pode mudar drasticamente)
 */
const checkRareChemistryEvents = (
  player: Player,
  currentChemistry: number
): { change: number; event: CareerEvent | null } => {

  // Evento raro positivo (1% de chance)
  if (Math.random() < 0.01 && currentChemistry < 80) {
    const rareBoost = gaussianRandom(20, 5);
    return {
      change: rareBoost,
      event: {
        type: 'chemistry_boost',
        description: 'events.chemistry.belovedFigure'
      }
    };
  }

  // Evento raro negativo (0.5% de chance)
  if (Math.random() < 0.005 && currentChemistry > 30) {
    const rarePenalty = gaussianRandom(-25, 6);
    return {
      change: rarePenalty,
      event: {
        type: 'chemistry_loss',
        description: 'events.chemistry.seriousIncident'
      }
    };
  }

  return { change: 0, event: null };
};

// ==================== FUNÃ‡ÃƒO PRINCIPAL ====================

export const updateTeamChemistry = (
  player: Player,
  performanceRating: number,
  matchesPlayed: number,
  seasonEvents: CareerEvent[],
  availableMatches: number = 40
): { updatedPlayer: Player; events: CareerEvent[] } => {
  const newEvents: CareerEvent[] = [];

  // Se estiver emprestado, a química se mantém estável
  if (player.parentClub !== null) {
    return { updatedPlayer: player, events: [] };
  }

  const currentChemistry = player.teamChemistry;
  let chemistryChange = 0;

  // ========== STEP 1: SISTEMA DE MOMENTUM ==========
  const momentum = calculateChemistryMomentum(currentChemistry);

  // ========== STEP 2: MUDANÃ‡A BASE POR ANOS NO CLUBE ==========
  const yearsAtClub = player.yearsAtClub;
  let baseChange = 0;

  if (yearsAtClub === 0) {
    // Primeiro ano - grande variação
    baseChange = gaussianRandom(8, 5);
  } else if (yearsAtClub === 1) {
    // Segundo ano - ainda em adaptação
    baseChange = gaussianRandom(6, 4);
  } else if (yearsAtClub <= 4) {
    // Anos intermediários - estabilizando
    baseChange = gaussianRandom(4, 3);
  } else if (yearsAtClub <= 7) {
    // Veterano - estável
    baseChange = gaussianRandom(2, 2);
  } else {
    // Lenda do clube - muito estável
    baseChange = gaussianRandom(1, 1.5);
  }

  chemistryChange += baseChange;

  // ========== STEP 3: BÃ”NUS DE LUA DE MEL ==========
  const honeymoonBonus = getHoneymoonBonus(yearsAtClub);
  chemistryChange += honeymoonBonus;

  // ========== STEP 4: BÃ”NUS DE VETERANO ==========
  const veteranBonus = getVeteranComfortBonus(yearsAtClub, currentChemistry);
  chemistryChange += veteranBonus;

  if (veteranBonus > 8) {
    newEvents.push({
      type: 'chemistry_boost',
      description: 'events.chemistry.clubLegend'
    });
  }

  // ========== STEP 5: MODIFICADOR DE PERSONALIDADE ==========
  const personalityMod = getPersonalityChemistryModifier(player.personality);
  chemistryChange *= personalityMod;

  // ========== STEP 6: CORRELAÃ‡ÃƒO COM MORAL ==========
  const moraleImpact = getMoraleChemistryCorrelation(player.morale);
  chemistryChange += moraleImpact;

  // ========== STEP 7: IMPACTO DE PERFORMANCE ==========
  const performanceImpact = getPerformanceChemistryImpact(
    performanceRating,
    matchesPlayed,
    player.squadStatus
  );
  chemistryChange += performanceImpact;

  // ========== STEP 8: IMPACTO DE TEMPO DE JOGO ==========
  const playingTimeImpact = getPlayingTimeImpact(
    matchesPlayed,
    availableMatches,
    player.squadStatus
  );
  chemistryChange += playingTimeImpact;

  if (playingTimeImpact < -8) {
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.lackPlayingTime'
    });
  }

  // ========== STEP 9: IMPACTO DE EVENTOS ESPECIAIS ==========
  const { change: eventChange, events: eventEvents } = getEventChemistryImpact(seasonEvents);
  chemistryChange += eventChange;
  newEvents.push(...eventEvents);

  // ========== STEP 10: MODIFICADORES DE TRAITS ==========
  const traitModifier = getTraitChemistryModifiers(player);
  chemistryChange *= traitModifier;

  // ========== STEP 11: APLICAR MOMENTUM ==========
  chemistryChange *= momentum;

  // ========== STEP 12: EVENTOS RAROS ==========
  const { change: rareChange, event: rareEvent } = checkRareChemistryEvents(player, currentChemistry);
  chemistryChange += rareChange;
  if (rareEvent) newEvents.push(rareEvent);

  // ========== STEP 13: INCERTEZA FINAL ==========
  // Adicionar camada final de ruído
  const finalUncertainty = gaussianRandom(0, 2);
  chemistryChange += finalUncertainty;

  // ========== STEP 14: APLICAR MUDANÃ‡A COM LIMITES ==========
  const newChemistry = clamp(
    Math.round(currentChemistry + chemistryChange),
    0,
    100
  );

  // ========== STEP 15: EVENTOS DE MUDANÃ‡A SIGNIFICATIVA ==========
  const chemistryDelta = newChemistry - currentChemistry;

  if (chemistryDelta >= 20) {
    newEvents.push({
      type: 'chemistry_boost',
      description: 'events.chemistry.improvedDramatically',
      descriptionParams: { from: currentChemistry, to: newChemistry }
    });
  } else if (chemistryDelta <= -20) {
    newEvents.push({
      type: 'chemistry_loss',
      description: 'events.chemistry.deterioratedSignificantly',
      descriptionParams: { from: currentChemistry, to: newChemistry }
    });
  }

  return {
    updatedPlayer: {
      ...player,
      teamChemistry: newChemistry
    },
    events: newEvents
  };
};

// ==================== FUNÃ‡ÃƒO AUXILIAR PARA JOGADORES NOVOS ====================

/**
 * Inicializa a química de um jogador novo no clube
 */
export const initializeTeamChemistry = (player: Player): number => {
  // Química inicial baseada em múltiplos fatores
  let baseChemistry = gaussianRandom(45, 10);

  // Personalidade
  if (player.personality === 'Professional') {
    baseChemistry += gaussianRandom(15, 5);
  } else if (player.personality === 'Loyal') {
    baseChemistry += gaussianRandom(12, 4);
  } else if (player.personality === 'Temperamental') {
    baseChemistry -= gaussianRandom(10, 4);
  } else if (player.personality === 'Reserved') {
    baseChemistry -= gaussianRandom(5, 3);
  }

  // Idade (jovens se adaptam mais rápido)
  if (player.age <= 21) {
    baseChemistry += gaussianRandom(8, 3);
  } else if (player.age >= 32) {
    baseChemistry -= gaussianRandom(5, 2);
  }

  // Status no elenco
  if (player.squadStatus === 'Key Player') {
    baseChemistry += gaussianRandom(10, 4);
  } else if (player.squadStatus === 'Surplus') {
    baseChemistry -= gaussianRandom(8, 3);
  }

  return clamp(Math.round(baseChemistry), 20, 80);
};
