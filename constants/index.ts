
export * from './general';
export * from './leagues';
export * from './player';
export * from './game';
export * from './functions';

export * from './match';
export * from './award';

import { LEAGUES, YOUTH_LEAGUES } from './leagues';
import { RIVALRIES, AGENTS } from './game';
import { PLAYER_TRAITS, FIRST_NAMES, LAST_NAMES } from './player';
import { NATIONALITIES } from './general';

export const GAME_DATA = {
  LEAGUES,
  YOUTH_LEAGUES,
  RIVALRIES,
  AGENTS,
  PLAYER_TRAITS,
  FIRST_NAMES,
  LAST_NAMES,
  NATIONALITIES,
};