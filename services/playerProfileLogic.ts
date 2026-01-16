import { Player, PlayerProfile, PlayerStats, PositionDetail, Archetype, PlayerStyle, TransferPlayerProfile, Team, SquadStatus, ClubProfile } from '../types';
import { rand, clamp, randFloat } from './utils';
import { LEAGUES } from '../constants';

// Calibrador por país E DIVIS�fO para alinhar salários ao mercado
// Agora consideramos diferenças entre 1ª, 2ª, 3ª�?� divisões de cada país
// Cada array representa tiers 1..5. Se o país não existir aqui, usamos fatores genéricos por tier.
const GENERIC_TIER_FACTORS = [1.0, 0.65, 0.45, 0.35, 0.25];

const COUNTRY_DIVISION_FACTORS: Record<string, number[]> = {
  // Inglaterra: Premier, Championship, League One, League Two, Non-League
  England: [1.0, 0.60, 0.42, 0.30, 0.22],
  // Espanha: LaLiga, LaLiga2, Primeira RFEF, Segunda RFEF, Tercera
  Spain: [0.85, 0.50, 0.38, 0.30, 0.22],
  // França: Ligue 1, Ligue 2, National, National 2, National 3
  France: [0.55, 0.40, 0.28, 0.20, 0.15],
  // Alemanha: Bundesliga �?' Oberliga
  Germany: [0.70, 0.50, 0.35, 0.26, 0.18],
  // Itália: Serie A �?' semi-pro
  Italy: [0.55, 0.42, 0.30, 0.22, 0.16],
  // EUA
  USA: [0.65, 0.42, 0.30, 0.22, 0.15],
  // Árabe
  'Saudi Arabia': [2.2, 1.3, 0.85, 0.55, 0.35],
  Qatar: [1.6, 1.0, 0.65, 0.42, 0.30],
  UAE: [1.5, 0.95, 0.60, 0.40, 0.28],
  // Brasil: Série A/B/C/D/estaduais menores
  // Brasil recalibrado: queda salarial mais agressiva após Série A.
  // Objetivo aproximado de teto (Capitão estrela) por divisão antes de reputação/OVR:
  // A: 0.20 (usamos bandas globais altas, então baixamos fator para conter)
  // B: 0.06
  // C: 0.035
  // D: 0.02
  // Estaduais menores: 0.012
  Brazil: [0.20, 0.06, 0.035, 0.02, 0.012],
  Argentina: [0.38, 0.28, 0.20, 0.15, 0.11]
};

// ==================== TIER ECONOMIC MODEL ====================
// Systemic wage caps based on league economics (replaces magic numbers)
// cap: Maximum weekly wage (€) any player can earn in this tier
// This models real-world market liquidity: Tier 4 clubs simply don't have
// the revenue to pay Premier League wages, regardless of player quality.
export const TIER_ECONOMIC_DATA: Record<number, { cap: number; name: string; baselineOVR: number }> = {
  1: { cap: 800000, name: 'Elite',   baselineOVR: 88 },
  2: { cap: 350000, name: 'High',    baselineOVR: 82 },
  3: { cap: 60000,  name: 'Mid',     baselineOVR: 76 },
  4: { cap: 15000,  name: 'Low',     baselineOVR: 71 },
  5: { cap: 5000,   name: 'Amateur', baselineOVR: 66 }
};

export const getDivisionWageFactor = (country: string, tier: number): number => {
  const arr = COUNTRY_DIVISION_FACTORS[country] || GENERIC_TIER_FACTORS;
  const idx = Math.max(1, Math.min(5, tier)) - 1;
  return arr[idx] ?? arr[arr.length - 1];
};

// Compat: mantém função antiga para quem ainda importa só por país (assume tier 1)
export const getLeagueWageFactor = (country: string): number => getDivisionWageFactor(country, 1);

