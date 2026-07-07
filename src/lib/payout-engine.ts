import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "./encryption";
import { createAndSendPayout, getFedaPayBalance } from "./fedapay";
import { createAndSendKkiapayPayout, getKkiapayBalance } from "./kkiapay";

export async function processQuickPayouts(userId: string, availableAmount: number, targets: any[], mode: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error("Erreur Serveur : La clé SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.local");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single();
  const plan = profile?.plan || "gratuit";
  const commissionRate = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;

  const { data: conns, error: connError } = await supabaseAdmin.from("connexions")
    .select("*").eq("user_id", userId).eq("statut", "actif");

  if (connError || !conns || conns.length === 0) {
    return { success: false, error: "Aucune connexion active" };
  }

  // Pick the first active connection for now (can be improved later to balance across multiple)
  const conn = conns[0];

  const decryptedKey = decryptKey(conn.cle_chiffree);
  const commissionAmount = Math.floor(availableAmount * commissionRate);
  const availableAfterCommission = availableAmount - commissionAmount;
  let remaining = availableAfterCommission;
  const results = [];

  const { data: execution } = await supabaseAdmin.from("executions").insert({
    user_id: userId,
    montant_total: availableAmount,
    statut: "en_cours",
    date_execution: new Date().toISOString()
  }).select().single();

  if (!execution) throw new Error("Impossible de créer l'historique d'exécution");


  for (const t of targets) {
    let amountToSend = mode === "percentage" ? (availableAfterCommission * Number(t.percent ?? t.value ?? 0)) / 100 : Number(t.amount ?? t.value ?? 0);
    amountToSend = Math.floor(amountToSend);

    if (amountToSend > remaining || amountToSend < 100) {
      results.push({ dest: t.label || t.name, amount: amountToSend, status: "echoue", error: "Montant insuffisant" });
      await supabaseAdmin.from("execution_lignes").insert({ 
        execution_id: execution.id, 
        destinataire_libelle: t.label || t.name, 
        destinataire_numero: t.number || t.phone,
        destinataire_reseau: t.method || t.network,
        montant: amountToSend, 
        statut: "echoue", 
        erreur_message: "Montant insuffisant",
        est_commission: false 
      });
      continue;
    }

    try {
      let payoutRes;
      let ligneStatut = "en_cours";
      let ref = "";

      if (conn.passerelle.toLowerCase() === "kkiapay") {
        const keysObj = JSON.parse(decryptedKey);
        payoutRes = await createAndSendKkiapayPayout(keysObj, amountToSend, t.method || t.network, t.number || t.phone, t.label || t.name);
        // Map Kkiapay status logic (adapt once API is known)
        ligneStatut = payoutRes?.status === "SUCCESS" ? "reussi" : payoutRes?.status === "FAILED" ? "echoue" : "en_cours";
        ref = payoutRes?.transactionId || payoutRes?.id?.toString() || "";
      } else {
        payoutRes = await createAndSendPayout(decryptedKey, amountToSend, t.method || t.network, t.number || t.phone, t.label || t.name);
        const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
        ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
        ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";
      }

      results.push({ dest: t.label || t.name, amount: amountToSend, status: ligneStatut, data: payoutRes });
      remaining -= amountToSend;

      await supabaseAdmin.from("execution_lignes").insert({ 
        execution_id: execution.id, 
        destinataire_libelle: t.label || t.name, 
        destinataire_numero: t.number || t.phone,
        destinataire_reseau: t.method || t.network,
        montant: amountToSend, 
        statut: ligneStatut, 
        reference_transaction: ref,
        est_commission: false 
      });
    } catch (e: any) {
      results.push({ dest: t.label || t.name, amount: amountToSend, status: "echoue", error: e.message });
      await supabaseAdmin.from("execution_lignes").insert({ 
        execution_id: execution.id, 
        destinataire_libelle: t.label || t.name, 
        destinataire_numero: t.number || t.phone,
        destinataire_reseau: t.method || t.network,
        montant: amountToSend, 
        statut: "echoue", 
        erreur_message: e.message,
        est_commission: false 
      });
    }
  }

  // --- COMMISSION RÉPARTO (RÉEL) ---
  if (commissionAmount > 0) {
    let commLigneStatut = "en_cours";
    let commRef = "";
    let commError = null;
    let commRes = null;
    
    const commissionMsisdn = process.env.REPARTO_COMMISSION_MSISDN;
    const commissionOperateur = process.env.REPARTO_COMMISSION_OPERATEUR;

    if (!commissionMsisdn || !commissionOperateur) {
       console.error("Variables d'environnement de commission manquantes !");
       commLigneStatut = "echoue";
       commError = "Configuration système manquante";
    } else {
       try {
         if (conn.passerelle.toLowerCase() === "kkiapay") {
           const keysObj = JSON.parse(decryptedKey);
           commRes = await createAndSendKkiapayPayout(keysObj, commissionAmount, commissionOperateur, commissionMsisdn, "Commission Réparto");
           commLigneStatut = commRes?.status === "SUCCESS" ? "reussi" : commRes?.status === "FAILED" ? "echoue" : "en_cours";
           commRef = commRes?.transactionId || commRes?.id?.toString() || "";
         } else {
           commRes = await createAndSendPayout(decryptedKey, commissionAmount, commissionOperateur, commissionMsisdn, "Commission Réparto");
           const fedapayStatus = commRes?.v1?.payout?.status || commRes?.status || "pending";
           commLigneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
           commRef = commRes?.v1?.payout?.reference || commRes?.v1?.payout?.id?.toString() || commRes?.id?.toString() || "";
         }
       } catch (e: any) {
         commLigneStatut = "echoue";
         commError = e.message;
       }
    }

    results.push({ dest: "Commission Réparto", amount: commissionAmount, status: commLigneStatut, error: commError });

    await supabaseAdmin.from("execution_lignes").insert({ 
      execution_id: execution.id, 
      destinataire_libelle: "Commission Réparto", 
      destinataire_numero: commissionMsisdn || "INCONNU",
      destinataire_reseau: commissionOperateur || "INCONNU",
      montant: commissionAmount, 
      statut: commLigneStatut, 
      reference_transaction: commRef,
      erreur_message: commError,
      est_commission: true 
    });
  }

  const hasFailed = results.some(r => r.status === "echoue");
  const hasSuccess = results.some(r => r.status === "reussi" || r.status === "en_cours");
  const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : results.every(r => r.status === "reussi") ? "reussi" : "en_cours";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);
  return { success: true, finalStatus, results, executionId: execution.id };
}

