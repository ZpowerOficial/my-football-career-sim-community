import { Player, Injury, CareerEvent, Trait, TraitName, DetailedInjury } from '../types';
import { rand, clamp } from './utils';

const hasTrait = (player: Player, traitName: TraitName) => player.traits.some(t => t.name === traitName);

const getInjuryType = (position: string): string => {
    const injuries: Record<string, string[]> = {
      'ST': ['hamstring injury', 'groin strain', 'ankle sprain', 'knee problem'],
      'CB': ['back injury', 'knee injury', 'muscle tear', 'concussion'],
      'CDM': ['ankle injury', 'hamstring tear', 'calf strain'],
      'GK': ['finger injury', 'shoulder problem', 'knee injury'],
      'LB': ['ankle sprain', 'calf injury', 'knee problem'],
      'RB': ['ankle sprain', 'calf injury', 'knee problem'],
      'CAM': ['hamstring strain', 'groin injury', 'ankle problem'],
      'CM': ['calf strain', 'thigh injury', 'ankle sprain'],
      'LW': ['hamstring injury', 'ankle sprain', 'groin strain'],
      'RW': ['hamstring injury', 'ankle sprain', 'groin strain'],
      'CF': ['knee injury', 'ankle sprain', 'muscle strain'],
      'LM': ['calf injury', 'ankle sprain', 'thigh strain'],
      'RM': ['calf injury', 'ankle sprain', 'thigh strain'],
      'LWB': ['ankle sprain', 'calf strain', 'knee problem'],
      'RWB': ['ankle sprain', 'calf strain', 'knee problem']
    };

    const positionInjuries = injuries[position] || ['muscle injury'];
    return positionInjuries[rand(0, positionInjuries.length - 1)];
  };

  interface InjuryRisk {
    baseRisk: number;
    ageModifier: number;
    workloadModifier: number;
    positionModifier: number;
    styleModifier: number;
    historyModifier: number;
  }

  const calculateInjuryRisk = (player: Player, matchesPlayed: number): InjuryRisk => {

    // ========== BASE RISK ==========
    let baseRisk = 0.08; // 8% base

    if (hasTrait(player, 'Injury Prone')) baseRisk *= 2.5;
    if (hasTrait(player, 'Natural Fitness')) baseRisk *= 0.5;
    if (player.personality === 'Lazy') baseRisk *= 1.3;

    // ========== AGE MODIFIER ==========
    let ageModifier = 1.0;
    if (player.age < 20) ageModifier = 0.9;      // Jovens menos lesões graves
    else if (player.age <= 25) ageModifier = 0.8; // Pico físico
    else if (player.age <= 30) ageModifier = 1.0; // Normal
    else if (player.age <= 33) ageModifier = 1.4; // Aumenta
    else ageModifier = 2.0;                       // Veteranos muito mais

    // ========== WORKLOAD MODIFIER (CRÍTICO) ==========
    const matchesPerWeek = matchesPlayed / 38; // Assume 38 semanas
    let workloadModifier = 1.0;

    if (matchesPerWeek > 2.5) workloadModifier = 2.2;      // Sobrecarga severa
    else if (matchesPerWeek > 2.0) workloadModifier = 1.7;  // Sobrecarga
    else if (matchesPerWeek > 1.5) workloadModifier = 1.3;  // Carga alta
    else if (matchesPerWeek < 0.5) workloadModifier = 0.6;  // Pouco jogo = menos risco

    // ========== POSITION MODIFIER ==========
    const positionRisks: Record<string, number> = {
      'ST': 1.2,  'CF': 1.1,  'LW': 1.0,  'RW': 1.0,
      'CAM': 0.8, 'CM': 1.0,  'CDM': 1.3,
      'LB': 1.4,  'RB': 1.4,  'LWB': 1.5, 'RWB': 1.5,
      'CB': 1.6,  // Defensores mais contato físico
      'GK': 0.7   // Goleiros menos lesões
    };
    const positionModifier = positionRisks[player.position] || 1.0;

    // ========== STYLE MODIFIER ==========
    let styleModifier = 1.0;
    if (player.stats.aggression > 80) styleModifier *= 1.3;
  if (hasTrait(player, 'Slide Tackle')) styleModifier *= 1.4;
    if (player.archetype === 'The Engine') styleModifier *= 1.2; // Trabalha muito

    // ========== HISTORY MODIFIER ==========
    let historyModifier = 1.0;

    // Se teve lesão grave recente
    if (player.injury && player.injury.type === 'Severe') {
      historyModifier = 1.8; // Muito mais risco de relesão
    }

    // Contador de lesões na carreira
    const careerInjuries = player.totalInjuries || 0;
    if (careerInjuries > 5) historyModifier *= 1.3;
    if (careerInjuries > 10) historyModifier *= 1.6;

    return {
      baseRisk,
      ageModifier,
      workloadModifier,
      positionModifier,
      styleModifier,
      historyModifier
    };
  };

  export const processInjurySystem = (player: Player, matchesPlayed: number): {
    injury: Injury | null;
    events: CareerEvent[];
  } => {

    const risk = calculateInjuryRisk(player, matchesPlayed);

    // Calcular risco final
    const finalRisk =
      risk.baseRisk *
      risk.ageModifier *
      risk.workloadModifier *
      risk.positionModifier *
      risk.styleModifier *
      risk.historyModifier;

    const events: CareerEvent[] = [];

    // Log para debugging
    if (finalRisk > 0.25) {
      console.log(`[INJURY RISK] ${player.name}: ${(finalRisk * 100).toFixed(1)}%`);
      console.log(`  Age: ${risk.ageModifier}x | Workload: ${risk.workloadModifier}x | Position: ${risk.positionModifier}x`);
    }

    // Sorteio de lesão
    if (Math.random() < clamp(finalRisk, 0.02, 0.65)) {

  // Tipo de lesão baseado em contexto
      const severityRoll = Math.random();
      let injury: Injury;
  let detailed: DetailedInjury | undefined;

      // Idade aumenta chance de lesões graves
      const severeThreshold = player.age > 32 ? 0.92 : 0.95;

      if (severityRoll > 0.9998) {
        injury = { type: 'Career-Ending', duration: 1 };
        events.push({
          type: 'injury',
          description: 'events.injury.careerEnding'
        });
      } else if (severityRoll > severeThreshold) {
        injury = { type: 'Severe', duration: rand(2, 4) };
        detailed = {
          ...injury,
          category: 'Ligament',
          weeksOut: Math.round(injury.duration * 4),
          recoveryPhases: {
            rehabilitation: Math.max(2, Math.round(injury.duration)),
            matchFitness: Math.max(3, Math.round(injury.duration + 1)),
          },
          recurrenceRisk: 0.25,
          longTermEffect: Math.random() < 0.25 ? { stat: 'stamina', penalty: rand(1, 3) } : undefined
        };
        events.push({
          type: 'injury',
          description: 'events.injury.severe',
          descriptionParams: { type: getInjuryType(player.position), duration: injury.duration }
        });
      } else if (severityRoll > 0.75) {
        injury = { type: 'Moderate', duration: rand(1, 2) };
        detailed = {
          ...injury,
          category: 'Muscle',
          weeksOut: Math.round(injury.duration * 4),
          recoveryPhases: {
            rehabilitation: Math.max(1, Math.round(injury.duration)),
            matchFitness: Math.max(2, Math.round(injury.duration)),
          },
          recurrenceRisk: 0.12
        };
        events.push({
          type: 'injury',
          description: 'events.injury.moderate',
          descriptionParams: { type: getInjuryType(player.position) }
        });
      } else {
        injury = { type: 'Minor', duration: 1 };
        detailed = {
          ...injury,
          category: 'Muscle',
          weeksOut: 2,
          recoveryPhases: {
            rehabilitation: 1,
            matchFitness: 2
          },
          recurrenceRisk: 0.05
        };
        events.push({
          type: 'injury',
          description: 'events.injury.minor',
          descriptionParams: { type: getInjuryType(player.position) }
        });
      }

      // Incrementar contador
      player.totalInjuries = (player.totalInjuries || 0) + 1;
      if (detailed) {
        player.detailedInjury = detailed;
      }

      return { injury, events };
    }

    return { injury: null, events: [] };
  };

  export const processInjuryRecovery = (player: Player): {
    recovered: boolean;
    complications: boolean;
    event?: CareerEvent;
  } => {

    if (!player.injury) return { recovered: true, complications: false };

    // Taxa de recuperação baseada em idade e fitness
    let recoveryRate = 1.0;

    if (hasTrait(player, 'Natural Fitness')) recoveryRate = 1.5;
    if (player.age > 32) recoveryRate = 0.8;
    if (player.stats.fitness < 70) recoveryRate = 0.9;

    player.injury.duration -= recoveryRate;

    // Complicações (raro mas possível)
    let complications = false;
    if (player.injury.type === 'Severe' && Math.random() < 0.08) {
      complications = true;
      player.injury.duration += 1;

      return {
        recovered: false,
        complications: true,
        event: {
          type: 'injury',
          description: 'events.injury.setback'
        }
      };
    }

    // Recuperado?
    if (player.injury.duration <= 0) {
      const wasSerious = player.injury.type === 'Severe';
      // Preserve detailed injury info for post-recovery ramp
      if (player.detailedInjury) {
        // keep matchFitness weeks for ramp effect
        player.detailedInjury.weeksOut = 0; // reset active weeks out
      }
      player.injury = null;

      return {
        recovered: true,
        complications: false,
        event: {
          type: 'milestone',
          description: wasSerious ?
            `Returned from serious injury - relieved to be back.` :
            `Recovered from injury and back to full fitness.`
        }
      };
    }

    return { recovered: false, complications: false };
  };