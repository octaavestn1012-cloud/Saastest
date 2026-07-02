import { Sidebar } from "./Sidebar";
import { BottomTabs } from "./BottomTabs";
import { RepartirFab } from "./RepartirFab";
import { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <BottomTabs />
      <RepartirFab />
    </div>
  );
}
