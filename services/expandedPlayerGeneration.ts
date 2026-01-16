/**
 * EXPANDED PLAYER GENERATION - v0.5.2
 *
 * Sistema de geração de atributos expandidos para jogadores.
 * Gera valores realistas baseados em posição, overall e características.
 */

import type { PositionDetail, Player, PlayerStats } from "../types";
import type {
  PhysicalProfile,
  PositionProficiency,
  PlayingStyle,
  PlayingStyleCategory,
  TacticalTendency,
  RiskTendency,
  TechnicalAttributes,
  PhysicalAttributes,
  MentalAttributes,
  DefensiveAttributes,
  GoalkeeperAttributes,
  ExpandedPlayerData,
  BodyType,
  RunningStyle,
  PreferredFoot,
  // Stats
  AttackingStatsUltra,
  CreationStatsUltra,
  DuelStatsUltra,
  DefensiveStatsUltra,
  DisciplineStatsUltra,
  MatchPhysicalStats,
  CareerFinanceStats,
  FlairPlaysStats,
} from "../types/expandedPlayerTypes";
import { rand, randFloat, clamp, gaussianRandom } from "./utils";

// ============================================================================
// CONSTANTES DE GERAÇÃO
// ============================================================================

const POSITION_HEIGHT_RANGES: Record<
  PositionDetail,
  { min: number; max: number; avg: number }
> = {
  GK: { min: 182, max: 202, avg: 190 },
  CB: { min: 178, max: 198, avg: 186 },
  LB: { min: 168, max: 185, avg: 176 },
  RB: { min: 168, max: 185, avg: 176 },
  LWB: { min: 170, max: 186, avg: 178 },
  RWB: { min: 170, max: 186, avg: 178 },
  CDM: { min: 174, max: 192, avg: 182 },
  CM: { min: 170, max: 188, avg: 178 },
  LM: { min: 168, max: 184, avg: 175 },
  RM: { min: 168, max: 184, avg: 175 },
  CAM: { min: 168, max: 186, avg: 176 },
  LW: { min: 165, max: 182, avg: 174 },
  RW: { min: 165, max: 182, avg: 174 },
  CF: { min: 170, max: 190, avg: 180 },
  ST: { min: 170, max: 195, avg: 182 },
};

const POSITION_WEIGHT_FACTOR: Record<
  PositionDetail,
  { min: number; max: number }
> = {
  GK: { min: 78, max: 95 },
  CB: { min: 75, max: 92 },
  LB: { min: 65, max: 78 },
  RB: { min: 65, max: 78 },
  LWB: { min: 68, max: 80 },
  RWB: { min: 68, max: 80 },
  CDM: { min: 72, max: 88 },
  CM: { min: 68, max: 82 },
  LM: { min: 65, max: 78 },
  RM: { min: 65, max: 78 },
  CAM: { min: 65, max: 80 },
  LW: { min: 62, max: 76 },
  RW: { min: 62, max: 76 },
  CF: { min: 68, max: 85 },
  ST: { min: 70, max: 90 },
};

const POSITION_PLAYING_STYLES: Record<PositionDetail, PlayingStyleCategory[]> =
  {
    ST: [
      "Poacher",
      "Target Man",
      "Complete Forward",
      "Advanced Forward",
      "Deep-Lying Forward",
    ],
    CF: [
      "False 9",
      "Trequartista",
      "Complete Forward",
      "Deep-Lying Forward",
      "Advanced Forward",
    ],
    LW: [
      "Inverted Winger",
      "Traditional Winger",
      "Wide Playmaker",
      "Inside Forward",
      "Raumdeuter",
    ],
    RW: [
      "Inverted Winger",
      "Traditional Winger",
      "Wide Playmaker",
      "Inside Forward",
      "Raumdeuter",
    ],
    CAM: [
      "Advanced Playmaker",
      "Trequartista",
      "Mezzala",
      "Deep-Lying Forward",
      "False 9",
    ],
    CM: [
      "Box-to-Box",
      "Deep-Lying Playmaker",
      "Mezzala",
      "Carrilero",
      "Ball-Winning Midfielder",
    ],
    LM: [
      "Wide Playmaker",
      "Traditional Winger",
      "Mezzala",
      "Carrilero",
      "Box-to-Box",
    ],
    RM: [
      "Wide Playmaker",
      "Traditional Winger",
      "Mezzala",
      "Carrilero",
      "Box-to-Box",
    ],
    CDM: [
      "Ball-Winning Midfielder",
      "Regista",
      "Deep-Lying Playmaker",
      "Carrilero",
      "Box-to-Box",
    ],
    LWB: [
      "Complete Wing-Back",
      "Inverted Wing-Back",
      "Traditional Winger",
      "Wide Playmaker",
      "Defensive Full-Back",
    ],
    RWB: [
      "Complete Wing-Back",
      "Inverted Wing-Back",
      "Traditional Winger",
      "Wide Playmaker",
      "Defensive Full-Back",
    ],
    LB: [
      "Defensive Full-Back",
      "Complete Wing-Back",
      "Inverted Wing-Back",
      "Ball-Playing Defender",
      "No-Nonsense Defender",
    ],
    RB: [
      "Defensive Full-Back",
      "Complete Wing-Back",
      "Inverted Wing-Back",
      "Ball-Playing Defender",
      "No-Nonsense Defender",
    ],
    CB: [
      "Ball-Playing Defender",
      "Stopper",
      "Sweeper",
      "No-Nonsense Defender",
      "Stopper",
    ],
    GK: [
      "Sweeper Keeper",
      "Traditional Keeper",
      "Ball-Playing Keeper",
      "Traditional Keeper",
      "Traditional Keeper",
    ],
  };

