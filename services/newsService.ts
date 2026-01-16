/**
 * NEWS SERVICE - v0.5.6
 * 
 * Sistema de notícias dinâmico que gera manchetes baseadas em eventos da carreira.
 * Cada tipo de evento tem 20 variações para evitar repetição.
 * 
 * Features:
 * - 20 templates por tipo de evento
 * - Seleção pseudoaleatória via seed
 * - Suporte a interpolação de variáveis
 * - Integração com sistema de tradução
 */

import type {
  Player,
  CareerEvent,
  NewsType,
  NewsItem
} from '../types';

// ==================== MAPEAMENTO DE PRIORIDADE ====================

const NEWS_PRIORITY: Record<NewsType, 'high' | 'medium' | 'low'> = {
  ballonDor: 'high',
  goldenBoot: 'high',
  playerOfYear: 'high',
  bestGoalkeeper: 'high',
  toty: 'high',
  leagueChampion: 'high',
  cupWinner: 'high',
  championsLeague: 'high',
  europaLeague: 'high',
  worldCup: 'high',
  topScorer: 'medium',
  goalMilestone: 'medium',
  capsMilestone: 'medium',
  assistMilestone: 'medium',
  transfer: 'medium',
  loanStart: 'medium',
  loanReturn: 'low',
  contractRenewal: 'low',
  contractExpiry: 'low',
  internationalDebut: 'medium',
  internationalCall: 'low',
  worldCupQualification: 'medium',
  relegation: 'high',
  promotion: 'medium',
  severeInjury: 'medium',
  injuryReturn: 'low',
  youthPromotion: 'medium',
  retirement: 'high',
  managerChange: 'low',
  professionalDebut: 'high',
  firstTitle: 'high',
  continentalQualification: 'high',
  firstGoal: 'high',
  hatTrick: 'high',
  cleanSheet: 'medium',
  careerStart: 'high',
  nationalTeamCall: 'medium',
};

const NEWS_SENTIMENT: Record<NewsType, 'positive' | 'negative' | 'neutral'> = {
  ballonDor: 'positive',
  goldenBoot: 'positive',
  playerOfYear: 'positive',
  bestGoalkeeper: 'positive',
  toty: 'positive',
  leagueChampion: 'positive',
  cupWinner: 'positive',
  championsLeague: 'positive',
  europaLeague: 'positive',
  worldCup: 'positive',
  topScorer: 'positive',
  goalMilestone: 'positive',
  capsMilestone: 'positive',
  assistMilestone: 'positive',
  transfer: 'neutral',
  loanStart: 'neutral',
  loanReturn: 'neutral',
  contractRenewal: 'positive',
  contractExpiry: 'neutral',
  internationalDebut: 'positive',
  internationalCall: 'positive',
  worldCupQualification: 'positive',
  relegation: 'negative',
  promotion: 'positive',
  severeInjury: 'negative',
  injuryReturn: 'positive',
  youthPromotion: 'positive',
  retirement: 'neutral',
  managerChange: 'neutral',
  professionalDebut: 'positive',
  firstTitle: 'positive',
  continentalQualification: 'positive',
  firstGoal: 'positive',
  hatTrick: 'positive',
  cleanSheet: 'positive',
  careerStart: 'positive',
  nationalTeamCall: 'positive',
};

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Gera um ID único para a notícia
 */
function generateNewsId(type: NewsType, season: number, seed: number): string {
  return `${type}-s${season}-${seed.toString(36)}`;
}

/**
 * Seleciona um índice de template (0-19) baseado em seed determinístico
 */
function selectTemplateIndex(seed: number): number {
  // Usar módulo 20 para garantir índice entre 0-19
  return Math.abs(seed) % 20;
}

/**
 * Gera seed baseado em dados estáveis do jogador e temporada
 */
function generateSeed(player: Player, season: number, type: NewsType): number {
  const nameValue = player.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const typeValue = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return nameValue + season * 1000 + typeValue;
}

/**
 * Cria uma notícia a partir de um evento
 */
export function createNewsItem(
  player: Player,
  type: NewsType,
  season: number,
  params: Record<string, string | number>,
  week?: number
): NewsItem {
  const seed = generateSeed(player, season, type);
  const templateIndex = selectTemplateIndex(seed);

  return {
    id: generateNewsId(type, season, seed),
    type,
    templateIndex,
    params: {
      name: player.name,
      firstName: player.name.split(' ')[0],
      team: player.team?.name || '',
      ...params,
    },
    season,
    week,
    playerAge: player.age,
    priority: NEWS_PRIORITY[type],
    sentiment: NEWS_SENTIMENT[type],
  };
}

