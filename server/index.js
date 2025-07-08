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
app.use(express.json()); // Thêm middleware để parse JSON

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

// Sửa lại endpoint aggregate
app.post("/api/aggregate", async (req, res) => {
  try {
    console.log('🔄 Aggregation request received:', req.body);
    
    const CandleAggregator = require("./services/CandleAggregator");
    
    const { symbols = ['ETH', 'BTC', 'SOL'] } = req.body;
    
    console.log(`📊 Starting aggregation for symbols: ${symbols.join(', ')}`);
    
    // Run aggregation for each symbol
    for (const symbol of symbols) {
      console.log(`🎯 Aggregating ${symbol}...`);
      await CandleAggregator.aggregateCandles(symbol);
    }
    
    console.log('✅ Aggregation completed successfully');
    
    res.json({ 
      success: true,
      message: `Aggregation completed for ${symbols.join(', ')}`, 
      symbols,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Aggregation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
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

// Fix the /api/signals/all endpoint

app.get('/api/signals/all', async (req, res) => {
  try {
    const { symbols = 'ETH,BTC,SOL', intervals = '1m,5m,15m,30m' } = req.query; // Default to fast intervals
    
    const symbolList = symbols.split(',').map(s => s.trim());
    const intervalList = intervals.split(',').map(i => i.trim());
    
    console.log(`🎯 Generating signals for symbols: ${symbolList}, intervals: ${intervalList}`);
    
    const SignalEngine = require('./services/SignalEngine');
    const allSignals = await SignalEngine.generateAllSignals(symbolList, intervalList);
    
    const response = {
      bullish: allSignals.bullish || [],
      bearish: allSignals.bearish || [],
      total: allSignals.total || 0,
      timestamp: allSignals.timestamp || new Date(),
      symbols: symbolList,
      intervals: intervalList,
      debug: {
        requestedSymbols: symbolList,
        requestedIntervals: intervalList,
        bullishCount: allSignals.bullish?.length || 0,
        bearishCount: allSignals.bearish?.length || 0
      }
    };
    
    console.log(`✅ API Response: ${response.total} signals (${response.bullish.length} bullish, ${response.bearish.length} bearish)`);
    res.json(response);
    
  } catch (err) {
    console.error('❌ Error in /api/signals/all:', err);
    res.status(500).json({ 
      error: err.message,
      bullish: [],
      bearish: [],
      total: 0,
      timestamp: new Date()
    });
  }
});

// Add specific endpoint for frontend
app.get('/api/signals/dashboard', async (req, res) => {
  try {
    console.log('🎯 Dashboard signals request...');
    
    const SignalEngine = require('./services/SignalEngine');
    
    // Get signals from fast timeframes that have data
    const fastSignals = await SignalEngine.generateAllSignals(['ETH', 'BTC', 'SOL'], ['1m', '5m']);
    
    // Get signals from medium timeframes  
    const mediumSignals = await SignalEngine.generateAllSignals(['ETH', 'BTC', 'SOL'], ['15m', '30m']);
    
    // Combine all signals
    const allSignals = [
      ...fastSignals.bullish,
      ...fastSignals.bearish,
      ...mediumSignals.bullish,
      ...mediumSignals.bearish
    ];
    
    const response = {
      bullish: allSignals.filter(s => s.type === 'bullish').sort((a, b) => b.strength - a.strength),
      bearish: allSignals.filter(s => s.type === 'bearish').sort((a, b) => b.strength - a.strength),
      total: allSignals.length,
      timestamp: new Date(),
      breakdown: {
        fast: {
          bullish: fastSignals.bullish.length,
          bearish: fastSignals.bearish.length,
          timeframes: ['1m', '5m']
        },
        medium: {
          bullish: mediumSignals.bullish.length,
          bearish: mediumSignals.bearish.length,
          timeframes: ['15m', '30m']
        }
      }
    };
    
    console.log(`✅ Dashboard signals: ${response.total} total (${response.bullish.length} bullish, ${response.bearish.length} bearish)`);
    res.json(response);
    
  } catch (err) {
    console.error('❌ Error in dashboard signals:', err);
    res.status(500).json({ 
      error: err.message,
      bullish: [],
      bearish: [],
      total: 0,
      timestamp: new Date()
    });
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

// Get technical indicators for a symbol
app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    console.log(`📊 Fetching indicators for ${symbol} ${interval}`);
    
    const indicators = await TechnicalIndicators.calculateAllIndicators(symbol, interval, parseInt(limit));
    
    if (!indicators) {
      return res.status(404).json({ 
        error: `No data available for ${symbol} ${interval}`,
        symbol,
        interval,
        timestamp: new Date()
      });
    }
    
    console.log(`✅ Indicators calculated for ${symbol} ${interval}`);
    res.json(indicators);
  } catch (err) {
    console.error('❌ Error fetching indicators:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get signals for a specific symbol
app.get('/api/signals/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h' } = req.query;
    
    console.log(`🎯 Generating signals for ${symbol} ${interval}`);
    
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

// Add this missing endpoint (you defined it as POST but it's missing in the file)

app.get('/api/test/any-signals', async (req, res) => {
  try {
    console.log('🧪 Testing signals with any available data...');
    
    // Find any available candle data
    const availableData = await Candle.aggregate([
      {
        $group: {
          _id: { symbol: '$symbol', interval: '$interval' },
          count: { $sum: 1 },
          latest: { $max: '$startTime' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('📊 Available candle data:', availableData);
    
    if (availableData.length === 0) {
      return res.json({
        message: 'No candle data available in database',
        suggestion: 'Run aggregation first: POST /api/aggregate',
        timestamp: new Date()
      });
    }
    
    // Test with the most abundant data
    const { symbol, interval } = availableData[0]._id;
    console.log(`🎯 Testing with ${symbol} ${interval} (${availableData[0].count} candles)`);
    
    const testSignals = await SignalEngine.generateSignals(symbol, interval);
    
    res.json({
      message: 'SignalEngine test with available data',
      usedData: availableData[0],
      testResults: {
        symbol,
        interval,
        signalCount: testSignals.length,
        signals: testSignals.slice(0, 5), // Show first 5
        timestamp: new Date()
      },
      allAvailableData: availableData
    });
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    res.status(500).json({ 
      error: err.message,
      message: 'Test failed'
    });
  }
});

// Thêm health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT}`);
});