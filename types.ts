import type { ExpandedPlayerData } from "./types/expandedPlayerTypes";
import type { TrainingFocus as TrainingFocusType } from "./types/trainingTypes";

export enum GameState {
  SETUP,
  PLAYING,
  FINISHED,
}

export type Position = "Attacker" | "Midfielder" | "Defender" | "Goalkeeper";

export type PositionDetail =
  | "GK"
  | "LWB"
  | "LB"
  | "CB"
  | "RB"
  | "RWB"
  | "CDM"
  | "LM"
  | "CM"
  | "RM"
  | "CAM"
  | "LW"
  | "CF"
  | "RW"
  | "ST";

export type Continent =
  | "Europe"
  | "Africa"
  | "Asia"
  | "Australia"
  | "North America"
  | "South America";

export type Personality =
  | "Ambitious"
  | "Lazy"
  | "Professional"
  | "Temperamental"
  | "Loyal"
  | "Determined"
  | "Media Darling"
  | "Reserved"
  | "Inconsistent"
  | "Leader";

export type Morale = "Very High" | "High" | "Normal" | "Low" | "Very Low";

export type Tactic =
  | "Attacking"
  | "Defensive"
  | "Balanced"
  | "Possession"
  | "Direct"
  | "Counter"
  | "High Press";

export type SquadStatus =
  | "Key Player"
  | "Rotation"
  | "Prospect"
  | "Reserve"
  | "Surplus"
  | "Captain";

// v0.5.6 - Modo de carreira
export type CareerMode = "dynamic" | "tactical";

export type Archetype =
  | "Generational Talent"
  | "Wonderkid"
  | "Top Prospect"
  | "Solid Professional"
  | "Journeyman"
  | "The Engine"
  | "Late Bloomer"
  | "Technical Maestro"
  | "Target Man";

export type CareerTrajectory = "Early Bloomer" | "Standard" | "Late Bloomer";

export type MediaNarrative =
  | "Prodigy"
  | "On the Rise"
  | "Established Star"
  | "Under Pressure"
  | "Journeyman"
  | "Veteran Leader"
  | "Forgotten Man"
  | "Flop"
  | "Comeback Kid"
  | "Cult Hero"
  | "Hometown Hero"
  | "Polarizing Figure"
  | "Press Darling"
  | "System Player"
  | "Injury Comeback";

// Media comment types (persistent, generated once per week/match)
export type CommentTone = 'positive' | 'negative' | 'neutral';
export type CommentSource = 'fan' | 'hater' | 'pundit';
export interface MediaComment {
  text: string;
  tone: CommentTone;
  source: CommentSource;
}

export type NationalTeamStatus =
  | "Not Called"
  | "Called Up"
  | "Squad Player"
  | "Regular Starter"
  | "Captain";

export type CompetitionLevel =
  | "Domestic League"
  | "Domestic Cup"
  | "Continental"
  | "International"
  | "World Cup";

export type CompetitionType =
  | "League"
  | "Cup"
  | "Continental"
  | "International"
  | "State Cup";

export interface CompetitionResult {
  competition: string;
  type: CompetitionType;
  position?: number;
  totalTeams?: number;
  matchesPlayed: number; // Jogos do JOGADOR
  teamMatchesPlayed?: number; // Jogos do TIME (para calcular % de participação)
  goals: number;
  assists: number;
  cleanSheets?: number;
  rating: number;
  trophies?: number;
  continentalQualification?: boolean;
  matchesWon?: number;
  matchesDrawn?: number;
  matchesLost?: number;
  wonCompetition?: boolean;
  finalTable?: Team[]; // Added to support relegation logic
}

export interface ContextualCompetitionData {
  country: string;
  leagueTier: number;
  domesticCup: boolean;
  continentalCompetition?: string;
  continentalQualification: boolean;
  competitions: CompetitionResult[];
  seasonTitles?: {
    wonLeague?: boolean;
    wonCup?: boolean;
    wonLibertadores?: boolean;
    wonSudamericana?: boolean;
    wonChampionsLeague?: boolean;
  };
  nextSeasonQualification?: {
    qualified: boolean;
    competitionName?: string;
  };
  // Dados específicos para temporadas juvenis
  youthSeasonData?: {
    promotionChance: number;
    scoutingInterest: number;
    parentClubInterest: number;
    recommendedAction: 'promote' | 'stay' | 'loan' | 'release';
    performanceRating: number;
  };
}

export interface LeagueSimulationResult {
  finalTable: Team[];
  promoted: Team[];
  relegated: Team[];
  playerStats: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets?: number; // âœ… ADICIONADO para goleiros
    position: number;
  };
  playerSeasonResult?: { team: Team; position: number };
  standings?: Map<string, TeamStandings>; // Optional: complete standings data
}

export interface CupSimulationResult {
  finalTable: any;
  winner: Team;
  finalist: Team;
  teamMatchesPlayed: number; // Jogos do TIME na copa
  playerStats: {
    position: null;
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets?: number; // âœ… ADICIONADO para goleiros
    reachedFinal: boolean;
    wonCup: boolean;
  };
}

export interface ContinentalSimulationResult {
  finalTable?: Team[];
  winner?: Team;
  teamMatchesPlayed: number; // Jogos do TIME na competição continental
  playerStats: {
    reachedFinal: any;
    matchesPlayed: number;
    goals: number;
    assists: number;
    rating: number;
    cleanSheets?: number; // ADICIONADO para goleiros
    position?: number;
    reachedKnockout?: boolean;
    wonCompetition?: boolean;
    roundReached?: string; // "R16", "QF", "SF", "Final", "Winner"
  };
}

