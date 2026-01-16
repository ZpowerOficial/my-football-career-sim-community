import {
  Player,
  Team,
  CompetitionContext,
  ContextualCompetitionData,
  LeagueSimulationResult,
  CupSimulationResult,
  ContinentalSimulationResult,
  CompetitionResult,
  CompetitionType,
} from "../types";
import { simulateLeagueSeason } from "./leagueSimulation";
import { simulateCupSeason } from "./cupSimulation";
import {
  simulateContinentalSeason,
  simulateClubWorldCup,
  simulateSupercopaBrasil,
  simulateRecopaSudamericana,
  simulateFIFAClubWorldCup,
  simulateAmericasDerby,
  simulateChallengerCup,
  simulateFIFAIntercontinentalCup,
} from "./continentalSimulation";
import { simulateStateCup } from "./stateCupSimulation";
import { rand, clamp } from "./utils";
import { LEAGUES } from "../constants/leagues";
import { computeCountryContinental } from "../constants/continentalAccess";
// Sistema de competições juvenis
import {
  simulateYouthSeason,
  getYouthCompetitionContext,
  shouldPromoteToFirstTeam,
  getPromotionTarget,
  YouthSeasonResult,
} from "./youthCompetitionSystem";

// ==================== CONSTANTES DE COMPETIÇÃO ====================

const COMP_NAMES = {
  SUPERCOPA_BRAZIL: "trophy.supercopaBrasil",
  RECOPA: "trophy.recopaSudamericana",
  CLUB_WORLD_CUP: "trophy.clubWorldCup",
  INTERCONTINENTAL: "trophy.intercontinentalCup",
  AMERICAS_DERBY: "trophy.americasDerby",
  CHALLENGER_CUP: "trophy.challengerCup",
  LIBERTADORES: "trophy.libertadores",
  SUDAMERICANA: "trophy.copaSudamericana",
  CHAMPIONS_LEAGUE: "trophy.championsLeague",
  EUROPA_LEAGUE: "trophy.europaLeague",
  CONFERENCE: "trophy.conferenceLeague",
  AFC_CHAMPIONS: "trophy.afcChampionsLeague",
  // CONCACAF Competitions
  CONCACAF_CHAMPIONS: "trophy.concacafChampionsCup",
  CONCACAF_LEAGUE: "trophy.concacafLeague",
  CONCACAF_SHIELD: "trophy.concacafShield",
} as const;

/**
 * ============================================================================
 * SISTEMA CENTRAL DE COMPETIÇÕES CONTEXTUAIS
 * ============================================================================
 */
export class CompetitionSystem {
  private context: CompetitionContext;

  constructor(
    player: Player,
    qualification?: { qualified: boolean; competitionName?: string },
  ) {
    // Usa o país do clube para contexto de competição
    this.context = {
      playerCountry: player.team.country,
      playerTeam: player.team,
      leagueTier: player.team.leagueTier,
      // Será decidido após simulação da liga baseado na posição
      continentalQualification: qualification?.qualified || false,
      continentalCompetitionName: qualification?.competitionName,
      domesticCupParticipation: this.determineDomesticCupParticipation(
        player.team,
      ),
      nationalTeamParticipation:
        this.determineNationalTeamParticipation(player),
    };
  }

  private simulateWDL(
    matches: number,
    teamStrength: number,
    leagueQuality: number = 50,
  ): { matchesWon: number; matchesDrawn: number; matchesLost: number } {
    if (matches === 0)
      return { matchesWon: 0, matchesDrawn: 0, matchesLost: 0 };

    // Base win rate based on team strength relative to league
    // Strength 0-100, League 0-100.

    let winProb = 0.35; // Base
    const diff = teamStrength - leagueQuality;
    winProb += diff * 0.015;
    winProb = clamp(winProb, 0.1, 0.85);

    let drawProb = 0.25;
    if (diff > 20 || diff < -20) drawProb = 0.15; // Less draws in mismatched games

    const wins = Math.round(matches * winProb);
    const draws = Math.round(matches * drawProb);
    const losses = Math.max(0, matches - wins - draws);

    // Adjust to match total exactly
    const currentTotal = wins + draws + losses;
    if (currentTotal !== matches) {
      if (currentTotal < matches)
        return {
          matchesWon: wins + (matches - currentTotal),
          matchesDrawn: draws,
          matchesLost: losses,
        };
      else
        return {
          matchesWon: wins,
          matchesDrawn: draws,
          matchesLost: Math.max(0, matches - wins - draws),
        };
    }

    return { matchesWon: wins, matchesDrawn: draws, matchesLost: losses };
  }

