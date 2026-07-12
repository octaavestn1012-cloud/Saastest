import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { LogOut, ShieldAlert } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Vérification CÔTÉ SERVEUR du rôle admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    // Si pas admin, on le dégage vers le dashboard classique
    redirect("/dashboard");
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F7] font-sans flex flex-col">
      {/* Navbar Admin (Distincte visuellement) */}
      <header className="bg-[#111] text-white py-4 px-6 sticky top-0 z-50 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Réparto</h1>
            <p className="text-[11px] text-white/50 uppercase tracking-widest font-black">Super Admin</p>
          </div>
        </div>
        
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          Quitter l'Admin
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
