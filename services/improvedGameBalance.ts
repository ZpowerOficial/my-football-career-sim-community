import { Player, PlayerStats, PositionDetail, Archetype, CareerTrajectory, Tactic, SquadStatus, TraitName, Team } from '../types';

// ============================================
// SISTEMA DE BALANCEAMENTO MELHORADO
// Implementação com curvas marginalistas e realismo aprimorado
// ============================================

export interface ProgressionCurve {
  name: string;
  description: string;
  baseMultiplier: number;
  ageModifier: (age: number, peakStart: number, peakEnd: number) => number;
  formModifier: (form: number) => number;
  personalityModifier: (personality: string) => number;
  traitModifier: (traits: any[]) => number;
  tacticalModifier: (tactic: Tactic, position: PositionDetail) => number;
}

export interface MarginalProgressionSystem {
  statProgression: Record<keyof PlayerStats, ProgressionCurve>;
  ageCurves: Record<CareerTrajectory, {
    growthRate: number;
    peakMultiplier: number;
    declineRate: number;
  }>;
  positionSpecific: Record<PositionDetail, {
    keyStats: (keyof PlayerStats)[];
    growthFocus: Record<keyof PlayerStats, number>;
    declineResistance: Record<keyof PlayerStats, number>;
  }>;
  archetypeModifiers: Record<Archetype, {
    statBonuses: Partial<Record<keyof PlayerStats, number>>;
    growthMultipliers: Partial<Record<keyof PlayerStats, number>>;
    specialRules: string[];
  }>;
}

