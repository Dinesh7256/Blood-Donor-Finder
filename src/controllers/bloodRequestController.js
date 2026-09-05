const BloodRequest = require("../models/BloodRequest");
const ApiError = require("../utils/ApiError");
const { notifyEligibleDonorsOfBloodRequest } = require("../services/notificationService");

const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_NOTIFICATION_RADIUS_KM = 10;
const MAX_NOTIFICATION_RADIUS_KM = 50;

const toLocation = (location) => {
  if (!location) return undefined;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, "Valid location latitude and longitude are required");
  }

  return { type: "Point", coordinates: [longitude, latitude] };
};

const parseNotificationRadius = (radius) => {
  if (radius === undefined || radius === null || radius === "") {
    return DEFAULT_NOTIFICATION_RADIUS_KM;
  }

  const parsedRadius = Number(radius);
  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    throw new ApiError(400, "radius must be a positive number");
  }

  if (parsedRadius > MAX_NOTIFICATION_RADIUS_KM) {
    throw new ApiError(400, `radius cannot exceed ${MAX_NOTIFICATION_RADIUS_KM} km`);
  }

  return parsedRadius;
};

const findRequestOrThrow = async (requestId) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Blood request not found");
  return request;
};

const createRequest = async (req, res, next) => {
  try {
    const {
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      location,
      emergency,
      radius,
    } = req.body;

    if (!bloodGroup || !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return next(new ApiError(400, "A valid bloodGroup is required"));
    }

    if (!hospitalName || typeof hospitalName !== "string" || !hospitalName.trim()) {
      return next(new ApiError(400, "hospitalName is required"));
    }

    if (!location) {
      return next(new ApiError(400, "location is required"));
    }

    const parsedUnits = unitsRequired === undefined ? 1 : Number(unitsRequired);
    if (!Number.isFinite(parsedUnits) || parsedUnits < 1) {
      return next(new ApiError(400, "unitsRequired must be at least 1"));
    }

    const notificationRadiusKm = parseNotificationRadius(radius);

    const request = await BloodRequest.create({
      requester: req.user._id,
      patientName: patientName?.trim() || null,
      bloodGroup,
      unitsRequired: parsedUnits,
      hospitalName: hospitalName.trim(),
      location: toLocation(location),
      emergency: Boolean(emergency),
    });

    await notifyEligibleDonorsOfBloodRequest({
      bloodRequest: request,
      requesterId: req.user._id,
      radiusKm: notificationRadiusKm,
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

const getActiveRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({ status: "active" }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return next(error);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({ requester: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return next(error);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate("requester", "name bloodGroup")
      .populate("acceptedDonor", "name bloodGroup");
    if (!request) return next(new ApiError(404, "Blood request not found"));
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const request = await findRequestOrThrow(req.params.id);
    if (request.status !== "active") return next(new ApiError(400, "Blood request is not active"));
    if (String(request.requester) === String(req.user._id)) {
      return next(new ApiError(400, "Cannot accept your own blood request"));
    }

    request.acceptedDonor = req.user._id;
    request.status = "fulfilled";
    await request.save();
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

const cancelRequest = async (req, res, next) => {
  try {
    const request = await findRequestOrThrow(req.params.id);
    if (String(request.requester) !== String(req.user._id)) {
      return next(new ApiError(403, "Only the requester can cancel this request"));
    }

    request.status = "cancelled";
    await request.save();
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRequest,
  getActiveRequests,
  getMyRequests,
  getRequestById,
  acceptRequest,
  cancelRequest,
  createBloodRequest: createRequest,
  getBloodRequests: getActiveRequests,
  getMyBloodRequests: getMyRequests,
  getBloodRequestById: getRequestById,
  acceptBloodRequest: acceptRequest,
  cancelBloodRequest: cancelRequest,
};
