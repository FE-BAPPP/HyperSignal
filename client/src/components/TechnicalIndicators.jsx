import { useState, useEffect } from 'react';
import axios from 'axios';

function TechnicalIndicators({ symbol, interval = '1h' }) {
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/indicators/${symbol}?interval=${interval}`);
      setIndicators(res.data);
      console.log('📊 Indicators loaded:', res.data);
    } catch (err) {
      console.error('❌ Error fetching indicators:', err);
      setIndicators(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (symbol && interval) {
      fetchIndicators();
    }
  }, [symbol, interval]);

  if (loading) {
    return (
      <div className="mt-6 p-6 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Loading technical indicators...</span>
        </div>
      </div>
    );
  }

  if (!indicators) {
    return (
      <div className="mt-6 p-6 border rounded-lg bg-yellow-50">
        <h3 className="font-semibold text-yellow-700 mb-2">📊 Technical Indicators</h3>
        <p className="text-yellow-600">No indicator data available for {symbol} {interval}</p>
      </div>
    );
  }

  const getRSIColor = (rsi) => {
    if (rsi > 70) return 'text-red-600 bg-red-100';
    if (rsi < 30) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const currentRSI = indicators.rsi[indicators.rsi.length - 1];
  const currentPrice = indicators.currentPrice;
  const sma20 = indicators.sma20[indicators.sma20.length - 1];
  const sma50 = indicators.sma50[indicators.sma50.length - 1];
  const bbUpper = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1];
  const bbLower = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1];
  const vwap = indicators.vwap[indicators.vwap.length - 1];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">📊 Technical Indicators - {symbol} {interval.toUpperCase()}</h3>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* RSI */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">RSI (14)</div>
          <div className={`text-lg font-bold px-2 py-1 rounded ${getRSIColor(currentRSI)}`}>
            {currentRSI ? currentRSI.toFixed(1) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Neutral'}
          </div>
        </div>

        {/* Price vs SMA */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Price vs SMA20</div>
          <div className={`text-lg font-bold ${currentPrice > sma20 ? 'text-green-600' : 'text-red-600'}`}>
            {currentPrice > sma20 ? '📈 Above' : '📉 Below'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${currentPrice?.toFixed(2)} vs ${sma20?.toFixed(2)}
          </div>
        </div>

        {/* MACD */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">MACD Signal</div>
          {indicators.macd.histogram.length > 0 && (
            <>
              <div className={`text-lg font-bold ${
                indicators.macd.histogram[indicators.macd.histogram.length - 1] > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {indicators.macd.histogram[indicators.macd.histogram.length - 1] > 0 ? '📈 Bullish' : '📉 Bearish'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Histogram: {indicators.macd.histogram[indicators.macd.histogram.length - 1]?.toFixed(4)}
              </div>
            </>
          )}
        </div>

        {/* Bollinger Position */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Bollinger Position</div>
          <div className="text-lg font-bold">
            {currentPrice > bbUpper ? '🔴 Above Upper' : 
             currentPrice < bbLower ? '🟢 Below Lower' : 
             '🟡 Middle'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Range: ${bbLower?.toFixed(2)} - ${bbUpper?.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Detailed Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moving Averages */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3">📈 Moving Averages</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>SMA 20:</span>
              <span className="font-medium">${sma20?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SMA 50:</span>
              <span className="font-medium">${sma50?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VWAP:</span>
              <span className="font-medium">${vwap?.toFixed(2)}</span>
            </div>
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <div className="text-sm">
                <strong>Trend:</strong> {sma20 > sma50 ? '📈 Bullish (SMA20 > SMA50)' : '📉 Bearish (SMA20 < SMA50)'}
              </div>
            </div>
          </div>
        </div>

        {/* Support & Resistance */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3">🎯 Support & Resistance</h4>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Key Supports:</div>
              {indicators.supportResistance.supports.slice(-3).map((support, index) => (
                <div key={index} className="text-sm flex justify-between">
                  <span>${support.price.toFixed(2)}</span>
                  <span className="text-green-600">Strength: {support.strength}</span>
                </div>
              ))}
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Key Resistances:</div>
              {indicators.supportResistance.resistances.slice(-3).map((resistance, index) => (
                <div key={index} className="text-sm flex justify-between">
                  <span>${resistance.price.toFixed(2)}</span>
                  <span className="text-red-600">Strength: {resistance.strength}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Price Change Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span>24h Change:</span>
          <span className={`font-medium ${indicators.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {indicators.priceChange24h >= 0 ? '+' : ''}{indicators.priceChange24h?.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default TechnicalIndicators;