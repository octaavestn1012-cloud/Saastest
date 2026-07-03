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

  // Mapping des modes réseau (Moov, MTN, Celtiis, Wave)
  let fedapayMode = "mtn_open";
  const lowerMode = mode.toLowerCase();
  if (lowerMode.includes("moov")) fedapayMode = "moov";
  else if (lowerMode.includes("celtiis")) fedapayMode = "celtiis";
  else if (lowerMode.includes("wave")) fedapayMode = "wave_ci";

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
          number: phone,
          country: lowerMode.includes("wave") ? "CI" : "BJ"
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
