// server/services/SignalEngine.js
const TechnicalIndicators = require('./TechnicalIndicators');
const Candle = require('../models/Candle');
const FundingRate = require('../models/FundingRate');

class SignalEngine {
  static async generateSignals(symbol, interval = '1h') {
    try {
      console.log(`🔍 Generating signals for ${symbol} ${interval}...`);
      
      const indicators = await TechnicalIndicators.calculateAllIndicators(symbol, interval, 100);
      if (!indicators) return [];
      
      const signals = [];
      
      // RSI Signals
      signals.push(...this.detectRSISignals(symbol, interval, indicators));
      
      // MACD Signals  
      signals.push(...this.detectMACDSignals(symbol, interval, indicators));
      
      // Bollinger Bands Signals
      signals.push(...this.detectBollingerSignals(symbol, interval, indicators));
      
      // Support/Resistance Signals
      signals.push(...this.detectSRSignals(symbol, interval, indicators));
      
      // Moving Average Signals
      signals.push(...this.detectMASignals(symbol, interval, indicators));
      
      // Funding Rate Signals
      const fundingSignals = await this.detectFundingSignals(symbol, interval);
      signals.push(...fundingSignals);
      
      // Volume Signals
      signals.push(...this.detectVolumeSignals(symbol, interval, indicators));
      
      console.log(`✅ Generated ${signals.length} signals for ${symbol} ${interval}`);
      return signals.sort((a, b) => b.strength - a.strength);
      
    } catch (err) {
      console.error(`❌ Error generating signals for ${symbol}:`, err.message);
      return [];
    }
  }

  // RSI Oversold/Overbought Signals
  static detectRSISignals(symbol, interval, indicators) {
    const signals = [];
    const rsi = indicators.rsi;
    if (rsi.length === 0) return signals;
    
    const currentRSI = rsi[rsi.length - 1];
    const prevRSI = rsi[rsi.length - 2];
    
    // RSI Oversold (< 30) turning up
    if (currentRSI < 35 && prevRSI < currentRSI && currentRSI > 25) {
      signals.push({
        symbol,
        interval,
        type: 'bullish',
        signalType: 'rsi_oversold_reversal',
        description: `RSI oversold reversal (${currentRSI.toFixed(1)})`,
        strength: Math.min(95, 100 - currentRSI * 2), // Stronger signal when more oversold
        price: indicators.currentPrice,
        rsi: currentRSI,
        detectedAt: new Date(),
        timeframe: interval
      });
    }
    
    // RSI Overbought (> 70) turning down
    if (currentRSI > 65 && prevRSI > currentRSI && currentRSI < 75) {
      signals.push({
        symbol,
        interval,
        type: 'bearish',
        signalType: 'rsi_overbought_reversal',
        description: `RSI overbought reversal (${currentRSI.toFixed(1)})`,
        strength: Math.min(95, (currentRSI - 50) * 2),
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
    const { macd, signal, histogram } = indicators.macd;
    
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
    const { upper, middle, lower } = indicators.bollingerBands;
    const currentPrice = indicators.currentPrice;
    
    if (upper.length === 0) return signals;
    
    const currentUpper = upper[upper.length - 1];
    const currentMiddle = middle[middle.length - 1];
    const currentLower = lower[lower.length - 1];
    
    // Price touching lower band (oversold)
    if (currentPrice <= currentLower * 1.005) { // 0.5% tolerance
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
    if (currentPrice >= currentUpper * 0.995) { // 0.5% tolerance
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

  // Support/Resistance Signals
  static detectSRSignals(symbol, interval, indicators) {
    const signals = [];
    const { supports, resistances } = indicators.supportResistance;
    const currentPrice = indicators.currentPrice;
    
    // Check proximity to strong support levels
    for (const support of supports.filter(s => s.strength >= 3)) {
      const distance = Math.abs(currentPrice - support.price) / support.price;
      if (distance < 0.01) { // Within 1%
        signals.push({
          symbol,
          interval,
          type: 'bullish',
          signalType: 'support_bounce',
          description: `Price near strong support level`,
          strength: Math.min(85, support.strength * 15),
          price: currentPrice,
          supportLevel: support.price,
          detectedAt: new Date(),
          timeframe: interval
        });
      }
    }
    
    // Check proximity to strong resistance levels
    for (const resistance of resistances.filter(r => r.strength >= 3)) {
      const distance = Math.abs(currentPrice - resistance.price) / resistance.price;
      if (distance < 0.01) { // Within 1%
        signals.push({
          symbol,
          interval,
          type: 'bearish',
          signalType: 'resistance_rejection',
          description: `Price near strong resistance level`,
          strength: Math.min(85, resistance.strength * 15),
          price: currentPrice,
          resistanceLevel: resistance.price,
          detectedAt: new Date(),
          timeframe: interval
        });
      }
    }
    
    return signals;
  }

  // Moving Average Signals
  static detectMASignals(symbol, interval, indicators) {
    const signals = [];
    const { sma20, sma50, ema12, ema26 } = indicators;
    const currentPrice = indicators.currentPrice;
    
    if (sma20.length < 2 || sma50.length < 2) return signals;
    
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

  // Funding Rate Signals
  static async detectFundingSignals(symbol, interval) {
    const signals = [];
    
    try {
      const recentFunding = await FundingRate.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
        
      if (recentFunding.length === 0) return signals;
      
      const currentFunding = recentFunding[0].rate;
      const avgFunding = recentFunding.reduce((sum, f) => sum + f.rate, 0) / recentFunding.length;
      
      // Extremely high funding (shorts paying longs)
      if (currentFunding > 0.01) { // > 1%
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
      if (currentFunding < -0.01) { // < -1%
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
      console.error(`❌ Error detecting funding signals:`, err.message);
    }
    
    return signals;
  }

  // Volume Signals
  static detectVolumeSignals(symbol, interval, indicators) {
    const signals = [];
    // Volume analysis sẽ được implement sau khi có volume data tốt hơn
    return signals;
  }

  // Generate signals for all symbols
  static async generateAllSignals(symbols = ['ETH', 'BTC', 'SOL'], intervals = ['1h', '4h']) {
    const allSignals = [];
    
    for (const symbol of symbols) {
      for (const interval of intervals) {
        const signals = await this.generateSignals(symbol, interval);
        allSignals.push(...signals);
      }
    }
    
    // Sort by strength và group by type
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