export const calculateInitialPlayerProfile = (
  stats: PlayerStats,
  positionDetail: PositionDetail,
  archetype: Archetype
): PlayerProfile => {
  const shooting = stats.shooting || 30;
  const passing = stats.passing || 30;
  const dribbling = stats.dribbling || 30;
  const stamina = stats.stamina || 30;
  const strength = stats.strength || 30;

  let profile: PlayerProfile = {
    goalScoring: 50, playmaking: 50, workRate: 50, creativity: 50, physicalDominance: 50
  };

  if (positionDetail === 'ST' || positionDetail === 'CF') {
    profile.goalScoring = 60 + (shooting - 50) * 0.6;
    profile.playmaking = 30 + (passing - 50) * 0.3;
    profile.creativity = 40 + (dribbling - 50) * 0.4;
    profile.workRate = 50 + (stamina - 50) * 0.2;
    profile.physicalDominance = 50 + (strength - 50) * 0.5;
  } else if (positionDetail === 'CAM') {
    profile.goalScoring = 40 + (shooting - 50) * 0.3;
    profile.playmaking = 70 + (passing - 50) * 0.6;
    profile.creativity = 65 + (dribbling - 50) * 0.5;
    profile.workRate = 50;
    profile.physicalDominance = 30;
  } else if (positionDetail === 'LW' || positionDetail === 'RW') {
    profile.goalScoring = 55 + (shooting - 50) * 0.5;
    profile.playmaking = 45 + (passing - 50) * 0.4;
    profile.creativity = 65 + (dribbling - 50) * 0.6;
    profile.workRate = 45 + (stamina - 50) * 0.3;
    profile.physicalDominance = 35 + (strength - 50) * 0.3;
  } else if (positionDetail === 'CM' || positionDetail === 'CDM') {
    profile.goalScoring = 25 + (shooting - 50) * 0.2;
    profile.playmaking = 60 + (passing - 50) * 0.5;
    profile.creativity = 45 + (dribbling - 50) * 0.3;
    profile.workRate = 70 + (stamina - 50) * 0.4;
    profile.physicalDominance = 60 + (strength - 50) * 0.4;
  } else if (positionDetail === 'CB') {
    profile.goalScoring = 15;
    profile.playmaking = 35 + (passing - 50) * 0.3;
    profile.creativity = 25 + (dribbling - 50) * 0.2;
    profile.workRate = 75 + (stamina - 50) * 0.3;
    profile.physicalDominance = 70 + (strength - 50) * 0.6;
  }

  if (archetype === 'Target Man') {
    profile.goalScoring += 15;
    profile.physicalDominance += 20;
    profile.playmaking -= 10;
  } else if (archetype === 'Technical Maestro') {
    profile.playmaking += 20;
    profile.creativity += 15;
    profile.goalScoring -= 5;
  } else if (archetype === 'The Engine') {
    profile.workRate += 25;
    profile.physicalDominance += 10;
  }

  Object.keys(profile).forEach(key => {
    profile[key as keyof PlayerProfile] = clamp(profile[key as keyof PlayerProfile], 10, 100);
  });

  return profile;
};

// Moved to services/styleAndTraits.ts for better organization
// Export re-export for backwards compatibility
export { classifyPlayerStyle } from './styleAndTraits';

