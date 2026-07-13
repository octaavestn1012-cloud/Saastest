"use client";

import { useEffect, useState } from "react";
import { getCommissionSettings, updateCommissionSettings, getCommissionHistory, toggleUserBlock, retryCommission } from "@/app/actions/commissions";
import { Loader2, ArrowLeft, Save, ShieldAlert, ShieldCheck, XCircle, CheckCircle2, Clock, RefreshCw, Search, Filter, CalendarDays } from "lucide-react";
import { COUNTRIES_NETWORKS, COUNTRY_CODES } from "@/components/features/destinataires/RecipientModal";
import Link from "next/link";
import { formatDateToBenin } from "@/lib/utils/format";

export default function AdminCommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [numbers, setNumbers] = useState<any[]>([
    { phone: "", network: "", country: "" },
    { phone: "", network: "", country: "" },
    { phone: "", network: "", country: "" }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const fetchHistory = async () => {
    let start, end;
    if (dateFilter === "7") {
      const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString();
    } else if (dateFilter === "30") {
      const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString();
    } else if (dateFilter === "today") {
      const d = new Date(); d.setHours(0,0,0,0); start = d.toISOString();
    } else if (dateFilter === "custom") {
      if (customStartDate) start = new Date(customStartDate).toISOString();
      if (customEndDate) {
        const d = new Date(customEndDate); d.setHours(23,59,59,999); end = d.toISOString();
      }
    }
    const historyRes = await getCommissionHistory(start, end);
    if (historyRes.success) setHistory(historyRes.history || []);
  };

  useEffect(() => {
    async function loadInitial() {
      const settingsRes = await getCommissionSettings();
      if (settingsRes.success && settingsRes.numbers) {
        const loaded = [...settingsRes.numbers].map((num: any) => {
          const prefix = COUNTRY_CODES[num.country] || "";
          let displayPhone = num.phone || "";
          if (displayPhone.startsWith(prefix)) {
            displayPhone = displayPhone.substring(prefix.length).trim();
          } else if (displayPhone.startsWith("+")) {
            // Unlikely, but just in case it starts with some other prefix
            const matchedPrefix = Object.values(COUNTRY_CODES).find(p => displayPhone.startsWith(p));
            if (matchedPrefix) displayPhone = displayPhone.substring(matchedPrefix.length).trim();
          }
          return { ...num, phone: displayPhone };
        });
        while (loaded.length < 3) loaded.push({ phone: "", network: "MTN BJ", country: "Bénin" });
        setNumbers(loaded.slice(0, 3));
      }
      setLoading(false);
    }
    loadInitial();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [dateFilter, customStartDate, customEndDate]);

  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.user_name || "").toLowerCase().includes(q) || (item.user_email || "").toLowerCase().includes(q);
  });

  const handleSaveNumbers = async () => {
    setSaving(true);
    const numbersToSave = numbers.map(num => {
      const prefix = COUNTRY_CODES[num.country] || "";
      let finalPhone = num.phone ? num.phone.trim().replace(/\s/g, '') : "";
      if (finalPhone && !finalPhone.startsWith("+")) {
        finalPhone = prefix + finalPhone;
      }
      return { ...num, phone: finalPhone };
    });
    
    const res = await updateCommissionSettings(numbersToSave);
    setSaving(false);
    if (res.success) {
      alert("Paramètres enregistrés avec succès !");
    } else {
      alert("Erreur lors de la sauvegarde : " + res.error);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const confirmMsg = currentStatus 
      ? "Voulez-vous vraiment débloquer cet utilisateur ?" 
      : "Voulez-vous vraiment bloquer cet utilisateur ? Toutes ses futures répartitions seront rejetées.";
      
    if (!confirm(confirmMsg)) return;

    const res = await toggleUserBlock(userId, currentStatus);
    if (res.success) {
      // Update local state
      setHistory(prev => prev.map(item => 
        item.user_id === userId ? { ...item, is_blocked: res.newStatus } : item
      ));
    } else {
      alert("Erreur lors du blocage : " + res.error);
    }
  };

  const handleRetry = async (ligneId: string) => {
    if (!confirm("Voulez-vous vraiment relancer l'envoi de cette commission ?")) return;
    
    setRetryingId(ligneId);
    const res = await retryCommission(ligneId);
    
    if (res.success) {
      alert("Relance effectuée avec succès ! Le statut a été mis à jour.");
      // Refresh history
      fetchHistory();
    } else {
      alert("Erreur lors de la relance : " + res.error);
    }
    setRetryingId(null);
  };

  const [retryingAll, setRetryingAll] = useState(false);

  const handleRetryAll = async () => {
    const failedItems = filteredHistory.filter(item => item.status === "echoue");
    if (failedItems.length === 0) return;
    
    if (!confirm(`Voulez-vous vraiment relancer ${failedItems.length} commissions échouées d'un coup ?`)) return;

    setRetryingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of failedItems) {
      setRetryingId(item.id);
      const res = await retryCommission(item.id);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setRetryingId(null);
    setRetryingAll(false);
    
    alert(`Relance groupée terminée !\nSuccès : ${successCount}\nÉchecs : ${failCount}`);
    fetchHistory();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Commissions</h1>
          <p className="text-muted-foreground font-medium">Gérez vos revenus et la sécurité des comptes.</p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Paramètres des numéros */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold">Numéros de réception</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez vos numéros de commission. Si l'envoi échoue sur le N°1, le système tentera le N°2.
              </p>
            </div>
            <button 
              onClick={handleSaveNumbers}
              disabled={saving}
              className="bg-black hover:bg-black/80 text-white rounded-xl px-6 py-2.5 font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {numbers.map((num, idx) => {
              const countryNetworks = COUNTRIES_NETWORKS[num.country] || [];
              const prefix = COUNTRY_CODES[num.country] || "";

              return (
                <div key={idx} className="relative p-5 rounded-2xl border border-black/5 bg-[#FDFDFD] flex flex-col gap-4">
                  <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                    {idx + 1}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Pays</label>
                      <select 
                        className="w-full bg-[#F5F5F7] px-3 py-2.5 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        value={num.country}
                        onChange={(e) => {
                          const c = e.target.value;
                          const newNums = [...numbers];
                          newNums[idx].country = c;
                          newNums[idx].network = COUNTRIES_NETWORKS[c]?.[0] || "";
                          setNumbers(newNums);
                        }}
                      >
                        {Object.keys(COUNTRIES_NETWORKS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Réseau</label>
                      <select 
                        className="w-full bg-[#F5F5F7] px-3 py-2.5 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        value={num.network}
                        onChange={(e) => {
                          const newNums = [...numbers];
                          newNums[idx].network = e.target.value;
                          setNumbers(newNums);
                        }}
                      >
                        {countryNetworks.map((n: string) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Numéro</label>
                    <div className="relative flex items-center bg-[#F5F5F7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <div className="pl-4 pr-2 py-2.5 text-sm font-bold text-black border-r border-black/5">
                        {prefix}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Saisissez le numéro" 
                        className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold outline-none"
                        value={num.phone}
                        onChange={(e) => {
                          const newNums = [...numbers];
                          newNums[idx].phone = e.target.value.replace(/[^0-9\s]/g, '');
                          setNumbers(newNums);
                        }}
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Historique et Blocage */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-black/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-lg font-bold">Historique des rentrées</h2>
            
            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Chercher nom/email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-4 py-2.5 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="today">Aujourd'hui</option>
                    <option value="7">7 derniers jours</option>
                    <option value="30">30 derniers jours</option>
                    <option value="all">Toutes les dates</option>
                    <option value="custom">Personnaliser</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-3 p-4 bg-[#F5F5F7] rounded-xl mb-6">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Date de début</label>
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-white px-3 py-2 rounded-lg text-[13px] font-medium outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Date de fin</label>
                <input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-white px-3 py-2 rounded-lg text-[13px] font-medium outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
          )}
          
          {filteredHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Aucune commission trouvée pour cette sélection.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-black/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/5 text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 font-bold whitespace-nowrap">Transaction</th>
                    <th className="p-4 font-bold whitespace-nowrap">Client</th>
                    <th className="p-4 font-bold whitespace-nowrap text-right">Montant</th>
                    <th className="p-4 font-bold whitespace-nowrap text-center">Sécurité</th>
                    <th className="p-4 font-bold whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span>Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-sm">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-black/[0.02] transition-colors">
                      
                      {/* Transaction */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2 mb-1.5">
                          {item.status === "reussi" ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-money-in bg-money-in/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Réussi</span>
                          ) : item.status === "en_cours" ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3"/> En cours</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full" title="Sera prélevé automatiquement au prochain versement"><XCircle className="w-3 h-3"/> Échoué (Reporté)</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateToBenin(item.date)}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5" title={item.reference}>Réf: {item.reference ? (item.reference.length > 20 ? item.reference.substring(0, 20) + "..." : item.reference) : "N/A"}</p>
                        <p className="text-[11px] font-medium text-black/60 mt-1">Vers : {item.dest_numero} ({item.dest_reseau})</p>
                        {item.error && (
                          <p className="text-[11px] text-danger mt-1.5 max-w-[200px] line-clamp-2" title={item.error}>{item.error}</p>
                        )}
                      </td>

                      {/* Client */}
                      <td className="p-4 align-middle">
                        <p className="text-[13px] font-bold text-black">{item.user_name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.user_email}</p>
                      </td>

                      {/* Montant & Passerelle */}
                      <td className="p-4 align-middle text-right">
                        <p className="font-bold text-black tabular-nums whitespace-nowrap">{item.amount} F</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">via {item.passerelle}</p>
                      </td>

                      {/* Sécurité */}
                      <td className="p-4 align-middle text-center">
                        <button
                          onClick={() => handleToggleBlock(item.user_id, item.is_blocked)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            item.is_blocked 
                              ? "bg-black text-white hover:bg-black/80" 
                              : "bg-danger/10 text-danger hover:bg-danger/20"
                          }`}
                        >
                          {item.is_blocked ? (
                            <><ShieldCheck className="w-3.5 h-3.5" /> Débloquer</>
                          ) : (
                            <><ShieldAlert className="w-3.5 h-3.5" /> Bloquer</>
                          )}
                        </button>
                      </td>

                      <td className="p-4 align-middle text-right">
                        {/* Les commissions sont relancées automatiquement par le balayeur */}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
