"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function getCommissionSettings() {
  try {
    const supabase = createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    // Role check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Accès refusé" };

    const { data } = await supabase.from("admin_settings").select("config_value").eq("config_key", "commission_numbers").single();
    
    let numbers = data?.config_value || [
      { phone: "", network: "", country: "" },
      { phone: "", network: "", country: "" },
      { phone: "", network: "", country: "" }
    ];

    return { success: true, numbers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCommissionSettings(numbers: any[]) {
  try {
    const supabase = createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    // Role check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Accès refusé" };

    await supabase.from("admin_settings").upsert({
      config_key: "commission_numbers",
      config_value: numbers
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCommissionHistory(startDate?: string, endDate?: string) {
  try {
    const supabase = createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    // Role check
    const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile?.role !== "admin") return { success: false, error: "Accès refusé" };

    // Use service role to bypass RLS for super admin dashboard
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Get all commission lines across all clients
    let query = supabaseAdmin
      .from("execution_lignes")
      .select(`
        id,
        montant,
        statut,
        erreur_message,
        reference_transaction,
        created_at,
        destinataire_numero,
        destinataire_reseau,
        passerelle,
        executions (
          user_id
        )
      `)
      .eq("est_commission", true)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: lines, error } = await query;

    if (error) throw error;

    if (!lines || lines.length === 0) return { success: true, history: [] };

    // Auto-résolution en direct des commissions "en_cours" auprès des API passerelles (PawaPay / FedaPay)
    const pendingLines = lines.filter((l: any) => l.statut === "en_cours" && l.reference_transaction);
    if (pendingLines.length > 0) {
      try {
        const { data: userConns } = await supabaseAdmin.from("connexions").select("*").eq("statut", "actif");
        const { decryptKey } = await import("@/lib/encryption");
        const { getPawapayPayoutStatus } = await import("@/lib/pawapay");
        const { getFedaPayPayoutStatus } = await import("@/lib/fedapay");

        for (const line of pendingLines) {
          const uid = line.executions?.user_id;
          let pass = (line.passerelle || "").toLowerCase();
          if (!pass && line.erreur_message) {
            const errLower = line.erreur_message.toLowerCase();
            if (errLower.includes("pawapay")) pass = "pawapay";
            else if (errLower.includes("fedapay")) pass = "fedapay";
          }
          if (!uid || !pass) continue;

          const userConn = userConns?.find((c: any) => c.user_id === uid && c.passerelle.toLowerCase() === pass);
          if (!userConn || !userConn.cle_chiffree) continue;

          try {
            const decKey = decryptKey(userConn.cle_chiffree);
            let newStatut = "en_cours";
            let newErrMsg = line.erreur_message;

            if (pass === "pawapay") {
              const stRes = await getPawapayPayoutStatus(decKey, line.reference_transaction);
              const st = Array.isArray(stRes) ? stRes[0]?.status : (stRes?.data?.status || stRes?.status);
              if (st === "COMPLETED" || st === "SUCCESS") {
                newStatut = "reussi";
              } else if (st === "FAILED" || st === "REJECTED" || st === "PAWAPAY_WALLET_OUT_OF_FUNDS" || st === "DUPLICATE_PAYOUT_ID") {
                newStatut = "echoue";
                if (stRes?.failureReason) newErrMsg = stRes.failureReason;
              }
            } else if (pass === "fedapay") {
              const stRes = await getFedaPayPayoutStatus(decKey, line.reference_transaction);
              const fst = stRes?.v1?.payout?.status || stRes?.status;
              if (fst === "approved" || fst === "sent" || fst === "transferred") {
                newStatut = "reussi";
              } else if (fst === "failed" || fst === "canceled" || fst === "declined") {
                newStatut = "echoue";
              }
            }

            if (newStatut !== "en_cours") {
              line.statut = newStatut;
              line.erreur_message = newErrMsg;
              await supabaseAdmin
                .from("execution_lignes")
                .update({ statut: newStatut, erreur_message: newErrMsg })
                .eq("id", line.id);
            }
          } catch (e: any) {
            console.error(`[Admin History Resolve Error] line ${line.id}:`, e.message);
          }
        }
      } catch (e: any) {
        console.error("[Auto-Resolve Pending Commissions Error]", e.message);
      }
    }

    // Group users to fetch profiles
    const userIds = [...new Set(lines.map((l: any) => l.executions?.user_id).filter(Boolean))];
    
    // Fetch profiles to get email, name, is_blocked
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, is_blocked, role");

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = usersData?.users || [];

    const history = lines.map((l: any) => {
      const uid = l.executions?.user_id;
      const prof = profiles?.find((p: any) => p.id === uid);
      const aUser = authUsers.find((u: any) => u.id === uid);
      
      let pass = l.passerelle;
      if (!pass && l.erreur_message) {
        const errLower = l.erreur_message.toLowerCase();
        if (errLower.includes("pawapay")) pass = "pawapay";
        else if (errLower.includes("fedapay")) pass = "fedapay";
        else if (errLower.includes("kkiapay")) pass = "kkiapay";
      }

      return {
        id: l.id,
        date: l.created_at,
        amount: l.montant,
        status: l.statut,
        error: l.erreur_message,
        reference: l.reference_transaction,
        user_id: uid,
        user_name: prof?.nom || "Inconnu",
        user_email: aUser?.email || "Inconnu",
        is_blocked: prof?.is_blocked || false,
        dest_numero: l.destinataire_numero || "Inconnu",
        dest_reseau: l.destinataire_reseau || "Inconnu",
        passerelle: pass || "N/A"
      };
    });

    return { success: true, history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleUserBlock(userId: string, currentStatus: boolean) {
  try {
    const supabase = createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    // Role check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Accès refusé" };

    // Use service role to bypass RLS if needed, or if admin has RLS access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    await supabaseAdmin.from("profiles").update({ is_blocked: !currentStatus }).eq("id", userId);

    return { success: true, newStatus: !currentStatus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function forceSweepDebts() {
  try {
    const supabase = createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    // Role check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Accès refusé" };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Fetch all due commissions
    const { data: dueLines } = await supabaseAdmin
      .from("execution_lignes")
      .select("*, executions!inner(user_id)")
      .eq("commission_statut", "due")
      .in("statut", ["reussi", "partiel"]);

    if (!dueLines || dueLines.length === 0) {
      return { success: true, message: "Aucune dette en attente." };
    }

    const usersWithDebts = [...new Set(dueLines.map((l: any) => l.executions?.user_id))];

    const { data: mappingsData } = await supabaseAdmin.from("gateway_mappings").select("*").eq("actif", true);
    const mappings = mappingsData || [];

    const { data: statusMappingsData } = await supabaseAdmin.from("gateway_status_mappings").select("*");
    const statusMappings = statusMappingsData || [];

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

    if (commissionFallbacks.length === 0) {
      return { success: false, error: "Aucun numéro de réception de commission configuré." };
    }

    const { collectPendingCommissions, buildGatewayPool } = await import("@/lib/payout-engine");

    let processedCount = 0;
    for (const uId of usersWithDebts) {
      if (!uId) continue;
      const poolRes = await buildGatewayPool(supabaseAdmin, uId as string);
      if (poolRes.success && poolRes.gatewayPool && poolRes.gatewayPool.length > 0) {
        await collectPendingCommissions(
          supabaseAdmin,
          uId as string,
          commissionFallbacks,
          poolRes.gatewayPool,
          mappings,
          statusMappings
        ).catch(e => console.error("Erreur forceSweepDebts pour " + uId, e));
        processedCount++;
      }
    }

    return { success: true, message: `Recouvrement lancé pour ${processedCount} client(s).` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPendingDebtsSum() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autorisé" };
    
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Accès refusé" };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    const { data: dueLines } = await supabaseAdmin
      .from("execution_lignes")
      .select("commission_associee")
      .eq("commission_statut", "due")
      .in("statut", ["reussi", "partiel"]);

    if (!dueLines) return { success: true, total: 0 };

    const total = dueLines.reduce((sum: number, line: any) => sum + Number(line.commission_associee || 0), 0);
    return { success: true, total };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
