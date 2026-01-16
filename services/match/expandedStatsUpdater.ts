/**
 * EXPANDED STATS UPDATER - v0.5.2
 *
 * Atualiza as estatísticas ultra-detalhadas (AttackingStatsUltra, etc.)
 * baseado nos eventos de partida.
 *
 * Updates:
 * - Integração de 175+ fontes científicas
 * - Nova distribuição temporal: χ² ≈ 288.62, p = 3.72×10⁻²¹
 * - Taxa de conversão por posição (Wang 2020, Mohamed 2016)
 * - Pesos de scoring por posição (63% forwards, 28% midfielders, 9% defenders)
 */

import type {
  Player,
  MatchSimulation,
  ExtendedMatchStats,
  TraitLevel,
} from "../../types";
import type {
  ExpandedPlayerData,
  AttackingStatsUltra,
  CreationStatsUltra,
  DuelStatsUltra,
  DefensiveStatsUltra,
  DisciplineStatsUltra,
  MatchPhysicalStats,
  FlairPlaysStats,
} from "../../types/expandedPlayerTypes";
import { rand, randFloat, clamp } from "../utils";

/**
 * v0.5.3: Calcula modificadores de timing baseado no perfil do jogador
 *
 * Baseado em pesquisas científicas:
 * - Batista et al. 2024: Distribuição base de gols
 * - Albay 2025: Posse de bola e chutes bloqueados
 * - Campos 2011: 56% gols no 2° tempo (fadiga adversária)
 *
 * Retorna um array de 6 modificadores multiplicativos para cada período:
 * [0-15', 15-30', 30-45+', 45-60', 60-75', 75-90+']
 */
function calculatePlayerTimingModifiers(player: Player): number[] {
  // Modificadores base (1.0 = sem modificação)
  const modifiers = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  const stats = player.stats;
  const traits = player.traits || [];

  // === ATRIBUTOS FÍSICOS ===

  // Pace alto → mais gols no início (contra-ataques com pernas frescas)
  if (stats.pace && stats.pace > 85) {
    const boost = (stats.pace - 85) * 0.01; // +1% por ponto acima de 85
    modifiers[0] += boost * 0.15; // 0-15'
    modifiers[1] += boost * 0.12; // 15-30'
    modifiers[2] += boost * 0.08; // 30-45'
  }

  // Acceleration alto → gols rápidos em contra-ataques
  if (stats.acceleration && stats.acceleration > 85) {
    const boost = (stats.acceleration - 85) * 0.008;
    modifiers[0] += boost * 0.12;
    modifiers[1] += boost * 0.1;
  }

  // Stamina alto → mantém performance no final
  if (stats.stamina && stats.stamina > 85) {
    const boost = (stats.stamina - 85) * 0.012;
    modifiers[4] += boost * 0.1; // 60-75'
    modifiers[5] += boost * 0.2; // 75-90+'
  }

  // Stamina baixo → penalidade no final do jogo
  if (stats.stamina && stats.stamina < 70) {
    const penalty = (70 - stats.stamina) * 0.008;
    modifiers[4] -= penalty * 0.1;
    modifiers[5] -= penalty * 0.2;
  }

  // Strength alto → duelos no final quando adversário cansa
  if (stats.strength && stats.strength > 80) {
    const boost = (stats.strength - 80) * 0.006;
    modifiers[4] += boost * 0.08;
    modifiers[5] += boost * 0.12;
  }

  // === ATRIBUTOS MENTAIS ===

  // Composure alto → gols sob pressão no final
  if (stats.composure && stats.composure > 85) {
    const boost = (stats.composure - 85) * 0.01;
    modifiers[5] += boost * 0.15; // 75-90+' (momento de maior pressão)
  }

  // Vision alto → mantém foco e identifica oportunidades no final
  if (stats.vision && stats.vision > 80) {
    const boost = (stats.vision - 80) * 0.007;
    modifiers[4] += boost * 0.08;
    modifiers[5] += boost * 0.12;
  }

  // WorkRate alto → busca gol quando precisa, não desiste
  if (stats.workRate && stats.workRate > 85) {
    const boost = (stats.workRate - 85) * 0.008;
    modifiers[5] += boost * 0.1;
  }

  // === TRAITS ESPECÍFICOS ===

  const hasTraitLevel = (
    traitName: string,
    minLevel: TraitLevel = "Bronze",
  ): boolean => {
    const trait = traits.find((t) =>
      t.name.toLowerCase().includes(traitName.toLowerCase()),
    );
    if (!trait) return false;
    const levels: Record<TraitLevel, number> = {
      Bronze: 1,
      Silver: 2,
      Gold: 3,
      Diamond: 4,
    };
    return levels[trait.level] >= levels[minLevel];
  };

  // Finisher → gols decisivos no final
  if (
    hasTraitLevel("Finisher") ||
    hasTraitLevel("Finalizador") ||
    hasTraitLevel("Clinical")
  ) {
    modifiers[4] += 0.15;
    modifiers[5] += 0.25;
  }

  // Speed Dribbler / Driblador → gols rápidos no início
  if (
    hasTraitLevel("Speed") ||
    hasTraitLevel("Velocista") ||
    hasTraitLevel("Dribbler")
  ) {
    modifiers[0] += 0.15;
    modifiers[1] += 0.12;
    modifiers[2] += 0.08;
  }

  // Poacher / Oportunista → distribuição mais uniforme
  if (
    hasTraitLevel("Poacher") ||
    hasTraitLevel("Oportunista") ||
    hasTraitLevel("Fox")
  ) {
    // Reduz extremos, aumenta meio
    modifiers[0] -= 0.05;
    modifiers[5] -= 0.05;
    modifiers[2] += 0.05;
    modifiers[3] += 0.05;
  }

  // Big Game Player / Jogador de Grandes Jogos → brilha no final
  if (
    hasTraitLevel("Big Game") ||
    hasTraitLevel("Clutch") ||
    hasTraitLevel("Decisivo")
  ) {
    modifiers[5] += 0.3;
  }

  // Engine / Motor → performance consistente
  if (
    hasTraitLevel("Engine") ||
    hasTraitLevel("Motor") ||
    hasTraitLevel("Tireless")
  ) {
    modifiers[4] += 0.1;
    modifiers[5] += 0.15;
  }

  // === POSIÇÃO DO JOGADOR (Mohamed 2016 + Wang 2020) ===
  // Mohamed 2016: Atacantes 69 gols, Defensores winning 16 vs 0 losing
  // Wang 2020: 63.1% gols de forwards, 28.2% midfielders, 8.7% defenders

  const position = player.position;

  // Atacantes puros → +gols 75-90+' (times abrem defensivamente)
  // Mohamed 2016: Winning team scoring pattern increases late game
  if (position === "ST" || position === "CF") {
    modifiers[3] += 0.08; // 45-60'
    modifiers[4] += 0.12; // 60-75'
    modifiers[5] += 0.18; // 75-90+' (times abrem mais)
  }

  // Pontas → distribuição variada, +início (contra-ataques)
  if (position === "LW" || position === "RW") {
    modifiers[0] += 0.08; // 0-15' (defesas frescas, espaços)
    modifiers[1] += 0.06; // 15-30'
    modifiers[4] += 0.05; // 60-75'
  }

  // CAM/Meias ofensivos → distribuição uniforme com leve aumento final
  if (position === "CAM") {
    modifiers[3] += 0.05;
    modifiers[4] += 0.08;
    modifiers[5] += 0.1;
  }

  // CM/Meias centrais → distribuição uniforme (endurance profile 66.7%)
  if (position === "CM") {
    // Distribuição equilibrada, sem grandes modificadores
    modifiers[2] += 0.03;
    modifiers[3] += 0.03;
  }

  // CDM/Volantes → gols raros, geralmente bola parada início
  if (position === "CDM") {
    modifiers[0] += 0.12; // 0-15' (bola parada)
    modifiers[1] += 0.08; // 15-30' (bola parada)
    modifiers[2] += 0.05; // 30-45'
    modifiers[5] -= 0.08; // 75-90+' (raramente marcam tarde)
  }

  // LM/RM → padrão similar a pontas mas menos extremo
  if (position === "LM" || position === "RM") {
    modifiers[0] += 0.05;
    modifiers[1] += 0.04;
    modifiers[4] += 0.04;
  }

  // Laterais/Full-backs → Speed profile 57.7% (Manzi 2025)
  // Gols variados, tendência a marcar em contra-ataques
  if (
    position === "LB" ||
    position === "RB" ||
    position === "LWB" ||
    position === "RWB"
  ) {
    modifiers[0] += 0.1; // 0-15' (subidas ofensivas início)
    modifiers[1] += 0.06; // 15-30'
    modifiers[4] += 0.05; // 60-75' (fadiga adversária)
  }

  // Zagueiros/Center-backs → gols raríssimos, quase só bola parada
  // Mohamed 2016: 16 gols defensores winning vs 0 losing (pressão final)
  if (position === "CB") {
    modifiers[0] += 0.15; // 0-15' (escanteios/faltas início)
    modifiers[1] += 0.1; // 15-30' (bola parada)
    modifiers[2] += 0.05; // 30-45' (bola parada)
    modifiers[4] -= 0.05; // 60-75' (raro)
    modifiers[5] -= 0.08; // 75-90+' (muito raro open play)
  }

  // === PERFIL FISIOLÓGICO (Manzi 2025 - 195 jogadores Serie A) ===
  // Speed Profile: MSS > 34.47 km/h (T-score > 60) → Full-backs 57.7%
  // Endurance Profile: MAS > 17.46 km/h (T-score > 60) → Midfielders 66.7%
  // Hybrid Profile: Ambos altos → Full-backs 50%, Midfielders 37.5%

  const pace = stats.pace || 70;
  const acceleration = stats.acceleration || 70;
  const stamina = stats.stamina || 70;
  const agility = stats.agility || 70;

  // Detectar perfil fisiológico
  const isSpeedProfile = pace > 85 && acceleration > 82;
  const isEnduranceProfile = stamina > 85;
  const isHybridProfile = isSpeedProfile && isEnduranceProfile;

  if (isHybridProfile) {
    // Híbrido → distribuição balanceada com leve vantagem em todos períodos
    modifiers[0] += 0.05;
    modifiers[1] += 0.03;
    modifiers[4] += 0.05;
    modifiers[5] += 0.08;
  } else if (isSpeedProfile) {
    // Speed Profile → +gols 0-45' (explosão, contra-ataques)
    modifiers[0] += 0.12; // 0-15'
    modifiers[1] += 0.1; // 15-30'
    modifiers[2] += 0.06; // 30-45'
    // Leve penalidade no final (fadiga mais rápida)
    modifiers[5] -= 0.05;
  } else if (isEnduranceProfile) {
    // Endurance Profile → +gols 60-90+' (mantém performance)
    modifiers[4] += 0.1; // 60-75'
    modifiers[5] += 0.15; // 75-90+'
    // Leve penalidade no início (aquece devagar)
    modifiers[0] -= 0.03;
  }

  // Jogadores com alta agilidade → +gols em transições (início e meio)
  if (agility > 85) {
    modifiers[0] += 0.05;
    modifiers[3] += 0.05;
  }

  // === NORMALIZAÇÃO ===
  // Garantir que todos os modificadores estejam entre 0.5 e 2.5
  for (let i = 0; i < 6; i++) {
    modifiers[i] = clamp(modifiers[i], 0.5, 2.5);
  }

  return modifiers;
}

