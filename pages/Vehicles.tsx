import React, { useState } from 'react';
import { IptvData, Customer } from '../types';

interface CustomersProps {
  data: IptvData;
  actions: {
    addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
    updateCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
  };
}

const CustomerForm: React.FC<{
  customer?: Customer | null;
  onSave: (customer: Customer | Omit<Customer, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}> = ({ customer, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    appName: customer?.appName || '',
    mac: customer?.mac || '',
    key: customer?.key || '',
    notes: customer?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      onSave({ ...customer, ...formData });
    } else {
      onSave(formData);
    }
  };

  const inputClasses = "bg-slate-700 text-white p-3 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 animate-fadeIn">
      <div className="bg-slate-800 rounded-xl shadow-xl p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp">
        <h2 className="text-2xl font-bold mb-6 text-white">{customer ? 'Editar Cliente' : 'Adicionar Cliente'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome Completo" className={inputClasses} required />
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className={inputClasses} />
          </div>
          <input type="text" name="appName" value={formData.appName} onChange={handleChange} placeholder="Nome do Aplicativo" className={inputClasses} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="mac" value={formData.mac} onChange={handleChange} placeholder="Endereço MAC (Opcional)" className={inputClasses} />
            <input type="text" name="key" value={formData.key} onChange={handleChange} placeholder="Key / Código (Opcional)" className={inputClasses} />
          </div>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Observações" rows={3} className={inputClasses}></textarea>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-5 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Customers: React.FC<CustomersProps> = ({ data, actions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { customers, subscriptions } = data;
  
  const handleSave = (customerData: Customer | Omit<Customer, 'id' | 'createdAt'>) => {
    if ('id' in customerData) {
      actions.updateCustomer(customerData);
    } else {
      actions.addCustomer(customerData);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };
  
  const openAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };
  
  const getCustomerStatus = (customerId: string) => {
      const customerSubscriptions = subscriptions.filter(s => s.customerId === customerId);
      if (customerSubscriptions.length === 0) return <span className="text-slate-400">Sem Assinatura</span>;
      
      const hasOverdue = customerSubscriptions.some(s => s.status === 'Vencida');
      if (hasOverdue) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">Vencido</span>;
      
      const hasActive = customerSubscriptions.some(s => s.status === 'Ativa' || s.status === 'Confiança');
      if (hasActive) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">Ativo</span>;

      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300">Inativo</span>;
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 animate-fadeInUp">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Lista de Clientes</h2>
        <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">Adicionar Cliente</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-700">
            <tr className="text-slate-400 uppercase text-sm">
              <th className="p-4">Nome</th>
              <th className="p-4">Aplicativo</th>
              <th className="p-4">MAC</th>
              <th className="p-4">Key</th>
              <th className="p-4">Data de Cadastro</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                <td className="p-4 font-medium text-white">{customer.name}</td>
                <td className="p-4 text-slate-300">{customer.appName}</td>
                <td className="p-4 text-slate-300 font-mono text-xs">{customer.mac || 'N/A'}</td>
                <td className="p-4 text-slate-300 font-mono text-xs">{customer.key || 'N/A'}</td>
                <td className="p-4 text-slate-300">{new Date(customer.createdAt).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td className="p-4">{getCustomerStatus(customer.id)}</td>
                <td className="p-4 text-right space-x-4">
                  <button onClick={() => openEditModal(customer)} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
                  <button onClick={() => actions.deleteCustomer(customer.id)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {isModalOpen && (
        <CustomerForm
          customer={editingCustomer}
          onSave={handleSave}
          onCancel={() => { setIsModalOpen(false); setEditingCustomer(null); }}
        />
      )}
    </div>
  );
};