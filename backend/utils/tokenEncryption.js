const crypto = require('crypto');

const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.CUSTOM_TOKEN_ENCRYPTION)
  .digest();

const IV_LENGTH = 16;

exports.encrypt = (data) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET_KEY, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
};

exports.decrypt = (token) => {
  const parts = token.split(':');

  const iv         = Buffer.from(parts[0], 'hex');
  const authTag    = Buffer.from(parts[1], 'hex');
  const encrypted  = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET_KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8'); 

  return JSON.parse(decrypted);
};