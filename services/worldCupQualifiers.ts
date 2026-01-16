/**
 * World Cup Qualifiers Simulation
 * Simulates realistic qualification campaigns for each confederation
 */

import { NATIONALITIES } from "../constants/general";
import { simulateMatch } from "./match/matchSimulator";
import type { Team } from "../types";

// ========== TYPES ==========

interface QualifierTeam {
  name: string;
  reputation: number;
  fifaRank: number;
  continent: string;
}

interface QualifierStanding {
  team: QualifierTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface QualifierGroup {
  name: string;
  standings: QualifierStanding[];
}

interface QualifierResult {
  qualified: string[];
  playoffTeams: string[];
  eliminated: string[];
}

// ========== HELPER FUNCTIONS ==========

const createEmptyStanding = (team: QualifierTeam): QualifierStanding => ({
  team,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const sortStandings = (standings: QualifierStanding[]): QualifierStanding[] => {
  return [...standings].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.fifaRank - b.team.fifaRank; // Lower rank = better team
  });
};

const toTeam = (qt: QualifierTeam): Team => ({
  name: qt.name,
  reputation: qt.reputation,
  country: qt.name,
  leagueTier: 1,
  squadStrength: qt.reputation,
  id: qt.name.toLowerCase().replace(/\s+/g, "_"),
  isYouth: false,
});

const simulateQualifierMatch = (
  home: QualifierTeam,
  away: QualifierTeam,
): { homeGoals: number; awayGoals: number } => {
  const result = simulateMatch(toTeam(home), toTeam(away), [], [], {
    homeAdvantage: 8, // National teams have strong home advantage
  });
  return { homeGoals: result.homeGoals, awayGoals: result.awayGoals };
};

const updateStanding = (
  standing: QualifierStanding,
  goalsFor: number,
  goalsAgainst: number,
): void => {
  standing.played++;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.won++;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.drawn++;
    standing.points += 1;
  } else {
    standing.lost++;
  }
};

const simulateGroupStage = (
  teams: QualifierTeam[],
  doubleRoundRobin: boolean = true,
): QualifierStanding[] => {
  const standings = new Map<string, QualifierStanding>();
  teams.forEach((team) => standings.set(team.name, createEmptyStanding(team)));

  // Simulate all matches
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const home = teams[i];
      const away = teams[j];

      // First leg
      const result1 = simulateQualifierMatch(home, away);
      updateStanding(
        standings.get(home.name)!,
        result1.homeGoals,
        result1.awayGoals,
      );
      updateStanding(
        standings.get(away.name)!,
        result1.awayGoals,
        result1.homeGoals,
      );

      // Second leg (if double round robin)
      if (doubleRoundRobin) {
        const result2 = simulateQualifierMatch(away, home);
        updateStanding(
          standings.get(away.name)!,
          result2.homeGoals,
          result2.awayGoals,
        );
        updateStanding(
          standings.get(home.name)!,
          result2.awayGoals,
          result2.homeGoals,
        );
      }
    }
  }

  return sortStandings(Array.from(standings.values()));
};

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const divideIntoGroups = (
  teams: QualifierTeam[],
  numGroups: number,
): QualifierTeam[][] => {
  // Sort by FIFA rank (seeding)
  const sorted = [...teams].sort((a, b) => a.fifaRank - b.fifaRank);
  const groups: QualifierTeam[][] = Array.from({ length: numGroups }, () => []);

  // Serpentine distribution for balanced groups
  sorted.forEach((team, index) => {
    const groupIndex = index % numGroups;
    groups[groupIndex].push(team);
  });

  // Shuffle within each group to randomize matchups
  return groups.map((group) => shuffleArray(group));
};

// ========== CONFEDERATION QUALIFIERS ==========

const getTeamsByContinent = (continent: string): QualifierTeam[] => {
  return NATIONALITIES.filter((n) => n.continent === continent).map((n) => ({
    name: n.name,
    reputation: n.talentPool,
    fifaRank: n.fifaRank,
    continent: n.continent,
  }));
};

