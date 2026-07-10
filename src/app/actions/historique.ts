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

    // 2. Build Gateway Pool
    const { data: conns } = await supabase.from("connexions")
      .select("*").eq("user_id", user.id).eq("statut", "actif");

    if (!conns || conns.length === 0) throw new Error("Aucune connexion active trouvée");

    const gatewayPool: any[] = [];
    for (const conn of conns) {
      if (!conn.cle_chiffree) continue;
      const decryptedKey = decryptKey(conn.cle_chiffree);
      try {
        let bal = 0;
        if (conn.passerelle.toLowerCase() === "fedapay") {
          bal = await getFedaPayBalance(decryptedKey);
        } else if (conn.passerelle.toLowerCase() === "kkiapay") {
          const keysObj = JSON.parse(decryptedKey);
          bal = await getKkiapayBalance(keysObj);
        } else if (conn.passerelle.toLowerCase() === "pawapay") {
          bal = await getPawapayBalance(decryptedKey);
        }
        if (bal > 0) {
          gatewayPool.push({ conn, decryptedKey, balance: bal });
        }
      } catch (e) {
        console.error(`Erreur solde ${conn.passerelle}:`, e);
      }
    }

    gatewayPool.sort((a, b) => b.balance - a.balance);
    const totalPoolBalance = gatewayPool.reduce((sum, g) => sum + g.balance, 0);

    if (ligne.montant > totalPoolBalance || ligne.montant < 100) {
      throw new Error(`Solde global insuffisant ou montant invalide. Requis: ${ligne.montant}F`);
    }

    // 3. Retry Payout (Split if necessary)
    let remainingAmount = ligne.montant;
    let isFirst = true;
    let mainStatus = "echoue";

    for (const gateway of gatewayPool) {
      if (remainingAmount <= 0) break;
      if (gateway.balance <= 0) continue;

      const payoutAmount = Math.min(remainingAmount, gateway.balance);
      if (payoutAmount < 100) continue;

      let payoutRes;
      let ligneStatut = "en_cours";
      let ref = "";
      let errMsg = null;

      try {
        if (gateway.conn.passerelle.toLowerCase() === "kkiapay") {
          const keysObj = JSON.parse(gateway.decryptedKey);
          payoutRes = await createAndSendKkiapayPayout(keysObj, payoutAmount, ligne.destinataire_reseau, ligne.destinataire_numero, ligne.destinataire_libelle);
          ligneStatut = payoutRes?.status === "SUCCESS" ? "reussi" : payoutRes?.status === "FAILED" ? "echoue" : "en_cours";
          ref = payoutRes?.transactionId || payoutRes?.id?.toString() || "";
        } else if (gateway.conn.passerelle.toLowerCase() === "pawapay") {
          payoutRes = await createAndSendPawapayPayout(gateway.decryptedKey, payoutAmount, ligne.destinataire_reseau, ligne.destinataire_numero, ligne.destinataire_libelle);
          const pawaStatus = payoutRes?.status || "PENDING";
          ligneStatut = pawaStatus === "FAILED" ? "echoue" : (pawaStatus === "COMPLETED" || pawaStatus === "ACCEPTED" || pawaStatus === "SUCCESS") ? "reussi" : "en_cours";
          ref = payoutRes?.payoutId || payoutRes?.id || "";
        } else {
          payoutRes = await createAndSendPayout(gateway.decryptedKey, payoutAmount, ligne.destinataire_reseau, ligne.destinataire_numero, ligne.destinataire_libelle);
          const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
          ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
          ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";
        }
      } catch (e: any) {
        ligneStatut = "echoue";
        errMsg = e.message;
      }

      if (isFirst) {
        mainStatus = ligneStatut;
        await supabaseAdmin.from("execution_lignes").update({
          statut: ligneStatut,
          reference_transaction: ref,
          erreur_message: errMsg,
          montant: payoutAmount,
          destinataire_libelle: ligne.destinataire_libelle + (payoutAmount < ligne.montant ? ` (Part ${payoutAmount}F)` : "")
        }).eq("id", ligneId);
        isFirst = false;
      } else {
        await supabaseAdmin.from("execution_lignes").insert({
          execution_id: ligne.execution_id,
          destinataire_libelle: ligne.destinataire_libelle + ` (Part ${payoutAmount}F)`,
          destinataire_numero: ligne.destinataire_numero,
          destinataire_reseau: ligne.destinataire_reseau,
          montant: payoutAmount,
          statut: ligneStatut,
          reference_transaction: ref,
          erreur_message: errMsg,
          est_commission: ligne.est_commission
        });
      }

      gateway.balance -= payoutAmount;
      remainingAmount -= payoutAmount;
    }

    if (remainingAmount > 0) {
       // We couldn't fulfill it entirely despite the balance check (maybe rounding or <100 fragments)
       if (isFirst) {
          throw new Error("Impossible de scinder le reste du montant.");
       }
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
    return { success: true, ligneStatut: mainStatus };
  } catch (error: any) {
    console.error("Retry error:", error);
    return { success: false, error: error.message };
  }
}
