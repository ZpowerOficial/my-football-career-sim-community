import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';

interface CareerEndAnimationProps {
    playerName: string;
    isLegend: boolean; // e.g. score > 10000
    onContextSwitch: () => void;
    onComplete: () => void;
}

const CareerEndAnimation: React.FC<CareerEndAnimationProps> = ({ playerName, isLegend, onContextSwitch, onComplete }) => {
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Step 1: Boots appear (0s)
        // Step 2: Lights dim / Spotlight (1s)
        // Step 3: Text Reveal (2s)
        // Step 4: Switch Context (5s)
        // Step 5: Exit (5.5s)
        // Step 6: Complete (6.5s)

        const t1 = setTimeout(() => setStep(1), 1000);
        const t2 = setTimeout(() => setStep(2), 2000);

        const tSwitch = setTimeout(() => {
            onContextSwitch();
        }, 5000);

        const tExit = setTimeout(() => {
            setIsExiting(true);
        }, 5500);

        const tComplete = setTimeout(() => {
            onComplete();
        }, 6500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(tSwitch);
            clearTimeout(tExit);
            clearTimeout(tComplete);
        };
    }, [onContextSwitch, onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Spotlight Effect */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-black opacity-100"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-xl"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center p-8">

                {/* Boots Icon */}
                <div className={`transition-all duration-1000 transform ${step >= 1 ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}`}>
                    <div className="relative">
                        <Icon name="Footprints" size={80} className="text-slate-400 transform -rotate-12 drop-shadow-2xl" />
                        <Icon name="Footprints" size={80} className="text-slate-400 transform rotate-12 translate-x-4 drop-shadow-2xl" />
                    </div>
                </div>

                {/* Text Reveal */}
                {step >= 2 && (
                    <div className="mt-12 space-y-4">
                        <h1 className="text-5xl font-bold text-white tracking-tighter animate-fade-in-up">
                            {isLegend ? "LEGEND" : "CAREER OVER"}
                        </h1>
                        <p className="text-xl text-slate-400 font-light tracking-widest uppercase animate-fade-in delay-500">
                            {playerName}
                        </p>
                        <div className="w-16 h-1 bg-slate-700 mx-auto mt-6 rounded-full animate-width-expand"></div>
                        <p className="text-sm text-slate-500 italic mt-4 animate-fade-in delay-1000">
                            "Thank you for the memories."
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(CareerEndAnimation);
