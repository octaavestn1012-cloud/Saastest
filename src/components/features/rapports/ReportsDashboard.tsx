"use client";

import { useState } from "react";
import { BaseReport } from "./BaseReport";
import { AdvancedReports } from "./AdvancedReports";

export function ReportsDashboard() {
  const [period, setPeriod] = useState("this_month");

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* SÉLECTEUR DE PÉRIODE */}
      <div className="bg-white p-2 rounded-2xl border border-black/[0.05] shadow-sm inline-flex items-center">
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-[#F5F5F7] px-4 py-3 rounded-xl font-medium outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto text-sm cursor-pointer"
        >
          <option value="this_month">Ce mois</option>
          <option value="last_month">Mois dernier</option>
          <option value="custom">Période personnalisée</option>
        </select>
      </div>

      {/* RAPPORT DE BASE */}
      <BaseReport period={period} />

      {/* RAPPORTS AVANCÉS (Premium) */}
      <AdvancedReports />
    </div>
  );
}
