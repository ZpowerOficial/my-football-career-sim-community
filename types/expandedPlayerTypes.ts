/**
 * FOOTBALL CAREER SIMULATOR - EXPANDED PLAYER TYPES v0.5.2
 *
 * Sistema ultra detalhado de atributos, estatísticas e perfil do jogador.
 * Baseado em análise de dados reais de futebol moderno.
 */

// ============================================================================
// PERFIL FÍSICO E BIOMÉTRICO
// ============================================================================

export type PreferredFoot = "Left" | "Right" | "Both";
export type RunningStyle = "Explosive" | "Steady" | "Endurance";
export type BodyType = "Lean" | "Average" | "Stocky" | "Muscular" | "Tall";

export interface PhysicalProfile {
  // Dados biométricos
  height: number; // cm (150-210)
  weight: number; // kg (55-100)
  bmi: number; // Calculado automaticamente
  bodyType: BodyType;

  // Desenvolvimento físico (altura/peso podem mudar com a idade)
  potentialHeight?: number; // Altura potencial máxima (definida na criação)
  peakWeight?: number; // Peso ideal no auge da carreira
  muscleGainRate?: number; // Taxa de ganho muscular (0.5-1.5, afetada por treino)
  metabolismType?: "Fast" | "Normal" | "Slow"; // Afeta ganho/perda de peso

  // Pé preferido
  preferredFoot: PreferredFoot;
  weakFootLevel: number; // 0-5 (0 = praticamente não usa, 5 = ambidestro)

  // Estilo de corrida
  runningStyle: RunningStyle;

  // Posições
  primaryPosition: PositionDetail;
  secondaryPositions: PositionProficiency[];
}

export interface PositionProficiency {
  position: PositionDetail;
  proficiency: number; // 0-100
  isNatural: boolean;
}

// ============================================================================
// ESTILOS DE JOGO E TENDÊNCIAS TÁTICAS
// ============================================================================

export type PlayingStyleCategory =
  // Atacantes
  | "Poacher"
  | "Target Man"
  | "Deep-Lying Forward"
  | "Complete Forward"
  | "Advanced Forward"
  | "False 9"
  | "Inside Forward"
  | "Trequartista"
  // Pontas
  | "Inverted Winger"
  | "Traditional Winger"
  | "Wide Playmaker"
  | "Raumdeuter"
  // Meias
  | "Advanced Playmaker"
  | "Deep-Lying Playmaker"
  | "Box-to-Box"
  | "Ball-Winning Midfielder"
  | "Mezzala"
  | "Regista"
  | "Carrilero"
  // Defensores
  | "Ball-Playing Defender"
  | "Stopper"
  | "Sweeper"
  | "No-Nonsense Defender"
  | "Complete Wing-Back"
  | "Inverted Wing-Back"
  | "Defensive Full-Back"
  // Goleiros
  | "Sweeper Keeper"
  | "Traditional Keeper"
  | "Ball-Playing Keeper";

export type TacticalTendency =
  | "Drops Deep" // Recua para buscar jogo
  | "Attacks Depth" // Ataca profundidade
  | "Floats Between Lines" // Flutua entre linhas
  | "Hugs Touchline" // Abre na ponta
  | "Cuts Inside" // Vem por dentro
  | "Roams From Position" // Sai da posição
  | "Stays Central" // Fica centralizado
  | "Makes Overlapping Runs" // Faz sobreposições
  | "Makes Underlapping Runs"; // Faz infiltrações

export type RiskTendency = "Conservative" | "Balanced" | "Risky";

export interface PlayingStyle {
  primaryStyle: PlayingStyleCategory;
  secondaryStyle?: PlayingStyleCategory;
  tacticalTendencies: TacticalTendency[];
  riskTendency: RiskTendency;

  // Nível de "estrela" midiática (0-100)
  mediaStarLevel: number;
}

// ============================================================================
// ATRIBUTOS TÉCNICOS DETALHADOS
// ============================================================================

export interface TechnicalAttributes {
  // === FINALIZAÇÃO ===
  finishing: FinishingAttributes;

  // === CONTROLE DE BOLA ===
  ballControl: BallControlAttributes;

  // === DRIBLE ===
  dribbling: DribblingAttributes;

  // === PASSE ===
  passing: PassingAttributes;

  // === BOLAS PARADAS ===
  setPieces: SetPieceAttributes;
}

