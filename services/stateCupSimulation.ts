import { Player, Team, CompetitionContext } from "../types";
import { calculateDetailedPerformance } from "./matchLogic";
import { rand, clamp } from "./utils";
import { simulateMatch } from "./match/matchSimulator";
import { LEAGUES } from "../constants/leagues";

/**
 * ============================================================================
 * SISTEMA DE CAMPEONATOS ESTADUAIS BRASILEIROS
 * ============================================================================
 *
 * Simula os principais campeonatos estaduais do Brasil que ocorrem
 * tradicionalmente no início do ano (janeiro a abril) antes do Brasileirão:
 *
 * - Paulistão (São Paulo)
 * - Carioca (Rio de Janeiro)
 * - Mineiro (Minas Gerais)
 * - Gaúcho (Rio Grande do Sul)
 * - Paranaense (Paraná)
 * - Baiano (Bahia)
 * - Pernambucano (Pernambuco)
 * - Cearense (Ceará)
 * - Goiano (Goiás)
 * - Catarinense (Santa Catarina)
 *
 * FORMATO:
 * - Fase de grupos (8-16 times) + Knockout (semifinais + final)
 * - Times participantes são determinados por região baseada no clube
 * - Apenas times brasileiros participam
 *
 * ============================================================================
 */

interface StateCupResult {
  championship: string;
  winner: Team;
  finalist: Team;
  playerStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets: number;
    wonCup: boolean;
  };
}

/**
 * Mapeamento de times para seus respectivos estados
 */
const STATE_MAPPING: { [teamName: string]: string } = {
  // São Paulo
  Palmeiras: "Paulista",
  Corinthians: "Paulista",
  "São Paulo": "Paulista",
  Santos: "Paulista",
  "Red Bull Bragantino": "Paulista",
  "Ponte Preta": "Paulista",
  Guarani: "Paulista",
  Ituano: "Paulista",
  Mirassol: "Paulista",
  Novorizontino: "Paulista",
  "Botafogo-SP": "Paulista",
  "São Bernardo": "Paulista",

  // Rio de Janeiro
  Flamengo: "Carioca",
  Fluminense: "Carioca",
  Botafogo: "Carioca",
  "Vasco da Gama": "Carioca",
  "Volta Redonda": "Carioca",

  // Minas Gerais
  "Atlético Mineiro": "Mineiro",
  Cruzeiro: "Mineiro",
  "América-MG": "Mineiro",
  Tombense: "Mineiro",

  // Rio Grande do Sul
  Grêmio: "Gaúcho",
  Internacional: "Gaúcho",
  Juventude: "Gaúcho",
  Caxias: "Gaúcho",
  Ypiranga: "Gaúcho",

  // Paraná
  "Athletico-PR": "Paranaense",
  Coritiba: "Paranaense",
  "Operário-PR": "Paranaense",
  Londrina: "Paranaense",

  // Bahia
  Bahia: "Baiano",
  Vitória: "Baiano",

  // Pernambuco
  "Sport Recife": "Pernambucano",
  Náutico: "Pernambucano",
  "Santa Cruz": "Pernambucano",

  // Ceará
  Fortaleza: "Cearense",
  Ceará: "Cearense",
  Ferroviário: "Cearense",
  Floresta: "Cearense",

  // Goiás
  "Atlético Goianiense": "Goiano",
  Goiás: "Goiano",
  "Vila Nova": "Goiano",
  Aparecidense: "Goiano",

  // Santa Catarina
  Criciúma: "Catarinense",
  Chapecoense: "Catarinense",
  Avaí: "Catarinense",
  Figueirense: "Catarinense",
  Brusque: "Catarinense",

  // Outros estados (times sem estadual específico mapeado)
  Cuiabá: "Regional",
  Amazonas: "Amazonense",
  Manaus: "Amazonense",
  Paysandu: "Paraense",
  Remo: "Paraense",
  CRB: "Alagoano",
  CSA: "Alagoano",
  "Sampaio Corrêa": "Maranhense",
  "Botafogo-PB": "Paraibano",
  Treze: "Paraibano",
  ABC: "Potiguar",
  Confiança: "Sergipano",
  Brasiliense: "Brasiliense",
  Altos: "Piauiense",
};

