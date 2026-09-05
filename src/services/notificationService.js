const {
  findEligibleDonorsForBloodRequest,
  getUniqueFcmTokens,
} = require("./donorMatchingService");
const { sendFcmPushNotifications } = require("./fcmPushService");

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

    if (!deliveries.length) {
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
    const deliveryResult = await sendFcmPushNotifications({
      deliveries,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[notifications] Blood request ${bloodRequest._id}: eligible=${eligibleDonors.length}, attempted=${deliveryResult.attempted}, sent=${deliveryResult.sent}, failed=${deliveryResult.failed}`
      );
    }

    return {
      notified: deliveryResult.sent > 0,
      reason: deliveryResult.sent > 0 ? "sent" : "delivery_failed",
      eligibleDonors: eligibleDonors.length,
      ...deliveryResult,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[notifications] Blood request notification failed:", error.message);
    }

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
