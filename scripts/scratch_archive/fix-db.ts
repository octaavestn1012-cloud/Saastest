import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: executions } = await supabaseAdmin.from('executions').select('id, regle_id, created_at').order('created_at', { ascending: false }).limit(2);
  const { data: rules } = await supabaseAdmin.from('regles').select('id, nom, created_at').order('created_at', { ascending: false }).limit(2);
  
  console.log('Executions:', executions);
  console.log('Rules:', rules);

  if (executions && executions[0] && rules && rules[0]) {
      const exec = executions[0];
      const rule = rules[0];
      if (!exec.regle_id) {
          console.log(`Fixing execution ${exec.id} to rule ${rule.id} (${rule.nom})`);
          await supabaseAdmin.from('executions').update({ regle_id: rule.id }).eq('id', exec.id);
          console.log('Fixed!');
      }
  }
}

run();
