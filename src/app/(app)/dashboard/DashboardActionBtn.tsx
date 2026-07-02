"use client";

import { Button } from "@/components/ui/button";
import { useRepartition } from "@/context/RepartitionContext";

export function DashboardActionBtn() {
  const { openModal } = useRepartition();

  return (
    <Button 
      onClick={() => openModal()}
      className="bg-black text-white hover:bg-black/80 rounded-[1.5rem] px-8 h-14 font-semibold shadow-xl shadow-black/10 transition-transform active:scale-95"
    >
      Lancer la répartition
    </Button>
  );
}
