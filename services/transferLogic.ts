import {
  Player,
  Team,
  Offer,
  SquadStatus,
  PlayerStats,
  CareerEvent,
  Agent,
  TransferOffer,
  MediaNarrative,
  Personality,
  ClubProfile,
  TransferPlayerProfile,
  TransferFit,
} from "../types";
import { LEAGUES, RIVALRIES, YOUTH_LEAGUES } from "../constants.js";
import { rand, clamp, randFloat } from "./utils";
import { determineSquadStatus } from "./statusLogic";
import { computeWeeklyWage, getPlayerProfile } from "./playerProfileLogic";

export const getClubProfile = (team: Team): ClubProfile => {
  const { reputation, leagueTier } = team;

  // Tier baseado em reputação E liga
  let tier: ClubProfile["tier"];
  if (reputation >= 88 && leagueTier === 1) tier = "Elite";
  else if (reputation >= 82 && leagueTier <= 2) tier = "Major";
  else if (reputation >= 75 && leagueTier <= 3) tier = "Standard";
  else if (reputation >= 68) tier = "Lower";
  else tier = "Minor";

  // Poder financeiro (logarítmico, não linear)
  const basePower = Math.pow((reputation - 60) / 39, 1.8) * 100;
  const tierBonus = (6 - leagueTier) * 8;
  let financialPower = clamp(basePower + tierBonus, 10, 100);

  // Penalidade por rebaixamento para grandes clubes
  if (reputation > 85 && leagueTier > 1) {
    financialPower *= 0.6; // Reduz o poder financeiro em 40%
  }

  // Atratividade (inclui fatores não-financeiros)
  const historyBonus = reputation > 85 ? 15 : reputation > 80 ? 10 : 5;
  const leagueBonus = leagueTier === 1 ? 20 : leagueTier === 2 ? 10 : 0;
  let attractiveness = clamp(
    reputation - 60 + historyBonus + leagueBonus,
    20,
    100,
  );

  // Penalidade por rebaixamento para grandes clubes
  if (reputation > 85 && leagueTier > 1) {
    attractiveness *= 0.7; // Reduz a atratividade em 30%
  }

  // Índice de desenvolvimento (clubes específicos + tier)
  const developmentClubs = [
    "Ajax",
    "Benfica",
    "Porto",
    "Sporting CP",
    "Borussia Dortmund",
    "RB Salzburg",
    "Monaco",
    "Lyon",
    "Athletic Bilbao",
    "Real Sociedad",
  ];
  const isDevelopmentClub = developmentClubs.includes(team.name);
  const developmentIndex = isDevelopmentClub
    ? clamp(75 + rand(0, 25), 75, 100)
    : clamp(40 + (reputation - 70) * 1.5, 20, 85);

  // Nível de ambição (baseado em histórico recente simulado)
  const ambitionLevel = clamp(reputation - 20 + rand(-10, 15), 30, 95);

  // Atividade no mercado de transferências
  const transferActivity = clamp(
    financialPower * 0.6 + ambitionLevel * 0.4 + rand(-10, 10),
    20,
    95,
  );

  // Estilo de jogo baseado no tier e reputação
  let playingStyle: ClubProfile["playingStyle"];
  if (leagueTier === 1 && reputation >= 90) playingStyle = "Possession";
  else if (leagueTier <= 2 && reputation >= 85) playingStyle = "Balanced";
  else if (reputation >= 80) playingStyle = "Counter";
  else if (reputation >= 70) playingStyle = "Direct";
  else playingStyle = "Defensive";

  // Orçamento salarial (em milhares de euros por semana)
  // Preferir orçamento persistente do time, se existir
  const teamWageWeeklyEUR = team.wageBudgetWeeklyEUR;
  let wageBudget =
    typeof teamWageWeeklyEUR === "number"
      ? Math.max(1, Math.round(teamWageWeeklyEUR / 1000))
      : Math.round(financialPower * 15 + rand(0, 50));

  // ========= OR�?AMENTOS DERIVADOS PARA TRANSFER�SNCIAS =========
  // Transfer budget em �,� baseado no poder financeiro e tier da liga (escala não linear)
  const fp = clamp(financialPower, 10, 100);
  const baseBudget = Math.pow(fp / 100, 2.2) * 250_000_000; // até ~�,�250M para FP=100
  const tierMult =
    leagueTier === 1
      ? 1.0
      : leagueTier === 2
        ? 0.7
        : leagueTier === 3
          ? 0.45
          : 0.25;
  let transferBudget = Math.round(
    clamp(baseBudget * tierMult, 1_000_000, 300_000_000),
  );
  if (typeof team.transferBudgetEUR === "number") {
    transferBudget = clamp(
      Math.round(team.transferBudgetEUR),
      1_000_000,
      500_000_000,
    );
  }

  // Teto salarial por jogador (fração do orçamento semanal do clube)
  // Ajustado: reduzir agressivamente para clubes fracos (feedback: salários irreais em clubes pobres)
  // Elite mantém espaço para super estrelas; Minor/Lower recebem cortes para evitar absurdos.
  const share =
    tier === "Elite"
      ? 0.18
      : tier === "Major"
        ? 0.22
        : tier === "Standard"
          ? 0.25 // antes 0.28
          : tier === "Lower"
            ? 0.27 // antes 0.33
            : 0.22; // Minor antes 0.38
  const wageCap = Math.round(wageBudget * 1000 * share); // wageBudget está em milhares/semana

  // Definir o nível máximo de jogador que o clube pode ter
  let maxOverall = 90;
  switch (team.reputation) {
    case 95:
      maxOverall = 98;
      break;
    case 90:
      maxOverall = 95;
      break;
    case 85:
      maxOverall = 92;
      break;
    case 80:
      maxOverall = 89;
      break;
    case 75:
      maxOverall = 85;
      break;
    case 70:
      maxOverall = 82;
      break;
    case 65:
      maxOverall = 79;
      break;
    case 60:
      maxOverall = 75;
      break;
  }

  // Ajustar para ligas inferiores
  maxOverall -= (5 - team.leagueTier) * 5;

  // Limite mínimo para evitar clubes muito fracos
  maxOverall = Math.max(65, maxOverall);

  return {
    tier,
    financialPower,
    attractiveness,
    developmentIndex,
    ambitionLevel,
    transferActivity,
    playingStyle,
    wageBudget,
    maxPlayerOverall: maxOverall,
    transferBudget,
    wageCap,
  };
};