/**
 * CONMEBOL: 10 teams in single group, double round-robin
 * Top 6 qualify directly, 7th goes to intercontinental playoff
 */
const simulateCONMEBOL = (): QualifierResult => {
  const teams = getTeamsByContinent("South America");
  const standings = simulateGroupStage(teams, true);

  return {
    qualified: standings.slice(0, 6).map((s) => s.team.name),
    playoffTeams: [standings[6]?.team.name].filter(Boolean),
    eliminated: standings.slice(7).map((s) => s.team.name),
  };
};

/**
 * UEFA: 12 groups (mix of 4-5 teams), top of each qualifies
 * 12 second places + 4 Nations League teams go to playoffs (16 -> 4)
 */
const simulateUEFA = (): QualifierResult => {
  const teams = getTeamsByContinent("Europe");
  const groups = divideIntoGroups(teams, 12);

  const groupWinners: string[] = [];
  const secondPlaces: QualifierStanding[] = [];

  groups.forEach((groupTeams, index) => {
    const standings = simulateGroupStage(groupTeams, true);
    groupWinners.push(standings[0].team.name);
    if (standings[1]) {
      secondPlaces.push(standings[1]);
    }
  });

  // Sort second places by points, goal diff, goals scored
  const sortedSecondPlaces = sortStandings(secondPlaces);

  // Top 12 second places go to playoffs
  const playoffContenders = sortedSecondPlaces.slice(0, 12).map((s) => s.team);

  // Simulate playoffs (12 teams -> 4 qualify via knockout)
  // Simplified: pair them up and simulate 3 rounds
  let remainingTeams = shuffleArray(playoffContenders);
  while (remainingTeams.length > 4) {
    const winners: QualifierTeam[] = [];
    for (let i = 0; i < remainingTeams.length; i += 2) {
      if (i + 1 < remainingTeams.length) {
        const result = simulateQualifierMatch(
          remainingTeams[i],
          remainingTeams[i + 1],
        );
        const totalHome = result.homeGoals;
        const totalAway = result.awayGoals;
        winners.push(
          totalHome >= totalAway ? remainingTeams[i] : remainingTeams[i + 1],
        );
      } else {
        winners.push(remainingTeams[i]); // Odd team advances
      }
    }
    remainingTeams = winners;
  }

  const playoffWinners = remainingTeams.map((t) => t.name);

  return {
    qualified: [...groupWinners, ...playoffWinners],
    playoffTeams: [],
    eliminated: teams
      .filter(
        (t) =>
          !groupWinners.includes(t.name) && !playoffWinners.includes(t.name),
      )
      .map((t) => t.name),
  };
};

/**
 * CAF: 9 groups of 6 teams, group winners qualify
 * 4 best second places go to playoff for 1 spot
 */
const simulateCAF = (): QualifierResult => {
  const teams = getTeamsByContinent("Africa");
  const groups = divideIntoGroups(teams, 9);

  const groupWinners: string[] = [];
  const secondPlaces: QualifierStanding[] = [];

  groups.forEach((groupTeams) => {
    const standings = simulateGroupStage(groupTeams, true);
    groupWinners.push(standings[0].team.name);
    if (standings[1]) {
      secondPlaces.push(standings[1]);
    }
  });

  // 4 best second places compete for 1 playoff spot
  const sortedSeconds = sortStandings(secondPlaces).slice(0, 4);
  const playoffTeams = sortedSeconds.map((s) => s.team);

  // Simulate mini-tournament (4 -> 1)
  const semi1 = simulateQualifierMatch(playoffTeams[0], playoffTeams[3]);
  const semi2 = simulateQualifierMatch(playoffTeams[1], playoffTeams[2]);

  const finalist1 =
    semi1.homeGoals >= semi1.awayGoals ? playoffTeams[0] : playoffTeams[3];
  const finalist2 =
    semi2.homeGoals >= semi2.awayGoals ? playoffTeams[1] : playoffTeams[2];

  const final = simulateQualifierMatch(finalist1, finalist2);
  const playoffWinner =
    final.homeGoals >= final.awayGoals ? finalist1 : finalist2;

  return {
    qualified: groupWinners,
    playoffTeams: [playoffWinner.name],
    eliminated: teams
      .filter(
        (t) => !groupWinners.includes(t.name) && t.name !== playoffWinner.name,
      )
      .map((t) => t.name),
  };
};

