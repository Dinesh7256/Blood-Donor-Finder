const express = require("express");
const { getBloodBanks, createBloodBank } = require("../controllers/bloodBankController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", getBloodBanks);
router.post("/", protect, admin, createBloodBank);

module.exports = router;