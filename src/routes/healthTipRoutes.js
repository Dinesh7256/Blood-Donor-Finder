const express = require("express");
const { getHealthTips, createHealthTip } = require("../controllers/healthTipController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", getHealthTips);
router.post("/", protect, admin, createHealthTip);

module.exports = router;