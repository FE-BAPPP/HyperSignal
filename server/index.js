const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Ticker = require("./models/Ticker");
const startWebSocket = require("./wsClient");
const Candle = require("./models/Candle");
const Funding = require("./models/FundingRate");
const OI = require("./models/OpenInterest");
const TechnicalIndicators = require('./services/TechnicalIndicators');
const SignalEngine = require('./services/SignalEngine');

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
  try {
    const { symbol, interval = '1m', limit = 100 } = req.query;
    
    const filter = {};
    if (symbol) filter.symbol = symbol;
    if (interval) filter.interval = interval;
    
    const data = await Candle.find(filter)
      .sort({ startTime: -1 })
      .limit(parseInt(limit));
    
    res.json(data.reverse()); // Reverse để có thứ tự tăng dần
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// Endpoint để lấy available intervals
app.get("/api/intervals", async (req, res) => {
  try {
    const { symbol } = req.query;
    
    const filter = {};
    if (symbol) filter.symbol = symbol;
    
    const intervals = await Candle.distinct('interval', filter);
    res.json(intervals.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint để force aggregation
app.post("/api/aggregate", async (req, res) => {
  try {
    const CandleAggregator = require("./services/CandleAggregator");
    const aggregator = new CandleAggregator();
    
    const { symbols = ['ETH', 'BTC', 'SOL'] } = req.body;
    
    // Run aggregation in background
    aggregator.runAggregation(symbols);
    
    res.json({ message: "Aggregation started", symbols });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint để lấy dữ liệu Funding Rate
app.get("/api/funding", async (req, res) => {
  const { symbol } = req.query;
  const data = await Funding.find({ symbol }).sort({ time: 1 }).limit(200);
  res.json(data);
});
// Endpoint để lấy dữ liệu Open Interest
app.get("/api/oi", async (req, res) => {
  const { symbol } = req.query;
  const data = await OI.find({ symbol }).sort({ time: 1 }).limit(200);
  res.json(data);
});

// Endpoint để xem tổng quan dữ liệu
app.get("/api/status", async (req, res) => {
  try {
    const candleCount = await Candle.countDocuments();
    const tradeCount = await Ticker.countDocuments();
    
    const latestCandle = await Candle.findOne().sort({ startTime: -1 });
    const latestTrade = await Ticker.findOne().sort({ time: -1 });
    
    const candlesBySymbol = await Candle.aggregate([
      { $group: { _id: "$symbol", count: { $sum: 1 }, latest: { $max: "$startTime" } } }
    ]);
    
    res.json({
      candles: {
        total: candleCount,
        bySymbol: candlesBySymbol,
        latest: latestCandle
      },
      trades: {
        total: tradeCount,
        latest: latestTrade
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm endpoint debug cho funding và oi
app.get("/api/funding/debug", async (req, res) => {
  try {
    const count = await Funding.countDocuments();
    const latest = await Funding.findOne().sort({ createdAt: -1 });
    const bySymbol = await Funding.aggregate([
      { $group: { _id: "$symbol", count: { $sum: 1 } } }
    ]);
    res.json({ count, latest, bySymbol });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/oi/debug", async (req, res) => {
  try {
    const count = await OI.countDocuments();
    const latest = await OI.findOne().sort({ createdAt: -1 });
    const bySymbol = await OI.aggregate([
      { $group: { _id: "$symbol", count: { $sum: 1 } } }
    ]);
    res.json({ count, latest, bySymbol });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint để kiểm tra data trong DB
app.get("/api/debug/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const stats = {
      symbol,
      tickers: await Ticker.countDocuments({ symbol }),
      candles: await Candle.countDocuments({ symbol }),
      funding: await Funding.countDocuments({ symbol }),
      oi: await OI.countDocuments({ symbol }),
      
      // Recent data
      recentTickers: await Ticker.find({ symbol }).sort({ time: -1 }).limit(5),
      recentCandles: await Candle.find({ symbol }).sort({ startTime: -1 }).limit(5),
      
      // Available intervals
      intervals: await Candle.distinct('interval', { symbol })
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint kiểm tra tất cả symbols
app.get("/api/debug-all", async (req, res) => {
  try {
    const symbols = ['ETH', 'BTC', 'SOL'];
    const results = {};
    
    for (const symbol of symbols) {
      results[symbol] = {
        tickers: await Ticker.countDocuments({ symbol }),
        candles: await Candle.countDocuments({ symbol }),
        funding: await Funding.countDocuments({ symbol }),
        oi: await OI.countDocuments({ symbol }),
        intervals: await Candle.distinct('interval', { symbol })
      };
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Technical Indicators API
app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    const indicators = await TechnicalIndicators.calculateAllIndicators(symbol, interval, parseInt(limit));
    
    if (!indicators) {
      return res.status(404).json({ error: `No data available for ${symbol} ${interval}` });
    }
    
    res.json(indicators);
  } catch (err) {
    console.error('❌ Error fetching indicators:', err);
    res.status(500).json({ error: err.message });
  }
});

// Signals API
app.get('/api/signals/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h' } = req.query;
    
    const signals = await SignalEngine.generateSignals(symbol, interval);
    
    res.json({
      symbol,
      interval,
      signals,
      count: signals.length,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('❌ Error generating signals:', err);
    res.status(500).json({ error: err.message });
  }
});

// All signals API
app.get('/api/signals/all', async (req, res) => {
  try {
    const { symbols = 'ETH,BTC,SOL', intervals = '1h,4h' } = req.query;
    
    const symbolList = symbols.split(',');
    const intervalList = intervals.split(',');
    
    console.log(`🎯 Generating signals for symbols: ${symbolList}, intervals: ${intervalList}`);
    
    const allSignals = await SignalEngine.generateAllSignals(symbolList, intervalList);
    
    // Đảm bảo format đúng
    const response = {
      bullish: allSignals.bullish || [],
      bearish: allSignals.bearish || [],
      total: allSignals.total || 0,
      timestamp: allSignals.timestamp || new Date(),
      symbols: symbolList,
      intervals: intervalList
    };
    
    console.log(`✅ Returning ${response.total} signals (${response.bullish.length} bullish, ${response.bearish.length} bearish)`);
    res.json(response);
    
  } catch (err) {
    console.error('❌ Error generating all signals:', err);
    res.status(500).json({ 
      error: err.message,
      bullish: [],
      bearish: [],
      total: 0,
      timestamp: new Date()
    });
  }
});

// Top signals API
app.get('/api/signals/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log(`🏆 Fetching top ${limit} signals...`);
    
    const allSignals = await SignalEngine.generateAllSignals(['ETH', 'BTC', 'SOL'], ['1h', '4h']);
    
    if (!allSignals.bullish || !allSignals.bearish) {
      return res.json({
        topSignals: [],
        count: 0,
        timestamp: new Date()
      });
    }
    
    const topSignals = [...allSignals.bullish, ...allSignals.bearish]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, parseInt(limit));
    
    res.json({
      topSignals,
      count: topSignals.length,
      timestamp: new Date()
    });
    
  } catch (err) {
    console.error('❌ Error fetching top signals:', err);
    res.status(500).json({ 
      error: err.message,
      topSignals: [],
      count: 0,
      timestamp: new Date()
    });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Backend running on port ${process.env.PORT}`)
);
