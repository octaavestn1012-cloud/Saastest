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

    // Get all commission lines
    let query = supabase
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

    // Group users to fetch profiles
    const userIds = [...new Set(lines.map((l: any) => l.executions?.user_id).filter(Boolean))];
    
    // Fetch profiles to get email, name, is_blocked
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nom, is_blocked, role");

    // Let's use supabase service role to fetch users emails for admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);
    
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

export async function retryCommission(ligneId: string) {
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

    // Get the execution line
    const { data: ligne } = await supabaseAdmin.from("execution_lignes").select("*").eq("id", ligneId).single();
    if (!ligne || !ligne.est_commission) {
      return { success: false, error: "Ligne introuvable ou n'est pas une commission" };
    }

    if (ligne.statut === "reussi") {
      return { success: false, error: "Cette commission a déjà réussi" };
    }

    // Récupérer le user_id original depuis execution
    const { data: exec } = await supabaseAdmin.from("executions").select("user_id").eq("id", ligne.execution_id).single();
    if (!exec) return { success: false, error: "Exécution introuvable" };

    // Update statut to en_cours
    await supabaseAdmin.from("execution_lignes").update({ statut: "en_cours", erreur_message: null }).eq("id", ligneId);

    const { retryExecutionLigne } = await import("@/lib/payout-engine");
    const result = await retryExecutionLigne(ligneId);
    
    if (!result.success) {
      return { success: false, error: result.error || "Échec de la relance" };
    }

    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

