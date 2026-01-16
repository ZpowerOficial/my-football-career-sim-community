/**
 * Sistema de Logging Centralizado
 * Substitui console.log diretos por logging controlado baseado em ambiente
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private currentLevel: LogLevel;
  private enabledCategories: Set<string>;

  constructor() {
    // Em produÃ§Ã£o, apenas WARN e ERROR
    // Em desenvolvimento, tudo
    this.currentLevel = process.env.NODE_ENV === 'production'
      ? LogLevel.WARN
      : LogLevel.DEBUG;

    // Categorias opcionais para filtrar logs
    this.enabledCategories = new Set([
      'simulation',
      'transfer',
      'progression',
      'match',
      'injury',
      'event'
    ]);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  enableCategory(category: string): void {
    this.enabledCategories.add(category);
  }

  disableCategory(category: string): void {
    this.enabledCategories.delete(category);
  }

  private shouldLog(level: LogLevel, category?: string): boolean {
    if (level < this.currentLevel) return false;
    if (category && !this.enabledCategories.has(category)) return false;
    return true;
  }

  debug(message: string, category?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) return;
    const prefix = category ? `[${category.toUpperCase()}]` : '';
    console.log(`ðŸ” ${prefix} ${message}`, data ? data : '');
  }

  info(message: string, category?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO, category)) return;
    const prefix = category ? `[${category.toUpperCase()}]` : '';
    console.log(`â„¹ï¸  ${prefix} ${message}`, data ? data : '');
  }

  warn(message: string, category?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN, category)) return;
    const prefix = category ? `[${category.toUpperCase()}]` : '';
    console.warn(`âš ï¸  ${prefix} ${message}`, data ? data : '');
  }

  error(message: string, category?: string, error?: any): void {
    if (!this.shouldLog(LogLevel.ERROR, category)) return;
    const prefix = category ? `[${category.toUpperCase()}]` : '';
    console.error(`âŒ ${prefix} ${message}`, error ? error : '');
  }

  // Helpers especÃ­ficos para Ã¡reas do jogo
  simulation(message: string, data?: any): void {
    this.debug(message, 'simulation', data);
  }

  transfer(message: string, data?: any): void {
    this.debug(message, 'transfer', data);
  }

  progression(message: string, data?: any): void {
    this.debug(message, 'progression', data);
  }

  match(message: string, data?: any): void {
    this.debug(message, 'match', data);
  }

  injury(message: string, data?: any): void {
    this.debug(message, 'injury', data);
  }

  event(message: string, data?: any): void {
    this.debug(message, 'event', data);
  }
}

// Singleton instance
export const logger = new Logger();

// Shorthand exports
export const log = logger;
