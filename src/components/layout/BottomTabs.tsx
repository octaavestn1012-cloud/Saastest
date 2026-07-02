"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, SlidersHorizontal, History, Menu, Zap, Users, PieChart, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRepartition } from "@/context/RepartitionContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
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
          if (tab.href === "/menu") {
            return (
              <button 
                key={tab.name} 
                onClick={() => setIsMenuOpen(true)} 
                className="flex-1 flex flex-col items-center justify-center gap-1 relative h-full"
              >
                <tab.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">{tab.name}</span>
              </button>
            );
          }

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

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px] z-[100] bg-white pt-12">
          <SheetHeader>
            <SheetTitle className="text-2xl font-black text-left mb-6">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {[
              { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
              { name: "Règles", href: "/rules", icon: SlidersHorizontal },
              { name: "Destinataires", href: "/destinataires", icon: Users },
              { name: "Historique", href: "/historique", icon: History },
              { name: "Rapports", href: "/rapports", icon: PieChart },
              { name: "Connexions", href: "/connections", icon: Link2 },
            ].map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-semibold transition-colors ${
                  (item.href === "/dashboard" && pathname === "/dashboard") || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-black/5 hover:text-black"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
