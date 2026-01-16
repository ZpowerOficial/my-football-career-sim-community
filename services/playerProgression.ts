import { Player, PlayerStats, PositionDetail, CareerEvent } from "../types";
import { rand, clamp, randFloat } from "./utils";
import { evolveExpandedAttributes } from "./expandedAttributeProgression";

// ==================== SISTEMA PROBABILÃSTICO ====================

/**
 * Gera número usando distribuição normal (Box-Muller transform)
 */
const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};

/**
 * Gera valor usando elipse probabilística bivariada
 */
const bivariateSample = (
  mean1: number,
  mean2: number,
  stdDev1: number,
  stdDev2: number,
  correlation: number,
): [number, number] => {
  const z1 = gaussianRandom(0, 1);
  const z2 = gaussianRandom(0, 1);

  const x = mean1 + stdDev1 * z1;
  const y =
    mean2 + stdDev2 * (correlation * z1 + Math.sqrt(1 - correlation ** 2) * z2);

  return [x, y];
};

/**
 * Matriz de correlação entre fatores de desenvolvimento
 */
interface DevelopmentFactors {
  talent: number; // Potencial inato
  effort: number; // Trabalho/Personalidade
  opportunity: number; // Minutos jogados
  environment: number; // Clube/Liga/Mídia
  performance: number; // Rating atual
  age_factor: number; // Fase da carreira
}

/**
 * Calcula correlações dinâmicas entre fatores
 */
const getCorrelationMatrix = (player: Player): number[][] => {
  const { age, personality, archetype } = player;

  // Matriz 6x6 (simétrica)
  const baseCorrelation = [
    // talent, effort, opportunity, environment, performance, age_factor
    [1.0, 0.15, 0.25, 0.35, 0.45, -0.2], // talent
    [0.15, 1.0, 0.4, 0.2, 0.5, -0.1], // effort
    [0.25, 0.4, 1.0, 0.3, 0.55, 0.0], // opportunity
    [0.35, 0.2, 0.3, 1.0, 0.35, -0.15], // environment
    [0.45, 0.5, 0.55, 0.35, 1.0, -0.25], // performance
    [-0.2, -0.1, 0.0, -0.15, -0.25, 1.0], // age_factor
  ];

  // Ajustes dinâmicos baseados em traits
  const personalityMods =
    {
      Professional: { effort: 0.15, performance: 0.1 },
      Determined: { effort: 0.12, opportunity: 0.08 },
      Ambitious: { environment: 0.1, performance: 0.08 },
      Lazy: { effort: -0.2, performance: -0.15 },
      Temperamental: { performance: -0.1, effort: -0.08 },
      Inconsistent: { performance: -0.15 },
    }[personality] || {};

  const archetypeMods =
    {
      "Generational Talent": { talent: 0.2, age_factor: -0.1 },
      Wonderkid: { talent: 0.15, opportunity: 0.1 },
      "Late Bloomer": { age_factor: 0.25, talent: -0.05 },
      "The Engine": { effort: 0.2, opportunity: 0.15 },
      Journeyman: { environment: -0.1, effort: -0.05 },
    }[archetype] || {};

  // Aplica modificadores (simplificado aqui, na prática seria mais complexo)
  return baseCorrelation;
};

/**
 * Amostra multivariada usando decomposição de Cholesky
 */
const multivariateGaussianSample = (
  means: number[],
  stdDevs: number[],
  correlationMatrix: number[][],
): number[] => {
  const n = means.length;
  const z = Array(n)
    .fill(0)
    .map(() => gaussianRandom(0, 1));

  // Cholesky decomposition simplificada (para caso real use biblioteca)
  const L = choleskyDecomposition(correlationMatrix);

  // Transforma z usando Cholesky
  const correlated = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      correlated[i] += L[i][j] * z[j];
    }
    correlated[i] = means[i] + stdDevs[i] * correlated[i];
  }

  return correlated;
};

/**
 * Decomposição de Cholesky (simplificada)
 */
const choleskyDecomposition = (matrix: number[][]): number[][] => {
  const n = matrix.length;
  const L = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      if (j === i) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] ** 2;
        }
        L[j][j] = Math.sqrt(Math.max(matrix[j][j] - sum, 0.01));
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = (matrix[i][j] - sum) / Math.max(L[j][j], 0.01);
      }
    }
  }

  return L;
};

/**
 * Sistema de incerteza em camadas (meta-probabilidade)
 */
const uncertaintyLayer = (
  baseValue: number,
  uncertainty: number = 0.2,
): number => {
  // A própria incerteza é incerta
  const actualUncertainty = Math.abs(
    gaussianRandom(uncertainty, uncertainty * 0.3),
  );

  // Aplica múltiplas camadas de ruído
  let value = baseValue;

  // Camada 1: Variação sazonal
  value *= 1 + gaussianRandom(0, actualUncertainty);

  // Camada 2: Eventos aleatórios micro
  if (Math.random() < 0.15) {
    value *= 1 + gaussianRandom(0, actualUncertainty * 1.5);
  }

  // Camada 3: Outliers raros
  if (Math.random() < 0.02) {
    value *= Math.random() < 0.5 ? randFloat(1.5, 2.5) : randFloat(0.3, 0.6);
  }

  return value;
};

// ==================== PESOS POR POSIÃ‡ÃƒO ====================

