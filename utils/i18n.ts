export const slugifyCountryKey = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z]/g, '');
};

export const translateCountry = (t: (k: string) => string, name?: string): string => {
  if (!name) return '';
  const key = slugifyCountryKey(name);
  const translated = t(`country.${key}`);
  return translated === `country.${key}` ? name : translated;
};

export const translateNationality = (t: (k: string) => string, name?: string): string => {
  if (!name) return '';
  // First try nationality map, then fall back to country map
  const key = slugifyCountryKey(name);
  const nat = t(`nationality.${key}`);
  if (nat !== `nationality.${key}`) return nat;
  return translateCountry(t, name);
};

// Simple pluralization helper for "vez/vezes" and similar patterns
// Usage: i18nTimes(t, count, 'commonExtra.times') where the string supports ICU plural
export const i18nTimes = (
  t: (k: string, p?: any) => string,
  count: number
): string => {
  // Prefer explicit singular/plural keys
  if (count === 1) {
    const one = t('commonExtra.timeOne', { count });
    if (one && one !== 'commonExtra.timeOne') return one;
  } else {
    const many = t('commonExtra.timeMany', { count });
    if (many && many !== 'commonExtra.timeMany') return many;
  }
  // Fallback to old key if exists (will just interpolate {count})
  const legacy = t('commonExtra.times', { count });
  if (legacy && legacy !== 'commonExtra.times') return legacy.replace('{count}', String(count));
  // Final fallback English
  return `${count} ${count === 1 ? 'time' : 'times'}`;
};
