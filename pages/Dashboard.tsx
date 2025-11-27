import React, { useState } from 'react';
import { IptvData, Subscription, Customer, Plan, DashboardStats } from '../types';
import { Icon } from '../components/Icon';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
  <div className="bg-slate-800 rounded-xl shadow-lg p-6 flex items-center border border-slate-700 transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-700/50">
    <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600">{icon}</div>
    <div className="ml-4">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  </div>
);

const SubscriptionInfoCard: React.FC<{ 
    subscription: Subscription, 
    customer?: Customer,
    plan?: Plan,
    type: 'expiring' | 'overdue',
    onSendMessage: (customer: Customer, plan: Plan) => void;
    isSent: boolean;
}> = ({ subscription, customer, plan, type, onSendMessage, isSent }) => {
    
    if (!customer || !plan) {
        return <div className="text-slate-400 bg-slate-700/30 p-2 rounded">Dados indisponíveis para assinatura {subscription.id}.</div>;
    }

    const days = Math.round((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

    return (
        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg ring-1 ring-slate-700 gap-4">
            <div className="flex-grow">
                <p className="font-bold text-white">{customer.name}</p>
                <p className="text-sm text-slate-400">{customer.phone}</p>
            </div>
            <div className="text-right flex-shrink-0">
                {type === 'expiring' && <p className="text-sm font-medium text-yellow-400">Vence em {days} dia(s)</p>}
                {type === 'overdue' && <p className="text-sm font-medium text-red-400">Venceu há {Math.abs(days)} dia(s)</p>}
                <p className="text-xs text-slate-300">{new Date(subscription.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
            </div>
            {type === 'expiring' && days <= 3 && (
                <div className="flex-shrink-0">
                    {isSent ? (
                        <button disabled className="flex items-center bg-slate-600 text-slate-300 text-xs font-bold py-1.5 px-3 rounded-md cursor-not-allowed">
                            Enviado
                        </button>
                    ) : (
                        <button onClick={() => onSendMessage(customer, plan)} className="flex items-center bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-all duration-300 transform hover:scale-105">
                           <Icon name="whatsapp" className="w-4 h-4 mr-1.5 fill-current" /> Enviar Lembrete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


interface DashboardProps {
    data: IptvData;
    stats: DashboardStats | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, stats }) => {
  // We use `data` (full list) to lookup names/plans, but `stats` (optimized list) for the structure.
  const [sentMessages, setSentMessages] = useState<Set<string>>(new Set());
  
  const handleSendWhatsAppMessage = (customer: Customer, plan: Plan, subscriptionId: string) => {
    const phone = customer.phone.replace(/\D/g, '');
    if (!phone) {
        alert(`Cliente ${customer.name} não possui um número de telefone válido.`);
        return;
    }
    const countryCode = '55'; // Brazil
    const fullPhone = countryCode + phone;
    const message = `Olá ${customer.name}, sua assinatura do plano ${plan.name} vence em 3 dias. Para renovar e continuar aproveitando, entre em contato conosco. Agradecemos a preferência!`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    
    window.open(url, '_blank');

    setSentMessages(prev => new Set(prev).add(subscriptionId));
  };

  if (!stats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
            ))}
        </div>
      )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-fadeInUp" style={{animationDelay: '100ms'}}><StatCard title="Total de Clientes" value={stats.totalCustomers} icon={<Icon name="users" className="w-7 h-7 text-white" />} /></div>
        <div className="animate-fadeInUp" style={{animationDelay: '200ms'}}><StatCard title="Clientes Ativos" value={stats.activeCustomers} icon={<Icon name="check-circle" className="w-7 h-7 text-white" />} /></div>
        <div className="animate-fadeInUp" style={{animationDelay: '300ms'}}><StatCard title="Clientes Vencidos" value={stats.overdueCustomers} icon={<Icon name="exclamation-triangle" className="w-7 h-7 text-white" />} /></div>
        <div className="animate-fadeInUp" style={{animationDelay: '400ms'}}><StatCard title="Receita Mensal Estimada" value={stats.monthlyRevenue} icon={<Icon name="currency-dollar" className="w-7 h-7 text-white" />} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp" style={{animationDelay: '500ms'}}>
              <h2 className="text-xl font-semibold mb-4 text-white">Vencimentos na Próxima Semana</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.expiringSoon.length > 0 ? (
                    stats.expiringSoon.map(sub => {
                        const customer = data.customers.find(c => c.id === sub.customerId);
                        const plan = data.plans.find(p => p.id === sub.planId);
                        return (
                            <SubscriptionInfoCard 
                                key={sub.id} 
                                subscription={sub} 
                                customer={customer}
                                plan={plan}
                                type="expiring"
                                onSendMessage={(c, p) => handleSendWhatsAppMessage(c, p, sub.id)}
                                isSent={sentMessages.has(sub.id)}
                            />
                        );
                    })
                ) : (
                    <div className="flex justify-center items-center h-48">
                        <p className="text-slate-400">Nenhuma assinatura vencendo nos próximos 7 dias.</p>
                    </div>
                )}
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp" style={{animationDelay: '600ms'}}>
              <h2 className="text-xl font-semibold mb-4 text-white">Assinaturas Vencidas</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.overdueSubscriptions.length > 0 ? (
                     stats.overdueSubscriptions.map(sub => {
                        const customer = data.customers.find(c => c.id === sub.customerId);
                        const plan = data.plans.find(p => p.id === sub.planId);
                         return (
                            <SubscriptionInfoCard 
                                key={sub.id} 
                                subscription={sub} 
                                customer={customer}
                                plan={plan}
                                type="overdue"
                                onSendMessage={() => {}} // No action needed for overdue
                                isSent={false}
                            />
                        );
                     })
                ) : (
                    <div className="flex justify-center items-center h-48">
                        <p className="text-slate-400">Nenhuma assinatura vencida.</p>
                    </div>
                )}
              </div>
            </div>
        </div>
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp" style={{animationDelay: '700ms'}}>
          <h2 className="text-xl font-semibold mb-4 text-white">Atividades Recentes</h2>
           <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.recentActivities.map((activity, index) => {
                const customer = activity.type === 'customer' 
                    ? activity.data as Customer 
                    : data.customers.find(c => c.id === (activity.data as Subscription).customerId);
                
                const plan = activity.type === 'subscription' 
                    ? data.plans.find(p => p.id === (activity.data as Subscription).planId) 
                    : null;
                
                return (
                    <div key={index} className="flex items-center bg-slate-700/50 p-3 rounded-lg ring-1 ring-slate-700">
                        <div className="p-2 bg-slate-600 rounded-full mr-3">
                            <Icon name={activity.type === 'customer' ? 'users' : 'calendar'} className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">
                                {activity.type === 'customer' ? `Novo Cliente: ${customer?.name}` : `Nova Assinatura: ${customer?.name}`}
                            </p>
                            <p className="text-xs text-slate-400">
                                {activity.type === 'subscription' && plan ? `${plan.name} - ` : ''}
                                {activity.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute:'2-digit' })}
                            </p>
                        </div>
                    </div>
                )
            })}
            {stats.recentActivities.length === 0 && (
                 <div className="flex justify-center items-center h-48">
                    <p className="text-slate-400">Nenhuma atividade recente.</p>
                </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};