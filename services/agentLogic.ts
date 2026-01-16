import { Player, CareerEvent, Agent, Personality, Team, SquadStatus } from '../types';
import { rand, MORALE_LEVELS, gaussianRandom, clamp, randFloat } from './utils';
import { AGENTS } from '../constants';

// ==================== TIPOS AUXILIARES ====================

interface AgentMarketContext {
  playerDemand: 'rising' | 'stable' | 'declining';
  agentSaturation: 'high' | 'medium' | 'low';
  seasonTiming: 'summer' | 'winter' | 'end';
  transferActivity: 'active' | 'moderate' | 'quiet';
}

interface AgentCompatibility {
  stylisticFit: number; // 0-1
  personalityMatch: number; // 0-1
  careerAlignment: number; // 0-1
  financialSuitability: number; // 0-1
}

// ==================== SISTEMA DE PERCEPÇÃO DO MERCADO ====================

/**
 * Analisa o contexto atual do mercado de agentes
 */
const analyzeAgentMarketContext = (player: Player, allPlayers: Player[]): AgentMarketContext => {
  // ========== DEMANDA DO JOGADOR ==========
  const playerValue = player.marketValue;
  const playerAge = player.age;
  const playerPotential = player.potential;
  const currentForm = player.form;

  let playerDemand: AgentMarketContext['playerDemand'] = 'stable';

  if (playerAge <= 23 && playerPotential >= 85 && playerValue >= 30) {
    playerDemand = 'rising';
  } else if (playerAge >= 32 && playerValue >= 40 && currentForm >= 5) {
    playerDemand = 'rising'; // Jogador experiente em alta
  } else if (playerAge >= 30 && playerPotential <= 80 && currentForm <= -5) {
    playerDemand = 'declining';
  }

  // ========== SATURAÇÃO DO MERCADO ==========
  const topPlayersInMarket = allPlayers.filter(p =>
    p.stats.overall >= 80 && p.age <= 28
  ).length;

  const marketSize = allPlayers.length;
  const topPlayerRatio = topPlayersInMarket / marketSize;

  let agentSaturation: AgentMarketContext['agentSaturation'] = 'medium';
  if (topPlayerRatio > 0.15) agentSaturation = 'high';
  else if (topPlayerRatio < 0.08) agentSaturation = 'low';

  // ========== TIMING DA TEMPORADA ==========
  const month = new Date().getMonth();
  let seasonTiming: AgentMarketContext['seasonTiming'] = 'end';
  if (month >= 6 && month <= 7) seasonTiming = 'summer';
  else if (month >= 0 && month <= 1) seasonTiming = 'winter';

  // ========== ATIVIDADE DE TRANSFERÊNCIA ==========
  const playersSeekingTransfers = allPlayers.filter(p =>
    p.seasonsWithLowPlayingTime > 1 || MORALE_LEVELS.indexOf(p.morale) < 2
  ).length;

  let transferActivity: AgentMarketContext['transferActivity'] = 'moderate';
  if (playersSeekingTransfers > marketSize * 0.15) transferActivity = 'active';
  else if (playersSeekingTransfers < marketSize * 0.05) transferActivity = 'quiet';

  return {
    playerDemand,
    agentSaturation,
    seasonTiming,
    transferActivity
  };
};

// ==================== CALCULAR COMPATIBILIDADE COM AGENTES ====================

/**
 * Calcula a compatibilidade entre jogador e agente
 */
