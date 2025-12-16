import React, { useState, useMemo } from 'react';
import { IptvData, Subscription, SubscriptionStatus, Customer, Plan } from '../types';
import { Icon } from '../components/Icon';

interface SubscriptionsProps {
  data: IptvData;
  actions: {
    addSubscription: (record: Omit<Subscription, 'id'>) => Promise<void>;
    updateSubscription: (record: Subscription) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;
    renewSubscription: (id: string, type: 'PAYMENT' | 'TRUST', paymentMethod?: string) => Promise<void>;
  };
}

type SortKey = 'customerName' | 'planName' | 'startDate' | 'endDate' | 'status';
type SortOrder = 'asc' | 'desc';


const SubscriptionForm: React.FC<{
  record?: Subscription | null;
  data: IptvData;
  onSave: (record: Subscription | Omit<Subscription, 'id'>) => void;
  onCancel: () => void;
}> = ({ record, data, onSave, onCancel }) => {
    
  const { customers, plans, servers } = data;

  const [formData, setFormData] = useState({
    customerId: record?.customerId || '',
    planId: record?.planId || '',
    serverId: record?.serverId || '',
    startDate: record?.startDate ? record.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
    isTrustActivation: record?.isTrustActivation || false,
    paymentMethod: record?.paymentMethod || 'PIX', // Default to PIX
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlan = plans.find(p => p.id === formData.planId);
    if (!selectedPlan) {
        alert('Plano inválido!');
        return;
    }

    const startDate = new Date(formData.startDate + 'T00:00:00'); // Set time to prevent timezone issues
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + selectedPlan.durationDays);

    const subscriptionData = {
        ...formData,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: formData.isTrustActivation ? SubscriptionStatus.TRUST : SubscriptionStatus.ACTIVE,
    };
    
    if (record) {
      onSave({ ...subscriptionData, id: record.id });
    } else {
      onSave(subscriptionData);
    }
  };

  const inputClasses = "bg-slate-700 text-white p-3 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-white">{record ? 'Editar Assinatura' : 'Nova Assinatura'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select name="customerId" value={formData.customerId} onChange={handleChange} className={inputClasses} required>
            <option value="">Selecione um Cliente</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="planId" value={formData.planId} onChange={handleChange} className={inputClasses} required>
                <option value="">Selecione um Plano</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>)}
            </select>
             <select name="serverId" value={formData.serverId} onChange={handleChange} className={inputClasses} required>
                <option value="">Selecione um Servidor</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClasses} required />
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={inputClasses}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto">Boleto</option>
                </select>
           </div>

          <div className="flex items-center pt-2">
            <input type="checkbox" id="isTrustActivation" name="isTrustActivation" checked={formData.isTrustActivation} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600 rounded" />
            <label htmlFor="isTrustActivation" className="ml-3 block text-sm text-slate-300">Ativação na Confiança</label>
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