const POSITION_TACTICAL_TENDENCIES: Record<
  PositionDetail,
  TacticalTendency[][]
> = {
  ST: [
    ["Attacks Depth"],
    ["Drops Deep", "Floats Between Lines"],
    ["Stays Central"],
  ],
  CF: [
    ["Drops Deep", "Floats Between Lines"],
    ["Roams From Position"],
    ["Stays Central"],
  ],
  LW: [["Hugs Touchline"], ["Cuts Inside"], ["Attacks Depth"]],
  RW: [["Hugs Touchline"], ["Cuts Inside"], ["Attacks Depth"]],
  CAM: [["Floats Between Lines"], ["Roams From Position"], ["Drops Deep"]],
  CM: [["Stays Central"], ["Makes Overlapping Runs"], ["Drops Deep"]],
  LM: [["Hugs Touchline"], ["Cuts Inside"], ["Makes Overlapping Runs"]],
  RM: [["Hugs Touchline"], ["Cuts Inside"], ["Makes Overlapping Runs"]],
  CDM: [["Stays Central"], ["Drops Deep"]],
  LWB: [["Makes Overlapping Runs"], ["Hugs Touchline"], ["Attacks Depth"]],
  RWB: [["Makes Overlapping Runs"], ["Hugs Touchline"], ["Attacks Depth"]],
  LB: [["Makes Overlapping Runs"], ["Stays Central"]],
  RB: [["Makes Overlapping Runs"], ["Stays Central"]],
  CB: [["Stays Central"]],
  GK: [],
};

// ============================================================================
// FUNÇÕES DE GERAÇÃO
// ============================================================================

/**
 * Gera o perfil físico do jogador
 */
export function generatePhysicalProfile(
  position: PositionDetail,
  overall: number,
  preferredFoot?: PreferredFoot,
): PhysicalProfile {
  const heightRange = POSITION_HEIGHT_RANGES[position];
  const weightRange = POSITION_WEIGHT_FACTOR[position];

  // Altura com distribuição gaussiana centrada na média
  const height = Math.round(
    clamp(
      heightRange.avg + gaussianRandom(0, 5),
      heightRange.min,
      heightRange.max,
    ),
  );

  // Peso baseado na altura com variação
  const idealBMI = 22.5 + randFloat(-1.5, 2.5);
  const baseWeight = idealBMI * (height / 100) ** 2;
  const weight = Math.round(
    clamp(baseWeight + randFloat(-5, 5), weightRange.min, weightRange.max),
  );

  const bmi = Number((weight / (height / 100) ** 2).toFixed(1));

  // Body type baseado em BMI e posição
  const bodyType = determineBodyType(bmi, position, height);

  // Pé preferido
  const foot = preferredFoot || determinePreferredFoot(position);

  // Weak foot level baseado no overall
  const weakFootBase = position === "GK" ? 1 : rand(1, 3);
  const weakFootBonus =
    overall >= 85 ? rand(0, 2) : overall >= 75 ? rand(0, 1) : 0;
  const weakFootLevel = clamp(weakFootBase + weakFootBonus, 0, 5);

  // Running style
  const runningStyle = determineRunningStyle(position, overall);

  // Secondary positions
  const secondaryPositions = generateSecondaryPositions(position, overall);

  return {
    height,
    weight,
    bmi,
    bodyType,
    preferredFoot: foot,
    weakFootLevel,
    runningStyle,
    primaryPosition: position,
    secondaryPositions,
  };
}

function determineBodyType(
  bmi: number,
  position: PositionDetail,
  height: number,
): BodyType {
  if (bmi < 21) return "Lean";
  if (bmi > 25) return height > 188 ? "Tall" : "Stocky";
  if (bmi > 23.5)
    return ["CB", "ST", "CDM"].includes(position) ? "Muscular" : "Average";
  return "Average";
}

