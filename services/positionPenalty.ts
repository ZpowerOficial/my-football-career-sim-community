/**
 * Sistema de Penalidade por Posição
 * v0.5.2 - Aplica penalidades quando jogador atua fora de sua posição natural
 */

import { Player, PositionDetail } from "../types";
import { clamp } from "./utils";

/**
 * Verifica proficiência do jogador em uma posição
 * Retorna valor entre 0-100
 */
export const getPositionProficiency = (
  player: Player,
  position: PositionDetail,
): number => {
  // Posição principal = 100%
  if (player.position === position) {
    return 100;
  }

  // Verificar posições secundárias
  const secondaryPositions =
    player.expandedData?.physicalProfile?.secondaryPositions || [];
  const secondaryMatch = secondaryPositions.find(
    (sp) => sp.position === position,
  );

  if (secondaryMatch) {
    return secondaryMatch.proficiency;
  }

  // Posições completamente diferentes
  // Uso de lógica de "proximidade" de posição
  const proximityMap: Record<PositionDetail, PositionDetail[]> = {
    ST: ["CF"],
    CF: ["ST", "CAM"],
    LW: ["LM", "RW"],
    RW: ["RM", "LW"],
    CAM: ["CM", "CF"],
    CM: ["CAM", "CDM", "LM", "RM"],
    LM: ["LW", "CM"],
    RM: ["RW", "CM"],
    CDM: ["CM", "CB"],
    LWB: ["LB", "LM"],
    RWB: ["RB", "RM"],
    LB: ["LWB", "CB"],
    RB: ["RWB", "CB"],
    CB: ["CDM", "LB", "RB"],
    GK: [], // Goleiro não joga em nenhuma outra posição
  };

  const nearbyPositions = proximityMap[player.position] || [];
  if (nearbyPositions.includes(position)) {
    // Posição próxima mas não secundária = 50-65%
    return 50 + Math.random() * 15;
  }

  // Posição completamente diferente = 25-40%
  return 25 + Math.random() * 15;
};

/**
 * Calcula modificador de rating baseado na posição jogada
 * Retorna multiplicador (0.75 a 1.0)
 */
export const getPositionPenaltyModifier = (
  player: Player,
  playedPosition: PositionDetail,
): number => {
  const proficiency = getPositionProficiency(player, playedPosition);

  // 100% proficiência = 1.0 (sem penalidade)
  // 50% proficiência = 0.9 (10% penalidade)
  // 25% proficiência = 0.75 (25% penalidade)
  const modifier = 0.75 + (proficiency / 100) * 0.25;

  return clamp(modifier, 0.75, 1.0);
};

/**
 * Calcula penalidade para estatísticas de partida
 */
export const applyPositionPenalty = (
  originalRating: number,
  player: Player,
  playedPosition: PositionDetail,
): number => {
  const modifier = getPositionPenaltyModifier(player, playedPosition);
  return originalRating * modifier;
};

/**
 * Atualiza proficiência de posição secundária baseado em tempo jogado
 * Deve ser chamado ao final de cada temporada
 */
export const updateSecondaryPositionProficiency = (
  player: Player,
  playedPosition: PositionDetail,
  matchesInPosition: number,
): Player => {
  // Se jogou na posição principal, não há nada para fazer
  if (player.position === playedPosition) {
    return player;
  }

  if (!player.expandedData?.physicalProfile?.secondaryPositions) {
    return player;
  }

  const secondaryPositions = [
    ...player.expandedData.physicalProfile.secondaryPositions,
  ];
  const existingIndex = secondaryPositions.findIndex(
    (sp) => sp.position === playedPosition,
  );

  // Ganho de proficiência: +0.5 por partida, máx 10 por temporada
  const proficiencyGain = Math.min(matchesInPosition * 0.5, 10);

  if (existingIndex >= 0) {
    // Aumenta proficiência existente
    secondaryPositions[existingIndex] = {
      ...secondaryPositions[existingIndex],
      proficiency: clamp(
        secondaryPositions[existingIndex].proficiency + proficiencyGain,
        0,
        95, // Máximo 95% (nunca será 100% como posição principal)
      ),
    };
  } else {
    // Adiciona como nova posição secundária
    secondaryPositions.push({
      position: playedPosition,
      proficiency: clamp(30 + proficiencyGain, 0, 95),
      isNatural: false,
    });
  }

  return {
    ...player,
    expandedData: {
      ...player.expandedData,
      physicalProfile: {
        ...player.expandedData.physicalProfile,
        secondaryPositions,
      },
    },
  };
};