  /**
   * Simula todas as competições contextuais para uma temporada
   */
  async simulateSeason(
    player: Player,
    t: (key: string) => string,
    lastSeasonTitles?: {
      wonLeague?: boolean;
      wonCup?: boolean;
      wonLibertadores?: boolean;
      wonSudamericana?: boolean;
      wonChampionsLeague?: boolean;
    },
  ): Promise<ContextualCompetitionData> {
    const competitions: CompetitionResult[] = [];

    // Rastrear títulos desta temporada para próxima temporada
    let wonLeagueThisSeason = false;
    let wonCupThisSeason = false;
    let wonLibertadoresThisSeason = false;
    let wonSudamericanaThisSeason = false;
    let wonChampionsLeagueThisSeason = false;
    let wonContinentalThisSeason = false;

    // 0a. Supercopa Nacional
    if (player.team.country === "Brazil" && lastSeasonTitles) {
      const supercopaResult = await simulateSupercopaBrasil(
        player,
        lastSeasonTitles.wonLeague || false,
        lastSeasonTitles.wonCup || false,
      );

      if (supercopaResult) {
        competitions.push({
          competition: COMP_NAMES.SUPERCOPA_BRAZIL,
          type: "Cup",
          matchesPlayed: 1,
          goals: supercopaResult.goals,
          assists: supercopaResult.assists,
          rating: supercopaResult.rating,
          cleanSheets: supercopaResult.cleanSheets,
          trophies: supercopaResult.won ? 1 : 0,
          matchesWon: supercopaResult.won ? 1 : 0,
          matchesDrawn: 0,
          matchesLost: supercopaResult.won ? 0 : 1,
        });
      }
    }

    // 0b. Recopa Sul-Americana
    if (player.team.country === "Brazil" && lastSeasonTitles) {
      const recopaResult = await simulateRecopaSudamericana(
        player,
        lastSeasonTitles.wonLibertadores || false,
        lastSeasonTitles.wonSudamericana || false,
      );

      if (recopaResult) {
        competitions.push({
          competition: COMP_NAMES.RECOPA,
          type: "Continental",
          matchesPlayed: 2,
          goals: recopaResult.goals,
          assists: recopaResult.assists,
          rating: recopaResult.rating,
          cleanSheets: recopaResult.cleanSheets,
          trophies: recopaResult.won ? 1 : 0,
          matchesWon: recopaResult.won ? 2 : 1,
          matchesDrawn: 0,
          matchesLost: recopaResult.won ? 0 : 1,
        });
      }
    }

    // 0c. Club World Championship
    const seasonYear = 2020 + (player.age - 17);
    const wonChampionsOrLibertadores =
      lastSeasonTitles?.wonLibertadores ||
      false ||
      player.trophies.championsLeague > 0 ||
      player.trophies.libertadores > 0;

    if (wonChampionsOrLibertadores) {
      const worldCupResult = await simulateFIFAClubWorldCup(
        player,
        player.team,
        seasonYear,
        wonChampionsOrLibertadores,
      );

      if (worldCupResult) {
        competitions.push({
          competition: COMP_NAMES.CLUB_WORLD_CUP,
          type: "Continental",
          matchesPlayed: worldCupResult.won
            ? 7
            : Math.floor(Math.random() * 5) + 3,
          goals: worldCupResult.goals,
          assists: worldCupResult.assists,
          rating: worldCupResult.rating,
          cleanSheets: worldCupResult.cleanSheets,
          trophies: worldCupResult.won ? 1 : 0,
          matchesWon: worldCupResult.won ? 7 : 4,
          matchesDrawn: 0,
          matchesLost: worldCupResult.won ? 0 : 1,
        });
      }
    }

    // 0c.2 FIFA Intercontinental Cup - MOVIDO para depois da simulação continental (seção 3)


    // 0d. Campeonato Estadual (Brasil)
    if (player.team.country === "Brazil") {
      const stateCupResult = await simulateStateCup(player);
      if (stateCupResult) {
        competitions.push({
          competition: stateCupResult.championship,
          type: "State Cup",
          matchesPlayed: stateCupResult.playerStats.matchesPlayed,
          goals: stateCupResult.playerStats.goals,
          assists: stateCupResult.playerStats.assists,
          rating: stateCupResult.playerStats.rating,
          cleanSheets: stateCupResult.playerStats.cleanSheets,
          trophies: stateCupResult.playerStats.wonCup ? 1 : 0,
          matchesWon: Math.round(
            stateCupResult.playerStats.matchesPlayed * 0.6,
          ),
          matchesDrawn: Math.round(
            stateCupResult.playerStats.matchesPlayed * 0.2,
          ),
          matchesLost: Math.round(
            stateCupResult.playerStats.matchesPlayed * 0.2,
          ),
        });
      }
    }

    const leagueResult = await simulateLeagueSeason(this.context, player);
    competitions.push({
      ...this.convertLeagueResultToCompetitionResult(leagueResult, t),
      position: leagueResult.playerStats.position,
      totalTeams: leagueResult.finalTable.length,
      finalTable: leagueResult.finalTable, // Pass finalTable for relegation logic
    });

    wonLeagueThisSeason = leagueResult.playerStats.position === 1;

    const position = leagueResult.playerStats.position;
    const totalTeams = leagueResult.finalTable.length;
    const continentalName = this.determineContinentalCompetitionName(
      this.context.playerCountry,
      position,
      totalTeams,
    );

    // Only update if not already qualified from previous season or if new qualification is better/different
    // Actually, determineContinentalCompetitionName is for the CURRENT season based on rules, but we want to use the qualification from PREVIOUS season.
    // The previous implementation was overriding continentalQualification based on current league position, which is WRONG.
    // Qualification is determined at the END of the season for the NEXT season.
    // So for the CURRENT season, we rely on what was passed in the constructor.

    // However, we might want to update the name if it was generic
    if (
      this.context.continentalQualification &&
      !this.context.continentalCompetitionName
    ) {
      this.context.continentalCompetitionName = continentalName; // Fallback
    }

    // 2. Simulação da copa nacional
    if (this.context.domesticCupParticipation) {
      const cupResult = await simulateCupSeason(this.context, player, t);
      competitions.push({
        ...this.convertCupResultToCompetitionResult(cupResult, t),
        position: cupResult?.playerStats?.position ?? null,
        totalTeams: cupResult?.finalTable?.length ?? null,
      });
    }

    // 3. Simulação de competições continentais
    let continentalResult: ContinentalSimulationResult | undefined;
    if (
      this.context.continentalQualification &&
      this.context.continentalCompetitionName
    ) {
      continentalResult = await simulateContinentalSeason(
        this.context,
        player,
        t,
      );
      competitions.push({
        ...this.convertContinentalResultToCompetitionResult(continentalResult),
        position: continentalResult?.playerStats?.position ?? null,
        totalTeams: continentalResult?.finalTable?.length ?? null,
      });

      if (continentalResult.playerStats.wonCompetition) {
        wonContinentalThisSeason = true;
        const compNameLower =
          this.context.continentalCompetitionName.toLowerCase();

        if (
          compNameLower.includes("libertadores") ||
          compNameLower.includes("south american championship")
        ) {
          wonLibertadoresThisSeason = true;
        } else if (
          compNameLower.includes("sudamericana") ||
          compNameLower.includes("south american cup")
        ) {
          wonSudamericanaThisSeason = true;
        } else if (
          compNameLower.includes("champions") ||
          compNameLower.includes("continental championship")
        ) {
          // UEFA Champions League ou equivalente
          wonChampionsLeagueThisSeason = true;
        }
      }
    }

    // 4. FIFA Intercontinental Cup (mesma temporada, após vencer continental)
    // Estrutura por confederação:
    // - UEFA: Vai direto para a FINAL (1 jogo)
    // - CONMEBOL: Dérbi das Américas → Challenger → Final (até 3 jogos)
    // - CONCACAF: Dérbi das Américas → Challenger → Final (até 3 jogos)
    // - AFC/CAF/OFC: Challenger → Final (até 2 jogos)
    if (wonContinentalThisSeason && continentalResult?.playerStats?.wonCompetition) {
      const compNameLower = this.context.continentalCompetitionName?.toLowerCase() || "";
      
      // Determinar confederação do jogador baseado na competição que venceu
      const isUEFA = compNameLower.includes("champions") && 
                     !compNameLower.includes("afc") && 
                     !compNameLower.includes("caf") && 
                     !compNameLower.includes("ofc") && 
                     !compNameLower.includes("concacaf");
      const isCONMEBOL = compNameLower.includes("libertadores");
      const isCONCACAF = compNameLower.includes("concacaf");
      const isAFC = compNameLower.includes("afc");
      const isCAF = compNameLower.includes("caf");
      const isOFC = compNameLower.includes("ofc");
      
      let reachedFinal = false;
      let wonChallenger = false;
      
      if (isUEFA) {
        // UEFA vai direto para a final
        reachedFinal = true;
      } else if (isCONMEBOL) {
        // CONMEBOL: Dérbi das Américas → Challenger → Final
        const derbyResult = await simulateAmericasDerby(player);
        if (derbyResult) {
          competitions.push({
            competition: COMP_NAMES.AMERICAS_DERBY,
            type: "Continental",
            matchesPlayed: 1,
            goals: derbyResult.goals,
            assists: derbyResult.assists,
            rating: derbyResult.rating,
            cleanSheets: derbyResult.cleanSheets,
            trophies: derbyResult.won ? 1 : 0,
            matchesWon: derbyResult.won ? 1 : 0,
            matchesDrawn: 0,
            matchesLost: derbyResult.won ? 0 : 1,
          });
          
          if (derbyResult.won) {
            const challengerResult = await simulateChallengerCup(player);
            if (challengerResult) {
              competitions.push({
                competition: COMP_NAMES.CHALLENGER_CUP,
                type: "Continental",
                matchesPlayed: 1,
                goals: challengerResult.goals,
                assists: challengerResult.assists,
                rating: challengerResult.rating,
                cleanSheets: challengerResult.cleanSheets,
                trophies: challengerResult.won ? 1 : 0,
                matchesWon: challengerResult.won ? 1 : 0,
                matchesDrawn: 0,
                matchesLost: challengerResult.won ? 0 : 1,
              });
              wonChallenger = challengerResult.won;
              reachedFinal = challengerResult.won;
            }
          }
        }
      } else if (isCONCACAF) {
        // CONCACAF também vai pelo Dérbi (contra CONMEBOL)
        const derbyResult = await simulateAmericasDerby(player);
        if (derbyResult) {
          competitions.push({
            competition: COMP_NAMES.AMERICAS_DERBY,
            type: "Continental",
            matchesPlayed: 1,
            goals: derbyResult.goals,
            assists: derbyResult.assists,
            rating: derbyResult.rating,
            cleanSheets: derbyResult.cleanSheets,
            trophies: derbyResult.won ? 1 : 0,
            matchesWon: derbyResult.won ? 1 : 0,
            matchesDrawn: 0,
            matchesLost: derbyResult.won ? 0 : 1,
          });
          
          if (derbyResult.won) {
            const challengerResult = await simulateChallengerCup(player);
            if (challengerResult) {
              competitions.push({
                competition: COMP_NAMES.CHALLENGER_CUP,
                type: "Continental",
                matchesPlayed: 1,
                goals: challengerResult.goals,
                assists: challengerResult.assists,
                rating: challengerResult.rating,
                cleanSheets: challengerResult.cleanSheets,
                trophies: challengerResult.won ? 1 : 0,
                matchesWon: challengerResult.won ? 1 : 0,
                matchesDrawn: 0,
                matchesLost: challengerResult.won ? 0 : 1,
              });
              wonChallenger = challengerResult.won;
              reachedFinal = challengerResult.won;
            }
          }
        }
      } else if (isAFC || isCAF || isOFC) {
        // AFC/CAF/OFC: Challenger → Final
        const challengerResult = await simulateChallengerCup(player);
        if (challengerResult) {
          competitions.push({
            competition: COMP_NAMES.CHALLENGER_CUP,
            type: "Continental",
            matchesPlayed: 1,
            goals: challengerResult.goals,
            assists: challengerResult.assists,
            rating: challengerResult.rating,
            cleanSheets: challengerResult.cleanSheets,
            trophies: challengerResult.won ? 1 : 0,
            matchesWon: challengerResult.won ? 1 : 0,
            matchesDrawn: 0,
            matchesLost: challengerResult.won ? 0 : 1,
          });
          wonChallenger = challengerResult.won;
          reachedFinal = challengerResult.won;
        }
      }
      
      // Final Intercontinental
      if (reachedFinal) {
        const intercontinentalResult = await simulateFIFAIntercontinentalCup(
          player,
          isUEFA,
          isCONMEBOL,
          wonChallenger,
        );
        if (intercontinentalResult) {
          competitions.push({
            competition: COMP_NAMES.INTERCONTINENTAL,
            type: "Continental",
            matchesPlayed: 1,
            goals: intercontinentalResult.goals,
            assists: intercontinentalResult.assists,
            rating: intercontinentalResult.rating,
            cleanSheets: intercontinentalResult.cleanSheets,
            trophies: intercontinentalResult.won ? 1 : 0,
            matchesWon: intercontinentalResult.won ? 1 : 0,
            matchesDrawn: 0,
            matchesLost: intercontinentalResult.won ? 0 : 1,
          });
        }
      }
    }

    // Determine next season's continental qualification based on this season's results
    const nextSeasonQualification = this.determineContinentalQualification(
      this.context.playerCountry,
      leagueResult.playerStats.position,
      wonCupThisSeason,
      wonContinentalThisSeason,
      this.context.leagueTier,
    );

    return {
      country: this.context.playerCountry,
      leagueTier: this.context.leagueTier,
      domesticCup: this.context.domesticCupParticipation,
      continentalCompetition: this.context.continentalCompetitionName,
      continentalQualification: this.context.continentalQualification,
      competitions,
      seasonTitles: {
        wonLeague: wonLeagueThisSeason,
        wonCup: wonCupThisSeason,
        wonLibertadores: wonLibertadoresThisSeason,
        wonSudamericana: wonSudamericanaThisSeason,
        wonChampionsLeague: wonChampionsLeagueThisSeason,
      },
      nextSeasonQualification,
    };
  }

