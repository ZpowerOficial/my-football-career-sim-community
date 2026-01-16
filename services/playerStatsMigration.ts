/**
 * PLAYER STATS MIGRATION - v0.5.2
 * 
 * Migra jogadores de versões anteriores para garantir que:
 * 1. Atributos derivados (finishing, shotPower, heading, etc.) estejam corretos
 * 2. expandedData seja regenerado se necessário
 * 3. Os dados "nerd" conversem com os atributos base
 */

import type { Player, PlayerStats } from '../types';
import { generateExpandedPlayerData } from './expandedPlayerGeneration';
import { clamp } from './utils';

/**
 * Verifica se um jogador precisa de migração de stats
 */
function needsStatsMigration(player: Player): boolean {
  const stats = player.stats;
  
  // Se finishing é 0 ou undefined mas shooting > 0, precisa migração
  if ((stats.finishing === 0 || stats.finishing === undefined) && stats.shooting > 0) {
    return true;
  }
  
  // Se shotPower é 0 ou undefined
  if (stats.shotPower === 0 || stats.shotPower === undefined) {
    return true;
  }
  
  // Se heading é 0 ou undefined
  if (stats.heading === 0 || stats.heading === undefined) {
    return true;
  }
  
  // Se ballControl é 0 ou undefined mas dribbling > 0
  if ((stats.ballControl === 0 || stats.ballControl === undefined) && stats.dribbling > 0) {
    return true;
  }
  
  // Se sprintSpeed/acceleration são 0 mas pace > 0
  if ((stats.sprintSpeed === 0 || stats.sprintSpeed === undefined) && stats.pace > 0) {
    return true;
  }
  
  return false;
}

/**
 * Verifica se expandedData precisa ser regenerado
 * Compara os valores ultra-detalhados com os stats base para detectar inconsistências
 */
function needsExpandedDataRegeneration(player: Player): boolean {
  // Se não tem expandedData, precisa gerar
  if (!player.expandedData) {
    return true;
  }
  
  const tech = player.expandedData.technicalAttributes;
  if (!tech?.finishing) {
    return true;
  }
  
  const stats = player.stats;
  // IMPORTANTE: A UI mostra "shooting" como "Finalização"
  // Os dados "nerd" devem ser baseados em shooting, não em finishing derivado
  const shooting = stats.shooting ?? 50;
  const dribbling = stats.dribbling ?? 50;
  const passing = stats.passing ?? 50;
  const pace = stats.pace ?? 50;
  
  // Tolerância: os valores nerd devem estar dentro de ±15 do valor base
  // Se a diferença for maior, os dados estão desatualizados
  const tolerance = 15;
  
  // Verificar Finalização (compara com SHOOTING que é o atributo base mostrado na UI)
  const finishingInsideBox = tech.finishing.finishingInsideBox;
  if (Math.abs(finishingInsideBox - shooting) > tolerance) {
    console.log(`[Migration] finishingInsideBox (${finishingInsideBox}) muito diferente de shooting (${shooting})`);
    return true;
  }
  
  // Verificar Dribbling
  const closeControl = tech.dribbling?.closeControlDribbling ?? 0;
  if (Math.abs(closeControl - dribbling) > tolerance) {
    console.log(`[Migration] closeControlDribbling (${closeControl}) muito diferente de dribbling (${dribbling})`);
    return true;
  }
  
  // Verificar Passing
  const shortPassing = tech.passing?.shortPassingSupport ?? 0;
  if (Math.abs(shortPassing - passing) > tolerance) {
    console.log(`[Migration] shortPassingSupport (${shortPassing}) muito diferente de passing (${passing})`);
    return true;
  }
  
  // Verificar Physicals
  const phys = player.expandedData.physicalAttributes;
  if (phys?.speed) {
    const topSpeed = phys.speed.topSpeed ?? 0;
    if (Math.abs(topSpeed - pace) > tolerance) {
      console.log(`[Migration] topSpeed (${topSpeed}) muito diferente de pace (${pace})`);
      return true;
    }
  }
  
  return false;
}

/**
 * Deriva atributos secundários dos stats base
 */
