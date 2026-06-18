import "dotenv/config";
import express from "express";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { baseSepolia } from "viem/chains";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELLER_URL = process.env.SELLER_URL || "http://localhost:4021";

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
});
const fetchWithPay = wrapFetchWithPayment(fetch, walletClient);

const app = express();
app.use(express.static(join(__dirname, "public")));

// Free: proxy the seller's catalog listing so the page never needs CORS setup.
app.get("/api/catalog", async (req, res) => {
  const sellerRes = await fetch(`${SELLER_URL}/books`);
  const catalog = await sellerRes.json();
  res.json({ catalog, buyerAddress: account.address });
});

// Paid: this is the actual x402 round trip — request, get 402, sign, pay, retry.
app.get("/api/buy/:id", async (req, res) => {
  const url = `${SELLER_URL}/books/${req.params.id}`;

  const unpaidProbe = await fetch(url);
  if (unpaidProbe.status !== 402 && unpaidProbe.status !== 200) {
    return res.status(unpaidProbe.status).json({ error: "Seller error", status: unpaidProbe.status });
  }

  const paidRes = await fetchWithPay(url);
  if (!paidRes.ok) {
    const body = await paidRes.json().catch(() => ({}));
    return res.status(paidRes.status).json({ error: body.error || "Payment or fetch failed" });
  }

  const book = await paidRes.json();
  const paymentHeader = paidRes.headers.get("x-payment-response");
  const payment = paymentHeader ? decodeXPaymentResponse(paymentHeader) : null;

  res.json({ book, payment });
});

const PORT = process.env.DEMO_PORT || 5050;
app.listen(PORT, () => {
  console.log(`Demo frontend live on http://localhost:${PORT}`);
  console.log(`Buying as agent ${account.address}, paying seller at ${SELLER_URL}`);
});
