import {
  Player,
  Team,
  Archetype,
  PositionDetail,
  PlayerStats,
  Position,
  PlayerGoal,
  Continent,
  PlayerProfile,
  CareerCurve,
  PlayerStyle,
  Personality,
  Agent,
} from "../types";
import { createInitialSocialData } from "../types/socialTypes";

import { createInitialPersonalityScales, createInitialEventState } from "../types/interactiveEventTypes";
import {
  LEAGUES,
  AGENTS,
  selectWeightedNationality,
  PERSONALITIES,
  continentToCountries,
  NATIONALITIES,
  YOUTH_LEAGUES,
  getNameByNationality,
} from "../constants";
import { rand, clamp, randFloat } from "./utils";
import { calculateOverall } from "./playerProgression";
import { generateInitialPlayerGoals } from "./goalLogic";
import { generateExpandedPlayerData } from "./expandedPlayerGeneration";
import {
  calculateInitialPlayerProfile,
  computeWeeklyWage,
} from "./playerProfileLogic";
import { classifyPlayerStyle, assignPlayerTraits } from "./styleAndTraits";

const devClubs = [
  "Ajax",
  "Benfica",
  "Porto",
  "Sporting CP",
  "Flamengo",
  "River Plate",
  "Boca Juniors",
  "Borussia Dortmund",
  "Santos",
  "São Paulo",
  "Anderlecht",
];

function getPositionType(detail: PositionDetail): Position {
  const map: Record<PositionDetail, Position> = {
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
  };
  return map[detail];
}

function selectArchetype(roll: number): Archetype {
  if (roll < 2) return "Generational Talent"; // Aumentado de 1 para 2
  if (roll < 8) return "Wonderkid"; // Aumentado de 6 para 8
  if (roll < 25) return "Top Prospect"; // Aumentado de 21 para 25
  if (roll < 65) return "Solid Professional"; // Aumentado de 61 para 65
  if (roll < 85) {
    // Aumentado de 81 para 85
    const newArchetypeRoll = Math.random() * 4;
    if (newArchetypeRoll < 1) return "The Engine";
    if (newArchetypeRoll < 2) return "Late Bloomer";
    if (newArchetypeRoll < 3) return "Technical Maestro";
    return "Target Man";
  }
  return "Journeyman";
}

function getArchetypeParams(archetype: Archetype): {
  potential: number;
  baseMin: number;
  baseMax: number;
  teamFilter: (t: Team) => boolean;
} {
  switch (archetype) {
    case "Generational Talent":
      return {
        potential: rand(96, 100),
        baseMin: 55,
        baseMax: 68,
        teamFilter: (t) => devClubs.includes(t.name),
      }; // Aumentado para 100
    case "Wonderkid":
      return {
        potential: rand(91, 96),
        baseMin: 55,
        baseMax: 62,
        teamFilter: (t) => t.leagueTier <= 2,
      }; // Aumentado
    case "Top Prospect":
      return {
        potential: rand(86, 91),
        baseMin: 55,
        baseMax: 58,
        teamFilter: (t) => t.leagueTier <= 3,
      }; // Aumentado
    case "Solid Professional":
      return {
        potential: rand(79, 86),
        baseMin: 55,
        baseMax: 56,
        teamFilter: (t) => t.leagueTier >= 2 && t.leagueTier <= 4,
      }; // Aumentado
    case "The Engine":
      return {
        potential: rand(81, 88),
        baseMin: 55,
        baseMax: 58,
        teamFilter: (t) => t.leagueTier >= 2,
      }; // Aumentado
    case "Late Bloomer":
      return {
        potential: rand(76, 84),
        baseMin: 55,
        baseMax: 56,
        teamFilter: (t) => t.leagueTier >= 2,
      }; // Aumentado
    case "Technical Maestro":
      return {
        potential: rand(83, 90),
        baseMin: 55,
        baseMax: 58,
        teamFilter: (t) => t.leagueTier >= 2,
      }; // Aumentado
    case "Target Man":
      return {
        potential: rand(81, 87),
        baseMin: 55,
        baseMax: 56,
        teamFilter: (t) => t.leagueTier >= 2,
      }; // Aumentado
    default:
      return {
        potential: rand(71, 79),
        baseMin: 55,
        baseMax: 56,
        teamFilter: (t) => t.leagueTier >= 3,
      }; // Aumentado
  }
}

