/**
 * EXPANDED CAPABILITY ANALYZER - v0.5.2
 * 
 * Analisa capacidades do jogador usando os atributos ultra-detalhados.
 * Fallback para atributos padrão se expandedData não estiver disponível.
 */

import type { Player, PositionDetail } from '../../types';
import type { ExpandedPlayerData, TechnicalAttributes, PhysicalAttributes, MentalAttributes, DefensiveAttributes, GoalkeeperAttributes } from '../../types/expandedPlayerTypes';
import { clamp } from '../utils';

// ============================================================================
// TIPOS DE SAÍDA EXPANDIDOS
// ============================================================================

export interface ExpandedAttackingCapabilities {
  // Finishing detalhado
  finishingInsideBox: number;
  finishingOutsideBox: number;
  finishingOnCounter: number;
  finishingUnderPressure: number;
  oneOnOneFinishing: number;
  headingAccuracy: number;
  headingPower: number;
  volleyAbility: number;
  // Shooting
  shotPower: number;
  placedShotAccuracy: number;
  powerShotAccuracy: number;
  longShotAbility: number;
  // Composite scores
  overallFinishingScore: number;
  composureInBox: number;
  clinicalRating: number;
}

export interface ExpandedTechnicalCapabilities {
  // Ball control
  firstTouch: number;
  firstTouchUnderPressure: number;
  aerialControl: number;
  trapping: number;
  shielding: number;
  // Dribbling
  closeControl: number;
  speedDribbling: number;
  skillMoves: number;
  flair: number;
  // Passing
  shortPassReliability: number;
  longPassAccuracy: number;
  throughBalls: number;
  crossing: number;
  curveEffect: number;
  // Set pieces
  freeKickAccuracy: number;
  penaltyTaking: number;
  cornerKicking: number;
  // Composite
  overallTechnicalScore: number;
}

export interface ExpandedPhysicalCapabilities {
  // Speed
  topSpeed: number;
  acceleration: number;
  sprintSpeed: number;
  // Endurance
  stamina: number;
  workRate: number;
  // Strength
  bodyStrength: number;
  balanceInContact: number;
  // Agility
  agility: number;
  reactionTime: number;
  coordination: number;
  // Jumping
  jumpingPower: number;
  headerTiming: number;
  // Robustness
  injuryResistance: number;
  recoveryRate: number;
  // Composite
  overallPhysicalScore: number;
}

export interface ExpandedMentalCapabilities {
  // Game intelligence
  decisions: number;
  vision: number;
  creativity: number;
  anticipation: number;
  positioning: number;
  offTheBallMovement: number;
  // Personality
  composure: number;
  bravery: number;
  determination: number;
  teamwork: number;
  leadership: number;
  // Performance
  consistency: number;
  bigMatchPerformance: number;
  clutchFactor: number;
  pressureHandling: number;
  // Composite
  overallMentalScore: number;
}

export interface ExpandedDefensiveCapabilities {
  // Marking
  individualMarking: number;
  zonalMarking: number;
  trackingRuns: number;
  // Pressing
  pressingIntensity: number;
  sustainedPressing: number;
  counterPressing: number;
  // Tackling
  standingTackle: number;
  slidingTackle: number;
  cleanTackling: number;
  // Interception
  interceptionAbility: number;
  shotBlocking: number;
  readingOfPlay: number;
  // Positioning
  defensivePositioning: number;
  covering: number;
  backtracking: number;
  // Composite
  overallDefensiveScore: number;
}

export interface ExpandedGoalkeeperCapabilities {
  // Shot stopping
  reflexes: number;
  diving: number;
  oneOnOneStopping: number;
  penaltySaving: number;
  closeRangeStopping: number;
  longRangeStopping: number;
  // Positioning
  gkPositioning: number;
  rushingOut: number;
  narrowingAngles: number;
  // Distribution
  throwing: number;
  kicking: number;
  shortPassing: number;
  longPassing: number;
  // Commanding
  commandOfArea: number;
  claimingCrosses: number;
  punching: number;
  communication: number;
  // Mental
  concentration: number;
  composure: number;
  handling: number;
  // Composite
  overallGKScore: number;
}

export interface ExpandedPlayerCapabilityMatrix {
  attacking: ExpandedAttackingCapabilities;
  technical: ExpandedTechnicalCapabilities;
  physical: ExpandedPhysicalCapabilities;
  mental: ExpandedMentalCapabilities;
  defensive: ExpandedDefensiveCapabilities;
  goalkeeper?: ExpandedGoalkeeperCapabilities;
}

