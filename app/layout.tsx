import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Scoreboard",
  description: "Simple realtime scoreboard with operator and board views",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