export async function processPayoutsForUser(userId: string, availableAmount: number, triggerOrRuleId: string = "a_chaque_entree", isRuleId: boolean = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error("Erreur Serveur : La clé SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.local");
  }

  // On utilise la clé "Service Role" pour contourner le RLS (puisqu'on n'est pas connecté via le navigateur)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Récupérer le plan de l'utilisateur pour la commission
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = profile?.plan || "gratuit";
  const commissionRate = plan === "pro" ? 0.008 : plan === "business" ? 0.004 : 0.019;

  // 2. Récupérer toutes les connexions actives
  const { data: conns, error: connError } = await supabaseAdmin
    .from("connexions")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "actif");

  if (connError || !conns || conns.length === 0) {
    console.error("Aucune connexion active pour cet utilisateur.", connError);
    return { success: false, error: "Aucune connexion active" };
  }

  // 3. Construire le Gateway Pool
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
      }
      if (bal > 0) {
        gatewayPool.push({ conn, decryptedKey, balance: bal });
      }
    } catch (e) {
      console.error(`Erreur solde ${conn.passerelle}:`, e);
    }
  }

  gatewayPool.sort((a, b) => b.balance - a.balance);

  // 4. Chercher la règle
  let rulesQuery = supabaseAdmin
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
    .eq("actif", true);

  if (isRuleId) {
    rulesQuery = rulesQuery.eq("id", triggerOrRuleId);
  } else {
    rulesQuery = rulesQuery.eq("declencheur", triggerOrRuleId);
  }

  const { data: rules } = await rulesQuery;

  if (!rules || rules.length === 0) {
    return { success: false, error: `Aucune règle active trouvée` };
  }

  const rule = rules[0];

  let totalPoolBalance = gatewayPool.reduce((sum, g) => sum + g.balance, 0);
  
  // Si le montant fourni est 0 (cas des CRON quotidiens/mensuels), on prend la totalité du solde disponible
  let finalAvailableAmount = availableAmount > 0 ? availableAmount : totalPoolBalance;

  const commissionAmount = Math.floor(finalAvailableAmount * commissionRate);
  const availableAfterCommission = finalAvailableAmount - commissionAmount;
  
  const results: any[] = [];

  const { data: execution } = await supabaseAdmin.from("executions").insert({
    user_id: userId,
    regle_id: rule.id,
    montant_total: finalAvailableAmount,
    statut: "en_cours",
    date_execution: new Date().toISOString()
  }).select().single();

  if (!execution) {
    throw new Error("Impossible de créer l'historique d'exécution");
  }

  const executePayoutOnPool = async (targetLabel: string, targetMethod: string, targetPhone: string, targetAmount: number, isCommission: boolean = false) => {
    let remainingAmount = Math.floor(targetAmount);
    
    if (remainingAmount > totalPoolBalance || remainingAmount < 100) {
      results.push({ dest: targetLabel, amount: remainingAmount, status: "echoue", error: "Montant insuffisant ou invalide" });
      await supabaseAdmin.from("execution_lignes").insert({ 
        execution_id: execution.id, 
        destinataire_libelle: targetLabel, 
        destinataire_numero: targetPhone || "INCONNU",
        destinataire_reseau: targetMethod || "INCONNU",
        montant: remainingAmount, 
        statut: "echoue", 
        erreur_message: "Montant insuffisant ou invalide dans le pool",
        est_commission: isCommission 
      });
      return;
    }

    for (const gateway of gatewayPool) {
      if (remainingAmount <= 0) break;
      if (gateway.balance <= 0) continue;

      const payoutAmount = Math.min(remainingAmount, gateway.balance);
      if (payoutAmount < 100) continue;

      try {
        let payoutRes;
        let ligneStatut = "en_cours";
        let ref = "";

        if (gateway.conn.passerelle.toLowerCase() === "kkiapay") {
          const keysObj = JSON.parse(gateway.decryptedKey);
          payoutRes = await createAndSendKkiapayPayout(keysObj, payoutAmount, targetMethod, targetPhone, targetLabel);
          ligneStatut = payoutRes?.status === "SUCCESS" ? "reussi" : payoutRes?.status === "FAILED" ? "echoue" : "en_cours";
          ref = payoutRes?.transactionId || payoutRes?.id?.toString() || "";
        } else {
          payoutRes = await createAndSendPayout(gateway.decryptedKey, payoutAmount, targetMethod, targetPhone, targetLabel);
          const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
          ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
          ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";
        }

        results.push({ dest: targetLabel, amount: payoutAmount, status: ligneStatut, data: payoutRes });
        
        gateway.balance -= payoutAmount;
        totalPoolBalance -= payoutAmount;
        remainingAmount -= payoutAmount;

        await supabaseAdmin.from("execution_lignes").insert({ 
          execution_id: execution.id, 
          destinataire_libelle: targetLabel + (payoutAmount < targetAmount ? ` (Part ${payoutAmount}F)` : ""), 
          destinataire_numero: targetPhone || "INCONNU",
          destinataire_reseau: targetMethod || "INCONNU",
          montant: payoutAmount, 
          statut: ligneStatut, 
          reference_transaction: ref,
          est_commission: isCommission 
        });
      } catch (e: any) {
        results.push({ dest: targetLabel, amount: payoutAmount, status: "echoue", error: e.message });
        await supabaseAdmin.from("execution_lignes").insert({ 
          execution_id: execution.id, 
          destinataire_libelle: targetLabel, 
          destinataire_numero: targetPhone || "INCONNU",
          destinataire_reseau: targetMethod || "INCONNU",
          montant: payoutAmount, 
          statut: "echoue", 
          erreur_message: e.message,
          est_commission: isCommission 
        });
      }
    }

    if (remainingAmount > 0) {
      results.push({ dest: targetLabel, amount: remainingAmount, status: "echoue", error: "Impossible de finaliser le reste du montant" });
    }
  };

  for (const dist of rule.distributions) {
    if (!dist.destinataires) continue;
    let amountToSend = rule.mode === "pourcentage" ? (availableAfterCommission * dist.valeur) / 100 : dist.valeur;
    await executePayoutOnPool(dist.libelle, dist.destinataires.methode_mobile_money, dist.destinataires.numero, amountToSend, false);
  }

  // --- COMMISSION RÉPARTO (RÉEL) ---
  if (commissionAmount > 0) {
    const commissionMsisdn = process.env.REPARTO_COMMISSION_MSISDN;
    const commissionOperateur = process.env.REPARTO_COMMISSION_OPERATEUR;
    if (!commissionMsisdn || !commissionOperateur) {
      console.error("Variables d'environnement de commission manquantes !");
      results.push({ dest: "Commission Réparto", amount: commissionAmount, status: "echoue", error: "Configuration manquante" });
    } else {
      await executePayoutOnPool("Commission Réparto", commissionOperateur, commissionMsisdn, commissionAmount, true);
    }
  }

  const hasFailed = results.some(r => r.status === "echoue");
  const hasSuccess = results.some(r => r.status === "reussi" || r.status === "en_cours");
  const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : results.every(r => r.status === "reussi") ? "reussi" : "en_cours";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);

  return { success: true, finalStatus, results, executionId: execution.id };
}