function determinePreferredFoot(position: PositionDetail): PreferredFoot {
  // Maioria é destro
  const roll = Math.random();
  if (["LB", "LWB", "LW", "LM"].includes(position)) {
    // Posições esquerdas têm mais canhotos
    return roll < 0.45 ? "Left" : roll < 0.05 ? "Both" : "Right";
  }
  return roll < 0.25 ? "Left" : roll < 0.03 ? "Both" : "Right";
}

function determineRunningStyle(
  position: PositionDetail,
  overall: number,
): RunningStyle {
  const attackingPositions = ["ST", "CF", "LW", "RW", "CAM"];
  const midfielders = ["CM", "CDM", "LM", "RM"];

  if (attackingPositions.includes(position)) {
    return Math.random() < 0.6 ? "Explosive" : "Steady";
  }
  if (midfielders.includes(position)) {
    const roll = Math.random();
    return roll < 0.3 ? "Explosive" : roll < 0.7 ? "Steady" : "Endurance";
  }
  return Math.random() < 0.4 ? "Steady" : "Endurance";
}

function generateSecondaryPositions(
  position: PositionDetail,
  overall: number,
): PositionProficiency[] {
  const relatedPositions: Record<PositionDetail, PositionDetail[]> = {
    ST: ["CF", "LW", "RW"],
    CF: ["ST", "CAM", "LW", "RW"],
    LW: ["LM", "ST", "CF", "RW"],
    RW: ["RM", "ST", "CF", "LW"],
    CAM: ["CM", "CF", "LM", "RM"],
    CM: ["CAM", "CDM", "LM", "RM"],
    LM: ["LW", "CM", "LWB", "CAM"],
    RM: ["RW", "CM", "RWB", "CAM"],
    CDM: ["CM", "CB"],
    LWB: ["LB", "LM", "LW"],
    RWB: ["RB", "RM", "RW"],
    LB: ["LWB", "CB", "LM"],
    RB: ["RWB", "CB", "RM"],
    CB: ["CDM", "LB", "RB"],
    GK: [],
  };

  const related = relatedPositions[position] || [];
  const numSecondary = rand(0, Math.min(related.length, 3));

  const secondary: PositionProficiency[] = [];
  const used = new Set<PositionDetail>();

  for (let i = 0; i < numSecondary; i++) {
    const available = related.filter((p) => !used.has(p));
    if (available.length === 0) break;

    const pos = available[rand(0, available.length - 1)];
    used.add(pos);

    // Proficiência diminui com a distância da posição primária
    const baseProficiency = overall - rand(10, 25);
    secondary.push({
      position: pos,
      proficiency: clamp(baseProficiency, 40, overall - 5),
      isNatural: i === 0 && Math.random() < 0.5,
    });
  }

  return secondary;
}

/**
 * Gera o estilo de jogo do jogador
 */
export function generatePlayingStyle(
  position: PositionDetail,
  overall: number,
  stats: PlayerStats,
): PlayingStyle {
  const availableStyles = POSITION_PLAYING_STYLES[position] || [];
  const primaryStyle =
    availableStyles[rand(0, availableStyles.length - 1)] || "Box-to-Box";

  // Secondary style (30% chance)
  let secondaryStyle: PlayingStyleCategory | undefined;
  if (Math.random() < 0.3 && availableStyles.length > 1) {
    const filtered = availableStyles.filter((s) => s !== primaryStyle);
    secondaryStyle = filtered[rand(0, filtered.length - 1)];
  }

  // Tendências táticas baseadas na posição
  const tendencyOptions = POSITION_TACTICAL_TENDENCIES[position] || [];
  const tacticalTendencies: TacticalTendency[] = [];

  tendencyOptions.forEach((options) => {
    if (options.length > 0 && Math.random() < 0.6) {
      tacticalTendencies.push(options[rand(0, options.length - 1)]);
    }
  });

  // Risk tendency baseada em flair e composure
  const riskScore = (stats.flair || 50) - (stats.composure || 50);
  let riskTendency: RiskTendency = "Balanced";
  if (riskScore > 15) riskTendency = "Risky";
  else if (riskScore < -15) riskTendency = "Conservative";

  // Media star level baseado em overall e flair
  const mediaStarLevel = clamp(
    Math.round(overall * 0.6 + (stats.flair || 50) * 0.2 + rand(-10, 20)),
    0,
    100,
  );

  return {
    primaryStyle,
    secondaryStyle,
    tacticalTendencies,
    riskTendency,
    mediaStarLevel,
  };
}

