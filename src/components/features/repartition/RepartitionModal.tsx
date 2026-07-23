"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Loader2, Edit2, RotateCcw, Plus, Trash2, Zap, SlidersHorizontal, BookOpen, Info, ChevronDown, User, Clock } from "lucide-react";
import { Amount } from "@/components/shared/Amount";
import { useUser } from "@/context/UserContext";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import { PreviewRule } from "@/context/RepartitionContext";
import { ProgressBar } from "@/components/ui/progress-bar";
import Link from "next/link";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { getRegles } from "@/app/actions/regles";
import { getDestinataires, saveDestinataire } from "@/app/actions/destinataires";
import { saveRegle } from "@/app/actions/regles";
import { executeRepartitionAction, executeQuickRepartitionAction, updateExecutionRuleId } from "@/app/actions/repartir";
import { COUNTRIES_NETWORKS, COUNTRY_CODES, COUNTRY_PHONE_LENGTHS } from "@/components/features/destinataires/RecipientModal";
import { useScrollLock } from "@/hooks/useScrollLock";

type Step = "PREVIEW" | "EXECUTING" | "RESULT" | "RESULT_RULE_ONLY";
type ModalMode = "rule" | "quick";

export function RepartitionModal({ onClose, customData }: { onClose: () => void, customData?: PreviewRule }) {
  const [step, setStep] = useState<Step>("PREVIEW");
  const [results, setResults] = useState<Record<string, "PENDING" | "SUCCESS" | "FAILED" | "EN_COURS">>({});
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [rules, setRules] = useState<any[]>([]);
  const [savedDestinataires, setSavedDestinataires] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustedTargets, setAdjustedTargets] = useState<any[]>([]);
  const [savingInlineIds, setSavingInlineIds] = useState<string[]>([]);

  const [executionError, setExecutionError] = useState<string | null>(null);

  // Par défaut sur 'quick' car c'est le flux principal
  const [modalMode, setModalMode] = useState<ModalMode>("quick");
  const [quickMode, setQuickMode] = useState<"percentage" | "fixed">("percentage");
  const [quickTargets, setQuickTargets] = useState<any[]>([
    { id: "1", destinataireId: "", name: "", value: 50, country: "Bénin", network: "MTN BJ", phone: "", isManual: false },
    { id: "2", destinataireId: "", name: "", value: 50, country: "Bénin", network: "Moov BJ", phone: "", isManual: false }
  ]);
  
  const [saveRuleName, setSaveRuleName] = useState("");
  const [saveRuleTrigger, setSaveRuleTrigger] = useState("manual");
  const [saveRuleTriggerTime, setSaveRuleTriggerTime] = useState("08:00");
  const [saveRuleTriggerDayOfWeek, setSaveRuleTriggerDayOfWeek] = useState("1");
  const [saveRuleTriggerDayOfMonth, setSaveRuleTriggerDayOfMonth] = useState("1");
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);
  const { plan } = useUser();

  const COMMISSION_RATE = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;
  const COMMISSION_TEXT = plan === "pro" ? "0,8%" : plan === "business" ? "0,4%" : "1,9%";
  const RESTANT_TEXT = plan === "pro" ? "99,2%" : plan === "business" ? "99,6%" : "98,1%";

  useScrollLock();

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
            const formattedRules = rulesData.filter((r:any) => r.actif && r.declencheur === 'manuel').map((r: any) => ({
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

    const mode = (activeRuleSource.mode === "pourcentage" || activeRuleSource.mode === "percentage") ? "percentage" : "fixed";
    
    let commissionAmount = 0;
    let toDistribute = totalAvailable;
    let sumAssigned = 0;
    let targets: any[] = [];

    if (mode === "percentage") {
      commissionAmount = Math.floor(totalAvailable * COMMISSION_RATE);
      toDistribute = totalAvailable - commissionAmount;

      targets = (activeRuleSource.recipients || []).map((r: any, index: number) => {
        const amount = Math.round((toDistribute * (Number(r.value) || 0)) / 100);
        sumAssigned += amount;
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: Number(r.value)
        };
      });

      if (targets.length > 0) {
        const diff = toDistribute - sumAssigned;
        if (diff !== 0) {
          targets[targets.length - 1].amount += diff;
        }
      }
    } else {
      // fixed mode
      targets = (activeRuleSource.recipients || []).map((r: any, index: number) => {
        const amount = Math.round(Number(r.value) || 0);
        sumAssigned += amount;
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: undefined
        };
      });
      commissionAmount = Math.floor(sumAssigned * COMMISSION_RATE);
    }

    return {
      name: activeRuleSource.name,
      totalAvailable: totalAvailable,
      commission: commissionAmount,
      toDistribute: toDistribute,
      targets
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
    let commissionAmount = 0;
    let toDistribute = totalAvailable;
    let sumAssigned = 0;
    let targets: any[] = [];

    if (quickMode === "percentage") {
      commissionAmount = Math.floor(totalAvailable * COMMISSION_RATE);
      toDistribute = totalAvailable - commissionAmount;

      targets = quickTargets.map((r: any, index: number) => {
        const amount = Math.round((toDistribute * (Number(r.value) || 0)) / 100);
        sumAssigned += amount;
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: Number(r.value)
        };
      });

      if (targets.length > 0) {
        const diff = toDistribute - sumAssigned;
        if (diff !== 0) {
          targets[targets.length - 1].amount += diff;
        }
      }
    } else {
      targets = quickTargets.map((r: any, index: number) => {
        const amount = Math.round(Number(r.value) || 0);
        sumAssigned += amount;
        return {
          id: r.id,
          label: r.name || `Destinataire ${index + 1}`,
          method: r.network,
          number: r.phone,
          amount: amount,
          percent: undefined
        };
      });
      commissionAmount = Math.floor(sumAssigned * COMMISSION_RATE);
    }

    return {
      name: "Répartition rapide",
      totalAvailable: totalAvailable,
      commission: commissionAmount,
      toDistribute: toDistribute,
      targets
    };
  }, [quickTargets, quickMode, totalAvailable, COMMISSION_RATE]);

  const activeData = modalMode === "rule" ? currentPreviewData : quickPreviewData;
  const currentTargets = modalMode === "rule" 
    ? (isAdjusting ? adjustedTargets : (currentPreviewData?.targets || []))
    : (quickPreviewData?.targets || []);

  const isPercentageMode = modalMode === "rule" 
    ? currentTargets.some((t: any) => t.percent !== undefined)
    : quickMode === "percentage";

  const computedCommission = (activeData as any)?.commission || 0;
  const toDistribute = totalAvailable - computedCommission;
  const totalDistributedTargets = currentTargets.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
  
  // Total prelevé = Somme réelle des destinataires + Commission
  const computedGross = totalDistributedTargets + computedCommission;

  const totalPercent = isPercentageMode ? currentTargets.reduce((acc: number, t: any) => acc + (Number(t.percent) || 0), 0) : 0;
  
  const hasMissingContact = currentTargets.length === 0 || currentTargets.some((t: any) => !t.number || typeof t.number !== 'string' || t.number.trim() === '');
  
  // Faisabilité : en pourcentage ça doit faire 100%, en fixe ça ne doit pas dépasser le solde, ET le solde doit être > 0
  const isExact = (isPercentageMode ? totalPercent === 100 : totalDistributedTargets <= toDistribute) && computedGross > 0 && totalAvailable >= 100 && !hasMissingContact;

  const isRuleOnly = modalMode === "quick" && saveRuleTrigger !== "manual";

  const formatAmount = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  const handleConfirm = async () => {
    if (!isExact) return;
    if (isRuleOnly && !saveRuleName.trim()) return;

    setStep("EXECUTING");

    if (isRuleOnly) {
      await saveRuleInternal();
      setStep("RESULT_RULE_ONLY");
      return;
    }

    const initialResults: Record<string, "PENDING" | "SUCCESS" | "FAILED" | "EN_COURS"> = {};
    currentTargets.forEach((t: any) => initialResults[t.id] = "PENDING");
    setResults(initialResults);

    try {
      // Exécuter via le vrai moteur FedaPay !
      let res: any;
      if (modalMode === "quick" || (modalMode === "rule" && isAdjusting)) {
        // Mode rapide ou règle ajustée à la volée : on envoie les targets calculés manuellement
        res = await executeQuickRepartitionAction(computedGross, currentTargets, isPercentageMode ? "pourcentage" : "montant_fixe");
      } else {
        // Mode règle stricte : on utilise le Rule ID de la BDD pour qu'il le re-calcule de façon sécurisée
        res = await executeRepartitionAction(computedGross, activeRuleSource?.id);
      }
      let finalExecutionId = res.executionId;
      if (finalExecutionId) {
        setCurrentExecutionId(finalExecutionId);
      }

      let overallUiStatus = "FAILED";
      if (res.finalStatus === "reussi") overallUiStatus = "SUCCESS";
      else if (res.finalStatus === "en_cours") overallUiStatus = "EN_COURS";
      else if (res.finalStatus === "partiel") overallUiStatus = "SUCCESS";
      
      // Mettre à jour l'UI avec le statut
      const finalResultsToSave: Record<string, "SUCCESS" | "FAILED" | "PENDING" | "EN_COURS"> = {};
      currentTargets.forEach((t: any) => {
        const apiResult = res.results?.find((r: any) => r.dest === t.label || (r.target && r.target.phone === t.number));
        if (apiResult) {
          if (apiResult.status === "reussi") finalResultsToSave[t.id] = "SUCCESS";
          else if (apiResult.status === "en_cours") finalResultsToSave[t.id] = "EN_COURS";
          else finalResultsToSave[t.id] = "FAILED";
        } else {
          finalResultsToSave[t.id] = overallUiStatus as "SUCCESS" | "FAILED" | "EN_COURS";
        }
      });
      setResults(finalResultsToSave);
      setStep("RESULT");

    } catch (e: any) {
      console.error(e);
      setExecutionError(e.message || "Erreur lors de l'exécution");
      const finalResultsToSave: Record<string, "SUCCESS" | "FAILED"> = {};
      currentTargets.forEach((t: any) => finalResultsToSave[t.id] = "FAILED");
      setResults(finalResultsToSave);
      setStep("RESULT");
    }
  };

  // Polling in real-time when in RESULT step
  useEffect(() => {
    if (step !== "RESULT" || !currentExecutionId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/executions/${currentExecutionId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.execution && data.execution.execution_lignes) {
          setResults((prev: any) => {
            const next = { ...prev };
            let hasChanges = false;
            
            currentTargets.forEach((t: any) => {
              const ligne = data.execution.execution_lignes.find((l: any) => l.destinataire_numero === t.number || l.destinataire_libelle.startsWith(t.label));
              if (ligne) {
                const newStatus = ligne.statut === "reussi" ? "SUCCESS" : ligne.statut === "echoue" ? "FAILED" : "EN_COURS";
                if (next[t.id] !== newStatus) {
                  next[t.id] = newStatus;
                  hasChanges = true;
                }
              }
            });
            
            return hasChanges ? next : prev;
          });
        }
      } catch(e) {}
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [step, currentExecutionId, currentTargets]);

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
    setQuickTargets([...quickTargets, { id: Math.random().toString(), destinataireId: "", name: "", value: 0, country: "Bénin", network: "MTN BJ", phone: "", isManual: false }]);
  };
  const updateQuickTarget = (id: string, field: string, value: any) => {
    setQuickTargets(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  
  const handleSaveQuickTargetInline = async (target: any) => {
    if (!target.name.trim() || !target.phone.trim()) return;
    const expectedLen = COUNTRY_PHONE_LENGTHS[target.country || "Bénin"] || 8;
    const cleanPhone = target.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== expectedLen) return;

    setSavingInlineIds(prev => [...prev, target.id]);
    try {
      const fd = new FormData();
      fd.append("libelle", target.name);
      fd.append("reseau", target.network);
      fd.append("pays", target.country || "Bénin");
      fd.append("numero", `${COUNTRY_CODES[target.country || "Bénin"] || "+229"} ${cleanPhone}`);

      await saveDestinataire(fd);
      
      getDestinataires().then(({data}) => {
        if (data) setSavedDestinataires(data);
      });

      updateQuickTarget(target.id, "isManual", false);
    } finally {
      setSavingInlineIds(prev => prev.filter(id => id !== target.id));
    }
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

  const saveRuleInternal = async (execId?: string) => {
    setIsSavingRule(true);

    let parsedDeclencheur = "manuel";
    let config: any = null;
    if (saveRuleTrigger === "entry") parsedDeclencheur = "a_chaque_entree";
    if (saveRuleTrigger === "daily") { parsedDeclencheur = "quotidien"; config = { time: saveRuleTriggerTime }; }
    if (saveRuleTrigger === "weekly") { parsedDeclencheur = "hebdomadaire"; config = { time: saveRuleTriggerTime, dayOfWeek: saveRuleTriggerDayOfWeek }; }
    if (saveRuleTrigger === "monthly") { parsedDeclencheur = "mensuel"; config = { time: saveRuleTriggerTime, dayOfMonth: saveRuleTriggerDayOfMonth }; }

    const payload = {
      id: "temp_" + Date.now(),
      nom: saveRuleName,
      actif: true,
      declencheur: parsedDeclencheur,
      declencheur_config: config,
      mode: quickMode === "percentage" ? "pourcentage" : "montant_fixe",
      recipients: quickTargets
    };

    const res = await saveRegle(payload);
    if (res.success && res.id) {
      const targetExecId = execId || currentExecutionId;
      if (targetExecId) {
        await updateExecutionRuleId(targetExecId, res.id);
      }
      setRuleSaved(true);
    } else {
      console.error("Erreur lors de la sauvegarde", res.error);
      alert("Erreur: " + res.error);
    }
    setIsSavingRule(false);
  };

  const saveQuickAsRule = async () => {
    await saveRuleInternal();
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
          data-modal-content
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative w-full h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[34rem] bg-[#FAFAFA] sm:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden overscroll-contain"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white z-20 shrink-0 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {step === "PREVIEW" ? "Répartition" : step === "EXECUTING" ? (isRuleOnly ? "Création en cours..." : "Envoi en cours...") : "Résultat"}
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-y-contain">
            
            {/* Résultat création de règle (Sans exécution) */}
            {(step === "RESULT_RULE_ONLY" || (isRuleOnly && step === "EXECUTING")) && (
              <div className="space-y-6">
                {step === "RESULT_RULE_ONLY" && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full bg-money-in/10 border border-money-in/20 text-money-in rounded-[2rem] p-8 text-center font-bold flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-money-in rounded-full flex items-center justify-center text-white shadow-lg shadow-money-in/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl tracking-tight">Règle créée avec succès !</h3>
                    <p className="text-money-in/80 font-medium mt-1">L'automatisation est maintenant active.</p>
                  </motion.div>
                )}
                
                <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-black/[0.03]">
                  <h3 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Détails de la règle</h3>
                  <div className="space-y-3 text-[15px] font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-bold text-black">{saveRuleName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Déclencheur</span>
                      <span className="font-bold text-black">
                        {saveRuleTrigger === "entry" ? "À chaque entrée d'argent" : 
                         saveRuleTrigger === "daily" ? `Quotidien à ${saveRuleTriggerTime}` :
                         saveRuleTrigger === "weekly" ? `Hebdomadaire (Jour ${saveRuleTriggerDayOfWeek}) à ${saveRuleTriggerTime}` :
                         saveRuleTrigger === "monthly" ? `Mensuel (Le ${saveRuleTriggerDayOfMonth}) à ${saveRuleTriggerTime}` : "Manuel"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step !== "RESULT_RULE_ONLY" && !(isRuleOnly && step === "EXECUTING") && (
              <div className="flex flex-col items-center justify-center pt-5 pb-5 bg-white rounded-[2rem] shadow-sm border border-black/[0.03]">
                <span className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{modalMode === "quick" ? "Total prélevé" : activeData.name}</span>
                <div className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-black to-black/70 mb-2">
                  <Amount value={computedGross} />
                </div>
              </div>
            )}

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
                      className="w-full max-w-full bg-[#F5F5F7] hover:bg-[#EAEAEB] transition-colors border-transparent rounded-[1.25rem] px-5 py-4 font-bold text-[15px] outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer truncate pr-12"
                    >
                      <option value="manual">Manuel (Je lance moi-même)</option>
                      <option value="entry">Automatique : À chaque entrée d'argent</option>
                      <option value="daily">Automatique : Quotidien</option>
                      <option value="weekly">Automatique : Hebdomadaire</option>
                      <option value="monthly">Automatique : Mensuel</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground bg-[#F5F5F7] pl-2">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Champs conditionnels pour le déclencheur */}
                  <AnimatePresence mode="popLayout">
                    {(saveRuleTrigger === "daily" || saveRuleTrigger === "weekly" || saveRuleTrigger === "monthly") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-black/5"
                      >
                        {saveRuleTrigger === "weekly" && (
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-semibold mb-2 ml-1">Jour de la semaine</label>
                            <select 
                              value={saveRuleTriggerDayOfWeek}
                              onChange={(e) => setSaveRuleTriggerDayOfWeek(e.target.value)}
                              className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary text-[15px] font-bold"
                            >
                              <option value="1">Lundi</option>
                              <option value="2">Mardi</option>
                              <option value="3">Mercredi</option>
                              <option value="4">Jeudi</option>
                              <option value="5">Vendredi</option>
                              <option value="6">Samedi</option>
                              <option value="0">Dimanche</option>
                            </select>
                          </div>
                        )}
                        
                        {saveRuleTrigger === "monthly" && (
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-semibold mb-2 ml-1">Jour du mois</label>
                            <select 
                              value={saveRuleTriggerDayOfMonth}
                              onChange={(e) => setSaveRuleTriggerDayOfMonth(e.target.value)}
                              className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary text-[15px] font-bold"
                            >
                              {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>Le {day}</option>
                              ))}
                              <option value="last">Le dernier jour du mois</option>
                            </select>
                          </div>
                        )}

                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs font-semibold mb-2 ml-1">Heure d'exécution</label>
                          <input 
                            type="time" 
                            value={saveRuleTriggerTime}
                            onChange={(e) => setSaveRuleTriggerTime(e.target.value)}
                            className="w-full max-w-full box-border text-center bg-black/5 rounded-xl px-2 py-4 outline-none focus:ring-1 focus:ring-primary font-mono text-[15px] font-bold"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {(saveRuleTrigger !== "manual") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-black/5"
                      >
                        <label className="block text-xs font-semibold mb-2 ml-1">Nom de la règle <span className="text-danger">*</span></label>
                        <input 
                          type="text" 
                          value={saveRuleName}
                          onChange={(e) => setSaveRuleName(e.target.value)}
                          placeholder="Ex: Dépenses mensuelles..."
                          className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary font-bold text-[15px] border border-transparent focus:border-primary/20 transition-all"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              {/* Custom Dropdown UI */}
                              <div className="relative flex-1 custom-dropdown-container min-w-0">
                                <button 
                                  onClick={() => setOpenDropdownId(openDropdownId === target.id ? null : target.id)}
                                  className="w-full flex items-center gap-3 p-2 -ml-2 rounded-2xl hover:bg-black/5 transition-colors text-left"
                                >
                                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[16px] text-black truncate">
                                        {target.name || <span className="inline-block text-left leading-tight">Choisir un<br/>contact</span>}
                                      </span>
                                      <ChevronDown className={`w-4 h-4 shrink-0 text-black transition-transform ${openDropdownId === target.id ? 'rotate-180' : ''}`} />
                                    </div>
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
                          {target.destinataireId && (
                            <div className="mt-1 pt-3 border-t border-black/5 flex justify-between items-center text-[12px] font-bold text-black/50">
                              <span className="uppercase tracking-wider">{target.network}</span>
                              <span className="font-mono tracking-wider text-black/70">{target.phone}</span>
                            </div>
                          )}
                        </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-row items-stretch sm:items-center gap-3">
                              <div className="flex-1 bg-[#F5F5F7] rounded-xl flex items-center px-4 py-3 border-2 border-transparent focus-within:border-black/10 transition-all min-w-0">
                                <input type="text" value={target.name} onChange={(e) => updateQuickTarget(target.id, "name", e.target.value)} placeholder="Nom (ex: Loyer)" className="w-full bg-transparent font-bold outline-none placeholder:text-black/40 text-black text-[15px] truncate" />
                              </div>
                              <div className="relative w-[110px] sm:w-[140px] shrink-0 bg-[#F5F5F7] rounded-xl flex items-center pr-4 border-2 border-transparent focus-within:border-black/10 transition-all">
                                <input type="number" value={target.value || ''} onChange={(e) => updateQuickTarget(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-3 px-2 text-[16px] text-black placeholder:text-black/30" />
                                <span className="text-black font-black text-[15px] ml-1">{isPercentageMode ? "%" : "F"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              {/* Pays: Horizontal sur desktop (w-full) */}
                              <div className="w-full bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all relative">
                                <select 
                                  value={target.country || "Bénin"} 
                                  onChange={(e) => {
                                    const newCountry = e.target.value;
                                    updateQuickTarget(target.id, "country", newCountry);
                                    const nets = COUNTRIES_NETWORKS[newCountry];
                                    if (nets && nets.length > 0) updateQuickTarget(target.id, "network", nets[0]);
                                  }} 
                                  className="w-full bg-transparent rounded-xl px-4 py-3 outline-none font-bold appearance-none text-black relative z-10 cursor-pointer text-[15px]"
                                >
                                  {Object.keys(COUNTRIES_NETWORKS).map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-black absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>

                              {/* Réseau et Numéro sur la même ligne uniquement sur desktop */}
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all relative">
                                  <select value={target.network} onChange={(e) => updateQuickTarget(target.id, "network", e.target.value)} className="w-full h-full bg-transparent rounded-xl px-4 py-3 outline-none font-bold appearance-none text-black relative z-10 cursor-pointer text-[15px]">
                                    {(COUNTRIES_NETWORKS[target.country || "Bénin"] || COUNTRIES_NETWORKS["Bénin"]).map((net) => (
                                      <option key={net} value={net}>{net}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-4 h-4 text-black absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                <div className={`flex-[2] bg-[#F5F5F7] rounded-xl border-2 flex items-center transition-all ${
                                  target.phone && target.phone.replace(/[^0-9]/g, '').length > 0 && 
                                  target.phone.replace(/[^0-9]/g, '').length !== (COUNTRY_PHONE_LENGTHS[target.country || "Bénin"] || 8)
                                  ? 'border-red-500/50 focus-within:border-red-500' 
                                  : 'border-transparent focus-within:border-black/10'
                                }`}>
                                  <div className="pl-4 pr-2 py-3 text-[15px] font-mono font-bold text-black/50 select-none flex items-center h-full">
                                    {COUNTRY_CODES[target.country || "Bénin"] || "+229"}
                                  </div>
                                  <input type="tel" value={target.phone} onChange={(e) => updateQuickTarget(target.id, "phone", e.target.value)} placeholder={Array(COUNTRY_PHONE_LENGTHS[target.country || "Bénin"] || 8).fill("0").join("").replace(/(.{2})/g, "$1 ").trim()} className="w-full h-full bg-transparent pr-4 py-3 outline-none font-mono font-bold tracking-wide text-black placeholder:text-black/40 text-[15px]" />
                                </div>
                              </div>
                              
                              {/* Enregistrer: Horizontal (w-full) */}
                              <button 
                                onClick={() => handleSaveQuickTargetInline(target)} 
                                disabled={savingInlineIds.includes(target.id) || target.name.trim() === "" || (target.phone && target.phone.replace(/[^0-9]/g, '').length !== (COUNTRY_PHONE_LENGTHS[target.country || "Bénin"] || 8))}
                                className="w-full py-3 bg-black text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-[15px] transition-colors flex items-center justify-center"
                              >
                                {savingInlineIds.includes(target.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer ce destinataire"}
                              </button>
                            </div>
                            {target.phone && target.phone.replace(/[^0-9]/g, '').length > 0 && 
                             target.phone.replace(/[^0-9]/g, '').length !== (COUNTRY_PHONE_LENGTHS[target.country || "Bénin"] || 8) && (
                              <p className="text-red-500 text-xs font-bold mt-1 ml-1">Ce numéro doit comporter exactement {COUNTRY_PHONE_LENGTHS[target.country || "Bénin"]} chiffres.</p>
                            )}
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
                          {results[target.id] === "EN_COURS" && <Clock className="w-7 h-7 text-blue-500" />}
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
              <div className={`bg-[#FFF8E7]/50 border ${!isExact ? 'border-danger/30' : 'border-[#FDE1A9]/30'} rounded-[1.5rem] p-5 space-y-3 mt-4 shadow-sm`}>
                <div className="flex justify-between items-center pt-1 text-black">
                  <span className="font-semibold text-[15px]">Total réparti</span>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold tabular-nums text-[16px] ${!isExact && isPercentageMode ? 'text-danger' : 'text-black'}`}>
                      <Amount value={totalDistributedTargets} />
                    </span>
                    {!isExact && isPercentageMode && totalPercent !== 100 && (
                      <span className="text-[13px] text-danger font-bold mt-1">
                        {totalPercent < 100 
                          ? `Il reste ${100 - totalPercent}% pour atteindre 100%` 
                          : `Le total dépasse de ${totalPercent - 100}% les 100%`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[#B9811C]">
                  <span className="font-semibold text-[14px]">Commission Réparto ({COMMISSION_TEXT})</span>
                  <span className="font-bold tabular-nums text-[15px]">
                    + <Amount value={computedCommission} />
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[#FDE1A9]/30">
                  <span className="font-black text-[16px] text-black">Total prélevé</span>
                  <div className="flex flex-col items-end">
                    <span className={`font-black tabular-nums text-[18px] ${!isExact && !isPercentageMode ? 'text-danger' : 'text-black'}`}>
                      <Amount value={computedGross} />
                    </span>
                    {!isExact && !isPercentageMode && computedGross > totalAvailable && (
                      <span className="text-[13px] text-danger font-bold mt-1">Dépassement de {formatAmount(computedGross - totalAvailable)} F</span>
                    )}
                    {!isExact && !isPercentageMode && computedGross < totalAvailable && (
                      <span className="text-[13px] text-[#B9811C] font-bold mt-1 bg-black/5 px-2 py-0.5 rounded-md">Reste sur le solde : {formatAmount(totalAvailable - computedGross)} F</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Résumé (Résultat uniquement) */}
            {step === "RESULT" && (
              <div className="flex flex-col items-center justify-center pt-4">
                
                {executionError && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-danger/10 border border-danger/20 rounded-[2rem] p-6 text-left shadow-lg mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-danger" />
                      </div>
                      <h4 className="font-extrabold text-danger text-lg tracking-tight">Échec de la répartition</h4>
                    </div>
                    <p className="text-[15px] font-medium text-danger/80 leading-relaxed">{executionError}</p>
                  </motion.div>
                )}

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
                <div className={(!isExact || (modalMode === "quick" && saveRuleTrigger !== "manual" && !saveRuleName.trim())) ? "opacity-40 grayscale pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
                  <SlideToConfirm 
                    onConfirm={handleConfirm} 
                    text={modalMode === "quick" && saveRuleTrigger !== "manual" ? "Créer la règle automatique" : `Envoyer ${formatAmount(computedGross)} FCFA`}
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
                {(modalMode === "quick" && saveRuleTrigger !== "manual") ? "Création de la règle..." : "Traitement sécurisé en cours..."}
              </div>
            )}

            {(step === "RESULT" || step === "RESULT_RULE_ONLY") && (
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
