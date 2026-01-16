import {
  Player,
  Team,
  CompetitionContext,
  LeagueSimulationResult,
  TeamStandings,
} from "../types";
import { calculateDetailedPerformance } from "./matchLogic";
import { rand, clamp } from "./utils";
import { calculateMatchesPlayed } from "./match/utils";
import { simulateMatch, MatchSimulationConfig } from "./match/matchSimulator";
import {
  LEAGUES,
  YOUTH_LEAGUES,
  getTeamsByTier,
  LeagueData,
} from "../constants/leagues";
// NOVO: Importar regras do leagueLogic
import { getLeagueRules, COUNTRY_LEAGUE_RULES } from "./leagueLogic";

/**
 * ============================================================================
 * SISTEMA DE SIMULAÇÃO DE LIGAS NACIONAIS (V2.0)
 * ============================================================================
 *
 * MUDANÇAS V2.0:
 * - Integrado com COUNTRY_LEAGUE_RULES de leagueLogic.ts
 * - Número de jogos correto por país/divisão
 * - Promoção/rebaixamento usando fonte única de verdade
 */

// ==================== TIPOS ====================

interface LeagueMatchResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homePoints: number;
  awayPoints: number;
}

interface SeasonSimulationConfig {
  homeAdvantage: number;
  upsetFactor: number;
  formWeight: number;
  leagueQualityFactor: number;
  matchesPerSeason: number; // NOVO
}

// ==================== CONFIGURAÇÕES POR LIGA ====================

const LEAGUE_STYLE_CONFIGS: Record<string, Partial<SeasonSimulationConfig>> = {
  England: { homeAdvantage: 4, upsetFactor: 0.18 },
  Spain: { homeAdvantage: 6, upsetFactor: 0.12 },
  Germany: { homeAdvantage: 7, upsetFactor: 0.1 },
  Italy: { homeAdvantage: 5, upsetFactor: 0.14 },
  France: { homeAdvantage: 5, upsetFactor: 0.08 },
  Brazil: { homeAdvantage: 8, upsetFactor: 0.2 },
  Argentina: { homeAdvantage: 8, upsetFactor: 0.22 },
  Portugal: { homeAdvantage: 6, upsetFactor: 0.15 },
  Netherlands: { homeAdvantage: 5, upsetFactor: 0.18 },
  Turkey: { homeAdvantage: 7, upsetFactor: 0.16 },
  Russia: { homeAdvantage: 6, upsetFactor: 0.12 },
  Mexico: { homeAdvantage: 7, upsetFactor: 0.2 },
  USA: { homeAdvantage: 3, upsetFactor: 0.25 }, // MLS é mais equilibrada
  Japan: { homeAdvantage: 4, upsetFactor: 0.2 },
  "South Korea": { homeAdvantage: 5, upsetFactor: 0.18 },
  China: { homeAdvantage: 6, upsetFactor: 0.15 },
  "Saudi Arabia": { homeAdvantage: 6, upsetFactor: 0.14 },
  default: { homeAdvantage: 5, upsetFactor: 0.15 },
};

const DEFAULT_CONFIG: SeasonSimulationConfig = {
  homeAdvantage: 5,
  upsetFactor: 0.15,
  formWeight: 0.2,
  leagueQualityFactor: 1.0,
  matchesPerSeason: 38,
};

// ==================== FUNÇÃO PRINCIPAL ====================

export const simulateLeagueSeason = async (
  context: CompetitionContext,
  player: Player,
): Promise<LeagueSimulationResult> => {
  const leagueTeams = getLeagueTeams(context);

  if (leagueTeams.length < 4) {
    console.error(
      `[LeagueSim] Insufficient teams (${leagueTeams.length}) for ${context.playerCountry} Tier ${context.leagueTier}`,
    );
    return createEmptyResult(player);
  }

  const config = getLeagueConfig(context.playerCountry, context.leagueTier);

  // V3: PLAYER IMPACT - Simular com contribuição real do jogador
  const { standings, matchResults, playerSeasonStats } =
    simulateFullSeasonWithPlayerImpact(leagueTeams, config, player);
  const finalTable = sortStandings(standings);

  // Posição do jogador agora reflete performance REAL
  const playerTeamStandings = finalTable.find(
    (s) => s.team.name === player.team.name,
  );
  const playerPosition = playerTeamStandings
    ? finalTable.indexOf(playerTeamStandings) + 1
    : Math.ceil(finalTable.length / 2);

  // USAR REGRAS CENTRALIZADAS para promoção/rebaixamento
  const rules = getLeagueRules(context.playerCountry, context.leagueTier);
  const promoted = getPromotedTeams(finalTable, rules, playerPosition);
  const relegated = getRelegatedTeams(
    finalTable,
    rules,
    context.leagueTier,
    playerPosition,
    context.playerCountry,
  );

  const playerStats = {
    matchesPlayed: playerSeasonStats.matchesPlayed,
    goals: playerSeasonStats.goals,
    assists: playerSeasonStats.assists,
    cleanSheets: playerSeasonStats.cleanSheets,
    rating: playerSeasonStats.rating,
    position: playerPosition,
  };

  logSeasonSummary(context, finalTable, player.team.name, playerStats);

  return {
    finalTable: finalTable.map((s) => s.team),
    promoted: promoted.map((s) => s.team),
    relegated: relegated.map((s) => s.team),
    playerStats,
    // NOVO: Exportar posição do jogador para uso em leagueLogic
    playerSeasonResult: {
      team: player.team,
      position: playerPosition,
    },
  };
};

