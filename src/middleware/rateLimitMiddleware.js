const rateLimit = require("express-rate-limit");

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

const globalApiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 120),
  message: "Too many requests. Please try again shortly.",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  message: "Too many authentication attempts. Please try again later.",
});

const bloodRequestCreateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_BLOOD_REQUEST_CREATE_MAX, 10),
  message: "Too many blood requests. Please wait before creating another request.",
});

const donorSearchLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_DONOR_SEARCH_MAX, 30),
  message: "Too many donor searches. Please try again shortly.",
});

const phoneVerificationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_PHONE_VERIFY_MAX, 10),
  message: "Too many phone verification attempts. Please try again later.",
});

const deviceTokenLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: parsePositiveInt(process.env.RATE_LIMIT_DEVICE_TOKEN_MAX, 30),
  message: "Too many device token updates. Please try again later.",
});

module.exports = {
  globalApiLimiter,
  authLimiter,
  bloodRequestCreateLimiter,
  donorSearchLimiter,
  phoneVerificationLimiter,
  deviceTokenLimiter,
};
