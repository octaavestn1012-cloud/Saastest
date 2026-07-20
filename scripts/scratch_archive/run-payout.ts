import { config } from 'dotenv';
config({ path: '.env.local' });
import { processQuickPayouts } from './src/lib/payout-engine';

async function main() {
  console.log("Démarrage du test de répartition...");
  const userId = '27b22dbe-b041-4134-bd85-b3a285dc9854';
  const targets = [{ name: 'Test Dest', phone: '90000000', method: 'mtn', value: 1000 }];
  
  try {
    const res = await processQuickPayouts(userId, 1000, targets, 'fixed');
    console.log("Résultat processQuickPayouts :", JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error("Erreur fatale :", e.message);
  }
}

main();
