import { getDashboardMetrics } from "@/app/actions/dashboard";
import { getRegles } from "@/app/actions/regles";
import { RepartirClient } from "@/components/features/repartir/RepartirClient";

export const dynamic = "force-dynamic";

export default async function RepartirPage() {
  const { data: metrics } = await getDashboardMetrics();
  const { data: rules } = await getRegles();

  const balance = metrics?.balance || 0;
  
  // Chercher la règle avec déclencheur "manuel"
  let ruleToUse = rules?.find((r: any) => r.actif && r.declencheur === "manuel");
  
  // Sinon, fallback sur la première règle "à chaque entrée"
  if (!ruleToUse) {
    ruleToUse = rules?.find((r: any) => r.actif && r.declencheur === "a_chaque_entree");
  }

  return (
    <div className="pb-20 sm:pb-8">
      <RepartirClient balance={balance} rule={ruleToUse} />
    </div>
  );
}