// ============================================================================
// ANALISADOR PRINCIPAL
// ============================================================================

export class ExpandedCapabilityAnalyzer {
  
  /**
   * Analisa todas as capacidades expandidas de um jogador
   */
  static analyzePlayer(player: Player): ExpandedPlayerCapabilityMatrix {
    const expanded = player.expandedData;
    
    return {
      attacking: this.analyzeExpandedAttacking(player, expanded),
      technical: this.analyzeExpandedTechnical(player, expanded),
      physical: this.analyzeExpandedPhysical(player, expanded),
      mental: this.analyzeExpandedMental(player, expanded),
      defensive: this.analyzeExpandedDefensive(player, expanded),
      goalkeeper: player.position === 'GK' 
        ? this.analyzeExpandedGoalkeeper(player, expanded) 
        : undefined,
    };
  }
  
  /**
   * Analisa capacidades de ataque
   */
  private static analyzeExpandedAttacking(
    player: Player, 
    expanded?: ExpandedPlayerData
  ): ExpandedAttackingCapabilities {
    const stats = player.stats;
    const tech = expanded?.technicalAttributes;
    const fin = tech?.finishing;
    
    // Usa atributos expandidos se disponíveis, senão calcula do base
    const finishingInsideBox = fin?.finishingInsideBox ?? 
      this.fallbackCalc(stats.finishing || stats.shooting, 1.05);
    const finishingOutsideBox = fin?.finishingOutsideBox ?? 
      this.fallbackCalc(stats.longShots ?? stats.shooting * 0.8, 1.0);
    const finishingOnCounter = fin?.finishingOnCounter ?? 
      this.fallbackCalc((stats.finishing + stats.pace) / 2, 1.0);
    const finishingUnderPressure = fin?.finishingUnderPressure ?? 
      this.fallbackCalc((stats.finishing + stats.composure) / 2, 1.0);
    const oneOnOneFinishing = fin?.oneOnOneFinishing ?? 
      this.fallbackCalc((stats.finishing + stats.composure) / 2, 1.0);
    const headingAccuracy = fin?.headingAccuracy ?? stats.heading;
    const headingPower = fin?.headingPower ?? 
      this.fallbackCalc((stats.heading + stats.strength) / 2, 1.0);
    const volleyAbility = fin?.volleysAndAcrobatic ?? 
      this.fallbackCalc((stats.finishing + stats.agility + stats.flair) / 3, 1.0);
    const shotPower = fin?.shotPower ?? stats.shotPower;
    const placedShotAccuracy = fin?.placedShotAccuracy ?? 
      this.fallbackCalc((stats.finishing + stats.curve) / 2, 1.0);
    const powerShotAccuracy = fin?.powerShotAccuracy ?? 
      this.fallbackCalc((stats.shotPower + stats.finishing) / 2, 1.0);
    const longShotAbility = stats.longShots ?? stats.shooting * 0.85;
    
    // Composites
    const overallFinishingScore = this.weightedAverage([
      { value: finishingInsideBox, weight: 0.35 },
      { value: finishingOutsideBox, weight: 0.15 },
      { value: headingAccuracy, weight: 0.15 },
      { value: oneOnOneFinishing, weight: 0.20 },
      { value: finishingUnderPressure, weight: 0.15 },
    ]);
    
    const composureInBox = this.weightedAverage([
      { value: stats.composure, weight: 0.5 },
      { value: finishingUnderPressure, weight: 0.3 },
      { value: oneOnOneFinishing, weight: 0.2 },
    ]);
    
    const clinicalRating = this.weightedAverage([
      { value: finishingInsideBox, weight: 0.4 },
      { value: composureInBox, weight: 0.3 },
      { value: stats.positioning, weight: 0.3 },
    ]);
    
    return {
      finishingInsideBox,
      finishingOutsideBox,
      finishingOnCounter,
      finishingUnderPressure,
      oneOnOneFinishing,
      headingAccuracy,
      headingPower,
      volleyAbility,
      shotPower,
      placedShotAccuracy,
      powerShotAccuracy,
      longShotAbility,
      overallFinishingScore,
      composureInBox,
      clinicalRating,
    };
  }
  