export const calculateTransferFit = (
  player: Player,
  playerProfile: TransferPlayerProfile,
  targetTeam: Team,
  clubProfile: ClubProfile,
): TransferFit => {
  // ========== STATUS FIT ==========
  const expectedStatus = determineSquadStatus({
    ...player,
    team: targetTeam,
    hasMadeSeniorDebut: true,
  });
  const statusOrder: SquadStatus[] = [
    "Surplus",
    "Reserve",
    "Prospect",
    "Rotation",
    "Key Player",
  ];
  const currentStatusIndex = statusOrder.indexOf(player.squadStatus);
  const expectedStatusIndex = statusOrder.indexOf(expectedStatus);

  let statusFit = 50;

  // Jogador quer melhorar status
  if (expectedStatusIndex > currentStatusIndex) {
    statusFit += (expectedStatusIndex - currentStatusIndex) * 15;
  } else if (expectedStatusIndex < currentStatusIndex) {
    statusFit -= (currentStatusIndex - expectedStatusIndex) * 20;
  }

  // Jovens aceitam ser "Prospect" em clubes grandes
  if (
    player.age < 22 &&
    expectedStatus === "Prospect" &&
    clubProfile.tier === "Elite"
  ) {
    statusFit += 15;
  }

  statusFit = clamp(statusFit, 10, 100);

  // ========== FINANCIAL FIT ==========
  const expectedWage = computeWeeklyWage(
    targetTeam,
    expectedStatus,
    player.stats.overall,
  );
  const wageRatio = expectedWage / player.wage;

  let financialFit = 50;

  if (wageRatio >= 1.5)
    financialFit = 95; // Grande aumento
  else if (wageRatio >= 1.2) financialFit = 85;
  else if (wageRatio >= 1.05) financialFit = 70;
  else if (wageRatio >= 0.95) financialFit = 55;
  else if (wageRatio >= 0.8) financialFit = 35;
  else financialFit = 15; // Corte salarial

  // Pode o clube pagar?
  const canAfford =
    clubProfile.financialPower >= playerProfile.trueValue / 5000000;
  if (!canAfford) financialFit *= 0.3;

  financialFit = clamp(financialFit, 5, 100);

  // ========== CULTURAL FIT ==========
  let culturalFit = 60; // Base neutra

  // Mesma liga = mais fácil adaptação
  const sameLeague = Object.values(LEAGUES).some(
    (league) =>
      Object.values(league.divisions)
        .flat()
        .some((t) => t.name === player.team.name) &&
      Object.values(league.divisions)
        .flat()
        .some((t) => t.name === targetTeam.name),
  );

  if (sameLeague) culturalFit += 20;

  // Diferença de tier (choque cultural)
  const tierDifference = Math.abs(
    player.team.leagueTier - targetTeam.leagueTier,
  );
  culturalFit -= tierDifference * 8;

  // Jogador experiente adapta-se melhor
  if (player.age > 26) culturalFit += 10;

  // Personalidade
  if (player.personality === "Professional") culturalFit += 10;
  if (player.personality === "Ambitious") culturalFit += 5;

  culturalFit = clamp(culturalFit, 20, 100);

  // ========== TACTICAL FIT ==========
  let tacticalFit = 70; // Base

  // Clubes de desenvolvimento para jovens
  if (player.age < 23 && clubProfile.developmentIndex > 75) {
    tacticalFit += 15;
  }

  // Estilo de jogo (simulado baseado em tier e reputação)
  const playerStyle =
    player.stats.dribbling > 80
      ? "Technical"
      : player.stats.physical > 80
        ? "Physical"
        : "Balanced";

  // Top clubs preferem técnica
  if (clubProfile.tier === "Elite" && playerStyle === "Technical")
    tacticalFit += 10;

  tacticalFit = clamp(tacticalFit, 30, 100);

  // ========== CAREER FIT ==========
  let careerFit = 50;

  // Progressão de carreira
  if (targetTeam.reputation > player.team.reputation) {
    const repGap = targetTeam.reputation - player.team.reputation;
    careerFit += Math.min(repGap * 2, 35);
  } else if (targetTeam.reputation < player.team.reputation) {
    const repGap = player.team.reputation - targetTeam.reputation;
    careerFit -= Math.min(repGap * 1.5, 30);
  }

  // Liga melhor
  if (targetTeam.leagueTier < player.team.leagueTier) {
    careerFit += (player.team.leagueTier - targetTeam.leagueTier) * 12;
  }

  // Jogadores ambiciosos querem progressão
  if (player.personality === "Ambitious" && careerFit < 50) careerFit -= 15;

  // Veteranos podem aceitar step down
  if (player.age > 32 && careerFit < 50) careerFit += 20;

  careerFit = clamp(careerFit, 10, 100);

  // ========== OVERALL SCORE ==========
  const overallScore =
    statusFit * 0.3 +
    financialFit * 0.25 +
    careerFit * 0.2 +
    culturalFit * 0.15 +
    tacticalFit * 0.1;

  return {
    overallScore: Math.round(overallScore),
    statusFit,
    financialFit,
    culturalFit,
    tacticalFit,
    careerFit,
  };
};

