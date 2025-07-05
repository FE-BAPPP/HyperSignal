"use client"

import { useState, useEffect } from "react"
import axios from "axios"

function TechnicalIndicators({ symbol, interval = "1h" }) {
  const [indicators, setIndicators] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchIndicators = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`http://localhost:4000/api/indicators/${symbol}?interval=${interval}`)
      setIndicators(res.data)
      console.log("📊 Indicators loaded:", res.data)
    } catch (err) {
      console.error("❌ Error fetching indicators:", err)
      setIndicators(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (symbol && interval) {
      fetchIndicators()
    }
  }, [symbol, interval])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f0b90b]"></div>
          <span className="text-[#848e9c]">Loading technical indicators...</span>
        </div>
      </div>
    )
  }

  if (!indicators) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-white mb-2">No Indicator Data</h3>
          <p className="text-[#848e9c]">
            No indicator data available for {symbol} {interval}
          </p>
        </div>
      </div>
    )
  }

  const getRSIColor = (rsi) => {
    if (rsi > 70) return "text-[#f84960] bg-[#f84960]/10"
    if (rsi < 30) return "text-[#02c076] bg-[#02c076]/10"
    return "text-[#848e9c] bg-[#2b3139]"
  }

  const currentRSI = indicators.rsi?.length > 0 ? indicators.rsi[indicators.rsi.length - 1] : null
  const currentPrice = typeof indicators.currentPrice === "number" ? indicators.currentPrice : null
  const sma20 = indicators.sma20?.length > 0 ? indicators.sma20[indicators.sma20.length - 1] : null
  const sma50 = indicators.sma50?.length > 0 ? indicators.sma50[indicators.sma50.length - 1] : null
  const bbUpper =
    indicators.bollingerBands?.upper?.length > 0
      ? indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1]
      : null
  const bbLower =
    indicators.bollingerBands?.lower?.length > 0
      ? indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1]
      : null

  // VWAP handling
  let vwap = null
  if (typeof indicators.vwap === "number") {
    vwap = indicators.vwap
  } else if (indicators.vwap?.length > 0) {
    vwap = indicators.vwap[indicators.vwap.length - 1]
  }

  const macdHistogram = indicators.macd?.histogram
  const hasMacdHistogram = macdHistogram && macdHistogram.length > 0
  const lastMacdHistogram = hasMacdHistogram ? macdHistogram[macdHistogram.length - 1] : null

  const supports = indicators.supportResistance?.supports || []
  const resistances = indicators.supportResistance?.resistances || []
  const lastSupports = supports.slice(-3)
  const lastResistances = resistances.slice(-3)

  const priceChange = typeof indicators.priceChange24h === "number" ? indicators.priceChange24h : null

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-6 text-white">
          📊 Technical Indicators - {symbol} {interval.toUpperCase()}
        </h3>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* RSI */}
          <div className="trading-panel p-4">
            <div className="text-sm text-[#848e9c] mb-2">RSI (14)</div>
            <div className={`text-xl font-bold px-3 py-2 rounded ${getRSIColor(currentRSI)}`}>
              {currentRSI !== null ? currentRSI.toFixed(1) : "N/A"}
            </div>
            <div className="text-xs text-[#848e9c] mt-2">
              {currentRSI !== null
                ? currentRSI > 70
                  ? "Overbought"
                  : currentRSI < 30
                    ? "Oversold"
                    : "Neutral"
                : "No data"}
            </div>
          </div>

          {/* Price vs SMA */}
          <div className="trading-panel p-4">
            <div className="text-sm text-[#848e9c] mb-2">Price vs SMA20</div>
            <div
              className={`text-xl font-bold ${
                currentPrice !== null && sma20 !== null
                  ? currentPrice > sma20
                    ? "text-[#02c076]"
                    : "text-[#f84960]"
                  : "text-[#848e9c]"
              }`}
            >
              {currentPrice !== null && sma20 !== null ? (currentPrice > sma20 ? "📈 Above" : "📉 Below") : "N/A"}
            </div>
            <div className="text-xs text-[#848e9c] mt-2">
              ${currentPrice !== null ? currentPrice.toFixed(2) : "N/A"} vs ${sma20 !== null ? sma20.toFixed(2) : "N/A"}
            </div>
          </div>

          {/* MACD */}
          <div className="trading-panel p-4">
            <div className="text-sm text-[#848e9c] mb-2">MACD Signal</div>
            {hasMacdHistogram ? (
              <>
                <div className={`text-xl font-bold ${lastMacdHistogram > 0 ? "text-[#02c076]" : "text-[#f84960]"}`}>
                  {lastMacdHistogram > 0 ? "📈 Bullish" : "📉 Bearish"}
                </div>
                <div className="text-xs text-[#848e9c] mt-2">
                  Histogram: {lastMacdHistogram !== null ? lastMacdHistogram.toFixed(4) : "N/A"}
                </div>
              </>
            ) : (
              <div className="text-[#848e9c] text-sm">No MACD data</div>
            )}
          </div>

          {/* Bollinger Position */}
          <div className="trading-panel p-4">
            <div className="text-sm text-[#848e9c] mb-2">Bollinger Position</div>
            <div className="text-xl font-bold">
              {currentPrice !== null && bbUpper !== null && bbLower !== null
                ? currentPrice > bbUpper
                  ? "🔴 Above Upper"
                  : currentPrice < bbLower
                    ? "🟢 Below Lower"
                    : "🟡 Middle"
                : "N/A"}
            </div>
            <div className="text-xs text-[#848e9c] mt-2">
              Range: ${bbLower !== null ? bbLower.toFixed(2) : "N/A"} - ${bbUpper !== null ? bbUpper.toFixed(2) : "N/A"}
            </div>
          </div>
        </div>

        {/* Detailed Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Moving Averages */}
          <div className="trading-panel p-4">
            <h4 className="font-semibold mb-4 text-white">📈 Moving Averages</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#848e9c]">SMA 20:</span>
                <span className="font-medium text-white">{sma20 !== null ? `$${sma20.toFixed(2)}` : "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#848e9c]">SMA 50:</span>
                <span className="font-medium text-white">{sma50 !== null ? `$${sma50.toFixed(2)}` : "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#848e9c]">VWAP:</span>
                <span className="font-medium text-white">{vwap !== null ? `$${vwap.toFixed(2)}` : "N/A"}</span>
              </div>
              <div className="mt-4 p-3 bg-[#2b3139]/50 rounded">
                <div className="text-sm">
                  <strong className="text-white">Trend:</strong>
                  <span
                    className={`ml-2 ${
                      sma20 !== null && sma50 !== null
                        ? sma20 > sma50
                          ? "text-[#02c076]"
                          : "text-[#f84960]"
                        : "text-[#848e9c]"
                    }`}
                  >
                    {sma20 !== null && sma50 !== null
                      ? sma20 > sma50
                        ? "📈 Bullish (SMA20 > SMA50)"
                        : "📉 Bearish (SMA20 < SMA50)"
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Support & Resistance */}
          <div className="trading-panel p-4">
            <h4 className="font-semibold mb-4 text-white">🎯 Support & Resistance</h4>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-[#848e9c] mb-2">Key Supports:</div>
                {lastSupports.length > 0 ? (
                  <div className="space-y-1">
                    {lastSupports.map((support, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-white">${support.price.toFixed(2)}</span>
                        <span className="text-[#02c076]">Strength: {support.strength}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#848e9c] text-sm">No support data</div>
                )}
              </div>

              <div>
                <div className="text-sm text-[#848e9c] mb-2">Key Resistances:</div>
                {lastResistances.length > 0 ? (
                  <div className="space-y-1">
                    {lastResistances.map((resistance, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-white">${resistance.price.toFixed(2)}</span>
                        <span className="text-[#f84960]">Strength: {resistance.strength}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#848e9c] text-sm">No resistance data</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price Change Info */}
        <div className="mt-6 trading-panel p-4">
          <div className="flex justify-between items-center">
            <span className="text-[#848e9c]">24h Change:</span>
            <span
              className={`font-medium text-lg ${
                priceChange !== null && priceChange >= 0 ? "text-[#02c076]" : "text-[#f84960]"
              }`}
            >
              {priceChange !== null && priceChange >= 0 ? "+" : ""}
              {priceChange !== null ? priceChange.toFixed(2) : "N/A"}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TechnicalIndicators
