import { Player, Team, Offer, SquadStatus, TransferOffer, LoanOffer, TraitName, PlayerStats } from '../types';
import { LEAGUES, RIVALRIES } from '../constants';
import { getDivisionWageFactor } from './playerProfileLogic';

// ============================================
// SISTEMA DE TRANSFERÃŠNCIAS PROBABILÃSTICO V3
// Implementação com elipses probabilísticas e matrizes de correlação
// ============================================

export interface ClubProfile {
  tier: 'Elite' | 'Major' | 'Standard' | 'Lower' | 'Minor';
  financialPower: number;
  attractiveness: number;
  developmentIndex: number;
  ambitionLevel: number;
  transferActivity: number;
  playingStyle: 'Possession' | 'Counter' | 'Direct' | 'Balanced' | 'Defensive';
  wageBudget: number;
  maxPlayerOverall: number;
}

export interface PlayerProfile {
  marketTier: 'World Class' | 'Elite' | 'Leading' | 'Regular' | 'Promising' | 'Developing' | 'Fringe';
  trueValue: number;
  desirability: number;
  transferProbability: number;
  idealClubTiers: ClubProfile['tier'][];
  negotiationDifficulty: number;
  tacticalFit: number;
  wageExpectations: number;
}

export interface TransferFit {
  overallScore: number;
  statusFit: number;
  financialFit: number;
  culturalFit: number;
  tacticalFit: number;
  careerFit: number;
  wageFit: number;
}

// ==================== SISTEMA PROBABILÃSTICO ====================

/**
 * Gera número usando distribuição normal (Box-Muller transform)
 */
const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};

/**
 * Gera valor usando elipse probabilística bivariada
 */
const bivariateSample = (
  mean1: number,
  mean2: number,
  stdDev1: number,
  stdDev2: number,
  correlation: number
): [number, number] => {
  const z1 = gaussianRandom(0, 1);
  const z2 = gaussianRandom(0, 1);

  const x = mean1 + stdDev1 * z1;
  const y = mean2 + stdDev2 * (correlation * z1 + Math.sqrt(1 - correlation ** 2) * z2);

  return [x, y];
};

/**
 * Sistema de incerteza em camadas
 */
const uncertaintyLayer = (baseValue: number, uncertainty: number = 0.2): number => {
  const actualUncertainty = Math.abs(gaussianRandom(uncertainty, uncertainty * 0.3));
  let value = baseValue;

  value *= 1 + gaussianRandom(0, actualUncertainty);

  if (Math.random() < 0.15) {
    value *= 1 + gaussianRandom(0, actualUncertainty * 1.5);
  }

  if (Math.random() < 0.02) {
    value *= Math.random() < 0.5 ? randFloat(1.5, 2.5) : randFloat(0.3, 0.6);
  }

  return value;
};

// ==================== FUNÃ‡Ã•ES AUXILIARES ====================

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// ============================================
// 1. PERFIS DE CLUBES COM PROBABILIDADE
// ============================================

export const getClubProfile = (team: Team): ClubProfile => {
  const { reputation, leagueTier } = team;

  // ===== TIER (com incerteza) =====
  const tierThresholds = {
    'Elite': [90, 1],
    'Major': [84, 2],
    'Standard': [77, 3],
    'Lower': [70, 5],
    'Minor': [0, 5]
  };

  let tier: ClubProfile['tier'] = 'Minor';
  const repNoise = gaussianRandom(0, 1.5);
  const adjustedRep = reputation + repNoise;

  for (const [t, [minRep, maxTier]] of Object.entries(tierThresholds)) {
    if (adjustedRep >= minRep && leagueTier <= maxTier) {
      tier = t as ClubProfile['tier'];
      break;
    }
  }

  // ===== PODER FINANCEIRO (curva exponencial probabilística) =====
  const basePowerMean = Math.pow((reputation - 60) / 40, 2.2) * 100;
  const basePowerStdDev = basePowerMean * 0.15;
  const basePower = Math.abs(gaussianRandom(basePowerMean, basePowerStdDev));

  const tierBonus = gaussianRandom((6 - leagueTier) * 12, 4);
  const financialPower = clamp(basePower + tierBonus, 8, 100);

  // ===== ATRATIVIDADE (com correlação ao poder financeiro) =====
  const historyBonus = reputation > 88 ? gaussianRandom(18, 3) :
                       reputation > 83 ? gaussianRandom(12, 2) :
                       reputation > 78 ? gaussianRandom(8, 1.5) :
                       gaussianRandom(5, 1);

  const leagueBonus = leagueTier === 1 ? gaussianRandom(25, 4) :
                      leagueTier === 2 ? gaussianRandom(15, 3) :
                      leagueTier === 3 ? gaussianRandom(8, 2) : 0;

  // Elipse bivariada entre poder financeiro e atratividade (correlação 0.7)
  const [attractBase, _] = bivariateSample(
    (reputation - 60) + historyBonus + leagueBonus,
    financialPower,
    12, 8, 0.7
  );

  const attractiveness = clamp(attractBase, 15, 100);

  // ===== ÃNDICE DE DESENVOLVIMENTO =====
  const developmentClubs = [
    'Ajax', 'Benfica', 'Porto', 'Sporting CP', 'Borussia Dortmund',
    'RB Salzburg', 'Monaco', 'Lyon', 'Athletic Bilbao', 'Real Sociedad',
    'Santos', 'São Paulo', 'Flamengo', 'River Plate', 'Boca Juniors'
  ];

  const isDevelopmentClub = developmentClubs.includes(team.name);

  let developmentIndex: number;
  if (isDevelopmentClub) {
    developmentIndex = clamp(
      Math.abs(gaussianRandom(90, 8)),
      80, 100
    );
  } else {
    const devMean = 35 + (reputation - 70) * 1.8;
    const devStdDev = 10;
    developmentIndex = clamp(
      gaussianRandom(devMean, devStdDev),
      15, 88
    );
  }

  // ===== NÃVEL DE AMBIÃ‡ÃƒO (com incerteza meta-probabilística) =====
  const ambitionMean = reputation - 15;
  const ambitionStdDev = uncertaintyLayer(10, 0.3);
  const ambitionLevel = clamp(
    gaussianRandom(ambitionMean, ambitionStdDev),
    25, 98
  );

  // ===== ATIVIDADE DE TRANSFERÃŠNCIAS (correlacionada com ambição) =====
  const [transferAct, _2] = bivariateSample(
    financialPower * 0.65 + ambitionLevel * 0.35,
    ambitionLevel,
    12, 10, 0.6
  );

  const transferActivity = clamp(transferAct, 18, 96);

  // ===== ESTILO DE JOGO (probabilístico) =====
  const styleRoll = Math.random();
  let playingStyle: ClubProfile['playingStyle'];

  if (reputation >= 85) {
    // Top clubs - distribuição enviesada para Possession
    const probs = [0.4, 0.7, 0.9, 1.0]; // Possession, Balanced, Counter, Direct
    if (styleRoll < probs[0]) playingStyle = 'Possession';
    else if (styleRoll < probs[1]) playingStyle = 'Balanced';
    else if (styleRoll < probs[2]) playingStyle = 'Counter';
    else playingStyle = 'Direct';
  } else if (reputation >= 75) {
    const probs = [0.3, 0.6, 0.8, 1.0];
    if (styleRoll < probs[0]) playingStyle = 'Balanced';
    else if (styleRoll < probs[1]) playingStyle = 'Counter';
    else if (styleRoll < probs[2]) playingStyle = 'Direct';
    else playingStyle = 'Possession';
  } else {
    const probs = [0.4, 0.7, 1.0];
    if (styleRoll < probs[0]) playingStyle = 'Direct';
    else if (styleRoll < probs[1]) playingStyle = 'Counter';
    else playingStyle = 'Balanced';
  }

  // ===== ORÃ‡AMENTO SALARIAL (com ruído) =====
  const wageBudgetMean = financialPower * (leagueTier === 1 ? 2.8 : leagueTier === 2 ? 1.8 : 1.2);
  const wageBudgetStdDev = wageBudgetMean * 0.2;
  const wageBudget = Math.round(Math.abs(gaussianRandom(wageBudgetMean, wageBudgetStdDev)));

  // ===== MAX OVERALL (com distribuição) =====
  let maxOverallMean = 90;

  if (reputation >= 95) maxOverallMean = 98;
  else if (reputation >= 90) maxOverallMean = 95;
  else if (reputation >= 85) maxOverallMean = 92;
  else if (reputation >= 80) maxOverallMean = 89;
  else if (reputation >= 75) maxOverallMean = 85;
  else if (reputation >= 70) maxOverallMean = 82;
  else if (reputation >= 65) maxOverallMean = 79;
  else if (reputation >= 60) maxOverallMean = 75;

  maxOverallMean -= (leagueTier - 1) * 5;

  const maxOverall = Math.max(65, Math.round(gaussianRandom(maxOverallMean, 2)));

  return {
    tier,
    financialPower,
    attractiveness,
    developmentIndex,
    ambitionLevel,
    transferActivity,
    playingStyle,
    wageBudget,
    maxPlayerOverall: maxOverall
  };
};

// ============================================
// 2. PERFIS DE JOGADORES COM PROBABILIDADE
// ============================================

export const getPlayerProfile = (player: Player, isDesperate: boolean = false): PlayerProfile => {
  const { age, stats, potential, reputation, personality, traits, contractLength,
          yearsAtClub, morale, form, team, hasMadeSeniorDebut, agent } = player;

  // ===== MARKET TIER (com fuzzy boundaries) =====
  const effectiveRepMean = reputation + (potential - stats.overall) * 0.35;
  const effectiveRep = gaussianRandom(effectiveRepMean, 2);

  let marketTier: PlayerProfile['marketTier'];
  if (effectiveRep >= 95 || stats.overall >= 92) marketTier = 'World Class';
  else if (effectiveRep >= 89 || stats.overall >= 88) marketTier = 'Elite';
  else if (effectiveRep >= 83 || stats.overall >= 84) marketTier = 'Leading';
  else if (effectiveRep >= 77 || stats.overall >= 80) marketTier = 'Regular';
  else if (age <= 23 && potential >= 86) marketTier = 'Promising';
  else if (age <= 21 && potential >= 81) marketTier = 'Developing';
  else marketTier = 'Fringe';

  // ===== TRUE VALUE (com múltiplas camadas de incerteza) =====
  const baseValueMean = Math.pow(stats.overall / 35, 4.5) * 1.8;
  const baseValueStdDev = baseValueMean * 0.18;
  let trueValue = Math.abs(gaussianRandom(baseValueMean, baseValueStdDev));

  // Idade (curva complexa com ruído)
  let ageMultiplier = 1.0;
  if (age <= 17) {
    ageMultiplier = gaussianRandom(0.35 + (age - 14) * 0.18, 0.08);
  } else if (age <= 20) {
    ageMultiplier = gaussianRandom(0.9 + (20 - age) * 0.12, 0.12);
  } else if (age <= 22) {
    ageMultiplier = gaussianRandom(1.4 + (22 - age) * 0.15, 0.15);
  } else if (age <= 25) {
    ageMultiplier = gaussianRandom(1.8 + (25 - age) * 0.08, 0.12);
  } else if (age <= 27) {
    ageMultiplier = gaussianRandom(2.0, 0.15);
  } else if (age <= 29) {
    ageMultiplier = gaussianRandom(1.7 - (age - 27) * 0.12, 0.12);
  } else if (age <= 32) {
    ageMultiplier = gaussianRandom(1.4 - (age - 29) * 0.18, 0.10);
  } else {
    ageMultiplier = gaussianRandom(0.8 - (age - 32) * 0.12, 0.08);
  }
  ageMultiplier = Math.max(ageMultiplier, 0.12);

  trueValue *= ageMultiplier;

  // Potencial (com elipse bivariada idade-potencial)
  if (age < 26) {
    const potentialGap = potential - stats.overall;
    const ageFactor = Math.max(0.1, (26 - age) / 10);

    const [potBonus, _] = bivariateSample(
      Math.pow(Math.max(0, potentialGap), 1.4) * ageFactor * 0.15,
      ageFactor * 0.2,
      0.05, 0.03, 0.7
    );

    trueValue *= (1 + Math.max(0, potBonus));
  }

  // Forma (com incerteza)
  const formImpact = form > 0 ?
    gaussianRandom(Math.pow(form / 5, 0.8) * 0.18, 0.04) :
    gaussianRandom(Math.pow(Math.abs(form) / 5, 1.0) * -0.25, 0.05);
  trueValue *= (1 + formImpact);

  // Contrato (probabilístico)
  let contractMultiplier: number;
  switch(contractLength) {
    case 0: contractMultiplier = gaussianRandom(0.25, 0.05); break;
    case 1: contractMultiplier = gaussianRandom(0.60, 0.08); break;
    case 2: contractMultiplier = gaussianRandom(0.88, 0.06); break;
    default: contractMultiplier = gaussianRandom(1.0 + (contractLength - 2) * 0.06, 0.04); break;
  }
  trueValue *= Math.max(0.15, contractMultiplier);

  // Posição (com ruído)
  const positionMultipliers: Record<string, [number, number]> = {
    'ST': [1.28, 0.08], 'CF': [1.22, 0.07], 'LW': [1.20, 0.07], 'RW': [1.20, 0.07],
    'CAM': [1.15, 0.06], 'CM': [1.08, 0.05], 'LM': [1.10, 0.05], 'RM': [1.10, 0.05],
    'CDM': [1.00, 0.05], 'LB': [0.96, 0.04], 'RB': [0.96, 0.04], 'LWB': [1.00, 0.05], 'RWB': [1.00, 0.05],
    'CB': [0.94, 0.04], 'GK': [0.86, 0.05]
  };

  const [posMult, posStd] = positionMultipliers[player.position] || [1.0, 0.05];
  trueValue *= gaussianRandom(posMult, posStd);

  // Liga (com variação)
  const leagueMultipliers: [number, number][] = [
    [1.40, 0.10], [1.20, 0.08], [1.05, 0.06], [0.88, 0.05], [0.72, 0.04]
  ];
  const [leagueMult, leagueStd] = leagueMultipliers[team.leagueTier - 1] || [0.58, 0.04];
  trueValue *= gaussianRandom(leagueMult, leagueStd);

  // Nacionalidade (probabilístico)
  const nationalityBonus = reputation >= 87 ? gaussianRandom(1.12, 0.04) :
                           reputation >= 83 ? gaussianRandom(1.08, 0.03) :
                           1.0;
  trueValue *= nationalityBonus;

  // Traits (com bonus variável)
  const hasMarketableTraits = traits.some(t =>
    ['Clinical Finisher', 'Leadership', 'Flair Player', 'Big Game Player', 'Set-piece Specialist'].includes(t.name)
  );
  if (hasMarketableTraits) {
    trueValue *= gaussianRandom(1.15, 0.04);
  }

  // Lesão (com severidade probabilística)
  if (player.injury) {
    const injuryPenalty = player.injury.type === 'Severe' ? gaussianRandom(0.40, 0.08) :
                          player.injury.type === 'Moderate' ? gaussianRandom(0.68, 0.06) :
                          gaussianRandom(0.85, 0.04);
    trueValue *= Math.max(0.2, injuryPenalty);
  }

  // Aplicar camada final de incerteza
  trueValue = uncertaintyLayer(trueValue, 0.12);
  trueValue = clamp(Math.round(trueValue), 1, 500);

  // ===== DESEJABILIDADE (com correlações) =====
  let desirability = gaussianRandom(45, 5);

  desirability += gaussianRandom(form * 7, 2);

  const growthPotential = age < 26 ? (potential - stats.overall) * 2.5 : 0;
  desirability += gaussianRandom(growthPotential, growthPotential * 0.2);

  if (age >= 22 && age <= 28) desirability += gaussianRandom(18, 3);
  else if (age >= 20 && age <= 30) desirability += gaussianRandom(10, 2);
  else if (age < 20 && potential > 86) desirability += gaussianRandom(12, 2);
  else if (age > 30) desirability -= (age - 30) * gaussianRandom(4, 0.8);

  const personalityImpact: Record<string, [number, number]> = {
    'Professional': [15, 2], 'Ambitious': [10, 1.5], 'Determined': [12, 2],
    'Loyal': [-8, 1.5], 'Temperamental': [-12, 2], 'Lazy': [-18, 3]
  };

  if (personality in personalityImpact) {
    const [impact, std] = personalityImpact[personality];
    desirability += gaussianRandom(impact, std);
  }

  const agentBonus = agent.reputation === 'Super Agent' ? gaussianRandom(18, 3) :
                     agent.reputation === 'Good' ? gaussianRandom(10, 2) :
                     agent.reputation === 'Average' ? gaussianRandom(4, 1) : 0;
  desirability += agentBonus;

  desirability = clamp(desirability, 8, 100);

  // ===== PROBABILIDADE DE TRANSFERÃŠNCIA (não-determinística) =====
  let transferProbability = gaussianRandom(18, 5);

  if (isDesperate) {
    transferProbability = gaussianRandom(97, 2);
  } else {
    if (contractLength === 0) transferProbability += gaussianRandom(45, 8);
    else if (contractLength === 1) transferProbability += gaussianRandom(28, 6);

    const moraleIndex = ['Very Low', 'Low', 'Normal', 'High', 'Very High'].indexOf(morale);
    if (moraleIndex < 2) transferProbability += gaussianRandom(35, 7);

    if (player.seasonsWithLowPlayingTime >= 2) transferProbability += gaussianRandom(40, 8);
    else if (player.seasonsWithLowPlayingTime === 1) transferProbability += gaussianRandom(18, 4);

    if (player.squadStatus === 'Surplus') transferProbability += gaussianRandom(28, 5);
    else if (player.squadStatus === 'Reserve' && age > 22) transferProbability += gaussianRandom(18, 4);

    if (personality === 'Ambitious' && team.leagueTier > 2) transferProbability += gaussianRandom(25, 5);

    if (yearsAtClub > 5 && personality !== 'Ambitious') transferProbability -= gaussianRandom(18, 3);
    if (yearsAtClub > 8) transferProbability -= gaussianRandom(12, 2);
  }

  transferProbability = uncertaintyLayer(transferProbability, 0.15);
  transferProbability = clamp(transferProbability, 3, 98);

  // ===== TIERS IDEAIS =====
  const idealClubTiers: ClubProfile['tier'][] = [];

  switch(marketTier) {
    case 'World Class':
      idealClubTiers.push('Elite');
      if (age > 30) idealClubTiers.push('Major');
      break;
    case 'Elite':
      idealClubTiers.push('Elite', 'Major');
      break;
    case 'Leading':
      idealClubTiers.push('Major', 'Standard');
      if (age < 24) idealClubTiers.push('Elite');
      break;
    case 'Regular':
      idealClubTiers.push('Standard', 'Major');
      if (isDesperate) idealClubTiers.push('Lower');
      break;
    case 'Promising':
      idealClubTiers.push('Elite', 'Major', 'Standard');
      break;
    case 'Developing':
      idealClubTiers.push('Major', 'Standard', 'Lower');
      break;
    case 'Fringe':
      idealClubTiers.push('Standard', 'Lower', 'Minor');
      break;
  }

  // ===== DIFICULDADE DE NEGOCIAÃ‡ÃƒO (com ruído) =====
  let negotiationDifficulty = gaussianRandom(48, 8);

  negotiationDifficulty += gaussianRandom(agentBonus * 1.8, 4);

  if (personality === 'Ambitious') negotiationDifficulty += gaussianRandom(18, 3);
  if (personality === 'Temperamental') negotiationDifficulty += gaussianRandom(12, 2);
  if (personality === 'Loyal') negotiationDifficulty -= gaussianRandom(12, 2);

  if (contractLength <= 1) negotiationDifficulty -= gaussianRandom(25, 5);
  if (contractLength >= 4) negotiationDifficulty += gaussianRandom(18, 3);

  if (player.squadStatus === 'Key Player') negotiationDifficulty += gaussianRandom(25, 5);
  else if (player.squadStatus === 'Surplus') negotiationDifficulty -= gaussianRandom(18, 3);

  negotiationDifficulty = clamp(negotiationDifficulty, 12, 96);

  // ===== FIT TÃTICO =====
  const tacticalFit = calculateTacticalFit(player, team);

  // ===== EXPECTATIVAS SALARIAIS (com elipse bivariada) =====
  const baseWageExpMean = player.wage * (1 + (desirability - 50) / 200);
  const baseWageExpStd = baseWageExpMean * 0.15;

  let wageExpectations = Math.abs(gaussianRandom(baseWageExpMean, baseWageExpStd));

  if (contractLength > 3) wageExpectations *= gaussianRandom(0.95, 0.03);
  else if (contractLength === 1) wageExpectations *= gaussianRandom(1.05, 0.03);

  if (player.squadStatus === 'Key Player') wageExpectations *= gaussianRandom(1.15, 0.04);

  if (age < 23) wageExpectations *= gaussianRandom(1.2, 0.05);
  else if (age > 30) wageExpectations *= gaussianRandom(0.8, 0.04);

  const positionWageBonus: Record<string, [number, number]> = {
    'ST': [1.1, 0.03], 'CF': [1.05, 0.03], 'LW': [1.05, 0.03], 'RW': [1.05, 0.03],
    'CAM': [1.0, 0.02], 'CM': [0.95, 0.02], 'LM': [0.95, 0.02], 'RM': [0.95, 0.02],
    'CDM': [0.9, 0.02], 'LB': [0.9, 0.02], 'RB': [0.9, 0.02], 'LWB': [0.9, 0.02], 'RWB': [0.9, 0.02],
    'CB': [0.85, 0.02], 'GK': [0.8, 0.02]
  };

  const [posWage, posWageStd] = positionWageBonus[player.position] || [1.0, 0.02];
  wageExpectations *= gaussianRandom(posWage, posWageStd);

  wageExpectations = clamp(Math.round(wageExpectations), 1, 850);

  return {
    marketTier,
    trueValue,
    desirability,
    transferProbability,
    idealClubTiers,
    negotiationDifficulty,
    tacticalFit,
    wageExpectations
  };
};

