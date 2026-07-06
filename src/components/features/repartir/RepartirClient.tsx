"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/shared/Amount";
import { ArrowRight, CheckCircle2, Loader2, AlertCircle, User } from "lucide-react";
import { executeRepartitionAction } from "@/app/actions/repartir";
import Link from "next/link";

export function RepartirClient({ balance, rule }: { balance: number, rule: any }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{ status: string; id?: string } | null>(null);

  if (!rule) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 text-center pt-12">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-accent-decorative/10 text-accent-decorative">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold">Aucune règle manuelle</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Vous n'avez aucune règle active configurée pour un déclenchement "Manuel". Allez dans la section Règles pour en créer une.
        </p>
        <div className="pt-8">
          <Link href="/rules">
            <Button variant="outline" className="rounded-2xl">Gérer les règles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await executeRepartitionAction(balance);
      setResult({ status: res.status });
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erreur lors de la répartition");
    } finally {
      setIsExecuting(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 text-center pt-12">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${result.status === 'completed' ? 'bg-money-in/10 text-money-in' : 'bg-accent-decorative/10 text-accent-decorative'}`}>
          {result.status === 'completed' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
        </div>
        <h2 className="text-3xl font-bold">
          {result.status === 'completed' ? 'Répartition réussie !' : 'Répartition partielle/échouée'}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          {result.status === 'completed' 
            ? "Les virements ont été envoyés avec succès à tous vos destinataires."
            : "Certains virements ont échoué ou le solde était insuffisant. Veuillez vérifier l'historique pour plus de détails."}
        </p>
        <div className="pt-8 flex justify-center gap-4">
          <Link href="/historique">
            <Button className="rounded-2xl bg-black text-white hover:bg-black/80">Voir l'historique</Button>
          </Link>
          <Button variant="outline" className="rounded-2xl" onClick={() => setResult(null)}>Nouvelle répartition</Button>
        </div>
      </div>
    );
  }

  // Calculs de l'aperçu
  const commissionRate = 0.019; // 1.9%
  const commissionAmount = balance * commissionRate;
  const availableAfterCommission = balance - commissionAmount;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Répartir maintenant</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Répartissez votre solde disponible selon votre règle : <span className="font-bold text-black">{rule.nom}</span>
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-card shadow-sm border-0 text-center">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Solde disponible FedaPay</h3>
        <div className="text-5xl font-bold tabular-nums mb-8 text-foreground">
          <Amount value={balance} />
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 text-left space-y-4 max-w-lg mx-auto">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Aperçu de l'exécution</h4>
          
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Frais Réparto (1.9%)</span>
            <Amount value={commissionAmount} variant="commission" showSign />
          </div>
          
          <div className="pt-4 mt-4 border-t border-muted/50 space-y-4">
            {rule.distributions?.map((dist: any) => {
              let amountToSend = rule.mode === "pourcentage" 
                ? (availableAfterCommission * dist.valeur) / 100 
                : dist.valeur;
              
              return (
                <div key={dist.id} className="flex justify-between items-center p-3 -mx-3 rounded-2xl hover:bg-black/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-black leading-tight">{dist.libelle}</div>
                      <div className="text-[13px] font-semibold text-black/50 mt-0.5">
                        {dist.destinataires?.methode_mobile_money || "Inconnu"} • <span className="font-mono">{dist.destinataires?.numero || "Aucun"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Amount value={amountToSend} variant="out" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 max-w-lg mx-auto">
          <Button 
            className="w-full h-14 text-lg rounded-2xl bg-money-out hover:bg-money-out/90 text-white"
            onClick={handleExecute}
            disabled={isExecuting || balance < 100}
          >
            {isExecuting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : balance < 100 ? (
              "Solde insuffisant (Min 100 FCFA)"
            ) : (
              <>
                Confirmer et répartir
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-money-in" />
            Cette action ordonnera à FedaPay d'effectuer les virements immédiatement.
          </p>
        </div>
      </div>
    </div>
  );
}
