/**
 * SOCIAL COMMENTS SERVICE - v1.0.0
 * 
 * Sistema avançado de geração de comentários para redes sociais.
 * Gera comentários dinâmicos, variados e contextuais baseados na temporada,
 * desempenho, eventos e situação atual do jogador.
 * 
 * Features:
 * - Comentários resetados por temporada
 * - Mais de 200 variações de usernames
 * - Comentários contextuais baseados em gols, assistências, lesões, transferências
 * - Integração com eventos interativos
 * - Reações em tempo real a acontecimentos da temporada
 */

import type { Player, CareerLog } from '../types';

export interface SocialComment {
  id: string;
  username: string;
  displayName?: string;
  text: string;
  likes: number;
  replies: number;
  isVerified: boolean;
  sentiment: 'positive' | 'negative' | 'neutral' | 'controversial';
  timeAgo: string;
  avatar?: string;
  badges?: string[];
}

// ============================================================================
// USERNAMES DATABASE - 200+ variações
// ============================================================================

const USERNAME_PREFIXES = [
  'Fut', 'Bola', 'Gol', 'Craque', 'Fan', 'Torcedor', 'Soccer', 'Football',
  'Goal', 'Ball', 'Kick', 'Chute', 'Drible', 'Arte', 'Tatico', 'Tecnico',
  'Zagueiro', 'Goleiro', 'Atacante', 'Meia', 'Lateral', 'Volante', 'Ponta',
  'Real', 'United', 'City', 'FC', 'Athletic', 'Sport', 'Esporte', 'Match',
  'Game', 'Play', 'Pro', 'Elite', 'Top', 'Best', 'Ultra', 'Mega', 'Super',
  'King', 'Queen', 'Lord', 'Master', 'Champ', 'Winner', 'Legend', 'Hero',
];

const USERNAME_SUFFIXES = [
  'Fan', 'Lover', 'Addict', 'Crazy', 'Official', 'Real', 'True', 'Pure',
  '2024', '2025', '2026', '99', '10', '7', '9', '1', 'XI', 'FC', 'SC',
  'BR', 'PT', 'ES', 'UK', 'DE', 'FR', 'IT', 'AR', 'MX', 'US', 'JP',
  'Zone', 'Hub', 'Central', 'Daily', 'News', 'Updates', 'Insider', 'Expert',
  'Analysis', 'Stats', 'Data', 'Watch', 'Live', 'Now', 'Today', 'Forever',
];

const REAL_STYLE_USERNAMES = [
  // Portuguese/Brazilian style
  'JogaBonito_', 'FutebolArte', 'CraqueDoFut', 'TorcidaFiel', 'BolaNoAngulo',
  'GolDePlaca', 'DriblaMais', 'CamisaDez_', 'ToqueDeBola', 'ArteNoCampo',
  'FutMania', 'BolaNaRede', 'GolDoSeculo', 'ChuteForte', 'PasseDeMestre',
  'ZagueiroRaiz', 'GoleiroMuro', 'AtacanteVoador', 'MeiaArmador', 'PontaVeloZ',
  'VolanteBruto', 'LateralMortifero', 'TecnicoGenio', 'TaticoMestre', 'BancadaVIP',
  'ArquibancadaRaiz', 'SocioTorcedor', 'FielTorcedor', 'UltraDedicado', 'HinchaLoco',
  
  // Spanish style
  'FutbolTotal_', 'GolazoBruto', 'TikiTakaFan', 'LaLigaLover', 'MadridistaPuro',
  'CuleBarca', 'FuriaSolitaria', 'MatadorGoles', 'PorteroInvicto', 'DefensaCentral',
  'CentrocampistaTop', 'ExtremoDerecho', 'MediaPuntaArtista', 'DelanteroCentro',
  
  // English style
  'FootballDaily_', 'GoalKingFC', 'PremierFan', 'ThreeChampions', 'StrikerElite',
  'KeeperGloves', 'DefenderRock', 'MidfielderMaestro', 'WingerSpeed', 'CaptainLeader',
  'ManagerMind', 'TacticsBrain', 'TransferNews', 'MatchdayVibes', 'FullTimeResult',
  
  // Generic football
  'SoccerFanatic', 'FootyLover', 'BallIsLife', 'GolazoTime', 'HattrickHero',
  'CleanSheetKing', 'AssistMachine', 'FreekickMaster', 'PenaltyKiller', 'OffsideTrap',
  'VARwatch', 'RefDecisions', 'StadiumAtmosphere', 'ChantMaster', 'TifoCreator',
];

