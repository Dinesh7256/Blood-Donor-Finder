const ApiError = require("../utils/ApiError");
const { isFcmRegistrationToken, isLikelyFirebaseIdToken } = require("../utils/fcmToken");

const parseDeviceToken = (body) => {
  const token = body?.token ?? body?.fcmToken;
  if (!token || typeof token !== "string") {
    return null;
  }
  return token.trim();
};

const userController = {
  getProfile: async (req, res, next) => {
    try {
      return res.status(200).json({ success: true, data: req.user });
    } catch (error) {
      return next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name, bloodGroup, isAvailable } = req.body;

      if (name !== undefined) req.user.name = name;
      if (bloodGroup !== undefined) req.user.bloodGroup = bloodGroup;
      if (isAvailable !== undefined) req.user.isAvailable = isAvailable;

      const user = await req.user.save();
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      return next(error);
    }
  },

  updateLocation: async (req, res, next) => {
    try {
      const { latitude, longitude } = req.body;
      const parsedLatitude = Number(latitude);
      const parsedLongitude = Number(longitude);

      if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
        return next(new ApiError(400, "Valid latitude and longitude are required"));
      }

      req.user.location = {
        type: "Point",
        coordinates: [parsedLongitude, parsedLatitude],
      };

      req.user.markModified("location");
      const user = await req.user.save();
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      return next(error);
    }
  },

  registerDeviceToken: async (req, res, next) => {
    try {
      const token = parseDeviceToken(req.body);

      if (!token) {
        return next(new ApiError(400, "token is required"));
      }

      if (isLikelyFirebaseIdToken(token)) {
        return next(new ApiError(400, "Invalid FCM token format"));
      }

      if (!isFcmRegistrationToken(token)) {
        return next(new ApiError(400, "A valid FCM registration token is required"));
      }

      if (!req.user.fcmTokens) req.user.fcmTokens = [];
      if (!req.user.fcmTokens.includes(token)) {
        req.user.fcmTokens.push(token);
        await req.user.save();
      }

      return res.status(200).json({
        success: true,
        data: { registered: true, tokenCount: req.user.fcmTokens.length },
      });
    } catch (error) {
      return next(error);
    }
  },

  removeDeviceToken: async (req, res, next) => {
    try {
      const token = parseDeviceToken(req.body);

      if (!token) {
        return next(new ApiError(400, "token is required"));
      }

      if (!req.user.fcmTokens?.length) {
        return res.status(200).json({ success: true, data: { removed: false } });
      }

      const nextTokens = req.user.fcmTokens.filter((storedToken) => storedToken !== token);
      const removed = nextTokens.length !== req.user.fcmTokens.length;

      if (removed) {
        req.user.fcmTokens = nextTokens;
        await req.user.save();
      }

      return res.status(200).json({
        success: true,
        data: { removed, tokenCount: req.user.fcmTokens.length },
      });
    } catch (error) {
      return next(error);
    }
  },
};

module.exports = userController;
