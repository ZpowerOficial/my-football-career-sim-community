/**
 * FOOTBALL CAREER SIMULATOR - SOCIAL & MEDIA TYPES v0.5.3
 *
 * Sistema de mídia, redes sociais, patrocinadores e reputação pública.
 * Adiciona uma dimensão social e comercial à carreira do jogador.
 */

// ============================================================================
// REDES SOCIAIS
// ============================================================================

export interface SocialMediaStats {
  followers: number; // Número total de seguidores
  followersGrowthRate: number; // Taxa de crescimento mensal (%)
  engagement: number; // 0-100 (interação com posts)
  trending: "rising" | "stable" | "falling"; // Tendência atual
  viralMoments: number; // Quantidade de momentos virais na carreira
  lastViralEvent?: string; // Descrição do último momento viral
}

export interface SocialMediaHistory {
  seasonNumber: number;
  followersAtEnd: number;
  majorEvents: string[];
}

// ============================================================================
// POPULARIDADE E REPUTAÇÃO
// ============================================================================

export type PopularityLevel =
  | "unknown"      // < 10: Desconhecido
  | "local"        // 10-30: Conhecido localmente
  | "regional"     // 30-50: Conhecido na região
  | "national"     // 50-70: Conhecido no país
  | "continental"  // 70-85: Conhecido no continente
  | "global"       // 85-95: Estrela mundial
  | "legend";      // 95+: Lenda viva

export interface PopularityStats {
  global: number; // 0-100 - Popularidade mundial
  homeCountry: number; // 0-100 - No país de origem
  currentClubCountry: number; // 0-100 - No país do clube atual
  level: PopularityLevel;
}

// ============================================================================
// RELACIONAMENTOS
// ============================================================================

export type RelationshipLevel =
  | "adored"      // Adorado
  | "loved"       // Amado
  | "liked"       // Querido
  | "neutral"     // Neutro
  | "disliked"    // Criticado
  | "hated";      // Odiado

export interface Relationships {
  fans: RelationshipLevel; // Torcida do clube atual
  fansSentiment: number; // 0-100
  press: RelationshipLevel; // Imprensa
  pressSentiment: number; // 0-100
  boardConfidence: number; // 0-100 - Confiança da diretoria
  teamChemistry: number; // 0-100 - Relação com elenco
}

// ============================================================================
// PATROCINADORES
// ============================================================================

export type SponsorTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  weeklyIncome: number;
  contractEndSeason: number;
  bonusCondition?: string; // Ex: "Score 20 goals"
  bonusAmount?: number;
}

export interface SponsorshipStats {
  activeSponsors: Sponsor[];
  totalWeeklyIncome: number;
  totalCareerEarnings: number;
  pendingOffers: SponsorOffer[];
  maxSponsors: number; // Baseado na popularidade
}

export interface SponsorOffer {
  sponsor: Sponsor;
  expiresInWeeks: number;
}

// ============================================================================
// MANCHETES E MÍDIA
// ============================================================================

export type HeadlineType =
  | "positive"   // Elogio
  | "negative"   // Crítica
  | "neutral"    // Informativo
  | "viral"      // Momento viral
  | "controversy"; // Polêmica

export interface Headline {
  id: string;
  type: HeadlineType;
  titleKey: string; // Chave de tradução
  titleParams?: Record<string, string | number>; // Parâmetros para interpolação
  timestamp: number; // Semana do jogo
  seasonNumber: number;
  impactOnPopularity?: number; // +/- popularidade
  impactOnFans?: number; // +/- relação com torcida
}

// ============================================================================
// DADOS COMPLETOS DE MÍDIA/SOCIAL
// ============================================================================

export interface PlayerSocialData {
  // Redes sociais
  socialMedia: SocialMediaStats;
  socialMediaHistory: SocialMediaHistory[];

  // Popularidade
  popularity: PopularityStats;

  // Relacionamentos
  relationships: Relationships;

  // Patrocinadores
  sponsorships: SponsorshipStats;

  // Manchetes (últimas 10)
  recentHeadlines: Headline[];

  // Estatísticas de carreira
  careerHighlights: {
    peakFollowers: number;
    bestSponsorDeal: number;
    totalViralMoments: number;
    controversies: number;
  };
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS DE CÁLCULO
// ============================================================================

export const getPopularityLevel = (value: number): PopularityLevel => {
  if (value >= 95) return "legend";
  if (value >= 85) return "global";
  if (value >= 70) return "continental";
  if (value >= 50) return "national";
  if (value >= 30) return "regional";
  if (value >= 10) return "local";
  return "unknown";
};

export const getRelationshipLevel = (value: number): RelationshipLevel => {
  if (value >= 90) return "adored";
  if (value >= 75) return "loved";
  if (value >= 55) return "liked";
  if (value >= 40) return "neutral";
  if (value >= 20) return "disliked";
  return "hated";
};

export const getSponsorTierMultiplier = (tier: SponsorTier): number => {
  const multipliers: Record<SponsorTier, number> = {
    bronze: 1,
    silver: 2,
    gold: 4,
    platinum: 8,
    diamond: 15,
  };
  return multipliers[tier];
};

export const calculateMaxSponsors = (popularity: number): number => {
  if (popularity >= 85) return 5;
  if (popularity >= 70) return 4;
  if (popularity >= 50) return 3;
  if (popularity >= 30) return 2;
  return 1;
};

// ============================================================================
// DADOS INICIAIS PADRÃO
// ============================================================================

export const createInitialSocialData = (
  clubReputation: number = 50,
  playerOverall: number = 50,
  existingFollowers?: number
): PlayerSocialData => {
  const basePopularity = Math.floor((clubReputation + playerOverall) / 4);

  // Usar seguidores existentes se fornecidos, senão calcular deterministicamente
  const followers = existingFollowers ?? Math.floor(basePopularity * 50 + playerOverall * 10);

  return {
    socialMedia: {
      followers,
      followersGrowthRate: 0,
      engagement: Math.min(100, 20 + Math.floor(basePopularity / 3)),
      trending: "stable",
      viralMoments: 0,
    },
    socialMediaHistory: [],
    popularity: {
      global: Math.max(5, basePopularity - 20),
      homeCountry: basePopularity + 10,
      currentClubCountry: basePopularity,
      level: getPopularityLevel(basePopularity),
    },
    relationships: {
      fans: getRelationshipLevel(basePopularity + 5),
      fansSentiment: Math.min(100, Math.floor(40 + playerOverall * 0.2 + clubReputation * 0.1)),
      press: getRelationshipLevel(basePopularity),
      pressSentiment: Math.min(100, Math.floor(35 + playerOverall * 0.2 + clubReputation * 0.1)),
      boardConfidence: Math.min(100, Math.floor(50 + clubReputation * 0.2)),
      teamChemistry: Math.min(100, Math.floor(45 + playerOverall * 0.15)),
    },
    sponsorships: {
      activeSponsors: [],
      totalWeeklyIncome: 0,
      totalCareerEarnings: 0,
      pendingOffers: [],
      maxSponsors: calculateMaxSponsors(basePopularity),
    },
    recentHeadlines: [],
    careerHighlights: {
      peakFollowers: followers,
      bestSponsorDeal: 0,
      totalViralMoments: 0,
      controversies: 0,
    },
  };
};
