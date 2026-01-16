
import { PositionDetail, PlayerStyle } from '../../types';
import { clamp } from '../utils';

export class BalancedGameConstants {
  // LIMITES DUROS POR POSI�?�fO (por partida) �?" evita outliers irreais
  static MAX_GOALS_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 4,   'CF': 4,   'LW': 3,   'RW': 3,
    'CAM': 3,  'LM': 2,   'RM': 2,   'CM': 2,
    'CDM': 1,  'LWB': 1,  'RWB': 1,  'LB': 1,
    'RB': 1,   'CB': 1,   'GK': 1
  };

  static MAX_ASSISTS_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 3,   'CF': 3,   'LW': 3,   'RW': 3,
    'CAM': 4,  'LM': 3,   'RM': 3,   'CM': 3,
    'CDM': 2,  'LWB': 2,  'RWB': 2,  'LB': 2,
    'RB': 2,   'CB': 1,   'GK': 1
  };

  static MAX_SHOTS_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 10,  'CF': 9,   'LW': 8,   'RW': 8,
    'CAM': 7,  'LM': 6,   'RM': 6,   'CM': 5,
    'CDM': 4,  'LWB': 5,  'RWB': 5,  'LB': 3,
    'RB': 3,   'CB': 2,   'GK': 1
  };

  static MAX_KEY_PASSES_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 4,   'CF': 5,   'LW': 6,   'RW': 6,
    'CAM': 8,  'LM': 6,   'RM': 6,   'CM': 6,
    'CDM': 4,  'LWB': 5,  'RWB': 5,  'LB': 4,
    'RB': 4,   'CB': 2,   'GK': 1
  };
  // TAXAS BASE POR POSI�?�fO (gols por jogo)
  static EXPECTED_GOALS_PER_MATCH: Record<PositionDetail, number> = {
    // Calibrado com dados Messi/Ronaldo: ST ~3.5:1, LW/RW ~2.2:1, CAM ~0.6:1
    'ST': 0.58,   'CF': 0.50,   'LW': 0.42,   'RW': 0.42,
    'CAM': 0.23,  'LM': 0.16,   'RM': 0.16,   'CM': 0.12,
    'CDM': 0.07,  'LWB': 0.09,  'RWB': 0.09,  'LB': 0.05,
    'RB': 0.05,   'CB': 0.03,   'GK': 0.005
  };

  // TAXAS BASE POR POSI�?�fO (assistências por jogo)
  static EXPECTED_ASSISTS_PER_MATCH: Record<PositionDetail, number> = {
    // Calibrado: ST ~0.16 (proporção 3.5:1), LW/RW ~0.19 (proporção 2.2:1), CAM mantém 0.38
    'ST': 0.16,   'CF': 0.20,   'LW': 0.19,   'RW': 0.19,
    'CAM': 0.38,  'LM': 0.22,   'RM': 0.22,   'CM': 0.20,
    'CDM': 0.08,  'LWB': 0.18,  'RWB': 0.18,  'LB': 0.12,
    'RB': 0.12,   'CB': 0.03,   'GK': 0.01
  };

  // SHOTS PER MATCH POR POSIÇÃO - Valores aumentados para atacantes
  static SHOTS_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 4.8, 'CF': 4.2, 'LW': 3.4, 'RW': 3.4, 'CAM': 3.0,
    'LM': 2.2, 'RM': 2.2, 'CM': 1.6, 'CDM': 0.9, 'LWB': 1.3,
    'RWB': 1.3, 'LB': 0.9, 'RB': 0.9, 'CB': 0.6, 'GK': 0.05
  };

  // KEY PASSES PER MATCH POR POSI�?�fO
  static KEY_PASSES_PER_MATCH: Record<PositionDetail, number> = {
    'ST': 0.8, 'CF': 1.5, 'LW': 2.0, 'RW': 2.0, 'CAM': 3.5,
    'LM': 2.5, 'RM': 2.5, 'CM': 2.2, 'CDM': 1.5, 'LWB': 1.8,
    'RWB': 1.8, 'LB': 1.2, 'RB': 1.2, 'CB': 0.8, 'GK': 0.3
  };

  // TEAM REPUTATION MULTIPLIERS
  static TEAM_MULTIPLIERS = {
    goals: [
      { minRep: 90, mult: 1.12 }, { minRep: 85, mult: 1.06 },
      { minRep: 80, mult: 1.02 }, { minRep: 75, mult: 0.99 },
      { minRep: 70, mult: 0.94 }, { minRep: 0, mult: 0.98 } // times fracos quase neutros
    ],
    assists: [
      { minRep: 90, mult: 1.18 }, { minRep: 85, mult: 1.10 },
      { minRep: 80, mult: 1.04 }, { minRep: 75, mult: 1.00 },
      { minRep: 70, mult: 0.95 }, { minRep: 0, mult: 0.88 }
    ]
  };

  // OVERALL FACTOR (curva sigmóide)
  static calculateOverallFactor(overall: number): number {
    // Curva ajustada: mid tiers (75-82) recebem leve aumento sem inflar elite
    const minMultiplier = 0.65;
    const maxMultiplier = 1.40; // teto base
    const steepness = 0.085;
    const midpointOvr = 88;

    const factor = minMultiplier + (maxMultiplier - minMultiplier) /
      (1 + Math.exp(-steepness * (overall - midpointOvr)));
    let finalFactor = clamp(factor, minMultiplier, maxMultiplier);

    // Elite bonus progressivo: jogadores 94+ recebem bônus escalonado
    // 94-95: +3-5% | 96-97: +8-12% | 98-99: +15-20% (permite picos de 70-85 G/A)
    if (overall >= 94) {
      const excess = overall - 94;
      let eliteBonus = 1.0;

      if (overall >= 98) {
        // Lendas absolutas (98-99): bônus de 15-20%
        eliteBonus = 1 + clamp(0.15 + (excess - 4) * 0.025, 0.15, 0.20);
      } else if (overall >= 96) {
        // Elite mundial (96-97): bônus de 8-12%
        eliteBonus = 1 + clamp(0.08 + (excess - 2) * 0.02, 0.08, 0.12);
      } else {
        // Elite top (94-95): bônus de 3-5%
        eliteBonus = 1 + clamp(0.03 + excess * 0.01, 0.03, 0.05);
      }

      finalFactor *= eliteBonus;
    }
    return finalFactor;
  }

  static calculateFinishingFactor(finishing: number): number {
    let base = clamp(finishing / 85, 0.55, 1.10);
    // Pequeno boost para faixa mediana para diferenciar produção em ligas fracas
    if (finishing >= 72 && finishing <= 80) {
      base *= 1.05; // +5%
    }
    return base;
  }

  static calculatePassingFactor(passing: number, vision: number): number {
    const combined = (passing * 0.6 + vision * 0.4);
    return clamp(combined / 85, 0.60, 1.20);
  }

  // Fator de liga para GOLS �?" aumenta produção em ligas fracas e segura elite
  static calculateLeagueTierScoringFactor(leagueTier: number, teamRep: number, position: PositionDetail): number {
    const isAttacker = ['ST','CF','LW','RW','CAM'].includes(position);
    let factor = 1.0;
    if (leagueTier === 1 && teamRep >= 80) {
      factor *= 0.93;
    } else {
      if (isAttacker) {
        if (leagueTier >= 3 || teamRep < 60) factor *= 1.18; // segunda/terceira divisão muito fraca (reduzido)
        else if (leagueTier === 2 || teamRep < 70) factor *= 1.12; // segunda divisão (reduzido)
        else if (teamRep < 75) factor *= 1.08;
      } else {
        if (leagueTier >= 3 || teamRep < 60) factor *= 1.08;
        else if (leagueTier === 2 || teamRep < 70) factor *= 1.05;
      }
    }
    return factor;
  }

  // Fator de liga para ASSIST�SNCIAS �?" menos agressivo
  static calculateLeagueTierAssistFactor(leagueTier: number, teamRep: number, position: PositionDetail): number {
    const creative = ['CAM','LW','RW','CF'];
    let factor = 1.0;
    if (leagueTier === 1 && teamRep >= 80) {
      factor *= 0.95;
    } else {
      if (creative.includes(position)) {
        if (leagueTier >= 3 || teamRep < 60) factor *= 1.18; else if (leagueTier === 2 || teamRep < 70) factor *= 1.12; else if (teamRep < 75) factor *= 1.06;
      } else {
        if (leagueTier >= 3 || teamRep < 60) factor *= 1.10; else if (leagueTier === 2 || teamRep < 70) factor *= 1.06;
      }
    }
    return factor;
  }

  // ==================== MODIFICADORES POR ESTILO DE JOGO ====================
  // Ajusta gols e assistências baseado no PlayerStyle para criar variação realista
  // Ex: Poacher tem mais gols e menos assists, False 9 é mais equilibrado
  static STYLE_MODIFIERS: Record<PlayerStyle, { goals: number; assists: number }> = {
    // Atacantes - variação significativa
    'Poacher': { goals: 1.25, assists: 0.50 },           // Pure finisher (Haaland, Inzaghi)
    'Target Man': { goals: 1.15, assists: 0.70 },        // Aerial threat (Giroud, Dzeko)
    'Speed Demon': { goals: 1.10, assists: 0.80 },       // Counter-attack (Werner, Aubameyang)
    'Inside Forward': { goals: 1.08, assists: 0.95 },    // Cuts inside (Salah, Robben)
    'Complete Forward': { goals: 1.00, assists: 1.00 },  // All-rounder (Benzema, Lewandowski)
    'False 9': { goals: 0.85, assists: 1.35 },           // Deep creator (Messi, Firmino)

    // Meio-campistas - diferença entre criadores e goleadores
    'Advanced Playmaker': { goals: 0.85, assists: 1.30 },     // Pure creator (De Bruyne, Özil)
    'Box-to-Box': { goals: 1.30, assists: 0.90 },             // Goal-scoring mid (Bellingham, Lampard)
    'Mezzala': { goals: 1.10, assists: 1.10 },                // Roaming forward (Barella, Pogba)
    'Deep-Lying Playmaker': { goals: 0.70, assists: 1.15 },   // Orchestrator (Pirlo, Kroos)
    'Ball-Winning Midfielder': { goals: 0.65, assists: 0.75 }, // Defensive anchor (Kanté, Casemiro)
    'Regista': { goals: 0.60, assists: 1.20 },                // Deep passer (Alonso, Busquets)

    // Alas/Wingers
    'Inverted Winger': { goals: 1.20, assists: 0.85 },     // Cuts inside, shoots (Robben, Mahrez)
    'Traditional Winger': { goals: 0.75, assists: 1.25 },   // Crosses, assists (Di María, Hakimi)
    'Wide Playmaker': { goals: 0.80, assists: 1.20 },       // Creative from flanks (Silva, Isco)

    // Defensores
    'Wing-Back': { goals: 1.10, assists: 1.20 },           // Attacking fullback (Alves, TAA)
    'Ball-Playing Defender': { goals: 0.90, assists: 1.00 }, // Builds from back (Stones, Marquinhos)
    'Stopper': { goals: 1.10, assists: 0.70 },             // Physical, set pieces (Ramos, Puyol)
    'Sweeper': { goals: 0.85, assists: 0.85 },             // Reads game (Bonucci, Hummels)

    // Goleiros (raramente impacta mas mantém consistência)
    'Sweeper Keeper': { goals: 1.00, assists: 1.20 },      // Long passes (Neuer, Ederson)
    'Shot Stopper': { goals: 1.00, assists: 0.80 },        // Reflex specialist (Courtois)

    // Genéricos
    'Emerging Talent': { goals: 1.00, assists: 1.00 },     // Young, undefined
    'Versatile Player': { goals: 1.00, assists: 1.00 },    // Jack of all trades
  };

  static getStyleGoalModifier(style?: PlayerStyle): number {
    if (!style) return 1.0;
    return this.STYLE_MODIFIERS[style]?.goals ?? 1.0;
  }

  static getStyleAssistModifier(style?: PlayerStyle): number {
    if (!style) return 1.0;
    return this.STYLE_MODIFIERS[style]?.assists ?? 1.0;
  }
}
