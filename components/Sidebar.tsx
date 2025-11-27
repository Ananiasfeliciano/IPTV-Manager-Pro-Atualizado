import React from 'react';
import { Icon } from './Icon';

type View = 'dashboard' | 'customers' | 'subscriptions' | 'plansAndServers' | 'expenses' | 'automation';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  isOpen?: boolean;
  closeMobileSidebar?: () => void;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <li className="px-3">
        <button
            onClick={onClick}
            className={`flex items-center w-full px-3 py-2.5 transition-colors duration-200 ease-in-out rounded-lg ${
            isActive
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-4 font-semibold">{label}</span>
        </button>
    </li>
);


export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen = false, closeMobileSidebar }) => {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden transition-opacity duration-300"
                    onClick={closeMobileSidebar}
                ></div>
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 flex flex-col border-r border-slate-700 print-hidden transition-transform duration-300 transform
                lg:static lg:inset-0 lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-20 flex items-center justify-between px-4 bg-slate-800">
                    <div className="flex items-center text-white">
                        <Icon name="play-circle" className="w-9 h-9 text-indigo-400"/>
                        <span className="ml-2 text-2xl font-bold">IPTV Pro</span>
                    </div>
                    {/* Close button for mobile inside sidebar header */}
                    <button onClick={closeMobileSidebar} className="lg:hidden text-slate-400 hover:text-white">
                         <Icon name="x-mark" className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto">
                    <ul className="flex flex-col py-4 space-y-2">
                        <NavItem 
                            label="Dashboard" 
                            icon={<Icon name="home" />} 
                            isActive={activeView === 'dashboard'} 
                            onClick={() => setActiveView('dashboard')} />
                        <NavItem 
                            label="Clientes" 
                            icon={<Icon name="users" />} 
                            isActive={activeView === 'customers'} 
                            onClick={() => setActiveView('customers')} />
                        <NavItem 
                            label="Assinaturas" 
                            icon={<Icon name="calendar" />} 
                            isActive={activeView === 'subscriptions'} 
                            onClick={() => setActiveView('subscriptions')} />
                        <NavItem 
                            label="Planos & Servidores" 
                            icon={<Icon name="server-stack" />} 
                            isActive={activeView === 'plansAndServers'} 
                            onClick={() => setActiveView('plansAndServers')} />
                        <NavItem 
                            label="Análise de Custos" 
                            icon={<Icon name="chart-pie" />} 
                            isActive={activeView === 'expenses'} 
                            onClick={() => setActiveView('expenses')} />
                         <NavItem 
                            label="Automação & Bot" 
                            icon={<Icon name="sparkles" />} 
                            isActive={activeView === 'automation'} 
                            onClick={() => setActiveView('automation')} />
                    </ul>
                </nav>
            </aside>
        </>
    );
};