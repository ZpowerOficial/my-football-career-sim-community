/**
 * Sistema Centralizado de Rating
 *
 * Este arquivo centraliza todos os cÃ¡lculos de rating do jogo para garantir consistÃªncia.
 *
 * ESCALAS DE RATING:
 * - Match Rating (por jogo): 1.0 - 10.0
 * - Season Performance Rating (temporada): 0.0 - 1.0 (normalizado)
 * - Display Rating (exibiÃ§Ã£o): 1.0 - 10.0
 */

import { Player, MatchSimulation, PositionDetail } from "../types";
import { clamp } from "./utils";
import { getPositionPenaltyModifier } from "./positionPenalty";

// ==================== RATING POR JOGO (1-10) ====================

/**
 * Calcula o rating de um jogo individual (escala 1-10)
 * Baseado nas estatÃ­sticas da partida
 */
export const calculateMatchRating = (
  player: Player,
  matchStats: MatchSimulation,
  playedPosition?: PositionDetail, // v0.5.2: Posição jogada (pode ser diferente da principal)
): number => {
  let rating = 6.0; // Base rating

  // Gols e assistÃªncias (impacto direto)
  rating += matchStats.goals * 1.5;
  rating += matchStats.assists * 1.0;

  // v0.5.2: BÃ´nus para qualidade dos gols
  // Golazos (gols de baixo xG) merecem reconhecimento extra
  if (matchStats.golazos && matchStats.golazos > 0) {
    rating += matchStats.golazos * 0.5; // +0.5 por golaÃ§o
  }

  // Gols de fora da Ã¡rea sÃ£o mais difÃ­ceis
  if (matchStats.goalsOutsideBox && matchStats.goalsOutsideBox > 0) {
    rating += matchStats.goalsOutsideBox * 0.2;
  }

  // v0.5.2: BÃ´nus/penalidade baseado em xG vs gols reais (eficiÃªncia clÃ­nica)
  if (
    matchStats.xGMatch !== undefined &&
    matchStats.xGMatch > 0 &&
    matchStats.goals > 0
  ) {
    // Se marcou mais que o xG esperado, jogador foi clÃ­nico
    const xGDiff = matchStats.goals - matchStats.xGMatch;
    // +0.3 por gol acima do xG, -0.2 por gol abaixo
    rating +=
      xGDiff > 0 ? Math.min(xGDiff * 0.3, 0.8) : Math.max(xGDiff * 0.2, -0.4);
  }

  // PrecisÃ£o de chutes
  if (matchStats.shots > 0) {
    const accuracy = matchStats.shotsOnTarget / matchStats.shots;
    rating += (accuracy - 0.35) * 1.5;
  }

  // PrecisÃ£o de passes
  if (matchStats.passes > 0) {
    const passAccuracy = matchStats.passesCompleted / matchStats.passes;
    rating += (passAccuracy - 0.75) * 3.0;
  }

  // Passes-chave
  rating += matchStats.keyPasses * 0.15;

  // Dribles bem-sucedidos
  if (matchStats.dribbles > 0) {
    const dribbleSuccess = matchStats.dribblesSucceeded / matchStats.dribbles;
    rating += (dribbleSuccess - 0.5) * 1.0;
  }

  // Duelos vencidos
  if (matchStats.duels > 0) {
    const duelSuccess = matchStats.duelsWon / matchStats.duels;
    rating += (duelSuccess - 0.5) * 0.8;
  }

  // AÃ§Ãµes defensivas
  rating += matchStats.interceptions * 0.12;
  rating += matchStats.tacklesWon * 0.12;

  // PenalizaÃ§Ãµes
  rating -= matchStats.foulsCommitted * 0.08;
  if (matchStats.yellowCard) rating -= 0.2;
  if (matchStats.redCard) rating -= 2.0;

  // ==================== GOALKEEPER SPECIFIC ====================
  if (player.position === "GK") {
    // Saves are the primary metric for GK performance
    if (matchStats.saves) {
      // +0.4 per save is significant. 5 saves = +2.0 rating
      rating += matchStats.saves * 0.4;
    }

    // Goals conceded penalty (offset by saves) - CORRIGIDO: menos punitivo
    if (matchStats.goalsConceded !== undefined) {
      if (matchStats.goalsConceded === 0) {
        // Clean sheet bonus
        rating += 1.2;
      } else {
        // Penalidade mÃ¡xima de -1.5 por jogo independente de quantos gols
        const penaltyPerGoal = 0.35; // Menos punitivo (era 0.5)
        const maxPenalty = 1.5;
        rating -= Math.min(
          matchStats.goalsConceded * penaltyPerGoal,
          maxPenalty,
        );
      }
    }

    // Penalty saves (huge moment)
    if (matchStats.penaltiesSaved) {
      rating += matchStats.penaltiesSaved * 1.5;
    }
  }

  // v0.5.2: Aplica penalidade se jogador estiver fora de posição
  if (playedPosition && playedPosition !== player.position) {
    const positionModifier = getPositionPenaltyModifier(player, playedPosition);
    rating *= positionModifier;
  }

  // v0.5.3: Daily form modifier - players have good and bad days
  // This adds ±0.7 rating swing to simulate real match-to-match variance
  // Some days everything clicks, other days nothing works
  const dailyFormModifier = -0.7 + Math.random() * 1.4;
  rating += dailyFormModifier;

  return clamp(rating, 1.0, 10.0);
};

