// server/services/SignalEngine.js
const TechnicalIndicators = require('./TechnicalIndicators');
const Candle = require('../models/Candle');

// Remove FundingRate dependency nếu không có
// const FundingRate = require('../models/FundingRate');

class SignalEngine {
  static async generateSignals(symbol, interval = '1h') {
    try {
      console.log(`🔍 Generating signals for ${symbol} ${interval}...`);
      
      const indicators = await TechnicalIndicators.calculateAllIndicators(symbol, interval, 100);
      if (!indicators) {
        console.log(`⚠️ No indicators data for ${symbol} ${interval}`);
        return [];
      }
      
      const signals = [];
      
      // RSI Signals
      const rsiSignals = this.detectRSISignals(symbol, interval, indicators);
      signals.push(...rsiSignals);
      
      // MACD Signals  
      const macdSignals = this.detectMACDSignals(symbol, interval, indicators);
      signals.push(...macdSignals);
      
      // Bollinger Bands Signals
      const bbSignals = this.detectBollingerSignals(symbol, interval, indicators);
      signals.push(...bbSignals);
      
      // Moving Average Signals
      const maSignals = this.detectMASignals(symbol, interval, indicators);
      signals.push(...maSignals);
      
      // Funding Rate Signals (optional)
      try {
        const fundingSignals = await this.detectFundingSignals(symbol, interval);
        signals.push(...fundingSignals);
      } catch (err) {
        console.log(`⚠️ Skipping funding signals for ${symbol}: ${err.message}`);
      }
      
      // Sort by strength
      const sortedSignals = signals.sort((a, b) => b.strength - a.strength);
      
      console.log(`✅ Generated ${sortedSignals.length} signals for ${symbol} ${interval}`);
      return sortedSignals;
      
    } catch (err) {
      console.error(`❌ Error generating signals for ${symbol} ${interval}:`, err.message);
      return [];
    }
  }

