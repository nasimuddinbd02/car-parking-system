import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-must-be-32-chars-long-or-more-for-development";

// Derives a consistent 32-byte key from the secret string using SHA-256
function getSecretKey(): Buffer {
  return crypto.createHash("sha256").update(SESSION_SECRET).digest();
}

/**
 * Encrypts arbitrary serializable data using AES-256-GCM.
 * Returns a colon-separated string: "IV:AuthTag:Ciphertext" (all in hex format).
 */
export function encryptSession(data: Record<string, unknown>): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts and verifies the ciphertext.
 * Returns the parsed JSON payload, or null if the token is invalid or tampered with.
 */
export function decryptSession(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];

    const key = getSecretKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    // Decryption or integrity check failed
    return null;
  }
}
