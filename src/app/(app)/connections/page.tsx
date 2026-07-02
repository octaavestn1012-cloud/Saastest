"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Plus, AlertCircle, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const openModal = (gatewayName?: string) => {
    setSelectedGateway(gatewayName || null);
    setIsModalOpen(true);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Kkiapay Connecté */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="p-5 rounded-2xl bg-white shadow-sm border border-black/[0.05] relative overflow-hidden flex flex-col group hover:shadow-md transition-all"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-money-in/5 rounded-bl-full blur-xl" />
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-money-in/10 rounded-xl flex items-center justify-center text-money-in">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] leading-none mb-1">Kkiapay Principal</h3>
                  <p className="text-xs text-muted-foreground font-mono">sk_live_...a7b2</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-money-in bg-money-in/10 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Actif
              </div>
            </div>
            
            <div className="relative z-10 mt-auto pt-4 border-t border-black/[0.05] flex justify-between items-center">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Il y a 5 min</span>
              <Button variant="outline" className="rounded-lg h-8 px-4 text-xs hover:bg-black/[0.02]">Gérer</Button>
            </div>
          </motion.div>

          {/* FedaPay Erreur */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-danger/5 shadow-sm border border-danger/20 relative overflow-hidden flex flex-col group hover:shadow-md transition-all"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-danger/10 rounded-bl-full blur-xl" />

            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center text-danger">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] leading-none mb-1 text-foreground">FedaPay Secondaire</h3>
                  <p className="text-xs text-muted-foreground font-mono">sk_live_...9f4e</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-danger bg-danger/10 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                <AlertCircle className="w-3 h-3" />
                Erreur
              </div>
            </div>
            
            <div className="relative z-10 text-xs font-medium text-danger mb-4 bg-danger/10 p-3 rounded-xl border border-danger/20 leading-snug">
              La clé API semble invalide ou expirée. Vérifiez vos accès.
            </div>

            <div className="relative z-10 mt-auto pt-4 border-t border-danger/10 flex justify-between items-center">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Hier</span>
              <Button variant="outline" className="bg-white rounded-lg h-8 px-4 text-xs text-danger border-danger/30 hover:text-danger hover:bg-danger/10">Reconnecter</Button>
            </div>
          </motion.div>
        </div>
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
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10"
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-muted-foreground hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold tracking-tight mb-6">
                Connecter {selectedGateway || "une passerelle"}
              </h3>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">Nom du compte / Libellé</label>
                  <input 
                    type="text" 
                    placeholder={`Ex: ${selectedGateway || "Ma passerelle"} Principal`} 
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">Clé Publique (Public Key)</label>
                  <input 
                    type="text" 
                    placeholder="pk_live_..." 
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-foreground ml-1">Clé Secrète (Secret Key)</label>
                  <input 
                    type="password" 
                    placeholder="sk_live_..." 
                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest" 
                  />
                </div>
                
                <div className="bg-primary/10 text-primary p-4 rounded-2xl flex gap-3 text-sm font-medium items-start mt-2">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-snug">Réparto n'accède qu'à tes flux avec ta clé. Ton argent ne passe jamais par nous.</p>
                </div>
                
                <Button 
                  className="w-full h-14 rounded-xl mt-4 bg-black hover:bg-black/80 text-white font-bold text-base shadow-lg shadow-black/10 transition-transform active:scale-95" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Connecter
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
