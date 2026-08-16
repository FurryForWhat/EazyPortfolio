import type { Metadata } from "next";
import "@/globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "EazyPortfolio — Auto-generate your portfolio from GitHub",
  description:
    "Connect your GitHub, pick repos, get a portfolio. No manual write-ups.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070b1a] text-[#e8eaf0] antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
