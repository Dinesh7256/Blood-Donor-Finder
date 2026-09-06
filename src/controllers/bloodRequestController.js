const BloodRequest = require("../models/BloodRequest");
const ApiError = require("../utils/ApiError");
const {
  notifyEligibleDonorsOfBloodRequest,
  notifyRequesterOfBloodRequestAcceptance,
} = require("../services/notificationService");
const { logFcm } = require("../utils/fcmLog");
const { BLOOD_GROUPS } = require("../constants/bloodGroups");
const { assertCanCreateBloodRequest } = require("../utils/profileCompletion");
const {
  createBloodRequestWithRecipients,
  respondToBloodRequest,
  getIncomingRequestsForDonor,
  getRequestsForRequester,
  getAuthorizedRequestDetail,
  serializeIncomingRequestForDonor,
  serializeRequestForRequester,
} = require("../services/bloodRequestService");

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
    assertCanCreateBloodRequest(req.user);

    const {
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      message,
      location,
      emergency,
      radius,
    } = req.body;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
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

    const trimmedMessage =
      typeof message === "string" && message.trim() ? message.trim().slice(0, 500) : null;

    const notificationRadiusKm = parseNotificationRadius(radius);

    const { request, recipients, eligibleDonors, summary } = await createBloodRequestWithRecipients({
      requester: req.user,
      payload: {
        patientName: patientName?.trim() || null,
        bloodGroup,
        unitsRequired: parsedUnits,
        hospitalName: hospitalName.trim(),
        message: trimmedMessage,
        location: toLocation(location),
        emergency: Boolean(emergency),
      },
      radiusKm: notificationRadiusKm,
    });

    logFcm(`Blood request created id=${request._id} requester=${req.user._id} bloodGroup=${bloodGroup}`);

    const notificationResult = await notifyEligibleDonorsOfBloodRequest({
      bloodRequest: request,
      requesterId: req.user._id,
      radiusKm: notificationRadiusKm,
    });

    logFcm(`Blood request notification result=${notificationResult.reason}`);

    return res.status(201).json({
      success: true,
      data: serializeRequestForRequester(request, recipients),
      notification: notificationResult,
      eligibleDonors: eligibleDonors.length,
    });
  } catch (error) {
    if (error.statusCode === 409 && error.data) {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: error.data,
      });
    }
    return next(error);
  }
};

const getActiveRequests = async (req, res, next) => {
  try {
    return res.status(403).json({
      success: false,
      message: "Use /blood-requests/mine or /blood-requests/incoming for your requests.",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const requests = await getRequestsForRequester(req.user._id);
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return next(error);
  }
};

const getIncomingRequests = async (req, res, next) => {
  try {
    const incoming = await getIncomingRequestsForDonor(req.user._id);
    const data = incoming.map(serializeIncomingRequestForDonor);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const data = await getAuthorizedRequestDetail({
      requestId: req.params.id,
      viewerUserId: req.user._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const respondToRequest = async (req, res, next) => {
  try {
    const response = req.body?.response;

    if (response !== "accept" && response !== "reject") {
      return next(new ApiError(400, "response must be 'accept' or 'reject'"));
    }

    const { request, recipient } = await respondToBloodRequest({
      requestId: req.params.id,
      donorId: req.user._id,
      response,
    });

    if (response === "accept") {
      await notifyRequesterOfBloodRequestAcceptance({
        bloodRequest: request,
        donor: req.user,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        requestId: request._id,
        recipientId: recipient._id,
        status: recipient.status,
        respondedAt: recipient.respondedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  req.body = { ...(req.body || {}), response: "accept" };
  return respondToRequest(req, res, next);
};

const rejectRequest = async (req, res, next) => {
  req.body = { ...(req.body || {}), response: "reject" };
  return respondToRequest(req, res, next);
};

const cancelRequest = async (req, res, next) => {
  try {
    const request = await findRequestOrThrow(req.params.id);
    if (String(request.requester) !== String(req.user._id)) {
      return next(new ApiError(403, "Only the requester can cancel this request"));
    }

    if (request.status !== "active") {
      return next(new ApiError(400, "This request is no longer available."));
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
  getIncomingRequests,
  getRequestById,
  respondToRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  createBloodRequest: createRequest,
  getBloodRequests: getActiveRequests,
  getMyBloodRequests: getMyRequests,
  getIncomingBloodRequests: getIncomingRequests,
  getBloodRequestById: getRequestById,
  respondToBloodRequest: respondToRequest,
  acceptBloodRequest: acceptRequest,
  rejectBloodRequest: rejectRequest,
  cancelBloodRequest: cancelRequest,
};