const INFLUENCER_USERNAMES = [
  'FutAnalytics', 'TacticsBoard', 'ScoutingReport', 'TransferInsider', 'WageExpert',
  'ContractWatch', 'InjuryUpdate', 'LineupPredictor', 'FormTracker', 'RatingMaster',
  'StatsBomb', 'DataFootball', 'xGAnalyst', 'ExpectedGoals', 'PressureIndex',
  'PassingLanes', 'HeatmapPro', 'TouchlineView', 'DugoutCam', 'PitchsideAccess',
];

const CASUAL_USERNAMES = [
  'random_fan_123', 'just_watching', 'new_to_football', 'casual_viewer', 'weekend_watcher',
  'couch_manager', 'armchair_expert', 'tv_spectator', 'streaming_now', 'highlights_only',
  'goals_clips', 'best_moments', 'football_memes', 'funny_fouls', 'red_cards_only',
];

// ============================================================================
// COMMENT TEMPLATES
// ============================================================================

interface CommentTemplate {
  textKey: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'controversial';
  minLikes: number;
  maxLikes: number;
  verifiedChance: number;
  conditions?: {
    minOverall?: number;
    maxOverall?: number;
    minAge?: number;
    maxAge?: number;
    minForm?: number;
    maxForm?: number;
    minGoals?: number;
    hasInjury?: boolean;
    wantsTransfer?: boolean;
    isYouth?: boolean;
    isVeteran?: boolean;
  };
}

// Templates para diferentes contextos
const SEASON_START_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.seasonComments.excited', sentiment: 'positive', minLikes: 50, maxLikes: 200, verifiedChance: 0.1 },
  { textKey: 'social.seasonComments.expectations', sentiment: 'neutral', minLikes: 30, maxLikes: 100, verifiedChance: 0.05 },
  { textKey: 'social.seasonComments.newSeason', sentiment: 'positive', minLikes: 80, maxLikes: 300, verifiedChance: 0.15 },
];

const GOOD_FORM_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.formComments.onFire', sentiment: 'positive', minLikes: 100, maxLikes: 500, verifiedChance: 0.2, conditions: { minForm: 3 } },
  { textKey: 'social.formComments.bestPlayer', sentiment: 'positive', minLikes: 150, maxLikes: 600, verifiedChance: 0.25, conditions: { minForm: 4 } },
  { textKey: 'social.formComments.incredible', sentiment: 'positive', minLikes: 80, maxLikes: 400, verifiedChance: 0.15, conditions: { minForm: 2 } },
  { textKey: 'social.formComments.worldClass', sentiment: 'positive', minLikes: 200, maxLikes: 800, verifiedChance: 0.3, conditions: { minForm: 4, minOverall: 80 } },
];

const BAD_FORM_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.formComments.struggling', sentiment: 'negative', minLikes: 20, maxLikes: 80, verifiedChance: 0.05, conditions: { maxForm: -2 } },
  { textKey: 'social.formComments.needsRest', sentiment: 'neutral', minLikes: 30, maxLikes: 100, verifiedChance: 0.1, conditions: { maxForm: -1 } },
  { textKey: 'social.formComments.disappointed', sentiment: 'negative', minLikes: 15, maxLikes: 60, verifiedChance: 0.02, conditions: { maxForm: -3 } },
  { textKey: 'social.formComments.sellHim', sentiment: 'negative', minLikes: 40, maxLikes: 150, verifiedChance: 0.05, conditions: { maxForm: -4 } },
];

const GOAL_SCORER_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.goalComments.machineMode', sentiment: 'positive', minLikes: 150, maxLikes: 700, verifiedChance: 0.25, conditions: { minGoals: 15 } },
  { textKey: 'social.goalComments.goldenBoot', sentiment: 'positive', minLikes: 200, maxLikes: 900, verifiedChance: 0.3, conditions: { minGoals: 20 } },
  { textKey: 'social.goalComments.unstoppable', sentiment: 'positive', minLikes: 120, maxLikes: 500, verifiedChance: 0.2, conditions: { minGoals: 10 } },
  { textKey: 'social.goalComments.hatTrickHero', sentiment: 'positive', minLikes: 300, maxLikes: 1200, verifiedChance: 0.4, conditions: { minGoals: 25 } },
];

