export type Confederation = "UEFA" | "CONMEBOL" | "AFC" | "CAF" | "CONCACAF";

export interface ContinentalAccess {
  region: Confederation;
  leagueSlots?: {
    // UEFA
    championsLeague?: number;
    europaLeague?: number;
    conferenceLeague?: number;
    // CONMEBOL
    libertadores?: number;
    sudamericana?: number;
    // AFC
    afcChampionsLeague?: number;
    afcCup?: number;
    // CAF
    cafChampionsLeague?: number;
    cafConfed?: number;
    // CONCACAF
    concacafChampionsCup?: number;
  };
  // UEFA: destino reservado ao campeão da copa nacional
  cupRoute?: "European Club Cup" | "European Access Cup";
}

export const ACCESS: Record<string, ContinentalAccess> = {
  // UEFA Big 5
  England: {
    region: "UEFA",
    leagueSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  Spain: {
    region: "UEFA",
    leagueSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  Germany: {
    region: "UEFA",
    leagueSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  Italy: {
    region: "UEFA",
    leagueSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  France: {
    region: "UEFA",
    leagueSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  // UEFA mid
  Netherlands: {
    region: "UEFA",
    leagueSlots: { championsLeague: 2, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  Portugal: {
    region: "UEFA",
    leagueSlots: { championsLeague: 2, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  Turkey: {
    region: "UEFA",
    leagueSlots: { championsLeague: 2, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Club Cup",
  },
  // UEFA generic fallback
  Scotland: {
    region: "UEFA",
    leagueSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Access Cup",
  },
  Belgium: {
    region: "UEFA",
    leagueSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Access Cup",
  },
  Austria: {
    region: "UEFA",
    leagueSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Access Cup",
  },
  Switzerland: {
    region: "UEFA",
    leagueSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
    cupRoute: "European Access Cup",
  },

  // CONMEBOL (aproximado e estável)
  Brazil: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 6, sudamericana: 6 },
  },
  Argentina: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 6, sudamericana: 6 },
  },
  Uruguay: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Chile: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Colombia: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Paraguay: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Ecuador: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Peru: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Bolivia: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },
  Venezuela: {
    region: "CONMEBOL",
    leagueSlots: { libertadores: 4, sudamericana: 4 },
  },

  // AFC
  Japan: { region: "AFC", leagueSlots: { afcChampionsLeague: 3, afcCup: 2 } },
  "South Korea": {
    region: "AFC",
    leagueSlots: { afcChampionsLeague: 3, afcCup: 2 },
  },
  "Saudi Arabia": {
    region: "AFC",
    leagueSlots: { afcChampionsLeague: 3, afcCup: 2 },
  },
  Australia: {
    region: "AFC",
    leagueSlots: { afcChampionsLeague: 2, afcCup: 1 },
  },
  Qatar: { region: "AFC", leagueSlots: { afcChampionsLeague: 3, afcCup: 2 } },
  "United Arab Emirates": {
    region: "AFC",
    leagueSlots: { afcChampionsLeague: 3, afcCup: 2 },
  },
  China: { region: "AFC", leagueSlots: { afcChampionsLeague: 3, afcCup: 2 } },
  // AFC fallback common
  Iran: { region: "AFC", leagueSlots: { afcChampionsLeague: 2, afcCup: 1 } },
  Thailand: {
    region: "AFC",
    leagueSlots: { afcChampionsLeague: 2, afcCup: 1 },
  },

  // CAF (padrão comum)
  Nigeria: {
    region: "CAF",
    leagueSlots: { cafChampionsLeague: 2, cafConfed: 2 },
  },
  Egypt: {
    region: "CAF",
    leagueSlots: { cafChampionsLeague: 2, cafConfed: 2 },
  },
  Morocco: {
    region: "CAF",
    leagueSlots: { cafChampionsLeague: 2, cafConfed: 2 },
  },
  Tunisia: {
    region: "CAF",
    leagueSlots: { cafChampionsLeague: 2, cafConfed: 2 },
  },
  Algeria: {
    region: "CAF",
    leagueSlots: { cafChampionsLeague: 2, cafConfed: 2 },
  },

  // CONCACAF (aproximado)
  USA: { region: "CONCACAF", leagueSlots: { concacafChampionsCup: 3 } },
  Mexico: { region: "CONCACAF", leagueSlots: { concacafChampionsCup: 3 } },
  Canada: { region: "CONCACAF", leagueSlots: { concacafChampionsCup: 3 } },
};

export const rankOfCompetition = (name?: string): number => {
  if (!name) return -1;
  const order = [
    "European Champions Cup",
    "South American Champions Cup",
    "Asian Champions Cup",
    "African Champions Cup",
    "North American Champions Cup",
    "European Club Cup",
    "Asian Club Cup",
    "African Club Cup",
    "European Access Cup",
    "South American Club Cup",
  ];
  const idx = order.indexOf(name);
  return idx === -1 ? 0 : order.length - idx; // maior rank => mais forte
};

export function computeCountryContinental(
  country: string,
  position: number,
  cupWinner: boolean = false,
): string | undefined {
  const acc = ACCESS[country];
  if (!acc) return undefined;
  const slots = acc.leagueSlots || {};

  switch (acc.region) {
    case "UEFA": {
      const cl = slots.championsLeague || 0;
      const el = slots.europaLeague || 0;
      const ecl = slots.conferenceLeague || 0;
      let leagueAssign: string | undefined;
      if (position >= 1 && position <= cl) leagueAssign = "European Champions Cup";
      else if (position <= cl + el) leagueAssign = "European Club Cup";
      else if (position <= cl + el + ecl) leagueAssign = "European Access Cup";

      // Aplicar rota da Copa
      if (cupWinner && acc.cupRoute) {
        const pick = acc.cupRoute;
        // MantÃ©m o mais forte entre liga e copa
        if (
          !leagueAssign ||
          rankOfCompetition(pick) > rankOfCompetition(leagueAssign)
        ) {
          return pick;
        }
      }
      return leagueAssign;
    }
    case "CONMEBOL": {
      const lib = slots.libertadores || 0;
      const sud = slots.sudamericana || 0;
      if (position >= 1 && position <= lib) return "South American Champions Cup";
      if (position <= lib + sud) return "South American Club Cup";
      return undefined;
    }
    case "AFC": {
      const acl = slots.afcChampionsLeague || 0;
      const ac = slots.afcCup || 0;
      if (position >= 1 && position <= acl) return "Asian Champions Cup";
      if (position <= acl + ac) return "Asian Club Cup";
      return undefined;
    }
    case "CAF": {
      const ccl = slots.cafChampionsLeague || 0;
      const ccf = slots.cafConfed || 0;
      if (position >= 1 && position <= ccl) return "African Champions Cup";
      if (position <= ccl + ccf) return "African Club Cup";
      return undefined;
    }
    case "CONCACAF": {
      const ccc = slots.concacafChampionsCup || 0;
      if (position >= 1 && position <= ccc) return "North American Champions Cup";
      return undefined;
    }
    default:
      return undefined;
  }
}
