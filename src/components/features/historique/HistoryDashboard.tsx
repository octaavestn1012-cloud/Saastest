"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock, X, Download, RotateCcw, History, Loader2 } from "lucide-react";
import { Amount } from "@/components/shared/Amount";
import { retryPayoutLigne } from "@/app/actions/historique";
import { TransactionDetailModal, TransactionDetail, TransactionHistory, Status } from "./TransactionDetailModal";
import { formatDateToBenin } from "@/lib/utils/format";

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
  return formatDateToBenin(isoString);
};

export function HistoryDashboard({ initialData, plan = "gratuit", initialTxId }: { initialData: any[], plan?: string, initialTxId?: string }) {
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTx, setSelectedTx] = useState<TransactionHistory | null>(null);
  const [historyData, setHistoryData] = useState<TransactionHistory[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");

  const commissionRateStr = plan === "pro" ? "0,8" : plan === "business" ? "0,4" : "1,9";

  useEffect(() => {
    // Transform DB data to TransactionHistory format
    const formattedData = initialData.map((exec: any) => {
      const allDetails = exec.execution_lignes?.map((ligne: any) => ({
        id: ligne.id,
        name: ligne.destinataire_libelle,
        network: ligne.est_commission ? "Frais" : (ligne.destinataire_reseau || "Mobile Money"),
        phone: ligne.est_commission ? "Réparto" : (ligne.destinataire_numero || "Masqué"),
        amount: Number(ligne.montant),
        status: ligne.statut === "reussi" ? "SUCCESS" : ligne.statut === "en_cours" ? "PENDING" : "FAILED",
        errorReason: ligne.erreur_message,
        isCommission: ligne.est_commission,
        commission_associee: Number(ligne.commission_associee || 0),
        commission_statut: ligne.commission_statut,
        reference: ligne.reference_transaction
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

      const validDetails = details.filter((d: any) => d.status === "SUCCESS" || d.status === "PENDING");
      const dynCommissionAmount = validDetails.reduce((acc: number, d: any) => acc + (d.commission_associee || 0), 0);
      const dynTotalAmount = validDetails.reduce((acc: number, d: any) => acc + d.amount, 0);
      const dynTotalAvailable = dynTotalAmount + dynCommissionAmount;

      return {
        id: exec.id,
        date: exec.date_execution,
        ruleName: finalRuleName,
        triggerType,
        totalAvailable: dynTotalAvailable,
        commissionAmount: dynCommissionAmount,
        totalAmount: dynTotalAmount,
        recipientCount: details.length,
        status: (exec.statut === "reussi" ? "SUCCESS" : exec.statut === "partiel" ? "PARTIAL" : exec.statut === "en_cours" ? "PENDING" : "FAILED") as any,
        details
      };
    });
    setHistoryData(formattedData);
    
    if (initialTxId) {
      const tx = formattedData.find((t: any) => t.id === initialTxId);
      if (tx) {
        setSelectedTx(tx);
      }
    }
  }, [initialData, initialTxId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod, filterStatus, customStartDate, customEndDate, searchQuery]);

  const filteredData = historyData.filter(tx => {
    if (filterStatus !== "all" && tx.status !== filterStatus.toUpperCase()) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRuleName = tx.ruleName.toLowerCase().includes(q);
      const matchDetails = tx.details.some(d => 
        (d.name && d.name.toLowerCase().includes(q)) || 
        (d.phone && d.phone.toLowerCase().includes(q))
      );
      if (!matchRuleName && !matchDetails) return false;
    }
    
    const txDate = new Date(tx.date);
    const now = new Date();
    
    if (filterPeriod === "today") {
      if (txDate.toDateString() !== now.toDateString()) return false;
    } else if (filterPeriod === "30d") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      if (txDate < thirtyDaysAgo) return false;
    } else if (filterPeriod === "this_month") {
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
    } else if (filterPeriod === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* FILTERS & SEARCH */}
      <div className="flex flex-col xl:flex-row gap-4 bg-white p-2 rounded-2xl border border-black/[0.05] shadow-sm items-center xl:justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto overflow-x-auto">
         <select 
           value={filterPeriod} 
           onChange={(e) => setFilterPeriod(e.target.value)}
           className="bg-[#F5F5F7] px-4 py-3 rounded-xl font-medium outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto text-sm shrink-0"
         >
           <option value="all">Toutes les dates</option>
           <option value="today">Aujourd'hui</option>
           <option value="30d">30 derniers jours</option>
           <option value="this_month">Ce mois</option>
           <option value="custom">Personnalisé</option>
         </select>

         {filterPeriod === "custom" && (
           <div className="flex items-center gap-2 shrink-0">
             <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-[#F5F5F7] px-3 py-2.5 rounded-xl font-medium outline-none text-sm border-none" />
             <span className="text-muted-foreground">-</span>
             <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-[#F5F5F7] px-3 py-2.5 rounded-xl font-medium outline-none text-sm border-none" />
           </div>
         )}
         
         <div className="w-px h-8 bg-black/5 hidden sm:block shrink-0"></div>

         <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
           <button onClick={() => setFilterStatus("all")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "all" ? "bg-black text-white" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Tous</button>
           <button onClick={() => setFilterStatus("success")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "success" ? "bg-money-in/10 text-money-in" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Réussi</button>
           <button onClick={() => setFilterStatus("pending")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "pending" ? "bg-blue-100 text-blue-700" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>En cours</button>
           <button onClick={() => setFilterStatus("partial")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "partial" ? "bg-[#FFF8E7] text-[#B9811C]" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Partiel</button>
           <button onClick={() => setFilterStatus("failed")} className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterStatus === "failed" ? "bg-danger/10 text-danger" : "bg-[#F5F5F7] text-muted-foreground hover:text-black"}`}>Échoué</button>
         </div>
        </div>

        {/* SEARCH BAR */}
        <div className="w-full xl:w-auto flex-1 max-w-sm px-2 pb-2 xl:p-0">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Rechercher une règle, un nom ou un numéro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F7] pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
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
          {paginatedData.map(tx => (
            <div 
              key={tx.id} 
              onClick={() => setSelectedTx(tx)}
              className="group bg-white p-5 sm:p-6 rounded-[2rem] border border-black/[0.05] shadow-sm hover:border-black/10 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-1.5 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-black">{tx.ruleName}</span>
                   <span className="w-1 h-1 rounded-full bg-black/20"></span>
                   <span className="text-[13px] font-medium text-muted-foreground">
                     {tx.ruleName !== "Répartition manuelle" && tx.ruleName !== "Répartition automatique" && tx.ruleName !== "Répartition (Ancienne)" ? `${tx.triggerType} • ` : ""}
                     {formatDate(tx.date)}
                   </span>
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
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 px-2">
              <span className="text-sm text-muted-foreground font-medium">
                Page {currentPage} sur {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl bg-white border border-black/10 text-sm font-bold hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-black/10 text-sm font-bold hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <TransactionDetailModal 
        selectedTx={selectedTx} 
        onClose={() => setSelectedTx(null)}
        commissionRateStr={commissionRateStr}
        onTransactionUpdate={(updatedTx) => {
          setHistoryData(prev => prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx));
          if (selectedTx?.id === updatedTx.id) {
            setSelectedTx(updatedTx);
          }
        }}
      />

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
  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5" />
        En cours
      </div>
    );
  }
  
  const failedCount = details.filter(d => d.status === "FAILED").length;
  const successCount = details.filter(d => d.status === "SUCCESS").length;
  
  return (
    <div className="flex items-center gap-1.5 bg-[#FFF8E7] text-[#B9811C] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
      <AlertCircle className="w-3.5 h-3.5" />
      {failedCount > 0 ? `${successCount}/${details.length} réussis` : "Partiel"}
    </div>
  );
}
