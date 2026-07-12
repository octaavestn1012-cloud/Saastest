"use client";

import { useState, useEffect } from "react";
import { Amount } from "@/components/shared/Amount";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TransactionDetailModal, TransactionHistory } from "@/components/features/historique/TransactionDetailModal";
import { formatDateToBenin } from "@/lib/utils/format";

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
    isCommission: ligne.est_commission,
    commission_associee: Number(ligne.commission_associee || 0),
    commission_statut: ligne.commission_statut
  })) || [];

  const details = allDetails.filter((d: any) => !d.isCommission);

  let finalRuleName = "Répartition";
  let triggerType: "Automatique" | "Manuelle" = "Manuelle";

  if (exec.regles) {
    if (exec.regles.nom) {
      finalRuleName = exec.regles.nom;
    } else {
      finalRuleName = exec.regles.declencheur === "manuel" ? "Répartition manuelle" : "Répartition automatique";
    }
    triggerType = exec.regles.declencheur === "manuel" ? "Manuelle" : "Automatique";
  } else {
    finalRuleName = exec.regle_id ? "Répartition (Ancienne)" : "Répartition manuelle";
    triggerType = "Manuelle";
  }

  return {
    id: exec.id,
    date: exec.date_execution,
    ruleName: finalRuleName,
    triggerType,
    totalAvailable: Number(exec.montant_total),
    commissionAmount: details.reduce((acc: number, d: any) => acc + (d.status === "SUCCESS" || d.status === "PENDING" ? d.commission_associee || 0 : 0), 0),
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
  
  useEffect(() => {
    setLocalExecutions(executions);
  }, [executions]);
  
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
      {localExecutions.slice(0, 5).map((exec: any) => {
        const hist = formatExecutionToHistory(exec);
        const showTrigger = hist.ruleName !== "Répartition manuelle" && hist.ruleName !== "Répartition automatique" && hist.ruleName !== "Répartition (Ancienne)";
        
        return (
          <div 
            key={exec.id} 
            onClick={() => handleSelect(exec)} 
            className="flex justify-between items-center p-3 hover:bg-black/[0.02] rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{hist.ruleName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {showTrigger ? `${hist.triggerType} • ` : ""}{formatDateToBenin(hist.date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 pl-3">
              <div className="font-bold tabular-nums text-primary">
                <Amount value={exec.montant_total} variant="out" />
              </div>
              <StatusBadge status={exec.statut} />
            </div>
          </div>
        );
      })}

      <TransactionDetailModal 
        selectedTx={selectedTxHistory} 
        onClose={() => setSelectedTxId(null)}
        commissionRateStr={commissionRateStr}
        onTransactionUpdate={handleUpdate}
      />
    </>
  );
}
