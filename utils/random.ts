/**
 * Sistema de RandomizaÃ§Ã£o Centralizado
 * Fornece funÃ§Ãµes probabilÃ­sticas consistentes para todo o jogo
 */

// ==================== FUNÃ‡Ã•ES BÃSICAS ====================

/**
 * Random integer entre min e max (inclusivo)
 */
export const rand = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Random float entre min e max
 */
export const randFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Clamp value entre min e max
 * Protege contra NaN retornando o valor médio como fallback
 */
export const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return Math.round((min + max) / 2);
  }
  return Math.max(min, Math.min(value, max));
};

/**
 * Chance percentual (0-100)
 */
export const chance = (percentage: number): boolean => {
  return Math.random() * 100 < percentage;
};

/**
 * Escolher item aleatÃ³rio de array
 */
export const randomPick = <T>(array: T[]): T => {
  return array[rand(0, array.length - 1)];
};

/**
 * Escolher item com pesos
 */
export const weightedPick = <T>(items: T[], weights: number[]): T => {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }

  return items[items.length - 1];
};

// ==================== DISTRIBUIÃ‡Ã•ES PROBABILÃSTICAS ====================

/**
 * DistribuiÃ§Ã£o Normal (Gaussiana) usando Box-Muller transform
 * @param mean MÃ©dia da distribuiÃ§Ã£o
 * @param stdDev Desvio padrÃ£o
 */
export const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};

/**
 * DistribuiÃ§Ã£o Normal limitada entre min e max
 */
export const gaussianRandomClamped = (
  mean: number,
  stdDev: number,
  min: number,
  max: number
): number => {
  let value = gaussianRandom(mean, stdDev);
  let attempts = 0;

  // Retry atÃ© conseguir valor no range (max 10 tentativas)
  while ((value < min || value > max) && attempts < 10) {
    value = gaussianRandom(mean, stdDev);
    attempts++;
  }

  return clamp(value, min, max);
};

/**
 * Amostragem bivariada com correlaÃ§Ã£o
 * Ãštil para gerar valores correlacionados (ex: overall e marketValue)
 */
export const bivariateSample = (
  mean1: number,
  mean2: number,
  stdDev1: number,
  stdDev2: number,
  correlation: number
): [number, number] => {
  const z1 = gaussianRandom(0, 1);
  const z2 = gaussianRandom(0, 1);

  const x = mean1 + stdDev1 * z1;
  const y = mean2 + stdDev2 * (correlation * z1 + Math.sqrt(1 - correlation ** 2) * z2);

  return [x, y];
};

/**
 * Sistema de incerteza em camadas
 * Adiciona variabilidade realista com eventos raros (outliers)
 */
export const uncertaintyLayer = (
  baseValue: number,
  uncertainty: number = 0.2
): number => {
  // Incerteza base com variaÃ§Ã£o
  const actualUncertainty = Math.abs(gaussianRandom(uncertainty, uncertainty * 0.3));
  let value = baseValue;

  // Primeira camada: variaÃ§Ã£o normal
  value *= 1 + gaussianRandom(0, actualUncertainty);

  // Segunda camada: 15% chance de variaÃ§Ã£o extra
  if (chance(15)) {
    value *= 1 + gaussianRandom(0, actualUncertainty * 1.5);
  }

  // Terceira camada: 2% chance de outlier (muito alto ou muito baixo)
  if (chance(2)) {
    value *= Math.random() < 0.5
      ? randFloat(1.5, 2.5)  // Outlier positivo
      : randFloat(0.3, 0.6); // Outlier negativo
  }

  return value;
};

// ==================== FUNÃ‡Ã•ES ESPECÃFICAS DO JOGO ====================

/**
 * DistribuiÃ§Ã£o triangular (comum em RPGs)
 * Ãštil para rolls de atributos com "sweet spot"
 */
export const triangularRandom = (min: number, max: number, mode: number): number => {
  const u = Math.random();
  const f = (mode - min) / (max - min);

  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
};

/**
 * Roll com advantage (rola 2x, pega o maior)
 * Inspirado em D&D
 */
export const rollWithAdvantage = (min: number, max: number): number => {
  const roll1 = rand(min, max);
  const roll2 = rand(min, max);
  return Math.max(roll1, roll2);
};

/**
 * Roll com disadvantage (rola 2x, pega o menor)
 */
export const rollWithDisadvantage = (min: number, max: number): number => {
  const roll1 = rand(min, max);
  const roll2 = rand(min, max);
  return Math.min(roll1, roll2);
};

/**
 * DistribuiÃ§Ã£o exponencial (para eventos raros)
 * Ãštil para lesÃµes graves, eventos especiais, etc.
 */
export const exponentialRandom = (lambda: number): number => {
  return -Math.log(1 - Math.random()) / lambda;
};

/**
 * Shuffle array (Fisher-Yates)
 */
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Sample N items sem repetiÃ§Ã£o
 */
export const sampleN = <T>(array: T[], n: number): T[] => {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(n, array.length));
};

// ==================== HELPERS DE PROBABILIDADE ====================

/**
 * Converte odds (1.5, 2.0, etc) para probabilidade
 */
export const oddsToProb = (odds: number): number => {
  return 1 / odds;
};

/**
 * Converte probabilidade (0-1) para odds
 */
export const probToOdds = (prob: number): number => {
  return 1 / Math.max(prob, 0.01); // Evita divisÃ£o por 0
};

/**
 * Calcula probabilidade combinada (eventos independentes)
 */
export const combinedProbability = (...probs: number[]): number => {
  return probs.reduce((acc, p) => acc * (1 - p), 1);
};

/**
 * Poisson distribution (Ãºtil para gols, eventos raros)
 */
export const poissonRandom = (lambda: number): number => {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
};
