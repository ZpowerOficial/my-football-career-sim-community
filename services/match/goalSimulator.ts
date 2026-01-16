/**
 * GOAL SIMULATOR - v0.5.2 INTEGRADO
 *
 * Sistema de simulação de gols que usa TODOS os dados disponíveis:
 * - player.stats (base)
 * - player.expandedData (ultra-detalhado)
 * - 175+ fontes científicas (distribuição, posição, set pieces)
 *
 * Cada gol simulado retorna detalhes completos:
 * - Qual pé foi usado
 * - Se foi de cabeça
 * - Posição do chute (dentro/fora da área)
 * - Minuto do gol
 * - Tipo de gol (normal, golaço, pênalti, etc.)
 * - Se foi decisivo
 * - Se foi de bola parada (37% dos gols)
 */

import type { Player } from "../../types";
import { rand, randFloat, clamp } from "../utils";
import {
  getPositionConversionRate,
  getPositionScoringWeight,
  getSetPiecePositionWeight,
  getSetPieceAttributeMultiplier,
  getHomeAdvantageModifier,
  getDribblingSpeedGoalMultiplier,
  getFatigueModifier,
  getHeaderGoalProbability,
  getCrossingGoalProbability,
} from "./expandedStatsUpdater";

// ============================================================================
// TIPOS
// ============================================================================

export type GoalFoot = "left" | "right" | "head";
export type GoalLocation = "insideBox" | "outsideBox" | "penalty";
export type GoalType =
  | "normal"
  | "golazo"
  | "penalty"
  | "freeKick"
  | "ownGoal"
  | "tap-in"
  | "header"
  | "volley"
  | "corner";

// v0.5.2: Tipo de bola parada (37% dos gols)
export type SetPieceType = "penalty" | "freekick" | "corner" | "none";

export interface SimulatedGoal {
  minute: number;
  foot: GoalFoot;
  location: GoalLocation;
  type: GoalType;
  xG: number;
  isDecisive: boolean;
  isEqualizer: boolean;
  isWinner: boolean;
  isOnCounter: boolean;
  // v0.5.2: Set piece info (40% of goals from set pieces)
  isSetPiece: boolean;
  setPieceType: SetPieceType;
  shotSpeed?: number;
}

export interface GoalSimulationResult {
  totalGoals: number;
  goals: SimulatedGoal[];
  totalShots: number;
  shotsOnTarget: number;
  shotsBlocked: number;
  shotsOffTarget: number;
  // Agregados
  leftFootGoals: number;
  rightFootGoals: number;
  headedGoals: number;
  goalsInsideBox: number;
  goalsOutsideBox: number;
  penaltyGoals: number;
  golazos: number;
  xGTotal: number;
  // v0.5.2: Estatísticas de gols contextuais
  gameWinningGoals: number;
  equalizerGoals: number;
  decisiveGoals: number;
  // v0.5.2: Estatísticas de chutes especiais
  chipShotGoals: number;
  trivelaShotGoals: number;
  finesseShotGoals: number;
  powerShotGoals: number;
  volleyGoals: number;
  bicycleKickGoals: number;
  rabonaShotGoals: number;
}

