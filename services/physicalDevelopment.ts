/**
 * ============================================================================
 * SISTEMA DE DESENVOLVIMENTO FÍSICO
 * ============================================================================
 * 
 * Gerencia a evolução de altura e peso do jogador ao longo da carreira:
 * - Altura cresce até ~21 anos (com crescimento acelerado até 18)
 * - Peso varia com treino, idade e metabolismo
 * - IMC afeta performance e adequação a treinos
 * - Tipo de corpo pode mudar com ganho/perda de peso
 */

import { Player } from "../types";
import { BodyType } from "../types/expandedPlayerTypes";
import { clamp, rand, randFloat } from "./utils";

// ==================== CONSTANTES ====================

// Idade em que altura para de crescer (varia por jogador)
const HEIGHT_GROWTH_END_AGE_MIN = 19;
const HEIGHT_GROWTH_END_AGE_MAX = 22;

// Faixas de peso ideal por posição
const POSITION_IDEAL_WEIGHT: Record<string, { min: number; ideal: number; max: number }> = {
  GK: { min: 75, ideal: 82, max: 95 },
  CB: { min: 75, ideal: 82, max: 92 },
  LB: { min: 65, ideal: 72, max: 80 },
  RB: { min: 65, ideal: 72, max: 80 },
  LWB: { min: 68, ideal: 74, max: 82 },
  RWB: { min: 68, ideal: 74, max: 82 },
  CDM: { min: 72, ideal: 78, max: 88 },
  CM: { min: 68, ideal: 75, max: 85 },
  CAM: { min: 65, ideal: 72, max: 80 },
  LM: { min: 65, ideal: 72, max: 78 },
  RM: { min: 65, ideal: 72, max: 78 },
  LW: { min: 62, ideal: 70, max: 78 },
  RW: { min: 62, ideal: 70, max: 78 },
  CF: { min: 70, ideal: 77, max: 88 },
  ST: { min: 72, ideal: 80, max: 92 },
};

// Tipo de metabolismo afeta ganho/perda de peso
const METABOLISM_WEIGHT_FACTOR = {
  Fast: { gainRate: 0.7, lossRate: 1.3 },
  Normal: { gainRate: 1.0, lossRate: 1.0 },
  Slow: { gainRate: 1.3, lossRate: 0.7 },
};

// ==================== FUNÇÕES DE ALTURA ====================

/**
 * Calcula a altura potencial máxima do jogador
 * Baseada na altura inicial e genética
 */
export function calculatePotentialHeight(
  currentHeight: number,
  currentAge: number,
): number {
  // Se já tem 21+, altura atual é a final
  if (currentAge >= 21) {
    return currentHeight;
  }

  // Estima quanto ainda vai crescer
  const remainingGrowthYears = Math.max(0, 21 - currentAge);
  
  // Crescimento médio por ano diminui com a idade
  let estimatedGrowth = 0;
  for (let age = currentAge; age < 21; age++) {
    if (age < 16) {
      estimatedGrowth += randFloat(3, 6); // 3-6cm por ano antes dos 16
    } else if (age < 18) {
      estimatedGrowth += randFloat(1.5, 4); // 1.5-4cm por ano 16-18
    } else if (age < 20) {
      estimatedGrowth += randFloat(0.5, 2); // 0.5-2cm por ano 18-20
    } else {
      estimatedGrowth += randFloat(0, 0.5); // 0-0.5cm por ano 20-21
    }
  }

  return Math.round(currentHeight + estimatedGrowth);
}

/**
 * Simula o crescimento de altura em uma temporada
 */
export function simulateHeightGrowth(
  currentHeight: number,
  potentialHeight: number,
  age: number,
): { newHeight: number; grew: boolean; growth: number } {
  // Não cresce mais após 21 ou se já atingiu potencial
  if (age >= 22 || currentHeight >= potentialHeight) {
    return { newHeight: currentHeight, grew: false, growth: 0 };
  }

  // Taxa de crescimento por idade
  let maxGrowthThisSeason: number;
  if (age < 16) {
    maxGrowthThisSeason = randFloat(3, 6);
  } else if (age < 18) {
    maxGrowthThisSeason = randFloat(1.5, 4);
  } else if (age < 20) {
    maxGrowthThisSeason = randFloat(0.5, 2);
  } else {
    maxGrowthThisSeason = randFloat(0, 1);
  }

  // Não pode ultrapassar o potencial
  const remainingGrowth = potentialHeight - currentHeight;
  const actualGrowth = Math.min(maxGrowthThisSeason, remainingGrowth);
  
  // Arredonda para 0.5cm
  const roundedGrowth = Math.round(actualGrowth * 2) / 2;
  
  if (roundedGrowth <= 0) {
    return { newHeight: currentHeight, grew: false, growth: 0 };
  }

  return {
    newHeight: Math.round(currentHeight + roundedGrowth),
    grew: true,
    growth: roundedGrowth,
  };
}