export interface ChampionsLeagueFormat {
  leaguePhase: {
    teams: Team[];
    matchesPerTeam: number;
    homeMatches: number;
    awayMatches: number;
  };
  knockoutPhase: {
    roundOf16: boolean;
    quarterFinals: boolean;
    semiFinals: boolean;
    final: boolean;
  };
  pots: Team[][];
  overallRanking: Team[];
}

export interface TeamStandings {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
  homeRecord: { won: number; drawn: number; lost: number };
  awayRecord: { won: number; drawn: number; lost: number };
}

export interface CompetitionContext {
  playerCountry: string;
  playerTeam: Team;
  leagueTier: number;
  continentalQualification: boolean;
  // Optional explicit continental competition name determined by league position
  continentalCompetitionName?: string;
  domesticCupParticipation: boolean;
  nationalTeamParticipation: boolean;
}

export interface League {
  id: any;
  name: string;
  country: string;
  tier: number;
  teams: Team[];
  reputation: number;
}

export interface Team {
  squadStrength: any;
  id: any;
  name: string;
  country: string;
  leagueTier: number;
  reputation: number;
  isYouth: boolean;
  mustBePromoted?: boolean;
  financialBalance?: boolean;
  league?: League; // Tornando opcional para compatibilidade com o código existente

  // ===== Hierarquia de Clube =====
  // Define a estrutura: Clube Principal -> Time B -> Base (Sub-20/Sub-17)
  parentClubId?: string; // ID do clube pai (ex: Barcelona B -> Barcelona)
  parentClubName?: string; // Nome do clube pai para referência rápida
  clubHierarchyLevel?: "main" | "reserve" | "youth"; // Nível na hierarquia
  reserveTeamId?: string; // Time B/Reserva deste clube (se for o principal)
  youthTeamId?: string; // Time da base deste clube (se for principal ou reserva)

  // ===== Qualidade da Academia de Base =====
  // Nível de qualidade da academia (1-5), usado para times juvenis
  // Se não definido, herda automaticamente do clube pai
  youthAcademyQuality?: number;

  // ===== Finanças persistentes (opcionais) =====
  transferBudgetEUR?: number; // orçamento total para taxas nesta temporada
  remainingTransferBudgetEUR?: number; // restante após transferências
  wageBudgetWeeklyEUR?: number; // orçamento semanal total
  remainingWageBudgetWeeklyEUR?: number; // restante após contratações/renovações
}

export interface Agent {
  name: string;
  reputation: "Rookie" | "Average" | "Good" | "Super Agent";
  specialty: "Negotiator" | "Scout" | "Brand Builder";
  style: string;
  feePercentage: number;
}

export interface PlayerStats {
  balance: number;
  sprintSpeed: number;
  ballControl: number;
  // Preferred/weak foot
  preferredFoot?: "Left" | "Right" | "Both";
  weakFoot: number; // 1-5 scale
  acceleration: number;
  shotPower: number;
  heading: number;
  finishing: number;
  // Foot-specific finishing (for more granular simulation)
  leftFootFinishing?: number;
  rightFootFinishing?: number;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  flair: number;
  leadership: number;
  fitness: number;
  vision: number;
  composure: number;
  handling?: number;
  reflexes?: number;
  diving?: number;
  // New attributes
  aggression: number;
  positioning: number;
  interceptions: number;
  workRate: number;
  stamina: number;
  strength: number;
  agility: number;
  jumping: number;
  crossing: number;
  longShots: number;
  curve: number;
}

export interface Trophies {
  league: number;
  cup: number;
  championsLeague: number;
  libertadores: number;
  afcChampionsLeague: number;
  clubWorldCup: number;
  worldCup: number;

  // Additional trophies
  europaLeague: number;
  conferenceLeague: number;
  copaSudamericana: number;
  continentalCup: number;
  nationsLeague: number;
  superCup: number;
  stateCup: number;
  supercopaBrasil: number;
  recopaSudamericana: number;
  fifaClubWorldCup: number;
  intercontinentalCup: number;
  americasDerby: number;
  challengerCup: number;
  // Continental Competitions
  cafChampionsLeague: number;
  cafConfederationCup: number;
  cafAccessCup: number;
  afcCup: number;
  afcChallengeCup: number;
  concacafChampionsCup: number;
  concacafLeague: number;
  concacafShield: number;
  ofcChampionsLeague: number;
  ofcCup: number;
  ofcQualifierCup: number;
  conmebolAccessCup: number;
  // Youth Trophies
  youthLeague: number;
  youthCup: number;
  youthContinental: number;
  youthSpecialTournament: number;
}

export interface Awards {
  continentalPOTY: any;
  leagueForwardOfYear: any;
  leagueMidfielderOfYear: any;
  leagueDefenderOfYear: any;
  leagueTopAssister: any;
  leagueRookieOfYear: any;
  comebackPlayerOfYear: any;
  worldCupTOTT: any;
  continentalTOTT: any;
  worldPlayerAward: number;
  fifaBestAward: number;
  topScorerAward: number;
  cupTopScorer: number;
  continentalCompetitionTopScorer: number;
  bestGoalkeeperAward: number;
  youngPlayerAward: number;
  teamOfTheYear: number;
  continentalTopScorer: number;
  goalOfTheYear: number;
  continentalPlayerAward: number;
  worldCupBestPlayer: number;
  continentalCupPOTY: number;
  leaguePlayerOfYear: number;
  worldCupBestGoalkeeper: number;
  ballonDor: number;
  leagueTitles: number;
  continentalTitles: number;
  worldCups: number;
}

export interface Injury {
  type: "Minor" | "Moderate" | "Severe" | "Career-Ending";
  duration: number;
}

// v0.5.2 - Sistema de suspensão por cartão vermelho
// Contador de jogos de suspensão restantes por tipo de competição
export interface Suspensions {
  league: number;
  cup: number;
  continental: number;
  stateCup: number;
  international: number;
}

