import { Player, MatchSimulation, PositionDetail } from "../../types";
import { rand, clamp, randFloat } from "../utils";
import { PlayerCapabilityAnalyzer } from "./capabilityAnalyzer";
import { BalancedGameConstants } from "./constants";
import { MatchContext, PlayerCapabilityMatrix } from "./types";
import { calculateMatchRating } from "../ratingSystem";
import { simulateGoalsDetailed } from "./goalSimulator";

export class MatchSimulationEngine {
  static simulateCompleteMatch(
    player: Player,
    context: MatchContext,
    forcedResult?: {
      goals?: number;
      assists?: number;
      rating?: number;
      goalsConceded?: number;
      // v0.5.2: Placar completo para gols contextuais
      teamScore?: number;
      opponentScore?: number;
    },
  ): MatchSimulation {
    const capabilities = PlayerCapabilityAnalyzer.analyzePlayer(player);
    const matchSim = this.initializeMatchStats();

    // Set goalsConceded if provided (crucial for GK)
    if (forcedResult?.goalsConceded !== undefined) {
      matchSim.goalsConceded = forcedResult.goalsConceded;
    }

    // ========== CALCULAR EXPECTED VALUES ==========
    const expectedGoals = this.calculateExpectedGoalsThisMatch(
      player,
      capabilities,
      context,
    );
    const expectedAssists = this.calculateExpectedAssistsThisMatch(
      player,
      capabilities,
      context,
    );
    const expectedShots = this.calculateExpectedShotsThisMatch(player, context);
    const expectedKeyPasses = this.calculateExpectedKeyPassesThisMatch(
      player,
      capabilities,
      context,
    );

    // ========== SIMULAR EVENTOS ==========
    // v0.5.2: Usa simulação detalhada de gols que considera todos os atributos
    // v0.5.2: Passa placar para determinar gols decisivos corretamente
    if (forcedResult?.goals !== undefined) {
      matchSim.goals = forcedResult.goals;

      // ✅ FIX: SEMPRE calcula xG via simulateGoalsDetailed, mesmo com 0 gols
      // Isso garante que xGMatch seja consistente com o sistema de conversão de gols
      const detailedResult = simulateGoalsDetailed(
        player,
        forcedResult.goals,
        expectedShots,
        {
          matchImportance: context.matchImportance,
          isHome: context.homeAdvantage,
          teamScore: forcedResult.teamScore ?? forcedResult.goals,
          opponentScore:
            forcedResult.opponentScore ?? forcedResult.goalsConceded ?? 0,
        },
      );

      // Sempre seta xG e shots do resultado detalhado
      matchSim.xGMatch = detailedResult.xGTotal;
      matchSim.shots = Math.max(detailedResult.totalShots, forcedResult.goals);
      matchSim.shotsOnTarget = Math.max(
        detailedResult.shotsOnTarget,
        forcedResult.goals,
      );

      // Popula detalhes de gols apenas se houve gols
      if (forcedResult.goals > 0) {
        matchSim.leftFootGoals = detailedResult.leftFootGoals;
        matchSim.rightFootGoals = detailedResult.rightFootGoals;
        matchSim.headedGoals = detailedResult.headedGoals;
        matchSim.goalsInsideBox = detailedResult.goalsInsideBox;
        matchSim.goalsOutsideBox = detailedResult.goalsOutsideBox;
        matchSim.penaltyGoals = detailedResult.penaltyGoals;
        matchSim.golazos = detailedResult.golazos;
        // v0.5.2: Estatísticas contextuais
        matchSim.gameWinningGoals = detailedResult.gameWinningGoals;
        matchSim.equalizerGoals = detailedResult.equalizerGoals;
        matchSim.decisiveGoals = detailedResult.decisiveGoals;
        // v0.5.2: Gols por tipo de chute especial (trait-based)
        matchSim.chipShotGoals = detailedResult.chipShotGoals;
        matchSim.trivelaShotGoals = detailedResult.trivelaShotGoals;
        matchSim.finesseShotGoals = detailedResult.finesseShotGoals;
        matchSim.powerShotGoals = detailedResult.powerShotGoals;
        matchSim.volleyGoals = detailedResult.volleyGoals;
        matchSim.bicycleKickGoals = detailedResult.bicycleKickGoals;
        matchSim.rabonaShotGoals = detailedResult.rabonaShotGoals;
      }
    } else {
      // Simulação completa usando todos os dados expandidos
      // v0.5.2: Para simulação completa, precisamos determinar o resultado primeiro
      // Então simulamos os gols e depois ajustamos os decisivos
      const detailedResult = simulateGoalsDetailed(
        player,
        expectedGoals,
        expectedShots,
        {
          matchImportance: context.matchImportance,
          isHome: context.homeAdvantage,
          // Sem placar forçado, a simulação vai usar os gols do jogador como base
        },
      );

      matchSim.goals = detailedResult.totalGoals;
      matchSim.shots = detailedResult.totalShots;
      matchSim.shotsOnTarget = detailedResult.shotsOnTarget;
      matchSim.leftFootGoals = detailedResult.leftFootGoals;
      matchSim.rightFootGoals = detailedResult.rightFootGoals;
      matchSim.headedGoals = detailedResult.headedGoals;
      matchSim.goalsInsideBox = detailedResult.goalsInsideBox;
      matchSim.goalsOutsideBox = detailedResult.goalsOutsideBox;
      matchSim.penaltyGoals = detailedResult.penaltyGoals;
      matchSim.golazos = detailedResult.golazos;
      matchSim.xGMatch = detailedResult.xGTotal;
      // v0.5.2: Estatísticas contextuais
      matchSim.gameWinningGoals = detailedResult.gameWinningGoals;
      matchSim.equalizerGoals = detailedResult.equalizerGoals;
      matchSim.decisiveGoals = detailedResult.decisiveGoals;
      // v0.5.2: Gols por tipo de chute especial (trait-based)
      matchSim.chipShotGoals = detailedResult.chipShotGoals;
      matchSim.trivelaShotGoals = detailedResult.trivelaShotGoals;
      matchSim.finesseShotGoals = detailedResult.finesseShotGoals;
      matchSim.powerShotGoals = detailedResult.powerShotGoals;
      matchSim.volleyGoals = detailedResult.volleyGoals;
      matchSim.bicycleKickGoals = detailedResult.bicycleKickGoals;
      matchSim.rabonaShotGoals = detailedResult.rabonaShotGoals;
    }

    // Se não foi simulado acima (improvável agora), simula chutes normalmente
    if (matchSim.shots === 0 && expectedShots > 0) {
      matchSim.shots = this.simulateShots(expectedShots, matchSim.goals);
      matchSim.shotsOnTarget = this.simulateShotsOnTarget(
        matchSim.shots,
        matchSim.goals,
        capabilities.attacking.finishingPower,
      );
    }

    // Ensure key passes are at least equal to assists if assists are forced
    if (forcedResult?.assists !== undefined) {
      matchSim.assists = forcedResult.assists;
      // Force key passes to be at least equal to assists + some variance
      const minKeyPasses =
        matchSim.assists + (Math.random() < 0.3 ? 0 : rand(0, 2));
      matchSim.keyPasses = Math.max(
        this.simulateKeyPasses(
          expectedKeyPasses,
          capabilities.passing.visionCreativity,
        ),
        minKeyPasses,
      );
    } else {
      matchSim.keyPasses = this.simulateKeyPasses(
        expectedKeyPasses,
        capabilities.passing.visionCreativity,
      );
      matchSim.assists = this.simulateAssists(
        expectedAssists,
        matchSim.keyPasses,
        capabilities.passing.visionCreativity,
      );
    }

    this.simulatePassing(player.position, capabilities, matchSim);
    this.simulateDefensiveActions(player, capabilities, context, matchSim);
    this.simulateDribbling(player.position, capabilities, matchSim);
    this.simulateDribbling(player.position, capabilities, matchSim);
    this.simulateDiscipline(player.position, capabilities, matchSim);

    if (player.position === "GK") {
      this.simulateGoalkeeping(capabilities, context, matchSim);
    }

    // Usa sistema centralizado de rating
    if (forcedResult?.rating !== undefined) {
      matchSim.rating = forcedResult.rating;
    } else {
      matchSim.rating = calculateMatchRating(player, matchSim);
    }

    // ValidaÃ§Ã£o final com limites por posiÃ§Ã£o (skip limits if forced to avoid losing goals)
    if (forcedResult) {
      // Only ensure basic consistency (shots >= goals) without capping max values
      matchSim.shots = Math.max(matchSim.shots, matchSim.goals);
      matchSim.shotsOnTarget = Math.max(matchSim.shotsOnTarget, matchSim.goals);
      matchSim.shots = Math.max(matchSim.shots, matchSim.shotsOnTarget);
      return matchSim;
    }

    return this.validateMatchStats(player.position, matchSim);
  }

