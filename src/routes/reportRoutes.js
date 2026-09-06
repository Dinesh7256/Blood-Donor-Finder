const express = require("express");
const { createReport, getReports } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(protect);
router.post("/", createReport);
router.get("/", admin, getReports);

module.exports = router;