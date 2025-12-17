// Simple dev server for /api/ai without Vercel CLI
// Provides mock responses when GEMINI_API_KEY is not set

import 'dotenv/config';
import * as http from 'node:http';
import { GoogleGenAI } from '@google/genai';

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;

const sendJson = (res, statusCode, obj) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
};

const aiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const aiClient = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method !== 'POST' || url.pathname !== '/api/ai') {
      return sendJson(res, 404, { error: 'Not Found' });
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    await new Promise(resolve => req.on('end', resolve));

    const bodyStr = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = bodyStr ? JSON.parse(bodyStr) : {}; } catch (e) { return sendJson(res, 400, { error: 'Invalid JSON' }); }

    const { action } = body;
    if (!action) return sendJson(res, 400, { error: "Missing 'action' in request body" });

    const model = 'gemini-2.5-flash';

    const ensureText = (val, fallback = '') => (typeof val === 'string' ? val : fallback);

    if (action === 'generatePersonalizedMessage') {
      const customerName = ensureText(body.customerName, 'Cliente');
      const planName = ensureText(body.planName, 'Plano');
      const price = Number(body.price || 0);
      const dueDate = ensureText(body.dueDate, 'data');
      const daysDiff = Number(body.daysDiff || 0);
      const type = ensureText(body.type, 'reminder');

      if (!aiClient) {
        const absDays = Math.abs(daysDiff);
        const text = type === 'payment'
          ? `DEV: Olá ${customerName}, sua assinatura do plano ${planName} (R$ ${price.toFixed(2)}) venceu em ${dueDate} (há ${absDays} dias). Por favor, envie o comprovante do PIX para liberar o sinal.`
          : `DEV: Olá ${customerName}, sua assinatura do plano ${planName} vence em ${dueDate} (em ${absDays} dias). Valor: R$ ${price.toFixed(2)}. Deseja a chave PIX para renovar antecipadamente?`;
        return sendJson(res, 200, { text, mock: true });
      }

      const absDays = Math.abs(daysDiff);
      const systemInstruction = 'Você é um assistente virtual profissional de um serviço de IPTV. Mensagens curtas, educadas e diretas para WhatsApp. Não use hashtags. Emojis moderados.';
      const prompt = type === 'payment'
        ? `Escreva uma mensagem de cobrança para o cliente ${customerName}.\nO plano ${planName} no valor de R$ ${price.toFixed(2)} venceu em ${dueDate} (atrasado há ${absDays} dias).\nSeja firme mas educado. Peça para enviar o comprovante do PIX para liberar o sinal.`
        : `Escreva um lembrete amigável para o cliente ${customerName}.\nO plano ${planName} vence em breve, no dia ${dueDate} (daqui a ${absDays} dias).\nValor: R$ ${price.toFixed(2)}.\nPergunte se ele deseja a chave PIX para renovar antecipadamente e evitar bloqueio.`;

      const response = await aiClient.models.generateContent({ model, contents: prompt, config: { systemInstruction, temperature: 0.7, maxOutputTokens: 200 } });
      const text = (response && response.text) || '';
      return sendJson(res, 200, { text });
    }

    if (action === 'improveTemplateText') {
      const currentText = ensureText(body.currentText, '');
      const context = ensureText(body.context, '');

      if (!aiClient) {
        const text = `DEV: (Melhorado) ${currentText}`;
        return sendJson(res, 200, { text, mock: true });
      }

      const response = await aiClient.models.generateContent({
        model,
        contents: `Melhore o seguinte texto para uma mensagem de WhatsApp de serviço de IPTV.\nContexto: ${context}.\nMantenha as variáveis originais (ex: {cliente_nome}, {valor}) intactas.\nTorne o texto mais profissional, engajador e com emojis adequados.\n\nTexto original:\n"${currentText}"`,
      });
      const text = (response && response.text) || currentText;
      return sendJson(res, 200, { text });
    }

    return sendJson(res, 400, { error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('dev-api error:', err);
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
});