/**
 * Gera atributos técnicos detalhados baseados nos stats existentes
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function generateTechnicalAttributes(
  position: PositionDetail,
  overall: number,
  stats: PlayerStats,
): TechnicalAttributes {
  // CORREÇÃO v0.5.2: "Finalização" na UI = shooting
  // finishing derivado deve estar próximo de shooting
  // Se finishing for muito menor que shooting (dados antigos corrompidos), usar shooting
  const shooting = safeNum(stats.shooting, 50);
  const rawFinishing = safeNum(stats.finishing, 0);
  // Se finishing for > 0 mas muito menor que shooting, usar shooting
  const finishing =
    rawFinishing > 0 && rawFinishing < shooting - 20
      ? shooting
      : rawFinishing || shooting;

  const passing = safeNum(stats.passing, 50);
  const dribbling = safeNum(stats.dribbling, 50);
  const curve = safeNum(stats.curve, 50);
  const flair = safeNum(stats.flair, 50);
  const ballControl = safeNum(stats.ballControl, dribbling);
  const heading = safeNum(stats.heading, 50);
  const physical = safeNum(stats.physical, 50);
  const shotPower = safeNum(stats.shotPower, Math.round((physical + shooting) / 2));
  const crossing = safeNum(stats.crossing, 50);
  const longShots = safeNum(stats.longShots, 50);
  const vision = safeNum(stats.vision, 50);
  const pace = safeNum(stats.pace, 50);
  const composure = safeNum(stats.composure, 50);
  const agility = safeNum(stats.agility, 50);
  const strength = safeNum(stats.strength, 50);

  return {
    finishing: {
      finishingInsideBox: vary(finishing, 5),
      finishingOutsideBox: vary(longShots, 5),
      finishingOnCounter: vary((finishing + pace) / 2, 8),
      finishingUnderPressure: vary((finishing + composure) / 2, 8),
      shotPower: vary(shotPower, 5),
      placedShotAccuracy: vary((finishing + curve) / 2, 6),
      powerShotAccuracy: vary((shotPower + finishing) / 2, 6),
      headingAccuracy: vary(heading, 5),
      headingPower: vary((heading + strength) / 2, 8),
      volleysAndAcrobatic: vary((finishing + agility + flair) / 3, 10),
      oneOnOneFinishing: vary((finishing + composure) / 2, 8),
    },
    ballControl: {
      firstTouchOrientated: vary(ballControl, 5),
      firstTouchUnderPressure: vary((ballControl + composure) / 2, 8),
      aerialControl: vary((ballControl + heading) / 2, 8),
      trapping: vary(ballControl, 6),
      shielding: vary((strength + ballControl) / 2, 8),
    },
    dribbling: {
      closeControlDribbling: vary(dribbling, 5),
      speedDribbling: vary((dribbling + pace) / 2, 8),
      congestedSpaceDribbling: vary((dribbling + agility) / 2, 8),
      directionChange: vary((agility + dribbling) / 2, 8),
      skillMoves: vary(flair, 8),
      flair: vary(flair, 5),
    },
    passing: {
      shortPassingSupport: vary(passing, 5),
      shortPassingUnderPressure: vary((passing + composure) / 2, 8),
      verticalPassBreakingLines: vary((passing + vision) / 2, 8),
      longDiagonalPass: vary((passing + longShots) / 2, 10),
      throughBalls: vary((passing + vision) / 2, 8),
      crossingFromByline: vary(crossing, 5),
      crossingFromDeep: vary((crossing + passing) / 2, 8),
      firstTimeCrossing: vary((crossing + composure) / 2, 10),
      curveEffect: vary(curve, 5),
    },
    setPieces: {
      directFreeKickPower: vary(shotPower, 8),
      directFreeKickPlacement: vary((curve + finishing) / 2, 8),
      indirectFreeKick: vary((crossing + curve) / 2, 8),
      cornerKicking: vary((crossing + curve) / 2, 8),
      penaltyTaking: vary((finishing + composure) / 2, 8),
      throwIns: vary(strength, 15),
    },
  };
}

/**
 * Gera atributos físicos detalhados
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function generatePhysicalAttributes(
  position: PositionDetail,
  overall: number,
  stats: PlayerStats,
  profile: PhysicalProfile,
): PhysicalAttributes {
  const pace = safeNum(stats.pace, 50);
  const physical = safeNum(stats.physical, 50);
  const stamina = safeNum(stats.stamina, 50);
  const strength = safeNum(stats.strength, 50);
  const agility = safeNum(stats.agility, 50);
  const jumping = safeNum(stats.jumping, 50);
  const acceleration = safeNum(stats.acceleration, pace);
  const sprintSpeed = safeNum(stats.sprintSpeed, pace);
  const balance = safeNum(stats.balance, 50);
  const composure = safeNum(stats.composure, 50);
  const heading = safeNum(stats.heading, 50);
  const fitness = safeNum(stats.fitness, 50);
  const workRate = safeNum(stats.workRate, 50);

  return {
    speed: {
      topSpeed: vary(sprintSpeed, 5),
      accelerationInitial: vary(acceleration, 5),
      accelerationMedium: vary((acceleration + sprintSpeed) / 2, 6),
      sprintSpeed: vary(sprintSpeed, 5),
    },
    endurance: {
      aerobicEndurance: vary(stamina, 5),
      anaerobicEndurance: vary((stamina + physical) / 2, 8),
      stamina: vary(stamina, 5),
      workRate: vary(workRate, 8),
    },
    strength: {
      upperBodyStrength: vary(strength, 8),
      legStrength: vary((strength + jumping) / 2, 8),
      bodyToBodyStrength: vary(strength, 5),
      balanceInContact: vary((balance + strength) / 2, 8),
    },
    agility: {
      lateralAgility: vary(agility, 5),
      reactionTime: vary((agility + composure) / 2, 8),
      flexibility: vary(agility, 10),
      coordination: vary((agility + balance) / 2, 8),
    },
    jumping: {
      standingVerticalJump: vary(jumping, 8),
      runningVerticalJump: vary((jumping + pace) / 2, 8),
      headerTiming: vary((jumping + heading) / 2, 8),
    },
    robustness: {
      physicalRobustness: vary(physical, 8),
      injuryResistance: vary(fitness, 10),
      recoveryRate: vary((fitness + stamina) / 2, 10),
      naturalFitness: vary(fitness, 8),
    },
  };
}

/**
 * Gera atributos mentais
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function generateMentalAttributes(
  position: PositionDetail,
  overall: number,
  stats: PlayerStats,
): MentalAttributes {
  const composure = safeNum(stats.composure, 50);
  const vision = safeNum(stats.vision, 50);
  const flair = safeNum(stats.flair, 50);
  const leadership = safeNum(stats.leadership, 50);
  const positioning = safeNum(stats.positioning, 50);
  const workRate = safeNum(stats.workRate, 50);
  const aggression = safeNum(stats.aggression, 50);

  return {
    gameIntelligence: {
      decisions: vary((vision + composure) / 2, 8),
      vision: vary(vision, 5),
      creativity: vary(flair, 8),
      anticipation: vary((vision + positioning) / 2, 8),
      positioning: vary(positioning, 5),
      offTheBallMovement: vary((positioning + workRate) / 2, 8),
      spatialAwareness: vary((vision + positioning) / 2, 8),
    },
    personality: {
      composure: vary(composure, 5),
      composureInFinishing: vary(composure, 8),
      bravery: vary((aggression + composure) / 2, 10),
      determination: vary(workRate, 10),
      teamwork: vary(workRate, 8),
      leadershipOnPitch: vary(leadership, 8),
      charismaOffPitch: vary((leadership + flair) / 2, 15),
      professionalism: vary(workRate, 12),
      temperament: vary(100 - aggression, 15), // Invertido
    },
    performance: {
      consistency: vary(composure, 10),
      bigMatchPerformance: vary((composure + leadership) / 2, 12),
      adaptability: vary((vision + composure) / 2, 15),
      pressureHandling: vary(composure, 8),
      clutchFactor: vary((composure + leadership) / 2, 12),
    },
  };
}

/**
 * Gera atributos defensivos
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function generateDefensiveAttributes(
  position: PositionDetail,
  overall: number,
  stats: PlayerStats,
): DefensiveAttributes {
  const defending = safeNum(stats.defending, 50);
  const interceptions = safeNum(stats.interceptions, defending);
  const positioning = safeNum(stats.positioning, 50);
  const workRate = safeNum(stats.workRate, 50);
  const aggression = safeNum(stats.aggression, 50);
  const pace = safeNum(stats.pace, 50);

  // Defensores têm atributos mais altos
  const defBonus = ["CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(position)
    ? 10
    : 0;

  return {
    marking: {
      individualMarking: vary(defending + defBonus, 8),
      zonalMarking: vary((defending + positioning) / 2 + defBonus, 8),
      trackingRuns: vary((workRate + pace) / 2, 10),
      closeDownSpeed: vary((pace + aggression) / 2, 10),
    },
    pressing: {
      pressingTrigger: vary((workRate + aggression) / 2, 10),
      sustainedPressing: vary(workRate, 8),
      pressIntensity: vary(aggression, 8),
      counterPressing: vary((workRate + defending) / 2, 10),
    },
    tackling: {
      standingTackle: vary(defending + defBonus, 5),
      slidingTackle: vary((defending + aggression) / 2 + defBonus, 8),
      tackleTiming: vary((defending + positioning) / 2, 8),
      cleanTackling: vary((defending + 100 - aggression) / 2, 10),
    },
    interception: {
      shortPassInterception: vary(interceptions + defBonus, 5),
      longPassInterception: vary(
        (interceptions + positioning) / 2 + defBonus,
        8,
      ),
      shotBlocking: vary(defending + defBonus, 10),
      crossBlocking: vary((defending + positioning) / 2 + defBonus, 10),
      readingOfPlay: vary((interceptions + positioning) / 2, 8),
    },
    defensivePositioning: {
      covering: vary(positioning + defBonus, 8),
      jockeying: vary((defending + positioning) / 2 + defBonus, 8),
      positionRecovery: vary((pace + positioning) / 2, 10),
      backtracking: vary((workRate + pace) / 2, 10),
      defensiveAwareness: vary((defending + positioning) / 2 + defBonus, 8),
    },
  };
}

/**
 * Gera atributos de goleiro
 * Usa safeNum para garantir que nenhum valor NaN seja produzido
 */
