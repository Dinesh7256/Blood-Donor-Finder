const { BLOOD_GROUPS } = require("../constants/bloodGroups");

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

const normalizeIndianPhone = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const digitsOnly = String(value).replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const local = digitsOnly.slice(2);
    return /^[6-9]\d{9}$/.test(local) ? local : null;
  }

  if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return null;
};

const validateName = (value) => {
  const name = typeof value === "string" ? value.trim() : "";

  if (!name) {
    return { valid: false, message: "Full name is required" };
  }

  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Full name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
    };
  }

  return { valid: true, value: name };
};

const validatePhone = (value, { required = true } = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (required) {
      return { valid: false, message: "Enter a valid mobile number." };
    }
    return { valid: true, value: null };
  }

  const normalized = normalizeIndianPhone(value);

  if (!normalized) {
    return { valid: false, message: "Enter a valid mobile number." };
  }

  return { valid: true, value: normalized };
};

const validateBloodGroup = (value) => {
  if (!value || !BLOOD_GROUPS.includes(value)) {
    return { valid: false, message: "A valid blood group is required" };
  }

  return { valid: true, value };
};

const ADDRESS_MAX_LENGTH = 200;

const validateAddress = (value, { required = false } = {}) => {
  if (value === undefined || value === null) {
    return required
      ? { valid: false, message: "Address is required" }
      : { valid: true, value: null };
  }

  const address = typeof value === "string" ? value.trim() : "";

  if (!address) {
    return required
      ? { valid: false, message: "Address is required" }
      : { valid: true, value: null };
  }

  if (address.length > ADDRESS_MAX_LENGTH) {
    return {
      valid: false,
      message: `Address must be ${ADDRESS_MAX_LENGTH} characters or fewer`,
    };
  }

  return { valid: true, value: address };
};

module.exports = {
  BLOOD_GROUPS,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  ADDRESS_MAX_LENGTH,
  normalizeIndianPhone,
  validateName,
  validateBloodGroup,
  validatePhone,
  validateAddress,
};