/**
 * v0.5.3: Aplica modificadores do jogador aos pesos de período
 * e adiciona variância natural para maior realismo
 */
function applyTimingModifiersWithVariance(
  baseWeights: number[],
  modifiers: number[],
  varianceLevel: number = 0.35, // 35% de variância
): number[] {
  // Aplicar modificadores
  const modified = baseWeights.map((w, i) => w * modifiers[i]);

  // Adicionar variância aleatória (±15% por período)
  const withVariance = modified.map((w) => {
    const variance = 1 + (Math.random() - 0.5) * 0.3; // ±15%
    return w * variance;
  });

  // Normalizar para somar 1.0
  const sum = withVariance.reduce((a, b) => a + b, 0);
  return withVariance.map((w) => w / sum);
}

/**
 * v0.5.3: Seleciona período com base nos pesos modificados
 * Inclui chance de variação extra para tornar menos previsível
 */
function selectPeriodWithVariance(weights: number[]): number {
  const roll = Math.random();
  let cumulative = 0;
  let selectedPeriod = 5; // Default: final da partida

  for (let i = 0; i < 6; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      selectedPeriod = i;
      break;
    }
  }

  // 35% chance de variação de ±1 período (aumentado de 20%)
  if (Math.random() < 0.35) {
    const shift = Math.random() < 0.5 ? -1 : 1;
    selectedPeriod = Math.max(0, Math.min(5, selectedPeriod + shift));
  }

  // 5% chance de variação de ±2 períodos (novo!)
  if (Math.random() < 0.05) {
    const shift = Math.random() < 0.5 ? -2 : 2;
    selectedPeriod = Math.max(0, Math.min(5, selectedPeriod + shift));
  }

  return selectedPeriod;
}

/**
 * v0.6.0: Taxa de conversão de chutes por posição
 * Baseado em Wang 2020, Mohamed 2016, e meta-análise de 175+ fontes
 *
 * | Posição | Shots/Jogo | Conversion Rate |
 * |---------|------------|-----------------|
 * | ST/CF   | 4-6        | 15-22%          |
 * | CAM     | 2-4        | 8-15%           |
 * | LW/RW   | 2-3        | 8-12%           |
 * | CM      | 1-2        | 5-8%            |
 * | LB/RB   | 0.5-1      | 5-10%           |
 * | CB      | 0.3-0.6    | <2%             |
 */
export function getPositionConversionRate(position: string): number {
  const conversionRates: Record<string, number> = {
    // Atacantes: 15-22% conversão
    ST: 0.185,
    CF: 0.175,
    // Meias ofensivos: 8-15%
    CAM: 0.115,
    // Pontas: 8-12%
    LW: 0.1,
    RW: 0.1,
    // Meias centrais: 5-8%
    CM: 0.065,
    LM: 0.065,
    RM: 0.065,
    // Volantes: 3-5%
    CDM: 0.04,
    // Laterais: 5-10%
    LB: 0.075,
    RB: 0.075,
    LWB: 0.08,
    RWB: 0.08,
    // Zagueiros: <2%
    CB: 0.015,
    // Goleiros: praticamente 0
    GK: 0.001,
  };

  return conversionRates[position] || 0.05;
}

/**
 * v0.6.0: Peso de probabilidade de marcar gol por posição
 * Baseado em Wang 2020: 63.1% forwards, 28.2% midfielders, 8.7% defenders
 * Mohamed 2016: 69 gols atacantes, 16 defensores (winning teams)
 */
export function getPositionScoringWeight(position: string): number {
  const scoringWeights: Record<string, number> = {
    // Atacantes: ~60% dos gols
    ST: 1.5,
    CF: 1.4,
    LW: 1.2,
    RW: 1.2,
    // Meias: ~28% dos gols
    CAM: 1.0,
    CM: 0.8,
    LM: 0.85,
    RM: 0.85,
    CDM: 0.5,
    // Defensores: ~12% dos gols
    LB: 0.45,
    RB: 0.45,
    LWB: 0.55,
    RWB: 0.55,
    CB: 0.3,
    // Goleiros: rarísimo
    GK: 0.01,
  };

  return scoringWeights[position] || 0.5;
}

/**
 * v0.5.2: Modificador de ataque por tipo de transição
 * Baseado em: https://www.termedia.pl/doi/10.5114/biolsport.2025.142640
 *
 * | Tipo de Ataque     | % Gols  | Odds Ratio vs Posicional |
 * |--------------------|---------|--------------------------|
 * | Transição Direta   | 25-30%  | 3.4-7.0x                 |
 * | Contra-ataque      | 20-25%  | 3.4x                     |
 * | Jogo Posicional    | 45-50%  | Baseline (1.0)           |
 * | Ataque Direto      | 10-15%  | 0.47x                    |
 *
 * @param isCounter Se o gol veio de contra-ataque
 * @param passingSequence Número de passes antes do gol (se disponível)
 * @returns Modificador multiplicativo para timing
 */
export function getTransitionModifier(
  isCounter: boolean,
  passingSequence?: number,
): number[] {
  const modifiers = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  if (isCounter) {
    // Contra-ataques: mais gols nos primeiros 30 min (pernas frescas)
    // e em 60-75' (fadiga adversária abre espaços)
    modifiers[0] += 0.25; // 0-15': +25%
    modifiers[1] += 0.2; // 15-30': +20%
    modifiers[4] += 0.15; // 60-75': +15%
    modifiers[5] -= 0.1; // 75-90+': -10% (menos contra-ataques no final)
  }

  // Jogo direto (0-4 passes): ~79% dos gols (Wang 2020)
  // Mais gols no início do jogo
  if (passingSequence !== undefined) {
    if (passingSequence <= 4) {
      // Jogo direto: favorece início
      modifiers[0] += 0.15;
      modifiers[1] += 0.1;
      modifiers[2] += 0.05;
    } else if (passingSequence >= 9) {
      // Jogo muito elaborado: favorece final (mais paciência)
      modifiers[4] += 0.1;
      modifiers[5] += 0.15;
    }
  }

  return modifiers;
}

/**
 * v0.5.2: Efeito do primeiro gol no momentum da partida
 * Baseado em: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.662708/full
 *
 * - Time que marca primeiro: 75.9% de vitória
 * - Probabilidade de marcar próximo gol: 52.94%
 * - Efeito "clustering": gols do mesmo time ocorrem mais próximos
 *
 * @param hasFirstGoal Se o jogador/time marcou o primeiro gol
 * @param lastGoalMinute Minuto do último gol marcado (para clustering)
 * @param currentMinute Minuto atual da partida
 * @returns Boost de intensidade de gol
 */
export function getFirstGoalMomentumBoost(
  hasFirstGoal: boolean,
  lastGoalMinute?: number,
  currentMinute?: number,
): number {
  let boost = 1.0;

  // Efeito psicológico do primeiro gol
  if (hasFirstGoal) {
    boost += 0.1; // +10% intensidade
  }

  // Efeito clustering: gols próximos no tempo
  // Se marcou nos últimos 10 minutos, +15% chance de marcar novamente
  if (lastGoalMinute !== undefined && currentMinute !== undefined) {
    const timeSinceLastGoal = currentMinute - lastGoalMinute;
    if (timeSinceLastGoal >= 0 && timeSinceLastGoal <= 10) {
      boost += 0.15; // +15% se gol recente
    } else if (timeSinceLastGoal > 10 && timeSinceLastGoal <= 20) {
      boost += 0.08; // +8% se gol há 10-20 min
    }
  }

  return boost;
}

/**
 * v0.5.2: Efeito de cartão vermelho na intensidade de gol
 * Baseado em: http://link.springer.com/10.1007/s00181-017-1287-5
 *
 * | Cenário          | Redução Gols | Prob Vitória    |
 * |------------------|--------------|-----------------|
 * | Home + Red       | -1.2 gols    | 47% → 18%       |
 * | Away + Red       | -0.4 gols    | 23.5% → 14.1%   |
 * | Red Card geral   | -30%         | Significativo   |
 * | Early (<30 min)  | Devastador   | Muito pior      |
 * | Late (>70 min)   | Menor        | Menos impacto   |
 *
 * @param hasRedCard Se o time do jogador tem cartão vermelho
 * @param redCardMinute Minuto em que o cartão foi dado
 * @param isHome Se é jogo em casa
 * @returns Modificador de intensidade (< 1.0 reduz, > 1.0 aumenta)
 */
export function getRedCardIntensityModifier(
  hasRedCard: boolean,
  redCardMinute?: number,
  isHome?: boolean,
): number {
  if (!hasRedCard) {
    return 1.0; // Sem cartão vermelho
  }

  // Base: -30% intensidade
  let modifier = 0.7;

  // Timing do cartão vermelho
  if (redCardMinute !== undefined) {
    if (redCardMinute < 30) {
      // Cartão muito cedo: devastador
      modifier = 0.55; // -45%
    } else if (redCardMinute < 45) {
      modifier = 0.65; // -35%
    } else if (redCardMinute < 70) {
      modifier = 0.7; // -30%
    } else {
      // Cartão tardio: menos impacto
      modifier = 0.8; // -20%
    }
  }

  // Efeito casa/fora
  if (isHome !== undefined) {
    if (isHome) {
      modifier -= 0.1; // Home team sofre mais (47% → 18%)
    }
    // Away team já está em desvantagem, impacto relativo menor
  }

  return clamp(modifier, 0.4, 1.0);
}

