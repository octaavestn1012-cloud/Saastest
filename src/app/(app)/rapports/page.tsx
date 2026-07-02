import { ReportsDashboard } from "@/components/features/rapports/ReportsDashboard";

export default function RapportsPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Rapports</h1>
          <p className="text-muted-foreground font-medium text-lg">Ta vue d'ensemble, période par période.</p>
        </div>
        
        <ReportsDashboard />
      </div>
    </div>
  );
}
