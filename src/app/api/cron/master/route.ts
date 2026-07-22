import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const maxDuration = 26; // Autorise Netlify Pro à maintenir l'exécution jusqu'à 26 secondes (limite max)

import { createClient } from '@supabase/supabase-js';
import { processPayoutsForUser } from '@/lib/payout-engine';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    });

    // Charger toutes les règles planifiées avec le fuseau horaire de l'utilisateur
    const { data: rules, error } = await supabaseAdmin
      .from('regles')
      .select('user_id, id, declencheur, declencheur_config')
      .in('declencheur', ['quotidien', 'hebdomadaire', 'hebdo', 'mensuel'])
      .eq('actif', true);

    if (error) throw error;

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'Aucune règle planifiée' }, { status: 200 });
    }

    // Heure courante (serveur) - Repère UTC
    const now = new Date();
    
    // Contrôle d'idempotence : On vérifie si la règle a été exécutée dans les dernières 18 heures
    // Cela permet d'éviter les redondances de changement de date (minuit) ou les décalages de fuseau horaire
    const idempotencyWindow = new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString();

    const rulesToExecute = [];

    for (const rule of rules) {
      const config = rule.declencheur_config || {};
      if (!config.time) continue;
      
      let userTimezone = 'UTC';
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('timezone')
        .eq('id', rule.user_id)
        .maybeSingle();
      
      if (profile && profile.timezone) {
        userTimezone = profile.timezone;
      }

      // Conversion de l'heure courante (now) dans le fuseau horaire de l'utilisateur
      let tzDate;
      try {
        const tzString = now.toLocaleString("en-US", { timeZone: userTimezone });
        tzDate = new Date(tzString);
      } catch (e) {
        console.warn(`Timezone invalide pour user ${rule.user_id}: ${userTimezone}. Fallback sur UTC.`);
        const tzString = now.toLocaleString("en-US", { timeZone: 'UTC' });
        tzDate = new Date(tzString);
      }

      // Extraire les composantes de temps LOCALES pour cet utilisateur
      const currentMinutes = tzDate.getHours() * 60 + tzDate.getMinutes();
      const currentDayOfWeek = tzDate.getDay(); // 0 = Dimanche
      const currentDayOfMonth = tzDate.getDate();
      const isLastDayOfMonth = new Date(tzDate.getFullYear(), tzDate.getMonth() + 1, 0).getDate() === tzDate.getDate();

      const [ruleHours, ruleMins] = config.time.split(':').map(Number);
      const ruleTotalMinutes = ruleHours * 60 + ruleMins;

      // Est-ce qu'on est dans la "fenêtre" des 15 dernières minutes ?
      // Ex: si time=08:00, et current=08:05, diff=5 <= 15.
      // Si current=08:14, diff=14 <= 15.
      let diff = currentMinutes - ruleTotalMinutes;
      // Gérer le passage à minuit (si current=00:05 et rule=23:55)
      if (diff < 0) diff += 24 * 60; 

      // On déclenche si on est dans la fenêtre de 45 minutes SUIVANT l'heure programmée
      // (Github Actions peut avoir beaucoup de retard, on compense avec une large fenêtre. 
      // L'idempotence empêchera les doubles exécutions).
      if (diff >= 0 && diff <= 45) {
        
        // Vérifier les jours selon le déclencheur
        if (rule.declencheur === "hebdomadaire" || rule.declencheur === "hebdo") {
          // config.dayOfWeek (1 = Lundi, 0 = Dimanche)
          if (config.dayOfWeek !== undefined && Number(config.dayOfWeek) !== currentDayOfWeek) {
            continue;
          }
        }
        
        if (rule.declencheur === "mensuel") {
          if (config.dayOfMonth === "last") {
            if (!isLastDayOfMonth) continue;
          } else if (config.dayOfMonth !== undefined && Number(config.dayOfMonth) !== currentDayOfMonth) {
            continue;
          }
        }

        // On est au bon moment, on l'ajoute !
        rulesToExecute.push(rule);
      }
    }

    if (rulesToExecute.length === 0) {
      return NextResponse.json({ message: 'Aucune règle à exécuter à cette heure précise' }, { status: 200 });
    }

    // Lancer les répartitions pour chaque règle validée
    let processedCount = 0;
    
    for (const rule of rulesToExecute) {
      // Vérification Idempotence : est-ce que cette règle a déjà été exécutée dans les 18 dernières heures ?
      const { data: pastExec } = await supabaseAdmin
        .from('executions')
        .select('id')
        .eq('regle_id', rule.id)
        .gte('date_execution', idempotencyWindow)
        .limit(1);
        
      if (pastExec && pastExec.length > 0) {
        console.log(`Règle ${rule.id} déjà exécutée dans les dernières 18h. On ignore.`);
        continue;
      }

      console.log(`Exécution Master Cron pour la règle ${rule.id}`);
      await processPayoutsForUser(rule.user_id, 0, rule.id, true, true)
        .catch(err => console.error(`Erreur CRON pour user ${rule.user_id}:`, err));
      
      processedCount++;
    }

    return NextResponse.json({ success: true, processed: processedCount }, { status: 200 });
  } catch (error: any) {
    console.error("Master CRON Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
