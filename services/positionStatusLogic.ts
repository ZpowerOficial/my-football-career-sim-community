import { Player, SquadStatus, PositionDetail, Team } from '../types';
import { rand, clamp } from './utils';

/**
 * Sistema de Squad Status por Posição
 *
 * Determina o status do jogador baseado:
 * - Competição direta na sua posição específica
 * - Qualidade do clube e expectativas
 * - Performance histórica recente
 * - Idade e potencial
 */

interface PositionCompetition {
  position: PositionDetail;
  playersInPosition: Player[];
  averageOVR: number;
  topPlayerOVR: number;
}

interface PerformanceHistory {
  lastSeasonRating?: number;
  lastSeasonMatches?: number;
  lastSeasonGoals?: number;
  lastSeasonAssists?: number;
  consecutiveGoodSeasons: number;
  consecutivePoorSeasons: number;
}

/**
 * Agrupa jogadores por posições compatíveis
 */
const getPositionGroup = (position: PositionDetail): PositionDetail[] => {
  const positionGroups: Record<string, PositionDetail[]> = {
    // Goleiros competem apenas entre si
    'GK': ['GK'],

    // Zagueiros centrais
    'CB': ['CB'],

    // Laterais esquerdos
    'LB': ['LB', 'LWB'],
    'LWB': ['LB', 'LWB'],

    // Laterais direitos
    'RB': ['RB', 'RWB'],
    'RWB': ['RB', 'RWB'],

    // Volantes
    'CDM': ['CDM', 'CM'],

    // Meio-campistas centrais
    'CM': ['CM', 'CDM', 'CAM'],

    // Meio-campistas atacantes
    'CAM': ['CAM', 'CM'],

    // Extremos esquerdos
    'LM': ['LM', 'LW'],
    'LW': ['LW', 'LM'],

    // Extremos direitos
    'RM': ['RM', 'RW'],
    'RW': ['RW', 'RM'],

    // Atacantes
    'ST': ['ST', 'CF'],
    'CF': ['CF', 'ST'],
  };

  return positionGroups[position] || [position];
};

/**
 * Analisa a competição na posição do jogador
 */
const analyzePositionCompetition = (
  player: Player,
  teamPlayers: Player[]
): PositionCompetition => {
  const compatiblePositions = getPositionGroup(player.position);

  // Filtra jogadores da mesma equipe e posições compatíveis
  const playersInPosition = teamPlayers.filter(p =>
    p.team.id === player.team.id &&
    !p.retired &&
    compatiblePositions.includes(p.position)
  ).sort((a, b) => b.stats.overall - a.stats.overall);

  const overalls = playersInPosition.map(p => p.stats.overall);
  const averageOVR = overalls.length > 0
    ? overalls.reduce((sum, ovr) => sum + ovr, 0) / overalls.length
    : player.stats.overall;
  const topPlayerOVR = overalls[0] || player.stats.overall;

  return {
    position: player.position,
    playersInPosition,
    averageOVR,
    topPlayerOVR
  };
};

/**
 * Extrai histórico de performance do careerLog
 */
const getPerformanceHistory = (player: Player): PerformanceHistory => {
  const history: PerformanceHistory = {
    consecutiveGoodSeasons: 0,
    consecutivePoorSeasons: 0
  };

  // Pega as últimas 3 temporadas do careerLog
  const recentSeasons = (player as any).careerLog?.slice(-3) || [];

  if (recentSeasons.length > 0) {
    const lastSeason = recentSeasons[recentSeasons.length - 1];
    history.lastSeasonRating = lastSeason?.stats?.averageRating;
    history.lastSeasonMatches = lastSeason?.stats?.matchesPlayed;
    history.lastSeasonGoals = lastSeason?.stats?.goals;
    history.lastSeasonAssists = lastSeason?.stats?.assists;
  }

  // Analisa sequências de boas/más temporadas
  let goodStreak = 0;
  let poorStreak = 0;

  for (let i = recentSeasons.length - 1; i >= 0; i--) {
    const season = recentSeasons[i];
    const rating = season?.stats?.averageRating || 0;
    const matches = season?.stats?.matchesPlayed || 0;

    // Temporada boa: rating >= 7.0 e jogou bastante
    if (rating >= 7.0 && matches >= 15) {
      goodStreak++;
      poorStreak = 0;
    }
    // Temporada ruim: rating < 6.5 ou jogou muito pouco
    else if (rating < 6.5 || matches < 10) {
      poorStreak++;
      goodStreak = 0;
    } else {
      break; // Para se encontrar temporada mediana
    }
  }

  history.consecutiveGoodSeasons = goodStreak;
  history.consecutivePoorSeasons = poorStreak;

  return history;
};

