import { Player, Team, CareerEvent, SquadStatus, PositionDetail } from '../types';
import { rand, clamp, MORALE_LEVELS, updateMorale, gaussianRandom, randFloat } from './utils';
import { processContractRenewal } from './transferLogic';

// ==================== TIPOS E INTERFACES ====================

interface CareerPhase {
  phase: 'Youth Development' | 'Breakthrough' | 'Establishing' | 'Prime' | 'Veteran' | 'Decline' | 'Farewell';
  description: string;
  behaviourProfile: {
    ambitionLevel: number; // 0-100
    loyaltyLevel: number; // 0-100
    wageExpectation: number; // multiplier
    playingTimeRequired: number; // % of matches
    transferAgitation: number; // 0-100 base chance
  };
}

interface LoanOpportunity {
  destinationTeam: Team;
  duration: number; // seasons
  guaranteedPlayingTime: number; // %
  developmentPotential: number; // 0-100
  wagesCovered: number; // % covered by parent club
  buyOptionIncluded: boolean;
  buyOptionValue?: number;
}

interface RetirementConsideration {
  shouldRetire: boolean;
  reason?: string;
  finalTribute?: string;
  legacyEvents?: CareerEvent[];
}

interface MarketContext {
  demandForPosition: number; // 0-100
  leagueInflation: number; // multiplier
  transferWindowActivity: 'Hot' | 'Active' | 'Moderate' | 'Quiet';
  playerRarity: number; // 0-100 (how unique is this player?)
}

interface PlayerLifecycleResult {
  updatedPlayer: Player;
  events: CareerEvent[];
  isForcedToMove: boolean;
  agitatingForTransfer: boolean;
  loanOpportunities?: LoanOpportunity[];
  retirementConsidered?: RetirementConsideration;
}

// ==================== SISTEMA DE FASES DE CARREIRA ====================

/**
 * Determina a fase atual da carreira do jogador
 */
const determineCareerPhase = (player: Player): CareerPhase => {
  const age = player.age;
  const overall = player.stats.overall;
  const potential = player.potential;
  const yearsAtTopLevel = player.hasMadeSeniorDebut ? age - 17 : 0;

  // ========== YOUTH DEVELOPMENT (< 19 anos) ==========
  if (age < 19 && !player.hasMadeSeniorDebut) {
    return {
      phase: 'Youth Development',
      description: 'careerPhases.youthDevelopment',
      behaviourProfile: {
        ambitionLevel: 50,
        loyaltyLevel: 70,
        wageExpectation: 0.5,
        playingTimeRequired: 60,
        transferAgitation: 10
      }
    };
  }

  // ========== BREAKTHROUGH (17-23, estreia recente) ==========
  if (age <= 23 && yearsAtTopLevel <= 3) {
    return {
      phase: 'Breakthrough',
      description: 'careerPhases.breakthrough',
      behaviourProfile: {
        ambitionLevel: 65,
        loyaltyLevel: 60,
        wageExpectation: 0.8,
        playingTimeRequired: 50,
        transferAgitation: 30
      }
    };
  }

  // ========== ESTABLISHING (22-26) ==========
  if (age >= 22 && age <= 26) {
    return {
      phase: 'Establishing',
      description: 'careerPhases.establishing',
      behaviourProfile: {
        ambitionLevel: 75,
        loyaltyLevel: 50,
        wageExpectation: 1.0,
        playingTimeRequired: 60,
        transferAgitation: 45
      }
    };
  }

  // ========== PRIME (26-30) ==========
  if (age >= 26 && age <= 30) {
    return {
      phase: 'Prime',
      description: 'careerPhases.prime',
      behaviourProfile: {
        ambitionLevel: 70,
        loyaltyLevel: 55,
        wageExpectation: 1.2,
        playingTimeRequired: 70,
        transferAgitation: 35
      }
    };
  }

  // ========== VETERAN (31-34) ==========
  if (age >= 31 && age <= 34) {
    return {
      phase: 'Veteran',
      description: 'careerPhases.veteran',
      behaviourProfile: {
        ambitionLevel: 50,
        loyaltyLevel: 70,
        wageExpectation: 0.9,
        playingTimeRequired: 55,
        transferAgitation: 25
      }
    };
  }

  // ========== DECLINE (35-37) ==========
  if (age >= 35 && age <= 37) {
    return {
      phase: 'Decline',
      description: 'careerPhases.twilight',
      behaviourProfile: {
        ambitionLevel: 30,
        loyaltyLevel: 80,
        wageExpectation: 0.7,
        playingTimeRequired: 40,
        transferAgitation: 15
      }
    };
  }

  // ========== FAREWELL (38+) ==========
  return {
    phase: 'Farewell',
    description: 'careerPhases.finalChapter',
    behaviourProfile: {
      ambitionLevel: 20,
      loyaltyLevel: 90,
      wageExpectation: 0.5,
      playingTimeRequired: 30,
      transferAgitation: 5
    }
  };
};

// ==================== SISTEMA DE PROMO�?�fO GRADUAL ====================

/**
 * Verifica promoção através dos escalões
import { generateLoanOpportunities } from './loanSystem';
import { logger } from '../utils/logger';
 */
