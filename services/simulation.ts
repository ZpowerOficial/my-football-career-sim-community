import {
  Player,
  Team,
  Tactic,
  CareerLog,
  CareerEvent,
  Position,
  PositionDetail,
  TraitName,
  Agent,
  PlayerStats,
  SeasonStats,
  MatchStats,
  ExtendedMatchStats,
  MatchLog,
  ContextualCompetitionData,
  Trophies,
  Awards,
  CompetitionType,
} from "../types";
import { rand, clamp, randFloat, MORALE_LEVELS, updateMorale } from "./utils";
import {
  calculateOverall,
  calculatePerformanceRating,
  calculateMarginalProgression,
  updatePlayerReputation,
  syncBaseStatsFromExpanded, // Point 7: Sync base stats from expanded attributes
} from "./playerProgression";
import {
  generateInitialPlayerGoals,
  generateDynamicGoals,
  updateGoalsProgress,
} from "./goalLogic";
import {
  getTransferOffers,
  processTransfer,
  processContractRenewal,
} from "./transferLogic";
import { determineSquadStatus } from "./statusLogic";
import { updateSquadStatusBasedOnPerformance } from "./positionStatusLogic";
import { processInjurySystem, processInjuryRecovery } from "./injuryLogic";
import {
  calculateInitialPlayerProfile,
  computeWeeklyWage,
} from "./playerProfileLogic";
import { classifyPlayerStyle, assignPlayerTraits } from "./styleAndTraits";
import { calculateDetailedPerformance } from "./matchLogic";
import {
  calculateMatchesPlayed,
  youthAcademyMatches,
  calculateAvailableMatches,
} from "./match/utils";
import { simulateLeagueTierChanges } from "./leagueLogic";
import { simulateNationalTeamSeason } from "./nationalTeamLogic";
import { simulateAwards, SeasonResults } from "./awardLogic"; // Importar SeasonResults
import { processSeasonEvents } from "./eventLogic";
import {
  checkYouthProgression,
  handlePlayingTime,
  checkRetirement,
  updateMarketValue,
} from "./playerLifecycle";
import { simulateContextualCompetitions } from "./competitionSystem";
import {
  getMainClub,
  getPromotionTarget,
} from "./youthCompetitionSystem";
import { processPhysicalDevelopment } from "./physicalDevelopment";
import {
  calculateAverageMatchRating,
  normalizedToDisplay,
  calculateWeightedCompetitionRating,
} from "./ratingSystem";
import { checkTraitAcquisition, checkTraitRemoval } from "./traitAcquisition";
import { PlayGamesService } from "./playGamesService";
import {
  applySuspensionFromRedCard,
  getDefaultSuspensions,
  checkAndDecrementSuspension,
} from "./suspensionSystem";
import {
  accumulateSeasonHeatmap,
  createEmptyHeatmap,
  accumulateHeatmap,
} from "./heatmapSystem";
import { updateSecondaryPositionProficiency } from "./positionPenalty";
import {
  convertEventsToNews,
  addNewsToPlayer,
  checkMilestoneNews,
} from "./newsService";

import {
  InteractiveEventService,
  generateRandomEvents,
  addEventToPlayer,
} from "./interactiveEventService";

import {
  updateRelationshipsForSeason,
  ensureSocialData,
} from "./socialService";
import { resetSeasonalEventFlags } from "./eventConsequenceSystem";


// ==================== FUNÇÃO PRINCIPAL DE SIMULAÇÃO DA TEMPORADA ====================