export type ObjectiveKind =
  | "expectation" // season/team performance expectations (simulation-focused)
  | "promise" // contract/role promises
  | "record" // record chase (club/league/historic)
  | "milestone" // career milestones
  | "legacy"; // ultra-rare historic feats

export type ObjectiveOrigin = "club" | "coach" | "press" | "agent" | "fans" | "self";

export type ObjectiveSeverity = "low" | "medium" | "high";

export type ObjectiveScope = "player" | "team";

export type ObjectiveRecordScope =
  | "club"
  | "league"
  | "competition"
  | "world"
  | "historic";

export interface ObjectiveBands {
  /** If value is below this threshold, it's considered a failure */
  failureMax?: number;
  /** The acceptable (expected) range */
  expectedMin?: number;
  expectedMax?: number;
  /** The "stretch" range for an excellent season */
  stretchMin?: number;
  stretchMax?: number;
}

export interface ObjectiveDeadline {
  kind: "season" | "career";
  /** Season index/year number used by the simulation */
  season?: number;
}

export interface PlayerGoal {
  id: string;
  description: string;
  descriptionParams?: Record<string, string | number>; // Parâmetros para tradução dinâmica

  // Legacy goal system fields (kept for backward compatibility)
  type:
    | "immediate"
    | "short-term"
    | "medium-term"
    | "long-term"
    | "career"
    | "legacy";
  category:
    | "Performance"
    | "Trophy"
    | "Individual"
    | "Development"
    | "Loyalty"
    | "International"
    | "Rivalry"
    | "Milestone";

  // Status
  isAchieved: boolean;
  progress: number; // 0-100
  isActive: boolean; // Se ainda é válido
  isExpired: boolean; // Se já não é mais possível

  // Contexto
  context: {
    clubId?: string; // ID do clube específico
    clubName?: string; // Nome do clube
    leagueId?: string;
    seasonStarted: number; // Season em que o goal foi criado
    requiresCurrentClub: boolean; // Se precisa estar no mesmo clube
    requiresCurrentLeague: boolean;
  };

  // Tracking (legacy)
  targetValue?: number; // Valor alvo (ex: 80 OVR, 50 gols)
  currentValue?: number; // Valor atual
  startingValue?: number; // Valor quando o goal foi criado

  // Metadata (legacy)
  priority: "Critical" | "High" | "Medium" | "Low";
  difficulty: number; // 0-100
  estimatedSeasons: number; // Quantas temporadas para completar

  // Rewards (legacy)
  rewards: {
    followerBoost: number;
    moraleBoost: number;
    reputationBoost: number;
    narrative?: string; // Mensagem especial ao completar
  };

  // ==================== NEW OBJECTIVE SYSTEM (optional) ====================
  objectiveKind?: ObjectiveKind;
  origin?: ObjectiveOrigin;
  severity?: ObjectiveSeverity;
  scope?: ObjectiveScope;
  deadline?: ObjectiveDeadline;

  /** Expected/Stretch/Failure bands for simulation expectations */
  bands?: ObjectiveBands;

  /** For record chases */
  recordScope?: ObjectiveRecordScope;

  /** Show a "projection" during the season (even with season-at-a-time simulation) */
  projectedValue?: number;

  /** Consequences summary (used for UI + end-of-season processing) */
  consequences?: {
    clubApprovalDelta?: number;
    moraleDelta?: number;
    reputationDelta?: number;
    squadStatusRisk?: "none" | "bench" | "transfer_list";
  };
}

export type TraitName =
  // Attacking traits (shooting & finishing)
  | "Clinical Finisher"
  | "Power Header"
  | "Long Shots"
  | "Poacher"
  | "Target Man"
  | "Speed Merchant"
  | "Finesse Shot"
  | "Chip Shot"
  | "Outside Foot Shot"
  | "Power Shot"
  | "Long Shot Taker"
  | "One-on-One Specialist"
  | "Acrobatic Finisher"
  // Dribbling & creativity
  | "Dribbling Wizard"
  | "Flair Player"
  | "Speed Dribbler"
  | "Technical Dribbler"
  | "Flair"
  | "Trickster"
  | "Ball Carrier"
  // Playmaking traits
  | "Playmaker"
  | "Set-piece Specialist"
  | "Vision"
  | "Through Ball"
  | "Crossing Specialist"
  | "Long Passer"
  | "Pinpoint Crossing"
  // Midfield/work rate traits
  | "Box to Box"
  | "Deep Lying Playmaker"
  | "Engine"
  | "Tireless Runner"
  | "Ball Winner"
  | "Interceptor"
  | "Tackles Back"
  // Defensive traits
  | "Ball Playing Defender"
  | "No Nonsense Defender"
  | "Aerial Dominance"
  | "Last Man"
  | "Slide Tackle"
  | "Marking"
  | "Dives Into Tackles"
  | "Positioning"
  // Goalkeeper traits
  | "Sweeper Keeper"
  | "Shot Stopper"
  | "Penalty Saver"
  | "Command of Area"
  | "Long Throw"
  | "Rushes Out Of Goal"
  | "Comes For Crosses"
  | "Punches Fists"
  | "GK Long Throw"
  | "GK Flat Kick"
  | "One-on-One Rush"
  // Physical traits
  | "Second Wind"
  | "Natural Fitness"
  | "Injury Prone"
  | "Solid Player"
  | "Strength"
  | "Giant Throw-In"
  | "Aerial Threat"
  | "Power House"
  // Mental traits
  | "Leadership"
  | "Composure"
  | "Big Game Player"
  | "Consistency"
  | "Team Player"
  | "Argues With Officials"
  | "Driven"
  | "Flair"
  | "Early Adopter"
  // Utility/career traits
  | "Versatile"
  | "Discipline"
  | "Two-Footed"
  | "One-Club Man"
  | "Playmaker"
  | "Finesse"
  | "Play Simple"
  // Footedness traits
  | "Left-Footed Maestro"
  | "Right-Footed Sniper"
  | "Weak Foot"
  // Special/rare traits
  | "Avoids Using Weaker Foot"
  | "Cautious With Crosses"
  | "Selfish"
  | "Inflexible"
  | "Injury Concern"
  | "Teamwork";

