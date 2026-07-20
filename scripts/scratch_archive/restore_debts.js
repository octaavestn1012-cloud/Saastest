const { createClient } = require('@supabase/supabase-js');
class DummyWebSocket { constructor() {} }
global.WebSocket = DummyWebSocket;
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Recherche des commissions échouées (perdues)...");
  
  const { data: failedCommissions, error } = await supabase
    .from('execution_lignes')
    .select('*')
    .eq('est_commission', true)
    .eq('statut', 'echoue');

  if (error) {
    console.error("Erreur de requête:", error);
    return;
  }

  console.log(`Trouvé ${failedCommissions.length} commissions échouées.`);

  let restored = 0;

  for (const failedLigne of failedCommissions) {
    // Vérifier si un IOU a déjà été créé pour celle-ci
    const { data: existingIOU } = await supabase
      .from('execution_lignes')
      .select('id')
      .eq('execution_id', failedLigne.execution_id)
      .eq('est_commission', false)
      .eq('commission_statut', 'due')
      .eq('commission_associee', failedLigne.montant)
      .limit(1);

    if (existingIOU && existingIOU.length > 0) {
      console.log(`Dette déjà restaurée pour la commission de ${failedLigne.montant} FCFA.`);
      continue;
    }

    // Créer la dette (IOU)
    console.log(`Restauration de la dette de ${failedLigne.montant} FCFA...`);
    const { error: insertError } = await supabase.from('execution_lignes').insert({
      execution_id: failedLigne.execution_id,
      destinataire_libelle: "Dette Commission Restante (Suite échec)",
      destinataire_numero: failedLigne.destinataire_numero || "INCONNU",
      destinataire_reseau: failedLigne.destinataire_reseau || "INCONNU",
      montant: 0,
      statut: "reussi",
      est_commission: false,
      passerelle: failedLigne.passerelle,
      commission_associee: failedLigne.montant,
      commission_statut: 'due'
    });

    if (insertError) {
      console.error("Erreur lors de la restauration:", insertError);
    } else {
      restored++;
    }
  }

  console.log(`Terminé. ${restored} dettes restaurées.`);
}

run();
