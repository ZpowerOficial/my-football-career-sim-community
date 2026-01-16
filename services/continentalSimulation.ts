import {
  Player,
  Team,
  CompetitionContext,
  ContinentalSimulationResult,
  ChampionsLeagueFormat,
} from "../types";
import { calculateDetailedPerformance } from "./matchLogic";
import { rand, clamp, gaussianRandom } from "./utils";
import { simulateMatch } from "./match/matchSimulator";
import { LEAGUES } from "../constants/leagues";
import { NATIONALITIES } from "../constants/general";

// ==================== HELPERS ====================

/**
 * Calcula o número de jogos do TIME baseado em até onde chegou na competição.
 * Competições com fase de grupos: base + mata-mata
 * Competições só knockout: soma progressiva de fases
 */
const calculateTeamMatchesByRound = (
  roundReached: string | undefined,
  hasLeaguePhase: boolean = false,
  leaguePhaseMatches: number = 0,
  isSouthAmerica: boolean = false,
): number => {
  // Fase de grupos/liga (se aplicável)
  let matches = hasLeaguePhase ? leaguePhaseMatches : 0;

  if (!roundReached) return matches;

  // Mata-mata - ida e volta na maioria das competições
  // Champions League moderna: playoffs ida/volta, depois mata-mata ida/volta até semi, final única
  // Libertadores: grupos 6 jogos, depois mata-mata ida/volta
  const knockoutRounds: Record<string, number> = {
    // Se não passou da fase de grupos
    "Group Stage": 0,
    "League Phase": 0,
    // Playoffs/oitavas
    Playoff: 2,
    R32: isSouthAmerica ? 2 : 2,
    R16: isSouthAmerica ? 4 : 4,
    // Quartas
    QF: isSouthAmerica ? 6 : 6,
    // Semi
    SF: isSouthAmerica ? 8 : 8,
    // Final (jogo único na UCL, ida/volta na Libertadores)
    Final: isSouthAmerica ? 10 : 9,
    Winner: isSouthAmerica ? 10 : 9,
  };

  matches += knockoutRounds[roundReached] || 0;
  return matches;
};

const getContinent = (country: string): string | null => {
  const nationality = NATIONALITIES.find((n) => n.name === country);
  return nationality ? nationality.continent : null;
};

// Função para embaralhar array (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getRealTeamsForContinental = (
  continent: "Europe" | "South America" | "Asia" | "Africa" | "North America",
  count: number,
  playerTeam: Team,
): Team[] => {
  const allTeams = Object.values(LEAGUES).flatMap((league) =>
    Object.values(league.divisions).flat(),
  );

  const continentalTeams = allTeams.filter((team) => {
    const teamContinent = getContinent(team.country);
    return (
      teamContinent === continent &&
      team.leagueTier === 1 &&
      team.name !== playerTeam.name
    );
  });

  continentalTeams.sort((a, b) => b.reputation - a.reputation);

  const topPoolSize = Math.min(
    continentalTeams.length,
    Math.floor(count * 1.5),
  );
  const topPool = continentalTeams.slice(0, topPoolSize);

  // Embaralha para adicionar aleatoriedade
  const shuffled = shuffleArray(topPool);

  if (continentalTeams.length < count) {
    console.error(
      `[Continental] CRITICAL ERROR: Not enough real teams found for ${continent}. Need ${count}, found ${continentalTeams.length}.`,
    );
    console.log(`[Continental] DEBUG INFO:`);
    console.log(`- LEAGUES keys: ${Object.keys(LEAGUES).join(", ")}`);
    console.log(`- NATIONALITIES length: ${NATIONALITIES.length}`);
    console.log(
      `- First 3 NATIONALITIES: ${JSON.stringify(NATIONALITIES.slice(0, 3))}`,
    );
    console.log(`- Player Team: ${playerTeam.name} (${playerTeam.country})`);

    // Check if player country exists in LEAGUES
    const playerLeague = LEAGUES[playerTeam.country];
    console.log(`- League for ${playerTeam.country} exists? ${!!playerLeague}`);

    // Check a known European country
    const englandLeague = LEAGUES["England"];
    console.log(`- League for England exists? ${!!englandLeague}`);

    const needed = count - continentalTeams.length;
    const genericTeams: Team[] = [];

    for (let i = 0; i < needed; i++) {
      genericTeams.push({
        id: `generic_${continent}_${i}`,
        name: `${continent} Club ${i + 1}`,
        country: continent === "Europe" ? "England" : "Brazil", // Fallback country
        leagueTier: 1,
        reputation: 70 + Math.floor(Math.random() * 20),
        isYouth: false,
        squadStrength: undefined,
      });
    }

    return [...shuffled, ...genericTeams].slice(0, count);
  }

  return shuffled.slice(0, count);
};

const injectPlayerTeamIntoList = (teams: Team[], playerTeam: Team): Team[] => {
  if (!playerTeam) return teams;
  const exists = teams.some((t) => t.name === playerTeam.name);
  if (exists) return teams;

  const newTeams = [...teams];
  if (newTeams.length > 0) {
    // Substitui um time aleatório do terço inferior (não sempre o mais fraco)
    const lowerThirdStart = Math.floor(newTeams.length * 0.66);
    const replaceIndex =
      lowerThirdStart +
      Math.floor(Math.random() * (newTeams.length - lowerThirdStart));
    newTeams[replaceIndex] = { ...playerTeam };
  } else {
    newTeams.push({ ...playerTeam });
  }

  return newTeams;
};

// ==================== LÓGICA PRINCIPAL ====================

