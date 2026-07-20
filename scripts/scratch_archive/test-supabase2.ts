import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: destinataires, error } = await supabase.from('destinataires').select('*').limit(1);
  if (error) {
    console.error('Error fetching destinataires:', error);
  } else {
    console.log('Destinataires schema sample row keys:', destinataires && destinataires[0] ? Object.keys(destinataires[0]) : 'No rows found');
    console.log('Sample row:', destinataires && destinataires[0]);
  }
}

run();
