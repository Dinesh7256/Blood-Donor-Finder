const mongoose = require("mongoose");

const bloodBankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], required: true },
    },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

bloodBankSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("BloodBank", bloodBankSchema);