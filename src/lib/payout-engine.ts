import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "./encryption";
import { createAndSendPayout } from "./fedapay";

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

  const { data: conn, error: connError } = await supabaseAdmin.from("connexions")
    .select("*").eq("user_id", userId).ilike("passerelle", "fedapay").eq("statut", "actif").single();

  if (connError || !conn || !conn.cle_chiffree) {
    return { success: false, error: "Aucune connexion active" };
  }

  const secretKey = decryptKey(conn.cle_chiffree);
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

  await supabaseAdmin.from("execution_lignes").insert({
    execution_id: execution.id,
    destinataire_libelle: "Commission Réparto",
    montant: commissionAmount,
    statut: "reussi",
    est_commission: true
  });

  for (const t of targets) {
    let amountToSend = mode === "percentage" ? (availableAfterCommission * Number(t.percent || t.value)) / 100 : Number(t.amount || t.value);
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
      const payoutRes = await createAndSendPayout(secretKey, amountToSend, t.method || t.network, t.number || t.phone, t.label || t.name);
      
      const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
      const ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
      const ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";

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

  const hasFailed = results.some(r => r.status === "echoue");
  const hasSuccess = results.some(r => r.status === "reussi" || r.status === "en_cours");
  const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : results.every(r => r.status === "reussi") ? "reussi" : "en_cours";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);
  return { success: true, finalStatus, results };
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

  // 2. Récupérer la connexion FedaPay de l'utilisateur
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

  // 3. Chercher la règle
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

  // On prend la première règle "à chaque entrée" ou celle demandée
  const rule = rules[0];

  // Calcul de la commission Réparto
  const commissionAmount = Math.floor(availableAmount * commissionRate);
  const availableAfterCommission = availableAmount - commissionAmount;
  
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

  // Insérer la ligne de commission
  await supabaseAdmin.from("execution_lignes").insert({
    execution_id: execution.id,
    destinataire_libelle: "Commission Réparto",
    montant: commissionAmount,
    statut: "reussi",
    est_commission: true
  });

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
      
      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: execution.id,
        destinataire_libelle: dist.libelle,
        destinataire_numero: dist.destinataires.numero,
        destinataire_reseau: dist.destinataires.methode_mobile_money,
        montant: amountToSend,
        statut: "echoue",
        erreur_message: "Montant insuffisant",
        est_commission: false
      });
      continue;
    }

    try {
      const payoutRes = await createAndSendPayout(
        secretKey,
        amountToSend,
        dist.destinataires.methode_mobile_money,
        dist.destinataires.numero,
        dist.libelle
      );
      
      const fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
      const ligneStatut = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" || fedapayStatus === "approved" ? "reussi" : "en_cours";
      const ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";

      results.push({ dest: dist.libelle, amount: amountToSend, status: ligneStatut, data: payoutRes });
      remaining -= amountToSend;

      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: execution.id,
        destinataire_libelle: dist.libelle,
        destinataire_numero: dist.destinataires.numero,
        destinataire_reseau: dist.destinataires.methode_mobile_money,
        montant: amountToSend,
        statut: ligneStatut,
        reference_transaction: ref,
        est_commission: false
      });

    } catch (e: any) {
      results.push({ dest: dist.libelle, amount: amountToSend, status: "echoue", error: e.message });
      
      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: execution.id,
        destinataire_libelle: dist.libelle,
        destinataire_numero: dist.destinataires.numero,
        destinataire_reseau: dist.destinataires.methode_mobile_money,
        montant: amountToSend,
        statut: "echoue",
        erreur_message: e.message,
        est_commission: false
      });
    }
  }

  // Mettre à jour le statut global de l'exécution
  const hasFailed = results.some(r => r.status === "echoue");
  const hasSuccess = results.some(r => r.status === "reussi" || r.status === "en_cours");
  const finalStatus = !hasSuccess ? "echoue" : hasFailed ? "partiel" : results.every(r => r.status === "reussi") ? "reussi" : "en_cours";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);

  return { success: true, finalStatus, results };
}
