// Ce fichier gère la communication avec l'API PawaPay pour les paiements (Payouts).

export async function createAndSendPawapayPayout(
  apiToken: string,
  amount: number,
  method: string,
  phoneNumber: string,
  recipientName: string
) {
  // Déterminer l'environnement (Sandbox ou Live) basé sur le token si possible.
  // Un JWT ne contient pas toujours le mot "sandbox" en clair.
  // On va d'abord tenter Sandbox, et si ça échoue sur une 401, on devrait idéalement tenter Live.
  // Pour le Payout, si on se trompe, ça va échouer. L'idéal est de déterminer l'URL dynamiquement.
  let baseUrl = "https://api.sandbox.pawapay.io/v2";
  
  // On peut essayer de décoder le JWT pour voir s'il y a un indice, mais par défaut on teste Sandbox.
  // Si le token vient de la prod, le getPawapayBalance suivant échouera aussi.
  // Faisons une fonction utilitaire pour trouver la bonne URL.
  const getBaseUrl = async (token: string) => {
    const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { headers: { "Authorization": `Bearer ${token}` } });
    if (res.status !== 401) return "https://api.sandbox.pawapay.io/v2";
    return "https://api.pawapay.io/v2";
  };

  baseUrl = await getBaseUrl(apiToken);

  // Nettoyage du numéro
  let cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.replace("+", ""); // PawaPay préfère le format international sans le +
  }

  // Déterminer le Provider ID (à ajuster selon la documentation exacte PawaPay pour chaque pays/réseau)
  const lowerMethod = method.toLowerCase();
  let providerId = "MTN_MOMO_BEN"; // Exemple par défaut
  
  if (lowerMethod.includes("moov")) providerId = "MOOV_BEN";
  else if (lowerMethod.includes("mtn")) providerId = "MTN_MOMO_BEN";
  else if (lowerMethod.includes("orange") && lowerMethod.includes("ci")) providerId = "ORANGE_CI";
  else if (lowerMethod.includes("wave")) providerId = "WAVE_CI";
  else if (lowerMethod.includes("celtiis")) providerId = "CELTIIS_BEN";

  // Génération d'un UUID v4 pour payoutId (requis par PawaPay pour l'idempotence)
  const payoutId = crypto.randomUUID();

  const payload = {
    payoutId: payoutId,
    amount: amount.toString(),
    currency: "XOF",
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: cleanPhone,
        provider: providerId
      }
    },
    statementDescription: "Répartition via Réparto",
    reason: recipientName
  };

  try {
    const response = await fetch(`${baseUrl}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("PawaPay Payout Error:", errText);
      throw new Error(`Erreur PawaPay: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("PawaPay exception:", error);
    throw error;
  }
}

export async function getPawapayBalance(apiToken: string) {
  const getBaseUrl = async (token: string) => {
    const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { headers: { "Authorization": `Bearer ${token}` } });
    if (res.status !== 401) return "https://api.sandbox.pawapay.io/v2";
    return "https://api.pawapay.io/v2";
  };
  const baseUrl = await getBaseUrl(apiToken);

  try {
    // L'endpoint exact pour le solde est /v2/wallet-balances
    // On appelle sans préciser de pays pour récupérer tous les soldes généraux du marchand
    const response = await fetch(`${baseUrl}/wallet-balances`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      let totalBalance = 0;
      
      if (Array.isArray(data)) {
        // Boucler sur tous les soldes renvoyés pour accumuler tout ce qui est en XOF ou CFA
        data.forEach((b: any) => {
          if (b.currency === "XOF" || b.currency === "CFA") {
            totalBalance += Number(b.balance || b.availableBalance || 0);
          }
        });
      } else if (data && data.balances && Array.isArray(data.balances)) {
        data.balances.forEach((b: any) => {
          if (b.currency === "XOF" || b.currency === "CFA") {
            totalBalance += Number(b.balance || b.availableBalance || 0);
          }
        });
      }
      return totalBalance;
    } else {
      console.error(`[PawaPay] Echec solde général: ${response.status}`);
      return 0;
    }
  } catch (error) {
    console.error("Erreur générale récupération solde PawaPay:", error);
    return 0;
  }
}