export type TraitLevel = "Bronze" | "Silver" | "Gold" | "Diamond";

export interface Trait {
  name: TraitName;
  description: string;
  level: TraitLevel;
}

// Sistema de Perfil DinÃ¢mico
export interface PlayerProfile {
  goalScoring: number; // 0-100 - TendÃªncia a marcar gols
  playmaking: number; // 0-100 - TendÃªncia a criar jogadas
  workRate: number; // 0-100 - Intensidade defensiva/fÃ­sica
  creativity: number; // 0-100 - Dribles, flair, jogadas individuais
  physicalDominance: number; // 0-100 - Jogo aÃ©reo, forÃ§a, presenÃ§a fÃ­sica
}

// Sistema de Curvas de Carreira Compostas
export interface CareerCurve {
  developmentSpeed: "Very Fast" | "Fast" | "Normal" | "Slow" | "Very Slow";
  peakDuration: "Short" | "Standard" | "Long" | "Very Long";
  declineSpeed: "Rapid" | "Normal" | "Gradual" | "Very Gradual";
  peakLevel: "Good" | "Great" | "Elite" | "World Class" | "Legendary";
}

// Estilos de Jogador Emergentes - mais realistas por posiÃ§Ã£o e perfil
export type PlayerStyle =
  // Atacantes
  | "Complete Forward" // Gols + assists + dribbling (all-rounder)
  | "Poacher" // Pure finisher, box predator
  | "Target Man" // Physical, aerial, hold-up
  | "False 9" // Deep creator, assists > goals
  | "Inside Forward" // Winger que corta para dentro e finaliza
  | "Speed Demon" // Pace merchant, counter-attacking
  // Meio-campistas
  | "Deep-Lying Playmaker" // Orchestrator from deep
  | "Advanced Playmaker" // CAM creator, assists
  | "Box-to-Box" // All-action, goals + defense
  | "Ball-Winning Midfielder" // Defensive anchor
  | "Regista" // Deep creative passer
  | "Mezzala" // Creative CM, roams forward
  // Alas/Wingers
  | "Inverted Winger" // Cuts inside, shoots
  | "Traditional Winger" // Crosses, assists
  | "Wide Playmaker" // Creative from flanks
  // Defensores
  | "Ball-Playing Defender" // Builds from back
  | "Stopper" // Physical, no-nonsense
  | "Sweeper" // Reads game, covers
  | "Wing-Back" // Attacking fullback
  // Goleiros
  | "Sweeper Keeper" // Modern, high line
  | "Shot Stopper" // Reflex specialist
  // Generic/Youth
  | "Emerging Talent" // Young, undefined
  | "Versatile Player"; // Jack of all trades

export type NewsType =
  | 'ballonDor' | 'goldenBoot' | 'playerOfYear' | 'bestGoalkeeper' | 'toty'
  | 'leagueChampion' | 'cupWinner' | 'championsLeague' | 'europaLeague' | 'worldCup'
  | 'topScorer' | 'goalMilestone' | 'capsMilestone' | 'assistMilestone'
  | 'transfer' | 'loanStart' | 'loanReturn' | 'contractRenewal' | 'contractExpiry'
  | 'internationalDebut' | 'internationalCall' | 'worldCupQualification'
  | 'relegation' | 'promotion' | 'severeInjury' | 'injuryReturn'
  | 'youthPromotion' | 'retirement' | 'managerChange'
  | 'professionalDebut' | 'firstTitle' | 'continentalQualification'
  | 'firstGoal' | 'hatTrick' | 'cleanSheet' | 'careerStart' | 'nationalTeamCall';

