import { Player, PlayerStats, Trait, Position, PositionDetail, Personality, Archetype } from '../types';
import { clamp, rand, gaussianRandom, randFloat, MORALE_LEVELS } from './utils';
import { getPlayerProfile } from './playerProfileLogic';

// ==================== TIPOS E INTERFACES ====================

interface Scout {
  id: string;
  name: string;
  quality: number; // 0-100
  experience: number; // Years
  specialization: 'Youth' | 'Senior' | 'Technical' | 'Physical' | 'Tactical' | 'All-round';
  regionExpertise: string[]; // Ex: ['England', 'Spain', 'Brazil']
  positionExpertise: Position[]; // Ex: ['Attacker', 'Midfielder']
  network: number; // 0-100 - Qualidade da rede de contatos
  reliability: number; // 0-100 - Consistência dos relatórios
  bias: 'optimistic' | 'neutral' | 'pessimistic';
}

interface ScoutingContext {
  playerExposure: 'high' | 'medium' | 'low' | 'hidden';
  leagueDifficulty: number; // 1-5
  travelDistance: 'local' | 'regional' | 'international' | 'exotic';
  matchesObserved: number;
  timeSpent: number; // Days
  informationAvailable: number; // 0-100
}

interface ScoutObservation {
  scoutId: string;
  scoutName: string;
  date: Date;
  accuracy: number;
  confidence: number;
  visibleStats: Partial<PlayerStats>;
  hiddenStats: (keyof PlayerStats)[];
  potentialRange: { min: number; max: number };
  valueEstimate: { min: number; max: number };
  traits: Trait[];
  observations: string[];
  concerns: string[];
  strengths: string[];
  recommendation: 'Must Buy' | 'Great Prospect' | 'Worth Monitoring' | 'Pass' | 'Avoid';
  bias: number; // -20 to +20
}

interface ScoutReport {
  player: Player;
  primaryObservation: ScoutObservation;
  additionalObservations: ScoutObservation[];
  consensus: {
    confidence: 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';
    agreement: number; // 0-100
    averageAccuracy: number;
    divergence: string[]; // Areas where scouts disagree
  };
  context: ScoutingContext;
  visibleStats: Partial<PlayerStats>;
  hiddenStats: (keyof PlayerStats)[];
  potentialRange: { min: number; max: number };
  traits: Trait[];
  recommendation: 'Must Buy' | 'Great Prospect' | 'Worth Monitoring' | 'Pass' | 'Avoid';
  scoutNotes: string;
  valueEstimate: { min: number; max: number };
  riskAssessment: {
    injury: 'High' | 'Medium' | 'Low';
    adaptation: 'High' | 'Medium' | 'Low';
    attitude: 'High' | 'Medium' | 'Low';
    potential: 'High' | 'Medium' | 'Low';
  };
  specialFlags: {
    hiddenGem: boolean;
    overrated: boolean;
    sleeper: boolean;
    risky: boolean;
    exceptional: boolean;
  };
}

// ==================== GERAÃ‡ÃƒO DE SCOUTS ====================

const SCOUT_POOL: Scout[] = [
  {
    id: 'scout-001',
    name: 'Roberto Martinez',
    quality: 85,
    experience: 15,
    specialization: 'Youth',
    regionExpertise: ['Spain', 'Portugal', 'South America'],
    positionExpertise: ['Attacker', 'Midfielder'],
    network: 80,
    reliability: 88,
    bias: 'optimistic'
  },
  {
    id: 'scout-002',
    name: 'Hans Mueller',
    quality: 78,
    experience: 12,
    specialization: 'Technical',
    regionExpertise: ['Germany', 'Netherlands', 'Belgium'],
    positionExpertise: ['Midfielder', 'Defender'],
    network: 75,
    reliability: 82,
    bias: 'neutral'
  },
  {
    id: 'scout-003',
    name: 'Jean-Pierre Dubois',
    quality: 90,
    experience: 20,
    specialization: 'All-round',
    regionExpertise: ['France', 'Africa', 'England'],
    positionExpertise: ['Attacker', 'Midfielder', 'Defender'],
    network: 92,
    reliability: 95,
    bias: 'pessimistic'
  },
  {
    id: 'scout-004',
    name: 'Carlos Silva',
    quality: 82,
    experience: 10,
    specialization: 'Youth',
    regionExpertise: ['Brazil', 'Argentina', 'Uruguay'],
    positionExpertise: ['Attacker', 'Midfielder'],
    network: 85,
    reliability: 78,
    bias: 'optimistic'
  },
  {
    id: 'scout-005',
    name: 'David Thompson',
    quality: 75,
    experience: 8,
    specialization: 'Physical',
    regionExpertise: ['England', 'Scotland', 'Ireland'],
    positionExpertise: ['Defender', 'Goalkeeper'],
    network: 70,
    reliability: 80,
    bias: 'neutral'
  }
];

