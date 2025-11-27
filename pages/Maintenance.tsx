import React, { useState } from 'react';
import { IptvData, Subscription, SubscriptionStatus } from '../types';

interface SubscriptionsProps {
  data: IptvData;
  actions: {
    addSubscription: (record: Omit<Subscription, 'id'>) => Promise<void>;
    updateSubscription: (record: Subscription) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;
  };
}

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
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 animate-fadeIn">
      <div className="bg-slate-800 rounded-xl shadow-xl p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp">
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
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClasses} required />
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

export const Subscriptions: React.FC<SubscriptionsProps> = ({ data, actions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Subscription | null>(null);

  const { subscriptions, customers, plans } = data;

  const handleSave = (recordData: Subscription | Omit<Subscription, 'id'>) => {
    if ('id' in recordData) {
      actions.updateSubscription(recordData);
    } else {
      actions.addSubscription(recordData);
    }
    setIsModalOpen(false);
    setEditingRecord(null);
  };
  
  const openAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: Subscription) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = (subscriptionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.')) {
      actions.deleteSubscription(subscriptionId);
    }
  };

  const getInfo = (type: 'customer' | 'plan', id: string) => {
    if (type === 'customer') return customers.find(c => c.id === id)?.name || 'Desconhecido';
    if (type === 'plan') return plans.find(p => p.id === id)?.name || 'Desconhecido';
    return 'Desconhecido';
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

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Registros de Assinatura</h2>
        <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">Nova Assinatura</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-700">
            <tr className="text-slate-400 uppercase text-sm">
              <th className="p-4">Cliente</th>
              <th className="p-4">Plano</th>
              <th className="p-4">Data de Início</th>
              <th className="p-4">Data de Vencimento</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map(record => (
              <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                <td className="p-4 font-medium text-white">{getInfo('customer', record.customerId)}</td>
                <td className="p-4 text-slate-300">{getInfo('plan', record.planId)}</td>
                <td className="p-4 text-slate-300">{new Date(record.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td className="p-4 text-slate-300">{new Date(record.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-4">
                  <button onClick={() => openEditModal(record)} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
                  <button onClick={() => handleDelete(record.id)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Excluir</button>
                </td>
              </tr>
            ))}
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
    </div>
  );
};