export const simulateContinentalSeason = async (
  context: CompetitionContext,
  player: Player,
  t: (key: string) => string,
): Promise<ContinentalSimulationResult> => {
  const competitionType = getContinentalCompetitionType(context);

  const simulationMap: Record<
    string,
    (c: CompetitionContext, p: Player) => Promise<ContinentalSimulationResult>
  > = {
    "Continental Championship": simulateChampionsLeague,
    "Continental Cup": simulateEuropaLeague,
    "Continental League": simulateConferenceLeague,
    "South American Championship": simulateLibertadores,
    "South American Cup": simulateSudamericana,
    "Asian Championship": simulateAFC,
    "Asian Cup": simulateAFCCup,
    "African Championship": simulateCAF,
    "African Cup": simulateCAFConfed,
    "North American Championship": simulateCONCACAF,
  };

  const simulationFunction =
    simulationMap[competitionType] || simulateGenericContinental;
  const result = await simulationFunction(context, player);

  logContinentalSummary(context, result, competitionType, t);

  return result;
};

const logContinentalSummary = (
  context: CompetitionContext,
  result: ContinentalSimulationResult,
  competitionName: string,
  t: (key: string) => string,
): void => {
  const winnerName = result.winner?.name || "Unknown";
  const playerStats = result.playerStats;
  const playerTeamName = context.playerTeam.name;

  let resultText = t("logs.result.roundOf16");
  if (playerStats.wonCompetition) resultText = t("logs.result.winner");
  else if (playerStats.reachedFinal) resultText = t("logs.result.finalist");
  else if (playerStats.roundReached) {
    switch (playerStats.roundReached) {
      case "SF":
        resultText = t("logs.result.semiFinalist");
        break;
      case "QF":
        resultText = t("logs.result.quarterFinalist");
        break;
      case "R16":
        resultText = t("logs.result.roundOf16");
        break;
      default:
        resultText = playerStats.roundReached;
    }
  } else if (playerStats.reachedKnockout)
    resultText = t("logs.result.quarterFinalist"); // Fallback
  else if (playerStats.position)
    resultText = `Position: ${playerStats.position}`;

  console.log(`
========== ${t("logs.continentalSummary.title")} (${competitionName.toUpperCase()}) ==========
${t("logs.result.winner")}: ${winnerName}
-------------------------------------------
${t("logs.cupSummary.playerTeam")}: ${playerTeamName}
${t("logs.cupSummary.result")}: ${resultText}
${t("logs.cupSummary.playerStats")}: ${playerStats.goals}G ${playerStats.assists}A | ${t("logs.cupSummary.rating")}: ${playerStats.rating.toFixed(1)}
===========================================
`);
};

export const getContinentalCompetitionType = (
  context: CompetitionContext,
): string => {
  if (context.continentalCompetitionName)
    return context.continentalCompetitionName;

  const country = context.playerCountry;
  const nationality = NATIONALITIES.find((n) => n.name === country);

  if (!nationality) {
    console.warn(
      `[Continental] Unknown continent for ${country}, defaulting to Continental Championship`,
    );
    return "Continental Championship";
  }

  switch (nationality.continent) {
    case "Europe":
      return "Continental Championship";
    case "South America":
      return "South American Championship";
    case "Asia":
    case "Australia": // Australia plays in AFC
      return "Asian Championship";
    case "Africa":
      return "African Championship";
    case "North America":
      return "North American Championship";
    default:
      return "Continental Championship";
  }
};

// ==================== SIMULAÇÕES ESPECIALIZADAS ====================

const simulateChampionsLeague = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const clFormat = createChampionsLeagueFormat(context.playerTeam);
  const leaguePhaseResult = simulateChampionsLeaguePhase(clFormat);

  const playerIndexInRanking = leaguePhaseResult.overallRanking.findIndex(
    (t) => t.name === context.playerTeam.name,
  );

  const advancesToKnockout =
    playerIndexInRanking !== -1 && playerIndexInRanking < 24;
  let knockoutResult = null;

  if (advancesToKnockout) {
    knockoutResult = simulateChampionsLeagueKnockout(
      leaguePhaseResult,
      context.playerTeam,
    );
  }

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    clFormat,
    advancesToKnockout,
    knockoutResult?.reachedFinal || false,
    knockoutResult?.wonCompetition || false,
    knockoutResult?.roundReached,
  );

  // Calcular jogos do TIME na Champions:
  // Fase de liga: 8 jogos (todos jogam)
  // Mata-mata: depende de até onde chegou
  let teamMatchesPlayed = 8; // Fase de liga
  if (advancesToKnockout && knockoutResult?.roundReached) {
    // Adiciona jogos do mata-mata baseado em até onde chegou
    const knockoutRounds: Record<string, number> = {
      Playoff: 2, // Ida e volta
      R16: 4, // Playoff + oitavas
      QF: 6, // + quartas
      SF: 8, // + semi
      Final: 9, // + final (jogo único)
      Winner: 9, // Campeão
    };
    teamMatchesPlayed += knockoutRounds[knockoutResult.roundReached] || 0;
  }

  return {
    finalTable: leaguePhaseResult.overallRanking,
    winner: knockoutResult?.winner || leaguePhaseResult.overallRanking[0],
    teamMatchesPlayed,
    playerStats,
  };
};

const createChampionsLeagueFormat = (
  playerTeam: Team,
): ChampionsLeagueFormat => {
  let teams = getRealTeamsForContinental("Europe", 35, playerTeam);
  teams = injectPlayerTeamIntoList(teams, playerTeam);

  // Embaralha antes de ordenar para adicionar variação
  teams = shuffleArray(teams);

  const sortedTeams = teams.sort((a, b) => b.reputation - a.reputation);
  const pots: Team[][] = Array.from({ length: 4 }, (_, i) =>
    sortedTeams.slice(i * 9, (i + 1) * 9),
  );

  return {
    leaguePhase: {
      teams: sortedTeams,
      matchesPerTeam: 8,
      homeMatches: 4,
      awayMatches: 4,
    },
    knockoutPhase: {
      roundOf16: true,
      quarterFinals: true,
      semiFinals: true,
      final: true,
    },
    pots,
    overallRanking: sortedTeams,
  };
};