function deriveMissingStats(stats: PlayerStats): PlayerStats {
  const newStats = { ...stats };
  
  // Finishing = shooting + pequena variação
  if (newStats.finishing === 0 || newStats.finishing === undefined) {
    const shooting = newStats.shooting ?? 50;
    newStats.finishing = clamp(Math.round(shooting + (Math.random() * 6 - 3)), 20, 99);
  }
  
  // Shot Power = média de physical e shooting
  if (newStats.shotPower === 0 || newStats.shotPower === undefined) {
    const physical = newStats.physical ?? 50;
    const shooting = newStats.shooting ?? 50;
    newStats.shotPower = clamp(Math.round((physical * 0.5 + shooting * 0.5) + (Math.random() * 10 - 5)), 20, 99);
  }
  
  // Heading = combinação de jumping, strength, physical
  if (newStats.heading === 0 || newStats.heading === undefined) {
    const jumping = newStats.jumping ?? 50;
    const strength = newStats.strength ?? 50;
    const physical = newStats.physical ?? 50;
    newStats.heading = clamp(Math.round((jumping * 0.5 + strength * 0.3 + physical * 0.2) + (Math.random() * 10 - 5)), 20, 99);
  }
  
  // Ball Control = baseado em dribbling
  if (newStats.ballControl === 0 || newStats.ballControl === undefined) {
    const dribbling = newStats.dribbling ?? 50;
    newStats.ballControl = clamp(Math.round(dribbling + (Math.random() * 6 - 3)), 20, 99);
  }
  
  // Sprint Speed = baseado em pace
  if (newStats.sprintSpeed === 0 || newStats.sprintSpeed === undefined) {
    const pace = newStats.pace ?? 50;
    newStats.sprintSpeed = clamp(Math.round(pace + (Math.random() * 10 - 5)), 20, 99);
  }
  
  // Acceleration = baseado em pace (geralmente um pouco diferente)
  if (newStats.acceleration === 0 || newStats.acceleration === undefined) {
    const pace = newStats.pace ?? 50;
    newStats.acceleration = clamp(Math.round(pace + (Math.random() * 6 - 3)), 20, 99);
  }
  
  // Balance = baseado em agility e physical
  if (newStats.balance === 0 || newStats.balance === undefined) {
    const agility = newStats.agility ?? 50;
    const physical = newStats.physical ?? 50;
    newStats.balance = clamp(Math.round((agility * 0.6 + physical * 0.4) + (Math.random() * 10 - 5)), 20, 99);
  }
  
  return newStats;
}

/**
 * Migra um jogador para garantir que todos os stats derivados e expandedData estejam corretos
 * SEMPRE regenera expandedData se detectar inconsistências
 */
export function migratePlayerStats(player: Player): Player {
  let migratedPlayer = { ...player };
  let forceRegeneration = false;
  
  // 1. Migrar stats base se necessário
  if (needsStatsMigration(player)) {
    migratedPlayer.stats = deriveMissingStats(player.stats);
    forceRegeneration = true;
    console.log(`[Migration] Migrated derived stats for player: ${player.name}`);
  }
  
  // 2. Regenerar expandedData se necessário ou se stats foram migrados
  if (forceRegeneration || needsExpandedDataRegeneration(migratedPlayer)) {
    console.log(`[Migration] Regenerating expandedData for player: ${player.name}`);
    
    // Preserve accumulated career stats before regenerating
    const oldExpandedData = migratedPlayer.expandedData;
    const preservedAttackingStats = oldExpandedData?.attackingStats;
    const preservedCreationStats = oldExpandedData?.creationStats;
    const preservedDuelStats = oldExpandedData?.duelStats;
    const preservedDefensiveStats = oldExpandedData?.defensiveStats;
    const preservedDisciplineStats = oldExpandedData?.disciplineStats;
    const preservedMatchPhysicalStats = oldExpandedData?.matchPhysicalStats;
    const preservedFlairPlaysStats = oldExpandedData?.flairPlaysStats;
    
    // Generate fresh structure (attributes)
    migratedPlayer.expandedData = generateExpandedPlayerData(migratedPlayer);
    
    // Restore preserved accumulated stats
    if (preservedAttackingStats) {
      migratedPlayer.expandedData.attackingStats = preservedAttackingStats;
    }
    if (preservedCreationStats) {
      migratedPlayer.expandedData.creationStats = preservedCreationStats;
    }
    if (preservedDuelStats) {
      migratedPlayer.expandedData.duelStats = preservedDuelStats;
    }
    if (preservedDefensiveStats) {
      migratedPlayer.expandedData.defensiveStats = preservedDefensiveStats;
    }
    if (preservedDisciplineStats) {
      migratedPlayer.expandedData.disciplineStats = preservedDisciplineStats;
    }
    if (preservedMatchPhysicalStats) {
      migratedPlayer.expandedData.matchPhysicalStats = preservedMatchPhysicalStats;
    }
    if (preservedFlairPlaysStats) {
      migratedPlayer.expandedData.flairPlaysStats = preservedFlairPlaysStats;
    }
  }
  
  return migratedPlayer;
}

/**
 * Verifica se o jogador precisa de migração
 */
export function playerNeedsMigration(player: Player): boolean {
  return needsStatsMigration(player) || needsExpandedDataRegeneration(player);
}
