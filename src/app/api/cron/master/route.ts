import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Charger toutes les règles planifiées
    const { data: rules, error } = await supabaseAdmin
      .from('regles')
      .select('user_id, id, declencheur, declencheur_config')
      .in('declencheur', ['quotidien', 'hebdomadaire', 'mensuel'])
      .eq('actif', true);

    if (error) throw error;

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'Aucune règle planifiée' }, { status: 200 });
    }

    // Heure courante (serveur)
    const now = new Date();
    // On travaille en heure locale ou UTC. Faisons simple : heure UTC + 1 (pour le fuseau d'Afrique de l'Ouest / Paris par défaut pour l'exemple)
    // Mais pour la précision, on utilise l'heure UTC. L'utilisateur a saisi une heure dans son fuseau local, on va supposer que c'est l'heure du navigateur.
    // Idéalement on devrait gérer les fuseaux horaires (timezone).
    // Pour l'instant on compare simplement l'heure courante (hh:mm) avec une petite marge (ex: 15 minutes).
    // Si le master cron tourne à 14:00, et que rule.time = "14:00", on exécute.
    
    // Obtenir la date au format YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];
    
    // Obtenir l'heure au format HH:mm
    // On prend l'heure courante, on arrondit à la dizaine la plus proche pour éviter les décalages de secondes.
    // Ou bien on parse et on voit si la différence en minutes est <= 15.
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
    
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
    const currentDayOfMonth = now.getDate();

    const rulesToExecute = [];

    for (const rule of rules) {
      const config = rule.declencheur_config || {};
      if (!config.time) continue;

      const [ruleHours, ruleMins] = config.time.split(':').map(Number);
      const ruleTotalMinutes = ruleHours * 60 + ruleMins;

      // Est-ce qu'on est dans la "fenêtre" des 15 dernières minutes ?
      // Ex: si time=08:00, et current=08:05, diff=5 <= 15.
      // Si current=08:14, diff=14 <= 15.
      let diff = currentMinutes - ruleTotalMinutes;
      // Gérer le passage à minuit (si current=00:05 et rule=23:55)
      if (diff < 0) diff += 24 * 60; 

      // On déclenche si on est dans la fenêtre de 5 minutes SUIVANT l'heure programmée
      // (Car le cron tourne toutes les 5 minutes, ex: 00, 05, 10, 15).
      if (diff >= 0 && diff < 6) {
        
        // Vérifier les jours selon le déclencheur
        if (rule.declencheur === "hebdomadaire") {
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
      // Vérification Idempotence : est-ce que cette règle a déjà été exécutée AUJOURD'HUI ?
      const { data: pastExec } = await supabaseAdmin
        .from('executions')
        .select('id')
        .eq('regle_id', rule.id)
        .gte('date_execution', todayStr + 'T00:00:00Z')
        .limit(1);
        
      if (pastExec && pastExec.length > 0) {
        console.log(`Règle ${rule.id} déjà exécutée aujourd'hui. On ignore.`);
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
