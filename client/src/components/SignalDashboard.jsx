import { useState, useEffect } from 'react';
import axios from 'axios';

function SignalDashboard() {
  const [allSignals, setAllSignals] = useState({ bullish: [], bearish: [], total: 0 });
  const [topSignals, setTopSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState({
    symbols: 'ETH,BTC,SOL',
    intervals: '1m,5m,15m,30m,1h', // Use available intervals
    minStrength: 30, // Lower threshold for more signals
    mode: 'all' // 'all' or 'quick'
  });

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching signals with filters:', filters);
      
      // Use quick endpoint for faster results
      const endpoint = filters.mode === 'quick' ? 'quick' : 'all';
      const params = filters.mode === 'quick' 
        ? `symbols=${filters.symbols}`
        : `symbols=${filters.symbols}&intervals=${filters.intervals}`;
      
      console.log(`📡 Calling: /api/signals/${endpoint}?${params}`);
      
      const [allRes, topRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/signals/${endpoint}?${params}`),
        axios.get(`http://localhost:4000/api/signals/top?limit=10`)
      ]);
      
      console.log('📊 All signals response:', allRes.data);
      console.log('🏆 Top signals response:', topRes.data);
      
      const allSignalsData = {
        bullish: Array.isArray(allRes.data.bullish) ? allRes.data.bullish : [],
        bearish: Array.isArray(allRes.data.bearish) ? allRes.data.bearish : [],
        total: allRes.data.total || 0,
        timestamp: allRes.data.timestamp,
        intervals: allRes.data.intervals || [],
        isQuick: allRes.data.isQuick || false
      };
      
      const topSignalsData = Array.isArray(topRes.data.topSignals) ? topRes.data.topSignals : [];
      
      setAllSignals(allSignalsData);
      setTopSignals(topSignalsData);
      setLastUpdate(new Date());
      
      console.log(`✅ Signals loaded: ${allSignalsData.bullish.length} bullish, ${allSignalsData.bearish.length} bearish`);
      
    } catch (err) {
      console.error('❌ Error fetching signals:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch signals');
      setAllSignals({ bullish: [], bearish: [], total: 0 });
      setTopSignals([]);
    }
    
    setLoading(false);
  };

  // Test individual endpoints
  const testEndpoints = async () => {
    console.log('🧪 Testing individual endpoints...');
    
    try {
      // Test individual symbol
      const ethTest = await axios.get('http://localhost:4000/api/signals/ETH?interval=5m');
      console.log('ETH 5m signals:', ethTest.data);
      
      // Test any available data
      const anyTest = await axios.get('http://localhost:4000/api/test/any-signals');
      console.log('Any signals test:', anyTest.data);
      
    } catch (err) {
      console.error('Test failed:', err);
    }
  };

  useEffect(() => {
    fetchSignals();
    
    if (autoRefresh) {
      // Faster refresh for quicker signals
      const refreshInterval = filters.mode === 'quick' ? 15000 : 30000; // 15s for quick, 30s for all
      const interval = setInterval(fetchSignals, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [filters.symbols, filters.intervals, filters.mode, autoRefresh]);

  const filteredBullishSignals = allSignals.bullish.filter(s => s.strength >= filters.minStrength);
  const filteredBearishSignals = allSignals.bearish.filter(s => s.strength >= filters.minStrength);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-blue-400">🎯 Trading Signals</h2>
          {allSignals.isQuick && (
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ⚡ Quick Mode
            </span>
          )}
          {lastUpdate && (
            <span className="text-sm text-gray-400">
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto Refresh
          </label>
          
          <button
            onClick={fetchSignals}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          
          <button
            onClick={testEndpoints}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm"
          >
            🧪 Test
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-semibold">❌ Error:</span>
            <span className="text-red-300">{error}</span>
          </div>
          <div className="mt-2 text-sm text-red-400">
            💡 Try: Check if server is running, click Aggregate button, or refresh the page
          </div>
        </div>
      )}

      {/* Fast Signal Filters */}
      <FastSignalFilters filters={filters} onChange={setFilters} />

      {/* Signal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-green-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-400">Bullish Signals</p>
              <p className="text-2xl font-bold text-green-300">{filteredBullishSignals.length}</p>
              {allSignals.bullish.length !== filteredBullishSignals.length && (
                <p className="text-xs text-green-500">({allSignals.bullish.length} total)</p>
              )}
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-red-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-400">Bearish Signals</p>
              <p className="text-2xl font-bold text-red-300">{filteredBearishSignals.length}</p>
              {allSignals.bearish.length !== filteredBearishSignals.length && (
                <p className="text-xs text-red-500">({allSignals.bearish.length} total)</p>
              )}
            </div>
            <div className="text-3xl">📉</div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-blue-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-400">Total Signals</p>
              <p className="text-2xl font-bold text-blue-300">{allSignals.total}</p>
              <p className="text-xs text-blue-500">
                Timeframes: {allSignals.intervals?.join(', ') || 'N/A'}
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-400">High Strength</p>
              <p className="text-2xl font-bold text-yellow-300">
                {[...filteredBullishSignals, ...filteredBearishSignals].filter(s => s.strength >= 70).length}
              </p>
              <p className="text-xs text-yellow-500">≥ 70% strength</p>
            </div>
            <div className="text-3xl">🔥</div>
          </div>
        </div>
      </div>

      {/* No Signals Message */}
      {!loading && !error && allSignals.total === 0 && (
        <div className="mb-6 p-6 bg-gray-800 border border-yellow-600 rounded-lg text-center">
          <div className="text-4xl mb-2">⚡</div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Trading Signals Found</h3>
          <div className="text-gray-300 space-y-1">
            <p>📊 Try switching to "Quick Mode" for faster signals</p>
            <p>🔄 Click "Aggregate" button to generate multi-timeframe data</p>
            <p>⏰ Fast timeframes (1m, 5m) update more frequently</p>
          </div>
        </div>
      )}

      {/* Top Signals */}
      {topSignals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-400">🏆 Top Signals (Highest Strength)</h3>
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
            <h3 className="text-lg font-semibold mb-3 text-green-400">
              📈 Bullish Signals ({filteredBullishSignals.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBullishSignals.length > 0 ? (
                filteredBullishSignals.slice(0, 10).map((signal, index) => (
                  <SignalCard key={`bullish-${index}`} signal={signal} />
                ))
              ) : (
                <div className="p-4 border border-green-600 rounded-lg bg-gray-800 text-center">
                  <p className="text-green-400">No bullish signals above {filters.minStrength}% strength</p>
                </div>
              )}
            </div>
          </div>

          {/* Bearish Signals */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-400">
              📉 Bearish Signals ({filteredBearishSignals.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBearishSignals.length > 0 ? (
                filteredBearishSignals.slice(0, 10).map((signal, index) => (
                  <SignalCard key={`bearish-${index}`} signal={signal} />
                ))
              ) : (
                <div className="p-4 border border-red-600 rounded-lg bg-gray-800 text-center">
                  <p className="text-red-400">No bearish signals above {filters.minStrength}% strength</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg flex items-center gap-3 shadow-lg border border-gray-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span className="font-medium text-white">
              {filters.mode === 'quick' ? 'Loading quick signals...' : 'Loading signals...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FastSignalFilters({ filters, onChange }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3 text-gray-300">⚡ Signal Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-400">Mode</label>
          <select
            value={filters.mode}
            onChange={(e) => onChange({ ...filters, mode: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full text-white"
          >
            <option value="quick">⚡ Quick (5m, 15m)</option>
            <option value="all">🎯 All timeframes</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-400">Symbols</label>
          <input
            type="text"
            value={filters.symbols}
            onChange={(e) => onChange({ ...filters, symbols: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full text-white"
            placeholder="ETH,BTC,SOL"
          />
        </div>
        
        {filters.mode === 'all' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">Timeframes</label>
            <input
              type="text"
              value={filters.intervals}
              onChange={(e) => onChange({ ...filters, intervals: e.target.value })}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full text-white"
              placeholder="1m,5m,15m,30m,1h"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-400">
            Min Strength ({filters.minStrength}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minStrength}
            onChange={(e) => onChange({ ...filters, minStrength: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

function SignalCard({ signal, rank }) {
  const getBorderColor = () => {
    if (signal.strength >= 80) return 'border-yellow-500 bg-gray-800';
    if (signal.type === 'bullish') return 'border-green-500 bg-gray-800';
    return 'border-red-500 bg-gray-800';
  };

  const getStrengthColor = () => {
    if (signal.strength >= 80) return 'text-yellow-400';
    if (signal.type === 'bullish') return 'text-green-400';
    return 'text-red-400';
  };

  const getSignalIcon = () => {
    switch (signal.signalType) {
      case 'rsi_oversold_reversal':
      case 'rsi_overbought_reversal':
      case 'rsi_oversold':
      case 'rsi_overbought':
        return '📊';
      case 'macd_bullish_crossover':
      case 'macd_bearish_crossover':
        return '〰️';
      case 'bb_oversold':
      case 'bb_overbought':
        return '📏';
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

  const getTimeframeColor = () => {
    if (signal.timeframe === '1m') return 'bg-red-600 text-white';
    if (signal.timeframe === '5m') return 'bg-green-600 text-white';
    if (signal.timeframe === '15m') return 'bg-blue-600 text-white';
    if (signal.timeframe === '30m') return 'bg-purple-600 text-white';
    if (signal.timeframe === '1h') return 'bg-yellow-600 text-white';
    return 'bg-gray-600 text-white';
  };

  return (
    <div className={`border rounded-lg p-4 ${getBorderColor()} relative transition-all hover:shadow-lg`}>
      {rank && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {rank}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSignalIcon()}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white">
                {signal.symbol}
              </h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getTimeframeColor()}`}>
                {signal.timeframe?.toUpperCase() || signal.interval?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-300">{signal.description}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${getStrengthColor()}`}>
            {Math.round(signal.strength)}%
          </div>
          <div className="text-xs text-gray-400">
            {new Date(signal.detectedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>
          Price: ${typeof signal.price === 'number' ? signal.price.toFixed(2) : 'N/A'}
        </span>
        <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">
          {signal.signalType?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
      
      {/* Additional signal data */}
      {signal.rsi && (
        <div className="text-xs text-gray-400 mt-1">
          RSI: {signal.rsi.toFixed(1)}
        </div>
      )}
      {signal.fundingRate && (
        <div className="text-xs text-gray-400 mt-1">
          Funding: {(signal.fundingRate * 100).toFixed(3)}%
        </div>
      )}
    </div>
  );
}

export default SignalDashboard;