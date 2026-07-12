"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Plus, AlertCircle, CheckCircle2, ShieldCheck, X, Loader2, Trash2, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { connectFedaPay, connectKkiapay, connectPawapay, connectMagmaOnePay, deleteConnection, toggleConnectionStatus } from "@/app/actions/connections";
import { getGlobalGatewaysStatus } from "@/app/actions/admin";
import { formatDateToBenin } from "@/lib/utils/format";

const AVAILABLE_GATEWAYS = [
  { name: "Kkiapay", desc: "Passerelle locale très populaire au Bénin.", color: "bg-blue-500" },
  { name: "FedaPay", desc: "Paiement Mobile Money et cartes bancaires.", color: "bg-indigo-500" },
  { name: "CinetPay", desc: "Couverture sur plus de 9 pays francophones.", color: "bg-emerald-500" },
  { name: "PawaPay", desc: "Spécialiste Mobile Money en Afrique de l'Ouest et de l'Est.", color: "bg-orange-500" },
  { name: "FeexPay", desc: "Solution de paiement simple et sécurisée.", color: "bg-sky-500" },
  { name: "iPay Financial", desc: "Paiements rapides et intégration facile.", color: "bg-teal-500" },
  { name: "PayTech", desc: "Technologie de paiement avancée.", color: "bg-cyan-500" },
  { name: "MonetBill", desc: "Facturation et paiements récurrents.", color: "bg-purple-500" },
  { name: "Flutterwave", desc: "Couverture mondiale pour vos encaissements.", color: "bg-yellow-500" },
  { name: "PayPlus", desc: "Optimisé pour les petits commerçants.", color: "bg-pink-500" },
  { name: "Magma OnePay", desc: "Paiements unifiés et fluides.", color: "bg-red-500" },
  { name: "PayStack", desc: "Le Stripe de l'Afrique. Cartes et Mobile Money.", color: "bg-blue-600" },
  { name: "Stripe", desc: "Leader mondial des paiements en ligne.", color: "bg-indigo-600" },
  { name: "PayPal", desc: "Paiements internationaux simplifiés.", color: "bg-blue-400" },
  { name: "PayDunya", desc: "Excellente couverture au Sénégal et environ.", color: "bg-green-600" },
  { name: "NotchPay", desc: "Paiements modernes en Afrique centrale.", color: "bg-violet-500" },
  { name: "Lengo Pay", desc: "Solution locale émergente et dynamique.", color: "bg-rose-500" },
];

