export async function getFedaPayBalance(secretKey: string) {
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
    // data.v1.balances is usually an array, return the first one or XOF
    if (data && data.v1 && data.v1.balances && data.v1.balances.length > 0) {
      return data.v1.balances[0].amount;
    }
    
    // Si format différent (dépend des versions d'API)
    if (data && data.data && data.data.length > 0) {
        return data.data[0].amount;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching FedaPay balance:", error);
    throw error;
  }
}

export async function createAndSendPayout(secretKey: string, amount: number, mode: string, phone: string, name: string) {
  const isSandbox = secretKey.includes("sandbox");
  const baseUrl = isSandbox ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

  const lowerMode = mode.toLowerCase();

  // Nettoyage robuste du numéro et détermination du pays
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  let countryCode = "BJ";
  
  if (cleanPhone.startsWith("+229")) {
    cleanPhone = cleanPhone.replace("+229", "");
    countryCode = "BJ";
  } else if (cleanPhone.startsWith("+225")) {
    cleanPhone = cleanPhone.replace("+225", "");
    countryCode = "CI";
  } else if (cleanPhone.startsWith("+221")) {
    cleanPhone = cleanPhone.replace("+221", "");
    countryCode = "SN";
  } else if (cleanPhone.startsWith("+228")) {
    cleanPhone = cleanPhone.replace("+228", "");
    countryCode = "TG";
  } else if (cleanPhone.startsWith("+237")) {
    cleanPhone = cleanPhone.replace("+237", "");
    countryCode = "CM";
  } else if (cleanPhone.startsWith("+223")) {
    cleanPhone = cleanPhone.replace("+223", "");
    countryCode = "ML";
  } else {
    if (lowerMode.includes("wave") || lowerMode.includes("orange ci")) countryCode = "CI";
  }

  // Mapping des modes réseau pour FedaPay
  let fedapayMode = "mtn_open";
  if (lowerMode.includes("moov")) fedapayMode = "moov";
  else if (lowerMode.includes("celtiis")) fedapayMode = "celtiis";
  else if (lowerMode.includes("wave")) fedapayMode = "wave_ci";
  else if (lowerMode.includes("orange")) fedapayMode = "orange";
  else if (lowerMode.includes("free")) fedapayMode = "free";
  else if (lowerMode.includes("tmoney")) fedapayMode = "tmoney";

  try {
    const payload = {
      amount: Math.floor(amount),
      currency: { iso: "XOF" },
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
