"use server";

import { createClient } from "@/utils/supabase/server";
import { processPayoutsForUser, processQuickPayouts } from "@/lib/payout-engine";
import { revalidatePath } from "next/cache";

export async function executeQuickRepartitionAction(amountFcfa: number, targets: any[], mode: string) {
  try {
    const supabase = createClient();
    let { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError && userError.name === 'AuthRetryableFetchError') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        user = session.user;
        userError = null;
      }
    }

    if (!user) {
      console.error("Auth error in action:", userError);
      throw new Error("Non autorisé: " + (userError?.message || "Session expirée"));
    }

    const result = await processQuickPayouts(user.id, amountFcfa, targets, mode);
    if (!result.success) {
      require('fs').appendFileSync('error_log.txt', new Date().toISOString() + ' - Quick Error: ' + result.error + '\n');
      throw new Error(result.error);
    }

    revalidatePath("/dashboard");
    revalidatePath("/historique");
    return result;
  } catch (error: any) {
    require('fs').appendFileSync('error_log.txt', new Date().toISOString() + ' - Catch Error: ' + error.message + '\n');
    console.error("Execute error:", error);
    throw new Error(error.message || "Erreur lors de l'exécution");
  }
}

export async function executeRepartitionAction(amountFcfa: number, ruleId?: string) {
  try {
    const supabase = createClient();
    let { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError && userError.name === 'AuthRetryableFetchError') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        user = session.user;
        userError = null;
      }
    }

    if (!user) {
      console.error("Auth error in rule action:", userError);
      throw new Error("Non autorisé: " + (userError?.message || "Session expirée"));
    }

    // On déclenche le moteur de répartition manuel
    // "manuel" cherchera une règle avec déclencheur "manuel"
    // S'il n'y en a pas, on pourrait retomber sur "a_chaque_entree"
    let result;
    if (ruleId) {
       result = await processPayoutsForUser(user.id, amountFcfa, ruleId, true);
    } else {
       // Force Next.js recompile for payout-engine
       result = await processPayoutsForUser(user.id, amountFcfa, "manuel");
       if (!result.success && result.error?.includes("Aucune règle active")) {
         result = await processPayoutsForUser(user.id, amountFcfa, "a_chaque_entree");
       }
    }

    if (!result.success) {
      throw new Error(result.error);
    }

    revalidatePath("/dashboard");
    revalidatePath("/historique");

    return result;
  } catch (error: any) {
    console.error("Execute error:", error);
    throw new Error(error.message || "Erreur lors de l'exécution");
  }
}

export async function updateExecutionRuleId(executionId: string, regleId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("executions")
      .update({ regle_id: regleId })
      .eq("id", executionId)
      .eq("user_id", user.id);

    if (error) throw error;
    revalidatePath("/historique");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Update execution error:", error);
    return { success: false, error: error.message };
  }
}

export async function checkExecutionStatusesAction(executionId: string, pendingTargets: any[]) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non autorisé' };

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: passerelles } = await supabaseAdmin
      .from('config_passerelles')
      .select('*')
      .eq('user_id', user.id)
      .eq('actif', true);

    if (!passerelles || passerelles.length === 0) return { success: true, updates: [] };

    const { decryptApiKey } = await import('@/lib/encryption');
    const { getPawapayPayoutStatus } = await import('@/lib/pawapay');
    const { getFedaPayPayoutStatus } = await import('@/lib/fedapay');

    const updates: any[] = [];
    let hasChanges = false;

    for (const target of pendingTargets) {
      if (!target.stepRef || !target.passerelle) continue;
      
      const gateway = passerelles.find((p: any) => p.passerelle.toLowerCase() === target.passerelle.toLowerCase());
      if (!gateway) continue;

      const decryptedKey = decryptApiKey(gateway.api_key);
      let newStatus = 'en_cours';

      try {
        if (gateway.passerelle.toLowerCase() === 'pawapay') {
          const statusData = await getPawapayPayoutStatus(decryptedKey, target.stepRef);
          const pawaStatus = statusData?.status || 'PENDING';
          newStatus = pawaStatus === 'FAILED' ? 'echoue' : (pawaStatus === 'COMPLETED' || pawaStatus === 'SUCCESS') ? 'reussi' : 'en_cours';
        } else if (gateway.passerelle.toLowerCase() === 'fedapay') {
          const statusData = await getFedaPayPayoutStatus(decryptedKey, target.stepRef);
          const fedapayStatus = statusData?.v1?.payout?.status || statusData?.status || 'pending';
          newStatus = fedapayStatus === 'failed' ? 'echoue' : fedapayStatus === 'sent' ? 'reussi' : 'en_cours';
        }
      } catch (e) {
        // Ignorer les erreurs de polling
      }

      if (newStatus !== 'en_cours') {
        hasChanges = true;
        await supabaseAdmin.from('execution_lignes')
          .update({ statut: newStatus })
          .eq('execution_id', executionId)
          .eq('reference_transaction', target.stepRef);
      }

      updates.push({ dest: target.dest, newStatus });
    }

    if (hasChanges) {
      const { data: allLines } = await supabaseAdmin.from('execution_lignes').select('statut, est_commission').eq('execution_id', executionId);
      if (allLines) {
        const clientLines = allLines.filter((l: any) => !l.est_commission);
        const hasFailed = clientLines.some((l: any) => l.statut === 'echoue');
        const hasSuccess = clientLines.some((l: any) => l.statut === 'reussi' || l.statut === 'en_cours');
        const isAllSuccess = clientLines.every((l: any) => l.statut === 'reussi');
        
        let finalStatus = 'en_cours';
        if (clientLines.length === 0) finalStatus = 'reussi';
        else if (isAllSuccess) finalStatus = 'reussi';
        else if (!hasSuccess) finalStatus = 'echoue';
        else if (hasFailed) finalStatus = 'partiel';
        
        await supabaseAdmin.from('executions').update({ statut: finalStatus }).eq('id', executionId);
      }
    }

    return { success: true, updates };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
