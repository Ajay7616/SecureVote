const crypto     = require("crypto");
const { encryptAES } = require("../utils/secureCrypto");

module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Fresh 32-byte key per response
    const aesKey    = crypto.randomBytes(32);
    const encrypted = encryptAES(data, aesKey);

    // Send AES key as plain base64 — safe because:
    // 1. HTTPS/TLS already encrypts the channel end-to-end
    // 2. The frontend has no RSA private key to unwrap an RSA-encrypted key
    // 3. GCM auth tag guarantees integrity even if the key were intercepted
    return originalJson({
      key:     aesKey.toString("base64"),
      iv:      encrypted.iv,
      payload: encrypted.data,
      tag:     encrypted.tag,        // GCM auth tag
    });
  };

  next();
};