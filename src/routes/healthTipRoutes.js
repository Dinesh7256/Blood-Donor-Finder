const express = require("express");
const { getHealthTips, createHealthTip } = require("../controllers/healthTipController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getHealthTips);
router.post("/", protect, createHealthTip);

module.exports = router;