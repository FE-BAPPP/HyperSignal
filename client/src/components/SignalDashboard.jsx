"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Target, TrendingUp, TrendingDown, Activity, Zap, BarChart3, DollarSign, Flame, Clock } from "lucide-react"

function SignalDashboard() {
  const [allSignals, setAllSignals] = useState({ bullish: [], bearish: [], total: 0 })
  const [topSignals, setTopSignals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filters, setFilters] = useState({
    symbols: "ETH,BTC,SOL",
    intervals: "1m,5m,15m,30m,1h",
    minStrength: 30,
    mode: "all",
  })

  const fetchSignals = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔄 Fetching signals with filters:", filters)

      const endpoint = filters.mode === "quick" ? "quick" : "all"
      const params =
        filters.mode === "quick"
          ? `symbols=${filters.symbols}`
          : `symbols=${filters.symbols}&intervals=${filters.intervals}`

      const [allRes, topRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/signals/${endpoint}?${params}`),
        axios.get(`http://localhost:4000/api/signals/top?limit=10`),
      ])

      const allSignalsData = {
        bullish: Array.isArray(allRes.data.bullish) ? allRes.data.bullish : [],
        bearish: Array.isArray(allRes.data.bearish) ? allRes.data.bearish : [],
        total: allRes.data.total || 0,
        timestamp: allRes.data.timestamp,
        intervals: allRes.data.intervals || [],
        isQuick: allRes.data.isQuick || false,
      }

      const topSignalsData = Array.isArray(topRes.data.topSignals) ? topRes.data.topSignals : []

      setAllSignals(allSignalsData)
      setTopSignals(topSignalsData)
      setLastUpdate(new Date())
    } catch (err) {
      console.error("❌ Error fetching signals:", err)
      setError(err.response?.data?.error || err.message || "Failed to fetch signals")
      setAllSignals({ bullish: [], bearish: [], total: 0 })
      setTopSignals([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchSignals()

    if (autoRefresh) {
      const refreshInterval = filters.mode === "quick" ? 15000 : 30000
      const interval = setInterval(fetchSignals, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [filters.symbols, filters.intervals, filters.mode, autoRefresh])

  const filteredBullishSignals = allSignals.bullish.filter((s) => s.strength >= filters.minStrength)
  const filteredBearishSignals = allSignals.bearish.filter((s) => s.strength >= filters.minStrength)

  return (
    <div className="h-full bg-[#0d1421] text-white overflow-auto">
      {/* Header */}
      <div className="bg-[#1e2329] border-b border-[#2b3139] p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Target className="w-6 h-6 text-[#f0b90b]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#02c076] rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-xl font-bold text-white">Trading Signals</h2>
            </div>
            {allSignals.isQuick && (
              <div className="flex items-center gap-2 bg-[#02c076] text-white px-3 py-1 rounded-full text-xs font-medium">
                <Zap className="w-3 h-3" />
                Quick Mode
              </div>
            )}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-xs text-[#848e9c]">
                <Clock className="w-3 h-3" />
                {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#848e9c]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-[#2b3139] border-[#3c434d]"
              />
              Auto Refresh
            </label>

            <button onClick={fetchSignals} disabled={loading} className="trading-button-primary">
              {loading ? "⏳" : "🔄"} Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-4 p-4 bg-[#f84960]/10 border border-[#f84960]/20 rounded">
          <div className="flex items-center gap-2">
            <span className="text-[#f84960] font-semibold">❌ Error:</span>
            <span className="text-[#f84960]">{error}</span>
          </div>
          <div className="mt-2 text-sm text-[#848e9c]">
            💡 Try: Check if server is running, click Aggregate button, or refresh the page
          </div>
        </div>
      )}

      {/* Signal Filters */}
      <div className="p-4">
        <SignalFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Signal Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="trading-panel p-4 hover:bg-[#2b3139]/30 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#02c076] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Bullish Signals
                </p>
                <p className="text-2xl font-bold text-[#02c076] group-hover:scale-110 transition-transform duration-200">
                  {filteredBullishSignals.length}
                </p>
                {allSignals.bullish.length !== filteredBullishSignals.length && (
                  <p className="text-xs text-[#848e9c]">({allSignals.bullish.length} total)</p>
                )}
              </div>
              <div className="text-3xl group-hover:rotate-12 transition-transform duration-200">
                <TrendingUp className="w-8 h-8 text-[#02c076]" />
              </div>
            </div>
          </div>

          <div className="trading-panel p-4 hover:bg-[#2b3139]/30 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#f84960] flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Bearish Signals
                </p>
                <p className="text-2xl font-bold text-[#f84960] group-hover:scale-110 transition-transform duration-200">
                  {filteredBearishSignals.length}
                </p>
                {allSignals.bearish.length !== filteredBearishSignals.length && (
                  <p className="text-xs text-[#848e9c]">({allSignals.bearish.length} total)</p>
                )}
              </div>
              <div className="text-3xl group-hover:rotate-12 transition-transform duration-200">
                <TrendingDown className="w-8 h-8 text-[#f84960]" />
              </div>
            </div>
          </div>

          <div className="trading-panel p-4 hover:bg-[#2b3139]/30 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#f0b90b] flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Total Signals
                </p>
                <p className="text-2xl font-bold text-[#f0b90b] group-hover:scale-110 transition-transform duration-200">
                  {allSignals.total}
                </p>
                <p className="text-xs text-[#848e9c]">Timeframes: {allSignals.intervals?.join(", ") || "N/A"}</p>
              </div>
              <div className="text-3xl group-hover:rotate-12 transition-transform duration-200">
                <Target className="w-8 h-8 text-[#f0b90b]" />
              </div>
            </div>
          </div>

          <div className="trading-panel p-4 hover:bg-[#2b3139]/30 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#f0b90b] flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  High Strength
                </p>
                <p className="text-2xl font-bold text-[#f0b90b] group-hover:scale-110 transition-transform duration-200">
                  {[...filteredBullishSignals, ...filteredBearishSignals].filter((s) => s.strength >= 70).length}
                </p>
                <p className="text-xs text-[#848e9c]">≥ 70% strength</p>
              </div>
              <div className="text-3xl group-hover:rotate-12 transition-transform duration-200">
                <Flame className="w-8 h-8 text-[#f0b90b]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No Signals Message */}
      {!loading && !error && allSignals.total === 0 && (
        <div className="mx-4 mb-4 p-6 trading-panel text-center">
          <div className="text-4xl mb-2">⚡</div>
          <h3 className="text-lg font-semibold text-[#f0b90b] mb-2">No Trading Signals Found</h3>
          <div className="text-[#848e9c] space-y-1">
            <p>📊 Try switching to "Quick Mode" for faster signals</p>
            <p>🔄 Click "Aggregate" button to generate multi-timeframe data</p>
            <p>⏰ Fast timeframes (1m, 5m) update more frequently</p>
          </div>
        </div>
      )}

      {/* Signal Lists */}
      {(filteredBullishSignals.length > 0 || filteredBearishSignals.length > 0) && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bullish Signals */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#02c076]">
                📈 Bullish Signals ({filteredBullishSignals.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBullishSignals.length > 0 ? (
                  filteredBullishSignals
                    .slice(0, 10)
                    .map((signal, index) => <SignalCard key={`bullish-${index}`} signal={signal} rank={index + 1} />)
                ) : (
                  <div className="trading-panel p-4 text-center">
                    <p className="text-[#848e9c]">No bullish signals above {filters.minStrength}% strength</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bearish Signals */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#f84960]">
                📉 Bearish Signals ({filteredBearishSignals.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBearishSignals.length > 0 ? (
                  filteredBearishSignals
                    .slice(0, 10)
                    .map((signal, index) => <SignalCard key={`bearish-${index}`} signal={signal} rank={index + 1} />)
                ) : (
                  <div className="trading-panel p-4 text-center">
                    <p className="text-[#848e9c]">No bearish signals above {filters.minStrength}% strength</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="trading-panel p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f0b90b]"></div>
            <span className="font-medium text-white">
              {filters.mode === "quick" ? "Loading quick signals..." : "Loading signals..."}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function SignalFilters({ filters, onChange }) {
  return (
    <div className="trading-panel p-4">
      <h3 className="font-semibold mb-3 text-[#848e9c]">⚡ Signal Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[#848e9c]">Mode</label>
          <select
            value={filters.mode}
            onChange={(e) => onChange({ ...filters, mode: e.target.value })}
            className="trading-input w-full"
          >
            <option value="quick">⚡ Quick (5m, 15m)</option>
            <option value="all">🎯 All timeframes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[#848e9c]">Symbols</label>
          <input
            type="text"
            value={filters.symbols}
            onChange={(e) => onChange({ ...filters, symbols: e.target.value })}
            className="trading-input w-full"
            placeholder="ETH,BTC,SOL"
          />
        </div>

        {filters.mode === "all" && (
          <div>
            <label className="block text-sm font-medium mb-1 text-[#848e9c]">Timeframes</label>
            <input
              type="text"
              value={filters.intervals}
              onChange={(e) => onChange({ ...filters, intervals: e.target.value })}
              className="trading-input w-full"
              placeholder="1m,5m,15m,30m,1h"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-[#848e9c]">Min Strength ({filters.minStrength}%)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minStrength}
            onChange={(e) => onChange({ ...filters, minStrength: Number.parseInt(e.target.value) })}
            className="w-full accent-[#f0b90b]"
          />
        </div>
      </div>
    </div>
  )
}

function SignalCard({ signal, rank }) {
  const getSignalIcon = (signal) => {
    switch (signal.signalType) {
      case "rsi_oversold_reversal":
      case "rsi_overbought_reversal":
      case "rsi_oversold":
      case "rsi_overbought":
        return <Activity className="w-4 h-4" />
      case "macd_bullish_crossover":
      case "macd_bearish_crossover":
        return <BarChart3 className="w-4 h-4" />
      case "bb_oversold":
      case "bb_overbought":
        return <Target className="w-4 h-4" />
      case "golden_cross":
      case "death_cross":
        return <Zap className="w-4 h-4" />
      case "extreme_funding_bullish":
      case "extreme_funding_bearish":
        return <DollarSign className="w-4 h-4" />
      default:
        return signal.type === "bullish" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    }
  }

  const getBorderColor = () => {
    if (signal.strength >= 80) return "border-[#f0b90b]"
    if (signal.type === "bullish") return "border-[#02c076]"
    return "border-[#f84960]"
  }

  const getStrengthColor = () => {
    if (signal.strength >= 80) return "text-[#f0b90b]"
    if (signal.type === "bullish") return "text-[#02c076]"
    return "text-[#f84960]"
  }

  const getTimeframeColor = () => {
    if (signal.timeframe === "1m") return "bg-[#f84960]"
    if (signal.timeframe === "5m") return "bg-[#02c076]"
    if (signal.timeframe === "15m") return "bg-[#f0b90b]"
    if (signal.timeframe === "30m") return "bg-purple-600"
    if (signal.timeframe === "1h") return "bg-blue-600"
    return "bg-[#848e9c]"
  }

  return (
    <div
      className={`trading-panel border ${getBorderColor()} relative hover:bg-[#2b3139]/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
    >
      {rank && (
        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-[#f0b90b] to-[#ffd700] text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
          {rank}
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-all duration-200 group-hover:scale-110 ${
                signal.type === "bullish" ? "bg-[#02c076]/10" : "bg-[#f84960]/10"
              }`}
            >
              {getSignalIcon(signal)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-white text-lg">{signal.symbol}</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getTimeframeColor()} shadow-sm`}
                >
                  {signal.timeframe?.toUpperCase() || signal.interval?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-[#848e9c]">{signal.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-xl font-bold ${getStrengthColor()} group-hover:scale-110 transition-transform duration-200`}
            >
              {Math.round(signal.strength)}%
            </div>
            <div className="text-xs text-[#848e9c] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(signal.detectedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-[#848e9c]">
            <DollarSign className="w-3 h-3" />
            <span>${typeof signal.price === "number" ? signal.price.toFixed(2) : "N/A"}</span>
          </div>
          <span className="bg-gradient-to-r from-[#2b3139] to-[#3c434d] px-3 py-1 rounded-full text-[#848e9c] text-xs font-medium">
            {signal.signalType?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
          </span>
        </div>

        {/* Additional signal data with icons */}
        <div className="mt-3 flex gap-4 text-xs text-[#848e9c]">
          {signal.rsi && (
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>RSI: {signal.rsi.toFixed(1)}</span>
            </div>
          )}
          {signal.fundingRate && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>Funding: {(signal.fundingRate * 100).toFixed(3)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignalDashboard
