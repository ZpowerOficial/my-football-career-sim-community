import React, { useState, useMemo, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player, PositionDetail } from "../types";
import type {
  TrainingFocus,
  TrainingType,
  PersonalTrainer,
  TrainerTier,
} from "../types/trainingTypes";
import { calculateMaxTrainingSlots } from "../types/trainingTypes";
import {
  calculateTrainingCost,
  canAffordTraining,
  calculateTrainingEffectiveness,
  getClubInfrastructure,
  calculateInfrastructureBonus,
  executeTrainingSession,
  applyTrainingResult,
  getAllTrainingTypes,
  getAllTrainers,
  getTrainer,
} from "../services/trainingService";
import { Icon, type IconName } from "./ui/Icon";
import { InfrastructureStars } from "./ui/StarRating";

/**
 * Retorna todas as posições elegíveis do jogador para filtrar treinos.
 * Inclui posição principal + posições secundárias com proficiência >= 50%
 */
const getEligiblePositions = (player: Player): PositionDetail[] => {
  const positions: PositionDetail[] = [player.position];

  // Adiciona posições secundárias com proficiência >= 50%
  const secondaryPositions =
    player.expandedData?.physicalProfile?.secondaryPositions || [];
  for (const sp of secondaryPositions) {
    if (sp.proficiency >= 50 && !positions.includes(sp.position)) {
      positions.push(sp.position);
    }
  }

  return positions;
};

