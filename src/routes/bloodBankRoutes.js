const express = require("express");
const { getBloodBanks, createBloodBank } = require("../controllers/bloodBankController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getBloodBanks);
router.post("/", protect, createBloodBank);

module.exports = router;