const simulateChampionsLeaguePhase = (
  clFormat: ChampionsLeagueFormat,
): { overallRanking: Team[] } => {
  const teams = clFormat.leaguePhase?.teams || [];
  if (!Array.isArray(teams) || teams.length === 0) {
    return { overallRanking: [] };
  }

  const standings: Map<
    string,
    { points: number; goalDiff: number; goalsFor: number }
  > = new Map();
  teams.forEach((team) =>
    standings.set(team.name, { points: 0, goalDiff: 0, goalsFor: 0 }),
  );

  // Cada time joga 8 partidas contra adversários aleatórios
  teams.forEach((team) => {
    const opponents = shuffleArray(
      teams.filter((t) => t.name !== team.name),
    ).slice(0, 8);

    opponents.forEach((opponent, index) => {
      const isHome = index < 4;
      const homeTeam = isHome ? team : opponent;
      const awayTeam = isHome ? opponent : team;

      const result = simulateMatch(homeTeam, awayTeam, [], [], {
        isNeutralVenue: false,
      });

      const teamStats = standings.get(team.name)!;
      const opponentStats = standings.get(opponent.name)!;

      if (isHome) {
        teamStats.points += result.homePoints;
        teamStats.goalDiff += result.homeGoals - result.awayGoals;
        teamStats.goalsFor += result.homeGoals;

        opponentStats.points += result.awayPoints;
        opponentStats.goalDiff += result.awayGoals - result.homeGoals;
        opponentStats.goalsFor += result.awayGoals;
      } else {
        teamStats.points += result.awayPoints;
        teamStats.goalDiff += result.awayGoals - result.homeGoals;
        teamStats.goalsFor += result.awayGoals;

        opponentStats.points += result.homePoints;
        opponentStats.goalDiff += result.homeGoals - result.awayGoals;
        opponentStats.goalsFor += result.homeGoals;
      }
    });
  });

  // Ordena por pontos, saldo de gols, gols marcados
  const overallRanking = [...teams].sort((a, b) => {
    const aStats = standings.get(a.name)!;
    const bStats = standings.get(b.name)!;

    if (bStats.points !== aStats.points) return bStats.points - aStats.points;
    if (bStats.goalDiff !== aStats.goalDiff)
      return bStats.goalDiff - aStats.goalDiff;
    return bStats.goalsFor - aStats.goalsFor;
  });

  return { overallRanking };
};

const simulateChampionsLeagueKnockout = (
  leagueResult: { overallRanking: Team[] },
  playerTeam: Team,
): {
  winner: Team;
  reachedFinal: boolean;
  wonCompetition: boolean;
  roundReached: string;
} => {
  const ranking = leagueResult.overallRanking;
  let roundReached = "League Phase";

  // Top 8 vão direto para as oitavas
  const top8 = ranking.slice(0, 8);

  // 9º ao 24º jogam playoffs
  const playoffTeams = ranking.slice(8, 24);
  const playoffWinners: Team[] = [];

  // Embaralha e faz confrontos de playoff
  const shuffledPlayoff = shuffleArray(playoffTeams);
  for (let i = 0; i < shuffledPlayoff.length; i += 2) {
    if (shuffledPlayoff[i + 1]) {
      const winner = simulateTwoLeggedTie(
        shuffledPlayoff[i],
        shuffledPlayoff[i + 1],
      );
      playoffWinners.push(winner);
      if (
        shuffledPlayoff[i].name === playerTeam.name ||
        shuffledPlayoff[i + 1].name === playerTeam.name
      ) {
        if (winner.name !== playerTeam.name) roundReached = "Playoffs";
        else roundReached = "R16"; // Advanced to R16
      }
    }
  }

  // Oitavas de final: Top 8 vs 8 vencedores dos playoffs
  const roundOf16Teams = [...top8, ...playoffWinners];
  const shuffledR16 = shuffleArray(roundOf16Teams);

  const quarterFinalists: Team[] = [];
  for (let i = 0; i < shuffledR16.length; i += 2) {
    if (shuffledR16[i + 1]) {
      const winner = simulateTwoLeggedTie(shuffledR16[i], shuffledR16[i + 1]);
      quarterFinalists.push(winner);
      if (
        shuffledR16[i].name === playerTeam.name ||
        shuffledR16[i + 1].name === playerTeam.name
      ) {
        if (winner.name !== playerTeam.name) roundReached = "R16";
        else roundReached = "QF"; // Advanced to QF
      }
    }
  }

  // Quartas de final
  const shuffledQF = shuffleArray(quarterFinalists);
  const semiFinalists: Team[] = [];
  for (let i = 0; i < shuffledQF.length; i += 2) {
    if (shuffledQF[i + 1]) {
      const winner = simulateTwoLeggedTie(shuffledQF[i], shuffledQF[i + 1]);
      semiFinalists.push(winner);
      if (
        shuffledQF[i].name === playerTeam.name ||
        shuffledQF[i + 1].name === playerTeam.name
      ) {
        if (winner.name !== playerTeam.name) roundReached = "QF";
        else roundReached = "SF"; // Advanced to SF
      }
    }
  }

  if (semiFinalists.length < 2) {
    return {
      winner: semiFinalists[0] || playerTeam,
      reachedFinal: false,
      wonCompetition: false,
      roundReached,
    };
  }

  // Semi-finais
  const finalist1 = simulateTwoLeggedTie(semiFinalists[0], semiFinalists[1]);
  const finalist2 =
    semiFinalists.length >= 4
      ? simulateTwoLeggedTie(semiFinalists[2], semiFinalists[3])
      : semiFinalists[2] || semiFinalists[0];

  if (semiFinalists.some((t) => t.name === playerTeam.name)) {
    if (
      finalist1.name === playerTeam.name ||
      finalist2.name === playerTeam.name
    )
      roundReached = "Final";
    else roundReached = "SF";
  }

  // Final (jogo único em campo neutro)
  const finalResult = simulateMatch(finalist1, finalist2, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });
  const winner = finalResult.winner!;

  const reachedFinal =
    finalist1.name === playerTeam.name || finalist2.name === playerTeam.name;
  const wonCompetition = winner.name === playerTeam.name;

  if (wonCompetition) roundReached = "Winner";
  else if (reachedFinal) roundReached = "Final";

  return { winner, reachedFinal, wonCompetition, roundReached };
};

