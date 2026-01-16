/**
 * Dynamic Competition Name Generator
 * 
 * Generates league and cup names dynamically based on country and tier.
 * This allows adding new countries without creating specific translations.
 */

// Type for translation function matching project's i18n implementation
type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

/**
 * Gets the league name for a given country and tier
 * 
 * @param t - Translation function
 * @param country - Country name (in English)
 * @param tier - League tier (1, 2, 3, etc.) - tier 5 or higher = Youth
 * @param isYouth - Optional flag to force youth league display
 * @returns Translated league name (e.g., "Liga 1 do Brasil", "England League 1", "Brasil Juvenil")
 * 
 * @example
 * getLeagueName(t, "Brazil", 1) // PT: "Liga 1 do Brasil"
 * getLeagueName(t, "England", 2) // PT: "Liga 2 da Inglaterra"
 * getLeagueName(t, "Brazil", 5) // PT: "Brasil Juvenil"
 */
export function getLeagueName(
  t: TranslateFunction,
  country: string,
  tier: number,
  isYouth?: boolean
): string {
  // Proteção extra: se country for undefined, retorna string padrão
  if (!country) return t('competition.unknownLeague', { defaultValue: 'Liga Desconhecida' });
  
  // Get translated country name
  const countryKey = `countries.${country.replace(/\s+/g, '')}`;
  const translatedCountry = t(countryKey, { defaultValue: country });
  
  // Youth leagues (tier >= 5 or explicit isYouth flag)
  if (isYouth || tier >= 5) {
    const youthFormat = t('competition.youthLeagueFormat', { 
      defaultValue: '{{country}} Youth' 
    });
    return youthFormat.replace('{{country}}', translatedCountry as string);
  }
  
  // Get the league format string
  const format = t('competition.leagueFormat', { 
    defaultValue: '{{country}} League {{tier}}' 
  });
  
  return format
    .replace('{{country}}', translatedCountry as string)
    .replace('{{tier}}', tier.toString());
}

/**
 * Gets the domestic cup name for a given country
 * 
 * @param t - Translation function
 * @param country - Country name (in English)
 * @returns Translated cup name (e.g., "Copa do Brasil", "Italy Cup")
 * 
 * @example
 * getDomesticCupName(t, "Brazil") // PT: "Copa do Brasil"
 * getDomesticCupName(t, "Italy") // PT: "Copa da Itália"
 */
export function getDomesticCupName(
  t: TranslateFunction,
  country: string
): string {
  // Get translated country name
  const countryKey = `countries.${country.replace(/\s+/g, '')}`;
  const translatedCountry = t(countryKey, { defaultValue: country });
  
  // Get the cup format string
  const format = t('competition.cupFormat', { 
    defaultValue: '{{country}} Cup' 
  });
  
  return format.replace('{{country}}', translatedCountry as string);
}

/**
 * Gets the super cup name for a given country
 * 
 * @param t - Translation function
 * @param country - Country name (in English)
 * @returns Translated super cup name
 */
export function getSuperCupName(
  t: TranslateFunction,
  country: string
): string {
  const countryKey = `countries.${country.replace(/\s+/g, '')}`;
  const translatedCountry = t(countryKey, { defaultValue: country });
  
  const format = t('competition.superCupFormat', { 
    defaultValue: '{{country}} Super Cup' 
  });
  
  return format.replace('{{country}}', translatedCountry as string);
}

/**
 * Gets a formatted competition description
 * 
 * @param t - Translation function
 * @param competitionType - Type: 'league', 'cup', 'continental', 'international'
 * @param country - Country name (in English)
 * @param tier - Optional tier for leagues
 * @returns Formatted competition name
 */
export function getCompetitionName(
  t: TranslateFunction,
  competitionType: 'league' | 'cup' | 'superCup' | 'continental' | 'international',
  country: string,
  tier?: number
): string {
  switch (competitionType) {
    case 'league':
      return getLeagueName(t, country, tier || 1);
    case 'cup':
      return getDomesticCupName(t, country);
    case 'superCup':
      return getSuperCupName(t, country);
    case 'continental':
      return t('competition.continental', { defaultValue: 'Continental Cup' }) as string;
    case 'international':
      return t('competition.international', { defaultValue: 'International' }) as string;
    default:
      return competitionType;
  }
}