/**
 * Calcula o OVR esperado para titular nesta posição/clube
 */
const calculateExpectedStarterOVR = (
  team: Team,
  position: PositionDetail
): number => {
  const { reputation, leagueTier } = team;

  // Base OVR esperado por reputação do clube
  let expectedOVR = 65;

  if (reputation >= 95) expectedOVR = 85;      // Elite mundial (Real Madrid, Barcelona, etc)
  else if (reputation >= 90) expectedOVR = 82; // Top clubs
  else if (reputation >= 85) expectedOVR = 78; // Grandes clubes
  else if (reputation >= 80) expectedOVR = 75;
  else if (reputation >= 75) expectedOVR = 71;
  else if (reputation >= 70) expectedOVR = 67;
  else if (reputation >= 65) expectedOVR = 63;

  // Ajuste por tier da liga
  if (leagueTier === 1) expectedOVR += 3;
  else if (leagueTier === 2) expectedOVR += 1;
  else if (leagueTier >= 4) expectedOVR -= 2;

  // Ajuste por posição (algumas posições têm mais competição)
  const positionAdjustment: Partial<Record<PositionDetail, number>> = {
    'GK': 2,  // Goleiros de elite são mais raros - um bom goleiro 85 é titular em quase qualquer clube
    'ST': -2, // Atacantes têm muita competição - um atacante 85 pode não ser titular no Real Madrid
    'CF': -2,
    'LW': -1,
    'RW': -1,
    'CAM': -1,
  };

  expectedOVR += positionAdjustment[position] || 0;

  return clamp(expectedOVR, 60, 90);
};

/**
 * Determina o squad status baseado na posição específica
 */
export const determinePositionBasedSquadStatus = (
  player: Player,
  teamPlayers?: Player[]
): SquadStatus => {
  const { age, stats: { overall, leadership }, potential, hasMadeSeniorDebut } = player;

  // ========== JUVENTUDE (SEM ESTREIA PROFISSIONAL) ==========
  if (!hasMadeSeniorDebut) {
    const ageToOvrRatio = overall / age;

    if (potential > 94 && age < 16) return 'Key Player';
    if (ageToOvrRatio > 4.0 && age <= 16) return 'Key Player';
    if (ageToOvrRatio > 3.5 && age <= 17) return 'Rotation';
    if (potential > 85 && age <= 18) return 'Prospect';

    return 'Reserve';
  }

  // ========== SENIOR - SISTEMA POR POSIÃ‡ÃƒO ==========

  if (!teamPlayers || teamPlayers.length === 0) {
    // Fallback para sistema antigo se não tiver lista de jogadores
    return determineSquadStatusFallback(player);
  }

  // Analisa competição na posição
  const competition = analyzePositionCompetition(player, teamPlayers);
  const performance = getPerformanceHistory(player);
  const expectedStarterOVR = calculateExpectedStarterOVR(player.team, player.position);

  // Ranking do jogador na sua posição
  const positionRank = competition.playersInPosition.findIndex(p => p.name === player.name) + 1;
  const totalInPosition = competition.playersInPosition.length;

  // Diferença entre OVR do jogador e OVR esperado
  const ovrDifference = overall - expectedStarterOVR;

  // ========== CAPITÃƒO ==========
  // Apenas jogadores com liderança alta e que sejam titulares
  if (leadership >= 80 && positionRank === 1 && ovrDifference >= 3) {
    return 'Captain';
  }

  // ========== KEY PLAYER ==========
  // 1. Melhor jogador da posição E muito acima do esperado
  if (positionRank === 1 && ovrDifference >= 8) {
    return 'Key Player';
  }

  // 2. Melhor ou 2Âº melhor da posição com OVR significativamente acima
  if (positionRank <= 2 && ovrDifference >= 5) {
    return 'Key Player';
  }

  // 3. Sequência de boas temporadas mesmo sendo reserva (ganhou espaço!)
  if (performance.consecutiveGoodSeasons >= 2 && ovrDifference >= 0) {
    return 'Key Player';
  }

  // ========== ROTATION ==========
  // 1. Entre os 3 melhores da posição e próximo do esperado
  if (positionRank <= 3 && ovrDifference >= -3) {
    return 'Rotation';
  }

  // 2. Jogador acima ou igual ao esperado
  if (ovrDifference >= -1) {
    return 'Rotation';
  }

  // 3. Boa temporada anterior como reserva (chance de virar titular)
  if (performance.consecutiveGoodSeasons >= 1 && ovrDifference >= -5) {
    return 'Rotation';
  }

  // 4. Jovem com alto potencial próximo do esperado
  if (age <= 23 && potential >= expectedStarterOVR + 5 && ovrDifference >= -6) {
    return 'Rotation';
  }

  // ========== PROSPECT ==========
  // Jovens com potencial de se desenvolverem
  if (age <= 24) {
    // Alto potencial, mesmo que atual OVR seja menor
    if (potential >= expectedStarterOVR + 3 && ovrDifference >= -10) {
      return 'Prospect';
    }

    // Potencial para atingir o nível esperado
    if (age <= 21 && potential >= expectedStarterOVR && ovrDifference >= -15) {
      return 'Prospect';
    }
  }

  // ========== RESERVE ==========
  // Jogadores que podem ser úteis ao elenco
  if (ovrDifference >= -12) {
    // Mas se teve má sequência, pode cair para surplus
    if (performance.consecutivePoorSeasons >= 2) {
      return 'Surplus';
    }
    return 'Reserve';
  }

  // ========== SURPLUS ==========
  // Jogadores que não têm nível para o clube
  // OU tiveram performance muito ruim mesmo sendo reserves
  if (performance.consecutivePoorSeasons >= 3) {
    return 'Surplus';
  }

  return ovrDifference >= -18 ? 'Reserve' : 'Surplus';
};