// Simula confronto de ida e volta
const simulateTwoLeggedTie = (team1: Team, team2: Team): Team => {
  // Times de alta reputação têm menor chance de upset em mata-mata
  const maxRep = Math.max(team1.reputation, team2.reputation);
  const repDiff = Math.abs(team1.reputation - team2.reputation);
  const upsetFactor = maxRep >= 85 && repDiff >= 10 ? 0.08 : 0.15;

  // FIX 3: Penalidade para times de baixa reputação (possivelmente rebaixados)
  // Times com rep ≤68 têm performance reduzida em copas continentais
  const team1LowRepPenalty =
    team1.reputation <= 68 ? 0.75 : team1.reputation <= 72 ? 0.85 : 1.0;
  const team2LowRepPenalty =
    team2.reputation <= 68 ? 0.75 : team2.reputation <= 72 ? 0.85 : 1.0;

  const leg1 = simulateMatch(team1, team2, [], [], {
    isNeutralVenue: false,
    upsetFactor: upsetFactor,
  });
  const leg2 = simulateMatch(team2, team1, [], [], {
    isNeutralVenue: false,
    upsetFactor: upsetFactor,
  });

  // Aplicar penalidade aos gols (simula baixa performance de times fracos)
  const team1Aggregate = Math.floor(
    (leg1.homeGoals + leg2.awayGoals) * team1LowRepPenalty,
  );
  const team2Aggregate = Math.floor(
    (leg1.awayGoals + leg2.homeGoals) * team2LowRepPenalty,
  );
  const team1AwayGoals = Math.floor(leg2.awayGoals * team1LowRepPenalty);
  const team2AwayGoals = Math.floor(leg1.awayGoals * team2LowRepPenalty);

  if (team1Aggregate > team2Aggregate) return team1;
  if (team2Aggregate > team1Aggregate) return team2;

  // Empate no agregado - gols fora (regra antiga, mas ainda usada em algumas competições)
  if (team1AwayGoals > team2AwayGoals) return team1;
  if (team2AwayGoals > team1AwayGoals) return team2;

  // Prorrogação/Pênaltis - vantagem para time de maior reputação
  // FIX 3: Times fracos têm ainda menos chance em pênaltis
  const repAdvantage = (team1.reputation - team2.reputation) * 0.008;
  const team1Chance = 0.5 + repAdvantage;
  return Math.random() < team1Chance ? team1 : team2;
};

// Torneio knockout genérico com embaralhamento
const simulateKnockoutTournament = (
  teams: Team[],
  rounds: number,
  playerTeam: Team,
): {
  winner: Team;
  playerEliminated: boolean;
  playerReachedFinal: boolean;
  roundReached: string;
} => {
  // Embaralha os times antes de começar
  let remainingTeams = shuffleArray([...teams]);
  let playerEliminated = false;
  let playerReachedFinal = false;
  let roundReached = "Group Stage"; // Default if eliminated before knockout (shouldn't happen here but safe default)

  const playerTeamName = playerTeam.name;
  const totalRounds = rounds;

  for (let round = 0; round < rounds; round++) {
    const winners: Team[] = [];

    if (remainingTeams.length < 2) break;

    // Determine current round name
    let currentRoundName = `Round ${round + 1}`;
    const teamsRemaining = remainingTeams.length;
    if (teamsRemaining === 2) currentRoundName = "Final";
    else if (teamsRemaining === 4) currentRoundName = "SF";
    else if (teamsRemaining === 8) currentRoundName = "QF";
    else if (teamsRemaining === 16) currentRoundName = "R16";

    // Verifica se é a final
    const isFinal = remainingTeams.length === 2;
    if (isFinal && remainingTeams.some((t) => t.name === playerTeamName)) {
      playerReachedFinal = true;
      roundReached = "Final";
    }

    // Check if player is in this round
    const playerInRound = remainingTeams.some((t) => t.name === playerTeamName);
    if (playerInRound && !playerReachedFinal) {
      roundReached = currentRoundName;
    }

    for (let i = 0; i < remainingTeams.length; i += 2) {
      if (i + 1 >= remainingTeams.length) {
        winners.push(remainingTeams[i]);
        break;
      }

      let winner: Team;
      if (isFinal) {
        // Final é jogo único em campo neutro
        const result = simulateMatch(
          remainingTeams[i],
          remainingTeams[i + 1],
          [],
          [],
          {
            isCupMatch: true,
            extraTimeEnabled: true,
            isNeutralVenue: true,
          },
        );
        winner = result.winner!;
      } else {
        // Outras fases são ida e volta
        winner = simulateTwoLeggedTie(remainingTeams[i], remainingTeams[i + 1]);
      }

      winners.push(winner);

      // Verifica se o time do jogador foi eliminado
      const loser =
        winner.name === remainingTeams[i].name
          ? remainingTeams[i + 1]
          : remainingTeams[i];
      if (loser.name === playerTeamName) {
        playerEliminated = true;
        // roundReached is already set to the current round name above
      }
    }

    // Embaralha para a próxima rodada
    remainingTeams = shuffleArray(winners);
  }

  const winner = remainingTeams[0] || teams[0];
  if (winner.name === playerTeamName) {
    roundReached = "Winner";
  }

  return {
    winner,
    playerEliminated,
    playerReachedFinal,
    roundReached,
  };
};

// ==================== OUTRAS COMPETIÇÕES ====================

