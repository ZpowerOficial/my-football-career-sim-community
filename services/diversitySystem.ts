/**
 * Sistema de Jornada - Rastreia carreiras do jogador
 * por posição, continente e modalidade
 */

import type { PositionDetail, Continent } from '../types';

// Tipos
export interface DiversityStats {
  // Carreiras por continente
  continents: {
    [key in Continent]?: number;
  };
  // Carreiras por categoria de posição (para compatibilidade)
  positions: {
    attacker: number;
    midfielder: number;
    defender: number;
    goalkeeper: number;
  };
  // Carreiras por posição específica
  positionsPlayed?: {
    [key in PositionDetail]?: number;
  };
  // Carreiras por gênero/modalidade
  genders: {
    male: number;
    female: number;
  };
  // Última combinação jogada
  lastPlayed?: {
    position: PositionDetail;
    continent: Continent;
    gender: 'male' | 'female';
  };
  // Total de carreiras iniciadas
  totalCareers: number;
  // Carreiras completadas (aposentadoria)
  careersCompleted?: number;
  // Desafios completados
  challengesCompleted?: number;
}

export interface DailyChallenge {
  position: PositionDetail;
  continent: Continent;
  gender: 'male' | 'female';
  bonusXP: number;
  expiresAt: number; // timestamp
  completed?: boolean; // se o desafio foi completado
}

export interface DiversitySuggestion {
  position: PositionDetail;
  continent: Continent;
  gender: 'male' | 'female';
  reason: string;
  bonusMultiplier: number;
}

// Constantes
const STORAGE_KEY = 'fcs_diversity_stats';
const DAILY_CHALLENGE_KEY = 'fcs_daily_challenge';

const POSITION_CATEGORIES: { [key in PositionDetail]: keyof DiversityStats['positions'] } = {
  ST: 'attacker', CF: 'attacker', LW: 'attacker', RW: 'attacker',
  CAM: 'midfielder', CM: 'midfielder', LM: 'midfielder', RM: 'midfielder', CDM: 'midfielder',
  CB: 'defender', LB: 'defender', RB: 'defender', LWB: 'defender', RWB: 'defender',
  GK: 'goalkeeper'
};

const ALL_CONTINENTS: Continent[] = ['Europe', 'South America', 'Asia', 'North America', 'Africa', 'Australia'];
const ALL_POSITIONS: PositionDetail[] = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'GK'];
const SAMPLE_POSITIONS: { [key: string]: PositionDetail[] } = {
  attacker: ['ST', 'CF', 'LW', 'RW'],
  midfielder: ['CAM', 'CM', 'CDM'],
  defender: ['CB', 'LB', 'RB'],
  goalkeeper: ['GK']
};

// Funções de Storage
export const loadDiversityStats = (): DiversityStats => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load diversity stats:', e);
  }

  return {
    continents: {},
    positions: { attacker: 0, midfielder: 0, defender: 0, goalkeeper: 0 },
    genders: { male: 0, female: 0 },
    totalCareers: 0
  };
};

export const saveDiversityStats = (stats: DiversityStats): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save diversity stats:', e);
  }
};

// Registrar carreira completada
export const recordCompletedCareer = (
  position: PositionDetail,
  continent: Continent,
  gender: 'male' | 'female'
): DiversityStats => {
  const stats = loadDiversityStats();

  // Incrementar continente
  stats.continents[continent] = (stats.continents[continent] || 0) + 1;

  // Incrementar categoria de posição
  const posCategory = POSITION_CATEGORIES[position];
  stats.positions[posCategory]++;

  // Incrementar gênero
  stats.genders[gender]++;

  // Atualizar última jogada
  stats.lastPlayed = { position, continent, gender };

  // Incrementar total
  stats.totalCareers++;

  saveDiversityStats(stats);
  return stats;
};

// Calcular progresso de diversidade
export const calculateDiversityProgress = (): {
  continents: { explored: number; total: number; percentage: number };
  positions: { explored: number; total: number; percentage: number };
  genders: { explored: number; total: number; percentage: number };
  overall: number;
} => {
  const stats = loadDiversityStats();

  const continentsExplored = Object.keys(stats.continents).length;
  const positionsExplored = Object.values(stats.positions).filter(v => v > 0).length;
  const gendersExplored = Object.values(stats.genders).filter(v => v > 0).length;

  return {
    continents: {
      explored: continentsExplored,
      total: 6,
      percentage: Math.round((continentsExplored / 6) * 100)
    },
    positions: {
      explored: positionsExplored,
      total: 4,
      percentage: Math.round((positionsExplored / 4) * 100)
    },
    genders: {
      explored: gendersExplored,
      total: 2,
      percentage: Math.round((gendersExplored / 2) * 100)
    },
    overall: Math.round(((continentsExplored / 6) + (positionsExplored / 4) + (gendersExplored / 2)) / 3 * 100)
  };
};

