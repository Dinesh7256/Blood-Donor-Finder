const express = require("express");
const { createReport, getReports } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/", createReport);
router.get("/", getReports);

module.exports = router;