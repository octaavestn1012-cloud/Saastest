import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "./encryption";
import { createAndSendPayout, getFedaPayBalance } from "./fedapay";
import { createAndSendKkiapayPayout, getKkiapayBalance } from "./kkiapay";
import { getPawapayBalance, createAndSendPawapayPayout } from "./pawapay";
import { sendPayoutReceiptEmail, sendAutomationReport } from "./email";
import { getValidUserPlan, getCommissionRate } from "./billing";

/**
 * Fonction unifiée pour préparer le pool de passerelles
 */
async function buildGatewayPool(supabaseAdmin: any, userId: string) {
  const { data: conns, error: connError } = await supabaseAdmin
    .from("connexions")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "actif");

  if (connError || !conns || conns.length === 0) {
    return { success: false, error: "Aucune connexion active trouvée." };
  }

  const gatewayPool: any[] = [];
  let totalBalance = 0;

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
        totalBalance += bal;
      }
    } catch (e) {
      console.error(`Erreur solde ${conn.passerelle}:`, e);
    }
  }

  return { success: true, gatewayPool, totalBalance };
}

/**
 * Moteur unifié de préparation et d'exécution
 */
async function orchestratePayouts(
  userId: string, 
  userEmail: string | undefined,
  plan: string,
  mode: string, 
  targets: any[], // [{ label, method, phone, value, ordre?, isCommission? }]
  ruleName: string,
  ruleId?: string,
  isAutomatic: boolean = false,
  config: any = {}
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Lire les soldes réels
  const poolRes = await buildGatewayPool(supabaseAdmin, userId);
  if (!poolRes.success) return poolRes;
  const { gatewayPool, totalBalance } = poolRes;
  const verifiedTotalBalance = totalBalance || 0; // Ensures it's a number

  if (verifiedTotalBalance <= 0) {
    return { success: false, error: "Solde total insuffisant (0 F) sur vos passerelles." };
  }

  // Vérification de la condition de seuil (Avancée)
  if (config?.conditionEnabled && config?.conditionAmount > 0) {
    if (verifiedTotalBalance < config.conditionAmount) {
      return { success: false, finalStatus: "echoue", error: `Ignoré: Le solde (${verifiedTotalBalance} F) est inférieur au seuil exigé de ${config.conditionAmount} F.` };
    }
  }

  // 2. Validation du Plan et des Limites (Pour plan Gratuit)
  const validatedPlan = await getValidUserPlan(userId);
  const commissionRate = getCommissionRate(validatedPlan);

  if (validatedPlan === "gratuit") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthExecs } = await supabaseAdmin
      .from("executions")
      .select("montant_total")
      .eq("user_id", userId)
      .in("statut", ["reussi", "partiel"])
      .gte("date_execution", startOfMonth.toISOString());

    if (monthExecs) {
      if (monthExecs.length >= 20) {
        return { success: false, error: "Limite de 20 répartitions par mois atteinte. Veuillez passer au plan Pro." };
      }
      const totalVolume = monthExecs.reduce((acc: number, ex: any) => acc + (ex.montant_total || 0), 0);
      
      // On calculera le besoin total plus bas. On garde totalVolume pour le check.
      (global as any).__tempTotalVolume = totalVolume; 
    }
  }

  // 3. Calcul Commission et À répartir
  
  let commissionAmount = 0;
  let sumAssigned = 0;
  let finalTargets: any[] = [];
  let availableAfterCommission = verifiedTotalBalance;

  if (mode === "pourcentage") {
    // En pourcentage, on prélève la commission sur le solde total global, puis on répartit le reste
    commissionAmount = Math.floor(verifiedTotalBalance * commissionRate);
    availableAfterCommission = verifiedTotalBalance - commissionAmount;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const amount = Math.round((availableAfterCommission * t.value) / 100);
      finalTargets.push({ ...t, amount });
      sumAssigned += amount;
    }

    // Ajustement d'arrondi sur le dernier destinataire
    if (finalTargets.length > 0) {
      const diff = availableAfterCommission - sumAssigned;
      if (diff !== 0) {
        finalTargets[finalTargets.length - 1].amount += diff;
      }
    }
  } else {
    // En mode fixe, on vérifie si on doit faire un paiement partiel
    let totalRequested = targets.reduce((acc, t) => acc + Math.round(t.value), 0);
    let requestedCommission = Math.floor(totalRequested * commissionRate);
    
    const isPremium = validatedPlan === "pro" || validatedPlan === "business";
    
    if (isPremium && (totalRequested + requestedCommission > verifiedTotalBalance)) {
      // Tri par ordre de priorité personnalisé ou naturel
      let sortedTargets = [...targets];
      
      if (config?.priorityEnabled && config?.priorityOrder) {
        const priorityOrderArray = config.priorityOrder;
        sortedTargets.sort((a, b) => {
          const indexA = priorityOrderArray.indexOf(a.ordre);
          const indexB = priorityOrderArray.indexOf(b.ordre);
          
          const pA = indexA !== -1 ? indexA : (a.ordre || 999);
          const pB = indexB !== -1 ? indexB : (b.ordre || 999);
          
          return pA - pB;
        });
      } else {
        // Ordre naturel (comme convenu pour les répartitions manuelles ou sans option spécifique cochée)
        sortedTargets.sort((a, b) => (a.ordre || 999) - (b.ordre || 999));
      }
      
      // On teste quelles cibles on peut financer
      let currentCommission = 0;
      
      for (let i = 0; i < sortedTargets.length; i++) {
        const t = sortedTargets[i];
        const amount = Math.round(t.value);
        
        const newSum = sumAssigned + amount;
        const newCommission = Math.floor(newSum * commissionRate);
        
        if (newSum + newCommission <= verifiedTotalBalance) {
          finalTargets.push({ ...t, amount });
          sumAssigned = newSum;
          currentCommission = newCommission;
        } else {
          // Solde insuffisant pour ce destinataire, on l'ignore (0)
          finalTargets.push({ ...t, amount: 0 });
        }
      }
      commissionAmount = currentCommission;
      
      if (sumAssigned === 0) {
        return { success: false, error: "Solde insuffisant même pour le premier destinataire de la liste." };
      }
      
    } else {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const amount = Math.round(t.value);
        finalTargets.push({ ...t, amount });
        sumAssigned += amount;
      }
      commissionAmount = Math.floor(sumAssigned * commissionRate);
    }
  }

  const totalNeededForTargets = finalTargets.reduce((sum, t) => sum + t.amount, 0);
  let totalNeededWithCommission = totalNeededForTargets + commissionAmount;

  if (totalNeededWithCommission > verifiedTotalBalance) {
    return { success: false, error: "Solde insuffisant pour couvrir les montants et la commission." };
  }

  // Traitement du Reliquat (Montant Fixe uniquement)
  if (mode === "montant_fixe" && config?.reliquatEnabled && config?.reliquatRecipientId) {
    const maxSendableTotal = Math.floor(verifiedTotalBalance / (1 + commissionRate));
    const restToSend = maxSendableTotal - sumAssigned;
    
    if (restToSend > 0) {
      // Chercher le destinataire
      const { data: relRecipient } = await supabaseAdmin.from("destinataires").select("*").eq("id", config.reliquatRecipientId).single();
      if (relRecipient) {
        // Ajouter le reliquat
        finalTargets.push({
          label: relRecipient.libelle + " (Reliquat)",
          method: relRecipient.methode_mobile_money,
          phone: relRecipient.numero,
          amount: restToSend
        });
        sumAssigned += restToSend;
        commissionAmount = Math.floor(sumAssigned * commissionRate);
        totalNeededWithCommission = sumAssigned + commissionAmount;
      }
    }
  }

  if (validatedPlan === "gratuit") {
    const totalVolume = (global as any).__tempTotalVolume || 0;
    if (totalVolume + totalNeededWithCommission > 500000) {
      return { success: false, error: "Plafond mensuel de 500 000 FCFA dépassé. Veuillez passer au plan Pro." };
    }
  }

  // Ajouter la commission à la fin de la liste des envois
  if (commissionAmount > 0) {
    const commissionMsisdn = process.env.REPARTO_COMMISSION_MSISDN;
    const commissionOperateur = process.env.REPARTO_COMMISSION_OPERATEUR;
    if (commissionMsisdn && commissionOperateur) {
      finalTargets.push({
        label: "Commission Réparto",
        method: commissionOperateur,
        phone: commissionMsisdn,
        amount: commissionAmount,
        isCommission: true
      });
    }
  }

  // 4. Assigner aux passerelles (Création du Plan d'Assignation)
  const executionPlan: any[] = [];
  
  for (const t of finalTargets) {
    if (t.amount <= 0) continue;
    let remainingToFund = t.amount;

    while (remainingToFund > 0) {
      // Trier par solde décroissant pour prendre la plus riche
      if (!gatewayPool) break;
      gatewayPool.sort((a:any, b:any) => b.balance - a.balance);
      const richestGateway = gatewayPool[0];

      if (!richestGateway || richestGateway.balance <= 0) {
        return { success: false, error: `Fonds insuffisants lors du fractionnement pour ${t.label}` };
      }

      const takeAmount = Math.min(remainingToFund, richestGateway.balance);
      
      executionPlan.push({
        target: t,
        amount: takeAmount,
        gateway: richestGateway
      });

      richestGateway.balance -= takeAmount;
      remainingToFund -= takeAmount;
    }
  }

  // 5. Création de l'exécution en base
  const { data: execution } = await supabaseAdmin.from("executions").insert({
    user_id: userId,
    regle_id: ruleId || null,
    montant_total: totalNeededWithCommission,
    statut: "en_cours",
    date_execution: new Date().toISOString()
  }).select().single();

  if (!execution) throw new Error("Impossible de créer l'historique d'exécution");

  // 6. Exécution réelle des paiements (Séquentiel, un par un, pour respecter l'algorithme de base)
  const results: any[] = [];

  for (const step of executionPlan) {
    const { target, amount, gateway } = step;
    let stepStatus = "en_cours";
    let stepRef = "";
    let stepError = null;
    let apiData = null;

    try {
      if (gateway.conn.passerelle.toLowerCase() === "kkiapay") {
        const keysObj = JSON.parse(gateway.decryptedKey);
        apiData = await createAndSendKkiapayPayout(keysObj, amount, target.method, target.phone, target.label);
        stepStatus = apiData?.status === "SUCCESS" ? "reussi" : apiData?.status === "FAILED" ? "echoue" : "en_cours";
        stepRef = apiData?.transactionId || apiData?.id?.toString() || "";
      } else if (gateway.conn.passerelle.toLowerCase() === "pawapay") {
        apiData = await createAndSendPawapayPayout(gateway.decryptedKey, amount, target.method, target.phone, target.label);
        stepRef = apiData?.payoutId || apiData?.id || "";
        
        let pawaStatus = apiData?.status || "PENDING";
        // Polling up to 10 seconds (5 x 2s)
        if ((pawaStatus === "PENDING" || pawaStatus === "ACCEPTED") && stepRef) {
          const { getPawapayPayoutStatus } = await import("./pawapay");
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusData = await getPawapayPayoutStatus(gateway.decryptedKey, stepRef);
              pawaStatus = statusData?.status || pawaStatus;
              if (pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS" || pawaStatus === "FAILED") break;
            } catch(e) {}
          }
        }
        stepStatus = pawaStatus === "FAILED" ? "echoue" : (pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS") ? "reussi" : "en_cours";

      } else {
        apiData = await createAndSendPayout(gateway.decryptedKey, amount, target.method, target.phone, target.label);
        stepRef = apiData?.v1?.payout?.reference || apiData?.v1?.payout?.id?.toString() || apiData?.id?.toString() || "";
        
        let fedapayStatus = apiData?.v1?.payout?.status || apiData?.status || "pending";
        // Polling up to 10 seconds (5 x 2s)
        if ((fedapayStatus === "pending" || fedapayStatus === "approved" || fedapayStatus === "processing") && stepRef) {
          const { getFedaPayPayoutStatus } = await import("./fedapay");
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusData = await getFedaPayPayoutStatus(gateway.decryptedKey, stepRef);
              fedapayStatus = statusData?.v1?.payout?.status || statusData?.status || fedapayStatus;
              if (fedapayStatus === "sent" || fedapayStatus === "failed") break;
            } catch(e) {}
          }
        }
        stepStatus = fedapayStatus === "failed" ? "echoue" : fedapayStatus === "sent" ? "reussi" : "en_cours";
      }
    } catch (e: any) {
      stepStatus = "echoue";
      stepError = e.message;
    }

    results.push({
      target,
      dest: target.label,
      amount: amount,
      status: stepStatus,
      error: stepError,
      passerelle: gateway.conn.passerelle
    });

    await supabaseAdmin.from("execution_lignes").insert({ 
      execution_id: execution.id, 
      destinataire_libelle: target.label + (amount < target.amount ? ` (Fraction)` : ""), 
      destinataire_numero: target.phone || "INCONNU",
      destinataire_reseau: target.method || "INCONNU",
      montant: amount, 
      statut: stepStatus, 
      reference_transaction: stepRef,
      erreur_message: stepError,
      est_commission: target.isCommission || false,
      passerelle: gateway.conn.passerelle
    });
  }

  // 7. Statut final
  const clientResults = results.filter(r => !r.target?.isCommission);
  
  const hasFailed = clientResults.some(r => r.status === "echoue");
  const hasSuccess = clientResults.some(r => r.status === "reussi" || r.status === "en_cours");
  const isAllSuccess = clientResults.every(r => r.status === "reussi");

  let finalStatus = "en_cours";
  if (clientResults.length === 0) finalStatus = "reussi"; // Cas extrême
  else if (isAllSuccess) finalStatus = "reussi";
  else if (!hasSuccess) finalStatus = "echoue";
  else if (hasFailed) finalStatus = "partiel";

  await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", execution.id);

  // 8. Envoi email
  if (userEmail) {
    const emailDetails = results.map(r => ({
      name: r.dest + ` (via ${r.passerelle})`,
      network: "Mobile Money",
      amount: r.amount,
      status: r.status === "reussi" ? "SUCCESS" : r.status === "echoue" ? "FAILED" : "PENDING",
      errorReason: r.error
    }));

    const reportData = {
      ruleName: ruleName,
      totalAvailable: verifiedTotalBalance,
      commissionAmount: commissionAmount,
      totalAmount: availableAfterCommission,
      status: finalStatus === "reussi" ? "SUCCESS" : finalStatus === "partiel" ? "PARTIAL" : "FAILED",
      details: emailDetails
    };

    if (isAutomatic) {
      if (config?.notifyEmail !== false) {
        await sendAutomationReport(userEmail, reportData);
      }
      if (config?.notifySms) {
        // TODO: Implémenter l'envoi SMS (ex: via Twilio ou FedaPay SMS)
        console.log("Alerte SMS activée mais non implémentée.");
      }
    } else {
      await sendPayoutReceiptEmail(userEmail, reportData);
    }
  }

  return { success: true, finalStatus, results, executionId: execution.id };
}

