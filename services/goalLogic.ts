import {
  Player,
  Position,
  PositionDetail,
  Team,
  Personality,
  Archetype,
  type PlayerGoal,
  type ObjectiveBands,
  type ObjectiveSeverity,
  type ContextualCompetitionData,
  type CompetitionResult,
} from '../types';
import { rand, clamp, gaussianRandom, updateMorale } from './utils';
import {
  ensureObjectiveRecords,
  generateSeasonObjectivesV2,
  evaluateSeasonObjectivesV2,
} from './objectivesV2';

// ==================== TIPOS E INTERFACES ====================
// NOTE: PlayerGoal type is defined in ../types (shared across app). Keep goalLogic aligned with it.

interface ClubStats {
  clubId: string;
  clubName: string;
  goals: number;
  assists: number;
  matches: number;
  seasons: number;
  trophies: {
    league: number;
    cup: number;
    continental: number;
  };
}

interface GoalsResult {
  updatedGoals: PlayerGoal[];
  completedGoals: PlayerGoal[];
  newGoals: PlayerGoal[];
  expiredGoals: PlayerGoal[];
  progressUpdates: { goal: PlayerGoal; oldProgress: number; newProgress: number }[];
}

// ==================== TRACKING DE STATS POR CLUBE ====================

/**
 * Calcula stats do jogador no clube atual
 */
const getClubSpecificStats = (
  player: Player,
  clubId: string
): ClubStats => {

  // Em produção, isso viria de um histórico real
  // Por agora, vamos estimar baseado em yearsAtClub

  // Estimativa conservadora: ~30 jogos, ~12 gols, ~6 assists por temporada
  const estimatedMatches = player.yearsAtClub * 30;
  const estimatedGoals = player.yearsAtClub * 12;
  const estimatedAssists = player.yearsAtClub * 6;

  return {
    clubId,
    clubName: player.team.name,
    goals: Math.min(estimatedGoals, player.totalGoals),
    assists: Math.min(estimatedAssists, player.totalAssists),
    matches: Math.min(estimatedMatches, player.totalMatches),
    seasons: player.yearsAtClub,
    trophies: {
      league: 0, // Seria rastreado separadamente
      cup: 0,
      continental: 0
    }
  };
};

// ==================== GERAÃ‡ÃƒO DE GOALS INICIAIS ====================

/**
 * Gera goals iniciais para um jogador jovem
 */
