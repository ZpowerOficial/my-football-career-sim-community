import {
  Player,
  MatchSimulation,
  ExtendedMatchStats,
  TraitLevel,
} from "../../types";
import { rand, randFloat, gaussianRandom, clamp } from "../utils";
import {
  updateExpandedStatsFromMatch,
  recalculatePer90Stats,
} from "./expandedStatsUpdater";

/**
 * v0.5.2: Calcula multiplicadores de frequÃªncia de habilidades especiais baseado nos traits
 *
 * LÃ³gica bidirecional: Ter um trait significa que o jogador USA essa habilidade com frequÃªncia
 * Exemplo: Yamal com trait "Trivela" vai fazer passes de trivela em quase todo jogo
 */
function getTraitSkillMultipliers(player: Player): {
  chipShotMultiplier: number; // Cavadinha
  outsideFootMultiplier: number; // Trivela
  acrobaticMultiplier: number; // Voleios/finalizaÃ§Ãµes acrobÃ¡ticas
  longShotMultiplier: number; // Chutes de fora
  flairMultiplier: number; // Jogadas de efeito em geral
  finesseMultiplier: number; // Chutes colocados
  noLookMultiplier: number; // Passes sem olhar
  rabonaMultiplier: number; // Rabona
} {
  const levelMultiplier: Record<TraitLevel, number> = {
    Bronze: 2.0, // 2x mais frequente
    Silver: 3.0, // 3x mais frequente
    Gold: 4.5, // 4.5x mais frequente
    Diamond: 6.0, // 6x mais frequente (especialista absoluto)
  };

  const result = {
    chipShotMultiplier: 1.0,
    outsideFootMultiplier: 1.0,
    acrobaticMultiplier: 1.0,
    longShotMultiplier: 1.0,
    flairMultiplier: 1.0,
    finesseMultiplier: 1.0,
    noLookMultiplier: 1.0,
    rabonaMultiplier: 1.0,
  };

  for (const trait of player.traits) {
    const mul = levelMultiplier[trait.level] ?? 1.0;

    switch (trait.name) {
      case "Chip Shot":
        result.chipShotMultiplier *= mul;
        break;
      case "Outside Foot Shot":
        result.outsideFootMultiplier *= mul;
        break;
      case "Acrobatic Finisher":
        result.acrobaticMultiplier *= mul;
        break;
      case "Long Shots":
      case "Long Shot Taker":
        result.longShotMultiplier *= mul;
        break;
      case "Flair Player":
      case "Flair":
        result.flairMultiplier *= mul;
        // Flair tambÃ©m aumenta outras habilidades especiais (menor)
        result.chipShotMultiplier *= 1 + (mul - 1) * 0.3;
        result.outsideFootMultiplier *= 1 + (mul - 1) * 0.3;
        result.acrobaticMultiplier *= 1 + (mul - 1) * 0.3;
        result.rabonaMultiplier *= 1 + (mul - 1) * 0.5;
        result.noLookMultiplier *= 1 + (mul - 1) * 0.5;
        break;
      case "Finesse Shot":
        result.finesseMultiplier *= mul;
        break;
      case "Trickster":
        // Trickster aumenta todas as habilidades especiais
        result.rabonaMultiplier *= mul;
        result.noLookMultiplier *= mul;
        result.outsideFootMultiplier *= 1 + (mul - 1) * 0.5;
        break;
      case "Dribbling Wizard":
        // Dribladores tambÃ©m usam mais jogadas de efeito
        result.noLookMultiplier *= 1 + (mul - 1) * 0.3;
        result.rabonaMultiplier *= 1 + (mul - 1) * 0.3;
        break;
    }
  }

  return result;
}