const calculateAgentCompatibility = (
  player: Player,
  agent: Agent,
  marketContext: AgentMarketContext
): AgentCompatibility => {

  // ========== FIT ESTILÍSTICO ==========
  let stylisticFit = 0.5; // Base

  // Agentes especializados se dão melhor com certos tipos de jogador
  if (agent.specialty === 'Negotiator' && player.personality === 'Ambitious') {
    stylisticFit += 0.3;
  }

  if (agent.specialty === 'Scout' && player.age <= 22 && player.potential >= 85) {
    stylisticFit += 0.4;
  }

  if (agent.specialty === 'Brand Builder' && player.socialMediaFollowers >= 500000) {
    stylisticFit += 0.35;
  }

  if (agent.style === player.personality) {
    stylisticFit += 0.2;
  }

  // ========== COMPATIBILIDADE DE PERSONALIDADE ==========
  let personalityMatch = 0.5;

  const personalityMatches: Record<Agent['style'], Record<Personality, number>> = {
    'Aggressive': {
      'Ambitious': 0.8, 'Temperamental': 0.7, 'Inconsistent': 0.6,
      'Professional': 0.3, 'Loyal': 0.2, 'Determined': 0.4,
      'Lazy': 0.1, 'Media Darling': 0.4, 'Reserved': 0.2, 'Leader': 0.75
    },
    'Conservative': {
      'Professional': 0.8, 'Loyal': 0.7, 'Determined': 0.6,
      'Ambitious': 0.3, 'Temperamental': 0.2, 'Inconsistent': 0.3,
      'Lazy': 0.1, 'Media Darling': 0.4, 'Reserved': 0.8, 'Leader': 0.85
    },
    'Modern': {
      'Media Darling': 0.8, 'Ambitious': 0.6, 'Professional': 0.5,
      'Temperamental': 0.4, 'Inconsistent': 0.5, 'Loyal': 0.3,
      'Lazy': 0.2, 'Determined': 0.4, 'Reserved': 0.3, 'Leader': 0.6
    },
    'Traditional': {
      'Loyal': 0.9, 'Professional': 0.7, 'Determined': 0.6,
      'Ambitious': 0.2, 'Temperamental': 0.1, 'Lazy': 0.3,
      'Media Darling': 0.2, 'Reserved': 0.9, 'Inconsistent': 0.1, 'Leader': 0.9
    }
  };

  personalityMatch = personalityMatches[agent.style]?.[player.personality] || 0.5;

  // ========== ALINHAMENTO DE CARREIRA ==========
  let careerAlignment = 0.5;

  const playerGoals = Math.sqrt(player.potential); // Projeção de carreira

  if (agent.reputation === 'Super Agent' && playerGoals >= 4) {
    careerAlignment = 0.9; // Super agent para jogador de elite
  } else if (agent.reputation === 'Good' && playerGoals >= 3) {
    careerAlignment = 0.8;
  } else if (agent.reputation === 'Average' && playerGoals <= 3) {
    careerAlignment = 0.7;
  } else if (agent.reputation === 'Rookie' && playerGoals <= 2) {
    careerAlignment = 0.8;
  }

  // ========== ADEQUAÇÃO FINANCEIRA ==========
  let financialSuitability = 0.5;

  const playerIncome = player.wage;
  const agentFee = agent.feePercentage;
  const expectedFeeRatio = (playerIncome * agentFee) / 100;

  if (playerIncome >= 200000 && agentFee <= 8) {
    financialSuitability = 0.8; // Bom acordo para jogador rico
  } else if (playerIncome >= 100000 && agentFee <= 10) {
    financialSuitability = 0.7;
  } else if (playerIncome <= 50000 && agentFee >= 15) {
    financialSuitability = 0.2; // Péssimo para jogador pobre
  } else if (playerIncome <= 50000 && agentFee <= 7) {
    financialSuitability = 0.9; // Excelente para jogador pobre
  }

  // ========== AJUSTES DE CONTEXTO ==========
  if (marketContext.playerDemand === 'rising') {
    stylisticFit += 0.1;
    careerAlignment += 0.1;
  }

  if (marketContext.transferActivity === 'active') {
    personalityMatch += 0.1;
  }

  return {
    stylisticFit: clamp(stylisticFit, 0, 1),
    personalityMatch: clamp(personalityMatch, 0, 1),
    careerAlignment: clamp(careerAlignment, 0, 1),
    financialSuitability: clamp(financialSuitability, 0, 1)
  };
};

