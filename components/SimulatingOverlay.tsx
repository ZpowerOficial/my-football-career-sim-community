import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Icon } from './ui/Icon';

const SimulatingOverlay: React.FC = () => {
    const { t } = useI18n();

    const simulatingTexts = [
        t('simulating.analyzingMatch'),
        t('simulating.negotiatingContracts'),
        t('simulating.scoutingTalents'),
        t('simulating.finalizingTransfers'),
        t('simulating.runningDrills'),
        t('simulating.reviewingTactics'),
    ];

    const [text, setText] = useState(simulatingTexts[0]);

    useEffect(() => {
        let index = 0;
        const intervalId = setInterval(() => {
            index = (index + 1) % simulatingTexts.length;
            setText(simulatingTexts[index]);
        }, 800);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <div className="text-center text-lg text-gray-300 flex flex-col items-center justify-center space-y-6">
                <Icon name="SoccerBall" size={60} className="text-white animate-spin" weight="regular" />
                <div className="flex flex-col items-center">
                    <span className="animate-pulse font-semibold text-2xl tracking-wide">{t('simulating.title')}</span>
                    <span className="text-sm text-gray-400 mt-2 min-h-[20px]">{text}</span>
                </div>
            </div>
        </div>
    );
};

export default SimulatingOverlay;