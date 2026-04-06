const jwt = require("jsonwebtoken");

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  process.exit(1);
}

function sendTokenCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,                                    
    secure:   process.env.COOKIE_SECURE === "true",  
    sameSite: process.env.COOKIE_SAME_SITE || "lax", 
    maxAge:   7 * 24 * 60 * 60 * 1000,             
    path:     "/",
  });

  return token;
}

function clearTokenCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure:   process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path:     "/",
  });
}

function verifyToken(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    clearTokenCookie(res);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

module.exports = { sendTokenCookie, clearTokenCookie, verifyToken, requireRole };