export const checkYouthProgression = (
  player: Player,
  allTeams: Team[]
): { updatedPlayer: Player; events: CareerEvent[]; isForcedToMove: boolean } => {

  const events: CareerEvent[] = [];
  let isForcedToMove = false;

  if (player.hasMadeSeniorDebut) {
    return { updatedPlayer: player, events, isForcedToMove };
  }

  const age = player.age;
  const overall = player.stats.overall;
  const potential = player.potential;

  // ========== FORCED PROMOTION/RELEASE (19+ anos) - MAIS AGRESSIVO ==========
  // Jogadores com 19+ anos DEVEM sair do time juvenil
  if (age >= 19) {
    const seniorTeamName = player.team.name.replace(/ U(18|19|20|21|23)| EDS| Primavera| Castilla| Atlètic| II| B| Sub-20| Sub-19| Sub-18/g, '').trim();
    const seniorTeam = allTeams.find(t => t.name === seniorTeamName && !t.isYouth);

    console.log(`[YOUTH CHECK] ${player.name} (${age} anos, ${overall} OVR) no ${player.team.name}`);
    console.log(`[YOUTH CHECK] Procurando time principal: "${seniorTeamName}"`);
    console.log(`[YOUTH CHECK] Time encontrado:`, seniorTeam ? seniorTeam.name : 'N�fO ENCONTRADO');

    if (seniorTeam && overall >= 55) {
      // Promote to senior team - limite de overall reduzido de 60 para 55
      player.hasMadeSeniorDebut = true;
      player.team = seniorTeam;

      // Squad status baseado em overall
      if (overall >= 75) player.squadStatus = 'Rotation';
      else if (overall >= 65) player.squadStatus = 'Prospect';
      else player.squadStatus = 'Reserve';

      events.push({
        type: 'promoted_to_seniors',
        description: 'events.promotion.toSeniors',
        descriptionParams: { team: seniorTeam.name, age }
      });

      // Contract renewal
      const { updatedPlayer: playerAfterContract, event } = processContractRenewal(player, true);
      player = playerAfterContract;
      events.push(event);

      console.log(`[YOUTH CHECK] �o. PROMOVIDO para ${seniorTeam.name} como ${player.squadStatus}`);

    } else {
      // Release - too old for youth, not good enough for seniors
      isForcedToMove = true;
      player.morale = 'Very Low';

      events.push({
        type: 'contract_expired',
        description: 'events.release.fromAcademy',
        descriptionParams: { team: player.team.name, age }
      });

      console.log(`[YOUTH CHECK] �O DISPENSADO (overall ${overall} muito baixo ou time não encontrado)`);
    }

    return { updatedPlayer: player, events, isForcedToMove };
  }

  // ========== GRADUAL PROMOTION CHANCES ==========
  let promotionChance = 0;
  let targetTeam: Team | undefined;

  // Calculate promotion chance based on multiple factors
  const baseChance = (overall - 60) / 40; // 0 at 60 OVR, 1 at 100 OVR
  const potentialBonus = (potential - 75) / 50; // Bonus for high potential
  const ageBonus = age >= 19 ? 0.3 : age >= 18 ? 0.15 : 0;

  promotionChance = clamp(baseChance + potentialBonus + ageBonus, 0, 1);

  // Adjust by personality
  if (player.personality === 'Determined') promotionChance *= 1.15;
  else if (player.personality === 'Lazy') promotionChance *= 0.75;

  // Add randomness
  promotionChance += gaussianRandom(0, 0.15);
  promotionChance = clamp(promotionChance, 0, 0.95);

  console.log(`[${player.name}] Youth promotion chance: ${(promotionChance * 100).toFixed(1)}% (Age: ${age}, OVR: ${overall}, POT: ${potential})`);

  if (Math.random() < promotionChance) {
    const seniorTeamName = player.team.name.replace(/ U(18|19|20|21)| EDS| Primavera| Castilla| Atlètic| II| Sub-20/g, '');
    targetTeam = allTeams.find(t => t.name === seniorTeamName && !t.isYouth);

    if (targetTeam) {
      player.hasMadeSeniorDebut = true;
      player.team = targetTeam;

      // Determine initial squad status
      if (overall >= 75 && potential >= 85) {
        player.squadStatus = 'Rotation';
        events.push({
          type: 'promoted_to_seniors',
          description: 'events.promotion.fastTracked',
          descriptionParams: { team: targetTeam.name, age }
        });
      } else if (overall >= 68) {
        player.squadStatus = 'Prospect';
        events.push({
          type: 'promoted_to_seniors',
          description: 'events.promotion.asProspect',
          descriptionParams: { team: targetTeam.name, age }
        });
      } else {
        player.squadStatus = 'Reserve';
        events.push({
          type: 'promoted_to_seniors',
          description: 'events.promotion.asReserve',
          descriptionParams: { team: targetTeam.name, age }
        });
      }

      // Contract renewal
      const { updatedPlayer: playerAfterContract, event } = processContractRenewal(player, true);
      player = playerAfterContract;
      events.push(event);

      // Additional event for exceptional talents
      if (potential >= 90 && age <= 18) {
        events.push({
          type: 'breakthrough',
          description: 'events.media.youngTalent'
        });
      }
    }
  }

  return { updatedPlayer: player, events, isForcedToMove };
};

// ==================== SISTEMA DE EMPR�?STIMOS ====================

/**
 * Gera oportunidades de empréstimo
 */
const generateLoanOpportunities = (
  player: Player,
  allTeams: Team[]
): LoanOpportunity[] => {

  const opportunities: LoanOpportunity[] = [];

  // Only for young players not getting game time
  if (player.age >= 25 || player.squadStatus === 'Key Player' || player.parentClub) {
    return [];
  }

  // Filter potential loan destinations
  const potentialDestinations = allTeams.filter(destination => {
    // Can't loan to same league tier if already at top level
    if (player.team.leagueTier === 1 && destination.leagueTier === 1) return false;

    // Generally loan down or sideways
    if (destination.leagueTier > player.team.leagueTier + 2) return false;

    // Not youth teams
    if (destination.isYouth) return false;

    // Not same team
    if (destination.name === player.team.name) return false;

    return true;
  });

  // Generate 1-3 opportunities
  const opportunityCount = Math.min(rand(1, 3), potentialDestinations.length);

  for (let i = 0; i < opportunityCount; i++) {
    const destination = potentialDestinations[rand(0, potentialDestinations.length - 1)];

    // Calculate development potential
    let developmentPotential = 50;

    // Playing time is key
    developmentPotential += 20;

    // League quality matters
    if (destination.leagueTier <= 2) developmentPotential += 15;
    else if (destination.leagueTier === 3) developmentPotential += 10;

    // Team reputation
    if (destination.reputation >= 75) developmentPotential += 10;

    developmentPotential = clamp(developmentPotential, 30, 95);

    // Duration
    const duration = rand(1, 2); // 1-2 seasons

    // Guaranteed playing time
    const guaranteedPlayingTime = rand(50, 80);

    // Wages covered
    const wagesCovered = rand(0, 50); // Parent club covers 0-50%

    // Buy option
    const buyOptionIncluded = Math.random() < 0.3;
    const buyOptionValue = buyOptionIncluded ?
      Math.floor(player.marketValue * randFloat(1.2, 1.8)) : undefined;

    opportunities.push({
      destinationTeam: destination,
      duration,
      guaranteedPlayingTime,
      developmentPotential,
      wagesCovered,
      buyOptionIncluded,
      buyOptionValue
    });
  }

  return opportunities;
};