export const isRealisticOffer = (
  player: Player,
  team: Team,
  playerProfile: TransferPlayerProfile,
): boolean => {
  const clubProfile = getClubProfile(team);

  // Clubes com teto de qualidade: recusa ofertas acima do nível que conseguem sustentar
  if (player.stats.overall > clubProfile.maxPlayerOverall + 1) return false;

  if (team.reputation >= 85 && player.stats.overall < 65) return false;
  if (team.reputation >= 80 && player.stats.overall < 60) return false;
  if (team.reputation >= 75 && player.stats.overall < 55) return false;

  if (player.age > 32) {
    if (team.reputation >= 85 && player.stats.overall < 75) return false;
    if (team.reputation >= 80 && player.stats.overall < 70) return false;
  }

  const isArabLeague =
    team.country === "Saudi Arabia" ||
    team.country === "UAE" ||
    team.country === "Qatar";

  if (isArabLeague) {
    if (player.age < 23 && player.potential < 80) return false;
    if (player.age >= 23 && player.age <= 30 && player.stats.overall < 70)
      return false;
    if (player.age > 30 && player.stats.overall < 75) return false;
  }

  const repGap = team.reputation - player.reputation;
  if (repGap > 30 && playerProfile.marketTier === "Fringe") return false;

  if (!playerProfile.idealClubTiers.includes(clubProfile.tier)) {
    if (clubProfile.tier === "Minor" || clubProfile.tier === "Lower") {
      if (player.potential > 80) return false;
    }

    if (player.age < 35 && player.seasonsWithLowPlayingTime < 3) return false;
  }

  return true;
};