export default function ConnectionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  
  // États de données
  const [connections, setConnections] = useState<any[]>([]);
  const [globalGateways, setGlobalGateways] = useState<any>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // États du formulaire
  const [nom, setNom] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  const loadConnections = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: globalData } = await getGlobalGatewaysStatus();
    if (globalData) setGlobalGateways(globalData);

    const { data } = await supabase
      .from("connexions")
      .select("id, nom, passerelle, statut, created_at, user_id")
      .order("created_at", { ascending: false });
    
    if (data) setConnections(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const openModal = (gatewayName?: string) => {
    setSelectedGateway(gatewayName || null);
    setNom("");
    setSecretKey("");
    setPublicKey("");
    setPrivateKey("");
    setWebhookSecret("");
    setError(null);
    setCopied(false);
    setIsModalOpen(true);
  };

  const handleConnect = async () => {
    if (selectedGateway !== "FedaPay" && selectedGateway !== "Kkiapay" && selectedGateway !== "PawaPay" && selectedGateway !== "Magma OnePay") {
      setError("Cette passerelle n'est pas encore supportée dans cette version.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("nom", nom);
    
    let result;
    if (selectedGateway === "FedaPay") {
      formData.append("publicKey", publicKey);
      formData.append("secretKey", secretKey);
      if (webhookSecret) formData.append("webhookSecret", webhookSecret);
      result = await connectFedaPay(formData);
    } else if (selectedGateway === "Kkiapay") {
      formData.append("publicKey", publicKey);
      formData.append("privateKey", privateKey);
      formData.append("secretKey", secretKey);
      if (webhookSecret) formData.append("webhookSecret", webhookSecret);
      result = await connectKkiapay(formData);
    } else if (selectedGateway === "PawaPay") {
      formData.append("secretKey", secretKey); // secretKey holds the JWT Token
      if (webhookSecret) formData.append("webhookSecret", webhookSecret);
      result = await connectPawapay(formData);
    } else if (selectedGateway === "Magma OnePay") {
      formData.append("privateKey", privateKey);
      formData.append("secretKey", secretKey);
      if (webhookSecret) formData.append("webhookSecret", webhookSecret);
      result = await connectMagmaOnePay(formData);
    }

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsModalOpen(false);
      loadConnections();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-20 sm:pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Connexions</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez vos passerelles de paiement connectées.</p>
        </div>
        <Button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* ZONE 1 : Passerelles connectées */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight">Passerelles connectées</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-12 bg-black/[0.02] border border-black/5 rounded-2xl">
            <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h4 className="font-semibold text-lg text-foreground mb-1">Aucune connexion</h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Vous n'avez pas encore connecté de passerelle de paiement. Sélectionnez-en une ci-dessous pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn, index) => {
              const isGlobalActive = globalGateways[conn.passerelle.toLowerCase()] ?? true;
              return (
              <motion.div 
                key={conn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-[1.5rem] shadow-sm border relative overflow-hidden flex flex-col group hover:shadow-md transition-all ${
                  !isGlobalActive ? "bg-red-50/50 border-red-200 opacity-80" :
                  conn.statut === "actif" ? "bg-white border-black/[0.05]" : "bg-danger/5 border-danger/20"
                }`}
              >
                {!isGlobalActive && (
                  <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider z-30">
                    Temporairement Indisponible
                  </div>
                )}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full blur-2xl ${
                  !isGlobalActive ? "bg-red-100" :
                  conn.statut === "actif" ? "bg-money-in/5" : "bg-danger/10"
                }`} />
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${conn.statut === "actif" ? 'text-primary' : 'text-muted-foreground'}`}>
                    {conn.statut === "actif" ? 'Actif' : 'Pause'}
                  </span>
                  <Switch
                    checked={conn.statut === "actif"}
                    onCheckedChange={async () => {
                      // Optimistic update
                      const newStatus = conn.statut === "actif" ? "pause" : "actif";
                      setConnections(connections.map(c => c.id === conn.id ? { ...c, statut: newStatus } : c));
                      
                      const res = await toggleConnectionStatus(conn.id, conn.statut);
                      if (res.error) {
                        // Revert silently on error
                        setConnections(connections.map(c => c.id === conn.id ? { ...c, statut: conn.statut } : c));
                      }
                    }}
                    className="data-[state=checked]:bg-money-in scale-90 mr-1"
                  />
                </div>
                
                <div className="relative z-10 flex flex-col mb-4">
                  <div className="flex items-center gap-3 pr-10">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      conn.statut === "actif" ? "bg-money-in/10 text-money-in" : "bg-danger/10 text-danger"
                    }`}>
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[16px] leading-tight mb-1.5 capitalize">{conn.nom}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground capitalize">{conn.passerelle}</p>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${
                          conn.statut === "actif" ? "text-money-in bg-money-in/10" : 
                          conn.statut === "pause" ? "text-muted-foreground bg-black/5" : 
                          "text-danger bg-danger/10"
                        }`}>
                          {conn.statut === "actif" ? <CheckCircle2 className="w-2.5 h-2.5" /> : 
                           conn.statut === "pause" ? <ShieldCheck className="w-2.5 h-2.5" /> : 
                           <AlertCircle className="w-2.5 h-2.5" />}
                          {conn.statut}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {conn.statut === "erreur" && (
                  <div className="mt-2 text-xs text-danger flex items-start gap-1.5 p-2 bg-danger/5 rounded-lg border border-danger/10">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>La clé semble invalide ou expirée.</p>
                  </div>
                )}
                
                <div className={`relative z-10 mt-auto pt-5 border-t flex justify-between items-center ${
                  conn.statut === "actif" ? "border-black/[0.05]" : "border-danger/10"
                }`}>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    Ajouté le {formatDateToBenin(conn.created_at).split(" à")[0]}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      onClick={() => openModal(conn.passerelle)}
                      className="rounded-lg h-8 px-4 text-xs font-semibold hover:bg-black/5 hover:text-black transition-colors"
                    >
                      Gérer
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-black hover:bg-black/5 rounded-full ml-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem 
                          className="text-danger focus:text-danger focus:bg-danger/10 cursor-pointer rounded-lg"
                          onClick={async () => {
                            if (confirm("Voulez-vous vraiment supprimer cette connexion ?")) {
                              await deleteConnection(conn.id);
                              loadConnections();
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            )})}
          </div>
        )}
      </div>

      {/* ZONE 2 : Passerelles disponibles */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold tracking-tight">Passerelles disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_GATEWAYS.map((gateway, i) => {
            const isGlobalActive = globalGateways[gateway.name.toLowerCase()] ?? true;
            return (
            <motion.div
              key={gateway.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (i * 0.02) }}
              className={`bg-white rounded-[1.5rem] p-6 border border-black/[0.05] shadow-sm transition-all flex flex-col relative overflow-hidden ${
                isGlobalActive ? "hover:shadow-md hover:-translate-y-1" : "opacity-70 cursor-not-allowed"
              }`}
            >
              {!isGlobalActive && (
                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider z-30">
                  Maintenance
                </div>
              )}
              <div className="flex items-center gap-4 mb-3 mt-2">
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0 ${
                  isGlobalActive ? gateway.color : "bg-gray-400"
                }`}>
                  {gateway.name.charAt(0)}
                </div>
                <h4 className="font-bold text-[17px] tracking-tight">{gateway.name}</h4>
              </div>
              <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
                {gateway.desc}
              </p>
              <Button 
                variant="secondary"
                disabled={!isGlobalActive}
                onClick={() => isGlobalActive && openModal(gateway.name)}
                className="w-full mt-auto h-11 bg-black/[0.03] hover:bg-black/[0.06] text-black font-semibold rounded-xl"
              >
                {isGlobalActive ? "Connecter" : "Indisponible"}
              </Button>
            </motion.div>
          )})}
        </div>
      </div>

      {/* MODALE DE CONNEXION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-muted-foreground hover:bg-black/5 rounded-full transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold tracking-tight mb-6">
                Connecter {selectedGateway || "une passerelle"}
              </h3>
              
              <div className="space-y-5">
                {error && (
                  <div className="p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">Nom du compte / Libellé</label>
                  <input 
                    type="text" 
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder={`Ex: ${selectedGateway || "Ma passerelle"} Principal`} 
                    disabled={isSubmitting}
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium disabled:opacity-50" 
                  />
                </div>

                {selectedGateway !== "PawaPay" && selectedGateway !== "Magma OnePay" && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground ml-1">Clé Publique (Public Key)</label>
                    <input 
                      type="text" 
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="Ex: pk_..." 
                      disabled={isSubmitting}
                      className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium disabled:opacity-50" 
                    />
                  </div>
                )}

                {(selectedGateway === "Kkiapay" || selectedGateway === "Magma OnePay") && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground ml-1">{selectedGateway === "Magma OnePay" ? "Clé Privée (Bearer Token)" : "Clé Privée (Private Key)"}</label>
                    <input 
                      type="password" 
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Ex: priv_..." 
                      disabled={isSubmitting}
                      className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest disabled:opacity-50" 
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">
                    {selectedGateway === "PawaPay" ? "Token API (JWT Bearer)" : (selectedGateway === "Magma OnePay" ? "Clé Secrète (X-User-Secret)" : "Clé Secrète (Secret Key)")}
                  </label>
                  <input 
                    type="password" 
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={selectedGateway === "FedaPay" ? "sk_live_... ou sk_sandbox_..." : selectedGateway === "PawaPay" ? "Token API PawaPay" : "Clé secrète"} 
                    disabled={isSubmitting}
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest disabled:opacity-50" 
                  />
                  {selectedGateway === "FedaPay" && (
                    <p className="text-xs text-muted-foreground ml-1 mt-1">
                      La clé publique n'est pas requise pour l'intégration sécurisée côté serveur.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-foreground ml-1">Clé Secrète Webhook {selectedGateway !== "PawaPay" && <span className="font-bold text-danger">*</span>}</label>
                  </div>
                  
                  <div className="bg-[#F5F5F7] rounded-xl p-3 border border-black/5 mb-3">
                    <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
                      1. Copiez cette URL et collez-la dans la section Webhooks de {selectedGateway}.<br/>
                      2. {selectedGateway} vous donnera une Clé Secrète Webhook. Collez-la ci-dessous.
                    </p>
                    <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-black/5">
                      <input 
                        type="text" 
                        readOnly 
                        value={userId ? `${window.location.origin}/api/webhooks/${selectedGateway?.toLowerCase().replace(" ", "")}/${userId}` : ""} 
                        className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-muted-foreground truncate font-mono text-[10px]"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-7 px-3 shrink-0 rounded-md text-[10px] font-bold ${copied ? 'bg-money-in/10 text-money-in hover:bg-money-in/20' : 'bg-[#F5F5F7] text-foreground hover:bg-black/5'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (userId) {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${selectedGateway?.toLowerCase().replace(" ", "")}/${userId}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3 h-3 mr-1" />
                            Copier
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <input 
                    type="password" 
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Collez la Clé Secrète Webhook ici" 
                    disabled={isSubmitting}
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest disabled:opacity-50" 
                  />
                  <p className="text-xs text-muted-foreground ml-1 mt-1">
                    Nécessaire pour que Réparto soit alerté automatiquement des entrées d'argent.
                  </p>
                </div>
                
                <div className="bg-primary/10 text-primary p-4 rounded-2xl flex gap-3 text-sm font-medium items-start mt-2">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-snug">Réparto n'accède qu'à vos flux via cette clé. Elle sera chiffrée avec un niveau de sécurité militaire (AES-256).</p>
                </div>
                
                <Button 
                  className="w-full h-14 rounded-xl mt-4 bg-black hover:bg-black/80 text-white font-bold text-base shadow-lg shadow-black/10 transition-transform active:scale-95 disabled:opacity-70" 
                  onClick={handleConnect}
                  disabled={isSubmitting || !nom || !secretKey || (selectedGateway !== "PawaPay" && !webhookSecret)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Vérification & Connexion...
                    </>
                  ) : (
                    "Connecter"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
