import { Player, CareerEvent, Position, PositionDetail, Team } from "../types";
import { rand, clamp, updateMorale, gaussianRandom, randFloat } from "./utils";
import { LEAGUES } from "../constants/leagues";
import { PlayGamesService } from "./playGamesService";

// ==================== CONSTANTES & CONFIGURAÇÕES ====================

const POSITION_TO_CATEGORY: Readonly<Record<PositionDetail, Position>> = {
  ST: "Attacker",
  CF: "Attacker",
  LW: "Attacker",
  RW: "Attacker",
  CAM: "Midfielder",
  CM: "Midfielder",
  CDM: "Midfielder",
  LM: "Midfielder",
  RM: "Midfielder",
  CB: "Defender",
  LB: "Defender",
  RB: "Defender",
  LWB: "Defender",
  RWB: "Defender",
  GK: "Goalkeeper",
} as const;

// Thresholds detalhados para prêmios
// AJUSTADOS para serem mais alcançáveis por jogadores de elite
const AWARD_THRESHOLDS = {
  BALLON_DOR: {
    // World Player
    MIN_OVERALL: 85, // Reduzido de 88
    MIN_PERFORMANCE: 0.78, // Reduzido de 0.82
    WIN_THRESHOLD: 380, // Reduzido de 480 - mais realista
    SCORE_DIVISOR: 90,
  },
  GOLDEN_BOY: {
    // Young Player
    MAX_AGE: 21,
    MIN_OVERALL: 78, // Reduzido de 80
    MIN_PERFORMANCE: 0.7, // Reduzido de 0.75
    WIN_THRESHOLD: 250, // Reduzido de 320
    SCORE_DIVISOR: 80,
  },
  FIFA_BEST: {
    // The Best
    MIN_OVERALL: 87, // Reduzido de 90
    WIN_THRESHOLD: 340, // Reduzido de 420
    SCORE_DIVISOR: 100,
  },
  GOLDEN_BOOT: { MIN_GOALS: 25, MAX_TIER: 4 }, // Reduzido de 30
  GOLDEN_SHOE: { MIN_GOALS: 35, MAX_TIER: 1 }, // Reduzido de 40
  GOLDEN_GLOVE: { MIN_CS: 15, MAX_TIER: 4 }, // Reduzido de 18
  TEAM_OF_YEAR: { MIN_RATING: 0.8, MIN_MATCHES: 25 }, // Reduzidos
} as const;

// Qualidade base das ligas (fallback se não calcular dinâmico)
const BASE_LEAGUE_QUALITY: Record<string, number> = {
  England: 100,
  Spain: 98,
  Germany: 95,
  Italy: 93,
  France: 90,
  Brazil: 85,
  Portugal: 82,
  Netherlands: 80,
  Argentina: 78,
  USA: 65,
  "Saudi Arabia": 62,
  Turkey: 72,
  default: 55,
};

// ==================== LEAGUE COEFFICIENT FOR GLOBAL AWARDS ====================
// Players in non-European top leagues are SEVERELY penalized for global awards
// This reflects the reality that 99% of Ballon d'Or winners play in Top 5 Europe

const LEAGUE_COEFFICIENT: Record<string, number> = {
  // Tier 1 Europe: Full coefficient (1.0x)
  England: 1.0,
  Spain: 1.0,
  Italy: 1.0,
  Germany: 1.0,
  France: 0.95,  // Slightly lower - Ligue 1 is less competitive

  // Tier 2 Europe: Good but not elite
  Portugal: 0.65,
  Netherlands: 0.60,
  Belgium: 0.50,
  Turkey: 0.45,

  // South America: Severely nerfed for GLOBAL awards (not regional)
  // A player with 40 goals in Brazil should lose to 25 goals in Premier League
  Brazil: 0.45,
  Argentina: 0.40,

  // Rest of World: Very low coefficient
  USA: 0.35,
  "Saudi Arabia": 0.35,
  China: 0.30,
  Japan: 0.40,
  Australia: 0.30,

  default: 0.30,
};

// Helper to get league coefficient
const getLeagueCoefficient = (country: string): number => {
  return LEAGUE_COEFFICIENT[country] ?? LEAGUE_COEFFICIENT.default;
};

// ==================== V4: BALLON D'OR ELIGIBILITY SYSTEM ====================
// Stricter tier-based eligibility rules based on real-world patterns:
// - Tier 1 (Top 5 Europe): Always eligible
// - Tier 2 (Portugal, Netherlands, Brazil, Argentina): Eligible IF won continental OR World Cup
// - Tier 3+ (MLS, Saudi, etc): Eligible ONLY IF won World Cup AND was tournament MVP

interface LeagueTierConfig {
  tier: 1 | 2 | 3 | 4;
  globalWeight: number;
  domesticAwardsOnly: boolean;
}

const LEAGUE_TIER_CONFIG: Record<string, LeagueTierConfig> = {
  // Tier 1: Full global award eligibility
  England: { tier: 1, globalWeight: 1.0, domesticAwardsOnly: false },
  Spain: { tier: 1, globalWeight: 1.0, domesticAwardsOnly: false },
  Germany: { tier: 1, globalWeight: 0.95, domesticAwardsOnly: false },
  Italy: { tier: 1, globalWeight: 0.95, domesticAwardsOnly: false },
  France: { tier: 1, globalWeight: 0.90, domesticAwardsOnly: false },
  
  // Tier 2: Conditional eligibility (requires continental success)
  Brazil: { tier: 2, globalWeight: 0.70, domesticAwardsOnly: false },
  Argentina: { tier: 2, globalWeight: 0.65, domesticAwardsOnly: false },
  Portugal: { tier: 2, globalWeight: 0.70, domesticAwardsOnly: false },
  Netherlands: { tier: 2, globalWeight: 0.65, domesticAwardsOnly: false },
  Mexico: { tier: 2, globalWeight: 0.60, domesticAwardsOnly: false },
  Turkey: { tier: 2, globalWeight: 0.55, domesticAwardsOnly: false },
  
  // Tier 3: Domestic awards only (unless exceptional circumstances)
  USA: { tier: 3, globalWeight: 0.40, domesticAwardsOnly: true },
  "Saudi Arabia": { tier: 3, globalWeight: 0.35, domesticAwardsOnly: true },
  Japan: { tier: 3, globalWeight: 0.45, domesticAwardsOnly: true },
  China: { tier: 3, globalWeight: 0.30, domesticAwardsOnly: true },
  Australia: { tier: 3, globalWeight: 0.35, domesticAwardsOnly: true },
  
  // Tier 4: Domestic only
  default: { tier: 4, globalWeight: 0.20, domesticAwardsOnly: true },
};

