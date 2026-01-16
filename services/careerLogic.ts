import { Player, CareerLog } from '../types';

export const calculateCareerScore = (player: Player, history: CareerLog[]): number => {
  let score = 0;
  // OVR and Potential
  score += player.stats.overall * 50;
  score += player.potential * 20;
  // Stats
  score += player.totalGoals * 15;
  score += player.totalAssists * 10;
  score += player.totalMatches * 2;
  // Trophies (weighted)
  score += player.trophies.worldCup * 5000;
  score += player.trophies.continentalCup * 3000;
  score += player.trophies.championsLeague * 2500;
  score += player.trophies.libertadores * 2000;
  score += player.trophies.league * 1000;
  score += player.trophies.cup * 400;
  // Awards (weighted)
  score += player.awards.worldPlayerAward * 6000;
  score += player.awards.topScorerAward * 800;
  score += player.awards.bestGoalkeeperAward * 800;
  score += player.awards.youngPlayerAward * 1500;
  // Reputation and Value
  score += player.reputation * 10;
  score += player.marketValue * 5;
  // Longevity
  score += (player.age - 14) * 50;
  return Math.round(score);
};