/**
 * Converte eventos de carreira em notícias
 */
export function convertEventsToNews(
  player: Player,
  events: CareerEvent[],
  season: number
): NewsItem[] {
  const news: NewsItem[] = [];

  events.forEach((event) => {
    const newsItem = eventToNews(player, event, season);
    if (newsItem) {
      news.push(newsItem);
    }
  });

  return news;
}

/**
 * Mapeia um evento de carreira para uma notícia
 */
/**
 * Mapeia um evento de carreira para uma notícia
 */
function eventToNews(
  player: Player,
  event: CareerEvent,
  season: number
): NewsItem | null {
  // Mapear tipos de evento para tipos de notícia
  // Nota: award_win não é um CareerEvent, deve ser tratado separadamente via generateNewsFromAward

  let newsType: NewsType | null = null;
  const metadata = (event as any).metadata || {};

  const desc = (event as any).description?.toLowerCase() || '';

  switch (event.type) {
    case 'transfer':
      newsType = 'transfer';
      break;
    case 'loan':
      newsType = 'loanStart';
      break;
    case 'contract_expired':
      newsType = 'contractExpiry';
      break;
    case 'trophy':
      if (desc.includes('league') || desc.includes('campeonato') || desc.includes('liga')) newsType = 'leagueChampion';
      else if (desc.includes('cup') || desc.includes('copa')) newsType = 'cupWinner';
      else if (desc.includes('champions')) newsType = 'championsLeague';
      else if (desc.includes('europa')) newsType = 'europaLeague';
      else if (desc.includes('world cup') || desc.includes('copa do mundo')) newsType = 'worldCup';
      break;
    case 'injury':
      if (metadata.months >= 3) newsType = 'severeInjury';
      break;
    case 'retirement':
      newsType = 'retirement';
      break;
    case 'demotion':
      newsType = 'relegation';
      break;
    case 'promotion':
      newsType = 'promotion';
      break;
    case 'debut' as any:
      newsType = 'professionalDebut';
      break;
    case 'first_title' as any:
      newsType = 'firstTitle';
      break;
    case 'continental_qualification' as any:
      newsType = 'continentalQualification';
      break;
    case 'world_cup_qualification' as any:
      newsType = 'worldCupQualification';
      break;

    // Tipos específicos do awardLogic.ts (casting necessário pois podem não estar no type CareerEvent)
    case 'ballon_dor_win' as any:
      newsType = 'ballonDor';
      break;
    case 'golden_boot_win' as any:
      newsType = 'goldenBoot';
      break;
    case 'golden_glove_win' as any:
      newsType = 'bestGoalkeeper';
      break;
    case 'team_of_the_year_win' as any:
      newsType = 'toty';
      break;
    case 'golden_boy_win' as any:
      // Pode ser RisingStar ou similar, vamos mapear para ballonDor ou novo tipo
      // Por enquanto mapeia para youthPromotion ou criar um tipo 'goldenBoy'
      newsType = 'youthPromotion';
      break;
    case 'fifa_best_win' as any:
      newsType = 'playerOfYear';
      break;
    case 'award_win' as any:
      // Fallback para award_win genérico
      if (desc.includes('ballon') || desc.includes('bola de ouro')) newsType = 'ballonDor';
      else if (desc.includes('golden boot') || desc.includes('artilheiro')) newsType = 'goldenBoot';
      else if (desc.includes('player of the year') || desc.includes('melhor jogador')) newsType = 'playerOfYear';
      break;
  }

  if (!newsType) return null;

  return createNewsItem(
    player,
    newsType,
    season,
    {
      goals: metadata.goals || 0,
      assists: metadata.assists || 0,
      caps: metadata.caps || 0,
      months: metadata.months || 0,
      newTeam: metadata.newTeam || '',
      competition: metadata.competition || '',
    }
  );
}

/**
 * Gera notícia para um prêmio específico
 */