// ============================================
// 3. CÃLCULO DE FIT TÃTICO PROBABILÃSTICO
// ============================================

const calculateTacticalFit = (player: Player, team: Team): number => {
  const clubProfile = getClubProfile(team);
  const clubStyle = clubProfile.playingStyle;

  const styleAttributes: Record<string, (keyof PlayerStats)[]> = {
    'Possession': ['passing', 'vision', 'dribbling', 'composure', 'flair'],
    'Counter': ['pace', 'shooting', 'positioning', 'composure', 'aggression'],
    'Direct': ['physical', 'strength', 'jumping', 'crossing', 'longShots'],
    'Balanced': ['passing', 'shooting', 'physical', 'composure', 'workRate'],
    'Defensive': ['defending', 'positioning', 'interceptions', 'aggression', 'stamina']
  };

  if (!styleAttributes[clubStyle]) return 45;

  const relevantAttributes = styleAttributes[clubStyle];

  const playerAvg = relevantAttributes.reduce((sum, attr) => {
    const value = player.stats[attr];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0) / relevantAttributes.length;

  const positionBonus = gaussianRandom(getPositionStyleBonus(player.position, clubStyle), 2);
  const traitBonus = gaussianRandom(getTraitStyleBonus(player.traits, clubStyle), 1.5);

  let ageFactor = 1.0;
  if (player.age < 22) ageFactor = gaussianRandom(1.1, 0.05);
  else if (player.age > 28) ageFactor = gaussianRandom(0.9, 0.04);

  const baseFit = (playerAvg / 100) * 80;
  const totalFit = uncertaintyLayer(baseFit + positionBonus + traitBonus, 0.12);

  return clamp(totalFit * ageFactor, 10, 100);
};

const getPositionStyleBonus = (position: string, style: ClubProfile['playingStyle']): number => {
  const bonuses: Record<string, Record<string, number>> = {
    'Possession': { 'CAM': 15, 'CM': 12, 'CDM': 8, 'CB': -5 },
    'Counter': { 'ST': 12, 'LW': 15, 'RW': 15, 'CAM': 8 },
    'Direct': { 'ST': 10, 'CB': 12, 'LW': 8, 'RW': 8 },
    'Balanced': { 'CM': 10, 'CAM': 8, 'ST': 8 },
    'Defensive': { 'CB': 15, 'CDM': 12, 'LB': 8, 'RB': 8 }
  };

  return bonuses[style]?.[position] || 0;
};

const getTraitStyleBonus = (traits: any[], style: ClubProfile['playingStyle']): number => {
  let bonus = 0;

  for (const trait of traits) {
    switch(trait.name) {
      case 'Clinical Finisher':
        if (style === 'Counter' || style === 'Direct') bonus += 8;
        break;
      case 'Set-piece Specialist':
        if (style === 'Possession' || style === 'Balanced') bonus += 6;
        break;
      case 'Dives Into Tackles':
        if (style === 'Defensive') bonus += 10;
        break;
      case 'Long Throw':
        if (style === 'Direct') bonus += 8;
        break;
      case 'Tireless Runner':
        if (style === 'Counter' || style === 'Defensive') bonus += 6;
        break;
    }
  }

  return bonus;
};

// ============================================
// 4. CÃLCULO DE COMPATIBILIDADE COM PROBABILIDADE
// ============================================

export const calculateTransferFit = (
  player: Player,
  playerProfile: PlayerProfile,
  targetTeam: Team,
  clubProfile: ClubProfile
): TransferFit => {

  // ===== STATUS FIT (com ruído) =====
  const expectedStatus = determineSquadStatus({ ...player, team: targetTeam, hasMadeSeniorDebut: true });
  const statusOrder: SquadStatus[] = ['Surplus', 'Reserve', 'Prospect', 'Rotation', 'Key Player'];
  const currentStatusIndex = statusOrder.indexOf(player.squadStatus);
  const expectedStatusIndex = statusOrder.indexOf(expectedStatus);

  let statusFit = gaussianRandom(45, 5);

  if (expectedStatusIndex > currentStatusIndex) {
    statusFit += gaussianRandom((expectedStatusIndex - currentStatusIndex) * 18, 4);
  } else if (expectedStatusIndex < currentStatusIndex) {
    statusFit -= gaussianRandom((currentStatusIndex - expectedStatusIndex) * 22, 5);
  }

  if (player.age < 22 && expectedStatus === 'Prospect' && clubProfile.tier === 'Elite') {
    statusFit += gaussianRandom(20, 4);
  }

  statusFit = clamp(statusFit, 8, 100);

  // ===== FINANCIAL FIT (elipse bivariada) =====
  const expectedWage = computeWeeklyWageK(targetTeam, expectedStatus, player.stats.overall);
  const wageRatio = expectedWage / player.wage;

  let financialFit = gaussianRandom(45, 8);

  if (wageRatio >= 1.6) financialFit = gaussianRandom(98, 2);
  else if (wageRatio >= 1.3) financialFit = gaussianRandom(88, 4);
  else if (wageRatio >= 1.1) financialFit = gaussianRandom(75, 5);
  else if (wageRatio >= 1.02) financialFit = gaussianRandom(60, 6);
  else if (wageRatio >= 0.95) financialFit = gaussianRandom(50, 8);
  else if (wageRatio >= 0.85) financialFit = gaussianRandom(32, 6);
  else financialFit = gaussianRandom(12, 4);

  const canAfford = clubProfile.financialPower >= (playerProfile.trueValue / 4.5);
  if (!canAfford) financialFit *= gaussianRandom(0.25, 0.08);

  financialFit = clamp(financialFit, 3, 100);

  // ===== CULTURAL FIT (com correlações) =====
  let culturalFit = gaussianRandom(55, 10);

  const sameLeague = Object.values(LEAGUES).some(league =>
    Object.values(league.divisions).flat().some(t => t.name === player.team.name) &&
    Object.values(league.divisions).flat().some(t => t.name === targetTeam.name)
  );

  if (sameLeague) culturalFit += gaussianRandom(25, 5);

  const tierDifference = Math.abs(player.team.leagueTier - targetTeam.leagueTier);
  culturalFit -= gaussianRandom(tierDifference * 10, 3);

  if (player.age > 26) culturalFit += gaussianRandom(12, 2);

  if (player.personality === 'Professional') culturalFit += gaussianRandom(12, 2);
  if (player.personality === 'Ambitious') culturalFit += gaussianRandom(8, 1.5);

  culturalFit = clamp(culturalFit, 15, 100);

  // ===== TACTICAL FIT =====
  const tacticalFit = playerProfile.tacticalFit;

  // ===== CAREER FIT (com incerteza) =====
  let careerFit = gaussianRandom(45, 8);

  if (targetTeam.reputation > player.team.reputation) {
    const repGap = targetTeam.reputation - player.team.reputation;
    careerFit += gaussianRandom(Math.min(repGap * 2.2, 40), 6);
  } else if (targetTeam.reputation < player.team.reputation) {
    const repGap = player.team.reputation - targetTeam.reputation;
    careerFit -= gaussianRandom(Math.min(repGap * 1.8, 35), 5);
  }

  if (targetTeam.leagueTier < player.team.leagueTier) {
    careerFit += gaussianRandom((player.team.leagueTier - targetTeam.leagueTier) * 15, 3);
  }

  if (player.personality === 'Ambitious' && careerFit < 45) {
    careerFit -= gaussianRandom(18, 3);
  }

  if (player.age > 32 && careerFit < 45) {
    careerFit += gaussianRandom(25, 5);
  }

  careerFit = clamp(careerFit, 8, 100);

  // ===== WAGE FIT =====
  const wageFit = calculateWageFit(player, playerProfile, targetTeam, expectedStatus);

  // ===== OVERALL SCORE (com pesos probabilísticos) =====
  const weights = {
    status: gaussianRandom(0.28, 0.03),
    financial: gaussianRandom(0.24, 0.03),
    career: gaussianRandom(0.22, 0.03),
    cultural: gaussianRandom(0.14, 0.02),
    tactical: gaussianRandom(0.12, 0.02)
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const overallScore = (
    statusFit * (weights.status / totalWeight) +
    financialFit * (weights.financial / totalWeight) +
    careerFit * (weights.career / totalWeight) +
    culturalFit * (weights.cultural / totalWeight) +
    tacticalFit * (weights.tactical / totalWeight)
  );

  return {
    overallScore: Math.round(overallScore),
    statusFit,
    financialFit,
    culturalFit,
    tacticalFit,
    careerFit,
    wageFit
  };
};

// ============================================
// 5. CÃLCULO DE FIT SALARIAL
// ============================================

const calculateWageFit = (player: Player, playerProfile: PlayerProfile, team: Team, expectedStatus: SquadStatus): number => {
  const expectedWage = computeWeeklyWageK(team, expectedStatus, player.stats.overall);
  const wageRatio = expectedWage / playerProfile.wageExpectations;

  if (wageRatio >= 1.1) return gaussianRandom(95, 3);
  if (wageRatio >= 1.0) return gaussianRandom(85, 4);
  if (wageRatio >= 0.95) return gaussianRandom(70, 5);
  if (wageRatio >= 0.9) return gaussianRandom(55, 6);
  if (wageRatio >= 0.85) return gaussianRandom(40, 6);
  return gaussianRandom(20, 5);
};

// Helper function para determinar squad status
const determineSquadStatus = (player: Player): SquadStatus => {
  const { age, stats: { overall }, team, potential, hasMadeSeniorDebut } = player;

  if (!hasMadeSeniorDebut) {
    const ageToOvrRatio = overall / age;
    if (potential > 94 && age < 16) return 'Key Player';
    if (ageToOvrRatio > 4.0 && potential > 80) return 'Key Player';
    if (ageToOvrRatio > 3.5 && potential > 75) return 'Rotation';
    if (potential > 70) return 'Prospect';
    return 'Reserve';
  }

  const clubStars = getStarsFromReputation(team.reputation);
  const keyPlayerThreshold = getKeyPlayerThreshold(clubStars);
  const rotationThreshold = keyPlayerThreshold - (3 + Math.floor(clubStars * 0.5));
  const reserveThreshold = rotationThreshold - (4 + Math.floor(clubStars * 0.5));

  const effectiveOverall = overall + gaussianRandom(0, 2);

  if (effectiveOverall >= keyPlayerThreshold) return 'Key Player';
  if (effectiveOverall >= rotationThreshold) return 'Rotation';

  if (age <= 22 && potential > (overall + 2) && effectiveOverall >= reserveThreshold) {
    return 'Prospect';
  }

  if (effectiveOverall >= reserveThreshold) return 'Reserve';
  return 'Surplus';
};

const getStarsFromReputation = (reputation: number): number => {
  // Top tier gets 5 stars
  if (reputation >= 95) return 5;
  
  // Smooth interpolation: 40 rep = 0.5⭐, 95 rep = 4.5⭐
  const minRep = 40;
  const maxRep = 95;
  const minStars = 0.5;
  const maxStars = 4.5;
  
  const clampedRep = Math.max(minRep, Math.min(maxRep, reputation));
  const rawStars = minStars + ((clampedRep - minRep) / (maxRep - minRep)) * (maxStars - minStars);
  
  return Math.round(rawStars * 2) / 2;
};

const getKeyPlayerThreshold = (stars: number): number => {
  const thresholds: Record<number, number> = {
    5: 87, 4.5: 84, 4: 82, 3.5: 79, 3: 76,
    2.5: 73, 2: 69, 1.5: 66, 1: 63, 0.5: 59
  };
  return thresholds[stars] || 65;
};

// ============================================
// 6. GERADOR DE OFERTAS COM PROBABILIDADE
// ============================================

export const generateImprovedOffers = (player: Player, agitatingForTransfer: boolean = false, isForcedToMove: boolean = false): Offer[] => {
  if (player.age > 35 || player.injury?.type === 'Career-Ending') return [];
  if (player.retired) return [];
  
  // 🐛 FIX: Players with pending loan return should return to parent club first
  // Don't generate offers - this prevents the bug where loan club always buys the player
  if (player.pendingLoanReturn) return [];

  const isDesperate = agitatingForTransfer || isForcedToMove;
  const playerProfile = getPlayerProfile(player, isDesperate);

  // Probabilidade não-determinística de ofertas
  const offerThreshold = uncertaintyLayer(playerProfile.transferProbability / 100, 0.2);
  if (!isDesperate && Math.random() > offerThreshold) {
    return [];
  }

  const allTeams: Team[] = Object.entries(LEAGUES).flatMap(([leagueName, league]) =>
    Object.values(league.divisions).flat().map(team => ({
      // Ensure `id` exists to satisfy `Team` interface. Use a stable id based on name+country.
      id: `${team.name}-${team.country}`,
      ...team,
      league: {
        id: leagueName,
        name: leagueName,
        country: team.country,
        tier: team.leagueTier,
        reputation: team.reputation,
        teams: [] // Será populado abaixo
      }
    }))
  );

  // Popula a lista de times de cada liga
  const teamsByLeague = allTeams.reduce((acc, team) => {
    if (team.league?.name) {
      if (!acc[team.league.name]) acc[team.league.name] = [];
      acc[team.league.name].push(team);
    }
    return acc;
  }, {} as Record<string, Team[]>);

  // Atualiza a referência teams em cada liga
  allTeams.forEach(team => {
    if (team.league?.name) {
      team.league.teams = teamsByLeague[team.league.name];
    }
  });

  const eligibleTeams = allTeams.filter(team => {
    if (team.name === player.team.name) return false;
    if (player.parentClub && team.name === player.parentClub.name) return false;
    if (player.hasMadeSeniorDebut && team.isYouth) return false;

    const clubProfile = getClubProfile(team);
    if (!playerProfile.idealClubTiers.includes(clubProfile.tier)) return false;

    // Threshold probabilístico
    const activityThreshold = uncertaintyLayer(25, 0.3);
    if (clubProfile.transferActivity < activityThreshold && !isDesperate) return false;

    // ðŸ”§ FILTRO: Jogadores jovens no início da carreira não devem receber ofertas para status muito baixo
    // Evita ofertas de Surplus/Reserve para jogadores promissores no início
    // Usa idade e anos no clube como proxy para "início de carreira"
    const isEarlyCareer = player.age <= 23 && player.age - 16 <= 4; // Máximo 4 anos desde os 16 (início típico)
    if (isEarlyCareer && !isDesperate) {
      // Simula qual seria o status esperado neste time
      const expectedStatus = determineSquadStatus({ ...player, team, hasMadeSeniorDebut: true });

      // Rejeita ofertas onde seria Surplus ou Reserve (a menos que seja clube muito melhor)
      if (expectedStatus === 'Surplus') return false;
      if (expectedStatus === 'Reserve' && team.reputation <= player.team.reputation + 5) return false;
    }

    return true;
  });

  if (eligibleTeams.length === 0) return [];

  const evaluatedOffers = eligibleTeams.map(team => {
    const clubProfile = getClubProfile(team);
    const fit = calculateTransferFit(player, playerProfile, team, clubProfile);

    let clubInterest = gaussianRandom(45, 8);

    clubInterest += gaussianRandom(clubProfile.ambitionLevel * 0.35, 5);
    clubInterest += gaussianRandom(clubProfile.transferActivity * 0.25, 4);
    clubInterest += gaussianRandom(playerProfile.desirability * 0.45, 6);
    clubInterest += gaussianRandom(fit.overallScore * 0.35, 5);

    const isRival = RIVALRIES.some(rivalry =>
      (rivalry.team1 === player.team.name && rivalry.team2 === team.name) ||
      (rivalry.team2 === player.team.name && rivalry.team1 === team.name)
    );
    if (isRival) clubInterest -= gaussianRandom(45, 8);

    clubInterest = clamp(clubInterest, 3, 98);

    return {
      team,
      clubProfile,
      fit,
      clubInterest,
      score: fit.overallScore * 0.65 + clubInterest * 0.35
    };
  })
  .filter(offer => offer.clubInterest > 30 || isDesperate)
  .sort((a, b) => b.score - a.score);

  // Número de ofertas (probabilístico)
  let numOffers = 1;

  if (isDesperate) {
    numOffers = Math.round(Math.abs(gaussianRandom(6, 1.5)));
  } else {
    const baseOffers = Math.floor(playerProfile.desirability / 22);
    const offerVariance = Math.round(gaussianRandom(0, 1.5));
    numOffers = clamp(baseOffers + offerVariance, 1, 6);

    if (playerProfile.marketTier === 'World Class') numOffers += Math.round(gaussianRandom(3, 0.8));
    else if (playerProfile.marketTier === 'Elite') numOffers += Math.round(gaussianRandom(2, 0.6));
    else if (playerProfile.marketTier === 'Leading') numOffers += Math.round(gaussianRandom(1, 0.4));
  }

  numOffers = Math.max(1, numOffers);

  const topOffers = evaluatedOffers.slice(0, Math.min(numOffers, evaluatedOffers.length));
  const finalOffers: Offer[] = [];

  for (const { team, clubProfile, fit } of topOffers) {
    const expectedStatus = determineSquadStatus({ ...player, team, hasMadeSeniorDebut: true });

    const canBeLoan = player.age < 24 &&
                      playerProfile.marketTier !== 'World Class' &&
                      playerProfile.marketTier !== 'Elite' &&
                      player.contractLength > 1;

    const loanProbBase = canBeLoan ?
      (clubProfile.tier === 'Elite' && expectedStatus === 'Prospect' ? 0.70 : 0.30) : 0;

    const loanProbability = uncertaintyLayer(loanProbBase, 0.2);

    const isLoan = Math.random() < loanProbability && !isDesperate;

    if (isLoan) {
      const duration = player.age < 20 ? rand(1, 2) : 1;

      const wageContribMean = clubProfile.financialPower > 75 ? 100 :
                              clubProfile.financialPower > 55 ? 92 : 77;
      const wageContribStd = 8;
      const wageContribution = Math.round(clamp(gaussianRandom(wageContribMean, wageContribStd), 50, 100));

      finalOffers.push({
        type: 'loan',
        team,
        wageContribution,
        duration,
        expectedSquadStatus: expectedStatus
      });
    } else {
      // OFERTA DE TRANSFERÃŠNCIA
      let transferFee = playerProfile.trueValue;

      const demandMult = gaussianRandom(1 + (playerProfile.desirability - 45) / 180, 0.15);
      transferFee *= Math.max(0.5, demandMult);

      const negotiationMult = gaussianRandom(1 + (playerProfile.negotiationDifficulty / 95), 0.12);
      transferFee *= Math.max(0.5, negotiationMult);

      const clubMult = gaussianRandom(0.82 + (clubProfile.financialPower / 220), 0.10);
      transferFee *= Math.max(0.4, clubMult);

      if (player.contractLength <= 1) transferFee *= gaussianRandom(0.65, 0.08);
      if (player.seasonsWithLowPlayingTime >= 2) transferFee *= gaussianRandom(0.70, 0.08);
      if (isDesperate) transferFee *= gaussianRandom(0.55, 0.10);

      transferFee *= randFloat(0.82, 1.25);
      transferFee = clamp(Math.round(transferFee), 1, 500);

  // Salário (computeWeeklyWageK retorna em milhares (K) por semana) â‡’ converter para euros/semana
  const baseWageK = computeWeeklyWageK(team, expectedStatus, player.stats.overall);
  let offeredWage = baseWageK * 1000; // agora em euros/semana

      const agentMult = player.agent.reputation === 'Super Agent' ? gaussianRandom(1.22, 0.05) :
                        player.agent.reputation === 'Good' ? gaussianRandom(1.12, 0.04) :
                        player.agent.reputation === 'Average' ? gaussianRandom(1.06, 0.03) :
                        gaussianRandom(1.0, 0.02);
      offeredWage *= agentMult;

  if (topOffers.length >= 4) offeredWage *= gaussianRandom(1.10, 0.04);

  if (fit.overallScore < 55) offeredWage *= gaussianRandom(1.15, 0.05);

  offeredWage *= randFloat(0.92, 1.12);

  // Pisos salariais realistas (agora em euros)
  const statusOrder: SquadStatus[] = ['Surplus', 'Reserve', 'Prospect', 'Rotation', 'Key Player', 'Captain'];
  const playerStatusIdx = statusOrder.indexOf(player.squadStatus as any);
  const expectedIdx = statusOrder.indexOf(expectedStatus as any);
  const movingUpTier = team.leagueTier < player.team.leagueTier;
  const sameTier = team.leagueTier === player.team.leagueTier;
  const isLateralOrUpRole = expectedIdx >= playerStatusIdx;

  const currentWage = player.wage; // em euros
  const targetBaseline = baseWageK * 1000; // euro baseline do clube-alvo para esse papel/OVR
  let floorFromMove = Math.round(currentWage * 0.7);
  if (isLateralOrUpRole && sameTier) floorFromMove = Math.round(currentWage * 1.0);
  if (isLateralOrUpRole && movingUpTier) floorFromMove = Math.round(currentWage * 1.2);
  const floorFromLeague = Math.round(targetBaseline * 0.75);
  const absoluteFloor = Math.max(floorFromMove, floorFromLeague);

  const preFloorWage = offeredWage;
  offeredWage = Math.max(offeredWage, absoluteFloor);

  offeredWage = clamp(Math.round(offeredWage), 1000, 800000);

      // Contrato (com alguma variação)
      let contractLength: number;
      if (player.age >= 34) contractLength = rand(1, 2);
      else if (player.age >= 31) contractLength = rand(2, 3);
      else if (player.age >= 28) contractLength = rand(3, 4);
      else if (player.age <= 21) contractLength = rand(4, 5);
      else contractLength = rand(3, 5);

      const debug_info = `baseK=${baseWageK}, preFloorEUR=${preFloorWage}, floorMove=${floorFromMove}, floorLeague=${floorFromLeague}, finalEUR=${offeredWage}, currentEUR=${currentWage}, tiers: from ${player.team.leagueTier} to ${team.leagueTier}, role: ${player.squadStatus} -> ${expectedStatus}`;

      finalOffers.push({
        type: 'transfer',
        team,
        transferFee,
        wage: offeredWage,
        contractLength,
        expectedSquadStatus: expectedStatus,
        debug_info
      });
    }
  }

  return finalOffers;
};

// ============================================
// 7. AUXILIARES E FUNÃ‡Ã•ES DE APOIO
// ============================================

const computeWeeklyWageK = (team: Team, role: SquadStatus, overall: number, isYouth: boolean = false): number => {
  if (isYouth) {
    return Math.round(randFloat(0.2, 1.0) * 10) / 10;
  }

  const tier = team.leagueTier;
  const bands: Record<number, Record<SquadStatus, [number, number]>> = {
    1: { 'Key Player': [160, 650], 'Rotation': [85, 280], 'Prospect': [35, 90], 'Reserve': [12, 45], 'Surplus': [6, 28], 'Captain': [180, 750] },
    2: { 'Key Player': [95, 280], 'Rotation': [55, 160], 'Prospect': [22, 65], 'Reserve': [9, 32], 'Surplus': [5, 22], 'Captain': [110, 320] },
    3: { 'Key Player': [48, 130], 'Rotation': [32, 85], 'Prospect': [12, 32], 'Reserve': [5, 16], 'Surplus': [3, 11], 'Captain': [55, 150] },
    4: { 'Key Player': [22, 65], 'Rotation': [12, 38], 'Prospect': [6, 14], 'Reserve': [2.5, 7], 'Surplus': [1.5, 5], 'Captain': [25, 75] },
    5: { 'Key Player': [9, 28], 'Rotation': [5, 14], 'Prospect': [2, 5], 'Reserve': [0.8, 2.5], 'Surplus': [0.4, 1.8], 'Captain': [10, 32] }
  };

  const [minK, maxK] = (bands[tier] || bands[5])[role] || [1, 5];

  const repFactor = gaussianRandom(0.85 + ((team.reputation - 60) / 39) * 0.35, 0.08);
  const tierBaseline = [0, 85, 80, 75, 70, 65][tier] || 65;
  const ovrDelta = overall - tierBaseline;
  const ovrFactor = gaussianRandom(1 + (ovrDelta / 100) * 0.6, 0.10);

  let base = (minK + (maxK - minK) * 0.5) * Math.max(0.5, repFactor) * Math.max(0.5, ovrFactor);
  base = Math.max(minK * 0.9, Math.min(base, maxK * 1.1));

  // Ajuste calibrado por país + divisão (sem usar salaryMultiplier bruto do config)
  const divFactor = getDivisionWageFactor(team.country, tier);
  base *= gaussianRandom(divFactor, divFactor * 0.08);

  return Math.round(base);
};

export const processImprovedTransfer = (player: Player, offer: TransferOffer): { updatedPlayer: Player; event: any, followerChange: number } => {
  const chemistryMean = 40;
  const chemistryStd = 15;
  const approvalMean = 60;
  const approvalStd = 15;

  let updatedPlayer: Player = {
    ...player,
    team: offer.team,
    wage: offer.wage,
    contractLength: offer.contractLength,
    squadStatus: offer.expectedSquadStatus,
    teamChemistry: Math.round(clamp(gaussianRandom(chemistryMean, chemistryStd), 10, 100)),
    clubApproval: Math.round(clamp(gaussianRandom(approvalMean, approvalStd), 20, 100)),
    yearsAtClub: 0,
    parentClub: null,
    loanDuration: 0,
    ...(offer.expectedSquadStatus === 'Key Player' ? {
      promisedSquadStatus: 'Key Player',
      roleGuaranteeSeasons: 1,
      roleGuaranteeMatches: 20,
    } : {}),
  };

  const followerChangeMean = (offer.team.reputation - player.team.reputation) * 1200;
  const followerChangeStd = Math.abs(followerChangeMean) * 0.25;
  const followerChange = Math.round(gaussianRandom(followerChangeMean, followerChangeStd));

  const event = {
    type: 'transfer',
    description: 'events.transfer.transferred',
    descriptionParams: { team: offer.team.name, fee: offer.transferFee }
  };

  return { updatedPlayer, event, followerChange };
};

export const processImprovedContractRenewal = (player: Player, isPromotion: boolean = false): { updatedPlayer: Player; event: any } => {
  const newContractLength = isPromotion ? rand(3, 5) : rand(player.age > 31 ? 1 : 2, 4);

  const loyaltyBonusMean = Math.min(player.yearsAtClub / 1.8, 1.18);
  const loyaltyBonus = gaussianRandom(loyaltyBonusMean, 0.08);

  const ageFactor = player.age > 32 ? gaussianRandom(0.82, 0.05) : 1.0;

  const currentWage = player.wage;
  const expectedWage = computeWeeklyWageK(player.team, player.squadStatus, player.stats.overall);

  let newWage = Math.round(expectedWage * Math.max(0.7, loyaltyBonus) * ageFactor * randFloat(0.93, 1.08));
  newWage = Math.max(newWage, currentWage * (isPromotion ? 1.25 : 1.03));

  const updatedPlayer = {
    ...player,
    contractLength: newContractLength,
    wage: newWage
  };

  const event = {
    type: 'milestone',
    description: isPromotion
      ? `Signed a new ${newContractLength}-year professional contract.`
      : `Signed a new ${newContractLength}-year contract extension.`
  };

  return { updatedPlayer, event };
};