  // ==================== CÃLCULO DE EXPECTED VALUES ====================

  /**
   * v0.5.2: Calcula o impacto da fadiga na performance
   * A stamina do jogador atenua o efeito da fadiga
   *
   * @param fatigue - NÃ­vel de fadiga acumulada (0-100)
   * @param stamina - Atributo de stamina do jogador (0-100)
   * @returns Fator multiplicador (0.7 a 1.0)
   */
  private static calculateFatigueImpact(
    fatigue: number,
    stamina: number,
  ): number {
    if (fatigue <= 0) return 1.0;

    // Fadiga mÃ¡xima reduz performance em atÃ© 30%
    const maxReduction = 0.3;

    // Stamina atenua a fadiga (jogador com 100 stamina sente 50% menos fadiga)
    const staminaAttenuation = 0.5 + stamina / 200; // 0.5 a 1.0

    // Impacto efetivo da fadiga
    const effectiveFatigue = (fatigue / 100) * (1 - staminaAttenuation * 0.5);

    return clamp(1.0 - effectiveFatigue * maxReduction, 0.7, 1.0);
  }

  private static calculateExpectedGoalsThisMatch(
    player: Player,
    capabilities: PlayerCapabilityMatrix,
    context: MatchContext,
  ): number {
    const baseRate =
      BalancedGameConstants.EXPECTED_GOALS_PER_MATCH[player.position];
    const overallFactor = BalancedGameConstants.calculateOverallFactor(
      player.stats.overall,
    );
    const finishingFactor = BalancedGameConstants.calculateFinishingFactor(
      capabilities.attacking.finishingPower,
    );

    const teamEntry = BalancedGameConstants.TEAM_MULTIPLIERS.goals.find(
      (t) => player.team.reputation >= t.minRep,
    ) || { mult: 1.0 };
    const teamFactor = teamEntry.mult;

    const oppositionFactor = this.calculateOppositionFactor(
      player.team.reputation,
      context.oppositionQuality,
    );
    // Ajuste: forma impacta menos para evitar snowball de gols
    const formFactor = clamp(1 + player.form / 25, 0.85, 1.2);
    const homeFactor = context.homeAdvantage ? 1.08 : 1.0;
    // Novo fator por liga/tier
    const leagueTierFactor =
      BalancedGameConstants.calculateLeagueTierScoringFactor(
        player.team.leagueTier,
        player.team.reputation,
        player.position,
      );

    // Novo: modificador de pressÃ£o tÃ¡tica defensiva (inspirado em MDP research)
    const defensiveTacticModifier = this.calculateDefensiveTacticModifier(
      context.oppositionQuality,
      context.matchImportance,
    );

    // âœ… NOVO: Modificador de estilo de jogo (Poacher vs False 9, etc.)
    const styleGoalModifier = BalancedGameConstants.getStyleGoalModifier(
      player.playerStyle,
    );

    // v0.5.2: Fadiga e stamina afetam performance
    const fatigueImpact = this.calculateFatigueImpact(
      context.fatigue,
      capabilities.physical.stamina,
    );

    let expected =
      baseRate *
      overallFactor *
      finishingFactor *
      teamFactor *
      oppositionFactor *
      formFactor *
      homeFactor *
      leagueTierFactor *
      defensiveTacticModifier *
      styleGoalModifier *
      fatigueImpact; // v0.5.2: Fadiga reduz expectativa de gols
    expected *= randFloat(0.7, 1.3);

    // Limites progressivos baseados no overall - ainda mais conservadores
    let maxGoals = 3; // base
    if (player.stats.overall >= 95) maxGoals = 7;
    else if (player.stats.overall >= 92) maxGoals = 5;
    else if (player.stats.overall >= 88) maxGoals = 4;

    return Math.max(0, Math.min(expected, maxGoals));
  }