// ==================== SISTEMA DE SATISFAÇÃO DO AGENTE ====================

/**
 * Calcula a satisfação do agente com o jogador
 */
const calculateAgentSatisfaction = (
  player: Player,
  agent: Agent,
  yearsTogether: number,
  marketContext: AgentMarketContext
): 'excellent' | 'good' | 'moderate' | 'poor' | 'terrible' => {
  let satisfactionScore = 50; // Base

  // ========== DESEMPENHO FINANCEIRO ==========
  const commissionRate = agent.feePercentage;
  const playerRevenue = player.wage + (player.marketValue || 0) * 0.01; // Estimativa de receita
  const annualCommission = playerRevenue * (commissionRate / 100);

  if (annualCommission >= 100000) {
    satisfactionScore += 25;
  } else if (annualCommission >= 50000) {
    satisfactionScore += 15;
  } else if (annualCommission >= 25000) {
    satisfactionScore += 5;
  } else if (annualCommission < 10000) {
    satisfactionScore -= 15;
  }

  // ========== DESEMPENHO DE CARREIRA ==========
  const reputationGrowth = player.stats.overall - 78; // Estimativa desde início
  const ageForReputation = Math.min(player.age, 25);
  const expectedGrowth = ageForReputation * 1.5;
  const performanceRatio = reputationGrowth / Math.max(1, expectedGrowth);

  if (performanceRatio > 1.2) {
    satisfactionScore += 20;
  } else if (performanceRatio > 0.8) {
    satisfactionScore += 10;
  } else if (performanceRatio < 0.5) {
    satisfactionScore -= 20;
  }

  // ========== ESTABILIDADE ==========
  if (yearsTogether >= 5) {
    satisfactionScore += 10; // Lealdade
  } else if (yearsTogether >= 3) {
    satisfactionScore += 5;
  } else if (yearsTogether < 1) {
    satisfactionScore -= 10; // Relação muito nova
  }

  // ========== IMPlicações do jogador ==========
  if (player.seasonsWithLowPlayingTime > 2) {
    satisfactionScore -= 15; // Jogador problemático
  }

  if (MORALE_LEVELS.indexOf(player.morale) < 2) {
    satisfactionScore -= 10; // Jogador infeliz
  }

  if (player.squadStatus === 'Surplus') {
    satisfactionScore -= 20; // Grave problema
  }

  // ========== REPUTAÇÃO DO AGENTE ==========
  if (agent.reputation === 'Super Agent' && player.stats.overall < 80) {
    satisfactionScore -= 15; // Super agent com jogador medíocre
  } else if (agent.reputation === 'Rookie' && player.stats.overall > 85) {
    satisfactionScore -= 20; // Rookie com estrela
  }

  // ========== CONTEXTO DE MERCADO ==========
  if (marketContext.playerDemand === 'rising' && agent.specialty === 'Scout') {
    satisfactionScore += 15;
  }

  if (marketContext.transferActivity === 'active' && agent.specialty === 'Negotiator') {
    satisfactionScore += 10;
  }

  // ========== VARIAÇÃO ALEATÓRIA ==========
  satisfactionScore += gaussianRandom(0, 10);

  // ========== CLASSIFICAÇÃO FINAL ==========
  satisfactionScore = clamp(satisfactionScore, 0, 100);

  if (satisfactionScore >= 85) return 'excellent';
  if (satisfactionScore >= 70) return 'good';
  if (satisfactionScore >= 50) return 'moderate';
  if (satisfactionScore >= 30) return 'poor';
  return 'terrible';
};

// ==================== EVENTOS ESPECIAIS ====================

/**
 * Gera eventos especiais que podem forçar mudanças
 */
