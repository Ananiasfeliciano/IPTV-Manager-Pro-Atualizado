import { GoogleGenAI } from "@google/genai";

// Inicializa o cliente Gemini
// Nota: Em produção, certifique-se de que a variável de ambiente está configurada corretamente no seu build.
const resolvedKey = process.env.API_KEY || '';
const apiKey = resolvedKey && resolvedKey !== 'PLACEHOLDER_API_KEY' ? resolvedKey : '';
const ai = new GoogleGenAI({ apiKey });

const modelId = 'gemini-2.5-flash';

export const generatePersonalizedMessage = async (
    customerName: string,
    planName: string,
    price: number,
    dueDate: string,
    daysDiff: number,
    type: 'reminder' | 'payment'
): Promise<string> => {
    if (!apiKey) {
        console.warn("API Key do Gemini não encontrada.");
        return "";
    }

    try {
        const isOverdue = daysDiff < 0;
        const absDays = Math.abs(daysDiff);
        
        const systemInstruction = `Você é um assistente virtual profissional de um serviço de IPTV. 
        Seu objetivo é escrever mensagens curtas, educadas e diretas para WhatsApp. 
        Não use hashtags. Use emojis moderadamente. 
        A mensagem deve incluir o nome do cliente, o valor e a ação necessária.`;

        let prompt = "";

        if (type === 'payment') {
            prompt = `Escreva uma mensagem de cobrança para o cliente ${customerName}. 
            O plano ${planName} no valor de R$ ${price.toFixed(2)} venceu em ${dueDate} (atrasado há ${absDays} dias).
            Seja firme mas educado. Peça para enviar o comprovante do PIX para liberar o sinal.`;
        } else {
            prompt = `Escreva um lembrete amigável para o cliente ${customerName}.
            O plano ${planName} vence em breve, no dia ${dueDate} (daqui a ${absDays} dias).
            Valor: R$ ${price.toFixed(2)}.
            Pergunte se ele deseja a chave PIX para renovar antecipadamente e evitar bloqueio.`;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7, // Criativo, mas não alucinado
                maxOutputTokens: 200,
            }
        });

        return response.text || "";
    } catch (error) {
        console.error("Erro ao gerar mensagem com Gemini:", error);
        return "";
    }
};

export const improveTemplateText = async (currentText: string, context: string): Promise<string> => {
    if (!apiKey) return currentText;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Melhore o seguinte texto para uma mensagem de WhatsApp de serviço de IPTV.
            Contexto: ${context}.
            Mantenha as variáveis originais (ex: {cliente_nome}, {valor}) intactas.
            Torne o texto mais profissional, engajador e com emojis adequados.
            
            Texto original:
            "${currentText}"`,
        });

        return response.text || currentText;
    } catch (error) {
        console.error("Erro ao melhorar template:", error);
        return currentText;
    }
};