// ==================== ANÃLISE DE CONTEXTO ====================

/**
 * Determina o contexto do scouting
 */
const analyzeScoutingContext = (player: Player, scout: Scout): ScoutingContext => {

  // ========== EXPOSIÃ‡ÃƒO DO JOGADOR ==========
  let playerExposure: ScoutingContext['playerExposure'] = 'medium';

  if (player.team.leagueTier === 1 && player.squadStatus === 'Key Player') {
    playerExposure = 'high'; // Jogador de top league em time principal
  } else if (player.team.leagueTier === 1 && player.squadStatus === 'Rotation') {
    playerExposure = 'medium';
  } else if (player.team.leagueTier <= 3 && player.squadStatus === 'Key Player') {
    playerExposure = 'medium';
  } else if (player.team.leagueTier >= 4 || player.squadStatus === 'Reserve') {
    playerExposure = 'low';
  } else if (player.team.isYouth || !player.hasMadeSeniorDebut) {
    playerExposure = 'hidden';
  }

  // ========== DIFICULDADE DA LIGA ==========
  const leagueDifficulty = player.team.leagueTier;

  // ========== DISTÃ‚NCIA DE VIAGEM ==========
  let travelDistance: ScoutingContext['travelDistance'] = 'regional';

  const playerRegion = player.nationality;
  const scoutHasRegionExpertise = scout.regionExpertise.includes(playerRegion);

  if (scoutHasRegionExpertise) {
    travelDistance = 'local';
  } else if (playerRegion.includes('Europe') || playerRegion.includes('South America')) {
    travelDistance = 'regional';
  } else if (playerRegion.includes('Asia') || playerRegion.includes('Africa')) {
    travelDistance = 'international';
  } else {
    travelDistance = 'exotic';
  }

  // ========== JOGOS OBSERVADOS ==========
  let matchesObserved = 1;

  if (playerExposure === 'high') {
    matchesObserved = rand(3, 6);
  } else if (playerExposure === 'medium') {
    matchesObserved = rand(2, 4);
  } else if (playerExposure === 'low') {
    matchesObserved = rand(1, 3);
  } else {
    matchesObserved = 1;
  }

  // ========== TEMPO GASTO ==========
  const timeSpent = matchesObserved * rand(3, 7); // Days per match

  // ========== INFORMAÃ‡ÃƒO DISPONÃVEL ==========
  let informationAvailable = 50; // Base

  if (playerExposure === 'high') informationAvailable += 30;
  else if (playerExposure === 'medium') informationAvailable += 15;
  else if (playerExposure === 'low') informationAvailable -= 10;
  else informationAvailable -= 25;

  if (scoutHasRegionExpertise) informationAvailable += 15;
  if (scout.network >= 80) informationAvailable += 10;

  informationAvailable += gaussianRandom(0, 10);
  informationAvailable = clamp(informationAvailable, 20, 95);

  return {
    playerExposure,
    leagueDifficulty,
    travelDistance,
    matchesObserved,
    timeSpent,
    informationAvailable
  };
};

// ==================== CÃLCULO DE PRECISÃƒO ====================

/**
 * Calcula a precisão do scout para este jogador específico
 */
