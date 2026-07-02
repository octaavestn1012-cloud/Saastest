import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/shared/PageTransition";
import { MigrationProvider } from "@/components/providers/MigrationProvider";
import { ReactNode } from "react";
import { Bell, ChevronDown } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  // TODO: Remplacer par les vraies données utilisateur
  const userName = "Octave";

  return (
    <MigrationProvider>
      <AppShell>
        <header className="hidden md:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bonjour {userName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-sm">Prêt à répartir tes revenus ?</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 relative text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
            </button>
            
            <div className="hidden sm:flex items-center gap-2 p-1 pr-3 bg-muted/50 rounded-full cursor-pointer hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-money-out text-white flex items-center justify-center font-bold text-sm shrink-0">
                {userName[0]}
              </div>
              <span className="text-sm font-medium">{userName}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        <PageTransition>
          {children}
        </PageTransition>
      </AppShell>
    </MigrationProvider>
  );
}