export interface FinishingAttributes {
  finishingInsideBox: number; // 0-99
  finishingOutsideBox: number;
  finishingOnCounter: number;
  finishingUnderPressure: number;
  shotPower: number;
  placedShotAccuracy: number;
  powerShotAccuracy: number;
  headingAccuracy: number;
  headingPower: number;
  volleysAndAcrobatic: number;
  oneOnOneFinishing: number;
}

export interface BallControlAttributes {
  firstTouchOrientated: number; // Domínio orientado
  firstTouchUnderPressure: number;
  aerialControl: number;
  trapping: number;
  shielding: number;
}

export interface DribblingAttributes {
  closeControlDribbling: number; // 1v1 parado
  speedDribbling: number; // Correndo
  congestedSpaceDribbling: number;
  directionChange: number; // Corte seco
  skillMoves: number;
  flair: number;
}

export interface PassingAttributes {
  shortPassingSupport: number;
  shortPassingUnderPressure: number;
  verticalPassBreakingLines: number;
  longDiagonalPass: number;
  throughBalls: number;
  crossingFromByline: number;
  crossingFromDeep: number;
  firstTimeCrossing: number;
  curveEffect: number;
}

export interface SetPieceAttributes {
  directFreeKickPower: number;
  directFreeKickPlacement: number;
  indirectFreeKick: number; // Bola aérea
  cornerKicking: number;
  penaltyTaking: number;
  throwIns: number;
}

// ============================================================================
// ATRIBUTOS FÍSICOS APROFUNDADOS
// ============================================================================

export interface PhysicalAttributes {
  // === VELOCIDADE ===
  speed: SpeedAttributes;

  // === RESISTÊNCIA ===
  endurance: EnduranceAttributes;

  // === FORÇA ===
  strength: StrengthAttributes;

  // === AGILIDADE ===
  agility: AgilityAttributes;

  // === SALTO ===
  jumping: JumpingAttributes;

  // === ROBUSTEZ ===
  robustness: RobustnessAttributes;
}

export interface SpeedAttributes {
  topSpeed: number;
  accelerationInitial: number; // 0-5m
  accelerationMedium: number; // 0-10m
  sprintSpeed: number;
}

export interface EnduranceAttributes {
  aerobicEndurance: number;
  anaerobicEndurance: number;
  stamina: number;
  workRate: number;
}

export interface StrengthAttributes {
  upperBodyStrength: number;
  legStrength: number;
  bodyToBodyStrength: number;
  balanceInContact: number;
}

export interface AgilityAttributes {
  lateralAgility: number;
  reactionTime: number;
  flexibility: number;
  coordination: number;
}

export interface JumpingAttributes {
  standingVerticalJump: number;
  runningVerticalJump: number;
  headerTiming: number;
}

export interface RobustnessAttributes {
  physicalRobustness: number; // Aguenta pancada sem lesão
  injuryResistance: number;
  recoveryRate: number;
  naturalFitness: number;
}

// ============================================================================
// ATRIBUTOS MENTAIS/PSICOLÓGICOS
// ============================================================================

export interface MentalAttributes {
  // === INTELIGÊNCIA DE JOGO ===
  gameIntelligence: GameIntelligenceAttributes;

  // === PERSONALIDADE ===
  personality: PersonalityAttributes;

  // === PERFORMANCE ===
  performance: PerformanceAttributes;
}

export interface GameIntelligenceAttributes {
  decisions: number;
  vision: number;
  creativity: number;
  anticipation: number;
  positioning: number;
  offTheBallMovement: number;
  spatialAwareness: number;
}

export interface PersonalityAttributes {
  composure: number;
  composureInFinishing: number;
  bravery: number;
  determination: number;
  teamwork: number;
  leadershipOnPitch: number;
  charismaOffPitch: number;
  professionalism: number;
  temperament: number; // 0 = calmo, 100 = explosivo
}

export interface PerformanceAttributes {
  consistency: number;
  bigMatchPerformance: number;
  adaptability: number; // Adaptar a novo país/clube/esquema
  pressureHandling: number;
  clutchFactor: number; // Performance em momentos decisivos
}

// ============================================================================
// ATRIBUTOS DEFENSIVOS E PRESSÃO
// ============================================================================

export interface DefensiveAttributes {
  // === MARCAÇÃO ===
  marking: MarkingAttributes;

  // === PRESSÃO ===
  pressing: PressingAttributes;

  // === DESARME ===
  tackling: TacklingAttributes;

  // === INTERCEPTAÇÃO ===
  interception: InterceptionAttributes;

  // === POSICIONAMENTO DEFENSIVO ===
  defensivePositioning: DefensivePositioningAttributes;
}

