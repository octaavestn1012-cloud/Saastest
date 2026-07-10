require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decryptKey(encryptedText) {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(Buffer.from(encryptedHex, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function test() {
  const { data } = await supabase.from('connexions').select('*').eq('passerelle', 'pawapay').eq('statut', 'actif').limit(1);
  if (!data || data.length === 0) return console.log('No pawapay connection');
  
  const token = decryptKey(data[0].cle_chiffree);
  const baseUrl = 'https://api.sandbox.pawapay.io/v2';
  
  try {
    const response = await fetch(`${baseUrl}/wallet-balances`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    console.log("Status without country:", response.status);
    console.log("Response:", await response.text());
  } catch(e) { console.error(e); }
}
test();
