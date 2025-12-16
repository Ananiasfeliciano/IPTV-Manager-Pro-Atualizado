import { GoogleGenAI } from "@google/genai";

// Inicializa o cliente Gemini
// Nota: Em produção, certifique-se de que a variável de ambiente está configurada corretamente no seu build.
const resolvedKey = process.env.API_KEY || '';
const apiKey = resolvedKey && resolvedKey !== 'PLACEHOLDER_API_KEY' ? resolvedKey : '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const modelId = 'gemini-2.5-flash';

export const generatePersonalizedMessage = async (
    customerName: string,
    planName: string,
    price: number,
    dueDate: string,
    daysDiff: number,
    type: 'reminder' | 'payment'
): Promise<string> => {
    try {
        // Preferir backend serverless
        const resp = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generatePersonalizedMessage',
                customerName,
                planName,
                price,
                dueDate,
                daysDiff,
                type
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            return data.text || "";
        }

        // Fallback local em dev somente se houver apiKey inline
        if (!ai) {
            console.warn('Falha no endpoint /api/ai e sem API key local.');
            return "";
        }

        const absDays = Math.abs(daysDiff);
        const systemInstruction = `Você é um assistente virtual profissional de um serviço de IPTV.\nSeu objetivo é escrever mensagens curtas, educadas e diretas para WhatsApp.\nNão use hashtags. Use emojis moderadamente.\nA mensagem deve incluir o nome do cliente, o valor e a ação necessária.`;

        let prompt = '';
        if (type === 'payment') {
            prompt = `Escreva uma mensagem de cobrança para o cliente ${customerName}.\nO plano ${planName} no valor de R$ ${price.toFixed(2)} venceu em ${dueDate} (atrasado há ${absDays} dias).\nSeja firme mas educado. Peça para enviar o comprovante do PIX para liberar o sinal.`;
        } else {
            prompt = `Escreva um lembrete amigável para o cliente ${customerName}.\nO plano ${planName} vence em breve, no dia ${dueDate} (daqui a ${absDays} dias).\nValor: R$ ${price.toFixed(2)}.\nPergunte se ele deseja a chave PIX para renovar antecipadamente e evitar bloqueio.`;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: { systemInstruction, temperature: 0.7, maxOutputTokens: 200 }
        });
        return (response as any)?.text || "";
    } catch (error) {
        console.error("Erro ao gerar mensagem com Gemini:", error);
        return "";
    }
};

export const improveTemplateText = async (currentText: string, context: string): Promise<string> => {
    try {
        // Preferir backend serverless
        const resp = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'improveTemplateText',
                currentText,
                context
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            return data.text || currentText;
        }

        if (!ai) return currentText;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Melhore o seguinte texto para uma mensagem de WhatsApp de serviço de IPTV.\nContexto: ${context}.\nMantenha as variáveis originais (ex: {cliente_nome}, {valor}) intactas.\nTorne o texto mais profissional, engajador e com emojis adequados.\n\nTexto original:\n"${currentText}"`,
        });

        return (response as any)?.text || currentText;
    } catch (error) {
        console.error("Erro ao melhorar template:", error);
        return currentText;
    }
};
