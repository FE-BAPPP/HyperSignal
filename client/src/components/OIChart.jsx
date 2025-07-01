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

function OIChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-gray-600">📈 Open Interest</h3>
        <p className="text-sm text-gray-500 mt-2">Không có dữ liệu open interest</p>
      </div>
    );
  }

  const sortedData = data.sort((a, b) => new Date(a.time) - new Date(b.time));

  const chartData = {
    labels: sortedData.map(item => 
      new Date(item.time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    ),
    datasets: [
      {
        label: "Open Interest",
        data: sortedData.map(item => item.openInterest),
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
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
        text: "📈 Open Interest History",
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `OI: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      },
    },
  };

  const currentOI = sortedData[sortedData.length - 1];

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">📈 Open Interest ({data.length} records)</h3>
        {currentOI && (
          <div className="flex gap-4 text-sm">
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">
              Current: {currentOI.openInterest.toLocaleString()}
            </span>
            <span className="text-gray-600">
              Updated: {new Date(currentOI.time).toLocaleTimeString()}
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

export default OIChart;
