-- ============================================================
-- CryptoTrader: Phase 1 Foundation Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. BOT CONFIG — master on/off switch and settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL DEFAULT 'CryptoTrader',
  status TEXT NOT NULL DEFAULT 'inactive',
  environment TEXT NOT NULL DEFAULT 'live',
  broker_name TEXT NOT NULL DEFAULT 'Coinbase Advanced',
  broker_mode TEXT NOT NULL DEFAULT 'spot',
  live_enabled BOOLEAN NOT NULL DEFAULT false,
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bot_config (bot_name, status, environment, broker_name, broker_mode, live_enabled, kill_switch)
VALUES ('CryptoTrader', 'inactive', 'live', 'Coinbase Advanced', 'spot', false, false)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. ACCOUNT SNAPSHOTS — balance history over time
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  starting_balance NUMERIC(20,8) NOT NULL DEFAULT 100.00,
  current_balance NUMERIC(20,8) NOT NULL DEFAULT 100.00,
  available_cash NUMERIC(20,8) NOT NULL DEFAULT 100.00,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  equity NUMERIC(20,8) NOT NULL DEFAULT 100.00
);

-- ------------------------------------------------------------
-- 3. TRADE CYCLES — one row per completed trade round-trip
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  cycle_state TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  entry_order_id TEXT,
  exit_order_id TEXT,
  result TEXT,
  pnl_amount NUMERIC(20,8),
  pnl_pct NUMERIC(10,4)
);

-- ------------------------------------------------------------
-- 4. PUBLIC STATS CACHE — single row powering the public site
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  broker_name TEXT NOT NULL DEFAULT 'Coinbase Advanced',
  is_live BOOLEAN NOT NULL DEFAULT false,
  starting_amount NUMERIC(20,8) NOT NULL DEFAULT 100.00,
  current_amount NUMERIC(20,8) NOT NULL DEFAULT 100.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  pnl_pct NUMERIC(10,4) NOT NULL DEFAULT 0
);

INSERT INTO public_stats_cache (
  broker_name, is_live, starting_amount, current_amount,
  total_trades, wins, losses, win_rate, realized_pnl, pnl_pct
) VALUES (
  'Coinbase Advanced', false, 100.00, 100.00,
  0, 0, 0, 0.00, 0.00, 0.00
);

-- ------------------------------------------------------------
-- 5. AUDIT LOGS — every important event recorded
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  payload_json JSONB
);

-- ------------------------------------------------------------
-- 6. SYSTEM HEALTH — worker heartbeat and status
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  worker_online BOOLEAN NOT NULL DEFAULT false,
  exchange_api_ok BOOLEAN NOT NULL DEFAULT false,
  db_ok BOOLEAN NOT NULL DEFAULT true,
  latest_trade_cycle_status TEXT,
  latest_error TEXT
);

INSERT INTO system_health (worker_online, exchange_api_ok, db_ok)
VALUES (false, false, true);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_stats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Public can read public_stats_cache only (powers the public website)
CREATE POLICY "public_read_stats" ON public_stats_cache
  FOR SELECT USING (true);

-- Service role has full access to everything
CREATE POLICY "service_all_bot_config" ON bot_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_account_snapshots" ON account_snapshots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_trade_cycles" ON trade_cycles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_public_stats" ON public_stats_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_audit_logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_system_health" ON system_health
  FOR ALL USING (auth.role() = 'service_role');
