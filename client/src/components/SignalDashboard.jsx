import { useState, useEffect } from 'react';
import axios from 'axios';

function SignalDashboard() {
  const [allSignals, setAllSignals] = useState({ bullish: [], bearish: [], total: 0 });
  const [topSignals, setTopSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    symbols: 'ETH,BTC,SOL',
    intervals: '1h,4h',
    minStrength: 50
  });

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching signals with filters:', filters);
      
      const [allRes, topRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/signals/all?symbols=${filters.symbols}&intervals=${filters.intervals}`),
        axios.get(`http://localhost:4000/api/signals/top?limit=10`)
      ]);
      
      console.log('📊 All signals response:', allRes.data);
      console.log('🏆 Top signals response:', topRes.data);
      
      // Validate response structure
      const allSignalsData = {
        bullish: Array.isArray(allRes.data.bullish) ? allRes.data.bullish : [],
        bearish: Array.isArray(allRes.data.bearish) ? allRes.data.bearish : [],
        total: allRes.data.total || 0,
        timestamp: allRes.data.timestamp
      };
      
      const topSignalsData = Array.isArray(topRes.data.topSignals) ? topRes.data.topSignals : [];
      
      setAllSignals(allSignalsData);
      setTopSignals(topSignalsData);
      
      console.log(`✅ Signals loaded: ${allSignalsData.bullish.length} bullish, ${allSignalsData.bearish.length} bearish, ${topSignalsData.length} top`);
      
    } catch (err) {
      console.error('❌ Error fetching signals:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch signals');
      
      // Set empty state on error
      setAllSignals({ bullish: [], bearish: [], total: 0 });
      setTopSignals([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [filters.symbols, filters.intervals]); // Only refetch when symbols/intervals change

  const filteredBullishSignals = allSignals.bullish.filter(s => s.strength >= filters.minStrength);
  const filteredBearishSignals = allSignals.bearish.filter(s => s.strength >= filters.minStrength);

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🎯 Trading Signals</h2>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold">❌ Error:</span>
            <span className="text-red-700">{error}</span>
          </div>
          <div className="mt-2 text-sm text-red-600">
            💡 Try: Check if server is running, click Aggregate button, or refresh the page
          </div>
        </div>
      )}

      {/* Signal Filters */}
      <SignalFilters filters={filters} onChange={setFilters} />

      {/* Signal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Bullish Signals</p>
              <p className="text-2xl font-bold text-green-700">{filteredBullishSignals.length}</p>
              {allSignals.bullish.length !== filteredBullishSignals.length && (
                <p className="text-xs text-green-500">({allSignals.bullish.length} total)</p>
              )}
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Bearish Signals</p>
              <p className="text-2xl font-bold text-red-700">{filteredBearishSignals.length}</p>
              {allSignals.bearish.length !== filteredBearishSignals.length && (
                <p className="text-xs text-red-500">({allSignals.bearish.length} total)</p>
              )}
            </div>
            <div className="text-3xl">📉</div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Signals</p>
              <p className="text-2xl font-bold text-blue-700">{allSignals.total}</p>
              <p className="text-xs text-blue-500">
                Last update: {allSignals.timestamp ? new Date(allSignals.timestamp).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>
      </div>

      {/* No Signals Message */}
      {!loading && !error && allSignals.total === 0 && (
        <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="text-4xl mb-2">🤔</div>
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">No Trading Signals Found</h3>
          <div className="text-yellow-600 space-y-1">
            <p>📊 Make sure you have candle data for the selected symbols and timeframes</p>
            <p>🔄 Try clicking "Aggregate" button first to generate multi-timeframe data</p>
            <p>⏰ Wait a few minutes for the system to collect enough data points</p>
          </div>
        </div>
      )}

      {/* Top Signals */}
      {topSignals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🏆 Top Signals (Highest Strength)</h3>
          <div className="grid gap-3">
            {topSignals.slice(0, 5).map((signal, index) => (
              <SignalCard key={`top-${index}`} signal={signal} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Signal Lists */}
      {(filteredBullishSignals.length > 0 || filteredBearishSignals.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bullish Signals */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-700">
              📈 Bullish Signals ({filteredBullishSignals.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBullishSignals.length > 0 ? (
                filteredBullishSignals.map((signal, index) => (
                  <SignalCard key={`bullish-${index}`} signal={signal} />
                ))
              ) : (
                <div className="p-4 border border-green-200 rounded-lg bg-green-50 text-center">
                  <p className="text-green-600">No bullish signals above {filters.minStrength}% strength</p>
                </div>
              )}
            </div>
          </div>

          {/* Bearish Signals */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-700">
              📉 Bearish Signals ({filteredBearishSignals.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBearishSignals.length > 0 ? (
                filteredBearishSignals.map((signal, index) => (
                  <SignalCard key={`bearish-${index}`} signal={signal} />
                ))
              ) : (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-center">
                  <p className="text-red-600">No bearish signals above {filters.minStrength}% strength</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center gap-3 shadow-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="font-medium">Loading signals...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalFilters({ filters, onChange }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3">🔧 Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbols</label>
          <input
            type="text"
            value={filters.symbols}
            onChange={(e) => onChange({ ...filters, symbols: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="ETH,BTC,SOL"
          />
          <div className="text-xs text-gray-500 mt-1">Comma-separated symbol list</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Timeframes</label>
          <input
            type="text"
            value={filters.intervals}
            onChange={(e) => onChange({ ...filters, intervals: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="1h,4h"
          />
          <div className="text-xs text-gray-500 mt-1">Comma-separated timeframes</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Min Strength (%)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minStrength}
            onChange={(e) => onChange({ ...filters, minStrength: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-600">{filters.minStrength}%</div>
        </div>
      </div>
    </div>
  );
}

function SignalCard({ signal, rank }) {
  const getBorderColor = () => {
    if (signal.strength >= 80) return 'border-yellow-400 bg-yellow-50';
    if (signal.type === 'bullish') return 'border-green-200 bg-green-50';
    return 'border-red-200 bg-red-50';
  };

  const getStrengthColor = () => {
    if (signal.strength >= 80) return 'text-yellow-700';
    if (signal.type === 'bullish') return 'text-green-700';
    return 'text-red-700';
  };

  const getSignalIcon = () => {
    switch (signal.signalType) {
      case 'rsi_oversold_reversal':
      case 'rsi_overbought_reversal':
        return '📊';
      case 'macd_bullish_crossover':
      case 'macd_bearish_crossover':
        return '〰️';
      case 'bb_oversold':
      case 'bb_overbought':
        return '📏';
      case 'support_bounce':
      case 'resistance_rejection':
        return '🎯';
      case 'golden_cross':
      case 'death_cross':
        return '✂️';
      case 'extreme_funding_bullish':
      case 'extreme_funding_bearish':
        return '💰';
      default:
        return signal.type === 'bullish' ? '📈' : '📉';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getBorderColor()} relative`}>
      {rank && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {rank}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSignalIcon()}</span>
          <div>
            <h4 className="font-semibold text-gray-800">
              {signal.symbol} {signal.timeframe?.toUpperCase() || signal.interval?.toUpperCase()}
            </h4>
            <p className="text-sm text-gray-600">{signal.description}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${getStrengthColor()}`}>
            {Math.round(signal.strength)}%
          </div>
          <div className="text-xs text-gray-500">
            {new Date(signal.detectedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>
          Price: ${typeof signal.price === 'number' ? signal.price.toFixed(2) : 'N/A'}
        </span>
        <span className="bg-gray-200 px-2 py-1 rounded">
          {signal.signalType?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
      
      {/* Additional signal data */}
      {signal.rsi && (
        <div className="text-xs text-gray-500 mt-1">
          RSI: {signal.rsi.toFixed(1)}
        </div>
      )}
      {signal.fundingRate && (
        <div className="text-xs text-gray-500 mt-1">
          Funding: {(signal.fundingRate * 100).toFixed(3)}%
        </div>
      )}
    </div>
  );
}

export default SignalDashboard;