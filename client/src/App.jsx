"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { toast, Toaster } from "react-hot-toast"
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import CandleChart from "./components/CandleChart"
import FundingChart from "./components/FundingChart"
import OIChart from "./components/OIChart"
import SignalDashboard from "./components/SignalDashboard"
import TechnicalIndicators from "./components/TechnicalIndicators"

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
    { value: "ETH", label: "ETH-PERP", icon: "🔷", price: 0, change: 0 },
    { value: "BTC", label: "BTC-PERP", icon: "₿", price: 0, change: 0 },
    { value: "SOL", label: "SOL-PERP", icon: "◎", price: 0, change: 0 },
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

  const triggerAggregation = async () => {
    setLoading(true)
    toast.loading("Aggregating data...", { id: "aggregation" })

    try {
      await axios.post(`http://localhost:4000/api/aggregate`, { symbols: [symbol] })
      toast.success(`Aggregation started for ${symbol}`, { id: "aggregation" })

      setTimeout(() => {
        fetchData()
        setLoading(false)
      }, 10000)
    } catch (err) {
      console.error("❌ Aggregation error:", err)
      toast.error("Aggregation failed", { id: "aggregation" })
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const intervalId = setInterval(() => {
      fetchData()
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
            <ChartBarIcon className="w-6 h-6 text-[#f0b90b]" />
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
          <button
            onClick={triggerAggregation}
            disabled={loading}
            className="bg-[#f0b90b] hover:bg-[#f0b90b]/80 text-black px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄"} Aggregate
          </button>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Watchlist */}
        <AnimatePresence>
          {leftSidebarOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 280 }}
              exit={{ width: 0 }}
              className="bg-[#1e2329] border-r border-[#2b3139] flex flex-col overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="h-10 border-b border-[#2b3139] flex items-center justify-between px-3">
                <span className="text-sm font-medium text-[#848e9c]">WATCHLIST</span>
                <button onClick={() => setLeftSidebarOpen(false)} className="text-[#848e9c] hover:text-white">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Symbol List */}
              <div className="flex-1 overflow-y-auto">
                {symbols.map((sym) => (
                  <div
                    key={sym.value}
                    onClick={() => setSymbol(sym.value)}
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-[#2b3139] border-b border-[#2b3139]/50 ${
                      symbol === sym.value ? "bg-[#2b3139]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sym.icon}</span>
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
                        className={`text-xs ${
                          symbol === sym.value && marketData.changePercent24h >= 0 ? "text-[#02c076]" : "text-[#f84960]"
                        }`}
                      >
                        {symbol === sym.value
                          ? `${marketData.changePercent24h >= 0 ? "+" : ""}${marketData.changePercent24h?.toFixed(2)}%`
                          : "0.00%"}
                      </div>
                    </div>
                  </div>
                ))}
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
              <button onClick={() => setLeftSidebarOpen(true)} className="text-[#848e9c] hover:text-white">
                <Bars3Icon className="w-5 h-5" />
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
          <div className="flex-1 bg-[#0d1421] overflow-hidden">
            {activeTab === "chart" && (
              <div className="h-full p-4">
                <CandleChart data={candles} symbol={symbol} interval={timeframe} />
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
                <div className="p-3">
                  <div className="text-xs text-[#848e9c] mb-2">OPEN INTEREST</div>
                  <div className="h-32">
                    <OIChart data={oi} />
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