  private determineDomesticCupParticipation(team: Team): boolean {
    if (team.leagueTier <= 2) return true;
    const participationChance = { 3: 0.7, 4: 0.4, 5: 0.2 };
    const chance =
      participationChance[
        team.leagueTier as keyof typeof participationChance
      ] || 0;
    return Math.random() < chance;
  }

  private determineNationalTeamParticipation(player: Player): boolean {
    if (player.age < 18) return false;
    if (player.age > 35) return Math.random() < 0.3;
    const baseChance =
      player.stats.overall > 80
        ? 0.8
        : player.stats.overall > 75
          ? 0.6
          : player.stats.overall > 70
            ? 0.4
            : 0.2;
    return Math.random() < baseChance;
  }

  private getContinentalCompetitionName(): string | undefined {
    if (this.context.continentalCompetitionName)
      return this.context.continentalCompetitionName;
    if (this.isEuropeanCountry(this.context.playerCountry))
      return COMP_NAMES.CHAMPIONS_LEAGUE;
    const leagueMeta: any = (LEAGUES as any)[this.context.playerCountry];
    if (leagueMeta?.continentalCup) return leagueMeta.continentalCup;
    return undefined;
  }

  private isEuropeanCountry(country: string): boolean {
    const europeanCountries = [
      "England",
      "Spain",
      "Germany",
      "Italy",
      "France",
      "Netherlands",
      "Portugal",
      "Turkey",
      "Belgium",
      "Scotland",
    ];
    return europeanCountries.includes(country);
  }

