const ApiError = require("./ApiError");
const { validateName, validateBloodGroup, validatePhone } = require("./userValidation");

const hasValidSavedLocation = (user) => {
  const coordinates = user?.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    !(longitude === 0 && latitude === 0)
  );
};

const computeProfileCompleted = (user) => {
  if (!user) {
    return false;
  }

  const nameValid = validateName(user.name).valid;
  const phoneValid = validatePhone(user.phone, { required: true }).valid;
  const bloodGroupValid = validateBloodGroup(user.bloodGroup).valid;
  const emailValid = typeof user.email === "string" && user.email.trim().length > 0;

  return (
    nameValid &&
    emailValid &&
    phoneValid &&
    bloodGroupValid &&
    hasValidSavedLocation(user)
  );
};

const getMissingProfileRequirements = (user) => {
  const missing = [];

  if (!validateName(user?.name).valid) {
    missing.push("full name");
  }

  if (!(typeof user?.email === "string" && user.email.trim())) {
    missing.push("email");
  }

  if (!validatePhone(user?.phone, { required: true }).valid) {
    missing.push("phone number");
  }

  if (!validateBloodGroup(user?.bloodGroup).valid) {
    missing.push("blood group");
  }

  if (!hasValidSavedLocation(user)) {
    missing.push("saved location");
  }

  return missing;
};

const PROFILE_FIELD_KEYS = {
  NAME: "name",
  EMAIL: "email",
  PHONE: "phone",
  BLOOD_GROUP: "bloodGroup",
  LOCATION: "location",
};

const getMissingProfileFieldKeys = (user) => {
  const missing = [];

  if (!validateName(user?.name).valid) {
    missing.push(PROFILE_FIELD_KEYS.NAME);
  }

  if (!(typeof user?.email === "string" && user.email.trim())) {
    missing.push(PROFILE_FIELD_KEYS.EMAIL);
  }

  if (!validatePhone(user?.phone, { required: true }).valid) {
    missing.push(PROFILE_FIELD_KEYS.PHONE);
  }

  if (!validateBloodGroup(user?.bloodGroup).valid) {
    missing.push(PROFILE_FIELD_KEYS.BLOOD_GROUP);
  }

  if (!hasValidSavedLocation(user)) {
    missing.push(PROFILE_FIELD_KEYS.LOCATION);
  }

  return missing;
};

const buildProfileStatus = (user) => {
  const profileComplete = computeProfileCompleted(user);
  const missingFields = getMissingProfileFieldKeys(user);

  return {
    profileComplete,
    missingFields,
  };
};

const serializeUserForClient = (user) => {
  const plainUser = user?.toObject ? user.toObject() : { ...user };
  const status = buildProfileStatus(user);

  return {
    ...plainUser,
    profileCompleted: status.profileComplete,
    missingFields: status.missingFields,
  };
};

const assertCanCreateBloodRequest = (user) => {
  if (!user?._id) {
    throw new ApiError(403, "Complete your profile before requesting blood.");
  }

  if (!computeProfileCompleted(user)) {
    const missing = getMissingProfileRequirements(user);
    const detail = missing.length ? ` Missing: ${missing.join(", ")}.` : "";
    throw new ApiError(403, `Complete your profile before requesting blood.${detail}`);
  }
};

module.exports = {
  hasValidSavedLocation,
  computeProfileCompleted,
  getMissingProfileRequirements,
  getMissingProfileFieldKeys,
  buildProfileStatus,
  serializeUserForClient,
  PROFILE_FIELD_KEYS,
  assertCanCreateBloodRequest,
};
