const WebSocket = require("ws");
const axios = require("axios");
const Ticker = require("./models/Ticker");
const Candle = require("./models/Candle");
const Funding = require("./models/FundingRate");
const OI = require("./models/OpenInterest");
const CandleAggregator = require("./services/CandleAggregator");

const SYMBOLS = ["ETH", "BTC", "SOL"];
const aggregator = new CandleAggregator();

// Buffer để lưu trades cho mỗi symbol
const tradesBuffer = {};
SYMBOLS.forEach(symbol => {
  tradesBuffer[symbol] = [];
});

function startWebSocket() {
  const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");

  ws.on("open", () => {
    console.log("✅ WebSocket connected");
    
    SYMBOLS.forEach((coin) => {
      console.log(`📡 Subscribing to ${coin}...`);
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "trades", coin: coin }
      }));
      
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "candle", coin: coin, interval: "1m" }
      }));
    });
    
    // Auto-aggregate mỗi 2 phút
    setInterval(() => {
      console.log('🔄 Auto-aggregation starting...');
      aggregator.runAggregation(SYMBOLS);
    }, 2 * 60 * 1000);
    
    // Chạy aggregation ngay sau 30 giây
    setTimeout(() => {
      console.log('🔄 Initial aggregation...');
      aggregator.runAggregation(SYMBOLS);
    }, 30000);

    // Log subscriptions sau 5 giây
    setTimeout(() => {
      console.log("📊 Active subscriptions for symbols:", SYMBOLS);
    }, 5000);
    
    // Chạy aggregation mỗi 5 phút
    setInterval(() => {
      aggregator.runAggregation(SYMBOLS);
    }, 5 * 60 * 1000);
    
    // Fetch funding rates và OI từ REST API
    fetchFundingAndOI();
    setInterval(fetchFundingAndOI, 60000);
  });

  ws.on("message", async (message) => {
    try {
      const m = JSON.parse(message);
      
      // Log tất cả message types
      if (m.channel) {
        console.log(`📨 Received ${m.channel} message for ${m.data?.coin || m.data?.s || 'unknown'}`);
      }
      
      if (m.channel === "trades" && Array.isArray(m.data)) {
        console.log(`💰 Processing ${m.data.length} trades`);
        
        for (const trade of m.data) {
          if (trade && trade.px && trade.time && trade.coin) {
            console.log(`📈 [${trade.coin}] Trade: ${trade.px} at ${new Date(trade.time).toLocaleTimeString()}`);
            
            // Lưu trade vào database
            await Ticker.create({
              symbol: trade.coin,
              price: parseFloat(trade.px),
              time: new Date(trade.time),
            });
          } else {
            console.warn("⚠️ Invalid trade data:", trade);
          }
        }
      } 
      else if (m.channel === "candle" && typeof m.data === "object" && m.data !== null) {
        const c = m.data;
        console.log(`🕯️ Processing candle for ${c.s}: ${c.o} → ${c.c}`);
        
        try {
          if (!c.s) {
            console.warn("⚠️ Missing symbol in candle data");
            return;
          }
          
          if (!SYMBOLS.includes(c.s)) {
            console.warn(`⚠️ Received candle for non-tracked symbol: ${c.s}`);
            return;
          }
          
          let startTime = new Date(typeof c.t === "number" ? c.t : parseInt(c.t));
          if (isNaN(startTime.getTime())) return;
          
          const candleData = {
            symbol: c.s,
            interval: c.i || "1m",
            open: parseFloat(c.o || 0),
            high: parseFloat(c.h || 0),
            low: parseFloat(c.l || 0),
            close: parseFloat(c.c || 0),
            volume: parseFloat(c.v || 0),
            startTime: startTime,
            endTime: new Date(startTime.getTime() + 60 * 1000) // 1m interval
          };
          
          if (candleData.open <= 0 || candleData.high <= 0 || 
              candleData.low <= 0 || candleData.close <= 0) {
            return;
          }
          
          await Candle.findOneAndUpdate(
            { 
              symbol: candleData.symbol, 
              interval: candleData.interval, 
              startTime: candleData.startTime 
            },
            candleData,
            { upsert: true, new: true }
          );
          
          console.log(`✅ [CANDLE ${c.s}] ${c.i} ${c.o} → ${c.c}`);
          
        } catch (err) {
          console.error("❌ Error saving candle:", err.message);
        }
      }

    } catch (err) {
      console.error("❌ WebSocket parse error:", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
  });
}

// Fetch funding rates và open interest từ REST API
async function fetchFundingAndOI() {
  try {
    console.log("💰📈 Fetching funding rates and open interest...");
    
    const response = await axios.post('https://api.hyperliquid.xyz/info', {
      type: 'metaAndAssetCtxs'
    });
    
    if (response.data && response.data.length >= 2) {
      const universe = response.data[0].universe;
      const assetCtxs = response.data[1];
      
      // Process từng symbol
      for (let i = 0; i < universe.length; i++) {
        const asset = universe[i];
        const ctx = assetCtxs[i];
        
        if (SYMBOLS.includes(asset.name) && ctx) {
          // Save Funding Rate - kiểm tra duplicate bằng thời gian
          try {
            const now = new Date();
            const roundedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.floor(now.getMinutes()/5)*5, 0, 0); // Round to 5 minutes
            
            const fundingData = {
              symbol: asset.name,
              fundingRate: parseFloat(ctx.funding || 0),
              premium: parseFloat(ctx.premium || 0),
              time: roundedTime,
            };
            
            // Sử dụng upsert để tránh duplicate
            await Funding.findOneAndUpdate(
              { 
                symbol: fundingData.symbol,
                time: fundingData.time
              },
              fundingData,
              { upsert: true, new: true }
            );
            
            console.log(`💰 [${asset.name}] Funding: ${(fundingData.fundingRate * 100).toFixed(4)}%`);
          } catch (err) {
            if (err.code === 11000) {
              console.log(`⚠️ [${asset.name}] Funding already exists for this time period`);
            } else {
              console.error(`❌ Error saving funding for ${asset.name}:`, err.message);
            }
          }
          
          // Save Open Interest
          try {
            const oiData = {
              symbol: asset.name,
              oi: parseFloat(ctx.openInterest || 0),
              time: new Date(),
            };
            
            await OI.create(oiData);
            console.log(`📈 [${asset.name}] OI: ${oiData.oi.toLocaleString()}`);
          } catch (err) {
            console.error(`❌ Error saving OI for ${asset.name}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Error fetching funding and OI:", err.message);
  }
}

module.exports = startWebSocket;
