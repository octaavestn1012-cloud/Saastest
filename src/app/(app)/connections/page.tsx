"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Plus, AlertCircle, CheckCircle2, ShieldCheck, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { connectFedaPay, deleteConnection } from "@/app/actions/connections";

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
  const [isLoading, setIsLoading] = useState(true);

  // États du formulaire
  const [nom, setNom] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadConnections = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("connexions")
      .select("id, nom, passerelle, statut, created_at")
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
    setError(null);
    setIsModalOpen(true);
  };

  const handleConnect = async () => {
    if (selectedGateway !== "FedaPay") {
      setError("Cette passerelle n'est pas encore supportée dans cette version.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("nom", nom);
    formData.append("secretKey", secretKey);

    const result = await connectFedaPay(formData);

    if (result.error) {
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
            {connections.map((conn, index) => (
              <motion.div 
                key={conn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-5 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col group hover:shadow-md transition-all ${
                  conn.statut === "actif" ? "bg-white border-black/[0.05]" : "bg-danger/5 border-danger/20"
                }`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full blur-xl ${
                  conn.statut === "actif" ? "bg-money-in/5" : "bg-danger/10"
                }`} />
                
                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      conn.statut === "actif" ? "bg-money-in/10 text-money-in" : "bg-danger/10 text-danger"
                    }`}>
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px] leading-none mb-1 capitalize">{conn.nom}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{conn.passerelle}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    conn.statut === "actif" ? "text-money-in bg-money-in/10" : "text-danger bg-danger/10"
                  }`}>
                    {conn.statut === "actif" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {conn.statut}
                  </div>
                </div>
                
                {conn.statut === "erreur" && (
                  <div className="relative z-10 text-xs font-medium text-danger mb-4 bg-danger/10 p-3 rounded-xl border border-danger/20 leading-snug">
                    La clé API semble invalide ou expirée. Vérifiez vos accès.
                  </div>
                )}

                <div className={`relative z-10 mt-auto pt-4 border-t flex justify-between items-center ${
                  conn.statut === "actif" ? "border-black/[0.05]" : "border-danger/10"
                }`}>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    Ajouté le {new Date(conn.created_at).toLocaleDateString()}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      if (confirm("Voulez-vous vraiment supprimer cette connexion ?")) {
                        await deleteConnection(conn.id);
                        loadConnections();
                      }
                    }}
                    className={`rounded-lg h-8 px-4 text-xs ${
                      conn.statut === "erreur" ? "bg-white text-danger border-danger/30 hover:bg-danger/10" : "hover:bg-danger/10 hover:text-danger hover:border-transparent transition-colors"
                    }`}>
                    Supprimer
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ZONE 2 : Passerelles disponibles */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold tracking-tight">Passerelles disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_GATEWAYS.map((gateway, i) => (
            <motion.div
              key={gateway.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (i * 0.02) }}
              className="bg-white rounded-[1.5rem] p-6 border border-black/[0.05] shadow-sm hover:shadow-md transition-all flex flex-col hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0 ${gateway.color}`}>
                  {gateway.name.charAt(0)}
                </div>
                <h4 className="font-bold text-[17px] tracking-tight">{gateway.name}</h4>
              </div>
              <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
                {gateway.desc}
              </p>
              <Button 
                variant="secondary"
                onClick={() => openModal(gateway.name)}
                className="w-full mt-auto h-11 bg-black/[0.03] hover:bg-black/[0.06] text-black font-semibold rounded-xl"
              >
                Connecter
              </Button>
            </motion.div>
          ))}
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
              className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10"
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

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">Clé Secrète (Secret Key)</label>
                  <input 
                    type="password" 
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={selectedGateway === "FedaPay" ? "sk_live_... ou sk_sandbox_..." : "Clé secrète"} 
                    disabled={isSubmitting}
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest disabled:opacity-50" 
                  />
                  <p className="text-xs text-muted-foreground ml-1 mt-1">
                    La clé publique n'est pas requise pour l'intégration sécurisée côté serveur.
                  </p>
                </div>
                
                <div className="bg-primary/10 text-primary p-4 rounded-2xl flex gap-3 text-sm font-medium items-start mt-2">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-snug">Réparto n'accède qu'à vos flux via cette clé. Elle sera chiffrée avec un niveau de sécurité militaire (AES-256).</p>
                </div>
                
                <Button 
                  className="w-full h-14 rounded-xl mt-4 bg-black hover:bg-black/80 text-white font-bold text-base shadow-lg shadow-black/10 transition-transform active:scale-95 disabled:opacity-70" 
                  onClick={handleConnect}
                  disabled={isSubmitting || !nom || !secretKey}
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
