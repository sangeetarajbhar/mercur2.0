import crypto from "crypto"

const ENCRYPTION_KEY =
  process.env.REFUND_METHOD_ENCRYPTION_KEY || "default-32-char-key-for-dev-only!!"
const HMAC_SECRET = process.env.REFUND_METHOD_HMAC_SECRET || "default-hmac-secret-for-dev-only"

const normalizedKey = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
const hmacKey = crypto.scryptSync(HMAC_SECRET, "salt", 32)

export function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-gcm", normalizedKey, iv)
  cipher.setAAD(Buffer.from("customer-refund-method"))
  let encrypted = cipher.update(plaintext, "utf8", "base64")
  encrypted += cipher.final("base64")
  const authTag = cipher.getAuthTag()
  return { encrypted, iv: iv.toString("base64"), authTag: authTag.toString("base64") }
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const ivBuffer = Buffer.from(iv, "base64")
  const decipher = crypto.createDecipheriv("aes-256-gcm", normalizedKey, ivBuffer)
  decipher.setAAD(Buffer.from("customer-refund-method"))
  decipher.setAuthTag(Buffer.from(authTag, "base64"))
  let decrypted = decipher.update(encrypted, "base64", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export function generateHmac(value: string): string {
  const hmac = crypto.createHmac("sha256", hmacKey)
  hmac.update(value.toLowerCase().trim())
  return hmac.digest("base64")
}