// ==================== CARREGAMENTO DE TIMES ====================

const getLeagueTeams = (context: CompetitionContext): Team[] => {
  const { playerCountry, leagueTier, playerTeam } = context;

  let league: LeagueData | undefined;
  let isYouthLeague = false;
  let divisionTeams: Team[] = [];

  // PASSO 1: Para tier 5, PRIMEIRO tentar ligas juvenis
  if (leagueTier === 5) {
    const youthLeague = YOUTH_LEAGUES[playerCountry];
    if (youthLeague) {
      divisionTeams = getTeamsByTier(youthLeague, leagueTier);
      if (divisionTeams.length > 0) {
        league = youthLeague;
        isYouthLeague = true;
        console.log(
          `[LeagueSim] Found youth league for ${playerCountry} with ${divisionTeams.length} teams`,
        );
      }
    }
  }

  // PASSO 2: Se não encontrou em YOUTH_LEAGUES (ou não é tier 5), tentar LEAGUES principal
  if (divisionTeams.length === 0) {
    const mainLeague = LEAGUES[playerCountry];
    if (mainLeague) {
      divisionTeams = getTeamsByTier(mainLeague, leagueTier);
      if (divisionTeams.length > 0) {
        league = mainLeague;
        console.log(
          `[LeagueSim] Found tier ${leagueTier} in main league for ${playerCountry}`,
        );
      }
    }
  }

  // PASSO 3: Se ainda não encontrou nada, usar fallback
  if (divisionTeams.length === 0 || !league) {
    console.warn(
      `[LeagueSim] No teams found for ${playerCountry} Tier ${leagueTier}. Using fallback.`,
    );
    return createFallbackTeams(context);
  }

  // Criar cópias dos times com IDs únicos
  let teams: Team[] = divisionTeams.map((team) => ({
    ...team,
    id:
      team.id ||
      `${team.name.replace(/\s+/g, "-").toLowerCase()}-${team.leagueTier}`,
  }));

  // Garantir que o time do jogador está na lista
  teams = ensurePlayerTeamInLeague(teams, playerTeam);

  const divisionName = findDivisionName(league, leagueTier);
  console.log(
    `[LeagueSim] Loaded ${teams.length} teams from ${divisionName} (${playerCountry} Tier ${leagueTier}${isYouthLeague ? " YOUTH" : ""})`,
  );

  return teams;
};

const findDivisionName = (league: LeagueData, tier: number): string => {
  for (const [name, teams] of Object.entries(league.divisions)) {
    if (teams.length > 0 && teams[0].leagueTier === tier) {
      return name;
    }
  }
  return `Division ${tier}`;
};

const ensurePlayerTeamInLeague = (teams: Team[], playerTeam: Team): Team[] => {
  const playerTeamIndex = teams.findIndex(
    (t) => t.name.toLowerCase() === playerTeam.name.toLowerCase(),
  );

  if (playerTeamIndex === -1) {
    console.log(
      `[LeagueSim] Adding player team "${playerTeam.name}" to league`,
    );
    const targetIndex = findClosestReputationIndex(
      teams,
      playerTeam.reputation,
    );
    teams[targetIndex] = {
      ...playerTeam,
      id: `${playerTeam.name.replace(/\s+/g, "-").toLowerCase()}-${playerTeam.leagueTier}`,
    };
  } else {
    teams[playerTeamIndex] = {
      ...teams[playerTeamIndex],
      ...playerTeam,
    };
  }

  return teams;
};

