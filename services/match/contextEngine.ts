
import { Team, Tactic } from '../../types';
import { gaussianRandom, rand, clamp } from '../utils';
import { MatchContext } from './types';

export class MatchContextEngine {

  static generateContext(playerTeam: Team, minute: number = 0): MatchContext {
    const oppositionQuality = this.calculateOppositionQuality(playerTeam);
    const oppositionTactic = this.selectOppositionTactic(oppositionQuality);
    const homeAdvantage = Math.random() < 0.5;
    const matchImportance = this.determineMatchImportance();
    const weatherConditions = this.determineWeather();
    const fatigue = this.calculateFatigue(minute);
    const teamMomentum = gaussianRandom(0, 10);

    return {
      oppositionQuality,
      oppositionTactic,
      homeAdvantage,
      matchImportance,
      weatherConditions,
      matchMinute: minute,
      fatigue,
      teamMomentum
    };
  }

  private static calculateOppositionQuality(team: Team): number {
    const tierModifiers = {
      1: { mean: 0, spread: 8 },
      2: { mean: -5, spread: 7 },
      3: { mean: -10, spread: 6 },
      4: { mean: -15, spread: 5 },
      5: { mean: -20, spread: 4 }
    };

    const modifier = tierModifiers[team.leagueTier as keyof typeof tierModifiers] || tierModifiers[3];
    const oppositionBase = team.reputation + modifier.mean;
    const opposition = gaussianRandom(oppositionBase, modifier.spread);

    return clamp(opposition, 55, 92);
  }

  private static selectOppositionTactic(quality: number): Tactic {
    if (quality >= 85) {
      const tactics: Tactic[] = ['Attacking', 'Possession', 'Balanced'];
      return tactics[rand(0, 2)];
    } else if (quality >= 75) {
      const tactics: Tactic[] = ['Balanced', 'Attacking', 'Counter'];
      return tactics[rand(0, 2)];
    } else {
      const tactics: Tactic[] = ['Defensive', 'Counter', 'Balanced'];
      return tactics[rand(0, 2)];
    }
  }

  private static determineMatchImportance(): MatchContext['matchImportance'] {
    const roll = Math.random();
    if (roll < 0.02) return 'Derby';
    if (roll < 0.15) return 'Continental';
    if (roll < 0.25) return 'Cup';
    if (roll < 0.85) return 'League';
    return 'Friendly';
  }

  private static determineWeather(): MatchContext['weatherConditions'] {
    const roll = Math.random();
    if (roll < 0.70) return 'Perfect';
    if (roll < 0.85) return 'Rainy';
    if (roll < 0.95) return 'Windy';
    return 'Cold';
  }

  private static calculateFatigue(minute: number): number {
    if (minute < 30) return 0;
    if (minute < 60) return (minute - 30) * 0.4;
    if (minute < 75) return 12 + (minute - 60) * 1.2;
    return 30 + (minute - 75) * 2.0;
  }
}