export function generateGoalkeeperAttributes(
  overall: number,
  stats: PlayerStats,
): GoalkeeperAttributes {
  const reflexes = safeNum(stats.reflexes, 50);
  const diving = safeNum(stats.diving, 50);
  const handling = safeNum(stats.handling, 50);
  const positioning = safeNum(stats.positioning, 50);
  const composure = safeNum(stats.composure, 50);
  const passing = safeNum(stats.passing, 40);
  const strength = safeNum(stats.strength, 50);
  const shotPower = safeNum(stats.shotPower, 50);
  const jumping = safeNum(stats.jumping, 50);
  const leadership = safeNum(stats.leadership, 50);

  return {
    shotStopping: {
      reflexes: vary(reflexes, 5),
      diving: vary(diving, 5),
      oneOnOneStopping: vary((reflexes + composure) / 2, 8),
      penaltySaving: vary((reflexes + composure) / 2, 12),
      longRangeShotStopping: vary((reflexes + positioning) / 2, 8),
      closeRangeShotStopping: vary(reflexes, 8),
    },
    positioning: {
      positioning: vary(positioning, 5),
      rushingOut: vary((positioning + composure) / 2, 10),
      narrowingAngles: vary(positioning, 8),
      linePositioning: vary((positioning + reflexes) / 2, 8),
    },
    distribution: {
      throwing: vary(strength, 10),
      kicking: vary(shotPower, 10),
      passingShort: vary(passing, 8),
      passingLong: vary((passing + shotPower) / 2, 10),
      goalKicks: vary((shotPower + passing) / 2, 10),
    },
    commanding: {
      commandOfArea: vary((handling + composure) / 2, 8),
      claimingCrosses: vary((handling + jumping) / 2, 8),
      punching: vary((strength + handling) / 2, 10),
      communication: vary(leadership, 12),
      aerialReach: vary((jumping + handling) / 2, 8),
    },
    mentalGK: {
      concentration: vary(composure, 8),
      composure: vary(composure, 5),
      decisionMaking: vary((composure + positioning) / 2, 8),
      handling: vary(handling, 5),
    },
  };
}