// ==================== GERENCIAMENTO DE TEMPO DE JOGO ====================

/**
 * Sistema avançado de gerenciamento de tempo de jogo
 */
export const handlePlayingTime = (
  player: Player,
  matchesPlayed: number,
  availableMatches: number = 40
): {
  updatedPlayer: Player;
  events: CareerEvent[];
  isForcedToMove: boolean;
  agitatingForTransfer: boolean;
  loanOpportunities: LoanOpportunity[];
} => {

  const events: CareerEvent[] = [];
  let isForcedToMove = false;
  let agitatingForTransfer = false;
  const loanOpportunities: LoanOpportunity[] = [];

  const { squadStatus, age, hasMadeSeniorDebut, personality } = player;
  const careerPhase = determineCareerPhase(player);

  // ========== DEFINIR EXPECTATIVAS DE TEMPO DE JOGO ==========
  const expectedPlayingTime = careerPhase.behaviourProfile.playingTimeRequired;
  const actualPlayingTimePercentage = (matchesPlayed / availableMatches) * 100;

  // ========== CALCULAR SATISFA�?�fO COM TEMPO DE JOGO ==========
  let playingTimeSatisfaction = 100;

  if (actualPlayingTimePercentage < expectedPlayingTime * 0.5) {
    playingTimeSatisfaction = 20; // Muito insatisfeito
  } else if (actualPlayingTimePercentage < expectedPlayingTime * 0.7) {
    playingTimeSatisfaction = 40; // Insatisfeito
  } else if (actualPlayingTimePercentage < expectedPlayingTime * 0.85) {
    playingTimeSatisfaction = 60; // Moderadamente satisfeito
  } else if (actualPlayingTimePercentage < expectedPlayingTime) {
    playingTimeSatisfaction = 80; // Satisfeito
  } else {
    playingTimeSatisfaction = 100; // Muito satisfeito
  }

  // ========== AJUSTES POR CONTEXTO ==========

  // Jovens em desenvolvimento são mais tolerantes
  if (age <= 21 && squadStatus === 'Prospect') {
    playingTimeSatisfaction += 15;
  }

  // Veteranos aceitam papel reduzido
  if (age >= 32) {
    playingTimeSatisfaction += 20;
  }

  // Emprestados esperam mais jogo
  if (player.parentClub) {
    playingTimeSatisfaction -= 20;
  }

  // Personalidade afeta
  if (personality === 'Ambitious') {
    playingTimeSatisfaction -= 15;
  } else if (personality === 'Loyal' || personality === 'Professional') {
    playingTimeSatisfaction += 10;
  }

  playingTimeSatisfaction = clamp(playingTimeSatisfaction, 0, 100);

  console.log(`[${player.name}] Playing time: ${matchesPlayed}/${availableMatches} (${actualPlayingTimePercentage.toFixed(0)}%), Expected: ${expectedPlayingTime.toFixed(0)}%, Satisfaction: ${playingTimeSatisfaction}`);

  // ========== DETERMINAR SE �? "BAIXO TEMPO DE JOGO" ==========
  const lowPlayingTime = playingTimeSatisfaction < 50;

  if (lowPlayingTime) {
    player.seasonsWithLowPlayingTime = (player.seasonsWithLowPlayingTime || 0) + 1;
  } else {
    player.seasonsWithLowPlayingTime = 0;
  }

  // ========== CONSEQU�SNCIAS DE BAIXO TEMPO DE JOGO ==========

  if (player.seasonsWithLowPlayingTime >= 3) {
    // ========== CRISE TOTAL - FOR�?AR SAÍDA ==========
    isForcedToMove = true;
    agitatingForTransfer = true;
    player.morale = 'Very Low';
    player.clubApproval = clamp(player.clubApproval - 30, 0, 100);

    events.push({
      type: 'public_transfer_request',
      description: 'events.transfer.crisis',
      descriptionParams: { seasons: player.seasonsWithLowPlayingTime }
    });

  } else if (player.seasonsWithLowPlayingTime === 2) {
    // ========== SEGUNDA TEMPORADA - AGITA�?�fO S�?RIA ==========
    agitatingForTransfer = true;
    player.morale = updateMorale(player.morale, 'down', 2);
    player.clubApproval = clamp(player.clubApproval - 20, 0, 100);

    const agitationMessages = [
      `Agent publicly criticizes club for wasting their career - transfer talks expected.`,
      `Growing frustration boiling over - second consecutive season on the sidelines.`,
      `Sources close to the player suggest they're actively seeking an exit.`
    ];

    events.push({
      type: 'agitate_transfer',
      description: agitationMessages[rand(0, agitationMessages.length - 1)]
    });

    // Chance maior de forçar saída
    if (Math.random() < 0.5) {
      isForcedToMove = true;
    }

  } else if (player.seasonsWithLowPlayingTime === 1) {
    // ========== PRIMEIRA TEMPORADA - AVISO ==========
    player.morale = updateMorale(player.morale, 'down');
    player.clubApproval = clamp(player.clubApproval - 10, 0, 100);

    const warningMessages = [
      `Agent expresses concerns about lack of playing time.`,
      `Growing anxious about career development - needs more minutes.`,
      `Club urged to either play them or consider loan options.`
    ];

    events.push({
      type: 'unhappy_lack_of_playing_time',
      description: warningMessages[rand(0, warningMessages.length - 1)]
    });

    // Gerar oportunidades de empréstimo para jovens
    if (age <= 23 && !player.parentClub) {
      // TODO: Pass allTeams
      // const loanOpps = generateLoanOpportunities(player, allTeams);
      // loanOpportunities.push(...loanOpps);

      if (loanOpportunities.length > 0) {
        events.push({
          type: 'loan',
          description: 'events.loan.opportunitiesAvailable',
          descriptionParams: { count: loanOpportunities.length }
        });
      }
    }
  }

  // ========== EVENTOS ESPECÍFICOS POR PERSONALIDADE ==========

  const moraleIndex = MORALE_LEVELS.indexOf(player.morale);

  switch (personality) {
    case 'Ambitious':
      // Ambicioso agita mesmo sem baixo tempo de jogo se clube não é ambicioso
      if (player.stats.overall >= 82 && player.team.leagueTier >= 2) {
        const lackOfAmbitionChance = 0.40 + (player.stats.overall - 82) * 0.03;

        if (Math.random() < lackOfAmbitionChance) {
          agitatingForTransfer = true;
          player.morale = updateMorale(player.morale, 'down');

          events.push({
            type: 'public_transfer_request',
            description: 'events.transfer.ambitiousWantsMove'
          });
        }
      }
      break;

    case 'Temperamental':
      // Temperamental explode com baixo moral
      if (moraleIndex <= 1) {
        if (Math.random() < 0.55) {
          agitatingForTransfer = true;
          player.clubApproval = clamp(player.clubApproval - 20, 0, 100);

          events.push({
            type: 'agitate_transfer',
            description: 'events.transfer.temperamentalOutburst'
          });
        }
      }
      break;

    case 'Loyal':
      // Leal raramente agita
      if (player.yearsAtClub >= 5 && lowPlayingTime) {
        // Mesmo leal pode ficar frustrado
        if (Math.random() < 0.15) {
          events.push({
            type: 'milestone',
            description: 'events.transfer.loyalQuestioningFuture'
          });
        }
      }
      break;
  }

  // ========== JOVENS TALENTOS PROCURAM EMPR�?STIMO ==========
  if (age < 24 &&
    !player.parentClub &&
    hasMadeSeniorDebut &&
    (squadStatus === 'Surplus' || squadStatus === 'Reserve') &&
    player.seasonsWithLowPlayingTime >= 1) {

    const loanSeekingChance = 0.40 + (player.seasonsWithLowPlayingTime * 0.20);

    if (Math.random() < loanSeekingChance) {
      events.push({
        type: 'loan',
        description: 'events.loan.clubSeekingMove'
      });

      // Generate loan opportunities
      // TODO: Pass allTeams
      // const loanOpps = generateLoanOpportunities(player, allTeams);
      // loanOpportunities.push(...loanOpps);
    }
  }

  return {
    updatedPlayer: player,
    events,
    isForcedToMove,
    agitatingForTransfer,
    loanOpportunities
  };
};

