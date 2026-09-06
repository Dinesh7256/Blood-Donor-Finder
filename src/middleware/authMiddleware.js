const admin = require("../config/firebase");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ApiError(401, "Not authorized, no token"));
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return next(new ApiError(404, "User not found in database"));
    }

    if (user.isBanned) {
      return next(new ApiError(403, "Your account has been suspended."));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, "Not authorized, token failed"));
  }
};

module.exports = { protect };