  /**
   * Analisa capacidades técnicas
   */
  private static analyzeExpandedTechnical(
    player: Player,
    expanded?: ExpandedPlayerData
  ): ExpandedTechnicalCapabilities {
    const stats = player.stats;
    const tech = expanded?.technicalAttributes;
    const bc = tech?.ballControl;
    const dr = tech?.dribbling;
    const ps = tech?.passing;
    const sp = tech?.setPieces;
    
    const firstTouch = bc?.firstTouchOrientated ?? stats.ballControl;
    const firstTouchUnderPressure = bc?.firstTouchUnderPressure ?? 
      this.fallbackCalc((stats.ballControl + stats.composure) / 2, 1.0);
    const aerialControl = bc?.aerialControl ?? 
      this.fallbackCalc((stats.ballControl + stats.heading) / 2, 1.0);
    const trapping = bc?.trapping ?? stats.ballControl;
    const shielding = bc?.shielding ?? 
      this.fallbackCalc((stats.strength + stats.ballControl) / 2, 1.0);
    
    const closeControl = dr?.closeControlDribbling ?? stats.dribbling;
    const speedDribbling = dr?.speedDribbling ?? 
      this.fallbackCalc((stats.dribbling + stats.pace) / 2, 1.0);
    const skillMoves = dr?.skillMoves ?? stats.flair;
    const flair = dr?.flair ?? stats.flair;
    
    const shortPassReliability = ps?.shortPassingSupport ?? stats.passing;
    const longPassAccuracy = ps?.longDiagonalPass ?? 
      this.fallbackCalc((stats.passing + (stats.longShots ?? 50)) / 2, 0.9);
    const throughBalls = ps?.throughBalls ?? 
      this.fallbackCalc((stats.passing + stats.vision) / 2, 1.0);
    const crossing = ps?.crossingFromByline ?? stats.crossing ?? stats.passing;
    const curveEffect = ps?.curveEffect ?? stats.curve;
    
    const freeKickAccuracy = this.weightedAverage([
      { value: sp?.directFreeKickPlacement ?? 50, weight: 0.6 },
      { value: sp?.directFreeKickPower ?? 50, weight: 0.4 },
    ]);
    const penaltyTaking = sp?.penaltyTaking ?? 
      this.fallbackCalc((stats.finishing + stats.composure) / 2, 1.0);
    const cornerKicking = sp?.cornerKicking ?? 
      this.fallbackCalc((stats.crossing ?? stats.passing + stats.curve) / 2, 1.0);
    
    const overallTechnicalScore = this.weightedAverage([
      { value: firstTouch, weight: 0.15 },
      { value: closeControl, weight: 0.15 },
      { value: shortPassReliability, weight: 0.20 },
      { value: crossing, weight: 0.10 },
      { value: throughBalls, weight: 0.15 },
      { value: flair, weight: 0.10 },
      { value: curveEffect, weight: 0.05 },
      { value: skillMoves, weight: 0.10 },
    ]);
    
    return {
      firstTouch,
      firstTouchUnderPressure,
      aerialControl,
      trapping,
      shielding,
      closeControl,
      speedDribbling,
      skillMoves,
      flair,
      shortPassReliability,
      longPassAccuracy,
      throughBalls,
      crossing,
      curveEffect,
      freeKickAccuracy,
      penaltyTaking,
      cornerKicking,
      overallTechnicalScore,
    };
  }
  