  private static calculateExpectedAssistsThisMatch(
    player: Player,
    capabilities: PlayerCapabilityMatrix,
    context: MatchContext,
  ): number {
    // v0.5.2: Fadiga tambÃ©m afeta assistÃªncias
    const fatigueImpact = this.calculateFatigueImpact(
      context.fatigue,
      capabilities.physical.stamina,
    );

    const baseRate =
      BalancedGameConstants.EXPECTED_ASSISTS_PER_MATCH[player.position];
    const overallFactor = BalancedGameConstants.calculateOverallFactor(
      player.stats.overall,
    );
    const passingFactor = BalancedGameConstants.calculatePassingFactor(
      capabilities.passing.visionCreativity,
      capabilities.passing.throughBallTiming,
    );

    const teamEntry = BalancedGameConstants.TEAM_MULTIPLIERS.assists.find(
      (t) => player.team.reputation >= t.minRep,
    ) || { mult: 1.0 };
    const teamFactor = teamEntry.mult;

    const oppositionFactor = this.calculateOppositionFactor(
      player.team.reputation,
      context.oppositionQuality,
    );
    const formFactor = clamp(1 + player.form / 28, 0.85, 1.18);
    const homeFactor = context.homeAdvantage ? 1.06 : 1.0;
    const leagueTierFactor =
      BalancedGameConstants.calculateLeagueTierAssistFactor(
        player.team.leagueTier,
        player.team.reputation,
        player.position,
      );

    // Novo: modificador de pressÃ£o tÃ¡tica defensiva (inspirado em MDP research)
    const defensiveTacticModifier = this.calculateDefensiveTacticModifier(
      context.oppositionQuality,
      context.matchImportance,
    );

    // âœ… NOVO: Modificador de estilo de jogo (Advanced Playmaker vs Box-to-Box, etc.)
    const styleAssistModifier = BalancedGameConstants.getStyleAssistModifier(
      player.playerStyle,
    );

    let expected =
      baseRate *
      overallFactor *
      passingFactor *
      teamFactor *
      oppositionFactor *
      formFactor *
      homeFactor *
      leagueTierFactor *
      defensiveTacticModifier *
      styleAssistModifier *
      fatigueImpact; // v0.5.2: Fadiga reduz expectativa de assistÃªncias
    expected *= randFloat(0.65, 1.35);

    // Limites progressivos baseados no overall - conservadores
    let maxAssists = 2;
    if (player.stats.overall >= 95) maxAssists = 5;
    else if (player.stats.overall >= 92) maxAssists = 4;
    else if (player.stats.overall >= 88) maxAssists = 3;

    return Math.max(0, Math.min(expected, maxAssists));
  }