  private determineContinentalCompetitionName(
    country: string,
    position: number,
    totalTeams: number,
  ): string | undefined {
    const computed = computeCountryContinental(country, position, false);
    if (computed) return computed;
    const leagueMeta: any = (LEAGUES as any)[country];
    const baseCup: string | undefined = leagueMeta?.continentalCup;
    if (!baseCup) return undefined;
    if (
      baseCup === "European Champions Cup" ||
      baseCup === COMP_NAMES.CHAMPIONS_LEAGUE
    ) {
      return this.isEuropeanCountry(country)
        ? position === 1
          ? COMP_NAMES.CHAMPIONS_LEAGUE
          : undefined
        : undefined;
    }
    if (baseCup === "Libertadores" || baseCup === COMP_NAMES.LIBERTADORES) {
      return position === 1 ? COMP_NAMES.LIBERTADORES : undefined;
    }
    return undefined;
  }

  private determineContinentalQualification(
    country: string,
    position: number,
    wonCup: boolean,
    wonContinental: boolean,
    leagueTier: number,
  ): { qualified: boolean; competitionName?: string } {
    // 1. Definição de Vagas por País (Simplificado mas realista)
    // Top 4 Leagues: England, Spain, Germany, Italy
    const isTop4League = ["England", "Spain", "Germany", "Italy"].includes(
      country,
    );
    // Top 6 Leagues: France, Portugal
    const isTop6League = ["France", "Portugal"].includes(country);
    // South America (Brazil/Argentina)
    const isSouthAmerica = ["Brazil", "Argentina"].includes(country);
    // CONCACAF (USA, Mexico, Canada)
    const isConcacaf = ["USA", "Mexico", "Canada"].includes(country);

    // CRITICAL FIX: Only 1st division teams can qualify via league position
    const isFirstDivision = leagueTier === 1;

    if (isTop4League) {
      if (isFirstDivision && position <= 4)
        return {
          qualified: true,
          competitionName: COMP_NAMES.CHAMPIONS_LEAGUE,
        };
      if (isFirstDivision && position === 5)
        return { qualified: true, competitionName: COMP_NAMES.EUROPA_LEAGUE };
      if (isFirstDivision && position === 6)
        return {
          qualified: true,
          competitionName: wonCup
            ? COMP_NAMES.EUROPA_LEAGUE
            : COMP_NAMES.CONFERENCE,
        };
      if (wonCup)
        return { qualified: true, competitionName: COMP_NAMES.EUROPA_LEAGUE };
    } else if (isTop6League) {
      if (isFirstDivision && position <= 3)
        return {
          qualified: true,
          competitionName: COMP_NAMES.CHAMPIONS_LEAGUE,
        };
      if (isFirstDivision && position === 4)
        return { qualified: true, competitionName: COMP_NAMES.EUROPA_LEAGUE };
      if (isFirstDivision && position === 5)
        return { qualified: true, competitionName: COMP_NAMES.CONFERENCE };
      if (wonCup)
        return { qualified: true, competitionName: COMP_NAMES.EUROPA_LEAGUE };
    } else if (isSouthAmerica) {
      // Libertadores: Top 4 + Cup Winner
      if ((isFirstDivision && position <= 4) || wonCup)
        return { qualified: true, competitionName: COMP_NAMES.LIBERTADORES };
      // Sudamericana: 5th-10th (approx)
      if (isFirstDivision && position <= 10)
        return { qualified: true, competitionName: COMP_NAMES.SUDAMERICANA };
    } else if (isConcacaf) {
      // CONCACAF Champions Cup: Top 3 + Cup Winner
      if ((isFirstDivision && position <= 3) || wonCup)
        return { qualified: true, competitionName: COMP_NAMES.CONCACAF_CHAMPIONS };
      // CONCACAF League: 4th-8th
      if (isFirstDivision && position <= 8)
        return { qualified: true, competitionName: COMP_NAMES.CONCACAF_LEAGUE };
    } else {
      // Generic Rules for other leagues
      if (isFirstDivision && position === 1)
        return {
          qualified: true,
          competitionName: this.getContinentalCompetitionName(),
        };
    }

    // Continental Winners qualify automatically (Title Holders)
    if (wonContinental) {
      if (isSouthAmerica)
        return { qualified: true, competitionName: COMP_NAMES.LIBERTADORES };
      if (isTop4League || isTop6League || this.isEuropeanCountry(country))
        return {
          qualified: true,
          competitionName: COMP_NAMES.CHAMPIONS_LEAGUE,
        };
      return {
        qualified: true,
        competitionName:
          this.getContinentalCompetitionName() || COMP_NAMES.CHAMPIONS_LEAGUE,
      };
    }

    return { qualified: false };
  }