const findClosestReputationIndex = (
  teams: Team[],
  targetRep: number,
): number => {
  let closestIndex = 0;
  let closestDiff = Math.abs(teams[0].reputation - targetRep);

  teams.forEach((team, index) => {
    const diff = Math.abs(team.reputation - targetRep);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
};

const createFallbackTeams = (context: CompetitionContext): Team[] => {
  console.warn(
    `[LeagueSim] Generating fallback teams for ${context.playerCountry} Tier ${context.leagueTier}`,
  );

  // Usar o número correto de times baseado nas regras
  const rules = getLeagueRules(context.playerCountry, context.leagueTier);
  const teamCount = rules.teamCount || 20;

  const teams: Team[] = [];
  const baseRep = 85 - (context.leagueTier - 1) * 10;

  for (let i = 0; i < teamCount; i++) {
    const repVariance = i < 4 ? 8 : i < 10 ? 4 : i < 16 ? 0 : -4;
    teams.push({
      name: `${context.playerCountry} FC ${i + 1}`,
      country: context.playerCountry,
      leagueTier: context.leagueTier,
      reputation: clamp(baseRep + repVariance + rand(-3, 3), 50, 99),
      isYouth: context.leagueTier === 5,
      id: `fallback-${context.playerCountry}-${context.leagueTier}-${i}`,
      squadStrength: undefined,
    });
  }

  teams[0] = { ...context.playerTeam, id: `player-team-${context.leagueTier}` };

  return teams;
};

// ==================== SIMULAÇÃO COM IMPACTO DO JOGADOR ====================

interface PlayerSeasonStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
}

/**
 * V3: Simula a temporada com contribuição REAL do jogador
 * Os gols/assistências do jogador afetam os resultados das partidas do time
 */
const simulateFullSeasonWithPlayerImpact = (
  teams: Team[],
  config: SeasonSimulationConfig,
  player: Player,
): {
  standings: Map<string, TeamStandings>;
  matchResults: LeagueMatchResult[];
  playerSeasonStats: PlayerSeasonStats;
} => {
  const standings = new Map<string, TeamStandings>();
  teams.forEach((team) => {
    standings.set(team.name, createEmptyStandings(team));
  });

  const matchResults: LeagueMatchResult[] = [];
  const playerTeamName = player.team.name;

  // Calcula quantos jogos o jogador vai participar baseado no squad status
  // Usa matchesPerSeason das regras da liga se disponível (para ligas com formato especial como Argentina)
  // Caso contrário, usa o cálculo padrão de turno e returno
  const leagueRules = getLeagueRules(player.team.country || 'England');
  const tier = leagueRules?.tiers?.[1]; // Tier 1 para liga principal
  const totalLeagueMatches = tier?.matchesPerSeason || (teams.length - 1) * 2;
  const participationRate = getPlayerParticipationRate(player);
  const targetMatchesPlayed = Math.round(
    totalLeagueMatches * participationRate,
  );

  // NOVA ABORDAGEM: Calcular targets de temporada ANTES de simular
  const playerContribution = calculatePlayerContribution(player);

  // Ajustar targets pelo número de jogos (targets são para ~38 jogos)
  const matchRatio = targetMatchesPlayed / 38;
  const seasonGoalsTarget = Math.round(
    playerContribution.seasonGoals * matchRatio,
  );
  const seasonAssistsTarget = Math.round(
    playerContribution.seasonAssists * matchRatio,
  );

  // Simular todas as partidas da liga
  const totalRounds = 2;
  let matchesPlayed = 0;
  let playerCleanSheets = 0;
  let totalRating = 0;
  let playerMatchIndex = 0;
  
  // V4: PLAYER-TEAM GOAL COUPLING
  // Track actual goals scored by player's team in matches they played
  let teamGoalsInPlayerMatches = 0;
  let playerActualGoals = 0;
  let playerActualAssists = 0;

  for (let round = 0; round < totalRounds; round++) {
    const isSecondHalf = round === 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = isSecondHalf ? teams[j] : teams[i];
        const awayTeam = isSecondHalf ? teams[i] : teams[j];

        const isPlayerMatch =
          homeTeam.name === playerTeamName || awayTeam.name === playerTeamName;
        const isPlayerHome = homeTeam.name === playerTeamName;

        const homeStandings = standings.get(homeTeam.name)!;
        const awayStandings = standings.get(awayTeam.name)!;

        // Aplicar bônus de força do jogador ao time dele
        const boostedHomeTeam =
          isPlayerHome && playerMatchIndex < targetMatchesPlayed
            ? {
                ...homeTeam,
                reputation:
                  homeTeam.reputation + playerContribution.strengthBonus,
              }
            : homeTeam;
        const boostedAwayTeam =
          !isPlayerHome &&
          isPlayerMatch &&
          playerMatchIndex < targetMatchesPlayed
            ? {
                ...awayTeam,
                reputation:
                  awayTeam.reputation + playerContribution.strengthBonus,
              }
            : awayTeam;

        const matchConfig: MatchSimulationConfig = {
          homeAdvantage: config.homeAdvantage,
          upsetFactor: config.upsetFactor,
          formWeight: config.formWeight,
          isNeutralVenue: false,
          isCupMatch: false,
        };

        const simResult = simulateMatch(
          boostedHomeTeam,
          boostedAwayTeam,
          homeStandings.form,
          awayStandings.form,
          matchConfig,
        );

        const result: LeagueMatchResult = {
          homeTeam: simResult.homeTeam,
          awayTeam: simResult.awayTeam,
          homeGoals: simResult.homeGoals,
          awayGoals: simResult.awayGoals,
          homePoints: simResult.homePoints,
          awayPoints: simResult.awayPoints,
        };

        updateStandings(standings, homeTeam.name, awayTeam.name, result);
        matchResults.push(result);

        // Contar participação do jogador
        if (isPlayerMatch) {
          if (playerMatchIndex < targetMatchesPlayed) {
            matchesPlayed++;
            const playerTeamGoals = isPlayerHome
              ? result.homeGoals
              : result.awayGoals;
            const opponentGoals = isPlayerHome
              ? result.awayGoals
              : result.homeGoals;
            
            // V4: Track team goals in matches player participated
            teamGoalsInPlayerMatches += playerTeamGoals;
            
            if (opponentGoals === 0 && player.position === "GK") {
              playerCleanSheets++;
            }
          }
          playerMatchIndex++;
        }
      }
    }
  }

  // V4: CRITICAL FIX - Ensure player goals <= team goals
  // Calculate player contribution as a percentage of team goals
  // This ensures logical consistency: player cannot score more than team
  const playerGoalContributionRate = calculatePlayerGoalContributionRate(player);
  const playerAssistContributionRate = calculatePlayerAssistContributionRate(player);
  
  // Player goals are a SUBSET of team goals, not independent
  playerActualGoals = Math.min(
    seasonGoalsTarget,
    Math.round(teamGoalsInPlayerMatches * playerGoalContributionRate)
  );
  
  // Assists: cannot exceed (team goals - player goals) since you can't assist your own goal
  const maxAssists = Math.max(0, teamGoalsInPlayerMatches - playerActualGoals);
  playerActualAssists = Math.min(
    seasonAssistsTarget,
    Math.round(maxAssists * playerAssistContributionRate)
  );

  // Calcular rating médio baseado na performance da temporada
  const playerTeamStandings = standings.get(playerTeamName);
  const teamPosition = playerTeamStandings
    ? Array.from(standings.values())
        .sort(
          (a, b) => b.points - a.points || b.goalDifference - a.goalDifference,
        )
        .indexOf(playerTeamStandings) + 1
    : teams.length / 2;

  // CORREÇÃO DE RATING: Alinhar com ratingSystem.ts
  // Baseado em média por jogo para evitar valores inflados (ex: 8.7)
  const matches = Math.max(1, matchesPlayed);

  // 1. Base Rating (6.2 é um bom ponto de partida para titular)
  let calcRating = 6.2;

  // 2. Bônus por Posição do Time (0.0 a 0.4)
  const positionBonus = ((teams.length - teamPosition) / teams.length) * 0.4;
  calcRating += positionBonus;

  // 3. Contribuição Ofensiva (Peso alinhado com ratingSystem.ts: 1.5/gol, 1.0/assist)
  // V4: Use actual goals/assists, not targets
  const goalsPerMatch = playerActualGoals / matches;
  const assistsPerMatch = playerActualAssists / matches;

  // Ex: 1.0 G/J = +1.5 no rating médio (Temporada de Ballon d'Or)
  calcRating += goalsPerMatch * 1.5;
  calcRating += assistsPerMatch * 1.0;

  // 4. Bônus Específico por Posição
  if (player.position === "GK") {
    const csRatio = playerCleanSheets / matches;
    calcRating += csRatio * 2.0;
  } else if (["CB", "LB", "RB", "CDM"].includes(player.position)) {
    // Defensores dependem menos de G/A, dão boost por clean sheets do time ou performance defensiva abstrata
    calcRating += 0.3; // Compensação base
  }

  // V4: High-performing player correlation with team wins
  // If player scored 3+ goals in a match or rating > 9.0, team should likely have won
  // This is enforced by the strength bonus already applied to match simulation
  const variance = (Math.random() - 0.5) * 0.3; // ±0.15 variância
  totalRating = clamp(calcRating + variance, 5.8, 9.8);

  return {
    standings,
    matchResults,
    playerSeasonStats: {
      matchesPlayed,
      goals: playerActualGoals,
      assists: playerActualAssists,
      cleanSheets: playerCleanSheets,
      rating: totalRating,
    },
  };
};