function selectTeam(
  continent: Continent,
  filter: (t: Team) => boolean,
  allTeams: Team[],
): Team {
  const teamsInContinent = allTeams.filter((team) =>
    continentToCountries[continent].includes(team.country),
  );
  let teamPool: Team[] = [];

  if (teamsInContinent.length > 0) {
    teamPool = teamsInContinent.filter(filter);
  }

  if (teamPool.length === 0 && teamsInContinent.length > 0) {
    teamPool = teamsInContinent;
  }

  if (teamPool.length === 0) {
    teamPool = allTeams.filter(filter);
  }

  if (teamPool.length === 0) {
    teamPool = allTeams;
  }

  return teamPool[rand(0, teamPool.length - 1)];
}

function generateInitialStats(
  detail: PositionDetail,
  min: number,
  max: number,
  archetype: Archetype,
): PlayerStats {
  const isGoalkeeper = detail === "GK";

  // Generate base stats first
  const pace = rand(min, max + 15);
  const shooting = rand(min, max);
  const passing = rand(min, max);
  const dribbling = rand(min, max);
  const defending = rand(min, max);
  const physical = rand(min, max + 5);
  const agility = rand(40, 80);
  const jumping = rand(40, 75);
  const strength = rand(40, 75);

  const stats: PlayerStats = {
    overall: 0,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    flair: rand(min - 5, max + 5),
    leadership: rand(20, 40),
    fitness: rand(80, 95),
    vision: rand(min - 5, max),
    composure: rand(min, max + 5),
    aggression: rand(30, 70),
    positioning: rand(min - 10, max),
    interceptions: rand(min - 10, max),
    workRate: rand(40, 80),
    stamina: rand(50, 85),
    strength,
    agility,
    jumping,
    crossing: rand(min - 10, max),
    longShots: rand(min - 10, max),
    curve: rand(min - 10, max),

    // v0.5.2: Derive these attributes properly from base stats
    // This ensures expanded data generation has correct values
    balance: clamp(
      Math.round(agility * 0.6 + physical * 0.4 + rand(-5, 5)),
      20,
      99,
    ),
    sprintSpeed: clamp(Math.round(pace + rand(-5, 5)), 20, 99),
    ballControl: clamp(Math.round(dribbling + rand(-3, 3)), 20, 99),
    acceleration: clamp(Math.round(pace + rand(-8, 3)), 20, 99),
    shotPower: clamp(
      Math.round(physical * 0.5 + shooting * 0.5 + rand(-5, 5)),
      20,
      99,
    ),
    heading: clamp(
      Math.round(jumping * 0.5 + strength * 0.3 + physical * 0.2 + rand(-5, 5)),
      20,
      99,
    ),
    finishing: clamp(Math.round(shooting + rand(-3, 5)), 20, 99),

    preferredFoot: undefined,
    weakFoot: 3,
    leftFootFinishing: 0, // Will be calculated later based on preferred foot
    rightFootFinishing: 0, // Will be calculated later based on preferred foot

    // ✅ Atributos de goleiro
    handling: isGoalkeeper ? rand(min, max + 10) : undefined,
    reflexes: isGoalkeeper ? rand(min + 5, max + 15) : undefined,
    diving: isGoalkeeper ? rand(min, max + 10) : undefined,
  };

  switch (archetype) {
    case "The Engine":
      stats.stamina = rand(max, max + 15);
      stats.workRate = rand(max, max + 15);
      stats.physical = rand(max, max + 10);
      break;
    case "Technical Maestro":
      stats.dribbling = rand(max, max + 10);
      stats.passing = rand(max, max + 10);
      stats.vision = rand(max, max + 10);
      stats.flair = rand(max, max + 15);
      // Also boost related derived stats
      stats.ballControl = clamp(stats.dribbling + rand(-3, 3), 20, 99);
      break;
    case "Target Man":
      stats.strength = rand(max, max + 15);
      stats.jumping = rand(max, max + 10);
      stats.shooting = rand(max, max + 5);
      stats.pace -= 10;
      // Also boost related derived stats
      stats.heading = clamp(
        Math.round(
          stats.jumping * 0.5 + stats.strength * 0.3 + stats.physical * 0.2 + 5,
        ),
        20,
        99,
      );
      stats.shotPower = clamp(
        Math.round(stats.physical * 0.5 + stats.shooting * 0.5 + 5),
        20,
        99,
      );
      stats.sprintSpeed = clamp(stats.pace + rand(-5, 5), 20, 99);
      break;
  }

  return stats;
}

