"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Receipt, Plus, Download, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { getUserInvoices } from "@/app/actions/invoices";
import { downloadInvoicePdf } from "@/lib/utils/invoiceGenerator";
import { AdminGodMode } from "@/components/features/billing/AdminGodMode";

export default function BillingPage() {
  const { user, plan: currentPlanRaw, refreshProfile } = useUser();
  const router = useRouter();
  const supabase = createClient();
  
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      const res = await getUserInvoices();
      if (res.invoices) {
        setInvoices(res.invoices);
      }
      setLoadingInvoices(false);
    }
    loadInvoices();
  }, []);

  // Transforme la première lettre en majuscule pour l'affichage ("gratuit" -> "Gratuit")
  const currentPlan = currentPlanRaw.charAt(0).toUpperCase() + currentPlanRaw.slice(1);
  
  // Constantes basées sur le plan
  const commissionText = currentPlanRaw === 'pro' ? '0,8%' : currentPlanRaw === 'business' ? '0,4%' : '1,9%';

  const handlePlanChange = async (newPlan: 'gratuit' | 'pro' | 'business') => {
    if (!user) return;
    setUpdatingPlan(newPlan);
    
    // Si on passe à Pro ou Business, on passe par Moneroo
    if (newPlan === 'pro' || newPlan === 'business') {
      try {
        const { initializeMonerooPayment } = await import('@/app/actions/billing');
        const res = await initializeMonerooPayment(newPlan);
        
        if (res.checkout_url) {
          // Redirection vers la page de paiement Moneroo
          window.location.href = res.checkout_url;
          return; // On ne remet pas updatingPlan à null car on quitte la page
        } else {
          console.error(res);
          alert("Erreur lors de l'initialisation du paiement: " + res.error);
        }
      } catch (err) {
        console.error(err);
        alert("Erreur de connexion au serveur de paiement.");
      }
      setUpdatingPlan(null);
      return;
    }

    // Rétrograder à gratuit (directement en base)
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
              {currentPlanRaw === 'gratuit' ? "Idéal pour démarrer. Aucuns frais fixes mensuels." :
               currentPlanRaw === 'pro' ? "Votre plan professionnel pour maximiser vos gains et automatiser." :
               "Le plan ultime pour les gros volumes et une gestion avancée."}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium bg-[#F5F5F7] px-4 py-2 rounded-xl inline-flex text-black">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Commission actuelle : {commissionText} par répartition
            </div>
          </div>
          <div className="shrink-0">
            {/* Scroll vers le plan supérieur */}
            <Button 
              onClick={() => {
                const target = currentPlanRaw === 'gratuit' ? 'plan-pro' : currentPlanRaw === 'pro' ? 'plan-business' : 'pricing-plans';
                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
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
            <div id="plan-gratuit" className={`bg-white border ${currentPlan === 'Gratuit' ? 'border-black/20 ring-2 ring-black/5' : 'border-black/10'} rounded-3xl p-6 shadow-sm flex flex-col`}>
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
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  1,9% de commission par répartition
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  20 répartitions / mois maximum
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Plafond 500 000 FCFA / mois
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Jusqu'à 6 règles actives
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  3 règles automatiques
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Max 3 destinataires/répartition
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Répartition manuelle
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                  <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  Conditions avancées (SI...)
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                  <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  Ordre de priorité + ligne "reste"
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                  <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  Rapports avancés
                </li>
              </ul>
              {currentPlan === 'Gratuit' ? (
               <Button disabled className="w-full h-12 text-[15px] bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                 Plan Actuel
               </Button>
             ) : (
               <Button 
                 onClick={() => handlePlanChange('gratuit')} 
                 disabled={updatingPlan !== null}
                 variant="outline" 
                 className="w-full h-12 text-[15px] rounded-xl font-bold"
               >
                 {updatingPlan === 'gratuit' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rétrograder"}
               </Button>
             )}
            </div>

            {/* Pro */}
            <div id="plan-pro" className={`bg-white border-2 border-primary rounded-3xl p-6 shadow-md relative flex flex-col ${currentPlan === 'Pro' ? 'ring-2 ring-primary/20' : ''}`}>
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
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  0,8% de commission (au lieu de 1,9%)
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Répartitions ILLIMITÉES
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Aucun plafond de volume
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Règles ILLIMITÉES
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Règles auto (quotidien, hebdo, etc.)
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-bold bg-primary/10 px-2 py-1 -mx-2 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Conditions avancées (SI...)
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Ordre de priorité + ligne "reste"
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Notifications personnalisées
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Destinataires illimités
                </li>
              </ul>
              {currentPlan === 'Pro' ? (
                <Button disabled className="w-full h-12 text-[15px] bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                  Plan Actuel
                </Button>
              ) : (
                <Button 
                  onClick={() => handlePlanChange('pro')} 
                  disabled={updatingPlan !== null}
                  className="w-full h-12 text-[15px] bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm"
                >
                  {updatingPlan === 'pro' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Passer à ce plan"}
                </Button>
              )}
            </div>

            {/* Business */}
            <div id="plan-business" className={`bg-white border ${currentPlan === 'Business' ? 'border-black/20 ring-2 ring-black/5' : 'border-black/10'} rounded-3xl p-6 shadow-sm flex flex-col`}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-black mb-1">Business</h3>
                <p className="text-sm text-muted-foreground h-10">Pour les gros volumes.</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-black">15 000 FCFA</span>
                <span className="text-muted-foreground text-sm">/mois</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-black font-bold">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Tout ce qui est dans Pro, PLUS :
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  0,4% de commission (la plus basse)
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Rapports avancés et exports
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Support prioritaire
                </li>
                <li className="flex items-center gap-2 text-sm text-black font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  Multi-utilisateurs (Bientôt)
                </li>
              </ul>
              {currentPlan === 'Business' ? (
                <Button disabled className="w-full h-12 text-[15px] bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                  Plan Actuel
                </Button>
              ) : (
                <Button 
                  onClick={() => handlePlanChange('business')} 
                  disabled={updatingPlan !== null}
                  className="w-full h-12 text-[15px] bg-black hover:bg-black/80 text-white rounded-xl font-bold shadow-sm"
                >
                  {updatingPlan === 'business' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Passer à ce plan"}
                </Button>
              )}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 pt-4">
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
            
            {loadingInvoices ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <Receipt className="w-12 h-12 text-black/10 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Vous n'avez pas encore de factures. Elles apparaîtront ici après votre premier paiement réel.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-[#F5F5F7]/50 transition-colors">
                    <div>
                      <p className="font-bold text-sm">Abonnement {inv.plan.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-sm text-green-600">{inv.amount_fcfa} FCFA</span>
                      <Button 
                        onClick={() => downloadInvoicePdf(inv, user?.user_metadata?.first_name || user?.email)}
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {user?.email?.toLowerCase() === "octaavestn1012@gmail.com" && (
          <AdminGodMode currentPlan={currentPlanRaw} />
        )}

      </div>
    </div>
  );
}