  private static calculateExpectedShotsThisMatch(
    player: Player,
    context: MatchContext,
  ): number {
    const baseShots = BalancedGameConstants.SHOTS_PER_MATCH[player.position];
    const variance = randFloat(0.75, 1.25);
    const oppositionFactor = this.calculateOppositionFactor(
      player.team.reputation,
      context.oppositionQuality,
    );

    return Math.max(0, baseShots * variance * oppositionFactor);
  }

  private static calculateExpectedKeyPassesThisMatch(
    player: Player,
    capabilities: PlayerCapabilityMatrix,
    context: MatchContext,
  ): number {
    const baseKeyPasses =
      BalancedGameConstants.KEY_PASSES_PER_MATCH[player.position];
    const visionFactor = capabilities.passing.visionCreativity / 75;
    const variance = randFloat(0.7, 1.3);
    const oppositionFactor = this.calculateOppositionFactor(
      player.team.reputation,
      context.oppositionQuality,
    );

    return Math.max(
      0,
      baseKeyPasses * visionFactor * variance * oppositionFactor,
    );
  }

  private static calculateOppositionFactor(
    teamRep: number,
    oppQuality: number,
  ): number {
    const diff = teamRep - oppQuality;

    // Ajuste: compressÃ£o do fator para reduzir extremos
    if (diff >= 15) return 1.15;
    if (diff >= 10) return 1.08;
    if (diff >= 5) return 1.03;
    if (diff >= 0) return 1.0;
    if (diff >= -5) return 0.97;
    if (diff >= -10) return 0.92;
    return 0.88;
  }

  /**
   * Calculates defensive tactic modifier inspired by MDP shot suppression research.
   * Strong teams in important matches apply tactical pressure that reduces
   * the opponent's chances of scoring - simulating "blocking dangerous zones".
   *
   * Reference: Van Roy et al. "Analyzing Learned Markov Decision Processes
   * using Model Checking for Providing Tactical Advice in Professional Soccer"
   */
  private static calculateDefensiveTacticModifier(
    oppositionQuality: number,
    matchImportance: string,
  ): number {
    // Elite teams (85+ rep) in high-stakes matches apply strong defensive pressure
    // This simulates blocking key zones like the paper's "shot suppression" concept
    if (
      oppositionQuality >= 85 &&
      ["Derby", "Continental", "CupFinal"].includes(matchImportance)
    ) {
      return 0.85; // -15% goal chance (high-intensity pressing/marking)
    }

    // Strong teams (80+ rep) in important matches still apply tactical pressure
    if (
      oppositionQuality >= 80 &&
      ["Derby", "Continental"].includes(matchImportance)
    ) {
      return 0.9; // -10% goal chance
    }

    // Good teams (75+ rep) have organized defense
    if (oppositionQuality >= 75) {
      return 0.95; // -5% goal chance
    }

    // Weaker teams don't effectively block zones
    return 1.0;
  }

  // ==================== SIMULAÃƒâ€¡ÃƒÆ’O DE EVENTOS ====================

  private static simulateGoals(
    expectedGoals: number,
    composure: number,
  ): number {
    if (expectedGoals <= 0.05) {
      return Math.random() < expectedGoals ? 1 : 0;
    }

    // DistribuiÃ§Ã£o de Poisson
    let goals = 0;
    const lambda = expectedGoals;
    let p = Math.exp(-lambda);
    let cumulativeP = p;
    const roll = Math.random();

    while (roll > cumulativeP && goals < 6) {
      goals++;
      p *= lambda / goals;
      cumulativeP += p;
    }

    // Composure boost
    if (composure >= 90 && goals === 0 && Math.random() < 0.12) {
      goals = 1;
    }

    return Math.max(0, goals);
  }

  private static simulateShots(expectedShots: number, goals: number): number {
    const lambda = Math.max(expectedShots, goals * 2.5);

    let shots = 0;
    let p = Math.exp(-lambda);
    let cumulativeP = p;
    const roll = Math.random();

    while (roll > cumulativeP && shots < 15) {
      shots++;
      p *= lambda / shots;
      cumulativeP += p;
    }

    return Math.max(shots, goals);
  }

  private static simulateShotsOnTarget(
    totalShots: number,
    goals: number,
    finishing: number,
  ): number {
    let onTargetRate = 0.35;

    if (finishing >= 90) onTargetRate = 0.65;
    else if (finishing >= 85) onTargetRate = 0.58;
    else if (finishing >= 80) onTargetRate = 0.52;
    else if (finishing >= 75) onTargetRate = 0.46;
    else if (finishing >= 70) onTargetRate = 0.4;

    let shotsOnTarget = 0;
    for (let i = 0; i < totalShots; i++) {
      if (Math.random() < onTargetRate) {
        shotsOnTarget++;
      }
    }

    return Math.max(shotsOnTarget, goals);
  }

