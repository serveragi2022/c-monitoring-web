import "server-only";
import crypto from "node:crypto";

const SALT = "JennelMarasigan";
const PASSPHRASE = "@JennelMarasigan";

function getHashKey(): Buffer {
  // Mirrors System.Security.Cryptography.Rfc2898DeriveBytes(passphrase, saltBytes)
  // default: 1000 iterations, SHA1, 16-byte key.
  return crypto.pbkdf2Sync(PASSPHRASE, Buffer.from(SALT, "utf8"), 1000, 16, "sha1");
}

/** Encrypts a plaintext password the same way the mobile app does before sending it to the API. */
export function encryptPassword(plain: string): string {
  const key = getHashKey();
  const cipher = crypto.createCipheriv("aes-128-cbc", key, key); // IV = key, matching AesManaged usage
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
}
