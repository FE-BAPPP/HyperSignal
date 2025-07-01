const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  symbol: String,
  rate: Number,
  time: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 }
});

module.exports = mongoose.model("FundingRate", schema);
