"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Loader2, Edit2, RotateCcw, Plus, Trash2, Zap, SlidersHorizontal, BookOpen, Info, ChevronDown, User } from "lucide-react";
import { Amount } from "@/components/shared/Amount";
import { useUser } from "@/context/UserContext";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import { PreviewRule } from "@/context/RepartitionContext";
import { ProgressBar } from "@/components/ui/progress-bar";
import Link from "next/link";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { getRegles } from "@/app/actions/regles";
import { getDestinataires } from "@/app/actions/destinataires";
import { saveRegle } from "@/app/actions/regles";
import { executeRepartitionAction, executeQuickRepartitionAction, updateExecutionRuleId } from "@/app/actions/repartir";

type Step = "PREVIEW" | "EXECUTING" | "RESULT";
type ModalMode = "rule" | "quick";

export function RepartitionModal({ onClose, customData }: { onClose: () => void, customData?: PreviewRule }) {
  const [step, setStep] = useState<Step>("PREVIEW");
  const [results, setResults] = useState<Record<string, "PENDING" | "SUCCESS" | "FAILED">>({});
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [rules, setRules] = useState<any[]>([]);
  const [savedDestinataires, setSavedDestinataires] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustedTargets, setAdjustedTargets] = useState<any[]>([]);

  // Par défaut sur 'quick' car c'est le flux principal
  const [modalMode, setModalMode] = useState<ModalMode>("quick");
  const [quickMode, setQuickMode] = useState<"percentage" | "fixed">("percentage");
  const [quickTargets, setQuickTargets] = useState<any[]>([
    { id: "1", destinataireId: "", name: "", value: 50, network: "MTN", phone: "", isManual: false },
    { id: "2", destinataireId: "", name: "", value: 50, network: "Moov", phone: "", isManual: false }
  ]);
  
  const [saveRuleName, setSaveRuleName] = useState("");
  const [saveRuleTrigger, setSaveRuleTrigger] = useState("manual");
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);
  const { plan } = useUser();

  const COMMISSION_RATE = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;
  const COMMISSION_TEXT = plan === "pro" ? "0,8%" : plan === "business" ? "0,4%" : "1,9%";
  const RESTANT_TEXT = plan === "pro" ? "99,2%" : plan === "business" ? "99,6%" : "98,1%";

  useEffect(() => {
    // Bloquer le scroll du body quand le modal est ouvert
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    // Fermer le dropdown au clic à l'extérieur
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const { data: metrics } = await getDashboardMetrics();
        if (metrics) {
          setTotalAvailable(metrics.balance || 0);
        }

        const { data: dests } = await getDestinataires();
        if (dests) {
          setSavedDestinataires(dests);
        }

        if (!customData) {
          const { data: rulesData } = await getRegles();
          if (rulesData) {
            // Transformer les règles pour correspondre au format attendu par la modale
            const formattedRules = rulesData.filter((r:any) => r.actif).map((r: any) => ({
              id: r.id,
              name: r.nom,
              active: r.actif,
              mode: r.mode,
              recipients: r.distributions?.map((d: any) => ({
                id: d.id,
                name: d.libelle,
                value: d.valeur,
                network: d.destinataires?.methode_mobile_money || "Mobile Money",
                phone: d.destinataires?.numero || ""
              })) || []
            }));
            setRules(formattedRules);
            
            if (formattedRules.length > 0) {
              setSelectedRuleId(formattedRules[0].id);
            }
          }
        } else {
          setModalMode("rule");
        }
      } catch (e) {
        console.error("Erreur lors du chargement des données", e);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    fetchData();
  }, [customData]);

  const activeRuleSource = useMemo(() => {
    if (customData) return null;
    return rules.find(r => r.id === selectedRuleId) || null;
  }, [selectedRuleId, rules, customData]);

  const generatedPreviewData = useMemo(() => {
    if (customData) return customData;
    if (!activeRuleSource) return null;

    const commissionAmount = totalAvailable * COMMISSION_RATE;
    const toDistribute = totalAvailable - commissionAmount;
    const mode = (activeRuleSource.mode === "pourcentage" || activeRuleSource.mode === "percentage") ? "percentage" : "fixed";
    
    return {
      name: activeRuleSource.name,
      totalAvailable: totalAvailable,
      commission: commissionAmount,
      toDistribute: toDistribute,
      targets: (activeRuleSource.recipients || []).map((r: any, index: number) => {
        const amount = mode === "percentage" ? (toDistribute * (Number(r.value) || 0)) / 100 : (Number(r.value) || 0);
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: mode === "percentage" ? Number(r.value) : undefined
        };
      })
    };
  }, [activeRuleSource, customData, totalAvailable, COMMISSION_RATE]);

  const currentPreviewData = customData || generatedPreviewData;

  useEffect(() => {
    if (currentPreviewData && modalMode === "rule") {
      setAdjustedTargets(currentPreviewData.targets);
      setIsAdjusting(false);
    }
  }, [currentPreviewData, modalMode]);

  const quickPreviewData = useMemo(() => {
    const commissionAmount = totalAvailable * COMMISSION_RATE;
    const toDistribute = totalAvailable - commissionAmount;
    return {
      name: "Répartition rapide",
      totalAvailable: totalAvailable,
      commission: commissionAmount,
      toDistribute: toDistribute,
      targets: quickTargets.map((r: any, index: number) => {
        const amount = quickMode === "percentage" ? (toDistribute * (Number(r.value) || 0)) / 100 : (Number(r.value) || 0);
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: quickMode === "percentage" ? Number(r.value) : undefined
        };
      })
    };
  }, [quickTargets, quickMode]);

  const activeData = modalMode === "rule" ? currentPreviewData : quickPreviewData;
  const currentTargets = modalMode === "rule" 
    ? (isAdjusting ? adjustedTargets : (currentPreviewData?.targets || []))
    : (quickPreviewData?.targets || []);

  const isPercentageMode = modalMode === "rule" 
    ? currentTargets.some((t: any) => t.percent !== undefined)
    : quickMode === "percentage";

  const toDistribute = totalAvailable - (totalAvailable * COMMISSION_RATE);
  const totalDistributedTargets = currentTargets.reduce((acc: number, t: any) => acc + (isPercentageMode ? (toDistribute * (Number(t.percent) || 0)) / 100 : Number(t.amount) || 0), 0);
  const totalDistributed = totalDistributedTargets + ((activeData as any)?.commission || 0);
  
  const totalPercent = isPercentageMode ? currentTargets.reduce((acc: number, t: any) => acc + (Number(t.percent) || 0), 0) : 0;
  const isExact = isPercentageMode ? totalPercent === 100 : totalDistributedTargets <= toDistribute;

  const formatAmount = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  const handleConfirm = async () => {
    if (!isExact) return;
    setStep("EXECUTING");
    
    const initialResults: Record<string, "PENDING" | "SUCCESS" | "FAILED"> = {};
    currentTargets.forEach((t: any) => initialResults[t.id] = "PENDING");
    setResults(initialResults);

    try {
      // Exécuter via le vrai moteur FedaPay !
      let res;
      if (modalMode === "quick" || (modalMode === "rule" && isAdjusting)) {
        // Mode rapide ou règle ajustée à la volée : on envoie les targets calculés manuellement
        res = await executeQuickRepartitionAction(totalAvailable, currentTargets, isPercentageMode ? "percentage" : "fixed");
      } else {
        // Mode règle stricte : on utilise le Rule ID de la BDD pour qu'il le re-calcule de façon sécurisée
        res = await executeRepartitionAction(totalAvailable, activeRuleSource?.id);
      }
      if (res.executionId) {
        setCurrentExecutionId(res.executionId);
      }

      const finalStatus = res.status === 'completed' ? "SUCCESS" : "FAILED";
      
      // Mettre à jour l'UI avec le statut
      const finalResultsToSave: Record<string, "SUCCESS" | "FAILED"> = {};
      currentTargets.forEach((t: any) => {
        finalResultsToSave[t.id] = finalStatus;
      });
      setResults(finalResultsToSave);
      setStep("RESULT");

    } catch (e: any) {
      console.error(e);
      const finalResultsToSave: Record<string, "SUCCESS" | "FAILED"> = {};
      currentTargets.forEach((t: any) => finalResultsToSave[t.id] = "FAILED");
      setResults(finalResultsToSave);
      setStep("RESULT");
    }
  };

  const updateAdjustedTarget = (id: string, value: string) => {
    const toDistribute = totalAvailable - (totalAvailable * COMMISSION_RATE);
    setAdjustedTargets(adjustedTargets.map((t: any) => {
      if (t.id === id) {
        if (isPercentageMode) {
          return { ...t, percent: Number(value), amount: (toDistribute * Number(value)) / 100 };
        } else {
          return { ...t, amount: Number(value) };
        }
      }
      return t;
    }));
  };

  const addQuickTarget = () => {
    setQuickTargets([...quickTargets, { id: Math.random().toString(), destinataireId: "", name: "", value: 0, network: "MTN", phone: "", isManual: false }]);
  };
  const updateQuickTarget = (id: string, field: string, value: string) => {
    setQuickTargets(quickTargets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  
  const handleNameChange = (id: string, newName: string) => {
    const existing = savedDestinataires.find(d => d.nom === newName);
    setQuickTargets(quickTargets.map(t => {
      if (t.id === id) {
        if (existing) {
          return { ...t, name: newName, network: existing.methode_mobile_money, phone: existing.numero };
        }
        return { ...t, name: newName };
      }
      return t;
    }));
  };

  const removeQuickTarget = (id: string) => {
    setQuickTargets(quickTargets.filter(t => t.id !== id));
  };

  const saveQuickAsRule = async () => {
    if (!saveRuleName.trim() || isSavingRule) return;
    setIsSavingRule(true);

    let parsedDeclencheur = "manuel";
    let config = null;
    if (saveRuleTrigger === "entry") parsedDeclencheur = "a_chaque_entree";
    if (saveRuleTrigger === "daily") { parsedDeclencheur = "quotidien"; config = "08:00"; }
    if (saveRuleTrigger === "weekly") { parsedDeclencheur = "hebdomadaire"; config = "1"; }
    if (saveRuleTrigger === "monthly") { parsedDeclencheur = "mensuel"; config = "1"; }

    const payload = {
      id: "temp_" + Date.now(),
      nom: saveRuleName,
      actif: false,
      declencheur: parsedDeclencheur,
      declencheur_config: config,
      mode: quickMode === "percentage" ? "pourcentage" : "montant_fixe",
      recipients: quickTargets
    };

    const res = await saveRegle(payload);
    if (res.success && res.id) {
      if (currentExecutionId) {
        await updateExecutionRuleId(currentExecutionId, res.id);
      }
      setRuleSaved(true);
    } else {
      console.error("Erreur lors de la sauvegarde", res.error);
      alert("Erreur: " + res.error);
    }
    setIsSavingRule(false);
  };

  if (isLoadingData) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white p-8 rounded-3xl flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="font-bold text-muted-foreground">Chargement des données...</p>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  if (!activeData && rules.length === 0 && modalMode === "rule") {
    setModalMode("quick");
    return null;
  }

  if (!activeData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative w-full h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[34rem] bg-[#FAFAFA] sm:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white z-20 shrink-0 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {step === "PREVIEW" ? "Répartition" : step === "EXECUTING" ? "Envoi en cours..." : "Résultat"}
            </h2>
            {step !== "EXECUTING" && (
              <button onClick={onClose} className="p-2.5 bg-black/[0.03] hover:bg-black/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tabs - Only show if PREVIEW, no customData, and user has rules */}
          {step === "PREVIEW" && !customData && rules.length > 0 && (
            <div className="flex bg-white px-4 pb-4 border-b border-black/[0.05] z-10 shrink-0 gap-2">
              <button 
                onClick={() => setModalMode("quick")}
                className={`flex-1 py-3 px-4 text-[15px] font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 ${modalMode === "quick" ? "bg-black text-white shadow-lg shadow-black/10" : "bg-black/[0.03] text-muted-foreground hover:bg-black/5 hover:text-black"}`}
              >
                <Zap className="w-4 h-4" /> Rapide
              </button>
              <button 
                onClick={() => setModalMode("rule")}
                className={`flex-1 py-3 px-4 text-[15px] font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 ${modalMode === "rule" ? "bg-black text-white shadow-lg shadow-black/10" : "bg-black/[0.03] text-muted-foreground hover:bg-black/5 hover:text-black"}`}
              >
                <BookOpen className="w-4 h-4" /> Mes Règles
              </button>
            </div>
          )}

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            <div className="flex flex-col items-center justify-center pt-5 pb-5 bg-white rounded-[2rem] shadow-sm border border-black/[0.03]">
              <span className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{modalMode === "quick" ? "Solde disponible" : activeData.name}</span>
              <div className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-black to-black/70 mb-2">
                <Amount value={activeData.totalAvailable} />
              </div>
              
              <button 
                onClick={() => setShowCommissionDetails(!showCommissionDetails)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.02] hover:bg-black/[0.04] transition-colors text-muted-foreground text-[14px] font-medium"
              >
                <span>À répartir : <strong className="text-black"><Amount value={(activeData as any).toDistribute || 0} /></strong></span>
                <span className="mx-1 opacity-50">·</span>
                <span>frais {COMMISSION_TEXT}</span>
                <Info className="w-3.5 h-3.5 ml-0.5 text-black/40" />
              </button>

              <AnimatePresence>
                {showCommissionDetails && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="w-full px-5 overflow-hidden"
                  >
                    <div className="bg-[#FFF8E7]/50 border border-[#FDE1A9]/30 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-semibold text-[13px]">Solde disponible</span>
                        <span className="font-bold tabular-nums text-[14px]">
                          <Amount value={activeData.totalAvailable} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[#B9811C]">
                        <span className="font-semibold text-[14px]">Frais Réparto ({COMMISSION_TEXT})</span>
                        <span className="font-bold tabular-nums text-[15px]">
                          − <Amount value={(activeData as any).commission || 0} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-[#FDE1A9]/30">
                        <span className="font-black text-[15px] text-black">À répartir</span>
                        <span className="font-black tabular-nums text-[16px] text-black">
                          <Amount value={(activeData as any).toDistribute || 0} />
                        </span>
                      </div>
                      <p className="text-left text-[12px] font-medium text-muted-foreground pt-1 leading-relaxed">
                        Réparto prélève {COMMISSION_TEXT}. Tu répartis les {RESTANT_TEXT} restants comme tu veux.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rule Selector (Mode Rule) */}
            {modalMode === "rule" && step === "PREVIEW" && !customData && (
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-black/[0.03]">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-1">Choisir la règle</label>
                <div className="relative">
                  <select
                    value={selectedRuleId}
                    onChange={(e) => setSelectedRuleId(e.target.value)}
                    className="w-full bg-[#F5F5F7] hover:bg-[#EAEAEB] transition-colors border-transparent rounded-[1.25rem] px-5 py-4 font-bold text-[16px] outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                  >
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Builder (Mode Quick) */}
            {modalMode === "quick" && step === "PREVIEW" && (
              <div className="space-y-4">
                {/* Custom Segmented Control */}
                <div className="relative flex bg-black/[0.03] p-1.5 rounded-[1.25rem]">
                  <div 
                    className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[1rem] shadow-sm transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)"
                    style={{ transform: quickMode === "percentage" ? "translateX(0)" : "translateX(100%)" }}
                  />
                  <button 
                    onClick={() => setQuickMode("percentage")}
                    className={`relative flex-1 py-3 text-[15px] font-bold transition-colors z-10 ${quickMode === "percentage" ? "text-black" : "text-muted-foreground hover:text-black"}`}
                  >
                    Pourcentage (%)
                  </button>
                  <button 
                    onClick={() => setQuickMode("fixed")}
                    className={`relative flex-1 py-3 text-[15px] font-bold transition-colors z-10 ${quickMode === "fixed" ? "text-black" : "text-muted-foreground hover:text-black"}`}
                  >
                    Montant Fixe
                  </button>
                </div>

                {isPercentageMode && (
                  <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-black/[0.03]">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <span className={`text-2xl font-black tracking-tight ${isExact ? 'text-primary' : 'text-black'}`}>{totalPercent}%</span>
                        <span className="text-muted-foreground font-semibold text-[15px] ml-1">attribués</span>
                      </div>
                      <div className={`font-bold text-sm bg-black/[0.03] px-3 py-1.5 rounded-lg ${totalPercent > 100 ? 'text-danger bg-danger/10' : 'text-muted-foreground'}`}>
                        {totalPercent > 100 ? `Dépassement ${totalPercent - 100}%` : `Reste ${100 - totalPercent}%`}
                      </div>
                    </div>
                    <ProgressBar value={totalPercent} colorClass={totalPercent === 100 ? "bg-primary" : totalPercent > 100 ? "bg-danger" : "bg-black"} className="h-4 rounded-full" />
                  </div>
                )}

                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-black/[0.03]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-1">Déclencheur (en cas de sauvegarde)</label>
                  <div className="relative">
                    <select
                      value={saveRuleTrigger}
                      onChange={(e) => setSaveRuleTrigger(e.target.value)}
                      className="w-full bg-[#F5F5F7] hover:bg-[#EAEAEB] transition-colors border-transparent rounded-[1.25rem] px-5 py-4 font-bold text-[15px] outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="manual">Manuel (Je lance moi-même)</option>
                      <option value="entry">Automatique : À chaque entrée d'argent</option>
                      <option value="daily">Automatique : Quotidien</option>
                      <option value="weekly">Automatique : Hebdomadaire</option>
                      <option value="monthly">Automatique : Mensuel</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <AnimatePresence>
                    {quickTargets.map((target, idx) => (
                      <motion.div key={target.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-5 rounded-[1.5rem] border-2 border-[#F5F5F7] relative group hover:border-black/10 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[17px] font-extrabold text-black">Destinataire {idx + 1}</span>
                          <button onClick={() => removeQuickTarget(target.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F5F5F7] hover:bg-danger/10 text-black hover:text-danger transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {!target.isManual ? (
                          <div className="flex items-center justify-between gap-4">
                            {/* Custom Dropdown UI */}
                            <div className="relative flex-1 custom-dropdown-container">
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === target.id ? null : target.id)}
                                className="w-full flex items-center gap-3 p-2 -ml-2 rounded-2xl hover:bg-black/5 transition-colors text-left"
                              >
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[16px] text-black">
                                      {target.name || <span className="inline-block text-left leading-tight">Choisir un<br/>contact</span>}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-black transition-transform ${openDropdownId === target.id ? 'rotate-180' : ''}`} />
                                  </div>
                                  {target.destinataireId && (
                                    <div className="text-[13px] font-bold text-black/60 mt-0.5 flex items-center gap-2">
                                      <span className="uppercase">{target.network}</span>
                                      <span className="font-mono tracking-wide text-black">{target.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </button>

                              <AnimatePresence>
                                {openDropdownId === target.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-black/5 z-50 overflow-hidden py-2"
                                  >
                                    <div className="px-4 py-2 text-[10px] font-black text-black/30 uppercase tracking-widest">
                                      Vos destinataires enregistrés
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                        {savedDestinataires.length === 0 && (
                                          <div className="px-4 py-3 text-sm text-black/50 italic font-medium">Aucun contact enregistré.</div>
                                        )}
                                        {savedDestinataires.map((d: any) => (
                                          <button 
                                            key={d.id}
                                            onClick={() => {
                                              setQuickTargets(targets => targets.map(t => t.id === target.id ? { ...t, destinataireId: d.id, name: d.libelle, network: d.methode_mobile_money, phone: d.numero, isManual: false } : t));
                                              setOpenDropdownId(null);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-left"
                                          >
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                              <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                              <div className="font-bold text-[14px] text-black leading-tight">{d.libelle}</div>
                                              <div className="text-[12px] font-semibold text-black/50 mt-0.5">{d.methode_mobile_money} • <span className="font-mono">{d.numero}</span></div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      
                                      <div className="h-px bg-black/5 my-2" />
                                      
                                      <button 
                                        onClick={() => {
                                          setQuickTargets(targets => targets.map(t => t.id === target.id ? { ...t, isManual: true, name: "", phone: "", destinataireId: "" } : t));
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-left"
                                      >
                                        <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0">
                                          <Plus className="w-4 h-4 text-black" />
                                        </div>
                                        <span className="font-bold text-[14px] text-black">Saisir un nouveau numéro</span>
                                      </button>
                                    </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="relative w-[140px] shrink-0 bg-[#F5F5F7] rounded-xl flex items-center pr-4 border-2 border-transparent focus-within:border-black/10 transition-all">
                              <input type="number" value={target.value || ''} onChange={(e) => updateQuickTarget(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-3 px-2 text-[16px] text-black placeholder:text-black/30" />
                              <span className="text-black font-black text-[15px]">{isPercentageMode ? "%" : "F"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-[#F5F5F7] rounded-xl flex items-center px-4 py-3 border-2 border-transparent focus-within:border-black/10 transition-all">
                                <input type="text" value={target.name} onChange={(e) => updateQuickTarget(target.id, "name", e.target.value)} placeholder="Nom (ex: Loyer)" className="w-full bg-transparent font-bold outline-none placeholder:text-black/40 text-black text-[15px]" />
                              </div>
                              <div className="relative w-[140px] shrink-0 bg-[#F5F5F7] rounded-xl flex items-center pr-4 border-2 border-transparent focus-within:border-black/10 transition-all">
                                <input type="number" value={target.value || ''} onChange={(e) => updateQuickTarget(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-3 px-2 text-[16px] text-black placeholder:text-black/30" />
                                <span className="text-black font-black text-[15px]">{isPercentageMode ? "%" : "F"}</span>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1 bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all relative">
                                <select value={target.network} onChange={(e) => updateQuickTarget(target.id, "network", e.target.value)} className="w-full h-full bg-transparent rounded-xl px-4 py-3 outline-none font-bold appearance-none text-black relative z-10 cursor-pointer text-[15px]">
                                  <option value="MTN">MTN BJ</option>
                                  <option value="Moov">Moov BJ</option>
                                  <option value="Celtiis">Celtiis BJ</option>
                                  <option value="Wave">Wave CI</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-black absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                              <div className="flex-[2] bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all">
                                <input type="tel" value={target.phone} onChange={(e) => updateQuickTarget(target.id, "phone", e.target.value)} placeholder="00 00 00 00" className="w-full h-full bg-transparent px-4 py-3 outline-none font-mono font-bold tracking-wide text-black placeholder:text-black/40 text-[15px]" />
                              </div>
                              <button onClick={() => setQuickTargets(targets => targets.map(t => t.id === target.id ? { ...t, isManual: false } : t))} className="px-4 py-3 bg-black text-white hover:bg-black/80 rounded-xl font-bold text-[14px] transition-colors">
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button onClick={addQuickTarget} className="w-full bg-white border-dashed border-2 border-black/5 hover:border-black/20 rounded-[1.5rem] h-14 font-bold text-[15px] text-muted-foreground hover:text-black flex items-center justify-center transition-all hover:bg-black/[0.01]">
                    <Plus className="w-5 h-5 mr-2" /> Ajouter un destinataire
                  </button>
                </div>
              </div>
            )}

            {/* Targets List (Mode Rule OR Previewing Quick) */}
            {(modalMode === "rule" || step !== "PREVIEW") && (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Destinataires</h3>
                  {step === "PREVIEW" && modalMode === "rule" && !isAdjusting && (
                    <button onClick={() => setIsAdjusting(true)} className="text-primary text-[13px] font-bold flex items-center gap-1.5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Ajuster cette fois
                    </button>
                  )}
                  {step === "PREVIEW" && modalMode === "rule" && isAdjusting && (
                    <button onClick={() => { setIsAdjusting(false); setAdjustedTargets(currentPreviewData?.targets || []); }} className="text-muted-foreground hover:text-black text-[13px] font-bold flex items-center gap-1.5 hover:bg-black/5 px-3 py-1.5 rounded-full transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-black/[0.03] space-y-1">
                  {currentTargets.map((target: any) => (
                    <div key={target.id} className="flex justify-between items-center p-4 hover:bg-[#F9F9FA] rounded-2xl transition-colors">
                      <div className="flex flex-col flex-1">
                        <span className="font-bold text-[16px]">{target.label}</span>
                        <span className="text-[13px] text-muted-foreground font-medium mt-0.5">{target.method} • {target.number || "Sans numéro"}</span>
                      </div>
                      
                      {step === "PREVIEW" && (!isAdjusting || modalMode === "quick") && (
                        <div className="flex flex-col items-end text-right">
                          <div className="font-bold tabular-nums text-primary text-[17px]">
                            {target.percent !== undefined ? `${target.percent}%` : <Amount value={target.amount} />}
                          </div>
                          {target.percent !== undefined && (
                            <span className="text-xs text-muted-foreground font-bold bg-black/5 px-2 py-0.5 rounded-md mt-1"><Amount value={target.amount} /></span>
                          )}
                        </div>
                      )}

                      {step === "PREVIEW" && isAdjusting && modalMode === "rule" && (
                        <div className="relative w-24">
                          <input 
                            type="number" 
                            value={isPercentageMode ? target.percent : target.amount}
                            onChange={(e) => updateAdjustedTarget(target.id, e.target.value)}
                            className="w-full bg-[#F5F5F7] focus:bg-[#EEEEF0] border-transparent rounded-xl pl-4 pr-8 py-3 outline-none focus:ring-2 focus:ring-primary text-[15px] font-bold font-mono text-right transition-colors"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                            {isPercentageMode ? "%" : "F"}
                          </span>
                        </div>
                      )}
                      
                      {(step === "EXECUTING" || step === "RESULT") && (
                        <div className="flex items-center gap-2">
                          {results[target.id] === "PENDING" && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                          {results[target.id] === "SUCCESS" && <CheckCircle2 className="w-7 h-7 text-money-in" />}
                          {results[target.id] === "FAILED" && <XCircle className="w-7 h-7 text-danger" />}
                        </div>
                      )}
                    </div>
                  ))}

                  {step === "RESULT" && results["3"] === "FAILED" && (
                    <div className="mx-4 mb-3 p-4 bg-danger/5 border border-danger/10 text-danger rounded-2xl text-[14px]">
                      <strong>Échec de l'envoi.</strong> Le numéro de téléphone semble invalide ou injoignable.
                      <button className="block mt-2 font-bold hover:underline">Réessayer uniquement cette ligne</button>
                    </div>
                  )}
                  

                </div>
              </div>
            )}

            {step === "PREVIEW" && (
              <div className={`flex justify-between items-center px-6 py-5 rounded-[1.5rem] border ${!isExact && isPercentageMode ? 'bg-danger/5 border-danger/20' : 'bg-white border-black/[0.05] shadow-sm'}`}>
                <span className="font-bold text-muted-foreground text-[15px]">Total réparti</span>
                <div className="flex flex-col items-end">
                  <span className={`font-black text-xl tabular-nums ${!isExact && isPercentageMode ? 'text-danger' : 'text-black'}`}>
                    <Amount value={totalDistributedTargets} />
                  </span>
                  {!isExact && isPercentageMode && (
                    <span className="text-[13px] text-danger font-bold mt-1">La somme doit faire 100%</span>
                  )}
                  {!isExact && !isPercentageMode && totalDistributedTargets > toDistribute && (
                    <span className="text-[13px] text-danger font-bold mt-1">Dépassement de {formatAmount(totalDistributedTargets - toDistribute)} F</span>
                  )}
                  {!isExact && !isPercentageMode && totalDistributedTargets < toDistribute && (
                    <span className="text-[13px] text-muted-foreground font-bold mt-1 bg-black/5 px-2 py-0.5 rounded-md">Reste : {formatAmount(toDistribute - totalDistributedTargets)} F</span>
                  )}
                </div>
              </div>
            )}

            {/* Résumé (Résultat uniquement) */}
            {step === "RESULT" && (
              <div className="flex flex-col items-center justify-center pt-4">
                
                {/* PROPOSITION DE SAUVEGARDE (Uniquement si mode Quick) */}
                {modalMode === "quick" && !ruleSaved && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-gradient-to-br from-[#FFF8E7] to-[#FFF1D0] border border-[#FDE1A9] rounded-[2rem] p-6 text-left shadow-lg shadow-[#A87211]/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#A87211]/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-[#A87211] fill-[#FCE5B5]" />
                      </div>
                      <h4 className="font-extrabold text-[#A87211] text-lg tracking-tight">Gagner du temps la prochaine fois ?</h4>
                    </div>
                    <p className="text-[15px] font-medium text-[#B9811C] mb-5 leading-relaxed">Enregistre cette répartition comme règle pour automatiser tes futurs envois en un clic.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        value={saveRuleName}
                        onChange={(e) => setSaveRuleName(e.target.value)}
                        placeholder="Ex: Dépenses du mois"
                        className="flex-1 min-w-0 bg-white border-2 border-white focus:border-[#FDE1A9] rounded-2xl px-4 py-3.5 text-[15px] font-bold outline-none shadow-sm transition-all"
                      />
                      <button 
                        onClick={saveQuickAsRule}
                        disabled={!saveRuleName.trim() || isSavingRule}
                        className="w-full sm:w-auto px-6 py-3.5 shrink-0 bg-[#A87211] hover:bg-[#8C5D0B] disabled:opacity-50 text-white text-[15px] font-bold rounded-2xl shadow-lg shadow-[#A87211]/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {isSavingRule ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sauvegarder"}
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {modalMode === "quick" && ruleSaved && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full bg-money-in/10 border border-money-in/20 text-money-in rounded-[2rem] p-6 text-center font-bold flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-money-in rounded-full flex items-center justify-center text-white">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-lg">Règle enregistrée avec succès !</span>
                  </motion.div>
                )}

              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-white border-t border-black/[0.03] shrink-0 z-20 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-b-[2.5rem]">
            {step === "PREVIEW" && (
              <div className="flex flex-col gap-5">
                <div className={!isExact && (isPercentageMode || totalDistributed > activeData.totalAvailable) ? "opacity-40 grayscale pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
                  <SlideToConfirm 
                    onConfirm={handleConfirm} 
                    text={`Envoyer ${formatAmount(activeData.totalAvailable)} FCFA`}
                    confirmedText="Autorisé"
                  />
                </div>
                {!customData && modalMode === "rule" && (
                  <Link href="/rules" onClick={onClose} className="block text-center text-[14px] font-bold text-muted-foreground hover:text-black transition-colors">
                    Gérer mes règles
                  </Link>
                )}
              </div>
            )}
            
            {step === "EXECUTING" && (
              <div className="flex justify-center items-center py-5 text-primary font-bold animate-pulse text-lg">
                Traitement sécurisé en cours...
              </div>
            )}

            {step === "RESULT" && (
              <button 
                onClick={onClose}
                className="w-full bg-black text-white hover:bg-black/90 rounded-[1.5rem] h-16 text-lg font-bold shadow-xl shadow-black/10 transition-transform active:scale-95"
              >
                Terminer la session
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