  /**
   * Analisa capacidades físicas
   */
  private static analyzeExpandedPhysical(
    player: Player,
    expanded?: ExpandedPlayerData
  ): ExpandedPhysicalCapabilities {
    const stats = player.stats;
    const phys = expanded?.physicalAttributes;
    const sp = phys?.speed;
    const en = phys?.endurance;
    const st = phys?.strength;
    const ag = phys?.agility;
    const jm = phys?.jumping;
    const rb = phys?.robustness;
    
    const topSpeed = sp?.topSpeed ?? stats.sprintSpeed ?? stats.pace;
    const acceleration = sp?.accelerationInitial ?? stats.acceleration ?? stats.pace;
    const sprintSpeed = sp?.sprintSpeed ?? stats.sprintSpeed ?? stats.pace;
    
    const stamina = en?.stamina ?? stats.stamina;
    const workRate = en?.workRate ?? stats.workRate ?? 50;
    
    const bodyStrength = st?.bodyToBodyStrength ?? stats.strength;
    const balanceInContact = st?.balanceInContact ?? 
      this.fallbackCalc((stats.balance + stats.strength) / 2, 1.0);
    
    const agility = ag?.lateralAgility ?? stats.agility;
    const reactionTime = ag?.reactionTime ?? 
      this.fallbackCalc((stats.agility + stats.composure) / 2, 1.0);
    const coordination = ag?.coordination ?? 
      this.fallbackCalc((stats.agility + stats.balance) / 2, 1.0);
    
    const jumpingPower = jm?.standingVerticalJump ?? stats.jumping;
    const headerTiming = jm?.headerTiming ?? 
      this.fallbackCalc((stats.jumping + stats.heading) / 2, 1.0);
    
    const injuryResistance = rb?.injuryResistance ?? stats.fitness ?? 70;
    const recoveryRate = rb?.recoveryRate ?? 
      this.fallbackCalc((stats.fitness ?? 70 + stamina) / 2, 1.0);
    
    const overallPhysicalScore = this.weightedAverage([
      { value: topSpeed, weight: 0.15 },
      { value: acceleration, weight: 0.15 },
      { value: stamina, weight: 0.20 },
      { value: bodyStrength, weight: 0.15 },
      { value: agility, weight: 0.15 },
      { value: jumpingPower, weight: 0.10 },
      { value: injuryResistance, weight: 0.10 },
    ]);
    
    return {
      topSpeed,
      acceleration,
      sprintSpeed,
      stamina,
      workRate,
      bodyStrength,
      balanceInContact,
      agility,
      reactionTime,
      coordination,
      jumpingPower,
      headerTiming,
      injuryResistance,
      recoveryRate,
      overallPhysicalScore,
    };
  }
  
  /**
   * Analisa capacidades mentais
   */
  private static analyzeExpandedMental(
    player: Player,
    expanded?: ExpandedPlayerData
  ): ExpandedMentalCapabilities {
    const stats = player.stats;
    const ment = expanded?.mentalAttributes;
    const gi = ment?.gameIntelligence;
    const pe = ment?.personality;
    const pf = ment?.performance;
    
    const decisions = gi?.decisions ?? 
      this.fallbackCalc((stats.vision + stats.composure) / 2, 1.0);
    const vision = gi?.vision ?? stats.vision;
    const creativity = gi?.creativity ?? stats.flair;
    const anticipation = gi?.anticipation ?? 
      this.fallbackCalc((stats.vision + stats.positioning) / 2, 1.0);
    const positioning = gi?.positioning ?? stats.positioning;
    const offTheBallMovement = gi?.offTheBallMovement ?? 
      this.fallbackCalc((stats.positioning + (stats.workRate ?? 50)) / 2, 1.0);
    
    const composure = pe?.composure ?? stats.composure;
    const bravery = pe?.bravery ?? 
      this.fallbackCalc(((stats.aggression ?? 50) + stats.composure) / 2, 1.0);
    const determination = pe?.determination ?? stats.workRate ?? 60;
    const teamwork = pe?.teamwork ?? stats.workRate ?? 60;
    const leadership = pe?.leadershipOnPitch ?? stats.leadership ?? 50;
    
    const consistency = pf?.consistency ?? stats.composure;
    const bigMatchPerformance = pf?.bigMatchPerformance ?? 
      this.fallbackCalc((stats.composure + (stats.leadership ?? 50)) / 2, 1.0);
    const clutchFactor = pf?.clutchFactor ?? 
      this.fallbackCalc((stats.composure + (stats.leadership ?? 50)) / 2, 1.0);
    const pressureHandling = pf?.pressureHandling ?? stats.composure;
    
    const overallMentalScore = this.weightedAverage([
      { value: composure, weight: 0.20 },
      { value: decisions, weight: 0.15 },
      { value: vision, weight: 0.15 },
      { value: positioning, weight: 0.15 },
      { value: determination, weight: 0.10 },
      { value: bravery, weight: 0.10 },
      { value: bigMatchPerformance, weight: 0.15 },
    ]);
    
    return {
      decisions,
      vision,
      creativity,
      anticipation,
      positioning,
      offTheBallMovement,
      composure,
      bravery,
      determination,
      teamwork,
      leadership,
      consistency,
      bigMatchPerformance,
      clutchFactor,
      pressureHandling,
      overallMentalScore,
    };
  }
  
