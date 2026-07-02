"use client";

import { RuleForm } from "@/components/features/RuleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditRulePage({ params }: { params: { id: string } }) {
  // Dans un vrai projet, on ferait fetchRule(params.id) pour pré-remplir
  
  return (
    <div className="space-y-8 pb-20 sm:pb-8">
      <div>
        <Link href="/rules">
          <Button variant="ghost" className="mb-4 text-muted-foreground -ml-4 hover:bg-muted/50 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux règles
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Modifier la règle</h2>
        <p className="text-muted-foreground text-sm mt-1">Ajustez les pourcentages ou ajoutez de nouvelles cibles.</p>
      </div>

      {/* On passe des valeurs initiales fictives pour l'instant */}
      <RuleForm 
        initialValues={{
          name: "Règle existante modifiée",
          triggerType: "manual",
          triggerSource: "kkiapay_1",
          targets: [
            { label: "Principal", mode: "percentage", value: 60, momoMethod: "mtn_bj", momoPhone: "00000000", isRemainder: false },
            { label: "Taxes", mode: "percentage", value: 0, momoMethod: "moov_bj", momoPhone: "11111111", isRemainder: true },
          ]
        }}
        onSubmit={(data) => console.log(data)} 
      />
    </div>
  );
}
