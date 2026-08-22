const BloodRequest = require("../models/BloodRequest");
const ApiError = require("../utils/ApiError");

const toLocation = (location) => {
  if (!location) return undefined;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, "Valid location latitude and longitude are required");
  }

  return { type: "Point", coordinates: [longitude, latitude] };
};

const findRequestOrThrow = async (requestId) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Blood request not found");
  return request;
};

const createRequest = async (req, res, next) => {
  try {
    const { patientName, bloodGroup, unitsRequired, hospitalName, location, emergency } = req.body;
    const request = await BloodRequest.create({
      requester: req.user._id,
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      location: toLocation(location),
      emergency,
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
