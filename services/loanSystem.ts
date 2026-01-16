/**
 * Sistema de Empréstimos (Loan System)
 * Gera oportunidades realistas de empréstimo para jogadores jovens
 */

import { Player, Team, LoanOffer, SquadStatus } from '../types';
import { rand, randFloat, gaussianRandom, chance, clamp, sampleN } from '../utils/random';
import { logger } from '../utils/logger';
import { computeWeeklyWage } from './playerProfileLogic';

// ==================== GERAÃ‡ÃƒO DE OPORTUNIDADES ====================

/**
 * Determina se o jogador deve receber ofertas de empréstimo
 */
export const shouldReceiveLoanOffers = (player: Player): boolean => {
  const age = player.age;
  const overall = player.stats.overall;
  const squadStatus = player.squadStatus;
  const matchesPlayed = player.totalMatches;

  // Critérios para receber ofertas de empréstimo

  // BLOQUEIO: Jogadores no time juvenil/base NÃO podem ser emprestados
  // Eles devem primeiro ser promovidos ao time principal
  if (player.team?.isYouth) {
    return false;
  }
  
  // BLOQUEIO: Jogadores que ainda não fizeram debut profissional
  // (ainda estão na base) não podem ser emprestados
  if (!player.hasMadeSeniorDebut) {
    return false;
  }

  // 1. Jovem (17-23 anos) com pouco tempo de jogo no time profissional
  if (age >= 17 && age <= 23) {
    // Se jogou menos de 15 jogos na temporada e não é titular
    if (squadStatus !== 'Key Player' && squadStatus !== 'Captain') {
      return true;
    }
  }

  // 2. Jogadores reservas/excedentes de qualquer idade
  if (squadStatus === 'Surplus' || squadStatus === 'Reserve') {
    return age <= 28; // Até 28 anos pode ser emprestado
  }

  // 3. Jogadores retornando de lesão longa (recuperação por jogos)
  if (player.injury && player.injury.type === 'Severe') {
    return chance(40);
  }

  return false;
};

/**
 * Gera ofertas de empréstimo realistas
 */
export const generateLoanOpportunities = (
  player: Player,
  allTeams: Team[]
): LoanOffer[] => {
  if (!shouldReceiveLoanOffers(player)) {
    return [];
  }

  const currentTeam = player.team;
  const overall = player.stats.overall;
  const age = player.age;
  const potential = player.potential;

  // Determinar tier alvo (geralmente 1-2 tiers abaixo do clube atual)
  const targetTiers = determineTargetTiers(currentTeam.leagueTier, overall, potential);

  // Filtrar times candidatos
  const candidates = filterLoanCandidates(allTeams, player, targetTiers);

  if (candidates.length === 0) {
    logger.debug(`No loan candidates found for ${player.name}`, 'transfer');
    return [];
  }

  // Número de ofertas baseado em potencial e idade
  let numOffers = 0;
  if (potential >= 85 && age <= 21) numOffers = rand(3, 5);
  else if (potential >= 80 && age <= 22) numOffers = rand(2, 4);
  else if (potential >= 75) numOffers = rand(1, 3);
  else numOffers = rand(1, 2);

  numOffers = Math.min(numOffers, candidates.length);

  // Selecionar times e criar ofertas
  const selectedTeams = sampleN(candidates, numOffers);
  const offers: LoanOffer[] = [];

  for (const team of selectedTeams) {
    const offer = createLoanOffer(player, team, currentTeam);
    if (offer) {
      offers.push(offer);
    }
  }

  logger.info(
    `Generated ${offers.length} loan offers for ${player.name} (Age: ${age}, OVR: ${overall}, POT: ${potential})`,
    'transfer'
  );

  return offers;
};

/**
 * Determina tiers de liga apropriados para empréstimo
 */
const determineTargetTiers = (
  currentTier: number,
  overall: number,
  potential: number
): number[] => {
  const tiers: number[] = [];

  // Jogadores de alto potencial podem ir para mesma tier
  if (potential >= 85) {
    tiers.push(currentTier);
  }

  // Geralmente 1-2 tiers abaixo
  if (currentTier < 5) {
    tiers.push(currentTier + 1);
  }

  if (currentTier < 4 && overall < 70) {
    tiers.push(currentTier + 2);
  }

  // Evitar tiers muito baixos para jogadores promissores
  return tiers.filter(t => {
    if (potential >= 85) return t <= 3;
    if (potential >= 80) return t <= 4;
    return t <= 5;
  });
};

/**
 * Filtra times candidatos a receber empréstimo
 */