/**
 * V4: Check if player is eligible for Ballon d'Or based on league tier and achievements
 * 
 * Eligibility Requirements:
 * 1. League Tier 1: Always eligible
 * 2. League Tier 2: Eligible IF won continental title OR World Cup in voting year
 * 3. League Tier 3-4: Eligible ONLY IF won World Cup AND was best player
 */
const checkBallonDorEligibility = (
  player: Player,
  seasonResults: SeasonResults,
  performanceRating: number,
): { eligible: boolean; reason: string } => {
  const config = LEAGUE_TIER_CONFIG[player.team.country] ?? LEAGUE_TIER_CONFIG.default;
  
  // Tier 1: Automatic eligibility
  if (config.tier === 1) {
    return { eligible: true, reason: "Top 5 European league" };
  }
  
  // Tier 2: Conditional eligibility
  if (config.tier === 2) {
    const wonContinental = seasonResults.wonContinental || seasonResults.wonSecondaryContinental;
    const wonWorldCup = seasonResults.wonWorldCup;
    
    if (wonContinental) {
      return { eligible: true, reason: "Continental champion elevates candidacy" };
    }
    if (wonWorldCup) {
      return { eligible: true, reason: "World Cup winner elevates candidacy" };
    }
    
    // Exception: Truly exceptional season (50+ goals) can break through
    // Note: We calculate total goals from expandedData attacking stats by summing goals by period
    const attackingStats = player.expandedData?.attackingStats;
    const seasonGoals = attackingStats 
      ? (attackingStats.goals0to15 || 0) + (attackingStats.goals15to30 || 0) + 
        (attackingStats.goals30to45 || 0) + (attackingStats.goals45to60 || 0) + 
        (attackingStats.goals60to75 || 0) + (attackingStats.goals75to90Plus || 0)
      : 0;
    if (seasonGoals >= 50) {
      return { eligible: true, reason: "Exceptional season (50+ goals) transcends league tier" };
    }
    
    return { 
      eligible: false, 
      reason: "Tier 2 league requires continental/international success for Ballon d'Or" 
    };
  }
  
  // Tier 3-4: Exceptional circumstances only
  if (config.tier >= 3) {
    // Only World Cup winner with exceptional performance
    const wonWorldCupAsMVP = seasonResults.wonWorldCup && performanceRating >= 0.85;
    
    if (wonWorldCupAsMVP) {
      return { eligible: true, reason: "World Cup winner with exceptional performance transcends league limitations" };
    }
    
    return { 
      eligible: false, 
      reason: "League tier insufficient for global award consideration" 
    };
  }
  
  return { eligible: false, reason: "Unknown eligibility status" };
};

// ==================== TIPOS ====================

export interface SeasonResults {
  wonLeague: boolean;
  wonCup: boolean;
  wonContinental: boolean;
  wonSecondaryContinental: boolean;
  wonClubWorldCup: boolean;
  wonWorldCup: boolean;

  leaguePosition: number;
  continentalCompetitionName?: string | null;
}

interface SeasonContext {
  leagueQuality: number;
  teamStrength: "Dominant" | "Contender" | "MidTable" | "Underdog";
  narrative: string;
}

interface AwardCandidate {
  player: Player;
  score: number;
  narrative: string;
}

export interface AwardResult {
  updatedPlayer: Player;
  events: CareerEvent[];
  followerGrowth: number;
  votingResults: { award: string; winner: string; score: number }[];
}

export interface BigGamePerformance {
  opponent: string;
  importance: "Derby" | "Title Decider" | "Cup Final" | "Continental KO";
  rating: number;
  goals: number;
  assists: number;
  result: "Win" | "Draw" | "Loss";
}

// ==================== HELPERS DE ESTATÃSTICAS NPC (TURBINADOS) ====================

/**
 * Gera artilheiros NPC com valores realistas
 * Ajustado para que temporadas excepcionais do jogador sejam recompensadas
 */
const generateNpcScorers = (
  leagueQuality: number,
  leagueTier: number,
  competitionType: "League" | "Cup" | "Continental" = "League",
  playerGoals: number = 0, // Novo: gols do jogador para calibrar NPCs
): { name: string; goals: number; team: string }[] => {
  const scorers: { name: string; goals: number; team: string }[] = [];

  // Configuração base por competição - MAIS REALISTA
  let baseMean = 28; // Média mais realista (antes era 35)
  let baseStdDev = 5;
  let minGoals = 18;
  let maxGoals = 50; // Máximo mais realista (antes era 60)

  if (competitionType === "Cup") {
    baseMean = 5;
    baseStdDev = 2;
    minGoals = 3;
    maxGoals = 12;
  } else if (competitionType === "Continental") {
    baseMean = 8;
    baseStdDev = 3;
    minGoals = 5;
    maxGoals = 18;
  }

  // 1. Base aleatória
  let baseGoals = gaussianRandom(baseMean, baseStdDev);

  // 2. Modificador de qualidade da liga
  if (competitionType !== "Cup") {
    const qualityModifier = 0.85 + (leagueQuality / 100) * 0.25;
    baseGoals *= qualityModifier;
  }

  // 3. Modificador de Tier
  if (leagueTier === 2) baseGoals *= 0.85;
  else if (leagueTier >= 3) baseGoals *= 0.75;

  // 4. CHANCE DE "MONSTRO" - Apenas se o jogador NÃO estiver tendo temporada lendária
  // Se o jogador fez 40+ gols, a chance de aparecer outro monstro é muito menor
  if (leagueTier === 1 && competitionType === "League") {
    let monsterChance = 0.05;
    if (playerGoals >= 50)
      monsterChance = 0.01; // Quase impossível
    else if (playerGoals >= 40) monsterChance = 0.02;
    else if (playerGoals >= 35) monsterChance = 0.03;

    if (Math.random() < monsterChance) {
      baseGoals *= 1.3; // Multiplicador reduzido (antes era 1.4)
    }
  }

  const topScorerGoals = Math.round(clamp(baseGoals, minGoals, maxGoals));

  scorers.push({
    name: "Star Striker",
    goals: topScorerGoals,
    team: "Rival Team",
  });

  scorers.push({
    name: "Elite Forward",
    goals: Math.max(minGoals - 1, Math.round(topScorerGoals * 0.85)),
    team: "Another Team",
  });

  return scorers.sort((a, b) => b.goals - a.goals);
};

