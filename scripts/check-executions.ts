import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: executions, error } = await supabaseAdmin
    .from("executions")
    .select("id, created_at, date_execution, regle_id, statut")
    .order("created_at", { ascending: false })
    .limit(10);
    
  console.log("Last 10 Executions:", JSON.stringify(executions, null, 2));
  if (error) console.error("Error:", error);
}

run();
