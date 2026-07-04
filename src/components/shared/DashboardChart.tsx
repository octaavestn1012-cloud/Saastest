"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils/format";

const data = [
  { name: "Lun", in: 4000, out: 2400 },
  { name: "Mar", in: 3000, out: 1398 },
  { name: "Mer", in: 2000, out: 9800 },
  { name: "Jeu", in: 2780, out: 3908 },
  { name: "Ven", in: 1890, out: 4800 },
  { name: "Sam", in: 2390, out: 3800 },
  { name: "Dim", in: 3490, out: 4300 },
];

export function DashboardChart() {
  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
            
            {/* Glow effects for lines */}
            <filter id="glowIn" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowOut" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }} dy={15} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }} tickFormatter={(value) => `${value / 1000}k`} />
          <Tooltip 
            contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)", color: "white" }}
            itemStyle={{ fontWeight: 700 }}
            formatter={(value: any) => [formatAmount(value), "Montant"]}
          />
          <Area type="monotone" dataKey="in" name="Entrées" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" filter="url(#glowIn)" />
          <Area type="monotone" dataKey="out" name="Réparti" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" filter="url(#glowOut)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
