/**
 * ============================================================================
 * SISTEMA DE COMPETIÇÕES JUVENIS (CATEGORIAS DE BASE)
 * ============================================================================
 * 
 * Este sistema gerencia todas as competições para jogadores em times juvenis:
 * - Ligas juvenis nacionais (Premier League U21, Brasileiro Sub-20, etc.)
 * - Copas juvenis nacionais (FA Youth Cup, Copa São Paulo, etc.)
 * - Competições continentais juvenis (UEFA Youth League)
 * - Torneios internacionais de base
 * 
 * O sistema também gerencia:
 * - Herança de infraestrutura do clube pai
 * - Possibilidade de promoção ao time principal
 * - Empréstimos para times profissionais
 */

import {
  Player,
  Team,
  CompetitionResult,
  CompetitionType,
} from "../types";
import { rand, clamp } from "./utils";
import { YOUTH_LEAGUES, LEAGUES } from "../constants/leagues";

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Garante que um valor numérico é válido, retornando fallback se for NaN/undefined
 */
function safeNum(value: number | undefined, fallback: number = 50): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

// ==================== TIPOS ====================

export interface YouthCompetitionContext {
  playerCountry: string;
  playerTeam: Team;
  parentClub: Team | null;
  leagueName: string;
  hasYouthCup: boolean;
  hasYouthContinental: boolean; // UEFA Youth League, etc.
  hasSpecialTournament: boolean; // Copinha, etc.
}

export interface YouthSeasonResult {
  competitions: CompetitionResult[];
  promotionChance: number; // 0-100, chance de ser promovido ao time principal
  performanceRating: number; // Performance geral na temporada
  scoutingInterest: number; // Interesse de olheiros externos
  parentClubInterest: number; // Interesse do clube pai
  recommendedAction: 'promote' | 'stay' | 'loan' | 'release';
}

export interface YouthCupResult {
  cupName: string;
  winner: Team;
  finalist: Team;
  playerReachedFinal: boolean;
  playerWon: boolean;
  playerStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets: number;
  };
}

export interface YouthContinentalResult {
  competitionName: string;
  reachedKnockout: boolean;
  roundReached: string; // "Group Stage", "Round of 16", "Quarter-Final", etc.
  playerStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets: number;
  };
  wonCompetition: boolean;
}

// ==================== CONSTANTES ====================

// Nomes das competições juvenis por país
const YOUTH_COMPETITION_NAMES: Record<string, {
  league: string;
  cup: string;
  continental?: string;
  special?: string;
}> = {
  England: {
    league: "English Youth League",
    cup: "English Youth Cup",
    continental: "European Youth League",
  },
  Spain: {
    league: "Spanish Youth League",
    cup: "Spanish Youth Cup",
    continental: "European Youth League",
  },
  Germany: {
    league: "German Youth League",
    cup: "German Youth Cup",
    continental: "European Youth League",
  },
  Italy: {
    league: "Italian Youth League",
    cup: "Italian Youth Cup",
    continental: "European Youth League",
  },
  France: {
    league: "French Youth League",
    cup: "French Youth Cup",
    continental: "European Youth League",
  },
  Portugal: {
    league: "Portuguese Youth League",
    cup: "Portuguese Youth Cup",
    continental: "European Youth League",
  },
  Netherlands: {
    league: "Dutch Youth League",
    cup: "Dutch Youth Cup",
    continental: "European Youth League",
  },
  Brazil: {
    league: "Brazilian U20 League",
    cup: "Brazilian U20 Cup",
    special: "São Paulo Youth Cup",
  },
  Argentina: {
    league: "Argentine Reserve League",
    cup: "Argentine Youth Cup",
    special: "Youth Projection Tournament",
  },
};

// ==================== FUNÇÕES DE HIERARQUIA ====================

/**
 * Obtém o clube principal a partir de qualquer nível da hierarquia
 * Segue a cadeia: Youth -> Reserve -> Main ou Reserve -> Main
 */
export function getMainClub(team: Team): Team | null {
  // Se já é o clube principal, retorna null (não há pai)
  if (!team.parentClubId && !team.parentClubName) {
    // Verifica se o time está marcado como youth sem pai definido
    if (team.isYouth || team.clubHierarchyLevel === "youth" || team.clubHierarchyLevel === "reserve") {
      // Tenta encontrar o clube pai nas ligas
      return findParentClubInLeagues(team);
    }
    return null;
  }

  // Se tem parentClubName, tenta encontrar o clube pai
  if (team.parentClubName) {
    const parent = findClubByName(team.parentClubName, team.country);
    if (parent) {
      // Se o pai também tem um pai, continua subindo
      if (parent.parentClubId || parent.clubHierarchyLevel === "reserve") {
        return getMainClub(parent) || parent;
      }
      return parent;
    }
  }

  return null;
}

/**
 * Obtém o próximo time na hierarquia para promoção
 * Youth -> Reserve (se existir) -> Main
 */
