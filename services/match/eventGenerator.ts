import { Player, CareerEvent, ExtendedMatchStats } from "../../types";

export class CareerEventGenerator {
  static generateSeasonEvents(
    stats: ExtendedMatchStats,
    player: Player,
    matchesPlayed: number,
  ): CareerEvent[] {
    const events: CareerEvent[] = [];

    if (Number(stats.goals) >= 50) {
      events.push({
        type: "breakthrough",
        description: 'events.season.legendaryGoals',
        descriptionParams: { goals: stats.goals, matches: matchesPlayed },
      });
    } else if (Number(stats.goals) >= 40) {
      events.push({
        type: "breakthrough",
        description: 'events.season.worldClassGoals',
        descriptionParams: { goals: stats.goals },
      });
    } else if (Number(stats.goals) >= 30) {
      events.push({
        type: "breakthrough",
        description: 'events.season.outstandingGoals',
        descriptionParams: { goals: stats.goals },
      });
    } else if (Number(stats.goals) >= 20) {
      events.push({
        type: "breakthrough",
        description: 'events.season.excellentGoals',
        descriptionParams: { goals: stats.goals },
      });
    }

    if (Number(stats.assists) >= 25) {
      events.push({
        type: "breakthrough",
        description: 'events.season.playmakerMasterclass',
        descriptionParams: { assists: stats.assists },
      });
    } else if (Number(stats.assists) >= 15) {
      events.push({
        type: "breakthrough",
        description: 'events.season.elitePlaymaking',
        descriptionParams: { assists: stats.assists },
      });
    }

    const totalContribution = Number(stats.goals) + Number(stats.assists);
    if (totalContribution >= 60) {
      events.push({
        type: "breakthrough",
        description: 'events.season.phenomenal',
        descriptionParams: { goals: stats.goals, assists: stats.assists, total: totalContribution },
      });
    } else if (totalContribution >= 40) {
      events.push({
        type: "breakthrough",
        description: 'events.season.completeForward',
        descriptionParams: { goals: stats.goals, assists: stats.assists, total: totalContribution },
      });
    } else if (totalContribution >= 25) {
      events.push({
        type: "breakthrough",
        description: 'events.season.strongContributions',
        descriptionParams: { goals: stats.goals, assists: stats.assists, total: totalContribution },
      });
    }

    if (Number(stats.yellowCards) >= 15) {
      events.push({
        type: "setback",
        description: 'events.discipline.majorYellow',
        descriptionParams: { count: stats.yellowCards },
      });
    } else if (Number(stats.yellowCards) >= 12) {
      events.push({
        type: "setback",
        description: 'events.discipline.concernYellow',
        descriptionParams: { count: stats.yellowCards },
      });
    }

    if (Number(stats.redCards) >= 3) {
      events.push({
        type: "setback",
        description: 'events.discipline.criticalRed',
        descriptionParams: { count: stats.redCards },
      });
    } else if (Number(stats.redCards) >= 2) {
      events.push({
        type: "setback",
        description: 'events.discipline.seriousRed',
        descriptionParams: { count: stats.redCards },
      });
    }

    if (Number(stats.goalConversion) >= 25) {
      events.push({
        type: "breakthrough",
        description: 'events.stat.clinicalConversion',
        descriptionParams: { rate: stats.goalConversion.toFixed(1) },
      });
    }

    if (Number(stats.passCompletion) >= 90) {
      events.push({
        type: "breakthrough",
        description: 'events.stat.exceptionalPassing',
        descriptionParams: { rate: stats.passCompletion.toFixed(1) },
      });
    }

    // v0.5.2: Eventos baseados em dados expandidos
    if (player.expandedData) {
      const atk = player.expandedData.attackingStats;

      // GolaÃ§os: jogador que marca gols impossÃ­veis
      if (atk.golazosCount >= 5) {
        events.push({
          type: "breakthrough",
          description: 'events.season.spectacularGolacos',
          descriptionParams: { count: atk.golazosCount },
        });
      } else if (atk.golazosCount >= 3) {
        events.push({
          type: "breakthrough",
          description: 'events.season.wonderGoals',
          descriptionParams: { count: atk.golazosCount },
        });
      }

      // EficiÃªncia clÃ­nica: xG overperformance
      if (atk.xG > 0 && Number(stats.goals) > 0) {
        const clinicalRatio = Number(stats.goals) / atk.xG;
        if (clinicalRatio >= 1.4) {
          events.push({
            type: "breakthrough",
            description: 'events.stat.xGElite',
            descriptionParams: { percent: Math.round((clinicalRatio - 1) * 100) },
          });
        } else if (clinicalRatio >= 1.2) {
          events.push({
            type: "breakthrough",
            description: 'events.stat.xGGood',
            descriptionParams: { percent: Math.round((clinicalRatio - 1) * 100) },
          });
        }
      }

      // Especialista em gols de fora da Ã¡rea
      if (atk.goalsOutsideBox >= 8) {
        events.push({
          type: "breakthrough",
          description: 'events.season.longShotSpecialist',
          descriptionParams: { count: atk.goalsOutsideBox },
        });
      } else if (atk.goalsOutsideBox >= 5) {
        events.push({
          type: "breakthrough",
          description: 'events.season.longRangeThreat',
          descriptionParams: { count: atk.goalsOutsideBox },
        });
      }

      // Dominador aÃ©reo
      if (atk.goalsHeader >= 10) {
        events.push({
          type: "breakthrough",
          description: 'events.season.aerialDominance',
          descriptionParams: { count: atk.goalsHeader },
        });
      } else if (atk.goalsHeader >= 6) {
        events.push({
          type: "breakthrough",
          description: 'events.season.aerialDominant',
          descriptionParams: { count: atk.goalsHeader },
        });
      }

      // Gols decisivos
      if (atk.gameWinningGoals >= 8) {
        events.push({
          type: "breakthrough",
          description: 'events.season.clutchPlayer',
          descriptionParams: { count: atk.gameWinningGoals },
        });
      } else if (atk.gameWinningGoals >= 5) {
        events.push({
          type: "breakthrough",
          description: 'events.season.matchWinner',
          descriptionParams: { count: atk.gameWinningGoals },
        });
      }
    }

    return events;
  }
}
