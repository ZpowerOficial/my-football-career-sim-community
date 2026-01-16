import React, {
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  memo,
  useRef,
} from "react";
import { I18nProvider, useI18n } from "./contexts/I18nContext";
import type {
  Player,
  Position,
  Continent,
  CareerLog,
  HighScore,
  Offer,
  TransferOffer,
  LoanOffer,
  Tactic,
  CareerEvent,
  PositionDetail,
  Team,
  CareerMode,
} from "./types";
import { GameState } from "./types";
import { LEAGUES, POSITIONS, CONTINENTS } from "./constants";
import { createPlayer } from "./services/playerCreation";
import { simulateSeason } from "./services/simulation";
import {
  processTransfer,
  processContractRenewal,
} from "./services/transferLogic";
import { generateImprovedOffers } from "./services/improvedTransferSystem";
import { calculateCareerScore } from "./services/careerLogic";
import { updateMorale } from "./services/utils";
import { migrateGoalkeeper } from "./services/goalkeeperMigration";
import { migratePlayerStats } from "./services/playerStatsMigration";
import { serializeSaveData } from "./utils/serializeSaveData";

// Importar otimizaÃ§Ãµes mobile
import { GameStorage } from "./utils/mobileOptimizations";

import { App as CapacitorApp } from "@capacitor/app";

// Importar Play Games Service
import { PlayGamesService } from "./services/playGamesService";

// Importar sistema de diversidade
import {
  recordCareerStart,
  applyXPBonus,
  updateDiversityOnRetirement,
} from "./services/diversitySystem";

// Hook para memÃ³ria de scroll
const useScrollMemory = (key: string) => {
  const saveScroll = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem(`scroll_${key}`, scrollY.toString());
  }, [key]);

  const restoreScroll = useCallback(() => {
    const savedScroll = sessionStorage.getItem(`scroll_${key}`);
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
      }, 100); // Pequeno delay para garantir que o DOM esteja renderizado
    }
  }, [key]);

  return { saveScroll, restoreScroll };
};

// Lazy load de componentes pesados
const CareerDashboard = lazy(() => import("./components/CareerDashboard"));
const Leaderboard = lazy(() => import("./components/Leaderboard"));

// Componentes leves carregados normalmente
import SetupScreen from "./components/SetupScreen";
import SimulatingOverlay from "./components/SimulatingOverlay";
import PauseMenu from "./components/PauseMenu";
import { TrainingModal } from "./components/TrainingModal";
import { Icon } from "./components/ui/Icon";

// Serviços de treinamento
import {
  decideAutoTraining,
  executeTrainingSession,
  applyTrainingResult,
  getTrainingType,
  getTrainer,
} from "./services/trainingService";
import { updateSeasonFinances } from "./services/trainingInvestment";
import { TRAINING_TYPES, type TrainingFocus } from "./types/trainingTypes";

// Sistema de atualizações
import { checkForUpdates, UpdateInfo } from "./services/updateChecker";
import UpdateModal from "./components/UpdateModal";

// Loading fallback
const LoadingFallback: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center h-full w-full bg-[var(--bg-primary)]">
      <div className="text-center">
        <Icon
          name="SoccerBall"
          size={64}
          className="text-[var(--accent-primary)] mb-4 animate-spin mx-auto"
        />
        <p className="text-[var(--text-primary)] text-xl font-semibold">
          {t("common.loading")}
        </p>
      </div>
    </div>
  );
};

const getAllTeams = () => {
  const allTeams: Team[] = [];
  let idCounter = 1;
  for (const country of Object.values(LEAGUES)) {
    for (const division of Object.values(country.divisions)) {
      allTeams.push(...division.map((team) => ({ ...team, id: idCounter++ })));
    }
  }
  return allTeams;
};

import { NATIONALITIES } from "./constants/general";

/**
 * Gets the continent from a nationality/country name
 * Uses NATIONALITIES constant which has proper continent mapping for 210+ countries
 */
const getContinentFromNationality = (nationality: string): Continent => {
  // Find the country in NATIONALITIES (matches by name)
  const nat = NATIONALITIES.find(
    (n) => n.name.toLowerCase() === nationality.toLowerCase(),
  );

  if (nat) {
    return nat.continent as Continent;
  }

  // Fallback: Log warning and return based on common patterns
  console.warn(
    `[getContinentFromNationality] Unknown nationality: ${nationality}, defaulting to Europe`,
  );
  return "Europe";
};

// Importar animaÃ§Ãµes
import CareerStartAnimation from "./components/animations/CareerStartAnimation";
import CareerEndAnimation from "./components/animations/CareerEndAnimation";
import ContractNegotiationModal from "./components/ContractNegotiationModal";
import SeasonFocusModal, { type SeasonFocus } from "./components/SeasonFocusModal";

