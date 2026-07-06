import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const MONEROO_WEBHOOK_SECRET = process.env.MONEROO_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase config missing");
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // Initialiser le client Supabase avec la Service Role Key pour bypasser les RLS (Row Level Security) lors du Webhook
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("x-moneroo-signature");

    if (!MONEROO_WEBHOOK_SECRET) {
      console.error("MONEROO_WEBHOOK_SECRET is not set");
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
    }

    // Vérifier la signature (HMAC SHA512)
    const hash = crypto
      .createHmac("sha512", MONEROO_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Signature invalide !");
      return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Vérifier le type d'événement
    // Selon Moneroo, l'événement d'un paiement réussi est généralement "payment.successful" ou "transaction.successful"
    // Nous gérons le succès du paiement
    if (event.event === "payment.successful" || event.event === "transaction.successful") {
      const data = event.data;
      const userId = data?.metadata?.user_id;
      const purchasedPlan = data?.metadata?.plan || "pro";

      if (!userId) {
        console.error("Aucun user_id trouvé dans les métadonnées");
        return NextResponse.json({ error: "user_id manquant" }, { status: 400 });
      }

      // Calculer la date d'expiration (ex: +30 jours)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      // Mettre à jour l'utilisateur dans Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          plan: purchasedPlan, 
          // plan_expires_at: expirationDate.toISOString() 
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Erreur lors de la mise à jour Supabase :", profileError);
        return NextResponse.json({ error: "Erreur base de données (profil)" }, { status: 500 });
      }

      // Enregistrer la facture dans la table invoices
      const amountFcfa = data?.amount || (purchasedPlan === "business" ? 15000 : 5000);
      
      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          user_id: userId,
          plan: purchasedPlan,
          amount_fcfa: amountFcfa,
          status: "paid"
        }]);

      if (invoiceError) {
        // On logue l'erreur mais on ne bloque pas le retour de succès à Moneroo
        // car le plan a bien été mis à jour
        console.error("Erreur lors de l'enregistrement de la facture :", invoiceError);
      }

      console.log(`Plan ${purchasedPlan.toUpperCase()} activé pour l'utilisateur ${userId}`);
      return NextResponse.json({ received: true, status: "success" });
    }

    // Événement non géré
    return NextResponse.json({ received: true, status: "ignored" });

  } catch (error: any) {
    console.error("Erreur Webhook Moneroo :", error);
    return NextResponse.json({ error: "Erreur Serveur" }, { status: 500 });
  }
}
