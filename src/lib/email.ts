"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendWelcomeEmail(toEmail: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Réparto <${SENDER}>`,
      to: [toEmail],
      subject: "Bienvenue sur Réparto ! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #111;">
          <h1 style="color: #000;">Bienvenue sur Réparto ! 🎉</h1>
          <p>Bonjour,</p>
          <p>Nous sommes ravis de vous compter parmi nous ! Votre compte a été créé avec succès et est désormais prêt à être utilisé.</p>
          <p>Avec Réparto, vous allez pouvoir automatiser et simplifier la répartition de vos revenus vers vos partenaires ou vos équipes en toute sérénité.</p>
          <p>Rendez-vous sur votre tableau de bord pour découvrir toutes les fonctionnalités.</p>
          <br/>
          <p>À très vite,<br/><strong>L'équipe Réparto</strong></p>
        </div>
      `,
    });

    if (error) {
      console.error("Erreur d'envoi d'email de bienvenue :", error);
    }
    return { success: !error, data, error };
  } catch (err) {
    console.error("Erreur inattendue email :", err);
    return { success: false, error: err };
  }
}

export async function sendPayoutReceiptEmail(toEmail: string, tx: any) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Réparto <${SENDER}>`,
      to: [toEmail],
      subject: `Reçu de répartition - ${tx.status === "SUCCESS" ? "Succès" : tx.status === "PARTIAL" ? "Partiel" : "Échec"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #111; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #f9f9f9; padding: 20px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0;">Reçu de répartition</h2>
            <p style="margin: 5px 0 0 0; color: #666;">Statut : <strong>${tx.status}</strong></p>
          </div>
          <div style="padding: 20px;">
            <p>Bonjour,</p>
            <p>Voici le récapitulatif de votre dernière répartition (${tx.ruleName}) :</p>
            
            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Solde déduit</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${tx.totalAvailable} F</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Frais Réparto</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #d97706;">- ${tx.commissionAmount} F</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Montant réparti</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 1.1em; color: #2563eb;">${tx.totalAmount} F</td>
              </tr>
            </table>

            <h3 style="margin-top: 30px;">Détails des envois :</h3>
            <ul style="list-style-type: none; padding: 0;">
              ${tx.details.map((d: any) => `
                <li style="padding: 10px; background-color: #f5f5f5; border-radius: 8px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>${d.name} (${d.network})</strong>
                    <span>${d.amount} F</span>
                  </div>
                  <div style="font-size: 0.9em; color: ${d.status === 'SUCCESS' ? '#16a34a' : d.status === 'FAILED' ? '#dc2626' : '#2563eb'}; margin-top: 5px;">
                    Statut : ${d.status} ${d.errorReason ? `- ${d.errorReason}` : ''}
                  </div>
                </li>
              `).join("")}
            </ul>

            <div style="margin-top: 40px; font-size: 0.9em; color: #666; text-align: center;">
              Merci d'utiliser Réparto !
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Erreur d'envoi d'email de reçu :", error);
    }
    return { success: !error, data, error };
  } catch (err) {
    console.error("Erreur inattendue email reçu :", err);
    return { success: false, error: err };
  }
}

export async function sendFailedPayoutEmail(userEmail: string, amount: number, destination: string, errorMessage: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Alerte Réparto <${SENDER}>`,
      to: [userEmail],
      subject: `⚠️ Échec d'une répartition automatique Réparto`,
      html: `
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
      `
    });
    return { success: !error };
  } catch (err) {
    console.error("Erreur envoi failed payout :", err);
    return { success: false };
  }
}
