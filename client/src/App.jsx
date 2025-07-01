import { useState, useEffect } from "react";
import axios from "axios";
import CandleChart from "./components/CandleChart";
import FundingChart from "./components/FundingChart";
import OIChart from "./components/OIChart";


function App() {
  const [symbol, setSymbol] = useState("ETH");
  const [interval, setInterval] = useState("1m");
  const [candles, setCandles] = useState([]);
  const [trades, setTrades] = useState([]);
  const [funding, setFunding] = useState([]);
  const [oi, setOI] = useState([]);
  const [status, setStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [availableIntervals, setAvailableIntervals] = useState([]);
  const [debugInfo, setDebugInfo] = useState({});

  const fetchData = () => {
    axios.get(`http://localhost:4000/api/candles?symbol=${symbol}&interval=${interval}`)
      .then(res => {
        console.log(`📊 Fetched ${res.data.length} ${interval} candles for ${symbol}`);
        setCandles(res.data);
        setLastUpdate(new Date());
      })
      .catch(console.error);
      
    axios.get(`http://localhost:4000/api/trades?symbol=${symbol}`)
      .then(res => setTrades(res.data))
      .catch(console.error);
      
    axios.get(`http://localhost:4000/api/funding?symbol=${symbol}`)
      .then(res => {
        console.log(`💰 Fetched ${res.data.length} funding records for ${symbol}:`, res.data);
        setFunding(res.data);
      })
      .catch(console.error);
      
    axios.get(`http://localhost:4000/api/oi?symbol=${symbol}`)
      .then(res => {
        console.log(`📈 Fetched ${res.data.length} OI records for ${symbol}:`, res.data);
        setOI(res.data);
      })
      .catch(console.error);
  };

  const fetchStatus = () => {
    axios.get(`http://localhost:4000/api/status`)
      .then(res => setStatus(res.data))
      .catch(console.error);
  };

  const fetchIntervals = () => {
    axios.get(`http://localhost:4000/api/intervals?symbol=${symbol}`)
      .then(res => setAvailableIntervals(res.data))
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

  useEffect(() => {
    fetchData();
    fetchStatus();
    fetchIntervals();
    fetchDebugInfo(); // Thêm debug info
    
    const interval = setInterval(() => {
      fetchData();
      fetchStatus();
      fetchDebugInfo(); // Update debug info
    }, 10000);
    
    return () => clearInterval(interval);
  }, [symbol, interval]);

  const triggerAggregation = () => {
    console.log("🔄 Triggering aggregation...");
    axios.post(`http://localhost:4000/api/aggregate`, { symbols: [symbol] })
      .then(res => {
        console.log("✅ Aggregation triggered:", res.data);
        alert(`✅ Aggregation started for ${symbol}`);
        setTimeout(() => {
          fetchData();
          fetchIntervals();
        }, 5000); // Refresh after 5 seconds
      })
      .catch(err => {
        console.error("❌ Aggregation error:", err);
        alert("❌ Aggregation failed");
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
            onChange={(e) => setSymbol(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Timeframe</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="border rounded px-3 py-2"
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
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Aggregate
          </button>
          
          <button
            onClick={() => {
              fetchData();
              fetchIntervals();
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {availableIntervals.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Available intervals: </span>
          <span className="text-sm font-medium">{availableIntervals.join(", ")}</span>
        </div>
      )}

      <CandleChart data={candles} symbol={symbol} interval={interval} />
      <FundingChart data={funding} />
      <OIChart data={oi} />
  

      {status && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">📊 Trạng thái hệ thống</h3>
          <pre className="text-sm">{JSON.stringify(status, null, 2)}</pre>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Thêm debug section */}
      {debugInfo && Object.keys(debugInfo).length > 0 && (
        <div className="mt-6 p-4 border rounded bg-blue-50">
          <h3 className="font-semibold mb-2">🔍 Debug Info for {symbol}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Tickers:</span> {debugInfo.tickers || 0}
            </div>
            <div>
              <span className="font-medium">Candles:</span> {debugInfo.candles || 0}
            </div>
            <div>
              <span className="font-medium">Funding:</span> {debugInfo.funding || 0}
            </div>
            <div>
              <span className="font-medium">OI:</span> {debugInfo.oi || 0}
            </div>
          </div>
          {debugInfo.intervals && debugInfo.intervals.length > 0 && (
            <div className="mt-2">
              <span className="font-medium text-sm">DB Intervals:</span> 
              <span className="text-sm ml-2">{debugInfo.intervals.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
