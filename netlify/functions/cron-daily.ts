import { schedule } from '@netlify/functions';

export const handler = schedule("0 18 * * *", async (event) => {
  // L'URL de base est automatiquement fournie par Netlify via process.env.URL
  const baseUrl = process.env.URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/daily`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
      }
    });
    
    if (!response.ok) {
      console.error("Erreur lors de l'appel au CRON quotidien", await response.text());
    }
  } catch (error) {
    console.error("Exception lors de l'appel au CRON quotidien", error);
  }

  return { statusCode: 200 };
});