const YOUTH_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.youthComments.futurestar', sentiment: 'positive', minLikes: 80, maxLikes: 350, verifiedChance: 0.15, conditions: { maxAge: 21 } },
  { textKey: 'social.youthComments.wonderkid', sentiment: 'positive', minLikes: 120, maxLikes: 500, verifiedChance: 0.2, conditions: { maxAge: 19 } },
  { textKey: 'social.youthComments.protect', sentiment: 'positive', minLikes: 60, maxLikes: 250, verifiedChance: 0.1, conditions: { maxAge: 20 } },
  { textKey: 'social.youthComments.nextGeneration', sentiment: 'positive', minLikes: 100, maxLikes: 400, verifiedChance: 0.18, conditions: { maxAge: 22 } },
];

const VETERAN_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.veteranComments.legend', sentiment: 'positive', minLikes: 150, maxLikes: 600, verifiedChance: 0.25, conditions: { minAge: 33 } },
  { textKey: 'social.veteranComments.stillGotIt', sentiment: 'positive', minLikes: 100, maxLikes: 400, verifiedChance: 0.2, conditions: { minAge: 32, minForm: 1 } },
  { textKey: 'social.veteranComments.retire', sentiment: 'negative', minLikes: 30, maxLikes: 120, verifiedChance: 0.05, conditions: { minAge: 35, maxForm: -1 } },
  { textKey: 'social.veteranComments.experience', sentiment: 'neutral', minLikes: 70, maxLikes: 280, verifiedChance: 0.15, conditions: { minAge: 31 } },
];

const INJURY_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.injuryComments.getWell', sentiment: 'positive', minLikes: 100, maxLikes: 450, verifiedChance: 0.2, conditions: { hasInjury: true } },
  { textKey: 'social.injuryComments.missYou', sentiment: 'positive', minLikes: 80, maxLikes: 350, verifiedChance: 0.15, conditions: { hasInjury: true } },
  { textKey: 'social.injuryComments.comeBack', sentiment: 'positive', minLikes: 120, maxLikes: 500, verifiedChance: 0.22, conditions: { hasInjury: true } },
];

const TRANSFER_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.transferComments.stayPlease', sentiment: 'positive', minLikes: 150, maxLikes: 600, verifiedChance: 0.2, conditions: { wantsTransfer: true } },
  { textKey: 'social.transferComments.traitor', sentiment: 'negative', minLikes: 80, maxLikes: 350, verifiedChance: 0.1, conditions: { wantsTransfer: true } },
  { textKey: 'social.transferComments.understand', sentiment: 'neutral', minLikes: 60, maxLikes: 250, verifiedChance: 0.12, conditions: { wantsTransfer: true } },
  { textKey: 'social.transferComments.goodLuck', sentiment: 'positive', minLikes: 90, maxLikes: 380, verifiedChance: 0.15, conditions: { wantsTransfer: true } },
];

const EVENT_TEMPLATES: CommentTemplate[] = [
  // Fan interaction positive
  { textKey: 'social.eventComments.metHim', sentiment: 'positive', minLikes: 200, maxLikes: 800, verifiedChance: 0.1 },
  { textKey: 'social.eventComments.soNice', sentiment: 'positive', minLikes: 150, maxLikes: 600, verifiedChance: 0.08 },
  { textKey: 'social.eventComments.autograph', sentiment: 'positive', minLikes: 180, maxLikes: 700, verifiedChance: 0.12 },
  // Training
  { textKey: 'social.eventComments.hardWorker', sentiment: 'positive', minLikes: 100, maxLikes: 400, verifiedChance: 0.15 },
  { textKey: 'social.eventComments.dedication', sentiment: 'positive', minLikes: 120, maxLikes: 450, verifiedChance: 0.18 },
  // Charity
  { textKey: 'social.eventComments.goodPerson', sentiment: 'positive', minLikes: 250, maxLikes: 1000, verifiedChance: 0.25 },
  { textKey: 'social.eventComments.roleModel', sentiment: 'positive', minLikes: 200, maxLikes: 850, verifiedChance: 0.22 },
];