// ==================== SISTEMA DE APOSENTADORIA ====================

/**
 * Sistema avançado de consideração de aposentadoria
 */
export const checkRetirement = (
  player: Player,
  performanceRating: number,
  matchesPlayed: number
): { updatedPlayer: Player; events: CareerEvent[]; retirementConsidered: RetirementConsideration } => {

  const events: CareerEvent[] = [];
  const legacyEvents: CareerEvent[] = [];
  let shouldRetire = false;
  let reason = '';
  let finalTribute = '';

  // ========== FORCED RETIREMENT (Career-Ending Injury) ==========
  if (player.injury?.type === 'Career-Ending') {
    shouldRetire = true;
    reason = 'Career-ending injury';
    player.retired = true;

    events.push({
      type: 'retirement',
      description: 'events.retirement.careerEndingInjury'
    });

    // Tribute based on achievements
    if (player.awards.worldPlayerAward >= 1) {
      finalTribute = `Despite injury cutting career short, will be remembered as one of the greats.`;
    } else if (player.stats.overall >= 85) {
      finalTribute = `Unfortunate end to what could have been an even greater career.`;
    }

    return {
      updatedPlayer: player,
      events,
      retirementConsidered: { shouldRetire, reason, finalTribute, legacyEvents }
    };
  }

  // ========== AGE-BASED RETIREMENT ==========
  const age = player.age;

  // ========== DYNAMIC TARGET RETIREMENT AGE ==========
  // Elite players can play longer - based on position, OVR, and condition
  let targetAge = player.retirementAge;
  let retirementModifiers: string[] = [];

  // Position-based extensions (GK play much longer)
  if (player.position === 'GK') {
    targetAge += 5;
    retirementModifiers.push('+5 (GK)');
  } else if (['CB', 'CDM'].includes(player.position)) {
    targetAge += 3;
    retirementModifiers.push('+3 (CB/CDM)');
  }

  // OVR-based extensions (elite players can play longer)
  if (player.stats.overall >= 92) {
    targetAge += 3;
    retirementModifiers.push('+3 (OVR 92+)');
  } else if (player.stats.overall >= 88) {
    targetAge += 2;
    retirementModifiers.push('+2 (OVR 88+)');
  } else if (player.stats.overall >= 85) {
    targetAge += 1;
    retirementModifiers.push('+1 (OVR 85+)');
  }

  // Professional personality fights to keep playing
  if (player.personality === 'Professional') {
    targetAge += 1;
    retirementModifiers.push('+1 (Professional)');
  }

  // Injury prone retires earlier
  if (player.traits.some(t => t.name === 'Injury Prone')) {
    targetAge -= 2;
    retirementModifiers.push('-2 (Injury Prone)');
  }

  // Cap at realistic maximum (47 for GK, 43 for outfield)
  const maxRetirement = player.position === 'GK' ? 47 : 43;
  targetAge = Math.min(targetAge, maxRetirement);

  // ========== HOCKEY STICK PROBABILITY CURVE ==========
  // Delta = years relative to target age (negative = before target, positive = past target)
  const delta = age - targetAge;

  // The "Hockey Stick" probability table
  const getBaseRetirementChance = (d: number): number => {
    if (d <= -4) return 0.005;  // 0.5% - Only career-ending anomalies (shock retirement)
    if (d === -3) return 0.015; // 1.5% - Very rare early surprise
    if (d === -2) return 0.040; // 4.0% - Rare but possible
    if (d === -1) return 0.120; // 12.0% - "Will he/Won't he" zone, rumors start
    if (d === 0) return 0.400; // 40.0% - Target age, high decision point
    if (d === 1) return 0.800; // 80.0% - Overdue, the end is near
    return 1.00;                // 100% - Forced retirement at +2 or more
  };

  let retirementChance = getBaseRetirementChance(delta);
  let chanceModifiers: string[] = [];

  // ========== CURVE FLATTENERS (Reducers) ==========

  // Physical anomalies play longer
  const isGK = player.position === 'GK';
  const physicalCondition = isGK
    ? (player.stats.reflexes || 70)
    : ((player.stats.pace || 60) + (player.stats.stamina || 60)) / 2;

  if (physicalCondition >= 90) {
    retirementChance *= 0.4;  // 60% reduction - physical freaks
    chanceModifiers.push('x0.4 (Physical 90+)');
  } else if (physicalCondition >= 80) {
    retirementChance *= 0.7;  // 30% reduction
    chanceModifiers.push('x0.7 (Physical 80+)');
  }

  // High morale keeps them motivated
  const moraleIndex = MORALE_LEVELS.indexOf(player.morale);
  if (moraleIndex >= 4) { // Euphoric
    retirementChance *= 0.6;
    chanceModifiers.push('x0.6 (Euphoric)');
  } else if (moraleIndex >= 3) { // Very High
    retirementChance *= 0.8;
    chanceModifiers.push('x0.8 (Very High Morale)');
  }

  // Recent trophy/success reduces chance
  const recentSuccess = player.trophies.league > 0 || player.awards.worldPlayerAward > 0;
  if (recentSuccess && delta <= 0) {
    retirementChance *= 0.7;  // Champions want to keep winning
    chanceModifiers.push('x0.7 (Recent Success)');
  }

  // ========== CURVE STEEPENERS (Accelerators) ==========

  // Low playing time accelerates retirement
  if (matchesPlayed < 5) {
    retirementChance *= 1.8;  // Benched accelerates retirement
    chanceModifiers.push('x1.8 (Benched)');
  } else if (matchesPlayed < 15) {
    retirementChance *= 1.3;
    chanceModifiers.push('x1.3 (Low Playing Time)');
  }

  // Poor performance accelerates
  if (performanceRating < 0.3) {
    retirementChance *= 1.5;
    chanceModifiers.push('x1.5 (Poor Form)');
  } else if (performanceRating < 0.5) {
    retirementChance *= 1.2;
    chanceModifiers.push('x1.2 (Declining Form)');
  }

  // Severe physical decline
  if (!isGK && player.stats.pace && player.stats.pace < 50) {
    retirementChance *= 1.4;
    chanceModifiers.push('x1.4 (Pace Decline)');
  }
  if (isGK && player.stats.reflexes && player.stats.reflexes < 60) {
    retirementChance *= 1.4;
    chanceModifiers.push('x1.4 (Reflexes Decline)');
  }

  // Surplus to requirements
  if (player.squadStatus === 'Surplus') {
    retirementChance *= 1.3;
    chanceModifiers.push('x1.3 (Surplus)');
  }

  // ========== SAFETY OVERRIDE ==========
  // If 2+ years before target AND no injuries, force probability to 0
  // (Prevents anomalous retirements for healthy young players)
  if (delta <= -2 && !player.injury) {
    // Only shock retirements possible (0.5% base already low enough)
    // But cap at 2% for safety
    retirementChance = Math.min(retirementChance, 0.02);
    chanceModifiers.push('CAPPED (2+ years before target)');
  }

  // Cap final chance
  retirementChance = clamp(retirementChance, 0, 0.98);

  console.log(`[${player.name}] Age ${age}, Target ${targetAge}, Delta ${delta}, Base ${(getBaseRetirementChance(delta) * 100).toFixed(1)}%, Final ${(retirementChance * 100).toFixed(1)}% [${chanceModifiers.join(', ') || 'no mods'}]`);
  console.log(`[${player.name}] Target modifiers: [${retirementModifiers.join(', ') || 'base'}]`);

  // ========== RETIREMENT ROLL ==========
  if (Math.random() < retirementChance) {
    shouldRetire = true;

    // Generate contextual retirement reason based on delta
    if (delta <= -2) {
      reason = 'PREMATURE'; // Shock retirement - family/passion
    } else if (delta <= 0 && player.stats.overall >= 85) {
      reason = 'PEAK_LEGEND'; // Going out on top
    } else if (delta >= 1 || player.stats.overall < 75) {
      reason = 'TOO_LONG'; // Stayed too long
    } else {
      reason = 'NATURAL'; // Natural end
    }
  }

  // ========== EXECUTE RETIREMENT ==========
  if (shouldRetire) {
    player.retired = true;
    console.log(shouldRetire);
    // Clear professional contract details on retirement
    player.contractLength = 0;
    player.wage = 0;

    // ========== LEGACY EVENTS ==========
    const totalTrophies = player.trophies.league + player.trophies.cup +
      player.trophies.continentalCup + player.trophies.worldCup * 3;
    const totalAwards = player.awards.worldPlayerAward * 5 + player.awards.topScorerAward * 2 +
      player.awards.teamOfTheYear;

    // Career summary
    const careerStats = {
      matches: player.totalMatches,
      goals: player.totalGoals,
      assists: player.totalAssists,
      clubs: player.totalClubs,
      caps: player.internationalCaps,
      intGoals: player.internationalGoals
    };

    let retirementTier: 'Legend' | 'Icon' | 'Star' | 'Professional' | 'Journeyman';

    if (player.awards.worldPlayerAward >= 3 || player.trophies.worldCup >= 2) {
      retirementTier = 'Legend';
    } else if (player.awards.worldPlayerAward >= 1 || totalAwards >= 10 || totalTrophies >= 15) {
      retirementTier = 'Icon';
    } else if (player.stats.overall >= 85 || totalTrophies >= 8) {
      retirementTier = 'Star';
    } else if (careerStats.matches >= 400) {
      retirementTier = 'Professional';
    } else {
      retirementTier = 'Journeyman';
    }

    // ========== RETIREMENT ANNOUNCEMENT ==========
    switch (retirementTier) {
      case 'Legend':
        events.push({
          type: 'retirement',
          description: 'events.retirement.legend',
          descriptionParams: { name: player.name, awards: totalAwards, trophies: totalTrophies }
        });

        // Legacy events
        if (player.yearsAtClub >= 10) {
          legacyEvents.push({
            type: 'milestone',
            description: 'events.retirement.shirtRetired',
            descriptionParams: { team: player.team.name, number: rand(7, 11), name: player.name }
          });
        }

        if (player.trophies.worldCup >= 1) {
          legacyEvents.push({
            type: 'milestone',
            description: 'events.retirement.worldCupChampion'
          });
        }

        finalTribute = `A legacy that will endure for generations. One of the all-time greats.`;
        break;

      case 'Icon':
        events.push({
          type: 'retirement',
          description: 'events.retirement.icon',
          descriptionParams: { name: player.name, matches: careerStats.matches, goals: careerStats.goals, trophies: totalTrophies }
        });

        if (player.yearsAtClub >= 8) {
          legacyEvents.push({
            type: 'milestone',
            description: 'events.retirement.testimonialMatch',
            descriptionParams: { team: player.team.name }
          });
        }

        finalTribute = `Retires as one of the finest players of their generation.`;
        break;

      case 'Star':
        events.push({
          type: 'retirement',
          description: 'events.retirement.star',
          descriptionParams: { name: player.name, matches: careerStats.matches, goals: careerStats.goals, clubs: careerStats.clubs }
        });

        finalTribute = `Enjoyed a fulfilling career at the highest level.`;
        break;

      case 'Professional':
        events.push({
          type: 'retirement',
          description: 'events.retirement.professional',
          descriptionParams: { name: player.name, matches: careerStats.matches, reason }
        });

        finalTribute = `Gave everything to the game over a long career.`;
        break;

      case 'Journeyman':
        events.push({
          type: 'retirement',
          description: 'events.retirement.journeyman',
          descriptionParams: { name: player.name, matches: careerStats.matches, clubs: careerStats.clubs, reason }
        });

        finalTribute = `Career comes to an end.`;
        break;
    }

    // ========== FUTURE PLANS ==========
    if (Math.random() < 0.4 && retirementTier !== 'Journeyman') {
      const futures = [
        'Plans to pursue coaching badges.',
        'Considering move into punditry.',
        'Announced plans to work with youth academy.',
        'Will remain at club in ambassadorial role.',
        'Taking time to explore opportunities outside football.'
      ];

      events.push({
        type: 'milestone',
        description: futures[rand(0, futures.length - 1)]
      });
    }

    // ========== FINAL TRIBUTE ==========
    if (player.personality === 'Loyal' && player.yearsAtClub >= 10) {
      events.push({
        type: 'milestone',
        description: 'events.retirement.oneClubLegend'
      });
    }

    if (player.internationalCaps >= 100) {
      events.push({
        type: 'milestone',
        description: 'events.retirement.centurion',
        descriptionParams: { country: player.nationality }
      });
    }
  }

  return {
    updatedPlayer: player,
    events,
    retirementConsidered: { shouldRetire, reason, finalTribute, legacyEvents }
  };
};

