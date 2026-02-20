import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billion Dollar App",
  description: "AI-powered outbound lead generation for recruitment agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
