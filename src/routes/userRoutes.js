// User routes.
// These endpoints manage the logged-in user's profile and location.

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);
router.put("/location", userController.updateLocation);
router.put("/device-token", userController.registerDeviceToken);
router.delete("/device-token", userController.removeDeviceToken);

module.exports = router;