/**
 * Fallback caso nao tenha acesso a lista completa de jogadores
 * CORRIGIDO: Thresholds mais realistas para determinar status
 */
const determineSquadStatusFallback = (player: Player): SquadStatus => {
  const { age, stats: { overall, leadership }, team, potential } = player;

  const clubReputation = team.reputation;
  const leagueTier = team.leagueTier;

  // OVR esperado para titular - AJUSTADO para ser mais realista
  let expectedStarterOVR = 65;

  if (clubReputation >= 95) expectedStarterOVR = 80;      // Era 82
  else if (clubReputation >= 90) expectedStarterOVR = 77; // Era 78
  else if (clubReputation >= 85) expectedStarterOVR = 74; // Era 75
  else if (clubReputation >= 80) expectedStarterOVR = 71; // Era 72
  else if (clubReputation >= 75) expectedStarterOVR = 67;
  else if (clubReputation >= 70) expectedStarterOVR = 64;
  else expectedStarterOVR = 61;

  if (leagueTier === 1) expectedStarterOVR += 2; // Era +3
  else if (leagueTier === 2) expectedStarterOVR += 1;

  const ovrDifference = overall - expectedStarterOVR;

  // CAPTAIN: Lideranca alta + acima do esperado
  if (leadership >= 80 && ovrDifference >= 5) return 'Captain'; // Era >= 8

  // KEY PLAYER: Claramente melhor que o esperado
  // Bayern (rep ~92) tem expectedOVR = 77+2 = 79
  // Jogador de 85 tem diff = 6 -> Key Player
  if (ovrDifference >= 4) return 'Key Player'; // Era >= 8 (muito restritivo!)

  // ROTATION: Proximo ou acima do esperado
  if (ovrDifference >= -2) return 'Rotation';

  // PROSPECT: Jovem com potencial
  if (age <= 24 && potential >= expectedStarterOVR && ovrDifference >= -8) return 'Prospect';

  // RESERVE: Ainda pode contribuir
  if (ovrDifference >= -12) return 'Reserve';

  return 'Surplus';
};

/**
 * Atualiza o squad status do jogador considerando performance da última temporada
 *
 * REGRAS PRINCIPAIS:
 * 1. Capitão que teve boa temporada MANTÉM a capitania
 * 2. Jogador que jogou muitos jogos não pode ser Reserva/Surplus
 * 3. Performance excepcional (gols/assistências) força promoção
 * 4. Quedas são graduais e justificadas
 */
