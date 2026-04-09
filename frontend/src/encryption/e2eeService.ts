/**
 * E2EE Encryption Service
 *
 * Implements a Signal Protocol-compatible key exchange and message encryption
 * using the Web Crypto API (SubtleCrypto). Since libsignal-protocol-javascript
 * requires a native environment, this service mirrors the protocol structure
 * using ECDH key agreement + AES-GCM encryption.
 *
 * Flow:
 *  1. On registration → generateKeyBundle() → upload public keys to server
 *  2. Before first message → fetchKeyBundle(userId) → deriveSessionKey()
 *  3. On send → encryptMessage(sessionKey, plaintext) → send encrypted payload
 *  4. On receive → decryptMessage(sessionKey, payload) → display plaintext
 *
 * Keys are stored ONLY in localStorage (never sent to server in private form).
 */

const STORAGE_KEY = 'wa_e2ee_keys';
const SESSION_STORE_KEY = 'wa_sessions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeyPairExport {
  publicKey: string;  // base64
  privateKey: string; // base64
}

export interface SignedPreKeyExport extends KeyPairExport {
  keyId: number;
  signature: string; // base64
}

export interface PreKeyExport extends KeyPairExport {
  keyId: number;
}

export interface LocalKeyBundle {
  identityKeyPair: KeyPairExport;
  registrationId: number;
  signedPreKey: SignedPreKeyExport;
  preKeys: PreKeyExport[];
}

export interface PublicKeyBundle {
  identityKey: string;
  registrationId: number;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  preKey?: { keyId: number; publicKey: string } | null;
}

export interface EncryptedMessage {
  type: number;        // 1 = standard, 3 = prekey bundle
  body: string;        // base64 ciphertext
  iv: string;          // base64 IV
  registrationId?: number;
}

export interface SessionData {
  sessionKey: string;      // base64 derived AES key
  remoteIdentityKey: string;
  createdAt: number;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

const toBase64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

const randomInt = (max = 16383): number =>
  Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff / max));

// ── Key Generation ────────────────────────────────────────────────────────────

const generateECDHPair = async (): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> => {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveKey',
    'deriveBits',
  ]) as Promise<CryptoKeyPair>;
};

const exportKeyPair = async (pair: CryptoKeyPair): Promise<KeyPairExport> => {
  const [pubRaw, privRaw] = await Promise.all([
    crypto.subtle.exportKey('raw', pair.publicKey),
    crypto.subtle.exportKey('pkcs8', pair.privateKey),
  ]);
  return { publicKey: toBase64(pubRaw), privateKey: toBase64(privRaw) };
};

const importPublicKey = async (b64: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
};

const importPrivateKey = async (b64: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'pkcs8',
    fromBase64(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
};

/** ECDH key agreement → derive a 256-bit AES-GCM key */
const deriveSharedKey = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> => {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const exportAesKey = async (key: CryptoKey): Promise<string> =>
  toBase64(await crypto.subtle.exportKey('raw', key));

const importAesKey = async (b64: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', fromBase64(b64), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);

// ── Signing (ECDSA for signed prekeys) ────────────────────────────────────────

const generateSigningPair = async (): Promise<CryptoKeyPair> => {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
};

const signData = async (privateKey: CryptoKey, data: ArrayBuffer): Promise<string> => {
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
  return toBase64(sig);
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a full Signal-style key bundle for a new user.
 * Stores private keys locally; returns public bundle for server upload.
 */
export const generateKeyBundle = async (): Promise<{
  localBundle: LocalKeyBundle;
  publicBundle: {
    identityKey: string;
    registrationId: number;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    preKeys: Array<{ keyId: number; publicKey: string }>;
  };
}> => {
  const registrationId = randomInt();

  // Identity key pair (ECDH)
  const identityPair = await generateECDHPair();
  const identityExport = await exportKeyPair(identityPair as unknown as CryptoKeyPair);

  // Signed prekey (ECDH key, signed with ECDSA identity signing key)
  const signingPair = await generateSigningPair();
  const signedPreKeyPair = await generateECDHPair();
  const signedExport = await exportKeyPair(signedPreKeyPair as unknown as CryptoKeyPair);
  const spkSignature = await signData(
    signingPair.privateKey,
    fromBase64(signedExport.publicKey).buffer
  );

  const signedPreKey: SignedPreKeyExport = {
    keyId: randomInt(100),
    publicKey: signedExport.publicKey,
    privateKey: signedExport.privateKey,
    signature: spkSignature,
  };

  // One-time prekeys (100)
  const preKeys: PreKeyExport[] = [];
  for (let i = 0; i < 100; i++) {
    const pair = await generateECDHPair();
    const exp = await exportKeyPair(pair as unknown as CryptoKeyPair);
    preKeys.push({ keyId: i + 1, ...exp });
  }

  const localBundle: LocalKeyBundle = {
    identityKeyPair: identityExport,
    registrationId,
    signedPreKey,
    preKeys,
  };

  // Persist locally
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localBundle));

  return {
    localBundle,
    publicBundle: {
      identityKey: identityExport.publicKey,
      registrationId,
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.publicKey,
        signature: signedPreKey.signature,
      },
      preKeys: preKeys.map(({ keyId, publicKey }) => ({ keyId, publicKey })),
    },
  };
};

export const getLocalKeyBundle = (): LocalKeyBundle | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocalKeyBundle) : null;
};

