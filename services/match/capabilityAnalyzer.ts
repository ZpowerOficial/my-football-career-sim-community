import { Player, TraitLevel } from "../../types";
import { clamp } from "../utils";
import {
  AttackingCapabilities,
  DefensiveCapabilities,
  MentalCapabilities,
  PassingCapabilities,
  PhysicalCapabilities,
  PlayerCapabilityMatrix,
  TechnicalCapabilities,
} from "./types";

/**
 * PlayerCapabilityAnalyzer - INTEGRADO COM v0.5.2
 *
 * Agora usa dados expandidos (ExpandedPlayerData) quando disponÃ­veis,
 * com fallback para atributos base quando nÃ£o houver dados expandidos.
 */
export class PlayerCapabilityAnalyzer {
  // Helper to convert a trait level into a multiplier using provided per-level values
  private static levelMul(
    level: TraitLevel | undefined,
    values: { Bronze: number; Silver: number; Gold: number; Diamond: number },
  ): number {
    const safeLevel = (level || "Bronze") as TraitLevel;
    return values[safeLevel] ?? 1.0;
  }

  static analyzePlayer(player: Player): PlayerCapabilityMatrix {
    // Usa dados expandidos quando disponÃ­veis para maior precisÃ£o
    const expanded = player.expandedData;

    return {
      attacking: this.analyzeAttackingCapabilities(player, expanded),
      passing: this.analyzePassingCapabilities(player, expanded),
      defensive: this.analyzeDefensiveCapabilities(player, expanded),
      physical: this.analyzePhysicalCapabilities(player, expanded),
      mental: this.analyzeMentalCapabilities(player, expanded),
      technical: this.analyzeTechnicalCapabilities(player, expanded),
      goalkeeping: undefined,
    };
  }

