const mongoose = require("mongoose");

const fundingRateSchema = new mongoose.Schema({
  symbol: String,
  fundingRate: Number,
  nextFundingTime: Date,  // Thêm field này
  premium: Number,
  time: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 } // TTL 7 ngày
});

// Tạo compound index để tránh duplicate
fundingRateSchema.index({ symbol: 1, nextFundingTime: 1 }, { unique: true });

module.exports = mongoose.model("FundingRate", fundingRateSchema);
