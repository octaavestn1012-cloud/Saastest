"use client";

import { useState } from "react";
import { forceGodModePlan } from "@/app/actions/admin";
import { Loader2, ShieldAlert } from "lucide-react";

export function AdminGodMode({ currentPlan }: { currentPlan: string }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleForcePlan = async (plan: "gratuit" | "pro" | "business") => {
    setLoadingPlan(plan);
    const res = await forceGodModePlan(plan);
    if (res.success) {
      window.location.reload(); // Recharger pour appliquer le plan
    } else {
      alert("Erreur: " + res.error);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="mt-12 bg-black text-white p-6 rounded-[2rem] border-2 border-red-500/30 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <ShieldAlert className="w-32 h-32" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h3 className="font-black text-xl text-red-500 tracking-wider">GOD MODE (DÉVELOPPEUR)</h3>
        </div>
        <p className="text-white/60 text-sm font-medium mb-6 max-w-lg">
          Cette section n'est visible que par vous (<span className="text-white">octaavestn1012@gmail.com</span>). Elle vous permet de changer instantanément votre abonnement pour faire des tests en situation réelle sans payer.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => handleForcePlan("gratuit")}
            disabled={loadingPlan !== null}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
              ${currentPlan === "gratuit" ? "bg-white/20 text-white cursor-default" : "bg-white/5 hover:bg-white/10 text-white"}`}
          >
            {loadingPlan === "gratuit" && <Loader2 className="w-4 h-4 animate-spin" />}
            Forcer Gratuit
          </button>
          
          <button 
            onClick={() => handleForcePlan("pro")}
            disabled={loadingPlan !== null}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
              ${currentPlan === "pro" ? "bg-blue-600 cursor-default" : "bg-blue-600/30 hover:bg-blue-600/50 text-blue-200"}`}
          >
            {loadingPlan === "pro" && <Loader2 className="w-4 h-4 animate-spin" />}
            Forcer PRO
          </button>
          
          <button 
            onClick={() => handleForcePlan("business")}
            disabled={loadingPlan !== null}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2
              ${currentPlan === "business" ? "bg-amber-600 cursor-default" : "bg-amber-600/30 hover:bg-amber-600/50 text-amber-200"}`}
          >
            {loadingPlan === "business" && <Loader2 className="w-4 h-4 animate-spin" />}
            Forcer BUSINESS
          </button>
        </div>
      </div>
    </div>
  );
}
