"use server";

import { createClient } from "@/utils/supabase/server";
import { decryptKey } from "@/lib/encryption";
import { createAndSendPayout, getFedaPayBalance } from "@/lib/fedapay";
import { getKkiapayBalance, createAndSendKkiapayPayout } from "@/lib/kkiapay";
import { getPawapayBalance, createAndSendPawapayPayout } from "@/lib/pawapay";
import { revalidatePath } from "next/cache";

export async function getHistorique() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé" };

    const { data, error } = await supabase
      .from("executions")
      .select(`
        *,
        regles ( nom, declencheur ),
        execution_lignes (
          id,
          destinataire_libelle,
          destinataire_numero,
          destinataire_reseau,
          montant,
          statut,
          erreur_message,
          reference_transaction,
          est_commission
        )
      `)
      .eq("user_id", user.id)
      .order("date_execution", { ascending: false });

    if (error) {
      console.error(error);
      return { error: "Erreur lors de la récupération de l'historique" };
    }

    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    const plan = profile?.plan || "gratuit";

    return { data, plan };
  } catch (error: any) {
    return { error: error.message };
  }
}



export async function retryPayoutLigne(ligneId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch ligne
    const { data: ligne, error: ligneError } = await supabase
      .from("execution_lignes")
      .select("*, executions(user_id, id, statut)")
      .eq("id", ligneId)
      .single();

    if (ligneError || !ligne) throw new Error("Ligne introuvable");
    // @ts-ignore
    if (ligne.executions.user_id !== user.id) throw new Error("Non autorisé");
    if (ligne.statut !== "echoue") throw new Error("Seules les lignes échouées peuvent être relancées");
    if (!ligne.destinataire_numero || !ligne.destinataire_reseau) throw new Error("Informations du destinataire manquantes");

    const { retryExecutionLigne } = await import("@/lib/payout-engine");
    const result = await retryExecutionLigne(ligneId);
    
    if (!result.success) {
      throw new Error(result.error || "Échec de la relance");
    }

    // 4. Update execution status
    const { data: allLignes } = await supabaseAdmin.from("execution_lignes").select("statut").eq("execution_id", ligne.executions.id);
    if (allLignes) {
      const hasFailed = allLignes.some((r: any) => r.statut === "echoue");
      const hasSuccess = allLignes.some((r: any) => r.statut === "reussi" || r.statut === "en_cours");
      const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : allLignes.every((r: any) => r.statut === "reussi") ? "reussi" : "en_cours";
      // @ts-ignore
      await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", ligne.executions.id);
    }

    revalidatePath("/historique");
    return { success: true, ligneStatut: result.status };
  } catch (error: any) {
    console.error("Retry error:", error);
    return { success: false, error: error.message };
  }
}
