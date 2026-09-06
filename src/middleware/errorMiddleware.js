const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
  next(new ApiError(404, `Not Found - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier supplied.",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation failed.",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}.`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    console.error(`[API ERROR] ${req.method} ${req.originalUrl} — ${message}`);
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
  }

  const response = {
    success: false,
    message: statusCode >= 500 ? "Something went wrong on our server. Please try again." : message,
  };

  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
