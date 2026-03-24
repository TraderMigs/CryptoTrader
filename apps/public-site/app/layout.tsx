import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoTrader — Live Bot Performance",
  description:
    "Real-time automated trading performance on Coinbase Advanced. Fully hands-free. Zero manual intervention.",
  openGraph: {
    title: "CryptoTrader — Live Bot Performance",
    description: "Watch a fully automated crypto trading bot in real time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise-bg">{children}</body>
    </html>
  );
}
