"use client";

type PerformanceCardProps = {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
};

export default function PerformanceCard({
  totalTrades,
  wins,
  losses,
  winRate,
}: PerformanceCardProps) {
  const winBarWidth = winRate > 0 ? `${winRate}%` : "0%";

  return (
    <div className="card-glow bg-card rounded-2xl p-7 flex flex-col gap-6 animate-slideUp-3">
      <div className="flex items-center justify-between">
        <span className="section-label">Performance</span>
        <span className="section-label">All Time</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-textSecondary text-xs">Total Trades</span>
        <span
          className="stat-number text-4xl font-bold text-textPrimary"
          style={{ letterSpacing: "-0.02em" }}
        >
          {totalTrades}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          className="flex flex-col gap-1 rounded-xl px-4 py-3"
          style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}
        >
          <span className="section-label" style={{ color: "#00ff88" }}>
            Wins
          </span>
          <span className="stat-number text-2xl font-bold" style={{ color: "#00ff88" }}>
            {wins}
          </span>
        </div>
        <div
          className="flex flex-col gap-1 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,68,102,0.06)", border: "1px solid rgba(255,68,102,0.15)" }}
        >
          <span className="section-label" style={{ color: "#ff4466" }}>
            Losses
          </span>
          <span className="stat-number text-2xl font-bold" style={{ color: "#ff4466" }}>
            {losses}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="section-label">Win Rate</span>
          <span
            className="stat-number text-lg font-bold"
            style={{ color: winRate >= 50 ? "#00ff88" : "#ff4466" }}
          >
            {winRate.toFixed(1)}%
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: "6px", background: "#1e1e2e" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: winBarWidth,
              background: winRate >= 50
                ? "linear-gradient(90deg, #00ff88, #00cc6a)"
                : "linear-gradient(90deg, #ff4466, #cc2244)",
            }}
          />
        </div>
      </div>

      <div className="mt-auto pt-2 border-t border-border">
        <p className="text-xs text-textSecondary">
          Live results. Updated after every completed trade.
        </p>
      </div>
    </div>
  );
}