const calculateScoutAccuracy = (
  scout: Scout,
  player: Player,
  context: ScoutingContext
): number => {

  // ========== BASE: QUALIDADE DO SCOUT ==========
  let accuracy = scout.quality;

  // ========== ESPECIALIZAÃ‡ÃƒO ==========
  const positionMap: Record<PositionDetail, Position> = {
    ST: 'Attacker', CF: 'Attacker', LW: 'Attacker', RW: 'Attacker',
    CAM: 'Midfielder', CM: 'Midfielder', CDM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
    CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
    GK: 'Goalkeeper'
  };

  const playerPosition = positionMap[player.position];

  if (scout.positionExpertise.includes(playerPosition)) {
    accuracy += gaussianRandom(10, 3);
  } else if (scout.specialization === 'All-round') {
    accuracy += gaussianRandom(5, 2);
  }

  // Youth specialist with young player
  if (scout.specialization === 'Youth' && player.age <= 21) {
    accuracy += gaussianRandom(12, 4);
  } else if (scout.specialization === 'Senior' && player.age >= 28) {
    accuracy += gaussianRandom(10, 3);
  }

  // ========== EXPERIÃŠNCIA ==========
  const experienceBonus = Math.min(15, scout.experience * 0.8);
  accuracy += experienceBonus;

  // ========== NETWORK ==========
  const networkBonus = (scout.network / 100) * 8;
  accuracy += networkBonus;

  // ========== CONTEXTO ==========
  switch (context.playerExposure) {
    case 'high':
      accuracy += gaussianRandom(15, 4);
      break;
    case 'medium':
      accuracy += gaussianRandom(5, 3);
      break;
    case 'low':
      accuracy -= gaussianRandom(8, 3);
      break;
    case 'hidden':
      accuracy -= gaussianRandom(18, 5);
      break;
  }

  // Múltiplas observações melhoram precisão
  if (context.matchesObserved >= 5) {
    accuracy += gaussianRandom(12, 3);
  } else if (context.matchesObserved >= 3) {
    accuracy += gaussianRandom(8, 2);
  } else if (context.matchesObserved === 1) {
    accuracy -= gaussianRandom(10, 3);
  }

  // Distância de viagem
  switch (context.travelDistance) {
    case 'local':
      accuracy += gaussianRandom(8, 2);
      break;
    case 'regional':
      accuracy += gaussianRandom(3, 2);
      break;
    case 'international':
      accuracy -= gaussianRandom(5, 2);
      break;
    case 'exotic':
      accuracy -= gaussianRandom(12, 4);
      break;
  }

  // Informação disponível
  const infoBonus = (context.informationAvailable - 50) / 5;
  accuracy += infoBonus;

  // ========== RELIABILITY ==========
  const reliabilityFactor = (scout.reliability / 100) * 15;
  accuracy += reliabilityFactor;

  // ========== ALEATORIEDADE FINAL ==========
  accuracy += gaussianRandom(0, 8);

  // ========== EVENTOS RAROS ==========
  // 2% de chance de insight excepcional
  if (Math.random() < 0.02) {
    accuracy += gaussianRandom(25, 8);
  }

  // 3% de chance de erro grave
  if (Math.random() < 0.03) {
    accuracy -= gaussianRandom(25, 8);
  }

  return clamp(accuracy, 25, 98);
};

// ==================== GERAÃ‡ÃƒO DE OBSERVAÃ‡ÃƒO ====================

/**
 * Gera uma observação individual de um scout
 */
