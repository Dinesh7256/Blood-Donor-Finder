const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { BLOOD_GROUPS } = require("../constants/bloodGroups");

const MAX_SEARCH_RADIUS_KM = 50;

const hasValidLocation = (location) => {
  const coordinates = location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    !(longitude === 0 && latitude === 0)
  );
};

const searchDonors = async (req, res, next) => {
  try {
    const { bloodGroup, radius } = req.query;
    const radiusInKilometers = Number(radius);
    const coordinates = req.user.location && req.user.location.coordinates;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return next(new ApiError(400, "A valid bloodGroup is required"));
    }

    if (!Number.isFinite(radiusInKilometers) || radiusInKilometers <= 0) {
      return next(new ApiError(400, "A positive radius is required"));
    }

    if (radiusInKilometers > MAX_SEARCH_RADIUS_KM) {
      return next(new ApiError(400, `Radius cannot exceed ${MAX_SEARCH_RADIUS_KM} km`));
    }

    if (!coordinates || coordinates.length !== 2 || !hasValidLocation(req.user.location)) {
      return next(new ApiError(400, "Your location is required to search for donors"));
    }

    const donors = await User.find({
      _id: { $ne: req.user._id },
      bloodGroup,
      isAvailable: true,
      isBanned: false,
      phoneVerified: true,
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: radiusInKilometers * 1000,
        },
      },
    }).select("-email -fcmTokens -firebaseUid -phone");

    return res.status(200).json({
      success: true,
      data: donors.filter((donor) => hasValidLocation(donor.location)),
    });
  } catch (error) {
    if (error?.name === "MongoServerError" && /geo/i.test(error.message || "")) {
      return next(new ApiError(400, "Your location is required to search for donors"));
    }

    return next(error);
  }
};

module.exports = { searchDonors };