function calculateInitialReputation(
  potential: number,
  tier: number,
  baseMax: number,
): number {
  return Math.floor(potential / 10 + (6 - tier) * 4 + baseMax / 10);
}

function calculateInitialFollowers(potential: number, tier: number): number {
  let base = 0;
  if (potential >= 95) base = rand(10000, 25000);
  else if (potential >= 90) base = rand(5000, 12000);
  else if (potential >= 85) base = rand(2000, 6000);
  else if (potential >= 80) base = rand(1000, 3000);
  else base = rand(100, 1000);

  const multiplier = [1.5, 1.3, 1.1, 1.0, 0.8][tier - 1] || 0.7;
  return Math.round(base * multiplier * (1 + (potential - 70) / 200));
}

const generateCareerCurve = (potential: number): CareerCurve => {
  // 10% chance to get blessed career trajectory (faster development, longer peak)
  const isBlessed = Math.random() < 0.1;

  const speedRoll = Math.random() * 100;
  let developmentSpeed: CareerCurve["developmentSpeed"];
  if (isBlessed) {
    // Blessed players develop faster
    if (speedRoll < 40) developmentSpeed = "Very Fast";
    else if (speedRoll < 80) developmentSpeed = "Fast";
    else developmentSpeed = "Normal";
  } else {
    if (speedRoll < 5) developmentSpeed = "Very Fast";
    else if (speedRoll < 20) developmentSpeed = "Fast";
    else if (speedRoll < 80) developmentSpeed = "Normal";
    else if (speedRoll < 95) developmentSpeed = "Slow";
    else developmentSpeed = "Very Slow";
  }

  const durationRoll = Math.random() * 100;
  let peakDuration: CareerCurve["peakDuration"];
  if (isBlessed) {
    // Blessed players have longer peaks
    if (durationRoll < 30) peakDuration = "Long";
    else if (durationRoll < 70) peakDuration = "Very Long";
    else peakDuration = "Standard";
  } else {
    if (durationRoll < 10) peakDuration = "Short";
    else if (durationRoll < 50) peakDuration = "Standard";
    else if (durationRoll < 85) peakDuration = "Long";
    else peakDuration = "Very Long";
  }

  const declineRoll = Math.random() * 100;
  let declineSpeed: CareerCurve["declineSpeed"];
  if (isBlessed) {
    // Blessed players decline slower
    if (declineRoll < 50) declineSpeed = "Gradual";
    else if (declineRoll < 85) declineSpeed = "Very Gradual";
    else declineSpeed = "Normal";
  } else {
    if (declineRoll < 15) declineSpeed = "Rapid";
    else if (declineRoll < 65) declineSpeed = "Normal";
    else if (declineRoll < 90) declineSpeed = "Gradual";
    else declineSpeed = "Very Gradual";
  }

  let peakLevel: CareerCurve["peakLevel"];
  if (potential >= 95)
    peakLevel = Math.random() < 0.7 ? "Legendary" : "World Class";
  else if (potential >= 90)
    peakLevel = Math.random() < 0.6 ? "World Class" : "Elite";
  else if (potential >= 85) peakLevel = Math.random() < 0.5 ? "Elite" : "Great";
  else if (potential >= 80) peakLevel = Math.random() < 0.4 ? "Great" : "Good";
  else peakLevel = "Good";

  return { developmentSpeed, peakDuration, declineSpeed, peakLevel };
};

