"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

export function ClientNextExecution() {
  const [activeRule, setActiveRule] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedRules = localStorage.getItem("reparto_rules");
    if (savedRules) {
      const rules = JSON.parse(savedRules);
      const active = rules.find((r: any) => r.active);
      if (active) {
        setActiveRule(active);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col text-lg animate-pulse">
        <span className="h-6 bg-black/5 w-24 rounded"></span>
        <span className="h-4 bg-black/5 w-32 rounded mt-2"></span>
      </div>
    );
  }

  if (activeRule) {
    return (
      <div className="flex flex-col">
        <span>{activeRule.trigger}</span>
        <span className="text-sm font-medium text-muted-foreground mt-1">{activeRule.name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-lg">
      <span className="text-muted-foreground font-medium">Aucune programmée</span>
      <Link href="/rules/new" className="text-sm text-primary hover:underline mt-1">
        Créer une règle →
      </Link>
    </div>
  );
}
