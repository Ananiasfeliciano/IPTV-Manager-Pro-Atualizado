import { GoogleGenAI } from "@google/genai";

const modelId = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
      res.status(400).json({ error: "GEMINI_API_KEY ausente nas variáveis de ambiente do projeto (Vercel)." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const isStringBody = typeof req.body === "string";
    const body = isStringBody ? JSON.parse(req.body) : req.body || {};
    const { action } = body || {};

    if (action === "generatePersonalizedMessage") {
      const { customerName, planName, price, dueDate, daysDiff, type } = body;

      const absDays = Math.abs(daysDiff || 0);
      const systemInstruction = `Você é um assistente virtual profissional de um serviço de IPTV. 
Seu objetivo é escrever mensagens curtas, educadas e diretas para WhatsApp. 
Não use hashtags. Use emojis moderadamente. 
A mensagem deve incluir o nome do cliente, o valor e a ação necessária.`;

      let prompt = "";
      if (type === "payment") {
        prompt = `Escreva uma mensagem de cobrança para o cliente ${customerName}. 
O plano ${planName} no valor de R$ ${Number(price || 0).toFixed(2)} venceu em ${dueDate} (atrasado há ${absDays} dias).
Seja firme mas educado. Peça para enviar o comprovante do PIX para liberar o sinal.`;
      } else {
        prompt = `Escreva um lembrete amigável para o cliente ${customerName}.
O plano ${planName} vence em breve, no dia ${dueDate} (daqui a ${absDays} dias).
Valor: R$ ${Number(price || 0).toFixed(2)}.
Pergunte se ele deseja a chave PIX para renovar antecipadamente e evitar bloqueio.`;
      }

      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      });

      const text = (response as any)?.text || "";
      res.status(200).json({ text });
      return;
    }

    if (action === "improveTemplateText") {
      const { currentText, context } = body;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: `Melhore o seguinte texto para uma mensagem de WhatsApp de serviço de IPTV.\nContexto: ${context}.\nMantenha as variáveis originais (ex: {cliente_nome}, {valor}) intactas.\nTorne o texto mais profissional, engajador e com emojis adequados.\n\nTexto original:\n"${currentText}"`,
      });

      const text = (response as any)?.text || currentText || "";
      res.status(200).json({ text });
      return;
    }

    res.status(400).json({ error: "Ação inválida" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
