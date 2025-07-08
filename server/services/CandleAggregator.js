const Candle = require("../models/Candle");

class CandleAggregator {
  constructor() {
    this.intervals = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };
  }

  // THÊM STATIC METHOD này để backend có thể gọi
  static async aggregateCandles(symbol) {
    try {
      console.log(`🔄 Starting aggregation for ${symbol}...`);
      
      const aggregator = new CandleAggregator();
      
      // Check if we have 1m candles
      const oneMinCandles = await Candle.find({ 
        symbol, 
        interval: '1m' 
      }).sort({ startTime: -1 }).limit(100);
      
      if (oneMinCandles.length === 0) {
        console.log(`⚠️ No 1m candles found for ${symbol}, trying to create from trades...`);
        
        // Tạo candles từ trades nếu cần
        const Ticker = require('../models/Ticker');
        const trades = await Ticker.find({ symbol })
          .sort({ time: -1 })
          .limit(1000);
          
        if (trades.length > 0) {
          // Group trades into 1m candles
          const candleMap = new Map();
          
          for (const trade of trades) {
            const minute = new Date(trade.time);
            minute.setSeconds(0, 0);
            const key = minute.toISOString();
            
            if (!candleMap.has(key)) {
              candleMap.set(key, {
                symbol,
                interval: '1m',
                startTime: minute,
                endTime: new Date(minute.getTime() + 60000),
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: 1,
                trades: 1
              });
            } else {
              const candle = candleMap.get(key);
              candle.high = Math.max(candle.high, trade.price);
              candle.low = Math.min(candle.low, trade.price);
              candle.close = trade.price;
              candle.volume++;
              candle.trades++;
            }
          }
          
          // Save 1m candles
          const candles = Array.from(candleMap.values());
          for (const candle of candles) {
            await Candle.findOneAndUpdate(
              {
                symbol: candle.symbol,
                interval: candle.interval,
                startTime: candle.startTime
              },
              candle,
              { upsert: true }
            );
          }
          
          console.log(`✅ Created ${candles.length} 1m candles from trades for ${symbol}`);
        }
      }
      
      // Now aggregate to higher timeframes
      console.log(`📊 Aggregating ${symbol} to higher timeframes...`);
      
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '5m');
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '15m');
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '30m');
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '1h');
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '4h');
      await aggregator.aggregateFromBaseCandles(symbol, '1m', '1d');
      
      // Generate signals
      await aggregator.generateSignalsForSymbol(symbol);
      
      return {
        symbol,
        success: true,
        message: `Aggregation completed for ${symbol}`,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Static aggregation error for ${symbol}:`, error);
      throw error;
    }
  }

  // Tạo candle từ trades
  async createFromTrades(symbol, trades, interval = '1m') {
    if (!trades || trades.length === 0) return null;

    const intervalMs = this.intervals[interval] * 60 * 1000;
    const firstTradeTime = new Date(trades[0].time);
    const startTime = this.getIntervalStartTime(firstTradeTime, interval);
    const endTime = new Date(startTime.getTime() + intervalMs);

    // Filter trades trong khoảng thời gian
    const intervalTrades = trades.filter(trade => {
      const tradeTime = new Date(trade.time);
      return tradeTime >= startTime && tradeTime < endTime;
    });

    if (intervalTrades.length === 0) return null;

    // Tính OHLC
    const prices = intervalTrades.map(t => parseFloat(t.price));
    const candleData = {
      symbol,
      interval,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: intervalTrades.length, // Tạm dùng số lượng trades
      startTime,
      endTime
    };

    try {
      await Candle.findOneAndUpdate(
        { symbol, interval, startTime },
        candleData,
        { upsert: true, new: true }
      );
      
      console.log(`✅ [${symbol}] ${interval} candle: ${candleData.open} → ${candleData.close}`);
      return candleData;
    } catch (err) {
      console.error(`❌ Error creating ${interval} candle:`, err.message);
      return null;
    }
  }

  // Aggregate từ candle nhỏ hơn
  async aggregateFromBaseCandles(symbol, baseInterval = '1m', targetInterval = '5m') {
    try {
      console.log(`🔄 Aggregating ${symbol} from ${baseInterval} to ${targetInterval}`);
      
      const baseIntervalMs = this.intervals[baseInterval] * 60 * 1000;
      const targetIntervalMs = this.intervals[targetInterval] * 60 * 1000;
      
      if (targetIntervalMs <= baseIntervalMs) {
        console.warn(`⚠️ Target interval ${targetInterval} must be larger than base ${baseInterval}`);
        return;
      }

      // Lấy base candles từ 24h gần nhất
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const baseCandles = await Candle.find({
        symbol,
        interval: baseInterval,
        startTime: { $gte: last24h }
      }).sort({ startTime: 1 });

      if (baseCandles.length === 0) {
        console.log(`📊 No ${baseInterval} candles found for ${symbol}`);
        return;
      }

      console.log(`📊 Found ${baseCandles.length} ${baseInterval} candles for ${symbol}`);

      // Group candles theo target interval
      const groups = this.groupCandlesByInterval(baseCandles, targetInterval);
      
      let aggregatedCount = 0;
      for (const group of groups) {
        if (group.candles.length > 0) {
          await this.createAggregatedCandle(symbol, group, targetInterval);
          aggregatedCount++;
        }
      }

      console.log(`✅ Created ${aggregatedCount} ${targetInterval} candles for ${symbol}`);
    } catch (err) {
      console.error(`❌ Error aggregating ${symbol} ${baseInterval}→${targetInterval}:`, err.message);
    }
  }

  // Group candles theo interval
  groupCandlesByInterval(candles, targetInterval) {
    const groups = [];
    const intervalMs = this.intervals[targetInterval] * 60 * 1000;

    for (const candle of candles) {
      const intervalStart = this.getIntervalStartTime(candle.startTime, targetInterval);
      
      // Tìm group phù hợp
      let group = groups.find(g => g.startTime.getTime() === intervalStart.getTime());
      
      if (!group) {
        group = {
          startTime: intervalStart,
          endTime: new Date(intervalStart.getTime() + intervalMs),
          candles: []
        };
        groups.push(group);
      }
      
      group.candles.push(candle);
    }

    return groups.filter(g => g.candles.length > 0);
  }

  // Tạo aggregated candle từ group
  async createAggregatedCandle(symbol, group, interval) {
    const candles = group.candles.sort((a, b) => a.startTime - b.startTime);
    
    const candleData = {
      symbol,
      interval,
      open: candles[0].open,
      high: Math.max(...candles.map(c => c.high)),
      low: Math.min(...candles.map(c => c.low)),
      close: candles[candles.length - 1].close,
      volume: candles.reduce((sum, c) => sum + (c.volume || 0), 0),
      startTime: group.startTime,
      endTime: group.endTime
    };

    try {
      await Candle.findOneAndUpdate(
        { symbol, interval, startTime: group.startTime },
        candleData,
        { upsert: true, new: true }
      );
      
      console.log(`📊 [${symbol}] ${interval} ${candleData.open} → ${candleData.close} (${candles.length} base candles)`);
    } catch (err) {
      console.error(`❌ Error saving ${interval} candle:`, err.message);
    }
  }

  // Lấy start time của interval
  getIntervalStartTime(date, interval) {
    const d = new Date(date);
    const intervalMinutes = this.intervals[interval];
    
    if (interval === '1d') {
      d.setUTCHours(0, 0, 0, 0);
    } else if (interval === '4h') {
      const hours = Math.floor(d.getUTCHours() / 4) * 4;
      d.setUTCHours(hours, 0, 0, 0);
    } else if (interval === '1h') {
      d.setUTCMinutes(0, 0, 0);
    } else {
      const minutes = Math.floor(d.getUTCMinutes() / intervalMinutes) * intervalMinutes;
      d.setUTCMinutes(minutes, 0, 0);
    }
    
    return d;
  }

  // Chạy aggregation cho tất cả timeframes với signal generation
  async runAggregation(symbols = ['ETH', 'BTC', 'SOL']) {
    console.log('🔄 Starting full candle aggregation...');
    
    for (const symbol of symbols) {
      try {
        console.log(`📊 Processing ${symbol}...`);
        
        // Aggregate từ 1m → các timeframe khác
        await this.aggregateFromBaseCandles(symbol, '1m', '5m');
        await this.aggregateFromBaseCandles(symbol, '1m', '15m');
        await this.aggregateFromBaseCandles(symbol, '1m', '30m');
        await this.aggregateFromBaseCandles(symbol, '1m', '1h');
        await this.aggregateFromBaseCandles(symbol, '1m', '4h');
        await this.aggregateFromBaseCandles(symbol, '1m', '1d');
        
        console.log(`✅ Completed aggregation for ${symbol}`);
        
        // Generate signals after aggregation
        await this.generateSignalsForSymbol(symbol);
        
      } catch (err) {
        console.error(`❌ Error aggregating ${symbol}:`, err.message);
      }
    }
    
    console.log('✅ Full candle aggregation completed');
  }

  // Generate signals for a symbol
  async generateSignalsForSymbol(symbol) {
    try {
      console.log(`🎯 Generating signals for ${symbol}...`);
      
      // Generate signals for multiple timeframes
      const timeframes = ['1h', '4h'];
      let totalSignals = 0;
      
      for (const timeframe of timeframes) {
        try {
          const SignalEngine = require('./SignalEngine');
          const signals = await SignalEngine.generateSignals(symbol, timeframe);
          totalSignals += signals.length;
          
          if (signals.length > 0) {
            console.log(`🎯 [${symbol} ${timeframe}] Generated ${signals.length} signals:`);
            signals.slice(0, 3).forEach(signal => {
              console.log(`   ${signal.type === 'bullish' ? '📈' : '📉'} ${signal.signalType}: ${signal.strength}% - ${signal.description}`);
            });
          }
        } catch (signalErr) {
          console.error(`❌ Error generating signals for ${symbol} ${timeframe}:`, signalErr.message);
        }
      }
      
      if (totalSignals > 0) {
        console.log(`✅ [${symbol}] Total ${totalSignals} signals generated`);
      }
      
    } catch (err) {
      console.error(`❌ Error generating signals for ${symbol}:`, err.message);
    }
  }
}

module.exports = CandleAggregator;