export const generateInitialPlayerGoals = (
  player: Player,
  currentSeason: number
): PlayerGoal[] => {

  const goals: PlayerGoal[] = [];
  const position = player.position;
  const potential = player.potential;
  const clubId = `club_${player.team.name.toLowerCase().replace(/\s/g, '_')}`;

  // ========== IMMEDIATE GOALS ==========

  // 1. Make professional debut
  if (!player.hasMadeSeniorDebut) {
    goals.push({
      id: `debut_${Date.now()}`,
      description: 'goals.proDebut',
      type: 'immediate',
      category: 'Milestone',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: player.team.name,
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'Critical',
      difficulty: 20,
      estimatedSeasons: 1,
      rewards: {
        followerBoost: 50000,
        moraleBoost: 2,
        reputationBoost: 3,
        narrative: 'Made professional debut - a dream come true!'
      }
    });
  }

  // 2. First goal/clean sheet
  if (player.hasMadeSeniorDebut) {
    if (position === 'GK') {
      if (!player.totalGoals || player.totalGoals === 0) { // Using totalGoals as proxy for clean sheets
        goals.push({
          id: `first_clean_sheet_${Date.now()}`,
          description: 'goals.firstCleanSheet',
          type: 'immediate',
          category: 'Milestone',
          isAchieved: false,
          progress: 0,
          isActive: true,
          isExpired: false,
          context: {
            seasonStarted: currentSeason,
            requiresCurrentClub: false,
            requiresCurrentLeague: false
          },
          priority: 'High',
          difficulty: 30,
          estimatedSeasons: 1,
          rewards: {
            followerBoost: 30000,
            moraleBoost: 1,
            reputationBoost: 2
          }
        });
      }
    } else {
      if (player.totalGoals === 0) {
        goals.push({
          id: `first_goal_${Date.now()}`,
          description: 'goals.firstGoal',
          type: 'immediate',
          category: 'Milestone',
          isAchieved: false,
          progress: 0,
          isActive: true,
          isExpired: false,
          context: {
            seasonStarted: currentSeason,
            requiresCurrentClub: false,
            requiresCurrentLeague: false
          },
          priority: 'High',
          difficulty: 25,
          estimatedSeasons: 1,
          rewards: {
            followerBoost: 40000,
            moraleBoost: 2,
            reputationBoost: 2,
            narrative: 'First professional goal - a moment to remember forever!'
          }
        });
      }
    }
  }

  // ========== SHORT-TERM GOALS (1-2 seasons) ==========

  // 3. Become regular starter
  if (player.squadStatus !== 'Key Player' && player.squadStatus !== 'Captain') {
    goals.push({
      id: `regular_starter_${clubId}_${Date.now()}`,
      description: 'goals.becomeStarter',
      descriptionParams: { team: player.team.name },
      type: 'short-term',
      category: 'Performance',
      isAchieved: false,
      progress: player.squadStatus === 'Rotation' ? 50 : player.squadStatus === 'Prospect' ? 30 : 0,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: player.team.name,
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false
      },
      priority: 'High',
      difficulty: 45,
      estimatedSeasons: 2,
      rewards: {
        followerBoost: 100000,
        moraleBoost: 2,
        reputationBoost: 5
      }
    });
  }

  // 4. Score/assist milestone (position-specific)
  const positionMap: { [key in PositionDetail]: Position } = {
    ST: 'Attacker', CF: 'Attacker', LW: 'Attacker', RW: 'Attacker',
    CAM: 'Midfielder', CM: 'Midfielder', CDM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
    CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
    GK: 'Goalkeeper'
  };

  const posType = positionMap[player.position];

  if (posType === 'Attacker') {
    const targetGoals = player.totalGoals + 15;
    goals.push({
      id: `goal_milestone_${targetGoals}_${Date.now()}`,
      description: 'goals.reachCareerGoals',
      descriptionParams: { count: targetGoals },
      type: 'short-term',
      category: 'Performance',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      targetValue: targetGoals,
      currentValue: player.totalGoals,
      startingValue: player.totalGoals,
      priority: 'Medium',
      difficulty: 40,
      estimatedSeasons: 2,
      rewards: {
        followerBoost: 150000,
        moraleBoost: 1,
        reputationBoost: 3
      }
    });
  } else if (posType === 'Midfielder') {
    const targetAssists = player.totalAssists + 10;
    goals.push({
      id: `assist_milestone_${targetAssists}_${Date.now()}`,
      description: 'goals.reachCareerAssists',
      descriptionParams: { count: targetAssists },
      type: 'short-term',
      category: 'Performance',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      targetValue: targetAssists,
      currentValue: player.totalAssists,
      startingValue: player.totalAssists,
      priority: 'Medium',
      difficulty: 45,
      estimatedSeasons: 2,
      rewards: {
        followerBoost: 120000,
        moraleBoost: 1,
        reputationBoost: 3
      }
    });
  }

  // ========== MEDIUM-TERM GOALS (2-4 seasons) ==========

  // 5. Reach target overall
  const targetOvr = Math.min(90, Math.floor(potential / 5) * 5);
  if (player.stats.overall < targetOvr) {
    goals.push({
      id: `ovr_target_${targetOvr}_${Date.now()}`,
      description: 'goals.reachOverallRating',
      descriptionParams: { rating: targetOvr },
      type: 'medium-term',
      category: 'Development',
      isAchieved: false,
      progress: ((player.stats.overall - 60) / (targetOvr - 60)) * 100,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      targetValue: targetOvr,
      currentValue: player.stats.overall,
      startingValue: player.stats.overall,
      priority: 'High',
      difficulty: 60,
      estimatedSeasons: Math.ceil((targetOvr - player.stats.overall) / 2),
      rewards: {
        followerBoost: 500000,
        moraleBoost: 2,
        reputationBoost: 8,
        narrative: `Reached ${targetOvr} overall - fulfilled potential!`
      }
    });
  }

  // 6. Win first major trophy
  if (player.trophies.league === 0 && player.trophies.continentalCup === 0) {
    goals.push({
      id: `first_trophy_${Date.now()}`,
      description: 'goals.firstTrophy',
      type: 'medium-term',
      category: 'Trophy',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'High',
      difficulty: 55,
      estimatedSeasons: 3,
      rewards: {
        followerBoost: 800000,
        moraleBoost: 3,
        reputationBoost: 10,
        narrative: 'First major trophy - taste of glory!'
      }
    });
  }

  // ========== LONG-TERM GOALS (4+ seasons) ==========

  // 7. National team call-up
  if (player.nationalTeamStatus === 'Not Called' && player.age >= 18) {
    goals.push({
      id: `national_team_callup_${Date.now()}`,
      description: 'goals.nationalTeamCallUp',
      descriptionParams: { country: player.nationality },
      type: 'long-term',
      category: 'International',
      isAchieved: false,
      progress: (player.stats.overall - 70) * 3, // Rough estimate
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'High',
      difficulty: 65,
      estimatedSeasons: 4,
      rewards: {
        followerBoost: 1000000,
        moraleBoost: 3,
        reputationBoost: 12,
        narrative: 'National team debut - representing your country!'
      }
    });
  }

  // 8. Play in top tier
  if (player.team.leagueTier > 1) {
    goals.push({
      id: `top_tier_${Date.now()}`,
      description: 'goals.topTierLeague',
      type: 'long-term',
      category: 'Development',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'Medium',
      difficulty: 70,
      estimatedSeasons: 5,
      rewards: {
        followerBoost: 600000,
        moraleBoost: 2,
        reputationBoost: 8
      }
    });
  }

  return goals;
};