const simulateNpcTopAssister = (
  leagueQuality: number,
  leagueTier: number,
): number => {
  // Aumentei um pouco a média de assistências também (De Bruyne / Messi levels)
  let baseAssists = gaussianRandom(17, 4);

  const qualityModifier = 0.8 + (leagueQuality / 100) * 0.25;
  baseAssists *= qualityModifier;

  if (leagueTier === 2) baseAssists *= 0.95;
  else if (leagueTier >= 3) baseAssists *= 0.85;

  return Math.round(clamp(baseAssists, 10, 25));
};

const simulateNpcTopGoalkeeperCleanSheets = (
  leagueQuality: number,
  leagueTier: number,
  playerCleanSheets: number,
): number => {
  let baseCS = gaussianRandom(16, 3);

  const qualityModifier = 0.9 + (leagueQuality / 100) * 0.1;
  baseCS *= qualityModifier;

  if (leagueTier === 2) baseCS *= 0.9;
  else if (leagueTier >= 3) baseCS *= 0.8;

  // Garante desafio
  const minCS = Math.max(12, Math.round(playerCleanSheets * 0.9));
  return Math.max(minCS, Math.round(clamp(baseCS, 12, 24)));
};

/**
 * Gera score posicional NPC para competição de prêmios (Best Defender, Midfielder, Forward)
 * AJUSTADO: NPCs são mais competitivos - representam os melhores jogadores de cada liga
 * Jogadores precisam ser verdadeiramente excepcionais (85+ OVR, rating alto) para ganhar consistentemente
 */
const generateNpcPositionalScore = (
  position: Position,
  leagueQuality: number,
  leagueTier: number,
): number => {
  // Simula o OVR do melhor jogador NPC da posição na liga
  // Ligas top-5: melhores jogadores têm 86-92 OVR
  // Ligas médias: 82-88 OVR
  // Ligas fracas: 75-82 OVR
  let npcOvr: number;
  if (leagueQuality >= 95) {
    npcOvr = gaussianRandom(89, 2); // 87-91
  } else if (leagueQuality >= 85) {
    npcOvr = gaussianRandom(86, 2); // 84-88
  } else if (leagueQuality >= 70) {
    npcOvr = gaussianRandom(82, 3); // 79-85
  } else {
    npcOvr = gaussianRandom(78, 3); // 75-81
  }

  // Tier da liga afeta diretamente
  if (leagueTier === 2) npcOvr -= 4;
  else if (leagueTier >= 3) npcOvr -= 8;

  npcOvr = clamp(npcOvr, 70, 94);

  // Simula stats do NPC baseado no OVR
  let npcGoals = 0,
    npcAssists = 0,
    npcCleanSheets = 0,
    npcMatches = 35;

  if (position === "Defender") {
    npcCleanSheets = Math.round(gaussianRandom(14, 3) * (npcOvr / 85));
    npcAssists = Math.round(gaussianRandom(5, 2) * (npcOvr / 85));
    npcGoals = Math.round(gaussianRandom(2, 1));
  } else if (position === "Midfielder") {
    npcGoals = Math.round(gaussianRandom(8, 3) * (npcOvr / 85));
    npcAssists = Math.round(gaussianRandom(10, 3) * (npcOvr / 85));
    npcCleanSheets = 0;
  } else if (position === "Attacker") {
    npcGoals = Math.round(gaussianRandom(20, 5) * (npcOvr / 85));
    npcAssists = Math.round(gaussianRandom(8, 3) * (npcOvr / 85));
    npcCleanSheets = 0;
  }

  // Calcula score do NPC usando a mesma fórmula do jogador
  let npcScore = 0;
  if (position === "Attacker") {
    npcScore = npcGoals * 3 + npcAssists * 2 + npcOvr * 0.5;
  } else if (position === "Midfielder") {
    npcScore = npcGoals * 2.5 + npcAssists * 2.5 + npcOvr * 0.5;
  } else if (position === "Defender") {
    // Assume que Ã© um fullback competitivo (TAA, Hakimi level)
    npcScore =
      npcCleanSheets * 1.5 +
      npcMatches * 1.0 +
      npcAssists * 3.0 +
      npcGoals * 2.5 +
      npcOvr * 0.6;
  }

  // Adiciona OVR do NPC ao score final (consistente com o cálculo do jogador)
  npcScore += npcOvr * 0.8;

  // Adiciona bônus aleatório de "performance" do NPC (rating alto)
  const npcRatingBonus = gaussianRandom(10, 5);
  npcScore += Math.max(0, npcRatingBonus);

  // Chance de aparecer um jogador absolutamente excepcional (10% chance)
  if (Math.random() < 0.1) {
    npcScore *= 1.15;
  }

  return npcScore;
};

// ==================== FUNÇÕES AUXILIARES ====================

const analyzeSeasonContext = (player: Player): SeasonContext => {
  const leagueName = player.team.league?.name || "Unknown League";
  const country = player.team.country;

  // 1. Determinar Qualidade da Liga (0-100)
  let leagueQuality =
    BASE_LEAGUE_QUALITY[country] || BASE_LEAGUE_QUALITY.default;

  // Ajuste por Tier
  if (player.team.leagueTier === 2) leagueQuality *= 0.6;
  else if (player.team.leagueTier >= 3) leagueQuality *= 0.4;

  // 2. Determinar Força do Time
  let teamStrength: SeasonContext["teamStrength"] = "MidTable";
  if (player.team.reputation >= 85) teamStrength = "Dominant";
  else if (player.team.reputation >= 75) teamStrength = "Contender";
  else if (player.team.reputation <= 60) teamStrength = "Underdog";

  return {
    leagueQuality,
    teamStrength,
    narrative: `Playing for ${teamStrength} team in ${country}`,
  };
};