export interface MarkingAttributes {
  individualMarking: number;
  zonalMarking: number;
  trackingRuns: number;
  closeDownSpeed: number;
}

export interface PressingAttributes {
  pressingTrigger: number; // Quando iniciar pressão
  sustainedPressing: number; // Quantas vezes insiste
  pressIntensity: number;
  counterPressing: number;
}

export interface TacklingAttributes {
  standingTackle: number;
  slidingTackle: number;
  tackleTiming: number;
  cleanTackling: number; // Não cometer falta
}

export interface InterceptionAttributes {
  shortPassInterception: number;
  longPassInterception: number;
  shotBlocking: number;
  crossBlocking: number;
  readingOfPlay: number;
}

export interface DefensivePositioningAttributes {
  covering: number; // Fechar espaço vazio
  jockeying: number; // Conduzir atacante para zona segura
  positionRecovery: number;
  backtracking: number;
  defensiveAwareness: number;
}

// ============================================================================
// ATRIBUTOS DE GOLEIRO
// ============================================================================

export interface GoalkeeperAttributes {
  // === DEFESAS ===
  shotStopping: ShotStoppingAttributes;

  // === POSICIONAMENTO ===
  positioning: GKPositioningAttributes;

  // === JOGO COM OS PÉS ===
  distribution: GKDistributionAttributes;

  // === COMANDAR ÁREA ===
  commanding: CommandingAttributes;

  // === MENTAL ===
  mentalGK: GKMentalAttributes;
}

export interface ShotStoppingAttributes {
  reflexes: number;
  diving: number;
  oneOnOneStopping: number;
  penaltySaving: number;
  longRangeShotStopping: number;
  closeRangeShotStopping: number;
}

export interface GKPositioningAttributes {
  positioning: number;
  rushingOut: number;
  narrowingAngles: number;
  linePositioning: number;
}

export interface GKDistributionAttributes {
  throwing: number;
  kicking: number;
  passingShort: number;
  passingLong: number;
  goalKicks: number;
}

export interface CommandingAttributes {
  commandOfArea: number;
  claimingCrosses: number;
  punching: number;
  communication: number;
  aerialReach: number;
}

export interface GKMentalAttributes {
  concentration: number;
  composure: number;
  decisionMaking: number;
  handling: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - ATAQUE
// ============================================================================

export interface AttackingStatsUltra {
  // xG Detalhado
  xG: number;
  xGPer90: number;
  xGHead: number;
  xGStrongFoot: number;
  xGWeakFoot: number;
  postShotXG: number;
  xGOnTargetPerShot: number;

  // Chutes Detalhados
  shotsTotal: number;
  shotsOnTarget: number;
  shotsBlocked: number;
  shotsOnTargetPercentage: number;
  shotConversionRate: number;
  shotsAfterReceivingInBox: number;
  shotsAfterDribble: number;
  shotsOnCounter: number;

  // Gols por Período
  goals0to15: number;
  goals15to30: number;
  goals30to45: number;
  goals45to60: number;
  goals60to75: number;
  goals75to90Plus: number;

  // Gols por Tipo
  goalsStrongFoot: number;
  goalsWeakFoot: number;
  goalsHeader: number;
  goalsOther: number;
  goalsInsideBox: number;
  goalsOutsideBox: number;
  goalsFirstTouch: number;
  goalsAfterMultipleTouches: number;

  // Gols Clutch
  goalsWhenDrawingOrLosing: number;
  goalsOnCounter: number;
  gameWinningGoals: number;
  equalizerGoals: number;

  // Micro-eventos
  averageShotSpeed: number;
  maxShotSpeedSeason: number;
  longestGoalDistance: number;
  maxJumpHeightHeader: number;
  golazosCount: number; // xG < 0.05
  sittersWasted: number; // xG > 0.5 missed
  oneOnOneConverted: number;
  oneOnOneMissed: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - CRIAÇÃO/PASSE
// ============================================================================

export interface CreationStatsUltra {
  assists: number;
  assistsPer90: number;
  xA: number;
  xAPer90: number;
  keyPassesPer90: number;
  preAssists: number;

  // Assistências por Período (seguindo padrão UFPE)
  assists0to15: number;
  assists15to30: number;
  assists30to45: number;
  assists45to60: number;
  assists60to75: number;
  assists75to90Plus: number;

  // Passes Progressivos
  progressivePassesAttempted: number;
  progressivePassesCompleted: number;
  passesIntoBox: number;
  passesToDZone: number; // Zona do D da área
  passesBreakingMidfield: number;
  passesBreakingDefensiveLine: number;

