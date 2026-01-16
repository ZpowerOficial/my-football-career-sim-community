import { CareerLog, Player, MediaComment, CommentTone, CommentSource } from '../types';

// Re-export types for backwards compatibility
export type { MediaComment, CommentTone, CommentSource };

/**
 * SEEDED RANDOM - Deterministic pick based on player ID and season
 * This ensures the same comments are shown on every render
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

/**
 * SANITY CHECK: Determine comment tone based on ACTUAL performance stats
 * This is the core fix - ratings < 6.5 should NEVER trigger positive comments
 */
function calculateToneFromStats(
  rating: number,
  goals: number,
  assists: number,
  matches: number,
  position: string
): CommentTone {
  // Rule 1: TOO EARLY - Less than 5 games = always neutral
  if (matches < 5) return 'neutral';
  
  // Rule 2: STRICT RATING THRESHOLDS
  // < 6.5 = negative/neutral (NEVER positive)
  // 6.5-7.0 = neutral
  // > 7.0 = can be positive
  // > 7.5 = likely positive
  
  if (rating < 6.3) return 'negative';
  if (rating < 6.5) return Math.random() < 0.7 ? 'negative' : 'neutral';
  if (rating < 7.0) return 'neutral';
  if (rating < 7.5) return Math.random() < 0.6 ? 'neutral' : 'positive';
  
  // Rating >= 7.5 - can be positive but check goal contribution
  const gpg = goals / Math.max(1, matches);
  const apg = assists / Math.max(1, matches);
  const isAttacker = ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(position);
  const isMidfielder = ['CM', 'CDM', 'LM', 'RM'].includes(position);
  
  // Attackers with 0 goals after 10+ games should not get "masterclass" comments
  if (isAttacker && goals === 0 && matches >= 10) {
    return rating >= 7.5 ? 'neutral' : 'negative';
  }
  
  // Midfielders with 0 assists after 10+ games
  if (isMidfielder && assists === 0 && matches >= 10 && rating < 7.3) {
    return 'neutral';
  }
  
  // High rating with good stats = positive
  if (rating >= 7.5 && (gpg >= 0.3 || apg >= 0.25 || rating >= 8.0)) {
    return 'positive';
  }
  
  return rating >= 7.3 ? 'positive' : 'neutral';
}

function styleLabel(style?: string): string {
  if (!style) return 'role';
  const map: Record<string, string> = {
    'Jovem Talento': 'Emerging Talent',
    'Estrela Emergente': 'Emerging Talent',
    'Atacante Completo': 'Complete Forward',
    'Matador Puro': 'Poacher',
    'Homem de Área': 'Target Man',
    'Falso 9': 'False 9',
    'Extremo Invertido': 'Inverted Winger',
    'Extremo Clássico': 'Traditional Winger',
    'Armador Avançado': 'Advanced Playmaker',
    'Meio-campista Box-to-Box': 'Box-to-Box',
    'Volante Marcador': 'Ball-Winning Midfielder',
    'Regista': 'Regista',
    'Mezzala': 'Mezzala',
    'Lateral Ala': 'Wing-Back',
    'Zagueiro Construtor': 'Ball-Playing Defender',
    'Zagueiro Líbero': 'Sweeper',
    'Varredor': 'Sweeper',
    'Goleiro Líbero': 'Sweeper Keeper',
    'Defensor sem Firula': 'Stopper',
    'Jogador Versátil': 'Versatile Player',
  };
  return map[style] || style;
}

/**
 * DETERMINISTIC Media Comments Generator
 * v0.5.6: Fixed to be statistically accurate and use seeded randomness
 * 
 * KEY FIXES:
 * 1. Uses seeded random based on player ID + season for determinism
 * 2. Strict rating thresholds (< 6.5 = NEVER positive)
 * 3. "Too Early" rule: < 5 games = neutral only
 * 4. Context-aware: attackers with 0 goals don't get "masterclass"
 */
