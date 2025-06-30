const mongoose = require("mongoose");

const candleSchema = new mongoose.Schema({
  symbol: String,
  interval: String,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  startTime: Date,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 } // TTL 3 ngày
});

// Tạo compound index để tránh duplicate
candleSchema.index({ symbol: 1, interval: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model("Candle", candleSchema);