// ==================== SISTEMA DE VALOR DE MERCADO DIN�,MICO ====================

/**
 * Contexto de mercado para determinar valor
 */
const analyzeMarketContext = (player: Player): MarketContext => {

  // ========== DEMAND POR POSI�?�fO ==========
  const positionDemand: Record<PositionDetail, number> = {
    'ST': 90, 'CF': 85, // Strikers sempre em demanda
    'LW': 80, 'RW': 80, // Wingers muito procurados
    'CAM': 75, // Meia atacante
    'CM': 70, 'CDM': 65, // Meio-campo
    'LM': 60, 'RM': 60,
    'CB': 70, // Zagueiros centrais em demanda
    'LB': 65, 'RB': 65, 'LWB': 60, 'RWB': 60,
    'GK': 55 // Goleiros menos voláteis
  };

  const demandForPosition = positionDemand[player.position] + gaussianRandom(0, 10);

  // ========== INFLA�?�fO DA LIGA ==========
  // Toned down inflation to avoid runaway values
  const leagueInflation = player.team.leagueTier === 1 ? randFloat(1.02, 1.06) :
    player.team.leagueTier === 2 ? randFloat(0.98, 1.03) :
      player.team.leagueTier === 3 ? randFloat(0.95, 1.02) :
        randFloat(0.90, 0.98);

  // ========== ATIVIDADE DA JANELA ==========
  const rand = Math.random();
  const transferWindowActivity: MarketContext['transferWindowActivity'] =
    rand < 0.15 ? 'Hot' :
      rand < 0.40 ? 'Active' :
        rand < 0.75 ? 'Moderate' : 'Quiet';

  // ========== RARIDADE DO JOGADOR ==========
  let playerRarity = 50; // Base

  // Alto overall = raro
  if (player.stats.overall >= 90) playerRarity += 40;
  else if (player.stats.overall >= 85) playerRarity += 25;
  else if (player.stats.overall >= 80) playerRarity += 15;

  // Alto potencial jovem = raro
  if (player.age <= 21 && player.potential >= 90) playerRarity += 30;
  else if (player.age <= 23 && player.potential >= 85) playerRarity += 20;

  // Traits únicos
  if (player.traits.some(t => t.name === 'Leadership')) playerRarity += 10;
  if (player.archetype === 'Generational Talent') playerRarity += 25;

  playerRarity = clamp(playerRarity, 20, 100);

  return {
    demandForPosition,
    leagueInflation,
    transferWindowActivity,
    playerRarity
  };
};

