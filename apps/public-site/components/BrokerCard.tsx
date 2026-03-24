"use client";

type BrokerCardProps = {
  brokerName: string;
  isLive: boolean;
};

export default function BrokerCard({ brokerName, isLive }: BrokerCardProps) {
  return (
    <div className="card-glow bg-card rounded-2xl p-7 flex flex-col gap-6 animate-slideUp-1">
      <div className="flex items-center justify-between">
        <span className="section-label">Trading Venue</span>
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="live-dot" />
              <span className="section-label" style={{ color: "#00ff88" }}>
                LIVE
              </span>
            </>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full bg-neutral-600"
                style={{ display: "inline-block" }}
              />
              <span className="section-label">STANDBY</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-textPrimary tracking-tight">
          {brokerName}
        </h2>
        <p className="text-sm text-textSecondary">
          Automated spot trading via REST API
        </p>
      </div>

      <div className="mt-auto pt-2 border-t border-border flex flex-col gap-3">
        <p className="text-xs text-textSecondary leading-relaxed">
          All trades executed programmatically. Zero manual intervention.
        </p>
        <a
          href="https://coinbase.com/join"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)",
            color: "#0d0d0f",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.opacity = "1";
          }}
        >
          Open Coinbase Account
        </a>
      </div>
    </div>
  );
}
