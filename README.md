<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10ue5-uU4W1KhGbUEf_eS-OekJJO7Cd7K

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy (Vercel)

1. Configure o projeto no Vercel (via dashboard ou CLI):
   - Projeto: selecione este repositório/pasta.
   - Framework Preset: Vite (detectado automaticamente).
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. Variáveis de ambiente (Project Settings → Environment Variables):
   - `GEMINI_API_KEY=SEU_TOKEN_AQUI`

3. Faça o deploy:
   - Dashboard: clique em "Deploy".
   - ou CLI:
     ```bash
     npm i -g vercel
     vercel
     vercel --prod
     ```

Notas importantes:
- Este projeto é um SPA (Vite). O arquivo `vercel.json` já inclui o fallback de rotas para `index.html`.
- A chave `GEMINI_API_KEY` definida no Vercel é injetada em build-time nas variáveis do cliente; para maior segurança, considere mover as chamadas de IA para uma API Route (serverless) e não expor a chave no cliente.

## Desenvolvimento com rotas serverless (Vercel CLI)

Para usar a rota `api/ai` localmente, utilize o Vercel CLI:

1. Instale a CLI e faça login:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. Defina sua variável local (opcional, a CLI pode pedir):
   ```bash
   vercel env add GEMINI_API_KEY development
   ```
3. Rode o ambiente de desenvolvimento com funções:
   ```bash
   npm run dev:vercel
   ```
   Isso simula as Serverless Functions (`api/*`) enquanto você desenvolve.