export interface NewsItem {
  id: string;
  type: NewsType;
  templateIndex: number;
  params: Record<string, string | number>;
  season: number;
  week?: number;
  playerAge?: number; // Age of the player when the news event occurred
  priority: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface Player {
  starQuality: number;
  news?: NewsItem[];

  /**
   * Objectives V2 support (save-persistent records and player intent).
   * Optional for backward compatibility with older saves.
   */
  records?: {
    /** Recorde histórico do CLUBE no seu save (ex.: gols em uma temporada) */
    clubSeasonGoalsRecord?: Record<string, number>; // key: clubId
    /** Melhor temporada do jogador (gols) no save */
    playerSeasonGoalsRecord?: number;
  };

  /** Season focus selected by the player (affects simulation + expectations). */
  seasonFocus?: "scoring" | "playmaking" | "titles" | "development" | "consistency";
  // ...existing code...
  totalClubs: number;
  name: string;
  age: number;
  archetype: Archetype;
  position: PositionDetail;
  nationality: string;
  stats: PlayerStats;
  team: Team;
  squadStatus: SquadStatus;
  retired: boolean;
  trophies: Trophies;
  awards: Awards;
  marketValue: number;
  personality: Personality;
  morale: Morale;
  teamChemistry: number;
  clubApproval: number;
  injury: Injury | null;
  potential: number;
  reputation: number;
  wage: number;
  contractLength: number;
  agentContractLength?: number;
  parentClub: Team | null;
  yearsAtClub: number;
  hasMadeSeniorDebut: boolean;
  playerGoals: PlayerGoal[];
  traits: Trait[];
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets: number;
  totalInjuries?: number; // For injury tracking
  careerTrajectory: CareerTrajectory;
  peakAgeStart: number;
  peakAgeEnd: number;
  retirementAge: number;
  loanDuration?: number;
  form: number; // -5 (terrible) to +5 (on fire)
  formStreak?: number; // For form streak tracking
  seasonsWithLowPlayingTime: number;
  socialMediaFollowers: number;
  agent: Agent;
  mediaNarrative: MediaNarrative;
  
  // Persistent media comments (generated once per match/week, not on render)
  currentMediaComments?: MediaComment[];
  mediaCommentsUpdatedAt?: number; // Week number when comments were last generated

  // National team properties
  nationalTeamStatus: NationalTeamStatus;
  internationalCaps: number;
  internationalGoals: number;
  internationalAssists: number;
  worldCupAppearances: number;
  continentalCupAppearances: number;
  // Tactical properties
  tactic?: Tactic;
  // Sistema de "2x 14 anos"
  seasonsAt14: number;
  // NOVOS SISTEMAS DE PROGRESSÃƒO DINÃ‚MICA
  profile?: PlayerProfile; // Sistema de perfil dinÃ¢mico
  careerCurve?: CareerCurve; // Sistema de curvas compostas
  playerStyle?: PlayerStyle; // Estilo emergente do jogador
  matchHistory: MatchLog[];
  contractTermination?: ContractTerminationStatus; // Status de rescisÃ£o de contrato
  // Novos sistemas
  endorsements?: Endorsement[];
  /**
   * Dinheiro disponível do jogador (saldo de carreira)
   */
  cash: number;
  currentTraining?: TrainingProgram;
  activeTrainingFocus?: TrainingFocusType; // Tipo de treino ativo (persistente) - legacy, usar activeTrainingFocuses
  activeTrainingFocuses?: TrainingFocusType[]; // v0.5.8 - Múltiplos treinos por temporada
  activeTrainingIntensity?: 'low' | 'medium' | 'high' | 'extreme'; // Intensidade do treino
  activeTrainerTier?: import('./types/trainingTypes').TrainerTier; // v0.5.8 - Tier do preparador contratado
  formTracker?: FormTracker;
  rivalries?: Rivalry[];
  managerRelationship?: ManagerRelationship;
  socialMediaStrategy?: SocialMediaStrategy;
  detailedInjury?: DetailedInjury;
  // Role promise (starter guarantee)
  promisedSquadStatus?: SquadStatus;
  roleGuaranteeSeasons?: number; // Seasons remaining to honor the promised role
  roleGuaranteeMatches?: number; // Optional: target matches to consider promise fulfilled

  // Qualification for next season's continental competitions
  nextSeasonQualification?: {
    qualified: boolean;
    competitionName?: string;
  };
  pendingLoanReturn?: boolean;

  // World Cup Qualifiers data (persisted across years 0, 1, and 2)
  worldCupQualifiersData?: {
    cycleStartYear: number; // Ano que começou o ciclo (para identificar)
    currentPhase: 0 | 1 | 2; // 0 = fase inicial, 1 = fase decisiva, 2 = Copa do Mundo
    // Dados da fase 0 (grupos iniciais)
    phase0Data?: {
      playersStillInContention: string[]; // Times ainda vivos nas eliminatórias
      directlyQualified: string[]; // Já classificados na fase 0 (se houver)
      eliminated: string[]; // Já eliminados na fase 0
    };
    // Dados finais (preenchidos no fim da fase 1)
    allQualified: string[]; // Times que classificaram
    playerQualified: boolean;
    qualificationMethod: "direct" | "playoff" | "none";
  };

  // v0.5.2 - Sistema de atributos ultra-detalhados
  expandedData?: ExpandedPlayerData;

  // v0.5.2 - Sistema de suspensão por cartão vermelho
  // Contador de jogos de suspensão restantes por tipo de competição
  suspensions?: Suspensions;

  // v0.5.2 - Mapa de calor acumulado da carreira
  // Grid 99x61. Cada célula = soma de ações naquela zona ao longo da carreira.
  // Normalizado para visualização (máx = 1.0). Persiste entre temporadas.
  careerHeatmap?: number[][];

  // v0.5.3 - Histórico de finalizações (mapa de chutes)
  // Máximo 500 registros (mais recentes). Persiste entre temporadas.
  shotHistory?: Array<{
    x: number;        // 0-98
    y: number;        // 0-60
    isGoal: boolean;
    isOnTarget: boolean;
    minute: number;
    xG?: number;
  }>;

  // v0.5.6 - Sistema de Treino e Desenvolvimento
  careerMode?: CareerMode;           // Modo de carreira (dynamic = auto, tactical = manual)
  bankBalance?: number;              // Saldo bancário acumulado (€)
  trainingModifier?: number;         // Multiplicador de treino atual (0.95-1.4)
  trainingModifierSeason?: number;   // Temporada em que o modificador foi aplicado
  lastTrainingResult?: 'excellent' | 'good' | 'neutral' | 'poor'; // Resultado do último treino
  socialData?: import("./types/socialTypes").PlayerSocialData;

  eventState?: import("./types/interactiveEventTypes").InteractiveEventState;
  eventFlags?: import("./services/eventConsequenceSystem").PlayerEventFlags;
}

export interface TransferOffer {
  type: "transfer";
  team: Team;
  transferFee: number;
  wage: number;
  contractLength: number;
  expectedSquadStatus: SquadStatus;
  debug_info?: string;
}

export interface LoanOffer {
  type: "loan";
  team: Team;
  wageContribution: number;
  duration: number;
  expectedSquadStatus: SquadStatus;
  debug_info?: string;
}

export type Offer = TransferOffer | LoanOffer;

// Basic match statistics from a single game
export interface MatchStats {
  // Core stats
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;

  // Passing
  passes: number;
  passCompletion: number; // Percentage
  keyPasses: number;

  // Dribbling
  dribbles: number;
  dribblesSucceeded: number;

