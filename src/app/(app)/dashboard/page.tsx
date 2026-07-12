import { StatCard } from "@/components/shared/StatCard";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Amount } from "@/components/shared/Amount";
import { DashboardChart } from "@/components/shared/DashboardChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardActionBtn } from "./DashboardActionBtn";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { getHistorique } from "@/app/actions/historique";
import { RecentExecutionsList } from "@/components/features/dashboard/RecentExecutionsList";
import { formatDateToBenin } from "@/lib/utils/format";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('nom').eq('id', user?.id).single();
  const userName = profile?.nom && profile.nom !== "Utilisateur" ? profile.nom : user?.email?.split('@')[0] || "Utilisateur";

  const { data: metrics } = await getDashboardMetrics();
  const { data: historique } = await getHistorique();
  
  const balance = metrics?.balance || 0;
  const totalReparti = metrics?.totalDistributed || 0;
  const latestTransactions = metrics?.transactions || [];
  const executions = historique || [];
  const nextRepartition = metrics?.nextRepartition || { text: "Aucune règle", ruleName: "" };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div className="flex flex-col gap-6">
        
        {/* Grande Carte Principale (Horizontale) */}
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col md:flex-row justify-between items-center group relative overflow-hidden gap-8">
          <div className="relative z-10 w-full md:w-1/2 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">Solde disponible</h3>
            </div>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-black mt-2 mb-8">
              <Amount value={balance} />
            </div>
            
            <DashboardActionBtn />
          </div>
          
          <div className="w-full md:w-1/2 h-[200px] sm:h-[250px] relative z-10">
            <DashboardChart />
          </div>
          
          <div className="absolute -bottom-20 -right-10 w-[60%] h-[80%] bg-gradient-to-t from-primary/5 to-transparent pointer-events-none rounded-full blur-3xl opacity-50 transition-transform duration-700 group-hover:scale-105" />
        </div>

        {/* Limites du plan Gratuit */}
        {metrics?.plan === "gratuit" && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col md:flex-row gap-8 items-center">
            <div className="md:w-1/3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold">Plan Gratuit</span>
                <Link href="/billing" className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase hover:bg-primary/20 transition-colors">
                  Passer Pro
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">Vous êtes limité à 20 répartitions et 500 000 FCFA par mois.</p>
            </div>
            
            <div className="md:w-2/3 flex flex-col sm:flex-row gap-6 w-full">
              {/* Jauge Répartitions */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Répartitions</span>
                  <span>{metrics.monthlyExecutionsCount || 0} / 20</span>
                </div>
                <div className="h-3 w-full bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${((metrics.monthlyExecutionsCount || 0) >= 20) ? 'bg-danger' : 'bg-black'}`}
                    style={{ width: `${Math.min(100, ((metrics.monthlyExecutionsCount || 0) / 20) * 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Jauge Volume */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Volume FCFA</span>
                  <span>{((metrics.monthlyVolume || 0) / 1000).toFixed(0)}k / 500k</span>
                </div>
                <div className="h-3 w-full bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${((metrics.monthlyVolume || 0) >= 500000) ? 'bg-danger' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, ((metrics.monthlyVolume || 0) / 500000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Petites Cartes Alignées Horizontalement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Entrées totales (Dispo)"
            amount={balance + totalReparti}
            deltaPercent={0}
            icon={<ArrowDownLeft className="w-6 h-6" />}
            iconBgColorClass="bg-money-in/10 text-money-in"
            amountVariant="in"
          />
          
          <StatCard
            title="Réparti au total"
            amount={totalReparti}
            deltaPercent={0}
            icon={<ArrowUpRight className="w-6 h-6" />}
            iconBgColorClass="bg-primary/10 text-primary"
            amountVariant="out"
          />

          <StatCard
            title="Prochaine répartition"
            customValueNode={
              <div className="flex flex-col mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-black">
                  {nextRepartition.text}
                </span>
                <span className="text-sm font-semibold text-black mt-1">
                  {nextRepartition.ruleName}
                </span>
                {nextRepartition.text !== "Aucune auto" && (
                  <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Répartition automatique
                  </span>
                )}
              </div>
            }
            icon={<CalendarClock className="w-6 h-6" />}
            iconBgColorClass="bg-accent-decorative/10 text-accent-decorative"
          />
        </div>

        {/* BLOCS INFÉRIEURS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* BLOC A: Dernières Entrées */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col h-full">
            <h3 className="text-lg font-bold mb-6 text-foreground">Dernières entrées</h3>
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {latestTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Aucune entrée récente enregistrée.</p>
                ) : (
                  latestTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-black/[0.02] rounded-xl transition-colors">
                      <div>
                        <p className="font-semibold text-sm">{tx.source || "FedaPay"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateToBenin(tx.date_reception)}
                        </p>
                      </div>
                      <div className="font-bold tabular-nums text-money-in">
                        + <Amount value={tx.montant} variant="in" />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-6 mt-4 border-t border-black/[0.05]">
                <Link href="/rapports" className="text-sm font-semibold text-primary hover:underline flex items-center justify-center">
                  Voir tout l'historique →
                </Link>
              </div>
            </div>
          </div>

          {/* BLOC B: Récemment Réparti (Historique complet) */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col h-full">
            <h3 className="text-lg font-bold mb-6 text-foreground">Répartitions récentes</h3>
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <RecentExecutionsList executions={executions} plan={metrics?.plan || "gratuit"} />
              </div>
              <div className="pt-6 mt-4 border-t border-black/[0.05]">
                <Link href="/historique" className="text-sm font-semibold text-primary hover:underline flex items-center justify-center">
                  Voir toutes les répartitions →
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
