"use server";

import { createClient } from "@/utils/supabase/server";
import { PlanId } from "@/lib/types/domain";

// Vérification de sécurité réutilisable
async function verifyAdminAccess() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error("Non autorisé");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Accès refusé. Vous n'êtes pas administrateur.");
  }

  return supabase;
}

export async function getAdminKPIs() {
  try {
    await verifyAdminAccess(); // Vérifie que l'utilisateur est bien admin

    // Pour le dashboard Admin, on doit utiliser la clé de service (Service Role)
    // car le client normal (RLS) bloque l'accès aux données des autres utilisateurs.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    // 1. Calcul du MRR (Revenu Récurrent Mensuel)
    const { data: profiles, error: pError } = await supabaseAdmin
      .from("profiles")
      .select("plan");

    if (pError) throw pError;

    let totalUsers = 0;
    let gratuitCount = 0;
    let proCount = 0;
    let businessCount = 0;

    profiles.forEach(p => {
      totalUsers++;
      if (p.plan === 'gratuit') gratuitCount++;
      if (p.plan === 'pro') proCount++;
      if (p.plan === 'business') businessCount++;
    });

    const mrr = (proCount * 5000) + (businessCount * 15000);

    // 2. Volume et Chart (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: executions, error: eError } = await supabaseAdmin
      .from("executions")
      .select("montant_total, statut, date_execution")
      .in("statut", ["reussi", "partiel"]);

    if (eError) throw eError;

    let totalVolumeHistory = 0;
    let totalVolumeThisMonth = 0;
    
    // Pour le graphique
    const dailyVolume: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyVolume[dateStr] = 0;
    }

    executions?.forEach(ex => {
      totalVolumeHistory += (ex.montant_total || 0);
      
      const exDate = new Date(ex.date_execution);
      if (exDate >= startOfMonth) {
        totalVolumeThisMonth += (ex.montant_total || 0);
      }

      if (exDate >= thirtyDaysAgo) {
        const dateStr = exDate.toISOString().split('T')[0];
        if (dailyVolume[dateStr] !== undefined) {
          dailyVolume[dateStr] += (ex.montant_total || 0);
        }
      }
    });

    const chartData = Object.keys(dailyVolume)
      .sort() // Chronological order
      .map(date => ({
        date,
        volume: dailyVolume[date]
      }));

    // 3. Commissions
    const { data: commissionLines, error: cError } = await supabaseAdmin
      .from("execution_lignes")
      .select("montant, statut, executions!inner(date_execution)")
      .eq("est_commission", true)
      .eq("statut", "reussi");

    if (cError) throw cError;

    let totalCommissionsThisMonth = 0;
    let totalCommissionsHistory = 0;

    commissionLines?.forEach((c: any) => {
      totalCommissionsHistory += (c.montant || 0);
      
      const exDate = new Date(c.executions.date_execution);
      if (exDate >= startOfMonth) {
        totalCommissionsThisMonth += (c.montant || 0);
      }
    });

    // 4. Success Rate (Toutes les lignes d'exécution)
    const { data: allLignes } = await supabaseAdmin
      .from("execution_lignes")
      .select("statut")
      .neq("est_commission", true); // On exclut les commissions pour la stat client

    let successCount = 0;
    let failedCount = 0;
    allLignes?.forEach(l => {
      if (l.statut === "reussi") successCount++;
      if (l.statut === "echoue") failedCount++;
    });
    const totalProcessed = successCount + failedCount;
    const successRate = totalProcessed === 0 ? 100 : (successCount / totalProcessed) * 100;

    // 5. Gateways & Règles actives
    const { count: activeGatewaysCount } = await supabaseAdmin
      .from("connexions")
      .select("*", { count: "exact", head: true })
      .eq("statut", "actif");

    const { count: activeRulesCount } = await supabaseAdmin
      .from("regles")
      .select("*", { count: "exact", head: true })
      .eq("actif", true);

    return {
      success: true,
      data: {
        mrr,
        totalUsers,
        gratuitCount,
        proCount,
        businessCount,
        totalVolumeHistory,
        totalVolumeThisMonth,
        totalCommissionsHistory,
        totalCommissionsThisMonth,
        successRate: Math.round(successRate * 10) / 10,
        activeGatewaysCount: activeGatewaysCount || 0,
        activeRulesCount: activeRulesCount || 0
      }
    };
  } catch (err: any) {
    console.error("Erreur getAdminKPIs:", err);
    return { success: false, error: err.message };
  }
}

export async function getAdminUsers() {
  try {
    await verifyAdminAccess();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        nom,
        plan,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (profileError) throw profileError;

    // Fetch aggregates per user
    const { data: executions } = await supabaseAdmin.from("executions").select("user_id, montant_total").in("statut", ["reussi", "partiel"]);
    const { data: connexions } = await supabaseAdmin.from("connexions").select("user_id").eq("statut", "actif");
    const { data: regles } = await supabaseAdmin.from("regles").select("user_id").eq("actif", true);

    const usersWithEmail = profiles.map(p => {
      const authUser = authUsers.users.find(u => u.id === p.id);
      
      const userVolume = executions?.filter(e => e.user_id === p.id).reduce((sum, e) => sum + (e.montant_total || 0), 0) || 0;
      const userGateways = connexions?.filter(c => c.user_id === p.id).length || 0;
      const userRules = regles?.filter(r => r.user_id === p.id).length || 0;

      return {
        ...p,
        email: authUser?.email || "Email inconnu",
        volume: userVolume,
        gateways: userGateways,
        rules: userRules
      };
    });

    return { success: true, data: usersWithEmail };
  } catch (err: any) {
    console.error("Erreur getAdminUsers:", err);
    return { success: false, error: err.message };
  }
}

export async function getAdminFailedLogs() {
  try {
    await verifyAdminAccess();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    // On récupère les lignes d'exécution échouées avec le nom de l'utilisateur (via une jointure)
    const { data: logs, error } = await supabaseAdmin
      .from("execution_lignes")
      .select(`
        id,
        destinataire_libelle,
        montant,
        erreur_message,
        statut,
        executions (
          user_id,
          date_execution
        )
      `)
      .eq("statut", "echoue")
      .order('id', { ascending: false })
      .limit(20);

    if (error) throw error;

    return { success: true, data: logs };
  } catch (err: any) {
    console.error("Erreur getAdminFailedLogs:", err);
    return { success: false, error: err.message };
  }
}
