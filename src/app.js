const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const donorRoutes = require("./routes/donorRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const bloodBankRoutes = require("./routes/bloodBankRoutes");
const healthTipRoutes = require("./routes/healthTipRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const {
  globalApiLimiter,
  authLimiter,
  bloodRequestCreateLimiter,
  donorSearchLimiter,
  phoneVerificationLimiter,
  deviceTokenLimiter,
} = require("./middleware/rateLimitMiddleware");

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/api", globalApiLimiter);

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/donors", donorSearchLimiter, donorRoutes);
app.use("/api/blood-requests", bloodRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/blood-banks", bloodBankRoutes);
app.use("/api/health-tips", healthTipRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Blood Donor Finder API is running",
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