const getStatWeights = (
  position: PositionDetail,
): Partial<{ [key in keyof PlayerStats]: number }> => {
  const baseWeights = {
    pace: 1,
    physical: 1,
    composure: 1,
    vision: 0.5,
    workRate: 0.5,
    stamina: 1,
  };
  switch (position) {
    case "GK":
      return {
        handling: 3,
        reflexes: 3,
        diving: 3,
        composure: 1,
        physical: 0.5,
        positioning: 1,
      };
    case "CB":
      return {
        ...baseWeights,
        defending: 3,
        strength: 2,
        jumping: 1,
        interceptions: 1.5,
        aggression: 0.5,
        leadership: 1,
        passing: 0.5,
      };
    case "LB":
    case "RB":
      return {
        ...baseWeights,
        defending: 2.5,
        pace: 1.5,
        crossing: 1,
        dribbling: 0.5,
        interceptions: 1,
        stamina: 1.5,
      };
    case "LWB":
    case "RWB":
      return {
        ...baseWeights,
        pace: 2,
        defending: 1.5,
        passing: 1.5,
        dribbling: 1,
        crossing: 1.5,
        stamina: 1.5,
      };
    case "CDM":
      return {
        ...baseWeights,
        defending: 2,
        passing: 2,
        physical: 1.5,
        vision: 1,
        interceptions: 2,
        aggression: 1,
      };
    case "CM":
      return {
        ...baseWeights,
        passing: 2.5,
        dribbling: 1.5,
        vision: 1.5,
        shooting: 1,
        defending: 1,
        longShots: 0.5,
      };
    case "CAM":
      return {
        ...baseWeights,
        passing: 2,
        dribbling: 2,
        shooting: 1.5,
        vision: 2,
        flair: 1,
        longShots: 1,
        curve: 0.5,
      };
    case "LM":
    case "RM":
      return {
        ...baseWeights,
        pace: 2,
        dribbling: 2,
        passing: 1.5,
        shooting: 1,
        flair: 1,
        crossing: 1.5,
      };
    case "LW":
    case "RW":
      return {
        ...baseWeights,
        pace: 2,
        dribbling: 2.5,
        shooting: 2,
        flair: 1.5,
        passing: 1,
        crossing: 1,
        curve: 1,
      };
    case "CF":
      return {
        ...baseWeights,
        shooting: 2.5,
        dribbling: 2,
        pace: 1.5,
        passing: 1.5,
        flair: 1,
        positioning: 1.5,
      };
    case "ST":
      return {
        ...baseWeights,
        shooting: 3,
        strength: 1.5,
        pace: 1.5,
        composure: 1.5,
        dribbling: 1,
        positioning: 1.5,
        jumping: 0.5,
      };
    default:
      return {};
  }
};

