import { useEffect, useState } from "react";
import axios from "axios";
import Chart from "./components/Chart";

const symbols = ["ETH", "BTC", "SOL"];

function App() {
  const [symbol, setSymbol] = useState("ETH");
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:4000/api/ticker?symbol=${symbol}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [symbol]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Hyperliquid Multi-Symbol Chart</h1>

      <select
        className="mb-4 p-2 border"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      >
        {symbols.map(sym => (
          <option key={sym} value={sym}>{sym}</option>
        ))}
      </select>

      <Chart data={data} symbol={symbol} />
    </div>
  );
}

export default App;
