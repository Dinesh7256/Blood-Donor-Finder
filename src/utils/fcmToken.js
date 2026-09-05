const EXPO_PUSH_TOKEN_PATTERN = /^ExponentPushToken\[[^\]]+\]$/;
const FCM_REGISTRATION_TOKEN_PATTERN = /^[a-zA-Z0-9_:\-]{20,}$/;

const isLikelyFirebaseIdToken = (token) =>
  typeof token === "string" && token.trim().startsWith("eyJ");

const isExpoPushToken = (token) =>
  typeof token === "string" && EXPO_PUSH_TOKEN_PATTERN.test(token.trim());

const isFcmRegistrationToken = (token) => {
  if (!token || typeof token !== "string") {
    return false;
  }

  const normalizedToken = token.trim();

  if (isLikelyFirebaseIdToken(normalizedToken) || isExpoPushToken(normalizedToken)) {
    return false;
  }

  return FCM_REGISTRATION_TOKEN_PATTERN.test(normalizedToken);
};

const getUniqueFcmTokens = (tokens = []) =>
  [...new Set(tokens.filter((token) => isFcmRegistrationToken(token)).map((token) => token.trim()))];

module.exports = {
  isFcmRegistrationToken,
  isLikelyFirebaseIdToken,
  isExpoPushToken,
  getUniqueFcmTokens,
};