/**
 * AFC: 3 groups of 6 teams in 3rd round
 * Top 2 of each group = 6 direct qualifiers
 * 3rd/4th places go to 4th round -> 2 more spots + 1 playoff
 */
const simulateAFC = (): QualifierResult => {
  const teams = getTeamsByContinent("Asia");
  // Take top 18 for 3rd round (realistic)
  const thirdRoundTeams = teams.slice(0, 18);
  const groups = divideIntoGroups(thirdRoundTeams, 3);

  const directQualified: string[] = [];
  const fourthRoundTeams: QualifierTeam[] = [];

  groups.forEach((groupTeams) => {
    const standings = simulateGroupStage(groupTeams, true);
    directQualified.push(standings[0].team.name, standings[1].team.name);
    if (standings[2]) fourthRoundTeams.push(standings[2].team);
    if (standings[3]) fourthRoundTeams.push(standings[3].team);
  });

  // 4th round: 6 teams in 2 groups of 3
  const fourthGroups = divideIntoGroups(fourthRoundTeams, 2);
  const fourthWinners: string[] = [];
  const fourthSeconds: QualifierTeam[] = [];

  fourthGroups.forEach((groupTeams) => {
    const standings = simulateGroupStage(groupTeams, true);
    fourthWinners.push(standings[0].team.name);
    if (standings[1]) fourthSeconds.push(standings[1].team);
  });

  // 5th round: 2 second places play for playoff spot
  let playoffTeam = "";
  if (fourthSeconds.length >= 2) {
    const fifthRound = simulateQualifierMatch(
      fourthSeconds[0],
      fourthSeconds[1],
    );
    playoffTeam =
      fifthRound.homeGoals >= fifthRound.awayGoals
        ? fourthSeconds[0].name
        : fourthSeconds[1].name;
  }

  return {
    qualified: [...directQualified, ...fourthWinners],
    playoffTeams: playoffTeam ? [playoffTeam] : [],
    eliminated: teams
      .filter(
        (t) =>
          !directQualified.includes(t.name) &&
          !fourthWinners.includes(t.name) &&
          t.name !== playoffTeam,
      )
      .map((t) => t.name),
  };
};

/**
 * CONCACAF: Final phase has 3 groups of 4 teams
 * Group winners qualify (3), 2 best second places go to playoff
 */
const simulateCONCACAF = (): QualifierResult => {
  const teams = getTeamsByContinent("North America");
  // Final phase: top 12 teams
  const finalPhaseTeams = teams.slice(0, 12);
  const groups = divideIntoGroups(finalPhaseTeams, 3);

  const groupWinners: string[] = [];
  const secondPlaces: QualifierStanding[] = [];

  groups.forEach((groupTeams) => {
    const standings = simulateGroupStage(groupTeams, true);
    groupWinners.push(standings[0].team.name);
    if (standings[1]) {
      secondPlaces.push(standings[1]);
    }
  });

  // 2 best second places go to intercontinental playoff
  const sortedSeconds = sortStandings(secondPlaces).slice(0, 2);

  return {
    qualified: groupWinners,
    playoffTeams: sortedSeconds.map((s) => s.team.name),
    eliminated: teams
      .filter(
        (t) =>
          !groupWinners.includes(t.name) &&
          !sortedSeconds.some((s) => s.team.name === t.name),
      )
      .map((t) => t.name),
  };
};

/**
 * OFC: 2 groups in 2nd round, then semis + final
 * Winner qualifies, runner-up goes to playoff
 */