export const simulateSeason = async (
  player: Player,
  tactic: Tactic,
  allTeams: Team[],
  t: (key: string) => string,
): Promise<{
  updatedPlayer: Player;
  seasonLog: CareerLog;
  agitatingForTransfer: boolean;
  isForcedToMove: boolean;
  updatedTeams: Team[];
}> => {
  // ... (rest of the function)

  // ========== 1. INICIALIZAÇÃO E SETUP DE PRÉ-TEMPORADA ==========
  const originalPlayerForAwards = { ...player }; // Snapshot do jogador ANTES da temporada para awards
  let updatedPlayer: Player = {
    ...player,
    stats: { ...player.stats },
    trophies: { ...player.trophies },
    awards: { ...player.awards },
    injury: player.injury ? { ...player.injury } : null,
    playerGoals: [...player.playerGoals],
    traits: [...player.traits],
    matchHistory: [...player.matchHistory],
    // v0.5.2: Initialize suspensions for existing saves
    suspensions: player.suspensions || getDefaultSuspensions(),
  };

  // Decrementa duração de contratos e incrementa tempo no clube/idade
  updatedPlayer.contractLength = Math.max(0, updatedPlayer.contractLength - 1);
  updatedPlayer.agentContractLength = Math.max(
    0,
    (updatedPlayer.agentContractLength || 0) - 1,
  );
  updatedPlayer.yearsAtClub++;
  // teamForThisSeason moved to after youth progression

  // O jogador fica com 14 anos por 2 temporadas antes de começar a envelhecer
  // Isso é controlado por um contador interno (seasonsAt14)
  if (updatedPlayer.age === 14) {
    // Incrementa o contador de temporadas com 14 anos
    updatedPlayer.seasonsAt14 = (updatedPlayer.seasonsAt14 || 0) + 1;
    // Só aumenta a idade após 2 temporadas com 14 anos
    if (updatedPlayer.seasonsAt14 >= 2) {
      updatedPlayer.age++;
    }
  } else {
    updatedPlayer.age++;
  }

  // CRITICAL FIX: Capture age AFTER increment so awards/trophies 
  // are recorded with the age the player HAD during the season
  const ageForThisSeason = updatedPlayer.age;

  // Initialize missing trophy keys for existing saves (CRITICAL FIX for trophy duplication/fallback)
  // Initialize missing trophy keys for existing saves (CRITICAL FIX for trophy duplication/fallback)
  // We use a comprehensive list of all possible trophies to ensure none are undefined
  const allTrophies: (keyof Trophies)[] = [
    "league",
    "cup",
    "superCup",
    "stateCup",
    "championsLeague",
    "europaLeague",
    "conferenceLeague",
    "continentalCup",
    "libertadores",
    "copaSudamericana",
    "recopaSudamericana",
    "afcChampionsLeague",
    "afcCup",
    "afcChallengeCup",
    "cafChampionsLeague",
    "cafConfederationCup",
    "cafAccessCup",
    "concacafChampionsCup",
    "concacafLeague",
    "concacafShield",
    "ofcChampionsLeague",
    "ofcCup",
    "ofcQualifierCup",
    "conmebolAccessCup",
    "clubWorldCup",
    "fifaClubWorldCup",
    "intercontinentalCup",
    "worldCup",
  ];

  allTrophies.forEach((key) => {
    if (typeof updatedPlayer.trophies[key] !== "number") {
      updatedPlayer.trophies[key] = 0;
    }
  });

  // Initialize missing award keys for existing saves
  const allAwards: (keyof Awards)[] = [
    "continentalPOTY",
    "leagueForwardOfYear",
    "leagueMidfielderOfYear",
    "leagueDefenderOfYear",
    "leagueTopAssister",
    "leagueRookieOfYear",
    "comebackPlayerOfYear",
    "worldCupTOTT",
    "continentalTOTT",
    "worldPlayerAward",
    "fifaBestAward",
    "topScorerAward",
    "cupTopScorer",
    "continentalCompetitionTopScorer",
    "bestGoalkeeperAward",
    "youngPlayerAward",
    "teamOfTheYear",
    "continentalTopScorer",
    "goalOfTheYear",
    "continentalPlayerAward",
    "worldCupBestPlayer",
    "continentalCupPOTY",
    "leaguePlayerOfYear",
    "worldCupBestGoalkeeper",
    "ballonDor",
    "leagueTitles",
    "continentalTitles",
    "worldCups",
  ];

  allAwards.forEach((key) => {
    if (typeof updatedPlayer.awards[key] !== "number") {
      updatedPlayer.awards[key] = 0;
    }
  });

  if (!updatedPlayer.tactic) {
    updatedPlayer.tactic = "Balanced";
  }

  const seasonEvents: CareerEvent[] = [];
  let agitatingForTransfer = false;
  let isForcedToMove = false;
  let wasSeverelyInjuredLastSeason = player.injury?.type === "Severe";
  let followerGrowthTotal = 0;
  let reputationChangeTotal = 0;

  // ========== 1.1 PROCESS PENDING LOAN RETURN (Start of Season) ==========
  if (updatedPlayer.pendingLoanReturn && updatedPlayer.parentClub) {
    const parentClub = allTeams.find(
      (t) => t.id === updatedPlayer.parentClub!.id,
    );
    if (parentClub) {
      updatedPlayer.team = parentClub;
      updatedPlayer.parentClub = null;
      updatedPlayer.pendingLoanReturn = false;
      updatedPlayer.loanDuration = 0;
      updatedPlayer.yearsAtClub = 0;
      updatedPlayer.squadStatus = determineSquadStatus(updatedPlayer);
      // Garantir que tem contrato válido ao retornar
      if (updatedPlayer.contractLength <= 0) {
        updatedPlayer.contractLength = rand(2, 4);
      }

      seasonEvents.push({
        type: "transfer", // Generic transfer/return event
        description: "events.loan.returnedToClub",
        descriptionParams: { team: updatedPlayer.team.name },
      });
    } else {
      // parentClub não encontrado na lista - tentar buscar por nome
      const parentClubByName = allTeams.find(
        (t) => t.name === updatedPlayer.parentClub!.name,
      );
      if (parentClubByName) {
        updatedPlayer.team = parentClubByName;
        updatedPlayer.parentClub = null;
        updatedPlayer.pendingLoanReturn = false;
        updatedPlayer.loanDuration = 0;
        updatedPlayer.yearsAtClub = 0;
        updatedPlayer.squadStatus = determineSquadStatus(updatedPlayer);
        if (updatedPlayer.contractLength <= 0) {
          updatedPlayer.contractLength = rand(2, 4);
        }
        seasonEvents.push({
          type: "transfer",
          description: "events.loan.returnedToClub",
          descriptionParams: { team: updatedPlayer.team.name },
        });
      } else {
        // BUGFIX: Parent club might be a youth team (Sub-20, U21, etc.)
        // Try to find the senior team by removing youth suffixes
        const youthSuffixRegex =
          / U(18|19|20|21|23)| EDS| Primavera| Castilla| Atlètic| II| B| Sub-20| Sub-19| Sub-18/g;
        const seniorTeamName = updatedPlayer
          .parentClub!.name.replace(youthSuffixRegex, "")
          .trim();
        const seniorTeam = allTeams.find(
          (t) => t.name === seniorTeamName || t.name.includes(seniorTeamName),
        );

        if (seniorTeam) {
          // Found senior team - return player there
          updatedPlayer.team = seniorTeam;
          updatedPlayer.parentClub = null;
          updatedPlayer.pendingLoanReturn = false;
          updatedPlayer.loanDuration = 0;
          updatedPlayer.yearsAtClub = 0;
          updatedPlayer.squadStatus = determineSquadStatus(updatedPlayer);
          if (updatedPlayer.contractLength <= 0) {
            updatedPlayer.contractLength = rand(2, 4);
          }
          seasonEvents.push({
            type: "transfer",
            description: "events.loan.returnedToSenior",
            descriptionParams: { team: seniorTeam.name },
          });
        } else {
          // Clube original não existe mais - converter empréstimo em transferência permanente
          updatedPlayer.parentClub = null;
          updatedPlayer.pendingLoanReturn = false;
          updatedPlayer.loanDuration = 0;
          if (updatedPlayer.contractLength <= 0) {
            updatedPlayer.contractLength = rand(2, 4);
          }
          seasonEvents.push({
            type: "transfer",
            description: "events.loan.becamePermanent",
            descriptionParams: { team: updatedPlayer.team.name },
          });
        }
      }
    }
  }

  // ========== 2. PROMOÇÃO DA BASE E STATUS INICIAL ==========
  const promotionResult = checkYouthProgression(updatedPlayer, allTeams);
  updatedPlayer = {
    ...promotionResult.updatedPlayer,
    suspensions: updatedPlayer.suspensions,
  };
  seasonEvents.push(...promotionResult.events);
  isForcedToMove = isForcedToMove || promotionResult.isForcedToMove;

  const teamForThisSeason = { ...updatedPlayer.team }; // Fix: Capture team COPY to preserve tier before promotion/relegation

  // Define squad status para a temporada (pode ter mudado com a promoção)
  updatedPlayer.squadStatus = determineSquadStatus(updatedPlayer);

  // Enforce any active role promise at season start (min cap)
  if (
    (updatedPlayer.roleGuaranteeSeasons &&
      updatedPlayer.roleGuaranteeSeasons > 0) ||
    (updatedPlayer.roleGuaranteeMatches &&
      updatedPlayer.roleGuaranteeMatches > 0)
  ) {
    const statusOrder = [
      "Surplus",
      "Reserve",
      "Prospect",
      "Rotation",
      "Key Player",
      "Captain",
    ];
    const currentIdx = statusOrder.indexOf(updatedPlayer.squadStatus as any);
    const promised = updatedPlayer.promisedSquadStatus || "Key Player";
    const promisedIdx = statusOrder.indexOf(promised as any);
    if (promisedIdx > currentIdx) {
      updatedPlayer.squadStatus = promised as any;
      seasonEvents.push({
        type: "milestone",
        description: "events.role.promiseHonored",
        descriptionParams: { status: promised },
      });
    }
  }

  // ========== 2.5. DESENVOLVIMENTO FÍSICO (ALTURA/PESO) ==========
  // Processa crescimento de altura (para jovens) e mudanças de peso
  const physicalResult = processPhysicalDevelopment(
    updatedPlayer,
    updatedPlayer.squadStatus === "Captain" || updatedPlayer.squadStatus === "Key Player"
      ? "high"
      : updatedPlayer.squadStatus === "Surplus" || updatedPlayer.squadStatus === "Reserve"
        ? "low"
        : "normal",
    0, // injuryMonths será calculado após seção de lesões
  );

  updatedPlayer = physicalResult.updatedPlayer;

  // Adiciona eventos de desenvolvimento físico
  if (physicalResult.heightGrew) {
    seasonEvents.push({
      type: "milestone",
      description: "events.physical.heightGrowth",
      descriptionParams: {
        growth: physicalResult.heightGrowth.toFixed(1),
        newHeight: updatedPlayer.expandedData?.physicalProfile?.height || 0,
      },
    });
  }

  if (physicalResult.weightChanged && Math.abs(physicalResult.weightChange) >= 1) {
    seasonEvents.push({
      type: "milestone",
      description: physicalResult.weightChange > 0
        ? "events.physical.weightGain"
        : "events.physical.weightLoss",
      descriptionParams: {
        change: Math.abs(physicalResult.weightChange).toFixed(1),
        newWeight: updatedPlayer.expandedData?.physicalProfile?.weight || 0,
      },
    });
  }

  if (physicalResult.bodyTypeChanged && physicalResult.newBodyType) {
    seasonEvents.push({
      type: "milestone",
      description: "events.physical.bodyTypeChange",
      descriptionParams: {
        newBodyType: physicalResult.newBodyType,
      },
    });
  }

  // ========== 3. SISTEMA DE LESÕES E TEMPO DE JOGO (V2) ==========
  // Lógica refatorada para maior realismo na contagem de partidas

  // Passo 1: calculateMatchesPlayed já retorna os jogos que o JOGADOR vai jogar
  // (baseado no squad status, reputação do time, etc.)
  const playerMatchesBeforeInjury = updatedPlayer.hasMadeSeniorDebut
    ? calculateMatchesPlayed(updatedPlayer, updatedPlayer.team)
    : youthAcademyMatches(updatedPlayer);

  // Passo 2: Processar lesões para determinar quantos jogos o jogador está de fato DISPONÍVEL.
  const { injury: newInjury, events: injuryEvents } = processInjurySystem(
    updatedPlayer,
    playerMatchesBeforeInjury,
  );
  if (newInjury) {
    updatedPlayer.injury = newInjury;
    seasonEvents.push(...injuryEvents);
  }

  // Passo 3: Aplicar impacto da lesão nos jogos ANTES de processar recuperação
  let actualMatchesPlayed = playerMatchesBeforeInjury;
  if (updatedPlayer.injury && updatedPlayer.injury.duration > 0) {
    const injuryFactor =
      updatedPlayer.injury.type === "Career-Ending"
        ? 0.0
        : updatedPlayer.injury.type === "Severe"
          ? 0.3
          : updatedPlayer.injury.type === "Moderate"
            ? 0.6
            : 0.85; // Minor
    actualMatchesPlayed = Math.round(playerMatchesBeforeInjury * injuryFactor);
    seasonEvents.push({
      type: "injury",
      description: "events.injury.missedSeason",
    });
  }

  // Passo 4: Processar recuperação APÓS aplicar impacto
  const { recovered: injuryRecovered, event: recoveryEvent } =
    processInjuryRecovery(updatedPlayer);
  if (recoveryEvent) {
    seasonEvents.push(recoveryEvent);
  }

  // Modificadores finais apenas para casos extremos
  if (updatedPlayer.form >= 6) actualMatchesPlayed += rand(0, 2);
  if (updatedPlayer.form <= -6) actualMatchesPlayed -= rand(0, 2);

  actualMatchesPlayed = clamp(
    actualMatchesPlayed,
    0,
    playerMatchesBeforeInjury,
  );

  // ========== TOTAL DE JOGOS DO CLUBE ==========
  // Este valor será atualizado com o total REAL após simular todas as competições.
  // Inicialmente usamos uma estimativa, mas o valor final vem da soma dos matchesPlayed
  // de cada competição (liga + copa + continental + etc).
  let totalMatchesForClub = 0; // Será preenchido após as competições

  // ========== 4. SISTEMA CONTEXTUAL DE COMPETIÇÕES ==========
  let goals = 0,
    assists = 0,
    cleanSheets = 0;
  let performanceRating = 0;
  let matchStats: ExtendedMatchStats | undefined = undefined;
  let matchLogs: MatchLog[] = [];
  let competitionData: ContextualCompetitionData | undefined = undefined;

  // Objeto para agregar resultados da temporada para o sistema de prêmios
  const seasonResults: SeasonResults = {
    wonLeague: false,
    wonCup: false,
    wonContinental: false,
    wonSecondaryContinental: false,
    wonClubWorldCup: false,
    wonWorldCup: false,
    leaguePosition: 0,
    continentalCompetitionName: null,
  };

  // Free agents don't play matches - robust detection (aceita dados antigos 'Agente Livre')
  const isFreeAgent =
    /free agent/i.test(updatedPlayer.team.name) ||
    /agente livre/i.test(updatedPlayer.team.name);

  if (!isFreeAgent) {
    // Inicializa profile e playerStyle se ainda não tiver
    if (!updatedPlayer.profile) {
      updatedPlayer.profile = calculateInitialPlayerProfile(
        updatedPlayer.stats,
        updatedPlayer.position,
        updatedPlayer.archetype,
      );
    }
    if (!updatedPlayer.playerStyle) {
      updatedPlayer.playerStyle = classifyPlayerStyle(updatedPlayer);
    }

    // Reassign traits based on current stats/profile (they can improve over career)
    if (!updatedPlayer.traits || updatedPlayer.traits.length === 0) {
      updatedPlayer.traits = assignPlayerTraits(updatedPlayer);
    } else {
      updatedPlayer.traits = assignPlayerTraits(updatedPlayer);
    }

    // ========== 2. SIMULAÇÃO DE COMPETIÇÕES CONTEXTUAIS ==========
    // Simula ligas, copas e competições continentais baseadas no país do time
    competitionData = await simulateContextualCompetitions(updatedPlayer, t);

    // ========== v0.5.2: PROCESSA SUSPENSÕES ANTES DE AGREGAR STATS ==========
    // Verifica se o jogador estava suspenso e reduz os jogos jogáveis
    const suspensionsByType: Record<CompetitionType, number> = {
      League: updatedPlayer.suspensions?.league || 0,
      Cup: updatedPlayer.suspensions?.cup || 0,
      Continental: updatedPlayer.suspensions?.continental || 0,
      "State Cup": updatedPlayer.suspensions?.stateCup || 0,
      International: updatedPlayer.suspensions?.international || 0,
    };

    // Para cada competição, decrementa suspensões e ajusta stats
    competitionData.competitions.forEach((comp) => {
      const compType = comp.type as CompetitionType;
      const suspendedMatches = suspensionsByType[compType] || 0;

      if (suspendedMatches > 0 && comp.matchesPlayed > 0) {
        // Reduz jogos jogados pelo número de suspensões (máximo = jogos jogáveis)
        const matchesLost = Math.min(suspendedMatches, comp.matchesPlayed);
        const ratio =
          comp.matchesPlayed > 0
            ? (comp.matchesPlayed - matchesLost) / comp.matchesPlayed
            : 1;

        // Ajusta stats proporcionalmente
        comp.matchesPlayed = Math.max(0, comp.matchesPlayed - matchesLost);
        comp.goals = Math.round(comp.goals * ratio);
        comp.assists = Math.round(comp.assists * ratio);
        if (comp.cleanSheets)
          comp.cleanSheets = Math.round(comp.cleanSheets * ratio);

        // Zera o contador de suspensão para este tipo (já foi "consumido")
        suspensionsByType[compType] = Math.max(
          0,
          suspendedMatches - matchesLost,
        );

        console.log(
          `[SUSPENSION] ${updatedPlayer.name} served ${matchesLost} match suspension in ${compType}`,
        );
      }
    });

    // Atualiza o jogador com os contadores de suspensão decrementados
    updatedPlayer.suspensions = {
      league: suspensionsByType["League"],
      cup: suspensionsByType["Cup"],
      continental: suspensionsByType["Continental"],
      stateCup: suspensionsByType["State Cup"],
      international: suspensionsByType["International"],
    };

    // Agrega estatísticas e resultados de todas as competições
    // Usa valores seguros para evitar NaN
    competitionData.competitions.forEach((comp) => {
      const safeGoals = Number.isFinite(comp.goals) ? comp.goals : 0;
      const safeAssists = Number.isFinite(comp.assists) ? comp.assists : 0;
      const safeCleanSheets = Number.isFinite(comp.cleanSheets) ? comp.cleanSheets : 0;

      goals += safeGoals;
      assists += safeAssists;
      if (safeCleanSheets) cleanSheets += safeCleanSheets;

      // Processa Troféus (Preenche SeasonResults para o AwardLogic)
      // Processa Troféus (Preenche SeasonResults para o AwardLogic)
      // Fix: Check position/winner status directly, don't rely solely on comp.trophies count which might be missing
      // CRITICAL FIX: Youth teams cannot win professional trophies
      if (!updatedPlayer.team.isYouth) {
        if (comp.type === "League") {
          if (comp.position === 1) {
            seasonResults.wonLeague = true;
            updatedPlayer.trophies.league += 1;
            seasonEvents.push({
              type: "trophy",
              trophyKey: "league",
              description: `events.trophy.won`,
              descriptionParams: { competition: comp.competition },
            });
            // Verificar conquistas de troféus imediatamente
            PlayGamesService.checkTrophyAchievements(updatedPlayer);
          }
        } else if (comp.type === "Cup") {
          if (comp.wonCompetition || (comp.trophies && comp.trophies > 0)) {
            // Copa doméstica principal
            if (
              !comp.competition.toLowerCase().includes("supercopa") &&
              !comp.competition.includes("trophy.supercopa")
            ) {
              seasonResults.wonCup = true;
              updatedPlayer.trophies.cup += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "cup",
                description: `events.trophy.won`,
                descriptionParams: { competition: comp.competition },
              });
              // Verificar conquistas de troféus imediatamente
              PlayGamesService.checkTrophyAchievements(updatedPlayer);
            } else {
              // Supercopas contam apenas estatisticamente no player, não como "Major Trophy" para awards principais
              // Mas podemos registrar o evento aqui se quisermos detalhe granular
              updatedPlayer.trophies.superCup += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "superCup",
                description: `events.trophy.won`,
                descriptionParams: { competition: comp.competition },
              });
              // Verificar conquistas de troféus imediatamente
              PlayGamesService.checkTrophyAchievements(updatedPlayer);
            }
          }
        } else if (
          comp.type === "Continental" ||
          comp.type === "International"
        ) {
          if (comp.wonCompetition || (comp.trophies && comp.trophies > 0)) {
            // Define qual competição continental foi ganha
            seasonResults.continentalCompetitionName = comp.competition;

            if (
              [
                "Continental Championship",
                "South American Championship",
                "Asian Championship",
                "African Championship",
                "North American Championship",
                // Legacy names for save compatibility
                "Champions League",
                "Copa Libertadores",
                "AFC Champions League",
              ].some((c) => comp.competition.includes(c))
            ) {
              seasonResults.wonContinental = true;
            } else if (
              !comp.competition.includes("Club World Cup") &&
              !comp.competition.includes("Intercontinental")
            ) {
              seasonResults.wonSecondaryContinental = true;
            }

            // Mundiais
            if (
              comp.competition.includes("Club World Cup") ||
              comp.competition.includes("trophy.clubWorldCup")
            ) {
              seasonResults.wonClubWorldCup = true;
              updatedPlayer.trophies.clubWorldCup += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "clubWorldCup",
                description: `events.trophy.won`,
                descriptionParams: { competition: comp.competition },
              });
              // Verificar conquistas de troféus imediatamente
              PlayGamesService.checkTrophyAchievements(updatedPlayer);
            } else if (
              comp.competition.includes("Intercontinental") ||
              comp.competition.includes("trophy.intercontinentalCup")
            ) {
              updatedPlayer.trophies.intercontinentalCup += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "intercontinentalCup",
                description: `events.trophy.won`,
                descriptionParams: { competition: comp.competition },
              });
              // Verificar conquistas de troféus imediatamente
              PlayGamesService.checkTrophyAchievements(updatedPlayer);
            } else {
              // Continental Cup (Libertadores, Champions, etc.)
              // We need to map the competition name to the trophy key
              let trophyKey: keyof Trophies | null = null;
              const compNameLower = comp.competition.toLowerCase();

              // European competitions (legacy and generic names)
              if (
                (compNameLower.includes("champions league") ||
                  compNameLower.includes("continental championship") ||
                  compNameLower.includes("trophy.championsleague")) &&
                !compNameLower.includes("afc") &&
                !compNameLower.includes("asian") &&
                !compNameLower.includes("african") &&
                !compNameLower.includes("south american") &&
                !compNameLower.includes("north american")
              )
                trophyKey = "championsLeague";
              // South American primary (legacy and generic)
              else if (
                compNameLower.includes("libertadores") ||
                compNameLower.includes("south american championship") ||
                compNameLower.includes("trophy.libertadores")
              )
                trophyKey = "libertadores";
              // European secondary (legacy and generic)
              else if (
                compNameLower.includes("europa league") ||
                compNameLower.includes("continental cup") ||
                compNameLower.includes("trophy.europaleague")
              )
                trophyKey = "europaLeague";
              // European tertiary (legacy and generic)
              else if (
                compNameLower.includes("conference league") ||
                compNameLower.includes("continental league") ||
                compNameLower.includes("trophy.conferenceleague")
              )
                trophyKey = "conferenceLeague";
              else if (
                compNameLower.includes("sudamericana") ||
                compNameLower.includes("south american cup") ||
                compNameLower.includes("trophy.copasudamericana")
              )
                trophyKey = "copaSudamericana";
              // Asian primary (legacy and generic)
              else if (
                compNameLower.includes("afc champions") ||
                compNameLower.includes("asian championship") ||
                compNameLower.includes("trophy.afcchampionsleague")
              )
                trophyKey = "afcChampionsLeague";
              else if (
                compNameLower.includes("recopa") ||
                compNameLower.includes("trophy.recopasudamericana")
              )
                trophyKey = "recopaSudamericana";
              else if (
                compNameLower.includes("super cup") ||
                compNameLower.includes("supercopa") ||
                compNameLower.includes("trophy.supercup")
              )
                trophyKey = "superCup";
              // African primary (legacy and generic)
              else if (
                compNameLower.includes("african champions") ||
                compNameLower.includes("african championship") ||
                compNameLower.includes("trophy.cafchampionsleague")
              )
                trophyKey = "cafChampionsLeague";
              // African secondary (legacy and generic)
              else if (
                compNameLower.includes("african clubs") ||
                compNameLower.includes("african cup") ||
                compNameLower.includes("trophy.cafconfederationcup")
              )
                trophyKey = "cafConfederationCup";
              else if (
                compNameLower.includes("african access") ||
                compNameLower.includes("trophy.cafaccesscup")
              )
                trophyKey = "cafAccessCup";
              // Asian secondary (legacy and generic)
              else if (
                compNameLower.includes("asian clubs") ||
                compNameLower.includes("asian cup") ||
                compNameLower.includes("trophy.afccup")
              )
                trophyKey = "afcCup";
              else if (
                compNameLower.includes("asian access") ||
                compNameLower.includes("trophy.afcchallengecup")
              )
                trophyKey = "afcChallengeCup";
              // North American primary (legacy and generic)
              else if (
                compNameLower.includes("north american champions") ||
                compNameLower.includes("north american championship") ||
                compNameLower.includes("trophy.concacafchampionscup")
              )
                trophyKey = "concacafChampionsCup";
              // North American secondary
              else if (
                compNameLower.includes("north american clubs") ||
                compNameLower.includes("trophy.concacafleague")
              )
                trophyKey = "concacafLeague";
              else if (
                compNameLower.includes("north american access") ||
                compNameLower.includes("trophy.concacafshield")
              )
                trophyKey = "concacafShield";
              else if (
                compNameLower.includes("oceania champions") ||
                compNameLower.includes("trophy.ofcchampionsleague")
              )
                trophyKey = "ofcChampionsLeague";
              else if (
                compNameLower.includes("oceania clubs") ||
                compNameLower.includes("trophy.ofccup")
              )
                trophyKey = "ofcCup";
              else if (
                compNameLower.includes("oceania access") ||
                compNameLower.includes("trophy.ofcqualifiercup")
              )
                trophyKey = "ofcQualifierCup";
              else if (
                compNameLower.includes("south american access") ||
                compNameLower.includes("trophy.conmebolaccesscup")
              )
                trophyKey = "conmebolAccessCup";
              // Intercontinental Competitions
              else if (
                compNameLower.includes("americas derby") ||
                compNameLower.includes("dérbi das américas") ||
                compNameLower.includes("trophy.americasderby")
              )
                trophyKey = "americasDerby";
              else if (
                compNameLower.includes("intercontinental cup") ||
                compNameLower.includes("copa intercontinental") ||
                compNameLower.includes("trophy.intercontinentalcup")
              )
                trophyKey = "intercontinentalCup";
              else if (
                compNameLower.includes("club world cup") ||
                compNameLower.includes("mundial de clubes") ||
                compNameLower.includes("trophy.fifaclubworldcup")
              )
                trophyKey = "fifaClubWorldCup";

              // Increment trophy count safely
              if (
                trophyKey &&
                typeof updatedPlayer.trophies[trophyKey] === "number"
              ) {
                updatedPlayer.trophies[trophyKey]++;

                seasonEvents.push({
                  type: "trophy",
                  trophyKey: trophyKey,
                  description: `events.trophy.won`,
                  descriptionParams: { competition: comp.competition },
                });
                // Verificar conquistas de troféus imediatamente
                PlayGamesService.checkTrophyAchievements(updatedPlayer);
              } else {
                console.warn(
                  `Unknown continental competition: ${comp.competition}`,
                );
              }
            }
          }
        } else if (comp.type === "State Cup") {
          if (comp.wonCompetition || (comp.trophies && comp.trophies > 0)) {
            updatedPlayer.trophies.stateCup += 1;
            seasonEvents.push({
              type: "trophy",
              trophyKey: "stateCup",
              description: `events.trophy.won`,
              descriptionParams: { competition: comp.competition },
            });
            // Verificar conquistas de troféus imediatamente
            PlayGamesService.checkTrophyAchievements(updatedPlayer);
          }
        }
      } else {
        // ==================== TROFÉUS JUVENIS ====================
        // Jogadores em times juvenis ganham troféus juvenis
        if (comp.wonCompetition || (comp.trophies && comp.trophies > 0)) {
          const compNameLower = comp.competition.toLowerCase();

          if (comp.type === "League") {
            updatedPlayer.trophies.youthLeague += 1;
            seasonEvents.push({
              type: "trophy",
              trophyKey: "youthLeague",
              description: `events.trophy.wonYouth`,
              descriptionParams: { competition: comp.competition },
            });
          } else if (comp.type === "Cup") {
            // Distinguir entre copa juvenil normal e torneios especiais (Copinha)
            if (compNameLower.includes("são paulo") || compNameLower.includes("copinha")) {
              updatedPlayer.trophies.youthSpecialTournament += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "youthSpecialTournament",
                description: `events.trophy.wonYouth`,
                descriptionParams: { competition: comp.competition },
              });
            } else {
              updatedPlayer.trophies.youthCup += 1;
              seasonEvents.push({
                type: "trophy",
                trophyKey: "youthCup",
                description: `events.trophy.wonYouth`,
                descriptionParams: { competition: comp.competition },
              });
            }
          } else if (comp.type === "Continental") {
            // UEFA Youth League ou equivalente
            updatedPlayer.trophies.youthContinental += 1;
            seasonEvents.push({
              type: "trophy",
              trophyKey: "youthContinental",
              description: `events.trophy.wonYouth`,
              descriptionParams: { competition: comp.competition },
            });
          }
        }
      }

      // Eventos de participação em competições importantes
      if (comp.type === "Continental" && comp.matchesPlayed > 0) {
        seasonEvents.push({
          type: "milestone",
          description: `events.continental.played`,
          descriptionParams: {
            matches: comp.matchesPlayed,
            competition: comp.competition,
            goals: comp.goals,
            assists: comp.assists,
          },
        });
      }
    });

    // Calcula rating baseado nas competições disputadas
    // IMPORTANTE: Calcula o total de jogos do TIME (não do jogador!)
    // Usa teamMatchesPlayed quando disponível, senão matchesPlayed como fallback
    // Usa valores seguros para evitar NaN
    const totalTeamMatches = competitionData.competitions.reduce(
      (sum, comp) => {
        const matches = comp.teamMatchesPlayed ?? comp.matchesPlayed;
        return sum + (Number.isFinite(matches) ? matches : 0);
      },
      0,
    );

    // Total de jogos do JOGADOR - também com proteção contra NaN
    const totalPlayerMatches = competitionData.competitions.reduce(
      (sum, comp) => {
        const matches = comp.matchesPlayed;
        return sum + (Number.isFinite(matches) ? matches : 0);
      },
      0,
    );

    // Usar o total real de jogos do TIME
    if (totalTeamMatches > 0 && Number.isFinite(totalTeamMatches)) {
      totalMatchesForClub = totalTeamMatches;
    }

    if (totalPlayerMatches > 0) {
      // Usa o sistema centralizado de rating
      performanceRating = calculateAverageMatchRating(
        competitionData.competitions.map((comp) => comp.rating),
      );
      // Média de exibição (1-10) ponderada por jogos
      var avgMatchDisplayRating = calculateWeightedCompetitionRating(
        competitionData.competitions.map((comp) => ({
          rating: comp.rating,
          matchesPlayed: comp.matchesPlayed,
        })),
      );
    }

    // Cria match logs baseados nas competições
    competitionData.competitions.forEach((comp) => {
      // Valida matchesPlayed para evitar arrays inválidos
      const matchesPlayed = Math.max(0, Math.floor(comp.matchesPlayed || 0));
      if (matchesPlayed === 0 || !Number.isFinite(matchesPlayed)) return;

      // 1. Distribute Results (W/D/L)
      const resultsDist: ("W" | "D" | "L")[] = [];
      for (let k = 0; k < (comp.matchesWon || 0); k++) resultsDist.push("W");
      for (let k = 0; k < (comp.matchesDrawn || 0); k++) resultsDist.push("D");
      for (let k = 0; k < (comp.matchesLost || 0); k++) resultsDist.push("L");
      // Fill remaining with D if any mismatch (safety)
      while (resultsDist.length < matchesPlayed) resultsDist.push("D");
      // Shuffle results
      for (let i = resultsDist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultsDist[i], resultsDist[j]] = [resultsDist[j], resultsDist[i]];
      }

      // 2. Distribute Goals
      const goalsDist = new Array(matchesPlayed).fill(0);
      const totalGoals = Math.max(0, Math.floor(comp.goals || 0));
      for (let k = 0; k < totalGoals; k++) {
        const idx = Math.floor(Math.random() * matchesPlayed);
        goalsDist[idx]++;
      }

      // 3. Distribute Assists
      const assistsDist = new Array(matchesPlayed).fill(0);
      const totalAssists = Math.max(0, Math.floor(comp.assists || 0));
      for (let k = 0; k < totalAssists; k++) {
        const idx = Math.floor(Math.random() * matchesPlayed);
        assistsDist[idx]++;
      }

      for (let i = 0; i < matchesPlayed; i++) {
        const playerGoals = goalsDist[i];
        const playerAssists = assistsDist[i];
        const result = resultsDist[i];

        // Simulate scores based on result
        let teamScore = playerGoals;
        let opponentScore = 0;

        if (result === "W") {
          opponentScore = rand(0, Math.max(0, teamScore + rand(0, 1)));
          teamScore = Math.max(teamScore, opponentScore + 1);
        } else if (result === "D") {
          opponentScore = Math.max(teamScore, rand(0, 3));
          teamScore = opponentScore;
        } else {
          teamScore = Math.max(playerGoals, rand(0, 2));
          opponentScore = teamScore + rand(1, 3);
        }

        const matchLog: MatchLog = {
          age: ageForThisSeason,
          team: updatedPlayer.team,
          opponent: `Opponent in ${comp.competition}`,
          competition: comp.competition,
          goals: playerGoals,
          assists: playerAssists,
          rating: comp.rating,
          isNationalTeam: false,
          teamScore,
          opponentScore,
          result,
        };
        matchLogs.push(matchLog);
      }
    });

    // Atualiza total de jogos disputados baseado nas competições (do jogador)
    actualMatchesPlayed = totalPlayerMatches;

    // Gera matchStats agregadas da temporada completa
    if (actualMatchesPlayed > 0) {
      const performanceResult = calculateDetailedPerformance(
        updatedPlayer,
        actualMatchesPlayed,
        1.0, // performanceModifier já foi aplicado nas simulações individuais
        updatedPlayer.tactic || "Balanced",
        matchLogs,
      );
      matchStats = performanceResult.matchStats;
      
      // CRITICAL FIX: Sincroniza matchStats.cleanSheets com o valor acumulado das competições
      // O CleanSheetCalculator dentro de calculateDetailedPerformance recalcula cleanSheets
      // de forma independente, mas o valor correto é o que vem das competições simuladas
      if (matchStats && updatedPlayer.position === "GK") {
        matchStats.cleanSheets = cleanSheets;
      }
      
      // Adiciona matchLogs do cálculo detalhado (Opcional: pode gerar duplicidade visual se já adicionamos acima)
      // A estratégia aqui é usar os logs detalhados para estatísticas internas, mas o histórico visual pode ficar poluído.
      // Vamos manter matchLogs gerados pelas competições para o histórico visual.

      if (typeof avgMatchDisplayRating === "undefined") {
        const ratings = matchLogs.map((m) => m.rating);
        if (ratings.length > 0) {
          const sum = ratings.reduce((s, r) => s + r, 0);
          avgMatchDisplayRating = Math.min(
            10,
            Math.max(1, sum / ratings.length),
          );
        }
      }

      // ========== v0.5.2: SISTEMA DE SUSPENSÃO POR CARTÃO VERMELHO ==========
      // Aplica suspensões baseado em cartões vermelhos por tipo de competição
      if (matchStats && competitionData) {
        competitionData.competitions.forEach((comp) => {
          // Verificar se houve cartão vermelho nesta competição
          // Os cartões estão distribuídos no matchStats agregado, então estimamos
          // baseado na proporção de jogos de cada competição
          if (comp.matchesPlayed > 0 && matchStats) {
            const totalRedCards = matchStats.redCards || 0;
            // Distribuir cartões proporcionalmente aos jogos por competição
            const compMatchRatio = comp.matchesPlayed / actualMatchesPlayed;
            const estimatedRedCardsInComp = Math.round(
              totalRedCards * compMatchRatio,
            );

            // Cada cartão vermelho resulta em 1 jogo de suspensão para a próxima temporada
            // (na prática, a suspensão duraria para os próximos jogos da mesma temporada,
            // mas como simulamos temporadas inteiras, aplicamos para a próxima)
            for (let i = 0; i < estimatedRedCardsInComp; i++) {
              updatedPlayer = applySuspensionFromRedCard(
                updatedPlayer,
                comp.type,
              );
            }

            // Evento de suspensão se houver cartões vermelhos
            if (estimatedRedCardsInComp > 0) {
              seasonEvents.push({
                type: "setback",
                description: "events.suspension.redCard",
                descriptionParams: {
                  count: estimatedRedCardsInComp,
                  competition: comp.competition,
                },
              } as any);
            }
          }
        });
      }

      // ========== v0.5.2: ACUMULAÇÃO DO MAPA DE CALOR DA CARREIRA ==========
      // Usa heatmap acumulado das partidas individuais (Match → Season → Career)
      const careerHeatmapBase =
        updatedPlayer.careerHeatmap || createEmptyHeatmap();
      updatedPlayer.careerHeatmap = accumulateHeatmap(
        careerHeatmapBase,
        performanceResult.seasonHeatmap,
      );

      // ========== v0.5.2: PROGRESSÃO DE POSIÇÕES SECUNDÁRIAS ==========
      // Se o jogador jogou durante a temporada, atualiza proficiência da posição
      // (Nota: por agora usamos posição principal, mas quando tática específica
      // exigir outra posição, isso será usado)
      if (actualMatchesPlayed > 0) {
        updatedPlayer = updateSecondaryPositionProficiency(
          updatedPlayer,
          updatedPlayer.position, // Posição jogada na temporada
          actualMatchesPlayed,
        );
      }
    }
  } else {
    // Jogador livre: não joga, mantém forma baixa gradual e gera evento de busca de clube
    actualMatchesPlayed = 0;
    goals = 0;
    assists = 0;
    seasonEvents.push({
      type: "milestone",
      description:
        "Season spent as Free Agent — individual training and seeking a new club.",
    });
    // Pequeno drift negativo de forma se permanecer muito tempo sem clube
    updatedPlayer.form = Math.max(-10, (updatedPlayer.form || 0) - rand(1, 3));

    // Tenta imediatamente assinar com novo clube usando lógica de transferência existente (forçada)
    const offers = getTransferOffers(updatedPlayer, false, true);
    if (offers.length > 0) {
      // Escolhe a melhor oferta (maior reputação do clube -> prioridade)
      const best = offers.sort(
        (a, b) => b.team.reputation - a.team.reputation,
      )[0];
      const transferResult = processTransfer(updatedPlayer, best);
      updatedPlayer = transferResult.updatedPlayer;
      seasonEvents.push({
        type: "transfer",
        description: `events.transfer.signedFreeAgent`,
        descriptionParams: { team: best.team.name },
      });
      updatedPlayer.form = Math.max(updatedPlayer.form || 0, rand(0, 3));
      isForcedToMove = true; // marca que houve movimentação forçada
    }
  }

  // ========== 5. PROGRESSÃO E DESENVOLVIMENTO DO JOGADOR ==========
  // Season Focus: development slightly boosts progression
  const progressionFocusBoost =
    updatedPlayer.seasonFocus === "development"
      ? 1.08
      : updatedPlayer.seasonFocus === "consistency"
        ? 1.03
        : 1.0;

  const { statChanges, events: progressionEvents } =
    calculateMarginalProgression(
      updatedPlayer,
      actualMatchesPlayed,
      performanceRating * progressionFocusBoost,
    );
  progressionEvents.forEach((event) =>
    seasonEvents.push({ type: "milestone", description: event } as CareerEvent),
  );
  for (const key in statChanges) {
    const statKey = key as keyof typeof statChanges;
    const newValue = statChanges[statKey];
    if (newValue !== undefined && typeof newValue === "number") {
      (updatedPlayer.stats as any)[statKey] = newValue;
    }
  }
  updatedPlayer.stats.overall = calculateOverall(
    updatedPlayer.stats,
    updatedPlayer.position,
    updatedPlayer.expandedData, // Task 1: Use expandedData for accurate OVR
  );

  // ========== 5.5. SISTEMA DINÂMICO DE AQUISIÇÃO E REMOÇÃO DE TRAITS ==========
  const seasonStats: SeasonStats = {
    matchesPlayed: actualMatchesPlayed,
    goals,
    assists,
    overall: updatedPlayer.stats.overall,
    cleanSheets: updatedPlayer.position === "GK" ? cleanSheets : undefined,
    matchStats,
    gamesStarted: 0,
    minutesPlayed: 0,
    matchesWon: matchLogs.filter((m) => m.result === "W").length,
    matchesDrawn: matchLogs.filter((m) => m.result === "D").length,
    matchesLost: matchLogs.filter((m) => m.result === "L").length,
    matchWinRate: 0,
    averageRating: performanceRating,
    seasonGoalFrequency: 0,
    seasonAssistFrequency: 0,
    careerHighGoals: false,
    careerHighAssists: false,
    monthlyAwards: 0,
    playerOfTheMatch: 0,
    teamOfTheWeek: 0,
    hatTricks: 0,
  };

  const traitAcquisitionResult = checkTraitAcquisition(
    updatedPlayer,
    seasonStats,
  );
  if (traitAcquisitionResult.newTraits.length > 0) {
    updatedPlayer.traits.push(...traitAcquisitionResult.newTraits);
    seasonEvents.push(...traitAcquisitionResult.events);
  }

  const traitRemovalResult = checkTraitRemoval(updatedPlayer);
  if (traitRemovalResult.removedTraits.length > 0) {
    updatedPlayer.traits = updatedPlayer.traits.filter(
      (t) => !traitRemovalResult.removedTraits.includes(t.name),
    );
    seasonEvents.push(...traitRemovalResult.events);
  }

  // ========== 6. EVENTOS DE CARREIRA E RECONHECIMENTO ==========
  // Simulação da Seleção Nacional
  const nationalTeamResult = simulateNationalTeamSeason(
    updatedPlayer,
    goals,
    assists,
  );
  updatedPlayer = nationalTeamResult.updatedPlayer;
  seasonEvents.push(...nationalTeamResult.events);
  followerGrowthTotal += nationalTeamResult.followerGrowth;
  reputationChangeTotal += nationalTeamResult.reputationChange;

  // Adicionar matchLogs da seleção ao histórico
  if (nationalTeamResult.matchLogs && nationalTeamResult.matchLogs.length > 0) {
    matchLogs.push(...nationalTeamResult.matchLogs);
  }

  // Atualizar SeasonResults com resultados da seleção
  seasonResults.wonWorldCup = nationalTeamResult.wonWorldCup;

  // Simulação de Prêmios (Ballon d'Or, Golden Boot, etc.)
  // Prepara estatísticas brutas para o sistema de prêmios
  const rawStatsForAwards = {
    goals,
    assists,
    cleanSheets: updatedPlayer.position === "GK" ? cleanSheets : 0,
    matchesPlayed: actualMatchesPlayed,
  };

  // v0.5.6: Consolidar matchLogs internacionais ANTES de calcular statsByType
  // Para garantir que gols de Copa do Mundo sejam contabilizados para prêmios
  if (competitionData) {
    const intlMatches = matchLogs.filter((m) => m.isNationalTeam);
    if (intlMatches.length > 0) {
      const byType: Record<
        string,
        {
          matches: number;
          goals: number;
          assists: number;
          ratingSum: number;
          cleanSheets: number;
        }
      > = {};
      intlMatches.forEach((m) => {
        const key = m.competition || "International";
        if (!byType[key])
          byType[key] = {
            matches: 0,
            goals: 0,
            assists: 0,
            ratingSum: 0,
            cleanSheets: 0,
          };
        byType[key].matches += 1;
        byType[key].goals += m.goals;
        byType[key].assists += m.assists;
        byType[key].ratingSum += m.rating;
        // Estimar clean sheets para GK baseado em rating
        if (updatedPlayer.position === "GK" && m.rating >= 6.5) {
          byType[key].cleanSheets +=
            m.rating >= 7.0 ? 1 : Math.random() < 0.4 ? 1 : 0;
        }
      });

      Object.entries(byType).forEach(([compName, agg]) => {
        const avg = agg.ratingSum / Math.max(1, agg.matches);
        // Remover entrada existente se houver (para evitar duplicação)
        const existingIndex = competitionData.competitions.findIndex(
          (c) => c.competition === compName && c.type === "International"
        );
        if (existingIndex !== -1) {
          competitionData.competitions.splice(existingIndex, 1);
        }
        competitionData.competitions.push({
          competition: compName,
          type: "International",
          matchesPlayed: agg.matches,
          goals: agg.goals,
          assists: agg.assists,
          cleanSheets: updatedPlayer.position === "GK" ? agg.cleanSheets : 0,
          rating: Number(avg.toFixed(2)),
        });
      });
    }
  }

  // Calcula stats por tipo de competição para prêmios específicos (Golden Boot, etc.)
  const leagueComp = competitionData?.competitions.find(
    (c) => c.type === "League",
  );
  const cupComp = competitionData?.competitions.find((c) => c.type === "Cup");
  const continentalComp = competitionData?.competitions.find(
    (c) => c.type === "Continental",
  );
  const internationalComp = competitionData?.competitions.find(
    (c) => c.type === "International",
  );

  const earlyStatsByType = {
    league: {
      goals: leagueComp?.goals || 0,
      assists: leagueComp?.assists || 0,
      cleanSheets: leagueComp?.cleanSheets || 0,
    },
    cup: {
      goals: cupComp?.goals || 0,
      assists: cupComp?.assists || 0,
      cleanSheets: cupComp?.cleanSheets || 0,
    },
    continental: {
      goals: continentalComp?.goals || 0,
      assists: continentalComp?.assists || 0,
      cleanSheets: continentalComp?.cleanSheets || 0,
    },
    international: {
      goals: internationalComp?.goals || 0,
      assists: internationalComp?.assists || 0,
      cleanSheets: internationalComp?.cleanSheets || 0,
    },
  };

  // Identifica "Big Games" para análise de performance
  // Jogos de seleção (finais/semis) e jogos continentais de clube
  const bigGamePerformances = matchLogs
    .filter(
      (m) =>
        (m.competition?.includes("Final") || m.competition?.includes("Semi")) &&
        m.rating > 7.0, // Só considera se jogou decentemente
    )
    .map((m) => ({
      competition: m.isNationalTeam
        ? m.competition?.includes("World Cup")
          ? "World Cup"
          : "Continental Cup"
        : "Continental",
      stage: m.competition?.includes("Final") ? "Final" : "SF",
      goals: m.goals,
      assists: m.assists,
      rating: m.rating,
      wasDecisive: (m.goals > 0 || m.assists > 0) && m.rating >= 8.0,
    }));

  let awardResult: {
    updatedPlayer: Player;
    events: CareerEvent[];
    followerGrowth: number;
  } = {
    updatedPlayer,
    events: [],
    followerGrowth: 0,
  };

  // Only simulate awards for professional players
  if (!updatedPlayer.team.isYouth) {
    awardResult = simulateAwards(
      updatedPlayer,
      originalPlayerForAwards,
      performanceRating,
      rawStatsForAwards,
      seasonResults,
      bigGamePerformances as any,
      false, // wasSeverelyInjuredLastSeason
      false, // debug
      earlyStatsByType, // CORRIGIDO: Passa stats por tipo de competição
    );
  }

  updatedPlayer = awardResult.updatedPlayer;
  seasonEvents.push(...awardResult.events);
  followerGrowthTotal += awardResult.followerGrowth;

  // Eventos de Mídia e Social Media
  const eventResult = processSeasonEvents(
    updatedPlayer,
    performanceRating,
    wasSeverelyInjuredLastSeason,
    goals,
    assists,
    cleanSheets,
    actualMatchesPlayed,
    seasonEvents,
  );
  updatedPlayer = eventResult.updatedPlayer;
  seasonEvents.push(...eventResult.events);
  followerGrowthTotal +=
    eventResult.socialMetrics.followers - player.socialMediaFollowers;
  updatedPlayer.socialMediaFollowers = eventResult.socialMetrics.followers;



  const SEASON_WEEKS = 46;
  // ========== 6.6. INTERACTIVE EVENTS SYSTEM (v0.5.6) ==========
  // Generate interactive events based on player personality and context
  // Events are generated for key moments during the season
  // NOTE: Only generate events for TACTICAL mode - dynamic mode doesn't use interactive events
  if (updatedPlayer.careerMode === "tactical") {
    const eventContexts: Array<'post_match_win' | 'post_match_loss' | 'off_season' | 'random'> = [];

    // Determine event contexts based on season performance
    if (seasonResults.wonLeague || seasonResults.wonCup || seasonResults.wonContinental) {
      eventContexts.push('post_match_win', 'post_match_win'); // More win events
    }
    // Check for bad season based on league standing (if available from seasonResults)
    if (!seasonResults.wonLeague && !seasonResults.wonCup && updatedPlayer.form < 0) {
      eventContexts.push('post_match_loss', 'post_match_loss'); // Bad season = more negative opportunities
    }
    eventContexts.push('off_season', 'random'); // Always some off-season and random events

    // Generate events for each context
    for (const context of eventContexts) {
      const generatedEvents = generateRandomEvents(
        updatedPlayer,
        context,
        ageForThisSeason, // Use age as season identifier
      Math.floor(Math.random() * SEASON_WEEKS)
    );

    // Add generated events to player's active events
    for (const event of generatedEvents) {
      updatedPlayer = addEventToPlayer(updatedPlayer, event);

      // Add to season events for UI display
      seasonEvents.push({
        type: "interactive_event",
        description: `events.generated.${event.type}`,
        descriptionParams: { eventType: event.type },
      });
    }
  }
  } // End of tactical mode check for interactive events

  // ========== 7. OBJETIVOS E LIFECYCLE DO JOGADOR ==========
  // Lida com tempo de jogo, frustrações e oportunidades de empréstimo
  const seasonNumberForLifecycle = updatedPlayer.age - 14; // Approximate season number based on age
  const playingTimeResult = handlePlayingTime(
    updatedPlayer,
    actualMatchesPlayed,
    totalMatchesForClub,
    seasonNumberForLifecycle
  );
  updatedPlayer = playingTimeResult.updatedPlayer;
  seasonEvents.push(...playingTimeResult.events);
  isForcedToMove = isForcedToMove || playingTimeResult.isForcedToMove;
  agitatingForTransfer =
    agitatingForTransfer || playingTimeResult.agitatingForTransfer;

  // Checa aposentadoria
  const retirementResult = checkRetirement(
    updatedPlayer,
    performanceRating,
    actualMatchesPlayed,
  );
  updatedPlayer = retirementResult.updatedPlayer;
  seasonEvents.push(...retirementResult.events);

  // Atualiza o valor de mercado
  updatedPlayer = updateMarketValue(updatedPlayer, performanceRating);

  // Atualiza progresso dos objetivos e gera novos
  const goalsResult = updateGoalsProgress(
    updatedPlayer,
    updatedPlayer.playerGoals,
    ageForThisSeason,
    {
      goals,
      assists,
      matches: actualMatchesPlayed,
      rating: performanceRating,
    },
    competitionData,
  );
  goalsResult.completedGoals.forEach((completedGoal) => {
    if (completedGoal.rewards.narrative) {
      const isV2 = (completedGoal as any).objectiveKind;
      const params: any = { narrative: completedGoal.rewards.narrative };
      if (isV2) {
        params.v2 = 1;
        params.objectiveKind = (completedGoal as any).objectiveKind;
        params.outcome = (completedGoal as any).descriptionParams?.outcome || "met";
        params.origin = (completedGoal as any).origin;
      }

      seasonEvents.push({
        type: "goal_achieved",
        description: "events.goals.achieved",
        descriptionParams: params,
      });

      // Social/Media reaction hooks (simple): praise for met/stretch.
      if (isV2 && params.outcome !== "failed") {
        seasonEvents.push({
          type: "media_praise",
          description: "events.media.objectiveMet",
          descriptionParams: {
            objectiveKind: params.objectiveKind,
            outcome: params.outcome,
          },
        });
      }
    }

    updatedPlayer.morale = updateMorale(
      updatedPlayer.morale,
      completedGoal.rewards.moraleBoost > 0 ? "up" : "down",
      Math.abs(completedGoal.rewards.moraleBoost),
    );
    followerGrowthTotal += completedGoal.rewards.followerBoost;
  });

  // V2 failures (stored as expired goals with v2 flag)
  const v2Failed = goalsResult.expiredGoals.filter(
    (g: any) => g?.descriptionParams?.v2 && g?.descriptionParams?.outcome === "failed",
  );
  v2Failed.forEach((g: any) => {
    seasonEvents.push({
      type: "media_criticism",
      description: "events.media.objectiveFailed",
      descriptionParams: {
        objectiveKind: g.objectiveKind,
        origin: g.origin,
      },
    });

    // If a promise was failed, it can trigger transfer agitation realistically.
    if (g.objectiveKind === "promise") {
      seasonEvents.push({
        type: "unhappy_lack_of_playing_time",
        description: "events.role.promiseBroken",
      });
    }
  });
  goalsResult.newGoals.forEach((newGoal) => {
    seasonEvents.push({
      type: "milestone",
      description: `events.goals.newGoal`,
      descriptionParams: { goal: newGoal.description },
    });
  });
  updatedPlayer.playerGoals = goalsResult.updatedGoals;

  // ========== 8. LÓGICA DE CLUBE E LIGA PÓS-TEMPORADA ==========
  // Retorno de empréstimos
  if (
    updatedPlayer.parentClub &&
    updatedPlayer.loanDuration &&
    updatedPlayer.loanDuration > 0
  ) {
    updatedPlayer.loanDuration--;
    if (updatedPlayer.loanDuration === 0) {
      // FIX: Delay return to next season so UI shows loan club during summary
      updatedPlayer.pendingLoanReturn = true;

      seasonEvents.push({
        type: "loan_recalled",
        description: "events.loan.spellEnded",
        descriptionParams: { loanTeam: updatedPlayer.team.name, parentTeam: updatedPlayer.parentClub.name },
      });

      // Handle Parent Club Contract Renewal (since we skip main block)
      // IMPORTANTE: Sempre renovar se contrato expirou ou está próximo de expirar
      // para evitar que jogador fique preso no empréstimo
      if (updatedPlayer.contractLength <= 1) {
        const parentClub = allTeams.find(
          (t) => t.id === updatedPlayer.parentClub!.id,
        );
        if (parentClub) {
          // Auto-renew for simplicity if returning
          // Garantir contrato mínimo de 2 anos ao retornar
          updatedPlayer.contractLength = Math.max(
            2,
            updatedPlayer.contractLength + rand(2, 4),
          );
          seasonEvents.push({
            type: "contract_renewal",
            description: "events.contract.parentExtended",
            descriptionParams: { team: parentClub.name },
          });
        }
      }
    }
  }

  // Atualiza química do time
  if (!updatedPlayer.parentClub) {
    let chemistryChange = 0;
    const years = updatedPlayer.yearsAtClub;
    chemistryChange +=
      years === 1 ? rand(10, 15) : years <= 4 ? rand(5, 10) : rand(2, 7);
    const moraleIndex = MORALE_LEVELS.indexOf(updatedPlayer.morale);
    chemistryChange += [-6, -3, 0, 3, 6][moraleIndex] || 0;
    if (performanceRating > 0.8) chemistryChange += rand(2, 5);
    else if (performanceRating < 0.2 && actualMatchesPlayed > 15)
      chemistryChange -= rand(1, 4);
    if (actualMatchesPlayed < 10 && updatedPlayer.squadStatus === "Surplus")
      chemistryChange -= rand(3, 6);
    updatedPlayer.teamChemistry = Math.round(
      clamp(updatedPlayer.teamChemistry + chemistryChange, 0, 100),
    );
    if (
      seasonEvents.some((e) => e.type === "trophy" || e.type === "promotion")
    ) {
      updatedPlayer.teamChemistry = clamp(
        updatedPlayer.teamChemistry + rand(5, 10),
        0,
        100,
      );
    }
    if (
      seasonEvents.some(
        (e) => e.type === "demotion" || e.type === "training_bustup",
      )
    ) {
      updatedPlayer.teamChemistry = clamp(
        updatedPlayer.teamChemistry - rand(10, 20),
        0,
        100,
      );
    }
  }

  // (v0.5.6: Consolidação de matchLogs internacionais movida para antes de statsByType)

  const leagueResult = competitionData?.competitions.find(
    (c) => c.type === "League",
  );
  const cupResult = competitionData?.competitions.find((c) => c.type === "Cup");
  const continentalResult = competitionData?.competitions.find(
    (c) => c.type === "Continental",
  );
  const internationalResult = competitionData?.competitions.find(
    (c) => c.type === "International",
  );
  const playerSeasonResult = leagueResult
    ? {
      team: updatedPlayer.team,
      position: leagueResult.position || 0,
    }
    : undefined;

  // Simula mudanças de tier da liga (promoção/rebaixamento)
  // MOVIDO PARA O FINAL DA FUNÇÃO PARA GARANTIR CONSISTÊNCIA COM A TABELA FINAL
  // const updatedTeams = simulateLeagueTierChanges(allTeams, playerSeasonResult);
  // ... (logic moved to end)

  // Re-determina squad status após tudo
  const avgRating =
    typeof avgMatchDisplayRating !== "undefined" && avgMatchDisplayRating > 0
      ? avgMatchDisplayRating
      : 6.5;
  updatedPlayer.squadStatus = updateSquadStatusBasedOnPerformance(
    updatedPlayer,
    {
      rating: avgRating,
      matchesPlayed: actualMatchesPlayed,
      totalAvailable: totalMatchesForClub,
      goals: goals,
      assists: assists,
    },
    undefined,
  );

  // Gerencia promessas de função (Role Promises)
  if (
    (updatedPlayer.roleGuaranteeSeasons &&
      updatedPlayer.roleGuaranteeSeasons > 0) ||
    (updatedPlayer.roleGuaranteeMatches &&
      updatedPlayer.roleGuaranteeMatches > 0)
  ) {
    const statusOrder = [
      "Surplus",
      "Reserve",
      "Prospect",
      "Rotation",
      "Key Player",
      "Captain",
    ];
    const currentIdx = statusOrder.indexOf(updatedPlayer.squadStatus as any);
    const promised = updatedPlayer.promisedSquadStatus || "Key Player";
    const promisedIdx = statusOrder.indexOf(promised as any);
    if (promisedIdx > currentIdx) {
      updatedPlayer.squadStatus = promised as any;
    }
  }

  if (updatedPlayer.roleGuaranteeMatches !== undefined) {
    updatedPlayer.roleGuaranteeMatches = Math.max(
      0,
      (updatedPlayer.roleGuaranteeMatches || 0) - actualMatchesPlayed,
    );
  }
  if (updatedPlayer.roleGuaranteeSeasons !== undefined) {
    updatedPlayer.roleGuaranteeSeasons = Math.max(
      0,
      (updatedPlayer.roleGuaranteeSeasons || 0) - 1,
    );
  }
  const seasonsActive =
    updatedPlayer.roleGuaranteeSeasons !== undefined &&
    updatedPlayer.roleGuaranteeSeasons > 0;
  const matchesActive =
    updatedPlayer.roleGuaranteeMatches !== undefined &&
    updatedPlayer.roleGuaranteeMatches > 0;
  if (!seasonsActive && !matchesActive) {
    if (updatedPlayer.promisedSquadStatus) {
      seasonEvents.push({
        type: "milestone",
        description: "events.role.promisePeriodEnded",
      });
    }
    updatedPlayer.promisedSquadStatus = undefined;
    updatedPlayer.roleGuaranteeSeasons = undefined;
    updatedPlayer.roleGuaranteeMatches = undefined;
  }

  // ========== 9.5. PROMOÇÃO DE JOGADORES JUVENIS AO TIME PRINCIPAL ==========
  // Se o jogador está em um time juvenil, verificar se deve ser promovido
  if (updatedPlayer.team.isYouth && competitionData?.youthSeasonData) {
    const youthData = competitionData.youthSeasonData;
    const shouldPromote =
      (youthData.promotionChance >= 70 && updatedPlayer.age >= 18) ||
      (updatedPlayer.age >= 23) || // Muito velho para base
      (updatedPlayer.age >= 19 && Math.random() * 100 < youthData.promotionChance);

    if (shouldPromote) {
      // Usa a hierarquia explícita para encontrar o próximo time
      const promotionTarget = getPromotionTarget(updatedPlayer.team);

      // Fallback: Se não encontrou pela hierarquia, tenta pelo nome
      const parentTeam = promotionTarget || (() => {
        const mainClub = getMainClub(updatedPlayer.team);
        if (mainClub) return mainClub;

        // Último fallback: busca manual
        return allTeams.find(
          t => t.name.toLowerCase() === updatedPlayer.team.parentClubName?.toLowerCase() && !t.isYouth
        ) || null;
      })();

      if (parentTeam) {
        // Promoção ao time principal ou reserva!
        const oldTeam = updatedPlayer.team;
        updatedPlayer.team = parentTeam;
        updatedPlayer.yearsAtClub = 0;
        updatedPlayer.hasMadeSeniorDebut = !parentTeam.isYouth; // Só marca debut se for time profissional
        updatedPlayer.contractLength = rand(2, 4);
        updatedPlayer.squadStatus = parentTeam.isYouth ? 'Rotation' : 'Prospect';
        updatedPlayer.teamChemistry = rand(30, 50);

        const promotionType = parentTeam.clubHierarchyLevel === "reserve"
          ? 'events.youth.promotedToReserve'
          : 'events.youth.promotedToFirstTeam';

        seasonEvents.push({
          type: 'promotion',
          description: promotionType,
          descriptionParams: {
            youthTeam: oldTeam.name,
            seniorTeam: parentTeam.name,
            promotionChance: Math.round(youthData.promotionChance),
          },
        });

        // Evento adicional baseado na performance
        if (youthData.performanceRating >= 7.5) {
          seasonEvents.push({
            type: 'milestone',
            description: 'events.youth.promotedAfterExcellentSeason',
          });
        }
      } else if (youthData.recommendedAction === 'release' || updatedPlayer.age >= 24) {
        // Não encontrou time principal e jogador é velho demais - liberar
        // Encontra um time de divisão inferior para transferir
        const lowerDivisionTeams = allTeams.filter(
          t => t.country === updatedPlayer.team.country &&
            t.leagueTier >= 2 &&
            t.leagueTier <= 3 &&
            !t.isYouth
        );

        if (lowerDivisionTeams.length > 0) {
          const newTeam = lowerDivisionTeams[Math.floor(Math.random() * lowerDivisionTeams.length)];
          updatedPlayer.team = newTeam;
          updatedPlayer.yearsAtClub = 0;
          updatedPlayer.hasMadeSeniorDebut = true;
          updatedPlayer.contractLength = rand(1, 2);
          updatedPlayer.squadStatus = 'Rotation';

          seasonEvents.push({
            type: 'transfer',
            description: 'events.youth.releasedToProfessional',
            descriptionParams: { newTeam: newTeam.name },
          });
        }
      }
    } else if (youthData.recommendedAction === 'loan' && updatedPlayer.age >= 19) {
      // Recomendação de empréstimo para jogador que não será promovido ainda
      seasonEvents.push({
        type: 'milestone',
        description: 'events.youth.loanRecommended',
        descriptionParams: {
          scoutingInterest: Math.round(youthData.scoutingInterest),
        },
      });
    }
  }

  // ========== 10. RENOVAÇÃO DE CONTRATO AUTOMÁTICA ==========
  if (
    !updatedPlayer.retired &&
    !updatedPlayer.parentClub &&
    updatedPlayer.team.name !== "Free Agent"
  ) {
    const nearExpiry = updatedPlayer.contractLength <= 1;
    const notSurplus = updatedPlayer.squadStatus !== "Surplus";
    // Skip renewal if pending loan return (handled in loan block)
    if (nearExpiry && notSurplus && !updatedPlayer.pendingLoanReturn) {
      const baseProb = 0.55;
      const approvalBoost = (updatedPlayer.clubApproval || 50) / 200;
      const statusBoost =
        updatedPlayer.squadStatus === "Key Player" ||
          updatedPlayer.squadStatus === "Captain"
          ? 0.25
          : updatedPlayer.squadStatus === "Rotation"
            ? 0.12
            : 0.0;
      const tierBoost =
        updatedPlayer.team.leagueTier === 1
          ? 0.08
          : updatedPlayer.team.leagueTier === 2
            ? 0.04
            : 0.0;
      const renewProbability = Math.min(
        0.95,
        baseProb + approvalBoost + statusBoost + tierBoost,
      );

      if (Math.random() < renewProbability) {
        const treatAsPromotion =
          (updatedPlayer.team.leagueTier === 1 &&
            (updatedPlayer.squadStatus === "Key Player" ||
              updatedPlayer.squadStatus === "Captain")) ||
          (updatedPlayer.squadStatus === "Key Player" &&
            updatedPlayer.age <= 31);
        const { updatedPlayer: renewed, event } = processContractRenewal(
          updatedPlayer,
          treatAsPromotion,
        );
        updatedPlayer = renewed;
        seasonEvents.push(event);
      } else if (updatedPlayer.contractLength === 0) {
        isForcedToMove = true;
        seasonEvents.push({
          type: "contract_expired",
          description: "events.contract.noOffer",
          descriptionParams: { team: updatedPlayer.team.name },
        });
      }
    }
  }

  // ========== SEASON FOCUS EFFECTS (lightweight) ==========
  // Apply small, controlled modifiers to match the chosen season narrative.
  // (Season-at-a-time simulation: we bias aggregate outputs only.)
  const focus = updatedPlayer.seasonFocus;
  if (focus) {
    if (focus === "scoring") {
      goals = Math.round(goals * 1.06);
      assists = Math.round(assists * 0.97);
    } else if (focus === "playmaking") {
      assists = Math.round(assists * 1.06);
      goals = Math.round(goals * 0.97);
    } else if (focus === "consistency") {
      // Slightly better average season rating
      performanceRating = clamp(performanceRating + 0.08, 0, 10);
    } else if (focus === "titles") {
      // No direct bias here (trophies come from competitions), but keep morale/approval slightly better
      updatedPlayer.clubApproval = clamp((updatedPlayer.clubApproval || 50) + 1, 0, 100);
    }
  }

  // Calculate stats by competition type for accurate awards
  const statsByType = {
    league: {
      goals: leagueResult?.goals || 0,
      assists: leagueResult?.assists || 0,
      cleanSheets: leagueResult?.cleanSheets || 0,
      matches: leagueResult?.matchesPlayed || 0,
    },
    cup: {
      goals: cupResult?.goals || 0,
      assists: cupResult?.assists || 0,
      cleanSheets: cupResult?.cleanSheets || 0,
      matches: cupResult?.matchesPlayed || 0,
    },
    continental: {
      goals: continentalResult?.goals || 0,
      assists: continentalResult?.assists || 0,
      cleanSheets: continentalResult?.cleanSheets || 0,
      matches: continentalResult?.matchesPlayed || 0,
    },
    international: {
      goals: internationalResult?.goals || 0,
      assists: internationalResult?.assists || 0,
      cleanSheets: internationalResult?.cleanSheets || 0,
      matches: internationalResult?.matchesPlayed || 0,
    },
  };

  // ========== 8. SIMULAÇÃO DE PRÊMIOS ==========
  // Check for trophies in seasonEvents to populate seasonResults
  const wonLeague = seasonEvents.some(
    (e) => e.type === "trophy" && e.trophyKey === "league",
  );
  const wonCup = seasonEvents.some(
    (e) => e.type === "trophy" && e.trophyKey === "cup",
  );
  const wonContinental = seasonEvents.some(
    (e) =>
      e.type === "trophy" &&
      (e.trophyKey === "championsLeague" ||
        e.trophyKey === "libertadores" ||
        e.trophyKey === "europaLeague" ||
        e.trophyKey === "conferenceLeague" ||
        e.trophyKey === "copaSudamericana"),
  );

  // Update existing seasonResults object
  seasonResults.wonLeague = wonLeague;
  seasonResults.wonCup = wonCup;
  seasonResults.wonContinental = wonContinental;
  seasonResults.leaguePosition = wonLeague ? 1 : rand(2, 20);
  seasonResults.continentalCompetitionName =
    competitionData?.competitions.find((c) => c.type === "Continental")
      ?.competition || undefined;

  // NOTA: simulateAwards já foi chamado anteriormente com earlyStatsByType
  // Não duplicamos a chamada aqui para evitar prêmios duplicados

  // Persist qualification for next season
  if (competitionData?.nextSeasonQualification) {
    updatedPlayer.nextSeasonQualification =
      competitionData.nextSeasonQualification;
  }

  // ========== 9. AGREGAÇÃO FINAL E RETORNO ==========
  updatedPlayer.matchHistory.push(...matchLogs);

  // ========== 3. CRIAÇÃO DO LOG DA TEMPORADA ==========
  // Calculate actual W-D-L from matchLogs
  const matchesWon = matchLogs.filter((m) => m.result === "W").length;
  const matchesDrawn = matchLogs.filter((m) => m.result === "D").length;
  const matchesLost = matchLogs.filter((m) => m.result === "L").length;

  // Extract trophies and awards for the log
  const trophiesWon: string[] = [];
  const awardsWon: (string | { name: string; stats?: any })[] = [];
  const processedTrophies = new Set<string>();

  seasonEvents.forEach((event) => {
    if (event.type === "trophy") {
      const rawKey = event.trophyKey || event.description;
      // Normalize key to prevent duplicates and display issues
      const key = rawKey.replace("trophiesSection.", "").replace("trophy.", "");

      // Prevent duplicates in the season log
      if (!processedTrophies.has(key)) {
        trophiesWon.push(key);
        processedTrophies.add(key);
      }
    } else if (
      [
        "ballon_dor_win",
        "fifa_best_win",
        "golden_boy_win",
        "golden_boot_win",
        "team_of_the_year_win",
        // "award_nomination" removido - indicações não são prêmios ganhos
        "golden_glove_win",
        "award_win",
      ].includes(event.type)
    ) {
      // Handle detailed awards (objects) or simple strings
      if (event.metadata) {
        awardsWon.push({
          name: event.description,
          stats: event.metadata,
        });
      } else {
        awardsWon.push(event.description);
      }
    }
  });

  const finalAverageRating =
    typeof avgMatchDisplayRating !== "undefined" && avgMatchDisplayRating > 0
      ? Number(avgMatchDisplayRating.toFixed(2))
      : 0;

  const seasonLog: CareerLog = {
    age: ageForThisSeason,
    team: teamForThisSeason, // Fix: Use the team the player started the season with (handles loan returns correctly)
    squadStatus: updatedPlayer.squadStatus, // Keep existing squadStatus
    season: `${ageForThisSeason}a`, // Format: Age + 'a' (e.g., "18a")
    stats: {
      matchesPlayed: actualMatchesPlayed,
      goals: goals,
      assists: assists,
      overall: updatedPlayer.stats.overall, // Keep existing overall
      cleanSheets: updatedPlayer.position === "GK" ? cleanSheets : undefined,
      matchStats: matchStats,
      gamesStarted: matchStats?.gamesStarted ?? actualMatchesPlayed,
      minutesPlayed: matchStats?.minutesPlayed ?? actualMatchesPlayed * 90,

      matchesWon,
      matchesDrawn,
      matchesLost,
      matchWinRate:
        actualMatchesPlayed > 0 ? matchesWon / actualMatchesPlayed : 0,
      averageRating: finalAverageRating,
      seasonGoalFrequency:
        actualMatchesPlayed > 0 ? goals / actualMatchesPlayed : 0,
      seasonAssistFrequency:
        actualMatchesPlayed > 0 ? assists / actualMatchesPlayed : 0,
      careerHighGoals: false,
      careerHighAssists: false,
      monthlyAwards: 0,
      playerOfTheMatch: matchStats?.manOfTheMatch ?? 0,
      teamOfTheWeek: matchStats?.teamOfTheWeek ?? 0,
      hatTricks: matchStats?.hatTricks ?? 0,
    },
    events: seasonEvents,
    followerGrowth: followerGrowthTotal,
    reputationChange: reputationChangeTotal,
    competitionData,
    trophies: trophiesWon,
    awards: awardsWon,
  };

  // ========== 10. ATUALIZAÇÃO DE DIVISÕES (PROMOÇÃO/REBAIXAMENTO) ==========
  // Agora passamos a tabela final para garantir consistência
  const finalTable = leagueResult?.finalTable;

  const finalUpdatedTeams = simulateLeagueTierChanges(allTeams, {
    country: player.team.country,
    tier: player.team.leagueTier,
    finalTable: finalTable,
  });

  // Check for promotion/relegation events based on the FINAL simulation
  const playerTeamAfterSim = finalUpdatedTeams.find(
    (t) => t.id === updatedPlayer.team.id,
  );

  if (playerTeamAfterSim) {
    const oldTier = updatedPlayer.team.leagueTier;
    const newTier = playerTeamAfterSim.leagueTier;
    if (newTier < oldTier) {
      seasonEvents.push({
        type: "promotion",
        description: "events.league.promoted",
        descriptionParams: { team: updatedPlayer.team.name },
      });
      updatedPlayer.morale = updateMorale(updatedPlayer.morale, "up", 1);
    } else if (newTier > oldTier) {
      seasonEvents.push({
        type: "demotion",
        description: "events.league.relegated",
        descriptionParams: { team: updatedPlayer.team.name },
      });
      updatedPlayer.morale = updateMorale(updatedPlayer.morale, "down", 1);
    }
    updatedPlayer.team = playerTeamAfterSim;
  }

  // ========== EVENT GENERATION FOR NEWS ==========

  // 1. Professional Debut
  if (!player.hasMadeSeniorDebut && actualMatchesPlayed > 0) {
    updatedPlayer.hasMadeSeniorDebut = true;
    seasonEvents.push({
      type: 'debut',
      description: 'events.debut'
    });
  }

  // 2. First Career Title
  const previousTrophies = Object.values(player.trophies).reduce((a, b) => a + b, 0);
  const currentTrophies = Object.values(updatedPlayer.trophies).reduce((a, b) => a + b, 0);
  if (previousTrophies === 0 && currentTrophies > 0) {
    seasonEvents.push({
      type: 'first_title',
      description: 'events.firstTitle'
    });
  }

  // 3. Continental Qualification
  if (competitionData?.nextSeasonQualification?.qualified) {
    seasonEvents.push({
      type: 'continental_qualification',
      description: 'events.continentalQualification',
      descriptionParams: {
        competition: competitionData.nextSeasonQualification.competitionName || 'Continental Cup'
      }
    });
  }

  // 4. World Cup Qualification
  const wasQualified = player.worldCupQualifiersData?.playerQualified;
  const isQualified = updatedPlayer.worldCupQualifiersData?.playerQualified;
  if (!wasQualified && isQualified) {
    seasonEvents.push({
      type: 'world_cup_qualification',
      description: 'events.wcQualification'
    });
  }

  // ========== NEWS GENERATION ==========
  const currentSeasonYear = updatedPlayer.age; // Usando idade como proxy para temporada

  // 1. Converter eventos da temporada em notícias
  const seasonNews = convertEventsToNews(updatedPlayer, seasonEvents, currentSeasonYear);
  seasonNews.forEach(item => {
    updatedPlayer = addNewsToPlayer(updatedPlayer, item);
  });

  // 2. Verificar marcos atingidos
  const previousStats = {
    goals: player.totalGoals,
    assists: player.totalAssists,
    caps: player.internationalCaps
  };
  const currentStats = {
    goals: updatedPlayer.totalGoals,
    assists: updatedPlayer.totalAssists,
    caps: updatedPlayer.internationalCaps
  };

  const milestoneNews = checkMilestoneNews(updatedPlayer, previousStats, currentStats, currentSeasonYear);
  milestoneNews.forEach(item => {
    updatedPlayer = addNewsToPlayer(updatedPlayer, item);
  });

  // ========== UPDATE RELATIONSHIPS FOR SEASON ==========
  // Update fan and press relationships based on season performance
  if (updatedPlayer.socialData) {
    updatedPlayer.socialData = updateRelationshipsForSeason(
      updatedPlayer.socialData,
      finalAverageRating,
      updatedPlayer.clubApproval,
      goals,
      assists
    );
  } else {
    // Ensure social data exists for older saves
    updatedPlayer.socialData = ensureSocialData(updatedPlayer);
  }

  // ========== RESET SEASONAL EVENT FLAGS ==========
  // Reset temporary event flags that should only last 1 season
  const currentSeasonNumber = updatedPlayer.age - 14; // Approximate season number
  updatedPlayer = resetSeasonalEventFlags(updatedPlayer, currentSeasonNumber);

  // Point 7: Sync base stats from expanded attributes for OVR consistency
  // This ensures the Overall rating reflects the expanded attributes visible in UI
  updatedPlayer = syncBaseStatsFromExpanded(updatedPlayer);

  return {
    updatedPlayer,
    seasonLog,
    agitatingForTransfer,
    isForcedToMove,
    updatedTeams: finalUpdatedTeams,
  };
};
