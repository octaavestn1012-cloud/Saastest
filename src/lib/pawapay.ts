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
  let providerId = "MTN_MOMO_BEN"; // Par défaut

  if (lowerMethod.includes("orange")) {
    if (cleanPhone.startsWith("221") || lowerMethod.includes("sn")) providerId = "ORANGE_SEN";
    else if (cleanPhone.startsWith("237") || lowerMethod.includes("cm")) providerId = "ORANGE_CMR";
    else if (cleanPhone.startsWith("226") || lowerMethod.includes("bf")) providerId = "ORANGE_BF";
    else if (cleanPhone.startsWith("223") || lowerMethod.includes("ml")) providerId = "ORANGE_ML";
    else if (cleanPhone.startsWith("224") || lowerMethod.includes("gn")) providerId = "ORANGE_GN";
    else if (cleanPhone.startsWith("243") || lowerMethod.includes("cd")) providerId = "ORANGE_CD";
    else if (cleanPhone.startsWith("261") || lowerMethod.includes("mg")) providerId = "ORANGE_MG";
    else if (cleanPhone.startsWith("236") || lowerMethod.includes("cf")) providerId = "ORANGE_CF";
    else providerId = "ORANGE_CIV"; // Par défaut 225
  }
  else if (lowerMethod.includes("mtn")) {
    if (cleanPhone.startsWith("225") || lowerMethod.includes("ci")) providerId = "MTN_MOMO_CIV";
    else if (cleanPhone.startsWith("237") || lowerMethod.includes("cm")) providerId = "MTN_MOMO_CMR";
    else if (cleanPhone.startsWith("242") || lowerMethod.includes("cg")) providerId = "MTN_MOMO_CG";
    else if (cleanPhone.startsWith("224") || lowerMethod.includes("gn")) providerId = "MTN_MOMO_GN";
    else if (cleanPhone.startsWith("250") || lowerMethod.includes("rw")) providerId = "MTN_MOMO_RW";
    else if (cleanPhone.startsWith("234") || lowerMethod.includes("ng")) providerId = "MTN_MOMO_NG";
    else if (cleanPhone.startsWith("233") || lowerMethod.includes("gh")) providerId = "MTN_MOMO_GH";
    else if (cleanPhone.startsWith("245") || lowerMethod.includes("gw")) providerId = "MTN_MOMO_GW";
    else providerId = "MTN_MOMO_BEN";
  }
  else if (lowerMethod.includes("moov")) {
    if (cleanPhone.startsWith("225") || lowerMethod.includes("ci")) providerId = "MOOV_CIV";
    else if (cleanPhone.startsWith("223") || lowerMethod.includes("ml")) providerId = "MOOV_ML";
    else if (cleanPhone.startsWith("227") || lowerMethod.includes("ne")) providerId = "MOOV_NE";
    else if (cleanPhone.startsWith("228") || lowerMethod.includes("tg")) providerId = "MOOV_TG";
    else if (cleanPhone.startsWith("241") || lowerMethod.includes("ga")) providerId = "MOOV_GA";
    else if (cleanPhone.startsWith("235") || lowerMethod.includes("td")) providerId = "MOOV_TD";
    else if (cleanPhone.startsWith("226") || lowerMethod.includes("bf")) providerId = "MOOV_BF";
    else providerId = "MOOV_BEN";
  }
  else if (lowerMethod.includes("airtel")) {
    if (lowerMethod.includes("tigo")) providerId = "AIRTELTIGO_GH";
    else if (cleanPhone.startsWith("242") || lowerMethod.includes("cg")) providerId = "AIRTEL_O_CG";
    else if (cleanPhone.startsWith("241") || lowerMethod.includes("ga")) providerId = "AIRTEL_O_GA";
    else if (cleanPhone.startsWith("235") || lowerMethod.includes("td")) providerId = "AIRTEL_O_TD";
    else if (cleanPhone.startsWith("243") || lowerMethod.includes("cd")) providerId = "AIRTEL_O_CD";
    else if (cleanPhone.startsWith("261") || lowerMethod.includes("mg")) providerId = "AIRTEL_O_MG";
    else if (cleanPhone.startsWith("250") || lowerMethod.includes("rw")) providerId = "AIRTEL_O_RW";
    else if (cleanPhone.startsWith("234") || lowerMethod.includes("ng")) providerId = "AIRTEL_O_NG";
    else providerId = "AIRTEL_O_NE"; // Niger
  }
  else if (lowerMethod.includes("wave")) {
    if (cleanPhone.startsWith("221") || lowerMethod.includes("sn")) providerId = "WAVE_SEN";
    else providerId = "WAVE_CIV";
  }
  else if (lowerMethod.includes("telecel")) {
    if (cleanPhone.startsWith("223") || lowerMethod.includes("ml")) providerId = "TELECEL_ML";
    else if (cleanPhone.startsWith("236") || lowerMethod.includes("cf")) providerId = "TELECEL_CF";
    else if (cleanPhone.startsWith("233") || lowerMethod.includes("gh")) providerId = "VODAFONE_GH"; // Telecel GH ex-Vodafone
    else providerId = "TELECEL_BF";
  }
  else if (lowerMethod.includes("free")) providerId = "FREE_SEN";
  else if (lowerMethod.includes("celtiis")) providerId = "CELTIIS_BEN";
  else if (lowerMethod.includes("zamani")) providerId = "ZAMANI_NE";
  else if (lowerMethod.includes("expresso")) providerId = "EXPRESSO_SEN";
  else if (lowerMethod.includes("tmoney")) providerId = "TMONEY_TG";
  else if (lowerMethod.includes("muni")) providerId = "MUNI_GQ";
  else if (lowerMethod.includes("getesa")) providerId = "GETESA_GQ";
  else if (lowerMethod.includes("m-pesa") || lowerMethod.includes("mpesa")) providerId = "MPESA_CD";
  else if (lowerMethod.includes("africell")) providerId = "AFRICELL_CD";
  else if (lowerMethod.includes("celcom")) providerId = "CELCOM_GN";
  else if (lowerMethod.includes("mvola")) providerId = "MVOLA_MG";
  else if (lowerMethod.includes("glo")) providerId = "GLO_NG";

  // Génération d'un UUID v4 pour payoutId (requis par PawaPay pour l'idempotence)
  const payoutId = crypto.randomUUID();

  // Détermination de la devise exacte selon le pays cible
  let currency = "XOF";
  if (providerId.endsWith("_CMR") || providerId.endsWith("_CF") || providerId.endsWith("_CG") || providerId.endsWith("_GA") || providerId.endsWith("_GQ") || providerId.endsWith("_TD")) currency = "XAF";
  else if (providerId.endsWith("_CD")) currency = "CDF";
  else if (providerId.endsWith("_GN")) currency = "GNF";
  else if (providerId.endsWith("_MG")) currency = "MGA";
  else if (providerId.endsWith("_RW")) currency = "RWF";
  else if (providerId.endsWith("_NG")) currency = "NGN";
  else if (providerId.endsWith("_GH")) currency = "GHS";

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
    const res = await fetch("https://api.sandbox.pawapay.io/v2/wallet-balances?country=BEN", { headers: { "Authorization": `Bearer ${token}` } });
    if (res.status !== 401) return "https://api.sandbox.pawapay.io/v2";
    return "https://api.pawapay.io/v2";
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
