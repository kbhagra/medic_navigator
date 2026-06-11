import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOCHA — AI Hospital Automation Platform",
  description:
    "The best use of AI isn't to replace doctors. It's to give them their time back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
