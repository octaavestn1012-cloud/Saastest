"use server";

import { createClient } from "@/utils/supabase/server";
import { decryptKey } from "@/lib/encryption";
import { getFedaPayBalance } from "@/lib/fedapay";
import { getKkiapayBalance } from "@/lib/kkiapay";
import { getPawapayBalance } from "@/lib/pawapay";

export async function getLiveTotalBalance() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé" };

    let balance = 0;
    const { data: connexions } = await supabase
      .from("connexions")
      .select("cle_chiffree, passerelle")
      .eq("user_id", user.id)
      .eq("statut", "actif");

    if (connexions && connexions.length > 0) {
      for (const conn of connexions) {
        if (conn.cle_chiffree) {
          const decryptedKey = decryptKey(conn.cle_chiffree);
          try {
            if (conn.passerelle.toLowerCase() === "fedapay") {
              balance += await getFedaPayBalance(decryptedKey);
            } else if (conn.passerelle.toLowerCase() === "kkiapay") {
              const keysObj = JSON.parse(decryptedKey);
              balance += await getKkiapayBalance(keysObj);
            } else if (conn.passerelle.toLowerCase() === "pawapay") {
              balance += await getPawapayBalance(decryptedKey);
            }
          } catch (e) {
            console.error(`Impossible de récupérer le solde pour ${conn.passerelle}:`, e);
          }
        }
      }
    }
    return { success: true, balance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDashboardMetrics() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé" };

    // 1. Récupérer le solde de toutes les passerelles connectées
    const balRes = await getLiveTotalBalance();
    let balance = balRes.balance || 0;


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
