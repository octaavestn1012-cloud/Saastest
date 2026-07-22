import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { decryptKey } from '@/lib/encryption';
import { processPayoutsForUser } from '@/lib/payout-engine';

export const maxDuration = 60; // Autorise Netlify Pro à maintenir l'exécution jusqu'à 60 secondes

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    
    // Récupérer le corps de la requête
    const bodyText = await req.text();
    const signature = req.headers.get('x-kkiapay-signature');
    
    // Connexion admin à Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier si l'utilisateur possède une connexion Kkiapay active
    const { data: conn } = await supabaseAdmin
      .from('connexions')
      .select('webhook_secret_chiffre')
      .eq('user_id', userId)
      .ilike('passerelle', 'kkiapay')
      .eq('statut', 'actif')
      .single();

    if (!conn) {
      return NextResponse.json({ error: 'Connexion Kkiapay introuvable ou inactive' }, { status: 404 });
    }

    if (!conn.webhook_secret_chiffre) {
      return NextResponse.json({ error: 'Secret Webhook non configuré pour cet utilisateur' }, { status: 400 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 401 });
    }

    // Déchiffrer le secret et vérifier la signature HMAC (Kkiapay utilise souvent sha256)
    const secret = decryptKey(conn.webhook_secret_chiffre);
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');

    if (signature !== expectedSignature) {
      console.error(`[Kkiapay Webhook] Signature invalide pour l'utilisateur ${userId}`);
      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        montant: 0,
        source: 'Kkiapay (Erreur Signature)',
        statut: 'echoue',
        date_reception: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch(e) {
      return NextResponse.json({ error: 'JSON Invalide' }, { status: 400 });
    }

    // Kkiapay envoie généralement le statut de la transaction
    const isSuccess = data?.status === 'SUCCESS' || data?.type === 'PAYMENT_SUCCESS';
    const rawAmount = data?.amount;
    const amount = Number(rawAmount);

    if (isSuccess && amount && amount > 0) {
      console.log(`[Kkiapay Webhook] Paiement entrant de ${amount} FCFA détecté pour l'utilisateur ${userId}`);
      
      // Sauvegarder la transaction en base de données pour l'historique des entrées
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        montant: amount,
        source: 'Kkiapay',
        statut: 'reussi',
        date_reception: new Date().toISOString()
      });

      if (txError) {
        console.error(`[Kkiapay Webhook] Erreur lors de l'enregistrement de la transaction:`, txError);
      }
      
      // Exécution synchrone pour éviter que Netlify/Vercel ne coupe l'exécution
      try {
        const result = await processPayoutsForUser(userId, amount, "a_chaque_entree", false, true);
        console.log("[Kkiapay Webhook] Répartition terminée:", result);
      } catch (err) {
        console.error("[Kkiapay Webhook] Erreur de répartition:", err);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("Kkiapay Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
