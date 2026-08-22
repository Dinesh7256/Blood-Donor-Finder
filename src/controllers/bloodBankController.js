const BloodBank = require("../models/BloodBank");
const ApiError = require("../utils/ApiError");

const toLocation = (location) => {
  if (!location) throw new ApiError(400, "Location is required");
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, "Valid location latitude and longitude are required");
  }
  return { type: "Point", coordinates: [longitude, latitude] };
};

const getBloodBanks = async (req, res, next) => {
  try {
    const bloodBanks = await BloodBank.find().sort({ name: 1 });
    return res.status(200).json({ success: true, data: bloodBanks });
  } catch (error) {
    return next(error);
  }
};

const createBloodBank = async (req, res, next) => {
  try {
    // TODO: Add admin middleware when blood-bank moderation is enabled.
    const { name, address, location, phone } = req.body;
    const bloodBank = await BloodBank.create({
      name,
      address,
      location: toLocation(location),
      phone,
    });
    return res.status(201).json({ success: true, data: bloodBank });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getBloodBanks, createBloodBank };