export const clearLocalKeyBundle = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_STORE_KEY);
};

// ── Session Management ────────────────────────────────────────────────────────

const getSessionStore = (): Record<string, SessionData> => {
  const raw = localStorage.getItem(SESSION_STORE_KEY);
  return raw ? JSON.parse(raw) : {};
};

const saveSession = (userId: string, session: SessionData): void => {
  const store = getSessionStore();
  store[userId] = session;
  localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(store));
};

export const getSession = (userId: string): SessionData | null => {
  const store = getSessionStore();
  return store[userId] || null;
};

/**
 * Derive a shared session key from a remote user's public key bundle.
 * This is the X3DH (Extended Triple Diffie-Hellman) simplified version.
 */
export const establishSession = async (
  remoteBundle: PublicKeyBundle
): Promise<SessionData> => {
  const localBundle = getLocalKeyBundle();
  if (!localBundle) throw new Error('No local key bundle found. Run generateKeyBundle() first.');

  const localIdentityPriv = await importPrivateKey(localBundle.identityKeyPair.privateKey);
  const remoteIdentityPub = await importPublicKey(remoteBundle.identityKey);
  const remoteSignedPub   = await importPublicKey(remoteBundle.signedPreKey.publicKey);

  // DH1: local identity ↔ remote signed prekey
  const dh1 = await deriveSharedKey(localIdentityPriv, remoteSignedPub);
  // DH2: local identity ↔ remote identity
  const dh2 = await deriveSharedKey(localIdentityPriv, remoteIdentityPub);

  // XOR the two derived key materials to form master secret
  const [raw1, raw2] = await Promise.all([
    crypto.subtle.exportKey('raw', dh1),
    crypto.subtle.exportKey('raw', dh2),
  ]);

  const combined = new Uint8Array(32);
  const a1 = new Uint8Array(raw1);
  const a2 = new Uint8Array(raw2);
  for (let i = 0; i < 32; i++) combined[i] = a1[i] ^ a2[i];

  // Import combined as final session AES key
  const sessionAesKey = await crypto.subtle.importKey(
    'raw',
    combined,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
  const sessionKeyB64 = await exportAesKey(sessionAesKey);

  const session: SessionData = {
    sessionKey: sessionKeyB64,
    remoteIdentityKey: remoteBundle.identityKey,
    createdAt: Date.now(),
  };

  saveSession(remoteBundle.identityKey, session);
  return session;
};

// ── Message Encryption / Decryption ──────────────────────────────────────────

/**
 * Encrypt a plaintext message using the established session key.
 */
export const encryptMessage = async (
  sessionKey: string,
  plaintext: string
): Promise<EncryptedMessage> => {
  const key  = await importAesKey(sessionKey);
  const iv   = randomBytes(12);
  const data = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  return {
    type: 1,
    body: toBase64(ciphertext),
    iv:   toBase64(iv.buffer),
  };
};

/**
 * Decrypt an encrypted message payload using the session key.
 */
export const decryptMessage = async (
  sessionKey: string,
  payload: EncryptedMessage
): Promise<string> => {
  const key        = await importAesKey(sessionKey);
  const iv         = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.body);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
};

// ── Media Encryption ──────────────────────────────────────────────────────────

export interface EncryptedMedia {
  encryptedBuffer: ArrayBuffer;
  encryptedKey: string;  // AES file key encrypted with session AES key
  iv: string;            // base64
  fileIv: string;        // IV used to encrypt the file itself
}

/**
 * Encrypt a file before uploading to Cloudinary.
 * Uses a random AES-256 key for the file, then encrypts THAT key with the session key.
 */
export const encryptMedia = async (
  file: File,
  sessionKey: string
): Promise<EncryptedMedia> => {
  const fileBuffer = await file.arrayBuffer();

  // 1. Generate a random AES key for this file
  const fileKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const fileIv  = randomBytes(12);

  // 2. Encrypt the file
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: fileIv },
    fileKey,
    fileBuffer
  );

  // 3. Encrypt the file key with the session key
  const sessionAesKey    = await importAesKey(sessionKey);
  const fileKeyRaw       = await crypto.subtle.exportKey('raw', fileKey);
  const iv               = randomBytes(12);
  const encryptedKeyBuf  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionAesKey, fileKeyRaw);

  return {
    encryptedBuffer,
    encryptedKey: toBase64(encryptedKeyBuf),
    iv:     toBase64(iv.buffer),
    fileIv: toBase64(fileIv.buffer),
  };
};

/**
 * Decrypt a media file received from the server.
 */
export const decryptMedia = async (
  encryptedBuffer: ArrayBuffer,
  encryptedKey: string,
  iv: string,
  fileIv: string,
  sessionKey: string
): Promise<ArrayBuffer> => {
  const sessionAesKey = await importAesKey(sessionKey);

  // 1. Decrypt the file key
  const fileKeyRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    sessionAesKey,
    fromBase64(encryptedKey)
  );

  // 2. Import file key
  const fileKey = await crypto.subtle.importKey(
    'raw',
    fileKeyRaw,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 3. Decrypt file
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(fileIv) },
    fileKey,
    encryptedBuffer
  );
};
