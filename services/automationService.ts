import { supabase } from './supabaseClient';

// ========================================================
// Tipos
// ========================================================

export interface AutomationSettings {
  pixKey: string;
  pixName: string;
  autoSendOverdue: boolean;
  autoSendWelcome: boolean;
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
// Abrir WhatsApp via wa.me
// ========================================================

export function openWhatsApp(phone: string, message: string): boolean {
  const { valid, formatted } = validateBRPhone(phone);
  if (!valid) return false;

  const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
}

// ========================================================
// Settings CRUD (Supabase)
// ========================================================

const DEFAULT_SETTINGS: AutomationSettings = {
  pixKey: '',
  pixName: '',
  autoSendOverdue: true,
  autoSendWelcome: false,
};

export async function getSettings(): Promise<AutomationSettings> {
  try {
    const { data, error } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      // Fallback: try localStorage migration
      const pixKey = localStorage.getItem('iptv_pix_key') || '';
      const pixName = localStorage.getItem('iptv_pix_name') || '';
      return { ...DEFAULT_SETTINGS, pixKey, pixName };
    }

    return {
      pixKey: data.pix_key || '',
      pixName: data.pix_name || '',
      autoSendOverdue: data.auto_send_overdue ?? true,
      autoSendWelcome: data.auto_send_welcome ?? false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AutomationSettings>): Promise<void> {
  const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (settings.pixKey !== undefined) mapped.pix_key = settings.pixKey;
  if (settings.pixName !== undefined) mapped.pix_name = settings.pixName;
  if (settings.autoSendOverdue !== undefined) mapped.auto_send_overdue = settings.autoSendOverdue;
  if (settings.autoSendWelcome !== undefined) mapped.auto_send_welcome = settings.autoSendWelcome;

  await supabase
    .from('automation_settings')
    .upsert({ id: 'default', ...mapped });

  // Keep localStorage in sync for legacy access
  if (settings.pixKey !== undefined) localStorage.setItem('iptv_pix_key', settings.pixKey);
  if (settings.pixName !== undefined) localStorage.setItem('iptv_pix_name', settings.pixName);
}

// ========================================================
// Message History
// ========================================================

function generateId(): string {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function recordMessage(entry: Omit<MessageHistoryEntry, 'id' | 'sentAt'>): Promise<void> {
  const id = generateId();
  await supabase.from('message_history').insert({
    id,
    customer_id: entry.customerId,
    subscription_id: entry.subscriptionId,
    message_type: entry.messageType,
    phone: entry.phone,
    message_preview: entry.messagePreview.slice(0, 200),
    status: entry.status,
    sent_at: new Date().toISOString(),
  });
}

export async function getRecentMessages(limit = 50): Promise<MessageHistoryEntry[]> {
  const { data, error } = await supabase
    .from('message_history')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

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

export async function getMessageCountForSubscription(subscriptionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('message_history')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId);

  if (error) return 0;
  return count || 0;
}

export async function getTodayMessageIds(): Promise<Set<string>> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('message_history')
    .select('subscription_id')
    .gte('sent_at', todayStart.toISOString())
    .eq('status', 'sent');

  const ids = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.subscription_id) ids.add(row.subscription_id);
    }
  }
  return ids;
}
