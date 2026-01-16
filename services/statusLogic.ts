import { Player, SquadStatus } from '../types';
import { determinePositionBasedSquadStatus } from './positionStatusLogic';

/**
 * Determina o squad status do jogador
 * Agora usa o sistema baseado em posição por padrão
 */
export const determineSquadStatus = (player: Player, teamPlayers?: Player[]): SquadStatus => {
    // Usa o novo sistema baseado em posição
    return determinePositionBasedSquadStatus(player, teamPlayers);
};