const simulateLibertadores = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "South America",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // Libertadores: 6 jogos fase de grupos + mata-mata ida/volta
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    true,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateEuropaLeague = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "Europe",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // Europa League: 8 jogos fase de liga + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    8,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateConferenceLeague = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "Europe",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // Conference League: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateAFC = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental("Asia", 31, context.playerTeam);
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // AFC Champions League: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateCAF = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "Africa",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // CAF Champions League: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateCONCACAF = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "North America",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // CONCACAF Champions League: 4 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    4,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateSudamericana = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "South America",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // Sudamericana: 6 jogos fase de grupos + mata-mata ida/volta
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    true,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateAFCCup = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental("Asia", 31, context.playerTeam);
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // AFC Cup: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateCAFConfed = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  const realTeams = getRealTeamsForContinental(
    "Africa",
    31,
    context.playerTeam,
  );
  const teams = injectPlayerTeamIntoList(realTeams, context.playerTeam);

  const { winner, playerEliminated, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    !playerEliminated || wonCompetition,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // CAF Confederations Cup: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

const simulateGenericContinental = async (
  context: CompetitionContext,
  player: Player,
): Promise<ContinentalSimulationResult> => {
  // Generate generic teams for the generic competition
  const genericTeams: Team[] = [];
  for (let i = 0; i < 31; i++) {
    genericTeams.push({
      id: `generic_cont_${i}`,
      name: `Continental Club ${i + 1}`,
      country: context.playerCountry,
      leagueTier: 1,
      reputation: 70 + Math.floor(Math.random() * 20),
      isYouth: false,
      squadStrength: undefined,
    });
  }

  const teams = injectPlayerTeamIntoList(genericTeams, context.playerTeam);
  const { winner, playerReachedFinal, roundReached } =
    simulateKnockoutTournament(teams, 5, context.playerTeam);
  const wonCompetition = winner.name === context.playerTeam.name;

  const playerStats = await simulatePlayerContinentalPerformance(
    player,
    null,
    true,
    playerReachedFinal,
    wonCompetition,
    roundReached,
  );

  // Generic continental: 6 jogos fase de grupos + mata-mata
  const teamMatchesPlayed = calculateTeamMatchesByRound(
    roundReached,
    true,
    6,
    false,
  );

  return { winner, teamMatchesPlayed, playerStats };
};

// ==================== PERFORMANCE DO JOGADOR ====================

const getPlayerTeamPosition = (playerTeam: Team, pots: Team[][]): number => {
  for (let potIndex = 0; potIndex < pots.length; potIndex++) {
    const positionInPot = pots[potIndex].findIndex(
      (team) => team.name === playerTeam.name,
    );
    if (positionInPot !== -1) return potIndex * 9 + positionInPot + 1;
  }
  return 36;
};

const simulatePlayerContinentalPerformance = async (
  player: Player,
  clFormat: ChampionsLeagueFormat | null,
  reachedKnockout: boolean,
  reachedFinal: boolean,
  wonCompetition: boolean,
  roundReached?: string,
): Promise<ContinentalSimulationResult["playerStats"]> => {
  let matchesPlayed = 0;
  let position: number | undefined;

  // Verificar se é América do Sul (Libertadores/Sudamericana têm ida e volta em TODO mata-mata)
  const isSouthAmerican = [
    "Brazil",
    "Argentina",
    "Uruguay",
    "Chile",
    "Colombia",
    "Peru",
    "Ecuador",
    "Paraguay",
    "Bolivia",
    "Venezuela",
  ].includes(player.team.country);

  if (clFormat) {
    // Champions League novo formato: SEMPRE 8 jogos na fase de liga
    matchesPlayed = 8;
    position = getPlayerTeamPosition(player.team, clFormat.pots);

    if (reachedKnockout) {
      const isTop8 = position && position <= 8;
      const playoffMatches = isTop8 ? 0 : 2;
      matchesPlayed += playoffMatches; // Add playoff matches if applicable

      // Add matches based on actual round reached
      if (roundReached === "Winner" || roundReached === "Final") {
        matchesPlayed += 2 + 2 + 2 + 1; // R16 + QF + SF + Final
      } else if (roundReached === "SF") {
        matchesPlayed += 2 + 2 + 2; // R16 + QF + SF
      } else if (roundReached === "QF") {
        matchesPlayed += 2 + 2; // R16 + QF
      } else if (roundReached === "R16") {
        matchesPlayed += 2; // R16
      }
    }
    // Se não reachedKnockout, ainda jogou os 8 jogos da fase de liga (só não avançou)
  } else if (isSouthAmerican) {
    // Libertadores/Sudamericana: 6 grupos + mata-mata IDA E VOLTA
    // Grupos: 6 jogos, Oitavas: 2, Quartas: 2, Semi: 2, Final: 2 (ida e volta) = 16 total
    if (wonCompetition) {
      matchesPlayed = 6 + 2 + 2 + 2 + 2; // 14 jogos (campeão)
    } else if (reachedFinal) {
      matchesPlayed = 6 + 2 + 2 + 2 + 2; // 14 jogos (vice)
    } else if (roundReached === "SF") {
      matchesPlayed = 6 + 2 + 2 + 2; // 12 jogos
    } else if (roundReached === "QF") {
      matchesPlayed = 6 + 2 + 2; // 10 jogos
    } else if (roundReached === "R16") {
      matchesPlayed = 6 + 2; // 8 jogos
    } else if (reachedKnockout) {
      matchesPlayed = rand(6, 10); // Pelo menos fase de grupos
    } else {
      matchesPlayed = rand(4, 6); // Eliminado nos grupos
    }
  } else {
    // Competições sem fase de liga (outras confederações)
    if (wonCompetition) {
      matchesPlayed = rand(10, 13);
    } else if (reachedFinal) {
      matchesPlayed = rand(9, 12);
    } else if (reachedKnockout) {
      matchesPlayed = rand(4, 8);
    } else {
      matchesPlayed = rand(2, 6);
    }
  }

  if (matchesPlayed === 0) {
    return {
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      rating: 0,
      cleanSheets: 0,
      position,
      reachedKnockout: false,
      wonCompetition: false,
      reachedFinal: false,
    };
  }

  // Aplicar participação do jogador baseada no squadStatus
  // Key Players/Captains jogam praticamente todos os jogos
  // Rotação/Prospect jogam menos
  const participationRates: Record<string, [number, number]> = {
    Captain: [0.95, 1.0], // Capitão joga todos ou quase todos
    "Key Player": [0.92, 1.0], // Titular joga quase todos
    Rotation: [0.6, 0.85], // Rotação joga alguns
    Prospect: [0.4, 0.7], // Jovem joga poucos
    Reserve: [0.15, 0.4], // Reserva joga muito pouco
    Surplus: [0.0, 0.15], // Dispensável quase não joga
  };

  const [minParticipation, maxParticipation] = participationRates[
    player.squadStatus
  ] || [0.6, 0.85];
  const participationRate =
    minParticipation + Math.random() * (maxParticipation - minParticipation);
  matchesPlayed = Math.max(1, Math.round(matchesPlayed * participationRate));

  let performanceModifier = 1.0;

  const squadStatusModifier: Record<string, number> = {
    "Key Player": 1.3,
    Captain: 1.4,
    Rotation: 1.1,
    Prospect: 0.9,
    Reserve: 0.7,
    Surplus: 0.5,
  };
  performanceModifier *= squadStatusModifier[player.squadStatus] || 0.8;

  // Modificador baseado na reputação do time (menos impactante)
  performanceModifier *= 0.85 + (player.team.reputation / 100) * 0.3;

  // Bônus por chegar longe
  if (wonCompetition) performanceModifier *= 1.2;
  else if (reachedFinal) performanceModifier *= 1.15;
  else if (reachedKnockout) performanceModifier *= 1.05;

  const performanceResult = await calculateDetailedPerformance(
    player,
    matchesPlayed,
    performanceModifier,
    player.tactic || "Balanced",
  );

  return {
    matchesPlayed,
    goals: performanceResult.goals,
    assists: performanceResult.assists,
    rating: performanceResult.matchStats.rating,
    cleanSheets: performanceResult.cleanSheets || 0,
    position,
    reachedKnockout,
    wonCompetition,
    reachedFinal,
    roundReached,
  };
};

// ==================== OUTRAS COMPETIÇÕES (Club World Cup, etc.) ====================

export const simulateClubWorldCup = async (
  context: CompetitionContext,
  player: Player,
): Promise<{
  winner: Team;
  playerStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets?: number;
    wonCompetition: boolean;
  };
}> => {
  const contenders: Team[] = [];
  const makeTeam = (name: string, rep: number): Team => ({
    id: name,
    name,
    country: "International",
    leagueTier: 1,
    reputation: rep + rand(-3, 3), // Adiciona variação
    isYouth: false,
    squadStrength: undefined,
  });

  contenders.push(makeTeam("UEFA Champions", 90 + rand(0, 5)));
  contenders.push(makeTeam("CONMEBOL Champions", 85 + rand(0, 5)));
  contenders.push(makeTeam("Rest of Confederations", 78 + rand(0, 8)));
  contenders.push({
    ...player.team,
    id: player.team.id || `cwc_${player.team.name}`,
  });

  // Embaralha para não ter sempre o mesmo bracket
  const shuffled = shuffleArray(contenders);

  const semi1 = simulateMatch(shuffled[0], shuffled[1], [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });
  const semi2 = simulateMatch(shuffled[2], shuffled[3], [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });

  const finalists = [semi1.winner!, semi2.winner!];
  const final = simulateMatch(finalists[0], finalists[1], [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });
  const winner = final.winner!;

  const perf = await calculateDetailedPerformance(
    player,
    2,
    1.1,
    player.tactic || "Balanced",
  );

  const playerStats = {
    matchesPlayed: 2,
    goals: perf.goals,
    assists: perf.assists,
    rating: perf.matchStats.rating,
    cleanSheets: perf.cleanSheets,
    wonCompetition: winner.name === player.team.name,
  };

  return { winner, playerStats };
};