export class SeasonStatsAggregator {
  static aggregateSeasonStats(
    matches: MatchSimulation[],
    totalMatches: number,
    player: Player,
  ): ExtendedMatchStats {
    // ===== v0.5.2: ATUALIZA ESTATÃSTICAS EXPANDIDAS PARA CADA PARTIDA =====
    if (player.expandedData) {
      matches.forEach((match, idx) => {
        // Determina contexto da partida
        const isWinning = match.goals > (match.goalsConceded ?? 0);
        const isDrawing = match.goals === (match.goalsConceded ?? 0);
        const isLosing = match.goals < (match.goalsConceded ?? 0);

        // Atualiza estatÃ­sticas ultra-detalhadas
        updateExpandedStatsFromMatch(
          player,
          match,
          {} as ExtendedMatchStats, // SerÃ¡ calculado depois
          idx + 1,
          {
            isWinning,
            isDrawing,
            isLosing,
            isCounter: Math.random() < 0.2, // 20% de gols em contra-ataque
            oppositionTier: 3, // Tier mÃ©dio por padrÃ£o
          },
        );
      });

      // Recalcula estatÃ­sticas per/90 no final
      recalculatePer90Stats(player, totalMatches * 90);
    }

    // âœ… PASSO 1: SOMAR APENAS VALORES ABSOLUTOS
    const totals = matches.reduce(
      (acc, match) => {
        acc.goals += match.goals;
        acc.assists += match.assists;
        acc.shots += match.shots;
        acc.shotsOnTarget += match.shotsOnTarget;
        acc.keyPasses += match.keyPasses;
        acc.passes += match.passes;
        acc.passesCompleted += match.passesCompleted;
        acc.dribbles += match.dribbles;
        acc.dribblesSucceeded += match.dribblesSucceeded;
        acc.tackles += match.tackles;
        acc.tacklesWon += match.tacklesWon;
        acc.duels += match.duels;
        acc.duelsWon += match.duelsWon;
        acc.groundDuels += match.groundDuels;
        acc.groundDuelsWon += match.groundDuelsWon;
        acc.aerialDuels += match.aerialDuels;
        acc.aerialDuelsWon += match.aerialDuelsWon;
        acc.interceptions += match.interceptions;
        acc.clearances += match.clearances;
        acc.blocks += match.blocks;
        acc.foulsCommitted += match.foulsCommitted;
        acc.foulsDrawn += match.foulsDrawn;
        acc.offsides += match.offsides;
        acc.yellowCards += match.yellowCard ? 1 : 0;
        acc.redCards += match.redCard ? 1 : 0;
        acc.redCardsFromSecondYellow +=
          match.yellowCard && match.redCard ? 1 : 0;

        // v0.5.2: Agregar dados detalhados de gols da simulaÃ§Ã£o
        acc.leftFootGoals += match.leftFootGoals ?? 0;
        acc.rightFootGoals += match.rightFootGoals ?? 0;
        acc.headedGoals += match.headedGoals ?? 0;
        acc.goalsInsideBox += match.goalsInsideBox ?? 0;
        acc.goalsOutsideBox += match.goalsOutsideBox ?? 0;
        acc.penaltyGoals += match.penaltyGoals ?? 0;
        acc.golazos += match.golazos ?? 0;
        acc.xGTotal += match.xGMatch ?? 0;

        // v0.5.2: Agregar gols contextuais
        acc.gameWinningGoals += match.gameWinningGoals ?? 0;
        acc.equalizerGoals += match.equalizerGoals ?? 0;
        acc.decisiveGoals += match.decisiveGoals ?? 0;

        // v0.5.3: Agregar estatísticas de goleiro da simulação
        acc.saves += match.saves ?? 0;
        acc.goalsConceded += match.goalsConceded ?? 0;
        acc.penaltiesSaved += match.penaltiesSaved ?? 0;
        // Clean sheet = partida sem sofrer gols
        if ((match.goalsConceded ?? 0) === 0 && match.saves !== undefined) {
          acc.cleanSheets += 1;
        }

        return acc;
      },
      {
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        keyPasses: 0,
        passes: 0,
        passesCompleted: 0,
        dribbles: 0,
        dribblesSucceeded: 0,
        tackles: 0,
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
        yellowCards: 0,
        redCards: 0,
        redCardsFromSecondYellow: 0,
        // v0.5.2: Dados detalhados de gols
        leftFootGoals: 0,
        rightFootGoals: 0,
        headedGoals: 0,
        goalsInsideBox: 0,
        goalsOutsideBox: 0,
        penaltyGoals: 0,
        golazos: 0,
        xGTotal: 0,
        // v0.5.2: Gols contextuais
        gameWinningGoals: 0,
        equalizerGoals: 0,
        decisiveGoals: 0,
        // v0.5.3: Estatísticas de goleiro
        saves: 0,
        goalsConceded: 0,
        penaltiesSaved: 0,
        cleanSheets: 0,
      },
    );

    const matchesPlayed = Math.max(1, totalMatches);
    const { stats } = player;

    // Ã¢Å“â€¦ PASSO 2: RECALCULAR PORCENTAGENS DO TOTAL
    const goalConversion =
      totals.shots > 0
        ? Number(((totals.goals / totals.shots) * 100).toFixed(2))
        : 0;

    const passCompletion =
      totals.passes > 0
        ? Number(((totals.passesCompleted / totals.passes) * 100).toFixed(2))
        : 0;

    const successfulDribbles =
      totals.dribbles > 0
        ? Number(
            ((totals.dribblesSucceeded / totals.dribbles) * 100).toFixed(2),
          )
        : 0;

    // Ã¢Å“â€¦ PASSO 3: CALCULAR PER-GAME STATS
    const goalsPerMatch = Number((totals.goals / matchesPlayed).toFixed(2));
    const shotsOnTargetPerGame = Number(
      (totals.shotsOnTarget / matchesPlayed).toFixed(2),
    );
    const tacklesPerGame = Number((totals.tackles / matchesPlayed).toFixed(2));
    const clearancesPerGame = Number(
      (totals.clearances / matchesPlayed).toFixed(2),
    );
    const shotsBlockedPerGame = Number(
      (totals.blocks / matchesPlayed).toFixed(2),
    );
    const foulsPerGame = Number(
      (totals.foulsCommitted / matchesPlayed).toFixed(2),
    );

    // âœ… PASSO 4: DERIVAR TIPOS DE GOLS
    // v0.5.2: Usa dados agregados da simulaÃ§Ã£o detalhada quando disponÃ­veis
    // Fallback para heurÃ­stica se os dados nÃ£o existirem (carreiras antigas)
    const hasDetailedGoalData =
      totals.leftFootGoals > 0 ||
      totals.rightFootGoals > 0 ||
      totals.headedGoals > 0;

    // LOCALIZAÃ‡ÃƒO: Dentro vs Fora da Ã¡rea (mutuamente exclusivos)
    let goalsFromOutsideBox: number;
    let goalsFromInsideBox: number;
    if (hasDetailedGoalData) {
      // Usar dados reais da simulaÃ§Ã£o
      goalsFromOutsideBox = totals.goalsOutsideBox;
      goalsFromInsideBox = totals.goalsInsideBox;
    } else {
      // Fallback heurÃ­stico para carreiras antigas
      const longShotFactor = clamp(stats.longShots / 85, 0.05, 0.3);
      goalsFromOutsideBox = Math.round(
        totals.goals * longShotFactor * randFloat(0.8, 1.2),
      );
      goalsFromInsideBox = Math.max(0, totals.goals - goalsFromOutsideBox);
    }

    // MÃ‰TODO: CabeÃ§adas (podem ser dentro OU fora da Ã¡rea)
    let headedGoals: number;
    if (hasDetailedGoalData) {
      headedGoals = totals.headedGoals;
    } else {
      const headerFactor = clamp(stats.heading / 80, 0.05, 0.35);
      headedGoals = Math.round(
        totals.goals * headerFactor * randFloat(0.8, 1.2),
      );
    }

    // SITUAÃ‡Ã•ES ESPECIAIS: Faltas, pÃªnaltis, voleios, etc.
    const freeKickFactor = clamp(stats.curve / 85, 0.01, 0.15);
    const freeKickGoals = Math.round(
      totals.goals * freeKickFactor * randFloat(0.7, 1.3),
    );
    // Calcular tentativas de falta direta baseado nos gols e eficiÃªncia estimada
    const estimatedFKEfficiency = clamp(stats.curve / 85, 0.1, 0.3); // 10-30% de conversÃ£o
    const directFreeKicksTaken =
      freeKickGoals > 0 ? Math.round(freeKickGoals / estimatedFKEfficiency) : 0;

    // PÃªnaltis: usar dados reais ou heurÃ­stica
    let penaltyGoals: number;
    if (hasDetailedGoalData) {
      penaltyGoals = totals.penaltyGoals;
    } else {
      const penaltyFactor =
        player.position === "ST" || player.position === "CF" ? 0.08 : 0.05;
      penaltyGoals = Math.round(
        totals.goals * penaltyFactor * randFloat(0.7, 1.3),
      );
    }

    // v0.5.2: HABILIDADES ESPECIAIS COM LÃ“GICA BIDIRECIONAL DE TRAITS
    // Jogadores com traits usam essas habilidades com MUITO mais frequÃªncia
    const traitMuls = getTraitSkillMultipliers(player);

    // Voleios - afetados pelo trait "Acrobatic Finisher"
    const volleyFactor =
      clamp(stats.agility / 90, 0.02, 0.12) * traitMuls.acrobaticMultiplier;
    const volleyGoals = Math.round(
      totals.goals * Math.min(volleyFactor, 0.35) * randFloat(0.6, 1.4),
    );

    // Cavadinhas - afetadas pelo trait "Chip Shot"
    const chipFactor =
      clamp(stats.flair / 95, 0.01, 0.08) * traitMuls.chipShotMultiplier;
    const chipGoals = Math.round(
      totals.goals * Math.min(chipFactor, 0.25) * randFloat(0.5, 1.5),
    );

    // Chutes colocados/com efeito - afetados pelo trait "Finesse Shot"
    const curvedFactor =
      clamp(stats.curve / 90, 0.02, 0.15) * traitMuls.finesseMultiplier;
    const curvedGoals = Math.round(
      totals.goals * Math.min(curvedFactor, 0.4) * randFloat(0.6, 1.4),
    );

    // PÃ‰: Esquerdo, Direito, PÃ© Fraco (usando dados reais ou heurÃ­stica)
    let leftFootGoals: number;
    let rightFootGoals: number;
    let weakFootGoals: number;

    if (hasDetailedGoalData) {
      // v0.5.2: Usar dados reais da simulaÃ§Ã£o detalhada
      const rawLeft = totals.leftFootGoals;
      const rawRight = totals.rightFootGoals;
      const rawHeaded = totals.headedGoals;
      const rawSum = rawLeft + rawRight + rawHeaded;

      // Garantir que left + right + headed = goals
      if (rawSum === totals.goals || rawSum === 0) {
        // Soma perfeita ou sem dados - usar direto
        leftFootGoals = rawLeft;
        rightFootGoals = rawRight;
      } else {
        // Ajustar proporcionalmente para bater com o total
        const nonHeadedGoals = totals.goals - headedGoals;
        const footSum = rawLeft + rawRight || 1;
        leftFootGoals = Math.round((rawLeft / footSum) * nonHeadedGoals);
        rightFootGoals = nonHeadedGoals - leftFootGoals;
      }

      // weakFootGoals = gols com o pÃ© nÃ£o-preferido
      if (stats.preferredFoot === "Left") {
        weakFootGoals = rightFootGoals; // PÃ© fraco Ã© o direito
      } else if (stats.preferredFoot === "Right") {
        weakFootGoals = leftFootGoals; // PÃ© fraco Ã© o esquerdo
      } else {
        weakFootGoals = Math.min(leftFootGoals, rightFootGoals); // Ambidestro
      }
    } else {
      // Fallback heurÃ­stico para carreiras antigas
      const nonHeadedGoals = Math.max(0, totals.goals - headedGoals);
      const weakFootStars = clamp(stats.weakFoot || 3, 1, 5);
      const weakFactor = (weakFootStars - 1) / 4; // 0..1
      const leftFin =
        stats.leftFootFinishing ?? stats.finishing ?? stats.shooting;
      const rightFin =
        stats.rightFootFinishing ?? stats.finishing ?? stats.shooting;

      let leftWeight = 0.5;
      let rightWeight = 0.5;
      if (stats.preferredFoot === "Left") {
        const prefWeightBase = 0.65 + weakFactor * 0.15; // 0.65..0.80
        leftWeight = prefWeightBase;
        rightWeight = 1 - leftWeight;
      } else if (stats.preferredFoot === "Right") {
        const prefWeightBase = 0.65 + weakFactor * 0.15;
        rightWeight = prefWeightBase;
        leftWeight = 1 - rightWeight;
      } else {
        // 'Both' or undefined
        const sumFin = leftFin + rightFin || 1;
        leftWeight = (leftFin / sumFin) * (0.9 + 0.2 * weakFactor);
        rightWeight = 1 - leftWeight;
      }
      // Normalize (safety)
      const wSum = leftWeight + rightWeight;
      leftWeight /= wSum;
      rightWeight /= wSum;

      leftFootGoals = Math.round(
        nonHeadedGoals * leftWeight * randFloat(0.95, 1.05),
      );
      rightFootGoals = Math.max(0, nonHeadedGoals - leftFootGoals);

      // Enforce a sensible bias toward the preferred foot
      if (stats.preferredFoot === "Right") {
        const minRightShare = 0.55 + weakFactor * 0.1;
        const minRightGoals = Math.round(nonHeadedGoals * minRightShare);
        if (rightFootGoals < minRightGoals) {
          rightFootGoals = minRightGoals;
          leftFootGoals = Math.max(0, nonHeadedGoals - rightFootGoals);
        }
      } else if (stats.preferredFoot === "Left") {
        const minLeftShare = 0.55 + weakFactor * 0.1;
        const minLeftGoals = Math.round(nonHeadedGoals * minLeftShare);
        if (leftFootGoals < minLeftGoals) {
          leftFootGoals = minLeftGoals;
          rightFootGoals = Math.max(0, nonHeadedGoals - leftFootGoals);
        }
      }

      // weakFootGoals = gols com o pÃ© nÃ£o-preferido
      weakFootGoals =
        stats.preferredFoot === "Left"
          ? rightFootGoals // PÃ© fraco Ã© o direito
          : stats.preferredFoot === "Right"
            ? leftFootGoals // PÃ© fraco Ã© o esquerdo
            : Math.min(leftFootGoals, rightFootGoals); // Ambidestro
    }

    // âœ… PASSO 5: CREATIVITY & PASSING
    // v0.5.2: Usar xG real da simulaÃ§Ã£o quando disponÃ­vel
    // xG deveria ser MENOR que gols reais para bons finalizadores
    // Jogadores elite superam xG por 15-40%, entÃ£o xG = gols * 0.6-0.85
    const finishingAbility = clamp(
      (stats.finishing ?? stats.shooting ?? 70) / 100,
      0.5,
      1.0,
    );
    // Quanto melhor o finalizador, mais supera o xG
    const xGRatio = 0.85 - (finishingAbility - 0.5) * 0.5; // 0.85 para avg, 0.60 para elite
    const expectedGoals =
      totals.xGTotal > 0
        ? Number(totals.xGTotal.toFixed(2))
        : Number(
            Math.max(
              0,
              totals.goals * xGRatio * randFloat(0.9, 1.1) +
                gaussianRandom(0, 0.3),
            ).toFixed(2),
          );
    const expectedAssists = Number(
      (totals.assists * randFloat(0.9, 1.15) + gaussianRandom(0, 0.5)).toFixed(
        2,
      ),
    );
    const touches = Math.round(
      totals.passes + totals.dribbles + totals.shots + totals.tackles * 0.5,
    );
    const bigChancesCreated = Math.round(
      totals.keyPasses * clamp(stats.vision / 90, 0.2, 0.6),
    );

    const passesInOwnHalf = Math.round(
      totals.passes *
        (player.position.includes("B") || player.position.includes("DM")
          ? 0.6
          : 0.4),
    );
    const passesInFinalThird = totals.passes - passesInOwnHalf;

    const accurateLongBalls = Math.round(
      totals.passes * 0.1 * clamp(stats.passing / 80, 0.5, 1.0),
    );
    const accurateThroughBalls = Math.round(
      totals.keyPasses * 0.4 * clamp(stats.vision / 85, 0.4, 1.0),
    );
    const accurateCrosses = Math.round(
      totals.keyPasses * 0.2 * clamp(stats.crossing / 80, 0.3, 1.0),
    );

    // Ã¢Å“â€¦ PASSO 6: DEFENDING - GK nÃ£o recupera bola no ataque
    const ballRecoveries = totals.interceptions + totals.tacklesWon;
    const ballRecoveriesInAttack =
      player.position === "GK"
        ? 0 // GK: nunca no ataque
        : Math.round(
            ballRecoveries *
              (player.position.includes("W") || player.position.includes("T")
                ? 0.4
                : 0.2),
          );
    const ballRecoveriesPerGame = Number(
      (ballRecoveries / matchesPlayed).toFixed(2),
    );

    // Goleiros quase nunca sÃ£o driblados
    const dribbledPastPerGame =
      player.position === "GK"
        ? Number(randFloat(0, 0.1).toFixed(2)) // GK: ~0-0.1/jogo
        : Number(
            (
              randFloat(0.5, 2.5) *
              (1 - clamp(stats.defending / 90, 0, 0.8))
            ).toFixed(2),
          );

    // Ã¢Å“â€¦ CORREÃƒâ€¡ÃƒÆ’O: Erros devem ser raros
    const errorsLeadingToShot =
      player.position.includes("B") || player.position.includes("DM")
        ? rand(0, 3)
        : rand(0, 1);

    const errorsLeadingToGoal =
      player.position.includes("B") || player.position.includes("DM")
        ? rand(0, 1)
        : 0;

    const penaltiesConceded =
      player.position.includes("B") || player.position.includes("DM")
        ? rand(0, 2)
        : 0;

    // âœ… CORREÃ‡ÃƒO: penaltiesWon deve ser sensÃ­vel Ã  posiÃ§Ã£o
    // Atacantes e pontas que driblam na Ã¡rea conquistam mais pÃªnaltis
    // Defensores e volantes raramente conquistam pÃªnaltis
    let penaltiesWonMultiplier = 0.02; // base para defensores
    const pos = player.position.toUpperCase();
    if (pos === "ST" || pos === "CF") {
      // Atacantes centrais - maiores chances
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.08, 0.18);
    } else if (pos === "LW" || pos === "RW") {
      // Pontas - driblam muito na Ã¡rea
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.06, 0.15);
    } else if (pos === "CAM") {
      // Meia-atacante - entra na Ã¡rea com frequÃªncia
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.04, 0.12);
    } else if (pos === "LM" || pos === "RM") {
      // Meias laterais - ocasionalmente na Ã¡rea
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.03, 0.08);
    } else if (pos === "CM") {
      // Meio-campista central - raramente na Ã¡rea
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.01, 0.04);
    } else if (pos === "CDM" || pos === "DM") {
      // Volante - muito raramente na Ã¡rea
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.005, 0.02);
    } else if (pos.includes("B") || pos === "CB") {
      // Defensores - quase nunca (exceto em escanteios raros)
      penaltiesWonMultiplier = clamp(stats.dribbling / 95, 0.002, 0.01);
    }
    const penaltiesWon = Math.round(totals.foulsDrawn * penaltiesWonMultiplier);

    const bigChancesMissed = Math.max(
      0,
      totals.shotsOnTarget - totals.goals - rand(0, 5),
    );

    const directFreeKickEffectiveness =
      directFreeKicksTaken > 0
        ? Number(((freeKickGoals / directFreeKicksTaken) * 100).toFixed(1))
        : 0;

    const possessionLost =
      totals.passes -
      totals.passesCompleted +
      (totals.dribbles - totals.dribblesSucceeded);

    // Ã¢Å“â€¦ TEAM OF THE WEEK - Sistema Competitivo NÃ£o-DeterminÃ­stico
    // Gera um rating mÃ­nimo para cada semana/jogo que varia aleatoriamente
    // Se o jogador atingir ou superar esse rating, ele ganha TOTW
    let teamOfTheWeek = 0;

    matches.forEach((match) => {
      // Gera o "rating mÃ­nimo da semana" - varia entre 7.0 e 8.5
      // DistribuiÃ§Ã£o: maioria entre 7.3-7.8, mas pode ser mais fÃ¡cil ou mais difÃ­cil
      const weeklyThreshold = clamp(
        randFloat(6.8, 8.0) + gaussianRandom(0, 0.4), // Gaussian adiciona variaÃ§Ã£o natural
        7.0,
        8.5,
      );

      // Ajuste por liga/reputaÃ§Ã£o do clube (ligas melhores = mais competitivo)
      const leagueDifficulty =
        player.team.leagueTier === 1
          ? 0.2
          : player.team.leagueTier === 2
            ? 0.1
            : 0;
      const adjustedThreshold = weeklyThreshold + leagueDifficulty;

      // Ajuste por posiÃ§Ã£o (algumas posiÃ§Ãµes tÃªm mais destaque)
      const positionBonus =
        player.position === "ST" || player.position === "CF"
          ? -0.1 // Atacantes ganham mais TOTW
          : player.position === "GK"
            ? 0.1 // Goleiros precisam ser ainda melhores
            : player.position === "CB" ||
                player.position === "LB" ||
                player.position === "RB"
              ? 0.15 // Defensores menos TOTW
              : 0;

      const finalThreshold = adjustedThreshold + positionBonus;

      // Se o rating do jogador foi igual ou maior que o threshold da semana, ele ganha TOTW!
      if (match.rating >= finalThreshold) {
        teamOfTheWeek++;
      }

      // BÃ´nus: performances absolutamente dominantes SEMPRE ganham (hat-tricks, ratings altÃ­ssimos)
      if (match.rating >= 9.0 || match.goals >= 3) {
        // Se ainda nÃ£o contou, conta agora
        if (match.rating < finalThreshold) {
          teamOfTheWeek++;
        }
      }
    });

    const averageRating =
      matches.length > 0
        ? matches.reduce((sum, match) => sum + match.rating, 0) / matches.length
        : 6.5;

    // ✅ ESTATÍSTICAS DE GOLEIRO
    let gkStats: Partial<ExtendedMatchStats> = {};
    if (player.position === "GK") {
      // v0.5.3: PRIORIZAR dados reais agregados da simulação
      // Fallback para heurísticas apenas em carreiras antigas sem dados
      const hasRealGKData = totals.saves > 0 || totals.goalsConceded > 0;

      const keeperAbility =
        ((stats.reflexes || 70) * 0.35 +
          (stats.diving || 70) * 0.25 +
          (stats.handling || 70) * 0.2 +
          (stats.positioning || 70) * 0.2) /
        100;

      let saves: number;
      let goalsConceded: number;
      let cleanSheets: number;
      let penaltiesSaved: number;

      if (hasRealGKData) {
        // ✅ USAR DADOS REAIS DA SIMULAÇÃO
        saves = totals.saves;
        goalsConceded = totals.goalsConceded;
        cleanSheets = totals.cleanSheets;
        penaltiesSaved = totals.penaltiesSaved;
      } else {
        // Fallback: heurística para carreiras antigas
        // Safeguards para evitar NaN
        const teamReputation = player.team?.reputation ?? 75;
        const leagueTier = player.team?.leagueTier ?? 2;

        const baseCleanSheetRate = 0.28;
        const adjustedRate = baseCleanSheetRate + (keeperAbility - 0.7) * 0.45;
        const teamDefenseBonus = (teamReputation - 72) / 180;
        const cleanSheetRate = clamp(adjustedRate + teamDefenseBonus, 0.12, 0.55);

        cleanSheets = Math.round(
          matchesPlayed * cleanSheetRate * randFloat(0.8, 1.2),
        );

        let expectedGoalsPerGame = 1.2;
        const repAdjustment = (teamReputation - 75) * -0.02;
        expectedGoalsPerGame += repAdjustment;
        if (leagueTier === 1) expectedGoalsPerGame += 0.1;
        else if (leagueTier >= 3) expectedGoalsPerGame -= 0.15;
        const gkReduction = (keeperAbility - 0.7) * 0.5;
        expectedGoalsPerGame *= 1 - gkReduction;
        expectedGoalsPerGame = clamp(expectedGoalsPerGame, 0.5, 1.6);

        goalsConceded = Math.round(
          matchesPlayed * expectedGoalsPerGame * randFloat(0.9, 1.1),
        );

        // Estimar defesas baseado em goalPercent típico
        const minShotsPerGame = 3;
        const shotsOnTargetFaced = Math.max(
          goalsConceded +
            Math.round(
              matchesPlayed * minShotsPerGame * keeperAbility * randFloat(0.9, 1.1),
            ),
          goalsConceded + matchesPlayed * 2,
        );
        saves = shotsOnTargetFaced - goalsConceded;
        penaltiesSaved = Math.round(rand(0, Math.max(2, Math.floor(matchesPlayed / 15))) * 0.25);
      }

      const savesPerGame = Number((saves / matchesPlayed).toFixed(2));
      const goalsConcededPerGame = Number((goalsConceded / matchesPlayed).toFixed(2));
      const cleanSheetPercentage = Number(((cleanSheets / matchesPlayed) * 100).toFixed(2));

      // Calcular shots on target faced e save %
      const shotsOnTargetFaced = saves + goalsConceded;

      // Save percentage com piso realista baseado em habilidade
      const rawSavePercentage =
        shotsOnTargetFaced > 0 ? (saves / shotsOnTargetFaced) * 100 : 70;
      const minSavePercentage = 60 + (keeperAbility - 0.7) * 30; // 60-69% mínimo
      const savePercentage = Number(
        Math.max(rawSavePercentage, minSavePercentage).toFixed(2),
      );

      // xG prevenido
      const expectedGoalsConceded = Number(
        (goalsConceded * randFloat(0.9, 1.15)).toFixed(2),
      );
      const goalsPreventedVsExpected = Number(
        (expectedGoalsConceded - goalsConceded).toFixed(2),
      );

      // Pênaltis - usar dados reais se disponíveis, senão estimar
      const penaltiesFaced = rand(
        0,
        Math.max(2, Math.floor(matchesPlayed / 15)),
      );
      const penaltySavePercentage =
        penaltiesFaced > 0
          ? Number(((penaltiesSaved / penaltiesFaced) * 100).toFixed(2))
          : 0;

      // Outras ações de goleiro
      const claimedCrosses = Math.round(
        matchesPlayed *
          2 *
          clamp(stats.handling / 80, 0.5, 1.2) *
          randFloat(0.8, 1.2),
      );
      const punchesMade = Math.round(
        matchesPlayed *
          1.5 *
          clamp(stats.reflexes / 85, 0.5, 1.0) *
          randFloat(0.7, 1.3),
      );
      const sweeper = Math.round(
        matchesPlayed *
          0.5 *
          clamp(stats.pace / 75, 0.3, 1.0) *
          randFloat(0.5, 1.5),
      );
      const distributionAccuracy = Number(
        (clamp(stats.passing / 80, 0.5, 0.95) * 100).toFixed(2),
      );

      gkStats = {
        saves,
        savesPerGame,
        savePercentage,
        cleanSheets,
        cleanSheetPercentage,
        goalsConceded,
        goalsConcededPerGame,
        expectedGoalsConceded,
        goalsPreventedVsExpected,
        shotsOnTargetFaced,
        penaltiesFaced,
        penaltiesSaved,
        penaltySavePercentage,
        claimedCrosses,
        punchesMade,
        sweeper,
        distributionAccuracy,
      };
    }

    // Calcular estatÃ­sticas detalhadas adicionais
    const minutesPlayed = matchesPlayed * 90; // AproximaÃ§Ã£o
    const gamesStarted = Math.round(matchesPlayed * 0.85); // ~85% jogos como titular
    const gamesAsSubstitute = matchesPlayed - gamesStarted;

    const shotsOffTarget = Math.max(0, totals.shots - totals.shotsOnTarget);
    const shotAccuracy =
      totals.shots > 0
        ? Number(((totals.shotsOnTarget / totals.shots) * 100).toFixed(2))
        : 0;

    const bigChancesConverted = Math.max(
      0,
      totals.goals - freeKickGoals - rand(0, 2),
    );

    // Penalty conversion stats
    const penaltyConversion =
      penaltyGoals > 0 ? Number(randFloat(75, 90).toFixed(2)) : 0;

    // Passing stats detalhados
    const assistsPerMatch = Number((totals.assists / matchesPlayed).toFixed(2));
    const keyPassesPerGame = Number(
      (totals.keyPasses / matchesPlayed).toFixed(2),
    );
    const passesPerGame = Number((totals.passes / matchesPlayed).toFixed(2));
    const touchesInOppositionBox = Math.round(
      touches * clamp(stats.positioning / 90, 0.05, 0.25),
    );
    const throughBalls = Math.round(totals.keyPasses * 0.3);
    const throughBallAccuracy =
      throughBalls > 0
        ? Number((clamp(stats.vision / 85, 0.3, 0.75) * 100).toFixed(2))
        : 0;

    const passesInOppositionHalf = totals.passes - passesInOwnHalf;
    const forwardPasses = Math.round(totals.passes * 0.45);
    const forwardPassesCompleted = Math.round(
      forwardPasses * (passCompletion / 100),
    );
    const backwardPasses = Math.round(totals.passes * 0.25);
    const sidewaysPasses = totals.passes - forwardPasses - backwardPasses;

    const longBalls = Math.round(totals.passes * 0.15);
    const longBallAccuracy =
      longBalls > 0
        ? Number((clamp(stats.passing / 80, 0.4, 0.75) * 100).toFixed(2))
        : 0;

    const crosses = Math.round(totals.keyPasses * 0.4);
    const crossAccuracy =
      crosses > 0
        ? Number((clamp(stats.crossing / 80, 0.25, 0.55) * 100).toFixed(2))
        : 0;

    const corners =
      player.position.includes("W") || player.position.includes("M")
        ? rand(0, Math.floor(matchesPlayed / 3))
        : 0;
    const cornerAccuracy =
      corners > 0
        ? Number((clamp(stats.curve / 80, 0.2, 0.5) * 100).toFixed(2))
        : 0;

    // Dribbling detalhado
    const dribblesSuccessPercentage =
      totals.dribbles > 0
        ? Number(
            ((totals.dribblesSucceeded / totals.dribbles) * 100).toFixed(2),
          )
        : 0;
    const skillMovesCompleted = Math.round(
      totals.dribblesSucceeded * clamp(stats.flair / 85, 0.1, 0.5),
    );
    const nutmegs = rand(
      0,
      Math.max(1, Math.floor(totals.dribblesSucceeded / 20)),
    );
    const timesDispossessed = Math.round(
      totals.dribbles * 0.3 * randFloat(0.8, 1.2),
    );
    const possessionLostInOwnHalf = Math.round(
      possessionLost * (player.position.includes("B") ? 0.5 : 0.2),
    );
    const ballTouchesPerGame = Number((touches / matchesPlayed).toFixed(2));
    const firstTouchSuccess = Number(
      (clamp(stats.ballControl / 85, 0.65, 0.95) * 100).toFixed(2),
    );

    // Defending detalhado
    const tacklesWon = totals.tacklesWon;
    const tackleSuccess =
      totals.tackles > 0
        ? Number(((tacklesWon / totals.tackles) * 100).toFixed(2))
        : 0;
    const interceptionsPerGame = Number(
      (totals.interceptions / matchesPlayed).toFixed(2),
    );
    const blocksPerGame = Number((totals.blocks / matchesPlayed).toFixed(2));
    const passesBlocked = Math.round(totals.blocks * 0.7);
    const headedClearances = Math.round(
      totals.clearances * clamp(stats.heading / 80, 0.3, 0.7),
    );
    const ballRecoveriesInMidfield =
      ballRecoveries -
      ballRecoveriesInAttack -
      Math.round(ballRecoveries * 0.3);
    const ballRecoveriesInDefence = Math.round(ballRecoveries * 0.3);
    const lastManTackles = player.position.includes("B") ? rand(0, 3) : 0;
    const slidingTackles = Math.round(totals.tackles * 0.4);
    const slidingTackleSuccess = Number(
      (clamp(stats.defending / 85, 0.5, 0.85) * 100).toFixed(2),
    );
    const standingTackles = totals.tackles - slidingTackles;
    // GK aplica pouquÃ­ssima pressÃ£o (quase nunca sai do gol para pressionar)
    const pressuresApplied =
      player.position === "GK"
        ? Math.round(matchesPlayed * randFloat(0.5, 2)) // GK: ~1-2/jogo
        : Math.round(matchesPlayed * 15 * clamp(stats.workRate / 80, 0.6, 1.3));
    const pressureSuccess = Number(
      (clamp(stats.aggression / 80, 0.4, 0.7) * 100).toFixed(2),
    );

    // Duels detalhados
    const duels = totals.duels;
    const duelsWonPercentage =
      totals.duels > 0
        ? Number(((totals.duelsWon / totals.duels) * 100).toFixed(2))
        : 0;
    const groundDuelsWonPercentage =
      totals.groundDuels > 0
        ? Number(
            ((totals.groundDuelsWon / totals.groundDuels) * 100).toFixed(2),
          )
        : 0;
    const aerialDuelsWonPercentage =
      totals.aerialDuels > 0
        ? Number(
            ((totals.aerialDuelsWon / totals.aerialDuels) * 100).toFixed(2),
          )
        : 0;
    const headersWon = Math.round(totals.aerialDuelsWon * 0.8);
    const headersWonPercentage =
      totals.aerialDuels > 0
        ? Number(((headersWon / totals.aerialDuels) * 100).toFixed(2))
        : 0;
    const physicalContests = Math.round(duels * 0.6);
    const physicalContestsWon = Math.round(
      physicalContests * clamp(stats.strength / 80, 0.4, 0.7),
    );
    const dribbledPast = Math.round(matchesPlayed * dribbledPastPerGame);
    const dribbledPastInDefensiveThird = Math.round(
      dribbledPast * (player.position.includes("B") ? 0.6 : 0.3),
    );

    // Work Rate & Movement - GK corre muito menos
    const baseDistancePerGame =
      player.position === "GK"
        ? clamp(stats.stamina / 80, 5.0, 6.5) // GK: 5-6.5 km/jogo
        : clamp(stats.stamina / 80, 8.5, 12.5); // Outros: 8.5-12.5 km/jogo
    const distanceCovered = Number(
      (matchesPlayed * baseDistancePerGame * randFloat(0.9, 1.1)).toFixed(2),
    );
    const sprintDistanceCovered =
      player.position === "GK"
        ? Number((distanceCovered * randFloat(0.05, 0.12)).toFixed(2)) // GK: poucos sprints
        : Number(
            (distanceCovered * clamp(stats.pace / 90, 0.15, 0.35)).toFixed(2),
          );
    const highIntensityRuns =
      player.position === "GK"
        ? Math.round(matchesPlayed * clamp(stats.workRate / 80, 5, 15)) // GK: muito menos
        : Math.round(matchesPlayed * clamp(stats.workRate / 80, 25, 65));
    const sprintsPerGame = Number(
      (clamp(stats.pace / 80, 3, 12) * randFloat(0.8, 1.2)).toFixed(2),
    );
    const trackingRuns = Math.round(highIntensityRuns * 0.4);
    // Goleiros quase nÃ£o fazem corridas ofensivas
    const offensiveRuns =
      player.position === "GK"
        ? rand(0, 5) // GK: quase nenhuma
        : Math.round(
            highIntensityRuns *
              (player.position.includes("T") || player.position.includes("W")
                ? 0.6
                : 0.3),
          );
    const defensiveRuns = highIntensityRuns - trackingRuns - offensiveRuns;
    const positionsOutOfPosition = rand(0, Math.floor(matchesPlayed / 5));

    // Discipline detalhado
    const foulsDrawnPerGame = Number(
      (totals.foulsDrawn / matchesPlayed).toFixed(2),
    );
    const offsidesPerGame = Number(
      (totals.offsides / matchesPlayed).toFixed(2),
    );

    // Errors
    const ownGoals = rand(0, 1);
    const passesIntercepted = Math.round(
      totals.passes * 0.05 * randFloat(0.8, 1.2),
    );

    // Advanced shooting
    const shotsFromInsideBox = Math.round(totals.shots * 0.7);
    const shotsFromOutsideBox = totals.shots - shotsFromInsideBox;

    // === MATCH EVENTS ===
    // Hat-tricks: 3+ gols em uma partida
    const hatTricks = matches.filter((m) => m.goals >= 3).length;
    // Braces: exatamente 2 gols em uma partida
    const braces = matches.filter((m) => m.goals === 2).length;
    // Two goal games: 2+ gols
    const twoGoalGames = matches.filter((m) => m.goals >= 2).length;

    // 🏆 MAN OF THE MATCH (SISTEMA DINÂMICO v0.5.6)
    // Em vez de um fixo >= 8.5, simulamos a nota do "melhor jogador rival" na partida.
    // Isso permite ganhar MOTM com 7.5 em jogos difíceis ou perder com 8.0 em goleadas onde outros brilharam.
    let manOfTheMatch = 0;

    matches.forEach((match) => {
      const myRating = match.rating ?? 0;
      // 1. Determinar a "barra" a ser superada (Rating do melhor jogador em campo)
      // Média de um MOTM típico é entre 7.5 e 8.2. Pode variar de 7.0 (jogo feio) a 9.5 (jogo épico).
      let matchHighestRatingThreshold = clamp(
        gaussianRandom(7.8, 0.6),
        7.0,
        9.8
      );

      // 2. Ajuste pelo Resultado: É muito difícil ser MOTM perdendo
      const goalsConceded = match.goalsConceded ?? 0;
      if (match.goals < goalsConceded) {
        // Se perdeu, a barra sobe (o MOTM provavelmente é do time vencedor)
        matchHighestRatingThreshold += randFloat(0.5, 1.5);
      } else if (match.goals === goalsConceded) {
        // Empate: barra neutra, levemente mais alta
        matchHighestRatingThreshold += randFloat(0.0, 0.3);
      } else {
        // Vitória: barra desce levemente (mais provável que seja do nosso time)
        matchHighestRatingThreshold -= randFloat(0.1, 0.3);
      }

      // 3. Viés de "Destaque Visual" (Gols e Defesas chamam atenção dos votantes)
      // O rating técnico já considera isso, mas o prêmio MOTM tem um viés popular.
      let perceivedRating = myRating;
      // Atacantes com gols decisivos ganham "pontos extras" na percepção
      if (match.gameWinningGoals && match.gameWinningGoals > 0) perceivedRating += 0.4;
      if (match.goals >= 2) perceivedRating += 0.3; // Brace chama atenção
      if (match.goals >= 3) perceivedRating += 1.0; // Hat-trick quase garante
      // Goleiros com Clean Sheet em jogo apertado
      if (player.position === "GK" && (match.goalsConceded??0) === 0 && (match.saves??0) >= 4) {
        perceivedRating += 0.5;
      }
      // 4. Verificação Final
      // Se minha performance percebida superou a simulação do resto do campo
      if (perceivedRating >= matchHighestRatingThreshold) {
        manOfTheMatch++;
      }
    });

    // Matches as captain
    const matchesAsCaptain =
      player.squadStatus === "Key Player" || player.squadStatus === "Captain"
        ? Math.round(matchesPlayed * randFloat(0.4, 0.7))
        : 0;
    // Perfect passing games (raro)
    const perfectPassingGames = matches.filter(
      (m) => m.passes > 30 && m.passesCompleted === m.passes,
    ).length;

    // === ADVANCED METRICS ===
    // Progressive carries: dribles que avanÃ§am significativamente
    const progressiveCarries = Math.round(
      totals.dribblesSucceeded *
        clamp(stats.dribbling / 80, 0.4, 0.7) *
        randFloat(0.9, 1.1),
    );
    // Progressive passes: passes que avanÃ§am a bola
    const progressivePasses = Math.round(
      forwardPasses * clamp(stats.vision / 80, 0.3, 0.6),
    );
    // Carries into final third
    const carriesIntoFinalThird = Math.round(
      progressiveCarries *
        (player.position.includes("M") || player.position.includes("W")
          ? 0.6
          : 0.3),
    );
    // Carries into penalty area
    const carriesIntoPenaltyArea = Math.round(
      carriesIntoFinalThird * clamp(stats.positioning / 80, 0.15, 0.4),
    );
    // Passes into penalty area
    const passesIntoPenaltyArea = Math.round(
      totals.keyPasses * 0.6 + throughBalls * 0.5,
    );
    // Shot creating actions (key passes + successful dribbles leading to shots)
    const shotCreatingActions = Math.round(
      totals.keyPasses + totals.dribblesSucceeded * 0.15,
    );
    // Goal creating actions (assists + key passes that led to goals)
    const goalCreatingActions = Math.round(
      totals.assists + totals.keyPasses * clamp(stats.vision / 90, 0.05, 0.15),
    );
    // Successful pressures
    const successfulPressures = Math.round(
      pressuresApplied * (pressureSuccess / 100),
    );
    // Team play stats
    const oneVersusOneWon = Math.round(
      (totals.dribblesSucceeded + totals.tacklesWon) * 0.3,
    );
    const teamPlayRating = Number(
      clamp(
        (stats.vision + stats.passing + stats.workRate) / 3 / 10,
        5,
        10,
      ).toFixed(1),
    );
    const overlappingRuns =
      player.position.includes("B") || player.position.includes("W")
        ? Math.round(matchesPlayed * randFloat(1.5, 4.0))
        : 0;
    const underlappingRuns = player.position.includes("M")
      ? Math.round(matchesPlayed * randFloat(0.8, 2.5))
      : 0;
    const supportiveRuns = Math.round(matchesPlayed * randFloat(3, 8));
    const decoyRuns = Math.round(matchesPlayed * randFloat(1, 4));
    const shotsBlockedByOpponent = Math.round(totals.shots * 0.1);

    const extendedStats: Partial<ExtendedMatchStats> = {
      // General
      rating: averageRating,
      matches: totalMatches,
      teamOfTheWeek,
      minutesPlayed,
      gamesStarted,
      gamesAsSubstitute,

      // Shooting & Finishing
      goals: totals.goals,
      expectedGoals,
      goalsPerMatch,
      shots: totals.shots,
      shotsOnTarget: totals.shotsOnTarget,
      shotsOnTargetPerGame,
      shotsOffTarget,
      shotsBlockedByOpponent,
      shotsBlockedPerGame: Number(
        (shotsBlockedByOpponent / matchesPlayed).toFixed(2),
      ),
      bigChancesMissed,
      bigChancesConverted,
      goalConversion,
      shotAccuracy,

      // Goal types
      freeKickGoals,
      directFreeKicksTaken,
      directFreeKickEffectiveness,
      penaltyGoals,
      penaltyConversion,
      goalsFromInsideBox,
      goalsFromOutsideBox,
      headedGoals,
      leftFootGoals,
      rightFootGoals,
      weakFootGoals,
      shotsFromInsideBox,
      shotsFromOutsideBox,
      volleyGoals,
      chipGoals,
      curvedGoals,

      // Creativity & Passing
      assists: totals.assists,
      expectedAssists,
      assistsPerMatch,
      touches,
      touchesInOppositionBox,
      bigChancesCreated,
      keyPasses: totals.keyPasses,
      keyPassesPerGame,
      throughBalls,
      accurateThroughBalls,
      throughBallAccuracy,

      // Passing stats
      passes: totals.passes,
      passesCompleted: totals.passesCompleted,
      passCompletion,
      passesPerGame,
      passesInOwnHalf,
      passesInOppositionHalf,
      passesInFinalThird,
      forwardPasses,
      forwardPassesCompleted,
      backwardPasses,
      sidewaysPasses,
      longBalls,
      accurateLongBalls,
      longBallAccuracy,
      crosses,
      accurateCrosses,
      crossAccuracy,
      corners,
      cornerAccuracy,

      // Dribbling & Ball Control
      dribbles: totals.dribbles,
      dribblesSucceeded: totals.dribblesSucceeded,
      dribblesSuccessPercentage,
      skillMovesCompleted,
      nutmegs,
      timesDispossessed,
      possessionLost,
      possessionLostInOwnHalf,
      ballTouchesPerGame,
      firstTouchSuccess,

      // Defensive Actions
      tackles: totals.tackles,
      tacklesWon,
      tacklesPerGame,
      tackleSuccess,
      interceptions: totals.interceptions,
      interceptionsPerGame,
      clearances: totals.clearances,
      clearancesPerGame,
      blocksPerGame,
      shotsBlocked: totals.blocks,
      passesBlocked,
      headedClearances,
      ballRecoveries,
      ballRecoveriesInAttack,
      ballRecoveriesInMidfield,
      ballRecoveriesInDefence,
      ballRecoveriesPerGame,
      lastManTackles,
      slidingTackles,
      slidingTackleSuccess,
      standingTackles,
      pressuresApplied,
      pressureSuccess,

      // Duels & Contests
      duels,
      duelsWon: totals.duelsWon,
      duelsWonPercentage,
      groundDuels: totals.groundDuels,
      groundDuelsWon: totals.groundDuelsWon,
      groundDuelsWonPercentage,
      aerialDuels: totals.aerialDuels,
      aerialDuelsWon: totals.aerialDuelsWon,
      aerialDuelsWonPercentage,
      headersWon,
      headersWonPercentage,
      physicalContests,
      physicalContestsWon,
      dribbledPast,
      dribbledPastPerGame,
      dribbledPastInDefensiveThird,

      // Discipline
      foulsCommitted: totals.foulsCommitted,
      foulsPerGame,
      foulsDrawn: totals.foulsDrawn,
      foulsDrawnPerGame,
      offsides: totals.offsides,
      offsidesPerGame,
      yellowCards: totals.yellowCards,
      redCards: totals.redCards,
      redCardsFromSecondYellow: totals.redCardsFromSecondYellow,
      penaltiesConceded,
      penaltiesWon,

      // Errors & Mistakes
      errorsLeadingToShot,
      errorsLeadingToGoal,
      ownGoals,
      passesIntercepted,

      // Work Rate & Movement
      distanceCovered,
      sprintDistanceCovered,
      highIntensityRuns,
      sprintsPerGame,
      positionsOutOfPosition,
      trackingRuns,
      offensiveRuns,
      defensiveRuns,

      // Match Events
      hatTricks,
      braces,
      manOfTheMatch,
      matchesAsCaptain,
      perfectPassingGames,

      // Team Play
      oneVersusOneWon,
      teamPlayRating,
      supportiveRuns,
      overlappingRuns,
      underlappingRuns,
      decoyRuns,

      // Advanced Metrics
      actionsWithBall: touches,
      successfulPressures,
      progressiveCarries,
      progressivePasses,
      carriesIntoFinalThird,
      carriesIntoPenaltyArea,
      passesIntoPenaltyArea,
      shotCreatingActions,
      goalCreatingActions,

      ...gkStats, // Ã¢Å“â€¦ Adiciona estatÃ­sticas de goleiro se for GK
    };

    return extendedStats as ExtendedMatchStats;
  }
}
