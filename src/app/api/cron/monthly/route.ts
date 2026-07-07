import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { processPayoutsForUser } from '@/lib/payout-engine';

export async function GET(req: Request) {
  try {
    // Vérification de sécurité (Vercel Cron envoie cet en-tête)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Trouver toutes les règles actives avec déclencheur "mensuel"
    const { data: rules, error } = await supabaseAdmin
      .from('regles')
      .select('user_id, id')
      .eq('declencheur', 'mensuel')
      .eq('actif', true);

    if (error) throw error;

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'Aucune règle mensuelle à exécuter' }, { status: 200 });
    }

    // Lancer les répartitions pour chaque utilisateur
    // On passe availableAmount = 0 pour que le moteur prenne tout le solde disponible
    const promises = rules.map(rule => 
      processPayoutsForUser(rule.user_id, 0, rule.id, true)
        .catch(err => console.error(`Erreur CRON Mensuel pour user ${rule.user_id}:`, err))
    );

    await Promise.allSettled(promises);

    return NextResponse.json({ success: true, processed: rules.length }, { status: 200 });
  } catch (error: any) {
    console.error("CRON Monthly Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
