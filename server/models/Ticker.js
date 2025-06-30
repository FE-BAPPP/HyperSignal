const mongoose = require("mongoose");

const tickerSchema = new mongoose.Schema({
  symbol: String,
  price: Number,
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ticker", tickerSchema);
