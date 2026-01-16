/**
 * Sistema de Endorsements e Patrocínios
 * Gerencia contratos de patrocínio, marcas, e valor de marca do jogador
 */

import { Player, Team } from '../types';
import { rand, randFloat, gaussianRandom, chance, clamp } from '../utils/random';
import { logger } from '../utils/logger';

export interface Endorsement {
  id: string;
  brand: string;
  type: 'Kit' | 'Boots' | 'Drinks' | 'Tech' | 'Fashion' | 'Automotive' | 'Watch' | 'Gaming';
  value: number; // £ per year
  duration: number; // years remaining
  startYear: number;
  requirements: {
    minFollowers?: number;
    minOverall?: number;
    minReputation?: number;
    personalityFit?: string[];
  };
  bonuses: {
    followerGrowth: number; // % extra growth
    reputationBonus: number; // extra reputation per year
    marketValueMultiplier: number; // multiplier on market value
  };
  exclusivity: 'Exclusive' | 'Non-Exclusive';
  performanceBonus: boolean; // Extra if winning trophies
}

export interface EndorsementOffer extends Endorsement {
  offeredValue: number;
  negotiable: boolean;
}

// ==================== MARCAS E TIPOS ====================

const BRANDS = {
  Kit: ['ProSport', 'AthleteGear', 'SpeedWear', 'StrideFit', 'EliteKit', 'SportMax', 'TeamPro'],
  Boots: ['ProSport', 'AthleteGear', 'SpeedWear', 'StrideFit', 'EliteKit', 'SportMax'],
  Drinks: ['SportsDrink', 'EnergyMax', 'PowerFuel', 'VitalBoost', 'HydratePro', 'ActiveEnergy'],
  Tech: ['TechNova', 'DigiPro', 'SmartEdge', 'SoundMax', 'ByteWave', 'GameSoft', 'PlayDigital'],
  Fashion: ['StyleElite', 'LuxeWear', 'ClassicFit', 'TrendMaker', 'PremiumStyle', 'UrbanLux'],
  Automotive: ['LuxuryCars', 'SpeedMotors', 'EliteDrive', 'PremiumAuto', 'SportCar', 'ClassicMotors', 'UrbanDrive'],
  Watch: ['TimeMaster', 'LuxeTime', 'PrecisionWatch', 'EliteHour', 'ClassicTime', 'GrandWatch'],
  Gaming: ['GameSoft', 'PlayDigital', 'GameStation', 'PlayZone', 'StreamHub', 'VideoGame']
};

// ==================== GERAÃ‡ÃƒO DE OFERTAS ====================

/**
 * Calcula o valor base de um endorsement baseado em múltiplos fatores
 */
const calculateEndorsementValue = (
  player: Player,
  type: Endorsement['type'],
  brandTier: 'Premium' | 'Standard' | 'Budget'
): number => {
  const overall = player.stats.overall;
  const followers = player.socialMediaFollowers;
  const reputation = player.reputation;

  // Valor base por tipo
  const baseValues = {
    Kit: 500000,
    Boots: 300000,
    Drinks: 400000,
    Tech: 600000,
    Fashion: 800000,
    Automotive: 1200000,
    Watch: 1500000,
    Gaming: 350000
  };

  let value = baseValues[type];

  // Multiplicador por overall
  const overallMultiplier = Math.pow(overall / 70, 2.5);
  value *= overallMultiplier;

  // Multiplicador por followers (logarítmico)
  const followerMultiplier = 1 + Math.log10(followers / 100000);
  value *= Math.max(followerMultiplier, 1);

  // Multiplicador por reputação
  const reputationMultiplier = reputation / 60;
  value *= Math.max(reputationMultiplier, 1);

  // Multiplicador por tier da marca
  const tierMultipliers = {
    Premium: 1.5,
    Standard: 1.0,
    Budget: 0.6
  };
  value *= tierMultipliers[brandTier];

  // Adicionar variabilidade
  value *= randFloat(0.8, 1.2);

  return Math.round(value);
};

/**
 * Determina se o jogador se qualifica para ofertas de endorsement
 */
const qualifiesForEndorsements = (player: Player): boolean => {
  // Precisa ter feito debut profissional
  if (!player.hasMadeSeniorDebut) return false;

  // Mínimos básicos
  const minOverall = 65;
  const minFollowers = 50000;
  const minReputation = 40;

  return (
    player.stats.overall >= minOverall &&
    player.socialMediaFollowers >= minFollowers &&
    player.reputation >= minReputation
  );
};

