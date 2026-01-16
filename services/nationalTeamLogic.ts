import {
  Player,
  CareerEvent,
  TraitName,
  Personality,
  MatchLog,
  Team,
} from "../types";
import { rand, randFloat, gaussianRandom, clamp, MORALE_LEVELS } from "./utils";
import { NATIONALITIES } from "../constants";
import {
  simulateWorldCupQualifiers,
  getWorldCupOpponent,
  simulateQualifiersPhase0,
  getQualifierOpponent,
} from "./worldCupQualifiers";
import { PlayGamesService } from "./playGamesService";

// ==================== TIPOS E INTERFACES ====================

interface NationalTeamCycle {
  phase:
  | "Golden Generation"
  | "Competitive"
  | "Transition"
  | "Rebuilding"
  | "Crisis";
  managerQuality: number; // 0-100
  squadDepth: number; // 0-100
  momentum: number; // -20 to +20
}

interface Competition {
  type:
  | "Friendly"
  | "Qualifier"
  | "Nations League"
  | "Continental Cup"
  | "World Cup";
  importance: number; // 0-100
  matchesPlayed: number;
  isKnockout: boolean;
  round?: string; // Round name for better narratives (e.g., "Final", "Semi-Final")
  opponent?: {
    reputation: number; // Changed from literal to number for flexibility
    isRival: boolean;
  };
  opponentName?: string; // Real country name of opponent
}

interface NationalTeamResult {
  updatedPlayer: Player;
  events: CareerEvent[];
  followerGrowth: number;
  reputationChange: number;
  matchLogs: MatchLog[];
  wonWorldCup: boolean;
  wonContinentalCup: boolean;
  wonNationsLeague: boolean;
  retiredFromNationalTeam: boolean;
}

// ==================== SISTEMA DE CICLOS DA SELEÃ‡ÃƒO ====================

/**
 * Determina a fase atual da seleção nacional
 */
const determineNationalTeamCycle = (
  nationality: string,
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
): NationalTeamCycle => {
  // Base por reputação
  let phaseWeights = {
    "Golden Generation": 0.05,
    Competitive: 0.4,
    Transition: 0.3,
    Rebuilding: 0.2,
    Crisis: 0.05,
  };

  // Ajustar por reputação
  switch (nationalReputation) {
    case "Elite":
      phaseWeights = {
        "Golden Generation": 0.15,
        Competitive: 0.5,
        Transition: 0.2,
        Rebuilding: 0.1,
        Crisis: 0.05,
      };
      break;
    case "Good":
      phaseWeights = {
        "Golden Generation": 0.08,
        Competitive: 0.45,
        Transition: 0.3,
        Rebuilding: 0.15,
        Crisis: 0.02,
      };
      break;
    case "Minnow":
      phaseWeights = {
        "Golden Generation": 0.02,
        Competitive: 0.25,
        Transition: 0.3,
        Rebuilding: 0.3,
        Crisis: 0.13,
      };
      break;
  }

  // Sortear fase
  const randomValue = Math.random();
  let cumulative = 0;
  let phase: NationalTeamCycle["phase"] = "Competitive";

  for (const [key, weight] of Object.entries(phaseWeights)) {
    cumulative += weight;
    if (randomValue < cumulative) {
      phase = key as NationalTeamCycle["phase"];
      break;
    }
  }

  // Manager quality
  let managerQuality = gaussianRandom(65, 15);
  if (nationalReputation === "Elite") managerQuality += 15;
  else if (nationalReputation === "Good") managerQuality += 8;
  managerQuality = clamp(managerQuality, 40, 95);

  // Squad depth
  let squadDepth = gaussianRandom(60, 15);
  if (nationalReputation === "Elite") squadDepth += 20;
  else if (nationalReputation === "Good") squadDepth += 10;
  squadDepth = clamp(squadDepth, 30, 95);

  // Momentum
  let momentum = gaussianRandom(0, 8);
  if (phase === "Golden Generation") momentum += rand(10, 15);
  else if (phase === "Crisis") momentum -= rand(10, 15);
  momentum = clamp(momentum, -20, 20);

  return {
    phase,
    managerQuality,
    squadDepth,
    momentum,
  };
};

// ==================== SISTEMA DE ADVERSÁRIOS REAIS ====================

/**
 * Get reputation level from FIFA rank
 */
const getReputationFromRank = (
  fifaRank: number,
): "Elite" | "Good" | "Average" | "Minnow" => {
  if (fifaRank <= 10) return "Elite";
  if (fifaRank <= 30) return "Good";
  if (fifaRank <= 60) return "Average";
  return "Minnow";
};

/**
 * Get the continent of a player based on nationality
 */
const getPlayerContinent = (nationality: string): string => {
  const natInfo = NATIONALITIES.find((n) => n.name === nationality);
  return natInfo?.continent || "Europe";
};

/**
 * Convert reputation literal to numeric value
 */
const getReputationValue = (
  rep: "Elite" | "Good" | "Average" | "Minnow",
): number => {
  switch (rep) {
    case "Elite":
      return 90;
    case "Good":
      return 77;
    case "Average":
      return 62;
    case "Minnow":
      return 45;
  }
};

/**
 * Get a random opponent country from NATIONALITIES
 * @param playerNationality - The player's nationality to exclude
 * @param targetReputation - Optional reputation filter
 * @param sameContinent - If true, only return countries from the same continent
 */
const getRandomOpponent = (
  playerNationality: string,
  targetReputation?: "Elite" | "Good" | "Average" | "Minnow",
  sameContinent?: boolean,
): { name: string; reputation: "Elite" | "Good" | "Average" | "Minnow" } => {
  const playerInfo = NATIONALITIES.find((n) => n.name === playerNationality);
  const playerContinent = playerInfo?.continent || "Europe";

  // Filter available opponents
  let candidates = NATIONALITIES.filter((n) => n.name !== playerNationality);

  // Filter by continent if needed
  if (sameContinent) {
    candidates = candidates.filter((n) => n.continent === playerContinent);
  }

  // Filter by reputation if specified
  if (targetReputation) {
    const repCandidates = candidates.filter(
      (n) => getReputationFromRank(n.fifaRank) === targetReputation,
    );
    // Use filtered if we found some, otherwise fall back to all candidates
    if (repCandidates.length > 0) {
      candidates = repCandidates;
    }
  }

  // If no candidates (rare edge case), return a default
  if (candidates.length === 0) {
    return { name: "International", reputation: "Average" };
  }

  // Pick a random opponent
  const opponent = candidates[rand(0, candidates.length - 1)];
  return {
    name: opponent.name,
    reputation: getReputationFromRank(opponent.fifaRank),
  };
};

/**
 * Generate a list of opponent countries for a fixture
 */
const generateOpponentsForFixture = (
  playerNationality: string,
  fixtureType: Competition["type"],
  count: number,
): string[] => {
  const opponents: string[] = [];
  const usedCountries = new Set<string>([playerNationality]);

  for (let i = 0; i < count; i++) {
    // Determine if we should use same continent
    const sameContinent =
      fixtureType === "Continental Cup" || fixtureType === "Qualifier";

    // Determine target reputation based on fixture type
    let targetRep: "Elite" | "Good" | "Average" | "Minnow" | undefined;
    if (fixtureType === "World Cup") {
      // World Cup = mix of all reputations, slightly biased by round
      targetRep = undefined;
    } else if (fixtureType === "Nations League") {
      // Nations League = similar level teams
      const playerInfo = NATIONALITIES.find(
        (n) => n.name === playerNationality,
      );
      targetRep = playerInfo
        ? getReputationFromRank(playerInfo.fifaRank)
        : "Average";
    }

    const opponent = getRandomOpponent(
      playerNationality,
      targetRep,
      sameContinent,
    );

    // Avoid duplicates
    if (!usedCountries.has(opponent.name)) {
      opponents.push(opponent.name);
      usedCountries.add(opponent.name);
    } else {
      // Try again with no filter
      const fallback = getRandomOpponent(playerNationality, undefined, false);
      if (!usedCountries.has(fallback.name)) {
        opponents.push(fallback.name);
        usedCountries.add(fallback.name);
      }
    }
  }

  return opponents;
};

// ==================== SISTEMA DE CONVOCAÇÃO ====================

/**
 * Calcula a probabilidade de convocação
 */
