const User = require("../models/User");
const { getUniqueFcmTokens } = require("../utils/fcmToken");

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

const findEligibleDonorsForBloodRequest = async ({
  bloodGroup,
  coordinates,
  radiusKm,
  requesterId,
}) => {
  const donors = await User.find({
    _id: { $ne: requesterId },
    bloodGroup,
    isAvailable: true,
    isBanned: false,
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).select("_id fcmTokens location name bloodGroup");

  return donors.filter((donor) => hasValidLocation(donor.location));
};

module.exports = {
  findEligibleDonorsForBloodRequest,
  getUniqueFcmTokens,
  hasValidLocation,
};
