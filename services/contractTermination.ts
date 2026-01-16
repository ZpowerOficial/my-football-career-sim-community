import { Player, Team, Offer } from "../types";
import { getTransferOffers } from "./transferLogic";

/**
 * Status de rescisão de contrato do jogador
 */
export interface ContractTerminationStatus {
  isFreeAgent: boolean;
  terminationDate?: Date;
  penaltyPaid: number; // Multa paga em €
  reputationLoss: number; // Perda de reputação (0-20)
  cooldownMonths: number; // Meses até poder assinar com novo clube
  formerClub?: Team;
  event?: { type: string; description: string };
}

/**
 * Calcula a multa de rescisão baseada no contrato do jogador
 */
export const calculateTerminationPenalty = (player: Player): number => {
  // REMOVIDO a pedido do usuário: sem multa financeira
  return 0;
};

/**
 * Calcula a perda de reputação por rescindir contrato
 */
export const calculateReputationLoss = (player: Player): number => {
  // REMOVIDO a pedido do usuário: sem perda de reputação
  return 0;
};

/**
 * Calcula o período de cooldown (em meses) antes de poder assinar com novo clube
 */
export const calculateCooldownPeriod = (player: Player): number => {
  // REMOVIDO a pedido do usuário: sem cooldown
  return 0;
};

/**
 * Executa a rescisão de contrato do jogador
 */
export const terminateContract = (
  player: Player,
  currentDate: Date = new Date(),
): ContractTerminationStatus => {
  // Calcular penalidades (agora zeradas)
  const penaltyPaid = calculateTerminationPenalty(player);
  const reputationLoss = calculateReputationLoss(player);
  const cooldownMonths = calculateCooldownPeriod(player);

  // Guardar clube anterior
  const formerClub = { ...player.team };

  // Reduzir reputação do jogador (apenas ajuste mínimo se necessário, mas zerado conforme pedido)
  // player.reputation = Math.max(player.reputation - reputationLoss, 40);

  // Reduzir aprovação do clube (ainda faz sentido pois saiu forçado, mas opcional)
  if (player.clubApproval !== undefined) {
    player.clubApproval = Math.max(player.clubApproval - 30, 0);
  }

  // Integrar com sistema de eventos de carreira
  // Adiciona um evento especial para marcar a rescisão
  const terminationEvent = {
    type: "contract_termination",
    description: `Terminated contract with ${player.team.name}.`,
  };

  // Retornar status de rescisão com o evento
  return {
    isFreeAgent: true,
    terminationDate: currentDate,
    penaltyPaid,
    reputationLoss,
    cooldownMonths,
    formerClub,
    event: terminationEvent,
  };
};

/**
 * Verifica se o jogador pode rescindir o contrato
 * (pode haver regras adicionais no futuro)
 */
export const canTerminateContract = (player: Player): boolean => {
  // Não pode rescindir se já estiver sem clube
  if (!player.team) {
    return false;
  }

  // Não pode rescindir se estiver emprestado
  if (player.parentClub) {
    return false;
  }

  // Não pode rescindir se não tiver contrato (edge case)
  if (player.contractLength <= 0) {
    return false;
  }

  // Jogadores muito jovens (< 18) não podem rescindir sem permissão
  if (player.age < 18) {
    return false;
  }

  return true;
};
