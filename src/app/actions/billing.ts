"use server";

import { createClient } from "@/utils/supabase/server";

const MONEROO_API_URL = "https://api.moneroo.io/v1/payments/initialize";
const MONEROO_SECRET_KEY = process.env.MONEROO_SECRET_KEY;

export async function initializeMonerooPayment(planName: 'pro' | 'business') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autorisé", status: 401 };
    }

    if (!MONEROO_SECRET_KEY) {
      return { error: "Clé API Moneroo manquante", status: 500 };
    }

    // Le montant en fonction du plan
    const AMOUNT = planName === 'business' ? 15000 : 5000; 

    // Déterminer l'URL de retour (localhost ou prod)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://tranquil-mooncake-543f1c.netlify.app");
    const returnUrl = `${baseUrl}/billing?status=success`;

    const payload = {
      amount: AMOUNT,
      currency: "XOF",
      description: `Abonnement ${planName.toUpperCase()} - Réparto`,
      customer: {
        email: user.email || "client@reparto.com",
        first_name: user.user_metadata?.first_name || "Client",
        last_name: user.user_metadata?.last_name || "Reparto"
      },
      return_url: returnUrl,
      metadata: {
        user_id: user.id,
        plan: planName // on passe "pro" ou "business"
      }
    };

    const response = await fetch(MONEROO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MONEROO_SECRET_KEY}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data?.data?.checkout_url) {
      console.error("Moneroo Error:", data);
      const errorMessage = data?.message || data?.error || JSON.stringify(data) || "Erreur inconnue";
      return { error: `Erreur Moneroo: ${errorMessage}`, details: data };
    }

    return { checkout_url: data.data.checkout_url };
  } catch (error: any) {
    console.error("Payment Init Error:", error);
    return { error: "Erreur serveur", details: error.message };
  }
}
