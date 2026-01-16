import {
  Player,
  CareerEvent,
  MediaNarrative,
  Personality,
  Team,
} from "../types";
import {
  rand,
  randFloat,
  clamp,
  MORALE_LEVELS,
  updateMorale,
  gaussianRandom,
} from "./utils";

// ==================== TIPOS E INTERFACES ====================

interface MediaCycle {
  sentiment:
  | "Very Positive"
  | "Positive"
  | "Neutral"
  | "Negative"
  | "Very Negative";
  intensity: number; // 0-100 (quão intenso é o ciclo)
  duration: number; // Quantas temporadas vai durar
  primaryNarrative: MediaNarrative;
  secondaryNarratives: MediaNarrative[];
}

interface ViralMoment {
  type:
  | "Goal"
  | "Skill"
  | "Celebration"
  | "Interview"
  | "Controversy"
  | "Charity"
  | "Fashion"
  | "Gaming";
  virality: number; // 0-100
  sentiment: "positive" | "negative" | "neutral";
  followerImpact: number;
  reputationImpact: number;
  description: string;
}

import type { Endorsement } from "../types";

interface Rivalry {
  opponent: string; // Nome do jogador rival
  intensity: number; // 0-100
  origin: string; // Como começou
  mediaAttention: number; // 0-100
}

interface SocialMediaMetrics {
  followers: number;
  engagementRate: number; // 0-10 (%)
  growthRate: number; // mensal
  controversyScore: number; // 0-100
  brandValue: number; // £M
}

interface EventResult {
  updatedPlayer: Player;
  events: CareerEvent[];
  viralMoments: ViralMoment[];
  newEndorsements: Endorsement[];
  socialMetrics: SocialMediaMetrics;
  mediaCycle: MediaCycle;
  followerGrowth: number;
}

// ==================== SISTEMA DE NARRATIVAS COMPLEXAS ====================

/**
 * Determina múltiplas narrativas simultâneas com pesos
 */
const calculateMediaNarratives = (
  player: Player,
  performanceRating: number,
  wasSeverelyInjuredLastSeason: boolean,
  goals: number,
  assists: number,
  matchesPlayed: number,
): {
  primary: MediaNarrative;
  secondary: MediaNarrative[];
  weights: Map<MediaNarrative, number>;
} => {
  const weights = new Map<MediaNarrative, number>();

  // ========== CALCULAR PESO DE CADA NARRATIVA ==========

  // Prodigy
  if (player.age < 20 && player.potential >= 88) {
    weights.set("Prodigy", 85 + (player.potential - 88) * 3);
  }

  // On the Rise
  if (
    player.age >= 20 &&
    player.age <= 24 &&
    performanceRating > 0.7 &&
    player.form >= 2
  ) {
    const riseScore = 60 + performanceRating * 30 + player.form * 2;
    weights.set("On the Rise", riseScore);
  }

  // Established Star
  if (player.age >= 24 && player.age <= 30 && player.stats.overall >= 85) {
    const starScore =
      70 + (player.stats.overall - 85) * 2 + (player.team.reputation - 80);
    if (player.team.leagueTier <= 2) {
      weights.set("Established Star", starScore);
    }
  }

  // Veteran Leader
  if (player.age >= 30) {
    const veteranScore =
      50 + (player.age - 30) * 3 + (player.stats.leadership - 70) / 2;
    if (player.squadStatus === "Key Player") {
      weights.set("Veteran Leader", veteranScore);
    }
  }

  // Comeback Kid
  if (wasSeverelyInjuredLastSeason && performanceRating > 0.65) {
    weights.set("Comeback Kid", 90 + performanceRating * 20);
  } else if (player.mediaNarrative === "Flop" && performanceRating > 0.75) {
    weights.set("Comeback Kid", 85 + performanceRating * 15);
  } else if (
    player.mediaNarrative === "Under Pressure" &&
    performanceRating > 0.7
  ) {
    weights.set("Comeback Kid", 70 + performanceRating * 20);
  }

  // Flop - ONLY if genuinely underperforming AND club is unhappy
  // High clubApproval or positive form should NEVER result in Flop
  // User Feedback Fix: Made thresholds more lenient + added grace period
  const hasGoodApproval = player.clubApproval >= 60; // Lowered from 70
  const hasGoodForm = player.form >= 0;
  const isFirstSeason = player.yearsAtClub <= 1; // Grace period for adaptation
  const canBeFlop = !hasGoodApproval && !hasGoodForm && !isFirstSeason;

  if (canBeFlop) {
    // Big money signing that flopped (NOT in first season)
    if (
      player.yearsAtClub === 2 && // Second season check (first season is grace)
      player.marketValue >= 50 && // Higher bar
      performanceRating < 0.25 && // Stricter: was 0.35
      player.clubApproval < 40 // Stricter: was 50
    ) {
      const flopScore = 60 - performanceRating * 150 - player.clubApproval * 0.5; // Reduced from 80
      if (flopScore > 35) weights.set("Flop", flopScore);
    } else if (
      player.marketValue >= 60 && // Higher bar
      performanceRating < 0.20 && // Stricter: was 0.25
      matchesPlayed >= 20 && // More matches required: was 15
      player.clubApproval < 35 // Stricter: was 40
    ) {
      const flopScore = 55 - performanceRating * 100 - player.clubApproval * 0.3; // Reduced from 75
      if (flopScore > 35) weights.set("Flop", flopScore);
    }
  }

  // Under Pressure
  if (player.form <= -3 && player.stats.overall >= 80) {
    const pressureScore = 60 - player.form * 8 + (player.stats.overall - 80);
    weights.set("Under Pressure", pressureScore);
  } else if (
    player.seasonsWithLowPlayingTime >= 2 &&
    player.stats.overall >= 82
  ) {
    weights.set("Under Pressure", 55 + player.seasonsWithLowPlayingTime * 10);
  }

  // Forgotten Man
  if (player.age >= 28 && player.squadStatus === "Surplus") {
    weights.set("Forgotten Man", 70 + (player.age - 28) * 5);
  } else if (player.age >= 26 && player.seasonsWithLowPlayingTime >= 3) {
    weights.set("Forgotten Man", 65 + player.seasonsWithLowPlayingTime * 8);
  }

  // Cult Hero
  if (player.personality === "Loyal" && player.yearsAtClub >= 5) {
    const heroScore = 55 + player.yearsAtClub * 4 + player.teamChemistry / 2;
    if (player.team.leagueTier >= 2) {
      weights.set("Cult Hero", heroScore);
    }
  } else if (player.yearsAtClub >= 8 && player.teamChemistry >= 75) {
    weights.set("Cult Hero", 70 + player.yearsAtClub * 3);
  }

  // Journeyman
  if (player.age >= 30 && player.totalClubs >= 5) {
    weights.set(
      "Journeyman",
      50 + player.totalClubs * 5 + (player.age - 30) * 2,
    );
  }

  // ========== SELECIONAR PRIMÁRIA E SECUNDÁRIAS ==========
  const sorted = Array.from(weights.entries()).sort((a, b) => b[1] - a[1]);

  const primary = sorted.length > 0 ? sorted[0][0] : player.mediaNarrative;
  const secondary = sorted.slice(1, 3).map((s) => s[0]);

  return { primary, secondary, weights };
};