const generateScoutObservation = (
  scout: Scout,
  player: Player,
  context: ScoutingContext
): ScoutObservation => {

  const accuracy = calculateScoutAccuracy(scout, player, context);
  const confidence = clamp(accuracy + gaussianRandom(0, 10), 30, 100);

  // ========== STATS VISÃVEIS ==========
  const totalStats = Object.keys(player.stats).length;
  const visibleCount = Math.floor((accuracy / 100) * totalStats);

  const allStats = Object.keys(player.stats).filter(s => s !== 'overall') as (keyof PlayerStats)[];
  const shuffled = [...allStats].sort(() => Math.random() - 0.5);
  const revealed = shuffled.slice(0, visibleCount);
  const hidden = shuffled.slice(visibleCount);

  // Tipagem segura: inicializa objeto e garante indexação adequada sobre chaves de PlayerStats
  const visibleStats: Partial<PlayerStats> = {};
  revealed.forEach((key: keyof PlayerStats) => {
    if (key === 'overall') return;
    const base = player.stats[key];
    // Apenas modifica atributos numéricos; ignora campos string/boolean
    if (typeof base === 'number') {
      const noise = Math.floor(gaussianRandom(0, (100 - accuracy) / 15));
      (visibleStats as any)[key] = clamp(base + noise, 1, 99);
    }
  });

  // ========== POTENCIAL ==========
  const potentialError = Math.floor((100 - accuracy) / 4);
  const potentialRange = {
    min: clamp(player.potential - potentialError, 50, 99),
    max: clamp(player.potential + potentialError, 50, 99)
  };

  // ========== VALOR ==========
  const playerProfile = getPlayerProfile(player);
  const valueError = Math.floor((100 - accuracy) / 8);
  const valueEstimate = {
    min: clamp(playerProfile.trueValue - valueError, 1, 500),
    max: clamp(playerProfile.trueValue + valueError, 1, 500)
  };

  // ========== TRAITS ==========
  let visibleTraits: Trait[] = [];

  if (accuracy >= 80) {
    visibleTraits = [...player.traits];
  } else if (accuracy >= 60) {
    const traitCount = Math.floor(player.traits.length * 0.6);
    visibleTraits = player.traits.slice(0, traitCount);
  } else if (accuracy >= 40) {
    const traitCount = Math.floor(player.traits.length * 0.3);
    visibleTraits = player.traits.slice(0, traitCount);
  }

  // ========== OBSERVAÃ‡Ã•ES ==========
  const observations = generateDetailedObservations(player, scout, accuracy, context);
  const concerns = generateConcerns(player, accuracy);
  const strengths = generateStrengths(player, accuracy);

  // ========== RECOMENDAÃ‡ÃƒO ==========
  let recommendation: ScoutObservation['recommendation'];
  const adjustedPotential = potentialRange.max - (scout.bias === 'pessimistic' ? 3 : scout.bias === 'optimistic' ? -3 : 0);

  if (adjustedPotential >= 90 && player.age < 20) {
    recommendation = 'Must Buy';
  } else if (adjustedPotential >= 87 && player.age < 22) {
    recommendation = 'Great Prospect';
  } else if (adjustedPotential >= 83 && player.age < 25) {
    recommendation = 'Worth Monitoring';
  } else if (adjustedPotential >= 80) {
    recommendation = 'Worth Monitoring';
  } else if (adjustedPotential < 75) {
    recommendation = 'Pass';
  } else {
    recommendation = 'Pass';
  }

  // Ajustar por bias
  const biasValue = scout.bias === 'optimistic' ? rand(5, 15) :
                    scout.bias === 'pessimistic' ? rand(-15, -5) :
                    rand(-3, 3);

  return {
    scoutId: scout.id,
    scoutName: scout.name,
    date: new Date(),
    accuracy,
    confidence,
    visibleStats,
    hiddenStats: hidden,
    potentialRange,
    valueEstimate,
    traits: visibleTraits,
    observations,
    concerns,
    strengths,
    recommendation,
    bias: biasValue
  };
};

// ==================== OBSERVAÃ‡Ã•ES DETALHADAS ====================

