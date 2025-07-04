import { useState, useEffect } from "react";
import axios from "axios";
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
  const [activeTab, setActiveTab] = useState('trading');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(['RSI', 'MACD', 'BB']));

  const fetchData = () => {
    setLoading(true);
    console.log(`🔄 Fetching data for ${symbol} ${timeframe}...`);
    
    axios.get(`http://localhost:4000/api/candles?symbol=${symbol}&interval=${timeframe}&limit=100`)
      .then(res => {
        console.log(`📊 Fetched ${res.data.length} ${timeframe} candles for ${symbol}`);
        setCandles(res.data);
        setLastUpdate(new Date());
      })
      .catch(err => {
        console.error(`❌ Error fetching candles:`, err);
        setCandles([]);
      });
      
    axios.get(`http://localhost:4000/api/trades?symbol=${symbol}&limit=50`)
      .then(res => setTrades(res.data))
      .catch(err => {
        console.error(`❌ Error fetching trades:`, err);
        setTrades([]);
      });
      
    axios.get(`http://localhost:4000/api/funding?symbol=${symbol}&limit=50`)
      .then(res => {
        console.log(`💰 Fetched ${res.data.length} funding records for ${symbol}`);
        setFunding(res.data);
      })
      .catch(err => {
        console.error(`❌ Error fetching funding:`, err);
        setFunding([]);
      });
      
    axios.get(`http://localhost:4000/api/oi?symbol=${symbol}&limit=50`)
      .then(res => {
        console.log(`📈 Fetched ${res.data.length} OI records for ${symbol}`);
        setOI(res.data);
      })
      .catch(err => {
        console.error(`❌ Error fetching OI:`, err);
        setOI([]);
      });
    
    setLoading(false);
  };

  const fetchStatus = () => {
    axios.get(`http://localhost:4000/api/status`)
      .then(res => setStatus(res.data))
      .catch(console.error);
  };

  const fetchIntervals = () => {
    axios.get(`http://localhost:4000/api/intervals?symbol=${symbol}`)
      .then(res => {
        console.log(`📊 Available intervals for ${symbol}:`, res.data);
        setAvailableIntervals(res.data);
      })
      .catch(console.error);
  };

  const fetchDebugInfo = () => {
    axios.get(`http://localhost:4000/api/debug/${symbol}`)
      .then(res => {
        console.log(`🔍 Debug info for ${symbol}:`, res.data);
        setDebugInfo(res.data);
      })
      .catch(console.error);
  };

  // Fix useEffect với dependency đúng
  useEffect(() => {
    console.log(`🔄 Effect triggered: symbol=${symbol}, timeframe=${timeframe}`);
    
    fetchData();
    fetchStatus();
    fetchIntervals();
    fetchDebugInfo();
    
    // Clear interval trước đó
    const intervalId = setInterval(() => {
      console.log(`⏰ Auto refresh: ${symbol} ${timeframe}`);
      fetchData();
      fetchStatus();
      fetchDebugInfo();
    }, 30000); // Tăng lên 30s để tránh spam
    
    return () => {
      console.log(`🔄 Cleaning up interval for ${symbol} ${timeframe}`);
      clearInterval(intervalId);
    };
  }, [symbol, timeframe]); // Dependencies rõ ràng

  const triggerAggregation = () => {
    console.log("🔄 Triggering aggregation...");
    setLoading(true);
    
    axios.post(`http://localhost:4000/api/aggregate`, { symbols: [symbol] })
      .then(res => {
        console.log("✅ Aggregation triggered:", res.data);
        alert(`✅ Aggregation started for ${symbol}`);
        
        // Đợi 10s rồi refresh
        setTimeout(() => {
          fetchData();
          fetchIntervals();
          fetchDebugInfo();
          setLoading(false);
        }, 10000);
      })
      .catch(err => {
        console.error("❌ Aggregation error:", err);
        alert("❌ Aggregation failed: " + err.message);
        setLoading(false);
      });
  };

  const handleIndicatorSelect = (indicators, selected) => {
    setSelectedIndicators(selected);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      {/* Sidebar - HyperLiquid style */}
      <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
        sidebarOpen ? 'w-80' : 'w-12'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-blue-400">📊 HyperSignal</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Symbol & Timeframe Selector */}
            <div className="p-4 border-b border-gray-700">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Market</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="ETH">ETH-PERP</option>
                    <option value="BTC">BTC-PERP</option>
                    <option value="SOL">SOL-PERP</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
                  <div className="grid grid-cols-4 gap-1">
                    {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          timeframe === tf 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {tf.toUpperCase()}
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
            <div className="p-4 border-t border-gray-700 space-y-2">
              <button
                onClick={triggerAggregation}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded transition-colors"
              >
                {loading ? '⏳ Processing...' : '🔄 Aggregate Data'}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('trading')}
                  className={`px-3 py-2 text-xs rounded transition-colors ${
                    activeTab === 'trading' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  📈 Charts
                </button>
                <button
                  onClick={() => setActiveTab('signals')}
                  className={`px-3 py-2 text-xs rounded transition-colors ${
                    activeTab === 'signals' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🎯 Signals
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {symbol}-PERP <span className="text-gray-400">{timeframe.toUpperCase()}</span>
            </h2>
            {candles.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-400">${candles[candles.length - 1]?.close?.toFixed(2)}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">{candles.length} candles</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => {
                fetchData();
                fetchStatus();
              }}
              className="text-gray-400 hover:text-white"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'trading' && (
            <div className="p-6">
              {/* Main Chart */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <CandleChart data={candles} symbol={symbol} interval={timeframe} />
              </div>

              {/* Secondary Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <FundingChart data={funding} />
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <OIChart data={oi} />
                </div>
              </div>

              {/* Debug Panel */}
              {debugInfo && Object.keys(debugInfo).length > 0 && (
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-300">🔍 System Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trades:</span>
                      <span className={debugInfo.tickers > 0 ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.tickers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Candles:</span>
                      <span className={debugInfo.candles > 0 ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.candles || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Funding:</span>
                      <span className={debugInfo.funding > 0 ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.funding || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">OI:</span>
                      <span className={debugInfo.oi > 0 ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.oi || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="p-6">
              <SignalDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
