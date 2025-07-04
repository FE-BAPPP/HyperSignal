import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { Tab } from "@headlessui/react";
import { 
  ChartBarIcon, 
  BoltIcon, 
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import CandleChart from "./components/CandleChart";
import FundingChart from "./components/FundingChart";
import OIChart from "./components/OIChart";
import SignalDashboard from "./components/SignalDashboard";
import TechnicalIndicators from "./components/TechnicalIndicators";
import IndicatorFilters from "./components/IndicatorFilters";

function App() {
  const [symbol, setSymbol] = useState("ETH");
  const [timeframe, setTimeframe] = useState("1h");
  const [candles, setCandles] = useState([]);
  const [trades, setTrades] = useState([]);
  const [funding, setFunding] = useState([]);
  const [oi, setOI] = useState([]);
  const [status, setStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [availableIntervals, setAvailableIntervals] = useState([]);
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(['RSI', 'MACD', 'BB']));
  const [priceChange, setPriceChange] = useState({ change: 0, percent: 0 });

  // Market data for ticker
  const [marketData, setMarketData] = useState({
    price: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0,
    changePercent24h: 0
  });

  const symbols = [
    { value: "ETH", label: "ETH-PERP", icon: "🔷" },
    { value: "BTC", label: "BTC-PERP", icon: "₿" },
    { value: "SOL", label: "SOL-PERP", icon: "◎" }
  ];

  const timeframes = [
    { value: "1m", label: "1m", color: "bg-red-600" },
    { value: "5m", label: "5m", color: "bg-orange-600" },
    { value: "15m", label: "15m", color: "bg-yellow-600" },
    { value: "30m", label: "30m", color: "bg-green-600" },
    { value: "1h", label: "1h", color: "bg-blue-600" },
    { value: "4h", label: "4h", color: "bg-purple-600" },
    { value: "1d", label: "1d", color: "bg-gray-600" }
  ];

  const fetchData = async () => {
    setLoading(true);
    toast.loading(`Loading ${symbol} ${timeframe} data...`, { id: 'fetch-data' });
    
    try {
      const [candlesRes, tradesRes, fundingRes, oiRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/candles?symbol=${symbol}&interval=${timeframe}&limit=100`),
        axios.get(`http://localhost:4000/api/trades?symbol=${symbol}&limit=50`),
        axios.get(`http://localhost:4000/api/funding?symbol=${symbol}&limit=50`),
        axios.get(`http://localhost:4000/api/oi?symbol=${symbol}&limit=50`)
      ]);

      setCandles(candlesRes.data);
      setTrades(tradesRes.data);
      setFunding(fundingRes.data);
      setOI(oiRes.data);
      setLastUpdate(new Date());

      // Calculate market data
      if (candlesRes.data.length > 0) {
        const currentCandle = candlesRes.data[candlesRes.data.length - 1];
        const prevCandle = candlesRes.data[candlesRes.data.length - 2];
        
        if (currentCandle && prevCandle) {
          const change = currentCandle.close - prevCandle.close;
          const changePercent = (change / prevCandle.close) * 100;
          
          setPriceChange({ change, percent: changePercent });
          setMarketData({
            price: currentCandle.close,
            high24h: Math.max(...candlesRes.data.slice(-24).map(c => c.high)),
            low24h: Math.min(...candlesRes.data.slice(-24).map(c => c.low)),
            volume24h: candlesRes.data.slice(-24).reduce((sum, c) => sum + (c.volume || 0), 0),
            change24h: change,
            changePercent24h: changePercent
          });
        }
      }

      toast.success(`${symbol} ${timeframe} data loaded`, { id: 'fetch-data' });
    } catch (err) {
      console.error(`❌ Error fetching data:`, err);
      toast.error(`Failed to load ${symbol} data`, { id: 'fetch-data' });
      setCandles([]);
      setTrades([]);
      setFunding([]);
      setOI([]);
    }
    
    setLoading(false);
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/status`);
      setStatus(res.data);
    } catch (err) {
      console.error('❌ Error fetching status:', err);
    }
  };

  const fetchIntervals = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/intervals?symbol=${symbol}`);
      setAvailableIntervals(res.data);
    } catch (err) {
      console.error('❌ Error fetching intervals:', err);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/debug/${symbol}`);
      setDebugInfo(res.data);
    } catch (err) {
      console.error('❌ Error fetching debug info:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStatus();
    fetchIntervals();
    fetchDebugInfo();
    
    const intervalId = setInterval(() => {
      fetchData();
      fetchStatus();
      fetchDebugInfo();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [symbol, timeframe]);

  const triggerAggregation = async () => {
    setLoading(true);
    toast.loading('Starting data aggregation...', { id: 'aggregation' });
    
    try {
      const res = await axios.post(`http://localhost:4000/api/aggregate`, { symbols: [symbol] });
      toast.success(`Aggregation started for ${symbol}`, { id: 'aggregation' });
      
      setTimeout(() => {
        fetchData();
        fetchIntervals();
        fetchDebugInfo();
        setLoading(false);
      }, 10000);
    } catch (err) {
      console.error("❌ Aggregation error:", err);
      toast.error("Aggregation failed", { id: 'aggregation' });
      setLoading(false);
    }
  };

  const handleIndicatorSelect = (indicators, selected) => {
    setSelectedIndicators(selected);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#374151',
            color: '#fff',
            border: '1px solid #4B5563'
          }
        }}
      />

      {/* Modern Sidebar */}
      <motion.div 
        className={`bg-gray-800 border-r border-gray-700 relative z-10`}
        animate={{ width: sidebarOpen ? 320 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gray-700 flex items-center justify-between px-4">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  HyperSignal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* Market Selector */}
              <div className="p-4 border-b border-gray-700">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Market</label>
                    <div className="grid gap-2">
                      {symbols.map(sym => (
                        <button
                          key={sym.value}
                          onClick={() => setSymbol(sym.value)}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                            symbol === sym.value 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          <span className="text-lg">{sym.icon}</span>
                          <span className="font-medium">{sym.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Timeframe</label>
                    <div className="grid grid-cols-4 gap-1">
                      {timeframes.map(tf => (
                        <button
                          key={tf.value}
                          onClick={() => setTimeframe(tf.value)}
                          className={`px-2 py-2 text-xs font-medium rounded-lg transition-all ${
                            timeframe === tf.value 
                              ? `${tf.color} text-white shadow-lg scale-105` 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicators Panel */}
              <div className="flex-1 overflow-hidden">
                <IndicatorFilters 
                  symbol={symbol} 
                  interval={timeframe}
                  onIndicatorSelect={handleIndicatorSelect}
                />
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-gray-700 space-y-3">
                <button
                  onClick={triggerAggregation}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <BoltIcon className="w-4 h-4" />
                  )}
                  {loading ? 'Processing...' : 'Aggregate Data'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Modern Top Bar */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            {/* Symbol & Price */}
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">
                {symbol}-PERP
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  ${marketData.price?.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                  priceChange.change >= 0 ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {priceChange.change >= 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {priceChange.change >= 0 ? '+' : ''}{priceChange.percent?.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Market Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-400">24h High</span>
                <div className="font-medium text-green-400">${marketData.high24h?.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-400">24h Low</span>
                <div className="font-medium text-red-400">${marketData.low24h?.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-400">24h Volume</span>
                <div className="font-medium text-blue-400">{marketData.volume24h?.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ClockIcon className="w-4 h-4" />
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
            
            <button
              onClick={() => {
                fetchData();
                fetchStatus();
              }}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area with Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tab.Group>
            <Tab.List className="flex space-x-1 bg-gray-800 border-b border-gray-700 px-6">
              {['Charts', 'Signals', 'Indicators'].map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) =>
                    `px-4 py-3 text-sm font-medium leading-5 transition-all ${
                      selected
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`
                  }
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
            
            <Tab.Panels className="flex-1 overflow-auto">
              {/* Charts Panel */}
              <Tab.Panel className="h-full">
                <div className="p-6 space-y-6">
                  {/* Main Chart */}
                  <motion.div 
                    className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CandleChart data={candles} symbol={symbol} interval={timeframe} />
                  </motion.div>

                  {/* Secondary Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div 
                      className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <FundingChart data={funding} />
                    </motion.div>
                    
                    <motion.div 
                      className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <OIChart data={oi} />
                    </motion.div>
                  </div>

                  {/* System Status */}
                  {debugInfo && Object.keys(debugInfo).length > 0 && (
                    <motion.div 
                      className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <h3 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
                        <Cog6ToothIcon className="w-5 h-5" />
                        System Status
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Trades', value: debugInfo.tickers, key: 'tickers' },
                          { label: 'Candles', value: debugInfo.candles, key: 'candles' },
                          { label: 'Funding', value: debugInfo.funding, key: 'funding' },
                          { label: 'OI', value: debugInfo.oi, key: 'oi' }
                        ].map(({ label, value, key }) => (
                          <div key={key} className="bg-gray-700 rounded-lg p-4">
                            <div className="text-sm text-gray-400">{label}</div>
                            <div className={`text-2xl font-bold ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {value || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </Tab.Panel>

              {/* Signals Panel */}
              <Tab.Panel className="h-full overflow-auto">
                <SignalDashboard />
              </Tab.Panel>

              {/* Indicators Panel */}
              <Tab.Panel className="h-full overflow-auto p-6">
                <TechnicalIndicators symbol={symbol} interval={timeframe} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-4"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="text-lg font-medium text-white">Processing data...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
