import React, { useState } from 'react';
import { IptvData, Server } from '../types';

interface PlansAndServersProps {
  data: IptvData;
  actions: {
    addServer: (server: Omit<Server, 'id'>) => Promise<void>;
    updateServer: (server: Server) => Promise<void>;
    deleteServer: (id: string) => Promise<void>;
  };
}

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
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 animate-fadeIn">
      <div className="bg-slate-800 rounded-xl shadow-xl p-8 w-full max-w-2xl border border-slate-700 animate-fadeInUp">
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

export const PlansAndServers: React.FC<PlansAndServersProps> = ({ data, actions }) => {
    const { servers, subscriptions } = data;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<Server | null>(null);

    const handleSave = (serverData: Server | Omit<Server, 'id'>) => {
        if ('id' in serverData) {
            actions.updateServer(serverData);
        } else {
            actions.addServer(serverData);
        }
        setIsModalOpen(false);
        setEditingServer(null);
    };

    const openAddModal = () => {
        setEditingServer(null);
        setIsModalOpen(true);
    };

    const openEditModal = (server: Server) => {
        setEditingServer(server);
        setIsModalOpen(true);
    };
    
    const handleDelete = (server: Server) => {
        const subCount = subscriptions.filter(sub => sub.serverId === server.id).length;
        let confirmMessage = `Tem certeza que deseja excluir o servidor "${server.name}"? Esta ação não pode ser desfeita.`;

        if (subCount > 0) {
            confirmMessage = `O servidor "${server.name}" possui ${subCount} assinatura(s).\n\nAo excluir o servidor, todas essas assinaturas serão CANCELADAS.\n\nDeseja continuar?`;
        }
        
        if (window.confirm(confirmMessage)) {
            actions.deleteServer(server.id);
        }
    };
  
    return (
        <div className="space-y-8 animate-fadeInUp">
            {/* Servers Section */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Servidores Registrados</h2>
                    <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-600/20">
                        Adicionar Servidor
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-700">
                            <tr className="text-slate-400 uppercase text-sm">
                                <th className="p-4">Nome do Servidor</th>
                                <th className="p-4">URL</th>
                                <th className="p-4">Conexões Máximas</th>
                                <th className="p-4">Custo (Créditos)</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {servers.map(server => (
                                <tr key={server.id} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-medium text-white">{server.name}</td>
                                    <td className="p-4 text-slate-300">{server.url}</td>
                                    <td className="p-4 text-slate-300">{server.maxConnections}</td>
                                    <td className="p-4 text-slate-300">{server.creditCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-right space-x-4">
                                        <button onClick={() => openEditModal(server)} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
                                        <button 
                                            onClick={() => handleDelete(server)} 
                                            className="font-medium text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && (
                <ServerForm
                    server={editingServer}
                    onSave={handleSave}
                    onCancel={() => { setIsModalOpen(false); setEditingServer(null); }}
                />
            )}
        </div>
    );
};