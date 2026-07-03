import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Réparto | SaaS Fintech Premium",
  description: "Répartition intelligente et automatique de vos paiements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("font-sans", inter.variable)}>
      <body className="antialiased min-h-screen bg-[#F5F5F7] text-foreground">
        {children}
      </body>
    </html>
  );
}
