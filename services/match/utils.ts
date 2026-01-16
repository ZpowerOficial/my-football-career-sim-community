import { Player, Team, ExtendedMatchStats } from "../../types";
import { rand, randFloat } from "../utils";

export function createEmptyMatchStats(): ExtendedMatchStats {
  return {
    // === GOALS BY FOOT ===
    goalsWeakFoot: 0,
    goalsStrongFoot: 0,

    // === GENERAL ===
    rating: 0,
    matches: 0,
    teamOfTheWeek: 0,
    minutesPlayed: 0,
    gamesStarted: 0,
    gamesAsSubstitute: 0,

    // === SHOOTING & FINISHING ===
    goals: 0,
    expectedGoals: 0,
    goalsPerMatch: 0,
    shots: 0,
    shotsOnTarget: 0,
    shotsOnTargetPerGame: 0,
    shotsOffTarget: 0,
    shotsBlockedByOpponent: 0,
    shotsBlockedPerGame: 0,
    bigChancesMissed: 0,
    bigChancesConverted: 0,
    goalConversion: 0,
    shotAccuracy: 0,

    // Goals by type
    freeKickGoals: 0,
    directFreeKicksTaken: 0,
    directFreeKickEffectiveness: 0,
    penaltyGoals: 0,
    penaltyConversion: 0,
    goalsFromInsideBox: 0,
    goalsFromOutsideBox: 0,
    headedGoals: 0,
    leftFootGoals: 0,
    rightFootGoals: 0,
    weakFootGoals: 0,

    // Advanced shooting
    shotsFromInsideBox: 0,
    shotsFromOutsideBox: 0,
    volleyGoals: 0,
    chipGoals: 0,
    curvedGoals: 0,

    // === CREATIVITY & PASSING ===
    assists: 0,
    expectedAssists: 0,
    assistsPerMatch: 0,
    touches: 0,
    touchesInOppositionBox: 0,
    bigChancesCreated: 0,
    keyPasses: 0,
    keyPassesPerGame: 0,
    throughBalls: 0,
    accurateThroughBalls: 0,
    throughBallAccuracy: 0,

    // Passing stats
    passes: 0,
    passesCompleted: 0,
    passCompletion: 0,
    passesPerGame: 0,
    passesInOwnHalf: 0,
    passesInOppositionHalf: 0,
    passesInFinalThird: 0,
    forwardPasses: 0,
    forwardPassesCompleted: 0,
    backwardPasses: 0,
    sidewaysPasses: 0,

    // Long balls & crosses
    longBalls: 0,
    accurateLongBalls: 0,
    longBallAccuracy: 0,
    crosses: 0,
    accurateCrosses: 0,
    crossAccuracy: 0,
    corners: 0,
    cornerAccuracy: 0,

    // === DRIBBLING & BALL CONTROL ===
    dribbles: 0,
    dribblesSucceeded: 0,
    dribblesSuccessPercentage: 0,
    skillMovesCompleted: 0,
    nutmegs: 0,
    timesDispossessed: 0,
    possessionLost: 0,
    possessionLostInOwnHalf: 0,
    ballTouchesPerGame: 0,
    firstTouchSuccess: 0,

    // === DEFENSIVE ACTIONS ===
    tackles: 0,
    tacklesWon: 0,
    tacklesPerGame: 0,
    tackleSuccess: 0,
    interceptions: 0,
    interceptionsPerGame: 0,
    clearances: 0,
    clearancesPerGame: 0,
    blocksPerGame: 0,
    shotsBlocked: 0,
    passesBlocked: 0,
    headedClearances: 0,

    // Ball recovery
    ballRecoveries: 0,
    ballRecoveriesInAttack: 0,
    ballRecoveriesInMidfield: 0,
    ballRecoveriesInDefence: 0,
    ballRecoveriesPerGame: 0,

    // Advanced defending
    lastManTackles: 0,
    slidingTackles: 0,
    slidingTackleSuccess: 0,
    standingTackles: 0,
    pressuresApplied: 0,
    pressureSuccess: 0,

    // === DUELS & CONTESTS ===
    duels: 0,
    duelsWon: 0,
    duelsWonPercentage: 0,
    groundDuels: 0,
    groundDuelsWon: 0,
    groundDuelsWonPercentage: 0,
    aerialDuels: 0,
    aerialDuelsWon: 0,
    aerialDuelsWonPercentage: 0,
    headersWon: 0,
    headersWonPercentage: 0,
    physicalContests: 0,
    physicalContestsWon: 0,

    // Being dribbled past
    dribbledPast: 0,
    dribbledPastPerGame: 0,
    dribbledPastInDefensiveThird: 0,

    // === DISCIPLINE ===
    foulsCommitted: 0,
    foulsPerGame: 0,
    foulsDrawn: 0,
    foulsDrawnPerGame: 0,
    offsides: 0,
    offsidesPerGame: 0,
    yellowCards: 0,
    redCards: 0,
    redCardsFromSecondYellow: 0,
    penaltiesConceded: 0,
    penaltiesWon: 0,

    // === ERRORS & MISTAKES ===
    errorsLeadingToShot: 0,
    errorsLeadingToGoal: 0,
    bigMissedChances: 0,
    ownGoals: 0,
    passesIntercepted: 0,

    // === WORK RATE & MOVEMENT ===
    distanceCovered: 0,
    sprintDistanceCovered: 0,
    highIntensityRuns: 0,
    sprintsPerGame: 0,
    positionsOutOfPosition: 0,
    trackingRuns: 0,
    offensiveRuns: 0,
    defensiveRuns: 0,

    // === TEAM PLAY ===
    oneVersusOneWon: 0,
    teamPlayRating: 0,
    supportiveRuns: 0,
    overlappingRuns: 0,
    underlappingRuns: 0,
    decoyRuns: 0,

    // === MATCH EVENTS ===
    hatTricks: 0,
    braces: 0,
    manOfTheMatch: 0,
    matchesAsCaptain: 0,
    perfectPassingGames: 0,

    // === ADVANCED METRICS ===
    actionsWithBall: 0,
    successfulPressures: 0,
    progressiveCarries: 0,
    progressivePasses: 0,
    carriesIntoFinalThird: 0,
    carriesIntoPenaltyArea: 0,
    passesIntoPenaltyArea: 0,
    shotCreatingActions: 0,
    goalCreatingActions: 0,
  };
}

