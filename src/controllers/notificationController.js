// Placeholder controller for notifications.
// This file will handle notification list, read status, and device tokens later.

const notificationController = {
  getNotifications: async (req, res) => {
    res.status(200).json({ message: "Get notifications endpoint pending implementation" });
  },

  markNotificationAsRead: async (req, res) => {
    res.status(200).json({ message: "Mark notification as read endpoint pending implementation" });
  },

  saveDeviceToken: async (req, res) => {
    res.status(200).json({ message: "Save device token endpoint pending implementation" });
  },
};

module.exports = notificationController;
