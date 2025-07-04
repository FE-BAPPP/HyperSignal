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
    
    console.log(`📊 Calculating indicators for ${symbol} ${interval}, limit: ${limit}`);
    
    try {
      const candles = await Candle.find({ symbol, interval })
        .sort({ startTime: -1 })
        .limit(limit)
        .lean();
      
      console.log(`📊 Found ${candles.length} candles for ${symbol} ${interval}`);
      
      if (candles.length === 0) {
        console.log(`⚠️ No candles found for ${symbol} ${interval}`);
        return null;
      }
      
      // Lower requirements - accept even 5+ candles
      if (candles.length < 5) {
        console.log(`⚠️ Not enough candles for any indicators: ${candles.length} < 5 for ${symbol} ${interval}`);
        return null;
      }
      
      // Reverse to chronological order for calculations
      candles.reverse();
      
      const prices = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const volumes = candles.map(c => c.volume || 1);
      
      console.log(`📊 Processing ${prices.length} price points for ${symbol} ${interval}`);
      
      // Adaptive periods based on available data
      const availableLength = prices.length;
      const rsiPeriod = Math.min(14, Math.max(5, availableLength - 1));
      const smaPeriod = Math.min(20, Math.max(5, availableLength - 1));
      const emaPeriod = Math.min(12, Math.max(3, availableLength - 1));
      const macdFast = Math.min(12, Math.max(3, availableLength - 1));
      const macdSlow = Math.min(26, Math.max(6, availableLength - 1));
      
      console.log(`📊 Using adaptive periods: RSI=${rsiPeriod}, SMA=${smaPeriod}, EMA=${emaPeriod}`);
      
      const indicators = {
        symbol,
        interval,
        timestamp: new Date(),
        candleCount: candles.length,
        
        // Trend Indicators (adaptive)
        sma20: availableLength >= 5 ? this.calculateSMA(prices, Math.min(smaPeriod, availableLength - 1)) : [],
        sma50: availableLength >= 10 ? this.calculateSMA(prices, Math.min(50, availableLength - 1)) : [],
        ema12: availableLength >= 3 ? this.calculateEMA(prices, Math.min(emaPeriod, availableLength - 1)) : [],
        ema26: availableLength >= 6 ? this.calculateEMA(prices, Math.min(26, availableLength - 1)) : [],
        
        // Oscillators (adaptive)
        rsi: availableLength >= 6 ? this.calculateRSI(prices, rsiPeriod) : [],
        
        // Momentum (adaptive)
        macd: availableLength >= 10 ? this.calculateMACD(prices, macdFast, Math.min(macdSlow, availableLength - 1), 3) : { macd: [], signal: [], histogram: [] },
        
        // Volatility (adaptive)
        bollingerBands: availableLength >= 10 ? this.calculateBollingerBands(prices, Math.min(20, availableLength - 1), 2) : { upper: [], middle: [], lower: [] },
        
        // Current Values
        currentPrice: prices[prices.length - 1],
        priceChange24h: availableLength >= 2 ? 
          ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0,
        
        // Market Summary
        high24h: Math.max(...prices),
        low24h: Math.min(...prices),
        volume24h: volumes.reduce((a, b) => a + b, 0)
      };
      
      console.log(`✅ Indicators calculated for ${symbol} ${interval}: RSI=${indicators.rsi.length}, SMA20=${indicators.sma20.length}, MACD=${indicators.macd.macd.length}`);
      return indicators;
      
    } catch (err) {
      console.error(`❌ Error calculating indicators for ${symbol} ${interval}:`, err.message);
      return null;
    }
  }
}

module.exports = TechnicalIndicators;