export const youthAcademyMatches = (player: Player): number => {
  let baseMatches = player.age <= 17 ? rand(18, 32) : rand(22, 38);
  let seniorCallUps = 0;

  if (player.age >= 16) {
    const callUpChance = 0.3 + ((player.potential - 75) / 25) * 0.4;
    if (Math.random() < callUpChance) {
      if (player.potential >= 90) seniorCallUps = rand(5, 12);
      else if (player.potential >= 85) seniorCallUps = rand(3, 8);
      else if (player.potential >= 80) seniorCallUps = rand(1, 5);
    }
  }

  return Math.max(0, baseMatches + seniorCallUps);
};

// ===============================
// JOGOS GARANTIDOS NO INÃCIO DA TEMPORADA
// ===============================
// Estes sÃ£o os jogos que SABEMOS que o time vai jogar no inÃ­cio da temporada.
// Liga: todos jogam todos os jogos
// Continental (fase de grupos/liga): todos jogam a fase inicial
// Copa: mÃ­nimo de 1 jogo (pode ser eliminado na 1Âª fase)
//
// Jogos ADICIONAIS sÃ£o conquistados ao passar de fase.
// O total REAL Ã© calculado apÃ³s simular as competiÃ§Ãµes.

/**
 * Calcula os jogos GARANTIDOS no inÃ­cio da temporada.
 * Usado para expectativas iniciais, NÃƒO para calcular tempo de jogo final.
 */
