"use server";

import { createClient } from "@/utils/supabase/server";

export async function saveUserTimezone(timezone: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    // Fetch current timezone to avoid unnecessary updates
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.timezone === timezone) {
      return { success: true, message: "Déjà à jour" };
    }

    // Update timezone
    const { error } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Erreur saveUserTimezone:", error);
    return { success: false, error: error.message };
  }
}
