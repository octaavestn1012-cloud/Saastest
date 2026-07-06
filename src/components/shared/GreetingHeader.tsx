"use client";

import { usePathname } from "next/navigation";

export function GreetingHeader({ formattedName }: { formattedName: string }) {
  const pathname = usePathname();
  
  if (pathname !== "/") {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Bonjour {formattedName} 👋</h1>
      <p className="text-muted-foreground mt-1 text-sm">Prêt à répartir tes revenus ?</p>
    </div>
  );
}
