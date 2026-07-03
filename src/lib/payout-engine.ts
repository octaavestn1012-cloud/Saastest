import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "./encryption";
import { createAndSendPayout } from "./fedapay";

export async function processPayoutsForUser(userId: string, availableAmount: number, triggerType: string = "a_chaque_entree") {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error("Erreur Serveur : La clé SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.local");
  }

  // On utilise la clé "Service Role" pour contourner le RLS (puisqu'on n'est pas connecté via le navigateur)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Récupérer la connexion FedaPay de l'utilisateur
  const { data: conn, error: connError } = await supabaseAdmin
    .from("connexions")
    .select("*")
    .eq("user_id", userId)
    .eq("passerelle", "FedaPay")
    .eq("statut", "actif")
    .single();

  if (connError || !conn || !conn.cle_chiffree) {
    console.error("Aucune connexion FedaPay active pour cet utilisateur.", connError);
    return { success: false, error: "Aucune connexion active" };
  }

  const secretKey = decryptKey(conn.cle_chiffree);

  // 2. Chercher la règle avec le bon déclencheur
  const { data: rules } = await supabaseAdmin
    .from("regles")
    .select(`
      *,
      distributions (
        id,
        valeur,
        libelle,
        destinataires (
          methode_mobile_money,
          numero
        )
      )
    `)
    .eq("user_id", userId)
    .eq("actif", true)
    .eq("declencheur", triggerType);

  if (!rules || rules.length === 0) {
    return { success: false, error: `Aucune règle active pour le déclencheur '${triggerType}'` };
  }

  // On prend la première règle "à chaque entrée"
  const rule = rules[0];

  // Déduire la commission Réparto (ex: 1.9%)
  const commissionRate = 0.019; 
  const availableAfterCommission = availableAmount * (1 - commissionRate);
  
  let remaining = availableAfterCommission;
  const results = [];

  // Création de l'exécution en base de données
  const { data: execution } = await supabaseAdmin.from("executions").insert({
    user_id: userId,
    regle_id: rule.id,
    montant_total: availableAmount,
    statut: "en_cours",
    date_execution: new Date().toISOString()
  }).select().single();

  if (!execution) {
    throw new Error("Impossible de créer l'historique d'exécution");
  }

  for (const dist of rule.distributions) {
    if (!dist.destinataires) continue; // Sécurité

    let amountToSend = 0;
    if (rule.mode === "pourcentage") {
      amountToSend = (availableAfterCommission * dist.valeur) / 100;
    } else {
      amountToSend = dist.valeur;
    }

    amountToSend = Math.floor(amountToSend); // FedaPay veut des entiers

    if (amountToSend > remaining || amountToSend < 100) {
      console.warn(`Montant invalide ou solde insuffisant pour ${dist.libelle} (${amountToSend} FCFA)`);
      results.push({ dest: dist.libelle, amount: amountToSend, status: "echoue", error: "Montant insuffisant" });
      continue;
    }

    try {
      // API Payout FedaPay
      const payoutRes = await createAndSendPayout(
        secretKey,
        amountToSend,
        dist.destinataires.methode_mobile_money,
        dist.destinataires.numero,
        dist.libelle
      );
      
      results.push({ dest: dist.libelle, amount: amountToSend, status: "reussi", data: payoutRes });
      remaining -= amountToSend;

      // Log la ligne de succès
      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: execution.id,
        destinataire_libelle: dist.libelle,
        montant: amountToSend,
        statut: "reussi",
        est_commission: false
      });

    } catch (e: any) {
      results.push({ dest: dist.libelle, amount: amountToSend, status: "echoue", error: e.message });
      
      // Log la ligne d'échec
      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: execution.id,
        destinataire_libelle: dist.libelle,
        montant: amountToSend,
        statut: "echoue",
        est_commission: false
      });
    }
  }

  // Mettre à jour le statut global de l'exécution
  const allSuccess = results.every(r => r.status === "reussi");
  const anySuccess = results.some(r => r.status === "reussi");
  const finalStatus = allSuccess ? "reussi" : anySuccess ? "partiel" : "echoue";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);

  return { success: true, finalStatus, results };
}
