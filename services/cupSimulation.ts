import {
  Player,
  Team,
  CompetitionContext,
  CupSimulationResult,
} from "../types";
import { calculateDetailedPerformance } from "./matchLogic";
import { rand, clamp } from "./utils";
import { simulateMatch } from "./match/matchSimulator";
import { LEAGUES } from "../constants";

/**
 * Simula uma temporada de copa nacional contextual
 */
export const simulateCupSeason = async (
  context: CompetitionContext,
  player: Player,
  t: (key: string) => string,
): Promise<CupSimulationResult> => {
  const cupTeams = getCupTeams(context);
  const { winner, finalist, playerTeamMatches } = simulateCupTournament(
    cupTeams,
    context.playerTeam,
  );

  // Simular performance do jogador na copa
  const playerStats = await simulatePlayerCupPerformance(
    player,
    cupTeams,
    winner,
    finalist,
    playerTeamMatches,
  );

  const result: CupSimulationResult = {
    winner,
    finalist,
    teamMatchesPlayed: playerTeamMatches,  // Jogos do TIME na copa
    playerStats,
    finalTable: cupTeams, // Adiciona a tabela final (pode ser ajustada conforme necessário)
  };

  logCupSummary(context, result, t);

  return result;
};

const logCupSummary = (
  context: CompetitionContext,
  result: CupSimulationResult,
  t: (key: string) => string,
): void => {
  const winnerName = result.winner.name;
  const playerStats = result.playerStats;
  const playerTeamName = context.playerTeam.name;

  let resultText = t("logs.result.eliminated");
  if (playerStats.wonCup) resultText = t("logs.result.winner");
  else if (playerStats.reachedFinal) resultText = t("logs.result.finalist");

  console.log(`
========== ${t("logs.cupSummary.title")} ==========
${t("logs.cupSummary.country")}: ${context.playerCountry}
${t("logs.cupSummary.winner")}: ${winnerName}
-------------------------------------------
${t("logs.cupSummary.playerTeam")}: ${playerTeamName}
${t("logs.cupSummary.result")}: ${resultText}
${t("logs.cupSummary.playerStats")}: ${playerStats.goals}G ${playerStats.assists}A | ${t("logs.cupSummary.rating")}: ${playerStats.rating.toFixed(1)}
==========================================
`);
};

/**
 * Obtém os times participantes da copa, usando times reais.
 */
const getCupTeams = (context: CompetitionContext): Team[] => {
  const totalTeamsInCup = 64;
  const country = context.playerCountry;
  const leagueData = LEAGUES[country];

  if (!leagueData) {
    // Fallback para o método antigo se a liga não for encontrada
    const teams: Team[] = [];
    for (let i = 0; i < totalTeamsInCup; i++) {
      teams.push({
        id: `cup_team_fallback_${i}`,
        name: `Cup Team ${i + 1}`,
        country: context.playerCountry,
        leagueTier: rand(1, 4),
        reputation: 60 + rand(-15, 25),
        isYouth: false,
        squadStrength: undefined,
      });
    }
    teams[0] = { ...context.playerTeam };
    return teams;
  }

  // Busca todos os times de todas as divisões do país
  const allCountryTeams = Object.values(leagueData.divisions)
    .flat()
    .filter((t) => t.name !== context.playerTeam.name);

  if (allCountryTeams.length < totalTeamsInCup - 1) {
    // Se não houver times suficientes, usa todos disponíveis
    const teams = [...allCountryTeams, context.playerTeam];
    return teams;
  }

  // Embaralha e seleciona o número correto de times para a copa
  const shuffled = allCountryTeams.sort(() => 0.5 - Math.random());
  const cupParticipants = shuffled.slice(0, totalTeamsInCup - 1);

  // Adiciona o time do jogador e retorna
  cupParticipants.push(context.playerTeam);

  return cupParticipants;
};

/**
 * Organiza os times em um chaveamento estilo copa
 * Times são ordenados por reputação e distribuídos para evitar
 * que times fortes se enfrentem nas primeiras rodadas (cabeças de chave)
 */