// ==================== FUNÇÕES DE PESO ====================

/**
 * Determina o tipo de metabolismo do jogador
 */
export function determineMetabolism(): "Fast" | "Normal" | "Slow" {
  const roll = Math.random();
  if (roll < 0.25) return "Fast";
  if (roll < 0.75) return "Normal";
  return "Slow";
}

/**
 * Calcula o peso ideal baseado na altura e posição
 */
export function calculateIdealWeight(
  height: number,
  position: string,
): number {
  const positionWeights = POSITION_IDEAL_WEIGHT[position] || POSITION_IDEAL_WEIGHT.CM;
  
  // Ajusta pelo desvio da altura média (180cm)
  const heightFactor = height / 180;
  const idealWeight = positionWeights.ideal * heightFactor;
  
  return Math.round(idealWeight);
}

/**
 * Calcula o peso no pico da carreira (26-30 anos)
 */
export function calculatePeakWeight(
  potentialHeight: number,
  position: string,
  bodyType: BodyType,
): number {
  const baseIdeal = calculateIdealWeight(potentialHeight, position);
  
  // Ajusta pelo tipo de corpo
  const bodyTypeModifier: Record<BodyType, number> = {
    Lean: -3,
    Average: 0,
    Stocky: 4,
    Muscular: 5,
    Tall: 2,
  };
  
  return Math.round(baseIdeal + (bodyTypeModifier[bodyType] || 0) + randFloat(-2, 2));
}

/**
 * Simula mudança de peso em uma temporada
 */
export function simulateWeightChange(
  player: Player,
  trainingIntensity: "low" | "normal" | "high",
  injuryMonths: number = 0,
): { newWeight: number; changed: boolean; change: number; reason: string } {
  const profile = player.expandedData?.physicalProfile;
  if (!profile) {
    return { newWeight: player.stats.physical || 75, changed: false, change: 0, reason: "" };
  }

  const currentWeight = profile.weight;
  const peakWeight = profile.peakWeight || calculateIdealWeight(profile.height, player.position);
  const metabolism = profile.metabolismType || "Normal";
  const metabolismFactors = METABOLISM_WEIGHT_FACTOR[metabolism];
  const age = player.age;

  let weightChange = 0;
  let reason = "";

  // ========== FASE DE CRESCIMENTO (16-23) ==========
  if (age < 23) {
    // Jogadores jovens naturalmente ganham massa muscular
    const naturalGain = randFloat(0.5, 2) * metabolismFactors.gainRate;
    
    // Treino intenso acelera ganho muscular
    if (trainingIntensity === "high") {
      weightChange = naturalGain * 1.3;
      reason = "muscle_gain_training";
    } else if (trainingIntensity === "normal") {
      weightChange = naturalGain;
      reason = "natural_muscle_gain";
    } else {
      weightChange = naturalGain * 0.5;
      reason = "slow_development";
    }
  }
  
  // ========== FASE DE PICO (23-30) ==========
  else if (age < 30) {
    // Peso tende a estabilizar no ideal
    const diffFromPeak = peakWeight - currentWeight;
    
    if (Math.abs(diffFromPeak) < 1) {
      // Já está no peso ideal - pequenas variações
      weightChange = randFloat(-0.5, 0.5);
      reason = "weight_stable";
    } else if (diffFromPeak > 0) {
      // Precisa ganhar peso
      weightChange = Math.min(diffFromPeak, randFloat(0.5, 1.5) * metabolismFactors.gainRate);
      reason = "approaching_peak_weight";
    } else {
      // Precisa perder peso
      weightChange = Math.max(diffFromPeak, -randFloat(0.5, 1.5) * metabolismFactors.lossRate);
      reason = "weight_optimization";
    }
    
    // Treino intenso ajuda a manter forma
    if (trainingIntensity === "high") {
      weightChange *= 0.8; // Menos variação
    }
  }
  
  // ========== FASE DE DECLÍNIO (30+) ==========
  else {
    // Metabolismo desacelera, tendência a ganhar peso
    const ageFactor = 1 + (age - 30) * 0.05; // +5% por ano após 30
    
    if (trainingIntensity === "high") {
      // Treino intenso compensa
      weightChange = randFloat(-0.5, 0.5);
      reason = "maintaining_fitness";
    } else if (trainingIntensity === "normal") {
      weightChange = randFloat(0, 1) * ageFactor * metabolismFactors.gainRate;
      reason = "natural_weight_gain";
    } else {
      weightChange = randFloat(0.5, 2) * ageFactor * metabolismFactors.gainRate;
      reason = "declining_metabolism";
    }
  }

  // ========== FATORES EXTERNOS ==========
  
  // Lesões causam perda de peso muscular ou ganho de gordura
  if (injuryMonths > 0) {
    if (injuryMonths >= 4) {
      // Lesão longa - perda muscular significativa
      weightChange -= randFloat(1, 3);
      reason = "injury_muscle_loss";
    } else if (injuryMonths >= 2) {
      // Lesão média - alguma perda
      weightChange -= randFloat(0.5, 1.5);
      reason = "injury_deconditioning";
    }
  }

  // Limita a mudança de peso por temporada
  weightChange = clamp(weightChange, -4, 4);

  // Aplica a mudança
  const positionWeights = POSITION_IDEAL_WEIGHT[player.position] || POSITION_IDEAL_WEIGHT.CM;
  const newWeight = clamp(
    Math.round((currentWeight + weightChange) * 10) / 10,
    positionWeights.min - 5,
    positionWeights.max + 10,
  );

  return {
    newWeight,
    changed: Math.abs(newWeight - currentWeight) >= 0.5,
    change: newWeight - currentWeight,
    reason,
  };
}