interface TrainingModalProps {
  isOpen: boolean;
  player: Player;
  currentSeason: number;
  onClose: () => void;
  onTrainingComplete: (updatedPlayer: Player, narrativeKey: string) => void;
  onSkipTraining: () => void;
  viewOnly?: boolean; // Para modo dinâmico - apenas visualização
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  isOpen,
  player,
  currentSeason,
  onClose,
  onTrainingComplete,
  onSkipTraining,
  viewOnly = false,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);
  // v0.5.9: Estados de seleção
  const [selectedTrainings, setSelectedTrainings] = useState<TrainingFocus[]>(
    [],
  );
  const [selectedIntensity, setSelectedIntensity] = useState<
    "low" | "medium" | "high" | "extreme"
  >("medium");
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerTier | null>(
    null,
  );
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{
    changes: Record<string, number>;
    narrativeKey: string;
    type: "excellent" | "good" | "neutral" | "poor";
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"training" | "trainer" | "info">(
    "training",
  );

  // v0.5.9: Sincronizar estados com dados do player quando modal abre (modo dinâmico)
  React.useEffect(() => {
    if (isOpen && viewOnly) {
      // Sincronizar treinos selecionados
      if (
        player.activeTrainingFocuses &&
        player.activeTrainingFocuses.length > 0
      ) {
        setSelectedTrainings(player.activeTrainingFocuses);
      } else if (player.activeTrainingFocus) {
        setSelectedTrainings([player.activeTrainingFocus]);
      }
      // Sincronizar intensidade
      if (player.activeTrainingIntensity) {
        setSelectedIntensity(player.activeTrainingIntensity);
      }
      // Sincronizar trainer
      if (player.activeTrainerTier) {
        setSelectedTrainer(player.activeTrainerTier);
      }
    }
  }, [
    isOpen,
    viewOnly,
    player.activeTrainingFocuses,
    player.activeTrainingFocus,
    player.activeTrainingIntensity,
    player.activeTrainerTier,
  ]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowResult(false);
      setResultData(null);
      onClose();
    }, 200);
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } =
    useSwipeToClose({
      onClose: handleClose,
      threshold: 80,
    });

  // Dados calculados
  // Posições elegíveis do jogador (principal + secundárias com proficiência >= 50%)
  const eligiblePositions = useMemo(
    () => getEligiblePositions(player),
    [player],
  );

  // Filtra treinos disponíveis pelas posições do jogador
  const trainingTypes = useMemo(() => {
    const allTypes = getAllTrainingTypes();
    return allTypes.filter((t) => {
      // Se não tem forPositions, disponível para todos
      if (!t.forPositions || t.forPositions.length === 0) return true;
      // Verifica se ALGUMA posição elegível do jogador está na lista do treino
      return t.forPositions.some((pos) => eligiblePositions.includes(pos));
    });
  }, [eligiblePositions]);

  const trainers = useMemo(() => getAllTrainers(), []);
  const infrastructure = useMemo(() => getClubInfrastructure(player), [player]);
  const infraBonus = useMemo(
    () => calculateInfrastructureBonus(infrastructure),
    [infrastructure],
  );
  const balance = player.bankBalance || 0;

  // v0.5.8: Máximo de slots de treino baseado em infraestrutura + preparador
  const maxSlots = useMemo(
    () =>
      calculateMaxTrainingSlots(
        infrastructure.trainingFacilities,
        selectedTrainer,
      ),
    [infrastructure.trainingFacilities, selectedTrainer],
  );

  // Na primeira temporada profissional, o clube cobre o treinamento básico (sem personal trainer)
  const isFirstProSeason = currentSeason === 1;
  const clubCoversTraining = useMemo(
    () => isFirstProSeason,
    [isFirstProSeason],
  );

  // Tipos de treino selecionados (array)
  const selectedTypes = useMemo(
    () =>
      selectedTrainings
        .map((id) => trainingTypes.find((t) => t.id === id)!)
        .filter(Boolean),
    [trainingTypes, selectedTrainings],
  );

  const trainer = useMemo(
    () => (selectedTrainer ? getTrainer(selectedTrainer) : null),
    [selectedTrainer],
  );

  // Custo total = soma de todos os treinos selecionados
  const rawCost = useMemo(() => {
    if (selectedTypes.length === 0) return 0;
    return selectedTypes.reduce(
      (total, type) =>
        total + calculateTrainingCost(player, type, selectedIntensity, trainer),
      0,
    );
  }, [player, selectedTypes, selectedIntensity, trainer]);

  const cost = useMemo(
    () => (clubCoversTraining ? 0 : rawCost),
    [clubCoversTraining, rawCost],
  );

  const canAfford = useMemo(
    () => clubCoversTraining || canAffordTraining(player, cost),
    [player, cost, clubCoversTraining],
  );

  // Efetividade média dos treinos selecionados
  const effectiveness = useMemo(() => {
    if (selectedTypes.length === 0) return 1.0;
    const totalEff = selectedTypes.reduce(
      (sum, type) =>
        sum +
        calculateTrainingEffectiveness(
          player,
          type,
          selectedIntensity,
          trainer,
        ),
      0,
    );
    return totalEff / selectedTypes.length;
  }, [player, selectedTypes, selectedIntensity, trainer]);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  const handleSaveConfiguration = () => {
    if (viewOnly || selectedTypes.length === 0) return;

    // Apenas salvar a configuração do treino - NÃO executar imediatamente
    // O treino será processado semanalmente pelo sistema de simulação
    const updatedPlayer = {
      ...player,
      activeTrainingFocuses: selectedTrainings,
      activeTrainingIntensity: selectedIntensity,
      activeTrainerTier: selectedTrainer || undefined,
    };

    // Retornar o jogador com a configuração salva
    onTrainingComplete(updatedPlayer, "training.configurationSaved");
    handleClose();
  };

  const handleSkip = () => {
    onSkipTraining();
    handleClose();
  };

  if (!isOpen) return null;

  const intensityColors = {
    low: "bg-green-500/20 border-green-500 text-green-400",
    medium: "bg-yellow-500/20 border-yellow-500 text-yellow-400",
    high: "bg-orange-500/20 border-orange-500 text-orange-400",
    extreme: "bg-red-500/20 border-red-500 text-red-400",
  };

  const resultColors = {
    excellent: "from-yellow-500 to-amber-600",
    good: "from-green-500 to-emerald-600",
    neutral: "from-blue-500 to-cyan-600",
    poor: "from-red-500 to-rose-600",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl backdrop-blur-md modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          opacity:
            dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 200) : undefined,
        }}
      >
        {/* Swipe indicator */}
        <div className="swipe-indicator shrink-0" />

        {showResult && resultData ? (
          // Tela de Resultado
          <div className="p-6 text-center overflow-y-auto">
            <div
              className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${resultColors[resultData.type]} flex items-center justify-center mb-4 animate-pulse`}
            >
              <Icon
                name={
                  resultData.type === "excellent"
                    ? "Star"
                    : resultData.type === "good"
                      ? "ArrowUp"
                      : resultData.type === "neutral"
                        ? "Equal"
                        : "ArrowDown"
                }
                size={30}
                className="text-white"
                variant={resultData.type === "excellent" ? "solid" : "outline"}
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-3">
              {t(resultData.narrativeKey)}
            </h3>

            {/* Mudanças de Atributos */}
            <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(resultData.changes).map(([stat, change]) => (
                  <div
                    key={stat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-400 capitalize">
                      {t(`attributes.${stat}`)}
                    </span>
                    <span
                      className={
                        change > 0
                          ? "text-green-400"
                          : change < 0
                            ? "text-red-400"
                            : "text-slate-400"
                      }
                    >
                      {change > 0 ? "+" : ""}
                      {change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Tela de Configuração
          <>
            {/* Header com Tabs */}
            <div className="border-b border-slate-700/50 shrink-0">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Icon name="Dumbbell" size={14} className="text-purple-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {t("training.title")}
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-2 pb-2 gap-1">
                {(["training", "trainer", "info"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === tab
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon
                      name={
                        tab === "training"
                          ? "PersonStanding"
                          : tab === "trainer"
                            ? "UserCog"
                            : "Info"
                      }
                      size={12}
                    />
                    {t(`training.tab.${tab}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* v0.5.9: Banner de Treino Ativo no Modo Dinâmico - mostra todos os treinos */}
            {viewOnly &&
              (player.activeTrainingFocuses?.length ||
                player.activeTrainingFocus) && (
                <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-lg shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                      <Icon name="Bot" size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-purple-300 uppercase tracking-wider font-semibold">
                        Treino da IA (Modo Dinâmico)
                      </p>
                      <p className="text-sm text-white font-bold">
                        {(player.activeTrainingFocuses?.length
                          ? player.activeTrainingFocuses
                          : [player.activeTrainingFocus]
                        )
                          .map((focus) => t(`training.types.${focus}`))
                          .join(", ")}
                      </p>
                      {player.activeTrainingIntensity && (
                        <p className="text-xs text-slate-400">
                          {t(
                            `training.intensity.${player.activeTrainingIntensity}`,
                          )}
                          {player.activeTrainerTier &&
                            ` • ${t(`training.trainer.${player.activeTrainerTier}`)}`}
                        </p>
                      )}
                    </div>
                    <Icon
                      name="CircleCheck"
                      size={18}
                      className="text-green-400"
                    />
                  </div>
                </div>
              )}

            {/* Content baseado na Tab */}
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {activeTab === "training" && (
                <div className="space-y-4">
                  {/* Tipos de Treino */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-slate-400 uppercase tracking-wider">
                        {t("training.selectType")}
                      </label>
                      <span className="text-xs text-purple-400">
                        {selectedTrainings.length}/{maxSlots}{" "}
                        {t("training.slots")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {trainingTypes
                        .filter((t) => t.id !== "position")
                        .map((type) => {
                          const isSelected = selectedTrainings.includes(
                            type.id,
                          );
                          const canSelect =
                            isSelected || selectedTrainings.length < maxSlots;
                          const isDisabled =
                            (type.minAge && player.age < type.minAge) ||
                            (type.maxAge && player.age > type.maxAge) ||
                            (!canSelect && !isSelected);

                          const handleToggle = () => {
                            if (viewOnly || isDisabled) return;
                            if (isSelected) {
                              setSelectedTrainings((prev) =>
                                prev.filter((id) => id !== type.id),
                              );
                            } else if (canSelect) {
                              setSelectedTrainings((prev) => [
                                ...prev,
                                type.id,
                              ]);
                            }
                          };

                          return (
                            <button
                              key={type.id}
                              onClick={handleToggle}
                              disabled={isDisabled}
                              className={`p-3 rounded-lg text-left transition-all relative ${
                                isSelected
                                  ? "bg-purple-500/20 border-2 border-purple-500"
                                  : "bg-slate-800/50 border border-slate-700 hover:border-slate-600"
                              } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""} ${viewOnly ? "cursor-default" : ""}`}
                            >
                              {/* Checkmark para selecionados */}
                              {isSelected && (
                                <span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                  <Icon name="Check" size={10} />
                                </span>
                              )}
                              {/* Badge Grátis para treino do clube */}
                              {type.id === "clubTraining" && !isSelected && (
                                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {t("common.free")}
                                </span>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <Icon
                                  name={type.icon as IconName}
                                  size={14}
                                  className={
                                    type.id === "clubTraining"
                                      ? "text-emerald-400"
                                      : "text-purple-400"
                                  }
                                />
                                <span className="text-sm font-medium text-white">
                                  {t(type.nameKey)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {t(type.descriptionKey)}
                              </p>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Intensidade */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                      {t("training.selectIntensity")}
                    </label>
                    <div className="flex gap-2">
                      {(["low", "medium", "high", "extreme"] as const).map(
                        (level) => (
                          <button
                            key={level}
                            onClick={() =>
                              !viewOnly && setSelectedIntensity(level)
                            }
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                              selectedIntensity === level
                                ? intensityColors[level]
                                : "bg-slate-800/50 border-slate-700 text-slate-400"
                            } ${viewOnly ? "cursor-default" : ""}`}
                          >
                            {t(`training.intensity.${level}`)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "trainer" && (
                <div className="space-y-3">
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                    {t("training.selectTrainer")}
                  </label>

                  {/* Opção sem trainer */}
                  <button
                    onClick={() => !viewOnly && setSelectedTrainer(null)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedTrainer === null
                        ? "bg-slate-600/30 border-2 border-slate-500"
                        : "bg-slate-800/50 border border-slate-700"
                    } ${viewOnly ? "cursor-default" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <Icon
                            name="UserX"
                            size={14}
                            className="text-slate-400"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {t("training.noTrainer")}
                          </div>
                          <div className="text-xs text-slate-400">
                            {t("training.noTrainerDesc")}
                          </div>
                        </div>
                      </div>
                      <span className="text-green-400 text-sm font-bold">
                        {t("common.free")}
                      </span>
                    </div>
                  </button>

                  {/* Lista de trainers */}
                  {trainers.map((trainerOption) => {
                    // Usar duração média de 4 semanas para cálculo base
                    const avgDuration = 4;
                    const weekCost = trainerOption.costPerWeek * avgDuration;
                    const affordable = balance >= weekCost;

                    return (
                      <button
                        key={trainerOption.tier}
                        onClick={() =>
                          !viewOnly &&
                          affordable &&
                          setSelectedTrainer(trainerOption.tier)
                        }
                        disabled={!affordable}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedTrainer === trainerOption.tier
                            ? "bg-purple-500/20 border-2 border-purple-500"
                            : affordable
                              ? "bg-slate-800/50 border border-slate-700 hover:border-slate-600"
                              : "bg-slate-800/30 border border-slate-800 opacity-50"
                        } ${viewOnly ? "cursor-default" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                trainerOption.tier === "worldClass"
                                  ? "bg-yellow-500/20"
                                  : trainerOption.tier === "elite"
                                    ? "bg-purple-500/20"
                                    : trainerOption.tier === "premium"
                                      ? "bg-blue-500/20"
                                      : "bg-slate-700"
                              }`}
                            >
                              <Icon
                                name="UserCog"
                                size={14}
                                className={
                                  trainerOption.tier === "worldClass"
                                    ? "text-yellow-400"
                                    : trainerOption.tier === "elite"
                                      ? "text-purple-400"
                                      : trainerOption.tier === "premium"
                                        ? "text-blue-400"
                                        : "text-slate-400"
                                }
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {t(trainerOption.nameKey)}
                              </div>
                              <div className="text-xs text-slate-400">
                                +
                                {Math.round(
                                  trainerOption.effectivenessBonus * 100,
                                )}
                                % {t("training.effectiveness")}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-bold ${affordable ? "text-amber-400" : "text-red-400"}`}
                          >
                            {formatCurrency(weekCost)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "info" && (
                <div className="space-y-4">
                  {/* Infraestrutura do Clube */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Icon
                        name="Building"
                        size={14}
                        className="text-blue-400"
                      />
                      {t("training.infrastructure")}
                    </h4>
                    <div className="space-y-2">
                      {[
                        {
                          key: "trainingFacilities",
                          icon: "Dumbbell" as IconName,
                          label: t("training.infra.training"),
                        },
                        {
                          key: "medicalDepartment",
                          icon: "Cross" as IconName,
                          label: t("training.infra.medical"),
                        },
                        {
                          key: "nutritionCenter",
                          icon: "UtensilsCrossed" as IconName,
                          label: t("training.infra.nutrition"),
                        },
                        {
                          key: "recoveryCenter",
                          icon: "Sparkles" as IconName,
                          label: t("training.infra.recovery"),
                        },
                      ].map(({ key, icon, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Icon
                              name={icon}
                              size={14}
                              className="text-slate-500"
                            />
                            {label}
                          </div>
                          <InfrastructureStars
                            value={
                              infrastructure[key as keyof typeof infrastructure]
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          {t("training.infraBonus")}
                        </span>
                        <span className="text-green-400 font-bold">
                          +{Math.round(infraBonus * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fatores de Efetividade */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Icon
                        name="TrendingUp"
                        size={14}
                        className="text-green-400"
                      />
                      {t("training.effectivenessFactors")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          {t("training.factor.age")}
                        </span>
                        <span className="text-slate-300">
                          {player.age} {t("common.years")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          {t("training.factor.agent")}
                        </span>
                        <span className="text-slate-300">
                          {player.agent?.reputation
                            ? t(`agent.reputation.${player.agent.reputation}`)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          {t("training.factor.morale")}
                        </span>
                        <span className="text-slate-300">
                          {player.morale ? t(`morale.${player.morale}`) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          {t("training.factor.personality")}
                        </span>
                        <span className="text-slate-300">
                          {player.personality
                            ? t(`personality.${player.personality}`)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">
                          {t("training.totalEffectiveness")}
                        </span>
                        <span
                          className={`font-bold ${
                            effectiveness >= 1.5
                              ? "text-yellow-400"
                              : effectiveness >= 1.2
                                ? "text-green-400"
                                : effectiveness >= 0.9
                                  ? "text-slate-300"
                                  : "text-red-400"
                          }`}
                        >
                          {Math.round(effectiveness * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer com Custo e Botões */}
            <div className="border-t border-slate-700/50 p-4 space-y-3">
              {/* Info de Custo */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">{t("training.cost")}</span>
                  <span className="text-amber-400 font-bold">
                    {clubCoversTraining
                      ? t("training.clubCovered")
                      : formatCurrency(cost)}
                  </span>
                </div>
                {clubCoversTraining && (
                  <p className="text-xs text-emerald-400 mt-1">
                    {t("training.clubCoveredHint")}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    {t("training.balance")}
                  </span>
                  <span
                    className={`font-bold ${canAfford ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              {/* Botões */}
              {!viewOnly ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleSaveConfiguration}
                    disabled={selectedTypes.length === 0}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl text-sm transition-all ${
                      selectedTypes.length > 0
                        ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <Icon name="Save" size={14} className="mr-1.5" />
                    {t("training.saveConfig")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleClose}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all"
                >
                  {t("common.close")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