/**
 * V4: Calculate player's contribution rate to team goals based on position and OVR
 * Returns a value between 0 and 1 representing the % of team goals the player scores
 */
const calculatePlayerGoalContributionRate = (player: Player): number => {
  const position = player.position;
  const overallFactor = Math.max(0, (player.stats.overall - 60) / 40); // 0 to 1
  
  // Base contribution rates by position (for a 100 OVR player)
  // These represent realistic % of team goals a single player might score
  let baseRate = 0.15; // Default
  
  if (position === "GK") {
    baseRate = 0.0;
  } else if (position === "CB") {
    baseRate = 0.05; // ~3-5 goals out of 60-70 team goals
  } else if (["LB", "RB", "LWB", "RWB"].includes(position)) {
    baseRate = 0.08;
  } else if (position === "CDM") {
    baseRate = 0.08;
  } else if (["CM", "LM", "RM"].includes(position)) {
    baseRate = 0.15;
  } else if (position === "CAM") {
    baseRate = 0.22;
  } else if (["LW", "RW"].includes(position)) {
    baseRate = 0.28;
  } else if (["CF", "ST"].includes(position)) {
    baseRate = 0.40; // Elite strikers can score 35-40% of team goals
  }
  
  // Scale by OVR: 60 OVR = 30% of base rate, 100 OVR = 100% of base rate
  const ovrMultiplier = 0.3 + overallFactor * 0.7;
  
  // Add variance: ±20% season-to-season
  const seasonVariance = 0.8 + Math.random() * 0.4;
  
  return clamp(baseRate * ovrMultiplier * seasonVariance, 0, 0.60);
};

/**
 * V4: Calculate player's assist contribution rate
 */
const calculatePlayerAssistContributionRate = (player: Player): number => {
  const position = player.position;
  const overallFactor = Math.max(0, (player.stats.overall - 60) / 40);
  
  let baseRate = 0.12;
  
  if (position === "GK") {
    baseRate = 0.01;
  } else if (position === "CB") {
    baseRate = 0.04;
  } else if (["LB", "RB", "LWB", "RWB"].includes(position)) {
    baseRate = 0.15; // Fullbacks provide many assists via crosses
  } else if (position === "CDM") {
    baseRate = 0.10;
  } else if (["CM", "LM", "RM"].includes(position)) {
    baseRate = 0.18;
  } else if (position === "CAM") {
    baseRate = 0.28; // Playmakers are primary assist providers
  } else if (["LW", "RW"].includes(position)) {
    baseRate = 0.22;
  } else if (["CF", "ST"].includes(position)) {
    baseRate = 0.12;
  }
  
  const ovrMultiplier = 0.3 + overallFactor * 0.7;
  const seasonVariance = 0.8 + Math.random() * 0.4;
  
  return clamp(baseRate * ovrMultiplier * seasonVariance, 0, 0.45);
};

/**
 * Calcula taxa de participação baseada no squad status
 */