const checkSpecialAgentEvents = (
  player: Player,
  agent: Agent,
  agentSatisfaction: ReturnType<typeof calculateAgentSatisfaction>,
  marketContext: AgentMarketContext
): { shouldChange: boolean; reason?: string; emergency?: boolean } => {

  // ========== EMERGÊNCIA: CONFLITO TOTAL ==========
  if (agentSatisfaction === 'terrible') {
    if (Math.random() < 0.4) {
      return {
        shouldChange: true,
        emergency: true,
        reason: `Major fallout with your agent ${agent.name} due to career stagnation and poor communication.`
      };
    }
  }

  // ========== OFERTA IRRECUSÁVEL DE SUPER AGENT ==========
  if (agent.reputation !== 'Super Agent' && player.stats.overall >= 88 && marketContext.playerDemand === 'rising') {
    if (Math.random() < 0.08) {
      const superAgents = AGENTS.filter(a => a.reputation === 'Super Agent');
      if (superAgents.length > 0) {
        const interestedAgent = superAgents[rand(0, superAgents.length - 1)];
        return {
          shouldChange: true,
          reason: `Elite agent ${interestedAgent.name} has personally reached out with an offer you can't refuse.`
        };
      }
    }
  }

  // ========== JOGADOR VIRA ÍCONE, PRECISA DE AGENTE DE NÍVEL ==========
  if (player.team.reputation >= 90 && agent.reputation === 'Average' && player.stats.overall >= 85) {
    if (Math.random() < 0.15) {
      return {
        shouldChange: true,
        reason: `As a star at ${player.team.name}, you've attracted interest from top-tier agents.`
      };
    }
  }

  // ========== ESCANDALO DO AGENTE (Raro) ==========
  if (Math.random() < 0.02) {
    return {
      shouldChange: true,
      emergency: true,
      reason: `Your agent ${agent.name} has been involved in a controversy that affects their ability to represent you effectively.`
    };
  }

  // ========== FUSÃO DE AGÊNCIAS ==========
  if (Math.random() < 0.03) {
    const otherAgents = AGENTS.filter(a => a.reputation === agent.reputation && a.name !== agent.name);
    if (otherAgents.length > 0) {
      const mergingAgent = otherAgents[rand(0, otherAgents.length - 1)];
      return {
        shouldChange: true,
        reason: `Your agency has merged with another firm. You've been reassigned to ${mergingAgent.name}.`
      };
    }
  }

  return { shouldChange: false };
};

// ==================== LÓGICA DE MUDANÇA DE AGENTE ====================

/**
 * Determina se o jogador deve mudar de agente e para qual
 */
