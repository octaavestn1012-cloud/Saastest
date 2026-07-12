import { schedule } from '@netlify/functions';

// Exécute ce script toutes les 15 minutes pour scanner si une règle correspond à l'heure actuelle
export const handler = schedule("*/15 * * * *", async (event) => {
  // L'URL de base est automatiquement fournie par Netlify via process.env.URL
  const baseUrl = process.env.URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/master`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
      }
    });
    
    if (!response.ok) {
      console.error("Erreur lors de l'appel au CRON Master:", await response.text());
    } else {
      const data = await response.json();
      console.log("CRON Master exécuté avec succès. Réponse:", data);
    }
  } catch (error) {
    console.error("Exception lors de l'appel au CRON Master:", error);
  }

  return { statusCode: 200 };
});