const generateDetailedObservations = (
  player: Player,
  scout: Scout,
  accuracy: number,
  context: ScoutingContext
): string[] => {
  const observations: string[] = [];

  // ========== PERFORMANCE RECENTE ==========
  if (accuracy >= 60) {
    if (player.form >= 7) {
      observations.push(`In exceptional form - ${player.form}/15 form rating`);
    } else if (player.form >= 3) {
      observations.push(`In good form - showing consistent performances`);
    } else if (player.form <= -5) {
      observations.push(`Currently struggling with form - ${player.form}/15 rating`);
    }
  }

  // ========== IDADE E DESENVOLVIMENTO ==========
  if (player.age <= 19) {
    observations.push(`Very young player (${player.age}) - significant room for development`);
  } else if (player.age <= 23 && player.potential >= 85) {
    observations.push(`Prime development age (${player.age}) with high ceiling (${player.potential} POT)`);
  } else if (player.age >= 30) {
    observations.push(`Experienced player (${player.age}) - limited long-term value`);
  }

  // ========== PERSONALIDADE ==========
  if (accuracy >= 75) {
    switch (player.personality) {
      case 'Professional':
        observations.push(`âœ“ Model professional - excellent work ethic and attitude`);
        break;
      case 'Ambitious':
        observations.push(`âš  Highly ambitious - may push for moves to bigger clubs`);
        break;
      case 'Lazy':
        observations.push(`âš  WARNING: Work ethic concerns - requires constant motivation`);
        break;
      case 'Temperamental':
        observations.push(`âš  Temperamental personality - can be difficult but talented`);
        break;
      case 'Determined':
        observations.push(`âœ“ Determined mentality - pushes through adversity`);
        break;
      case 'Loyal':
        observations.push(`âœ“ Loyal character - unlikely to agitate for moves`);
        break;
    }
  }

  // ========== ARQUÃ‰TIPO ==========
  if (accuracy >= 70) {
    switch (player.archetype) {
      case 'Generational Talent':
        observations.push(`ðŸŒŸ GENERATIONAL TALENT - Once-in-a-decade player`);
        break;
      case 'Wonderkid':
        observations.push(`â­ Wonderkid status - exceptional young talent`);
        break;
      case 'Technical Maestro':
        observations.push(`ðŸŽ¨ Technical maestro - excellent ball control and vision`);
        break;
      case 'Late Bloomer':
        observations.push(`ðŸ“ˆ Late bloomer - may develop significantly after 23`);
        break;
    }
  }

  // ========== STATS DE CARREIRA ==========
  if (accuracy >= 50 && player.totalMatches >= 50) {
    const gpr = (player.totalGoals / player.totalMatches).toFixed(2);
    const apr = (player.totalAssists / player.totalMatches).toFixed(2);

    if (parseFloat(gpr) >= 0.5) {
      observations.push(`Prolific scorer - ${gpr} goals per game over ${player.totalMatches} matches`);
    }

    if (parseFloat(apr) >= 0.3) {
      observations.push(`Creative playmaker - ${apr} assists per game`);
    }
  }

  // ========== CONTEXTO DE OBSERVAÃ‡ÃƒO ==========
  if (context.matchesObserved >= 5) {
    observations.push(`Extensively scouted - ${context.matchesObserved} matches observed`);
  } else if (context.matchesObserved === 1) {
    observations.push(`âš  Limited observation - only 1 match seen`);
  }

  // ========== EXPOSIÃ‡ÃƒO ==========
  switch (context.playerExposure) {
    case 'high':
      observations.push(`High profile player - well known in the market`);
      break;
    case 'hidden':
      observations.push(`ðŸ’Ž Hidden talent - minimal exposure, potential bargain`);
      break;
  }

  // ========== CHEMISTRY E MORAL ==========
  if (accuracy >= 65) {
    if (player.teamChemistry >= 80) {
      observations.push(`âœ“ Excellent team chemistry (${player.teamChemistry}/100)`);
    } else if (player.teamChemistry <= 40) {
      observations.push(`âš  Poor team chemistry (${player.teamChemistry}/100) - may indicate issues`);
    }

    if (player.morale === 'Very Low') {
      observations.push(`âš  WARNING: Very low morale - significant risk factor`);
    } else if (player.morale === 'Very High') {
      observations.push(`âœ“ High morale - confident and motivated`);
    }
  }

  return observations;
};

const generateConcerns = (player: Player, accuracy: number): string[] => {
  const concerns: string[] = [];

  if (accuracy >= 60) {
    // Injury concerns
    if (player.injury) {
      concerns.push(`Currently injured - ${player.injury.type} injury (${player.injury.duration} weeks)`);
    }

    if (player.traits.some(t => t.name === 'Injury Prone')) {
      concerns.push(`Injury prone trait - high medical risk`);
    }

    // Playing time
    if (player.seasonsWithLowPlayingTime >= 2) {
      concerns.push(`${player.seasonsWithLowPlayingTime} seasons with minimal playing time`);
    }

    // Status concerns
    if (player.squadStatus === 'Surplus') {
      concerns.push(`Surplus to requirements at current club - may indicate declining ability`);
    }

    // Age/contract
    if (player.age >= 32 && player.contractLength <= 1) {
      concerns.push(`Short-term option - age ${player.age} with ${player.contractLength} year(s) left`);
    }

    // Personality red flags
    if (player.personality === 'Lazy' || player.personality === 'Temperamental') {
      concerns.push(`Personality concerns - may require special management`);
    }
  }

  return concerns;
};

const generateStrengths = (player: Player, accuracy: number): string[] => {
  const strengths: string[] = [];

  if (accuracy >= 60) {
    // High overall
    if (player.stats.overall >= 85) {
      strengths.push(`Elite ability - ${player.stats.overall} overall rating`);
    }

    // Traits positivos
    if (player.traits.some(t => t.name === 'Clinical Finisher')) {
      strengths.push(`Clinical finisher - excellent conversion rate`);
    }

    if (player.traits.some(t => t.name === 'Leadership')) {
      strengths.push(`Natural leader - strong presence in dressing room`);
    }

    if (player.traits.some(t => t.name === 'Big Game Player')) {
      strengths.push(`Big game player - performs in crucial moments`);
    }

    // Versatilidade
    if (player.traits.some(t => t.name === 'Versatile')) {
      strengths.push(`Versatile player - can play multiple positions`);
    }

    // Experiência
    if (player.totalMatches >= 300) {
      strengths.push(`Vastly experienced - ${player.totalMatches} career matches`);
    }

    // Troféus
    const totalTrophies = player.trophies.league + player.trophies.cup + player.trophies.continentalCup;
    if (totalTrophies >= 5) {
      strengths.push(`Trophy winner - ${totalTrophies} major honours`);
    }

    // Prêmios
    if (player.awards.worldPlayerAward >= 1) {
      strengths.push(`ðŸ† Ballon d'Or winner - world-class talent`);
    }
  }

  return strengths;
};