/**
 * Gera estatísticas iniciais zeradas
 */
export function generateEmptyStats(): {
  attackingStats: AttackingStatsUltra;
  creationStats: CreationStatsUltra;
  duelStats: DuelStatsUltra;
  defensiveStats: DefensiveStatsUltra;
  disciplineStats: DisciplineStatsUltra;
  matchPhysicalStats: MatchPhysicalStats;
  flairPlaysStats: FlairPlaysStats;
} {
  return {
    attackingStats: {
      xG: 0,
      xGPer90: 0,
      xGHead: 0,
      xGStrongFoot: 0,
      xGWeakFoot: 0,
      postShotXG: 0,
      xGOnTargetPerShot: 0,
      shotsTotal: 0,
      shotsOnTarget: 0,
      shotsBlocked: 0,
      shotsOnTargetPercentage: 0,
      shotConversionRate: 0,
      shotsAfterReceivingInBox: 0,
      shotsAfterDribble: 0,
      shotsOnCounter: 0,
      goals0to15: 0,
      goals15to30: 0,
      goals30to45: 0,
      goals45to60: 0,
      goals60to75: 0,
      goals75to90Plus: 0,
      goalsStrongFoot: 0,
      goalsWeakFoot: 0,
      goalsHeader: 0,
      goalsOther: 0,
      goalsInsideBox: 0,
      goalsOutsideBox: 0,
      goalsFirstTouch: 0,
      goalsAfterMultipleTouches: 0,
      goalsWhenDrawingOrLosing: 0,
      goalsOnCounter: 0,
      gameWinningGoals: 0,
      equalizerGoals: 0,
      averageShotSpeed: 0,
      maxShotSpeedSeason: 0,
      longestGoalDistance: 0,
      maxJumpHeightHeader: 0,
      golazosCount: 0,
      sittersWasted: 0,
      oneOnOneConverted: 0,
      oneOnOneMissed: 0,
    },
    creationStats: {
      assists: 0,
      assistsPer90: 0,
      xA: 0,
      xAPer90: 0,
      keyPassesPer90: 0,
      preAssists: 0,
      // v0.5.2: Assistências por período (baseado em pesquisa UFPE)
      assists0to15: 0,
      assists15to30: 0,
      assists30to45: 0,
      assists45to60: 0,
      assists60to75: 0,
      assists75to90Plus: 0,
      progressivePassesAttempted: 0,
      progressivePassesCompleted: 0,
      passesIntoBox: 0,
      passesToDZone: 0,
      passesBreakingMidfield: 0,
      passesBreakingDefensiveLine: 0,
      passesUnderPressure: 0,
      passesUnderPressureCompleted: 0,
      passesUnderPressurePercentage: 0,
      longPassesAttempted: 0,
      longPassesCompleted: 0,
      crossesAttempted: 0,
      crossesCompleted: 0,
      crossesLeadingToShot: 0,
      passesGeneratingHighXG: 0,
      counterAttackingPasses: 0,
      throughBallsCompleted: 0,
    },
    duelStats: {
      touchesTotal: 0,
      touchesInOppositionBox: 0,
      progressiveCarries: 0,
      metersCarriedForwardPer90: 0,
      carriesIntoBox: 0,
      carriesUnderPressure: 0,
      dribblesAttempted: 0,
      dribblesSuccessful: 0,
      dribblesPer90: 0,
      dribblesStaticOneVOne: 0,
      dribblesInTransition: 0,
      possessionLostTotal: 0,
      possessionLostDangerousZone: 0,
      badFirstTouches: 0,
      groundDuelsWon: 0,
      groundDuelsTotal: 0,
      aerialDuelsWon: 0,
      aerialDuelsTotal: 0,
      foulsDrawnTotal: 0,
      foulsDrawnDangerousZones: 0,
    },
    defensiveStats: {
      pressuresPer90: 0,
      pressuresDefensiveThird: 0,
      pressuresMidThird: 0,
      pressuresAttackingThird: 0,
      pressuresSuccessful: 0,
      possessionRecoveriesOffensive: 0,
      possessionRecoveries5Seconds: 0,
      tacklesPer90: 0,
      tacklesDefensiveThird: 0,
      tacklesMidThird: 0,
      tacklesAttackingThird: 0,
      interceptionsPer90: 0,
      shotBlocksPer90: 0,
      passBlocksPer90: 0,
      clearancesPer90: 0,
      errorsLeadingToShot: 0,
      errorsLeadingToGoal: 0,
    },
    disciplineStats: {
      foulsCommitted: 0,
      foulsPer90: 0,
      foulsOffensiveThird: 0,
      foulsMidThird: 0,
      foulsDefensiveThird: 0,
      tacticalFouls: 0,
      yellowCards: 0,
      secondYellows: 0,
      directRedCards: 0,
      minutesBetweenCards: 0,
      penaltiesConceded: 0,
      penaltiesWon: 0,
      complaintsIndex: 0,
    },
    matchPhysicalStats: {
      minutesPlayedSeason: 0,
      gamesCompletedPercentage: 0,
      distancePerGame: 0,
      highIntensityDistancePerGame: 0,
      sprintsPerGame: 0,
      topSprintSpeed: 0,
      consecutiveGamesWithoutRest: 0,
      accumulatedFatigue: 0,
      injuriesByType: { muscular: 0, impact: 0, chronic: 0 },
      daysLostToInjurySeason: 0,
      daysLostToInjuryCareer: 0,
      injuryProneness: 0,
    },
    // v0.5.2: Flair plays stats (all English)
    flairPlaysStats: {
      // Special passes
      trivelaPasses: 0,
      noLookPasses: 0,
      backheelPasses: 0,
      rabonaPasses: 0,
      flairedThroughBalls: 0,
      // Chip shots
      chipShotAttempts: 0,
      chipShotGoals: 0,
      // Trivela shots
      trivelaShotAttempts: 0,
      trivelaShotGoals: 0,
      // Finesse shots
      finesseShotAttempts: 0,
      finesseShotGoals: 0,
      // Power shots
      powerShotAttempts: 0,
      powerShotGoals: 0,
      // Rabona shots
      rabonaShotAttempts: 0,
      rabonaShotGoals: 0,
      // Volleys
      volleyAttempts: 0,
      volleyGoals: 0,
      // Bicycle kicks
      bicycleKickAttempts: 0,
      bicycleKickGoals: 0,
      // Scorpion kicks
      scorpionKickAttempts: 0,
      scorpionKickGoals: 0,
      // Dribbles
      elasticos: 0,
      stepOvers: 0,
      nutmegs: 0,
      rainbowFlicks: 0,
      sombrereos: 0,
      roulettes: 0,
      laCroquetas: 0,
      skillMoves: 0,
      keepyUppies: 0,
      flairTackles: 0,
      // Crosses
      trivelaCrosses: 0,
      rabonaCrosses: 0,
      backheelCrosses: 0,
      // Set pieces
      stutterStepPenalties: 0,
      panenkaPenalties: 0,
      knuckleballFreeKicks: 0,
      curlingFreeKicks: 0,
      // Bonus
      iconicCelebrations: 0,
      // Aggregated
      totalFlairPlays: 0,
      flairPlaysPerGame: 0,
      successfulFlairPlays: 0,
      flairPlaySuccessRate: 0,
    },
  };
}