/**
 * Sistema avançado de cálculo de valor de mercado
 */
export const updateMarketValue = (
  player: Player,
  performanceRating: number = 0.5,
  marketTrend: 'bull' | 'bear' | 'neutral' = 'neutral'
): Player => {

  if (player.retired) {
    player.marketValue = 0;
    return player;
  }

  // ========== ANALYZE MARKET CONTEXT ==========
  const marketContext = analyzeMarketContext(player);

  // ========== BASE VALUE FROM OVERALL ==========
  // Softer curve to avoid overvaluation of low-OVR players
  const baseValue = Math.pow(player.stats.overall / 50, 5.2);

  // ========== AGE CURVE ==========
  const age = player.age;
  let ageMultiplier = 1.0;

  if (age < 17) ageMultiplier = 0.6;
  else if (age <= 19) ageMultiplier = 0.9 + (19 - age) * 0.05;
  else if (age <= 21) ageMultiplier = 1.3 + (21 - age) * 0.1;
  else if (age <= 24) ageMultiplier = 1.7;
  else if (age <= 27) ageMultiplier = 1.8; // Peak value
  else if (age <= 29) ageMultiplier = 1.6;
  else if (age <= 31) ageMultiplier = 1.2;
  else if (age <= 33) ageMultiplier = 0.8;
  else if (age <= 35) ageMultiplier = 0.5;
  else ageMultiplier = 0.2;

  // ========== POTENTIAL PREMIUM (for young players) ==========
  let potentialPremium = 0;

  if (age < 25) {
    const potentialGap = player.potential - player.stats.overall;
    if (potentialGap > 0) {
      const ageFactor = (25 - age) / 25; // Younger = more premium
      potentialPremium = potentialGap * 0.15 * ageFactor;
    }
  }

  // ========== LEAGUE MODIFIER ==========
  const leagueTierModifier = [1.2, 1.05, 1.0, 0.9, 0.8][player.team.leagueTier - 1] || 0.75;

  // ========== TEAM REPUTATION ==========
  const teamRepModifier = 0.75 + (player.team.reputation - 70) / 200; // ~0.55�?"1.25 in extreme ends

  // ========== MORALE ==========
  const moraleIndex = MORALE_LEVELS.indexOf(player.morale);
  const moraleModifier = [0.85, 0.92, 1.0, 1.05, 1.12][moraleIndex] || 1.0;

  // ========== CONTRACT LENGTH ==========
  let contractModifier = 1.0;

  if (player.contractLength <= 1) {
    contractModifier = 0.65; // Running down contract = lower value
  } else if (player.contractLength <= 2) {
    contractModifier = 0.80;
  } else if (player.contractLength >= 4) {
    contractModifier = 1.10; // Long contract = security
  }

  // ========== POSITION PREMIUM ==========
  const positionModifier = 0.9 + (marketContext.demandForPosition / 500); // narrower (�?^0.92�?"1.1)

  // ========== FORM ==========
  const formModifier = 1.0 + (player.form / 50);

  // ========== PERFORMANCE RATING ==========
  const performanceModifier = 0.85 + (performanceRating * 0.30);

  // ========== NATIONALITY PREMIUM ==========
  let nationalityModifier = 1.0;

  // Top nations have premium
  const topNations = ['England', 'Spain', 'Germany', 'France', 'Brazil', 'Argentina'];
  if (topNations.includes(player.nationality)) {
    nationalityModifier = 1.08;
  }

  // ========== AWARDS & TROPHIES ==========
  let prestigeMultiplier = 1.0;

  prestigeMultiplier += player.awards.worldPlayerAward * 0.25;
  prestigeMultiplier += player.awards.topScorerAward * 0.10;
  prestigeMultiplier += player.awards.teamOfTheYear * 0.05;
  prestigeMultiplier += (player.trophies.league + player.trophies.continentalCup) * 0.02;

  // ========== ARCHETYPE PREMIUM ==========
  let archetypeModifier = 1.0;

  if (player.archetype === 'Generational Talent') archetypeModifier = 1.30;
  else if (player.archetype === 'Wonderkid') archetypeModifier = 1.20;
  else if (player.archetype === 'Late Bloomer' && age <= 24) archetypeModifier = 0.90;

  // ========== INJURY IMPACT ==========
  let injuryModifier = 1.0;

  if (player.injury) {
    if (player.injury.type === 'Severe') injuryModifier = 0.50;
    else if (player.injury.type === 'Moderate') injuryModifier = 0.75;
    else injuryModifier = 0.92;
  }

  if (player.traits.some(t => t.name === 'Injury Prone')) {
    injuryModifier *= 0.85;
  }

  // ========== MARKET CONTEXT ==========
  let marketContextMultiplier = 1.0;

  // Transfer window activity
  switch (marketContext.transferWindowActivity) {
    case 'Hot': marketContextMultiplier *= 1.05; break;
    case 'Active': marketContextMultiplier *= 1.02; break;
    case 'Quiet': marketContextMultiplier *= 0.98; break;
  }

  // League inflation
  marketContextMultiplier *= marketContext.leagueInflation;

  // Player rarity
  // Reduce rarity impact
  marketContextMultiplier *= (1 + marketContext.playerRarity / 400);

  // Market trend
  if (marketTrend === 'bull') marketContextMultiplier *= 1.05;
  else if (marketTrend === 'bear') marketContextMultiplier *= 0.95;

  // ========== AGITATION PENALTY ==========
  let agitationPenalty = 1.0;

  if (player.seasonsWithLowPlayingTime >= 2) {
    agitationPenalty = 0.80; // Club wants to sell
  } else if (player.squadStatus === 'Surplus') {
    agitationPenalty = 0.85;
  }

  // ========== FINAL CALCULATION ==========
  let finalValue = (baseValue + potentialPremium) *
    ageMultiplier *
    leagueTierModifier *
    teamRepModifier *
    moraleModifier *
    contractModifier *
    positionModifier *
    formModifier *
    performanceModifier *
    nationalityModifier *
    prestigeMultiplier *
    archetypeModifier *
    injuryModifier *
    marketContextMultiplier *
    agitationPenalty;

  // Mild OVR normalization (penalize sub-74 slightly)
  const ovr = player.stats.overall;
  if (ovr < 74) {
    const penalty = 0.9 - Math.max(0, (74 - ovr)) * 0.01; // 73->0.89 ... 60->0.76
    finalValue *= Math.max(0.72, penalty);
  }

  // ========== ADD RANDOMNESS ==========
  finalValue *= randFloat(0.95, 1.05);

  // ========== OVR-BASED SANITY CAPS (in millions) ==========
  let capM = Infinity;
  if (ovr < 70) {
    capM = [0, 6, 4, 3, 2, 1.5][player.team.leagueTier] || 2.5;
  } else if (ovr < 75) {
    capM = [0, 12, 8, 6, 4, 3][player.team.leagueTier] || 5;
  } else if (ovr < 80) {
    capM = [0, 30, 22, 15, 10, 7][player.team.leagueTier] || 12;
  }
  if (capM !== Infinity) finalValue = Math.min(finalValue, capM);

  // ========== CONVERT TO CURRENCY ==========
  player.marketValue = clamp(Math.round(finalValue * 1000000), 50000, 500000000);

  console.log(`[${player.name}] Market value: £${(player.marketValue / 1000000).toFixed(1)}M`);
  console.log(`  Age: ${age} (${ageMultiplier.toFixed(2)}x), OVR: ${player.stats.overall}, POT: ${player.potential}`);
  console.log(`  Context: ${marketContext.transferWindowActivity}, Demand: ${marketContext.demandForPosition}, Rarity: ${marketContext.playerRarity}`);

  return player;
};