export interface ShotAttempt {
  minute: number;
  foot: GoalFoot;
  location: GoalLocation;
  xG: number;
  isOnTarget: boolean;
  isGoal: boolean;
  isBlocked: boolean;
  specialShotType: SpecialShotType;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Calcula a probabilidade de usar cada pé baseado nos dados do jogador
 */
function calculateFootProbabilities(player: Player): {
  left: number;
  right: number;
  head: number;
} {
  const stats = player.stats;
  const expanded = player.expandedData;

  // Valores base
  const preferredFoot =
    stats.preferredFoot || expanded?.physicalProfile?.preferredFoot || "Right";
  const weakFoot =
    stats.weakFoot ?? expanded?.physicalProfile?.weakFootLevel ?? 3;

  // Finalização por pé (usa dados expandidos se disponíveis)
  const leftFin = stats.leftFootFinishing ?? stats.shooting ?? 70;
  const rightFin = stats.rightFootFinishing ?? stats.shooting ?? 70;

  // Heading ability
  const heading = stats.heading ?? 70;
  const jumping = stats.jumping ?? 70;
  const headingAbility = heading * 0.7 + jumping * 0.3;

  // v0.5.2: Altura influencia probabilidade de gols de cabeça
  const height = expanded?.physicalProfile?.height ?? 180;
  // Jogadores altos (>185cm) têm mais chance de cabecear, baixos (<175cm) têm menos
  const heightModifier = 1 + (height - 180) / 50; // +-20% para altura extrema

  // Calcula probabilidades brutas baseadas nas habilidades
  let leftProb = leftFin / 100;
  let rightProb = rightFin / 100;
  let headProb = (headingAbility / 100) * 0.5 * heightModifier; // Cabeça é menos frequente, mas altura ajuda

  // Ajusta baseado no pé preferido
  if (preferredFoot === "Left") {
    leftProb *= 1.4;
    rightProb *= 0.6 + weakFoot / 10; // Weak foot aumenta uso do pé fraco
  } else if (preferredFoot === "Right") {
    rightProb *= 1.4;
    leftProb *= 0.6 + weakFoot / 10;
  } else {
    // Ambidestro - equilibrado
    leftProb *= 1.1;
    rightProb *= 1.1;
  }

  // Ajustes por posição - zagueiros cabeceiam mais, pontas menos
  const position = player.position;
  if (["CB", "GK"].includes(position)) {
    headProb *= 2.0;
  } else if (["LW", "RW", "LM", "RM"].includes(position)) {
    headProb *= 0.5;
  } else if (["ST", "CF"].includes(position)) {
    headProb *= 1.2;
  }

  // Normaliza para somar 1
  const total = leftProb + rightProb + headProb;
  return {
    left: leftProb / total,
    right: rightProb / total,
    head: headProb / total,
  };
}

/**
 * v0.5.2: Tipos de chute especial que podem ser usados
 */
export type SpecialShotType =
  | "normal" // Chute comum
  | "chipShot" // Cavadinha
  | "trivela" // Chute de trivela (3 dedos)
  | "finesse" // Chute colocado
  | "power" // Bomba / Power shot
  | "rabona" // Letra
  | "volley" // Voleio
  | "bicycle" // Bicicleta
  | "scorpion"; // Escorpião

/**
 * v0.5.2: Calcula os bônus de xG baseado nos traits do jogador
 *
 * Traits influenciam a EFETIVIDADE do tipo de chute especial:
 * - Chip Shot trait = cavadinhas mais efetivas (maior xG)
 * - Outside Foot Shot trait = trivelas mais efetivas
 * - Finesse Shot trait = chutes colocados mais efetivos
 * - Power Shot trait = bomba mais efetiva
 * - Acrobatic Finisher trait = voleios/bicicletas mais efetivos
 *
 * Multiplicadores por nível:
 * - Bronze: +10% xG no tipo de chute
 * - Silver: +20% xG
 * - Gold: +35% xG
 * - Diamond: +50% xG
 */
function getTraitXGBonuses(player: Player): {
  chipShot: number;
  trivela: number;
  finesse: number;
  power: number;
  acrobatic: number;
  longShot: number;
  flair: number;
} {
  const levelBonus: Record<string, number> = {
    Bronze: 0.1,
    Silver: 0.2,
    Gold: 0.35,
    Diamond: 0.5,
  };

  const bonuses = {
    chipShot: 0,
    trivela: 0,
    finesse: 0,
    power: 0,
    acrobatic: 0,
    longShot: 0,
    flair: 0,
  };

  for (const trait of player.traits) {
    const bonus = levelBonus[trait.level] ?? 0;

    switch (trait.name) {
      case "Chip Shot":
        bonuses.chipShot += bonus;
        break;
      case "Outside Foot Shot":
        bonuses.trivela += bonus;
        break;
      case "Finesse Shot":
        bonuses.finesse += bonus;
        break;
      case "Power Shot":
        bonuses.power += bonus;
        break;
      case "Acrobatic Finisher":
        bonuses.acrobatic += bonus;
        break;
      case "Long Shots":
      case "Long Shot Taker":
        bonuses.longShot += bonus;
        break;
      case "Flair":
      case "Flair Player":
        bonuses.flair += bonus * 0.5; // Flair dá bônus menor mas a tudo
        break;
    }
  }

  return bonuses;
}

/**
 * v0.5.2: Decide que tipo de chute especial será usado
 * baseado nos traits do jogador (bidirectional trait logic)
 *
 * Jogadores com traits USAM esse tipo de chute com mais frequência
 * Ex: Jogador com Chip Shot Diamond tenta cavadinhas muito mais vezes
 */
function decideSpecialShotType(
  player: Player,
  location: GoalLocation,
  foot: GoalFoot,
): SpecialShotType {
  const flair = player.stats.flair ?? 50;
  const agility = player.stats.agility ?? 50;

  // Multiplicadores de frequência baseado em traits
  const levelMul: Record<string, number> = {
    Bronze: 2.0,
    Silver: 3.5,
    Gold: 5.0,
    Diamond: 7.0,
  };

  let chipChance = 0.02 * (flair / 70);
  let trivelaChance = 0.03 * (flair / 70);
  let finesseChance = 0.08;
  let powerChance = 0.05;
  let volleyChance = foot === "head" ? 0 : 0.02;
  let bicycleChance = foot === "head" ? 0.01 : 0;
  let rabonaChance = 0.005 * (flair / 80);
  let scorpionChance = 0.001 * (flair / 90) * (agility / 80);

  // Traits multiplicam frequência
  for (const trait of player.traits) {
    const mul = levelMul[trait.level] ?? 1.0;

    switch (trait.name) {
      case "Chip Shot":
        chipChance *= mul;
        break;
      case "Outside Foot Shot":
        trivelaChance *= mul;
        break;
      case "Finesse Shot":
        finesseChance *= mul;
        break;
      case "Power Shot":
        powerChance *= mul;
        break;
      case "Acrobatic Finisher":
        volleyChance *= mul;
        bicycleChance *= mul * 1.5;
        scorpionChance *= mul * 2;
        break;
      case "Flair":
      case "Flair Player":
        chipChance *= 1 + (mul - 1) * 0.3;
        rabonaChance *= mul;
        scorpionChance *= 1 + (mul - 1) * 0.5;
        break;
      case "Trickster":
        rabonaChance *= mul;
        break;
    }
  }

  // Ajustes por localização
  if (location === "penalty") {
    // Pênaltis podem ser cavadinha (Panenka) ou power
    chipChance *= 0.5; // Cavadinha em pênalti é rara
    finesseChance = 0.15; // Comum colocar
    powerChance = 0.3; // Comum bater forte
    trivelaChance = 0.05;
    volleyChance = 0;
    bicycleChance = 0;
    rabonaChance = 0;
    scorpionChance = 0;
  } else if (location === "outsideBox") {
    // De fora: trivela, finesse, power são mais comuns
    trivelaChance *= 1.5;
    finesseChance *= 1.3;
    powerChance *= 1.5;
    chipChance *= 0.3; // Cavadinha de fora é rara
    volleyChance *= 1.2; // Voleio de fora acontece
  }

  // Cabeceios não podem ser trivela, finesse, rabona, etc.
  if (foot === "head") {
    chipChance = 0;
    trivelaChance = 0;
    finesseChance = 0;
    powerChance = 0.1; // Cabeçada "powerosa"
    rabonaChance = 0;
  }

  // Sorteia tipo
  const roll = Math.random();
  let cumulative = 0;

  cumulative += scorpionChance;
  if (roll < cumulative) return "scorpion";

  cumulative += bicycleChance;
  if (roll < cumulative) return "bicycle";

  cumulative += rabonaChance;
  if (roll < cumulative) return "rabona";

  cumulative += volleyChance;
  if (roll < cumulative) return "volley";

  cumulative += chipChance;
  if (roll < cumulative) return "chipShot";

  cumulative += trivelaChance;
  if (roll < cumulative) return "trivela";

  cumulative += finesseChance;
  if (roll < cumulative) return "finesse";

  cumulative += powerChance;
  if (roll < cumulative) return "power";

  return "normal";
}

/**
 * Calcula xG para um chute baseado em localização, pé, atributos E TRAITS
 *
 * v0.5.2: Traits agora influenciam diretamente o xG:
 * - Tipo de chute especial é determinado pelos traits (bidirectional)
 * - xG recebe bônus baseado no trait correspondente
 */
function calculateShotXG(
  player: Player,
  foot: GoalFoot,
  location: GoalLocation,
): { xG: number; specialShotType: SpecialShotType } {
  const stats = player.stats;
  const expanded = player.expandedData;
  const tech = expanded?.technicalAttributes;
  const fin = tech?.finishing;

  // v0.5.2: Decide o tipo de chute especial baseado nos traits
  const specialShotType = decideSpecialShotType(player, location, foot);
  const traitBonuses = getTraitXGBonuses(player);

  // Base xG por localização (dados realistas)
  let baseXG = 0.1; // Média
  if (location === "penalty") {
    baseXG = 0.76; // Pênaltis convertem ~76%
  } else if (location === "insideBox") {
    baseXG = 0.18; // Chutes dentro da área
  } else {
    baseXG = 0.04; // Chutes de fora
  }

  // Modificador por habilidade de finalização
  let finishingSkill = 70;
  if (location === "insideBox") {
    finishingSkill =
      fin?.finishingInsideBox ?? stats.finishing ?? stats.shooting ?? 70;
  } else if (location === "outsideBox") {
    finishingSkill =
      fin?.finishingOutsideBox ?? stats.longShots ?? stats.shooting ?? 65;
  } else {
    // Pênalti - penaltyTaking está em setPieces, não em finishing
    finishingSkill = tech?.setPieces?.penaltyTaking ?? stats.composure ?? 75;
  }

  // Modificador por pé usado
  let footModifier = 1.0;
  if (foot === "left") {
    const leftFin = stats.leftFootFinishing ?? stats.shooting ?? 70;
    footModifier = leftFin / 70;
  } else if (foot === "right") {
    const rightFin = stats.rightFootFinishing ?? stats.shooting ?? 70;
    footModifier = rightFin / 70;
  } else {
    // Cabeça
    const heading = stats.heading ?? 70;
    const jumping = stats.jumping ?? 70;
    footModifier = (heading * 0.7 + jumping * 0.3) / 70;
  }

  // v0.5.2: Modificador por potência de chute (shotPower)
  const shotPower = fin?.shotPower ?? stats.shotPower ?? 70;
  let powerModifier = 1.0;
  if (foot !== "head") {
    if (location === "outsideBox") {
      powerModifier = 0.85 + (shotPower / 100) * 0.3;
    } else if (location === "insideBox") {
      powerModifier = 0.95 + (shotPower / 100) * 0.1;
    }
  }

  // v0.5.2: Modificador por tipo de chute especial + trait bonus
  let specialShotModifier = 1.0;

  switch (specialShotType) {
    case "chipShot":
      // Cavadinhas são arriscadas mas traits ajudam muito
      specialShotModifier = 0.85 + traitBonuses.chipShot + traitBonuses.flair;
      break;
    case "trivela":
      // Trivela é difícil, trait faz diferença
      specialShotModifier =
        0.8 + traitBonuses.trivela + traitBonuses.flair * 0.5;
      break;
    case "finesse":
      // Chute colocado - muito efetivo com trait
      specialShotModifier = 0.95 + traitBonuses.finesse;
      break;
    case "power":
      // Power shot - mais efetivo de longe
      const powerBonus = location === "outsideBox" ? 1.15 : 1.0;
      specialShotModifier = powerBonus + traitBonuses.power;
      break;
    case "volley":
      // Voleio - difícil, mas espetacular
      specialShotModifier =
        0.7 + traitBonuses.acrobatic + traitBonuses.flair * 0.3;
      break;
    case "bicycle":
      // Bicicleta - muito difícil
      specialShotModifier =
        0.5 + traitBonuses.acrobatic * 1.5 + traitBonuses.flair * 0.5;
      break;
    case "scorpion":
      // Escorpião - dificílimo
      specialShotModifier =
        0.3 + traitBonuses.acrobatic * 2 + traitBonuses.flair;
      break;
    case "rabona":
      // Letra - estiloso mas arriscado
      specialShotModifier = 0.6 + traitBonuses.flair * 1.5;
      break;
    default:
      specialShotModifier = 1.0;
  }

  // Aplicar modificadores
  const skillModifier = finishingSkill / 70;

  // v0.5.2: Modificador por posição (175+ fontes científicas)
  // Wang 2020: 63.1% forwards, 28.2% midfielders, 8.7% defenders
  const positionWeight = getPositionScoringWeight(player.position);

  // xG final com todos os modificadores incluindo posição
  let xG =
    baseXG *
    skillModifier *
    footModifier *
    powerModifier *
    specialShotModifier *
    positionWeight;

  // Long shot trait para chutes de fora
  if (location === "outsideBox") {
    xG *= 1 + traitBonuses.longShot;
  }

  // v0.5.2: Dribbling speed multiplier (r=0.81 correlation with goals)
  // Jogadores com alta velocidade de drible marcam mais gols
  if (location !== "penalty") {
    const dribbleMultiplier = getDribblingSpeedGoalMultiplier(
      stats.dribbling ?? 70,
      stats.pace ?? 70,
      stats.acceleration ?? stats.pace ?? 70,
    );
    xG *= dribbleMultiplier;
  }

  // Adiciona variância
  xG *= randFloat(0.85, 1.15);

  return {
    xG: clamp(xG, 0.01, 0.95),
    specialShotType,
  };
}

/**
 * Decide a localização do chute baseado no estilo de jogo e posição
 */
function decideGoalLocation(player: Player): GoalLocation {
  const expanded = player.expandedData;
  const tech = expanded?.technicalAttributes;
  const fin = tech?.finishing;

  // Habilidades expandidas (se disponíveis)
  const insideBoxSkill = fin?.finishingInsideBox ?? 70;
  const outsideBoxSkill = fin?.finishingOutsideBox ?? 60;
  const longShotsBase = player.stats.longShots ?? 60;

  // Probabilidades base ajustadas por habilidade
  let insideProb = 0.75 * (insideBoxSkill / 70);
  let outsideProb = 0.22 * (outsideBoxSkill / 70) * (longShotsBase / 70);
  let penaltyProb = 0.03;

  // Ajuste por posição
  const position = player.position;
  if (["ST", "CF"].includes(position)) {
    insideProb *= 1.2;
    penaltyProb *= 1.5; // Atacantes cobram mais pênaltis
  } else if (["CAM", "CM"].includes(position)) {
    outsideProb *= 1.3;
  } else if (["LW", "RW"].includes(position)) {
    insideProb *= 1.1;
    outsideProb *= 0.9;
  } else if (["CB", "CDM"].includes(position)) {
    // Defensores geralmente cabeceiam em bolas paradas
    insideProb *= 0.9;
    outsideProb *= 0.6;
  }

  // Normaliza
  const total = insideProb + outsideProb + penaltyProb;
  insideProb /= total;
  outsideProb /= total;
  penaltyProb /= total;

  // Sorteia
  const roll = Math.random();
  if (roll < penaltyProb) return "penalty";
  if (roll < penaltyProb + outsideProb) return "outsideBox";
  return "insideBox";
}

/**
 * Decide se um gol é um golaço
 */
function isGolazo(
  player: Player,
  foot: GoalFoot,
  location: GoalLocation,
): boolean {
  // Golaços são raros (3-8% dos gols)
  let golazoChance = 0.05;

  // Aumenta chance para chutes de fora
  if (location === "outsideBox") {
    golazoChance = 0.15;
  }

  // Aumenta para jogadores com flair alto
  const flair = player.stats.flair ?? 70;
  golazoChance *= flair / 70;

  // Voleios e cabeceios acrobáticos
  if (foot === "head" && Math.random() < 0.1) {
    golazoChance = 0.25; // Cabeceios acrobáticos
  }

  // Trait
  const longShotsTrait = player.traits.find((t) => t.name === "Long Shots");
  if (longShotsTrait && location === "outsideBox") {
    const levels = { Bronze: 1.2, Silver: 1.4, Gold: 1.6, Diamond: 2.0 };
    golazoChance *= levels[longShotsTrait.level] ?? 1.0;
  }

  return Math.random() < golazoChance;
}

/**
 * v0.5.2: Gera minuto do gol baseado em distribuição científica
 * Baseado em 175+ fontes científicas
 * Temporal dynamics: χ² ≈ 288.62, p = 3.72×10⁻²¹
 */
function generateGoalMinute(): number {
  // Distribuição de gols por período (175+ fontes científicas)
  // Dados: 0-15 (8%), 15-30 (12%), 30-45 (15%), 45-60 (14%), 60-75 (18%), 75-90+ (33%)
  const periods = [
    { start: 1, end: 15, weight: 0.08 }, // 8% - Defesa fresca
    { start: 16, end: 30, weight: 0.12 }, // 12% - Organização defensiva
    { start: 31, end: 45, weight: 0.15 }, // 15% - Pico pré-intervalo
    { start: 46, end: 60, weight: 0.14 }, // 14% - Adaptação tática
    { start: 61, end: 75, weight: 0.18 }, // 18% - Fadiga iniciando
    { start: 76, end: 90, weight: 0.25 }, // 25% - PICO fadiga crítica
    { start: 91, end: 95, weight: 0.08 }, // 8% - Acréscimos (pressão extrema)
  ];

  // Escolhe período
  let roll = Math.random();
  for (const period of periods) {
    if (roll < period.weight) {
      return rand(period.start, period.end);
    }
    roll -= period.weight;
  }

  return rand(85, 93); // Default: final do jogo + acréscimos
}

// ============================================================================
// SIMULAÇÃO PRINCIPAL
// ============================================================================

/**
 * Simula os chutes de um jogador em uma partida
 */
export function simulateShots(
  player: Player,
  expectedShots: number,
): ShotAttempt[] {
  const shots: ShotAttempt[] = [];
  const footProbs = calculateFootProbabilities(player);

  // Gera número de chutes via Poisson
  let numShots = 0;
  const lambda = Math.max(0.5, expectedShots);
  let p = Math.exp(-lambda);
  let cumulativeP = p;
  const roll = Math.random();

  while (roll > cumulativeP && numShots < 15) {
    numShots++;
    p *= lambda / numShots;
    cumulativeP += p;
  }

  // Gera cada chute
  for (let i = 0; i < numShots; i++) {
    const minute = generateGoalMinute();

    // Decide o pé
    const footRoll = Math.random();
    let foot: GoalFoot = "right";
    if (footRoll < footProbs.left) {
      foot = "left";
    } else if (footRoll < footProbs.left + footProbs.head) {
      foot = "head";
    }

    // Decide localização
    const location = decideGoalLocation(player);

    // Calcula xG com tipo de chute especial (v0.5.2 - trait integration)
    let { xG, specialShotType } = calculateShotXG(player, foot, location);

    // v0.5.2: Aplicar modificador de fadiga baseado no minuto
    // Jogadores com baixa stamina perdem até 25% de xG após 60 min
    const stamina = player.stats.stamina ?? 70;
    const fatigueModifier = getFatigueModifier(stamina, minute);
    xG *= fatigueModifier;

    // Decide resultado
    const isGoal = Math.random() < xG;
    const isOnTarget =
      isGoal || Math.random() < 0.35 + (player.stats.finishing ?? 70) / 200;
    const isBlocked = !isGoal && !isOnTarget && Math.random() < 0.25;

    shots.push({
      minute,
      foot,
      location,
      xG,
      isGoal,
      isOnTarget,
      isBlocked,
      specialShotType,
    });
  }

  return shots.sort((a, b) => a.minute - b.minute);
}

/**
 * Simula gols completos com todos os detalhes
 *
 * LÓGICA DE GOL DECISIVO (v0.5.2):
 * - Game-winning goal: O gol que deixou o time do jogador na frente e nunca mais perdeu a liderança
 * - Equalizer: Gol que empatou a partida
 * - Decisive: Gol que mudou o resultado (empate→vitória, derrota→empate ou vitória)
 *
 * Para isso, simulamos cronologicamente os gols do jogador E do adversário.
 */
export function simulateGoalsDetailed(
  player: Player,
  expectedGoals: number,
  expectedShots: number,
  context: {
    matchImportance?: string | number;
    teamScore?: number; // Placar final do time
    opponentScore?: number; // Placar final do adversário
    isHome?: boolean;
    // v0.5.2: First goal and red card context (175+ sources)
    hasFirstGoal?: boolean; // Time marcou primeiro (75.9% win rate)
    hasRedCard?: boolean; // Time tem jogador expulso
    redCardMinute?: number; // Minuto do cartão vermelho
  } = {},
): GoalSimulationResult {
  // v0.5.2: Home advantage modifier (175+ sources)
  // Casa: +15% intensidade, Fora: -10%
  const homeModifier =
    context.isHome !== undefined
      ? getHomeAdvantageModifier(context.isHome)
      : 1.0;

  // v0.5.2: First goal momentum (75.9% win rate when scoring first)
  // +10% intensity if team scored first
  let momentumBoost = 1.0;
  if (context.hasFirstGoal) {
    momentumBoost = 1.1; // +10% chance de gol
  }

  // v0.5.2: Red card modifier (175+ sources)
  // Time com cartão vermelho perde até 45% da intensidade
  let redCardPenalty = 1.0;
  if (context.hasRedCard) {
    // Importamos a função mas usamos valores diretos aqui para evitar dependência circular
    const redMinute = context.redCardMinute ?? 45;
    if (redMinute < 30) {
      redCardPenalty = 0.55; // -45%
    } else if (redMinute < 45) {
      redCardPenalty = 0.65; // -35%
    } else if (redMinute < 70) {
      redCardPenalty = 0.7; // -30%
    } else {
      redCardPenalty = 0.8; // -20%
    }
    // Home team sofre mais com cartão vermelho
    if (context.isHome) {
      redCardPenalty -= 0.05;
    }
  }

  // Simula todos os chutes
  const shots = simulateShots(player, expectedShots);

  // v0.5.2: Aplica todos os modificadores contextuais a cada chute
  const combinedModifier = homeModifier * momentumBoost * redCardPenalty;
  shots.forEach((shot) => {
    shot.xG *= combinedModifier;
    // Recalcula se é gol baseado no xG ajustado
    if (
      !shot.isGoal &&
      combinedModifier > 1.0 &&
      Math.random() < shot.xG * (combinedModifier - 1)
    ) {
      shot.isGoal = true;
      shot.isOnTarget = true;
    }
  });

  // Filtra gols dos chutes
  let goalShots = shots.filter((s) => s.isGoal);

  // Garante que número de gols seja razoável via expectedGoals
  // (Poisson já foi aplicado nos chutes, mas podemos ajustar)
  const maxGoals = Math.min(goalShots.length, Math.ceil(expectedGoals * 2.5));
  if (goalShots.length > maxGoals) {
    // Mantém os de maior xG
    goalShots.sort((a, b) => b.xG - a.xG);
    goalShots = goalShots.slice(0, maxGoals);
    goalShots.sort((a, b) => a.minute - b.minute);
  }

  // ========================================================================
  // SIMULAÇÃO CONTEXTUAL DE GOLS DECISIVOS (v0.5.2)
  // Simula a sequência cronológica de todos os gols da partida
  // ========================================================================

  const playerGoalsCount = goalShots.length;
  const teamFinalScore = context.teamScore ?? playerGoalsCount;
  const opponentFinalScore = context.opponentScore ?? 0;

  // Gols adicionais do time (companheiros)
  const teammateGoals = Math.max(0, teamFinalScore - playerGoalsCount);

  // Gera minutos para todos os gols da partida
  const allGoalEvents: Array<{
    minute: number;
    isPlayerGoal: boolean;
    playerGoalIndex?: number;
  }> = [];

  // Adiciona gols do jogador
  goalShots.forEach((shot, idx) => {
    allGoalEvents.push({
      minute: shot.minute,
      isPlayerGoal: true,
      playerGoalIndex: idx,
    });
  });

  // Adiciona gols de companheiros
  for (let i = 0; i < teammateGoals; i++) {
    allGoalEvents.push({
      minute: generateGoalMinute(),
      isPlayerGoal: false,
    });
  }

  // Adiciona gols do adversário
  for (let i = 0; i < opponentFinalScore; i++) {
    allGoalEvents.push({
      minute: generateGoalMinute(),
      isPlayerGoal: false,
    });
  }

  // Ordena por minuto
  allGoalEvents.sort((a, b) => a.minute - b.minute);

  // Simula a partida cronologicamente para determinar gols decisivos
  let currentTeamScore = 0;
  let currentOpponentScore = 0;
  let playerGoalIndex = 0;
  let opponentGoalIndex = 0;

  // Rastreia qual gol do jogador colocou o time na frente pela última vez
  let lastGoAheadGoalIndex: number | null = null;

  // Informações de cada gol do jogador
  const playerGoalContext: Array<{
    wasEqualizer: boolean;
    wasGoAhead: boolean;
    scoreBefore: { team: number; opponent: number };
    scoreAfter: { team: number; opponent: number };
  }> = [];

  // Inicializa contextos
  for (let i = 0; i < playerGoalsCount; i++) {
    playerGoalContext.push({
      wasEqualizer: false,
      wasGoAhead: false,
      scoreBefore: { team: 0, opponent: 0 },
      scoreAfter: { team: 0, opponent: 0 },
    });
  }

  // Processa eventos cronologicamente
  for (const event of allGoalEvents) {
    if (event.isPlayerGoal && event.playerGoalIndex !== undefined) {
      // Gol do jogador
      const idx = event.playerGoalIndex;
      const wasLosingOrDrawing = currentTeamScore <= currentOpponentScore;
      const wasTied = currentTeamScore === currentOpponentScore;

      playerGoalContext[idx].scoreBefore = {
        team: currentTeamScore,
        opponent: currentOpponentScore,
      };
      currentTeamScore++;
      playerGoalContext[idx].scoreAfter = {
        team: currentTeamScore,
        opponent: currentOpponentScore,
      };

      // Equalizer: empatou o jogo
      if (currentTeamScore === currentOpponentScore && !wasTied) {
        playerGoalContext[idx].wasEqualizer = true;
      }

      // Go-ahead: colocou na frente
      if (currentTeamScore > currentOpponentScore && wasLosingOrDrawing) {
        playerGoalContext[idx].wasGoAhead = true;
        lastGoAheadGoalIndex = idx;
      }

      playerGoalIndex++;
    } else {
      // Gol de companheiro ou adversário
      // Determina de qual time baseado na contagem
      if (
        playerGoalIndex + (currentTeamScore - playerGoalIndex) <
          teamFinalScore &&
        Math.random() <
          teammateGoals /
            (teammateGoals + opponentFinalScore - opponentGoalIndex)
      ) {
        // Gol de companheiro
        const wasLosingOrDrawing = currentTeamScore <= currentOpponentScore;
        currentTeamScore++;
        // Se foi go-ahead e o time ganhou, invalida lastGoAheadGoalIndex do jogador
        // porque o gol que garantiu a vitória foi de outro
        if (currentTeamScore > currentOpponentScore && wasLosingOrDrawing) {
          // Companheiro fez o go-ahead, então resetamos
          // lastGoAheadGoalIndex continua válido se o jogador já tinha ido na frente
        }
      } else {
        // Gol do adversário
        currentOpponentScore++;
        opponentGoalIndex++;
        // Se adversário empatou ou virou, o lastGoAheadGoalIndex pode ser invalidado
        if (
          currentOpponentScore >= currentTeamScore &&
          lastGoAheadGoalIndex !== null
        ) {
          // O time perdeu a liderança, então o gol anterior não foi "game-winning"
          lastGoAheadGoalIndex = null;
        }
      }
    }
  }

  // Determina qual foi o GAME-WINNING GOAL
  // É o gol que deixou o time na frente E o time terminou ganhando
  const teamWon = teamFinalScore > opponentFinalScore;
  let gameWinningGoalIndex: number | null = null;

  if (teamWon) {
    // Procura o último gol que colocou o time na frente e que não foi superado depois
    // Isso é o lastGoAheadGoalIndex se o jogador fez
    // Precisamos recalcular porque a lógica acima é simplificada

    // Recalcula de forma mais precisa
    currentTeamScore = 0;
    currentOpponentScore = 0;
    let lastPlayerGoAhead: number | null = null;

    for (const event of allGoalEvents) {
      if (event.isPlayerGoal && event.playerGoalIndex !== undefined) {
        const wasLosing = currentTeamScore < currentOpponentScore;
        const wasTied = currentTeamScore === currentOpponentScore;
        currentTeamScore++;
        // Se esse gol colocou na frente
        if (currentTeamScore > currentOpponentScore && (wasLosing || wasTied)) {
          lastPlayerGoAhead = event.playerGoalIndex;
        }
      } else {
        // Tenta determinar se é gol do time ou adversário
        const remainingTeamGoals = teamFinalScore - currentTeamScore;
        const remainingOpponentGoals =
          opponentFinalScore - currentOpponentScore;
        const playerGoalsRemaining =
          playerGoalsCount -
          allGoalEvents.filter(
            (e) => e.isPlayerGoal && e.minute <= event.minute,
          ).length;
        const teammateGoalsRemaining =
          remainingTeamGoals - playerGoalsRemaining;

        // Probabilidade de ser gol do time
        const totalRemaining = teammateGoalsRemaining + remainingOpponentGoals;
        const isTeamGoal =
          totalRemaining > 0 &&
          Math.random() < teammateGoalsRemaining / totalRemaining;

        if (isTeamGoal) {
          const wasLosing = currentTeamScore < currentOpponentScore;
          const wasTied = currentTeamScore === currentOpponentScore;
          currentTeamScore++;
          if (
            currentTeamScore > currentOpponentScore &&
            (wasLosing || wasTied)
          ) {
            // Companheiro fez go-ahead, anula o do jogador
            lastPlayerGoAhead = null;
          }
        } else {
          currentOpponentScore++;
          // Se empatou ou virou, anula
          if (currentOpponentScore >= currentTeamScore) {
            lastPlayerGoAhead = null;
          }
        }
      }
    }

    gameWinningGoalIndex = lastPlayerGoAhead;
  }

  // Converte em SimulatedGoal com contexto correto
  const goals: SimulatedGoal[] = goalShots.map((shot, index) => {
    const goalCtx = playerGoalContext[index];
    const isGolazoShot =
      shot.location !== "penalty" &&
      Math.random() <
        ((shot.location === "outsideBox" ? 0.15 : 0.05) *
          (player.stats.flair ?? 70)) /
          70;

    // Determina tipo do gol
    let type: GoalType = "normal";
    if (shot.location === "penalty") {
      type = "penalty";
    } else if (shot.foot === "head") {
      type = "header";
    } else if (isGolazoShot) {
      type = "golazo";
    } else if (shot.xG > 0.5) {
      type = "tap-in";
    }

    // LÓGICA CORRETA DE GOLS DECISIVOS
    // isWinner: Gol que garantiu a vitória (game-winning goal)
    const isWinner = index === gameWinningGoalIndex;

    // isEqualizer: Gol que empatou a partida
    const isEqualizer = goalCtx?.wasEqualizer ?? false;

    // isDecisive: Mudou o resultado (qualquer go-ahead ou equalizer em partida não-derrota)
    const isDecisive =
      isWinner || isEqualizer || (goalCtx?.wasGoAhead ?? false);

    // v0.5.2: Set piece determination (37% of goals from set pieces)
    const isSetPiece = type === "penalty" || Math.random() < 0.3; // ~37% with penalties
    let setPieceType: SetPieceType = "none";
    if (isSetPiece) {
      if (type === "penalty") {
        setPieceType = "penalty";
      } else {
        // Distribute between corner and freekick (corner 47%, freekick 53% of non-penalty set pieces)
        setPieceType = Math.random() < 0.47 ? "corner" : "freekick";
      }
    }

    return {
      minute: shot.minute,
      foot: shot.foot,
      location: shot.location,
      type,
      xG: shot.xG,
      isDecisive,
      isEqualizer,
      isWinner,
      isOnCounter: Math.random() < 0.15,
      isSetPiece,
      setPieceType,
      shotSpeed: 70 + (player.stats.shotPower ?? 70) * 0.4 + randFloat(-5, 15),
    };
  });

  // Calcula agregados
  const leftFootGoals = goals.filter((g) => g.foot === "left").length;
  const rightFootGoals = goals.filter((g) => g.foot === "right").length;
  const headedGoals = goals.filter((g) => g.foot === "head").length;
  const goalsInsideBox = goals.filter((g) => g.location === "insideBox").length;
  const goalsOutsideBox = goals.filter(
    (g) => g.location === "outsideBox",
  ).length;
  const penaltyGoals = goals.filter((g) => g.location === "penalty").length;
  const golazos = goals.filter((g) => g.type === "golazo").length;

  // v0.5.2: Conta gols contextuais corretamente
  const gameWinningGoals = goals.filter((g) => g.isWinner).length;
  const equalizerGoals = goals.filter((g) => g.isEqualizer).length;
  const decisiveGoals = goals.filter((g) => g.isDecisive).length;

  // v0.5.2: Conta gols por tipo de chute especial
  const goalShotsWithType = goalShots as ShotAttempt[];
  const chipShotGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "chipShot",
  ).length;
  const trivelaShotGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "trivela",
  ).length;
  const finesseShotGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "finesse",
  ).length;
  const powerShotGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "power",
  ).length;
  const volleyGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "volley",
  ).length;
  const bicycleKickGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "bicycle",
  ).length;
  const rabonaShotGoals = goalShotsWithType.filter(
    (s) => s.specialShotType === "rabona",
  ).length;

  return {
    totalGoals: goals.length,
    goals,
    totalShots: shots.length,
    shotsOnTarget: shots.filter((s) => s.isOnTarget).length,
    shotsBlocked: shots.filter((s) => s.isBlocked).length,
    shotsOffTarget: shots.filter((s) => !s.isOnTarget && !s.isBlocked).length,
    leftFootGoals,
    rightFootGoals,
    headedGoals,
    goalsInsideBox,
    goalsOutsideBox,
    penaltyGoals,
    golazos,
    xGTotal: shots.reduce((sum, s) => sum + s.xG, 0),
    // v0.5.2: Estatísticas contextuais
    gameWinningGoals,
    equalizerGoals,
    decisiveGoals,
    // v0.5.2: Estatísticas de chutes especiais
    chipShotGoals,
    trivelaShotGoals,
    finesseShotGoals,
    powerShotGoals,
    volleyGoals,
    bicycleKickGoals,
    rabonaShotGoals,
  };
}

