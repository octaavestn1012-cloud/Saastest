"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, GripVertical, CheckCircle2, AlertCircle, Play, ChevronDown, Lock } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useRepartition, PreviewRule } from "@/context/RepartitionContext";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { RecipientModal, Recipient as Contact } from "@/components/features/destinataires/RecipientModal";

type RecipientRow = {
  id: string;
  name: string;
  value: number;
  network: string;
  phone: string;
};

interface RuleBuilderProps {
  initialData?: any;
}

export function RuleBuilder({ initialData }: RuleBuilderProps) {
  const router = useRouter();
  const { openModal } = useRepartition();

  // State contacts (Carnet)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRowToUpdate, setTargetRowToUpdate] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('reparto_recipients');
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  }, []);

  // State de base
  const [ruleName, setRuleName] = useState(initialData?.name || "");
  const [trigger, setTrigger] = useState(initialData?.triggerType || "manual");
  const [triggerTime, setTriggerTime] = useState(initialData?.triggerTime || "08:00");
  const [triggerDayOfWeek, setTriggerDayOfWeek] = useState(initialData?.triggerDayOfWeek || "1");
  const [triggerDayOfMonth, setTriggerDayOfMonth] = useState(initialData?.triggerDayOfMonth || "1");
  const [mode, setMode] = useState<"percentage" | "fixed">(initialData?.mode || "percentage");
  
  const [recipients, setRecipients] = useState<RecipientRow[]>(initialData?.recipients || [
    { id: "1", name: "", value: 0, network: "MTN", phone: "" }
  ]);

  // Options Avancées
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { plan } = useUser();
  const isPremium = plan === 'pro' || plan === 'business';
  
  const COMMISSION_RATE = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;
  const COMMISSION_TEXT = plan === "pro" ? "0,8%" : plan === "business" ? "0,4%" : "1,9%";

  const [advancedConditionEnabled, setAdvancedConditionEnabled] = useState(false);
  const [advancedConditionAmount, setAdvancedConditionAmount] = useState("");
  const [advancedPriorityEnabled, setAdvancedPriorityEnabled] = useState(false);
  const [advancedRestEnabled, setAdvancedRestEnabled] = useState(false);
  const [advancedRestName, setAdvancedRestName] = useState("");
  const [advancedRestNetwork, setAdvancedRestNetwork] = useState("MTN");
  const [advancedRestPhone, setAdvancedRestPhone] = useState("");
  const [advancedNotifEmail, setAdvancedNotifEmail] = useState(false);
  const [advancedNotifSms, setAdvancedNotifSms] = useState(false);

  const handleModeChange = (newMode: "percentage" | "fixed") => {
    if (newMode === mode) return;
    
    // Conversion intelligente
    if (newMode === "fixed" && mode === "percentage") {
      setRecipients(recipients.map(r => ({
        ...r,
        value: Math.round((r.value / 100) * 150000)
      })));
    } else if (newMode === "percentage" && mode === "fixed") {
      const currentTotal = recipients.reduce((acc, curr) => acc + (curr.value || 0), 0);
      if (currentTotal > 0) {
        setRecipients(recipients.map(r => ({
          ...r,
          value: Math.round((r.value / currentTotal) * 100)
        })));
      }
    }
    setMode(newMode);
  };

  // Derived State
  const totalPercentage = useMemo(() => {
    if (mode === "fixed") return 0;
    return recipients.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  }, [recipients, mode]);

  const totalFixed = useMemo(() => {
    if (mode === "percentage") return 0;
    return recipients.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  }, [recipients, mode]);

  const isPercentageValid = mode === "percentage" && totalPercentage === 100;
  const canSave = ruleName.trim().length > 0 && recipients.length > 0 && recipients.every(r => r.name.trim() !== "" && r.phone.trim() !== "") && (mode === "fixed" || isPercentageValid);

  // Actions
  const addRecipient = () => {
    setRecipients([...recipients, { 
      id: Math.random().toString(), 
      name: "", 
      value: 0,
      network: "MTN",
      phone: ""
    }]);
  };

  const updateRecipient = (id: string, field: keyof RecipientRow, value: any) => {
    setRecipients(recipients.map(r => {
      if (r.id === id) {
        return { ...r, [field]: field === "value" ? Number(value) : value };
      }
      return r;
    }));
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const handleContactSaved = (contact: Contact) => {
    const updatedContacts = [...contacts, contact];
    setContacts(updatedContacts);
    localStorage.setItem('reparto_recipients', JSON.stringify(updatedContacts));
    setIsModalOpen(false);
    
    if (targetRowToUpdate) {
      if (targetRowToUpdate === "ADVANCED_REST") {
        setAdvancedRestRecipientId(contact.id);
      } else {
        setRecipients(recipients.map(r => r.id === targetRowToUpdate ? { ...r, recipientId: contact.id } : r));
      }
      setTargetRowToUpdate(null);
    }
  };

  const handlePreview = () => {
    const simulatedBalance = mode === "percentage" ? 100000 : totalFixed * 1.5;
    
    const previewData: PreviewRule = {
      name: ruleName || "Nouvelle Règle",
      totalAvailable: simulatedBalance,
      commission: simulatedBalance * COMMISSION_RATE,
      targets: recipients.map((r, i) => {
        let amount = mode === "percentage" ? (simulatedBalance * (Number(r.value) || 0)) / 100 : (Number(r.value) || 0);
        return {
          id: r.id,
          label: r.name || `Destinataire ${i + 1}`,
          method: r.network || "MTN",
          number: r.phone || "00 00 00 00",
          amount: amount,
          percent: mode === "percentage" ? Number(r.value) : undefined
        };
      })
    };
    
    openModal(previewData);
  };

  const handleSave = () => {
    if (!canSave) return;
    
    const ruleToSave = {
      id: initialData?.id || Date.now().toString(),
      name: ruleName,
      triggerType: trigger,
      triggerTime,
      triggerDayOfWeek,
      triggerDayOfMonth,
      mode,
      recipients,
      advancedRestEnabled,
      advancedRestName: advancedRestEnabled ? advancedRestName : null,
      advancedRestNetwork: advancedRestEnabled ? advancedRestNetwork : null,
      advancedRestPhone: advancedRestEnabled ? advancedRestPhone : null,
      active: initialData?.active ?? true,
      recipientsCount: recipients.length,
      trigger: trigger === "manual" ? "Manuel" : 
               trigger === "entry" ? "À chaque entrée" : 
               trigger === "daily" ? `Quotidien à ${triggerTime}` : 
               trigger === "weekly" ? `Hebdomadaire (Jour ${triggerDayOfWeek})` : 
               `Mensuel (Le ${triggerDayOfMonth})`
    };

    const existingRules = JSON.parse(localStorage.getItem('reparto_rules') || '[]');
    let newRules;
    
    if (initialData?.id) {
      newRules = existingRules.map((r: any) => r.id === initialData.id ? ruleToSave : r);
    } else {
      newRules = [...existingRules, ruleToSave];
    }
    
    localStorage.setItem('reparto_rules', JSON.stringify(newRules));
    router.push('/rules');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32">
      {/* SECTION 1 : NOM */}
      <section className="bg-white rounded-[2rem] p-8 border border-black/[0.05] shadow-sm">
        <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          1. Nom de la règle
        </label>
        <input 
          type="text" 
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="Ex: Répartition mensuelle salaire" 
          className="w-full bg-[#F5F5F7] border-transparent rounded-2xl px-6 py-4 text-xl font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:font-normal" 
        />
      </section>

      {/* SECTION 2 : DÉCLENCHEUR */}
      <section className="bg-white rounded-[2rem] p-8 border border-black/[0.05] shadow-sm">
        <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
          2. Déclencheur — Quand répartir ?
        </label>
        <div className="space-y-4">
          <select 
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full bg-[#F5F5F7] border-transparent rounded-2xl px-6 py-4 text-lg font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="manual">Manuel (Je lance moi-même)</option>
            <option value="entry">Automatique : À chaque entrée d'argent</option>
            <option value="daily">Automatique : Quotidien</option>
            <option value="weekly">Automatique : Hebdomadaire</option>
            <option value="monthly">Automatique : Mensuel</option>
          </select>

          {/* Champs conditionnels */}
          <AnimatePresence mode="popLayout">
            {(trigger === "daily" || trigger === "weekly" || trigger === "monthly") && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                {trigger === "weekly" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-2 ml-1">Jour de la semaine</label>
                    <select 
                      value={triggerDayOfWeek}
                      onChange={(e) => setTriggerDayOfWeek(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
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
                
                {trigger === "monthly" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-2 ml-1">Jour du mois</label>
                    <select 
                      value={triggerDayOfMonth}
                      onChange={(e) => setTriggerDayOfMonth(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>Le {day}</option>
                      ))}
                      <option value="last">Le dernier jour du mois</option>
                    </select>
                  </div>
                )}

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold mb-2 ml-1">Heure d'exécution</label>
                  <input 
                    type="time" 
                    value={triggerTime}
                    onChange={(e) => setTriggerTime(e.target.value)}
                    className="w-full bg-black/5 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* SECTION 3 : DESTINATAIRES */}
      <section className="bg-white rounded-[2rem] p-8 border border-black/[0.05] shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">
            3. Destinataires — Comment répartir ?
          </label>
          <div className="flex bg-[#F5F5F7] p-1.5 rounded-full">
            <button 
              onClick={() => handleModeChange("percentage")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === "percentage" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
            >
              Pourcentage (%)
            </button>
            <button 
              onClick={() => handleModeChange("fixed")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === "fixed" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
            >
              Montant Fixe
            </button>
          </div>
        </div>

        {/* Validation Bar for Percentage */}
        {mode === "percentage" && (
          <div className="mb-8 bg-[#F5F5F7] rounded-2xl p-5 border border-black/5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <span className={`text-2xl font-black ${isPercentageValid ? 'text-primary' : 'text-black'}`}>
                  {totalPercentage}%
                </span>
                <span className="text-muted-foreground font-medium ml-2">attribués</span>
              </div>
              <div className={`font-bold text-sm ${totalPercentage > 100 ? 'text-danger' : 'text-muted-foreground'}`}>
                {totalPercentage > 100 ? `Dépassement de ${totalPercentage - 100}%` : `Reste ${100 - totalPercentage}%`}
              </div>
            </div>
            <ProgressBar 
              value={totalPercentage} 
              colorClass={totalPercentage === 100 ? "bg-primary" : totalPercentage > 100 ? "bg-danger" : "bg-black"} 
              className="h-4"
            />
          </div>
        )}

        {/* Validation for Fixed */}
        {mode === "fixed" && (
          <div className="mb-8 bg-[#F5F5F7] rounded-2xl p-5 border border-black/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Total réparti par exécution</p>
              <div className="text-2xl font-black">{totalFixed.toLocaleString('fr-FR')} FCFA</div>
            </div>
            
            <div className="flex flex-col items-start sm:items-end">
              <p className="text-xs text-muted-foreground font-medium mb-1">Si le solde est supérieur :</p>
              <div className="text-[13px] font-bold bg-white px-5 py-2 rounded-full shadow-sm border border-black/5">
                Il restera sur le compte source
              </div>
            </div>
          </div>
        )}

        {/* Lignes Destinataires */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {recipients.map((recipient, index) => (
              <motion.div 
                key={recipient.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-black/10 items-center group relative hover:border-black/20 transition-colors"
              >
                <div className="hidden sm:flex text-muted-foreground/30 cursor-grab px-2">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <input 
                  type="text" 
                  value={recipient.name}
                  onChange={(e) => updateRecipient(recipient.id, "name", e.target.value)}
                  placeholder="Nom"
                  className="flex-[1.5] bg-[#F5F5F7] border-transparent rounded-[12px] px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
                />

                <div className="relative flex-1 w-full sm:w-auto">
                  <input 
                    type="number" 
                    value={recipient.value || ''}
                    onChange={(e) => updateRecipient(recipient.id, "value", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#F5F5F7] border-transparent rounded-[12px] pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-bold font-mono text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    {mode === "percentage" ? "%" : "F"}
                  </span>
                </div>

                <select 
                  value={recipient.network}
                  onChange={(e) => updateRecipient(recipient.id, "network", e.target.value)}
                  className="flex-1 bg-[#F5F5F7] border-transparent rounded-[12px] px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-medium appearance-none"
                >
                  <option value="MTN">MTN BJ</option>
                  <option value="Moov">Moov BJ</option>
                  <option value="Celtiis">Celtiis BJ</option>
                  <option value="Wave">Wave CI</option>
                </select>

                <input 
                  type="tel" 
                  value={recipient.phone}
                  onChange={(e) => updateRecipient(recipient.id, "phone", e.target.value)}
                  placeholder="Numéro"
                  className="flex-[1.5] bg-[#F5F5F7] border-transparent rounded-[12px] px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-medium font-mono"
                />

                <button 
                  onClick={() => removeRecipient(recipient.id)}
                  className="p-3 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-xl transition-colors sm:opacity-0 group-hover:opacity-100 absolute sm:relative top-2 sm:top-0 right-2 sm:right-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button 
          variant="outline" 
          onClick={addRecipient}
          className="w-full border-dashed border-2 border-black/10 bg-[#F5F5F7]/50 hover:border-black/30 hover:bg-[#F5F5F7] rounded-xl h-12 font-bold text-muted-foreground hover:text-black text-sm"
        >
          + Ajouter un destinataire
        </Button>
      </section>

      {/* SECTION 4 : COMMISSION */}
      <section className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-[2rem] p-6 sm:p-8 flex items-start gap-4 shadow-sm">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
          <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs">R</div>
        </div>
        <div>
          <h4 className="font-bold text-purple-900 text-lg mb-1">Commission Réparto</h4>
          <p className="text-purple-700/80 text-sm leading-relaxed font-medium">
            Une commission fixe de <strong className="text-purple-600">{COMMISSION_TEXT}</strong> est appliquée sur chaque répartition exécutée. Elle est prélevée automatiquement sur le compte source et ne vient pas amputer les montants de vos destinataires.
          </p>
        </div>
      </section>

      {/* SECTION 5 : OPTIONS AVANCÉES */}
      <section className="bg-[#FFF9EE] border border-[#FBECC8] rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300">
        <div 
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="p-6 sm:p-8 cursor-pointer flex justify-between items-center hover:bg-[#FFF4DD] transition-colors"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-bold text-[#A87211] text-lg">Options avancées</h4>
              {!isPremium && (
                <div className="flex items-center gap-1.5 bg-[#FCE5B5] text-[#8C5D0B] px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  Premium
                </div>
              )}
            </div>
            {!isPremium ? (
              <p className="text-[#B9811C] text-sm font-medium">
                Réservé aux plans Pro et Business. <span className="underline cursor-pointer">Débloquer</span>
              </p>
            ) : (
              <p className="text-[#B9811C] text-sm font-medium">
                Conditions, priorité, reste et notifications.
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-[#FCE5B5] flex items-center justify-center text-[#8C5D0B]">
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence>
          {isAdvancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[#FBECC8]"
            >
              <div className="relative p-6 sm:p-8 space-y-8">
                
                {/* Overlay pour Non-Abonnés */}
                {!isPremium && (
                  <div className="absolute inset-0 bg-[#FFF9EE]/70 backdrop-blur-[2px] z-10 flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-[#FBECC8] text-center max-w-sm w-full">
                      <div className="w-16 h-16 bg-[#FFF9EE] rounded-full flex items-center justify-center mx-auto mb-4 text-[#A87211]">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-xl mb-2 text-black">Options verrouillées</h3>
                      <p className="text-muted-foreground text-sm mb-6">Passe au plan Pro ou Business pour définir des conditions, gérer les priorités et plus encore.</p>
                      <Button className="w-full h-12 bg-black hover:bg-black/80 text-white rounded-xl font-bold">
                        Voir les plans
                      </Button>
                    </div>
                  </div>
                )}

                {/* 1. CONDITION SI */}
                <div className={`space-y-4 ${!isPremium ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-black">1. Condition de déclenchement (SI...)</h5>
                      <p className="text-sm text-muted-foreground mt-0.5">La règle ne s'exécute que si le solde est suffisant.</p>
                    </div>
                    <Switch checked={advancedConditionEnabled} onCheckedChange={setAdvancedConditionEnabled} />
                  </div>
                  {advancedConditionEnabled && (
                    <div className="bg-white p-4 rounded-2xl border border-black/5 flex items-center gap-3">
                      <span className="text-sm font-medium">Exécuter SEULEMENT SI le solde dépasse</span>
                      <div className="relative w-40">
                        <input 
                          type="number" 
                          value={advancedConditionAmount}
                          onChange={(e) => setAdvancedConditionAmount(e.target.value)}
                          placeholder="Ex: 50000"
                          className="w-full bg-[#F5F5F7] border-transparent rounded-xl pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-bold font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">FCFA</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. PRIORITÉ */}
                <AnimatePresence>
                  {mode === 'fixed' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`space-y-4 pt-2 pb-2 ${!isPremium ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                        <div className="flex items-start sm:items-center justify-between gap-4">
                          <div>
                            <h5 className="font-bold text-black">2. Ordre de priorité</h5>
                            <p className="text-sm text-muted-foreground mt-0.5">En cas de solde insuffisant, payer les premiers d'abord.</p>
                          </div>
                          <Switch checked={advancedPriorityEnabled} onCheckedChange={setAdvancedPriorityEnabled} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. LIGNE RESTE */}
                <AnimatePresence>
                  {mode === 'fixed' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`space-y-4 pt-2 pb-2 ${!isPremium ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                        <div className="flex items-start sm:items-center justify-between gap-4">
                          <div>
                            <h5 className="font-bold text-black">3. Envoyer le reste (Le Reliquat)</h5>
                            <p className="text-sm text-muted-foreground mt-0.5">Tout l'argent non réparti ira à ce destinataire.</p>
                          </div>
                          <Switch checked={advancedRestEnabled} onCheckedChange={setAdvancedRestEnabled} />
                        </div>
                        {advancedRestEnabled && (
                          <div className="bg-white p-4 rounded-2xl border border-black/5 flex flex-col sm:flex-row items-center gap-3">
                            <span className="text-sm font-medium whitespace-nowrap">Envoyer à :</span>
                            <input type="text" value={advancedRestName} onChange={(e) => setAdvancedRestName(e.target.value)} placeholder="Nom" className="flex-1 w-full bg-[#F5F5F7] border-transparent rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-medium" />
                            <select value={advancedRestNetwork} onChange={(e) => setAdvancedRestNetwork(e.target.value)} className="w-full sm:w-auto bg-[#F5F5F7] border-transparent rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-medium appearance-none">
                              <option value="MTN">MTN BJ</option>
                              <option value="Moov">Moov BJ</option>
                              <option value="Celtiis">Celtiis BJ</option>
                              <option value="Wave">Wave CI</option>
                            </select>
                            <input type="tel" value={advancedRestPhone} onChange={(e) => setAdvancedRestPhone(e.target.value)} placeholder="Numéro" className="flex-1 w-full bg-[#F5F5F7] border-transparent rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-mono font-medium" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 4. NOTIFICATIONS */}
                <div className={`space-y-4 ${!isPremium ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-black">4. Notifications personnalisées</h5>
                      <p className="text-sm text-muted-foreground mt-0.5">Recevez une alerte quand cette règle s'exécute.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-black/5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={advancedNotifEmail} onChange={(e) => setAdvancedNotifEmail(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
                      <span className="text-sm font-medium">Par Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={advancedNotifSms} onChange={(e) => setAdvancedNotifSms(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
                      <span className="text-sm font-medium">Par SMS</span>
                    </label>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FOOTER ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 p-4 sm:p-6 z-40 md:pl-64">
        <div className="max-w-4xl mx-auto flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/rules')}
            className="h-14 px-8 rounded-2xl font-bold text-lg border-black/10 hover:bg-black/5"
          >
            Annuler
          </Button>
          <Button 
            variant="secondary"
            onClick={handlePreview}
            className="h-14 px-8 rounded-2xl font-bold text-lg bg-[#F5F5F7] hover:bg-[#E5E5E7] text-black"
          >
            <Play className="w-5 h-5 mr-2" />
            Tester en aperçu
          </Button>
          <Button 
            disabled={!canSave}
            onClick={handleSave}
            className="h-14 px-10 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
          >
            Enregistrer la règle
          </Button>
        </div>
      </div>

      {isModalOpen && (
        <RecipientModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleContactSaved} 
        />
      )}
    </div>
  );
}
