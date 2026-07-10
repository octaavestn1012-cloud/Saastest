import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const { data: execution, error } = await supabase
      .from("executions")
      .select(`
        id,
        statut,
        montant_total,
        execution_lignes (
          id,
          destinataire_libelle,
          destinataire_numero,
          destinataire_reseau,
          montant,
          statut,
          erreur_message,
          est_commission,
          reference_transaction
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !execution) {
      return NextResponse.json({ error: "Exécution introuvable" }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
