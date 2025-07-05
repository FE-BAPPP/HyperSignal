import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function OIChart({ data }) {
  console.log("📊 OIChart received data:", data)

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1421]">
        <div className="text-center">
          <div className="text-2xl mb-2">📈</div>
          <p className="text-sm text-[#848e9c]">No OI data</p>
        </div>
      </div>
    )
  }

  // Check if data has valid OI field
  const hasValidOI = data.some((item) => item && typeof item.oi !== "undefined" && item.oi !== null)

  if (!hasValidOI) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1421]">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm text-[#f84960]">Invalid OI data</p>
          <p className="text-xs text-[#848e9c]">Records: {data.length}</p>
        </div>
      </div>
    )
  }

  // Filter valid data with 'oi' field
  const validData = data.filter((item) => item && typeof item.oi !== "undefined" && item.oi !== null)
  const sortedData = validData.sort((a, b) => new Date(a.time) - new Date(b.time))

  const chartData = {
    labels: sortedData.map((item) =>
      new Date(item.time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    datasets: [
      {
        label: "Open Interest",
        data: sortedData.map((item) => Number.parseFloat(item.oi) || 0),
        borderColor: "#a855f7",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
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
          label: (context) => {
            const value = Number.parseFloat(context.parsed.y) || 0
            return `OI: ${value.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "#2b3139",
          drawBorder: false,
        },
        ticks: {
          color: "#848e9c",
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: "#2b3139",
          drawBorder: false,
        },
        ticks: {
          color: "#848e9c",
          callback: (value) => Number.parseFloat(value).toLocaleString(),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  }

  const currentOI = sortedData[sortedData.length - 1]

  return (
    <div className="h-full bg-[#0d1421] relative">
      {/* Chart Header */}
      <div className="absolute top-2 left-2 z-10 bg-[#1e2329]/80 backdrop-blur-sm rounded px-2 py-1 border border-[#2b3139]">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">📈 Open Interest</span>
          {currentOI && currentOI.oi !== undefined && (
            <span className="text-xs text-[#a855f7] bg-[#a855f7]/10 px-1 py-0.5 rounded">
              {Number.parseFloat(currentOI.oi).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <Line data={chartData} options={options} />
    </div>
  )
}

export default OIChart