export function getPromotionTarget(team: Team): Team | null {
  if (team.clubHierarchyLevel === "youth") {
    // Se é time da base, promove para reserva se existir, senão para o principal
    const mainClub = getMainClub(team);
    if (mainClub?.reserveTeamId) {
      // Tenta encontrar o time reserva
      const reserveTeam = findClubByName(mainClub.reserveTeamId, team.country);
      if (reserveTeam) return reserveTeam;
    }
    return mainClub;
  }

  if (team.clubHierarchyLevel === "reserve") {
    // Se é time reserva, promove para o principal
    return getMainClub(team);
  }

  // Se já é o principal, não há promoção
  return null;
}

/**
 * Procura um clube pelo nome nas ligas de um país
 */
export function findClubByName(clubName: string, country: string): Team | null {
  const countryLeagues = LEAGUES[country];
  if (!countryLeagues) return null;

  for (const [, teams] of Object.entries(countryLeagues.divisions)) {
    for (const team of teams) {
      if (team.name.toLowerCase() === clubName.toLowerCase()) {
        return team;
      }
    }
  }

  return null;
}

/**
 * Tenta encontrar o clube pai para times que não tem a hierarquia definida
 * Usa o nome do time como fallback
 */
function findParentClubInLeagues(youthTeam: Team): Team | null {
  // Padrões comuns de sufixos de times B/juvenis
  const suffixPatterns = [
    /\s+U21$/i, /\s+U19$/i, /\s+U18$/i, /\s+U23$/i,
    /\s+Primavera$/i, /\s+Juvenil\s*A?$/i,
    /\s+Sub-\d+$/i, /\s+Reserva$/i,
    /\s+B$/i, /\s+II$/i,
    /\s+Castilla$/i, /\s+Atlètic$/i, /\s+EDS$/i,
  ];

  let parentName = youthTeam.name;
  for (const pattern of suffixPatterns) {
    parentName = parentName.replace(pattern, "").trim();
  }

  if (parentName === youthTeam.name) return null;

  return findClubByName(parentName, youthTeam.country);
}

/**
 * Verifica se um time é da estrutura de base/reserva de outro
 */
export function isPartOfClubStructure(possibleYouth: Team, mainClub: Team): boolean {
  // Verifica pela hierarquia explícita
  if (possibleYouth.parentClubName?.toLowerCase() === mainClub.name.toLowerCase()) {
    return true;
  }

  // Verifica se o clube principal referencia este time
  if (mainClub.youthTeamId?.toLowerCase() === possibleYouth.name.toLowerCase() ||
      mainClub.reserveTeamId?.toLowerCase() === possibleYouth.name.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Calcula a infraestrutura herdada do clube pai
 */
export function getInheritedInfrastructure(parentClub: Team | null): {
  trainingFacilities: number;
  youthAcademy: number;
  medicalDepartment: number;
  scoutingNetwork: number;
  stadiumQuality: number;
} {
  if (!parentClub) {
    return {
      trainingFacilities: 2,
      youthAcademy: 2,
      medicalDepartment: 2,
      scoutingNetwork: 2,
      stadiumQuality: 1,
    };
  }

  const rep = parentClub.reputation;

  // Clubes de elite (90+): Barcelona, Real Madrid, Bayern, etc.
  if (rep >= 90) {
    return {
      trainingFacilities: 5,
      youthAcademy: 5,
      medicalDepartment: 5,
      scoutingNetwork: 5,
      stadiumQuality: 4,
    };
  }
  
  // Clubes grandes (82-89): Atlético, Dortmund, etc.
  if (rep >= 82) {
    return {
      trainingFacilities: 4,
      youthAcademy: 5,
      medicalDepartment: 4,
      scoutingNetwork: 4,
      stadiumQuality: 3,
    };
  }
  
  // Clubes estabelecidos (75-81)
  if (rep >= 75) {
    return {
      trainingFacilities: 4,
      youthAcademy: 4,
      medicalDepartment: 3,
      scoutingNetwork: 3,
      stadiumQuality: 3,
    };
  }
  
  // Clubes médios (65-74)
  if (rep >= 65) {
    return {
      trainingFacilities: 3,
      youthAcademy: 3,
      medicalDepartment: 3,
      scoutingNetwork: 2,
      stadiumQuality: 2,
    };
  }

  // Clubes menores
  return {
    trainingFacilities: 2,
    youthAcademy: 2,
    medicalDepartment: 2,
    scoutingNetwork: 2,
    stadiumQuality: 2,
  };
}

/**
 * Determina quais competições juvenis o jogador participa
 */
export function getYouthCompetitionContext(player: Player): YouthCompetitionContext {
  const parentClub = getMainClub(player.team);
  const competitionNames = YOUTH_COMPETITION_NAMES[player.team.country] || {
    league: "Youth League",
    cup: "Youth Cup",
  };

  // UEFA Youth League: apenas para times de clubes que jogam Champions League
  const hasYouthContinental = parentClub 
    ? parentClub.reputation >= 80 && ['England', 'Spain', 'Germany', 'Italy', 'France', 'Portugal', 'Netherlands'].includes(player.team.country)
    : false;

  // Torneios especiais (Copinha, etc.)
  const hasSpecialTournament = !!competitionNames.special;

  return {
    playerCountry: player.team.country,
    playerTeam: player.team,
    parentClub,
    leagueName: competitionNames.league,
    hasYouthCup: true,
    hasYouthContinental,
    hasSpecialTournament,
  };
}

// ==================== SIMULAÇÃO SIMPLIFICADA DE PERFORMANCE ====================

/**
 * Simula performance simplificada de um jogador juvenil em uma partida/competição
 * Não usa o sistema completo de matchLogic para manter performance
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
function simulateYouthPerformance(
  player: Player,
  matchesPlayed: number,
  competitionDifficulty: number = 50, // 0-100
): {
  goals: number;
  assists: number;
  avgRating: number;
  cleanSheets: number;
} {
  if (matchesPlayed === 0 || !Number.isFinite(matchesPlayed)) {
    return { goals: 0, assists: 0, avgRating: 6.0, cleanSheets: 0 };
  }

  // Usa safeNum para garantir valores válidos
  const overall = safeNum(player.stats?.overall, 50);
  const potential = safeNum(player.potential, 70);
  const pos = player.position;
  const isGK = pos === "GK";
  const isDefender = ["CB", "LB", "RB", "LWB", "RWB"].includes(pos);
  const isMidfielder = ["CM", "CDM", "CAM", "LM", "RM"].includes(pos);
  const isAttacker = ["ST", "CF", "LW", "RW"].includes(pos);

  // Bônus de potencial (jovens promissores se destacam mais na base)
  const potentialBonus = Math.max(0, (potential - 70) / 30); // 0-1

  // Rating base - garantir que todos os valores são finitos
  const safeDifficulty = safeNum(competitionDifficulty, 50);
  const difficultyFactor = 1 - (safeDifficulty - 50) / 100;
  const baseRating = clamp(5.5 + (overall - 50) / 25 + potentialBonus * 0.5 + difficultyFactor * 0.3, 5.0, 9.5);
  const avgRating = clamp(baseRating + rand(-5, 5) / 10, 5.0, 9.5);

  // Gols
  let goals = 0;
  if (!isGK) {
    const goalsPerMatch = isAttacker 
      ? 0.4 + potentialBonus * 0.2 
      : isMidfielder 
        ? 0.15 + potentialBonus * 0.1 
        : 0.03 + potentialBonus * 0.02;
    goals = Math.round(matchesPlayed * goalsPerMatch * (0.7 + Math.random() * 0.6));
  }

  // Assistências
  let assists = 0;
  if (!isGK) {
    const assistsPerMatch = isMidfielder 
      ? 0.3 + potentialBonus * 0.15 
      : isAttacker 
        ? 0.2 + potentialBonus * 0.1 
        : 0.05 + potentialBonus * 0.03;
    assists = Math.round(matchesPlayed * assistsPerMatch * (0.7 + Math.random() * 0.6));
  }

  // Clean sheets (apenas para goleiros e defensores)
  let cleanSheets = 0;
  if (isGK || isDefender) {
    const csRate = 0.25 + potentialBonus * 0.1;
    cleanSheets = Math.round(matchesPlayed * csRate * (0.6 + Math.random() * 0.8));
  }

  return {
    goals: Math.max(0, Math.floor(goals) || 0),
    assists: Math.max(0, Math.floor(assists) || 0),
    avgRating: Number.isFinite(avgRating) ? avgRating : 6.0,
    cleanSheets: Math.max(0, Math.floor(cleanSheets) || 0),
  };
}

// ==================== SIMULAÇÃO DE LIGA JUVENIL ====================

/**
 * Simula uma temporada de liga juvenil
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export async function simulateYouthLeagueSeason(
  player: Player,
  context: YouthCompetitionContext,
): Promise<CompetitionResult> {
  // Obtém times da liga juvenil
  const youthLeagueData = YOUTH_LEAGUES[context.playerCountry];
  let leagueTeams: Team[] = [];

  if (youthLeagueData) {
    for (const [, teams] of Object.entries(youthLeagueData.divisions)) {
      leagueTeams = [...leagueTeams, ...teams];
    }
  }

  // Fallback se não houver times suficientes
  if (leagueTeams.length < 8) {
    leagueTeams = generateFallbackYouthTeams(context.playerCountry, 12);
  }

  // Garante que o time do jogador está na liga
  if (!leagueTeams.find(t => t.name === player.team.name)) {
    leagueTeams[0] = player.team;
  }

  // Calcula número de jogos (turno e returno)
  const matchesPerTeam = Math.max(10, (leagueTeams.length - 1) * 2);
  
  // Simula performance do jogador - usa safeNum para garantir valores válidos
  const playerStrength = safeNum(player.stats?.overall, 50);
  const teamStrength = safeNum(player.team?.reputation, 60);
  const playerPotential = safeNum(player.potential, 70);
  
  // Em ligas juvenis, jogadores com alto potencial tendem a se destacar mais
  const potentialBonus = Math.max(0, (playerPotential - 75) * 0.5);
  const effectiveStrength = playerStrength + potentialBonus;

  // Calcula estatísticas baseadas na posição e força
  const baseMatchesPlayed = Math.floor(matchesPerTeam * clamp(0.6 + (effectiveStrength - 60) * 0.01, 0.4, 1.0));
  const matchesPlayed = Math.max(1, Math.min(baseMatchesPlayed, matchesPerTeam));

  // Performance do jogador usando simulação simplificada
  const performance = simulateYouthPerformance(player, matchesPlayed, 50);

  // Ajuste para jogadores jovens promissores - garante que não produz NaN
  const adjustedGoals = Math.max(0, Math.round(safeNum(performance.goals, 0) * (1 + potentialBonus * 0.02)));
  const adjustedAssists = Math.max(0, Math.round(safeNum(performance.assists, 0) * (1 + potentialBonus * 0.02)));

  // Posição na tabela baseada na força do time
  const avgReputation = leagueTeams.reduce((sum, t) => sum + safeNum(t.reputation, 50), 0) / leagueTeams.length;
  const relativeStrength = teamStrength - avgReputation;
  let position = Math.max(1, Math.min(leagueTeams.length, 
    Math.round((leagueTeams.length + 1) / 2 - relativeStrength / 5 + rand(-2, 2))
  ));

  // Jogador excepcional pode carregar o time
  if (effectiveStrength >= 75 && matchesPlayed >= matchesPerTeam * 0.7) {
    position = Math.max(1, position - rand(1, 3));
  }

  // Determina W/D/L
  const winRate = clamp(0.3 + (relativeStrength / 50), 0.15, 0.75);
  const matchesWon = Math.max(0, Math.round(matchesPlayed * winRate));
  const matchesDrawn = Math.max(0, Math.round(matchesPlayed * 0.25));
  const matchesLost = Math.max(0, matchesPlayed - matchesWon - matchesDrawn);

  const rating = clamp(safeNum(performance.avgRating, 6.5) + potentialBonus * 0.05, 5.5, 9.5);

  return {
    competition: context.leagueName,
    type: "League" as CompetitionType,
    position,
    totalTeams: leagueTeams.length,
    matchesPlayed,
    goals: adjustedGoals,
    assists: adjustedAssists,
    cleanSheets: player.position === "GK" ? Math.round(matchesPlayed * 0.3) : 0,
    rating: Number.isFinite(rating) ? rating : 6.5,
    trophies: position === 1 ? 1 : 0,
    matchesWon,
    matchesDrawn,
    matchesLost,
    wonCompetition: position === 1,
  };
}

// ==================== SIMULAÇÃO DE COPA JUVENIL ====================

/**
 * Simula uma copa juvenil nacional
 */
export async function simulateYouthCup(
  player: Player,
  context: YouthCompetitionContext,
): Promise<YouthCupResult> {
  const cupName = YOUTH_COMPETITION_NAMES[context.playerCountry]?.cup || "Youth Cup";
  
  // Número de times e rodadas
  const totalTeams = 32;
  const totalRounds = 5; // 32 -> 16 -> 8 -> 4 -> 2 -> Final

  // Força efetiva do time (time juvenil de clube grande tem vantagem)
  const parentBonus = context.parentClub ? Math.min(15, (context.parentClub.reputation - 70) * 0.5) : 0;
  const effectiveTeamStrength = player.team.reputation + parentBonus;
  
  // Simula progressão na copa
  let currentRound = 0;
  let eliminated = false;
  let matchesPlayed = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalRating = 0;
  let cleanSheets = 0;

  while (currentRound < totalRounds && !eliminated) {
    currentRound++;
    
    // Força do oponente aumenta conforme avança
    const opponentStrength = 50 + currentRound * 5 + rand(-5, 10);
    
    // Chance de vitória
    const winChance = clamp(0.5 + (effectiveTeamStrength - opponentStrength) / 100, 0.2, 0.85);
    
    if (Math.random() < winChance) {
      // Vitória - simula performance do jogador
      matchesPlayed++;
      const performance = simulateYouthPerformance(player, 1, opponentStrength);
      totalGoals += performance.goals;
      totalAssists += performance.assists;
      totalRating += performance.avgRating;
      if (player.position === "GK" && Math.random() < 0.35) cleanSheets++;
    } else {
      eliminated = true;
      matchesPlayed++;
      totalRating += 6.0 + rand(-0.5, 0.5);
    }
  }

  const reachedFinal = currentRound >= totalRounds;
  const won = reachedFinal && !eliminated;

  // Time fictício vencedor/finalista
  const winner: Team = won ? player.team : {
    id: "cup-winner",
    name: `${context.playerCountry} Youth Cup Winner`,
    country: context.playerCountry,
    leagueTier: 5,
    reputation: 60,
    isYouth: true,
    squadStrength: undefined,
  };

  const finalist: Team = reachedFinal && !won ? player.team : {
    id: "cup-finalist",
    name: `${context.playerCountry} Youth Cup Finalist`,
    country: context.playerCountry,
    leagueTier: 5,
    reputation: 58,
    isYouth: true,
    squadStrength: undefined,
  };

  return {
    cupName,
    winner,
    finalist,
    playerReachedFinal: reachedFinal,
    playerWon: won,
    playerStats: {
      matchesPlayed,
      goals: totalGoals,
      assists: totalAssists,
      rating: matchesPlayed > 0 ? totalRating / matchesPlayed : 6.0,
      cleanSheets,
    },
  };
}

// ==================== SIMULAÇÃO DE UEFA YOUTH LEAGUE ====================

/**
 * Simula a UEFA Youth League
 */
export async function simulateUEFAYouthLeague(
  player: Player,
  context: YouthCompetitionContext,
): Promise<YouthContinentalResult | null> {
  if (!context.hasYouthContinental) return null;

  const competitionName = "UEFA Youth League";
  
  // Grupos de 4 times, 6 jogos
  const groupStageMatches = 6;
  let matchesPlayed = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalRating = 0;
  let cleanSheets = 0;
  let points = 0;

  // Simula fase de grupos
  const teamStrength = player.team.reputation + (context.parentClub ? 10 : 0);
  
  for (let i = 0; i < groupStageMatches; i++) {
    const opponentStrength = 55 + rand(0, 15);
    const result = Math.random();
    
    const winChance = clamp((teamStrength - opponentStrength) / 100 + 0.4, 0.2, 0.7);
    const drawChance = 0.25;

    matchesPlayed++;
    if (result < winChance) {
      points += 3;
      const performance = simulateYouthPerformance(player, 1, opponentStrength);
      totalGoals += performance.goals;
      totalAssists += performance.assists;
      totalRating += performance.avgRating;
    } else if (result < winChance + drawChance) {
      points += 1;
      totalRating += 6.5;
    } else {
      totalRating += 5.8;
    }
    
    if (player.position === "GK" && Math.random() < 0.25) cleanSheets++;
  }

  // Qualificação: precisa de ~10 pontos para avançar
  const advancedFromGroup = points >= 10;
  let roundReached = "Group Stage";
  let wonCompetition = false;

  if (advancedFromGroup) {
    // Simula fases eliminatórias
    const knockoutRounds = ["Round of 16", "Quarter-Final", "Semi-Final", "Final"];
    let currentRound = 0;
    let eliminated = false;

    while (currentRound < knockoutRounds.length && !eliminated) {
      roundReached = knockoutRounds[currentRound];
      const opponentStrength = 60 + currentRound * 5;
      const winChance = clamp((teamStrength - opponentStrength) / 100 + 0.45, 0.25, 0.65);
      
      matchesPlayed++;
      if (Math.random() < winChance) {
        const performance = simulateYouthPerformance(player, 1, opponentStrength);
        totalGoals += performance.goals;
        totalAssists += performance.assists;
        totalRating += performance.avgRating;
        currentRound++;
      } else {
        eliminated = true;
        totalRating += 6.0;
      }
      
      if (player.position === "GK" && Math.random() < 0.3) cleanSheets++;
    }

    wonCompetition = !eliminated;
    if (wonCompetition) roundReached = "Winner";
  }

  return {
    competitionName,
    reachedKnockout: advancedFromGroup,
    roundReached,
    playerStats: {
      matchesPlayed,
      goals: totalGoals,
      assists: totalAssists,
      rating: matchesPlayed > 0 ? totalRating / matchesPlayed : 6.0,
      cleanSheets,
    },
    wonCompetition,
  };
}

// ==================== SIMULAÇÃO DE TORNEIOS ESPECIAIS ====================

/**
 * Simula a Copa São Paulo de Futebol Júnior (Copinha)
 */
export async function simulateCopinha(
  player: Player,
  context: YouthCompetitionContext,
): Promise<YouthCupResult | null> {
  if (context.playerCountry !== "Brazil") return null;

  const cupName = "Copa São Paulo de Futebol Júnior";
  
  // Copinha tem formato único: fase de grupos + mata-mata
  // Grupos de 4 times, 3 jogos + até 4 rodadas eliminatórias
  
  let matchesPlayed = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalRating = 0;
  let cleanSheets = 0;

  // Fase de grupos (3 jogos)
  let groupPoints = 0;
  const teamStrength = player.team.reputation + (context.parentClub ? 8 : 0);

  for (let i = 0; i < 3; i++) {
    matchesPlayed++;
    const opponentStrength = 50 + rand(-10, 15);
    const winChance = clamp((teamStrength - opponentStrength) / 80 + 0.5, 0.3, 0.8);
    
    if (Math.random() < winChance) {
      groupPoints += 3;
      const performance = simulateYouthPerformance(player, 1, opponentStrength);
      totalGoals += performance.goals;
      totalAssists += performance.assists;
      totalRating += performance.avgRating;
    } else if (Math.random() < 0.3) {
      groupPoints += 1;
      totalRating += 6.5;
    } else {
      totalRating += 5.8;
    }
    
    if (player.position === "GK" && Math.random() < 0.35) cleanSheets++;
  }

  // Avança com 6+ pontos
  const advancedFromGroup = groupPoints >= 6;
  let reachedFinal = false;
  let won = false;

  if (advancedFromGroup) {
    // Mata-mata: Oitavas, Quartas, Semi, Final
    const knockoutRounds = 4;
    let currentRound = 0;
    let eliminated = false;

    while (currentRound < knockoutRounds && !eliminated) {
      currentRound++;
      matchesPlayed++;
      const opponentStrength = 55 + currentRound * 3;
      const winChance = clamp((teamStrength - opponentStrength) / 80 + 0.45, 0.25, 0.7);
      
      if (Math.random() < winChance) {
        const performance = simulateYouthPerformance(player, 1, opponentStrength);
        totalGoals += performance.goals;
        totalAssists += performance.assists;
        totalRating += performance.avgRating;
      } else {
        eliminated = true;
        totalRating += 6.0;
      }
      
      if (player.position === "GK" && Math.random() < 0.3) cleanSheets++;
    }

    reachedFinal = currentRound >= knockoutRounds;
    won = reachedFinal && !eliminated;
  }

  const winner: Team = won ? player.team : {
    id: "copinha-winner",
    name: "Copinha Winner",
    country: "Brazil",
    leagueTier: 5,
    reputation: 68,
    isYouth: true,
    squadStrength: undefined,
  };

  const finalist: Team = reachedFinal && !won ? player.team : {
    id: "copinha-finalist",
    name: "Copinha Finalist",
    country: "Brazil",
    leagueTier: 5,
    reputation: 65,
    isYouth: true,
    squadStrength: undefined,
  };

  return {
    cupName,
    winner,
    finalist,
    playerReachedFinal: reachedFinal,
    playerWon: won,
    playerStats: {
      matchesPlayed,
      goals: totalGoals,
      assists: totalAssists,
      rating: matchesPlayed > 0 ? totalRating / matchesPlayed : 6.0,
      cleanSheets,
    },
  };
}

// ==================== SISTEMA DE PROMOÇÃO ====================

/**
 * Calcula a chance de promoção ao time principal baseado na performance
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function calculatePromotionChance(
  player: Player,
  seasonStats: {
    goals: number;
    assists: number;
    avgRating: number;
    matchesPlayed: number;
    wonTitles: number;
  },
  context: YouthCompetitionContext,
): {
  chance: number;
  factors: string[];
  recommendation: 'promote' | 'stay' | 'loan' | 'release';
} {
  let baseChance = 0;
  const factors: string[] = [];

  // Usa safeNum para garantir valores válidos
  const playerAge = safeNum(player.age, 16);
  const playerPotential = safeNum(player.potential, 70);
  const playerOverall = safeNum(player.stats?.overall, 50);
  const avgRating = safeNum(seasonStats.avgRating, 6.0);
  const goals = safeNum(seasonStats.goals, 0);
  const assists = safeNum(seasonStats.assists, 0);
  const wonTitles = safeNum(seasonStats.wonTitles, 0);

  // Fator 1: Idade (18-21 é ideal para promoção)
  if (playerAge >= 17 && playerAge <= 19) {
    baseChance += 15;
    factors.push(`Idade ideal para promoção (${playerAge})`);
  } else if (playerAge >= 20 && playerAge <= 21) {
    baseChance += 25;
    factors.push(`Idade avançada para base, pressão para promoção (${playerAge})`);
  } else if (playerAge >= 22) {
    baseChance += 40;
    factors.push(`Precisa ser promovido ou liberado (${playerAge})`);
  }

  // Fator 2: Potencial
  if (playerPotential >= 85) {
    baseChance += 25;
    factors.push("Potencial excepcional");
  } else if (playerPotential >= 80) {
    baseChance += 15;
    factors.push("Alto potencial");
  } else if (playerPotential >= 75) {
    baseChance += 8;
    factors.push("Bom potencial");
  }

  // Fator 3: Performance na temporada
  if (avgRating >= 7.5) {
    baseChance += 20;
    factors.push("Performance excepcional na temporada");
  } else if (avgRating >= 7.0) {
    baseChance += 12;
    factors.push("Boa performance na temporada");
  } else if (avgRating >= 6.5) {
    baseChance += 5;
    factors.push("Performance regular");
  }

  // Fator 4: Gols/Assistências (atacantes/meias)
  if (["Attacker", "Midfielder"].includes(player.position)) {
    const goalContributions = goals + assists;
    if (goalContributions >= 20) {
      baseChance += 15;
      factors.push(`Excelente produtividade (${goalContributions} G+A)`);
    } else if (goalContributions >= 12) {
      baseChance += 8;
      factors.push(`Boa produtividade (${goalContributions} G+A)`);
    }
  }

  // Fator 5: Títulos
  if (wonTitles > 0) {
    baseChance += wonTitles * 5;
    factors.push(`Venceu ${wonTitles} título(s)`);
  }

  // Fator 6: Qualidade do clube pai
  if (context.parentClub) {
    const parentReputation = safeNum(context.parentClub.reputation, 70);
    if (parentReputation >= 85) {
      // Clubes de elite são mais exigentes
      baseChance -= 10;
      factors.push("Clube de elite: padrão mais alto exigido");
    } else if (parentReputation >= 75) {
      // Clubes grandes têm caminho razoável
      baseChance += 5;
      factors.push("Clube grande: caminho para o profissional");
    } else {
      // Clubes menores promovem mais facilmente
      baseChance += 15;
      factors.push("Clube menor: mais chances de promoção");
    }
  }

  // Fator 7: Overall atual comparado ao time principal
  if (context.parentClub) {
    const parentReputation = safeNum(context.parentClub.reputation, 70);
    const expectedFirstTeamLevel = parentReputation - 20;
    if (playerOverall >= expectedFirstTeamLevel) {
      baseChance += 20;
      factors.push("Nível suficiente para o time principal");
    } else if (playerOverall >= expectedFirstTeamLevel - 5) {
      baseChance += 10;
      factors.push("Próximo do nível do time principal");
    }
  }

  // Limita chance entre 0-95%
  const finalChance = clamp(baseChance, 0, 95);

  // Determina recomendação
  let recommendation: 'promote' | 'stay' | 'loan' | 'release';
  
  if (finalChance >= 60) {
    recommendation = 'promote';
  } else if (finalChance >= 30 && playerAge >= 19) {
    recommendation = 'loan';
  } else if (playerAge >= 23 && finalChance < 20) {
    recommendation = 'release';
  } else {
    recommendation = 'stay';
  }

  return {
    chance: Number.isFinite(finalChance) ? finalChance : 0,
    factors,
    recommendation,
  };
}

// ==================== INTERESSE DE OLHEIROS ====================

/**
 * Calcula interesse de olheiros externos no jogador
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function calculateScoutingInterest(
  player: Player,
  seasonStats: {
    goals: number;
    assists: number;
    avgRating: number;
    matchesPlayed: number;
  },
): {
  interest: number; // 0-100
  potentialSuitors: string[];
} {
  let interest = 0;
  const potentialSuitors: string[] = [];

  // Usa safeNum para garantir valores válidos
  const playerPotential = safeNum(player.potential, 70);
  const playerAge = safeNum(player.age, 16);
  const avgRating = safeNum(seasonStats.avgRating, 6.0);
  const goals = safeNum(seasonStats.goals, 0);
  const assists = safeNum(seasonStats.assists, 0);

  // Base no potencial
  interest += Math.max(0, playerPotential - 65);

  // Performance
  if (avgRating >= 7.0) {
    interest += (avgRating - 7.0) * 20;
  }

  // Gols/Assistências chamam atenção
  interest += goals * 2;
  interest += assists * 1.5;

  // Idade atrativa (17-19)
  if (playerAge >= 17 && playerAge <= 19) {
    interest += 10;
  }

  // Define potenciais interessados baseado no nível
  if (interest >= 50) {
    potentialSuitors.push("Top European Clubs");
  }
  if (interest >= 35) {
    potentialSuitors.push("Champions League Clubs");
  }
  if (interest >= 20) {
    potentialSuitors.push("First Division Clubs");
  }
  if (interest >= 10) {
    potentialSuitors.push("Second Division Clubs");
  }

  const finalInterest = clamp(interest, 0, 100);
  return {
    interest: Number.isFinite(finalInterest) ? finalInterest : 0,
    potentialSuitors,
  };
}

// ==================== SIMULAÇÃO COMPLETA DA TEMPORADA ====================

/**
 * Simula uma temporada completa de categorias de base
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export async function simulateYouthSeason(
  player: Player,
): Promise<YouthSeasonResult> {
  const context = getYouthCompetitionContext(player);
  const competitions: CompetitionResult[] = [];
  
  let totalGoals = 0;
  let totalAssists = 0;
  let totalMatches = 0;
  let totalRating = 0;
  let wonTitles = 0;

  // 1. Liga Juvenil
  const leagueResult = await simulateYouthLeagueSeason(player, context);
  competitions.push(leagueResult);
  totalGoals += safeNum(leagueResult.goals, 0);
  totalAssists += safeNum(leagueResult.assists, 0);
  totalMatches += safeNum(leagueResult.matchesPlayed, 0);
  totalRating += safeNum(leagueResult.rating, 6.5) * safeNum(leagueResult.matchesPlayed, 0);
  if (leagueResult.wonCompetition) wonTitles++;

  // 2. Copa Juvenil
  if (context.hasYouthCup) {
    const cupResult = await simulateYouthCup(player, context);
    const cupCompResult: CompetitionResult = {
      competition: cupResult.cupName,
      type: "Cup" as CompetitionType,
      matchesPlayed: safeNum(cupResult.playerStats.matchesPlayed, 0),
      goals: safeNum(cupResult.playerStats.goals, 0),
      assists: safeNum(cupResult.playerStats.assists, 0),
      cleanSheets: safeNum(cupResult.playerStats.cleanSheets, 0),
      rating: safeNum(cupResult.playerStats.rating, 6.5),
      trophies: cupResult.playerWon ? 1 : 0,
      wonCompetition: cupResult.playerWon,
    };
    competitions.push(cupCompResult);
    totalGoals += safeNum(cupResult.playerStats.goals, 0);
    totalAssists += safeNum(cupResult.playerStats.assists, 0);
    totalMatches += safeNum(cupResult.playerStats.matchesPlayed, 0);
    totalRating += safeNum(cupResult.playerStats.rating, 6.5) * safeNum(cupResult.playerStats.matchesPlayed, 0);
    if (cupResult.playerWon) wonTitles++;
  }

  // 3. UEFA Youth League (se aplicável)
  if (context.hasYouthContinental) {
    const uefaResult = await simulateUEFAYouthLeague(player, context);
    if (uefaResult) {
      const continentalCompResult: CompetitionResult = {
        competition: uefaResult.competitionName,
        type: "Continental" as CompetitionType,
        matchesPlayed: safeNum(uefaResult.playerStats.matchesPlayed, 0),
        goals: safeNum(uefaResult.playerStats.goals, 0),
        assists: safeNum(uefaResult.playerStats.assists, 0),
        cleanSheets: safeNum(uefaResult.playerStats.cleanSheets, 0),
        rating: safeNum(uefaResult.playerStats.rating, 6.5),
        trophies: uefaResult.wonCompetition ? 1 : 0,
        wonCompetition: uefaResult.wonCompetition,
      };
      competitions.push(continentalCompResult);
      totalGoals += safeNum(uefaResult.playerStats.goals, 0);
      totalAssists += safeNum(uefaResult.playerStats.assists, 0);
      totalMatches += safeNum(uefaResult.playerStats.matchesPlayed, 0);
      totalRating += safeNum(uefaResult.playerStats.rating, 6.5) * safeNum(uefaResult.playerStats.matchesPlayed, 0);
      if (uefaResult.wonCompetition) wonTitles++;
    }
  }

  // 4. Torneio especial (Copinha para Brasil)
  if (context.hasSpecialTournament && context.playerCountry === "Brazil") {
    const copinhaResult = await simulateCopinha(player, context);
    if (copinhaResult) {
      const specialCompResult: CompetitionResult = {
        competition: copinhaResult.cupName,
        type: "Cup" as CompetitionType,
        matchesPlayed: safeNum(copinhaResult.playerStats.matchesPlayed, 0),
        goals: safeNum(copinhaResult.playerStats.goals, 0),
        assists: safeNum(copinhaResult.playerStats.assists, 0),
        cleanSheets: safeNum(copinhaResult.playerStats.cleanSheets, 0),
        rating: safeNum(copinhaResult.playerStats.rating, 6.5),
        trophies: copinhaResult.playerWon ? 1 : 0,
        wonCompetition: copinhaResult.playerWon,
      };
      competitions.push(specialCompResult);
      totalGoals += safeNum(copinhaResult.playerStats.goals, 0);
      totalAssists += safeNum(copinhaResult.playerStats.assists, 0);
      totalMatches += safeNum(copinhaResult.playerStats.matchesPlayed, 0);
      totalRating += safeNum(copinhaResult.playerStats.rating, 6.5) * safeNum(copinhaResult.playerStats.matchesPlayed, 0);
      if (copinhaResult.playerWon) wonTitles++;
    }
  }

  // Calcula médias - garante valores finitos
  const avgRating = totalMatches > 0 ? totalRating / totalMatches : 6.0;
  const performanceRating = clamp(Number.isFinite(avgRating) ? avgRating : 6.0, 5.0, 10.0);

  // Calcula chance de promoção
  const promotionAnalysis = calculatePromotionChance(
    player,
    { goals: totalGoals, assists: totalAssists, avgRating: safeNum(avgRating, 6.0), matchesPlayed: totalMatches, wonTitles },
    context,
  );

  // Calcula interesse de olheiros
  const scoutingAnalysis = calculateScoutingInterest(
    player,
    { goals: totalGoals, assists: totalAssists, avgRating: safeNum(avgRating, 6.0), matchesPlayed: totalMatches },
  );

  const parentClubInterest = context.parentClub 
    ? Math.min(100, safeNum(promotionAnalysis.chance, 0) * 1.2) 
    : 0;

  return {
    competitions,
    promotionChance: safeNum(promotionAnalysis.chance, 0),
    performanceRating: Number.isFinite(performanceRating) ? performanceRating : 6.0,
    scoutingInterest: safeNum(scoutingAnalysis.interest, 0),
    parentClubInterest: Number.isFinite(parentClubInterest) ? parentClubInterest : 0,
    recommendedAction: promotionAnalysis.recommendation,
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Gera times de fallback para ligas juvenis sem dados
 */
function generateFallbackYouthTeams(country: string, count: number): Team[] {
  const teams: Team[] = [];
  for (let i = 1; i <= count; i++) {
    teams.push({
      id: `youth-${country.toLowerCase()}-${i}`,
      name: `${country} Youth Team ${i}`,
      country,
      leagueTier: 5,
      reputation: 50 + rand(-5, 10),
      isYouth: true,
      squadStrength: undefined,
    });
  }
  return teams;
}

/**
 * Verifica se um jogador deve ser promovido ao time principal
 */
export function shouldPromoteToFirstTeam(
  player: Player,
  seasonResult: YouthSeasonResult,
): boolean {
  // Promoção automática se chance >= 70% e idade >= 18
  if (seasonResult.promotionChance >= 70 && player.age >= 18) {
    return true;
  }

  // Promoção forçada se idade >= 23 (muito velho para base)
  if (player.age >= 23) {
    return true;
  }

  // Promoção baseada em sorte + chance
  if (player.age >= 19) {
    return Math.random() * 100 < seasonResult.promotionChance;
  }

  return false;
}

// ==================== EXPORTS ====================

export default {
  simulateYouthSeason,
  getYouthCompetitionContext,
  calculatePromotionChance,
  calculateScoutingInterest,
  shouldPromoteToFirstTeam,
  getPromotionTarget,
  getMainClub,
  findClubByName,
  isPartOfClubStructure,
  getInheritedInfrastructure,
};
