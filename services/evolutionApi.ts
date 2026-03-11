// ========================================================
// Evolution API v2 Client - WhatsApp Integration
// ========================================================
//
// Compatible with Evolution API v2.x
// Docs: https://doc.evolution-api.com
//
// The user must provide their own Evolution API instance URL
// and Global API Key in the Automation settings.
// ========================================================

export interface EvolutionConfig {
  apiUrl: string;   // e.g. https://api.meusite.com
  apiKey: string;   // Global API Key
  instanceName: string;
}

export interface QrCodeResponse {
  pairingCode: string | null;
  code: string | null;
  base64: string | null;
  count: number;
}

export interface ConnectionState {
  instance: string;
  state: 'open' | 'close' | 'connecting';
}

export interface SendMessageResult {
  key: { remoteJid: string; fromMe: boolean; id: string };
  status: string;
}

// ========================================================
// Helper
// ========================================================

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey,
  };
}

function sanitizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// ========================================================
// Instance Management
// ========================================================

export async function createInstance(config: EvolutionConfig): Promise<{ created: boolean; error?: string }> {
  try {
    const url = `${sanitizeUrl(config.apiUrl)}/instance/create`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(config.apiKey),
      body: JSON.stringify({
        instanceName: config.instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        rejectCall: false,
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
      }),
    });

    if (resp.status === 403) return { created: false, error: 'API Key inválida.' };
    if (resp.status === 409) return { created: true }; // already exists
    if (!resp.ok) {
      const body = await resp.text();
      return { created: false, error: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
    }
    return { created: true };
  } catch (e: any) {
    return { created: false, error: e?.message || 'Erro de rede ao criar instância.' };
  }
}

// ========================================================
// QR Code
// ========================================================

export async function fetchQrCode(config: EvolutionConfig): Promise<{ qr: QrCodeResponse | null; error?: string }> {
  try {
    const url = `${sanitizeUrl(config.apiUrl)}/instance/connect/${config.instanceName}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config.apiKey),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { qr: null, error: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
    }

    const data = await resp.json();
    return { qr: data };
  } catch (e: any) {
    return { qr: null, error: e?.message || 'Erro ao buscar QR Code.' };
  }
}

// ========================================================
// Connection State
// ========================================================

export async function getConnectionState(config: EvolutionConfig): Promise<ConnectionState | null> {
  try {
    const url = `${sanitizeUrl(config.apiUrl)}/instance/connectionState/${config.instanceName}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config.apiKey),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return { instance: data.instance || config.instanceName, state: data.state || 'close' };
  } catch {
    return null;
  }
}

// ========================================================
// Send Text Message
// ========================================================

export async function sendTextMessage(
  config: EvolutionConfig,
  phone: string,
  text: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    // Format phone: remove non-digits, ensure country code
    const digits = phone.replace(/\D/g, '');
    let jid = digits;
    if (!jid.startsWith('55') && jid.length <= 11) {
      jid = '55' + jid;
    }

    const url = `${sanitizeUrl(config.apiUrl)}/message/sendText/${config.instanceName}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(config.apiKey),
      body: JSON.stringify({
        number: jid,
        text: text,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { sent: false, error: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
    }

    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e?.message || 'Erro ao enviar mensagem.' };
  }
}

// ========================================================
// Logout / Disconnect
// ========================================================

export async function logoutInstance(config: EvolutionConfig): Promise<void> {
  try {
    const url = `${sanitizeUrl(config.apiUrl)}/instance/logout/${config.instanceName}`;
    await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(config.apiKey),
    });
  } catch {
    // silently fail
  }
}

// ========================================================
// Delete Instance
// ========================================================

export async function deleteInstance(config: EvolutionConfig): Promise<void> {
  try {
    const url = `${sanitizeUrl(config.apiUrl)}/instance/delete/${config.instanceName}`;
    await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(config.apiKey),
    });
  } catch {
    // silently fail
  }
}

// ========================================================
// Validate config
// ========================================================

export function isConfigured(config: EvolutionConfig): boolean {
  return !!(config.apiUrl && config.apiKey && config.instanceName);
}
