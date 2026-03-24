import { createClient } from "@supabase/supabase-js";
import BrokerCard from "@/components/BrokerCard";
import CapitalCard from "@/components/CapitalCard";
import PerformanceCard from "@/components/PerformanceCard";
import type { PublicStats } from "@/lib/supabase";

export const revalidate = 60;

async function getStats(): Promise<PublicStats | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("public_stats_cache")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as PublicStats;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const stats = await getStats();

  const fallback: PublicStats = {
    id: "",
    updated_at: new Date().toISOString(),
    broker_name: "Coinbase Advanced",
    is_live: false,
    starting_amount: 100,
    current_amount: 100,
    total_trades: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    realized_pnl: 0,
    pnl_pct: 0,
  };

  const s = stats ?? fallback;

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 w-full px-6 py-6 flex items-center justify-between"
        style={{ borderBottom: "1px solid #1e1e2e" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #00ff88, #00cc6a)",
              color: "#0d0d0f",
            }}
          >
            CT
          </div>
          <span className="font-bold text-textPrimary tracking-tight">
            CryptoTrader
          </span>
        </div>
        <div className="flex items-center gap-2">
          {s.is_live ? (
            <>
              <span className="live-dot" />
              <span className="section-label" style={{ color: "#00ff88" }}>
                BOT ACTIVE
              </span>
            </>
          ) : (
            <span className="section-label">STANDBY MODE</span>
          )}
        </div>
      </header>

      {/* Hero text */}
      <div className="relative z-10 px-6 pt-12 pb-8 text-center animate-fadeIn">
        <p className="section-label mb-3">Live Performance Dashboard</p>
        <h1
          className="text-3xl sm:text-4xl font-bold text-textPrimary mb-3"
          style={{ letterSpacing: "-0.02em" }}
        >
          Fully Automated. Zero Human Input.
        </h1>
        <p className="text-textSecondary text-sm max-w-md mx-auto">
          Real money. Real trades. Every result shown here was executed
          automatically by the bot — no manual intervention, ever.
        </p>
      </div>

      {/* Cards */}
      <div className="relative z-10 flex-1 px-4 sm:px-6 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <BrokerCard brokerName={s.broker_name} isLive={s.is_live} />
          <CapitalCard
            startingAmount={Number(s.starting_amount)}
            currentAmount={Number(s.current_amount)}
            realizedPnl={Number(s.realized_pnl)}
            pnlPct={Number(s.pnl_pct)}
            updatedAt={s.updated_at}
          />
          <PerformanceCard
            totalTrades={s.total_trades}
            wins={s.wins}
            losses={s.losses}
            winRate={Number(s.win_rate)}
          />
        </div>
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 py-5 text-center"
        style={{ borderTop: "1px solid #1e1e2e" }}
      >
        <p className="section-label">
          Data refreshes every 60 seconds &nbsp;|&nbsp; Powered by Coinbase Advanced
          &nbsp;|&nbsp; No financial advice
        </p>
      </footer>
    </main>
  );
}