const filterLoanCandidates = (
  allTeams: Team[],
  player: Player,
  targetTiers: number[]
): Team[] => {
  const currentTeam = player.team;
  const overall = player.stats.overall;

  return allTeams.filter(team => {
    // Não pode ser o mesmo time
    if (team.name === currentTeam.name) return false;

    // Deve estar nos tiers alvo
    if (!targetTiers.includes(team.leagueTier)) return false;

    // Time deve ter capacidade de usar o jogador (overall não muito acima)
    const teamReputation = team.reputation;
    const expectedOverall = teamReputation - 10; // Times geralmente querem jogadores perto da sua reputação

    // Jogador deve estar dentro de uma range razoável
    const overallDiff = Math.abs(overall - expectedOverall);
    if (overallDiff > 15) return false;

    // Preferência por times do mesmo país/continente (70% chance)
    if (team.country !== currentTeam.country && chance(30)) {
      return false;
    }

    // Evitar rivais diretos (se na mesma liga)
    if (team.leagueTier === currentTeam.leagueTier && team.country === currentTeam.country) {
      const reputationDiff = Math.abs(team.reputation - currentTeam.reputation);
      if (reputationDiff < 5) return false; // Times similares raramente emprestam entre si
    }

    return true;
  });
};

/**
 * Cria uma oferta de empréstimo específica
 */
const createLoanOffer = (
  player: Player,
  loanTeam: Team,
  parentTeam: Team
): LoanOffer | null => {
  const overall = player.stats.overall;
  const potential = player.potential;
  const age = player.age;

  // Determinar duração do empréstimo
  let duration: number;
  if (age <= 18) {
    duration = chance(60) ? 1 : 2; // Jovens geralmente 1-2 anos
  } else if (age <= 21) {
    duration = chance(70) ? 1 : rand(1, 2);
  } else {
    duration = 1; // Mais velhos geralmente 1 ano
  }

  // Determinar squad status esperado
  const expectedSquadStatus = determineExpectedSquadStatus(
    overall,
    potential,
    loanTeam.reputation
  );

  // Calcular contribuição salarial (% do salário que o time emprestado paga)
  const wageContribution = calculateWageContribution(
    player.wage,
    loanTeam.reputation,
    parentTeam.reputation,
    potential
  );

  const offer: LoanOffer = {
    type: 'loan',
    team: loanTeam,
    wageContribution,
    duration,
    expectedSquadStatus,
    debug_info: `Tier: ${loanTeam.leagueTier}, Rep: ${loanTeam.reputation}, Status: ${expectedSquadStatus}`
  };

  logger.debug(
    `Created loan offer: ${loanTeam.name} for ${player.name} - ${duration}yr, ${(wageContribution/player.wage*100).toFixed(0)}% wage`,
    'transfer'
  );

  return offer;
};

/**
 * Determina o squad status esperado no time emprestado
 */
const determineExpectedSquadStatus = (
  playerOverall: number,
  playerPotential: number,
  teamReputation: number
): SquadStatus => {
  // Calcular "fit" do jogador no time
  const overallDiff = playerOverall - (teamReputation - 10);
  const potentialBonus = playerPotential >= 85 ? 5 : playerPotential >= 80 ? 2 : 0;
  const adjustedDiff = overallDiff + potentialBonus;

  if (adjustedDiff >= 8) return 'Key Player';
  if (adjustedDiff >= 3) return 'Rotation';
  if (adjustedDiff >= -3) return 'Rotation';
  return 'Reserve';
};

/**
 * Calcula quanto o time emprestado pagará do salário
 */
const calculateWageContribution = (
  playerWage: number,
  loanTeamRep: number,
  parentTeamRep: number,
  potential: number
): number => {
  // Base: times menores pagam menos
  const repRatio = loanTeamRep / Math.max(parentTeamRep, 1);
  let contribution = playerWage * clamp(repRatio, 0.3, 0.9);

  // Alto potencial: clube pai paga mais (quer desenvolvimento)
  if (potential >= 85) {
    contribution *= 0.7; // Time emprestado paga 70%
  } else if (potential >= 80) {
    contribution *= 0.8;
  }

  // Adicionar variação
  contribution *= randFloat(0.9, 1.1);

  return Math.round(contribution);
};

// ==================== PROCESSAMENTO DE EMPRÃ‰STIMO ====================

/**
 * Processa a aceitação de um empréstimo
 */
export const processLoanMove = (
  player: Player,
  offer: LoanOffer
): Player => {
  const parentClub = player.team;

  logger.info(
    `${player.name} moving on loan from ${parentClub.name} to ${offer.team.name} for ${offer.duration} year(s)`,
    'transfer'
  );

  const updatedPlayer = {
    ...player,
    team: offer.team,
    parentClub: parentClub,
    squadStatus: offer.expectedSquadStatus,
    loanDuration: offer.duration,
    yearsAtClub: 0,
    wage: offer.wageContribution, // Apenas o que o clube emprestado paga
    clubApproval: rand(60, 75), // Novo clube, approval razoável
    teamChemistry: rand(50, 65), // Precisa construir química
    morale: 'Normal' as const
  };

  return updatedPlayer;
};

