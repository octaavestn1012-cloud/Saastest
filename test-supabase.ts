import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('executions')
    .select('id, regle_id, regles(nom)')
    .order('date_execution', { ascending: false })
    .limit(5);

  console.log('Executions:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

run();
