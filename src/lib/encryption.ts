import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Récupère et valide la clé de chiffrement maître
 */
function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is missing in environment variables');
  }
  // Convertit la clé hexadécimale en Buffer (doit faire 32 octets / 64 caractères hex)
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  return keyBuffer;
}

/**
 * Chiffre une chaîne de caractères (ex: clé secrète API)
 */
export function encryptKey(text: string): string {
  const masterKey = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Dérivation de clé pour plus de sécurité (PBKDF2)
  const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();

  // Format final : salt + iv + tag + encrypted_data (encodé en base64)
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Déchiffre une chaîne chiffrée
 */
export function decryptKey(encryptedBase64: string): string {
  try {
    const masterKey = getKey();
    const data = Buffer.from(encryptedBase64, 'base64');

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);

    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Échec du déchiffrement de la clé API. La clé maître (ENCRYPTION_KEY) a-t-elle changé ?');
  }
}