/**
 * Processa retorno de empréstimo
 */
export const processLoanReturn = (
  player: Player
): Player => {
  if (!player.parentClub) {
    logger.warn(`${player.name} has no parent club to return to`, 'transfer');
    return player;
  }

  const parentClub = player.parentClub;
  const loanClub = player.team;

  logger.info(
    `${player.name} returning from loan at ${loanClub.name} to ${parentClub.name}`,
    'transfer'
  );

  // Calcular novo squad status baseado em desenvolvimento
  const improvedOverall = player.stats.overall;
  const newSquadStatus = determineExpectedSquadStatus(
    improvedOverall,
    player.potential,
    parentClub.reputation
  );

  // Wage volta ao que seria no clube pai
  const newWage = computeWeeklyWage(parentClub, newSquadStatus, improvedOverall, false);

  const updatedPlayer = {
    ...player,
    team: parentClub,
    parentClub: null,
    loanDuration: undefined,
    squadStatus: newSquadStatus,
    wage: newWage,
    // Approval e chemistry mantêm valores históricos se já jogou antes
    clubApproval: rand(55, 70),
    teamChemistry: rand(50, 65)
  };

  return updatedPlayer;
};

/**
 * Verifica se empréstimo deve terminar
 */
export const shouldLoanEnd = (player: Player): boolean => {
  if (!player.loanDuration || !player.parentClub) return false;
  return player.loanDuration <= 0;
};

/**
 * Atualiza duração do empréstimo (chamar a cada temporada)
 */
export const updateLoanDuration = (player: Player): Player => {
  if (!player.loanDuration || player.loanDuration <= 0) return player;

  return {
    ...player,
    loanDuration: player.loanDuration - 1
  };
};

// ==================== AVALIAÃ‡ÃƒO DE EMPRÃ‰STIMO ====================

/**
 * Avalia se o empréstimo foi bem-sucedido
 */
export interface LoanEvaluation {
  success: boolean;
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Disaster';
  developmentGained: number; // Pontos de overall ganhos
  experienceGained: number;
  playingTime: number; // % de jogos que participou
  impactOnReturn: {
    squadStatusChange: number; // -2 a +2
    moraleImpact: 'Positive' | 'Neutral' | 'Negative';
    reputationChange: number;
  };
}

export const evaluateLoan = (
  player: Player,
  matchesPlayed: number,
  totalMatches: number,
  overallGain: number
): LoanEvaluation => {
  const playingTimePercent = (matchesPlayed / Math.max(totalMatches, 1)) * 100;

  // Determinar sucesso baseado em tempo de jogo e desenvolvimento
  let rating: LoanEvaluation['rating'];
  let success = false;

  if (playingTimePercent >= 70 && overallGain >= 3) {
    rating = 'Excellent';
    success = true;
  } else if (playingTimePercent >= 60 && overallGain >= 2) {
    rating = 'Good';
    success = true;
  } else if (playingTimePercent >= 40 && overallGain >= 1) {
    rating = 'Average';
    success = true;
  } else if (playingTimePercent >= 25) {
    rating = 'Poor';
    success = false;
  } else {
    rating = 'Disaster';
    success = false;
  }

  // Calcular impactos no retorno
  let squadStatusChange = 0;
  let moraleImpact: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
  let reputationChange = 0;

  if (rating === 'Excellent') {
    squadStatusChange = chance(40) ? 2 : 1;
    moraleImpact = 'Positive';
    reputationChange = rand(3, 6);
  } else if (rating === 'Good') {
    squadStatusChange = chance(60) ? 1 : 0;
    moraleImpact = 'Positive';
    reputationChange = rand(2, 4);
  } else if (rating === 'Average') {
    squadStatusChange = 0;
    moraleImpact = 'Neutral';
    reputationChange = rand(0, 2);
  } else if (rating === 'Poor') {
    squadStatusChange = chance(30) ? -1 : 0;
    moraleImpact = 'Negative';
    reputationChange = rand(-2, 0);
  } else {
    squadStatusChange = -1;
    moraleImpact = 'Negative';
    reputationChange = rand(-4, -2);
  }

  logger.info(
    `Loan evaluation for ${player.name}: ${rating} - ${matchesPlayed}/${totalMatches} matches, +${overallGain} OVR`,
    'transfer'
  );

  return {
    success,
    rating,
    developmentGained: overallGain,
    experienceGained: matchesPlayed * 2,
    playingTime: playingTimePercent,
    impactOnReturn: {
      squadStatusChange,
      moraleImpact,
      reputationChange
    }
  };
};