const calculateAwardScore = (
  player: Player,
  rating: number,
  stats: { goals: number; assists: number; cleanSheets: number },
  results: SeasonResults,
  context: SeasonContext,
  bigGames: BigGamePerformance[],
): { score: number; breakdown: any } => {
  let score = 0;
  const breakdown: any = {};

  // 1. Performance Base (0-200)
  const performanceScore = (rating - 6.0) * 100;
  score += performanceScore;
  breakdown.performance = performanceScore;

  // 2. Estatísticas (0-300)
  let statsScore = 0;
  if (player.position === "GK") {
    statsScore += stats.cleanSheets * 10;
  } else {
    statsScore += stats.goals * 8 + stats.assists * 6;
  }
  score += statsScore;
  breakdown.stats = statsScore;

  // v0.5.2: Bônus por qualidade de gols (expandedData)
  let qualityBonus = 0;
  if (player.expandedData) {
    const atk = player.expandedData.attackingStats;

    // Golazos (gols de baixo xG) - relevante para Puskás Award também
    if (atk.golazosCount && atk.golazosCount > 0) {
      qualityBonus += atk.golazosCount * 15; // Cada golazo vale muito
    }

    // Eficiência clínica: gols vs xG
    if (atk.xG > 0 && stats.goals > 0) {
      const clinicalRatio = stats.goals / atk.xG;
      if (clinicalRatio > 1.2) {
        // Superou xG em 20%+
        qualityBonus += (clinicalRatio - 1) * 50;
      } else if (clinicalRatio < 0.8) {
        // Desperdiçou chances (penalidade leve)
        qualityBonus -= (1 - clinicalRatio) * 20;
      }
    }

    // Gols de fora da área (habilidade especial)
    if (atk.goalsOutsideBox && atk.goalsOutsideBox > 5) {
      qualityBonus += (atk.goalsOutsideBox - 5) * 5;
    }

    // Gols decisivos
    if (atk.gameWinningGoals && atk.gameWinningGoals > 0) {
      qualityBonus += atk.gameWinningGoals * 8;
    }
  }
  score += qualityBonus;
  breakdown.qualityBonus = qualityBonus;

  // 3. Conquistas (0-400)
  let trophyScore = 0;
  if (results.wonWorldCup) trophyScore += 250;
  if (results.wonContinental) trophyScore += 150; // Champions League
  if (results.wonLeague) trophyScore += 80; // Premier League
  if (results.wonCup) trophyScore += 30;
  if (results.wonSecondaryContinental) trophyScore += 60; // Europa League
  if (results.wonClubWorldCup) trophyScore += 100;

  // Ajuste por dificuldade da liga
  trophyScore *= context.leagueQuality / 100;
  score += trophyScore;
  breakdown.trophies = trophyScore;

  // 4. Jogos Grandes (0-100)
  let clutchScore = 0;
  bigGames.forEach((game) => {
    if (game.result === "Win" && game.rating >= 7.5) {
      clutchScore += game.importance === "Cup Final" ? 20 : 10;
    }
  });
  score += clutchScore;
  breakdown.clutch = clutchScore;

  // 5. Reputação/Narrativa (0-100)
  const reputationScore = player.reputation * 0.5;
  score += reputationScore;
  breakdown.reputation = reputationScore;

  // 6. NOVO: Bônus de OVR para jogadores de elite (0-100)
  // Jogadores com OVR 90+ merecem mais chances de prêmios
  let ovrBonus = 0;
  if (player.stats.overall >= 95) ovrBonus = 100;
  else if (player.stats.overall >= 92) ovrBonus = 70;
  else if (player.stats.overall >= 90) ovrBonus = 50;
  else if (player.stats.overall >= 87) ovrBonus = 25;
  score += ovrBonus;
  breakdown.ovrBonus = ovrBonus;

  return { score, breakdown };
};

// Função para calcular score posicional (usada em prêmios de melhor defensor/meia/atacante)
function calculatePositionalScore(
  player: Player,
  rawStats: {
    goals: number;
    assists: number;
    cleanSheets: number;
    matchesPlayed: number;
  },
) {
  const pos = POSITION_TO_CATEGORY[player.position];
  const position = player.position.toUpperCase();
  let score = 0;

  if (pos === "Attacker") {
    // Atacantes: gols são o principal, assistências secundário
    score =
      rawStats.goals * 3 + rawStats.assists * 2 + player.stats.overall * 0.5;
  } else if (pos === "Midfielder") {
    // Meias: equilibrado entre gols e assistências
    score =
      rawStats.goals * 2.5 +
      rawStats.assists * 2.5 +
      player.stats.overall * 0.5;
  } else if (pos === "Defender") {
    // Defensores: base em clean sheets e jogos, MAS laterais ganham bônus por contribuições ofensivas
    const isFullback = ["LB", "RB", "LWB", "RWB"].includes(position);

    if (isFullback) {
      // Laterais: valorizamos assistências e gols também (estilo TAA, Hakimi)
      score =
        rawStats.cleanSheets * 1.5 +
        rawStats.matchesPlayed * 1.0 +
        rawStats.assists * 3.0 + // Assistências são muito valorizadas para laterais
        rawStats.goals * 2.5 + // Gols também contam
        player.stats.overall * 0.6;
    } else {
      // Zagueiros: foco em solidez defensiva
      score =
        rawStats.cleanSheets * 2.5 +
        rawStats.matchesPlayed * 1.5 +
        rawStats.assists * 1.5 +
        rawStats.goals * 2.0 + // Gols de cabeça em escanteios
        player.stats.overall * 0.4;
    }
  } else if (pos === "Goalkeeper") {
    score =
      rawStats.cleanSheets * 3 +
      rawStats.matchesPlayed * 1.2 +
      player.stats.overall * 0.4;
  }

  return score;
}

// ==================== SIMULAÇÃO PRINCIPAL (CORRIGIDA) ====================

