require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  const { data: execs, error: errExecs } = await supabaseAdmin.from('executions').select('*').order('created_at', { ascending: false }).limit(1);
  console.log("Error:", errExecs);
  console.log("Executions:", execs);
  if (execs && execs.length > 0) {
    const { data: lignes } = await supabaseAdmin.from('execution_lignes').select('*').eq('execution_id', execs[0].id);
    console.log("Lignes:", lignes);
  }
}
checkDb();