export const getTransferOffers = (
  player: Player,
  agitatingForTransfer: boolean = false,
  isForcedToMove: boolean = false,
): Offer[] => {
  if (player.age > 35 || player.injury?.type === "Career-Ending") return [];
  if (player.retired) return [];

  const isDesperate = agitatingForTransfer || isForcedToMove;

  const playerProfile = getPlayerProfile(player, isDesperate);

  if (!isDesperate && Math.random() > playerProfile.transferProbability / 100) {
    return [];
  }

  const allTeams: Team[] = [
    ...Object.values(LEAGUES).flatMap((league) =>
      Object.values(league.divisions)
        .flat()
        .map((team) => ({ id: `${team.name}-${team.country}`, ...team })),
    ),
    ...Object.values(YOUTH_LEAGUES).flatMap((league) =>
      Object.values(league.divisions)
        .flat()
        .map((team) => ({ id: `${team.name}-${team.country}`, ...team })),
    ),
  ];

  const eligibleTeams = allTeams.filter((team) => {
    if (team.name === player.team.name) return false;
    if (player.parentClub && team.name === player.parentClub.name) return false;

    if (player.hasMadeSeniorDebut && team.isYouth) return false;
    if (team.isYouth && player.age >= 20) return false;

    const clubProfile = getClubProfile(team);

    if (!isRealisticOffer(player, team, playerProfile)) return false;

    if (!playerProfile.idealClubTiers.includes(clubProfile.tier)) return false;

    if (clubProfile.transferActivity < 30 && !isDesperate) return false;

    return true;
  });

  if (eligibleTeams.length === 0) {
    return [];
  }
  
  // ==================== PRODIGY & VISIBILITY SYSTEM ====================
  // Models real-world scouting networks: talent in elite leagues is discovered faster
  // than talent in obscure leagues. A 75 OVR 17-year-old in Série A Brazil is spotted
  // faster than one in 4th division Portugal.
  
  const isYouthStar = player.stats.overall >= 80 && player.age <= 21;
  const isProdigy = player.stats.overall >= 75 && player.age <= 17;
  
  // Visibility factor: league tier affects how fast elite scouts discover talent
  // Tier 1-2: Full visibility (major leagues have scouts everywhere)
  // Tier 3: 70% chance of discovery per window
  // Tier 4-5: Lower chance, requires "lucky break" for elite interest
  const visibilityFactor = player.team.leagueTier <= 2 ? 1.0 :
                           player.team.leagueTier === 3 ? 0.7 :
                           player.team.leagueTier === 4 ? 0.4 : 0.2;
  
  // Scout discovery: elite clubs may not see the player this window
  const scoutDiscovery = Math.random() < visibilityFactor;

  // Evaluate all offers first (before filtering), so we can selectively include elite clubs
  const evaluatedAll = eligibleTeams.map((team) => {
    const clubProfile = getClubProfile(team);
    const fit = calculateTransferFit(player, playerProfile, team, clubProfile);

    // ====== CONTEXTUAL NEEDS: STYLE + DEPTH GAP (HEURISTIC) ======
    const styleNeedByPosition: Record<string, Record<string, number>> = {
      Possession: {
        CAM: 1.15,
        CM: 1.12,
        LW: 1.1,
        RW: 1.1,
        LB: 1.06,
        RB: 1.06,
        ST: 1.02,
      },
      Balanced: {
        ST: 1.05,
        CF: 1.05,
        CAM: 1.05,
        CM: 1.05,
        CB: 1.03,
        CDM: 1.03,
      },
      Counter: { ST: 1.15, LW: 1.12, RW: 1.12, CF: 1.08, CM: 1.02 },
      Direct: { ST: 1.18, CF: 1.12, CB: 1.08, LB: 1.03, RB: 1.03 },
      Defensive: { CB: 1.15, CDM: 1.12, GK: 1.06, LB: 1.04, RB: 1.04 },
    } as any;

    const styleMult =
      (styleNeedByPosition[clubProfile.playingStyle] || {})[player.position] ||
      1.0;

    // Expected starter OVR baseline by tier/reputation (lightweight heuristic)
    const tierBaseline = [0, 88, 82, 76, 71, 66][team.leagueTier] || 66;
    const repAdj = Math.max(
      -6,
      Math.min(6, Math.round((team.reputation - 80) / 2)),
    );
    const baselineOVR = Math.max(60, Math.min(92, tierBaseline + repAdj));
    const ovrGap = player.stats.overall - baselineOVR; // positive means upgrade
    const depthGapMult =
      ovrGap >= 0
        ? 1 + Math.min(0.2, ovrGap * 0.01)
        : 1 + Math.max(-0.1, ovrGap * 0.005);

    // Expected status magnifier: clubs care more when the player arrives as Key Player
    const statusMagnifier: Record<SquadStatus, number> = {
      Captain: 1.2,
      "Key Player": 1.15,
      Rotation: 1.05,
      Prospect: isDesperate ? 1.02 : 0.95,
      Reserve: 0.9,
      Surplus: 0.85,
    } as any;
    const expectedStatus = determineSquadStatus({
      ...player,
      team,
      hasMadeSeniorDebut: true,
    });
    const needScore =
      styleMult * depthGapMult * (statusMagnifier[expectedStatus] || 1.0);

    let clubInterest = 50;

    clubInterest += clubProfile.ambitionLevel * 0.3;

    clubInterest += clubProfile.transferActivity * 0.2;

    clubInterest += playerProfile.desirability * 0.4;

    clubInterest += fit.overallScore * 0.3;

    // Elite clubs track high-OVR young players more aggressively
    if (isYouthStar && clubProfile.tier === "Elite") {
      clubInterest += 10; // modest boost to ensure elite interest emerges
    }

    // Blend in contextual need (bounded influence)
    clubInterest *= Math.max(0.85, Math.min(1.2, needScore));

    const isRival = RIVALRIES.some(
      (rivalry) =>
        (rivalry.team1 === player.team.name && rivalry.team2 === team.name) ||
        (rivalry.team2 === player.team.name && rivalry.team1 === team.name),
    );
    if (isRival) clubInterest -= 40;

    clubInterest = clamp(clubInterest, 5, 98);

    return {
      team,
      clubProfile,
      fit,
      clubInterest,
      needScore,
      score:
        fit.overallScore * 0.5 + clubInterest * 0.35 + needScore * 100 * 0.15,
    };
  });

  // Primary filter for evaluated offers
  let evaluatedOffers = evaluatedAll
    .filter((offer) => {
      // If not desperate, require at least neutral need (>= 0.95) to include
      // Relaxed for elite clubs targeting youth stars: allow slightly lower need threshold
      const relaxedForEliteYouth =
        isYouthStar && offer.clubProfile.tier === "Elite" ? 0.9 : 0.95;
      const needThreshold = isDesperate ? 0.0 : relaxedForEliteYouth;
      const shouldInclude =
        (offer.clubInterest > 35 &&
          (isDesperate || offer.needScore >= needThreshold)) ||
        isDesperate;
      return shouldInclude;
    })
    .sort((a, b) => b.score - a.score);

  // Fallback: ensure at least one Elite option appears for youth stars if any exist among eligible teams
  if (isYouthStar) {
    const hasEliteAlready = evaluatedOffers.some(
      (o) => o.clubProfile.tier === "Elite",
    );
    if (!hasEliteAlready) {
      const eliteCandidates = evaluatedAll
        .filter((o) => o.clubProfile.tier === "Elite" && o.clubInterest > 35)
        .sort((a, b) => b.score - a.score);
      if (eliteCandidates.length > 0) {
        // Prepend best elite candidate to the list
        evaluatedOffers = [eliteCandidates[0], ...evaluatedOffers];
      }
    }
  }
  
  // ==================== PRODIGY ELITE SCOUTING ====================
  // Elite clubs aggressively scout prodigies (OVR 75+ at 17)
  // But visibility matters: obscure leagues require "discovery" event
  if (isProdigy && scoutDiscovery) {
    const hasElite = evaluatedOffers.some(o => o.clubProfile.tier === 'Elite');
    if (!hasElite) {
      // Elite scout discovered the prodigy - add offer from best elite club
      const eliteCandidates = evaluatedAll
        .filter(o => o.clubProfile.tier === 'Elite' && o.clubInterest > 25)
        .sort((a, b) => b.score - a.score);
      if (eliteCandidates.length > 0) {
        evaluatedOffers = [eliteCandidates[0], ...evaluatedOffers];
      }
    }
  }

  let numOffers = 1;

  if (isDesperate) {
    numOffers = rand(4, 6);
  } else {
    const baseOffers = Math.floor(playerProfile.desirability / 25);
    numOffers = clamp(baseOffers + rand(0, 2), 1, 5);

    if (playerProfile.marketTier === "World Class") numOffers += 2;
    else if (playerProfile.marketTier === "Elite") numOffers += 1;
  }

  // Slightly increase offer count for youth stars
  if (!isDesperate && isYouthStar) {
    numOffers = clamp(numOffers + 1, 1, 6);
  }

  const topOffers = evaluatedOffers.slice(
    0,
    Math.min(numOffers, evaluatedOffers.length),
  );

  const finalOffers: Offer[] = [];

  for (const { team, clubProfile, fit } of topOffers) {
    const expectedStatus = determineSquadStatus({
      ...player,
      team,
      hasMadeSeniorDebut: true,
    });

    const canBeLoan =
      player.age < 24 &&
      playerProfile.marketTier !== "World Class" &&
      playerProfile.marketTier !== "Elite" &&
      player.contractLength > 1;

    const loanProbability = canBeLoan
      ? clubProfile.tier === "Elite" && expectedStatus === "Prospect"
        ? 0.65
        : 0.35
      : 0;

    const isLoan = Math.random() < loanProbability && !isDesperate;

    if (isLoan) {
      const duration = player.age < 20 ? rand(1, 2) : 1;
      const wageContribution =
        clubProfile.financialPower > 70
          ? 100
          : clubProfile.financialPower > 50
            ? rand(80, 100)
            : rand(60, 90);

      finalOffers.push({
        type: "loan",
        team,
        wageContribution,
        duration,
        expectedSquadStatus: expectedStatus,
      });
    } else {
      let transferFee = playerProfile.trueValue;

      const demandMultiplier = 1 + (playerProfile.desirability - 50) / 200;
      transferFee *= demandMultiplier;

      const negotiationMultiplier =
        1 + playerProfile.negotiationDifficulty / 100;
      transferFee *= negotiationMultiplier;

      const clubMultiplier = 0.85 + clubProfile.financialPower / 200;
      transferFee *= clubMultiplier;

      if (player.contractLength <= 1) transferFee *= 0.7;
      if (player.seasonsWithLowPlayingTime >= 2) transferFee *= 0.75;
      if (isDesperate) transferFee *= 0.6;

      transferFee *= randFloat(0.85, 1.2);

      // Keep transfer fee in a sane range vs. computed marketValue
      if (player.marketValue && player.marketValue > 0) {
        const mv = player.marketValue;
        const minFee = Math.max(1000, Math.round(mv * 0.5));
        const maxFee = Math.min(450000000, Math.round(mv * 1.8));
        transferFee = clamp(Math.round(transferFee), minFee, maxFee);
      } else {
        transferFee = clamp(Math.round(transferFee), 1000, 450000000);
      }

      // Affordability gate: clubes abaixo do orçamento não entram na disputa
      const canPayFee =
        transferFee <= Math.round(clubProfile.transferBudget * 1.05);
      if (!canPayFee && !isDesperate) {
        // Não consegue pagar essa taxa �?" ignora oferta
        continue;
      }
      if (!canPayFee && isDesperate) {
        // Jogador forçando saída: aceita desconto até caber no orçamento do clube
        transferFee = Math.min(
          transferFee,
          Math.round(clubProfile.transferBudget * randFloat(0.88, 1.02)),
        );
      }

      const baseWage = computeWeeklyWage(
        team,
        expectedStatus,
        player.stats.overall,
      );
      let offeredWage = baseWage;

      const agentBonus =
        player.agent.reputation === "Super Agent"
          ? 1.18
          : player.agent.reputation === "Good"
            ? 1.1
            : player.agent.reputation === "Average"
              ? 1.05
              : 1.0;
      offeredWage *= agentBonus;

      if (topOffers.length >= 4) offeredWage *= 1.08;

      if (fit.overallScore < 60) offeredWage *= 1.12;

      offeredWage *= randFloat(0.95, 1.08);

      // Enforce wage sanity floors to avoid illogical downgrades
      const statusOrder: SquadStatus[] = [
        "Surplus",
        "Reserve",
        "Prospect",
        "Rotation",
        "Key Player",
        "Captain",
      ];
      const playerStatusIdx = statusOrder.indexOf(player.squadStatus as any);
      const expectedIdx = statusOrder.indexOf(expectedStatus as any);
      const movingUpTier = team.leagueTier < player.team.leagueTier;
      const sameTier = team.leagueTier === player.team.leagueTier;
      const isLateralOrUpRole = expectedIdx >= playerStatusIdx;

      // Compute a robust floor using current wage and local baseline
      // - Never below 70% of current wage for any permanent transfer
      // - Same tier or up-tier with same/higher role: >= 100% or 120% of current wage respectively
      // - Ensure not below ~75% of destination club's baseline for this role/OVR
      const currentWage = player.wage;
      const targetBaseline = baseWage; // already includes team rep and league salaryMultiplier
      let floorFromMove = Math.round(currentWage * 0.7);
      if (isLateralOrUpRole && sameTier)
        floorFromMove = Math.round(currentWage * 1.0);
      if (isLateralOrUpRole && movingUpTier)
        floorFromMove = Math.round(currentWage * 1.2);

      const floorFromLeague = Math.round(targetBaseline * 0.75);
      const absoluteFloor = Math.max(floorFromMove, floorFromLeague);

      const preFloorWage = offeredWage;
      offeredWage = Math.max(offeredWage, absoluteFloor);

      // Teto salarial do clube (por jogador)
      if (offeredWage > clubProfile.wageCap) {
        offeredWage = clubProfile.wageCap;
      }

      // Se após aplicar pisos e teto o salário ficar abaixo do piso absoluto, rejeita por inviabilidade
      if (offeredWage < absoluteFloor && !isDesperate) {
        continue; // clube não consegue chegar num acordo salarial mínimo
      }

      offeredWage = clamp(Math.round(offeredWage), 1000, 800000);

      // ================= FINANCIAL VIABILITY CHECK =================
      // Se o salário consumiria uma fatia desproporcional do orçamento semanal total, rejeita (clube não consegue sustentar)
      const weeklyBudgetEUR = clubProfile.wageBudget * 1000; // wageBudget está em milhares
      const viabilityRatio = offeredWage / Math.max(1, weeklyBudgetEUR);
      const excessiveForMinor =
        clubProfile.tier === "Minor" && viabilityRatio > 0.22; // >22% do orçamento semanal
      const excessiveForLower =
        clubProfile.tier === "Lower" && viabilityRatio > 0.25;
      const excessiveForStandard =
        clubProfile.tier === "Standard" && viabilityRatio > 0.3;
      // Para Major/Elite permitimos maior concentração, não bloqueia aqui
      if (
        (excessiveForMinor || excessiveForLower || excessiveForStandard) &&
        !isDesperate
      ) {
        // Clube simplesmente não consegue sustentar essa folha salarial para um único jogador
        continue;
      }

      const debug_info = `base=${baseWage}, preFloor=${preFloorWage}, floorMove=${floorFromMove}, floorLeague=${floorFromLeague}, final=${offeredWage}, current=${currentWage}, tiers: from ${player.team.leagueTier} to ${team.leagueTier}, role: ${player.squadStatus} -> ${expectedStatus}`;

      let contractLength: number;
      if (player.age >= 34) contractLength = rand(1, 2);
      else if (player.age >= 31) contractLength = rand(2, 3);
      else if (player.age >= 28) contractLength = rand(3, 4);
      else if (player.age <= 21) contractLength = rand(4, 5);
      else contractLength = rand(3, 5);

      finalOffers.push({
        type: "transfer",
        team,
        transferFee,
        wage: offeredWage,
        contractLength,
        expectedSquadStatus: expectedStatus,
        debug_info,
      });
    }
  }

  return finalOffers;
};

