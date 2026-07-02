"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Download } from "lucide-react";
import { Amount } from "@/components/shared/Amount";

// Couleurs utilisées pour les destinataires (générées harmonieusement)
const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5'];

export function BaseReport({ period }: { period: string }) {
  // Données fictives adaptatives (pour l'exemple)
  const totalIn = period === "last_month" ? 1200000 : 850000;
  const totalOut = period === "last_month" ? 950000 : 640000;
  const totalFees = period === "last_month" ? 7600 : 5120;

  const distributionData = [
    { name: "Épargne", value: period === "last_month" ? 400000 : 320000 },
    { name: "Maman", value: period === "last_month" ? 250000 : 150000 },
    { name: "Dépenses courantes", value: period === "last_month" ? 200000 : 100000 },
    { name: "Loisirs", value: period === "last_month" ? 100000 : 70000 },
  ];

  return (
    <div className="space-y-8">
      {/* 3 Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total entré</p>
          <div className="text-3xl font-black tabular-nums tracking-tight text-money-in">
            <Amount value={totalIn} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total réparti</p>
          <div className="text-3xl font-black tabular-nums tracking-tight text-black">
            <Amount value={totalOut} />
          </div>
        </div>
        
        <div className="bg-[#FFF8E7] p-6 rounded-3xl border border-[#FDE1A9]/30 shadow-sm">
          <p className="text-[13px] font-bold text-[#B9811C] uppercase tracking-widest mb-2">Frais Réparto cumulés</p>
          <div className="text-3xl font-black tabular-nums tracking-tight text-[#A87211]">
            <Amount value={totalFees} />
          </div>
        </div>
      </div>

      {/* Répartition par destinataire */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold">Répartition par destinataire</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">Où est allé l'argent sur cette période.</p>
          </div>
          <button className="flex items-center gap-2 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-black px-4 py-2.5 rounded-xl font-bold text-[14px] transition-colors shrink-0">
            <Download className="w-4 h-4" />
            Exporter le rapport
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Pie Chart */}
          <div className="w-full md:w-[300px] h-[300px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`, 'Montant']}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Liste Détaillée */}
          <div className="flex-1 w-full space-y-4">
            {distributionData.map((item, index) => {
              const percent = Math.round((item.value / totalOut) * 100);
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-[#FDFDFD] rounded-2xl border border-black/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="font-bold text-[15px]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[15px] tabular-nums"><Amount value={item.value} /></div>
                    <div className="text-[12px] font-bold text-muted-foreground">{percent}% du total</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
