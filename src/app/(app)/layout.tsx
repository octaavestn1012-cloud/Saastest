import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/shared/PageTransition";
import { MigrationProvider } from "@/components/providers/MigrationProvider";
import { ReactNode } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { UserDropdown } from "@/components/shared/UserDropdown";

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
            
            <div className="hidden sm:block">
              <UserDropdown userName={userName} isMobile={false} />
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
