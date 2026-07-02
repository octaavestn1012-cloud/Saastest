"use client";

import { Lock, TrendingUp, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Amount } from "@/components/shared/Amount";

// CHANGER CETTE VARIABLE POUR TESTER LES DEUX ÉTATS
const isPremium = false;

const evolutionData = [
  { month: 'Jan', entrees: 400000, repartitions: 240000 },
  { month: 'Fév', entrees: 300000, repartitions: 139800 },
  { month: 'Mar', entrees: 200000, repartitions: 980000 },
  { month: 'Avr', entrees: 278000, repartitions: 390800 },
  { month: 'Mai', entrees: 189000, repartitions: 480000 },
  { month: 'Juin', entrees: 239000, repartitions: 380000 },
  { month: 'Juil', entrees: 349000, repartitions: 430000 },
];

export function AdvancedReports() {
  return (
    <div className="relative mt-12">
      <h2 className="text-2xl font-black mb-6">Rapports avancés</h2>

      {/* OVERLAY DE VERROUILLAGE (Si pas premium) */}
      {!isPremium && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-black/5 mt-14">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-black/10 text-center max-w-sm mx-4">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black mb-2">Réservé au plan Empire</h3>
            <p className="text-sm font-medium text-muted-foreground mb-6">
              Débloquez l'historique complet, les courbes d'évolution et les exports comptables détaillés.
            </p>
            <button className="w-full h-12 bg-black hover:bg-black/80 text-white rounded-xl font-bold transition-colors">
              Voir les plans
            </button>
          </div>
        </div>
      )}

      {/* CONTENU AVANCÉ */}
      <div className={`space-y-6 ${!isPremium ? "opacity-40 pointer-events-none select-none" : ""}`}>
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold">Évolution sur 6 mois</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">Comparatif Entrées vs Répartitions.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-money-in"></div>
                 <span className="text-sm font-bold">Entrées</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-black"></div>
                 <span className="text-sm font-bold">Répartitions</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReparts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000000" strokeOpacity={0.05} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#999' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#999' }} tickFormatter={(val) => `${val / 1000}k`} />
                <RechartsTooltip 
                  formatter={(value: number) => [`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`, '']}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="entrees" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrees)" />
                <Area type="monotone" dataKey="repartitions" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorReparts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm flex justify-between items-center">
             <div>
               <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Croissance des répartitions</p>
               <h4 className="text-2xl font-black">+ 12,4 %</h4>
               <p className="text-sm font-medium text-muted-foreground mt-1">Par rapport au mois dernier</p>
             </div>
             <div className="w-12 h-12 bg-money-in/10 text-money-in rounded-full flex items-center justify-center">
               <TrendingUp className="w-6 h-6" />
             </div>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm flex justify-between items-center">
             <div>
               <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Export Comptable Complet</p>
               <p className="text-sm font-medium text-muted-foreground mt-1 mb-4">Télécharge toutes les transactions au format CSV.</p>
               <button className="flex items-center gap-2 bg-black hover:bg-black/80 text-white px-4 py-2 rounded-xl font-bold text-[13px] transition-colors">
                 <Download className="w-4 h-4" />
                 Générer le CSV
               </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
