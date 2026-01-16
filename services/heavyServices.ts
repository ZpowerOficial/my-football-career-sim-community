/**
 * Heavy Game Services Module
 * 
 * This module contains all game logic services that depend on LEAGUES data.
 * It's designed to be dynamically imported to reduce initial bundle size.
 * 
 * Usage:
 *   const services = await import('./services/heavyServices');
 *   const player = services.createPlayer(...);
 */

// Re-export all heavy services that depend on LEAGUES
export { createPlayer } from './playerCreation';
export { simulateSeason } from './simulation';
export { processTransfer, processContractRenewal } from './transferLogic';
export { generateImprovedOffers } from './improvedTransferSystem';
export { migrateGoalkeeper } from './goalkeeperMigration';
export { migratePlayerStats } from './playerStatsMigration';

// Re-export LEAGUES if needed
export { LEAGUES } from '../constants';
