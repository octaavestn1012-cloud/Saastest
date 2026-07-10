import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Webhook Handler for PawaPay
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Log for debugging
    console.log("Webhook PawaPay Reçu:", JSON.stringify(payload, null, 2));

    // PawaPay usually sends 'payoutId' and 'status'
    const payoutId = payload.payoutId || payload.id;
    const pawaStatus = payload.status; // 'COMPLETED', 'FAILED', etc.

    if (!payoutId) {
      return NextResponse.json({ message: "No payoutId found" }, { status: 400 });
    }

    let finalStatus = "en_cours";
    if (pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS") {
      finalStatus = "reussi";
    } else if (pawaStatus === "FAILED") {
      finalStatus = "echoue";
    }

    // Initialize Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Mettre à jour la ligne d'exécution
    if (finalStatus !== "en_cours") {
      const { data, error } = await supabaseAdmin
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
        console.log(`Paiement ${payoutId} mis à jour avec le statut: ${finalStatus}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erreur Webhook PawaPay:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
