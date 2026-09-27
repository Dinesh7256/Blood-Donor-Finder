const admin = require("../config/firebase");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const resolveAccountEmail = async (decodedToken, fallbackEmail) => {
  const fromToken = decodedToken?.email;
  if (typeof fromToken === "string" && fromToken.trim()) {
    return fromToken.trim().toLowerCase();
  }

  if (typeof fallbackEmail === "string" && fallbackEmail.trim()) {
    return fallbackEmail.trim().toLowerCase();
  }

  const record = await admin.auth().getUser(decodedToken.uid);
  if (typeof record.email === "string" && record.email.trim()) {
    return record.email.trim().toLowerCase();
  }

  return null;
};

const resolveDisplayName = (decodedToken, requestedName, email) => {
  if (typeof requestedName === "string" && requestedName.trim()) {
    return requestedName.trim();
  }

  if (typeof decodedToken?.name === "string" && decodedToken.name.trim()) {
    return decodedToken.name.trim();
  }

  if (email && email.includes("@")) {
    return email.split("@")[0];
  }

  return "User";
};

/**
 * Finds MongoDB user by Firebase UID or creates one for a verified Firebase account.
 */
const findOrCreateUserForFirebaseAccount = async ({
  decodedToken,
  requestedName,
  fallbackEmail,
}) => {
  const firebaseUid = decodedToken.uid;
  console.log(`[AUTH BACKEND] Firebase UID=${firebaseUid} register/login provisioning started`);

  const existingUser = await User.findOne({ firebaseUid });
  console.log(
    `[AUTH BACKEND] MongoDB lookup by firebaseUid found=${Boolean(existingUser)}`
  );

  if (existingUser) {
    if (existingUser.isBanned) {
      throw new ApiError(403, "Your account has been suspended.");
    }
    return { user: existingUser, created: false };
  }

  const email = await resolveAccountEmail(decodedToken, fallbackEmail);
  if (!email) {
    console.error(
      `[AUTH BACKEND ERROR] Cannot create MongoDB user — no email for Firebase UID=${firebaseUid}`
    );
    throw new ApiError(
      400,
      "Email is required to create your account. Please sign up with email and password."
    );
  }

  const name = resolveDisplayName(decodedToken, requestedName, email);

  try {
    const newUser = await User.create({
      firebaseUid,
      email,
      name,
    });
    console.log(
      `[AUTH BACKEND] MongoDB user created firebaseUid=${firebaseUid} userId=${newUser._id}`
    );
    return { user: newUser, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      console.error("[AUTH BACKEND ERROR] MongoDB user creation failed — duplicate key");

      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "email") {
        const byEmail = await User.findOne({ email });
        if (byEmail && byEmail.firebaseUid !== firebaseUid) {
          throw new ApiError(
            409,
            "This email is already registered with another account. Try logging in or use a different email."
          );
        }
      }
    }

    if (error?.name === "ValidationError") {
      console.error("[AUTH BACKEND ERROR] MongoDB user creation failed — validation");
    }

    throw error;
  }
};

module.exports = {
  findOrCreateUserForFirebaseAccount,
  resolveAccountEmail,
};
