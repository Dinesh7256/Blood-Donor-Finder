const {
  findEligibleDonorsForBloodRequest,
  getUniqueFcmTokens,
} = require("./donorMatchingService");
const { sendFcmPushNotifications } = require("./fcmPushService");
const { logFcm, logFcmError, maskToken } = require("../utils/fcmLog");
const User = require("../models/User");
const BloodRequestRecipient = require("../models/BloodRequestRecipient");
const { DONOR_RESPONSE_STATUS } = require("../constants/requestStatuses");

const formatDistanceForNotification = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    return "less than 1 km away";
  }

  return `${distanceKm.toFixed(1)} km away`;
};

const buildBloodRequestNotification = (bloodRequest, { distanceKm } = {}) => {
  const bloodGroup = bloodRequest.bloodGroup;
  const requestId = String(bloodRequest._id);
  const distanceLabel = formatDistanceForNotification(distanceKm);
  const body = distanceLabel
    ? `Blood Group: ${bloodGroup}. A nearby person needs blood. Distance: ${distanceLabel}. Tap to view the request.`
    : `Blood Group: ${bloodGroup}. A nearby person needs blood. Tap to view the request.`;

  return {
    title: "🩸 Urgent Blood Request",
    body,
    data: {
      type: "blood_request",
      requestId,
      bloodGroup,
      screen: "requests",
    },
  };
};

const buildDeliveries = (donors, { distanceByDonorId } = {}) => {
  const deliveries = [];
  const seenTokens = new Set();

  donors.forEach((donor) => {
    getUniqueFcmTokens(donor.fcmTokens).forEach((token) => {
      if (seenTokens.has(token)) {
        return;
      }

      seenTokens.add(token);
      deliveries.push({
        userId: donor._id,
        token,
        distanceKm: distanceByDonorId?.get(String(donor._id)) ?? null,
      });
    });
  });

  return deliveries;
};

const sendGroupedBloodRequestNotifications = async ({ bloodRequest, deliveries }) => {
  const groupedByDistance = deliveries.reduce((accumulator, delivery) => {
    const distanceKey =
      delivery.distanceKm === null || delivery.distanceKm === undefined
        ? "unknown"
        : String(Math.round(delivery.distanceKm * 10) / 10);

    if (!accumulator.has(distanceKey)) {
      accumulator.set(distanceKey, []);
    }

    accumulator.get(distanceKey).push(delivery);
    return accumulator;
  }, new Map());

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let invalidTokensRemoved = 0;

  for (const [distanceKey, groupedDeliveries] of groupedByDistance.entries()) {
    const distanceKm = distanceKey === "unknown" ? null : Number(distanceKey);
    const notification = buildBloodRequestNotification(bloodRequest, { distanceKm });
    const deliveryResult = await sendFcmPushNotifications({
      deliveries: groupedDeliveries,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });

    attempted += deliveryResult.attempted;
    sent += deliveryResult.sent;
    failed += deliveryResult.failed;
    invalidTokensRemoved += deliveryResult.invalidTokensRemoved || 0;
  }

  return {
    attempted,
    sent,
    failed,
    invalidTokensRemoved,
  };
};