// ==================== SISTEMA DE VIRAL MOMENTS ====================

/**
 * Gera momentos virais baseados em eventos da temporada
 */
const generateViralMoments = (
  player: Player,
  performanceRating: number,
  goals: number,
  assists: number,
  matchesPlayed: number,
  seasonEvents: CareerEvent[],
): ViralMoment[] => {
  const viralMoments: ViralMoment[] = [];

  // ========== GOL ESPETACULAR ==========
  if (goals >= 15 && Math.random() < 0.25) {
    const virality = clamp(gaussianRandom(70, 15), 40, 95);
    viralMoments.push({
      type: "Goal",
      virality,
      sentiment: "positive",
      followerImpact: Math.floor(virality * rand(50000, 200000)),
      reputationImpact: Math.floor(virality / 10),
      description: `events.viral.goal`,
    });
  }

  // ========== SKILL/DRIBBLE INCRÍVEL ==========
  if (
    player.stats.dribbling >= 85 &&
    matchesPlayed >= 20 &&
    Math.random() < 0.15
  ) {
    const virality = clamp(gaussianRandom(65, 12), 45, 90);
    viralMoments.push({
      type: "Skill",
      virality,
      sentiment: "positive",
      followerImpact: Math.floor(virality * rand(40000, 150000)),
      reputationImpact: Math.floor(virality / 12),
      description: `events.viral.skill`,
    });
  }

  // ========== CELEbração ICônica ==========
  if (goals >= 10 && Math.random() < 0.1) {
    const virality = clamp(gaussianRandom(60, 18), 35, 85);
    viralMoments.push({
      type: "Celebration",
      virality,
      sentiment: "positive",
      followerImpact: Math.floor(virality * rand(30000, 120000)),
      reputationImpact: Math.floor(virality / 15),
      description: `events.viral.celebration`,
    });
  }

  // ========== ENTREVISTA POLÍTICA ==========
  if (player.personality === "Temperamental" && Math.random() < 0.18) {
    const virality = clamp(gaussianRandom(55, 20), 30, 90);
    const isPositive = Math.random() < 0.3;
    viralMoments.push({
      type: "Interview",
      virality,
      sentiment: isPositive ? "positive" : "negative",
      followerImpact: Math.floor(
        virality * rand(20000, 100000) * (isPositive ? 1 : 0.6),
      ),
      reputationImpact: isPositive
        ? Math.floor(virality / 12)
        : -Math.floor(virality / 8),
      description: isPositive
        ? `events.viral.interview.positive`
        : `events.viral.interview.negative`,
    });
  }

  // ========== CONTROVERSIÁ ==========
  if (
    player.personality === "Temperamental" ||
    player.personality === "Ambitious"
  ) {
    if (Math.random() < 0.08) {
      const virality = clamp(gaussianRandom(70, 18), 45, 95);
      viralMoments.push({
        type: "Controversy",
        virality,
        sentiment: "negative",
        followerImpact: Math.floor(virality * rand(10000, 80000)), // Controvérsia também gera seguidores
        reputationImpact: -Math.floor(virality / 5),
        description: `events.viral.controversy`,
      });
    }
  }

  // ========== TRABALHO DE CARIDADE ==========
  if (player.personality === "Professional" || player.personality === "Loyal") {
    if (Math.random() < 0.12) {
      const virality = clamp(gaussianRandom(50, 15), 30, 75);
      viralMoments.push({
        type: "Charity",
        virality,
        sentiment: "positive",
        followerImpact: Math.floor(virality * rand(25000, 100000)),
        reputationImpact: Math.floor(virality / 8),
        description: `events.viral.charity`,
      });
    }
  }

  // ========== FASHION/ESTILO ==========
  if (player.personality === "Media Darling" && player.stats.overall >= 82) {
    if (Math.random() < 0.15) {
      const virality = clamp(gaussianRandom(55, 12), 35, 80);
      viralMoments.push({
        type: "Fashion",
        virality,
        sentiment: "positive",
        followerImpact: Math.floor(virality * rand(30000, 150000)),
        reputationImpact: Math.floor(virality / 15),
        description: `events.viral.fashion`,
      });
    }
  }

  // ========== MOMENTO DE GAMING/ESPORTS ==========
  if (player.age <= 26 && Math.random() < 0.08) {
    const virality = clamp(gaussianRandom(45, 10), 25, 70);
    viralMoments.push({
      type: "Gaming",
      virality,
      sentiment: "neutral",
      followerImpact: Math.floor(virality * rand(40000, 180000)), // Gaming audience é grande
      reputationImpact: Math.floor(virality / 20),
      description: `events.viral.gaming`,
    });
  }

  return viralMoments;
};

// ==================== SISTEMA DE ENDORSEMENTS ====================

/**
 * Calcula valor de marca do jogador
 */
