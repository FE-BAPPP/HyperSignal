import ReactApexChart from "react-apexcharts";

export default function CandleChart({ data }) {
  console.log("📊 CandleChart data:", data);
  
  // Kiểm tra nếu không có data
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-100 p-8 rounded-lg text-center">
        <p className="text-gray-600">Không có dữ liệu nến để hiển thị</p>
        <p className="text-sm text-gray-500">Đang chờ dữ liệu từ server...</p>
      </div>
    );
  }

  // Sắp xếp data theo thời gian và log ra để debug
  const sortedData = [...data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  console.log("📊 Sorted candle data:", sortedData.slice(0, 5)); // Log 5 candles đầu
  
  const series = [{
    name: 'Giá',
    data: sortedData.map(c => ({
      x: new Date(c.startTime).getTime(),
      y: [
        parseFloat(c.open), 
        parseFloat(c.high), 
        parseFloat(c.low), 
        parseFloat(c.close)
      ]
    }))
  }];

  const options = {
    chart: { 
      type: 'candlestick', 
      height: 350,
      toolbar: {
        show: true
      }
    },
    title: {
      text: `Biểu đồ nến - ${sortedData.length} nến`,
      align: 'left'
    },
    xaxis: { 
      type: 'datetime',
      labels: {
        format: 'HH:mm'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#00B746',
          downward: '#EF403C'
        }
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <ReactApexChart options={options} series={series} type="candlestick" height={350} />
    </div>
  );
}
