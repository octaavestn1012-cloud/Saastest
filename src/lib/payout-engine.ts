import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "./encryption";
import { createAndSendPayout, getFedaPayBalance } from "./fedapay";
import { createAndSendKkiapayPayout, getKkiapayBalance } from "./kkiapay";
import { getPawapayBalance, createAndSendPawapayPayout } from "./pawapay";
import { sendPayoutReceiptEmail, sendAutomationReport, sendPlanLimitReachedEmail } from "./email";
import { getValidUserPlan, getCommissionRate } from "./billing";

/**
 * Fonction unifiée pour préparer le pool de passerelles
 */
export async function buildGatewayPool(supabaseAdmin: any, userId: string) {
  const { data: conns, error: connError } = await supabaseAdmin
    .from("connexions")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "actif");

  if (connError || !conns || conns.length === 0) {
    return { success: false, error: "Aucune connexion active trouvée." };
  }

  // Lire le statut global des passerelles
  const { data: globalStatusData } = await supabaseAdmin
    .from("admin_settings")
    .select("config_value")
    .eq("config_key", "global_gateways_status")
    .single();
  const globalGateways = globalStatusData?.config_value || { fedapay: true, kkiapay: true, pawapay: true, "magma onepay": true };

  const gatewayPool: any[] = [];
  let totalBalance = 0;

  for (const conn of conns) {
    if (!conn.cle_chiffree) continue;
    
    // Si la passerelle est désactivée globalement par l'admin, on l'ignore silencieusement
    if (globalGateways[conn.passerelle.toLowerCase()] === false) {
      continue;
    }

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

  // Charger les mappings de passerelles
  const { data: mappingsData } = await supabaseAdmin.from("gateway_mappings").select("*").eq("actif", true);
  const mappings = mappingsData || [];

  // Charger les mappings de statuts
  const { data: statusMappingsData } = await supabaseAdmin.from("gateway_status_mappings").select("*");
  const statusMappings = statusMappingsData || [];

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
        if (isAutomatic && userEmail) {
          await sendPlanLimitReachedEmail(userEmail, "count");
        }
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
      if (isAutomatic && userEmail) {
        await sendPlanLimitReachedEmail(userEmail, "volume");
      }
      return { success: false, error: "Plafond mensuel de 500 000 FCFA dépassé. Veuillez passer au plan Pro." };
    }
  }

  // La commission sera enregistrée ligne par ligne pour le système asynchrone (DUE).
  // Plus d'ajout en tant que "Destinataire" direct.

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
      // 1. Chercher le mapping pour ce réseau et cette passerelle
      let cleanPhone = target.phone.replace(/[^0-9+]/g, '');
      const passerelleName = gateway.conn.passerelle.toLowerCase();
      
      let mapping = mappings.find(m => 
        m.reparto_reseau.toLowerCase() === target.method.toLowerCase() && 
        m.gateway.toLowerCase() === passerelleName
      );

      // Si PawaPay ou FedaPay, le mapping est OBLIGATOIRE (Kkiapay a sa propre logique)
      if (!mapping && (passerelleName === "pawapay" || passerelleName === "fedapay")) {
         throw new Error(`Réseau non supporté par ${passerelleName} : ${target.method}`);
      }

      // 2. Validation de la longueur du numéro (sans l'indicatif)
      if (mapping && mapping.indicatif) {
        let phoneWithoutIndicatif = cleanPhone;
        const indicatifClean = mapping.indicatif.replace(/[^0-9+]/g, '');
        
        // Si le numéro inclut l'indicatif (ex: +22997... ou 22997...) on l'enlève pour vérifier la longueur
        if (cleanPhone.startsWith(indicatifClean)) {
          phoneWithoutIndicatif = cleanPhone.substring(indicatifClean.length);
        } else if (cleanPhone.startsWith(indicatifClean.replace('+', ''))) {
          phoneWithoutIndicatif = cleanPhone.substring(indicatifClean.replace('+', '').length);
        }

        if (mapping.phone_digits_count && phoneWithoutIndicatif.length !== mapping.phone_digits_count) {
          throw new Error(`Le numéro ${target.phone} est invalide pour le pays cible (${mapping.phone_digits_count} chiffres attendus après l'indicatif).`);
        }

        // FedaPay et PawaPay demandent le numéro avec l'indicatif complet (ex: 22997...)
        // On s'assure qu'il l'a bien
        if (!cleanPhone.startsWith(indicatifClean) && !cleanPhone.startsWith(indicatifClean.replace('+', ''))) {
           cleanPhone = indicatifClean.replace('+', '') + phoneWithoutIndicatif; // On force l'indicatif sans +
        } else {
           cleanPhone = cleanPhone.replace('+', ''); // On retire juste le +
        }
      }

      // 3. Exécution
      if (passerelleName === "kkiapay") {
        const keysObj = JSON.parse(gateway.decryptedKey);
        apiData = await createAndSendKkiapayPayout(keysObj, amount, target.method, target.phone, target.label);
        
        const currentKkiapayStatus = apiData?.status || "PENDING";
        const foundStatus = statusMappings.find(m => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === currentKkiapayStatus.toUpperCase());
        stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";
        
        stepRef = apiData?.transactionId || apiData?.id?.toString() || "";
      } else if (passerelleName === "pawapay" && mapping) {
        apiData = await createAndSendPawapayPayout(
          gateway.decryptedKey, 
          amount, 
          mapping.gateway_correspondent, 
          mapping.gateway_currency, 
          cleanPhone
        );
        const extractedData = Array.isArray(apiData) ? apiData[0] : apiData;
        stepRef = extractedData?.payoutId || extractedData?.id || "";
        
        let pawaStatus = extractedData?.status || "PENDING";
        // Polling up to 10 seconds (5 x 2s)
        if ((pawaStatus === "PENDING" || pawaStatus === "ACCEPTED") && stepRef) {
          const { getPawapayPayoutStatus } = await import("./pawapay");
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusData = await getPawapayPayoutStatus(gateway.decryptedKey, stepRef);
              const trueStatus = statusData?.data?.status || statusData?.status;
              const extractedStatus = Array.isArray(statusData) ? statusData[0]?.status : trueStatus;
              pawaStatus = extractedStatus || pawaStatus;
              
              const currentMapping = statusMappings.find(m => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
              if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
            } catch(e) {}
          }
        }
        const foundStatus = statusMappings.find(m => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
        stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";

      } else if (passerelleName === "fedapay" && mapping) {
        apiData = await createAndSendPayout(
          gateway.decryptedKey, 
          amount, 
          mapping.gateway_correspondent, 
          mapping.gateway_currency, 
          mapping.gateway_country_code, 
          cleanPhone, 
          target.label
        );
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
              
              const currentMapping = statusMappings.find(m => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
              if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
            } catch(e) {}
          }
        }
        const foundStatus = statusMappings.find(m => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
        stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";
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

    const ligneCommission = Math.floor(amount * commissionRate);
    const ligneCommissionStatut = stepStatus === "reussi" ? "due" : "en_attente";

    await supabaseAdmin.from("execution_lignes").insert({ 
      execution_id: execution.id, 
      destinataire_libelle: target.label + (amount < target.amount ? ` (Fraction)` : ""), 
      destinataire_numero: target.phone || "INCONNU",
      destinataire_reseau: target.method || "INCONNU",
      montant: amount, 
      statut: stepStatus, 
      reference_transaction: stepRef,
      erreur_message: stepError ? stepError.substring(0, 500) : null,
      est_commission: false,
      passerelle: gateway.conn.passerelle || "INCONNU",
      commission_associee: ligneCommission,
      commission_statut: ligneCommissionStatut
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

  // 9. Déclenchement Asynchrone de la collecte des commissions DUE
  // Ne pas bloquer la réponse, on laisse tourner en arrière-plan
  if (hasSuccess) {
    let commissionFallbacks: any[] = [];
    try {
      const { data: adminSettings } = await supabaseAdmin.from("admin_settings").select("config_value").eq("config_key", "commission_numbers").single();
      if (adminSettings?.config_value && Array.isArray(adminSettings.config_value)) {
        commissionFallbacks = adminSettings.config_value.filter((n: any) => n.phone && n.network);
      }
    } catch(e) {}
    
    if (commissionFallbacks.length === 0) {
      if (process.env.REPARTO_COMMISSION_MSISDN && process.env.REPARTO_COMMISSION_OPERATEUR) {
        commissionFallbacks.push({ phone: process.env.REPARTO_COMMISSION_MSISDN, network: process.env.REPARTO_COMMISSION_OPERATEUR });
      }
    }

    if (commissionFallbacks.length > 0) {
      collectPendingCommissions(
        supabaseAdmin,
        userId,
        commissionFallbacks,
        gatewayPool,
        mappings,
        statusMappings
      ).catch(e => console.error("Erreur background collecte commissions:", e));
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

export async function collectPendingCommissions(
  supabaseAdmin: any,
  userId: string,
  commissionFallbacks: any[],
  gatewayPool: any[],
  mappings: any[],
  statusMappings: any[]
) {
  const { data: userDueCommissions } = await supabaseAdmin
    .from("execution_lignes")
    .select("*, executions!inner(user_id)")
    .eq("executions.user_id", userId)
    .eq("commission_statut", "due")
    .in("statut", ["reussi", "partiel"])
    .order("created_at", { ascending: true });

  const totalDue = (userDueCommissions || []).reduce((sum: number, line: any) => sum + Number(line.commission_associee), 0);
  
  if (totalDue > 0) {
    let remainingDue = totalDue;
    let usedFallback = commissionFallbacks[0];
    let cleanPhone = usedFallback.phone.replace(/[^0-9+]/g, '');

    if (gatewayPool) {
      gatewayPool.sort((a:any, b:any) => b.balance - a.balance);
    } else {
      gatewayPool = [];
    }

    let totalCollectedAmount = 0;
    
    let finalExecId = userDueCommissions[0].execution_id;

    for (const gateway of gatewayPool) {
      if (remainingDue <= 0) break;
      if (gateway.balance <= 0) continue;

      const takeAmount = Math.min(remainingDue, gateway.balance);
      
      let commissionCollected = false;
      let cStepError = null;
      let cStepRef = "";
      const passerelleName = gateway.conn.passerelle.toLowerCase();

      try {
        let mapping = mappings.find((m:any) => m.reparto_reseau.toLowerCase() === usedFallback.network.toLowerCase() && m.gateway.toLowerCase() === passerelleName);
        
        if (passerelleName === "kkiapay") {
          const keysObj = JSON.parse(gateway.decryptedKey);
          const { createAndSendKkiapayPayout } = await import("./kkiapay");
          const apiData = await createAndSendKkiapayPayout(keysObj, takeAmount, usedFallback.network, usedFallback.phone, "Commission Réparto");
          const st = apiData?.status || "PENDING";
          const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === st.toUpperCase());
          commissionCollected = (foundStatus?.reparto_status === "reussi");
          cStepRef = apiData?.transactionId || "";
        } else if (passerelleName === "pawapay" && mapping) {
          const { createAndSendPawapayPayout } = await import("./pawapay");
          const apiData = await createAndSendPawapayPayout(gateway.decryptedKey, takeAmount, mapping.gateway_correspondent, mapping.gateway_currency, cleanPhone);
          const extractedData = Array.isArray(apiData) ? apiData[0] : apiData;
          cStepRef = extractedData?.payoutId || "";
          commissionCollected = true;
        } else if (passerelleName === "fedapay" && mapping) {
          const { createAndSendPayout } = await import("./fedapay");
          const apiData = await createAndSendPayout(gateway.decryptedKey, takeAmount, mapping.gateway_correspondent, mapping.gateway_currency, mapping.gateway_country_code, cleanPhone, "Commission Réparto");
          const fst = apiData?.v1?.payout?.status || apiData?.status || "pending";
          const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fst.toLowerCase());
          commissionCollected = (foundStatus?.reparto_status === "reussi" || foundStatus?.reparto_status === "en_cours");
          cStepRef = apiData?.v1?.payout?.reference || "";
        } else if (passerelleName === "magma onepay" && mapping) {
          const keysObj = JSON.parse(gateway.decryptedKey);
          const { createAndSendMagmaOnePayPayout } = await import("./magmaonepay");
          const apiData = await createAndSendMagmaOnePayPayout(keysObj, takeAmount, mapping.gateway_correspondent, cleanPhone, "Commission Réparto");
          let magmaStatus = apiData?.data?.status || apiData?.status || "PENDING";
          const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === magmaStatus.toLowerCase());
          commissionCollected = (foundStatus?.reparto_status === "reussi" || foundStatus?.reparto_status === "en_cours");
          cStepRef = apiData?.data?.id || apiData?.id?.toString() || "";
        }
      } catch (e: any) {
        cStepError = e.message;
      }

      if (finalExecId) {
        await supabaseAdmin.from("execution_lignes").insert({ 
          execution_id: finalExecId, 
          destinataire_libelle: "Commission Réparto" + (takeAmount < totalDue ? ` (Fraction)` : ""), 
          destinataire_numero: usedFallback.phone,
          destinataire_reseau: usedFallback.network,
          montant: takeAmount, 
          statut: commissionCollected ? "reussi" : "echoue", 
          reference_transaction: cStepRef,
          erreur_message: cStepError ? cStepError.substring(0, 500) : null,
          est_commission: true,
          passerelle: gateway.conn.passerelle || "N/A",
          commission_associee: 0,
          commission_statut: 'non_applicable'
        });
      }

      if (commissionCollected) {
        totalCollectedAmount += takeAmount;
        gateway.balance -= takeAmount;
        remainingDue -= takeAmount;
      }
    }

    if (totalCollectedAmount > 0 && userDueCommissions) {
      let amountToMarkAsCollected = totalCollectedAmount;
      const idsToUpdate = [];

      for (const line of userDueCommissions) {
        const lineCom = Number(line.commission_associee);
        if (amountToMarkAsCollected >= lineCom && lineCom > 0) {
          idsToUpdate.push(line.id);
          amountToMarkAsCollected -= lineCom;
        } else if (amountToMarkAsCollected > 0 && lineCom > 0) {
          // On marque la ligne entière comme collectée
          idsToUpdate.push(line.id);
          
          // Mais on calcule ce qu'il reste à payer sur cette ligne
          const remainder = lineCom - amountToMarkAsCollected;
          
          // On crée une nouvelle ligne de dette (IOU) pour le reliquat non payé
          await supabaseAdmin.from("execution_lignes").insert({
            execution_id: line.execution_id,
            destinataire_libelle: "Dette Commission Restante",
            destinataire_numero: line.destinataire_numero,
            destinataire_reseau: line.destinataire_reseau,
            montant: 0,
            statut: "reussi",
            est_commission: false,
            passerelle: line.passerelle,
            commission_associee: remainder,
            commission_statut: 'due'
          });
          
          amountToMarkAsCollected = 0;
        }
      }

      if (idsToUpdate.length > 0) {
        await supabaseAdmin
          .from("execution_lignes")
          .update({ commission_statut: 'collectee' })
          .in("id", idsToUpdate);
      }
    }
  }
}

export async function retryExecutionLigne(ligneId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: ligne, error: ligneError } = await supabaseAdmin
    .from("execution_lignes")
    .select("*, executions(user_id)")
    .eq("id", ligneId)
    .single();

  if (ligneError || !ligne) return { success: false, error: "Ligne introuvable" };
  const userId = (ligne.executions as any).user_id;

  const { data: mappingsData } = await supabaseAdmin.from("gateway_mappings").select("*").eq("actif", true);
  const mappings = mappingsData || [];

  const { data: statusMappingsData } = await supabaseAdmin.from("gateway_status_mappings").select("*");
  const statusMappings = statusMappingsData || [];

  const poolRes = await buildGatewayPool(supabaseAdmin, userId);
  if (!poolRes.success) return poolRes;
  const { gatewayPool } = poolRes;
  
  if (!gatewayPool || gatewayPool.length === 0) return { success: false, error: "Aucune passerelle avec des fonds disponibles." };

  let remainingAmount = ligne.montant;
  let mainStatus = "echoue";
  let isFirst = true;

  for (const gateway of gatewayPool) {
    if (remainingAmount <= 0) break;
    if (gateway.balance <= 0) continue;

    const payoutAmount = Math.min(remainingAmount, gateway.balance);
    let ligneStatut = "en_cours";
    let ref = "";
    let errMsg = null;
    const passerelleName = gateway.conn.passerelle.toLowerCase();

    try {
      let cleanPhone = (ligne.destinataire_numero || "").replace(/[^0-9+]/g, '');
      let mapping = mappings.find((m:any) => m.reparto_reseau.toLowerCase() === ligne.destinataire_reseau.toLowerCase() && m.gateway.toLowerCase() === passerelleName);

      if (passerelleName === "kkiapay") {
        const keysObj = JSON.parse(gateway.decryptedKey);
        const { createAndSendKkiapayPayout } = await import("./kkiapay");
        const payoutRes = await createAndSendKkiapayPayout(keysObj, payoutAmount, ligne.destinataire_reseau, cleanPhone, ligne.destinataire_libelle);
        const st = payoutRes?.status || "PENDING";
        const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === st.toUpperCase());
        ligneStatut = foundStatus ? foundStatus.reparto_status : "en_cours";
        ref = payoutRes?.transactionId || "";
      } else if (passerelleName === "pawapay" && mapping) {
        const { createAndSendPawapayPayout } = await import("./pawapay");
        const payoutRes = await createAndSendPawapayPayout(gateway.decryptedKey, payoutAmount, mapping.gateway_correspondent, mapping.gateway_currency, cleanPhone);
        const extractedData = Array.isArray(payoutRes) ? payoutRes[0] : payoutRes;
        ref = extractedData?.payoutId || "";
        
        let pawaStatus = extractedData?.status || "PENDING";
        // Polling up to 10 seconds (5 x 2s)
        if ((pawaStatus === "PENDING" || pawaStatus === "ACCEPTED") && ref) {
          const { getPawapayPayoutStatus } = await import("./pawapay");
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusData = await getPawapayPayoutStatus(gateway.decryptedKey, ref);
              const trueStatus = statusData?.data?.status || statusData?.status;
              const extractedStatus = Array.isArray(statusData) ? statusData[0]?.status : trueStatus;
              pawaStatus = extractedStatus || pawaStatus;
              
              const currentMapping = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
              if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
            } catch(e) {}
          }
        }
        const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
        ligneStatut = foundStatus ? foundStatus.reparto_status : "en_cours";
        
      } else if (passerelleName === "fedapay" && mapping) {
        const { createAndSendPayout } = await import("./fedapay");
        const payoutRes = await createAndSendPayout(gateway.decryptedKey, payoutAmount, mapping.gateway_correspondent, mapping.gateway_currency, mapping.gateway_country_code, cleanPhone, ligne.destinataire_libelle);
        ref = payoutRes?.v1?.payout?.reference || payoutRes?.v1?.payout?.id?.toString() || payoutRes?.id?.toString() || "";
        
        let fedapayStatus = payoutRes?.v1?.payout?.status || payoutRes?.status || "pending";
        // Polling up to 10 seconds (5 x 2s)
        if ((fedapayStatus === "pending" || fedapayStatus === "approved" || fedapayStatus === "processing") && ref) {
          const { getFedaPayPayoutStatus } = await import("./fedapay");
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusData = await getFedaPayPayoutStatus(gateway.decryptedKey, ref);
              fedapayStatus = statusData?.v1?.payout?.status || statusData?.status || fedapayStatus;
              
              const currentMapping = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
              if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
            } catch(e) {}
          }
        }
        const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
        ligneStatut = foundStatus ? foundStatus.reparto_status : "en_cours";
      } else if (passerelleName === "magma onepay" && mapping) {
        const keysObj = JSON.parse(gateway.decryptedKey);
        const { createAndSendMagmaOnePayPayout } = await import("./magmaonepay");
        const payoutRes = await createAndSendMagmaOnePayPayout(keysObj, payoutAmount, mapping.gateway_correspondent, cleanPhone, ligne.destinataire_libelle);
        const magmaStatus = payoutRes?.data?.status || payoutRes?.status || "PENDING";
        const foundStatus = statusMappings.find((m:any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === magmaStatus.toLowerCase());
        ligneStatut = foundStatus ? foundStatus.reparto_status : "en_cours";
        ref = payoutRes?.data?.id || payoutRes?.id?.toString() || "";
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
        passerelle: gateway.conn.passerelle,
        destinataire_libelle: ligne.destinataire_libelle + (payoutAmount < ligne.montant ? ` (Part)` : ""),
        commission_statut: ligne.est_commission ? 'non_applicable' : (ligneStatut === 'reussi' ? 'due' : 'en_attente')
      }).eq("id", ligneId);
      isFirst = false;
    } else {
      await supabaseAdmin.from("execution_lignes").insert({
        execution_id: ligne.execution_id,
        destinataire_libelle: ligne.destinataire_libelle + ` (Part)`,
        destinataire_numero: ligne.destinataire_numero,
        destinataire_reseau: ligne.destinataire_reseau,
        montant: payoutAmount,
        statut: ligneStatut,
        reference_transaction: ref,
        erreur_message: errMsg,
        est_commission: ligne.est_commission,
        passerelle: gateway.conn.passerelle,
        commission_associee: ligne.est_commission ? 0 : Math.floor(payoutAmount * 0.05), // fallback commission
        commission_statut: ligne.est_commission ? 'non_applicable' : (ligneStatut === 'reussi' ? 'due' : 'en_attente')
      });
    }

    gateway.balance -= payoutAmount;
    remainingAmount -= payoutAmount;
  }

  // Check commission after retry
  let commissionFallbacks: any[] = [];
  const { data: adminSettings } = await supabaseAdmin.from("admin_settings").select("config_value").eq("config_key", "commission_numbers").single();
  if (adminSettings?.config_value && Array.isArray(adminSettings.config_value)) {
    commissionFallbacks = adminSettings.config_value.filter((n: any) => n.phone && n.network);
  }
  if (commissionFallbacks.length === 0) {
    if (process.env.REPARTO_COMMISSION_MSISDN && process.env.REPARTO_COMMISSION_OPERATEUR) {
      commissionFallbacks.push({ phone: process.env.REPARTO_COMMISSION_MSISDN, network: process.env.REPARTO_COMMISSION_OPERATEUR });
    }
  }

  if (commissionFallbacks.length > 0) {
    await collectPendingCommissions(supabaseAdmin, userId, commissionFallbacks, gatewayPool, mappings, statusMappings);
  }

  return { success: true, status: mainStatus };
}