export const calculateOverall = (
  stats: PlayerStats,
  position: PositionDetail,
  expandedData?: any, // ExpandedPlayerData
): number => {
  // PRIORITY: If expandedData exists, calculate from it directly
  // This ensures UI-visible attributes are the source of truth
  if (expandedData?.technicalAttributes) {
    return calculateOverallFromExpanded(expandedData, position);
  }

  // Fallback: Use legacy base stats if no expandedData
  const weights = getStatWeights(position);
  let totalWeight = 0;
  let weightedSum = 0;

  const safeNum = (val: number | undefined, fallback = 0): number => {
    if (val === undefined || val === null || !Number.isFinite(val)) {
      return fallback;
    }
    return val;
  };

  const validStats = Object.keys(stats).filter(
    (stat) =>
      typeof stats[stat as keyof PlayerStats] === "number" &&
      Number.isFinite(stats[stat as keyof PlayerStats] as number) &&
      stat !== "overall",
  );

  for (const key of validStats) {
    const statKey = key as keyof PlayerStats;
    const statValue = stats[statKey];
    const weight = weights[statKey] || 0;

    if (typeof statValue === "number" && Number.isFinite(statValue) && typeof weight === "number") {
      weightedSum += statValue * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight <= 0.1) {
    const relevantStats = validStats
      .map((stat) => stats[stat as keyof PlayerStats])
      .filter((s) => typeof s === "number" && Number.isFinite(s)) as number[];

    if (relevantStats.length > 0) {
      const avg = relevantStats.reduce((a, b) => a + b, 0) / relevantStats.length;
      return Math.round(avg);
    }
    return 50;
  }

  const result = Math.round(weightedSum / totalWeight);
  if (!Number.isFinite(result)) {
    return 50;
  }
  return result;
};

/**
 * NEW: Calculate OVR directly from expandedStats
 * 
 * This is the SOURCE OF TRUTH for OVR calculation.
 * Uses position-weighted formulas based on real football attribute importance.
 */
const calculateOverallFromExpanded = (
  expandedData: any,
  position: PositionDetail,
): number => {
  const tech = expandedData.technicalAttributes;
  const phys = expandedData.physicalAttributes;
  const mental = expandedData.mentalAttributes;
  const def = expandedData.defensiveAttributes;
  const gk = expandedData.goalkeeperAttributes;

  const safeAvg = (...values: (number | undefined)[]): number => {
    const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (valid.length === 0) return 50;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const safeVal = (v: number | undefined): number => {
    return typeof v === 'number' && Number.isFinite(v) ? v : 50;
  };

  // Calculate category averages from expandedStats
  const finishing = tech?.finishing ? safeAvg(
    tech.finishing.finishingInsideBox,
    tech.finishing.finishingOutsideBox,
    tech.finishing.finishingOnCounter,
    tech.finishing.shotPower,
    tech.finishing.oneOnOneFinishing,
    tech.finishing.headingAccuracy,
  ) : 50;

  const dribbling = tech?.dribbling ? safeAvg(
    tech.dribbling.closeControlDribbling,
    tech.dribbling.speedDribbling,
    tech.dribbling.skillMoves,
    tech.dribbling.flair,
  ) : 50;

  const ballControl = tech?.ballControl ? safeAvg(
    tech.ballControl.firstTouchOrientated,
    tech.ballControl.firstTouchUnderPressure,
    tech.ballControl.trapping,
  ) : 50;

  const passing = tech?.passing ? safeAvg(
    tech.passing.shortPassingSupport,
    tech.passing.shortPassingUnderPressure,
    tech.passing.throughBalls,
    tech.passing.verticalPassBreakingLines,
    tech.passing.longDiagonalPass,
  ) : 50;

  const crossing = tech?.passing ? safeAvg(
    tech.passing.crossingFromByline,
    tech.passing.crossingFromDeep,
  ) : 50;

  const speed = phys?.speed ? safeAvg(
    phys.speed.accelerationInitial,
    phys.speed.topSpeed,
    phys.speed.sprintSpeed,
  ) : 50;

  const strength = phys?.strength ? safeAvg(
    phys.strength.upperBodyStrength,
    phys.strength.bodyToBodyStrength,
    phys.strength.balanceInContact,
  ) : 50;

  const stamina = phys?.endurance ? safeAvg(
    phys.endurance.stamina,
    phys.endurance.aerobicEndurance,
    phys.endurance.workRate,
  ) : 50;

  const agility = phys?.agility ? safeAvg(
    phys.agility.lateralAgility,
    phys.agility.reactionTime,
    phys.agility.coordination,
  ) : 50;

  const tackling = def?.tackling ? safeAvg(
    def.tackling.standingTackle,
    def.tackling.slidingTackle,
    def.tackling.tackleTiming,
  ) : 50;

  const marking = def?.marking ? safeAvg(
    def.marking.individualMarking,
    def.marking.zonalMarking,
    def.marking.trackingRuns,
  ) : 50;

  const interceptions = def?.interception ? safeAvg(
    def.interception.shortPassInterception,
    def.interception.readingOfPlay,
  ) : 50;

  const positioning = def?.defensivePositioning ? safeAvg(
    def.defensivePositioning.covering,
    def.defensivePositioning.positionRecovery,
    def.defensivePositioning.defensiveAwareness,
  ) : 50;

  const vision = mental?.gameIntelligence ? safeAvg(
    mental.gameIntelligence.vision,
    mental.gameIntelligence.creativity,
    mental.gameIntelligence.decisions,
  ) : 50;

  const composure = mental?.personality ? safeAvg(
    mental.personality.composure,
    mental.personality.composureInFinishing,
  ) : 50;

  const mentality = mental?.performance ? safeAvg(
    mental.performance.consistency,
    mental.performance.bigMatchPerformance,
    mental.performance.pressureHandling,
  ) : 50;

  // Goalkeeper specific
  const gkReflexes = gk?.shotStopping ? safeAvg(
    gk.shotStopping.reflexes,
    gk.shotStopping.diving,
    gk.shotStopping.oneOnOneStopping,
  ) : 50;

  const gkPositioning = gk?.positioning ? safeAvg(
    gk.positioning.positioning,
    gk.positioning.narrowingAngles,
  ) : 50;

  const gkHandling = gk?.mentalGK ? safeVal(gk.mentalGK.handling) : 50;

  // Position-weighted OVR calculation
  let ovr: number;

  switch (position) {
    case "ST":
      ovr = (
        finishing * 0.30 +       // Primary: Finishing is king for strikers
        speed * 0.15 +           // Important: Pace for runs
        composure * 0.12 +       // Mental: Composure in front of goal
        dribbling * 0.10 +       // Secondary: Ball control
        ballControl * 0.08 +
        strength * 0.08 +        // Physical: Holding up play
        vision * 0.07 +          // Playmaking
        mentality * 0.05 +
        stamina * 0.05
      );
      break;

    case "CF":
      ovr = (
        finishing * 0.22 +
        passing * 0.15 +         // CF needs to create
        dribbling * 0.15 +
        vision * 0.12 +
        ballControl * 0.10 +
        composure * 0.08 +
        speed * 0.08 +
        mentality * 0.05 +
        stamina * 0.05
      );
      break;

    case "LW":
    case "RW":
      ovr = (
        dribbling * 0.22 +       // Primary: Take on defenders
        speed * 0.20 +           // Essential for wingers
        crossing * 0.12 +        // Delivery
        finishing * 0.12 +       // Cutting inside
        ballControl * 0.10 +
        agility * 0.08 +
        passing * 0.06 +
        stamina * 0.05 +
        mentality * 0.05
      );
      break;

    case "CAM":
      ovr = (
        passing * 0.20 +         // Primary: Creative hub
        vision * 0.18 +
        dribbling * 0.15 +
        ballControl * 0.12 +
        finishing * 0.10 +       // Goals from midfield
        composure * 0.08 +
        agility * 0.07 +
        mentality * 0.05 +
        stamina * 0.05
      );
      break;

    case "CM":
      ovr = (
        passing * 0.22 +
        vision * 0.15 +
        stamina * 0.12 +         // Box-to-box requirement
        tackling * 0.10 +        // Defensive contribution
        ballControl * 0.10 +
        dribbling * 0.08 +
        composure * 0.08 +
        mentality * 0.08 +
        strength * 0.07
      );
      break;

    case "CDM":
      ovr = (
        tackling * 0.20 +        // Primary: Defensive duties
        interceptions * 0.15 +
        positioning * 0.12 +
        passing * 0.12 +         // Distribution
        strength * 0.10 +
        stamina * 0.10 +
        composure * 0.08 +
        vision * 0.07 +
        marking * 0.06
      );
      break;

    case "LM":
    case "RM":
      ovr = (
        stamina * 0.18 +         // Up and down the flank
        crossing * 0.15 +
        dribbling * 0.15 +
        speed * 0.12 +
        passing * 0.12 +
        tackling * 0.08 +        // Tracking back
        ballControl * 0.08 +
        mentality * 0.06 +
        positioning * 0.06
      );
      break;

    case "LWB":
    case "RWB":
      ovr = (
        stamina * 0.18 +         // Highest physical demand
        speed * 0.15 +
        crossing * 0.12 +
        tackling * 0.12 +
        dribbling * 0.10 +
        passing * 0.10 +
        positioning * 0.08 +
        strength * 0.08 +
        mentality * 0.07
      );
      break;

    case "LB":
    case "RB":
      ovr = (
        tackling * 0.18 +
        positioning * 0.15 +
        speed * 0.12 +
        stamina * 0.12 +
        marking * 0.10 +
        crossing * 0.10 +
        strength * 0.08 +
        passing * 0.08 +
        mentality * 0.07
      );
      break;

    case "CB":
      ovr = (
        tackling * 0.20 +
        positioning * 0.18 +
        marking * 0.15 +
        strength * 0.12 +
        interceptions * 0.10 +
        composure * 0.08 +       // Staying calm under pressure
        passing * 0.07 +         // Playing out from back
        mentality * 0.05 +
        speed * 0.05
      );
      break;

    case "GK":
      ovr = (
        gkReflexes * 0.30 +
        gkPositioning * 0.25 +
        gkHandling * 0.20 +
        composure * 0.10 +
        passing * 0.08 +         // Distribution
        mentality * 0.07
      );
      break;

    default:
      // Generic calculation
      ovr = safeAvg(finishing, dribbling, passing, speed, tackling, stamina, composure);
  }

  // Ensure valid range
  const result = Math.round(Math.max(1, Math.min(99, ovr)));
  return Number.isFinite(result) ? result : 50;
};

/**
 * Point 7: Sync base stats from expanded attributes
 * 
 * This ensures that OVR calculation (which uses base stats) accurately reflects
 * the expanded attributes visible in the UI. Each base stat is calculated as
 * the average of its corresponding expanded sub-attributes.
 */
export const syncBaseStatsFromExpanded = (player: Player): Player => {
  if (!player.expandedData) return player;

  const updatedPlayer = { ...player };
  const stats = { ...updatedPlayer.stats };
  const tech = player.expandedData.technicalAttributes;
  const phys = player.expandedData.physicalAttributes;
  const def = player.expandedData.defensiveAttributes;
  const mental = player.expandedData.mentalAttributes;

  // Helper to calculate average from object values
  const avgFromObj = (obj: Record<string, number> | undefined): number => {
    if (!obj) return 50;
    const values = Object.values(obj).filter(v => typeof v === 'number' && Number.isFinite(v));
    if (values.length === 0) return 50;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  // Sync shooting from finishing attributes
  if (tech?.finishing) {
    const finishing = tech.finishing;
    const finishingValues = [
      finishing.finishingInsideBox,
      finishing.finishingOutsideBox,
      finishing.finishingOnCounter,
      finishing.shotPower,
      finishing.oneOnOneFinishing,
    ].filter(v => typeof v === 'number' && Number.isFinite(v));
    if (finishingValues.length > 0) {
      stats.shooting = Math.round(finishingValues.reduce((a, b) => a + b, 0) / finishingValues.length);
    }
  }

  // Sync dribbling from dribbling + ballControl
  if (tech?.dribbling || tech?.ballControl) {
    const dribValues = [
      tech.dribbling?.closeControlDribbling,
      tech.dribbling?.speedDribbling,
      tech.dribbling?.skillMoves,
      tech.ballControl?.firstTouchOrientated,
      tech.ballControl?.firstTouchUnderPressure,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (dribValues.length > 0) {
      stats.dribbling = Math.round(dribValues.reduce((a, b) => a + b, 0) / dribValues.length);
    }
  }

  // Sync passing from passing attributes
  if (tech?.passing) {
    const passing = tech.passing;
    const passValues = [
      passing.shortPassingSupport,
      passing.shortPassingUnderPressure,
      passing.throughBalls,
      passing.verticalPassBreakingLines,
      passing.longDiagonalPass,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (passValues.length > 0) {
      stats.passing = Math.round(passValues.reduce((a, b) => a + b, 0) / passValues.length);
    }
  }

  // Sync pace from speed attributes
  if (phys?.speed) {
    const speed = phys.speed;
    const speedValues = [
      speed.accelerationInitial,
      speed.topSpeed,
      speed.sprintSpeed,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (speedValues.length > 0) {
      stats.pace = Math.round(speedValues.reduce((a, b) => a + b, 0) / speedValues.length);
    }
  }

  // Sync physical/strength from strength attributes
  if (phys?.strength) {
    const strength = phys.strength;
    const strValues = [
      strength.upperBodyStrength,
      strength.bodyToBodyStrength,
      strength.balanceInContact,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (strValues.length > 0) {
      stats.physical = Math.round(strValues.reduce((a, b) => a + b, 0) / strValues.length);
      stats.strength = stats.physical;
    }
  }

  // Sync stamina from endurance
  if (phys?.endurance) {
    const endurance = phys.endurance;
    const staminaValues = [
      endurance.stamina,
      endurance.aerobicEndurance,
      endurance.workRate,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (staminaValues.length > 0) {
      stats.stamina = Math.round(staminaValues.reduce((a, b) => a + b, 0) / staminaValues.length);
    }
  }

  // Sync defending from tackling + marking
  if (def?.tackling || def?.marking) {
    const defValues = [
      def.tackling?.standingTackle,
      def.tackling?.slidingTackle,
      def.marking?.individualMarking,
      def.marking?.zonalMarking,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (defValues.length > 0) {
      stats.defending = Math.round(defValues.reduce((a, b) => a + b, 0) / defValues.length);
    }
  }

  // Sync interceptions from interception attributes
  if (def?.interception) {
    const intValues = [
      def.interception.shortPassInterception,
      def.interception.readingOfPlay,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (intValues.length > 0) {
      stats.interceptions = Math.round(intValues.reduce((a, b) => a + b, 0) / intValues.length);
    }
  }

  // Sync crossing from passing crossing attributes
  if (tech?.passing) {
    const crossValues = [
      tech.passing.crossingFromByline,
      tech.passing.crossingFromDeep,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (crossValues.length > 0) {
      stats.crossing = Math.round(crossValues.reduce((a, b) => a + b, 0) / crossValues.length);
    }
  }

  // Sync vision from game intelligence
  if (mental?.gameIntelligence) {
    const visionValues = [
      mental.gameIntelligence.vision,
      mental.gameIntelligence.decisions,
      mental.gameIntelligence.creativity,
    ].filter(v => typeof v === 'number' && Number.isFinite(v)) as number[];
    if (visionValues.length > 0) {
      stats.vision = Math.round(visionValues.reduce((a, b) => a + b, 0) / visionValues.length);
    }
  }

  // Recalculate overall with synced stats - Task 1: USE expandedData directly
  stats.overall = calculateOverall(stats, player.position, player.expandedData);
  updatedPlayer.stats = stats;

  return updatedPlayer;
};

export const calculatePerformanceRating = (
  player: Player,
  goals: number,
  assists: number,
  cleanSheets: number,
  matchesPlayed: number,
): number => {
  if (matchesPlayed === 0) return 0;

  const { position, stats } = player;
  let rating = 0.5;

  if (position === "GK") {
    const csRate = cleanSheets / matchesPlayed;
    rating = csRate * 2.5;
  } else {
    const goalContribution = (goals + assists * 0.6) / matchesPlayed;

    const positionMultiplier =
      {
        ST: 1.9,
        CF: 1.7,
        LW: 1.6,
        RW: 1.6,
        CAM: 1.4,
        CM: 1.2,
        CDM: 1.1,
        LM: 1.0,
        RM: 1.0,
        LB: 0.9,
        RB: 0.9,
        LWB: 0.85,
        RWB: 0.85,
        CB: 0.8,
        GK: 0,
      }[position] || 1.0;

    rating = goalContribution * positionMultiplier;
  }

  const ovrFactor = (stats.overall - 70) / 100;
  rating *= 1 + ovrFactor;

  rating *= 1 + player.form / 10;

  const leagueFactor = 1 + (5 - player.team.leagueTier) * 0.03;
  rating *= leagueFactor;

  if (
    position === "CB" ||
    position === "LB" ||
    position === "RB" ||
    position === "GK"
  ) {
    rating *= 0.9;
  }

  rating = Math.max(0.3, rating);
  return clamp(rating, 0, 2.0);
};

const getStatName = (statKey: keyof PlayerStats): string => {
  // Translation happens in the frontend using attributes.* keys
  // Return the key itself for translation lookup
  return statKey;
};

// ==================== SISTEMA PROBABILÃSTICO DE PROGRESSÃƒO ====================

/**
 * Calcula fatores de desenvolvimento usando sistema probabilístico
 */
const calculateDevelopmentFactors = (
  player: Player,
  matchesPlayed: number,
  performanceRating: number,
): DevelopmentFactors => {
  const {
    stats,
    age,
    position,
    archetype,
    form,
    personality,
    potential,
    peakAgeEnd,
    team,
    reputation,
  } = player;

  // ===== TALENT FACTOR =====
  const potentialGap = Math.max(potential - stats.overall, 0);
  const talentMean = potentialGap * 0.12;
  const talentStdDev = potentialGap * 0.08; // Incerteza baseada no gap
  let talentFactor = Math.abs(gaussianRandom(talentMean, talentStdDev));

  // Archetype influencia talent
  const archetypeTalentMod =
    {
      "Generational Talent": gaussianRandom(1.8, 0.3),
      Wonderkid: gaussianRandom(1.5, 0.25),
      "Top Prospect": gaussianRandom(1.3, 0.2),
      "Technical Maestro": gaussianRandom(1.4, 0.25),
      "Late Bloomer": gaussianRandom(0.7, 0.2),
      "Solid Professional": gaussianRandom(1.0, 0.15),
      Journeyman: gaussianRandom(0.85, 0.2),
      "The Engine": gaussianRandom(1.2, 0.2),
      "Target Man": gaussianRandom(1.1, 0.18),
    }[archetype] || gaussianRandom(1.0, 0.2);

  talentFactor *= Math.max(0.3, archetypeTalentMod);

  // ===== EFFORT FACTOR =====
  const personalityEffortMod =
    {
      Professional: gaussianRandom(1.25, 0.15),
      Determined: gaussianRandom(1.2, 0.12),
      Ambitious: gaussianRandom(1.15, 0.12),
      Lazy: gaussianRandom(0.65, 0.15),
      Temperamental: gaussianRandom(0.75, 0.2),
      Inconsistent: gaussianRandom(0.7, 0.25),
    }[personality] || gaussianRandom(1.0, 0.15);

  let effortFactor = Math.max(0.3, personalityEffortMod);

  // Forma influencia esforço
  effortFactor *= 0.7 + form / 25 + gaussianRandom(0, 0.15);

  // ===== OPPORTUNITY FACTOR =====
  const matchesMean = Math.min(matchesPlayed / 30, 1.4);
  const matchesStdDev = 0.25;
  let opportunityFactor = Math.max(
    0.1,
    gaussianRandom(matchesMean, matchesStdDev),
  );

  // Penalidade severa por poucos jogos, mas probabilística
  if (matchesPlayed < 10) {
    opportunityFactor *= gaussianRandom(0.25, 0.1);
  } else if (matchesPlayed < 20) {
    opportunityFactor *= gaussianRandom(0.55, 0.15);
  }

  // ===== ENVIRONMENT FACTOR =====
  const leagueMean = (6 - team.leagueTier) * 0.18;
  const leagueStdDev = 0.12;
  const leagueFactor = gaussianRandom(leagueMean, leagueStdDev);

  const clubRepMean = (team.reputation / 100) * 0.25;
  const clubRepStdDev = 0.1;
  const clubFactor = gaussianRandom(clubRepMean, clubRepStdDev);

  const mediaAttention = (reputation / 100) * 0.15;
  const mediaFactor = gaussianRandom(mediaAttention, 0.08);

  // Facilities/Training (assumindo que seja uma propriedade do team)
  const facilitiesFactor = gaussianRandom(0.1, 0.05);

  // v0.5.6 - Training Investment Modifier
  // Aplicado quando jogador investe em treino intensivo
  const trainingModifier = player.trainingModifier || 1.0;

  let environmentFactor =
    1.0 + leagueFactor + clubFactor + mediaFactor + facilitiesFactor;
  environmentFactor = Math.max(0.5, uncertaintyLayer(environmentFactor, 0.15));

  // Aplica modificador de treino ao ambiente
  environmentFactor *= trainingModifier;

  // ===== PERFORMANCE FACTOR =====
  const perfMean = performanceRating * 0.6;
  const perfStdDev = 0.25;
  let performanceFactor = gaussianRandom(perfMean, perfStdDev);

  // Bonus por performance excepcional
  if (performanceRating > 1.5 && matchesPlayed >= 10) {
    const bonusMean = 0.35;
    const bonusStdDev = 0.15;
    performanceFactor += Math.abs(gaussianRandom(bonusMean, bonusStdDev));

    // Chance de aumentar potencial (MUITO RARO)
    // Reduced from 8% to 3% base chance, capped at original + 3
    if (age <= peakAgeEnd && Math.random() < gaussianRandom(0.03, 0.01)) {
      // Track original potential if not set
      const originalPotential = (player as any).originalPotential || player.potential;
      if (!(player as any).originalPotential) {
        (player as any).originalPotential = player.potential;
      }

      // Maximum potential increase is +3 from original
      const maxAllowedPotential = Math.min(originalPotential + 3, 99);
      if (player.potential < maxAllowedPotential) {
        const potIncrease = 1; // Only +1 at a time now
        player.potential = Math.min(player.potential + potIncrease, maxAllowedPotential);
      }
    }
  }

  // Garantia mínima por performance decente
  if (performanceRating > 0.6 && matchesPlayed >= 5) {
    performanceFactor = Math.max(performanceFactor, gaussianRandom(0.4, 0.15));
  }

  performanceFactor = Math.max(0, performanceFactor);

  // ===== AGE FACTOR =====
  // V4: Enhanced biological realism model for player aging
  // Based on professional footballer physical decline patterns
  let ageFactor: number;

  if (age < peakAgeEnd) {
    // Curva de crescimento probabilística
    if (age < 18) {
      ageFactor = gaussianRandom(2.0, 0.4);
    } else if (age < 20) {
      ageFactor = gaussianRandom(1.7, 0.35);
    } else if (age < 22) {
      ageFactor = gaussianRandom(1.4, 0.3);
    } else if (age < 24) {
      ageFactor = gaussianRandom(1.2, 0.25);
    } else if (age < 26) {
      ageFactor = gaussianRandom(1.0, 0.2);
    } else if (age < 28) {
      ageFactor = gaussianRandom(0.8, 0.2);
    } else if (age < 30) {
      ageFactor = gaussianRandom(0.6, 0.2);
    } else if (age < 32) {
      ageFactor = gaussianRandom(0.4, 0.18);
    } else {
      ageFactor = gaussianRandom(0.2, 0.15);
    }

    // Late Bloomer boost
    if (archetype === "Late Bloomer" && age >= 23 && age <= 28) {
      ageFactor *= gaussianRandom(1.4, 0.2);
    }
  } else {
    // V4: EXPONENTIAL DECLINE MODEL
    // Based on biological realism - professional footballers show predictable physical decline:
    // Age 30-32: -2% to -3% per year
    // Age 33-35: -4% to -6% per year  
    // Age 36-38: -7% to -10% per year
    // Age 39+: -10% to -15% per year
    
    const yearsAfterPeak = age - peakAgeEnd;
    
    // V4: Exponential decay with acceleration factor
    // Base decay rate compounds each year past peak
    const DECLINE_ACCELERATION = 1.5; // Each year decline accelerates by 50%
    const BASE_DECAY_RATE = 0.03; // 3% base decline
    
    // Calculate exponential decay: baseRate * acceleration^(yearsPostPeak-1)
    let declineRate = BASE_DECAY_RATE * Math.pow(DECLINE_ACCELERATION, Math.max(0, yearsAfterPeak - 1));
    
    // Cap maximum decay per season at 15%
    declineRate = Math.min(declineRate, 0.15);
    
    // Elite players decline slightly slower (better training, nutrition, etc)
    // But still decline significantly - no "immortal player" syndrome
    if (stats.overall > 85) {
      declineRate *= 0.85; // 15% slower decline
    } else if (stats.overall > 75) {
      declineRate *= 0.92; // 8% slower decline
    }
    
    // Convert to negative growth points
    // -declineRate * OVR gives us the expected point loss
    const expectedDecline = -declineRate * stats.overall;
    const declineStdDev = Math.abs(expectedDecline) * 0.25;
    
    ageFactor = gaussianRandom(expectedDecline, declineStdDev);

    // Some players resist decline better - reduces the negative value
    // Professional: reduce decline by 15-25%
    if (personality === "Professional") {
      const resistanceMultiplier = gaussianRandom(0.80, 0.05); // 0.75-0.85
      ageFactor *= resistanceMultiplier; // Less negative = less decline
    }
    
    // High fitness: reduce decline by 10-20%
    if (stats.fitness > 80) {
      const fitnessResistance = gaussianRandom(0.85, 0.05); // 0.80-0.90
      ageFactor *= fitnessResistance;
    }
    
    // V4: Age-specific accelerations for very old players
    // 36+: Additional 20% decline per year
    // 38+: Additional 35% decline per year  
    // 40+: Severe decline, retirement likely
    if (age >= 40) {
      ageFactor *= gaussianRandom(1.8, 0.2); // 60-100% additional decline
    } else if (age >= 38) {
      ageFactor *= gaussianRandom(1.35, 0.1); // 25-45% additional decline
    } else if (age >= 36) {
      ageFactor *= gaussianRandom(1.20, 0.08); // 12-28% additional decline
    }
    
    // Physical attributes decline faster - tracked via additional penalty
    // This is handled separately in stat distribution
  }

  // V4: Increased max decline to -20 for very old players (40+)
  ageFactor = Math.max(-20, Math.min(3, ageFactor));

  return {
    talent: talentFactor,
    effort: effortFactor,
    opportunity: opportunityFactor,
    environment: environmentFactor,
    performance: performanceFactor,
    age_factor: ageFactor,
  };
};

/**
 * Sistema principal de progressão marginal com elipses probabilísticas
 */
export const calculateMarginalProgression = (
  player: Player,
  matchesPlayed: number,
  performanceRating: number,
): {
  statChanges: Partial<Omit<PlayerStats, "preferredFoot">>;
  events: string[];
} => {
  const statChanges: Partial<Record<keyof PlayerStats, number>> = {};
  const events: string[] = [];

  const { stats, age, position, archetype, peakAgeEnd } = player;

  // Calcula fatores de desenvolvimento
  const factors = calculateDevelopmentFactors(
    player,
    matchesPlayed,
    performanceRating,
  );

  // Obtém matriz de correlação
  const correlationMatrix = getCorrelationMatrix(player);

  // Cria vetor de médias e desvios padrão
  const means = [
    factors.talent,
    factors.effort,
    factors.opportunity,
    factors.environment,
    factors.performance,
    factors.age_factor,
  ];

  const stdDevs = means.map((m) => Math.abs(m) * 0.25 + 0.15);

  // Amostra multivariada (elipse probabilística 6D)
  const sampledFactors = multivariateGaussianSample(
    means,
    stdDevs,
    correlationMatrix,
  );

  // Combina fatores em pontos de crescimento base
  let baseGrowthPoints = 0;

  if (age < peakAgeEnd) {
    baseGrowthPoints =
      (sampledFactors[0] * 0.3 + // talent
        sampledFactors[1] * 0.2 + // effort
        sampledFactors[2] * 0.2 + // opportunity
        sampledFactors[3] * 0.15 + // environment
        sampledFactors[4] * 0.15) * // performance
      sampledFactors[5]; // age_factor multiplier
  } else {
    baseGrowthPoints = sampledFactors[5]; // Pure decline
  }

  // Eventos de temporada excepcionais (meta-probabilidade)
  const seasonEventChance = Math.abs(gaussianRandom(0.5, 0.2));
  const seasonEventRoll = Math.random();

  if (seasonEventRoll < seasonEventChance * 0.1) {
    const boostMagnitude = gaussianRandom(1.8, 0.4);
    baseGrowthPoints *= Math.max(1.0, boostMagnitude);
    events.push("🌟 Teve uma temporada de desenvolvimento excepcional!");
  } else if (seasonEventRoll > 1 - seasonEventChance * 0.08) {
    const penaltyMagnitude = gaussianRandom(0.5, 0.2);
    baseGrowthPoints *= Math.max(0.2, Math.min(1.0, penaltyMagnitude));
    events.push("⚠️ Lutou para se desenvolver nesta temporada.");
  }

  // Incerteza final (a probabilidade é probabilística)
  baseGrowthPoints = uncertaintyLayer(baseGrowthPoints, 0.2);

  // ===== DISTRIBUIÃ‡ÃƒO POR STATS =====

  const positionWeights: Record<
    PositionDetail,
    Partial<Record<keyof PlayerStats, number>>
  > = {
    GK: {
      handling: 1.2,
      reflexes: 1.15,
      diving: 1.1,
      positioning: 1.05,
      composure: 1.0,
      pace: 0.3,
      dribbling: 0.4,
      shooting: 0.2,
      passing: 0.6,
      defending: 0.5,
      physical: 0.8,
    },
    CB: {
      defending: 1.15,
      positioning: 1.1,
      interceptions: 1.05,
      physical: 1.0,
      strength: 0.95,
      pace: 0.8,
      dribbling: 0.5,
      shooting: 0.3,
      passing: 0.7,
      composure: 0.9,
    },
    LB: {
      pace: 1.1,
      crossing: 1.05,
      stamina: 1.0,
      defending: 0.95,
      interceptions: 0.9,
      dribbling: 0.8,
      passing: 0.85,
      shooting: 0.4,
      physical: 0.7,
    },
    RB: {
      pace: 1.1,
      crossing: 1.05,
      stamina: 1.0,
      defending: 0.95,
      interceptions: 0.9,
      dribbling: 0.8,
      passing: 0.85,
      shooting: 0.4,
      physical: 0.7,
    },
    LWB: {
      pace: 1.1,
      crossing: 0.95,
      stamina: 1.05,
      defending: 0.9,
      workRate: 1.0,
      dribbling: 0.8,
      passing: 0.75,
      shooting: 0.4,
      physical: 0.7,
    },
    RWB: {
      pace: 1.1,
      crossing: 0.95,
      stamina: 1.05,
      defending: 0.9,
      workRate: 1.0,
      dribbling: 0.8,
      passing: 0.75,
      shooting: 0.4,
      physical: 0.7,
    },
    CDM: {
      interceptions: 1.1,
      workRate: 1.05,
      stamina: 1.0,
      defending: 0.95,
      passing: 0.9,
      vision: 0.85,
      physical: 0.8,
      dribbling: 0.6,
      shooting: 0.4,
    },
    CM: {
      vision: 1.1,
      passing: 1.05,
      dribbling: 1.0,
      workRate: 0.95,
      stamina: 0.9,
      shooting: 0.8,
      physical: 0.7,
      defending: 0.6,
      composure: 0.85,
    },
    CAM: {
      pace: 0.7,
      shooting: 0.95,
      passing: 1.0,
      dribbling: 1.05,
      defending: 0.4,
      composure: 0.9,
      vision: 1.15,
      flair: 1.1,
      positioning: 0.9,
    },
    LM: {
      pace: 1.0,
      shooting: 0.9,
      passing: 0.95,
      dribbling: 1.1,
      defending: 0.5,
      composure: 0.8,
      vision: 0.85,
      flair: 0.85,
      crossing: 1.05,
    },
    RM: {
      pace: 1.0,
      shooting: 0.9,
      passing: 0.95,
      dribbling: 1.1,
      defending: 0.5,
      composure: 0.8,
      vision: 0.85,
      flair: 0.85,
      crossing: 1.05,
    },
    LW: {
      pace: 1.05,
      shooting: 1.0,
      passing: 0.8,
      dribbling: 1.15,
      defending: 0.3,
      composure: 1.1,
      vision: 0.8,
      flair: 1.1,
      crossing: 0.95,
    },
    RW: {
      pace: 1.05,
      shooting: 1.0,
      passing: 0.8,
      dribbling: 1.15,
      defending: 0.3,
      composure: 1.1,
      vision: 0.8,
      flair: 1.1,
      crossing: 0.95,
    },
    CF: {
      pace: 0.9,
      shooting: 1.1,
      passing: 0.8,
      dribbling: 1.0,
      defending: 0.3,
      composure: 0.95,
      vision: 0.8,
      flair: 0.8,
      positioning: 1.05,
    },
    ST: {
      pace: 1.0,
      shooting: 1.15,
      passing: 0.7,
      dribbling: 0.8,
      defending: 0.3,
      composure: 1.05,
      vision: 0.7,
      flair: 0.8,
      positioning: 1.1,
      physical: 0.95,
    },
  };

  const weights = positionWeights[position] || {};

  // Para cada stat, aplica crescimento probabilístico
  Object.keys(stats).forEach((key) => {
    const statKey = key as keyof PlayerStats;
    // Exclude static attributes that shouldn't change
    if (
      statKey === "overall" ||
      statKey === "weakFoot" ||
      statKey === "preferredFoot" ||
      statKey === "leftFootFinishing" ||
      statKey === "rightFootFinishing"
    )
      return;

    const currentValue = stats[statKey];
    if (typeof currentValue !== "number") return;

    // Peso da posição com incerteza
    const posWeight = weights[statKey] || 0.5;
    const actualWeight = uncertaintyLayer(posWeight, 0.15);

    // Crescimento específico da stat
    let statGrowth = baseGrowthPoints * actualWeight;

    // ==================== V4: ENHANCED PHYSICAL ATTRIBUTE DECLINE ====================
    // Physical attributes decline faster with age - biological realism
    // Pace, stamina, strength, agility, jumping are most affected
    const physicalStats: (keyof PlayerStats)[] = ['pace', 'stamina', 'physical', 'strength', 'agility', 'jumping', 'acceleration'];
    const isPhysicalStat = physicalStats.includes(statKey);
    
    if (isPhysicalStat && age >= peakAgeEnd && baseGrowthPoints < 0) {
      const yearsAfterPeak = age - peakAgeEnd;
      
      // V4: Physical stats use exponential decline multiplier
      // Year 1: 1.4x, Year 2: 1.6x, Year 3: 1.85x, Year 5: 2.5x, Year 8: 4x
      const physicalDeclineMultiplier = 1.4 * Math.pow(1.15, yearsAfterPeak);
      statGrowth *= Math.min(physicalDeclineMultiplier, 5.0); // Cap at 5x
      
      // V4: Age-specific additional penalties for physical stats
      // These represent the biological reality of aging athletes
      if (age >= 38) {
        statGrowth *= 1.5; // 50% additional penalty at 38+
      } else if (age >= 36) {
        statGrowth *= 1.25; // 25% additional penalty at 36+
      }
      
      // Pace and acceleration are most affected by aging
      if (statKey === 'pace' || statKey === 'acceleration') {
        statGrowth *= 1.15; // Extra 15% decline for speed attributes
      }
    }
    
    // V4: Mental/Technical stats can IMPROVE until ~34, then stabilize/slow decline
    // This reflects experience compensating for physical decline
    const mentalStats: (keyof PlayerStats)[] = ['composure', 'positioning', 'vision', 'leadership', 'workRate'];
    const isMentalStat = mentalStats.includes(statKey);
    
    if (isMentalStat && age >= peakAgeEnd) {
      if (age <= 34 && baseGrowthPoints < 0) {
        // Ages 28-34: Mental stats can still improve slightly (experience gain)
        // Convert negative growth to small positive for mental stats
        if (Math.random() < 0.3) { // 30% chance of improvement
          statGrowth = Math.abs(statGrowth) * gaussianRandom(0.3, 0.1);
        } else {
          statGrowth *= 0.3; // 70% reduced decline
        }
      } else if (baseGrowthPoints < 0) {
        // Ages 35+: Mental stats decline 40-60% slower than physical
        const experienceBonus = Math.max(0.40, 0.60 - (age - 34) * 0.03);
        statGrowth *= experienceBonus;
      }
    }
    
    // V4: Technical stats (dribbling, shooting, passing) decline moderately
    const technicalStats: (keyof PlayerStats)[] = ['dribbling', 'shooting', 'passing', 'crossing', 'flair'];
    const isTechnicalStat = technicalStats.includes(statKey);
    
    if (isTechnicalStat && age >= peakAgeEnd && baseGrowthPoints < 0) {
      // Technical stats decline at 70-85% of physical rate (skill retention)
      const technicalRetention = Math.max(0.70, 0.85 - (age - peakAgeEnd) * 0.02);
      statGrowth *= technicalRetention;
    }

    // ==================== LOGARITHMIC DIMINISHING RETURNS ====================
    // Professional/Academic model: growth resistance increases as you approach potential
    // This creates a soft cap, not a hard wall. Legends can emerge, but it's very rare.
    const gapToPotential = player.potential - currentValue;
    let growthResistance = 1.0;

    if (gapToPotential <= 0) {
      // Beyond potential: 5% efficiency (legendary growth, almost impossible)
      growthResistance = 0.05;
    } else if (gapToPotential <= 2) {
      // 1-2 points from potential: 12% efficiency
      growthResistance = 0.12;
    } else if (gapToPotential <= 5) {
      // 3-5 points from potential: 30% efficiency
      growthResistance = 0.30;
    } else if (gapToPotential <= 10) {
      // 6-10 points from potential: 60% efficiency
      growthResistance = 0.60;
    } else if (currentValue > 85) {
      // High absolute value but far from potential: 70% efficiency
      growthResistance = 0.70;
    }
    // else: full efficiency (100%)

    statGrowth *= growthResistance;

    // Efeito chão (mais fácil melhorar stats baixas no crescimento)
    if (currentValue < 60 && age < 23) {
      statGrowth *= gaussianRandom(1.2, 0.15);
    }

    // Variação individual da stat (elipse bivariada)
    const [growth1, growth2] = bivariateSample(
      statGrowth,
      statGrowth * 0.3,
      Math.abs(statGrowth) * 0.4,
      Math.abs(statGrowth) * 0.3,
      0.6,
    );

    statGrowth = growth1 + growth2 * 0.3;

    // Arredondamento probabilístico
    let roundedGrowth: number;
    if (statGrowth > 0) {
      const fractional = statGrowth - Math.floor(statGrowth);
      roundedGrowth =
        Math.floor(statGrowth) + (Math.random() < fractional ? 1 : 0);
    } else {
      const fractional = Math.ceil(statGrowth) - statGrowth;
      roundedGrowth =
        Math.ceil(statGrowth) - (Math.random() < fractional ? 1 : 0);
    }

    if (roundedGrowth !== 0) {
      // Stats capped at potential + 2 (allows slight exceeding for legends, but not absurd values)
      const statCap = Math.min(player.potential + 2, 99);
      const newValue = clamp(currentValue + roundedGrowth, 10, statCap);
      if (newValue !== currentValue) {
        statChanges[statKey] = newValue;

        if (Math.abs(roundedGrowth) >= 3) {
          const emoji = roundedGrowth > 0 ? "📈" : "📉";
          events.push(
            `${statKey}: ${roundedGrowth > 0 ? "+" : ""}${roundedGrowth}`,
          );
        }
      }
    }
  });

  // ===== v0.5.2: EVOLUI ATRIBUTOS EXPANDIDOS =====
  if (player.expandedData) {
    evolveExpandedAttributes(player, {
      rating: performanceRating,
      matchesPlayed: matchesPlayed,
      goals: 0, // Ser� preenchido externamente
      assists: 0,
      developmentEvents: events,
    });
  }

  return { statChanges, events };
};

// ==================== REPUTAÃ‡ÃƒO ====================

export const updatePlayerReputation = (
  player: Player,
  performanceRating: number,
  seasonEvents: CareerEvent[],
): number => {
  let repChange = 0;

  // Performance base com distribuição normal
  if (performanceRating > 0.9) {
    repChange += Math.floor(Math.abs(gaussianRandom(1.2, 0.5)));
  }
  if (performanceRating > 1.2) {
    repChange += Math.floor(Math.abs(gaussianRandom(2.0, 0.8)));
  }
  if (performanceRating < 0.3 && player.stats.overall > 70) {
    repChange -= Math.floor(Math.abs(gaussianRandom(1.0, 0.4)));
  }

  // Convergência ao clube
  const clubRepGap = player.team.reputation - player.reputation;
  repChange += gaussianRandom(clubRepGap / 25, Math.abs(clubRepGap) / 40);

  // Eventos
  seasonEvents.forEach((event) => {
    switch (event.type) {
      case "ballon_dor_win":
        repChange += Math.floor(Math.abs(gaussianRandom(12, 2)));
        break;
      case "golden_boy_win":
        repChange += Math.floor(Math.abs(gaussianRandom(6, 1.5)));
        break;
      case "team_of_the_year_win":
        repChange += Math.floor(Math.abs(gaussianRandom(2, 0.8)));
        break;
      case "trophy":
        if (event.description.includes("World Cup")) {
          repChange += Math.floor(Math.abs(gaussianRandom(10, 2)));
        } else if (event.description.includes("continental cup")) {
          repChange += Math.floor(Math.abs(gaussianRandom(6, 1.5)));
        } else if (event.description.includes("league title")) {
          repChange += Math.floor(Math.abs(gaussianRandom(3, 1)));
        } else if (event.description.includes("domestic cup")) {
          repChange += Math.floor(Math.abs(gaussianRandom(1, 0.5)));
        }
        break;
    }
  });

  // Declínio por idade
  if (player.age > 32) {
    repChange -= Math.floor(Math.abs(gaussianRandom(0.5, 0.3)));
  }
  if (player.age > 35) {
    repChange -= Math.floor(Math.abs(gaussianRandom(1.5, 0.6)));
  }

  // Arredonda e aplica
  repChange = Math.round(repChange);

  return clamp(player.reputation + repChange, 10, 100);
};