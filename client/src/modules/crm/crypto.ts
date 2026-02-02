/**
 * CRM Data Encryption Module
 * Uses AES-GCM encryption with Web Crypto API
 * Data is encrypted with PIN-derived key
 */

const ENCRYPTED_STORAGE_PREFIX = "crm:encrypted:";
const SALT_KEY = "crm:salt";
const ENCRYPTION_VERSION = 1;

// Check if running in browser with crypto support
function isCryptoAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

// Generate a random salt for key derivation
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Get or create salt for this device
function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
  const salt = generateSalt();
  localStorage.setItem(SALT_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

// Derive encryption key from PIN using PBKDF2
async function deriveKey(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const salt = getOrCreateSalt();

  // Import PIN as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt data with AES-GCM
async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64 with version prefix
  return `v${ENCRYPTION_VERSION}:${btoa(String.fromCharCode(...combined))}`;
}

// Decrypt data with AES-GCM
async function decryptData(encryptedStr: string, key: CryptoKey): Promise<string> {
  // Parse version
  const versionMatch = encryptedStr.match(/^v(\d+):/);
  if (!versionMatch) {
    throw new Error("Invalid encrypted data format");
  }

  const data = encryptedStr.slice(versionMatch[0].length);
  const combined = new Uint8Array(
    atob(data)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

// Store for the current session's derived key
let sessionKey: CryptoKey | null = null;

// Initialize encryption with PIN (call after PIN verification)
export async function initializeEncryption(pin: string): Promise<boolean> {
  if (!isCryptoAvailable()) {
    console.warn("Web Crypto API not available, encryption disabled");
    return false;
  }

  try {
    sessionKey = await deriveKey(pin);
    return true;
  } catch (error) {
    console.error("Failed to initialize encryption:", error);
    return false;
  }
}

// Clear session key (call on logout/lock)
export function clearEncryption(): void {
  sessionKey = null;
}

// Check if encryption is initialized
export function isEncryptionReady(): boolean {
  return sessionKey !== null;
}

// Encrypted storage wrapper
export async function encryptedWrite(key: string, data: unknown): Promise<void> {
  if (!sessionKey) {
    // Fallback to plain storage if encryption not initialized
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }

  try {
    const jsonStr = JSON.stringify(data);
    const encrypted = await encryptData(jsonStr, sessionKey);
    localStorage.setItem(ENCRYPTED_STORAGE_PREFIX + key, encrypted);
    // Remove unencrypted version if exists
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Encryption failed, using plain storage:", error);
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export async function encryptedRead<T>(key: string, fallback: T): Promise<T> {
  if (!sessionKey) {
    // Fallback to plain storage if encryption not initialized
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  try {
    // First try encrypted storage
    const encrypted = localStorage.getItem(ENCRYPTED_STORAGE_PREFIX + key);
    if (encrypted) {
      const decrypted = await decryptData(encrypted, sessionKey);
      return JSON.parse(decrypted) as T;
    }

    // Fallback: check for unencrypted data (migration case)
    const plain = localStorage.getItem(key);
    if (plain) {
      const data = JSON.parse(plain) as T;
      // Migrate to encrypted storage
      await encryptedWrite(key, data);
      return data;
    }

    return fallback;
  } catch (error) {
    console.error("Decryption failed:", error);
    return fallback;
  }
}

// Migrate all existing CRM data to encrypted storage
export async function migrateToEncrypted(): Promise<void> {
  if (!sessionKey) return;

  const crmKeys = ["crm:leads", "crm:activity", "crm:quotes", "crm:appointments"];

  for (const key of crmKeys) {
    const plain = localStorage.getItem(key);
    if (plain && !localStorage.getItem(ENCRYPTED_STORAGE_PREFIX + key)) {
      try {
        const data = JSON.parse(plain);
        await encryptedWrite(key, data);
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug(`Migrated ${key} to encrypted storage`);
        }
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
      }
    }
  }
}

// Check if data needs migration (has unencrypted data)
export function needsMigration(): boolean {
  const crmKeys = ["crm:leads", "crm:activity", "crm:quotes", "crm:appointments"];
  return crmKeys.some(
    (key) =>
      localStorage.getItem(key) !== null &&
      localStorage.getItem(ENCRYPTED_STORAGE_PREFIX + key) === null
  );
}