/**
 * Gera ofertas de endorsement baseadas no perfil do jogador
 */
export const generateEndorsementOffers = (
  player: Player,
  currentYear: number,
  existingEndorsements: Endorsement[] = []
): EndorsementOffer[] => {
  if (!qualifiesForEndorsements(player)) {
    return [];
  }

  const offers: EndorsementOffer[] = [];
  const overall = player.stats.overall;
  const followers = player.socialMediaFollowers;

  // Número de ofertas baseado em status
  let numOffers = 0;
  if (overall >= 90 && followers >= 5000000) numOffers = rand(3, 5);
  else if (overall >= 85 && followers >= 1000000) numOffers = rand(2, 4);
  else if (overall >= 80 && followers >= 500000) numOffers = rand(1, 3);
  else if (overall >= 75) numOffers = rand(0, 2);
  else numOffers = chance(30) ? 1 : 0;

  if (numOffers === 0) return [];

  // Tipos disponíveis (evitar duplicatas de tipo exclusivo)
  const availableTypes: Endorsement['type'][] = ['Kit', 'Boots', 'Drinks', 'Tech', 'Fashion', 'Automotive', 'Watch', 'Gaming'];
  const exclusiveTypes = existingEndorsements
    .filter(e => e.exclusivity === 'Exclusive')
    .map(e => e.type);

  const validTypes = availableTypes.filter(t => !exclusiveTypes.includes(t));

  for (let i = 0; i < numOffers && validTypes.length > 0; i++) {
    const typeIndex = rand(0, validTypes.length - 1);
    const type = validTypes[typeIndex];
    validTypes.splice(typeIndex, 1); // Remove para não repetir

    // Determinar tier da marca baseado no status do jogador
    let brandTier: 'Premium' | 'Standard' | 'Budget';
    if (overall >= 88 && followers >= 2000000) {
      brandTier = chance(70) ? 'Premium' : 'Standard';
    } else if (overall >= 82 && followers >= 500000) {
      brandTier = chance(50) ? 'Standard' : chance(70) ? 'Standard' : 'Budget';
    } else {
      brandTier = chance(30) ? 'Standard' : 'Budget';
    }

    const brandList = BRANDS[type];
    const brand = brandList[rand(0, brandList.length - 1)];

    const baseValue = calculateEndorsementValue(player, type, brandTier);
    const duration = rand(1, 4);

    // Exclusividade (marcas premium geralmente querem exclusividade)
    const exclusivity: Endorsement['exclusivity'] =
      brandTier === 'Premium' && chance(80) ? 'Exclusive' : 'Non-Exclusive';

    // Performance bonus (mais comum em marcas premium)
    const performanceBonus = brandTier === 'Premium' ? chance(60) : chance(30);

    // Requisitos
    const requirements = {
      minFollowers: followers * 0.8,
      minOverall: Math.max(overall - 2, 65),
      minReputation: Math.max(player.reputation - 5, 40),
      personalityFit: brandTier === 'Premium'
        ? ['Professional', 'Leader', 'Ambitious']
        : undefined
    };

    // Bônus do endorsement
    const bonuses = {
      followerGrowth: brandTier === 'Premium' ? randFloat(2, 5) : randFloat(0.5, 2),
      reputationBonus: brandTier === 'Premium' ? rand(2, 4) : rand(1, 2),
      marketValueMultiplier: brandTier === 'Premium' ? randFloat(1.05, 1.15) : randFloat(1.02, 1.08)
    };

    offers.push({
      id: `${brand}-${type}-${currentYear}`,
      brand,
      type,
      value: baseValue,
      offeredValue: baseValue,
      duration,
      startYear: currentYear,
      requirements,
      bonuses,
      exclusivity,
      performanceBonus,
      negotiable: brandTier !== 'Premium' // Marcas premium não negociam
    });
  }

  logger.info(`Generated ${offers.length} endorsement offers for ${player.name}`, 'endorsement');

  return offers;
};

/**
 * Negocia valor de um endorsement (se negociável)
 */
