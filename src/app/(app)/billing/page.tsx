"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, Receipt, Plus, Download, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const { user, plan: currentPlanRaw, refreshProfile } = useUser();
  const router = useRouter();
  const supabase = createClient();
  
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

  // Transforme la première lettre en majuscule pour l'affichage ("gratuit" -> "Gratuit")
  const currentPlan = currentPlanRaw.charAt(0).toUpperCase() + currentPlanRaw.slice(1);
  
  // Constantes basées sur le plan
  const commissionText = currentPlanRaw === 'pro' ? '0,8%' : currentPlanRaw === 'business' ? '0,4%' : '1,9%';

  const handlePlanChange = async (newPlan: 'gratuit' | 'pro' | 'business') => {
    if (!user) return;
    setUpdatingPlan(newPlan);
    
    // Note interne : Paiement réel à venir. Pour l'instant, on met juste à jour la base.
    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('id', user.id);
      
    if (!error) {
      await refreshProfile();
      router.refresh();
    } else {
      alert("Erreur lors de la mise à jour du plan.");
    }
    
    setUpdatingPlan(null);
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Facturation & Abonnement</h1>
        <p className="text-muted-foreground font-medium">
          Gérez votre forfait, vos moyens de paiement et consultez vos factures.
        </p>
      </div>

      <div className="space-y-10">
        
        {/* Section 1 : Mon plan actuel */}
        <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-black">Plan {currentPlan}</h2>
              <span className="bg-[#25D366]/10 text-[#25D366] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Actif
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              Idéal pour démarrer. Aucuns frais fixes mensuels.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium bg-[#F5F5F7] px-4 py-2 rounded-xl inline-flex text-black">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Commission actuelle : {commissionText} par répartition
            </div>
          </div>
          <div className="shrink-0">
            {/* Scroll vers la section des plans */}
            <Button 
              onClick={() => document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full md:w-auto bg-black hover:bg-black/80 text-white rounded-xl h-12 px-8 font-bold text-[15px]"
            >
              Changer de plan
            </Button>
          </div>
        </div>

        {/* Section 2 : Les 3 plans */}
        <div id="pricing-plans" className="pt-4">
          <h3 className="text-xl font-bold text-black mb-6">Nos offres</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Gratuit */}
            <div className={`bg-white border ${currentPlan === 'Gratuit' ? 'border-black/20 ring-2 ring-black/5' : 'border-black/10'} rounded-3xl p-6 shadow-sm flex flex-col`}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-black mb-1">Gratuit</h3>
                <p className="text-sm text-muted-foreground h-10">Démarrer et tester.</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-black">0 FCFA</span>
                <span className="text-muted-foreground text-sm">/mois</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  1,9% de commission
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Jusqu'à 50 répartitions/mois
                </li>
              </ul>
              {currentPlan === 'Gratuit' ? (
               <Button disabled className="w-full bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                 Plan Actuel
               </Button>
             ) : (
               <Button 
                 onClick={() => handlePlanChange('gratuit')} 
                 disabled={updatingPlan !== null}
                 variant="outline" 
                 className="w-full rounded-xl font-bold"
               >
                 {updatingPlan === 'gratuit' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rétrograder"}
               </Button>
             )}
            </div>

            {/* Pro */}
            <div className={`bg-white border-2 border-primary rounded-3xl p-6 shadow-md relative flex flex-col ${currentPlan === 'Pro' ? 'ring-2 ring-primary/20' : ''}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Populaire
              </div>
              <div className="mb-4 mt-2">
                <h3 className="text-lg font-bold text-black mb-1">Pro</h3>
                <p className="text-sm text-muted-foreground h-10">Choix n°1 des vendeurs.</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-black">5 000 FCFA</span>
                <span className="text-muted-foreground text-sm">/mois</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  0,8% de commission
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Règles illimitées
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Conditions avancées (SI...)
                </li>
              </ul>
              {currentPlan === 'Pro' ? (
                <Button disabled className="w-full bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                  Plan Actuel
                </Button>
              ) : (
                <Button 
                  onClick={() => handlePlanChange('pro')} 
                  disabled={updatingPlan !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm"
                >
                  {updatingPlan === 'pro' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Passer à ce plan"}
                </Button>
              )}
            </div>

            {/* Business */}
            <div className={`bg-white border ${currentPlan === 'Business' ? 'border-black/20 ring-2 ring-black/5' : 'border-black/10'} rounded-3xl p-6 shadow-sm flex flex-col`}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-black mb-1">Business</h3>
                <p className="text-sm text-muted-foreground h-10">Pour les gros volumes.</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-black">15 000 FCFA</span>
                <span className="text-muted-foreground text-sm">/mois</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  0,4% de commission
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Rapports avancés
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Support prioritaire
                </li>
              </ul>
              {currentPlan === 'Business' ? (
                <Button disabled className="w-full bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                  Plan Actuel
                </Button>
              ) : (
                <Button 
                  onClick={() => handlePlanChange('business')} 
                  disabled={updatingPlan !== null}
                  className="w-full bg-black hover:bg-black/80 text-white rounded-xl font-bold shadow-sm"
                >
                  {updatingPlan === 'business' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Passer à ce plan"}
                </Button>
              )}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Section 3 : Moyen de paiement */}
          <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Moyen de paiement</h2>
                <p className="text-sm text-muted-foreground">Pour le règlement de l'abonnement.</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-black font-bold mb-2">Aucun moyen de paiement</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Ajoutez un moyen de paiement (Mobile Money ou carte) pour pouvoir souscrire à un plan supérieur de manière automatique (Paiement réel à venir).
              </p>
              <Button className="bg-black hover:bg-black/80 text-white rounded-xl font-bold px-6">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un moyen de paiement
              </Button>
            </div>
          </div>

          {/* Section 4 : Historique de facturation */}
          <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Historique de facturation</h2>
                <p className="text-sm text-muted-foreground">Vos anciens reçus d'abonnement.</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
              <Receipt className="w-12 h-12 text-black/10 mb-4" />
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas encore de factures. Elles apparaîtront ici après votre premier paiement réel.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
