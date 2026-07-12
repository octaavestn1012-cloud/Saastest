import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testIdempotency() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    console.log(`todayStr: ${todayStr}`);
    
    // Fetch recent executions to see what they look like
    const { data: execs } = await supabaseAdmin.from('executions').select('id, regle_id, date_execution').order('date_execution', { ascending: false }).limit(5);
    console.log("Recent executions:", execs);

    if (execs && execs.length > 0) {
        const ruleId = execs[0].regle_id;
        console.log(`Testing query for ruleId: ${ruleId} with gte ${todayStr + 'T00:00:00Z'}`);
        const { data: pastExec, error } = await supabaseAdmin
            .from('executions')
            .select('id, date_execution')
            .eq('regle_id', ruleId)
            .gte('date_execution', todayStr + 'T00:00:00Z')
            .limit(1);
            
        console.log("Query result:", pastExec);
        if (error) console.error("Error:", error);
    }
}

testIdempotency();
