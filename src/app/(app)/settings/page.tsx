"use client";

import { useState, useEffect } from "react";
import { User, Shield, Trash2, Loader2, CheckCircle2, Wallet, Bell, Globe, Phone, Smartphone, AlertTriangle } from "lucide-react";
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
  const [phone, setPhone] = useState("");
  const [payoutNumber, setPayoutNumber] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [notifSuccess, setNotifSuccess] = useState(true);
  const [notifError, setNotifError] = useState(true);
  const [notifTrigger, setNotifTrigger] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
        setPhone(user.user_metadata?.phone || "");
        setPayoutNumber(user.user_metadata?.payout_number || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase.auth]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: fullName,
        phone: phone,
        payout_number: payoutNumber
      }
    });

    setSaving(false);
    if (!error) {
      setSuccessMsg("Modifications enregistrées avec succès");
      router.refresh(); 
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleResetPassword = async () => {
    if (!userEmail) return;
    alert("Un lien de réinitialisation vous sera envoyé par email.");
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Paramètres du compte</h1>
        <p className="text-muted-foreground font-medium">
          Gérez vos informations personnelles, votre sécurité et vos préférences.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Section 1 : Profil */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Profil public</h2>
              <p className="text-sm text-muted-foreground">Vos informations d'identité de base.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">Nom complet / Entreprise</label>
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229 ..." 
                    className="bg-[#F5F5F7] border-transparent focus-visible:ring-primary/20 h-12 pl-10"
                  />
                </div>
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

        {/* Section 2 : Coordonnées de réception */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-money-in/10 text-money-in flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Coordonnées de réception</h2>
              <p className="text-sm text-muted-foreground">Numéro par défaut pour recevoir vos propres revenus.</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="max-w-md space-y-2 mb-4">
              <label className="text-sm font-semibold text-black">Numéro Mobile Money (Optionnel)</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  value={payoutNumber}
                  onChange={(e) => setPayoutNumber(e.target.value)}
                  placeholder="Ex: 90 00 00 00" 
                  className="bg-[#F5F5F7] border-transparent focus-visible:ring-primary/20 h-12 pl-10"
                />
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">
                Ce numéro sera utilisé si vous créez une règle de répartition vers "Moi-même".
              </p>
            </div>
            <Button onClick={handleUpdateProfile} disabled={saving} className="bg-black hover:bg-black/80 text-white rounded-xl h-11 px-6 font-bold">
              Sauvegarder le numéro
            </Button>
          </div>
        </div>

        {/* Section 3 : Sécurité */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Sécurité</h2>
              <p className="text-sm text-muted-foreground">Protégez l'accès à votre compte.</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-black mb-1">Mot de passe</h3>
                <p className="text-sm text-muted-foreground">Il est conseillé de changer votre mot de passe régulièrement.</p>
              </div>
              <Button onClick={handleResetPassword} variant="outline" className="rounded-xl font-bold h-11 border-black/10 hover:bg-[#F5F5F7]">
                Changer le mot de passe
              </Button>
            </div>

            <div className="h-px bg-black/5 w-full"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-black">Authentification à deux facteurs (2FA)</h3>
                  <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Bientôt</span>
                </div>
                <p className="text-sm text-muted-foreground">Ajoutez une couche de sécurité supplémentaire (SMS/App).</p>
              </div>
              <Button disabled variant="outline" className="rounded-xl font-bold h-11 border-black/10 opacity-50">
                Activer la 2FA
              </Button>
            </div>

            <div className="h-px bg-black/5 w-full"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-black mb-1">Appareils connectés</h3>
                <p className="text-sm text-muted-foreground">Déconnectez votre compte de tous vos autres appareils.</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold h-11 border-black/10 text-black hover:bg-black/5">
                Tout déconnecter
              </Button>
            </div>
          </div>
        </div>

        {/* Section 4 : Préférences */}
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3 bg-[#F5F5F7]/50">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Préférences & Notifications</h2>
              <p className="text-sm text-muted-foreground">Personnalisez votre expérience.</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-black mb-1">Langue de l'interface</h3>
                <p className="text-sm text-muted-foreground">Choisissez la langue d'affichage.</p>
              </div>
              <div className="px-4 py-2 bg-[#F5F5F7] rounded-xl font-bold text-sm text-black border border-black/5">
                Français (Défaut)
              </div>
            </div>

            <div className="h-px bg-black/5 w-full"></div>

            <div>
              <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications par Email
              </h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-black text-sm">Répartition exécutée avec succès</p>
                    <p className="text-xs text-muted-foreground">Recevoir un email quand l'argent est envoyé.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${notifSuccess ? 'bg-[#25D366]' : 'bg-black/10'}`} onClick={() => setNotifSuccess(!notifSuccess)}>
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${notifSuccess ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-black text-sm">Échec d'une transaction</p>
                    <p className="text-xs text-muted-foreground">Être alerté immédiatement si un envoi échoue.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${notifError ? 'bg-[#25D366]' : 'bg-black/10'}`} onClick={() => setNotifError(!notifError)}>
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${notifError ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-black text-sm">Nouvelle règle déclenchée</p>
                    <p className="text-xs text-muted-foreground">Notification à chaque fois qu'une règle s'active.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${notifTrigger ? 'bg-[#25D366]' : 'bg-black/10'}`} onClick={() => setNotifTrigger(!notifTrigger)}>
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${notifTrigger ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 : Zone dangereuse */}
        <div className="bg-white rounded-3xl border border-danger/20 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-danger/10 flex items-center gap-3 bg-danger/5">
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-danger">Zone de danger</h2>
              <p className="text-sm text-danger/80">Actions irréversibles.</p>
            </div>
          </div>
          
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-black mb-1">Supprimer mon compte</h3>
              <p className="text-sm text-muted-foreground">Cette action supprimera définitivement vos règles et votre historique.</p>
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
