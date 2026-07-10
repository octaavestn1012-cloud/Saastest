import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { processPayoutsForUser } from './src/lib/payout-engine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('connexions').select('user_id').eq('passerelle', 'pawapay').eq('statut', 'actif').limit(1);
  if (!data || !data.length) return console.log('no pawapay user');
  const userId = data[0].user_id;
  
  console.log("Calling processPayoutsForUser for", userId);
  try {
      const result = await processPayoutsForUser(userId, 4845720, 'manuel');
      console.log(JSON.stringify(result, null, 2));
  } catch(e) {
      console.error(e);
  }
}
test();
