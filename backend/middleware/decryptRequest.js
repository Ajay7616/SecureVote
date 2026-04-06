const { decryptAES, decryptKey, verifySignature } = require("../utils/secureCrypto");

module.exports = (req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next();
  }

  try {
    const { key, payload, iv, tag, signature, nonce, timestamp } = req.body;

    if (!key || !payload || !iv || !tag || !signature) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    const now         = Date.now();
    const requestTime = Number(timestamp);

    if (isNaN(requestTime) || Math.abs(now - requestTime) > 30_000) {
      return res.status(400).json({ error: "Request expired" });
    }

    if (!verifySignature(payload, nonce, timestamp, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const aesKey = decryptKey(key); 

    const decrypted = decryptAES(payload, iv, tag, aesKey);

    req.body = decrypted;
    next();

  } catch (err) {
    return res.status(400).json({ error: "Invalid encrypted payload" });
  }
};