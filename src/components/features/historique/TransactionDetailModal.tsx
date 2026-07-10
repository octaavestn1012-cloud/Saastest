"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, AlertCircle, Clock, Loader2, Download, RotateCcw } from "lucide-react";
import { Amount } from "@/components/shared/Amount";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { retryPayoutLigne } from "@/app/actions/historique";

// Note: These types could be moved to a shared types file
import { formatDateToBenin } from "@/lib/utils/format";
import { useScrollLock } from "@/hooks/useScrollLock";

export type Status = "SUCCESS" | "PARTIAL" | "FAILED" | "PENDING";

export type TransactionDetail = {
  id: string;
  name: string;
  network: string;
  phone: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  errorReason?: string;
  reference?: string;
};

export type TransactionHistory = {
  id: string;
  date: string;
  ruleName: string;
  triggerType: "Automatique" | "Manuelle";
  totalAmount: number;
  totalAvailable: number;
  commissionAmount: number;
  recipientCount: number;
  status: Status;
  details: TransactionDetail[];
};

export function TransactionDetailModal({ 
  selectedTx, 
  onClose,
  commissionRateStr,
  onTransactionUpdate
}: { 
  selectedTx: TransactionHistory | null;
  onClose: () => void;
  commissionRateStr: string;
  onTransactionUpdate?: (updatedTx: TransactionHistory) => void;
}) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useScrollLock(!!selectedTx);

  const formatDate = (isoString: string) => {
    return formatDateToBenin(isoString);
  };

  const handleRetry = async (ligneId: string) => {
    if (!selectedTx) return;
    setRetryingId(ligneId);
    try {
      const res = await retryPayoutLigne(ligneId);
      if (res.success) {
        const newStatus = res.ligneStatut === "reussi" ? "SUCCESS" : res.ligneStatut === "en_cours" ? "PENDING" : "FAILED";
        
        const updatedDetails = selectedTx.details.map(d => 
          d.id === ligneId 
            ? { ...d, status: newStatus as any, errorReason: newStatus === "FAILED" ? "Échec lors de la relance" : undefined } 
            : d
        );
        const hasFailed = updatedDetails.some(d => d.status === "FAILED");
        const hasSuccess = updatedDetails.some(d => d.status === "SUCCESS" || d.status === "PENDING");
        const finalStatus = !hasSuccess ? "FAILED" : hasFailed ? "PARTIAL" : updatedDetails.every(d => d.status === "SUCCESS") ? "SUCCESS" : "PENDING";
        
        const updatedTx = { ...selectedTx, status: finalStatus as any, details: updatedDetails };
        if (onTransactionUpdate) {
          onTransactionUpdate(updatedTx);
        }
      } else {
        alert("Erreur lors de la relance: " + res.error);
      }
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setRetryingId(null);
    }
  };

  const generatePDF = () => {
    if (!selectedTx) return;
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text("Reçu de Répartition", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Règle : ${selectedTx.ruleName}`, 14, 30);
      doc.text(`Date : ${formatDate(selectedTx.date)}`, 14, 36);
      doc.text(`Statut global : ${selectedTx.status === "SUCCESS" ? "Réussi" : selectedTx.status === "PARTIAL" ? "Partiel" : selectedTx.status === "PENDING" ? "En cours" : "Échoué"}`, 14, 42);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total prélevé : ${selectedTx.totalAvailable} FCFA`, 14, 55);
      doc.text(`Frais Réparto : ${selectedTx.commissionAmount} FCFA`, 14, 62);
      doc.setFont("helvetica", "bold");
      doc.text(`Total réparti : ${selectedTx.totalAmount} FCFA`, 14, 69);
      
      const tableColumn = ["Destinataire", "Numéro", "Montant (FCFA)", "Statut", "Référence"];
      const tableRows: string[][] = [];
      
      selectedTx.details.forEach(d => {
        const rowData = [
          d.name,
          d.phone,
          d.amount.toString(),
          d.status === "SUCCESS" ? "Réussi" : d.status === "PENDING" ? "En cours" : "Échoué",
          d.reference || "-"
        ];
        tableRows.push(rowData);
      });
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: "grid",
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        styles: { font: "helvetica", fontSize: 10 }
      });
      
      doc.save(`reparto_recu_${selectedTx.id.substring(0, 8)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedTx && (
        <>
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative w-full h-[92dvh] md:h-auto md:max-h-[85vh] md:w-[600px] bg-[#FDFDFD] md:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden mt-auto md:mt-0"
            >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-black/5 bg-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                  Règle : {selectedTx.ruleName} 
                  {selectedTx.ruleName !== "Répartition manuelle" && selectedTx.ruleName !== "Répartition automatique" && selectedTx.ruleName !== "Répartition (Ancienne)" ? ` • ${selectedTx.triggerType}` : ""}
                </p>
                <h2 className="text-xl font-black">{formatDate(selectedTx.date)}</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5E7] flex items-center justify-center transition-colors text-muted-foreground hover:text-black shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              
              {selectedTx.status === "PARTIAL" && (
                <div className="bg-[#FFF8E7]/50 border border-[#FDE1A9]/30 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#B9811C] shrink-0 mt-0.5" />
                  <div>
                     <h4 className="font-bold text-[#A87211] text-[15px]">Répartition incomplète</h4>
                     <p className="text-[13px] font-medium text-[#B9811C]/90 mt-1 leading-relaxed">
                       {selectedTx.details.filter(d => d.status === "FAILED").length} envoi(s) sur {selectedTx.recipientCount} {selectedTx.details.filter(d => d.status === "FAILED").length > 1 ? 'ont' : 'a'} échoué. Vous pouvez réessayer les envois échoués ci-dessous.
                     </p>
                  </div>
                </div>
              )}
              {selectedTx.status === "FAILED" && (
                <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  <div>
                     <h4 className="font-bold text-danger text-[15px]">Répartition échouée</h4>
                     <p className="text-[13px] font-medium text-danger/80 mt-1 leading-relaxed">
                       Aucun envoi n'a pu aboutir. Vérifiez les motifs ci-dessous.
                     </p>
                  </div>
                </div>
              )}

              {/* Recap */}
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-black/5 space-y-3">
                 <div className="flex justify-between items-center text-muted-foreground">
                    <span className="font-semibold text-[13px]">Total prélevé</span>
                    <span className="font-bold tabular-nums text-[14px]">
                      <Amount value={selectedTx.totalAvailable} />
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-[#B9811C]">
                    <span className="font-semibold text-[14px]">
                      Frais Réparto ({commissionRateStr}%)
                    </span>
                    <span className="font-bold tabular-nums text-[15px]">
                      − <Amount value={selectedTx.commissionAmount} />
                    </span>
                 </div>
                 <div className="flex justify-between items-center pt-3 border-t border-[#FDE1A9]/30">
                    <span className="font-black text-[15px] text-black">À répartir</span>
                    <span className="font-black text-[16px] text-primary tabular-nums">
                      <Amount value={selectedTx.totalAmount} />
                    </span>
                 </div>
              </div>

              {/* Destinataires */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg px-1 text-black">Détails des envois</h3>
                <div className="space-y-3">
                   {selectedTx.details.map(detail => (
                     <div key={detail.id} className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                             <span className="font-bold text-black text-[15px]">{detail.name}</span>
                             <p className="text-[13px] font-medium text-muted-foreground mt-0.5">{detail.network} • {detail.phone}</p>
                           </div>
                           <div className="text-right">
                             <span className="font-black text-[16px] tabular-nums text-black"><Amount value={detail.amount} /></span>
                           </div>
                        </div>
                        
                        {detail.status === "SUCCESS" ? (
                          <div className="flex items-center justify-between bg-money-in/5 rounded-xl px-3 py-2 mt-3">
                             <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-money-in" />
                                <span className="text-xs font-bold text-money-in">Réussi</span>
                             </div>
                             <span className="text-xs font-mono font-bold text-money-in/60 tracking-wider">{detail.reference}</span>
                          </div>
                        ) : detail.status === "PENDING" ? (
                          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2 mt-3">
                             <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold text-blue-600">En cours de traitement</span>
                             </div>
                             <span className="text-xs font-mono font-bold text-blue-600/60 tracking-wider">{detail.reference || "Attente"}</span>
                          </div>
                        ) : (
                          <div className="bg-danger/5 rounded-xl p-3 mt-3 space-y-3">
                             <div className="flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-danger" />
                                <span className="text-xs font-bold text-danger">Échoué</span>
                             </div>
                             <p className="text-[13px] font-medium text-danger/80">{detail.errorReason}</p>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleRetry(detail.id);
                               }}
                               disabled={retryingId === detail.id}
                               className="flex items-center justify-center gap-2 w-full bg-white border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors py-2.5 rounded-[12px] font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               {retryingId === detail.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Relance en cours...
                                  </>
                               ) : (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Réessayer cet envoi
                                  </>
                               )}
                             </button>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 bg-white border-t border-black/5 shrink-0">
              <button 
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="w-full h-14 bg-black hover:bg-black/80 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Télécharger le reçu complet
              </button>
            </div>
          </motion.div>
        </div>
        </>
      )}
    </AnimatePresence>
  );
}
