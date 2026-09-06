const {
  findEligibleDonorsForBloodRequest,
  getUniqueFcmTokens,
} = require("./donorMatchingService");
const { sendFcmPushNotifications } = require("./fcmPushService");
const { logFcm, logFcmError, maskToken } = require("../utils/fcmLog");

const buildBloodRequestNotification = (bloodRequest) => {
  const bloodGroup = bloodRequest.bloodGroup;
  const requestId = String(bloodRequest._id);

  return {
    title: "Blood Donation Request",
    body: `Someone nearby needs ${bloodGroup} blood.`,
    data: {
      type: "blood_request",
      requestId,
      bloodGroup,
    },
  };
};

const buildDeliveries = (donors) => {
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
      });
    });
  });

  return deliveries;
};

const notifyEligibleDonorsOfBloodRequest = async ({
  bloodRequest,
  requesterId,
  radiusKm,
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
    const eligibleDonors = await findEligibleDonorsForBloodRequest({
      bloodGroup: bloodRequest.bloodGroup,
      coordinates,
      radiusKm,
      requesterId,
    });

    const deliveries = buildDeliveries(eligibleDonors);

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

    const notification = buildBloodRequestNotification(bloodRequest);
    logFcm("Sending Firebase notification");
    deliveries.slice(0, 3).forEach((delivery, index) => {
      logFcm(`Recipient ${index + 1} donorId=${delivery.userId} token=${maskToken(delivery.token)}`);
    });

    const deliveryResult = await sendFcmPushNotifications({
      deliveries,
      title: notification.title,
      body: notification.body,
      data: notification.data,
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

module.exports = {
  notifyEligibleDonorsOfBloodRequest,
};
