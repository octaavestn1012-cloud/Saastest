import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { decryptKey } from '@/lib/encryption';
import { processPayoutsForUser } from '@/lib/payout-engine';

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    
    // Récupérer le corps de la requête
    const bodyText = await req.text();
    const signature = req.headers.get('x-fedapay-signature');
    
    // Connexion admin à Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier si l'utilisateur possède une connexion FedaPay active
    const { data: conn } = await supabaseAdmin
      .from('connexions')
      .select('webhook_secret_chiffre')
      .eq('user_id', userId)
      .eq('passerelle', 'fedapay')
      .eq('statut', 'actif')
      .single();

    if (!conn) {
      return NextResponse.json({ error: 'Connexion FedaPay introuvable ou inactive' }, { status: 404 });
    }

    if (!conn.webhook_secret_chiffre) {
      return NextResponse.json({ error: 'Secret Webhook non configuré pour cet utilisateur' }, { status: 400 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 401 });
    }

    // Déchiffrer le secret et vérifier la signature HMAC (X-Fedapay-Signature)
    const secret = decryptKey(conn.webhook_secret_chiffre);
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');

    if (signature !== expectedSignature) {
      console.error(`[FedaPay Webhook] Signature invalide pour l'utilisateur ${userId}`);
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch(e) {
      return NextResponse.json({ error: 'JSON Invalide' }, { status: 400 });
    }

    // FedaPay envoie souvent l'événement de cette façon
    // name: "transaction.created" ou "transaction.approved"
    // entity: { amount: 5000, status: "approved" }
    
    const isApproved = data?.entity?.status === 'approved' || data?.name === 'transaction.approved';
    const amount = data?.entity?.amount;

    if (isApproved && amount && amount > 0) {
      console.log(`[FedaPay Webhook] Paiement entrant de ${amount} FCFA détecté pour l'utilisateur ${userId}`);
      
      // Sauvegarder la transaction en base de données pour l'historique des entrées
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        montant: amount,
        source: 'FedaPay',
      });

      if (txError) {
        console.error(`[FedaPay Webhook] Erreur lors de l'enregistrement de la transaction:`, txError);
      }
      
      // Exécution asynchrone pour répondre rapidement à FedaPay
      processPayoutsForUser(userId, amount, "a_chaque_entree", false, true)
        .then(result => console.log("[FedaPay Webhook] Répartition terminée:", result))
        .catch(err => console.error("[FedaPay Webhook] Erreur de répartition:", err));
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("FedaPay Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