export const simulateFIFAClubWorldCup = async (
  player: Player,
  playerTeam: Team,
  seasonYear: number,
  wonChampionsOrLibertadores: boolean,
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
} | null> => {
  const isWorldCupYear = seasonYear % 4 === 0;
  if (!isWorldCupYear || !wonChampionsOrLibertadores) return null;

  const worldCupTeams: Team[] = [];
  const repRanges = {
    UEFA: [77, 93],
    CONMEBOL: [74, 90],
    CONCACAF: [70, 82],
    AFC: [68, 80],
    CAF: [66, 78],
    OFC: [60, 70],
    Host: [72, 78],
  };

  (Object.keys(repRanges) as Array<keyof typeof repRanges>).forEach((conf) => {
    const count =
      conf === "UEFA"
        ? 12
        : conf === "CONMEBOL"
          ? 6
          : conf === "OFC"
            ? 1
            : conf === "Host"
              ? 1
              : 4;

    for (let i = 0; i < count; i++) {
      worldCupTeams.push({
        id: `${conf}_${i}`,
        name: `${conf} Club ${i + 1}`,
        country: conf,
        leagueTier: 1,
        reputation: rand(repRanges[conf][0], repRanges[conf][1]),
        isYouth: false,
        squadStrength: undefined,
      });
    }
  });

  worldCupTeams.push({
    ...playerTeam,
    id: playerTeam.id || `player_${playerTeam.name}`,
  });

  const shuffledTeams = shuffleArray(worldCupTeams);
  const groups = Array.from({ length: 8 }, (_, i) =>
    shuffledTeams.slice(i * 4, (i + 1) * 4),
  );

  const playerGroup =
    groups.find((g) => g.some((t) => t.name === playerTeam.name)) || groups[0];

  let points = 0;
  let goalsScored = 0;

  playerGroup
    .filter((t) => t.name !== playerTeam.name)
    .forEach((opponent) => {
      const result = simulateMatch(playerTeam, opponent, [], [], {
        isNeutralVenue: true,
      });
      if (result.winner?.name === playerTeam.name) {
        points += 3;
      } else if (result.homePoints === 1) {
        points += 1;
      }
      goalsScored += result.homeGoals;
    });

  // Precisa de pelo menos 4 pontos para avançar (mais realista)
  const advancesToKnockout = points >= 4;
  let totalMatches = 3;
  let wonWorldCup = false;

  if (advancesToKnockout) {
    // Simula fases eliminatórias com probabilidade real baseada na reputação
    const knockoutRounds = 4; // R16, QF, SF, Final
    let stillIn = true;

    for (let i = 0; i < knockoutRounds && stillIn; i++) {
      totalMatches++;

      // Gera um oponente com reputação variável
      const opponentRep = 75 + rand(0, 20);
      const winChance = 0.5 + (playerTeam.reputation - opponentRep) * 0.01;

      if (Math.random() < clamp(winChance, 0.2, 0.8)) {
        if (i === knockoutRounds - 1) wonWorldCup = true;
      } else {
        stillIn = false;
      }
    }
  }

  const performance = await calculateDetailedPerformance(
    player,
    totalMatches,
    wonWorldCup ? 1.3 : 1.15,
    "Balanced",
  );

  const avgRating =
    performance.matchLogs.length > 0
      ? performance.matchLogs.reduce((sum, log) => sum + log.rating, 0) /
        performance.matchLogs.length
      : 7.0;

  return {
    won: wonWorldCup,
    goals: performance.goals,
    assists: performance.assists,
    rating: avgRating,
    cleanSheets: performance.cleanSheets || 0,
  };
};

