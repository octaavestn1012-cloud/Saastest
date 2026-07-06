// Ce fichier gère la communication avec l'API Kkiapay pour les transferts (Reversements / Push Up).

export async function createAndSendKkiapayPayout(
  keys: { publicKey: string; privateKey: string; secretKey: string },
  amount: number,
  method: string,
  phoneNumber: string,
  recipientName: string
) {
  // L'URL exacte et le payload dépendent de la documentation officielle de l'API Kkiapay Push Up.
  // Ce code est une structure de base qui doit être adaptée une fois la documentation API confirmée.

  const isSandbox = keys.publicKey.includes("sandbox") || keys.secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox.api.kkiapay.me/api/v1" : "https://api.kkiapay.me/api/v1";

  const lowerMethod = method.toLowerCase();
  
  // Nettoyage du numéro
  let cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.replace("+", ""); // Kkiapay préfère sans le + (ex: 22990000000)
  }

  // Mapping des partenaires Kkiapay
  let partnerId = "MTNB";
  if (lowerMethod.includes("moov")) partnerId = "MOOV";
  else if (lowerMethod.includes("celtiis")) partnerId = "CELTIIS";

  // Pour Kkiapay Push Up, le format de la requête peut varier.
  const payload = {
    amount: amount,
    phone: cleanPhone,
    fullname: recipientName,
    partner_id: partnerId,
    description: "Répartition via Réparto"
  };

  try {
    const response = await fetch(`${baseUrl}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": keys.publicKey,
        "x-private-key": keys.privateKey,
        "x-secret-key": keys.secretKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Kkiapay Payout Error:", errText);
      throw new Error(`Erreur Kkiapay: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Kkiapay exception:", error);
    throw error;
  }
}

export async function getKkiapayBalance(keys: { publicKey: string; privateKey: string; secretKey: string }) {
  const isSandbox = keys.publicKey.includes("sandbox") || keys.secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox.api.kkiapay.me/api/v1" : "https://api.kkiapay.me/api/v1";

  try {
    const response = await fetch(`${baseUrl}/balance`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": keys.publicKey,
        "x-private-key": keys.privateKey,
        "x-secret-key": keys.secretKey
      }
    });

    if (!response.ok) {
      console.error("Erreur récupération solde Kkiapay:", response.statusText);
      return 0;
    }

    const data = await response.json();
    // Suppose que la réponse contient { balance: number } ou { amount: number }
    return data.balance || data.amount || data.solde || 0;
  } catch (error) {
    console.error("Erreur exception récupération solde Kkiapay:", error);
    return 0;
  }
}

