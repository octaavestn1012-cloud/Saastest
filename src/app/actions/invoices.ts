"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserInvoices() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autorisé" };
    }

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur récupération factures:", error);
      return { error: "Impossible de charger les factures" };
    }

    return { invoices: data || [] };
  } catch (err: any) {
    console.error("Invoices Action Error:", err);
    return { error: "Erreur serveur" };
  }
}
