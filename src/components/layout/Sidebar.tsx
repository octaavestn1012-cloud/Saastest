"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, SlidersHorizontal, History, Link2, Settings, LifeBuoy, PieChart, Zap, Users, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useRepartition } from "@/context/RepartitionContext";

const navItems = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Répartir", action: "modal", icon: Zap },
  { name: "Règles", href: "/rules", icon: SlidersHorizontal },
  { name: "Mes numéros", href: "/destinataires", icon: Users },
  { name: "Historique", href: "/historique", icon: History },
  { name: "Rapports", href: "/rapports", icon: PieChart },
  { name: "Connexions", href: "/connections", icon: Link2 },
  { name: "Facturation", href: "/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { openModal } = useRepartition();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-black/[0.05] bg-white px-4 py-6 z-10 relative">
      <Link href="/dashboard" className="flex items-center gap-3 mb-12 px-2 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-[1.2rem] bg-black flex items-center justify-center text-white font-bold shadow-md">
          R
        </div>
        <span className="text-2xl font-bold tracking-tight text-black">Réparto</span>
      </Link>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          
          if (item.action === "modal") {
            return (
              <button 
                key={item.name} 
                onClick={() => openModal()}
                className="w-full relative block group text-left"
              >
                <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors duration-200 text-muted-foreground hover:text-black hover:bg-black/[0.02]">
                  <item.icon className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-primary" />
                  <span className="tracking-tight text-[15px]">{item.name}</span>
                </div>
              </button>
            );
          }

          return (
            <Link key={item.name} href={item.href!} className="relative block group">
              {active && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-2xl bg-black/[0.03]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className={`relative z-10 flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors duration-200 ${active ? "text-black font-semibold" : "text-muted-foreground hover:text-black hover:bg-black/[0.02]"}`}>
                <item.icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-black"}`} />
                <span className="tracking-tight text-[15px]">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-6">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-muted-foreground hover:text-black hover:bg-black/[0.02] transition-colors tracking-tight text-[15px]">
          <Settings className="w-5 h-5" />
          Paramètres
        </Link>
        <Link href="/support" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-muted-foreground hover:text-black hover:bg-black/[0.02] transition-colors tracking-tight text-[15px]">
          <LifeBuoy className="w-5 h-5" />
          Support
        </Link>
      </div>
    </aside>
  );
}