/**
 * Gera estatísticas de carreira/finanças iniciais
 */
export function generateCareerFinanceStats(
  player: Player,
  overall: number,
): CareerFinanceStats {
  const weeklyWage = player.wage || 0;
  return {
    professionalDebutAge: player.hasMadeSeniorDebut
      ? player.age - rand(0, 5)
      : 0,
    youthNationalTeamCaps: rand(0, 30),
    youthNationalTeamGoals: rand(0, 15),
    nationalTeamTitles: [],
    teamOfTheWeekCount: 0,
    teamOfTheMonthCount: 0,
    teamOfTheYearCount: 0,
    localReputation: clamp(overall - rand(0, 20), 0, 100),
    continentalReputation: clamp(overall - rand(10, 30), 0, 100),
    worldReputation: clamp(overall - rand(20, 40), 0, 100),
    clubReputation: "Rotation",
    weeklyWage: weeklyWage,
    monthlyWage: weeklyWage * 4,
    annualWage: weeklyWage * 52,
    // v0.5.6 - Finanças pessoais (começa com algumas economias baseadas na idade)
    totalEarnings: 0,
    totalSpent: 0,
    currentSavings: weeklyWage * 52 * Math.max(0, player.age - 16) * 0.08, // ~8% do que ganhou historicamente (balanceado)
    goalBonus: Math.round((weeklyWage || 1000) * 0.1),
    assistBonus: Math.round((weeklyWage || 1000) * 0.05),
    trophyBonus: Math.round((weeklyWage || 1000) * 2),
    appearanceBonus: Math.round((weeklyWage || 1000) * 0.02),
    releaseClause: player.marketValue
      ? player.marketValue * rand(2, 4)
      : undefined,
    autoRenewalClause: Math.random() < 0.3,
    performanceIncreaseClause: Math.random() < 0.4,
    currentMarketValue: player.marketValue || 0,
    peakMarketValue: player.marketValue || 0,
    peakMarketValueAge: player.age,
  };
}

