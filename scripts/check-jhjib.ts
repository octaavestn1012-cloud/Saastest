import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: rules } = await supabaseAdmin.from('regles').select('*').eq('nom', 'jhjib').limit(1);
  if (!rules || rules.length === 0) { console.log("rule not found"); return; }
  const ruleId = rules[0].id;
  
  const { data: execs } = await supabaseAdmin
    .from('executions')
    .select('id, created_at, date_execution, regle_id')
    .eq('regle_id', ruleId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Execs for jhjib:", execs);
}

run();