const calculateCallUpProbability = (
  player: Player,
  requiredOvr: number,
  nationalCycle: NationalTeamCycle,
): number => {
  let probability = 0;

  // ========== BASE: OVERALL vs REQUIRED ==========
  const ovrDifference = player.stats.overall - requiredOvr;

  if (ovrDifference >= 10) {
    probability = 0.95; // Elite player
  } else if (ovrDifference >= 7) {
    probability = 0.8;
  } else if (ovrDifference >= 4) {
    probability = 0.6;
  } else if (ovrDifference >= 2) {
    probability = 0.4;
  } else if (ovrDifference >= 0) {
    probability = 0.25;
  } else if (ovrDifference >= -3) {
    probability = 0.1;
  } else {
    probability = 0.02;
  }

  // ========== FORMA ==========
  if (player.form >= 8) {
    probability *= 1.35;
  } else if (player.form >= 5) {
    probability *= 1.2;
  } else if (player.form >= 2) {
    probability *= 1.05;
  } else if (player.form <= -5) {
    probability *= 0.6;
  } else if (player.form <= -2) {
    probability *= 0.8;
  }

  // ========== IDADE ==========
  if (player.age <= 19) {
    // Jovem promissor
    if (player.potential >= 88 && nationalCycle.phase !== "Golden Generation") {
      probability *= 1.4; // Fase de transição/rebuilding favorece jovens
    } else {
      probability *= 0.7; // Geralmente preferem experientes
    }
  } else if (player.age <= 23) {
    probability *= 1.1; // Idade ideal
  } else if (player.age <= 28) {
    probability *= 1.15; // Prime
  } else if (player.age <= 32) {
    probability *= 1.05; // Experiência
  } else if (player.age <= 35) {
    probability *= 0.85; // Começando a declinar
  } else {
    probability *= 0.6; // Muito velho
  }

  // ========== EXPOSIÃ‡ÃƒO (LIGA) ==========
  if (player.team.leagueTier === 1 && player.team.reputation >= 85) {
    probability *= 1.25; // Liga top
  } else if (player.team.leagueTier === 1) {
    probability *= 1.15;
  } else if (player.team.leagueTier === 2) {
    probability *= 0.95;
  } else if (player.team.leagueTier >= 3) {
    probability *= 0.75;
  }

  // ========== STATUS NO CLUBE ==========
  if (player.squadStatus === "Key Player") {
    probability *= 1.2;
  } else if (player.squadStatus === "Rotation") {
    probability *= 1.05;
  } else if (player.squadStatus === "Reserve") {
    probability *= 0.8;
  } else if (player.squadStatus === "Surplus") {
    probability *= 0.5;
  }

  // ========== FASE DA SELEÃ‡ÃƒO ==========
  switch (nationalCycle.phase) {
    case "Golden Generation":
      // Geração dourada = menos espaço para novos
      if (player.internationalCaps < 20) {
        probability *= 0.7;
      }
      break;
    case "Rebuilding":
      // Reconstrução = mais espaço para jovens
      if (player.age <= 23) {
        probability *= 1.3;
      }
      break;
    case "Crisis":
      // Crise = experimentação
      probability *= 1.15;
      break;
  }

  // ========== EXPERIÃŠNCIA INTERNACIONAL ==========
  if (player.internationalCaps >= 50) {
    probability *= 1.2; // Veterano confiável
  } else if (player.internationalCaps >= 20) {
    probability *= 1.1;
  }

  // ========== TRAITS ==========
  if (player.traits.some((t) => t.name === "Leadership")) {
    probability *= 1.15;
  }
  if (player.traits.some((t) => t.name === "Big Game Player")) {
    probability *= 1.12;
  }
  if (player.traits.some((t) => t.name === "Injury Prone") && player.injury) {
    probability *= 0.6;
  }

  // ========== LESÃƒO ==========
  if (player.injury) {
    probability *= 0.2; // Muito difícil convocar lesionado
  }

  // ========== MORAL ==========
  const moraleIndex = MORALE_LEVELS.indexOf(player.morale);
  if (moraleIndex <= 1) {
    probability *= 0.85; // Moral baixo prejudica
  }

  return clamp(probability, 0, 0.98);
};

// ==================== SISTEMA DE COMPETIÃ‡Ã•ES ====================

/**
 * Gera calendário de jogos da seleção para a temporada
 */
const generateNationalTeamFixtures = (
  player: Player,
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
  nationalCycle: NationalTeamCycle,
): Competition[] => {
  const fixtures: Competition[] = [];
  const age = player.age;

  // Determinar fase do ciclo de 4 anos
  const cycleYear = age % 4;

  // ========== AMISTOSOS (SEMPRE, MAS QUANTIDADE VARIA) ==========
  // Anos de torneio = menos amistosos
  const isWorldCupYear = cycleYear === 2;
  const isContinentalYear = cycleYear === 3;
  const isTournamentYear = isWorldCupYear || isContinentalYear;

  const friendliesCount = isTournamentYear ? rand(2, 4) : rand(4, 6);

  for (let i = 0; i < friendliesCount; i++) {
    // Get a random opponent from any country for friendlies
    const opponent = getRandomOpponent(player.nationality, undefined, false);
    fixtures.push({
      type: "Friendly",
      importance: rand(10, 30),
      matchesPlayed: 1,
      isKnockout: false,
      opponent: {
        reputation: getReputationValue(opponent.reputation),
        isRival: Math.random() < 0.15,
      },
      opponentName: opponent.name,
    });
  }

  // ========== ELIMINATÓRIAS DA COPA DO MUNDO ==========
  // Ano 0: Fase INICIAL das eliminatórias (grupos preliminares, primeiras rodadas)
  // Ano 1: Fase DECISIVA - Continua da fase 0, playoffs e decisão final

  if (cycleYear === 0) {
    // Ano 0: Simular FASE INICIAL das eliminatórias
    const phase0Result = simulateQualifiersPhase0(player.nationality);

    // Persistir dados da fase 0 para uso no ano 1
    const currentYear = 2020 + (player.age - 17);
    player.worldCupQualifiersData = {
      cycleStartYear: currentYear,
      currentPhase: 0,
      phase0Data: {
        playersStillInContention: phase0Result.stillInContention,
        directlyQualified: phase0Result.directlyQualifiedEarly,
        eliminated: phase0Result.eliminated,
      },
      allQualified: [], // Será preenchido no ano 1
      playerQualified: false,
      qualificationMethod: "none",
    };

    console.log(
      `[Nacional] Eliminatórias Fase 0: ${player.nationality} está ${phase0Result.playerStatus === "contention"
        ? "vivo nas eliminatórias"
        : phase0Result.playerStatus === "qualified"
          ? "já classificado!"
          : "eliminado"
      }`,
    );

    // Gerar jogos de eliminatórias da fase inicial (4-6 jogos)
    const qualifiersCount = rand(4, 6);
    for (let i = 0; i < qualifiersCount; i++) {
      // Usar oponentes REAIS da fase 0 se disponíveis
      let opponent: { name: string; reputation: number };
      if (phase0Result.playerOpponents.length > i) {
        // Usar oponente específico da fase 0
        const oppName = phase0Result.playerOpponents[i];
        opponent = getQualifierOpponent(player.nationality, 0);
        opponent.name = oppName;
      } else {
        opponent = getQualifierOpponent(player.nationality, 0);
      }

      fixtures.push({
        type: "Qualifier",
        importance: rand(55, 70),
        matchesPlayed: 1,
        isKnockout: false,
        opponent: {
          reputation: opponent.reputation,
          isRival: Math.random() < 0.2,
        },
        opponentName: opponent.name,
      });
    }
  }

  if (cycleYear === 1) {
    // Ano 1: Fase DECISIVA - Simular resultado final e persistir

    // Obter dados da fase 0 se existirem
    const phase0Data = player.worldCupQualifiersData?.phase0Data;
    const phase0Opponents = phase0Data?.playersStillInContention || [];

    // Simular eliminatórias completas (fase decisiva)
    const qualificationResult = simulateWorldCupQualifiers(player.nationality);

    // Atualizar dados persistidos com resultado final
    const currentYear = 2020 + (player.age - 17);
    player.worldCupQualifiersData = {
      cycleStartYear:
        player.worldCupQualifiersData?.cycleStartYear || currentYear - 1,
      currentPhase: 1,
      phase0Data: phase0Data, // Manter dados da fase 0
      allQualified: qualificationResult.allQualified,
      playerQualified: qualificationResult.qualified,
      qualificationMethod: qualificationResult.method,
    };

    console.log(
      `[Nacional] Eliminatórias Fase 1 (Decisiva): ${player.nationality}: ${qualificationResult.qualified
        ? "CLASSIFICADO via " + qualificationResult.method
        : "ELIMINADO"
      }`,
    );

    // Gerar jogos de eliminatórias da fase decisiva (6-8 jogos)
    const qualifiersCount = rand(6, 8);
    for (let i = 0; i < qualifiersCount; i++) {
      // Usar oponentes que NÃO foram enfrentados na fase 0
      const opponent = getQualifierOpponent(
        player.nationality,
        1,
        phase0Opponents,
      );

      fixtures.push({
        type: "Qualifier",
        importance: rand(70, 85),
        matchesPlayed: 1,
        isKnockout: false,
        opponent: {
          reputation: opponent.reputation,
          isRival: Math.random() < 0.25,
        },
        opponentName: opponent.name,
      });
    }
  }

  // ========== COPA DO MUNDO ==========
  // Ano 2: Usa dados PERSISTIDOS do ano 1 (não simula novamente)
  if (isWorldCupYear && age >= 18 && age <= 36) {
    // Verificar se temos dados persistidos das eliminatórias
    const qualifiersData = player.worldCupQualifiersData;

    if (qualifiersData && qualifiersData.playerQualified) {
      console.log(
        `[National] ${player.nationality} jogando Copa do Mundo (classificado via ${qualifiersData.qualificationMethod})`,
      );
      addWorldCupFixtures(
        fixtures,
        nationalReputation,
        nationalCycle,
        player.nationality,
        qualifiersData.allQualified,
      );
    } else if (qualifiersData) {
      console.log(
        `[National] ${player.nationality} não classificou para Copa do Mundo`,
      );
      // Não adicionar fixtures da Copa - seleção não classificou
    } else {
      // Fallback: se não tiver dados persistidos, simular (para compatibilidade)
      console.log(
        `[National] Sem dados de eliminatórias. Simulando para ${player.nationality}...`,
      );
      const qualificationResult = simulateWorldCupQualifiers(
        player.nationality,
      );

      if (qualificationResult.qualified) {
        addWorldCupFixtures(
          fixtures,
          nationalReputation,
          nationalCycle,
          player.nationality,
          qualificationResult.allQualified,
        );
      }
    }
  }

  // ========== NATIONS LEAGUE ==========
  // Acontece apenas em anos SEM torneio principal (ano 0 e 1)
  // Apenas UEFA e CONCACAF tem Nations League
  const europeanCountries = [
    "England",
    "France",
    "Germany",
    "Spain",
    "Italy",
    "Portugal",
    "Netherlands",
    "Belgium",
    "Scotland",
    "Turkey",
    "Poland",
    "Ukraine",
    "Russia",
    "Sweden",
    "Austria",
    "Switzerland",
    "Denmark",
    "Norway",
    "Croatia",
    "Serbia",
    "Czech Republic",
    "Greece",
    "Romania",
    "Hungary",
    "Wales",
    "Ireland",
    "Northern Ireland",
    "Finland",
    "Iceland",
    "Slovenia",
    "Slovakia",
    "Bosnia",
  ];
  const concacafCountries = [
    "USA",
    "Mexico",
    "Canada",
    "Jamaica",
    "Costa Rica",
    "Panama",
    "Honduras",
    "El Salvador",
    "Guatemala",
    "Trinidad and Tobago",
    "Haiti",
    "Cuba",
  ];

  const isEuropean = europeanCountries.includes(player.nationality);
  const isConcacaf = concacafCountries.includes(player.nationality);
  const hasNationsLeague = isEuropean || isConcacaf;

  if (!isTournamentYear && hasNationsLeague) {
    const nationsLeagueCount = rand(4, 6);
    const nationsLeagueName = isEuropean
      ? "Nations League"
      : "CONCACAF Nations League";

    for (let i = 0; i < nationsLeagueCount; i++) {
      // Nations League: same reputation level opponents from same confederation
      const opponent = getRandomOpponent(
        player.nationality,
        nationalReputation,
        true, // sameContinent = true para pegar oponentes da mesma confederacao
      );

      fixtures.push({
        type: "Nations League",
        importance: rand(40, 55),
        matchesPlayed: 1,
        isKnockout: false,
        opponent: {
          reputation: getReputationValue(opponent.reputation),
          isRival: Math.random() < 0.25,
        },
        opponentName: opponent.name,
      });
    }

    // ========== NATIONS LEAGUE FINALS ==========
    // Top 4 teams: Semi-final and Final (chance based on reputation)
    const finalsChance = {
      Elite: 0.6,
      Good: 0.35,
      Average: 0.15,
      Minnow: 0.05,
    }[nationalReputation];

    if (Math.random() < finalsChance) {
      // Semi-final
      const semiOpponent = getRandomOpponent(
        player.nationality,
        "Elite",
        false,
      );
      fixtures.push({
        type: "Nations League",
        importance: 75,
        matchesPlayed: 1,
        isKnockout: true,
        round: "Semi-Final",
        opponent: {
          reputation: getReputationValue(semiOpponent.reputation),
          isRival: Math.random() < 0.2,
        },
        opponentName: semiOpponent.name,
      });

      // Final
      const finalOpponent = getRandomOpponent(
        player.nationality,
        "Elite",
        false,
      );
      fixtures.push({
        type: "Nations League",
        importance: 85,
        matchesPlayed: 1,
        isKnockout: true,
        round: "Final",
        opponent: {
          reputation: getReputationValue(finalOpponent.reputation),
          isRival: Math.random() < 0.25,
        },
        opponentName: finalOpponent.name,
      });
    }
  }

  // ========== COPA CONTINENTAL ==========
  if (isContinentalYear && age >= 18 && age <= 36) {
    const qualified = checkTournamentQualification(
      nationalReputation,
      nationalCycle,
      "Continental Cup",
    );

    if (qualified) {
      addContinentalCupFixtures(
        fixtures,
        nationalReputation,
        nationalCycle,
        player.nationality,
      );
    }
  }

  return fixtures;
};