/**
 * v0.5.2: Modificador de Home Advantage (vantagem de casa)
 * Baseado em: https://www.mdpi.com/2076-3417/15/4/2242
 * Meta-análise: 8 temporadas, 4337 jogadores, Top 5 ligas europeias
 *
 * | Métrica             | Valor           |
 * |---------------------|-----------------|
 * | Prob vencer casa    | 47%             |
 * | Prob vencer fora    | 27%             |
 * | Gols marcados casa  | 1.5-1.7/jogo    |
 * | Gols sofridos casa  | 0.9-1.1/jogo    |
 * | HA Score global     | 35-40%          |
 *
 * @param isHome Se o jogador está jogando em casa
 * @returns Modificador de intensidade ofensiva
 */
export function getHomeAdvantageModifier(isHome: boolean): number {
  if (isHome) {
    // Casa: +15% intensidade ofensiva
    return 1.15;
  } else {
    // Fora: -10% intensidade ofensiva
    return 0.9;
  }
}

/**
 * v0.5.2: Modificador baseado na diferença de placar
 * Baseado em: https://journals.sagepub.com/doi/10.1177/17479541251365777
 *
 * | Estado           | Comportamento                    |
 * |------------------|----------------------------------|
 * | Vencendo por 1   | Defesa conservadora, -10% risco  |
 * | Vencendo por 2+  | Ultra-defensivo, -25% risco      |
 * | Empatado         | Jogo equilibrado (baseline)      |
 * | Perdendo por 1   | +15% agressivo, +risco           |
 * | Perdendo por 2+  | +25% muito agressivo             |
 *
 * @param scoreDifferential Diferença de placar (positivo = vencendo)
 * @returns Array de modificadores por período
 */
export function getScoreDifferentialModifiers(
  scoreDifferential: number,
): number[] {
  const modifiers = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  if (scoreDifferential >= 2) {
    // Vencendo por 2+: ultra-defensivo, poucos gols
    modifiers[0] -= 0.15;
    modifiers[1] -= 0.15;
    modifiers[4] -= 0.2;
    modifiers[5] -= 0.25;
  } else if (scoreDifferential === 1) {
    // Vencendo por 1: conservador
    modifiers[4] -= 0.1;
    modifiers[5] -= 0.15;
  } else if (scoreDifferential === 0) {
    // Empatado: sem modificação (baseline)
  } else if (scoreDifferential === -1) {
    // Perdendo por 1: mais agressivo
    modifiers[3] += 0.1;
    modifiers[4] += 0.15;
    modifiers[5] += 0.2;
  } else {
    // Perdendo por 2+: muito agressivo, busca gols
    modifiers[2] += 0.1;
    modifiers[3] += 0.15;
    modifiers[4] += 0.2;
    modifiers[5] += 0.3;
  }

  return modifiers;
}

/**
 * v0.5.2: Sistema de Gols de Bola Parada (Set Pieces)
 * Baseado em: Wang 2020, World Cup 2018-2022
 *
 * | Tipo Set Piece | % Shots | % Gols  | Conversão |
 * |----------------|---------|---------|-----------|
 * | Open Play      | 68.2%   | 65.9%   | Baseline  |
 * | Set Pieces     | 31.8%   | 34.1%   | +7%       |
 * | - Penalty      | 5.7%    | 38.3%   | Muito alta|
 * | - Free Kick    | 42.3%   | 31.9%   | Média     |
 * | - Corner       | 35.9%   | 29.8%   | Média     |
 *
 * 40% dos gols em World Cup 2018 vieram de bola parada
 *
 * @returns Probabilidade de gol ser de bola parada (0-1)
 */
export function getSetPieceProbability(): number {
  // 34-40% dos gols vêm de bola parada
  return 0.37; // Média entre Wang 2020 (34.1%) e WC 2018 (40%)
}

/**
 * v0.5.2: Tipo de bola parada que gerou o gol
 * Baseado em Wang 2020: 146 gols analisados
 */
export type SetPieceType = "penalty" | "freekick" | "corner" | "throwin";

/**
 * v0.5.2: Distribuição de gols por tipo de bola parada
 * Baseado em Wang 2020 e análise de World Cup 2018-2022
 */
export function getSetPieceTypeDistribution(): Record<SetPieceType, number> {
  return {
    penalty: 0.383, // 38.3% dos gols de set piece (altíssima conversão)
    freekick: 0.319, // 31.9%
    corner: 0.298, // 29.8%
    throwin: 0.0, // Rarísimo (incluído para completude)
  };
}

/**
 * v0.5.2: Seleciona tipo de bola parada aleatoriamente
 */
export function selectSetPieceType(): SetPieceType {
  const dist = getSetPieceTypeDistribution();
  const roll = Math.random();
  let cumulative = 0;

  cumulative += dist.penalty;
  if (roll < cumulative) return "penalty";

  cumulative += dist.freekick;
  if (roll < cumulative) return "freekick";

  return "corner";
}

/**
 * v0.5.2: Modificadores de timing para gols de bola parada
 * Baseado em análise de 175+ fontes
 *
 * - Escanteios/Corners: Frequentes em 40-44' (final 1° tempo)
 * - Pênaltis: Distribuição mais uniforme
 * - Faltas: Mais no 2° tempo (fadiga → mais faltas)
 */
export function getSetPieceTimingModifiers(type: SetPieceType): number[] {
  const modifiers = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  switch (type) {
    case "corner":
      // Escanteios: pico em 40-44' e 85-90+' (pressão)
      modifiers[2] += 0.2; // 30-45'
      modifiers[5] += 0.25; // 75-90+'
      break;

    case "freekick":
      // Faltas: mais no 2° tempo (fadiga → mais faltas cometidas)
      modifiers[3] += 0.1; // 45-60'
      modifiers[4] += 0.15; // 60-75'
      modifiers[5] += 0.2; // 75-90+'
      break;

    case "penalty":
      // Pênaltis: distribuição mais uniforme, leve aumento no final
      modifiers[4] += 0.1; // 60-75'
      modifiers[5] += 0.15; // 75-90+' (mais pressão → mais pênaltis)
      break;

    case "throwin":
      // Raríssimo - sem modificadores significativos
      break;
  }

  return modifiers;
}

/**
 * v0.5.2: Posições com maior probabilidade de marcar de bola parada
 * Baseado em Wang 2020 e Mohamed 2016
 *
 * Zagueiros marcam 16 gols (winning teams) vs 0 (losing) - quase todos de BP
 */
export function getSetPiecePositionWeight(position: string): number {
  const weights: Record<string, number> = {
    // Zagueiros: quase só marcam de bola parada (cabeça)
    CB: 2.5, // 2.5x mais provável de marcar de BP
    // Laterais altos
    LB: 1.3,
    RB: 1.3,
    LWB: 1.4,
    RWB: 1.4,
    // Volantes: gols de falta/escanteio
    CDM: 1.8,
    // Meias
    CM: 1.2,
    CAM: 1.0,
    LM: 1.0,
    RM: 1.0,
    // Atacantes: menos dependentes de BP
    ST: 0.8,
    CF: 0.85,
    LW: 0.7,
    RW: 0.7,
    // Goleiros: só de falta/pênalti contra
    GK: 0.1,
  };

  return weights[position] || 1.0;
}

/**
 * v0.5.2: Atributos que influenciam gols de bola parada
 * Retorna um multiplicador baseado nos atributos do jogador
 */
export function getSetPieceAttributeMultiplier(playerStats: {
  heading?: number;
  jumping?: number;
  strength?: number;
  positioning?: number;
  longShots?: number;
  curve?: number;
}): number {
  let multiplier = 1.0;

  // Cabeceio e salto: importantes para corners
  const heading = playerStats.heading || 70;
  const jumping = playerStats.jumping || 70;
  if (heading > 80) multiplier += (heading - 80) * 0.015;
  if (jumping > 80) multiplier += (jumping - 80) * 0.01;

  // Força: ajuda em duelos aéreos
  const strength = playerStats.strength || 70;
  if (strength > 80) multiplier += (strength - 80) * 0.008;

  // Chutes de longa distância e curva: faltas diretas
  const longShots = playerStats.longShots || 70;
  const curve = playerStats.curve || 70;
  if (longShots > 80) multiplier += (longShots - 80) * 0.01;
  if (curve > 80) multiplier += (curve - 80) * 0.012;

  return clamp(multiplier, 0.5, 2.0);
}

/**
 * v0.5.2: Sistema de Impacto de Substituições
 * Baseado em: https://www.termedia.pl/doi/10.5114/biolsport.2024.134755
 * Análise de World Cups e European Championships
 *
 * | Estatística                | Valor              |
 * |----------------------------|--------------------|
 * | % gols por substitutos     | ~13% do total      |
 * | Timing médio 1ª sub        | 58' (quando perdendo) |
 * | Regra ótima (perdendo)     | 1ª<58', 2ª<73', 3ª<79' |
 * | Impacto físico             | Jogador fresco +15% |
 */
export function getSubstituteGoalProbability(): number {
  // ~13% dos gols são marcados por jogadores que entraram como substitutos
  return 0.13;
}

/**
 * v0.5.2: Timing ótimo de substituições quando perdendo
 * Baseado em análise Bayesiana de World Cups
 */
export function getOptimalSubstitutionTiming(): {
  first: number;
  second: number;
  third: number;
} {
  return {
    first: 58, // Antes do minuto 58
    second: 73, // Antes do minuto 73
    third: 79, // Antes do minuto 79
  };
}

/**
 * v0.5.2: Boost de performance para jogadores que entraram como substitutos
 * Jogadores frescos têm vantagem física sobre oponentes cansados
 *
 * @param minuteEntered Minuto em que o jogador entrou
 * @param currentMinute Minuto atual da partida
 * @returns Multiplicador de intensidade
 */