  private static simulateKeyPasses(
    expectedKeyPasses: number,
    vision: number,
  ): number {
    const lambda = Math.max(0.3, expectedKeyPasses);

    let keyPasses = 0;
    let p = Math.exp(-lambda);
    let cumulativeP = p;
    const roll = Math.random();

    while (roll > cumulativeP && keyPasses < 10) {
      keyPasses++;
      p *= lambda / keyPasses;
      cumulativeP += p;
    }

    if (vision >= 90 && Math.random() < 0.15) {
      keyPasses++;
    }

    return Math.max(0, keyPasses);
  }

  private static simulateAssists(
    expectedAssists: number,
    keyPasses: number,
    vision: number,
  ): number {
    if (expectedAssists <= 0.03) {
      return Math.random() < expectedAssists ? 1 : 0;
    }

    const lambda = Math.min(expectedAssists, keyPasses * 0.35);

    let assists = 0;
    let p = Math.exp(-lambda);
    let cumulativeP = p;
    const roll = Math.random();

    while (roll > cumulativeP && assists < 4) {
      assists++;
      p *= lambda / assists;
      cumulativeP += p;
    }

    return Math.max(0, Math.min(assists, keyPasses));
  }

  private static simulatePassing(
    position: PositionDetail,
    capabilities: PlayerCapabilityMatrix,
    matchSim: MatchSimulation,
  ): void {
    const passesMap: Record<PositionDetail, number> = {
      GK: rand(25, 35),
      CB: rand(45, 65),
      LB: rand(35, 50),
      RB: rand(35, 50),
      LWB: rand(40, 55),
      RWB: rand(40, 55),
      CDM: rand(50, 70),
      CM: rand(55, 75),
      CAM: rand(45, 60),
      LM: rand(40, 55),
      RM: rand(40, 55),
      LW: rand(30, 45),
      RW: rand(30, 45),
      CF: rand(25, 40),
      ST: rand(20, 35),
    };

    // Apply match-specific variance (±30%) for significant rating variation
    const matchVariance = 0.70 + Math.random() * 0.60;
    matchSim.passes = Math.round((passesMap[position] || 35) * matchVariance);
    
    // Base accuracy with SIGNIFICANT match-to-match variance (±25%)
    // Real players have good and bad days - 70% one game, 90% another
    const baseAccuracy = capabilities.passing.shortPassReliability / 100;
    const accuracyVariance = -0.25 + Math.random() * 0.50; // -25% to +25%
    const passAccuracy = clamp(baseAccuracy + accuracyVariance, 0.50, 0.98);

    matchSim.passesCompleted = 0;
    for (let i = 0; i < matchSim.passes; i++) {
      if (Math.random() < passAccuracy) {
        matchSim.passesCompleted++;
      }
    }

    matchSim.passCompletion =
      matchSim.passes > 0
        ? Number(
            ((matchSim.passesCompleted / matchSim.passes) * 100).toFixed(2),
          )
        : 0;
  }

