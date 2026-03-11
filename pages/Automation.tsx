import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Icon } from '../components/Icon';
import { IptvData, Subscription, SubscriptionStatus } from '../types';
import { generatePersonalizedMessage, improveTemplateText } from '../services/aiService';
import {
    AutomationSettings,
    MessageHistoryEntry,
    validateBRPhone,
    sendMessage,
    getSettings,
    saveSettings,
    recordMessage,
    getRecentMessages,
    getTodayMessageIds,
    getEvolutionConfig,
} from '../services/automationService';
import {
    createInstance,
    fetchQrCode,
    getConnectionState,
    logoutInstance,
    isConfigured as evoIsConfigured,
    EvolutionConfig,
} from '../services/evolutionApi';
import { Toast } from '../components/Toast';

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
    const [viewMode, setViewMode] = useState<'settings' | 'collections' | 'history'>('settings');

    // Connection State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // Config State
    const [templates, setTemplates] = useState<Record<TemplateType, MessageTemplate>>(DEFAULT_TEMPLATES);
    const [activeTab, setActiveTab] = useState<TemplateType>('welcome');
    
    // Automation Settings (from Supabase)
    const [settings, setSettings] = useState<AutomationSettings>({
        pixKey: '', pixName: '', autoSendOverdue: true, autoSendWelcome: false,
        evoApiUrl: '', evoApiKey: '', evoInstanceName: 'iptv-manager',
    });
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [showApiConfig, setShowApiConfig] = useState(false);
    
    // Message History
    const [messageHistory, setMessageHistory] = useState<MessageHistoryEntry[]>([]);
    const [sentTodayIds, setSentTodayIds] = useState<Set<string>>(new Set());
    
    // Loading States for AI
    const [loadingAi, setLoadingAi] = useState<string | null>(null);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
    
    // Logs
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [healthInfo, setHealthInfo] = useState<string | null>(null);

    // Load settings from Supabase on mount
    useEffect(() => {
        const loadSettings = async () => {
            const s = await getSettings();
            setSettings(s);
            setSettingsLoaded(true);
            // Check if already connected
            const cfg = getEvolutionConfig(s);
            if (evoIsConfigured(cfg)) {
                const state = await getConnectionState(cfg);
                if (state?.state === 'open') {
                    setIsConnected(true);
                }
            }
        };
        loadSettings();
    }, []);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // Load today's sent message IDs
    useEffect(() => {
        const loadSentIds = async () => {
            const ids = await getTodayMessageIds();
            setSentTodayIds(ids);
        };
        loadSentIds();
    }, []);

    // Load from LocalStorage (templates only)
    useEffect(() => {
        const savedTemplates = localStorage.getItem('iptv_msg_templates');
        if (savedTemplates) {
            try { setTemplates(JSON.parse(savedTemplates)); } catch { /* ignore */ }
        }
        addLog('INFO', 'Sistema de automação inicializado.');
    }, []);

    // Save templates to LocalStorage whenever they change
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

    const handleHealthCheck = async () => {
        try {
            addLog('INFO', 'Verificando ambiente do servidor...');
            const resp = await fetch('/api/health');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const hdata = await resp.json();
            const info = `status=${hdata.status}, node=${hdata.nodeVersion}, region=${hdata.vercelRegion}, GEMINI_API_KEY=${hdata.geminiKeySet ? 'OK' : 'FALTANDO'}`;
            setHealthInfo(info);
            setToast({ message: `Servidor OK • ${info}`, type: 'success' });
            addLog('SUCCESS', `Saúde do servidor: ${info}`);
        } catch (e: any) {
            const msg = `Falha na verificação do servidor: ${e?.message || e}`;
            setToast({ message: msg, type: 'error' });
            addLog('ERROR', msg);
        }
    };

    const handleConnect = async () => {
        const evoConfig = getEvolutionConfig(settings);

        if (!evoIsConfigured(evoConfig)) {
            setShowApiConfig(true);
            addLog('WARN', 'Configure a Evolution API antes de conectar.');
            setToast({ message: 'Configure a URL e API Key da Evolution API primeiro.', type: 'error' });
            return;
        }

        setIsConnecting(true);
        setConnectionError(null);
        setQrCodeBase64(null);
        addLog('INFO', 'Criando instância na Evolution API...');

        // 1. Create instance
        const createResult = await createInstance(evoConfig);
        if (!createResult.created) {
            setIsConnecting(false);
            setConnectionError(createResult.error || 'Falha ao criar instância.');
            addLog('ERROR', `Erro ao criar instância: ${createResult.error}`);
            setToast({ message: createResult.error || 'Falha ao criar instância.', type: 'error' });
            return;
        }

        addLog('SUCCESS', 'Instância criada. Gerando QR Code...');

        // 2. Fetch QR Code
        const qrResult = await fetchQrCode(evoConfig);
        if (!qrResult.qr?.base64) {
            // Check if maybe already connected
            const state = await getConnectionState(evoConfig);
            if (state?.state === 'open') {
                setIsConnecting(false);
                setIsConnected(true);
                addLog('SUCCESS', 'WhatsApp já está conectado!');
                setToast({ message: 'WhatsApp conectado!', type: 'success' });
                return;
            }
            setIsConnecting(false);
            setConnectionError(qrResult.error || 'QR Code não retornado.');
            addLog('ERROR', `Erro ao obter QR Code: ${qrResult.error}`);
            return;
        }

        setQrCodeBase64(qrResult.qr.base64);
        setIsConnecting(false);
        addLog('INFO', 'QR Code gerado! Escaneie com seu WhatsApp.');

        // 3. Start polling connection state
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            const state = await getConnectionState(evoConfig);
            if (state?.state === 'open') {
                setIsConnected(true);
                setQrCodeBase64(null);
                setConnectionError(null);
                addLog('SUCCESS', 'WhatsApp conectado com sucesso!');
                setToast({ message: 'WhatsApp conectado!', type: 'success' });
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }, 5000);

        // Stop polling after 2 minutes
        setTimeout(() => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                if (!isConnected) {
                    setQrCodeBase64(null);
                    addLog('WARN', 'Tempo expirado. Tente gerar o QR Code novamente.');
                }
            }
        }, 120000);
    };

    const handleDisconnect = async () => {
        const evoConfig = getEvolutionConfig(settings);
        if (evoIsConfigured(evoConfig)) {
            addLog('INFO', 'Desconectando do WhatsApp...');
            await logoutInstance(evoConfig);
        }
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsConnected(false);
        setQrCodeBase64(null);
        addLog('WARN', 'Desconectado do WhatsApp.');
    };

    // Settings handlers
    const handleSettingsChange = useCallback(async (key: keyof AutomationSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        await saveSettings({ [key]: value });
    }, []);

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
            setToast({ message: 'Template melhorado com IA.', type: 'success' });
        } else {
            addLog('WARN', 'Não foi possível melhorar o texto ou a IA retornou vazio.');
            setToast({ message: 'IA não retornou melhoria. Verifique GEMINI_API_KEY no servidor.', type: 'error' });
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
            let finalMessage = aiMessage;
            if (type === 'payment') {
                 finalMessage += `\n\n🔑 PIX: ${settings.pixKey || 'CHAVE-PIX'}\n👤 ${settings.pixName || 'Nome'}`;
            }

            const { valid } = validateBRPhone(customer.phone);
            if (!valid) {
                addLog('ERROR', `Telefone inválido para ${customer.name}: ${customer.phone}`);
                setToast({ message: `Telefone inválido: ${customer.name}`, type: 'error' });
                return;
            }

            const result = await sendMessage(customer.phone, finalMessage, settings, isConnected);
            await recordMessage({
                customerId: customer.id,
                subscriptionId: sub.id,
                messageType: 'ai_' + type,
                phone: customer.phone,
                messagePreview: finalMessage,
                status: result.sent ? 'sent' : 'failed',
            });
            setSentTodayIds(prev => new Set(prev).add(sub.id));
            const methodLabel = result.method === 'api' ? '(via API)' : '(via wa.me)';
            addLog('SUCCESS', `Mensagem IA enviada para ${customer.name} ${methodLabel}`);
            setToast({ message: `Mensagem IA gerada para ${customer.name} ${methodLabel}.`, type: 'success' });
        } else {
            addLog('ERROR', 'Falha ao gerar mensagem com IA. Tente o envio padrão.');
            setToast({ message: 'Falha na IA. Verifique GEMINI_API_KEY no servidor.', type: 'error' });
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

    const handleSendMessage = async (item: {sub: Subscription, customer: any, plan: any}, type: 'reminder' | 'payment') => {
        const { sub, customer, plan } = item;
        
        const template = type === 'reminder' ? templates.reminder : templates.payment;
        let message = template.content;

        const daysDiff = Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        const formattedDate = new Date(sub.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        
        message = message
            .replace(/{cliente_nome}/g, customer.name)
            .replace(/{plano_nome}/g, plan.name)
            .replace(/{valor}/g, plan.price.toFixed(2).replace('.', ','))
            .replace(/{pix_chave}/g, settings.pixKey || 'CHAVE-PIX-AQUI')
            .replace(/{pix_nome}/g, settings.pixName || 'Nome Beneficiario')
            .replace(/{dias_restantes}/g, daysDiff.toString())
            .replace(/{vencimento}/g, formattedDate);

        const { valid } = validateBRPhone(customer.phone);
        if (!valid) {
            addLog('ERROR', `Telefone inválido para ${customer.name}: ${customer.phone}`);
            setToast({ message: `Telefone inválido: ${customer.name}`, type: 'error' });
            return false;
        }

        const result = await sendMessage(customer.phone, message, settings, isConnected);
        
        await recordMessage({
            customerId: customer.id,
            subscriptionId: sub.id,
            messageType: type,
            phone: customer.phone,
            messagePreview: message,
            status: result.sent ? 'sent' : 'failed',
        });
        
        setSentTodayIds(prev => new Set(prev).add(sub.id));
        
        const methodLabel = result.method === 'api' ? '(API)' : '(wa.me)';
        const logMsg = type === 'reminder' 
            ? `Lembrete enviado para ${customer.name} ${methodLabel}`
            : `Cobrança PIX enviada para ${customer.name} ${methodLabel}`;
            
        addLog(result.sent ? 'SUCCESS' : 'ERROR', result.sent ? logMsg : `Falha ao enviar para ${customer.name}: ${result.error || 'erro desconhecido'}`);
        return result.sent;
    };

    const handleBatchAutoSend = async () => {
        if (collectionQueue.length === 0) {
            addLog('WARN', 'A fila está vazia. Nada para enviar.');
            return;
        }

        // Filter out already sent today
        const pending = collectionQueue.filter(item => !sentTodayIds.has(item.sub.id));
        if (pending.length === 0) {
            addLog('WARN', 'Todos os clientes da fila já receberam mensagem hoje.');
            setToast({ message: 'Todos já foram notificados hoje.', type: 'success' });
            return;
        }

        if (!window.confirm(`Enviar mensagens para ${pending.length} clientes${isConnected ? ' via API WhatsApp' : ' via wa.me (abas)'}?\n\n${!isConnected ? 'Certifique-se de que os POP-UPS estão PERMITIDOS.\n\n' : ''}Deseja continuar?`)) {
            return;
        }

        setIsBatchProcessing(true);
        setBatchProgress({ current: 0, total: pending.length, sent: 0, failed: 0 });
        addLog('INFO', `Iniciando disparo em massa para ${pending.length} clientes...`);

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < pending.length; i++) {
            const item = pending[i];
            
            addLog('INFO', `[${i + 1}/${pending.length}] Processando ${item.customer.name}...`);
            const result = await handleSendMessage(item, 'payment');
            
            if (result) {
                sent++;
            } else {
                failed++;
            }
            
            setBatchProgress({ current: i + 1, total: pending.length, sent, failed });
            
            if (i < pending.length - 1) {
                await delay(2500);
            }
        }

        setIsBatchProcessing(false);
        const summary = `Disparo finalizado! ✅ ${sent} enviados, ❌ ${failed} falharam.`;
        addLog('SUCCESS', summary);
        setToast({ message: summary, type: sent > 0 ? 'success' : 'error' });
    };

    // Load message history when switching to history tab
    const loadHistory = useCallback(async () => {
        const history = await getRecentMessages(50);
        setMessageHistory(history);
    }, []);

    return (<>
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
                        <button 
                            onClick={() => { setViewMode('history'); loadHistory(); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Histórico
                        </button>
                    </div>

                    <div className="flex items-center bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500 animate-pulse' : qrCodeBase64 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`font-semibold mr-4 ${isConnected ? 'text-green-400' : qrCodeBase64 ? 'text-yellow-400' : 'text-slate-400'} hidden sm:inline`}>
                            {isConnected ? 'CONECTADO' : qrCodeBase64 ? 'ESCANEIE' : 'OFFLINE'}
                        </span>
                        {isConnected ? (
                            <button onClick={handleDisconnect} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm transition-colors border border-red-500/30">
                                Desconectar
                            </button>
                        ) : (
                            <button onClick={handleConnect} disabled={isConnecting} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm transition-colors border border-green-500/30 flex items-center">
                            {isConnecting ? 'Conectando...' : 'Conectar WhatsApp'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'settings' ? (
                // --- SETTINGS VIEW ---
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {!isConnected && (
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg animate-fadeInUp">
                                {qrCodeBase64 ? (
                                    /* Real QR Code from Evolution API */
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="bg-white p-2 rounded-lg flex-shrink-0">
                                            <img src={qrCodeBase64} alt="QR Code WhatsApp" className="w-48 h-48" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Escaneie o QR Code</h3>
                                            <p className="text-slate-400 mb-2">Abra o WhatsApp no seu celular &gt; <strong>Dispositivos Conectados</strong> &gt; <strong>Conectar Dispositivo</strong></p>
                                            <div className="flex items-center text-yellow-400 text-sm mb-4">
                                                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                                                Aguardando leitura do QR Code...
                                            </div>
                                            <button onClick={handleConnect} className="text-xs text-slate-400 hover:text-white underline">
                                                Gerar novo QR Code
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Connection panel */
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="bg-white p-3 rounded-lg flex-shrink-0">
                                            <Icon name="qr-code" className="w-32 h-32 text-slate-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Conecte seu WhatsApp</h3>
                                            <p className="text-slate-400 mb-3">Conecte via <strong>Evolution API</strong> para enviar mensagens diretamente, sem abrir abas.</p>
                                            {connectionError && (
                                                <p className="text-red-400 text-sm mb-3 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">{connectionError}</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={handleConnect} 
                                                    disabled={isConnecting}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                                                >
                                                    {isConnecting ? 'Conectando...' : 'Gerar QR Code'}
                                                </button>
                                                <button 
                                                    onClick={() => setShowApiConfig(!showApiConfig)}
                                                    className="text-sm text-indigo-400 hover:text-indigo-300 underline"
                                                >
                                                    {showApiConfig ? 'Ocultar Config' : 'Configurar API'}
                                                </button>
                                            </div>
                                            {showApiConfig && (
                                                <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-3">
                                                    <p className="text-xs text-slate-500 mb-2">Configure sua <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Evolution API</a>:</p>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">URL da API</label>
                                                        <input 
                                                            type="text" placeholder="https://api.seusite.com"
                                                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                                            value={settings.evoApiUrl}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, evoApiUrl: e.target.value }))}
                                                            onBlur={(e) => handleSettingsChange('evoApiUrl', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">API Key (Global)</label>
                                                        <input 
                                                            type="password" placeholder="Sua API Key"
                                                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                                            value={settings.evoApiKey}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, evoApiKey: e.target.value }))}
                                                            onBlur={(e) => handleSettingsChange('evoApiKey', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">Nome da Instância</label>
                                                        <input 
                                                            type="text" placeholder="iptv-manager"
                                                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                                            value={settings.evoInstanceName}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, evoInstanceName: e.target.value }))}
                                                            onBlur={(e) => handleSettingsChange('evoInstanceName', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-wrap gap-2">
                                {(Object.values(templates) as MessageTemplate[]).map((tpl) => (
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
                                <ToggleSwitch enabled={settings.autoSendOverdue} onChange={(v) => handleSettingsChange('autoSendOverdue', v)} label="Envio Automático (Vencimento)" />
                                <ToggleSwitch enabled={settings.autoSendWelcome} onChange={(v) => handleSettingsChange('autoSendWelcome', v)} label="Envio Automático (Boas Vindas)" />
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-700">
                                <label className="text-sm font-medium text-slate-400 block mb-2">Chave PIX (Padrão)</label>
                                <input 
                                    type="text" 
                                    placeholder="CPF, E-mail ou Aleatória" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    value={settings.pixKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, pixKey: e.target.value }))}
                                    onBlur={(e) => {
                                        handleSettingsChange('pixKey', e.target.value);
                                        addLog('INFO', 'Chave PIX atualizada.');
                                    }}
                                />
                            </div>
                            <div className="mt-3">
                                <label className="text-sm font-medium text-slate-400 block mb-2">Nome do Beneficiário</label>
                                <input 
                                    type="text" 
                                    placeholder="Seu Nome ou Empresa" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    value={settings.pixName}
                                    onChange={(e) => setSettings(prev => ({ ...prev, pixName: e.target.value }))}
                                    onBlur={(e) => {
                                        handleSettingsChange('pixName', e.target.value);
                                        addLog('INFO', 'Nome do beneficiário atualizado.');
                                    }}
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
            ) : viewMode === 'collections' ? (
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
                                    {isBatchProcessing && (
                                        <div className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg text-xs text-white">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {batchProgress.current}/{batchProgress.total} • ✅{batchProgress.sent} ❌{batchProgress.failed}
                                        </div>
                                    )}
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
                                    <button
                                        onClick={handleHealthCheck}
                                        className="flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200"
                                        title="Testar ambiente do servidor (API/IA)"
                                    >
                                        <Icon name="shield-check" className="w-4 h-4 mr-2" /> Testar Ambiente
                                    </button>
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
                                                const alreadySent = sentTodayIds.has(sub.id);
                                                
                                                return (
                                                    <tr key={sub.id} className={`hover:bg-slate-700/30 transition-colors ${alreadySent ? 'opacity-60' : ''}`}>
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
                                                            {alreadySent && (
                                                                <span className="ml-2 bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-bold border border-green-500/30">
                                                                    ✓ ENVIADO HOJE
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
            ) : (
                // --- HISTORY VIEW ---
                <div className="grid grid-cols-1 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Histórico de Mensagens</h3>
                                <p className="text-slate-400 text-sm mt-1">Últimas 50 mensagens enviadas.</p>
                            </div>
                            <button
                                onClick={loadHistory}
                                className="flex items-center px-3 py-2 rounded-lg text-xs font-bold border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all"
                            >
                                <Icon name="sparkles" className="w-4 h-4 mr-2" /> Atualizar
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 border-b border-slate-700">
                                    <tr className="text-slate-400 uppercase text-xs">
                                        <th className="p-4">Data/Hora</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Telefone</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Preview</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {messageHistory.length > 0 ? (
                                        messageHistory.map(msg => {
                                            const customer = data?.customers.find(c => c.id === msg.customerId);
                                            const typeLabels: Record<string, string> = {
                                                reminder: 'Lembrete', payment: 'Cobrança PIX',
                                                ai_reminder: 'IA Lembrete', ai_payment: 'IA Cobrança',
                                                manual: 'Manual',
                                            };
                                            return (
                                                <tr key={msg.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4 text-slate-300 text-sm whitespace-nowrap">
                                                        {new Date(msg.sentAt).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="p-4 text-white font-medium">{customer?.name || 'Desconhecido'}</td>
                                                    <td className="p-4 text-slate-400 text-sm font-mono">{msg.phone}</td>
                                                    <td className="p-4">
                                                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold">
                                                            {typeLabels[msg.messageType] || msg.messageType}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-400 text-xs max-w-[300px] truncate">{msg.messagePreview}</td>
                                                    <td className="p-4">
                                                        {msg.status === 'sent' ? (
                                                            <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-bold">Enviado</span>
                                                        ) : (
                                                            <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-bold">Falhou</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center text-slate-500">
                                                <Icon name="check-circle" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>Nenhuma mensagem no histórico.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>);
};