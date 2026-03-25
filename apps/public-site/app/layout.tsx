import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraderMigs — Live Bot Performance",
  description:
    "Real-time automated trading performance on Coinbase Advanced. Fully hands-free. Zero manual intervention.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "TraderMigs — Live Bot Performance",
    description: "Watch a fully automated crypto trading bot in real time.",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "TraderMigs — Live Bot Performance",
    images: ["/logo.png"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="TraderMigs" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="noise-bg">{children}</body>
    </html>
  );
}
