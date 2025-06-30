const mongoose = require("mongoose");

const tickerSchema = new mongoose.Schema({
  symbol: String,
  price: Number,
  time: Date,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 } // TTL 3 ngày
});

module.exports = mongoose.model("Ticker", tickerSchema);