export const updateSquadStatusBasedOnPerformance = (
  player: Player,
  lastSeasonStats: {
    rating: number;
    matchesPlayed: number;
    totalAvailable: number;
    goals?: number;
    assists?: number;
  },
  teamPlayers?: Player[]
): SquadStatus => {
  const currentStatus = player.squadStatus;
  const baseStatus = determinePositionBasedSquadStatus(player, teamPlayers);

  const goals = lastSeasonStats.goals || 0;
  const assists = lastSeasonStats.assists || 0;
  const matches = lastSeasonStats.matchesPlayed;
  const available = Math.max(1, lastSeasonStats.totalAvailable || 40);
  const playRatio = matches / available;
  const rating = lastSeasonStats.rating || 6.5;

  const statusHierarchy: SquadStatus[] = ['Surplus', 'Reserve', 'Prospect', 'Rotation', 'Key Player', 'Captain'];
  const currentIndex = statusHierarchy.indexOf(currentStatus);
  const baseIndex = statusHierarchy.indexOf(baseStatus);

  // ========== REGRA 1: CAPITÃO MANTÉM CAPITANIA SE NÃO FOI DESASTRE ==========
  if (currentStatus === 'Captain') {
    const isDisaster = rating < 6.0;
    const barelyPlayed = playRatio < 0.40;
    const tooOldAndOutclassed = player.age >= 35 && baseIndex < statusHierarchy.indexOf('Key Player');

    if (!isDisaster && !barelyPlayed && !tooOldAndOutclassed) {
      return 'Captain';
    }
    if (rating >= 6.5 && playRatio >= 0.30) {
      return 'Key Player';
    }
  }

  // ========== REGRA 2: KEY PLAYER NÃO CAI FACILMENTE ==========
  if (currentStatus === 'Key Player') {
    const hadBadSeason = rating < 6.3;
    const barelyPlayed = playRatio < 0.35;

    if (!hadBadSeason && !barelyPlayed) {
      if (player.stats.leadership >= 80 && rating >= 7.2) {
        return 'Captain';
      }
      return 'Key Player';
    }
    return 'Rotation';
  }

  // ========== REGRA 3: MUITOS JOGOS = PELO MENOS ROTATION ==========
  if (matches >= 25 || playRatio >= 0.50) {
    if (rating >= 7.3 || goals >= 15 || assists >= 10 || (goals + assists) >= 20) {
      return 'Key Player';
    }
    const minIndex = statusHierarchy.indexOf('Rotation');
    if (baseIndex < minIndex) {
      return 'Rotation';
    }
    if (rating >= 7.0 && currentIndex < statusHierarchy.length - 1) {
      return statusHierarchy[Math.min(currentIndex + 1, 4)];
    }
  }

  // ========== REGRA 4: PERFORMANCE EXCEPCIONAL FORÇA PROMOÇÃO ==========
  const isGoalMachine = goals >= 30 || (goals >= 20 && assists >= 10);
  const hasExceptionalGoalRatio = matches >= 20 && (goals / matches) >= 0.6;
  const hasExceptionalContributions = matches >= 20 && (goals + assists) >= 35;

  if (isGoalMachine || hasExceptionalGoalRatio || hasExceptionalContributions) {
    return player.stats.leadership >= 80 ? 'Captain' : 'Key Player';
  }

  // ========== REGRA 5: RATING MUITO ALTO COM JOGOS = PROMOÇÃO ==========
  if (rating >= 7.5 && matches >= 15) {
    const promotedIndex = Math.min(currentIndex + 1, 4);
    return statusHierarchy[promotedIndex];
  }

  // ========== REGRA 6: JOGOU POUCO MAS BEM = MANTÉM NÍVEL ==========
  if (playRatio >= 0.30 && rating >= 6.8) {
    return currentStatus;
  }

  // ========== REGRA 7: QUEDAS SÃO GRADUAIS ==========
  if (baseIndex < currentIndex - 1) {
    return statusHierarchy[currentIndex - 1];
  }

  // ========== REGRA 8: JOVEM COM POTENCIAL NÃO CAI PARA SURPLUS ==========
  if (player.age <= 24 && player.potential >= 75) {
    const minIndex = statusHierarchy.indexOf('Prospect');
    if (baseIndex < minIndex) {
      return 'Prospect';
    }
  }

  // ========== REGRA 9: PROMESSA DE PAPEL ATIVA ==========
  const promised = player.promisedSquadStatus;
  if (promised) {
    const promisedIndex = statusHierarchy.indexOf(promised);
    if (promisedIndex > baseIndex) {
      return promised;
    }
  }

  // ========== REGRA 10: USAR STATUS BASE COM AJUSTES DE FORM ==========
  let finalStatus = baseStatus;

  if (typeof player.form === 'number' && player.form >= 3) {
    const rotationIndex = statusHierarchy.indexOf('Rotation');
    if (baseIndex < rotationIndex) {
      finalStatus = 'Rotation';
    }
  }

  if (typeof player.form === 'number' && player.form <= -4) {
    const demotedIndex = Math.max(baseIndex - 1, 0);
    finalStatus = statusHierarchy[demotedIndex];
  }

  return finalStatus;
};