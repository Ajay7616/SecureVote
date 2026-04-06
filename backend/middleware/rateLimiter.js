const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  
  max:              5,                
  standardHeaders:  true,             
  legacyHeaders:    false,
  skipSuccessfulRequests: true,       
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
});

const otpLimiter = rateLimit({
  windowMs:         10 * 60 * 1000,  
  max:              5,                
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error: "Too many OTP attempts. Please request a new OTP after 10 minutes.",
  },
});

const generalLimiter = rateLimit({
  windowMs:         1 * 60 * 1000,   
  max:              100,              
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error: "Too many requests. Please slow down.",
  },
});

module.exports = { loginLimiter, otpLimiter, generalLimiter };