/**
 * Determines World Cup qualification based on realistic confederation-specific chances.
 * Based on FIFA World Cup 2026 format:
 * - UEFA: 16 spots / ~55 teams = ~29% base
 * - CAF: 9 spots / ~54 teams = ~17% base
 * - AFC: 8 spots / ~46 teams = ~17% base
 * - CONMEBOL: 6 spots / 10 teams = 60% base
 * - CONCACAF: 6 spots / ~35 teams = ~17% base (3 hosts auto-qualify)
 * - OFC: 1 spot / ~11 teams = ~9% base
 * + FIFA Intercontinental Playoff: 2 extra spots
 */
const checkTournamentQualification = (
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
  nationalCycle: NationalTeamCycle,
  tournament: "World Cup" | "Continental Cup",
  playerContinent?: string,
): boolean => {
  // Continental Cup uses simpler logic
  if (tournament === "Continental Cup") {
    const baseChance = { Elite: 0.95, Good: 0.85, Average: 0.6, Minnow: 0.3 };
    let chance = baseChance[nationalReputation];
    if (nationalCycle.phase === "Golden Generation") chance *= 1.1;
    else if (nationalCycle.phase === "Crisis") chance *= 0.7;
    return Math.random() < Math.min(chance, 0.98);
  }

  // World Cup 2026 - Realistic confederation-based qualification
  // Chances are based on actual qualification formats and historical data

  // CONMEBOL: 6 vagas diretas + 1 repescagem para 10 times
  // Elite (top 4): ~98% | Good (5-6): ~85% | Average (7-8): ~40% | Minnow (9-10): ~15%
  const conmebolChances = {
    Elite: 0.98,
    Good: 0.85,
    Average: 0.4,
    Minnow: 0.15,
  };

  // UEFA: 16 vagas diretas + 4 via playoff para ~55 times
  // Elite (top 8): ~95% | Good (9-20): ~70% | Average (21-40): ~35% | Minnow (41+): ~10%
  const uefaChances = { Elite: 0.95, Good: 0.7, Average: 0.35, Minnow: 0.1 };

  // CAF: 9 vagas diretas + 1 repescagem para ~54 times
  // Elite (top 5): ~90% | Good (6-15): ~55% | Average (16-30): ~25% | Minnow (31+): ~8%
  const cafChances = { Elite: 0.9, Good: 0.55, Average: 0.25, Minnow: 0.08 };

  // AFC: 8 vagas diretas + 1 repescagem para ~46 times
  // Elite (top 6): ~92% | Good (7-15): ~50% | Average (16-30): ~20% | Minnow (31+): ~5%
  const afcChances = { Elite: 0.92, Good: 0.5, Average: 0.2, Minnow: 0.05 };

  // CONCACAF: 6 vagas + 2 repescagem para ~35 times (formato normal, sem hosts)
  // Elite (top 3): ~90% | Good (4-8): ~60% | Average (9-20): ~25% | Minnow (21+): ~8%
  const concacafChances = {
    Elite: 0.9,
    Good: 0.6,
    Average: 0.25,
    Minnow: 0.08,
  };

  // OFC: 1 vaga direta + 1 repescagem para ~11 times
  // Elite (NZL): ~95% | Good (top 3): ~30% | Average (4-7): ~10% | Minnow (8+): ~3%
  const ofcChances = { Elite: 0.95, Good: 0.3, Average: 0.1, Minnow: 0.03 };

  // Select chances based on continent
  let baseChances: Record<string, number>;
  switch (playerContinent) {
    case "South America":
      baseChances = conmebolChances;
      break;
    case "Europe":
      baseChances = uefaChances;
      break;
    case "Africa":
      baseChances = cafChances;
      break;
    case "Asia":
      baseChances = afcChances;
      break;
    case "North America":
      baseChances = concacafChances;
      break;
    case "Australia": // OFC
      baseChances = ofcChances;
      break;
    default:
      // Fallback to average of all confederations
      baseChances = { Elite: 0.95, Good: 0.6, Average: 0.25, Minnow: 0.1 };
  }

  let chance = baseChances[nationalReputation];

  // Adjust by national team cycle
  if (nationalCycle.phase === "Golden Generation") chance *= 1.15;
  else if (nationalCycle.phase === "Rebuilding") chance *= 0.9;
  else if (nationalCycle.phase === "Crisis") chance *= 0.7;

  const directQualified = Math.random() < Math.min(chance, 0.99);

  // FIFA Intercontinental Playoff: 2 extra spots
  // Teams that didn't qualify directly can still make it via playoff
  if (!directQualified) {
    // Playoff chances vary by confederation (some get more playoff spots)
    let playoffChance = 0;

    switch (playerContinent) {
      case "South America": // 7th place goes to playoff
        playoffChance =
          nationalReputation === "Average"
            ? 0.35
            : nationalReputation === "Minnow"
              ? 0.2
              : 0.1;
        break;
      case "North America": // 2 spots in playoff
        playoffChance =
          nationalReputation === "Good"
            ? 0.4
            : nationalReputation === "Average"
              ? 0.25
              : 0.1;
        break;
      case "Africa": // 4 best 2nd places go to playoff
        playoffChance =
          nationalReputation === "Good"
            ? 0.3
            : nationalReputation === "Average"
              ? 0.2
              : 0.08;
        break;
      case "Asia": // 4th places go to 4th/5th phase
        playoffChance =
          nationalReputation === "Good"
            ? 0.35
            : nationalReputation === "Average"
              ? 0.2
              : 0.05;
        break;
      case "Australia": // 2nd place goes to FIFA playoff
        playoffChance =
          nationalReputation === "Good"
            ? 0.5
            : nationalReputation === "Average"
              ? 0.2
              : 0.05;
        break;
      case "Europe": // 12 2nd places + 4 Nations League go to playoff
        playoffChance =
          nationalReputation === "Good"
            ? 0.45
            : nationalReputation === "Average"
              ? 0.25
              : 0.1;
        break;
      default:
        playoffChance = 0.15;
    }

    // Adjust playoff chance by cycle
    if (nationalCycle.phase === "Golden Generation") playoffChance *= 1.2;
    else if (nationalCycle.phase === "Crisis") playoffChance *= 0.6;

    if (Math.random() < playoffChance) {
      console.log(
        `[National] ${nationalReputation} team from ${playerContinent} qualified via playoff!`,
      );
      return true;
    }
  }

  return directQualified;
};

