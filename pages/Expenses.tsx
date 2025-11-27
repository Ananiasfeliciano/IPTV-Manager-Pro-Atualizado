import React, { useMemo } from 'react';
import { IptvData } from '../types';
import { Icon } from '../components/Icon';


interface ExpensesProps {
  data: IptvData;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-slate-800 rounded-xl shadow-lg p-6 flex items-center border border-slate-700 transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-700/50">
    <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600">{icon}</div>
    <div className="ml-4">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  </div>
);


const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);
  
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-slate-400">Nenhum dado de despesa para exibir.</div>;
  }

  return (
     <div className="w-full space-y-2 pt-4">
        {data.map((d, i) => {
            const percentage = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
            return (
                <div key={d.label} className="group">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-300">{d.label}</span>
                        <span className="text-sm font-bold text-indigo-400">{d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div 
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 group-hover:bg-indigo-500" 
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};


export const Expenses: React.FC<{ data: IptvData }> = ({ data }) => {
  const { subscriptions, customers, plans, servers } = data;

  const expenseData = useMemo(() => {
    // Custo total de créditos
    const totalCreditCost = subscriptions.reduce((acc, sub) => {
      const server = servers.find(s => s.id === sub.serverId);
      const plan = plans.find(p => p.id === sub.planId);
      if (!server || !plan) return acc;
      
      const months = plan.durationDays / 30;
      return acc + (server.creditCost * months);
    }, 0);

    // Custo por Servidor
    const costByServer = servers.map(server => {
      const serverSubs = subscriptions.filter(r => r.serverId === server.id);
      const serverCost = serverSubs.reduce((acc, sub) => {
        const plan = plans.find(p => p.id === sub.planId);
        if (!plan) return acc;
        const months = plan.durationDays / 30;
        return acc + (server.creditCost * months);
      }, 0);
      return {
        label: server.name,
        value: serverCost,
      };
    }).sort((a,b) => b.value - a.value);

    // Custo por Plano
    const costByPlan = plans.reduce((acc: Record<string, number>, curr) => {
        const subsForPlan = subscriptions.filter(s => s.planId === curr.id);
        subsForPlan.forEach(sub => {
            const server = servers.find(s => s.id === sub.serverId);
            if(server) {
                const months = curr.durationDays / 30;
                acc[curr.name] = (acc[curr.name] || 0) + (server.creditCost * months);
            }
        });
        return acc;
    }, {});
    
    const sortedCostByPlan = Object.entries(costByPlan)
        .map(([planName, value]) => ({ name: planName, value: Number(value) || 0 }))
        .sort((a, b) => b.value - a.value);

    // Custo por Cliente
    const costByCustomer = customers.map(customer => {
        const customerSubs = subscriptions.filter(s => s.customerId === customer.id);
        const totalCost = customerSubs.reduce((acc, sub) => {
            const server = servers.find(s => s.id === sub.serverId);
            const plan = plans.find(p => p.id === sub.planId);
            if (!server || !plan) return acc;
            
            const months = plan.durationDays / 30;
            return acc + (server.creditCost * months);
        }, 0);
        
        return { name: customer.name, value: totalCost };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50); // Top 50 clientes que mais gastam
    
    // Otimizações
    const optimizations: string[] = [];
    const highestCostServer = costByServer[0];
    const averageCost = totalCreditCost / (servers.length || 1);

    if (highestCostServer && highestCostServer.value > averageCost * 1.5 && servers.length > 1) {
        optimizations.push(`O servidor **${highestCostServer.label}** tem um custo de crédito significativamente alto. Considere migrar clientes para servidores com custo menor se a qualidade for similar.`);
    }
    
    const highestCostPlan = sortedCostByPlan[0];
    if(highestCostPlan) {
        optimizations.push(`O plano **${highestCostPlan.name}** gera o maior custo em créditos. Avalie se o preço de venda deste plano cobre adequadamente seus custos e margem de lucro.`);
    }

    if (totalCreditCost > 0) {
        const cheapestServer = [...servers].sort((a, b) => a.creditCost - b.creditCost)[0];
        if (cheapestServer) {
            optimizations.push(`Para novas assinaturas, priorize o servidor **${cheapestServer.name}** que possui o menor custo por crédito (**${cheapestServer.creditCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**), otimizando a margem de lucro.`);
        }
    }


    return {
      totalCreditCost,
      finalCreditValue: totalCreditCost,
      costByServer,
      costByPlan: sortedCostByPlan,
      costByCustomer,
      optimizations,
    };
  }, [subscriptions, customers, plans, servers]);
  
  const formatSuggestion = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <p>
            {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="font-bold text-indigo-400">{part}</strong> : part
            )}
        </p>
    );
  };


  return (
    <div className="space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center print-hidden">
            <h2 className="text-xl font-semibold text-white">Análise de Custos de Crédito</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
                title="Custo Total (Créditos)" 
                value={expenseData.totalCreditCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                icon={<Icon name="currency-dollar" className="w-7 h-7 text-white" />} />
            <StatCard 
                title="Valor Final (Créditos)" 
                value={expenseData.finalCreditValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                icon={<Icon name="check-circle" className="w-7 h-7 text-white" />} />
        </div>
    
        {expenseData.optimizations.length > 0 && (
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Icon name="light-bulb" className="w-6 h-6 mr-3 text-yellow-400" />
                    Sugestões de Otimização de Custos
                </h3>
                <div className="space-y-3">
                    {expenseData.optimizations.map((suggestion, index) => (
                        <div key={index} className="flex items-start bg-slate-700/50 p-3 rounded-lg ring-1 ring-slate-700">
                            <Icon name="check-circle" className="w-5 h-5 mr-3 mt-1 text-green-400 flex-shrink-0" />
                            <div className="text-slate-300 text-sm">
                                {formatSuggestion(suggestion)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Full width chart for Server Costs */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Custo por Servidor</h2>
            <BarChart data={expenseData.costByServer} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-white">Custo por Plano</h2>
                <div className="space-y-4 max-h-[340px] overflow-y-auto">
                    {expenseData.costByPlan.map(plan => (
                        <div key={plan.name} className="flex justify-between items-center bg-slate-700/80 p-3 rounded-lg">
                            <span className="font-medium text-white">{plan.name}</span>
                            <span className="font-semibold text-indigo-400">
                                {plan.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    ))}
                    {expenseData.costByPlan.length === 0 && <p className="text-slate-400">Nenhum custo por plano registrado.</p>}
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-white">Top Clientes por Custo</h2>
                <div className="space-y-4 max-h-[340px] overflow-y-auto">
                    {expenseData.costByCustomer.map(customer => (
                        <div key={customer.name} className="flex justify-between items-center bg-slate-700/80 p-3 rounded-lg">
                            <div className="flex items-center">
                                <Icon name="users" className="w-5 h-5 mr-3 text-slate-400" />
                                <span className="font-medium text-white">{customer.name}</span>
                            </div>
                            <span className="font-semibold text-red-400">
                                - {customer.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    ))}
                    {expenseData.costByCustomer.length === 0 && <p className="text-slate-400">Nenhum custo por cliente registrado.</p>}
                </div>
            </div>
        </div>
    </div>
  );
};