"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronRight, CheckCircle2, XCircle, AlertCircle, X, Download, RotateCcw, History } from "lucide-react";
import { Amount } from "@/components/shared/Amount";

type Status = "SUCCESS" | "PARTIAL" | "FAILED";

type TransactionDetail = {
  id: string;
  name: string;
  network: string;
  phone: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  errorReason?: string;
  reference?: string;
};

type TransactionHistory = {
  id: string;
  date: string;
  ruleName: string;
  totalAmount: number;
  totalAvailable: number;
  commissionAmount: number;
  recipientCount: number;
  status: Status;
  details: TransactionDetail[];
};

const MOCK_DATA: TransactionHistory[] = [
  {
    id: "tx_1001",
    date: "2026-06-30T08:00:00Z",
    ruleName: "Règle Mensuelle 50/40/10",
    totalAvailable: 150000,
    commissionAmount: 1200,
    totalAmount: 148800,
    recipientCount: 3,
    status: "SUCCESS",
    details: [
      { id: "d_1", name: "Épargne", network: "MTN BJ", phone: "01 23 45 67", amount: 74400, status: "SUCCESS", reference: "REF-8902A" },
      { id: "d_2", name: "Dépenses", network: "Moov BJ", phone: "66 55 44 33", amount: 59520, status: "SUCCESS", reference: "REF-8902B" },
      { id: "d_3", name: "Loisirs", network: "MTN BJ", phone: "90 80 70 60", amount: 14880, status: "SUCCESS", reference: "REF-8902C" },
    ]
  },
  {
    id: "tx_1002",
    date: "2026-06-25T14:30:00Z",
    ruleName: "Rapide",
    totalAvailable: 50000,
    commissionAmount: 400,
    totalAmount: 49600,
    recipientCount: 2,
    status: "PARTIAL",
    details: [
      { id: "d_4", name: "Maman", network: "MTN BJ", phone: "01 02 03 04", amount: 25000, status: "SUCCESS", reference: "REF-7711A" },
      { id: "d_5", name: "Frère", network: "Moov BJ", phone: "00 00 00 00", amount: 24600, status: "FAILED", errorReason: "Numéro invalide ou inactif" },
    ]
  },
  {
    id: "tx_1003",
    date: "2026-06-10T09:15:00Z",
    ruleName: "Cagnotte Vacances",
    totalAvailable: 20000,
    commissionAmount: 160,
    totalAmount: 19840,
    recipientCount: 1,
    status: "FAILED",
    details: [
      { id: "d_6", name: "Agence", network: "Celtiis BJ", phone: "40 50 60 70", amount: 19840, status: "FAILED", errorReason: "Passerelle opérateur indisponible" },
    ]
  }
];

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  const day = d.getDate();
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} à ${hours}:${minutes}`;
};

export function HistoryDashboard({ initialData }: { initialData: any[] }) {
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTx, setSelectedTx] = useState<TransactionHistory | null>(null);
  const [historyData, setHistoryData] = useState<TransactionHistory[]>([]);

  useEffect(() => {
    // Transform DB data to TransactionHistory format
    const formattedData = initialData.map((exec: any) => {
      const allDetails = exec.execution_lignes?.map((ligne: any) => ({
        id: ligne.id,
        name: ligne.destinataire_libelle,
        network: ligne.est_commission ? "Frais" : "Mobile Money",
        phone: ligne.est_commission ? "Réparto" : "Masqué",
        amount: Number(ligne.montant),
        status: ligne.statut === "reussi" ? "SUCCESS" : "FAILED",
        isCommission: ligne.est_commission
      })) || [];

      const commissionLigne = allDetails.find((d: any) => d.isCommission);
      const details = allDetails.filter((d: any) => !d.isCommission);

      return {
        id: exec.id,
        date: exec.date_execution,
        ruleName: exec.regles?.nom || "Règle supprimée",
        totalAvailable: Number(exec.montant_total),
        commissionAmount: commissionLigne ? commissionLigne.amount : 0,
        totalAmount: details.reduce((acc: number, d: any) => acc + d.amount, 0),
        recipientCount: details.length,
        status: (exec.statut === "reussi" ? "SUCCESS" : exec.statut === "partiel" ? "PARTIAL" : "FAILED") as any,
        details
      };
    });
    setHistoryData(formattedData);
  }, [initialData]);

  const filteredData = historyData.filter(tx => {
    if (filterStatus !== "all" && tx.status !== filterStatus.toUpperCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-2xl border border-black/[0.05] shadow-sm items-center overflow-x-auto">
         <select 
           value={filterPeriod} 
           onChange={(e) => setFilterPeriod(e.target.value)}
           className="bg-[#F5F5F7] px-4 py-3 rounded-xl font-medium outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto text-sm shrink-0"
         >
           <option value="all">Toutes les dates</option>
           <option value="30d">30 derniers jours</option>
           <option value="this_month">Ce mois</option>
         </select>
         
         <div className="w-px h-8 bg-black/5 hidden sm:block shrink-0"></div>

         <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
           <button onClick={() => setFilterStatus("all")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "all" ? "bg-black text-white" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Tous</button>
           <button onClick={() => setFilterStatus("success")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "success" ? "bg-money-in/10 text-money-in" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Réussi</button>
           <button onClick={() => setFilterStatus("partial")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "partial" ? "bg-[#FFF8E7] text-[#B9811C]" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Partiel</button>
           <button onClick={() => setFilterStatus("failed")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "failed" ? "bg-danger/10 text-danger" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Échoué</button>
         </div>
      </div>

      {/* LIST */}
      {filteredData.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-[2rem] p-12 text-center shadow-sm">
           <History className="w-12 h-12 text-black/10 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-black mb-2">Aucune répartition</h3>
           <p className="text-muted-foreground text-sm font-medium">Tes répartitions apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredData.map(tx => (
            <div 
              key={tx.id} 
              onClick={() => setSelectedTx(tx)}
              className="group bg-white p-5 sm:p-6 rounded-[2rem] border border-black/[0.05] shadow-sm hover:border-black/10 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-1.5 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-black">{tx.ruleName}</span>
                   <span className="w-1 h-1 rounded-full bg-black/20"></span>
                   <span className="text-[13px] font-medium text-muted-foreground">{formatDate(tx.date)}</span>
                 </div>
                 <div className="text-2xl font-black tabular-nums tracking-tight">
                    <Amount value={tx.totalAmount} />
                 </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                 <div className="text-sm font-medium text-muted-foreground">
                   {tx.recipientCount} destinataire{tx.recipientCount > 1 ? 's' : ''}
                 </div>
                 <StatusBadge status={tx.status} details={tx.details} />
                 <ChevronRight className="w-5 h-5 text-black/20 group-hover:text-black transition-colors hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTx(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="relative w-full md:w-[600px] h-[90vh] md:h-[85vh] bg-[#FDFDFD] md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
              >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-black/5 bg-white flex justify-between items-center shrink-0">
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Règle : {selectedTx.ruleName}</p>
                  <h2 className="text-xl font-black">{formatDate(selectedTx.date)}</h2>
                </div>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="w-10 h-10 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5E7] flex items-center justify-center transition-colors text-muted-foreground hover:text-black shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
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
                      <span className="font-semibold text-[13px]">Solde déduit</span>
                      <span className="font-bold tabular-nums text-[14px]">
                        <Amount value={selectedTx.totalAvailable} />
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-[#B9811C]">
                      <span className="font-semibold text-[14px]">Frais Réparto (0,8%)</span>
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
                          ) : (
                            <div className="bg-danger/5 rounded-xl p-3 mt-3 space-y-3">
                               <div className="flex items-center gap-1.5">
                                  <XCircle className="w-4 h-4 text-danger" />
                                  <span className="text-xs font-bold text-danger">Échoué</span>
                               </div>
                               <p className="text-[13px] font-medium text-danger/80">{detail.errorReason}</p>
                               <button className="flex items-center justify-center gap-2 w-full bg-white border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors py-2.5 rounded-[12px] font-bold text-[13px]">
                                 <RotateCcw className="w-3.5 h-3.5" />
                                 Réessayer cet envoi
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
                <button className="w-full h-14 bg-black hover:bg-black/80 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-5 h-5" />
                  Télécharger le reçu complet
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

function StatusBadge({ status, details }: { status: Status, details: TransactionDetail[] }) {
  if (status === "SUCCESS") {
    return (
      <div className="flex items-center gap-1.5 bg-money-in/10 text-money-in px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Réussi
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-1.5 bg-danger/10 text-danger px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
        <XCircle className="w-3.5 h-3.5" />
        Échoué
      </div>
    );
  }
  
  const failedCount = details.filter(d => d.status === "FAILED").length;
  
  return (
    <div className="flex items-center gap-1.5 bg-[#FFF8E7] text-[#B9811C] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
      <AlertCircle className="w-3.5 h-3.5" />
      {failedCount > 0 ? `${details.length - failedCount}/${details.length} réussis` : "Partiel"}
    </div>
  );
}
