// server/services/TechnicalIndicators.js
class TechnicalIndicators {
  // RSI (Relative Strength Index)
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return [];
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsiValues = [];
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      
      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
      }
    }
    
    return rsiValues;
  }

  // MACD (Moving Average Convergence Divergence)
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    const macdLine = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  // EMA (Exponential Moving Average)
  static calculateEMA(prices, period) {
    if (prices.length < period) return [];
    
    const multiplier = 2 / (period + 1);
    const emaValues = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
      const ema = (prices[i] * multiplier) + (emaValues[i - 1] * (1 - multiplier));
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  // SMA (Simple Moving Average)
  static calculateSMA(prices, period) {
    if (prices.length < period) return [];
    
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
      smaValues.push(sum / period);
    }
    
    return smaValues;
  }

  // Bollinger Bands
  static calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
    if (prices.length < period) return { upper: [], middle: [], lower: [] };
    
    const sma = this.calculateSMA(prices, period);
    const upper = [];
    const lower = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b) / period;
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      const middleValue = sma[i - period + 1];
      upper.push(middleValue + (stdDev * stdDevMultiplier));
      lower.push(middleValue - (stdDev * stdDevMultiplier));
    }
    
    return {
      upper: upper,
      middle: sma,
      lower: lower
    };
  }

  // Volume Weighted Average Price
  static calculateVWAP(candles) {
    if (!candles || candles.length === 0) return [];
    
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;
    const vwapValues = [];
    
    for (const candle of candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume || 1;
      
      cumulativeVolumePrice += typicalPrice * volume;
      cumulativeVolume += volume;
      
      vwapValues.push(cumulativeVolumePrice / cumulativeVolume);
    }
    
    return vwapValues;
  }

  // Support and Resistance Levels
  static calculateSupportResistance(candles, lookback = 50) {
    if (candles.length < lookback) return { supports: [], resistances: [] };
    
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const supports = [];
    const resistances = [];
    
    // Find local minima (supports) and maxima (resistances)
    for (let i = 2; i < candles.length - 2; i++) {
      // Support: local minimum
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        supports.push({
          price: lows[i],
          time: candles[i].startTime,
          strength: this.calculateLevelStrength(lows[i], candles.slice(Math.max(0, i - lookback), i + lookback))
        });
      }
      
      // Resistance: local maximum
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        resistances.push({
          price: highs[i],
          time: candles[i].startTime,
          strength: this.calculateLevelStrength(highs[i], candles.slice(Math.max(0, i - lookback), i + lookback))
        });
      }
    }
    
    return { supports, resistances };
  }

  static calculateLevelStrength(level, candles) {
    let touches = 0;
    const tolerance = level * 0.001; // 0.1% tolerance
    
    for (const candle of candles) {
      if (Math.abs(candle.high - level) <= tolerance || 
          Math.abs(candle.low - level) <= tolerance) {
        touches++;
      }
    }
    
    return touches;
  }

  // Calculate all indicators for a symbol
  static async calculateAllIndicators(symbol, interval = '1h', limit = 100) {
    const Candle = require('../models/Candle');
    
    const candles = await Candle.find({ symbol, interval })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    
    if (candles.length < 20) {
      console.log(`⚠️ Not enough data for ${symbol} ${interval} indicators`);
      return null;
    }
    
    // Reverse to chronological order for calculations
    candles.reverse();
    
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const indicators = {
      symbol,
      interval,
      timestamp: new Date(),
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices, 20, 2),
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      vwap: this.calculateVWAP(candles),
      supportResistance: this.calculateSupportResistance(candles, 50),
      currentPrice: prices[prices.length - 1],
      priceChange24h: ((prices[prices.length - 1] - prices[Math.max(0, prices.length - 24)]) / prices[Math.max(0, prices.length - 24)]) * 100
    };
    
    console.log(`📊 Calculated indicators for ${symbol} ${interval}`);
    return indicators;
  }
}

module.exports = TechnicalIndicators;