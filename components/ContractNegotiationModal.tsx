import React, { useState, useCallback, useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player, CareerMode } from "../types";
import { Icon } from "./ui/Icon";

interface ContractNegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    careerMode: CareerMode;
    proposedWage: number;
    proposedYears: number;
    onAccept: (finalWage: number, imageRights: number) => void;
    onReject: () => void;
}

/**
 * Point 5: Contract Negotiation Modal for Tactical Mode
 * 
 * Allows players to negotiate:
 * - Salary percentage (ask for more/less)
 * - Image rights percentage
 */
const ContractNegotiationModal: React.FC<ContractNegotiationModalProps> = ({
    isOpen,
    onClose,
    player,
    careerMode,
    proposedWage,
    proposedYears,
    onAccept,
    onReject,
}) => {
    const { t } = useI18n();

    // Negotiation state
    const [salaryRequest, setSalaryRequest] = useState(100); // % of proposed
    const [imageRights, setImageRights] = useState(50); // % player keeps
    const [negotiationRound, setNegotiationRound] = useState(0);
    const [clubResponse, setClubResponse] = useState<"pending" | "accepted" | "counter" | "rejected">("pending");
    const [clubCounterOffer, setClubCounterOffer] = useState<number | null>(null);

    const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeToClose({ onClose });

    // Calculate final wage based on negotiation
    const requestedWage = useMemo(() => {
        return Math.round(proposedWage * (salaryRequest / 100));
    }, [proposedWage, salaryRequest]);

    // Club's maximum acceptable wage (based on player importance)
    const maxAcceptableWage = useMemo(() => {
        const statusMultiplier = {
            "Captain": 1.35,
            "Key Player": 1.25,
            "Rotation": 1.10,
            "Prospect": 1.05,
            "Reserve": 1.0,
            "Surplus": 0.95,
        }[player.squadStatus] || 1.0;

        return Math.round(proposedWage * statusMultiplier);
    }, [proposedWage, player.squadStatus]);

    // Handle negotiation
    const handleNegotiate = useCallback(() => {
        if (negotiationRound >= 3) {
            // Max 3 rounds of negotiation
            setClubResponse("rejected");
            return;
        }

        if (requestedWage <= maxAcceptableWage) {
            // Club accepts
            setClubResponse("accepted");
        } else if (requestedWage <= maxAcceptableWage * 1.15) {
            // Club makes counter-offer
            const counter = Math.round((maxAcceptableWage + requestedWage) / 2);
            setClubCounterOffer(counter);
            setClubResponse("counter");
            setNegotiationRound(negotiationRound + 1);
        } else {
            // Too greedy - club may walk away
            if (negotiationRound >= 2 || Math.random() < 0.3) {
                setClubResponse("rejected");
            } else {
                const counter = Math.round(maxAcceptableWage * 0.95);
                setClubCounterOffer(counter);
                setClubResponse("counter");
                setNegotiationRound(negotiationRound + 1);
            }
        }
    }, [requestedWage, maxAcceptableWage, negotiationRound]);

    // Accept counter-offer
    const handleAcceptCounter = useCallback(() => {
        if (clubCounterOffer) {
            onAccept(clubCounterOffer, imageRights);
            onClose();
        }
    }, [clubCounterOffer, imageRights, onAccept, onClose]);

    // Accept current request
    const handleAcceptDeal = useCallback(() => {
        onAccept(requestedWage, imageRights);
        onClose();
    }, [requestedWage, imageRights, onAccept, onClose]);

    // Reset for new counter
    const handleContinueNegotiation = useCallback(() => {
        if (clubCounterOffer) {
            setSalaryRequest(Math.round((clubCounterOffer / proposedWage) * 100));
        }
        setClubResponse("pending");
    }, [clubCounterOffer, proposedWage]);

    // Format money display
    const formatWage = (wage: number) => {
        if (wage >= 1000000) return `€${(wage / 1000000).toFixed(1)}M`;
        if (wage >= 1000) return `€${(wage / 1000).toFixed(0)}K`;
        return `€${wage}`;
    };

    if (!isOpen) return null;

    // In Dynamic mode, auto-accept without negotiation
    if (careerMode === "dynamic") {
        onAccept(proposedWage, 50);
        onClose();
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Icon name="Signature" size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{t("negotiation.title")}</h2>
                                <p className="text-xs text-green-100">{t("negotiation.subtitle")}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        >
                            <Icon name="X" size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Club Offer Summary */}
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="text-xs text-slate-400 mb-2">{t("negotiation.clubOffer")}</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-lg font-bold text-emerald-400">{formatWage(proposedWage)}/w</div>
                                <div className="text-xs text-slate-500">{t("negotiation.baseSalary")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-blue-400">{proposedYears} {t("common.years")}</div>
                                <div className="text-xs text-slate-500">{t("negotiation.contractLength")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Negotiation Controls - Only show if pending */}
                    {clubResponse === "pending" && (
                        <>
                            {/* Salary Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-white">{t("negotiation.salaryDemand")}</label>
                                    <span className="text-sm font-bold text-emerald-400">{formatWage(requestedWage)}/w</span>
                                </div>
                                <input
                                    type="range"
                                    min="90"
                                    max="150"
                                    step="5"
                                    value={salaryRequest}
                                    onChange={(e) => setSalaryRequest(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>-10%</span>
                                    <span className={salaryRequest > 100 ? "text-amber-400" : "text-slate-400"}>
                                        {salaryRequest > 100 ? `+${salaryRequest - 100}%` : salaryRequest < 100 ? `${salaryRequest - 100}%` : "Base"}
                                    </span>
                                    <span>+50%</span>
                                </div>
                            </div>

                            {/* Image Rights Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-white">{t("negotiation.imageRights")}</label>
                                    <span className="text-sm font-bold text-purple-400">{imageRights}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="80"
                                    step="5"
                                    value={imageRights}
                                    onChange={(e) => setImageRights(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{t("negotiation.clubKeeps")}</span>
                                    <span>{t("negotiation.youKeep")}</span>
                                </div>
                            </div>

                            {/* Negotiation Round Indicator */}
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">{t("negotiation.round")}:</span>
                                <div className="flex gap-1">
                                    {[0, 1, 2].map((r) => (
                                        <div
                                            key={r}
                                            className={`w-2 h-2 rounded-full ${r < negotiationRound ? "bg-amber-500" : "bg-slate-600"}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={onReject}
                                    className="py-3 px-4 rounded-lg bg-red-500/20 text-red-400 font-semibold border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                >
                                    <Icon name="X" size={14} className="mr-2" />
                                    {t("negotiation.walkAway")}
                                </button>
                                <button
                                    onClick={handleNegotiate}
                                    className="py-3 px-4 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
                                >
                                    <Icon name="Handshake" size={14} className="mr-2" />
                                    {t("negotiation.propose")}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Club Response */}
                    {clubResponse === "accepted" && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Icon name="CircleCheck" size={40} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t("negotiation.dealAccepted")}</h3>
                                <p className="text-sm text-slate-400">{t("negotiation.clubAgreed")}</p>
                            </div>
                            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
                                <div className="text-xl font-bold text-emerald-400">{formatWage(requestedWage)}/w</div>
                                <div className="text-xs text-slate-400">{imageRights}% {t("negotiation.imageRightsRetained")}</div>
                            </div>
                            <button
                                onClick={handleAcceptDeal}
                                className="w-full py-3 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors"
                            >
                                <Icon name="PenLine" size={14} className="mr-2" />
                                {t("negotiation.signContract")}
                            </button>
                        </div>
                    )}

                    {clubResponse === "counter" && clubCounterOffer && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Icon name="Scale" size={40} className="text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t("negotiation.counterOffer")}</h3>
                                <p className="text-sm text-slate-400">{t("negotiation.clubCountered")}</p>
                            </div>
                            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30">
                                <div className="text-xl font-bold text-amber-400">{formatWage(clubCounterOffer)}/w</div>
                                <div className="text-xs text-slate-400">{t("negotiation.theirMaxOffer")}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleContinueNegotiation}
                                    className="py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
                                >
                                    {t("negotiation.negotiateMore")}
                                </button>
                                <button
                                    onClick={handleAcceptCounter}
                                    className="py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
                                >
                                    {t("negotiation.accept")}
                                </button>
                            </div>
                        </div>
                    )}

                    {clubResponse === "rejected" && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                                <Icon name="CircleX" size={40} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t("negotiation.dealCollapsed")}</h3>
                                <p className="text-sm text-slate-400">{t("negotiation.tooGreedy")}</p>
                            </div>
                            <button
                                onClick={onReject}
                                className="w-full py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
                            >
                                {t("common.close")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractNegotiationModal;
