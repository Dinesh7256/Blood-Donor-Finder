// BloodRequest model for emergency or regular blood donation requests.
// Each request is tied to a requester and may be accepted by a donor.

const mongoose = require("mongoose");
const { DEFAULT_REQUEST_TTL_MS } = require("../constants/requestStatuses");

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

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: {
      type: String,
      default: null,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    unitsRequired: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    hospitalName: {
      type: String,
      required: true,
    },
    location: {
      type: locationSchema,
      default: {
        type: "Point",
        coordinates: [0, 0],
      },
    },
    message: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    emergency: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "fulfilled", "cancelled", "expired"],
      default: "active",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + DEFAULT_REQUEST_TTL_MS),
    },
    acceptedDonor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ location: "2dsphere" });
bloodRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ status: 1, expiresAt: 1 });
bloodRequestSchema.index(
  { requester: 1, bloodGroup: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
