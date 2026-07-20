require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: conns } = await supabase.from('connexions').select('*');
  console.log("CONNEXIONS:");
  console.table(conns.map(c => ({
    id: c.id,
    passerelle: c.passerelle,
    statut: c.statut,
    nom: c.nom
  })));
}
run();
