const mongoose = require("mongoose");

const candleSchema = new mongoose.Schema({
  symbol: String,
  interval: String, // 1m, 5m, 15m, 1h, 4h, 1d
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: { type: Number, default: 0 },
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } // TTL 30 ngày
});

// Compound index cho query hiệu quả
candleSchema.index({ symbol: 1, interval: 1, startTime: 1 }, { unique: true });
candleSchema.index({ symbol: 1, interval: 1, startTime: -1 }); // Cho sort desc

module.exports = mongoose.model("Candle", candleSchema);
