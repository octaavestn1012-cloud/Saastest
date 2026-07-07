export async function sendFailedPayoutEmail(userEmail: string, amount: number, destination: string, errorMessage: string) {
  const resendKey = process.env.RESEND_API_KEY;
  
  const subject = `⚠️ Échec d'une répartition automatique Réparto`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #FF3B30;">Alerte Réparto</h2>
      <p>Bonjour,</p>
      <p>Une de vos répartitions automatiques n'a pas pu aboutir aujourd'hui.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Destinataire :</strong> ${destination}</li>
          <li><strong>Montant :</strong> ${amount} FCFA</li>
          <li><strong>Raison de l'échec :</strong> ${errorMessage}</li>
        </ul>
      </div>
      <p>Veuillez vous connecter à votre tableau de bord pour vérifier les soldes de vos passerelles et relancer la transaction manuellement depuis l'historique.</p>
      <p style="color: #888; font-size: 12px; margin-top: 40px;">Ceci est un message automatique, merci de ne pas y répondre.</p>
    </div>
  `;

  // Si l'utilisateur n'a pas encore configuré de clé Resend, on simule l'envoi dans la console.
  if (!resendKey) {
    console.log("--- 📧 SIMULATION ENVOI D'EMAIL (Clé RESEND_API_KEY manquante) ---");
    console.log(`À      : ${userEmail}`);
    console.log(`Sujet  : ${subject}`);
    console.log(`Erreur : ${errorMessage}`);
    console.log("------------------------------------------------------------------");
    return { success: true, simulated: true };
  }

  // Envoi réel via l'API Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Alerte Réparto <alertes@votre-domaine.com>", // À remplacer par votre domaine vérifié sur Resend
        to: [userEmail],
        subject: subject,
        html: html
      })
    });
    
    if (!res.ok) throw new Error(await res.text());
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email via Resend :", error);
    return { success: false, error };
  }
}
