import { HistoryDashboard } from "@/components/features/historique/HistoryDashboard";
import { getHistorique } from "@/app/actions/historique";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const { data, plan } = await getHistorique();
  
  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Historique</h1>
          <p className="text-muted-foreground font-medium text-lg">Toutes tes répartitions.</p>
        </div>
        
        <HistoryDashboard initialData={data || []} plan={plan || "gratuit"} />
      </div>
    </div>
  );
}