export function getSubstituteBoost(
  minuteEntered: number,
  currentMinute: number,
): number {
  const minutesSinceEntry = currentMinute - minuteEntered;

  if (minutesSinceEntry < 0) return 1.0; // Ainda não entrou

  // Primeiros 15 minutos após entrar: boost máximo
  if (minutesSinceEntry <= 15) {
    return 1.15; // +15% intensidade
  }

  // 15-30 minutos: boost moderado
  if (minutesSinceEntry <= 30) {
    return 1.08; // +8%
  }

  // Depois de 30 min: sem boost significativo
  return 1.0;
}

/**
 * v0.5.2: Modificadores de timing para gols de substitutos
 * Substitutos tendem a marcar no final do jogo (quando a fadiga é máxima)
 */
export function getSubstituteTimingModifiers(): number[] {
  const modifiers = [0.5, 0.6, 0.7, 1.0, 1.3, 1.6];
  // 0-15: muito baixo (subs ainda não entraram)
  // 15-30: baixo
  // 30-45: médio-baixo
  // 45-60: normal (subs começam a entrar)
  // 60-75: alto (pico de substituições)
  // 75-90+: muito alto (subs vs cansados)
  return modifiers;
}

/**
 * v0.5.2: Eficiência de Cruzamentos
 * Baseado em: https://soccerment.com/crossing-effective-strategy/
 *
 * | Estatística          | Valor           |
 * |----------------------|-----------------|
 * | Cross accuracy       | 23.5%           |
 * | Crosses → shots      | 56%             |
 * | Gols por cruzamento  | 1 em 64 (~1.6%) |
 *
 * @param crossingSkill Atributo de cruzamento do jogador (0-100)
 * @returns Probabilidade de gol vindo de cruzamento
 */
export function getCrossingGoalProbability(crossingSkill: number): number {
  // Base: 1 gol em 64 cruzamentos = 1.56%
  const baseProbability = 0.0156;

  // Modificador por habilidade de cruzamento
  const skillModifier = crossingSkill / 70;

  return clamp(baseProbability * skillModifier, 0.005, 0.05);
}

/**
 * v0.5.2: Correlação Velocidade de Drible e Gols
 * Baseado em: https://onlinelibrary.wiley.com/doi/10.1111/sms.13782
 *
 * Achado: Velocidade de drible correlaciona r=0.81 (p<0.0001) com sucesso em gol
 * Velocidade de sprint: r=0.60 (p=0.014)
 *
 * @param dribblingSkill Habilidade de drible (0-100)
 * @param pace Velocidade do jogador (0-100)
 * @param acceleration Aceleração do jogador (0-100)
 * @returns Multiplicador de probabilidade de gol
 */
export function getDribblingSpeedGoalMultiplier(
  dribblingSkill: number,
  pace: number,
  acceleration: number,
): number {
  // Combinação de dribbling + speed para "dribbling speed"
  const dribblingSpeed =
    dribblingSkill * 0.6 + pace * 0.25 + acceleration * 0.15;

  // Base: 70 é neutro
  if (dribblingSpeed <= 70) {
    return 0.9; // Abaixo da média
  }

  // Correlação r=0.81 significa forte impacto
  // Para cada 10 pontos acima de 70, +10% de probabilidade
  const bonus = (dribblingSpeed - 70) * 0.01;

  return clamp(1.0 + bonus, 0.8, 1.4);
}

/**
 * v0.5.2: VO₂max por Posição (ml/kg/min)
 * Baseado em várias fontes de performance física
 *
 * | Posição    | VO₂max (ml/kg/min) |
 * |------------|-------------------|
 * | Lateral    | 55-60             |
 * | Meia       | 52-58             |
 * | Atacante   | 48-55             |
 * | Zagueiro   | 48-52             |
 *
 * Correlações:
 * - VO₂max vs Distância alta intensidade: r = 0.65-0.75
 * - VO₂max vs Sprints por jogo: r = 0.45-0.60
 */
export function getPositionVO2maxRange(position: string): {
  min: number;
  max: number;
} {
  const ranges: Record<string, { min: number; max: number }> = {
    // Laterais: máxima demanda aeróbica
    LB: { min: 55, max: 60 },
    RB: { min: 55, max: 60 },
    LWB: { min: 55, max: 60 },
    RWB: { min: 55, max: 60 },
    // Meio-campistas
    CM: { min: 52, max: 58 },
    CDM: { min: 52, max: 58 },
    CAM: { min: 52, max: 56 },
    LM: { min: 53, max: 58 },
    RM: { min: 53, max: 58 },
    // Atacantes
    ST: { min: 48, max: 55 },
    CF: { min: 48, max: 55 },
    LW: { min: 50, max: 56 },
    RW: { min: 50, max: 56 },
    // Zagueiros
    CB: { min: 48, max: 52 },
    // Goleiros
    GK: { min: 45, max: 50 },
  };

  return ranges[position] || { min: 50, max: 55 };
}

/**
 * v0.5.2: Modificador de fadiga baseado em VO₂max estimado
 * Jogadores com melhor VO₂max mantêm performance no final do jogo
 *
 * @param stamina Atributo de stamina do jogador (proxy para VO₂max)
 * @param minute Minuto atual da partida
 * @returns Modificador de performance (0.7 - 1.0)
 */
export function getFatigueModifier(stamina: number, minute: number): number {
  if (minute < 60) {
    return 1.0; // Sem fadiga significativa
  }

  // Fadiga aumenta após 60 minutos
  const fatigueProgress = (minute - 60) / 30; // 0 em 60', 1 em 90'

  // Stamina alto = menos fadiga
  // 100 stamina = apenas -5% em 90'
  // 50 stamina = -25% em 90'
  const fatigueImpact = ((100 - stamina) / 100) * 0.25;

  const modifier = 1.0 - fatigueImpact * fatigueProgress;

  return clamp(modifier, 0.7, 1.0);
}

/**
 * v0.5.2: Gols de Cabeça (Headers)
 * Baseado em: https://www.academia.edu/81810810/Analysis_of_headers_in_high-performance_football
 *
 * | Origem           | % Headers |
 * |------------------|-----------|
 * | Set play         | 54%       |
 * | Open play        | 46%       |
 *
 * @param isSetPiece Se o gol é de bola parada
 * @param headingSkill Atributo de cabeceio
 * @param jumpingSkill Atributo de salto
 * @returns Probabilidade de gol de cabeça
 */
export function getHeaderGoalProbability(
  isSetPiece: boolean,
  headingSkill: number,
  jumpingSkill: number,
): number {
  // Base: ~15% dos gols são de cabeça
  let baseProbability = 0.15;

  // Set pieces: 54% dos headers
  if (isSetPiece) {
    baseProbability *= 1.54; // 54% mais provável
  }

  // Modificador por atributos
  const attributeBonus =
    (headingSkill - 70) * 0.015 + (jumpingSkill - 70) * 0.01;

  return clamp(baseProbability + attributeBonus, 0.05, 0.4);
}

/**
 * Atualiza as estatísticas ultra-detalhadas do jogador após uma partida
 */
export function updateExpandedStatsFromMatch(
  player: Player,
  match: MatchSimulation,
  extendedStats: ExtendedMatchStats,
  matchesThisSeason: number,
  context: {
    isWinning?: boolean;
    isDrawing?: boolean;
    isLosing?: boolean;
    matchMinute?: number;
    isCounter?: boolean;
    oppositionTier?: number;
  } = {},
): void {
  if (!player.expandedData) {
    return; // Player não tem dados expandidos
  }

  const ed = player.expandedData;

  updateAttackingStatsUltra(
    ed.attackingStats,
    match,
    extendedStats,
    player,
    context,
  );
  updateCreationStatsUltra(
    ed.creationStats,
    match,
    extendedStats,
    player,
    context,
  );
  updateDuelStatsUltra(ed.duelStats, match, extendedStats, player, context);
  updateDefensiveStatsUltra(
    ed.defensiveStats,
    match,
    extendedStats,
    player,
    context,
  );
  updateDisciplineStatsUltra(
    ed.disciplineStats,
    match,
    extendedStats,
    player,
    context,
  );
  updateMatchPhysicalStats(
    ed.matchPhysicalStats,
    match,
    matchesThisSeason,
    player,
  );

  // v0.5.2: Atualiza jogadas de efeito baseadas nos traits
  updateFlairPlaysStats(ed.flairPlaysStats, match, player, matchesThisSeason);
}

/**
 * Atualiza estatísticas de ataque ultra-detalhadas
 */
