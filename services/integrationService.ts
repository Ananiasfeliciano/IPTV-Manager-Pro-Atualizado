import { ExternalPanelConfig, Customer, Subscription, SubscriptionStatus } from '../types';

// Interface para mapear a resposta típica de APIs Xtream Codes Reseller
interface XtreamUser {
    username: string;
    password?: string;
    exp_date: string | number; // Pode ser timestamp ou string
    created_at: string | number;
    max_connections: string;
    is_trial: string;
    active: string; // "1" ou "0"
    // Campos adicionais que alguns painéis retornam
    member_id?: string;
    bouquet?: string;
}

export const fetchExternalUsers = async (config: ExternalPanelConfig): Promise<{ customers: Partial<Customer>[], subscriptions: Partial<Subscription>[] }> => {
    // Validação básica da URL
    let baseUrl = config.url.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;

    // Construção da URL da API de Revenda (Padrão Xtream Codes)
    // Ação 'get_users' é comum para listar usuários
    const apiUrl = `${baseUrl}/get.php?username=${config.username}&password=${config.password}&type=users`;

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Erro na conexão com o painel: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verifica se a API retornou erro ou vazio
        if (!Array.isArray(data)) {
            // Algumas APIs retornam objeto em vez de array se houver erro ou apenas 1 item
            if (data && typeof data === 'object' && !data.length) {
                 // Pode ser um objeto com chaves numéricas ou um erro
                 // Implementação simplificada assumindo array
                 console.warn("Formato de resposta inesperado:", data);
                 return { customers: [], subscriptions: [] };
            }
        }

        const customers: Partial<Customer>[] = [];
        const subscriptions: Partial<Subscription>[] = [];
        
        // Define o prefixo se existir (ex: "ult_")
        const prefix = config.userPrefix ? `${config.userPrefix}_` : '';

        (data as XtreamUser[]).forEach((user) => {
            // Ignorar testes se necessário, ou importar tudo
            const isTrial = user.is_trial === "1";
            
            // Aplica o prefixo ao nome do usuário para diferenciar no sistema local
            const importName = `${prefix}${user.username}`;
            
            // Criar Cliente
            const customerId = `ext_${user.username}`; // ID temporário
            customers.push({
                name: importName, 
                phone: '', // API básica não retorna telefone
                appName: 'Painel Import',
                notes: `Importado de ${baseUrl}. User Original: ${user.username} | Pass: ${user.password}`,
                createdAt: formatXtreamDate(user.created_at)
            });

            // Criar Assinatura
            let status = SubscriptionStatus.ACTIVE;
            const expDate = parseXtreamDate(user.exp_date);
            const now = new Date();

            if (expDate < now) {
                status = SubscriptionStatus.OVERDUE;
            }
            if (user.active === "0") {
                status = SubscriptionStatus.CANCELED; // Ou bloqueado
            }

            subscriptions.push({
                customerId: customerId, // Precisará ser mapeado para o ID real após inserção
                startDate: formatXtreamDate(user.created_at),
                endDate: expDate.toISOString(),
                status: status,
                isTrustActivation: false,
                // ServerID e PlanID precisarão ser atribuídos a um padrão na importação
            });
        });

        return { customers, subscriptions };

    } catch (error) {
        console.error("Falha na integração:", error);
        throw error;
    }
};

// Auxiliares para lidar com datas UNIX timestamp ou Strings
const parseXtreamDate = (dateValue: string | number): Date => {
    if (!dateValue) return new Date();
    
    // Se for número ou string numérica, assume timestamp unix
    if (!isNaN(Number(dateValue))) {
        return new Date(Number(dateValue) * 1000);
    }
    
    // Tenta parsear string (YYYY-MM-DD...)
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
    
    return new Date();
};

const formatXtreamDate = (dateValue: string | number): string => {
    return parseXtreamDate(dateValue).toISOString();
};
