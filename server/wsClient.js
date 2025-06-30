const WebSocket = require("ws");
const Ticker = require("./models/Ticker");

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
    });
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
      } else {
        // Log các message khác (không phải trades)
        console.log("📥 Received (non-trades):", m);
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