  private static analyzeAttackingCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): AttackingCapabilities {
    const stats = player.stats;
    const tech = expanded?.technicalAttributes;
    const fin = tech?.finishing;

    // ===== USA DADOS EXPANDIDOS QUANDO DISPONÃVEIS =====
    // FinalizaÃ§Ã£o usa atributos ultra-detalhados se disponÃ­veis
    const finishingInsideBox =
      fin?.finishingInsideBox ?? stats.finishing ?? stats.shooting;
    const finishingUnderPressure =
      fin?.finishingUnderPressure ??
      ((stats.finishing ?? stats.shooting) + (stats.composure || 70)) / 2;
    const oneOnOneFinishing =
      fin?.oneOnOneFinishing ??
      ((stats.finishing ?? stats.shooting) + (stats.composure || 70)) / 2;
    const shotPower = fin?.shotPower ?? stats.shotPower ?? 70;
    const headingAccuracy = fin?.headingAccuracy ?? stats.heading ?? 70;
    const headingPower =
      fin?.headingPower ?? ((stats.heading ?? 70) + (stats.strength || 70)) / 2;

    // Compute an "effective finishing" que combina dados expandidos quando disponÃ­veis
    const baseFinishing = fin
      ? finishingInsideBox * 0.4 +
        finishingUnderPressure * 0.3 +
        oneOnOneFinishing * 0.3
      : stats.finishing || stats.shooting;
    let effectiveFootFinishing = baseFinishing;

    // Se temos dados de pÃ© do perfil expandido, usamos eles
    const physProfile = expanded?.physicalProfile;
    if (physProfile) {
      const weakFootLevel = physProfile.weakFootLevel; // 0-5
      const weakFactor = weakFootLevel / 5; // 0-1
      // Quanto maior o weakFoot, mais equilibrado
      effectiveFootFinishing = baseFinishing * (0.85 + weakFactor * 0.15);
    } else if (
      (stats.leftFootFinishing || stats.rightFootFinishing) &&
      stats.preferredFoot
    ) {
      // Weight distribution: more weight on preferred foot, but higher weakFoot increases balance
      const weak = Math.max(1, Math.min(5, stats.weakFoot || 3));
      const weakFactor = (weak - 1) / 4; // 0..1
      // Preferred foot gets 0.65 base weight + up to +0.25 with better weak foot (more balanced)
      const prefWeightBase = 0.65 + weakFactor * 0.25;
      const prefIsRight = stats.preferredFoot === "Right";
      const leftFin = stats.leftFootFinishing ?? baseFinishing;
      const rightFin = stats.rightFootFinishing ?? baseFinishing;

      let leftWeight =
        stats.preferredFoot === "Left" ? prefWeightBase : 1 - prefWeightBase;
      let rightWeight = prefIsRight ? prefWeightBase : 1 - prefWeightBase;

      // If player is marked as Both, balance weights using weakFoot as the equalizer
      if (stats.preferredFoot === "Both") {
        leftWeight = 0.5 + (weakFactor - 0.5) * 0.1; // small tilt with weak foot quality
        rightWeight = 1 - leftWeight;
      }

      effectiveFootFinishing = leftFin * leftWeight + rightFin * rightWeight;
    }

    let finishingPower = this.calculateMultiVariableCapability([
      { value: effectiveFootFinishing, weight: 0.55 },
      { value: stats.composure || 70, weight: 0.25 },
      { value: stats.shotPower || 70, weight: 0.12 },
      { value: stats.positioning || 70, weight: 0.08 },
    ]);

    // Apply trait bonuses
    const clinicalFinisherTrait = player.traits.find(
      (t) => t.name === "Clinical Finisher",
    );
    if (clinicalFinisherTrait) {
      const multiplier = this.levelMul(clinicalFinisherTrait.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      finishingPower *= multiplier;
    }

    const longShotsTrait = player.traits.find((t) => t.name === "Long Shots");
    if (longShotsTrait) {
      const multiplier = this.levelMul(longShotsTrait.level, {
        Bronze: 1.02,
        Silver: 1.04,
        Gold: 1.07,
        Diamond: 1.1,
      });
      finishingPower *= multiplier;
    }

    const poacherTrait = player.traits.find((t) => t.name === "Poacher");
    const powerHeaderTrait = player.traits.find(
      (t) => t.name === "Power Header",
    );

    let positioningIQ = this.calculateMultiVariableCapability([
      { value: stats.positioning || 70, weight: 0.55 },
      { value: stats.vision || 70, weight: 0.25 },
      { value: stats.composure || 70, weight: 0.2 },
    ]);

    if (poacherTrait) {
      const mul = this.levelMul(poacherTrait.level, {
        Bronze: 1.02,
        Silver: 1.05,
        Gold: 1.08,
        Diamond: 1.12,
      });
      positioningIQ *= mul;
    }

    let movementOffBall = this.calculateMultiVariableCapability([
      { value: stats.positioning || 70, weight: 0.45 },
      { value: stats.acceleration || 70, weight: 0.3 },
      { value: stats.agility || 70, weight: 0.25 },
    ]);

    const speedMerchantTrait = player.traits.find(
      (t) => t.name === "Speed Merchant",
    );
    if (speedMerchantTrait) {
      const mul = this.levelMul(speedMerchantTrait.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.14,
      });
      movementOffBall *= mul;
    }

    let composureInBox = this.calculateMultiVariableCapability([
      { value: stats.composure || 70, weight: 0.65 },
      { value: stats.finishing || stats.shooting, weight: 0.35 },
    ]);

    if (poacherTrait) {
      const mul = this.levelMul(poacherTrait.level, {
        Bronze: 1.02,
        Silver: 1.04,
        Gold: 1.07,
        Diamond: 1.1,
      });
      composureInBox *= mul;
    }

    const weakFootAbility = stats.weakFoot ? stats.weakFoot * 20 : 40;

    // v0.5.2: Altura agora influencia ameaÃ§a de cabeceio
    const physProfileForHeading = expanded?.physicalProfile;
    const height = physProfileForHeading?.height ?? 180;
    // BÃ´nus de altura: jogadores acima de 185cm ganham vantagem progressiva
    const heightBonus = clamp((height - 175) / 25, 0, 1) * 15; // AtÃ© +15 pontos para jogadores de 200cm+

    let headingThreat = this.calculateMultiVariableCapability([
      { value: stats.heading || 70, weight: 0.4 },
      { value: stats.jumping || 70, weight: 0.25 },
      { value: stats.strength || 70, weight: 0.15 },
      { value: 70 + heightBonus, weight: 0.2 }, // Altura como fator
    ]);

    if (powerHeaderTrait) {
      const mul = this.levelMul(powerHeaderTrait.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      headingThreat *= mul;
    }

    return {
      finishingPower: clamp(finishingPower, 10, 100),
      positioningIQ,
      movementOffBall,
      composureInBox,
      weakFootAbility,
      headingThreat,
    };
  }

  private static analyzePassingCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): PassingCapabilities {
    const stats = player.stats;
    const pass = expanded?.technicalAttributes?.passing;

    // Usa dados expandidos quando disponÃ­veis
    let shortPassReliability = this.calculateMultiVariableCapability([
      { value: pass?.shortPassingSupport ?? stats.passing, weight: 0.65 },
      { value: stats.ballControl || 70, weight: 0.2 },
      {
        value: pass?.shortPassingUnderPressure ?? stats.composure ?? 70,
        weight: 0.15,
      },
    ]);

    let longPassAccuracy = this.calculateMultiVariableCapability([
      { value: pass?.longDiagonalPass ?? stats.passing, weight: 0.55 },
      { value: stats.vision || 70, weight: 0.3 },
      { value: stats.strength || 70, weight: 0.15 },
    ]);

    let visionCreativity = this.calculateMultiVariableCapability([
      {
        value:
          expanded?.mentalAttributes?.gameIntelligence?.vision ??
          stats.vision ??
          stats.passing,
        weight: 0.75,
      },
      { value: stats.passing, weight: 0.25 },
    ]);

    let throughBallTiming = this.calculateMultiVariableCapability([
      { value: pass?.throughBalls ?? stats.vision ?? 70, weight: 0.55 },
      { value: stats.passing, weight: 0.3 },
      { value: stats.composure || 70, weight: 0.15 },
    ]);

    let crossingQuality = this.calculateMultiVariableCapability([
      {
        value: pass?.crossingFromDeep ?? stats.crossing ?? stats.passing,
        weight: 0.75,
      },
      { value: pass?.curveEffect ?? stats.curve ?? 70, weight: 0.25 },
    ]);

    let passUnderPressure = this.calculateMultiVariableCapability([
      {
        value: pass?.shortPassingUnderPressure ?? stats.composure ?? 70,
        weight: 0.45,
      },
      { value: stats.passing, weight: 0.35 },
      { value: stats.ballControl || 70, weight: 0.2 },
    ]);

    const playmaker = player.traits.find((t) => t.name === "Playmaker");
    if (playmaker) {
      const mul = this.levelMul(playmaker.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      visionCreativity *= mul;
      throughBallTiming *= mul;
      passUnderPressure *= this.levelMul(playmaker.level, {
        Bronze: 1.01,
        Silver: 1.03,
        Gold: 1.05,
        Diamond: 1.08,
      });
    }

    const vision = player.traits.find((t) => t.name === "Vision");
    if (vision) {
      const mul = this.levelMul(vision.level, {
        Bronze: 1.02,
        Silver: 1.05,
        Gold: 1.08,
        Diamond: 1.12,
      });
      visionCreativity *= mul;
      longPassAccuracy *= this.levelMul(vision.level, {
        Bronze: 1.01,
        Silver: 1.03,
        Gold: 1.05,
        Diamond: 1.08,
      });
    }

    const setPieces = player.traits.find(
      (t) => t.name === "Set-piece Specialist",
    );
    if (setPieces) {
      const mul = this.levelMul(setPieces.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      crossingQuality *= mul;
      longPassAccuracy *= this.levelMul(setPieces.level, {
        Bronze: 1.01,
        Silver: 1.02,
        Gold: 1.03,
        Diamond: 1.05,
      });
    }

    const crossing = player.traits.find(
      (t) => t.name === "Crossing Specialist",
    );
    if (crossing) {
      crossingQuality *= this.levelMul(crossing.level, {
        Bronze: 1.04,
        Silver: 1.07,
        Gold: 1.12,
        Diamond: 1.16,
      });
    }

    return {
      shortPassReliability,
      longPassAccuracy,
      visionCreativity,
      throughBallTiming,
      crossingQuality,
      passUnderPressure,
    };
  }

  private static analyzeDefensiveCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): DefensiveCapabilities {
    const stats = player.stats;
    const def = expanded?.defensiveAttributes;
    const tackleAttr = def?.tackling;
    const markAttr = def?.marking;
    const intAttr = def?.interception;

    let tacklingTiming = this.calculateMultiVariableCapability([
      { value: tackleAttr?.standingTackle ?? stats.defending, weight: 0.4 },
      { value: tackleAttr?.tackleTiming ?? stats.defending, weight: 0.2 },
      { value: stats.agility || 70, weight: 0.25 },
      {
        value: def?.defensivePositioning?.covering ?? stats.positioning ?? 70,
        weight: 0.15,
      },
    ]);

    let interceptionReading = this.calculateMultiVariableCapability([
      {
        value:
          intAttr?.shortPassInterception ??
          stats.interceptions ??
          stats.defending,
        weight: 0.35,
      },
      {
        value:
          intAttr?.longPassInterception ??
          stats.interceptions ??
          stats.defending,
        weight: 0.3,
      },
      {
        value: def?.defensivePositioning?.covering ?? stats.positioning ?? 70,
        weight: 0.25,
      },
      { value: stats.vision || 70, weight: 0.1 },
    ]);

    // v0.5.2: Altura agora influencia duelos aÃ©reos
    // Jogadores mais altos tÃªm vantagem natural em bolas aÃ©reas
    const playerHeight = expanded?.physicalProfile?.height ?? 180;
    // Normaliza altura: 170cm = 0, 200cm = 100 (linear)
    const heightFactor = clamp(((playerHeight - 170) / 30) * 100, 0, 100);

    let aerialDominance = this.calculateMultiVariableCapability([
      { value: stats.heading || 70, weight: 0.35 },
      {
        value:
          expanded?.physicalAttributes?.jumping?.standingVerticalJump ??
          stats.jumping ??
          70,
        weight: 0.3,
      },
      { value: heightFactor, weight: 0.2 }, // Altura como fator significativo
      { value: stats.strength || 70, weight: 0.15 },
    ]);

    let positioningDefense = this.calculateMultiVariableCapability([
      {
        value: def?.defensivePositioning?.covering ?? stats.positioning ?? 70,
        weight: 0.35,
      },
      {
        value:
          def?.defensivePositioning?.positionRecovery ??
          stats.positioning ??
          70,
        weight: 0.2,
      },
      { value: stats.defending, weight: 0.35 },
      { value: stats.vision || 70, weight: 0.1 },
    ]);

    let aggressionControlled = this.calculateMultiVariableCapability([
      { value: stats.aggression || 70, weight: 0.5 },
      { value: 100 - (stats.aggression || 70), weight: 0.3 },
      { value: stats.composure || 70, weight: 0.2 },
    ]);

    let recoverySpeed = this.calculateMultiVariableCapability([
      {
        value:
          def?.defensivePositioning?.backtracking ?? stats.sprintSpeed ?? 70,
        weight: 0.35,
      },
      { value: stats.sprintSpeed || 70, weight: 0.35 },
      { value: stats.acceleration || 70, weight: 0.3 },
    ]);

    const ballWinner = player.traits.find((t) => t.name === "Ball Winner");
    if (ballWinner) {
      const mul = this.levelMul(ballWinner.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      tacklingTiming *= mul;
      interceptionReading *= this.levelMul(ballWinner.level, {
        Bronze: 1.01,
        Silver: 1.03,
        Gold: 1.05,
        Diamond: 1.08,
      });
    }

    const interceptor = player.traits.find((t) => t.name === "Interceptor");
    if (interceptor) {
      interceptionReading *= this.levelMul(interceptor.level, {
        Bronze: 1.04,
        Silver: 1.08,
        Gold: 1.12,
        Diamond: 1.16,
      });
    }

    const aerial = player.traits.find((t) => t.name === "Aerial Dominance");
    if (aerial) {
      aerialDominance *= this.levelMul(aerial.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
    }

    const noNonsense = player.traits.find(
      (t) => t.name === "No Nonsense Defender",
    );
    if (noNonsense) {
      positioningDefense *= this.levelMul(noNonsense.level, {
        Bronze: 1.02,
        Silver: 1.05,
        Gold: 1.08,
        Diamond: 1.12,
      });
    }

    const lastMan = player.traits.find((t) => t.name === "Last Man");
    if (lastMan) {
      positioningDefense *= this.levelMul(lastMan.level, {
        Bronze: 1.02,
        Silver: 1.05,
        Gold: 1.08,
        Diamond: 1.12,
      });
      recoverySpeed *= this.levelMul(lastMan.level, {
        Bronze: 1.01,
        Silver: 1.03,
        Gold: 1.05,
        Diamond: 1.07,
      });
    }

    // Note: Aggressive tackle traits handled in foul logic elsewhere

    return {
      tacklingTiming,
      interceptionReading,
      aerialDominance,
      positioningDefense,
      aggressionControlled,
      recoverySpeed,
    };
  }

  private static analyzePhysicalCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): PhysicalCapabilities {
    const stats = player.stats;
    const phys = expanded?.physicalAttributes;
    const ageDecay = this.calculateAgeDecay(player.age);

    // Usa dados expandidos quando disponÃ­veis
    let sprintSpeed =
      (phys?.speed?.sprintSpeed ?? stats.sprintSpeed ?? 70) * ageDecay;
    let acceleration =
      (phys?.speed?.accelerationInitial ?? stats.acceleration ?? 70) * ageDecay;
    let stamina = (phys?.endurance?.stamina ?? stats.stamina ?? 70) * ageDecay;
    let strength = phys?.strength?.bodyToBodyStrength ?? stats.strength ?? 70;
    let agility =
      (phys?.agility?.lateralAgility ?? stats.agility ?? 70) * ageDecay;
    const balance = phys?.strength?.balanceInContact ?? stats.balance ?? 70;
    let jumping =
      (phys?.jumping?.standingVerticalJump ?? stats.jumping ?? 70) * ageDecay;

    const speedMerchant = player.traits.find(
      (t) => t.name === "Speed Merchant",
    );
    if (speedMerchant) {
      const mul = this.levelMul(speedMerchant.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.14,
      });
      sprintSpeed *= mul;
      acceleration *= mul;
    }

    const engine = player.traits.find((t) => t.name === "Engine");
    if (engine) {
      stamina *= this.levelMul(engine.level, {
        Bronze: 1.08,
        Silver: 1.12,
        Gold: 1.16,
        Diamond: 1.2,
      });
    }

    const tireless = player.traits.find((t) => t.name === "Tireless Runner");
    if (tireless) {
      stamina *= this.levelMul(tireless.level, {
        Bronze: 1.1,
        Silver: 1.15,
        Gold: 1.2,
        Diamond: 1.25,
      });
    }

    const secondWind = player.traits.find((t) => t.name === "Second Wind");
    if (secondWind) {
      stamina *= this.levelMul(secondWind.level, {
        Bronze: 1.05,
        Silver: 1.08,
        Gold: 1.12,
        Diamond: 1.15,
      });
    }

    const naturalFitness = player.traits.find(
      (t) => t.name === "Natural Fitness",
    );
    if (naturalFitness) {
      const mul = this.levelMul(naturalFitness.level, {
        Bronze: 1.05,
        Silver: 1.08,
        Gold: 1.1,
        Diamond: 1.12,
      });
      stamina *= mul;
      agility *= this.levelMul(naturalFitness.level, {
        Bronze: 1.01,
        Silver: 1.02,
        Gold: 1.03,
        Diamond: 1.04,
      });
    }

    const aerial = player.traits.find((t) => t.name === "Aerial Dominance");
    if (aerial) {
      jumping *= this.levelMul(aerial.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      strength *= this.levelMul(aerial.level, {
        Bronze: 1.01,
        Silver: 1.02,
        Gold: 1.03,
        Diamond: 1.04,
      });
    }

    return {
      sprintSpeed,
      acceleration,
      stamina,
      strength,
      agility,
      balance,
      jumping,
    };
  }

  private static analyzeMentalCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): MentalCapabilities {
    const stats = player.stats;
    const mental = expanded?.mentalAttributes;
    const personality = mental?.personality;
    const performance = mental?.performance;
    const gameIQ = mental?.gameIntelligence;

    let bigGameMentality = performance?.bigMatchPerformance ?? 55;
    if (player.traits.some((t) => t.name === "Big Game Player")) {
      bigGameMentality = 90;
    } else if (player.personality === "Leader") {
      bigGameMentality = Math.max(bigGameMentality, 75);
    } else if (player.personality === "Temperamental") {
      bigGameMentality = Math.min(bigGameMentality, 40);
    }

    let composure = personality?.composure ?? stats.composure ?? 70;
    let concentration = gameIQ?.anticipation ?? stats.positioning ?? 70;
    let decisionMaking =
      gameIQ?.decisions ??
      (stats.vision || 70) * 0.5 +
        (stats.positioning || 70) * 0.3 +
        stats.overall * 0.2;
    let workRate =
      expanded?.physicalAttributes?.endurance?.workRate ??
      this.calculateWorkRate(player);
    let leadership =
      personality?.leadershipOnPitch ??
      (player.personality === "Leader" ? 85 : 55);
    const confidence = performance?.clutchFactor ?? 0;

    const leadershipTrait = player.traits.find((t) => t.name === "Leadership");
    if (leadershipTrait) {
      leadership *= this.levelMul(leadershipTrait.level, {
        Bronze: 1.1,
        Silver: 1.2,
        Gold: 1.3,
        Diamond: 1.4,
      });
      if (bigGameMentality < 80)
        bigGameMentality = Math.max(bigGameMentality, 75);
    }

    const composureTrait = player.traits.find((t) => t.name === "Composure");
    if (composureTrait) {
      composure *= this.levelMul(composureTrait.level, {
        Bronze: 1.05,
        Silver: 1.1,
        Gold: 1.15,
        Diamond: 1.2,
      });
      decisionMaking *= this.levelMul(composureTrait.level, {
        Bronze: 1.01,
        Silver: 1.02,
        Gold: 1.03,
        Diamond: 1.04,
      });
    }

    const tireless = player.traits.find(
      (t) => t.name === "Tireless Runner" || t.name === "Engine",
    );
    if (tireless) {
      workRate *= this.levelMul(tireless.level, {
        Bronze: 1.05,
        Silver: 1.08,
        Gold: 1.12,
        Diamond: 1.15,
      });
    }

    return {
      composure: clamp(composure, 0, 100),
      concentration: clamp(concentration, 0, 100),
      decisionMaking: clamp(decisionMaking, 0, 100),
      workRate: clamp(workRate, 0, 100),
      bigGameMentality: clamp(bigGameMentality, 0, 100),
      leadership: clamp(leadership, 0, 100),
      confidence,
    };
  }

  private static analyzeTechnicalCapabilities(
    player: Player,
    expanded?: typeof player.expandedData,
  ): TechnicalCapabilities {
    const stats = player.stats;
    const tech = expanded?.technicalAttributes;
    const bc = tech?.ballControl;
    const drib = tech?.dribbling;

    let ballControl = bc?.firstTouchOrientated ?? stats.ballControl ?? 70;
    let dribbleControl = this.calculateMultiVariableCapability([
      { value: drib?.closeControlDribbling ?? stats.dribbling, weight: 0.65 },
      {
        value: bc?.firstTouchOrientated ?? stats.ballControl ?? 70,
        weight: 0.35,
      },
    ]);
    let dribbleSpeed = this.calculateMultiVariableCapability([
      { value: drib?.speedDribbling ?? stats.dribbling, weight: 0.5 },
      { value: stats.agility || 70, weight: 0.3 },
      { value: stats.acceleration || 70, weight: 0.2 },
    ]);
    let firstTouch = this.calculateMultiVariableCapability([
      {
        value: bc?.firstTouchOrientated ?? stats.ballControl ?? 70,
        weight: 0.35,
      },
      {
        value: bc?.firstTouchUnderPressure ?? stats.ballControl ?? 70,
        weight: 0.3,
      },
      { value: stats.composure || 70, weight: 0.35 },
    ]);
    let weakFootProficiency = expanded?.physicalProfile?.weakFootLevel
      ? expanded.physicalProfile.weakFootLevel * 20
      : stats.weakFoot
        ? stats.weakFoot * 20
        : 40;

    const dribblingWizard = player.traits.find(
      (t) => t.name === "Dribbling Wizard",
    );
    if (dribblingWizard) {
      const mul = this.levelMul(dribblingWizard.level, {
        Bronze: 1.05,
        Silver: 1.1,
        Gold: 1.15,
        Diamond: 1.2,
      });
      dribbleControl *= mul;
      dribbleSpeed *= this.levelMul(dribblingWizard.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.12,
      });
      firstTouch *= this.levelMul(dribblingWizard.level, {
        Bronze: 1.02,
        Silver: 1.04,
        Gold: 1.06,
        Diamond: 1.08,
      });
      ballControl *= this.levelMul(dribblingWizard.level, {
        Bronze: 1.02,
        Silver: 1.04,
        Gold: 1.06,
        Diamond: 1.08,
      });
    }

    const flair = player.traits.find((t) => t.name === "Flair Player");
    if (flair) {
      dribbleControl *= this.levelMul(flair.level, {
        Bronze: 1.03,
        Silver: 1.06,
        Gold: 1.1,
        Diamond: 1.15,
      });
      dribbleSpeed *= this.levelMul(flair.level, {
        Bronze: 1.02,
        Silver: 1.04,
        Gold: 1.07,
        Diamond: 1.1,
      });
    }

    const twoFooted = player.traits.find((t) => t.name === "Two-Footed");
    if (twoFooted) {
      weakFootProficiency *= this.levelMul(twoFooted.level, {
        Bronze: 1.1,
        Silver: 1.2,
        Gold: 1.3,
        Diamond: 1.4,
      });
    }

    return {
      ballControl: clamp(ballControl, 0, 100),
      dribbleControl: clamp(dribbleControl, 0, 100),
      dribbleSpeed: clamp(dribbleSpeed, 0, 100),
      firstTouch: clamp(firstTouch, 0, 100),
      weakFootProficiency: clamp(weakFootProficiency, 0, 100),
    };
  }

  private static calculateMultiVariableCapability(
    variables: Array<{ value: number; weight: number }>,
  ): number {
    const weightSum = variables.reduce((sum, v) => sum + v.weight, 0);
    const normalized = variables.map((v) => ({
      ...v,
      weight: v.weight / weightSum,
    }));
    const result = normalized.reduce((sum, v) => sum + v.value * v.weight, 0);
    return clamp(result, 0, 100);
  }

  private static calculateAgeDecay(age: number): number {
    if (age <= 28) return 1.0;
    if (age <= 30) return 0.98;
    if (age <= 32) return 0.95;
    if (age <= 34) return 0.9;
    if (age <= 36) return 0.82;
    return 0.7;
  }

  private static calculateWorkRate(player: Player): number {
    if (player.personality === "Professional") return 90;
    if (player.personality === "Leader") return 85;
    if (player.personality === "Temperamental") return 60;
    return 70;
  }
}
