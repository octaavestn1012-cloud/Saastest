require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testHistorique() {
  const { data: conns } = await supabase.from('connexions').select('user_id').limit(1);
  if (!conns || conns.length === 0) return console.log("No connections");
  
  const userId = conns[0].user_id;
  
  const { data: executions, error } = await supabase
      .from("executions")
      .select(`
        *,
        regles ( nom, declencheur ),
        execution_lignes (
          id,
          destinataire_libelle,
          destinataire_numero,
          destinataire_reseau,
          montant,
          statut,
          erreur_message,
          reference_transaction,
          est_commission
        )
      `)
      .eq("user_id", userId)
      .order("date_execution", { ascending: false });
      
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Executions count:", executions?.length);
  }
}
testHistorique();
