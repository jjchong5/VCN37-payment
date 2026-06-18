import "dotenv/config";
import express from "express";
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402";

const app = express();

// Your MetaMask address — same address receives on every network below
const payTo = process.env.MAINNET_PAY_TO_ADDRESS;

app.use(
  paymentMiddleware(
    payTo,
    {
      // x402-express v1 only supports one price/network per route path,
      // so each network gets its own path to the same handler.
      "/weather": {
        price: "$0.001",
        network: "base",
        config: {
          description: "Current weather data",
        },
      },
      "/weather/polygon": {
        price: "$0.001",
        network: "polygon",
        config: {
          description: "Current weather data",
        },
      },
    },
    facilitator // Coinbase's hosted facilitator, requires CDP_API_KEY_ID/SECRET
  )
);

const weatherHandler = (req, res) => {
  res.json({
    location: "San Francisco",
    forecast: "sunny",
    temperature: 68,
    paidFor: true,
  });
};

app.get("/weather", weatherHandler);
app.get("/weather/polygon", weatherHandler);

app.listen(4022, () => {
  console.log(`MAINNET paywall live on http://localhost:4022/weather (Base)`);
  console.log(`MAINNET paywall live on http://localhost:4022/weather/polygon (Polygon)`);
  console.log(`Real USDC payments go to: ${payTo}`);
});
