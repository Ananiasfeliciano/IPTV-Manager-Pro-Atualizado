import React, { useState } from 'react';
import { IptvData, Server, Plan, ExternalPanelConfig } from '../types';
import { Icon } from '../components/Icon';
import { useIptvData } from '../hooks/useIptvData'; // Import hook to use import function

interface PlansAndServersProps {
  data: IptvData;
  actions: {
    addServer: (server: Omit<Server, 'id'>) => Promise<void>;
    updateServer: (server: Server) => Promise<void>;
    deleteServer: (id: string) => Promise<void>;
    addPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
    updatePlan: (plan: Plan) => Promise<void>;
    deletePlan: (id: string) => Promise<void>;
  };
}

// --- Server Form Modal ---
const ServerForm: React.FC<{
  server?: Server | null;
  onSave: (server: Server | Omit<Server, 'id'>) => void;
  onCancel: () => void;
}> = ({ server, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: server?.name || '',
    url: server?.url || '',
    maxConnections: server?.maxConnections || 0,
    creditCost: server?.creditCost || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (server) {
      onSave({ ...formData, id: server.id });
    } else {
      onSave(formData);
    }
  };

  const inputClasses = "bg-slate-700 text-white p-3 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-white">{server ? 'Editar Servidor' : 'Adicionar Servidor'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Servidor" className={inputClasses} required />
          <input type="text" name="url" value={formData.url} onChange={handleChange} placeholder="URL" className={inputClasses} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="number" name="maxConnections" value={formData.maxConnections} onChange={handleChange} placeholder="Conexões Máximas" className={inputClasses} required />
            <input type="number" step="0.01" name="creditCost" value={formData.creditCost} onChange={handleChange} placeholder="Custo do Crédito" className={inputClasses} required />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-5 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Plan Form Modal ---
const PlanForm: React.FC<{
  plan?: Plan | null;
  onSave: (plan: Plan | Omit<Plan, 'id'>) => void;
  onCancel: () => void;
}> = ({ plan, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    price: plan?.price || 0,
    durationDays: plan?.durationDays || 30,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({...prev, name: e.target.value}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan) {
      onSave({ ...plan, ...formData });
    } else {
      onSave(formData);
    }
  };

  const inputClasses = "bg-slate-700 text-white p-3 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-white">{plan ? 'Editar Plano' : 'Adicionar Plano'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" value={formData.name} onChange={handleNameChange} placeholder="Nome do Plano" className={inputClasses} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} placeholder="Preço (R$)" className={inputClasses} required />
            <input type="number" name="durationDays" value={formData.durationDays} onChange={handleChange} placeholder="Duração (dias)" className={inputClasses} required />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-5 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export const PlansAndServers: React.FC<PlansAndServersProps> = ({ data, actions }) => {
    const { servers, subscriptions, plans } = data;
    // Hooks for modals
    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<Server | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    
    // Tab state for Integration
    const [activeTab, setActiveTab] = useState<'lists' | 'integration'>('lists');
    
    // Integration State
    const [extConfig, setExtConfig] = useState<ExternalPanelConfig>({
        url: '',
        username: '',
        password: '',
        userPrefix: ''
    });
    const [defaultServerId, setDefaultServerId] = useState<string>('');
    const [defaultPlanId, setDefaultPlanId] = useState<string>('');
    
    // Use the hook to get the import function
    const { importFromPanel, loading: isImporting } = useIptvData();

    // Server handlers
    const handleServerSave = (serverData: Server | Omit<Server, 'id'>) => {
        if ('id' in serverData) actions.updateServer(serverData);
        else actions.addServer(serverData);
        setIsServerModalOpen(false);
        setEditingServer(null);
    };
    const openAddServerModal = () => {
        setEditingServer(null);
        setIsServerModalOpen(true);
    };
    const openEditServerModal = (server: Server) => {
        setEditingServer(server);
        setIsServerModalOpen(true);
    };
    const handleDeleteServer = (server: Server) => {
        const subCount = subscriptions.filter(sub => sub.serverId === server.id).length;
        let confirmMessage = `Tem certeza que deseja excluir o servidor "${server.name}"? Esta ação não pode ser desfeita.`;
        if (subCount > 0) {
            confirmMessage = `O servidor "${server.name}" possui ${subCount} assinatura(s).\n\nAo excluir o servidor, todas essas assinaturas serão CANCELADAS.\n\nDeseja continuar?`;
        }
        if (window.confirm(confirmMessage)) actions.deleteServer(server.id);
    };
    
    // Plan handlers
    const handlePlanSave = (planData: Plan | Omit<Plan, 'id'>) => {
        if ('id' in planData) actions.updatePlan(planData);
        else actions.addPlan(planData);
        setIsPlanModalOpen(false);
        setEditingPlan(null);
    };
    const openAddPlanModal = () => {
        setEditingPlan(null);
        setIsPlanModalOpen(true);
    };
    const openEditPlanModal = (plan: Plan) => {
        setEditingPlan(plan);
        setIsPlanModalOpen(true);
    };
    const handleDeletePlan = (plan: Plan) => {
        const subCount = subscriptions.filter(sub => sub.planId === plan.id).length;
        let confirmMessage = `Tem certeza que deseja excluir o plano "${plan.name}"?`;
        if (subCount > 0) {
            confirmMessage = `O plano "${plan.name}" é usado por ${subCount} assinatura(s).\n\nAo excluir o plano, essas assinaturas serão CANCELADAS.\n\nDeseja continuar?`;
        }
        if (window.confirm(confirmMessage)) actions.deletePlan(plan.id);
    };
    
    const applyPreset = (preset: 'cloudnation' | 'ultron') => {
        if (preset === 'cloudnation') {
            setExtConfig({
                url: 'https://painel.cloudnation.top',
                username: 'Ananiasrev2025',
                password: '10203040',
                userPrefix: 'cn'
            });
        } else if (preset === 'ultron') {
             setExtConfig(prev => ({
                ...prev,
                url: 'https://ultrontv.sigma.st/',
                userPrefix: 'ult'
             }));
        }
    };

    const handleImport = () => {
        if(!defaultServerId || !defaultPlanId) {
            alert("Selecione um Servidor e um Plano padrão para associar aos clientes importados.");
            return;
        }
        importFromPanel(extConfig, defaultServerId, defaultPlanId);
    };
  
    return (
        <div className="space-y-6 animate-fadeInUp">
            
            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-slate-700 pb-2">
                <button 
                    onClick={() => setActiveTab('lists')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'lists' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Planos & Servidores
                    {activeTab === 'lists' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('integration')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'integration' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center">
                        <Icon name="arrow-path" className="w-4 h-4 mr-2" />
                        Integração Multpainel
                    </div>
                     {activeTab === 'integration' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>}
                </button>
            </div>

            {activeTab === 'lists' ? (
                <>
                {/* Plans Section */}
                <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">Planos de Assinatura</h2>
                        <button onClick={openAddPlanModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">
                            Adicionar Plano
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-700">
                                <tr className="text-slate-400 uppercase text-sm">
                                    <th className="p-4 min-w-[150px]">Nome do Plano</th>
                                    <th className="p-4 min-w-[100px]">Preço</th>
                                    <th className="p-4 min-w-[100px]">Duração</th>
                                    <th className="p-4 text-right min-w-[150px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map(plan => (
                                    <tr key={plan.id} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium text-white">{plan.name}</td>
                                        <td className="p-4 text-slate-300">{plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-4 text-slate-300">{plan.durationDays} dias</td>
                                        <td className="p-4 text-right space-x-4">
                                            <button onClick={() => openEditPlanModal(plan)} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
                                            <button onClick={() => handleDeletePlan(plan)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Servers Section */}
                <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">Servidores Registrados</h2>
                        <button onClick={openAddServerModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">
                            Adicionar Servidor
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-700">
                                <tr className="text-slate-400 uppercase text-sm">
                                    <th className="p-4 min-w-[150px]">Nome do Servidor</th>
                                    <th className="p-4 min-w-[150px]">URL</th>
                                    <th className="p-4 min-w-[150px]">Conexões Ativas / Máx.</th>
                                    <th className="p-4 min-w-[120px]">Custo (Créditos)</th>
                                    <th className="p-4 text-right min-w-[150px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servers.map(server => {
                                    const activeConnections = subscriptions.filter(s => s.serverId === server.id && (s.status === 'Ativa' || s.status === 'Confiança')).length;
                                    return (
                                    <tr key={server.id} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium text-white">{server.name}</td>
                                        <td className="p-4 text-slate-300">{server.url}</td>
                                        <td className="p-4 text-slate-300">{activeConnections} / {server.maxConnections}</td>
                                        <td className="p-4 text-slate-300">{server.creditCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-4 text-right space-x-4">
                                            <button onClick={() => openEditServerModal(server)} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
                                            <button onClick={() => handleDeleteServer(server)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Excluir</button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            ) : (
                // INTEGRATION TAB
                <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700 max-w-3xl mx-auto">
                    <div className="flex items-center mb-6">
                        <div className="bg-indigo-600 p-3 rounded-lg mr-4">
                            <Icon name="server-stack" className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Integração Multpainel</h2>
                            <p className="text-slate-400">Importe usuários diretamente de painéis externos via API Xtream Codes.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* PRESETS BUTTONS */}
                        <div className="flex gap-4">
                             <button 
                                onClick={() => applyPreset('cloudnation')}
                                className="flex-1 bg-slate-700 hover:bg-indigo-900/50 text-slate-200 hover:text-white py-2 px-4 rounded-lg border border-slate-600 transition-all text-xs font-semibold uppercase tracking-wider"
                             >
                                Preencher: CloudNation
                             </button>
                             <button 
                                onClick={() => applyPreset('ultron')}
                                className="flex-1 bg-slate-700 hover:bg-purple-900/50 text-slate-200 hover:text-white py-2 px-4 rounded-lg border border-slate-600 transition-all text-xs font-semibold uppercase tracking-wider"
                             >
                                Preencher: Ultron TV
                             </button>
                        </div>

                        <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                            <h3 className="text-white font-semibold mb-3">Credenciais de Acesso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">URL do Painel (DNS)</label>
                                    <input 
                                        type="text" 
                                        value={extConfig.url} 
                                        onChange={e => setExtConfig({...extConfig, url: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="http://painel.exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Usuário</label>
                                    <input 
                                        type="text" 
                                        value={extConfig.username} 
                                        onChange={e => setExtConfig({...extConfig, username: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
                                    <input 
                                        type="password" 
                                        value={extConfig.password} 
                                        onChange={e => setExtConfig({...extConfig, password: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                            <h3 className="text-white font-semibold mb-3">Configuração de Importação</h3>
                            <p className="text-xs text-slate-400 mb-4">Escolha como os clientes importados serão classificados no sistema local.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Servidor Local de Destino</label>
                                    <select 
                                        value={defaultServerId}
                                        onChange={e => setDefaultServerId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Selecione um Servidor...</option>
                                        {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Plano Padrão</label>
                                    <select 
                                        value={defaultPlanId}
                                        onChange={e => setDefaultPlanId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Selecione um Plano...</option>
                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                 <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Prefixo do Cliente (Opcional)</label>
                                    <div className="flex items-center">
                                        <span className="bg-slate-700 border border-r-0 border-slate-600 rounded-l p-2.5 text-slate-400 text-sm">Prefix</span>
                                        <input 
                                            type="text" 
                                            value={extConfig.userPrefix || ''} 
                                            onChange={e => setExtConfig({...extConfig, userPrefix: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-r p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="ex: ult (Resultado: ult_usuario)"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Adiciona um prefixo ao nome do cliente para diferenciar de outros painéis.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-start">
                            <Icon name="exclamation-circle" className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="text-sm text-blue-200">
                                <strong>Nota sobre CORS:</strong> Se o painel externo não permitir requisições diretas do navegador (CORS), a sincronização falhará. Para testes locais, utilize uma extensão de navegador "Allow CORS".
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={handleImport}
                                disabled={isImporting || !defaultServerId || !defaultPlanId || !extConfig.url}
                                className={`flex items-center px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all ${
                                    isImporting || !defaultServerId || !defaultPlanId || !extConfig.url
                                    ? 'bg-slate-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transform hover:scale-105'
                                }`}
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="arrow-path" className="w-5 h-5 mr-2" />
                                        Sincronizar Clientes Agora
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isServerModalOpen && <ServerForm server={editingServer} onSave={handleServerSave} onCancel={() => setIsServerModalOpen(false)} />}
            {isPlanModalOpen && <PlanForm plan={editingPlan} onSave={handlePlanSave} onCancel={() => setIsPlanModalOpen(false)} />}
        </div>
    );
};