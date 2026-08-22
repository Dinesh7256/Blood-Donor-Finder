const admin = require("../config/firebase");
const User = require("../models/User");

const sendPushNotification = async (userIds, title, body, dataPayload = {}) => {
  const users = await User.find({ _id: { $in: userIds } }).select("fcmTokens");
  const tokens = [...new Set(users.flatMap((user) => user.fcmTokens || []))];

  if (tokens.length === 0) return null;

  const data = Object.fromEntries(
    Object.entries(dataPayload).map(([key, value]) => [key, String(value)])
  );

  const message = {
    tokens,
    notification: { title, body },
    data,
  };

  const messaging = admin.messaging();
  if (typeof messaging.sendMulticast === "function") {
    return messaging.sendMulticast(message);
  }

  return messaging.sendEachForMulticast(message);
};

module.exports = { sendPushNotification };