// ==================== RETIREMENT HEADLINE GENERATOR ====================

/**
 * Retirement context types for narrative generation
 */
export type RetirementContext =
  | 'PEAK_LEGEND'   // Retired with high OVR/recent trophy
  | 'TOO_LONG'      // Retired with low OVR/high age
  | 'INJURY_FORCED' // Retired due to career-ending injury
  | 'PREMATURE'     // Random low % shock retirement
  | 'NATURAL';      // Normal end at target age

/**
 * Generates a localized retirement headline key based on context
 */
export const generateRetirementHeadline = (
  player: Player,
  context: RetirementContext,
  recentTrophy: boolean = false
): { key: string; params: Record<string, string | number> } => {
  const params = {
    name: player.name,
    age: player.age,
    overall: player.stats.overall,
    team: player.team.name,
    matches: player.totalMatches,
    goals: player.totalGoals,
  };

  // Select random key from category (1-5 variations per category)
  const getRandomKey = (base: string, count: number): string => {
    const variant = rand(1, count);
    return `${base}.${variant}`;
  };

  switch (context) {
    case 'PEAK_LEGEND':
      return {
        key: recentTrophy
          ? getRandomKey('events.retirement.headlines.peakLegend.trophy', 10)
          : getRandomKey('events.retirement.headlines.peakLegend.general', 10),
        params
      };

    case 'TOO_LONG':
      return {
        key: getRandomKey('events.retirement.headlines.tooLong', 20),
        params
      };

    case 'INJURY_FORCED':
      return {
        key: getRandomKey('events.retirement.headlines.injury', 20),
        params
      };

    case 'PREMATURE':
      return {
        key: getRandomKey('events.retirement.headlines.premature', 20),
        params
      };

    case 'NATURAL':
    default:
      return {
        key: getRandomKey('events.retirement.headlines.natural', 20),
        params
      };
  }
};

