/**
 * SOCIAL MEDIA SERVICE - v0.5.7
 *
 * Serviço para gerenciar mídia social, popularidade, patrocinadores e manchetes.
 * Atualiza os dados sociais do jogador com base em eventos da carreira.
 */

import type { Player, Team } from "../types";
import type {
  PlayerSocialData,
  Sponsor,
  Headline,
  SponsorTier,
} from "../types/socialTypes";
import {
  createInitialSocialData,
  getPopularityLevel,
  getRelationshipLevel,
  calculateMaxSponsors,
} from "../types/socialTypes";

// ============================================================================
// CONSTANTES
// ============================================================================

// Nomes genéricos de patrocinadores (sem marcas reais)
const SPONSOR_NAMES: Record<SponsorTier, string[]> = {
  bronze: ["Local Sports", "City Fitness", "Regional Bank", "Community Motors"],
  silver: ["National Gear", "Sports Drink Co", "Fast Food Chain", "Mobile Tech"],
  gold: ["Global Athletics", "Energy Boost", "Premium Motors", "Tech Giant"],
  platinum: ["Elite Sports", "Luxury Fashion", "Super Motors", "Mega Tech"],
  diamond: ["World Athletics", "Royal Fashion", "Hypercar Motors", "Future Tech"],
};

// Base de renda semanal por tier
const SPONSOR_BASE_INCOME: Record<SponsorTier, number> = {
  bronze: 500,
  silver: 2000,
  gold: 8000,
  platinum: 25000,
  diamond: 75000,
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Calcula a popularidade inicial baseada em overall, clube e idade
 * Fórmula mais realista que considera prodígios e jogadores de clubes top
 */
export const calculateInitialPopularity = (
  overall: number,
  clubReputation: number,
  playerAge: number
): number => {
  // Base: overall tem peso maior (0-48 para 50-90 OVR)
  let base = Math.max(0, (overall - 50) * 1.2);

  // Bônus para clubes top (rep >= 90 = +15)
  if (clubReputation >= 90) {
    base += 15;
  } else if (clubReputation >= 80) {
    base += 10;
  } else if (clubReputation >= 70) {
    base += 5;
  }

  // Bônus prodígio: jovem talentoso ganha mais visibilidade
  if (playerAge <= 18 && overall >= 75) {
    base += 15; // Prodígio excepcional
  } else if (playerAge <= 20 && overall >= 70) {
    base += 8; // Jovem promissor
  } else if (playerAge <= 22 && overall >= 80) {
    base += 5; // Talento emergente
  }

  // Overall alto tem bonus extra (world-class = sempre conhecido)
  if (overall >= 85) {
    base += 10;
  } else if (overall >= 80) {
    base += 5;
  }

  return Math.min(100, Math.max(0, Math.floor(base)));
};

/**
 * Inicializa os dados sociais de um jogador novo
 */
export const initializeSocialData = (
  clubReputation: number,
  playerOverall: number
): PlayerSocialData => {
  return createInitialSocialData(clubReputation, playerOverall);
};

/**
 * Garante que o jogador tenha dados sociais (para jogadores existentes)
 */
export const ensureSocialData = (player: Player): PlayerSocialData => {
  if (player.socialData) {
    return player.socialData;
  }

  // Usa nova fórmula que considera overall, clube e idade
  const basePopularity = calculateInitialPopularity(
    player.stats.overall,
    player.team?.reputation || 50,
    player.age
  );

  const socialData = createInitialSocialData(
    player.team?.reputation || 50,
    player.stats.overall
  );

  // Ajusta baseado na nova fórmula
  socialData.popularity.global = Math.min(100, basePopularity);
  socialData.popularity.level = getPopularityLevel(basePopularity);

  // Ajusta seguidores baseado em socialMediaFollowers existente
  if (player.socialMediaFollowers) {
    socialData.socialMedia.followers = player.socialMediaFollowers;
  }

  return socialData;
};

// ============================================================================
// ATUALIZAÇÃO DE SEGUIDORES
// ============================================================================

/**
 * Calcula o ganho de seguidores baseado em eventos
 */
export const calculateFollowersGain = (
  currentFollowers: number,
  eventType: string,
  multiplier: number = 1
): number => {
  const baseGains: Record<string, number> = {
    goal: 100,
    assist: 50,
    cleanSheet: 75,
    hatTrick: 5000,
    manOfTheMatch: 500,
    trophyWon: 10000,
    awardWon: 20000,
    awardNomination: 3000,
    nationalCallup: 2000,
    transfer: 5000,
    viralMoment: 50000,
  };

  const baseGain = baseGains[eventType] || 100;

  // Jogadores mais populares ganham mais seguidores (efeito viral)
  // v0.6: Rebalanceado - multiplicador viral mais conservador para evitar números irrealistas
  // Divisor aumentado de 10M para 100M, e cap máximo aplicado
  const viralMultiplier = Math.min(2.5, 1 + (currentFollowers / 100_000_000));

  // Cap máximo de ganho por evento para manter números realistas
  const rawGain = baseGain * multiplier * viralMultiplier;
  const maxGainPerEvent = 500_000; // Máximo de 500k seguidores por evento
  
  return Math.floor(Math.min(rawGain, maxGainPerEvent));
};

/**
 * Atualiza seguidores após um evento
 */
export const updateFollowers = (
  socialData: PlayerSocialData,
  eventType: string,
  multiplier: number = 1
): PlayerSocialData => {
  const gain = calculateFollowersGain(
    socialData.socialMedia.followers,
    eventType,
    multiplier
  );

  const newFollowers = socialData.socialMedia.followers + gain;
  const growth = (gain / socialData.socialMedia.followers) * 100;

  return {
    ...socialData,
    socialMedia: {
      ...socialData.socialMedia,
      followers: newFollowers,
      followersGrowthRate: Math.min(100, growth),
      trending: growth > 5 ? "rising" : socialData.socialMedia.trending,
    },
    careerHighlights: {
      ...socialData.careerHighlights,
      peakFollowers: Math.max(
        socialData.careerHighlights.peakFollowers,
        newFollowers
      ),
    },
  };
};

// ============================================================================
// ATUALIZAÇÃO DE POPULARIDADE
// ============================================================================

/**
 * Atualiza popularidade baseado em performance
 */
export const updatePopularity = (
  socialData: PlayerSocialData,
  change: number,
  isGlobal: boolean = true
): PlayerSocialData => {
  const newGlobal = Math.max(0, Math.min(100,
    socialData.popularity.global + (isGlobal ? change : change * 0.3)
  ));
  const newHome = Math.max(0, Math.min(100,
    socialData.popularity.homeCountry + change * 1.2
  ));
  const newCurrent = Math.max(0, Math.min(100,
    socialData.popularity.currentClubCountry + change
  ));

  return {
    ...socialData,
    popularity: {
      global: newGlobal,
      homeCountry: newHome,
      currentClubCountry: newCurrent,
      level: getPopularityLevel(newGlobal),
    },
    sponsorships: {
      ...socialData.sponsorships,
      maxSponsors: calculateMaxSponsors(newGlobal),
    },
  };
};

// ============================================================================
// RELACIONAMENTOS
// ============================================================================

/**
 * Atualiza relacionamento com torcida
 */
export const updateFanRelationship = (
  socialData: PlayerSocialData,
  change: number
): PlayerSocialData => {
  const newSentiment = Math.max(0, Math.min(100,
    socialData.relationships.fansSentiment + change
  ));

  return {
    ...socialData,
    relationships: {
      ...socialData.relationships,
      fansSentiment: newSentiment,
      fans: getRelationshipLevel(newSentiment),
    },
  };
};

/**
 * Atualiza relacionamento com imprensa
 */
export const updatePressRelationship = (
  socialData: PlayerSocialData,
  change: number
): PlayerSocialData => {
  const newSentiment = Math.max(0, Math.min(100,
    socialData.relationships.pressSentiment + change
  ));

  return {
    ...socialData,
    relationships: {
      ...socialData.relationships,
      pressSentiment: newSentiment,
      press: getRelationshipLevel(newSentiment),
    },
  };
};

/**
 * Atualiza relacionamentos ao final da temporada baseado na performance
 */
export const updateRelationshipsForSeason = (
  socialData: PlayerSocialData,
  averageRating: number,
  clubApproval: number,
  goals: number,
  assists: number
): PlayerSocialData => {
  // Calculate fan change based on performance
  let fanChange = 0;
  if (averageRating >= 7.5) fanChange += 8;
  else if (averageRating >= 7.0) fanChange += 5;
  else if (averageRating >= 6.5) fanChange += 2;
  else if (averageRating < 6.0) fanChange -= 5;

  // Goals and assists bonus
  fanChange += Math.min(10, goals * 0.5 + assists * 0.3);

  // Club approval sync - fans follow club opinion
  if (clubApproval >= 80) fanChange += 5;
  else if (clubApproval < 40) fanChange -= 5;

  // Calculate press change based on profile
  let pressChange = 0;
  if (averageRating >= 7.5) pressChange += 10;
  else if (averageRating >= 7.0) pressChange += 5;
  else if (averageRating < 6.0) pressChange -= 8;

  // Press loves goal scorers
  pressChange += Math.min(8, goals * 0.4);

  // Apply changes
  let updated = updateFanRelationship(socialData, fanChange);
  updated = updatePressRelationship(updated, pressChange);

  return updated;
};

// ============================================================================
// PATROCINADORES
// ============================================================================

/**
 * Gera uma oferta de patrocínio baseada na popularidade
 */
export const generateSponsorOffer = (
  popularity: number,
  currentSponsors: number,
  maxSponsors: number
): Sponsor | null => {
  if (currentSponsors >= maxSponsors) return null;

  // Chance de oferta baseada na popularidade
  const offerChance = popularity / 100;
  if (Math.random() > offerChance) return null;

  // Determina o tier baseado na popularidade
  let tier: SponsorTier = "bronze";
  if (popularity >= 90) tier = "diamond";
  else if (popularity >= 75) tier = "platinum";
  else if (popularity >= 55) tier = "gold";
  else if (popularity >= 35) tier = "silver";

  // Seleciona um nome aleatório
  const names = SPONSOR_NAMES[tier];
  const name = names[Math.floor(Math.random() * names.length)];

  // Calcula renda com variação
  const baseIncome = SPONSOR_BASE_INCOME[tier];
  const variation = 0.8 + Math.random() * 0.4; // 80% - 120%
  const weeklyIncome = Math.floor(baseIncome * variation);

  return {
    id: `sponsor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    tier,
    weeklyIncome,
    contractEndSeason: 0, // Será definido quando aceitar
  };
};

/**
 * Aceita uma oferta de patrocínio
 */
export const acceptSponsorOffer = (
  socialData: PlayerSocialData,
  sponsor: Sponsor,
  currentSeason: number,
  contractLength: number = 2
): PlayerSocialData => {
  const acceptedSponsor = {
    ...sponsor,
    contractEndSeason: currentSeason + contractLength,
  };

  const newSponsors = [...socialData.sponsorships.activeSponsors, acceptedSponsor];
  const newTotalIncome = newSponsors.reduce((sum, s) => sum + s.weeklyIncome, 0);

  return {
    ...socialData,
    sponsorships: {
      ...socialData.sponsorships,
      activeSponsors: newSponsors,
      totalWeeklyIncome: newTotalIncome,
      pendingOffers: socialData.sponsorships.pendingOffers.filter(
        o => o.sponsor.id !== sponsor.id
      ),
    },
  };
};

/**
 * Processa fim de temporada para patrocinadores (remove expirados)
 */
export const processSeasonEndSponsors = (
  socialData: PlayerSocialData,
  currentSeason: number
): PlayerSocialData => {
  const activeSponsors = socialData.sponsorships.activeSponsors.filter(
    s => s.contractEndSeason > currentSeason
  );

  const totalIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyIncome, 0);
  const seasonEarnings = socialData.sponsorships.totalWeeklyIncome * 52; // 52 semanas

  return {
    ...socialData,
    sponsorships: {
      ...socialData.sponsorships,
      activeSponsors,
      totalWeeklyIncome: totalIncome,
      totalCareerEarnings: socialData.sponsorships.totalCareerEarnings + seasonEarnings,
    },
  };
};

// ============================================================================
// MANCHETES
// ============================================================================

/**
 * Adiciona uma manchete
 */
export const addHeadline = (
  socialData: PlayerSocialData,
  headline: Omit<Headline, "id">
): PlayerSocialData => {
  const newHeadline: Headline = {
    ...headline,
    id: `headline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // Mantém apenas as últimas 10 manchetes
  const recentHeadlines = [newHeadline, ...socialData.recentHeadlines].slice(0, 10);

  // Atualiza contadores se necessário
  let updatedHighlights = { ...socialData.careerHighlights };
  if (headline.type === "viral") {
    updatedHighlights.totalViralMoments += 1;
  }
  if (headline.type === "controversy") {
    updatedHighlights.controversies += 1;
  }

  return {
    ...socialData,
    recentHeadlines,
    careerHighlights: updatedHighlights,
  };
};

/**
 * Gera manchete para um evento específico
 */
export const generateHeadlineForEvent = (
  eventType: string,
  playerName: string,
  seasonNumber: number,
  week: number,
  params?: Record<string, string | number>
): Omit<Headline, "id"> => {
  const headlineConfig: Record<string, { type: Headline["type"]; titleKey: string }> = {
    hatTrick: { type: "viral", titleKey: "social.headlines.hatTrick" },
    scoringStreak: { type: "positive", titleKey: "social.headlines.scoringStreak" },
    cleanSheetStreak: { type: "positive", titleKey: "social.headlines.cleanSheetStreak" },
    newContract: { type: "neutral", titleKey: "social.headlines.newContract" },
    topScorer: { type: "positive", titleKey: "social.headlines.topScorer" },
    transferred: { type: "neutral", titleKey: "social.headlines.transferred" },
    injuryReturn: { type: "positive", titleKey: "social.headlines.injuryReturn" },
    nationalCallup: { type: "positive", titleKey: "social.headlines.nationalCallup" },
    awardNomination: { type: "positive", titleKey: "social.headlines.awardNomination" },
    awardWon: { type: "viral", titleKey: "social.headlines.awardWon" },
    badForm: { type: "negative", titleKey: "social.headlines.badForm" },
    controversy: { type: "controversy", titleKey: "social.headlines.controversy" },
  };

  const config = headlineConfig[eventType] || { type: "neutral", titleKey: "social.headlines.generic" };

  return {
    type: config.type,
    titleKey: config.titleKey,
    titleParams: { player: playerName, ...params },
    timestamp: week,
    seasonNumber,
  };
};

// ============================================================================
// ATUALIZAÇÃO SEMANAL
// ============================================================================

/**
 * Atualização semanal dos dados sociais (chamada a cada simulação de semana)
 */
export const weeklyUpdate = (
  socialData: PlayerSocialData,
  player: Player,
  matchPlayed: boolean,
  goals: number,
  assists: number,
  cleanSheet: boolean,
  manOfTheMatch: boolean
): PlayerSocialData => {
  let updated = { ...socialData };

  // Atualiza seguidores baseado em performance
  if (matchPlayed) {
    if (goals >= 3) {
      updated = updateFollowers(updated, "hatTrick");
    } else if (goals > 0) {
      updated = updateFollowers(updated, "goal", goals);
    }

    if (assists > 0) {
      updated = updateFollowers(updated, "assist", assists);
    }

    if (cleanSheet) {
      updated = updateFollowers(updated, "cleanSheet");
    }

    if (manOfTheMatch) {
      updated = updateFollowers(updated, "manOfTheMatch");
    }
  }

  // Atualiza tendência
  const growthRate = updated.socialMedia.followersGrowthRate;
  updated.socialMedia.trending =
    growthRate > 3 ? "rising" :
      growthRate < -1 ? "falling" :
        "stable";

  // Decay natural do growth rate
  updated.socialMedia.followersGrowthRate *= 0.95;

  // Atualiza relacionamento com torcida baseado em performance
  if (matchPlayed) {
    const performanceBonus = goals * 2 + assists * 1 + (cleanSheet ? 1 : 0) + (manOfTheMatch ? 3 : 0);
    if (performanceBonus > 0) {
      updated = updateFanRelationship(updated, performanceBonus * 0.5);
    }
  }

  return updated;
};

// ============================================================================
// EXPORTAÇÃO PRINCIPAL
// ============================================================================

export const SocialService = {
  initializeSocialData,
  ensureSocialData,
  updateFollowers,
  updatePopularity,
  updateFanRelationship,
  updatePressRelationship,
  updateRelationshipsForSeason,
  generateSponsorOffer,
  acceptSponsorOffer,
  processSeasonEndSponsors,
  addHeadline,
  generateHeadlineForEvent,
  weeklyUpdate,
};

export default SocialService;
