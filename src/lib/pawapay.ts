// Ce fichier gère la communication avec l'API PawaPay pour les paiements (Payouts).

export async function createAndSendPawapayPayout(
  apiToken: string,
  amount: number,
  providerId: string,
  currency: string,
  cleanPhone: string
) {
  // Déterminer l'environnement (Sandbox ou Live) basé sur le token si possible.
  // Un JWT ne contient pas toujours le mot "sandbox" en clair.
  // On va d'abord tenter Sandbox, et si ça échoue sur une 401, on devrait idéalement tenter Live.
  // Pour le Payout, si on se trompe, ça va échouer. L'idéal est de déterminer l'URL dynamiquement.
  let baseUrl = "https://api.sandbox.pawapay.io/v2";
  
  // Cache en mémoire pour éviter les appels répétés qui causent des "fetch failed"
  const getBaseUrl = async (token: string) => {
    if ((global as any).__pawapayBaseUrl) return (global as any).__pawapayBaseUrl;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { 
          headers: { "Authorization": `Bearer ${token}` },
          cache: "no-store"
        });
        const url = res.status !== 401 ? "https://api.sandbox.pawapay.io/v2" : "https://api.pawapay.io/v2";
        (global as any).__pawapayBaseUrl = url;
        return url;
      } catch (e) {
        if (attempt === 2) {
          console.warn("PawaPay getBaseUrl fallback to sandbox after 3 fetch failed");
          return "https://api.sandbox.pawapay.io/v2";
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return "https://api.sandbox.pawapay.io/v2";
  };

  baseUrl = await getBaseUrl(apiToken);

  // Génération d'un UUID v4 pour payoutId (requis par PawaPay pour l'idempotence)
  const payoutId = crypto.randomUUID();

  const payload = {
    payoutId: payoutId,
    amount: amount.toString(),
    currency: currency,
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: cleanPhone,
        provider: providerId
      }
    }
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

export async function getPawapayPayoutStatus(apiToken: string, payoutId: string) {
  const getBaseUrl = async (token: string) => {
    if ((global as any).__pawapayBaseUrl) return (global as any).__pawapayBaseUrl;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { 
          headers: { "Authorization": `Bearer ${token}` },
          cache: "no-store"
        });
        const url = res.status !== 401 ? "https://api.sandbox.pawapay.io/v2" : "https://api.pawapay.io/v2";
        (global as any).__pawapayBaseUrl = url;
        return url;
      } catch (e) {
        if (attempt === 2) return "https://api.sandbox.pawapay.io/v2";
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return "https://api.sandbox.pawapay.io/v2";
  };
  const baseUrl = await getBaseUrl(apiToken);

  try {
    const response = await fetch(`${baseUrl}/payouts/${payoutId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur PawaPay Status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("PawaPay status exception:", error);
    throw error;
  }
}

export async function getPawapayBalance(apiToken: string) {
  const getBaseUrl = async (token: string) => {
    if ((global as any).__pawapayBaseUrl) return (global as any).__pawapayBaseUrl;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { 
          headers: { "Authorization": `Bearer ${token}` },
          cache: "no-store"
        });
        const url = res.status !== 401 ? "https://api.sandbox.pawapay.io/v2" : "https://api.pawapay.io/v2";
        (global as any).__pawapayBaseUrl = url;
        return url;
      } catch (e) {
        if (attempt === 2) return "https://api.sandbox.pawapay.io/v2";
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return "https://api.sandbox.pawapay.io/v2";
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