  private static simulateDefensiveActions(
    player: Player,
    capabilities: PlayerCapabilityMatrix,
    context: MatchContext,
    matchSim: MatchSimulation,
  ): void {
    const position = player.position;
    const duelsMap: Record<PositionDetail, number> = {
      GK: rand(2, 5),
      CB: rand(12, 18),
      LB: rand(8, 14),
      RB: rand(8, 14),
      LWB: rand(10, 16),
      RWB: rand(10, 16),
      CDM: rand(10, 16),
      CM: rand(8, 14),
      CAM: rand(6, 10),
      LM: rand(6, 12),
      RM: rand(6, 12),
      LW: rand(4, 8),
      RW: rand(4, 8),
      CF: rand(5, 9),
      ST: rand(4, 8),
    };

    matchSim.duels = Math.max(0, duelsMap[position] || 5);

    // v0.5.2: Peso e altura influenciam duelos fÃ­sicos
    const expanded = player.expandedData;
    const playerWeight = expanded?.physicalProfile?.weight ?? 75;
    const playerHeight = expanded?.physicalProfile?.height ?? 180;

    // Peso ajuda em duelos terrestres (proteÃ§Ã£o de bola, embates corpo-a-corpo)
    // Normaliza: 65kg = -10, 80kg = 0, 95kg = +10
    const weightAdvantage = (playerWeight - 80) / 1.5; // -10 a +10

    // Altura ajuda em duelos aÃ©reos
    // Normaliza: 170cm = -10, 185cm = 0, 200cm = +10
    const heightAdvantage = (playerHeight - 185) / 1.5; // -10 a +10

    const physicalPower =
      (capabilities.physical.strength + capabilities.physical.agility) / 2;

    // Taxa base de vitÃ³ria em duelos terrestres (peso influencia)
    let groundDuelWinRate = 0.5 + weightAdvantage / 100;
    if (physicalPower >= 85) groundDuelWinRate += 0.15;
    else if (physicalPower >= 80) groundDuelWinRate += 0.1;
    else if (physicalPower >= 75) groundDuelWinRate += 0.05;
    groundDuelWinRate = clamp(groundDuelWinRate, 0.3, 0.75);

    // Taxa de vitÃ³ria em duelos aÃ©reos (altura + impulsÃ£o influenciam)
    let aerialDuelWinRate = 0.5 + heightAdvantage / 100;
    const aerialCapability = capabilities.defensive.aerialDominance;
    if (aerialCapability >= 85) aerialDuelWinRate += 0.2;
    else if (aerialCapability >= 75) aerialDuelWinRate += 0.12;
    else if (aerialCapability >= 65) aerialDuelWinRate += 0.05;
    aerialDuelWinRate = clamp(aerialDuelWinRate, 0.25, 0.8);

    matchSim.groundDuels = Math.floor(matchSim.duels * 0.7);
    matchSim.aerialDuels = matchSim.duels - matchSim.groundDuels;

    // Simula duelos terrestres
    matchSim.groundDuelsWon = 0;
    for (let i = 0; i < matchSim.groundDuels; i++) {
      if (Math.random() < groundDuelWinRate) matchSim.groundDuelsWon++;
    }

    // Simula duelos aÃ©reos
    matchSim.aerialDuelsWon = 0;
    for (let i = 0; i < matchSim.aerialDuels; i++) {
      if (Math.random() < aerialDuelWinRate) matchSim.aerialDuelsWon++;
    }

    matchSim.duelsWon = matchSim.groundDuelsWon + matchSim.aerialDuelsWon;

    // Ã¢Å“â€¦ CORREÃƒâ€¡ÃƒÆ’O: DiferenciaÃ§Ã£o por tipo de posiÃ§Ã£o
    if (["CB", "LB", "RB", "CDM", "LWB", "RWB"].includes(position)) {
      // Defensores - valores altos
      const tacklesBase =
        position === "CB"
          ? rand(2, 5)
          : position === "CDM"
            ? rand(3, 6)
            : rand(1, 4);
      matchSim.tackles = Math.max(0, tacklesBase);

      const tackleSuccess = clamp(
        capabilities.defensive.tacklingTiming / 100,
        0.5,
        0.85,
      );
      matchSim.tacklesWon = 0;
      for (let i = 0; i < matchSim.tackles; i++) {
        if (Math.random() < tackleSuccess) matchSim.tacklesWon++;
      }

      matchSim.interceptions = Math.max(
        0,
        position === "CB"
          ? rand(1, 4)
          : position === "CDM"
            ? rand(2, 5)
            : rand(1, 3),
      );
      matchSim.clearances = Math.max(
        0,
        position === "CB" ? rand(3, 7) : rand(0, 3),
      );
      matchSim.blocks = rand(0, 2);
    } else if (["CM", "CAM", "LM", "RM"].includes(position)) {
      // Meio-campistas - valores mÃ©dios
      matchSim.tackles = Math.random() < 0.6 ? rand(0, 2) : 0;
      matchSim.tacklesWon =
        matchSim.tackles > 0 ? rand(0, matchSim.tackles) : 0;
      matchSim.interceptions = Math.random() < 0.5 ? rand(0, 1) : 0;
      matchSim.clearances = 0;
      matchSim.blocks = 0;
    } else {
      // Ã¢Å“â€¦ ATACANTES - valores baixos mas NÃƒÆ’O ZERO
      matchSim.tackles = Math.random() < 0.35 ? 1 : 0; // 35% de chance de fazer 1 tackle
      matchSim.tacklesWon = matchSim.tackles > 0 && Math.random() < 0.5 ? 1 : 0;
      matchSim.interceptions = Math.random() < 0.25 ? 1 : 0; // 25% de chance de 1 interceptaÃ§Ã£o
      matchSim.clearances = 0; // Atacantes nÃ£o fazem clearances
      matchSim.blocks = 0;
    }
  }

  private static simulateDribbling(
    position: PositionDetail,
    capabilities: PlayerCapabilityMatrix,
    matchSim: MatchSimulation,
  ): void {
    const dribblesMap: Record<PositionDetail, number> = {
      GK: rand(0, 1),
      CB: rand(1, 3),
      LB: rand(2, 5),
      RB: rand(2, 5),
      LWB: rand(3, 6),
      RWB: rand(3, 6),
      CDM: rand(2, 5),
      CM: rand(4, 8),
      CAM: rand(6, 10),
      LM: rand(5, 9),
      RM: rand(5, 9),
      LW: rand(7, 12),
      RW: rand(7, 12),
      CF: rand(4, 8),
      ST: rand(3, 7),
    };

    matchSim.dribbles = dribblesMap[position] || 3;
    // Apply match-specific variance (±40%) for significant rating variation
    const dribbleVariance = 0.60 + Math.random() * 0.80;
    matchSim.dribbles = Math.round(matchSim.dribbles * dribbleVariance);

    // Dribble success with significant variance (±25%)
    const dribbleControlFactor = capabilities.technical.dribbleControl / 100;
    const dribbleSpeedFactor = capabilities.technical.dribbleSpeed / 100;
    const combinedDribbleSkill =
      dribbleControlFactor * 0.6 + dribbleSpeedFactor * 0.4;

    // Add match-to-match variance (±25% - big swings like real football)
    const successVariance = -0.25 + Math.random() * 0.50;
    const dribbleSuccess = clamp(combinedDribbleSkill + successVariance, 0.30, 0.95);

    matchSim.dribblesSucceeded = 0;
    for (let i = 0; i < matchSim.dribbles; i++) {
      if (Math.random() < dribbleSuccess) matchSim.dribblesSucceeded++;
    }

    matchSim.dribblesSuccessful = matchSim.dribblesSucceeded;
  }