const evaluateAgentChange = (
  player: Player,
  agent: Agent,
  agentSatisfaction: ReturnType<typeof calculateAgentSatisfaction>,
  marketContext: AgentMarketContext,
  allPlayers: Player[]
): { shouldChange: boolean; targetAgent?: Agent; reason: string; priority: 'low' | 'medium' | 'high' | 'emergency' } => {

  // ========== VERIFICAR EVENTOS ESPECIAIS PRIMEIRO ==========
  const specialEvent = checkSpecialAgentEvents(player, agent, agentSatisfaction, marketContext);
  if (specialEvent.shouldChange) {
    return {
      shouldChange: true,
      reason: specialEvent.reason || 'Special circumstances',
      priority: specialEvent.emergency ? 'emergency' : 'high'
    };
  }

  // ========== LÓGICA PADRÃO ==========
  const isUnhappy = player.seasonsWithLowPlayingTime > 1 || MORALE_LEVELS.indexOf(player.morale) < 2;
  const contractExpired = (player.agentContractLength || 0) <= 0;

  // Calcular compatibilidade com agentes disponíveis
  const allAgents = AGENTS;
  let bestMatch: { agent: Agent; compatibility: AgentCompatibility; score: number } | null = null;

  // Avaliar todos os agentes possíveis
  const potentialAgents = allAgents.filter(a => {
    // Não considerar o mesmo agente
    if (a.name === agent.name) return false;

    // Agente Rookie só se interessar em jovens promissores
    if (a.reputation === 'Rookie' && (player.age > 25 || player.potential < 80)) {
      return false;
    }

    // Super Agent só se interessar em jogadores de elite
    if (a.reputation === 'Super Agent' && player.stats.overall < 82) {
      return false;
    }

    return true;
  });

  for (const potentialAgent of potentialAgents) {
    const compatibility = calculateAgentCompatibility(player, potentialAgent, marketContext);
    const score = (
      compatibility.stylisticFit * 0.3 +
      compatibility.personalityMatch * 0.3 +
      compatibility.careerAlignment * 0.25 +
      compatibility.financialSuitability * 0.15
    ) * 100;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { agent: potentialAgent, compatibility, score };
    }
  }

  if (!bestMatch) {
    return { shouldChange: false, reason: 'No suitable agents available', priority: 'low' };
  }

  // ========== DETERMINAR PROBABILIDADE DE MUDANÇA ==========
  let changeProbability = 0;
  let priority: 'low' | 'medium' | 'high' | 'emergency' = 'medium';

  // Fator satisfação
  switch (agentSatisfaction) {
    case 'terrible':
      changeProbability += 0.4;
      priority = 'high';
      break;
    case 'poor':
      changeProbability += 0.25;
      priority = 'medium';
      break;
    case 'moderate':
      changeProbability += 0.1;
      priority = 'low';
      break;
    case 'good':
      changeProbability += 0.02;
      priority = 'low';
      break;
    case 'excellent':
      changeProbability += 0;
      priority = 'low';
      break;
  }

  // Fator contrato expirado
  if (contractExpired) {
    changeProbability += 0.6;
    priority = 'high';
  }

  // Fator jogador insatisfeito
  if (isUnhappy) {
    changeProbability += 0.3;
    priority = 'high';
  }

  // Fator de melhoria significativa
  if (bestMatch.score > 75 && bestMatch.score - 60 > 20) {
    changeProbability += 0.2;
  }

  // Fator de timing
  if (marketContext.seasonTiming === 'summer' || marketContext.seasonTiming === 'winter') {
    changeProbability += 0.1;
  }

  // Fator aleatório
  changeProbability += randFloat(-0.1, 0.2);

  // ========== DECISÃO FINAL ==========
  const shouldChange = Math.random() < changeProbability;

  if (shouldChange) {
    return {
      shouldChange: true,
      targetAgent: bestMatch.agent,
      reason: `Improved career prospects with ${bestMatch.agent.name} (${bestMatch.agent.style} ${bestMatch.agent.specialty})`,
      priority
    };
  }

  return { shouldChange: false, reason: 'Decided to stay with current agent', priority: 'low' };
};

// ==================== FUNÇÃO PRINCIPAL ====================

