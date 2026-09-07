const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const ApiError = require("../utils/ApiError");
const {
  cancelBloodRequest: cancelBloodRequestForRequester,
  getRecipientsForRequest,
  serializeRequestForRequester,
} = require("../services/bloodRequestService");
const { notifyDonorsOfBloodRequestCancellation } = require("../services/notificationService");

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
    if (String(req.params.userId) === String(req.user._id)) {
      return next(new ApiError(400, "Cannot ban yourself"));
    }

    const existingUser = await User.findById(req.params.userId).select("role");

    if (!existingUser) {
      return next(new ApiError(404, "User not found"));
    }

    if (existingUser.role === "admin") {
      return next(new ApiError(403, "Cannot ban an admin user"));
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: true },
      { new: true }
    ).select("-email -firebaseUid -fcmTokens");

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
    const request = await BloodRequest.findById(req.params.requestId);

    if (!request) {
      return next(new ApiError(404, "Blood request not found"));
    }

    const cancelledRequest = await cancelBloodRequestForRequester({
      requestId: request._id,
      requesterId: request.requester,
    });

    await notifyDonorsOfBloodRequestCancellation({ bloodRequest: cancelledRequest });

    const recipients = await getRecipientsForRequest(cancelledRequest._id);

    return res.status(200).json({
      success: true,
      data: serializeRequestForRequester(cancelledRequest, recipients),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAllUsers, banUser, getAllBloodRequests, cancelBloodRequest };
