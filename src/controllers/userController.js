const ApiError = require("../utils/ApiError");

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

      const user = await req.user.save();
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      return next(error);
    }
  },

  saveDeviceToken: async (req, res, next) => {
    try {
      const { fcmToken } = req.body;

      if (!fcmToken || typeof fcmToken !== "string") {
        return next(new ApiError(400, "FCM token is required"));
      }

      if (!req.user.fcmTokens) req.user.fcmTokens = [];
      if (!req.user.fcmTokens.includes(fcmToken)) {
        req.user.fcmTokens.push(fcmToken);
        await req.user.save();
      }

      return res.status(200).json({ success: true, data: req.user });
    } catch (error) {
      return next(error);
    }
  },
};

module.exports = userController;
