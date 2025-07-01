const mongoose = require("mongoose");

const fundingRateSchema = new mongoose.Schema({
  symbol: String,
  fundingRate: Number,
  premium: Number,
  time: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 } // TTL 7 ngày
});

// Index không unique để tránh lỗi duplicate
fundingRateSchema.index({ symbol: 1, time: -1 });

module.exports = mongoose.model("FundingRate", fundingRateSchema);
