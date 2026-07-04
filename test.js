require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  const { data: conns, error } = await supabaseAdmin.from('connexions').select('*');
  console.log("Error:", error);
  console.log("Connexions:", conns);
}
checkDb();
