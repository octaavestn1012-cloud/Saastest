"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Shield, Trash2, Loader2, CheckCircle2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase.auth]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    
    // Mettre à jour les métadonnées de l'utilisateur dans Supabase
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    setSaving(false);
    if (!error) {
      setSuccessMsg("Profil mis à jour avec succès");
      router.refresh(); // Force Next.js à recharger layout.tsx avec le nouveau nom
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleResetPassword = async () => {
    if (!userEmail) return;
    alert("Un lien de réinitialisation vous sera envoyé. (Simulation)");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 relative">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Mon compte</h1>
        <p className="text-muted-foreground font-medium">
          Gérez vos informations personnelles et vos paramètres de sécurité.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profil Section */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Profil public</h2>
              <p className="text-sm text-muted-foreground">Ces informations seront affichées sur votre compte.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">Nom complet</label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: John Doe" 
                  className="bg-[#F5F5F7] border-transparent focus-visible:ring-primary/20 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">Adresse email</label>
                <Input 
                  value={userEmail}
                  disabled
                  className="bg-[#F5F5F7]/50 border-transparent text-muted-foreground h-12"
                />
                <p className="text-[12px] text-muted-foreground mt-1">
                  L'email ne peut pas être modifié pour des raisons de sécurité.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-2">
              {successMsg && (
                <span className="flex items-center text-sm font-medium text-money-in">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {successMsg}
                </span>
              )}
              <Button type="submit" disabled={saving} className="bg-black hover:bg-black/80 text-white rounded-xl h-11 px-8 font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </form>
        </div>

        {/* Plan & Facturation */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Abonnement actuel</h2>
              <p className="text-sm text-muted-foreground">Gérez votre plan et vos limites.</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-black/5 bg-[#F5F5F7]/30">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-black text-lg">Plan Gratuit</h3>
                  <span className="bg-black text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">Actif</span>
                </div>
                <p className="text-sm text-muted-foreground">Commission fixe de 1,9% par transaction.</p>
              </div>
              <Button onClick={() => setShowUpgradeModal(true)} variant="outline" className="rounded-xl font-bold h-11 border-black/10 hover:bg-[#F5F5F7]">
                Mettre à niveau
              </Button>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Sécurité</h2>
              <p className="text-sm text-muted-foreground">Sécurisez l'accès à votre compte.</p>
            </div>
          </div>
          
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-black mb-1">Mot de passe</h3>
              <p className="text-sm text-muted-foreground">Il est conseillé de changer votre mot de passe régulièrement.</p>
            </div>
            <Button onClick={handleResetPassword} variant="outline" className="rounded-xl font-bold h-11 border-black/10 hover:bg-[#F5F5F7]">
              Modifier le mot de passe
            </Button>
          </div>
        </div>

        {/* Zone dangereuse */}
        <div className="bg-white rounded-3xl border border-danger/20 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-danger/10 flex items-center gap-3 bg-danger/5">
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-danger">Zone de danger</h2>
              <p className="text-sm text-danger/80">Actions irréversibles.</p>
            </div>
          </div>
          
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-black mb-1">Supprimer le compte</h3>
              <p className="text-sm text-muted-foreground">Toutes vos données et règles seront définitivement effacées.</p>
            </div>
            <Button variant="outline" className="rounded-xl font-bold h-11 border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors">
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Mettre à niveau */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="text-2xl font-bold text-black">Mettre à niveau votre plan</h2>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-6 bg-[#F5F5F7]/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gratuit */}
                <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-sm flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-black mb-1">Gratuit</h3>
                    <p className="text-sm text-muted-foreground h-10">Parfait pour commencer et tester.</p>
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
                  </ul>
                  <Button className="w-full bg-[#F5F5F7] text-black hover:bg-[#F5F5F7] rounded-xl font-bold border border-black/5 cursor-default">
                    Plan Actuel
                  </Button>
                </div>

                {/* Pro */}
                <div className="bg-white border-2 border-primary rounded-3xl p-6 shadow-md relative flex flex-col scale-105 z-10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Populaire
                  </div>
                  <div className="mb-4 mt-2">
                    <h3 className="text-lg font-bold text-black mb-1">Pro</h3>
                    <p className="text-sm text-muted-foreground h-10">Pour les business en croissance.</p>
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
                  </ul>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm">
                    Choisir ce plan
                  </Button>
                </div>

                {/* Business */}
                <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-sm flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-black mb-1">Business</h3>
                    <p className="text-sm text-muted-foreground h-10">Pour les grands volumes.</p>
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
                  </ul>
                  <Button className="w-full bg-black hover:bg-black/80 text-white rounded-xl font-bold shadow-sm">
                    Choisir ce plan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