const simulateOFC = (): QualifierResult => {
  const teams = getTeamsByContinent("Australia"); // OFC uses "Australia" continent
  const groups = divideIntoGroups(teams, 2);

  const topTwo: QualifierTeam[] = [];

  groups.forEach((groupTeams) => {
    const standings = simulateGroupStage(groupTeams, false); // Single round-robin
    if (standings[0]) topTwo.push(standings[0].team);
    if (standings[1]) topTwo.push(standings[1].team);
  });

  // Semi-finals (if 4 teams)
  let finalists: QualifierTeam[] = [];
  if (topTwo.length >= 4) {
    const semi1 = simulateQualifierMatch(topTwo[0], topTwo[3]);
    const semi2 = simulateQualifierMatch(topTwo[1], topTwo[2]);
    finalists = [
      semi1.homeGoals >= semi1.awayGoals ? topTwo[0] : topTwo[3],
      semi2.homeGoals >= semi2.awayGoals ? topTwo[1] : topTwo[2],
    ];
  } else if (topTwo.length >= 2) {
    finalists = [topTwo[0], topTwo[1]];
  }

  // Final
  let champion = "";
  let runnerUp = "";
  if (finalists.length >= 2) {
    const final = simulateQualifierMatch(finalists[0], finalists[1]);
    champion =
      final.homeGoals >= final.awayGoals
        ? finalists[0].name
        : finalists[1].name;
    runnerUp =
      final.homeGoals >= final.awayGoals
        ? finalists[1].name
        : finalists[0].name;
  }

  return {
    qualified: champion ? [champion] : [],
    playoffTeams: runnerUp ? [runnerUp] : [],
    eliminated: teams
      .filter((t) => t.name !== champion && t.name !== runnerUp)
      .map((t) => t.name),
  };
};

// ========== INTERCONTINENTAL PLAYOFF ==========

/**
 * FIFA Intercontinental Playoff
 * 6 teams compete for 2 spots:
 * - 2 CONCACAF, 1 AFC, 1 CAF, 1 CONMEBOL, 1 OFC
 */
const simulateIntercontinentalPlayoff = (playoffTeams: string[]): string[] => {
  if (playoffTeams.length === 0) return [];

  // Convert to QualifierTeam
  const teams: QualifierTeam[] = playoffTeams
    .map((name) => {
      const nat = NATIONALITIES.find((n) => n.name === name);
      if (!nat) return null;
      return {
        name: nat.name,
        reputation: nat.talentPool,
        fifaRank: nat.fifaRank,
        continent: nat.continent,
      };
    })
    .filter(Boolean) as QualifierTeam[];

  if (teams.length < 2) return teams.map((t) => t.name);

  // Sort by FIFA rank
  const sorted = [...teams].sort((a, b) => a.fifaRank - b.fifaRank);

  // Top 2 seeds go directly to finals
  // Others play knockout to reach finals
  const seeds = sorted.slice(0, 2);
  const others = sorted.slice(2);

  // Knockout among non-seeds
  let knockoutWinners: QualifierTeam[] = [];
  if (others.length >= 2) {
    // Pair up and play
    for (let i = 0; i < others.length; i += 2) {
      if (i + 1 < others.length) {
        const result = simulateQualifierMatch(others[i], others[i + 1]);
        knockoutWinners.push(
          result.homeGoals >= result.awayGoals ? others[i] : others[i + 1],
        );
      } else {
        knockoutWinners.push(others[i]);
      }
    }
  } else {
    knockoutWinners = others;
  }

  // Finals: 2 seeds vs 2 knockout winners (if available)
  const finalists = [...seeds, ...knockoutWinners.slice(0, 2)];
  const qualified: string[] = [];

  // Two separate finals for 2 spots
  if (finalists.length >= 4) {
    const final1 = simulateQualifierMatch(finalists[0], finalists[3]);
    const final2 = simulateQualifierMatch(finalists[1], finalists[2]);
    qualified.push(
      final1.homeGoals >= final1.awayGoals
        ? finalists[0].name
        : finalists[3].name,
    );
    qualified.push(
      final2.homeGoals >= final2.awayGoals
        ? finalists[1].name
        : finalists[2].name,
    );
  } else if (finalists.length >= 2) {
    // Just take the two best
    qualified.push(finalists[0].name, finalists[1].name);
  }

  return qualified;
};

