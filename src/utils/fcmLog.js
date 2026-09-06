const maskToken = (token) => {
  if (!token || typeof token !== "string") {
    return "none";
  }

  const normalized = token.trim();
  if (normalized.length <= 6) {
    return "***";
  }

  return `***${normalized.slice(-6)}`;
};

const logFcm = (message) => {
  console.log(`[FCM] ${message}`);
};

const logFcmError = (message, error) => {
  const detail = error?.message || String(error);
  console.error(`[FCM ERROR] ${message} — ${detail}`);
};

module.exports = {
  maskToken,
  logFcm,
  logFcmError,
};
