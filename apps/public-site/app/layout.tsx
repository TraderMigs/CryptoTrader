import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraderMigs — Live Bot Performance",
  description:
    "Real-time automated trading performance on Coinbase Advanced. Fully hands-free. Zero manual intervention.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "TraderMigs — Live Bot Performance",
    description: "Watch a fully automated crypto trading bot in real time.",
    type: "website",
    images: ["/logo.png"],
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
