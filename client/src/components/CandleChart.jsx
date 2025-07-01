import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

function CandleChart({ data, symbol = 'ETH', interval = '1m' }) {
  console.log(`📊 CandleChart received:`, { symbol, interval, dataLength: data?.length });

  // Validate props
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-gray-600">📈 {symbol} {interval} Candles</h3>
        <p className="text-sm text-gray-500 mt-2">Không có dữ liệu candle cho {interval}</p>
        <p className="text-xs text-gray-400 mt-1">Hãy click "Aggregate" để tạo dữ liệu multi-timeframe</p>
      </div>
    );
  }

  // Validate interval
  const safeInterval = interval || '1m';
  const safeSymbol = symbol || 'ETH';

  // Sắp xếp data theo thời gian
  const sortedData = data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const chartData = {
    datasets: [
      {
        label: `${safeSymbol} ${safeInterval}`,
        data: sortedData.map(candle => ({
          x: new Date(candle.startTime).getTime(),
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close
        })),
        color: {
          up: '#26a69a',    // Green for bullish candles
          down: '#ef5350',  // Red for bearish candles
          unchanged: '#999'
        },
        borderColor: {
          up: '#26a69a',
          down: '#ef5350',
          unchanged: '#999'
        }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: safeInterval === '1d' ? 'day' : (safeInterval === '1h' || safeInterval === '4h') ? 'hour' : 'minute',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'MMM dd HH:mm',
            day: 'MMM dd'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price'
        },
        beginAtZero: false
      }
    },
    plugins: {
      title: {
        display: true,
        text: `📈 ${safeSymbol} ${safeInterval.toUpperCase()} Candlestick Chart`,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return new Date(context[0].parsed.x).toLocaleString();
          },
          label: function(context) {
            const data = context.raw;
            return [
              `Open: ${data.o}`,
              `High: ${data.h}`,
              `Low: ${data.l}`,
              `Close: ${data.c}`,
              `Change: ${((data.c - data.o) / data.o * 100).toFixed(2)}%`
            ];
          }
        }
      },
      legend: {
        display: true
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  const currentCandle = sortedData[sortedData.length - 1];
  const prevCandle = sortedData[sortedData.length - 2];
  const priceChange = prevCandle ? currentCandle.close - prevCandle.close : 0;
  const percentChange = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          📈 {safeSymbol} {safeInterval.toUpperCase()} ({sortedData.length} candles)
        </h3>
        {currentCandle && (
          <div className="flex gap-4 text-sm">
            <span className={`px-3 py-1 rounded font-bold text-lg ${
              currentCandle.close >= currentCandle.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              ${currentCandle.close}
            </span>
            <div className="text-right">
              <div className={`font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
              </div>
              <div className="text-xs text-gray-500">
                O: {currentCandle.open} | H: {currentCandle.high} | L: {currentCandle.low}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ height: "500px" }}>
        <Chart type='candlestick' data={chartData} options={options} />
      </div>
    </div>
  );
}

export default CandleChart;
