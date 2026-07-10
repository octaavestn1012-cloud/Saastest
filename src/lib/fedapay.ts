export async function getFedaPayBalance(rawSecretKey: string) {
  let secretKey = rawSecretKey;
  if (rawSecretKey.trim().startsWith("{")) {
    try { secretKey = JSON.parse(rawSecretKey).secretKey; } catch(e){}
  }
  const isSandbox = secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

  try {
    const res = await fetch(`${baseUrl}/balances`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`FedaPay Balance Error: ${errorText}`);
    }

    const data = await res.json();
    
    // Pour aider au débogage local si le solde reste à 0
    console.log("FedaPay Balance API Response:", JSON.stringify(data).substring(0, 200) + "...");

    if (data && data["v1/balances"] && Array.isArray(data["v1/balances"]) && data["v1/balances"].length > 0) {
      // L'API FedaPay renvoie un tableau de sous-comptes (un par moyen de paiement : MTN, Moov, Carte, etc.)
      // Le "Solde Disponible Global" affiché sur le Dashboard FedaPay est la SOMME exacte de tous ces sous-comptes.
      const totalDisponible = data["v1/balances"].reduce((somme: number, b: any) => somme + (b.amount || 0), 0);
      return totalDisponible;
    }
    
    // Format 2: data.balances
    if (data && Array.isArray(data.balances) && data.balances.length > 0) {
      const activeBalance = data.balances.find((b: any) => b.amount > 0) || data.balances[0];
      return activeBalance?.amount || 0;
    }

    // Format 3: data.data (Standard JSON API)
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const activeBalance = data.data.find((b: any) => b.amount > 0) || data.data[0];
      return activeBalance?.amount || 0;
    }

    // Format 4: Objet direct
    if (data && typeof data.amount === 'number') {
      return data.amount;
    }

    console.warn("Format de solde FedaPay non reconnu ou vide.");
    return 0;
  } catch (error) {
    console.error("Error fetching FedaPay balance:", error);
    // On retourne 0 au lieu de throw pour éviter de faire planter tout le dashboard
    return 0;
  }
}

export async function createAndSendPayout(
  rawSecretKey: string, 
  amount: number, 
  fedapayMode: string, 
  currency: string, 
  countryCode: string, 
  cleanPhone: string, 
  name: string
) {
  let secretKey = rawSecretKey;
  if (rawSecretKey.trim().startsWith("{")) {
    try { secretKey = JSON.parse(rawSecretKey).secretKey; } catch(e){}
  }
  const isSandbox = secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

  try {
    const payload = {
      amount: Math.floor(amount),
      currency: { iso: currency },
      mode: fedapayMode,
      customer: {
        firstname: name,
        lastname: "Reparto",
        email: "reparto@saas.com",
        phone_number: {
          number: cleanPhone,
          country: countryCode
        }
      },
      send_now: true
    };

    const res = await fetch(`${baseUrl}/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("FedaPay Payout Error:", data);
      throw new Error(`FedaPay Payout Error: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error("Error creating FedaPay payout:", error);
    throw error;
  }
}

export async function getFedaPayPayoutStatus(rawSecretKey: string, payoutId: string) {
  let secretKey = rawSecretKey;
  if (rawSecretKey.trim().startsWith("{")) {
    try { secretKey = JSON.parse(rawSecretKey).secretKey; } catch(e){}
  }
  const isSandbox = secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

  try {
    const res = await fetch(`${baseUrl}/payouts/${payoutId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`FedaPay Payout Status Error: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error checking FedaPay payout status:", error);
    throw error;
  }
}
