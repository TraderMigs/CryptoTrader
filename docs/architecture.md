# CryptoTrader — Architecture Notes

## Supabase Project
- Project ID: kzsixgtsowzmheswxyeq
- Region: East US (North Virginia)

## Key Tables
- bot_config: master on/off, kill switch
- account_snapshots: balance history
- trade_cycles: every trade round-trip
- public_stats_cache: powers the public website
- audit_logs: every important event
- system_health: worker heartbeat

## Edge Functions (Phase 2+)
- trading-worker: main execution loop
- metrics-updater: refreshes public_stats_cache
- reconciliation: verifies exchange vs local state
- health-ping: heartbeat