export const processTransfer = (
  player: Player,
  offer: Offer,
): { updatedPlayer: Player; event: CareerEvent; followerChange: number } => {
  if (offer.type === "loan") {
    // Handle loan
    let updatedPlayer: Player = {
      ...player,
      team: offer.team,
      squadStatus: offer.expectedSquadStatus,
      teamChemistry: rand(30, 50),
      clubApproval: rand(50, 70),
      yearsAtClub: 0,
      parentClub: player.team,
      loanDuration: offer.duration,
      // Starter promise for loans too if Key Player
      promisedSquadStatus:
        offer.expectedSquadStatus === "Key Player" ? "Key Player" : undefined,
      roleGuaranteeSeasons:
        offer.expectedSquadStatus === "Key Player" ? 1 : undefined,
      roleGuaranteeMatches:
        offer.expectedSquadStatus === "Key Player" ? 18 : undefined,
    };

    const followerChange = Math.round(
      (offer.team.reputation - player.team.reputation) *
        1000 *
        randFloat(0.8, 1.2),
    );

    const event: CareerEvent = {
      type: "loan",
      description: `events.transfer.loaned`,
      descriptionParams: {
        team: offer.team.name,
        duration: offer.duration,
      },
    };

    return { updatedPlayer, event, followerChange };
  } else {
    // Handle transfer
    // Initialize/consume destination club budgets
    const destProfile = getClubProfile(offer.team);
    const initializedTeam: Team = {
      ...offer.team,
      transferBudgetEUR:
        offer.team.transferBudgetEUR ?? destProfile.transferBudget,
      remainingTransferBudgetEUR:
        offer.team.remainingTransferBudgetEUR ?? destProfile.transferBudget,
      wageBudgetWeeklyEUR:
        offer.team.wageBudgetWeeklyEUR ?? destProfile.wageBudget * 1000,
      remainingWageBudgetWeeklyEUR:
        offer.team.remainingWageBudgetWeeklyEUR ??
        destProfile.wageBudget * 1000,
    };

    // Deduct fee and wages from remaining budgets (clamped at 0)
    if (
      typeof initializedTeam.remainingTransferBudgetEUR === "number" &&
      typeof offer.transferFee === "number"
    ) {
      initializedTeam.remainingTransferBudgetEUR = Math.max(
        0,
        initializedTeam.remainingTransferBudgetEUR - offer.transferFee,
      );
    }
    if (
      typeof initializedTeam.remainingWageBudgetWeeklyEUR === "number" &&
      typeof offer.wage === "number"
    ) {
      initializedTeam.remainingWageBudgetWeeklyEUR = Math.max(
        0,
        initializedTeam.remainingWageBudgetWeeklyEUR - offer.wage,
      );
    }

    let updatedPlayer: Player = {
      ...player,
      team: initializedTeam,
      wage: offer.wage,
      contractLength: offer.contractLength,
      squadStatus: offer.expectedSquadStatus,
      teamChemistry: rand(30, 50),
      clubApproval: rand(50, 70),
      yearsAtClub: 0,
      parentClub: null,
      loanDuration: 0,
      // Starter promise if promised as Key Player
      promisedSquadStatus:
        offer.expectedSquadStatus === "Key Player" ? "Key Player" : undefined,
      roleGuaranteeSeasons:
        offer.expectedSquadStatus === "Key Player" ? 1 : undefined,
      roleGuaranteeMatches:
        offer.expectedSquadStatus === "Key Player" ? 20 : undefined,
    };

    const followerChange = Math.round(
      (offer.team.reputation - player.team.reputation) *
        1000 *
        randFloat(0.8, 1.2),
    );

    // Detectar se é conversão de empréstimo para permanente
    const isLoanConversion = player.parentClub !== null && 
                           player.team.id === offer.team.id;

    // Detectar transferência para rival
    const isRivalTransfer = RIVALRIES.some(
      (rivalry) =>
        (rivalry.team1 === player.team.name &&
          rivalry.team2 === offer.team.name) ||
        (rivalry.team2 === player.team.name &&
          rivalry.team1 === offer.team.name),
    );

    let event: CareerEvent;

    if (isLoanConversion) {
      // Conversão de empréstimo para permanente
      event = {
        type: "transfer",
        description: `events.transfer.loanConversion`,
        descriptionParams: {
          team: offer.team.name,
          fee: (offer.transferFee / 1000000).toFixed(1),
        },
      };
    } else if (isRivalTransfer) {
      event = {
        type: "rival_transfer",
        description: `events.transfer.rivalMove`,
        metadata: {
          fromTeam: player.team.name,
          toTeam: offer.team.name,
          fee: offer.transferFee,
        },
      };
    } else {
      event = {
        type: "transfer",
        description: `events.transfer.transferred`,
        descriptionParams: {
          team: offer.team.name,
          fee: (offer.transferFee / 1000000).toFixed(1),
        },
      };
    }

    return { updatedPlayer, event, followerChange };
  }
};