  private static simulateDiscipline(
    position: PositionDetail,
    capabilities: PlayerCapabilityMatrix,
    matchSim: MatchSimulation,
  ): void {
    // Goleiros: quase nunca cometem faltas, nunca ficam impedidos
    if (position === "GK") {
      matchSim.foulsCommitted = Math.random() < 0.1 ? 1 : 0; // 10% chance de 1 falta
      matchSim.foulsDrawn = Math.random() < 0.15 ? 1 : 0; // 15% chance
      matchSim.offsides = 0; // NUNCA
      matchSim.yellowCard = Math.random() < 0.02; // Muito raro
      // Goleiros: vermelho quase sempre por 2Âº amarelo ou falta em oportunidade clara
      if (matchSim.yellowCard) {
        matchSim.redCard = Math.random() < 0.05; // 5% de chance de 2Âº amarelo
      } else {
        matchSim.redCard = Math.random() < 0.002; // 0.2% chance de vermelho direto (falta em oportunidade clara)
      }
      return;
    }

    matchSim.foulsCommitted = rand(0, 2);
    matchSim.foulsDrawn = rand(0, 3);
    matchSim.offsides = rand(0, 2);

    const aggression = capabilities.defensive.aggressionControlled;
    const cardRisk = aggression < 60 ? 0.15 : aggression < 75 ? 0.08 : 0.04;

    matchSim.yellowCard = Math.random() < cardRisk;

    // Vermelho pode ser: 2Âº amarelo OU direto (por agressÃ£o/falta violenta)
    if (matchSim.yellowCard) {
      // 5% de chance do amarelo virar 2Âº amarelo = expulsÃ£o
      matchSim.redCard = Math.random() < 0.05;
    } else {
      // Vermelho direto sem amarelo prÃ©vio (muito raro - ~0.5% dos jogos)
      // Mais provÃ¡vel para jogadores agressivos
      const directRedChance =
        aggression < 60 ? 0.008 : aggression < 75 ? 0.004 : 0.002;
      matchSim.redCard = Math.random() < directRedChance;
    }
  }

  private static simulateGoalkeeping(
    capabilities: PlayerCapabilityMatrix,
    context: MatchContext,
    matchSim: MatchSimulation,
  ): void {
    // 1. Determine Goals Conceded (if not already set via forcedResult)
    // If we don't have a forced score, we simulate it based on opposition and defense
    if (matchSim.goalsConceded === undefined) {
      const oppQuality = context.oppositionQuality;
      const teamDefense = 75; // Baseline assumption if we don't have full team stats

      let concessionChance = 0.3; // Base chance per chunk
      if (oppQuality > teamDefense + 10) concessionChance = 0.5;
      else if (oppQuality < teamDefense - 10) concessionChance = 0.15;

      const goals =
        Math.random() < concessionChance
          ? rand(1, 3)
          : Math.random() < 0.3
            ? 0
            : 1;
      matchSim.goalsConceded = goals;
    }

    // 2. Calculate Saves based on Conceded Goals and GK Ability
    // Basic logic: Saves = (Goals / (1 - Save%)) - Goals
    // But normalized to ensure realistic ranges
    // World class GK save % ~ 75-80%
    // Average GK save % ~ 65-70%
    // Bad GK save % ~ 50-60%

    const reflexes = capabilities.goalkeeping?.reflexes || 70;
    const diving = capabilities.goalkeeping?.diving || 70;
    const positioning = capabilities.goalkeeping?.positioning || 70;

    const gkAbilityAvg = (reflexes + diving + positioning) / 3;

    // Base Save Percentage (0.60 to 0.82)
    let predictedSavePct = 0.6 + ((gkAbilityAvg - 50) / 50) * 0.22;
    predictedSavePct = clamp(predictedSavePct, 0.5, 0.85);

    // Contextual modifiers
    if (matchSim.goalsConceded === 0) {
      // Clean sheet - usually means few shots or ALL saved
      // If clean sheet, assume 2-6 saves depending on opposition
      const shotsFaced =
        context.oppositionQuality > 80 ? rand(3, 7) : rand(1, 4);
      matchSim.saves = shotsFaced;
    } else {
      // Conceded goals. Infer total shots on target.
      // SOT = Goals / (1 - Save%) roughly
      // But we invert: Saves = Goals * (Save% / (1 - Save%))
      const saveRatio = predictedSavePct / (1 - predictedSavePct);
      let expectedSaves = matchSim.goalsConceded * saveRatio;

      // Add variance
      expectedSaves *= randFloat(0.8, 1.2);

      matchSim.saves = Math.max(1, Math.round(expectedSaves));
    }

    // Cap realism
    if (matchSim.saves > 12) matchSim.saves = 12; // Rare hero performance
  }