/**
 * Generates ALL possible World Cup fixtures upfront.
 * Advancement through knockouts is determined DURING simulation based on match performance.
 */
const addWorldCupFixtures = (
  fixtures: Competition[],
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
  nationalCycle: NationalTeamCycle,
  playerNationality: string,
  allQualified?: string[],
): void => {
  // Fase de grupos (3 jogos garantidos) - use real qualified teams if available
  let groupOpponents: string[];
  if (allQualified && allQualified.length > 3) {
    groupOpponents = [
      getWorldCupOpponent(playerNationality, allQualified).name,
      getWorldCupOpponent(playerNationality, allQualified).name,
      getWorldCupOpponent(playerNationality, allQualified).name,
    ];
  } else {
    groupOpponents = generateOpponentsForFixture(
      playerNationality,
      "World Cup",
      3,
    );
  }

  fixtures.push({
    type: "World Cup",
    importance: 95,
    matchesPlayed: 3,
    isKnockout: false,
    round: "Group Stage",
    opponentName: groupOpponents.join(", "), // Show all group opponents
  });

  // Generate all knockout rounds with real opponents
  // FORMATO 2026: 48 times = 32 avançam da fase de grupos (top 2 + 8 melhores 3º)
  // Depois: 32-avos → Oitavas → Quartas → Semis → Final

  // 32-avos de final (nova fase no formato 2026)
  let r32OpponentName: string;
  let r32OpponentRep: number;
  if (allQualified && allQualified.length > 3) {
    const opp = getWorldCupOpponent(playerNationality, allQualified, "Average");
    r32OpponentName = opp.name;
    r32OpponentRep = opp.reputation;
  } else {
    const opp = getRandomOpponent(playerNationality, "Average", false);
    r32OpponentName = opp.name;
    r32OpponentRep = getReputationValue(opp.reputation);
  }
  fixtures.push({
    type: "World Cup",
    importance: 96,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Round of 32",
    opponent: {
      reputation: r32OpponentRep,
      isRival: Math.random() < 0.08,
    },
    opponentName: r32OpponentName,
  });
  // Oitavas de final
  let r16OpponentName: string;
  let r16OpponentRep: number;
  if (allQualified && allQualified.length > 3) {
    const opp = getWorldCupOpponent(playerNationality, allQualified, "Good");
    r16OpponentName = opp.name;
    r16OpponentRep = opp.reputation;
  } else {
    const opp = getRandomOpponent(playerNationality, "Good", false);
    r16OpponentName = opp.name;
    r16OpponentRep = getReputationValue(opp.reputation);
  }
  fixtures.push({
    type: "World Cup",
    importance: 97,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Round of 16",
    opponent: {
      reputation: r16OpponentRep,
      isRival: Math.random() < 0.1,
    },
    opponentName: r16OpponentName,
  });

  // Quartas de final
  let qfOpponentName: string;
  let qfOpponentRep: number;
  if (allQualified && allQualified.length > 3) {
    const opp = getWorldCupOpponent(playerNationality, allQualified, "Elite");
    qfOpponentName = opp.name;
    qfOpponentRep = opp.reputation;
  } else {
    const opp = getRandomOpponent(playerNationality, "Elite", false);
    qfOpponentName = opp.name;
    qfOpponentRep = getReputationValue(opp.reputation);
  }
  fixtures.push({
    type: "World Cup",
    importance: 98,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Quarter-Final",
    opponent: {
      reputation: qfOpponentRep,
      isRival: Math.random() < 0.15,
    },
    opponentName: qfOpponentName,
  });

  // Semifinal
  let sfOpponentName: string;
  let sfOpponentRep: number;
  if (allQualified && allQualified.length > 3) {
    const opp = getWorldCupOpponent(playerNationality, allQualified, "Elite");
    sfOpponentName = opp.name;
    sfOpponentRep = opp.reputation;
  } else {
    const opp = getRandomOpponent(playerNationality, "Elite", false);
    sfOpponentName = opp.name;
    sfOpponentRep = getReputationValue(opp.reputation);
  }
  fixtures.push({
    type: "World Cup",
    importance: 99,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Semi-Final",
    opponent: {
      reputation: sfOpponentRep,
      isRival: Math.random() < 0.2,
    },
    opponentName: sfOpponentName,
  });

  // Final
  let finalOpponentName: string;
  let finalOpponentRep: number;
  if (allQualified && allQualified.length > 3) {
    const opp = getWorldCupOpponent(playerNationality, allQualified, "Elite");
    finalOpponentName = opp.name;
    finalOpponentRep = opp.reputation;
  } else {
    const opp = getRandomOpponent(playerNationality, "Elite", false);
    finalOpponentName = opp.name;
    finalOpponentRep = getReputationValue(opp.reputation);
  }
  fixtures.push({
    type: "World Cup",
    importance: 100,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Final",
    opponent: {
      reputation: finalOpponentRep,
      isRival: Math.random() < 0.25,
    },
    opponentName: finalOpponentName,
  });
};

/**
 * Generates ALL possible Continental Cup fixtures upfront.
 * Advancement through knockouts is determined DURING simulation based on match performance.
 */
