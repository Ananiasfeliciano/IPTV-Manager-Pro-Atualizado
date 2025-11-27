import React, { useState } from 'react';
import { Icon } from '../components/Icon';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
        enabled ? 'bg-indigo-600' : 'bg-slate-600'
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

const AutomationCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <div className="flex items-start">
            <div className="flex-shrink-0">{icon}</div>
            <div className="ml-4 flex-grow">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-slate-400 text-sm mt-1">{description}</p>
            </div>
        </div>
        <div className="mt-6">{children}</div>
    </div>
);

export const Automation: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const [enableReminders, setEnableReminders] = useState(true);
    const [reminderDays, setReminderDays] = useState(3);
    const [reminderMessage, setReminderMessage] = useState(
        'Olá {cliente_nome}, sua assinatura do plano {plano_nome} vence em {dias_restantes} dias. Para renovar e continuar aproveitando, entre em contato conosco. Agradecemos a preferência!'
    );
    const [enablePayments, setEnablePayments] = useState(true);
    const [paymentConfirmationMessage, setPaymentConfirmationMessage] = useState(
        'Olá {cliente_nome}! Recebemos seu comprovante e seu plano {plano_nome} foi renovado com sucesso. Agradecemos a preferência!'
    );
    const [paymentErrorMessage, setPaymentErrorMessage] = useState(
        'Olá! Não foi possível identificar o pagamento. Por favor, envie um comprovante mais legível ou entre em contato com o suporte.'
    );

    const [enableFaq, setEnableFaq] = useState(true);
    const [faqItems, setFaqItems] = useState<FaqItem[]>([
        { id: 1, question: 'teste', answer: 'Olá! Para fazer um teste de velocidade, acesse: [link do seu teste aqui].' },
        { id: 2, question: 'formas de pagamento', answer: 'Aceitamos PIX, cartão de crédito e boleto. Para pagar, entre em contato conosco.' },
        { id: 3, question: 'caiu', answer: 'Se o sinal caiu, tente reiniciar seu modem e o aparelho de TV. Se o problema persistir, nos informe.' },
    ]);
    
    const mockLogs = [
        { level: 'SUCCESS', message: 'Pagamento de João da Silva confirmado via PIX.', time: '14:45:10' },
        { level: 'INFO', message: 'Resposta de FAQ ("teste") enviada para (21) 98888-2222.', time: '14:42:33' },
        { level: 'INFO', message: 'Bot inicializado e aguardando conexões.', time: '14:30:01' },
        { level: 'WARN', message: 'Não foi possível enviar lembrete para (11) 99999-0000. Número inválido.', time: '14:32:15' },
        { level: 'SUCCESS', message: 'Lembrete de vencimento enviado para Maria Oliveira.', time: '14:35:03' },
        { level: 'INFO', message: 'Conexão com o WhatsApp estabelecida com sucesso.', time: '14:29:55' },
    ].sort((a,b) => b.time.localeCompare(a.time));

    const handleConnect = () => {
        setIsConnecting(true);
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
        }, 2500);
    };
    
    const handleDisconnect = () => {
        setIsConnected(false);
    }
    
    const handleFaqChange = (id: number, field: 'question' | 'answer', value: string) => {
        setFaqItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const addFaqItem = () => {
        const newId = faqItems.length > 0 ? Math.max(...faqItems.map(i => i.id)) + 1 : 1;
        setFaqItems(prev => [...prev, { id: newId, question: '', answer: '' }]);
    };

    const deleteFaqItem = (id: number) => {
        setFaqItems(prev => prev.filter(item => item.id !== id));
    };

    const inputClasses = "bg-slate-700 text-white p-2 rounded-lg w-full border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Automatize seu Negócio com o WhatsApp Bot</h2>
                <p className="mt-2 text-lg text-slate-400 max-w-3xl mx-auto">
                    Envie lembretes de vencimento, confirme pagamentos e ofereça suporte 24/7 de forma automática.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna de Configurações */}
                <div className="lg:col-span-2 space-y-8">
                    <AutomationCard
                        icon={<Icon name="whatsapp" className="w-8 h-8 text-green-400" />}
                        title="Status da Conexão"
                        description="Conecte sua conta do WhatsApp para ativar as automações."
                    >
                        {isConnected ? (
                             <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <span className="ml-3 font-semibold text-green-300">Conectado ao WhatsApp</span>
                                </div>
                                <button onClick={handleDisconnect} className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-2 px-4 rounded-lg transition-colors">
                                    Desconectar
                                </button>
                            </div>
                        ) : isConnecting ? (
                            <div className="flex flex-col items-center justify-center bg-slate-700/50 p-4 rounded-lg min-h-[160px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                                <p className="text-slate-300">Aguardando leitura do QR Code...</p>
                                <p className="text-xs text-slate-400">Abra o WhatsApp em seu celular e escaneie o código.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row items-center justify-center bg-slate-700/50 p-4 rounded-lg gap-6">
                                <div className="bg-white p-2 rounded-lg">
                                     <Icon name="qr-code" className="w-28 h-28 text-slate-800" strokeWidth="2.5" />
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-slate-300 font-medium mb-4">Escaneie o QR Code para conectar.</p>
                                    <button onClick={handleConnect} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 w-full md:w-auto">
                                        Conectar ao WhatsApp
                                    </button>
                                </div>
                            </div>
                        )}
                    </AutomationCard>
                    
                    <AutomationCard
                        icon={<Icon name="calendar" className="w-8 h-8 text-indigo-400" />}
                        title="Lembretes de Vencimento Automáticos"
                        description="Envie mensagens automáticas para clientes antes que a assinatura expire."
                    >
                       <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label htmlFor="enableReminders" className="font-medium text-slate-300">Ativar lembretes</label>
                                <ToggleSwitch enabled={enableReminders} onChange={setEnableReminders} />
                            </div>
                            {enableReminders && (
                                <div className="space-y-4 border-t border-slate-700 pt-4 mt-4 animate-fadeIn">
                                    <div>
                                        <label htmlFor="reminderDays" className="block text-sm font-medium text-slate-400 mb-1">Enviar lembrete X dias antes do vencimento</label>
                                        <input type="number" id="reminderDays" value={reminderDays} onChange={e => setReminderDays(parseInt(e.target.value))} className={`${inputClasses} w-24`} />
                                    </div>
                                    <div>
                                        <label htmlFor="reminderMessage" className="block text-sm font-medium text-slate-400 mb-1">Modelo da Mensagem</label>
                                        <textarea 
                                            id="reminderMessage"
                                            value={reminderMessage}
                                            onChange={e => setReminderMessage(e.target.value)}
                                            rows={5}
                                            className={inputClasses}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Use variáveis como <code className="bg-slate-900 px-1 rounded">{'{cliente_nome}'}</code>, <code className="bg-slate-900 px-1 rounded">{'{plano_nome}'}</code>, e <code className="bg-slate-900 px-1 rounded">{'{dias_restantes}'}</code>.</p>
                                    </div>
                                </div>
                            )}
                       </div>
                    </AutomationCard>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AutomationCard
                            icon={<Icon name="currency-dollar" className="w-8 h-8 text-yellow-400" />}
                            title="Confirmação de Pagamento"
                            description="Permita que o bot receba e processe comprovantes."
                        >
                            <div className="flex items-center justify-between">
                                <label htmlFor="enablePayments" className="font-medium text-slate-300">Ativar confirmação</label>
                                <ToggleSwitch enabled={enablePayments} onChange={setEnablePayments} />
                            </div>
                            {enablePayments && (
                                <div className="space-y-4 border-t border-slate-700 pt-4 mt-4 animate-fadeIn">
                                    <div>
                                        <label htmlFor="paymentConfirmationMessage" className="block text-sm font-medium text-slate-400 mb-1">Mensagem de Sucesso</label>
                                        <textarea 
                                            id="paymentConfirmationMessage"
                                            value={paymentConfirmationMessage}
                                            onChange={e => setPaymentConfirmationMessage(e.target.value)}
                                            rows={3}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="paymentErrorMessage" className="block text-sm font-medium text-slate-400 mb-1">Mensagem de Falha</label>
                                        <textarea 
                                            id="paymentErrorMessage"
                                            value={paymentErrorMessage}
                                            onChange={e => setPaymentErrorMessage(e.target.value)}
                                            rows={3}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                            )}
                        </AutomationCard>
                        <AutomationCard
                            icon={<Icon name="light-bulb" className="w-8 h-8 text-blue-400" />}
                            title="Suporte Básico (FAQ)"
                            description="Responda a perguntas comuns de forma automática."
                        >
                            <div className="flex items-center justify-between">
                                <label htmlFor="enableFaq" className="font-medium text-slate-300">Ativar FAQ</label>
                                <ToggleSwitch enabled={enableFaq} onChange={setEnableFaq} />
                            </div>
                            {enableFaq && (
                                <div className="space-y-3 border-t border-slate-700 pt-4 mt-4 animate-fadeIn max-h-96 overflow-y-auto">
                                    <p className="text-xs text-slate-400 px-1">O bot responderá automaticamente quando a mensagem do cliente contiver a palavra-chave.</p>
                                    {faqItems.map(item => (
                                        <div key={item.id} className="bg-slate-700/50 p-3 rounded-lg space-y-2 relative group">
                                            <button onClick={() => deleteFaqItem(item.id)} className="absolute top-2 right-2 p-1 rounded-full bg-slate-600 hover:bg-red-500/50 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Icon name="x-mark" className="w-4 h-4" />
                                            </button>
                                            <div>
                                                <label className="text-xs font-medium text-slate-400">Palavra-chave ou Pergunta</label>
                                                <input 
                                                    type="text" 
                                                    value={item.question}
                                                    onChange={(e) => handleFaqChange(item.id, 'question', e.target.value)}
                                                    className={`${inputClasses} mt-1`}
                                                    placeholder="Ex: teste, pagamento"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-400">Resposta Automática</label>
                                                <textarea 
                                                    value={item.answer}
                                                    onChange={(e) => handleFaqChange(item.id, 'answer', e.target.value)}
                                                    rows={2}
                                                    className={`${inputClasses} mt-1`}
                                                    placeholder="Digite a resposta do bot..."
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={addFaqItem} className="w-full text-center bg-slate-700 hover:bg-slate-600 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-colors mt-2">
                                        + Adicionar Pergunta
                                    </button>
                                </div>
                            )}
                        </AutomationCard>
                    </div>
                </div>

                {/* Coluna de Logs */}
                <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
                     <h3 className="text-lg font-semibold text-white mb-4">Log de Atividades do Bot</h3>
                     <div className="space-y-3 max-h-[700px] overflow-y-auto font-mono text-xs">
                        {mockLogs.map((log, index) => (
                           <div key={index} className="flex items-start">
                                <span className="text-slate-500 mr-2">{log.time}</span>
                                <span className={`mr-2 font-bold ${
                                    log.level === 'SUCCESS' ? 'text-green-400' :
                                    log.level === 'WARN' ? 'text-yellow-400' : 'text-slate-400'
                                }`}>[{log.level}]</span>
                                <p className="text-slate-300 flex-1 whitespace-pre-wrap break-words">{log.message}</p>
                           </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};