const calculateBrandValue = (
  player: Player,
  socialMetrics: SocialMediaMetrics,
): number => {
  let brandValue = 0;

  // Base: Overall e reputação
  brandValue += (player.stats.overall - 70) * 0.5;
  brandValue += (player.team.reputation - 70) * 0.3;

  // Social media
  const followersInMillions = socialMetrics.followers / 1000000;
  brandValue += Math.log10(Math.max(1, followersInMillions)) * 2;
  brandValue += socialMetrics.engagementRate * 0.5;

  // Performance
  brandValue += player.form * 0.2;

  // Idade (prime = melhor valor)
  if (player.age >= 24 && player.age <= 28) {
    brandValue *= 1.3;
  } else if (player.age >= 29 && player.age <= 31) {
    brandValue *= 1.15;
  } else if (player.age >= 32) {
    brandValue *= 0.85;
  } else if (player.age <= 21) {
    brandValue *= 1.1; // Potencial futuro
  }

  // Prêmios
  brandValue += player.awards.worldPlayerAward * 10;
  brandValue += player.awards.topScorerAward * 3;
  brandValue += player.awards.teamOfTheYear * 1.5;

  // Troféus
  const totalTrophies =
    player.trophies.league + player.trophies.cup + player.trophies.worldCup * 5;
  brandValue += totalTrophies * 0.5;

  // Narrativa de mídia
  const narrativeBonus: Record<MediaNarrative, number> = {
    Prodigy: 3,
    "On the Rise": 2.5,
    "Established Star": 5,
    "Veteran Leader": 2,
    "Comeback Kid": 3,
    "Cult Hero": 1.5,
    "Under Pressure": -2,
    Flop: -4,
    "Forgotten Man": -3,
    Journeyman: 0.5,
    "Hometown Hero": 2,
    "Polarizing Figure": 1,
    "Press Darling": 3,
    "System Player": 0.5,
    "Injury Comeback": 2,
  };
  brandValue += narrativeBonus[player.mediaNarrative] || 0;

  // Controvérsia reduz valor
  brandValue -= socialMetrics.controversyScore / 10;

  return Math.max(0, brandValue);
};

/**
 * Gera ofertas de endorsement
 */
