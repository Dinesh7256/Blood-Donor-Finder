const BloodRequest = require("../models/BloodRequest");
const BloodRequestRecipient = require("../models/BloodRequestRecipient");
const ApiError = require("../utils/ApiError");
const { haversineDistanceKm } = require("../utils/distance");
const { findEligibleDonorsForBloodRequest } = require("./donorMatchingService");
const {
  DONOR_RESPONSE_STATUS,
  REQUEST_LIFECYCLE_STATUS,
  RESPONDABLE_REQUEST_STATUSES,
  DEFAULT_REQUEST_TTL_MS,
} = require("../constants/requestStatuses");

const DUPLICATE_REQUEST_WINDOW_MS = 2 * 60 * 1000;

const buildRecipientSummary = (recipients = []) => {
  const summary = {
    notified: recipients.length,
    pending: 0,
    accepted: 0,
    rejected: 0,
  };

  recipients.forEach((recipient) => {
    if (recipient.status === "pending") summary.pending += 1;
    if (recipient.status === "accepted") summary.accepted += 1;
    if (recipient.status === "rejected") summary.rejected += 1;
  });

  return summary;
};

const sanitizeRequester = (requester, { includeContact = false } = {}) => {
  if (!requester) {
    return null;
  }

  const sanitized = {
    _id: requester._id,
    name: requester.name,
    bloodGroup: requester.bloodGroup,
  };

  if (includeContact && requester.phone) {
    sanitized.phone = requester.phone;
  }

  return sanitized;
};

const sanitizeAcceptedDonorForRequester = (recipient) => {
  const donor = recipient.donor;

  if (!donor || recipient.status !== DONOR_RESPONSE_STATUS.ACCEPTED) {
    return null;
  }

  return {
    recipientId: recipient._id,
    donorId: donor._id,
    name: donor.name,
    phone: donor.phone,
    bloodGroup: donor.bloodGroup,
    distanceKm: recipient.distanceKm,
    respondedAt: recipient.respondedAt,
  };
};

