const mongoose = require("mongoose");

const bloodRequestRecipientSchema = new mongoose.Schema(
  {
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: true,
      index: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    notifiedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestRecipientSchema.index({ bloodRequest: 1, donor: 1 }, { unique: true });
bloodRequestRecipientSchema.index({ donor: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("BloodRequestRecipient", bloodRequestRecipientSchema);
