import { randomBytes, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from "node:crypto"

const ENV_KEY_VAR = "ENCRYPTION_KEY"

function getKey(): Buffer {
  const hex = process.env[ENV_KEY_VAR]
  if (!hex || hex.length !== 64) {
    throw new Error(
      `${ENV_KEY_VAR} must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32`
    )
  }
  return Buffer.from(hex, "hex")
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns "ivHex:authTagHex:ciphertextHex"
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":")
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

/**
 * Encrypts all values in a Record<string, string>.
 */
export function encryptRecord(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) {
    result[k] = encrypt(v)
  }
  return result
}

/**
 * Decrypts all values in a Record<string, string>.
 * If a value doesn't look encrypted (no colons), returns it as-is (migration compat).
 */
export function decryptRecord(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) {
    // Encrypted values have format "ivHex:authTagHex:ciphertextHex"
    if (v.includes(":") && v.split(":").length === 3) {
      try {
        result[k] = decrypt(v)
      } catch {
        // If decryption fails, value may be plaintext from before encryption was enabled
        result[k] = v
      }
    } else {
      // Plaintext value (pre-encryption migration)
      result[k] = v
    }
  }
  return result
}

/**
 * Returns true if ENCRYPTION_KEY is configured.
 */
export function isEncryptionEnabled(): boolean {
  const hex = process.env[ENV_KEY_VAR]
  return !!hex && hex.length === 64
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * HMACs both strings so timingSafeEqual always compares equal-length buffers.
 */
export function safeCompare(a: string, b: string): boolean {
  const key = 'safeCompare'
  const ha = createHmac('sha256', key).update(a).digest()
  const hb = createHmac('sha256', key).update(b).digest()
  return timingSafeEqual(ha, hb)
}
