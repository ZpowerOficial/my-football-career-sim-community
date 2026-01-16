/**
 * EXPANDED ATTRIBUTES PROGRESSION - v0.5.2
 *
 * Sistema de progressão para os atributos ultra-detalhados.
 * Evolui os atributos expandidos baseado em idade, performance e treinamento.
 */

import type { Player, PositionDetail } from "../types";
import type {
  ExpandedPlayerData,
  TechnicalAttributes,
  PhysicalAttributes,
  MentalAttributes,
  DefensiveAttributes,
  GoalkeeperAttributes,
  CareerFinanceStats,
} from "../types/expandedPlayerTypes";
import { rand, clamp, randFloat, gaussianRandom } from "./utils";

// ============================================================================
// CONSTANTES DE PROGRESSÃO
// ============================================================================

// Categorias de atributos e suas curvas de evolução por fase da carreira
// v0.6.0: REWORKED DECLINE RATES - Players were maintaining OVR 85+ until 43+
const ATTRIBUTE_CATEGORY_CURVES = {
  // Atributos técnicos: pico na maturidade, declínio moderado
  technical: {
    youth: 2.5, // 14-20: Strong growth
    development: 2.0, // 20-25: Good growth
    peak: 0.6, // 25-30: Slight improvement
    decline: -0.8, // 30-34: Noticeable decline (was -0.2)
    twilight: -1.5, // 34+: Significant decline (was -0.5)
  },
  // Atributos físicos: pico cedo, declínio acentuado - most affected by age
  physical: {
    youth: 3.0, // High growth
    development: 1.5, // Moderate growth
    peak: 0.3, // Minimal improvement
    decline: -1.2, // 30-34: Strong decline (was -0.6)
    twilight: -2.2, // 34+: Very strong decline (was -1.0)
  },
  // Atributos mentais: crescem com experiência, mas eventualmente declinam
  mental: {
    youth: 1.2, // Slow growth
    development: 1.8, // Good growth (experience)
    peak: 1.0, // Still improving with experience
    decline: 0.2, // 30-34: Minimal gain, not loss (was 0.6)
    twilight: -0.4, // 34+: Start declining (was +0.2)
  },
  // Atributos defensivos: equilibrado, declínio moderado
  defensive: {
    youth: 2.0, // Good growth
    development: 1.8, // Good growth
    peak: 0.5, // Slight improvement
    decline: -0.7, // 30-34: Moderate decline (was -0.3)
    twilight: -1.3, // 34+: Significant decline (was -0.6)
  },
  // Goleiro: declínio mais lento que jogadores de linha, mas ainda presente
  goalkeeper: {
    youth: 2.0, // Good growth
    development: 1.5, // Moderate growth
    peak: 0.6, // Slight improvement
    decline: -0.5, // 30-34: Moderate decline (was -0.2)
    twilight: -1.0, // 34+: Noticeable decline (was -0.4)
  },
};

// Fases da carreira por idade
function getCareerPhase(
  age: number,
): keyof typeof ATTRIBUTE_CATEGORY_CURVES.technical {
  if (age < 20) return "youth";
  if (age < 25) return "development";
  if (age < 30) return "peak";
  if (age < 34) return "decline";
  return "twilight";
}

// ============================================================================
// PROGRESSÃO PRINCIPAL
// ============================================================================

/**
 * Evolui todos os atributos expandidos do jogador
 * v0.5.2: Agora considera dados detalhados da temporada
 */
