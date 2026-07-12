import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testCron() {
    const { data: rules, error } = await supabaseAdmin
      .from('regles')
      .select('user_id, id, declencheur, declencheur_config')
      .in('declencheur', ['quotidien', 'hebdomadaire', 'mensuel'])
      .eq('actif', true);

    if (error) {
        console.error("DB Error:", error);
        return;
    }
    
    console.log("Found rules:", rules?.length);

    if (!rules || rules.length === 0) return;

    const now = new Date();
    
    for (const rule of rules) {
      console.log(`Checking rule: ${rule.id} (Type: ${rule.declencheur})`);
      const config = rule.declencheur_config || {};
      if (!config.time) {
          console.log(`  -> SKIP: No config.time`);
          continue;
      }
      
      let userTimezone = 'UTC';
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('timezone')
        .eq('id', rule.user_id)
        .maybeSingle();
      
      if (profile && profile.timezone) {
        userTimezone = profile.timezone;
      }

      let tzDate;
      try {
        const tzString = now.toLocaleString("en-US", { timeZone: userTimezone });
        tzDate = new Date(tzString);
      } catch (e) {
        const tzString = now.toLocaleString("en-US", { timeZone: 'UTC' });
        tzDate = new Date(tzString);
      }

      console.log(`  User Timezone: ${userTimezone}`);
      console.log(`  Current Time in user TZ: ${tzDate.getHours()}:${tzDate.getMinutes()}`);
      console.log(`  Rule Time: ${config.time}`);

      const currentMinutes = tzDate.getHours() * 60 + tzDate.getMinutes();
      const [ruleHours, ruleMins] = config.time.split(':').map(Number);
      const ruleTotalMinutes = ruleHours * 60 + ruleMins;

      let diff = currentMinutes - ruleTotalMinutes;
      if (diff < 0) diff += 24 * 60; 

      console.log(`  Diff in minutes: ${diff}`);
      if (diff >= 0 && diff <= 45) {
          console.log("  -> WILL EXECUTE!");
      } else {
          console.log("  -> WILL NOT EXECUTE (diff not in [0, 45])");
      }
    }
}

testCron();
