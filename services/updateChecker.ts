/**
 * UPDATE CHECKER SERVICE - v0.5.6
 * 
 * Verifica se há atualizações disponíveis na Play Store.
 * Mostra um aviso amigável (não bloqueia o jogo).
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Configuração
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
const STORAGE_KEY = 'lastUpdateCheck';
const DISMISSED_VERSION_KEY = 'dismissedUpdateVersion';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateUrl: string;
  releaseNotes?: string;
  isRequired?: boolean; // Para atualizações críticas (raramente usado)
}

/**
 * Obtém a versão atual do app
 */
export async function getCurrentVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return info.version;
    } catch {
      return '0.5.6'; // Fallback
    }
  }
  // Web - usar versão do package.json
  return '0.5.6';
}

/**
 * Compara duas versões semânticas
 * Retorna: 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Verifica se deve checar atualizações (respeitando o intervalo)
 */
function shouldCheckForUpdates(): boolean {
  try {
    const lastCheck = localStorage.getItem(STORAGE_KEY);
    if (!lastCheck) return true;

    const lastCheckTime = parseInt(lastCheck, 10);
    return Date.now() - lastCheckTime > UPDATE_CHECK_INTERVAL;
  } catch {
    return true;
  }
}

/**
 * Verifica se o usuário já dispensou esta versão
 */
function wasVersionDismissed(version: string): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Marca que o usuário dispensou o aviso para esta versão
 */
export function dismissUpdateForVersion(version: string): void {
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    // Ignora erros de storage
  }
}

/**
 * Busca informações de atualização do servidor
 * Usa o endpoint /api/version do Vercel
 */
async function fetchLatestVersionInfo(): Promise<{ version: string; releaseNotes?: string; isRequired?: boolean } | null> {
  try {
    // Endpoint do Vercel - busca versão direto da Play Store
    const response = await fetch('https://v0-new-project-ouar0iudp51.vercel.app/api/version', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn('[UpdateChecker] API returned status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[UpdateChecker] Version from server:', data.version, '(source:', data.source, ')');

    // Se não conseguiu buscar a versão da Play Store, não mostra aviso
    if (!data.version) {
      console.warn('[UpdateChecker] Server could not fetch version from Play Store');
      return null;
    }

    return {
      version: data.version,
      releaseNotes: data.releaseNotes,
      isRequired: data.isRequired,
    };
  } catch (error) {
    console.warn('[UpdateChecker] Failed to fetch version info:', error);
    return null;
  }
}

/**
 * Verifica se há atualizações disponíveis
 */
export async function checkForUpdates(force = false): Promise<UpdateInfo | null> {
  // Só checa em plataforma nativa (Android/iOS)
  if (!Capacitor.isNativePlatform() && !force) {
    return null;
  }

  // Respeita o intervalo de checagem
  if (!force && !shouldCheckForUpdates()) {
    return null;
  }

  try {
    // Marca que checamos agora
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    const currentVersion = await getCurrentVersion();
    const latestInfo = await fetchLatestVersionInfo();

    if (!latestInfo) {
      return null;
    }

    const hasUpdate = compareVersions(latestInfo.version, currentVersion) > 0;

    // Se já dispensou esta versão, não mostra de novo
    if (hasUpdate && wasVersionDismissed(latestInfo.version)) {
      return null;
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestInfo.version,
      updateUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.footballcareersim',
      releaseNotes: latestInfo.releaseNotes,
      isRequired: latestInfo.isRequired,
    };
  } catch (error) {
    console.warn('[UpdateChecker] Check failed:', error);
    return null;
  }
}

/**
 * Abre a página do app na Play Store
 */
export async function openPlayStore(): Promise<void> {
  // Package ID real do app
  const packageId = 'com.zpower.careersim';
  const updateUrl = `https://play.google.com/store/apps/details?id=${packageId}`;

  // Abrir no navegador (funciona tanto na web quanto no Capacitor)
  window.open(updateUrl, '_blank');
}