const getPlayerParticipationRate = (player: Player): number => {
  const rates: Record<string, [number, number]> = {
    Captain: [0.95, 0.99],
    "Key Player": [0.92, 0.98],
    Rotation: [0.55, 0.75],
    Prospect: [0.35, 0.55],
    Reserve: [0.1, 0.3],
    Surplus: [0.02, 0.1],
  };

  const [min, max] = rates[player.squadStatus] || [0.55, 0.75];
  return min + Math.random() * (max - min);
};

/**
 * Calcula contribuição do jogador baseada em atributos e posição
 */
const calculatePlayerContribution = (
  player: Player,
): {
  seasonGoals: number; // Target de gols na temporada
  seasonAssists: number; // Target de assistências na temporada
  strengthBonus: number;
} => {
  const stats = player.stats;
  const position = player.position;

  // Fator baseado no OVR (0 para 60 OVR, 1 para 100 OVR)
  const overallFactor = Math.max(0, (stats.overall - 60) / 40);

  // TARGETS por posição para uma temporada de ~38 jogos
  // Valores são para OVR 100, escalados pelo overallFactor
  let baseGoals = 0;
  let baseAssists = 0;

  if (position === "GK") {
    baseGoals = 0;
    baseAssists = 1;
  } else if (position === "CB") {
    // Zagueiros: Van Dijk, Dias = 2-5 gols
    baseGoals = 5;
    baseAssists = 3;
  } else if (["LWB", "LB", "RB", "RWB"].includes(position)) {
    // Laterais: TAA, Cancelo = 5-10 gols, 10-15 assists
    baseGoals = 10;
    baseAssists = 15;
  } else if (position === "CDM") {
    // CDM: Rodri, Casemiro = 4-8 gols
    baseGoals = 8;
    baseAssists = 8;
  } else if (["CM", "LM", "RM"].includes(position)) {
    // CM: Bellingham, Modric = 8-15 gols
    baseGoals = 15;
    baseAssists = 12;
  } else if (position === "CAM") {
    // CAM: De Bruyne, Odegaard = 12-20 gols
    baseGoals = 20;
    baseAssists = 18;
  } else if (["LW", "RW"].includes(position)) {
    // Pontas: Salah, Vini Jr = 15-25 gols
    baseGoals = 25;
    baseAssists = 15;
  } else if (["CF", "ST"].includes(position)) {
    // Atacantes: Haaland, Mbappe = 25-35 gols
    baseGoals = 35;
    baseAssists = 10;
  } else {
    baseGoals = 10;
    baseAssists = 10;
  }

  // Escalar pelo OVR (jogador OVR 60 recebe ~30% do base, OVR 100 recebe 100%)
  const ovrMultiplier = 0.3 + overallFactor * 0.7; // 0.3 a 1.0

  // Variância de temporada: ±30% (algumas temporadas melhores, outras piores)
  const seasonVariance = 0.7 + Math.random() * 0.6; // 0.7 a 1.3

  const seasonGoals = Math.round(baseGoals * ovrMultiplier * seasonVariance);
  const seasonAssists = Math.round(
    baseAssists * ovrMultiplier * seasonVariance,
  );

  // Bônus de força no time
  const strengthBonus = clamp(overallFactor * 8, 0, 15);

  return { seasonGoals, seasonAssists, strengthBonus };
};

/**
 * Simula partida com contribuição real do jogador
 */