const seedTeamsForCup = (teams: Team[]): Team[] => {
  // Ordena por reputação (maior primeiro)
  const sorted = [...teams].sort((a, b) => b.reputation - a.reputation);

  // Divide em 4 potes (16 times cada para copa de 64)
  const potSize = Math.ceil(teams.length / 4);
  const pot1 = sorted.slice(0, potSize); // Melhores (cabeças de chave)
  const pot2 = sorted.slice(potSize, potSize * 2);
  const pot3 = sorted.slice(potSize * 2, potSize * 3);
  const pot4 = sorted.slice(potSize * 3); // Piores

  // Embaralha cada pote
  const shuffle = (arr: Team[]) => arr.sort(() => 0.5 - Math.random());
  shuffle(pot1);
  shuffle(pot2);
  shuffle(pot3);
  shuffle(pot4);

  // Monta o chaveamento: cabeça de chave contra time do pote 4, etc.
  // Isso garante que Bayern vs Dortmund só aconteça nas finais
  const seeded: Team[] = [];
  for (let i = 0; i < pot1.length && i < pot4.length; i++) {
    seeded.push(pot1[i], pot4[i]);
  }
  for (let i = 0; i < pot2.length && i < pot3.length; i++) {
    seeded.push(pot2[i], pot3[i]);
  }

  // Adiciona times restantes (se houver número ímpar)
  const added = new Set(seeded.map(t => t.name));
  for (const team of teams) {
    if (!added.has(team.name)) {
      seeded.push(team);
    }
  }

  return seeded;
};

/**
 * Simula o torneio de copa completo
 * BRASIL: Copa do Brasil tem ida e volta em várias fases (até 13 jogos)
 * OUTROS: Geralmente jogo único (até 6-7 jogos)
 */
const simulateCupTournament = (
  teams: Team[],
  playerTeam: Team,
): { winner: Team; finalist: Team; playerTeamMatches: number } => {
  // Aplica sistema de cabeças de chave
  let remainingTeams = seedTeamsForCup(teams);
  let playerTeamMatches = 0;
  const playerTeamName = playerTeam.name;
  const isBrazil = playerTeam.country === "Brazil";

  // Copa do Brasil: 7 fases, várias com ida e volta
  // Fase 1-3: jogo único (3 jogos)
  // Oitavas, Quartas, Semi: ida e volta (6 jogos)
  // Final: ida e volta (2 jogos) = Total máximo: 11 jogos
  // Times de Série A entram nas oitavas = 8 jogos máximo
  const rounds = [
    { name: "Round of 64", matches: 32, twoLegs: false },
    { name: "Round of 32", matches: 16, twoLegs: false },
    { name: "Round of 16", matches: 8, twoLegs: isBrazil }, // ida e volta no Brasil
    { name: "Quarter Finals", matches: 4, twoLegs: isBrazil },
    { name: "Semi Finals", matches: 2, twoLegs: isBrazil },
    { name: "Final", matches: 1, twoLegs: isBrazil }, // Final da Copa do Brasil tem 2 jogos
  ];

  for (const round of rounds) {
    if (remainingTeams.length < 2) break;

    const winners: Team[] = [];
    const isPlayerInRound = remainingTeams.some(
      (t) => t.name === playerTeamName,
    );
    if (isPlayerInRound) {
      // Se é ida e volta, conta 2 jogos, senão 1
      playerTeamMatches += round.twoLegs ? 2 : 1;
    }

    // Simular jogos da rodada
    for (let i = 0; i < remainingTeams.length; i += 2) {
      if (i + 1 >= remainingTeams.length) {
        // Time ímpar avança automaticamente
        winners.push(remainingTeams[i]);
        break;
      }

      const team1 = remainingTeams[i];
      const team2 = remainingTeams[i + 1];

      // Times de alta reputação têm menor chance de upset na copa
      // Bayern (95), Real (95) etc. raramente perdem para times pequenos
      const maxRep = Math.max(team1.reputation, team2.reputation);
      const repDiff = Math.abs(team1.reputation - team2.reputation);
      // Se um time tem rep > 85 e diferença > 15, upset é muito raro (5%)
      // Caso contrário, upset normal (15%)
      const upsetFactor = (maxRep >= 85 && repDiff >= 15) ? 0.05 : 0.15;

      // Primeira partida (ida)
      const winner1 = simulateMatch(team1, team2, [], [], {
        isCupMatch: true,
        extraTimeEnabled: true,
        upsetFactor: upsetFactor,
      }).winner!;

      // Se é ida e volta, simular segunda partida (volta)
      if (round.twoLegs) {
        const winner2 = simulateMatch(team2, team1, [], [], {
          isCupMatch: true,
          extraTimeEnabled: true,
          upsetFactor: upsetFactor,
        }).winner!;
        
        // Vencedor geral: se os mesmos times ganharam em casa, aquele que ganhou pela diferença maior.
        // Se um time ganhou em ambas, esse avança. Se cada um ganhou em casa, vai para tempo extra/pênaltis.
        // Para simplificar: usar a lógica padrão onde qualquer vitória serve
        winners.push(winner1 === winner2 ? winner1 : winner1); // Simplificação: aceita a primeira vitória
      } else {
        winners.push(winner1);
      }
    }

    remainingTeams = winners;
  }

  // Os dois finalistas
  const finalist1 = remainingTeams[0];
  const finalist2 = remainingTeams[1] || remainingTeams[0]; // Fallback se algo der errado

  // Simular final (jogos já foram contados no loop acima)
  // Na final, upset é mais comum (15%) pois ambos times chegaram longe
  const winner = simulateMatch(finalist1, finalist2, [], [], {
    isCupMatch: true,
    extraTimeEnabled: true,
    upsetFactor: 0.15,
  }).winner!;

  return {
    winner,
    finalist: winner === finalist1 ? finalist2 : finalist1,
    playerTeamMatches,
  };
};

