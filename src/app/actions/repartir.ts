"use server";

import { createClient } from "@/utils/supabase/server";
import { processPayoutsForUser } from "@/lib/payout-engine";
import { revalidatePath } from "next/cache";

export async function executeRepartitionAction(amountFcfa: number) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Non autorisé");
    }

    // On déclenche le moteur de répartition manuel
    // "manuel" cherchera une règle avec déclencheur "manuel"
    // S'il n'y en a pas, on pourrait retomber sur "a_chaque_entree"
    let result = await processPayoutsForUser(user.id, amountFcfa, "manuel");

    if (!result.success && result.error?.includes("Aucune règle active")) {
      // S'il n'y a pas de règle "manuel", on essaie la règle principale
      result = await processPayoutsForUser(user.id, amountFcfa, "a_chaque_entree");
    }

    if (!result.success) {
      throw new Error(result.error);
    }

    revalidatePath("/dashboard");
    revalidatePath("/historique");

    // result.finalStatus = reussi | partiel | echoue
    return { success: true, status: result.finalStatus === "reussi" ? "completed" : "partially_failed" };
  } catch (error: any) {
    console.error("Execute error:", error);
    throw new Error(error.message || "Erreur lors de l'exécution");
  }
}
