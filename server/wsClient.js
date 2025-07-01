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
      // Subscribe trades
      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: {
            type: "trades",
            coin: coin,
          },
        })
      );
      
      // Subscribe candles
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
            type: "candle",
            coin: coin,
            interval: "1m"
        }
      }));
      
      // Thử format khác cho funding
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "funding",
          coin: coin,
        }
      }));
      
      // Thử cả "fundingRate" 
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "fundingRate",
          coin: coin,
        }
      }));

      // Thử format khác cho OI
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "oi",
          coin: coin,
        }
      }));
      
      // Thử cả "openInterest"
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "openInterest", 
          coin: coin,
        }
      }));
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
      // Xử lý dữ liệu funding rate
      else if (m.channel === "funding" && typeof m.data === "object" && m.data !== null) {
        const f = m.data;
        console.log("💰 Raw funding data:", JSON.stringify(f, null, 2));
        
        try {
          // HyperLiquid có thể sử dụng 'coin' hoặc 's' cho symbol
          const symbol = f.coin || f.s || f.symbol;
          if (!symbol) {
            console.warn("⚠️ Missing symbol in funding data, available fields:", Object.keys(f));
            return;
          }
          
          // Thử các field khác nhau cho funding rate
          const fundingRate = f.fundingRate || f.funding_rate || f.rate || f.fr || 0;
          const nextFundingTime = f.nextFundingTime || f.next_funding_time || f.nextTime || f.time;
          const premium = f.premium || f.markPremium || f.mark_premium || 0;
          
          const fundingData = {
            symbol: symbol,
            fundingRate: parseFloat(fundingRate),
            nextFundingTime: nextFundingTime ? new Date(nextFundingTime) : new Date(),
            premium: parseFloat(premium),
          };
          
          console.log("💰 Saving funding:", fundingData);
          
          const savedFunding = await Funding.findOneAndUpdate(
            { 
              symbol: fundingData.symbol,
              nextFundingTime: fundingData.nextFundingTime
            },
            fundingData,
            { upsert: true, new: true }
          );
          
          console.log(`✅ [FUNDING ${symbol}] Rate: ${fundingRate}% Next: ${fundingData.nextFundingTime.toISOString()}`);
          
        } catch (err) {
          console.error("❌ Error saving funding:", err.message);
          console.error("💰 Failed funding data:", JSON.stringify(f, null, 2));
        }
      }
      
      // Xử lý open interest
      else if (m.channel === "oi" && typeof m.data === "object" && m.data !== null) {
        const o = m.data;
        console.log("📈 Raw OI data:", JSON.stringify(o, null, 2));
        
        try {
          // HyperLiquid có thể sử dụng 'coin' hoặc 's' cho symbol
          const symbol = o.coin || o.s || o.symbol;
          if (!symbol) {
            console.warn("⚠️ Missing symbol in OI data, available fields:", Object.keys(o));
            return;
          }
          
          // Thử các field khác nhau cho open interest
          const openInterest = o.oi || o.openInterest || o.open_interest || o.value || 0;
          
          const oiData = {
            symbol: symbol,
            openInterest: parseFloat(openInterest),
            time: new Date(),
          };
          
          console.log("📈 Saving OI:", oiData);
          
          const savedOI = await OI.create(oiData);
          
          console.log(`✅ [OI ${symbol}] Value: ${openInterest}`);
          
        } catch (err) {
          console.error("❌ Error saving OI:", err.message);
          console.error("📈 Failed OI data:", JSON.stringify(o, null, 2));
        }
      }
      // Log tất cả các message khác để debug
      else if (m.channel && !["trades", "candle"].includes(m.channel)) {
        console.log(`🔍 Unknown channel "${m.channel}" with data:`, JSON.stringify(m, null, 2));
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