  // Contests
  tackles: number;
  tacklesSucceeded: number;
  duels: number;
  duelsWon: number;

  // Defense
  interceptions: number;
  clearances: number;
  blocks: number;

  // Discipline
  foulsCommitted: number;
  foulsDrawn: number;
  offsides: number;
  yellowCard: boolean;
  redCard: boolean;

  // Overall
  rating: number;

  // Goalkeeper
  saves?: number;
  goalsConceded?: number;
  penaltiesSaved?: number;
}

// Raw simulation data, includes raw stats before validation
export interface MatchSimulation extends MatchStats {
  passesCompleted: number;
  tacklesWon: number;
  dribblesSuccessful: number;
  // This extends MatchStats and adds more detailed, raw data from the simulation
  groundDuels: number;
  groundDuelsWon: number;
  aerialDuels: number;
  aerialDuelsWon: number;

  // v0.5.2: Detalhes de gols desta partida
  leftFootGoals?: number;
  rightFootGoals?: number;
  headedGoals?: number;
  goalsInsideBox?: number;
  goalsOutsideBox?: number;
  penaltyGoals?: number;
  golazos?: number;
  xGMatch?: number;

  // v0.5.2: Gols contextuais (baseados no placar real)
  gameWinningGoals?: number;
  equalizerGoals?: number;
  decisiveGoals?: number;

  // v0.5.2: Gols por tipo de chute especial (trait-based)
  chipShotGoals?: number;
  trivelaShotGoals?: number;
  finesseShotGoals?: number;
  powerShotGoals?: number;
  volleyGoals?: number;
  bicycleKickGoals?: number;
  rabonaShotGoals?: number;
}

// Detailed match statistics with additional metrics, many of which are aggregated over time
export interface ExtendedMatchStats {
  goalsWeakFoot: number;
  goalsStrongFoot: number;
  // === GENERAL ===
  rating: number;
  matches: number;
  teamOfTheWeek: number;
  minutesPlayed: number;
  gamesStarted: number;
  gamesAsSubstitute: number;

  // === SHOOTING & FINISHING ===
  goals: number;
  expectedGoals: number; // xG
  goalsPerMatch: number;
  shots: number;
  shotsOnTarget: number;
  shotsOnTargetPerGame: number;
  shotsOffTarget: number;
  shotsBlockedByOpponent: number;
  shotsBlockedPerGame: number;
  bigChancesMissed: number;
  bigChancesConverted: number;
  goalConversion: number; // Percentage
  shotAccuracy: number; // Percentage

  // Goals by type
  freeKickGoals: number;
  directFreeKicksTaken: number;
  directFreeKickEffectiveness: number;
  penaltyGoals: number;
  penaltyConversion: number; // Percentage
  goalsFromInsideBox: number;
  goalsFromOutsideBox: number;
  headedGoals: number;
  leftFootGoals: number;
  rightFootGoals: number;
  weakFootGoals: number;

  // Advanced shooting
  shotsFromInsideBox: number;
  shotsFromOutsideBox: number;
  volleyGoals: number;
  chipGoals: number;
  curvedGoals: number;

  // === CREATIVITY & PASSING ===
  assists: number;
  expectedAssists: number; // xA
  assistsPerMatch: number;
  touches: number;
  touchesInOppositionBox: number;
  bigChancesCreated: number;
  keyPasses: number;
  keyPassesPerGame: number;
  throughBalls: number;
  accurateThroughBalls: number;
  throughBallAccuracy: number; // Percentage

  // Passing stats
  passes: number;
  passesCompleted: number;
  passCompletion: number; // Percentage
  passesPerGame: number;
  passesInOwnHalf: number;
  passesInOppositionHalf: number;
  passesInFinalThird: number;
  forwardPasses: number;
  forwardPassesCompleted: number;
  backwardPasses: number;
  sidewaysPasses: number;

  // Long balls & crosses
  longBalls: number;
  accurateLongBalls: number;
  longBallAccuracy: number; // Percentage
  crosses: number;
  accurateCrosses: number;
  crossAccuracy: number; // Percentage
  corners: number;
  cornerAccuracy: number; // Percentage

  // === DRIBBLING & BALL CONTROL ===
  dribbles: number;
  dribblesSucceeded: number;
  dribblesSuccessPercentage: number; // Percentage
  skillMovesCompleted: number;
  nutmegs: number;
  timesDispossessed: number;
  possessionLost: number;
  possessionLostInOwnHalf: number;
  ballTouchesPerGame: number;
  firstTouchSuccess: number; // Percentage

  // === DEFENSIVE ACTIONS ===
  tackles: number;
  tacklesWon: number;
  tacklesPerGame: number;
  tackleSuccess: number; // Percentage
  interceptions: number;
  interceptionsPerGame: number;
  clearances: number;
  clearancesPerGame: number;
  blocksPerGame: number;
  shotsBlocked: number;
  passesBlocked: number;
  headedClearances: number;

  // Ball recovery
  ballRecoveries: number;
  ballRecoveriesInAttack: number;
  ballRecoveriesInMidfield: number;
  ballRecoveriesInDefence: number;
  ballRecoveriesPerGame: number;

  // Advanced defending
  lastManTackles: number;
  slidingTackles: number;
  slidingTackleSuccess: number;
  standingTackles: number;
  pressuresApplied: number;
  pressureSuccess: number; // Percentage

  // === DUELS & CONTESTS ===
  duels: number;
  duelsWon: number;
  duelsWonPercentage: number;
  groundDuels: number;
  groundDuelsWon: number;
  groundDuelsWonPercentage: number;
  aerialDuels: number;
  aerialDuelsWon: number;
  aerialDuelsWonPercentage: number;
  headersWon: number;
  headersWonPercentage: number;
  physicalContests: number;
  physicalContestsWon: number;

