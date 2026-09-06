const admin = require("../config/firebase");
const User = require("../models/User");
const { logFcm, logFcmError, maskToken } = require("../utils/fcmLog");

const FCM_BATCH_SIZE = 500;

const INVALID_FCM_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const chunkArray = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const removeInvalidTokens = async (invalidEntries = []) => {
  if (!invalidEntries.length) {
    return { removedCount: 0 };
  }

  const tokensByUser = invalidEntries.reduce((accumulator, entry) => {
    if (!entry?.userId || !entry?.token) {
      return accumulator;
    }

    const userKey = String(entry.userId);
    if (!accumulator.has(userKey)) {
      accumulator.set(userKey, new Set());
    }

    accumulator.get(userKey).add(entry.token);
    return accumulator;
  }, new Map());

  let removedCount = 0;

  for (const [userId, tokens] of tokensByUser.entries()) {
    const user = await User.findById(userId).select("fcmTokens");

    if (!user?.fcmTokens?.length) {
      continue;
    }

    const invalidTokenSet = tokens;
    const removedForUser = user.fcmTokens.filter((token) => invalidTokenSet.has(token)).length;
    const nextTokens = user.fcmTokens.filter((token) => !invalidTokenSet.has(token));

    if (nextTokens.length !== user.fcmTokens.length) {
      user.fcmTokens = nextTokens;
      await user.save();
      removedCount += removedForUser;
    }
  }

  return { removedCount };
};

const sendFcmPushNotifications = async ({ deliveries, title, body, data }) => {
  if (!deliveries.length) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      invalidTokensRemoved: 0,
    };
  }

  const messaging = admin.messaging();

  if (!messaging || typeof messaging.sendEachForMulticast !== "function") {
    const error = new Error("Firebase Cloud Messaging is not configured");
    logFcmError("Firebase Admin messaging unavailable", error);
    throw error;
  }

  const normalizedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );

  const deliveryChunks = chunkArray(deliveries, FCM_BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  const invalidEntries = [];

  for (const chunkDeliveries of deliveryChunks) {
    const tokens = chunkDeliveries.map((delivery) => delivery.token);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: normalizedData,
        android: {
          priority: "high",
          notification: {
            channelId: "default",
          },
        },
      });

      response.responses.forEach((ticket, ticketIndex) => {
        const delivery = chunkDeliveries[ticketIndex];

        if (!delivery) {
          return;
        }

        if (ticket.success) {
          sent += 1;
          return;
        }

        failed += 1;
        logFcmError(
          `Delivery failed token=${maskToken(delivery.token)}`,
          ticket.error || new Error("Unknown FCM delivery error")
        );

        const errorCode = ticket.error?.code;
        if (INVALID_FCM_ERROR_CODES.has(errorCode)) {
          invalidEntries.push({
            userId: delivery.userId,
            token: delivery.token,
            errorCode,
          });
        }
      });
    } catch (error) {
      failed += chunkDeliveries.length;
      logFcmError("Batch FCM delivery failed", error);
    }
  }

  const { removedCount } = await removeInvalidTokens(invalidEntries);

  if (removedCount > 0) {
    logFcm(`Removed ${removedCount} invalid FCM token(s)`);
  }

  return {
    attempted: deliveries.length,
    sent,
    failed,
    invalidTokensRemoved: removedCount,
  };
};

module.exports = {
  sendFcmPushNotifications,
  removeInvalidTokens,
};