  /**
   * Analisa capacidades defensivas
   */
  private static analyzeExpandedDefensive(
    player: Player,
    expanded?: ExpandedPlayerData
  ): ExpandedDefensiveCapabilities {
    const stats = player.stats;
    const def = expanded?.defensiveAttributes;
    const mk = def?.marking;
    const pr = def?.pressing;
    const tc = def?.tackling;
    const it = def?.interception;
    const dp = def?.defensivePositioning;
    
    const individualMarking = mk?.individualMarking ?? stats.defending;
    const zonalMarking = mk?.zonalMarking ?? 
      this.fallbackCalc((stats.defending + stats.positioning) / 2, 1.0);
    const trackingRuns = mk?.trackingRuns ?? 
      this.fallbackCalc(((stats.workRate ?? 50) + stats.pace) / 2, 1.0);
    
    const pressingIntensity = pr?.pressIntensity ?? stats.aggression ?? 50;
    const sustainedPressing = pr?.sustainedPressing ?? stats.workRate ?? 50;
    const counterPressing = pr?.counterPressing ?? 
      this.fallbackCalc(((stats.workRate ?? 50) + stats.defending) / 2, 1.0);
    
    const standingTackle = tc?.standingTackle ?? stats.defending;
    const slidingTackle = tc?.slidingTackle ?? 
      this.fallbackCalc((stats.defending + (stats.aggression ?? 50)) / 2, 1.0);
    const cleanTackling = tc?.cleanTackling ?? 
      this.fallbackCalc((stats.defending + 100 - (stats.aggression ?? 50)) / 2, 1.0);
    
    const interceptionAbility = it?.shortPassInterception ?? stats.interceptions ?? stats.defending;
    const shotBlocking = it?.shotBlocking ?? stats.defending;
    const readingOfPlay = it?.readingOfPlay ?? 
      this.fallbackCalc((stats.interceptions ?? stats.defending + stats.positioning) / 2, 1.0);
    
    const defensivePositioning = dp?.defensiveAwareness ?? 
      this.fallbackCalc((stats.defending + stats.positioning) / 2, 1.0);
    const covering = dp?.covering ?? stats.positioning;
    const backtracking = dp?.backtracking ?? 
      this.fallbackCalc(((stats.workRate ?? 50) + stats.pace) / 2, 1.0);
    
    const overallDefensiveScore = this.weightedAverage([
      { value: standingTackle, weight: 0.20 },
      { value: interceptionAbility, weight: 0.15 },
      { value: individualMarking, weight: 0.15 },
      { value: defensivePositioning, weight: 0.15 },
      { value: readingOfPlay, weight: 0.15 },
      { value: pressingIntensity, weight: 0.10 },
      { value: trackingRuns, weight: 0.10 },
    ]);
    
    return {
      individualMarking,
      zonalMarking,
      trackingRuns,
      pressingIntensity,
      sustainedPressing,
      counterPressing,
      standingTackle,
      slidingTackle,
      cleanTackling,
      interceptionAbility,
      shotBlocking,
      readingOfPlay,
      defensivePositioning,
      covering,
      backtracking,
      overallDefensiveScore,
    };
  }
  
