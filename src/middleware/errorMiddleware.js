const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier supplied.",
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