/**
 * Times gerados para completar o campeonato estadual
 */
const generateStateTeams = (
  state: string,
  count: number,
  baseReputation: number,
): Team[] => {
  const teams: Team[] = [];
  const stateNames: { [key: string]: string[] } = {
    Paulista: [
      "Água Santa",
      "Inter de Limeira",
      "Portuguesa",
      "São Caetano",
      "Ferroviária",
    ],
    Carioca: ["Bangu", "Madureira", "Portuguesa-RJ", "Olaria", "Nova Iguaçu"],
    Mineiro: [
      "Athletic Club",
      "Poços de Caldas",
      "Democrata",
      "Villa Nova-MG",
      "Patrocinense",
    ],
    Gaúcho: [
      "São José",
      "Brasil de Pelotas",
      "Avenida",
      "São Luiz",
      "Esportivo",
    ],
    Paranaense: [
      "Paraná Clube",
      "FC Cascavel",
      "Rio Branco-PR",
      "Azuriz",
      "Maringá",
    ],
    Baiano: [
      "Jacuipense",
      "Juazeirense",
      "Atlético Alagoinhas",
      "Fluminense de Feira",
      "Barcelona de Ilhéus",
    ],
    Pernambucano: ["Afogados", "Retrô", "Decisão", "Central", "Petrolina"],
    Cearense: [
      "Caucaia",
      "Atlético Cearense",
      "Horizonte",
      "Maracanã",
      "Iguatu",
    ],
    Goiano: ["Goiânia", "Anápolis", "Grêmio Anápolis", "Inhumas", "Morrinhos"],
    Catarinense: [
      "Hercílio Luz",
      "Marcílio Dias",
      "Joinville",
      "Metropolitano",
      "Criciúma B",
    ],
    Regional: [
      "Local FC",
      "Regional SC",
      "Estado EC",
      "Município FC",
      "Província SC",
    ],
  };

  const names = stateNames[state] || stateNames["Regional"];

  for (let i = 0; i < Math.min(count, names.length); i++) {
    teams.push({
      id: `state_${state}_${i}`,
      name: names[i],
      country: "Brazil",
      leagueTier: 3,
      reputation: baseReputation + rand(-5, 5),
      isYouth: false,
      squadStrength: undefined,
    });
  }

  return teams;
};

/**
 * Determina qual campeonato estadual o time participa
 */
export const getStateCup = (team: Team): string | null => {
  if (team.country !== "Brazil") return null;
  return STATE_MAPPING[team.name] || null;
};

/**
 * Obtém os times participantes de um campeonato estadual
 */
const getStateCupTeams = (championship: string, playerTeam: Team): Team[] => {
  const teams: Team[] = [];

  // Adicionar times reais que participam do estadual
  const allBrazilianTeams = Object.values(
    LEAGUES["Brazil"]?.divisions || {},
  ).flat();
  const stateTeams = allBrazilianTeams
    .filter((t) => STATE_MAPPING[t.name] === championship)
    .map((t) => ({
      id: `${t.name.toLowerCase().replace(/\s/g, "-")}-${t.leagueTier}`,
      name: t.name,
      country: t.country,
      leagueTier: t.leagueTier,
      reputation: t.reputation,
      isYouth: t.isYouth,
      squadStrength: undefined,
    }));

  teams.push(...stateTeams.slice(0, 12)); // Até 12 times reais

  // Garantir que o time do jogador está
  if (!teams.find((t) => t.name === playerTeam.name)) {
    teams.unshift(playerTeam);
  }

  // Completar com times gerados se necessário
  const needed = 12 - teams.length;
  if (needed > 0) {
    const fillerTeams = generateStateTeams(championship, needed, 65);
    teams.push(...fillerTeams);
  }

  return teams.slice(0, 12);
};

/**
 * Simula uma partida de campeonato estadual
 */
// Local simulateStateMatch removed in favor of centralized service

/**
 * Simula o torneio estadual completo
 * Formato: Fase de grupos (rodada única) + Semifinais + Final
 */