export function evolveExpandedAttributes(
  player: Player,
  seasonPerformance: {
    rating: number; // 0-10
    matchesPlayed: number;
    goals: number;
    assists: number;
    developmentEvents?: string[];
    // v0.5.2: Dados detalhados para progressão específica
    goalsOutsideBox?: number;
    headedGoals?: number;
    golazos?: number;
    leftFootGoals?: number;
    rightFootGoals?: number;
    penaltyGoals?: number;
    keyPasses?: number;
    throughBalls?: number;
    interceptions?: number;
    tacklesWon?: number;
    aerialDuelsWon?: number;
  },
): void {
  if (!player.expandedData) return;

  const phase = getCareerPhase(player.age);
  const potential = player.potential;
  const current = player.stats.overall;

  // Fator de performance da temporada (0.7 - 1.3)
  const performanceFactor = clamp(
    0.7 + (seasonPerformance.rating - 6.5) * 0.15,
    0.7,
    1.3,
  );

  // Fator de minutos jogados (mais minutos = mais desenvolvimento)
  const minutesFactor = clamp(
    0.5 + (seasonPerformance.matchesPlayed / 40) * 0.5,
    0.5,
    1.2,
  );

  // Potencial não atingido = mais espaço para crescer
  // v0.5.6: INCREASED growth room impact for players far from potential
  const potentialGap = Math.max(0, potential - current);
  const growthRoom = potentialGap / 10; // 0-3.0 for gap of 0-30 (was /20)

  // Evolui cada categoria
  evolveTechnicalAttributes(
    player.expandedData.technicalAttributes,
    phase,
    performanceFactor,
    minutesFactor,
    growthRoom,
    player.position,
  );

  evolvePhysicalAttributes(
    player.expandedData.physicalAttributes,
    phase,
    performanceFactor,
    minutesFactor,
    growthRoom,
    player.age,
  );

  evolveMentalAttributes(
    player.expandedData.mentalAttributes,
    phase,
    performanceFactor,
    minutesFactor,
    growthRoom,
    player.stats.overall,
  );

  // v0.5.2: Progressão específica baseada em performance detalhada
  evolveBasedOnDetailedPerformance(player.expandedData, seasonPerformance);

  evolveDefensiveAttributes(
    player.expandedData.defensiveAttributes,
    phase,
    performanceFactor,
    minutesFactor,
    growthRoom,
    player.position,
  );

  if (player.position === "GK" && player.expandedData.goalkeeperAttributes) {
    evolveGoalkeeperAttributes(
      player.expandedData.goalkeeperAttributes,
      phase,
      performanceFactor,
      minutesFactor,
      growthRoom,
    );
  }

  // v0.5.2: Escala proficiência de posições secundárias com desenvolvimento geral
  // Base growth + performance bonus + age adjustment
  if (player.expandedData.physicalProfile?.secondaryPositions) {
    // Base growth: sempre cresce um pouco a cada temporada jogada
    const baseGrowth = 0.5 + seasonPerformance.matchesPlayed / 50; // 0.5-1.5 base

    // Performance bonus: rating acima da média dá bônus extra
    const performanceBonus = Math.max(0, (performanceFactor - 0.85) * 3); // 0-1.35

    // Age modifier: jovens crescem mais, veteranos crescem menos
    const ageModifier =
      phase === "youth"
        ? 2.0
        : phase === "development"
          ? 1.5
          : phase === "peak"
            ? 1.0
            : phase === "decline"
              ? 0.3
              : 0.1;

    // Total growth per season
    const totalGrowth = (baseGrowth + performanceBonus) * ageModifier;

    // Aplica o crescimento
    player.expandedData.physicalProfile.secondaryPositions =
      player.expandedData.physicalProfile.secondaryPositions.map((sp) => ({
        ...sp,
        proficiency: clamp(Math.round(sp.proficiency + totalGrowth), 30, 95),
      }));
  }

  // Atualiza finanças/reputação
  updateCareerFinanceStats(
    player.expandedData.careerFinanceStats,
    player,
    seasonPerformance,
  );
}

/**
 * Evolui atributos técnicos
 */
function evolveTechnicalAttributes(
  attrs: TechnicalAttributes,
  phase: keyof typeof ATTRIBUTE_CATEGORY_CURVES.technical,
  perfFactor: number,
  minutesFactor: number,
  growthRoom: number,
  position: PositionDetail,
): void {
  const baseCurve = ATTRIBUTE_CATEGORY_CURVES.technical[phase];
  // v0.5.6: Increased multiplier - players should reach potential
  const modifier =
    baseCurve * perfFactor * minutesFactor * (0.7 + growthRoom * 0.8);

  // Finishing
  evolveAttributeGroup(
    attrs.finishing,
    modifier,
    getPositionRelevance(position, "finishing"),
  );

  // Ball Control
  evolveAttributeGroup(
    attrs.ballControl,
    modifier,
    getPositionRelevance(position, "ballControl"),
  );

  // Dribbling
  evolveAttributeGroup(
    attrs.dribbling,
    modifier,
    getPositionRelevance(position, "dribbling"),
  );

  // Passing
  evolveAttributeGroup(
    attrs.passing,
    modifier,
    getPositionRelevance(position, "passing"),
  );

  // Set Pieces
  evolveAttributeGroup(
    attrs.setPieces,
    modifier * 0.7,
    getPositionRelevance(position, "setPieces"),
  );
}

/**
 * Evolui atributos físicos
 */