export const computeWeeklyWage = (team: Team, role: SquadStatus, overall: number, isYouth: boolean = false): number => {
  if (isYouth) {
    // Academy wage baseline (200 - 1000)
    return Math.round(randFloat(200, 1000));
  }
  const tier = team.leagueTier;
  // Bands by tier/role (�,�/wk)
  const bands: Record<number, Record<SquadStatus, [number, number]>> = {
    // Calibrated to lower wages for low-OVR rotation/reserve players in top leagues,
    // while preserving headroom for stars.
    1: {
      'Captain': [220000, 800000],
      'Key Player': [140000, 500000],
      'Rotation': [20000, 100000],
      'Prospect': [10000, 30000],
      'Reserve': [5000, 20000],
      'Surplus': [3000, 10000]
    },
    2: {
      'Captain': [120000, 350000],
      'Key Player': [80000, 220000],
      'Rotation': [15000, 70000],
      'Prospect': [8000, 25000],
      'Reserve': [3000, 12000],
      'Surplus': [2000, 8000]
    },
    3: {
      'Captain': [12000, 35000],      // REDUZIDO: �,�12k-35k/wk (~�,�600k-1.8M/ano)
      'Key Player': [8000, 25000],     // REDUZIDO: �,�8k-25k/wk (~�,�400k-1.3M/ano)
      'Rotation': [3000, 12000],       // REDUZIDO: �,�3k-12k/wk (~�,�150k-600k/ano)
      'Prospect': [1500, 6000],        // REDUZIDO: �,�1.5k-6k/wk (~�,�75k-300k/ano)
      'Reserve': [800, 3000],          // REDUZIDO: �,�800-3k/wk (~�,�40k-150k/ano)
      'Surplus': [500, 1500]           // REDUZIDO: �,�500-1.5k/wk (~�,�25k-75k/ano)
    },
    4: {
      'Captain': [6000, 18000],        // REDUZIDO: �,�6k-18k/wk (~�,�300k-900k/ano)
      'Key Player': [4000, 12000],     // REDUZIDO: �,�4k-12k/wk (~�,�200k-600k/ano)
      'Rotation': [1500, 6000],        // REDUZIDO: �,�1.5k-6k/wk (~�,�75k-300k/ano)
      'Prospect': [800, 3000],         // REDUZIDO: �,�800-3k/wk (~�,�40k-150k/ano)
      'Reserve': [500, 1500],          // REDUZIDO: �,�500-1.5k/wk (~�,�25k-75k/ano)
      'Surplus': [300, 1000]           // REDUZIDO: �,�300-1k/wk (~�,�15k-50k/ano)
    },
    5: {
      'Captain': [3000, 10000],        // REDUZIDO: �,�3k-10k/wk (~�,�150k-500k/ano)
      'Key Player': [2000, 7000],      // REDUZIDO: �,�2k-7k/wk (~�,�100k-350k/ano)
      'Rotation': [1000, 4000],        // REDUZIDO: �,�1k-4k/wk (~�,�50k-200k/ano)
      'Prospect': [500, 2000],         // REDUZIDO: �,�500-2k/wk (~�,�25k-100k/ano)
      'Reserve': [300, 1000],          // REDUZIDO: �,�300-1k/wk (~�,�15k-50k/ano)
      'Surplus': [200, 600]            // REDUZIDO: �,�200-600/wk (~�,�10k-30k/ano)
    }
  };
  const roleBand = (bands[tier] || bands[5])[role] || [1000, 4000];
  const [min, max] = roleBand;
  // Reputation factor (wider spread penalizes mid/low-rep clubs slightly)
  const repFactor = 0.8 + ((team.reputation - 60) / 40) * 0.35; // ~0.8 to ~1.25
  // OVR factor vs tier baseline (higher baselines at top tiers). Negative deltas hit harder.
  const tierEcon = TIER_ECONOMIC_DATA[tier] || TIER_ECONOMIC_DATA[5];
  const tierBaseline = tierEcon.baselineOVR;
  const ovrDelta = overall - tierBaseline;
  
  // High OVR in low tier = doesn't command high wages (no market demand)
  // Professional/Academic model: wages reflect local market, not player quality alone
  const ovrFactor = ovrDelta < 0
    ? 1 + (ovrDelta / 100) * 1.5 // Stronger penalty below baseline
    : tier >= 3 
      ? 1 + (ovrDelta / 100) * 0.15 // Minimal boost in low tiers (no demand for stars)
      : 1 + (ovrDelta / 100) * 0.4;
  // Pick a position in band biased by role
  const bandPosition: Record<SquadStatus, number> = {
    'Captain': 0.8,
    'Key Player': 0.65,
    'Rotation': 0.4,
    'Prospect': 0.3,
    'Reserve': 0.3,
    'Surplus': 0.25
  };
  const mid = min + (max - min) * (bandPosition[role] ?? 0.5);
  let base = mid * repFactor * ovrFactor;
  // Keep within band with small slack
  base = Math.max(min * 0.9, Math.min(base, max * 1.05));

  // Find league and apply salary multiplier (país + divisão)
  base *= getDivisionWageFactor(team.country, tier);

  // ==================== TIER ECONOMIC CAP ====================
  // Hard cap based on league economics - models real-world market liquidity
  // A Tier 4 club simply cannot pay Premier League wages, regardless of player quality
  base = Math.min(base, tierEcon.cap);

  // Overqualification penalty: player too good for the league
  // Models "Smurfing" - 90 OVR in 4th division gets tier cap, not PL salary
  if (tier >= 3 && ovrDelta > 15) {
    base = Math.min(base, tierEcon.cap * 1.2); // Max 20% above tier standard
  }

  return Math.round(base);
};