const simulateMatchWithPlayerContribution = (
  homeTeam: Team,
  awayTeam: Team,
  homeForm: ("W" | "D" | "L")[],
  awayForm: ("W" | "D" | "L")[],
  config: SeasonSimulationConfig,
  player: Player,
  isPlayerHome: boolean,
  contribution: {
    goalBonus: number;
    assistBonus: number;
    strengthBonus: number;
  },
  seasonFormFactor: number, // Multiplica para toda a temporada
): LeagueMatchResult & {
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
  playerCleanSheet: boolean;
} => {
  // VARIÂNCIA POR PARTIDA baseada no OVR
  // Jogadores de alto OVR são mais consistentes partida a partida
  // OVR 60: range 0.6-1.4 (variância alta, partidas muito boas ou muito ruins)
  // OVR 80: range 0.75-1.25
  // OVR 100: range 0.85-1.15 (muito consistente)
  const overallFactor = (player.stats.overall - 60) / 40;
  const matchFloor = 0.6 + overallFactor * 0.25; // 0.6 a 0.85
  const matchCeiling = 1.4 - overallFactor * 0.25; // 1.4 a 1.15
  const matchRange = matchCeiling - matchFloor;
  const matchFormFactor = matchFloor + Math.random() * matchRange;

  // Aplicar bônus de força do jogador ao time dele
  const boostedHomeTeam = isPlayerHome
    ? {
        ...homeTeam,
        reputation: homeTeam.reputation + contribution.strengthBonus,
      }
    : homeTeam;
  const boostedAwayTeam = !isPlayerHome
    ? {
        ...awayTeam,
        reputation: awayTeam.reputation + contribution.strengthBonus,
      }
    : awayTeam;

  const matchConfig: MatchSimulationConfig = {
    homeAdvantage: config.homeAdvantage,
    upsetFactor: config.upsetFactor,
    formWeight: config.formWeight,
    isNeutralVenue: false,
    isCupMatch: false,
  };

  const result = simulateMatch(
    boostedHomeTeam,
    boostedAwayTeam,
    homeForm,
    awayForm,
    matchConfig,
  );

  // Calcular contribuição individual do jogador
  const playerTeamGoals = isPlayerHome ? result.homeGoals : result.awayGoals;
  const opponentGoals = isPlayerHome ? result.awayGoals : result.homeGoals;

  // Jogador tem chance de ter marcado gols do time
  let playerGoals = 0;
  let playerAssists = 0;

  for (let g = 0; g < playerTeamGoals; g++) {
    // Chance de ter sido gol do jogador
    // Fórmula: bônus_posição * fator_temporada * fator_partida
    // Bônus já estão calibrados por posição em calculatePlayerContribution
    const adjustedGoalChance =
      contribution.goalBonus * seasonFormFactor * matchFormFactor;
    const adjustedAssistChance =
      contribution.assistBonus * seasonFormFactor * matchFormFactor;

    if (Math.random() < adjustedGoalChance) {
      playerGoals++;
    } else if (Math.random() < adjustedAssistChance) {
      playerAssists++;
    }
  }

  // Limitar a no máximo os gols do time
  playerGoals = Math.min(playerGoals, playerTeamGoals);
  playerAssists = Math.min(
    playerAssists,
    Math.max(0, playerTeamGoals - playerGoals),
  );

  // Calcular rating baseado na performance
  const won = isPlayerHome
    ? result.homeGoals > result.awayGoals
    : result.awayGoals > result.homeGoals;
  const drew = result.homeGoals === result.awayGoals;

  let baseRating = 6.5;
  if (won) baseRating += 0.5;
  if (drew) baseRating += 0.1;
  baseRating += playerGoals * 0.5;
  baseRating += playerAssists * 0.3;
  baseRating += rand(-3, 3) * 0.1; // Variância

  const cleanSheet = opponentGoals === 0 && player.position === "GK";

  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
    homePoints: result.homePoints,
    awayPoints: result.awayPoints,
    playerGoals,
    playerAssists,
    playerRating: clamp(baseRating, 5.0, 10.0),
    playerCleanSheet: cleanSheet,
  };
};

// ==================== SIMULAÇÃO DE TEMPORADA ====================

const simulateFullSeason = (
  teams: Team[],
  config: SeasonSimulationConfig,
): {
  standings: Map<string, TeamStandings>;
  matchResults: LeagueMatchResult[];
} => {
  const standings = new Map<string, TeamStandings>();
  teams.forEach((team) => {
    standings.set(team.name, createEmptyStandings(team));
  });

  const matchResults: LeagueMatchResult[] = [];

  // Calcular número de rodadas baseado no número de times
  // Em uma liga com N times, cada time joga (N-1) * 2 jogos
  const totalRounds = 2; // Turno e returno

  for (let round = 0; round < totalRounds; round++) {
    const isSecondHalf = round === 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = isSecondHalf ? teams[j] : teams[i];
        const awayTeam = isSecondHalf ? teams[i] : teams[j];

        const homeStandings = standings.get(homeTeam.name)!;
        const awayStandings = standings.get(awayTeam.name)!;

        const matchConfig: MatchSimulationConfig = {
          homeAdvantage: config.homeAdvantage,
          upsetFactor: config.upsetFactor,
          formWeight: config.formWeight,
          isNeutralVenue: false,
          isCupMatch: false,
        };

        const result = simulateMatch(
          homeTeam,
          awayTeam,
          homeStandings.form,
          awayStandings.form,
          matchConfig,
        );

        const leagueResult: LeagueMatchResult = {
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          homePoints: result.homePoints,
          awayPoints: result.awayPoints,
        };

        updateStandings(standings, homeTeam.name, awayTeam.name, leagueResult);
        matchResults.push(leagueResult);
      }
    }
  }

  return { standings, matchResults };
};

const createEmptyStandings = (team: Team): TeamStandings => ({
  team,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
  homeRecord: { won: 0, drawn: 0, lost: 0 },
  awayRecord: { won: 0, drawn: 0, lost: 0 },
});

const updateStandings = (
  standings: Map<string, TeamStandings>,
  homeTeamName: string,
  awayTeamName: string,
  result: LeagueMatchResult,
): void => {
  const home = standings.get(homeTeamName)!;
  const away = standings.get(awayTeamName)!;

  home.played++;
  home.goalsFor += result.homeGoals;
  home.goalsAgainst += result.awayGoals;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  home.points += result.homePoints;

  away.played++;
  away.goalsFor += result.awayGoals;
  away.goalsAgainst += result.homeGoals;
  away.goalDifference = away.goalsFor - away.goalsAgainst;
  away.points += result.awayPoints;

  if (result.homeGoals > result.awayGoals) {
    home.won++;
    home.homeRecord.won++;
    home.form.push("W");
    away.lost++;
    away.awayRecord.lost++;
    away.form.push("L");
  } else if (result.awayGoals > result.homeGoals) {
    home.lost++;
    home.homeRecord.lost++;
    home.form.push("L");
    away.won++;
    away.awayRecord.won++;
    away.form.push("W");
  } else {
    home.drawn++;
    home.homeRecord.drawn++;
    home.form.push("D");
    away.drawn++;
    away.awayRecord.drawn++;
    away.form.push("D");
  }

  if (home.form.length > 10) home.form.shift();
  if (away.form.length > 10) away.form.shift();
};