// ==================== GERAÃ‡ÃƒO DE GOALS DINÃ‚MICOS ====================

/**
 * Gera novos goals baseado na situação atual do jogador
 */
export const generateDynamicGoals = (
  player: Player,
  currentGoals: PlayerGoal[],
  currentSeason: number
): PlayerGoal[] => {

  const newGoals: PlayerGoal[] = [];
  const clubId = `club_${player.team.name.toLowerCase().replace(/\s/g, '_')}`;
  const clubStats = getClubSpecificStats(player, clubId);

  // ========== CLUB LEGEND GOALS ==========
  if (player.yearsAtClub >= 5 &&
      !currentGoals.some(g => g.id.includes('club_legend'))) {

    const matchesNeeded = 200 - clubStats.matches;

    if (matchesNeeded > 0) {
      newGoals.push({
        id: `club_legend_${clubId}_${Date.now()}`,
        description: 'goals.becomeClubLegend',
        descriptionParams: { team: player.team.name, matches: clubStats.matches, target: 200 },
        type: 'career',
        category: 'Loyalty',
        isAchieved: false,
        progress: (clubStats.matches / 200) * 100,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: player.team.name,
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false
        },
        targetValue: 200,
        currentValue: clubStats.matches,
        startingValue: clubStats.matches,
        priority: 'Medium',
        difficulty: 50,
        estimatedSeasons: Math.ceil(matchesNeeded / 35),
        rewards: {
          followerBoost: 2000000,
          moraleBoost: 3,
          reputationBoost: 15,
          narrative: `Club legend status achieved at ${player.team.name}!`
        }
      });
    }
  }

  // ========== CLUB GOALSCORING RECORD ==========
  if (player.yearsAtClub >= 3 &&
      player.totalGoals >= 30 &&
      !currentGoals.some(g => g.id.includes('club_record'))) {

    // Estimativa de recorde do clube (seria rastreado de verdade)
    const estimatedClubRecord = Math.floor(player.team.reputation / 2) + 50;
    const goalsNeededInClub = Math.max(0, estimatedClubRecord - clubStats.goals);

    if (goalsNeededInClub < 100) { // Só criar se for alcançável
      newGoals.push({
        id: `club_record_${clubId}_${Date.now()}`,
        description: 'goals.breakGoalRecord',
        descriptionParams: { team: player.team.name, current: clubStats.goals, record: estimatedClubRecord },
        type: 'career',
        category: 'Performance',
        isAchieved: false,
        progress: (clubStats.goals / estimatedClubRecord) * 100,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: player.team.name,
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false
        },
        targetValue: estimatedClubRecord,
        currentValue: clubStats.goals,
        startingValue: clubStats.goals,
        priority: 'Medium',
        difficulty: 75,
        estimatedSeasons: Math.ceil(goalsNeededInClub / 15),
        rewards: {
          followerBoost: 3000000,
          moraleBoost: 3,
          reputationBoost: 20,
          narrative: `All-time top scorer for ${player.team.name}! Legendary achievement!`
        }
      });
    }
  }

  // ========== BALLON D'OR AMBITION ==========
  if (player.stats.overall >= 88 &&
      player.awards.worldPlayerAward === 0 &&
      !currentGoals.some(g => g.id.includes('ballon_dor'))) {

    newGoals.push({
      id: `ballon_dor_${Date.now()}`,
      description: 'goals.ballonDor',
      type: 'career',
      category: 'Individual',
      isAchieved: false,
      progress: ((player.stats.overall - 88) / (95 - 88)) * 50, // Max 50% from rating alone
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'Critical',
      difficulty: 95,
      estimatedSeasons: 3,
      rewards: {
        followerBoost: 15000000,
        moraleBoost: 5,
        reputationBoost: 30,
        narrative: "WORLD PLAYER OF THE YEAR! Reached the absolute pinnacle!"
      }
    });
  }

  // ========== CONTINENTAL CHAMPIONS CUP GLORY ==========
  if (player.team.leagueTier === 1 &&
      player.team.reputation >= 85 &&
      (player.trophies.championsLeague || 0) === 0 &&
      !currentGoals.some(g => g.id.includes('champions_league'))) {

    newGoals.push({
      id: `champions_league_${clubId}_${Date.now()}`,
      description: 'goals.winContinentalCup',
      descriptionParams: { team: player.team.name },
      type: 'long-term',
      category: 'Trophy',
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: player.team.name,
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false
      },
      priority: 'High',
      difficulty: 85,
      estimatedSeasons: 4,
      rewards: {
        followerBoost: 5000000,
        moraleBoost: 4,
        reputationBoost: 25,
        narrative: `European glory with ${player.team.name}!`
      }
    });
  }

  // ========== WORLD CUP DREAM ==========
  if (player.trophies.worldCup === 0 &&
      player.age <= 32 &&
      player.nationalTeamStatus !== 'Not Called' &&
      !currentGoals.some(g => g.id.includes('world_cup'))) {

    newGoals.push({
      id: `world_cup_${Date.now()}`,
      description: 'goals.winWorldCup',
      descriptionParams: { country: player.nationality },
      type: 'career',
      category: 'International',
      isAchieved: false,
      progress: player.nationalTeamStatus === 'Captain' ? 30 :
                player.nationalTeamStatus === 'Regular Starter' ? 20 : 10,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      priority: 'Critical',
      difficulty: 90,
      estimatedSeasons: 8,
      rewards: {
        followerBoost: 20000000,
        moraleBoost: 5,
        reputationBoost: 35,
        narrative: `WORLD CUP CHAMPION! Immortalized in ${player.nationality} history!`
      }
    });
  }

  // ========== CAPTAIN AMBITION ==========
  if (player.squadStatus === 'Key Player' &&
      player.stats.leadership >= 75 &&
      player.age >= 25 &&
      !currentGoals.some(g => g.id.includes('captain'))) {

    newGoals.push({
      id: `captain_${clubId}_${Date.now()}`,
      description: 'goals.becomeCaptain',
      descriptionParams: { team: player.team.name },
      type: 'medium-term',
      category: 'Performance',
      isAchieved: false,
      progress: ((player.stats.leadership - 75) / (90 - 75)) * 70,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: player.team.name,
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false
      },
      priority: 'Medium',
      difficulty: 60,
      estimatedSeasons: 2,
      rewards: {
        followerBoost: 800000,
        moraleBoost: 3,
        reputationBoost: 12,
        narrative: `Named captain of ${player.team.name}!`
      }
    });
  }

  // ========== CENTURY OF GOALS ==========
  const positionMap: { [key in PositionDetail]: Position } = {
    ST: 'Attacker', CF: 'Attacker', LW: 'Attacker', RW: 'Attacker',
    CAM: 'Midfielder', CM: 'Midfielder', CDM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
    CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
    GK: 'Goalkeeper'
  };

  if (positionMap[player.position] === 'Attacker' &&
      player.totalGoals >= 75 &&
      player.totalGoals < 100 &&
      !currentGoals.some(g => g.id.includes('century_goals'))) {

    newGoals.push({
      id: `century_goals_${Date.now()}`,
      description: 'goals.100goals',
      type: 'medium-term',
      category: 'Performance',
      isAchieved: false,
      progress: player.totalGoals,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      targetValue: 100,
      currentValue: player.totalGoals,
      startingValue: player.totalGoals,
      priority: 'High',
      difficulty: 50,
      estimatedSeasons: Math.ceil((100 - player.totalGoals) / 15),
      rewards: {
        followerBoost: 1500000,
        moraleBoost: 3,
        reputationBoost: 15,
        narrative: 'Centurion! 100 career goals!'
      }
    });
  }

  // ========== LOYALTY MILESTONE ==========
  if (player.yearsAtClub >= 8 &&
      player.personality === 'Loyal' &&
      !currentGoals.some(g => g.id.includes('decade_club'))) {

    newGoals.push({
      id: `decade_club_${clubId}_${Date.now()}`,
      description: 'goals.spendDecade',
        descriptionParams: { team: player.team.name },
      type: 'long-term',
      category: 'Loyalty',
      isAchieved: false,
      progress: (player.yearsAtClub / 10) * 100,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: player.team.name,
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false
      },
      targetValue: 10,
      currentValue: player.yearsAtClub,
      startingValue: player.yearsAtClub,
      priority: 'Low',
      difficulty: 40,
      estimatedSeasons: 10 - player.yearsAtClub,
      rewards: {
        followerBoost: 2500000,
        moraleBoost: 4,
        reputationBoost: 18,
        narrative: `A decade at ${player.team.name} - true one-club loyalty!`
      }
    });
  }

  // ========== INTERNATIONAL CENTURION ==========
  if (player.internationalCaps >= 80 &&
      player.internationalCaps < 100 &&
      !currentGoals.some(g => g.id.includes('international_century'))) {

    newGoals.push({
      id: `international_century_${Date.now()}`,
      description: 'goals.reach100Caps',
      descriptionParams: { country: player.nationality },
      type: 'long-term',
      category: 'International',
      isAchieved: false,
      progress: player.internationalCaps,
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false
      },
      targetValue: 100,
      currentValue: player.internationalCaps,
      startingValue: player.internationalCaps,
      priority: 'High',
      difficulty: 60,
      estimatedSeasons: Math.ceil((100 - player.internationalCaps) / 8),
      rewards: {
        followerBoost: 3000000,
        moraleBoost: 4,
        reputationBoost: 20,
        narrative: `International centurion for ${player.nationality}!`
      }
    });
  }

  return newGoals;
};

