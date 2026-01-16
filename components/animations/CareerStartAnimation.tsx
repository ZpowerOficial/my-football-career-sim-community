import React, { useEffect, useState } from 'react';
import { Team } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { Icon } from '../ui/Icon';

interface CareerStartAnimationProps {
    team: Team;
    playerName: string;
    onContextSwitch: () => void; // Called when we should switch the background screen
    onComplete: () => void;      // Called when animation is fully done (overlay removed)
}

const CareerStartAnimation: React.FC<CareerStartAnimationProps> = ({ team, playerName, onContextSwitch, onComplete }) => {
    const { t } = useI18n();
    console.log('CareerStartAnimation mounted', { team, playerName, hasOnContextSwitch: !!onContextSwitch });
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Sequence:
        // 0s: Intro
        // 0.5s: Contract appears (Step 1)
        // 2.0s: Signing (Step 2)
        // 4.5s: Jersey Reveal (Step 3)
        // 7.0s: Switch Context (Background changes to Dashboard)
        // 7.5s: Start Exit (Fade out overlay)
        // 8.5s: Complete (Unmount)

        const t1 = setTimeout(() => setStep(1), 500);
        const t2 = setTimeout(() => setStep(2), 2000);
        const t3 = setTimeout(() => setStep(3), 4500);

        const tSwitch = setTimeout(() => {
            if (onContextSwitch) {
                onContextSwitch();
            } else {
                console.error('onContextSwitch is undefined!');
            }
        }, 7000);

        const tExit = setTimeout(() => {
            setIsExiting(true);
        }, 7500);

        const tComplete = setTimeout(() => {
            onComplete();
        }, 8500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(tSwitch);
            clearTimeout(tExit);
            clearTimeout(tComplete);
        };
    }, [onContextSwitch, onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-900 transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Background Effects - Opacity 100 to hide underlying screen */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-100"></div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md p-6">

                {/* Step 0-2: The Contract */}
                <div className={`transition-all duration-700 transform ${step >= 3 ? 'scale-50 opacity-0 translate-y-20' : 'scale-100 opacity-100'}`}>
                    <div className="bg-white text-slate-900 p-8 rounded-sm shadow-2xl w-64 h-80 relative rotate-1 mx-auto">
                        <div className="border-b-2 border-slate-200 pb-4 mb-4">
                            <h2 className="text-xl font-serif font-bold text-center uppercase tracking-widest">{t('careerStart.contract')}</h2>
                            <p className="text-xs text-center text-slate-500 mt-1">{t('careerStart.officialAgreement')}</p>
                        </div>

                        <div className="space-y-2 text-[6px] text-slate-400 font-serif leading-relaxed text-justify">
                            <p>{t('careerStart.agreementText')} <strong>{team.name}</strong> and <strong>{playerName}</strong>.</p>
                            <p>The player agrees to represent the club with honor and dignity.</p>
                            <p className="blur-[1px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                            <p className="blur-[1px]">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                        </div>

                        <div className="absolute bottom-8 left-6 right-6 border-t border-slate-300 pt-2 flex justify-between items-end">
                            <div className="w-20">
                                <p className="text-[6px] uppercase text-slate-500">{t('careerStart.clubRepresentative')}</p>
                                <div className="font-script text-lg text-blue-900 -rotate-6 mt-[-5px]">{t('careerStart.director')}</div>
                            </div>
                            <div className="w-20 relative">
                                <p className="text-[6px] uppercase text-slate-500">{t('careerStart.playerSignature')}</p>
                                {step >= 2 && (
                                    <div className="absolute bottom-1 left-0 w-full h-8">
                                        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                                            <path
                                                d="M5,30 Q20,5 35,30 T65,30 T95,20"
                                                fill="none"
                                                stroke="blue"
                                                strokeWidth="3"
                                                className="animate-draw-signature"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 3: Jersey Reveal */}
                {step >= 3 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in-up">
                        <div className="relative">
                            {/* Glow behind jersey */}
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full transform scale-150"></div>

                            {/* Jersey SVG/Icon */}
                            <div className="relative transform hover:scale-105 transition-transform duration-500">
                                <Icon name="Shirt" size={90} className="text-white drop-shadow-2xl filter" />
                                <div className="absolute inset-0 flex items-center justify-center pt-4">
                                    {/* Number (random or 10) */}
                                    <span className="text-4xl font-bold text-slate-900 opacity-80 font-mono">NEW</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center space-y-2">
                            <h1 className="text-4xl font-bold text-white tracking-tight animate-tracking-in-expand">
                                {t('careerStart.welcome')}
                            </h1>
                            <p className="text-xl text-blue-400 font-medium uppercase tracking-widest animate-fade-in delay-300">
                                {t('careerStart.toClub', { team: team.name })}
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default React.memo(CareerStartAnimation);
