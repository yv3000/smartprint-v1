/**
 * Client-Side Encryption — SmartPrint
 * 
 * AES-GCM 256-bit encryption using the Web Crypto API.
 * Encryption happens entirely in the browser — the key NEVER leaves the client.
 * The key is passed via URL hash fragment (not sent to server).
 */

/**
 * Generate a random AES-GCM 256-bit encryption key.
 * Returns both the CryptoKey object and its base64-encoded export.
 */
export async function generateEncryptionKey(): Promise<{
  key: CryptoKey;
  keyBase64: string;
}> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed for export
    ["encrypt", "decrypt"]
  );

  const rawKey = await crypto.subtle.exportKey("raw", key);
  const keyBase64 = bufferToBase64(rawKey);

  return { key, keyBase64 };
}

/**
 * Encrypt a file's ArrayBuffer using AES-GCM 256-bit.
 * Returns the encrypted data with the IV prepended (first 12 bytes).
 */
export async function encryptFile(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  // Generate a random 12-byte IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Prepend IV to the encrypted data so we can extract it during decryption
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}

/**
 * Decrypt an encrypted file using AES-GCM 256-bit.
 * Expects the IV to be prepended (first 12 bytes) to the encrypted data.
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  keyBase64: string
): Promise<ArrayBuffer> {
  // Import the key from base64
  const rawKey = base64ToBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Extract IV (first 12 bytes) and ciphertext
  const dataArray = new Uint8Array(encryptedData);
  const iv = dataArray.slice(0, 12);
  const ciphertext = dataArray.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return decrypted;
}

// ── Utility functions ─────────────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
