"use client";

import { useState } from "react";
import { Amount } from "@/components/shared/Amount";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TransactionDetailModal, TransactionHistory } from "@/components/features/historique/TransactionDetailModal";

// Helper to format DB execution into TransactionHistory
const formatExecutionToHistory = (exec: any): TransactionHistory => {
  const allDetails = exec.execution_lignes?.map((ligne: any) => ({
    id: ligne.id,
    name: ligne.destinataire_libelle,
    network: ligne.est_commission ? "Frais" : (ligne.destinataire_reseau || "Mobile Money"),
    phone: ligne.est_commission ? "Réparto" : (ligne.destinataire_numero || "Masqué"),
    amount: Number(ligne.montant),
    status: ligne.statut === "reussi" ? "SUCCESS" : ligne.statut === "en_cours" ? "PENDING" : "FAILED",
    errorReason: ligne.erreur_message,
    reference: ligne.reference_transaction,
    isCommission: ligne.est_commission
  })) || [];

  const commissionLigne = allDetails.find((d: any) => d.isCommission);
  const details = allDetails.filter((d: any) => !d.isCommission);

  return {
    id: exec.id,
    date: exec.date_execution,
    ruleName: exec.regles ? (exec.regles.nom || "Règle automatique") : (exec.regle_id ? "Règle supprimée" : "Répartition manuelle"),
    totalAvailable: Number(exec.montant_total),
    commissionAmount: commissionLigne ? commissionLigne.amount : 0,
    totalAmount: details.reduce((acc: number, d: any) => acc + d.amount, 0),
    recipientCount: details.length,
    status: (exec.statut === "reussi" ? "SUCCESS" : exec.statut === "partiel" ? "PARTIAL" : exec.statut === "en_cours" ? "PENDING" : "FAILED") as any,
    details
  };
};

export function RecentExecutionsList({ 
  executions, 
  plan 
}: { 
  executions: any[],
  plan: string 
}) {
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  
  // We keep a local state of executions in case of a retry update
  const [localExecutions, setLocalExecutions] = useState(executions);
  
  const commissionRateStr = plan === "pro" ? "0,8" : plan === "business" ? "0,4" : "1,9";

  const handleSelect = (exec: any) => {
    setSelectedTxId(exec.id);
  };

  const selectedExecution = localExecutions.find(e => e.id === selectedTxId);
  const selectedTxHistory = selectedExecution ? formatExecutionToHistory(selectedExecution) : null;

  const handleUpdate = (updatedTx: TransactionHistory) => {
    // Map TransactionHistory back to the local DB-like execution format
    // Because formatExecutionToHistory takes a DB object, we must update the DB object itself
    // Actually, it's easier to just re-fetch, or update the DB object manually.
    // For simplicity, we just update the specific fields we care about
    const newExecutions = localExecutions.map(exec => {
      if (exec.id === updatedTx.id) {
        const newStatusMap: Record<string, string> = {
          SUCCESS: "reussi",
          PARTIAL: "partiel",
          FAILED: "echoue",
          PENDING: "en_cours"
        };
        return {
          ...exec,
          statut: newStatusMap[updatedTx.status] || exec.statut,
          // We don't perfectly map execution_lignes back, but it's okay because the next time we click, 
          // it would be nice to have the updated lignes. Let's just update them.
          execution_lignes: exec.execution_lignes?.map((ligne: any) => {
            const updatedDetail = updatedTx.details.find(d => d.id === ligne.id);
            if (updatedDetail) {
              return {
                ...ligne,
                statut: updatedDetail.status === "SUCCESS" ? "reussi" : updatedDetail.status === "PENDING" ? "en_cours" : "echoue",
                erreur_message: updatedDetail.errorReason
              };
            }
            return ligne;
          })
        };
      }
      return exec;
    });
    setLocalExecutions(newExecutions);
  };

  if (localExecutions.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-6">Aucune répartition enregistrée pour l'instant.</p>;
  }

  return (
    <>
      {localExecutions.slice(0, 5).map((exec: any) => (
        <div 
          key={exec.id} 
          onClick={() => handleSelect(exec)} 
          className="flex justify-between items-center p-3 hover:bg-black/[0.02] rounded-xl transition-colors cursor-pointer block"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">{exec.regles ? (exec.regles.nom || "Règle automatique") : (exec.regle_id ? "Règle supprimée" : "Répartition manuelle")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(exec.date_execution).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="font-bold tabular-nums text-primary">
              <Amount value={exec.montant_total} variant="out" />
            </div>
            <StatusBadge status={exec.statut} />
          </div>
        </div>
      ))}

      <TransactionDetailModal 
        selectedTx={selectedTxHistory} 
        onClose={() => setSelectedTxId(null)}
        commissionRateStr={commissionRateStr}
        onTransactionUpdate={handleUpdate}
      />
    </>
  );
}