// --- POINTS D'ENTRÉE EXPORTÉS ---

export async function processQuickPayouts(userId: string, availableAmount: number, targetsRaw: any[], mode: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single();
  const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  const targets = targetsRaw.map(t => ({
    label: t.label || t.name,
    method: t.method || t.network,
    phone: t.number || t.phone,
    value: Number(t.percent ?? t.value ?? t.amount ?? 0)
  }));

  return orchestratePayouts(userId, userAuth?.user?.email, profile?.plan || "gratuit", mode, targets, "Répartition Rapide");
}

export async function processPayoutsForUser(userId: string, availableAmount: number, triggerOrRuleId: string = "a_chaque_entree", isRuleId: boolean = false, isAutomatic: boolean = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single();
  const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);

  let rulesQuery = supabaseAdmin
    .from("regles")
    .select("*, distributions (id, valeur, libelle, ordre, destinataires (methode_mobile_money, numero))")
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
  const config = rule.declencheur_config || {};

  const targets = rule.distributions.filter((d:any) => d.destinataires).map((d:any) => ({
    label: d.libelle,
    method: d.destinataires.methode_mobile_money,
    phone: d.destinataires.numero,
    value: d.valeur,
    ordre: d.ordre
  }));

  return orchestratePayouts(userId, userAuth?.user?.email, profile?.plan || "gratuit", rule.mode, targets, rule.nom, rule.id, isAutomatic, config);
}
