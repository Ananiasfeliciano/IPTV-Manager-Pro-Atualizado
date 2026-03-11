-- =====================================================
-- IPTV Manager Pro — Script de Criação do Banco de Dados
-- Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    app_name TEXT NOT NULL DEFAULT '',
    mac TEXT DEFAULT '',
    key TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Servidores
CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    max_connections INTEGER NOT NULL DEFAULT 0,
    credit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- 3. Tabela de Planos
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30
);

-- 4. Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE SET NULL,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativa',
    is_trust_activation BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method TEXT DEFAULT NULL
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- 6. Row Level Security (RLS) — Permitir acesso público via anon key
-- Em produção, adicione autenticação e restrinja as policies.

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies para permitir todas as operações (ajuste em produção)
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on servers" ON servers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on plans" ON plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

-- 7. Dados iniciais (Seed)
INSERT INTO customers (id, name, phone, app_name, mac, key, notes, created_at) VALUES
    ('c1', 'João da Silva', '(11) 99999-1111', 'App TV Pro', '00:1A:2B:3C:4D:5E', 'XYZ123ABC', 'Cliente antigo.', '2023-10-25T10:00:00Z'),
    ('c2', 'Maria Oliveira', '(21) 98888-2222', 'Play TV', 'F8:E7:D6:C5:B4:A3', 'DEF456GHI', '', '2023-11-15T14:30:00Z'),
    ('c3', 'Pedro Souza', '(31) 97777-3333', 'Ultra Play', '12:34:56:78:90:AB', 'JKL789MNO', '', '2024-01-05T09:00:00Z'),
    ('c4', 'Ana Pereira', '(41) 96666-4444', 'App TV Pro', 'CD:EF:01:23:45:67', 'PQR012STU', 'Pagamento atrasado em Setembro.', '2024-02-20T18:45:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO servers (id, name, url, max_connections, credit_cost) VALUES
    ('s3', 'Live 21', 'http://live21.servidor.iptv', 300, 4.00),
    ('s4', 'Ultron', 'http://ultron.servidor.iptv', 400, 4.50),
    ('s5', 'Elite', 'http://elite.servidor.iptv', 350, 3.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, price, duration_days) VALUES
    ('p1', 'Plano Básico', 29.90, 30),
    ('p2', 'Plano Premium', 49.90, 30),
    ('p3', 'Plano Trimestral', 129.90, 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, customer_id, plan_id, server_id, start_date, end_date, status, is_trust_activation) VALUES
    ('sub1', 'c1', 'p2', 's3', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 'Ativa', false),
    ('sub2', 'c2', 'p1', 's3', NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', 'Vencida', false),
    ('sub3', 'c3', 'p3', 's3', NOW() - INTERVAL '5 days', NOW() + INTERVAL '85 days', 'Ativa', false),
    ('sub4', 'c4', 'p1', 's3', NOW(), NOW() + INTERVAL '30 days', 'Confiança', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. Tabela de Configurações de Automação
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    pix_key TEXT DEFAULT '',
    pix_name TEXT DEFAULT '',
    auto_send_overdue BOOLEAN DEFAULT true,
    auto_send_welcome BOOLEAN DEFAULT false,
    evo_api_url TEXT DEFAULT '',
    evo_api_key TEXT DEFAULT '',
    evo_instance_name TEXT DEFAULT 'iptv-manager',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on automation_settings" ON automation_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO automation_settings (id, pix_key, pix_name, auto_send_overdue, auto_send_welcome, evo_api_url, evo_api_key, evo_instance_name)
VALUES ('default', '', '', true, false, '', '', 'iptv-manager')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. Tabela de Histórico de Mensagens
-- =====================================================
CREATE TABLE IF NOT EXISTS message_history (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL DEFAULT 'manual',
    phone TEXT NOT NULL,
    message_preview TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_history_customer ON message_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_history_sent_at ON message_history(sent_at);

ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on message_history" ON message_history FOR ALL USING (true) WITH CHECK (true);
