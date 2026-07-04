"use server";

import { createClient } from "@/utils/supabase/server";
import { decryptKey } from "@/lib/encryption";
import { createAndSendPayout } from "@/lib/fedapay";
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
        regles ( nom ),
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

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function retryPayoutLigne(ligneId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

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

    // 2. Fetch FedaPay Key
    const { data: conn } = await supabase.from("connexions")
      .select("*").eq("user_id", user.id).eq("passerelle", "FedaPay").eq("statut", "actif").single();

    if (!conn || !conn.cle_chiffree) throw new Error("Aucune connexion FedaPay active");
    const secretKey = decryptKey(conn.cle_chiffree);

    // 3. Retry Payout
    const payoutRes = await createAndSendPayout(
      secretKey, 
      ligne.montant, 
      ligne.destinataire_reseau, 
      ligne.destinataire_numero, 
      ligne.destinataire_libelle
    );

    const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
    const ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
    const ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";

    // 4. Update ligne
    // @ts-ignore
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseServiceKey);

    await supabaseAdmin.from("execution_lignes").update({
      statut: ligneStatut,
      reference_transaction: ref,
      erreur_message: fedapayStatus === "failed" ? "Échec lors de la relance" : null
    }).eq("id", ligneId);

    // 5. Update execution status
    const { data: allLignes } = await supabaseAdmin.from("execution_lignes").select("statut").eq("execution_id", ligne.executions.id);
    if (allLignes) {
      const hasFailed = allLignes.some((r: any) => r.statut === "echoue");
      const hasSuccess = allLignes.some((r: any) => r.statut === "reussi" || r.statut === "en_cours");
      const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : allLignes.every((r: any) => r.statut === "reussi") ? "reussi" : "en_cours";
      // @ts-ignore
      await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", ligne.executions.id);
    }

    revalidatePath("/historique");
    return { success: true, ligneStatut };
  } catch (error: any) {
    console.error("Retry error:", error);
    return { success: false, error: error.message };
  }
}
