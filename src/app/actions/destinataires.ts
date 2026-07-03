"use server";

import { createClient } from "@/utils/supabase/server";

export async function getDestinataires() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autorisé", data: [] };
    }

    const { data, error } = await supabase
      .from("destinataires")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching destinataires:", error);
      return { error: "Impossible de récupérer les destinataires", data: [] };
    }

    return { data };
  } catch (error) {
    console.error(error);
    return { error: "Erreur serveur", data: [] };
  }
}

export async function saveDestinataire(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autorisé" };
    }

    const id = formData.get("id") as string | null;
    const libelle = formData.get("libelle") as string;
    const reseau = formData.get("reseau") as string;
    const numero = formData.get("numero") as string;

    if (!libelle || !reseau || !numero) {
      return { error: "Veuillez remplir tous les champs obligatoires." };
    }

    const payload = {
      user_id: user.id,
      libelle,
      methode_mobile_money: reseau,
      numero
    };

    if (id && id !== "undefined" && id !== "null" && id !== "") {
      // Update
      const { error } = await supabase
        .from("destinataires")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id); // Sécurité supplémentaire

      if (error) return { error: error.message };
    } else {
      // Insert
      const { error } = await supabase
        .from("destinataires")
        .insert(payload);

      if (error) return { error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Save error:", error);
    return { error: error.message };
  }
}

export async function deleteDestinataire(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autorisé" };
    }

    const { error } = await supabase
      .from("destinataires")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Erreur lors de la suppression." };
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
