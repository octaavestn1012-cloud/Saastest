import { schedule } from '@netlify/functions';

export const handler = schedule("0 0 1 * *", async (event) => {
  // L'URL de base est automatiquement fournie par Netlify via process.env.URL
  const baseUrl = process.env.URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/monthly`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
      }
    });
    
    if (!response.ok) {
      console.error("Erreur lors de l'appel au CRON mensuel", await response.text());
    }
  } catch (error) {
    console.error("Exception lors de l'appel au CRON mensuel", error);
  }

  return { statusCode: 200 };
});