export const processContractRenewal = (
  player: Player,
  isPromotion: boolean = false,
): { updatedPlayer: Player; event: CareerEvent } => {
  const newContractLength = isPromotion
    ? rand(3, 5)
    : rand(player.age > 31 ? 1 : 2, 4);
  const loyaltyBonus = Math.min(player.yearsAtClub / 2, 1.15);
  const ageFactor = player.age > 32 ? 0.85 : 1.0;

  const currentWage = player.wage;
  const expectedWage = computeWeeklyWage(
    player.team,
    player.squadStatus,
    player.stats.overall,
  );

  let newWage = Math.round(
    expectedWage * loyaltyBonus * ageFactor * randFloat(0.95, 1.05),
  );

  // Impor teto salarial do clube e orçamento restante semanal
  const clubProfile = getClubProfile(player.team);
  const wageCap = clubProfile.wageCap;
  if (newWage > wageCap) newWage = wageCap;

  // Se o clube tem orçamento semanal persistido, respeitar o restante
  if (typeof player.team.remainingWageBudgetWeeklyEUR === "number") {
    const remaining = player.team.remainingWageBudgetWeeklyEUR + currentWage; // liberar o contrato antigo antes de renovar
    if (newWage > remaining) {
      // Ajusta para o máximo possível dentro do orçamento
      newWage = Math.max(currentWage, Math.floor(remaining));
    }
  }
  newWage = Math.max(newWage, currentWage * (isPromotion ? 1.2 : 1.02)); // Ensure at least a small raise

  const updatedTeam: Team = { ...player.team };
  if (typeof updatedTeam.remainingWageBudgetWeeklyEUR === "number") {
    // Atualiza o compromisso semanal: remove antigo salário e aloca o novo
    updatedTeam.remainingWageBudgetWeeklyEUR = Math.max(
      0,
      updatedTeam.remainingWageBudgetWeeklyEUR + currentWage - newWage,
    );
  }

  const updatedPlayer = {
    ...player,
    team: updatedTeam,
    contractLength: newContractLength,
    wage: newWage,
  };

  const event: CareerEvent = {
    type: "milestone",
    description: isPromotion
      ? `events.contract.newProfessional`
      : `events.contract.extension`,
    descriptionParams: { years: newContractLength },
  };

  return { updatedPlayer, event };
};
