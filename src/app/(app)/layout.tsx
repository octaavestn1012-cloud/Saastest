import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/shared/PageTransition";
import { MigrationProvider } from "@/components/providers/MigrationProvider";
import { ReactNode } from "react";
import { Bell } from "lucide-react";
import { UserDropdown } from "@/components/shared/UserDropdown";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const userEmail = user.email || "";
  const baseName = user.user_metadata?.full_name || userEmail.split("@")[0];
  const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  return (
    <MigrationProvider>
      <AppShell userName={formattedName} userEmail={userEmail}>
        <header className="hidden md:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bonjour {formattedName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-sm">Prêt à répartir tes revenus ?</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 relative text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
            </button>
            
            <div className="hidden sm:block">
              <UserDropdown userName={formattedName} userEmail={userEmail} isMobile={false} />
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
