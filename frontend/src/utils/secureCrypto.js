import forge from "node-forge";

REACT_APP_PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`;

const HMAC_SECRET = process.env.REACT_APP_HMAC_SECRET;

if (!HMAC_SECRET) {
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* GENERATE AES-256 KEY (Web Crypto API)                                       */
/* Returns a CryptoKey — call once per request                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
export const generateAESKey = async () => {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,             // extractable so we can export bytes for RSA wrapping
    ["encrypt", "decrypt"]
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* EXPORT RAW KEY BYTES                                                         */
/* Needed so we can RSA-wrap the key before sending                            */
/* ─────────────────────────────────────────────────────────────────────────── */
export const exportRawKey = async (cryptoKey) => {
  const raw = await crypto.subtle.exportKey("raw", cryptoKey);
  return new Uint8Array(raw); // always 32 bytes for AES-256
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* AES-256-GCM ENCRYPT                                                         */
/*                                                                             */
/* Why GCM instead of CBC?                                                     */
/*   - GCM is authenticated encryption — it produces an auth tag that          */
/*     proves the ciphertext was not tampered with. CBC has no such check      */
/*     and is vulnerable to padding oracle attacks.                            */
/*   - With GCM we no longer need a separate HMAC on the payload.             */
/*                                                                             */
/* key    → CryptoKey from generateAESKey()                                    */
/* data   → any JSON-serialisable value                                        */
/* returns → { iv, payload, tag } — all base64 strings                        */
/* ─────────────────────────────────────────────────────────────────────────── */
export const encryptAES = async (data, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const encoded = new TextEncoder().encode(JSON.stringify(data));

  // Web Crypto appends the 16-byte auth tag to the end of the ciphertext
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  const ciphertext  = cipherArray.slice(0, -16);
  const tag         = cipherArray.slice(-16);

  return {
    iv:      bufToBase64(iv),
    payload: bufToBase64(ciphertext),
    tag:     bufToBase64(tag),
  };
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* AES-256-GCM DECRYPT                                                         */
/* Recombines ciphertext + tag before passing to Web Crypto                    */
/* ─────────────────────────────────────────────────────────────────────────── */
export const decryptAES = async (payload, ivBase64, tagBase64, key) => {
  try {
    const iv         = base64ToBuf(ivBase64);
    const ciphertext = base64ToBuf(payload);
    const tag        = base64ToBuf(tagBase64);

    // Web Crypto expects ciphertext + tag joined together
    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(tag), ciphertext.byteLength);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      combined
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    return null;
  }
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* RSA-OAEP ENCRYPT AES KEY (request direction only)                           */
/* Wraps raw 32-byte key with server's public key via node-forge               */
/* ─────────────────────────────────────────────────────────────────────────── */
export const encryptKey = (rawKeyBytes) => {
  const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY);

  // Convert Uint8Array → forge byte string
  const keyBytes = forge.util.binary.raw.encode(rawKeyBytes);

  return forge.util.encode64(
    publicKey.encrypt(keyBytes, "RSA-OAEP", {
      md:   forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    })
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* HMAC-SHA256 SIGN (using Web Crypto — HMAC_SECRET stays in memory only)     */
/* ─────────────────────────────────────────────────────────────────────────── */
export const sign = async (payload, nonce, timestamp) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const data      = new TextEncoder().encode(payload + nonce + timestamp);
  const sigBuffer = await crypto.subtle.sign("HMAC", keyMaterial, data);

  // ✅ convert to hex to match backend
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const bufToBase64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const base64ToBuf = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
