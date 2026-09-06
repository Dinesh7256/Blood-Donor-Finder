const ApiError = require("../utils/ApiError");
const { isFcmRegistrationToken, isLikelyFirebaseIdToken } = require("../utils/fcmToken");
const { computeProfileCompleted, serializeUserForClient } = require("../utils/profileCompletion");
const { validateName, validateBloodGroup, validatePhone, validateAddress } = require("../utils/userValidation");

const parseDeviceToken = (body) => {
  const token = body?.token ?? body?.fcmToken;
  if (!token || typeof token !== "string") {
    return null;
  }
  return token.trim();
};

const handleDuplicatePhoneError = (error, next) => {
  if (error?.code === 11000 && error?.keyPattern?.phone) {
    return next(new ApiError(409, "This phone number is already in use."));
  }
  return next(error);
};

const userController = {
  getProfile: async (req, res, next) => {
    try {
      const profileCompleted = computeProfileCompleted(req.user);

      if (req.user.profileCompleted !== profileCompleted) {
        req.user.profileCompleted = profileCompleted;
        await req.user.save();
      }

      return res.status(200).json({ success: true, data: serializeUserForClient(req.user) });
    } catch (error) {
      return next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name, phone, bloodGroup, address, isAvailable } = req.body;

      if (name !== undefined) {
        const nameResult = validateName(name);
        if (!nameResult.valid) {
          return next(new ApiError(400, nameResult.message));
        }
        req.user.name = nameResult.value;
      }

      if (phone !== undefined) {
        const phoneResult = validatePhone(phone, { required: true });
        if (!phoneResult.valid) {
          return next(new ApiError(400, phoneResult.message));
        }

        if (phoneResult.value !== req.user.phone) {
          req.user.phone = phoneResult.value;
          req.user.phoneVerified = false;
        }
      }

      if (bloodGroup !== undefined) {
        const bloodGroupResult = validateBloodGroup(bloodGroup);
        if (!bloodGroupResult.valid) {
          return next(new ApiError(400, bloodGroupResult.message));
        }
        req.user.bloodGroup = bloodGroupResult.value;
      }

      if (address !== undefined) {
        const addressResult = validateAddress(address, { required: false });
        if (!addressResult.valid) {
          return next(new ApiError(400, addressResult.message));
        }
        req.user.address = addressResult.value;
      }

      if (isAvailable !== undefined) {
        req.user.isAvailable = Boolean(isAvailable);
      }

      const user = await req.user.save();
      return res.status(200).json({ success: true, data: serializeUserForClient(user) });
    } catch (error) {
      return handleDuplicatePhoneError(error, next);
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

      if (parsedLatitude < -90 || parsedLatitude > 90) {
        return next(new ApiError(400, "Latitude must be between -90 and 90"));
      }

      if (parsedLongitude < -180 || parsedLongitude > 180) {
        return next(new ApiError(400, "Longitude must be between -180 and 180"));
      }

      req.user.location = {
        type: "Point",
        coordinates: [parsedLongitude, parsedLatitude],
      };

      req.user.markModified("location");
      const user = await req.user.save();
      return res.status(200).json({ success: true, data: serializeUserForClient(user) });
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
