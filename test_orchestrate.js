require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function decryptKey(encryptedText) {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(Buffer.from(encryptedHex, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function getPawapayBalance(apiToken) {
  const baseUrl = "https://api.sandbox.pawapay.io/v2"; // from your code
  const response = await fetch(`${baseUrl}/wallet-balances`, {
      method: "GET",
      headers: { "Accept": "application/json", "Authorization": `Bearer ${apiToken}` }
  });
  if (response.ok) {
      const data = await response.json();
      let totalBalance = 0;
      if (Array.isArray(data)) {
        data.forEach((b) => {
          if (b.currency === "XOF" || b.currency === "CFA") {
            totalBalance += Number(b.balance || b.availableBalance || 0);
          }
        });
      } else if (data && data.balances && Array.isArray(data.balances)) {
        data.balances.forEach((b) => {
          if (b.currency === "XOF" || b.currency === "CFA") {
            totalBalance += Number(b.balance || b.availableBalance || 0);
          }
        });
      }
      return totalBalance;
  }
  return 0;
}

async function testOrchestrate() {
  const userId = 'dc14e556-87d1-4074-99c0-d854ab0bff68';
  
  // 1. buildGatewayPool
  const { data: conns } = await supabase.from('connexions').select('*').eq('user_id', userId).eq('statut', 'actif');
  let gatewayPool = [];
  let totalBalance = 0;
  for (const conn of conns) {
      if (conn.passerelle === 'pawapay') {
          const bal = await getPawapayBalance(decryptKey(conn.cle_chiffree));
          if (bal > 0) {
              gatewayPool.push({ conn, balance: bal });
              totalBalance += bal;
          }
      }
  }
  
  console.log("Verified total balance:", totalBalance);
  if (totalBalance <= 0) return console.log("Balance <= 0");
  
  // 2. Validate plan
  const plan = "pro";
  const commissionRate = 0.008;
  
  // 3. Calcul Commission
  let verifiedTotalBalance = totalBalance;
  let commissionAmount = Math.floor(verifiedTotalBalance * commissionRate);
  const availableAfterCommission = verifiedTotalBalance - commissionAmount;
  
  console.log("Available after commission:", availableAfterCommission);
  
  const targets = [{ value: 100, label: "Momo test 2" }];
  let finalTargets = [];
  let sumAssigned = 0;
  
  for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const amount = Math.round((availableAfterCommission * t.value) / 100);
      finalTargets.push({ ...t, amount });
      sumAssigned += amount;
  }
  if (finalTargets.length > 0) {
      const diff = availableAfterCommission - sumAssigned;
      if (diff !== 0) {
        finalTargets[finalTargets.length - 1].amount += diff;
      }
  }
  
  const totalNeededForTargets = finalTargets.reduce((sum, t) => sum + t.amount, 0);
  let totalNeededWithCommission = totalNeededForTargets + commissionAmount;
  
  console.log("Total needed with commission:", totalNeededWithCommission);
  console.log("Verified Total Balance:", verifiedTotalBalance);
  
  if (totalNeededWithCommission > verifiedTotalBalance) {
      return console.log("Solde insuffisant pour couvrir");
  }
  
  console.log("Passed balance check. Would create execution...");
}

testOrchestrate();
