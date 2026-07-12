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

    // 1. Récupérer le solde de toutes les passerelles connectées
    const balRes = await getLiveTotalBalance();
    let balance = balRes.balance || 0;


    // 2. Calculer le total réparti (uniquement les distributions vraiment réussies)
    const { data: executions } = await supabase
      .from("executions")
      .select(`
        id,
        execution_lignes (
          montant,
          statut
        )
      `)
      .eq("user_id", user.id);

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

    // 4. Récupérer le plan de l'utilisateur
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
    
    // 5. Statistiques du mois courant (pour les limites du plan gratuit)
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const { data: monthExecutions } = await supabase
      .from("executions")
      .select("montant_total")
      .eq("user_id", user.id)
      .gte("date_execution", currentMonthStart.toISOString());
      
    let monthlyVolume = 0;
    let monthlyExecutionsCount = 0;
    
    if (monthExecutions) {
      monthlyExecutionsCount = monthExecutions.length;
      monthlyVolume = monthExecutions.reduce((sum, exec) => sum + (Number(exec.montant_total) || 0), 0);
    }

    // 6. Prochaine répartition
    const { data: activeRules } = await supabase
      .from("regles")
      .select("nom, declencheur, declencheur_config")
      .eq("user_id", user.id)
      .eq("actif", true);

    let nextRepartition = { text: "Aucune règle", ruleName: "Ajoutez une règle d'automatisation" };

    if (activeRules && activeRules.length > 0) {
      const aChaqueEntreeRule = activeRules.find(r => r.declencheur === "a_chaque_entree");
      if (aChaqueEntreeRule) {
        nextRepartition = { text: "À chaque entrée", ruleName: "Répartition automatique" };
      } else {
        let closestDate: Date | null = null;
        let closestRuleName = "";
        const now = new Date();
        
        activeRules.forEach(rule => {
          let nextDate = new Date();
          if (rule.declencheur === "quotidien") {
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            if (nextDate <= now) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
          } else if (rule.declencheur === "hebdo") {
            const dayOfWeek = parseInt(rule.declencheur_config?.dayOfWeek || "1");
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            const currentDay = nextDate.getDay() || 7; // Dimanche = 7
            let distance = dayOfWeek - currentDay;
            if (distance < 0 || (distance === 0 && nextDate <= now)) {
              distance += 7;
            }
            nextDate.setDate(nextDate.getDate() + distance);
          } else if (rule.declencheur === "mensuel") {
            const dayOfMonth = parseInt(rule.declencheur_config?.dayOfMonth || "1");
            const time = rule.declencheur_config?.time || "00:00";
            const [hours, minutes] = time.split(':');
            // Gérer les mois courts
            const tempDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
            const actualDay = Math.min(dayOfMonth, tempDate.getDate());
            nextDate.setDate(actualDay);
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            if (nextDate <= now) {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
          }
          
          if (rule.declencheur !== "manuel") {
            if (!closestDate || nextDate < closestDate) {
              closestDate = nextDate;
              closestRuleName = rule.nom;
            }
          }
        });
        
        if (closestDate) {
          const isTomorrow = new Date(now);
          isTomorrow.setDate(now.getDate() + 1);
          
          let dateText = "";
          if (closestDate.toDateString() === now.toDateString()) {
            dateText = "Aujourd'hui";
          } else if (closestDate.toDateString() === isTomorrow.toDateString()) {
            dateText = "Demain";
          } else {
            dateText = `Le ${closestDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
          }
          
          const timeText = closestDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
