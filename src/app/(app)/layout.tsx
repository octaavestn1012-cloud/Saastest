import { AppShell } from "@/components/layout/AppShell";
import { PageTransition } from "@/components/shared/PageTransition";
import { MigrationProvider } from "@/components/providers/MigrationProvider";
import { UserProvider } from "@/context/UserContext";
import { RepartitionProvider } from "@/context/RepartitionContext";
import { ReactNode } from "react";
import { Bell } from "lucide-react";
import { GreetingHeader } from "@/components/shared/GreetingHeader";
import { UserDropdown } from "@/components/shared/UserDropdown";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TimezoneUpdater } from "@/components/TimezoneUpdater";

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
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from('profiles').select('nom').eq('id', user.id).single();
  const userEmail = user.email || "";
  const dbName = profile?.nom && profile.nom !== "Utilisateur" ? profile.nom : null;
  const baseName = dbName || user.user_metadata?.full_name || userEmail.split("@")[0];
  const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  return (
    <UserProvider>
      <RepartitionProvider>
        <MigrationProvider>
          <TimezoneUpdater />
          <AppShell userName={formattedName} userEmail={userEmail}>
            <header className="hidden md:flex justify-between items-center mb-8">
              <GreetingHeader formattedName={formattedName} />
              
              <div className="flex items-center gap-4 ml-auto">
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
      </RepartitionProvider>
    </UserProvider>
  );
}