  private convertLeagueResultToCompetitionResult(
    result: LeagueSimulationResult,
    t: (key: string) => string,
  ): CompetitionResult {
    const leagueName =
      t(`leagues.${this.context.playerCountry}`) ||
      `${this.context.playerCountry} League`;

    // Na liga, o time joga TODOS os jogos da temporada
    // Calculamos baseado no número de times (n-1)*2 para round-robin
    const totalTeams = result.finalTable.length;
    const teamMatchesPlayed = (totalTeams - 1) * 2; // Ex: 20 times = 38 jogos

    return {
      competition: leagueName,
      type: "League",
      position: result.playerStats.position,
      totalTeams,
      matchesPlayed: result.playerStats.matchesPlayed,
      teamMatchesPlayed, // Jogos do TIME
      goals: result.playerStats.goals,
      assists: result.playerStats.assists,
      rating: result.playerStats.rating,
      cleanSheets: result.playerStats.cleanSheets,
      trophies: result.playerStats.position === 1 ? 1 : 0,
      wonCompetition: result.playerStats.position === 1,
      continentalQualification: this.context.continentalQualification,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
    };
  }

  private convertCupResultToCompetitionResult(
    result: CupSimulationResult,
    t: (key: string) => string,
  ): CompetitionResult {
    const cupName =
      t(`cups.${this.context.playerCountry}`) ||
      `${this.context.playerCountry} Cup`;
    return {
      competition: cupName,
      type: "Cup",
      position: result.playerStats.wonCup ? 1 : 2,
      matchesPlayed: result.playerStats.matchesPlayed,
      teamMatchesPlayed: result.teamMatchesPlayed, // Jogos do TIME na copa
      goals: result.playerStats.goals,
      assists: result.playerStats.assists,
      rating: result.playerStats.rating,
      cleanSheets: result.playerStats.cleanSheets,
      trophies: result.playerStats.wonCup ? 1 : 0,
      wonCompetition: result.playerStats.wonCup,
      matchesWon: result.playerStats.wonCup ? 1 : 0,
      matchesDrawn: 0,
      matchesLost: result.playerStats.wonCup ? 0 : 1,
    };
  }

