import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKeyBuffer(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey || rawKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }

  return Buffer.from(rawKey, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex",
  )}`;
}

export function decrypt(ciphertext: string): string | null {
  try {
    const [ivHex, tagHex, payloadHex] = ciphertext.split(":");
    if (!ivHex || !tagHex || !payloadHex) {
      return null;
    }

    const key = getKeyBuffer();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.warn("Failed to decrypt API key.", error);
    return null;
  }
}