  /**
   * Analisa capacidades de goleiro
   */
  private static analyzeExpandedGoalkeeper(
    player: Player,
    expanded?: ExpandedPlayerData
  ): ExpandedGoalkeeperCapabilities {
    const stats = player.stats;
    const gk = expanded?.goalkeeperAttributes;
    const ss = gk?.shotStopping;
    const po = gk?.positioning;
    const di = gk?.distribution;
    const cm = gk?.commanding;
    const mn = gk?.mentalGK;
    
    const reflexes = ss?.reflexes ?? stats.reflexes ?? 50;
    const diving = ss?.diving ?? stats.diving ?? 50;
    const oneOnOneStopping = ss?.oneOnOneStopping ?? 
      this.fallbackCalc((reflexes + stats.composure) / 2, 1.0);
    const penaltySaving = ss?.penaltySaving ?? 
      this.fallbackCalc((reflexes + stats.composure) / 2, 1.0);
    const closeRangeStopping = ss?.closeRangeShotStopping ?? reflexes;
    const longRangeStopping = ss?.longRangeShotStopping ?? 
      this.fallbackCalc((reflexes + stats.positioning) / 2, 1.0);
    
    const gkPositioning = po?.positioning ?? stats.positioning ?? 50;
    const rushingOut = po?.rushingOut ?? 
      this.fallbackCalc((gkPositioning + stats.composure) / 2, 1.0);
    const narrowingAngles = po?.narrowingAngles ?? gkPositioning;
    
    const throwing = di?.throwing ?? stats.strength ?? 50;
    const kicking = di?.kicking ?? stats.shotPower ?? 50;
    const shortPassing = di?.passingShort ?? stats.passing ?? 40;
    const longPassing = di?.passingLong ?? 
      this.fallbackCalc((stats.passing ?? 40 + stats.shotPower) / 2, 1.0);
    
    const commandOfArea = cm?.commandOfArea ?? 
      this.fallbackCalc(((stats.handling ?? 50) + stats.composure) / 2, 1.0);
    const claimingCrosses = cm?.claimingCrosses ?? 
      this.fallbackCalc(((stats.handling ?? 50) + stats.jumping) / 2, 1.0);
    const punching = cm?.punching ?? 
      this.fallbackCalc((stats.strength ?? 50 + (stats.handling ?? 50)) / 2, 1.0);
    const communication = cm?.communication ?? stats.leadership ?? 50;
    
    const concentration = mn?.concentration ?? stats.composure;
    const composure = mn?.composure ?? stats.composure;
    const handling = mn?.handling ?? stats.handling ?? 50;
    
    const overallGKScore = this.weightedAverage([
      { value: reflexes, weight: 0.20 },
      { value: diving, weight: 0.15 },
      { value: gkPositioning, weight: 0.15 },
      { value: handling, weight: 0.15 },
      { value: commandOfArea, weight: 0.10 },
      { value: claimingCrosses, weight: 0.10 },
      { value: composure, weight: 0.15 },
    ]);
    
    return {
      reflexes,
      diving,
      oneOnOneStopping,
      penaltySaving,
      closeRangeStopping,
      longRangeStopping,
      gkPositioning,
      rushingOut,
      narrowingAngles,
      throwing,
      kicking,
      shortPassing,
      longPassing,
      commandOfArea,
      claimingCrosses,
      punching,
      communication,
      concentration,
      composure,
      handling,
      overallGKScore,
    };
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  private static fallbackCalc(value: number, multiplier: number = 1.0): number {
    return clamp(Math.round(value * multiplier), 1, 99);
  }
  
  private static weightedAverage(items: Array<{ value: number; weight: number }>): number {
    let sum = 0;
    let totalWeight = 0;
    
    for (const item of items) {
      sum += item.value * item.weight;
      totalWeight += item.weight;
    }
    
    return clamp(Math.round(sum / totalWeight), 1, 99);
  }
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Calcula a eficiência de finalização baseada nos atributos expandidos
 */
export function calculateExpandedFinishingEfficiency(player: Player): number {
  const caps = ExpandedCapabilityAnalyzer.analyzePlayer(player);
  return caps.attacking.clinicalRating;
}

/**
 * Calcula a qualidade de criação de chances
 */
export function calculateExpandedCreativity(player: Player): number {
  const caps = ExpandedCapabilityAnalyzer.analyzePlayer(player);
  return caps.mental.creativity * 0.4 + caps.technical.throughBalls * 0.4 + caps.mental.vision * 0.2;
}

/**
 * Calcula o perigo em jogadas aéreas
 */
export function calculateAerialThreat(player: Player): number {
  const caps = ExpandedCapabilityAnalyzer.analyzePlayer(player);
  return caps.attacking.headingAccuracy * 0.4 + 
         caps.physical.jumpingPower * 0.3 + 
         caps.attacking.headingPower * 0.3;
}

/**
 * Calcula eficiência em chutes de longa distância
 */
export function calculateLongShotAbility(player: Player): number {
  const caps = ExpandedCapabilityAnalyzer.analyzePlayer(player);
  return caps.attacking.finishingOutsideBox * 0.5 + 
         caps.attacking.shotPower * 0.3 + 
         caps.technical.curveEffect * 0.2;
}

/**
 * Calcula capacidade de pressão
 */
export function calculatePressingAbility(player: Player): number {
  const caps = ExpandedCapabilityAnalyzer.analyzePlayer(player);
  return caps.defensive.pressingIntensity * 0.3 + 
         caps.defensive.sustainedPressing * 0.3 + 
         caps.physical.stamina * 0.2 +
         caps.physical.acceleration * 0.2;
}