function updateAttackingStatsUltra(
  stats: AttackingStatsUltra,
  match: MatchSimulation,
  extended: ExtendedMatchStats,
  player: Player,
  context: {
    isWinning?: boolean;
    isDrawing?: boolean;
    isLosing?: boolean;
    isCounter?: boolean;
  },
): void {
  const goals = match.goals;
  const shots = match.shots;
  const shotsOnTarget = match.shotsOnTarget;

  // Shots tracking
  stats.shotsTotal += shots;
  stats.shotsOnTarget += shotsOnTarget;
  stats.shotsBlocked += Math.max(
    0,
    shots - shotsOnTarget - rand(0, Math.floor(shots * 0.3)),
  );

  // v0.5.2: Usar xG real do goalSimulator quando disponível
  if (match.xGMatch !== undefined && match.xGMatch > 0) {
    stats.xG += match.xGMatch;
  } else {
    // Fallback: xG estimation (simplified)
    const xGPerShot = calculateXGPerShot(player);
    const matchXG = shots * xGPerShot * randFloat(0.8, 1.2);
    stats.xG += matchXG;
  }

  // Shot conversion
  if (stats.shotsTotal > 0) {
    stats.shotConversionRate = ((extended.goals || 0) / stats.shotsTotal) * 100;
    stats.shotsOnTargetPercentage =
      (stats.shotsOnTarget / stats.shotsTotal) * 100;
  }

  // v0.5.2: Usar dados detalhados de gols com modificadores baseados no perfil do jogador
  // Integração de 175+ fontes científicas
  if (goals > 0) {
    // Distribuição base: 175+ fontes científicas
    // Temporal dynamics: χ² ≈ 288.62, p = 3.72×10⁻²¹ (altamente significativo)
    // Dados: 0-15 (8%), 15-30 (12%), 30-45 (15%), 45-60 (14%), 60-75 (18%), 75-90+ (33%)
    const baseWeights = [0.08, 0.12, 0.15, 0.14, 0.18, 0.33];

    // 1. Modificadores do perfil do jogador (posição, físico, mental, traits)
    const playerModifiers = calculatePlayerTimingModifiers(player);

    // 2. Modificadores de transição (contra-ataque 3.4x mais efetivo)
    const isCounter = context.isCounter || false;
    const transitionModifiers = getTransitionModifier(isCounter);

    // 3. Modificadores de diferença de placar
    let scoreDiff = 0;
    if (context.isWinning) scoreDiff = 1;
    else if (context.isLosing) scoreDiff = -1;
    const scoreModifiers = getScoreDifferentialModifiers(scoreDiff);

    // 4. Combinar todos os modificadores
    const combinedModifiers = playerModifiers.map((mod, i) => {
      return mod * transitionModifiers[i] * scoreModifiers[i];
    });

    // 5. Aplicar com variância natural
    const adjustedWeights = applyTimingModifiersWithVariance(
      baseWeights,
      combinedModifiers,
    );

    // Distribuir cada gol individualmente usando seleção ponderada
    for (let g = 0; g < goals; g++) {
      const selectedPeriod = selectPeriodWithVariance(adjustedWeights);

      switch (selectedPeriod) {
        case 0:
          stats.goals0to15++;
          break;
        case 1:
          stats.goals15to30++;
          break;
        case 2:
          stats.goals30to45++;
          break;
        case 3:
          stats.goals45to60++;
          break;
        case 4:
          stats.goals60to75++;
          break;
        case 5:
          stats.goals75to90Plus++;
          break;
      }
    }

    // v0.5.2: Usar dados de pé do goalSimulator quando disponíveis
    // O goalSimulator gera leftFootGoals/rightFootGoals diretamente no match
    if (
      match.leftFootGoals !== undefined ||
      match.rightFootGoals !== undefined
    ) {
      // Dados novos do goalSimulator
      const leftFootGoals = match.leftFootGoals ?? 0;
      const rightFootGoals = match.rightFootGoals ?? 0;
      const headedGoals = match.headedGoals ?? 0;

      // Determinar qual é o pé forte baseado na preferência do jogador
      const preferredFoot = player.stats.preferredFoot;
      if (preferredFoot === "Left") {
        stats.goalsStrongFoot += leftFootGoals;
        stats.goalsWeakFoot += rightFootGoals;
      } else if (preferredFoot === "Right") {
        stats.goalsStrongFoot += rightFootGoals;
        stats.goalsWeakFoot += leftFootGoals;
      } else {
        // Both ou undefined - dividir igualmente
        stats.goalsStrongFoot += Math.ceil(
          (leftFootGoals + rightFootGoals) / 2,
        );
        stats.goalsWeakFoot += Math.floor((leftFootGoals + rightFootGoals) / 2);
      }
      stats.goalsHeader += headedGoals;
    } else {
      // Fallback: usar dados do extended (sistema antigo)
      stats.goalsStrongFoot += extended.goalsStrongFoot || 0;
      stats.goalsWeakFoot += extended.goalsWeakFoot || 0;
      stats.goalsHeader += extended.headedGoals || 0;
    }

    // v0.5.2: Usar dados de localização do goalSimulator quando disponíveis
    if (
      match.goalsInsideBox !== undefined ||
      match.goalsOutsideBox !== undefined
    ) {
      stats.goalsInsideBox += match.goalsInsideBox ?? 0;
      stats.goalsOutsideBox += match.goalsOutsideBox ?? 0;
    } else {
      // Fallback: usar dados do extended (sistema antigo)
      stats.goalsInsideBox += extended.goalsFromInsideBox || 0;
      stats.goalsOutsideBox += extended.goalsFromOutsideBox || 0;
    }

    // v0.5.2: Golazos do goalSimulator
    if (match.golazos !== undefined && match.golazos > 0) {
      stats.golazosCount += match.golazos;
    }

    // Situation-based goals
    if (context.isDrawing || context.isLosing) {
      stats.goalsWhenDrawingOrLosing += Math.min(goals, rand(1, goals));
    }
    if (context.isCounter) {
      stats.goalsOnCounter += Math.min(goals, rand(0, 1));
    }

    // v0.5.2: Usa dados do goalSimulator ao invés de random
    // Game-winning goals (gol que garantiu a vitória)
    if (match.gameWinningGoals !== undefined) {
      stats.gameWinningGoals += match.gameWinningGoals;
    } else if (context.isWinning && goals > 0 && Math.random() < 0.25) {
      // Fallback apenas se os dados não vierem do goalSimulator
      stats.gameWinningGoals += 1;
    }

    // Equalizer goals (gol que empatou o jogo)
    if (match.equalizerGoals !== undefined) {
      stats.equalizerGoals += match.equalizerGoals;
    } else if (context.isDrawing && Math.random() < 0.3) {
      // Fallback
      stats.equalizerGoals += 1;
    }

    // Special goals - usa dados do goalSimulator se disponíveis
    if (match.golazos === undefined && Math.random() < 0.05) {
      stats.golazosCount += 1; // 5% chance de um gol ser um golaço (fallback)
    }
  }

  // One-on-one tracking
  const oneOnOneChances = rand(0, Math.ceil(shots * 0.2));
  if (oneOnOneChances > 0) {
    const oneOnOneConversions = Math.min(
      oneOnOneChances,
      rand(0, Math.min(goals, oneOnOneChances)),
    );
    stats.oneOnOneConverted += oneOnOneConversions;
    stats.oneOnOneMissed += oneOnOneChances - oneOnOneConversions;
  }

  // Sitters wasted (big chances missed)
  if (shots > goals && Math.random() < 0.15) {
    stats.sittersWasted += rand(0, Math.max(0, shots - goals));
  }

  // Physical shot data
  if (match.goals > 0) {
    const avgShotSpeed = 80 + player.stats.shotPower * 0.3 + randFloat(-5, 10);
    stats.averageShotSpeed = stats.averageShotSpeed
      ? (stats.averageShotSpeed + avgShotSpeed) / 2
      : avgShotSpeed;

    const maxSpeed = avgShotSpeed + rand(5, 20);
    stats.maxShotSpeedSeason = Math.max(stats.maxShotSpeedSeason, maxSpeed);
  }
}

/**
 * Atualiza estatísticas de criação
 */
function updateCreationStatsUltra(
  stats: CreationStatsUltra,
  match: MatchSimulation,
  extended: ExtendedMatchStats,
  player: Player,
  context: { isCounter?: boolean },
): void {
  const assists = match.assists;
  const keyPasses = match.keyPasses;
  const passes = match.passes;
  const passesCompleted = match.passesCompleted;

  stats.assists += assists;

  // v0.5.2: Distribuir assistências por período - com modificadores científicos
  // Assistências seguem mesma distribuição dos gols (ocorrem no mesmo momento)
  if (assists > 0) {
    // Distribuição base: 175+ fontes científicas
    // Temporal dynamics: χ² ≈ 288.62, p = 3.72×10⁻²¹
    const baseWeights = [0.08, 0.12, 0.15, 0.14, 0.18, 0.33];

    // 1. Modificadores do perfil do jogador (assistentes)
    const playerModifiers = calculatePlayerTimingModifiers(player);

    // 2. Modificadores de transição
    const isCounter = context.isCounter || false;
    const transitionModifiers = getTransitionModifier(isCounter);

    // 3. Combinar modificadores
    const combinedModifiers = playerModifiers.map((mod, i) => {
      return mod * transitionModifiers[i];
    });

    // 4. Aplicar com variância natural
    const adjustedWeights = applyTimingModifiersWithVariance(
      baseWeights,
      combinedModifiers,
    );

    for (let a = 0; a < assists; a++) {
      const selectedPeriod = selectPeriodWithVariance(adjustedWeights);

      switch (selectedPeriod) {
        case 0:
          stats.assists0to15++;
          break;
        case 1:
          stats.assists15to30++;
          break;
        case 2:
          stats.assists30to45++;
          break;
        case 3:
          stats.assists45to60++;
          break;
        case 4:
          stats.assists60to75++;
          break;
        case 5:
          stats.assists75to90Plus++;
          break;
      }
    }
  }

  // xA estimation
  const xAPerKeyPass = calculateXAPerKeyPass(player);
  const matchXA = keyPasses * xAPerKeyPass * randFloat(0.7, 1.3);
  stats.xA += matchXA;

  // Pre-assists (pass before the assist)
  stats.preAssists += Math.round(keyPasses * 0.3 * randFloat(0.5, 1.5));

  // Progressive passes
  const progressivePasses = Math.round(passes * 0.15 * randFloat(0.8, 1.2));
  stats.progressivePassesAttempted += progressivePasses;
  stats.progressivePassesCompleted += Math.round(
    progressivePasses * (passesCompleted / Math.max(passes, 1)),
  );

  // Passes into box
  stats.passesIntoBox += Math.round(keyPasses * 0.7 * randFloat(0.8, 1.2));

  // Breaking lines
  const lineBreakingPasses = Math.round(
    passes * 0.1 * (player.stats.vision / 80) * randFloat(0.7, 1.3),
  );
  stats.passesBreakingMidfield += Math.round(lineBreakingPasses * 0.6);
  stats.passesBreakingDefensiveLine += Math.round(lineBreakingPasses * 0.4);

  // Passes under pressure
  const underPressureAttempts = Math.round(passes * 0.25 * randFloat(0.8, 1.2));
  const underPressureCompleted = Math.round(
    underPressureAttempts *
      (player.stats.composure / 100) *
      randFloat(0.85, 1.15),
  );
  stats.passesUnderPressure += underPressureAttempts;
  stats.passesUnderPressureCompleted += underPressureCompleted;
  if (stats.passesUnderPressure > 0) {
    stats.passesUnderPressurePercentage =
      (stats.passesUnderPressureCompleted / stats.passesUnderPressure) * 100;
  }

  // Long passes
  const longPasses = Math.round(passes * 0.12 * randFloat(0.8, 1.2));
  stats.longPassesAttempted += longPasses;
  stats.longPassesCompleted += Math.round(
    longPasses * (player.stats.passing / 100) * randFloat(0.85, 1.15),
  );

  // Crosses
  const crosses = extended.crosses || Math.round(keyPasses * 0.4);
  stats.crossesAttempted += crosses;
  stats.crossesCompleted += Math.round(
    ((crosses * (player.stats.crossing || player.stats.passing)) / 100) * 0.3,
  );
  stats.crossesLeadingToShot += Math.round(crosses * 0.2 * randFloat(0.7, 1.3));

  // Through balls
  stats.throughBallsCompleted += Math.round(
    keyPasses * 0.25 * (player.stats.vision / 80) * randFloat(0.6, 1.4),
  );

  // Counter attacking passes
  if (context.isCounter) {
    stats.counterAttackingPasses += rand(0, 3);
  }
}

