import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const ruleId = "f8496972-51cf-4eed-a964-640374489540";
  const todayStr = "2026-07-12";
  
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