// Gerar sugestão baseada no que o jogador ainda não experimentou
export const generateDiversitySuggestion = (): DiversitySuggestion => {
  const stats = loadDiversityStats();

  // Encontrar continentes não explorados
  const unexploredContinents = ALL_CONTINENTS.filter(c => !stats.continents[c]);

  // Encontrar categorias de posição menos exploradas
  const positionEntries = Object.entries(stats.positions) as [keyof DiversityStats['positions'], number][];
  positionEntries.sort((a, b) => a[1] - b[1]);
  const leastPlayedCategory = positionEntries[0][0];

  // Encontrar gênero menos jogado
  const leastPlayedGender = stats.genders.male <= stats.genders.female ? 'male' : 'female';

  // Construir sugestão
  let reason = '';
  let bonusMultiplier = 1.0;

  // Priorizar continentes não explorados
  let suggestedContinent: Continent;
  if (unexploredContinents.length > 0) {
    suggestedContinent = unexploredContinents[Math.floor(Math.random() * unexploredContinents.length)];
    reason = 'newContinent';
    bonusMultiplier += 0.15;
  } else {
    // Escolher continente menos jogado
    const continentEntries = Object.entries(stats.continents) as [Continent, number][];
    continentEntries.sort((a, b) => a[1] - b[1]);
    suggestedContinent = continentEntries[0]?.[0] || 'Europe';
  }

  // Posição da categoria menos jogada
  const positionsInCategory = SAMPLE_POSITIONS[leastPlayedCategory];
  const suggestedPosition = positionsInCategory[Math.floor(Math.random() * positionsInCategory.length)];

  if (stats.positions[leastPlayedCategory] === 0) {
    reason = reason || 'newPosition';
    bonusMultiplier += 0.10;
  }

  // Gênero
  const suggestedGender = leastPlayedGender as 'male' | 'female';
  if (stats.genders[suggestedGender] === 0) {
    reason = reason || 'newGender';
    bonusMultiplier += 0.05;
  }

  // Verificar se é diferente da última jogada
  if (stats.lastPlayed) {
    const isDifferentContinent = stats.lastPlayed.continent !== suggestedContinent;
    const isDifferentPosition = POSITION_CATEGORIES[stats.lastPlayed.position] !== leastPlayedCategory;
    const isDifferentGender = stats.lastPlayed.gender !== suggestedGender;

    if (isDifferentContinent && isDifferentPosition && isDifferentGender) {
      reason = 'completelyDifferent';
      bonusMultiplier += 0.10;
    }
  }

  if (!reason) {
    reason = 'variety';
  }

  return {
    position: suggestedPosition,
    continent: suggestedContinent,
    gender: suggestedGender,
    reason,
    bonusMultiplier
  };
};

// Gerar carreira aleatória com bônus
export const generateRandomCareer = (availableContinents?: Continent[]): {
  position: PositionDetail;
  continent: Continent;
  gender: 'male' | 'female';
  bonusMultiplier: number;
} => {
  const continents = availableContinents && availableContinents.length > 0 ? availableContinents : ALL_CONTINENTS;
  const position = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
  const continent = continents[Math.floor(Math.random() * continents.length)];
  const gender = Math.random() < 0.5 ? 'male' : 'female';

  return {
    position,
    continent,
    gender,
    bonusMultiplier: 1.25 // 25% bônus por usar aleatório
  };
};

// Sistema de Desafio Diário
export const getDailyChallenge = (): DailyChallenge | null => {
  try {
    const saved = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (saved) {
      const challenge = JSON.parse(saved) as DailyChallenge;
      // Verificar se ainda é válido
      if (challenge.expiresAt > Date.now()) {
        return challenge;
      }
    }

    // Gerar novo desafio
    return generateNewDailyChallenge();
  } catch (e) {
    console.warn('Failed to get daily challenge:', e);
    return null;
  }
};

const generateNewDailyChallenge = (): DailyChallenge => {
  const stats = loadDiversityStats();

  // Preferir combinações não exploradas
  const unexploredContinents = ALL_CONTINENTS.filter(c => !stats.continents[c]);
  const continent = unexploredContinents.length > 0
    ? unexploredContinents[Math.floor(Math.random() * unexploredContinents.length)]
    : ALL_CONTINENTS[Math.floor(Math.random() * ALL_CONTINENTS.length)];

  // Preferir categorias menos jogadas
  const positionEntries = Object.entries(stats.positions) as [keyof DiversityStats['positions'], number][];
  positionEntries.sort((a, b) => a[1] - b[1]);
  const category = positionEntries[0][0];
  const positionsInCategory = SAMPLE_POSITIONS[category];
  const position = positionsInCategory[Math.floor(Math.random() * positionsInCategory.length)];

  // Alternar gênero ou preferir menos jogado
  const gender = stats.genders.male <= stats.genders.female ? 'male' : 'female';

  // Calcular bônus baseado na "dificuldade" (quão diferente é do padrão do jogador)
  let bonusXP = 500; // Base
  if (!stats.continents[continent]) bonusXP += 300;
  if (stats.positions[category] === 0) bonusXP += 200;
  if (stats.genders[gender as 'male' | 'female'] === 0) bonusXP += 100;

  // Expira à meia-noite do próximo dia
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const challenge: DailyChallenge = {
    position,
    continent,
    gender: gender as 'male' | 'female',
    bonusXP,
    expiresAt: tomorrow.getTime()
  };

  localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(challenge));
  return challenge;
};