  private convertContinentalResultToCompetitionResult(
    result: ContinentalSimulationResult,
  ): CompetitionResult {
    return {
      competition:
        this.context.continentalCompetitionName || "trophy.continentalCup",
      type: "Continental",
      position: result.playerStats.position,
      matchesPlayed: result.playerStats.matchesPlayed,
      teamMatchesPlayed: result.teamMatchesPlayed, // Jogos do TIME na continental
      goals: result.playerStats.goals,
      assists: result.playerStats.assists,
      rating: result.playerStats.rating,
      cleanSheets: result.playerStats.cleanSheets,
      trophies: result.playerStats.wonCompetition ? 1 : 0,
      wonCompetition: result.playerStats.wonCompetition,
      matchesWon: result.playerStats.wonCompetition ? 1 : 0,
      matchesDrawn: 0,
      matchesLost: result.playerStats.wonCompetition ? 0 : 1,
    };
  }
}

// ==================== SISTEMA DE COMPETIÇÕES JUVENIS ====================

/**
 * Simula competições contextuais para jogadores em times juvenis
 * Inclui: Liga juvenil, Copa juvenil, UEFA Youth League (se aplicável), Copinha (Brasil)
 */
const simulateYouthContextualCompetitions = async (
  player: Player,
  t: (key: string) => string,
): Promise<ContextualCompetitionData> => {
  const youthResult: YouthSeasonResult = await simulateYouthSeason(player);
  const context = getYouthCompetitionContext(player);

  // Converte resultado juvenil para o formato padrão de ContextualCompetitionData
  const result: ContextualCompetitionData = {
    country: player.team.country,
    leagueTier: player.team.leagueTier,
    domesticCup: context.hasYouthCup,
    continentalCompetition: context.hasYouthContinental ? "UEFA Youth League" : undefined,
    continentalQualification: context.hasYouthContinental,
    competitions: youthResult.competitions,
    // Troféus juvenis não afetam qualificação continental profissional
    seasonTitles: {
      wonLeague: youthResult.competitions.some(c => c.type === "League" && c.wonCompetition),
      wonCup: youthResult.competitions.some(c => c.type === "Cup" && c.wonCompetition),
      wonLibertadores: false,
      wonSudamericana: false,
      wonChampionsLeague: false,
    },
    // Informações adicionais para o sistema de promoção
    youthSeasonData: {
      promotionChance: youthResult.promotionChance,
      scoutingInterest: youthResult.scoutingInterest,
      parentClubInterest: youthResult.parentClubInterest,
      recommendedAction: youthResult.recommendedAction,
      performanceRating: youthResult.performanceRating,
    },
  };

  return result;
};

