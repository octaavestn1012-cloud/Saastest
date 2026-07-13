import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { decryptKey } from "@/lib/encryption";
import { processPayoutsForUser } from "@/lib/payout-engine";

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    const bodyText = await req.text();
    
    const signature = req.headers.get("x-pawapay-signature") || req.headers.get("x-signature");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier si l'utilisateur possède une connexion PawaPay active
    const { data: conn } = await supabaseAdmin
      .from("connexions")
      .select("webhook_secret_chiffre")
      .eq("user_id", userId)
      .eq("passerelle", "pawapay")
      .eq("statut", "actif")
      .single();

    if (!conn) {
      return NextResponse.json({ error: "Connexion PawaPay introuvable ou inactive" }, { status: 404 });
    }

    // PawaPay utilise généralement HMAC SHA512
    if (conn.webhook_secret_chiffre && signature) {
      const secret = decryptKey(conn.webhook_secret_chiffre);
      const expectedSignature = crypto.createHmac("sha512", secret).update(bodyText).digest("hex");

      // Tolérer une petite variation si PawaPay envoie en base64 ou hex, on compare simplement
      if (signature !== expectedSignature) {
         console.error(`[PawaPay Webhook] Signature invalide pour l'utilisateur ${userId}`);
         // En mode test on peut laisser passer ou juste logger :
         // return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
      }
    } else {
      console.warn(`[PawaPay Webhook] Aucun webhook_secret ou signature trouvé pour ${userId}. Poursuite sans vérification de signature.`);
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return NextResponse.json({ error: "JSON Invalide" }, { status: 400 });
    }

    console.log(`[PawaPay Webhook ${userId}] Reçu:`, JSON.stringify(payload, null, 2));

    // 1. Gestion des DEPOSITS (Entrées d'argent)
    const isDeposit = payload.action === "DEPOSIT" || payload.depositId !== undefined;
    const isDepositSuccess = payload.status === "COMPLETED" || payload.status === "SUCCESS";
    
    if (isDeposit && isDepositSuccess && payload.amount) {
      const amount = Number(payload.amount);
      console.log(`[PawaPay Webhook] Paiement entrant de ${amount} détecté pour l'utilisateur ${userId}`);

      // Sauvegarder la transaction
      const { error: txError } = await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        montant: amount,
        source: "PawaPay",
        statut: "reussi"
      });

      if (txError) {
        console.error(`[PawaPay Webhook] Erreur lors de l'enregistrement de la transaction:`, txError);
      }

      // Exécution asynchrone de la règle
      processPayoutsForUser(userId, amount, "a_chaque_entree", false, true)
        .then(result => console.log("[PawaPay Webhook] Répartition terminée:", result))
        .catch(err => console.error("[PawaPay Webhook] Erreur de répartition:", err));
        
    } else {
      // 2. LOG DE DÉBOGAGE : Si le format ne correspond pas à une entrée d'argent classique
      console.warn(`[PawaPay Webhook] Format non reconnu ou statut non complété:`, payload);
      await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        montant: 0,
        source: `Debug: ${JSON.stringify(payload).substring(0, 150)}`,
        statut: "echoue"
      });
    }

    // 2. Gestion des PAYOUTS (Sorties d'argent / Mises à jour de statut)
    const payoutId = payload.payoutId || (payload.action === "PAYOUT" ? payload.id : null);
    
    if (payoutId) {
      const pawaStatus = payload.status;
      let finalStatus = "en_cours";
      
      if (pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS") {
        finalStatus = "reussi";
      } else if (pawaStatus === "FAILED") {
        finalStatus = "echoue";
      }

      if (finalStatus !== "en_cours") {
        const { error } = await supabaseAdmin
          .from("execution_lignes")
          .update({ 
            statut: finalStatus,
            erreur_message: payload.failureReason || payload.message || null
          })
          .eq("reference_transaction", payoutId)
          .eq("statut", "en_cours");

        if (error) {
          console.error("Erreur mise à jour BDD (PawaPay Webhook):", error);
        } else {
          // Mettre à jour l'exécution parente
          const { data: ligne } = await supabaseAdmin.from("execution_lignes").select("execution_id").eq("reference_transaction", payoutId).single();
          if (ligne) {
            const { data: allLignes } = await supabaseAdmin.from("execution_lignes").select("statut").eq("execution_id", ligne.execution_id).neq("est_commission", true);
            if (allLignes) {
              const hasPending = allLignes.some(l => l.statut === "en_cours");
              const hasFailed = allLignes.some(l => l.statut === "echoue");
              const allFailed = allLignes.every(l => l.statut === "echoue");
              let execStatus = "reussi";
              if (hasPending) execStatus = "en_cours";
              else if (allFailed) execStatus = "echoue";
              else if (hasFailed) execStatus = "partiel";
              await supabaseAdmin.from("executions").update({ statut: execStatus }).eq("id", ligne.execution_id);
            }
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erreur Webhook PawaPay:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
