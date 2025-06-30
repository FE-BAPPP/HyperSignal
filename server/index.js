const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Ticker = require("./models/Ticker");
const startWebSocket = require("./wsClient");

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

app.listen(process.env.PORT, () =>
  console.log(`🚀 Backend running on port ${process.env.PORT}`)
);