function evolvePhysicalAttributes(
  attrs: PhysicalAttributes,
  phase: keyof typeof ATTRIBUTE_CATEGORY_CURVES.physical,
  perfFactor: number,
  minutesFactor: number,
  growthRoom: number,
  age: number,
): void {
  const baseCurve = ATTRIBUTE_CATEGORY_CURVES.physical[phase];
  const modifier =
    baseCurve * perfFactor * minutesFactor * (0.3 + growthRoom * 0.7);

  // Speed - declina mais com idade
  const speedMod = modifier * (age > 30 ? 0.7 : 1.0);
  evolveAttributeGroup(attrs.speed, speedMod, 1.0);

  // Endurance - pode manter com treino
  evolveAttributeGroup(attrs.endurance, modifier * 1.1, 1.0);

  // Strength - declina mais lentamente
  const strengthMod = modifier * (age > 30 ? 0.9 : 1.0);
  evolveAttributeGroup(attrs.strength, strengthMod, 1.0);

  // Agility - declina com idade
  const agilityMod = modifier * (age > 32 ? 0.6 : 1.0);
  evolveAttributeGroup(attrs.agility, agilityMod, 1.0);

  // Jumping
  const jumpingMod = modifier * (age > 30 ? 0.8 : 1.0);
  evolveAttributeGroup(attrs.jumping, jumpingMod, 1.0);

  // Robustness - melhora com idade até certo ponto
  const robustMod = modifier * (age < 28 ? 1.2 : 0.8);
  evolveAttributeGroup(attrs.robustness, robustMod, 1.0);
}

/**
 * Evolui atributos mentais
 */
function evolveMentalAttributes(
  attrs: MentalAttributes,
  phase: keyof typeof ATTRIBUTE_CATEGORY_CURVES.mental,
  perfFactor: number,
  minutesFactor: number,
  growthRoom: number,
  overall: number,
): void {
  const baseCurve = ATTRIBUTE_CATEGORY_CURVES.mental[phase];
  // Mentais sempre podem evoluir, mas mais devagar em jogadores de alto nível
  const modifier =
    baseCurve *
    perfFactor *
    minutesFactor *
    (overall > 85 ? 0.5 : 0.8 + growthRoom * 0.3);

  // Game Intelligence - cresce com experiência
  evolveAttributeGroup(attrs.gameIntelligence, modifier * 1.2, 1.0);

  // Personality - mais estável
  evolveAttributeGroup(attrs.personality, modifier * 0.5, 1.0);

  // Performance - melhora com experiência em jogos grandes
  evolveAttributeGroup(attrs.performance, modifier * 0.8, 1.0);
}

/**
 * Evolui atributos defensivos
 */