export const getPlayerProfile = (player: Player, isDesperate: boolean = false): TransferPlayerProfile => {
  const { age, stats, potential, reputation, personality, traits, contractLength,
          yearsAtClub, morale, form, team, hasMadeSeniorDebut, agent } = player;

  // ========== MARKET TIER ==========
  // Mais granular e realista
  let marketTier: TransferPlayerProfile['marketTier'];
  const effectiveRep = reputation + (potential - stats.overall) * 0.3;

  if (effectiveRep >= 94 || stats.overall >= 91) marketTier = 'World Class';
  else if (effectiveRep >= 88 || stats.overall >= 87) marketTier = 'Elite';
  else if (effectiveRep >= 82 || stats.overall >= 83) marketTier = 'Leading';
  else if (effectiveRep >= 76 || stats.overall >= 79) marketTier = 'Regular';
  else if (age <= 23 && potential >= 85) marketTier = 'Promising';
  else if (age <= 21 && potential >= 80) marketTier = 'Developing';
  else marketTier = 'Fringe';

  // ========== TRUE VALUE (Marginalista) ==========
  // Valor base exponencial
  let trueValue = Math.pow(stats.overall / 38, 4.8) * 1.5;

  // Curva de idade marginalista (pico aos 26-28)
  let ageMultiplier = 1.0;
  if (age <= 17) ageMultiplier = 0.4 + (age - 14) * 0.15;
  else if (age <= 21) ageMultiplier = 0.85 + (21 - age) * 0.08;
  else if (age <= 23) ageMultiplier = 1.3 + (23 - age) * 0.1;
  else if (age <= 26) ageMultiplier = 1.7 + (26 - age) * 0.05;
  else if (age <= 28) ageMultiplier = 1.9;
  else if (age <= 30) ageMultiplier = 1.6 - (age - 28) * 0.15;
  else if (age <= 33) ageMultiplier = 1.3 - (age - 30) * 0.18;
  else ageMultiplier = 0.7 - (age - 33) * 0.15;
  ageMultiplier = Math.max(ageMultiplier, 0.15);

  trueValue *= ageMultiplier;

  // Potencial (marginalista para jovens)
  if (age < 26) {
    const potentialGap = potential - stats.overall;
    const ageFactor = (26 - age) / 12; // Decresce com idade
    const potentialBonus = Math.pow(Math.max(0, potentialGap), 1.3) * ageFactor * 0.12;
    trueValue *= (1 + potentialBonus);
  }

  // Forma (impacto marginal decrescente)
  const formImpact = form > 0 ?
    Math.pow(form / 5, 0.7) * 0.15 :
    Math.pow(Math.abs(form) / 5, 0.9) * -0.20;
  trueValue *= (1 + formImpact);

  // Contrato (impacto exponencial nos últimos anos)
  const contractMultiplier = contractLength === 0 ? 0.3 :
    contractLength === 1 ? 0.65 :
    contractLength === 2 ? 0.90 :
    1.0 + (contractLength - 2) * 0.04;
  trueValue *= contractMultiplier;

  // Posição (marginalismo: atacantes e meias valem mais)
  const positionMultipliers: Record<string, number> = {
    'ST': 1.25, 'CF': 1.20, 'LW': 1.18, 'RW': 1.18,
    'CAM': 1.12, 'CM': 1.05, 'LM': 1.08, 'RM': 1.08,
    'CDM': 0.98, 'LB': 0.95, 'RB': 0.95, 'LWB': 0.98, 'RWB': 0.98,
    'CB': 0.93, 'GK': 0.88
  };
  trueValue *= (positionMultipliers[player.position] || 1.0);

  // Liga (marginalista: top leagues exponencialmente mais valiosas)
  const leagueMultipliers = [1.35, 1.15, 1.0, 0.85, 0.70];
  trueValue *= (leagueMultipliers[team.leagueTier - 1] || 0.60);

  // Nacionalidade (jogadores de nações fortes valem mais)
  const nationalityBonus = reputation >= 85 ? 1.08 : 1.0;
  trueValue *= nationalityBonus;

  // Traits impactantes
  const hasMarketableTraits = traits.some(t =>
    ['Clinical Finisher', 'Leadership', 'Flair Player', 'Big Game Player'].includes(t.name)
  );
  if (hasMarketableTraits) trueValue *= 1.12;

  // Lesão (penalidade exponencial)
  if (player.injury) {
    const injuryPenalty = player.injury.type === 'Severe' ? 0.45 :
      player.injury.type === 'Moderate' ? 0.72 : 0.88;
    trueValue *= injuryPenalty;
  }

  trueValue = clamp(Math.round(trueValue), 1, 450);

  // ========== DESIRABILITY ==========
  let desirability = 50;

  // Performance recente
  desirability += form * 6;

  // Reputação vs Overall (potencial de crescimento)
  const growthPotential = age < 26 ? (potential - stats.overall) * 2 : 0;
  desirability += growthPotential;

  // Idade ideal (23-29)
  if (age >= 23 && age <= 29) desirability += 15;
  else if (age >= 21 && age <= 30) desirability += 8;
  else if (age < 21 && potential > 85) desirability += 10;
  else if (age > 30) desirability -= (age - 30) * 3;

  // Personalidade
  const personalityImpact: Record<string, number> = {
    'Professional': 12, 'Ambitious': 8, 'Determined': 10,
    'Loyal': -5, 'Temperamental': -8, 'Lazy': -15
  };
  desirability += personalityImpact[personality] || 0;

  // Agente (agentes melhores aumentam visibilidade)
  const agentBonus = agent.reputation === 'Super Agent' ? 15 :
    agent.reputation === 'Good' ? 8 :
    agent.reputation === 'Average' ? 3 : 0;
  desirability += agentBonus;

  desirability = clamp(desirability, 10, 100);

  // ========== TRANSFER PROBABILITY ==========
  let transferProbability = 20; // Base

  if (isDesperate) transferProbability = 95;
  else {
    // Contrato
    if (contractLength === 0) transferProbability += 40;
    else if (contractLength === 1) transferProbability += 25;

    // Moral e tempo de jogo
    const moraleIndex = ['Very Low', 'Low', 'Normal', 'High', 'Very High'].indexOf(morale);
    if (moraleIndex < 2) transferProbability += 30;

    if (player.seasonsWithLowPlayingTime >= 2) transferProbability += 35;
    else if (player.seasonsWithLowPlayingTime === 1) transferProbability += 15;

    // Status no time
    if (player.squadStatus === 'Surplus') transferProbability += 25;
    else if (player.squadStatus === 'Reserve' && age > 22) transferProbability += 15;

    // Ambição pessoal
    if (personality === 'Ambitious' && team.leagueTier > 2) transferProbability += 20;

    // Anos no clube (lealdade diminui probabilidade)
    if (yearsAtClub > 5 && personality !== 'Ambitious') transferProbability -= 15;
    if (yearsAtClub > 8) transferProbability -= 10;
  }

  transferProbability = clamp(transferProbability, 5, 98);

  // ========== IDEAL CLUB TIERS ==========
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

  // ========== NEGOTIATION DIFFICULTY ==========
  let negotiationDifficulty = 50;

  // Agente influencia
  negotiationDifficulty += (agentBonus * 1.5);

  // Personalidade
  if (personality === 'Ambitious') negotiationDifficulty += 15;
  if (personality === 'Temperamental') negotiationDifficulty += 10;
  if (personality === 'Loyal') negotiationDifficulty -= 10;

  // Situação contratual
  if (contractLength <= 1) negotiationDifficulty -= 20;
  if (contractLength >= 4) negotiationDifficulty += 15;

  // Importância no time
  if (player.squadStatus === 'Key Player') negotiationDifficulty += 20;
  else if (player.squadStatus === 'Surplus') negotiationDifficulty -= 15;

  negotiationDifficulty = clamp(negotiationDifficulty, 15, 95);

  return {
    marketTier,
    trueValue: trueValue * 1000000,
    desirability,
    transferProbability,
    idealClubTiers,
    negotiationDifficulty
  };
};
