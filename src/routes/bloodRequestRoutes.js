// Blood request routes.
// Handles creating, listing, accepting, and canceling blood requests.

const express = require("express");
const router = express.Router();

const bloodRequestController = require("../controllers/bloodRequestController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware.verifyToken);

router.post("/", bloodRequestController.createBloodRequest);
router.get("/", bloodRequestController.getBloodRequests);
router.get("/mine", bloodRequestController.getMyBloodRequests);
router.get("/:id", bloodRequestController.getBloodRequestById);
router.put("/:id/accept", bloodRequestController.acceptBloodRequest);
router.put("/:id/cancel", bloodRequestController.cancelBloodRequest);

module.exports = router;