const serializeBloodRequestBase = (request) => ({
  _id: request._id,
  bloodGroup: request.bloodGroup,
  hospitalName: request.hospitalName,
  message: request.message,
  patientName: request.patientName,
  unitsRequired: request.unitsRequired,
  emergency: request.emergency,
  status: request.status,
  expiresAt: request.expiresAt,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

const serializeRequestForRequester = (request, recipients = []) => {
  const acceptedDonors = recipients
    .map(sanitizeAcceptedDonorForRequester)
    .filter(Boolean);

  return {
    ...serializeBloodRequestBase(request),
    role: "requester",
    summary: buildRecipientSummary(recipients),
    acceptedDonors,
  };
};

const serializeIncomingRequestForDonor = (recipient) => {
  const request = recipient.bloodRequest;

  return {
    recipientId: recipient._id,
    requestId: request._id,
    status: recipient.status,
    distanceKm: recipient.distanceKm,
    notifiedAt: recipient.notifiedAt,
    respondedAt: recipient.respondedAt,
    createdAt: recipient.createdAt,
    request: {
      ...serializeBloodRequestBase(request),
      requester: sanitizeRequester(request.requester),
    },
  };
};

const serializeRequestDetail = ({ request, recipients, viewerUserId, viewerRecipient }) => {
  const isRequester = String(request.requester?._id || request.requester) === String(viewerUserId);

  if (isRequester) {
    return serializeRequestForRequester(request, recipients);
  }

  if (!viewerRecipient) {
    throw new ApiError(403, "You are not authorized to view this request");
  }

  const donorAccepted = viewerRecipient.status === DONOR_RESPONSE_STATUS.ACCEPTED;

  return {
    ...serializeBloodRequestBase(request),
    role: "donor",
    recipientId: viewerRecipient._id,
    responseStatus: viewerRecipient.status,
    distanceKm: viewerRecipient.distanceKm,
    respondedAt: viewerRecipient.respondedAt,
    requester: sanitizeRequester(request.requester, { includeContact: donorAccepted }),
  };
};

const expireStaleActiveRequests = async () => {
  const now = new Date();

  await BloodRequest.updateMany(
    {
      status: REQUEST_LIFECYCLE_STATUS.ACTIVE,
      expiresAt: { $lte: now },
    },
    {
      $set: { status: REQUEST_LIFECYCLE_STATUS.EXPIRED },
    }
  );
};

const loadRespondableRequest = async (requestId) => {
  await expireStaleActiveRequests();

  const request = await BloodRequest.findById(requestId);

  if (!request) {
    throw new ApiError(404, "Blood request not found");
  }

  if (request.status === REQUEST_LIFECYCLE_STATUS.EXPIRED) {
    throw new ApiError(400, "This blood request is no longer active.");
  }

  assertRequestIsRespondable(request);
  return request;
};

const assertRequestIsRespondable = (request) => {
  if (!RESPONDABLE_REQUEST_STATUSES.has(request.status)) {
    if (request.status === REQUEST_LIFECYCLE_STATUS.CANCELLED) {
      throw new ApiError(400, "This blood request is no longer active.");
    }
    if (request.status === REQUEST_LIFECYCLE_STATUS.EXPIRED) {
      throw new ApiError(400, "This blood request is no longer active.");
    }
    throw new ApiError(400, "This request is no longer available.");
  }
};

const findRecentDuplicateRequest = async (requesterId, bloodGroup) => {
  const cutoff = new Date(Date.now() - DUPLICATE_REQUEST_WINDOW_MS);

  return BloodRequest.findOne({
    requester: requesterId,
    bloodGroup,
    status: REQUEST_LIFECYCLE_STATUS.ACTIVE,
    createdAt: { $gte: cutoff },
  }).sort({ createdAt: -1 });
};

const createBloodRequestWithRecipients = async ({
  requester,
  payload,
  radiusKm,
}) => {
  const duplicate = await findRecentDuplicateRequest(requester._id, payload.bloodGroup);

  if (duplicate) {
    const error = new ApiError(409, "You already have an active blood request for this blood group.");
    error.data = duplicate;
    throw error;
  }

  const request = await BloodRequest.create({
    requester: requester._id,
    patientName: payload.patientName,
    bloodGroup: payload.bloodGroup,
    unitsRequired: payload.unitsRequired,
    hospitalName: payload.hospitalName,
    message: payload.message,
    location: payload.location,
    emergency: payload.emergency,
    expiresAt: new Date(Date.now() + DEFAULT_REQUEST_TTL_MS),
  });

  const requestCoordinates = request.location.coordinates;
  const eligibleDonors = await findEligibleDonorsForBloodRequest({
    bloodGroup: request.bloodGroup,
    coordinates: requestCoordinates,
    radiusKm,
    requesterId: requester._id,
  });

  const recipientDocs = eligibleDonors.map((donor) => {
    const donorCoordinates = donor.location.coordinates;
    const distanceKm = haversineDistanceKm(
      requestCoordinates[0],
      requestCoordinates[1],
      donorCoordinates[0],
      donorCoordinates[1]
    );

    return {
      bloodRequest: request._id,
      donor: donor._id,
      distanceKm,
    };
  });

  let recipients = [];

  if (recipientDocs.length) {
    recipients = await BloodRequestRecipient.insertMany(recipientDocs, { ordered: false }).catch(
      async (error) => {
        if (error?.writeErrors) {
          return BloodRequestRecipient.find({ bloodRequest: request._id });
        }
        throw error;
      }
    );
  }

  return {
    request,
    recipients,
    eligibleDonors,
    summary: buildRecipientSummary(recipients),
  };
};

const respondToBloodRequest = async ({ requestId, donorId, response }) => {
  const request = await loadRespondableRequest(requestId);

  const nextStatus =
    response === "accept" ? DONOR_RESPONSE_STATUS.ACCEPTED : DONOR_RESPONSE_STATUS.REJECTED;

  const recipient = await BloodRequestRecipient.findOneAndUpdate(
    {
      bloodRequest: requestId,
      donor: donorId,
      status: DONOR_RESPONSE_STATUS.PENDING,
    },
    {
      $set: {
        status: nextStatus,
        respondedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!recipient) {
    const existingRecipient = await BloodRequestRecipient.findOne({
      bloodRequest: requestId,
      donor: donorId,
    });

    if (!existingRecipient) {
      throw new ApiError(403, "You are not authorized to respond to this request.");
    }

    throw new ApiError(400, "You have already responded to this request.");
  }

  return {
    request,
    recipient,
  };
};

const getRecipientsForRequest = async (requestId) =>
  BloodRequestRecipient.find({ bloodRequest: requestId })
    .populate("donor", "name phone bloodGroup")
    .sort({ createdAt: 1 });

const getIncomingRequestsForDonor = async (donorId) => {
  await expireStaleActiveRequests();

  const incoming = await BloodRequestRecipient.find({ donor: donorId })
    .populate({
      path: "bloodRequest",
      match: { status: REQUEST_LIFECYCLE_STATUS.ACTIVE },
      populate: {
        path: "requester",
        select: "name bloodGroup phone",
      },
    })
    .sort({ createdAt: -1 });

  return incoming
    .filter((recipient) => recipient.bloodRequest)
    .map((recipient) => {
      const includeContact = recipient.status === DONOR_RESPONSE_STATUS.ACCEPTED;
      const request = recipient.bloodRequest;

      if (request?.requester) {
        request.requester = sanitizeRequester(request.requester, { includeContact });
      }

      return recipient;
    });
};

const getRequestsForRequester = async (requesterId) => {
  await expireStaleActiveRequests();

  const requests = await BloodRequest.find({ requester: requesterId }).sort({ createdAt: -1 });
  const requestIds = requests.map((request) => request._id);

  const recipients = await BloodRequestRecipient.find({
    bloodRequest: { $in: requestIds },
  })
    .populate("donor", "name phone bloodGroup")
    .sort({ createdAt: 1 });

  const recipientsByRequestId = recipients.reduce((accumulator, recipient) => {
    const key = String(recipient.bloodRequest);
    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(recipient);
    return accumulator;
  }, new Map());

  return requests.map((request) =>
    serializeRequestForRequester(request, recipientsByRequestId.get(String(request._id)) || [])
  );
};

const getAuthorizedRequestDetail = async ({ requestId, viewerUserId }) => {
  await expireStaleActiveRequests();

  const request = await BloodRequest.findById(requestId).populate(
    "requester",
    "name bloodGroup phone"
  );

  if (!request) {
    throw new ApiError(404, "Blood request not found");
  }

  const isRequester = String(request.requester._id) === String(viewerUserId);
  const recipients = await getRecipientsForRequest(requestId);
  const viewerRecipient = recipients.find(
    (recipient) => String(recipient.donor?._id || recipient.donor) === String(viewerUserId)
  );

  if (!isRequester && !viewerRecipient) {
    throw new ApiError(403, "You are not authorized to view this request");
  }

  return serializeRequestDetail({
    request,
    recipients,
    viewerUserId,
    viewerRecipient,
  });
};

module.exports = {
  DUPLICATE_REQUEST_WINDOW_MS,
  buildRecipientSummary,
  serializeRequestForRequester,
  serializeIncomingRequestForDonor,
  serializeRequestDetail,
  assertRequestIsRespondable,
  expireStaleActiveRequests,
  createBloodRequestWithRecipients,
  respondToBloodRequest,
  getRecipientsForRequest,
  getIncomingRequestsForDonor,
  getRequestsForRequester,
  getAuthorizedRequestDetail,
};
