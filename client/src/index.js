const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Ticker = require("./models/Ticker");
const startWebSocket = require("./wsClient");
const Candle = require("./models/Candle");

dotenv.config();
const app = express();
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    startWebSocket();
  })
  .catch(console.error);

app.get("/api/ticker", async (req, res) => {
  const { symbol } = req.query;
  const filter = symbol ? { symbol } : {};
  const data = await Ticker.find(filter).sort({ time: 1 }).limit(1000);
  res.json(data);
});

app.get("/api/trades", async (req, res) => {
    const { symbol } = req.query;
    const query = symbol ? { symbol } : {};
    const trades = await Ticker.find(query).sort({ time: -1 }).limit(20);
    res.json(trades);
})

app.get("/api/candles", async (req, res) => {
  const { symbol = "ETH", interval = "1m" } = req.query;
  const candles = await Candle.find({ symbol, interval }).sort({ startTime: 1 }).limit(100);
  res.json(candles);
});

app.get("/api/candles/debug", async (req, res) => {
  try {
    const count = await Candle.countDocuments();
    const latest = await Candle.findOne().sort({ createdAt: -1 });
    const bySymbol = await Candle.aggregate([
      { $group: { _id: "$symbol", count: { $sum: 1 } } }
    ]);
    res.json({ 
      totalCandles: count, 
      latestCandle: latest,
      candlesBySymbol: bySymbol
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Backend running on port ${process.env.PORT}`)
);
