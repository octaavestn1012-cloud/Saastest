"use client";

import { RuleBuilder } from "@/components/features/rules/RuleBuilder";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewRulePage() {
  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/rules">
          <Button variant="outline" className="w-12 h-12 rounded-2xl p-0 hover:bg-black/5 border-black/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nouvelle règle</h2>
          <p className="text-muted-foreground text-sm mt-1">Configurez l'automatisation de votre répartition.</p>
        </div>
      </div>

      <RuleBuilder />
    </div>
  );
}
