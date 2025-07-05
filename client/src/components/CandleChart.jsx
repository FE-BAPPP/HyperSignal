import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Tooltip, Legend } from "chart.js"
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial"
import { Chart } from "react-chartjs-2"
import "chartjs-adapter-date-fns"

ChartJS.register(CategoryScale, LinearScale, TimeScale, Tooltip, Legend, CandlestickController, CandlestickElement)

function CandleChart({ data, symbol = "ETH", interval = "1m" }) {
  console.log(`📊 CandleChart received:`, { symbol, interval, dataLength: data?.length })

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1421]">
        <div className="text-center">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-white mb-2">No Chart Data</h3>
          <p className="text-sm text-[#848e9c] mb-4">
            No candle data available for {symbol} {interval}
          </p>
          <p className="text-xs text-[#848e9c]">Click "Aggregate" to generate multi-timeframe data</p>
        </div>
      </div>
    )
  }

  const sortedData = data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  const chartData = {
    datasets: [
      {
        label: `${symbol} ${interval}`,
        data: sortedData.map((candle) => ({
          x: new Date(candle.startTime).getTime(),
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close,
        })),
        color: {
          up: "#02c076",
          down: "#f84960",
          unchanged: "#848e9c",
        },
        borderColor: {
          up: "#02c076",
          down: "#f84960",
          unchanged: "#848e9c",
        },
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1e2329",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#2b3139",
        borderWidth: 1,
        callbacks: {
          title: (context) => new Date(context[0].parsed.x).toLocaleString(),
          label: (context) => {
            const data = context.raw
            return [
              `Open: $${data.o?.toFixed(2)}`,
              `High: $${data.h?.toFixed(2)}`,
              `Low: $${data.l?.toFixed(2)}`,
              `Close: $${data.c?.toFixed(2)}`,
              `Change: ${(((data.c - data.o) / data.o) * 100).toFixed(2)}%`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: interval === "1d" ? "day" : interval === "1h" || interval === "4h" ? "hour" : "minute",
          displayFormats: {
            minute: "HH:mm",
            hour: "MMM dd HH:mm",
            day: "MMM dd",
          },
        },
        grid: {
          color: "#2b3139",
          drawBorder: false,
        },
        ticks: {
          color: "#848e9c",
          maxTicksLimit: 8,
        },
      },
      y: {
        position: "right",
        grid: {
          color: "#2b3139",
          drawBorder: false,
        },
        ticks: {
          color: "#848e9c",
          callback: (value) => "$" + value.toFixed(2),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    layout: {
      padding: 0,
    },
  }

  return (
    <div className="h-full bg-[#0d1421] relative">
      {/* Chart Header */}
      <div className="absolute top-4 left-4 z-10 bg-[#1e2329]/80 backdrop-blur-sm rounded px-3 py-2 border border-[#2b3139]">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">
            {symbol} {interval.toUpperCase()}
          </span>
          <span className="text-[#848e9c] text-sm">({sortedData.length} candles)</span>
        </div>
        {sortedData.length > 0 && (
          <div className="flex items-center gap-4 mt-1 text-sm">
            <span className="text-[#848e9c]">O</span>
            <span className="text-white">{sortedData[sortedData.length - 1].open?.toFixed(2)}</span>
            <span className="text-[#848e9c]">H</span>
            <span className="text-white">{sortedData[sortedData.length - 1].high?.toFixed(2)}</span>
            <span className="text-[#848e9c]">L</span>
            <span className="text-white">{sortedData[sortedData.length - 1].low?.toFixed(2)}</span>
            <span className="text-[#848e9c]">C</span>
            <span className="text-white">{sortedData[sortedData.length - 1].close?.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Chart type="candlestick" data={chartData} options={options} />
    </div>
  )
}

export default CandleChart
