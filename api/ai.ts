import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../services/aiPersona";

// Lightweight Vercel Serverless Function for AI actions
export default async function handler(req: any, res: any) {
  try {
    const method = req.method || "GET";
    if (method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    if (!apiKey) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing GEMINI_API_KEY environment variable" }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve) => {
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve());
    });

    const bodyStr = Buffer.concat(chunks).toString("utf8");
    const body = bodyStr ? JSON.parse(bodyStr) : {};
    const { action } = body;

    if (!action) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing 'action' in request body" }));
      return;
    }

    const model = "gemini-2.5-flash";

    if (action === "generatePersonalizedMessage") {
      const { customerName, planName, price, dueDate, daysDiff, type } = body;

      const absDays = Math.abs(Number(daysDiff) || 0);
      const systemInstruction = SYSTEM_INSTRUCTION;

      const prompt =
        type === "payment"
          ? `Escreva uma mensagem de cobrança para o cliente ${customerName}.\nO plano ${planName} no valor de R$ ${Number(price).toFixed(2)} venceu em ${dueDate} (atrasado há ${absDays} dias).\nSeja firme mas educado. Peça para enviar o comprovante do PIX para liberar o sinal.`
          : `Escreva um lembrete amigável para o cliente ${customerName}.\nO plano ${planName} vence em breve, no dia ${dueDate} (daqui a ${absDays} dias).\nValor: R$ ${Number(price).toFixed(2)}.\nPergunte se ele deseja a chave PIX para renovar antecipadamente e evitar bloqueio.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction, temperature: 0.7, maxOutputTokens: 200 },
      });

      const text = (response as any)?.text || "";
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ text }));
      return;
    }

    if (action === "improveTemplateText") {
      const { currentText, context } = body;

      const response = await ai.models.generateContent({
        model,
        contents: `Melhore o seguinte texto para uma mensagem de WhatsApp de serviço de IPTV.\nContexto: ${context}.\nMantenha as variáveis originais (ex: {cliente_nome}, {valor}) intactas.\nTorne o texto mais profissional, engajador e com emojis adequados.\n\nTexto original:\n"${currentText}"`,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.5, maxOutputTokens: 200 },
      });

      const text = (response as any)?.text || currentText || "";
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ text }));
      return;
    }

    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  } catch (error: any) {
    console.error("/api/ai error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