  // Being dribbled past
  dribbledPast: number;
  dribbledPastPerGame: number;
  dribbledPastInDefensiveThird: number;

  // === DISCIPLINE ===
  foulsCommitted: number;
  foulsPerGame: number;
  foulsDrawn: number;
  foulsDrawnPerGame: number;
  offsides: number;
  offsidesPerGame: number;
  yellowCards: number;
  redCards: number;
  redCardsFromSecondYellow: number;
  penaltiesConceded: number;
  penaltiesWon: number;

  // === ERRORS & MISTAKES ===
  errorsLeadingToShot: number;
  errorsLeadingToGoal: number;
  bigMissedChances: number;
  ownGoals: number;
  passesIntercepted: number;

  // === GOALKEEPER SPECIFIC ===
  saves?: number;
  savesPerGame?: number;
  savePercentage?: number;
  cleanSheets?: number;
  cleanSheetPercentage?: number;
  goalsConceded?: number;
  goalsConcededPerGame?: number;
  expectedGoalsConceded?: number; // xGC
  goalsPreventedVsExpected?: number; // Saves above/below expected
  shotsOnTargetFaced?: number;
  penaltiesFaced?: number;
  penaltiesSaved?: number;
  penaltySavePercentage?: number;
  claimedCrosses?: number;
  punchesMade?: number;
  sweeper?: number; // Clearances outside box
  distributionAccuracy?: number;
  longThrowDistance?: number;

  // === WORK RATE & MOVEMENT ===
  distanceCovered: number; // km
  sprintDistanceCovered: number; // km
  highIntensityRuns: number;
  sprintsPerGame: number;
  positionsOutOfPosition: number;
  trackingRuns: number;
  offensiveRuns: number;
  defensiveRuns: number;

  // === TEAM PLAY ===
  oneVersusOneWon: number;
  teamPlayRating: number;
  supportiveRuns: number;
  overlappingRuns: number;
  underlappingRuns: number;
  decoyRuns: number;

  // === MATCH EVENTS ===
  hatTricks: number;
  braces: number;
  manOfTheMatch: number;
  matchesAsCaptain: number;
  perfectPassingGames: number; // 100% pass completion

  // === ADVANCED METRICS ===
  actionsWithBall: number;
  successfulPressures: number;
  progressiveCarries: number; // Dribbles that advance the ball significantly
  progressivePasses: number; // Passes that advance the ball significantly
  carriesIntoFinalThird: number;
  carriesIntoPenaltyArea: number;
  passesIntoPenaltyArea: number;
  shotCreatingActions: number;
  goalCreatingActions: number;
}

// Season statistics for tracking player performance
export interface SeasonStats {
  // Playing time
  matchesPlayed: number;
  gamesStarted: number;
  minutesPlayed: number;

  // Core stats
  goals: number;
  assists: number;
  overall: number;

  // Results
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  matchWinRate: number;

  // Performance
  averageRating: number;
  seasonGoalFrequency: number;
  seasonAssistFrequency: number;

  // Achievements
  careerHighGoals: boolean;
  careerHighAssists: boolean;
  monthlyAwards: number;
  playerOfTheMatch: number;
  teamOfTheWeek: number;

  // Goalkeeper specific
  cleanSheets?: number;
  penaltiesSaved?: number;

  // Special achievements
  hatTricks: number;