  // MÃ©todo calculateMatchRating removido - agora usa sistema centralizado em ratingSystem.ts

  private static initializeMatchStats(): MatchSimulation {
    return {
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      keyPasses: 0,
      passes: 0,
      passesCompleted: 0,
      passCompletion: 0,
      dribbles: 0,
      dribblesSucceeded: 0,
      dribblesSuccessful: 0,
      tackles: 0,
      tacklesSucceeded: 0,
      tacklesWon: 0,
      duels: 0,
      duelsWon: 0,
      groundDuels: 0,
      groundDuelsWon: 0,
      aerialDuels: 0,
      aerialDuelsWon: 0,
      interceptions: 0,
      clearances: 0,
      blocks: 0,
      foulsCommitted: 0,
      foulsDrawn: 0,
      offsides: 0,
      yellowCard: false,
      redCard: false,
      rating: 6.0,
      saves: 0,
      goalsConceded: undefined,
      penaltiesSaved: 0,
    };
  }

  private static validateMatchStats(
    position: PositionDetail,
    sim: MatchSimulation,
  ): MatchSimulation {
    const stats: MatchSimulation = { ...sim };

    Object.keys(stats).forEach((key) => {
      const typedKey = key as keyof MatchSimulation;
      if (typeof stats[typedKey] === "number") {
        (stats[typedKey] as number) = Math.max(0, stats[typedKey] as number);
      }
    });

    // 1) RelaÃ§Ãµes bÃ¡sicas entre arremates e gols
    stats.shots = Math.max(stats.shots, stats.shotsOnTarget, stats.goals);

    // Safety check for GK stats
    if (stats.saves === undefined) stats.saves = 0;

    stats.shotsOnTarget = Math.min(
      stats.shots,
      Math.max(stats.shotsOnTarget, stats.goals),
    );
    stats.goals = Math.min(stats.goals, stats.shotsOnTarget);

    stats.passesCompleted = Math.min(stats.passes, stats.passesCompleted);
    stats.dribblesSucceeded = Math.min(stats.dribbles, stats.dribblesSucceeded);
    stats.dribblesSuccessful = stats.dribblesSucceeded;

    stats.duelsWon = Math.min(stats.duels, stats.duelsWon);
    stats.groundDuelsWon = Math.min(stats.groundDuels, stats.groundDuelsWon);
    stats.aerialDuelsWon = Math.min(stats.aerialDuels, stats.aerialDuelsWon);
    stats.tacklesWon = Math.min(stats.tackles, stats.tacklesWon);

    stats.duels = stats.groundDuels + stats.aerialDuels;
    stats.duelsWon = stats.groundDuelsWon + stats.aerialDuelsWon;

    // 2) Limites duros por posiÃ§Ã£o
    const maxGoals = BalancedGameConstants.MAX_GOALS_PER_MATCH[position];
    const maxAssists = BalancedGameConstants.MAX_ASSISTS_PER_MATCH[position];
    const maxShots = BalancedGameConstants.MAX_SHOTS_PER_MATCH[position];
    const maxKeyPasses =
      BalancedGameConstants.MAX_KEY_PASSES_PER_MATCH[position];

    stats.goals = Math.min(stats.goals, maxGoals);
    stats.assists = Math.min(stats.assists, maxAssists);
    stats.keyPasses = Math.min(stats.keyPasses, maxKeyPasses);
    stats.shots = Math.min(stats.shots, maxShots);
    stats.shotsOnTarget = Math.min(stats.shotsOnTarget, stats.shots);
    stats.shotsOnTarget = Math.max(stats.shotsOnTarget, stats.goals);

    // 3) RelaÃ§Ãµes derivadas que dependem de limites
    stats.passesCompleted = Math.min(stats.passes, stats.passesCompleted);
    stats.dribblesSucceeded = Math.min(stats.dribbles, stats.dribblesSucceeded);
    stats.dribblesSuccessful = stats.dribblesSucceeded;
    stats.tacklesWon = Math.min(stats.tackles, stats.tacklesWon);
    stats.groundDuels = Math.min(stats.groundDuels, stats.duels);
    stats.aerialDuels = Math.min(
      stats.aerialDuels,
      stats.duels - stats.groundDuels,
    );
    stats.groundDuelsWon = Math.min(stats.groundDuelsWon, stats.groundDuels);
    stats.aerialDuelsWon = Math.min(stats.aerialDuelsWon, stats.aerialDuels);
    stats.duels = stats.groundDuels + stats.aerialDuels;
    stats.duelsWon = Math.min(
      stats.duels,
      stats.groundDuelsWon + stats.aerialDuelsWon,
    );

    // 4) Rating final dentro de faixa
    stats.rating = clamp(stats.rating, 1.0, 10.0);

    return stats;
  }
}