export const negotiateEndorsement = (
  offer: EndorsementOffer,
  playerReputation: number
): EndorsementOffer => {
  if (!offer.negotiable) {
    logger.info(`${offer.brand} offer is non-negotiable`, 'endorsement');
    return offer;
  }

  // Chance de melhorar baseado em reputação
  const negotiationSkill = clamp(playerReputation / 100, 0.5, 1.0);
  const improvementChance = negotiationSkill * 0.6; // Até 60% de chance

  if (chance(improvementChance * 100)) {
    const increase = randFloat(1.05, 1.20); // 5-20% de aumento
    offer.offeredValue = Math.round(offer.value * increase);
    logger.info(`Successfully negotiated ${offer.brand} to £${(offer.offeredValue / 1000000).toFixed(2)}M`, 'endorsement');
  } else {
    logger.info(`Failed to negotiate ${offer.brand}, keeping original offer`, 'endorsement');
  }

  return offer;
};

/**
 * Aceita um endorsement e o adiciona aos ativos do jogador
 */
export const acceptEndorsement = (
  offer: EndorsementOffer
): Endorsement => {
  const endorsement: Endorsement = {
    id: offer.id,
    brand: offer.brand,
    type: offer.type,
    value: offer.offeredValue,
    duration: offer.duration,
    startYear: offer.startYear,
    requirements: offer.requirements,
    bonuses: offer.bonuses,
    exclusivity: offer.exclusivity,
    performanceBonus: offer.performanceBonus
  };

  logger.info(`Accepted ${endorsement.brand} endorsement: £${(endorsement.value / 1000000).toFixed(2)}M/year for ${endorsement.duration} years`, 'endorsement');

  return endorsement;
};

/**
 * Processa endorsements a cada temporada
 */
export const processEndorsements = (
  endorsements: Endorsement[],
  player: Player,
  trophiesWon: number
): {
  updatedEndorsements: Endorsement[];
  totalIncome: number;
  expiredEndorsements: Endorsement[];
  followerBonus: number;
  reputationBonus: number;
  marketValueMultiplier: number;
} => {
  const active: Endorsement[] = [];
  const expired: Endorsement[] = [];
  let totalIncome = 0;
  let followerBonus = 0;
  let reputationBonus = 0;
  let marketValueMultiplier = 1.0;

  for (const endorsement of endorsements) {
    // Pagar valor anual
    let income = endorsement.value;

    // Performance bonus se ganhou troféus
    if (endorsement.performanceBonus && trophiesWon > 0) {
      const bonus = income * 0.15 * trophiesWon; // 15% por troféu
      income += bonus;
      logger.info(`${endorsement.brand} performance bonus: £${(bonus / 1000000).toFixed(2)}M`, 'endorsement');
    }

    totalIncome += income;

    // Aplicar bônus
    followerBonus += endorsement.bonuses.followerGrowth;
    reputationBonus += endorsement.bonuses.reputationBonus;
    marketValueMultiplier *= endorsement.bonuses.marketValueMultiplier;

    // Decrementar duração
    endorsement.duration -= 1;

    if (endorsement.duration > 0) {
      active.push(endorsement);
    } else {
      expired.push(endorsement);
      logger.info(`${endorsement.brand} endorsement expired`, 'endorsement');
    }
  }

  return {
    updatedEndorsements: active,
    totalIncome,
    expiredEndorsements: expired,
    followerBonus,
    reputationBonus,
    marketValueMultiplier
  };
};

/**
 * Verifica se endorsements ainda são válidos (jogador ainda qualifica)
 */
export const validateEndorsements = (
  endorsements: Endorsement[],
  player: Player
): {
  valid: Endorsement[];
  terminated: Endorsement[];
} => {
  const valid: Endorsement[] = [];
  const terminated: Endorsement[] = [];

  for (const endorsement of endorsements) {
    const meetsRequirements =
      (!endorsement.requirements.minOverall || player.stats.overall >= endorsement.requirements.minOverall) &&
      (!endorsement.requirements.minFollowers || player.socialMediaFollowers >= endorsement.requirements.minFollowers) &&
      (!endorsement.requirements.minReputation || player.reputation >= endorsement.requirements.minReputation);

    if (meetsRequirements) {
      valid.push(endorsement);
    } else {
      terminated.push(endorsement);
      logger.warn(`${endorsement.brand} terminated endorsement due to not meeting requirements`, 'endorsement');
    }
  }

  return { valid, terminated };
};