// ==================== CONSENSO DE MÃšLTIPLOS SCOUTS ====================

/**
 * Combina observações de múltiplos scouts
 */
const buildConsensus = (observations: ScoutObservation[]): ScoutReport['consensus'] => {
  if (observations.length === 1) {
    return {
      confidence: observations[0].confidence >= 85 ? 'Very High' :
                  observations[0].confidence >= 70 ? 'High' :
                  observations[0].confidence >= 55 ? 'Medium' :
                  observations[0].confidence >= 40 ? 'Low' : 'Very Low',
      agreement: 100,
      averageAccuracy: observations[0].accuracy,
      divergence: []
    };
  }

  const avgAccuracy = observations.reduce((sum, o) => sum + o.accuracy, 0) / observations.length;
  const avgConfidence = observations.reduce((sum, o) => sum + o.confidence, 0) / observations.length;

  // Calcular divergência
  const recommendations = observations.map(o => o.recommendation);
  const uniqueRecommendations = [...new Set(recommendations)];
  const agreement = (recommendations.filter(r => r === recommendations[0]).length / observations.length) * 100;

  const divergence: string[] = [];

  if (uniqueRecommendations.length > 1) {
    divergence.push(`Scouts disagree on recommendation: ${uniqueRecommendations.join(' vs ')}`);
  }

  // Verificar divergência em potencial
  const potentials = observations.map(o => (o.potentialRange.min + o.potentialRange.max) / 2);
  const potentialStdDev = Math.sqrt(
    potentials.reduce((sum, p) => sum + Math.pow(p - (potentials.reduce((a, b) => a + b, 0) / potentials.length), 2), 0) / potentials.length
  );

  if (potentialStdDev > 5) {
    divergence.push(`Significant disagreement on potential (Ïƒ=${potentialStdDev.toFixed(1)})`);
  }

  let confidenceLevel: ScoutReport['consensus']['confidence'];
  if (avgConfidence >= 85 && agreement >= 80) confidenceLevel = 'Very High';
  else if (avgConfidence >= 70 && agreement >= 65) confidenceLevel = 'High';
  else if (avgConfidence >= 55 && agreement >= 50) confidenceLevel = 'Medium';
  else if (avgConfidence >= 40) confidenceLevel = 'Low';
  else confidenceLevel = 'Very Low';

  return {
    confidence: confidenceLevel,
    agreement,
    averageAccuracy: avgAccuracy,
    divergence
  };
};

// ==================== FLAGS ESPECIAIS ====================

/**
 * Detecta situações especiais
 */
const detectSpecialFlags = (
  player: Player,
  observations: ScoutObservation[],
  context: ScoutingContext
): ScoutReport['specialFlags'] => {

  const avgAccuracy = observations.reduce((sum, o) => sum + o.accuracy, 0) / observations.length;

  // ========== HIDDEN GEM ==========
  const hiddenGem =
    context.playerExposure === 'hidden' &&
    player.potential >= 85 &&
    player.age <= 20 &&
    avgAccuracy >= 70;

  // ========== OVERRATED ==========
  const overrated =
    player.stats.overall >= 80 &&
    (player.stats.overall - player.potential) >= 5 &&
    player.form <= -3;

  // ========== SLEEPER ==========
  const sleeper =
    player.archetype === 'Late Bloomer' &&
    player.age >= 23 &&
    player.potential >= 82 &&
    context.playerExposure === 'low';

  // ========== RISKY ==========
  const risky =
    (player.personality === 'Temperamental' || player.personality === 'Lazy') ||
    (player.traits.some(t => t.name === 'Injury Prone')) ||
    (player.seasonsWithLowPlayingTime >= 2);

  // ========== EXCEPTIONAL ==========
  const exceptional =
    player.potential >= 92 ||
    player.archetype === 'Generational Talent' ||
    observations.some(o => o.recommendation === 'Must Buy' && o.confidence >= 85);

  return {
    hiddenGem,
    overrated,
    sleeper,
    risky,
    exceptional
  };
};

