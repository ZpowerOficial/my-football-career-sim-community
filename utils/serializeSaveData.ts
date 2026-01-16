// Serialização profunda e permissiva: remove todos os ciclos, mas salva tudo que for possível
export function serializeSaveData(data) {
  const seen = new WeakSet();
  function replacer(key, value) {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    // Converte Map para objeto simples
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    // Converte Set para array
    if (value instanceof Set) {
      return Array.from(value);
    }
    // Converte Date para string ISO
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }
  // Serializa para string e volta para objeto limpo
  const clean = JSON.parse(JSON.stringify(data, replacer));

  // Garantir que expandedData é salvo completamente
  if (data.player && data.player.expandedData && typeof data.player.expandedData === 'object') {
    clean.player.expandedData = JSON.parse(JSON.stringify(data.player.expandedData));
  }
  return clean;
}
