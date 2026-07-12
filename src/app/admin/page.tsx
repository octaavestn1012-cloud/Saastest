"use client";

import { useEffect, useState } from "react";
import { getAdminKPIs, getAdminUsers, getAdminFailedLogs, getGlobalGatewaysStatus, toggleGlobalGateway } from "@/app/actions/admin";
import { Loader2, TrendingUp, Users, Wallet, AlertOctagon, Activity, Search, BarChart3, Key, Settings2, Target, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const [kRes, uRes, lRes] = await Promise.all([
        getAdminKPIs(),
        getAdminUsers(),
        getAdminFailedLogs()
      ]);
      
      if (kRes.success) setKpis(kRes.data);
      if (uRes.success) setUsers(uRes.data);
      if (lRes.success) setLogs(lRes.data);
      
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-black/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-black font-bold tracking-tight mt-4 text-lg animate-pulse">Initialisation du Centre de Commandement...</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    (u.email || "").toLowerCase().includes(search.toLowerCase()) || 
    (u.nom || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      
      {/* SECTION 1: KPIs Principaux */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-black flex items-center gap-3 tracking-tight">
            <BarChart3 className="w-8 h-8 text-primary" />
            Performance SaaS
          </h2>
          <div className="bg-green-500/10 text-green-600 font-bold px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Système Opérationnel
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KpiCard 
            title="Utilisateurs Inscrits" 
            value={kpis?.totalUsers?.toString() || "0"} 
            subtitle="Comptes créés sur la plateforme"
            icon={<Users className="w-6 h-6 text-orange-500" />}
            gradient="from-orange-50 to-white"
          />
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-6 border border-black/5 shadow-sm flex flex-col justify-center">
            <h3 className="font-bold text-black/60 text-xs tracking-wider uppercase mb-4">Répartition des Forfaits</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-black/60">Gratuit</span>
                <span className="font-black text-black">{kpis?.gratuitCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-primary">Pro</span>
                <span className="font-black text-black">{kpis?.proCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-black">Business</span>
                <span className="font-black text-black">{kpis?.businessCount || 0}</span>
              </div>
            </div>
          </div>
          <KpiCard 
            title="MRR (Revenu Mensuel)" 
            value={`${kpis?.mrr?.toLocaleString("fr-FR") || 0} F`} 
            subtitle="Abonnements Pro & Business"
            icon={<Activity className="w-6 h-6 text-blue-500" />}
            gradient="from-blue-50 to-white"
          />
          <Link href="/admin/commissions" className="block transition-transform hover:scale-[1.02]">
            <KpiCard 
              title="Commissions (Frais)" 
              value={`${kpis?.totalCommissionsThisMonth?.toLocaleString("fr-FR") || 0} F (Mois)`} 
              subtitle={`Total historique : ${kpis?.totalCommissionsHistory?.toLocaleString("fr-FR") || 0} F`}
              icon={<Wallet className="w-6 h-6 text-emerald-500" />}
              gradient="from-emerald-50 to-white"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Volume (Mois)" 
            value={`${kpis?.totalVolumeThisMonth?.toLocaleString("fr-FR") || 0} F`} 
            subtitle={`Total historique : ${kpis?.totalVolumeHistory?.toLocaleString("fr-FR") || 0} F`}
            icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
            gradient="from-purple-50 to-white"
          />
          <KpiCard 
            title="Taux de Succès API" 
            value={`${kpis?.successRate || 100}%`} 
            subtitle="Transactions réussies"
            icon={<Target className={`w-6 h-6 ${kpis?.successRate >= 95 ? 'text-green-500' : 'text-red-500'}`} />}
            gradient={kpis?.successRate >= 95 ? "from-green-50 to-white" : "from-red-50 to-white"}
          />
          <Link href="/admin/passerelles" className="block transition-transform hover:scale-[1.02]">
            <KpiCard 
              title="Passerelles Actives" 
              value={kpis?.activeGatewaysCount?.toString() || "0"} 
              subtitle="Gérer les clés API (Cliquez)"
              icon={<Key className="w-6 h-6 text-amber-500" />}
              gradient="from-amber-50 to-white"
            />
          </Link>
          <KpiCard 
            title="Règles de Répartition" 
            value={kpis?.activeRulesCount?.toString() || "0"} 
            subtitle="Automatisations"
            icon={<Settings2 className="w-6 h-6 text-slate-500" />}
            gradient="from-slate-50 to-white"
          />
        </div>
      </section>

      {/* SECTION 2: Monitoring / Santé */}
      <section>
        <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-red-600">
          <AlertOctagon className="w-6 h-6" />
          Radar d'Anomalies (Logs)
        </h2>
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center bg-green-50/30">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Activity className="w-8 h-8" />
              </div>
              <p className="text-black font-bold text-lg">Aucune anomalie détectée.</p>
              <p className="text-muted-foreground text-sm mt-1">Tous les paiements passent avec succès.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F5F7]/80 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Utilisateur (ID)</th>
                    <th className="px-6 py-5">Montant</th>
                    <th className="px-6 py-5">Destinataire</th>
                    <th className="px-6 py-5">Erreur Serveur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {log.executions?.date_execution ? new Date(log.executions.date_execution).toLocaleString("fr-FR") : "-"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-black/60 bg-gray-50 rounded-lg inline-block mt-2">
                        {log.executions?.user_id?.substring(0, 8) || "Inconnu"}
                      </td>
                      <td className="px-6 py-4 font-black tabular-nums text-black">
                        {log.montant} F
                      </td>
                      <td className="px-6 py-4 font-medium text-black">
                        {log.destinataire_libelle}
                      </td>
                      <td className="px-6 py-4 text-red-600 font-medium max-w-[200px] truncate" title={log.erreur_message || "Erreur Inconnue"}>
                        {log.erreur_message || "Erreur Inconnue"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: Utilisateurs CRM Enrichi */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-black text-black flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            CRM Clients
          </h2>
          <div className="relative w-full md:w-80">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un client..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 rounded-2xl bg-white border-black/10 py-6 text-base shadow-sm focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F5F7]/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-5">Client</th>
                  <th className="px-6 py-5">Volume Traité</th>
                  <th className="px-6 py-5">Écosystème</th>
                  <th className="px-6 py-5">Plan Actuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Aucun client trouvé correspondant à la recherche.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-lg shadow-inner">
                            {(u.nom || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-black">{u.nom || "Sans nom"}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-black tabular-nums">
                          {u.volume?.toLocaleString("fr-FR") || 0} F
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 text-xs font-medium">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Key className="w-3 h-3" /> {u.gateways || 0} passerelles
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Settings2 className="w-3 h-3" /> {u.rules || 0} règles
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                          u.plan === 'business' ? 'bg-black text-white' :
                          u.plan === 'pro' ? 'bg-primary text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, gradient }: { title: string, value: string, subtitle: string, icon: any, gradient: string }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 border border-black/5 shadow-sm flex flex-col relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md duration-300 group`}>
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="font-bold text-black/60 text-xs tracking-wider uppercase">{title}</h3>
      </div>
      <div className="text-4xl font-black text-black mb-2 tabular-nums relative z-10 tracking-tight">{value}</div>
      <p className="text-sm font-semibold text-black/40 relative z-10">{subtitle}</p>
    </div>
  );
}
