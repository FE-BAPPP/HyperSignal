const WebSocket = require("ws");
const Ticker = require("./models/Ticker");
const Candle = require("./models/Candle");
const Funding = require("./models/FundingRate");
const OI = require("./models/OpenInterest");

const SYMBOLS = ["ETH", "BTC", "SOL"];

function startWebSocket() {
  const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");

  ws.on("open", () => {
    console.log("✅ WebSocket connected");
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
      })
      );
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "funding",
          coin: coin,
        }
      })
      );
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "oi",
          coin: coin,
        }
      })
      );
    });
    
  });

  ws.on("message", async (message) => {
    try {
      const m = JSON.parse(message);
      
      // Log tất cả messages để debug
      if (m.channel) {
        console.log(`📨 Received ${m.channel} message`);
      }
      
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
      // Xử lý dữ liệu nến
      else if (m.channel === "candle" && typeof m.data === "object" && m.data !== null) {
        const c = m.data;
        console.log("📊 Raw candle data:", JSON.stringify(c, null, 2));
        
        try {
          // Kiểm tra các field bắt buộc - API sử dụng 's' thay vì 'coin'
          if (!c.s) {
            console.warn("⚠️ Missing symbol in candle data");
            return;
          }
          
          // Sử dụng field 't' cho timestamp
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
            symbol: c.s,  // Sử dụng 's' thay vì 'coin'
            interval: c.i || "1m",  // Sử dụng 'i' thay vì 'interval'
            open: parseFloat(c.o || 0),
            high: parseFloat(c.h || 0),
            low: parseFloat(c.l || 0),
            close: parseFloat(c.c || 0),
            startTime: startTime,
          };
          
          // Kiểm tra các giá trị price có hợp lệ không
          if (candleData.open <= 0 || candleData.high <= 0 || 
              candleData.low <= 0 || candleData.close <= 0) {
            console.warn("⚠️ Invalid price values in candle data");
            return;
          }
          
          console.log("💾 Saving candle:", candleData);
          
          // Sử dụng upsert để tránh duplicate key error
          const savedCandle = await Candle.findOneAndUpdate(
            { 
              symbol: candleData.symbol, 
              interval: candleData.interval, 
              startTime: candleData.startTime 
            },
            candleData,
            { upsert: true, new: true }
          );
          
          console.log(`✅ [CANDLE ${c.s}] Saved: ${c.o} → ${c.c} at ${startTime.toISOString()}`);
          
        } catch (err) {
          console.error("❌ Error saving candle:", err.message);
          console.error("📊 Failed candle data:", JSON.stringify(c, null, 2));
        }
      }

        else { 
            console.warn("⚠️ Unknown message format:", m);
        }
      // Xử lý dữ liệu funding rate
      if (m.channel === "funding" && m.data?.coin) {
        await Funding.create({
          symbol: m.data.coin,
          rate: parseFloat(m.data.fundingRate),
          time: new Date(m.data.time),
        });
        console.log(`[FUNDING] ${m.data.coin}: ${m.data.fundingRate}`);
      }
      // Xử lý dữ liệu open interest
      if (m.channel === "oi" && m.data?.coin) {
        await OI.create({
          symbol: m.data.coin,
          oi: parseFloat(m.data.oi),
          time: new Date(m.data.time),
        });
        console.log(`[OI] ${m.data.coin}: ${m.data.oi}`);
      }


    } catch (err) {
      console.error("❌ WebSocket parse error:", err.message);
    }
  });

  

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
  });
}

module.exports = startWebSocket;
