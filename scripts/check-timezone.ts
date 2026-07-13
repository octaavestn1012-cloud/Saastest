import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const ruleId = "bac431e3-e1ab-4090-bed0-24ec6065a256";
  const { data: rule } = await supabaseAdmin.from('regles').select('user_id, declencheur_config').eq('id', ruleId).single();
  const { data: profile } = await supabaseAdmin.from('profiles').select('timezone').eq('id', rule!.user_id).single();
  
  console.log("Rule:", rule);
  console.log("Profile Timezone:", profile);
}

run();
