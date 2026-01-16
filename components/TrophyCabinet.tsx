import React, { useState, useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import type { CareerLog, Player, Trophies, Awards } from "../types";
import { i18nTimes, translateNationality } from "../utils/i18n";
import { Icon } from "./ui/Icon";

type IconName = string;

// Função para obter visuais distintos para diferentes tipos de troféus
const getTrophyVisuals = (trophyType: string) => {
  // World Cups (Mundial) - Globe icon with gold/yellow colors
  if (trophyType.toLowerCase().includes('worldcup') ||
      trophyType.toLowerCase().includes('mundial') ||
      trophyType.toLowerCase().includes('world_cup')) {
    return {
      icon: "GlobeHemisphereWest",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30"
    };
  }

  // Continental Cups (Champions League / Libertadores / AFC etc.) - Star icons with blue colors
  if (trophyType.toLowerCase().includes('champions') ||
      trophyType.toLowerCase().includes('libertadores') ||
      trophyType.toLowerCase().includes('copa_sudamericana') ||
      trophyType.toLowerCase().includes('afc') ||
      trophyType.toLowerCase().includes('caf') ||
      trophyType.toLowerCase().includes('concacaf') ||
      trophyType.toLowerCase().includes('ofc') ||
      trophyType.toLowerCase().includes('europa') ||
      trophyType.toLowerCase().includes('conference') ||
      trophyType.toLowerCase().includes('copa_sudamericana') ||
      trophyType.toLowerCase().includes('conmebol_access')) {
    return {
      icon: "Star",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30"
    };
  }

  // National Leagues (Ligas) - Shield icon for league badges
  if (trophyType.toLowerCase().includes('league') ||
      trophyType === 'league' ||
      trophyType.toLowerCase().includes('liga')) {
    return {
      icon: "ShieldChevron",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    };
  }

  // Domestic Cups (Copas Nacionais) - Trophy icon for cups
  if (trophyType.toLowerCase().includes('cup') ||
      trophyType.toLowerCase().includes('copa') ||
      trophyType === 'cup' ||
      trophyType.toLowerCase().includes('state') ||
      trophyType.toLowerCase().includes('supercup')) {
    return {
      icon: "Trophy",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30"
    };
  }

  // Individual Awards (Best Player/Scorer) - Medal or SoccerBall
  if (trophyType.toLowerCase().includes('award') ||
      trophyType.toLowerCase().includes('ballon') ||
      trophyType.toLowerCase().includes('player') ||
      trophyType.toLowerCase().includes('top_scorer') ||
      trophyType.toLowerCase().includes('goalkeeper') ||
      trophyType.toLowerCase().includes('young') ||
      trophyType.toLowerCase().includes('team_of')) {
    return {
      icon: "Medal",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30"
    };
  }

  // Default fallback
  return {
    icon: "Trophy",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30"
  };
};

interface TrophyCabinetProps {
  history: CareerLog[];
  player: Player;
}

interface TrophyDetail {
  season: string;
  club: string;
  competition: string;
}

// Função auxiliar para garantir número válido
const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Mapeia nomes internos de competições para chaves de tradução
const getCompetitionTranslationKey = (competition: string): string => {
  const competitionMap: Record<string, string> = {
    // Competições Europeias (legacy + generic)
    "Champions League": "trophy.championsLeague",
    "Continental Championship": "trophy.championsLeague",
    "European Champions Cup": "trophy.championsLeague",
    "Europa League": "trophy.europaLeague",
    "Continental Cup": "trophy.europaLeague",
    "European Club Cup": "trophy.europaLeague",
    "Conference League": "trophy.conferenceLeague",
    "Continental League": "trophy.conferenceLeague",
    "European Access Cup": "trophy.conferenceLeague",
    // Sul-Americanas (legacy + generic)
    "Copa Libertadores": "trophy.libertadores",
    "South American Championship": "trophy.libertadores",
    "South American Champions Cup": "trophy.libertadores",
    Libertadores: "trophy.libertadores",
    "Copa Sudamericana": "trophy.copaSudamericana",
    "South American Cup": "trophy.copaSudamericana",
    "South American Club Cup": "trophy.copaSudamericana",
    // Asiáticas (legacy + generic)
    "AFC Champions League": "trophy.afcChampionsLeague",
    "Asian Championship": "trophy.afcChampionsLeague",
    "Asian Champions Cup": "trophy.afcChampionsLeague",
    "AFC Cup": "trophy.afcCup",
    "Asian Cup": "trophy.afcCup",
    "Asian Club Cup": "trophy.afcCup",
    // Africanas (legacy + generic)
    "CAF Champions League": "trophy.cafChampionsLeague",
    "African Championship": "trophy.cafChampionsLeague",
    "African Champions Cup": "trophy.cafChampionsLeague",
    "CAF Confederation Cup": "trophy.cafConfederationCup",
    "African Cup": "trophy.cafConfederationCup",
    "African Club Cup": "trophy.cafConfederationCup",
    // Norte/Centro Americanas (legacy + generic)
    "CONCACAF Champions Cup": "trophy.concacafChampionsCup",
    "North American Championship": "trophy.concacafChampionsCup",
    "North American Champions Cup": "trophy.concacafChampionsCup",
    // Outras
    "Club World Cup": "trophy.clubWorldCup",
    "Intercontinental Cup": "trophy.intercontinentalCup",
    "Domestic Cup": "trophy.cup",
    "League Cup": "trophy.cup",
    League: "trophy.league",
  };

  return competitionMap[competition] || competition;
};

// Constantes para padrões de busca
// IMPORTANTE: A ordem importa! Padrões mais específicos devem vir antes dos genéricos.
const TROPHY_PATTERNS: Record<keyof Trophies, string[]> = {
  // Internacionais / Continentais primeiro (para não cair no 'cup' ou 'league')
  clubWorldCup: [
    "club world cup",
    "clubWorldCup",
    "events.trophy.clubWorldCup",
  ],
  fifaClubWorldCup: ["fifa club world cup", "fifaClubWorldCup"],
  intercontinentalCup: ["intercontinental cup", "intercontinentalCup"],
  americasDerby: ["americas derby", "americasDerby", "dérbi das américas", "clássico intercontinental"],
  challengerCup: ["challenger cup", "challengerCup", "copa challenger", "trophy.challengerCup"],
  worldCup: [
    "world cup",
    "copa do mundo",
    "worldCup",
    "events.trophy.worldCup",
  ],
  championsLeague: [
    "champions league",
    "continental championship",
    "european champions cup",
    "uefa champions league",
    "championsLeague",
  ],
  europaLeague: ["europa league", "continental cup", "european club cup", "uefa europa league", "europaLeague"],
  conferenceLeague: [
    "conference league",
    "continental league",
    "european access cup",
    "uefa conference league",
    "conferenceLeague",
  ],
  libertadores: ["libertadores", "south american championship", "south american champions cup", "copa libertadores", "libertadores"],
  copaSudamericana: ["copa sudamericana", "south american cup", "south american club cup", "sudamericana", "copaSudamericana"],
  recopaSudamericana: ["recopa sudamericana", "recopaSudamericana"],
  afcChampionsLeague: [
    "liga dos campeões da ásia",
    "asian championship",
    "asian champions cup",
    "afc champions league",
    "afcChampionsLeague",
  ],

  superCup: ["super cup", "supercopa", "superCup"],
  supercopaBrasil: ["supercopa do brasil", "supercopaBrasil"],
  // New Continental Competitions (legacy + generic)
  cafChampionsLeague: [
    "african championship",
    "african champions cup",
    "caf champions league",
    "cafChampionsLeague",
  ],
  cafConfederationCup: [
    "african cup",
    "african club cup",
    "caf confederation cup",
    "cafConfederationCup",
  ],
  cafAccessCup: ["caf access cup", "cafAccessCup"],
  afcCup: ["asian cup", "asian club cup", "afc cup", "afcCup"],
  afcChallengeCup: [
    "afc challenge cup",
    "afcChallengeCup",
  ],
  concacafChampionsCup: [
    "north american championship",
    "north american champions cup",
    "concacaf champions cup",
    "concacafChampionsCup",
  ],
  concacafLeague: [
    "concacaf league",
    "concacafLeague",
  ],
  concacafShield: [
    "concacaf shield",
    "concacafShield",
  ],
  ofcChampionsLeague: [
    "ofc champions league",
    "ofcChampionsLeague",
  ],
  ofcCup: ["ofc cup", "ofcCup"],
  ofcQualifierCup: [
    "ofc qualifier cup",
    "ofcQualifierCup",
  ],
  conmebolAccessCup: [
    "conmebol access cup",
    "conmebolAccessCup",
  ],

  // Youth Trophies (Troféus Juvenis)
  youthLeague: [
    "youth league",
    "youthLeague",
    "liga juvenil",
    "sub-20",
    "primavera",
    "u21",
    "u19",
    "trophy.youthLeague",
    "events.trophy.wonYouth",
  ],
  youthCup: [
    "youth cup",
    "youthCup",
    "copa juvenil",
    "english youth cup",
    "spanish youth cup",
    "french youth cup",
    "trophy.youthCup",
  ],
  youthContinental: [
    "european youth league",
    "youthContinental",
    "youth champions",
    "trophy.youthContinental",
  ],
  youthSpecialTournament: [
    "copinha",
    "são paulo youth cup",
    "sao paulo youth cup",
    "youthSpecialTournament",
    "youth projection tournament",
    "trophy.youthSpecialTournament",
  ],

  // Nacionais (Genéricos por último)
  stateCup: [
    "state championship",
    "campeonato estadual",
    "carioca",
    "paulista",
    "stateCup",
  ],
  league: [
    "league title",
    "liga",
    "championship",
    "brazilian league",
    "english league",
    "spanish league",
    "italian league",
    "german league",
    "french league",
    "league",
    "events.trophy.league",
  ],
  continentalCup: [
    "continental cup",
    "events.trophy.continental",
    "continentalCup",
  ],
  nationsLeague: [
    "nations league",
    "nationsLeague",
    "events.trophy.nationsLeague",
  ],
  cup: [
    "domestic cup",
    "brazilian cup",
    "english cup",
    "spanish cup",
    "german cup",
    "french cup",
    "cup",
    "events.trophy.cup",
  ],
};

const AWARD_PATTERNS: Record<string, string[]> = {
  ballonDor: [
    "ballon d'or",
    "ballondor",
    "ballon_dor_win",
    "events.award.ballonDor",
  ],
  worldPlayerAward: [
    "world player",
    "best player",
    "player of the year",
    "fifa best",
    "events.award.worldPlayer",
  ],
  topScorerAward: [
    "top scorer",
    "golden boot",
    "artilheiro",
    "events.award.goldenBoot",
    "golden_boot_win",
  ],
  bestGoalkeeperAward: [
    "best goalkeeper",
    "golden glove",
    "melhor goleiro",
    "events.award.goldenGlove",
    "golden_glove_win",
  ],
  youngPlayerAward: [
    "young player",
    "golden boy",
    "jovem",
    "events.award.goldenBoy",
    "golden_boy_win",
  ],
  teamOfTheYear: [
    "team of the year",
    "toty",
    "seleção do ano",
    "events.award.teamOfTheYear",
    "team_of_the_year_win",
  ],
  continentalTopScorer: [
    "continental top scorer",
    "golden shoe",
    "artilheiro continental",
    "events.award.continentalCompTopScorer",
  ],
  goalOfTheYear: [
    "goal of the year",
    "puskas",
    "gol do ano",
    "events.award.goalOfTheYear",
  ],
  continentalPlayerAward: [
    "continental player",
    "ucl player",
    "champions league player",
    "events.award.continentalPOTY",
  ],
  worldCupBestPlayer: [
    "world cup best player",
    "golden ball",
    "melhor da copa",
    "events.award.worldCupBestPlayer",
  ],
  continentalCupPOTY: [
    "continental cup player",
    "events.award.continentalCupPOTY",
  ],
  leaguePlayerOfYear: [
    "league player",
    "league mvp",
    "events.award.leaguePOTY",
  ],
  worldCupBestGoalkeeper: [
    "world cup goalkeeper",
    "world cup golden glove",
    "events.award.worldCupBestGoalkeeper",
  ],
  continentalPOTY: ["events.award.continentalPOTY"],
  leagueForwardOfYear: ["events.award.leagueForwardOfYear"],
  leagueMidfielderOfYear: ["events.award.leagueMidfielderOfYear"],
  leagueDefenderOfYear: ["events.award.leagueDefenderOfYear"],
  leagueTopAssister: ["events.award.leagueTopAssister"],
  leagueRookieOfYear: ["events.award.leagueRookieOfYear"],
  comebackPlayerOfYear: ["events.award.comebackPlayerOfYear"],
  worldCupTOTT: ["events.award.worldCupTOTT"],
  continentalTOTT: ["events.award.continentalTOTT"],
  fifaBestAward: ["events.award.fifaBest", "fifa_best_win"],
  cupTopScorer: ["events.award.cupTopScorer"],
  continentalCompetitionTopScorer: [
    "events.award.continentalCompetitionTopScorer",
  ],
};

const TROPHY_IMPORTANCE: Record<keyof Trophies, number> = {
  worldCup: 10,
  nationsLeague: 8, // Nations League for national teams
  championsLeague: 9,
  libertadores: 9,
  fifaClubWorldCup: 8,
  clubWorldCup: 8,
  intercontinentalCup: 8,
  americasDerby: 7, // Clássico Intercontinental das Américas
  challengerCup: 7, // Copa Challenger Intercontinental

  league: 7,
  europaLeague: 6,
  afcChampionsLeague: 6,
  cafChampionsLeague: 6,
  concacafChampionsCup: 6,
  ofcChampionsLeague: 5,
  copaSudamericana: 5,
  conferenceLeague: 5,
  cafConfederationCup: 5,
  afcCup: 5,
  concacafLeague: 5,
  ofcCup: 4,
  cup: 4,
  recopaSudamericana: 4,
  cafAccessCup: 3,
  afcChallengeCup: 3,
  concacafShield: 3,
  ofcQualifierCup: 3,
  conmebolAccessCup: 3,
  superCup: 3,
  supercopaBrasil: 3,
  stateCup: 2,
  continentalCup: 0,
  // Youth Trophies
  youthLeague: 2,
  youthCup: 2,
  youthContinental: 3,
  youthSpecialTournament: 2,
};

const CONTINENTAL_TROPHIES: (keyof Trophies)[] = [
  "championsLeague",
  "europaLeague",
  "conferenceLeague",
  "libertadores",
  "copaSudamericana",
  "recopaSudamericana",
  "afcChampionsLeague",
  "cafChampionsLeague",
  "concacafChampionsCup",
  "ofcChampionsLeague",
  "afcCup",
  "cafConfederationCup",
  "concacafLeague",
  "ofcCup",
  "conmebolAccessCup",
  "cafAccessCup",
  "afcChallengeCup",
  "concacafShield",
  "ofcQualifierCup",
  "clubWorldCup",
  "fifaClubWorldCup",
  "intercontinentalCup",
  "continentalCup",
];

const DOMESTIC_TROPHIES: (keyof Trophies)[] = [
  "league",
  "cup",
  "superCup",
  "stateCup",
  "supercopaBrasil",
  "continentalCup",
];

const INTERNATIONAL_TROPHIES: (keyof Trophies)[] = [
  "worldCup",
  "continentalCup",
  "nationsLeague",
];

// Helper function to get trophy configuration based on type
const getTrophyConfig = (
  key: keyof Trophies,
): { icon: string; color: string } => {
  // World Cups (Mundial) - Globe icon with gold/yellow colors
  if (key === "worldCup") {
    return {
      icon: "GlobeHemisphereWest", // Represents the world
      color: "text-yellow-400", // Gold color
    };
  }

  // Continental Championships (Champions League / Libertadores / AFC etc.) - Star icons with blue colors
  if (
    key === "championsLeague" ||
    key === "europaLeague" ||
    key === "conferenceLeague" ||
    key === "libertadores" ||
    key === "copaSudamericana" ||
    key === "recopaSudamericana" ||
    key === "afcChampionsLeague" ||
    key === "cafChampionsLeague" ||
    key === "concacafChampionsCup" ||
    key === "ofcChampionsLeague" ||
    key === "afcCup" ||
    key === "cafConfederationCup" ||
    key === "concacafLeague" ||
    key === "ofcCup" ||
    key === "conmebolAccessCup" ||
    key === "cafAccessCup" ||
    key === "afcChallengeCup" ||
    key === "concacafShield" ||
    key === "ofcQualifierCup" ||
    key === "clubWorldCup" ||
    key === "fifaClubWorldCup" ||
    key === "intercontinentalCup" ||
    key === "americasDerby" ||
    key === "challengerCup"
  ) {
    return {
      icon: "Star", // Represents elite status
      color: "text-blue-400", // Blue color
    };
  }

  // National Leagues (Ligas) - Shield icons with green colors
  if (key === "league") {
    return {
      icon: "ShieldChevron", // Looks like a league badge
      color: "text-emerald-400", // Green color
    };
  }

  // Domestic Cups (Copas Nacionais) - Trophy icons with bronze/amber colors
  if (key === "cup" || key === "superCup" || key === "supercopaBrasil" || key === "stateCup") {
    return {
      icon: "Trophy", // Classic cup trophy
      color: "text-amber-600", // Bronze/Orange color
    };
  }

  // Youth Trophies - Special icons for youth achievements
  if (key === "youthLeague" || key === "youthCup" || key === "youthContinental" || key === "youthSpecialTournament") {
    return {
      icon: "GraduationCap",
      color: "text-cyan-400",
    };
  }

  // Default fallback
  return {
    icon: "Trophy",
    color: "text-slate-400",
  };
};


const getTrophyStyle = (
  key: keyof Trophies,
): { bg: string; border: string; icon: string; color: string } => {
  // World Cups (Mundial) - Globe icon with gold/yellow colors
  if (key === "worldCup" || key === "fifaClubWorldCup" || key === "clubWorldCup") {
    return {
      bg: "bg-yellow-600/20",
      border: "border-yellow-600/50",
      icon: "GlobeHemisphereWest",
      color: "text-yellow-400",
    };
  }

  // Continental Championships (Champions League / Libertadores / AFC etc.) - Star icons with blue colors
  if (CONTINENTAL_TROPHIES.includes(key)) {
    return {
      bg: "bg-blue-600/20",
      border: "border-blue-600/50",
      icon: "Star",
      color: "text-blue-400",
    };
  }

  // National Leagues (Ligas) - Shield icons with green colors
  if (key === "league") {
    return {
      bg: "bg-emerald-600/20",
      border: "border-emerald-600/50",
      icon: "ShieldChevron",
      color: "text-emerald-400",
    };
  }

  // Domestic Cups (Copas Nacionais) - Trophy icons with bronze/amber colors
  // Exclude "league" as it's handled separately above
  const DOMESTIC_CUPS: (keyof Trophies)[] = ["cup", "superCup", "stateCup", "supercopaBrasil", "continentalCup"];
  if (DOMESTIC_CUPS.includes(key)) {
    return {
      bg: "bg-amber-600/20",
      border: "border-amber-600/50",
      icon: "Trophy",
      color: "text-amber-600",
    };
  }

  // Youth trophies - Graduation cap icons with teal colors
  if (key.includes("youth")) {
    return {
      bg: "bg-teal-600/20",
      border: "border-teal-600/50",
      icon: "GraduationCap",
      color: "text-teal-400",
    };
  }

  // Default fallback
  return {
    bg: "bg-slate-600/20",
    border: "border-slate-600/50",
    icon: "Trophy",
    color: "text-slate-400",
  };
};

const getTrophyName = (
  key: keyof Trophies,
  t: (k: string) => string,
): string => {
  return t(`trophiesSection.${key}`) || t(`trophy.${key}`) || String(key);
};

const getAwardStyle = (key: keyof Awards): { icon: string; color: string } => {
  // Individual Awards (Best Player/Scorer) - Use Medal or SoccerBall
  const styles: Record<keyof Awards, { icon: string; color: string }> = {
    worldPlayerAward: { icon: "Medal", color: "text-purple-400" },
    topScorerAward: { icon: "SoccerBall", color: "text-purple-400" },
    bestGoalkeeperAward: {
      icon: "Medal",
      color: "text-purple-400",
    },
    youngPlayerAward: { icon: "Medal", color: "text-purple-400" },
    teamOfTheYear: {
      icon: "Medal",
      color: "text-purple-400",
    },
    continentalTopScorer: {
      icon: "Footprints",
      color: "text-amber-300",
    },
    goalOfTheYear: { icon: "Zap", color: "text-red-400" },
    continentalPlayerAward: {
      icon: "Award",
      color: "text-blue-400",
    },
    worldCupBestPlayer: { icon: "Globe", color: "text-green-400" },
    continentalCupPOTY: { icon: "Medal", color: "text-cyan-400" },
    leaguePlayerOfYear: {
      icon: "BadgeCheck",
      color: "text-purple-500",
    },
    worldCupBestGoalkeeper: {
      icon: "Handshake",
      color: "text-cyan-500",
    },
    continentalPOTY: { icon: "Award", color: "text-slate-400" },
    leagueForwardOfYear: { icon: "Award", color: "text-slate-400" },
    leagueMidfielderOfYear: {
      icon: "Award",
      color: "text-slate-400",
    },
    leagueDefenderOfYear: {
      icon: "Award",
      color: "text-slate-400",
    },
    leagueTopAssister: { icon: "Award", color: "text-slate-400" },
    leagueRookieOfYear: { icon: "Award", color: "text-slate-400" },
    comebackPlayerOfYear: {
      icon: "Award",
      color: "text-slate-400",
    },
    worldCupTOTT: { icon: "Award", color: "text-slate-400" },
    continentalTOTT: { icon: "Award", color: "text-slate-400" },
    fifaBestAward: { icon: "Award", color: "text-slate-400" },
    cupTopScorer: { icon: "Award", color: "text-slate-400" },
    continentalCompetitionTopScorer: {
      icon: "Award",
      color: "text-slate-400",
    },
    ballonDor: { icon: "Trophy", color: "text-yellow-400" },
    leagueTitles: { icon: "Trophy", color: "text-emerald-400" },
    continentalTitles: { icon: "Globe", color: "text-blue-400" },
    worldCups: { icon: "Globe", color: "text-yellow-500" },
  };
  return styles[key] || { icon: "Award", color: "text-slate-400" };
};

const getAwardName = (key: keyof Awards, t: (k: string) => string): string => {
  const map: Record<keyof Awards, string> = {
    worldPlayerAward: "awardsSection.worldPlayerAward",
    topScorerAward: "awardsSection.topScorerAward",
    bestGoalkeeperAward: "awardsSection.bestGoalkeeperAward",
    youngPlayerAward: "awardsSection.youngPlayerAward",
    teamOfTheYear: "awardsSection.teamOfTheYear",
    continentalTopScorer: "awardsSection.continentalTopScorer",
    goalOfTheYear: "awardsSection.goalOfTheYear",
    continentalPlayerAward: "awardsSection.continentalPlayerAward",
    worldCupBestPlayer: "awardsSection.worldCupBestPlayer",
    continentalCupPOTY: "awardsSection.continentalCupPOTY",
    leaguePlayerOfYear: "awardsSection.leaguePlayerOfYear",
    worldCupBestGoalkeeper: "awardsSection.worldCupBestGoalkeeper",
    continentalPOTY: "awardsSection.continentalPOTY",
    leagueForwardOfYear: "awardsSection.leagueForwardOfYear",
    leagueMidfielderOfYear: "awardsSection.leagueMidfielderOfYear",
    leagueDefenderOfYear: "awardsSection.leagueDefenderOfYear",
    leagueTopAssister: "awardsSection.leagueTopAssister",
    leagueRookieOfYear: "awardsSection.leagueRookieOfYear",
    comebackPlayerOfYear: "awardsSection.comebackPlayerOfYear",
    worldCupTOTT: "awardsSection.worldCupTOTT",
    continentalTOTT: "awardsSection.continentalTOTT",
    fifaBestAward: "awardsSection.fifaBestAward",
    cupTopScorer: "awardsSection.cupTopScorer",
    continentalCompetitionTopScorer:
      "awardsSection.continentalCompetitionTopScorer",
    ballonDor: "awardsSection.ballonDor",
    leagueTitles: "awardsSection.leagueTitles",
    continentalTitles: "awardsSection.continentalTitles",
    worldCups: "awardsSection.worldCups",
  };
  const translationKey = map[key];
  if (!translationKey) return String(key);
  return t(translationKey) || String(key);
};

// Função auxiliar para calcular idade em uma temporada específica
const calculateAgeAtSeason = (
  currentAge: number,
  historyLength: number,
  seasonIndex: number,
): number => {
  const age =
    safeNumber(currentAge) -
    (safeNumber(historyLength) - safeNumber(seasonIndex) - 1);
  return age > 0 ? age : 0;
};

// Função auxiliar para verificar se uma descrição corresponde a um padrão
const matchesPattern = (
  description: string | undefined | null,
  patterns: string[],
): boolean => {
  if (!description || !patterns || patterns.length === 0) return false;
  const lowerDesc = description.toLowerCase();
  return patterns.some((pattern) => lowerDesc.includes(pattern.toLowerCase()));
};

const AWARD_GROUPS: Record<string, string[]> = {
  "Top Scorer": [
    "top scorer",
    "golden boot",
    "artilheiro",
    "golden shoe",
    "topscorer",
    "goldenBoot",
    "continentalCompTopScorer",
    "cupTopScorer",
    "cup top scorer",
    "continentalTopScorer",
    "continental top scorer",
    "europeanGoldenShoe",
    "events.award.goldenBoot",
    "events.award.cupTopScorer",
    "events.award.continentalCompetitionTopScorer",
    "events.award.continentalCompTopScorer",
    "events.award.europeanGoldenShoe",
    "events.award.worldCupGoldenBoot",
    "worldCupGoldenBoot",
    "world cup golden boot",
    "artilheiro da copa",
    "artilheiro continental",
  ],
  "Player of the Year": [
    "player of the year",
    "best player",
    "world player",
    "melhor do mundo",
    "mvp",
    "worldPlayer",
    "fifaBest",
    "continentalPOTY",
    "leaguePOTY",
    "events.award.ballonDor",
    "events.award.worldPlayer",
    "events.award.fifaBest",
    "events.award.leaguePOTY",
    "events.award.continentalPOTY",
    "events.award.continentalCupPOTY",
  ],
  "Best Goalkeeper": [
    "best goalkeeper",
    "golden glove",
    "melhor goleiro",
    "goldenGlove",
    "bestGoalkeeper",
    "events.award.goldenGlove",
    "events.award.worldCupBestGoalkeeper",
  ],
  "Team of the Year": [
    "team of the year",
    "toty",
    "seleção do ano",
    "teamOfTheYear",
    "worldCupTOTT",
    "continentalTOTT",
    "events.award.teamOfTheYear",
    "events.award.worldCupTOTT",
    "events.award.continentalTOTT",
  ],
  "Young Player": [
    "young player",
    "golden boy",
    "jovem",
    "rookie",
    "events.award.goldenBoy",
    "events.award.rookie",
  ],
  "Goal of the Year": [
    "goal of the year",
    "puskas",
    "gol do ano",
    "events.award.puskas",
    "events.award.goalOfTheYear",
  ],
  "Other Awards": [],
};

// Mapeamento de nomes de grupo para keys de tradução corretas (camelCase)
const GROUP_TRANSLATION_KEYS: Record<string, string> = {
  "Top Scorer": "topScorerAward",
  "Player of the Year": "worldPlayerAward",
  "Best Goalkeeper": "bestGoalkeeperAward",
  "Team of the Year": "teamOfTheYear",
  "Young Player": "youngPlayerAward",
  "Goal of the Year": "goalOfTheYear",
  "Other Awards": "otherAwards",
};

const getAwardGroup = (awardName: string): string => {
  const lowerName = awardName.toLowerCase();
  for (const [group, patterns] of Object.entries(AWARD_GROUPS)) {
    if (patterns.some((p) => lowerName.includes(p.toLowerCase()))) return group;
  }
  return "Other Awards";
};

const TrophyCabinet: React.FC<TrophyCabinetProps> = ({ history, player }) => {
  const { t } = useI18n();
  const [expandedTrophy, setExpandedTrophy] = useState<string | null>(null);
  const [expandedAward, setExpandedAward] = useState<string | null>(null);

  const proHistory = useMemo(() => {
    return history.filter((log) => !log.team?.isYouth);
  }, [history]);

  const wonTrophies = useMemo(() => {
    const counts: Record<string, number> = {};
    
    proHistory.forEach((log) => {
      if (log.trophies) {
        // Use a Set to prevent double counting the same trophy type in a single season
        // (e.g. if both "league" and "trophiesSection.league" exist)
        const seasonTrophies = new Set<string>();

        log.trophies.forEach((trophy) => {
          // Normalize the trophy string to remove prefixes if present
          const normalizedTrophy = trophy
            .replace("trophiesSection.", "")
            .replace("trophy.", "");

          let key: keyof Trophies | undefined;
          for (const [k, patterns] of Object.entries(TROPHY_PATTERNS)) {
            if (patterns.some((p) => normalizedTrophy.toLowerCase().includes(p.toLowerCase()))) {
              key = k as keyof Trophies;
              break;
            }
          }

          if (key && !seasonTrophies.has(key)) {
            counts[key] = (counts[key] || 0) + 1;
            seasonTrophies.add(key);
          }
        });
      }
    });
    
    return Object.entries(counts)
      .map(([key, count]) => ({ key: key as keyof Trophies, count }))
      .sort(
        (a, b) =>
          (TROPHY_IMPORTANCE[b.key] || 0) - (TROPHY_IMPORTANCE[a.key] || 0),
      );
  }, [proHistory]);

  const wonAwards = useMemo(() => {
    const groups: Record<
      string,
      {
        group: string;
        awards: { name: string; count: number; details: any[] }[];
      }
    > = {};

    // Flatten all awards
    const allAwards: {
      name: string;
      season: string;
      club: string;
      stats?: any;
    }[] = [];
    
    proHistory.forEach((log) => {
      if (log.awards) {
        log.awards.forEach((award) => {
          const awardName = typeof award === "string" ? award : award.name;
          
          // Para prêmios de Copa do Mundo, mostrar nacionalidade em vez de clube
          const isWorldCupAward = awardName.toLowerCase().includes("world cup") ||
            awardName.toLowerCase().includes("copa do mundo") ||
            awardName.includes("worldCupBestPlayer") ||
            awardName.includes("worldCupBestGoalkeeper") ||
            awardName.includes("worldCupTOTT");
            
          const displayClub = isWorldCupAward
            ? translateNationality(t, player.nationality)
            : log.team?.name || "";

          if (typeof award === "string") {
            allAwards.push({
              name: award,
              season: log.season,
              club: displayClub,
            });
          } else {
            allAwards.push({
              name: award.name,
              season: log.season,
              club: displayClub,
              stats: award.stats,
            });
          }
        });
      }
    });

    // Group them
    allAwards.forEach((award) => {
      const groupName = getAwardGroup(award.name);
      if (!groups[groupName]) {
        groups[groupName] = { group: groupName, awards: [] };
      }

      const existingAward = groups[groupName].awards.find(
        (a) => a.name === award.name,
      );
      if (existingAward) {
        existingAward.count++;
        existingAward.details.push({
          season: award.season,
          club: award.club,
          stats: award.stats,
        });
      } else {
        groups[groupName].awards.push({
          name: award.name,
          count: 1,
          details: [{
            season: award.season,
            club: award.club,
            stats: award.stats,
          }],
        });
      }
    });

    return Object.values(groups);
  }, [proHistory, player, t]);

  const totalTrophies = wonTrophies.reduce((sum, t) => sum + t.count, 0);
  const totalAwards = wonAwards.reduce(
    (sum, g) => sum + g.awards.reduce((s, a) => s + a.count, 0),
    0,
  );

  const continentalCount = wonTrophies
    .filter((t) => CONTINENTAL_TROPHIES.includes(t.key))
    .reduce((sum, t) => sum + t.count, 0);
  const domesticCount = wonTrophies
    .filter((t) => DOMESTIC_TROPHIES.includes(t.key))
    .reduce((sum, t) => sum + t.count, 0);
  const internationalCount = wonTrophies
    .filter((t) => INTERNATIONAL_TROPHIES.includes(t.key))
    .reduce((sum, t) => sum + t.count, 0);

  const toggleTrophy = (key: string) => {
    setExpandedTrophy((prev) => (prev === key ? null : key));
  };

  const toggleAward = (key: string) => {
    setExpandedAward((prev) => (prev === key ? null : key));
  };

  const getTrophyDetails = (key: string): TrophyDetail[] => {
    const details: TrophyDetail[] = [];
    const patterns = TROPHY_PATTERNS[key as keyof Trophies];

    // Get all keys that have higher priority (appear before the current key in TROPHY_PATTERNS)
    const allKeys = Object.keys(TROPHY_PATTERNS) as (keyof Trophies)[];
    const currentIndex = allKeys.indexOf(key as keyof Trophies);
    const higherPriorityKeys = allKeys.slice(0, currentIndex);

    // Check if this is an international (national team) trophy
    const isNationalTeamTrophy = INTERNATIONAL_TROPHIES.includes(
      key as keyof Trophies,
    );

    proHistory.forEach((log) => {
      if (log.trophies) {
        log.trophies.forEach((trophy) => {
          // Check if it matches the current key's patterns
          if (patterns.some((p) => trophy.toLowerCase().includes(p.toLowerCase()))) {
            // CRITICAL: Ensure it doesn't match any higher priority key
            // This prevents "Champions League" from showing up in "League" details
            const matchesHigherPriority = higherPriorityKeys.some((highKey) =>
              TROPHY_PATTERNS[highKey].some((p) => trophy.toLowerCase().includes(p.toLowerCase())),
            );

            if (!matchesHigherPriority) {
              details.push({
                season: log.season,
                // For national team trophies (World Cup, Continental Cup), show nationality instead of club
                club: isNationalTeamTrophy
                  ? translateNationality(t, player.nationality)
                  : log.team?.name || "",
                competition: trophy,
              });
            }
          }
        });
      }
    });
    return details;
  };

  const getAwardDetails = (groupName: string) => {
    const group = wonAwards.find((g) => g.group === groupName);
    return group ? group.awards : [];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <div className="text-center">
            <Icon name="Trophy" size={28} variant="solid" className="text-amber-400 mb-2" />
            <div className="text-3xl font-bold text-white">{totalTrophies}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              {t("dashboard.trophies")}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <div className="text-center">
            <Icon name="Medal" size={28} variant="solid" className="text-purple-400 mb-2" />
            <div className="text-3xl font-bold text-white">{totalAwards}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              {t("dashboard.awards")}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-bold text-blue-400">
              {continentalCount}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              {t("history.continental")}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">
              {domesticCount}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              {t("history.domestic")}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">
              {internationalCount}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              {t("history.international")}
            </div>
          </div>
        </div>
      </div>

      {/* Trophies List */}
      {wonTrophies.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-900/50 to-slate-800/50 px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Icon name="Trophy" size={16} variant="solid" />
              {t("dashboard.trophies")}
            </h3>
          </div>

          <div className="divide-y divide-slate-700/30">
            {wonTrophies.map((trophy) => {
              const style = getTrophyStyle(trophy.key);
              const isExpanded = expandedTrophy === trophy.key;
              const details = isExpanded ? getTrophyDetails(trophy.key) : [];

              return (
                <div key={trophy.key}>
                  <button
                    onClick={() => toggleTrophy(trophy.key)}
                    className="bg-slate-800/30 p-4 hover:bg-slate-700/30 transition-all duration-200 w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} border ${style.border} group-hover:scale-105 transition-transform duration-200`}
                      >
                        <Icon
                          name={style.icon}
                          size={20}
                          strokeColor={style.color}
                          fillColor={`${style.color.replace("text-", "fill-")}/20`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm">
                          {getTrophyName(trophy.key, t)}
                        </h4>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {i18nTimes(t, trophy.count)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div className={`text-2xl font-bold ${style.color}`}>
                          x{trophy.count}
                        </div>
                        <Icon 
                          name={isExpanded ? "ChevronDown" : "ChevronRight"} 
                          size={14} 
                          className="text-slate-400 transition-transform" 
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-slate-900/50 p-4 space-y-2 animate-fade-in">
                      {details.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                          {details.map((detail, index) => (
                            <div
                              key={`${detail.season}-${detail.club}-${index}`}
                              className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${style.bg}`}
                                  >
                                    <Icon
                                      name={style.icon}
                                      size={14}
                                      strokeColor={style.color}
                                      fillColor={`${style.color.replace("text-", "fill-")}/20`}
                                    />
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-white text-sm">
                                      {detail.club}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-slate-400 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">
                                        {detail.season}
                                      </span>
                                      <span
                                        className={`text-xs font-medium ${style.color}`}
                                      >
                                        {t(
                                          `trophiesSection.${detail.competition}`,
                                        ) ||
                                          t(
                                            getCompetitionTranslationKey(
                                              detail.competition,
                                            ),
                                          ) ||
                                          detail.competition}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          <Icon name="Search" size={24} className="mb-2 mx-auto" />
                          <p>
                            {t("common.detailsNotAvailable")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Awards List */}
      {wonAwards.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-900/50 to-slate-800/50 px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Icon name="Medal" size={16} variant="solid" />
              {t("dashboard.awards")}
            </h3>
          </div>

          <div className="divide-y divide-slate-700/30">
            {wonAwards.map((group) => {
              const isExpanded = expandedAward === group.group;
              const details = isExpanded ? getAwardDetails(group.group) : [];
              const totalCount = group.awards.reduce(
                (sum, a) => sum + a.count,
                0,
              );

              return (
                <div key={group.group}>
                  <button
                    onClick={() => toggleAward(group.group)}
                    className="bg-slate-800/30 p-4 hover:bg-slate-700/30 transition-colors w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon 
                          name="Medal" 
                          size={20} 
                          variant="solid" 
                          className="text-purple-400" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm">
                          {t(
                            `awardsSection.${GROUP_TRANSLATION_KEYS[group.group] || group.group.replace(/ /g, "")}`,
                          ) || group.group}
                        </h4>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {i18nTimes(t, totalCount)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div className="text-2xl font-bold text-purple-400">
                          x{totalCount}
                        </div>
                        <Icon 
                          name={isExpanded ? "ChevronDown" : "ChevronRight"} 
                          size={14} 
                          className="text-slate-400 transition-transform" 
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-slate-900/50 p-4 space-y-2 animate-fade-in">
                      {details.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                          {details.map((awardDetail, index) => (
                            <div
                              key={`${awardDetail.name}-${index}`}
                              className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <Icon 
                                      name="Medal" 
                                      size={14} 
                                      variant="solid" 
                                      className="text-purple-400" 
                                    />
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-white text-sm">
                                      {t(awardDetail.name) || awardDetail.name}
                                    </h5>
                                    <div className="flex flex-col gap-1 mt-1">
                                      {awardDetail.details.map(
                                        (d: any, i: number) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2 text-xs"
                                          >
                                            <span className="text-slate-400 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">
                                              {d.season}
                                            </span>
                                            <span className="text-slate-300">
                                              {d.club}
                                            </span>
                                            {d.stats && (
                                              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
                                                {d.stats.goals && (
                                                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                    <Icon name="CircleDot" size={10} />
                                                    {d.stats.goals}
                                                  </span>
                                                )}
                                                {d.stats.assists && (
                                                  <span className="flex items-center gap-1 text-blue-400 font-medium">
                                                    <Icon name="Footprints" size={10} />
                                                    {d.stats.assists}
                                                  </span>
                                                )}
                                                {d.stats.cleanSheets && (
                                                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                                                    <Icon name="Hand" size={10} />
                                                    {d.stats.cleanSheets}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                                  x{awardDetail.count}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          <Icon name="Search" size={24} className="mb-2 mx-auto" />
                          <p>
                            {t("common.detailsNotAvailable")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {wonTrophies.length === 0 && wonAwards.length === 0 && (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 text-center">
          <Icon name="Trophy" size={48} variant="solid" className="text-slate-700 mb-3 mx-auto" />
          <p className="text-slate-400 font-medium">
            {t("trophiesSection.noneYet")}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t("trophiesSection.keepPlaying")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TrophyCabinet;