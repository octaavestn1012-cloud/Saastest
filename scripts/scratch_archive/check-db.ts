
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const { data: lignes } = await supabase.from("execution_lignes")
    .select("id, destinataire_libelle, destinataire_numero, montant, statut, est_commission, commission_associee, commission_statut, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log(JSON.stringify(lignes, null, 2));
}
run();