export const calculateGuaranteedMatches = (
  team: Team,
  continentalCompetition?: string,
): {
  league: number;
  cup: number;
  continental: number;
  other: number;
  total: number;
} => {
  const leagueMatches = [38, 34, 32, 30, 28][team.leagueTier - 1] || 28;

  const isSouthAmerica = [
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
  ].includes(team.country);
  const isBrazil = team.country === "Brazil";

  // Copa domÃ©stica: mÃ­nimo 1-2 jogos (primeira fase)
  const cupMin = isBrazil ? 2 : 1; // Copa do Brasil tem mais fases obrigatÃ³rias para times grandes

  // Continental: jogos da fase de grupos/liga
  let continentalMin = 0;
  if (continentalCompetition) {
    if (
      continentalCompetition.includes("Champions") ||
      continentalCompetition.includes("Libertadores")
    ) {
      // Champions League nova fase de liga = 8 jogos
      // Libertadores fase de grupos = 6 jogos
      continentalMin = isSouthAmerica ? 6 : 8;
    } else if (
      continentalCompetition.includes("Europa") ||
      continentalCompetition.includes("Sudamericana")
    ) {
      continentalMin = isSouthAmerica ? 6 : 8; // EL tambÃ©m tem 8 jogos na nova fase
    } else if (continentalCompetition.includes("Conference")) {
      continentalMin = 6; // Conference League fase de grupos
    }
  }

  // Campeonato Estadual (Brasil) - garantido
  const stateCup = isBrazil ? 12 : 0;

  const total = leagueMatches + cupMin + continentalMin + stateCup;

  return {
    league: leagueMatches,
    cup: cupMin,
    continental: continentalMin,
    other: stateCup,
    total,
  };
};

/**
 * Calcula os jogos disponÃ­veis ESTIMADOS para um time (usado para estimativas gerais).
 * Para cÃ¡lculo de tempo de jogo, usar os valores REAIS das competiÃ§Ãµes simuladas.
 */