const simulateStateTournament = (
  teams: Team[],
  playerTeam: Team,
): { winner: Team; finalist: Team } => {
  // Fase de grupos simulada de forma simplificada (classificam os 4 melhores)
  const standings = teams.map((team) => ({
    team,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }));

  // Simular jogos da fase de grupos (cada time joga contra todos)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      const result = simulateMatch(team1, team2, [], [], {
        isNeutralVenue: true,
      });

      const idx1 = standings.findIndex((s) => s.team.name === team1.name);
      const idx2 = standings.findIndex((s) => s.team.name === team2.name);

      standings[idx1].points += result.homePoints;
      standings[idx2].points += result.awayPoints;
      standings[idx1].goalsFor += result.homeGoals;
      standings[idx1].goalsAgainst += result.awayGoals;
      standings[idx2].goalsFor += result.awayGoals;
      standings[idx2].goalsAgainst += result.homeGoals;
    }
  }

  // Ordenar por pontos e pegar top 4 para semifinais
  standings.sort((a, b) => b.points - a.points);

  // Garantir que o time do jogador esteja nas semifinais se tiver desempenho razoável
  const playerStanding = standings.find((s) => s.team.name === playerTeam.name);
  const playerInTop4 = standings
    .slice(0, 4)
    .some((s) => s.team.name === playerTeam.name);

  let semifinalists = standings.slice(0, 4).map((s) => s.team);

  if (
    !playerInTop4 &&
    playerStanding &&
    playerStanding.points >= standings[4]?.points * 0.7
  ) {
    // Se o jogador não está no top 4 mas teve bom desempenho, coloca nas semis
    semifinalists[3] = playerTeam;
  }

  // Semifinais
  const finalist1 = simulateMatch(semifinalists[0], semifinalists[3], [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
  }).winner!;
  const finalist2 = simulateMatch(semifinalists[1], semifinalists[2], [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
  }).winner!;

  // Final
  const winner = simulateMatch(finalist1, finalist2, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
  }).winner!;
  const finalist = finalist1.name === winner.name ? finalist2 : finalist1;

  return { winner, finalist };
};

/**
 * Simula a performance do jogador no campeonato estadual
 */
const simulatePlayerStatePerformance = async (
  player: Player,
  teams: Team[],
  winner: Team,
  finalist: Team,
): Promise<StateCupResult["playerStats"]> => {
  const wonCup = winner.name === player.team.name;
  const reachedFinal = wonCup || finalist.name === player.team.name;

  // Número de partidas (fase de grupos + playoffs)
  // Mínimo 11 jogos (fase de grupos), máximo 13 (fase de grupos + semi + final)
  const matchesPlayed = reachedFinal
    ? 11 + 2
    : 11 + (Math.random() < 0.5 ? 1 : 0);

  // Gerar performance base usando o novo sistema de matchLogic
  const basePerformance = calculateDetailedPerformance(
    player,
    matchesPlayed,
    1.0, // performance modifier padrão
    "Balanced", // tática padrão
  );

  const goals = basePerformance.goals;
  const assists = basePerformance.assists;

  // Calcular rating médio das partidas
  const totalRating = basePerformance.matchLogs.reduce(
    (sum, log) => sum + log.rating,
    0,
  );
  const rating = matchesPlayed > 0 ? totalRating / matchesPlayed : 6.5;

  const cleanSheets = basePerformance.cleanSheets;

  return {
    matchesPlayed,
    goals,
    assists,
    rating: wonCup ? Math.min(rating + 0.2, 10.0) : rating,
    cleanSheets,
    wonCup,
  };
};

/**
 * Simula uma temporada de campeonato estadual completa
 */
export const simulateStateCup = async (
  player: Player,
): Promise<StateCupResult | null> => {
  // Verificar se o time é brasileiro e tem campeonato estadual
  const championship = getStateCup(player.team);
  if (!championship) return null;

  const teams = getStateCupTeams(championship, player.team);
  const { winner, finalist } = simulateStateTournament(teams, player.team);

  const playerStats = await simulatePlayerStatePerformance(
    player,
    teams,
    winner,
    finalist,
  );

  return {
    championship,
    winner,
    finalist,
    playerStats,
  };
};
