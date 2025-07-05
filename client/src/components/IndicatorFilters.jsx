"use client"

import { useState, useEffect } from "react"
import axios from "axios"

function IndicatorFilters({ symbol, interval, onIndicatorSelect }) {
  const [indicators, setIndicators] = useState({})
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(["RSI", "MACD", "BB"]))
  const [loading, setLoading] = useState(false)

  // Available indicators list
  const availableIndicators = [
    { id: "RSI", name: "RSI", description: "Relative Strength Index", category: "oscillator" },
    { id: "MACD", name: "MACD", description: "Moving Average Convergence Divergence", category: "trend" },
    { id: "BB", name: "Bollinger Bands", description: "Bollinger Bands", category: "volatility" },
    { id: "SMA20", name: "SMA 20", description: "Simple Moving Average 20", category: "trend" },
    { id: "SMA50", name: "SMA 50", description: "Simple Moving Average 50", category: "trend" },
    { id: "EMA12", name: "EMA 12", description: "Exponential Moving Average 12", category: "trend" },
    { id: "EMA26", name: "EMA 26", description: "Exponential Moving Average 26", category: "trend" },
    { id: "VWAP", name: "VWAP", description: "Volume Weighted Average Price", category: "volume" },
    { id: "SUPPORT", name: "Support/Resistance", description: "Key levels", category: "levels" },
  ]

  const categories = {
    trend: { name: "Trend", icon: "📈", color: "#02c076" },
    oscillator: { name: "Oscillators", icon: "〰️", color: "#f0b90b" },
    volatility: { name: "Volatility", icon: "📊", color: "#f84960" },
    volume: { name: "Volume", icon: "📦", color: "#02c076" },
    levels: { name: "Levels", icon: "🎯", color: "#f84960" },
  }

  const fetchIndicators = async () => {
    if (!symbol || !interval) return

    setLoading(true)
    try {
      const res = await axios.get(`http://localhost:4000/api/indicators/${symbol}?interval=${interval}`)
      setIndicators(res.data)
      onIndicatorSelect?.(res.data, selectedIndicators)
    } catch (err) {
      console.error("❌ Error fetching indicators:", err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchIndicators()
  }, [symbol, interval])

  const toggleIndicator = (indicatorId) => {
    const newSelected = new Set(selectedIndicators)
    if (newSelected.has(indicatorId)) {
      newSelected.delete(indicatorId)
    } else {
      newSelected.add(indicatorId)
    }
    setSelectedIndicators(newSelected)
    onIndicatorSelect?.(indicators, newSelected)
  }

  const renderIndicatorValue = (indicator) => {
    if (!indicators) return "N/A"

    switch (indicator.id) {
      case "RSI":
        const rsi = indicators.rsi?.[indicators.rsi?.length - 1]
        if (!rsi) return "N/A"
        const rsiColor = rsi > 70 ? "text-[#f84960]" : rsi < 30 ? "text-[#02c076]" : "text-[#848e9c]"
        return <span className={rsiColor}>{rsi.toFixed(1)}</span>

      case "MACD":
        const macd = indicators.macd?.histogram?.[indicators.macd?.histogram?.length - 1]
        if (!macd) return "N/A"
        const macdColor = macd > 0 ? "text-[#02c076]" : "text-[#f84960]"
        return <span className={macdColor}>{macd > 0 ? "↗" : "↘"}</span>

      case "BB":
        const currentPrice = indicators.currentPrice
        const bbUpper = indicators.bollingerBands?.upper?.[indicators.bollingerBands?.upper?.length - 1]
        const bbLower = indicators.bollingerBands?.lower?.[indicators.bollingerBands?.lower?.length - 1]
        if (!currentPrice || !bbUpper || !bbLower) return "N/A"

        let bbPosition = "Middle"
        let bbColor = "text-[#848e9c]"
        if (currentPrice > bbUpper) {
          bbPosition = "Upper"
          bbColor = "text-[#f84960]"
        }
        if (currentPrice < bbLower) {
          bbPosition = "Lower"
          bbColor = "text-[#02c076]"
        }
        return <span className={bbColor}>{bbPosition}</span>

      case "SMA20":
        const sma20 = indicators.sma20?.[indicators.sma20?.length - 1]
        if (!sma20 || !indicators.currentPrice) return "N/A"
        const sma20Color = indicators.currentPrice > sma20 ? "text-[#02c076]" : "text-[#f84960]"
        return <span className={sma20Color}>{indicators.currentPrice > sma20 ? "↗" : "↘"}</span>

      case "SMA50":
        const sma50 = indicators.sma50?.[indicators.sma50?.length - 1]
        if (!sma50 || !indicators.currentPrice) return "N/A"
        const sma50Color = indicators.currentPrice > sma50 ? "text-[#02c076]" : "text-[#f84960]"
        return <span className={sma50Color}>{indicators.currentPrice > sma50 ? "↗" : "↘"}</span>

      default:
        return <span className="text-[#848e9c]">●</span>
    }
  }

  return (
    <div className="bg-[#1e2329] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2b3139]">
        <h3 className="font-semibold text-white text-sm">📊 INDICATORS</h3>
        <div className="flex items-center gap-2">
          {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#f0b90b]"></div>}
          <button onClick={fetchIndicators} className="text-[#f0b90b] hover:text-[#f0b90b]/80 text-xs">
            🔄
          </button>
        </div>
      </div>

      {/* Category Sections */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(categories).map(([categoryId, category]) => {
          const categoryIndicators = availableIndicators.filter((ind) => ind.category === categoryId)
          if (categoryIndicators.length === 0) return null

          return (
            <div key={categoryId} className="border-b border-[#2b3139]/50 last:border-b-0">
              {/* Category Header */}
              <div className="px-3 py-2 bg-[#2b3139]/30 text-xs font-medium text-[#848e9c] flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-xs text-[#848e9c]/70">({categoryIndicators.length})</span>
              </div>

              {/* Indicators List */}
              <div>
                {categoryIndicators.map((indicator) => (
                  <div
                    key={indicator.id}
                    className={`px-3 py-2 hover:bg-[#2b3139]/50 cursor-pointer transition-colors border-l-2 ${
                      selectedIndicators.has(indicator.id) ? "border-[#f0b90b] bg-[#2b3139]/30" : "border-transparent"
                    }`}
                    onClick={() => toggleIndicator(indicator.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded border transition-colors ${
                            selectedIndicators.has(indicator.id) ? "bg-[#f0b90b] border-[#f0b90b]" : "border-[#848e9c]"
                          }`}
                        ></div>
                        <div>
                          <div className="font-medium text-white text-xs">{indicator.name}</div>
                          <div className="text-xs text-[#848e9c]/70">{indicator.description}</div>
                        </div>
                      </div>

                      {/* Current Value */}
                      <div className="text-xs font-mono">{renderIndicatorValue(indicator)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Count */}
      <div className="px-3 py-2 bg-[#2b3139]/30 text-xs text-[#848e9c] border-t border-[#2b3139]">
        {selectedIndicators.size} of {availableIndicators.length} selected
      </div>
    </div>
  )
}

export default IndicatorFilters