const sortStandings = (
  standings: Map<string, TeamStandings>,
): TeamStandings[] => {
  return Array.from(standings.values()).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.won !== b.won) return b.won - a.won;
    return b.team.reputation - a.team.reputation;
  });
};

// ==================== PERFORMANCE DO JOGADOR ====================

// Calcula quantos jogos da liga o jogador participou (baseado no total de jogos da liga)
const calculateLeagueMatchesPlayed = (
  player: Player,
  leagueMatchesTotal: number,
): number => {
  // Fator de participação baseado no squad status
  // AJUSTADO V3: Titulares jogam praticamente todos os jogos
  // Referência: Vini Jr 35/38, Haaland 36/38, Salah 37/38
  const participationRates: Record<string, [number, number]> = {
    Captain: [0.95, 0.99], // Capitão joga 36-38 de 38
    "Key Player": [0.92, 0.98], // Titular joga 35-37 de 38
    Rotation: [0.55, 0.75], // Rotação joga 21-28 de 38
    Prospect: [0.35, 0.55], // Jovem joga 13-21 de 38
    Reserve: [0.1, 0.3], // Reserva joga 4-11 de 38
    Surplus: [0.02, 0.1], // Dispensável joga 1-4 de 38
  };

  const [min, max] = participationRates[player.squadStatus] || [0.55, 0.75];
  const participationRate = min + Math.random() * (max - min);

  // Modificadores muito leves (quase não penaliza)
  let modifier = 1.0;
  if (player.age >= 36) modifier *= 0.95; // Só veteranos 36+ descansam um pouco
  if (player.form >= 6) modifier *= 1.01; // Boa forma = ligeiramente mais jogos
  if (player.form <= -8) modifier *= 0.97; // Só forma péssima = menos jogos

  const matches = Math.round(leagueMatchesTotal * participationRate * modifier);
  return clamp(matches, 0, leagueMatchesTotal);
};

const simulatePlayerLeaguePerformance = async (
  player: Player,
  leagueTeams: Team[],
  finalTable: TeamStandings[],
  matchResults: LeagueMatchResult[],
  config: SeasonSimulationConfig,
  playerPosition: number,
): Promise<LeagueSimulationResult["playerStats"]> => {
  // CORRIGIDO: Usar o número real de jogos da liga, não todas as competições
  const matchesPlayed = calculateLeagueMatchesPlayed(
    player,
    config.matchesPerSeason,
  );
  const playerTeamStandings = finalTable.find(
    (s) => s.team.name === player.team.name,
  );

  if (matchesPlayed === 0) {
    return {
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      rating: 0,
      position: playerPosition,
    };
  }

  const performanceModifier = calculatePerformanceModifier(
    player,
    playerTeamStandings,
    finalTable.length,
    config,
  );

  const performanceResult = calculateDetailedPerformance(
    player,
    matchesPlayed,
    performanceModifier,
    player.tactic || "Balanced",
  );

  let ratingBonus = 0;
  if (playerPosition <= 4) ratingBonus = 0.3;
  else if (playerPosition <= 8) ratingBonus = 0.1;
  else if (playerPosition > finalTable.length - 3) ratingBonus = -0.2;

  const finalRating = clamp(
    performanceResult.matchStats.rating + ratingBonus,
    1,
    10,
  );

  return {
    matchesPlayed,
    goals: performanceResult.goals,
    assists: performanceResult.assists,
    cleanSheets: performanceResult.cleanSheets || 0,
    rating: finalRating,
    position: playerPosition,
  };
};

const calculatePerformanceModifier = (
  player: Player,
  teamStandings: TeamStandings | undefined,
  totalTeams: number,
  config: SeasonSimulationConfig,
): number => {
  let modifier = 1.0;

  const squadStatusModifiers: Record<string, number> = {
    Captain: 1.25,
    "Key Player": 1.15,
    Rotation: 1.0,
    Prospect: 0.85,
    Reserve: 0.65,
    Surplus: 0.5,
  };
  modifier *= squadStatusModifiers[player.squadStatus] || 1.0;

  modifier *= 0.85 + (player.team.reputation / 100) * 0.3;
  modifier *= 1.0 + (5 - player.team.leagueTier) * 0.08;

  if (teamStandings) {
    const expectedPoints = totalTeams * 1.5;
    const performanceRatio = teamStandings.points / expectedPoints;
    modifier *= 0.9 + performanceRatio * 0.2;
  }

  const moraleModifiers: Record<string, number> = {
    Ecstatic: 1.15,
    Happy: 1.05,
    Content: 1.0,
    Unhappy: 0.9,
    "Very Unhappy": 0.8,
  };
  modifier *= moraleModifiers[player.morale] || 1.0;

  return clamp(modifier, 0.5, 1.5);
};

// ==================== PROMOÇÃO E REBAIXAMENTO (INTEGRADO) ====================

interface LeagueRulesType {
  teamCount: number;
  promoted: number;
  promotionPlayoff: number;
  relegated: number;
  relegationPlayoff: number;
  matchesPerSeason: number;
}

