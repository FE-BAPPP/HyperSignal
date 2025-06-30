import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, 
  TimeScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import 'chartjs-adapter-date-fns';

ChartJS.register(TimeScale,CategoryScale, LinearScale, LineElement, PointElement, Tooltip);

export default function Chart({ data, symbol }) {
  if (!data || data.length === 0) return <p>Đang tải dữ liệu...</p>;

  const chartData = {
    labels: data.map(d => new Date(d.time)),
    datasets: [{
      label: `${symbol} Price`,
      data: data.map(d => d.price),
      borderWidth: 2
    }]
  };

  return <Line data={chartData} />;
}
