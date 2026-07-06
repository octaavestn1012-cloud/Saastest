"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, GripVertical, CheckCircle2, AlertCircle, Play, ChevronDown, Lock, Loader2, User } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useRepartition, PreviewRule } from "@/context/RepartitionContext";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { RecipientModal, Recipient as Contact } from "@/components/features/destinataires/RecipientModal";
import { saveRegle } from "@/app/actions/regles";
import { getDestinataires } from "@/app/actions/destinataires";

type RecipientRow = {
  id: string;
  name: string;
  value: number;
  network: string;
  phone: string;
  isManual?: boolean;
  destinataireId?: string;
};

interface RuleBuilderProps {
  initialData?: any;
}

export function RuleBuilder({ initialData }: RuleBuilderProps) {
  const router = useRouter();
  const { openModal } = useRepartition();

  // State contacts (Carnet)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRowToUpdate, setTargetRowToUpdate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Charger les contacts pour potentiellement l'auto-complétion (si on l'ajoute)
    getDestinataires().then(({data}) => {
      if (data) {
        setContacts(data.map(d => ({
          id: d.id,
          name: d.libelle,
          network: d.methode_mobile_money,
          phone: d.numero
        })));
      }
    });
  }, []);

  // State de base
  const [ruleName, setRuleName] = useState(initialData?.nom || "");
  const [trigger, setTrigger] = useState(initialData?.declencheur || "a_chaque_entree");
  const [triggerTime, setTriggerTime] = useState(initialData?.declencheur_config?.time || "08:00");
  const [triggerDayOfWeek, setTriggerDayOfWeek] = useState(initialData?.declencheur_config?.dayOfWeek || "1");
  const [triggerDayOfMonth, setTriggerDayOfMonth] = useState(initialData?.declencheur_config?.dayOfMonth || "1");
  const [mode, setMode] = useState<"pourcentage" | "montant_fixe">(initialData?.mode || "pourcentage");
  
  const [recipients, setRecipients] = useState<RecipientRow[]>(
    initialData?.distributions?.map((d: any) => ({
      id: d.id,
      name: d.libelle,
      value: d.valeur,
      network: d.destinataires?.methode_mobile_money || "MTN",
      phone: d.destinataires?.numero || "",
      destinataireId: d.destinataire_id,
      isManual: false
    })) || [
      { id: "temp_1", name: "", value: 0, network: "MTN", phone: "", isManual: false }
    ]
  );

  // Options Avancées
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { plan } = useUser();
  const isPremium = plan === 'pro' || plan === 'business';
  
  const COMMISSION_RATE = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;
  const COMMISSION_TEXT = plan === "pro" ? "0,8%" : plan === "business" ? "0,4%" : "1,9%";

  const handleModeChange = (newMode: "pourcentage" | "montant_fixe") => {
    if (newMode === mode) return;
    
    // Conversion intelligente
    if (newMode === "montant_fixe" && mode === "pourcentage") {
      setRecipients(recipients.map(r => ({
        ...r,
        value: Math.round((r.value / 100) * 150000)
      })));
    } else if (newMode === "pourcentage" && mode === "montant_fixe") {
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
    if (mode === "montant_fixe") return 0;
    return recipients.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  }, [recipients, mode]);

  const totalFixed = useMemo(() => {
    if (mode === "pourcentage") return 0;
    return recipients.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  }, [recipients, mode]);

  const isPercentageValid = mode === "pourcentage" && totalPercentage === 100;
  const canSave = ruleName.trim().length > 0 && recipients.length > 0 && recipients.every(r => r.name.trim() !== "" && r.phone.trim() !== "") && (mode === "montant_fixe" || isPercentageValid);

  // Actions
  const addRecipient = () => {
    setRecipients([...recipients, { 
      id: "temp_" + Math.random().toString(), 
      name: "", 
      value: 0,
      network: "MTN",
      phone: "",
      isManual: false
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

  const handlePreview = () => {
    const simulatedBalance = mode === "pourcentage" ? 100000 : totalFixed * 1.5;
    
    const previewData: PreviewRule = {
      name: ruleName || "Nouvelle Règle",
      totalAvailable: simulatedBalance,
      commission: simulatedBalance * COMMISSION_RATE,
      targets: recipients.map((r, i) => {
        let amount = mode === "pourcentage" ? (simulatedBalance * (Number(r.value) || 0)) / 100 : (Number(r.value) || 0);
        return {
          id: r.id,
          label: r.name || `Destinataire ${i + 1}`,
          method: r.network || "MTN",
          number: r.phone || "00 00 00 00",
          amount: amount,
          percent: mode === "pourcentage" ? Number(r.value) : undefined
        };
      })
    };
    
    openModal(previewData);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    
    const payload = {
      id: initialData?.id,
      nom: ruleName,
      actif: initialData?.actif ?? true,
      declencheur: trigger,
      declencheur_config: trigger !== "manuel" && trigger !== "a_chaque_entree" ? {
        time: triggerTime,
        dayOfWeek: triggerDayOfWeek,
        dayOfMonth: triggerDayOfMonth
      } : null,
      mode: mode,
      recipients: recipients
    };

    const res = await saveRegle(payload);
    
    if (res.error) {
      alert("Erreur: " + res.error);
      setIsSaving(false);
    } else {
      router.push('/rules');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32">
      {/* SECTION 1 : NOM */}
      <section className="bg-white rounded-[2rem] p-4 sm:p-8 border border-black/[0.05] shadow-sm">
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
      <section className="bg-white rounded-[2rem] p-4 sm:p-8 border border-black/[0.05] shadow-sm">
        <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
          2. Déclencheur — Quand répartir ?
        </label>
        <div className="space-y-4">
          <select 
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full max-w-full bg-[#F5F5F7] border-transparent rounded-2xl px-6 py-4 text-lg font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer truncate pr-12"
          >
            <option value="manuel">Manuel (Je lance moi-même)</option>
            <option value="a_chaque_entree">Automatique : À chaque entrée d'argent</option>
            <option value="quotidien">Automatique : Quotidien</option>
            <option value="hebdo">Automatique : Hebdomadaire</option>
            <option value="mensuel">Automatique : Mensuel</option>
          </select>

          {/* Champs conditionnels */}
          <AnimatePresence mode="popLayout">
            {(trigger === "quotidien" || trigger === "hebdo" || trigger === "mensuel") && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                {trigger === "hebdo" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-2 ml-1">Jour de la semaine</label>
                    <select 
                      value={triggerDayOfWeek}
                      onChange={(e) => setTriggerDayOfWeek(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary"
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
                
                {trigger === "mensuel" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-2 ml-1">Jour du mois</label>
                    <select 
                      value={triggerDayOfMonth}
                      onChange={(e) => setTriggerDayOfMonth(e.target.value)}
                      className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full bg-black/5 rounded-xl px-4 py-4 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* SECTION 3 : DESTINATAIRES */}
      <section className="bg-white rounded-[2rem] p-4 sm:p-8 border border-black/[0.05] shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">
            3. Destinataires — Comment répartir ?
          </label>
          <div className="flex bg-[#F5F5F7] p-1.5 rounded-full">
            <button 
              onClick={() => handleModeChange("pourcentage")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === "pourcentage" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
            >
              Pourcentage (%)
            </button>
            <button 
              onClick={() => handleModeChange("montant_fixe")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === "montant_fixe" ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"}`}
            >
              Montant Fixe
            </button>
          </div>
        </div>

        {/* Validation Bar for Percentage */}
        {mode === "pourcentage" && (
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

        {/* Lignes Destinataires */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {recipients.map((target, idx) => (
              <motion.div 
                key={target.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-4 sm:p-5 rounded-[1.5rem] border-2 border-[#F5F5F7] relative group hover:border-black/10 transition-all"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[17px] font-extrabold text-black">Destinataire {idx + 1}</span>
                  <button onClick={() => removeRecipient(target.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F5F5F7] hover:bg-danger/10 text-black hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {!target.isManual ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
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
                          {target.phone && (
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
                                {contacts.length === 0 && (
                                  <div className="px-4 py-3 text-sm text-black/50 italic font-medium">Aucun contact enregistré.</div>
                                )}
                                {contacts.map((d: any) => (
                                  <button 
                                    key={d.id}
                                    onClick={() => {
                                      setRecipients(targets => targets.map(t => t.id === target.id ? { ...t, destinataireId: d.id, name: d.name, network: d.network, phone: d.phone, isManual: false } : t));
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-left"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-[14px] text-black leading-tight">{d.name}</div>
                                      <div className="text-[12px] font-semibold text-black/50 mt-0.5">{d.network} • <span className="font-mono">{d.phone}</span></div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              
                              <div className="h-px bg-black/5 my-2" />
                              
                              <button 
                                onClick={() => {
                                  setRecipients(targets => targets.map(t => t.id === target.id ? { ...t, isManual: true, name: "", phone: "", destinataireId: "" } : t));
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

                    <div className="relative w-full sm:w-[140px] shrink-0 bg-[#F5F5F7] rounded-xl flex items-center pr-4 border-2 border-transparent focus-within:border-black/10 transition-all">
                      <input type="number" value={target.value || ''} onChange={(e) => updateRecipient(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-3 px-2 text-[16px] text-black placeholder:text-black/30" />
                      <span className="text-black font-black text-[15px]">{mode === "pourcentage" ? "%" : "F"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 bg-[#F5F5F7] rounded-xl flex items-center px-4 py-3 border-2 border-transparent focus-within:border-black/10 transition-all">
                        <input type="text" value={target.name} onChange={(e) => updateRecipient(target.id, "name", e.target.value)} placeholder="Nom (ex: Loyer)" className="w-full bg-transparent font-bold outline-none placeholder:text-black/40 text-black text-[15px]" />
                      </div>
                      <div className="relative w-full sm:w-[140px] shrink-0 bg-[#F5F5F7] rounded-xl flex items-center pr-4 border-2 border-transparent focus-within:border-black/10 transition-all">
                        <input type="number" value={target.value || ''} onChange={(e) => updateRecipient(target.id, "value", e.target.value)} placeholder="0" className="w-full bg-transparent text-right font-black outline-none py-3 px-2 text-[16px] text-black placeholder:text-black/30" />
                        <span className="text-black font-black text-[15px]">{mode === "pourcentage" ? "%" : "F"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all relative">
                        <select value={target.network} onChange={(e) => updateRecipient(target.id, "network", e.target.value)} className="w-full h-full bg-transparent rounded-xl px-4 py-3 outline-none font-bold appearance-none text-black relative z-10 cursor-pointer text-[15px]">
                          <option value="MTN">MTN BJ</option>
                          <option value="Moov">Moov BJ</option>
                          <option value="Celtiis">Celtiis BJ</option>
                          <option value="Wave">Wave CI</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-black absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="flex-[2] bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-black/10 transition-all">
                        <input type="tel" value={target.phone} onChange={(e) => updateRecipient(target.id, "phone", e.target.value)} placeholder="00 00 00 00" className="w-full h-full bg-transparent px-4 py-3 outline-none font-mono font-bold tracking-wide text-black placeholder:text-black/40 text-[15px]" />
                      </div>
                      <button onClick={() => setRecipients(targets => targets.map(t => t.id === target.id ? { ...t, isManual: false } : t))} className="px-4 py-3 bg-black text-white hover:bg-black/80 rounded-xl font-bold text-[14px] transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button 
          onClick={addRecipient}
          className="w-full bg-white border-dashed border-2 border-black/5 hover:border-black/20 rounded-[1.5rem] h-14 font-bold text-[15px] text-muted-foreground hover:text-black flex items-center justify-center transition-all hover:bg-black/[0.01]"
        >
          <Plus className="w-5 h-5 mr-2" /> Ajouter un destinataire
        </button>
      </section>

      {/* SECTION 4 : COMMISSION */}
      <section className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-[2rem] p-4 sm:p-8 flex items-start gap-4 shadow-sm">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
          <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs">R</div>
        </div>
        <div>
          <h4 className="font-bold text-purple-900 text-lg mb-1">Commission Réparto</h4>
          <p className="text-purple-700/80 text-sm leading-relaxed font-medium">
            Une commission fixe de <strong className="text-purple-600">{COMMISSION_TEXT}</strong> est appliquée sur chaque répartition exécutée.
          </p>
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 p-4 sm:p-6 z-40 md:pl-64">
        <div className="max-w-4xl mx-auto flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/rules')}
            className="h-14 px-8 rounded-2xl font-bold text-lg border-black/10 hover:bg-black/5"
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button 
            variant="secondary"
            onClick={handlePreview}
            className="h-14 px-8 rounded-2xl font-bold text-lg bg-[#F5F5F7] hover:bg-[#E5E5E7] text-black"
            disabled={isSaving}
          >
            <Play className="w-5 h-5 mr-2" />
            Tester en aperçu
          </Button>
          <Button 
            disabled={!canSave || isSaving}
            onClick={handleSave}
            className="h-14 px-10 rounded-2xl font-bold text-lg bg-black hover:bg-black/80 text-white shadow-lg shadow-black/20 disabled:opacity-50 disabled:shadow-none transition-transform active:scale-95"
          >
            {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Enregistrer la règle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
