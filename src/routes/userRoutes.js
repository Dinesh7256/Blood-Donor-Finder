// User routes.
// These endpoints manage the logged-in user's profile and location.

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const {
  phoneVerificationLimiter,
  deviceTokenLimiter,
} = require("../middleware/rateLimitMiddleware");

router.use(protect);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);
router.post("/me/confirm-phone-verification", phoneVerificationLimiter, userController.confirmPhoneVerification);
router.put("/location", userController.updateLocation);
router.put("/device-token", deviceTokenLimiter, userController.registerDeviceToken);
router.delete("/device-token", userController.removeDeviceToken);

module.exports = router;