// ========== MAIN EXPORT ==========

export interface WorldCupQualificationResult {
  qualified: boolean;
  method: "direct" | "playoff" | "none";
  allQualified: string[];
}

/**
 * Simulates the entire World Cup qualification process and checks
 * if a specific nation qualified
 */
export const simulateWorldCupQualifiers = (
  playerNationality: string,
): WorldCupQualificationResult => {
  // Find player's confederation
  const playerNat = NATIONALITIES.find((n) => n.name === playerNationality);
  if (!playerNat) {
    return { qualified: false, method: "none", allQualified: [] };
  }

  // Simulate all confederations
  const conmebol = simulateCONMEBOL();
  const uefa = simulateUEFA();
  const caf = simulateCAF();
  const afc = simulateAFC();
  const concacaf = simulateCONCACAF();
  const ofc = simulateOFC();

  // Collect all directly qualified teams
  const directQualified = [
    ...conmebol.qualified,
    ...uefa.qualified,
    ...caf.qualified,
    ...afc.qualified,
    ...concacaf.qualified,
    ...ofc.qualified,
  ];

  // Collect all playoff teams
  const playoffTeams = [
    ...conmebol.playoffTeams,
    ...caf.playoffTeams,
    ...afc.playoffTeams,
    ...concacaf.playoffTeams,
    ...ofc.playoffTeams,
  ];

  // Simulate intercontinental playoff
  const playoffWinners = simulateIntercontinentalPlayoff(playoffTeams);

  // All qualified teams
  const allQualified = [...directQualified, ...playoffWinners];

  // Check if player's nation qualified
  if (directQualified.includes(playerNationality)) {
    return { qualified: true, method: "direct", allQualified };
  }

  if (playoffWinners.includes(playerNationality)) {
    return { qualified: true, method: "playoff", allQualified };
  }

  return { qualified: false, method: "none", allQualified };
};

/**
 * Get a realistic opponent for World Cup matches
 * Picks from qualified teams
 */
