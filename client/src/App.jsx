"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { toast, Toaster } from "react-hot-toast"
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, XMarkIcon, Cog6ToothIcon } from "@heroicons/react/24/outline"
import {
  TrendingUp,
  TrendingDown,
  Bitcoin,
  Zap,
  Circle,
  BarChart3,
  RefreshCw,
  EyeIcon as EyeIconLucide,
  EyeOffIcon as EyeOffIconLucide,
  Menu,
  Sparkles,
} from "lucide-react"
import CandleChart from "./components/CandleChart"
import FundingChart from "./components/FundingChart"
import OIChart from "./components/OIChart"
import SignalDashboard from "./components/SignalDashboard"
import TechnicalIndicators from "./components/TechnicalIndicators"
import IndicatorFilters from "./components/IndicatorFilters"

function App() {
  const [symbol, setSymbol] = useState("ETH")
  const [timeframe, setTimeframe] = useState("1h")
  const [candles, setCandles] = useState([])
  const [trades, setTrades] = useState([])
  const [funding, setFunding] = useState([])
  const [oi, setOI] = useState([])
  const [status, setStatus] = useState({})
  const [lastUpdate, setLastUpdate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("chart")
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(["RSI", "MACD", "BB"]))
  const [indicatorData, setIndicatorData] = useState(null)
  const [showIndicatorOverlay, setShowIndicatorOverlay] = useState(false)

  // Market data for ticker
  const [marketData, setMarketData] = useState({
    price: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0,
    changePercent24h: 0,
  })

  const symbols = [
    {
      value: "ETH",
      label: "ETH-PERP",
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      color: "#3B82F6",
      price: 0,
      change: 0,
    },
    {
      value: "BTC",
      label: "BTC-PERP",
      icon: <Bitcoin className="w-4 h-4 text-orange-400" />,
      color: "#F97316",
      price: 0,
      change: 0,
    },
    {
      value: "SOL",
      label: "SOL-PERP",
      icon: <Circle className="w-4 h-4 text-purple-400" />,
      color: "#A855F7",
      price: 0,
      change: 0,
    },
  ]

  const timeframes = [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "30m", label: "30m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
  ]

  const fetchData = async () => {
    setLoading(true)

    try {
      const [candlesRes, tradesRes, fundingRes, oiRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/candles?symbol=${symbol}&interval=${timeframe}&limit=100`),
        axios.get(`http://localhost:4000/api/trades?symbol=${symbol}&limit=50`),
        axios.get(`http://localhost:4000/api/funding?symbol=${symbol}&limit=50`),
        axios.get(`http://localhost:4000/api/oi?symbol=${symbol}&limit=50`),
      ])

      setCandles(candlesRes.data)
      setTrades(tradesRes.data)
      setFunding(fundingRes.data)
      setOI(oiRes.data)
      setLastUpdate(new Date())

      // Calculate market data
      if (candlesRes.data.length > 0) {
        const currentCandle = candlesRes.data[candlesRes.data.length - 1]
        const prevCandle = candlesRes.data[candlesRes.data.length - 2]

        if (currentCandle && prevCandle) {
          const change = currentCandle.close - prevCandle.close
          const changePercent = (change / prevCandle.close) * 100

          setMarketData({
            price: currentCandle.close,
            high24h: Math.max(...candlesRes.data.slice(-24).map((c) => c.high)),
            low24h: Math.min(...candlesRes.data.slice(-24).map((c) => c.low)),
            volume24h: candlesRes.data.slice(-24).reduce((sum, c) => sum + (c.volume || 0), 0),
            change24h: change,
            changePercent24h: changePercent,
          })
        }
      }

      toast.success(`${symbol} data updated`, { duration: 2000 })
    } catch (err) {
      console.error(`❌ Error fetching data:`, err)
      toast.error(`Failed to load ${symbol} data`)
    }

    setLoading(false)
  }

  const fetchIndicators = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/indicators/${symbol}?interval=${timeframe}`)
      setIndicatorData(res.data)
    } catch (err) {
      console.error("❌ Error fetching indicators:", err)
      setIndicatorData(null)
    }
  }

  const triggerAggregation = async () => {
    setLoading(true)
    toast.loading("Aggregating data...", { id: "aggregation" })

    try {
      // Kiểm tra server health trước
      console.log('🏥 Checking server health...')
      const healthResponse = await axios.get(`http://localhost:4000/api/health`)
      console.log('✅ Server is healthy:', healthResponse.data)
      
      console.log(`🔄 Starting aggregation for ${symbol}...`)
      
      const response = await axios.post(`http://localhost:4000/api/aggregate`, { 
        symbols: [symbol] 
      }, {
        timeout: 60000, // Tăng timeout lên 60s
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Aggregation response:', response.data)
      
      if (response.data.success) {
        toast.success(response.data.message || `Aggregation completed for ${symbol}`, { id: "aggregation" })
        
        // Refresh data sau 3 giây
        setTimeout(async () => {
          try {
            console.log('🔄 Refreshing data...')
            await fetchData()
            await fetchIndicators()
            toast.success("Data refreshed successfully")
          } catch (refreshError) {
            console.error('❌ Refresh error:', refreshError)
            toast.error("Failed to refresh data")
          } finally {
            setLoading(false)
          }
        }, 3000)
      } else {
        throw new Error(response.data.error || 'Aggregation failed')
      }
      
    } catch (err) {
      console.error("❌ Aggregation error:", err)
      
      let errorMessage = "Unknown error"
      
      if (err.code === 'ECONNREFUSED') {
        errorMessage = "Cannot connect to server. Is it running on port 4000?"
      } else if (err.response?.status === 404) {
        errorMessage = "Aggregation endpoint not found"
      } else if (err.response?.status === 500) {
        errorMessage = err.response.data?.error || "Server error during aggregation"
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else {
        errorMessage = err.message
      }
      
      toast.error(`Aggregation failed: ${errorMessage}`, { id: "aggregation" })
      setLoading(false)
    }
  }

  const handleIndicatorSelect = (indicators, selected) => {
    setSelectedIndicators(selected)
    setIndicatorData(indicators)
  }

  useEffect(() => {
    fetchData()
    fetchIndicators()

    const intervalId = setInterval(() => {
      fetchData()
      fetchIndicators()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [symbol, timeframe])

  return (
    <div className="h-screen bg-[#0d1421] text-white flex flex-col overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e2329",
            color: "#fff",
            border: "1px solid #2b3139",
          },
        }}
      />

      {/* TradingView-style Header */}
      <div className="h-12 bg-[#1e2329] border-b border-[#2b3139] flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <BarChart3 className="w-6 h-6 text-[#f0b90b]" />
              <Sparkles className="w-3 h-3 text-[#f0b90b] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <span className="text-lg font-bold text-white">HyperSignal</span>
          </div>

          {/* Symbol & Price */}
          <div className="flex items-center gap-3 ml-6">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent text-white text-lg font-bold border-none outline-none cursor-pointer hover:bg-[#2b3139] px-2 py-1 rounded"
            >
              {symbols.map((sym) => (
                <option key={sym.value} value={sym.value} className="bg-[#1e2329]">
                  {sym.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">${marketData.price?.toFixed(2) || "0.00"}</span>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                  marketData.changePercent24h >= 0 ? "text-[#02c076] bg-[#02c076]/10" : "text-[#f84960] bg-[#f84960]/10"
                }`}
              >
                {marketData.changePercent24h >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3" />
                )}
                <span>
                  {marketData.changePercent24h >= 0 ? "+" : ""}
                  {marketData.changePercent24h?.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="flex items-center gap-6 ml-6 text-sm text-[#848e9c]">
            <div>
              <span className="text-[#848e9c]">24h High</span>
              <span className="ml-2 text-white">${marketData.high24h?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#848e9c]">24h Low</span>
              <span className="ml-2 text-white">${marketData.low24h?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#848e9c]">24h Volume</span>
              <span className="ml-2 text-white">{marketData.volume24h?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {lastUpdate && <span className="text-xs text-[#848e9c]">{lastUpdate.toLocaleTimeString()}</span>}
          
          {/* Manual Refresh Button */}
          <button
            onClick={async () => {
              setLoading(true)
              toast.loading("Refreshing data...", { id: "refresh" })
              try {
                await fetchData()
                await fetchIndicators()
                toast.success("Data refreshed successfully", { id: "refresh" })
              } catch (err) {
                console.error("Refresh error:", err)
                toast.error("Failed to refresh data", { id: "refresh" })
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="bg-[#02c076] hover:bg-[#02c076]/80 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          
          {/* Aggregate Button */}
          <button
            onClick={triggerAggregation}
            disabled={loading}
            className="bg-[#f0b90b] hover:bg-[#f0b90b]/80 text-black px-3 py-1 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggregate
          </button>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Watchlist & Indicators */}
        <AnimatePresence>
          {leftSidebarOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              className="bg-[#1e2329] border-r border-[#2b3139] flex flex-col overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="h-10 border-b border-[#2b3139] flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#848e9c]">WATCHLIST</span>
                  <button
                    onClick={() => setShowIndicatorOverlay(!showIndicatorOverlay)}
                    className={`p-1 rounded text-xs ${
                      showIndicatorOverlay ? "bg-[#f0b90b] text-black" : "text-[#848e9c] hover:text-white"
                    }`}
                    title="Toggle Indicators"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => setLeftSidebarOpen(false)} className="text-[#848e9c] hover:text-white">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Symbol List */}
              <div className="flex-1 overflow-y-auto">
                {!showIndicatorOverlay ? (
                  <>
                    {symbols.map((sym) => (
                      <div
                        key={sym.value}
                        onClick={() => setSymbol(sym.value)}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-[#2b3139] border-b border-[#2b3139]/50 transition-all duration-200 group ${
                          symbol === sym.value ? "bg-[#2b3139] border-l-2 border-[#f0b90b]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-all duration-200 group-hover:scale-110`}
                            style={{ backgroundColor: `${sym.color}20` }}
                          >
                            {sym.icon}
                          </div>
                          <div>
                            <div className="text-white font-medium">{sym.label}</div>
                            <div className="text-xs text-[#848e9c]">Perpetual</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${symbol === sym.value ? marketData.price?.toFixed(2) : "0.00"}
                          </div>
                          <div
                            className={`text-xs flex items-center gap-1 ${
                              symbol === sym.value && marketData.changePercent24h >= 0
                                ? "text-[#02c076]"
                                : "text-[#f84960]"
                            }`}
                          >
                            {symbol === sym.value && marketData.changePercent24h >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {symbol === sym.value
                              ? `${marketData.changePercent24h >= 0 ? "+" : ""}${marketData.changePercent24h?.toFixed(2)}%`
                              : "0.00%"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick Indicators Summary */}
                    {indicatorData && (
                      <div className="p-3 border-t border-[#2b3139]">
                        <div className="text-xs text-[#848e9c] mb-2">QUICK INDICATORS</div>
                        <div className="space-y-2">
                          {/* RSI */}
                          {indicatorData.rsi && indicatorData.rsi.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#848e9c]">RSI</span>
                              <span
                                className={`text-sm font-medium ${
                                  indicatorData.rsi[indicatorData.rsi.length - 1] > 70
                                    ? "text-[#f84960]"
                                    : indicatorData.rsi[indicatorData.rsi.length - 1] < 30
                                      ? "text-[#02c076]"
                                      : "text-white"
                                }`}
                              >
                                {indicatorData.rsi[indicatorData.rsi.length - 1].toFixed(1)}
                              </span>
                            </div>
                          )}

                          {/* MACD */}
                          {indicatorData.macd &&
                            indicatorData.macd.histogram &&
                            indicatorData.macd.histogram.length > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-[#848e9c]">MACD</span>
                                <span
                                  className={`text-sm font-medium ${
                                    indicatorData.macd.histogram[indicatorData.macd.histogram.length - 1] > 0
                                      ? "text-[#02c076]"
                                      : "text-[#f84960]"
                                  }`}
                                >
                                  {indicatorData.macd.histogram[indicatorData.macd.histogram.length - 1] > 0
                                    ? "↗"
                                    : "↘"}
                                </span>
                              </div>
                            )}

                          {/* Price vs SMA20 */}
                          {indicatorData.currentPrice && indicatorData.sma20 && indicatorData.sma20.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#848e9c]">vs SMA20</span>
                              <span
                                className={`text-sm font-medium ${
                                  indicatorData.currentPrice > indicatorData.sma20[indicatorData.sma20.length - 1]
                                    ? "text-[#02c076]"
                                    : "text-[#f84960]"
                                }`}
                              >
                                {indicatorData.currentPrice > indicatorData.sma20[indicatorData.sma20.length - 1]
                                  ? "Above"
                                  : "Below"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Indicator Filters */
                  <div className="h-full">
                    <IndicatorFilters symbol={symbol} interval={timeframe} onIndicatorSelect={handleIndicatorSelect} />
                  </div>
                )}
              </div>

              {/* Timeframe Selector */}
              <div className="p-3 border-t border-[#2b3139]">
                <div className="text-xs text-[#848e9c] mb-2">TIMEFRAME</div>
                <div className="grid grid-cols-4 gap-1">
                  {timeframes.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        timeframe === tf.value
                          ? "bg-[#f0b90b] text-black font-medium"
                          : "bg-[#2b3139] text-[#848e9c] hover:text-white hover:bg-[#3c434d]"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Toolbar */}
          <div className="h-10 bg-[#1e2329] border-b border-[#2b3139] flex items-center px-4 gap-4">
            {!leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="text-[#848e9c] hover:text-white p-2 rounded hover:bg-[#2b3139] transition-all duration-200"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              {["chart", "signals", "indicators"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-sm rounded transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-[#f0b90b] text-black font-medium"
                      : "text-[#848e9c] hover:text-white hover:bg-[#2b3139]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Chart Controls */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowIndicatorOverlay(!showIndicatorOverlay)}
                className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-all duration-200 ${
                  showIndicatorOverlay
                    ? "bg-[#f0b90b] text-black shadow-lg"
                    : "text-[#848e9c] hover:text-white hover:bg-[#2b3139]"
                }`}
              >
                {showIndicatorOverlay ? (
                  <EyeOffIconLucide className="w-4 h-4" />
                ) : (
                  <EyeIconLucide className="w-4 h-4" />
                )}
                Indicators
              </button>

              <div className="text-xs text-[#848e9c]">Selected: {selectedIndicators.size}</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="text-[#848e9c] hover:text-white px-2 py-1 rounded hover:bg-[#2b3139]"
              >
                Panels
              </button>
            </div>
          </div>

          {/* Chart Content */}
          <div className="flex-1 bg-[#0d1421] overflow-hidden relative">
            {activeTab === "chart" && (
              <div className="h-full p-4">
                <CandleChart
                  data={candles}
                  symbol={symbol}
                  interval={timeframe}
                  indicators={indicatorData}
                  selectedIndicators={selectedIndicators}
                />
              </div>
            )}

            {activeTab === "signals" && (
              <div className="h-full overflow-auto">
                <SignalDashboard />
              </div>
            )}

            {activeTab === "indicators" && (
              <div className="h-full overflow-auto p-4">
                <TechnicalIndicators symbol={symbol} interval={timeframe} />
              </div>
            )}

            {/* Indicator Overlay on Chart */}
            {activeTab === "chart" && indicatorData && selectedIndicators.size > 0 && (
              <div className="absolute top-4 right-4 z-10 bg-[#1e2329]/90 backdrop-blur-sm rounded p-3 border border-[#2b3139] max-w-xs">
                <div className="text-xs text-[#848e9c] mb-2">ACTIVE INDICATORS</div>
                <div className="space-y-1">
                  {Array.from(selectedIndicators).map((indicator) => (
                    <div key={indicator} className="flex justify-between items-center text-xs">
                      <span className="text-[#848e9c]">{indicator}</span>
                      <span className="text-white font-medium">
                        {indicator === "RSI" && indicatorData.rsi && indicatorData.rsi.length > 0
                          ? indicatorData.rsi[indicatorData.rsi.length - 1].toFixed(1)
                          : indicator === "MACD" &&
                              indicatorData.macd &&
                              indicatorData.macd.histogram &&
                              indicatorData.macd.histogram.length > 0
                            ? indicatorData.macd.histogram[indicatorData.macd.histogram.length - 1] > 0
                              ? "↗"
                              : "↘"
                            : "●"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              className="bg-[#1e2329] border-l border-[#2b3139] flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="h-10 border-b border-[#2b3139] flex items-center justify-between px-3">
                <span className="text-sm font-medium text-[#848e9c]">MARKET DATA</span>
                <button onClick={() => setRightPanelOpen(false)} className="text-[#848e9c] hover:text-white">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Recent Trades */}
                <div className="p-3 border-b border-[#2b3139]">
                  <div className="text-xs text-[#848e9c] mb-2">RECENT TRADES</div>
                  <div className="space-y-1">
                    {trades.slice(0, 10).map((trade, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-white">${trade.price?.toFixed(2)}</span>
                        <span className="text-[#848e9c]">{new Date(trade.time).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funding Rate */}
                <div className="p-3 border-b border-[#2b3139]">
                  <div className="text-xs text-[#848e9c] mb-2">FUNDING RATE</div>
                  <div className="h-32">
                    <FundingChart data={funding} />
                  </div>
                </div>

                {/* Open Interest */}
                <div className="p-3 border-b border-[#2b3139]">
                  <div className="text-xs text-[#848e9c] mb-2">OPEN INTEREST</div>
                  <div className="h-32">
                    <OIChart data={oi} />
                  </div>
                </div>

                {/* Market Summary */}
                <div className="p-3">
                  <div className="text-xs text-[#848e9c] mb-2">MARKET SUMMARY</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#848e9c]">24h Change</span>
                      <span className={marketData.changePercent24h >= 0 ? "text-[#02c076]" : "text-[#f84960]"}>
                        {marketData.changePercent24h >= 0 ? "+" : ""}
                        {marketData.changePercent24h?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#848e9c]">24h Volume</span>
                      <span className="text-white">{marketData.volume24h?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#848e9c]">Last Update</span>
                      <span className="text-white">{lastUpdate?.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <div className="bg-[#1e2329] p-6 rounded-lg flex items-center gap-3 border border-[#2b3139]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f0b90b]"></div>
              <span className="font-medium text-white">Processing...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