export const createPlayer = (
  positionDetail: PositionDetail,
  continent: Continent,
  gender: "male" | "female" = "male",
  customName?: string,
  customCountry?: string,
): Player => {
  const age = 14;

  // 🔍 DEBUG: Log custom inputs to track the "random name" bug
  console.log('[PlayerCreation] Creating player with:', {
    customName: customName ?? '(not provided)',
    customCountry: customCountry ?? '(not provided)',
    continent,
    gender,
  });

  // Use customCountry if provided, otherwise select based on continent
  const nationality = customCountry?.trim() || selectWeightedNationality(continent);

  // Use customName if provided and non-empty, otherwise generate based on nationality
  const trimmedName = customName?.trim();
  const name = trimmedName && trimmedName.length > 0
    ? trimmedName
    : getNameByNationality(nationality, gender);

  // 🔍 DEBUG: Log final decision
  console.log('[PlayerCreation] Final name/country decision:', {
    usedCustomName: !!trimmedName,
    finalName: name,
    usedCustomCountry: !!customCountry?.trim(),
    finalNationality: nationality,
  });

  const position = getPositionType(positionDetail);
  const archetype = selectArchetype(Math.random() * 100);
  const { potential, baseMin, baseMax, teamFilter } =
    getArchetypeParams(archetype);

  // ====== DESTINY SYSTEM: Random luck at birth ======
  const destinyRoll = Math.random();
  let potentialBonus = 0;
  let betterAcademyChance = false;

  if (destinyRoll < 0.05) {
    // 5% - Golden child: massive boost
    potentialBonus = rand(5, 10);
    betterAcademyChance = true;
  } else if (destinyRoll < 0.15) {
    // 10% - Blessed: good boost
    potentialBonus = rand(3, 6);
    betterAcademyChance = true;
  } else if (destinyRoll < 0.3) {
    // 15% - Lucky: small boost
    potentialBonus = rand(1, 3);
  } else if (destinyRoll > 0.9) {
    // 10% - Unlucky: small penalty
    potentialBonus = rand(-3, -1);
  }

  const finalPotential = clamp(potential + potentialBonus, 65, 99);

  const allYouthTeams = Object.values(YOUTH_LEAGUES).flatMap((league) =>
    Object.values(league.divisions)
      .flat()
      .map((team) => ({
        id: `${team.name}-${team.country}`,
        ...team,
      })),
  );

  // Blessed players have chance to start at better academies
  let team: Team;
  if (betterAcademyChance && Math.random() < 0.6) {
    const eliteFilter = (t: Team) => t.leagueTier <= 2;
    team = selectTeam(continent, eliteFilter, allYouthTeams);
  } else {
    team = selectTeam(continent, teamFilter, allYouthTeams);
  }

  const personality = PERSONALITIES[
    rand(0, PERSONALITIES.length - 1)
  ] as Personality;

  const { developmentSpeed, peakDuration, declineSpeed, peakLevel } =
    generateCareerCurve(finalPotential);
  let peakAgeStart: number, peakAgeEnd: number, retirementAge: number;

  const ageRanges = {
    "Very Fast": {
      peakStart: [19, 22],
      peakEnd: [25, 28],
      retirement: [30, 34],
    },
    Fast: { peakStart: [21, 23], peakEnd: [27, 30], retirement: [32, 36] },
    Normal: { peakStart: [23, 26], peakEnd: [29, 32], retirement: [34, 38] },
    Slow: { peakStart: [25, 28], peakEnd: [31, 34], retirement: [36, 39] },
    "Very Slow": {
      peakStart: [27, 30],
      peakEnd: [33, 36],
      retirement: [37, 40],
    },
  };
  const devSpeedKey = developmentSpeed as keyof typeof ageRanges;
  peakAgeStart = rand(
    ageRanges[devSpeedKey].peakStart[0],
    ageRanges[devSpeedKey].peakStart[1],
  );
  peakAgeEnd =
    peakAgeStart +
    { Short: 4, Standard: 6, Long: 8, "Very Long": 11 }[peakDuration] +
    rand(-1, 1);
  retirementAge = rand(
    ageRanges[devSpeedKey].retirement[0],
    ageRanges[devSpeedKey].retirement[1],
  );

  const stats = generateInitialStats(
    positionDetail,
    baseMin,
    baseMax,
    archetype,
  );

  // ====== PRODIGY SYSTEM: Random blessings at birth ======
  const isProdigy = Math.random() < 0.15; // 15% chance to be blessed
  const prodigyBonus = isProdigy ? rand(2, 5) : 0; // +2 to +5 extra points

  if (isProdigy) {
    // Boost 3-5 random key attributes for this position
    const keyAttributes = Object.keys(stats).filter(
      (k) =>
        k !== "overall" &&
        k !== "fitness" &&
        typeof (stats as any)[k] === "number",
    );
    const numBoosts = rand(3, 5);
    const chosenAttrs = keyAttributes
      .sort(() => Math.random() - 0.5)
      .slice(0, numBoosts);

    chosenAttrs.forEach((attr) => {
      (stats as any)[attr] = Math.min(99, (stats as any)[attr] + prodigyBonus);
    });
  }

  Object.keys(stats).forEach((key) => {
    const current = (stats as any)[key];
    if (key !== "overall" && key !== "fitness" && typeof current === "number") {
      (stats as any)[key] = clamp(current, 10, 99);
    }
  });

  stats.overall = calculateOverall(stats, positionDetail);

  // ====== Footedness setup ======
  const preferredFoot: "Left" | "Right" | "Both" =
    Math.random() < 0.78 ? "Right" : "Left";
  stats.preferredFoot = preferredFoot;
  // Weak foot scale 1-5 (influenced by archetype/technique)
  // Distribuição mais realista: maioria 2-3, poucos 4, raríssimos 5
  let baseWeak: number;
  if (archetype === "Generational Talent") {
    // Talento geracional: chance maior de weak foot alto
    const roll = Math.random();
    if (roll < 0.05)
      baseWeak = 5; // 5% chance de 5 estrelas
    else if (roll < 0.25)
      baseWeak = 4; // 20% chance de 4 estrelas
    else if (roll < 0.6)
      baseWeak = 3; // 35% chance de 3 estrelas
    else baseWeak = 2; // 40% chance de 2 estrelas
  } else if (archetype === "Technical Maestro") {
    // Maestro técnico: um pouco melhor que normal
    const roll = Math.random();
    if (roll < 0.03)
      baseWeak = 5; // 3% chance de 5 estrelas
    else if (roll < 0.18)
      baseWeak = 4; // 15% chance de 4 estrelas
    else if (roll < 0.55)
      baseWeak = 3; // 37% chance de 3 estrelas
    else baseWeak = 2; // 45% chance de 2 estrelas
  } else {
    // Jogadores normais: maioria tem weak foot limitado
    const roll = Math.random();
    if (roll < 0.01)
      baseWeak = 5; // 1% chance de 5 estrelas
    else if (roll < 0.08)
      baseWeak = 4; // 7% chance de 4 estrelas
    else if (roll < 0.4)
      baseWeak = 3; // 32% chance de 3 estrelas
    else if (roll < 0.75)
      baseWeak = 2; // 35% chance de 2 estrelas
    else baseWeak = 1; // 25% chance de 1 estrela
  }
  stats.weakFoot = baseWeak;
  // Foot-specific finishing based on shooting plus preferred bias, modulated by weak foot ability
  const bias = rand(5, 12);

  // Weak foot now uses PROPORTIONAL system (percentage of strong foot)
  // This makes 1 star truly terrible, not just slightly worse
  // 1 star: 15-30% of strong foot (very bad - almost unusable)
  // 2 stars: 35-50% of strong foot (poor)
  // 3 stars: 55-70% of strong foot (average)
  // 4 stars: 75-85% of strong foot (good)
  // 5 stars: 90-100% of strong foot (excellent - nearly ambidextrous)

  const weakFootPercentages: Record<number, [number, number]> = {
    1: [0.15, 0.3], // 15-30%
    2: [0.35, 0.5], // 35-50%
    3: [0.55, 0.7], // 55-70%
    4: [0.75, 0.85], // 75-85%
    5: [0.9, 1.0], // 90-100%
  };

  const [minPercent, maxPercent] = weakFootPercentages[stats.weakFoot] || [
    0.55, 0.7,
  ];
  const weakFootMultiplier =
    minPercent + Math.random() * (maxPercent - minPercent);

  if (preferredFoot === "Left") {
    stats.leftFootFinishing = clamp(stats.shooting + bias, 10, 99);
    stats.rightFootFinishing = clamp(
      Math.round(stats.leftFootFinishing * weakFootMultiplier),
      10,
      99,
    );
  } else {
    stats.rightFootFinishing = clamp(stats.shooting + bias, 10, 99);
    stats.leftFootFinishing = clamp(
      Math.round(stats.rightFootFinishing * weakFootMultiplier),
      10,
      99,
    );
  }

  const profile = calculateInitialPlayerProfile(
    stats,
    positionDetail,
    archetype,
  );
  const careerCurve = {
    developmentSpeed,
    peakDuration,
    declineSpeed,
    peakLevel,
  };

  const averageAgents = AGENTS.filter((a) => a.reputation === "Average");
  const startingAgent = averageAgents[rand(0, averageAgents.length - 1)];
  const initialReputation = calculateInitialReputation(
    finalPotential,
    team.leagueTier,
    baseMax,
  );

  // Create a minimal player object for goal generation and trait assignment
  const tempPlayer: Player = {
    starQuality: finalPotential >= 85 ? 5 : finalPotential >= 75 ? 4 : finalPotential >= 65 ? 3 : 2,
    cash: 0, // Youth players start with no money
    totalClubs: 1,
    name,
    age,
    archetype,
    position: positionDetail,
    nationality,
    stats,
    team,
    squadStatus: "Prospect",
    retired: false,
    trophies: {
      league: 0,
      cup: 0,
      championsLeague: 0,
      libertadores: 0,
      afcChampionsLeague: 0,
      clubWorldCup: 0,
      worldCup: 0,
      continentalCup: 0,
      nationsLeague: 0,
      europaLeague: 0,
      conferenceLeague: 0,
      copaSudamericana: 0,
      superCup: 0,
      stateCup: 0,
      supercopaBrasil: 0,
      recopaSudamericana: 0,
      fifaClubWorldCup: 0,
      intercontinentalCup: 0,
      americasDerby: 0,
      challengerCup: 0,
      cafChampionsLeague: 0,
      cafConfederationCup: 0,
      cafAccessCup: 0,
      afcCup: 0,
      afcChallengeCup: 0,
      concacafChampionsCup: 0,
      concacafLeague: 0,
      concacafShield: 0,
      ofcChampionsLeague: 0,
      ofcCup: 0,
      ofcQualifierCup: 0,
      conmebolAccessCup: 0,
      // Youth trophies
      youthLeague: 0,
      youthCup: 0,
      youthContinental: 0,
      youthSpecialTournament: 0,
    },
    awards: {
      worldPlayerAward: 0,
      topScorerAward: 0,
      bestGoalkeeperAward: 0,
      youngPlayerAward: 0,
      teamOfTheYear: 0,
      continentalTopScorer: 0,
      goalOfTheYear: 0,
      continentalPlayerAward: 0,
      worldCupBestPlayer: 0,
      continentalCupPOTY: 0,
      leaguePlayerOfYear: 0,
      worldCupBestGoalkeeper: 0,
      continentalPOTY: undefined,
      leagueForwardOfYear: undefined,
      leagueMidfielderOfYear: undefined,
      leagueDefenderOfYear: undefined,
      leagueTopAssister: undefined,
      leagueRookieOfYear: undefined,
      comebackPlayerOfYear: undefined,
      worldCupTOTT: undefined,
      continentalTOTT: undefined,
      fifaBestAward: 0,
      cupTopScorer: 0,
      continentalCompetitionTopScorer: 0,
      ballonDor: 0,
      leagueTitles: 0,
      continentalTitles: 0,
      worldCups: 0,
    },
    marketValue: Math.round(finalPotential / 20) * 1000000,
    personality,
    morale: "Normal",
    teamChemistry: rand(40, 60),
    clubApproval: rand(50, 70),
    injury: null,
    potential: finalPotential,
    reputation: initialReputation,
    wage: computeWeeklyWage(team, "Prospect", stats.overall, true),
    contractLength: rand(1, 3),
    agentContractLength: rand(2, 4),
    parentClub: null,
    yearsAtClub: 0,
    hasMadeSeniorDebut: false,
    playerGoals: [],
    traits: [], // Will be assigned below
    totalMatches: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalCleanSheets: 0,
    careerTrajectory: "Standard",
    peakAgeStart,
    peakAgeEnd,
    retirementAge,
    form: 0,
    seasonsWithLowPlayingTime: 0,

    socialMediaFollowers: calculateInitialFollowers(
      finalPotential,
      team.leagueTier
    ),
    agent: startingAgent,
    mediaNarrative: "Prodigy",
    nationalTeamStatus: "Not Called",
    internationalCaps: 0,
    internationalGoals: 0,
    internationalAssists: 0,
    worldCupAppearances: 0,
    continentalCupAppearances: 0,
    seasonsAt14: 0,
    profile,
    careerCurve,
    playerStyle: undefined, // Will be assigned below
    matchHistory: [],
  };

  // Assign playing style and traits based on complete player object
  tempPlayer.playerStyle = classifyPlayerStyle(tempPlayer);
  tempPlayer.traits = assignPlayerTraits(tempPlayer);

  // ====== PRODIGY BONUS TRAIT: Golden children get extra guaranteed trait ======
  if (isProdigy && Math.random() < 0.4) {
    // 40% of prodigies get a bonus trait (not just by luck)
    const bonusTraits: Array<{
      name: string;
      level: "Gold" | "Diamond";
      description: string;
    }> = [
        {
          name: "Clinical Finisher",
          level: "Gold",
          description: "traitStyles.clinicalFinisher",
        },
        {
          name: "Speed Merchant",
          level: "Gold",
          description: "traitStyles.speedMerchant",
        },
        {
          name: "Dribbling Wizard",
          level: "Gold",
          description: "traitStyles.dribblingWizard",
        },
        {
          name: "Playmaker",
          level: "Gold",
          description: "traitStyles.playmaker",
        },
        {
          name: "Leadership",
          level: "Gold",
          description: "traitStyles.leadership",
        },
      ];

    const bonusTrait =
      bonusTraits[Math.floor(Math.random() * bonusTraits.length)];

    // Only add if not already present at same or higher level
    const existingTrait = tempPlayer.traits.find(
      (t) => t.name === bonusTrait.name,
    );
    if (
      !existingTrait ||
      existingTrait.level === "Bronze" ||
      existingTrait.level === "Silver"
    ) {
      tempPlayer.traits = tempPlayer.traits.filter(
        (t) => t.name !== bonusTrait.name,
      );
      tempPlayer.traits.push(bonusTrait as any);
    }
  }

  // Generate initial goals using the temporary player object
  const playerGoals = generateInitialPlayerGoals(tempPlayer, 0);

  // v0.5.2 - Generate expanded player data (ultra-detailed attributes)
  const expandedData = generateExpandedPlayerData(tempPlayer);

  // Task 1: RECALCULATE OVR from expandedData now that it exists
  // This ensures the initial OVR reflects the detailed attributes
  const correctedOverall = calculateOverall(stats, positionDetail, expandedData);
  tempPlayer.stats.overall = correctedOverall;

  return {
    ...tempPlayer,
    playerGoals,
    expandedData,
    // v0.5.2 - Initialize suspensions to zero
    suspensions: {
      league: 0,
      cup: 0,
      continental: 0,
      stateCup: 0,
      international: 0,
    },
    // v0.5.7 - Initialize social data
    socialData: createInitialSocialData(team.reputation, stats.overall),
    // v0.5.7 - Initialize finance state (youth players start with no savings)

    // v0.5.7 - Initialize event state with personality scales based on personality trait
    eventState: createInitialEventState(personality),
  };
};
