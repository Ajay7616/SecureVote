const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, "../keys/private.pem"));
const PUBLIC_KEY  = fs.readFileSync(path.join(__dirname, "../keys/public.pem"));
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  process.exit(1);  
}

function encryptAES(data, key) {
  const iv     = crypto.randomBytes(12); 
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted  = cipher.update(JSON.stringify(data), "utf8", "base64");
  encrypted     += cipher.final("base64");

  const tag = cipher.getAuthTag(); 

  return {
    iv:   iv.toString("base64"),
    data: encrypted,
    tag:  tag.toString("base64"),
  };
}

function decryptAES(data, iv, tag, key) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(tag, "base64"));

  let decrypted  = decipher.update(data, "base64", "utf8");
  decrypted     += decipher.final("utf8"); 

  return JSON.parse(decrypted);
}

function decryptKey(encryptedKey) {
  return crypto.privateDecrypt(
    {
      key:     PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedKey, "base64")
  );
}

function signPayload(payload, nonce, timestamp) {
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(payload + nonce + timestamp)
    .digest("hex");  // ✅ hex
}

function verifySignature(payload, nonce, timestamp, signature) {
  const expected = signPayload(payload, nonce, timestamp); 
  const received = signature;

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

module.exports = {
  encryptAES,
  decryptAES,
  decryptKey,
  signPayload,
  verifySignature,
};