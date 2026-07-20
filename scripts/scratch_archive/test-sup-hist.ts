import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabaseAdmin
    .from("executions")
    .select("id, regle_id")
    .order("date_execution", { ascending: false })
    .limit(1);

  console.log('Error:', error);
  console.log('Last execution:', data);
}

run();