const GENERAL_TEMPLATES: CommentTemplate[] = [
  { textKey: 'social.generalComments.support', sentiment: 'positive', minLikes: 40, maxLikes: 180, verifiedChance: 0.08 },
  { textKey: 'social.generalComments.watching', sentiment: 'neutral', minLikes: 20, maxLikes: 80, verifiedChance: 0.03 },
  { textKey: 'social.generalComments.proud', sentiment: 'positive', minLikes: 60, maxLikes: 250, verifiedChance: 0.1 },
  { textKey: 'social.generalComments.letGo', sentiment: 'positive', minLikes: 50, maxLikes: 200, verifiedChance: 0.07 },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Seeded random number generator for deterministic results
 */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Generate a random username based on seed
 */
const generateUsername = (seed: number): string => {
  const rand1 = seededRandom(seed);
  const rand2 = seededRandom(seed + 1);
  const rand3 = seededRandom(seed + 2);
  
  // 40% chance for real-style username
  if (rand1 < 0.4) {
    const index = Math.floor(rand2 * REAL_STYLE_USERNAMES.length);
    return REAL_STYLE_USERNAMES[index];
  }
  
  // 15% chance for influencer username
  if (rand1 < 0.55) {
    const index = Math.floor(rand2 * INFLUENCER_USERNAMES.length);
    return INFLUENCER_USERNAMES[index];
  }
  
  // 10% chance for casual username
  if (rand1 < 0.65) {
    const index = Math.floor(rand2 * CASUAL_USERNAMES.length);
    return CASUAL_USERNAMES[index];
  }
  
  // 35% chance for generated username
  const prefixIndex = Math.floor(rand2 * USERNAME_PREFIXES.length);
  const suffixIndex = Math.floor(rand3 * USERNAME_SUFFIXES.length);
  return `${USERNAME_PREFIXES[prefixIndex]}${USERNAME_SUFFIXES[suffixIndex]}`;
};

/**
 * Calculate stable seed from player and season data
 */
const calculateSeed = (player: Player, seasonIndex: number, commentIndex: number): number => {
  const nameSeed = player.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ageSeed = player.age * 17;
  const seasonSeed = seasonIndex * 31;
  const indexSeed = commentIndex * 7;
  return nameSeed + ageSeed + seasonSeed + indexSeed;
};

/**
 * Check if template conditions match player state
 */
const checkConditions = (
  template: CommentTemplate,
  player: Player,
  seasonGoals: number
): boolean => {
  const conditions = template.conditions;
  if (!conditions) return true;
  
  const flags = player.eventFlags;
  
  if (conditions.minOverall !== undefined && player.stats.overall < conditions.minOverall) return false;
  if (conditions.maxOverall !== undefined && player.stats.overall > conditions.maxOverall) return false;
  if (conditions.minAge !== undefined && player.age < conditions.minAge) return false;
  if (conditions.maxAge !== undefined && player.age > conditions.maxAge) return false;
  if (conditions.minForm !== undefined && player.form < conditions.minForm) return false;
  if (conditions.maxForm !== undefined && player.form > conditions.maxForm) return false;
  if (conditions.minGoals !== undefined && seasonGoals < conditions.minGoals) return false;
  if (conditions.hasInjury !== undefined && (!!player.injury !== conditions.hasInjury)) return false;
  if (conditions.wantsTransfer !== undefined && (flags?.wantsTransfer !== conditions.wantsTransfer)) return false;
  
  return true;
};

/**
 * Get time ago string based on index
 */
const getTimeAgo = (
  index: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string => {
  if (index === 0) return t('social.comments.minutesAgo', { count: 15 + (index * 12) });
  if (index < 3) return t('social.comments.hoursAgo', { count: index + 1 });
  if (index < 6) return t('social.comments.hoursAgo', { count: (index - 2) * 4 });
  return t('social.comments.daysAgo', { count: Math.floor(index / 2) });
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate dynamic comments for a player based on current season
 */
export const generateSeasonComments = (
  player: Player,
  currentSeason: number,
  currentLog: CareerLog | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): SocialComment[] => {
  const comments: SocialComment[] = [];
  const baseSeed = calculateSeed(player, currentSeason, 0);
  
  const firstName = player.name.split(' ')[0];
  const teamName = player.team?.name || '';
  const seasonGoals = currentLog?.stats?.goals || 0;
  const seasonAssists = currentLog?.stats?.assists || 0;
  const flags = player.eventFlags;
  
  // Gather applicable templates
  const applicableTemplates: CommentTemplate[] = [];
  
  // Add general templates
  applicableTemplates.push(...GENERAL_TEMPLATES);
  
  // Add form-based templates
  if (player.form >= 2) {
    applicableTemplates.push(...GOOD_FORM_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  } else if (player.form <= -2) {
    applicableTemplates.push(...BAD_FORM_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add goal scorer templates
  if (seasonGoals >= 10) {
    applicableTemplates.push(...GOAL_SCORER_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add youth templates
  if (player.age <= 22) {
    applicableTemplates.push(...YOUTH_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add veteran templates
  if (player.age >= 31) {
    applicableTemplates.push(...VETERAN_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add injury templates
  if (player.injury) {
    applicableTemplates.push(...INJURY_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add transfer templates
  if (flags?.wantsTransfer) {
    applicableTemplates.push(...TRANSFER_TEMPLATES.filter(t => checkConditions(t, player, seasonGoals)));
  }
  
  // Add event-based templates
  if (flags?.recentFanInteraction === 'positive') {
    applicableTemplates.push(...EVENT_TEMPLATES.slice(0, 3));
  }
  if (flags?.extraTrainingActive || flags?.trainingIntensity === 'intense') {
    applicableTemplates.push(...EVENT_TEMPLATES.slice(3, 5));
  }
  if (flags?.charityActive) {
    applicableTemplates.push(...EVENT_TEMPLATES.slice(5, 7));
  }
  
  // Select 5-8 unique comments
  const numComments = 5 + Math.floor(seededRandom(baseSeed + 100) * 4);
  const selectedIndices = new Set<number>();
  
  for (let i = 0; i < numComments && selectedIndices.size < applicableTemplates.length; i++) {
    const attemptSeed = baseSeed + i * 13;
    let templateIndex = Math.floor(seededRandom(attemptSeed) * applicableTemplates.length);
    
    // Find unused template
    let attempts = 0;
    while (selectedIndices.has(templateIndex) && attempts < 20) {
      templateIndex = (templateIndex + 1) % applicableTemplates.length;
      attempts++;
    }
    
    if (selectedIndices.has(templateIndex)) continue;
    selectedIndices.add(templateIndex);
    
    const template = applicableTemplates[templateIndex];
    const commentSeed = calculateSeed(player, currentSeason, i);
    
    const username = generateUsername(commentSeed);
    const likes = Math.floor(
      template.minLikes + seededRandom(commentSeed + 50) * (template.maxLikes - template.minLikes)
    );
    const isVerified = seededRandom(commentSeed + 60) < template.verifiedChance;
    const replies = Math.floor(seededRandom(commentSeed + 70) * (likes / 10));
    
    comments.push({
      id: `comment-${currentSeason}-${i}-${commentSeed}`,
      username,
      text: t(template.textKey, { 
        name: firstName, 
        team: teamName,
        goals: seasonGoals,
        assists: seasonAssists,
        age: player.age,
        overall: player.stats.overall,
      }),
      likes,
      replies,
      isVerified,
      sentiment: template.sentiment,
      timeAgo: getTimeAgo(i, t),
    });
  }
  
  // Sort by likes
  return comments.sort((a, b) => b.likes - a.likes);
};

/**
 * Generate quick reaction comments for specific events
 */
export const generateEventReactionComments = (
  player: Player,
  eventType: 'goal' | 'assist' | 'injury' | 'transfer' | 'award',
  currentSeason: number,
  t: (key: string, params?: Record<string, string | number>) => string
): SocialComment[] => {
  const comments: SocialComment[] = [];
  const baseSeed = calculateSeed(player, currentSeason, eventType.charCodeAt(0));
  const firstName = player.name.split(' ')[0];
  
  const reactionKeys: Record<string, string[]> = {
    goal: ['social.reactions.goal1', 'social.reactions.goal2', 'social.reactions.goal3'],
    assist: ['social.reactions.assist1', 'social.reactions.assist2'],
    injury: ['social.reactions.injury1', 'social.reactions.injury2'],
    transfer: ['social.reactions.transfer1', 'social.reactions.transfer2'],
    award: ['social.reactions.award1', 'social.reactions.award2', 'social.reactions.award3'],
  };
  
  const keys = reactionKeys[eventType] || [];
  
  keys.forEach((key, i) => {
    const seed = baseSeed + i * 17;
    comments.push({
      id: `reaction-${eventType}-${currentSeason}-${i}`,
      username: generateUsername(seed),
      text: t(key, { name: firstName }),
      likes: 50 + Math.floor(seededRandom(seed) * 300),
      replies: Math.floor(seededRandom(seed + 1) * 20),
      isVerified: seededRandom(seed + 2) < 0.1,
      sentiment: eventType === 'injury' ? 'neutral' : 'positive',
      timeAgo: t('social.comments.minutesAgo', { count: 5 + i * 10 }),
    });
  });
  
  return comments;
};

export default {
  generateSeasonComments,
  generateEventReactionComments,
  generateUsername,
};
