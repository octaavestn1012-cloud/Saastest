"use server";

import { revalidatePath } from "next/cache";
import { getValidUserPlan } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";

export async function getRegles() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé", data: [] };

    const { data, error } = await supabase
      .from("regles")
      .select(`
        *,
        distributions (
          id,
          valeur,
          libelle,
          ordre,
          destinataire_id,
          destinataires (
            methode_mobile_money,
            numero
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return { error: "Erreur lors de la récupération des règles", data: [] };
    }

    return { data };
  } catch (e: any) {
    return { error: e.message, data: [] };
  }
}

export async function getRegleById(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non autorisé", data: null };

    const { data, error } = await supabase
      .from("regles")
      .select(`
        *,
        distributions (
          id,
          valeur,
          libelle,
          ordre,
          destinataire_id,
          destinataires (
            methode_mobile_money,
            numero
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      return { error: "Erreur lors de la récupération de la règle", data: null };
    }

    return { data };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}

export async function saveRegle(payload: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non autorisé" };

    const { id, nom, actif, declencheur, declencheur_config, mode, recipients } = payload;

    if (!nom || !declencheur || !mode || !recipients || recipients.length === 0) {
      return { error: "Données manquantes" };
    }

    // --- ENFORCEMENT DES LIMITES DU PLAN ---
    const currentPlan = await getValidUserPlan(user.id);
    
    if (currentPlan === "gratuit") {
      if (recipients.length > 3) {
        return { error: "Le plan Gratuit est limité à 3 destinataires maximum par répartition." };
      }
      
      if (!id || id.startsWith("temp_")) {
        const { count, error: countError } = await supabase
          .from("regles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
          
        if (countError) return { error: "Erreur lors de la vérification des limites." };
        if (count && count >= 6) {
          return { error: "Vous avez atteint la limite de 6 règles pour le plan Gratuit." };
        }

        if (declencheur !== "manuel") {
           const { count: autoCount } = await supabase
             .from("regles")
             .select("id", { count: "exact", head: true })
             .eq("user_id", user.id)
             .neq("declencheur", "manuel");
           if (autoCount && autoCount >= 3) {
             return { error: "Le plan Gratuit est limité à 3 règles automatiques maximum." };
           }
        }
      } else {
        if (declencheur !== "manuel") {
           const { data: existingRule } = await supabase.from("regles").select("declencheur").eq("id", id).single();
           if (existingRule && existingRule.declencheur === "manuel") {
               const { count: autoCount } = await supabase
                 .from("regles")
                 .select("id", { count: "exact", head: true })
                 .eq("user_id", user.id)
                 .neq("declencheur", "manuel");
               if (autoCount && autoCount >= 3) {
                 return { error: "Le plan Gratuit est limité à 3 règles automatiques maximum." };
               }
           }
        }
      }
    }
    // ---------------------------------------

    let regleId = id;

    if ((actif ?? true) && declencheur === "a_chaque_entree") {
      // Désactiver toutes les autres règles "a_chaque_entree" de cet utilisateur
      await supabase
        .from("regles")
        .update({ actif: false })
        .eq("user_id", user.id)
        .eq("declencheur", "a_chaque_entree")
        .neq("id", regleId || "");
    }

    // 1. Sauvegarder la règle
    const regleData = {
      user_id: user.id,
      nom,
      actif: actif ?? true,
      declencheur,
      declencheur_config: declencheur_config || null,
      mode
    };

    if (regleId && !regleId.startsWith("temp_")) {
      // Update
      const { error } = await supabase.from("regles").update(regleData).eq("id", regleId);
      if (error) return { error: error.message };
      
      // Nettoyer les anciennes distributions
      await supabase.from("distributions").delete().eq("regle_id", regleId);
    } else {
      // Insert
      const { data, error } = await supabase.from("regles").insert(regleData).select().single();
      if (error) return { error: error.message };
      regleId = data.id;
    }

    // 2. Traiter les destinataires et les distributions
    for (let i = 0; i < recipients.length; i++) {
      const rec = recipients[i];
      let destId = null;

      // Chercher si le numéro existe déjà pour cet utilisateur
      const { data: existingDest } = await supabase
        .from("destinataires")
        .select("id")
        .eq("user_id", user.id)
        .eq("numero", rec.phone)
        .single();

      if (existingDest) {
        destId = existingDest.id;
      } else {
        // Créer le destinataire à la volée
        const { data: newDest, error: destError } = await supabase
          .from("destinataires")
          .insert({
            user_id: user.id,
            libelle: rec.name,
            methode_mobile_money: rec.network,
            numero: rec.phone
          })
          .select()
          .single();

        if (destError) {
          console.error("Erreur création destinataire:", destError);
          continue; // on passe au suivant si erreur
        }
        destId = newDest.id;
      }

      // Créer la distribution
      await supabase.from("distributions").insert({
        regle_id: regleId,
        destinataire_id: destId,
        libelle: rec.name,
        valeur: rec.value,
        ordre: i
      });
    }

    // Revalidate paths to update UI instantly
    revalidatePath("/dashboard");
    revalidatePath("/rules");

    return { success: true, id: regleId };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteRegle(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non autorisé" };

    const { error } = await supabase.from("regles").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { error: error.message };
    
    revalidatePath("/dashboard");
    revalidatePath("/rules");
    
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function toggleRegle(id: string, actif: boolean) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non autorisé" };

    if (actif) {
      // Récupérer le déclencheur de la règle courante
      const { data: currentRule } = await supabase
        .from("regles")
        .select("declencheur")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
        
      if (currentRule && currentRule.declencheur === "a_chaque_entree") {
        // Désactiver toutes les autres règles "a_chaque_entree" de cet utilisateur
        await supabase
          .from("regles")
          .update({ actif: false })
          .eq("user_id", user.id)
          .eq("declencheur", "a_chaque_entree")
          .neq("id", id);
      }
    }

    const { error } = await supabase.from("regles").update({ actif }).eq("id", id).eq("user_id", user.id);
    if (error) return { error: error.message };
    
    revalidatePath("/dashboard");
    revalidatePath("/rules");
    
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