export const simulateSupercopaBrasil = async (
  player: Player,
  wonLeague: boolean,
  wonCup: boolean,
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
} | null> => {
  if (!wonLeague && !wonCup) return null;

  const opponent: Team = {
    id: "supercopa-opponent",
    name: wonLeague ? "Copa Winner" : "League Winner",
    country: player.team.country,
    leagueTier: 1,
    reputation: player.team.reputation + rand(-8, 8),
    isYouth: false,
    squadStrength: undefined,
  };

  // Simula a partida real
  const matchResult = simulateMatch(player.team, opponent, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });

  const won = matchResult.winner?.name === player.team.name;

  const performance = await calculateDetailedPerformance(
    player,
    1,
    won ? 1.15 : 1.0,
    player.tactic || "Balanced",
  );

  const rating = performance.matchLogs[0]?.rating || 7.0;

  return {
    won,
    goals: performance.goals,
    assists: performance.assists,
    rating,
    cleanSheets: performance.cleanSheets || 0,
  };
};

export const simulateRecopaSudamericana = async (
  player: Player,
  wonLibertadores: boolean,
  wonSudamericana: boolean,
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
} | null> => {
  if (!wonLibertadores && !wonSudamericana) return null;

  const opponent: Team = {
    id: "recopa-opponent",
    name: wonLibertadores ? "Sudamericana Winner" : "Libertadores Winner",
    country: "South America",
    leagueTier: 1,
    reputation: wonLibertadores
      ? player.team.reputation - rand(3, 10) // Sudamericana winner geralmente mais fraco
      : player.team.reputation + rand(3, 10), // Libertadores winner geralmente mais forte
    isYouth: false,
    squadStrength: undefined,
  };

  // Simula ida e volta
  const winner = simulateTwoLeggedTie(player.team, opponent);
  const won = winner.name === player.team.name;

  const performance = await calculateDetailedPerformance(
    player,
    2,
    won ? 1.15 : 1.0,
    player.tactic || "Balanced",
  );

  const avgRating =
    performance.matchLogs.length > 0
      ? performance.matchLogs.reduce((sum, log) => sum + log.rating, 0) /
        performance.matchLogs.length
      : 7.0;

  return {
    won,
    goals: performance.goals,
    assists: performance.assists,
    rating: avgRating,
    cleanSheets: performance.cleanSheets || 0,
  };
};

// ==================== SIMULADORES DE CAMPEÕES CONTINENTAIS ====================

// Dummy team para simulateKnockoutTournament (quando o jogador não participa)
const dummyPlayerTeam: Team = {
  id: "dummy-for-simulation",
  name: "DUMMY_TEAM_NOT_IN_TOURNAMENT",
  country: "None",
  leagueTier: 99,
  reputation: 1,
  isYouth: false,
  squadStrength: undefined,
};

/**
 * Simula o campeão da CONCACAF Champions Cup usando torneio knockout com times reais
 */
export const simulateCONCACAFChampion = (): Team => {
  const realTeams = getRealTeamsForContinental(
    "North America",
    16,
    dummyPlayerTeam,
  );
  const { winner } = simulateKnockoutTournament(realTeams, 4, dummyPlayerTeam);
  return winner;
};

/**
 * Simula o campeão da CAF Champions League usando torneio knockout com times reais
 */
export const simulateCAFChampion = (): Team => {
  const realTeams = getRealTeamsForContinental("Africa", 16, dummyPlayerTeam);
  const { winner } = simulateKnockoutTournament(realTeams, 4, dummyPlayerTeam);
  return winner;
};

/**
 * Simula o campeão da AFC Champions League usando torneio knockout com times reais
 * Como não há times asiáticos suficientes no LEAGUES, usamos fallbacks realistas
 */
