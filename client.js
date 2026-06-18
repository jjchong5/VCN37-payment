import "dotenv/config";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
});

const fetchWithPay = wrapFetchWithPayment(fetch, walletClient);

console.log(`Agent ${account.address} requesting /weather...`);

const res = await fetchWithPay("http://localhost:4021/weather");
const data = await res.json();

console.log("Got paid response:", data);
