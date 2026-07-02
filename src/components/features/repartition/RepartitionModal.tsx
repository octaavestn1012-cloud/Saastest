"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Loader2, Edit2, RotateCcw, Plus, Trash2, Zap, SlidersHorizontal, BookOpen, Info } from "lucide-react";
import { Amount } from "@/components/shared/Amount";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import { PreviewRule } from "@/context/RepartitionContext";
import { ProgressBar } from "@/components/ui/progress-bar";
import Link from "next/link";

type Step = "PREVIEW" | "EXECUTING" | "RESULT";
type ModalMode = "rule" | "quick";

const TOTAL_AVAILABLE = 150000;
const USER_PLAN = "Boss";
const COMMISSION_RATE = USER_PLAN === "Boss" ? 0.008 : USER_PLAN === "Empire" ? 0.004 : 0.019;
const COMMISSION_TEXT = USER_PLAN === "Boss" ? "0,8%" : USER_PLAN === "Empire" ? "0,4%" : "1,9%";

export function RepartitionModal({ onClose, customData }: { onClose: () => void, customData?: PreviewRule }) {
  const [step, setStep] = useState<Step>("PREVIEW");
  const [results, setResults] = useState<Record<string, "PENDING" | "SUCCESS" | "FAILED">>({});
  
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustedTargets, setAdjustedTargets] = useState<any[]>([]);

  // Par défaut sur 'quick' car c'est le flux principal
  const [modalMode, setModalMode] = useState<ModalMode>("quick");
  const [quickMode, setQuickMode] = useState<"percentage" | "fixed">("percentage");
  const [quickTargets, setQuickTargets] = useState<any[]>([
    { id: "1", name: "Destinataire 1", value: 50, network: "MTN", phone: "" },
    { id: "2", name: "Destinataire 2", value: 50, network: "Moov", phone: "" }
  ]);
  
  const [saveRuleName, setSaveRuleName] = useState("");
  const [saveRuleTrigger, setSaveRuleTrigger] = useState("manual");
  const [ruleSaved, setRuleSaved] = useState(false);
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);

  useEffect(() => {
    if (customData) {
      setModalMode("rule");
      return;
    }

    const savedRules = JSON.parse(localStorage.getItem('reparto_rules') || '[]');
    const activeRules = savedRules.filter((r: any) => r.active);
    setRules(activeRules);
    
    if (activeRules.length > 0) {
      setSelectedRuleId(activeRules[0].id);
    }
  }, [customData]);

  const activeRuleSource = useMemo(() => {
    if (customData) return null;
    return rules.find(r => r.id === selectedRuleId) || null;
  }, [selectedRuleId, rules, customData]);

  const generatedPreviewData = useMemo(() => {
    if (customData) return customData;
    if (!activeRuleSource) return null;

    const commissionAmount = TOTAL_AVAILABLE * COMMISSION_RATE;
    const toDistribute = TOTAL_AVAILABLE - commissionAmount;
    const mode = activeRuleSource.mode || "percentage";
    
    return {
      name: activeRuleSource.name,
      totalAvailable: TOTAL_AVAILABLE,
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
  }, [activeRuleSource, customData]);

  const currentPreviewData = customData || generatedPreviewData;

  useEffect(() => {
    if (currentPreviewData && modalMode === "rule") {
      setAdjustedTargets(currentPreviewData.targets);
      setIsAdjusting(false);
    }
  }, [currentPreviewData, modalMode]);

  const quickPreviewData = useMemo(() => {
    const commissionAmount = TOTAL_AVAILABLE * COMMISSION_RATE;
    const toDistribute = TOTAL_AVAILABLE - commissionAmount;
    return {
      name: "Répartition rapide",
      totalAvailable: TOTAL_AVAILABLE,
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
    ? currentTargets.some(t => t.percent !== undefined)
    : quickMode === "percentage";

  const toDistribute = TOTAL_AVAILABLE - (TOTAL_AVAILABLE * COMMISSION_RATE);
  const totalDistributedTargets = currentTargets.reduce((acc, t) => acc + (isPercentageMode ? (toDistribute * (Number(t.percent) || 0)) / 100 : Number(t.amount) || 0), 0);
  const totalDistributed = totalDistributedTargets + (activeData?.commission || 0);
  
  const totalPercent = isPercentageMode ? currentTargets.reduce((acc, t) => acc + (Number(t.percent) || 0), 0) : 0;
  const isExact = isPercentageMode ? totalPercent === 100 : totalDistributedTargets <= toDistribute;

  const formatAmount = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  const handleConfirm = () => {
    if (!isExact) return;
    setStep("EXECUTING");
    
    const initialResults: Record<string, "PENDING" | "SUCCESS" | "FAILED"> = {};
    currentTargets.forEach(t => initialResults[t.id] = "PENDING");
    setResults(initialResults);

    // Keep track of the final results to save to history
    const finalResultsToSave: Record<string, "SUCCESS" | "FAILED"> = {};

    currentTargets.forEach((target, index) => {
      setTimeout(() => {
        const isSuccess = target.id !== "3" && target.id !== "d_5"; // Mock failures for certain ids
        const finalStatus = isSuccess ? "SUCCESS" : "FAILED";
        
        finalResultsToSave[target.id] = finalStatus;

        setResults(prev => ({
          ...prev,
          [target.id]: finalStatus
        }));

        if (index === currentTargets.length - 1) {
          setTimeout(() => {
            // Save to history
            const details = currentTargets.map((t: any) => ({
              id: Math.random().toString(),
              name: t.label,
              network: t.method,
              phone: t.number || "00 00 00 00",
              amount: t.amount,
              status: finalResultsToSave[t.id],
              errorReason: finalResultsToSave[t.id] === "FAILED" ? "Solde mobile money insuffisant" : undefined,
              reference: finalResultsToSave[t.id] === "SUCCESS" ? `REF-${Math.floor(Math.random()*10000)}` : undefined
            }));
            
            const totalFailed = details.filter(d => d.status === "FAILED").length;
            let finalOverallStatus = "SUCCESS";
            if (totalFailed === details.length) finalOverallStatus = "FAILED";
            else if (totalFailed > 0) finalOverallStatus = "PARTIAL";

            const historyEntry = {
              id: `tx_${Date.now()}`,
              date: new Date().toISOString(),
              ruleName: activeData?.name || "Répartition rapide",
              totalAvailable: TOTAL_AVAILABLE,
              commissionAmount: activeData?.commission || 0,
              totalAmount: totalDistributedTargets,
              recipientCount: currentTargets.length,
              status: finalOverallStatus,
              details
            };

            const existingHistory = JSON.parse(localStorage.getItem('reparto_history') || 'null');
            // If it's null, we just let it be, but the History dashboard initializes it. We just append.
            if (existingHistory) {
              localStorage.setItem('reparto_history', JSON.stringify([historyEntry, ...existingHistory]));
            } else {
              localStorage.setItem('reparto_history', JSON.stringify([historyEntry]));
            }

            setStep("RESULT");
          }, 1000);
        }
      }, 1500 * (index + 1));
    });
  };

  const updateAdjustedTarget = (id: string, value: string) => {
    const toDistribute = TOTAL_AVAILABLE - (TOTAL_AVAILABLE * COMMISSION_RATE);
    setAdjustedTargets(adjustedTargets.map(t => {
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
    setQuickTargets([...quickTargets, { id: Math.random().toString(), name: "", value: 0, network: "MTN", phone: "" }]);
  };
  const updateQuickTarget = (id: string, field: string, value: string) => {
    setQuickTargets(quickTargets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const removeQuickTarget = (id: string) => {
    setQuickTargets(quickTargets.filter(t => t.id !== id));
  };

  const saveQuickAsRule = () => {
    if (!saveRuleName.trim()) return;
    const ruleToSave = {
      id: Date.now().toString(),
      name: saveRuleName,
      triggerType: saveRuleTrigger,
      trigger: saveRuleTrigger === "manual" ? "Manuel" : 
               saveRuleTrigger === "entry" ? "À chaque entrée" : 
               saveRuleTrigger === "daily" ? "Quotidien à 08:00" : 
               saveRuleTrigger === "weekly" ? "Hebdomadaire (Jour 1)" : 
               "Mensuel (Le 1er)",
      triggerTime: "08:00",
      triggerDayOfWeek: "1",
      triggerDayOfMonth: "1",
      mode: quickMode,
      recipients: quickTargets,
      active: true,
      recipientsCount: quickTargets.length,
    };
    const savedRules = JSON.parse(localStorage.getItem('reparto_rules') || '[]');
    localStorage.setItem('reparto_rules', JSON.stringify([...savedRules, ruleToSave]));
    setRuleSaved(true);
  };

  if (!activeData && rules.length === 0 && modalMode === "rule") {
    setModalMode("quick");
    return null;
  }

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
          className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-[34rem] bg-[#FAFAFA] sm:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
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
                <span>À répartir : <strong className="text-black"><Amount value={activeData.toDistribute} /></strong></span>
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
                          − <Amount value={activeData.commission} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-[#FDE1A9]/30">
                        <span className="font-black text-[15px] text-black">À répartir</span>
                        <span className="font-black tabular-nums text-[16px] text-black">
                          <Amount value={activeData.toDistribute} />
                        </span>
                      </div>
                      <p className="text-left text-[12px] font-medium text-muted-foreground pt-1 leading-relaxed">
                        Réparto prélève {COMMISSION_TEXT}. Tu répartis les {USER_PLAN === "Boss" ? "99,2%" : USER_PLAN === "Empire" ? "99,6%" : "98,1%"} restants comme tu veux.
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
                      <motion.div key={target.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col bg-white p-4 rounded-[1.5rem] border border-black/[0.03] shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-black/[0.03] group-hover:bg-primary/50 transition-colors" />
                        
                        <div className="flex w-full gap-3 mb-3 pl-2 items-center">
                          <input type="text" value={target.name} onChange={(e) => updateQuickTarget(target.id, "name", e.target.value)} placeholder={`Destinataire ${idx + 1}`} className="flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-black/20" />
                          <div className="relative w-28 bg-[#F5F5F7] rounded-[1rem] flex items-center pr-3 group-hover:bg-[#EEEEF0] transition-colors">
                            <input type="number" value={target.value || ''} onChange={(e) => updateQuickTarget(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-2.5 px-3" />
                            <span className="text-muted-foreground font-bold text-sm">{isPercentageMode ? "%" : "F"}</span>
                          </div>
                        </div>
                        <div className="flex w-full gap-2 pl-2">
                          <select value={target.network} onChange={(e) => updateQuickTarget(target.id, "network", e.target.value)} className="flex-1 bg-[#F5F5F7] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold appearance-none">
                            <option value="MTN">MTN BJ</option>
                            <option value="Moov">Moov BJ</option>
                            <option value="Celtiis">Celtiis BJ</option>
                            <option value="Wave">Wave CI</option>
                          </select>
                          <input type="tel" value={target.phone} onChange={(e) => updateQuickTarget(target.id, "phone", e.target.value)} placeholder="00 00 00 00" className="flex-[1.5] bg-[#F5F5F7] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-mono font-medium tracking-wide" />
                          <button onClick={() => removeQuickTarget(target.id)} className="w-11 flex items-center justify-center text-muted-foreground hover:text-danger bg-[#F5F5F7] hover:bg-danger/10 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                  {currentTargets.map((target) => (
                    <div key={target.id} className="flex justify-between items-center p-4 hover:bg-[#F9F9FA] rounded-2xl transition-colors">
                      <div className="flex flex-col flex-1">
                        <span className="font-bold text-[16px]">{target.label}</span>
                        <span className="text-[13px] text-muted-foreground font-medium mt-0.5">{target.method} • {target.number || "Sans numéro"}</span>
                      </div>
                      
                      {step === "PREVIEW" && (!isAdjusting || modalMode === "quick") && (
                        <div className="flex flex-col items-end text-right">
                          <div className="font-bold tabular-nums text-primary text-[17px]">
                            <Amount value={target.amount} />
                          </div>
                          {target.percent !== undefined && (
                            <span className="text-xs text-muted-foreground font-bold bg-black/5 px-2 py-0.5 rounded-md mt-1">{target.percent}%</span>
                          )}
                        </div>
                      )}

                      {step === "PREVIEW" && isAdjusting && modalMode === "rule" && (
                        <div className="relative w-28">
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
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={saveRuleName}
                        onChange={(e) => setSaveRuleName(e.target.value)}
                        placeholder="Ex: Dépenses du mois"
                        className="flex-1 bg-white border-2 border-white focus:border-[#FDE1A9] rounded-2xl px-4 py-3.5 text-[15px] font-bold outline-none shadow-sm transition-all"
                      />
                      <button 
                        onClick={saveQuickAsRule}
                        disabled={!saveRuleName.trim()}
                        className="px-6 py-3.5 bg-[#A87211] hover:bg-[#8C5D0B] disabled:opacity-50 text-white text-[15px] font-bold rounded-2xl shadow-lg shadow-[#A87211]/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        Sauvegarder
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
          <div className="p-6 bg-white border-t border-black/[0.03] shrink-0 z-20 pb-safe sm:rounded-b-[2.5rem]">
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