  // Detailed match stats
  matchStats?: ExtendedMatchStats;
}

export type CareerEvent = {
  type:
  | "start"
  | "transfer"
  | "loan"
  | "stay"
  | "trophy"
  | "injury"
  | "retirement"
  | "peak"
  | "decline"
  | "breakthrough"
  | "agitate_transfer"
  | "on_fire"
  | "meltdown"
  | "contract_expired"
  | "promotion"
  | "demotion"
  | "poor_performance"
  | "promoted_to_seniors"
  | "milestone"
  | "goal_achieved"
  | "award_nomination"
  | "loan_recalled"
  | "training_praise"
  | "training_bustup"
  | "public_transfer_request"
  | "late_for_training"
  | "rejects_agent_suggestion"
  | "trait_acquired"
  | "trait_lost"
  | "potential_increase"
  | "potential_decrease"
  | "form_boost"
  | "form_slump"
  | "fan_favourite"
  | "manager_fallout"
  | "unhappy_lack_of_playing_time"
  | "rival_transfer"
  | "agent_advice_move"
  | "agent_advice_stay"
  | "agent_change"
  | "media_praise"
  | "media_criticism"
  | "media_narrative_change"
  | "ballon_dor_win"
  | "fifa_best_win"
  | "golden_boot_win"
  | "golden_glove_win"
  | "golden_boy_win"
  | "team_of_the_year_win"
  | "chemistry_boost"
  | "chemistry_loss"
  | "setback"
  | "contract_renewal"
  | "contract_renewal"
  | "award_win"
  | "debut"
  | "first_title"
  | "continental_qualification"
  | "world_cup_qualification"
  | "money_gain"

  | "interactive_event" // v0.5.6: Procedural narrative events


  description: string;
  descriptionParams?: Record<string, string | number>; // Parâmetros para tradução dinâmica
  trophyKey?: string; // Chave para tradução e agrupamento correto de troféus
  metadata?: any; // For detailed award stats
  date?: string;
};

export interface CareerLog {
  season: string; // Season identifier (e.g., "2023/2024")
  age: number;
  team: Team;
  squadStatus: SquadStatus;
  stats: SeasonStats;
  events: CareerEvent[];
  followerGrowth: number;
  reputationChange: number;
  competitionData?: ContextualCompetitionData;
  trophies?: string[]; // List of trophies won in this season
  awards?: (string | { name: string; stats?: any })[];
}

export interface MatchLog {
  age: number;
  team: Team;
  opponent: string;
  competition: string;
  goals: number;
  assists: number;
  rating: number;
  isNationalTeam: boolean;
  teamScore?: number;
  opponentScore?: number;
  result?: "W" | "D" | "L";
  matchStats?: MatchStats;
}

export interface HighScore {
  name: string;
  score: number;
  finalOvr: number;
  trophies: number;
  awards: number;
  matches: number;
  goals: number;
  assists: number;
  position: PositionDetail;
  continent: Continent;
  cleanSheets: number;
  nationality: string;
}

export interface ClubProfile {
  tier: "Elite" | "Major" | "Standard" | "Lower" | "Minor";
  financialPower: number; // 0-100
  attractiveness: number; // 0-100
  developmentIndex: number; // 0-100 (capacidade de desenvolver jovens)
  ambitionLevel: number; // 0-100
  transferActivity: number; // 0-100 (quÃ£o ativos sÃ£o no mercado)
  playingStyle: "Possession" | "Counter" | "Direct" | "Balanced" | "Defensive";
  wageBudget: number; // Orçamento semanal em milhares de euros
  maxPlayerOverall: number; // Nível máximo de jogador que o clube pode ter (novo)
  // Novos campos derivados para realismo financeiro de transferências
  transferBudget: number; // € por temporada para taxas de transferência
  wageCap: number; // € por semana como teto salarial por jogador
}

export interface TransferPlayerProfile {
  marketTier:
  | "World Class"
  | "Elite"
  | "Leading"
  | "Regular"
  | "Promising"
  | "Developing"
  | "Fringe";
  trueValue: number; // Valor real de mercado ajustado
  desirability: number; // 0-100 (o quão desejável é no mercado)
  transferProbability: number; // 0-100 (probabilidade de sair)
  idealClubTiers: ClubProfile["tier"][];
  negotiationDifficulty: number; // 0-100
}

export interface TransferFit {
  overallScore: number;
  statusFit: number;
  financialFit: number;
  culturalFit: number;
  tacticalFit: number;
  careerFit: number;
}

export interface ScoutReport {
  player: Player;
  accuracy: number; // 0-100
  visibleStats: Partial<PlayerStats>;
  hiddenStats: (keyof PlayerStats)[];
  traits: Trait[];
  potential: { min: number; max: number };
  recommendation: "Must Buy" | "Great Prospect" | "Worth Monitoring" | "Pass";
  scoutNotes: string;
  valueEstimate: { min: number; max: number };
}

// ==================== NOVOS SISTEMAS ====================

// Sistema de Endorsements
export interface Endorsement {
  id: string;
  brand: string;
  type:
  | "Kit"
  | "Boots"
  | "Drinks"
  | "Tech"
  | "Fashion"
  | "Automotive"
  | "Watch"
  | "Gaming";
  value: number;
  duration: number;
  startYear: number;
  requirements: {
    minFollowers?: number;
    minOverall?: number;
    minReputation?: number;
    personalityFit?: string[];
  };
  bonuses: {
    followerGrowth: number;
    reputationBonus: number;
    marketValueMultiplier: number;
  };
  exclusivity: "Exclusive" | "Non-Exclusive";
  performanceBonus: boolean;
}

// Sistema de Treinamento
export interface TrainingSession {
  type: "Technical" | "Physical" | "Tactical" | "Mental" | "Position-Specific";
  intensity: "Light" | "Moderate" | "Intense" | "Maximum";
  focus?: keyof PlayerStats;
  duration: number;
  benefit: number;
  injuryRisk: number;
  fatigueImpact: number;
}

export interface TrainingProgram {
  name: string;
  sessions: TrainingSession[];
  totalWeeks: number;
  expectedGrowth: Record<string, number>;
  suitableFor: Position[];
}

// Sistema de LesÃµes Expandido
export interface DetailedInjury extends Injury {
  category: "Muscle" | "Ligament" | "Bone" | "Concussion";
  weeksOut: number;
  recoveryPhases: {
    rehabilitation: number;
    matchFitness: number;
  };
  recurrenceRisk: number;
  longTermEffect?: {
    stat: keyof PlayerStats;
    penalty: number;
  };
}

// Sistema de Rivalidades
export interface Rivalry {
  opponent: string;
  intensity: number;
  reason: "Position" | "Trophy" | "National Team" | "Transfer" | "Media";
  events: RivalryEvent[];
}

export interface RivalryEvent {
  type: "HeadToHead" | "MediaClash" | "AwardCompetition";
  outcome: "Win" | "Loss" | "Draw";
  impact: number;
}

// Sistema de Relacionamento com Treinador
export interface ManagerRelationship {
  manager: string;
  trust: number;
  tacticalAlignment: number;
  communicationStyle: "Demanding" | "Supportive" | "Hands-off";
  promises: ManagerPromise[];
}

export interface ManagerPromise {
  type: "PlayingTime" | "Trophies" | "Development";
  description: string;
  fulfilled: boolean;
  seasonMade: number;
}

// Sistema de Forma/Momentum
export interface FormTracker {
  last5Matches: ("Excellent" | "Good" | "Average" | "Poor" | "Terrible")[];
  currentForm: number;
  momentum: "Hot Streak" | "Steady" | "Cold Spell";
  effects: {
    ratingBonus: number;
    transferInterest: number;
    fanSentiment: number;
  };
}

// Sistema de EstratÃ©gia de Redes Sociais
export interface SocialMediaStrategy {
  activity: "Low" | "Medium" | "High" | "Viral";
  content: "Professional" | "Personal" | "Controversial" | "Charitable";
  growthRate: number;
  controversyRisk: number;
  sponsorshipMultiplier: number;
}

// Sistema de RescisÃ£o de Contrato
export interface ContractTerminationStatus {
  isFreeAgent: boolean;
  terminationDate?: Date;
  formerClub?: Team;
}