const notifyEligibleDonorsOfBloodRequest = async ({
  bloodRequest,
  requesterId,
  radiusKm,
  eligibleDonors: preMatchedDonors = null,
  recipients = [],
}) => {
  const coordinates = bloodRequest?.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    logFcm("Blood request notification skipped — missing request location");
    return {
      notified: false,
      reason: "missing_request_location",
      attempted: 0,
      sent: 0,
      failed: 0,
      eligibleDonors: 0,
    };
  }

  try {
    const eligibleDonors =
      preMatchedDonors ||
      (await findEligibleDonorsForBloodRequest({
        bloodGroup: bloodRequest.bloodGroup,
        coordinates,
        radiusKm,
        requesterId,
      }));

    const distanceByDonorId = new Map(
      recipients.map((recipient) => [String(recipient.donor), recipient.distanceKm])
    );

    const deliveries = buildDeliveries(eligibleDonors, { distanceByDonorId });

    logFcm(
      `Blood request ${bloodRequest._id}: eligibleDonors=${eligibleDonors.length}, deliveries=${deliveries.length}`
    );

    if (!deliveries.length) {
      logFcm("No eligible recipients with device tokens — notification not sent");
      return {
        notified: false,
        reason: "no_eligible_recipients",
        attempted: 0,
        sent: 0,
        failed: 0,
        eligibleDonors: eligibleDonors.length,
      };
    }

    logFcm("Sending Firebase notification");
    deliveries.slice(0, 3).forEach((delivery, index) => {
      logFcm(`Recipient ${index + 1} donorId=${delivery.userId} token=${maskToken(delivery.token)}`);
    });

    const deliveryResult = await sendGroupedBloodRequestNotifications({
      bloodRequest,
      deliveries,
    });

    logFcm(
      `Firebase response: attempted=${deliveryResult.attempted}, sent=${deliveryResult.sent}, failed=${deliveryResult.failed}, invalidRemoved=${deliveryResult.invalidTokensRemoved}`
    );

    return {
      notified: deliveryResult.sent > 0,
      reason: deliveryResult.sent > 0 ? "sent" : "delivery_failed",
      eligibleDonors: eligibleDonors.length,
      ...deliveryResult,
    };
  } catch (error) {
    logFcmError("Blood request notification failed", error);

    return {
      notified: false,
      reason: "delivery_error",
      attempted: 0,
      sent: 0,
      failed: 0,
      eligibleDonors: 0,
    };
  }
};

const notifyRequesterOfBloodRequestAcceptance = async ({ bloodRequest, donor }) => {
  const requester = await User.findById(bloodRequest.requester).select("_id fcmTokens name");

  if (!requester) {
    logFcm(`Acceptance notification skipped — requester not found for request ${bloodRequest._id}`);
    return {
      notified: false,
      reason: "requester_not_found",
      attempted: 0,
      sent: 0,
      failed: 0,
    };
  }

  const deliveries = buildDeliveries([requester]);

  if (!deliveries.length) {
    logFcm(`Acceptance notification skipped — requester has no FCM tokens request=${bloodRequest._id}`);
    return {
      notified: false,
      reason: "no_requester_tokens",
      attempted: 0,
      sent: 0,
      failed: 0,
    };
  }

  const notification = {
    title: "🩸 Good News!",
    body: "A donor has accepted your blood request. Tap to view donor details.",
    data: {
      type: "blood_request_accepted",
      requestId: String(bloodRequest._id),
      screen: "request_detail",
    },
  };

  logFcm(`Sending acceptance notification for request ${bloodRequest._id} donor=${donor._id}`);

  const deliveryResult = await sendFcmPushNotifications({
    deliveries,
    title: notification.title,
    body: notification.body,
    data: notification.data,
  });

  return {
    notified: deliveryResult.sent > 0,
    reason: deliveryResult.sent > 0 ? "sent" : "delivery_failed",
    ...deliveryResult,
  };
};

const notifyDonorsOfBloodRequestCancellation = async ({ bloodRequest }) => {
  const pendingRecipients = await BloodRequestRecipient.find({
    bloodRequest: bloodRequest._id,
    status: DONOR_RESPONSE_STATUS.PENDING,
  }).populate("donor", "_id fcmTokens");

  const donors = pendingRecipients
    .map((recipient) => recipient.donor)
    .filter(Boolean);

  const deliveries = buildDeliveries(donors);

  if (!deliveries.length) {
    return {
      notified: false,
      reason: "no_pending_donor_tokens",
      attempted: 0,
      sent: 0,
      failed: 0,
    };
  }

  const notification = {
    title: "Blood Request Cancelled",
    body: "A nearby blood request has been cancelled.",
    data: {
      type: "blood_request_cancelled",
      requestId: String(bloodRequest._id),
      screen: "requests",
    },
  };

  const deliveryResult = await sendFcmPushNotifications({
    deliveries,
    title: notification.title,
    body: notification.body,
    data: notification.data,
  });

  return {
    notified: deliveryResult.sent > 0,
    reason: deliveryResult.sent > 0 ? "sent" : "delivery_failed",
    ...deliveryResult,
  };
};

module.exports = {
  notifyEligibleDonorsOfBloodRequest,
  notifyRequesterOfBloodRequestAcceptance,
  notifyDonorsOfBloodRequestCancellation,
};