export const simulateAwards = (
  player: Player,
  originalPlayer: Player,
  performanceRating: number,
  rawStats: {
    goals: number;
    assists: number;
    cleanSheets: number;
    matchesPlayed: number;
  },
  seasonResults: SeasonResults,
  bigGamePerformances: BigGamePerformance[] = [],
  wasSeverelyInjuredLastSeason: boolean = false,
  debug: boolean = false,
  // TORNANDO OBRIGATÓRIO O USO DE statsByType PARA PRÊMIOS ESPECÍFICOS
  statsByType: {
    league: { goals: number; assists: number; cleanSheets: number };
    cup: { goals: number; assists: number; cleanSheets: number };
    continental: { goals: number; assists: number; cleanSheets: number };
    international: { goals: number; assists: number; cleanSheets: number };
  } = {
      // Valor default zerado para evitar crash, mas não usa rawStats
      league: { goals: 0, assists: 0, cleanSheets: 0 },
      cup: { goals: 0, assists: 0, cleanSheets: 0 },
      continental: { goals: 0, assists: 0, cleanSheets: 0 },
      international: { goals: 0, assists: 0, cleanSheets: 0 },
    },
): AwardResult => {
  const events: CareerEvent[] = [];
  let followerGrowth = 0;
  const votingResults: { award: string; winner: string; score: number }[] = [];
  const context = analyzeSeasonContext(player);
  const pos = POSITION_TO_CATEGORY[player.position];

  // Helper SEGURO: Se não tiver o stat, retorna 0, NÃO o total
  const getStats = (type: keyof typeof statsByType) => {
    return statsByType[type] || { goals: 0, assists: 0, cleanSheets: 0 };
  };

  const leagueStats = getStats("league");
  const cupStats = getStats("cup");
  const continentalStats = getStats("continental");

  // Cálculo do Score Principal (Ballon d'Or usa stats totais mesmo, isso está ok)
  const { score: mainScore, breakdown } = calculateAwardScore(
    player,
    performanceRating,
    rawStats, // Ballon d'Or olha a temporada inteira
    seasonResults,
    context,
    bigGamePerformances,
  );

  if (debug) {
    console.log(`[Awards] Score: ${mainScore.toFixed(1)}`, breakdown);
  }

  // ==================== 1. BALLON D'OR (THE BIG ONE) ====================
  // V4: STRICTER ELIGIBILITY - Use tier-based eligibility system
  const eligibility = checkBallonDorEligibility(player, seasonResults, performanceRating);
  
  // Apply League Coefficient for score weighting
  const leagueCoeff = getLeagueCoefficient(player.team.country);
  const adjustedMainScore = mainScore * leagueCoeff;

  // Hard filter: For global awards, prioritize players in elite clubs OR European competitions
  const isInEliteClub = player.team.reputation >= 85;
  const playedInEurope = seasonResults.wonContinental || seasonResults.wonSecondaryContinental ||
    (seasonResults.continentalCompetitionName &&
      (seasonResults.continentalCompetitionName.includes('Champions') ||
        seasonResults.continentalCompetitionName.includes('Europa')));
  const isEuropeanLeague = leagueCoeff >= 0.70;

  // Generate NPC world-class candidates (always from Top 5 Europe)
  const npcWorldScore = gaussianRandom(350, 40); // Top players in Europe typically score 310-390
  const npcHasChampionsLeague = Math.random() < 0.4; // 40% chance NPC won CL
  const npcAdjustedScore = npcWorldScore + (npcHasChampionsLeague ? 100 : 0);

  if (debug) {
    console.log(`[Awards] Ballon d'Or: Raw=${mainScore.toFixed(0)}, Coeff=${leagueCoeff}, Adjusted=${adjustedMainScore.toFixed(0)}, NPC=${npcAdjustedScore.toFixed(0)}`);
    console.log(`[Awards] Eligibility: ${eligibility.eligible} - ${eligibility.reason}`);
    console.log(`[Awards] Elite club: ${isInEliteClub}, European comp: ${playedInEurope}, European league: ${isEuropeanLeague}`);
  }

  // V4: Use new eligibility system - must pass tier check
  const meetsVisibilityReq = eligibility.eligible;
  const hasExceptionalSeason = rawStats.goals >= 50 || (rawStats.goals >= 40 && rawStats.assists >= 15);

  if (adjustedMainScore >= AWARD_THRESHOLDS.BALLON_DOR.WIN_THRESHOLD) {
    // REALISMO: Precisa de título SIGNIFICATIVO OU temporada excepcional
    // v0.5.6: Corrigido - ganhar liga de Portugal/Holanda NÃO é suficiente para Ballon d'Or
    // Apenas ligas Top 5 (Tier 1) contam título de liga como "major title"
    const config = LEAGUE_TIER_CONFIG[player.team.country] ?? LEAGUE_TIER_CONFIG.default;
    const leagueTitleCountsAsMajor = config.tier === 1; // Só Top 5 Europa
    
    const hasMajorTitle =
      seasonResults.wonContinental ||
      seasonResults.wonSecondaryContinental ||
      (seasonResults.wonLeague && leagueTitleCountsAsMajor) || // Liga só conta se Tier 1
      seasonResults.wonWorldCup ||
      seasonResults.wonClubWorldCup;

    if (!meetsVisibilityReq && !hasExceptionalSeason) {
      // Player in minor league without exceptional stats = no global award
      if (debug) {
        console.log(`[Awards] Ballon d'Or BLOCKED: No visibility from minor league (${player.team.country})`);
      }
      events.push({
        type: "award_nomination",
        description: `events.award.ballonDorNomination`, // Just nomination
      });
    } else if (!hasMajorTitle && !hasExceptionalSeason) {
      // Sem título significativo E sem temporada excepcional = apenas top 3
      events.push({
        type: "award_nomination",
        description: `events.award.ballonDorRunnerUp`,
      });
      votingResults.push({
        award: "World Player of the Year",
        winner: "Continental Champion",
        score: adjustedMainScore + 30,
      });
    } else if (adjustedMainScore > npcAdjustedScore) {
      // Player beats NPC candidates
      const margin = adjustedMainScore - npcAdjustedScore;
      let winChance = margin >= 80 ? 0.85 : margin >= 40 ? 0.65 : 0.45;

      // Bonus for truly exceptional seasons
      if (rawStats.goals >= 50) winChance += 0.15;
      else if (rawStats.goals >= 40) winChance += 0.08;

      // Bonus for major titles
      if (seasonResults.wonContinental) winChance += 0.1;
      if (seasonResults.wonWorldCup) winChance += 0.15;

      // If player absolutely dominated, guarantee win
      if (adjustedMainScore >= 600 && margin >= 100) winChance = 0.95;

      winChance = Math.min(winChance, 0.95);

      if (Math.random() < winChance) {
        player.awards.worldPlayerAward++;
        events.push({
          type: "ballon_dor_win",
          description: `events.award.ballonDor`,
          metadata: {
            year: new Date().getFullYear(),
            stats: `${rawStats.goals}G ${rawStats.assists}A`,
          },
        });
        followerGrowth += rand(3000000, 8000000);
        votingResults.push({
          award: "World Player of the Year",
          winner: player.name,
          score: adjustedMainScore,
        });

        // Verificar conquista de Melhor do Mundo em tempo real
        PlayGamesService.checkAwardAchievements(player);
      } else {
        events.push({
          type: "award_nomination",
          description: `events.award.ballonDorRunnerUp`,
        });
        votingResults.push({
          award: "World Player of the Year",
          winner: "Star Striker",
          score: npcAdjustedScore,
        });
      }
    } else {
      // NPC won
      events.push({
        type: "award_nomination",
        description: `events.award.ballonDorRunnerUp`,
      });
      votingResults.push({
        award: "World Player of the Year",
        winner: npcHasChampionsLeague ? "Champions League Winner" : "European Star",
        score: npcAdjustedScore,
      });
    }
  } else if (adjustedMainScore >= AWARD_THRESHOLDS.BALLON_DOR.WIN_THRESHOLD * 0.75) {
    events.push({
      type: "award_nomination",
      description: `events.award.ballonDorNomination`,
    });
  }

  // ==================== 2. FIFA THE BEST ====================
  if (mainScore >= AWARD_THRESHOLDS.FIFA_BEST.WIN_THRESHOLD) {
    // Mesma lógica: precisa de títulos ou temporada excepcional
    const hasMajorTitleFifa =
      seasonResults.wonContinental ||
      seasonResults.wonSecondaryContinental ||
      seasonResults.wonLeague ||
      seasonResults.wonWorldCup;
    const hasGreatSeasonFifa = rawStats.goals >= 40;

    if ((hasMajorTitleFifa || hasGreatSeasonFifa) && Math.random() < 0.5) {
      player.awards.fifaBestAward++;
      events.push({
        type: "fifa_best_win",
        description: `events.award.fifaBest`,
      });
      followerGrowth += rand(1500000, 4000000);
    }
  }

  // ==================== 3. GOLDEN BOY (U21) ====================
  if (
    player.age <= AWARD_THRESHOLDS.GOLDEN_BOY.MAX_AGE &&
    mainScore >= AWARD_THRESHOLDS.GOLDEN_BOY.WIN_THRESHOLD
  ) {
    if (Math.random() < 0.7) {
      player.awards.youngPlayerAward++;
      events.push({
        type: "golden_boy_win",
        description: `events.award.goldenBoy`,
      });
      followerGrowth += rand(1000000, 3000000);

      // ðŸŽ® Verificar conquista de Young Player em tempo real
      PlayGamesService.checkAwardAchievements(player);
    }
  }

  // ==================== 4. TEAM OF THE YEAR ====================
  if (
    performanceRating >= AWARD_THRESHOLDS.TEAM_OF_YEAR.MIN_RATING &&
    rawStats.matchesPlayed >= AWARD_THRESHOLDS.TEAM_OF_YEAR.MIN_MATCHES
  ) {
    player.awards.teamOfTheYear++;
    events.push({
      type: "team_of_the_year_win",
      description: `events.award.teamOfTheYear`,
    });
  }

  // ==================== 4.5 LEAGUE PLAYER OF THE YEAR (MVP DA LIGA) ====================
  // Prêmio importante para qualquer posição - o melhor jogador da liga na temporada
  // Threshold menor que Ballon d'Or, focado em performance na liga
  const leaguePlayerThreshold = 280; // Menor que Ballon d'Or (380)

  if (mainScore >= leaguePlayerThreshold && rawStats.matchesPlayed >= 28) {
    // Gera score de NPCs competidores
    const npcLeagueMvpScore =
      gaussianRandom(300, 50) * (context.leagueQuality / 100);

    // BÃ´nus se ganhou a liga
    const leagueWinBonus = seasonResults.wonLeague ? 40 : 0;
    const playerLeagueMvpScore = mainScore + leagueWinBonus;

    if (playerLeagueMvpScore > npcLeagueMvpScore) {
      // Chance baseada na margem
      const margin = playerLeagueMvpScore - npcLeagueMvpScore;
      let winChance = margin >= 50 ? 0.75 : margin >= 25 ? 0.55 : 0.4;

      // BÃ´nus para jogadores de elite
      if (player.stats.overall >= 90) winChance += 0.15;

      winChance = Math.min(winChance, 0.9);

      if (Math.random() < winChance) {
        player.awards.leaguePlayerOfYear =
          (player.awards.leaguePlayerOfYear || 0) + 1;
        events.push({
          type: "award_win",
          description: `events.award.leaguePlayerOfYear`,
          metadata: {
            league: player.team.league?.name || player.team.country,
          },
        });
        followerGrowth += rand(800000, 2500000);

        PlayGamesService.checkAwardAchievements(player);
      }
    }
  }

  // ==================== 5. PRÊMIOS ESTATÍSTICOS (CORRIGIDO) ====================

  // GOLDEN BOOT (ARTILHEIRO DA LIGA)
  // Agora usa estritamente leagueStats.goals
  if (pos === "Attacker" || (pos === "Midfielder" && leagueStats.goals >= 15)) {
    const npcScorers = generateNpcScorers(
      context.leagueQuality,
      player.team.leagueTier,
      "League",
      leagueStats.goals, // Passa gols do jogador para calibrar NPCs
    );

    const topNpcGoals = npcScorers[0].goals;

    // Debug para você ver o que está acontecendo
    if (debug) {
      console.log(
        `[Awards] League Golden Boot: Player (${leagueStats.goals}) vs NPC (${topNpcGoals})`,
      );
    }

    if (leagueStats.goals > topNpcGoals) {
      player.awards.topScorerAward++;
      events.push({
        type: "golden_boot_win",
        description: `events.award.goldenBoot`, // "League Golden Boot"
        metadata: {
          goals: leagueStats.goals, // Mostra só gols da liga
          runnerUp: npcScorers[0].name,
          runnerUpGoals: npcScorers[0].goals,
        },
      });
      followerGrowth += rand(500000, 1500000);

      // Verificar conquista de Top Scorer em tempo real
      PlayGamesService.checkAwardAchievements(player);
    } else if (leagueStats.goals === topNpcGoals) {
      // Empate?
      events.push({
        type: "milestone",
        description: `events.award.goldenBootShared`,
        descriptionParams: { goals: topNpcGoals },
      });
    }
  }

  // CUP TOP SCORER (CORRIGIDO COM NPC)
  if (seasonResults.wonCup || cupStats.goals >= 4) {
    const npcCupScorers = generateNpcScorers(
      context.leagueQuality,
      player.team.leagueTier,
      "Cup",
      cupStats.goals,
    );
    const topNpcCupGoals = npcCupScorers[0].goals;

    if (cupStats.goals > topNpcCupGoals) {
      player.awards.cupTopScorer = (player.awards.cupTopScorer || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.cupTopScorer`,
        metadata: {
          goals: cupStats.goals,
          runnerUp: npcCupScorers[0].name,
          runnerUpGoals: npcCupScorers[0].goals,
        },
      });
    } else if (cupStats.goals === topNpcCupGoals) {
      events.push({
        type: "milestone",
        description: `events.award.cupGoldenBootShared`,
        descriptionParams: { goals: topNpcCupGoals },
      });
    }
  }

  // CONTINENTAL TOP SCORER (CORRIGIDO COM NPC)
  if (
    seasonResults.wonContinental ||
    (seasonResults.continentalCompetitionName && continentalStats.goals >= 6)
  ) {
    const npcContinentalScorers = generateNpcScorers(
      context.leagueQuality,
      player.team.leagueTier,
      "Continental",
      continentalStats.goals,
    );
    const topNpcContinentalGoals = npcContinentalScorers[0].goals;

    if (continentalStats.goals > topNpcContinentalGoals) {
      player.awards.continentalCompetitionTopScorer =
        (player.awards.continentalCompetitionTopScorer || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.continentalCompetitionTopScorer`,
        metadata: {
          competition:
            seasonResults.continentalCompetitionName || "Continental Cup",
          goals: continentalStats.goals,
          runnerUp: npcContinentalScorers[0].name,
          runnerUpGoals: npcContinentalScorers[0].goals,
        },
      });
    }
  }

  // PLAYMAKER (ASSISTÃŠNCIAS DA LIGA)
  // Usa estritamente leagueStats.assists
  if (pos === "Midfielder" || pos === "Attacker") {
    const npcTopAssists = simulateNpcTopAssister(
      context.leagueQuality,
      player.team.leagueTier,
    );

    if (leagueStats.assists >= npcTopAssists) {
      player.awards.leagueTopAssister =
        (player.awards.leagueTopAssister || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.leaguePlaymaker`,
        metadata: { assists: leagueStats.assists },
      });
    }
  }

  // GOLDEN SHOE (CHUTEIRA DE OURO EUROPEIA)
  // HistÃ³rico real: Messi/CR7 ganhavam com 30-50 gols, outros com 25-35
  const isTopLeague =
    context.leagueQuality >= 85 &&
    ["England", "Spain", "Germany", "Italy", "France"].includes(
      player.team.country,
    );

  // NPC competidor para Chuteira de Ouro - valores histÃ³ricos reais
  // MÃ­nimo 25 gols para competir, mÃ©dia ~30, pode chegar a 36+ em anos excepcionais
  let europeanTopScorerGoals = Math.round(gaussianRandom(30, 4));
  europeanTopScorerGoals = clamp(europeanTopScorerGoals, 25, 40); // MÃ­nimo 25, mÃ¡ximo 40

  // Se o jogador fez temporada lendÃ¡ria (40+ gols), a competiÃ§Ã£o Ã© menor
  if (leagueStats.goals >= 45)
    europeanTopScorerGoals = Math.min(europeanTopScorerGoals, 35);
  else if (leagueStats.goals >= 40)
    europeanTopScorerGoals = Math.min(europeanTopScorerGoals, 38);

  if (pos === "Attacker" && player.team.leagueTier === 1 && isTopLeague) {
    if (leagueStats.goals > europeanTopScorerGoals) {
      player.awards.continentalTopScorer++; // Reutilizando campo ou crie goldenShoe
      events.push({
        type: "award_win",
        description: `events.award.europeanGoldenShoe`,
        metadata: { goals: leagueStats.goals },
      });
      followerGrowth += rand(2000000, 5000000);
    }
  }

  // GOLDEN GLOVE (LUVAS DE OURO - LIGA)
  if (pos === "Goalkeeper") {
    const npcTopCS = simulateNpcTopGoalkeeperCleanSheets(
      context.leagueQuality,
      player.team.leagueTier,
      leagueStats.cleanSheets,
    );
    // Usa estritamente leagueStats.cleanSheets
    if (leagueStats.cleanSheets > npcTopCS) {
      player.awards.bestGoalkeeperAward++;
      events.push({
        type: "golden_glove_win",
        description: `events.award.goldenGlove`,
        metadata: { cleanSheets: leagueStats.cleanSheets },
      });

      // ðŸŽ® Verificar conquista de Best Goalkeeper em tempo real
      PlayGamesService.checkAwardAchievements(player);
    }
  }

  // ==================== 6. PRÊMIOS DE COPA DO MUNDO ====================
  // v0.5.6: Corrigido - usar gols internacionais, não total da temporada
  const internationalStats = getStats("international");

  if (seasonResults.wonWorldCup) {
    // Golden Ball (Best Player)
    if (performanceRating >= 8.0) {
      player.awards.worldCupBestPlayer++;
      events.push({
        type: "award_win",
        description: `events.award.worldCupGoldenBall`,
      });
    }

    // Golden Boot (Top Scorer) - CORRIGIDO: usar gols internacionais
    // Histórico: artilheiros de Copa do Mundo geralmente fazem 5-7 gols
    // Mínimo de 4 gols para competir pelo prêmio
    const worldCupGoals = internationalStats.goals;

    if (worldCupGoals >= 4) {
      // Gerar competidor NPC
      // Artilheiros históricos: 6-7 gols (Ronaldo 2002, Klose 2006, etc.)
      const npcTopScorer = Math.floor(3 + Math.random() * 4); // 3-6 gols

      if (worldCupGoals > npcTopScorer) {
        events.push({
          type: "award_win",
          description: `events.award.worldCupGoldenBoot`,
          metadata: { goals: worldCupGoals },
        });
      } else if (worldCupGoals === npcTopScorer && Math.random() < 0.3) {
        // Empate - 30% de chance de ganhar
        events.push({
          type: "award_win",
          description: `events.award.worldCupGoldenBoot`,
          metadata: { goals: worldCupGoals, shared: true },
        });
      }
    }
  }

  // --- Registrar Conquistas de Time (Visual) ---
  // REMOVIDO: A lÃ³gica de trofÃ©us de time jÃ¡ Ã© tratada no simulation.ts
  // Manter aqui apenas lÃ³gica de prÃªmios individuais

  // 6. NARRATIVE & OTHER AWARDS
  // Rookie of the Year
  if (
    player.yearsAtClub === 1 &&
    player.age <= 23 &&
    player.team.leagueTier <= 2
  ) {
    if (performanceRating > 0.6 && rawStats.matchesPlayed > 15) {
      player.awards.leagueRookieOfYear =
        (player.awards.leagueRookieOfYear || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.rookie`,
      });
    }
  }

  // Comeback Player of the Year
  if (
    wasSeverelyInjuredLastSeason &&
    performanceRating > 0.65 &&
    rawStats.matchesPlayed > 20
  ) {
    if (Math.random() < 0.4) {
      // 40% de chance se atender aos critérios
      player.awards.comebackPlayerOfYear =
        (player.awards.comebackPlayerOfYear || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.comeback`,
      });
    }
  }

  // ==================== PRÃŠMIOS POSICIONAIS (BEST DEFENDER/MIDFIELDER/FORWARD OF THE YEAR) ====================
  // Estes prÃªmios sÃ£o cruciais para posiÃ§Ãµes que nÃ£o fazem muitos gols
  // REQUER: OVR mÃ­nimo de 83 para competir por estes prÃªmios (elite da liga)
  const minOvrForPositionalAward = 83;

  if (
    player.stats.overall >= minOvrForPositionalAward &&
    rawStats.matchesPlayed >= 28
  ) {
    const positionalScore = calculatePositionalScore(player, rawStats);
    const npcPositionalScore = generateNpcPositionalScore(
      pos,
      context.leagueQuality,
      player.team.leagueTier,
    );

    // BÃ´nus de reputaÃ§Ã£o do time (jogadores de times grandes tÃªm mais visibilidade)
    const teamVisibilityBonus =
      player.team.reputation >= 88 ? 12 : player.team.reputation >= 80 ? 6 : 0;

    // BÃ´nus de rating alto - mais rigoroso
    const ratingBonus =
      performanceRating >= 0.88 ? 15 : performanceRating >= 0.82 ? 8 : 0;

    // Score final do jogador - OVR pesa mais (0.8 ao invÃ©s de 0.3)
    const finalPlayerScore =
      positionalScore +
      teamVisibilityBonus +
      ratingBonus +
      player.stats.overall * 0.8;

    // Liga de elite tem MUITO mais competiÃ§Ã£o
    const isEliteLeague = context.leagueQuality >= 90;
    const requiredMargin = isEliteLeague ? 15 : 5;

    if (finalPlayerScore > npcPositionalScore + requiredMargin) {
      // Chance base mais conservadora
      const margin = finalPlayerScore - npcPositionalScore;
      let winChance =
        margin >= 30 ? 0.65 : margin >= 20 ? 0.45 : margin >= 10 ? 0.3 : 0.15;

      // Jogadores de elite (90+ OVR) tÃªm chance extra significativa
      if (player.stats.overall >= 92) winChance += 0.2;
      else if (player.stats.overall >= 88) winChance += 0.1;
      else if (player.stats.overall >= 85) winChance += 0.05;
      // Jogadores abaixo de 85 OVR precisam de margem maior
      else winChance -= 0.1;

      // Jogadores em times de elite tÃªm mais visibilidade
      if (player.team.reputation >= 90) winChance += 0.1;
      else if (player.team.reputation >= 85) winChance += 0.05;

      // Performance rating alto Ã© crucial
      if (performanceRating >= 0.85) winChance += 0.1;

      winChance = clamp(winChance, 0.05, 0.85); // Min 5%, Max 85%

      if (Math.random() < winChance) {
        if (pos === "Defender") {
          player.awards.leagueDefenderOfYear =
            (player.awards.leagueDefenderOfYear || 0) + 1;
          events.push({
            type: "award_win",
            description: `events.award.leagueDefenderOfYear`,
            metadata: {
              score: Math.round(finalPlayerScore),
              position: player.position,
            },
          });
          followerGrowth += rand(500000, 1500000);

          // ðŸŽ® Verificar conquistas
          PlayGamesService.checkAwardAchievements(player);
        } else if (pos === "Midfielder") {
          player.awards.leagueMidfielderOfYear =
            (player.awards.leagueMidfielderOfYear || 0) + 1;
          events.push({
            type: "award_win",
            description: `events.award.leagueMidfielderOfYear`,
            metadata: {
              score: Math.round(finalPlayerScore),
              position: player.position,
            },
          });
          followerGrowth += rand(600000, 1800000);

          PlayGamesService.checkAwardAchievements(player);
        } else if (pos === "Attacker") {
          player.awards.leagueForwardOfYear =
            (player.awards.leagueForwardOfYear || 0) + 1;
          events.push({
            type: "award_win",
            description: `events.award.leagueForwardOfYear`,
            metadata: {
              score: Math.round(finalPlayerScore),
              position: player.position,
            },
          });
          followerGrowth += rand(700000, 2000000);

          PlayGamesService.checkAwardAchievements(player);
        }
      }
    }
  }

  // ==================== CONTINENTAL PLAYER OF THE YEAR ====================
  // Para jogadores que dominam competições continentais
  if (
    seasonResults.wonContinental &&
    performanceRating >= 0.8 &&
    player.stats.overall >= 85
  ) {
    const continentalWinChance = player.stats.overall >= 90 ? 0.6 : 0.35;
    if (Math.random() < continentalWinChance) {
      player.awards.continentalPOTY = (player.awards.continentalPOTY || 0) + 1;
      events.push({
        type: "award_win",
        description: `events.award.continentalPOTY`,
        metadata: {
          competition:
            seasonResults.continentalCompetitionName || "Continental Cup",
        },
      });
      followerGrowth += rand(1000000, 3000000);
    }
  }

  // 7. PUSKAS (Goal of the Year)
  if (rawStats.goals > 10 && player.stats.flair >= 85) {
    if (Math.random() < 0.03) {
      player.awards.goalOfTheYear++;
      events.push({
        type: "award_win",
        description: `events.award.puskas`,
      });
      followerGrowth += rand(2000000, 5000000);
    }
  }

  return {
    updatedPlayer: player,
    events,
    followerGrowth,
    votingResults,
  };
};