export const handleAgentLogic = (
  player: Player,
  allPlayers: Player[]
): { updatedPlayer: Player; events: CareerEvent[] } => {
  const events: CareerEvent[] = [];
  let updatedPlayer = { ...player };

  // Garantir que o jogador tenha um contrato de agente
  if (!updatedPlayer.agentContractLength) {
    updatedPlayer.agentContractLength = rand(2, 4);
  }

  const yearsTogether = 1; // Simplificado - poderia calcular de forma mais complexa

  // ========== ANALISAR CONTEXTO ==========
  const marketContext = analyzeAgentMarketContext(player, allPlayers);

  // ========== CALCULAR SATISFAÇÃO ==========
  const agentSatisfaction = calculateAgentSatisfaction(
    updatedPlayer,
    updatedPlayer.agent,
    yearsTogether,
    marketContext
  );

  // ========== DECREMENTAR CONTRATO ==========
  updatedPlayer.agentContractLength = Math.max(0, updatedPlayer.agentContractLength - 1);

  // ========== VERIFICAR PROMOÇÃO DO AGENTE ATUAL ==========
  if (Math.random() < 0.08 && updatedPlayer.agent.reputation !== 'Super Agent') {
    const repLevels = ['Rookie', 'Average', 'Good', 'Super Agent'];
    const currentIndex = repLevels.indexOf(updatedPlayer.agent.reputation);

    if (currentIndex < repLevels.length - 1) {
      const newRep = repLevels[currentIndex + 1] as Agent['reputation'];
      const promotedAgent = AGENTS.find(a =>
        a.reputation === newRep &&
        a.name === updatedPlayer.agent.name
      );

      if (promotedAgent) {
        updatedPlayer.agent = promotedAgent;
        events.push({
          type: 'agent_change',
          description: 'events.agent.promoted',
          descriptionParams: { name: updatedPlayer.agent.name, reputation: newRep }
        });
        return { updatedPlayer, events };
      }
    }
  }

  // ========== AVALIAR MUDANÇA ==========
  const changeDecision = evaluateAgentChange(
    updatedPlayer,
    updatedPlayer.agent,
    agentSatisfaction,
    marketContext,
    allPlayers
  );

  if (changeDecision.shouldChange && changeDecision.targetAgent) {
    const oldAgent = updatedPlayer.agent;
    const newAgent = changeDecision.targetAgent;

    // Calcular impacto financeiro
    const oldFee = oldAgent.feePercentage;
    const newFee = newAgent.feePercentage;
    const feeDifference = newFee - oldFee;

    let wageReduction = 0;
    if (feeDifference > 0 && updatedPlayer.wage > 10000) {
      wageReduction = Math.floor(updatedPlayer.wage * (feeDifference / 100) * 0.7);
      updatedPlayer.wage = Math.max(1000, updatedPlayer.wage - wageReduction);
    }

    updatedPlayer.agent = newAgent;
    updatedPlayer.agentContractLength = rand(2, 4);

    // ========== GERAR NARRATIVA RICA ==========
    let narrative = changeDecision.reason;

    if (wageReduction > 0) {
      narrative += ` Annual wage reduced by â‚¬${wageReduction.toLocaleString()} to accommodate higher agent commission.`;
    }

    if (changeDecision.priority === 'emergency') {
      updatedPlayer.morale = MORALE_LEVELS[Math.max(0, MORALE_LEVELS.indexOf(updatedPlayer.morale) - 1)];
      narrative += ` This abrupt change has shaken your confidence.`;
    } else if (changeDecision.priority === 'high' && newAgent.reputation === 'Super Agent') {
      updatedPlayer.morale = MORALE_LEVELS[Math.min(4, MORALE_LEVELS.indexOf(updatedPlayer.morale) + 1)];
      narrative += ` This partnership opens doors to elite opportunities!`;
    }

    events.push({
      type: 'agent_change',
      description: narrative
    });

  } else if (changeDecision.shouldChange && !changeDecision.targetAgent) {
    // Mudança forçada (contrato expirado)
    const fallbackAgent = AGENTS.find(a => a.reputation === 'Average') || AGENTS[0];
    updatedPlayer.agent = fallbackAgent;
    updatedPlayer.agentContractLength = rand(2, 3);

    events.push({
      type: 'agent_change',
      description: 'events.agent.contractExpired',
      descriptionParams: { name: fallbackAgent.name, reputation: fallbackAgent.reputation }
    });

  } else if (Math.random() < 0.15 && agentSatisfaction === 'excellent') {
    // Evento positivo de renovação
    events.push({
      type: 'agent_change',
      description: 'events.agent.contractExtended',
      descriptionParams: { name: updatedPlayer.agent.name }
    });

    // Reduzir comissão como bônus
    updatedPlayer.agent.feePercentage = Math.max(3, updatedPlayer.agent.feePercentage - 1);
    updatedPlayer.agentContractLength = rand(3, 5);
  }

  return { updatedPlayer, events };
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Para debug - mostra detalhes das avaliações (desabilitado em produção)
 */
export const debugAgentEvaluation = (
  player: Player,
  agent: Agent,
  allPlayers: Player[]
): void => {
  // Debug logging disabled for production
};