// ==================== AVALIAÃ‡ÃƒO DE RISCO ====================

/**
 * Avalia riscos de contratação
 */
const assessRisks = (player: Player, accuracy: number): ScoutReport['riskAssessment'] => {

  // ========== INJURY RISK ==========
  let injuryRisk: 'High' | 'Medium' | 'Low' = 'Low';

  if (player.traits.some(t => t.name === 'Injury Prone')) {
    injuryRisk = 'High';
  } else if (player.injury) {
    injuryRisk = player.injury.type === 'Severe' ? 'High' : 'Medium';
  } else if (player.totalInjuries && player.totalInjuries >= 5) {
    injuryRisk = 'Medium';
  }

  // ========== ADAPTATION RISK ==========
  let adaptationRisk: 'High' | 'Medium' | 'Low' = 'Medium';

  if (player.age <= 21) {
    adaptationRisk = 'Medium'; // Jovens adaptam mais fácil, mas podem falhar
  } else if (player.age >= 30) {
    adaptationRisk = 'High'; // Mais difícil de adaptar quando velho
  } else if (player.teamChemistry >= 70) {
    adaptationRisk = 'Low'; // Boa química indica adaptabilidade
  } else if (player.personality === 'Professional' || player.personality === 'Determined') {
    adaptationRisk = 'Low';
  } else if (player.personality === 'Temperamental' || player.personality === 'Lazy') {
    adaptationRisk = 'High';
  }

  // ========== ATTITUDE RISK ==========
  let attitudeRisk: 'High' | 'Medium' | 'Low' = 'Low';

  if (player.personality === 'Lazy' || player.personality === 'Temperamental') {
    attitudeRisk = 'High';
  } else if (player.personality === 'Ambitious' && player.team.leagueTier >= 3) {
    attitudeRisk = 'Medium'; // Pode querer sair rápido
  } else if (player.morale === 'Very Low') {
    attitudeRisk = 'High';
  } else if (player.personality === 'Professional' || player.personality === 'Loyal') {
    attitudeRisk = 'Low';
  }

  // ========== POTENTIAL RISK ==========
  let potentialRisk: 'High' | 'Medium' | 'Low' = 'Low';

  const potentialGap = player.potential - player.stats.overall;

  if (potentialGap <= 2) {
    potentialRisk = 'High'; // Quase no limite
  } else if (potentialGap <= 5) {
    potentialRisk = 'Medium';
  } else if (player.age >= 28 && potentialGap >= 3) {
    potentialRisk = 'High'; // Difícil melhorar aos 28+
  } else if (accuracy < 60) {
    potentialRisk = 'Medium'; // Incerteza alta
  }

  return {
    injury: injuryRisk,
    adaptation: adaptationRisk,
    attitude: attitudeRisk,
    potential: potentialRisk
  };
};

// ==================== FUNÃ‡ÃƒO PRINCIPAL ====================

/**
 * Gera relatório de scouting completo
 */
