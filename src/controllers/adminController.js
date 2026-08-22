const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const ApiError = require("../utils/ApiError");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-email -firebaseUid -fcmTokens");
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return next(error);
  }
};

const banUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: true },
      { new: true }
    ).select("-email -firebaseUid -fcmTokens");
    if (!user) return next(new ApiError(404, "User not found"));
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
};

const getAllBloodRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return next(error);
  }
};

const cancelBloodRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findByIdAndUpdate(
      req.params.requestId,
      { status: "cancelled" },
      { new: true }
    );
    if (!request) return next(new ApiError(404, "Blood request not found"));
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAllUsers, banUser, getAllBloodRequests, cancelBloodRequest };