  // Passes sob Pressão
  passesUnderPressure: number;
  passesUnderPressureCompleted: number;
  passesUnderPressurePercentage: number;

  // Passes Longos e Cruzamentos
  longPassesAttempted: number;
  longPassesCompleted: number;
  crossesAttempted: number;
  crossesCompleted: number;
  crossesLeadingToShot: number;

  // Qualidade de Passe
  passesGeneratingHighXG: number; // xG > 0.2
  counterAttackingPasses: number;
  throughBallsCompleted: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - CONDUÇÃO E DUELOS
// ============================================================================

export interface DuelStatsUltra {
  // Toques
  touchesTotal: number;
  touchesInOppositionBox: number;

  // Conduções
  progressiveCarries: number;
  metersCarriedForwardPer90: number;
  carriesIntoBox: number;
  carriesUnderPressure: number;

  // Dribles
  dribblesAttempted: number;
  dribblesSuccessful: number;
  dribblesPer90: number;
  dribblesStaticOneVOne: number;
  dribblesInTransition: number;

  // Perdas
  possessionLostTotal: number;
  possessionLostDangerousZone: number;
  badFirstTouches: number;

  // Duelos
  groundDuelsWon: number;
  groundDuelsTotal: number;
  aerialDuelsWon: number;
  aerialDuelsTotal: number;

  // Faltas Sofridas
  foulsDrawnTotal: number;
  foulsDrawnDangerousZones: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - DEFESA E PRESSÃO
// ============================================================================

export interface DefensiveStatsUltra {
  // Pressão
  pressuresPer90: number;
  pressuresDefensiveThird: number;
  pressuresMidThird: number;
  pressuresAttackingThird: number;
  pressuresSuccessful: number;

  // Recuperações
  possessionRecoveriesOffensive: number;
  possessionRecoveries5Seconds: number;

  // Desarmes
  tacklesPer90: number;
  tacklesDefensiveThird: number;
  tacklesMidThird: number;
  tacklesAttackingThird: number;

  // Interceptações e Bloqueios
  interceptionsPer90: number;
  shotBlocksPer90: number;
  passBlocksPer90: number;
  clearancesPer90: number;

  // Erros
  errorsLeadingToShot: number;
  errorsLeadingToGoal: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - DISCIPLINA
// ============================================================================

export interface DisciplineStatsUltra {
  foulsCommitted: number;
  foulsPer90: number;
  foulsOffensiveThird: number;
  foulsMidThird: number;
  foulsDefensiveThird: number;
  tacticalFouls: number;

  yellowCards: number;
  secondYellows: number;
  directRedCards: number;
  minutesBetweenCards: number;

  penaltiesConceded: number;
  penaltiesWon: number;

  // Índice interno de reclamações
  complaintsIndex: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - FÍSICO DE PARTIDA
// ============================================================================

export interface MatchPhysicalStats {
  minutesPlayedSeason: number;
  gamesCompletedPercentage: number;

  distancePerGame: number;
  highIntensityDistancePerGame: number;
  sprintsPerGame: number;
  topSprintSpeed: number;

  consecutiveGamesWithoutRest: number;
  accumulatedFatigue: number;

  // Lesões
  injuriesByType: {
    muscular: number;
    impact: number;
    chronic: number;
  };
  daysLostToInjurySeason: number;
  daysLostToInjuryCareer: number;
  injuryProneness: number;
}

// ============================================================================
// ESTATÍSTICAS ULTRA NERD - JOGADAS DE EFEITO (v0.5.2)
// ============================================================================

/**
 * Flair plays statistics - special moves that players with specific traits perform frequently
 * Example: Yamal with "Outside Foot Shot" trait does several trivela passes per game
 *
 * All variable names in English for consistency
 */
export interface FlairPlaysStats {
  // === SPECIAL PASSES ===
  trivelaPasses: number; // Outside foot passes
  noLookPasses: number; // No-look passes
  backheelPasses: number; // Backheel passes
  rabonaPasses: number; // Rabona passes (letra in PT-BR)
  flairedThroughBalls: number; // Through balls with special effect

  // === SPECIAL SHOTS ===
  // Chip shots (cavadinha)
  chipShotAttempts: number;
  chipShotGoals: number;

  // Outside foot shots (trivela)
  trivelaShotAttempts: number;
  trivelaShotGoals: number;

  // Finesse shots (colocado)
  finesseShotAttempts: number;
  finesseShotGoals: number;

  // Power shots (bomba)
  powerShotAttempts: number;
  powerShotGoals: number;

