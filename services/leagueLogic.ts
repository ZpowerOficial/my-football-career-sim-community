import { Team } from "../types";
import { rand, gaussianRandom, randFloat, clamp } from "./utils";

/**
 * ============================================================================
 * SISTEMA DE LÓGICA DE LIGAS E PROMOÇÃO/REBAIXAMENTO (V3.0)
 * ============================================================================
 *
 * MELHORIAS V3.0:
 * 1. REGRAS POR PAÍS: Cada país tem suas próprias regras de promoção/rebaixamento
 * 2. FIX: Correção do bug de rebaixamento incorreto
 * 3. PLAYOFFS: Suporte a playoffs de rebaixamento e promoção por país
 *
 * ============================================================================
 */

// ==================== CONFIGURAÇÕES POR PAÍS ====================

interface LeagueRules {
  tiers: {
    [tier: number]: {
      teamCount: number;
      promoted: number;
      promotionPlayoff: number; // Times que disputam playoff de promoção
      relegated: number;
      relegationPlayoff: number; // Times que disputam playoff de rebaixamento
      matchesPerSeason: number;
    };
  };
}

const COUNTRY_LEAGUE_RULES: Record<string, LeagueRules> = {
  England: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 24,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 46,
      },
      3: {
        teamCount: 24,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 46,
      },
      4: {
        teamCount: 24,
        promoted: 3,
        promotionPlayoff: 4,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 46,
      },
      5: {
        teamCount: 24,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 46,
      },
    },
  },
  Spain: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 22,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 42,
      },
      3: {
        teamCount: 20,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  Germany: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      3: {
        teamCount: 20,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  Italy: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 20,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      3: {
        teamCount: 20,
        promoted: 2,
        promotionPlayoff: 4,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  France: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      3: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Portugal: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Netherlands: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 20,
        promoted: 1,
        promotionPlayoff: 8,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  Brazil: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 20,
        promoted: 4,
        promotionPlayoff: 0,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      3: {
        teamCount: 20,
        promoted: 4,
        promotionPlayoff: 0,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      4: {
        teamCount: 64,
        promoted: 4,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  Argentina: {
    // Liga Profesional Argentina - Formato 2024+
    // 28 times em 2 grupos (Zona A e B) de 14 times cada
    // Cada time joga contra os 14 do outro grupo (turno único) = 14 jogos
    // 16 classificam para playoffs (8 de cada grupo) + até 4 jogos de mata-mata
    // Total máximo: 14 + 4 = 18 jogos (campeão)
    tiers: {
      1: {
        teamCount: 28,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 18, // 14 fase de grupos + até 4 playoffs
      },
      2: {
        teamCount: 38,
        promoted: 2,
        promotionPlayoff: 2,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 37,
      },
    },
  },
  Mexico: {
    tiers: {
      // Liga MX não tem rebaixamento tradicional (sistema de porcentagem foi abolido)
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 1,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  USA: {
    tiers: {
      // MLS não tem rebaixamento
      1: {
        teamCount: 29,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Japan: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 22,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 42,
      },
      3: {
        teamCount: 20,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  "South Korea": {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 33,
      },
      2: {
        teamCount: 13,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 36,
      },
    },
  },
  China: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  "Saudi Arabia": {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 3,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Turkey: {
    tiers: {
      1: {
        teamCount: 19,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 36,
      },
      2: {
        teamCount: 20,
        promoted: 3,
        promotionPlayoff: 4,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  Russia: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Belgium: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 12,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 28,
      },
    },
  },
  Scotland: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 10,
        promoted: 1,
        promotionPlayoff: 2,
        relegated: 1,
        relegationPlayoff: 0,
        matchesPerSeason: 36,
      },
    },
  },
  Austria: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 32,
      },
      2: {
        teamCount: 16,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Switzerland: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 36,
      },
      2: {
        teamCount: 10,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 36,
      },
    },
  },
  Ukraine: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Greece: {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 36,
      },
      2: {
        teamCount: 14,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
    },
  },
  Denmark: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 32,
      },
      2: {
        teamCount: 12,
        promoted: 1,
        promotionPlayoff: 2,
        relegated: 1,
        relegationPlayoff: 0,
        matchesPerSeason: 32,
      },
    },
  },
  Norway: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Sweden: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Poland: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 2,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  "Czech Republic": {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Croatia: {
    tiers: {
      1: {
        teamCount: 10,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 36,
      },
      2: {
        teamCount: 12,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  Serbia: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 2,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 2,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Colombia: {
    tiers: {
      // Sistema de promedios (média de pontos)
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Chile: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Peru: {
    tiers: {
      1: {
        teamCount: 19,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 36,
      },
      2: {
        teamCount: 14,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
    },
  },
  Ecuador: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 12,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  Uruguay: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Paraguay: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
      2: {
        teamCount: 12,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  Venezuela: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Bolivia: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Australia: {
    tiers: {
      // A-League não tem rebaixamento
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
    },
  },
  Egypt: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 3,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Morocco: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Nigeria: {
    tiers: {
      1: {
        teamCount: 20,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 4,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
      2: {
        teamCount: 20,
        promoted: 4,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 38,
      },
    },
  },
  "South Africa": {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Algeria: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Tunisia: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 16,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
    },
  },
  Cameroon: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 3,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  "Ivory Coast": {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
      2: {
        teamCount: 14,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
    },
  },
  Senegal: {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
      2: {
        teamCount: 14,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
    },
  },
  Ghana: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 3,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Iran: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Qatar: {
    tiers: {
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
      2: {
        teamCount: 12,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  UAE: {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 0,
        matchesPerSeason: 26,
      },
      2: {
        teamCount: 12,
        promoted: 2,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  Thailand: {
    tiers: {
      1: {
        teamCount: 16,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 2,
        relegationPlayoff: 1,
        matchesPerSeason: 30,
      },
      2: {
        teamCount: 18,
        promoted: 2,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Indonesia: {
    tiers: {
      1: {
        teamCount: 18,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 3,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
      2: {
        teamCount: 18,
        promoted: 3,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 34,
      },
    },
  },
  Malaysia: {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 26,
      },
      2: {
        teamCount: 12,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  Vietnam: {
    tiers: {
      1: {
        teamCount: 14,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 1,
        relegationPlayoff: 1,
        matchesPerSeason: 26,
      },
      2: {
        teamCount: 12,
        promoted: 1,
        promotionPlayoff: 1,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
  India: {
    tiers: {
      // ISL não tem rebaixamento ainda
      1: {
        teamCount: 12,
        promoted: 0,
        promotionPlayoff: 0,
        relegated: 0,
        relegationPlayoff: 0,
        matchesPerSeason: 22,
      },
    },
  },
};

// Regras padrão para países não listados
const DEFAULT_LEAGUE_RULES: LeagueRules = {
  tiers: {
    1: {
      teamCount: 18,
      promoted: 0,
      promotionPlayoff: 0,
      relegated: 3,
      relegationPlayoff: 0,
      matchesPerSeason: 34,
    },
    2: {
      teamCount: 18,
      promoted: 2,
      promotionPlayoff: 2,
      relegated: 3,
      relegationPlayoff: 0,
      matchesPerSeason: 34,
    },
    3: {
      teamCount: 20,
      promoted: 2,
      promotionPlayoff: 2,
      relegated: 3,
      relegationPlayoff: 0,
      matchesPerSeason: 38,
    },
    4: {
      teamCount: 20,
      promoted: 2,
      promotionPlayoff: 0,
      relegated: 4,
      relegationPlayoff: 0,
      matchesPerSeason: 38,
    },
    5: {
      teamCount: 20,
      promoted: 2,
      promotionPlayoff: 0,
      relegated: 0,
      relegationPlayoff: 0,
      matchesPerSeason: 38,
    },
  },
};

// ==================== FUNÇÕES AUXILIARES ====================

const getLeagueRules = (country: string, tier: number) => {
  const countryRules = COUNTRY_LEAGUE_RULES[country] || DEFAULT_LEAGUE_RULES;
  return (
    countryRules.tiers[tier] ||
    DEFAULT_LEAGUE_RULES.tiers[tier] ||
    DEFAULT_LEAGUE_RULES.tiers[1]
  );
};

const getOrGenerateSquadStrength = (
  team: Team,
): { attack: number; midfield: number; defense: number } => {
  if (team.squadStrength) {
    return team.squadStrength;
  }

  const base = team.reputation;
  const profileRoll = Math.random();

  if (profileRoll < 0.33) {
    return {
      attack: clamp(base + rand(2, 8), 50, 99),
      midfield: clamp(base + rand(-2, 4), 50, 99),
      defense: clamp(base + rand(-8, -2), 50, 99),
    };
  } else if (profileRoll < 0.66) {
    return {
      attack: clamp(base + rand(-8, -2), 50, 99),
      midfield: clamp(base + rand(-2, 4), 50, 99),
      defense: clamp(base + rand(2, 8), 50, 99),
    };
  } else {
    return {
      attack: clamp(base + rand(-3, 3), 50, 99),
      midfield: clamp(base + rand(-3, 3), 50, 99),
      defense: clamp(base + rand(-3, 3), 50, 99),
    };
  }
};

const updateSquadStrength = (squadStrength: {
  attack: number;
  midfield: number;
  defense: number;
}): { attack: number; midfield: number; defense: number } => {
  let { attack, midfield, defense } = squadStrength;
  const changeFactor = 0.05;
  attack *= 1 + randFloat(-changeFactor, changeFactor);
  midfield *= 1 + randFloat(-changeFactor, changeFactor);
  defense *= 1 + randFloat(-changeFactor, changeFactor);
  return {
    attack: clamp(attack, 40, 99),
    midfield: clamp(midfield, 40, 99),
    defense: clamp(defense, 40, 99),
  };
};

// ==================== SISTEMA DE PERFORMANCE DE TEMPORADA ====================

const calculateSeasonPerformance = (team: Team): number => {
  const squadStrength = getOrGenerateSquadStrength(team);
  const strengthScore =
    squadStrength.attack * 0.35 +
    squadStrength.midfield * 0.35 +
    squadStrength.defense * 0.3;
  const strengthFactor = strengthScore * 0.45;
  const seasonForm = gaussianRandom(50, 20) * 0.3;
  const momentum = gaussianRandom(50, 25) * 0.15;

  let experienceBonus = 0;
  if (team.reputation >= 85) experienceBonus = gaussianRandom(8, 2);
  else if (team.reputation >= 80) experienceBonus = gaussianRandom(5, 1.5);
  const experienceScore = experienceBonus * 0.1;

  const totalScore = strengthFactor + seasonForm + momentum + experienceScore;

  // Zebras (upsets)
  if (Math.random() < 0.02 && team.reputation >= 80)
    return totalScore * gaussianRandom(0.6, 0.15);
  if (Math.random() < 0.03 && team.reputation <= 70)
    return totalScore * gaussianRandom(1.4, 0.2);

  return totalScore;
};

// ==================== LÓGICA DE PLAYOFFS ====================

const simulatePlayoffMatch = (
  team1: Team,
  team2: Team,
): { winner: Team; loser: Team } => {
  const perf1 =
    calculateSeasonPerformance(team1) +
    (Math.random() < 0.5 ? calculateSeasonPerformance(team1) * 0.1 : 0) +
    gaussianRandom(0, 15);
  const perf2 =
    calculateSeasonPerformance(team2) +
    (Math.random() < 0.5 ? calculateSeasonPerformance(team2) * 0.1 : 0) +
    gaussianRandom(0, 15);
  return perf1 > perf2
    ? { winner: team1, loser: team2 }
    : { winner: team2, loser: team1 };
};

const simulatePromotionPlayoffs = (
  teams: Team[],
  startPosition: number,
  playoffSlots: number,
  promotionSlots: number,
): Team[] => {
  const playoffTeams = teams.slice(startPosition, startPosition + playoffSlots);
  if (playoffTeams.length < 2) return [];

  if (playoffTeams.length === 2) {
    const result = simulatePlayoffMatch(playoffTeams[0], playoffTeams[1]);
    return [result.winner];
  }

  if (playoffTeams.length >= 4) {
    // Semi-finais
    const semifinal1 = simulatePlayoffMatch(playoffTeams[0], playoffTeams[3]);
    const semifinal2 = simulatePlayoffMatch(playoffTeams[1], playoffTeams[2]);
    // Final
    const finalMatch = simulatePlayoffMatch(
      semifinal1.winner,
      semifinal2.winner,
    );

    const winners = [finalMatch.winner];
    if (promotionSlots >= 2) winners.push(finalMatch.loser);
    return winners;
  }

  return [playoffTeams[0]];
};

const simulateRelegationPlayoffs = (
  lastPlaceFromUpperTier: Team,
  playoffTeamFromLowerTier: Team,
): { relegated: Team; promoted: Team } => {
  const result = simulatePlayoffMatch(
    lastPlaceFromUpperTier,
    playoffTeamFromLowerTier,
  );
  // Se o time da divisão superior ganhar, ele permanece; se perder, é rebaixado
  if (result.winner.name === lastPlaceFromUpperTier.name) {
    return {
      relegated: playoffTeamFromLowerTier,
      promoted: lastPlaceFromUpperTier,
    };
  } else {
    return {
      relegated: lastPlaceFromUpperTier,
      promoted: playoffTeamFromLowerTier,
    };
  }
};

// ==================== LÓGICA DE PROMOÇÃO/REBAIXAMENTO (BLINDADA) ====================

const determinePromotionAndRelegation = (
  teamsInDivision: Team[],
  tier: number,
  country: string,
  preSimulatedTable?: Team[],
  // ADICIONADO: Fallback de posição segura
  playerSafeCheck?: { teamName: string; position: number },
): {
  promoted: Team[];
  relegated: Team[];
  playoffWinners: Team[];
  relegationPlayoffTeams: Team[];
} => {
  if (teamsInDivision.length < 3) {
    return {
      promoted: [],
      relegated: [],
      playoffWinners: [],
      relegationPlayoffTeams: [],
    };
  }

  const rules = getLeagueRules(country, tier);

  // 1. DEFINIR A ORDEM FINAL
  let finalSortedTeams: Team[];

  if (preSimulatedTable && preSimulatedTable.length > 0) {
    // PRIORIDADE 1: Usar a tabela real que o jogador jogou
    finalSortedTeams = preSimulatedTable.map(
      (simTeam) =>
        teamsInDivision.find((t) => t.name === simTeam.name) || simTeam,
    );
  } else {
    // PRIORIDADE 2: Simular via RNG (fallback)
    const teamsWithPerformance = teamsInDivision.map((team) => ({
      team,
      performance: calculateSeasonPerformance(team),
    }));
    finalSortedTeams = teamsWithPerformance
      .sort((a, b) => b.performance - a.performance)
      .map((t) => t.team);
  }

  // 2. CALCULAR ZONAS
  const directPromotionSlots = rules.promoted;
  const promoted = finalSortedTeams.slice(0, directPromotionSlots);

  let playoffWinners: Team[] = [];
  if (
    rules.promotionPlayoff > 0 &&
    finalSortedTeams.length >= directPromotionSlots + rules.promotionPlayoff
  ) {
    if (preSimulatedTable) {
      playoffWinners = finalSortedTeams.slice(
        directPromotionSlots,
        directPromotionSlots + 1,
      );
    } else {
      playoffWinners = simulatePromotionPlayoffs(
        finalSortedTeams,
        directPromotionSlots,
        rules.promotionPlayoff,
        1,
      );
    }
  }

  const totalTeams = finalSortedTeams.length;
  const directRelegationSlots = rules.relegated;
  const relegationPlayoffSlots = rules.relegationPlayoff;

  // 3. IDENTIFICAR REBAIXADOS (COM SAFEGUARD)
  let relegated: Team[] = [];
  if (directRelegationSlots > 0) {
    const candidates = finalSortedTeams.slice(
      totalTeams - directRelegationSlots,
    );

    // SAFEGUARD: Se o jogador caiu no RNG mas estava salvo na simulação real
    if (!preSimulatedTable && playerSafeCheck) {
      const safeThreshold =
        totalTeams - directRelegationSlots - relegationPlayoffSlots;
      // Se a posição real do jogador foi melhor que a zona de perigo (Ex: 14 <= 17)
      if (playerSafeCheck.position <= safeThreshold) {
        // Remove o jogador da lista de rebaixados se ele estiver lá por azar do RNG
        relegated = candidates.filter(
          (t) => t.name !== playerSafeCheck!.teamName,
        );
        if (relegated.length < candidates.length) {
          console.warn(
            `[LeagueLogic] SAFEGUARD ATIVADO: Salvando ${playerSafeCheck.teamName} do rebaixamento injusto (Posição Real: ${playerSafeCheck.position})`,
          );
        }
      } else {
        relegated = candidates;
      }
    } else {
      relegated = candidates;
    }
  }

  let relegationPlayoffTeams: Team[] = [];
  if (relegationPlayoffSlots > 0) {
    const startIndex =
      totalTeams - directRelegationSlots - relegationPlayoffSlots;
    const candidates = finalSortedTeams.slice(
      startIndex,
      startIndex + relegationPlayoffSlots,
    );

    if (
      !preSimulatedTable &&
      playerSafeCheck &&
      playerSafeCheck.position <= startIndex
    ) {
      relegationPlayoffTeams = candidates.filter(
        (t) => t.name !== playerSafeCheck!.teamName,
      );
    } else {
      relegationPlayoffTeams = candidates;
    }
  }

  return { promoted, relegated, playoffWinners, relegationPlayoffTeams };
};

// ==================== EXPORTAÇÃO PRINCIPAL ====================

// Atualizei a tipagem para aceitar TANTO o novo formato QUANTO o antigo (para compatibilidade)
type LeagueUpdateContext =
  | { country: string; tier: number; finalTable: Team[] }
  | { team: Team; position: number }; // Suporte legado

export const simulateLeagueTierChanges = (
  currentTeams: Team[],
  context?: LeagueUpdateContext,
): Team[] => {
  // Safe-guard: Filter out any null/undefined teams immediately
  const validTeams = currentTeams.filter((t) => t && typeof t === "object");

  const originalTierById = new Map<string, number>();
  validTeams.forEach((t, idx) => {
    if (!t || typeof t !== "object") {
      // eslint-disable-next-line no-console
      console.warn(`[simulateLeagueTierChanges] skipping invalid team at index ${idx}`);
      return;
    }
    const key = t.id ?? t.name ?? `unknown-${idx}`;
    if (!key) {
      // eslint-disable-next-line no-console
      console.warn(`[simulateLeagueTierChanges] team missing id/name at index ${idx}`);
      return;
    }
    originalTierById.set(String(key), t.leagueTier ?? 0);
  });

  const teamsByCountryAndTier: {
    [country: string]: { [tier: number]: Team[] };
  } = {};

  validTeams.forEach((team) => {
    if (!team.isYouth) {
      if (!teamsByCountryAndTier[team.country])
        teamsByCountryAndTier[team.country] = {};
      if (!teamsByCountryAndTier[team.country][team.leagueTier])
        teamsByCountryAndTier[team.country][team.leagueTier] = [];
      teamsByCountryAndTier[team.country][team.leagueTier].push(team);
    }
  });

  // We only modify the valid teams. This implicitly removes nulls from the result.
  const updatedTeams = [...validTeams];

  Object.keys(teamsByCountryAndTier).forEach((country) => {
    const countryTiers = teamsByCountryAndTier[country];
    const tiers = Object.keys(countryTiers)
      .map((t) => parseInt(t, 10))
      .sort((a, b) => a - b);

    tiers.forEach((tier) => {
      const divisionTeams = countryTiers[tier];
      if (divisionTeams.length < 6) return;

      // Preparar dados
      let preSimulatedTable: Team[] | undefined = undefined;
      let playerSafeCheck: { teamName: string; position: number } | undefined =
        undefined;

      // Detectar qual tipo de contexto foi passado
      if (context) {
        if ("finalTable" in context) {
          // Contexto NOVO (Correto)
          if (context.country === country && context.tier === tier) {
            preSimulatedTable = context.finalTable;
          }
        } else if ("team" in context) {
          // Contexto ANTIGO (Legado) - Ativa o Safeguard
          if (
            context.team.country === country &&
            context.team.leagueTier === tier
          ) {
            playerSafeCheck = {
              teamName: context.team.name,
              position: context.position,
            };
          }
        }
      }

      const { promoted, relegated, playoffWinners, relegationPlayoffTeams } =
        determinePromotionAndRelegation(
          divisionTeams,
          tier,
          country,
          preSimulatedTable,
          playerSafeCheck,
        );

      // Aplicação das mudanças
      [...promoted, ...playoffWinners].forEach((team) => {
        const idx = updatedTeams.findIndex((t) => t.name === team.name);
        if (idx !== -1 && updatedTeams[idx].leagueTier > 1)
          updatedTeams[idx].leagueTier--;
      });

      relegated.forEach((team) => {
        const idx = updatedTeams.findIndex((t) => t.name === team.name);
        if (idx !== -1 && updatedTeams[idx].leagueTier < 5)
          updatedTeams[idx].leagueTier++;
      });

      relegationPlayoffTeams.forEach((team) => {
        const idx = updatedTeams.findIndex((t) => t.name === team.name);
        if (idx !== -1 && Math.random() < 0.4)
          updatedTeams[idx].leagueTier = Math.min(
            updatedTeams[idx].leagueTier + 1,
            5,
          );
      });
    });
  });

  // Ajustes econômicos pós-temporada
  const economicallyAdjusted = updatedTeams.map((team) => {
    if (!team) return team; // Skip null teams
    const oldTier = originalTierById.get(team.id || team.name);
    const newTier = team.leagueTier;

    let squadStrength = updateSquadStrength(getOrGenerateSquadStrength(team));

    // Bônus/penalidade por mudança de divisão
    if (oldTier && newTier < oldTier) {
      squadStrength = {
        attack: squadStrength.attack * 1.04,
        midfield: squadStrength.midfield * 1.04,
        defense: squadStrength.defense * 1.04,
      };
    } else if (oldTier && newTier > oldTier) {
      squadStrength = {
        attack: squadStrength.attack * 0.96,
        midfield: squadStrength.midfield * 0.96,
        defense: squadStrength.defense * 0.96,
      };
    }

    const newStrength = {
      attack: clamp(squadStrength.attack, 40, 99),
      midfield: clamp(squadStrength.midfield, 40, 99),
      defense: clamp(squadStrength.defense, 40, 99),
    };

    // Cálculo de orçamentos
    const oldTransferBudget = team.transferBudgetEUR || 0;
    const oldRemainingTransfer = team.remainingTransferBudgetEUR || 0;
    const baseIncome =
      150_000_000 *
      Math.pow(0.4, newTier - 1) *
      (0.6 + (team.reputation / 100) * 0.6) *
      randFloat(0.9, 1.1);
    const simulatedSpending =
      oldTransferBudget *
      ((clamp(team.reputation - 20, 30, 95) / 100) * randFloat(0.5, 1.1));
    let newTotalTransferBudget =
      (oldRemainingTransfer - simulatedSpending + baseIncome) *
      randFloat(0.7, 0.9);

    if (oldTier && newTier < oldTier)
      newTotalTransferBudget *= randFloat(1.2, 1.5);
    else if (oldTier && newTier > oldTier)
      newTotalTransferBudget *= randFloat(0.5, 0.7);

    const maxBudget = 300_000_000 * Math.pow(0.5, newTier - 1);
    newTotalTransferBudget = clamp(
      newTotalTransferBudget,
      1_000_000,
      maxBudget,
    );

    let newTotalWageBudget =
      team.wageBudgetWeeklyEUR ||
      computeWageBudgetWeeklyEUR(newTier, team.reputation);
    if (oldTier && newTier < oldTier)
      newTotalWageBudget *= randFloat(1.1, 1.25);
    else if (oldTier && newTier > oldTier)
      newTotalWageBudget *= randFloat(0.7, 0.85);
    newTotalWageBudget = clamp(newTotalWageBudget, 20000, 4000000);

    return {
      ...team,
      squadStrength: newStrength,
      wageBudgetWeeklyEUR: Math.round(newTotalWageBudget),
      remainingWageBudgetWeeklyEUR: Math.round(newTotalWageBudget),
      transferBudgetEUR: Math.round(newTotalTransferBudget),
      remainingTransferBudgetEUR: Math.round(
        newTotalTransferBudget * randFloat(0.7, 1.0),
      ),
    } as Team;
  });

  return economicallyAdjusted;
};

export const simulateLeagueSeason = (
  teams: Team[],
  country?: string,
  tier?: number,
): Map<string, number> => {
  const rules = getLeagueRules(country || "", tier || 1);
  const matchesPerSeason = rules.matchesPerSeason;

  const points = new Map<string, number>();
  teams.forEach((team) => {
    let totalPoints = 0;
    for (let i = 0; i < matchesPerSeason; i++) {
      const performance = calculateSeasonPerformance(team);
      const winProb = clamp(performance / 120, 0.1, 0.9);
      const drawProb = 0.25;
      const randVal = Math.random();
      if (randVal < winProb) totalPoints += 3;
      else if (randVal < winProb + drawProb) totalPoints += 1;
    }
    points.set(team.name, totalPoints);
  });
  return points;
};

export const calculateLeagueTable = (teams: Team[]): Team[] => {
  const teamsWithPerformance = teams.map((team) => ({
    team,
    performance: calculateSeasonPerformance(team),
  }));
  return teamsWithPerformance
    .sort((a, b) => b.performance - a.performance)
    .map((t) => t.team);
};

export const checkTeamSeasonResult = (
  team: Team,
  oldTier: number,
  newTier: number,
): "promoted" | "relegated" | "stayed" | "playoff" => {
  if (newTier < oldTier) return "promoted";
  if (newTier > oldTier) return "relegated";
  return "stayed";
};

// ==================== FUNÇÕES AUXILIARES DE ORÇAMENTO ====================

const TIER_WAGE_FACTOR: Record<number, number> = {
  1: 1.0,
  2: 0.65,
  3: 0.45,
  4: 0.3,
  5: 0.2,
};

const computeWageBudgetWeeklyEUR = (
  tier: number,
  reputation: number,
): number => {
  const repScale = clamp(reputation / 90, 0.4, 1.2);
  const baseTierFactor = TIER_WAGE_FACTOR[tier] || 0.2;
  const baseWeekly = 2_500_000;
  const budget = baseWeekly * repScale * baseTierFactor;
  return clamp(Math.round(budget), 150_000, 3_500_000);
};

// ==================== EXPORTS ADICIONAIS ====================

export { getLeagueRules, COUNTRY_LEAGUE_RULES, DEFAULT_LEAGUE_RULES };
