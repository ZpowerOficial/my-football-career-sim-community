
import { Player } from '../../types';
import { gaussianRandom, clamp } from '../utils';
import { BalancedGameConstants } from './constants';

export class CleanSheetCalculator {
  static calculateCleanSheets(player: Player, matchesPlayed: number): number {
    if (player.position !== 'GK' || matchesPlayed === 0) return 0;

    const keeperAbility = (
      (player.stats.reflexes || 70) * 0.35 +
      (player.stats.diving || 70) * 0.25 +
      (player.stats.handling || 70) * 0.20 +
      (player.stats.positioning || 70) * 0.20
    ) / 100;

    const baseRate = 0.28;
    const adjustedRate = baseRate + (keeperAbility - 0.70) * 0.45;
    const teamDefenseBonus = (player.team.reputation - 72) / 180;
    let finalRate = clamp(adjustedRate + teamDefenseBonus, 0.12, 0.55);
    finalRate *= BalancedGameConstants.calculateOverallFactor(player.stats.overall);

    let cleanSheets = 0;
    for (let i = 0; i < matchesPlayed; i++) {
      const gameRate = clamp(finalRate + gaussianRandom(0, 0.09), 0, 1);
      if (Math.random() < gameRate) cleanSheets++;
    }

    return Math.max(0, Math.min(cleanSheets, matchesPlayed));
  }
}
