const admin = require("../config/firebase");
const ApiError = require("../utils/ApiError");
const { serializeUserForClient } = require("../utils/profileCompletion");
const {
  findOrCreateUserForFirebaseAccount,
} = require("../services/authUserProvisioning");

const isFirebaseAuthVerificationError = (error) =>
  Boolean(
    error?.code?.startsWith?.("auth/") ||
      /Decoding Firebase ID token|Firebase ID token|verifyIdToken/i.test(error?.message || "")
  );

const handleAuthRouteError = (error, next) => {
  if (isFirebaseAuthVerificationError(error)) {
    console.error("[AUTH BACKEND ERROR] Firebase ID token verification failed");
    return next(new ApiError(401, "Invalid or expired authentication token"));
  }

  return next(error);
};

const registerUser = async (req, res, next) => {
  try {
    const { idToken, name: requestedName, email: fallbackEmail } = req.body;

    if (!idToken) {
      return next(new ApiError(400, "Firebase ID token is required"));
    }

    console.log("[AUTH BACKEND] POST /auth/register request received");

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { user, created } = await findOrCreateUserForFirebaseAccount({
      decodedToken,
      requestedName,
      fallbackEmail,
    });

    const statusCode = created ? 201 : 200;
    const message = created ? undefined : "User already exists";

    return res.status(statusCode).json({
      success: true,
      data: serializeUserForClient(user),
      ...(message ? { message } : {}),
    });
  } catch (error) {
    if (error?.name === "MongoServerError" || error?.name === "ValidationError") {
      console.error("[AUTH BACKEND ERROR] MongoDB user creation failed");
    }
    return handleAuthRouteError(error, next);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return next(new ApiError(400, "Firebase ID token is required"));
    }

    console.log("[AUTH BACKEND] POST /auth/login request received");

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { user, created } = await findOrCreateUserForFirebaseAccount({
      decodedToken,
      requestedName: decodedToken.name,
    });

    if (created) {
      console.log(
        `[AUTH BACKEND] MongoDB user provisioned on login firebaseUid=${decodedToken.uid}`
      );
    }

    return res.status(200).json({
      success: true,
      data: serializeUserForClient(user),
    });
  } catch (error) {
    return handleAuthRouteError(error, next);
  }
};

module.exports = {
  registerUser,
  loginUser,
};