/**
 * Atualiza estatísticas de duelos
 */
function updateDuelStatsUltra(
  stats: DuelStatsUltra,
  match: MatchSimulation,
  extended: ExtendedMatchStats,
  player: Player,
  context: {},
): void {
  const dribbles = match.dribbles;
  const dribblesSucceeded = match.dribblesSucceeded;

  // Touches
  const totalTouches = Math.round(
    (match.passes + dribbles * 3 + match.shots * 2) * randFloat(0.9, 1.1),
  );
  stats.touchesTotal += totalTouches;
  stats.touchesInOppositionBox += Math.round(
    totalTouches * 0.15 * randFloat(0.7, 1.3),
  );

  // Carries
  const progressiveCarries = Math.round(dribbles * 0.6 * randFloat(0.8, 1.2));
  stats.progressiveCarries += progressiveCarries;
  stats.carriesIntoBox += Math.round(progressiveCarries * 0.3);
  stats.carriesUnderPressure += Math.round(progressiveCarries * 0.4);

  // Meters carried (estimativa)
  const avgCarryDistance = 8 + (player.stats.dribbling ?? 50) * 0.1;
  stats.metersCarriedForwardPer90 =
    ((progressiveCarries * avgCarryDistance) / 90) * 90; // Ajusta para per90

  // Dribbles
  stats.dribblesAttempted += dribbles;
  stats.dribblesSuccessful += dribblesSucceeded;
  stats.dribblesStaticOneVOne += Math.round(
    dribbles * 0.3 * randFloat(0.7, 1.3),
  );
  stats.dribblesInTransition += Math.round(
    dribbles * 0.5 * randFloat(0.7, 1.3),
  );

  // Possession lost
  const possessionLost = Math.round(
    dribbles - dribblesSucceeded + (match.passes - match.passesCompleted) * 0.1,
  );
  stats.possessionLostTotal += possessionLost;
  stats.possessionLostDangerousZone += Math.round(
    possessionLost * 0.2 * randFloat(0.5, 1.5),
  );
  stats.badFirstTouches += Math.round(possessionLost * 0.15);

  // Duels from match
  stats.groundDuelsWon += match.groundDuelsWon;
  stats.groundDuelsTotal += match.groundDuels;
  stats.aerialDuelsWon += match.aerialDuelsWon;
  stats.aerialDuelsTotal += match.aerialDuels;

  // Fouls drawn
  stats.foulsDrawnTotal += match.foulsDrawn;
  stats.foulsDrawnDangerousZones += Math.round(
    match.foulsDrawn * 0.3 * randFloat(0.5, 1.5),
  );
}

/**
 * Atualiza estatísticas defensivas
 */
function updateDefensiveStatsUltra(
  stats: DefensiveStatsUltra,
  match: MatchSimulation,
  extended: ExtendedMatchStats,
  player: Player,
  context: {},
): void {
  const tackles = match.tackles;
  const tacklesWon = match.tacklesWon;
  const interceptions = match.interceptions;
  const clearances = match.clearances;
  const blocks = match.blocks;

  // Pressures (estimativa baseada em workrate e posição)
  const pressureBase = ["CDM", "CM", "CAM"].includes(player.position)
    ? 12
    : ["CB", "LB", "RB", "LWB", "RWB"].includes(player.position)
      ? 8
      : ["ST", "CF", "LW", "RW"].includes(player.position)
        ? 6
        : 4;
  const pressures = Math.round(
    ((pressureBase * (player.stats.workRate || 60)) / 60) * randFloat(0.7, 1.3),
  );

  stats.pressuresDefensiveThird += Math.round(pressures * 0.4);
  stats.pressuresMidThird += Math.round(pressures * 0.4);
  stats.pressuresAttackingThird += Math.round(pressures * 0.2);
  stats.pressuresSuccessful += Math.round(
    pressures * 0.35 * (player.stats.defending / 70),
  );

  // Possession recoveries
  const recoveries = Math.round((interceptions + tacklesWon) * 0.7);
  stats.possessionRecoveriesOffensive += Math.round(recoveries * 0.3);
  stats.possessionRecoveries5Seconds += Math.round(recoveries * 0.2);

  // Tackles by zone
  stats.tacklesDefensiveThird += Math.round(tackles * 0.5);
  stats.tacklesMidThird += Math.round(tackles * 0.35);
  stats.tacklesAttackingThird += Math.round(tackles * 0.15);

  // Blocks
  stats.shotBlocksPer90 = (stats.shotBlocksPer90 || 0) + blocks * 0.5;
  stats.passBlocksPer90 = (stats.passBlocksPer90 || 0) + blocks * 0.5;

  // Errors (raro)
  if (Math.random() < 0.03) {
    stats.errorsLeadingToShot += 1;
  }
  if (Math.random() < 0.01) {
    stats.errorsLeadingToGoal += 1;
  }
}

/**
 * Atualiza estatísticas de disciplina
 */
function updateDisciplineStatsUltra(
  stats: DisciplineStatsUltra,
  match: MatchSimulation,
  extended: ExtendedMatchStats,
  player: Player,
  context: {},
): void {
  const foulsCommitted = match.foulsCommitted;

  stats.foulsCommitted += foulsCommitted;

  // Distribute fouls by zone
  stats.foulsDefensiveThird += Math.round(foulsCommitted * 0.45);
  stats.foulsMidThird += Math.round(foulsCommitted * 0.4);
  stats.foulsOffensiveThird += Math.round(foulsCommitted * 0.15);

  // Tactical fouls (rare but important)
  if (foulsCommitted > 0 && Math.random() < 0.15) {
    stats.tacticalFouls += 1;
  }

  // Cards
  if (match.yellowCard) {
    stats.yellowCards += 1;
  }
  if (match.redCard) {
    if (match.yellowCard) {
      stats.secondYellows += 1; // Foi segundo amarelo
    } else {
      stats.directRedCards += 1; // Vermelho direto
    }
  }

  // Penalties
  stats.penaltiesWon += extended.penaltiesWon || 0;
  stats.penaltiesConceded += extended.penaltiesConceded || 0;
}

/**
 * Atualiza estatísticas físicas de partida
 */
function updateMatchPhysicalStats(
  stats: MatchPhysicalStats,
  match: MatchSimulation,
  matchesThisSeason: number,
  player: Player,
): void {
  const minutesPlayed = 90; // Simplificado - considerar substituições no futuro

  stats.minutesPlayedSeason += minutesPlayed;

  // Distance per game (estimativa baseada em posição e stamina)
  const baseDistance = ["CM", "CDM", "CAM", "LM", "RM"].includes(
    player.position,
  )
    ? 11.5
    : ["LWB", "RWB", "LB", "RB"].includes(player.position)
      ? 10.5
      : ["CB"].includes(player.position)
        ? 9.5
        : ["ST", "CF", "LW", "RW"].includes(player.position)
          ? 10.0
          : ["GK"].includes(player.position)
            ? 5.5
            : 10.0;

  const distanceThisMatch =
    baseDistance * (player.stats.stamina / 70) * randFloat(0.9, 1.1);
  stats.distancePerGame =
    (stats.distancePerGame * (matchesThisSeason - 1) + distanceThisMatch) /
    matchesThisSeason;

  // High intensity
  stats.highIntensityDistancePerGame =
    stats.distancePerGame * 0.25 * randFloat(0.8, 1.2);

  // Sprints
  const sprintsThisMatch = Math.round(
    25 * ((player.stats.pace ?? 50) / 70) * randFloat(0.8, 1.2),
  );
  stats.sprintsPerGame =
    (stats.sprintsPerGame * (matchesThisSeason - 1) + sprintsThisMatch) /
    matchesThisSeason;

  // Top speed
  const topSpeed = 28 + (player.stats.pace ?? 50) * 0.08 + randFloat(-1, 2);
  stats.topSprintSpeed = Math.max(stats.topSprintSpeed, topSpeed);

  // Fatigue accumulation (simplified)
  stats.consecutiveGamesWithoutRest += 1;
  if (stats.consecutiveGamesWithoutRest > 3) {
    stats.accumulatedFatigue = clamp(stats.accumulatedFatigue + 5, 0, 100);
  }
}

/**
 * Calcula xG esperado por chute baseado no jogador
 */
function calculateXGPerShot(player: Player): number {
  const finishing = player.stats.finishing || player.stats.shooting;
  const composure = player.stats.composure;
  const positioning = player.stats.positioning;

  // Base xG per shot by position
  const baseXG =
    player.position === "ST"
      ? 0.15
      : player.position === "CF"
        ? 0.13
        : ["LW", "RW", "CAM"].includes(player.position)
          ? 0.11
          : ["CM", "LM", "RM"].includes(player.position)
            ? 0.08
            : 0.05;

  // Modifier based on attributes
  const modifier =
    0.8 + finishing * 0.002 + composure * 0.001 + positioning * 0.001;

  return baseXG * modifier;
}

/**
 * Calcula xA esperado por key pass baseado no jogador
 */
function calculateXAPerKeyPass(player: Player): number {
  const vision = player.stats.vision;
  const passing = player.stats.passing;

  const baseXA = ["CAM", "CM"].includes(player.position)
    ? 0.2
    : ["LW", "RW", "LM", "RM"].includes(player.position)
      ? 0.18
      : ["ST", "CF"].includes(player.position)
        ? 0.15
        : 0.12;

  const modifier = 0.8 + vision * 0.002 + passing * 0.001;

  return baseXA * modifier;
}

/**
 * Reseta as estatísticas de temporada (chamado no início de nova temporada)
 */