// ==================== FUNÇÕES DE IMC E TIPO DE CORPO ====================

/**
 * Calcula o IMC atualizado
 */
export function calculateBMI(weight: number, height: number): number {
  return Number((weight / (height / 100) ** 2).toFixed(1));
}

/**
 * Atualiza o tipo de corpo baseado no IMC e outros fatores
 */
export function updateBodyType(
  currentBMI: number,
  height: number,
  position: string,
  age: number,
  trainingFocus?: string,
): BodyType {
  // Altura alta influencia tipo de corpo
  if (height >= 190 && currentBMI < 24) {
    return "Tall";
  }

  // IMC baixo = Lean
  if (currentBMI < 21) {
    return "Lean";
  }

  // IMC alto
  if (currentBMI > 25.5) {
    return height >= 188 ? "Tall" : "Stocky";
  }

  // IMC médio-alto com posições de força
  if (currentBMI > 23.5) {
    if (["CB", "ST", "CDM", "CF"].includes(position)) {
      return "Muscular";
    }
    if (trainingFocus === "gym" || trainingFocus === "strength") {
      return "Muscular";
    }
  }

  return "Average";
}

// ==================== EFEITOS NA SIMULAÇÃO ====================

/**
 * Calcula modificadores de performance baseados no físico
 */
export function getPhysicalPerformanceModifiers(
  weight: number,
  height: number,
  idealWeight: number,
  position: string,
): {
  speedModifier: number;      // Afeta pace/aceleração
  strengthModifier: number;   // Afeta duelos físicos
  staminaModifier: number;    // Afeta resistência
  aerialModifier: number;     // Afeta duelos aéreos
  agilityModifier: number;    // Afeta dribles/mudança de direção
} {
  const bmi = calculateBMI(weight, height);
  const weightDiff = weight - idealWeight;
  const weightDiffPercent = (weightDiff / idealWeight) * 100;

  // Velocidade: peso acima do ideal reduz velocidade
  let speedModifier = 1.0;
  if (weightDiffPercent > 5) {
    speedModifier -= (weightDiffPercent - 5) * 0.01; // -1% por cada 1% acima do ideal
  } else if (weightDiffPercent < -5) {
    speedModifier += Math.abs(weightDiffPercent + 5) * 0.005; // +0.5% por cada 1% abaixo
  }

  // Força: peso acima do ideal aumenta força até certo ponto
  let strengthModifier = 1.0;
  if (weightDiffPercent > 0 && weightDiffPercent <= 10) {
    strengthModifier += weightDiffPercent * 0.01; // +1% por cada 1% acima
  } else if (weightDiffPercent > 10) {
    strengthModifier += 0.1 - (weightDiffPercent - 10) * 0.005; // Diminui retorno
  } else if (weightDiffPercent < -5) {
    strengthModifier -= Math.abs(weightDiffPercent + 5) * 0.01;
  }

  // Resistência: IMC muito alto ou muito baixo reduz
  let staminaModifier = 1.0;
  if (bmi > 26) {
    staminaModifier -= (bmi - 26) * 0.02;
  } else if (bmi < 19) {
    staminaModifier -= (19 - bmi) * 0.02;
  }

  // Duelos aéreos: altura é o principal fator
  let aerialModifier = 1.0;
  aerialModifier += (height - 180) * 0.005; // +0.5% por cm acima de 180

  // Agilidade: jogadores mais leves são mais ágeis
  let agilityModifier = 1.0;
  if (bmi < 22) {
    agilityModifier += (22 - bmi) * 0.02;
  } else if (bmi > 24) {
    agilityModifier -= (bmi - 24) * 0.02;
  }

  return {
    speedModifier: clamp(speedModifier, 0.85, 1.1),
    strengthModifier: clamp(strengthModifier, 0.85, 1.15),
    staminaModifier: clamp(staminaModifier, 0.85, 1.05),
    aerialModifier: clamp(aerialModifier, 0.9, 1.15),
    agilityModifier: clamp(agilityModifier, 0.85, 1.1),
  };
}

