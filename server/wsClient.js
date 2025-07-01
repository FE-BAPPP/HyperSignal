const WebSocket = require("ws");
const axios = require("axios");
const Ticker = require("./models/Ticker");
const Candle = require("./models/Candle");
const Funding = require("./models/FundingRate");
const OI = require("./models/OpenInterest");

const SYMBOLS = ["ETH", "BTC", "SOL"];

function startWebSocket() {
  const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");

  ws.on("open", () => {
    console.log("✅ WebSocket connected");
    
    // CHỈ subscribe trades và candles - bỏ tất cả funding/oi subscriptions
    SYMBOLS.forEach((coin) => {
      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: {
            type: "trades",
            coin: coin,
          },
        })
      );
      
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
            type: "candle",
            coin: coin,
            interval: "1m"
        }
      }));
    });
    
    // Fetch funding rates và OI từ REST API
    fetchFundingAndOI(); // Fetch ngay lập tức
    setInterval(fetchFundingAndOI, 60000); // Mỗi 60 giây
  });

  ws.on("message", async (message) => {
    try {
      const m = JSON.parse(message);
      
      if (m.channel === "trades" && Array.isArray(m.data)) {
        for (const trade of m.data) {
          if (trade && trade.px && trade.time && trade.coin) {
            await Ticker.create({
              symbol: trade.coin,
              price: parseFloat(trade.px),
              time: new Date(trade.time),
            });
            console.log(`[${trade.coin}] ${trade.px} at ${new Date(trade.time).toLocaleTimeString()}`);
          }
        }
      } 
      else if (m.channel === "candle" && typeof m.data === "object" && m.data !== null) {
        const c = m.data;
        
        try {
          if (!c.s) {
            console.warn("⚠️ Missing symbol in candle data");
            return;
          }
          
          let startTime;
          if (c.t) {
            startTime = new Date(typeof c.t === "number" ? c.t : parseInt(c.t));
          } else {
            console.warn("⚠️ No valid timestamp in candle data");
            return;
          }
          
          if (isNaN(startTime.getTime())) {
            console.warn("⚠️ Invalid timestamp in candle data");
            return;
          }
          
          const candleData = {
            symbol: c.s,
            interval: c.i || "1m",
            open: parseFloat(c.o || 0),
            high: parseFloat(c.h || 0),
            low: parseFloat(c.l || 0),
            close: parseFloat(c.c || 0),
            startTime: startTime,
          };
          
          if (candleData.open <= 0 || candleData.high <= 0 || 
              candleData.low <= 0 || candleData.close <= 0) {
            console.warn("⚠️ Invalid price values in candle data");
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
          
          console.log(`✅ [CANDLE ${c.s}] ${c.o} → ${c.c}`);
          
        } catch (err) {
          console.error("❌ Error saving candle:", err.message);
        }
      }
      // Bỏ tất cả handlers khác vì không cần thiết

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
    
    // Sử dụng API metaAndAssetCtxs để lấy cả funding và OI
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
          // Save Funding Rate
          try {
            const fundingData = {
              symbol: asset.name,
              fundingRate: parseFloat(ctx.funding || 0),
              nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h sau
              premium: parseFloat(ctx.premium || 0),
            };
            
            await Funding.findOneAndUpdate(
              { 
                symbol: fundingData.symbol,
                nextFundingTime: fundingData.nextFundingTime
              },
              fundingData,
              { upsert: true, new: true }
            );
            
            console.log(`💰 [${asset.name}] Funding: ${(fundingData.fundingRate * 100).toFixed(4)}%`);
          } catch (err) {
            console.error(`❌ Error saving funding for ${asset.name}:`, err.message);
          }
          
          // Save Open Interest
          try {
            const oiData = {
              symbol: asset.name,
              oi: parseFloat(ctx.openInterest || 0), // Sử dụng field 'oi' thay vì 'openInterest'
              time: new Date(),
            };
            
            console.log(`📈 Saving OI data:`, oiData);
            
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
    if (err.response) {
      console.error("❌ Response status:", err.response.status);
      console.error("❌ Response data:", err.response.data);
    }
  }
}

module.exports = startWebSocket;
