import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptKey } from '@/lib/encryption';
import { getFedaPayBalance } from '@/lib/fedapay';
import { processPayoutsForUser } from '@/lib/payout-engine';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id manquant dans l'URL" }, { status: 400 });
    }

    const payload = await req.json();

    // FedaPay envoie des événements avec une propriété "name" (ex: transaction.approved)
    const eventName = payload?.name || payload?.event; 

    // On ne réagit qu'aux transactions réussies
    if (eventName === "transaction.approved" || eventName === "transaction.created") {
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 1. Récupérer la connexion FedaPay pour avoir la clé
      const { data: conn } = await supabaseAdmin
        .from("connexions")
        .select("cle_chiffree")
        .eq("user_id", userId)
        .eq("passerelle", "FedaPay")
        .eq("statut", "actif")
        .single();

      if (!conn || !conn.cle_chiffree) {
        return NextResponse.json({ error: "Connexion introuvable" }, { status: 404 });
      }

      const secretKey = decryptKey(conn.cle_chiffree);

      // 2. Récupérer le solde EXACT et DISPONIBLE chez FedaPay
      const availableBalance = await getFedaPayBalance(secretKey);

      if (availableBalance < 100) {
        return NextResponse.json({ message: "Solde insuffisant pour répartition" });
      }

      // 3. Déclencher le moteur de répartition
      const payoutResult = await processPayoutsForUser(userId, availableBalance);

      return NextResponse.json({ 
        message: "Webhook traité avec succès", 
        balance: availableBalance,
        result: payoutResult 
      });
    }

    return NextResponse.json({ message: "Événement ignoré" });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