const getPromotedTeams = (
  finalTable: TeamStandings[],
  rules: LeagueRulesType,
  playerPosition: number,
): TeamStandings[] => {
  // Tier 1 não tem promoção
  if (rules.promoted === 0 && rules.promotionPlayoff === 0) return [];

  const directPromoted = finalTable.slice(0, rules.promoted);

  // Se há playoffs de promoção, simular (simplificado: pegar os próximos)
  let playoffPromoted: TeamStandings[] = [];
  if (rules.promotionPlayoff > 0) {
    // Normalmente 1 vaga via playoff dos próximos 4 times
    const playoffContenders = finalTable.slice(
      rules.promoted,
      rules.promoted + rules.promotionPlayoff,
    );
    if (playoffContenders.length >= 2) {
      // Simular playoff (simplificado: 50% de chance para cada um dos top 2)
      const winner =
        Math.random() < 0.6 ? playoffContenders[0] : playoffContenders[1];
      playoffPromoted = [winner];
    }
  }

  return [...directPromoted, ...playoffPromoted];
};

const getRelegatedTeams = (
  finalTable: TeamStandings[],
  rules: LeagueRulesType,
  currentTier: number,
  playerPosition: number,
  country: string,
): TeamStandings[] => {
  // Check if next tier exists
  const nextTier = currentTier + 1;
  const league = LEAGUES[country];
  const hasNextTier = league && getTeamsByTier(league, nextTier).length > 0;

  // Última divisão ou sem rebaixamento OU sem próxima divisão
  if (
    currentTier >= 5 ||
    (rules.relegated === 0 && rules.relegationPlayoff === 0) ||
    !hasNextTier
  ) {
    if (!hasNextTier && (rules.relegated > 0 || rules.relegationPlayoff > 0)) {
      console.warn(
        `[LeagueSim] Blocking relegation for ${country} Tier ${currentTier} -> ${nextTier} (No teams found)`,
      );
    }
    return [];
  }

  const totalTeams = finalTable.length;
  const directRelegated = finalTable.slice(totalTeams - rules.relegated);

  // Playoffs de rebaixamento (simplificado)
  let playoffRelegated: TeamStandings[] = [];
  if (rules.relegationPlayoff > 0) {
    const playoffZoneStart =
      totalTeams - rules.relegated - rules.relegationPlayoff;
    const playoffContenders = finalTable.slice(
      playoffZoneStart,
      totalTeams - rules.relegated,
    );

    // 40% de chance de cada time no playoff ser rebaixado
    playoffContenders.forEach((team) => {
      if (Math.random() < 0.4) {
        playoffRelegated.push(team);
      }
    });
  }

  // SAFEGUARD: Se o jogador está em posição segura, não pode ser rebaixado
  const safePosition = totalTeams - rules.relegated - rules.relegationPlayoff;
  const allRelegated = [...directRelegated, ...playoffRelegated];

  return allRelegated.filter((standing) => {
    const teamPosition = finalTable.indexOf(standing) + 1;
    // Se for o time do jogador e ele está em posição segura, não rebaixar
    if (teamPosition <= safePosition) {
      console.warn(
        `[LeagueSim] Safeguard: ${standing.team.name} está em posição ${teamPosition}, zona segura é até ${safePosition}`,
      );
      return false;
    }
    return true;
  });
};

// ==================== UTILITÁRIOS ====================

const getLeagueConfig = (
  country: string,
  tier: number,
): SeasonSimulationConfig => {
  const styleConfig =
    LEAGUE_STYLE_CONFIGS[country] || LEAGUE_STYLE_CONFIGS["default"];
  const rules = getLeagueRules(country, tier);
  const tierAdjustment = (tier - 1) * 0.03;

  return {
    ...DEFAULT_CONFIG,
    ...styleConfig,
    upsetFactor:
      (styleConfig.upsetFactor || DEFAULT_CONFIG.upsetFactor) + tierAdjustment,
    leagueQualityFactor: 1.0 - (tier - 1) * 0.15,
    matchesPerSeason: rules.matchesPerSeason,
  };
};

const createEmptyResult = (player: Player): LeagueSimulationResult => ({
  finalTable: [player.team],
  promoted: [],
  relegated: [],
  playerStats: {
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    rating: 0,
    position: 1,
  },
});

const logSeasonSummary = (
  context: CompetitionContext,
  finalTable: TeamStandings[],
  playerTeamName: string,
  playerStats: LeagueSimulationResult["playerStats"],
): void => {
  const champion = finalTable[0];
  const playerTeamStandings = finalTable.find(
    (s) => s.team.name === playerTeamName,
  );
  const rules = getLeagueRules(context.playerCountry, context.leagueTier);

  console.log(`
========== LEAGUE SEASON SUMMARY ==========
Country: ${context.playerCountry} | Tier: ${context.leagueTier}
Teams: ${finalTable.length} | Matches: ${rules.matchesPerSeason}
Champion: ${champion.team.name} (${champion.points} pts)
-------------------------------------------
Player Team: ${playerTeamName}
Position: ${playerStats.position}/${finalTable.length}
Points: ${playerTeamStandings?.points || 0}
Player Stats: ${playerStats.goals}G ${playerStats.assists}A | Rating: ${playerStats.rating.toFixed(1)}
-------------------------------------------
Promotion Zone: Top ${rules.promoted}${rules.promotionPlayoff > 0 ? ` + ${rules.promotionPlayoff} playoff` : ""}
Relegation Zone: Bottom ${rules.relegated}${rules.relegationPlayoff > 0 ? ` + ${rules.relegationPlayoff} playoff` : ""}
===========================================
`);
};

// ==================== EXPORTS ====================

export { sortStandings, simulateMatch, getLeagueConfig };

export type { TeamStandings, LeagueMatchResult, SeasonSimulationConfig };