/**
 * Gera todos os dados expandidos para um jogador
 */
export function generateExpandedPlayerData(player: Player): ExpandedPlayerData {
  const physicalProfile = generatePhysicalProfile(
    player.position,
    player.stats.overall,
    player.stats.preferredFoot as PreferredFoot | undefined,
  );

  const playingStyle = generatePlayingStyle(
    player.position,
    player.stats.overall,
    player.stats,
  );

  const technicalAttributes = generateTechnicalAttributes(
    player.position,
    player.stats.overall,
    player.stats,
  );

  const physicalAttributes = generatePhysicalAttributes(
    player.position,
    player.stats.overall,
    player.stats,
    physicalProfile,
  );

  const mentalAttributes = generateMentalAttributes(
    player.position,
    player.stats.overall,
    player.stats,
  );

  const defensiveAttributes = generateDefensiveAttributes(
    player.position,
    player.stats.overall,
    player.stats,
  );

  const goalkeeperAttributes =
    player.position === "GK"
      ? generateGoalkeeperAttributes(player.stats.overall, player.stats)
      : undefined;

  const emptyStats = generateEmptyStats();

  const careerFinanceStats = generateCareerFinanceStats(
    player,
    player.stats.overall,
  );

  return {
    finances: null, // Legacy field, usando careerFinanceStats
    physicalProfile,
    playingStyle,
    technicalAttributes,
    physicalAttributes,
    mentalAttributes,
    defensiveAttributes,
    goalkeeperAttributes,
    ...emptyStats,
    careerFinanceStats,
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Garante que um valor numérico é válido, retornando fallback se for NaN/undefined
 */
function safeNum(value: number | undefined, fallback: number = 50): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

/**
 * Varia um valor base com uma margem - protegido contra NaN
 */
function vary(base: number, margin: number): number {
  const safeBase = safeNum(base, 50);
  return clamp(Math.round(safeBase + randFloat(-margin, margin)), 1, 99);
}
