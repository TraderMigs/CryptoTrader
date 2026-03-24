# CryptoTrader — Coinbase AutoBot

Fully automated crypto trading system built on Coinbase Advanced Trade API.

## Stack
- **GitHub** — Source control
- **Vercel** — Public dashboard hosting
- **Supabase** — Database, Edge Functions, Cron scheduling

## Structure
```
/apps/public-site       Public performance dashboard (Vercel)
/apps/admin-site        Admin controls (private, future)
/supabase/migrations    Database schema SQL files
/supabase/functions     Edge Functions (trading worker lives here)
/packages/shared-types  Shared TypeScript types
/docs                   Architecture notes and runbooks
```

## Phases
- Phase 1: Foundation — repo, schema, dashboard shell, Coinbase handshake
- Phase 2: Data & State — market data, account snapshots, state machines
- Phase 3: Order Execution — signal, order placement, fill ingestion
- Phase 4: Reconciliation — exchange truth vs local truth
- Phase 5: Risk Engine — position sizing, stop loss, kill switch
- Phase 6: Full Public Dashboard — live trade feed, equity curve
- Phase 7: Monitoring — Telegram alerts, heartbeat, watchdog
- Phase 8: Hardening — soak test, retry logic, edge cases
- Phase 9: Scale — more capital, multi-symbol, AI reporting layer

## Security
Zero secrets in code. All credentials stored in Vercel Environment Variables and Supabase Vault.