// ============================================
// 1. CURVAS DE PROGRESSÃƒO MARGINALISTAS
// ============================================

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export const createMarginalProgressionSystem = (): MarginalProgressionSystem => {
  return {
    // ========== CURVAS DE PROGRESSÃƒO POR ESTATÃSTICA ==========
    statProgression: {
      overall: {
        name: 'Overall',
        description: 'Rating geral calculado',
        baseMultiplier: 0.0,
        ageModifier: () => 1.0,
        formModifier: () => 1.0,
        personalityModifier: () => 1.0,
        traitModifier: () => 1.0,
        tacticalModifier: () => 1.0
      },
      // Atributos Físicos
      pace: {
        name: 'Velocidade',
        description: 'Curva de desenvolvimento de velocidade com pico precoce',
        baseMultiplier: 1.0,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < peakStart - 2) return 1.2;
          if (age <= peakEnd) return 1.0;
          if (age <= peakEnd + 3) return 0.8;
          return 0.5;
        },
        formModifier: (form) => 1 + (form * 0.15),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Ambitious': 1.1, 'Determined': 1.15, 'Professional': 1.05,
            'Lazy': 0.85, 'Temperamental': 0.9, 'Inconsistent': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Natural Fitness')) return 1.1;
          if (traits.some((t: any) => t.name === 'Injury Prone')) return 0.9;
          return 1.0;
        },
        tacticalModifier: (tactic: Tactic, position: PositionDetail) => {
          if (tactic === 'Attacking' && ['LW', 'RW', 'ST'].includes(position)) return 1.1;
          if (tactic === 'Defensive' && ['CB', 'LB', 'RB'].includes(position)) return 1.05;
          return 1.0;
        }
      },

      shooting: {
        name: 'Finalização',
        description: 'Desenvolvimento técnico com curva marginalista',
        baseMultiplier: 0.9,


        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 20) return 0.8;
          if (age <= 25) return 1.1;
          if (age <= 30) return 1.0;
          return 0.85;
        },
        formModifier: (form) => 1 + (form * 0.2),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.12, 'Determined': 1.08, 'Ambitious': 1.05,
            'Temperamental': 0.85, 'Inconsistent': 0.75, 'Lazy': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Clinical Finisher')) return 1.15;
          if (traits.some((t: any) => t.name === 'Flair Player')) return 1.08;
          return 1.0;
        },
        tacticalModifier: (tactic: Tactic, position: PositionDetail) => {
          if (tactic === 'Attacking') return 1.15;
          if (tactic === 'Defensive') return 0.9;
          return 1.0;
        }
      },

      passing: {
        name: 'Passe',
        description: 'Habilidade técnica com desenvolvimento consistente',
        baseMultiplier: 0.95,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 22) return 1.0;
          if (age <= 28) return 1.05;
          if (age <= 32) return 0.95;
          return 0.8;
        },
        formModifier: (form) => 1 + (form * 0.18),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.15, 'Ambitious': 1.08, 'Determined': 1.1,
            'Temperamental': 0.8, 'Inconsistent': 0.7, 'Lazy': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Set-piece Specialist')) return 1.12;
          if (traits.some((t: any) => t.name === 'Swerve Pass')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic: Tactic, position: PositionDetail) => {
          if (tactic === 'Possession') return 1.2;
          if (tactic === 'Direct') return 0.85;
          return 1.0;
        }
      },

      dribbling: {
        name: 'Drible',
        description: 'Habilidade técnica com declínio precoce',
        baseMultiplier: 0.85,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 21) return 1.15;
          if (age <= 26) return 1.0;
          if (age <= 30) return 0.8;
          return 0.6;
        },
        formModifier: (form) => 1 + (form * 0.22),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Ambitious': 1.12, 'Professional': 1.1, 'Determined': 1.08,
            'Flair Player': 1.2, 'Temperamental': 0.75, 'Inconsistent': 0.65
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Flair Player')) return 1.2;
          if (traits.some((t: any) => t.name === 'Technical Maestro')) return 1.15;
          return 1.0;
        },
        tacticalModifier: (tactic: Tactic, position: PositionDetail) => {
          if (tactic === 'Possession') return 1.18;
          if (tactic === 'Defensive') return 0.8;
          return 1.0;
        }
      },

      defending: {
        name: 'Defesa',
        description: 'Atributo tático com desenvolvimento tardio',
        baseMultiplier: 0.8,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 23) return 0.9;
          if (age <= 29) return 1.1;
          if (age <= 33) return 1.05;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.12),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.1, 'Determined': 1.08, 'Ambitious': 1.05,
            'Temperamental': 0.85, 'Inconsistent': 0.8, 'Lazy': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Dives Into Tackles')) return 1.08;
          if (traits.some((t: any) => t.name === 'Leadership')) return 1.05;
          return 1.0;
        },
        tacticalModifier: (tactic: Tactic, position: PositionDetail) => {
          if (tactic === 'Defensive') return 1.25;
          if (tactic === 'Attacking') return 0.85;
          return 1.0;
        }
      },

      physical: {
        name: 'Físico',
        description: 'Atributo físico com curva clássica',
        baseMultiplier: 1.1,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 1.2;
          if (age <= 28) return 1.0;
          if (age <= 32) return 0.75;
          return 0.5;
        },
        formModifier: (form) => 1 + (form * 0.1),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.15, 'Professional': 1.1, 'Ambitious': 1.05,
            'Lazy': 0.7, 'Temperamental': 0.85, 'Inconsistent': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Tireless Runner')) return 1.12;
          if (traits.some((t: any) => t.name === 'The Engine')) return 1.2;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Balanced') return 1.1;
          if (tactic === 'Direct') return 1.15;
          return 1.0;
        }
      },

      composure: {
        name: 'Compostura',
        description: 'Desenvolvimento mental com experiência',
        baseMultiplier: 0.75,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 0.9;
          if (age <= 32) return 1.15;
          if (age <= 35) return 1.1;
          return 0.95;
        },
        formModifier: (form) => 1 + (form * 0.08),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.2, 'Determined': 1.15, 'Ambitious': 1.1,
            'Temperamental': 0.6, 'Inconsistent': 0.65, 'Lazy': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Leadership')) return 1.1;
          if (traits.some((t: any) => t.name === 'Big Game Player')) return 1.08;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Defensive') return 1.12;
          if (tactic === 'Attacking') return 1.05;
          return 1.0;
        }
      },

      vision: {
        name: 'Visão',
        description: 'Inteligência tática com desenvolvimento tardio',
        baseMultiplier: 0.8,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 0.95;
          if (age <= 30) return 1.1;
          if (age <= 34) return 1.05;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.16),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.18, 'Ambitious': 1.12, 'Determined': 1.1,
            'Temperamental': 0.7, 'Inconsistent': 0.6, 'Lazy': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Technical Maestro')) return 1.15;
          if (traits.some((t: any) => t.name === 'Playmaker')) return 1.12;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Possession') return 1.22;
          if (tactic === 'Direct') return 0.85;
          return 1.0;
        }
      },

      handling: {
        name: 'Manuseio',
        description: 'Habilidade específica de goleiro',
        baseMultiplier: 0.7,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 1.0;
          if (age <= 32) return 1.05;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.14),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.15, 'Determined': 1.1, 'Ambitious': 1.05,
            'Temperamental': 0.75, 'Inconsistent': 0.7
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Shot Stopper')) return 1.12;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Defensive') return 1.1;
          return 1.0;
        }
      },

      reflexes: {
        name: 'Reflexos',
        description: 'Atributo físico específico de goleiro',
        baseMultiplier: 0.65,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 23) return 1.1;
          if (age <= 28) return 1.0;
          if (age <= 32) return 0.8;
          return 0.6;
        },
        formModifier: (form) => 1 + (form * 0.12),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.12, 'Professional': 1.08, 'Ambitious': 1.05,
            'Lazy': 0.8, 'Temperamental': 0.85
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Sweeper Keeper')) return 1.08;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Balanced') return 1.05;
          return 1.0;
        }
      },

      diving: {
        name: 'Mergulho',
        description: 'Atributo atlético específico de goleiro',
        baseMultiplier: 0.6,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 1.15;
          if (age <= 29) return 0.95;
          if (age <= 33) return 0.7;
          return 0.5;
        },
        formModifier: (form) => 1 + (form * 0.1),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.1, 'Professional': 1.05, 'Ambitious': 1.02,
            'Lazy': 0.75, 'Temperamental': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Athletic')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          return 1.0;
        }
      },

      aggression: {
        name: 'Agressividade',
        description: 'Traço comportamental com desenvolvimento',
        baseMultiplier: 0.5,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 26) return 1.05;
          if (age <= 31) return 1.0;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.08),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Temperamental': 1.3, 'Determined': 1.15, 'Ambitious': 1.1,
            'Professional': 0.85, 'Loyal': 0.9, 'Reserved': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Dives Into Tackles')) return 1.2;
          if (traits.some((t: any) => t.name === 'Leadership')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Defensive') return 1.15;
          if (tactic === 'Attacking') return 0.9;
          return 1.0;
        }
      },

      positioning: {
        name: 'Posicionamento',
        description: 'Inteligência espacial com desenvolvimento tardio',
        baseMultiplier: 0.7,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 0.95;
          if (age <= 32) return 1.1;
          return 1.0;
        },
        formModifier: (form) => 1 + (form * 0.14),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.2, 'Determined': 1.15, 'Ambitious': 1.1,
            'Temperamental': 0.75, 'Inconsistent': 0.7, 'Lazy': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Big Game Player')) return 1.12;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Balanced') return 1.15;
          if (tactic === 'Defensive') return 1.2;
          return 1.0;
        }
      },

      interceptions: {
        name: 'Interceptações',
        description: 'Habilidade técnica com desenvolvimento',
        baseMultiplier: 0.65,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 1.0;
          if (age <= 30) return 1.05;
          return 0.95;
        },
        formModifier: (form) => 1 + (form * 0.13),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.15, 'Determined': 1.1, 'Ambitious': 1.05,
            'Temperamental': 0.8, 'Inconsistent': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Anticipation')) return 1.15;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Defensive') return 1.25;
          if (tactic === 'Possession') return 0.9;
          return 1.0;
        }
      },

      workRate: {
        name: 'Work Rate',
        description: 'Ã‰tica de trabalho com desenvolvimento',
        baseMultiplier: 0.6,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 1.1;
          if (age <= 33) return 1.0;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.09),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.25, 'Professional': 1.2, 'Ambitious': 1.15,
            'Lazy': 0.5, 'Temperamental': 0.8, 'Inconsistent': 0.7
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Tireless Runner')) return 1.3;
          if (traits.some((t: any) => t.name === 'The Engine')) return 1.25;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Balanced') return 1.2;
          if (tactic === 'Defensive') return 1.15;
          return 1.0;
        }
      },

      stamina: {
        name: 'Estamina',
        description: 'Resistência física com curva clássica',
        baseMultiplier: 0.8,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 23) return 1.15;
          if (age <= 27) return 1.0;
          if (age <= 31) return 0.8;
          return 0.6;
        },
        formModifier: (form) => 1 + (form * 0.11),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.2, 'Professional': 1.15, 'Ambitious': 1.1,
            'Lazy': 0.6, 'Temperamental': 0.85, 'Inconsistent': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Tireless Runner')) return 1.25;
          if (traits.some((t: any) => t.name === 'Natural Fitness')) return 1.15;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Counter') return 1.15;
          if (tactic === 'Possession') return 1.1;
          return 1.0;
        }
      },

      strength: {
        name: 'Força',
        description: 'Atributo físico com desenvolvimento tardio',
        baseMultiplier: 0.75,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 1.1;
          if (age <= 30) return 1.0;
          if (age <= 34) return 0.9;
          return 0.8;
        },
        formModifier: (form) => 1 + (form * 0.1),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.15, 'Professional': 1.1, 'Ambitious': 1.05,
            'Lazy': 0.7, 'Temperamental': 0.85
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Target Man')) return 1.2;
          if (traits.some((t: any) => t.name === 'Aerial Dominance')) return 1.15;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Direct') return 1.2;
          if (tactic === 'Possession') return 0.9;
          return 1.0;
        }
      },

      agility: {
        name: 'Agilidade',
        description: 'Atributo atlético com declínio precoce',
        baseMultiplier: 0.7,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 22) return 1.2;
          if (age <= 28) return 1.0;
          if (age <= 32) return 0.75;
          return 0.55;
        },
        formModifier: (form) => 1 + (form * 0.13),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.12, 'Professional': 1.08, 'Ambitious': 1.05,
            'Lazy': 0.75, 'Temperamental': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Flair Player')) return 1.15;
          if (traits.some((t: any) => t.name === 'Technical Maestro')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Possession') return 1.18;
          if (tactic === 'Counter') return 1.12;
          return 1.0;
        }
      },

      jumping: {
        name: 'Impulsão',
        description: 'Atributo físico com curva específica',
        baseMultiplier: 0.65,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 1.15;
          if (age <= 29) return 1.0;
          if (age <= 33) return 0.8;
          return 0.6;
        },
        formModifier: (form) => 1 + (form * 0.09),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Determined': 1.1, 'Professional': 1.05, 'Ambitious': 1.02,
            'Lazy': 0.8, 'Temperamental': 0.85
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Aerial Dominance')) return 1.2;
          if (traits.some((t: any) => t.name === 'Power Header')) return 1.15;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Direct') return 1.15;
          if (tactic === 'Counter') return 1.1;
          return 1.0;
        }
      },

      crossing: {
        name: 'Cruzamento',
        description: 'Habilidade técnica específica',
        baseMultiplier: 0.6,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 23) return 1.05;
          if (age <= 30) return 1.0;
          return 0.9;
        },
        formModifier: (form) => 1 + (form * 0.15),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.15, 'Determined': 1.1, 'Ambitious': 1.05,
            'Temperamental': 0.8, 'Inconsistent': 0.7
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Long Throw')) return 1.12;
          if (traits.some((t: any) => t.name === 'Swerve Pass')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Direct') return 1.2;
          if (tactic === 'Possession') return 1.1;
          return 1.0;
        }
      },

      longShots: {
        name: 'Chutes de Longe',
        description: 'Habilidade técnica específica',
        baseMultiplier: 0.55,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 24) return 1.0;
          if (age <= 29) return 1.05;
          return 0.95;
        },
        formModifier: (form) => 1 + (form * 0.17),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Ambitious': 1.12, 'Professional': 1.1, 'Determined': 1.08,
            'Temperamental': 0.75, 'Inconsistent': 0.65
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Long Shots')) return 1.2;
          if (traits.some((t: any) => t.name === 'Flair Player')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Direct') return 1.25;
          if (tactic === 'Possession') return 0.9;
          return 1.0;
        }
      },

      curve: {
        name: 'Curva',
        description: 'Habilidade técnica refinada',
        baseMultiplier: 0.5,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 1.0;
          if (age <= 31) return 1.05;
          return 0.95;
        },
        formModifier: (form) => 1 + (form * 0.16),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.18, 'Ambitious': 1.12, 'Determined': 1.1,
            'Temperamental': 0.7, 'Inconsistent': 0.6
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Set-piece Specialist')) return 1.15;
          if (traits.some((t: any) => t.name === 'Swerve Pass')) return 1.12;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Possession') return 1.2;
          if (tactic === 'Direct') return 1.1;
          return 1.0;
        }
      },

      flair: {
        name: 'Estilo',
        description: 'Criatividade individual com curva única',
        baseMultiplier: 0.45,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 22) return 1.1;
          if (age <= 28) return 1.0;
          if (age <= 32) return 0.9;
          return 0.75;
        },
        formModifier: (form) => 1 + (form * 0.25),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Ambitious': 1.2, 'Professional': 1.15, 'Determined': 1.1,
            'Temperamental': 0.6, 'Inconsistent': 0.5, 'Lazy': 0.7,
            'Media Darling': 1.25, 'Reserved': 0.8
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Flair Player')) return 1.3;
          if (traits.some((t: any) => t.name === 'Technical Maestro')) return 1.2;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Possession') return 1.25;
          if (tactic === 'Defensive') return 0.8;
          return 1.0;
        }
      },

      leadership: {
        name: 'Liderança',
        description: 'Atributo mental com desenvolvimento tardio',
        baseMultiplier: 0.4,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 26) return 0.9;
          if (age <= 33) return 1.15;
          return 1.1;
        },
        formModifier: (form) => 1 + (form * 0.07),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.25, 'Determined': 1.2, 'Ambitious': 1.15,
            'Temperamental': 0.65, 'Inconsistent': 0.7, 'Lazy': 0.6,
            'Loyal': 1.1, 'Reserved': 0.85
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Leadership')) return 1.4;
          if (traits.some((t: any) => t.name === 'Big Game Player')) return 1.1;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Balanced') return 1.1;
          if (tactic === 'Defensive') return 1.15;
          return 1.0;
        }
      },

      fitness: {
        name: 'Preparação Física',
        description: 'Condição física geral',
        baseMultiplier: 0.85,
        ageModifier: (age, peakStart, peakEnd) => {
          if (age < 25) return 1.1;
          if (age <= 29) return 1.0;
          if (age <= 33) return 0.85;
          return 0.7;
        },
        formModifier: (form) => 1 + (form * 0.12),
        personalityModifier: (personality) => {
          const modifiers: Record<string, number> = {
            'Professional': 1.15, 'Determined': 1.12, 'Ambitious': 1.08,
            'Lazy': 0.65, 'Temperamental': 0.8, 'Inconsistent': 0.75
          };
          return modifiers[personality] || 1.0;
        },
        traitModifier: (traits) => {
          if (traits.some((t: any) => t.name === 'Natural Fitness')) return 1.2;
          if (traits.some((t: any) => t.name === 'Injury Prone')) return 0.85;
          return 1.0;
        },
        tacticalModifier: (tactic, position) => {
          if (tactic === 'Counter') return 1.12;
          if (tactic === 'Possession') return 1.08;
          return 1.0;
        }
      },
      sprintSpeed: undefined,
      acceleration: undefined,
      balance: undefined,
      ballControl: undefined,
      weakFoot: undefined,
      shotPower: undefined,
      heading: undefined,
      finishing: undefined,
      preferredFoot: undefined,
      leftFootFinishing: undefined,
      rightFootFinishing: undefined
    },

    // ========== CURVAS ETÃRIAS POR TRAJETÃ“RIA ==========
    ageCurves: {
      'Early Bloomer': {
        growthRate: 1.3,
        peakMultiplier: 1.2,
        declineRate: 1.1
      },
      'Standard': {
        growthRate: 1.0,
        peakMultiplier: 1.0,
        declineRate: 1.0
      },
      'Late Bloomer': {
        growthRate: 0.8,
        peakMultiplier: 0.9,
        declineRate: 0.85
      }
    },

    // ========== ESPECIFICIDADES POR POSIÃ‡ÃƒO ==========
    positionSpecific: {
      'GK': {
        keyStats: ['handling', 'reflexes', 'diving', 'positioning', 'composure'],
        growthFocus: {
          overall: 0.0, handling: 1.2, reflexes: 1.15, diving: 1.1, positioning: 1.05, composure: 1.0,
          pace: 0.3, dribbling: 0.4, shooting: 0.2, passing: 0.6, defending: 0.5, physical: 0.8,
          flair: 0.3, leadership: 0.7, fitness: 0.9, vision: 0.6, aggression: 0.4,
          interceptions: 0.5, workRate: 0.6, stamina: 0.7, strength: 0.5, agility: 0.6,
          jumping: 0.5, crossing: 0.2, longShots: 0.1, curve: 0.3,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.3, shooting: 0.2, passing: 0.6, dribbling: 0.4, defending: 0.5, physical: 0.8,
          composure: 1.3, vision: 0.6, flair: 0.3, leadership: 0.7, fitness: 0.9, aggression: 0.4,
          interceptions: 0.5, workRate: 0.6, stamina: 0.7, strength: 0.5, agility: 0.6,
          jumping: 0.5, crossing: 0.2, longShots: 0.1, curve: 0.3, handling: 1.1, reflexes: 0.9, diving: 0.8, positioning: 1.2,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'CB': {
        keyStats: ['defending', 'physical', 'positioning', 'interceptions', 'strength'],
        growthFocus: {
          overall: 0.0, defending: 1.15, positioning: 1.1, interceptions: 1.05, physical: 1.0, strength: 0.95,
          pace: 0.8, dribbling: 0.5, shooting: 0.3, passing: 0.7, composure: 0.9, vision: 0.6,
          flair: 0.4, leadership: 0.8, fitness: 0.9, aggression: 0.7, workRate: 0.8, stamina: 0.8,
          agility: 0.6, jumping: 0.7, crossing: 0.4, longShots: 0.2, curve: 0.3, handling: 0.1,
          reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.8, shooting: 0.3, passing: 0.7, dribbling: 0.5, defending: 1.1, physical: 0.9,
          composure: 1.05, vision: 0.6, flair: 0.4, leadership: 0.8, fitness: 0.9, aggression: 0.7, workRate: 0.8, stamina: 0.8,
          interceptions: 1.15, strength: 0.6, agility: 0.6, jumping: 0.7, crossing: 0.4, longShots: 0.2, curve: 0.3, handling: 0.1,
          reflexes: 0.1, diving: 0.1, positioning: 1.25,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'LB': {
        keyStats: ['defending', 'pace', 'crossing', 'interceptions', 'stamina'],
        growthFocus: {
          overall: 0.0, pace: 1.1, crossing: 1.05, stamina: 1.0, defending: 0.95, interceptions: 0.9,
          dribbling: 0.8, passing: 0.85, shooting: 0.4, physical: 0.7, composure: 0.8, vision: 0.7,
          flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, strength: 0.6,
          agility: 0.8, jumping: 0.5, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1,
          diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.85, shooting: 0.4, passing: 0.85, dribbling: 0.8, defending: 1.1, physical: 0.7, composure: 0.8, vision: 0.7,
          flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, stamina: 0.95, interceptions: 1.15, strength: 0.6,
          agility: 0.8, jumping: 0.5, crossing: 1.05, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 1.2,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'RB': {
        keyStats: ['defending', 'pace', 'crossing', 'interceptions', 'stamina'],
        growthFocus: {
          overall: 0.0, pace: 1.1, crossing: 1.05, stamina: 1.0, defending: 0.95, interceptions: 0.9,
          dribbling: 0.8, passing: 0.85, shooting: 0.4, physical: 0.7, composure: 0.8, vision: 0.7,
          flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, strength: 0.6,
          agility: 0.8, jumping: 0.5, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1,
          diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.85, shooting: 0.4, passing: 0.85, dribbling: 0.8, defending: 1.1, physical: 0.7, composure: 0.8, vision: 0.7,
          flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, stamina: 0.95, interceptions: 1.15, strength: 0.6,
          agility: 0.8, jumping: 0.5, crossing: 1.05, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 1.2,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'CDM': {
        keyStats: ['defending', 'passing', 'workRate', 'interceptions', 'stamina'],
        growthFocus: {
          overall: 0.0, interceptions: 1.1, workRate: 1.05, stamina: 1.0, defending: 0.95, passing: 0.9,
          vision: 0.85, physical: 0.8, dribbling: 0.6, shooting: 0.4, composure: 0.8, pace: 0.7,
          flair: 0.5, leadership: 0.7, fitness: 0.9, aggression: 0.8, strength: 0.7, agility: 0.6,
          jumping: 0.5, crossing: 0.6, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1,
          diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.7, shooting: 0.4, passing: 0.9, dribbling: 0.6, defending: 0.95, physical: 0.8, composure: 0.8, vision: 0.85,
          flair: 0.5, leadership: 0.7, fitness: 0.9, aggression: 0.8, workRate: 1.15, stamina: 1.0, interceptions: 1.2, strength: 0.7,
          agility: 0.6, jumping: 0.5, crossing: 0.6, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 1.25,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'CM': {
        keyStats: ['passing', 'vision', 'dribbling', 'workRate', 'stamina'],
        growthFocus: {
          overall: 0.0, vision: 1.1, passing: 1.05, dribbling: 1.0, workRate: 0.95, stamina: 0.9,
          shooting: 0.8, physical: 0.7, defending: 0.6, composure: 0.85, pace: 0.7, flair: 0.8,
          leadership: 0.7, fitness: 0.9, aggression: 0.6, interceptions: 0.7, strength: 0.6,
          agility: 0.7, jumping: 0.5, crossing: 0.7, longShots: 0.6, curve: 0.5, handling: 0.1,
          reflexes: 0.1, diving: 0.1, positioning: 0.8,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.7, shooting: 0.8, passing: 1.2, dribbling: 0.9, defending: 0.6, physical: 0.7, composure: 1.25, vision: 1.3,
          flair: 0.8, leadership: 0.7, fitness: 0.9, aggression: 0.6, workRate: 1.1, stamina: 0.9, interceptions: 0.7, strength: 0.6,
          agility: 0.7, jumping: 0.5, crossing: 0.7, longShots: 0.6, curve: 0.5, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.8,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'CAM': {
        keyStats: ['vision', 'passing', 'dribbling', 'shooting', 'flair'],
        growthFocus: {
          overall: 0.0, pace: 0.7, shooting: 0.95, passing: 1.0, dribbling: 1.05, defending: 0.4, physical: 0.7,
          composure: 0.9, vision: 1.15, flair: 1.1, leadership: 0.7, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 0.4, workRate: 0.6, stamina: 0.6, strength: 0.7, agility: 0.7,
          jumping: 0.5, crossing: 0.8, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.7, shooting: 0.95, passing: 1.25, dribbling: 0.95, defending: 0.4, physical: 0.7, composure: 1.3, vision: 1.35,
          flair: 1.15, leadership: 0.7, fitness: 0.9, aggression: 0.6, workRate: 0.6, stamina: 0.6, interceptions: 0.4, strength: 0.7,
          agility: 0.7, jumping: 0.5, crossing: 0.8, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'LM': {
        keyStats: ['dribbling', 'crossing', 'pace', 'passing', 'shooting'],
        growthFocus: {
          overall: 0.0, pace: 1.0, shooting: 0.9, passing: 0.95, dribbling: 1.1, defending: 0.5, physical: 0.7,
          composure: 0.8, vision: 0.85, flair: 0.85, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.8, interceptions: 0.5, workRate: 0.8, stamina: 0.8, strength: 0.7, agility: 0.8,
          jumping: 0.5, crossing: 1.05, longShots: 0.6, curve: 0.5, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.9, shooting: 0.9, passing: 1.15, dribbling: 1.1, defending: 0.5, physical: 0.7, composure: 1.05, vision: 0.85,
          flair: 0.85, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, stamina: 0.8, interceptions: 0.5, strength: 0.7,
          agility: 0.8, jumping: 0.5, crossing: 1.2, longShots: 0.6, curve: 0.5, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.8,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'RM': {
        keyStats: ['dribbling', 'crossing', 'pace', 'passing', 'shooting'],
        growthFocus: {
          overall: 0.0, pace: 1.0, shooting: 0.9, passing: 0.95, dribbling: 1.1, defending: 0.5, physical: 0.7,
          composure: 0.8, vision: 0.85, flair: 0.85, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.8, interceptions: 0.5, workRate: 0.8, stamina: 0.8, strength: 0.7, agility: 0.8,
          jumping: 0.5, crossing: 1.05, longShots: 0.6, curve: 0.5, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.9, shooting: 0.9, passing: 1.15, dribbling: 1.1, defending: 0.5, physical: 0.7, composure: 1.05, vision: 0.85,
          flair: 0.85, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.8, stamina: 0.8, interceptions: 0.5, strength: 0.7,
          agility: 0.8, jumping: 0.5, crossing: 1.2, longShots: 0.6, curve: 0.5, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.8,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'LW': {
        keyStats: ['dribbling', 'shooting', 'pace', 'crossing', 'flair'],
        growthFocus: {
          overall: 0.0, pace: 1.05, shooting: 1.0, passing: 0.8, dribbling: 1.15, defending: 0.3, physical: 0.7,
          composure: 1.1, vision: 0.8, flair: 1.1, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 0.3, workRate: 0.6, stamina: 0.6, strength: 0.7, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.85, shooting: 1.0, passing: 0.8, dribbling: 1.2, defending: 0.3, physical: 0.7, composure: 1.1, vision: 0.8,
          flair: 1.25, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.6, stamina: 0.6, interceptions: 0.3, strength: 0.7,
          agility: 0.8, jumping: 0.5, crossing: 1.15, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'RW': {
        keyStats: ['dribbling', 'shooting', 'pace', 'crossing', 'flair'],
        growthFocus: {
          overall: 0.0, pace: 1.05, shooting: 1.0, passing: 0.8, dribbling: 1.15, defending: 0.3, physical: 0.7,
          composure: 1.1, vision: 0.8, flair: 1.1, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 0.3, workRate: 0.6, stamina: 0.6, strength: 0.7, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.85, shooting: 1.0, passing: 0.8, dribbling: 1.2, defending: 0.3, physical: 0.7, composure: 1.1, vision: 0.8,
          flair: 1.25, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.6, stamina: 0.6, interceptions: 0.3, strength: 0.7,
          agility: 0.8, jumping: 0.5, crossing: 1.15, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 0.9,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'CF': {
        keyStats: ['shooting', 'dribbling', 'pace', 'positioning', 'composure'],
        growthFocus: {
          overall: 0.0, pace: 0.9, shooting: 1.1, passing: 0.8, dribbling: 1.0, defending: 0.3, physical: 0.7,
          composure: 0.95, vision: 0.8, flair: 0.8, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 1.05, interceptions: 0.3, workRate: 0.6, stamina: 0.6, strength: 0.7, agility: 0.8,
          jumping: 0.5, crossing: 0.8, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.9, shooting: 1.2, passing: 0.8, dribbling: 1.1, defending: 0.3, physical: 0.7, composure: 1.3, vision: 0.8,
          flair: 0.8, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.6, stamina: 0.6, interceptions: 0.3, strength: 0.7,
          agility: 0.8, jumping: 0.5, crossing: 0.8, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 1.25,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'ST': {
        keyStats: ['shooting', 'pace', 'physical', 'positioning', 'composure'],
        growthFocus: {
          overall: 0.0, pace: 1.0, shooting: 1.15, passing: 0.7, dribbling: 0.8, defending: 0.3, physical: 0.95,
          composure: 1.05, vision: 0.7, flair: 0.8, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 1.1, interceptions: 0.3, workRate: 0.6, stamina: 0.6, strength: 0.95, agility: 0.8,
          jumping: 0.5, crossing: 0.7, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.85, shooting: 1.25, passing: 0.7, dribbling: 0.8, defending: 0.3, physical: 1.1, composure: 1.35, vision: 0.7,
          flair: 0.8, leadership: 0.6, fitness: 0.9, aggression: 0.6, workRate: 0.6, stamina: 0.6, interceptions: 0.3, strength: 0.95,
          agility: 0.8, jumping: 0.5, crossing: 0.7, longShots: 0.8, curve: 0.7, handling: 0.1, reflexes: 0.1, diving: 0.1, positioning: 1.3,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'LWB': {
        keyStats: ['pace', 'crossing', 'stamina', 'workRate', 'defending'],
        growthFocus: {
          overall: 0.0, pace: 1.1, shooting: 0.4, passing: 0.75, dribbling: 0.8, defending: 0.9, physical: 0.7,
          composure: 0.8, vision: 0.7, flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 0.9, workRate: 1.0, stamina: 1.05, strength: 0.6, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.9, shooting: 0.4, passing: 0.75, dribbling: 0.8, defending: 1.1, physical: 0.7,
          composure: 0.8, vision: 0.7, flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 1.15, workRate: 1.2, stamina: 1.15, strength: 0.6, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      },
      'RWB': {
        keyStats: ['pace', 'crossing', 'stamina', 'workRate', 'defending'],
        growthFocus: {
          overall: 0.0, pace: 1.1, shooting: 0.4, passing: 0.75, dribbling: 0.8, defending: 0.9, physical: 0.7,
          composure: 0.8, vision: 0.7, flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 0.9, workRate: 1.0, stamina: 1.05, strength: 0.6, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        },
        declineResistance: {
          overall: 0.0, pace: 0.9, shooting: 0.4, passing: 0.75, dribbling: 0.8, defending: 1.1, physical: 0.7,
          composure: 0.8, vision: 0.7, flair: 0.5, leadership: 0.6, fitness: 0.9, aggression: 0.6,
          positioning: 0.9, interceptions: 1.15, workRate: 1.2, stamina: 1.15, strength: 0.6, agility: 0.8,
          jumping: 0.5, crossing: 0.95, longShots: 0.3, curve: 0.4, handling: 0.1, reflexes: 0.1, diving: 0.1,
          balance: 0,
          sprintSpeed: 0,
          ballControl: 0,
          weakFoot: 0,
          acceleration: 0,
          shotPower: 0,
          heading: 0,
          finishing: 0,
          preferredFoot: 0,
          leftFootFinishing: 0,
          rightFootFinishing: 0
        }
      }
    },

    // ========== MODIFICADORES POR ARQUÃ‰TIPO ==========
    archetypeModifiers: {
      'Generational Talent': {
        statBonuses: {
          pace: 5, shooting: 8, passing: 8, dribbling: 10, defending: 3,
          physical: 5, composure: 8, vision: 10, flair: 12
        },
        growthMultipliers: {
          pace: 1.3, shooting: 1.4, passing: 1.4, dribbling: 1.5, composure: 1.3,
          vision: 1.5, flair: 1.6, leadership: 1.2
        },
        specialRules: ['Elite development', 'High expectations', 'Media attention']
      },
      'Wonderkid': {
        statBonuses: {
          pace: 3, shooting: 5, passing: 5, dribbling: 7, composure: 5,
          vision: 7, flair: 8
        },
        growthMultipliers: {
          pace: 1.25, shooting: 1.3, passing: 1.3, dribbling: 1.4, composure: 1.25,
          vision: 1.4, flair: 1.35
        },
        specialRules: ['Rapid development', 'Early promotion', 'Transfer interest']
      },
      'Top Prospect': {
        statBonuses: {
          pace: 2, shooting: 3, passing: 3, dribbling: 4, composure: 3,
          vision: 4, flair: 5
        },
        growthMultipliers: {
          pace: 1.2, shooting: 1.25, passing: 1.25, dribbling: 1.3, composure: 1.2,
          vision: 1.3, flair: 1.25
        },
        specialRules: ['Steady development', 'Good potential', 'Club investment']
      },
      'Solid Professional': {
        statBonuses: {
          composure: 3, workRate: 4, positioning: 3, interceptions: 2
        },
        growthMultipliers: {
          composure: 1.15, workRate: 1.2, positioning: 1.15, interceptions: 1.1,
          leadership: 1.1
        },
        specialRules: ['Reliable', 'Team player', 'Longevity']
      },
      'Journeyman': {
        statBonuses: {
          workRate: 2, positioning: 2, composure: 1
        },
        growthMultipliers: {
          workRate: 1.1, positioning: 1.1, composure: 1.05
        },
        specialRules: ['Versatile', 'Experienced', 'Multiple clubs']
      },
      'The Engine': {
        statBonuses: {
          stamina: 8, workRate: 10, physical: 5, interceptions: 3
        },
        growthMultipliers: {
          stamina: 1.4, workRate: 1.5, physical: 1.25, interceptions: 1.15
        },
        specialRules: ['Tireless', 'Box-to-box', 'Injury resistance']
      },
      'Late Bloomer': {
        statBonuses: {
          composure: 2, vision: 3, positioning: 2
        },
        growthMultipliers: {
          composure: 1.2, vision: 1.25, positioning: 1.15, leadership: 1.1
        },
        specialRules: ['Late development', 'Underrated', 'Breakthrough potential']
      },
      'Technical Maestro': {
        statBonuses: {
          dribbling: 8, passing: 7, vision: 8, flair: 10, curve: 5
        },
        growthMultipliers: {
          dribbling: 1.4, passing: 1.35, vision: 1.4, flair: 1.5, curve: 1.25
        },
        specialRules: ['Technical brilliance', 'Set-piece specialist', 'Creative']
      },
      'Target Man': {
        statBonuses: {
          strength: 8, jumping: 7, physical: 5, positioning: 4
        },
        growthMultipliers: {
          strength: 1.3, jumping: 1.25, physical: 1.2, positioning: 1.15
        },
        specialRules: ['Aerial ability', 'Hold-up play', 'Physical presence']
      }
    }
  };
};

// ============================================
// 2. SISTEMA DE PROGRESSÃƒO MARGINALISTA
// ============================================

export const calculateMarginalProgression = (
  player: Player,
  matchesPlayed: number,
  performanceRating: number,
  system: MarginalProgressionSystem
): { statChanges: Partial<PlayerStats>; events: string[] } => {
  const statChanges: Partial<PlayerStats> = {};
  const events: string[] = [];

  const { stats, age, position, archetype, careerTrajectory, form, personality, traits } = player;

  // ========== CÃLCULO BASE DE PONTOS DE CRESCIMENTO ==========
  let baseGrowthPoints = 0;

  if (age < player.peakAgeEnd && (player.potential - stats.overall) > 0) {
    // Curva marginalista baseada na trajetória
    const trajectoryData = system.ageCurves[careerTrajectory];
    let growthDenominator: number;

    switch(careerTrajectory) {
      case 'Early Bloomer':
        growthDenominator = (rand(3, 5) + (age - 14) * 0.4) * trajectoryData.growthRate;
        break;
      case 'Late Bloomer':
        growthDenominator = (rand(8, 12) + (age - 14) * 0.25) * trajectoryData.growthRate;
        break;
      default: // Standard
        growthDenominator = (rand(5, 8) + (age - 14) * 0.35) * trajectoryData.growthRate;
        break;
    }

    if (growthDenominator <= 0) growthDenominator = 1;

    let baseGrowth = (player.potential - stats.overall) / growthDenominator;
    const formMultiplier = 1 + (form / 12); // Forma expandida
    baseGrowthPoints = baseGrowth * (0.35 + (matchesPlayed / 50) * 1.4) * formMultiplier;

    // Desenvolvimento com variância marginalista
    const developmentVariance = randFloat(0.85, 1.18);
    baseGrowthPoints *= developmentVariance;

    // Modificador de personalidade
    const personalityMultiplier = getPersonalityMultiplier(personality);
    baseGrowthPoints *= personalityMultiplier;

    // Modificador de arquétipo
    const archetypeMultiplier = getArchetypeMultiplier(archetype, system);
    baseGrowthPoints *= archetypeMultiplier;
  }

  // ========== DECLÃNIO PÃ“S-PICO ==========
  if (age > player.peakAgeEnd) {
    const trajectoryData = system.ageCurves[careerTrajectory];
    let declineRate = rand(1, Math.ceil((age - player.peakAgeEnd) / 1.2)) * trajectoryData.declineRate;

    // Resistência a declínio por posição
    const positionData = system.positionSpecific[position];
    const mentalStats: (keyof PlayerStats)[] = ['composure', 'vision', 'leadership'];
    const physicalStats: (keyof PlayerStats)[] = ['pace', 'physical', 'stamina', 'agility'];

    // Declínio diferenciado por tipo de atributo
    Object.keys(stats).forEach(key => {
      const statKey = key as keyof PlayerStats;
      if (statKey !== 'overall' && typeof stats[statKey] === 'number') {
        let individualDecline = declineRate;

        if (mentalStats.includes(statKey)) {
          // Atributos mentais declinam mais lentamente
          individualDecline *= 0.6;
          individualDecline *= (positionData.declineResistance[statKey] || 1.0);
        } else if (physicalStats.includes(statKey)) {
          // Atributos físicos declinam mais rapidamente
          individualDecline *= 1.4;
        } else {
          // Atributos técnicos declinam normalmente
          individualDecline *= (positionData.declineResistance[statKey] || 1.0);
        }

        baseGrowthPoints -= individualDecline;
      }
    });
  }

  // ========== APLICAÃ‡ÃƒO DE CRESCIMENTO POR ESTATÃSTICA ==========
  Object.keys(stats).forEach(key => {
    const statKey = key as keyof PlayerStats;
    if (statKey === 'overall') return;

    const currentValue = stats[statKey];
    if (typeof currentValue !== 'number') return;

    const curve = system.statProgression[statKey];
    if (!curve) return;

    // Cálculo individual por estatística
    let individualGrowth = baseGrowthPoints;

    // Modificador etário específico
    const ageModifier = curve.ageModifier(age, player.peakAgeStart, player.peakAgeEnd);
    individualGrowth *= ageModifier;

    // Modificador de forma
    const formModifier = curve.formModifier(form);
    individualGrowth *= formModifier;

    // Modificador de personalidade
    const personalityModifier = curve.personalityModifier(personality);
    individualGrowth *= personalityModifier;

    // Modificador de traits
    const traitModifier = curve.traitModifier(traits);
    individualGrowth *= traitModifier;

    // Foco posicional
    const positionData = system.positionSpecific[position];
    const positionFocus = positionData.growthFocus[statKey] || 0.5;
    individualGrowth *= positionFocus;

    // Modificador tático
    const tacticalModifier = curve.tacticalModifier(player.tactic || 'Balanced', position);
    individualGrowth *= tacticalModifier;

    // Variância individual (jogadores diferentes se desenvolvem diferente)
    const individualVariance = randFloat(0.7, 1.4);
    individualGrowth *= individualVariance;

    // Aplicação do crescimento
    const newValue = clamp(currentValue + individualGrowth, 10, 99);
    (statChanges as any)[statKey] = newValue;

    // Eventos de desenvolvimento significativo
    if (Math.abs(individualGrowth) >= 3) {
      if (individualGrowth > 0) {
        events.push(`${curve.name} melhorou significativamente (+${Math.round(individualGrowth)})`);
      } else if (individualGrowth < -2) {
        events.push(`${curve.name} sofreu declínio (${Math.round(individualGrowth)})`);
      }
    }
  });

  return { statChanges, events };
};

// ============================================
// 3. AUXILIARES E MODIFICADORES
// ============================================

const getPersonalityMultiplier = (personality: string): number => {
  const multipliers: Record<string, number> = {
    'Ambitious': 1.12, 'Professional': 1.08, 'Determined': 1.1,
    'Lazy': 0.85, 'Temperamental': 0.9, 'Inconsistent': 0.8,
    'Media Darling': 1.05, 'Reserved': 0.95, 'Loyal': 1.02
  };
  return multipliers[personality] || 1.0;
};

const getArchetypeMultiplier = (archetype: Archetype, system: MarginalProgressionSystem): number => {
  // Baseado no primeiro stat do growthMultipliers do arquétipo
  const modifiers = system.archetypeModifiers[archetype];
  if (!modifiers || !modifiers.growthMultipliers) return 1.0;

  const firstStat = Object.keys(modifiers.growthMultipliers)[0] as keyof PlayerStats;
  return modifiers.growthMultipliers[firstStat] || 1.0;
};

// ============================================
// 4. SISTEMA DE AVALIAÃ‡ÃƒO DE PERFORMANCE
// ============================================

export const calculatePerformanceRating = (
  player: Player,
  goals: number,
  assists: number,
  cleanSheets: number,
  matchesPlayed: number
): number => {
  if (matchesPlayed === 0) return 0;

  const { position, stats } = player;
  let rating = 0.5; // Base

  if (position === 'GK') {
    const csRate = cleanSheets / matchesPlayed;
    rating = csRate * 2.5; // Clean sheets são cruciais para goleiros
  } else {
    const goalContribution = (goals + assists * 0.6) / matchesPlayed;

    // Diferentes pesos por posição
    switch(position) {
      case 'ST': case 'CF':
        rating = goalContribution * 1.8;
        break;
      case 'LW': case 'RW':
        rating = goalContribution * 1.6;
        break;
      case 'CAM': case 'CM':
        rating = goalContribution * 1.4;
        break;
      case 'LM': case 'RM':
        rating = goalContribution * 1.3;
        break;
      case 'CDM':
        rating = goalContribution * 1.1;
        break;
      default: // Defensores
        rating = goalContribution * 0.8;
        break;
    }
  }

  // Modificador de overall
  const ovrModifier = (stats.overall - 70) / 100;
  rating *= (1 + ovrModifier);

  // Modificador de forma
  rating *= (1 + (player.form / 10));

  return clamp(rating, 0, 2.0);
};

// ============================================
// 5. EXPORTAÃ‡ÃƒO DO SISTEMA
// ============================================

export const createImprovedGameBalance = () => {
  return createMarginalProgressionSystem();
};

// Centralized balance constants for tuning (safe single-source of truth)
export const balanceConstants = {
  // Logistic curve settings for overall -> multiplier transforms
  midpoint: 71, // harmonizado com harness
  logisticSteepness: 0.13, // harmonizado com harness

  // Position coefficients for assists (per-match base rates)
  positionCoefficientsAssists: {
    ST: 0.11, CF: 0.17, LW: 0.23, RW: 0.23, CAM: 0.35, CM: 0.20,
    CDM: 0.09, LM: 0.24, RM: 0.24, LB: 0.14, RB: 0.14, LWB: 0.19, RWB: 0.19,
    CB: 0.045, GK: 0.018
  },

  // Position coefficients for goals (per-match base rates)
  positionCoefficientsGoals: {
    ST: 0.63, // harmonizado com harness
    CF: 0.58, // antes 0.53
    LW: 0.48, // antes 0.42
    RW: 0.48, // antes 0.42
    CAM: 0.32, CM: 0.20, CDM: 0.11, LM: 0.25, RM: 0.25, LB: 0.09, RB: 0.09, LWB: 0.14, RWB: 0.14, CB: 0.07, GK: 0.008
  },

  // ST special coefficient (used optionally for archetype or override)
  stBase: 0.54,
  stArchetypeCoef: 0.63,

  // Team factor tables (tiers)
  teamFactorAssists: [
    { minRep: 85, mult: 1.15 },
    { minRep: 80, mult: 1.06 },
    { minRep: 75, mult: 1.0 },
    { minRep: 70, mult: 0.85 },
    { minRep: 0, mult: 0.70 }
  ],
  teamFactorGoals: [
    { minRep: 85, mult: 1.08 },
    { minRep: 80, mult: 1.03 },
    { minRep: 75, mult: 1.0 },
    { minRep: 70, mult: 0.88 },
    { minRep: 0, mult: 0.75 }
  ],

  // Team fit penalty thresholds
  teamFit: {
    largeDiff: 12, largePenaltyAssists: 0.80, largePenaltyGoals: 0.80, // penalidade menos severa
    smallDiff: 8, smallPenaltyAssists: 0.93, smallPenaltyGoals: 0.90
  }
};