const addContinentalCupFixtures = (
  fixtures: Competition[],
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
  nationalCycle: NationalTeamCycle,
  playerNationality: string,
): void => {
  // Fase de grupos - generate 3 opponents from same continent
  const groupOpponents = generateOpponentsForFixture(
    playerNationality,
    "Continental Cup",
    3,
  );

  fixtures.push({
    type: "Continental Cup",
    importance: 80,
    matchesPlayed: 3,
    isKnockout: false,
    round: "Group Stage",
    opponentName: groupOpponents.join(", "),
  });

  // Generate all knockout rounds with real opponents from same continent
  // Quartas de final
  const qfOpponent = getRandomOpponent(playerNationality, "Good", true);
  fixtures.push({
    type: "Continental Cup",
    importance: 88,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Quarter-Final",
    opponent: {
      reputation: getReputationValue(qfOpponent.reputation),
      isRival: Math.random() < 0.15,
    },
    opponentName: qfOpponent.name,
  });

  // Semifinal
  const sfOpponent = getRandomOpponent(playerNationality, "Elite", true);
  fixtures.push({
    type: "Continental Cup",
    importance: 92,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Semi-Final",
    opponent: {
      reputation: getReputationValue(sfOpponent.reputation),
      isRival: Math.random() < 0.2,
    },
    opponentName: sfOpponent.name,
  });

  // Final
  const finalOpponent = getRandomOpponent(playerNationality, "Elite", true);
  fixtures.push({
    type: "Continental Cup",
    importance: 95,
    matchesPlayed: 1,
    isKnockout: true,
    round: "Final",
    opponent: {
      reputation: getReputationValue(finalOpponent.reputation),
      isRival: Math.random() < 0.25,
    },
    opponentName: finalOpponent.name,
  });
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Gets play chance based on national team status and match importance
 */
const getPlayChance = (
  nationalTeamStatus: Player["nationalTeamStatus"],
  importance: number,
): number => {
  let playChance = 0;

  switch (nationalTeamStatus) {
    case "Captain":
      playChance = 0.98;
      break;
    case "Regular Starter":
      playChance = 0.9;
      break;
    case "Squad Player":
      playChance = 0.65;
      break;
    case "Called Up":
      playChance = 0.4;
      break;
    default:
      playChance = 0.2;
  }

  // High importance games = starters always play
  // CORRIGIDO: Copa do Mundo (importance 95+) = todos devem jogar
  if (importance >= 95) {
    // Copa do Mundo - todos os convocados jogam (exceto reservas puros)
    if (
      nationalTeamStatus === "Captain" ||
      nationalTeamStatus === "Regular Starter"
    ) {
      playChance = 1.0;
    } else if (nationalTeamStatus === "Squad Player") {
      playChance = 0.95;
    } else {
      playChance = 0.85; // Called Up ainda joga maioria dos jogos em torneios
    }
  } else if (importance >= 90 && nationalTeamStatus !== "Called Up") {
    playChance = 1.0;
  } else if (importance >= 80 && nationalTeamStatus === "Regular Starter") {
    playChance = Math.max(playChance, 0.95);
  }

  return playChance;
};

/**
 * Processes non-tournament fixtures (friendlies, qualifiers, nations league)
 */
const processNormalFixture = (
  player: Player,
  fixture: Competition,
  nationalCycle: NationalTeamCycle,
  clubGoals: number,
  clubAssists: number,
  matchLogs: MatchLog[],
  events: CareerEvent[],
): { caps: number; goals: number; assists: number; cleanSheets: number } => {
  const playChance = getPlayChance(
    player.nationalTeamStatus,
    fixture.importance,
  );

  let gamesPlayed = 0;
  for (let i = 0; i < fixture.matchesPlayed; i++) {
    if (Math.random() < playChance) {
      gamesPlayed++;
    }
  }

  if (gamesPlayed === 0) {
    return { caps: 0, goals: 0, assists: 0, cleanSheets: 0 };
  }

  const actualFixture = { ...fixture, matchesPlayed: gamesPlayed };
  const matchLog = simulateMatchPerformance(
    player,
    actualFixture,
    nationalCycle,
    clubGoals,
    clubAssists,
  );

  matchLogs.push(matchLog);

  // Special events for great performances
  const opponentText = fixture.opponentName
    ? ` against ${fixture.opponentName}`
    : "";
  if (matchLog.goals >= 3 && fixture.importance >= 70) {
    events.push({
      type: "milestone",
      description: 'events.national.hatTrick',
      descriptionParams: { country: player.nationality, opponent: opponentText, type: fixture.type },
    });
  } else if (matchLog.goals >= 2) {
    events.push({
      type: "milestone",
      description: 'events.national.brace',
      descriptionParams: { country: player.nationality, opponent: opponentText, type: fixture.type },
    });
  }

  // Estimar clean sheets para goleiros (baseado em jogos e performance)
  const cleanSheets =
    player.position === "GK"
      ? Math.round(
        gamesPlayed *
        (matchLog.rating >= 7.0 ? 0.4 : matchLog.rating >= 6.5 ? 0.3 : 0.2),
      )
      : 0;

  return {
    caps: gamesPlayed,
    goals: matchLog.goals,
    assists: matchLog.assists,
    cleanSheets,
  };
};

// ==================== SIMULAÇÃO DE PERFORMANCE ====================

/**
 * Simula a performance do jogador em um jogo da seleção
 */
const simulateMatchPerformance = (
  player: Player,
  competition: Competition,
  nationalCycle: NationalTeamCycle,
  clubGoals: number,
  clubAssists: number,
): MatchLog => {
  // Simular gols e assistências para TODOS os jogos da fixture
  let totalGoals = 0;
  let totalAssists = 0;
  let totalRating = 0;

  const isAttacker = ["ST", "CF", "LW", "RW"].includes(player.position);
  const isMidfielder = ["CAM", "CM", "LM", "RM"].includes(player.position);

  // Simular cada jogo individualmente
  for (let gameIdx = 0; gameIdx < competition.matchesPlayed; gameIdx++) {
    // ========== BASE: Sistema igual ao clube (base 6.5) ==========
    let performanceRating = 6.5; // CORRIGIDO: Antes usava overall/10 que dava 8.5 para OVR 85

    // ========== FORMA ==========
    const formImpact = player.form / 50; // Reduzido para menos impacto
    performanceRating += formImpact;

    // ========== IMPORTÃ‚NCIA DO JOGO ==========
    const pressureImpact = (competition.importance / 100) * 0.5;

    if (player.traits.some((t) => t.name === "Big Game Player")) {
      performanceRating += pressureImpact; // Melhora sob pressão
    } else if (player.personality === "Temperamental") {
      performanceRating -= pressureImpact * 0.5; // Sofre sob pressão
    }

    // ========== QUALIDADE DO TÃ‰CNICO ==========
    const managerBonus = (nationalCycle.managerQuality - 65) / 100;
    performanceRating += managerBonus;

    // ========== MOMENTUM DA SELEÃ‡ÃƒO ==========
    performanceRating += nationalCycle.momentum / 100;

    // ========== ALEATORIEDADE ==========
    performanceRating += gaussianRandom(0, 0.4); // Reduzido de 0.8
    performanceRating = clamp(performanceRating, 5.0, 10.0);

    totalRating += performanceRating;

    // ========== GOLS E ASSISTÃŠNCIAS PARA ESTE JOGO ==========
    // Taxa base de gols/assists por jogo
    let goalRate = 0;
    let assistRate = 0;

    if (isAttacker) {
      goalRate = (clubGoals / 50) * 0.7; // ~70% da taxa de clube
      assistRate = (clubAssists / 50) * 0.5;
    } else if (isMidfielder) {
      goalRate = (clubGoals / 50) * 0.6;
      assistRate = (clubAssists / 50) * 0.7;
    } else {
      goalRate = (clubGoals / 50) * 0.4;
      assistRate = (clubAssists / 50) * 0.4;
    }

    // Ajustar por performance rating
    goalRate *= performanceRating / 7.5;
    assistRate *= performanceRating / 7.5;

    // Ajustar por oposição
    if (competition.opponent) {
      // reputation é numérico: Elite ~90, Good ~77, Average ~62, Minnow ~45
      const rep = competition.opponent.reputation;
      const opponentFactor =
        rep >= 85
          ? 0.6 // Elite
          : rep >= 70
            ? 0.8 // Good
            : rep >= 55
              ? 1.0 // Average
              : 1.3; // Minnow
      goalRate *= opponentFactor;
      assistRate *= opponentFactor;
    }

    // Simular gol/assist para este jogo
    if (Math.random() < goalRate) totalGoals++;
    if (Math.random() < assistRate) totalAssists++;
  }

  // Calcular rating médio
  const avgRating = totalRating / competition.matchesPlayed;

  return {
    age: player.age,
    team: {
      id: "NATIONAL",
      name: player.nationality,
      country: player.nationality,
      leagueTier: 1,
      reputation: 85,
      isYouth: false,
      squadStrength: undefined,
    },
    opponent: competition.opponent
      ? `${competition.opponent.reputation} opponent`
      : "Opponent",
    competition: competition.type,
    goals: totalGoals,
    assists: totalAssists,
    rating: parseFloat(avgRating.toFixed(1)),
    isNationalTeam: true,
  };
};

// ==================== V4: WORLD CUP DYNASTY PREVENTION SYSTEM ====================
// Historical Context:
// - Brazil (1958, 1962) and Italy (1934, 1938) are only back-to-back winners
// - No nation has won 3 consecutive World Cups
// - Defending champions often exit early (group stage curse)

interface WorldCupDynastyConfig {
  dynastyPenalty: number;           // Reduction per consecutive win (12%)
  maxDynastyPenalty: number;        // Cap on cumulative penalty (35%)
  complacencyFactor: number;        // Debuff for defending champions (8%)
  knockoutVarianceBase: number;     // Base RNG factor in elimination rounds (25%)
}

const WORLD_CUP_DYNASTY_CONFIG: WorldCupDynastyConfig = {
  dynastyPenalty: 0.12,        // 12% reduction per consecutive title
  maxDynastyPenalty: 0.35,     // Max 35% total penalty
  complacencyFactor: 0.08,     // 8% debuff for defending champions
  knockoutVarianceBase: 0.25,  // 25% random factor in knockouts
};

/**
 * V4: Calculate dynasty penalty based on consecutive World Cup wins
 * @param consecutiveWins - Number of consecutive World Cup wins (0 = not defending champion)
 * @returns Penalty multiplier (1.0 = no penalty, lower = harder to win)
 */
const calculateDynastyPenalty = (consecutiveWins: number): number => {
  if (consecutiveWins <= 0) return 1.0; // No penalty
  
  const config = WORLD_CUP_DYNASTY_CONFIG;
  
  // Calculate cumulative penalty
  const totalPenalty = Math.min(
    config.maxDynastyPenalty,
    consecutiveWins * config.dynastyPenalty
  );
  
  return 1.0 - totalPenalty;
};

/**
 * V4: Get knockout round variance multiplier
 * Finals are more unpredictable than early rounds
 */
const getKnockoutVarianceMultiplier = (round?: string): number => {
  const multipliers: Record<string, number> = {
    'Round of 32': 1.0,
    'Round of 16': 1.1,
    'Quarter-Final': 1.3,
    'Semi-Final': 1.5,
    'Final': 1.8,  // Finals are highly unpredictable
  };
  return multipliers[round || 'Round of 16'] || 1.2;
};

// ==================== KNOCKOUT RESULT SIMULATION ====================

/**
 * Determines if the national team advances in a knockout match.
 * Based on player performance, team strength, and opponent quality.
 * 
 * V4 UPDATES:
 * - Dynasty penalty system prevents consecutive World Cup wins
 * - Complacency factor for defending champions
 * - Increased variance in knockout rounds (cup magic)
 */
const simulateKnockoutResult = (
  matchLog: MatchLog,
  opponent: Competition["opponent"],
  nationalReputation: "Elite" | "Good" | "Average" | "Minnow",
  nationalCycle: NationalTeamCycle,
  round?: string,
  consecutiveWorldCupWins: number = 0, // V4: Track dynasty
  isDefendingChampion: boolean = false, // V4: Track defending champion status
  opponentFifaRank?: number, // NEW: Real opponent strength
): { won: boolean; narrative: string } => {
  // Get player's nation FIFA rank for comparison
  const playerNatInfo = NATIONALITIES.find((n) => n.name === matchLog.team.name);
  const playerFifaRank = playerNatInfo?.fifaRank ?? 50;
  
  // Calculate win chance based on REAL relative strength of teams
  let winChance: number;
  
  if (opponentFifaRank !== undefined) {
    // Realistic calculation based on FIFA ranks
    // Lower rank = better team, so we compare ranks
    const rankDifference = opponentFifaRank - playerFifaRank;
    
    // Base 50% chance, adjusted by rank difference
    // Each 10 ranks difference = ~15% change in win probability (was 10%)
    winChance = 0.5 + (rankDifference / 70);
    
    // Apply additional factors based on overall team quality
    // Top teams get boost, weak teams get significant penalty
    if (playerFifaRank <= 10) {
      winChance += 0.08;  // Elite nations bonus
    } else if (playerFifaRank <= 20) {
      winChance += 0.04;  // Strong nations bonus
    } else if (playerFifaRank <= 40) {
      winChance += 0.0;   // Average nations - no modifier
    } else if (playerFifaRank <= 60) {
      winChance -= 0.05;  // Below average - slight penalty
    } else if (playerFifaRank <= 80) {
      winChance -= 0.12;  // Weak nations - significant penalty
    } else {
      winChance -= 0.20;  // Very weak nations (rank 80+) - heavy penalty
    }
    
    // Clamp initial calculation - Minnows can't have more than 25% base chance
    // against any opponent, Elite can't drop below 20%
    const maxChance = playerFifaRank > 60 ? 0.25 : 0.85;
    const minChance = playerFifaRank <= 20 ? 0.20 : 0.05;
    winChance = clamp(winChance, minChance, maxChance);
  } else {
    // Fallback to old system if opponent rank not provided
    winChance = {
      Elite: 0.52,
      Good: 0.38,
      Average: 0.22,
      Minnow: 0.08,  // Reduced from 0.10
    }[nationalReputation] || 0.08;
  }

  // V4: Apply dynasty penalty
  // Consecutive World Cup wins become exponentially harder
  if (consecutiveWorldCupWins > 0) {
    const dynastyMultiplier = calculateDynastyPenalty(consecutiveWorldCupWins);
    winChance *= dynastyMultiplier;
    
    if (consecutiveWorldCupWins >= 2) {
      console.log(`[WorldCup] Dynasty penalty applied: ${consecutiveWorldCupWins} consecutive wins, multiplier: ${dynastyMultiplier.toFixed(2)}`);
    }
  }
  
  // V4: Apply complacency factor for defending champions
  // Historical "curse" of defending champions - often exit early
  if (isDefendingChampion) {
    winChance *= (1 - WORLD_CUP_DYNASTY_CONFIG.complacencyFactor);
  }

  // V4: Apply knockout round variance
  // Later rounds are more unpredictable (cup magic / upsets)
  const knockoutVariance = WORLD_CUP_DYNASTY_CONFIG.knockoutVarianceBase * getKnockoutVarianceMultiplier(round);
  
  // Adjust by opponent strength - made more punishing
  // opponent.reputation is a NUMBER (90=Elite, 77=Good, 62=Average, 45=Minnow)
  if (opponent) {
    const rep = opponent.reputation;
    let opponentModifier: number;
    
    if (rep >= 85) {
      // Elite opponent (top 10 nations)
      opponentModifier = 0.50;  // Very hard to beat
    } else if (rep >= 70) {
      // Good opponent (ranks 11-30)
      opponentModifier = 0.70;
    } else if (rep >= 55) {
      // Average opponent (ranks 31-60)
      opponentModifier = 0.90;
    } else {
      // Minnow opponent (ranks 61+)
      opponentModifier = 1.10;
    }
    
    winChance *= opponentModifier;
  }

  // Adjust by national team cycle phase
  switch (nationalCycle.phase) {
    case "Golden Generation":
      winChance *= 1.35;
      break;
    case "Competitive":
      winChance *= 1.15;
      break;
    case "Transition":
      winChance *= 0.95;
      break;
    case "Rebuilding":
      winChance *= 0.8;
      break;
    case "Crisis":
      winChance *= 0.6;
      break;
  }

  // Point 6: Progressive difficulty by round - later rounds are harder
  // This makes winning the whole tournament realistically difficult
  if (round) {
    const roundDifficulty: Record<string, number> = {
      "Round of 16": 0.95,     // First knockout - still manageable
      "Quarter-Final": 0.85,   // Getting tough
      "Semi-Final": 0.75,      // Very hard - only best teams advance
      "Final": 0.65,           // Extremely difficult - peak competition
    };
    winChance *= roundDifficulty[round] || 1.0;
  }

  // CRITICAL: Player's performance in THIS match affects outcome
  if (matchLog.rating >= 9.0) {
    winChance *= 1.35; // Player was incredible - huge boost
  } else if (matchLog.rating >= 8.0) {
    winChance *= 1.2; // Player was great
  } else if (matchLog.rating >= 7.0) {
    winChance *= 1.05; // Player was solid
  } else if (matchLog.rating < 6.5) {
    winChance *= 0.85; // Player underperformed
  } else if (matchLog.rating < 6.0) {
    winChance *= 0.7; // Player was poor - hurts team
  }

  // Player's goals in this match heavily influence result
  if (matchLog.goals >= 2) {
    winChance *= 1.5; // Brace almost guarantees victory
  } else if (matchLog.goals >= 1) {
    winChance *= 1.25; // Scored - good boost
  }

  // Player's assists
  if (matchLog.assists >= 1) {
    winChance *= 1.1;
  }

  // Momentum factor
  winChance *= 1 + nationalCycle.momentum / 100;

  // Random factor for drama
  winChance *= randFloat(0.85, 1.15);

  // Clamp to reasonable range
  winChance = clamp(winChance, 0.05, 0.95);

  const won = Math.random() < winChance;

  // Generate narrative based on outcome and performance
  let narrative: string;
  if (won) {
    if (matchLog.goals >= 2) {
      narrative = `Incredible performance! ${matchLog.goals} goals helped seal the victory!`;
    } else if (matchLog.goals >= 1) {
      narrative = `Crucial goal in a hard-fought victory!`;
    } else if (matchLog.rating >= 8.5) {
      narrative = `A commanding display leading to a deserved win!`;
    } else {
      narrative = `The team advances after a tense battle!`;
    }
  } else {
    if (matchLog.rating >= 8.0) {
      narrative = `Despite a great individual performance, the team fell short.`;
    } else if (matchLog.rating < 6.5) {
      narrative = `A disappointing collective display ends the tournament run.`;
    } else {
      narrative = `Heartbreak as the team is eliminated.`;
    }
  }

  return { won, narrative };
};

// ==================== SISTEMA DE STATUS NA SELEÃ‡ÃƒO ====================

/**
 * Atualiza o status do jogador na seleção
 */
const updateNationalTeamStatus = (
  player: Player,
  requiredOvr: number,
  nationalCycle: NationalTeamCycle,
  matchLogs: MatchLog[],
): { newStatus: Player["nationalTeamStatus"]; event?: CareerEvent } => {
  const currentStatus = player.nationalTeamStatus;
  const caps = player.internationalCaps;
  const ovr = player.stats.overall;
  const age = player.age;

  // Calcular performance média
  const avgRating =
    matchLogs.length > 0
      ? matchLogs.reduce((sum, p) => sum + p.rating, 0) / matchLogs.length
      : 7.0;

  // ========== PROMOÃ‡ÃƒO ==========

  // Chamado â†’ Jogador de Elenco
  if (
    currentStatus === "Called Up" &&
    caps >= 10 &&
    ovr >= requiredOvr &&
    avgRating >= 6.5
  ) {
    return {
      newStatus: "Squad Player",
      event: {
        type: "milestone",
        description: 'events.national.squadPlayer',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  // Jogador de Elenco â†’ Titular
  if (
    currentStatus === "Squad Player" &&
    caps >= 30 &&
    ovr >= requiredOvr + 2 &&
    avgRating >= 7.0
  ) {
    return {
      newStatus: "Regular Starter",
      event: {
        type: "milestone",
        description: 'events.national.regularStarter',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  // Titular â†’ Capitão
  if (
    currentStatus === "Regular Starter" &&
    caps >= 60 &&
    age >= 26 &&
    player.stats.leadership >= 80 &&
    avgRating >= 7.2 &&
    (player.traits.some((t) => t.name === "Leadership") ||
      player.personality === "Professional")
  ) {
    return {
      newStatus: "Captain",
      event: {
        type: "milestone",
        description: 'events.national.namedCaptain',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  // ========== REBAIXAMENTO ==========

  // Capitão â†’ Titular (perda de capitania)
  if (
    currentStatus === "Captain" &&
    (age >= 34 || player.form <= -5 || avgRating < 6.5)
  ) {
    return {
      newStatus: "Regular Starter",
      event: {
        type: "manager_fallout",
        description: 'events.national.lostCaptaincy',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  // Titular â†’ Jogador de Elenco
  if (
    currentStatus === "Regular Starter" &&
    (ovr < requiredOvr || player.form <= -6 || avgRating < 6.0)
  ) {
    return {
      newStatus: "Squad Player",
      event: {
        type: "poor_performance",
        description: 'events.national.demoted',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  // Qualquer â†’ Dropped
  if (
    ovr < requiredOvr - 5 ||
    player.form <= -8 ||
    avgRating < 5.5 ||
    age >= 37
  ) {
    return {
      newStatus: "Not Called",
      event: {
        type: "manager_fallout",
        description: 'events.national.dropped',
        descriptionParams: { country: player.nationality },
      },
    };
  }

  return { newStatus: currentStatus };
};

// ==================== FUNÃ‡ÃƒO PRINCIPAL ====================

export const simulateNationalTeamSeason = (
  player: Player,
  clubGoals: number,
  clubAssists: number,
): NationalTeamResult => {
  const events: CareerEvent[] = [];
  const matchLogs: MatchLog[] = [];
  let followerGrowth = 0;
  let reputationChange = 0;
  let wonWorldCup = false;
  let wonContinentalCup = false;
  let wonNationsLeague = false;
  let retiredFromNationalTeam = false;

  // ========== VERIFICAÃ‡Ã•ES BÃSICAS ==========
  if (!player.hasMadeSeniorDebut || player.age < 17 || player.age > 38) {
    return {
      updatedPlayer: player,
      events,
      followerGrowth,
      reputationChange,
      matchLogs,
      wonWorldCup,
      wonContinentalCup,
      wonNationsLeague,
      retiredFromNationalTeam,
    };
  }

  // ========== APOSENTADORIA DA SELEÃ‡ÃƒO ==========
  if (player.age >= 36 && player.nationalTeamStatus !== "Not Called") {
    // 30% de chance por ano após 36
    const retirementChance = (player.age - 35) * 0.3;

    if (Math.random() < retirementChance) {
      player.nationalTeamStatus = "Not Called";
      retiredFromNationalTeam = true;

      events.push({
        type: "milestone",
        description: 'events.national.retirementAnnounced',
        descriptionParams: { caps: player.internationalCaps, country: player.nationality },
      });

      if (player.internationalCaps >= 100) {
        followerGrowth += rand(500000, 2000000);
      }

      return {
        updatedPlayer: player,
        events,
        followerGrowth,
        reputationChange,
        matchLogs,
        wonWorldCup,
        wonContinentalCup,
        wonNationsLeague,
        retiredFromNationalTeam,
      };
    }
  }

  // ========== CONTEXTO NACIONAL ==========
  // CORRIGIDO: NATIONALITIES é um array, não um objeto - usar .find()
  // E a reputação é calculada a partir do fifaRank, não é uma propriedade direta
  const natInfo = NATIONALITIES.find((n) => n.name === player.nationality);
  const nationalReputation: "Elite" | "Good" | "Average" | "Minnow" = natInfo
    ? getReputationFromRank(natInfo.fifaRank)
    : "Average";

  const requiredOvrMap = {
    Elite: 84,
    Good: 80,
    Average: 77,
    Minnow: 74,
  };
  const requiredOvr = requiredOvrMap[nationalReputation];

  // Determinar ciclo da seleção
  const nationalCycle = determineNationalTeamCycle(
    player.nationality,
    nationalReputation,
  );

  console.log(
    `[${player.name}] National team cycle: ${nationalCycle.phase}, Manager: ${nationalCycle.managerQuality}, Momentum: ${nationalCycle.momentum}`,
  );

  // ========== CONVOCAÃ‡ÃƒO ==========
  const isCurrentlyCalled = player.nationalTeamStatus !== "Not Called";

  if (!isCurrentlyCalled) {
    const callUpProb = calculateCallUpProbability(
      player,
      requiredOvr,
      nationalCycle,
    );

    console.log(`  Call-up probability: ${(callUpProb * 100).toFixed(1)}%`);

    if (Math.random() < callUpProb) {
      player.nationalTeamStatus = "Called Up";
      player.internationalCaps = player.internationalCaps || 0;

      events.push({
        type: "milestone",
        description: 'events.national.firstCallUp',
        descriptionParams: { country: player.nationality },
      });

      followerGrowth += rand(100000, 500000);
      reputationChange += 2;
    } else {
      // Não convocado
      return {
        updatedPlayer: player,
        events,
        followerGrowth,
        reputationChange,
        matchLogs,
        wonWorldCup,
        wonContinentalCup,
        wonNationsLeague,
        retiredFromNationalTeam,
      };
    }
  }

  // ========== GERAR CALENDÃRIO ==========
  const fixtures = generateNationalTeamFixtures(
    player,
    nationalReputation,
    nationalCycle,
  );

  console.log(`  Fixtures: ${fixtures.length} competitions`);

  // ========== SIMULAR JOGOS COM PROGRESSÃO DE TORNEIO ==========
  let totalCaps = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalCleanSheets = 0;

  // Track tournament progression
  let worldCupEliminated = false;
  let worldCupRoundReached = "";
  let continentalEliminated = false;
  let continentalRoundReached = "";

  // Separate fixtures by type for proper tournament simulation
  const worldCupFixtures = fixtures.filter((f) => f.type === "World Cup");
  const continentalFixtures = fixtures.filter(
    (f) => f.type === "Continental Cup",
  );
  const nationsLeagueFixtures = fixtures.filter(
    (f) => f.type === "Nations League",
  );
  const otherFixtures = fixtures.filter(
    (f) =>
      f.type !== "World Cup" &&
      f.type !== "Continental Cup" &&
      f.type !== "Nations League",
  );

  // Process regular fixtures (friendlies, qualifiers)
  for (const fixture of otherFixtures) {
    const result = processNormalFixture(
      player,
      fixture,
      nationalCycle,
      clubGoals,
      clubAssists,
      matchLogs,
      events,
    );
    totalCaps += result.caps;
    totalGoals += result.goals;
    totalAssists += result.assists;
    totalCleanSheets += result.cleanSheets;
  }

  // ========== NATIONS LEAGUE - SIMULAÇÃO COM KNOCKOUT ==========
  if (nationsLeagueFixtures.length > 0) {
    let nationsLeagueEliminated = false;

    for (const fixture of nationsLeagueFixtures) {
      if (nationsLeagueEliminated && fixture.isKnockout) break;

      const result = processNormalFixture(
        player,
        fixture,
        nationalCycle,
        clubGoals,
        clubAssists,
        matchLogs,
        events,
      );
      totalCaps += result.caps;
      totalGoals += result.goals;
      totalAssists += result.assists;
      totalCleanSheets += result.cleanSheets;

      // Handle knockout rounds for Nations League Finals
      if (fixture.isKnockout && result.caps > 0) {
        const matchLog = matchLogs[matchLogs.length - 1];
        // Get opponent's real FIFA rank for realistic simulation
        const opponentInfo = fixture.opponentName 
          ? NATIONALITIES.find(n => n.name === fixture.opponentName)
          : null;
        const opponentFifaRank = opponentInfo?.fifaRank;
        
        const knockoutResult = simulateKnockoutResult(
          matchLog,
          fixture.opponent,
          nationalReputation,
          nationalCycle,
          fixture.round, // Point 6: Pass round for progressive difficulty
          0, // consecutiveWorldCupWins
          false, // isDefendingChampion
          opponentFifaRank, // NEW: Pass opponent's real strength
        );

        if (!knockoutResult.won) {
          nationsLeagueEliminated = true;
          const opponentText = fixture.opponentName
            ? ` to ${fixture.opponentName}`
            : "";
          events.push({
            type: "milestone",
            description: 'events.national.nationsLeagueDefeat',
            descriptionParams: { round: fixture.round, opponent: opponentText, narrative: knockoutResult.narrative },
          });
        } else if (fixture.round === "Final") {
          // WON THE NATIONS LEAGUE!
          wonNationsLeague = true;
          player.trophies.nationsLeague++;
          const opponentText = fixture.opponentName
            ? ` against ${fixture.opponentName}`
            : "";
          events.push({
            type: "trophy",
            description: 'events.trophy.nationsLeagueChampions',
            descriptionParams: { country: player.nationality, opponent: opponentText, narrative: knockoutResult.narrative },
          });
          followerGrowth += rand(3000000, 10000000);
          reputationChange += 10;
        }
      }
    }
  }

  // ========== COPA DO MUNDO - SIMULAÇÃO COM PROGRESSÃO ==========
  if (worldCupFixtures.length > 0) {
    player.worldCupAppearances++;
    events.push({
      type: "milestone",
      description: 'events.national.worldCupSelected',
      descriptionParams: { country: player.nationality },
    });
    followerGrowth += rand(1000000, 5000000);
    reputationChange += 5;

    for (const fixture of worldCupFixtures) {
      // Skip if already eliminated
      if (worldCupEliminated) break;

      const roundName =
        fixture.round || (fixture.isKnockout ? "Knockout" : "Group Stage");
      worldCupRoundReached = roundName;

      // Determine if player plays
      let playChance = getPlayChance(
        player.nationalTeamStatus,
        fixture.importance,
      );
      const gamesPlayed =
        fixture.matchesPlayed > 0 && Math.random() < playChance
          ? fixture.matchesPlayed
          : 0;

      if (gamesPlayed > 0) {
        const actualFixture = { ...fixture, matchesPlayed: gamesPlayed };
        const matchLog = simulateMatchPerformance(
          player,
          actualFixture,
          nationalCycle,
          clubGoals,
          clubAssists,
        );

        matchLogs.push(matchLog);
        totalCaps += gamesPlayed;
        totalGoals += matchLog.goals;
        totalAssists += matchLog.assists;
        // Estimar clean sheets para goleiros
        if (player.position === "GK") {
          const cs =
            matchLog.rating >= 7.0
              ? Math.round(gamesPlayed * 0.4)
              : matchLog.rating >= 6.5
                ? Math.round(gamesPlayed * 0.3)
                : Math.round(gamesPlayed * 0.2);
          totalCleanSheets += cs;
        }

        // Special events for great performances
        const wcOpponentText = fixture.opponentName
          ? ` against ${fixture.opponentName}`
          : "";
        if (matchLog.goals >= 3) {
          events.push({
            type: "milestone",
            description: 'events.national.worldCupHatTrick',
            descriptionParams: { round: roundName, opponent: wcOpponentText, country: player.nationality },
          });
          followerGrowth += rand(2000000, 8000000);
          reputationChange += 8;
        } else if (matchLog.goals >= 2 && fixture.isKnockout) {
          events.push({
            type: "milestone",
            description: 'events.national.worldCupBrace',
            descriptionParams: { round: roundName, opponent: wcOpponentText },
          });
          followerGrowth += rand(500000, 2000000);
          reputationChange += 4;
        }

        // Knockout advancement decision based on actual match
        if (fixture.isKnockout) {
          // Get opponent's real FIFA rank for realistic simulation
          const opponentInfo = fixture.opponentName 
            ? NATIONALITIES.find(n => n.name === fixture.opponentName)
            : null;
          const opponentFifaRank = opponentInfo?.fifaRank;
          
          const knockoutResult = simulateKnockoutResult(
            matchLog,
            fixture.opponent,
            nationalReputation,
            nationalCycle,
            roundName, // Point 6: Pass round for progressive difficulty
            0, // consecutiveWorldCupWins
            false, // isDefendingChampion
            opponentFifaRank, // NEW: Pass opponent's real strength
          );

          if (!knockoutResult.won) {
            worldCupEliminated = true;
            const exitOpponent = fixture.opponentName
              ? ` to ${fixture.opponentName}`
              : "";
            events.push({
              type: "milestone",
              description: 'events.national.worldCupExit',
              descriptionParams: { round: roundName, opponent: exitOpponent, narrative: knockoutResult.narrative },
            });

            // Bonus for going far
            if (roundName === "Semi-Final") {
              followerGrowth += rand(3000000, 8000000);
              reputationChange += 8;
            } else if (roundName === "Quarter-Final") {
              followerGrowth += rand(1000000, 4000000);
              reputationChange += 4;
            }
          } else if (roundName === "Final") {
            // WON THE WORLD CUP!
            wonWorldCup = true;
            player.trophies.worldCup++;
            // Verificar conquistas de troféus imediatamente
            PlayGamesService.checkTrophyAchievements(player);
            events.push({
              type: "trophy",
              trophyKey: "worldCup",
              description: `events.trophy.worldCupChampions`,
              descriptionParams: {
                country: player.nationality,
                opponent: fixture.opponentName || "",
              },
            });
            followerGrowth += rand(15000000, 50000000);
            reputationChange += 30;

            // Golden Ball chance based on performance
            const avgWcRating =
              matchLogs
                .filter((m) => m.competition === "World Cup")
                .reduce((sum, m) => sum + m.rating, 0) /
              matchLogs.filter((m) => m.competition === "World Cup").length;

            if (avgWcRating >= 8.0 && totalGoals >= 3 && Math.random() < 0.4) {
              events.push({
                type: "milestone",
                description: 'events.award.worldCupGoldenBall',
              });
              followerGrowth += rand(10000000, 30000000);
            }
          } else {
            // Advanced to next round
            console.log(`  World Cup: Advanced past ${roundName}`);
          }
        } else {
          // Group stage - determine if qualified
          if (matchLog.rating >= 6.5 || totalGoals >= 1) {
            // Good performance = qualified
            console.log(`  World Cup: Qualified from group stage`);
          } else {
            // Poor group stage = 30% chance of group exit
            if (Math.random() < 0.3) {
              worldCupEliminated = true;
              events.push({
                type: "milestone",
                description: 'events.national.worldCupGroupExit',
              });
            }
          }
        }
      }
    }
  }

  // ========== COPA CONTINENTAL - SIMULAÇÃO COM PROGRESSÃO ==========
  if (continentalFixtures.length > 0) {
    player.continentalCupAppearances++;
    events.push({
      type: "milestone",
      description: 'events.national.continentalCupSelected',
    });
    followerGrowth += rand(500000, 2000000);
    reputationChange += 3;

    for (const fixture of continentalFixtures) {
      if (continentalEliminated) break;

      const roundName =
        fixture.round || (fixture.isKnockout ? "Knockout" : "Group Stage");
      continentalRoundReached = roundName;

      let playChance = getPlayChance(
        player.nationalTeamStatus,
        fixture.importance,
      );
      const gamesPlayed =
        fixture.matchesPlayed > 0 && Math.random() < playChance
          ? fixture.matchesPlayed
          : 0;

      if (gamesPlayed > 0) {
        const actualFixture = { ...fixture, matchesPlayed: gamesPlayed };
        const matchLog = simulateMatchPerformance(
          player,
          actualFixture,
          nationalCycle,
          clubGoals,
          clubAssists,
        );

        matchLogs.push(matchLog);
        totalCaps += gamesPlayed;
        totalGoals += matchLog.goals;
        totalAssists += matchLog.assists;
        // Estimar clean sheets para goleiros
        if (player.position === "GK") {
          const cs =
            matchLog.rating >= 7.0
              ? Math.round(gamesPlayed * 0.4)
              : matchLog.rating >= 6.5
                ? Math.round(gamesPlayed * 0.3)
                : Math.round(gamesPlayed * 0.2);
          totalCleanSheets += cs;
        }

        if (fixture.isKnockout) {
          // Get opponent's real FIFA rank for realistic simulation
          const opponentInfo = fixture.opponentName 
            ? NATIONALITIES.find(n => n.name === fixture.opponentName)
            : null;
          const opponentFifaRank = opponentInfo?.fifaRank;
          
          const knockoutResult = simulateKnockoutResult(
            matchLog,
            fixture.opponent,
            nationalReputation,
            nationalCycle,
            roundName, // Point 6: Pass round for progressive difficulty
            0, // consecutiveWorldCupWins
            false, // isDefendingChampion
            opponentFifaRank, // NEW: Pass opponent's real strength
          );

          if (!knockoutResult.won) {
            continentalEliminated = true;
            const exitOpponent = fixture.opponentName
              ? ` to ${fixture.opponentName}`
              : "";
            events.push({
              type: "milestone",
              description: 'events.national.continentalCupExit',
              descriptionParams: { round: roundName, opponent: exitOpponent, narrative: knockoutResult.narrative },
            });
          } else if (roundName === "Final") {
            wonContinentalCup = true;
            player.trophies.continentalCup++;
            // Verificar conquistas de troféus imediatamente
            PlayGamesService.checkTrophyAchievements(player);
            const finalOpponentText = fixture.opponentName
              ? ` against ${fixture.opponentName}`
              : "";
            events.push({
              type: "trophy",
              trophyKey: "continentalCup",
              description: `events.trophy.continentalCupChampions`,
              descriptionParams: {
                country: player.nationality,
                opponent: fixture.opponentName || "",
              },
            });
            followerGrowth += rand(5000000, 15000000);
            reputationChange += 15;
          }
        } else {
          // Group stage qualification
          if (matchLog.rating < 6.0 && Math.random() < 0.25) {
            continentalEliminated = true;
            events.push({
              type: "milestone",
              description: 'events.national.continentalCupGroupExit',
            });
          }
        }
      }
    }
  }

  player.internationalCaps += totalCaps;
  player.internationalGoals += totalGoals;
  player.internationalAssists += totalAssists;

  if (totalCaps > 0) {
    const avgRating =
      matchLogs.reduce((sum, p) => sum + p.rating, 0) / matchLogs.length;

    events.push({
      type: "milestone",
      description: 'events.national.seasonSummary',
      descriptionParams: { caps: totalCaps, country: player.nationality, goals: totalGoals, assists: totalAssists, rating: avgRating.toFixed(1) },
    });

    followerGrowth += totalCaps * rand(20000, 100000);
  }

  // ========== MILESTONES DE CAPS ==========
  if (player.internationalCaps === 50) {
    events.push({
      type: "milestone",
      description: 'events.national.milestone50caps',
      descriptionParams: { country: player.nationality },
    });
    followerGrowth += rand(200000, 800000);
  } else if (player.internationalCaps === 100) {
    events.push({
      type: "milestone",
      description: 'events.national.centurion',
      descriptionParams: { country: player.nationality },
    });
    followerGrowth += rand(1000000, 5000000);
    reputationChange += 10;
  } else if (player.internationalCaps === 150) {
    events.push({
      type: "milestone",
      description: 'events.national.150caps',
      descriptionParams: { country: player.nationality },
    });
    followerGrowth += rand(2000000, 10000000);
    reputationChange += 15;
  }

  return {
    updatedPlayer: player,
    events,
    followerGrowth,
    reputationChange,
    matchLogs,
    wonWorldCup,
    wonContinentalCup,
    wonNationsLeague,
    retiredFromNationalTeam,
  };
};

// ==================== FUNÃ‡Ã•ES AUXILIARES ====================

/**
 * Para debug - imprime estatísticas da temporada
 */
export const printNationalTeamSeasonSummary = (
  result: NationalTeamResult,
): void => {
  console.log(`
========== NATIONAL TEAM SEASON ==========`);
  console.log(`Player: ${result.updatedPlayer.name}`);
  console.log(`Status: ${result.updatedPlayer.nationalTeamStatus}`);
  console.log(`Caps: ${result.updatedPlayer.internationalCaps}`);
  console.log(`Goals: ${result.updatedPlayer.internationalGoals}`);
  console.log(`Assists: ${result.updatedPlayer.internationalAssists}`);
  console.log(`
Performances: ${result.matchLogs.length} matches`);

  if (result.matchLogs.length > 0) {
    const avgRating =
      result.matchLogs.reduce((sum, p) => sum + p.rating, 0) /
      result.matchLogs.length;
    const totalGoals = result.matchLogs.reduce((sum, p) => sum + p.goals, 0);
    const totalAssists = result.matchLogs.reduce(
      (sum, p) => sum + p.assists,
      0,
    );
    const motmCount = result.matchLogs.filter((p) => p.rating >= 8.5).length;

    console.log(`  Avg Rating: ${avgRating.toFixed(1)}/10`);
    console.log(`  Goals: ${totalGoals}`);
    console.log(`  Assists: ${totalAssists}`);
    console.log(`  MOTM: ${motmCount}`);
  }

  console.log(`
Follower Growth: +${result.followerGrowth.toLocaleString()}`);
  console.log(
    `Reputation Change: ${result.reputationChange > 0 ? "+" : ""}${result.reputationChange}`,
  );

  if (result.wonWorldCup) console.log(`ðŸ† WORLD CUP WINNER!`);
  if (result.wonContinentalCup) console.log(`ðŸ† CONTINENTAL CUP WINNER!`);
  if (result.retiredFromNationalTeam)
    console.log(`ðŸ‘‹ Retired from international football`);

  console.log(`
Events: ${result.events.length}`);
  result.events.forEach((e) => console.log(`  - ${e.description}`));
  console.log(`==========================================
`);
};