// Verificar se a carreira atual é o desafio diário
export const isMatchingDailyChallenge = (
  position: PositionDetail,
  continent: Continent,
  gender: 'male' | 'female'
): boolean => {
  const challenge = getDailyChallenge();
  if (!challenge) return false;

  const posCategory = POSITION_CATEGORIES[position];
  const challengeCategory = POSITION_CATEGORIES[challenge.position];

  return (
    posCategory === challengeCategory &&
    continent === challenge.continent &&
    gender === challenge.gender
  );
};

// Obter lista do que falta explorar
export const getUnexploredContent = (): {
  continents: Continent[];
  positionCategories: string[];
  genders: string[];
} => {
  const stats = loadDiversityStats();

  return {
    continents: ALL_CONTINENTS.filter(c => !stats.continents[c]),
    positionCategories: (Object.entries(stats.positions) as [string, number][])
      .filter(([_, count]) => count === 0)
      .map(([cat]) => cat),
    genders: (Object.entries(stats.genders) as [string, number][])
      .filter(([_, count]) => count === 0)
      .map(([g]) => g)
  };
};

// ===== FUNÇÕES DE INTEGRAÇÃO COM O JOGO =====

const CURRENT_CAREER_KEY = 'fcs_current_career_diversity';
const XP_BONUS_KEY = 'fcs_career_xp_bonus';

// Registrar início de uma nova carreira
export const recordCareerStart = (
  position: PositionDetail,
  continent: Continent,
  gender: 'male' | 'female'
): void => {
  try {
    // Salvar dados da carreira atual para rastrear
    const careerData = { position, continent, gender, startedAt: Date.now() };
    localStorage.setItem(CURRENT_CAREER_KEY, JSON.stringify(careerData));

    // Atualizar estatísticas
    const stats = loadDiversityStats();
    const posCategory = POSITION_CATEGORIES[position] || 'midfielder';

    // Incrementar contadores
    stats.continents[continent] = (stats.continents[continent] || 0) + 1;
    stats.positions[posCategory] = (stats.positions[posCategory] || 0) + 1;
    stats.genders[gender] = (stats.genders[gender] || 0) + 1;
    stats.totalCareers++;

    // Rastrear posição específica
    if (!stats.positionsPlayed) stats.positionsPlayed = {};
    stats.positionsPlayed[position] = (stats.positionsPlayed[position] || 0) + 1;

    // Salvar última jogada
    stats.lastPlayed = { position, continent, gender };

    saveDiversityStats(stats);

    // Verificar se desafio foi aceito
    checkChallengeAccepted(position, continent, gender);
  } catch (e) {
    console.warn('Failed to record career start:', e);
  }
};

// Verificar se o desafio diário foi aceito
const checkChallengeAccepted = (
  position: PositionDetail,
  continent: Continent,
  gender: 'male' | 'female'
): void => {
  try {
    const challenge = getDailyChallenge();
    if (challenge && !challenge.completed) {
      const positionMatch = challenge.position === position;
      const continentMatch = challenge.continent === continent;
      const genderMatch = challenge.gender === gender;

      if (positionMatch && continentMatch && genderMatch) {
        // Marcar desafio como em progresso
        localStorage.setItem('fcs_challenge_in_progress', 'true');
      }
    }
  } catch (e) {
    console.warn('Failed to check challenge:', e);
  }
};

// Aplicar bônus de XP a uma pontuação
export const applyXPBonus = (baseScore: number): number => {
  try {
    const bonusStr = localStorage.getItem(XP_BONUS_KEY);
    if (bonusStr) {
      const bonusPercent = parseFloat(bonusStr);
      if (!isNaN(bonusPercent) && bonusPercent > 0) {
        return Math.round(baseScore * (1 + bonusPercent / 100));
      }
    }
  } catch (e) {
    console.warn('Failed to apply XP bonus:', e);
  }
  return baseScore;
};

// Atualizar diversidade quando carreira termina (aposentadoria)
export const updateDiversityOnRetirement = (): void => {
  try {
    // Limpar dados temporários da carreira
    localStorage.removeItem(CURRENT_CAREER_KEY);
    localStorage.removeItem(XP_BONUS_KEY);

    // Verificar se completou desafio
    const challengeInProgress = localStorage.getItem('fcs_challenge_in_progress');
    if (challengeInProgress === 'true') {
      const challenge = getDailyChallenge();
      if (challenge && !challenge.completed) {
        // Completar o desafio
        challenge.completed = true;
        localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(challenge));

        // Incrementar contador de desafios completos
        const stats = loadDiversityStats();
        stats.challengesCompleted = (stats.challengesCompleted || 0) + 1;
        saveDiversityStats(stats);
      }
      localStorage.removeItem('fcs_challenge_in_progress');
    }

    // Atualizar stats de carreiras completadas
    const stats = loadDiversityStats();
    stats.careersCompleted = (stats.careersCompleted || 0) + 1;
    saveDiversityStats(stats);
  } catch (e) {
    console.warn('Failed to update diversity on retirement:', e);
  }
};
