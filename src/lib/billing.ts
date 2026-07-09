import { createClient } from "@supabase/supabase-js";

/**
 * Récupère le plan valide d'un utilisateur.
 * Si le plan est 'pro' ou 'business' mais que la date d'expiration est dépassée,
 * rétrograde automatiquement l'utilisateur à 'gratuit' en base et retourne 'gratuit'.
 */
export async function getValidUserPlan(userId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return "gratuit";
  }

  let currentPlan = profile.plan || "gratuit";

  // Vérifier l'expiration si on est sur un plan payant
  if (currentPlan === "pro" || currentPlan === "business") {
    if (profile.plan_expires_at) {
      const expirationDate = new Date(profile.plan_expires_at);
      const now = new Date();

      if (now > expirationDate) {
        // Le plan a expiré, rétrogradation à gratuit
        await supabaseAdmin
          .from("profiles")
          .update({ plan: "gratuit" }) // On pourrait aussi vider plan_expires_at
          .eq("id", userId);
        
        currentPlan = "gratuit";
        console.log(`Plan expiré pour l'utilisateur ${userId}. Rétrogradé en gratuit.`);
      }
    } else {
      // Pas de date d'expiration définie, mais on est sur un plan payant ?
      // Pour des raisons de sécurité, on devrait peut-être le remettre à gratuit,
      // mais on le laisse passer pour éviter de bloquer un utilisateur légitime si oubli.
      // Dans le futur : imposer l'expiration.
    }
  }

  return currentPlan;
}

/**
 * Calcule le taux de commission basé sur le plan.
 */
export function getCommissionRate(plan: string): number {
  if (plan === "business") return 0.004; // 0.4%
  if (plan === "pro") return 0.008;      // 0.8%
  return 0.019;                          // 1.9% (Gratuit)
}
