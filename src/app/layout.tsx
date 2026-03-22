import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navigator — AI Healthcare Agent",
  description:
    "The system is designed to make you give up. Navigator fights back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
