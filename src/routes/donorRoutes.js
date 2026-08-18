// Donor search routes.
// Used to find available donors by blood group and distance.

const express = require("express");
const router = express.Router();

const donorController = require("../controllers/donorController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware.verifyToken);

router.get("/", donorController.searchDonors);

module.exports = router;
