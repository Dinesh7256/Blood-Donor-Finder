const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const searchDonors = async (req, res, next) => {
  try {
    const { bloodGroup, radius } = req.query;
    const radiusInKilometers = Number(radius);
    const coordinates = req.user.location && req.user.location.coordinates;

    if (!bloodGroup || !Number.isFinite(radiusInKilometers) || radiusInKilometers <= 0) {
      return next(new ApiError(400, "bloodGroup and a positive radius are required"));
    }
    if (!coordinates || coordinates.length !== 2) {
      return next(new ApiError(400, "Your location is required to search for donors"));
    }

    const donors = await User.find({
      _id: { $ne: req.user._id },
      bloodGroup,
      isAvailable: true,
      isBanned: false,
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: radiusInKilometers * 1000,
        },
      },
    }).select("-email -fcmTokens -firebaseUid -phone");

    return res.status(200).json({ success: true, data: donors });
  } catch (error) {
    return next(error);
  }
};

module.exports = { searchDonors };
