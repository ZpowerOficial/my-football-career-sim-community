import { Player, PlayerStats } from '../types';
import { rand, clamp } from './utils';
import { calculateOverall } from './playerProgression';

/**
 * Corrige goleiros criados antes da implementação dos atributos GK
 * Se handling, reflexes e diving estão undefined ou 0, gera valores baseados no overall atual
 */
export const fixGoalkeeperStats = (player: Player): Player => {
  if (player.position !== 'GK') return player;

  const needsFix =
    !player.stats.handling || player.stats.handling === 0 ||
    !player.stats.reflexes || player.stats.reflexes === 0 ||
    !player.stats.diving || player.stats.diving === 0;

  if (!needsFix) return player;

  console.log('ðŸ”§ Corrigindo atributos de goleiro para:', player.name);

  // Usar o overall atual como base para gerar atributos realistas
  const overall = player.stats.overall;
  const baseValue = overall - rand(3, 8); // Atributos principais próximos ao overall

  // Gerar atributos de goleiro baseados no overall
  const updatedStats: PlayerStats = {
    ...player.stats,
    handling: player.stats.handling || clamp(baseValue + rand(-5, 5), 40, 95),
    reflexes: player.stats.reflexes || clamp(baseValue + rand(-3, 7), 45, 95), // Reflexes geralmente melhor
    diving: player.stats.diving || clamp(baseValue + rand(-5, 5), 40, 95),
  };

  // Recalcular overall com os novos atributos - Task 1: Pass expandedData
  const newOverall = calculateOverall(updatedStats, player.position, player.expandedData);
  updatedStats.overall = newOverall;

  console.log('âœ… Atributos corrigidos:', {
    handling: updatedStats.handling,
    reflexes: updatedStats.reflexes,
    diving: updatedStats.diving,
    overall: `${player.stats.overall} â†’ ${newOverall}`
  });

  return {
    ...player,
    stats: updatedStats
  };
};

/**
 * Corrige clean sheets históricos que estão zerados
 * Estima clean sheets baseado em partidas jogadas e overall do goleiro
 */
export const fixHistoricalCleanSheets = (player: Player): Player => {
  if (player.position !== 'GK') return player;

  const totalMatches = player.totalMatches;
  if (totalMatches === 0 || player.totalCleanSheets > 0) return player;

  // Estimar clean sheets baseado em habilidade e partidas jogadas
  const keeperAbility = (
    (player.stats.reflexes || 70) * 0.35 +
    (player.stats.diving || 70) * 0.25 +
    (player.stats.handling || 70) * 0.20 +
    (player.stats.positioning || 70) * 0.20
  ) / 100;

  const baseCleanSheetRate = 0.28; // ~28% base
  const adjustedRate = baseCleanSheetRate + (keeperAbility - 0.70) * 0.45;
  const teamBonus = (player.team.reputation - 72) / 180;
  const cleanSheetRate = clamp(adjustedRate + teamBonus, 0.15, 0.50);

  const estimatedCleanSheets = Math.round(totalMatches * cleanSheetRate);

  console.log('ðŸ”§ Corrigindo clean sheets históricos para:', player.name);
  console.log(`ðŸ“Š ${totalMatches} partidas â†’ ~${estimatedCleanSheets} clean sheets (${(cleanSheetRate * 100).toFixed(1)}% taxa)`);

  return {
    ...player,
    totalCleanSheets: estimatedCleanSheets
  };
};

/**
 * Função principal para corrigir todos os problemas de goleiros legados
 */
export const migrateGoalkeeper = (player: Player): Player => {
  if (player.position !== 'GK') return player;

  let migratedPlayer = player;

  // Primeiro corrige os atributos
  migratedPlayer = fixGoalkeeperStats(migratedPlayer);

  // Depois corrige os clean sheets históricos
  migratedPlayer = fixHistoricalCleanSheets(migratedPlayer);

  return migratedPlayer;
};