export const generateScoutReport = (
  player: Player,
  scoutQuality: number = 75, // 0-100
  numScouts: number = 1, // Quantos scouts enviar
  availableScouts: Scout[] = SCOUT_POOL
): ScoutReport => {

  // Selecionar scouts apropriados
  const selectedScouts = selectBestScouts(player, availableScouts, numScouts);

  // Analisar contexto
  const context = analyzeScoutingContext(player, selectedScouts[0]);

  // Gerar observações de cada scout
  const observations = selectedScouts.map(scout =>
    generateScoutObservation(scout, player, context)
  );

  // Construir consenso
  const consensus = buildConsensus(observations);

  // Combinar stats visíveis (união de todas as observações)
  const allVisibleStats: Partial<PlayerStats> = {};
  const allHiddenStats = new Set<keyof PlayerStats>();

  observations.forEach(obs => {
    Object.assign(allVisibleStats, obs.visibleStats);
    obs.hiddenStats.forEach(stat => allHiddenStats.add(stat));
  });

  // Remover stats que foram reveladas
  Object.keys(allVisibleStats).forEach(key => {
    allHiddenStats.delete(key as keyof PlayerStats);
  });

  // Combinar potencial (usar média ponderada pela accuracy)
  const totalAccuracy = observations.reduce((sum, o) => sum + o.accuracy, 0);
  const weightedPotentialMin = observations.reduce((sum, o) =>
    sum + (o.potentialRange.min * o.accuracy), 0
  ) / totalAccuracy;
  const weightedPotentialMax = observations.reduce((sum, o) =>
    sum + (o.potentialRange.max * o.accuracy), 0
  ) / totalAccuracy;

  const potentialRange = {
    min: Math.round(weightedPotentialMin),
    max: Math.round(weightedPotentialMax)
  };

  // Combinar traits (união)
  const allTraits = new Set<Trait>();
  observations.forEach(obs => {
    obs.traits.forEach(trait => allTraits.add(trait));
  });

  // Valor estimado (média ponderada)
  const weightedValueMin = observations.reduce((sum, o) =>
    sum + (o.valueEstimate.min * o.accuracy), 0
  ) / totalAccuracy;
  const weightedValueMax = observations.reduce((sum, o) =>
    sum + (o.valueEstimate.max * o.accuracy), 0
  ) / totalAccuracy;

  const valueEstimate = {
    min: Math.round(weightedValueMin),
    max: Math.round(weightedValueMax)
  };

  // Recomendação final (baseada em consenso)
  const recommendations = observations.map(o => o.recommendation);
  const recommendationCounts = recommendations.reduce((acc, r) => {
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recommendation = Object.entries(recommendationCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as ScoutReport['recommendation'];

  // Risk assessment
  const riskAssessment = assessRisks(player, consensus.averageAccuracy);

  // Special flags
  const specialFlags = detectSpecialFlags(player, observations, context);

  // Notas consolidadas
  const primaryObs = observations[0];
  let scoutNotes = primaryObs.observations.join(' ');

  if (primaryObs.strengths.length > 0) {
    scoutNotes += `
Strengths: ${primaryObs.strengths.join('; ')}`;
  }

  if (primaryObs.concerns.length > 0) {
    scoutNotes += `
Concerns: ${primaryObs.concerns.join('; ')}`;
  }

  if (consensus.divergence.length > 0) {
    scoutNotes += `
âš  Divergence: ${consensus.divergence.join('; ')}`;
  }

  // Adicionar flags especiais
  const flags: string[] = [];
  if (specialFlags.hiddenGem) flags.push('ðŸ’Ž HIDDEN GEM');
  if (specialFlags.exceptional) flags.push('â­ EXCEPTIONAL TALENT');
  if (specialFlags.sleeper) flags.push('ðŸ“ˆ SLEEPER PICK');
  if (specialFlags.overrated) flags.push('âš  POTENTIALLY OVERRATED');
  if (specialFlags.risky) flags.push('âš  HIGH RISK');

  if (flags.length > 0) {
    scoutNotes = `${flags.join(' | ')}
${scoutNotes}`;
  }

  return {
    player,
    primaryObservation: primaryObs,
    additionalObservations: observations.slice(1),
    consensus,
    context,
    visibleStats: allVisibleStats,
    hiddenStats: Array.from(allHiddenStats),
    potentialRange,
    traits: Array.from(allTraits),
    recommendation,
    scoutNotes,
    valueEstimate,
    riskAssessment,
    specialFlags
  };
};

// ==================== FUNÃ‡Ã•ES AUXILIARES ====================

/**
 * Seleciona os melhores scouts para o jogador
 */
const selectBestScouts = (player: Player, availableScouts: Scout[], numScouts: number): Scout[] => {
  const scored = availableScouts.map(scout => {
    let score = scout.quality;

    // Bonus por especialização
    const positionMap: Record<PositionDetail, Position> = {
      ST: 'Attacker', CF: 'Attacker', LW: 'Attacker', RW: 'Attacker',
      CAM: 'Midfielder', CM: 'Midfielder', CDM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
      CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
      GK: 'Goalkeeper'
    };

    const playerPosition = positionMap[player.position];

    if (scout.positionExpertise.includes(playerPosition)) {
      score += 15;
    }

    if (scout.specialization === 'Youth' && player.age <= 21) {
      score += 20;
    }

    if (scout.regionExpertise.includes(player.nationality)) {
      score += 10;
    }

    return { scout, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, numScouts)
    .map(s => s.scout);
};

/**
 * Para debug - imprime relatório detalhado (função desabilitada em produção)
 */
export const printScoutReport = (report: ScoutReport): void => {
  // Debug logging disabled for production
};
