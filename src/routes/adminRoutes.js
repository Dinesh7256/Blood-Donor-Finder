const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  banUser,
  getAllBloodRequests,
  cancelBloodRequest,
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, admin);
router.get("/users", getAllUsers);
router.put("/users/:userId/ban", banUser);
router.get("/blood-requests", getAllBloodRequests);
router.put("/blood-requests/:requestId/cancel", cancelBloodRequest);

module.exports = router;