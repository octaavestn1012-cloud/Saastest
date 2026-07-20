import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("executions")
      .update({ regle_id: '40b86c6a-f1fc-4316-97b4-b75fcf43ef36' })
      .eq("id", '0494b1ff-ddeb-4268-85fc-9580a7a54c84')
      .select();

    console.log('Update result:', data, 'Error:', error);
  } catch (e) {
    console.error(e);
  }
}

run();