export function resetSeasonExpandedStats(player: Player): void {
  if (!player.expandedData) return;

  // Reset attacking stats (keep career totals in separate tracking if needed)
  const attacking = player.expandedData.attackingStats;
  Object.keys(attacking).forEach((key) => {
    (attacking as any)[key] = 0;
  });

  const creation = player.expandedData.creationStats;
  Object.keys(creation).forEach((key) => {
    (creation as any)[key] = 0;
  });

  const duels = player.expandedData.duelStats;
  Object.keys(duels).forEach((key) => {
    (duels as any)[key] = 0;
  });

  const defensive = player.expandedData.defensiveStats;
  Object.keys(defensive).forEach((key) => {
    (defensive as any)[key] = 0;
  });

  const discipline = player.expandedData.disciplineStats;
  Object.keys(discipline).forEach((key) => {
    (discipline as any)[key] = 0;
  });

  const physical = player.expandedData.matchPhysicalStats;
  Object.keys(physical).forEach((key) => {
    if (
      key !== "injuriesByType" &&
      key !== "daysLostToInjuryCareer" &&
      key !== "injuryProneness"
    ) {
      (physical as any)[key] = 0;
    }
  });

  // v0.5.2: Reset flair plays stats
  const flairPlays = player.expandedData.flairPlaysStats;
  if (flairPlays) {
    Object.keys(flairPlays).forEach((key) => {
      (flairPlays as any)[key] = 0;
    });
  }
}

/**
 * Recalcula per-90 stats no final da temporada
 */
export function recalculatePer90Stats(
  player: Player,
  totalMinutes: number,
): void {
  if (!player.expandedData || totalMinutes === 0) return;

  const factor = 90 / totalMinutes;

  // Attacking
  const a = player.expandedData.attackingStats;
  a.xGPer90 = a.xG * factor;

  // Creation
  const c = player.expandedData.creationStats;
  c.assistsPer90 = c.assists * factor;
  c.xAPer90 = c.xA * factor;
  c.keyPassesPer90 = factor; // Already tracked per match

  // Duels
  const d = player.expandedData.duelStats;
  d.dribblesPer90 = d.dribblesSuccessful * factor;

  // Defensive
  const def = player.expandedData.defensiveStats;
  def.pressuresPer90 =
    (def.pressuresDefensiveThird +
      def.pressuresMidThird +
      def.pressuresAttackingThird) *
    factor;
  def.tacklesPer90 =
    (def.tacklesDefensiveThird +
      def.tacklesMidThird +
      def.tacklesAttackingThird) *
    factor;
  def.interceptionsPer90 = factor; // Needs proper tracking
  def.clearancesPer90 = factor; // Needs proper tracking

  // Discipline
  const disc = player.expandedData.disciplineStats;
  disc.foulsPer90 = disc.foulsCommitted * factor;
  if (disc.yellowCards > 0) {
    disc.minutesBetweenCards = totalMinutes / disc.yellowCards;
  }

  // Flair Plays
  const flair = player.expandedData.flairPlaysStats;
  if (flair && flair.totalFlairPlays > 0 && totalMinutes > 0) {
    flair.flairPlaysPerGame = (flair.totalFlairPlays / totalMinutes) * 90;
    flair.flairPlaySuccessRate =
      (flair.successfulFlairPlays / flair.totalFlairPlays) * 100;
  }
}

// ============================================================================
// v0.5.2: FLAIR PLAYS UPDATE - BIDIRECTIONAL TRAIT INTEGRATION
// ============================================================================

/**
 * Calculates frequency multipliers for special skills based on traits
 *
 * BIDIRECTIONAL LOGIC: Having a trait means the player USES that ability frequently
 * Example: Yamal with "Outside Foot Shot" trait does 3-5 trivela passes per game
 */
function getFlairMultipliers(player: Player): {
  chipShot: number;
  trivela: number;
  finesse: number;
  acrobatic: number;
  flair: number;
  trickster: number;
  noLook: number;
  rabona: number;
  power: number;
  longShot: number;
} {
  const levelMul: Record<TraitLevel, number> = {
    Bronze: 2.0,
    Silver: 3.5,
    Gold: 5.0,
    Diamond: 7.0,
  };

  const result = {
    chipShot: 1.0,
    trivela: 1.0,
    finesse: 1.0,
    acrobatic: 1.0,
    flair: 1.0,
    trickster: 1.0,
    noLook: 1.0,
    rabona: 1.0,
    power: 1.0,
    longShot: 1.0,
  };

  for (const trait of player.traits) {
    const mul = levelMul[trait.level] ?? 1.0;

    switch (trait.name) {
      case "Chip Shot":
        result.chipShot *= mul;
        break;
      case "Outside Foot Shot":
        result.trivela *= mul;
        break;
      case "Finesse Shot":
        result.finesse *= mul;
        break;
      case "Acrobatic Finisher":
        result.acrobatic *= mul;
        break;
      case "Power Shot":
        result.power *= mul;
        break;
      case "Long Shots":
      case "Long Shot Taker":
        result.longShot *= mul;
        break;
      case "Flair Player":
      case "Flair":
        result.flair *= mul;
        // Flair boosts everything a bit
        result.chipShot *= 1 + (mul - 1) * 0.3;
        result.trivela *= 1 + (mul - 1) * 0.3;
        result.finesse *= 1 + (mul - 1) * 0.3;
        result.acrobatic *= 1 + (mul - 1) * 0.4;
        result.rabona *= 1 + (mul - 1) * 0.5;
        result.noLook *= 1 + (mul - 1) * 0.5;
        break;
      case "Trickster":
        result.trickster *= mul;
        result.rabona *= mul;
        result.noLook *= mul;
        break;
      case "Dribbling Wizard":
        result.trickster *= 1 + (mul - 1) * 0.5;
        break;
    }
  }

  return result;
}

/**
 * Updates flair plays statistics per match
 *
 * Players with specific traits do MUCH more flair plays
 * Ex: Neymar with Flair Diamond does 10+ skill moves per game
 */
