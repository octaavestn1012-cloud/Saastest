"use server";

import { createClient } from "@/utils/supabase/server";
import { decryptKey } from "@/lib/encryption";
import { getFedaPayBalance } from "@/lib/fedapay";
import { getKkiapayBalance } from "@/lib/kkiapay";
import { getPawapayBalance } from "@/lib/pawapay";
import { getMagmaOnePayBalance } from "@/lib/magmaonepay";
import { getGlobalGatewaysStatus } from "@/app/actions/admin";

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

    const globalGatewaysRes = await getGlobalGatewaysStatus();
    const globalGateways = globalGatewaysRes.success ? globalGatewaysRes.data : {};

    if (connexions && connexions.length > 0) {
      const balancePromises = connexions.map(async (conn) => {
        if (!conn.cle_chiffree) return 0;
        
        // Si la passerelle est désactivée par le super-admin, on ne compte pas son solde
        if (globalGateways[conn.passerelle.toLowerCase()] === false) return 0;

        const decryptedKey = decryptKey(conn.cle_chiffree);
        try {
          const fetchBalance = async () => {
            if (conn.passerelle.toLowerCase() === "fedapay") {
              return await getFedaPayBalance(decryptedKey);
            } else if (conn.passerelle.toLowerCase() === "kkiapay") {
              const keysObj = JSON.parse(decryptedKey);
              return await getKkiapayBalance(keysObj);
            } else if (conn.passerelle.toLowerCase() === "pawapay") {
              return await getPawapayBalance(decryptedKey);
            } else if (conn.passerelle.toLowerCase() === "magma onepay") {
              const keysObj = JSON.parse(decryptedKey);
              return await getMagmaOnePayBalance(keysObj);
            }
            return 0;
          };

          // Race avec un timeout de 1500ms max pour éviter tout blocage de page
          const timeout = new Promise<number>((resolve) => setTimeout(() => resolve(0), 1500));
          return await Promise.race([fetchBalance(), timeout]);
        } catch (e) {
          console.error(`Impossible de récupérer le solde pour ${conn.passerelle}:`, e);
        }
        return 0;
      });

      const balances = await Promise.all(balancePromises);
      balance = balances.reduce((sum, b) => sum + b, 0);
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

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    // Exécution parallélisée de toutes les requêtes en une seule passe concourante
    const [
      balRes,
      { data: executions },
      { data: transactions },
      { data: profile },
      { data: monthExecutions },
      { data: activeRules }
    ] = await Promise.all([
      getLiveTotalBalance(),
      supabase.from("executions").select("id, execution_lignes (montant, statut)").eq("user_id", user.id),
      supabase.from("transactions").select("id, source, date_reception, montant").eq("user_id", user.id).order("date_reception", { ascending: false }).limit(5),
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
      supabase.from("executions").select("montant_total").eq("user_id", user.id).gte("date_execution", currentMonthStart.toISOString()),
      supabase.from("regles").select("nom, declencheur, declencheur_config").eq("user_id", user.id).eq("actif", true)
    ]);

    let balance = balRes?.balance || 0;

    let totalDistributed = 0;
    if (executions) {
      executions.forEach(exec => {
        if (exec.execution_lignes) {
          exec.execution_lignes.forEach((ligne: any) => {
            if (ligne.statut === "reussi") {
              totalDistributed += (Number(ligne.montant) || 0);
            }
          });
        }
      });
    }

    const reserve = balance;
    
    let monthlyVolume = 0;
    let monthlyExecutionsCount = 0;
    
    if (monthExecutions) {
      monthlyExecutionsCount = monthExecutions.length;
      monthlyVolume = monthExecutions.reduce((sum, exec) => sum + (Number(exec.montant_total) || 0), 0);
    }

    // 6. Prochaine répartition
    let nextRepartition = { text: "Aucune règle", ruleName: "Ajoutez une règle d'automatisation" };

    if (activeRules && activeRules.length > 0) {
      const aChaqueEntreeRule = activeRules.find(r => r.declencheur === "a_chaque_entree");
      if (aChaqueEntreeRule) {
        nextRepartition = { text: "À chaque entrée", ruleName: "Répartition automatique" };
      } else {
        let closestDate: Date | null = null;
        let closestRuleName = "";
        
        // --- GESTION DU FUSEAU HORAIRE (Bénin UTC+1) ---
        // On crée une date "fake UTC" qui représente l'heure exacte au Bénin.
        // Cela évite les bugs entre localhost (UTC+1) et Netlify (UTC).
        const nowUTC = new Date();
        const now = new Date(nowUTC.getTime() + 1 * 3600 * 1000); 
        
        activeRules.forEach(rule => {
          let nextDate: Date | null = null;
          const nowRef = new Date(now.getTime());
          
          if (rule.declencheur === "quotidien") {
            nextDate = new Date(now.getTime());
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            nextDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
            if (nextDate <= now) {
              nextDate.setUTCDate(nextDate.getUTCDate() + 1);
            }
          } else if (rule.declencheur === "hebdo" || rule.declencheur === "hebdomadaire") {
            nextDate = new Date(now.getTime());
            const dayOfWeek = parseInt(rule.declencheur_config?.dayOfWeek || "1");
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            nextDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
            const currentDay = nextDate.getUTCDay() || 7; // Dimanche = 7
            let distance = dayOfWeek - currentDay;
            if (distance < 0 || (distance === 0 && nextDate <= now)) {
              distance += 7;
            }
            nextDate.setUTCDate(nextDate.getUTCDate() + distance);
          } else if (rule.declencheur === "mensuel") {
            nextDate = new Date(now.getTime());
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            
            const tempDate = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0)); // Dernier jour du mois
            
            let actualDay = 1;
            if (rule.declencheur_config?.dayOfMonth === "last") {
              actualDay = tempDate.getUTCDate();
            } else {
              const dayOfMonth = parseInt(rule.declencheur_config?.dayOfMonth || "1");
              actualDay = Math.min(dayOfMonth, tempDate.getUTCDate());
            }
            
            nextDate.setUTCDate(actualDay);
            nextDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            if (nextDate <= nowRef) {
              nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
              const nextTempDate = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0));
              if (rule.declencheur_config?.dayOfMonth === "last") {
                nextDate.setUTCDate(nextTempDate.getUTCDate());
              } else {
                const dayOfMonth = parseInt(rule.declencheur_config?.dayOfMonth || "1");
                nextDate.setUTCDate(Math.min(dayOfMonth, nextTempDate.getUTCDate()));
              }
            }
          }
          
          if (nextDate && rule.declencheur !== "manuel") {
            if (!closestDate || nextDate < closestDate) {
              closestDate = nextDate;
              closestRuleName = rule.nom;
            }
          }
        });
        
        if (closestDate) {
          const isTomorrow = new Date(now.getTime());
          isTomorrow.setUTCDate(now.getUTCDate() + 1);
          
          let dateText = "";
          const closestDateStr = closestDate.toISOString().split('T')[0];
          const nowStr = now.toISOString().split('T')[0];
          const tomorrowStr = isTomorrow.toISOString().split('T')[0];
          
          if (closestDateStr === nowStr) {
            dateText = "Aujourd'hui";
          } else if (closestDateStr === tomorrowStr) {
            dateText = "Demain";
          } else {
            dateText = `Le ${closestDate.getUTCDate().toString().padStart(2, '0')}/${(closestDate.getUTCMonth() + 1).toString().padStart(2, '0')}`;
          }
          
          const h = closestDate.getUTCHours().toString().padStart(2, '0');
          const m = closestDate.getUTCMinutes().toString().padStart(2, '0');
          const timeText = `${h}:${m}`;
          
          nextRepartition = { text: `${dateText} à ${timeText}`, ruleName: "Répartition automatique" };
        } else {
          nextRepartition = { text: "Aucune auto", ruleName: "Règles manuelles uniquement" };
        }
      }
    }

    return { 
      data: {
        balance,
        totalDistributed,
        reserve,
        transactions: transactions || [],
        plan: profile?.plan || "gratuit",
        monthlyExecutionsCount,
        monthlyVolume,
        nextRepartition
      } 
    };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}
