"use server";

import { createClient } from "@/utils/supabase/server";

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
          montant,
          statut,
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