export const calculateAvailableMatches = (
  team: Team,
  continentalCompetition?: string,
): number => {
  const leagueMatches = [38, 34, 32, 30, 28][team.leagueTier - 1] || 28;

  const isSouthAmerica = [
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
  ].includes(team.country);
  const isBrazil = team.country === "Brazil";
  const isEngland = team.country === "England";

  // Campeonato Estadual (apenas Brasil) - 15 jogos tÃ­pico (Carioca do Flamengo)
  const stateCup = isBrazil ? rand(12, 16) : 0;

  // Copa principal nacional
  // Real: 6 jogos Copa del Rey
  // Flamengo: 4 jogos Copa do Brasil (eliminado cedo, pode chegar a 13)
  // PSG: 6 jogos Coupe de France
  // Bayern: 3 jogos DFB-Pokal
  // Chelsea: 2 FA Cup + 2 Copa da Liga = 4
  let domesticCup = 0;
  if (isBrazil && team.reputation >= 85) {
    domesticCup = rand(4, 13); // Copa do Brasil (times podem cair cedo ou chegar na final)
  } else if (isEngland && team.reputation >= 85) {
    domesticCup = rand(3, 8); // FA Cup + EFL Cup combinados
  } else if (team.reputation >= 85) {
    domesticCup = rand(4, 7); // Copa del Rey, Coupe de France, Coppa Italia
  } else if (team.reputation >= 75) {
    domesticCup = rand(2, 5);
  } else {
    domesticCup = rand(1, 4);
  }

  // Segunda copa (Copa da Liga na Inglaterra, Supercopa)
  // Real: 2 Supercopa Espanha + 1 Supercopa UEFA = 3
  // Flamengo: 1 Supercopa Rei
  // Chelsea: 2 EFL Cup (jÃ¡ contado acima para Inglaterra)
  let secondaryCup = 0;
  if (team.reputation >= 90) {
    secondaryCup = rand(1, 3); // Supercopas nacionais/continentais
  } else if (team.reputation >= 80) {
    secondaryCup = rand(0, 2);
  }

  // CompetiÃ§Ãµes continentais - VALORES REAIS:
  // Real Madrid UCL: 14 jogos (8 fase liga + 6 mata-mata, perdeu na semi)
  // Barcelona UCL: 14 jogos
  // Flamengo Libertadores: 13 jogos (6 grupos + 7 mata-mata ida/volta)
  // PSG UCL: 17 jogos (foi longe)
  // Inter UCL: 15 jogos
  // Bayern UCL: 14 jogos
  // Chelsea Conference: 13 + 2 playoff = 15 jogos
  let continental = 0;

  if (isSouthAmerica) {
    // Libertadores/Sudamericana tÃªm mais jogos (ida e volta no mata-mata)
    if (team.reputation >= 88)
      continental = rand(12, 17); // Libertadores profunda
    else if (team.reputation >= 82) continental = rand(10, 15);
    else if (team.reputation >= 76)
      continental = rand(6, 12); // Sudamericana
    else if (team.reputation >= 70) continental = rand(4, 8);
  } else {
    // Europa: Champions, Europa League, Conference
    if (team.reputation >= 92)
      continental = rand(14, 17); // UCL atÃ© final
    else if (team.reputation >= 88)
      continental = rand(12, 16); // UCL semifinal
    else if (team.reputation >= 84)
      continental = rand(10, 14); // UCL quartas ou EL
    else if (team.reputation >= 80)
      continental = rand(8, 13); // EL ou Conference profunda
    else if (team.reputation >= 75) continental = rand(6, 10); // Conference
  }

  // Mundial de Clubes - novo formato 2025 tem mais jogos!
  // Real: 6 jogos, PSG: 7 jogos, Inter: 4 jogos, Bayern: 5 jogos, Chelsea: 7 jogos
  let clubWorldCup = 0;
  if (team.reputation >= 92) {
    clubWorldCup = rand(5, 7); // Times elite vÃ£o longe
  } else if (team.reputation >= 85) {
    clubWorldCup = rand(3, 5);
  } else if (team.reputation >= 80) {
    clubWorldCup = rand(0, 4); // Pode nÃ£o classificar ou cair cedo
  }

  // Copa Intercontinental - determinística
  // Se vencer Champions ou Libertadores, o competitionSystem.ts adiciona automaticamente
  // Não deve ser calculada aqui como probabilidade aleatória
  // O sistema de competições já trata isso corretamente

  let total =
    leagueMatches +
    stateCup +
    domesticCup +
    secondaryCup +
    continental +
    clubWorldCup;

  // VariaÃ§Ã£o menor
  total = Math.round(total * randFloat(0.98, 1.02));

  // Clamps baseados nos dados reais:
  // MÃ¡ximo Europa: Real Madrid 68 jogos
  // MÃ¡ximo Brasil: Flamengo 74 jogos
  // MÃ­nimo elite: ~55 jogos (Bayern com copa curta)
  const minClamp = Math.max(leagueMatches + 5, 40); // MÃ­nimo: liga + algumas copas
  const maxClamp = isBrazil ? 78 : 72; // Limites realistas
  return Math.max(minClamp, Math.min(total, maxClamp));
};

