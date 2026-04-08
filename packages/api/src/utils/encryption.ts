import crypto from "crypto"

const SECRET = process.env.REFUND_METHODS_ENCRYPTION_KEY || process.env.JWT_SECRET || "supersecret"
const IV_LENGTH = 16

const getKey = () => crypto.createHash("sha256").update(SECRET).digest()

export const encryptForStorage = (value: string) => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`
}

export const decryptFromStorage = (value: string) => {
  const [ivHex, encryptedHex] = value.split(":")
  if (!ivHex || !encryptedHex) {
    return value
  }
  const iv = Buffer.from(ivHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

export const generateHmac = (value: string) =>
  crypto.createHmac("sha256", SECRET).update(value).digest("hex")

export const maskAccountNumber = (value: string) =>
  value.length <= 4 ? value : `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`

export const maskAccountHolder = (value: string) =>
  value.length <= 2 ? `${value[0] ?? "*"}*` : `${value[0]}${"*".repeat(value.length - 2)}${value[value.length - 1]}`

export const maskUpiId = (value: string) => {
  const [name, domain] = value.split("@")
  if (!name || !domain) {
    return "***"
  }
  if (name.length <= 2) {
    return `${name[0] ?? "*"}*@${domain}`
  }
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`
}
