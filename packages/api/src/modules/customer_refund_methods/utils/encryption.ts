import crypto from 'crypto';

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.REFUND_METHOD_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!!';
const HMAC_SECRET = process.env.REFUND_METHOD_HMAC_SECRET || 'default-hmac-secret-for-dev-only';

// Ensure key is 32 bytes for AES-256
const normalizedKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
const hmacKey = crypto.scryptSync(HMAC_SECRET, 'salt', 32);

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Object containing encrypted data, IV, and auth tag (all base64 encoded)
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16); // 128-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
  cipher.setAAD(Buffer.from('customer-refund-method')); // Additional authenticated data
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param encrypted - Base64 encoded encrypted data
 * @param iv - Base64 encoded initialization vector
 * @param authTag - Base64 encoded authentication tag
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const ivBuffer = Buffer.from(iv, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', normalizedKey, ivBuffer);
  decipher.setAAD(Buffer.from('customer-refund-method'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate HMAC-SHA256 hash for uniqueness checking
 * Used to check for duplicate accounts/UPI IDs without decrypting
 * @param value - The value to hash
 * @returns Base64 encoded HMAC hash
 */
export function generateHmac(value: string): string {
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(value.toLowerCase().trim()); // Normalize before hashing
  return hmac.digest('base64');
}

/**
 * Mask account number for display
 * Shows only last 4 digits
 * @param accountNumber - The account number to mask
 * @returns Masked account number (e.g., "******7890")
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }
  const lastFour = accountNumber.slice(-4);
  const maskLength = Math.max(0, accountNumber.length - 4);
  return '*'.repeat(maskLength) + lastFour;
}

/**
 * Mask UPI ID for display
 * Shows first and last character of username, full domain
 * @param upiId - The UPI ID to mask (e.g., "rishabh@oksbi")
 * @returns Masked UPI ID (e.g., "r***h@oksbi")
 */
export function maskUpiId(upiId: string): string {
  if (!upiId || !upiId.includes('@')) {
    return '***@***';
  }
  
  const [username, domain] = upiId.split('@');
  if (username.length <= 2) {
    return `${username[0] || '*'}***@${domain}`;
  }
  
  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  const middleLength = Math.max(0, username.length - 2);
  
  return `${firstChar}${'*'.repeat(middleLength)}${lastChar}@${domain}`;
}

/**
 * Mask account holder name for display
 * Shows first and last name initials
 * @param name - The account holder name
 * @returns Masked name (e.g., "R***h K***l")
 */
export function maskAccountHolder(name: string): string {
  if (!name) {
    return '***';
  }
  
  const words = name.trim().split(/\s+/);
  return words.map(word => {
    if (word.length <= 1) {
      return word;
    } else if (word.length <= 3) {
      return word[0] + '*'.repeat(word.length - 1);
    } else {
      return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }
  }).join(' ');
}

/**
 * Store encrypted data in database-ready format
 * Combines encrypted data, IV, and auth tag into a single string
 * Format: encrypted:iv:authTag (all base64)
 */
export function encryptForStorage(plaintext: string): string {
  const { encrypted, iv, authTag } = encrypt(plaintext);
  return `${encrypted}:${iv}:${authTag}`;
}

/**
 * Decrypt data from database storage format
 * Extracts encrypted data, IV, and auth tag from combined string
 */
export function decryptFromStorage(combined: string): string {
  const parts = combined.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [encrypted, iv, authTag] = parts;
  return decrypt(encrypted, iv, authTag);
}
