"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Shield, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    <div className="max-w-4xl mx-auto pb-24">
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
                <p className="text-sm text-muted-foreground">Jusqu'à 50 répartitions par mois.</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold h-11 border-black/10 hover:bg-[#F5F5F7]">
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
    </div>
  );
}