/**
 * Recalcula estatísticas de per90 baseado em minutos jogados
 */
export function recalculatePer90Stats(
  player: Player,
  totalMinutes: number,
): void {
  if (!player.expandedData || totalMinutes < 90) return;

  const games90 = totalMinutes / 90;
  const atk = player.expandedData.attackingStats;
  const cre = player.expandedData.creationStats;
  const def = player.expandedData.defensiveStats;

  // Attacking per90 - usando campos existentes no tipo
  atk.xGPer90 = atk.xG / games90;
  // shotsTotal e shotsOnTarget divididos por jogos para stats por 90
  // Os per90 só são atualizados se o campo base existir

  // Creation per90
  cre.assistsPer90 = cre.assists / games90;
  cre.xAPer90 = cre.xA / games90;

  // Defensive per90
  if (def.pressuresDefensiveThird !== undefined) {
    const totalPressures =
      def.pressuresDefensiveThird +
      def.pressuresMidThird +
      def.pressuresAttackingThird;
    def.pressuresPer90 = totalPressures / games90;
  }

  if (def.tacklesDefensiveThird !== undefined) {
    const totalTackles =
      def.tacklesDefensiveThird +
      def.tacklesMidThird +
      def.tacklesAttackingThird;
    def.tacklesPer90 = totalTackles / games90;
  }
}
