"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SlidersHorizontal, MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { getRegles, toggleRegle, deleteRegle } from "@/app/actions/regles";
import { useUser } from "@/context/UserContext";
import { Lock } from "lucide-react";

export default function RulesPage() {
  const { plan } = useUser();
  const isPremium = plan === 'pro' || plan === 'business';
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // États pour la modale de confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ruleToActivate, setRuleToActivate] = useState<any>(null);
  const [ruleToDeactivate, setRuleToDeactivate] = useState<any>(null);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data } = await getRegles();
    if (data) {
      setRules(data.map((r: any) => ({
        id: r.id,
        name: r.nom,
        declencheur: r.declencheur,
        trigger: r.declencheur === "manuel" ? "Manuel" : 
                 r.declencheur === "a_chaque_entree" ? "À chaque entrée" : 
                 r.declencheur === "quotidien" ? `Quotidien à ${r.declencheur_config?.time}` : 
                 r.declencheur === "hebdo" ? `Hebdomadaire (Jour ${r.declencheur_config?.dayOfWeek})` : 
                 `Mensuel (Le ${r.declencheur_config?.dayOfMonth})`,
        recipientsCount: r.distributions?.length || 0,
        active: r.actif,
        mode: r.mode,
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    const willBeActive = !currentActive;

    // Si on tente d'activer une règle "À chaque entrée"
    if (willBeActive && rule.declencheur === "a_chaque_entree") {
      // Chercher s'il y a déjà une autre règle "À chaque entrée" active
      const activeAutoRule = rules.find(r => r.declencheur === "a_chaque_entree" && r.active && r.id !== id);
      if (activeAutoRule) {
        setRuleToActivate(rule);
        setRuleToDeactivate(activeAutoRule);
        setShowConfirmModal(true);
        return;
      }
    }

    const updated = rules.map(r => r.id === id ? { ...r, active: willBeActive } : r);
    setRules(updated);
    await toggleRegle(id, willBeActive);
  };

  const handleConfirmToggle = async () => {
    if (!ruleToActivate || !ruleToDeactivate) return;

    const updated = rules.map(r => {
      if (r.id === ruleToActivate.id) return { ...r, active: true };
      if (r.id === ruleToDeactivate.id) return { ...r, active: false };
      return r;
    });

    setRules(updated);
    setShowConfirmModal(false);

    await toggleRegle(ruleToActivate.id, true);

    setRuleToActivate(null);
    setRuleToDeactivate(null);
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette règle ?")) {
      setRules(prev => prev.filter(r => r.id !== id));
      const res = await deleteRegle(id);
      if (res?.error) {
        await fetchRules();
      }
    }
  };


  return (
    <div className="space-y-8 pb-20 sm:pb-8">
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(null)} 
        />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Règles</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez l'automatisation de vos répartitions.</p>
        </div>
        
        {(!isPremium && rules.length >= 3) ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-bold text-danger">Limite de 3 règles atteinte</span>
            <Link href="/billing">
              <Button className="bg-black hover:bg-black/80 text-white rounded-2xl h-12 px-6 shadow-lg">
                <Lock className="w-4 h-4 mr-2" />
                Passer Pro
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/rules/new">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle règle
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-black/[0.05] p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
            <SlidersHorizontal className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-3">Aucune règle configurée</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            Crée ta première règle. Exemple : 50% réinvestissement, 40% épargne, 10% pour toi. L'automatisation s'occupe du reste.
          </p>
          <Link href="/rules/new">
            <Button className="bg-black hover:bg-black/80 text-white rounded-2xl h-14 px-8 text-lg font-semibold shadow-lg transition-transform hover:-translate-y-1">
              Créer une règle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule, index) => (
            <motion.div 
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[1.5rem] p-6 border border-black/[0.05] shadow-sm flex flex-col relative group"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-[17px] tracking-tight mb-1">{rule.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-black/70">{rule.trigger}</span>
                    <span>•</span>
                    <span>{rule.recipientsCount} destinataires</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${rule.active ? 'text-primary' : 'text-muted-foreground'}`}>
                      {rule.active ? 'Actif' : 'Pause'}
                    </span>
                    <Switch 
                      checked={rule.active} 
                      onCheckedChange={() => handleToggleRule(rule.id, rule.active)}
                    />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === rule.id ? null : rule.id);
                      }}
                      className="text-muted-foreground hover:text-black transition-colors p-1 rounded-md hover:bg-black/5"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {dropdownOpen === rule.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 py-2 z-50 overflow-hidden"
                        >
                          <Link href={`/historique?regle=${rule.id}`}>
                            <button className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-black/5 transition-colors text-muted-foreground">
                              Voir l'historique
                            </button>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <Link href={`/rules/${rule.id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-10 rounded-xl bg-black/[0.02] hover:bg-black/[0.05] border-transparent font-medium">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </Link>
                <Button 
                  onClick={() => handleDeleteRule(rule.id)}
                  variant="outline" 
                  className="h-10 px-4 rounded-xl text-danger hover:text-danger hover:bg-danger/10 border-transparent"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modale de confirmation de changement de règle automatique */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop flouté */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowConfirmModal(false);
                setRuleToActivate(null);
                setRuleToDeactivate(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Contenu de la modale */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] border border-black/5 shadow-2xl p-6 sm:p-8 relative z-50 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icône d'alerte jaune */}
                <div className="w-16 h-16 bg-yellow-500/10 text-yellow-600 rounded-3xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-black mb-3">
                  Changer de règle automatique ?
                </h3>
                
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                  Vous ne pouvez avoir qu'une seule règle automatique active sur le déclencheur <span className="font-semibold text-black">À chaque entrée</span>.<br /><br />
                  Activer <span className="font-semibold text-primary">"{ruleToActivate?.name}"</span> va mettre automatiquement en pause la règle <span className="font-semibold text-black">"{ruleToDeactivate?.name}"</span>.
                </p>

                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setRuleToActivate(null);
                      setRuleToDeactivate(null);
                    }}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl font-bold border-black/10 hover:bg-black/5 transition-colors"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleConfirmToggle}
                    className="flex-1 h-12 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/10 transition-colors"
                  >
                    Oui, activer
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
