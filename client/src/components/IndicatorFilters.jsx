import { useState, useEffect } from 'react';
import axios from 'axios';

function IndicatorFilters({ symbol, interval, onIndicatorSelect }) {
  const [indicators, setIndicators] = useState({});
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(['RSI', 'MACD', 'BB']));
  const [loading, setLoading] = useState(false);

  // Available indicators list
  const availableIndicators = [
    { id: 'RSI', name: 'RSI', description: 'Relative Strength Index', category: 'oscillator' },
    { id: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', category: 'trend' },
    { id: 'BB', name: 'Bollinger Bands', description: 'Bollinger Bands', category: 'volatility' },
    { id: 'SMA20', name: 'SMA 20', description: 'Simple Moving Average 20', category: 'trend' },
    { id: 'SMA50', name: 'SMA 50', description: 'Simple Moving Average 50', category: 'trend' },
    { id: 'EMA12', name: 'EMA 12', description: 'Exponential Moving Average 12', category: 'trend' },
    { id: 'EMA26', name: 'EMA 26', description: 'Exponential Moving Average 26', category: 'trend' },
    { id: 'VWAP', name: 'VWAP', description: 'Volume Weighted Average Price', category: 'volume' },
    { id: 'SUPPORT', name: 'Support/Resistance', description: 'Key levels', category: 'levels' },
  ];

  const categories = {
    trend: { name: 'Trend', icon: '📈', color: 'blue' },
    oscillator: { name: 'Oscillators', icon: '〰️', color: 'purple' },
    volatility: { name: 'Volatility', icon: '📊', color: 'orange' },
    volume: { name: 'Volume', icon: '📦', color: 'green' },
    levels: { name: 'Levels', icon: '🎯', color: 'red' }
  };

  const fetchIndicators = async () => {
    if (!symbol || !interval) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/indicators/${symbol}?interval=${interval}`);
      setIndicators(res.data);
      onIndicatorSelect?.(res.data, selectedIndicators);
    } catch (err) {
      console.error('❌ Error fetching indicators:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIndicators();
  }, [symbol, interval]);

  const toggleIndicator = (indicatorId) => {
    const newSelected = new Set(selectedIndicators);
    if (newSelected.has(indicatorId)) {
      newSelected.delete(indicatorId);
    } else {
      newSelected.add(indicatorId);
    }
    setSelectedIndicators(newSelected);
    onIndicatorSelect?.(indicators, newSelected);
  };

  const renderIndicatorValue = (indicator) => {
    if (!indicators) return 'N/A';
    
    switch (indicator.id) {
      case 'RSI':
        const rsi = indicators.rsi?.[indicators.rsi?.length - 1];
        if (!rsi) return 'N/A';
        const rsiColor = rsi > 70 ? 'text-red-500' : rsi < 30 ? 'text-green-500' : 'text-gray-700';
        return <span className={rsiColor}>{rsi.toFixed(1)}</span>;
        
      case 'MACD':
        const macd = indicators.macd?.histogram?.[indicators.macd?.histogram?.length - 1];
        if (!macd) return 'N/A';
        const macdColor = macd > 0 ? 'text-green-500' : 'text-red-500';
        return <span className={macdColor}>{macd > 0 ? '↗' : '↘'}</span>;
        
      case 'BB':
        const currentPrice = indicators.currentPrice;
        const bbUpper = indicators.bollingerBands?.upper?.[indicators.bollingerBands?.upper?.length - 1];
        const bbLower = indicators.bollingerBands?.lower?.[indicators.bollingerBands?.lower?.length - 1];
        if (!currentPrice || !bbUpper || !bbLower) return 'N/A';
        
        let bbPosition = 'Middle';
        let bbColor = 'text-gray-700';
        if (currentPrice > bbUpper) { bbPosition = 'Upper'; bbColor = 'text-red-500'; }
        if (currentPrice < bbLower) { bbPosition = 'Lower'; bbColor = 'text-green-500'; }
        return <span className={bbColor}>{bbPosition}</span>;
        
      default:
        return <span className="text-gray-500">●</span>;
    }
  };

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-800">📊 Technical Indicators</h3>
        <div className="flex items-center gap-2">
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
          <button
            onClick={fetchIndicators}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Category Sections */}
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(categories).map(([categoryId, category]) => {
          const categoryIndicators = availableIndicators.filter(ind => ind.category === categoryId);
          if (categoryIndicators.length === 0) return null;

          return (
            <div key={categoryId} className="border-b last:border-b-0">
              {/* Category Header */}
              <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600 flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-xs text-gray-400">({categoryIndicators.length})</span>
              </div>

              {/* Indicators List */}
              <div className="divide-y">
                {categoryIndicators.map(indicator => (
                  <div
                    key={indicator.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedIndicators.has(indicator.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => toggleIndicator(indicator.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded border-2 transition-colors ${
                          selectedIndicators.has(indicator.id) 
                            ? `bg-${category.color}-500 border-${category.color}-500` 
                            : 'border-gray-300'
                        }`}>
                          {selectedIndicators.has(indicator.id) && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{indicator.name}</div>
                          <div className="text-xs text-gray-500">{indicator.description}</div>
                        </div>
                      </div>
                      
                      {/* Current Value */}
                      <div className="text-sm font-mono">
                        {renderIndicatorValue(indicator)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Count */}
      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-t">
        {selectedIndicators.size} of {availableIndicators.length} indicators selected
      </div>
    </div>
  );
}

export default IndicatorFilters;