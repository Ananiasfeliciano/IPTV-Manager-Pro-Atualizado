import { supabase } from './supabaseClient';
import {
  EvolutionConfig,
  sendTextMessage as evoSendText,
  isConfigured as evoIsConfigured,
} from './evolutionApi';

// ========================================================
// Tipos
// ========================================================

export interface AutomationSettings {
  pixKey: string;
  pixName: string;
  autoSendOverdue: boolean;
  autoSendWelcome: boolean;
  // Evolution API
  evoApiUrl: string;
  evoApiKey: string;
  evoInstanceName: string;
}

export interface MessageHistoryEntry {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  messageType: string;
  phone: string;
  messagePreview: string;
  status: 'sent' | 'failed';
  sentAt: string;
}

// ========================================================
// Validação de telefone BR
// ========================================================

export function validateBRPhone(phone: string): { valid: boolean; formatted: string } {
  const digits = phone.replace(/\D/g, '');
  // Aceitar 10 ou 11 dígitos (DDD + número)
  if (digits.length < 10 || digits.length > 11) {
    return { valid: false, formatted: '' };
  }
  return { valid: true, formatted: '55' + digits };
}

// ========================================================
// Abrir WhatsApp via wa.me (fallback)
// ========================================================

export function openWhatsApp(phone: string, message: string): boolean {
  const { valid, formatted } = validateBRPhone(phone);
  if (!valid) return false;

  const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
}

// ========================================================
// Envio unificado: Evolution API se conectado, senão wa.me
// ========================================================

export async function sendMessage(
  phone: string,
  message: string,
  settings: AutomationSettings,
  useApi: boolean
): Promise<{ sent: boolean; method: 'api' | 'wame'; error?: string }> {
  const { valid } = validateBRPhone(phone);
  if (!valid) return { sent: false, method: 'wame', error: 'Telefone inválido' };

  const evoConfig: EvolutionConfig = {
    apiUrl: settings.evoApiUrl,
    apiKey: settings.evoApiKey,
    instanceName: settings.evoInstanceName,
  };

  // Try Evolution API if configured and connected
  if (useApi && evoIsConfigured(evoConfig)) {
    const result = await evoSendText(evoConfig, phone, message);
    if (result.sent) {
      return { sent: true, method: 'api' };
    }
    return { sent: false, method: 'api', error: result.error };
  }

  // Fallback: wa.me link
  const ok = openWhatsApp(phone, message);
  return { sent: ok, method: 'wame' };
}

// ========================================================
// Helpers para Evolution Config
// ========================================================

export function getEvolutionConfig(settings: AutomationSettings): EvolutionConfig {
  return {
    apiUrl: settings.evoApiUrl,
    apiKey: settings.evoApiKey,
    instanceName: settings.evoInstanceName,
  };
}

// ========================================================
// Settings CRUD (Supabase)
// ========================================================

const DEFAULT_SETTINGS: AutomationSettings = {
  pixKey: '',
  pixName: '',
  autoSendOverdue: true,
  autoSendWelcome: false,
  evoApiUrl: 'http://localhost:8080',
  evoApiKey: 'iptv-manager-local-key',
  evoInstanceName: 'iptv-manager',
};

const LS_SETTINGS_KEY = 'iptv_automation_settings';
const LS_HISTORY_KEY = 'iptv_message_history';

function getLocalSettings(): AutomationSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveLocalSettings(settings: Partial<AutomationSettings>): void {
  const current = getLocalSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(merged));
}

export async function getSettings(): Promise<AutomationSettings> {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data) {
      return {
        pixKey: data.pix_key || '',
        pixName: data.pix_name || '',
        autoSendOverdue: data.auto_send_overdue ?? true,
        autoSendWelcome: data.auto_send_welcome ?? false,
        evoApiUrl: data.evo_api_url || DEFAULT_SETTINGS.evoApiUrl,
        evoApiKey: data.evo_api_key || DEFAULT_SETTINGS.evoApiKey,
        evoInstanceName: data.evo_instance_name || DEFAULT_SETTINGS.evoInstanceName,
      };
    }
  } catch { /* Supabase table may not exist */ }

  // Fallback: localStorage
  return getLocalSettings();
}