export const getWorldCupOpponent = (
  playerNationality: string,
  allQualified: string[],
  targetReputation?: "Elite" | "Good" | "Average" | "Minnow",
): { name: string; reputation: number } => {
  // Filter out player's nation
  let candidates = allQualified.filter((name) => name !== playerNationality);

  // Filter by reputation if specified
  if (targetReputation) {
    const repRanges = {
      Elite: { min: 85, max: 100 },
      Good: { min: 70, max: 84 },
      Average: { min: 55, max: 69 },
      Minnow: { min: 0, max: 54 },
    };
    const range = repRanges[targetReputation];

    candidates = candidates.filter((name) => {
      const nat = NATIONALITIES.find((n) => n.name === name);
      return nat && nat.talentPool >= range.min && nat.talentPool <= range.max;
    });
  }

  // Pick random candidate
  if (candidates.length === 0) {
    // Fallback to any qualified team
    candidates = allQualified.filter((name) => name !== playerNationality);
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const nat = NATIONALITIES.find((n) => n.name === chosen);

  return {
    name: chosen || "Brazil",
    reputation: nat?.talentPool || 80,
  };
};

// ========== TWO-PHASE QUALIFICATION SYSTEM ==========

/**
 * Phase 0 result - initial group stages, preliminary rounds
 */
export interface Phase0Result {
  stillInContention: string[]; // Times que ainda estão vivos (passaram fase inicial)
  directlyQualifiedEarly: string[]; // Alguns times podem já classificar na fase 0 (ex: CONMEBOL)
  eliminated: string[]; // Já eliminados
  playerStatus: "contention" | "qualified" | "eliminated";
  playerOpponents: string[]; // Oponentes que o jogador enfrentou na fase 0
}

/**
 * Simulates the FIRST PHASE of World Cup qualifiers (Year 0)
 * This includes preliminary rounds and initial group stages
 */
export const simulateQualifiersPhase0 = (
  playerNationality: string,
): Phase0Result => {
  const playerNat = NATIONALITIES.find((n) => n.name === playerNationality);
  if (!playerNat) {
    return {
      stillInContention: [],
      directlyQualifiedEarly: [],
      eliminated: [],
      playerStatus: "eliminated",
      playerOpponents: [],
    };
  }

  const continent = playerNat.continent;
  const teamsByContinent = getTeamsByContinent(continent);
  const allTeamNames = teamsByContinent.map((t) => t.name);

  // Simulação diferente por confederação na Fase 0
  let stillInContention: string[] = [];
  let directlyQualifiedEarly: string[] = [];
  let eliminated: string[] = [];
  let playerOpponents: string[] = [];

  switch (continent) {
    case "South America": {
      // CONMEBOL: Um grupo de 10, fase 0 = primeiras 9 rodadas (metade)
      // Após fase 0: top 4 praticamente classificados, fundo luta para sobreviver
      const standings = simulateGroupStage(teamsByContinent, false); // Single round
      const sorted = sortStandings(standings);

      // Top 4 estão em boa posição (contention forte)
      // Todos ainda em contention na fase 0 (ninguém eliminado ainda)
      stillInContention = sorted.map((s) => s.team.name);
      directlyQualifiedEarly = []; // Ninguém classifica ainda na CONMEBOL na fase 0
      eliminated = [];

      // Oponentes do jogador na fase 0 (metade dos jogos)
      const otherTeams = teamsByContinent.filter(
        (t) => t.name !== playerNationality,
      );
      playerOpponents = otherTeams
        .slice(0, Math.ceil(otherTeams.length / 2))
        .map((t) => t.name);
      break;
    }

    case "Europe": {
      // UEFA: Na fase 0, 6 grupos são jogados (metade dos 12 grupos)
      // Simular apenas metade dos grupos na fase 0
      const groups = divideIntoGroups(teamsByContinent, 12);

      for (let i = 0; i < 6; i++) {
        if (!groups[i] || groups[i].length === 0) continue;
        const standings = simulateGroupStage(groups[i], false); // Single round
        const sorted = sortStandings(standings);

        // Top 2 de cada grupo estão em boa posição
        sorted.slice(0, 3).forEach((s) => stillInContention.push(s.team.name));
        sorted.slice(3).forEach((s) => eliminated.push(s.team.name));
      }

      // Restante dos times (ainda não jogaram na fase 0)
      for (let i = 6; i < 12; i++) {
        if (groups[i]) groups[i].forEach((t) => stillInContention.push(t.name));
      }

      // Oponentes do jogador na fase 0
      const playerGroup = groups.find((g) =>
        g.some((t) => t.name === playerNationality),
      );
      if (playerGroup) {
        playerOpponents = playerGroup
          .filter((t) => t.name !== playerNationality)
          .slice(0, 2)
          .map((t) => t.name);
      }
      break;
    }

    case "Africa": {
      // CAF: Fase 0 = 1ª e 2ª rodadas (grupos de 6, apenas 2 jogos cada)
      const groups = divideIntoGroups(teamsByContinent, 9);

      for (const group of groups) {
        const standings = simulateGroupStage(group, false); // Single round
        const sorted = sortStandings(standings);

        // Todos ainda em contention (fase muito inicial)
        sorted.forEach((s) => stillInContention.push(s.team.name));
      }

      const playerGroup = groups.find((g) =>
        g.some((t) => t.name === playerNationality),
      );
      if (playerGroup) {
        playerOpponents = playerGroup
          .filter((t) => t.name !== playerNationality)
          .slice(0, 2)
          .map((t) => t.name);
      }
      break;
    }

    case "Asia": {
      // AFC: Fase 0 = 1ª e 2ª rodadas da 3ª fase
      const groups = divideIntoGroups(teamsByContinent, 3);

      for (const group of groups) {
        const standings = simulateGroupStage(group, false);
        const sorted = sortStandings(standings);
        sorted.forEach((s) => stillInContention.push(s.team.name));
      }

      const playerGroup = groups.find((g) =>
        g.some((t) => t.name === playerNationality),
      );
      if (playerGroup) {
        playerOpponents = playerGroup
          .filter((t) => t.name !== playerNationality)
          .slice(0, 3)
          .map((t) => t.name);
      }
      break;
    }

    case "North America": {
      // CONCACAF: Fase 0 = fase de grupos inicial
      const groups = divideIntoGroups(teamsByContinent, 3);

      for (const group of groups) {
        const standings = simulateGroupStage(group, false);
        const sorted = sortStandings(standings);
        // Top 2 avançam
        sorted.slice(0, 2).forEach((s) => stillInContention.push(s.team.name));
        sorted.slice(2).forEach((s) => eliminated.push(s.team.name));
      }

      const playerGroup = groups.find((g) =>
        g.some((t) => t.name === playerNationality),
      );
      if (playerGroup) {
        playerOpponents = playerGroup
          .filter((t) => t.name !== playerNationality)
          .map((t) => t.name);
      }
      break;
    }

    case "Australia": {
      // OFC: Fase 0 = grupos iniciais
      const groups = divideIntoGroups(teamsByContinent, 2);

      for (const group of groups) {
        const standings = simulateGroupStage(group, true);
        const sorted = sortStandings(standings);
        sorted.forEach((s) => stillInContention.push(s.team.name));
      }

      const playerGroup = groups.find((g) =>
        g.some((t) => t.name === playerNationality),
      );
      if (playerGroup) {
        playerOpponents = playerGroup
          .filter((t) => t.name !== playerNationality)
          .map((t) => t.name);
      }
      break;
    }

    default:
      stillInContention = allTeamNames;
  }

  // Determinar status do jogador
  let playerStatus: "contention" | "qualified" | "eliminated";
  if (directlyQualifiedEarly.includes(playerNationality)) {
    playerStatus = "qualified";
  } else if (eliminated.includes(playerNationality)) {
    playerStatus = "eliminated";
  } else {
    playerStatus = "contention";
  }

  return {
    stillInContention,
    directlyQualifiedEarly,
    eliminated,
    playerStatus,
    playerOpponents,
  };
};

/**
 * Simulates the SECOND PHASE of World Cup qualifiers (Year 1)
 * This includes decisive group matches and playoffs
 * Uses phase0Data if available to maintain consistency
 */
export const simulateQualifiersPhase1 = (
  playerNationality: string,
  _phase0Data?: Phase0Result,
): WorldCupQualificationResult => {
  // Para simplificar e garantir consistência, simulamos tudo novamente
  // mas usamos phase0Data para narrativa/contexto
  // Em uma implementação mais complexa, poderíamos continuar de onde paramos
  return simulateWorldCupQualifiers(playerNationality);
};

/**
 * Gets opponents for qualifier matches based on phase and player's confederation
 */
export const getQualifierOpponent = (
  playerNationality: string,
  phase: 0 | 1,
  phase0Opponents?: string[],
): { name: string; reputation: number } => {
  const playerNat = NATIONALITIES.find((n) => n.name === playerNationality);
  if (!playerNat) {
    return { name: "Brazil", reputation: 80 };
  }

  const continent = playerNat.continent;
  const teamsByContinent = getTeamsByContinent(continent);

  // Filtrar jogador e oponentes já enfrentados na fase 0 (para fase 1)
  let candidates = teamsByContinent.filter((t) => t.name !== playerNationality);

  if (phase === 1 && phase0Opponents && phase0Opponents.length > 0) {
    // Na fase 1, preferir oponentes que não foram enfrentados na fase 0
    const newOpponents = candidates.filter(
      (t) => !phase0Opponents.includes(t.name),
    );
    if (newOpponents.length > 0) {
      candidates = newOpponents;
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    name: chosen?.name || "Brazil",
    reputation: chosen?.reputation || 80,
  };
};
