import { StatCard } from "@/components/shared/StatCard";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserExecutions } from "@/lib/data/executions";
import { getUserRules } from "@/lib/data/rules";
import { Amount } from "@/components/shared/Amount";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardActionBtn } from "./DashboardActionBtn";
import { ClientNextExecution } from "./ClientNextExecution";

export const dynamic = "force-dynamic";

// Mocks temporaires pour les dernières entrées
const mockEntries = [
  { id: "ent_1", source: "FedaPay", amount: 45000, date: "2026-07-03T14:30:00" },
  { id: "ent_2", source: "Kkiapay", amount: 120000, date: "2026-07-02T09:15:00" },
  { id: "ent_3", source: "CinetPay", amount: 85000, date: "2026-07-01T16:45:00" },
  { id: "ent_4", source: "Wave", amount: 25000, date: "2026-06-29T11:20:00" },
  { id: "ent_5", source: "FedaPay", amount: 75000, date: "2026-06-28T10:00:00" },
];

export default async function DashboardPage() {
  const userId = "usr_123";
  const executions = await getUserExecutions(userId);
  const rules = await getUserRules(userId);

  const totalReparti = executions.reduce((acc, exec) => acc + exec.totalAmountFcfa, 0);
  const totalEntrees = 350000;
  const disponible = totalEntrees - totalReparti;
  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div className="flex flex-col gap-6">
        
        {/* Grande Carte Principale (Horizontale) */}
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col justify-center items-center group relative overflow-hidden text-center">
          <div className="relative z-10 w-full flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wider">Disponible à répartir</h3>
            </div>
            <div className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-black mt-2 mb-10">
              <Amount value={disponible} />
            </div>
            
            {/* On passe l'action dans un composant Client car le dashboard est Server */}
            <DashboardActionBtn />
          </div>
          
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[60%] h-[80%] bg-gradient-to-t from-primary/5 to-transparent pointer-events-none rounded-full blur-3xl opacity-50 transition-transform duration-700 group-hover:scale-105" />
        </div>

        {/* Petites Cartes Alignées Horizontalement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Entrées du mois"
            amount={totalEntrees}
            icon={<ArrowDownLeft className="w-6 h-6" />}
            iconBgColorClass="bg-money-in/10 text-money-in"
            amountVariant="in"
          />
          
          <StatCard
            title="Réparti ce mois"
            amount={totalReparti}
            icon={<ArrowUpRight className="w-6 h-6" />}
            iconBgColorClass="bg-primary/10 text-primary"
            amountVariant="out"
          />

          <StatCard
            title="Prochaine répartition"
            customValueNode={<ClientNextExecution />}
            icon={<CalendarClock className="w-6 h-6" />}
            iconBgColorClass="bg-accent-decorative/10 text-accent-decorative"
          />
        </div>

        {/* BLOCS INFÉRIEURS : Entrées vs Répartitions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* BLOC A: Dernières Entrées */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col h-full">
            <h3 className="text-lg font-bold mb-6 text-foreground">Dernières entrées</h3>
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {mockEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 hover:bg-black/[0.02] rounded-xl transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{entry.source}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="font-bold tabular-nums text-money-in">
                      + <Amount value={entry.amount} variant="in" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 mt-4 border-t border-black/[0.05]">
                <Link href="/rapports" className="text-sm font-semibold text-primary hover:underline flex items-center justify-center">
                  Voir tout l'historique →
                </Link>
              </div>
            </div>
          </div>

          {/* BLOC B: Répartitions récentes */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] flex flex-col h-full">
            <h3 className="text-lg font-bold mb-6 text-foreground">Répartitions récentes</h3>
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {executions.slice(0, 5).map((exec) => {
                  const rule = rules.find(r => r.id === exec.ruleId);
                  return (
                    <Link key={exec.id} href={`/historique/${exec.id}`} className="block">
                      <div className="flex justify-between items-center p-3 hover:bg-black/[0.02] rounded-xl transition-colors cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{rule?.name || "Règle supprimée"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(exec.confirmedAt || Date.now()).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="font-bold tabular-nums text-primary">
                            <Amount value={exec.totalAmountFcfa} variant="out" />
                          </div>
                          <StatusBadge status={exec.status} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
