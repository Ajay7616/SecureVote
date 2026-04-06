

const helmet = require("helmet");

const isDev = process.env.NODE_ENV !== "production";

const cspMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      scriptSrc: isDev
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] 
        : ["'self'"],

      styleSrc: ["'self'", "'unsafe-inline'"],

      imgSrc: isDev
        ? ["'self'", "data:", "blob:", "http://localhost:5000"]  
        : ["'self'", "data:", "blob:"],

      fontSrc: ["'self'", "data:"],

      connectSrc: isDev
        ? ["'self'", "http://localhost:5000", "ws://localhost:3000"]
        : ["'self'"],

      frameAncestors: ["'none'"],

      formAction: ["'self'"],

      upgradeInsecureRequests: isDev ? [] : [],
    },
  },

  noSniff: true,

  frameguard: { action: "deny" },

  hidePoweredBy: true,

  hsts: isDev
    ? false
    : {
        maxAge:            31_536_000, 
        includeSubDomains: true,
        preload:           true,
      },

  xssFilter: true,
});

module.exports = cspMiddleware;