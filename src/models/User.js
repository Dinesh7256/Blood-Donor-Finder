// User model for blood donor and requester accounts.
// Stores personal information, blood group, availability, and location.

const mongoose = require("mongoose");
const { computeProfileCompleted } = require("../utils/profileCompletion");

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },
    location: {
      type: locationSchema,
      default: {
        type: "Point",
        coordinates: [0, 0],
      },
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.pre("save", function updateProfileCompletion(next) {
  this.profileCompleted = computeProfileCompleted(this);
  next();
});

module.exports = mongoose.model("User", userSchema);
