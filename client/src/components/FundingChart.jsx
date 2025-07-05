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
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function FundingChart({ data }) {
  console.log("📊 FundingChart received data:", data)

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1421]">
        <div className="text-center">
          <DollarSign className="w-12 h-12 text-[#848e9c] mx-auto mb-2" />
          <p className="text-sm text-[#848e9c]">No funding data</p>
        </div>
      </div>
    )
  }

  const sortedData = data.sort((a, b) => new Date(a.time || a.createdAt) - new Date(b.time || b.createdAt))

  const chartData = {
    labels: sortedData.map((item) =>
      new Date(item.time || item.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    datasets: [
      {
        label: "Funding Rate (%)",
        data: sortedData.map((item) => (item.fundingRate * 100).toFixed(4)),
        borderColor: "#f0b90b",
        backgroundColor: "rgba(240, 185, 11, 0.1)",
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
          label: (context) => `Funding Rate: ${context.parsed.y}%`,
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
          callback: (value) => value + "%",
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  }

  const currentFunding = sortedData[sortedData.length - 1]

  return (
    <div className="h-full bg-[#0d1421] relative">
      {/* Chart Header */}
      <div className="absolute top-2 left-2 z-10 bg-[#1e2329]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#2b3139] shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#f0b90b]" />
            <span className="text-white text-sm font-medium">Funding Rate</span>
          </div>
          {currentFunding && (
            <div
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                currentFunding.fundingRate > 0 ? "text-[#f84960] bg-[#f84960]/10" : "text-[#02c076] bg-[#02c076]/10"
              }`}
            >
              {currentFunding.fundingRate > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{(currentFunding.fundingRate * 100).toFixed(4)}%</span>
            </div>
          )}
        </div>
      </div>

      <Line data={chartData} options={options} />
    </div>
  )
}

export default FundingChart