export async function saveSettings(settings: Partial<AutomationSettings>): Promise<void> {
  // Always save to localStorage (works even if Supabase tables don't exist)
  saveLocalSettings(settings);

  // Try Supabase (best-effort)
  try {
    const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (settings.pixKey !== undefined) mapped.pix_key = settings.pixKey;
    if (settings.pixName !== undefined) mapped.pix_name = settings.pixName;
    if (settings.autoSendOverdue !== undefined) mapped.auto_send_overdue = settings.autoSendOverdue;
    if (settings.autoSendWelcome !== undefined) mapped.auto_send_welcome = settings.autoSendWelcome;
    if (settings.evoApiUrl !== undefined) mapped.evo_api_url = settings.evoApiUrl;
    if (settings.evoApiKey !== undefined) mapped.evo_api_key = settings.evoApiKey;
    if (settings.evoInstanceName !== undefined) mapped.evo_instance_name = settings.evoInstanceName;

    await supabase
      .from('automation_settings')
      .upsert({ id: 'default', ...mapped });
  } catch { /* Supabase table may not exist */ }
}

// ========================================================
// Message History
// ========================================================

function generateId(): string {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getLocalHistory(): MessageHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLocalHistory(entries: MessageHistoryEntry[]): void {
  // Keep max 200 entries in localStorage
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(entries.slice(0, 200)));
}

export async function recordMessage(entry: Omit<MessageHistoryEntry, 'id' | 'sentAt'>): Promise<void> {
  const id = generateId();
  const sentAt = new Date().toISOString();
  const full: MessageHistoryEntry = { id, ...entry, sentAt, status: entry.status };

  // Save to localStorage always
  const local = getLocalHistory();
  local.unshift(full);
  saveLocalHistory(local);

  // Try Supabase (best-effort)
  try {
    await supabase.from('message_history').insert({
      id,
      customer_id: entry.customerId,
      subscription_id: entry.subscriptionId,
      message_type: entry.messageType,
      phone: entry.phone,
      message_preview: entry.messagePreview.slice(0, 200),
      status: entry.status,
      sent_at: sentAt,
    });
  } catch { /* table may not exist */ }
}

export async function getRecentMessages(limit = 50): Promise<MessageHistoryEntry[]> {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('message_history')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        customerId: row.customer_id,
        subscriptionId: row.subscription_id,
        messageType: row.message_type,
        phone: row.phone,
        messagePreview: row.message_preview,
        status: row.status,
        sentAt: row.sent_at,
      }));
    }
  } catch { /* table may not exist */ }

  // Fallback: localStorage
  return getLocalHistory().slice(0, limit);
}

export async function getMessageCountForSubscription(subscriptionId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('message_history')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId);
    if (!error && count) return count;
  } catch { /* table may not exist */ }

  // Fallback: localStorage
  return getLocalHistory().filter(m => m.subscriptionId === subscriptionId).length;
}

export async function getTodayMessageIds(): Promise<Set<string>> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const ids = new Set<string>();

  // Try Supabase
  try {
    const { data } = await supabase
      .from('message_history')
      .select('subscription_id')
      .gte('sent_at', todayIso)
      .eq('status', 'sent');

    if (data) {
      for (const row of data) {
        if (row.subscription_id) ids.add(row.subscription_id);
      }
      if (ids.size > 0) return ids;
    }
  } catch { /* table may not exist */ }

  // Fallback: localStorage
  for (const m of getLocalHistory()) {
    if (m.status === 'sent' && m.subscriptionId && m.sentAt >= todayIso) {
      ids.add(m.subscriptionId);
    }
  }
  return ids;
}
