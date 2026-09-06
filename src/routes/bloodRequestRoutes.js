// Blood request routes.
// Handles creating, listing, responding to, and canceling blood requests.

const express = require("express");
const router = express.Router();

const bloodRequestController = require("../controllers/bloodRequestController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", bloodRequestController.createBloodRequest);
router.get("/mine", bloodRequestController.getMyBloodRequests);
router.get("/incoming", bloodRequestController.getIncomingBloodRequests);
router.get("/:id", bloodRequestController.getBloodRequestById);
router.post("/:id/respond", bloodRequestController.respondToBloodRequest);
router.put("/:id/accept", bloodRequestController.acceptBloodRequest);
router.put("/:id/reject", bloodRequestController.rejectBloodRequest);
router.put("/:id/cancel", bloodRequestController.cancelBloodRequest);

module.exports = router;