function evolveDefensiveAttributes(
  attrs: DefensiveAttributes,
  phase: keyof typeof ATTRIBUTE_CATEGORY_CURVES.defensive,
  perfFactor: number,
  minutesFactor: number,
  growthRoom: number,
  position: PositionDetail,
): void {
  const baseCurve = ATTRIBUTE_CATEGORY_CURVES.defensive[phase];
  const isDefender = ["CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(position);
  const modifier =
    baseCurve *
    perfFactor *
    minutesFactor *
    (0.5 + growthRoom * 0.5) *
    (isDefender ? 1.2 : 0.7);

  evolveAttributeGroup(attrs.marking, modifier, 1.0);
  evolveAttributeGroup(attrs.pressing, modifier, 1.0);
  evolveAttributeGroup(attrs.tackling, modifier, 1.0);
  evolveAttributeGroup(attrs.interception, modifier, 1.0);
  evolveAttributeGroup(attrs.defensivePositioning, modifier, 1.0);
}

/**
 * Evolui atributos de goleiro
 */
function evolveGoalkeeperAttributes(
  attrs: GoalkeeperAttributes,
  phase: keyof typeof ATTRIBUTE_CATEGORY_CURVES.goalkeeper,
  perfFactor: number,
  minutesFactor: number,
  growthRoom: number,
): void {
  const baseCurve = ATTRIBUTE_CATEGORY_CURVES.goalkeeper[phase];
  const modifier =
    baseCurve * perfFactor * minutesFactor * (0.5 + growthRoom * 0.5);

  evolveAttributeGroup(attrs.shotStopping, modifier, 1.0);
  evolveAttributeGroup(attrs.positioning, modifier, 1.0);
  evolveAttributeGroup(attrs.distribution, modifier * 0.8, 1.0);
  evolveAttributeGroup(attrs.commanding, modifier * 1.1, 1.0);
  evolveAttributeGroup(attrs.mentalGK, modifier * 1.2, 1.0);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Evolui um grupo de atributos
 */
function evolveAttributeGroup(
  group: any, // Interface types don't have index signature
  modifier: number,
  relevance: number,
): void {
  for (const key of Object.keys(group)) {
    const current = group[key];
    if (typeof current !== "number") continue;

    // Variação base
    const change = modifier * relevance * randFloat(0.5, 1.5);

    // Adiciona ruído gaussiano
    const noise = gaussianRandom(0, 0.5);

    // Cap baseado no valor atual (mais difícil subir quando já alto)
    const capFactor = current > 90 ? 0.3 : current > 80 ? 0.6 : 1.0;

    // Aplica mudança
    let newValue = current + change * capFactor + noise;

    // Eventos especiais (2% chance de salto/queda)
    if (Math.random() < 0.02) {
      newValue += randFloat(-3, 5);
    }

    group[key] = clamp(Math.round(newValue), 1, 99);
  }
}

/**
 * Retorna relevância de categoria de atributo para uma posição
 */
function getPositionRelevance(
  position: PositionDetail,
  category: string,
): number {
  const relevanceMap: Record<string, Record<PositionDetail, number>> = {
    finishing: {
      ST: 1.5,
      CF: 1.4,
      LW: 1.2,
      RW: 1.2,
      CAM: 1.0,
      CM: 0.7,
      LM: 0.8,
      RM: 0.8,
      CDM: 0.4,
      CB: 0.2,
      LB: 0.3,
      RB: 0.3,
      LWB: 0.4,
      RWB: 0.4,
      GK: 0.1,
    },
    ballControl: {
      CAM: 1.3,
      LW: 1.3,
      RW: 1.3,
      CF: 1.2,
      ST: 1.0,
      CM: 1.2,
      LM: 1.1,
      RM: 1.1,
      CDM: 0.9,
      CB: 0.6,
      LB: 0.8,
      RB: 0.8,
      LWB: 0.9,
      RWB: 0.9,
      GK: 0.3,
    },
    dribbling: {
      LW: 1.4,
      RW: 1.4,
      CAM: 1.3,
      CF: 1.2,
      ST: 1.0,
      LM: 1.2,
      RM: 1.2,
      CM: 0.9,
      CDM: 0.5,
      LB: 0.7,
      RB: 0.7,
      LWB: 0.9,
      RWB: 0.9,
      CB: 0.3,
      GK: 0.1,
    },
    passing: {
      CAM: 1.4,
      CM: 1.4,
      CDM: 1.2,
      CF: 1.1,
      LM: 1.1,
      RM: 1.1,
      LW: 1.0,
      RW: 1.0,
      ST: 0.8,
      CB: 0.9,
      LB: 1.0,
      RB: 1.0,
      LWB: 1.1,
      RWB: 1.1,
      GK: 0.5,
    },
    setPieces: {
      CAM: 1.2,
      CM: 1.0,
      LW: 1.0,
      RW: 1.0,
      CF: 0.9,
      LM: 0.8,
      RM: 0.8,
      CDM: 0.7,
      ST: 0.8,
      LB: 0.5,
      RB: 0.5,
      LWB: 0.6,
      RWB: 0.6,
      CB: 0.3,
      GK: 0.1,
    },
  };

  return relevanceMap[category]?.[position] ?? 1.0;
}

/**
 * Atualiza estatísticas de carreira/finanças
 */
function updateCareerFinanceStats(
  stats: CareerFinanceStats,
  player: Player,
  seasonPerf: { rating: number; matchesPlayed: number },
): void {
  // Atualiza reputações baseado em performance
  const repChange = (seasonPerf.rating - 6.5) * 2;

  stats.localReputation = clamp(
    stats.localReputation + repChange * 1.5,
    0,
    100,
  );
  stats.continentalReputation = clamp(
    stats.continentalReputation + repChange,
    0,
    100,
  );
  stats.worldReputation = clamp(
    stats.worldReputation + repChange * 0.5,
    0,
    100,
  );

  // Atualiza status no clube baseado em matches e rating
  if (seasonPerf.matchesPlayed >= 35 && seasonPerf.rating >= 7.5) {
    stats.clubReputation = "Icon";
  } else if (seasonPerf.matchesPlayed >= 25 && seasonPerf.rating >= 7.0) {
    stats.clubReputation = "Important";
  } else if (seasonPerf.matchesPlayed >= 15) {
    stats.clubReputation = "Rotation";
  } else {
    stats.clubReputation = "Fringe";
  }

  // Atualiza market value
  if (player.marketValue > stats.peakMarketValue) {
    stats.peakMarketValue = player.marketValue;
    stats.peakMarketValueAge = player.age;
  }
  stats.currentMarketValue = player.marketValue;

  // Atualiza salários
  stats.weeklyWage = player.wage;
  stats.monthlyWage = player.wage * 4;
  stats.annualWage = player.wage * 52;
}

/**
 * Aplica bônus de treinamento específico a um atributo
 */
export function applyTrainingBonus(
  player: Player,
  category: "technical" | "physical" | "mental" | "defensive",
  intensity: "light" | "normal" | "intense",
): void {
  if (!player.expandedData) return;

  const bonusMultiplier =
    intensity === "intense" ? 1.5 : intensity === "normal" ? 1.0 : 0.5;
  const phase = getCareerPhase(player.age);

  let attrs: Record<string, any> | undefined;
  let baseCurve: number;

  switch (category) {
    case "technical":
      attrs = player.expandedData.technicalAttributes;
      baseCurve = ATTRIBUTE_CATEGORY_CURVES.technical[phase];
      break;
    case "physical":
      attrs = player.expandedData.physicalAttributes;
      baseCurve = ATTRIBUTE_CATEGORY_CURVES.physical[phase];
      break;
    case "mental":
      attrs = player.expandedData.mentalAttributes;
      baseCurve = ATTRIBUTE_CATEGORY_CURVES.mental[phase];
      break;
    case "defensive":
      attrs = player.expandedData.defensiveAttributes;
      baseCurve = ATTRIBUTE_CATEGORY_CURVES.defensive[phase];
      break;
  }

  if (!attrs) return;

  // Aplica bônus a todos os subgrupos
  for (const key of Object.keys(attrs)) {
    const subGroup = attrs[key];
    if (typeof subGroup === "object" && subGroup !== null) {
      evolveAttributeGroup(subGroup, baseCurve * bonusMultiplier * 0.3, 1.0);
    }
  }
}

/**
 * v0.5.2: Progressão específica baseada em performance detalhada
 * Jogadores que fazem muitos gols de fora evoluem longShots
 * Jogadores que fazem muitas cabeçadas evoluem heading, etc.
 */
function evolveBasedOnDetailedPerformance(
  expandedData: ExpandedPlayerData,
  perf: {
    goalsOutsideBox?: number;
    headedGoals?: number;
    golazos?: number;
    leftFootGoals?: number;
    rightFootGoals?: number;
    penaltyGoals?: number;
    keyPasses?: number;
    throughBalls?: number;
    interceptions?: number;
    tacklesWon?: number;
    aerialDuelsWon?: number;
  },
): void {
  const tech = expandedData.technicalAttributes;

  // Gols de fora da área → melhora finalizações de longa distância
  if (perf.goalsOutsideBox && perf.goalsOutsideBox >= 3) {
    const bonus = Math.min(perf.goalsOutsideBox * 0.5, 3);
    tech.finishing.finishingOutsideBox = clamp(
      tech.finishing.finishingOutsideBox + bonus,
      0,
      99,
    );
  }

  // Gols de cabeça → melhora atributos de cabeceio
  if (perf.headedGoals && perf.headedGoals >= 3) {
    const bonus = Math.min(perf.headedGoals * 0.4, 2.5);
    tech.finishing.headingAccuracy = clamp(
      tech.finishing.headingAccuracy + bonus,
      0,
      99,
    );
    tech.finishing.headingPower = clamp(
      tech.finishing.headingPower + bonus * 0.7,
      0,
      99,
    );
  }

  // Golazos → melhora atributos de finalização especiais
  if (perf.golazos && perf.golazos >= 2) {
    const bonus = Math.min(perf.golazos * 0.8, 3);
    tech.finishing.volleysAndAcrobatic = clamp(
      tech.finishing.volleysAndAcrobatic + bonus,
      0,
      99,
    );
    tech.finishing.finishingUnderPressure = clamp(
      tech.finishing.finishingUnderPressure + bonus * 0.6,
      0,
      99,
    );
  }

  // Pênaltis convertidos → melhora penalty taking
  if (perf.penaltyGoals && perf.penaltyGoals >= 3) {
    const bonus = Math.min(perf.penaltyGoals * 0.5, 2);
    tech.setPieces.penaltyTaking = clamp(
      tech.setPieces.penaltyTaking + bonus,
      0,
      99,
    );
  }

  // Gols com pé fraco → melhora pé fraco
  const preferredFoot = expandedData.physicalProfile.preferredFoot;
  if (
    preferredFoot === "Right" &&
    perf.leftFootGoals &&
    perf.leftFootGoals >= 1
  ) {
    // More organic progression - any weak foot goal helps
    const bonus = 0.15 + Math.min(perf.leftFootGoals * 0.1, 0.35);
    expandedData.physicalProfile.weakFootLevel = clamp(
      expandedData.physicalProfile.weakFootLevel + bonus,
      1,
      5,
    );
  } else if (
    preferredFoot === "Left" &&
    perf.rightFootGoals &&
    perf.rightFootGoals >= 1
  ) {
    const bonus = 0.15 + Math.min(perf.rightFootGoals * 0.1, 0.35);
    expandedData.physicalProfile.weakFootLevel = clamp(
      expandedData.physicalProfile.weakFootLevel + bonus,
      1,
      5,
    );
  }

  // Passes decisivos → melhora visão e passes verticais
  if (perf.keyPasses && perf.keyPasses >= 30) {
    const bonus = Math.min((perf.keyPasses - 20) * 0.05, 2);
    tech.passing.verticalPassBreakingLines = clamp(
      tech.passing.verticalPassBreakingLines + bonus,
      0,
      99,
    );
  }

  // Bolas longas bem-sucedidas → melhora through balls
  if (perf.throughBalls && perf.throughBalls >= 15) {
    const bonus = Math.min((perf.throughBalls - 10) * 0.1, 2);
    tech.passing.throughBalls = clamp(tech.passing.throughBalls + bonus, 0, 99);
  }

  // Interceptações → melhora leitura de jogo
  if (perf.interceptions && perf.interceptions >= 40) {
    const bonus = Math.min((perf.interceptions - 30) * 0.03, 2);
    expandedData.defensiveAttributes.interception.readingOfPlay = clamp(
      expandedData.defensiveAttributes.interception.readingOfPlay + bonus,
      0,
      99,
    );
  }

  // Desarmes bem-sucedidos → melhora timing de tackles
  if (perf.tacklesWon && perf.tacklesWon >= 30) {
    const bonus = Math.min((perf.tacklesWon - 20) * 0.05, 2);
    expandedData.defensiveAttributes.tackling.tackleTiming = clamp(
      expandedData.defensiveAttributes.tackling.tackleTiming + bonus,
      0,
      99,
    );
  }

  // Duelos aéreos → melhora jumping
  if (perf.aerialDuelsWon && perf.aerialDuelsWon >= 30) {
    const bonus = Math.min((perf.aerialDuelsWon - 20) * 0.04, 2);
    expandedData.physicalAttributes.jumping.standingVerticalJump = clamp(
      expandedData.physicalAttributes.jumping.standingVerticalJump + bonus,
      0,
      99,
    );
  }
}

/**
 * Simula lesão e seu impacto nos atributos
 */
export function applyInjuryImpact(
  player: Player,
  injuryType: "muscular" | "impact" | "chronic",
  daysOut: number,
): void {
  if (!player.expandedData) return;

  const phys = player.expandedData.matchPhysicalStats;

  // Registra lesão
  phys.injuriesByType[injuryType] += 1;
  phys.daysLostToInjurySeason += daysOut;
  phys.daysLostToInjuryCareer += daysOut;

  // Aumenta proneness se for recorrente
  if (phys.injuriesByType[injuryType] > 2) {
    phys.injuryProneness = clamp(phys.injuryProneness + 5, 0, 100);
  }

  // Impacto nos atributos físicos
  const physAttrs = player.expandedData.physicalAttributes;
  const impactFactor = daysOut > 60 ? 0.95 : daysOut > 30 ? 0.97 : 0.99;

  if (injuryType === "muscular") {
    // Afeta força e velocidade
    for (const key of Object.keys(physAttrs.speed)) {
      physAttrs.speed[key as keyof typeof physAttrs.speed] *= impactFactor;
    }
    for (const key of Object.keys(physAttrs.strength)) {
      physAttrs.strength[key as keyof typeof physAttrs.strength] *=
        impactFactor;
    }
  } else if (injuryType === "chronic") {
    // Afeta robustez permanentemente
    physAttrs.robustness.physicalRobustness *= impactFactor;
    physAttrs.robustness.injuryResistance *= impactFactor;
  }
}
