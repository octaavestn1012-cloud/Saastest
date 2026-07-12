// Ce fichier gère la communication avec l'API Magma OnePay

export async function getMagmaOnePayBalance(keys: { privateKey: string; secretKey: string }) {
  // MagmaOnePay peut utiliser des clés différentes pour la sandbox, ou une URL différente.
  // En attendant de confirmer avec la doc exacte, on pointe vers la production ou une URL générique.
  const isSandbox = keys.privateKey.toLowerCase().includes("test") || keys.privateKey.toLowerCase().includes("sandbox");
  const baseUrl = isSandbox ? "https://api.magmaonepay.com/v1" : "https://api.magmaonepay.com/v1"; // A ajuster si l'URL sandbox est différente

  try {
    const response = await fetch(`${baseUrl}/balance`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${keys.privateKey}`,
        "X-User-Secret": keys.secretKey
      }
    });

    if (!response.ok) {
      console.error("Erreur récupération solde MagmaOnePay:", response.statusText);
      return 0;
    }

    const data = await response.json();
    // On extrait le solde depuis la réponse (à ajuster selon la structure exacte renvoyée par MagmaOnePay)
    return data.data?.balance || data.balance || data.amount || data.solde || 0;
  } catch (error) {
    console.error("Erreur exception récupération solde MagmaOnePay:", error);
    return 0;
  }
}

export async function createAndSendMagmaOnePayPayout(
  keys: { privateKey: string; secretKey: string },
  amount: number,
  network: string,
  phone: string,
  description: string
) {
  const isSandbox = keys.privateKey.toLowerCase().includes("test") || keys.privateKey.toLowerCase().includes("sandbox");
  const baseUrl = isSandbox ? "https://api.magmaonepay.com/v1" : "https://api.magmaonepay.com/v1";

  try {
    let cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Payload générique pour MagmaOnePay (à affiner selon leur doc)
    const payload = {
      amount: amount,
      payee: cleanPhone, // Ou "phone", "destination", selon leur doc
      network: network,
      description: description,
      currency: "XOF" // MagmaOnePay gère-t-il d'autres devises ?
    };

    const response = await fetch(`${baseUrl}/execute-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${keys.privateKey}`,
        "X-User-Secret": keys.secretKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MagmaOnePay Payout Error:", errText);
      throw new Error(`Erreur MagmaOnePay: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("MagmaOnePay exception:", error);
    throw error;
  }
}
