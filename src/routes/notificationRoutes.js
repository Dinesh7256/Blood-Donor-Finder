// Notification routes.
// Used to fetch notifications, mark them as read, and store device tokens.

const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware.verifyToken);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markNotificationAsRead);
router.post("/device-token", notificationController.saveDeviceToken);

module.exports = router;