export function generateMediaComments(
  player: Player,
  latest: CareerLog,
  prev?: CareerLog,
  t?: (key: string, params?: Record<string, string | number>) => string,
  seedOverride?: number // Optional seed for testing
): MediaComment[] {
  const s = latest.stats;
  const matches = Math.max(1, s.matchesPlayed);
  const goals = s.goals || 0;
  const assists = s.assists || 0;
  const gpg = goals / matches;
  const apg = assists / matches;
  const r = s.averageRating || 6.5;
  
  // Generate seed from player ID + season for determinism
  const playerId = player.name?.charCodeAt(0) || 0;
  // Season is a string like "2023/2024", extract the first year as number
  const seasonYear = parseInt(latest.season?.split('/')[0] || '2024', 10);
  const seed = seedOverride ?? (playerId * 1000 + seasonYear * 100 + Math.floor(r * 10) + matches);
  
  // Use STRICT tone calculation based on actual stats
  const baseTone = calculateToneFromStats(r, goals, assists, matches, player.position);
  
  const team = latest.team?.name || player.team?.name || 'the club';
  const style = styleLabel(player.playerStyle);
  const narrative = player.mediaNarrative || 'On the Rise';

  // Translation helper (required). If not provided, fall back to returning keys (dev safety).
  const tt = t || ((key: string) => key);

  // Pools (use translation keys with interpolation) - Expanded for variety
  const fanPosKeys = [
    'media.fan.pos.1', 'media.fan.pos.2', 'media.fan.pos.3', 'media.fan.pos.4',
    'media.fan.pos.5', 'media.fan.pos.6', 'media.fan.pos.7', 'media.fan.pos.8',
    'media.fan.pos.9', 'media.fan.pos.10',
  ];
  const fanNeuKeys = [
    'media.fan.neu.1', 'media.fan.neu.2', 'media.fan.neu.3', 'media.fan.neu.4',
    'media.fan.neu.5', 'media.fan.neu.6', 'media.fan.neu.7',
  ];
  const fanNegKeys = [
    'media.fan.neg.1', 'media.fan.neg.2', 'media.fan.neg.3', 'media.fan.neg.4',
    'media.fan.neg.5', 'media.fan.neg.6', 'media.fan.neg.7',
  ];

  const haterShotKeys = [
    'media.hater.shots.1', 'media.hater.shots.2', 'media.hater.shots.3',
    'media.hater.shots.4', 'media.hater.shots.5', 'media.hater.shots.6',
    'media.hater.shots.7',
  ];

  const punditPosKeys = [
    'media.pundit.pos.1', 'media.pundit.pos.2', 'media.pundit.pos.3',
    'media.pundit.pos.4', 'media.pundit.pos.5',
  ];
  const punditNeuKeys = [
    'media.pundit.neu.1', 'media.pundit.neu.2', 'media.pundit.neu.3',
    'media.pundit.neu.4', 'media.pundit.neu.5',
  ];
  const punditNegKeys = [
    'media.pundit.neg.1', 'media.pundit.neg.2', 'media.pundit.neg.3',
    'media.pundit.neg.4', 'media.pundit.neg.5',
  ];


  // Narrative overlays: reuse existing narrative system to guide tone and phrasing
  const narrativeFanOverlays: Record<string, string[]> = {
    Prodigy: [
      tt('media.overlay.fan.Prodigy.1'),
      tt('media.overlay.fan.Prodigy.2'),
    ],
    OnTheRise: [
      tt('media.overlay.fan.OnTheRise.1'),
      tt('media.overlay.fan.OnTheRise.2'),
    ],
    EstablishedStar: [
      tt('media.overlay.fan.EstablishedStar.1', { team }),
      tt('media.overlay.fan.EstablishedStar.2'),
    ],
    UnderPressure: [
      tt('media.overlay.fan.UnderPressure.1'),
      tt('media.overlay.fan.UnderPressure.2'),
    ],
    Journeyman: [
      tt('media.overlay.fan.Journeyman.1'),
      tt('media.overlay.fan.Journeyman.2'),
    ],
    VeteranLeader: [
      tt('media.overlay.fan.VeteranLeader.1'),
      tt('media.overlay.fan.VeteranLeader.2'),
    ],
    ForgottenMan: [
      tt('media.overlay.fan.ForgottenMan.1'),
      tt('media.overlay.fan.ForgottenMan.2'),
    ],
    Flop: [
      tt('media.overlay.fan.Flop.1'),
      tt('media.overlay.fan.Flop.2'),
    ],
    ComebackKid: [
      tt('media.overlay.fan.ComebackKid.1'),
      tt('media.overlay.fan.ComebackKid.2'),
    ],
    CultHero: [
      tt('media.overlay.fan.CultHero.1', { team }),
      tt('media.overlay.fan.CultHero.2'),
    ],
  };

  const narrativePunditOverlays: Record<string, string[]> = {
    Prodigy: [tt('media.overlay.pundit.Prodigy.1')],
    OnTheRise: [tt('media.overlay.pundit.OnTheRise.1')],
    EstablishedStar: [tt('media.overlay.pundit.EstablishedStar.1')],
    UnderPressure: [tt('media.overlay.pundit.UnderPressure.1')],
    Journeyman: [tt('media.overlay.pundit.Journeyman.1')],
    VeteranLeader: [tt('media.overlay.pundit.VeteranLeader.1')],
    ForgottenMan: [tt('media.overlay.pundit.ForgottenMan.1')],
    Flop: [tt('media.overlay.pundit.Flop.1')],
    ComebackKid: [tt('media.overlay.pundit.ComebackKid.1')],
    CultHero: [tt('media.overlay.pundit.CultHero.1')],
  };

  const interpolateParams = {
    team,
    style,
    rating: r.toFixed(2),
    gpg: gpg.toFixed(2),
    apg: apg.toFixed(2),
    goals: s.goals,
    assists: s.assists,
    position: player.position.toLowerCase(),
  } as Record<string, string | number>;

  const tonePool = (tone: CommentTone) => {
    const keys = tone === 'positive' ? fanPosKeys : tone === 'negative' ? fanNegKeys : fanNeuKeys;
    return keys.map(k => tt(k, interpolateParams));
  };
  const punditPool = (tone: CommentTone) => {
    const keys = tone === 'positive' ? punditPosKeys : tone === 'negative' ? punditNegKeys : punditNeuKeys;
    return keys.map(k => tt(k, interpolateParams));
  };

  // Bias tone slightly by narrative - DETERMINISTIC version
  // Uses seeded random to ensure consistency across renders
  let seedCounter = seed;
  const nextSeed = () => ++seedCounter;
  
  const toneBias = (t: CommentTone): CommentTone => {
    // SANITY CHECK: Never allow positive comments for poor performance
    // Rating < 6.5 should NEVER become positive regardless of narrative
    if (r < 6.5 && t === 'neutral') {
      // Don't upgrade to positive for bad performers
      return t;
    }
    
    const positiveNarratives = ['Prodigy', 'On the Rise', 'Established Star', 'Veteran Leader', 'Cult Hero'];
    const negativeNarratives = ['Flop', 'Forgotten Man', 'Under Pressure'];
    
    if (positiveNarratives.includes(narrative)) {
      // Only upgrade if performance justifies it (rating >= 7.0)
      if (t === 'neutral' && r >= 7.0 && seededRandom(nextSeed()) < 0.5) return 'positive';
      if (t === 'negative' && seededRandom(nextSeed()) < 0.35) return 'neutral';
    }
    if (negativeNarratives.includes(narrative)) {
      if (t === 'neutral' && seededRandom(nextSeed()) < 0.5) return 'negative';
      // Don't downgrade truly good performances
      if (t === 'positive' && r < 7.5 && seededRandom(nextSeed()) < 0.35) return 'neutral';
    }
    return t;
  };

  // Normalize narrative key (remove spaces) to match locale keys
  const narrativeKey = (narrative || 'On the Rise').replace(/\s+/g, '') as keyof typeof narrativeFanOverlays;
  const narrativeFan = narrativeFanOverlays[narrativeKey] || [];
  const narrativePundit = narrativePunditOverlays[narrativeKey] || [];

  const comments: MediaComment[] = [];
  
  // ========== SPECIAL CASE: "Too Early" narratives ==========
  // Less than 5 games = only neutral "early days" comments
  if (matches < 5) {
    const earlyDaysKeys = [
      'media.earlyDays.1', 'media.earlyDays.2', 'media.earlyDays.3',
      'media.earlyDays.4', 'media.earlyDays.5'
    ];
    comments.push({ 
      text: tt(seededPick(earlyDaysKeys, nextSeed()), interpolateParams), 
      tone: 'neutral', 
      source: 'pundit' 
    });
    comments.push({ 
      text: tt(seededPick(['media.fan.neu.1', 'media.fan.neu.2', 'media.fan.neu.3'], nextSeed()), interpolateParams), 
      tone: 'neutral', 
      source: 'fan' 
    });
    return comments;
  }
  
  // ========== SPECIAL CASE: Attacker with 0 goals after 10+ games ==========
  const isAttacker = ['ST', 'CF', 'LW', 'RW'].includes(player.position);
  if (isAttacker && goals === 0 && matches >= 10) {
    const goalDroughtKeys = ['media.drought.goals.1', 'media.drought.goals.2', 'media.drought.goals.3'];
    comments.push({ 
      text: tt(seededPick(goalDroughtKeys, nextSeed()), interpolateParams), 
      tone: 'negative', 
      source: 'pundit' 
    });
    comments.push({ 
      text: tt(seededPick(['media.fan.neg.1', 'media.fan.neg.2'], nextSeed()), interpolateParams), 
      tone: 'negative', 
      source: 'fan' 
    });
    return comments;
  }
  
  // ========== SPECIAL CASE: Playmaker with 0 assists after 10+ games ==========
  const isPlaymaker = ['CAM', 'CM', 'LM', 'RM'].includes(player.position);
  if (isPlaymaker && assists === 0 && matches >= 10 && r < 7.0) {
    const assistDroughtKeys = ['media.drought.assists.1', 'media.drought.assists.2'];
    comments.push({ 
      text: tt(seededPick(assistDroughtKeys, nextSeed()), interpolateParams), 
      tone: 'negative', 
      source: 'pundit' 
    });
    comments.push({ 
      text: tt(seededPick(['media.fan.neg.3', 'media.fan.neg.4'], nextSeed()), interpolateParams), 
      tone: 'negative', 
      source: 'fan' 
    });
    return comments;
  }
  
  // ========== NORMAL CASE: Generate based on actual performance ==========
  // Always include one pundit take aligned with performance and narrative
  const firstTone = toneBias(baseTone);
  const firstPool = [...punditPool(firstTone), ...narrativePundit];
  comments.push({ text: seededPick(firstPool, nextSeed()), tone: firstTone, source: 'pundit' });
  
  // Include a fan take aligned with performance and narrative
  const secondTone = toneBias(baseTone);
  const secondPool = [...tonePool(secondTone), ...narrativeFan];
  comments.push({ text: seededPick(secondPool, nextSeed()), tone: secondTone, source: 'fan' });
  
  // Third slot: chance of hater even on great seasons (baseline 20% + followers factor)
  // Using seeded random for determinism
  const followers = player.socialMediaFollowers || 0;
  const haterChance = Math.min(0.20 + Math.log10(Math.max(1, followers)) * 0.05, 0.45);
  const forceHater = seededRandom(nextSeed()) < haterChance;
  
  if (forceHater) {
    const haterPool = haterShotKeys.map(k => tt(k));
    comments.push({ text: seededPick(haterPool, nextSeed()), tone: 'negative', source: 'hater' });
  } else {
    // Another fan or pundit based on base tone
    // SANITY CHECK: Don't upgrade to positive for poor performers
    const shouldUpgrade = r >= 7.0 && baseTone === 'neutral' && seededRandom(nextSeed()) < 0.3;
    const anotherTone: CommentTone = toneBias(shouldUpgrade ? 'positive' : baseTone);
    const chooseFan = seededRandom(nextSeed()) < 0.5;
    const pool = chooseFan
      ? [...tonePool(anotherTone), ...narrativeFan]
      : [...punditPool(anotherTone), ...narrativePundit];
    const source: CommentSource = chooseFan ? 'fan' : 'pundit';
    comments.push({ text: seededPick(pool, nextSeed()), tone: anotherTone, source });
  }

  return comments;
}

// Backward compatibility
export function generateFanComments(player: Player, latest: CareerLog, prev?: CareerLog) {
  return generateMediaComments(player, latest, prev).map(c => ({ text: c.text, tone: c.tone }));
}