// Armazenamento global de títulos da última temporada (por time do jogador)
const lastSeasonTitlesCache: Map<
  string,
  {
    wonLeague?: boolean;
    wonCup?: boolean;
    wonLibertadores?: boolean;
    wonSudamericana?: boolean;
    qualification?: {
      qualified: boolean;
      competitionName?: string;
    };
  }
> = new Map();

export const simulateContextualCompetitions = async (
  player: Player,
  t: (key: string) => string,
): Promise<ContextualCompetitionData> => {
  // ==================== YOUTH TEAM BRANCH ====================
  // Se o jogador está em um time juvenil, usar sistema de competições juvenis
  if (player.team.isYouth) {
    return simulateYouthContextualCompetitions(player, t);
  }

  // ==================== PROFESSIONAL TEAM BRANCH ====================
  const teamKey = `${player.team.name}-${player.team.country}`;
  let lastSeasonData = lastSeasonTitlesCache.get(teamKey);

  // FALLBACK: Se não há qualificação válida da temporada anterior, determinar baseada na reputação do clube
  // Clubes de elite sempre jogam competições continentais (mesmo que tenham terminado mal na liga)
  const hasValidQualification =
    lastSeasonData?.qualification?.qualified === true;

  if (!hasValidQualification) {
    const team = player.team;
    const isTop4League = ["England", "Spain", "Germany", "Italy"].includes(
      team.country,
    );
    const isTop6League = ["France", "Portugal"].includes(team.country);
    const isSouthAmerica = ["Brazil", "Argentina"].includes(team.country);
    const isConcacaf = ["USA", "Mexico", "Canada"].includes(team.country);
    const isFirstDivision = team.leagueTier === 1;

    let defaultQualification: { qualified: boolean; competitionName?: string } =
      { qualified: false };

    if (isFirstDivision) {
      if (team.reputation >= 90) {
        // Clubes elite (Bayern, Real, Barcelona, etc) sempre na Champions/Libertadores
        defaultQualification = {
          qualified: true,
          competitionName: isSouthAmerica
            ? COMP_NAMES.LIBERTADORES
            : isConcacaf
              ? COMP_NAMES.CONCACAF_CHAMPIONS
              : COMP_NAMES.CHAMPIONS_LEAGUE,
        };
      } else if (team.reputation >= 82) {
        // Clubes grandes (Sevilla, Roma, etc) geralmente na Champions ou Europa League
        defaultQualification = {
          qualified: true,
          competitionName: isSouthAmerica
            ? COMP_NAMES.LIBERTADORES
            : isConcacaf
              ? COMP_NAMES.CONCACAF_CHAMPIONS
              : isTop4League || isTop6League
                ? COMP_NAMES.CHAMPIONS_LEAGUE
                : COMP_NAMES.EUROPA_LEAGUE,
        };
      } else if (team.reputation >= 75) {
        // Clubes médio-grandes na Europa League/Sudamericana/CONCACAF Champions
        defaultQualification = {
          qualified: true,
          competitionName: isSouthAmerica
            ? COMP_NAMES.SUDAMERICANA
            : isConcacaf
              ? COMP_NAMES.CONCACAF_CHAMPIONS
              : COMP_NAMES.EUROPA_LEAGUE,
        };
      } else if (team.reputation >= 68) {
        // Clubes médios na Conference/Sudamericana/CONCACAF League
        defaultQualification = {
          qualified: true,
          competitionName: isSouthAmerica
            ? COMP_NAMES.SUDAMERICANA
            : isConcacaf
              ? COMP_NAMES.CONCACAF_LEAGUE
              : COMP_NAMES.CONFERENCE,
        };
      }
    }

    if (defaultQualification.qualified) {
      lastSeasonData = {
        ...lastSeasonData,
        qualification: defaultQualification,
      };
    }
  }

  const system = new CompetitionSystem(player, lastSeasonData?.qualification);

  const result = await system.simulateSeason(player, t, lastSeasonData);

  // Armazenar títulos desta temporada para a próxima
  if (result.seasonTitles || result.nextSeasonQualification) {
    lastSeasonTitlesCache.set(teamKey, {
      ...result.seasonTitles,
      qualification: result.nextSeasonQualification,
    });
  }

  return result;
};
