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

  // Stochastic Oscillator
  static calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    const k = [];
    const d = [];
    
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      
      const kValue = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(kValue);
    }
    
    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < k.length; i++) {
      const dValue = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b) / dPeriod;
      d.push(dValue);
    }
    
    return { k, d };
  }

  // Williams %R
  static calculateWilliamsR(highs, lows, closes, period = 14) {
    const wr = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      
      const wrValue = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100;
      wr.push(wrValue);
    }
    
    return wr;
  }

  // Average True Range
  static calculateATR(highs, lows, closes, period = 14) {
    const tr = [];
    const atr = [];
    
    for (let i = 1; i < closes.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      
      tr.push(Math.max(hl, hc, lc));
    }
    
    // Calculate ATR (SMA of TR)
    for (let i = period - 1; i < tr.length; i++) {
      const atrValue = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      atr.push(atrValue);
    }
    
    return atr;
  }

  // Enhanced calculateAllIndicators
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
    
    candles.reverse();
    
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    const volumes = candles.map(c => c.volume || 1);
    
    const stoch = this.calculateStochastic(highs, lows, prices);
    const atr = this.calculateATR(highs, lows, prices);
    const williamsR = this.calculateWilliamsR(highs, lows, prices);
    
    const indicators = {
      symbol,
      interval,
      timestamp: new Date(),
      
      // Trend Indicators
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      sma100: this.calculateSMA(prices, 100),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      ema50: this.calculateEMA(prices, 50),
      
      // Oscillators
      rsi: this.calculateRSI(prices, 14),
      stochastic: stoch,
      williamsR: williamsR,
      
      // Momentum
      macd: this.calculateMACD(prices),
      
      // Volatility
      bollingerBands: this.calculateBollingerBands(prices, 20, 2),
      atr: atr,
      
      // Volume
      vwap: this.calculateVWAP(candles),
      
      // Support/Resistance
      supportResistance: this.calculateSupportResistance(candles, 50),
      
      // Current Values
      currentPrice: prices[prices.length - 1],
      currentVolume: volumes[volumes.length - 1],
      priceChange24h: ((prices[prices.length - 1] - prices[Math.max(0, prices.length - 24)]) / prices[Math.max(0, prices.length - 24)]) * 100,
      
      // Market Summary
      high24h: Math.max(...prices.slice(-24)),
      low24h: Math.min(...prices.slice(-24)),
      volume24h: volumes.slice(-24).reduce((a, b) => a + b, 0)
    };
    
    console.log(`📊 Enhanced indicators calculated for ${symbol} ${interval}`);
    return indicators;
  }
}

module.exports = TechnicalIndicators;