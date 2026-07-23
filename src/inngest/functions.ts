import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import { createAndSendPayout, getFedaPayPayoutStatus } from "@/lib/fedapay";
import { createAndSendKkiapayPayout } from "@/lib/kkiapay";
import { createAndSendPawapayPayout, getPawapayPayoutStatus } from "@/lib/pawapay";
import { sendPayoutReceiptEmail, sendAutomationReport } from "@/lib/email";
import { collectPendingCommissions } from "@/lib/payout-engine";

export const processPayoutsFunction = inngest.createFunction(
  { id: "process-payouts", concurrency: 1, triggers: [{ event: "app/payout.requested" }] },
  async ({ event, step }) => {
    const { 
      userId, userEmail, executionPlan, executionId, ruleName, 
      verifiedTotalBalance, commissionAmount, availableAfterCommission, 
      isAutomatic, config, commissionRate 
    } = event.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Charger les mappings
    const mappings = await step.run("fetch-mappings", async () => {
      const { data } = await supabaseAdmin.from("gateway_mappings").select("*").eq("actif", true);
      return data || [];
    });

    const statusMappings = await step.run("fetch-status-mappings", async () => {
      const { data } = await supabaseAdmin.from("gateway_status_mappings").select("*");
      return data || [];
    });

    const results: any[] = [];

    // Boucle d'exécution (la même que dans payout-engine.ts, mais gérée par Inngest)
    for (const executionStep of executionPlan) {
      const { target, amount, gateway } = executionStep;
      
      const stepResult = await step.run(`pay-${target.phone}-${target.label.replace(/[^a-zA-Z0-9]/g, '')}-${amount}`, async () => {
        let stepStatus = "en_cours";
        let stepRef = "";
        let stepError = null;
        let apiData = null;
        
        try {
          let cleanPhone = target.phone.replace(/[^0-9+]/g, '');
          const passerelleName = gateway.conn.passerelle.toLowerCase();
          
          let mapping = mappings.find((m: any) => 
            m.reparto_reseau.toLowerCase() === target.method.toLowerCase() && 
            m.gateway.toLowerCase() === passerelleName
          );

          if (!mapping && (passerelleName === "pawapay" || passerelleName === "fedapay")) {
             throw new Error(`Réseau non supporté par ${passerelleName} : ${target.method}`);
          }

          if (mapping && mapping.indicatif) {
            let phoneWithoutIndicatif = cleanPhone;
            const indicatifClean = mapping.indicatif.replace(/[^0-9+]/g, '');
            if (cleanPhone.startsWith(indicatifClean)) {
              phoneWithoutIndicatif = cleanPhone.substring(indicatifClean.length);
            } else if (cleanPhone.startsWith(indicatifClean.replace('+', ''))) {
              phoneWithoutIndicatif = cleanPhone.substring(indicatifClean.replace('+', '').length);
            }
            if (mapping.phone_digits_count && phoneWithoutIndicatif.length !== mapping.phone_digits_count) {
              throw new Error(`Le numéro ${target.phone} est invalide (${mapping.phone_digits_count} chiffres attendus).`);
            }
            if (!cleanPhone.startsWith(indicatifClean) && !cleanPhone.startsWith(indicatifClean.replace('+', ''))) {
               cleanPhone = indicatifClean.replace('+', '') + phoneWithoutIndicatif; 
            } else {
               cleanPhone = cleanPhone.replace('+', '');
            }
          }

          if (passerelleName === "kkiapay") {
            const keysObj = JSON.parse(gateway.decryptedKey);
            apiData = await createAndSendKkiapayPayout(keysObj, amount, target.method, target.phone, target.label);
            const currentKkiapayStatus = apiData?.status || "PENDING";
            const foundStatus = statusMappings.find((m: any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === currentKkiapayStatus.toUpperCase());
            stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";
            stepRef = apiData?.transactionId || apiData?.id?.toString() || "";
            
          } else if (passerelleName === "pawapay" && mapping) {
            let currency = mapping.gateway_currency || "XOF";
            const correspondent = (mapping.gateway_correspondent || "").toUpperCase();
            const centralAfricaCountries = ["CMR", "GAB", "COG", "TCD", "CAF", "GNQ"];
            if (centralAfricaCountries.some(c => correspondent.endsWith(`_${c}`))) {
              currency = "XAF";
            } else {
              const westAfricaCountries = ["BEN", "CIV", "SEN", "TGO", "BFA", "MLI", "NER", "GNB"];
              if (westAfricaCountries.some(c => correspondent.endsWith(`_${c}`))) {
                currency = "XOF";
              }
            }

            apiData = await createAndSendPawapayPayout(gateway.decryptedKey, amount, mapping.gateway_correspondent, currency, cleanPhone);
            const extractedData = Array.isArray(apiData) ? apiData[0] : apiData;
            stepRef = extractedData?.payoutId || extractedData?.id || "";
            
            let pawaStatus = extractedData?.status || "PENDING";
            if (extractedData?.failureReason) {
               stepError = extractedData.failureReason;
            }

            if ((pawaStatus === "PENDING" || pawaStatus === "ACCEPTED") && stepRef) {
              for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                  const statusData = await getPawapayPayoutStatus(gateway.decryptedKey, stepRef);
                  const trueStatus = statusData?.data?.status || statusData?.status;
                  const extractedStatus = Array.isArray(statusData) ? statusData[0]?.status : trueStatus;
                  pawaStatus = extractedStatus || pawaStatus;
                  
                  const extractedFailureReason = Array.isArray(statusData) ? statusData[0]?.failureReason : (statusData?.data?.failureReason || statusData?.failureReason);
                  if (extractedFailureReason) {
                    stepError = extractedFailureReason;
                  }

                  const currentMapping = statusMappings.find((m: any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
                  if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
                } catch(e) {}
              }
            }
            const foundStatus = statusMappings.find((m: any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toUpperCase() === pawaStatus.toUpperCase());
            stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";

          } else if (passerelleName === "fedapay" && mapping) {
            let currency = mapping.gateway_currency || "XOF";
            const correspondent = (mapping.gateway_correspondent || "").toUpperCase();
            const countryCode = (mapping.gateway_country_code || "").toUpperCase();
            const centralAfricaCountries = ["CMR", "GAB", "COG", "TCD", "CAF", "GNQ"];
            if (centralAfricaCountries.some(c => correspondent.endsWith(`_${c}`) || countryCode === c)) {
              currency = "XAF";
            } else {
              const westAfricaCountries = ["BEN", "CIV", "SEN", "TGO", "BFA", "MLI", "NER", "GNB"];
              if (westAfricaCountries.some(c => correspondent.endsWith(`_${c}`) || countryCode === c)) {
                currency = "XOF";
              }
            }

            apiData = await createAndSendPayout(gateway.decryptedKey, amount, mapping.gateway_correspondent, currency, mapping.gateway_country_code, cleanPhone, target.label);
            stepRef = apiData?.v1?.payout?.reference || apiData?.v1?.payout?.id?.toString() || apiData?.id?.toString() || "";
            
            let fedapayStatus = apiData?.v1?.payout?.status || apiData?.status || "pending";
            if ((fedapayStatus === "pending" || fedapayStatus === "approved" || fedapayStatus === "processing") && stepRef) {
              for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                  const statusData = await getFedaPayPayoutStatus(gateway.decryptedKey, stepRef);
                  fedapayStatus = statusData?.v1?.payout?.status || statusData?.status || fedapayStatus;
                  const currentMapping = statusMappings.find((m: any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
                  if (currentMapping && (currentMapping.reparto_status === "reussi" || currentMapping.reparto_status === "echoue")) break;
                } catch(e) {}
              }
            }
            const foundStatus = statusMappings.find((m: any) => m.gateway.toLowerCase() === passerelleName && m.gateway_status.toLowerCase() === fedapayStatus.toLowerCase());
            stepStatus = foundStatus ? foundStatus.reparto_status : "en_cours";
          }
        } catch (e: any) {
          stepStatus = "echoue";
          stepError = e.message;
        }

        const ligneCommission = Math.floor(amount * commissionRate);
        const ligneCommissionStatut = stepStatus === "reussi" ? "due" : "en_attente";

        // Sauvegarde en BDD
        await supabaseAdmin.from("execution_lignes").insert({ 
          execution_id: executionId, 
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

        return {
          target,
          dest: target.label,
          amount,
          status: stepStatus,
          error: stepError,
          passerelle: gateway.conn.passerelle
        };
      });

      results.push(stepResult);
    }

    // Traitement Final
    await step.run("finalize-execution", async () => {
      const clientResults = results.filter((r: any) => !r.target?.isCommission);
      
      const hasFailed = clientResults.some((r: any) => r.status === "echoue");
      const hasSuccess = clientResults.some((r: any) => r.status === "reussi" || r.status === "en_cours");
      const isAllSuccess = clientResults.every((r: any) => r.status === "reussi");

      let finalStatus = "en_cours";
      if (clientResults.length === 0) finalStatus = "reussi"; 
      else if (isAllSuccess) finalStatus = "reussi";
      else if (!hasSuccess) finalStatus = "echoue";
      else if (hasFailed) finalStatus = "partiel";

      await supabaseAdmin.from("executions").update({ statut: finalStatus }).eq("id", executionId);

      // Email
      if (userEmail) {
        const emailDetails = results.map((r: any) => ({
          name: r.dest + ` (via ${r.passerelle})`,
          network: "Mobile Money",
          amount: r.amount,
          status: r.status === "reussi" ? "SUCCESS" : r.status === "echoue" ? "FAILED" : "PENDING",
          errorReason: r.error
        }));

        const reportData = {
          ruleName,
          totalAvailable: verifiedTotalBalance,
          commissionAmount,
          totalAmount: availableAfterCommission,
          status: finalStatus === "reussi" ? "SUCCESS" : finalStatus === "partiel" ? "PARTIAL" : "FAILED",
          details: emailDetails
        };

        if (isAutomatic) {
          if (config?.notifyEmail !== false) {
            await sendAutomationReport(userEmail, reportData);
          }
        } else {
          await sendPayoutReceiptEmail(userEmail, reportData);
        }
      }

      // Commissions Asynchrones
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
          // Extraire uniquement le gatewayPool depuis l'executionPlan original pour éviter les duplications
          const uniqueGateways = Array.from(new Set(executionPlan.map((e:any) => e.gateway.conn.id)))
            .map(id => executionPlan.find((e:any) => e.gateway.conn.id === id).gateway);

          await collectPendingCommissions(
            supabaseAdmin,
            userId,
            commissionFallbacks,
            uniqueGateways,
            mappings,
            statusMappings
          ).catch(e => console.error("Erreur background collecte commissions:", e));
        }
      }
    });

    return { success: true, executionId };
  }
);
