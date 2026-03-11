import { supabase } from './supabaseClient';
import { Customer, Server, Plan, Subscription, SubscriptionStatus } from '../types';

// ========================================================
// Mapeamento snake_case (Supabase/Postgres) <-> camelCase (App)
// ========================================================

const mapCustomerFromDB = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  appName: row.app_name,
  mac: row.mac || '',
  key: row.key || '',
  notes: row.notes || '',
  createdAt: row.created_at,
});

const mapCustomerToDB = (c: Partial<Customer>) => ({
  ...(c.id !== undefined && { id: c.id }),
  ...(c.name !== undefined && { name: c.name }),
  ...(c.phone !== undefined && { phone: c.phone }),
  ...(c.appName !== undefined && { app_name: c.appName }),
  ...(c.mac !== undefined && { mac: c.mac }),
  ...(c.key !== undefined && { key: c.key }),
  ...(c.notes !== undefined && { notes: c.notes }),
  ...(c.createdAt !== undefined && { created_at: c.createdAt }),
});

const mapServerFromDB = (row: any): Server => ({
  id: row.id,
  name: row.name,
  url: row.url,
  maxConnections: row.max_connections,
  creditCost: Number(row.credit_cost),
});

const mapServerToDB = (s: Partial<Server>) => ({
  ...(s.id !== undefined && { id: s.id }),
  ...(s.name !== undefined && { name: s.name }),
  ...(s.url !== undefined && { url: s.url }),
  ...(s.maxConnections !== undefined && { max_connections: s.maxConnections }),
  ...(s.creditCost !== undefined && { credit_cost: s.creditCost }),
});

const mapPlanFromDB = (row: any): Plan => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),
  durationDays: row.duration_days,
});

const mapPlanToDB = (p: Partial<Plan>) => ({
  ...(p.id !== undefined && { id: p.id }),
  ...(p.name !== undefined && { name: p.name }),
  ...(p.price !== undefined && { price: p.price }),
  ...(p.durationDays !== undefined && { duration_days: p.durationDays }),
});

const mapSubscriptionFromDB = (row: any): Subscription => ({
  id: row.id,
  customerId: row.customer_id,
  planId: row.plan_id,
  serverId: row.server_id,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status as SubscriptionStatus,
  isTrustActivation: row.is_trust_activation,
  paymentMethod: row.payment_method || undefined,
});

const mapSubscriptionToDB = (s: Partial<Subscription>) => ({
  ...(s.id !== undefined && { id: s.id }),
  ...(s.customerId !== undefined && { customer_id: s.customerId }),
  ...(s.planId !== undefined && { plan_id: s.planId }),
  ...(s.serverId !== undefined && { server_id: s.serverId }),
  ...(s.startDate !== undefined && { start_date: s.startDate }),
  ...(s.endDate !== undefined && { end_date: s.endDate }),
  ...(s.status !== undefined && { status: s.status }),
  ...(s.isTrustActivation !== undefined && { is_trust_activation: s.isTrustActivation }),
  ...(s.paymentMethod !== undefined ? { payment_method: s.paymentMethod } : { payment_method: null }),
});

// Mappers por tabela
type TableName = 'customers' | 'servers' | 'plans' | 'subscriptions';

const fromDB: Record<TableName, (row: any) => any> = {
  customers: mapCustomerFromDB,
  servers: mapServerFromDB,
  plans: mapPlanFromDB,
  subscriptions: mapSubscriptionFromDB,
};

const toDB: Record<TableName, (item: any) => any> = {
  customers: mapCustomerToDB,
  servers: mapServerToDB,
  plans: mapPlanToDB,
  subscriptions: mapSubscriptionToDB,
};

// ========================================================
// Helper: Mapeia nomes de índice do app para colunas do Postgres
// ========================================================

function columnMap(storeName: string, indexName: string): string {
  const map: Record<string, Record<string, string>> = {
    customers: { createdAt: 'created_at' },
    subscriptions: {
      status: 'status',
      endDate: 'end_date',
      startDate: 'start_date',
      customer_id: 'customer_id',
    },
  };
  return map[storeName]?.[indexName] || indexName;
}

// ========================================================
// Health Check
// ========================================================

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
};

// ========================================================
// Generic CRUD Operations
// ========================================================

export const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
  const { data, error } = await supabase.from(storeName).select('*');
  if (error) throw new Error(`Erro ao buscar ${storeName}: ${error.message}`);
  return (data || []).map(fromDB[storeName as TableName]);
};

export const dbGetAllFromIndex = async <T>(
  storeName: string,
  indexName: string,
  query: string
): Promise<T[]> => {
  const column = columnMap(storeName, indexName);
  const { data, error } = await supabase
    .from(storeName)
    .select('*')
    .eq(column, query);
  if (error) throw new Error(`Erro ao buscar ${storeName} por ${indexName}: ${error.message}`);
  return (data || []).map(fromDB[storeName as TableName]);
};

export const dbGetById = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const { data, error } = await supabase
    .from(storeName)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar registro: ${error.message}`);
  return data ? fromDB[storeName as TableName](data) : undefined;
};

export const dbCount = async (
  storeName: string,
  indexName?: string,
  query?: string
): Promise<number> => {
  let q = supabase.from(storeName).select('*', { count: 'exact', head: true });
  if (indexName && query !== undefined) {
    const column = columnMap(storeName, indexName);
    q = q.eq(column, query);
  }
  const { count, error } = await q;
  if (error) throw new Error(`Erro ao contar ${storeName}: ${error.message}`);
  return count || 0;
};

export const dbGetRange = async <T>(
  storeName: string,
  indexName: string,
  lowerBound: string,
  upperBound: string
): Promise<T[]> => {
  const column = columnMap(storeName, indexName);
  const { data, error } = await supabase
    .from(storeName)
    .select('*')
    .gte(column, lowerBound)
    .lte(column, upperBound);
  if (error) throw new Error(`Erro ao buscar range: ${error.message}`);
  return (data || []).map(fromDB[storeName as TableName]);
};

export const dbGetRecent = async <T>(
  storeName: string,
  indexName: string,
  limit: number
): Promise<T[]> => {
  const column = columnMap(storeName, indexName);
  const { data, error } = await supabase
    .from(storeName)
    .select('*')
    .order(column, { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Erro ao buscar recentes: ${error.message}`);
  return (data || []).map(fromDB[storeName as TableName]);
};

export const dbAdd = async <T>(storeName: string, item: T): Promise<T> => {
  const mapped = toDB[storeName as TableName](item);
  const { data, error } = await supabase
    .from(storeName)
    .insert(mapped)
    .select()
    .single();
  if (error) throw new Error(`Erro ao inserir em ${storeName}: ${error.message}`);
  return fromDB[storeName as TableName](data);
};

export const dbUpdate = async <T extends { id?: string }>(storeName: string, item: T): Promise<T> => {
  const mapped = toDB[storeName as TableName](item);
  const { data, error } = await supabase
    .from(storeName)
    .update(mapped)
    .eq('id', item.id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar ${storeName}: ${error.message}`);
  return fromDB[storeName as TableName](data);
};

export const dbDelete = async (storeName: string, id: string): Promise<string> => {
  const { error } = await supabase.from(storeName).delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir de ${storeName}: ${error.message}`);
  return id;
};