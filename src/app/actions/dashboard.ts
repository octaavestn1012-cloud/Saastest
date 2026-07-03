"use server";

import { createClient } from "@/utils/supabase/server";
import { decryptKey } from "@/lib/encryption";
import { getFedaPayBalance } from "@/lib/fedapay";

export async function getDashboardMetrics() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé" };

    // 1. Récupérer le solde depuis FedaPay
    let balance = 0;
    const { data: conn } = await supabase
      .from("connexions")
      .select("cle_chiffree")
      .eq("user_id", user.id)
      .eq("passerelle", "FedaPay")
      .eq("statut", "actif")
      .single();

    if (conn && conn.cle_chiffree) {
      const secretKey = decryptKey(conn.cle_chiffree);
      try {
        balance = await getFedaPayBalance(secretKey);
      } catch (e) {
        console.error("Impossible de récupérer le solde FedaPay:", e);
      }
    }

    // 2. Calculer le total réparti (somme des montants des exécutions réussies ou partielles)
    // On somme les montant_total des executions
    const { data: executions } = await supabase
      .from("executions")
      .select("montant_total")
      .eq("user_id", user.id)
      .in("statut", ["reussi", "partiel"]);

    let totalDistributed = 0;
    if (executions) {
      totalDistributed = executions.reduce((sum, exec) => sum + (Number(exec.montant_total) || 0), 0);
    }

    // 3. Récupérer les dernières transactions (entrées)
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date_reception", { ascending: false })
      .limit(5);

    // On calcule la réserve (c'est une valeur illustrative basée sur les distributions, ou juste la balance actuelle)
    // Pour l'instant on peut dire que la réserve c'est le solde actuel sur FedaPay
    const reserve = balance;

    return { 
      data: {
        balance,
        totalDistributed,
        reserve,
        transactions: transactions || []
      } 
    };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}