const applySquadStatus = (player: Player, totalAvailable: number): number => {
  let expectedStarterOVR = 65;
  if (player.team.reputation >= 95) expectedStarterOVR = 82;
  else if (player.team.reputation >= 90) expectedStarterOVR = 78;
  else if (player.team.reputation >= 85) expectedStarterOVR = 75;
  else if (player.team.reputation >= 80) expectedStarterOVR = 72;
  else if (player.team.reputation >= 75) expectedStarterOVR = 68;

  if (player.team.leagueTier === 1) expectedStarterOVR += 3;
  else if (player.team.leagueTier === 2) expectedStarterOVR += 1;

  const ovrDiff = player.stats.overall - expectedStarterOVR;

  // Ranges ajustados para serem mais realistas e consistentes
  // Captain: 94-99% dos jogos (~55-65 jogos)
  // Key Player: 88-98% dos jogos (~50-60 jogos)
  // Rotation: 45-70% dos jogos (~25-40 jogos)
  // Prospect: 20-45% dos jogos (~12-25 jogos)
  // Reserve: 8-20% dos jogos (~5-12 jogos)
  // Surplus: 0-5% dos jogos (~0-3 jogos)
  const isGoalkeeper = player.position === "GK";

  const ranges: Record<string, [number, number]> = {
    Captain: isGoalkeeper ? [0.98, 1.0] : [0.94, 0.99],
    "Key Player": isGoalkeeper
      ? [0.96, 0.99]
      : ovrDiff >= 12
        ? [0.92, 0.98]
        : ovrDiff >= 8
          ? [0.9, 0.96]
          : [0.88, 0.94],
    Rotation: isGoalkeeper
      ? [0.15, 0.3]
      : ovrDiff >= 5
        ? [0.55, 0.72]
        : ovrDiff >= 0
          ? [0.48, 0.65]
          : [0.42, 0.58], // Goleiro reserva joga pouco (copas)
    Prospect: isGoalkeeper
      ? [0.05, 0.15]
      : player.age <= 21 && player.potential >= expectedStarterOVR + 5
        ? [0.3, 0.48]
        : player.age <= 23
          ? [0.22, 0.4]
          : [0.15, 0.32],
    Reserve: isGoalkeeper
      ? [0.0, 0.1]
      : player.age <= 25
        ? [0.1, 0.22]
        : [0.06, 0.16],
    Surplus: [0.0, 0.05],
  };

  // Se for goleiro titular absoluto (nivel muito acima), garante 100%
  if (
    isGoalkeeper &&
    (player.squadStatus === "Key Player" || player.squadStatus === "Captain") &&
    player.stats.overall > expectedStarterOVR + 5
  ) {
    return Math.round(totalAvailable * randFloat(0.98, 1.0));
  }

  const [min, max] = ranges[player.squadStatus] || [0, 0];
  return rand(
    Math.floor(totalAvailable * min),
    Math.floor(totalAvailable * max),
  );
};

const applyModifiers = (player: Player, matchesPlayed: number): number => {
  // AJUSTADO: Modificadores menos punitivos para nÃ£o reduzir muito os jogos
  // Jogadores de elite jogam 55-60 jogos mesmo com agressÃ£o alta (ex: Casemiro, Ramos)
  if (player.personality === "Temperamental") matchesPlayed -= rand(0, 2);
  if (player.stats.aggression >= 90) matchesPlayed -= rand(0, 2); // SÃ³ agressÃ£o extrema
  if (player.age >= 36) matchesPlayed = Math.round(matchesPlayed * 0.9); // SÃ³ 36+ (nÃ£o 34+)
  if (player.yearsAtClub === 1 && player.squadStatus === "Key Player") {
    matchesPlayed = Math.round(matchesPlayed * randFloat(0.9, 1.0)); // Menos penalizaÃ§Ã£o
  }
  if (player.form >= 4) matchesPlayed += rand(0, 2);
  if (player.form <= -6) matchesPlayed -= rand(0, 2); // SÃ³ forma muito ruim

  return Math.max(0, matchesPlayed);
};

export const calculateMatchesPlayed = (player: Player, team: Team): number => {
  let totalAvailable = calculateAvailableMatches(team);
  let matchesPlayed = applySquadStatus(player, totalAvailable);
  return applyModifiers(player, matchesPlayed);
};
