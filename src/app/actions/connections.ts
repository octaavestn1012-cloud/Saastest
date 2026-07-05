"use server";

import { createClient } from "@/utils/supabase/server";
import { encryptKey } from "@/lib/encryption";

export async function connectFedaPay(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Vous devez être connecté." };
    }

    const nom = formData.get("nom") as string;
    const secretKey = (formData.get("secretKey") as string).trim();

    if (!nom || !secretKey) {
      return { error: "Veuillez fournir un nom et une clé secrète." };
    }

    // 1. Déterminer l'environnement
    const isSandbox = secretKey.startsWith("sk_sandbox_");
    const isLive = secretKey.startsWith("sk_live_");

    if (!isSandbox && !isLive) {
      return { error: "Format de clé invalide. La clé doit commencer par sk_sandbox_ ou sk_live_" };
    }

    const baseUrl = isSandbox 
      ? "https://sandbox-api.fedapay.com/v1" 
      : "https://api.fedapay.com/v1";

    // 2. Vérifier la clé auprès de l'API FedaPay
    try {
      const response = await fetch(`${baseUrl}/customers`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FedaPay API Error:", response.status, errorText);
        return { error: `La clé API a été refusée par FedaPay. (${response.status})` };
      }
    } catch (e: any) {
      console.error("Fetch Exception:", e);
      return { error: `Impossible de joindre les serveurs: ${e.message}` };
    }

    // 3. Chiffrer la clé secrète
    const cleChiffree = encryptKey(secretKey);

    // 4. Enregistrer dans la base de données
    const { error: dbError } = await supabase
      .from("connexions")
      .insert({
        user_id: user.id,
        passerelle: "fedapay",
        nom: nom,
        statut: "actif",
        cle_chiffree: cleChiffree
      });

    if (dbError) {
      console.error("Erreur DB:", dbError);
      return { error: "Erreur lors de l'enregistrement dans la base de données." };
    }

    return { success: true };

  } catch (error: any) {
    console.error("Erreur FedaPay:", error);
    return { error: error.message || "Une erreur inattendue est survenue." };
  }
}
export async function deleteConnection(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non autorisé" };

    const { error } = await supabase.from("connexions").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function connectKkiapay(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Vous devez être connecté." };
    }

    const nom = formData.get("nom") as string;
    const publicKey = (formData.get("publicKey") as string || "").trim();
    const privateKey = (formData.get("privateKey") as string || "").trim();
    const secretKey = (formData.get("secretKey") as string || "").trim();

    if (!nom || !publicKey || !privateKey || !secretKey) {
      return { error: "Veuillez fournir le nom et toutes les clés (Publique, Privée, Secrète)." };
    }

    // Convert to JSON and encrypt
    const keysObj = { publicKey, privateKey, secretKey };
    const cleChiffree = encryptKey(JSON.stringify(keysObj));

    // Save to DB
    const { error: dbError } = await supabase
      .from("connexions")
      .insert({
        user_id: user.id,
        passerelle: "Kkiapay",
        nom: nom,
        statut: "actif",
        cle_chiffree: cleChiffree
      });

    if (dbError) {
      console.error("Erreur DB:", dbError);
      return { error: "Erreur lors de l'enregistrement dans la base de données." };
    }

    return { success: true };

  } catch (error: any) {
    console.error("Erreur Kkiapay:", error);
    return { error: error.message || "Une erreur inattendue est survenue." };
  }
}