// ==================== PRE-RETIREMENT RUMOR GENERATOR ====================

/**
 * Generates retirement rumor events for players approaching target age
 * Should be called in weekly/monthly simulation
 */
export const generateRetirementRumor = (
  player: Player,
  delta: number, // age - targetAge
): CareerEvent | null => {
  // Only generate rumors when delta >= -2 (within 2 years of target)
  if (delta < -2) return null;

  // Probability of rumor (15% chance per call when eligible)
  if (Math.random() > 0.15) return null;

  const params = { name: player.name, age: player.age };

  // Contextual rumor selection based on player state
  let rumorKey: string;

  if (player.stats.overall >= 85) {
    // High OVR - debates about continuing
    const rumorTypes = [
      'events.retirement.rumors.highOvr.1',
      'events.retirement.rumors.highOvr.2',
      'events.retirement.rumors.highOvr.3',
    ];
    rumorKey = rumorTypes[rand(0, rumorTypes.length - 1)];
  } else if (player.form < -2) {
    // Poor form - questions about ability
    const rumorTypes = [
      'events.retirement.rumors.poorForm.1',
      'events.retirement.rumors.poorForm.2',
      'events.retirement.rumors.poorForm.3',
    ];
    rumorKey = rumorTypes[rand(0, rumorTypes.length - 1)];
  } else {
    // General retirement rumors
    const rumorTypes = [
      'events.retirement.rumors.general.1',
      'events.retirement.rumors.general.2',
      'events.retirement.rumors.general.3',
      'events.retirement.rumors.general.4',
    ];
    rumorKey = rumorTypes[rand(0, rumorTypes.length - 1)];
  }

  return {
    type: 'media_criticism', // Re-use existing type for display
    description: rumorKey,
    descriptionParams: params,
  };
};