function updateFlairPlaysStats(
  stats: FlairPlaysStats,
  match: MatchSimulation,
  player: Player,
  matchesThisSeason: number,
): void {
  if (!stats) return;

  const muls = getFlairMultipliers(player);
  const flairStat = player.stats.flair ?? 50;
  const dribbling = player.stats.dribbling ?? 50;
  const curve = player.stats.curve ?? 50;
  const finishing = player.stats.finishing ?? 50;
  const agility = player.stats.agility ?? 50;
  const technique = (flairStat + dribbling + curve) / 3;

  // Successful dribbles this match
  const dribbles = match.dribblesSucceeded || 0;
  const shots = match.shots || 0;
  const goals = match.goals || 0;

  // ========================================================================
  // SPECIAL PASSES
  // ========================================================================

  // Trivela passes - affected by Outside Foot Shot trait
  const baseTrivelaPassChance = 0.12 * (technique / 70);
  const trivelaPassesThisMatch = Math.floor(
    (match.passes *
      baseTrivelaPassChance *
      muls.trivela *
      randFloat(0.5, 1.5)) /
      12,
  );
  stats.trivelaPasses += trivelaPassesThisMatch;

  // No-look passes - affected by flair and trickster
  const baseNoLookChance = 0.08 * (flairStat / 70);
  const noLookPassesThisMatch = Math.floor(
    match.keyPasses *
      baseNoLookChance *
      muls.noLook *
      muls.flair *
      randFloat(0.5, 1.5),
  );
  stats.noLookPasses += noLookPassesThisMatch;

  // Backheel passes
  const baseBackheelChance = 0.06 * (flairStat / 70);
  const backheelPassesThisMatch = Math.floor(
    (match.passes * baseBackheelChance * muls.flair * randFloat(0.3, 1.5)) / 25,
  );
  stats.backheelPasses += backheelPassesThisMatch;

  // Rabona passes - very rare
  const baseRabonaPassChance = 0.01 * (flairStat / 80);
  const rabonaPassesThisMatch =
    Math.random() < baseRabonaPassChance * muls.rabona * muls.trickster ? 1 : 0;
  stats.rabonaPasses += rabonaPassesThisMatch;

  // Flaired through balls
  const flairedThroughBallsThisMatch = Math.floor(
    match.keyPasses * 0.15 * (curve / 70) * muls.finesse * randFloat(0.5, 1.5),
  );
  stats.flairedThroughBalls += flairedThroughBallsThisMatch;

  // ========================================================================
  // SPECIAL SHOTS - v0.5.2: Use goalSimulator data when available
  // ========================================================================

  // CHIP SHOTS
  const baseChipChance = 0.04 * (flairStat / 70);
  const chipAttemptsThisMatch = Math.floor(
    shots * baseChipChance * muls.chipShot * randFloat(0.5, 2.0),
  );
  stats.chipShotAttempts += chipAttemptsThisMatch;
  // v0.5.2: Use actual chip shot goals from goalSimulator
  if (match.chipShotGoals !== undefined && match.chipShotGoals > 0) {
    stats.chipShotGoals += match.chipShotGoals;
  } else if (
    chipAttemptsThisMatch > 0 &&
    Math.random() < 0.4 * (finishing / 70)
  ) {
    stats.chipShotGoals += 1;
  }

  // TRIVELA SHOTS
  const baseTrivelaShotChance = 0.06 * (technique / 70);
  const trivelaShotsThisMatch = Math.floor(
    shots * baseTrivelaShotChance * muls.trivela * randFloat(0.5, 1.5),
  );
  stats.trivelaShotAttempts += trivelaShotsThisMatch;
  // v0.5.2: Use actual trivela shot goals from goalSimulator
  if (match.trivelaShotGoals !== undefined && match.trivelaShotGoals > 0) {
    stats.trivelaShotGoals += match.trivelaShotGoals;
  } else if (
    trivelaShotsThisMatch > 0 &&
    Math.random() < 0.15 * (finishing / 70)
  ) {
    stats.trivelaShotGoals += 1;
  }

  // FINESSE SHOTS
  const baseFinesseChance = 0.15 * (curve / 70);
  const finesseShotsThisMatch = Math.floor(
    shots * baseFinesseChance * muls.finesse * randFloat(0.5, 1.5),
  );
  stats.finesseShotAttempts += finesseShotsThisMatch;
  // v0.5.2: Use actual finesse shot goals from goalSimulator
  if (match.finesseShotGoals !== undefined && match.finesseShotGoals > 0) {
    stats.finesseShotGoals += match.finesseShotGoals;
  } else if (
    finesseShotsThisMatch > 0 &&
    Math.random() < 0.2 * (finishing / 70)
  ) {
    stats.finesseShotGoals += Math.min(
      goals,
      Math.floor(finesseShotsThisMatch * 0.2),
    );
  }

  // RABONA SHOTS - very rare
  const baseRabonaShotChance = 0.008 * (flairStat / 80);
  const rabonaShotAttemptsThisMatch =
    Math.random() < baseRabonaShotChance * muls.rabona * muls.trickster ? 1 : 0;
  stats.rabonaShotAttempts += rabonaShotAttemptsThisMatch;
  // v0.5.2: Use actual rabona shot goals from goalSimulator
  if (match.rabonaShotGoals !== undefined && match.rabonaShotGoals > 0) {
    stats.rabonaShotGoals += match.rabonaShotGoals;
  } else if (rabonaShotAttemptsThisMatch > 0 && Math.random() < 0.25) {
    stats.rabonaShotGoals += 1;
  }

  // VOLLEYS
  const baseVolleyChance = 0.05 * (agility / 70);
  const volleyAttemptsThisMatch = Math.floor(
    shots * baseVolleyChance * muls.acrobatic * randFloat(0.5, 1.5),
  );
  stats.volleyAttempts += volleyAttemptsThisMatch;
  // v0.5.2: Use actual volley goals from goalSimulator
  if (match.volleyGoals !== undefined && match.volleyGoals > 0) {
    stats.volleyGoals += match.volleyGoals;
  } else if (
    volleyAttemptsThisMatch > 0 &&
    Math.random() < 0.18 * (finishing / 70)
  ) {
    stats.volleyGoals += 1;
  }

  // BICYCLE KICKS - very rare
  const baseBicycleChance = 0.01 * (agility / 80) * (flairStat / 80);
  const bicycleAttemptsThisMatch =
    Math.random() < baseBicycleChance * muls.acrobatic * muls.flair ? 1 : 0;
  stats.bicycleKickAttempts += bicycleAttemptsThisMatch;
  // v0.5.2: Use actual bicycle kick goals from goalSimulator
  if (match.bicycleKickGoals !== undefined && match.bicycleKickGoals > 0) {
    stats.bicycleKickGoals += match.bicycleKickGoals;
  } else if (bicycleAttemptsThisMatch > 0 && Math.random() < 0.15) {
    stats.bicycleKickGoals += 1;
  }

  // SCORPION KICKS - extremely rare
  const baseScorpionChance = 0.002 * (flairStat / 90) * (agility / 90);
  const scorpionAttemptsThisMatch =
    Math.random() < baseScorpionChance * muls.acrobatic * muls.flair ? 1 : 0;
  stats.scorpionKickAttempts += scorpionAttemptsThisMatch;
  if (scorpionAttemptsThisMatch > 0 && Math.random() < 0.1) {
    stats.scorpionKickGoals += 1;
  }

  // POWER SHOTS - new in v0.5.2
  const basePowerShotChance = (0.08 * (player.stats.shotPower ?? 70)) / 70;
  const powerShotAttemptsThisMatch = Math.floor(
    shots * basePowerShotChance * muls.power * randFloat(0.5, 1.5),
  );
  stats.powerShotAttempts += powerShotAttemptsThisMatch;
  if (match.powerShotGoals !== undefined && match.powerShotGoals > 0) {
    stats.powerShotGoals += match.powerShotGoals;
  } else if (
    powerShotAttemptsThisMatch > 0 &&
    Math.random() < 0.12 * (finishing / 70)
  ) {
    stats.powerShotGoals += 1;
  }

  // ========================================================================
  // SPECIAL DRIBBLES
  // ========================================================================

  // ELASTICOS (flip-flap)
  const elasticoChance = 0.08 * (dribbling / 70) * muls.trickster * muls.flair;
  const elasticosThisMatch = Math.floor(
    (dribbles * elasticoChance * randFloat(0.3, 1.5)) / 4,
  );
  stats.elasticos += elasticosThisMatch;

  // STEP OVERS
  const stepOverChance = 0.18 * (dribbling / 70) * muls.trickster;
  const stepOversThisMatch = Math.floor(
    (dribbles * stepOverChance * randFloat(0.5, 1.5)) / 2,
  );
  stats.stepOvers += stepOversThisMatch;

  // NUTMEGS
  const nutmegChance = 0.06 * (flairStat / 70) * muls.flair * muls.trickster;
  const nutmegsThisMatch = Math.floor(
    (dribbles * nutmegChance * randFloat(0.5, 1.5)) / 5,
  );
  stats.nutmegs += nutmegsThisMatch;

  // RAINBOW FLICKS (lambretas)
  const rainbowChance = 0.015 * (flairStat / 80) * muls.trickster * muls.flair;
  const rainbowsThisMatch =
    dribbles > 2 && Math.random() < rainbowChance ? 1 : 0;
  stats.rainbowFlicks += rainbowsThisMatch;

  // SOMBREREOS (simple lobs)
  const sombreroChance = 0.04 * (flairStat / 70) * muls.flair;
  const sombrereosThisMatch = Math.floor(
    (dribbles * sombreroChance * randFloat(0.3, 1.5)) / 6,
  );
  stats.sombrereos += sombrereosThisMatch;

  // ROULETTES (Maradona/Zidane turn)
  const rouletteChance = 0.1 * (dribbling / 70) * muls.trickster;
  const roulettesThisMatch = Math.floor(
    (dribbles * rouletteChance * randFloat(0.5, 1.5)) / 4,
  );
  stats.roulettes += roulettesThisMatch;

  // LA CROQUETAS (sharp cuts)
  const laCroquetaChance = 0.12 * (agility / 70) * muls.trickster;
  const laCroquetasThisMatch = Math.floor(
    (dribbles * laCroquetaChance * randFloat(0.5, 1.5)) / 3,
  );
  stats.laCroquetas += laCroquetasThisMatch;

  // SKILL MOVES (generic)
  const skillMoveChance = 0.08 * (flairStat / 70) * muls.flair * muls.trickster;
  const skillMovesThisMatch = Math.floor(
    (dribbles * skillMoveChance * randFloat(0.5, 1.5)) / 3,
  );
  stats.skillMoves += skillMovesThisMatch;

  // KEEPY UPPIES during play - very rare
  const keepyUppyChance =
    0.005 * (flairStat / 85) * muls.flair * muls.trickster;
  const keepyUppiesThisMatch = Math.random() < keepyUppyChance ? 1 : 0;
  stats.keepyUppies += keepyUppiesThisMatch;

  // FLAIR TACKLES - for defenders with flair
  const isDefender = ["CB", "LB", "RB", "CDM", "LWB", "RWB"].includes(
    player.position,
  );
  const flairTackleChance = isDefender
    ? 0.03 * (flairStat / 70) * muls.flair
    : 0.005;
  const flairTacklesThisMatch =
    match.tackles > 0 && Math.random() < flairTackleChance ? 1 : 0;
  stats.flairTackles += flairTacklesThisMatch;

  // ========================================================================
  // SPECIAL CROSSES
  // ========================================================================

  const isWinger = ["LW", "RW", "LM", "RM", "LWB", "RWB", "LB", "RB"].includes(
    player.position,
  );
  const estimatedCrosses = isWinger
    ? Math.floor(match.passes * 0.08)
    : Math.floor(match.passes * 0.02);

  let trivelaCrossesThisMatch = 0;
  let rabonaCrossesThisMatch = 0;
  let backheelCrossesThisMatch = 0;

  if (estimatedCrosses > 0) {
    trivelaCrossesThisMatch = Math.floor(
      estimatedCrosses * 0.08 * muls.trivela * randFloat(0.5, 1.5),
    );
    stats.trivelaCrosses += trivelaCrossesThisMatch;

    if (Math.random() < 0.015 * muls.rabona * muls.trickster) {
      rabonaCrossesThisMatch = 1;
      stats.rabonaCrosses += 1;
    }

    if (Math.random() < 0.02 * muls.flair) {
      backheelCrossesThisMatch = 1;
      stats.backheelCrosses += 1;
    }
  }

  // ========================================================================
  // SPECIAL SET PIECES
  // ========================================================================

  const hasPenalty = match.goals > 0 && Math.random() < 0.1;
  const hasFreeKick = match.goals > 0 && Math.random() < 0.05;

  if (hasPenalty) {
    if (Math.random() < 0.15 * muls.flair) {
      stats.stutterStepPenalties += 1;
    }
    if (Math.random() < 0.05 * muls.chipShot * muls.flair) {
      stats.panenkaPenalties += 1;
    }
  }

  if (hasFreeKick) {
    if (Math.random() < 0.2 * muls.power) {
      stats.knuckleballFreeKicks += 1;
    }
    if (Math.random() < 0.3 * muls.finesse) {
      stats.curlingFreeKicks += 1;
    }
  }

  // ========================================================================
  // BONUS - CELEBRATIONS
  // ========================================================================

  if (goals > 0 && Math.random() < 0.1 * muls.flair) {
    stats.iconicCelebrations += 1;
  }

  // ========================================================================
  // TOTALS AND RATES
  // ========================================================================

  const flairThisMatch =
    trivelaPassesThisMatch +
    noLookPassesThisMatch +
    backheelPassesThisMatch +
    rabonaPassesThisMatch +
    chipAttemptsThisMatch +
    trivelaShotsThisMatch +
    finesseShotsThisMatch +
    rabonaShotAttemptsThisMatch +
    volleyAttemptsThisMatch +
    bicycleAttemptsThisMatch +
    scorpionAttemptsThisMatch +
    elasticosThisMatch +
    stepOversThisMatch +
    nutmegsThisMatch +
    rainbowsThisMatch +
    sombrereosThisMatch +
    roulettesThisMatch +
    laCroquetasThisMatch +
    skillMovesThisMatch +
    keepyUppiesThisMatch +
    flairTacklesThisMatch +
    trivelaCrossesThisMatch +
    rabonaCrossesThisMatch +
    backheelCrossesThisMatch;

  stats.totalFlairPlays += flairThisMatch;

  // Successful flair plays (estimate based on technique)
  const successRate = clamp(technique / 100, 0.3, 0.85);
  stats.successfulFlairPlays += Math.round(flairThisMatch * successRate);

  // Recalculate averages
  if (matchesThisSeason > 0) {
    stats.flairPlaysPerGame = stats.totalFlairPlays / matchesThisSeason;
    stats.flairPlaySuccessRate =
      stats.totalFlairPlays > 0
        ? (stats.successfulFlairPlays / stats.totalFlairPlays) * 100
        : 0;
  }
}