const App: React.FC = () => {
  const { t } = useI18n();

  // Novo: ao confirmar rescisÃ£o, gerar ofertas imediatamente
  const handleContractTermination = useCallback((updatedPlayer: Player) => {
    setPlayer({ ...updatedPlayer });
    // Gera ofertas imediatamente apÃ³s rescisÃ£o
    const offers = generateImprovedOffers(updatedPlayer, true, true);
    setTransferOffers(offers);
    setIsForcedToMove(true);
  }, []);
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [player, setPlayer] = useState<Player | null>(null);
  const [careerHistory, setCareerHistory] = useState<CareerLog[]>([]);
  const [transferOffers, setTransferOffers] = useState<Offer[]>([]);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAwaitingSimulation, setIsAwaitingSimulation] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [pendingSimulation, setPendingSimulation] = useState(false);

  const [showSeasonFocusModal, setShowSeasonFocusModal] = useState(false);
  const [pendingNextSeasonAfterFocus, setPendingNextSeasonAfterFocus] =
    useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [tactic, setTactic] = useState<Tactic>("Balanced");
  const [isForcedToMove, setIsForcedToMove] = useState(false);
  const [worldTeams, setWorldTeams] = useState<Team[]>(() => getAllTeams());
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [isRetiredSave, setIsRetiredSave] = useState(false); // Point 2: Track if saved career is retired
  const [simulationCount, setSimulationCount] = useState(0);
  const hasMigratedLeaderboardThisSession = useRef(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Estado para controlar o passo da tela de setup (landing ou create)
  const [setupStep, setSetupStep] = useState<"landing" | "create">("landing");

  // Estados para animaÃ§Ãµes de pÃ¡gina
  const [currentPage, setCurrentPage] = useState<GameState>(GameState.SETUP);
  const [nextPage, setNextPage] = useState<GameState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    "left" | "right"
  >("right");

  // Estados para animaÃ§Ãµes Premium
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [showEndAnimation, setShowEndAnimation] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showContractNegotiation, setShowContractNegotiation] = useState(false);

  // Estado para modal de atualização
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Verificar atualizações ao iniciar
  useEffect(() => {
    checkForUpdates().then((info) => {
      if (info?.hasUpdate) {
        setUpdateInfo(info);
      }
    });
  }, []);

  // Load animations setting from local storage
  useEffect(() => {
    const saved = localStorage.getItem("fcs_animations_enabled");
    if (saved !== null) {
      setAnimationsEnabled(saved === "true");
    }
  }, []);

  // Hook para memÃ³ria de scroll
  const { saveScroll, restoreScroll } = useScrollMemory(currentPage.toString());

  // FunÃ§Ã£o de navegaÃ§Ã£o com animaÃ§Ãµes
  const navigateToPage = useCallback(
    (newState: GameState, direction: "left" | "right" = "right") => {
      if (isTransitioning) return;

      // Salvar scroll da pÃ¡gina atual
      saveScroll();

      setNextPage(newState);
      setTransitionDirection(direction);
      setIsTransitioning(true);

      // Aguardar a animaÃ§Ã£o de saÃ­da (300ms)
      setTimeout(() => {
        setCurrentPage(newState);
        setGameState(newState);
        setNextPage(null);
        setIsTransitioning(false);

        // Restaurar scroll da nova pÃ¡gina
        setTimeout(() => {
          restoreScroll();
        }, 50);
      }, 300);
    },
    [isTransitioning, saveScroll, restoreScroll],
  );

  // Wrapper para setGameState que usa navegaÃ§Ã£o animada
  const setGameStateAnimated = useCallback(
    (newState: GameState, direction: "left" | "right" = "right") => {
      navigateToPage(newState, direction);
    },
    [navigateToPage],
  );

  useEffect(() => {
    const savedScores = localStorage.getItem("footballCareerHighScores");
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }

    // Verificar se hÃ¡ save game ao iniciar
    if (GameStorage.hasSave()) {
      setShowLoadDialog(true);
      // Point 2: Check if saved player is retired
      try {
        const saveData = GameStorage.loadGame();
        if (saveData?.player?.retired) {
          setIsRetiredSave(true);
        }
      } catch (e) {
        console.error("[App] Error checking save retirement status:", e);
      }
    }

    // Inicializar Google Play Games (login silencioso)
    PlayGamesService.signInSilently()
      .then((signedIn) => {
        if (signedIn) {
          console.log("[App] Play Games signed in automatically");
        }
      })
      .catch((error) => {
        console.log("[App] Play Games silent sign-in failed:", error);
      });

    // Listener do botÃ£o voltar do Android
    const backListener = CapacitorApp.addListener(
      "backButton",
      ({ canGoBack }) => {
        // Se o leaderboard estiver aberto, fecha ele
        if (showLeaderboard) {
          setShowLeaderboard(false);
          return;
        }

        // Se o menu de pausa estiver aberto, fecha ele
        if (showPauseMenu) {
          setShowPauseMenu(false);
          return;
        }

        if (gameState === GameState.SETUP) {
          if (setupStep === "create") {
            setSetupStep("landing");
          } else {
            CapacitorApp.exitApp();
          }
        } else if (
          gameState === GameState.PLAYING ||
          gameState === GameState.FINISHED
        ) {
          // Abre o menu de pausa
          setShowPauseMenu(true);
        }
      },
    );

    return () => {
      backListener.then((handler) => handler.remove());
    };
  }, [showLeaderboard, showPauseMenu, gameState, setupStep]);

  const saveHighScore = useCallback(
    (newScore: HighScore) => {
      const criteria: (keyof HighScore)[] = [
        "score",
        "goals",
        "assists",
        "matches",
        "cleanSheets",
        "trophies",
        "awards",
      ];
      const allScores = [
        ...highScores.filter((s) => s.name !== newScore.name),
        newScore,
      ];

      const topScores = new Set<HighScore>();

      criteria.forEach((criterion) => {
        allScores.sort(
          (a, b) => (b[criterion] as number) - (a[criterion] as number),
        );
        // Point 3: Expanded to Top 30 per category
        for (let i = 0; i < 30 && i < allScores.length; i++) {
          topScores.add(allScores[i]);
        }
      });

      const updatedScores = Array.from(topScores);
      setHighScores(updatedScores);
      localStorage.setItem(
        "footballCareerHighScores",
        JSON.stringify(updatedScores),
      );
    },
    [highScores],
  );

  const startCareer = (
    position: PositionDetail,
    continent: Continent,
    gender: "male" | "female",
    customName?: string,
    customCountry?: string,
    careerMode?: CareerMode,
  ) => {
    // 🔍 DEBUG: Log inputs received from SetupScreen
    console.log("[StartCareer] Received from SetupScreen:", {
      position,
      continent,
      gender,
      customName: customName ?? "(undefined)",
      customCountry: customCountry ?? "(undefined)",
      careerMode,
    });

    // 🎯 Registrar no sistema de diversidade
    recordCareerStart(position, continent, gender);

    let newPlayer = createPlayer(
      position,
      continent,
      gender,
      customName,
      customCountry,
    );

    // ðŸ”§ Aplicar migraÃ§Ã£o de goleiro se necessÃ¡rio
    if (newPlayer.position === "GK") {
      newPlayer = migrateGoalkeeper(newPlayer);
    }

    // ðŸ”§ v0.5.2: Garantir que stats derivados e expandedData estejam corretos
    newPlayer = migratePlayerStats(newPlayer);

    // 🎮 v0.5.6: Aplicar modo de carreira e inicializar banco
    newPlayer.careerMode = careerMode || "dynamic";
    newPlayer.bankBalance =
      newPlayer.expandedData?.finances?.currentSavings || 0;

    newPlayer.matchHistory = [];
    setPlayer(newPlayer);
    setCareerHistory([
      {
        age: newPlayer.age,
        team: newPlayer.team,
        squadStatus: newPlayer.squadStatus,
        stats: {
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          overall: newPlayer.stats.overall,
          averageRating: 0,
          cleanSheets: 0,
          gamesStarted: 0,
          minutesPlayed: 0,
          matchesWon: 0,
          matchesDrawn: 0,
          matchesLost: 0,
          matchWinRate: 0,
          seasonGoalFrequency: 0,
          seasonAssistFrequency: 0,
          careerHighGoals: false,
          careerHighAssists: false,
          monthlyAwards: 0,
          playerOfTheMatch: 0,
          teamOfTheWeek: 0,
          hatTricks: 0,
        },
        events: [
          {
            type: "start",
            description: `Started career at ${newPlayer.team.name} academy.`,
          },
        ],
        followerGrowth: 0,
        reputationChange: 0,
        season: String(newPlayer.age),
      },
    ]);

    // Trigger Start Animation or Start Game directly
    // Trigger Start Animation or Start Game directly
    if (animationsEnabled) {
      setShowStartAnimation(true);
    } else {
      setGameState(GameState.PLAYING);
    }
  };

  // Helper: compute "real" totals (Professional clubs + Official National Team, exclude youth and friendlies)
  const computeRealTotalsFromHistory = useCallback((hist: CareerLog[]) => {
    const logs = hist.slice(1);
    const proLogs = logs.filter((l) => !l.team.isYouth);
    const clubMatches = proLogs.reduce(
      (sum, l) => sum + (l.stats.matchesPlayed || 0),
      0,
    );
    const clubGoals = proLogs.reduce((sum, l) => sum + (l.stats.goals || 0), 0);
    const clubAssists = proLogs.reduce(
      (sum, l) => sum + (l.stats.assists || 0),
      0,
    );
    let intlCaps = 0,
      intlGoals = 0,
      intlAssists = 0;
    logs.forEach((l) => {
      const comps = l.competitionData?.competitions || [];
      comps
        .filter(
          (c) =>
            c.type === "International" &&
            (c.competition || "").toLowerCase() !== "friendly",
        )
        .forEach((c) => {
          intlCaps += c.matchesPlayed || 0;
          intlGoals += c.goals || 0;
          intlAssists += c.assists || 0;
        });
    });
    return {
      matches: clubMatches + intlCaps,
      goals: clubGoals + intlGoals,
      assists: clubAssists + intlAssists,
    };
  }, []);

  // Função que executa a simulação efetivamente
  const executeSimulation = useCallback(
    async (playerToSimulate: Player) => {
      setIsSimulating(true);

      setTimeout(async () => {
        try {
          const {
            updatedPlayer,
            seasonLog,
            agitatingForTransfer,
            isForcedToMove,
            updatedTeams,
          } = await simulateSeason(playerToSimulate, tactic, worldTeams, t);

          // Acumular estatísticas da temporada atual às estatísticas totais
          // v0.5.8: Preservar campos de treinamento do playerToSimulate
          const playerWithAccumulatedStats = {
            ...updatedPlayer,
            // Preservar configurações de treino do modo dinâmico
            activeTrainingFocuses: playerToSimulate.activeTrainingFocuses,
            activeTrainingFocus: playerToSimulate.activeTrainingFocus,
            activeTrainingIntensity: playerToSimulate.activeTrainingIntensity,
            activeTrainerTier: playerToSimulate.activeTrainerTier,
            // Acumular estatísticas
            totalMatches:
              updatedPlayer.totalMatches + seasonLog.stats.matchesPlayed,
            totalGoals: updatedPlayer.totalGoals + seasonLog.stats.goals,
            totalAssists: updatedPlayer.totalAssists + seasonLog.stats.assists,
            totalCleanSheets:
              updatedPlayer.totalCleanSheets +
              (seasonLog.stats.cleanSheets || 0),
          };
          // ðŸŽ¯ Verificar conquistas de gols/assistÃªncias em tempo real
          const newTotalGoals =
            playerWithAccumulatedStats.totalGoals +
            (playerWithAccumulatedStats.internationalGoals || 0);
          const newTotalAssists =
            playerWithAccumulatedStats.totalAssists +
            (playerWithAccumulatedStats.internationalAssists || 0);
          PlayGamesService.checkGoalAchievements(newTotalGoals);
          PlayGamesService.checkAssistAchievements(newTotalAssists);
          PlayGamesService.checkMatchAchievements(
            playerWithAccumulatedStats.totalMatches +
              (playerWithAccumulatedStats.internationalCaps || 0),
          );
          PlayGamesService.checkOverallAchievements(
            playerWithAccumulatedStats.stats.overall,
          );
          if (playerWithAccumulatedStats.position === "GK") {
            PlayGamesService.checkCleanSheetAchievements(
              playerWithAccumulatedStats.totalCleanSheets,
              true,
            );
          }
          // Verificar conquistas especiais (lenda, idade, temporadas)
          const seasonsPlayed = careerHistory.length;
          PlayGamesService.checkSpecialAchievements(
            playerWithAccumulatedStats,
            seasonsPlayed,
          );

          setWorldTeams(updatedTeams);
          const newHistory = [...careerHistory, seasonLog];
          setCareerHistory(newHistory);
          // Salvar progresso após simulação de temporada
          GameStorage.saveGame({
            ...serializeSaveData({
              player: playerWithAccumulatedStats,
              careerHistory: newHistory,
              worldTeams: updatedTeams,
              tactic,
            }),
          });

          if (isForcedToMove) {
            setIsForcedToMove(true);
          }

          if (playerWithAccumulatedStats.retired) {
            const score = calculateCareerScore(
              playerWithAccumulatedStats,
              newHistory,
            );

            // Recompute "real" career totals: Professional clubs + Official National Team (exclude youth/base, exclude friendlies)
            const logs = newHistory.slice(1);
            const proLogs = logs.filter((l) => !l.team.isYouth);
            const clubMatches = proLogs.reduce(
              (sum, l) => sum + (l.stats.matchesPlayed || 0),
              0,
            );
            const clubGoals = proLogs.reduce(
              (sum, l) => sum + (l.stats.goals || 0),
              0,
            );
            const clubAssists = proLogs.reduce(
              (sum, l) => sum + (l.stats.assists || 0),
              0,
            );
            let intlCaps = 0,
              intlGoals = 0,
              intlAssists = 0;
            logs.forEach((l) => {
              const comps = l.competitionData?.competitions || [];
              comps
                .filter(
                  (c) =>
                    c.type === "International" &&
                    (c.competition || "").toLowerCase() !== "friendly",
                )
                .forEach((c) => {
                  intlCaps += c.matchesPlayed || 0;
                  intlGoals += c.goals || 0;
                  intlAssists += c.assists || 0;
                });
            });
            const realMatches = clubMatches + intlCaps;
            const realGoals = clubGoals + intlGoals;
            const realAssists = clubAssists + intlAssists;

            saveHighScore({
              name: playerWithAccumulatedStats.name,
              score,
              finalOvr: playerWithAccumulatedStats.stats.overall,
              trophies:
                playerWithAccumulatedStats.trophies.league +
                playerWithAccumulatedStats.trophies.cup +
                playerWithAccumulatedStats.trophies.championsLeague +
                playerWithAccumulatedStats.trophies.libertadores +
                playerWithAccumulatedStats.trophies.afcChampionsLeague +
                playerWithAccumulatedStats.trophies.europaLeague +
                playerWithAccumulatedStats.trophies.conferenceLeague +
                playerWithAccumulatedStats.trophies.copaSudamericana +
                playerWithAccumulatedStats.trophies.worldCup +
                playerWithAccumulatedStats.trophies.clubWorldCup +
                playerWithAccumulatedStats.trophies.continentalCup +
                playerWithAccumulatedStats.trophies.nationsLeague +
                playerWithAccumulatedStats.trophies.superCup +
                playerWithAccumulatedStats.trophies.stateCup +
                playerWithAccumulatedStats.trophies.supercopaBrasil +
                playerWithAccumulatedStats.trophies.recopaSudamericana +
                playerWithAccumulatedStats.trophies.cafChampionsLeague +
                playerWithAccumulatedStats.trophies.cafConfederationCup +
                playerWithAccumulatedStats.trophies.afcCup +
                playerWithAccumulatedStats.trophies.concacafChampionsCup +
                playerWithAccumulatedStats.trophies.concacafLeague,
              awards:
                playerWithAccumulatedStats.awards.worldPlayerAward +
                playerWithAccumulatedStats.awards.ballonDor +
                playerWithAccumulatedStats.awards.fifaBestAward +
                playerWithAccumulatedStats.awards.topScorerAward +
                playerWithAccumulatedStats.awards.bestGoalkeeperAward +
                playerWithAccumulatedStats.awards.youngPlayerAward +
                playerWithAccumulatedStats.awards.teamOfTheYear +
                playerWithAccumulatedStats.awards.continentalPlayerAward +
                playerWithAccumulatedStats.awards.leaguePlayerOfYear +
                playerWithAccumulatedStats.awards.goalOfTheYear +
                playerWithAccumulatedStats.awards.cupTopScorer +
                playerWithAccumulatedStats.awards.continentalTopScorer +
                playerWithAccumulatedStats.awards.continentalCompetitionTopScorer,
              matches: realMatches,
              goals: realGoals,
              assists: realAssists,
              position: playerWithAccumulatedStats.position,
              continent: getContinentFromNationality(
                playerWithAccumulatedStats.nationality,
              ),
              cleanSheets: playerWithAccumulatedStats.totalCleanSheets,
              nationality: playerWithAccumulatedStats.nationality,
            });
            setPlayer(playerWithAccumulatedStats);

            // Atualizar Play Games - Fim da Carreira
            PlayGamesService.onCareerEnd(
              playerWithAccumulatedStats,
              newHistory,
              score,
            );

            // ðŸŽ¯ Atualizar sistema de diversidade
            updateDiversityOnRetirement();

            // Trigger End Animation or Finish Game directly
            if (animationsEnabled) {
              setShowEndAnimation(true);
            } else {
              setGameState(GameState.FINISHED);
            }
          } else {
            // Atualizar Play Games - Fim da Temporada
            const seasonScore = calculateCareerScore(
              playerWithAccumulatedStats,
              newHistory,
            );
            PlayGamesService.onSeasonEnd(
              playerWithAccumulatedStats,
              newHistory,
              seasonScore,
            );

            // NOVO SISTEMA DE TRANSFERÃŠNCIAS
            const offers = generateImprovedOffers(
              playerWithAccumulatedStats,
              agitatingForTransfer,
              isForcedToMove,
            );
            setTransferOffers(offers);
            setPlayer(playerWithAccumulatedStats);
          }
        } catch (error) {
          console.error("An error occurred during season simulation:", error);
        } finally {
          setIsSimulating(false);
          setPendingSimulation(false);
          // Reset focus gating
          setPendingNextSeasonAfterFocus(false);
        }
      }, 1500);
    },
    [careerHistory, saveHighScore, tactic, worldTeams, t],
  );

  // Handler para treinamento completo
  const handleTrainingComplete = useCallback(
    (updatedPlayer: Player, _narrativeKey: string) => {
      setPlayer(updatedPlayer);
      setShowTrainingModal(false);
      // Salvar progresso após treinamento
      GameStorage.saveGame({
        ...serializeSaveData({
          player: updatedPlayer,
          careerHistory,
          worldTeams,
          tactic,
        }),
      });
      // Após o treinamento, executar a simulação
      if (pendingSimulation) {
        executeSimulation(updatedPlayer);
      }
    },
    [pendingSimulation, executeSimulation],
  );

  // Handler para pular treinamento
  const handleSkipTraining = useCallback(() => {
    setShowTrainingModal(false);
    // Executar simulação sem treinamento
    if (pendingSimulation && player) {
      executeSimulation(player);
    }
  }, [pendingSimulation, player, executeSimulation]);

  // Processamento automático de treinamento (Modo Dinâmico)
  // v0.5.9: Suporta múltiplos treinos por temporada
  const processAutoTrainingNew = useCallback(
    (playerToProcess: Player): Player => {
      console.log("[DEBUG TRAINING] processAutoTrainingNew chamado");
      console.log("[DEBUG TRAINING] careerMode:", playerToProcess.careerMode);
      console.log("[DEBUG TRAINING] bankBalance:", playerToProcess.bankBalance);

      const decision = decideAutoTraining(playerToProcess);
      console.log("[DEBUG TRAINING] Decisão:", {
        shouldTrain: decision.shouldTrain,
        trainingTypes: decision.trainingTypes?.map((t) => t.id),
        intensity: decision.intensity,
        trainer: decision.trainer?.tier,
      });

      if (
        !decision.shouldTrain ||
        !decision.trainingTypes ||
        decision.trainingTypes.length === 0
      ) {
        console.log("[DEBUG TRAINING] IA decidiu NÃO treinar");
        return {
          ...playerToProcess,
          activeTrainingFocuses: [],
          activeTrainingIntensity: undefined,
          activeTrainerTier: undefined,
        };
      }

      console.log(
        "[DEBUG TRAINING] IA escolheu treinos:",
        decision.trainingTypes.map((t) => t.id),
      );

      // v0.5.9: Aplicar todos os treinos escolhidos
      // v0.5.9: Aplicar todos os treinos escolhidos
      let currentPlayer = playerToProcess;
      const selectedFocuses: TrainingFocus[] = [];

      // v0.5.11: Usar forEach com index para passar o sessionIndex (fadiga acumulada)
      decision.trainingTypes.forEach((trainingType, index) => {
        const session = {
          focus: trainingType.id,
          intensity: decision.intensity,
          trainer: decision.trainer,
          weeksRemaining: trainingType.duration,
          startedSeason: careerHistory.length,
        };

        // Passar o index da sessão para calcular penalidade de fadiga
        const result = executeTrainingSession(
          currentPlayer,
          session,
          trainingType,
          undefined,
          index,
        );
        console.log(
          "[DEBUG TRAINING] Custo do treino",
          trainingType.id,
          ":",
          result.costTotal,
        );
        console.log("[DEBUG TRAINING] Saldo antes:", currentPlayer.bankBalance);
        currentPlayer = applyTrainingResult(currentPlayer, result);
        console.log(
          "[DEBUG TRAINING] Saldo depois:",
          currentPlayer.bankBalance,
        );
        selectedFocuses.push(trainingType.id);
      });

      // Salvar treinos escolhidos para exibição na UI
      const finalPlayer = {
        ...currentPlayer,
        activeTrainingFocuses: selectedFocuses,
        activeTrainingFocus: selectedFocuses[0], // compatibilidade
        activeTrainingIntensity: decision.intensity,
        activeTrainerTier: decision.trainer?.tier,
      };

      console.log(
        "[DEBUG TRAINING] Player final activeTrainingFocuses:",
        finalPlayer.activeTrainingFocuses,
      );

      return finalPlayer;
    },
    [careerHistory.length],
  );

  // Função principal nextSeason que gerencia o fluxo
  const nextSeason = useCallback(async () => {
    if (!player || isSimulating) {
      return;
    }

    // Season Focus step: choose a focus before simulating (only in tactical mode)
    const currentCareerMode = player.careerMode || "dynamic";
    if (currentCareerMode === "tactical" && !showSeasonFocusModal && !pendingNextSeasonAfterFocus) {
      setShowSeasonFocusModal(true);
      setPendingNextSeasonAfterFocus(true);
      return;
    }

    // Atualizar finanças do jogador (adicionar salário ao saldo)
    const playerWithUpdatedFinances = updateSeasonFinances(player);
    setPlayer(playerWithUpdatedFinances);

    const careerMode = playerWithUpdatedFinances.careerMode || "dynamic";

    if (careerMode === "tactical") {
      // Modo Tático: aplicar treinos persistentes automaticamente se definidos
      // v0.5.8: Suporta múltiplos treinos por temporada
      const trainingFocuses =
        playerWithUpdatedFinances.activeTrainingFocuses ||
        (playerWithUpdatedFinances.activeTrainingFocus
          ? [playerWithUpdatedFinances.activeTrainingFocus]
          : []);

      if (trainingFocuses.length > 0) {
        // Aplicar cada treino sequencialmente
        let currentPlayer = playerWithUpdatedFinances;

        // v0.5.11: Usar forEach com index para passar o sessionIndex (fadiga acumulada)
        trainingFocuses.forEach((focus, index) => {
          const trainingType = TRAINING_TYPES.find((t) => t.id === focus);
          if (trainingType) {
            const session = {
              focus: trainingType.id,
              intensity: currentPlayer.activeTrainingIntensity || "medium",
              trainer: null, // Personal trainer separado
              weeksRemaining: trainingType.duration,
              startedSeason: careerHistory.length,
            };
            // Passar o index da sessão para calcular penalidade de fadiga
            const result = executeTrainingSession(
              currentPlayer,
              session,
              trainingType,
              undefined,
              index,
            );
            currentPlayer = applyTrainingResult(currentPlayer, result);
          }
        });

        setPlayer(currentPlayer);
        executeSimulation(currentPlayer);
      } else {
        // Sem treino definido - pular direto para simulação
        executeSimulation(playerWithUpdatedFinances);
      }
    } else {
      // Modo Dinâmico: IA decide e executa automaticamente
      const playerAfterTraining = processAutoTrainingNew(
        playerWithUpdatedFinances,
      );
      setPlayer(playerAfterTraining);
      executeSimulation(playerAfterTraining);
    }
  }, [
    player,
    isSimulating,
    processAutoTrainingNew,
    executeSimulation,
    careerHistory.length,
  ]);

  // Add debugging for simulation state
  useEffect(() => {}, [isSimulating, isAwaitingSimulation, player]);

  // ðŸŽ® Desbloquear conquistas quando o jogo comeÃ§a (quando animaÃ§Ã£o estÃ¡ desabilitada)
  useEffect(() => {
    if (
      gameState === GameState.PLAYING &&
      player &&
      careerHistory &&
      careerHistory.length > 0
    ) {
      // Pequeno delay para garantir que tudo foi inicializado
      const timer = setTimeout(() => {
        PlayGamesService.checkTrophyAchievements(player);
        PlayGamesService.checkAndUnlockAchievements(player, careerHistory);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, player, careerHistory]);

  // Debug logs removed for clean UI

  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));

  const handleAcceptOffer = (offer: Offer) => {
    if (!player) return;

    // Process transfer
    const { updatedPlayer, event, followerChange } = processTransfer(
      player,
      offer as TransferOffer,
    );

    const currentHistory = [...careerHistory];
    const lastLog = currentHistory[currentHistory.length - 1];
    lastLog.events.push(event);

    // Add a specific event for the new contract if it's a permanent transfer
    if (offer.type === "transfer") {
      lastLog.events.push({
        type: "milestone",
        description: `Signed a new ${offer.contractLength}-year contract.`,
      });
    }

    const finalPlayer = {
      ...updatedPlayer,
      socialMediaFollowers: player.socialMediaFollowers + followerChange,
    };

    // Update the state
    setPlayer(finalPlayer);
    setCareerHistory(currentHistory);
    setTransferOffers([]);
    setIsForcedToMove(false);
    // Salvar progresso após transferência
    GameStorage.saveGame({
      ...serializeSaveData({
        player: finalPlayer,
        careerHistory: currentHistory,
        worldTeams,
        tactic,
      }),
    });

    // IMPORTANT: We no longer call nextSeason() automatically.
    // The user can now see the result of their transfer and decide when to proceed.
  };

  const stayAtClub = () => {
    if (!player) return;

    // Se o contrato está expirando (1 ano ou menos), mostrar modal de negociação
    if (player.contractLength <= 1) {
      setShowContractNegotiation(true);
      return;
    }

    // Se não precisa negociar, continua normalmente
    proceedWithStay();
  };

  // Função para processar a decisão de ficar após negociação (ou sem negociação)
  const proceedWithStay = (negotiatedWage?: number, negotiatedYears?: number) => {
    if (!player) return;

    let playerAfterMoraleCheck = { ...player };
    const hasBetterOffer = transferOffers.some(
      (o) =>
        o.type === "transfer" &&
        (o.team.leagueTier < player.team.leagueTier ||
          o.wage > player.wage * 1.5),
    );
    const hasOneClubTrait = player.traits.some(
      (t) => t.name === "One-Club Man",
    );

    if (hasBetterOffer && player.personality === "Ambitious") {
      playerAfterMoraleCheck.morale = updateMorale(player.morale, "down");
    } else if (player.personality === "Loyal" || hasOneClubTrait) {
      const moraleBoost = hasOneClubTrait ? 2 : 1;
      playerAfterMoraleCheck.morale = updateMorale(
        player.morale,
        "up",
        moraleBoost,
      );
      playerAfterMoraleCheck.teamChemistry = clamp(
        player.teamChemistry + (hasOneClubTrait ? 20 : 10),
        0,
        100,
      );
    }

    // Aplicar salário e duração negociados se fornecidos
    if (negotiatedWage !== undefined) {
      playerAfterMoraleCheck.wage = negotiatedWage;
    }
    
    const { updatedPlayer, event } = processContractRenewal(
      playerAfterMoraleCheck,
    );
    
    // Sobrescrever duração do contrato se negociado
    if (negotiatedYears !== undefined) {
      updatedPlayer.contractLength = negotiatedYears;
    }

    const currentHistory = [...careerHistory];
    const lastLog = currentHistory[currentHistory.length - 1];

    if (player.contractLength <= 1) {
      lastLog.events.push(event);
    }

    lastLog.events.push({
      type: "stay",
      description: `Decided to stay at ${player.team.name}.`,
    });

    setPlayer(updatedPlayer);
    setCareerHistory(currentHistory);
    setTransferOffers([]);
    // Salvar progresso após renovar contrato
    GameStorage.saveGame({
      ...serializeSaveData({
        player: updatedPlayer,
        careerHistory: currentHistory,
        worldTeams,
        tactic,
      }),
    });
    // Start next season simulation directly
    nextSeason();
  };

  const loadSaveGame = () => {
    const saveData = GameStorage.loadGame();
    if (saveData) {
      let loadedPlayer = saveData.player;

      // ðŸ”§ Aplicar migraÃ§Ã£o de goleiro se necessÃ¡rio
      if (loadedPlayer && loadedPlayer.position === "GK") {
        loadedPlayer = migrateGoalkeeper(loadedPlayer);
      }

      // ðŸ”§ v0.5.2: Aplicar migraÃ§Ã£o de stats derivados e expandedData
      if (loadedPlayer) {
        loadedPlayer = migratePlayerStats(loadedPlayer);
      }

      setPlayer(loadedPlayer);
      setCareerHistory(saveData.careerHistory);
      setWorldTeams(saveData.worldTeams);
      setTactic(saveData.tactic);
      setGameStateAnimated(GameState.PLAYING);
      setShowLoadDialog(false);

      // ðŸŽ® Desbloquear conquistas retroativamente ao carregar jogo
      if (loadedPlayer && saveData.careerHistory) {
        // Chamar checkTrophyAchievements para desbloquear conquistas de troféus
        PlayGamesService.checkTrophyAchievements(loadedPlayer);
        // Chamar funÃ§Ã£o para desbloquear conquistas gerais
        PlayGamesService.checkAndUnlockAchievements(
          loadedPlayer,
          saveData.careerHistory,
        );
      }
    }
  };

  // FunÃ§Ã£o para mostrar leaderboard com animaÃ§Ã£o
  const showLeaderboardAnimated = useCallback(() => {
    setShowLeaderboard(true);
  }, []);

  // FunÃ§Ã£o para voltar do leaderboard
  const backFromLeaderboard = useCallback(() => {
    setShowLeaderboard(false);
  }, []);
  useEffect(() => {
    if (!showLeaderboard || hasMigratedLeaderboardThisSession.current) return;

    // Prefer in-memory history; fallback to saved game
    let hist: CareerLog[] | null =
      careerHistory && careerHistory.length > 0 ? careerHistory : null;
    let currentName: string | null = player?.name || null;
    if (!hist || !currentName) {
      if (GameStorage.hasSave()) {
        const save = GameStorage.loadGame();
        hist = save?.careerHistory || null;
        currentName = save?.player?.name || null;
      }
    }
    if (!hist || !currentName) return;

    try {
      const real = computeRealTotalsFromHistory(hist);
      const updated = highScores.map((s) =>
        s.name === currentName
          ? {
              ...s,
              matches: real.matches,
              goals: real.goals,
              assists: real.assists,
            }
          : s,
      );
      setHighScores(updated);
      localStorage.setItem("footballCareerHighScores", JSON.stringify(updated));
      hasMigratedLeaderboardThisSession.current = true;
    } catch (e) {
      console.warn("Leaderboard migration skipped:", e);
    }
  }, [
    showLeaderboard,
    highScores,
    player,
    careerHistory,
    computeRealTotalsFromHistory,
  ]);

  const restartGame = () => {
    setPlayer(null);
    setCareerHistory([]);
    setTransferOffers([]);
    setGameStateAnimated(GameState.SETUP);
    setSetupStep("create"); // Vai direto para a criaÃ§Ã£o de jogador
    setShowLeaderboard(false);
    setTactic("Balanced");
    setIsForcedToMove(false);
    setWorldTeams(getAllTeams());
  };

  // Handlers para o menu de pausa
  const handlePauseResume = useCallback(() => {
    setShowPauseMenu(false);
  }, []);

  const handlePauseNewCareer = useCallback(() => {
    setShowPauseMenu(false);
    setPlayer(null);
    setCareerHistory([]);
    setTransferOffers([]);
    setGameState(GameState.SETUP);
    setSetupStep("create");
    setShowLeaderboard(false);
    setTactic("Balanced");
    setIsForcedToMove(false);
    setWorldTeams(getAllTeams());
  }, []);

  const handlePauseMainMenu = useCallback(() => {
    setShowPauseMenu(false);
    setPlayer(null);
    setCareerHistory([]);
    setTransferOffers([]);
    setGameState(GameState.SETUP);
    setSetupStep("landing"); // Vai para o menu principal
    setShowLeaderboard(false);
    setTactic("Balanced");
    setIsForcedToMove(false);
    setWorldTeams(getAllTeams());
  }, []);

  const handlePauseLeaderboard = useCallback(() => {
    setShowPauseMenu(false);
    setShowLeaderboard(true);
  }, []);

  // Save animations setting
  const handleToggleAnimations = useCallback((enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem("fcs_animations_enabled", String(enabled));
  }, []);

  const renderContent = () => {
    if (showLeaderboard) {
      return <Leaderboard scores={highScores} onBack={backFromLeaderboard} />;
    }

    const content = (() => {
      switch (gameState) {
        case GameState.SETUP:
          return (
            <SetupScreen
              onStart={startCareer}
              continents={CONTINENTS}
              onShowLeaderboard={showLeaderboardAnimated}
              onLoadGame={loadSaveGame}
              hasSave={showLoadDialog}
              isRetiredSave={isRetiredSave}
              animationsEnabled={animationsEnabled}
              onToggleAnimations={handleToggleAnimations}
              step={setupStep}
              onStepChange={setSetupStep}
            />
          );
        case GameState.PLAYING:
        case GameState.FINISHED:
          if (!player) return null;
          return (
            <>
              {isSimulating && <SimulatingOverlay />}
              <Suspense fallback={<LoadingFallback />}>
                <CareerDashboard
                  player={player}
                  careerHistory={careerHistory}
                  transferOffers={transferOffers}
                  onNextSeason={nextSeason}
                  onAcceptOffer={handleAcceptOffer}
                  onStay={stayAtClub}
                  onRestart={restartGame}
                  isFinished={gameState === GameState.FINISHED}
                  isSimulating={isSimulating}
                  onShowLeaderboard={showLeaderboardAnimated}
                  tactic={tactic}
                  onTacticChange={setTactic}
                  isForcedToMove={isForcedToMove}
                  onConfirmContractTermination={handleContractTermination}
                  onOpenTraining={() => setShowTrainingModal(true)}
                  onPlayerUpdate={setPlayer}
                />
              </Suspense>
            </>
          );
        default:
          return null;
      }
    })();

    // Apply transition classes
    let className = "page-transition";
    if (isTransitioning) {
      if (nextPage) {
        // Exiting current page
        if (transitionDirection === "left") {
          className += " page-exit-active";
        } else {
          className += " page-exit-to-right-active";
        }
      } else {
        // Entering new page
        if (transitionDirection === "left") {
          className += " page-enter-from-left-active";
        } else {
          className += " page-enter-from-right-active";
        }
      }
    }

    return <div className={className}>{content}</div>;
  };

  // Memoized handlers for animations to prevent re-renders
  const handleStartContextSwitch = useCallback(() => {
    console.log("Context switch triggered");
    setGameState(GameState.PLAYING);

    // ðŸŽ® Desbloquear conquistas no início do jogo
    if (player && careerHistory) {
      PlayGamesService.checkTrophyAchievements(player);
      PlayGamesService.checkAndUnlockAchievements(player, careerHistory);
    }
  }, [player, careerHistory]);

  const handleStartComplete = useCallback(() => {
    setShowStartAnimation(false);
  }, []);

  const handleEndContextSwitch = useCallback(() => {
    setGameState(GameState.FINISHED);
  }, []);

  const handleEndComplete = useCallback(() => {
    setShowEndAnimation(false);
  }, []);

  return (
    <div className="h-screen w-full bg-slate-900 text-white font-sans overflow-hidden relative">
      {/* Premium Animations Overlays - Moved to root for proper z-indexing */}
      {animationsEnabled && showStartAnimation && player && (
        <CareerStartAnimation
          team={player.team}
          playerName={player.name}
          onContextSwitch={handleStartContextSwitch}
          onComplete={handleStartComplete}
        />
      )}

      {animationsEnabled && showEndAnimation && player && (
        <CareerEndAnimation
          playerName={player.name}
          isLegend={highScores.some(
            (s) => s.name === player.name && s.score > 10000,
          )}
          onContextSwitch={handleEndContextSwitch}
          onComplete={handleEndComplete}
        />
      )}

      {/* Menu de Pausa - aparece ao pressionar back no Android */}
      {showPauseMenu && (
        <PauseMenu
          onResume={handlePauseResume}
          onNewCareer={handlePauseNewCareer}
          onMainMenu={handlePauseMainMenu}
          onShowLeaderboard={handlePauseLeaderboard}
          isFinished={gameState === GameState.FINISHED}
        />
      )}

      {/* Modal de Treinamento Completo - v0.5.6 */}
      {player && (
        <TrainingModal
          isOpen={showTrainingModal}
          player={player}
          currentSeason={careerHistory.length}
          onClose={() => {
            setShowTrainingModal(false);
            setPendingSimulation(false);
          }}
          onTrainingComplete={handleTrainingComplete}
          onSkipTraining={handleSkipTraining}
          viewOnly={player.careerMode === "dynamic"}
        />
      )}

      {/* Modal de Atualização Disponível */}
      {updateInfo?.hasUpdate && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setUpdateInfo(null)}
        />
      )}

      {/* Season Focus Modal (shown before simulating a season) */}
      {player && (
        <SeasonFocusModal
          isOpen={showSeasonFocusModal}
          initialFocus={(player.seasonFocus as SeasonFocus) || "scoring"}
          onClose={() => {
            setShowSeasonFocusModal(false);
            setPendingNextSeasonAfterFocus(false);
          }}
          onConfirm={(focus) => {
            // Persist selection
            const updated = { ...player, seasonFocus: focus };
            setPlayer(updated);
            GameStorage.saveGame({
              ...serializeSaveData({
                player: updated,
                careerHistory,
                worldTeams,
                tactic,
              }),
            });
            setShowSeasonFocusModal(false);

            // Continue the flow
            setTimeout(() => {
              setPendingNextSeasonAfterFocus(false);
              nextSeason();
            }, 0);
          }}
        />
      )}

      {/* Modal de Negociação de Contrato */}
      {showContractNegotiation && player && (
        <ContractNegotiationModal
          isOpen={showContractNegotiation}
          player={player}
          careerMode={player.careerMode || "tactical"}
          proposedWage={Math.round(player.wage * 1.1)} // 10% raise as base offer
          proposedYears={player.age > 32 ? 1 : player.age > 30 ? 2 : 3}
          onClose={() => setShowContractNegotiation(false)}
          onAccept={(finalWage, imageRights) => {
            setShowContractNegotiation(false);
            const years = player.age > 32 ? 1 : player.age > 30 ? 2 : 3;
            proceedWithStay(finalWage, years);
          }}
          onReject={() => {
            setShowContractNegotiation(false);
            // Se rejeitar negociação, o jogador fica como agente livre
            // e precisa aceitar uma oferta de transferência
          }}
        />
      )}

      <div className="h-full w-full flex flex-col">
        <div className="flex-1 flex flex-col min-h-0 p-1 sm:p-2 md:p-3 relative">
          <Suspense fallback={<LoadingFallback />}>{renderContent()}</Suspense>
        </div>
      </div>
    </div>
  );
};

function LegalDisclaimerBanner() {
  return (
    <div
      style={{
        background: "#222",
        color: "#ffd700",
        padding: "12px",
        textAlign: "center",
        fontSize: "0.95rem",
        borderBottom: "2px solid #444",
      }}
    >
      <strong>Disclaimer Legal:</strong> Este jogo Ã© uma obra de ficÃ§Ã£o e
      nÃ£o possui qualquer afiliaÃ§Ã£o oficial, patrocÃ­nio ou endosso de ligas,
      clubes, federaÃ§Ãµes ou entidades esportivas reais. Todos os nomes de
      clubes sÃ£o utilizados apenas para fins de entretenimento e simulaÃ§Ã£o.
      Nomes de ligas, competiÃ§Ãµes e prÃªmios sÃ£o genÃ©ricos ou fictÃ­cios.
      Quaisquer semelhanÃ§as com organizaÃ§Ãµes reais sÃ£o meramente
      coincidÃªncia.
    </div>
  );
}

const AppWithI18n: React.FC = () => (
  <I18nProvider>
    <App />
  </I18nProvider>
);

export default AppWithI18n;