export const simulateAFCChampion = (): Team => {
  // Tenta times asiáticos reais primeiro
  const realTeams = getRealTeamsForContinental("Asia", 16, dummyPlayerTeam);
  if (realTeams.length >= 8 && !realTeams[0].name.includes("Club")) {
    const { winner } = simulateKnockoutTournament(
      realTeams,
      4,
      dummyPlayerTeam,
    );
    return winner;
  }
  // Fallback para times asiáticos conhecidos
  const afcChampions: Team[] = [
    {
      id: "afc-al-hilal",
      name: "Al Hilal",
      country: "Saudi Arabia",
      leagueTier: 1,
      reputation: 82,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-al-nassr",
      name: "Al Nassr",
      country: "Saudi Arabia",
      leagueTier: 1,
      reputation: 80,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-al-ahli",
      name: "Al Ahli Jeddah",
      country: "Saudi Arabia",
      leagueTier: 1,
      reputation: 78,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-urawa",
      name: "Urawa Red Diamonds",
      country: "Japan",
      leagueTier: 1,
      reputation: 75,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-ulsan",
      name: "Ulsan Hyundai",
      country: "South Korea",
      leagueTier: 1,
      reputation: 74,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-shanghai",
      name: "Shanghai Port",
      country: "China",
      leagueTier: 1,
      reputation: 73,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-persepolis",
      name: "Persepolis",
      country: "Iran",
      leagueTier: 1,
      reputation: 72,
      isYouth: false,
      squadStrength: undefined,
    },
    {
      id: "afc-al-ittihad",
      name: "Al Ittihad",
      country: "Saudi Arabia",
      leagueTier: 1,
      reputation: 79,
      isYouth: false,
      squadStrength: undefined,
    },
  ];
  const { winner } = simulateKnockoutTournament(
    afcChampions,
    3,
    dummyPlayerTeam,
  );
  return winner;
};

/**
 * Simula o campeão da Copa Libertadores usando torneio knockout com times reais
 */
export const simulateLibertadoresChampion = (): Team => {
  const realTeams = getRealTeamsForContinental(
    "South America",
    16,
    dummyPlayerTeam,
  );
  const { winner } = simulateKnockoutTournament(realTeams, 4, dummyPlayerTeam);
  return winner;
};

/**
 * Simula o campeão da UEFA Champions League usando torneio knockout com times reais
 */
export const simulateUCLChampion = (): Team => {
  const realTeams = getRealTeamsForContinental("Europe", 16, dummyPlayerTeam);
  const { winner } = simulateKnockoutTournament(realTeams, 4, dummyPlayerTeam);
  return winner;
};

/**
 * Simula o Dérbi das Américas (Americas Derby)
 * Confronto entre campeão da Libertadores e campeão da CONCACAF Champions Cup
 * O vencedor avança para disputar a Copa Intercontinental
 */
export const simulateAmericasDerby = async (
  player: Player,
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
  opponent: Team;
} | null> => {
  // Simula o adversário (campeão CONCACAF - time real)
  const opponent = simulateCONCACAFChampion();

  // Simula a partida (jogo único, campo neutro)
  const matchResult = simulateMatch(player.team, opponent, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });

  const won = matchResult.winner?.name === player.team.name;

  const performance = await calculateDetailedPerformance(
    player,
    1,
    won ? 1.15 : 1.0,
    "Balanced",
  );

  const rating = performance.matchLogs[0]?.rating || 7.0;

  return {
    won,
    goals: performance.goals,
    assists: performance.assists,
    rating,
    cleanSheets: performance.cleanSheets || 0,
    opponent,
  };
};

/**
 * Simula a Copa Challenger Intercontinental
 * O vencedor do Clássico das Américas enfrenta outro campeão continental (AFC ou CAF)
 * O vencedor avança para a final do Intercontinental vs campeão da Champions
 */
export const simulateChallengerCup = async (
  player: Player,
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
  opponent: Team;
} | null> => {
  // Sorteia o oponente entre AFC Champion ou CAF Champion
  const opponent = Math.random() > 0.5 ? simulateAFCChampion() : simulateCAFChampion();

  // Simula a partida (jogo único, campo neutro)
  const matchResult = simulateMatch(player.team, opponent, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });

  const won = matchResult.winner?.name === player.team.name;

  const performance = await calculateDetailedPerformance(
    player,
    1,
    won ? 1.15 : 1.0,
    "Balanced",
  );

  const rating = performance.matchLogs[0]?.rating || 7.0;

  return {
    won,
    goals: performance.goals,
    assists: performance.assists,
    rating,
    cleanSheets: performance.cleanSheets || 0,
    opponent,
  };
};

export const simulateFIFAIntercontinentalCup = async (
  player: Player,
  wonChampionsLeague: boolean,
  wonLibertadores: boolean,
  wonAmericasDerby?: boolean, // Novo parâmetro para indicar se venceu o Dérbi
): Promise<{
  won: boolean;
  goals: number;
  assists: number;
  rating: number;
  cleanSheets: number;
  opponent: Team;
} | null> => {
  // Campeão da Champions League vai direto para a final
  // Campeão da Libertadores precisa vencer o Dérbi das Américas primeiro
  if (!wonChampionsLeague && !wonAmericasDerby) return null;

  let opponent: Team;

  if (wonChampionsLeague) {
    // Campeão UCL enfrenta o vencedor do Dérbi das Américas (simula um time sul-americano forte)
    // Na vida real seria o vencedor real, mas aqui simulamos um time forte como oponente
    const southAmericanTeams = LEAGUES["Brazil"]?.divisions
      ? Object.values(LEAGUES["Brazil"].divisions)
          .flat()
          .filter((t) => t.reputation >= 78)
      : [];
    if (southAmericanTeams.length > 0) {
      opponent = southAmericanTeams[rand(0, southAmericanTeams.length - 1)];
    } else {
      opponent = {
        id: "intercontinental-americas-winner",
        name: "Americas Derby Winner",
        country: "South America",
        leagueTier: 1,
        reputation: 82,
        isYouth: false,
        squadStrength: undefined,
      };
    }
  } else {
    // Vencedor do Dérbi das Américas enfrenta o campeão UCL (time real da Europa)
    opponent = simulateUCLChampion();
  }

  // Simula a partida real
  const matchResult = simulateMatch(player.team, opponent, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    isNeutralVenue: true,
  });

  const won = matchResult.winner?.name === player.team.name;

  const performance = await calculateDetailedPerformance(
    player,
    1,
    won ? 1.2 : 1.0,
    "Balanced",
  );

  const rating = performance.matchLogs[0]?.rating || 7.0;

  return {
    won,
    goals: performance.goals,
    assists: performance.assists,
    rating,
    cleanSheets: performance.cleanSheets || 0,
    opponent,
  };
};