// ==================== RATING DE TEMPORADA (0-1 normalizado) ====================

/**
 * Calcula o rating de performance da temporada (escala 0-1 normalizada)
 * Usado para progressÃ£o, transferÃªncias e eventos
 */
export const calculateSeasonPerformanceRating = (
  player: Player,
  goals: number,
  assists: number,
  cleanSheets: number,
  matchesPlayed: number,
): number => {
  if (matchesPlayed === 0) return 0;

  const { position, stats } = player;
  let rating = 0.5; // Base

  if (position === "GK") {
    const csRate = cleanSheets / matchesPlayed;
    rating = csRate * 2.5; // Clean sheets sÃ£o cruciais para goleiros
  } else {
    const goalContribution = (goals + assists * 0.6) / matchesPlayed;

    // Diferentes pesos por posiÃ§Ã£o
    const positionMultiplier = getPositionMultiplier(position);
    rating = goalContribution * positionMultiplier;
  }

  // Modificador de overall
  const ovrModifier = (stats.overall - 70) / 100;
  rating *= 1 + ovrModifier;

  // Modificador de forma
  rating *= 1 + player.form / 10;

  return clamp(rating, 0, 1.0);
};

/**
 * Calcula rating mÃ©dio da temporada a partir de ratings individuais de jogos
 * Converte escala 1-10 para 0-1 normalizada
 */
export const calculateAverageMatchRating = (matchRatings: number[]): number => {
  if (matchRatings.length === 0) return 0;

  const avgRating =
    matchRatings.reduce((sum, rating) => sum + rating, 0) / matchRatings.length;

  // Converte de escala 1-10 para 0-1
  // Rating 6.0 = baseline (0.0)
  // Rating 10.0 = excelente (1.0)
  const normalized = (avgRating - 6.0) / 4.0;

  return clamp(normalized, 0, 1.0);
};

// ==================== CONVERSÃƒâ€¢ES E EXIBIÃƒâ€¡ÃƒÆ’O ====================

/**
 * Converte rating normalizado (0-1) para escala de exibiÃ§Ã£o (1-10)
 */
export const normalizedToDisplay = (normalizedRating: number): number => {
  // 0.0 -> 1.0
  // 1.0 -> 10.0
  return clamp(1.0 + normalizedRating * 9.0, 1.0, 10.0);
};

/**
 * Converte rating de exibiÃ§Ã£o (1-10) para normalizado (0-1)
 */
export const displayToNormalized = (displayRating: number): number => {
  // 1.0 -> 0.0
  // 10.0 -> 1.0
  return clamp((displayRating - 1.0) / 9.0, 0, 1.0);
};

/**
 * Calcula rating mÃ©dio de competiÃ§Ãµes ponderado por jogos
 */
export const calculateWeightedCompetitionRating = (
  competitions: Array<{ rating: number; matchesPlayed: number }>,
): number => {
  const totalMatches = competitions.reduce(
    (sum, comp) => sum + comp.matchesPlayed,
    0,
  );

  if (totalMatches === 0) return 6.0; // Rating padrÃ£o

  const weightedSum = competitions.reduce(
    (sum, comp) => sum + comp.rating * comp.matchesPlayed,
    0,
  );

  return clamp(weightedSum / totalMatches, 1.0, 10.0);
};

// ==================== HELPERS ====================

/**
 * Retorna multiplicador de rating baseado na posiÃ§Ã£o
 */
const getPositionMultiplier = (position: PositionDetail): number => {
  const multipliers: Record<string, number> = {
    ST: 1.8,
    CF: 1.8,
    LW: 1.6,
    RW: 1.6,
    CAM: 1.4,
    CM: 1.4,
    LM: 1.3,
    RM: 1.3,
    CDM: 1.1,
    LB: 0.8,
    RB: 0.8,
    LWB: 0.8,
    RWB: 0.8,
    CB: 0.8,
    GK: 0, // Goleiros usam lÃ³gica especÃ­fica
  };

  return multipliers[position] || 1.0;
};

/**
 * Retorna cor para exibiÃ§Ã£o baseada no rating (1-10)
 */
export const getRatingColor = (rating: number): string => {
  if (rating >= 8.0) return "text-green-400";
  if (rating >= 7.5) return "text-emerald-400";
  if (rating >= 7.0) return "text-yellow-400";
  if (rating >= 6.5) return "text-orange-400";
  return "text-red-400";
};

/**
 * Retorna descriÃ§Ã£o textual do rating
 */
export const getRatingDescription = (rating: number): string => {
  if (rating >= 9.0) return "World Class";
  if (rating >= 8.5) return "Excellent";
  if (rating >= 8.0) return "Great";
  if (rating >= 7.5) return "Good";
  if (rating >= 7.0) return "Decent";
  if (rating >= 6.5) return "Average";
  if (rating >= 6.0) return "Below Average";
  return "Poor";
};
