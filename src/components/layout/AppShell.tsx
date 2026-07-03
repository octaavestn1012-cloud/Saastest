import { Sidebar } from "./Sidebar";
import { BottomTabs } from "./BottomTabs";
import { RepartirFab } from "./RepartirFab";
import { ReactNode } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { UserDropdown } from "@/components/shared/UserDropdown";

interface AppShellProps {
  children: ReactNode;
  userName: string;
  userEmail: string;
}

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto pb-16 lg:pb-0 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center px-4 py-3 bg-white border-b border-black/[0.05] sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
              R
            </div>
            <span className="text-lg font-bold tracking-tight text-black">Réparto</span>
          </Link>
          
          <div className="flex items-center gap-4">
             <button className="relative text-muted-foreground hover:text-black transition-colors">
               <Bell className="w-5 h-5" />
               <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger border-2 border-white rounded-full" />
             </button>
             <UserDropdown userName={userName} userEmail={userEmail} isMobile={true} />
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <BottomTabs />
      <RepartirFab />
    </div>
  );
}
