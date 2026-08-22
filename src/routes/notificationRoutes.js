// Notification routes.
// Used to fetch notifications, mark them as read, and store device tokens.

const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markNotificationAsRead);
router.post("/device-token", userController.saveDeviceToken);

module.exports = router;
