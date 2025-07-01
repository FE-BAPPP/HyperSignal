import { useEffect, useState } from "react";
import axios from "axios";
import Chart from "./components/Chart";
import CandleChart from "./components/CandleChart";
import TradeTable from "./components/TradeTable";
import FundingChart from "./components/FundingChart";
import OIChart from "./components/OIChart"

const symbols = ["ETH", "BTC", "SOL"];

function App() {
  const [symbol, setSymbol] = useState("ETH");
  const [trades, setTrades] = useState([]);
  const [candles, setCandle] = useState([]);
  const [status, setStatus] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [funding, setFunding] = useState([]);
  const [oi, setOI] = useState([]);

  const fetchData = () => {
    axios.get(`http://localhost:4000/api/candles?symbol=${symbol}`)
      .then(res => {
        console.log(`📊 Fetched ${res.data.length} candles for ${symbol}`);
        setCandle(res.data);
        setLastUpdate(new Date());
      })
      .catch(console.error);
    axios.get(`http://localhost:4000/api/trades?symbol=${symbol}`)
      .then(res => setTrades(res.data))
      .catch(console.error);
    axios.get(`http://localhost:4000/api/funding?symbol=${symbol}`)
      .then(res => setFunding(res.data))
      .catch(console.error);
    axios.get(`http://localhost:4000/api/oi?symbol=${symbol}`)
      .then(res => setOI(res.data))
      .catch(console.error);
  };

  const fetchStatus = () => {
    axios.get(`http://localhost:4000/api/status`)
      .then(res => setStatus(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
    fetchStatus();
    
    // Auto refresh mỗi 10 giây
    const interval = setInterval(() => {
      fetchData();
      fetchStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        🔥 HyperLiquid Perp Dashboard - {symbol}
        <span className="text-sm font-normal text-gray-600 ml-2">(Perpetual Futures)</span>
      </h1>

      <div className="flex gap-4 mb-4">
        <select
          className="p-2 border rounded"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        >
          {symbols.map(sym => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>
        
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔄 Refresh
        </button>
        
        <span className="px-3 py-2 bg-gray-100 rounded">
          📊 {candles.length} nến
        </span>
      </div>

      <CandleChart data={candles} />
      <h2 className="mt-6 text-lg font-semibold">Recent Trades ({trades.length})</h2>
      <TradeTable trades={trades} />
      <FundingChart data={funding} />
      <OIChart data={oi} />

      {status && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold">Trạng thái hệ thống</h3>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}

      {lastUpdate && (
        <div className="mt-4 text-sm text-gray-500">
          Cập nhật lần cuối: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default App;