const RenewalModal: React.FC<{
    title: string;
    subtitle: React.ReactNode;
    info?: string;
    onConfirm: (type: 'PAYMENT' | 'TRUST', paymentMethod: string) => void;
    onCancel: () => void;
}> = ({ title, subtitle, info, onConfirm, onCancel }) => {
    const [selectedMethod, setSelectedMethod] = useState('PIX');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
            <div className="bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-700 animate-fadeInUp">
                <div className="text-center mb-6">
                    <div className="bg-indigo-500/20 p-3 rounded-full inline-block mb-3">
                         <Icon name="arrow-path" className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-slate-400 mt-2">{subtitle}</p>
                    {info && <p className="text-sm text-slate-500 mt-1">{info}</p>}
                </div>

                <div className="mb-4">
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Método de Pagamento</label>
                    <select 
                        value={selectedMethod} 
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="bg-slate-700 text-white p-2.5 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="PIX">PIX (Enviar Mensagem)</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Boleto">Boleto</option>
                    </select>
                </div>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => onConfirm('PAYMENT', selectedMethod)}
                        className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-green-900/30 border border-slate-600 hover:border-green-500 rounded-lg transition-all group"
                    >
                        <div className="flex items-center">
                            <Icon name="banknotes" className="w-6 h-6 text-green-400 mr-3 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <p className="font-semibold text-white">Confirmar Renovação</p>
                                <p className="text-xs text-slate-400">
                                    Status: Ativa | Método: {selectedMethod}
                                    {selectedMethod === 'PIX' && ' | Envia Msg'}
                                </p>
                            </div>
                        </div>
                        <Icon name="check-circle" className="w-5 h-5 text-slate-600 group-hover:text-green-500" />
                    </button>

                    <button 
                        onClick={() => onConfirm('TRUST', selectedMethod)}
                        className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-blue-900/30 border border-slate-600 hover:border-blue-500 rounded-lg transition-all group"
                    >
                        <div className="flex items-center">
                            <Icon name="shield-check" className="w-6 h-6 text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <p className="font-semibold text-white">Ativação na Confiança</p>
                                <p className="text-xs text-slate-400">Libera o acesso sem confirmar pagamento.</p>
                            </div>
                        </div>
                        <Icon name="check-circle" className="w-5 h-5 text-slate-600 group-hover:text-blue-500" />
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm font-medium">Cancelar</button>
                </div>
            </div>
        </div>
    );
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ data, actions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Subscription | null>(null);
  const [renewingRecord, setRenewingRecord] = useState<Subscription | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'endDate', order: 'desc' });

  const { subscriptions, customers, plans } = data;

  const mappedSubscriptions = useMemo(() => {
    return subscriptions.map(sub => ({
        ...sub,
        customerName: customers.find(c => c.id === sub.customerId)?.name || 'Desconhecido',
        planName: plans.find(p => p.id === sub.planId)?.name || 'Desconhecido'
    }));
  }, [subscriptions, customers, plans]);

  const filteredAndSortedSubs = useMemo(() => {
    let filtered = mappedSubscriptions.filter(sub => 
        sub.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
  }, [mappedSubscriptions, searchTerm, sortConfig]);

  const requestSort = (key: SortKey) => {
    let order: SortOrder = 'asc';
    if (sortConfig.key === key && sortConfig.order === 'asc') {
      order = 'desc';
    }
    setSortConfig({ key, order });
  };
  
  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    if (sortConfig.order === 'asc') return '▲';
    return '▼';
  }

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(new Set(filteredAndSortedSubs.map(s => s.id)));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectOne = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedIds(newSelected);
  };

  const handleSave = (recordData: Subscription | Omit<Subscription, 'id'>) => {
    if ('id' in recordData) {
      actions.updateSubscription(recordData);
    } else {
      actions.addSubscription(recordData);
    }
    setIsModalOpen(false);
    setEditingRecord(null);
  };
  
  const handleRenew = async (type: 'PAYMENT' | 'TRUST', paymentMethod: string) => {
      const subsToRenew = isBulkMode 
        ? filteredAndSortedSubs.filter(s => selectedIds.has(s.id))
        : (renewingRecord ? [renewingRecord] : []);

      for(const sub of subsToRenew) {
          // 1. Update Database
          await actions.renewSubscription(sub.id, type, paymentMethod);
          
          // 2. WhatsApp Logic (Only if Payment + PIX)
          if (type === 'PAYMENT' && paymentMethod === 'PIX') {
              const customer = customers.find(c => c.id === sub.customerId);
              const plan = plans.find(p => p.id === sub.planId);
              
              if (customer && plan) {
                   const savedTemplates = localStorage.getItem('iptv_msg_templates');
                   const pixKey = localStorage.getItem('iptv_pix_key') || 'CHAVE-PIX-AQUI';
                   const pixName = localStorage.getItem('iptv_pix_name') || 'Nome Beneficiario';
                   
                   let message = '';
                   if (savedTemplates) {
                       const templates = JSON.parse(savedTemplates);
                       if (templates.payment) message = templates.payment.content;
                   }
                   
                   if (!message) {
                        message = `Olá *{cliente_nome}*, segue os dados PIX para o plano *{plano_nome}* (R$ {valor}):\n\n🔑 Chave: {pix_chave}\n👤 Nome: {pix_nome}`;
                   }
                   
                   message = message
                    .replace(/{cliente_nome}/g, customer.name)
                    .replace(/{plano_nome}/g, plan.name)
                    .replace(/{valor}/g, plan.price.toFixed(2).replace('.', ','))
                    .replace(/{pix_chave}/g, pixKey)
                    .replace(/{pix_nome}/g, pixName);

                   const phone = customer.phone.replace(/\D/g, '');
                   const fullPhone = '55' + phone;
                   
                   // Small delay to prevent blocking if multiple (though bulk open is risky)
                   window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
              }
          }
      }

      setSelectedIds(new Set());
      setIsRenewalModalOpen(false);
      setRenewingRecord(null);
      setIsBulkMode(false);
  }

  const openAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: Subscription) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const openRenewalModal = (record: Subscription) => {
      setRenewingRecord(record);
      setIsBulkMode(false);
      setIsRenewalModalOpen(true);
  }

  const openBulkRenewalModal = () => {
      if (selectedIds.size === 0) return;
      setIsBulkMode(true);
      setIsRenewalModalOpen(true);
  }

  const handleDelete = (subscriptionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.')) {
      actions.deleteSubscription(subscriptionId);
    }
  };
  
  const handleSendPaymentMessage = (sub: Subscription) => {
      const customer = customers.find(c => c.id === sub.customerId);
      const plan = plans.find(p => p.id === sub.planId);
      if(!customer || !plan) return;

      const savedTemplates = localStorage.getItem('iptv_msg_templates');
      const pixKey = localStorage.getItem('iptv_pix_key') || 'CHAVE-PIX-AQUI';
      const pixName = localStorage.getItem('iptv_pix_name') || 'Nome Beneficiario';
      
      let message = '';

      if (savedTemplates) {
          const templates = JSON.parse(savedTemplates);
          // Prefer Payment Template if exists, otherwise fallback
          if (templates.payment) {
              message = templates.payment.content;
          }
      }

      // Default message if no template found
      if (!message) {
          message = `Olá *{cliente_nome}*, para renovar o plano *{plano_nome}* no valor de *R$ {valor}*, use o PIX abaixo:\n\n🔑 Chave: {pix_chave}\n👤 Nome: {pix_nome}`;
      }

      // Replace variables
      message = message
        .replace(/{cliente_nome}/g, customer.name)
        .replace(/{plano_nome}/g, plan.name)
        .replace(/{valor}/g, plan.price.toFixed(2).replace('.', ','))
        .replace(/{pix_chave}/g, pixKey)
        .replace(/{pix_nome}/g, pixName);

      const phone = customer.phone.replace(/\D/g, '');
      const fullPhone = '55' + phone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadgeColor = (status: SubscriptionStatus) => {
    switch(status) {
      case SubscriptionStatus.ACTIVE: return 'bg-green-500/20 text-green-300';
      case SubscriptionStatus.OVERDUE: return 'bg-red-500/20 text-red-300';
      case SubscriptionStatus.CANCELED: return 'bg-slate-500/20 text-slate-300';
      case SubscriptionStatus.TRUST: return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  }

  // Calculate modal props dynamically
  const modalProps = useMemo(() => {
      if (isBulkMode) {
          return {
              title: "Renovar em Massa",
              subtitle: <span>Deseja renovar <strong>{selectedIds.size}</strong> assinaturas selecionadas?</span>,
              info: "A data de validade será estendida conforme o plano de cada cliente."
          };
      } else if (renewingRecord) {
          const customer = customers.find(c => c.id === renewingRecord.customerId);
          const plan = plans.find(p => p.id === renewingRecord.planId);
          return {
              title: "Renovar Assinatura",
              subtitle: <span>Escolha o tipo de renovação para <strong>{customer?.name}</strong>.</span>,
              info: `Plano: ${plan?.name} (${plan?.durationDays} dias)`
          };
      }
      return { title: "", subtitle: null };
  }, [isBulkMode, renewingRecord, selectedIds.size, customers, plans]);

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-white">Registros de Assinatura</h2>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            {selectedIds.size > 0 && (
                <button 
                    onClick={openBulkRenewalModal}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-green-600/20 flex items-center animate-fadeIn"
                >
                    <Icon name="arrow-path" className="w-4 h-4 mr-2" />
                    Renovar Selecionadas ({selectedIds.size})
                </button>
            )}
            
            <input 
                type="text"
                placeholder="Buscar assinatura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 text-white p-2 rounded-lg w-full md:w-64 border border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 flex-shrink-0">Nova Assinatura</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-700">
            <tr className="text-slate-400 uppercase text-sm">
              <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={filteredAndSortedSubs.length > 0 && selectedIds.size === filteredAndSortedSubs.length}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                  />
              </th>
              <th className="p-4 cursor-pointer min-w-[150px]" onClick={() => requestSort('customerName')}>Cliente {getSortIcon('customerName')}</th>
              <th className="p-4 cursor-pointer min-w-[150px]" onClick={() => requestSort('planName')}>Plano {getSortIcon('planName')}</th>
              <th className="p-4 cursor-pointer min-w-[140px]" onClick={() => requestSort('startDate')}>Início {getSortIcon('startDate')}</th>
              <th className="p-4 cursor-pointer min-w-[140px]" onClick={() => requestSort('endDate')}>Vencimento {getSortIcon('endDate')}</th>
              <th className="p-4 cursor-pointer min-w-[100px]" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</th>
              <th className="p-4 text-right min-w-[180px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedSubs.length > 0 ? (
                filteredAndSortedSubs.map(record => (
                  <tr key={record.id} className={`border-b border-slate-800 transition-colors ${selectedIds.has(record.id) ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'hover:bg-slate-700/50'}`}>
                    <td className="p-4">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.has(record.id)}
                            onChange={() => handleSelectOne(record.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                        />
                    </td>
                    <td className="p-4 font-medium text-white">{record.customerName}</td>
                    <td className="p-4 text-slate-300">{record.planName}</td>
                    <td className="p-4 text-slate-300">{new Date(record.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td className="p-4 text-slate-300">{new Date(record.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <button title="Cobrar (WhatsApp)" onClick={() => handleSendPaymentMessage(record)} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                            <Icon name="whatsapp" className="w-4 h-4 fill-current" />
                        </button>
                        <button title="Renovar" onClick={() => openRenewalModal(record)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors">
                            <Icon name="arrow-path" className="w-4 h-4" />
                        </button>
                        <button title="Editar" onClick={() => openEditModal(record)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors">
                             <Icon name="pencil" className="w-4 h-4" /> 
                        </button>
                        <button title="Excluir" onClick={() => handleDelete(record.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                            <Icon name="x-mark" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                        <div className="flex flex-col items-center">
                            <Icon name="calendar" className="w-12 h-12 mb-2 text-slate-500" />
                            <h3 className="text-lg font-semibold">Nenhuma assinatura encontrada</h3>
                            <p className="text-sm">Tente ajustar sua busca ou adicione uma nova assinatura.</p>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
       {isModalOpen && (
        <SubscriptionForm
          record={editingRecord}
          data={data}
          onSave={handleSave}
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }}
        />
      )}
      {isRenewalModalOpen && (
          <RenewalModal 
            title={modalProps.title}
            subtitle={modalProps.subtitle}
            info={modalProps.info}
            onConfirm={handleRenew}
            onCancel={() => { setIsRenewalModalOpen(false); setRenewingRecord(null); setIsBulkMode(false); }}
          />
      )}
    </div>
  );
};