export function generateNewsFromAward(
  player: Player,
  awardName: string,
  season: number
): NewsItem | null {
  const name = awardName.toLowerCase();
  let newsType: NewsType | null = null;

  if (name.includes('ballon') || name.includes('bola de ouro')) newsType = 'ballonDor';
  else if (name.includes('golden boot') || name.includes('artilheiro') || name.includes('chuteira')) newsType = 'goldenBoot';
  else if (name.includes('player of the year') || name.includes('melhor jogador')) newsType = 'playerOfYear';
  else if (name.includes('goalkeeper') || name.includes('goleiro')) newsType = 'bestGoalkeeper';
  else if (name.includes('toty') || name.includes('time do ano') || name.includes('team of the year')) newsType = 'toty';
  else if (name.includes('top scorer')) newsType = 'topScorer';

  if (!newsType) return null;

  // Calcular ordinal baseado no contador de prêmios
  let count = 1;
  const awards = player.awards as any;

  switch (newsType) {
    case 'ballonDor': count = (awards.worldPlayerAward || 0) + 1; break;
    case 'goldenBoot': count = (awards.goldenBoot || 0) + 1; break;
    case 'playerOfYear': count = (awards.poty || 0) + 1; break;
    case 'bestGoalkeeper': count = (awards.yashinAward || 0) + 1; break;
    case 'toty': count = (awards.toty || 0) + 1; break;
    default: count = 1;
  }

  return createNewsItem(player, newsType, season, {
    year: season,
    ordinal: getOrdinal(count)
  });
}

function getOrdinal(n: number): string {
  if (n === 1) return 'primeiro';
  if (n === 2) return 'segundo';
  if (n === 3) return 'terceiro';
  if (n === 4) return 'quarto';
  if (n === 5) return 'quinto';
  return `${n}º`;
}

/**
 * Gera a chave de tradução para uma notícia
 */
export function getNewsTranslationKey(news: NewsItem): string {
  return `news.${news.type}.${news.templateIndex}`;
}

/**
 * Obtém as notícias mais recentes do jogador
 * Ordenadas cronologicamente: temporada mais recente primeiro, semana mais recente primeiro
 * Dentro da mesma temporada/semana, alta prioridade primeiro
 */
export function getRecentNews(player: Player, limit: number = 10): NewsItem[] {
  const news = player.news || [];
  return news
    .sort((a, b) => {
      // Primeiro por temporada (mais recente primeiro)
      if (b.season !== a.season) return b.season - a.season;
      // Depois por semana (mais recente primeiro)
      const weekA = a.week ?? 0;
      const weekB = b.week ?? 0;
      if (weekB !== weekA) return weekB - weekA;
      // Finalmente por prioridade
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, limit);
}

/**
 * Adiciona notícia ao histórico do jogador
 */
export function addNewsToPlayer(player: Player, newsItem: NewsItem): Player {
  const existingNews = player.news || [];

  // Evitar duplicação
  if (existingNews.some(n => n.id === newsItem.id)) {
    return player;
  }

  return {
    ...player,
    news: [...existingNews, newsItem].slice(-50), // Manter últimas 50
  };
}

/**
 * Gera notícias para marcos de estatísticas
 */
export function checkMilestoneNews(
  player: Player,
  previousStats: { goals: number; assists: number; caps: number },
  currentStats: { goals: number; assists: number; caps: number },
  season: number
): NewsItem[] {
  const news: NewsItem[] = [];

  // Marcos de gols: 50, 100, 150, 200, 250, 300, 400, 500
  const goalMilestones = [50, 100, 150, 200, 250, 300, 400, 500];
  for (const milestone of goalMilestones) {
    if (previousStats.goals < milestone && currentStats.goals >= milestone) {
      news.push(createNewsItem(player, 'goalMilestone', season, { count: milestone }));
    }
  }

  // Marcos de assistências: 50, 100, 150, 200
  const assistMilestones = [50, 100, 150, 200];
  for (const milestone of assistMilestones) {
    if (previousStats.assists < milestone && currentStats.assists >= milestone) {
      news.push(createNewsItem(player, 'assistMilestone', season, { count: milestone }));
    }
  }

  // Marcos de seleção: 25, 50, 75, 100, 125, 150
  const capsMilestones = [25, 50, 75, 100, 125, 150];
  for (const milestone of capsMilestones) {
    if (previousStats.caps < milestone && currentStats.caps >= milestone) {
      news.push(createNewsItem(player, 'capsMilestone', season, { count: milestone }));
    }
  }

  return news;
}
