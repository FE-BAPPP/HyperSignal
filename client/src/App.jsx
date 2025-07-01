import { useState, useEffect } from "react";
import axios from "axios";
import CandleChart from "./components/CandleChart";
import FundingChart from "./components/FundingChart";
import OIChart from "./components/OIChart";

function App() {
  const [symbol, setSymbol] = useState("ETH");
  const [timeframe, setTimeframe] = useState("1m"); // Đổi tên để tránh conflict
  const [candles, setCandles] = useState([]);
  const [trades, setTrades] = useState([]);
  const [funding, setFunding] = useState([]);
  const [oi, setOI] = useState([]);
  const [status, setStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [availableIntervals, setAvailableIntervals] = useState([]);
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">📊 HyperSignal Dashboard</h1>
      
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => {
              console.log(`📊 Symbol changed to: ${e.target.value}`);
              setSymbol(e.target.value);
            }}
            className="border rounded px-3 py-2"
            disabled={loading}
          >
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => {
              console.log(`📊 Timeframe changed to: ${e.target.value}`);
              setTimeframe(e.target.value);
            }}
            className="border rounded px-3 py-2"
            disabled={loading}
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="30m">30 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>
        
        <div className="flex items-end gap-2">
          <button
            onClick={triggerAggregation}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳' : '🔄'} Aggregate
          </button>
          
          <button
            onClick={() => {
              console.log(`🔄 Manual refresh: ${symbol} ${timeframe}`);
              fetchData();
              fetchIntervals();
              fetchDebugInfo();
            }}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Loading {symbol} {timeframe} data...</span>
          </div>
        </div>
      )}

      {/* Available intervals */}
      {availableIntervals.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Available intervals: </span>
          <span className="text-sm font-medium">{availableIntervals.join(", ")}</span>
          <span className={`ml-2 px-2 py-1 text-xs rounded ${
            availableIntervals.includes(timeframe) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {availableIntervals.includes(timeframe) ? `✅ ${timeframe} available` : `❌ ${timeframe} not available`}
          </span>
        </div>
      )}

      {/* Main Chart */}
      <CandleChart data={candles} symbol={symbol} interval={timeframe} />
      
      {/* Other Charts */}
      <FundingChart data={funding} />
      <OIChart data={oi} />

      {/* Debug Info */}
      {debugInfo && Object.keys(debugInfo).length > 0 && (
        <div className="mt-6 p-4 border rounded bg-blue-50">
          <h3 className="font-semibold mb-2">🔍 Debug Info for {symbol}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Tickers:</span> 
              <span className={debugInfo.tickers > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                {debugInfo.tickers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Candles:</span> 
              <span className={debugInfo.candles > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                {debugInfo.candles || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Funding:</span> 
              <span className={debugInfo.funding > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                {debugInfo.funding || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">OI:</span> 
              <span className={debugInfo.oi > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                {debugInfo.oi || 0}
              </span>
            </div>
          </div>
          
          {debugInfo.intervals && debugInfo.intervals.length > 0 && (
            <div className="mt-3 p-2 bg-white rounded border">
              <span className="font-medium text-sm text-gray-700">Available in DB:</span> 
              <div className="mt-1 flex flex-wrap gap-1">
                {debugInfo.intervals.map(int => (
                  <span key={int} className={`px-2 py-1 text-xs rounded ${
                    int === timeframe ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {int}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent candles preview */}
          {debugInfo.recentCandles && debugInfo.recentCandles.length > 0 && (
            <div className="mt-3 p-2 bg-white rounded border">
              <span className="font-medium text-sm text-gray-700">Recent Candles ({timeframe}):</span>
              <div className="mt-1 text-xs">
                {debugInfo.recentCandles.slice(0, 3).map((candle, i) => (
                  <div key={i} className="text-gray-600">
                    {new Date(candle.startTime).toLocaleString()}: O:{candle.open} H:{candle.high} L:{candle.low} C:{candle.close}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Status */}
      {status && Object.keys(status).length > 0 && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">📊 System Status</h3>
          <pre className="text-sm overflow-auto max-h-40">{JSON.stringify(status, null, 2)}</pre>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
