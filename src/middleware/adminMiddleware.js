const ApiError = require("../utils/ApiError");

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return next(new ApiError(403, "Admin access required"));
};

module.exports = { admin };