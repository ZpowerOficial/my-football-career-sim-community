// ============================================
// OTIMIZAÃ‡Ã•ES CRÃTICAS PARA MOBILE/ANDROID
// ============================================

// ============================================
// 1. SISTEMA DE PERSISTÃŠNCIA MELHORADO
// ============================================

interface SaveData {
  player: any;
  careerHistory: any[];
  worldTeams: any[];
  tactic: any;
  lastSaved: number;
  version: string;
}

class GameStorage {
  private static SAVE_KEY = 'footballCareer_save';
  private static AUTOSAVE_KEY = 'footballCareer_autosave';
  private static VERSION = '2.0.0';

  // Salvar jogo (com compressÃ£o para mobile)
  static saveGame(data: Partial<SaveData>): boolean {
    try {
      const saveData: SaveData = {
        ...data as SaveData,
        lastSaved: Date.now(),
        version: this.VERSION
      };

      // Serializar e comprimir
      const serialized = JSON.stringify(saveData);

      // Salvar principal
      localStorage.setItem(this.SAVE_KEY, serialized);

      // Salvar backup
      localStorage.setItem(this.AUTOSAVE_KEY, serialized);

      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  // Carregar jogo
  static loadGame(): SaveData | null {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (!saved) return null;

      const data: SaveData = JSON.parse(saved);

      // Verificar versÃ£o
      if (data.version !== this.VERSION) {
        console.warn('Save file version mismatch');
        // Aqui vocÃª pode fazer migraÃ§Ã£o de dados se necessÃ¡rio
      }

      return data;
    } catch (error) {
      console.error('Failed to load game:', error);

      // Tentar carregar backup
      try {
        const backup = localStorage.getItem(this.AUTOSAVE_KEY);
        if (backup) {
          return JSON.parse(backup);
        }
      } catch (backupError) {
        console.error('Failed to load backup:', backupError);
      }

      return null;
    }
  }

  // Deletar save
  static deleteSave(): void {
    localStorage.removeItem(this.SAVE_KEY);
    localStorage.removeItem(this.AUTOSAVE_KEY);
  }

  // Verificar se existe save
  static hasSave(): boolean {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }
}

// ============================================
// EXPORTS
// ============================================

export { GameStorage };
