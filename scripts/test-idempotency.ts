import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const ruleId = "bac431e3-e1ab-4090-bed0-24ec6065a256";
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  console.log("todayStr:", todayStr);
  console.log("Querying gte:", todayStr + 'T00:00:00Z');

  const { data: pastExec, error } = await supabaseAdmin
    .from('executions')
    .select('id, date_execution, regle_id')
    .eq('regle_id', ruleId)
    .gte('date_execution', todayStr + 'T00:00:00Z')
    .limit(1);
    
  console.log("pastExec result:", pastExec);
  if (error) console.error("Error:", error);
}

run();
