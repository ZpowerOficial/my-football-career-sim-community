import { Morale } from '../types';

export const rand = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
export const clamp = (value: number, min: number, max: number): number => {
  // Protege contra NaN - retorna o valor médio entre min e max como fallback
  if (!Number.isFinite(value)) {
    return Math.round((min + max) / 2);
  }
  return Math.max(min, Math.min(value, max));
};
export const randFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

export const MORALE_LEVELS: Morale[] = ['Very Low', 'Low', 'Normal', 'High', 'Very High'];

export const updateMorale = (currentMorale: Morale, direction: 'up' | 'down', steps: number = 1): Morale => {
  const currentIndex = MORALE_LEVELS.indexOf(currentMorale);
  const change = direction === 'up' ? steps : -steps;
  const newIndex = clamp(currentIndex + change, 0, MORALE_LEVELS.length - 1);
  return MORALE_LEVELS[newIndex];
};

/**
 * Generates a random number following a Gaussian (normal) distribution
 * @param mean The mean value
 * @param stdDev The standard deviation
 * @returns A random number following normal distribution
 */
export const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  // Box-Muller transformation
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z0 * stdDev + mean;
};

/**
 * Generates a random number following a Poisson distribution
 * @param lambda The rate parameter (mean)
 * @returns A random integer following Poisson distribution
 */
export const poissonRandom = (lambda: number): number => {
  if (lambda <= 0) return 0;

  // For large lambda, use normal approximation for better performance
  if (lambda >= 30) {
    return Math.round(gaussianRandom(lambda, Math.sqrt(lambda)));
  }

  // Knuth's algorithm for smaller lambda values
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
};

/**
 * Garante que um valor numérico é finito, retornando fallback se for NaN/undefined/Infinity
 * @param value O valor a ser verificado
 * @param fallback O valor a retornar se for inválido (padrão: 50)
 * @returns O valor original se válido, ou o fallback
 */
export const safeNum = (value: number | undefined | null, fallback: number = 50): number => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
};
