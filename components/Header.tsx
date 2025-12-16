import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
    return (
        <header className="bg-slate-900/70 backdrop-blur-sm border-b border-slate-700/80 p-4 sm:p-6 z-10 print-hidden flex items-center">
             {onMenuClick && (
                <button 
                    onClick={onMenuClick}
                    className="mr-4 text-slate-400 hover:text-white lg:hidden focus:outline-none focus:text-white"
                >
                    <Icon name="bars-3" className="w-8 h-8" />
                </button>
            )}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">{title}</h1>
        </header>
    );
};