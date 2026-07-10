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

export async function createAndSendPayout(rawSecretKey: string, amount: number, mode: string, phone: string, name: string) {
  let secretKey = rawSecretKey;
  if (rawSecretKey.trim().startsWith("{")) {
    try { secretKey = JSON.parse(rawSecretKey).secretKey; } catch(e){}
  }
  const isSandbox = secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

  const lowerMode = mode.toLowerCase();

  // Nettoyage robuste du numéro et détermination du pays
  let cleanPhone = phone.replace(/[^0-9+]/g, ''); // Extraction de l'indicatif pour FedaPay (Code pays ISO)
  let countryCode = "BJ"; // Par défaut
  if (cleanPhone.startsWith("+229")) { cleanPhone = cleanPhone.replace("+229", ""); countryCode = "BJ"; }
  else if (cleanPhone.startsWith("+226")) { cleanPhone = cleanPhone.replace("+226", ""); countryCode = "BF"; }
  else if (cleanPhone.startsWith("+225")) { cleanPhone = cleanPhone.replace("+225", ""); countryCode = "CI"; }
  else if (cleanPhone.startsWith("+245")) { cleanPhone = cleanPhone.replace("+245", ""); countryCode = "GW"; }
  else if (cleanPhone.startsWith("+223")) { cleanPhone = cleanPhone.replace("+223", ""); countryCode = "ML"; }
  else if (cleanPhone.startsWith("+227")) { cleanPhone = cleanPhone.replace("+227", ""); countryCode = "NE"; }
  else if (cleanPhone.startsWith("+221")) { cleanPhone = cleanPhone.replace("+221", ""); countryCode = "SN"; }
  else if (cleanPhone.startsWith("+228")) { cleanPhone = cleanPhone.replace("+228", ""); countryCode = "TG"; }
  else if (cleanPhone.startsWith("+237")) { cleanPhone = cleanPhone.replace("+237", ""); countryCode = "CM"; }
  else if (cleanPhone.startsWith("+236")) { cleanPhone = cleanPhone.replace("+236", ""); countryCode = "CF"; }
  else if (cleanPhone.startsWith("+242")) { cleanPhone = cleanPhone.replace("+242", ""); countryCode = "CG"; }
  else if (cleanPhone.startsWith("+241")) { cleanPhone = cleanPhone.replace("+241", ""); countryCode = "GA"; }
  else if (cleanPhone.startsWith("+240")) { cleanPhone = cleanPhone.replace("+240", ""); countryCode = "GQ"; }
  else if (cleanPhone.startsWith("+235")) { cleanPhone = cleanPhone.replace("+235", ""); countryCode = "TD"; }
  else if (cleanPhone.startsWith("+243")) { cleanPhone = cleanPhone.replace("+243", ""); countryCode = "CD"; }
  else if (cleanPhone.startsWith("+224")) { cleanPhone = cleanPhone.replace("+224", ""); countryCode = "GN"; }
  else if (cleanPhone.startsWith("+261")) { cleanPhone = cleanPhone.replace("+261", ""); countryCode = "MG"; }
  else if (cleanPhone.startsWith("+250")) { cleanPhone = cleanPhone.replace("+250", ""); countryCode = "RW"; }
  else if (cleanPhone.startsWith("+234")) { cleanPhone = cleanPhone.replace("+234", ""); countryCode = "NG"; }
  else if (cleanPhone.startsWith("+233")) { cleanPhone = cleanPhone.replace("+233", ""); countryCode = "GH"; }
  else {
    if (lowerMode.includes("wave") || lowerMode.includes("orange ci") || lowerMode.includes("mtn ci")) countryCode = "CI";
    else if (lowerMode.includes("sn")) countryCode = "SN";
    else if (lowerMode.includes("cm")) countryCode = "CM";
  }

  // Mapping des modes réseau pour FedaPay
  let fedapayMode = "mtn_open";
  if (lowerMode.includes("moov")) fedapayMode = "moov";
  else if (lowerMode.includes("celtiis")) fedapayMode = "celtiis";
  else if (lowerMode.includes("wave")) fedapayMode = "wave_ci";
  else if (lowerMode.includes("orange")) fedapayMode = "orange";
  else if (lowerMode.includes("free")) fedapayMode = "free";
  else if (lowerMode.includes("tmoney")) fedapayMode = "tmoney";

  // Détermination de la devise
  let currency = "XOF";
  if (["CM", "CF", "CG", "GA", "GQ", "TD"].includes(countryCode)) currency = "XAF";
  else if (countryCode === "CD") currency = "CDF";
  else if (countryCode === "GN") currency = "GNF";
  else if (countryCode === "MG") currency = "MGA";
  else if (countryCode === "RW") currency = "RWF";
  else if (countryCode === "NG") currency = "NGN";
  else if (countryCode === "GH") currency = "GHS";

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
