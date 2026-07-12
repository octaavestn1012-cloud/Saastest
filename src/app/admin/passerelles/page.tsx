"use client";

import { useEffect, useState } from "react";
import { getGlobalGatewaysStatus, toggleGlobalGateway } from "@/app/actions/admin";
import { Key, ArrowLeft, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

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

export default function AdminPasserellesPage() {
  const [loading, setLoading] = useState(true);
  const [globalGateways, setGlobalGateways] = useState<any>({});
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const res = await getGlobalGatewaysStatus();
      if (res?.success) {
        setGlobalGateways(res.data || {});
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleToggle = async (gatewayName: string, currentStatus: boolean) => {
    const gwKey = gatewayName.toLowerCase();
    setToggling(gwKey);
    const newStatus = !currentStatus;
    
    // Optimistic update
    setGlobalGateways((prev: any) => ({ ...prev, [gwKey]: newStatus }));
    
    const res = await toggleGlobalGateway(gwKey, newStatus);
    
    if (!res?.success) {
      // Revert if error
      setGlobalGateways((prev: any) => ({ ...prev, [gwKey]: currentStatus }));
      alert("Erreur lors de la mise à jour");
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-black/5 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-black/60" />
        </Link>
        <div>
          <h2 className="text-3xl font-black text-black flex items-center gap-3 tracking-tight">
            <Key className="w-8 h-8 text-amber-500" />
            Gestion des Passerelles
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Désactivez globalement une API. Les clients verront "Indisponible" et l'argent sera dérouté.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_GATEWAYS.map((gateway, i) => {
          const gwKey = gateway.name.toLowerCase();
          const isActive = globalGateways[gwKey] ?? true;
          const isWorking = toggling === gwKey;

          return (
            <motion.div
              key={gateway.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-3xl p-6 border shadow-sm transition-all flex flex-col relative overflow-hidden ${
                isActive ? "border-black/[0.05]" : "border-red-200 bg-red-50/30"
              }`}
            >
              {/* STATUS INDICATOR (TOP RIGHT) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-black/5 shadow-sm">
                <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {isActive ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {isActive ? 'En ligne' : 'Coupé'}
                </span>
                {isWorking ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black/40 ml-2" />
                ) : (
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggle(gateway.name, isActive)}
                    className="ml-2 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-200"
                  />
                )}
              </div>

              {/* CONTENT */}
              <div className="flex items-center gap-4 mb-4 mt-2 relative z-10">
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0 ${
                  isActive ? gateway.color : "bg-gray-400 grayscale"
                } transition-all`}>
                  {gateway.name.charAt(0)}
                </div>
                <h4 className="font-black text-xl tracking-tight text-black">{gateway.name}</h4>
              </div>
              <p className="text-[14px] text-muted-foreground/80 leading-relaxed font-medium relative z-10">
                {gateway.desc}
              </p>
              
              {/* WARNING MESSAGE IF INACTIVE */}
              {!isActive && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-start gap-2 relative z-10">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Passerelle ignorée par le moteur. Les clients voient "Maintenance".</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
