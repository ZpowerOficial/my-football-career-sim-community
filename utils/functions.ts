// Utility functions for the football career simulator

/**
 * Calculates the star rating for a club based on its reputation.
 * Stars range from 0.5 to 5, rounded to half-stars.
 * 
 * Smooth interpolation with adjusted top tier:
 * - 95+ = 5⭐ (Elite: Real Madrid, Barcelona, Bayern, Man City)
 * - 88-94 = 4.5⭐ (Top: Arsenal, Liverpool, PSG, Inter, Atlético)
 * - 82-87 = 4⭐ (Strong: Dortmund, Tottenham, Milan, Juventus)
 * - 77-81 = 3.5⭐ (Upper mid: Newcastle, Sevilla, Roma)
 * - 72-76 = 3⭐ (Mid: West Ham, Valencia, Santos rebaixado)
 * - 67-71 = 2.5⭐ (Lower mid: Sunderland, grandes rebaixados)
 * - 62-66 = 2⭐ (Championship forte, 2ª div média)
 * - 55-61 = 1.5⭐ (2ª div fraca, 3ª div forte)
 * - 48-54 = 1⭐ (3ª/4ª div)
 * - <48 = 0.5⭐ (4ª div e abaixo)
 */
export function getClubStars(reputation: number): number {
  // Top tier gets 5 stars
  if (reputation >= 95) return 5;
  
  // Smooth interpolation for the rest: 40 rep = 0.5⭐, 95 rep = 4.5⭐
  const minRep = 40;
  const maxRep = 95;
  const minStars = 0.5;
  const maxStars = 4.5;
  
  // Clamp reputation to valid range
  const clampedRep = Math.max(minRep, Math.min(maxRep, reputation));
  
  // Linear interpolation
  const rawStars = minStars + ((clampedRep - minRep) / (maxRep - minRep)) * (maxStars - minStars);
  
  // Round to nearest half-star
  return Math.round(rawStars * 2) / 2;
}