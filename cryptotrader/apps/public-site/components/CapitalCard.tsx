"use client";

type CapitalCardProps = {
  startingAmount: number;
  currentAmount: number;
  realizedPnl: number;
  pnlPct: number;
  updatedAt: string;
};

export default function CapitalCard({
  startingAmount,
  currentAmount,
  realizedPnl,
  pnlPct,
  updatedAt,
}: CapitalCardProps) {
  const isPositive = realizedPnl >= 0;
  const pnlColor = isPositive ? "#00ff88" : "#ff4466";
  const sign = isPositive ? "+" : "";

  const formatUSD = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="card-glow bg-card rounded-2xl p-7 flex flex-col gap-6 animate-slideUp-2">
      <div className="flex items-center justify-between">
        <span className="section-label">Capital</span>
        <span className="section-label">USD</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-textSecondary text-xs">Current Balance</span>
        <span
          className="stat-number text-4xl font-bold text-textPrimary"
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatUSD(currentAmount)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="section-label">Starting</span>
          <span className="stat-number text-lg font-semibold text-textSecondary">
            {formatUSD(startingAmount)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="section-label">Total P&amp;L</span>
          <span
            className="stat-number text-lg font-semibold"
            style={{ color: pnlColor }}
          >
            {sign}
            {formatUSD(realizedPnl)}
          </span>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e2e" }}
      >
        <span className="section-label">Return</span>
        <span
          className="stat-number text-2xl font-bold"
          style={{ color: pnlColor }}
        >
          {sign}
          {pnlPct.toFixed(2)}%
        </span>
      </div>

      <div className="mt-auto pt-2 border-t border-border">
        <p className="text-xs text-textSecondary">
          Updated: {formatTime(updatedAt)}
        </p>
      </div>
    </div>
  );
}
