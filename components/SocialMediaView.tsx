/**
 * SOCIAL MEDIA VIEW - <v0 className="5 6"></v0>
 *
 * Componente unificado para exibir dados de mídia, redes sociais, 
 * status do jogador, narrativa e reputação.
 * Integra dados de player.socialData com campos existentes no Player.
 * 
 * FEATURES:
 * - Usa player.socialMediaFollowers como fonte única de verdade
 * - Dados determinísticos via useMemo (não muda a cada re-render)
 * - Modal de Comentários do Público
 * - Modal de Entrevistas
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Player, MediaNarrative, CareerLog } from "../types";
import type {
  PlayerSocialData,
  PopularityLevel,
  RelationshipLevel,
  SponsorTier,
  Headline,
} from "../types/socialTypes";
import {
  getPopularityLevel,
  getRelationshipLevel,
  createInitialSocialData
} from "../types/socialTypes";
import { useI18n } from "../contexts/I18nContext";
import { getRecentNews, getNewsTranslationKey } from "../services/newsService";
import { Icon, type IconName } from "./ui/Icon";
import { generateSeasonComments, type SocialComment } from "../services/socialCommentsService";

interface SocialMediaViewProps {
  player: Player;
  socialData?: PlayerSocialData;
  currentSeasonLog?: CareerLog;
  currentSeason?: number;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

const formatFollowers = (num: number): string => {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const formatMoney = (amount: number): string => {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
  return `€${amount}`;
};

const getPopularityColor = (level: PopularityLevel): string => {
  const colors: Record<PopularityLevel, string> = {
    unknown: "text-slate-500",
    local: "text-slate-400",
    regional: "text-blue-400",
    national: "text-green-400",
    continental: "text-purple-400",
    global: "text-yellow-400",
    legend: "text-amber-300",
  };
  return colors[level];
};

const getPopularityIcon = (level: PopularityLevel): IconName => {
  const icons: Record<PopularityLevel, IconName> = {
    unknown: "User",
    local: "MapPin",
    regional: "Map",
    national: "Flag",
    continental: "Globe",
    global: "Globe",
    legend: "Crown",
  };
  return icons[level];
};

const getRelationshipColor = (level: RelationshipLevel): string => {
  const colors: Record<RelationshipLevel, string> = {
    adored: "text-green-400",
    loved: "text-emerald-400",
    liked: "text-blue-400",
    neutral: "text-slate-400",
    disliked: "text-orange-400",
    hated: "text-red-400",
  };
  return colors[level];
};

const getRelationshipIcon = (level: RelationshipLevel): IconName => {
  const icons: Record<RelationshipLevel, IconName> = {
    adored: "Heart",
    loved: "Smile",
    liked: "ThumbsUp",
    neutral: "Minus",
    disliked: "ThumbsDown",
    hated: "Angry",
  };
  return icons[level];
};

const getTrendingIcon = (trend: "rising" | "stable" | "falling"): { icon: IconName; color: string } => {
  const config: Record<string, { icon: IconName; color: string }> = {
    rising: { icon: "TrendingUp", color: "text-green-400" },
    stable: { icon: "Minus", color: "text-slate-400" },
    falling: { icon: "TrendingDown", color: "text-red-400" },
  };
  return config[trend];
};

const getSponsorTierColor = (tier: SponsorTier): string => {
  const colors: Record<SponsorTier, string> = {
    bronze: "text-amber-600",
    silver: "text-slate-300",
    gold: "text-yellow-400",
    platinum: "text-cyan-300",
    diamond: "text-purple-400",
  };
  return colors[tier];
};

const getHeadlineColor = (type: Headline["type"]): string => {
  const colors: Record<Headline["type"], string> = {
    positive: "border-l-green-500 bg-green-500/10",
    negative: "border-l-red-500 bg-red-500/10",
    neutral: "border-l-slate-500 bg-slate-500/10",
    viral: "border-l-purple-500 bg-purple-500/10",
    controversy: "border-l-orange-500 bg-orange-500/10",
  };
  return colors[type];
};

// Narrativa da mídia - cores e ícones
const NARRATIVE_INFO: Record<MediaNarrative, { color: string; icon: IconName; bgColor: string }> = {
  "Prodigy": { color: "text-purple-400", icon: "Sparkles", bgColor: "bg-purple-500/10" },
  "On the Rise": { color: "text-blue-400", icon: "TrendingUp", bgColor: "bg-blue-500/10" },
  "Established Star": { color: "text-yellow-400", icon: "Star", bgColor: "bg-yellow-500/10" },
  "Under Pressure": { color: "text-orange-400", icon: "Gauge", bgColor: "bg-orange-500/10" },
  "Journeyman": { color: "text-slate-400", icon: "Route", bgColor: "bg-slate-500/10" },
  "Veteran Leader": { color: "text-amber-400", icon: "Crown", bgColor: "bg-amber-500/10" },
  "Forgotten Man": { color: "text-gray-500", icon: "Ghost", bgColor: "bg-gray-500/10" },
  "Flop": { color: "text-red-400", icon: "ArrowDown", bgColor: "bg-red-500/10" },
  "Comeback Kid": { color: "text-emerald-400", icon: "RotateCw", bgColor: "bg-emerald-500/10" },
  "Cult Hero": { color: "text-pink-400", icon: "Flame", bgColor: "bg-pink-500/10" },
  "Hometown Hero": { color: "text-rose-400", icon: "Heart", bgColor: "bg-rose-500/10" },
  "Polarizing Figure": { color: "text-violet-400", icon: "Zap", bgColor: "bg-violet-500/10" },
  "Press Darling": { color: "text-cyan-400", icon: "Mic", bgColor: "bg-cyan-500/10" },
  "System Player": { color: "text-teal-400", icon: "Settings", bgColor: "bg-teal-500/10" },
  "Injury Comeback": { color: "text-green-400", icon: "Hospital", bgColor: "bg-green-500/10" },
};

// ============================================================================
// INTERFACE DE COMENTÁRIO E GERADOR DETERMINÍSTICO
// ============================================================================

interface Comment {
  id: string;
  username: string;
  text: string;
  likes: number;
  isVerified: boolean;
  sentiment: "positive" | "negative" | "neutral";
  timeAgo: string;
}

// Gera comentários de forma determinística baseado em dados estáveis do jogador
const generateDeterministicComments = (
  player: Player,
  t: (key: string, params?: Record<string, string | number>) => string
): Comment[] => {
  const comments: Comment[] = [];

  // Seed baseado em dados estáveis (não muda a cada render)
  const stableSeed =
    (player.name?.charCodeAt(0) || 1) +
    player.stats.overall +
    Math.floor(player.form * 10) +
    player.age;

  const usernames = [
    "FutebolFan2024", "BolaNaRede", "CraqueAnalista", "TorcedorRaiz",
    "GolDoSeculo", "MeiaCancha", "DribladorNato", "ArteiroDoFut",
    "TaticoMestre", "FanaticoFC", "BancadaVIP", "CamisaDez",
    "GoleiraoTop", "ZagueiroBruto", "LateralOfensivo", "VolanteMagro"
  ];

  const firstName = player.name.split(" ")[0];
  const teamName = player.team?.name || "clube";
  
  // v1.0 - Comentários baseados em eventFlags (escolhas de eventos interativos)
  const flags = player.eventFlags;
  if (flags) {
    // Pediu transferência
    if (flags.wantsTransfer) {
      comments.push({
        id: `event-transfer-${stableSeed}`,
        username: usernames[(stableSeed + 14) % usernames.length],
        text: t("events.reactions.agent_meeting.explore.fan1", { name: firstName }),
        likes: 80 + (stableSeed % 150),
        isVerified: false,
        sentiment: "negative",
        timeAgo: t("social.comments.hoursAgo", { count: 1 }),
      });
    }
    
    // Interação positiva com fãs
    if (flags.recentFanInteraction === 'positive') {
      comments.push({
        id: `event-fan-pos-${stableSeed}`,
        username: usernames[(stableSeed + 15) % usernames.length],
        text: t("events.reactions.fan_encounter.engage.fan1", { name: firstName }),
        likes: 200 + (stableSeed % 300),
        isVerified: stableSeed % 3 === 0,
        sentiment: "positive",
        timeAgo: t("social.comments.hoursAgo", { count: 2 }),
      });
    }
    
    // Interação negativa com fãs
    if (flags.recentFanInteraction === 'negative') {
      comments.push({
        id: `event-fan-neg-${stableSeed}`,
        username: usernames[(stableSeed + 13) % usernames.length],
        text: t("events.reactions.fan_encounter.ignore.fan1", { name: firstName }),
        likes: 50 + (stableSeed % 80),
        isVerified: false,
        sentiment: "negative",
        timeAgo: t("social.comments.hoursAgo", { count: 3 }),
      });
    }
    
    // Treino intensivo
    if (flags.extraTrainingActive || flags.trainingIntensity === 'intense') {
      comments.push({
        id: `event-training-${stableSeed}`,
        username: usernames[(stableSeed + 9) % usernames.length],
        text: t("events.reactions.training_decision.extra.fan1", { name: firstName }),
        likes: 120 + (stableSeed % 180),
        isVerified: true,
        sentiment: "positive",
        timeAgo: t("social.comments.daysAgo", { count: 1 }),
      });
    }
    
    // Ativo em caridade
    if (flags.charityActive) {
      comments.push({
        id: `event-charity-${stableSeed}`,
        username: usernames[(stableSeed + 6) % usernames.length],
        text: t("events.reactions.charity.large.fan1", { name: firstName }),
        likes: 300 + (stableSeed % 400),
        isVerified: stableSeed % 2 === 0,
        sentiment: "positive",
        timeAgo: t("social.comments.hoursAgo", { count: 6 }),
      });
    }
    
    // Conflito com técnico
    if (flags.conflictWithManager) {
      comments.push({
        id: `event-manager-${stableSeed}`,
        username: usernames[(stableSeed + 4) % usernames.length],
        text: t("events.reactions.manager_fallout.transfer.fan1", { name: firstName }),
        likes: 90 + (stableSeed % 120),
        isVerified: false,
        sentiment: "negative",
        timeAgo: t("social.comments.hoursAgo", { count: 4 }),
      });
    }
    
    // Figura polêmica
    if (flags.controversialStatements >= 2) {
      comments.push({
        id: `event-controversial-${stableSeed}`,
        username: usernames[(stableSeed + 1) % usernames.length],
        text: t("events.reactions.outburst.double_down.fan1", { name: firstName }),
        likes: 150 + (stableSeed % 200),
        isVerified: false,
        sentiment: "positive",
        timeAgo: t("social.comments.hoursAgo", { count: 5 }),
      });
    }
  }

  // Comentário baseado na forma
  if (player.form >= 2) {
    comments.push({
      id: `pos-form-${stableSeed}`,
      username: usernames[stableSeed % usernames.length],
      text: t("social.comments.goodForm", { name: firstName }),
      likes: 50 + (stableSeed % 200),
      isVerified: stableSeed % 5 === 0,
      sentiment: "positive",
      timeAgo: t("social.comments.hoursAgo", { count: 2 + (stableSeed % 4) }),
    });
  } else if (player.form < -1) {
    comments.push({
      id: `neg-form-${stableSeed}`,
      username: usernames[(stableSeed + 3) % usernames.length],
      text: t("social.comments.badForm", { name: firstName }),
      likes: 20 + (stableSeed % 50),
      isVerified: false,
      sentiment: "negative",
      timeAgo: t("social.comments.hoursAgo", { count: 1 + (stableSeed % 6) }),
    });
  }

  // Comentário sobre overall
  if (player.stats.overall >= 75) {
    comments.push({
      id: `ovr-high-${stableSeed}`,
      username: usernames[(stableSeed + 5) % usernames.length],
      text: t("social.comments.highOverall"),
      likes: 100 + (stableSeed % 300),
      isVerified: true,
      sentiment: "positive",
      timeAgo: t("social.comments.daysAgo", { count: 1 }),
    });
  } else if (player.stats.overall < 60) {
    comments.push({
      id: `ovr-low-${stableSeed}`,
      username: usernames[(stableSeed + 7) % usernames.length],
      text: t("social.comments.lowOverall"),
      likes: 10 + (stableSeed % 30),
      isVerified: false,
      sentiment: "neutral",
      timeAgo: t("social.comments.daysAgo", { count: 2 }),
    });
  }

  // Comentário sobre idade
  if (player.age <= 20) {
    comments.push({
      id: `age-young-${stableSeed}`,
      username: usernames[(stableSeed + 2) % usernames.length],
      text: t("social.comments.youngTalent", { age: player.age }),
      likes: 80 + (stableSeed % 150),
      isVerified: stableSeed % 3 === 0,
      sentiment: "positive",
      timeAgo: t("social.comments.hoursAgo", { count: 5 + (stableSeed % 10) }),
    });
  } else if (player.age >= 33) {
    comments.push({
      id: `age-vet-${stableSeed}`,
      username: usernames[(stableSeed + 8) % usernames.length],
      text: t("social.comments.veteranPlayer", { age: player.age }),
      likes: 40 + (stableSeed % 80),
      isVerified: false,
      sentiment: "neutral",
      timeAgo: t("social.comments.daysAgo", { count: 3 }),
    });
  }

  // v0.5.10: Comentários baseados na narrativa de mídia
  // Narrativas negativas devem ter comentários críticos
  const narrative = player.mediaNarrative;
  const negativeNarratives = ["Disappointment", "Controversial", "Decline", "Injury Prone", "Outcast"];
  const positiveNarratives = ["Rising Star", "Legend", "Fan Favorite", "Golden Boy", "Underdog Hero"];

  if (negativeNarratives.includes(narrative)) {
    // Substituir comentário geral por crítico
    comments.push({
      id: `narrative-neg-${stableSeed}`,
      username: usernames[(stableSeed + 12) % usernames.length],
      text: t(`social.comments.narrative.${narrative.replace(/\s+/g, "")}`, { name: firstName }),
      likes: 15 + (stableSeed % 40),
      isVerified: false,
      sentiment: "negative",
      timeAgo: t("social.comments.hoursAgo", { count: 3 + (stableSeed % 8) }),
    });
  } else if (positiveNarratives.includes(narrative)) {
    comments.push({
      id: `narrative-pos-${stableSeed}`,
      username: usernames[(stableSeed + 11) % usernames.length],
      text: t(`social.comments.narrative.${narrative.replace(/\s+/g, "")}`, { name: firstName }),
      likes: 100 + (stableSeed % 250),
      isVerified: stableSeed % 4 === 0,
      sentiment: "positive",
      timeAgo: t("social.comments.hoursAgo", { count: 1 + (stableSeed % 5) }),
    });
  }

  // Comentário geral de apoio (apenas se narrativa não for negativa)
  if (!negativeNarratives.includes(narrative)) {
    comments.push({
      id: `general-${stableSeed}`,
      username: usernames[(stableSeed + 10) % usernames.length],
      text: t("social.comments.generalSupport", { team: teamName }),
      likes: 30 + (stableSeed % 100),
      isVerified: false,
      sentiment: "positive",
      timeAgo: t("social.comments.hoursAgo", { count: 8 + (stableSeed % 16) }),
    });
  }

  // Ordenar por likes e limitar a 5
  return comments.sort((a, b) => b.likes - a.likes).slice(0, 5);
};

// ============================================================================
// COMPONENTES DE SEÇÃO (Clicáveis)
// ============================================================================

interface SectionProps {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  defaultExpanded?: boolean;
  onOpenModal?: () => void;
  modalLabel?: string;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  expandedContent,
  defaultExpanded = false,
  onOpenModal,
  modalLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasExpandedContent = !!expandedContent;

  return (
    <div className="bg-slate-800/60 rounded-xl backdrop-blur-sm overflow-hidden">
      <div
        onClick={() => hasExpandedContent && setIsExpanded(!isExpanded)}
        className={`w-full p-4 text-left ${hasExpandedContent ? 'active:bg-slate-700/50 cursor-pointer' : ''}`}
        role="button"
        tabIndex={hasExpandedContent ? 0 : -1}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Icon name={icon} size={14} className="text-accent-primary" />
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {onOpenModal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenModal();
                }}
                className="px-2 py-1 text-[10px] bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition-colors"
              >
                {modalLabel || "Ver mais"}
              </button>
            )}
            {hasExpandedContent && (
              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={12} className="text-slate-400" />
            )}
          </div>
        </div>
        <div className="mt-3">
          {children}
        </div>
      </div>

      {hasExpandedContent && isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          {expandedContent}
        </div>
      )}
    </div>
  );
};

const StatBar: React.FC<{
  label: string;
  value: number;
  icon?: string;
  showValue?: boolean;
  compact?: boolean;
}> = ({ label, value, icon, showValue = true, compact = false }) => {
  const getBarColor = (v: number) => {
    if (v >= 80) return "bg-green-500";
    if (v >= 60) return "bg-emerald-500";
    if (v >= 40) return "bg-yellow-500";
    if (v >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <div className="flex justify-between items-center">
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-300 flex items-center gap-1.5`}>
          {icon && <Icon name={icon} size={10} />}
          {label}
        </span>
        {showValue && (
          <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold ${getBarColor(value)}`}>
            {Math.round(value)}%
          </span>
        )}
      </div>
      <div className={`w-full bg-slate-700/50 rounded-full ${compact ? 'h-1.5' : 'h-2'} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MODAL DE COMENTÁRIOS DO PÚBLICO
// ============================================================================

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  player: Player;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, comments, player }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const getSentimentColor = (sentiment: Comment["sentiment"]) => {
    switch (sentiment) {
      case "positive": return "border-l-green-500";
      case "negative": return "border-l-red-500";
      default: return "border-l-slate-500";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay modal-overlay-enter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl backdrop-blur-md modal-content modal-content-enter">
        {/* Swipe indicator */}
        <div className="swipe-indicator" />

        {/* Header */}
        <div className="border-b border-slate-700/50">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Icon name="MessageCircle" size={16} className="text-blue-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("social.publicComments")}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="p-3 overflow-y-auto max-h-[70vh] space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              {t("social.noComments")}
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-slate-900/60 rounded-xl p-3 border-l-4 ${getSentimentColor(comment.sentiment)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {comment.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white truncate">
                        @{comment.username}
                      </span>
                      {comment.isVerified && (
                        <Icon name="CircleCheck" size={10} className="text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">{comment.timeAgo}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2 leading-relaxed">{comment.text}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Icon name="Heart" size={14} variant="solid" className="text-red-400" />
                    {comment.likes}
                  </span>
                  <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-400 transition-colors">
                    <Icon name="Reply" size={14} />
                    {t("social.reply")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// MODAL DE ENTREVISTA
// ============================================================================

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ isOpen, onClose, player }) => {
  const { t } = useI18n();
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  if (!isOpen) return null;

  const narrativeInfo = NARRATIVE_INFO[player.mediaNarrative] || NARRATIVE_INFO["Journeyman"];

  // Perguntas e respostas baseadas no estado do jogador
  const narrativeKey = player.mediaNarrative.replace(/\s+/g, "");
  const questions = [
    {
      id: 1,
      question: t("social.interview.q1"),
      answer: t(`mediaNarrative.${narrativeKey}.quote1`),
      icon: "Mic",
    },
    {
      id: 2,
      question: t("social.interview.q2"),
      answer: t(`mediaNarrative.${narrativeKey}.quote2`),
      icon: "SoccerBall",
    },
    {
      id: 3,
      question: t("social.interview.q3"),
      answer: t(`mediaNarrative.${narrativeKey}.quote3`),
      icon: "TrendingUp",
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay modal-overlay-enter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl backdrop-blur-md modal-content modal-content-enter">
        {/* Swipe indicator */}
        <div className="swipe-indicator" />

        {/* Header */}
        <div className="border-b border-slate-700/50">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Icon name="Newspaper" size={16} className="text-purple-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("social.pressInterview")}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Narrative Badge */}
        <div className="p-3 border-b border-slate-700/50">
          <div className={`${narrativeInfo.bgColor} rounded-lg p-3 flex items-center gap-3`}>
            <div className={`text-2xl ${narrativeInfo.color}`}>
              <Icon name={narrativeInfo.icon} size={14} variant="solid" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {t("dashboard.narrative")}
              </p>
              <p className={`text-sm font-bold ${narrativeInfo.color}`}>
                {t(`mediaNarrative.${player.mediaNarrative.replace(/\s+/g, "")}.name`)}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <p className="text-xs text-slate-300 italic">
            "{t(`mediaNarrative.${narrativeKey}.description`)}"
          </p>
        </div>

        {/* Questions */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            {t("social.selectQuestion")}
          </p>

          {questions.map((q) => (
            <div key={q.id}>
              <button
                onClick={() => setSelectedQuestion(selectedQuestion === q.id ? null : q.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${selectedQuestion === q.id
                  ? 'bg-accent-primary/20 border border-accent-primary/50'
                  : 'bg-slate-900/50 hover:bg-slate-900/70'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedQuestion === q.id ? 'bg-accent-primary' : 'bg-slate-700'
                    }`}>
                    <Icon name={q.icon} size={14} className={selectedQuestion === q.id ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{q.question}</p>
                    {selectedQuestion === q.id && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-start gap-2">
                          <Icon name="Quote" size={10} className="text-accent-primary mt-1" />
                          <p className="text-xs text-slate-300">{q.answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Icon name={selectedQuestion === q.id ? "ChevronUp" : "ChevronDown"} size={12} className="text-slate-500" />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const SocialMediaView: React.FC<SocialMediaViewProps> = ({
  player,
  socialData: propSocialData,
  currentSeasonLog,
  currentSeason,
}) => {
  const { t } = useI18n();

  // Manchetes recentes
  const recentNews = useMemo(() => getRecentNews(player, 5), [player]);

  // Estados dos modais
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // FONTE DE VERDADE: player.socialMediaFollowers
  const followers = player.socialMediaFollowers || 0;
  
  // Calcular temporada atual baseado na idade se não fornecido
  const seasonNumber = currentSeason ?? (player.age - 14);

  // Dados sociais calculados via useMemo para serem determinísticos
  const socialData = useMemo(() => {
    if (propSocialData) {
      return {
        ...propSocialData,
        socialMedia: {
          ...propSocialData.socialMedia,
          followers, // Sempre usar o valor do player
        },
      };
    }
    return createInitialSocialData(
      player.team?.reputation || 50,
      player.stats.overall,
      followers
    );
  }, [propSocialData, player.team?.reputation, player.stats.overall, followers]);

  // Comentários gerados pelo novo serviço - resetam por temporada
  const comments = useMemo(() => {
    const newComments = generateSeasonComments(player, seasonNumber, currentSeasonLog, t);
    // Converter para o formato Comment esperado pelo modal
    return newComments.map(c => ({
      id: c.id,
      username: c.username,
      text: c.text,
      likes: c.likes,
      isVerified: c.isVerified,
      sentiment: c.sentiment === 'controversial' ? 'neutral' : c.sentiment,
      timeAgo: c.timeAgo,
    } as Comment));
  }, [player.name, player.stats.overall, player.form, player.age, seasonNumber, currentSeasonLog?.stats?.goals, t]);

  // Calcular crescimento baseado no form (determinístico)
  const growthRate = useMemo(() => {
    const baseGrowth = player.form * 0.5;
    const moraleBonus = player.morale === "Very High" ? 0.3 :
      player.morale === "High" ? 0.15 :
        player.morale === "Low" ? -0.15 :
          player.morale === "Very Low" ? -0.3 : 0;
    return baseGrowth + moraleBonus;
  }, [player.form, player.morale]);

  const engagement = socialData.socialMedia.engagement;
  const trending = player.form >= 2 ? "rising" : player.form <= -2 ? "falling" : "stable";
  const viralMoments = propSocialData?.socialMedia?.viralMoments || 0;

  // Integrar dados de status do player existentes
  const teamChemistry = player.teamChemistry ?? socialData.relationships.teamChemistry;
  const boardConfidence = player.clubApproval ?? socialData.relationships.boardConfidence;

  const { popularity, sponsorships, recentHeadlines } = socialData;
  const trendingInfo = getTrendingIcon(trending);

  // Funções de cor para form/morale
  const getFormColor = (form: number) => {
    if (form >= 4) return "text-emerald-400";
    if (form >= 2) return "text-green-400";
    if (form >= 0) return "text-yellow-400";
    if (form >= -2) return "text-orange-400";
    return "text-red-400";
  };

  const getMoraleColor = (morale: string) => {
    switch (morale) {
      case "Very High": return "text-emerald-400";
      case "High": return "text-green-400";
      case "Normal": return "text-yellow-400";
      case "Low": return "text-orange-400";
      case "Very Low": return "text-red-400";
      default: return "text-slate-400";
    }
  };

  const getFormLabel = (form: number) => {
    if (form >= 4) return t("form.worldClass");
    if (form >= 3) return t("form.excellent");
    if (form >= 2) return t("form.veryGood");
    if (form >= 1) return t("form.good");
    if (form >= 0) return t("form.average");
    if (form >= -2) return t("form.belowAverage");
    if (form >= -4) return t("form.poor");
    return t("form.terrible");
  };

  const narrativeInfo = NARRATIVE_INFO[player.mediaNarrative] || NARRATIVE_INFO["Journeyman"];
  const mediaNarrativeKey = player.mediaNarrative.replace(/\s+/g, "");

  return (
    <div className="space-y-4">
      {/* Modais */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        comments={comments}
        player={player}
      />
      <InterviewModal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        player={player}
      />

      {/* Redes Sociais */}
      <Section
        title={t("social.socialMedia")}
        icon="Hash"
        onOpenModal={() => setShowCommentsModal(true)}
        modalLabel={t("social.viewComments")}
        expandedContent={
          <div className="mt-3 space-y-2">
            <StatBar
              label={t("social.engagement")}
              value={engagement}
              icon="Heart"
            />
            {viralMoments > 0 && (
              <div className="flex items-center gap-2 text-xs text-purple-400 mt-2">
                <Icon name="Flame" size={14} variant="solid" />
                <span>{t("social.viralMoments", { count: viralMoments })}</span>
              </div>
            )}

            {/* Preview de comentários */}
            {comments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <p className="text-[10px] text-slate-500 uppercase mb-2">
                  {t("social.recentComments")}
                </p>
                <div className="space-y-2">
                  {comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="bg-slate-900/50 rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-medium text-slate-400">
                          @{comment.username}
                        </span>
                        {comment.isVerified && (
                          <Icon name="CircleCheck" size={8} className="text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {/* Seguidores */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <Icon name="Users" size={24} className="text-blue-400 mb-1" />
            <p className="text-xl font-bold text-white">
              {formatFollowers(followers)}
            </p>
            <p className="text-[10px] text-slate-400">{t("social.followers")}</p>
          </div>

          {/* Tendência */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <Icon name={trendingInfo.icon} size={24} className={`${trendingInfo.color} mb-1`} />
            <p className={`text-xl font-bold ${trendingInfo.color}`}>
              {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-400">{t("social.growth")}</p>
          </div>
        </div>
      </Section>

      {/* Narrativa da Mídia */}
      <Section
        title={t("dashboard.mediaNarrative")}
        icon="Newspaper"
        onOpenModal={() => setShowInterviewModal(true)}
        modalLabel={t("social.viewInterview")}
        expandedContent={
          <div className="mt-3 space-y-2">
            {/* Descrição da narrativa */}
            <p className="text-xs text-slate-300">
              {t(`mediaNarrative.${mediaNarrativeKey}.description`)}
            </p>
            {/* Frases da mídia sobre o jogador */}
            <div className="space-y-2 mt-2">
              <div className="bg-slate-900/50 rounded-lg p-2.5 border-l-2 border-blue-500">
                <p className="text-[11px] text-slate-300 flex items-start gap-2">
                  <Icon name="Mic" size={12} className="text-blue-400 mt-0.5" />
                  {t(`mediaNarrative.${mediaNarrativeKey}.quote1`)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5 border-l-2 border-purple-500">
                <p className="text-[11px] text-slate-300 flex items-start gap-2">
                  <Icon name="Users" size={12} className="text-purple-400 mt-0.5" />
                  {t(`mediaNarrative.${mediaNarrativeKey}.quote2`)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5 border-l-2 border-emerald-500">
                <p className="text-[11px] text-slate-300 flex items-start gap-2">
                  <Icon name="Quote" size={12} className="text-emerald-400 mt-0.5" />
                  {t(`mediaNarrative.${mediaNarrativeKey}.quote3`)}
                </p>
              </div>
            </div>
          </div>
        }
      >
        <div className={`${narrativeInfo.bgColor} rounded-lg p-3`}>
          <div className="flex items-center gap-3">
            <div className={`text-2xl ${narrativeInfo.color}`}>
              <Icon name={narrativeInfo.icon} size={14} variant="solid" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {t("dashboard.narrative")}
              </p>
              <p className={`text-base font-bold ${narrativeInfo.color}`}>
                {t(`mediaNarrative.${player.mediaNarrative.replace(/\s+/g, "")}.name`)}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Manchetes / Notícias */}
      <Section
        title={t("social.newsFeed")}
        icon="Newspaper"
        expandedContent={
          <div className="mt-3 space-y-3">
            {recentNews.length > 0 ? (
              recentNews.map((news) => (
                <div key={news.id} className="bg-slate-900/50 rounded-lg p-3 border-l-2 border-yellow-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">
                      {t(`newsType.${news.type}`)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {news.playerAge ? `${news.playerAge} ${t("common.years")}` : t("social.daysAgo", { count: 0 })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {t(getNewsTranslationKey(news), news.params)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-500 py-4">
                {t("social.noNews")}
              </p>
            )}
          </div>
        }
      >
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl text-yellow-500">
              <Icon name="Newspaper" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {t("social.recentHeadlines")}
              </p>
              <p className="text-sm font-bold text-white truncate max-w-[150px]">
                {recentNews.length > 0
                  ? t(getNewsTranslationKey(recentNews[0]), recentNews[0].params)
                  : t("social.noNews")}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Status do Jogador */}
      <Section
        title={t("dashboard.playerStatus")}
        icon="HeartPulse"
        expandedContent={
          <div className="mt-3 space-y-3">
            {/* Form detalhado */}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Icon name="TrendingUp" size={14} className="text-amber-400" />
                  {t("dashboard.form")}
                </span>
                <span className={`text-lg font-bold ${getFormColor(player.form)}`}>
                  {player.form > 0 ? `+${player.form.toFixed(1)}` : player.form.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${player.form >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${((player.form + 5) / 10) * 100}%` }}
                />
              </div>
              <p className={`text-[10px] mt-1 ${getFormColor(player.form)}`}>
                {getFormLabel(player.form)}
              </p>
            </div>

            {/* Morale detalhado */}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Icon name="Smile" size={14} className="text-purple-400" />
                  {t("dashboard.morale")}
                </span>
                <span className={`text-sm font-bold ${getMoraleColor(player.morale)}`}>
                  {t(`morale.${player.morale}`)}
                </span>
              </div>
            </div>

            {/* Lesão se houver */}
            {player.injury && (
              <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/50">
                <div className="flex items-center gap-3">
                  <Icon name="Hospital" size={20} className="text-red-400" />
                  <div>
                    <p className="font-bold text-red-300 text-sm">{t("dashboard.injured")}</p>
                    <p className="text-xs text-red-400">
                      {player.injury.duration} {t("common.weeksRemaining")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <StatBar
            label={t("social.teamChemistry")}
            value={teamChemistry}
            icon="Users"
            compact
          />
          <StatBar
            label={t("dashboard.clubApproval")}
            value={boardConfidence}
            icon="ThumbsUp"
            compact
          />
        </div>
      </Section>

      {/* Popularidade */}
      <Section
        title={t("social.popularity")}
        icon="Star"
        expandedContent={
          <div className="mt-3 space-y-2">
            <StatBar
              label={t("social.homeCountry")}
              value={popularity.homeCountry}
              icon="House"
            />
            <StatBar
              label={t("social.currentCountry")}
              value={popularity.currentClubCountry}
              icon="MapPin"
            />
          </div>
        }
      >
        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
          <div className={`text-3xl ${getPopularityColor(popularity.level)}`}>
            <Icon name={getPopularityIcon(popularity.level)} size={28} variant="solid" />
          </div>
          <div>
            <p className={`text-lg font-bold ${getPopularityColor(popularity.level)}`}>
              {t(`social.level.${popularity.level}`)}
            </p>
            <p className="text-xs text-slate-400">
              {t("social.globalRating")}: {popularity.global}
            </p>
          </div>
        </div>
      </Section>

      {/* Relacionamentos */}
      <Section
        title={t("social.relationships")}
        icon="Handshake"
        expandedContent={
          <div className="mt-3 space-y-2">
            <StatBar
              label={t("social.fans")}
              value={socialData.relationships.fansSentiment}
              icon="Heart"
            />
            <StatBar
              label={t("social.press")}
              value={socialData.relationships.pressSentiment}
              icon="Newspaper"
            />
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {/* Torcida */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="Heart" size={14} variant="solid" className={getRelationshipColor(socialData.relationships.fans)} />
              <span className="text-[10px] text-slate-400">{t("social.fans")}</span>
            </div>
            <p className={`text-sm font-bold ${getRelationshipColor(socialData.relationships.fans)}`}>
              {t(`social.relationship.${socialData.relationships.fans}`)}
            </p>
          </div>

          {/* Imprensa */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="Newspaper" size={14} className={getRelationshipColor(socialData.relationships.press)} />
              <span className="text-[10px] text-slate-400">{t("social.press")}</span>
            </div>
            <p className={`text-sm font-bold ${getRelationshipColor(socialData.relationships.press)}`}>
              {t(`social.relationship.${socialData.relationships.press}`)}
            </p>
          </div>
        </div>
      </Section>

      {/* Patrocinadores */}
      <Section
        title={t("social.sponsors")}
        icon="Handshake"
        expandedContent={
          sponsorships.activeSponsors.length > 0 ? (
            <div className="mt-3 space-y-2">
              {sponsorships.activeSponsors.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Gem" size={14} variant="solid" className={getSponsorTierColor(sponsor.tier)} />
                    <div>
                      <p className="text-sm font-medium text-white">{sponsor.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {t(`social.tier.${sponsor.tier}`)} • {t("social.contractUntil", { season: sponsor.contractEndSeason })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">
                      {formatMoney(sponsor.weeklyIncome)}/sem
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ~{formatMoney(sponsor.weeklyIncome * 52)}/ano
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : undefined
        }
      >
        {sponsorships.activeSponsors.length > 0 ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">
                {sponsorships.activeSponsors.length}
              </span>
              <span className="text-xs text-slate-400">
                {sponsorships.activeSponsors.length === 1 ? "sponsor" : "sponsors"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-400">
                {formatMoney(sponsorships.totalWeeklyIncome)}/sem
              </p>
              <p className="text-[10px] text-slate-400">{t("social.totalSponsorIncome")}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <Icon name="BadgeDollarSign" size={24} className="text-slate-600 mb-1" />
            <p className="text-slate-400 text-xs">{t("social.noSponsors")}</p>
          </div>
        )}

        {sponsorships.pendingOffers.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-xs text-yellow-400 flex items-center gap-1">
              <Icon name="Mail" size={14} />
              {t("social.pendingOffers", { count: sponsorships.pendingOffers.length })}
            </p>
          </div>
        )}
      </Section>

      {/* Manchetes Recentes */}
      {recentHeadlines.length > 0 && (
        <Section
          title={t("social.recentHeadlines")}
          icon="Rss"
          expandedContent={
            recentHeadlines.length > 3 ? (
              <div className="mt-3 space-y-2">
                {recentHeadlines.slice(3, 8).map((headline) => (
                  <div
                    key={headline.id}
                    className={`border-l-4 rounded-r-lg p-2 ${getHeadlineColor(headline.type)}`}
                  >
                    <p className="text-xs text-white">
                      {t(headline.titleKey, headline.titleParams)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {t("social.seasonWeek", {
                        season: headline.seasonNumber,
                        week: headline.timestamp
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-2">
            {recentHeadlines.slice(0, 3).map((headline) => (
              <div
                key={headline.id}
                className={`border-l-4 rounded-r-lg p-2.5 ${getHeadlineColor(headline.type)}`}
              >
                <p className="text-xs text-white">
                  {t(headline.titleKey, headline.titleParams)}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {t("social.seasonWeek", {
                    season: headline.seasonNumber,
                    week: headline.timestamp
                  })}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default SocialMediaView;