  // Rabona shots (letra)
  rabonaShotAttempts: number;
  rabonaShotGoals: number;

  // Volleys
  volleyAttempts: number;
  volleyGoals: number;

  // Bicycle kicks (bicicleta)
  bicycleKickAttempts: number;
  bicycleKickGoals: number;

  // Scorpion kicks
  scorpionKickAttempts: number;
  scorpionKickGoals: number;

  // === SPECIAL DRIBBLES ===
  elasticos: number; // Elastico/flip-flap
  stepOvers: number; // Pedaladas
  nutmegs: number; // Canetas
  rainbowFlicks: number; // Lambretas
  sombrereos: number; // Chapéus (lob over defender)
  roulettes: number; // Roletas (Maradona/Zidane turn)
  laCroquetas: number; // Cortes secos
  skillMoves: number; // Generic skill moves (firulas)
  keepyUppies: number; // Embaixadinhas during play
  flairTackles: number; // Stylish slide tackles

  // === SPECIAL CROSSES ===
  trivelaCrosses: number; // Outside foot crosses
  rabonaCrosses: number; // Rabona crosses
  backheelCrosses: number; // Backheel crosses

  // === SPECIAL SET PIECES ===
  stutterStepPenalties: number; // Penalties with stutter step (paradinha)
  panenkaPenalties: number; // Panenka (chip penalty)
  knuckleballFreeKicks: number; // Knuckleball free kicks
  curlingFreeKicks: number; // Curling/finesse free kicks

  // === BONUS ===
  iconicCelebrations: number; // Iconic celebrations performed

  // === AGGREGATED STATS ===
  totalFlairPlays: number; // Total flair plays this season
  flairPlaysPerGame: number; // Average per game
  successfulFlairPlays: number; // Plays that resulted in something positive
  flairPlaySuccessRate: number; // Success rate (%)
}

// ============================================================================
// CARREIRA, REPUTAÇÃO E FINANÇAS
// ============================================================================

export interface CareerFinanceStats {
  professionalDebutAge: number;
  youthNationalTeamCaps: number;
  youthNationalTeamGoals: number;
  nationalTeamTitles: string[];

  teamOfTheWeekCount: number;
  teamOfTheMonthCount: number;
  teamOfTheYearCount: number;

  // Reputação
  localReputation: number;
  continentalReputation: number;
  worldReputation: number;
  clubReputation: "Icon" | "Important" | "Rotation" | "Fringe";

  // Salário
  weeklyWage: number;
  monthlyWage: number;
  annualWage: number;

  // v0.5.6 - Finanças pessoais
  totalEarnings: number;    // Total ganho na carreira (€)
  totalSpent: number;       // Total gasto (treinos, etc) (€)
  currentSavings: number;   // Saldo atual (€)

  // Bônus
  goalBonus: number;
  assistBonus: number;
  trophyBonus: number;
  appearanceBonus: number;

  // Cláusulas
  releaseClause?: number;
  autoRenewalClause?: boolean;
  performanceIncreaseClause?: boolean;

  // Valor de Mercado
  currentMarketValue: number;
  peakMarketValue: number;
  peakMarketValueAge: number;
}

// ============================================================================
// INTERFACE PRINCIPAL - JOGADOR EXPANDIDO
// ============================================================================

export interface ExpandedPlayerData {
  finances: any;
  // Perfil Físico
  physicalProfile: PhysicalProfile;

  // Estilo de Jogo
  playingStyle: PlayingStyle;

  // Atributos Técnicos
  technicalAttributes: TechnicalAttributes;

  // Atributos Físicos
  physicalAttributes: PhysicalAttributes;

  // Atributos Mentais
  mentalAttributes: MentalAttributes;

  // Atributos Defensivos
  defensiveAttributes: DefensiveAttributes;

  // Atributos de Goleiro (se aplicável)
  goalkeeperAttributes?: GoalkeeperAttributes;

  // Estatísticas Ultra Nerd (temporada atual)
  attackingStats: AttackingStatsUltra;
  creationStats: CreationStatsUltra;
  duelStats: DuelStatsUltra;
  defensiveStats: DefensiveStatsUltra;
  disciplineStats: DisciplineStatsUltra;
  matchPhysicalStats: MatchPhysicalStats;

  // v0.5.2: Estatísticas de Jogadas de Efeito
  flairPlaysStats: FlairPlaysStats;

  // Carreira e Finanças
  careerFinanceStats: CareerFinanceStats;
}

// Import PositionDetail from main types
import type { PositionDetail } from "../types";
