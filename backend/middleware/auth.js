const jwt = require('jsonwebtoken');
const { decrypt } = require('../utils/tokenEncryption');

exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const data = decrypt(token);

    if (Date.now() > data.expiresIn) {
      return res.status(401).json({ error: "Token expired" });
    }

    req.user = data;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

exports.isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super Admin only' });
  }
  next();
};

exports.isAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

// exports.isAdminOnly = (req, res, next) => {
//   if (req.user.role !== 'voter') {
//     return res.status(403).json({ error: 'Admin only' });
//   }
//   next();
// };

exports.isVoter = (req, res, next) => {
  const { role } = req.user;
  
  if (role !== 'voter') {
    return res.status(403).json({ 
      error: 'Access denied. Voter access only.',
      userRole: role
    });
  }
  
  next();
};