// ==================== ATUALIZAÃ‡ÃƒO DE PROGRESSO ====================

/**
 * Atualiza progresso de todos os goals e detecta completions
 */
export const updateGoalsProgress = (
  player: Player,
  currentGoals: PlayerGoal[],
  currentSeason: number,
  seasonPerformance: {
    goals: number;
    assists: number;
    matches: number;
    rating: number;
  },
  competitionData?: import('../types').ContextualCompetitionData,
): GoalsResult => {

  // Garante valores seguros para evitar NaN
  const safePerformance = {
    goals: Number.isFinite(seasonPerformance.goals) ? seasonPerformance.goals : 0,
    assists: Number.isFinite(seasonPerformance.assists) ? seasonPerformance.assists : 0,
    matches: Number.isFinite(seasonPerformance.matches) ? seasonPerformance.matches : 0,
    rating: Number.isFinite(seasonPerformance.rating) ? seasonPerformance.rating : 6.0,
  };

  // Debug logging
  console.log(`[updateGoalsProgress] Updating ${currentGoals.length} goals for ${player.name} (Age: ${player.age}, Season: ${currentSeason})`);
  console.log(`[updateGoalsProgress] Performance: ${safePerformance.matches} matches, ${safePerformance.goals} goals, ${safePerformance.assists} assists`);

  // Ensure records exist (V2 system)
  player = ensureObjectiveRecords(player);

  // Generate V2 season objectives if missing
  const v2NewSeasonObjectives = generateSeasonObjectivesV2(
    player,
    currentSeason,
    competitionData as any,
  );

  const completedGoals: PlayerGoal[] = [];
  const expiredGoals: PlayerGoal[] = [];
  const progressUpdates: GoalsResult['progressUpdates'] = [];
  const clubId = `club_${player.team.name.toLowerCase().replace(/\s/g, '_')}`;
  const clubStats = getClubSpecificStats(player, clubId);

  // Inject V2 objectives into the goal pool before processing legacy goals
  const allIncomingGoals = [...currentGoals, ...v2NewSeasonObjectives];

  // ========== PROCESS EACH GOAL ==========
  const updatedGoals = allIncomingGoals.map(goal => {
    const oldProgress = goal.progress;
    let newGoal = { ...goal };

    // ========== CHECK IF EXPIRED ==========

    // Se mudou de clube e goal requer clube específico
    if (goal.context.requiresCurrentClub && goal.context.clubId !== clubId) {
      newGoal.isActive = false;
      newGoal.isExpired = true;
      expiredGoals.push(newGoal);
      return newGoal;
    }

    // Se mudou de liga e goal requer liga específica
    if (goal.context.requiresCurrentLeague && goal.context.leagueId !== player.team.leagueTier.toString()) {
      newGoal.isActive = false;
      newGoal.isExpired = true;
      expiredGoals.push(newGoal);
      return newGoal;
    }

    // Se já alcançado, skip
    if (goal.isAchieved) {
      return newGoal;
    }

    // ========== UPDATE PROGRESS ==========

    switch (goal.id.split('_')[0]) {
      case 'debut':
        if (player.hasMadeSeniorDebut) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        }
        break;

      case 'first':
        if (goal.id.includes('goal') && player.totalGoals > 0) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else if (goal.id.includes('clean') && player.totalMatches > 0) {
          // Would need actual clean sheet tracking
          newGoal.progress = Math.min(100, player.totalMatches * 10);
          if (newGoal.progress >= 100) {
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        } else if (goal.id.includes('trophy')) {
          const hasTrophy = player.trophies.league > 0 ||
                          player.trophies.continentalCup > 0 ||
                          player.trophies.worldCup > 0;

          if (hasTrophy) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          } else {
            // Incremental progress based on team reputation
            newGoal.progress = Math.min(80, (player.team.reputation - 70) * 2);
          }
        }
        break;

      case 'regular':
        if (player.squadStatus === 'Key Player' || player.squadStatus === 'Captain') {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else if (player.squadStatus === 'Rotation') {
          newGoal.progress = 70;
        } else if (player.squadStatus === 'Prospect') {
          newGoal.progress = 40;
        }
        break;

      case 'goal':
      case 'assist':
        if (goal.targetValue && goal.startingValue !== undefined) {
          const current = goal.id.includes('goal') ? player.totalGoals : player.totalAssists;
          newGoal.currentValue = current;

          const progressValue = current - goal.startingValue;
          const targetProgress = goal.targetValue - goal.startingValue;
          newGoal.progress = (progressValue / targetProgress) * 100;

          if (current >= goal.targetValue) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        }
        break;

      case 'ovr':
        if (goal.targetValue && goal.startingValue !== undefined) {
          newGoal.currentValue = player.stats.overall;

          const progressValue = player.stats.overall - goal.startingValue;
          const targetProgress = goal.targetValue - goal.startingValue;
          newGoal.progress = (progressValue / Math.max(1, targetProgress)) * 100;

          if (player.stats.overall >= goal.targetValue) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        }
        break;

      case 'national':
        if (player.nationalTeamStatus !== 'Not Called') {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else {
          newGoal.progress = Math.min(90, (player.stats.overall - 70) * 3);
        }
        break;

      case 'top':
        if (player.team.leagueTier === 1) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else {
          newGoal.progress = Math.min(80, (5 - player.team.leagueTier) * 20);
        }
        break;

      case 'club':
        if (goal.id.includes('legend')) {
          if (goal.targetValue && goal.startingValue !== undefined) {
            newGoal.currentValue = clubStats.matches;

            const progressValue = clubStats.matches - goal.startingValue;
            const targetProgress = goal.targetValue - goal.startingValue;
            newGoal.progress = (progressValue / Math.max(1, targetProgress)) * 100;

            if (clubStats.matches >= goal.targetValue) {
              newGoal.progress = 100;
              newGoal.isAchieved = true;
              completedGoals.push(newGoal);
            }
          }
        } else if (goal.id.includes('record')) {
          if (goal.targetValue && goal.startingValue !== undefined) {
            newGoal.currentValue = clubStats.goals;

            const progressValue = clubStats.goals - goal.startingValue;
            const targetProgress = goal.targetValue - goal.startingValue;
            newGoal.progress = (progressValue / Math.max(1, targetProgress)) * 100;

            if (clubStats.goals >= goal.targetValue) {
              newGoal.progress = 100;
              newGoal.isAchieved = true;
              completedGoals.push(newGoal);
            }
          }
        }
        break;

      case 'ballon':
        if (player.awards.worldPlayerAward > 0) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else {
          // Progress based on multiple factors
          let progress = ((player.stats.overall - 88) / (95 - 88)) * 40;
          progress += (player.awards.teamOfTheYear * 10);
          progress += (player.trophies.continentalCup * 15);
          progress += (player.trophies.worldCup * 25);
          newGoal.progress = Math.min(95, progress);
        }
        break;

      case 'champions':
        const hasChampionsLeague = (player.trophies.championsLeague || 0) > 0;
        if (hasChampionsLeague) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else {
          newGoal.progress = Math.min(80, (player.team.reputation - 80) * 2);
        }
        break;

      case 'world':
        if (player.trophies.worldCup > 0) {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else {
          let progress = 0;
          if (player.nationalTeamStatus === 'Captain') progress += 40;
          else if (player.nationalTeamStatus === 'Regular Starter') progress += 30;
          else if (player.nationalTeamStatus === 'Squad Player') progress += 20;

          progress += (player.internationalCaps / 100) * 30;
          newGoal.progress = Math.min(90, progress);
        }
        break;

      case 'captain':
        if (player.squadStatus === 'Captain') {
          newGoal.progress = 100;
          newGoal.isAchieved = true;
          completedGoals.push(newGoal);
        } else if (player.squadStatus === 'Key Player') {
          newGoal.progress = Math.min(90, ((player.stats.leadership - 75) / (90 - 75)) * 90);
        }
        break;

      case 'century':
        if (goal.id.includes('goals') && goal.targetValue) {
          newGoal.currentValue = player.totalGoals;
          newGoal.progress = (player.totalGoals / goal.targetValue) * 100;

          if (player.totalGoals >= goal.targetValue) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        }
        break;

      case 'decade':
        if (goal.targetValue && goal.startingValue !== undefined) {
          newGoal.currentValue = player.yearsAtClub;
          newGoal.progress = (player.yearsAtClub / goal.targetValue) * 100;

          if (player.yearsAtClub >= goal.targetValue) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        }
        break;

      case 'international':
        if (goal.id.includes('century') && goal.targetValue) {
          newGoal.currentValue = player.internationalCaps;
          newGoal.progress = (player.internationalCaps / goal.targetValue) * 100;

          if (player.internationalCaps >= goal.targetValue) {
            newGoal.progress = 100;
            newGoal.isAchieved = true;
            completedGoals.push(newGoal);
          }
        }
        break;
    }

    // Record progress update if changed
    if (Math.abs(newGoal.progress - oldProgress) > 0.1) {
      progressUpdates.push({
        goal: newGoal,
        oldProgress,
        newProgress: newGoal.progress
      });
    }

    return newGoal;
  });

  // ========== EVALUATE V2 OBJECTIVES (end-of-season) ==========
  const v2Eval = evaluateSeasonObjectivesV2(
    { ...player, playerGoals: updatedGoals },
    currentSeason,
    safePerformance,
    competitionData as any,
  );

  // Apply deltas (lightweight). NOTE: this mutates the player object used by simulation.
  // It's intentionally mild ("misto" model).
  player.clubApproval = clamp(player.clubApproval + (v2Eval.approvalDelta || 0), 0, 100);
  player.reputation = Math.max(0, player.reputation + (v2Eval.reputationDelta || 0));

  // Convert morale delta into legacy morale steps (approximate)
  if (v2Eval.moraleDelta) {
    // Map moraleDelta to boost count (1 step per 2 points)
    const steps = Math.max(1, Math.round(Math.abs(v2Eval.moraleDelta) / 2));
    player.morale = updateMorale(
      player.morale,
      v2Eval.moraleDelta > 0 ? "up" : "down",
      steps,
    );
  }

  // Make V2 outcomes visible to the existing UI/event pipeline by pushing narratives.
  v2Eval.storyEvents.forEach((evt) => {
    if (evt.type === "objective_met") {
      completedGoals.push({
        ...evt.goal,
        isAchieved: true,
        rewards: {
          ...evt.goal.rewards,
          narrative: `Objective met`,
        },
        descriptionParams: {
          ...(evt.goal.descriptionParams || {}),
          v2: 1,
          outcome: evt.outcome || "met",
          objectiveKind: evt.goal.objectiveKind || "expectation",
        },
      });
    } else if (evt.type === "objective_failed") {
      // Create a pseudo-goal completion narrative (negative) - handled as milestone event downstream.
      expiredGoals.push({
        ...evt.goal,
        isActive: false,
        isExpired: true,
        descriptionParams: {
          ...(evt.goal.descriptionParams || {}),
          v2: 1,
          outcome: evt.outcome || "failed",
          objectiveKind: evt.goal.objectiveKind || "expectation",
        },
      });
    }
  });

  // Replace updatedGoals with evaluated set (keeps V2 evaluated flags)
  const goalsAfterV2 = v2Eval.updatedGoals;

  // ========== GENERATE NEW LEGACY GOALS ==========
  const newGoals = generateDynamicGoals(player, goalsAfterV2, currentSeason);

  // Filter out duplicates
  const filteredNewGoals = newGoals.filter(ng =>
    !goalsAfterV2.some(ug => ug.id === ng.id)
  );

  // Combine all goals
  const allGoals = [
    ...goalsAfterV2.filter(g => g.isActive),
    ...filteredNewGoals
  ];

  return {
    updatedGoals: allGoals,
    completedGoals,
    newGoals: [...v2NewSeasonObjectives, ...filteredNewGoals],
    expiredGoals,
    progressUpdates
  };
};

// ==================== FUNÃ‡Ã•ES AUXILIARES ====================

/**
 * Para debug - imprime status de todos os goals
 */
export const printGoalsStatus = (goals: PlayerGoal[], playerName: string): void => {
  console.log(`
========== GOALS STATUS: ${playerName} ==========`);

  const activeGoals = goals.filter(g => g.isActive && !g.isAchieved);
  const completedGoals = goals.filter(g => g.isAchieved);
  const expiredGoals = goals.filter(g => g.isExpired);

  console.log(`
Active Goals (${activeGoals.length}):`);
  activeGoals.forEach(g => {
    const progressBar = 'â–ˆ'.repeat(Math.floor(g.progress / 10)) + 'â–‘'.repeat(10 - Math.floor(g.progress / 10));
    console.log(`  [${progressBar}] ${g.progress.toFixed(0)}% - ${g.description}`);
    console.log(`    Type: ${g.type} | Priority: ${g.priority} | Difficulty: ${g.difficulty}`);
    if (g.context.clubName) {
      console.log(`    Club: ${g.context.clubName} ${g.context.requiresCurrentClub ? '(MUST STAY)' : ''}`);
    }
    if (g.targetValue && g.currentValue !== undefined) {
      console.log(`    Progress: ${g.currentValue}/${g.targetValue}`);
    }
  });

  if (completedGoals.length > 0) {
    console.log(`
âœ… Completed Goals (${completedGoals.length}):`);
    completedGoals.forEach(g => {
      console.log(`  âœ“ ${g.description}`);
      if (g.rewards.narrative) {
        console.log(`    "${g.rewards.narrative}"`);
      }
    });
  }

  if (expiredGoals.length > 0) {
    console.log(`
âŒ Expired Goals (${expiredGoals.length}):`);
    expiredGoals.forEach(g => {
      console.log(`  âœ— ${g.description}`);
      if (g.context.clubName) {
        console.log(`    (Was for ${g.context.clubName})`);
      }
    });
  }

  console.log(`
==========================================
`);
};

/**
 * Obtém goals por prioridade
 */
export const getGoalsByPriority = (goals: PlayerGoal[]): {
  critical: PlayerGoal[];
  high: PlayerGoal[];
  medium: PlayerGoal[];
  low: PlayerGoal[];
} => {
  return {
    critical: goals.filter(g => g.isActive && !g.isAchieved && g.priority === 'Critical'),
    high: goals.filter(g => g.isActive && !g.isAchieved && g.priority === 'High'),
    medium: goals.filter(g => g.isActive && !g.isAchieved && g.priority === 'Medium'),
    low: goals.filter(g => g.isActive && !g.isAchieved && g.priority === 'Low')
  };
};

/**
 * Obtém o próximo goal mais importante
 */
export const getNextKeyGoal = (goals: PlayerGoal[]): PlayerGoal | null => {
  const activeGoals = goals.filter(g => g.isActive && !g.isAchieved);

  if (activeGoals.length === 0) return null;

  // Sort by priority and progress
  const sorted = activeGoals.sort((a, b) => {
    const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // If same priority, prefer closer to completion
    return b.progress - a.progress;
  });

  return sorted[0];
};
