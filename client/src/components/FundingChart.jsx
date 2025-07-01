import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function FundingChart({ data }) {
  console.log("📊 FundingChart received data:", data);

  if (!data || data.length === 0) {
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-gray-600">💰 Funding Rate</h3>
        <p className="text-sm text-gray-500 mt-2">Không có dữ liệu funding rate</p>
        <p className="text-xs text-gray-400">Data length: {data ? data.length : 'null'}</p>
      </div>
    );
  }

  const sortedData = data.sort((a, b) => new Date(a.time || a.createdAt) - new Date(b.time || b.createdAt));

  const chartData = {
    labels: sortedData.map(item => 
      new Date(item.time || item.createdAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    ),
    datasets: [
      {
        label: "Funding Rate (%)",
        data: sortedData.map(item => (item.fundingRate * 100).toFixed(4)),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "💰 Funding Rate History",
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Funding Rate: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      },
    },
  };

  const currentFunding = sortedData[sortedData.length - 1];

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">💰 Funding Rate ({data.length} records)</h3>
        {currentFunding && (
          <div className="flex gap-4 text-sm">
            <span className={`px-2 py-1 rounded ${
              currentFunding.fundingRate > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              Current: {(currentFunding.fundingRate * 100).toFixed(4)}%
            </span>
            <span className="text-gray-600">
              Updated: {new Date(currentFunding.time || currentFunding.createdAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      <div style={{ height: "300px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default FundingChart;
