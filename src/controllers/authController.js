const admin = require("../config/firebase");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { serializeUserForClient } = require("../utils/profileCompletion");

const registerUser = async (req, res, next) => {
  try {
    const { idToken, name: requestedName } = req.body;

    if (!idToken) {
      return next(new ApiError(400, "Firebase ID token is required"));
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    const existingUser = await User.findOne({ firebaseUid: uid });

    if (existingUser) {
      if (existingUser.isBanned) {
        return next(new ApiError(403, "Your account has been suspended."));
      }

      return res.status(200).json({
        success: true,
        data: serializeUserForClient(existingUser),
        message: "User already exists",
      });
    }

    const newUser = await User.create({
      firebaseUid: uid,
      email,
      name: requestedName || name || email,
    });

    return res.status(201).json({
      success: true,
      data: serializeUserForClient(newUser),
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return next(new ApiError(400, "Firebase ID token is required"));
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return next(new ApiError(404, "User not found, please register"));
    }

    if (user.isBanned) {
      return next(new ApiError(403, "Your account has been suspended."));
    }

    return res.status(200).json({
      success: true,
      data: serializeUserForClient(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
};