// ==================== FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO ====================

/**
 * Processa o desenvolvimento físico de uma temporada
 */
export function processPhysicalDevelopment(
  player: Player,
  trainingIntensity: "low" | "normal" | "high" = "normal",
  injuryMonths: number = 0,
): {
  updatedPlayer: Player;
  heightGrew: boolean;
  heightGrowth: number;
  weightChanged: boolean;
  weightChange: number;
  bodyTypeChanged: boolean;
  newBodyType: BodyType | null;
  events: string[];
} {
  const events: string[] = [];
  const profile = player.expandedData?.physicalProfile;

  if (!profile) {
    return {
      updatedPlayer: player,
      heightGrew: false,
      heightGrowth: 0,
      weightChanged: false,
      weightChange: 0,
      bodyTypeChanged: false,
      newBodyType: null,
      events: [],
    };
  }

  // Inicializa campos de desenvolvimento se não existirem
  const potentialHeight = profile.potentialHeight || calculatePotentialHeight(profile.height, player.age);
  const peakWeight = profile.peakWeight || calculatePeakWeight(potentialHeight, player.position, profile.bodyType);
  const metabolismType = profile.metabolismType || determineMetabolism();

  // Simula crescimento de altura
  const heightResult = simulateHeightGrowth(profile.height, potentialHeight, player.age);
  if (heightResult.grew) {
    events.push(`events.physical.heightGrowth`);
  }

  // Simula mudança de peso
  const weightResult = simulateWeightChange(player, trainingIntensity, injuryMonths);
  if (weightResult.changed) {
    if (weightResult.change > 0) {
      events.push(`events.physical.weightGain`);
    } else {
      events.push(`events.physical.weightLoss`);
    }
  }

  // Calcula novo IMC
  const newBMI = calculateBMI(weightResult.newWeight, heightResult.newHeight);

  // Verifica se tipo de corpo mudou
  const newBodyType = updateBodyType(
    newBMI,
    heightResult.newHeight,
    player.position,
    player.age,
  );
  const bodyTypeChanged = newBodyType !== profile.bodyType;
  if (bodyTypeChanged) {
    events.push(`events.physical.bodyTypeChange`);
  }

  // Atualiza o jogador
  const updatedPlayer: Player = {
    ...player,
    expandedData: player.expandedData ? {
      ...player.expandedData,
      physicalProfile: {
        ...profile,
        height: heightResult.newHeight,
        weight: weightResult.newWeight,
        bmi: newBMI,
        bodyType: newBodyType,
        potentialHeight,
        peakWeight,
        metabolismType,
      },
    } : undefined,
  };

  return {
    updatedPlayer,
    heightGrew: heightResult.grew,
    heightGrowth: heightResult.growth,
    weightChanged: weightResult.changed,
    weightChange: weightResult.change,
    bodyTypeChanged,
    newBodyType: bodyTypeChanged ? newBodyType : null,
    events,
  };
}

// ==================== EXPORTS ====================

export default {
  calculatePotentialHeight,
  simulateHeightGrowth,
  calculateIdealWeight,
  calculatePeakWeight,
  simulateWeightChange,
  calculateBMI,
  updateBodyType,
  getPhysicalPerformanceModifiers,
  processPhysicalDevelopment,
  determineMetabolism,
};
