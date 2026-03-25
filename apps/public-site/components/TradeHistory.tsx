"use client";

type Trade = {
  id: string;
  symbol: string;
  opened_at: string;
  closed_at: string | null;
  entry_price: number | null;
  exit_price: number | null;
  size: number | null;
  pnl_amount: number | null;
  result: string | null;
  cycle_state: string;
};

type TradeHistoryProps = {
  trades: Trade[];
};

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const formatUSD = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(n);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "—";
    }
  };

  const isWin = (trade: Trade) =>
    trade.pnl_amount !== null && trade.pnl_amount > 0;

  const isOpen = (trade: Trade) =>
    trade.cycle_state === "entry_submitted" ||
    trade.cycle_state === "fully_filled_entry";

  return (
    <div
      className="card-glow bg-card rounded-2xl p-7 flex flex-col gap-5"
      style={{ animationDelay: "0.4s" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="section-label">Trade History</span>
        <span className="section-label">{trades.length} Total</span>
      </div>

      {/* Column headers */}
      {trades.length > 0 && (
        <div
          className="grid text-xs"
          style={{
            gridTemplateColumns: "1fr 80px 90px 90px 80px 90px",
            color: "#4a4a6a",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
            paddingBottom: "8px",
            borderBottom: "1px solid #1e1e2e",
          }}
        >
          <span>DATE / SYMBOL</span>
          <span className="text-right">STATUS</span>
          <span className="text-right">ENTRY</span>
          <span className="text-right">EXIT</span>
          <span className="text-right">SIZE</span>
          <span className="text-right">P&amp;L</span>
        </div>
      )}

      {/* Trade rows */}
      <div
        className="flex flex-col gap-3 overflow-y-auto"
        style={{ maxHeight: "340px" }}
      >
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e2e" }}
            >
              <span style={{ fontSize: "20px" }}>📊</span>
            </div>
            <p className="text-textSecondary text-sm text-center">
              No trades yet.
              <br />
              Waiting for first signal.
            </p>
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="section-label" style={{ color: "#00ff88" }}>
                Bot scanning market
              </span>
            </div>
          </div>
        ) : (
          trades.map((trade) => {
            const win = isWin(trade);
            const open = isOpen(trade);
            const pnl = trade.pnl_amount ?? 0;
            const pnlColor = open ? "#8888aa" : win ? "#00ff88" : "#ff4466";
            const statusLabel = open ? "OPEN" : win ? "WIN" : "LOSS";
            const statusBg = open
              ? "rgba(136,136,170,0.1)"
              : win
              ? "rgba(0,255,136,0.08)"
              : "rgba(255,68,102,0.08)";
            const statusBorder = open
              ? "rgba(136,136,170,0.2)"
              : win
              ? "rgba(0,255,136,0.2)"
              : "rgba(255,68,102,0.2)";

            return (
              <div
                key={trade.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "1fr 80px 90px 90px 80px 90px",
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {/* Date + Symbol */}
                <div className="flex flex-col gap-1">
                  <span
                    className="font-semibold text-sm text-textPrimary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {trade.symbol}
                  </span>
                  <span className="text-xs text-textSecondary">
                    {formatDate(trade.opened_at)}
                  </span>
                </div>

                {/* Status badge */}
                <div className="flex justify-end">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{
                      color: pnlColor,
                      background: statusBg,
                      border: `1px solid ${statusBorder}`,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Entry */}
                <div className="text-right">
                  <span
                    className="text-xs text-textSecondary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {trade.entry_price
                      ? `$${formatPrice(trade.entry_price)}`
                      : "—"}
                  </span>
                </div>

                {/* Exit */}
                <div className="text-right">
                  <span
                    className="text-xs text-textSecondary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {trade.exit_price
                      ? `$${formatPrice(trade.exit_price)}`
                      : open
                      ? "Open"
                      : "—"}
                  </span>
                </div>

                {/* Size */}
                <div className="text-right">
                  <span
                    className="text-xs text-textSecondary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {trade.size
                      ? Number(trade.size).toFixed(5)
                      : "—"}
                  </span>
                </div>

                {/* PnL */}
                <div className="text-right">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: pnlColor,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {open
                      ? "—"
                      : pnl >= 0
                      ? `+${formatUSD(pnl)}`
                      : formatUSD(pnl)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-textSecondary">
          All trades executed automatically. Entry and exit recorded from
          exchange-confirmed fills only.
        </p>
      </div>
    </div>
  );
}
