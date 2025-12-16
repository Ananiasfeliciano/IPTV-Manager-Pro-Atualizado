import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { IptvData, Subscription, SubscriptionStatus } from '../types';
import { generatePersonalizedMessage, improveTemplateText } from '../services/aiService';

// Tipos para os templates
type TemplateType = 'welcome' | 'reminder' | 'overdue' | 'payment';

interface MessageTemplate {
    type: TemplateType;
    label: string;
    content: string;
    variables: string[];
}

interface LogEntry {
    id: number;
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
    message: string;
    time: string;
}

interface AutomationProps {
    data?: IptvData;
}

const DEFAULT_TEMPLATES: Record<TemplateType, MessageTemplate> = {
    welcome: {
        type: 'welcome',
        label: 'Boas Vindas / Dados de Acesso',
        content: `Olá *{cliente_nome}*! Seja bem-vindo(a)! 🚀\n\nAqui estão seus dados de acesso:\n\n👤 *Usuário:* {login}\n🔑 *Senha:* {senha}\n🌐 *URL:* {url_servidor}\n📲 *App Recomendado:* {app_nome}\n\nQualquer dúvida, estou à disposição!`,
        variables: ['{cliente_nome}', '{login}', '{senha}', '{url_servidor}', '{app_nome}']
    },
    reminder: {
        type: 'reminder',
        label: 'Lembrete de Vencimento (Pré)',
        content: `Olá *{cliente_nome}*, tudo bem?\n\nPassando para lembrar que sua assinatura do plano *{plano_nome}* vence em *{dias_restantes} dias* ({vencimento}).\n\nEvite o bloqueio renovando agora! 👇`,
        variables: ['{cliente_nome}', '{plano_nome}', '{dias_restantes}', '{vencimento}']
    },
    overdue: {
        type: 'overdue',
        label: 'Aviso de Vencimento / Bloqueio',
        content: `Oi *{cliente_nome}*, sua assinatura venceu hoje! ⚠️\n\nPara não perder o acesso aos canais e filmes, renove sua assinatura.\n\nValor: *R$ {valor}*\n\nPodemos renovar?`,
        variables: ['{cliente_nome}', '{valor}']
    },
    payment: {
        type: 'payment',
        label: 'Dados de Pagamento (PIX)',
        content: `Olá *{cliente_nome}*, evite o bloqueio do seu plano *{plano_nome}*! \n\nPara renovar, utilize a chave PIX abaixo:\n\n💠 *Chave PIX:* {pix_chave}\n👤 *Beneficiário:* {pix_nome}\n💰 *Valor:* R$ {valor}\n\nPor favor, envie o comprovante assim que possível! ✅`,
        variables: ['{cliente_nome}', '{plano_nome}', '{pix_chave}', '{pix_nome}', '{valor}']
    }
};

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; label?: string }> = ({ enabled, onChange, label }) => {
  return (
    <div className="flex items-center justify-between py-2">
        {label && <span className="text-slate-300 font-medium mr-4">{label}</span>}
        <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
            enabled ? 'bg-indigo-600' : 'bg-slate-600'
        }`}
        >
        <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${
            enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
        </button>
    </div>
  );
};

export const Automation: React.FC<AutomationProps> = ({ data }) => {
    const [viewMode, setViewMode] = useState<'settings' | 'collections'>('settings');

    // Connection State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    
    // Config State
    const [templates, setTemplates] = useState<Record<TemplateType, MessageTemplate>>(DEFAULT_TEMPLATES);
    const [activeTab, setActiveTab] = useState<TemplateType>('welcome');
    
    // Loading States for AI
    const [loadingAi, setLoadingAi] = useState<string | null>(null); // ID or 'template'
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    
    // Logs
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Load from LocalStorage
    useEffect(() => {
        const savedTemplates = localStorage.getItem('iptv_msg_templates');
        if (savedTemplates) {
            setTemplates(JSON.parse(savedTemplates));
        }

        addLog('INFO', 'Sistema de automação inicializado.');
    }, []);

    // Save to LocalStorage whenever templates change
    useEffect(() => {
        localStorage.setItem('iptv_msg_templates', JSON.stringify(templates));
    }, [templates]);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (level: LogEntry['level'], message: string) => {
        const now = new Date().toLocaleTimeString('pt-BR');
        setLogs(prev => [...prev, { id: Date.now(), level, message, time: now }]);
    };

    const handleConnect = () => {
        setIsConnecting(true);
        addLog('INFO', 'Iniciando conexão com WhatsApp Web...');
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
            addLog('SUCCESS', 'Conexão estabelecida com sucesso!');
            addLog('INFO', 'Bot ativo e aguardando comandos.');
        }, 2500);
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        addLog('WARN', 'Desconectado do WhatsApp.');
    };

    const handleTemplateChange = (text: string) => {
        setTemplates(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                content: text
            }
        }));
    };

    const resetTemplate = () => {
        if(window.confirm('Deseja restaurar o modelo padrão para esta mensagem?')) {
            setTemplates(prev => ({
                ...prev,
                [activeTab]: DEFAULT_TEMPLATES[activeTab]
            }));
            addLog('INFO', `Template '${DEFAULT_TEMPLATES[activeTab].label}' restaurado.`);
        }
    };

    const insertVariable = (variable: string) => {
        const textArea = document.getElementById('messageEditor') as HTMLTextAreaElement;
        if (textArea) {
            const start = textArea.selectionStart;
            const end = textArea.selectionEnd;
            const text = templates[activeTab].content;
            const newText = text.substring(0, start) + variable + text.substring(end);
            
            setTemplates(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], content: newText }
            }));
        }
    };

    // --- AI Integration Functions ---

    const handleAiImproveTemplate = async () => {
        setLoadingAi('template');
        addLog('INFO', 'Solicitando melhoria de texto ao Gemini AI...');
        
        const currentText = templates[activeTab].content;
        const improvedText = await improveTemplateText(currentText, templates[activeTab].label);
        
        if (improvedText && improvedText !== currentText) {
            handleTemplateChange(improvedText);
            addLog('SUCCESS', 'Template melhorado com Inteligência Artificial!');
        } else {
            addLog('WARN', 'Não foi possível melhorar o texto ou a IA retornou vazio.');
        }
        setLoadingAi(null);
    };

    const handleAiMessageGen = async (item: {sub: Subscription, customer: any, plan: any}, type: 'reminder' | 'payment') => {
        const { sub, customer, plan } = item;
        setLoadingAi(sub.id);
        addLog('INFO', `Gerando mensagem personalizada para ${customer.name} com Gemini...`);

        const daysDiff = Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        const formattedDate = new Date(sub.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

        const aiMessage = await generatePersonalizedMessage(
            customer.name,
            plan.name,
            plan.price,
            formattedDate,
            daysDiff,
            type
        );

        setLoadingAi(null);

        if (aiMessage) {
            // Append PIX info if it's payment
            let finalMessage = aiMessage;
            if (type === 'payment') {
                 const pixKey = localStorage.getItem('iptv_pix_key') || 'CHAVE-PIX';
                 const pixName = localStorage.getItem('iptv_pix_name') || 'Nome';
                 finalMessage += `\n\n🔑 PIX: ${pixKey}\n👤 ${pixName}`;
            }

            const phone = customer.phone.replace(/\D/g, '');
            const fullPhone = '55' + phone;
            window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(finalMessage)}`, '_blank');
            addLog('SUCCESS', `Mensagem IA enviada para ${customer.name}`);
        } else {
            addLog('ERROR', 'Falha ao gerar mensagem com IA. Tente o envio padrão.');
        }
    };

    // --- Collection Logic ---
    const collectionQueue = useMemo(() => {
        if (!data) return [];
        const today = new Date();
        const warningDate = new Date();
        // Alterado de 5 para 3 dias conforme solicitação para focar nos "prestes a vencer"
        warningDate.setDate(today.getDate() + 3); 

        return data.subscriptions.filter(sub => {
            // Include overdue
            if (sub.status === SubscriptionStatus.OVERDUE) return true;
            // Include active but expiring soon (next 3 days)
            if (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRUST) {
                const endDate = new Date(sub.endDate);
                return endDate <= warningDate;
            }
            return false;
        }).map(sub => {
            const customer = data.customers.find(c => c.id === sub.customerId);
            const plan = data.plans.find(p => p.id === sub.planId);
            return { sub, customer, plan };
        }).filter(item => item.customer && item.plan);
    }, [data]);

    const handleSendMessage = (item: {sub: Subscription, customer: any, plan: any}, type: 'reminder' | 'payment') => {
        const { sub, customer, plan } = item;
        const pixKey = localStorage.getItem('iptv_pix_key') || 'CHAVE-PIX-AQUI';
        const pixName = localStorage.getItem('iptv_pix_name') || 'Nome Beneficiario';
        
        const template = type === 'reminder' ? templates.reminder : templates.payment;
        let message = template.content;

        const daysDiff = Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        const formattedDate = new Date(sub.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        
        message = message
            .replace(/{cliente_nome}/g, customer.name)
            .replace(/{plano_nome}/g, plan.name)
            .replace(/{valor}/g, plan.price.toFixed(2).replace('.', ','))
            .replace(/{pix_chave}/g, pixKey)
            .replace(/{pix_nome}/g, pixName)
            .replace(/{dias_restantes}/g, daysDiff.toString())
            .replace(/{vencimento}/g, formattedDate);

        const phone = customer.phone.replace(/\D/g, '');
        const fullPhone = '55' + phone;
        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
        
        const logMsg = type === 'reminder' 
            ? `Lembrete enviado para ${customer.name}`
            : `Cobrança PIX enviada para ${customer.name}`;
            
        addLog('SUCCESS', logMsg);
    };

    const handleBatchAutoSend = async () => {
        if (collectionQueue.length === 0) {
            addLog('WARN', 'A fila está vazia. Nada para enviar.');
            return;
        }

        if (!window.confirm(`Você está prestes a enviar ${collectionQueue.length} mensagens AUTOMATICAMENTE.\n\nIsso abrirá várias abas do WhatsApp. Certifique-se de que os POP-UPS estão PERMITIDOS neste site.\n\nDeseja continuar?`)) {
            return;
        }

        setIsBatchProcessing(true);
        addLog('INFO', `Iniciando disparo em massa para ${collectionQueue.length} clientes...`);

        // Create a delay helper
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < collectionQueue.length; i++) {
            const item = collectionQueue[i];
            
            // Lógica Solicitada: Enviar 'Dados de Pagamento (PIX)' para vencidos OU vencendo em até 3 dias.
            // A collectionQueue já filtra por <= 3 dias ou vencidos.
            // Portanto, forçamos o tipo 'payment' para garantir que os dados PIX sejam enviados.
            handleSendMessage(item, 'payment');

            addLog('INFO', `[${i + 1}/${collectionQueue.length}] Processando ${item.customer.name}...`);
            
            // Aguarda 2 segundos entre envios para evitar bloqueio do navegador/wpp
            if (i < collectionQueue.length - 1) {
                await delay(2000); 
            }
        }

        setIsBatchProcessing(false);
        addLog('SUCCESS', 'Disparo em massa finalizado!');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Icon name="sparkles" className="w-8 h-8 text-indigo-400" />
                        Central de Automação & Bot
                    </h2>
                    <p className="text-slate-400 mt-1">Gerencie mensagens, templates e cobranças automáticas.</p>
                </div>
                
                <div className="flex items-center gap-3">
                     {/* View Toggles */}
                    <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex">
                        <button 
                            onClick={() => setViewMode('settings')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Configuração
                        </button>
                        <button 
                            onClick={() => setViewMode('collections')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${viewMode === 'collections' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Fila de Disparos
                            {collectionQueue.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{collectionQueue.length}</span>}
                        </button>
                    </div>

                    <div className="flex items-center bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`font-semibold mr-4 ${isConnected ? 'text-green-400' : 'text-slate-400'} hidden sm:inline`}>
                            {isConnected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        {isConnected ? (
                            <button onClick={handleDisconnect} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm transition-colors border border-red-500/30">
                                Desconectar
                            </button>
                        ) : (
                            <button onClick={handleConnect} disabled={isConnecting} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm transition-colors border border-green-500/30 flex items-center">
                            {isConnecting ? 'Conectando...' : 'Conectar Bot'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'settings' ? (
                // --- SETTINGS VIEW ---
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {!isConnected && !isConnecting && (
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg flex flex-col md:flex-row items-center gap-6 animate-fadeInUp">
                                <div className="bg-white p-3 rounded-lg flex-shrink-0">
                                    <Icon name="qr-code" className="w-32 h-32 text-slate-900" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Conecte seu WhatsApp</h3>
                                    <p className="text-slate-400 mb-4">Escaneie o QR Code para permitir o envio automático.</p>
                                    <button onClick={handleConnect} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-indigo-600/20 transition-all">
                                        Gerar QR Code
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-wrap gap-2">
                                {Object.values(templates).map((tpl) => (
                                    <button
                                        key={tpl.type}
                                        onClick={() => setActiveTab(tpl.type)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            activeTab === tpl.type 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
                                        }`}
                                    >
                                        {tpl.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-white">Editar Mensagem: <span className="text-indigo-400">{templates[activeTab].label}</span></h3>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleAiImproveTemplate}
                                            disabled={loadingAi === 'template'}
                                            className="flex items-center text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors"
                                        >
                                            <Icon name="sparkles" className="w-3 h-3 mr-1" />
                                            {loadingAi === 'template' ? 'Gerando...' : 'Melhorar com IA'}
                                        </button>
                                        <button onClick={resetTemplate} className="text-xs text-slate-400 hover:text-white underline">Restaurar Padrão</button>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Variáveis Disponíveis</span>
                                    <div className="flex flex-wrap gap-2">
                                        {templates[activeTab].variables.map(variable => (
                                            <button 
                                                key={variable}
                                                onClick={() => insertVariable(variable)}
                                                className="bg-slate-700 hover:bg-slate-600 text-indigo-300 text-xs px-2 py-1 rounded border border-slate-600 transition-colors"
                                            >
                                                {variable}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    id="messageEditor"
                                    value={templates[activeTab].content}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    className="flex-1 w-full bg-slate-900/50 text-slate-100 p-4 rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm leading-relaxed resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
                            <h3 className="font-bold text-white mb-4 flex items-center">
                                <Icon name="check-circle" className="w-5 h-5 mr-2 text-indigo-400" />
                                Configurações Rápidas
                            </h3>
                            <div className="space-y-1">
                                <ToggleSwitch enabled={true} onChange={() => {}} label="Envio Automático (Vencimento)" />
                                <ToggleSwitch enabled={true} onChange={() => {}} label="Envio Automático (Boas Vindas)" />
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-700">
                                <label className="text-sm font-medium text-slate-400 block mb-2">Chave PIX (Padrão)</label>
                                <input 
                                    type="text" 
                                    placeholder="CPF, E-mail ou Aleatória" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    onBlur={(e) => {
                                        localStorage.setItem('iptv_pix_key', e.target.value);
                                        addLog('INFO', 'Chave PIX atualizada.');
                                    }}
                                    defaultValue={localStorage.getItem('iptv_pix_key') || ''}
                                />
                            </div>
                            <div className="mt-3">
                                <label className="text-sm font-medium text-slate-400 block mb-2">Nome do Beneficiário</label>
                                <input 
                                    type="text" 
                                    placeholder="Seu Nome ou Empresa" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    onBlur={(e) => {
                                        localStorage.setItem('iptv_pix_name', e.target.value);
                                        addLog('INFO', 'Nome do beneficiário atualizado.');
                                    }}
                                    defaultValue={localStorage.getItem('iptv_pix_name') || ''}
                                />
                            </div>
                        </div>

                        <div className="bg-black rounded-xl border border-slate-700 shadow-lg flex-1 flex flex-col overflow-hidden font-mono text-xs">
                            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                                <span className="text-slate-400 font-bold">TERMINAL DE SISTEMA</span>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-2">
                                        <span className="text-slate-500">[{log.time}]</span>
                                        <span className={`${
                                            log.level === 'SUCCESS' ? 'text-green-400' :
                                            log.level === 'WARN' ? 'text-yellow-400' :
                                            log.level === 'ERROR' ? 'text-red-400' : 'text-blue-400'
                                        } font-bold`}>{log.level}</span>
                                        <span className="text-slate-300">{log.message}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- COLLECTIONS VIEW ---
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                    <div className="lg:col-span-12 flex flex-col gap-6">
                        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex-1 flex flex-col overflow-hidden">
                             <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Fila de Disparos</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Lembretes de vencimento (Próx. 3 dias) e cobranças pendentes.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleBatchAutoSend}
                                        disabled={isBatchProcessing || collectionQueue.length === 0}
                                        className={`flex items-center px-4 py-2 rounded-lg font-bold transition-all shadow-lg ${
                                            isBatchProcessing 
                                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                                            : collectionQueue.length === 0
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20'
                                        }`}
                                    >
                                        {isBatchProcessing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="sparkles" className="w-5 h-5 mr-2" />
                                                ⚡ Disparar Fila (Auto)
                                            </>
                                        )}
                                    </button>
                                    <div className="bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-lg border border-indigo-500/20 text-sm font-medium whitespace-nowrap">
                                        {collectionQueue.length} Pendentes
                                    </div>
                                </div>
                             </div>
                             
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900/50 border-b border-slate-700">
                                        <tr className="text-slate-400 uppercase text-xs">
                                            <th className="p-4">Cliente</th>
                                            <th className="p-4">Plano</th>
                                            <th className="p-4">Valor</th>
                                            <th className="p-4">Vencimento</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Ação (WhatsApp)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {collectionQueue.length > 0 ? (
                                            collectionQueue.map(({sub, customer, plan}) => {
                                                const isOverdue = new Date(sub.endDate) < new Date();
                                                const daysDiff = Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                                const isLoading = loadingAi === sub.id;
                                                
                                                return (
                                                    <tr key={sub.id} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-medium text-white">{customer.name}</div>
                                                            <div className="text-xs text-slate-500">{customer.phone}</div>
                                                        </td>
                                                        <td className="p-4 text-slate-300">{plan.name}</td>
                                                        <td className="p-4 font-bold text-green-400">
                                                            {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </td>
                                                        <td className="p-4 text-slate-300">
                                                            {new Date(sub.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                                        </td>
                                                        <td className="p-4">
                                                            {isOverdue ? (
                                                                <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-bold border border-red-500/30">
                                                                    VENCIDO ({Math.abs(daysDiff)} dias)
                                                                </span>
                                                            ) : (
                                                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-bold border border-yellow-500/30">
                                                                    VENCE EM {daysDiff} DIAS
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => handleAiMessageGen({sub, customer, plan}, isOverdue ? 'payment' : 'reminder')}
                                                                    disabled={isLoading}
                                                                    className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all border border-indigo-500/30 ${isLoading ? 'bg-indigo-900 cursor-wait' : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white'}`}
                                                                    title="Gerar e enviar mensagem única com IA"
                                                                >
                                                                    {isLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                    ) : (
                                                                         <Icon name="sparkles" className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                                
                                                                {isOverdue ? (
                                                                    <button 
                                                                        onClick={() => handleSendMessage({sub, customer, plan}, 'payment')}
                                                                        className="inline-flex items-center bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg shadow-green-600/20 transition-all hover:scale-105"
                                                                    >
                                                                        <Icon name="whatsapp" className="w-4 h-4 mr-2 fill-current" />
                                                                        Cobrança PIX
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleSendMessage({sub, customer, plan}, 'payment')}
                                                                        className="inline-flex items-center bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg shadow-yellow-600/20 transition-all hover:scale-105"
                                                                        title="Enviar Dados de Pagamento/Renovação"
                                                                    >
                                                                        <Icon name="whatsapp" className="w-4 h-4 mr-2 fill-current" />
                                                                        Lembrete PIX
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center text-slate-500">
                                                    <Icon name="check-circle" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                    <p>Nenhuma mensagem pendente (Vencidos ou Vencendo em 3 dias).</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};