const generateEndorsementOffers = (
  player: Player,
  brandValue: number,
  currentEndorsements: Endorsement[],
): Endorsement[] => {
  const newEndorsements: Endorsement[] = [];

  // Só jogadores com certo valor de marca recebem ofertas
  if (brandValue < 5) return [];

  // Número de ofertas baseado em valor de marca
  const offerCount =
    brandValue >= 20
      ? rand(2, 4)
      : brandValue >= 15
        ? rand(1, 3)
        : brandValue >= 10
          ? rand(1, 2)
          : Math.random() < 0.5
            ? 1
            : 0;

  // Novos tipos de endorsement
  const endorsementTypes: Endorsement["type"][] = [
    "Kit",
    "Boots",
    "Drinks",
    "Tech",
    "Fashion",
    "Automotive",
    "Watch",
    "Gaming",
  ];

  const brands: Record<Endorsement["type"], string[]> = {
    Kit: ["ProSport", "AthleteGear", "SpeedWear", "EliteFit", "PowerStride"],
    Boots: ["BootMaster", "FootPro", "StrikeForce", "GoalStep", "SwiftBoots"],
    Drinks: ["SportsDrink", "EnergyMax", "FuelUp", "PowerBite", "VitalBoost"],
    Tech: ["TechNova", "DigiPro", "SmartEdge", "ByteWave", "SoundMax"],
    Fashion: ["Elegance", "LuxeVue", "PremiumStyle", "GoldCraft", "TrendSet"],
    Automotive: ["AutoDrive", "Speedster", "RoadKing", "UrbanMove", "CarElite"],
    Watch: ["TimeMaster", "ChronoLux", "WatchPro", "EliteTime", "GoldTick"],
    Gaming: ["GameStation", "PlayZone", "StreamHub", "GamerPro", "PixelTech", "Zpower"],
  };

  for (let i = 0; i < offerCount; i++) {
    const type = endorsementTypes[rand(0, endorsementTypes.length - 1)];

    // Já tem endorsement deste tipo?
    if (currentEndorsements.some((e) => e.type === type)) continue;

    // Valor baseado em brand value e tipo
    let value = brandValue * rand(50000, 200000);

    // Ajuste de valor por tipo
    if (type === "Kit" || type === "Boots") value *= 2.5;
    else if (type === "Tech" || type === "Automotive" || type === "Watch") value *= 1.8;
    else if (type === "Fashion") value *= 1.5;
    else if (type === "Gaming") value *= 1.3;
    else if (type === "Drinks") value *= 1.1;

    // Duration
    const duration = rand(2, 4);

    const brand = brands[type][rand(0, brands[type].length - 1)];

    // Gerar id único
    const id = `${type}-${brand}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Requisitos e bônus fictícios
    const requirements = {
      minFollowers: rand(100000, 1000000),
      minOverall: rand(70, 90),
      minReputation: rand(50, 90),
      personalityFit: [],
    };
    const bonuses = {
      followerGrowth: rand(1000, 10000),
      reputationBonus: rand(1, 5),
      marketValueMultiplier: randFloat(1.01, 1.2),
    };

    const exclusivity = Math.random() < 0.5 ? "Exclusive" : "Non-Exclusive";
    const performanceBonus = Math.random() < 0.3;
    const startYear = new Date().getFullYear();

    newEndorsements.push({
      id,
      brand,
      type,
      value: Math.floor(value),
      duration,
      startYear,
      requirements,
      bonuses,
      exclusivity,
      performanceBonus,
    });
  }

  return newEndorsements;
};

// ==================== SISTEMA DE CICLOS DE MÍDIA ====================

/**
 * Determina o ciclo de mídia atual
 */
const determineMediaCycle = (
  player: Player,
  performanceRating: number,
  narratives: { primary: MediaNarrative; secondary: MediaNarrative[] },
  viralMoments: ViralMoment[],
): MediaCycle => {
  // ========== CALCULAR SENTIMENTO ==========
  let sentimentScore = 50; // Neutro

  // Performance
  if (performanceRating > 1.0) sentimentScore += 25;
  else if (performanceRating > 0.8) sentimentScore += 15;
  else if (performanceRating > 0.6) sentimentScore += 5;
  else if (performanceRating < 0.3) sentimentScore -= 20;
  else if (performanceRating < 0.5) sentimentScore -= 10;

  // Narrativa primária
  const narrativeSentiment: Record<MediaNarrative, number> = {
    Prodigy: 20,
    "On the Rise": 15,
    "Established Star": 10,
    "Comeback Kid": 25,
    "Cult Hero": 18,
    "Veteran Leader": 8,
    Journeyman: 0,
    "Under Pressure": -15,
    Flop: -25,
    "Forgotten Man": -18,
    "Hometown Hero": 20,
    "Polarizing Figure": 0,
    "Press Darling": 15,
    "System Player": 5,
    "Injury Comeback": 22,
  };
  sentimentScore += narrativeSentiment[narratives.primary];

  // Viral moments
  viralMoments.forEach((vm) => {
    if (vm.sentiment === "positive") sentimentScore += vm.virality / 10;
    else if (vm.sentiment === "negative") sentimentScore -= vm.virality / 8;
  });

  // Form
  sentimentScore += player.form * 2;

  // ========== DETERMINAR SENTIMENTO FINAL ==========
  let sentiment: MediaCycle["sentiment"];
  if (sentimentScore >= 80) sentiment = "Very Positive";
  else if (sentimentScore >= 60) sentiment = "Positive";
  else if (sentimentScore >= 40) sentiment = "Neutral";
  else if (sentimentScore >= 20) sentiment = "Negative";
  else sentiment = "Very Negative";

  // ========== INTENSIDADE ==========
  let intensity = 50; // Base

  // Viral moments aumentam intensidade
  viralMoments.forEach((vm) => {
    intensity += vm.virality / 5;
  });

  // Narrativas dramáticas aumentam intensidade
  if (["Comeback Kid", "Flop", "Under Pressure"].includes(narratives.primary)) {
    intensity += 20;
  }

  // Jogadores top sempre têm mais atenção
  if (player.stats.overall >= 88) intensity += 15;
  if (player.team.reputation >= 90) intensity += 10;

  intensity = clamp(intensity, 20, 100);

  // ========== DURAÇÃO ==========
  let duration = 1; // Padrão: 1 temporada

  // Narrativas estáveis duram mais
  if (
    ["Established Star", "Veteran Leader", "Cult Hero"].includes(
      narratives.primary,
    )
  ) {
    duration = rand(2, 4);
  }

  // Narrativas dramáticas são mais curtas
  if (["Comeback Kid", "Under Pressure"].includes(narratives.primary)) {
    duration = 1;
  }

  return {
    sentiment,
    intensity,
    duration,
    primaryNarrative: narratives.primary,
    secondaryNarratives: narratives.secondary,
  };
};

// ==================== EVENTOS DE PERSONALIDADE AVANÇADOS ====================

/**
 * Gera eventos baseados em personalidade com contexto
 */
const generatePersonalityEvents = (
  player: Player,
  performanceRating: number,
  mediaCycle: MediaCycle,
  seasonEvents: CareerEvent[],
): CareerEvent[] => {
  const events: CareerEvent[] = [];
  const moraleIndex = MORALE_LEVELS.indexOf(player.morale);

  switch (player.personality) {
    case "Ambitious":
      // Ambicioso fica frustrado se time não compete
      if (player.stats.overall >= 82 && player.team.leagueTier >= 2) {
        const hasTrophies = seasonEvents.some((e) => e.type === "trophy");
        const teamUnderperforming =
          player.team.reputation < player.stats.overall - 5;

        if (!hasTrophies && teamUnderperforming) {
          const frustrationChance = 0.35 + (player.stats.overall - 82) * 0.03;

          if (Math.random() < frustrationChance) {
            player.morale = updateMorale(player.morale, "down");
            player.clubApproval = clamp(
              player.clubApproval - rand(10, 20),
              0,
              100,
            );

            const eventType =
              Math.random() < 0.6 ? "meltdown" : "agitate_transfer";

            if (eventType === "agitate_transfer") {
              events.push({
                type: "agitate_transfer",
                description: `events.personality.ambitious.transfer`,
              });
            } else {
              events.push({
                type: "meltdown",
                description: `events.personality.ambitious.meltdown`,
              });
            }
          }
        }
      }
      break;

    case "Lazy":
      // Preguiçoso tem mais problemas
      const disciplineIssueChance =
        0.18 + (MORALE_LEVELS.indexOf(player.morale) < 2 ? 0.12 : 0);

      if (Math.random() < disciplineIssueChance) {
        player.morale = updateMorale(player.morale, "down");
        player.clubApproval = clamp(player.clubApproval - rand(12, 25), 0, 100);

        const issues = [
          "late_for_training",
          "training_criticism",
          "manager_fallout",
        ];

        const issue = issues[rand(0, issues.length - 1)];

        const descriptions: Record<string, string> = {
          late_for_training: `events.personality.lazy.late`,
          training_criticism: `events.personality.lazy.criticism`,
          manager_fallout: `events.personality.lazy.fallout`,
        };

        events.push({
          type: issue as any,
          description: descriptions[issue],
        });
      }
      break;

    case "Professional":
      // Profissional é reconhecido
      if (Math.random() < 0.25) {
        player.clubApproval = clamp(player.clubApproval + rand(8, 15), 0, 100);

        const praises = [
          `events.personality.professional.praise`,
          `events.personality.professional.roleModel`,
          `events.personality.professional.award`,
          `events.personality.professional.training`,
        ];

        events.push({
          type: "training_praise",
          description: praises[rand(0, praises.length - 1)],
        });

        // Chance de renovação facilitada
        if (player.contractLength <= 2 && Math.random() < 0.15) {
          events.push({
            type: "training_praise",
            description: `events.personality.professional.contract`,
          });
        }
      }
      break;

    case "Temperamental":
      // Temperamental tem explosões
      const baseChance = moraleIndex < 2 ? 0.45 : 0.2;
      const mediaPressure =
        mediaCycle.sentiment === "Negative" ||
          mediaCycle.sentiment === "Very Negative"
          ? 0.15
          : 0;

      const meltdownChance =
        baseChance + mediaPressure + (performanceRating < 0.4 ? 0.15 : 0);

      if (Math.random() < meltdownChance) {
        player.morale = updateMorale(player.morale, "down");
        player.clubApproval = clamp(player.clubApproval - rand(15, 30), 0, 100);

        const incidents = [
          {
            type: "training_bustup",
            desc: `events.personality.temperamental.bustup`,
          },
          {
            type: "manager_fallout",
            desc: `events.personality.temperamental.fallout`,
          },
          {
            type: "red_card",
            desc: `events.personality.temperamental.redCard`,
          },
          {
            type: "media_outburst",
            desc: `events.personality.temperamental.media`,
          },
          {
            type: "social_media_rant",
            desc: `events.personality.temperamental.social`,
          },
        ];

        const incident = incidents[rand(0, incidents.length - 1)];

        events.push({
          type: incident.type as any,
          description: incident.desc,
        });

        // Chance de multa/suspensão
        if (Math.random() < 0.4) {
          events.push({
            type: "manager_fallout",
            description: `events.personality.temperamental.fine`, // Note: Need to handle params in translation
          });
        }
      }
      break;

    case "Loyal":
      // Leal ganha reconhecimento dos torcedores
      if (player.yearsAtClub >= 4) {
        const loyaltyChance = 0.2 + player.yearsAtClub * 0.03;

        if (Math.random() < loyaltyChance) {
          player.clubApproval = clamp(
            player.clubApproval + rand(12, 20),
            0,
            100,
          );
          player.teamChemistry = clamp(
            player.teamChemistry + rand(5, 10),
            0,
            100,
          );

          const recognitions = [
            `events.personality.loyal.banner`,
            `events.personality.loyal.legend`,
            `events.personality.loyal.decade`,
            `events.personality.loyal.community`,
          ];

          events.push({
            type: "fan_favourite",
            description: recognitions[rand(0, recognitions.length - 1)],
          });
        }

        // Resistente a ofertas
        if (Math.random() < 0.12) {
          events.push({
            type: "rejects_agent_suggestion",
            description: `events.personality.loyal.reject`,
          });
        }
      }
      break;

    case "Determined":
      // Determinado supera adversidades
      if (moraleIndex <= 1 || performanceRating < 0.5) {
        if (Math.random() < 0.35) {
          player.morale = updateMorale(player.morale, "up");
          player.form = clamp(player.form + rand(1, 3), -10, 15);

          events.push({
            type: "milestone",
            description: `events.personality.determined.overcome`,
          });

          // Chance de moment of brilliance
          if (Math.random() < 0.2) {
            events.push({
              type: "breakthrough",
              description: `events.personality.determined.performance`,
            });
          }
        }
      }
      break;

    case "Media Darling":
      // Media Darling prospera ou sofre com atenção
      if (
        mediaCycle.sentiment === "Positive" ||
        mediaCycle.sentiment === "Very Positive"
      ) {
        // Prospera com atenção positiva
        if (Math.random() < 0.2) {
          events.push({
            type: "media_praise",
            description: `events.personality.mediaDarling.praise`,
          });
        }
      } else if (
        mediaCycle.sentiment === "Negative" ||
        mediaCycle.sentiment === "Very Negative"
      ) {
        // Sofre com críticas
        player.morale = updateMorale(player.morale, "down", 2);

        if (Math.random() < 0.25) {
          events.push({
            type: "media_criticism",
            description: `events.personality.mediaDarling.criticism`,
          });
        }
      }
      break;

    case "Reserved":
      // Reservado evita holofotes
      if (mediaCycle.intensity >= 70) {
        // Desconfortável com atenção
        if (Math.random() < 0.15) {
          player.morale = updateMorale(player.morale, "down");

          events.push({
            type: "media_criticism",
            description: `events.personality.reserved.uncomfortable`,
          });
        }
      }

      // Mas performance consistente é notada
      if (performanceRating > 0.75 && Math.random() < 0.18) {
        events.push({
          type: "media_praise",
          description: `events.personality.reserved.recognition`,
        });
      }
      break;

    case "Inconsistent":
      // Inconsistente tem altos e baixos dramáticos
      if (Math.random() < 0.3) {
        const isHigh = Math.random() < 0.5;

        if (isHigh) {
          player.form = clamp(player.form + rand(2, 5), -10, 15);
          player.morale = updateMorale(player.morale, "up");

          events.push({
            type: "form_boost",
            description: `events.personality.inconsistent.boost`,
          });
        } else {
          player.form = clamp(player.form - rand(2, 4), -10, 15);
          player.morale = updateMorale(player.morale, "down");

          events.push({
            type: "form_slump",
            description: `events.personality.inconsistent.slump`,
          });
        }
      }
      break;
  }

  return events;
};

// ==================== APROVAÇÃO REALISTA DO CLUBE ====================

/**
 * Calcula a aprovação do clube de forma realista
 * Considera: narrativa de mídia, tempo no clube, performance, títulos, status
 * v0.5.6: Corrige aprovação 0% para ídolos/cult heroes
 */
const calculateRealisticClubApproval = (
  player: Player,
  performanceRating: number,
  seasonTrophies: number,
  currentApproval: number,
): number => {
  let approval = currentApproval;

  // ========== FATORES POSITIVOS ==========

  // 1. Tempo no clube (jogadores de longa data são valorizados)
  const yearsBonus = Math.min(player.yearsAtClub * 3, 25); // Máx +25% por 8+ anos

  // 2. Performance da temporada
  if (performanceRating >= 0.8) {
    approval += 15; // Performance excelente
  } else if (performanceRating >= 0.6) {
    approval += 8; // Performance boa
  } else if (performanceRating < 0.3) {
    approval -= 10; // Performance ruim
  }

  // 3. Títulos conquistados na temporada
  approval += seasonTrophies * 12;

  // 4. Narrativa de mídia positiva (CRÍTICO para ídolos)
  const positiveNarratives: MediaNarrative[] = [
    "Cult Hero",
    "Hometown Hero",
    "Established Star",
    "Veteran Leader",
    "Prodigy",
    "On the Rise",
    "Comeback Kid",
    "Press Darling"
  ];

  const narrativeBonus: Partial<Record<MediaNarrative, number>> = {
    "Cult Hero": 35,        // Ídolo da torcida
    "Hometown Hero": 30,    // Herói local
    "Established Star": 20, // Estrela estabelecida
    "Veteran Leader": 25,   // Líder veterano
    "Prodigy": 15,          // Prodígio
    "On the Rise": 12,      // Em ascensão
    "Comeback Kid": 18,     // Rei do retorno
    "Press Darling": 10,    // Queridinho da mídia
    "Flop": -20,            // Fracasso
    "Under Pressure": -10,  // Sob pressão
    "Forgotten Man": -15,   // Homem esquecido
  };

  const narrativeMod = narrativeBonus[player.mediaNarrative] || 0;
  approval += narrativeMod;

  // 5. Trait "One-Club Man" (Ídolo do Clube)
  const hasOneClubManTrait = player.traits.some(
    (t) => t.name === "One-Club Man"
  );
  if (hasOneClubManTrait) {
    approval += 30; // Grande bônus para ídolos declarados
  }

  // 6. Status de capitão/jogador-chave
  if (player.squadStatus === "Captain") {
    approval += 15;
  } else if (player.squadStatus === "Key Player") {
    approval += 10;
  }

  // 7. Moral alta indica boa integração
  if (player.morale === "Very High") {
    approval += 8;
  } else if (player.morale === "High") {
    approval += 4;
  } else if (player.morale === "Low") {
    approval -= 5;
  } else if (player.morale === "Very Low") {
    approval -= 10;
  }

  // 8. Química do time
  if (player.teamChemistry >= 85) {
    approval += 10;
  } else if (player.teamChemistry >= 70) {
    approval += 5;
  }

  // ========== MÍNIMOS GARANTIDOS ==========

  // Ídolos/Cult Heroes nunca têm aprovação muito baixa
  if (player.mediaNarrative === "Cult Hero" || hasOneClubManTrait) {
    approval = Math.max(approval, 70); // Mínimo 70% para ídolos
  } else if (player.mediaNarrative === "Hometown Hero") {
    approval = Math.max(approval, 65); // Mínimo 65% para heróis locais
  } else if (positiveNarratives.includes(player.mediaNarrative)) {
    approval = Math.max(approval, 50); // Mínimo 50% para narrativas positivas
  }

  // Jogadores de longa data (8+ anos) têm proteção especial
  if (player.yearsAtClub >= 8) {
    approval = Math.max(approval, 60);
  } else if (player.yearsAtClub >= 5) {
    approval = Math.max(approval, 45);
  }

  // Aplicar bônus de tempo no clube
  approval += yearsBonus;

  return clamp(approval, 5, 100); // Nunca 0%, mínimo 5%
};


// ==================== NOVO SISTEMA DE MÉTRICAS SOCIAIS REALISTA ====================

const COUNTRY_MARKET_MULTIPLIERS: Record<string, number> = {
  Brazil: 1.8, Turkey: 1.6, Indonesia: 1.5, China: 1.4, Egypt: 1.5,
  England: 1.3, Spain: 1.2, Argentina: 1.3, France: 1.1, Germany: 1.1, USA: 1.4,
  default: 1.0,
  SanMarino: 0.5, Luxembourg: 0.6
};

const calculateSocialMetrics = (
  player: Player,
  performanceRating: number,
  goals: number,
  assists: number,
  viralMoments: ViralMoment[],
  mediaCycle: MediaCycle,
  seasonEvents: CareerEvent[] = [],
): SocialMediaMetrics => {
  // 1. STAR QUALITY (Se não existir, derivar)
  let starQuality = player.starQuality ?? player.stats.overall;
  // Considera atacantes e meias ofensivos (PositionDetail)
  const attackingPositions = ["ST", "CF", "LW", "RW", "CAM"];
  if (attackingPositions.includes(player.position)) starQuality *= 1.2;
  if (player.personality === "Media Darling") starQuality *= 1.5;
  if (player.personality === "Reserved") starQuality *= 0.7;

  // 2. FATOR PAÍS
  const countryFactor = COUNTRY_MARKET_MULTIPLIERS[player.nationality] || COUNTRY_MARKET_MULTIPLIERS.default;

  // 3. FATOR EXPOSIÇÃO DA LIGA
  let leagueExposure = 1.0;
  if (player.team.leagueTier === 1) {
    if (player.team.country === "England") leagueExposure = 3.5;
    else if (player.team.country === "Spain") leagueExposure = 3.0;
    else if (player.team.country === "Germany" || player.team.country === "Italy") leagueExposure = 2.0;
    else leagueExposure = 1.5;
  }

  // 4. CRESCIMENTO PASSIVO (Efeito Camisa)
  const clubFollowersEstimate = player.team.reputation * 1_000_000;
  let passiveGrowth = (clubFollowersEstimate * 0.05);

  // 5. CRESCIMENTO ATIVO (Performance)
  let activeGrowth = 0;
  const goalValue = 50000 * leagueExposure;
  activeGrowth += (goals * goalValue);
  activeGrowth += (assists * (goalValue * 0.5));
  if (performanceRating > 0.85) activeGrowth *= 1.5;

  // 6. TRANSFER SPIKE
  // Detecta transferência (tipo "transfer")
  const justTransferred = seasonEvents.some(e => e.type === "transfer");
  if (justTransferred) {
    const transferHype = clubFollowersEstimate * randFloat(0.10, 0.30);
    activeGrowth += transferHype;
    console.log(`🚀 TRANSFER BOOM: +${(transferHype / 1000000).toFixed(1)}M followers due to transfer`);
  }

  // ========== CÁLCULO TOTAL PRELIMINAR ========== 
  let totalGrowth = (passiveGrowth + activeGrowth) * countryFactor * (starQuality / 100);

  // Multiplicadores de Personalidade/Mídia
  const personalityMultipliers: Record<Personality, number> = {
    "Media Darling": 1.6,
    Professional: 1.1,
    Ambitious: 1.2,
    Loyal: 1.05,
    Reserved: 0.65,
    Temperamental: 1.15,
    Lazy: 0.9,
    Determined: 1.05,
    Inconsistent: 0.95,
    Leader: 1.15,
  };
  totalGrowth *= personalityMultipliers[player.personality] || 1.0;

  // Viral Moments
  viralMoments.forEach(vm => totalGrowth += vm.followerImpact);

  // Media Cycle
  if (mediaCycle.sentiment === "Very Positive") {
    totalGrowth *= 1.5;
  } else if (mediaCycle.sentiment === "Positive") {
    totalGrowth *= 1.25;
  } else if (mediaCycle.sentiment === "Negative") {
    totalGrowth *= 0.85;
  } else if (mediaCycle.sentiment === "Very Negative") {
    totalGrowth *= 0.7;
  }

  // ========== SATURATION CURVE (Curva Logística) ========== 
  const current = player.socialMediaFollowers;
  let saturationFactor = 1.0;
  if (current < 1_000_000) {
    saturationFactor = 1.5;
  } else if (current > 500_000_000) {
    saturationFactor = 0.01;
  } else if (current > 100_000_000) {
    saturationFactor = 0.05;
  } else if (current > 50_000_000) {
    saturationFactor = 0.15;
  } else {
    saturationFactor = 1.0;
  }
  totalGrowth *= saturationFactor;

  // ========== CHURN (Perda de Seguidores) ========== 
  let churn = 0;
  if (performanceRating < 0.4) churn += current * 0.02;
  if (mediaCycle.sentiment === "Very Negative") churn += current * 0.05;
  churn += current * 0.01;

  const finalFollowers = Math.max(0, current + totalGrowth - churn);

  // ========== ENGAGEMENT & BRAND VALUE (Refinado) ========== 
  let engagementRate = 10 * Math.pow(Math.max(1, finalFollowers), -0.15);
  if (viralMoments.length > 0) engagementRate *= 1.5;
  engagementRate = clamp(engagementRate, 0.5, 10.0);

  // Brand Value considera o poder de compra do país
  let economyFactor = ["England", "USA", "Germany", "Saudi Arabia"].includes(player.team.country) ? 1.5 : 1.0;

  // ========== CONTROVERSY SCORE ==========
  let controversyScore = 0;
  viralMoments.forEach((vm) => {
    if (vm.sentiment === "negative") {
      controversyScore += vm.virality / 2;
    }
  });
  if (player.personality === "Temperamental") controversyScore += 10;
  controversyScore = clamp(controversyScore, 0, 100);

  // ========== BRAND VALUE ==========
  const brandValue = calculateBrandValue(player, {
    followers: finalFollowers,
    engagementRate,
    growthRate: ((totalGrowth - churn) / Math.max(1, current)) * 100,
    controversyScore,
    brandValue: 0,
  }) * economyFactor;

  return {
    followers: Math.floor(finalFollowers),
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    growthRate: parseFloat((((totalGrowth - churn) / Math.max(1, current)) * 100).toFixed(2)),
    controversyScore: Math.floor(controversyScore),
    brandValue: parseFloat(brandValue.toFixed(1)),
  };
};

// ==================== FUNÇÃO PRINCIPAL ====================


export const processSeasonEvents = (
  player: Player,
  performanceRating: number,
  wasSeverelyInjuredLastSeason: boolean,
  goals: number,
  assists: number,
  cleanSheets: number,
  matchesPlayed: number,
  seasonEvents: CareerEvent[] = [],
): EventResult => {
  const events: CareerEvent[] = [];

  // ==================== PROCESSAR PATROCÍNIOS EXISTENTES ====================
  const currentYear = new Date().getFullYear(); // Ou use player.currentYear do save
  let incomeFromEndorsements = 0;
  let expiredCount = 0;

  player.endorsements = (player.endorsements || []).filter(endorsement => {
    const endYear = endorsement.startYear + endorsement.duration;
    // Se ainda está válido
    if (currentYear < endYear) {
      // 1. Pagar o jogador
      incomeFromEndorsements += endorsement.value;
      // 2. Verificar bônus de performance (se aplicável)
      if (endorsement.performanceBonus && performanceRating > 0.8) {
        const bonus = Math.floor(endorsement.value * 0.2); // 20% bônus
        incomeFromEndorsements += bonus;
        events.push({
          type: "money_gain",
          description: `Bônus de performance da ${endorsement.brand}: +$${bonus}`
        });
      }
      return true; // Mantém no array
    }
    // Se expirou
    expiredCount++;
    events.push({
      type: "contract_expired",
      description: `Contrato com ${endorsement.brand} expirou.`
    });
    return false; // Remove do array
  });

  // Adiciona dinheiro ao jogador
  player.cash += incomeFromEndorsements;

  if (incomeFromEndorsements > 0) {
    console.log(`💰 Faturamento de Patrocínios: £${(incomeFromEndorsements / 1000000).toFixed(2)}M`);
  }

  // ========== NARRATIVAS ==========
  const narratives = calculateMediaNarratives(
    player,
    performanceRating,
    wasSeverelyInjuredLastSeason,
    goals,
    assists,
    matchesPlayed,
  );

  // Atualizar narrativa primária
  if (narratives.primary !== player.mediaNarrative) {
    player.mediaNarrative = narratives.primary;

    events.push({
      type: "media_narrative_change",
      description: `events.media.narrativeChange`,
      descriptionParams: { narrative: narratives.primary },
    });

    // Impacto na moral
    const positiveNarratives = [
      "Prodigy",
      "On the Rise",
      "Comeback Kid",
      "Cult Hero",
      "Established Star",
    ];
    const negativeNarratives = ["Under Pressure", "Flop", "Forgotten Man"];

    if (positiveNarratives.includes(narratives.primary)) {
      player.morale = updateMorale(player.morale, "up");
    } else if (negativeNarratives.includes(narratives.primary)) {
      player.morale = updateMorale(player.morale, "down");
    }
  }

  // ========== VIRAL MOMENTS ==========
  const viralMoments = generateViralMoments(
    player,
    performanceRating,
    goals,
    assists,
    matchesPlayed,
    seasonEvents,
  );

  viralMoments.forEach((vm) => {
    events.push({
      type: vm.type === "Controversy" ? "media_criticism" : "media_praise",
      description: vm.description,
    });
  });

  // ========== MEDIA CYCLE ==========
  const mediaCycle = determineMediaCycle(
    player,
    performanceRating,
    narratives,
    viralMoments,
  );

  console.log(
    `[${player.name}] Media Cycle: ${mediaCycle.sentiment} (Intensity: ${mediaCycle.intensity}, Duration: ${mediaCycle.duration})`,
  );

  // ========== SOCIAL METRICS ==========
  const socialMetrics = calculateSocialMetrics(
    player,
    performanceRating,
    goals,
    assists,
    viralMoments,
    mediaCycle,
  );

  // Calculate follower growth (difference between new and old followers)
  const oldFollowers = player.socialMediaFollowers;
  const newFollowers = socialMetrics.followers;
  const followerGrowth = Math.max(0, newFollowers - oldFollowers);

  player.socialMediaFollowers = socialMetrics.followers;

  console.log(
    `  Social: ${(socialMetrics.followers / 1000000).toFixed(1)}M followers (${socialMetrics.growthRate > 0 ? "+" : ""}${socialMetrics.growthRate.toFixed(1)}%)`,
  );

  console.log(
    `  Brand Value: £${socialMetrics.brandValue.toFixed(1)}M, Engagement: ${socialMetrics.engagementRate}%`,
  );

  // ========== ENDORSEMENTS ==========
  const currentEndorsements: Endorsement[] = player.endorsements || [];
  const newEndorsements = generateEndorsementOffers(
    player,
    socialMetrics.brandValue,
    currentEndorsements,
  );

  newEndorsements.forEach((endorsement) => {
    events.push({
      type: "media_praise",
      description: `events.endorsement.signed`,
      descriptionParams: {
        duration: endorsement.duration,
        brand: endorsement.brand,
        value: (endorsement.value / 1000000).toFixed(1),
      },
    });
  });
  // Atualiza endorsements do jogador
  player.endorsements = [...currentEndorsements, ...newEndorsements];

  // ========== PERSONALITY EVENTS ==========
  const personalityEvents = generatePersonalityEvents(
    player,
    performanceRating,
    mediaCycle,
    seasonEvents,
  );
  events.push(...personalityEvents);

  // ========== PERFORMANCE-BASED EVENTS ==========
  if (performanceRating > 1.2) {
    events.push({
      type: "media_praise",
      description: `events.performance.exceptional`,
    });
  } else if (performanceRating > 0.9) {
    events.push({
      type: "media_praise",
      description: `events.performance.strong`,
    });
  } else if (performanceRating < 0.25 && matchesPlayed >= 15) {
    events.push({
      type: "media_criticism",
      description: `events.performance.disappointing`,
    });
  } else if (performanceRating < 0.4 && matchesPlayed >= 10) {
    events.push({
      type: "media_criticism",
      description: `events.performance.needsImprovement`,
    });
  }

  // ========== APROVAÇÃO REALISTA DO CLUBE (v0.5.6) ==========
  // Contar títulos ganhos na temporada
  const seasonTrophies = seasonEvents.filter(e => e.type === "trophy").length;

  // Recalcular aprovação do clube de forma realista
  player.clubApproval = calculateRealisticClubApproval(
    player,
    performanceRating,
    seasonTrophies,
    player.clubApproval || 50, // Default 50% se não definido
  );

  return {
    updatedPlayer: player,
    events,
    viralMoments,
    newEndorsements,
    socialMetrics,
    mediaCycle,
    followerGrowth,
  };
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Para debug - imprime resumo completo
 */
export const printSeasonEventsSummary = (result: EventResult): void => {
  console.log(`
========== SEASON EVENTS SUMMARY ==========`);
  console.log(`Player: ${result.updatedPlayer.name}`);
  console.log(`Media Narrative: ${result.updatedPlayer.mediaNarrative}`);
  console.log(`
MEDIA CYCLE:`);
  console.log(`  Sentiment: ${result.mediaCycle.sentiment}`);
  console.log(`  Intensity: ${result.mediaCycle.intensity}/100`);
  console.log(`  Primary: ${result.mediaCycle.primaryNarrative}`);
  if (result.mediaCycle.secondaryNarratives.length > 0) {
    console.log(
      `  Secondary: ${result.mediaCycle.secondaryNarratives.join(", ")}`,
    );
  }

  console.log(`
SOCIAL MEDIA:`);
  console.log(
    `  Followers: ${(result.socialMetrics.followers / 1000000).toFixed(1)}M`,
  );
  console.log(
    `  Growth Rate: ${result.socialMetrics.growthRate > 0 ? "+" : ""}${result.socialMetrics.growthRate.toFixed(1)}%`,
  );
  console.log(`  Engagement: ${result.socialMetrics.engagementRate}%`);
  console.log(`  Brand Value: £${result.socialMetrics.brandValue.toFixed(1)}M`);
  console.log(
    `  Controversy Score: ${result.socialMetrics.controversyScore}/100`,
  );

  if (result.viralMoments.length > 0) {
    console.log(`
VIRAL MOMENTS (${result.viralMoments.length}):`);
    result.viralMoments.forEach((vm) => {
      console.log(
        `  ${vm.sentiment === "positive" ? "✅" : vm.sentiment === "negative" ? "⚠️" : "⚪"} ${vm.type}: ${vm.description}`,
      );
      console.log(
        `     Virality: ${vm.virality}/100, Impact: +${(vm.followerImpact / 1000).toFixed(0)}K followers`,
      );
    });
  }

  if (result.newEndorsements.length > 0) {
    console.log(`
NEW ENDORSEMENTS (${result.newEndorsements.length}):`);
    result.newEndorsements.forEach((end) => {
      console.log(
        `  💰 ${end.brand} (${end.type}): £${(end.value / 1000000).toFixed(1)}M/year for ${end.duration} years`,
      );
    });
  }

  console.log(`
EVENTS (${result.events.length}):`);
  result.events.forEach((e) => console.log(`  - [${e.type}] ${e.description}`));
  console.log(`==========================================
`);
};
