"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/shared/Amount";
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { executeRepartitionAction } from "@/app/actions/repartir";
import Link from "next/link";

export default function RepartirPage() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{ status: string; id: string } | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await executeRepartitionAction(150000);
      setResult({ status: res.status, id: res.executionId });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la répartition");
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
          {result.status === 'completed' ? 'Répartition réussie !' : 'Répartition partielle'}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          {result.status === 'completed' 
            ? "Les virements ont été envoyés avec succès à tous vos destinataires."
            : "Certains virements ont échoué. Veuillez vérifier l'historique pour plus de détails."}
        </p>
        <div className="pt-8">
          <Link href="/historique">
            <Button variant="outline" className="rounded-2xl">Voir l&apos;historique</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Répartir maintenant</h2>
        <p className="text-muted-foreground mt-1 text-sm">Répartissez votre solde disponible selon vos règles actives.</p>
      </div>

      <div className="p-8 rounded-3xl bg-card shadow-sm border-0 text-center">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Montant total à répartir</h3>
        <div className="text-5xl font-bold tabular-nums mb-8 text-foreground">
          <Amount value={150000} />
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 text-left space-y-4 max-w-lg mx-auto">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Aperçu de l&apos;exécution</h4>
          
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Commission Réparto (1%)</span>
            <Amount value={1500} variant="commission" showSign />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Propriétaire (Moov)</span>
            <Amount value={60000} />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Épargne (MTN)</span>
            <Amount value={13275} />
          </div>
          <div className="pt-4 mt-4 border-t border-muted/50 flex justify-between items-center font-bold">
            <span>Reste (Compte Principal)</span>
            <Amount value={75225} variant="out" />
          </div>
        </div>

        <div className="mt-10 max-w-lg mx-auto">
          <Button 
            className="w-full h-14 text-lg rounded-2xl bg-money-out hover:bg-money-out/90 text-white"
            onClick={handleExecute}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Confirmer et envoyer
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-money-in" />
            Cette action est irréversible et déclenchera les paiements.
          </p>
        </div>
      </div>
    </div>
  );
}
