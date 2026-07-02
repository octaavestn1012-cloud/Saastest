"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, SlidersHorizontal, History, Menu, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useRepartition } from "@/context/RepartitionContext";

const leftTabs = [
  { name: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { name: "Règles", href: "/rules", icon: SlidersHorizontal },
];

const rightTabs = [
  { name: "Historique", href: "/historique", icon: History },
  { name: "Menu", href: "/menu", icon: Menu },
];

export function BottomTabs() {
  const pathname = usePathname();
  const { openModal } = useRepartition();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.05] pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around h-16 relative px-2">
        {leftTabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.name} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-1 relative h-full">
              {active && (
                <motion.div
                  layoutId="bottom-tab-active"
                  className="absolute top-1 w-12 h-1 rounded-full bg-primary"
                />
              )}
              <tab.icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{tab.name}</span>
            </Link>
          );
        })}

        {/* Bouton Central (Répartir) */}
        <div className="flex-1 flex justify-center -mt-8 relative z-10">
          <button 
            onClick={() => openModal()}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,110,255,0.4)] text-white hover:scale-105 active:scale-95 transition-transform"
          >
            <Zap className="w-7 h-7 fill-white/20" />
          </button>
        </div>

        {rightTabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.name} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-1 relative h-full">
              {active && (
                <motion.div
                  layoutId="bottom-tab-active"
                  className="absolute top-1 w-12 h-1 rounded-full bg-primary"
                />
              )}
              <tab.icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