  // RSI Oversold/Overbought Signals
  static detectRSISignals(symbol, interval, indicators) {
    const signals = [];
    const rsi = indicators.rsi;
    
    if (!rsi || rsi.length === 0) {
      console.log(`⚠️ No RSI data for ${symbol} ${interval}`);
      return signals;
    }
    
    const currentRSI = rsi[rsi.length - 1];
    const prevRSI = rsi.length > 1 ? rsi[rsi.length - 2] : currentRSI; // Use current if no previous
    
    console.log(`📊 RSI for ${symbol} ${interval}: current=${currentRSI.toFixed(1)}, prev=${prevRSI.toFixed(1)}`);
    
    // RSI Oversold (< 35) - lowered threshold
    if (currentRSI < 35) {
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'rsi_oversold',
        description: `RSI oversold (${currentRSI.toFixed(1)})`,
        strength: Math.min(95, 100 - currentRSI * 2),
        price: indicators.currentPrice,
        rsi: currentRSI,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // RSI Overbought (> 65) - lowered threshold
    if (currentRSI > 65) {
      signals.push({
        symbol,
        interval,
        type: 'bearish',
        signalType: 'rsi_overbought',
        description: `RSI overbought (${currentRSI.toFixed(1)})`,
        strength: Math.min(95, (currentRSI - 50) * 2),
        price: indicators.currentPrice,
        rsi: currentRSI,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // RSI divergence - if we have enough data
    if (rsi.length > 2 && prevRSI < currentRSI && currentRSI > 30 && currentRSI < 50) {
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'rsi_bullish_divergence',
        description: `RSI showing bullish momentum (${currentRSI.toFixed(1)})`,
        strength: 60,
        price: indicators.currentPrice,
        rsi: currentRSI,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    return signals;
  }

  // MACD Crossover Signals
  static detectMACDSignals(symbol, interval, indicators) {
    const signals = [];
    const macdData = indicators.macd;
    
    if (!macdData || !macdData.macd || !macdData.signal || !macdData.histogram) {
      console.log(`⚠️ No MACD data for ${symbol} ${interval}`);
      return signals;
    }
    
    const { macd, signal, histogram } = macdData;
    
    if (macd.length < 2 || signal.length < 2) return signals;
    
    const currentMACD = macd[macd.length - 1];
    const prevMACD = macd[macd.length - 2];
    const currentSignal = signal[signal.length - 1];
    const prevSignal = signal[signal.length - 2];
    const currentHist = histogram[histogram.length - 1];
    
    // Bullish MACD crossover
    if (prevMACD <= prevSignal && currentMACD > currentSignal && currentHist > 0) {
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'macd_bullish_crossover',
        description: `MACD bullish crossover`,
        strength: Math.min(90, Math.abs(currentHist) * 1000),
        price: indicators.currentPrice,
        macd: currentMACD,
        signal: currentSignal,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // Bearish MACD crossover
    if (prevMACD >= prevSignal && currentMACD < currentSignal && currentHist < 0) {
      signals.push({
        symbol,
        interval,
        type: 'bearish',
        signalType: 'macd_bearish_crossover',
        description: `MACD bearish crossover`,
        strength: Math.min(90, Math.abs(currentHist) * 1000),
        price: indicators.currentPrice,
        macd: currentMACD,
        signal: currentSignal,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    return signals;
  }

  // Bollinger Bands Signals
  static detectBollingerSignals(symbol, interval, indicators) {
    const signals = [];
    const bbData = indicators.bollingerBands;
    const currentPrice = indicators.currentPrice;
    
    if (!bbData || !bbData.upper || !bbData.lower || bbData.upper.length === 0) {
      console.log(`⚠️ No Bollinger Bands data for ${symbol} ${interval}`);
      return signals;
    }
    
    const { upper, middle, lower } = bbData;
    const currentUpper = upper[upper.length - 1];
    const currentMiddle = middle[middle.length - 1];
    const currentLower = lower[lower.length - 1];
    
    // Price touching lower band (oversold)
    if (currentPrice <= currentLower * 1.01) { // 1% tolerance
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'bb_oversold',
        description: `Price near Bollinger lower band`,
        strength: 75,
        price: currentPrice,
        lowerBand: currentLower,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // Price touching upper band (overbought)  
    if (currentPrice >= currentUpper * 0.99) { // 1% tolerance
      signals.push({
        symbol,
        interval,
        type: 'bearish',
        signalType: 'bb_overbought',
        description: `Price near Bollinger upper band`,
        strength: 75,
        price: currentPrice,
        upperBand: currentUpper,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    return signals;
  }

  // Moving Average Signals
  static detectMASignals(symbol, interval, indicators) {
    const signals = [];
    const { sma20, sma50 } = indicators;
    const currentPrice = indicators.currentPrice;
    
    if (!sma20 || !sma50 || sma20.length < 2 || sma50.length < 2) {
      console.log(`⚠️ No SMA data for ${symbol} ${interval}`);
      return signals;
    }
    
    const currentSMA20 = sma20[sma20.length - 1];
    const prevSMA20 = sma20[sma20.length - 2];
    const currentSMA50 = sma50[sma50.length - 1];
    const prevSMA50 = sma50[sma50.length - 2];
    
    // Golden Cross (SMA20 crosses above SMA50)
    if (prevSMA20 <= prevSMA50 && currentSMA20 > currentSMA50) {
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'golden_cross',
        description: `Golden Cross (SMA20 > SMA50)`,
        strength: 80,
        price: currentPrice,
        sma20: currentSMA20,
        sma50: currentSMA50,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // Death Cross (SMA20 crosses below SMA50)
    if (prevSMA20 >= prevSMA50 && currentSMA20 < currentSMA50) {
      signals.push({
        symbol,
        interval,
        type: 'bearish',
        signalType: 'death_cross',
        description: `Death Cross (SMA20 < SMA50)`,
        strength: 80,
        price: currentPrice,
        sma20: currentSMA20,
        sma50: currentSMA50,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    return signals;
  }

  // Funding Rate Signals (optional)
  static async detectFundingSignals(symbol, interval) {
    const signals = [];
    
    try {
      // Try to get funding rate data
      const FundingRate = require('../models/FundingRate');
      
      const recentFunding = await FundingRate.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();
        
      if (recentFunding.length === 0) return signals;
      
      const currentFunding = recentFunding[0].rate;
      
      // Extremely high funding (shorts paying longs)
      if (currentFunding > 0.01) {
        signals.push({
          symbol,
          interval,
          type: 'bullish',
          signalType: 'extreme_funding_bullish',
          description: `Extremely high funding rate (${(currentFunding * 100).toFixed(3)}%)`,
          strength: Math.min(95, currentFunding * 5000),
          fundingRate: currentFunding,
          detectedAt: new Date(),
          timeframe: interval
        });
      }
      
      // Extremely negative funding (longs paying shorts)
      if (currentFunding < -0.01) {
        signals.push({
          symbol,
          interval,
          type: 'bearish', 
          signalType: 'extreme_funding_bearish',
          description: `Extremely negative funding rate (${(currentFunding * 100).toFixed(3)}%)`,
          strength: Math.min(95, Math.abs(currentFunding) * 5000),
          fundingRate: currentFunding,
          detectedAt: new Date(),
          timeframe: interval
        });
      }
      
    } catch (err) {
      // Skip funding signals if model doesn't exist
      console.log(`⚠️ No funding rate model or data for ${symbol}`);
    }
    
    return signals;
  }

  // Generate signals for all symbols
  static async generateAllSignals(symbols = ['ETH', 'BTC', 'SOL'], intervals = ['5m', '15m', '30m', '1h']) {
    const allSignals = [];
    
    console.log(`🎯 Generating signals for ${symbols.length} symbols, ${intervals.length} intervals...`);
    
    for (const symbol of symbols) {
      for (const interval of intervals) {
        try {
          const signals = await this.generateSignals(symbol, interval);
          allSignals.push(...signals);
        } catch (err) {
          console.error(`❌ Error generating signals for ${symbol} ${interval}:`, err.message);
        }
      }
    }
    
    const result = {
      bullish: allSignals.filter(s => s.type === 'bullish').sort((a, b) => b.strength - a.strength),
      bearish: allSignals.filter(s => s.type === 'bearish').sort((a, b) => b.strength - a.strength),
      total: allSignals.length,
      timestamp: new Date()
    };
    
    console.log(`🎯 Generated ${result.total} total signals (${result.bullish.length} bullish, ${result.bearish.length} bearish)`);
    return result;
  }
}

module.exports = SignalEngine;