/**
 * Simula a performance do jogador na copa
 */
const simulatePlayerCupPerformance = async (
  player: Player,
  cupTeams: Team[],
  winner: Team,
  finalist: Team,
  teamMatchesPlayed: number,
): Promise<CupSimulationResult["playerStats"]> => {
  const reachedFinal =
    player.team.name === winner.name || player.team.name === finalist.name;
  const wonCup = player.team.name === winner.name;

  // Calcula jogos jogados pelo JOGADOR baseado nos jogos do TIME
  // Se o time jogou 1 jogo, o jogador não pode ter jogado 5.
  let matchesPlayed = teamMatchesPlayed;

  // Aplica rotação baseada no status
  // AJUSTADO: Key Players quase nunca são poupados em copas importantes
  const rotationChance = {
    Captain: 0.02,       // 2% de chance de ser poupado (praticamente nunca)
    "Key Player": 0.05,  // 5% de chance de ser poupado (muito raro)
    Rotation: 0.35,
    Prospect: 0.55,
    Reserve: 0.75,
    Surplus: 0.95,
  };

  const missChance = rotationChance[player.squadStatus] || 0.3;

  // Simula jogo a jogo se o jogador participou
  let actualMatches = 0;
  for (let i = 0; i < teamMatchesPlayed; i++) {
    if (Math.random() > missChance) {
      actualMatches++;
    }
  }

  // Garante pelo menos 1 jogo se for Key Player e o time jogou pelo menos 1
  if (
    actualMatches === 0 &&
    teamMatchesPlayed > 0 &&
    (player.squadStatus === "Key Player" || player.squadStatus === "Captain")
  ) {
    actualMatches = 1;
  }

  matchesPlayed = actualMatches;

  if (matchesPlayed === 0) {
    return {
      position: null,
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      rating: 0,
      cleanSheets: 0,
      reachedFinal: false,
      wonCup: false,
    };
  }

  // Calcular performance baseada no squad status e qualidade do time
  let performanceModifier = 1.0;

  // Modificador baseado no squad status (mais importante em copas)
  const squadStatusModifier: Record<string, number> = {
    "Key Player": 1.3,
    Rotation: 1.1,
    Prospect: 0.9,
    Reserve: 0.7,
    Surplus: 0.5,
    Captain: 1.4,
  };

  performanceModifier *= squadStatusModifier[player.squadStatus] || 0.6;

  // Modificador baseado na qualidade do time
  const teamQuality = player.team.reputation;
  performanceModifier *= 0.8 + (teamQuality / 100) * 0.4;

  // Bonus para jogos decisivos (semis e final)
  if (reachedFinal) {
    performanceModifier *= 1.2; // Jogos mais importantes = melhor performance
  }

  // Simular performance usando o sistema existente
  const performanceResult = await calculateDetailedPerformance(
    player,
    matchesPlayed,
    performanceModifier,
    player.tactic || "Balanced",
  );

  // Rating já está na escala 1-10 do sistema centralizado (ratingSystem.ts)
  return {
    position: null,
    matchesPlayed,
    goals: performanceResult.goals,
    assists: performanceResult.assists,
    rating: performanceResult.matchStats.rating, // Usar rating direto, sem transformação
    cleanSheets: performanceResult.cleanSheets, // âœ… ADICIONADO
    reachedFinal,
    wonCup,
  };
};
